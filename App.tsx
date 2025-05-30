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
import AuthModal from './components/AuthModal';
import { PlannerIcon, CalendarIcon, AssistantIcon, DashboardIcon, PomodoroIcon, PrayerTrackerIcon, QuranLogIcon } from './components/icons/NavIcons';
import { AuthProvider, useAuth } from './context/AuthContext';
import * as firebaseService from './services/firebaseService';
import { SAMPLE_TASKS } from './constants';

const AppContent: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentView, setCurrentView] = useState<View>(View.Planner);
  const [theme, setTheme] = useState<Theme>(Theme.Light);
  const [loading, setLoading] = useState(true);
  const [apiKey] = useState<string>(() => (typeof process !== 'undefined' && process.env && process.env.API_KEY) || '');

  // Set current user in Firebase service when user changes
  useEffect(() => {
    firebaseService.setCurrentUser(currentUser?.uid || null);
  }, [currentUser]);

  // Load user data when user logs in or app starts
  useEffect(() => {
    const loadUserData = async () => {
      try {
        setLoading(true);
        
        // Load theme
        const userTheme = await firebaseService.loadTheme();
        setTheme(userTheme);
        
        // Load tasks
        const userTasks = await firebaseService.loadTasks();
        if (userTasks.length === 0 && !currentUser) {
          // If no user and no tasks, show sample tasks for demo
          setTasks(SAMPLE_TASKS);
        } else {
          setTasks(userTasks);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        // Fallback to sample tasks if there's an error
        setTasks(SAMPLE_TASKS);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [currentUser]);

  // Apply theme
  useEffect(() => {
    if (theme === Theme.Dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Save tasks when they change (debounced)
  useEffect(() => {
    if (!loading && tasks.length > 0) {
      const timeoutId = setTimeout(() => {
        firebaseService.saveTasks(tasks);
      }, 500); // Debounce saves by 500ms
      
      return () => clearTimeout(timeoutId);
    }
  }, [tasks, loading]);

  const toggleTheme = useCallback(async () => {
    const newTheme = theme === Theme.Light ? Theme.Dark : Theme.Light;
    setTheme(newTheme);
    await firebaseService.saveTheme(newTheme);
  }, [theme]);

  const addTask = useCallback(async (taskData: Omit<Task, 'id' | 'subtasks' | 'completedSubtasks' | 'completed'>): Promise<void> => {
    const newTask: Task = { 
      ...taskData, 
      id: Date.now().toString(), 
      subtasks: [], 
      completedSubtasks: 0, 
      completed: false 
    };
    
    setTasks(prevTasks => [...prevTasks, newTask]);
    
    // Save to Firebase immediately for new tasks
    try {
      await firebaseService.saveTask(newTask);
    } catch (error) {
      console.error('Error saving new task:', error);
    }
  }, []);

  const updateTask = useCallback(async (updatedTask: Task): Promise<void> => {
    setTasks(prevTasks => prevTasks.map(task => task.id === updatedTask.id ? updatedTask : task));
    
    // Save to Firebase immediately for updates
    try {
      await firebaseService.saveTask(updatedTask);
    } catch (error) {
      console.error('Error updating task:', error);
    }
  }, []);

  const deleteTask = useCallback(async (taskId: string): Promise<void> => {
    setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
    
    // Delete from Firebase immediately
    try {
      await firebaseService.deleteTask(taskId);
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      // Clear local state after logout
      setTasks([]);
      setCurrentView(View.Planner);
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  const renderView = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Loading your data...</p>
          </div>
        </div>
      );
    }

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

  // Show auth modal if user is not logged in
  if (!currentUser) {
    return <AuthModal />;
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 transition-colors duration-300">
      {/* Sidebar Navigation */}
      <nav className="w-full md:w-24 bg-white dark:bg-slate-800 p-2 md:p-4 flex md:flex-col justify-around md:justify-start items-center space-y-0 md:space-y-4 shadow-lg md:shadow-none border-b md:border-r border-slate-200 dark:border-slate-700">
        <div className="text-2xl font-bold text-primary hidden md:block md:mb-4">FF</div>
        <NavItem icon={<PlannerIcon />} label="Planner" isActive={currentView === View.Planner} onClick={() => setCurrentView(View.Planner)} />
        <NavItem icon={<CalendarIcon />} label="Calendar" isActive={currentView === View.Calendar} onClick={() => setCurrentView(View.Calendar)} />
        <NavItem icon={<PomodoroIcon />} label="Pomodoro" isActive={currentView === View.Pomodoro} onClick={() => setCurrentView(View.Pomodoro)} />
        <NavItem icon={<PrayerTrackerIcon />} label="Prayers" isActive={currentView === View.PrayerTracker} onClick={() => setCurrentView(View.PrayerTracker)} />
        <NavItem icon={<QuranLogIcon />} label="Quran Log" isActive={currentView === View.QuranLog} onClick={() => setCurrentView(View.QuranLog)} />
        <NavItem icon={<AssistantIcon />} label="AI Assistant" isActive={currentView === View.AIAssistant} onClick={() => setCurrentView(View.AIAssistant)} />
        <NavItem icon={<DashboardIcon />} label="Dashboard" isActive={currentView === View.Dashboard} onClick={() => setCurrentView(View.Dashboard)} />
        
        {/* User menu at bottom */}
        <div className="mt-auto hidden md:flex md:flex-col md:items-center md:space-y-2">
          <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
          <button
            onClick={handleLogout}
            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-slate-500 dark:text-slate-400"
            title="Logout"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
        
        {/* Mobile theme toggle and logout */}
        <div className="md:hidden flex items-center space-x-2">
          <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
          <button
            onClick={handleLogout}
            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-slate-500 dark:text-slate-400"
            title="Logout"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        {renderView()}
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;