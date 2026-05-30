// ─── Raw landmark ─────────────────────────────────────────────────────────────

/**
 * Single joint in normalised image coordinates (0-1).
 * x: 0 = left edge, 1 = right edge of the video frame
 * y: 0 = top,       1 = bottom
 * z: depth relative to hip mid-point (negative = closer to camera)
 * visibility: MediaPipe detection confidence (0-1)
 */
export interface NormalizedLandmark {
  x: number
  y: number
  z: number
  visibility?: number
}

// ─── Named body landmarks ─────────────────────────────────────────────────────

/**
 * Subset of MediaPipe Pose's 33 landmarks that we actually use.
 * Named keys instead of raw indices prevent off-by-one bugs and are
 * forward-compatible if MediaPipe adds/reorders points.
 */
export interface BodyLandmarks {
  nose: NormalizedLandmark
  leftShoulder: NormalizedLandmark
  rightShoulder: NormalizedLandmark
  leftElbow: NormalizedLandmark
  rightElbow: NormalizedLandmark
  leftWrist: NormalizedLandmark
  rightWrist: NormalizedLandmark
  leftHip: NormalizedLandmark
  rightHip: NormalizedLandmark
  leftKnee: NormalizedLandmark
  rightKnee: NormalizedLandmark
  leftAnkle: NormalizedLandmark
  rightAnkle: NormalizedLandmark
}

// Mediapipe landmark array indices for the joints above
export const LANDMARK_INDICES: Record<keyof BodyLandmarks, number> = {
  nose:          0,
  leftShoulder:  11,
  rightShoulder: 12,
  leftElbow:     13,
  rightElbow:    14,
  leftWrist:     15,
  rightWrist:    16,
  leftHip:       23,
  rightHip:      24,
  leftKnee:      25,
  rightKnee:     26,
  leftAnkle:     27,
  rightAnkle:    28,
}

/**
 * Bone connections for skeleton rendering.
 * Each tuple is a pair of BodyLandmarks keys to connect with a line.
 */
export const SKELETON_CONNECTIONS: ReadonlyArray<
  [keyof BodyLandmarks, keyof BodyLandmarks]
> = [
  ['nose',          'leftShoulder'],
  ['nose',          'rightShoulder'],
  ['leftShoulder',  'rightShoulder'],
  ['leftShoulder',  'leftElbow'],
  ['leftElbow',     'leftWrist'],
  ['rightShoulder', 'rightElbow'],
  ['rightElbow',    'rightWrist'],
  ['leftShoulder',  'leftHip'],
  ['rightShoulder', 'rightHip'],
  ['leftHip',       'rightHip'],
  ['leftHip',       'leftKnee'],
  ['leftKnee',      'leftAnkle'],
  ['rightHip',      'rightKnee'],
  ['rightKnee',     'rightAnkle'],
]

// ─── Derived data ─────────────────────────────────────────────────────────────

/**
 * Centre of mass proxy: midpoint of the two hip landmarks.
 * Range: -1 to +1 on each axis (0 = frame centre).
 * x < 0 = batter is left of centre; x > 0 = right of centre.
 * Used to drive the BatterMarker position in the R3F scene.
 */
export interface BodyCenter {
  x: number
  y: number
  z: number  // MediaPipe hip depth, useful for future distance estimation
}

// ─── Handedness ───────────────────────────────────────────────────────────────

export type Handedness = 'left' | 'right'

// ─── Calibration ─────────────────────────────────────────────────────────────

/**
 * One captured calibration sample from a neutral batting stance.
 * Phase 3 uses this to normalise swing angles relative to rest pose.
 */
export interface CalibrationFrame {
  landmarks: BodyLandmarks
  bodyCenter: BodyCenter
}

export interface CalibrationData {
  handedness: Handedness
  /** Mean neutral-stance landmarks averaged over ~30 capture frames */
  neutralLandmarks: BodyLandmarks
  /** Mean neutral body centre */
  neutralBodyCenter: BodyCenter
  /** Shoulder width in normalised units — used to scale phase-3 distances */
  shoulderWidthNorm: number
  capturedAt: number
}

// ─── Pose result (one frame) ──────────────────────────────────────────────────

/**
 * Output of one MediaPipe detection cycle.
 * landmarks is null when no person is visible in the frame.
 */
export interface PoseResult {
  landmarks: BodyLandmarks | null
  /** Full raw 33-landmark array (useful for future joints) */
  rawLandmarks: NormalizedLandmark[]
  bodyCenter: BodyCenter | null
  /** Aggregate visibility of key joints (shoulders + hips), 0-1 */
  confidence: number
  /** performance.now() timestamp of this frame */
  timestamp: number
}

// ─── Calibration state machine ────────────────────────────────────────────────

export type CalibrationPhase =
  | 'idle'
  | 'handedness'     // Waiting for left/right selection
  | 'stance-prompt'  // Instruction screen: "take your batting stance"
  | 'countdown'      // 3-2-1 countdown
  | 'capturing'      // Collecting frames
  | 'complete'       // Done — calibrationData is ready
