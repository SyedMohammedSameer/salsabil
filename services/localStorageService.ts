import { Task, Theme, PomodoroSettings, DailyPrayerLog, DailyQuranLog } from '../types';
import { DEFAULT_POMODORO_SETTINGS } from '../constants';

const TASKS_STORAGE_KEY = 'focusFlowTasks';
const THEME_STORAGE_KEY = 'focusFlowTheme';
const POMODORO_SETTINGS_KEY = 'focusFlowPomodoroSettings';
const PRAYER_LOGS_KEY = 'focusFlowPrayerLogs';
const QURAN_LOGS_KEY = 'focusFlowQuranLogs';


// Tasks
export const loadTasksFromLocalStorage = (): Task[] | null => {
  try {
    const serializedTasks = localStorage.getItem(TASKS_STORAGE_KEY);
    if (serializedTasks === null) {
      return null;
    }
    return JSON.parse(serializedTasks);
  } catch (error) {
    console.error("Could not load tasks from local storage", error);
    return null;
  }
};

export const saveTasksToLocalStorage = (tasks: Task[]): void => {
  try {
    const serializedTasks = JSON.stringify(tasks);
    localStorage.setItem(TASKS_STORAGE_KEY, serializedTasks);
  } catch (error) {
    console.error("Could not save tasks to local storage", error);
  }
};

// Theme
export const loadThemeFromLocalStorage = (): Theme => {
  try {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
    if (storedTheme) {
      return storedTheme;
    }
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return Theme.Dark;
    }
    return Theme.Light;
  } catch (error) {
    console.error("Could not load theme from local storage", error);
    return Theme.Light;
  }
};

export const saveThemeToLocalStorage = (theme: Theme): void => {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (error) {
    console.error("Could not save theme to local storage", error);
  }
};

// Pomodoro Settings
export const loadPomodoroSettingsFromLocalStorage = (): PomodoroSettings => {
  try {
    const serializedSettings = localStorage.getItem(POMODORO_SETTINGS_KEY);
    if (serializedSettings === null) {
      return DEFAULT_POMODORO_SETTINGS;
    }
    return { ...DEFAULT_POMODORO_SETTINGS, ...JSON.parse(serializedSettings) };
  } catch (error) {
    console.error("Could not load pomodoro settings from local storage", error);
    return DEFAULT_POMODORO_SETTINGS;
  }
};

export const savePomodoroSettingsToLocalStorage = (settings: PomodoroSettings): void => {
  try {
    const serializedSettings = JSON.stringify(settings);
    localStorage.setItem(POMODORO_SETTINGS_KEY, serializedSettings);
  } catch (error) {
    console.error("Could not save pomodoro settings to local storage", error);
  }
};

// Prayer Logs
export const loadPrayerLogsFromLocalStorage = (): DailyPrayerLog[] => {
  try {
    const serializedLogs = localStorage.getItem(PRAYER_LOGS_KEY);
    if (serializedLogs === null) {
      return [];
    }
    return JSON.parse(serializedLogs);
  } catch (error) {
    console.error("Could not load prayer logs from local storage", error);
    return [];
  }
};

export const savePrayerLogsToLocalStorage = (logs: DailyPrayerLog[]): void => {
  try {
    const serializedLogs = JSON.stringify(logs);
    localStorage.setItem(PRAYER_LOGS_KEY, serializedLogs);
  } catch (error) {
    console.error("Could not save prayer logs to local storage", error);
  }
};

// Quran Logs
export const loadQuranLogsFromLocalStorage = (): DailyQuranLog[] => {
  try {
    const serializedLogs = localStorage.getItem(QURAN_LOGS_KEY);
    if (serializedLogs === null) {
      return [];
    }
    return JSON.parse(serializedLogs);
  } catch (error) {
    console.error("Could not load Quran logs from local storage", error);
    return [];
  }
};

export const saveQuranLogsToLocalStorage = (logs: DailyQuranLog[]): void => {
  try {
    const serializedLogs = JSON.stringify(logs);
    localStorage.setItem(QURAN_LOGS_KEY, serializedLogs);
  } catch (error)    {
    console.error("Could not save Quran logs to local storage", error);
  }
};
