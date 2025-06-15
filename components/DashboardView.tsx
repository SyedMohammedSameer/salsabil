// Mobile-Optimized DashboardView.tsx with responsive design
import React, { useMemo, useEffect, useState } from 'react';
import { Task, Priority, DailyPrayerLog, DailyQuranLog, PomodoroMode } from '../types';
import { DashboardIcon, CheckCircleIcon, ListIcon, PrayerTrackerIcon, QuranLogIcon, PomodoroIcon } from './icons/NavIcons';
import * as firebaseService from '../services/firebaseService';
import type { FocusSession } from '../services/firebaseService';

interface DashboardViewProps {
  tasks: Task[];
}

// Enhanced Chart Components with mobile optimization
const ProgressRing: React.FC<{ 
  percentage: number; 
  size?: number; 
  strokeWidth?: number; 
  color?: string;
  isMobile?: boolean;
}> = ({ 
  percentage, 
  size = 120, 
  strokeWidth = 8, 
  color = '#10b981',
  isMobile = false
}) => {
  const mobileSize = isMobile ? Math.min(size, 100) : size;
  const mobileStroke = isMobile ? Math.max(strokeWidth - 2, 4) : strokeWidth;
  const radius = (mobileSize - mobileStroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative" style={{ width: mobileSize, height: mobileSize }}>
      <svg
        width={mobileSize}
        height={mobileSize}
        className="transform -rotate-90"
      >
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
          stroke={color}
          strokeWidth={mobileStroke}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`font-bold text-slate-700 dark:text-slate-200 ${isMobile ? 'text-lg' : 'text-2xl'}`}>
          {Math.round(percentage)}%
        </span>
      </div>
    </div>
  );
};

const AnimatedCounter: React.FC<{ 
  end: number; 
  duration?: number; 
  suffix?: string;
  isMobile?: boolean;
}> = ({ 
  end, 
  duration = 1000, 
  suffix = '',
  isMobile = false
}) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    const startValue = 0;
    const endValue = end;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (endValue - startValue) * easeOut;
      
      setCount(Math.floor(current));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [end, duration]);

  return <span className={isMobile ? 'text-xl' : 'text-2xl'}>{count}{suffix}</span>;
};

