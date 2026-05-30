import { SwingState, DEFAULT_SWING_METRICS } from '@/types/bat'
import type { SwingMetrics } from '@/types/bat'
import type { SensorFrame } from '@/types/sensor'

// ── Angular-velocity thresholds (deg/s) ──────────────────────────────────────
const BACKLIFT_THRESHOLD    = 25    // IDLE → BACKLIFT
const SWING_THRESHOLD       = 80    // BACKLIFT → SWING  (fast downswing)
const FOLLOW_THRESHOLD      = 55    // SWING → FOLLOW_THROUGH (deceleration begins)
const IDLE_THRESHOLD        = 12    // FOLLOW_THROUGH → IDLE

// ── Timing guards (ms) ────────────────────────────────────────────────────────
const IDLE_DEBOUNCE_MS      = 350   // min time in IDLE before a new backlift registers
const SWING_TIMEOUT_MS      = 1_500 // force-return to IDLE if SWING/FOLLOW_THROUGH stalls

/**
 * Stateful state machine that detects batting swing phases from sensor data.
 *
 * Input : one SensorFrame per sensor tick (~30 fps)
 * Output: current SwingState + SwingMetrics snapshot
 *
 * Transition diagram:
 *   IDLE ──(speed > BACKLIFT)──► BACKLIFT
 *   BACKLIFT ──(speed > SWING)──► SWING
 *   BACKLIFT ──(speed < IDLE, timeout)──► IDLE       ← aborted backlift
 *   SWING ──(speed < FOLLOW)──► FOLLOW_THROUGH
 *   SWING ──(timeout)──► IDLE
 *   FOLLOW_THROUGH ──(speed < IDLE or timeout)──► IDLE
 */
export class SwingDetectionService {
  private state           = SwingState.IDLE
  private peakVelocity    = 0
  private lastStateChange = 0
  private lastIdleTime    = 0

  update(frame: SensorFrame): { state: SwingState; metrics: SwingMetrics } {
    const now    = frame.timestamp
    const rot    = frame.motion.rotationRate

    // Vector3 maps alpha→x, beta→y, gamma→z (as packed by useMotionSensor)
    const rA = rot.x ?? 0
    const rB = rot.y ?? 0
    const rG = rot.z ?? 0

    const speed   = Math.sqrt(rA * rA + rB * rB + rG * rG)
    const elapsed = now - this.lastStateChange

    switch (this.state) {
      case SwingState.IDLE:
        if (speed > BACKLIFT_THRESHOLD && now - this.lastIdleTime > IDLE_DEBOUNCE_MS) {
          this.transition(SwingState.BACKLIFT, now)
          this.peakVelocity = speed
        }
        break

      case SwingState.BACKLIFT:
        if (speed > this.peakVelocity) this.peakVelocity = speed
        if (speed > SWING_THRESHOLD) {
          this.transition(SwingState.SWING, now)
        } else if (speed < IDLE_THRESHOLD || elapsed > SWING_TIMEOUT_MS) {
          this.transition(SwingState.IDLE, now)
          this.lastIdleTime = now
        }
        break

      case SwingState.SWING:
        if (speed > this.peakVelocity) this.peakVelocity = speed
        if (speed < FOLLOW_THRESHOLD || elapsed > SWING_TIMEOUT_MS) {
          this.transition(SwingState.FOLLOW_THROUGH, now)
        }
        break

      case SwingState.FOLLOW_THROUGH:
        if (speed < IDLE_THRESHOLD || elapsed > SWING_TIMEOUT_MS) {
          this.transition(SwingState.IDLE, now)
          this.lastIdleTime = now
        }
        break
    }

    return {
      state: this.state,
      metrics: {
        swingSpeed:      speed,
        peakVelocity:    this.peakVelocity,
        swingDirection:  this.state === SwingState.IDLE ? 'none' : detectDirection(rB, rG),
        angularVelocity: [rA, rB, rG],
      },
    }
  }

  getState(): SwingState {
    return this.state
  }

  reset(): void {
    this.state           = SwingState.IDLE
    this.peakVelocity    = 0
    this.lastStateChange = 0
    this.lastIdleTime    = 0
  }

  // ── Private ──────────────────────────────────────────────────────────────────

  private transition(next: SwingState, now: number): void {
    this.state           = next
    this.lastStateChange = now
    if (next === SwingState.BACKLIFT) this.peakVelocity = 0
  }
}

function detectDirection(beta: number, gamma: number): SwingMetrics['swingDirection'] {
  if (gamma >  20) return 'leg'
  if (gamma < -20) return 'off'
  if (Math.abs(beta) < 15 && Math.abs(gamma) < 15) return 'straight'
  return 'straight'
}

export { DEFAULT_SWING_METRICS }
