'use client'

import type { RoomState } from '@/types/room'
import type { ConnectionStatus } from '@/hooks/useSocket'
import type { LatencyStats } from '@/hooks/useLatency'
import type { GameState } from '@/types/game'

interface Props {
  roomState: RoomState | null
  connectionStatus: ConnectionStatus
  latency: LatencyStats
  gameState: GameState
  sidebarOpen: boolean
  onToggleSidebar: () => void
}

const PHASE_LABELS: Record<string, string> = {
  idle:        'SETUP',
  waiting:     'WAITING FOR PHONE',
  ready:       'READY',
  calibrating: 'CALIBRATING',
  tracking:    'TRACKING ACTIVE',
  batting:     'BATTING',
  paused:      'PAUSED',
  'game-over': 'GAME OVER',
}

const PHASE_COLORS: Record<string, string> = {
  tracking: 'text-emerald-400 bg-emerald-500/10 ring-emerald-500/30',
  batting:  'text-amber-400  bg-amber-500/10  ring-amber-500/30',
  'game-over': 'text-red-400 bg-red-500/10 ring-red-500/30',
}

export function GameHeader({
  roomState,
  connectionStatus,
  latency,
  gameState,
  sidebarOpen,
  onToggleSidebar,
}: Props) {
  const serverConnected    = connectionStatus === 'connected'
  const controllerOnline   = roomState?.controllerConnected ?? false
  const phaseLabel         = PHASE_LABELS[gameState.phase] ?? gameState.phase.toUpperCase()
  const phaseColor         = PHASE_COLORS[gameState.phase] ?? 'text-slate-400 bg-slate-500/10 ring-slate-500/30'
  const isLatencyHigh      = (latency.rtt ?? 0) > 100

  return (
    <header className="h-14 shrink-0 flex items-center justify-between px-4 gap-4
      border-b border-white/[0.04] bg-slate-950/90 backdrop-blur-md z-30">

      {/* ── Left: logo + sidebar toggle + phase ──────────────────────────── */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
          className="w-8 h-8 rounded-lg flex items-center justify-center
            text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all"
        >
          {sidebarOpen ? <CollapseIcon /> : <ExpandIcon />}
        </button>

        {/* Logo */}
        <div className="flex items-center gap-1.5 select-none">
          <span className="text-lg leading-none">🏏</span>
          <span className="text-xs font-black tracking-[0.2em] text-white uppercase">
            Cricket
          </span>
        </div>

        <div className="h-4 w-px bg-white/10" />

        {/* Phase pill */}
        <span className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1
          rounded-full text-[10px] font-bold tracking-widest uppercase ring-1 ${phaseColor}`}>
          <span className="w-1 h-1 rounded-full bg-current animate-pulse" />
          {phaseLabel}
        </span>
      </div>

      {/* ── Center: room code ─────────────────────────────────────────────── */}
      {roomState ? (
        <button
          onClick={() => navigator.clipboard?.writeText(roomState.roomCode)}
          title="Click to copy room code"
          className="flex items-center gap-2 px-3 py-1.5 rounded-full
            bg-white/5 hover:bg-white/8 border border-white/[0.06] transition-colors group"
        >
          <span className="text-[10px] text-slate-600 uppercase tracking-[0.15em] font-medium">
            Room
          </span>
          <span className="font-mono text-sm font-bold text-white tracking-[0.25em]">
            {roomState.roomCode}
          </span>
          <CopyIcon className="w-3 h-3 text-slate-600 group-hover:text-slate-400 transition-colors" />
        </button>
      ) : (
        <div className="text-xs text-slate-700 tracking-widest uppercase">No Room</div>
      )}

      {/* ── Right: stats cluster ──────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        {/* Latency */}
        <div className="hidden sm:flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full transition-colors ${
            latency.rtt === null ? 'bg-slate-700' :
            isLatencyHigh ? 'bg-red-400 animate-pulse' :
            'bg-emerald-400'
          }`} />
          <span className={`text-xs font-mono ${
            isLatencyHigh ? 'text-red-400' : 'text-slate-400'
          }`}>
            {latency.rtt !== null ? `${latency.rtt}ms` : '—'}
          </span>
        </div>

        <div className="h-3 w-px bg-white/10 hidden sm:block" />

        {/* Server dot */}
        <Dot
          active={serverConnected}
          label="Server"
          color={serverConnected ? 'bg-emerald-400' : 'bg-slate-600'}
        />

        {/* Controller dot */}
        <Dot
          active={controllerOnline}
          label="Phone"
          color={controllerOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-700'}
        />
      </div>
    </header>
  )
}

function Dot({ active, label, color }: { active: boolean; label: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-1.5 h-1.5 rounded-full ${color}`} />
      <span className={`text-xs ${active ? 'text-slate-400' : 'text-slate-700'}`}>{label}</span>
    </div>
  )
}

function CopyIcon({ className = '' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className={className}>
      <path d="M5.5 3.5A1.5 1.5 0 0 1 7 2h2.879a1.5 1.5 0 0 1 1.06.44l2.122 2.12a1.5 1.5 0 0 1 .439 1.061V9.5A1.5 1.5 0 0 1 12 11V9.5a3 3 0 0 0-.879-2.121L9 5.257A3 3 0 0 0 6.879 4.5H5.5v-1Z" />
      <path d="M4 5a1.5 1.5 0 0 0-1.5 1.5v6A1.5 1.5 0 0 0 4 14h5a1.5 1.5 0 0 0 1.5-1.5V8.621a1.5 1.5 0 0 0-.44-1.06L7.94 5.439A1.5 1.5 0 0 0 6.878 5H4Z" />
    </svg>
  )
}

function CollapseIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M3 5a1 1 0 0 1 1-1h12a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1Zm0 5a1 1 0 0 1 1-1h12a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1Zm0 5a1 1 0 0 1 1-1h12a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1Z" />
    </svg>
  )
}

function ExpandIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M3 5a1 1 0 0 1 1-1h12a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1Zm0 5a1 1 0 0 1 1-1h12a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1Zm0 5a1 1 0 0 1 1-1h12a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1Z" />
    </svg>
  )
}
