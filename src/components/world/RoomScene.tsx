import { useEffect, useRef } from 'react'
import { CW, CH, drawCharacter, type CharacterLook } from '@/lib/world/pixel/draw'
import {
  RW,
  RH,
  renderRoom,
  compositeCharacter,
  tileCentre,
  type Placed,
} from '@/lib/world/pixel/room'

interface RoomSceneProps {
  look: CharacterLook
  placed: Placed[]
  animated?: boolean
  className?: string
}

const reduceMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function flipH(b: Uint8ClampedArray) {
  for (let y = 0; y < CH; y++)
    for (let x = 0; x < CW / 2; x++) {
      const i = (y * CW + x) * 4
      const j = (y * CW + (CW - 1 - x)) * 4
      for (let k = 0; k < 4; k++) {
        const t = b[i + k]
        b[i + k] = b[j + k]
        b[j + k] = t
      }
    }
}

/**
 * Renders the isometric room with the pixel character composited in. The static
 * room (floor + walls + furniture) is drawn once per `placed` change; each frame
 * copies it and stamps the character at its (walking) position.
 */
export function RoomScene({ look, placed, animated = true, className }: RoomSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const baseRef = useRef<Uint8ClampedArray>(new Uint8ClampedArray(RW * RH * 4))
  const workRef = useRef<Uint8ClampedArray>(new Uint8ClampedArray(RW * RH * 4))
  const cbufRef = useRef<Uint8ClampedArray>(new Uint8ClampedArray(CW * CH * 4))
  const lookRef = useRef(look)
  lookRef.current = look

  const placedKey = JSON.stringify(placed)

  // Static room base.
  useEffect(() => {
    renderRoom(baseRef.current, placed)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placedKey])

  // Draw / animate.
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const still = reduceMotion()

    const paint = (t: number) => {
      workRef.current.set(baseRef.current)
      let gx = 2
      let flip = false
      let frame = {}
      if (animated && !still) {
        const period = 8000
        const tri = Math.abs(((t / period) % 1) * 2 - 1) // 0→1→0
        const triNext = Math.abs((((t + 60) / period) % 1) * 2 - 1)
        gx = 1 + tri * 2 // walk between tiles 1 and 3, front row
        flip = triNext < tri // heading left
        frame = { blink: t % 3400 < 130, breathe: t % 2600 < 1300 ? 0 : -1, walk: (t / 600) % 1 }
      }
      drawCharacter(cbufRef.current, lookRef.current, frame)
      if (flip) flipH(cbufRef.current)
      compositeCharacter(workRef.current, cbufRef.current, CW, CH, gx, 4)
      ctx.putImageData(new ImageData(workRef.current, RW, RH), 0, 0)
    }

    if (!animated || still) {
      paint(0)
      return
    }
    let raf = 0
    const loop = (t: number) => {
      paint(t)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [animated, placedKey])

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(160deg,#efe8f6,#e2d9ee)',
      }}
    >
      <canvas
        ref={canvasRef}
        width={RW}
        height={RH}
        style={{ height: '100%', width: 'auto', imageRendering: 'pixelated' }}
        role="img"
        aria-label="Your room"
      />
    </div>
  )
}

// ─── Single furniture icon (shop cards) ──────────────────────────────────────

const ICON_W = 96
const ICON_H = 96

/** Renders one furniture piece (on a floor tile) cropped into a small canvas. */
export function FurnitureIcon({ itemKey, size = 88 }: { itemKey: string; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const ctx = ref.current?.getContext('2d')
    if (!ctx) return
    const buf = new Uint8ClampedArray(RW * RH * 4)
    renderRoom(buf, [{ key: itemKey, gx: 2, gy: 2 }])
    const off = document.createElement('canvas')
    off.width = RW
    off.height = RH
    off.getContext('2d')!.putImageData(new ImageData(buf, RW, RH), 0, 0)

    const [cx, cy] = tileCentre(2, 2)
    const sx = Math.round(cx - ICON_W / 2)
    const sy = Math.round(cy - ICON_H + 22)
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, size, size)
    ctx.drawImage(off, sx, sy, ICON_W, ICON_H, 0, 0, size, size)
  }, [itemKey, size])

  return (
    <canvas
      ref={ref}
      width={size}
      height={size}
      style={{ imageRendering: 'pixelated' }}
      role="img"
      aria-label={itemKey}
    />
  )
}
