// Action confirmation dialog — shows when Noor wants to execute an action
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AIAction, AIActionResult } from '../../types';

interface ActionConfirmationProps {
  actions: AIAction[];
  results: AIActionResult[];
  onConfirm: (action: AIAction) => void;
  onDismiss: (action: AIAction) => void;
  isExecuting: boolean;
}

const actionIcons: Record<string, string> = {
  createTask: '📝',
  completeTask: '✅',
  rescheduleTask: '📅',
  logPrayer: '🤲',
  logQuranPages: '📖',
  startPomodoro: '🎯',
  createStudyRoom: '🌳',
};

const ActionConfirmation: React.FC<ActionConfirmationProps> = ({
  actions,
  results,
  onConfirm,
  onDismiss,
  isExecuting,
}) => {
  if (actions.length === 0 && results.length === 0) return null;

  return (
    <div className="space-y-2 my-3">
      {/* Pending actions needing confirmation */}
      <AnimatePresence>
        {actions.map((action, i) => (
          <motion.div
            key={`action-${i}-${action.type}`}
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex items-center gap-3 p-3 rounded-xl bg-noor-900/40 border border-noor-700/30 backdrop-blur-sm"
          >
            <span className="text-xl flex-shrink-0">{actionIcons[action.type] || '⚡'}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-noor-200 font-medium truncate">{action.description}</p>
              <p className="text-xs text-noor-400">Noor wants to do this for you</p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => onConfirm(action)}
                disabled={isExecuting}
                className="px-3 py-1.5 text-xs font-medium bg-noor-600 hover:bg-noor-500 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {isExecuting ? '...' : 'Do it'}
              </button>
              <button
                onClick={() => onDismiss(action)}
                disabled={isExecuting}
                className="px-3 py-1.5 text-xs font-medium bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors disabled:opacity-50"
              >
                Skip
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Completed action results */}
      <AnimatePresence>
        {results.map((result, i) => (
          <motion.div
            key={`result-${i}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`flex items-center gap-2 p-2 rounded-lg text-xs ${
              result.success
                ? 'bg-emerald-900/30 border border-emerald-700/30 text-emerald-300'
                : 'bg-red-900/30 border border-red-700/30 text-red-300'
            }`}
          >
            <span>{result.success ? '✓' : '✗'}</span>
            <span>{result.message}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default ActionConfirmation;
