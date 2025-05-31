import React, { useMemo, useEffect, useState } from 'react';
import { Task, Priority, DailyPrayerLog, DailyQuranLog, PomodoroSettings } from '../types';
import StatCard from './StatCard';
import ProgressBar from './ProgressBar';
import { DashboardIcon, CheckCircleIcon, ListIcon, PrayerTrackerIcon, QuranLogIcon, PomodoroIcon } from './icons/NavIcons';
import * as firebaseService from '../services/firebaseService';

interface DashboardViewProps {
  tasks: Task[];
}

// Simple CSS-based chart components
const SimpleBarChart: React.FC<{ data: { name: string; value: number; color: string }[] }> = ({ data }) => {
  const maxValue = Math.max(...data.map(d => d.value));
  
  return (
    <div className="space-y-3">
      {data.map((item, index) => (
        <div key={index} className="flex items-center">
          <span className="w-16 text-xs text-slate-600 dark:text-slate-400">{item.name}</span>
          <div className="flex-1 mx-3 bg-slate-200 dark:bg-slate-700 rounded-full h-4 relative">
            <div 
              className={`h-full rounded-full ${item.color} transition-all duration-500`}
              style={{ width: `${maxValue > 0 ? (item.value / maxValue) * 100 : 0}%` }}
            />
          </div>
          <span className="w-8 text-xs text-slate-600 dark:text-slate-400 text-right">{item.value}</span>
        </div>
      ))}
    </div>
  );
};

