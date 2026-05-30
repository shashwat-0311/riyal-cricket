'use client'

import { useState } from 'react'
import type { JoinStatus } from '@/hooks/useControllerRoom'

interface Props {
  joinStatus: JoinStatus
  joinError: string | null
  onJoin: (code: string) => void
}

export function JoinRoom({ joinStatus, joinError, onJoin }: Props) {
  const [code, setCode] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = code.trim().toUpperCase()
    if (trimmed.length === 6) onJoin(trimmed)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    // Allow only alphanumeric, cap at 6 chars
    const value = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 6)
    setCode(value)
  }

  const isPending = joinStatus === 'joining'
  const isReady = code.trim().length === 6

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center space-y-2">
          <span className="text-5xl">🏏</span>
          <h1 className="text-2xl font-bold text-white">Cricket Controller</h1>
          <p className="text-slate-500 text-sm">Enter the room code shown on the game screen</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="roomCode" className="text-xs text-slate-500 uppercase tracking-widest">
              Room Code
            </label>
            <input
              id="roomCode"
              type="text"
              value={code}
              onChange={handleChange}
              placeholder="A B C 1 2 3"
              disabled={isPending}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-4
                text-center text-3xl font-mono font-bold tracking-[0.4em] text-white
                placeholder:text-slate-700 placeholder:text-xl placeholder:tracking-widest
                focus:outline-none focus:ring-2 focus:ring-pitch-500 focus:border-transparent
                disabled:opacity-50 uppercase"
            />
          </div>

          {joinError && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3">
              <p className="text-sm text-red-400 text-center">{joinError}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={!isReady || isPending}
            className="w-full py-4 rounded-xl bg-pitch-600 hover:bg-pitch-500 active:bg-pitch-700
              disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-lg
              transition-colors focus:outline-none focus:ring-2 focus:ring-pitch-400"
          >
            {isPending ? (
              <span className="flex items-center justify-center gap-2">
                <SpinnerIcon />
                Joining…
              </span>
            ) : (
              'Join Room'
            )}
          </button>
        </form>

        <p className="text-xs text-slate-700 text-center">
          Or scan the QR code on the game screen to join automatically.
        </p>
      </div>
    </div>
  )
}

function SpinnerIcon() {
  return (
    <svg
      className="animate-spin w-5 h-5"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}
