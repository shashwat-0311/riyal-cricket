'use client'

import { useEffect } from 'react'
import { useMotionSensor } from '@/hooks/useMotionSensor'
import { useSocket } from '@/hooks/useSocket'

import type { SensorFrame } from '@/types/sensor'

interface Props {
  roomCode: string
}

export function MotionCapture({ roomCode }: Props) {
  const { socket, isConnected } = useSocket()
  const sensor = useMotionSensor()

  // Once permission is granted, start capture and send frames
  useEffect(() => {
    if (sensor.permission === 'granted' && !sensor.isCapturing && isConnected) {
      sensor.startCapture(roomCode, (frame: SensorFrame) => {
        socket.emit('sensor:data', frame)
      })
    }
  }, [sensor, sensor.permission, sensor.isCapturing, isConnected, socket, roomCode])

  return (
    <div className="flex flex-col h-full">
      {/* Permission gate */}
      {(sensor.permission === 'unknown' || sensor.permission === 'requesting') && (
        <PermissionGate
          isRequesting={sensor.permission === 'requesting'}
          onRequest={sensor.requestPermission}
        />
      )}

      {sensor.permission === 'denied' && <DeniedState />}
      {sensor.permission === 'unavailable' && <UnavailableState />}
      {sensor.permission === 'insecure' && <InsecureState />}

      {(sensor.permission === 'granted') && (
        <ActiveCapture sensor={sensor} isConnected={isConnected} />
      )}
    </div>
  )
}

// ─── Sub-views ────────────────────────────────────────────────────────────────

function PermissionGate({
  isRequesting,
  onRequest,
}: {
  isRequesting: boolean
  onRequest: () => Promise<void>
}) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-6 p-6 text-center">
      <span className="text-6xl">📱</span>
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-white">Motion Permission Required</h2>
        <p className="text-slate-400 text-sm max-w-xs">
          This app needs access to your device&apos;s gyroscope and accelerometer to simulate a
          cricket bat swing.
        </p>
      </div>
      <button
        onClick={onRequest}
        disabled={isRequesting}
        className="px-8 py-4 rounded-xl bg-pitch-600 hover:bg-pitch-500 active:bg-pitch-700
          disabled:opacity-50 text-white font-bold text-lg transition-colors w-full max-w-xs"
      >
        {isRequesting ? 'Requesting…' : 'Enable Motion Sensors'}
      </button>
      <p className="text-xs text-slate-600">
        On iOS: tap the button above when prompted by Safari
      </p>
    </div>
  )
}

function DeniedState() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-4 p-6 text-center">
      <span className="text-5xl">🚫</span>
      <h2 className="text-xl font-bold text-white">Permission Denied</h2>
      <p className="text-slate-400 text-sm max-w-xs">
        Motion sensor access was denied. On iOS, go to Settings → Safari → Motion &amp; Orientation
        Access and enable it, then reload this page.
      </p>
    </div>
  )
}

function UnavailableState() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-4 p-6 text-center">
      <span className="text-5xl">⚠️</span>
      <h2 className="text-xl font-bold text-white">Sensors Not Available</h2>
      <p className="text-slate-400 text-sm max-w-xs">
        Your device does not expose motion sensor events. Try opening this page on a smartphone.
      </p>
    </div>
  )
}

function InsecureState() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-6 p-6 text-center">
      <span className="text-5xl">🔒</span>
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-white">HTTPS Required</h2>
        <p className="text-slate-400 text-sm max-w-xs">
          Chrome and Safari block motion sensors on plain <span className="font-mono text-slate-300">http://</span>.
          The page must be served over HTTPS.
        </p>
      </div>

      <div className="w-full max-w-xs rounded-xl border border-slate-700 bg-slate-900 p-4 text-left space-y-3">
        <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest">
          Quickest fix — ngrok tunnel
        </p>
        <div className="space-y-1.5 font-mono text-xs text-slate-300">
          <p><span className="text-slate-500 select-none">1  </span>npm install -g ngrok</p>
          <p><span className="text-slate-500 select-none">2  </span>ngrok http 3000</p>
          <p><span className="text-slate-500 select-none">3  </span>Use the <span className="text-pitch-400">https://…ngrok-free.app</span> URL</p>
        </div>
      </div>

      <div className="w-full max-w-xs rounded-xl border border-slate-700 bg-slate-900 p-4 text-left space-y-3">
        <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest">
          Alternative — mkcert (local cert)
        </p>
        <div className="space-y-1.5 font-mono text-xs text-slate-300">
          <p><span className="text-slate-500 select-none">1  </span>brew install mkcert</p>
          <p><span className="text-slate-500 select-none">2  </span>mkcert -install</p>
          <p><span className="text-slate-500 select-none">3  </span>mkcert localhost 192.168.x.x</p>
          <p><span className="text-slate-500 select-none">4  </span>Add cert paths to .env.local</p>
        </div>
      </div>

      <p className="text-xs text-slate-600">
        After switching to HTTPS, reload this page on your phone.
      </p>
    </div>
  )
}

