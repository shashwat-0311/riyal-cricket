/**
 * Bat position + orientation in Three.js world space.
 * quaternion is [x, y, z, w] to stay framework-agnostic.
 * velocity is world-space metres/second (derived from position delta).
 */
export interface BatTransform {
  position:   [number, number, number]
  quaternion: [number, number, number, number]
  velocity:   [number, number, number]
}

/**
 * Output of SwingDetectionService — one snapshot per sensor frame.
 */
export interface SwingMetrics {
  swingSpeed:       number                                   // deg/s magnitude of angular velocity
  peakVelocity:     number                                   // max angular speed during current/last swing
  swingDirection:   'leg' | 'off' | 'straight' | 'none'
  angularVelocity:  [number, number, number]                 // [alpha, beta, gamma] deg/s from rotationRate
}

/**
 * Swing state machine.
 * IDLE → BACKLIFT → SWING → FOLLOW_THROUGH → IDLE
 */
export enum SwingState {
  IDLE           = 'IDLE',
  BACKLIFT       = 'BACKLIFT',
  SWING          = 'SWING',
  FOLLOW_THROUGH = 'FOLLOW_THROUGH',
}

/**
 * Captured neutral phone orientation for bat rotation calibration.
 * All subsequent rotations are relative to this reference frame.
 */
export interface BatCalibrationData {
  neutralAlpha:       number  // deg
  neutralBeta:        number  // deg
  neutralGamma:       number  // deg
  neutralQuaternionX: number
  neutralQuaternionY: number
  neutralQuaternionZ: number
  neutralQuaternionW: number
  capturedAt:         number  // performance.now() timestamp
}

export const DEFAULT_SWING_METRICS: SwingMetrics = {
  swingSpeed:      0,
  peakVelocity:    0,
  swingDirection:  'none',
  angularVelocity: [0, 0, 0],
}
