'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSocket } from './useSocket'
import type { RoomState } from '@/types/room'

export type JoinStatus = 'idle' | 'joining' | 'joined' | 'error'

export interface UseControllerRoomReturn {
  roomState: RoomState | null
  joinStatus: JoinStatus
  joinError: string | null
  joinRoom: (roomCode: string) => void
  leaveRoom: () => void
}

/**
 * Controller hook. Joins an existing room by code and tracks its state.
 * The roomCode can be supplied on mount (from URL param) or later (manual entry).
 */
export function useControllerRoom(initialRoomCode?: string): UseControllerRoomReturn {
  const { socket, isConnected } = useSocket()
  const [roomState, setRoomState] = useState<RoomState | null>(null)
  const [joinStatus, setJoinStatus] = useState<JoinStatus>('idle')
  const [joinError, setJoinError] = useState<string | null>(null)

  const joinRoom = useCallback(
    (roomCode: string) => {
      if (!isConnected) {
        setJoinError('Not connected to server.')
        setJoinStatus('error')
        return
      }
      setJoinStatus('joining')
      setJoinError(null)

      socket.emit('room:join', { roomCode: roomCode.toUpperCase() }, (res) => {
        if (res.success) {
          setJoinStatus('joined')
        } else {
          setJoinStatus('error')
          setJoinError(res.error ?? 'Could not join room.')
        }
      })
    },
    [socket, isConnected],
  )

  const leaveRoom = useCallback(() => {
    socket.emit('room:leave')
    setRoomState(null)
    setJoinStatus('idle')
    setJoinError(null)
  }, [socket])

  // Auto-join when socket connects if we have a code already
  useEffect(() => {
    if (isConnected && initialRoomCode && joinStatus === 'idle') {
      joinRoom(initialRoomCode)
    }
  }, [isConnected, initialRoomCode, joinStatus, joinRoom])

  useEffect(() => {
    function onStateUpdate(state: RoomState) {
      setRoomState(state)
    }
    function onError(payload: { code: string; message: string }) {
      setJoinError(payload.message)
      setJoinStatus('error')
    }

    socket.on('room:state-update', onStateUpdate)
    socket.on('error', onError)

    return () => {
      socket.off('room:state-update', onStateUpdate)
      socket.off('error', onError)
      socket.emit('room:leave')
    }
  }, [socket])

  return { roomState, joinStatus, joinError, joinRoom, leaveRoom }
}
