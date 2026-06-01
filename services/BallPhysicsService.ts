import * as THREE from 'three'
import type { BallPhysicsState, DeliveryConfig } from '@/types/ball'
import { BALL_RADIUS } from '@/types/ball'

const GRAVITY      = 9.8   // m/s²
const RESTITUTION  = 0.65  // hard pitch — fraction of vy retained on bounce
const LATERAL_DAMP = 0.88  // fraction of vx/vz retained on bounce (pitch friction)
const MAX_BOUNCES  = 4     // cap to avoid infinite micro-bounces
const MIN_BOUNCE_V = 0.4   // m/s — below this vy, stop bouncing (roll)

export class BallPhysicsService {
  private pos  = new THREE.Vector3()
  private vel  = new THREE.Vector3()
  private bounceCount = 0
  private active      = false

  /** Begin a delivery.  Calculates initial vy so the ball first hits the
   *  ground at config.bounceZ, then continues toward the batter. */
  start(config: DeliveryConfig): void {
    const { startX, startY, startZ, bounceZ, bounceX, speed } = config

    // Horizontal distance to bounce point (ball travels in +Z direction)
    const dz = bounceZ - startZ   // always positive for valid deliveries
    const vz = speed

    // Time to reach the bounce zone
    const t = dz / vz

    // Solve for vy0 so that y(t) = 0 (ground):
    //   0 = startY + vy0·t − ½·g·t²
    //   vy0 = (½·g·t² − startY) / t
    const vy0 = t > 0 ? (0.5 * GRAVITY * t * t - startY) / t : 0

    // vx to aim laterally toward the bounce point
    const vx = t > 0 ? (bounceX - startX) / t : 0

    this.pos.set(startX, startY, startZ)
    this.vel.set(vx, vy0, vz)
    this.bounceCount = 0
    this.active = true
  }

  /** Integrate one physics step.  dt should be the frame delta (seconds). */
  update(dt: number): BallPhysicsState {
    if (!this.active) return this.snapshot()

    // Semi-implicit Euler: update velocity first, then position
    this.vel.y -= GRAVITY * dt
    this.pos.addScaledVector(this.vel, dt)

    // Ground collision: ball surface touches y = 0
    if (this.pos.y < BALL_RADIUS && this.vel.y < 0) {
      this.pos.y = BALL_RADIUS

      if (this.bounceCount < MAX_BOUNCES && Math.abs(this.vel.y) > MIN_BOUNCE_V) {
        this.vel.y  = -this.vel.y * RESTITUTION
        this.vel.x *= LATERAL_DAMP
        this.vel.z *= LATERAL_DAMP
        this.bounceCount++
      } else {
        // Ball rolls — kill vertical component
        this.vel.y  = 0
        this.pos.y  = BALL_RADIUS
      }
    }

    return this.snapshot()
  }

  /** Override ball velocity (called by CollisionService on a bat hit). */
  applyImpulse(newVelocity: [number, number, number]): void {
    this.vel.set(...newVelocity)
    // Lift ball slightly off the bat surface to prevent immediate re-collision
    this.pos.y = Math.max(this.pos.y, BALL_RADIUS * 3)
  }

  reset(): void {
    this.pos.set(0, 1.2, -8.78)
    this.vel.set(0, 0, 0)
    this.bounceCount = 0
    this.active = false
  }

  getPosition(): [number, number, number] {
    return [this.pos.x, this.pos.y, this.pos.z]
  }

  private snapshot(): BallPhysicsState {
    return {
      position:    [this.pos.x, this.pos.y, this.pos.z],
      velocity:    [this.vel.x, this.vel.y, this.vel.z],
      bounceCount: this.bounceCount,
      isGrounded:  this.pos.y <= BALL_RADIUS + 0.02,
    }
  }
}

/** Generate a randomised straight-delivery config. */
export function randomDeliveryConfig(): DeliveryConfig {
  const speed   = 20 + Math.random() * 6          // 20–26 m/s (72–94 km/h)
  const startX  = (Math.random() - 0.5) * 0.4     // ±0.2 m line variation
  const startY  = 1.1 + Math.random() * 0.2       // 1.1–1.3 m release height
  const bounceZ = Math.random() * 4               // 0–4 m (full to good length)
  const bounceX = (Math.random() - 0.5) * 0.3    // aim close to stumps centre

  return {
    startX,
    startY,
    startZ: -8.78,   // bowling crease
    bounceZ,
    bounceX,
    speed,
  }
}
