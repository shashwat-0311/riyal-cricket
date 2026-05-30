import type { SensorFrame } from './sensor'
import type { RoomState } from './room'

// ─── Payloads ────────────────────────────────────────────────────────────────

export interface RoomCreateResponse {
  success: boolean
  roomId?: string
  roomCode?: string
  error?: string
}

export interface RoomJoinRequest {
  roomCode: string
}

export interface RoomJoinResponse {
  success: boolean
  roomId?: string
  roomCode?: string
  error?: string
}

export interface ControllerDisconnectedPayload {
  socketId: string
  reason: string
}

export interface ErrorPayload {
  code: string
  message: string
}

// ─── Typed Socket.IO generics ─────────────────────────────────────────────────
//
// Socket.IO TypeScript generics:
//   Server<ListenEvents, EmitEvents>  → server listens for ListenEvents, emits EmitEvents
//   Client socket<EmitEvents, ListenEvents> → BUT the io() constructor on the client uses:
//     io<ServerToClientEvents, ClientToServerEvents>
//
// Mnemonics: ClientToServer = what the CLIENT sends; ServerToClient = what the SERVER sends.

export interface ClientToServerEvents {
  'room:create': (callback: (res: RoomCreateResponse) => void) => void
  'room:join': (
    data: RoomJoinRequest,
    callback: (res: RoomJoinResponse) => void,
  ) => void
  'room:leave': () => void
  'sensor:data': (frame: SensorFrame) => void
  ping: (clientTs: number, callback: (serverTs: number) => void) => void
}

export interface ServerToClientEvents {
  'room:state-update': (state: RoomState) => void
  'room:controller-connected': (payload: { socketId: string; connectedAt: number }) => void
  'room:controller-disconnected': (payload: ControllerDisconnectedPayload) => void
  'sensor:data': (frame: SensorFrame) => void
  error: (payload: ErrorPayload) => void
}

// Inter-server events (required by Socket.IO types even if unused)
export type InterServerEvents = Record<string, never>

// Per-socket data stored server-side
export interface SocketData {
  roomId?: string
  role?: 'game' | 'controller'
}
