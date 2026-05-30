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
export function getSocket(): AppSocket {
  if (typeof window === 'undefined') {
    throw new Error('[socket] getSocket() called on the server. Import only in client components.')
  }
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
