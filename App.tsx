// Enhanced App.tsx with Salsabil branding and modern sidebar
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [apiKey] = useState<string>(() => {
    return import.meta.env.VITE_GEMINI_API_KEY || 
          import.meta.env.VITE_API_KEY || 
          import.meta.env.GEMINI_API_KEY || 
          '';
  });

  // Set current user in Firebase service when user changes
  useEffect(() => {
    firebaseService.setCurrentUser(currentUser?.uid || null);
  }, [currentUser]);

  // Load user data when user logs in or app starts
  useEffect(() => {
    const loadUserData = async () => {
      try {
        setLoading(true);
        
        const userTheme = await firebaseService.loadTheme();
        setTheme(userTheme);
        
        try {
          const userTasks = await firebaseService.loadTasks();
          if (userTasks.length === 0 && !currentUser) {
            setTasks(SAMPLE_TASKS);
          } else {
            const validatedTasks = userTasks.map(task => ({
              ...task,
              subtasks: task.subtasks || [],
              completedSubtasks: task.completedSubtasks || 0,
              completed: task.completed || false
            }));
            setTasks(validatedTasks);
          }
        } catch (taskError) {
          console.error('Error loading tasks:', taskError);
          setTasks(currentUser ? [] : SAMPLE_TASKS);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
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
      }, 500);
      
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
    
    try {
      await firebaseService.saveTask(newTask);
    } catch (error) {
      console.error('Error saving new task:', error);
    }
  }, []);

  const updateTask = useCallback(async (updatedTask: Task): Promise<void> => {
    setTasks(prevTasks => prevTasks.map(task => task.id === updatedTask.id ? updatedTask : task));
    
    try {
      await firebaseService.saveTask(updatedTask);
    } catch (error) {
      console.error('Error updating task:', error);
    }
  }, []);

  const deleteTask = useCallback(async (taskId: string): Promise<void> => {
    setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
    
    try {
      await firebaseService.deleteTask(taskId);
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      setTasks([]);
      setCurrentView(View.Planner);
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  const getViewTitle = (view: View) => {
    const titles = {
      [View.Planner]: 'Weekly Planner',
      [View.Calendar]: 'Calendar',
      [View.AIAssistant]: 'AI Assistant', 
      [View.Dashboard]: 'Dashboard',
      [View.Pomodoro]: 'Focus Timer',
      [View.PrayerTracker]: 'Prayer Tracker',
      [View.QuranLog]: 'Quran Reading Log'
    };
    return titles[view] || 'Salsabil';
  };

  const renderView = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="relative mb-8">
              {/* Salsabil spring loading animation */}
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-cyan-200 dark:border-cyan-800 border-t-cyan-500 dark:border-t-cyan-400 mx-auto mb-6"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-full animate-pulse"></div>
                </div>
              </div>
              {/* Water ripple effect */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-20 h-20 border-2 border-cyan-300 dark:border-cyan-600 rounded-full animate-ping opacity-20"></div>
              </div>
            </div>
            <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">Loading Salsabil</h3>
            <p className="text-slate-600 dark:text-slate-400">Preparing your spring of productivity...</p>
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
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 dark:from-slate-900 dark:via-slate-800 dark:to-cyan-900 text-slate-800 dark:text-slate-200 transition-all duration-500">
      
      {/* Enhanced Sidebar Navigation with Salsabil Branding */}
      <nav className={`relative flex flex-col bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-r border-slate-200/50 dark:border-slate-700/50 shadow-2xl transition-all duration-300 ease-in-out z-10
                      ${sidebarCollapsed ? 'w-20' : 'w-72'} 
                      md:${sidebarCollapsed ? 'w-20' : 'w-80'}`}>
        
        {/* Sidebar Header with Salsabil Logo */}
        <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50">
          <div className="flex items-center justify-between">
            {!sidebarCollapsed && (
              <div className="flex items-center space-x-3">
                {/* Water spring icon - replace with your actual icon */}
                <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg">
                  <img 
                    src="/salsabil-original.jpg" 
                    alt="Salsabil" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 via-cyan-600 to-emerald-600 bg-clip-text text-transparent">
                    Salsabil
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400">A Spring of Growth</p>
                </div>
              </div>
            )}
            
            {/* Collapse Toggle Button */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <svg className={`w-5 h-5 transition-transform duration-300 ${sidebarCollapsed ? 'rotate-180' : ''}`} 
                   fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* User Info */}
        {!sidebarCollapsed && currentUser && (
          <div className="p-4 bg-gradient-to-r from-cyan-50 to-emerald-50 dark:from-cyan-900/20 dark:to-emerald-900/20 mx-4 mt-4 rounded-xl">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                {currentUser.email?.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                  {currentUser.email}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Blessed User
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Navigation Items */}
        <div className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          <NavItem 
            icon={<DashboardIcon />} 
            label="Dashboard" 
            isActive={currentView === View.Dashboard} 
            onClick={() => setCurrentView(View.Dashboard)} 
          />
          <NavItem 
            icon={<PlannerIcon />} 
            label="Planner" 
            isActive={currentView === View.Planner} 
            onClick={() => setCurrentView(View.Planner)} 
          />
          <NavItem 
            icon={<CalendarIcon />} 
            label="Calendar" 
            isActive={currentView === View.Calendar} 
            onClick={() => setCurrentView(View.Calendar)} 
          />
          <NavItem 
            icon={<PomodoroIcon />} 
            label="Focus Timer" 
            isActive={currentView === View.Pomodoro} 
            onClick={() => setCurrentView(View.Pomodoro)} 
          />
          
          {/* Spiritual Section */}
          {!sidebarCollapsed && (
            <div className="pt-4">
              <p className="px-4 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                🌙 Spiritual Journey
              </p>
            </div>
          )}
          
          <NavItem 
            icon={<PrayerTrackerIcon />} 
            label="Prayers" 
            isActive={currentView === View.PrayerTracker} 
            onClick={() => setCurrentView(View.PrayerTracker)} 
          />
          <NavItem 
            icon={<QuranLogIcon />} 
            label="Quran Log" 
            isActive={currentView === View.QuranLog} 
            onClick={() => setCurrentView(View.QuranLog)} 
          />
          
          {/* AI Section */}
          {!sidebarCollapsed && (
            <div className="pt-4">
              <p className="px-4 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                🤖 AI Guidance
              </p>
            </div>
          )}
          
          <NavItem 
            icon={<AssistantIcon />} 
            label="AI Assistant" 
            isActive={currentView === View.AIAssistant} 
            onClick={() => setCurrentView(View.AIAssistant)} 
          />
        </div>
        
        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-200/50 dark:border-slate-700/50 space-y-3">
          <div className="flex items-center justify-center space-x-3">
            <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
            {!sidebarCollapsed && (
              <button
                onClick={handleLogout}
                className="flex-1 flex items-center justify-center space-x-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 transition-all duration-200 group"
                title="Logout"
              >
                <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="text-sm font-medium">Logout</span>
              </button>
            )}
          </div>
        </div>
        
        {/* Sidebar glow effect */}
        <div className="absolute inset-y-0 -right-px w-px bg-gradient-to-b from-transparent via-cyan-500/20 to-transparent"></div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header Bar */}
        <header className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50 px-6 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              {getViewTitle(currentView)}
            </h2>
            <div className="flex items-center space-x-4">
              {/* Islamic date could go here */}
              <div className="text-sm text-slate-600 dark:text-slate-400">
                {new Date().toLocaleDateString(undefined, { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {renderView()}
        </div>
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