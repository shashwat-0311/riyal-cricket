'use client'

import { useEffect, useState } from 'react'
import { getSocket, type AppSocket } from '@/lib/socket'

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error' | 'reconnecting'

export interface UseSocketReturn {
  socket: AppSocket
  connectionStatus: ConnectionStatus
  isConnected: boolean
}

/**
 * Returns the singleton socket and a reactive connection status.
 * Connects once on mount; listeners are cleaned up on unmount without
 * disconnecting — the socket stays alive between page navigations.
 */
export function useSocket(): UseSocketReturn {
  const socket = getSocket()
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    socket.connected ? 'connected' : 'idle',
  )

  useEffect(() => {
    function onConnect() { setConnectionStatus('connected') }
    function onDisconnect() { setConnectionStatus('idle') }
    function onConnectError() { setConnectionStatus('error') }
    function onReconnectAttempt() { setConnectionStatus('reconnecting') }

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('connect_error', onConnectError)
    socket.io.on('reconnect_attempt', onReconnectAttempt)
    socket.io.on('reconnect', onConnect)

    if (!socket.connected) {
      setConnectionStatus('connecting')
      socket.connect()
    }

    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('connect_error', onConnectError)
      socket.io.off('reconnect_attempt', onReconnectAttempt)
      socket.io.off('reconnect', onConnect)
    }
  }, [socket])

  return { socket, connectionStatus, isConnected: socket.connected }
}
