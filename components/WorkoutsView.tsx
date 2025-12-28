import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import type { WorkoutEntry } from '../types';
import * as firebaseService from '../services/firebaseService';

const WorkoutsView: React.FC = () => {
  const { currentUser } = useAuth();
  const [workouts, setWorkouts] = useState<WorkoutEntry[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState<WorkoutEntry | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterDate, setFilterDate] = useState<string>('');

  // Form state
  const [formData, setFormData] = useState({
    type: '',
    durationMinutes: 30,
    notes: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (!currentUser?.uid) return;

    const unsubscribe = firebaseService.setupWorkoutsListener(currentUser.uid, (data) => {
      setWorkouts(data);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const filteredWorkouts = filterDate
    ? workouts.filter(w => w.date === filterDate)
    : workouts;

  const todayWorkouts = workouts.filter(w => w.date === new Date().toISOString().split('T')[0]);

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

  const handleEdit = (workout: WorkoutEntry) => {
    setEditingWorkout(workout);
    setFormData({
      type: workout.type,
      durationMinutes: workout.durationMinutes,
      notes: workout.notes || '',
      date: workout.date
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (workoutId: string) => {
    if (!currentUser?.uid || !confirm('Delete this workout?')) return;
    await firebaseService.deleteWorkout(currentUser.uid, workoutId);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingWorkout(null);
    setFormData({
      type: '',
      durationMinutes: 30,
      notes: '',
      date: new Date().toISOString().split('T')[0]
    });
  };

  const totalMinutes = todayWorkouts.reduce((sum, w) => sum + w.durationMinutes, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-red-50 dark:from-slate-900 dark:via-orange-900/20 dark:to-red-900/20 p-2 lg:p-4">
      {/* Header */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center mr-2">
              <span className="text-white text-lg">💪</span>
            </div>
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-slate-800 dark:text-slate-200">Workouts</h1>
              <p className="text-xs text-slate-600 dark:text-slate-400">Track your fitness journey</p>
            </div>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-3 py-1.5 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg font-medium text-sm hover:shadow-lg transition-all"
          >
            + Add Workout
          </button>
        </div>

        {/* Today's Stats */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-lg p-2.5 border border-white/20">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{todayWorkouts.length}</div>
            <div className="text-xs text-slate-600 dark:text-slate-400">Today's Sessions</div>
          </div>
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-lg p-2.5 border border-white/20">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{totalMinutes}m</div>
            <div className="text-xs text-slate-600 dark:text-slate-400">Total Duration</div>
          </div>
        </div>

        {/* Filter */}
        <div className="flex items-center space-x-2">
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="flex-1 px-2.5 py-1.5 bg-white/80 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-600 rounded text-sm focus:ring-2 focus:ring-orange-500 outline-none"
          />
          {filterDate && (
            <button
              onClick={() => setFilterDate('')}
              className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-sm"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Workouts List */}
      <div className="space-y-2">
        {filteredWorkouts.length === 0 ? (
          <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-8 text-center">
            <div className="text-4xl mb-2">💪</div>
            <p className="text-slate-600 dark:text-slate-400">No workouts {filterDate ? 'on this date' : 'yet'}</p>
            <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">Start tracking your fitness journey!</p>
          </div>
        ) : (
          filteredWorkouts.map(workout => (
            <div
              key={workout.id}
              className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-lg p-2.5 border border-white/20 hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{workout.type}</span>
                    <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded text-xs">
                      {workout.durationMinutes}m
                    </span>
                  </div>
                  {workout.notes && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">{workout.notes}</p>
                  )}
                  <div className="text-xs text-slate-500 dark:text-slate-500">{workout.date}</div>
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleEdit(workout)}
                    className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(workout.id)}
                    className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 max-w-md w-full shadow-2xl">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-3">
              {editingWorkout ? 'Edit Workout' : 'Add Workout'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Workout Type *
                </label>
                <input
                  type="text"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  placeholder="e.g., Running, Gym, Yoga"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Duration (minutes) *
                </label>
                <input
                  type="number"
                  value={formData.durationMinutes}
                  onChange={(e) => setFormData({ ...formData, durationMinutes: parseInt(e.target.value) || 0 })}
                  min="1"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="How did it go?"
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded text-sm focus:ring-2 focus:ring-orange-500 outline-none resize-none"
                />
              </div>
              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded font-medium text-sm hover:bg-slate-300 dark:hover:bg-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded font-medium text-sm hover:shadow-lg"
                >
                  {editingWorkout ? 'Update' : 'Add'}
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
