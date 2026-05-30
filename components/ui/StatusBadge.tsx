import type { RoomStatus } from '@/types/room'
import type { ConnectionStatus } from '@/hooks/useSocket'

type Variant = 'connected' | 'waiting' | 'disconnected' | 'error' | 'idle' | 'reconnecting'

const VARIANT_STYLES: Record<Variant, string> = {
  connected:    'bg-green-500/20 text-green-400 border-green-500/30',
  waiting:      'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  disconnected: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  error:        'bg-red-500/20 text-red-400 border-red-500/30',
  idle:         'bg-slate-500/20 text-slate-400 border-slate-500/30',
  reconnecting: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
}

const DOT_STYLES: Record<Variant, string> = {
  connected:    'bg-green-400 animate-pulse',
  waiting:      'bg-yellow-400 animate-pulse-fast',
  disconnected: 'bg-slate-500',
  error:        'bg-red-400',
  idle:         'bg-slate-500',
  reconnecting: 'bg-blue-400 animate-pulse',
}

interface Props {
  variant: Variant
  label: string
  className?: string
}

export function StatusBadge({ variant, label, className = '' }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
        border text-xs font-medium ${VARIANT_STYLES[variant]} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${DOT_STYLES[variant]}`} />
      {label}
    </span>
  )
}

// Convenience converters so callers don't have to map enums manually
export function roomStatusToVariant(status: RoomStatus): Variant {
  const map: Record<RoomStatus, Variant> = {
    waiting: 'waiting',
    connected: 'connected',
    disconnected: 'disconnected',
    error: 'error',
  }
  return map[status]
}

export function socketStatusToVariant(status: ConnectionStatus): Variant {
  const map: Record<ConnectionStatus, Variant> = {
    idle: 'idle',
    connecting: 'waiting',
    connected: 'connected',
    error: 'error',
    reconnecting: 'reconnecting',
  }
  return map[status]
}
