'use client'

import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Sky, PerspectiveCamera, Environment } from '@react-three/drei'
import { Pitch, PITCH_HALF_LEN } from './Pitch'
import { Crease } from './Crease'
import { Stumps } from './Stumps'
import { BatterMarker } from './BatterMarker'
import type { BodyCenter, CalibrationData } from '@/types/pose'

const STUMP_Z = PITCH_HALF_LEN  // 10 units from centre

interface Props {
  batterPosition: BodyCenter | null
  calibration?: CalibrationData | null
  /** Allow free camera rotation during development */
  orbitEnabled?: boolean
}

/**
 * React Three Fiber scene: full cricket pitch view.
 *
 * Camera sits behind the batter (positive Z side) at a raised angle so both
 * ends of the pitch are visible. Orbit controls are enabled in development.
 *
 * Phase 3 additions will be mounted here:
 *   <VirtualBat />   — wrist-driven bat mesh
 *   <Ball />         — physics-simulated ball
 *   <Fielders />     — AI-positioned fielder meshes
 */
export function CricketScene({ batterPosition, calibration, orbitEnabled = true }: Props) {
  return (
    <div className="w-full h-full rounded-xl overflow-hidden bg-slate-900">
      <Canvas
        shadows
        gl={{ antialias: true }}
        dpr={[1, 2]}
      >
        {/* ── Camera ──────────────────────────────────────────────────────────── */}
        <PerspectiveCamera
          makeDefault
          position={[0, 9, 20]}
          fov={50}
          near={0.1}
          far={200}
        />
        {orbitEnabled && (
          <OrbitControls
            target={[0, 0, 0]}
            minPolarAngle={Math.PI / 8}
            maxPolarAngle={Math.PI / 2.5}
            enablePan={false}
          />
        )}

        {/* ── Lighting ────────────────────────────────────────────────────────── */}
        <ambientLight intensity={0.6} />
        <directionalLight
          position={[10, 20, 10]}
          intensity={1.4}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-near={0.5}
          shadow-camera-far={80}
          shadow-camera-left={-20}
          shadow-camera-right={20}
          shadow-camera-top={20}
          shadow-camera-bottom={-20}
        />
        <hemisphereLight args={['#87ceeb', '#4a7a1e', 0.4]} />

        {/* ── Sky ─────────────────────────────────────────────────────────────── */}
        <Sky
          distance={450}
          sunPosition={[10, 4, -5]}
          inclination={0.49}
          azimuth={0.25}
        />

        {/* ── Cricket field geometry ───────────────────────────────────────────── */}
        <Suspense fallback={null}>
          <Pitch />

          {/* Batting end (positive Z = near camera) */}
          <Stumps position={[0, 0, STUMP_Z]} />
          <Crease endZ={STUMP_Z} facing={-1} />

          {/* Bowling end (negative Z = far end) */}
          <Stumps position={[0, 0, -STUMP_Z]} />
          <Crease endZ={-STUMP_Z} facing={1} />

          {/* ── Batter marker — only rendered when tracking is live ─────────── */}
          {batterPosition && (
            <BatterMarker
              bodyCenter={batterPosition}
              calibration={calibration}
            />
          )}
        </Suspense>
      </Canvas>
    </div>
  )
}
