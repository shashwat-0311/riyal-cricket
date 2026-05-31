'use client'

import { useEffect } from 'react'
import { useWebcam } from '@/hooks/useWebcam'
import { usePoseTracking } from '@/hooks/usePoseTracking'
import { useCalibration } from '@/hooks/useCalibration'
import type { PoseResult } from '@/types/pose'
import type { CalibrationData } from '@/types/pose'
import { WebcamFeed } from './WebcamFeed'
import { CalibrationFlow } from './CalibrationFlow'
import { StatusBadge } from '@/components/ui/StatusBadge'

interface Props {
  onPoseResult?: (result: PoseResult) => void
  onCalibrationComplete?: (data: CalibrationData) => void
}

/**
 * Root tracking component for the laptop game screen.
 *
 * Responsibilities:
 *  1. Manage webcam lifecycle (start / stop).
 *  2. Initialize MediaPipe once the webcam is active.
 *  3. Drive the tracking loop; forward results via callbacks.
 *  4. Feed pose frames into the calibration state machine.
 *  5. Render webcam + skeleton overlay + calibration UI.
 */
export function PoseTracker({ onPoseResult, onCalibrationComplete }: Props) {
  const webcam      = useWebcam()
  const tracker     = usePoseTracking()
  const calibration = useCalibration()

  // ── Start tracking as soon as both webcam and model are ready ───────────────
  useEffect(() => {
    if (webcam.status === 'active' && tracker.status === 'ready' && webcam.videoRef.current) {
      tracker.startTracking(webcam.videoRef.current)
    }
  }, [webcam.status, tracker.status, webcam.videoRef, tracker])

  // ── Forward pose results to parent + calibration ────────────────────────────
  useEffect(() => {
    if (!tracker.latestResult) return
    onPoseResult?.(tracker.latestResult)
    calibration.feedFrame(tracker.latestResult)
  }, [tracker.latestResult]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Notify calibration completion ───────────────────────────────────────────
  useEffect(() => {
    if (calibration.phase === 'complete' && calibration.calibrationData) {
      onCalibrationComplete?.(calibration.calibrationData)
    }
  }, [calibration.phase]) // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Ask for camera permission first (instant dialog), then download the
   * MediaPipe model in the background. The tracking useEffect fires once
   * both webcam + model are ready, so order does not matter for correctness.
   */
  async function handleStartCamera() {
    await webcam.startWebcam()          // permission dialog appears immediately
    if (tracker.status === 'idle') {
      tracker.initialize()              // intentionally not awaited — background download
    }
  }

  const isTracking = tracker.status === 'tracking'
  const result     = tracker.latestResult

  return (
    <div className="flex flex-col gap-3">
      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <TrackerStatusBadge
            webcamStatus={webcam.status}
            trackerStatus={tracker.status}
          />
          {isTracking && result && (
            <span className="text-xs font-mono text-slate-500">
              conf: {Math.round(result.confidence * 100)}%
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {webcam.status === 'active' && (
            <button
              onClick={webcam.stopWebcam}
              className="text-xs text-slate-500 hover:text-red-400 transition-colors"
            >
              Stop Camera
            </button>
          )}
          {calibration.phase !== 'idle' && calibration.phase !== 'complete' && (
            <button
              onClick={calibration.resetCalibration}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              Cancel calibration
            </button>
          )}
        </div>
      </div>

      {/* ── Main area ───────────────────────────────────────────────────────── */}
      <div className="relative">
        {/*
         * WebcamFeed is ALWAYS in the DOM so videoRef.current is never null
         * when startWebcam() runs. Hidden with CSS when camera is inactive —
         * the <video> element stays mounted so srcObject can be attached
         * without the status-deadlock (status needs active to render the
         * element, element needs to render to reach active).
         */}
        <div className={webcam.status === 'active' ? 'block relative' : 'hidden'}>
          <WebcamFeed
            videoRef={webcam.videoRef}
            landmarks={result?.landmarks ?? null}
            bodyCenter={result?.bodyCenter ?? null}
            videoWidth={webcam.videoDimensions?.width ?? 1280}
            videoHeight={webcam.videoDimensions?.height ?? 720}
            confidence={result?.confidence ?? 0}
          />
        </div>

        {webcam.status !== 'active' && (
          <StartView
            webcamStatus={webcam.status}
            trackerStatus={tracker.status}
            error={webcam.error ?? tracker.error}
            onStart={handleStartCamera}
          />
        )}
      </div>

      {/* ── Calibration compact bar (shown after calibration is done) ───────── */}
      {webcam.status === 'active' && (
        <CalibrationFlow calibration={calibration} compact />
      )}
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StartView({
  webcamStatus,
  trackerStatus,
  error,
  onStart,
}: {
  webcamStatus: string
  trackerStatus: string
  error: string | null
  onStart: () => Promise<void>
}) {
  const isCameraLoading = webcamStatus === 'requesting'
  const isModelLoading  = trackerStatus === 'initializing'
  const isPending       = isCameraLoading || isModelLoading
  const isDenied        = webcamStatus === 'denied'

  return (
    <div className="flex flex-col items-center justify-center gap-5 rounded-xl
      border border-dashed border-slate-700 bg-slate-900/30 p-6 text-center">
      <div className="space-y-2">
        <span className="text-4xl">📷</span>
        <p className="text-sm font-semibold text-white">
          {isModelLoading ? 'Loading pose model…' : 'Webcam Body Tracking'}
        </p>
        <p className="text-xs text-slate-500 max-w-xs">
          {isModelLoading
            ? 'Downloading MediaPipe Pose from CDN (~5 MB)…'
            : isDenied
            ? 'Camera permission was denied. Allow it in browser settings and reload.'
            : 'Enables real-time skeleton overlay and batter position tracking.'}
        </p>
      </div>

      {error && (
        <p className="text-xs text-red-400 bg-red-400/10 rounded-lg px-3 py-2
          border border-red-400/20 max-w-xs">
          {error}
        </p>
      )}

      <button
        onClick={onStart}
        disabled={isPending || isDenied}
        className="px-6 py-2.5 rounded-lg bg-pitch-700 hover:bg-pitch-600
          disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold
          text-sm transition-colors min-w-[140px]"
      >
        {isPending ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
            {isModelLoading ? 'Loading model…' : 'Starting camera…'}
          </span>
        ) : isDenied ? (
          'Camera Denied'
        ) : (
          'Start Camera'
        )}
      </button>
    </div>
  )
}

function TrackerStatusBadge({
  webcamStatus,
  trackerStatus,
}: {
  webcamStatus: string
  trackerStatus: string
}) {
  if (trackerStatus === 'initializing') {
    return <StatusBadge variant="waiting" label="Loading model…" />
  }
  if (trackerStatus === 'tracking') {
    return <StatusBadge variant="connected" label="Tracking" />
  }
  if (webcamStatus === 'active') {
    return <StatusBadge variant="waiting" label="Pose model ready" />
  }
  if (webcamStatus === 'denied') {
    return <StatusBadge variant="error" label="Camera denied" />
  }
  return <StatusBadge variant="idle" label="Camera off" />
}
