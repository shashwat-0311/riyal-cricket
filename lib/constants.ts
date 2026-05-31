/** Sensor frames emitted per second from the controller */
export const SENSOR_FPS = 60

/** Milliseconds between sensor frames (≈ 16.7 ms) */
export const SENSOR_INTERVAL_MS = Math.round(1_000 / SENSOR_FPS)

/** How often to fire a latency ping from the game screen (ms) */
export const LATENCY_PING_INTERVAL_MS = 2_000

/** Maximum acceptable latency before showing a warning (ms) */
export const LATENCY_WARN_THRESHOLD_MS = 100

/** Stale sensor data threshold — if last frame is older than this, show warning */
export const SENSOR_STALE_THRESHOLD_MS = 500
