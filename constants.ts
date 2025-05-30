import { Task, Priority, PrayerName, PrayerDetail, PomodoroSettings } from './types';

export const APP_NAME = "FocusFlow";

export const GEMINI_TEXT_MODEL = 'gemini-2.5-flash-preview-04-17';

export const DAYS_OF_WEEK_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const SHORT_DAYS_OF_WEEK_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];


export const PRIORITY_COLORS: { [key in Priority]: string } = {
  [Priority.Low]: 'bg-emerald-100 dark:bg-emerald-700 text-emerald-700 dark:text-emerald-200 border-emerald-400',
  [Priority.Medium]: 'bg-amber-100 dark:bg-amber-700 text-amber-700 dark:text-amber-200 border-amber-400',
  [Priority.High]: 'bg-red-100 dark:bg-red-700 text-red-700 dark:text-red-200 border-red-400',
};

export const PRIORITY_DOT_COLORS: { [key in Priority]: string } = {
  [Priority.Low]: 'bg-emerald-500',
  [Priority.Medium]: 'bg-amber-500',
  [Priority.High]: 'bg-red-500',
};

const today = new Date();
const formatDate = (date: Date) => date.toISOString().split('T')[0];
const getDayInCurrentWeek = (dayOffset: number) => { // 0 for today, 1 for tomorrow etc.
    const newDate = new Date(today);
    newDate.setDate(today.getDate() + dayOffset);
    return formatDate(newDate);
};


export const SAMPLE_TASKS: Task[] = [
  { 
    id: '1', 
    title: 'Morning Standup Meeting', 
    date: getDayInCurrentWeek(0), 
    priority: Priority.Medium, 
    startTime: '09:00', 
    endTime: '09:30', 
    subtasks: [], 
    completedSubtasks: 0, 
    completed: false 
  },
  { 
    id: '2', 
    title: 'Develop new feature', 
    date: getDayInCurrentWeek(0), 
    priority: Priority.High, 
    description: "Implement the user authentication module.", 
    subtasks: [
      {id: 's1', text: 'Design DB schema', completed: true}, 
      {id: 's2', text: 'Implement API endpoints', completed: false}
    ], 
    completedSubtasks: 1, 
    completed: false,
    startTime: undefined, // Explicitly set to undefined
    endTime: undefined
  },
  { id: '3', title: 'Client call', date: getDayInCurrentWeek(1), priority: Priority.High, startTime: '14:00', endTime: '15:00', subtasks: [], completedSubtasks: 0, completed: false },
  { id: '4', title: 'Gym session', date: getDayInCurrentWeek(1), priority: Priority.Low, subtasks: [], completedSubtasks: 0, completed: true },
  { id: '5', title: 'Read documentation for new API', date: getDayInCurrentWeek(2), priority: Priority.Medium, subtasks: [], completedSubtasks: 0, completed: false },
  { id: '6', title: 'Team Lunch', date: getDayInCurrentWeek(4), priority: Priority.Low, startTime: '12:30', endTime: '13:30', completed: false, subtasks: [], completedSubtasks: 0},
];

export const MOCK_AI_RESPONSES = {
  SUMMARY: "This week, you've focused heavily on development tasks, particularly the user authentication module. You also had an important client call and maintained your gym routine. Good progress overall!",
  NEXT_STEPS: "Based on your current tasks, I suggest focusing on completing the API endpoints for the authentication module tomorrow. Also, prepare for any follow-up actions from the client call.",
  FOCUS_TOMORROW: "Tomorrow, your high priority tasks are 'Develop new feature' and any follow-ups from 'Client call'. Consider dedicating a focused block of time for the feature development.",
  GOAL_ALIGNMENT: "Your current tasks align well with a goal of project completion and maintaining work-life balance. Keep up the consistent effort!",
  ERROR: "I'm having a little trouble connecting right now. Please try again in a moment.",
  NO_KEY: "API key not configured. AI features are running in mock mode."
};

// Pomodoro Timer Constants
export const DEFAULT_POMODORO_SETTINGS: PomodoroSettings = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  pomodorosBeforeLongBreak: 4,
};

// Prayer Definitions
export const PRAYER_DEFINITIONS: Record<PrayerName, Omit<PrayerDetail, 'fardh' | 'sunnah'>> = {
  [PrayerName.Fajr]: { name: PrayerName.Fajr, isApplicable: true, fardhCount: 2, sunnahCount: 2 },
  [PrayerName.Dhuhr]: { name: PrayerName.Dhuhr, isApplicable: true, fardhCount: 4, sunnahCount: 4 }, // Sunnah can be 2 or 4 before, 2 after
  [PrayerName.Asr]: { name: PrayerName.Asr, isApplicable: true, fardhCount: 4, sunnahCount: 4 }, // Sunnah before Asr (optional)
  [PrayerName.Maghrib]: { name: PrayerName.Maghrib, isApplicable: true, fardhCount: 3, sunnahCount: 2 },
  [PrayerName.Isha]: { name: PrayerName.Isha, isApplicable: true, fardhCount: 4, sunnahCount: 2 }, // Plus Witr
  [PrayerName.Tahajjud]: { name: PrayerName.Tahajjud, isApplicable: true }, // Rakat vary
};

export const PRAYER_ORDER: PrayerName[] = [
  PrayerName.Fajr,
  PrayerName.Dhuhr,
  PrayerName.Asr,
  PrayerName.Maghrib,
  PrayerName.Isha,
  PrayerName.Tahajjud,
];
