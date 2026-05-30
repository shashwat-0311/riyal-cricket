'use client'

interface OnboardingStep {
  id: string
  icon: string
  label: string
  sublabel: string
  done: boolean
  active: boolean
}

interface Props {
  steps: OnboardingStep[]
}

export function OnboardingBar({ steps }: Props) {
  const allDone = steps.every(s => s.done)

  return (
    <div className="h-16 shrink-0 border-t border-white/[0.04] bg-slate-950/90 backdrop-blur-md
      flex items-center px-4 gap-0">

      {/* Steps */}
      <div className="flex items-center flex-1 gap-0">
        {steps.map((step, i) => {
          const isLast = i === steps.length - 1

          return (
            <div key={step.id} className="flex items-center flex-1">
              {/* Step */}
              <div className={`flex items-center gap-2.5 flex-1 px-3 py-2 rounded-xl
                transition-all duration-300
                ${step.done
                  ? 'opacity-60'
                  : step.active
                  ? 'bg-emerald-500/8 ring-1 ring-emerald-500/20'
                  : 'opacity-40'
                }`}>
                {/* Status circle */}
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0
                  text-sm transition-all duration-300
                  ${step.done
                    ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                    : step.active
                    ? 'bg-slate-800 ring-2 ring-emerald-500/60'
                    : 'bg-slate-900 ring-1 ring-slate-800'
                  }`}>
                  {step.done ? (
                    <svg viewBox="0 0 16 16" fill="white" className="w-3.5 h-3.5">
                      <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" />
                    </svg>
                  ) : (
                    <span className="text-sm">{step.icon}</span>
                  )}
                </div>

                {/* Text */}
                <div>
                  <div className={`text-xs font-semibold leading-tight ${
                    step.done ? 'text-emerald-400' :
                    step.active ? 'text-white' : 'text-slate-700'
                  }`}>
                    {step.label}
                  </div>
                  <div className={`text-[10px] leading-tight mt-0.5 ${
                    step.active ? 'text-slate-500' : 'text-slate-700'
                  }`}>
                    {step.sublabel}
                  </div>
                </div>
              </div>

              {/* Connector */}
              {!isLast && (
                <div className="flex items-center px-1">
                  <div className={`w-8 h-px transition-colors duration-500 ${
                    step.done ? 'bg-emerald-500/40' : 'bg-slate-800'
                  }`} />
                  <svg viewBox="0 0 8 8" className={`w-2 h-2 shrink-0 transition-colors duration-500 ${
                    step.done ? 'text-emerald-500/40' : 'text-slate-800'
                  }`} fill="currentColor">
                    <path d="M2 0L6 4L2 8V0Z" />
                  </svg>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Ready badge */}
      {allDone && (
        <div className="ml-4 flex items-center gap-2 px-4 py-2 rounded-xl
          bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)] animate-fade-in">
          <span className="text-xs font-black text-white tracking-wider uppercase">
            Ready to Play
          </span>
          <span className="text-sm">🏏</span>
        </div>
      )}
    </div>
  )
}
