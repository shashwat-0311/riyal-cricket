'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { DeviceOrientationData, DeviceMotionData, SensorFrame } from '@/types/sensor'
import { EMPTY_MOTION, EMPTY_ORIENTATION } from '@/types/sensor'
import { SENSOR_INTERVAL_MS } from '@/lib/constants'

export type MotionPermission =
  | 'unknown'
  | 'requesting'
  | 'granted'
  | 'denied'
  | 'unavailable'   // browser has no motion hardware at all (e.g. desktop)
  | 'insecure'      // page is on HTTP; Chrome 74+ blocks motion APIs on non-secure origins

export interface UseMotionSensorReturn {
  permission: MotionPermission
  isCapturing: boolean
  orientation: DeviceOrientationData
  motion: DeviceMotionData
  requestPermission: () => Promise<void>
  startCapture: (roomCode: string, onFrame: (f: SensorFrame) => void) => void
  stopCapture: () => void
}

/**
 * Captures DeviceOrientationEvent + DeviceMotionEvent and emits SensorFrames
 * at a capped rate (SENSOR_FPS).
 *
 * iOS 13+ requires requestPermission() to be called in a user gesture handler
 * before any motion events fire. This hook surfaces that as `requestPermission`.
 *
 * Usage:
 *   const sensor = useMotionSensor()
 *   // on button click:
 *   await sensor.requestPermission()
 *   sensor.startCapture(roomCode, (frame) => socket.emit('sensor:data', frame))
 */
export function useMotionSensor(): UseMotionSensorReturn {
  const [permission, setPermission] = useState<MotionPermission>('unknown')
  const [isCapturing, setIsCapturing] = useState(false)
  const [orientation, setOrientation] = useState<DeviceOrientationData>(EMPTY_ORIENTATION)
  const [motion, setMotion] = useState<DeviceMotionData>(EMPTY_MOTION)

  // Latest raw data held in refs so the interval closure stays fresh without re-registration
  const orientationRef = useRef<DeviceOrientationData>(EMPTY_ORIENTATION)
  const motionRef = useRef<DeviceMotionData>(EMPTY_MOTION)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const seqRef = useRef(0)
  const cleanupRef = useRef<(() => void) | null>(null)

  // Detect upfront whether motion events are accessible
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Chrome 74+ and Firefox make DeviceMotion/Orientation undefined on HTTP origins.
    // window.isSecureContext is false for plain http:// (true for https:// and localhost).
    if (!window.isSecureContext) {
      setPermission('insecure')
      return
    }

    if (typeof DeviceOrientationEvent === 'undefined') {
      setPermission('unavailable')
    }
  }, [])

  const requestPermission = useCallback(async (): Promise<void> => {
    setPermission('requesting')

    // iOS 13+ explicit permission gate
    const DevOrient = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>
    }
    const DevMotion = DeviceMotionEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>
    }

    if (typeof DevOrient.requestPermission === 'function') {
      try {
        const [orientResult, motionResult] = await Promise.all([
          DevOrient.requestPermission!(),
          DevMotion.requestPermission?.() ?? Promise.resolve('granted' as const),
        ])
        if (orientResult === 'granted' && motionResult === 'granted') {
          setPermission('granted')
        } else {
          setPermission('denied')
        }
      } catch {
        setPermission('denied')
      }
    } else {
      // Android / desktop: events fire without an explicit grant
      setPermission('granted')
    }
  }, [])

  const startCapture = useCallback(
    (roomCode: string, onFrame: (f: SensorFrame) => void): void => {
      if (isCapturing) return

      const handleOrientation = (e: DeviceOrientationEvent): void => {
        const data: DeviceOrientationData = {
          alpha: e.alpha,
          beta: e.beta,
          gamma: e.gamma,
          absolute: e.absolute,
        }
        orientationRef.current = data
        setOrientation(data)
      }

      const handleMotion = (e: DeviceMotionEvent): void => {
        const data: DeviceMotionData = {
          acceleration: {
            x: e.acceleration?.x ?? null,
            y: e.acceleration?.y ?? null,
            z: e.acceleration?.z ?? null,
          },
          accelerationIncludingGravity: {
            x: e.accelerationIncludingGravity?.x ?? null,
            y: e.accelerationIncludingGravity?.y ?? null,
            z: e.accelerationIncludingGravity?.z ?? null,
          },
          rotationRate: {
            x: e.rotationRate?.alpha ?? null,
            y: e.rotationRate?.beta ?? null,
            z: e.rotationRate?.gamma ?? null,
          },
          interval: e.interval,
        }
        motionRef.current = data
        setMotion(data)
      }

      window.addEventListener('deviceorientation', handleOrientation, true)
      window.addEventListener('devicemotion', handleMotion, true)

      // Rate-limited frame emission at SENSOR_FPS
      intervalRef.current = setInterval(() => {
        const frame: SensorFrame = {
          timestamp: Date.now(),
          sequenceNumber: seqRef.current++,
          roomCode,
          orientation: orientationRef.current,
          motion: motionRef.current,
        }
        onFrame(frame)
      }, SENSOR_INTERVAL_MS)

      setIsCapturing(true)

      cleanupRef.current = () => {
        window.removeEventListener('deviceorientation', handleOrientation, true)
        window.removeEventListener('devicemotion', handleMotion, true)
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
        setIsCapturing(false)
      }
    },
    [isCapturing],
  )

  const stopCapture = useCallback((): void => {
    cleanupRef.current?.()
    cleanupRef.current = null
  }, [])

  // Auto-stop on unmount
  useEffect(() => {
    return () => {
      cleanupRef.current?.()
    }
  }, [])

  return { permission, isCapturing, orientation, motion, requestPermission, startCapture, stopCapture }
}
