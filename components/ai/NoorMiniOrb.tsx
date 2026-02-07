// Floating mini orb — persistent Noor presence across all views
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { View } from '../../types';

interface NoorMiniOrbProps {
  onNavigateToAI: () => void;
  hasNotification?: boolean;
  currentView: View;
}

const NoorMiniOrb: React.FC<NoorMiniOrbProps> = ({ onNavigateToAI, hasNotification, currentView }) => {
  const [isHovered, setIsHovered] = useState(false);

  // Don't show on AI view itself
  if (currentView === View.AIAssistant) return null;

  return (
    <motion.div
      className="fixed bottom-24 right-4 md:bottom-8 md:right-8 z-50"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 1, type: 'spring', stiffness: 200 }}
    >
      {/* Tooltip */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, x: 10, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 10, scale: 0.9 }}
            className="absolute right-full mr-3 top-1/2 -translate-y-1/2 whitespace-nowrap"
          >
            <div className="px-3 py-1.5 bg-slate-800 text-noor-300 text-xs font-medium rounded-lg border border-noor-700/30 shadow-lg">
              Ask Noor
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={onNavigateToAI}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="relative w-12 h-12 rounded-full bg-gradient-to-br from-noor-600 to-noor-700 shadow-lg shadow-noor-900/40 hover:shadow-noor-600/30 hover:shadow-xl transition-all duration-300 group animate-mini-orb-pulse"
        aria-label="Open Noor AI"
      >
        {/* Inner glow */}
        <div className="absolute inset-1 rounded-full bg-gradient-to-br from-noor-400/40 to-transparent" />

        {/* Core icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <svg className="w-5 h-5 text-white group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>

        {/* Notification badge */}
        {hasNotification && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-slate-900 flex items-center justify-center"
          >
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
          </motion.div>
        )}

        {/* Outer ring animation */}
        <div className="absolute -inset-1 rounded-full border border-noor-500/20 group-hover:border-noor-400/40 transition-colors" />
      </button>
    </motion.div>
  );
};

export default NoorMiniOrb;
