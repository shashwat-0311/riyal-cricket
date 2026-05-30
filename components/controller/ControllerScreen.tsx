'use client'

import { useControllerRoom } from '@/hooks/useControllerRoom'
import { useSocket } from '@/hooks/useSocket'
import { StatusBadge, socketStatusToVariant, roomStatusToVariant } from '@/components/ui/StatusBadge'
import { JoinRoom } from './JoinRoom'
import { MotionCapture } from './MotionCapture'

interface Props {
  /** Injected from the URL param when navigating to /controller/[roomCode] */
  initialRoomCode?: string
}

/**
 * Root controller component. Manages two states:
 *   1. Not yet in a room → shows JoinRoom
 *   2. In a room → shows MotionCapture + status header
 */
export function ControllerScreen({ initialRoomCode }: Props) {
  const { connectionStatus } = useSocket()
  const { roomState, joinStatus, joinError, joinRoom } = useControllerRoom(initialRoomCode)

  const isJoined = joinStatus === 'joined' && roomState !== null

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {isJoined ? (
        <>
          {/* ── Status header ── */}
          <header className="border-b border-slate-800 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🏏</span>
              <span className="font-semibold text-sm text-white">Cricket Controller</span>
            </div>

            <div className="flex items-center gap-2">
              {roomState && (
                <StatusBadge
                  variant={roomStatusToVariant(roomState.status)}
                  label={roomState.status === 'connected' ? 'Connected' : 'Waiting for game'}
                />
              )}
              <StatusBadge
                variant={socketStatusToVariant(connectionStatus)}
                label={connectionStatus === 'connected' ? 'Online' : 'Offline'}
              />
            </div>
          </header>

          {/* Room info bar */}
          {roomState && (
            <div className="flex items-center justify-between px-4 py-2 bg-slate-900/70 border-b border-slate-800">
              <span className="text-xs text-slate-500">
                Room: <span className="font-mono text-slate-300 tracking-widest">{roomState.roomCode}</span>
              </span>
              <span className="text-xs text-slate-600">
                {roomState.participantCount} participant{roomState.participantCount !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          {/* ── Motion capture ── */}
          <div className="flex-1 overflow-hidden">
            <MotionCapture roomCode={roomState!.roomCode} />
          </div>
        </>
      ) : (
        <JoinRoom
          joinStatus={joinStatus}
          joinError={
            connectionStatus === 'error'
              ? 'Cannot reach the game server. Make sure you are on the same Wi-Fi network.'
              : joinError
          }
          onJoin={joinRoom}
        />
      )}
    </div>
  )
}
