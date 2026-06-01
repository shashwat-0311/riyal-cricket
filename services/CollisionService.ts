import * as THREE from 'three'
import type { BatTransform, SwingMetrics } from '@/types/bat'
import type { CollisionResult } from '@/types/ball'
import { BALL_RADIUS } from '@/types/ball'

// Bat blade extents in bat-local space (origin = grip base, +Y = toward blade tip).
// These match VirtualBat geometry × BAT_VISUAL_SCALE (1.5):
//   blade starts at (HANDLE_H + SHOULDER_H) × 1.5 = 0.323 × 1.5 = 0.485
//   blade ends   at (HANDLE_H + SHOULDER_H + BLADE_H) × 1.5 = 0.895 × 1.5 = 1.343
const BLADE_START_Y  = 0.485
const BLADE_END_Y    = 1.343
const CAPSULE_RADIUS = 0.095   // half blade width × scale + small tolerance for feel

/**
 * Detects bat-ball collision via sphere-vs-capsule test.
 *
 * The bat blade is approximated as a capsule whose axis runs from the shoulder
 * to the blade tip in bat-local +Y space.  This maps naturally onto the
 * VirtualBat geometry and avoids expensive mesh intersection.
 */
export class CollisionService {
  // Reused scratch vectors to avoid per-frame allocations
  private readonly _batPos      = new THREE.Vector3()
  private readonly _batQ        = new THREE.Quaternion()
  private readonly _bladeStart  = new THREE.Vector3()
  private readonly _bladeEnd    = new THREE.Vector3()
  private readonly _ballPos     = new THREE.Vector3()

  check(
    ballPosition: [number, number, number],
    batTransform: BatTransform,
  ): CollisionResult {
    const [bx, by, bz]       = batTransform.position
    const [qx, qy, qz, qw]   = batTransform.quaternion

    this._batPos.set(bx, by, bz)
    this._batQ.set(qx, qy, qz, qw)
    this._ballPos.set(...ballPosition)

    // Blade endpoints in world space
    this._bladeStart.set(0, BLADE_START_Y, 0).applyQuaternion(this._batQ).add(this._batPos)
    this._bladeEnd.set(0, BLADE_END_Y, 0).applyQuaternion(this._batQ).add(this._batPos)

    const dist     = distToSegment(this._ballPos, this._bladeStart, this._bladeEnd)
    const hitDist  = BALL_RADIUS + CAPSULE_RADIUS

    if (dist > hitDist) return { collisionDetected: false }

    // Closest point on capsule axis → impact point
    const t = closestT(this._ballPos, this._bladeStart, this._bladeEnd)
    const impactWorld = new THREE.Vector3().lerpVectors(this._bladeStart, this._bladeEnd, t)

    // Impact quality: 1.0 = dead-centre hit, 0 = edge
    const impactForce = Math.max(0, 1 - dist / hitDist)

    return {
      collisionDetected:     true,
      impactPoint:           [impactWorld.x, impactWorld.y, impactWorld.z],
      batVelocity:           batTransform.velocity,
      ballVelocityBeforeHit: undefined,  // caller fills this in
      impactForce,
    }
  }

  /**
   * Compute the post-hit ball velocity.
   *
   * Physics model:
   *  1. Get the bat face direction in world space.
   *  2. Reflect the incoming ball velocity through the bat face normal.
   *  3. Blend with bat linear velocity.
   *  4. Scale by swing power.
   *  5. Enforce minimum speed and sensible direction (away from batter).
   */
  computeHitVelocity(
    ballVelocity:  [number, number, number],
    batTransform:  BatTransform,
    swingMetrics:  SwingMetrics,
  ): [number, number, number] {
    const batQ   = new THREE.Quaternion(...batTransform.quaternion)
    const batVel = new THREE.Vector3(...batTransform.velocity)
    const ballV  = new THREE.Vector3(...ballVelocity)

    // Bat face normal in world space (bat local +Z)
    const faceNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(batQ)

    // Reflect ball velocity through the face normal
    const reflected = ballV.clone().reflect(faceNormal)

    // Hit power: peak angular velocity (deg/s) → linear speed (m/s)
    // 100 deg/s ≈ gentle swing → ~10 m/s; 400 deg/s → ~20 m/s; cap at 25 m/s
    const hitPower = Math.min(swingMetrics.peakVelocity * 0.05 + 8, 25)

    // Weighted combination: reflected direction + bat face direction
    const hitDir = reflected.normalize()
      .add(faceNormal.multiplyScalar(0.4))
      .normalize()

    const result = hitDir.multiplyScalar(hitPower)

    // Add a fraction of the bat's linear velocity (wrist motion contribution)
    result.addScaledVector(batVel, 0.4)

    // Ensure the ball goes away from the batter (+Z side → toward bowler = −Z)
    // If the result is heading further down the pitch (positive Z) flip it
    if (result.z > -1) result.z = -hitPower * 0.6

    // Always add a small upward component so the ball lifts off the ground
    result.y = Math.abs(result.y) + 2.5

    // Clamp total speed
    const spd = result.length()
    if (spd < 10) result.normalize().multiplyScalar(10)
    if (spd > 28) result.normalize().multiplyScalar(28)

    return [result.x, result.y, result.z]
  }
}

// ─── Private helpers ─────────────────────────────────────────────────────────

function closestT(p: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3): number {
  const ab = new THREE.Vector3().subVectors(b, a)
  const ap = new THREE.Vector3().subVectors(p, a)
  const len2 = ab.dot(ab)
  if (len2 === 0) return 0
  return Math.max(0, Math.min(1, ap.dot(ab) / len2))
}

function distToSegment(p: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3): number {
  const t       = closestT(p, a, b)
  const closest = new THREE.Vector3().lerpVectors(a, b, t)
  return p.distanceTo(closest)
}
