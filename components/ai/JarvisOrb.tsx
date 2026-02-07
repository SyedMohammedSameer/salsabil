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

// Colour palettes per-state
const STATE_COLORS = {
  idle: {
    core: '#0d9488',
    mid: '#06b6d4',
    glow: 'rgba(6,182,212,0.45)',
    glowOuter: 'rgba(13,148,136,0.18)',
    particle: '#22d3ee',
  },
  listening: {
    core: '#0891b2',
    mid: '#38bdf8',
    glow: 'rgba(56,189,248,0.55)',
    glowOuter: 'rgba(8,145,178,0.22)',
    particle: '#7dd3fc',
  },
  thinking: {
    core: '#7c3aed',
    mid: '#06b6d4',
    glow: 'rgba(124,58,237,0.50)',
    glowOuter: 'rgba(6,182,212,0.20)',
    particle: '#a78bfa',
  },
  speaking: {
    core: '#14b8a6',
    mid: '#22d3ee',
    glow: 'rgba(20,184,166,0.6)',
    glowOuter: 'rgba(34,211,238,0.25)',
    particle: '#5eead4',
  },
  acting: {
    core: '#f59e0b',
    mid: '#fbbf24',
    glow: 'rgba(245,158,11,0.6)',
    glowOuter: 'rgba(251,191,36,0.25)',
    particle: '#fcd34d',
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
  from { transform: rotate(var(--start)) translateX(var(--radius)) rotate(calc(-1 * var(--start))); }
  to   { transform: rotate(calc(var(--start) + 360deg)) translateX(var(--radius)) rotate(calc(-1 * (var(--start) + 360deg))); }
}
@keyframes jarvis-ripple {
  0%   { transform: scale(1); opacity: 0.6; }
  100% { transform: scale(2.2); opacity: 0; }
}
@keyframes jarvis-shimmer {
  0%, 100% { opacity: 0.15; transform: rotate(0deg) scale(1); }
  50%      { opacity: 0.4;  transform: rotate(180deg) scale(1.08); }
}
@keyframes jarvis-waveform {
  0%, 100% { border-radius: 50%; }
  25%  { border-radius: 48% 52% 50% 50% / 50% 50% 52% 48%; }
  50%  { border-radius: 50% 48% 52% 50% / 48% 52% 50% 50%; }
  75%  { border-radius: 52% 50% 48% 50% / 50% 48% 50% 52%; }
}
@keyframes jarvis-burst-ray {
  0%   { transform: scaleY(0.3) scaleX(1); opacity: 0.9; }
  60%  { transform: scaleY(1.8) scaleX(0.5); opacity: 0.5; }
  100% { transform: scaleY(0.3) scaleX(1); opacity: 0; }
}
`;

// ---------------------------------------------------------------------------
// Framer-motion variants for the core orb
// ---------------------------------------------------------------------------
const orbVariants: Variants = {
  idle: {
    scale: [0.97, 1.03, 0.97],
    transition: {
      scale: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
    },
  },
  listening: {
    scale: 1.1,
    transition: { type: 'spring', stiffness: 200, damping: 18 },
  },
  thinking: {
    scale: [1, 1.04, 1],
    transition: {
      scale: { duration: 1.6, repeat: Infinity, ease: 'easeInOut' },
    },
  },
  speaking: {
    scale: [1, 1.06, 1],
    transition: {
      scale: { duration: 0.8, repeat: Infinity, ease: 'easeInOut' },
    },
  },
  acting: {
    scale: [1, 1.25, 1],
    transition: {
      scale: { duration: 0.5, ease: 'easeOut' },
    },
  },
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Orbiting particles */
function Particles({
  count,
  color,
  size,
  duration,
}: {
  count: number;
  color: string;
  size: number;
  duration: number;
}) {
  const particles = useMemo(() => {
    const radius = size * 0.55;
    const dotSize = Math.max(3, size * 0.04);
    return Array.from({ length: count }, (_, i) => {
      const startDeg = (360 / count) * i;
      return { id: i, startDeg, radius, dotSize };
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
            background: color,
            boxShadow: `0 0 ${p.dotSize * 2}px ${color}`,
            top: '50%',
            left: '50%',
            marginTop: -(p.dotSize / 2),
            marginLeft: -(p.dotSize / 2),
            ['--start' as string]: `${p.startDeg}deg`,
            ['--radius' as string]: `${p.radius}px`,
            animation: `jarvis-particle-orbit ${duration}s linear infinite`,
            willChange: 'transform',
          }}
        />
      ))}
    </>
  );
}

/** Rotating ring with conic-gradient border */
function RotatingRing({
  size,
  color,
  duration,
  reverse = false,
  thickness = 2,
  opacity = 0.6,
  offset = 0,
}: {
  size: number;
  color: string;
  duration: number;
  reverse?: boolean;
  thickness?: number;
  opacity?: number;
  offset?: number;
}) {
  const ringSize = size + offset;
  return (
    <div
      style={{
        position: 'absolute',
        width: ringSize,
        height: ringSize,
        top: '50%',
        left: '50%',
        marginTop: -(ringSize / 2),
        marginLeft: -(ringSize / 2),
        borderRadius: '50%',
        border: `${thickness}px solid transparent`,
        backgroundClip: 'padding-box',
        opacity,
        willChange: 'transform',
        animation: `${reverse ? 'jarvis-ring-rotate-reverse' : 'jarvis-ring-rotate'} ${duration}s linear infinite`,
        // The visible ring — use a pseudo-like trick via box-shadow + border
        // We rely on a mask approach: the border is transparent but we paint
        // a conic gradient as the border image.
        backgroundImage: `conic-gradient(from 0deg, transparent, ${color}, transparent 70%)`,
        WebkitMask: `radial-gradient(farthest-side, transparent calc(100% - ${thickness}px - 1px), #fff calc(100% - ${thickness}px))`,
        mask: `radial-gradient(farthest-side, transparent calc(100% - ${thickness}px - 1px), #fff calc(100% - ${thickness}px))`,
      }}
    />
  );
}

