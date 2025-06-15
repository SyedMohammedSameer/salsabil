// Mobile-Optimized AddTaskModal.tsx with touch-friendly design
import React, { useState, useEffect } from 'react';
import { Task, Priority } from '../types';
import Modal from './Modal';

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Omit<Task, 'id' | 'subtasks' | 'completedSubtasks' | 'completed'> | Task) => void;
  initialDate?: string; // YYYY-MM-DD format
  taskToEdit?: Task | null;
}

const AddTaskModal: React.FC<AddTaskModalProps> = ({ isOpen, onClose, onSave, initialDate, taskToEdit }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [priority, setPriority] = useState<Priority>(Priority.Medium);
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

  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title);
      setDescription(taskToEdit.description || '');
      setDate(taskToEdit.date);
      setStartTime(taskToEdit.startTime || '');
      setEndTime(taskToEdit.endTime || '');
      setPriority(taskToEdit.priority);
    } else {
      // Reset form for new task
      setTitle('');
      setDescription('');
      setDate(initialDate || new Date().toISOString().split('T')[0]);
      setStartTime('');
      setEndTime('');
      setPriority(Priority.Medium);
    }
  }, [taskToEdit, isOpen, initialDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert("Title is required.");
      return;
    }
    
    const taskData = {
      title,
      description: description || undefined,
      date,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      priority,
    };

    if (taskToEdit) {
      onSave({ ...taskToEdit, ...taskData });
    } else {
      onSave(taskData as Omit<Task, 'id' | 'subtasks' | 'completedSubtasks' | 'completed'>);
    }
    onClose(); 
  };

  const priorityOptions = [
    { value: Priority.High, label: 'High Priority', color: 'text-red-600', icon: '🔴' },
    { value: Priority.Medium, label: 'Medium Priority', color: 'text-amber-600', icon: '🟡' },
    { value: Priority.Low, label: 'Low Priority', color: 'text-emerald-600', icon: '🟢' }
  ];

  const formatDateForDisplay = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString(undefined, { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={taskToEdit ? "Edit Task" : "Create New Task"}
      size={isMobile ? 'xl' : 'lg'}
    >
      <form onSubmit={handleSubmit} className={`space-y-${isMobile ? '6' : '4'}`}>
        {/* Task Title */}
        <div>
          <label htmlFor="taskTitle" className={`block font-medium text-slate-700 dark:text-slate-300 mb-2 ${isMobile ? 'text-base' : 'text-sm'}`}>
            Task Title *
          </label>
          <input
            type="text"
            id="taskTitle"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={`w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200
                       ${isMobile ? 'px-4 py-4 text-base' : 'px-3 py-2 text-sm'}`}
            placeholder="What do you need to do?"
            required
            autoFocus={!isMobile} // Don't auto-focus on mobile to prevent zoom
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="taskDescription" className={`block font-medium text-slate-700 dark:text-slate-300 mb-2 ${isMobile ? 'text-base' : 'text-sm'}`}>
            Description (Optional)
          </label>
          <textarea
            id="taskDescription"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={isMobile ? 4 : 3}
            className={`w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary resize-none transition-all duration-200
                       ${isMobile ? 'px-4 py-4 text-base' : 'px-3 py-2 text-sm'}`}
            placeholder="Add any additional details..."
          />
        </div>

        {/* Date Selection */}
        <div>
          <label htmlFor="taskDate" className={`block font-medium text-slate-700 dark:text-slate-300 mb-2 ${isMobile ? 'text-base' : 'text-sm'}`}>
            Date *
          </label>
          <input
            type="date"
            id="taskDate"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={`w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200
                       ${isMobile ? 'px-4 py-4 text-base' : 'px-3 py-2 text-sm'}`}
            required
          />
          {isMobile && (
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              📅 {formatDateForDisplay(date)}
            </p>
          )}
        </div>

        {/* Time Selection */}
        <div className={`grid gap-${isMobile ? '4' : '4'} ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
          <div>
            <label htmlFor="taskStartTime" className={`block font-medium text-slate-700 dark:text-slate-300 mb-2 ${isMobile ? 'text-base' : 'text-sm'}`}>
              Start Time (Optional)
            </label>
            <input 
              type="time" 
              id="taskStartTime"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className={`w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200
                         ${isMobile ? 'px-4 py-4 text-base' : 'px-3 py-2 text-sm'}`}
            />
          </div>
          <div>
            <label htmlFor="taskEndTime" className={`block font-medium text-slate-700 dark:text-slate-300 mb-2 ${isMobile ? 'text-base' : 'text-sm'}`}>
              End Time (Optional)
            </label>
            <input 
              type="time" 
              id="taskEndTime"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className={`w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200
                         ${isMobile ? 'px-4 py-4 text-base' : 'px-3 py-2 text-sm'}`}
            />
          </div>
        </div>

        {/* Priority Selection */}
        <div>
          <label className={`block font-medium text-slate-700 dark:text-slate-300 mb-3 ${isMobile ? 'text-base' : 'text-sm'}`}>
            Priority Level
          </label>
          <div className={`grid gap-${isMobile ? '3' : '2'} ${isMobile ? 'grid-cols-1' : 'grid-cols-3'}`}>
            {priorityOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setPriority(option.value)}
                className={`flex items-center justify-center space-x-3 border-2 rounded-xl transition-all duration-200 transform hover:scale-105 active:scale-95
                           ${isMobile ? 'p-4 min-h-touch' : 'p-3'}
                           ${priority === option.value 
                             ? 'border-primary bg-primary/10 text-primary' 
                             : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
                           }`}
              >
                <span className={isMobile ? 'text-lg' : 'text-base'}>{option.icon}</span>
                <span className={`font-medium ${isMobile ? 'text-base' : 'text-sm'} ${option.color}`}>
                  {option.label.replace(' Priority', '')}
                </span>
                {priority === option.value && (
                  <svg className={`${isMobile ? 'w-5 h-5' : 'w-4 h-4'} text-primary`} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className={`flex gap-${isMobile ? '4' : '3'} ${isMobile ? 'flex-col pt-4' : 'flex-row justify-end'}`}>
          <button
            type="button"
            onClick={onClose}
            className={`font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-600 hover:bg-slate-200 dark:hover:bg-slate-500 rounded-xl shadow-sm transition-all duration-200 transform hover:scale-105 active:scale-95
                       ${isMobile ? 'px-6 py-4 text-base min-h-touch' : 'px-4 py-2 text-sm'}`}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={`font-medium text-white bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 active:scale-95
                       ${isMobile ? 'px-6 py-4 text-base min-h-touch' : 'px-4 py-2 text-sm'}`}
          >
            {taskToEdit ? "Update Task" : "Create Task"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AddTaskModal;