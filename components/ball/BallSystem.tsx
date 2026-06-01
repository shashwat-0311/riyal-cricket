'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CricketBall } from './CricketBall'
import { CollisionService } from '@/services/CollisionService'
import type { RefObject } from 'react'
import type { DeliveryControlState } from '@/types/ball'
import type { DeliveryManager } from '@/services/DeliveryManager'
import type { BatTransform, SwingMetrics } from '@/types/bat'

export interface BallDebugSnapshot {
  position:         [number, number, number]
  velocity:         [number, number, number]
  bounceCount:      number
  distanceToBatter: number
  collisionStatus:  'none' | 'HIT' | 'PASSED'
  impactForce:      number
}

interface Props {
  deliveryManagerRef: RefObject<DeliveryManager>
  deliveryStateRef:   RefObject<DeliveryControlState>
  /** Incremented by useDelivery each time a new delivery begins — resets the HIT guard */
  deliveryIdRef:      RefObject<number>
  batTransformRef:    RefObject<BatTransform | null>
  swingMetricsRef:    RefObject<SwingMetrics>
  /** Always-fresh callback ref — avoids stale closures without prop re-renders */
  onDeliveryEndRef:   RefObject<((reason: 'HIT' | 'PASSED') => void) | null>
  ballDebugRef:       RefObject<BallDebugSnapshot | null>
}

const collisionSvc = new CollisionService()

/**
 * Lives inside the R3F Canvas so it can call useFrame.
 *
 * Each frame during ACTIVE_DELIVERY:
 *  1. Ticks DeliveryManager physics.
 *  2. Updates ballPositionRef so CricketBall repositions itself in its own useFrame.
 *  3. Runs sphere-capsule bat-ball collision.
 *  4. On HIT: applies impulse, fires onDeliveryEnd('HIT').
 *  5. On PASSED: fires onDeliveryEnd('PASSED').
 *  6. Writes a debug snapshot consumed by BallDebugOverlay outside the Canvas.
 */
export function BallSystem({
  deliveryManagerRef,
  deliveryStateRef,
  deliveryIdRef,
  batTransformRef,
  swingMetricsRef,
  onDeliveryEndRef,
  ballDebugRef,
}: Props) {
  const ballPositionRef  = useRef<[number, number, number] | null>(null)
  const endFiredRef      = useRef(false)
  const lastDeliveryId   = useRef(-1)

  useFrame((_, rawDt) => {
    const dm = deliveryManagerRef.current
    const st = deliveryStateRef.current
    if (!dm) return

    // Detect a new delivery starting — reset HIT guard and ball position
    const currentId = deliveryIdRef.current ?? 0
    if (currentId !== lastDeliveryId.current) {
      lastDeliveryId.current  = currentId
      endFiredRef.current     = false
      ballPositionRef.current = null
    }

    if (st !== 'ACTIVE_DELIVERY') return

    const dt = Math.min(rawDt, 0.05)  // cap dt to avoid physics jumps on tab resume
    const { ballState, phase } = dm.tick(dt)
    ballPositionRef.current = ballState.position

    // ── Bat-ball collision ───────────────────────────────────────────────────
    const bat = batTransformRef.current
    let collisionStatus: BallDebugSnapshot['collisionStatus'] = 'none'
    let impactForce = 0

    if (bat && !endFiredRef.current && phase === 'ACTIVE') {
      const result = collisionSvc.check(ballState.position, bat)

      if (result.collisionDetected) {
        collisionStatus = 'HIT'
        impactForce     = result.impactForce ?? 0

        const newVel = collisionSvc.computeHitVelocity(
          ballState.velocity,
          bat,
          swingMetricsRef.current,
        )
        dm.applyHit(newVel)
        endFiredRef.current = true
        onDeliveryEndRef.current?.('HIT')
      }
    }

    // ── Ball passed the batter ───────────────────────────────────────────────
    if (phase === 'PASSED' && !endFiredRef.current) {
      endFiredRef.current = true
      collisionStatus     = 'PASSED'
      onDeliveryEndRef.current?.('PASSED')
    }

    // ── Debug snapshot (read by BallDebugOverlay at 10 fps) ─────────────────
    const [bx, , bz] = ballState.position
    const dist = Math.sqrt(bx * bx + (bz - 8.78) ** 2)
    ballDebugRef.current = {
      position:         ballState.position,
      velocity:         ballState.velocity,
      bounceCount:      ballState.bounceCount,
      distanceToBatter: Math.round(dist * 100) / 100,
      collisionStatus,
      impactForce,
    }
  })

  return <CricketBall positionRef={ballPositionRef} />
}
