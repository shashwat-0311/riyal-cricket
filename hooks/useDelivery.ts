'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { DeliveryManager } from '@/services/DeliveryManager'
import type { RefObject } from 'react'
import type { Socket } from 'socket.io-client'
import type { ClientToServerEvents, ServerToClientEvents } from '@/types/socket'
import type { DeliveryControlState } from '@/types/ball'
import type { BatTransform, SwingMetrics } from '@/types/bat'
import type { BallDebugSnapshot } from '@/components/ball/BallSystem'

const COUNTDOWN_SEC      = 3
const COMPLETE_RESET_MS  = 2_500   // auto-reset to WAITING this long after delivery ends

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>

export interface UseDeliveryReturn {
  // ── React state (cause re-renders, drive UI) ────────────────────────────
  deliveryControlState: DeliveryControlState
  countdown:            number

  // ── Refs passed straight into BallSystem (no re-render) ────────────────
  deliveryManagerRef: RefObject<DeliveryManager>
  deliveryStateRef:   RefObject<DeliveryControlState>
  deliveryIdRef:      RefObject<number>
  onDeliveryEndRef:   RefObject<((reason: 'HIT' | 'PASSED') => void) | null>
  ballDebugRef:       RefObject<BallDebugSnapshot | null>

  // ── Refs passed into BallSystem, populated from useBatTracking ─────────
  batTransformRef:    RefObject<BatTransform | null>
  swingMetricsRef:    RefObject<SwingMetrics>
}

/**
 * Manages the full delivery lifecycle:
 *   WAITING → COUNTDOWN → ACTIVE_DELIVERY → DELIVERY_COMPLETE → WAITING
 *
 * - Listens for `delivery:request` from the controller via Socket.IO.
 * - Runs the countdown timer with setInterval.
 * - Kicks off DeliveryManager when countdown reaches zero.
 * - Emits `delivery:state` back to the controller on every transition.
 * - Provides stable refs consumed by BallSystem inside the R3F Canvas.
 */
export function useDelivery(
  socket:          AppSocket,
  batTransformRef: RefObject<BatTransform | null>,
  swingMetricsRef: RefObject<SwingMetrics>,
): UseDeliveryReturn {
  // ── React state ────────────────────────────────────────────────────────────
  const [deliveryControlState, setDeliveryControlState] =
    useState<DeliveryControlState>('WAITING')
  const [countdown, setCountdown] = useState(0)

  // ── Stable service refs ────────────────────────────────────────────────────
  const deliveryManagerRef = useRef<DeliveryManager>(new DeliveryManager())
  const deliveryStateRef   = useRef<DeliveryControlState>('WAITING')
  const deliveryIdRef      = useRef<number>(0)
  const onDeliveryEndRef   = useRef<((reason: 'HIT' | 'PASSED') => void) | null>(null)
  const ballDebugRef       = useRef<BallDebugSnapshot | null>(null)
  const countdownTimerRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const resetTimerRef      = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Keep deliveryStateRef in sync with React state (read inside useFrame)
  useEffect(() => {
    deliveryStateRef.current = deliveryControlState
  }, [deliveryControlState])

  // ── Helpers ────────────────────────────────────────────────────────────────
  const clearCountdown = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current)
      countdownTimerRef.current = null
    }
  }
  const clearReset = () => {
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current)
      resetTimerRef.current = null
    }
  }

  const transition = useCallback((next: DeliveryControlState, cd = 0) => {
    deliveryStateRef.current = next
    setDeliveryControlState(next)
    setCountdown(cd)
    socket.emit('delivery:state', { state: next, ...(cd > 0 ? { countdown: cd } : {}) })
  }, [socket])

  // ── Start countdown ────────────────────────────────────────────────────────
  const startCountdown = useCallback(() => {
    clearCountdown()
    clearReset()
    transition('COUNTDOWN', COUNTDOWN_SEC)

    let ticks = COUNTDOWN_SEC
    countdownTimerRef.current = setInterval(() => {
      ticks -= 1
      if (ticks > 0) {
        setCountdown(ticks)
        socket.emit('delivery:state', { state: 'COUNTDOWN', countdown: ticks })
      } else {
        clearCountdown()

        // Launch the ball
        deliveryIdRef.current += 1
        deliveryManagerRef.current.startDelivery()
        transition('ACTIVE_DELIVERY')
      }
    }, 1_000)
  }, [socket, transition])

  // ── Delivery complete (HIT or PASSED) ─────────────────────────────────────
  // This ref is always fresh so the BallSystem closure never goes stale
  onDeliveryEndRef.current = useCallback((reason: 'HIT' | 'PASSED') => {
    clearReset()
    transition('DELIVERY_COMPLETE')

    // Auto-reset to WAITING after a short pause
    resetTimerRef.current = setTimeout(() => {
      deliveryManagerRef.current.reset()
      transition('WAITING')
    }, COMPLETE_RESET_MS)

    void reason  // available for future shot classification
  }, [transition])

  // ── Socket: controller pressed "Ready" ─────────────────────────────────────
  useEffect(() => {
    function onDeliveryRequest() {
      if (deliveryStateRef.current !== 'WAITING') return  // ignore during active play
      startCountdown()
    }

    if (!socket) return
    socket.on('delivery:request', onDeliveryRequest)
    return () => { socket.off('delivery:request', onDeliveryRequest) }
  }, [socket, startCountdown])

  // ── Cleanup on unmount ─────────────────────────────────────────────────────
  useEffect(() => () => {
    clearCountdown()
    clearReset()
  }, [])

  return {
    deliveryControlState,
    countdown,
    deliveryManagerRef,
    deliveryStateRef,
    deliveryIdRef,
    onDeliveryEndRef,
    ballDebugRef,
    batTransformRef,
    swingMetricsRef,
  }
}
