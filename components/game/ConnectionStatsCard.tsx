'use client'

import type { RoomState } from '@/types/room'
import type { LatencyStats } from '@/hooks/useLatency'
import { LATENCY_WARN_THRESHOLD_MS } from '@/lib/constants'

interface Props {
  roomState: RoomState | null
  latency: LatencyStats
  frameRate: number
  collapsed?: boolean
}

export function ConnectionStatsCard({ roomState, latency, frameRate, collapsed = false }: Props) {
  const isHighLatency = (latency.rtt ?? 0) > LATENCY_WARN_THRESHOLD_MS
  const controlled    = roomState?.controllerConnected ?? false

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-2 py-3">
        <div className={`w-2 h-2 rounded-full ${controlled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-700'}`}
          title={controlled ? 'Controller connected' : 'No controller'} />
      </div>
    )
  }

  return (
    <div className="p-3 space-y-2">
      <span className="text-[10px] text-slate-600 font-semibold uppercase tracking-widest">
        Connection
      </span>

      <div className="space-y-1.5">
        <StatRow
          label="Controller"
          value={controlled ? 'Connected' : 'Waiting…'}
          valueClass={controlled ? 'text-emerald-400' : 'text-slate-600'}
          dot={controlled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-700'}
        />
        <StatRow
          label="Latency"
          value={latency.rtt !== null ? `${latency.rtt}ms` : '—'}
          valueClass={latency.rtt === null ? 'text-slate-700' : isHighLatency ? 'text-red-400' : 'text-emerald-400'}
        />
        {latency.jitter !== null && (
          <StatRow label="Jitter" value={`${latency.jitter}ms`} valueClass="text-slate-400" />
        )}
        <StatRow
          label="Sensor FPS"
          value={frameRate > 0 ? `${frameRate} fps` : '—'}
          valueClass={frameRate >= 25 ? 'text-emerald-400' : frameRate > 0 ? 'text-amber-400' : 'text-slate-700'}
        />
      </div>
    </div>
  )
}

function StatRow({
  label, value, valueClass, dot,
}: { label: string; value: string; valueClass: string; dot?: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        {dot && <div className={`w-1 h-1 rounded-full ${dot}`} />}
        <span className="text-[11px] text-slate-600">{label}</span>
      </div>
      <span className={`text-[11px] font-mono font-semibold ${valueClass}`}>{value}</span>
    </div>
  )
}
