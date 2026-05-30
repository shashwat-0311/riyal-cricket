import Link from 'next/link'

/**
 * Landing page — lets users choose their role.
 * Laptop users click "Open Game Screen"; phone users click "Join as Controller".
 */
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-10 text-center">
        {/* Hero */}
        <div className="space-y-3">
          <div className="text-7xl">🏏</div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight">Cricket Game</h1>
          <p className="text-slate-400 text-base leading-relaxed">
            Use your smartphone as a bat controller. Your laptop displays the field.
          </p>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-slate-800" />
          <span className="text-slate-600 text-xs uppercase tracking-widest">Choose your device</span>
          <div className="flex-1 h-px bg-slate-800" />
        </div>

        {/* Role cards */}
        <div className="grid gap-4">
          <Link
            href="/game"
            className="group flex items-center gap-4 rounded-2xl border border-slate-700 bg-slate-900
              hover:border-pitch-600 hover:bg-slate-800/80 transition-all duration-200 p-5 text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-pitch-900/60 flex items-center justify-center text-2xl shrink-0">
              💻
            </div>
            <div className="flex-1">
              <p className="font-semibold text-white group-hover:text-pitch-400 transition-colors">
                Open Game Screen
              </p>
              <p className="text-sm text-slate-500 mt-0.5">
                Laptop or desktop — creates a room and shows the QR code
              </p>
            </div>
            <ArrowIcon />
          </Link>

          <Link
            href="/controller"
            className="group flex items-center gap-4 rounded-2xl border border-slate-700 bg-slate-900
              hover:border-blue-600 hover:bg-slate-800/80 transition-all duration-200 p-5 text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-900/40 flex items-center justify-center text-2xl shrink-0">
              📱
            </div>
            <div className="flex-1">
              <p className="font-semibold text-white group-hover:text-blue-400 transition-colors">
                Join as Controller
              </p>
              <p className="text-sm text-slate-500 mt-0.5">
                Smartphone — enter the room code and swing your phone as a bat
              </p>
            </div>
            <ArrowIcon />
          </Link>
        </div>

        {/* Tech stack note */}
        <p className="text-xs text-slate-700">
          Next.js 15 · Socket.IO · React Three Fiber · TypeScript
        </p>
      </div>
    </div>
  )
}

function ArrowIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="w-5 h-5 text-slate-600 group-hover:text-slate-400 transition-colors shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  )
}
