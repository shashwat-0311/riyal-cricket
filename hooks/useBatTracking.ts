'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import type { MutableRefObject } from 'react'
import { BatTransformService } from '@/services/BatTransformService'
import { SwingDetectionService } from '@/services/SwingDetectionService'
import { SwingState, DEFAULT_SWING_METRICS } from '@/types/bat'
import type { BatTransform, BatCalibrationData, SwingMetrics } from '@/types/bat'
import type { SensorFrame } from '@/types/sensor'
import type { PoseResult, CalibrationData, Handedness, ControllerMode } from '@/types/pose'

export interface UseBatTrackingReturn {
  /** Mutable ref — read by VirtualBat inside useFrame (zero React re-renders) */
  batTransformRef:    MutableRefObject<BatTransform | null>
  /** Mutable ref — polled by BatDebugOverlay at its own cadence */
  swingMetricsRef:    MutableRefObject<SwingMetrics>
  /** React state — only updates on state-machine transitions (rare) */
  swingState:         SwingState
  batCalibration:     BatCalibrationData | null
  isBatCalibrated:    boolean
  /** Call during a user gesture to capture current phone orientation as neutral */
  startBatCalibration: () => void
}

/**
 * Integrates BatTransformService + SwingDetectionService for the game screen.
 *
 * Performance contract:
 *   - Sensor frame processing writes to refs (no React state → no re-renders).
 *   - swingState uses React state only on state-machine transitions.
 *   - BatDebugOverlay polls swingMetricsRef at its own rate (see BatDebugOverlay).
 */
export function useBatTracking(
  latestFrame:    SensorFrame | null,
  poseResult:     PoseResult | null,
  calibration:    CalibrationData | null,
  handedness:     Handedness,
  controllerMode: ControllerMode,
): UseBatTrackingReturn {
  // ── Stable service instances ─────────────────────────────────────────────────
  const transformSvc = useRef(new BatTransformService())
  const swingDetect  = useRef(new SwingDetectionService())

  // ── Refs (no React re-renders on update) ─────────────────────────────────────
  const batTransformRef = useRef<BatTransform | null>(null)
  const swingMetricsRef = useRef<SwingMetrics>({ ...DEFAULT_SWING_METRICS })

  // Keep a ref to the latest poseResult so the sensor-frame effect always reads
  // the freshest pose without adding poseResult to its own dependency array.
  const latestPoseRef   = useRef<PoseResult | null>(null)
  useEffect(() => { latestPoseRef.current = poseResult }, [poseResult])

  // ── React state (infrequent) ──────────────────────────────────────────────────
  const [swingState,      setSwingState]     = useState<SwingState>(SwingState.IDLE)
  const [batCalibration,  setBatCalibration] = useState<BatCalibrationData | null>(null)

  // Stable ref to avoid stale closure inside the sensor effect
  const prevSwingStateRef    = useRef<SwingState>(SwingState.IDLE)
  const batCalibrationRef    = useRef<BatCalibrationData | null>(null)
  const lastProcessedSeqRef  = useRef<number>(-1)

  // Sync controller mode → service whenever it changes
  useEffect(() => {
    transformSvc.current.setControllerMode(controllerMode)
  }, [controllerMode])

  // Sync calibration state → service whenever it changes
  useEffect(() => {
    if (!batCalibration) return
    batCalibrationRef.current = batCalibration
    transformSvc.current.setCalibration(batCalibration)
  }, [batCalibration])

  // ── Core processing loop (fires on each new sensor frame) ────────────────────
  useEffect(() => {
    if (!latestFrame) return
    // Guard against processing the same sequence number twice
    if (latestFrame.sequenceNumber === lastProcessedSeqRef.current) return
    lastProcessedSeqRef.current = latestFrame.sequenceNumber

    const pose = latestPoseRef.current

    // Swing detection
    const { state: detectedState, metrics } = swingDetect.current.update(latestFrame)
    swingMetricsRef.current = metrics

    // Bat position + rotation
    batTransformRef.current = transformSvc.current.update(
      pose?.landmarks   ?? null,
      pose?.bodyCenter  ?? null,
      latestFrame.orientation,
      calibration,
      batCalibrationRef.current,
      handedness,
      latestFrame.timestamp,
    )

    // React state only on machine transition
    if (detectedState !== prevSwingStateRef.current) {
      prevSwingStateRef.current = detectedState
      setSwingState(detectedState)
    }
  // poseResult intentionally excluded — read via latestPoseRef
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestFrame, calibration, handedness])

  // ── Bat calibration capture ───────────────────────────────────────────────────
  const startBatCalibration = useCallback(() => {
    const frame = latestFrame
    if (!frame) return
    const cal = transformSvc.current.captureBatCalibration(frame.orientation)
    setBatCalibration(cal)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestFrame])

  return {
    batTransformRef,
    swingMetricsRef,
    swingState,
    batCalibration,
    isBatCalibrated: batCalibration !== null,
    startBatCalibration,
  }
}
