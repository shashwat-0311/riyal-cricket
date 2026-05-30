'use client'

import { useEffect, useRef } from 'react'
import type { BodyLandmarks, BodyCenter, NormalizedLandmark } from '@/types/pose'
import { SKELETON_CONNECTIONS } from '@/types/pose'

interface Props {
  landmarks: BodyLandmarks | null
  bodyCenter: BodyCenter | null
  /** Must match the natural video resolution so coordinates scale correctly */
  videoWidth: number
  videoHeight: number
  /** When true the canvas is CSS-flipped to match a mirrored video feed */
  mirrored?: boolean
  className?: string
}

// Visual config
const BONE_COLOR      = 'rgba(34, 197, 94, 0.85)'    // green-500
const JOINT_COLOR     = 'rgba(74, 222, 128, 1)'       // green-400
const WRIST_COLOR     = 'rgba(251, 191, 36, 1)'       // amber-400  (bat hand hint)
const CENTER_COLOR    = 'rgba(251, 146, 60, 1)'       // orange-400
const CONFIDENCE_LOW  = 'rgba(239, 68, 68, 0.6)'      // red-500

const BONE_WIDTH  = 3
const JOINT_R     = 5
const WRIST_R     = 8
const CENTER_R    = 9

/**
 * Canvas overlay drawn on top of the webcam video.
 * Redraws synchronously when `landmarks` prop changes (called at ~30fps by the
 * rAF tracking loop) — no extra animation frame needed here.
 */
export function SkeletonOverlay({
  landmarks,
  bodyCenter,
  videoWidth,
  videoHeight,
  mirrored = true,
  className = '',
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width  = videoWidth
    canvas.height = videoHeight
  }, [videoWidth, videoHeight])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (!landmarks) return

    const W = canvas.width
    const H = canvas.height

    const px = (lm: NormalizedLandmark) => ({ x: lm.x * W, y: lm.y * H })
    const isLowConf = (lm: NormalizedLandmark) => (lm.visibility ?? 1) < 0.4

    // ── Bones ───────────────────────────────────────────────────────────────
    ctx.lineWidth = BONE_WIDTH
    for (const [a, b] of SKELETON_CONNECTIONS) {
      const p1 = px(landmarks[a])
      const p2 = px(landmarks[b])
      const lowConf = isLowConf(landmarks[a]) || isLowConf(landmarks[b])

      ctx.strokeStyle = lowConf ? CONFIDENCE_LOW : BONE_COLOR
      ctx.beginPath()
      ctx.moveTo(p1.x, p1.y)
      ctx.lineTo(p2.x, p2.y)
      ctx.stroke()
    }

    // ── Joints ──────────────────────────────────────────────────────────────
    for (const [key, lm] of Object.entries(landmarks) as [keyof BodyLandmarks, NormalizedLandmark][]) {
      const { x, y } = px(lm)
      const isWrist  = key === 'leftWrist' || key === 'rightWrist'
      const low      = isLowConf(lm)

      ctx.fillStyle = low ? CONFIDENCE_LOW : isWrist ? WRIST_COLOR : JOINT_COLOR
      ctx.beginPath()
      ctx.arc(x, y, isWrist ? WRIST_R : JOINT_R, 0, Math.PI * 2)
      ctx.fill()
    }

    // ── Body centre (hip mid-point) ─────────────────────────────────────────
    if (bodyCenter) {
      const cx = ((bodyCenter.x / 2) + 0.5) * W
      const cy = ((-bodyCenter.y / 2) + 0.5) * H

      // Outer ring
      ctx.strokeStyle = CENTER_COLOR
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(cx, cy, CENTER_R + 4, 0, Math.PI * 2)
      ctx.stroke()

      // Inner dot
      ctx.fillStyle = CENTER_COLOR
      ctx.beginPath()
      ctx.arc(cx, cy, CENTER_R, 0, Math.PI * 2)
      ctx.fill()
    }
  }, [landmarks, bodyCenter])

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
      style={mirrored ? { transform: 'scaleX(-1)' } : undefined}
    />
  )
}
