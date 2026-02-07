import { motion, type Variants, type Easing } from 'framer-motion';
import { useMemo } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface JarvisOrbProps {
  state: 'idle' | 'listening' | 'thinking' | 'speaking' | 'acting';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const SIZES: Record<NonNullable<JarvisOrbProps['size']>, number> = {
  sm: 64,
  md: 128,
  lg: 200,
};

// Colour palettes per-state — richer, more vivid gradients
const STATE_COLORS = {
  idle: {
    core: ['#0d9488', '#06b6d4', '#0e7490'],
    glow: 'rgba(6,182,212,0.5)',
    glowOuter: 'rgba(13,148,136,0.2)',
    particle: '#22d3ee',
    ring: ['#06b6d4', '#14b8a6'],
    accent: '#67e8f9',
  },
  listening: {
    core: ['#0891b2', '#38bdf8', '#0284c7'],
    glow: 'rgba(56,189,248,0.6)',
    glowOuter: 'rgba(8,145,178,0.25)',
    particle: '#7dd3fc',
    ring: ['#38bdf8', '#0ea5e9'],
    accent: '#bae6fd',
  },
  thinking: {
    core: ['#7c3aed', '#a855f7', '#06b6d4'],
    glow: 'rgba(124,58,237,0.55)',
    glowOuter: 'rgba(168,85,247,0.22)',
    particle: '#c4b5fd',
    ring: ['#a855f7', '#06b6d4', '#7c3aed'],
    accent: '#e9d5ff',
  },
  speaking: {
    core: ['#14b8a6', '#22d3ee', '#06b6d4'],
    glow: 'rgba(20,184,166,0.65)',
    glowOuter: 'rgba(34,211,238,0.28)',
    particle: '#5eead4',
    ring: ['#22d3ee', '#14b8a6'],
    accent: '#99f6e4',
  },
  acting: {
    core: ['#f59e0b', '#ef4444', '#f97316'],
    glow: 'rgba(245,158,11,0.65)',
    glowOuter: 'rgba(239,68,68,0.25)',
    particle: '#fcd34d',
    ring: ['#fbbf24', '#ef4444'],
    accent: '#fde68a',
  },
};

// ---------------------------------------------------------------------------
// Keyframe strings (injected once via <style>)
// ---------------------------------------------------------------------------
const KEYFRAMES = `
@keyframes jarvis-ring-rotate {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes jarvis-ring-rotate-reverse {
  from { transform: rotate(360deg); }
  to   { transform: rotate(0deg); }
}
@keyframes jarvis-particle-orbit {
  from { transform: rotate(var(--start)) translateX(var(--radius)) rotate(calc(-1 * var(--start))); opacity: var(--op-start); }
  50%  { opacity: 1; }
  to   { transform: rotate(calc(var(--start) + 360deg)) translateX(var(--radius)) rotate(calc(-1 * (var(--start) + 360deg))); opacity: var(--op-start); }
}
@keyframes jarvis-ripple {
  0%   { transform: scale(1); opacity: 0.6; }
  100% { transform: scale(2.5); opacity: 0; }
}
@keyframes jarvis-shimmer {
  0%, 100% { opacity: 0.12; transform: rotate(0deg) scale(1); }
  50%      { opacity: 0.5;  transform: rotate(180deg) scale(1.1); }
}
@keyframes jarvis-waveform {
  0%, 100% { border-radius: 50%; }
  20%  { border-radius: 47% 53% 49% 51% / 51% 49% 53% 47%; }
  40%  { border-radius: 52% 48% 51% 49% / 48% 52% 49% 51%; }
  60%  { border-radius: 49% 51% 47% 53% / 53% 47% 51% 49%; }
  80%  { border-radius: 51% 49% 53% 47% / 47% 53% 48% 52%; }
}
@keyframes jarvis-burst-ray {
  0%   { transform: scaleY(0.2) scaleX(1); opacity: 1; }
  40%  { transform: scaleY(2.2) scaleX(0.3); opacity: 0.7; }
  100% { transform: scaleY(0.2) scaleX(1); opacity: 0; }
}
@keyframes jarvis-inner-glow-rotate {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes jarvis-arc-dash {
  from { stroke-dashoffset: 0; }
  to   { stroke-dashoffset: -251; }
}
@keyframes jarvis-pulse-ring {
  0%, 100% { transform: scale(1); opacity: 0.3; }
  50%      { transform: scale(1.08); opacity: 0.6; }
}
@keyframes jarvis-float {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-3px); }
}
`;

// ---------------------------------------------------------------------------
// Framer-motion variants for the core orb
// ---------------------------------------------------------------------------
const orbVariants: Variants = {
  idle: {
    scale: [0.96, 1.04, 0.96],
    transition: {
      scale: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
    },
  },
  listening: {
    scale: 1.12,
    transition: { type: 'spring', stiffness: 180, damping: 14 },
  },
  thinking: {
    scale: [1, 1.05, 1],
    transition: {
      scale: { duration: 1.4, repeat: Infinity, ease: 'easeInOut' },
    },
  },
  speaking: {
    scale: [1, 1.08, 1],
    transition: {
      scale: { duration: 0.7, repeat: Infinity, ease: 'easeInOut' },
    },
  },
  acting: {
    scale: [1, 1.3, 1],
    transition: {
      scale: { duration: 0.4, ease: 'easeOut' },
    },
  },
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Orbiting particles with size variation and glow trails */
function Particles({
  count,
  color,
  accentColor,
  size,
  duration,
}: {
  count: number;
  color: string;
  accentColor: string;
  size: number;
  duration: number;
}) {
  const particles = useMemo(() => {
    const baseRadius = size * 0.52;
    return Array.from({ length: count }, (_, i) => {
      const startDeg = (360 / count) * i + (i % 2 === 0 ? 0 : 15);
      const radius = baseRadius + (i % 3) * (size * 0.06);
      const dotSize = Math.max(2.5, size * 0.025 + (i % 3) * 1.5);
      const isAccent = i % 3 === 0;
      const opStart = 0.4 + (i % 3) * 0.2;
      return { id: i, startDeg, radius, dotSize, isAccent, opStart };
    });
  }, [count, size]);

  return (
    <>
      {particles.map((p) => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            width: p.dotSize,
            height: p.dotSize,
            borderRadius: '50%',
            background: p.isAccent ? accentColor : color,
            boxShadow: `0 0 ${p.dotSize * 3}px ${p.dotSize}px ${p.isAccent ? accentColor : color}`,
            top: '50%',
            left: '50%',
            marginTop: -(p.dotSize / 2),
            marginLeft: -(p.dotSize / 2),
            ['--start' as string]: `${p.startDeg}deg`,
            ['--radius' as string]: `${p.radius}px`,
            ['--op-start' as string]: `${p.opStart}`,
            animation: `jarvis-particle-orbit ${duration + (p.id % 3) * 0.8}s linear infinite`,
            willChange: 'transform, opacity',
          }}
        />
      ))}
    </>
  );
}

