/**
 * Raw orientation angles from DeviceOrientationEvent.
 * alpha = compass heading (0-360, Z-axis)
 * beta  = front-to-back tilt (-180 to 180, X-axis)
 * gamma = left-to-right tilt (-90 to 90, Y-axis)
 */
export interface DeviceOrientationData {
  alpha: number | null
  beta: number | null
  gamma: number | null
  absolute: boolean
}

export interface Vector3 {
  x: number | null
  y: number | null
  z: number | null
}

/**
 * Raw motion data from DeviceMotionEvent.
 * acceleration excludes gravity; accelerationIncludingGravity includes it.
 * rotationRate is in deg/s on all three axes.
 */
export interface DeviceMotionData {
  acceleration: Vector3
  accelerationIncludingGravity: Vector3
  rotationRate: Vector3
  interval: number
}

/**
 * One complete sensor snapshot sent from controller → server → game screen.
 * Stamped with the controller's local clock; latency is measured separately.
 */
export interface SensorFrame {
  timestamp: number
  sequenceNumber: number
  roomCode: string
  orientation: DeviceOrientationData
  motion: DeviceMotionData
}

export const EMPTY_ORIENTATION: DeviceOrientationData = {
  alpha: null,
  beta: null,
  gamma: null,
  absolute: false,
}

export const EMPTY_MOTION: DeviceMotionData = {
  acceleration: { x: null, y: null, z: null },
  accelerationIncludingGravity: { x: null, y: null, z: null },
  rotationRate: { x: null, y: null, z: null },
  interval: 0,
}
