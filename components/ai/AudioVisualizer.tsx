// AudioVisualizer — Real-time voice waveform ring around the orb
import React from 'react';
import { motion } from 'framer-motion';

interface AudioVisualizerProps {
  frequencies: number[];
  isActive: boolean;
  size: number; // diameter in px
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ frequencies, isActive, size }) => {
  if (!isActive) return null;

  const barCount = frequencies.length;
  const radius = size / 2 + 8; // Slightly outside the orb
  const barWidth = 3;
  const maxBarHeight = 20;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="absolute inset-0 pointer-events-none"
      style={{ width: size + 40, height: size + 40, left: -20, top: -20 }}
    >
      <svg
        width={size + 40}
        height={size + 40}
        viewBox={`0 0 ${size + 40} ${size + 40}`}
        className="absolute inset-0"
      >
        {frequencies.map((freq, i) => {
          const angle = (i / barCount) * Math.PI * 2 - Math.PI / 2;
          const barHeight = Math.max(2, freq * maxBarHeight);
          const cx = (size + 40) / 2;
          const cy = (size + 40) / 2;

          const x1 = cx + Math.cos(angle) * radius;
          const y1 = cy + Math.sin(angle) * radius;
          const x2 = cx + Math.cos(angle) * (radius + barHeight);
          const y2 = cy + Math.sin(angle) * (radius + barHeight);

          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="rgba(6, 182, 212, 0.7)"
              strokeWidth={barWidth}
              strokeLinecap="round"
              style={{
                transition: 'all 0.05s ease-out',
                filter: freq > 0.5 ? 'drop-shadow(0 0 4px rgba(6, 182, 212, 0.5))' : 'none',
              }}
            />
          );
        })}
      </svg>
    </motion.div>
  );
};

export default AudioVisualizer;
