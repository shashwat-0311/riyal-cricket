'use client'

import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Sky } from '@react-three/drei'
import { Pitch, PITCH_HALF_LEN } from './Pitch'
import { Crease } from './Crease'
import { Stumps } from './Stumps'
import { BatterMarker } from './BatterMarker'
import { VirtualBat } from '@/components/bat/VirtualBat'
import { BallSystem } from '@/components/ball/BallSystem'
import { CameraDebugInfo } from './CameraDebugInfo'
import type { BodyCenter, CalibrationData } from '@/types/pose'
import type { BatTransform, SwingMetrics } from '@/types/bat'
import type { DeliveryControlState } from '@/types/ball'
import type { DeliveryManager } from '@/services/DeliveryManager'
import { SwingState } from '@/types/bat'
import type { RefObject } from 'react'
import type { BallDebugSnapshot } from '@/components/ball/BallSystem'
import type { CameraSnapshot } from './CameraDebugInfo'

const STUMP_Z = PITCH_HALF_LEN  // 10 units from centre

// ── Gameplay camera constants ─────────────────────────────────────────────────
// Position: close behind the batting crease, low angle (head height).
// Target:   batting crease area at bat/waist height.
// Result:   ~12% sky, bat + stumps + ball trajectory all simultaneously visible.
const CAM_POS    = [0, 1.8, 12.5] as const
const CAM_TARGET = [0, 0.5,  8.0] as const
const CAM_FOV    = 70

interface Props {
  batterPosition:  BodyCenter | null
  calibration?:    CalibrationData | null
  batTransformRef?: RefObject<BatTransform | null>
  swingMetricsRef?: RefObject<SwingMetrics>
  swingState?:     SwingState
  /** Delivery refs passed straight through to BallSystem inside the Canvas */
  deliveryManagerRef?: RefObject<DeliveryManager>
  deliveryStateRef?:   RefObject<DeliveryControlState>
  deliveryIdRef?:      RefObject<number>
  onDeliveryEndRef?:   RefObject<((reason: 'HIT' | 'PASSED') => void) | null>
  ballDebugRef?:       RefObject<BallDebugSnapshot | null>
  /** Written every frame for CameraDebugOverlay */
  cameraSnapshotRef?:  RefObject<CameraSnapshot | null>
  /** Enable orbit controls for development inspection */
  orbitEnabled?:   boolean
}

/**
 * React Three Fiber scene: cricket pitch with virtual bat and ball.
 *
 * Gameplay camera sits behind the batting crease at head height, looking
 * toward the bat-swing zone.  Sky is kept to ~12% of the frame so the pitch
 * and bat dominate the viewport.
 */
export function CricketScene({
  batterPosition,
  calibration,
  batTransformRef,
  swingMetricsRef,
  swingState = SwingState.IDLE,
  deliveryManagerRef,
  deliveryStateRef,
  deliveryIdRef,
  onDeliveryEndRef,
  ballDebugRef,
  cameraSnapshotRef,
  orbitEnabled = false,
}: Props) {
  const ballSystemReady =
    deliveryManagerRef != null &&
    deliveryStateRef   != null &&
    deliveryIdRef      != null &&
    onDeliveryEndRef   != null &&
    ballDebugRef       != null &&
    batTransformRef    != null &&
    swingMetricsRef    != null

  return (
    <div className="w-full h-full rounded-xl overflow-hidden bg-slate-900">
      <Canvas shadows gl={{ antialias: true }} dpr={[1, 2]}>

        {/* ── Gameplay camera ──────────────────────────────────────────────────── */}
        <PerspectiveCamera
          makeDefault
          position={CAM_POS}
          fov={CAM_FOV}
          near={0.1}
          far={200}
          onUpdate={c => c.lookAt(...CAM_TARGET)}
        />
        {orbitEnabled && (
          <OrbitControls
            target={CAM_TARGET}
            minPolarAngle={Math.PI / 8}
            maxPolarAngle={Math.PI / 2.2}
            enablePan={false}
          />
        )}

        {/* Camera snapshot for debug overlay — renders nothing */}
        {cameraSnapshotRef && <CameraDebugInfo snapshotRef={cameraSnapshotRef} />}

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
        <Sky distance={450} sunPosition={[10, 4, -5]} inclination={0.49} azimuth={0.25} />

        {/* ── Cricket field ─────────────────────────────────────────────────────── */}
        <Suspense fallback={null}>
          <Pitch />

          <Stumps position={[0, 0,  STUMP_Z]} />
          <Crease endZ={ STUMP_Z} facing={-1} />

          <Stumps position={[0, 0, -STUMP_Z]} />
          <Crease endZ={-STUMP_Z} facing={1} />

          {batterPosition && (
            <BatterMarker bodyCenter={batterPosition} calibration={calibration} />
          )}

          {batTransformRef && (
            <VirtualBat transformRef={batTransformRef} swingState={swingState} />
          )}

          {ballSystemReady && (
            <BallSystem
              deliveryManagerRef={deliveryManagerRef!}
              deliveryStateRef={deliveryStateRef!}
              deliveryIdRef={deliveryIdRef!}
              batTransformRef={batTransformRef!}
              swingMetricsRef={swingMetricsRef!}
              onDeliveryEndRef={onDeliveryEndRef!}
              ballDebugRef={ballDebugRef!}
            />
          )}
        </Suspense>
      </Canvas>
    </div>
  )
}
