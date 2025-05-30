import React from 'react';
import { Task } from '../types';
import TaskCard from './TaskCard';
import { PlusIcon } from './icons/NavIcons';
import { DAYS_OF_WEEK_NAMES } from '../constants';

interface PlannerDayColumnProps {
  dateString: string; // YYYY-MM-DD format
  tasks: Task[];
  onDrop: (e: React.DragEvent<HTMLDivElement>, dateString: string) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragStartTask: (e: React.DragEvent<HTMLDivElement>, taskId: string) => void;
  onAddTask: (dateString: string) => void;
  onDeleteTask: (taskId: string) => void;
  onEditTask: (task: Task) => void;
  onToggleTaskComplete: (task: Task) => void;
}

const PlannerDayColumn: React.FC<PlannerDayColumnProps> = ({ 
  dateString, tasks, onDrop, onDragOver, onDragStartTask, onAddTask, onDeleteTask, onEditTask, onToggleTaskComplete
}) => {
  const dateObj = new Date(dateString + 'T00:00:00'); // Ensure correct parsing for local timezone
  const dayName = DAYS_OF_WEEK_NAMES[dateObj.getDay()];
  const shortDate = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  return (
    <div
      className="flex-1 bg-slate-100 dark:bg-slate-800/50 p-3 rounded-xl min-h-[300px] md:min-h-[500px] flex flex-col"
      onDrop={(e) => onDrop(e, dateString)}
      onDragOver={onDragOver}
    >
      <div className="flex justify-between items-center mb-4">
        <div>
            <h3 className="font-semibold text-lg text-slate-700 dark:text-slate-200">{dayName}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">{shortDate}</p>
        </div>
        <button 
          onClick={() => onAddTask(dateString)}
          className="p-1.5 rounded-full text-primary dark:text-primary-light hover:bg-primary-light/20 dark:hover:bg-primary-dark/30 transition-colors"
          title={`Add task to ${dayName}, ${shortDate}`}
        >
          <PlusIcon className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-grow overflow-y-auto pr-1 space-y-2">
        {tasks.length === 0 && (
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-10">No tasks for this day.</p>
        )}
        {tasks.map(task => (
          <TaskCard 
            key={task.id} 
            task={task} 
            onDragStart={onDragStartTask} 
            onDelete={onDeleteTask}
            onEdit={onEditTask}
            onToggleComplete={onToggleTaskComplete}
          />
        ))}
      </div>
    </div>
  );
};

export default PlannerDayColumn;