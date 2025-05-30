
import React, { useState, useEffect, useCallback } from 'react';
import { Task, View, Theme } from './types';
import PlannerView from './components/PlannerView';
import CalendarView from './components/CalendarView';
import AIAssistantView from './components/AIAssistantView';
import DashboardView from './components/DashboardView';
import PomodoroView from './components/PomodoroView';
import PrayerTrackerView from './components/PrayerTrackerView';
import QuranLogView from './components/QuranLogView';
import ThemeToggle from './components/ThemeToggle';
import NavItem from './components/NavItem';
import { PlannerIcon, CalendarIcon, AssistantIcon, DashboardIcon, PomodoroIcon, PrayerTrackerIcon, QuranLogIcon } from './components/icons/NavIcons';
import { loadTasksFromLocalStorage, saveTasksToLocalStorage, loadThemeFromLocalStorage, saveThemeToLocalStorage } from './services/localStorageService';
import { SAMPLE_TASKS } from './constants';

const App: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>(() => loadTasksFromLocalStorage() || SAMPLE_TASKS);
  const [currentView, setCurrentView] = useState<View>(View.Planner);
  const [theme, setTheme] = useState<Theme>(() => loadThemeFromLocalStorage());
  // API key is now assumed to be from process.env.API_KEY as per guidelines
  const [apiKey] = useState<string>(() => (typeof process !== 'undefined' && process.env && process.env.API_KEY) || '');


  useEffect(() => {
    saveTasksToLocalStorage(tasks);
  }, [tasks]);

  useEffect(() => {
    if (theme === Theme.Dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    saveThemeToLocalStorage(theme);
  }, [theme]);

  useEffect(() => {
    if (!apiKey && (currentView === View.AIAssistant)) {
        console.warn("API Key not found in process.env.API_KEY. AI Assistant will use mock data or may not function fully.");
    }
  }, [apiKey, currentView]);

  const toggleTheme = useCallback(() => {
    setTheme(prevTheme => prevTheme === Theme.Light ? Theme.Dark : Theme.Light);
  }, []);

  const addTask = (taskData: Omit<Task, 'id' | 'subtasks' | 'completedSubtasks' | 'completed'>): void => {
    const newTask: Task = { 
        ...taskData, 
        id: Date.now().toString(), 
        subtasks: [], 
        completedSubtasks: 0, 
        completed: false 
    };
    setTasks(prevTasks => [...prevTasks, newTask]);
  };

  const updateTask = (updatedTask: Task): void => {
    setTasks(prevTasks => prevTasks.map(task => task.id === updatedTask.id ? updatedTask : task));
  };

  const deleteTask = (taskId: string): void => {
    setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
  };

  const renderView = () => {
    switch (currentView) {
      case View.Planner:
        return <PlannerView tasks={tasks} addTask={addTask} updateTask={updateTask} deleteTask={deleteTask} />;
      case View.Calendar:
        return <CalendarView tasks={tasks} addTask={addTask} updateTask={updateTask} deleteTask={deleteTask} setCurrentView={setCurrentView} />;
      case View.AIAssistant:
        return <AIAssistantView tasks={tasks} apiKey={apiKey} />;
      case View.Dashboard:
        return <DashboardView tasks={tasks} />;
      case View.Pomodoro:
        return <PomodoroView />;
      case View.PrayerTracker:
        return <PrayerTrackerView />;
      case View.QuranLog:
        return <QuranLogView />;
      default:
        return <PlannerView tasks={tasks} addTask={addTask} updateTask={updateTask} deleteTask={deleteTask} />;
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 transition-colors duration-300">
      {/* Sidebar Navigation - Increased width for md screens */}
      <nav className="w-full md:w-24 bg-white dark:bg-slate-800 p-2 md:p-4 flex md:flex-col justify-around md:justify-start items-center space-y-0 md:space-y-4 shadow-lg md:shadow-none border-b md:border-r border-slate-200 dark:border-slate-700">
        <div className="text-2xl font-bold text-primary hidden md:block md:mb-4">FF</div>
        <NavItem icon={<PlannerIcon />} label="Planner" isActive={currentView === View.Planner} onClick={() => setCurrentView(View.Planner)} />
        <NavItem icon={<CalendarIcon />} label="Calendar" isActive={currentView === View.Calendar} onClick={() => setCurrentView(View.Calendar)} />
        <NavItem icon={<PomodoroIcon />} label="Pomodoro" isActive={currentView === View.Pomodoro} onClick={() => setCurrentView(View.Pomodoro)} />
        <NavItem icon={<PrayerTrackerIcon />} label="Prayers" isActive={currentView === View.PrayerTracker} onClick={() => setCurrentView(View.PrayerTracker)} />
        <NavItem icon={<QuranLogIcon />} label="Quran Log" isActive={currentView === View.QuranLog} onClick={() => setCurrentView(View.QuranLog)} />
        <NavItem icon={<AssistantIcon />} label="AI Assistant" isActive={currentView === View.AIAssistant} onClick={() => setCurrentView(View.AIAssistant)} />
        <NavItem icon={<DashboardIcon />} label="Dashboard" isActive={currentView === View.Dashboard} onClick={() => setCurrentView(View.Dashboard)} />
        <div className="mt-auto hidden md:block">
          <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
        </div>
         <div className="md:hidden"> {/* Theme toggle for mobile */}
          <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        {renderView()}
      </main>
    </div>
  );
};

export default App;
