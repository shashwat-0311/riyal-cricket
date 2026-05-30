'use client'

import { useState } from 'react'
import { useRoom }      from '@/hooks/useRoom'
import { useSocket }    from '@/hooks/useSocket'
import { useLatency }   from '@/hooks/useLatency'
import { useGameState } from '@/hooks/useGameState'
import { CricketScene } from '@/components/scene/CricketScene'
import type { BodyCenter, CalibrationData, PoseResult } from '@/types/pose'

// New premium UI shells (all hook/logic reuse — presentation only)
import { GameHeader }             from './GameHeader'
import { RoomInfoCard }           from './RoomInfoCard'
import { ConnectionStatsCard }    from './ConnectionStatsCard'
import { PlayerTrackingOverlay }  from './PlayerTrackingOverlay'
import { PlayerStatusCard }       from './PlayerStatusCard'
import { PhaseProgressCard }      from './PhaseProgressCard'
import { OnboardingBar }          from './OnboardingBar'

/**
 * Root game screen — Phase 2 premium redesign.
 *
 * Layout grid:
 *   ┌─ Header (h-14) ──────────────────────────────────────────┐
 *   ├─ Left sidebar ─┬─ 3D Scene (hero) ─┬─ Right sidebar ────┤
 *   │ RoomInfoCard   │  CricketScene     │ PlayerStatusCard    │
 *   │ ConnStats      │  + Tracking PIP   │ PhaseProgressCard   │
 *   ├─ OnboardingBar (h-16) ────────────────────────────────────┤
 *
 * ALL hooks unchanged from Phase 1/2 — only layout and presentation differ.
 */
