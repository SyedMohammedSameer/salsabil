// Completely Revamped Dashboard - Clean, Simple, Live Data
import React, { useEffect, useState } from 'react';
import { Task, DailyPrayerLog, DailyQuranLog, WorkoutEntry, Challenge } from '../types';
import * as firebaseService from '../services/firebaseService';
import { useAuth } from '../context/AuthContext';

interface DashboardViewProps {
  tasks: Task[];
}

const DashboardView: React.FC<DashboardViewProps> = ({ tasks }) => {
  const { currentUser } = useAuth();
  const [prayerLogs, setPrayerLogs] = useState<DailyPrayerLog[]>([]);
  const [quranLogs, setQuranLogs] = useState<DailyQuranLog[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutEntry[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);

  // Real-time data listeners
  useEffect(() => {
    if (!currentUser?.uid) {
      setLoading(false);
      return;
    }

    const unsubscribers: (() => void)[] = [];

    try {
      const prayerUnsub = firebaseService.setupPrayerLogsListener(currentUser.uid, setPrayerLogs);
      const quranUnsub = firebaseService.setupQuranLogsListener(currentUser.uid, setQuranLogs);
      const workoutsUnsub = firebaseService.setupWorkoutsListener(currentUser.uid, setWorkouts);
      const challengesUnsub = firebaseService.setupChallengesListener(currentUser.uid, setChallenges);

      unsubscribers.push(prayerUnsub, quranUnsub, workoutsUnsub, challengesUnsub);
    } catch (error) {
      console.error('Dashboard: Error setting up listeners:', error);
    } finally {
      setLoading(false);
    }

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [currentUser]);

  // Calculate today's stats
  const today = new Date().toISOString().split('T')[0];
  const todayPrayers = prayerLogs.find(l => l.date === today);
  const todayPrayerCount = todayPrayers ? Object.values(todayPrayers.prayers).filter(p => p?.fardh).length : 0;
  const todayQuran = quranLogs.find(l => l.date === today);
  const todayQuranPages = todayQuran?.pagesRead || 0;
  const todayTasks = tasks.filter(t => t.date === today);
  const completedTasks = todayTasks.filter(t => t.completed).length;
  const todayWorkouts = workouts.filter(w => w.date === today && w.completed);
  const activeChallenges = challenges.filter(c => c.active);

  // Recent workouts (last 7)
  const recentWorkouts = workouts
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 7);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900 p-4 md:p-6">

      {/* Header with Quick Stats */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-100 mb-1">
          As-salamu alaykum! 👋
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>

        {/* Today's Quick Stats - Horizontal Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border-l-4 border-purple-500">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{todayPrayerCount}/5</div>
            <div className="text-xs text-slate-600 dark:text-slate-400 uppercase">Prayers</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border-l-4 border-teal-500">
            <div className="text-2xl font-bold text-teal-600 dark:text-teal-400">{todayQuranPages}</div>
            <div className="text-xs text-slate-600 dark:text-slate-400 uppercase">Quran Pages</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border-l-4 border-blue-500">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{completedTasks}/{todayTasks.length}</div>
            <div className="text-xs text-slate-600 dark:text-slate-400 uppercase">Tasks</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border-l-4 border-orange-500">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{todayWorkouts.length}</div>
            <div className="text-xs text-slate-600 dark:text-slate-400 uppercase">Workouts</div>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Left Column */}
        <div className="space-y-6">

          {/* Active Challenges */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Active Challenges 🎯</h2>
              <span className="text-sm text-slate-500">{activeChallenges.length} active</span>
            </div>

            {activeChallenges.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">🎯</div>
                <p className="text-slate-600 dark:text-slate-400 text-sm">No active challenges</p>
                <p className="text-slate-500 dark:text-slate-500 text-xs mt-1">Start a challenge to track your progress!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeChallenges.map(challenge => {
                  const startDate = new Date(challenge.startDate);
                  const today = new Date();
                  const daysPassed = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                  const progress = Math.min((daysPassed / challenge.durationDays) * 100, 100);

                  return (
                    <div key={challenge.id} className="p-3 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg border border-indigo-200 dark:border-indigo-700">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{challenge.name}</h3>
                        <span className="text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded-full">
                          Day {daysPassed}/{challenge.durationDays}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">{challenge.rules.length} daily rules</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Tasks */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Today's Tasks 📋</h2>
              <span className="text-sm text-slate-500">{completedTasks}/{todayTasks.length}</span>
            </div>

            {todayTasks.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">📝</div>
                <p className="text-slate-600 dark:text-slate-400 text-sm">No tasks for today</p>
              </div>
            ) : (
              <div className="space-y-2">
                {todayTasks.slice(0, 5).map(task => (
                  <div key={task.id} className={`flex items-center space-x-3 p-2 rounded-lg ${task.completed ? 'bg-green-50 dark:bg-green-900/20' : 'bg-slate-50 dark:bg-slate-700/50'}`}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${task.completed ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                      {task.completed && <span className="text-white text-xs">✓</span>}
                    </div>
                    <span className={`text-sm flex-1 ${task.completed ? 'line-through text-slate-500' : 'text-slate-800 dark:text-slate-200'}`}>
                      {task.title}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">

          {/* Recent Workouts */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Recent Workouts 💪</h2>
              <span className="text-sm text-slate-500">{recentWorkouts.length} logged</span>
            </div>

            {recentWorkouts.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">💪</div>
                <p className="text-slate-600 dark:text-slate-400 text-sm">No workouts logged yet</p>
                <p className="text-slate-500 dark:text-slate-500 text-xs mt-1">Start tracking your fitness journey!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentWorkouts.map(workout => (
                  <div key={workout.id} className="flex items-center justify-between p-3 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-lg border border-orange-200 dark:border-orange-700">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{workout.type}</span>
                        <span className="text-xs bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 px-2 py-0.5 rounded-full">
                          {workout.durationMinutes}min
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                        {new Date(workout.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                      {workout.notes && (
                        <p className="text-xs text-slate-500 dark:text-slate-500 mt-1 truncate">{workout.notes}</p>
                      )}
                    </div>
                    {workout.completed && (
                      <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Spiritual Progress */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Spiritual Progress 🌙</h2>

            <div className="space-y-4">
              {/* Prayer Progress */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Today's Prayers</span>
                  <span className="text-sm font-bold text-purple-600 dark:text-purple-400">{todayPrayerCount}/5</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
                    style={{ width: `${(todayPrayerCount / 5) * 100}%` }}
                  />
                </div>
                {todayPrayers && (
                  <div className="flex gap-1 mt-2">
                    {['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'].map(prayer => (
                      <div
                        key={prayer}
                        className={`flex-1 h-1.5 rounded-full ${
                          todayPrayers.prayers[prayer]?.fardh
                            ? 'bg-purple-500'
                            : 'bg-slate-300 dark:bg-slate-600'
                        }`}
                        title={prayer}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Quran Progress */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Quran Pages Today</span>
                  <span className="text-sm font-bold text-teal-600 dark:text-teal-400">{todayQuranPages}</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-teal-500 to-emerald-500 h-2 rounded-full"
                    style={{ width: `${Math.min((todayQuranPages / 5) * 100, 100)}%` }}
                  />
                </div>
              </div>

              {/* Streak */}
              {todayQuran && todayQuran.readQuran && (
                <div className="mt-4 p-3 bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/20 rounded-lg border border-teal-200 dark:border-teal-700 text-center">
                  <div className="text-sm text-slate-600 dark:text-slate-400">Keep your streak going! 🔥</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Insight */}
      <div className="mt-6 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl p-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg">Today's Summary</h3>
            <p className="text-sm text-indigo-100 mt-1">
              {completedTasks === todayTasks.length && todayTasks.length > 0
                ? "Mashallah! All tasks completed! 🎉"
                : todayPrayerCount === 5
                ? "All prayers on time! Keep it up! ✨"
                : todayWorkouts.length > 0
                ? "Great workout session today! 💪"
                : "Start your day with small wins! 🌟"
              }
            </p>
          </div>
          <div className="text-4xl">
            {completedTasks === todayTasks.length && todayTasks.length > 0 ? "🎉" :
             todayPrayerCount === 5 ? "✨" :
             todayWorkouts.length > 0 ? "💪" : "🌟"}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