/** Ripple rings that emanate outward (for "listening" state) */
function Ripples({ size, color }: { size: number; color: string }) {
  return (
    <>
      {[0, 0.8, 1.6].map((delay, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: size * 0.85,
            height: size * 0.85,
            top: '50%',
            left: '50%',
            marginTop: -(size * 0.85) / 2,
            marginLeft: -(size * 0.85) / 2,
            borderRadius: '50%',
            border: `1.5px solid ${color}`,
            opacity: 0,
            animation: `jarvis-ripple 2.4s ${delay}s ease-out infinite`,
            willChange: 'transform, opacity',
          }}
        />
      ))}
    </>
  );
}

/** Inner shimmer overlay (for "thinking" state) */
function Shimmer({ size, color }: { size: number; color: string }) {
  return (
    <div
      style={{
        position: 'absolute',
        width: size * 0.7,
        height: size * 0.7,
        top: '50%',
        left: '50%',
        marginTop: -(size * 0.7) / 2,
        marginLeft: -(size * 0.7) / 2,
        borderRadius: '50%',
        background: `conic-gradient(from 0deg, transparent, ${color}55, transparent 40%, ${color}33, transparent 70%)`,
        animation: 'jarvis-shimmer 2s ease-in-out infinite',
        willChange: 'transform, opacity',
        pointerEvents: 'none' as const,
      }}
    />
  );
}

