import { useId } from 'react'
import type { AvatarSlot, AvatarVariant } from '@/lib/database.types'

// A polished, softly-shaded flat character drawn in a local space where the
// FEET rest at (0, 0) and the figure rises ~116 units in -y (about 52 wide).
// Callers position it with a transform. Gradients are namespaced per instance
// (useId) so many avatars can share one SVG without id collisions. Accessories
// layer on by slot. Feet carry classes so the scene can animate a walk cycle.

export type EquippedMap = Partial<Record<AvatarSlot, string>>

interface AvatarProps {
  variant: AvatarVariant
  equipped?: EquippedMap
}

/** Returns an SVG <g> — must be rendered inside an <svg>. */
export function Avatar({ variant, equipped = {} }: AvatarProps) {
  const uid = useId().replace(/:/g, '')
  const id = (k: string) => `${uid}-${k}`
  const woman = variant === 'woman'

  const robeTop = woman ? '#7fb3a1' : '#fbfaf6'
  const robeBot = woman ? '#5c907d' : '#e6e1d5'
  const robeLine = woman ? '#4d7d6b' : '#d3cdbe'

  return (
    <g>
      <defs>
        <linearGradient id={id('skin')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f3cda3" />
          <stop offset="100%" stopColor="#d9a878" />
        </linearGradient>
        <linearGradient id={id('robe')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={robeTop} />
          <stop offset="100%" stopColor={robeBot} />
        </linearGradient>
        <linearGradient id={id('hair')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4a3326" />
          <stop offset="100%" stopColor="#2f2018" />
        </linearGradient>
        <radialGradient id={id('cheek')} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#e8896f" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#e8896f" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* ground contact shadow */}
      <ellipse cx={0} cy={0} rx={22} ry={4.5} fill="#00000022" />

      {/* Feet / shoes (animatable) */}
      <g className="world-foot world-foot--l">
        <ellipse cx={-7} cy={-2} rx={7} ry={3.2} fill="#6b4a32" />
        <ellipse cx={-7} cy={-3} rx={7} ry={2.6} fill="#7d5840" />
      </g>
      <g className="world-foot world-foot--r">
        <ellipse cx={7} cy={-2} rx={7} ry={3.2} fill="#5e4029" />
        <ellipse cx={7} cy={-3} rx={7} ry={2.6} fill="#6f4e37" />
      </g>

      {/* Cloak behind everything */}
      {equipped.outer === 'cloak' && <Cloak id={id} />}

      {/* Robe body */}
      <path
        d="M -19 -92
           C -23 -62 -25 -26 -22 -3
           L 22 -3
           C 25 -26 23 -62 19 -92
           Q 0 -101 -19 -92 Z"
        fill={`url(#${id('robe')})`}
      />
      {/* form shadow on the right side */}
      <path
        d="M 4 -95 C 10 -60 12 -28 10 -3 L 22 -3 C 25 -26 23 -62 19 -92 Q 12 -96 4 -95 Z"
        fill="#000000"
        opacity={0.06}
      />
      {/* center placket + soft folds */}
      <path d="M 0 -90 L 0 -4" stroke={robeLine} strokeWidth={1.1} opacity={0.7} />
      <path
        d="M -11 -70 C -13 -45 -13 -22 -12 -5"
        stroke={robeLine}
        strokeWidth={0.8}
        opacity={0.4}
        fill="none"
      />
      <path
        d="M 11 -70 C 13 -45 13 -22 12 -5"
        stroke={robeLine}
        strokeWidth={0.8}
        opacity={0.4}
        fill="none"
      />

      {/* Arms / sleeves */}
      <path
        d="M -18 -90 C -27 -74 -26 -58 -21 -46 L -15 -49 C -18 -60 -18 -74 -12 -87 Z"
        fill={`url(#${id('robe')})`}
      />
      <path
        d="M 18 -90 C 27 -74 26 -58 21 -46 L 15 -49 C 18 -60 18 -74 12 -87 Z"
        fill={`url(#${id('robe')})`}
      />
      {/* sleeve shading */}
      <path
        d="M 18 -90 C 27 -74 26 -58 21 -46 L 18 -47 C 21 -60 20 -75 15 -88 Z"
        fill="#000"
        opacity={0.05}
      />
      {/* Hands */}
      <ellipse cx={-19} cy={-45} rx={3.6} ry={4} fill={`url(#${id('skin')})`} />
      <ellipse cx={19} cy={-45} rx={3.6} ry={4} fill={`url(#${id('skin')})`} />

      {/* Neck */}
      <path d="M -5 -96 L 5 -96 L 4 -88 Q 0 -85 -4 -88 Z" fill="#c98f63" />

      {/* Head */}
      <ellipse cx={0} cy={-108} rx={13} ry={14} fill={`url(#${id('skin')})`} />
      {/* ears */}
      <circle cx={-12.5} cy={-107} r={2.4} fill={`url(#${id('skin')})`} />
      <circle cx={12.5} cy={-107} r={2.4} fill={`url(#${id('skin')})`} />

      {/* hair / hijab UNDER-layer (behind face framing) */}
      {woman ? <HijabBack id={id} /> : <HairBack id={id} />}

      {/* Cheeks */}
      <ellipse cx={-6} cy={-104} rx={3} ry={2.2} fill={`url(#${id('cheek')})`} />
      <ellipse cx={6} cy={-104} rx={3} ry={2.2} fill={`url(#${id('cheek')})`} />

      {/* Face */}
      <Face woman={woman} />

      {/* hair / hijab FRONT framing */}
      {woman ? <HijabFront id={id} /> : <HairFront id={id} />}

      {/* Head accessory */}
      {equipped.hat === 'kufi' && <Kufi />}

      {/* Held + companion */}
      {equipped.held === 'lantern' && <HeldLantern />}
      {equipped.companion === 'falcon' && <Falcon id={id} />}
    </g>
  )
}

// ─── Face ────────────────────────────────────────────────────────────────────

function Face({ woman }: { woman: boolean }) {
  return (
    <g>
      {/* eyebrows */}
      <path
        d="M -8 -112.5 Q -5 -114 -2.5 -112.5"
        stroke="#4a3326"
        strokeWidth={1}
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M 2.5 -112.5 Q 5 -114 8 -112.5"
        stroke="#4a3326"
        strokeWidth={1}
        strokeLinecap="round"
        fill="none"
      />
      {/* eyes */}
      <ellipse cx={-5} cy={-108} rx={2.3} ry={2.9} fill="#fff" />
      <ellipse cx={5} cy={-108} rx={2.3} ry={2.9} fill="#fff" />
      <circle cx={-4.7} cy={-107.5} r={1.5} fill="#4a3326" />
      <circle cx={5.3} cy={-107.5} r={1.5} fill="#4a3326" />
      <circle cx={-4.2} cy={-108.3} r={0.5} fill="#fff" />
      <circle cx={5.8} cy={-108.3} r={0.5} fill="#fff" />
      {/* lash line */}
      <path
        d="M -7.3 -109.6 Q -5 -110.6 -2.7 -109.6"
        stroke="#4a3326"
        strokeWidth={0.7}
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M 2.7 -109.6 Q 5 -110.6 7.3 -109.6"
        stroke="#4a3326"
        strokeWidth={0.7}
        fill="none"
        strokeLinecap="round"
      />
      {/* nose */}
      <path
        d="M 0 -106 q 1.2 1.6 -0.6 2.4"
        stroke="#c07d4f"
        strokeWidth={0.9}
        fill="none"
        strokeLinecap="round"
      />
      {/* mouth */}
      <path
        d="M -3 -100.5 Q 0 -98.2 3 -100.5"
        stroke={woman ? '#c05f6a' : '#a5573a'}
        strokeWidth={1.2}
        fill="none"
        strokeLinecap="round"
      />
    </g>
  )
}

// ─── Man hair ────────────────────────────────────────────────────────────────

function HairBack({ id }: { id: (k: string) => string }) {
  return (
    <path
      d="M -13.5 -104 C -15 -122 15 -122 13.5 -104 C 13 -110 10 -114 0 -114 C -10 -114 -13 -110 -13.5 -104 Z"
      fill={`url(#${id('hair')})`}
    />
  )
}

function HairFront({ id }: { id: (k: string) => string }) {
  return (
    <g>
      {/* fringe */}
      <path
        d="M -13 -108 C -14 -119 -4 -121 0 -120 C 6 -121 14 -118 13 -108 C 9 -113 6 -112 2 -113 C 6 -110 4 -108 4 -108 C 3 -111 -1 -112 -3 -110 C -5 -112 -9 -111 -8 -108 C -9 -111 -11 -111 -13 -108 Z"
        fill={`url(#${id('hair')})`}
      />
      {/* trimmed beard along the jaw */}
      <path
        d="M -11 -108 C -12 -99 -6 -92 0 -92 C 6 -92 12 -99 11 -108 C 9 -103 6 -101 6 -101 C 3 -99.5 -3 -99.5 -6 -101 C -6 -101 -9 -103 -11 -108 Z"
        fill="#33251c"
      />
      {/* moustache */}
      <path
        d="M -3.4 -101.3 Q 0 -102.6 3.4 -101.3"
        stroke="#33251c"
        strokeWidth={1.6}
        fill="none"
        strokeLinecap="round"
      />
    </g>
  )
}

// ─── Woman hijab ─────────────────────────────────────────────────────────────

const HIJAB = '#e7d6bd'
const HIJAB_SHADE = '#cdb794'
const HIJAB_LINE = '#b89f78'

function HijabBack({ id }: { id: (k: string) => string }) {
  void id
  // Drapes behind the head and onto the shoulders.
  return (
    <path
      d="M -15 -104 C -17 -124 17 -124 15 -104 C 15 -92 12 -84 9 -78 L 12 -70 L -12 -70 L -9 -78 C -12 -84 -15 -92 -15 -104 Z"
      fill={HIJAB_SHADE}
    />
  )
}

function HijabFront({ id }: { id: (k: string) => string }) {
  void id
  // Frames the face (evenodd hole) and adds soft folds + a pin.
  return (
    <g>
      <path
        fillRule="evenodd"
        d="M -15 -106 C -16 -123 16 -123 15 -106 C 15 -96 11 -89 7 -85 L -7 -85 C -11 -89 -15 -96 -15 -106 Z
           M -9.5 -107 A 9.5 10.5 0 1 0 9.5 -107 A 9.5 10.5 0 1 0 -9.5 -107 Z"
        fill={HIJAB}
      />
      {/* fold lines */}
      <path
        d="M -14 -108 C -13 -100 -10 -93 -6 -88"
        stroke={HIJAB_LINE}
        strokeWidth={0.7}
        fill="none"
        opacity={0.7}
      />
      <path
        d="M 14 -108 C 13 -100 10 -93 6 -88"
        stroke={HIJAB_LINE}
        strokeWidth={0.7}
        fill="none"
        opacity={0.7}
      />
      {/* pin */}
      <circle cx={-9} cy={-98} r={1} fill="#e0b24b" />
    </g>
  )
}

// ─── Accessories ─────────────────────────────────────────────────────────────

function Kufi() {
  return (
    <g>
      <path
        d="M -11 -117 Q 0 -130 11 -117 Q 0 -122 -11 -117 Z"
        fill="#fbfbf7"
        stroke="#d8d2c4"
        strokeWidth={1}
      />
      <path d="M -11 -117 Q 0 -113 11 -117" stroke="#d8d2c4" strokeWidth={1} fill="none" />
      <path
        d="M -7 -120 q 7 -3 14 0"
        stroke="#cfc8b6"
        strokeWidth={0.6}
        fill="none"
        opacity={0.7}
      />
    </g>
  )
}

function Cloak({ id }: { id: (k: string) => string }) {
  return (
    <g>
      <defs>
        <linearGradient id={id('cloak')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#b07a3f" />
          <stop offset="100%" stopColor="#8a5a2c" />
        </linearGradient>
      </defs>
      <path
        d="M -15 -90 C -26 -52 -24 -20 -24 -3 L 24 -3 C 24 -20 26 -52 15 -90 Q 0 -80 -15 -90 Z"
        fill={`url(#${id('cloak')})`}
      />
      <path d="M -13 -91 Q 0 -82 13 -91 L 9 -78 Q 0 -72 -9 -78 Z" fill="#7a4a22" />
      {/* gold trim: collar edge + hem */}
      <path
        d="M -13 -90 Q 0 -80 13 -90"
        stroke="#e0b24b"
        strokeWidth={1}
        opacity={0.7}
        fill="none"
      />
      <path d="M -24 -4 Q 0 -8 24 -4" stroke="#e0b24b" strokeWidth={1} opacity={0.6} fill="none" />
    </g>
  )
}

function HeldLantern() {
  return (
    <g transform="translate(24 -45)">
      <line x1={0} y1={-9} x2={0} y2={-3} stroke="#7a5a2a" strokeWidth={1.2} />
      <path d="M -4 -3 h 8 l -1 11 h -6 Z" fill="#f2c14e" stroke="#b9832b" strokeWidth={1} />
      <ellipse cx={0} cy={3} rx={2.4} ry={3} fill="#fff3c4" />
      <circle cx={0} cy={3} r={4} fill="#ffe38a" opacity={0.35} />
    </g>
  )
}

function Falcon({ id }: { id: (k: string) => string }) {
  return (
    <g transform="translate(-25 -52)">
      <defs>
        <linearGradient id={id('falcon')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9c8465" />
          <stop offset="100%" stopColor="#6f5c45" />
        </linearGradient>
      </defs>
      <ellipse cx={0} cy={0} rx={5.5} ry={4} fill={`url(#${id('falcon')})`} />
      <circle cx={-4.5} cy={-2.5} r={3} fill="#a68a68" />
      <circle cx={-5.5} cy={-3} r={0.7} fill="#2a2018" />
      <path d="M -7.5 -2.5 l -2.5 -0.6 l 2.2 1.4 Z" fill="#e0a53b" />
      <path d="M 4 -0.5 q 6 -1.5 8 2.5 q -6 0 -8 -1 Z" fill="#5b4a37" />
    </g>
  )
}
