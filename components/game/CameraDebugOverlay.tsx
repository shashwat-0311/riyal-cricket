'use client'

import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { CameraSnapshot } from '@/components/scene/CameraDebugInfo'

interface Props {
  snapshotRef: RefObject<CameraSnapshot | null>
}

/**
 * Camera debug panel — toggle with the 'C' key.
 * Polls the CameraSnapshot ref at 5 fps (fast enough for tuning, cheap enough to ignore).
 */
export function CameraDebugOverlay({ snapshotRef }: Props) {
  const [snap, setSnap] = useState<CameraSnapshot | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    timerRef.current = setInterval(() => {
      if (snapshotRef.current) setSnap({ ...snapshotRef.current })
    }, 200)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [snapshotRef])

  const f = (n: number) => n.toFixed(2)

  // Compute approximate "elevation angle" (degrees below horizontal)
  const elevDeg = snap ? Math.round(Math.atan2(-snap.dy, Math.sqrt(snap.dx ** 2 + snap.dz ** 2)) * (180 / Math.PI) * -1) : 0

  return (
    <div className="absolute top-16 right-4 z-30 bg-slate-950/90 border border-amber-500/40
      rounded-xl p-3 text-[10px] font-mono text-slate-300 w-52 space-y-1
      backdrop-blur-sm pointer-events-none select-none">

      <div className="text-[11px] font-bold text-amber-400 flex items-center gap-2 mb-1">
        <span className="w-2 h-2 rounded bg-amber-500 inline-block" />
        Camera Debug  <span className="text-slate-600 font-normal">[C]</span>
      </div>

      <Row label="Pos X" value={snap ? f(snap.px) : '—'} />
      <Row label="Pos Y" value={snap ? f(snap.py) : '—'} />
      <Row label="Pos Z" value={snap ? f(snap.pz) : '—'} />

      <div className="border-t border-slate-800 my-1" />

      <Row label="Target X" value={snap ? f(snap.tx) : '—'} />
      <Row label="Target Y" value={snap ? f(snap.ty) : '—'} />
      <Row label="Target Z" value={snap ? f(snap.tz) : '—'} />

      <div className="border-t border-slate-800 my-1" />

      <Row label="FOV"        value={snap ? `${snap.fov}°` : '—'} color="text-amber-300" />
      <Row label="Elevation"  value={`${elevDeg}° below`}          color="text-amber-300" />
    </div>
  )
}

function Row({ label, value, color = 'text-slate-300' }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-slate-500">{label}</span>
      <span className={color}>{value}</span>
    </div>
  )
}
