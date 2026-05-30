'use client'

import type { PoseResult, CalibrationData } from '@/types/pose'
import type { GameState } from '@/types/game'
import type { Dispatch } from 'react'
import { PoseTracker } from '@/components/tracker/PoseTracker'

interface Props {
  onPoseResult: (r: PoseResult) => void
  onCalibrationComplete: (d: CalibrationData) => void
  gameState: GameState
  dispatch: Dispatch<{ type: 'CLEAR_CALIBRATION' }>
  trackingConfidence: number
  isCameraActive: boolean
}

/**
 * Broadcast-style "Player Camera" overlay floating at the bottom-left of the
 * 3D scene. Glassmorphism card styled like a sports broadcast pip window.
 *
 * Renders PoseTracker (which owns all webcam / MediaPipe state) unchanged —
 * only the surrounding visual shell is new.
 */
export function PlayerTrackingOverlay({
  onPoseResult,
  onCalibrationComplete,
  gameState,
  dispatch,
  trackingConfidence,
  isCameraActive,
}: Props) {
  const isTracking      = isCameraActive && trackingConfidence > 0.1
  const isCalibrated    = gameState.isCalibrated
  const confPct         = Math.round(trackingConfidence * 100)

  return (
    <div
      className={`
        absolute bottom-5 left-5 z-20
        w-[260px] flex flex-col gap-0
        rounded-2xl overflow-hidden
        transition-all duration-300
        ${isTracking
          ? 'ring-1 ring-emerald-500/40 shadow-[0_0_30px_rgba(16,185,129,0.15)]'
          : 'ring-1 ring-white/5 shadow-2xl'}
      `}
      style={{ backdropFilter: 'blur(20px)', background: 'rgba(2,6,23,0.82)' }}
    >
      {/* ── Title bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          {/* Live indicator */}
          <span className={`flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase
            ${isTracking ? 'text-emerald-400' : 'text-slate-600'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isTracking ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
            {isTracking ? 'LIVE' : 'OFFLINE'}
          </span>
          <span className="text-[10px] text-slate-600">·</span>
          <span className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase">
            Player Cam
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Confidence badge */}
          {isTracking && (
            <span className={`text-[10px] font-mono font-bold ${
              confPct >= 70 ? 'text-emerald-400' :
              confPct >= 40 ? 'text-amber-400' : 'text-red-400'
            }`}>
              {confPct}%
            </span>
          )}

          {/* Calibration indicator */}
          {isCalibrated && (
            <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
              <svg viewBox="0 0 12 12" fill="currentColor" className="w-2.5 h-2.5">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 0 1 0 1.414l-5 5a1 1 0 0 1-1.414 0l-2-2a1 1 0 1 1 1.414-1.414L4.586 7.586l4.293-4.293a1 1 0 0 1 1.414 0Z" />
              </svg>
              CAL
            </span>
          )}
        </div>
      </div>

      {/* ── Webcam + skeleton (PoseTracker) ────────────────────────────────── */}
      {/* Fixed height container — PoseTracker fills it */}
      <div className="h-[172px] relative">
        <PoseTracker
          onPoseResult={onPoseResult}
          onCalibrationComplete={onCalibrationComplete}
        />
      </div>

      {/* ── Footer: handedness + recalibrate ───────────────────────────────── */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-white/[0.06]">
        <div className="flex items-center gap-2">
          {isCalibrated ? (
            <>
              <HandednessIcon side={gameState.handedness} />
              <span className="text-[10px] text-slate-400 capitalize">
                {gameState.handedness}-handed
              </span>
            </>
          ) : (
            <span className="text-[10px] text-slate-600">Not calibrated</span>
          )}
        </div>

        {isCalibrated && (
          <button
            onClick={() => dispatch({ type: 'CLEAR_CALIBRATION' })}
            className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors underline"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  )
}

function HandednessIcon({ side }: { side: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={`w-3 h-3 text-emerald-400 ${side === 'left' ? 'scale-x-[-1]' : ''}`}>
      <path d="M11 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm-9 8c0 1 1 1 1 1h5.256A4.493 4.493 0 0 1 8 13a4.49 4.49 0 0 1 1.544-3.393C9.077 9.038 8.564 9 8 9c-5 0-6 3-6 4Zm9.886-3.54c.18-.613 1.048-.613 1.229 0l.043.148a.64.64 0 0 0 .921.382l.136-.074c.561-.306 1.175.308.87.869l-.075.136a.64.64 0 0 0 .382.92l.149.045c.612.18.612 1.048 0 1.229l-.15.043a.64.64 0 0 0-.38.921l.074.136c.306.561-.309 1.175-.87.87l-.136-.075a.64.64 0 0 0-.92.382l-.045.149c-.18.612-1.048.612-1.229 0l-.043-.15a.64.64 0 0 0-.921-.38l-.136.074c-.561.306-1.175-.309-.87-.87l.075-.136a.64.64 0 0 0-.382-.92l-.148-.045c-.613-.18-.613-1.048 0-1.229l.148-.043a.64.64 0 0 0 .382-.921l-.074-.136c-.306-.561.308-1.175.869-.87l.136.075a.64.64 0 0 0 .92-.382l.045-.148ZM14 12.5a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0Z" />
    </svg>
  )
}
