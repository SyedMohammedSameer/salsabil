// Ambient background with floating particles and constellation effect for Noor AI
import React, { useMemo } from 'react';
import type { NoorState } from '../../types';

interface NoorAmbientBackgroundProps {
  state: NoorState;
  children: React.ReactNode;
}

const NoorAmbientBackground: React.FC<NoorAmbientBackgroundProps> = ({ state, children }) => {
  // Generate stable particle positions
  const particles = useMemo(() =>
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1,
      delay: Math.random() * 5,
      duration: Math.random() * 10 + 15,
    })), []
  );

  const isActive = state === 'thinking' || state === 'speaking' || state === 'acting';

  return (
    <div className="relative w-full h-full overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-noor-950">
      {/* Animated gradient overlay */}
      <div
        className="absolute inset-0 opacity-30 animate-noor-bg-drift"
        style={{
          background: 'radial-gradient(ellipse at 20% 50%, rgba(6,182,212,0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(13,148,136,0.1) 0%, transparent 50%), radial-gradient(ellipse at 50% 80%, rgba(124,58,237,0.08) 0%, transparent 50%)',
          backgroundSize: '200% 200%',
        }}
      />

      {/* Floating particles */}
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: isActive ? 'rgba(6, 182, 212, 0.6)' : 'rgba(6, 182, 212, 0.3)',
            animation: `float ${p.duration}s ease-in-out infinite`,
            animationDelay: `${p.delay}s`,
            transition: 'background-color 0.5s ease',
            willChange: 'transform',
          }}
        />
      ))}

      {/* Grid lines overlay (subtle Jarvis HUD effect) */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(6,182,212,0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(6,182,212,0.5) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Content */}
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </div>
  );
};

export default NoorAmbientBackground;
