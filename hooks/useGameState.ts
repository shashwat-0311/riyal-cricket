'use client'

import { useReducer } from 'react'
import type { GameState, GamePhase, Handedness } from '@/types/game'
import type { CalibrationData } from '@/types/pose'
import { INITIAL_GAME_STATE } from '@/types/game'

type GameAction =
  | { type: 'SET_PHASE';        phase: GamePhase }
  | { type: 'SET_ROOM';         roomId: string; roomCode: string }
  | { type: 'CLEAR_ROOM' }
  | { type: 'SET_HANDEDNESS';   handedness: Handedness }
  | { type: 'SET_CALIBRATED';   calibrationData: CalibrationData }
  | { type: 'CLEAR_CALIBRATION' }
  | { type: 'INCREMENT_SCORE';  runs: number }
  | { type: 'WICKET' }
  | { type: 'RESET' }

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_PHASE':
      return { ...state, phase: action.phase }

    case 'SET_ROOM':
      return {
        ...state,
        roomId: action.roomId,
        roomCode: action.roomCode,
        phase: 'waiting',
      }

    case 'CLEAR_ROOM':
      return { ...INITIAL_GAME_STATE }

    case 'SET_HANDEDNESS':
      return { ...state, handedness: action.handedness }

    case 'SET_CALIBRATED':
      return {
        ...state,
        isCalibrated: true,
        calibrationData: action.calibrationData,
        handedness: action.calibrationData.handedness,
        phase: 'tracking',
      }

    case 'CLEAR_CALIBRATION':
      return {
        ...state,
        isCalibrated: false,
        calibrationData: null,
        phase: state.phase === 'tracking' ? 'ready' : state.phase,
      }

    case 'INCREMENT_SCORE': {
      const totalBalls = state.batting.balls + 1
      const overs      = Math.floor(totalBalls / 6)
      const balls      = totalBalls % 6
      const score      = state.batting.score + action.runs
      const crr        = totalBalls > 0
        ? parseFloat(((score / totalBalls) * 6).toFixed(2))
        : 0
      return { ...state, batting: { ...state.batting, score, overs, balls, currentRunRate: crr } }
    }

    case 'WICKET': {
      const wickets = state.batting.wickets + 1
      return {
        ...state,
        phase: wickets >= 10 ? 'game-over' : state.phase,
        batting: { ...state.batting, wickets },
      }
    }

    case 'RESET':
      return { ...INITIAL_GAME_STATE }

    default:
      return state
  }
}

export function useGameState() {
  const [state, dispatch] = useReducer(gameReducer, INITIAL_GAME_STATE)
  return { state, dispatch }
}
