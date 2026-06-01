'use client'

import { useState, useEffect, useRef } from 'react'
import { useRoom }       from '@/hooks/useRoom'
import { useSocket }     from '@/hooks/useSocket'
import { useLatency }    from '@/hooks/useLatency'
import { useGameState }  from '@/hooks/useGameState'
import { useBatTracking } from '@/hooks/useBatTracking'
import { CricketScene }  from '@/components/scene/CricketScene'
import type { BodyCenter, CalibrationData, PoseResult } from '@/types/pose'
import type { CameraSnapshot } from '@/components/scene/CameraDebugInfo'

import { useDelivery }           from '@/hooks/useDelivery'
import { GameHeader }            from './GameHeader'
import { RoomInfoCard }          from './RoomInfoCard'
import { ConnectionStatsCard }   from './ConnectionStatsCard'
import { PlayerTrackingOverlay } from './PlayerTrackingOverlay'
import { PlayerStatusCard }      from './PlayerStatusCard'
import { PhaseProgressCard }     from './PhaseProgressCard'
import { BatDebugOverlay }       from './BatDebugOverlay'
import { BallDebugOverlay }      from './BallDebugOverlay'
import { CameraDebugOverlay }    from './CameraDebugOverlay'

/**
 * Root game screen — Phase 3 + 4: virtual bat tracking + ball delivery.
 *
 * Data flow:
 *   Phone → Socket.IO → useRoom (latestFrame)
 *   Webcam → MediaPipe → useBatTracking → batTransformRef → VirtualBat
 *   Controller "Ready" → useDelivery → countdown → DeliveryManager
 *   DeliveryManager → BallSystem (useFrame) → CricketBall + CollisionService
 */
