'use client'

import type { UseCalibrationReturn } from '@/hooks/useCalibration'
import { HandednessSelector } from './HandednessSelector'
import { ControllerModeSelector } from './ControllerModeSelector'

interface Props {
  calibration: UseCalibrationReturn
  /** Show compact inline version when embedded next to a live view */
  compact?: boolean
}

const CAPTURE_FRAMES = 30

export function CalibrationFlow({ calibration, compact = false }: Props) {
  const {
    phase,
    handedness,
    controllerMode,
    countdown,
    calibrationData,
    capturedFrames,
    startCalibration,
    selectHandedness,
    selectControllerMode,
    beginCountdown,
    resetCalibration,
  } = calibration

  // ── Idle ──────────────────────────────────────────────────────────────────
  if (phase === 'idle') {
    return (
      <div className={`flex ${compact ? 'flex-row items-center justify-between' : 'flex-col items-center gap-4'} p-4`}>
        {!compact && (
          <div className="text-center space-y-1">
            <p className="text-sm font-semibold text-white">Calibrate Batting Stance</p>
            <p className="text-xs text-slate-500">
              Calibration captures your neutral position for accurate shot detection.
            </p>
          </div>
        )}
        <button
          onClick={startCalibration}
          className="px-5 py-2 rounded-lg bg-pitch-700 hover:bg-pitch-600 text-white
            text-sm font-semibold transition-colors whitespace-nowrap"
        >
          {compact ? 'Calibrate' : 'Start Calibration'}
        </button>
      </div>
    )
  }

  // ── Complete ───────────────────────────────────────────────────────────────
  if (phase === 'complete' && calibrationData) {
    return (
      <div className={`flex ${compact ? 'flex-row items-center justify-between gap-3' : 'flex-col items-center gap-3'} p-4`}>
        <div className="flex items-center gap-2">
          <span className="text-green-400 text-lg">✓</span>
          <div>
            <p className="text-sm font-semibold text-white">Calibrated</p>
            <p className="text-xs text-slate-500">
              {calibrationData.handedness === 'right' ? 'Right' : 'Left'}-handed ·{' '}
              Shoulder width {(calibrationData.shoulderWidthNorm * 100).toFixed(0)}px%
            </p>
          </div>
        </div>
        <button
          onClick={resetCalibration}
          className="text-xs text-slate-500 hover:text-slate-300 underline transition-colors whitespace-nowrap"
        >
          Recalibrate
        </button>
      </div>
    )
  }

  // ── All other phases — full-screen modal panel ─────────────────────────────
  return (
    <div className="absolute inset-0 z-10 bg-slate-950/95 backdrop-blur-sm flex flex-col
      items-center justify-start overflow-y-auto py-3 px-3 gap-3">

      {/* ── Handedness ─────────────────────────────────────────────────────── */}
      {phase === 'handedness' && (
        <div className="w-full space-y-2 animate-fade-in">
          <p className="text-center text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
            Step 1 of 4 · Batting Stance
          </p>
          <HandednessSelector selected={handedness} onSelect={selectHandedness} />
          <button
            onClick={() => selectHandedness(handedness)}
            className="w-full py-2 rounded-xl bg-pitch-600 hover:bg-pitch-500 text-white
              font-bold text-xs transition-colors"
          >
            Continue →
          </button>
        </div>
      )}

      {/* ── Controller mode ────────────────────────────────────────────────── */}
      {phase === 'controller-mode' && (
        <div className="w-full space-y-2 animate-fade-in">
          <p className="text-center text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
            Step 2 of 4 · Controller
          </p>
          <ControllerModeSelector selected={controllerMode} onSelect={selectControllerMode} />
          <button
            onClick={() => selectControllerMode(controllerMode)}
            className="w-full py-2 rounded-xl bg-pitch-600 hover:bg-pitch-500 text-white
              font-bold text-xs transition-colors"
          >
            Continue →
          </button>
        </div>
      )}

      {/* ── Stance prompt ──────────────────────────────────────────────────── */}
      {phase === 'stance-prompt' && (
        <div className="w-full space-y-2 animate-fade-in">
          <p className="text-center text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
            Step 3 of 4 · Take Your Stance
          </p>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-3 text-left space-y-2">
            <Instruction num={1} text="Stand fully in frame (head to toe)" />
            {controllerMode === 'stick'
              ? <Instruction num={2} text="Hold the stick like a bat in batting guard" />
              : <Instruction num={2} text="Hold your normal batting guard position" />
            }
            <Instruction num={3} text="Stay still for 1 second while capturing" />
          </div>
          <div className="flex gap-2">
            <button
              onClick={resetCalibration}
              className="flex-1 py-2 rounded-xl border border-slate-700 text-slate-400
                hover:border-slate-600 hover:text-slate-300 text-xs font-semibold transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={beginCountdown}
              className="flex-1 py-2 rounded-xl bg-pitch-600 hover:bg-pitch-500 text-white
                font-bold text-xs transition-colors"
            >
              Ready →
            </button>
          </div>
        </div>
      )}

      {/* ── Countdown ──────────────────────────────────────────────────────── */}
      {phase === 'countdown' && (
        <div className="flex flex-col items-center gap-3 animate-fade-in w-full">
          <p className="text-slate-400 text-[10px] uppercase tracking-widest">
            Hold your stance…
          </p>
          <div
            key={countdown}
            className="w-16 h-16 rounded-full border-4 border-pitch-500 flex items-center
              justify-center text-4xl font-black text-white animate-pulse-fast"
          >
            {countdown}
          </div>
        </div>
      )}

      {/* ── Capturing ──────────────────────────────────────────────────────── */}
      {phase === 'capturing' && (
        <div className="flex flex-col items-center gap-3 animate-fade-in w-full">
          <p className="text-white text-xs font-semibold">Capturing…</p>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-pitch-500 rounded-full transition-all duration-100"
              style={{ width: `${(capturedFrames / CAPTURE_FRAMES) * 100}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-500 font-mono">
            {capturedFrames} / {CAPTURE_FRAMES} frames
          </p>
        </div>
      )}
    </div>
  )
}

function Instruction({ num, text }: { num: number; text: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="w-4 h-4 rounded-full bg-pitch-800 text-pitch-400 text-[10px] font-bold
        flex items-center justify-center shrink-0 mt-0.5">
        {num}
      </span>
      <span className="text-[11px] text-slate-300 leading-tight">{text}</span>
    </div>
  )
}
