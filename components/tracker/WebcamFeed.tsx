'use client'

import type { RefObject } from 'react'
import type { BodyLandmarks, BodyCenter } from '@/types/pose'
import { SkeletonOverlay } from './SkeletonOverlay'

interface Props {
  videoRef: RefObject<HTMLVideoElement | null>
  landmarks: BodyLandmarks | null
  bodyCenter: BodyCenter | null
  videoWidth: number
  videoHeight: number
  confidence: number
  mirrored?: boolean
}

/**
 * Webcam video element with SkeletonOverlay stacked on top.
 * Both are flipped with CSS scaleX(-1) when `mirrored` is true so the skeleton
 * aligns with the mirror-image video.
 */
export function WebcamFeed({
  videoRef,
  landmarks,
  bodyCenter,
  videoWidth,
  videoHeight,
  confidence,
  mirrored = true,
}: Props) {
  const confidencePct = Math.round(confidence * 100)
  const confColor =
    confidence >= 0.7 ? 'text-green-400' :
    confidence >= 0.4 ? 'text-yellow-400' :
    'text-red-400'

  return (
    <div className="relative w-full aspect-video bg-slate-900 rounded-xl overflow-hidden">
      {/* Video */}
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        style={mirrored ? { transform: 'scaleX(-1)' } : undefined}
        playsInline
        muted
      />

      {/* Skeleton canvas overlay */}
      {landmarks && (
        <SkeletonOverlay
          landmarks={landmarks}
          bodyCenter={bodyCenter}
          videoWidth={videoWidth || 1280}
          videoHeight={videoHeight || 720}
          mirrored={mirrored}
        />
      )}

      {/* No-pose placeholder */}
      {!landmarks && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-xs text-slate-500 bg-slate-900/70 px-3 py-1.5 rounded-full">
            No pose detected
          </span>
        </div>
      )}

      {/* Confidence badge */}
      {confidence > 0 && (
        <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-slate-900/80 rounded-full px-2.5 py-1">
          <span className={`text-xs font-mono font-semibold ${confColor}`}>
            {confidencePct}%
          </span>
          <span className="text-xs text-slate-500">confidence</span>
        </div>
      )}
    </div>
  )
}
