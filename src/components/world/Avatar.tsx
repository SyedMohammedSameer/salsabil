import type { AvatarSlot, AvatarVariant } from '@/lib/database.types'

// A flat-illustrated character drawn in a local coordinate space where the
// FEET sit at (0, 0) and the figure extends upward in -y (about 96 units tall,
// 44 wide). Callers position it with a transform. Accessories are layered on
// by slot so equipping an item instantly changes the look.

export type EquippedMap = Partial<Record<AvatarSlot, string>>

const SKIN: Record<AvatarVariant, string> = { man: '#e0a878', woman: '#e6b48c' }
const ROBE: Record<AvatarVariant, { main: string; shade: string }> = {
  man: { main: '#f4f1ea', shade: '#dcd6c8' },
  woman: { main: '#6f9a86', shade: '#5c8271' },
}
const HAIR = '#3a2d26'

interface AvatarProps {
  variant: AvatarVariant
  equipped?: EquippedMap
}

/** Returns an SVG <g> — must be rendered inside an <svg>. */
export function Avatar({ variant, equipped = {} }: AvatarProps) {
  const skin = SKIN[variant]
  const robe = ROBE[variant]

  return (
    <g>
      {/* Cloak drawn behind the body */}
      {equipped.outer === 'cloak' && <Cloak />}

      {/* Robe / thobe */}
      <path
        d="M -12 -70 Q -20 -60 -18 -2 L 18 -2 Q 20 -60 12 -70 Z"
        fill={robe.main}
        stroke={robe.shade}
        strokeWidth={1.5}
      />
      {/* Robe center seam */}
      <path d="M 0 -68 L 0 -3" stroke={robe.shade} strokeWidth={1} opacity={0.6} />

      {/* Arms */}
      <path
        d="M -12 -66 Q -22 -50 -18 -34"
        fill="none"
        stroke={robe.main}
        strokeWidth={7}
        strokeLinecap="round"
      />
      <path
        d="M 12 -66 Q 22 -50 18 -34"
        fill="none"
        stroke={robe.main}
        strokeWidth={7}
        strokeLinecap="round"
      />
      {/* Hands */}
      <circle cx={-18} cy={-33} r={3} fill={skin} />
      <circle cx={18} cy={-33} r={3} fill={skin} />

      {/* Neck + head */}
      <rect x={-4} y={-80} width={8} height={10} rx={3} fill={skin} />
      <circle cx={0} cy={-88} r={11} fill={skin} />

      {variant === 'man' ? <ManHead /> : <WomanHead />}

      {/* Face */}
      <circle cx={-4} cy={-89} r={1.2} fill="#3a2d26" />
      <circle cx={4} cy={-89} r={1.2} fill="#3a2d26" />
      <path
        d="M -3 -84 Q 0 -82 3 -84"
        fill="none"
        stroke="#b5794f"
        strokeWidth={1}
        strokeLinecap="round"
      />

      {/* Head accessory */}
      {equipped.hat === 'kufi' && <Kufi />}

      {/* Held + companion */}
      {equipped.held === 'lantern' && <HeldLantern />}
      {equipped.companion === 'falcon' && <Falcon />}
    </g>
  )
}

function ManHead() {
  return (
    <>
      {/* Hair cap */}
      <path
        d="M -11 -90 Q -10 -100 0 -100 Q 10 -100 11 -90 Q 6 -95 0 -95 Q -6 -95 -11 -90 Z"
        fill={HAIR}
      />
      {/* Short beard */}
      <path d="M -9 -87 Q 0 -76 9 -87 Q 8 -80 0 -79 Q -8 -80 -9 -87 Z" fill={HAIR} opacity={0.9} />
    </>
  )
}

const HIJAB = '#b8788f'
const HIJAB_SHADE = '#9c6076'

function WomanHead() {
  // Base hijab — frames the face and drapes onto the shoulders. The outer hood
  // has a face-shaped hole (evenodd) so the skin head shows through.
  return (
    <>
      {/* Shoulder drape, behind */}
      <path d="M -13 -84 Q -16 -70 -12 -64 L 12 -64 Q 16 -70 13 -84 Z" fill={HIJAB_SHADE} />
      {/* Hood with face opening */}
      <path
        fillRule="evenodd"
        d="M -14 -88 A 14 15 0 1 1 14 -88 Q 14 -78 8 -73 L -8 -73 Q -14 -78 -14 -88 Z
           M -8 -88 A 8 9 0 1 0 8 -88 A 8 9 0 1 0 -8 -88 Z"
        fill={HIJAB}
      />
    </>
  )
}

// ─── Accessories ─────────────────────────────────────────────────────────────

function Kufi() {
  return (
    <path
      d="M -10 -94 Q 0 -104 10 -94 Q 0 -99 -10 -94 Z"
      fill="#fbfbf7"
      stroke="#d8d2c4"
      strokeWidth={1}
    />
  )
}

function Cloak() {
  // A cape draped behind the figure — flares wider than the robe so it reads
  // as a mantle, with a collar over the shoulders.
  return (
    <g>
      <path d="M -13 -68 L -24 -2 L 24 -2 L 13 -68 Q 0 -60 -13 -68 Z" fill="#9c5f34" />
      <path
        d="M -13 -68 L -18 -34 Q 0 -40 18 -34 L 13 -68 Q 0 -60 -13 -68 Z"
        fill="#8a5330"
        opacity={0.5}
      />
      <path d="M -13 -70 Q 0 -62 13 -70 L 10 -60 Q 0 -54 -10 -60 Z" fill="#7a4a2a" />
    </g>
  )
}

function HeldLantern() {
  return (
    <g transform="translate(24 -34)">
      <line x1={0} y1={-8} x2={0} y2={-2} stroke="#7a5a2a" strokeWidth={1} />
      <rect
        x={-4}
        y={-2}
        width={8}
        height={10}
        rx={2}
        fill="#f2c14e"
        stroke="#b9832b"
        strokeWidth={1}
      />
      <circle cx={0} cy={3} r={2} fill="#fff3c4" />
    </g>
  )
}

function Falcon() {
  return (
    <g transform="translate(-24 -40)">
      <ellipse cx={0} cy={0} rx={5} ry={3.5} fill="#8a7358" />
      <circle cx={-4} cy={-2} r={2.5} fill="#a68a68" />
      <path d="M -6 -3 l -2 -1" stroke="#e0a53b" strokeWidth={1} strokeLinecap="round" />
      <path d="M 3 0 q 5 -1 7 2 q -5 0 -7 -1 Z" fill="#6f5c45" />
    </g>
  )
}
