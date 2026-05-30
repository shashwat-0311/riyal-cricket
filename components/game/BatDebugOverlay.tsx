'use client'

import { useEffect, useState, type MutableRefObject } from 'react'
import { SwingState } from '@/types/bat'
import type { BatTransform, SwingMetrics } from '@/types/bat'
import { DEFAULT_SWING_METRICS } from '@/types/bat'

interface Props {
  batTransformRef:    MutableRefObject<BatTransform | null>
  swingMetricsRef:    MutableRefObject<SwingMetrics>
  swingState:         SwingState
  isBatCalibrated:    boolean
  sensorFps:          number
  trackingConfidence: number
  onCalibrateBat:     () => void
  visible:            boolean
}

interface Snapshot {
  transform:  BatTransform | null
  metrics:    SwingMetrics
}

const STATE_COLOR: Record<SwingState, string> = {
  [SwingState.IDLE]:           'text-slate-400',
  [SwingState.BACKLIFT]:       'text-yellow-400',
  [SwingState.SWING]:          'text-emerald-400',
  [SwingState.FOLLOW_THROUGH]: 'text-sky-400',
}

const STATE_DOT: Record<SwingState, string> = {
  [SwingState.IDLE]:           'bg-slate-600',
  [SwingState.BACKLIFT]:       'bg-yellow-400',
  [SwingState.SWING]:          'bg-emerald-400 animate-pulse',
  [SwingState.FOLLOW_THROUGH]: 'bg-sky-400',
}

/**
 * Developer overlay showing real-time bat tracking data.
 * Polls refs at 10 fps — avoids propagating 30 fps state updates upward.
 * Toggle visibility with the 'D' key (wired in GameScreen).
 */
export function BatDebugOverlay({
  batTransformRef,
  swingMetricsRef,
  swingState,
  isBatCalibrated,
  sensorFps,
  trackingConfidence,
  onCalibrateBat,
  visible,
}: Props) {
  const [snap, setSnap] = useState<Snapshot>({
    transform: null,
    metrics:   { ...DEFAULT_SWING_METRICS },
  })

  useEffect(() => {
    if (!visible) return
    const id = setInterval(() => {
      setSnap({
        transform: batTransformRef.current,
        metrics:   swingMetricsRef.current,
      })
    }, 100)
    return () => clearInterval(id)
  }, [visible, batTransformRef, swingMetricsRef])

  if (!visible) return null

  const p  = snap.transform?.position
  const q  = snap.transform?.quaternion
  const v  = snap.transform?.velocity
  const av = snap.metrics.angularVelocity

  return (
    <div
      className="absolute top-3 right-3 z-30 w-[230px]
        rounded-xl border border-white/[0.08] overflow-hidden
        bg-slate-950/92 backdrop-blur-md shadow-2xl text-[11px] font-mono"
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 py-2
        border-b border-white/[0.06] text-[10px] font-bold tracking-widest uppercase">
        <span className="text-slate-500">Bat Debug</span>
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${STATE_DOT[swingState]}`} />
          <span className={`${STATE_COLOR[swingState]}`}>{swingState}</span>
        </div>
      </div>

      <div className="px-3 py-2 space-y-1.5">
        {/* ── Transform ─────────────────────────────────────────────────────── */}
        <Row label="Position">
          {p ? `${fmt(p[0])} ${fmt(p[1])} ${fmt(p[2])}` : '—'}
        </Row>
        <Row label="Quaternion">
          {q ? `${fmt(q[0])} ${fmt(q[1])} ${fmt(q[2])} ${fmt(q[3])}` : '—'}
        </Row>
        <Row label="Velocity">
          {v ? `${fmt(v[0])} ${fmt(v[1])} ${fmt(v[2])}` : '—'}
        </Row>

        {/* ── Swing ─────────────────────────────────────────────────────────── */}
        <div className="border-t border-white/[0.04] pt-1.5 space-y-1">
          <Row label="Swing spd">{snap.metrics.swingSpeed.toFixed(0)} °/s</Row>
          <Row label="Peak vel.">{snap.metrics.peakVelocity.toFixed(0)} °/s</Row>
          <Row label="Direction"><span className="capitalize">{snap.metrics.swingDirection}</span></Row>
          <Row label="Ang. vel.">
            {`${fmt(av[0])} ${fmt(av[1])} ${fmt(av[2])}`}
          </Row>
        </div>

        {/* ── System ────────────────────────────────────────────────────────── */}
        <div className="border-t border-white/[0.04] pt-1.5 space-y-1">
          <Row label="Sensor FPS">{sensorFps}</Row>
          <Row label="Confidence">{(trackingConfidence * 100).toFixed(0)}%</Row>
          <Row label="Bat cal.">
            <span className={isBatCalibrated ? 'text-emerald-400' : 'text-slate-500'}>
              {isBatCalibrated ? '✓ calibrated' : 'not set'}
            </span>
          </Row>
        </div>

        {/* ── Calibration button ────────────────────────────────────────────── */}
        <div className="border-t border-white/[0.04] pt-2 pb-0.5">
          <button
            onClick={onCalibrateBat}
            className="w-full text-[10px] py-1.5 rounded-lg
              bg-white/[0.04] hover:bg-white/[0.08] transition-colors
              text-slate-400 hover:text-white border border-white/[0.06]"
          >
            {isBatCalibrated ? 'Recalibrate bat grip' : 'Calibrate bat grip'}
          </button>
          <p className="text-[9px] text-slate-700 text-center mt-1">
            Press D to hide • hold phone in grip first
          </p>
        </div>
      </div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-slate-600 shrink-0">{label}</span>
      <span className="text-slate-300 text-right tabular-nums truncate">{children}</span>
    </div>
  )
}

function fmt(n: number): string {
  return (n >= 0 ? ' ' : '') + n.toFixed(2)
}
