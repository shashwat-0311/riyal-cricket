'use client'

import { useEffect, useState } from 'react'
import { QRDisplay } from '@/components/ui/QRDisplay'
import { StatusBadge, socketStatusToVariant } from '@/components/ui/StatusBadge'
import type { ConnectionStatus } from '@/hooks/useSocket'
import type { RoomState } from '@/types/room'

interface NetworkInfo {
  localIps: string[]
  primaryIp: string
  port: number
}

interface Props {
  roomState: RoomState | null
  socketStatus: ConnectionStatus
  isCreating: boolean
  error: string | null
  onCreateRoom: () => void
}

export function RoomPanel({ roomState, socketStatus, isCreating, error, onCreateRoom }: Props) {
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null)
  const [controllerUrl, setControllerUrl] = useState<string>('')

  // Fetch the server's LAN IP so the QR code works from the phone
  useEffect(() => {
    fetch('/api/network-info')
      .then(r => r.json())
      .then((data: NetworkInfo) => setNetworkInfo(data))
      .catch(() => {
        // Fallback: use window.location (works if accessing via IP already)
        if (typeof window !== 'undefined') {
          setNetworkInfo({
            localIps: [window.location.hostname],
            primaryIp: window.location.hostname,
            port: parseInt(window.location.port || '3000', 10),
          })
        }
      })
  }, [])

  useEffect(() => {
    if (networkInfo && roomState) {
      const { primaryIp, port } = networkInfo
      setControllerUrl(`http://${primaryIp}:${port}/controller/${roomState.roomCode}`)
    }
  }, [networkInfo, roomState])

  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest">
          Room
        </h2>
        <StatusBadge
          variant={socketStatusToVariant(socketStatus)}
          label={
            socketStatus === 'connected'
              ? 'Server Connected'
              : socketStatus === 'connecting'
              ? 'Connecting…'
              : socketStatus === 'reconnecting'
              ? 'Reconnecting…'
              : 'Disconnected'
          }
        />
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {!roomState ? (
        <div className="flex flex-col items-center gap-4 py-6">
          <p className="text-slate-500 text-sm text-center">
            Create a room to generate a QR code for your phone controller.
          </p>
          <button
            onClick={onCreateRoom}
            disabled={isCreating || socketStatus !== 'connected'}
            className="px-6 py-2.5 rounded-lg bg-pitch-600 hover:bg-pitch-500 disabled:opacity-40
              disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
          >
            {isCreating ? 'Creating…' : 'Create Game Room'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {controllerUrl ? (
            <QRDisplay url={controllerUrl} roomCode={roomState.roomCode} />
          ) : (
            <div className="flex flex-col items-center gap-2 py-4">
              <p className="text-xs text-slate-500 uppercase tracking-widest">Room Code</p>
              <span className="font-mono text-3xl font-bold tracking-[0.3em] text-white">
                {roomState.roomCode}
              </span>
              <p className="text-xs text-slate-600">Fetching network address…</p>
            </div>
          )}

          <div className="pt-2 border-t border-slate-700/50 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Participants: {roomState.participantCount}
            </span>
            <button
              onClick={onCreateRoom}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors underline"
            >
              New Room
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
