import React, { useState, useCallback, useMemo } from 'react';
import { Task } from '../types';
import PlannerDayColumn from './PlannerDayColumn';
import AddTaskModal from './AddTaskModal';
import { ChevronLeftIcon, ChevronRightIcon } from './icons/NavIcons';

interface PlannerViewProps {
  tasks: Task[];
  addTask: (task: Omit<Task, 'id' | 'subtasks' | 'completedSubtasks' | 'completed'>) => void;
  updateTask: (task: Task) => void;
  deleteTask: (taskId: string) => void;
}

const getStartOfWeek = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay(); // Sunday - 0, Monday - 1, ..., Saturday - 6
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday as start of week
  return new Date(d.setDate(diff));
};

const formatDateToYYYYMMDD = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

const PlannerView: React.FC<PlannerViewProps> = ({ tasks, addTask, updateTask, deleteTask }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDateForNewTask, setSelectedDateForNewTask] = useState<string | undefined>(undefined);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [currentWeekStartDate, setCurrentWeekStartDate] = useState<Date>(getStartOfWeek(new Date()));

  const weekDates = useMemo(() => {
    const dates: string[] = [];
    const startDate = new Date(currentWeekStartDate);
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      dates.push(formatDateToYYYYMMDD(date));
    }
    return dates;
  }, [currentWeekStartDate]);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetDate: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    const taskToMove = tasks.find(t => t.id === taskId);
    if (taskToMove) {
      updateTask({ ...taskToMove, date: targetDate });
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); 
  };

  const openAddTaskModal = (date?: string) => {
    setSelectedDateForNewTask(date);
    setTaskToEdit(null);
    setIsModalOpen(true);
  };
  
  const openEditTaskModal = (task: Task) => {
    setTaskToEdit(task);
    setSelectedDateForNewTask(task.date); // Ensure modal gets the task's date
    setIsModalOpen(true);
  };

  const handleSaveTask = (taskData: Omit<Task, 'id' | 'subtasks' | 'completedSubtasks' | 'completed'> | Task) => {
    if ('id' in taskData) { 
      updateTask(taskData as Task);
    } else { 
      const dataWithDate = taskData as Omit<Task, 'id' | 'subtasks' | 'completedSubtasks' | 'completed'>;
      if (!dataWithDate.date && selectedDateForNewTask) { // Ensure date is set if opening from a specific day
        dataWithDate.date = selectedDateForNewTask;
      }
      addTask(dataWithDate);
    }
    setIsModalOpen(false);
    setTaskToEdit(null);
  };
  
  const handleToggleTaskComplete = (task: Task) => {
    updateTask(task); 
  };

  const goToPreviousWeek = () => {
    setCurrentWeekStartDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() - 7);
      return newDate;
    });
  };

  const goToNextWeek = () => {
    setCurrentWeekStartDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() + 7);
      return newDate;
    });
  };
  
  const goToCurrentWeek = () => {
    setCurrentWeekStartDate(getStartOfWeek(new Date()));
  };

  const weekRangeFormatted = useMemo(() => {
    const endOfWeek = new Date(currentWeekStartDate);
    endOfWeek.setDate(currentWeekStartDate.getDate() + 6);
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${currentWeekStartDate.toLocaleDateString(undefined, options)} - ${endOfWeek.toLocaleDateString(undefined, options)}, ${currentWeekStartDate.getFullYear()}`;
  }, [currentWeekStartDate]);


  return (
    <div className="animate-fadeIn">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2 sm:mb-0">Weekly Planner</h1>
        <div className="flex items-center space-x-2">
          <button onClick={goToPreviousWeek} className="p-2 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" aria-label="Previous week">
            <ChevronLeftIcon />
          </button>
          <button onClick={goToCurrentWeek} className="px-3 py-1.5 text-sm rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
            Today
          </button>
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300 w-40 text-center">{weekRangeFormatted}</span>
          <button onClick={goToNextWeek} className="p-2 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" aria-label="Next week">
            <ChevronRightIcon />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        {weekDates.map(dateString => (
          <PlannerDayColumn
            key={dateString}
            dateString={dateString}
            tasks={tasks.filter(task => task.date === dateString)}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragStartTask={handleDragStart}
            onAddTask={() => openAddTaskModal(dateString)}
            onDeleteTask={deleteTask}
            onEditTask={openEditTaskModal}
            onToggleTaskComplete={handleToggleTaskComplete}
          />
        ))}
      </div>
      <AddTaskModal
        isOpen={isModalOpen}
        onClose={() => {setIsModalOpen(false); setTaskToEdit(null);}}
        onSave={handleSaveTask}
        initialDate={selectedDateForNewTask}
        taskToEdit={taskToEdit}
      />
    </div>
  );
};

export default PlannerView;