function ActiveCapture({
  sensor,
  isConnected,
}: {
  sensor: ReturnType<typeof useMotionSensor>
  isConnected: boolean
}) {
  const { orientation, motion, isCapturing } = sensor

  function fmt(v: number | null, d = 1) {
    return v === null ? '—' : v.toFixed(d)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Status bar */}
      <div
        className={`flex items-center justify-center gap-2 py-2 text-sm font-semibold
          ${isConnected && isCapturing
            ? 'bg-pitch-900/50 text-pitch-400'
            : 'bg-slate-800 text-slate-500'
          }`}
      >
        <span
          className={`w-2 h-2 rounded-full ${
            isConnected && isCapturing ? 'bg-pitch-400 animate-pulse' : 'bg-slate-600'
          }`}
        />
        {isConnected && isCapturing ? 'Sending sensor data' : 'Not sending — check connection'}
      </div>

      {/* Sensor values */}
      <div className="flex-1 p-5 space-y-6 overflow-auto">
        {/* Orientation visualizer */}
        <OrientationVisualizer
          beta={orientation.beta}
          gamma={orientation.gamma}
        />

        {/* Orientation */}
        <Section title="Orientation">
          <Row label="Alpha (Z)" value={fmt(orientation.alpha)} unit="°" />
          <Row label="Beta (X)" value={fmt(orientation.beta)} unit="°" />
          <Row label="Gamma (Y)" value={fmt(orientation.gamma)} unit="°" />
        </Section>

        {/* Acceleration */}
        <Section title="Acceleration">
          <Row label="X" value={fmt(motion.acceleration.x)} unit="m/s²" />
          <Row label="Y" value={fmt(motion.acceleration.y)} unit="m/s²" />
          <Row label="Z" value={fmt(motion.acceleration.z)} unit="m/s²" />
        </Section>

        {/* Rotation rate */}
        <Section title="Rotation Rate">
          <Row label="Alpha" value={fmt(motion.rotationRate.x)} unit="°/s" />
          <Row label="Beta" value={fmt(motion.rotationRate.y)} unit="°/s" />
          <Row label="Gamma" value={fmt(motion.rotationRate.z)} unit="°/s" />
        </Section>
      </div>
    </div>
  )
}

function OrientationVisualizer({
  beta,
  gamma,
}: {
  beta: number | null
  gamma: number | null
}) {
  // Map beta (-90 to 90) and gamma (-45 to 45) to a dot position
  const x = gamma !== null ? Math.max(-1, Math.min(1, gamma / 45)) : 0
  const y = beta !== null ? Math.max(-1, Math.min(1, beta / 90)) : 0
  const dotLeft = `${50 + x * 45}%`
  const dotTop = `${50 + y * 45}%`

  return (
    <div className="relative w-full h-28 rounded-xl border border-slate-700 bg-slate-900/50 overflow-hidden">
      {/* Grid lines */}
      <div className="absolute inset-0 flex items-center">
        <div className="w-full h-px bg-slate-700/50" />
      </div>
      <div className="absolute inset-0 flex justify-center">
        <div className="h-full w-px bg-slate-700/50" />
      </div>

      {/* Dot */}
      <div
        className="absolute w-4 h-4 rounded-full bg-pitch-400 shadow-lg shadow-pitch-400/30
          transition-all duration-100 -translate-x-1/2 -translate-y-1/2"
        style={{ left: dotLeft, top: dotTop }}
      />

      <p className="absolute bottom-1.5 right-2.5 text-xs text-slate-600">γ / β tilt</p>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500 uppercase tracking-widest">{title}</p>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

function Row({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-800/50">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="font-mono text-sm text-slate-200">
        {value}
        <span className="text-slate-500 ml-1 text-xs">{unit}</span>
      </span>
    </div>
  )
}
