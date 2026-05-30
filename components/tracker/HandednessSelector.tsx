'use client'

import type { Handedness } from '@/types/pose'

interface Props {
  selected: Handedness
  onSelect: (h: Handedness) => void
}

const OPTIONS: { value: Handedness; label: string; description: string; icon: string }[] = [
  {
    value: 'right',
    label: 'Right-handed',
    description: 'Right hand holds the bat grip (standard)',
    icon: '🏏',
  },
  {
    value: 'left',
    label: 'Left-handed',
    description: 'Left hand holds the bat grip',
    icon: '🪃',
  },
]

export function HandednessSelector({ selected, onSelect }: Props) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-400 text-center">
        Which hand holds the bat?
      </p>
      <div className="grid grid-cols-2 gap-3">
        {OPTIONS.map(opt => {
          const isActive = selected === opt.value
          return (
            <button
              key={opt.value}
              onClick={() => onSelect(opt.value)}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-150
                ${isActive
                  ? 'border-pitch-500 bg-pitch-900/30 text-white'
                  : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600 hover:bg-slate-800'
                }`}
            >
              <span className="text-3xl">{opt.icon}</span>
              <span className="text-sm font-semibold">{opt.label}</span>
              <span className="text-xs text-center leading-tight opacity-70">
                {opt.description}
              </span>
              {isActive && (
                <span className="w-2 h-2 rounded-full bg-pitch-400 mt-1" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
