/**
 * PoseTrackingService — MediaPipe Pose Landmarker abstraction.
 *
 * Design decisions:
 *  - Dynamically imported so it is never bundled into the SSR path.
 *  - GPU delegate is attempted first; falls back to CPU automatically.
 *  - Uses VIDEO running mode (time-stamped, tracking-optimised).
 *  - Exposes a simple callback-based streaming API; the React hook wraps this.
 *  - Intentionally zero React dependency — testable in isolation.
 *
 * WASM / model files are loaded from CDN. For production, copy them to /public
 * and change the two URL constants to local paths.
 */

import type {
  BodyLandmarks,
  BodyCenter,
  NormalizedLandmark,
  PoseResult,
} from '../types/pose'
import { LANDMARK_INDICES } from '../types/pose'

// ─── CDN constants (pin version to prevent surprise breakage) ─────────────────

const WASM_URL =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'

// ─── Types mirrored from @mediapipe/tasks-vision ─────────────────────────────
// We use a dynamic import, so we type the relevant subset manually rather than
// pulling the whole package into the module graph at compile time.

interface MPLandmark {
  x: number
  y: number
  z: number
  visibility?: number
}

interface PoseLandmarkerResult {
  landmarks: MPLandmark[][]
}

interface PoseLandmarkerInstance {
  detectForVideo(video: HTMLVideoElement, timestamp: number): PoseLandmarkerResult
  close(): void
}

// ─── Service ──────────────────────────────────────────────────────────────────

export type TrackerServiceStatus =
  | 'idle'
  | 'initializing'
  | 'ready'
  | 'error'

export class PoseTrackingService {
  private landmarker: PoseLandmarkerInstance | null = null
  private rafId: number | null = null
  private isRunning = false
  status: TrackerServiceStatus = 'idle'

  // ── Initialization ──────────────────────────────────────────────────────────

  async initialize(): Promise<void> {
    if (this.status === 'ready' || this.status === 'initializing') return
    this.status = 'initializing'

    // Dynamic import keeps MediaPipe out of the SSR bundle entirely
    const { PoseLandmarker, FilesetResolver } = await import(
      '@mediapipe/tasks-vision'
    )

    const vision = await FilesetResolver.forVisionTasks(WASM_URL)

    const options = {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' as const },
      runningMode: 'VIDEO' as const,
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    }

    try {
      this.landmarker = await PoseLandmarker.createFromOptions(vision, options)
    } catch {
      // GPU context unavailable (headless, low-end device) — retry with CPU
      this.landmarker = await PoseLandmarker.createFromOptions(vision, {
        ...options,
        baseOptions: { modelAssetPath: MODEL_URL, delegate: 'CPU' as const },
      })
    }

    this.status = 'ready'
  }

  // ── Single-frame detection ──────────────────────────────────────────────────

  detectFrame(video: HTMLVideoElement): PoseResult {
    if (!this.landmarker) throw new Error('PoseTrackingService not initialised.')
    if (video.readyState < 2) {
      return { landmarks: null, rawLandmarks: [], bodyCenter: null, confidence: 0, timestamp: performance.now() }
    }

    const timestamp = performance.now()
    const result = this.landmarker.detectForVideo(video, timestamp)

    if (!result.landmarks?.length || !result.landmarks[0].length) {
      return { landmarks: null, rawLandmarks: [], bodyCenter: null, confidence: 0, timestamp }
    }

    const raw = result.landmarks[0]
    const landmarks = this.mapLandmarks(raw)
    const bodyCenter = this.computeBodyCenter(landmarks)
    const confidence = this.computeConfidence(raw)

    return { landmarks, rawLandmarks: raw as NormalizedLandmark[], bodyCenter, confidence, timestamp }
  }

  // ── Continuous tracking loop ────────────────────────────────────────────────

  startTracking(
    video: HTMLVideoElement,
    onResult: (result: PoseResult) => void,
  ): void {
    if (this.isRunning) return
    this.isRunning = true

    const loop = () => {
      if (!this.isRunning) return
      try {
        onResult(this.detectFrame(video))
      } catch {
        // Swallow single-frame errors (video may not be ready yet)
      }
      this.rafId = requestAnimationFrame(loop)
    }

    this.rafId = requestAnimationFrame(loop)
  }

  stopTracking(): void {
    this.isRunning = false
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }

  dispose(): void {
    this.stopTracking()
    this.landmarker?.close()
    this.landmarker = null
    this.status = 'idle'
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private mapLandmarks(raw: MPLandmark[]): BodyLandmarks {
    const get = (key: keyof typeof LANDMARK_INDICES): NormalizedLandmark => {
      const idx = LANDMARK_INDICES[key]
      const lm = raw[idx]
      return { x: lm.x, y: lm.y, z: lm.z, visibility: lm.visibility }
    }

    return {
      nose:          get('nose'),
      leftShoulder:  get('leftShoulder'),
      rightShoulder: get('rightShoulder'),
      leftElbow:     get('leftElbow'),
      rightElbow:    get('rightElbow'),
      leftWrist:     get('leftWrist'),
      rightWrist:    get('rightWrist'),
      leftHip:       get('leftHip'),
      rightHip:      get('rightHip'),
      leftKnee:      get('leftKnee'),
      rightKnee:     get('rightKnee'),
      leftAnkle:     get('leftAnkle'),
      rightAnkle:    get('rightAnkle'),
    }
  }

  private computeBodyCenter(lm: BodyLandmarks): BodyCenter {
    const mx = (lm.leftHip.x + lm.rightHip.x) / 2
    const my = (lm.leftHip.y + lm.rightHip.y) / 2
    const mz = (lm.leftHip.z + lm.rightHip.z) / 2
    return {
      x: (mx - 0.5) * 2,           // 0-1 → -1..+1
      y: -((my - 0.5) * 2),        // flip Y so positive = up
      z: mz,
    }
  }

  private computeConfidence(raw: MPLandmark[]): number {
    const keyIndices = [11, 12, 23, 24]  // shoulders + hips
    const vis = keyIndices.map(i => raw[i]?.visibility ?? 0)
    return vis.reduce((a, b) => a + b, 0) / vis.length
  }

  // ── Static helpers (used in calibration averaging) ─────────────────────────

  static averageLandmarks(frames: BodyLandmarks[]): BodyLandmarks {
    if (frames.length === 0) throw new Error('Cannot average empty frames.')
    const keys = Object.keys(frames[0]) as (keyof BodyLandmarks)[]
    const result = {} as BodyLandmarks

    for (const key of keys) {
      const n = frames.length
      result[key] = {
        x: frames.reduce((s, f) => s + f[key].x, 0) / n,
        y: frames.reduce((s, f) => s + f[key].y, 0) / n,
        z: frames.reduce((s, f) => s + f[key].z, 0) / n,
        visibility: frames.reduce((s, f) => s + (f[key].visibility ?? 0), 0) / n,
      }
    }

    return result
  }

  static computeBodyCenter(lm: BodyLandmarks): BodyCenter {
    const mx = (lm.leftHip.x + lm.rightHip.x) / 2
    const my = (lm.leftHip.y + lm.rightHip.y) / 2
    const mz = (lm.leftHip.z + lm.rightHip.z) / 2
    return { x: (mx - 0.5) * 2, y: -((my - 0.5) * 2), z: mz }
  }

  static shoulderWidth(lm: BodyLandmarks): number {
    return Math.abs(lm.leftShoulder.x - lm.rightShoulder.x)
  }
}
