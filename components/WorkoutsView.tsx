// BEAUTIFUL, PROFESSIONAL Workouts Module
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import type { WorkoutEntry } from '../types';
import * as firebaseService from '../services/firebaseService';

const WorkoutsView: React.FC = () => {
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
        notes: formData.notes || undefined,
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

  const today = new Date().toISOString().split('T')[0];
  const thisWeek = workouts.filter(w => {
    const wDate = new Date(w.date);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return wDate >= weekAgo;
  });

  const totalMinutesWeek = thisWeek.reduce((sum, w) => sum + w.durationMinutes, 0);
  const workoutTypes = Array.from(new Set(workouts.map(w => w.type)));

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4 md:p-6">

      {/* Hero Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-500 via-red-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-3xl">💪</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent">
                Fitness Tracker
              </h1>
              <p className="text-slate-600 dark:text-slate-400">Build strength, build character</p>
            </div>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-semibold hover:shadow-xl transform hover:scale-105 transition-all flex items-center space-x-2"
          >
            <span className="text-xl">+</span>
            <span>Log Workout</span>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border-l-4 border-orange-500">
            <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">This Week</div>
            <div className="text-3xl font-bold text-orange-600">{thisWeek.length}</div>
            <div className="text-xs text-slate-500 mt-1">Sessions</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border-l-4 border-red-500">
            <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Time Invested</div>
            <div className="text-3xl font-bold text-red-600">{Math.floor(totalMinutesWeek / 60)}h {totalMinutesWeek % 60}m</div>
            <div className="text-xs text-slate-500 mt-1">Total Duration</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border-l-4 border-pink-500">
            <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Total Logged</div>
            <div className="text-3xl font-bold text-pink-600">{workouts.length}</div>
            <div className="text-xs text-slate-500 mt-1">All Time</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border-l-4 border-purple-500">
            <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Variety</div>
            <div className="text-3xl font-bold text-purple-600">{workoutTypes.length}</div>
            <div className="text-xs text-slate-500 mt-1">Exercise Types</div>
          </div>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Recent Workouts</h2>
        <div className="flex bg-white dark:bg-slate-800 rounded-lg p-1 shadow">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-4 py-2 rounded transition-all ${viewMode === 'grid' ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow' : 'text-slate-600 dark:text-slate-400'}`}
          >
            Grid
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded transition-all ${viewMode === 'list' ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow' : 'text-slate-600 dark:text-slate-400'}`}
          >
            List
          </button>
        </div>
      </div>

      {/* Workouts Display */}
      {workouts.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center shadow-lg">
          <div className="text-6xl mb-4">🏋️</div>
          <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">Start Your Fitness Journey</h3>
          <p className="text-slate-600 dark:text-slate-400 mb-6">Log your first workout to track your progress</p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-8 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-semibold hover:shadow-xl"
          >
            Log First Workout
          </button>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
          {workouts.slice().reverse().map(workout => (
            <div
              key={workout.id}
              className="group bg-white dark:bg-slate-800 rounded-xl p-5 shadow-md hover:shadow-xl transition-all border-l-4 border-orange-500 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-orange-200 to-red-200 dark:from-orange-900/30 dark:to-red-900/30 rounded-bl-full opacity-50"></div>

              <div className="relative">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{workout.type}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {new Date(workout.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(workout)}
                      className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-all"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(workout.id)}
                      className="w-8 h-8 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-all"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                <div className="flex items-center space-x-4 mb-3">
                  <div className="flex items-center space-x-2 text-orange-600 dark:text-orange-400">
                    <span>⏱️</span>
                    <span className="font-semibold">{workout.durationMinutes} min</span>
                  </div>
                  {workout.completed && (
                    <div className="flex items-center space-x-1 text-green-600 dark:text-green-400">
                      <span>✓</span>
                      <span className="text-sm">Completed</span>
                    </div>
                  )}
                </div>

                {workout.notes && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg">
                    {workout.notes}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6">
              {editingWorkout ? 'Edit Workout' : 'Log New Workout'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Exercise Type</label>
                <input
                  type="text"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  placeholder="e.g., Running, Gym, Yoga"
                  required
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Duration (minutes)</label>
                <input
                  type="number"
                  value={formData.durationMinutes}
                  onChange={(e) => setFormData({ ...formData, durationMinutes: parseInt(e.target.value) })}
                  min="1"
                  required
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Notes (Optional)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="How did it feel? Any achievements?"
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none resize-none"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-6 py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold hover:bg-slate-300 dark:hover:bg-slate-600 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-semibold hover:shadow-xl transition-all"
                >
                  {editingWorkout ? 'Update' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkoutsView;