const GradientBar: React.FC<{ 
  data: { name: string; value: number; color: string; maxValue?: number }[];
  isMobile?: boolean;
}> = ({ data, isMobile = false }) => {
  const maxValue = Math.max(...data.map(d => d.maxValue || d.value));
  
  return (
    <div className={`space-y-${isMobile ? '3' : '4'}`}>
      {data.map((item, index) => (
        <div key={index} className="flex items-center">
          <span className={`font-medium text-slate-600 dark:text-slate-400 truncate ${isMobile ? 'w-16 text-xs' : 'w-20 text-sm'}`}>
            {item.name}
          </span>
          <div className={`flex-1 bg-slate-200 dark:bg-slate-700 rounded-full relative overflow-hidden ${isMobile ? 'mx-2 h-2' : 'mx-4 h-3'}`}>
            <div 
              className={`h-full rounded-full transition-all duration-1000 ease-out ${item.color}`}
              style={{ 
                width: `${maxValue > 0 ? Math.min((item.value / maxValue) * 100, 100) : 0}%`,
                animationDelay: `${index * 100}ms`
              }}
            />
          </div>
          <span className={`font-bold text-slate-600 dark:text-slate-400 text-right ${isMobile ? 'w-8 text-xs' : 'w-12 text-sm'}`}>
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
};

const WeeklyHeatmap: React.FC<{ 
  weeklyData: { day: string; value: number; max: number }[];
  isMobile?: boolean;
}> = ({ weeklyData, isMobile = false }) => {
  return (
    <div className={`grid grid-cols-7 ${isMobile ? 'gap-1' : 'gap-2'}`}>
      {weeklyData.map((day, index) => {
        const intensity = day.max > 0 ? (day.value / day.max) * 100 : 0;
        const opacityClass = intensity > 75 ? 'opacity-100' : intensity > 50 ? 'opacity-75' : intensity > 25 ? 'opacity-50' : intensity > 0 ? 'opacity-25' : 'opacity-10';
        
        return (
          <div key={index} className="text-center">
            <div 
              className={`mx-auto rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 ${opacityClass} transition-all duration-300 hover:scale-110 flex items-center justify-center mb-2
                         ${isMobile ? 'w-6 h-6' : 'w-8 h-8'}`}
              title={`${day.day}: ${day.value}`}
            >
              <span className={`text-white font-bold ${isMobile ? 'text-xs' : 'text-xs'}`}>{day.value}</span>
            </div>
            <span className={`text-slate-600 dark:text-slate-400 ${isMobile ? 'text-xs' : 'text-xs'}`}>{day.day}</span>
          </div>
        );
      })}
    </div>
  );
};

const StatCard: React.FC<{ 
  title: string; 
  value: number; 
  icon: React.ReactNode; 
  trend?: number; 
  color?: string;
  suffix?: string;
  isMobile?: boolean;
}> = ({ title, value, icon, trend, color = 'from-blue-500 to-indigo-600', suffix = '', isMobile = false }) => {
  return (
    <div className={`bg-white/70 dark:bg-slate-800/70 backdrop-blur-md rounded-xl shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300
                    ${isMobile ? 'p-3' : 'p-4'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className={`bg-gradient-to-br ${color} rounded-lg flex items-center justify-center
                        ${isMobile ? 'w-6 h-6' : 'w-8 h-8'}`}>
          <div className={isMobile ? 'scale-75' : ''}>
            {icon}
          </div>
        </div>
        {trend !== undefined && (
          <div className={`flex items-center font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-600'}
                          ${isMobile ? 'text-xs' : 'text-xs'}`}>
            <svg className={`mr-1 ${trend >= 0 ? 'rotate-0' : 'rotate-180'} ${isMobile ? 'w-2 h-2' : 'w-3 h-3'}`} fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 4l8 8h-6v8h-4v-8H4l8-8z"/>
            </svg>
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <h3 className={`font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1
                     ${isMobile ? 'text-xs' : 'text-xs'}`}>
        {title}
      </h3>
      <p className={`font-bold text-slate-800 dark:text-slate-100 ${isMobile ? 'text-xl' : 'text-2xl'}`}>
        <AnimatedCounter end={value} suffix={suffix} isMobile={isMobile} />
      </p>
    </div>
  );
};

const DashboardView: React.FC<DashboardViewProps> = ({ tasks }) => {
  const [prayerLogs, setPrayerLogs] = useState<DailyPrayerLog[]>([]);
  const [quranLogs, setQuranLogs] = useState<DailyQuranLog[]>([]);
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load all data with optimized caching
  useEffect(() => {
    const loadData = async () => {
      try {
        const [prayers, quran, sessions] = await Promise.all([
          firebaseService.loadPrayerLogs(),
          firebaseService.loadQuranLogs(),
          firebaseService.loadPomodoroSessions()
        ]);
        setPrayerLogs(prayers);
        setQuranLogs(quran);
        setFocusSessions(sessions);
      } catch (error) {
        console.error('Dashboard: Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Calculate comprehensive statistics
  const stats = useMemo(() => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.completed).length;
    const completionPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    
    const priorityStats = {
      high: tasks.filter(t => t.priority === Priority.High).length,
      medium: tasks.filter(t => t.priority === Priority.Medium).length,
      low: tasks.filter(t => t.priority === Priority.Low).length
    };

    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    const prayerCompletionRate = last7Days.map(date => {
      const log = prayerLogs.find(l => l.date === date);
      if (!log) return 0;
      const totalPrayers = 5;
      const completedPrayers = Object.values(log.prayers).filter(p => p?.fardh).length;
      return (completedPrayers / totalPrayers) * 100;
    });

    const avgPrayerCompletion = prayerCompletionRate.reduce((sum, rate) => sum + rate, 0) / 7;

    const quranReadingData = last7Days.map(date => {
      const log = quranLogs.find(l => l.date === date);
      return log?.pagesRead || 0;
    });

    const totalQuranPages = quranReadingData.reduce((sum, pages) => sum + pages, 0);
    const quranStreak = calculateQuranStreak();

    const weeklyFocusTime = focusSessions
      .filter(s => {
        const sessionDate = s.completedAt.toDateString();
        return last7Days.some(date => new Date(date).toDateString() === sessionDate) &&
               s.type === 'Work';
      })
      .reduce((total, s) => total + Math.round(s.actualTimeSpent / 60), 0);

    const focusHeatmapData = last7Days.map(date => {
      const dayFocusTime = focusSessions.filter(s => 
        s.completedAt.toDateString() === new Date(date).toDateString() &&
        s.type === 'Work'
      ).reduce((total, s) => total + Math.round(s.actualTimeSpent / 60), 0);
      
      return {
        day: new Date(date).toLocaleDateString(undefined, { weekday: 'short' }),
        value: dayFocusTime,
        max: Math.max(...last7Days.map(d => {
          return focusSessions.filter(s => 
            s.completedAt.toDateString() === new Date(d).toDateString() &&
            s.type === 'Work'
          ).reduce((total, s) => total + Math.round(s.actualTimeSpent / 60), 0);
        }), 1)
      };
    });

    const today = new Date().toISOString().split('T')[0];
    const todayPrayers = prayerLogs.find(l => l.date === today);
    const todayPrayerCount = todayPrayers ? Object.values(todayPrayers.prayers).filter(p => p?.fardh).length : 0;
    const todayQuran = quranLogs.find(l => l.date === today);
    const todayQuranPages = todayQuran?.pagesRead || 0;

    const weeklyTaskData = last7Days.map(date => {
      const dayTasks = tasks.filter(t => t.date === date);
      const completedDayTasks = dayTasks.filter(t => t.completed).length;
      return {
        day: new Date(date).toLocaleDateString(undefined, { weekday: 'short' }),
        value: completedDayTasks,
        max: Math.max(...last7Days.map(d => {
          const dt = tasks.filter(t => t.date === d);
          return dt.filter(t => t.completed).length;
        }), 1)
      };
    });

    const overdueTasks = tasks.filter(t => !t.completed && new Date(t.date) < new Date()).length;
    const todayTasks = tasks.filter(t => t.date === today).length;
    const todayCompletedTasks = tasks.filter(t => t.date === today && t.completed).length;

    function calculateQuranStreak(): number {
      let streak = 0;
      const today = new Date();
      
      for (let i = 0; i < 30; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() - i);
        const dateString = checkDate.toISOString().split('T')[0];
        const log = quranLogs.find(l => l.date === dateString);
        
        if (log && log.readQuran) {
          streak++;
        } else if (i === 0 && (!log || !log.readQuran)) {
          continue;
        } else {
          break;
        }
      }
      return streak;
    }

    return {
      totalTasks,
      completedTasks,
      completionPercentage,
      priorityStats,
      prayerCompletionRate,
      avgPrayerCompletion,
      quranReadingData,
      totalQuranPages,
      quranStreak,
      todayPrayerCount,
      todayQuranPages,
      weeklyTaskData,
      overdueTasks,
      todayTasks,
      todayCompletedTasks,
      last7Days,
      weeklyFocusTime,
      focusHeatmapData
    };
  }, [tasks, prayerLogs, quranLogs, focusSessions]);

  if (loading) {
    return (
      <div className="animate-fadeIn flex items-center justify-center h-full">
        <div className="text-center p-4">
          <div className={`animate-spin rounded-full border-b-2 border-primary mx-auto mb-4 ${isMobile ? 'h-8 w-8' : 'h-12 w-12'}`}></div>
          <p className={`text-slate-600 dark:text-slate-400 ${isMobile ? 'text-sm' : 'text-base'}`}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`animate-fadeIn min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900 ${isMobile ? 'p-2' : 'p-4'}`}>
      {/* Header */}
      <div className={`mb-${isMobile ? '4' : '6'}`}>
        <div className={`flex items-center mb-${isMobile ? '3' : '4'}`}>
          <div className={`bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mr-3
                          ${isMobile ? 'w-8 h-8' : 'w-10 h-10'}`}>
            <DashboardIcon />
          </div>
          <div>
            <h1 className={`font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent
                           ${isMobile ? 'text-2xl' : 'text-3xl'}`}>
              Dashboard
            </h1>
            <p className={`text-slate-600 dark:text-slate-400 ${isMobile ? 'text-sm' : 'text-base'}`}>Your productivity and spiritual journey at a glance</p>
          </div>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className={`grid gap-${isMobile ? '3' : '4'} mb-${isMobile ? '4' : '6'}
                      ${isMobile ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5'}`}>
        <StatCard 
          title="Tasks" 
          value={stats.totalTasks} 
          icon={<ListIcon className="w-5 h-5 text-white" />}
          color="from-blue-500 to-blue-600"
          isMobile={isMobile}
        />
        <StatCard 
          title="Today" 
          value={stats.todayCompletedTasks} 
          icon={<CheckCircleIcon className="w-5 h-5 text-white" />}
          color="from-emerald-500 to-emerald-600"
          trend={stats.todayCompletedTasks > 0 ? 15 : -5}
          isMobile={isMobile}
        />
        {!isMobile && (
          <>
            <StatCard 
              title="Prayers" 
              value={stats.todayPrayerCount} 
              icon={<PrayerTrackerIcon className="w-5 h-5 text-white" />}
              color="from-purple-500 to-purple-600"
              suffix="/5"
              isMobile={isMobile}
            />
            <StatCard 
              title="Streak" 
              value={stats.quranStreak} 
              icon={<QuranLogIcon className="w-5 h-5 text-white" />}
              color="from-teal-500 to-teal-600"
              suffix="d"
              isMobile={isMobile}
            />
            <StatCard 
              title="Focus Time" 
              value={stats.weeklyFocusTime} 
              icon={<PomodoroIcon className="w-5 h-5 text-white" />}
              color="from-orange-500 to-red-600"
              suffix="m"
              isMobile={isMobile}
            />
          </>
        )}
      </div>

      {/* Mobile-specific additional stats */}
      {isMobile && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <StatCard 
            title="Prayers" 
            value={stats.todayPrayerCount} 
            icon={<PrayerTrackerIcon className="w-5 h-5 text-white" />}
            color="from-purple-500 to-purple-600"
            suffix="/5"
            isMobile={isMobile}
          />
          <StatCard 
            title="Streak" 
            value={stats.quranStreak} 
            icon={<QuranLogIcon className="w-5 h-5 text-white" />}
            color="from-teal-500 to-teal-600"
            suffix="d"
            isMobile={isMobile}
          />
          <StatCard 
            title="Focus" 
            value={stats.weeklyFocusTime} 
            icon={<PomodoroIcon className="w-5 h-5 text-white" />}
            color="from-orange-500 to-red-600"
            suffix="m"
            isMobile={isMobile}
          />
        </div>
      )}

      {/* Main Analytics - Mobile optimized layout */}
      <div className={`mb-${isMobile ? '4' : '6'}`}>
        <div className={`bg-white/70 dark:bg-slate-800/70 backdrop-blur-md rounded-xl shadow-lg border border-white/20
                        ${isMobile ? 'p-4' : 'p-6'}`}>
          <h3 className={`font-semibold text-slate-700 dark:text-slate-200 mb-${isMobile ? '3' : '4'}
                         ${isMobile ? 'text-base' : 'text-lg'}`}>Task Completion Overview</h3>
          <div className={`grid gap-${isMobile ? '4' : '6'} ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
            <div className="text-center">
              <ProgressRing 
                percentage={stats.completionPercentage} 
                size={isMobile ? 100 : 120}
                color="#10b981"
                isMobile={isMobile}
              />
              <p className={`mt-3 text-slate-600 dark:text-slate-400 ${isMobile ? 'text-sm' : 'text-sm'}`}>Overall Completion</p>
            </div>
            <div className={`space-y-${isMobile ? '3' : '4'}`}>
              <div>
                <h4 className={`font-semibold text-slate-700 dark:text-slate-200 mb-3 ${isMobile ? 'text-sm' : 'text-base'}`}>Priority Breakdown</h4>
                <GradientBar 
                  data={[
                    { name: 'High', value: stats.priorityStats.high, color: 'bg-gradient-to-r from-red-500 to-red-600' },
                    { name: 'Medium', value: stats.priorityStats.medium, color: 'bg-gradient-to-r from-amber-500 to-amber-600' },
                    { name: 'Low', value: stats.priorityStats.low, color: 'bg-gradient-to-r from-emerald-500 to-emerald-600' }
                  ]}
                  isMobile={isMobile}
                />
              </div>
              <div className={`pt-3 border-t border-slate-200 dark:border-slate-600`}>
                <div className={`flex justify-between ${isMobile ? 'text-sm' : 'text-sm'}`}>
                  <span className="text-slate-600 dark:text-slate-400">Overdue Tasks</span>
                  <span className="font-bold text-red-600">{stats.overdueTasks}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Trends - Stack on mobile */}
      <div className={`grid gap-${isMobile ? '4' : '6'} mb-${isMobile ? '4' : '6'} ${isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
        <div className={`bg-white/70 dark:bg-slate-800/70 backdrop-blur-md rounded-xl shadow-lg border border-white/20
                        ${isMobile ? 'p-4' : 'p-6'}`}>
          <h3 className={`font-semibold text-slate-700 dark:text-slate-200 mb-${isMobile ? '3' : '4'}
                         ${isMobile ? 'text-base' : 'text-lg'}`}>Weekly Task Activity</h3>
          <WeeklyHeatmap weeklyData={stats.weeklyTaskData} isMobile={isMobile} />
        </div>

        <div className={`bg-white/70 dark:bg-slate-800/70 backdrop-blur-md rounded-xl shadow-lg border border-white/20
                        ${isMobile ? 'p-4' : 'p-6'}`}>
          <h3 className={`font-semibold text-slate-700 dark:text-slate-200 mb-${isMobile ? '3' : '4'} flex items-center
                         ${isMobile ? 'text-base' : 'text-lg'}`}>
            <PomodoroIcon className={`mr-2 ${isMobile ? 'w-4 h-4' : 'w-4 h-4'}`} />
            Focus Time
          </h3>
          <WeeklyHeatmap weeklyData={stats.focusHeatmapData} isMobile={isMobile} />
          <div className="mt-4 text-center">
            <div className={`p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg`}>
              <p className={`font-bold text-orange-600 dark:text-orange-400 ${isMobile ? 'text-lg' : 'text-lg'}`}>{stats.weeklyFocusTime}m</p>
              <p className={`text-slate-600 dark:text-slate-400 ${isMobile ? 'text-xs' : 'text-xs'}`}>This week</p>
            </div>
          </div>
        </div>
      </div>

      {/* Spiritual Progress and Today's Focus - Stack on mobile */}
      <div className={`grid gap-${isMobile ? '4' : '6'} mb-${isMobile ? '4' : '6'} ${isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
        <div className={`bg-white/70 dark:bg-slate-800/70 backdrop-blur-md rounded-xl shadow-lg border border-white/20
                        ${isMobile ? 'p-4' : 'p-6'}`}>
          <h3 className={`font-semibold text-slate-700 dark:text-slate-200 mb-${isMobile ? '3' : '4'}
                         ${isMobile ? 'text-base' : 'text-lg'}`}>Spiritual Progress</h3>
          <div className={`space-y-${isMobile ? '3' : '4'}`}>
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className={`font-medium text-slate-600 dark:text-slate-400 ${isMobile ? 'text-sm' : 'text-sm'}`}>Prayer Completion (7 days avg)</span>
                <span className={`font-bold text-purple-600 dark:text-purple-400 ${isMobile ? 'text-base' : 'text-lg'}`}>
                  {Math.round(stats.avgPrayerCompletion)}%
                </span>
              </div>
              <div className={`w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden ${isMobile ? 'h-2' : 'h-3'}`}>
                <div 
                  className="h-full bg-gradient-to-r from-purple-400 to-purple-600 rounded-full transition-all duration-1000"
                  style={{ width: `${stats.avgPrayerCompletion}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className={`font-medium text-slate-600 dark:text-slate-400 ${isMobile ? 'text-sm' : 'text-sm'}`}>Quran Pages This Week</span>
                <span className={`font-bold text-teal-600 dark:text-teal-400 ${isMobile ? 'text-base' : 'text-lg'}`}>{stats.totalQuranPages}</span>
              </div>
              <div className={`w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden ${isMobile ? 'h-2' : 'h-3'}`}>
                <div 
                  className="h-full bg-gradient-to-r from-teal-400 to-teal-600 rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min((stats.totalQuranPages / 35) * 100, 100)}%` }}
                />
              </div>
            </div>

            <div className={`pt-4 border-t border-slate-200 dark:border-slate-600`}>
              <div className="text-center">
                <div className={`font-bold text-emerald-600 dark:text-emerald-400 mb-1 ${isMobile ? 'text-xl' : 'text-2xl'}`}>
                  {stats.quranStreak}
                </div>
                <div className={`text-slate-600 dark:text-slate-400 ${isMobile ? 'text-sm' : 'text-sm'}`}>
                  Day reading streak
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={`bg-white/70 dark:bg-slate-800/70 backdrop-blur-md rounded-xl shadow-lg border border-white/20
                        ${isMobile ? 'p-4' : 'p-6'}`}>
          <h3 className={`font-semibold text-slate-700 dark:text-slate-200 mb-${isMobile ? '3' : '4'}
                         ${isMobile ? 'text-base' : 'text-lg'}`}>Today's Focus</h3>
          <div className={`space-y-${isMobile ? '3' : '4'}`}>
            <div className={`text-center bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl text-white
                            ${isMobile ? 'p-3' : 'p-4'}`}>
              <div className={`font-bold ${isMobile ? 'text-xl' : 'text-2xl'}`}>{stats.todayTasks}</div>
              <div className={`text-blue-100 ${isMobile ? 'text-sm' : 'text-sm'}`}>Tasks Planned</div>
            </div>
            
            <div className={`space-y-${isMobile ? '2' : '3'}`}>
              <div className={`flex items-center justify-between bg-emerald-50 dark:bg-emerald-900/20 rounded-lg
                              ${isMobile ? 'p-2' : 'p-3'}`}>
                <span className={`text-emerald-700 dark:text-emerald-300 font-medium ${isMobile ? 'text-sm' : 'text-sm'}`}>Prayers</span>
                <span className={`text-emerald-800 dark:text-emerald-200 font-bold ${isMobile ? 'text-sm' : 'text-base'}`}>{stats.todayPrayerCount}/5</span>
              </div>
              
              <div className={`flex items-center justify-between bg-teal-50 dark:bg-teal-900/20 rounded-lg
                              ${isMobile ? 'p-2' : 'p-3'}`}>
                <span className={`text-teal-700 dark:text-teal-300 font-medium ${isMobile ? 'text-sm' : 'text-sm'}`}>Quran Pages</span>
                <span className={`text-teal-800 dark:text-teal-200 font-bold ${isMobile ? 'text-sm' : 'text-base'}`}>{stats.todayQuranPages}</span>
              </div>
              
              <div className={`flex items-center justify-between bg-orange-50 dark:bg-orange-900/20 rounded-lg
                              ${isMobile ? 'p-2' : 'p-3'}`}>
                <span className={`text-orange-700 dark:text-orange-300 font-medium ${isMobile ? 'text-sm' : 'text-sm'}`}>Focus Time</span>
                <span className={`text-orange-800 dark:text-orange-200 font-bold ${isMobile ? 'text-sm' : 'text-base'}`}>
                  {Math.round(focusSessions
                    .filter(s => s.completedAt.toDateString() === new Date().toDateString() && s.type === 'Work')
                    .reduce((total, s) => total + s.actualTimeSpent / 60, 0))}m
                </span>
              </div>
              
              <div className={`flex items-center justify-between bg-purple-50 dark:bg-purple-900/20 rounded-lg
                              ${isMobile ? 'p-2' : 'p-3'}`}>
                <span className={`text-purple-700 dark:text-purple-300 font-medium ${isMobile ? 'text-sm' : 'text-sm'}`}>Completion Rate</span>
                <span className={`text-purple-800 dark:text-purple-200 font-bold ${isMobile ? 'text-sm' : 'text-base'}`}>
                  {stats.todayTasks > 0 ? Math.round((stats.todayCompletedTasks / stats.todayTasks) * 100) : 0}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Insights Panel */}
      <div className={`bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-xl text-white shadow-xl
                      ${isMobile ? 'p-4' : 'p-6'}`}>
        <h3 className={`font-bold mb-${isMobile ? '3' : '4'} ${isMobile ? 'text-lg' : 'text-xl'}`}>Weekly Insights</h3>
        <div className={`grid gap-${isMobile ? '3' : '4'} ${isMobile ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'}`}>
          <div className={`bg-white/20 backdrop-blur-sm rounded-lg ${isMobile ? 'p-3' : 'p-4'}`}>
            <h4 className={`font-bold mb-2 ${isMobile ? 'text-sm' : 'text-base'}`}>📋 Productivity</h4>
            <p className={`text-indigo-100 ${isMobile ? 'text-sm' : 'text-sm'}`}>
              {stats.completionPercentage > 80 ? "Outstanding progress! You're crushing your goals! 🚀" : 
               stats.completionPercentage > 60 ? "Great momentum! Keep the energy going! ⚡" : 
               "Room for growth. Try breaking tasks into smaller steps! 💪"}
            </p>
          </div>
          
          <div className={`bg-white/20 backdrop-blur-sm rounded-lg ${isMobile ? 'p-3' : 'p-4'}`}>
            <h4 className={`font-bold mb-2 ${isMobile ? 'text-sm' : 'text-base'}`}>🍅 Focus</h4>
            <p className={`text-purple-100 ${isMobile ? 'text-sm' : 'text-sm'}`}>
              {stats.weeklyFocusTime > 120 ? "Excellent focus this week! Your concentration is on point! 🎯" :
               stats.weeklyFocusTime > 60 ? "Good focus sessions! Keep building that habit! ⏰" :
               "Try using the Pomodoro timer to improve your focus! 🍅"}
            </p>
          </div>
          
          <div className={`bg-white/20 backdrop-blur-sm rounded-lg ${isMobile ? 'p-3' : 'p-4'}`}>
            <h4 className={`font-bold mb-2 ${isMobile ? 'text-sm' : 'text-base'}`}>🤲 Prayers</h4>
            <p className={`text-purple-100 ${isMobile ? 'text-sm' : 'text-sm'}`}>
              {stats.avgPrayerCompletion > 80 ? "Mashallah! Your spiritual routine is excellent! ✨" : 
               stats.avgPrayerCompletion > 50 ? "Good progress! Consistency is key! 🌟" : 
               "Consider setting prayer reminders to build consistency! ⏰"}
            </p>
          </div>
          
          <div className={`bg-white/20 backdrop-blur-sm rounded-lg ${isMobile ? 'p-3' : 'p-4'}`}>
            <h4 className={`font-bold mb-2 ${isMobile ? 'text-sm' : 'text-base'}`}>📖 Quran</h4>
            <p className={`text-pink-100 ${isMobile ? 'text-sm' : 'text-sm'}`}>
              {stats.quranStreak > 7 ? "Amazing streak! Your dedication is inspiring! 🌙" : 
               stats.quranStreak > 0 ? "Great start! Keep building that habit! 📚" : 
               "Every verse matters. Start with just one page today! 🌱"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;