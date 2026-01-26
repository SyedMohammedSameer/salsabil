// BEAUTIFUL, PROFESSIONAL Solo Room Module
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import type { UserSettings } from '../types';
import * as firebaseService from '../services/firebaseService';
import * as GroqService from '../services/groqService';

const SoloRoomView: React.FC = () => {
  const { currentUser } = useAuth();
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [timerMinutes, setTimerMinutes] = useState(25);
  const [timeLeft, setTimeLeft] = useState(timerMinutes * 60);
  const [isActive, setIsActive] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);

  // AI Chat
  const [aiMessages, setAiMessages] = useState<{ role: 'user' | 'ai'; content: string }[]>([]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // Reflection
  const [reflection, setReflection] = useState('');

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasStartedSession = useRef(false);

  useEffect(() => {
    if (!currentUser?.uid) return;

    const unsubscribe = firebaseService.setupUserSettingsListener(currentUser.uid, (settings) => {
      setUserSettings(settings);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Cleanup focus mode when component unmounts if session was started
  useEffect(() => {
    return () => {
      if (hasStartedSession.current && currentUser?.uid) {
        // Disable focus mode when leaving the page
        firebaseService.saveUserSettings(currentUser.uid, {
          focusMode: { enabled: false }
        }).catch(error => {
          console.error('Failed to disable focus mode on unmount:', error);
        });
      }
    };
  }, [currentUser]);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleSessionEnd();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive, timeLeft]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages]);

  const handleStart = async () => {
    if (!currentUser?.uid) return;

    setIsActive(true);
    setSessionStartTime(new Date());
    hasStartedSession.current = true;

    // Enable focus mode
    try {
      await firebaseService.saveUserSettings(currentUser.uid, {
        focusMode: { enabled: true }
      });
    } catch (error) {
      console.error('Failed to enable focus mode:', error);
    }

    // AI welcome message
    setAiMessages([{
      role: 'ai',
      content: `🚀 Focus session started! I'm here to support you. Stay strong and focused! 💪`
    }]);
  };

  const handlePause = () => {
    setIsActive(false);
  };

  const handleResume = () => {
    setIsActive(true);
  };

  const handleReset = async () => {
    setIsActive(false);
    setTimeLeft(timerMinutes * 60);
    setSessionStartTime(null);
    hasStartedSession.current = false;

    if (currentUser?.uid) {
      try {
        await firebaseService.saveUserSettings(currentUser.uid, {
          focusMode: { enabled: false }
        });
      } catch (error) {
        console.error('Failed to disable focus mode:', error);
      }
    }
  };

  const handleSessionEnd = async () => {
    setIsActive(false);
    hasStartedSession.current = false;

    if (currentUser?.uid) {
      try {
        await firebaseService.saveUserSettings(currentUser.uid, {
          focusMode: { enabled: false }
        });
      } catch (error) {
        console.error('Failed to disable focus mode:', error);
      }
    }

    // AI wrap-up
    const wrapUpMessage = `🎉 Incredible work! You stayed focused for ${timerMinutes} minutes. That's dedication!

How did the session go? What did you accomplish?`;
    setAiMessages(prev => [...prev, { role: 'ai', content: wrapUpMessage }]);
  };

  const handleAiSend = async () => {
    if (!aiInput.trim() || aiLoading) return;

    const userMessage = aiInput;
    setAiInput('');
    setAiMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setAiLoading(true);

    try {
      const context = `User is in a solo focus session. ${isActive ? 'Session is active.' : 'Session ended.'} Provide brief, supportive, encouraging responses. Be warm and motivating.`;
      const response = await GroqService.getEnhancedAiResponse(
        userMessage,
        context,
        aiMessages.map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] }))
      );

      setAiMessages(prev => [...prev, { role: 'ai', content: response }]);
    } catch (error) {
      setAiMessages(prev => [...prev, {
        role: 'ai',
        content: 'I had trouble processing that. Stay focused on your session! 💪'
      }]);
    } finally {
      setAiLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((timerMinutes * 60 - timeLeft) / (timerMinutes * 60)) * 100;

  return (
    <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-slate-900 dark:via-indigo-900/20 dark:to-slate-900 p-4 md:p-6" style={{ minHeight: '600px' }}>

      {/* Hero Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-3xl">🧘</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Solo Room
              </h1>
              <p className="text-slate-600 dark:text-slate-400">Your sanctuary for deep focus</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border-l-4 border-indigo-500">
            <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Session Duration</div>
            <div className="text-3xl font-bold text-indigo-600">{timerMinutes} min</div>
            <div className="text-xs text-slate-500 mt-1">Selected</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border-l-4 border-purple-500">
            <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Status</div>
            <div className="text-3xl font-bold text-purple-600">{isActive ? '▶️' : '⏸️'}</div>
            <div className="text-xs text-slate-500 mt-1">{isActive ? 'Active' : 'Paused'}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border-l-4 border-pink-500">
            <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Progress</div>
            <div className="text-3xl font-bold text-pink-600">{Math.round(progress)}%</div>
            <div className="text-xs text-slate-500 mt-1">Complete</div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Focus Timer */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg">
          <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-6 flex items-center">
            <span className="mr-3 text-3xl">⏱️</span>
            Focus Timer
          </h3>

          {/* Timer Display */}
          <div className="text-center mb-8">
            <div className="relative inline-block">
              <svg className="transform -rotate-90" width="220" height="220">
                <circle
                  cx="110"
                  cy="110"
                  r="95"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="12"
                  className="text-slate-200 dark:text-slate-700"
                />
                <circle
                  cx="110"
                  cy="110"
                  r="95"
                  fill="none"
                  stroke="url(#gradient)"
                  strokeWidth="12"
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                  strokeDasharray={`${2 * Math.PI * 95}`}
                  strokeDashoffset={`${2 * Math.PI * 95 * (1 - progress / 100)}`}
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="50%" stopColor="#a855f7" />
                    <stop offset="100%" stopColor="#ec4899" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  {formatTime(timeLeft)}
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                  {Math.round(progress)}% complete
                </div>
              </div>
            </div>
          </div>

          {/* Timer Controls */}
          {!isActive && timeLeft === timerMinutes * 60 ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Session Duration
                </label>
                <select
                  value={timerMinutes}
                  onChange={(e) => {
                    const mins = parseInt(e.target.value);
                    setTimerMinutes(mins);
                    setTimeLeft(mins * 60);
                  }}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                >
                  <option value={15}>15 minutes - Quick Focus</option>
                  <option value={25}>25 minutes - Pomodoro</option>
                  <option value={45}>45 minutes - Deep Work</option>
                  <option value={60}>60 minutes - Extended Focus</option>
                  <option value={90}>90 minutes - Ultra Deep</option>
                </select>
              </div>
              <button
                onClick={handleStart}
                className="w-full px-6 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-bold text-lg hover:shadow-xl transform hover:scale-105 transition-all flex items-center justify-center space-x-2"
              >
                <span>🚀</span>
                <span>Start Focus Session</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {isActive ? (
                <button
                  onClick={handlePause}
                  className="w-full px-6 py-4 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-bold hover:shadow-xl transition-all flex items-center justify-center space-x-2"
                >
                  <span>⏸️</span>
                  <span>Pause Session</span>
                </button>
              ) : timeLeft > 0 ? (
                <button
                  onClick={handleResume}
                  className="w-full px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold hover:shadow-xl transition-all flex items-center justify-center space-x-2"
                >
                  <span>▶️</span>
                  <span>Resume Session</span>
                </button>
              ) : null}
              <button
                onClick={handleReset}
                className="w-full px-6 py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold hover:bg-slate-300 dark:hover:bg-slate-600 transition-all"
              >
                Reset Timer
              </button>
            </div>
          )}

          {userSettings?.focusMode?.enabled && (
            <div className="mt-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-2 border-indigo-300 dark:border-indigo-700 rounded-xl text-center">
              <span className="text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center space-x-2">
                <span>🔕</span>
                <span>Focus Mode Active - Notifications Paused</span>
              </span>
            </div>
          )}
        </div>

        {/* AI Chat */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg flex flex-col" style={{ height: '580px' }}>
          <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center">
            <span className="mr-3 text-3xl">💬</span>
            AI Support
          </h3>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto mb-4 space-y-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4">
            {aiMessages.length === 0 && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🤖</div>
                <p className="text-slate-600 dark:text-slate-400">Start your session and I'll be here to support you!</p>
              </div>
            )}
            {aiMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] px-4 py-3 rounded-2xl shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white'
                      : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-600'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {aiLoading && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-slate-700 px-4 py-3 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-600">
                  <span className="flex items-center space-x-2">
                    <span className="animate-pulse">💭</span>
                    <span className="animate-pulse">Thinking...</span>
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="flex space-x-2">
            <input
              type="text"
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAiSend()}
              placeholder="Ask for support, share progress..."
              className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              disabled={aiLoading}
            />
            <button
              onClick={handleAiSend}
              disabled={aiLoading || !aiInput.trim()}
              className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Send
            </button>
          </div>
        </div>
      </div>

      {/* Reflection */}
      <div className="mt-6 bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg">
        <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center">
          <span className="mr-3 text-3xl">📝</span>
          Session Reflection
        </h3>
        <textarea
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          placeholder="How did your session go? What did you accomplish? Any insights to capture?"
          rows={4}
          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
        />
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
          💡 Capture your thoughts, accomplishments, and learnings from this session
        </p>
      </div>
    </div>
  );
};

export default SoloRoomView;
