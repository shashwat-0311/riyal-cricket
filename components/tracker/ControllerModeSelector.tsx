'use client'

import type { ControllerMode } from '@/types/pose'

interface Props {
  selected: ControllerMode
  onSelect: (m: ControllerMode) => void
}

const OPTIONS: { value: ControllerMode; label: string; icon: string }[] = [
  { value: 'hand',  label: 'Phone in Hand', icon: '📱' },
  { value: 'stick', label: 'Selfie Stick',  icon: '🥢' },
]

export function ControllerModeSelector({ selected, onSelect }: Props) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] text-slate-400 text-center">How are you holding the phone?</p>
      <div className="grid grid-cols-2 gap-2">
        {OPTIONS.map(opt => {
          const isActive = selected === opt.value
          return (
            <button
              key={opt.value}
              onClick={() => onSelect(opt.value)}
              className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all duration-150
                ${isActive
                  ? 'border-pitch-500 bg-pitch-900/30 text-white'
                  : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600 hover:bg-slate-800'
                }`}
            >
              <span className="text-2xl">{opt.icon}</span>
              <span className="text-[11px] font-semibold">{opt.label}</span>
              {isActive && <span className="w-1.5 h-1.5 rounded-full bg-pitch-400" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
