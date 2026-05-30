import type { Handedness, CalibrationData } from './pose'

export type { Handedness }

/**
 * Phase-1  → idle / waiting / ready
 * Phase-2  → calibrating / tracking (webcam + body tracking live)
 * Phase-3+ → batting / fielding / paused / game-over
 */
export type GamePhase =
  | 'idle'
  | 'waiting'       // Room created, controller not yet connected
  | 'ready'         // Controller connected, sensor data flowing
  | 'calibrating'   // Calibration flow in progress
  | 'tracking'      // Webcam + pose tracking active, game ready to begin
  | 'batting'       // Active shot in progress (Phase 3)
  | 'paused'
  | 'game-over'

export interface BattingStats {
  score: number
  wickets: number
  overs: number
  balls: number
  currentRunRate: number
}

export interface GameState {
  phase: GamePhase
  roomId: string | null
  roomCode: string | null
  handedness: Handedness
  isCalibrated: boolean
  calibrationData: CalibrationData | null
  batting: BattingStats
}

export const INITIAL_GAME_STATE: GameState = {
  phase: 'idle',
  roomId: null,
  roomCode: null,
  handedness: 'right',
  isCalibrated: false,
  calibrationData: null,
  batting: {
    score: 0,
    wickets: 0,
    overs: 0,
    balls: 0,
    currentRunRate: 0,
  },
}
