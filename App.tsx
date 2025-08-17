// App.tsx - FIXED VERSION with proper authentication timing
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
  const [currentView, setCurrentView] = useState<View>(View.Dashboard);
  const [theme, setTheme] = useState<Theme>(Theme.Light);
  const [loading, setLoading] = useState(true);
  const [dataInitialized, setDataInitialized] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [authStateStable, setAuthStateStable] = useState(false);
  const [apiKey] = useState<string>(() => {
    return import.meta.env.VITE_GEMINI_API_KEY || 
          import.meta.env.VITE_API_KEY || 
          import.meta.env.GEMINI_API_KEY || 
          '';
  });

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Wait for auth state to stabilize before initializing data
  useEffect(() => {
    // Wait a bit for Firebase auth to settle
    const timer = setTimeout(() => {
      console.log('🔥 App: Auth state stabilized, current user:', currentUser ? currentUser.uid : 'none');
      setAuthStateStable(true);
    }, 1500); // Give Firebase auth time to settle

    return () => clearTimeout(timer);
  }, [currentUser]);

  // Set current user in Firebase service when auth state is stable
  useEffect(() => {
    if (!authStateStable) return;

    const userId = currentUser?.uid || null;
    console.log('🔥 App: Setting Firebase user to:', userId);
    firebaseService.setCurrentUser(userId);
    
    // Reset data initialization when user changes
    setDataInitialized(false);
    setLoading(true);
  }, [currentUser, authStateStable]);

  // Initialize data when auth state is stable
  useEffect(() => {
    if (!authStateStable || dataInitialized) return;

    const initializeData = async () => {
      try {
        console.log('🔥 App: Initializing data for user:', currentUser ? currentUser.uid : 'anonymous');
        
        // Load theme first (doesn't need real-time updates)
        const userTheme = await firebaseService.loadTheme();
        setTheme(userTheme);
        
        if (currentUser) {
          // User is logged in - set up real-time listeners with delay
          console.log('🔥 App: Setting up real-time listeners for authenticated user');
          
          // Wait a bit more for Firebase to be fully ready
          setTimeout(() => {
            // Set up tasks real-time listener
            firebaseService.setupTasksListener((newTasks) => {
              console.log('🔥 App: Received real-time tasks update:', newTasks.length, 'tasks');
              setTasks(newTasks);
            });
            
            // Set up other listeners for prayer logs, quran logs, etc.
            // These will be used by respective components
            
            setDataInitialized(true);
            setLoading(false);
          }, 2000); // Additional delay for Firebase to be ready
          
        } else {
          // No user - show sample tasks
          console.log('🔥 App: No user logged in, showing sample tasks');
          setTasks(SAMPLE_TASKS);
          setDataInitialized(true);
          setLoading(false);
        }
        
      } catch (error) {
        console.error('🔥 App: Error initializing data:', error);
        
        // Fallback logic
        if (currentUser) {
          console.log('🔥 App: Error loading user data, trying again in 3 seconds...');
          // For authenticated users, try again after a delay
          setTimeout(() => {
            setDataInitialized(false);
            setLoading(true);
          }, 3000);
        } else {
          setTasks(SAMPLE_TASKS); // Sample tasks for anonymous users
          setDataInitialized(true);
          setLoading(false);
        }
      }
    };

    initializeData();
  }, [currentUser, authStateStable, dataInitialized]);

  // Apply theme
  useEffect(() => {
    if (theme === Theme.Dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Close mobile menu when view changes
  useEffect(() => {
    if (isMobile) {
      setIsMobileMenuOpen(false);
    }
  }, [currentView, isMobile]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobile && isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobile, isMobileMenuOpen]);

  // Cleanup listeners when component unmounts
  useEffect(() => {
    return () => {
      firebaseService.cleanup();
    };
  }, []);

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
    
    try {
      await firebaseService.saveTask(newTask);
      // Real-time listener will automatically update the UI
    } catch (error) {
      console.error('Error saving new task:', error);
      // Fallback: update local state directly
      setTasks(prevTasks => [...prevTasks, newTask]);
    }
  }, []);

  const updateTask = useCallback(async (updatedTask: Task): Promise<void> => {
    try {
      await firebaseService.saveTask(updatedTask);
      // Real-time listener will automatically update the UI
    } catch (error) {
      console.error('Error updating task:', error);
      // Fallback: update local state directly
      setTasks(prevTasks => prevTasks.map(task => task.id === updatedTask.id ? updatedTask : task));
    }
  }, []);

  const deleteTask = useCallback(async (taskId: string): Promise<void> => {
    try {
      await firebaseService.deleteTask(taskId);
      // Real-time listener will automatically update the UI
    } catch (error) {
      console.error('Error deleting task:', error);
      // Fallback: update local state directly
      setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
    }
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      // Clear all data and reset to initial state
      setTasks([]);
      setCurrentView(View.Dashboard);
      setDataInitialized(false);
      setAuthStateStable(false);
      firebaseService.cleanup();
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
    if (loading || !authStateStable) {
      return (
        <div className="flex items-center justify-center h-full px-4">
          <div className="text-center">
            <div className="relative mb-8">
              <div className="animate-spin rounded-full h-12 w-12 md:h-16 md:w-16 border-4 border-cyan-200 dark:border-cyan-800 border-t-cyan-500 dark:border-t-cyan-400 mx-auto mb-6"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-4 h-4 md:w-6 md:h-6 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-full animate-pulse"></div>
              </div>
            </div>
            <h3 className="text-lg md:text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">
              {currentUser ? 'Loading your data...' : 'Loading Salsabil...'}
            </h3>
            <p className="text-sm md:text-base text-slate-600 dark:text-slate-400">
              {currentUser ? 'Syncing with your account...' : 'Preparing your spring of productivity...'}
            </p>
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
        return <DashboardView tasks={tasks} />;
    }
  };

  // Navigation items for mobile bottom bar
  const mainNavItems = [
    { view: View.Dashboard, icon: <DashboardIcon />, label: 'Home' },
    { view: View.Planner, icon: <PlannerIcon />, label: 'Tasks' },
    { view: View.Calendar, icon: <CalendarIcon />, label: 'Calendar' },
    { view: View.Pomodoro, icon: <PomodoroIcon />, label: 'Focus' },
    { view: View.AIAssistant, icon: <AssistantIcon />, label: 'AI' },
  ];

  const spiritualNavItems = [
    { view: View.PrayerTracker, icon: <PrayerTrackerIcon />, label: 'Prayers' },
    { view: View.QuranLog, icon: <QuranLogIcon />, label: 'Quran' },
  ];

  // Show auth modal if user is not logged in and auth state is stable
  if (!currentUser && authStateStable) {
    return <AuthModal />;
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 dark:from-slate-900 dark:via-slate-800 dark:to-cyan-900 text-slate-800 dark:text-slate-200 transition-all duration-500">
      
      {/* Mobile Header */}
      {isMobile && (
        <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50 shadow-sm px-4 py-3 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg overflow-hidden shadow-md">
              <img 
                src="/salsabil-original.jpg" 
                alt="Salsabil" 
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 via-cyan-600 to-emerald-600 bg-clip-text text-transparent">
                Salsabil
              </h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              aria-label="Toggle menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </header>
      )}

      {/* Desktop Sidebar Navigation */}
      {!isMobile && (
        <nav className={`fixed left-0 top-0 h-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-r border-slate-200/50 dark:border-slate-700/50 shadow-2xl z-10 overflow-y-auto transition-all duration-300 ease-in-out
                        ${sidebarCollapsed ? 'w-20' : 'w-80'}`}>
          {/* Desktop Header */}
          <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50">
            <div className="flex items-center justify-between">
              {!sidebarCollapsed && (
                <div className="flex items-center space-x-3">
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
                    Blessed User • {tasks.length} tasks
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Navigation Items */}
          <div className="flex-1 px-4 py-6 space-y-2">
            {[...mainNavItems, ...spiritualNavItems].map(item => (
              <NavItem 
                key={item.view}
                icon={item.icon}
                label={item.label}
                isActive={currentView === item.view}
                onClick={() => setCurrentView(item.view)}
                isCollapsed={sidebarCollapsed}
              />
            ))}
          </div>
          
          {/* Desktop Footer */}
          <div className="p-4 border-t border-slate-200/50 dark:border-slate-700/50">
            <div className="flex items-center justify-center space-x-3">
              <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
              <button
                onClick={handleLogout}
                className="flex-1 flex items-center justify-center space-x-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 transition-all duration-200 group"
                title="Logout"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="text-sm font-medium">Logout</span>
              </button>
            </div>
          </div>
        </nav>
      )}

      {/* Mobile Menu Overlay */}
      {isMobile && isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={() => setIsMobileMenuOpen(false)}>
          <div 
            className="absolute right-0 top-0 h-full w-80 max-w-[85vw] bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl shadow-2xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Menu Header */}
            <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg overflow-hidden">
                    <img 
                      src="/salsabil-original.jpg" 
                      alt="Salsabil" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Menu</h2>
                  </div>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* User Info */}
            {currentUser && (
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
                      Blessed User • {tasks.length} tasks
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="px-4 py-6 space-y-1">
              <p className="px-4 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                Main
              </p>
              {mainNavItems.map(item => (
                <button
                  key={item.view}
                  onClick={() => setCurrentView(item.view)}
                  className={`w-full flex items-center space-x-3 p-4 rounded-xl transition-all ${
                    currentView === item.view 
                      ? 'bg-gradient-to-r from-primary to-primary-dark text-white shadow-lg' 
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {item.icon}
                  <span className="font-medium">{item.label}</span>
                </button>
              ))}

              <p className="px-4 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 mt-6">
                🌙 Spiritual
              </p>
              {spiritualNavItems.map(item => (
                <button
                  key={item.view}
                  onClick={() => setCurrentView(item.view)}
                  className={`w-full flex items-center space-x-3 p-4 rounded-xl transition-all ${
                    currentView === item.view 
                      ? 'bg-gradient-to-r from-primary to-primary-dark text-white shadow-lg' 
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {item.icon}
                  <span className="font-medium">{item.label}</span>
                </button>
              ))}
            </div>

            {/* Mobile Menu Footer */}
            <div className="p-4 border-t border-slate-200/50 dark:border-slate-700/50 mt-auto">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center space-x-2 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 transition-all duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="font-medium">Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className={`flex-1 flex flex-col min-w-0 overflow-hidden transition-all duration-300 ease-in-out ${!isMobile ? (sidebarCollapsed ? 'ml-20' : 'ml-80') : ''}`}>
        {/* Desktop Header Bar */}
        {!isMobile && (
          <header className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50 px-6 py-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                {getViewTitle(currentView)}
              </h2>
              <div className="flex items-center space-x-4">
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  {new Date().toLocaleDateString(undefined, { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </div>
                {currentUser && dataInitialized && (
                  <div className="flex items-center space-x-2 text-sm text-slate-500 dark:text-slate-500">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>Synced</span>
                  </div>
                )}
              </div>
            </div>
          </header>
        )}

        {/* Content */}
        <div className={`flex-1 overflow-auto ${isMobile ? 'pb-20' : 'p-6'} ${isMobile ? 'px-4 pt-4' : ''}`}>
          {renderView()}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border-t border-slate-200/50 dark:border-slate-700/50 shadow-lg z-40">
          <div className="grid grid-cols-5 h-16">
            {mainNavItems.map(item => (
              <button
                key={item.view}
                onClick={() => setCurrentView(item.view)}
                className={`flex flex-col items-center justify-center space-y-1 transition-all ${
                  currentView === item.view 
                    ? 'text-primary dark:text-primary-light bg-primary/10 dark:bg-primary-dark/20' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-primary-light hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <div className="scale-90">
                  {item.icon}
                </div>
                <span className="text-xs font-medium">{item.label}</span>
                {currentView === item.view && (
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-primary dark:bg-primary-light rounded-full"></div>
                )}
              </button>
            ))}
          </div>
        </nav>
      )}
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