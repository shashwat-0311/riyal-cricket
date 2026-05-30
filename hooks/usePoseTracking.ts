'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { PoseTrackingService } from '@/services/poseTrackingService'
import type { PoseResult } from '@/types/pose'

export type PoseTrackerStatus = 'idle' | 'initializing' | 'ready' | 'tracking' | 'error'

export interface UsePoseTrackingReturn {
  status: PoseTrackerStatus
  error: string | null
  latestResult: PoseResult | null
  initialize: () => Promise<void>
  startTracking: (video: HTMLVideoElement) => void
  stopTracking: () => void
}

/**
 * React hook around PoseTrackingService.
 * Owns one service instance per component mount; disposes on unmount.
 */
export function usePoseTracking(): UsePoseTrackingReturn {
  const serviceRef = useRef<PoseTrackingService | null>(null)
  const [status, setStatus] = useState<PoseTrackerStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [latestResult, setLatestResult] = useState<PoseResult | null>(null)

  // Lazily create service (not during SSR — this hook is 'use client' only)
  function getService(): PoseTrackingService {
    if (!serviceRef.current) {
      serviceRef.current = new PoseTrackingService()
    }
    return serviceRef.current
  }

  const initialize = useCallback(async () => {
    if (status === 'initializing' || status === 'ready' || status === 'tracking') return
    setStatus('initializing')
    setError(null)

    try {
      await getService().initialize()
      setStatus('ready')
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Failed to load the pose model.'
      setStatus('error')
      setError(msg)
    }
  }, [status])

  const startTracking = useCallback((video: HTMLVideoElement) => {
    const svc = getService()
    if (svc.status !== 'ready') return

    svc.startTracking(video, (result) => {
      setLatestResult(result)
    })
    setStatus('tracking')
  }, [])

  const stopTracking = useCallback(() => {
    serviceRef.current?.stopTracking()
    setStatus('ready')
  }, [])

  // Dispose on unmount
  useEffect(() => {
    return () => {
      serviceRef.current?.dispose()
    }
  }, [])

  return { status, error, latestResult, initialize, startTracking, stopTracking }
}
