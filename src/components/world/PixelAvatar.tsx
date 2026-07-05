import { useEffect, useRef } from 'react'
import { CW, CH, drawCharacter, type CharacterLook, type FrameState } from '@/lib/world/pixel/draw'

interface PixelAvatarProps {
  look: CharacterLook
  /** rendered height in CSS px (width scales to keep the sprite ratio) */
  height?: number
  /** run the idle/walk animation loop */
  animated?: boolean
  /** while animated, play the walk cycle */
  walking?: boolean
  className?: string
}

const reduceMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * Renders a procedural pixel-art character to a <canvas>. Static by default
 * (one draw); when `animated`, runs a rAF loop for blink + breathe (+ walk).
 * Crisp at any size via nearest-neighbour (image-rendering: pixelated).
 */
export function PixelAvatar({
  look,
  height = 128,
  animated = false,
  walking = false,
  className,
}: PixelAvatarProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const bufRef = useRef<Uint8ClampedArray>(new Uint8ClampedArray(CW * CH * 4))
  const lookRef = useRef(look)
  const walkRef = useRef(walking)
  lookRef.current = look
  walkRef.current = walking

  // Animated loop (blink/breathe/walk). Depends only on `animated` so the loop
  // isn't torn down on every look change — it reads the latest via refs.
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const still = reduceMotion()

    const paint = (frame: FrameState) => {
      drawCharacter(bufRef.current, lookRef.current, frame)
      ctx.putImageData(new ImageData(bufRef.current, CW, CH), 0, 0)
    }

    if (!animated || still) {
      paint({ walk: still && walkRef.current ? 0 : null })
      return
    }

    let raf = 0
    const loop = (t: number) => {
      paint({
        blink: t % 3400 < 130,
        breathe: t % 2600 < 1300 ? 0 : -1,
        walk: walkRef.current ? (t / 620) % 1 : null,
      })
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [animated])

  // Static redraw when the look changes (non-animated instances, e.g. shop cards)
  useEffect(() => {
    if (animated) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    drawCharacter(bufRef.current, look, {})
    ctx.putImageData(new ImageData(bufRef.current, CW, CH), 0, 0)
  }, [look, animated])

  const width = Math.round((height * CW) / CH)
  return (
    <canvas
      ref={canvasRef}
      width={CW}
      height={CH}
      className={className}
      style={{ width, height, imageRendering: 'pixelated' }}
      aria-label="character"
      role="img"
    />
  )
}
