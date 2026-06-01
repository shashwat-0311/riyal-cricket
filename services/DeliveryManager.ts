import type { BallPhysicsState, DeliveryPhase } from '@/types/ball'
import { BallPhysicsService, randomDeliveryConfig } from './BallPhysicsService'

// Ball is considered "past the batter" when it crosses this Z threshold
const PASSED_Z = 10.5

export interface DeliveryTick {
  ballState: BallPhysicsState
  phase:     DeliveryPhase
}

/**
 * Manages the full lifecycle of a single ball delivery.
 *
 * This is a pure JS class (no React) — it is created once via useRef and
 * ticked every frame inside a useFrame callback in BallSystem.tsx.
 *
 * State machine:
 *   IDLE → (startDelivery) → ACTIVE → PASSED | HIT → (reset) → IDLE
 */
export class DeliveryManager {
  private physics = new BallPhysicsService()
  private _phase: DeliveryPhase = 'IDLE'
  private _hitGuard = false  // prevents multiple HIT transitions per delivery

  get phase(): DeliveryPhase { return this._phase }

  /** Spawn and launch the ball.  Generates a randomised straight delivery. */
  startDelivery(): void {
    this.physics.reset()
    this._hitGuard = false
    this._phase = 'ACTIVE'
    this.physics.start(randomDeliveryConfig())
  }

  /**
   * Advance physics by dt seconds.
   * Must be called every frame while phase === 'ACTIVE'.
   * Returns the current ball state and phase.
   */
  tick(dt: number): DeliveryTick {
    if (this._phase === 'ACTIVE') {
      const ballState = this.physics.update(dt)

      // Ball flew past the batter
      if (ballState.position[2] > PASSED_Z) {
        this._phase = 'PASSED'
        return { ballState, phase: this._phase }
      }

      return { ballState, phase: 'ACTIVE' }
    }

    // For non-ACTIVE phases, return the last known physics snapshot
    return {
      ballState: {
        position:    this.physics.getPosition(),
        velocity:    [0, 0, 0],
        bounceCount: 0,
        isGrounded:  false,
      },
      phase: this._phase,
    }
  }

  /**
   * Apply a hit impulse to the ball and transition to HIT phase.
   * Guard prevents double-calling if collision fires twice in one frame.
   */
  applyHit(newVelocity: [number, number, number]): void {
    if (this._phase !== 'ACTIVE' || this._hitGuard) return
    this._hitGuard = true
    this.physics.applyImpulse(newVelocity)
    this._phase = 'HIT'
  }

  /** Reset to IDLE, ready for the next delivery. */
  reset(): void {
    this.physics.reset()
    this._phase = 'IDLE'
    this._hitGuard = false
  }

  getBallPosition(): [number, number, number] {
    return this.physics.getPosition()
  }
}
