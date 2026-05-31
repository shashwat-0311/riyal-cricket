import * as THREE from 'three'
import type { DeviceOrientationData } from '@/types/sensor'
import type { BatCalibrationData } from '@/types/bat'
import type { ControllerMode } from '@/types/pose'

// Slerp weight per sensor frame (~30 fps) — settling time ≈ 160 ms
const SLERP_FACTOR = 0.18

// 90° rotation around Z axis [x,y,z,w].
// When the phone is portrait-vertical on a selfie stick, a forward bat swing
// rotates the device around its X axis (beta/pitch).  Hand-held, the same
// physical swing rotates around Y (gamma/roll).
// Applying Q_z90 * relative * Q_z90.conj remaps X-axis rotation → Y-axis,
// making stick mode produce the same relative quaternion as hand-held mode.
const STICK_CORRECTION = new THREE.Quaternion(0, 0, Math.SQRT1_2, Math.SQRT1_2)

/**
 * Converts DeviceOrientation angles → smoothed quaternion for bat rotation.
 *
 * The W3C DeviceOrientation spec defines Euler angles using intrinsic ZXY
 * rotations: alpha (Z/yaw), beta (X/pitch), gamma (Y/roll).  Three.js maps
 * this exactly with Euler order 'ZXY'.
 *
 * After bat calibration, all output quaternions are RELATIVE to the neutral
 * grip orientation, so absolute compass direction is irrelevant.
 */
export class BatOrientationMapper {
  private smoothed   = new THREE.Quaternion()   // running slerp output
  private neutralQ: THREE.Quaternion | null = null
  private stickMode  = false

  setControllerMode(mode: ControllerMode): void {
    this.stickMode = mode === 'stick'
  }

  setCalibration(cal: BatCalibrationData): void {
    this.neutralQ = new THREE.Quaternion(
      cal.neutralQuaternionX,
      cal.neutralQuaternionY,
      cal.neutralQuaternionZ,
      cal.neutralQuaternionW,
    )
  }

  /**
   * Snapshot the current orientation as the neutral reference.
   * Returns the BatCalibrationData to be persisted by the caller.
   */
  captureNeutral(orientation: DeviceOrientationData): BatCalibrationData {
    const q = this.rawQuat(
      orientation.alpha ?? 0,
      orientation.beta  ?? 0,
      orientation.gamma ?? 0,
    )
    this.neutralQ = q.clone()
    return {
      neutralAlpha:       orientation.alpha ?? 0,
      neutralBeta:        orientation.beta  ?? 0,
      neutralGamma:       orientation.gamma ?? 0,
      neutralQuaternionX: q.x,
      neutralQuaternionY: q.y,
      neutralQuaternionZ: q.z,
      neutralQuaternionW: q.w,
      capturedAt:         performance.now(),
    }
  }

  /**
   * Feed a new orientation reading.
   * Returns the smoothed bat quaternion as [x, y, z, w].
   */
  update(orientation: DeviceOrientationData): [number, number, number, number] {
    const current = this.rawQuat(
      orientation.alpha ?? 0,
      orientation.beta  ?? 0,
      orientation.gamma ?? 0,
    )

    // If calibrated: express current rotation relative to the neutral grip
    let target = this.neutralQ
      ? this.neutralQ.clone().invert().multiply(current)
      : current

    // Stick-mode axis correction: remap relative rotation axes so the same
    // physical swing produces the same output quaternion as hand-held mode.
    // Q_z90 * target * Q_z90.conj rotates the rotation axis by 90° around Z,
    // mapping X-axis (beta) rotations to Y-axis (gamma) rotations.
    if (this.stickMode) {
      const c = STICK_CORRECTION.clone()
      target = c.multiply(target).multiply(STICK_CORRECTION.clone().conjugate())
    }

    // Ensure we always interpolate along the shortest arc
    if (this.smoothed.dot(target) < 0) target.set(-target.x, -target.y, -target.z, -target.w)

    this.smoothed.slerp(target, SLERP_FACTOR)

    return [this.smoothed.x, this.smoothed.y, this.smoothed.z, this.smoothed.w]
  }

  reset(): void {
    this.smoothed.identity()
    this.neutralQ = null
  }

  // ── Private ──────────────────────────────────────────────────────────────────

  private rawQuat(alpha: number, beta: number, gamma: number): THREE.Quaternion {
    const euler = new THREE.Euler(
      THREE.MathUtils.degToRad(beta),
      THREE.MathUtils.degToRad(alpha),
      THREE.MathUtils.degToRad(gamma),
      'ZXY',   // matches the W3C DeviceOrientation intrinsic rotation order
    )
    return new THREE.Quaternion().setFromEuler(euler)
  }
}