export function GameScreen() {
  // ── Existing hooks (zero changes) ───────────────────────────────────────────
  const { socket, connectionStatus }                                = useSocket()
  const { roomState, latestFrame, frameRate, isCreating, error, createRoom } = useRoom()
  const latency                                                     = useLatency(socket, roomState?.controllerConnected ?? false)
  const { state: gameState, dispatch }                              = useGameState()

  // ── Local presentation state ─────────────────────────────────────────────────
  const [sidebarOpen, setSidebarOpen]           = useState(true)
  const [batterPosition, setBatterPosition]     = useState<BodyCenter | null>(null)
  const [calibrationData, setCalibrationData]   = useState<CalibrationData | null>(null)
  const [isCameraActive, setIsCameraActive]     = useState(false)
  const [trackingConfidence, setTrackingConfidence] = useState(0)

  // ── Callbacks (same as before, just infer camera state from first result) ────
  function handlePoseResult(result: PoseResult) {
    if (!isCameraActive) setIsCameraActive(true)
    setTrackingConfidence(result.confidence)
    if (result.bodyCenter) setBatterPosition(result.bodyCenter)
  }

  function handleCalibrationComplete(data: CalibrationData) {
    setCalibrationData(data)
    dispatch({ type: 'SET_CALIBRATED', calibrationData: data })
  }

  // ── Onboarding step definitions (derived from existing state) ─────────────────
  const controllerConnected = roomState?.controllerConnected ?? false
  const onboardingSteps = [
    {
      id: 'camera',
      icon: '📷',
      label: 'Start Camera',
      sublabel: 'Enable body tracking',
      done: isCameraActive,
      active: !isCameraActive,
    },
    {
      id: 'phone',
      icon: '📱',
      label: 'Connect Phone',
      sublabel: roomState ? `Room ${roomState.roomCode}` : 'Create a room first',
      done: controllerConnected,
      active: isCameraActive && !controllerConnected,
    },
    {
      id: 'calibrate',
      icon: '🎯',
      label: 'Calibrate Pose',
      sublabel: 'Stand in batting stance',
      done: gameState.isCalibrated,
      active: isCameraActive && controllerConnected && !gameState.isCalibrated,
    },
    {
      id: 'play',
      icon: '🏏',
      label: 'Ready to Play',
      sublabel: 'All systems go',
      done: gameState.isCalibrated && controllerConnected,
      active: gameState.isCalibrated && controllerConnected,
    },
  ]

  const phaseProgressSteps = [
    {
      id: 'setup',   label: 'Create Room', sublabel: 'Generate QR code',
      done: !!roomState, active: !roomState,
    },
    {
      id: 'connect', label: 'Connect Phone', sublabel: 'Scan QR on phone',
      done: controllerConnected, active: !!roomState && !controllerConnected,
    },
    {
      id: 'camera',  label: 'Start Camera', sublabel: 'Enable webcam tracking',
      done: isCameraActive, active: controllerConnected && !isCameraActive,
    },
    {
      id: 'calibrate', label: 'Calibrate', sublabel: 'Capture neutral stance',
      done: gameState.isCalibrated, active: isCameraActive && !gameState.isCalibrated,
    },
  ]

  return (
    <div className="h-screen bg-slate-950 flex flex-col overflow-hidden select-none">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <GameHeader
        roomState={roomState}
        connectionStatus={connectionStatus}
        latency={latency}
        gameState={gameState}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(v => !v)}
      />

      {/* ── Middle: sidebars + 3D scene ────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Left sidebar ──────────────────────────────────────────────────── */}
        <aside
          className={`shrink-0 border-r border-white/[0.04] bg-slate-950/80
            overflow-y-auto flex flex-col gap-0 transition-all duration-300 ease-out
            ${sidebarOpen ? 'w-[252px]' : 'w-12'}`}
        >
          {/* Divider line */}
          <div className="border-b border-white/[0.04]">
            <RoomInfoCard
              roomState={roomState}
              socketStatus={connectionStatus}
              isCreating={isCreating}
              error={error}
              onCreateRoom={createRoom}
              collapsed={!sidebarOpen}
            />
          </div>
          <div>
            <ConnectionStatsCard
              roomState={roomState}
              latency={latency}
              frameRate={frameRate}
              collapsed={!sidebarOpen}
            />
          </div>
        </aside>

        {/* ── 3D Scene (hero) ───────────────────────────────────────────────── */}
        <main className="flex-1 relative overflow-hidden">
          {/* Subtle stadium vignette overlay */}
          <div className="absolute inset-0 pointer-events-none z-10
            bg-[radial-gradient(ellipse_at_center,_transparent_60%,_rgba(2,6,23,0.7)_100%)]" />

          {/* R3F canvas — fills the main area */}
          <div className="absolute inset-0">
            <CricketScene
              batterPosition={batterPosition}
              calibration={calibrationData}
              orbitEnabled
            />
          </div>

          {/* ── Player Tracking PIP (floating bottom-left) ──────────────────── */}
          <PlayerTrackingOverlay
            onPoseResult={handlePoseResult}
            onCalibrationComplete={handleCalibrationComplete}
            gameState={gameState}
            dispatch={dispatch}
            trackingConfidence={trackingConfidence}
            isCameraActive={isCameraActive}
          />

          {/* ── Scene legend (bottom center, above onboarding bar) ──────────── */}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20
            flex items-center gap-3 pointer-events-none">
            <LegendItem color="bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" label="Batter" />
            <LegendItem color="bg-white/80" label="Crease" />
            <LegendItem color="bg-amber-400/80" label="Stumps" />
            {!batterPosition && isCameraActive && (
              <span className="text-[10px] text-slate-600 ml-1">
                · Move into frame to see marker
              </span>
            )}
          </div>
        </main>

        {/* ── Right sidebar ─────────────────────────────────────────────────── */}
        <aside className="w-[220px] shrink-0 border-l border-white/[0.04]
          bg-slate-950/80 overflow-y-auto flex flex-col gap-0">
          <div className="border-b border-white/[0.04]">
            <PlayerStatusCard
              gameState={gameState}
              trackingConfidence={trackingConfidence}
              isCameraActive={isCameraActive}
            />
          </div>
          <PhaseProgressCard steps={phaseProgressSteps} />
        </aside>
      </div>

      {/* ── Bottom onboarding bar ──────────────────────────────────────────── */}
      <OnboardingBar steps={onboardingSteps} />
    </div>
  )
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5
      bg-slate-950/70 backdrop-blur-sm rounded-full px-2.5 py-1
      border border-white/[0.04]">
      <span className={`w-2 h-2 rounded-full ${color}`} />
      <span className="text-[10px] text-slate-500">{label}</span>
    </div>
  )
}
