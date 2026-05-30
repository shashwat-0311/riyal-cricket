'use client'

import type { GameState } from '@/types/game'

interface Props {
  gameState: GameState
  trackingConfidence: number
  isCameraActive: boolean
}

export function PlayerStatusCard({ gameState, trackingConfidence, isCameraActive }: Props) {
  const { isCalibrated, handedness } = gameState
  const confPct = Math.round(trackingConfidence * 100)

  return (
    <div className="p-3 space-y-3">
      <span className="text-[10px] text-slate-600 font-semibold uppercase tracking-widest">
        Player
      </span>

      {/* Handedness */}
      <div className="space-y-1">
        <div className="text-[10px] text-slate-600">Batting</div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold capitalize
            ${isCalibrated
              ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/20'
              : 'bg-slate-800 text-slate-600'}`}>
            {isCalibrated ? `${handedness}-handed` : 'Not set'}
          </span>
        </div>
      </div>

      {/* Calibration */}
      <div className="space-y-1">
        <div className="text-[10px] text-slate-600">Calibration</div>
        <div className={`flex items-center gap-1.5 text-[11px] font-semibold
          ${isCalibrated ? 'text-emerald-400' : 'text-slate-600'}`}>
          {isCalibrated ? (
            <>
              <svg viewBox="0 0 12 12" fill="currentColor" className="w-3 h-3">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 0 1 0 1.414l-5 5a1 1 0 0 1-1.414 0l-2-2a1 1 0 1 1 1.414-1.414L4.586 7.586l4.293-4.293a1 1 0 0 1 1.414 0Z" />
              </svg>
              Calibrated
            </>
          ) : (
            <>
              <svg viewBox="0 0 12 12" fill="currentColor" className="w-3 h-3">
                <path fillRule="evenodd" d="M6 1a5 5 0 1 0 0 10A5 5 0 0 0 6 1ZM5.75 3.75a.75.75 0 0 1 1.5 0v2.5a.75.75 0 0 1-1.5 0v-2.5Zm.75 6a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" />
              </svg>
              Not calibrated
            </>
          )}
        </div>
      </div>

      {/* Tracking confidence bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-600">Tracking</span>
          <span className={`text-[10px] font-mono font-bold ${
            !isCameraActive ? 'text-slate-700' :
            confPct >= 70 ? 'text-emerald-400' :
            confPct >= 40 ? 'text-amber-400' : 'text-red-400'
          }`}>
            {isCameraActive ? `${confPct}%` : '—'}
          </span>
        </div>
        <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              confPct >= 70 ? 'bg-emerald-500' :
              confPct >= 40 ? 'bg-amber-500' : 'bg-red-500'
            }`}
            style={{ width: isCameraActive ? `${confPct}%` : '0%' }}
          />
        </div>
      </div>
    </div>
  )
}