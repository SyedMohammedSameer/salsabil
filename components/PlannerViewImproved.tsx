// Mobile-Optimized PlannerView.tsx with design system integration
import React, { useState, useMemo, useEffect } from 'react';
import { Task } from '../types';
import PlannerDayColumn from './PlannerDayColumn';
import AddTaskModal from './AddTaskModal';
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from './icons/NavIcons';
import { designSystem } from '../utils/designSystem';
import { Button, EmptyState } from './ui';

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

const PlannerViewImproved: React.FC<PlannerViewProps> = ({ tasks, addTask, updateTask, deleteTask }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDateForNewTask, setSelectedDateForNewTask] = useState<string | undefined>(undefined);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [currentWeekStartDate, setCurrentWeekStartDate] = useState<Date>(getStartOfWeek(new Date()));
  const [isMobile, setIsMobile] = useState(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  // Find today's index for mobile default
  useEffect(() => {
    if (isMobile && selectedDayIndex === null) {
      const today = formatDateToYYYYMMDD(new Date());
      const todayIndex = weekDates.findIndex(date => date === today);
      setSelectedDayIndex(todayIndex >= 0 ? todayIndex : 0);
    }
  }, [isMobile, weekDates, selectedDayIndex]);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, taskId: string) => {
    if (isMobile) return; // Disable drag on mobile
    e.dataTransfer.setData('taskId', taskId);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetDate: string) => {
    if (isMobile) return; // Disable drop on mobile
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    const taskToMove = tasks.find(t => t.id === taskId);
    if (taskToMove) {
      updateTask({ ...taskToMove, date: targetDate });
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (isMobile) return; // Disable drag over on mobile
    e.preventDefault();
  };

  const openAddTaskModal = (date?: string) => {
    setSelectedDateForNewTask(date);
    setTaskToEdit(null);
    setIsModalOpen(true);
  };

  const openEditTaskModal = (task: Task) => {
    setTaskToEdit(task);
    setSelectedDateForNewTask(task.date);
    setIsModalOpen(true);
  };

  const handleSaveTask = (taskData: Omit<Task, 'id' | 'subtasks' | 'completedSubtasks' | 'completed'> | Task) => {
    if ('id' in taskData) {
      updateTask(taskData as Task);
    } else {
      const dataWithDate = taskData as Omit<Task, 'id' | 'subtasks' | 'completedSubtasks' | 'completed'>;
      if (!dataWithDate.date && selectedDateForNewTask) {
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
    if (isMobile) {
      const today = formatDateToYYYYMMDD(new Date());
      const todayIndex = weekDates.findIndex(date => date === today);
      setSelectedDayIndex(todayIndex >= 0 ? todayIndex : 0);
    }
  };

  const weekRangeFormatted = useMemo(() => {
    const endOfWeek = new Date(currentWeekStartDate);
    endOfWeek.setDate(currentWeekStartDate.getDate() + 6);
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${currentWeekStartDate.toLocaleDateString(undefined, options)} - ${endOfWeek.toLocaleDateString(undefined, options)}, ${currentWeekStartDate.getFullYear()}`;
  }, [currentWeekStartDate]);

  // Mobile day navigation
  const goToPreviousDay = () => {
    if (selectedDayIndex !== null && selectedDayIndex > 0) {
      setSelectedDayIndex(selectedDayIndex - 1);
    } else if (selectedDayIndex === 0) {
      goToPreviousWeek();
      setSelectedDayIndex(6);
    }
  };

  const goToNextDay = () => {
    if (selectedDayIndex !== null && selectedDayIndex < 6) {
      setSelectedDayIndex(selectedDayIndex + 1);
    } else if (selectedDayIndex === 6) {
      goToNextWeek();
      setSelectedDayIndex(0);
    }
  };

  const getDayName = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  };

  const getShortDayName = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
  };

  const isToday = (dateString: string) => {
    return dateString === formatDateToYYYYMMDD(new Date());
  };

  if (isMobile) {
    // Mobile single-day view
    const currentDate = selectedDayIndex !== null ? weekDates[selectedDayIndex] : weekDates[0];
    const currentTasks = tasks.filter(task => task.date === currentDate);

    return (
      <div className="animate-fadeIn h-full flex flex-col">
        {/* Mobile Header */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl shadow-lg border border-blue-200 dark:border-blue-700 p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className={`${designSystem.typography.h2} bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent`}>
              Weekly Planner
            </h1>
            <Button
              variant="primary"
              size="sm"
              icon={<PlusIcon className="w-5 h-5" />}
              onClick={() => openAddTaskModal(currentDate)}
              aria-label="Add Task"
            />
          </div>

          {/* Day Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={goToPreviousDay}
              className="p-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors active:scale-95 min-h-[44px] min-w-[44px]"
              aria-label="Previous day"
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>

            <div className="text-center">
              <h2 className={`${designSystem.typography.h3} ${isToday(currentDate) ? 'text-blue-600 dark:text-blue-400' : 'text-slate-800 dark:text-slate-100'}`}>
                {getDayName(currentDate)}
              </h2>
              {isToday(currentDate) && (
                <span className={`${designSystem.typography.caption} text-blue-600 dark:text-blue-400 font-bold`}>
                  TODAY
                </span>
              )}
            </div>

            <button
              onClick={goToNextDay}
              className="p-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors active:scale-95 min-h-[44px] min-w-[44px]"
              aria-label="Next day"
            >
              <ChevronRightIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Week dots indicator */}
          <div className="flex justify-center space-x-2 mt-3">
            {weekDates.map((date, index) => (
              <button
                key={date}
                onClick={() => setSelectedDayIndex(index)}
                className={`w-2 h-2 rounded-full transition-all duration-200 ${
                  index === selectedDayIndex
                    ? 'bg-blue-600 scale-125'
                    : isToday(date)
                    ? 'bg-blue-400'
                    : 'bg-slate-300 dark:bg-slate-600'
                }`}
                aria-label={`Go to ${getShortDayName(date)}`}
              />
            ))}
          </div>
        </div>

        {/* Task List */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className={`${designSystem.typography.h4} text-slate-700 dark:text-slate-200`}>
                {currentTasks.length} task{currentTasks.length !== 1 ? 's' : ''} for {getShortDayName(currentDate)}
              </h3>
              <button
                onClick={() => openAddTaskModal(currentDate)}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Add task"
              >
                <PlusIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto h-full pb-4">
              {currentTasks.length === 0 ? (
                <EmptyState
                  icon={<PlusIcon className="w-12 h-12 text-slate-400" />}
                  title="No tasks for this day"
                  description="Add your first task to get started"
                  action={
                    <Button
                      variant="primary"
                      size="md"
                      onClick={() => openAddTaskModal(currentDate)}
                    >
                      Add Your First Task
                    </Button>
                  }
                />
              ) : (
                currentTasks.map(task => (
                  <div
                    key={task.id}
                    className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 border border-slate-200 dark:border-slate-600 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <button
                          onClick={() => handleToggleTaskComplete({ ...task, completed: !task.completed })}
                          className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all min-h-[44px] min-w-[44px] ${
                            task.completed
                              ? 'bg-emerald-500 border-emerald-500'
                              : 'border-slate-300 dark:border-slate-600 hover:border-emerald-500'
                          }`}
                          aria-label={task.completed ? 'Mark as incomplete' : 'Mark as complete'}
                        >
                          {task.completed && (
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                        </button>

                        <div className="flex-1 min-w-0">
                          <h4 className={`${designSystem.typography.body} ${task.completed ? 'line-through text-slate-500' : 'text-slate-800 dark:text-slate-100 font-medium'}`}>
                            {task.title}
                          </h4>
                          {task.description && (
                            <p className={`${designSystem.typography.bodySmall} mt-1 ${task.completed ? 'line-through text-slate-400' : 'text-slate-600 dark:text-slate-400'}`}>
                              {task.description}
                            </p>
                          )}
                          {task.startTime && (
                            <p className={`${designSystem.typography.caption} text-slate-500 mt-1`}>
                              {task.startTime}{task.endTime ? ` - ${task.endTime}` : ''}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex space-x-1 ml-3">
                        <button
                          onClick={() => openEditTaskModal(task)}
                          className="p-2 text-slate-400 hover:text-blue-600 transition-colors rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 min-h-[44px] min-w-[44px]"
                          aria-label="Edit task"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm('Are you sure you want to delete this task?')) {
                              deleteTask(task.id);
                            }
                          }}
                          className="p-2 text-slate-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 min-h-[44px] min-w-[44px]"
                          aria-label="Delete task"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Priority indicator */}
                    <div className="mt-3 flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${
                        task.priority === 'High' ? 'bg-red-500' :
                        task.priority === 'Medium' ? 'bg-amber-500' : 'bg-emerald-500'
                      }`} />
                      <span className={`${designSystem.typography.caption} text-slate-500`}>
                        {task.priority} Priority
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <AddTaskModal
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setTaskToEdit(null); }}
          onSave={handleSaveTask}
          initialDate={selectedDateForNewTask}
          taskToEdit={taskToEdit}
        />
      </div>
    );
  }

  // Desktop week view
  return (
    <div className="animate-fadeIn">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className={`${designSystem.typography.h1} bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent`}>
          Weekly Planner
        </h1>
        <div className="flex items-center space-x-2">
          <button
            onClick={goToPreviousWeek}
            className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors min-h-[44px] min-w-[44px]"
            aria-label="Previous week"
          >
            <ChevronLeftIcon />
          </button>
          <button
            onClick={goToCurrentWeek}
            className="px-4 py-2 text-sm rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors font-medium min-h-[44px]"
          >
            Today
          </button>
          <span className={`${designSystem.typography.body} text-slate-600 dark:text-slate-300 w-48 text-center font-medium`}>
            {weekRangeFormatted}
          </span>
          <button
            onClick={goToNextWeek}
            className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors min-h-[44px] min-w-[44px]"
            aria-label="Next week"
          >
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
        onClose={() => { setIsModalOpen(false); setTaskToEdit(null); }}
        onSave={handleSaveTask}
        initialDate={selectedDateForNewTask}
        taskToEdit={taskToEdit}
      />
    </div>
  );
};

export default PlannerViewImproved;
