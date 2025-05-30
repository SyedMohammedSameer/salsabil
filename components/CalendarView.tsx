
import React, { useState, useMemo, useEffect } from 'react';
import { Task, CalendarEvent, View, Priority } from '../types';
import { PRIORITY_COLORS, PRIORITY_DOT_COLORS, SHORT_DAYS_OF_WEEK_NAMES } from '../constants';
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, EditIcon, TrashIcon } from './icons/NavIcons';
import AddTaskModal from './AddTaskModal'; // For adding/editing tasks/events

const getPriorityColorForEvent = (priority: Priority): string => {
  const colorClass = PRIORITY_DOT_COLORS[priority];
  if (colorClass === PRIORITY_DOT_COLORS.Low) return 'bg-emerald-500 dark:bg-emerald-600';
  if (colorClass === PRIORITY_DOT_COLORS.Medium) return 'bg-amber-500 dark:bg-amber-600';
  if (colorClass === PRIORITY_DOT_COLORS.High) return 'bg-red-500 dark:bg-red-600';
  return 'bg-primary dark:bg-primary-dark';
};

const MonthlyCalendarGrid: React.FC<{ 
    currentDisplayDate: Date, 
    events: CalendarEvent[], 
    onDateClick: (date: Date) => void,
    onAddTaskForDate: (date: Date) => void 
}> = ({ currentDisplayDate, events, onDateClick, onAddTaskForDate }) => {
  const year = currentDisplayDate.getFullYear();
  const month = currentDisplayDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  
  // Adjust startDayOfWeek: 0 for Monday, ..., 6 for Sunday
  let startDayOfWeek = firstDayOfMonth.getDay() -1;
  if (startDayOfWeek === -1) startDayOfWeek = 6; // Sunday (was 0) becomes 6

  const today = new Date();
  today.setHours(0,0,0,0);

  const dayCells = [];
  for (let i = 0; i < startDayOfWeek ; i++) {
     dayCells.push(<div key={`empty-prev-${i}`} className="border border-slate-200 dark:border-slate-700 h-24 md:h-32"></div>);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const currentDate = new Date(year, month, day);
    currentDate.setHours(0,0,0,0);
    const dayEvents = events.filter(event => {
      const eventStart = new Date(event.start);
      eventStart.setHours(0,0,0,0);
      return eventStart.getTime() === currentDate.getTime();
    });
    
    const isToday = currentDate.getTime() === today.getTime();

    dayCells.push(
      <div 
        key={day} 
        className={`relative border border-slate-200 dark:border-slate-700 p-1.5 h-24 md:h-32 overflow-y-auto transition-colors hover:bg-slate-100 dark:hover:bg-slate-700/50 group ${isToday ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}
        onClick={() => onDateClick(currentDate)}
      >
        <span className={`text-sm font-medium ${isToday ? 'text-primary font-bold' : 'text-slate-700 dark:text-slate-300'}`}>{day}</span>
        <button 
            onClick={(e) => { e.stopPropagation(); onAddTaskForDate(currentDate);}}
            className="absolute top-1 right-1 p-0.5 rounded-full text-primary/70 dark:text-primary-light/70 hover:bg-primary-light/20 dark:hover:bg-primary-dark/30 opacity-0 group-hover:opacity-100 transition-opacity"
            title={`Add task for ${currentDate.toLocaleDateString()}`}
            aria-label={`Add task for ${currentDate.toLocaleDateString()}`}
        >
            <PlusIcon className="w-4 h-4" />
        </button>
        <div className="mt-1 space-y-0.5">
          {dayEvents.slice(0, 2).map(event => ( 
            <div key={event.id} className={`p-1 rounded text-[10px] truncate text-white ${event.color || 'bg-primary'}`} title={event.title}>
              {event.allDay ? event.title : `${new Date(event.start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: false})} ${event.title}`}
            </div>
          ))}
          {dayEvents.length > 2 && <div className="text-[10px] text-slate-500 dark:text-slate-400">+{dayEvents.length - 2} more</div>}
        </div>
      </div>
    );
  }

  const totalCells = dayCells.length;
  const remainingCells = (7 - (totalCells % 7)) % 7;
   for (let i = 0; i < remainingCells; i++) {
     dayCells.push(<div key={`empty-next-${i}`} className="border border-slate-200 dark:border-slate-700 h-24 md:h-32"></div>);
  }

  return (
    <div className="grid grid-cols-7">
      {SHORT_DAYS_OF_WEEK_NAMES.slice(1).concat(SHORT_DAYS_OF_WEEK_NAMES[0]).map(name => ( // Mon-Sun
        <div key={name} className="text-center font-medium text-sm p-2 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">{name}</div>
      ))}
      {dayCells}
    </div>
  );
};

const DailyView: React.FC<{ 
    date: Date, 
    events: CalendarEvent[], 
    onEditTask: (task: Task) => void,
    onDeleteTask: (taskId: string) => void,
    allTasks: Task[] // Pass all tasks to find the original task object
}> = ({ date, events, onEditTask, onDeleteTask, allTasks }) => {
    const dayEvents = events.filter(event => {
      const eventStart = new Date(event.start);
      return eventStart.toDateString() === date.toDateString();
    }).sort((a,b) => a.start.getTime() - b.start.getTime());

    const hours = Array.from({ length: 18 }, (_, i) => i + 6); // 6 AM to 11 PM (23:00)

    return (
        <div className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow">
            <h3 className="text-xl font-semibold mb-4 text-slate-800 dark:text-slate-100">
                {date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
            </h3>
            <div className="space-y-1 max-h-[60vh] overflow-y-auto">
                {hours.map(hour => {
                    const hourEvents = dayEvents.filter(event => {
                        const eventHour = event.start.getHours();
                        return !event.allDay && eventHour === hour;
                    });
                    const allDayEventsForThisHour = hour === 6 ? dayEvents.filter(e => e.allDay) : [];


                    return (
                        <div key={hour} className="flex border-t border-slate-200 dark:border-slate-700 py-2 min-h-[50px]">
                            <div className="w-16 text-xs text-slate-500 dark:text-slate-400 pr-2 text-right pt-1">
                                {hour === 6 && allDayEventsForThisHour.length > 0 ? "All Day" : `${hour % 12 === 0 ? 12 : hour % 12} ${hour < 12 || hour === 24 ? 'AM' : 'PM'}`}
                            </div>
                            <div className="flex-1 pl-2 border-l border-slate-200 dark:border-slate-700 space-y-1">
                                {(hour === 6 ? allDayEventsForThisHour : hourEvents).map(event => {
                                     const originalTask = allTasks.find(t => t.id === event.taskRef);
                                    return (
                                    <div key={event.id} className={`p-2 rounded-md ${event.color || 'bg-primary'} text-white group relative`}>
                                        <p className="font-medium text-sm">{event.title}</p>
                                        {event.description && <p className="text-xs opacity-80">{event.description}</p>}
                                        <p className="text-xs opacity-80">
                                            {event.allDay ? '' : `${event.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} - ${event.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12:false })}`}
                                        </p>
                                        {originalTask && (
                                            <div className="absolute top-1 right-1 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => onEditTask(originalTask)} className="p-1 bg-black/20 rounded hover:bg-black/40"><EditIcon className="w-3 h-3"/></button>
                                                <button onClick={() => onDeleteTask(originalTask.id)} className="p-1 bg-black/20 rounded hover:bg-black/40"><TrashIcon className="w-3 h-3"/></button>
                                            </div>
                                        )}
                                    </div>
                                )})}
                                {hour !== 6 && hourEvents.length === 0 && <div className="h-full w-full"></div>}
                            </div>
                        </div>
                    );
                })}
                 {dayEvents.length === 0 && (
                    <p className="text-slate-500 dark:text-slate-400 py-4 text-center">No events scheduled for this day.</p>
                )}
            </div>
        </div>
    );
};


interface CalendarViewProps {
  tasks: Task[];
  addTask: (task: Omit<Task, 'id' | 'subtasks' | 'completedSubtasks' | 'completed'>) => void;
  updateTask: (task: Task) => void;
  deleteTask: (taskId: string) => void;
  setCurrentView: (view: View) => void; // To switch view, e.g. to Planner
}

type CalendarDisplayMode = 'month' | 'day'; // 'week' can be added later

const CalendarView: React.FC<CalendarViewProps> = ({ tasks, addTask, updateTask, deleteTask, setCurrentView }) => {
  const [currentDisplayDate, setCurrentDisplayDate] = useState(new Date()); // For month/week navigation
  const [selectedDate, setSelectedDate] = useState(new Date()); // For daily view
  const [displayMode, setDisplayMode] = useState<CalendarDisplayMode>('month');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [modalInitialDate, setModalInitialDate] = useState<string>(new Date().toISOString().split('T')[0]);


  const calendarEvents = useMemo((): CalendarEvent[] => {
    return tasks
      .map(task => {
        const [year, month, day] = task.date.split('-').map(Number);
        let startDate = new Date(year, month - 1, day);
        let endDate = new Date(year, month - 1, day);
        let allDay = true;

        if (task.startTime) {
          const [startHour, startMinute] = task.startTime.split(':').map(Number);
          startDate.setHours(startHour, startMinute);
          allDay = false;
          if (task.endTime) {
            const [endHour, endMinute] = task.endTime.split(':').map(Number);
            endDate.setHours(endHour, endMinute);
          } else { // Default duration if only start time (e.g. 1 hour)
            endDate.setHours(startDate.getHours() + 1, startDate.getMinutes());
          }
        }
         if (allDay) { // For all-day events, set time to cover the whole day for some calendar libs
            startDate.setHours(0,0,0,0);
            endDate.setHours(23,59,59,999);
        }

        return {
          id: task.id,
          title: task.title,
          start: startDate,
          end: endDate,
          allDay: allDay,
          color: getPriorityColorForEvent(task.priority),
          taskRef: task.id,
          description: task.description,
        };
      });
  }, [tasks]);

  const handlePrev = () => {
    setCurrentDisplayDate(prev => {
        const newDate = new Date(prev);
        if (displayMode === 'month') newDate.setMonth(prev.getMonth() - 1);
        else if (displayMode === 'day') newDate.setDate(prev.getDate() - 1);
        setSelectedDate(newDate); // also update selectedDate if in day view
        return newDate;
    });
  };

  const handleNext = () => {
    setCurrentDisplayDate(prev => {
        const newDate = new Date(prev);
        if (displayMode === 'month') newDate.setMonth(prev.getMonth() + 1);
        else if (displayMode === 'day') newDate.setDate(prev.getDate() + 1);
        setSelectedDate(newDate);
        return newDate;
    });
  };
  
  const handleDateClickForDailyView = (date: Date) => {
    setSelectedDate(date);
    setCurrentDisplayDate(date); // Align navigation date with selected date for daily view
    setDisplayMode('day');
  };

  const openAddTaskModal = (date?: Date, task?: Task) => {
    setModalInitialDate((date || new Date()).toISOString().split('T')[0]);
    setTaskToEdit(task || null);
    setIsModalOpen(true);
  };

  const handleSaveTask = (taskData: Omit<Task, 'id' | 'subtasks' | 'completedSubtasks' | 'completed'> | Task) => {
    if ('id' in taskData) {
      updateTask(taskData as Task);
    } else {
      addTask(taskData as Omit<Task, 'id' | 'subtasks' | 'completedSubtasks' | 'completed'>);
    }
    setIsModalOpen(false);
  };
  
  const handleEditTask = (task: Task) => {
    openAddTaskModal(new Date(task.date + 'T00:00:00'), task); // Ensure correct date parsing
  };

  const handleDeleteTask = (taskId: string) => {
    if (window.confirm("Are you sure you want to delete this task?")) {
        deleteTask(taskId);
    }
  };

  const headerDateString = useMemo(() => {
    if (displayMode === 'month') {
        return currentDisplayDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    }
    return selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }, [currentDisplayDate, selectedDate, displayMode]);


  return (
    <div className="animate-fadeIn">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
        <div className="flex items-center space-x-1 sm:space-x-2">
          <button onClick={handlePrev} className="p-2 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" aria-label={displayMode === 'month' ? "Previous Month" : "Previous Day"}>
            <ChevronLeftIcon />
          </button>
          <h2 className="text-lg sm:text-xl font-semibold text-slate-800 dark:text-slate-100 text-center sm:text-left min-w-[150px] sm:min-w-[280px]">
            {headerDateString}
          </h2>
          <button onClick={handleNext} className="p-2 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" aria-label={displayMode === 'month' ? "Next Month" : "Next Day"}>
            <ChevronRightIcon />
          </button>
           <button 
                onClick={() => openAddTaskModal(displayMode === 'day' ? selectedDate : currentDisplayDate)} 
                className="ml-2 sm:ml-4 p-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors flex items-center text-sm"
                title="Add New Task/Event"
            >
                <PlusIcon className="w-4 h-4 sm:mr-1" /> <span className="hidden sm:inline">New</span>
            </button>
        </div>
        <div className="space-x-1 sm:space-x-2 mt-3 sm:mt-0">
          <button onClick={() => { setDisplayMode('month'); setCurrentDisplayDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1))}} className={`px-3 py-1.5 rounded-md text-sm font-medium ${displayMode === 'month' ? 'bg-primary text-white' : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600'}`}>Month</button>
          <button onClick={() => { setDisplayMode('day'); setCurrentDisplayDate(selectedDate);}} className={`px-3 py-1.5 rounded-md text-sm font-medium ${displayMode === 'day' ? 'bg-primary text-white' : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600'}`}>Day</button>
          <button onClick={() => setCurrentView(View.Planner)} className="px-3 py-1.5 rounded-md text-sm font-medium bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600">Planner</button>
        </div>
      </div>

      {displayMode === 'month' && <MonthlyCalendarGrid currentDisplayDate={currentDisplayDate} events={calendarEvents} onDateClick={handleDateClickForDailyView} onAddTaskForDate={(d) => openAddTaskModal(d)} />}
      {displayMode === 'day' && <DailyView date={selectedDate} events={calendarEvents} onEditTask={handleEditTask} onDeleteTask={handleDeleteTask} allTasks={tasks} />}
      
      <AddTaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTask}
        initialDate={modalInitialDate}
        taskToEdit={taskToEdit}
      />
    </div>
  );
};

export default CalendarView;
