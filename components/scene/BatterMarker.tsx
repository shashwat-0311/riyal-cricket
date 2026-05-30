'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { BodyCenter } from '@/types/pose'
import type { CalibrationData } from '@/types/pose'

/**
 * Glowing marker at the batter's position on the pitch surface.
 *
 * X position is driven by the body-center X (hip midpoint, -1..+1 in camera space).
 * When calibration data is available the offset is relative to the neutral stance.
 *
 * Z is fixed at the popping crease (CREASE_Z) so the batter stays on-crease.
 */

const CREASE_Z   = 8.78   // popping crease from scene origin (PITCH_HALF_LEN - 1.22)
const MAX_SIDE_MOVE = 1.5  // max lateral metres the marker can travel

interface Props {
  bodyCenter: BodyCenter
  calibration?: CalibrationData | null
}

export function BatterMarker({ bodyCenter, calibration }: Props) {
  const outerRef = useRef<THREE.Mesh>(null)
  const innerRef = useRef<THREE.Mesh>(null)

  // Pulsing glow animation
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (outerRef.current) {
      const s = 1 + Math.sin(t * 3) * 0.12
      outerRef.current.scale.setScalar(s)
      const mat = outerRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = 0.45 + Math.sin(t * 3) * 0.15
    }
    if (innerRef.current) {
      const mat = innerRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = 0.7 + Math.sin(t * 4) * 0.15
    }
  })

  // Compute lateral position, offset by calibration neutral if available
  const rawX   = bodyCenter.x
  const offset = calibration ? calibration.neutralBodyCenter.x : 0
  const worldX = THREE.MathUtils.clamp(
    (rawX - offset) * MAX_SIDE_MOVE,
    -MAX_SIDE_MOVE,
    MAX_SIDE_MOVE,
  )

  return (
    <group position={[worldX, 0.005, CREASE_Z]}>
      {/* Outer glow ring */}
      <mesh ref={outerRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.28, 0.42, 48]} />
        <meshBasicMaterial
          color="#22c55e"
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Inner solid disc */}
      <mesh ref={innerRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
        <circleGeometry args={[0.20, 48]} />
        <meshBasicMaterial
          color="#4ade80"
          transparent
          opacity={0.75}
          depthWrite={false}
        />
      </mesh>

      {/* Vertical shaft — helps read position against the pitch */}
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.5, 8]} />
        <meshBasicMaterial color="#86efac" transparent opacity={0.4} />
      </mesh>
    </group>
  )
}
