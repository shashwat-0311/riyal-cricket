'use client'

import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { BallDebugSnapshot } from '@/components/ball/BallSystem'
import type { DeliveryControlState } from '@/types/ball'

interface Props {
  ballDebugRef:         RefObject<BallDebugSnapshot | null>
  deliveryControlState: DeliveryControlState
  countdown:            number
}

/**
 * Physics debug overlay for ball tracking.
 * Polls ballDebugRef at 10 fps (matching BatDebugOverlay cadence).
 * Toggle with the 'B' key from GameScreen.
 */
export function BallDebugOverlay({ ballDebugRef, deliveryControlState, countdown }: Props) {
  const [snap, setSnap] = useState<BallDebugSnapshot | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSnap(ballDebugRef.current ? { ...ballDebugRef.current } : null)
    }, 100)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [ballDebugRef])

  const spd = snap
    ? Math.sqrt(snap.velocity[0] ** 2 + snap.velocity[1] ** 2 + snap.velocity[2] ** 2)
    : 0

  return (
    <div className="absolute top-4 right-4 z-30 bg-slate-950/90 border border-slate-700
      rounded-xl p-3 text-[10px] font-mono text-slate-300 space-y-1 w-52
      backdrop-blur-sm pointer-events-none select-none">

      <div className="text-[11px] font-bold text-white flex items-center gap-2 mb-1">
        <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
        Ball Debug
      </div>

      {/* Delivery state */}
      <Row label="Delivery" value={deliveryControlState}
        color={deliveryControlState === 'ACTIVE_DELIVERY' ? 'text-emerald-400'
              : deliveryControlState === 'COUNTDOWN'       ? 'text-amber-400'
              : deliveryControlState === 'DELIVERY_COMPLETE' ? 'text-pitch-400'
              : 'text-slate-400'}
      />
      {deliveryControlState === 'COUNTDOWN' && (
        <Row label="Countdown" value={`${countdown}…`} color="text-amber-300" />
      )}

      <div className="border-t border-slate-800 my-1" />

      {/* Ball physics */}
      <Row label="Speed" value={snap ? `${(spd).toFixed(1)} m/s` : '—'} />
      <Row label="Pos X"  value={snap ? snap.position[0].toFixed(2) : '—'} />
      <Row label="Pos Y"  value={snap ? snap.position[1].toFixed(2) : '—'} />
      <Row label="Pos Z"  value={snap ? snap.position[2].toFixed(2) : '—'} />
      <Row label="Bounces" value={snap ? `${snap.bounceCount}` : '—'} />
      <Row label="Dist"    value={snap ? `${snap.distanceToBatter} m` : '—'} />

      <div className="border-t border-slate-800 my-1" />

      {/* Collision */}
      <Row
        label="Collision"
        value={snap?.collisionStatus ?? 'none'}
        color={snap?.collisionStatus === 'HIT'    ? 'text-emerald-400'
              : snap?.collisionStatus === 'PASSED' ? 'text-red-400'
              : 'text-slate-500'}
      />
      {(snap?.impactForce ?? 0) > 0 && (
        <Row label="Impact" value={`${(snap!.impactForce * 100).toFixed(0)}%`}
          color="text-emerald-300" />
      )}
    </div>
  )
}

function Row({
  label,
  value,
  color = 'text-slate-300',
}: {
  label: string
  value: string
  color?: string
}) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-slate-500">{label}</span>
      <span className={color}>{value}</span>
    </div>
  )
}
