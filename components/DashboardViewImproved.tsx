// DashboardViewImproved.tsx - Redesigned with Design System
import React, { useEffect, useState } from 'react';
import { Task, DailyPrayerLog, DailyQuranLog, WorkoutEntry, Challenge, View } from '../types';
import * as firebaseService from '../services/firebaseService';
import { useAuth } from '../context/AuthContext';
import { designSystem } from '../utils/designSystem';
import Card from './ui/Card';
import Badge from './ui/Badge';
import EmptyState from './ui/EmptyState';
import Button from './ui/Button';

interface DashboardViewProps {
  tasks: Task[];
  setCurrentView?: (view: View) => void;
}

const DashboardViewImproved: React.FC<DashboardViewProps> = ({ tasks, setCurrentView }) => {
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

  // Recent workouts (last 5)
  const recentWorkouts = workouts
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className={`${designSystem.animations.spin} rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4`}></div>
          <p className={designSystem.semanticColors.textSecondary}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${designSystem.semanticColors.bgSecondary} p-4 md:p-6 lg:p-8`}>

      {/* Header */}
      <div className="mb-8">
        <h1 className={`${designSystem.typography.h1} ${designSystem.semanticColors.textPrimary} mb-2`}>
          As-salamu alaykum! 👋
        </h1>
        <p className={`${designSystem.typography.bodySmall} ${designSystem.semanticColors.textSecondary}`}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      {/* Today's Quick Stats - IMPROVED with larger numbers */}
      <div className={`grid grid-cols-2 md:grid-cols-4 ${designSystem.componentSpacing.sectionGap} mb-8`}>

        {/* Prayers Stat */}
        <Card variant="elevated" className="text-center">
          <div className="mb-2">
            <div className={`${designSystem.typography.statNumber} bg-gradient-to-r from-purple-600 to-purple-500 bg-clip-text text-transparent`}>
              {todayPrayerCount}
            </div>
            <div className={`${designSystem.typography.labelSmall} ${designSystem.semanticColors.textMuted} mb-1`}>
              / 5 PRAYERS
            </div>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
            <div
              className="bg-gradient-to-r from-purple-500 to-purple-600 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${(todayPrayerCount / 5) * 100}%` }}
            />
          </div>
        </Card>

        {/* Quran Stat */}
        <Card variant="elevated" className="text-center">
          <div className="mb-2">
            <div className={`${designSystem.typography.statNumber} bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent`}>
              {todayQuranPages}
            </div>
            <div className={`${designSystem.typography.labelSmall} ${designSystem.semanticColors.textMuted}`}>
              QURAN PAGES
            </div>
          </div>
          {todayQuranPages > 0 && (
            <Badge variant="success">📖 Reading streak!</Badge>
          )}
        </Card>

        {/* Tasks Stat */}
        <Card variant="elevated" className="text-center">
          <div className="mb-2">
            <div className={`${designSystem.typography.statNumber} ${designSystem.semanticColors.textPrimary}`}>
              {completedTasks}
            </div>
            <div className={`${designSystem.typography.labelSmall} ${designSystem.semanticColors.textMuted} mb-1`}>
              / {todayTasks.length} TASKS
            </div>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
            <div
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-1.5 rounded-full transition-all duration-500"
              style={{ width: todayTasks.length > 0 ? `${(completedTasks / todayTasks.length) * 100}%` : '0%' }}
            />
          </div>
        </Card>

        {/* Workouts Stat */}
        <Card variant="elevated" className="text-center">
          <div className="mb-2">
            <div className={`${designSystem.typography.statNumber} bg-gradient-to-r from-orange-600 to-red-500 bg-clip-text text-transparent`}>
              {todayWorkouts.length}
            </div>
            <div className={`${designSystem.typography.labelSmall} ${designSystem.semanticColors.textMuted}`}>
              WORKOUTS TODAY
            </div>
          </div>
          {todayWorkouts.length > 0 && (
            <Badge variant="warning">💪 Strong!</Badge>
          )}
        </Card>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Left Column */}
        <div className="space-y-6">

          {/* Active Challenges */}
          <Card variant="default">
            <div className="flex items-center justify-between mb-4">
              <h2 className={`${designSystem.typography.h3} ${designSystem.semanticColors.textPrimary}`}>
                Active Challenges 🎯
              </h2>
              <Badge variant="primary">{activeChallenges.length} active</Badge>
            </div>

            {activeChallenges.length === 0 ? (
              <EmptyState
                illustration="generic"
                title="No Active Challenges"
                description="Start a challenge to build consistency and track your progress over time."
              />
            ) : (
              <div className="space-y-3">
                {activeChallenges.map(challenge => {
                  const startDate = new Date(challenge.startDate);
                  const currentDate = new Date();
                  const daysPassed = Math.floor((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                  const progress = Math.min((daysPassed / challenge.durationDays) * 100, 100);

                  return (
                    <div key={challenge.id} className={`
                      p-4 bg-gradient-to-r from-indigo-50 to-purple-50
                      dark:from-indigo-900/20 dark:to-purple-900/20
                      ${designSystem.borderRadius.md}
                      border ${designSystem.semanticColors.borderLight}
                    `}>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className={`${designSystem.typography.h4} ${designSystem.semanticColors.textPrimary}`}>
                          {challenge.name}
                        </h3>
                        <Badge variant="primary">
                          Day {daysPassed}/{challenge.durationDays}
                        </Badge>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                        <div
                          className={`bg-gradient-to-r from-indigo-500 to-purple-500 h-2.5 rounded-full ${designSystem.transitions.base}`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <p className={`${designSystem.typography.bodySmall} ${designSystem.semanticColors.textSecondary} mt-2`}>
                        {challenge.rules.length} daily rules to follow
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Today's Tasks */}
          <Card variant="default">
            <div className="flex items-center justify-between mb-4">
              <h2 className={`${designSystem.typography.h3} ${designSystem.semanticColors.textPrimary}`}>
                Today's Tasks 📋
              </h2>
              <Badge variant="primary">{completedTasks}/{todayTasks.length}</Badge>
            </div>

            {todayTasks.length === 0 ? (
              <EmptyState
                illustration="tasks"
                title="No Tasks for Today"
                description="You're all clear! Enjoy your free time or plan tomorrow's tasks."
              />
            ) : (
              <div className="space-y-2">
                {todayTasks.slice(0, 5).map(task => (
                  <div
                    key={task.id}
                    className={`
                      flex items-center space-x-3 p-3 ${designSystem.borderRadius.md}
                      ${task.completed
                        ? 'bg-emerald-50 dark:bg-emerald-900/20'
                        : 'bg-slate-50 dark:bg-slate-700/50'}
                      ${designSystem.transitions.colors}
                    `}
                  >
                    <div className={`
                      w-5 h-5 rounded-full flex items-center justify-center
                      ${task.completed ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}
                    `}>
                      {task.completed && <span className="text-white text-xs">✓</span>}
                    </div>
                    <span className={`
                      ${designSystem.typography.body} flex-1
                      ${task.completed
                        ? 'line-through ' + designSystem.semanticColors.textMuted
                        : designSystem.semanticColors.textPrimary}
                    `}>
                      {task.title}
                    </span>
                    {task.priority && (
                      <Badge variant={
                        task.priority === 'High' ? 'danger' :
                        task.priority === 'Medium' ? 'warning' :
                        'primary'
                      }>
                        {task.priority}
                      </Badge>
                    )}
                  </div>
                ))}
                {todayTasks.length > 5 && setCurrentView && (
                  <div className="mt-4 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCurrentView(View.Planner)}
                      className="w-full"
                    >
                      View All {todayTasks.length} Tasks →
                    </Button>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">

          {/* Recent Workouts */}
          <Card variant="default">
            <div className="flex items-center justify-between mb-4">
              <h2 className={`${designSystem.typography.h3} ${designSystem.semanticColors.textPrimary}`}>
                Recent Workouts 💪
              </h2>
              <Badge variant="warning">{recentWorkouts.length} logged</Badge>
            </div>

            {recentWorkouts.length === 0 ? (
              <EmptyState
                illustration="workouts"
                title="No Workouts Yet"
                description="Start tracking your fitness journey and see your progress grow!"
              />
            ) : (
              <div className="space-y-3">
                {recentWorkouts.map(workout => (
                  <div
                    key={workout.id}
                    className={`
                      flex items-center justify-between p-4
                      bg-gradient-to-r from-orange-50 to-red-50
                      dark:from-orange-900/20 dark:to-red-900/20
                      ${designSystem.borderRadius.md}
                      border ${designSystem.semanticColors.borderLight}
                    `}
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={`${designSystem.typography.h4} ${designSystem.semanticColors.textPrimary}`}>
                          {workout.type}
                        </span>
                        <Badge variant="warning">
                          {workout.durationMinutes} min
                        </Badge>
                      </div>
                      <div className={`${designSystem.typography.bodySmall} ${designSystem.semanticColors.textSecondary}`}>
                        {new Date(workout.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                      {workout.notes && (
                        <p className={`${designSystem.typography.bodySmall} ${designSystem.semanticColors.textMuted} mt-1 truncate`}>
                          {workout.notes}
                        </p>
                      )}
                    </div>
                    {workout.completed && (
                      <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm">✓</span>
                      </div>
                    )}
                  </div>
                ))}
                {workouts.length > 5 && setCurrentView && (
                  <div className="mt-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCurrentView(View.Workouts)}
                      className="w-full"
                    >
                      View All {workouts.length} Workouts →
                    </Button>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Spiritual Progress */}
          <Card variant="gradient">
            <h2 className={`${designSystem.typography.h3} ${designSystem.semanticColors.textPrimary} mb-4`}>
              Spiritual Progress 🌙
            </h2>

            <div className="space-y-4">
              {/* Prayer Progress */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`${designSystem.typography.label} ${designSystem.semanticColors.textPrimary}`}>
                    Today's Prayers
                  </span>
                  <span className={`${designSystem.typography.h4} bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent`}>
                    {todayPrayerCount}/5
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                  <div
                    className={`bg-gradient-to-r from-purple-500 to-pink-500 h-2.5 rounded-full ${designSystem.transitions.base}`}
                    style={{ width: `${(todayPrayerCount / 5) * 100}%` }}
                  />
                </div>
              </div>

              {/* Quran Progress */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`${designSystem.typography.label} ${designSystem.semanticColors.textPrimary}`}>
                    Quran Pages Today
                  </span>
                  <span className={`${designSystem.typography.h4} bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent`}>
                    {todayQuranPages} pages
                  </span>
                </div>
                {todayQuranPages > 0 ? (
                  <Badge variant="success">MashaAllah! Keep reading 📖</Badge>
                ) : (
                  <p className={`${designSystem.typography.bodySmall} ${designSystem.semanticColors.textMuted}`}>
                    Haven't read Quran yet today
                  </p>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DashboardViewImproved;
