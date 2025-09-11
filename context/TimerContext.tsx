import React, { createContext, useContext, useState, useEffect } from 'react';

interface TimerState {
  // Pomodoro Timer State
  pomodoroIsRunning: boolean;
  pomodoroTimeLeft: number;
  pomodoroMode: string;
  pomodoroStartTime: Date | null;
  
  // Study Circle Timer State
  studyCircleRoomId: string | null;
  studyCircleIsRunning: boolean;
  studyCircleTimeLeft: number;
  studyCircleStartTime: Date | null;
}

interface TimerContextType {
  timerState: TimerState;
  updatePomodoroTimer: (isRunning: boolean, timeLeft: number, mode: string, startTime?: Date | null) => void;
  updateStudyCircleTimer: (roomId: string | null, isRunning: boolean, timeLeft: number, startTime?: Date | null) => void;
  resetPomodoroTimer: () => void;
  resetStudyCircleTimer: () => void;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

export const TimerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [timerState, setTimerState] = useState<TimerState>({
    pomodoroIsRunning: false,
    pomodoroTimeLeft: 0,
    pomodoroMode: 'Work',
    pomodoroStartTime: null,
    studyCircleRoomId: null,
    studyCircleIsRunning: false,
    studyCircleTimeLeft: 0,
    studyCircleStartTime: null,
  });

  // Persist timer state to localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('timerState');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        setTimerState({
          ...parsed,
          pomodoroStartTime: parsed.pomodoroStartTime ? new Date(parsed.pomodoroStartTime) : null,
          studyCircleStartTime: parsed.studyCircleStartTime ? new Date(parsed.studyCircleStartTime) : null,
        });
      } catch (error) {
        console.error('Failed to parse saved timer state:', error);
      }
    }
  }, []);

  // Save timer state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('timerState', JSON.stringify(timerState));
  }, [timerState]);

  const updatePomodoroTimer = (isRunning: boolean, timeLeft: number, mode: string, startTime?: Date | null) => {
    setTimerState(prev => ({
      ...prev,
      pomodoroIsRunning: isRunning,
      pomodoroTimeLeft: timeLeft,
      pomodoroMode: mode,
      pomodoroStartTime: startTime !== undefined ? startTime : prev.pomodoroStartTime,
    }));
  };

  const updateStudyCircleTimer = (roomId: string | null, isRunning: boolean, timeLeft: number, startTime?: Date | null) => {
    setTimerState(prev => ({
      ...prev,
      studyCircleRoomId: roomId,
      studyCircleIsRunning: isRunning,
      studyCircleTimeLeft: timeLeft,
      studyCircleStartTime: startTime !== undefined ? startTime : prev.studyCircleStartTime,
    }));
  };

  const resetPomodoroTimer = () => {
    setTimerState(prev => ({
      ...prev,
      pomodoroIsRunning: false,
      pomodoroTimeLeft: 0,
      pomodoroStartTime: null,
    }));
  };

  const resetStudyCircleTimer = () => {
    setTimerState(prev => ({
      ...prev,
      studyCircleRoomId: null,
      studyCircleIsRunning: false,
      studyCircleTimeLeft: 0,
      studyCircleStartTime: null,
    }));
  };

  return (
    <TimerContext.Provider
      value={{
        timerState,
        updatePomodoroTimer,
        updateStudyCircleTimer,
        resetPomodoroTimer,
        resetStudyCircleTimer,
      }}
    >
      {children}
    </TimerContext.Provider>
  );
};

export const useTimer = () => {
  const context = useContext(TimerContext);
  if (context === undefined) {
    throw new Error('useTimer must be used within a TimerProvider');
  }
  return context;
};