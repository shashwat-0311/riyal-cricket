import { randomBytes } from 'crypto'
import type { Room, RoomParticipant, DeviceRole } from '../types/room'

const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // omit 0/O, 1/I
const ROOM_CODE_LENGTH = 6
const ROOM_TTL_MS = 60 * 60 * 1_000 // 1 hour

function generateId(length: number): string {
  return randomBytes(length).toString('base64url').slice(0, length)
}

function generateCode(): string {
  let code = ''
  const bytes = randomBytes(ROOM_CODE_LENGTH)
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += ROOM_CODE_ALPHABET[bytes[i] % ROOM_CODE_ALPHABET.length]
  }
  return code
}

class RoomManager {
  /** roomId → Room */
  private rooms = new Map<string, Room>()
  /** roomCode → roomId */
  private codeIndex = new Map<string, string>()
  /** socketId → roomId */
  private socketIndex = new Map<string, string>()

  // ─── Create ────────────────────────────────────────────────────────────────

  createRoom(gameSocketId: string): Room {
    let code = generateCode()
    while (this.codeIndex.has(code)) code = generateCode()

    const room: Room = {
      id: generateId(12),
      code,
      createdAt: Date.now(),
      participants: [{ socketId: gameSocketId, role: 'game', connectedAt: Date.now() }],
      status: 'waiting',
    }

    this.rooms.set(room.id, room)
    this.codeIndex.set(code, room.id)
    this.socketIndex.set(gameSocketId, room.id)

    return room
  }

  // ─── Join ──────────────────────────────────────────────────────────────────

  joinRoom(
    roomCode: string,
    controllerSocketId: string,
  ): { room: Room } | { error: string } {
    const roomId = this.codeIndex.get(roomCode.toUpperCase())
    if (!roomId) return { error: 'Room not found. Check the code and try again.' }

    const room = this.rooms.get(roomId)!
    if (!room) return { error: 'Room has expired.' }

    const alreadyJoined = room.participants.find(p => p.socketId === controllerSocketId)
    if (alreadyJoined) return { error: 'Already in this room.' }

    const existingController = room.participants.find(p => p.role === 'controller')
    if (existingController) return { error: 'Room already has a controller.' }

    const participant: RoomParticipant = {
      socketId: controllerSocketId,
      role: 'controller',
      connectedAt: Date.now(),
    }
    room.participants.push(participant)
    room.status = 'connected'
    this.socketIndex.set(controllerSocketId, roomId)

    return { room }
  }

  // ─── Disconnect ────────────────────────────────────────────────────────────

  /**
   * Remove a socket from its room. Returns the updated room and the role
   * that disconnected, so the caller can notify the other party.
   */
  removeSocket(socketId: string): {
    room: Room
    disconnectedRole: DeviceRole
    remainingSocketIds: string[]
  } | null {
    const roomId = this.socketIndex.get(socketId)
    if (!roomId) return null

    const room = this.rooms.get(roomId)
    if (!room) return null

    const index = room.participants.findIndex(p => p.socketId === socketId)
    if (index === -1) return null

    const [removed] = room.participants.splice(index, 1)
    this.socketIndex.delete(socketId)

    const remaining = room.participants.map(p => p.socketId)

    // Update room status
    const hasGame = room.participants.some(p => p.role === 'game')
    const hasController = room.participants.some(p => p.role === 'controller')

    if (!hasGame && !hasController) {
      this.rooms.delete(roomId)
      this.codeIndex.delete(room.code)
    } else {
      room.status = hasGame && hasController ? 'connected' : 'waiting'
    }

    return { room, disconnectedRole: removed.role, remainingSocketIds: remaining }
  }

  // ─── Leave ─────────────────────────────────────────────────────────────────

  leaveRoom(socketId: string): void {
    this.removeSocket(socketId)
  }

  // ─── Lookups ───────────────────────────────────────────────────────────────

  getRoomBySocket(socketId: string): Room | null {
    const roomId = this.socketIndex.get(socketId)
    return roomId ? (this.rooms.get(roomId) ?? null) : null
  }

  getRoomByCode(code: string): Room | null {
    const roomId = this.codeIndex.get(code.toUpperCase())
    return roomId ? (this.rooms.get(roomId) ?? null) : null
  }

  getRoomById(id: string): Room | null {
    return this.rooms.get(id) ?? null
  }

  getGameSocketId(roomId: string): string | null {
    return this.rooms.get(roomId)?.participants.find(p => p.role === 'game')?.socketId ?? null
  }

  getControllerSocketId(roomId: string): string | null {
    return this.rooms.get(roomId)?.participants.find(p => p.role === 'controller')?.socketId ?? null
  }

  // ─── Maintenance ───────────────────────────────────────────────────────────

  /** Called on a timer to remove empty, expired rooms */
  purgeExpired(): number {
    const cutoff = Date.now() - ROOM_TTL_MS
    let count = 0
    for (const [id, room] of Array.from(this.rooms)) {
      if (room.createdAt < cutoff && room.participants.length === 0) {
        this.rooms.delete(id)
        this.codeIndex.delete(room.code)
        count++
      }
    }
    return count
  }

  get roomCount(): number {
    return this.rooms.size
  }
}

// Single instance shared across all socket connections
export const roomManager = new RoomManager()
