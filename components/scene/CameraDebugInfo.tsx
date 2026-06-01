'use client'

import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { RefObject } from 'react'

export interface CameraSnapshot {
  px: number; py: number; pz: number   // camera world position
  dx: number; dy: number; dz: number   // normalised look direction
  tx: number; ty: number; tz: number   // look-at point (pos + dir * 10)
  fov: number
}

interface Props {
  /** Written every frame — read by CameraDebugOverlay outside the Canvas */
  snapshotRef: RefObject<CameraSnapshot | null>
}

const _dir = new THREE.Vector3()

/**
 * Renders nothing — just reads the live camera every frame and writes to a ref
 * so CameraDebugOverlay can display it without coupling to the Canvas state.
 */
export function CameraDebugInfo({ snapshotRef }: Props) {
  const { camera } = useThree()

  useFrame(() => {
    camera.getWorldDirection(_dir)
    const p = camera.position
    const fov = (camera as THREE.PerspectiveCamera).fov ?? 0
    snapshotRef.current = {
      px: Math.round(p.x * 100) / 100,
      py: Math.round(p.y * 100) / 100,
      pz: Math.round(p.z * 100) / 100,
      dx: Math.round(_dir.x * 100) / 100,
      dy: Math.round(_dir.y * 100) / 100,
      dz: Math.round(_dir.z * 100) / 100,
      tx: Math.round((p.x + _dir.x * 10) * 100) / 100,
      ty: Math.round((p.y + _dir.y * 10) * 100) / 100,
      tz: Math.round((p.z + _dir.z * 10) * 100) / 100,
      fov: Math.round(fov),
    }
  })

  return null
}