/** Burst rays (for "acting" state) */
function BurstRays({ size, color }: { size: number; color: string }) {
  const rayCount = 12;
  return (
    <>
      {Array.from({ length: rayCount }, (_, i) => {
        const angle = (360 / rayCount) * i;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: 2,
              height: size * 0.5,
              background: `linear-gradient(to top, ${color}, transparent)`,
              top: '50%',
              left: '50%',
              marginLeft: -1,
              transformOrigin: '50% 0%',
              transform: `rotate(${angle}deg)`,
              opacity: 0,
              animation: `jarvis-burst-ray 0.8s ${i * 0.03}s ease-out forwards`,
              willChange: 'transform, opacity',
            }}
          />
        );
      })}
    </>
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
  const particleCount = state === 'thinking' || state === 'speaking' ? 6 : 4;
  const particleDuration =
    state === 'thinking' ? 2 : state === 'speaking' ? 3 : state === 'listening' ? 5 : 8;
  const ringDuration =
    state === 'thinking' ? 3 : state === 'listening' ? 5 : 8;

  // Build box-shadow for glow
  const glowShadow = [
    `0 0 ${px * 0.15}px ${px * 0.04}px ${colors.glow}`,
    `0 0 ${px * 0.4}px ${px * 0.08}px ${colors.glow}`,
    `0 0 ${px * 0.7}px ${px * 0.15}px ${colors.glowOuter}`,
    state === 'speaking'
      ? `0 0 ${px}px ${px * 0.25}px ${colors.glowOuter}`
      : '',
  ]
    .filter(Boolean)
    .join(', ');

  // Thinking state colour cycle via framer-motion
  const thinkingBgTransition =
    state === 'thinking'
      ? {
          background: [
            `radial-gradient(circle at 40% 40%, #0d9488 0%, #06b6d4 55%, transparent 80%)`,
            `radial-gradient(circle at 40% 40%, #7c3aed 0%, #a78bfa 55%, transparent 80%)`,
            `radial-gradient(circle at 40% 40%, #0d9488 0%, #06b6d4 55%, transparent 80%)`,
          ],
          transition: { background: { duration: 3, repeat: Infinity, ease: 'easeInOut' as Easing } },
        }
      : undefined;

  const coreBg =
    state !== 'thinking'
      ? `radial-gradient(circle at 40% 40%, ${colors.core} 0%, ${colors.mid} 55%, transparent 80%)`
      : undefined;

  return (
    <>
      {/* Inject keyframes once */}
      <style>{KEYFRAMES}</style>

      {/* Outer wrapper — holds everything, defines the interaction area */}
      <div
        className={className}
        style={{
          position: 'relative',
          width: px * 1.6,
          height: px * 1.6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: onClick ? 'pointer' : 'default',
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
        {/* --- Rotating ring(s) --- */}
        <RotatingRing
          size={px}
          color={colors.mid}
          duration={ringDuration}
          thickness={Math.max(1.5, px * 0.015)}
          opacity={0.5}
          offset={px * 0.28}
        />

        {state === 'thinking' && (
          <>
            <RotatingRing
              size={px}
              color={colors.core}
              duration={ringDuration * 0.6}
              reverse
              thickness={Math.max(1, px * 0.012)}
              opacity={0.4}
              offset={px * 0.42}
            />
            <RotatingRing
              size={px}
              color={colors.particle}
              duration={ringDuration * 1.4}
              thickness={Math.max(1, px * 0.01)}
              opacity={0.3}
              offset={px * 0.55}
            />
          </>
        )}

        {/* --- Ripples (listening) --- */}
        {state === 'listening' && <Ripples size={px} color={colors.glow} />}

        {/* --- Burst rays (acting) --- */}
        {state === 'acting' && <BurstRays size={px} color={colors.particle} />}

        {/* --- Orbiting particles --- */}
        <Particles
          count={particleCount}
          color={colors.particle}
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
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            willChange: 'transform',
            animation:
              state === 'speaking'
                ? 'jarvis-waveform 1.6s ease-in-out infinite'
                : undefined,
            // Subtle inner glass highlight
            border: `1px solid rgba(255,255,255,0.08)`,
          }}
        >
          {/* Inner highlight spot */}
          <div
            style={{
              position: 'absolute',
              top: '15%',
              left: '22%',
              width: '35%',
              height: '25%',
              borderRadius: '50%',
              background:
                'radial-gradient(circle, rgba(255,255,255,0.18) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          {/* Shimmer (thinking) */}
          {state === 'thinking' && (
            <Shimmer size={px} color={colors.core} />
          )}
        </motion.div>
      </div>
    </>
  );
}
