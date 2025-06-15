// Mobile-Optimized PomodoroView.tsx with touch-friendly controls
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PomodoroMode, PomodoroSettings } from '../types';
import { PlayIcon, PauseIcon, SkipIcon, EditIcon, CloseIcon } from './icons/NavIcons';
import * as firebaseService from '../services/firebaseService';
import { DEFAULT_POMODORO_SETTINGS } from '../constants';

interface FocusSession {
  id: string;
  type: PomodoroMode;
  duration: number;
  completedAt: Date;
  interrupted: boolean;
  actualTimeSpent: number;
}

const CircularProgress: React.FC<{ 
  percentage: number; 
  size?: number; 
  strokeWidth?: number;
  isMobile?: boolean;
}> = ({ 
  percentage, 
  size = 300, 
  strokeWidth = 8,
  isMobile = false
}) => {
  const mobileSize = isMobile ? Math.min(size, 280) : size;
  const mobileStroke = isMobile ? Math.max(strokeWidth - 2, 6) : strokeWidth;
  const radius = (mobileSize - mobileStroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: mobileSize, height: mobileSize }}>
      <svg width={mobileSize} height={mobileSize} className="transform -rotate-90 absolute">
        <circle
          cx={mobileSize / 2}
          cy={mobileSize / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={mobileStroke}
          fill="transparent"
          className="text-slate-200 dark:text-slate-700"
        />
        <circle
          cx={mobileSize / 2}
          cy={mobileSize / 2}
          r={radius}
          stroke="#3b82f6"
          strokeWidth={mobileStroke}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-300 ease-out"
        />
      </svg>
    </div>
  );
};

const StopIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z" />
  </svg>
);

// Sound notification function
const playNotificationSound = (type: 'complete' | 'break') => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    if (type === 'complete') {
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
    } else {
      oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(300, audioContext.currentTime + 0.15);
    }
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (error) {
    console.log('Audio notification not available:', error);
  }
};

