import React from 'react';
import { Task, Priority } from '../types';
import { PRIORITY_DOT_COLORS } from '../constants';
import { TrashIcon, EditIcon } from './icons/NavIcons'; // Reusing for simplicity

interface TaskCardProps {
  task: Task;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, taskId: string) => void;
  onDelete: (taskId: string) => void;
  onEdit: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onDragStart, onDelete, onEdit, onToggleComplete }) => {
  const priorityDotColor = PRIORITY_DOT_COLORS[task.priority] || 'bg-slate-400';
  
  const handleCheckboxChange = () => {
    onToggleComplete({...task, completed: !task.completed});
  };

  const displayDate = new Date(task.date + 'T00:00:00'); // Ensure correct parsing for local timezone
  const formattedDate = displayDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });


  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      className={`p-3 mb-3 bg-white dark:bg-slate-800 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-grab border-l-4 ${task.completed ? 'border-slate-400 opacity-70' : PRIORITY_DOT_COLORS[task.priority].replace('bg-', 'border-')}`}
    >
      <div className="flex justify-between items-start">
        <div className="flex items-center min-w-0"> {/* Added min-w-0 for better truncation handling */}
           <input 
            type="checkbox" 
            checked={task.completed} 
            onChange={handleCheckboxChange}
            className="mr-2 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary flex-shrink-0"
          />
          <h4 className={`font-semibold text-sm truncate ${task.completed ? 'line-through text-slate-500 dark:text-slate-400' : 'text-slate-700 dark:text-slate-200'}`}>{task.title}</h4>
        </div>
        <div className={`w-3 h-3 rounded-full ${priorityDotColor} ml-2 flex-shrink-0 mt-1`} title={`Priority: ${task.priority}`}></div>
      </div>
      {task.description && <p className={`text-xs text-slate-500 dark:text-slate-400 mt-1 ${task.completed ? 'line-through' : ''} break-words`}>{task.description}</p>}
      <div className="text-xs text-slate-400 dark:text-slate-500 mt-1 flex justify-between">
        <span className={`${task.completed ? 'line-through' : ''}`}>
          Date: {formattedDate}
          {task.startTime && `, ${task.startTime}${task.endTime ? ` - ${task.endTime}` : ''}`}
        </span>
      </div>
      {task.subtasks && task.subtasks.length > 0 && (
        <div className="mt-2">
          <p className="text-xs text-slate-500 dark:text-slate-400">Subtasks: {task.completedSubtasks}/{task.subtasks.length}</p>
          {/* Basic progress bar for subtasks */}
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 mt-1">
            <div 
              className="bg-primary h-1.5 rounded-full" 
              style={{ width: `${(task.completedSubtasks / task.subtasks.length) * 100}%` }}
            ></div>
          </div>
        </div>
      )}
      <div className="flex justify-end space-x-2 mt-2">
        <button onClick={() => onEdit(task)} className="text-slate-500 hover:text-primary dark:hover:text-primary-light transition-colors" title="Edit Task">
          <EditIcon className="w-4 h-4" />
        </button>
        <button onClick={() => onDelete(task.id)} className="text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors" title="Delete Task">
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default TaskCard;