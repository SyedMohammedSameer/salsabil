import React, { useState, useEffect, useCallback } from 'react';
import { PomodoroMode, PomodoroSettings } from '../types';
import { PlayIcon, PauseIcon, ResetIcon, SkipIcon, SaveIcon, EditIcon, CloseIcon } from './icons/NavIcons'; // Added CloseIcon
import { loadPomodoroSettingsFromLocalStorage, savePomodoroSettingsToLocalStorage } from '../services/localStorageService';
import { DEFAULT_POMODORO_SETTINGS } from '../constants';

const PomodoroView: React.FC = () => {
  const [settings, setSettings] = useState<PomodoroSettings>(loadPomodoroSettingsFromLocalStorage());
  const [mode, setMode] = useState<PomodoroMode>(PomodoroMode.Work);
  const [timeLeft, setTimeLeft] = useState(settings.workDuration * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [pomodorosCompleted, setPomodorosCompleted] = useState(0);
  const [isSettingsMode, setIsSettingsMode] = useState(false);
  const [editableSettings, setEditableSettings] = useState<PomodoroSettings>(settings);

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

  // Update timeLeft when mode or settings change (and timer is not running)
  useEffect(() => {
    if (!isRunning) {
      setTimeLeft(getDuration(mode, settings));
    }
  }, [mode, settings, isRunning, getDuration]);
  
  // Effect for timer logic
  useEffect(() => {
    if (!isRunning || timeLeft <= 0) {
      if (timeLeft <= 0 && isRunning) { // ensure it was running before switching
        if (mode === PomodoroMode.Work) {
          setPomodorosCompleted(prev => prev + 1);
          if ((pomodorosCompleted + 1) % settings.pomodorosBeforeLongBreak === 0) {
            setMode(PomodoroMode.LongBreak);
          } else {
            setMode(PomodoroMode.ShortBreak);
          }
        } else { 
          setMode(PomodoroMode.Work);
        }
        setIsRunning(false); 
      }
      return;
    }

    const intervalId = setInterval(() => {
      setTimeLeft(prevTime => prevTime - 1);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [isRunning, timeLeft, mode, pomodorosCompleted, settings, getDuration]);

  const toggleTimer = () => {
    if (timeLeft <=0 && !isRunning) { 
        setTimeLeft(getDuration(mode, settings));
    }
    setIsRunning(prev => !prev);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(getDuration(mode, settings));
  };

  const skipSession = () => {
    setIsRunning(false);
    if (mode === PomodoroMode.Work) {
      setPomodorosCompleted(prev => prev + 1);
      if ((pomodorosCompleted + 1) % settings.pomodorosBeforeLongBreak === 0) {
        setMode(PomodoroMode.LongBreak);
      } else {
        setMode(PomodoroMode.ShortBreak);
      }
    } else {
      setMode(PomodoroMode.Work);
    }
  };

  const handleSettingsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditableSettings(prev => ({ ...prev, [name]: parseInt(value, 10) || 0 }));
  };

  const saveSettings = () => {
    // Add validation for settings if needed (e.g., min/max values)
    if (editableSettings.workDuration < 1 || editableSettings.shortBreakDuration < 1 || editableSettings.longBreakDuration < 1 || editableSettings.pomodorosBeforeLongBreak < 1) {
        alert("Durations must be at least 1 minute and pomodoros count at least 1.");
        return;
    }
    setSettings(editableSettings);
    savePomodoroSettingsToLocalStorage(editableSettings);
    setIsSettingsMode(false);
    // If current mode's duration changed, update timeLeft (if not running)
    if (!isRunning) {
        setTimeLeft(getDuration(mode, editableSettings));
    }
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const modeText = {
    [PomodoroMode.Work]: "Focus Time",
    [PomodoroMode.ShortBreak]: "Short Break",
    [PomodoroMode.LongBreak]: "Long Break",
  };
  
  const modeColor = {
    [PomodoroMode.Work]: "bg-red-500 dark:bg-red-600",
    [PomodoroMode.ShortBreak]: "bg-emerald-500 dark:bg-emerald-600",
    [PomodoroMode.LongBreak]: "bg-blue-500 dark:bg-blue-600",
  }

  return (
    <div className="animate-fadeIn flex flex-col items-center justify-center h-full">
      <div className="flex justify-between items-center w-full max-w-md mb-4">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Pomodoro Timer</h1>
        <button 
            onClick={() => { setIsSettingsMode(s => !s); if(isSettingsMode) setEditableSettings(settings); /* Reset changes if canceling */}}
            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            title={isSettingsMode ? "Back to Timer" : "Edit Settings"}
        >
            {isSettingsMode ? <CloseIcon className="w-6 h-6" /> : <EditIcon className="w-5 h-5" /> }
        </button>
      </div>
      
      {isSettingsMode ? (
        <div className="p-6 bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md text-slate-700 dark:text-slate-200">
          <h2 className="text-xl font-semibold mb-4 text-center">Timer Settings</h2>
          <div className="space-y-3">
            {[
                {label: 'Work Duration (min)', name: 'workDuration', value: editableSettings.workDuration},
                {label: 'Short Break (min)', name: 'shortBreakDuration', value: editableSettings.shortBreakDuration},
                {label: 'Long Break (min)', name: 'longBreakDuration', value: editableSettings.longBreakDuration},
                {label: 'Pomodoros before Long Break', name: 'pomodorosBeforeLongBreak', value: editableSettings.pomodorosBeforeLongBreak},
            ].map(field => (
                 <div key={field.name}>
                    <label htmlFor={field.name} className="block text-sm font-medium mb-1">{field.label}</label>
                    <input 
                        type="number" 
                        id={field.name}
                        name={field.name}
                        value={field.value}
                        onChange={handleSettingsChange}
                        min="1"
                        className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md dark:bg-slate-700 focus:ring-primary focus:border-primary"
                    />
                </div>
            ))}
          </div>
          <button
            onClick={saveSettings}
            className="mt-6 w-full px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50 transition-colors flex items-center justify-center"
          >
            <SaveIcon className="w-5 h-5 mr-2" />
            Save Settings
          </button>
        </div>
      ) : (
        <div className={`p-8 rounded-xl shadow-2xl w-full max-w-md text-center ${modeColor[mode]} text-white transition-colors duration-500`}>
          <h2 className="text-2xl font-semibold mb-4">{modeText[mode]}</h2>
          <p className="text-7xl font-mono font-bold mb-8 tabular-nums">{formatTime(timeLeft)}</p>
          
          <div className="flex justify-center space-x-4 mb-6">
            <button
              onClick={toggleTimer}
              className="px-6 py-3 bg-white/20 hover:bg-white/30 text-white rounded-lg font-semibold transition-colors flex items-center"
              aria-label={isRunning ? "Pause timer" : "Start timer"}
            >
              {isRunning ? <PauseIcon className="w-6 h-6 mr-2" /> : <PlayIcon className="w-6 h-6 mr-2" />}
              {isRunning ? 'Pause' : 'Start'}
            </button>
            <button
              onClick={resetTimer}
              className="p-3 bg-white/20 hover:bg-white/30 text-white rounded-full font-semibold transition-colors"
              aria-label="Reset timer"
            >
              <ResetIcon className="w-6 h-6" />
            </button>
          </div>
           <button
              onClick={skipSession}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors flex items-center mx-auto"
              aria-label="Skip to next session"
          >
              <SkipIcon className="w-5 h-5 mr-2"/>
              Skip Session
          </button>
        </div>
      )}
      
      {!isSettingsMode && (
        <div className="mt-8 text-center">
          <p className="text-slate-600 dark:text-slate-400">
            Pomodoros completed: <span className="font-semibold text-primary dark:text-primary-light">{pomodorosCompleted}</span>
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
            {settings.pomodorosBeforeLongBreak - (pomodorosCompleted % settings.pomodorosBeforeLongBreak)} more {mode === PomodoroMode.Work && pomodorosCompleted % settings.pomodorosBeforeLongBreak !== settings.pomodorosBeforeLongBreak -1 ? 'focus session' : 'sessions'} until a long break.
          </p>
        </div>
      )}
    </div>
  );
};

export default PomodoroView;