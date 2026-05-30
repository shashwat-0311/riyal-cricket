import type { Server, Socket } from 'socket.io'
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from '../types/socket'
import { roomManager } from './roomManager'
import { roomToState } from '../types/room'

type AppServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>

type AppSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>

export function setupSocketHandlers(io: AppServer): void {
  io.on('connection', (socket: AppSocket) => {
    console.log(`[socket] connected: ${socket.id}`)

    // ── room:create ───────────────────────────────────────────────────────────
    socket.on('room:create', (callback) => {
      // One game screen per socket — leave any existing room first
      const existingRoom = roomManager.getRoomBySocket(socket.id)
      if (existingRoom) {
        roomManager.leaveRoom(socket.id)
        socket.leave(existingRoom.id)
      }

      const room = roomManager.createRoom(socket.id)
      socket.data.roomId = room.id
      socket.data.role = 'game'
      socket.join(room.id)

      console.log(`[room] created ${room.code} by ${socket.id}`)

      callback({ success: true, roomId: room.id, roomCode: room.code })

      socket.emit('room:state-update', roomToState(room))
    })

    // ── room:join ─────────────────────────────────────────────────────────────
    socket.on('room:join', (data, callback) => {
      const result = roomManager.joinRoom(data.roomCode, socket.id)

      if ('error' in result) {
        console.warn(`[room] join failed for code ${data.roomCode}: ${result.error}`)
        callback({ success: false, error: result.error })
        return
      }

      const { room } = result
      socket.data.roomId = room.id
      socket.data.role = 'controller'
      socket.join(room.id)

      console.log(`[room] controller ${socket.id} joined ${room.code}`)

      callback({ success: true, roomId: room.id, roomCode: room.code })

      // Tell the controller its current room state
      socket.emit('room:state-update', roomToState(room))

      // Notify the game screen
      const gameSocketId = roomManager.getGameSocketId(room.id)
      if (gameSocketId) {
        io.to(gameSocketId).emit('room:controller-connected', {
          socketId: socket.id,
          connectedAt: Date.now(),
        })
        io.to(gameSocketId).emit('room:state-update', roomToState(room))
      }
    })

    // ── room:leave ────────────────────────────────────────────────────────────
    socket.on('room:leave', () => {
      handleDisconnect(socket, io, 'voluntary')
    })

    // ── sensor:data ───────────────────────────────────────────────────────────
    // Controller sends frames; server forwards directly to the game screen socket.
    // Using targeted delivery instead of room broadcast to avoid echo on the controller.
    socket.on('sensor:data', (frame) => {
      const roomId = socket.data.roomId
      if (!roomId || socket.data.role !== 'controller') return

      const gameSocketId = roomManager.getGameSocketId(roomId)
      if (!gameSocketId) return

      io.to(gameSocketId).emit('sensor:data', frame)
    })

    // ── ping (RTT latency measurement) ────────────────────────────────────────
    socket.on('ping', (clientTs, callback) => {
      callback(Date.now())
    })

    // ── disconnect ────────────────────────────────────────────────────────────
    socket.on('disconnect', (reason) => {
      console.log(`[socket] disconnected: ${socket.id} (${reason})`)
      handleDisconnect(socket, io, reason)
    })
  })

  // Purge expired empty rooms every 15 minutes
  setInterval(() => {
    const removed = roomManager.purgeExpired()
    if (removed > 0) console.log(`[room] purged ${removed} expired rooms`)
  }, 15 * 60 * 1_000)
}

function handleDisconnect(socket: AppSocket, io: AppServer, reason: string): void {
  const result = roomManager.removeSocket(socket.id)
  if (!result) return

  const { room, disconnectedRole, remainingSocketIds } = result
  socket.leave(room.id)

  if (remainingSocketIds.length === 0) return

  if (disconnectedRole === 'controller') {
    // Notify game screen that the controller dropped
    for (const id of remainingSocketIds) {
      io.to(id).emit('room:controller-disconnected', {
        socketId: socket.id,
        reason,
      })
      // The room still exists (game screen is still there)
      const updatedRoom = roomManager.getRoomById(room.id)
      if (updatedRoom) {
        io.to(id).emit('room:state-update', roomToState(updatedRoom))
      } else {
        // Room was deleted (shouldn't happen here but handle it)
        io.to(id).emit('room:state-update', {
          roomId: room.id,
          roomCode: room.code,
          status: 'waiting',
          controllerConnected: false,
          participantCount: 1,
        })
      }
    }
  } else if (disconnectedRole === 'game') {
    // Game screen closed — tell controller so it can show "host disconnected"
    for (const id of remainingSocketIds) {
      const updatedRoom = roomManager.getRoomById(room.id)
      if (updatedRoom) {
        io.to(id).emit('room:state-update', roomToState(updatedRoom))
      }
    }
  }
}
