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
      description: description || undefined, // Use undefined instead of empty string
      date,
      startTime: startTime || undefined, // Use undefined instead of empty string
      endTime: endTime || undefined, // Use undefined instead of empty string
      priority,
    };

    if (taskToEdit) {
      onSave({ ...taskToEdit, ...taskData });
    } else {
      onSave(taskData as Omit<Task, 'id' | 'subtasks' | 'completedSubtasks' | 'completed'>);
    }
    onClose(); 
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={taskToEdit ? "Edit Task" : "Add New Task"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="taskTitle" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Title</label>
          <input
            type="text"
            id="taskTitle"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
            required
          />
        </div>
        <div>
          <label htmlFor="taskDescription" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Description (Optional)</label>
          <textarea
            id="taskDescription"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
          />
        </div>
        <div>
          <label htmlFor="taskDate" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Date</label>
          <input
            type="date"
            id="taskDate"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
            <div>
                <label htmlFor="taskStartTime" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Start Time (Opt.)</label>
                <input 
                    type="time" 
                    id="taskStartTime"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                />
            </div>
            <div>
                <label htmlFor="taskEndTime" className="block text-sm font-medium text-slate-700 dark:text-slate-300">End Time (Opt.)</label>
                <input 
                    type="time" 
                    id="taskEndTime"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                />
            </div>
        </div>
        <div>
          <label htmlFor="taskPriority" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Priority</label>
          <select
            id="taskPriority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
            className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
          >
            {Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-600 hover:bg-slate-200 dark:hover:bg-slate-500 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-dark rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-dark"
          >
            {taskToEdit ? "Save Changes" : "Add Task"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AddTaskModal;