'use client'

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'

export type WebcamStatus = 'idle' | 'requesting' | 'active' | 'denied' | 'error'

export interface UseWebcamReturn {
  videoRef: RefObject<HTMLVideoElement | null>
  status: WebcamStatus
  error: string | null
  /** Width × height of the actual video stream in pixels */
  videoDimensions: { width: number; height: number } | null
  startWebcam: () => Promise<void>
  stopWebcam: () => void
}

/**
 * Manages the browser webcam stream lifecycle.
 * Stops the stream automatically on unmount.
 */
export function useWebcam(): UseWebcamReturn {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [status, setStatus] = useState<WebcamStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [videoDimensions, setVideoDimensions] = useState<{ width: number; height: number } | null>(null)

  const stopWebcam = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setStatus('idle')
    setVideoDimensions(null)
  }, [])

  const startWebcam = useCallback(async () => {
    if (status === 'active' || status === 'requesting') return
    setStatus('requesting')
    setError(null)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
          frameRate: { ideal: 30 },
        },
        audio: false,
      })

      streamRef.current = stream

      const video = videoRef.current
      if (!video) return

      video.srcObject = stream
      video.playsInline = true
      video.muted = true

      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => {
          setVideoDimensions({ width: video.videoWidth, height: video.videoHeight })
          video.play().then(resolve).catch(reject)
        }
        video.onerror = () => reject(new Error('Video element error'))
      })

      setStatus('active')
    } catch (err) {
      const isDenied = err instanceof DOMException &&
        (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')
      setStatus(isDenied ? 'denied' : 'error')
      setError(
        isDenied
          ? 'Camera access was denied. Allow camera in browser settings and reload.'
          : 'Could not access the camera. Ensure no other app is using it.',
      )
    }
  }, [status])

  // Cleanup on unmount
  useEffect(() => () => stopWebcam(), [stopWebcam])

  return { videoRef, status, error, videoDimensions, startWebcam, stopWebcam }
}
