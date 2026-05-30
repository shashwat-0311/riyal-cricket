export type DeviceRole = 'game' | 'controller'

export type RoomStatus =
  | 'waiting'       // Room created, no controller yet
  | 'connected'     // Game screen + controller both present
  | 'disconnected'  // One party dropped; room still alive
  | 'error'

export interface RoomParticipant {
  socketId: string
  role: DeviceRole
  connectedAt: number
}

export interface Room {
  id: string
  code: string
  createdAt: number
  participants: RoomParticipant[]
  status: RoomStatus
}

/** Serialisable subset sent to clients via socket events */
export interface RoomState {
  roomId: string
  roomCode: string
  status: RoomStatus
  controllerConnected: boolean
  participantCount: number
}

export function roomToState(room: Room): RoomState {
  return {
    roomId: room.id,
    roomCode: room.code,
    status: room.status,
    controllerConnected: room.participants.some(p => p.role === 'controller'),
    participantCount: room.participants.length,
  }
}
