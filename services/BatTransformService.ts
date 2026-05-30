import * as THREE from 'three'
import type { BodyLandmarks, BodyCenter, CalibrationData, Handedness } from '@/types/pose'
import type { DeviceOrientationData } from '@/types/sensor'
import type { BatTransform, BatCalibrationData } from '@/types/bat'
import { BatOrientationMapper } from './BatOrientationMapper'

// ── Scene constants (mirror BatterMarker.tsx) ─────────────────────────────────
const CREASE_Z       = 8.78   // popping crease Z in world space
const MAX_SIDE       = 1.5    // lateral clamp from BatterMarker (world units)

// ── Bat position scaling constants ────────────────────────────────────────────
// ARM_SCALE_X: how far the bat travels laterally per normalised wrist delta.
// A delta of 1.0 norm unit (~full frame width) produces ARM_SCALE_X world units.
const ARM_SCALE_X    = 2.4
const ARM_SCALE_Y    = 2.0   // vertical: full frame height → 2 world units of travel
const NEUTRAL_BAT_Y  = 1.1   // default grip height above ground when at neutral stance

const POS_LERP       = 0.22   // position lerp factor per sensor frame (~30 fps)

/**
 * Combines MediaPipe wrist landmarks (position) with phone DeviceOrientation
 * (rotation) into a single BatTransform that drives VirtualBat.
 *
 * Position derivation
 * ───────────────────
 * The player faces the webcam (which is the laptop screen).  In MediaPipe's
 * coordinate frame: x=0 is the camera's physical left edge = the player's
 * right side (mirror image).  This matches the convention already used by
 * BatterMarker, which moves to negative world-X when bodyCenter.x decreases.
 *
 * We decompose bat position into:
 *   1. bodyWorldX — lateral body shift, identical to BatterMarker
 *   2. armDeltaX  — wrist movement relative to its neutral position
 *
 * This means the bat follows the body AND tracks independent arm swing.
 *
 * Rotation derivation
 * ───────────────────
 * Delegated to BatOrientationMapper (quaternion slerp, calibration-relative).
 */
export class BatTransformService {
  private readonly orientationMapper = new BatOrientationMapper()

  private position     = new THREE.Vector3(0, NEUTRAL_BAT_Y, CREASE_Z)
  private prevPosition = new THREE.Vector3(0, NEUTRAL_BAT_Y, CREASE_Z)
  private prevTs       = 0

  // ── Public API ──────────────────────────────────────────────────────────────

  setCalibration(cal: BatCalibrationData): void {
    this.orientationMapper.setCalibration(cal)
  }

  captureBatCalibration(orientation: DeviceOrientationData): BatCalibrationData {
    return this.orientationMapper.captureNeutral(orientation)
  }

  update(
    landmarks:       BodyLandmarks | null,
    bodyCenter:      BodyCenter | null,
    orientation:     DeviceOrientationData | null,
    poseCalibration: CalibrationData | null,
    batCalibration:  BatCalibrationData | null,  // eslint-disable-line @typescript-eslint/no-unused-vars
    handedness:      Handedness,
    timestamp:       number,
  ): BatTransform {
    const dt = this.prevTs ? Math.min((timestamp - this.prevTs) / 1000, 0.1) : 0.033
    this.prevTs = timestamp

    // ── Target bat position (from wrist landmark) ────────────────────────────
    const target = this.computeTargetPosition(landmarks, bodyCenter, poseCalibration, handedness)

    // ── Smooth position (lerp toward target) ─────────────────────────────────
    this.prevPosition.copy(this.position)
    this.position.lerp(new THREE.Vector3(...target), POS_LERP)

    // ── Velocity (world units / second) ──────────────────────────────────────
    const velocity: [number, number, number] = dt > 0
      ? [
          (this.position.x - this.prevPosition.x) / dt,
          (this.position.y - this.prevPosition.y) / dt,
          (this.position.z - this.prevPosition.z) / dt,
        ]
      : [0, 0, 0]

    // ── Quaternion (from phone orientation) ──────────────────────────────────
    const quaternion: [number, number, number, number] = orientation
      ? this.orientationMapper.update(orientation)
      : [0, 0, 0, 1]

    return {
      position:   [this.position.x, this.position.y, this.position.z],
      quaternion,
      velocity,
    }
  }

  reset(): void {
    this.position.set(0, NEUTRAL_BAT_Y, CREASE_Z)
    this.prevPosition.set(0, NEUTRAL_BAT_Y, CREASE_Z)
    this.prevTs = 0
    this.orientationMapper.reset()
  }

  // ── Private ──────────────────────────────────────────────────────────────────

  private computeTargetPosition(
    landmarks:   BodyLandmarks | null,
    bodyCenter:  BodyCenter | null,
    calibration: CalibrationData | null,
    handedness:  Handedness,
  ): [number, number, number] {
    // No landmarks → park bat at sensible default near crease
    if (!landmarks) {
      return [handedness === 'right' ? 0.35 : -0.35, NEUTRAL_BAT_Y, CREASE_Z]
    }

    const wrist = handedness === 'right' ? landmarks.rightWrist : landmarks.leftWrist

    // ── No pose calibration: rough absolute mapping ──────────────────────────
    if (!calibration) {
      // Camera faces player: x=0 = camera-left = player's right → negate for scene
      const x = -(wrist.x - 0.5) * ARM_SCALE_X * 1.2
      const y = Math.max(0.05, (1 - wrist.y) * ARM_SCALE_Y * 1.4)
      return [x, y, CREASE_Z]
    }

    const neutralWrist = handedness === 'right'
      ? calibration.neutralLandmarks.rightWrist
      : calibration.neutralLandmarks.leftWrist

    // ── Body lateral shift (identical formula to BatterMarker) ───────────────
    const bc = bodyCenter ?? calibration.neutralBodyCenter
    const bodyWorldX = THREE.MathUtils.clamp(
      (bc.x - calibration.neutralBodyCenter.x) * MAX_SIDE,
      -MAX_SIDE,
      MAX_SIDE,
    )

    // ── Arm swing: wrist delta relative to its neutral position ──────────────
    // Negate dX: camera-left (low x) = player's right = scene negative-X
    const dX = wrist.x - neutralWrist.x
    const dY = wrist.y - neutralWrist.y

    const batX = THREE.MathUtils.clamp(
      bodyWorldX - dX * ARM_SCALE_X,
      -MAX_SIDE * 2,
       MAX_SIDE * 2,
    )
    // Negate dY: moving down in image (increasing y) = moving down in world (decreasing Y)
    const batY = Math.max(0.05, NEUTRAL_BAT_Y - dY * ARM_SCALE_Y)

    return [batX, batY, CREASE_Z]
  }
}
