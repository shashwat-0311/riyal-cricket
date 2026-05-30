'use client'

import { useEffect, useRef, useState } from 'react'
import type { AppSocket } from '@/lib/socket'
import { LATENCY_PING_INTERVAL_MS } from '@/lib/constants'

export interface LatencyStats {
  /** Round-trip time in milliseconds, or null if no measurement yet */
  rtt: number | null
  /** Rolling average of the last N pings */
  avgRtt: number | null
  jitter: number | null
}

const HISTORY_SIZE = 10

export function useLatency(socket: AppSocket, enabled = true): LatencyStats {
  const [stats, setStats] = useState<LatencyStats>({ rtt: null, avgRtt: null, jitter: null })
  const historyRef = useRef<number[]>([])
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!enabled) return

    function measure() {
      if (!socket.connected) return
      const start = performance.now()
      socket.emit('ping', Date.now(), () => {
        const rtt = Math.round(performance.now() - start)
        const history = historyRef.current
        history.push(rtt)
        if (history.length > HISTORY_SIZE) history.shift()

        const avg = Math.round(history.reduce((a, b) => a + b, 0) / history.length)
        const mean = avg
        const jitter =
          history.length > 1
            ? Math.round(
                Math.sqrt(history.reduce((sum, v) => sum + (v - mean) ** 2, 0) / history.length),
              )
            : 0

        setStats({ rtt, avgRtt: avg, jitter })
      })
    }

    measure() // First measurement immediately
    intervalRef.current = setInterval(measure, LATENCY_PING_INTERVAL_MS)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [socket, enabled])

  return stats
}
