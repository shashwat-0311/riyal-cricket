'use client'

interface Step {
  id: string
  label: string
  sublabel: string
  done: boolean
  active: boolean
}

interface Props {
  steps: Step[]
}

export function PhaseProgressCard({ steps }: Props) {
  return (
    <div className="p-3 space-y-2">
      <span className="text-[10px] text-slate-600 font-semibold uppercase tracking-widest">
        Setup Progress
      </span>

      <div className="space-y-0">
        {steps.map((step, i) => {
          const isLast = i === steps.length - 1
          return (
            <div key={step.id} className="flex gap-2.5">
              {/* Stepper line */}
              <div className="flex flex-col items-center">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0
                  transition-all duration-300 text-[9px] font-bold
                  ${step.done
                    ? 'bg-emerald-500 text-white shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                    : step.active
                    ? 'bg-slate-800 text-emerald-400 ring-1 ring-emerald-500/50'
                    : 'bg-slate-900 text-slate-700 ring-1 ring-slate-800'
                  }`}>
                  {step.done ? (
                    <svg viewBox="0 0 12 12" fill="currentColor" className="w-2.5 h-2.5">
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 0 1 0 1.414l-5 5a1 1 0 0 1-1.414 0l-2-2a1 1 0 1 1 1.414-1.414L4.586 7.586l4.293-4.293a1 1 0 0 1 1.414 0Z" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>
                {!isLast && (
                  <div className={`w-px flex-1 my-0.5 min-h-[18px] transition-colors duration-300 ${
                    step.done ? 'bg-emerald-500/40' : 'bg-slate-800'
                  }`} />
                )}
              </div>

              {/* Step content */}
              <div className={`pb-3 pt-0.5 ${isLast ? '' : ''}`}>
                <div className={`text-[11px] font-semibold leading-tight transition-colors duration-300 ${
                  step.done ? 'text-emerald-400' :
                  step.active ? 'text-white' :
                  'text-slate-700'
                }`}>
                  {step.label}
                </div>
                <div className="text-[10px] text-slate-700 leading-tight mt-0.5">
                  {step.sublabel}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
