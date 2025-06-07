// Enhanced Dashboard View with modern charts and better layout
import React, { useMemo, useEffect, useState } from 'react';
import { Task, Priority, DailyPrayerLog, DailyQuranLog } from '../types';
import { DashboardIcon, CheckCircleIcon, ListIcon, PrayerTrackerIcon, QuranLogIcon, PomodoroIcon } from './icons/NavIcons';
import * as firebaseService from '../services/firebaseService';

interface DashboardViewProps {
  tasks: Task[];
}

// Enhanced Chart Components
const ProgressRing: React.FC<{ percentage: number; size?: number; strokeWidth?: number; color?: string }> = ({ 
  percentage, 
  size = 120, 
  strokeWidth = 8, 
  color = '#10b981' 
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-slate-200 dark:text-slate-700"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold text-slate-700 dark:text-slate-200">
          {Math.round(percentage)}%
        </span>
      </div>
    </div>
  );
};

const AnimatedCounter: React.FC<{ end: number; duration?: number; suffix?: string }> = ({ 
  end, 
  duration = 1000, 
  suffix = '' 
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
      
      // Easing function
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (endValue - startValue) * easeOut;
      
      setCount(Math.floor(current));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [end, duration]);

  return <span>{count}{suffix}</span>;
};

const GradientBar: React.FC<{ 
  data: { name: string; value: number; color: string; maxValue?: number }[] 
}> = ({ data }) => {
  const maxValue = Math.max(...data.map(d => d.maxValue || d.value));
  
  return (
    <div className="space-y-4">
      {data.map((item, index) => (
        <div key={index} className="flex items-center">
          <span className="w-20 text-sm font-medium text-slate-600 dark:text-slate-400 truncate">
            {item.name}
          </span>
          <div className="flex-1 mx-4 bg-slate-200 dark:bg-slate-700 rounded-full h-3 relative overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-1000 ease-out ${item.color}`}
              style={{ 
                width: `${maxValue > 0 ? Math.min((item.value / maxValue) * 100, 100) : 0}%`,
                animationDelay: `${index * 100}ms`
              }}
            />
          </div>
          <span className="w-12 text-sm font-bold text-slate-600 dark:text-slate-400 text-right">
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
};

const WeeklyHeatmap: React.FC<{ weeklyData: { day: string; value: number; max: number }[] }> = ({ weeklyData }) => {
  return (
    <div className="grid grid-cols-7 gap-2">
      {weeklyData.map((day, index) => {
        const intensity = day.max > 0 ? (day.value / day.max) * 100 : 0;
        const opacityClass = intensity > 75 ? 'opacity-100' : intensity > 50 ? 'opacity-75' : intensity > 25 ? 'opacity-50' : intensity > 0 ? 'opacity-25' : 'opacity-10';
        
        return (
          <div key={index} className="text-center">
            <div 
              className={`w-12 h-12 mx-auto rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 ${opacityClass} transition-all duration-300 hover:scale-110 flex items-center justify-center mb-2`}
              title={`${day.day}: ${day.value}`}
            >
              <span className="text-white text-sm font-bold">{day.value}</span>
            </div>
            <span className="text-xs text-slate-600 dark:text-slate-400">{day.day}</span>
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
}> = ({ title, value, icon, trend, color = 'from-blue-500 to-indigo-600', suffix = '' }) => {
  return (
    <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 bg-gradient-to-br ${color} rounded-xl flex items-center justify-center`}>
          {icon}
        </div>
        {trend !== undefined && (
          <div className={`flex items-center text-sm font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            <svg className={`w-4 h-4 mr-1 ${trend >= 0 ? 'rotate-0' : 'rotate-180'}`} fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 4l8 8h-6v8h-4v-8H4l8-8z"/>
            </svg>
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">
        {title}
      </h3>
      <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">
        <AnimatedCounter end={value} suffix={suffix} />
      </p>
    </div>
  );
};

const DashboardView: React.FC<DashboardViewProps> = ({ tasks }) => {
  const [prayerLogs, setPrayerLogs] = useState<DailyPrayerLog[]>([]);
  const [quranLogs, setQuranLogs] = useState<DailyQuranLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Load all data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [prayers, quran] = await Promise.all([
          firebaseService.loadPrayerLogs(),
          firebaseService.loadQuranLogs()
        ]);
        setPrayerLogs(prayers);
        setQuranLogs(quran);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
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
    
    // Priority distribution
    const priorityStats = {
      high: tasks.filter(t => t.priority === Priority.High).length,
      medium: tasks.filter(t => t.priority === Priority.Medium).length,
      low: tasks.filter(t => t.priority === Priority.Low).length
    };

    // Date calculations
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    // Prayer statistics
    const prayerCompletionRate = last7Days.map(date => {
      const log = prayerLogs.find(l => l.date === date);
      if (!log) return 0;
      const totalPrayers = 5;
      const completedPrayers = Object.values(log.prayers).filter(p => p?.fardh).length;
      return (completedPrayers / totalPrayers) * 100;
    });

    const avgPrayerCompletion = prayerCompletionRate.reduce((sum, rate) => sum + rate, 0) / 7;

    // Quran statistics
    const quranReadingData = last7Days.map(date => {
      const log = quranLogs.find(l => l.date === date);
      return log?.pagesRead || 0;
    });

    const totalQuranPages = quranReadingData.reduce((sum, pages) => sum + pages, 0);
    const quranStreak = calculateQuranStreak();

    // Today's data
    const today = new Date().toISOString().split('T')[0];
    const todayPrayers = prayerLogs.find(l => l.date === today);
    const todayPrayerCount = todayPrayers ? Object.values(todayPrayers.prayers).filter(p => p?.fardh).length : 0;
    const todayQuran = quranLogs.find(l => l.date === today);
    const todayQuranPages = todayQuran?.pagesRead || 0;

    // Weekly task completion trend
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

    // Productivity insights
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
      last7Days
    };
  }, [tasks, prayerLogs, quranLogs]);

  if (loading) {
    return (
      <div className="animate-fadeIn flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900 p-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mr-4">
            <DashboardIcon />
          </div>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Dashboard
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">Your productivity and spiritual journey at a glance</p>
          </div>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard 
          title="Total Tasks" 
          value={stats.totalTasks} 
          icon={<ListIcon className="w-6 h-6 text-white" />}
          color="from-blue-500 to-blue-600"
        />
        <StatCard 
          title="Completed Today" 
          value={stats.todayCompletedTasks} 
          icon={<CheckCircleIcon className="w-6 h-6 text-white" />}
          color="from-emerald-500 to-emerald-600"
          trend={stats.todayCompletedTasks > 0 ? 15 : -5}
        />
        <StatCard 
          title="Prayer Streak" 
          value={stats.todayPrayerCount} 
          icon={<PrayerTrackerIcon className="w-6 h-6 text-white" />}
          color="from-purple-500 to-purple-600"
          suffix="/5"
        />
        <StatCard 
          title="Quran Streak" 
          value={stats.quranStreak} 
          icon={<QuranLogIcon className="w-6 h-6 text-white" />}
          color="from-teal-500 to-teal-600"
          suffix=" days"
        />
      </div>

      {/* Main Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Task Completion Overview */}
        <div className="lg:col-span-2 bg-white/70 dark:bg-slate-800/70 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/20">
          <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-6">Task Completion Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="text-center">
              <ProgressRing 
                percentage={stats.completionPercentage} 
                size={140}
                color="#10b981"
              />
              <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">Overall Completion</p>
            </div>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-slate-700 dark:text-slate-200 mb-3">Priority Breakdown</h4>
                <GradientBar 
                  data={[
                    { name: 'High', value: stats.priorityStats.high, color: 'bg-gradient-to-r from-red-500 to-red-600' },
                    { name: 'Medium', value: stats.priorityStats.medium, color: 'bg-gradient-to-r from-amber-500 to-amber-600' },
                    { name: 'Low', value: stats.priorityStats.low, color: 'bg-gradient-to-r from-emerald-500 to-emerald-600' }
                  ]}
                />
              </div>
              <div className="pt-4 border-t border-slate-200 dark:border-slate-600">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">Overdue Tasks</span>
                  <span className="font-bold text-red-600">{stats.overdueTasks}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Today's Focus */}
        <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/20">
          <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-6">Today's Focus</h3>
          <div className="space-y-6">
            <div className="text-center p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl text-white">
              <div className="text-3xl font-bold">{stats.todayTasks}</div>
              <div className="text-blue-100 text-sm">Tasks Planned</div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                <span className="text-emerald-700 dark:text-emerald-300 text-sm font-medium">Prayers</span>
                <span className="text-emerald-800 dark:text-emerald-200 font-bold">{stats.todayPrayerCount}/5</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg">
                <span className="text-teal-700 dark:text-teal-300 text-sm font-medium">Quran Pages</span>
                <span className="text-teal-800 dark:text-teal-200 font-bold">{stats.todayQuranPages}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <span className="text-purple-700 dark:text-purple-300 text-sm font-medium">Completion Rate</span>
                <span className="text-purple-800 dark:text-purple-200 font-bold">
                  {stats.todayTasks > 0 ? Math.round((stats.todayCompletedTasks / stats.todayTasks) * 100) : 0}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Task Completion Heatmap */}
        <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/20">
          <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-6">Weekly Task Activity</h3>
          <WeeklyHeatmap weeklyData={stats.weeklyTaskData} />
        </div>

        {/* Spiritual Progress */}
        <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/20">
          <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-6">Spiritual Progress</h3>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Prayer Completion (7 days avg)</span>
                <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                  {Math.round(stats.avgPrayerCompletion)}%
                </span>
              </div>
              <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-400 to-purple-600 rounded-full transition-all duration-1000"
                  style={{ width: `${stats.avgPrayerCompletion}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Quran Pages This Week</span>
                <span className="text-lg font-bold text-teal-600 dark:text-teal-400">{stats.totalQuranPages}</span>
              </div>
              <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-teal-400 to-teal-600 rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min((stats.totalQuranPages / 35) * 100, 100)}%` }}
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-600">
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                  {stats.quranStreak}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  Day reading streak
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Insights Panel */}
      <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-8 text-white shadow-xl">
        <h3 className="text-2xl font-bold mb-6">Weekly Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6">
            <h4 className="font-bold text-lg mb-2">📋 Productivity</h4>
            <p className="text-indigo-100">
              {stats.completionPercentage > 80 ? "Outstanding progress! You're crushing your goals! 🚀" : 
               stats.completionPercentage > 60 ? "Great momentum! Keep the energy going! ⚡" : 
               "Room for growth. Try breaking tasks into smaller steps! 💪"}
            </p>
          </div>
          
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6">
            <h4 className="font-bold text-lg mb-2">🤲 Prayers</h4>
            <p className="text-purple-100">
              {stats.avgPrayerCompletion > 80 ? "Mashallah! Your spiritual routine is excellent! ✨" : 
               stats.avgPrayerCompletion > 50 ? "Good progress! Consistency is key! 🌟" : 
               "Consider setting prayer reminders to build consistency! ⏰"}
            </p>
          </div>
          
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6">
            <h4 className="font-bold text-lg mb-2">📖 Quran</h4>
            <p className="text-pink-100">
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