/** SVG arc rings — much more polished than simple border rings */
function ArcRings({
  size,
  colors,
  duration,
  ringCount,
}: {
  size: number;
  colors: string[];
  duration: number;
  ringCount: number;
}) {
  const rings = useMemo(() => {
    return Array.from({ length: ringCount }, (_, i) => {
      const radius = (size / 2) * (1.15 + i * 0.14);
      const circumference = 2 * Math.PI * radius;
      const dashLen = circumference * (0.2 + (i % 3) * 0.1);
      const gapLen = circumference * (0.1 + (i % 2) * 0.08);
      const strokeWidth = Math.max(1, 2.5 - i * 0.4);
      const opacity = 0.6 - i * 0.08;
      const reverse = i % 2 === 1;
      const speed = duration + i * 1.5;
      return { id: i, radius, circumference, dashLen, gapLen, strokeWidth, opacity, reverse, speed, color: colors[i % colors.length] };
    });
  }, [size, colors, duration, ringCount]);

  const svgSize = size * 1.8;

  return (
    <svg
      width={svgSize}
      height={svgSize}
      viewBox={`0 0 ${svgSize} ${svgSize}`}
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        marginTop: -svgSize / 2,
        marginLeft: -svgSize / 2,
        pointerEvents: 'none',
      }}
    >
      {rings.map((r) => (
        <circle
          key={r.id}
          cx={svgSize / 2}
          cy={svgSize / 2}
          r={r.radius}
          fill="none"
          stroke={r.color}
          strokeWidth={r.strokeWidth}
          strokeDasharray={`${r.dashLen} ${r.gapLen}`}
          strokeLinecap="round"
          opacity={r.opacity}
          style={{
            transformOrigin: '50% 50%',
            animation: `${r.reverse ? 'jarvis-ring-rotate-reverse' : 'jarvis-ring-rotate'} ${r.speed}s linear infinite`,
            willChange: 'transform',
          }}
        />
      ))}
    </svg>
  );
}

