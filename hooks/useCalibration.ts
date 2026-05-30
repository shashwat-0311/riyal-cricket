'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { PoseTrackingService } from '@/services/poseTrackingService'
import type {
  CalibrationData,
  CalibrationPhase,
  BodyLandmarks,
  Handedness,
  PoseResult,
} from '@/types/pose'

const CAPTURE_FRAMES = 30   // ~1 second of frames to average
const COUNTDOWN_SEC  = 3

export interface UseCalibrationReturn {
  phase: CalibrationPhase
  handedness: Handedness
  countdown: number
  calibrationData: CalibrationData | null
  capturedFrames: number
  startCalibration: () => void
  selectHandedness: (h: Handedness) => void
  beginCountdown: () => void
  feedFrame: (result: PoseResult) => void
  resetCalibration: () => void
}

/**
 * State machine for the calibration flow.
 *
 * Transitions:
 *   idle → handedness → stance-prompt → countdown → capturing → complete
 *
 * `feedFrame` is called on every pose result during the `capturing` phase.
 * After CAPTURE_FRAMES frames it averages them and emits CalibrationData.
 */
export function useCalibration(): UseCalibrationReturn {
  const [phase, setPhase]                     = useState<CalibrationPhase>('idle')
  const [handedness, setHandedness]           = useState<Handedness>('right')
  const [countdown, setCountdown]             = useState(COUNTDOWN_SEC)
  const [calibrationData, setCalibrationData] = useState<CalibrationData | null>(null)
  const [capturedFrames, setCapturedFrames]   = useState(0)

  const bufferRef          = useRef<BodyLandmarks[]>([])
  const countdownTimerRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const handednessRef      = useRef<Handedness>('right')

  // Keep ref in sync so the interval closure reads the latest value
  useEffect(() => { handednessRef.current = handedness }, [handedness])

  const clearTimer = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current)
      countdownTimerRef.current = null
    }
  }

  const startCalibration = useCallback(() => {
    setPhase('handedness')
  }, [])

  const selectHandedness = useCallback((h: Handedness) => {
    setHandedness(h)
    setPhase('stance-prompt')
  }, [])

  const beginCountdown = useCallback(() => {
    clearTimer()
    setPhase('countdown')
    setCountdown(COUNTDOWN_SEC)

    let ticks = COUNTDOWN_SEC
    countdownTimerRef.current = setInterval(() => {
      ticks -= 1
      setCountdown(ticks)
      if (ticks <= 0) {
        clearTimer()
        bufferRef.current = []
        setCapturedFrames(0)
        setPhase('capturing')
      }
    }, 1_000)
  }, [])

  /**
   * Must be called on every PoseResult while in `capturing` phase.
   * Ignored in all other phases.
   */
  const feedFrame = useCallback((result: PoseResult) => {
    if (phase !== 'capturing' || !result.landmarks) return

    bufferRef.current.push(result.landmarks)
    setCapturedFrames(bufferRef.current.length)

    if (bufferRef.current.length >= CAPTURE_FRAMES) {
      const neutralLandmarks = PoseTrackingService.averageLandmarks(bufferRef.current)
      const neutralBodyCenter = PoseTrackingService.computeBodyCenter(neutralLandmarks)
      const shoulderWidthNorm = PoseTrackingService.shoulderWidth(neutralLandmarks)

      setCalibrationData({
        handedness: handednessRef.current,
        neutralLandmarks,
        neutralBodyCenter,
        shoulderWidthNorm,
        capturedAt: Date.now(),
      })
      setPhase('complete')
    }
  }, [phase])

  const resetCalibration = useCallback(() => {
    clearTimer()
    bufferRef.current = []
    setPhase('idle')
    setCountdown(COUNTDOWN_SEC)
    setCapturedFrames(0)
    setCalibrationData(null)
  }, [])

  // Cleanup timer on unmount
  useEffect(() => () => clearTimer(), [])

  return {
    phase,
    handedness,
    countdown,
    calibrationData,
    capturedFrames,
    startCalibration,
    selectHandedness,
    beginCountdown,
    feedFrame,
    resetCalibration,
  }
}
