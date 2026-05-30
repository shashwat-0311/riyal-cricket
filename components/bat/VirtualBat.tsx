'use client'

import { useRef, memo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { MutableRefObject } from 'react'
import type { BatTransform } from '@/types/bat'
import { SwingState } from '@/types/bat'

interface Props {
  transformRef: MutableRefObject<BatTransform | null>
  swingState:   SwingState
}

// ── Bat geometry constants (real-world scale, 1 unit ≈ 1 m) ──────────────────
// Origin is the GRIP POINT at the base of the handle so all rotations pivot
// naturally from the hand.

const HANDLE_H  = 0.265   // total handle length
const HANDLE_RT = 0.020   // top radius
const HANDLE_RB = 0.026   // bottom radius (slightly fatter at base)
const GRIP_H    = 0.165   // rubberised grip tape section
const GRIP_R    = 0.027   // grip tape radius

const SHOULDER_H = 0.058  // taper from handle to blade
const SHOULDER_R = 0.022  // top radius of shoulder

const BLADE_W   = 0.100   // blade width
const BLADE_D   = 0.040   // blade depth (thickness)
const BLADE_H   = 0.572   // blade length

// Derived Y offsets (origin = grip base)
const GRIP_Y     = GRIP_H / 2
const HANDLE_Y   = HANDLE_H / 2
const SHOULDER_Y = HANDLE_H + SHOULDER_H / 2
const BLADE_Y    = HANDLE_H + SHOULDER_H + BLADE_H / 2

// Reusable Three.js objects (allocated once, mutated per frame — safe because
// these are only touched inside useFrame, which is single-threaded).
const _pos  = new THREE.Vector3()
const _quat = new THREE.Quaternion()

/**
 * Procedural cricket bat rendered in React Three Fiber.
 *
 * Reads from a MutableRef inside useFrame to avoid React reconciliation on
 * every sensor tick (30 fps).  Only re-renders when swingState changes.
 *
 * Structure (bottom = grip, top = blade tip):
 *   grip tape → handle → shoulder → blade
 */
export const VirtualBat = memo(function VirtualBat({ transformRef, swingState }: Props) {
  const groupRef = useRef<THREE.Group>(null)
  const isSwing  = swingState === SwingState.SWING

  useFrame(() => {
    const t = transformRef.current
    if (!t || !groupRef.current) return

    _pos.set(t.position[0], t.position[1], t.position[2])
    _quat.set(t.quaternion[0], t.quaternion[1], t.quaternion[2], t.quaternion[3])

    groupRef.current.position.copy(_pos)
    groupRef.current.quaternion.copy(_quat)
  })

  return (
    <group ref={groupRef}>
      {/* ── Grip tape ─────────────────────────────────────────────────────── */}
      <mesh position={[0, GRIP_Y, 0]} castShadow>
        <cylinderGeometry args={[GRIP_R, GRIP_R, GRIP_H, 12]} />
        <meshStandardMaterial color="#1a1008" roughness={0.92} />
      </mesh>

      {/* ── Handle ────────────────────────────────────────────────────────── */}
      <mesh position={[0, HANDLE_Y, 0]} castShadow>
        <cylinderGeometry args={[HANDLE_RT, HANDLE_RB, HANDLE_H, 12]} />
        <meshStandardMaterial color="#7a4f2a" roughness={0.78} />
      </mesh>

      {/* ── Shoulder (handle→blade taper) ─────────────────────────────────── */}
      <mesh position={[0, SHOULDER_Y, 0]} castShadow>
        <cylinderGeometry args={[BLADE_D / 2, SHOULDER_R, SHOULDER_H, 12]} />
        <meshStandardMaterial color="#c8a05a" roughness={0.62} />
      </mesh>

      {/* ── Blade ─────────────────────────────────────────────────────────── */}
      <mesh position={[0, BLADE_Y, 0]} castShadow receiveShadow>
        <boxGeometry args={[BLADE_W, BLADE_H, BLADE_D]} />
        <meshStandardMaterial
          color={isSwing ? '#e8c878' : '#c8a05a'}
          roughness={0.52}
          metalness={0.04}
        />
      </mesh>

      {/* ── Swing glow ────────────────────────────────────────────────────── */}
      {isSwing && (
        <pointLight
          position={[0, BLADE_Y, 0]}
          color="#fcd34d"
          intensity={2.2}
          distance={1.6}
          decay={2}
        />
      )}
    </group>
  )
})
