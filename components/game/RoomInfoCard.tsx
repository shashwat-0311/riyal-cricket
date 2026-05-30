'use client'

import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import type { RoomState } from '@/types/room'
import type { ConnectionStatus } from '@/hooks/useSocket'

interface NetworkInfo { primaryIp: string; port: number }

interface Props {
  roomState: RoomState | null
  socketStatus: ConnectionStatus
  isCreating: boolean
  error: string | null
  onCreateRoom: () => void
  collapsed?: boolean
}

export function RoomInfoCard({
  roomState, socketStatus, isCreating, error, onCreateRoom, collapsed = false,
}: Props) {
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null)
  const [copied, setCopied] = useState(false)
  const [showQR, setShowQR] = useState(true)

  useEffect(() => {
    fetch('/api/network-info')
      .then(r => r.json())
      .then(setNetworkInfo)
      .catch(() => setNetworkInfo({ primaryIp: typeof window !== 'undefined' ? window.location.hostname : 'localhost', port: 3000 }))
  }, [])

  const controllerUrl = networkInfo && roomState
    ? `http://${networkInfo.primaryIp}:${networkInfo.port}/controller/${roomState.roomCode}`
    : ''

  async function copyCode() {
    if (!roomState) return
    await navigator.clipboard.writeText(roomState.roomCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-2 py-3">
        <button onClick={onCreateRoom} disabled={isCreating || !!roomState}
          className="w-9 h-9 rounded-xl bg-emerald-600/20 text-emerald-400
            flex items-center justify-center hover:bg-emerald-600/30 transition-colors"
          title={roomState ? roomState.roomCode : 'Create Room'}>
          <RoomIcon />
        </button>
      </div>
    )
  }

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-slate-600 font-semibold uppercase tracking-widest">Room</span>
        <div className={`flex items-center gap-1 text-[10px] font-semibold ${socketStatus === 'connected' ? 'text-emerald-400' : 'text-slate-600'}`}>
          <span className={`w-1 h-1 rounded-full bg-current ${socketStatus === 'connected' ? 'animate-pulse' : ''}`} />
          {socketStatus === 'connected' ? 'Online' : 'Offline'}
        </div>
      </div>

      {error && (
        <p className="text-[11px] text-red-400 bg-red-500/10 rounded-lg px-2.5 py-2">{error}</p>
      )}

      {!roomState ? (
        <button
          onClick={onCreateRoom}
          disabled={isCreating || socketStatus !== 'connected'}
          className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40
            disabled:cursor-not-allowed text-white font-bold text-xs tracking-wide transition-colors"
        >
          {isCreating ? 'Creating…' : 'Create Game Room'}
        </button>
      ) : (
        <div className="space-y-2.5">
          {/* Room code row */}
          <div className="flex items-center justify-between bg-white/[0.03] rounded-xl px-3 py-2.5 border border-white/[0.05]">
            <span className="font-mono text-base font-black tracking-[0.25em] text-white">
              {roomState.roomCode}
            </span>
            <button onClick={copyCode}
              className="text-slate-500 hover:text-emerald-400 transition-colors p-1">
              {copied ? <CheckIcon /> : <CopyIcon />}
            </button>
          </div>

          {/* QR toggle */}
          <button
            onClick={() => setShowQR(v => !v)}
            className="w-full text-[10px] text-slate-600 hover:text-slate-400 transition-colors
              flex items-center justify-center gap-1.5"
          >
            <QrIcon />
            {showQR ? 'Hide QR Code' : 'Show QR Code'}
          </button>

          {/* QR code */}
          {showQR && controllerUrl && (
            <div className="flex flex-col items-center gap-2">
              <div className="p-2.5 bg-white rounded-xl">
                <QRCodeSVG value={controllerUrl} size={160} marginSize={0} level="M" />
              </div>
              <p className="text-[10px] text-slate-700 text-center leading-relaxed max-w-[200px]">
                Scan with phone camera to join as controller
              </p>
            </div>
          )}

          {/* Participants */}
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-slate-600">Participants</span>
            <div className="flex items-center gap-1">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className={`w-1.5 h-1.5 rounded-full ${
                  i < roomState.participantCount ? 'bg-emerald-400' : 'bg-slate-700'
                }`} />
              ))}
              <span className="text-slate-500 ml-1">{roomState.participantCount}/2</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function RoomIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path d="M11.983 1.907a.75.75 0 0 0-1.292-.657l-8.5 9.5A.75.75 0 0 0 2.75 12h6.572l-1.305 6.093a.75.75 0 0 0 1.292.657l8.5-9.5A.75.75 0 0 0 17.25 8h-6.572l1.305-6.093Z" />
    </svg>
  )
}

function QrIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
      <path fillRule="evenodd" d="M2 2h4v4H2V2Zm.5 1.5v1h3v-1h-3Zm7 0V2h4v4h-4V3.5Zm.5 0v1h3v-1h-3ZM2 10h4v4H2v-4Zm.5 1.5v1h3v-1h-3ZM10 10h1v1h-1v-1Zm2 0h1v1h-1v-1Zm1 1h1v1h-1v-1Zm-2 1h1v1h-1v-1Zm1 1h1v1h-1v-1Zm1 1h1v1h-1v-1Zm-3-3h1v1h-1v-1Z" />
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
      <path d="M5.5 3.5A1.5 1.5 0 0 1 7 2h2.879a1.5 1.5 0 0 1 1.06.44l2.122 2.12a1.5 1.5 0 0 1 .439 1.061V9.5A1.5 1.5 0 0 1 12 11V9.5a3 3 0 0 0-.879-2.121L9 5.257A3 3 0 0 0 6.879 4.5H5.5v-1Z" />
      <path d="M4 5a1.5 1.5 0 0 0-1.5 1.5v6A1.5 1.5 0 0 0 4 14h5a1.5 1.5 0 0 0 1.5-1.5V8.621a1.5 1.5 0 0 0-.44-1.06L7.94 5.439A1.5 1.5 0 0 0 6.878 5H4Z" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 text-emerald-400">
      <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" />
    </svg>
  )
}
