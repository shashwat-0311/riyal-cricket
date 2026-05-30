'use client'

import type { SensorFrame } from '@/types/sensor'
import { SENSOR_STALE_THRESHOLD_MS } from '@/lib/constants'

interface Props {
  frame: SensorFrame | null
}

function fmt(v: number | null, decimals = 2): string {
  return v === null ? '—' : v.toFixed(decimals)
}

export function SensorDisplay({ frame }: Props) {
  const isStale =
    frame !== null && Date.now() - frame.timestamp > SENSOR_STALE_THRESHOLD_MS

  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest">
          Sensor Data
        </h2>
        {frame && (
          <span
            className={`text-xs font-mono ${isStale ? 'text-red-400' : 'text-slate-500'}`}
          >
            seq #{frame.sequenceNumber}
            {isStale ? ' (stale)' : ''}
          </span>
        )}
      </div>

      {!frame ? (
        <p className="text-sm text-slate-600 italic">
          Waiting for controller sensor data…
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {/* Orientation */}
          <div className="space-y-2">
            <p className="text-xs text-slate-500 uppercase tracking-widest">Orientation</p>
            <SensorRow label="α (alpha)" value={fmt(frame.orientation.alpha, 1)} unit="°" />
            <SensorRow label="β (beta)" value={fmt(frame.orientation.beta, 1)} unit="°" />
            <SensorRow label="γ (gamma)" value={fmt(frame.orientation.gamma, 1)} unit="°" />
          </div>

          {/* Acceleration */}
          <div className="space-y-2">
            <p className="text-xs text-slate-500 uppercase tracking-widest">Acceleration</p>
            <SensorRow label="X" value={fmt(frame.motion.acceleration.x)} unit="m/s²" />
            <SensorRow label="Y" value={fmt(frame.motion.acceleration.y)} unit="m/s²" />
            <SensorRow label="Z" value={fmt(frame.motion.acceleration.z)} unit="m/s²" />
          </div>

          {/* Accel + gravity */}
          <div className="space-y-2">
            <p className="text-xs text-slate-500 uppercase tracking-widest">Accel + Gravity</p>
            <SensorRow label="X" value={fmt(frame.motion.accelerationIncludingGravity.x)} unit="m/s²" />
            <SensorRow label="Y" value={fmt(frame.motion.accelerationIncludingGravity.y)} unit="m/s²" />
            <SensorRow label="Z" value={fmt(frame.motion.accelerationIncludingGravity.z)} unit="m/s²" />
          </div>

          {/* Rotation rate */}
          <div className="space-y-2">
            <p className="text-xs text-slate-500 uppercase tracking-widest">Rotation Rate</p>
            <SensorRow label="α" value={fmt(frame.motion.rotationRate.x, 1)} unit="°/s" />
            <SensorRow label="β" value={fmt(frame.motion.rotationRate.y, 1)} unit="°/s" />
            <SensorRow label="γ" value={fmt(frame.motion.rotationRate.z, 1)} unit="°/s" />
          </div>
        </div>
      )}

      {frame && (
        <p className="text-xs text-slate-600 font-mono">
          ts: {new Date(frame.timestamp).toISOString().slice(11, 23)}
        </p>
      )}
    </div>
  )
}

function SensorRow({
  label,
  value,
  unit,
}: {
  label: string
  value: string
  unit: string
}) {
  const hasValue = value !== '—'
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-slate-500 w-10 shrink-0">{label}</span>
      <span className={`text-xs font-mono font-medium ${hasValue ? 'text-slate-200' : 'text-slate-600'}`}>
        {value}
      </span>
      <span className="text-xs text-slate-600 w-8 text-right">{unit}</span>
    </div>
  )
}
