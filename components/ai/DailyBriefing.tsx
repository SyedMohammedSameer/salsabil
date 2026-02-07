// DailyBriefing — Structured morning/evening briefing card
import React from 'react';
import { motion } from 'framer-motion';
import type { DailyBriefing as DailyBriefingType } from '../../types';

interface DailyBriefingProps {
  briefing: DailyBriefingType;
  onActionClick?: (actionDescription: string) => void;
  onDismiss?: () => void;
}

const typeConfig = {
  morning: { icon: '🌅', label: 'Morning Briefing', gradient: 'from-amber-500/20 to-orange-500/20', border: 'border-amber-700/30' },
  evening: { icon: '🌙', label: 'Evening Reflection', gradient: 'from-indigo-500/20 to-purple-500/20', border: 'border-indigo-700/30' },
  weekly: { icon: '📊', label: 'Weekly Report', gradient: 'from-noor-500/20 to-cyan-500/20', border: 'border-noor-700/30' },
};

const DailyBriefing: React.FC<DailyBriefingProps> = ({ briefing, onActionClick, onDismiss }) => {
  const config = typeConfig[briefing.type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className={`rounded-2xl border ${config.border} bg-gradient-to-br ${config.gradient} backdrop-blur-sm p-4 space-y-3`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{config.icon}</span>
          <h3 className="text-sm font-semibold text-slate-200">{config.label}</h3>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-slate-500 hover:text-slate-300 transition-colors p-1"
            aria-label="Dismiss briefing"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Greeting */}
      <p className="text-sm text-slate-300 leading-relaxed">{briefing.greeting}</p>

      {/* Sections */}
      <div className="space-y-2">
        {briefing.sections.map((section, i) => (
          <div key={i} className="bg-slate-800/40 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              {section.icon && <span className="text-sm">{section.icon}</span>}
              <h4 className="text-xs font-semibold text-noor-300 uppercase tracking-wide">{section.title}</h4>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">{section.content}</p>
          </div>
        ))}
      </div>

      {/* Suggested Actions */}
      {briefing.suggestedActions.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Suggested Actions</p>
          {briefing.suggestedActions.map((action, i) => (
            <button
              key={i}
              onClick={() => onActionClick?.(action.description)}
              className="w-full text-left flex items-center gap-2 p-2 rounded-lg bg-noor-900/30 border border-noor-700/20 hover:bg-noor-800/40 hover:border-noor-600/30 transition-all text-sm text-noor-300"
            >
              <span className="text-noor-400">→</span>
              <span>{action.description}</span>
            </button>
          ))}
        </div>
      )}

      {/* Timestamp */}
      <p className="text-xs text-slate-600 text-right">
        {new Date(briefing.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </p>
    </motion.div>
  );
};

export default DailyBriefing;
