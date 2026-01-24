// WorkoutsViewImproved.tsx - Redesigned with Design System
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import type { WorkoutEntry } from '../types';
import * as firebaseService from '../services/firebaseService';
import { designSystem } from '../utils/designSystem';
import { Card, Badge, EmptyState, Button } from './ui';

const WorkoutsViewImproved: React.FC = () => {
  const { currentUser } = useAuth();
  const [workouts, setWorkouts] = useState<WorkoutEntry[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState<WorkoutEntry | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [formData, setFormData] = useState({
    type: '',
    durationMinutes: 30,
    notes: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (!currentUser?.uid) return;
    const unsubscribe = firebaseService.setupWorkoutsListener(currentUser.uid, setWorkouts);
    return () => unsubscribe();
  }, [currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.uid) return;

    if (editingWorkout) {
      await firebaseService.updateWorkout(currentUser.uid, editingWorkout.id, {
        type: formData.type,
        durationMinutes: formData.durationMinutes,
        notes: formData.notes,
        date: formData.date,
        completed: true
      });
    } else {
      await firebaseService.saveWorkout(currentUser.uid, {
        type: formData.type,
        durationMinutes: formData.durationMinutes,
        notes: formData.notes || '',
        date: formData.date,
        completed: true
      });
    }
    handleCloseModal();
  };

  const handleDelete = async (workoutId: string) => {
    if (!currentUser?.uid || !confirm('Delete this workout?')) return;
    await firebaseService.deleteWorkout(currentUser.uid, workoutId);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingWorkout(null);
    setFormData({ type: '', durationMinutes: 30, notes: '', date: new Date().toISOString().split('T')[0] });
  };

  const handleEdit = (workout: WorkoutEntry) => {
    setEditingWorkout(workout);
    setFormData({ type: workout.type, durationMinutes: workout.durationMinutes, notes: workout.notes || '', date: workout.date });
    setIsModalOpen(true);
  };

  // Calculate stats
  const today = new Date().toISOString().split('T')[0];
  const thisWeek = workouts.filter(w => {
    const wDate = new Date(w.date);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return wDate >= weekAgo;
  });

  const totalMinutesWeek = thisWeek.reduce((sum, w) => sum + w.durationMinutes, 0);
  const workoutTypes = Array.from(new Set(workouts.map(w => w.type)));
  const avgDuration = workouts.length > 0
    ? Math.round(workouts.reduce((sum, w) => sum + w.durationMinutes, 0) / workouts.length)
    : 0;

  return (
    <div className={`min-h-screen ${designSystem.semanticColors.bgSecondary} p-4 md:p-6 lg:p-8`}>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className={`
              w-16 h-16 bg-gradient-to-br from-orange-500 via-red-500 to-pink-600
              ${designSystem.borderRadius.lg} flex items-center justify-center
              ${designSystem.shadows.lg}
            `}>
              <span className="text-3xl">💪</span>
            </div>
            <div>
              <h1 className={`${designSystem.typography.h1} bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent`}>
                Fitness Tracker
              </h1>
              <p className={designSystem.semanticColors.textSecondary}>
                Build strength, build character
              </p>
            </div>
          </div>
          <Button
            onClick={() => setIsModalOpen(true)}
            variant="primary"
            size="md"
            icon={<span className="text-xl">+</span>}
          >
            Log Workout
          </Button>
        </div>

        {/* Stats Cards - Using Design System */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card variant="elevated" className="text-center">
            <div className={`${designSystem.typography.labelSmall} ${designSystem.semanticColors.textSecondary} mb-1`}>
              This Week
            </div>
            <div className={`${designSystem.typography.statNumber} text-orange-600 dark:text-orange-400`}>
              {thisWeek.length}
            </div>
            <div className={`${designSystem.typography.bodySmall} ${designSystem.semanticColors.textMuted}`}>
              Sessions
            </div>
          </Card>

          <Card variant="elevated" className="text-center">
            <div className={`${designSystem.typography.labelSmall} ${designSystem.semanticColors.textSecondary} mb-1`}>
              Time Invested
            </div>
            <div className={`${designSystem.typography.statNumber} text-red-600 dark:text-red-400`}>
              {Math.floor(totalMinutesWeek / 60)}h {totalMinutesWeek % 60}m
            </div>
            <div className={`${designSystem.typography.bodySmall} ${designSystem.semanticColors.textMuted}`}>
              Total Duration
            </div>
          </Card>

          <Card variant="elevated" className="text-center">
            <div className={`${designSystem.typography.labelSmall} ${designSystem.semanticColors.textSecondary} mb-1`}>
              Total Logged
            </div>
            <div className={`${designSystem.typography.statNumber} text-pink-600 dark:text-pink-400`}>
              {workouts.length}
            </div>
            <div className={`${designSystem.typography.bodySmall} ${designSystem.semanticColors.textMuted}`}>
              All Time
            </div>
          </Card>

          <Card variant="elevated" className="text-center">
            <div className={`${designSystem.typography.labelSmall} ${designSystem.semanticColors.textSecondary} mb-1`}>
              Avg Duration
            </div>
            <div className={`${designSystem.typography.statNumber} text-purple-600 dark:text-purple-400`}>
              {avgDuration}
            </div>
            <div className={`${designSystem.typography.bodySmall} ${designSystem.semanticColors.textMuted}`}>
              Minutes
            </div>
          </Card>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex items-center justify-between mb-6">
        <h2 className={`${designSystem.typography.h2} ${designSystem.semanticColors.textPrimary}`}>
          Recent Workouts
        </h2>
        <div className={`flex bg-white dark:bg-slate-800 ${designSystem.borderRadius.md} p-1 ${designSystem.shadows.sm}`}>
          <button
            onClick={() => setViewMode('grid')}
            className={`
              px-4 py-2 ${designSystem.borderRadius.sm} ${designSystem.transitions.base}
              ${viewMode === 'grid'
                ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white ' + designSystem.shadows.sm
                : designSystem.semanticColors.textSecondary}
            `}
          >
            Grid
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`
              px-4 py-2 ${designSystem.borderRadius.sm} ${designSystem.transitions.base}
              ${viewMode === 'list'
                ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white ' + designSystem.shadows.sm
                : designSystem.semanticColors.textSecondary}
            `}
          >
            List
          </button>
        </div>
      </div>

      {/* Workouts Display */}
      {workouts.length === 0 ? (
        <EmptyState
          illustration="workouts"
          title="Start Your Fitness Journey"
          description="Log your first workout to track your progress and build consistency."
          actionLabel="Log First Workout"
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
          {workouts.slice().reverse().map(workout => (
            <Card
              key={workout.id}
              variant="default"
              hover
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className={`${designSystem.typography.h4} ${designSystem.semanticColors.textPrimary} mb-1`}>
                    {workout.type}
                  </h3>
                  <p className={`${designSystem.typography.bodySmall} ${designSystem.semanticColors.textSecondary}`}>
                    {new Date(workout.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <div className="flex space-x-2">
                  {/* Proper Edit Button with SVG Icon */}
                  <button
                    onClick={() => handleEdit(workout)}
                    className={`
                      p-2 ${designSystem.borderRadius.md}
                      bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400
                      hover:bg-blue-100 dark:hover:bg-blue-900/50
                      ${designSystem.transitions.colors}
                      ${designSystem.a11y.minTouchTarget}
                    `}
                    aria-label="Edit workout"
                    title="Edit workout"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>

                  {/* Proper Delete Button with SVG Icon */}
                  <button
                    onClick={() => handleDelete(workout.id)}
                    className={`
                      p-2 ${designSystem.borderRadius.md}
                      bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400
                      hover:bg-red-100 dark:hover:bg-red-900/50
                      ${designSystem.transitions.colors}
                      ${designSystem.a11y.minTouchTarget}
                    `}
                    aria-label="Delete workout"
                    title="Delete workout"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-2 mb-3">
                <Badge variant="warning">
                  ⏱️ {workout.durationMinutes} min
                </Badge>
                {workout.completed && (
                  <Badge variant="success">
                    ✓ Completed
                  </Badge>
                )}
              </div>

              {/* Duration Progress Bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className={`${designSystem.typography.bodySmall} ${designSystem.semanticColors.textMuted}`}>
                    Duration
                  </span>
                  <span className={`${designSystem.typography.bodySmall} ${designSystem.semanticColors.textSecondary}`}>
                    {Math.round((workout.durationMinutes / (avgDuration || 30)) * 100)}% of avg
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                  <div
                    className={`bg-gradient-to-r from-orange-500 to-red-600 h-2 rounded-full ${designSystem.transitions.base}`}
                    style={{ width: `${Math.min((workout.durationMinutes / (avgDuration || 30)) * 100, 100)}%` }}
                  />
                </div>
              </div>

              {workout.notes && (
                <p className={`
                  ${designSystem.typography.bodySmall}
                  ${designSystem.semanticColors.textSecondary}
                  bg-slate-50 dark:bg-slate-700/50
                  p-3 ${designSystem.borderRadius.md}
                `}>
                  {workout.notes}
                </p>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className={`fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center ${designSystem.zIndex.modal} p-4`}>
          <div className={`
            bg-white dark:bg-slate-800
            ${designSystem.borderRadius.lg}
            ${designSystem.shadows.xl}
            max-w-md w-full p-6
          `}>
            <h2 className={`${designSystem.typography.h2} ${designSystem.semanticColors.textPrimary} mb-6`}>
              {editingWorkout ? 'Edit Workout' : 'Log New Workout'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={`block ${designSystem.typography.label} ${designSystem.semanticColors.textPrimary} mb-2`}>
                  Exercise Type
                </label>
                <input
                  type="text"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  placeholder="e.g., Running, Gym, Yoga"
                  required
                  className={designSystem.inputVariants.default}
                />
              </div>

              <div>
                <label className={`block ${designSystem.typography.label} ${designSystem.semanticColors.textPrimary} mb-2`}>
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  value={formData.durationMinutes}
                  onChange={(e) => setFormData({ ...formData, durationMinutes: parseInt(e.target.value) })}
                  min="1"
                  required
                  className={designSystem.inputVariants.default}
                />
              </div>

              <div>
                <label className={`block ${designSystem.typography.label} ${designSystem.semanticColors.textPrimary} mb-2`}>
                  Date
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                  className={designSystem.inputVariants.default}
                />
              </div>

              <div>
                <label className={`block ${designSystem.typography.label} ${designSystem.semanticColors.textPrimary} mb-2`}>
                  Notes (optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="How did it feel?"
                  rows={3}
                  className={designSystem.inputVariants.default}
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  fullWidth
                >
                  {editingWorkout ? 'Update' : 'Save'} Workout
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  fullWidth
                  onClick={handleCloseModal}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkoutsViewImproved;
