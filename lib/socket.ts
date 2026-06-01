'use client'

import { io, type Socket } from 'socket.io-client'
import type { ClientToServerEvents, ServerToClientEvents } from '@/types/socket'

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>

let instance: AppSocket | null = null

/**
 * Returns the singleton Socket.IO client.
 *
 * Because the custom server runs Next.js and Socket.IO on the same origin,
 * calling io() with no URL connects to window.location.origin automatically —
 * no NEXT_PUBLIC_SOCKET_URL env var needed.
 *
 * autoConnect: false means the socket only dials when .connect() is called,
 * which hooks do explicitly to avoid spurious connections during SSR hydration.
 */
/**
 * Returns null during SSR (window is undefined); returns the singleton socket
 * on the client.  Callers must guard against null before using the socket.
 */
export function getSocket(): AppSocket | null {
  if (typeof window === 'undefined') return null
  if (!instance) {
    instance = io({
      autoConnect: false,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1_000,
      reconnectionDelayMax: 5_000,
    })
  }
  return instance
}
