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
 *
 * Initialisation strategy:
 *   - The useState lazy initializer runs on BOTH server (SSR) and client.
 *   - getSocket() returns null on server (window undefined) → socket = null.
 *   - getSocket() returns AppSocket on the client → socket is non-null from
 *     the very first client render, so all downstream effects have a real
 *     socket available without any async delay.
 *   - The null-on-server case is safe because React effects never run during
 *     SSR, so socket.on / socket.emit are never called on the server.
 */
export function useSocket(): UseSocketReturn {
  const [socket] = useState<AppSocket | null>(() => getSocket())

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    () => (socket?.connected ? 'connected' : 'idle'),
  )

  useEffect(() => {
    if (!socket) return   // server: no-op (effects don't run on server anyway)

    if (socket.connected) setConnectionStatus('connected')

    function onConnect()          { setConnectionStatus('connected')    }
    function onDisconnect()       { setConnectionStatus('idle')         }
    function onConnectError()     { setConnectionStatus('error')        }
    function onReconnectAttempt() { setConnectionStatus('reconnecting') }

    socket.on('connect',       onConnect)
    socket.on('disconnect',    onDisconnect)
    socket.on('connect_error', onConnectError)
    socket.io.on('reconnect_attempt', onReconnectAttempt)
    socket.io.on('reconnect',  onConnect)

    if (!socket.connected) {
      setConnectionStatus('connecting')
      socket.connect()
    }

    return () => {
      socket.off('connect',       onConnect)
      socket.off('disconnect',    onDisconnect)
      socket.off('connect_error', onConnectError)
      socket.io.off('reconnect_attempt', onReconnectAttempt)
      socket.io.off('reconnect',  onConnect)
    }
  }, [socket])

  return {
    socket: socket as AppSocket,   // null only during server render — safe to cast
    connectionStatus,
    isConnected: socket?.connected ?? false,
  }
}
