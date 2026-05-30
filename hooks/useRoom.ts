'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSocket } from './useSocket'
import type { RoomState } from '@/types/room'
import type { SensorFrame } from '@/types/sensor'

export interface UseRoomReturn {
  roomState: RoomState | null
  latestFrame: SensorFrame | null
  frameRate: number
  isCreating: boolean
  error: string | null
  createRoom: () => void
}

/**
 * Game-screen hook. Creates a room, tracks its state, and collects incoming
 * sensor frames from the controller.
 */
export function useRoom(): UseRoomReturn {
  const { socket, isConnected } = useSocket()
  const [roomState, setRoomState] = useState<RoomState | null>(null)
  const [latestFrame, setLatestFrame] = useState<SensorFrame | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Measure real incoming frame rate
  const frameCountRef = useRef(0)
  const [frameRate, setFrameRate] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setFrameRate(frameCountRef.current)
      frameCountRef.current = 0
    }, 1_000)
    return () => clearInterval(timer)
  }, [])

  const createRoom = useCallback(() => {
    if (!isConnected) {
      setError('Not connected to server.')
      return
    }
    setIsCreating(true)
    setError(null)

    socket.emit('room:create', (res) => {
      setIsCreating(false)
      if (!res.success || !res.roomId || !res.roomCode) {
        setError(res.error ?? 'Failed to create room.')
      }
      // roomState is populated by the 'room:state-update' event the server sends
    })
  }, [socket, isConnected])

  useEffect(() => {
    function onStateUpdate(state: RoomState) {
      setRoomState(state)
      setError(null)
    }

    function onSensorData(frame: SensorFrame) {
      frameCountRef.current++
      setLatestFrame(frame)
    }

    function onControllerDisconnected() {
      // State update will follow; nothing extra needed
    }

    function onError(payload: { code: string; message: string }) {
      setError(payload.message)
    }

    socket.on('room:state-update', onStateUpdate)
    socket.on('sensor:data', onSensorData)
    socket.on('room:controller-disconnected', onControllerDisconnected)
    socket.on('error', onError)

    return () => {
      socket.off('room:state-update', onStateUpdate)
      socket.off('sensor:data', onSensorData)
      socket.off('room:controller-disconnected', onControllerDisconnected)
      socket.off('error', onError)
      socket.emit('room:leave')
    }
  }, [socket])

  return { roomState, latestFrame, frameRate, isCreating, error, createRoom }
}
