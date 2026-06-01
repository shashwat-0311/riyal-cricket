'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { BALL_RADIUS } from '@/types/ball'
import type { RefObject } from 'react'

interface Props {
  /** Written every frame by BallSystem; null = hide the ball. */
  positionRef: RefObject<[number, number, number] | null>
}

/**
 * Procedural red cricket ball.
 *
 * Visibility and position are controlled inside useFrame by reading positionRef —
 * never via React state — so physics updates never cause React re-renders.
 */
export function CricketBall({ positionRef }: Props) {
  const groupRef = useRef<THREE.Group>(null)

  useFrame(() => {
    if (!groupRef.current) return
    const pos = positionRef.current

    if (!pos) {
      groupRef.current.visible = false
      return
    }

    groupRef.current.visible = true
    groupRef.current.position.set(pos[0], pos[1], pos[2])
    // Rotate around local X to simulate forward spin
    groupRef.current.rotation.x += 0.18
  })

  return (
    <group ref={groupRef} visible={false}>
      {/* Ball body — rendered 3× the physics radius for clear visibility */}
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[BALL_RADIUS * 3, 24, 24]} />
        <meshStandardMaterial color="#c0392b" roughness={0.55} metalness={0.05} />
      </mesh>

      {/* Seam ring */}
      <mesh>
        <torusGeometry args={[BALL_RADIUS * 3, BALL_RADIUS * 0.32, 8, 40]} />
        <meshStandardMaterial color="#e8c87a" roughness={0.8} metalness={0.0} />
      </mesh>
    </group>
  )
}