const SimplePieChart: React.FC<{ data: { name: string; value: number; color: string }[] }> = ({ data }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-32">
        <p className="text-slate-500 dark:text-slate-400 text-sm">No data available</p>
      </div>
    );
  }
  
  return (
    <div className="flex items-center justify-center space-x-6">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" fill="transparent" stroke="currentColor" strokeWidth="2" className="text-slate-300 dark:text-slate-600" />
          {data.map((item, index) => {
            const percentage = (item.value / total) * 100;
            const dashArray = (percentage / 100) * 62.83; // 2 * pi * 10
            const dashOffset = 62.83 - dashArray;
            const rotation = data.slice(0, index).reduce((acc, curr) => acc + (curr.value / total) * 360, 0);
            
            return (
              <circle
                key={index}
                cx="12"
                cy="12"
                r="10"
                fill="transparent"
                stroke={item.color.includes('bg-') ? 
                  item.color.replace('bg-emerald-500', '#10b981').replace('bg-amber-500', '#f59e0b').replace('bg-red-500', '#ef4444').replace('bg-blue-500', '#3b82f6') 
                  : item.color}
                strokeWidth="2"
                strokeDasharray={`${dashArray} ${62.83 - dashArray}`}
                strokeDashoffset={dashOffset}
                style={{ transform: `rotate(${rotation}deg)`, transformOrigin: '12px 12px' }}
              />
            );
          })}
        </svg>
      </div>
      <div className="space-y-2">
        {data.map((item, index) => (
          <div key={index} className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${item.color}`} />
            <span className="text-xs text-slate-600 dark:text-slate-400">
              {item.name}: {item.value} ({Math.round((item.value / total) * 100)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const WeeklyTrendChart: React.FC<{ weeklyData: { day: string; value: number }[] }> = ({ weeklyData }) => {
  const maxValue = Math.max(...weeklyData.map(d => d.value), 1);
  
  return (
    <div className="flex items-end justify-between h-32 space-x-1">
      {weeklyData.map((day, index) => (
        <div key={index} className="flex flex-col items-center space-y-1 flex-1">
          <div 
            className="w-full bg-primary dark:bg-primary-light rounded-t transition-all duration-500"
            style={{ height: `${(day.value / maxValue) * 100}%` }}
          />
          <span className="text-xs text-slate-600 dark:text-slate-400">{day.day}</span>
        </div>
      ))}
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

  // Calculate statistics
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

    // Recent prayer completion (last 7 days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    const prayerCompletionRate = last7Days.map(date => {
      const log = prayerLogs.find(l => l.date === date);
      if (!log) return 0;
      
      const totalPrayers = 5; // Fajr, Dhuhr, Asr, Maghrib, Isha
      const completedPrayers = Object.values(log.prayers).filter(p => p?.fardh).length;
      return (completedPrayers / totalPrayers) * 100;
    });

    // Recent Quran reading (last 7 days)
    const quranReadingData = last7Days.map(date => {
      const log = quranLogs.find(l => l.date === date);
      return log?.pagesRead || 0;
    });

    // Today's prayer status
    const today = new Date().toISOString().split('T')[0];
    const todayPrayers = prayerLogs.find(l => l.date === today);
    const todayPrayerCount = todayPrayers ? Object.values(todayPrayers.prayers).filter(p => p?.fardh).length : 0;

    // Today's Quran reading
    const todayQuran = quranLogs.find(l => l.date === today);
    const todayQuranPages = todayQuran?.pagesRead || 0;

    // Weekly task completion trend
    const weeklyTaskData = last7Days.map(date => {
      const dayTasks = tasks.filter(t => t.date === date);
      const completedDayTasks = dayTasks.filter(t => t.completed).length;
      return {
        day: new Date(date).toLocaleDateString(undefined, { weekday: 'short' }),
        value: completedDayTasks
      };
    });

    return {
      totalTasks,
      completedTasks,
      completionPercentage,
      priorityStats,
      prayerCompletionRate,
      quranReadingData,
      todayPrayerCount,
      todayQuranPages,
      weeklyTaskData,
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
    <div className="animate-fadeIn">
      <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-6">Dashboard</h1>
      
      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard 
          title="Total Tasks" 
          value={stats.totalTasks} 
          icon={<ListIcon className="w-5 h-5" />} 
        />
        <StatCard 
          title="Completed Tasks" 
          value={stats.completedTasks} 
          icon={<CheckCircleIcon className="w-5 h-5 text-emerald-500" />} 
          trend="up" 
          trendText={`${stats.completionPercentage.toFixed(0)}% complete`} 
        />
        <StatCard 
          title="Today's Prayers" 
          value={`${stats.todayPrayerCount}/5`} 
          icon={<PrayerTrackerIcon className="w-5 h-5 text-blue-500" />} 
        />
        <StatCard 
          title="Quran Pages Today" 
          value={stats.todayQuranPages} 
          icon={<QuranLogIcon className="w-5 h-5 text-purple-500" />} 
        />
      </div>

      {/* Charts and Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Task Priority Distribution */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg">
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-4">Task Priority Distribution</h3>
          <SimpleBarChart 
            data={[
              { name: 'High', value: stats.priorityStats.high, color: 'bg-red-500' },
              { name: 'Medium', value: stats.priorityStats.medium, color: 'bg-amber-500' },
              { name: 'Low', value: stats.priorityStats.low, color: 'bg-emerald-500' }
            ]}
          />
        </div>

        {/* Task Completion Status */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg">
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-4">Task Completion Status</h3>
          <SimplePieChart 
            data={[
              { name: 'Completed', value: stats.completedTasks, color: 'bg-emerald-500' },
              { name: 'Pending', value: stats.totalTasks - stats.completedTasks, color: 'bg-amber-500' }
            ]}
          />
        </div>
      </div>

      {/* Weekly Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Weekly Task Completion */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg">
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-4">Weekly Task Completion</h3>
          <WeeklyTrendChart weeklyData={stats.weeklyTaskData} />
        </div>

        {/* Prayer Completion Rate */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg">
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-4">Prayer Completion Rate (7 days)</h3>
          <div className="space-y-2">
            {stats.prayerCompletionRate.map((rate, index) => (
              <div key={index} className="flex items-center">
                <span className="w-8 text-xs text-slate-600 dark:text-slate-400">
                  {new Date(stats.last7Days[index]).getDate()}
                </span>
                <div className="flex-1 mx-3 bg-slate-200 dark:bg-slate-700 rounded-full h-3">
                  <div 
                    className="h-full bg-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${rate}%` }}
                  />
                </div>
                <span className="w-12 text-xs text-slate-600 dark:text-slate-400 text-right">{rate.toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quran Reading Progress */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg">
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-4">Quran Reading (7 days)</h3>
          <div className="space-y-2">
            {stats.quranReadingData.map((pages, index) => (
              <div key={index} className="flex items-center">
                <span className="w-8 text-xs text-slate-600 dark:text-slate-400">
                  {new Date(stats.last7Days[index]).getDate()}
                </span>
                <div className="flex-1 mx-3 bg-slate-200 dark:bg-slate-700 rounded-full h-3">
                  <div 
                    className="h-full bg-purple-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((pages / 10) * 100, 100)}%` }}
                  />
                </div>
                <span className="w-12 text-xs text-slate-600 dark:text-slate-400 text-right">{pages}p</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Insights */}
      <div className="mt-8 bg-gradient-to-r from-primary/10 to-accent/10 dark:from-primary/20 dark:to-accent/20 p-6 rounded-xl">
        <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-3">Weekly Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-white/50 dark:bg-slate-800/50 p-4 rounded-lg">
            <p className="font-medium text-slate-700 dark:text-slate-200">Tasks</p>
            <p className="text-slate-600 dark:text-slate-400">
              {stats.completionPercentage > 80 ? "Excellent progress!" : 
               stats.completionPercentage > 60 ? "Good momentum, keep going!" : 
               "Consider breaking tasks into smaller pieces"}
            </p>
          </div>
          <div className="bg-white/50 dark:bg-slate-800/50 p-4 rounded-lg">
            <p className="font-medium text-slate-700 dark:text-slate-200">Prayers</p>
            <p className="text-slate-600 dark:text-slate-400">
              {stats.todayPrayerCount >= 4 ? "Mashallah! Strong spiritual routine" : 
               stats.todayPrayerCount >= 2 ? "Making progress, aim for consistency" : 
               "Consider setting prayer reminders"}
            </p>
          </div>
          <div className="bg-white/50 dark:bg-slate-800/50 p-4 rounded-lg">
            <p className="font-medium text-slate-700 dark:text-slate-200">Quran</p>
            <p className="text-slate-600 dark:text-slate-400">
              {stats.todayQuranPages > 0 ? "Great! Consistent reading builds understanding" : 
               "Even a few verses daily makes a difference"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;