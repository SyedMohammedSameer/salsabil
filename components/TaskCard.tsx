// Mobile-Optimized Task Card with touch-friendly design
import React, { useState, useEffect } from 'react';
import { Task, Priority } from '../types';
import { PRIORITY_DOT_COLORS } from '../constants';
import { TrashIcon, EditIcon } from './icons/NavIcons';

interface TaskCardProps {
  task: Task;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, taskId: string) => void;
  onDelete: (taskId: string) => void;
  onEdit: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onDragStart, onDelete, onEdit, onToggleComplete }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  
  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const priorityConfig = {
    [Priority.High]: {
      bg: 'from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20',
      border: 'border-red-200 dark:border-red-700/50',
      accent: 'bg-gradient-to-r from-red-400 to-red-500',
      dot: 'bg-red-500',
      glow: 'shadow-red-500/20'
    },
    [Priority.Medium]: {
      bg: 'from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20',
      border: 'border-amber-200 dark:border-amber-700/50',
      accent: 'bg-gradient-to-r from-amber-400 to-amber-500',
      dot: 'bg-amber-500',
      glow: 'shadow-amber-500/20'
    },
    [Priority.Low]: {
      bg: 'from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20',
      border: 'border-emerald-200 dark:border-emerald-700/50',
      accent: 'bg-gradient-to-r from-emerald-400 to-emerald-500',
      dot: 'bg-emerald-500',
      glow: 'shadow-emerald-500/20'
    }
  };

  const config = priorityConfig[task.priority];
  
  const handleCheckboxChange = () => {
    onToggleComplete({...task, completed: !task.completed});
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this task?')) {
      onDelete(task.id);
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(task);
  };

  // Touch event handlers for mobile
  const handleTouchStart = () => {
    if (isMobile) {
      setIsPressed(true);
    }
  };

  const handleTouchEnd = () => {
    if (isMobile) {
      setIsPressed(false);
    }
  };

  const displayDate = new Date(task.date + 'T00:00:00');
  const formattedDate = displayDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const isOverdue = !task.completed && new Date(task.date) < new Date(new Date().toDateString());

  return (
    <div
      draggable={!isMobile} // Disable drag on mobile
      onDragStart={!isMobile ? (e) => onDragStart(e, task.id) : undefined}
      onMouseEnter={() => !isMobile && setIsHovered(true)}
      onMouseLeave={() => !isMobile && setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className={`relative group transition-all duration-300 ease-out
                  ${isMobile 
                    ? `${isPressed ? 'scale-95' : 'scale-100'} active:scale-95` 
                    : `cursor-grab active:cursor-grabbing hover:scale-105 hover:-translate-y-1`
                  }
                  ${task.completed ? 'opacity-75' : ''}
                  ${isHovered && !isMobile ? config.glow : ''}
                  ${isMobile ? 'touch-manipulation' : ''}`}
    >
      {/* Main Card */}
      <div className={`relative overflow-hidden bg-gradient-to-br ${config.bg} backdrop-blur-sm border ${config.border} transition-all duration-300
                      ${isMobile 
                        ? 'rounded-xl shadow-md min-h-[120px]' 
                        : 'rounded-2xl shadow-lg hover:shadow-xl'
                      }`}>
        
        {/* Priority accent bar */}
        <div className={`absolute top-0 left-0 w-full ${config.accent} ${isMobile ? 'h-1' : 'h-1'}`}></div>
        
        {/* Overdue indicator */}
        {isOverdue && (
          <div className={`absolute top-2 right-2 rounded-full animate-pulse ${isMobile ? 'w-4 h-4' : 'w-3 h-3'} bg-red-500`}></div>
        )}

        {/* Content */}
        <div className={`${isMobile ? 'p-4' : 'p-4'}`}>
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center min-w-0 flex-1">
              {/* Custom Checkbox - Larger on mobile */}
              <div className="relative mr-3 flex-shrink-0">
                <input 
                  type="checkbox" 
                  checked={task.completed} 
                  onChange={handleCheckboxChange}
                  className="sr-only"
                />
                <div 
                  onClick={handleCheckboxChange}
                  className={`cursor-pointer transition-all duration-300 flex items-center justify-center border-2
                             ${isMobile ? 'w-7 h-7 rounded-lg' : 'w-6 h-6 rounded-lg'}
                             ${task.completed 
                               ? `${config.accent} border-transparent` 
                               : `border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500 bg-white dark:bg-slate-700`
                             }`}
                >
                  {task.completed && (
                    <svg className={`text-white ${isMobile ? 'w-5 h-5' : 'w-4 h-4'}`} fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  )}
                </div>
              </div>
              
              {/* Task Title */}
              <h4 className={`font-semibold leading-tight truncate transition-all duration-300
                             ${isMobile ? 'text-base' : 'text-sm'}
                             ${task.completed 
                               ? 'line-through text-slate-500 dark:text-slate-400' 
                               : 'text-slate-800 dark:text-slate-200'
                             }`}>
                {task.title}
              </h4>
            </div>
            
            {/* Priority Indicator */}
            <div className={`rounded-full ${config.dot} ml-2 flex-shrink-0 shadow-lg transition-transform duration-300
                           ${isMobile ? 'w-5 h-5' : 'w-4 h-4'}
                           ${isHovered && !isMobile ? 'scale-110' : ''}`} 
                 title={`Priority: ${task.priority}`}>
            </div>
          </div>

          {/* Description */}
          {task.description && (
            <p className={`text-slate-600 dark:text-slate-400 mb-3 line-clamp-2 transition-all duration-300
                           ${isMobile ? 'text-sm' : 'text-xs'}
                           ${task.completed ? 'line-through opacity-60' : ''}`}>
              {task.description}
            </p>
          )}

          {/* Subtasks Progress */}
          {task.subtasks && task.subtasks.length > 0 && (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className={`text-slate-500 dark:text-slate-400 ${isMobile ? 'text-sm' : 'text-xs'}`}>
                  Subtasks: {task.completedSubtasks}/{task.subtasks.length}
                </span>
                <span className={`font-medium text-slate-600 dark:text-slate-300 ${isMobile ? 'text-sm' : 'text-xs'}`}>
                  {Math.round((task.completedSubtasks / task.subtasks.length) * 100)}%
                </span>
              </div>
              <div className={`w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden ${isMobile ? 'h-2' : 'h-2'}`}>
                <div 
                  className={`rounded-full transition-all duration-500 ease-out ${config.accent} ${isMobile ? 'h-2' : 'h-2'}`}
                  style={{ width: `${(task.completedSubtasks / task.subtasks.length) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between">
            {/* Date and Time */}
            <div className={`transition-all duration-300 ${task.completed ? 'line-through opacity-60' : 'text-slate-500 dark:text-slate-400'}
                           ${isMobile ? 'text-sm' : 'text-xs'}`}>
              <div className="flex items-center space-x-1">
                <svg className={`${isMobile ? 'w-4 h-4' : 'w-3 h-3'}`} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"/>
                </svg>
                <span>{formattedDate}</span>
              </div>
              {task.startTime && (
                <div className="flex items-center space-x-1 mt-1">
                  <svg className={`${isMobile ? 'w-4 h-4' : 'w-3 h-3'}`} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <span>
                    {task.startTime}{task.endTime ? ` - ${task.endTime}` : ''}
                  </span>
                </div>
              )}
            </div>

            {/* Action Buttons - Always visible on mobile, hover on desktop */}
            <div className={`flex space-x-2 transition-all duration-300 
                           ${isMobile 
                             ? 'opacity-100' 
                             : isHovered || task.completed ? 'opacity-100' : 'opacity-0'
                           }`}>
              <button 
                onClick={handleEditClick}
                className={`rounded-lg bg-white/70 dark:bg-slate-700/70 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-110 z-10
                           ${isMobile ? 'p-3 min-h-touch min-w-touch' : 'p-2'}`}
                title="Edit Task"
              >
                <EditIcon className={`${isMobile ? 'w-4 h-4' : 'w-3 h-3'}`} />
              </button>
              <button 
                onClick={handleDeleteClick}
                className={`rounded-lg bg-white/70 dark:bg-slate-700/70 hover:bg-red-100 dark:hover:bg-red-900/50 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-110 z-10
                           ${isMobile ? 'p-3 min-h-touch min-w-touch' : 'p-2'}`}
                title="Delete Task"
              >
                <TrashIcon className={`${isMobile ? 'w-4 h-4' : 'w-3 h-3'}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Completion Overlay */}
        {task.completed && (
          <div className={`absolute inset-0 bg-emerald-500/10 dark:bg-emerald-400/10 backdrop-blur-[1px] flex items-center justify-center pointer-events-none
                          ${isMobile ? 'rounded-xl' : 'rounded-2xl'}`}>
            <div className={`bg-emerald-500 text-white rounded-full shadow-lg
                           ${isMobile ? 'p-3' : 'p-2'}`}>
              <svg className={`${isMobile ? 'w-7 h-7' : 'w-6 h-6'}`} fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskCard;