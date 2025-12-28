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

  useEffect(() => {
    if (!currentUser?.uid) return;

    const unsubscribe = firebaseService.setupUserSettingsListener(currentUser.uid, (settings) => {
      setUserSettings(settings);
    });

    return () => unsubscribe();
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
    if (!currentUser?.uid || !userSettings) return;

    setIsActive(true);
    setSessionStartTime(new Date());

    // Enable focus mode
    await firebaseService.saveUserSettings(currentUser.uid, {
      focusMode: { enabled: true }
    });

    // AI welcome message
    setAiMessages([{
      role: 'ai',
      content: `Focus session started! I'll be here if you need support. Stay strong! 💪`
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

    if (currentUser?.uid) {
      await firebaseService.saveUserSettings(currentUser.uid, {
        focusMode: { enabled: false }
      });
    }
  };

  const handleSessionEnd = async () => {
    setIsActive(false);

    if (currentUser?.uid) {
      await firebaseService.saveUserSettings(currentUser.uid, {
        focusMode: { enabled: false }
      });
    }

    // AI wrap-up
    const wrapUpMessage = `🎉 Session complete! Great work staying focused for ${timerMinutes} minutes. How did it go? What did you accomplish?`;
    setAiMessages(prev => [...prev, { role: 'ai', content: wrapUpMessage }]);
  };

  const handleAiSend = async () => {
    if (!aiInput.trim() || aiLoading) return;

    const userMessage = aiInput;
    setAiInput('');
    setAiMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setAiLoading(true);

    try {
      const context = `User is in a solo focus session. ${isActive ? 'Session is active.' : 'Session ended.'} Provide brief, supportive responses.`;
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-indigo-900/20 dark:to-purple-900/20 p-2 lg:p-4">
      {/* Header */}
      <div className="mb-3">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center mr-2">
            <span className="text-white text-lg">🧘</span>
          </div>
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-slate-800 dark:text-slate-200">Solo Room</h1>
            <p className="text-xs text-slate-600 dark:text-slate-400">Your private space for deep focus</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-3">
        {/* Focus Timer */}
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-lg p-4 border border-white/20">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center">
            <span className="mr-2">⏱️</span>
            Focus Timer
          </h3>

          {/* Timer Display */}
          <div className="text-center mb-4">
            <div className="relative inline-block">
              <svg className="transform -rotate-90" width="180" height="180">
                <circle
                  cx="90"
                  cy="90"
                  r="80"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-slate-200 dark:text-slate-700"
                />
                <circle
                  cx="90"
                  cy="90"
                  r="80"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeLinecap="round"
                  className="text-indigo-600 dark:text-indigo-400 transition-all"
                  strokeDasharray={`${2 * Math.PI * 80}`}
                  strokeDashoffset={`${2 * Math.PI * 80 * (1 - progress / 100)}`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-4xl font-bold text-slate-800 dark:text-slate-200">
                  {formatTime(timeLeft)}
                </div>
              </div>
            </div>
          </div>

          {/* Timer Controls */}
          {!isActive && timeLeft === timerMinutes * 60 ? (
            <div className="space-y-2">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Session Duration
                </label>
                <select
                  value={timerMinutes}
                  onChange={(e) => {
                    const mins = parseInt(e.target.value);
                    setTimerMinutes(mins);
                    setTimeLeft(mins * 60);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded text-sm"
                >
                  <option value={15}>15 minutes</option>
                  <option value={25}>25 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>60 minutes</option>
                  <option value={90}>90 minutes</option>
                </select>
              </div>
              <button
                onClick={handleStart}
                className="w-full px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg transition-all"
              >
                Start Focus Session
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {isActive ? (
                <button
                  onClick={handlePause}
                  className="w-full px-4 py-3 bg-orange-500 text-white rounded-lg font-medium hover:shadow-lg transition-all"
                >
                  Pause
                </button>
              ) : timeLeft > 0 ? (
                <button
                  onClick={handleResume}
                  className="w-full px-4 py-3 bg-green-500 text-white rounded-lg font-medium hover:shadow-lg transition-all"
                >
                  Resume
                </button>
              ) : null}
              <button
                onClick={handleReset}
                className="w-full px-4 py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-300 dark:hover:bg-slate-600"
              >
                Reset
              </button>
            </div>
          )}

          {userSettings?.focusMode.enabled && (
            <div className="mt-3 p-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded text-center">
              <span className="text-indigo-700 dark:text-indigo-300 text-xs font-medium">
                🔕 Focus Mode Active - Notifications Paused
              </span>
            </div>
          )}
        </div>

        {/* AI Chat */}
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-lg p-4 border border-white/20 flex flex-col" style={{ height: '500px' }}>
          <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center">
            <span className="mr-2">💬</span>
            AI Support
          </h3>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto mb-3 space-y-2">
            {aiMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                    msg.role === 'user'
                      ? 'bg-indigo-500 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {aiLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-100 dark:bg-slate-700 px-3 py-2 rounded-lg text-sm">
                  <span className="animate-pulse">Thinking...</span>
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
              placeholder="Ask for support..."
              className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              disabled={aiLoading}
            />
            <button
              onClick={handleAiSend}
              disabled={aiLoading || !aiInput.trim()}
              className="px-4 py-2 bg-indigo-500 text-white rounded font-medium text-sm hover:bg-indigo-600 disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      </div>

      {/* Reflection */}
      <div className="mt-3 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-lg p-4 border border-white/20">
        <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center">
          <span className="mr-2">📝</span>
          Quick Reflection
        </h3>
        <textarea
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          placeholder="How did your session go? What did you accomplish?"
          rows={3}
          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
        />
        <div className="text-xs text-slate-500 dark:text-slate-500 mt-1">
          Use this space to capture insights from your session
        </div>
      </div>
    </div>
  );
};

export default SoloRoomView;