/** Ripple rings that emanate outward (for "listening" state) */
function Ripples({ size, color }: { size: number; color: string }) {
  return (
    <>
      {[0, 0.6, 1.2, 1.8].map((delay, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: size * 0.88,
            height: size * 0.88,
            top: '50%',
            left: '50%',
            marginTop: -(size * 0.88) / 2,
            marginLeft: -(size * 0.88) / 2,
            borderRadius: '50%',
            border: `${1.5 - i * 0.2}px solid ${color}`,
            opacity: 0,
            animation: `jarvis-ripple 2s ${delay}s ease-out infinite`,
            willChange: 'transform, opacity',
          }}
        />
      ))}
    </>
  );
}

/** Inner shimmer overlay (for "thinking" state) — dual layer */
function Shimmer({ size, colors }: { size: number; colors: string[] }) {
  return (
    <>
      <div
        style={{
          position: 'absolute',
          width: size * 0.75,
          height: size * 0.75,
          top: '50%',
          left: '50%',
          marginTop: -(size * 0.75) / 2,
          marginLeft: -(size * 0.75) / 2,
          borderRadius: '50%',
          background: `conic-gradient(from 0deg, transparent, ${colors[0]}55, transparent 35%, ${colors[1]}44, transparent 65%, ${colors[2] || colors[0]}33, transparent)`,
          animation: 'jarvis-shimmer 2.5s ease-in-out infinite',
          willChange: 'transform, opacity',
          pointerEvents: 'none' as const,
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: size * 0.55,
          height: size * 0.55,
          top: '50%',
          left: '50%',
          marginTop: -(size * 0.55) / 2,
          marginLeft: -(size * 0.55) / 2,
          borderRadius: '50%',
          background: `conic-gradient(from 180deg, transparent, ${colors[1]}66, transparent 40%)`,
          animation: 'jarvis-shimmer 1.8s 0.5s ease-in-out infinite reverse',
          willChange: 'transform, opacity',
          pointerEvents: 'none' as const,
        }}
      />
    </>
  );
}

/** Burst rays (for "acting" state) — more dramatic */
function BurstRays({ size, color, accent }: { size: number; color: string; accent: string }) {
  const rayCount = 16;
  return (
    <>
      {Array.from({ length: rayCount }, (_, i) => {
        const angle = (360 / rayCount) * i;
        const isLong = i % 3 === 0;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: isLong ? 2.5 : 1.5,
              height: isLong ? size * 0.6 : size * 0.4,
              background: `linear-gradient(to top, ${i % 2 === 0 ? color : accent}, transparent)`,
              top: '50%',
              left: '50%',
              marginLeft: isLong ? -1.25 : -0.75,
              transformOrigin: '50% 0%',
              transform: `rotate(${angle}deg)`,
              opacity: 0,
              animation: `jarvis-burst-ray 0.7s ${i * 0.02}s ease-out forwards`,
              willChange: 'transform, opacity',
            }}
          />
        );
      })}
    </>
  );
}