export function GameScreen() {
  // ── Existing hooks (unchanged) ───────────────────────────────────────────────
  const { socket, connectionStatus }                                      = useSocket()
  const { roomState, latestFrame, frameRate, isCreating, error, createRoom } = useRoom()
  const latency                                                           = useLatency(socket, roomState?.controllerConnected ?? false)
  const { state: gameState, dispatch }                                    = useGameState()

  // ── Presentation state ───────────────────────────────────────────────────────
  const [sidebarOpen,       setSidebarOpen]       = useState(true)
  const [batterPosition,    setBatterPosition]     = useState<BodyCenter | null>(null)
  const [calibrationData,   setCalibrationData]   = useState<CalibrationData | null>(null)
  const [isCameraActive,    setIsCameraActive]     = useState(false)
  const [trackingConfidence, setTrackingConfidence] = useState(0)
  const [latestPoseResult,  setLatestPoseResult]   = useState<PoseResult | null>(null)
  const [batDebugVisible,    setBatDebugVisible]    = useState(false)
  const [ballDebugVisible,   setBallDebugVisible]   = useState(false)
  const [cameraDebugVisible, setCameraDebugVisible] = useState(false)
  const cameraSnapshotRef = useRef<CameraSnapshot | null>(null)

  // ── Bat tracking (Phase 3) ───────────────────────────────────────────────────
  const {
    batTransformRef,
    swingMetricsRef,
    swingState,
    isBatCalibrated,
    startBatCalibration,
  } = useBatTracking(latestFrame, latestPoseResult, calibrationData, gameState.handedness, gameState.controllerMode)

  // ── Ball delivery (Phase 4) ──────────────────────────────────────────────────
  const delivery = useDelivery(socket, batTransformRef, swingMetricsRef)

  // D = bat debug · B = ball debug · C = camera debug
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'd' || e.key === 'D') setBatDebugVisible(v => !v)
      if (e.key === 'b' || e.key === 'B') setBallDebugVisible(v => !v)
      if (e.key === 'c' || e.key === 'C') setCameraDebugVisible(v => !v)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // ── Callbacks ────────────────────────────────────────────────────────────────
  function handlePoseResult(result: PoseResult) {
    if (!isCameraActive) setIsCameraActive(true)
    setTrackingConfidence(result.confidence)
    if (result.bodyCenter) setBatterPosition(result.bodyCenter)
    setLatestPoseResult(result)
  }

  function handleCalibrationComplete(data: CalibrationData) {
    setCalibrationData(data)
    dispatch({ type: 'SET_CALIBRATED', calibrationData: data })
  }

  const controllerConnected = roomState?.controllerConnected ?? false

  const phaseProgressSteps = [
    {
      id: 'setup',     label: 'Create Room',    sublabel: 'Generate QR code',
      done: !!roomState, active: !roomState,
    },
    {
      id: 'connect',   label: 'Connect Phone',  sublabel: 'Scan QR on phone',
      done: controllerConnected, active: !!roomState && !controllerConnected,
    },
    {
      id: 'camera',    label: 'Start Camera',   sublabel: 'Enable webcam tracking',
      done: isCameraActive, active: controllerConnected && !isCameraActive,
    },
    {
      id: 'calibrate', label: 'Calibrate',      sublabel: 'Capture neutral stance',
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

      {/* ── Middle: sidebars + 3D scene ─────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Left sidebar ────────────────────────────────────────────────────── */}
        <aside
          className={`shrink-0 border-r border-white/[0.04] bg-slate-950/80
            overflow-y-auto flex flex-col gap-0 transition-all duration-300 ease-out
            ${sidebarOpen ? 'w-[252px]' : 'w-12'}`}
        >
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

        {/* ── 3D Scene (hero) ─────────────────────────────────────────────────── */}
        <main className="flex-1 relative overflow-hidden">
          {/* Vignette overlay */}
          <div className="absolute inset-0 pointer-events-none z-10
            bg-[radial-gradient(ellipse_at_center,_transparent_60%,_rgba(2,6,23,0.7)_100%)]" />

          {/* R3F canvas */}
          <div className="absolute inset-0">
            <CricketScene
              batterPosition={batterPosition}
              calibration={calibrationData}
              batTransformRef={batTransformRef}
              swingMetricsRef={swingMetricsRef}
              swingState={swingState}
              deliveryManagerRef={delivery.deliveryManagerRef}
              deliveryStateRef={delivery.deliveryStateRef}
              deliveryIdRef={delivery.deliveryIdRef}
              onDeliveryEndRef={delivery.onDeliveryEndRef}
              ballDebugRef={delivery.ballDebugRef}
              cameraSnapshotRef={cameraSnapshotRef}
              orbitEnabled={false}
            />
          </div>

          {/* ── Delivery countdown HUD ───────────────────────────────────────── */}
          {delivery.deliveryControlState === 'COUNTDOWN' && (
            <div className="absolute inset-0 flex items-center justify-center
              pointer-events-none z-20">
              <div className="flex flex-col items-center gap-2">
                <p className="text-slate-400 text-sm uppercase tracking-widest">
                  Get ready…
                </p>
                <div
                  key={delivery.countdown}
                  className="w-24 h-24 rounded-full border-4 border-red-500
                    flex items-center justify-center text-6xl font-black text-white
                    animate-pulse shadow-[0_0_40px_rgba(239,68,68,0.6)]"
                >
                  {delivery.countdown}
                </div>
              </div>
            </div>
          )}

          {/* ── Player Tracking PIP ─────────────────────────────────────────── */}
          <PlayerTrackingOverlay
            onPoseResult={handlePoseResult}
            onCalibrationComplete={handleCalibrationComplete}
            gameState={gameState}
            dispatch={dispatch}
            trackingConfidence={trackingConfidence}
            isCameraActive={isCameraActive}
            onCalibrateBat={startBatCalibration}
            isBatCalibrated={isBatCalibrated}
          />

          {/* ── Bat debug overlay (D key) ───────────────────────────────────── */}
          <BatDebugOverlay
            batTransformRef={batTransformRef}
            swingMetricsRef={swingMetricsRef}
            swingState={swingState}
            isBatCalibrated={isBatCalibrated}
            sensorFps={frameRate}
            trackingConfidence={trackingConfidence}
            onCalibrateBat={startBatCalibration}
            visible={batDebugVisible}
          />

          {/* ── Ball debug overlay (B key) ───────────────────────────────────── */}
          {ballDebugVisible && (
            <BallDebugOverlay
              ballDebugRef={delivery.ballDebugRef}
              deliveryControlState={delivery.deliveryControlState}
              countdown={delivery.countdown}
            />
          )}

          {/* ── Camera debug overlay (C key) ─────────────────────────────────── */}
          {cameraDebugVisible && (
            <CameraDebugOverlay snapshotRef={cameraSnapshotRef} />
          )}

          {/* ── Scene legend ────────────────────────────────────────────────── */}
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

        {/* ── Right sidebar ───────────────────────────────────────────────────── */}
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