const PomodoroView: React.FC = () => {
  const [settings, setSettings] = useState<PomodoroSettings>(DEFAULT_POMODORO_SETTINGS);
  const [mode, setMode] = useState<PomodoroMode>(PomodoroMode.Work);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_POMODORO_SETTINGS.workDuration * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [pomodorosCompleted, setPomodorosCompleted] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editableSettings, setEditableSettings] = useState<PomodoroSettings>(DEFAULT_POMODORO_SETTINGS);
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);
  const [focusNote, setFocusNote] = useState<string>('');
  const [isMobile, setIsMobile] = useState(false);

  // Timing refs
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionStartTime = useRef<number | null>(null);
  const totalPausedTime = useRef<number>(0);
  const lastPauseTime = useRef<number | null>(null);
  const settingsRef = useRef(settings);
  const modeRef = useRef(mode);
  const hasLoadedData = useRef(false);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Update refs when state changes
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  // Load settings and sessions on component mount
  useEffect(() => {
    if (hasLoadedData.current) return;
    hasLoadedData.current = true;

    const loadData = async () => {
      try {
        const [loadedSettings, sessions] = await Promise.all([
          firebaseService.loadPomodoroSettings(),
          firebaseService.loadPomodoroSessions()
        ]);
        
        setSettings(loadedSettings);
        setEditableSettings(loadedSettings);
        setFocusSessions(sessions);
      } catch (error) {
        console.error('Error loading pomodoro data:', error);
      }
    };
    loadData();
  }, []);

  const getDuration = useCallback((currentMode: PomodoroMode, currentSettings: PomodoroSettings) => {
    switch (currentMode) {
      case PomodoroMode.Work:
        return currentSettings.workDuration * 60;
      case PomodoroMode.ShortBreak:
        return currentSettings.shortBreakDuration * 60;
      case PomodoroMode.LongBreak:
        return currentSettings.longBreakDuration * 60;
      default:
        return currentSettings.workDuration * 60;
    }
  }, []);

  const clearTimerInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const resetTimer = useCallback(() => {
    clearTimerInterval();
    const newDuration = getDuration(modeRef.current, settingsRef.current);
    setTimeLeft(newDuration);
    setIsRunning(false);
    sessionStartTime.current = null;
    totalPausedTime.current = 0;
    lastPauseTime.current = null;
  }, [getDuration, clearTimerInterval]);

  useEffect(() => {
    if (!isRunning && sessionStartTime.current === null) {
      const newDuration = getDuration(mode, settings);
      setTimeLeft(newDuration);
    }
  }, [mode, settings, isRunning, getDuration]);

  const saveFocusSession = useCallback(async (session: FocusSession) => {
    try {
      await firebaseService.savePomodoroSession(session);
      setFocusSessions(prev => [session, ...prev].slice(0, 50));
    } catch (error) {
      console.error('Error saving focus session:', error);
    }
  }, []);

  const completeSession = useCallback(async (interrupted: boolean = false) => {
    const totalDuration = getDuration(modeRef.current, settingsRef.current);
    let actualTimeSpent: number;

    if (sessionStartTime.current) {
      const now = Date.now();
      const elapsed = now - sessionStartTime.current - totalPausedTime.current;
      // Convert to minutes and round to 2 decimal places for more accuracy
      actualTimeSpent = Math.round((elapsed / 1000 / 60) * 100) / 100;
    } else {
      actualTimeSpent = 0;
    }

    const newSession: FocusSession = {
      id: Date.now().toString(),
      type: modeRef.current,
      duration: totalDuration,
      completedAt: new Date(),
      interrupted,
      actualTimeSpent
    };

    if (!interrupted) {
      playNotificationSound(modeRef.current === PomodoroMode.Work ? 'complete' : 'break');
      
      // Vibrate on mobile if available
      if (isMobile && 'vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
      }
    }

    await saveFocusSession(newSession);

    if (!interrupted && modeRef.current === PomodoroMode.Work) {
      setPomodorosCompleted(prev => {
        const nextCount = prev + 1;
        if (nextCount % settingsRef.current.pomodorosBeforeLongBreak === 0) {
          setMode(PomodoroMode.LongBreak);
        } else {
          setMode(PomodoroMode.ShortBreak);
        }
        return nextCount;
      });
    } else if (!interrupted) {
      setMode(PomodoroMode.Work);
    }

    clearTimerInterval();
    setIsRunning(false);
    sessionStartTime.current = null;
    totalPausedTime.current = 0;
    lastPauseTime.current = null;
  }, [getDuration, saveFocusSession, clearTimerInterval, isMobile]);

  useEffect(() => {
    if (isRunning) {
      const now = Date.now();
      
      if (!sessionStartTime.current) {
        sessionStartTime.current = now;
        totalPausedTime.current = 0;
      }
      
      if (lastPauseTime.current) {
        totalPausedTime.current += now - lastPauseTime.current;
        lastPauseTime.current = null;
      }

      intervalRef.current = setInterval(() => {
        const currentTime = Date.now();
        const elapsed = currentTime - sessionStartTime.current! - totalPausedTime.current;
        const totalDuration = getDuration(modeRef.current, settingsRef.current) * 1000;
        const remaining = Math.max(0, totalDuration - elapsed);
        
        const remainingSeconds = Math.ceil(remaining / 1000);
        setTimeLeft(remainingSeconds);

        if (remaining <= 0) {
          completeSession(false);
        }
      }, 1000);

    } else {
      clearTimerInterval();
      if (sessionStartTime.current && lastPauseTime.current === null) {
        lastPauseTime.current = Date.now();
      }
    }

    return () => clearTimerInterval();
  }, [isRunning, completeSession, getDuration, clearTimerInterval]);

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const stopSession = async () => {
    if (sessionStartTime.current) {
      await completeSession(true);
    }
    resetTimer();
  };

  const skipSession = () => {
    if (mode === PomodoroMode.Work) {
      const nextCount = pomodorosCompleted + 1;
      if (nextCount % settings.pomodorosBeforeLongBreak === 0) {
        setMode(PomodoroMode.LongBreak);
      } else {
        setMode(PomodoroMode.ShortBreak);
      }
    } else {
      setMode(PomodoroMode.Work);
    }
    resetTimer();
  };

  const handleSettingsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditableSettings(prev => ({ ...prev, [name]: parseInt(value, 10) || 0 }));
  };

  const saveSettings = async () => {
    if (editableSettings.workDuration < 1 || editableSettings.shortBreakDuration < 1 || 
        editableSettings.longBreakDuration < 1 || editableSettings.pomodorosBeforeLongBreak < 1) {
      alert("All durations must be at least 1 minute and pomodoros count at least 1.");
      return;
    }
    
    try {
      setSettings(editableSettings);
      await firebaseService.savePomodoroSettings(editableSettings);
      setIsSettingsOpen(false);
      resetTimer();
    } catch (error) {
      console.error('Error saving pomodoro settings:', error);
      alert('Failed to save settings. Please try again.');
    }
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getProgress = () => {
    const totalDuration = getDuration(mode, settings);
    return totalDuration > 0 ? ((totalDuration - timeLeft) / totalDuration) * 100 : 0;
  };

  const getModeConfig = () => {
    switch (mode) {
      case PomodoroMode.Work:
        return {
          name: 'Focus Time',
          color: 'from-blue-500 to-indigo-600',
          bgColor: 'bg-blue-500',
          textColor: 'text-blue-600',
          lightBg: 'bg-blue-50 dark:bg-blue-900/20'
        };
      case PomodoroMode.ShortBreak:
        return {
          name: 'Short Break',
          color: 'from-emerald-500 to-green-600',
          bgColor: 'bg-emerald-500',
          textColor: 'text-emerald-600',
          lightBg: 'bg-emerald-50 dark:bg-emerald-900/20'
        };
      case PomodoroMode.LongBreak:
        return {
          name: 'Long Break',
          color: 'from-purple-500 to-violet-600',
          bgColor: 'bg-purple-500',
          textColor: 'text-purple-600',
          lightBg: 'bg-purple-50 dark:bg-purple-900/20'
        };
    }
  };

  const modeConfig = getModeConfig();

  const getTodayStats = () => {
    const today = new Date().toDateString();
    const todaySessions = focusSessions.filter(s => s.completedAt.toDateString() === today);
    const focusTime = todaySessions
      .filter(s => s.type === PomodoroMode.Work)
      .reduce((total, s) => total + s.actualTimeSpent, 0);
    
    return { focusTime };
  };

  const todayStats = getTodayStats();

  useEffect(() => {
    return () => {
      clearTimerInterval();
    };
  }, [clearTimerInterval]);

  return (
    <div className={`animate-fadeIn h-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900 overflow-y-auto
                    ${isMobile ? 'p-4' : 'p-6'}`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className={`flex items-center justify-between mb-${isMobile ? '6' : '8'}`}>
          <div>
            <h1 className={`font-bold text-slate-800 dark:text-slate-100 ${isMobile ? 'text-2xl' : 'text-3xl'}`}>Focus Timer</h1>
            <p className={`text-slate-600 dark:text-slate-400 mt-1 ${isMobile ? 'text-sm' : 'text-base'}`}>Stay focused with the Pomodoro Technique</p>
          </div>
          <button
            onClick={() => {
              setEditableSettings(settings);
              setIsSettingsOpen(!isSettingsOpen);
            }}
            className={`rounded-xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-md shadow-lg hover:shadow-xl transition-all duration-200 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 border border-white/20
                       ${isMobile ? 'p-3 min-h-touch min-w-touch' : 'p-3'}`}
            title="Settings"
          >
            <EditIcon className="w-5 h-5" />
          </button>
        </div>

        <div className={`grid gap-${isMobile ? '6' : '8'} ${isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-3'}`}>
          {/* Main Timer */}
          <div className={isMobile ? 'col-span-1' : 'lg:col-span-2'}>
            <div className={`bg-white/70 dark:bg-slate-800/70 backdrop-blur-md rounded-3xl shadow-2xl border border-white/20 text-center flex flex-col items-center justify-center
                            ${isMobile ? 'p-6 min-h-[400px]' : 'p-8 min-h-[500px]'}`}>
              
              {/* Mode Indicator */}
              <div className={`inline-flex items-center rounded-full font-medium mb-${isMobile ? '6' : '8'} ${modeConfig.lightBg} ${modeConfig.textColor} border border-white/20 shadow-lg
                              ${isMobile ? 'px-4 py-2 text-sm' : 'px-6 py-3 text-sm'}`}>
                <div className={`rounded-full ${modeConfig.bgColor} animate-pulse mr-3 ${isMobile ? 'w-2 h-2' : 'w-3 h-3'}`}></div>
                {modeConfig.name}
              </div>

              {/* Timer Display */}
              <div className={`relative mb-${isMobile ? '6' : '8'}`} style={{ width: isMobile ? 280 : 300, height: isMobile ? 280 : 300 }}>
                <CircularProgress percentage={getProgress()} size={isMobile ? 280 : 300} strokeWidth={8} isMobile={isMobile} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-center">
                    <div className={`font-mono font-bold text-slate-800 dark:text-slate-100 mb-3 tabular-nums leading-none
                                   ${isMobile ? 'text-5xl' : 'text-7xl'}`}>
                      {formatTime(timeLeft)}
                    </div>
                    <div className={`text-slate-500 dark:text-slate-400 font-medium ${isMobile ? 'text-base' : 'text-lg'}`}>
                      {isRunning ? 'Focus time' : 'Ready to focus'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className={`flex items-center justify-center mb-${isMobile ? '6' : '8'} ${isMobile ? 'space-x-4' : 'space-x-6'}`}>
                <button
                  onClick={toggleTimer}
                  className={`rounded-full text-white shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-110 active:scale-95 bg-gradient-to-r ${modeConfig.color}
                             ${isMobile ? 'p-4 min-h-touch min-w-touch' : 'p-5'}`}
                  aria-label={isRunning ? "Pause timer" : "Start timer"}
                >
                  {isRunning ? <PauseIcon className={isMobile ? 'w-6 h-6' : 'w-8 h-8'} /> : <PlayIcon className={isMobile ? 'w-6 h-6' : 'w-8 h-8'} />}
                </button>
                
                {sessionStartTime.current && (
                  <button
                    onClick={stopSession}
                    className={`rounded-full bg-slate-500 hover:bg-slate-600 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-110 active:scale-95
                               ${isMobile ? 'p-4 min-h-touch min-w-touch' : 'p-5'}`}
                    aria-label="Stop session"
                  >
                    <StopIcon className={isMobile ? 'w-6 h-6' : 'w-8 h-8'} />
                  </button>
                )}
                
                <button
                  onClick={skipSession}
                  className={`rounded-full bg-slate-200/70 dark:bg-slate-700/70 backdrop-blur-md text-slate-600 dark:text-slate-400 hover:bg-slate-300/70 dark:hover:bg-slate-600/70 transition-all duration-300 shadow-lg hover:shadow-xl border border-white/20 transform hover:scale-110 active:scale-95
                             ${isMobile ? 'p-3 min-h-touch min-w-touch' : 'p-4'}`}
                  aria-label="Skip to next session"
                >
                  <SkipIcon className={isMobile ? 'w-5 h-5' : 'w-6 h-6'} />
                </button>
              </div>

              {/* Progress Info */}
              <div className={`text-center bg-slate-50/50 dark:bg-slate-700/30 rounded-2xl border border-white/20 ${isMobile ? 'p-3' : 'p-4'}`}>
                <p className={`text-slate-600 dark:text-slate-400 font-medium ${isMobile ? 'text-sm' : 'text-sm'}`}>
                  Pomodoro {pomodorosCompleted + 1} • 
                  {settings.pomodorosBeforeLongBreak - (pomodorosCompleted % settings.pomodorosBeforeLongBreak)} more until long break
                </p>
              </div>
            </div>
          </div>

          {/* Stats Sidebar */}
          <div className={`space-y-${isMobile ? '4' : '6'}`}>
            {/* Today's Focus Time */}
            <div className={`bg-white/70 dark:bg-slate-800/70 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 ${isMobile ? 'p-4' : 'p-6'}`}>
              <h3 className={`font-bold text-slate-800 dark:text-slate-100 mb-${isMobile ? '4' : '6'} flex items-center
                             ${isMobile ? 'text-lg' : 'text-xl'}`}>
                <div className={`bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mr-3
                                ${isMobile ? 'w-6 h-6' : 'w-8 h-8'}`}>
                  <svg className={`text-white ${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                Today's Focus
              </h3>
              <div className={`text-center bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-xl border border-emerald-200/30
                              ${isMobile ? 'p-4' : 'p-6'}`}>
                <div className={`font-bold text-emerald-600 dark:text-emerald-400 mb-2 ${isMobile ? 'text-3xl' : 'text-4xl'}`}>
                  {todayStats.focusTime}m
                </div>
                <div className={`text-emerald-700 dark:text-emerald-300 font-medium ${isMobile ? 'text-sm' : 'text-sm'}`}>
                  Focus Time
                </div>
              </div>
            </div>

            {/* Focus Notes */}
            <div className={`bg-white/70 dark:bg-slate-800/70 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 ${isMobile ? 'p-4' : 'p-6'}`}>
              <h3 className={`font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center ${isMobile ? 'text-base' : 'text-lg'}`}>
                <div className={`bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center mr-2
                                ${isMobile ? 'w-5 h-5' : 'w-6 h-6'}`}>
                  <svg className={`text-white ${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125"/>
                  </svg>
                </div>
                Focus Notes
              </h3>
              <textarea
                value={focusNote}
                onChange={(e) => setFocusNote(e.target.value)}
                placeholder="How was your focus today?"
                className={`w-full border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700/50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-slate-700 dark:text-slate-200 placeholder-slate-400 resize-none
                           ${isMobile ? 'p-3 text-base' : 'p-4 text-sm'}`}
                rows={isMobile ? 4 : 6}
              />
            </div>
          </div>
        </div>

        {/* Settings Modal */}
        {isSettingsOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 w-full
                            ${isMobile ? 'max-w-sm max-h-[90vh] overflow-y-auto' : 'max-w-md'}`}>
              <div className={`flex items-center justify-between border-b border-slate-200/50 dark:border-slate-700/50 ${isMobile ? 'p-4' : 'p-6'}`}>
                <h2 className={`font-bold text-slate-800 dark:text-slate-100 ${isMobile ? 'text-lg' : 'text-xl'}`}>Timer Settings</h2>
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className={`rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${isMobile ? 'p-3' : 'p-2'}`}
                >
                  <CloseIcon className="w-5 h-5" />
                </button>
              </div>
              
              <div className={`${isMobile ? 'p-4 space-y-5' : 'p-6 space-y-4'}`}>
                <div>
                  <label className={`block font-medium text-slate-700 dark:text-slate-300 mb-2 ${isMobile ? 'text-base' : 'text-sm'}`}>
                    Focus Duration (minutes)
                  </label>
                  <input
                    type="number"
                    name="workDuration"
                    value={editableSettings.workDuration}
                    onChange={handleSettingsChange}
                    min="1"
                    max="60"
                    className={`w-full border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors
                               ${isMobile ? 'p-4 text-base' : 'p-3'}`}
                  />
                </div>
                
                <div>
                  <label className={`block font-medium text-slate-700 dark:text-slate-300 mb-2 ${isMobile ? 'text-base' : 'text-sm'}`}>
                    Short Break (minutes)
                  </label>
                  <input
                    type="number"
                    name="shortBreakDuration"
                    value={editableSettings.shortBreakDuration}
                    onChange={handleSettingsChange}
                    min="1"
                    max="30"
                    className={`w-full border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors
                               ${isMobile ? 'p-4 text-base' : 'p-3'}`}
                  />
                </div>
                
                <div>
                  <label className={`block font-medium text-slate-700 dark:text-slate-300 mb-2 ${isMobile ? 'text-base' : 'text-sm'}`}>
                    Long Break (minutes)
                  </label>
                  <input
                    type="number"
                    name="longBreakDuration"
                    value={editableSettings.longBreakDuration}
                    onChange={handleSettingsChange}
                    min="1"
                    max="60"
                    className={`w-full border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors
                               ${isMobile ? 'p-4 text-base' : 'p-3'}`}
                  />
                </div>
                
                <div>
                  <label className={`block font-medium text-slate-700 dark:text-slate-300 mb-2 ${isMobile ? 'text-base' : 'text-sm'}`}>
                    Focus sessions before long break
                  </label>
                  <input
                    type="number"
                    name="pomodorosBeforeLongBreak"
                    value={editableSettings.pomodorosBeforeLongBreak}
                    onChange={handleSettingsChange}
                    min="1"
                    max="10"
                    className={`w-full border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors
                               ${isMobile ? 'p-4 text-base' : 'p-3'}`}
                  />
                </div>
              </div>
              
              <div className={`flex border-t border-slate-200/50 dark:border-slate-700/50 ${isMobile ? 'flex-col space-y-3 p-4' : 'space-x-3 p-6'}`}>
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className={`text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors
                             ${isMobile ? 'flex-1 px-4 py-4 text-base' : 'flex-1 px-4 py-3'}`}
                >
                  Cancel
                </button>
                <button
                  onClick={saveSettings}
                  className={`bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl
                             ${isMobile ? 'flex-1 px-4 py-4 text-base font-bold' : 'flex-1 px-4 py-3 font-bold'}`}
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PomodoroView;