/** Ambient glow pulse behind the orb */
function AmbientGlow({ size, color, glowOuter }: { size: number; color: string; glowOuter: string }) {
  return (
    <div
      style={{
        position: 'absolute',
        width: size * 1.5,
        height: size * 1.5,
        top: '50%',
        left: '50%',
        marginTop: -(size * 1.5) / 2,
        marginLeft: -(size * 1.5) / 2,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${color} 0%, ${glowOuter} 40%, transparent 70%)`,
        animation: 'jarvis-pulse-ring 3s ease-in-out infinite',
        pointerEvents: 'none',
        willChange: 'transform, opacity',
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function JarvisOrb({
  state,
  size: sizeProp = 'md',
  onClick,
  className = '',
}: JarvisOrbProps) {
  const px = SIZES[sizeProp];
  const colors = STATE_COLORS[state];

  // Derived animation params per-state
  const particleCount = state === 'thinking' ? 10 : state === 'speaking' ? 8 : state === 'listening' ? 6 : state === 'acting' ? 12 : 5;
  const particleDuration =
    state === 'thinking' ? 2.5 : state === 'speaking' ? 3 : state === 'listening' ? 4 : state === 'acting' ? 1.5 : 7;
  const ringDuration =
    state === 'thinking' ? 3 : state === 'listening' ? 5 : state === 'acting' ? 2 : 8;
  const ringCount =
    state === 'thinking' ? 4 : state === 'acting' ? 3 : state === 'speaking' ? 3 : 2;

  // Build multi-layer box-shadow for glow
  const glowIntensity = state === 'speaking' || state === 'acting' ? 1.3 : state === 'thinking' ? 1.1 : 1;
  const glowShadow = [
    `0 0 ${px * 0.12 * glowIntensity}px ${px * 0.04}px ${colors.glow}`,
    `0 0 ${px * 0.35 * glowIntensity}px ${px * 0.08}px ${colors.glow}`,
    `0 0 ${px * 0.65 * glowIntensity}px ${px * 0.16}px ${colors.glowOuter}`,
    `inset 0 0 ${px * 0.15}px ${px * 0.03}px ${colors.glow}`,
  ].join(', ');

  // Thinking state colour cycle via framer-motion
  const thinkingBgTransition =
    state === 'thinking'
      ? {
          background: [
            `radial-gradient(circle at 38% 38%, ${colors.core[0]} 0%, ${colors.core[1]} 45%, ${colors.core[2]} 80%, transparent 100%)`,
            `radial-gradient(circle at 62% 38%, ${colors.core[1]} 0%, ${colors.core[2]} 45%, ${colors.core[0]} 80%, transparent 100%)`,
            `radial-gradient(circle at 50% 60%, ${colors.core[2]} 0%, ${colors.core[0]} 45%, ${colors.core[1]} 80%, transparent 100%)`,
            `radial-gradient(circle at 38% 38%, ${colors.core[0]} 0%, ${colors.core[1]} 45%, ${colors.core[2]} 80%, transparent 100%)`,
          ],
          transition: { background: { duration: 3.5, repeat: Infinity, ease: 'easeInOut' as Easing } },
        }
      : undefined;

  const coreBg =
    state !== 'thinking'
      ? `radial-gradient(circle at 38% 38%, ${colors.core[0]} 0%, ${colors.core[1]} 45%, ${colors.core[2]} 80%, transparent 100%)`
      : undefined;

  return (
    <>
      {/* Inject keyframes once */}
      <style>{KEYFRAMES}</style>

      {/* Outer wrapper */}
      <div
        className={className}
        style={{
          position: 'relative',
          width: px * 1.7,
          height: px * 1.7,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: onClick ? 'pointer' : 'default',
          animation: state === 'idle' ? 'jarvis-float 5s ease-in-out infinite' : undefined,
        }}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={
          onClick
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onClick();
                }
              }
            : undefined
        }
      >
        {/* --- Ambient glow behind everything --- */}
        <AmbientGlow size={px} color={colors.glow} glowOuter={colors.glowOuter} />

        {/* --- SVG Arc rings --- */}
        <ArcRings
          size={px}
          colors={colors.ring}
          duration={ringDuration}
          ringCount={ringCount}
        />

        {/* --- Ripples (listening) --- */}
        {state === 'listening' && <Ripples size={px} color={colors.glow} />}

        {/* --- Burst rays (acting) --- */}
        {state === 'acting' && <BurstRays size={px} color={colors.particle} accent={colors.accent} />}

        {/* --- Orbiting particles --- */}
        <Particles
          count={particleCount}
          color={colors.particle}
          accentColor={colors.accent}
          size={px}
          duration={particleDuration}
        />

        {/* --- Core orb --- */}
        <motion.div
          variants={orbVariants}
          animate={state}
          {...(thinkingBgTransition ?? {})}
          style={{
            position: 'relative',
            width: px,
            height: px,
            borderRadius: '50%',
            background: coreBg,
            boxShadow: glowShadow,
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            willChange: 'transform',
            animation:
              state === 'speaking'
                ? 'jarvis-waveform 1.4s ease-in-out infinite'
                : undefined,
            border: `1px solid rgba(255,255,255,0.1)`,
            overflow: 'hidden',
          }}
        >
          {/* Inner rotating gradient layer */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background: `conic-gradient(from 0deg, transparent 30%, ${colors.core[1]}22 50%, transparent 70%)`,
              animation: `jarvis-inner-glow-rotate ${state === 'thinking' ? 2 : 6}s linear infinite`,
              willChange: 'transform',
              pointerEvents: 'none',
            }}
          />

          {/* Inner highlight spot — top-left specular */}
          <div
            style={{
              position: 'absolute',
              top: '12%',
              left: '18%',
              width: '40%',
              height: '30%',
              borderRadius: '50%',
              background:
                'radial-gradient(circle, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.05) 50%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          {/* Secondary highlight — bottom-right */}
          <div
            style={{
              position: 'absolute',
              bottom: '18%',
              right: '15%',
              width: '25%',
              height: '20%',
              borderRadius: '50%',
              background:
                `radial-gradient(circle, ${colors.accent}15 0%, transparent 70%)`,
              pointerEvents: 'none',
            }}
          />

          {/* Shimmer (thinking) */}
          {state === 'thinking' && (
            <Shimmer size={px} colors={colors.core} />
          )}
        </motion.div>
      </div>
    </>
  );
}
