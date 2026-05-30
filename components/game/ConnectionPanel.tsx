'use client'

import type { RoomState } from '@/types/room'
import type { LatencyStats } from '@/hooks/useLatency'
import { StatusBadge, roomStatusToVariant } from '@/components/ui/StatusBadge'
import { LATENCY_WARN_THRESHOLD_MS } from '@/lib/constants'

interface Props {
  roomState: RoomState | null
  latency: LatencyStats
  frameRate: number
}

export function ConnectionPanel({ roomState, latency, frameRate }: Props) {
  const isHighLatency =
    latency.rtt !== null && latency.rtt > LATENCY_WARN_THRESHOLD_MS

  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-5 space-y-4">
      <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest">
        Connection
      </h2>

      {/* Room status */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-400">Room Status</span>
        {roomState ? (
          <StatusBadge
            variant={roomStatusToVariant(roomState.status)}
            label={roomState.status.charAt(0).toUpperCase() + roomState.status.slice(1)}
          />
        ) : (
          <StatusBadge variant="idle" label="No Room" />
        )}
      </div>

      {/* Controller */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-400">Controller</span>
        <StatusBadge
          variant={roomState?.controllerConnected ? 'connected' : 'waiting'}
          label={roomState?.controllerConnected ? 'Connected' : 'Waiting…'}
        />
      </div>

      {/* Latency */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-400">Latency (RTT)</span>
        <span
          className={`text-sm font-mono font-semibold ${
            latency.rtt === null
              ? 'text-slate-600'
              : isHighLatency
              ? 'text-red-400'
              : 'text-green-400'
          }`}
        >
          {latency.rtt === null ? '—' : `${latency.rtt} ms`}
        </span>
      </div>

      {/* Avg latency */}
      {latency.avgRtt !== null && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-400">Avg Latency</span>
          <span className="text-sm font-mono text-slate-300">{latency.avgRtt} ms</span>
        </div>
      )}

      {/* Jitter */}
      {latency.jitter !== null && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-400">Jitter</span>
          <span className="text-sm font-mono text-slate-300">{latency.jitter} ms</span>
        </div>
      )}

      {/* Sensor frame rate */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-400">Sensor FPS</span>
        <span
          className={`text-sm font-mono font-semibold ${
            frameRate >= 25
              ? 'text-green-400'
              : frameRate > 0
              ? 'text-yellow-400'
              : 'text-slate-600'
          }`}
        >
          {frameRate > 0 ? `${frameRate} fps` : '—'}
        </span>
      </div>

      {isHighLatency && (
        <p className="text-xs text-red-400/80 bg-red-400/10 rounded-lg px-3 py-2 border border-red-400/20">
          High latency detected. Ensure both devices are on the same Wi-Fi network.
        </p>
      )}
    </div>
  )
}
