// MeetNoorOnboarding — First-time intro for Noor AI
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import JarvisOrb from './JarvisOrb';

interface MeetNoorOnboardingProps {
  onComplete: () => void;
}

const steps = [
  {
    title: "Meet Noor",
    description: "Noor is your intelligent AI companion. She knows your tasks, prayers, habits, and goals — and helps you stay on track.",
    orbState: 'idle' as const,
  },
  {
    title: "She Listens",
    description: "Tap the orb or use the microphone to talk to Noor. Ask her anything — from planning your week to tracking your spiritual journey.",
    orbState: 'listening' as const,
  },
  {
    title: "She Thinks",
    description: "Noor analyzes your data, notices patterns, and gives you personalized insights. She remembers your conversations and goals.",
    orbState: 'thinking' as const,
  },
  {
    title: "She Acts",
    description: 'Say "Add a task" or "Log my prayer" and Noor will do it for you. She can create tasks, schedule focus sessions, and more.',
    orbState: 'acting' as const,
  },
];

const MeetNoorOnboarding: React.FC<MeetNoorOnboardingProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-6"
    >
      {/* Orb */}
      <motion.div
        key={currentStep}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200 }}
        className="mb-8"
      >
        <JarvisOrb state={step.orbState} size="lg" />
      </motion.div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="text-center max-w-sm"
        >
          <h2 className="text-2xl font-bold text-white mb-3">{step.title}</h2>
          <p className="text-slate-400 text-sm leading-relaxed">{step.description}</p>
        </motion.div>
      </AnimatePresence>

      {/* Step indicators */}
      <div className="flex gap-2 mt-8 mb-6">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === currentStep ? 'w-8 bg-noor-400' : i < currentStep ? 'w-4 bg-noor-600' : 'w-4 bg-slate-700'
            }`}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {currentStep > 0 && (
          <button
            onClick={() => setCurrentStep(prev => prev - 1)}
            className="px-6 py-2.5 rounded-xl text-sm font-medium text-slate-400 bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            Back
          </button>
        )}
        <button
          onClick={() => {
            if (isLast) onComplete();
            else setCurrentStep(prev => prev + 1);
          }}
          className="px-8 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-noor-600 to-noor-500 hover:from-noor-500 hover:to-noor-400 transition-all shadow-lg shadow-noor-900/30"
        >
          {isLast ? "Let's Go!" : 'Next'}
        </button>
      </div>

      {/* Skip */}
      <button
        onClick={onComplete}
        className="mt-4 text-xs text-slate-600 hover:text-slate-400 transition-colors"
      >
        Skip intro
      </button>
    </motion.div>
  );
};

export default MeetNoorOnboarding;
