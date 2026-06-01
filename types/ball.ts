// Standard cricket ball dimensions (1 world unit = 1 metre)
export const BALL_RADIUS = 0.036   // 71.1 mm diameter → 35.55 mm radius
export const BALL_MASS   = 0.1559  // kg — used for impulse scaling

/**
 * Live physics snapshot — written every frame, read by the renderer.
 * Stored in a ref so React never re-renders on physics updates.
 */
export interface BallPhysicsState {
  position:    [number, number, number]  // [x, y, z] world space
  velocity:    [number, number, number]  // [vx, vy, vz] m/s
  bounceCount: number
  isGrounded:  boolean
}

/**
 * Internal phase of a single delivery.
 * Managed inside DeliveryManager; not directly exposed to React.
 */
export type DeliveryPhase =
  | 'IDLE'    // no active ball
  | 'ACTIVE'  // ball in flight
  | 'PASSED'  // ball went past the batter (no hit)
  | 'HIT'     // bat connected

/**
 * Outer delivery control state — synced between game screen and controller
 * via Socket.IO so the controller can show the correct button.
 */
export type DeliveryControlState =
  | 'WAITING'           // controller shows "Ready for Next Ball"
  | 'COUNTDOWN'         // 3-2-1 countdown running
  | 'ACTIVE_DELIVERY'   // ball in play
  | 'DELIVERY_COMPLETE' // delivery finished (HIT or PASSED)

/** Payload sent over socket for delivery state updates */
export interface DeliveryStatePayload {
  state:      DeliveryControlState
  countdown?: number  // 3, 2, 1 during COUNTDOWN phase
}

/** Parameters that fully describe one straight delivery */
export interface DeliveryConfig {
  startX:  number   // lateral position of release (±0.2)
  startY:  number   // release height (1.0 – 1.4 m)
  startZ:  number   // always ≈ −8.78 (bowling crease)
  bounceZ: number   // z-coordinate of first bounce (0 – 4)
  bounceX: number   // x-coordinate of first bounce (±0.15)
  speed:   number   // magnitude of initial velocity (18 – 26 m/s)
}

/** Result of a single collision check */
export interface CollisionResult {
  collisionDetected:     boolean
  impactPoint?:          [number, number, number]
  batVelocity?:          [number, number, number]
  ballVelocityBeforeHit?: [number, number, number]
  impactForce?:          number  // 0 – 1, 1 = dead centre
}
