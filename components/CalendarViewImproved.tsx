import React, { useState, useMemo, useEffect } from 'react';
import { Task, CalendarEvent, View, Priority } from '../types';
import { PRIORITY_COLORS, PRIORITY_DOT_COLORS, SHORT_DAYS_OF_WEEK_NAMES } from '../constants';
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, EditIcon, TrashIcon } from './icons/NavIcons';
import AddTaskModal from './AddTaskModal';
import { designSystem } from '../utils/designSystem';
import { Button, Card, EmptyState } from './ui';

const getPriorityColorForEvent = (priority: Priority): string => {
  const colorClass = PRIORITY_DOT_COLORS[priority];
  if (colorClass === PRIORITY_DOT_COLORS.Low) return 'bg-emerald-500 dark:bg-emerald-600';
  if (colorClass === PRIORITY_DOT_COLORS.Medium) return 'bg-amber-500 dark:bg-amber-600';
  if (colorClass === PRIORITY_DOT_COLORS.High) return 'bg-red-500 dark:bg-red-600';
  return 'bg-primary dark:bg-primary-dark';
};

// Modal for showing overflow events
const EventOverflowModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  events: CalendarEvent[];
  allTasks: Task[];
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  use12Hour: boolean;
}> = ({ isOpen, onClose, date, events, allTasks, onEditTask, onDeleteTask, use12Hour }) => {
  if (!isOpen) return null;

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
      hour12: use12Hour
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden border border-slate-200 dark:border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <h3 className={`${designSystem.typography.h3} text-slate-800 dark:text-slate-100`}>
              {date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
            </h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh] space-y-3">
          {events.length === 0 ? (
            <EmptyState
              icon={<span className="text-4xl">📅</span>}
              title="No events"
              description="No events scheduled for this day"
            />
          ) : (
            events.map(event => {
              const originalTask = allTasks.find(t => t.id === event.taskRef);
              return (
                <div
                  key={event.id}
                  className={`p-4 rounded-lg ${event.color || 'bg-primary'} text-white group relative`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className={`${designSystem.typography.bodyBold} mb-1`}>{event.title}</p>
                      {event.description && (
                        <p className={`${designSystem.typography.bodySmall} opacity-90 mb-2`}>
                          {event.description}
                        </p>
                      )}
                      <p className={`${designSystem.typography.caption} opacity-80`}>
                        {event.allDay
                          ? 'All day'
                          : `${formatTime(event.start)} - ${formatTime(event.end)}`
                        }
                      </p>
                    </div>
                    {originalTask && (
                      <div className="flex space-x-2 ml-3">
                        <button
                          onClick={() => onEditTask(originalTask)}
                          className="p-2 bg-black/20 rounded-lg hover:bg-black/40 transition-colors min-h-[44px] min-w-[44px]"
                          aria-label="Edit event"
                        >
                          <EditIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm('Are you sure you want to delete this event?')) {
                              onDeleteTask(originalTask.id);
                            }
                          }}
                          className="p-2 bg-black/20 rounded-lg hover:bg-black/40 transition-colors min-h-[44px] min-w-[44px]"
                          aria-label="Delete event"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

const MonthlyCalendarGrid: React.FC<{
  currentDisplayDate: Date;
  events: CalendarEvent[];
  onDateClick: (date: Date) => void;
  onAddTaskForDate: (date: Date) => void;
  onShowMoreEvents: (date: Date, events: CalendarEvent[]) => void;
  use12Hour: boolean;
}> = ({ currentDisplayDate, events, onDateClick, onAddTaskForDate, onShowMoreEvents, use12Hour }) => {
  const year = currentDisplayDate.getFullYear();
  const month = currentDisplayDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();

  // Get previous month info
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevMonthYear = month === 0 ? year - 1 : year;

  // Adjust startDayOfWeek: 0 for Monday, ..., 6 for Sunday
  let startDayOfWeek = firstDayOfMonth.getDay() - 1;
  if (startDayOfWeek === -1) startDayOfWeek = 6; // Sunday (was 0) becomes 6

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
      hour12: use12Hour
    });
  };

  const dayCells = [];

  // Previous month days (grayed out)
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const day = prevMonthLastDay - i;
    const cellDate = new Date(prevMonthYear, prevMonth, day);
    dayCells.push(
      <div
        key={`prev-${day}`}
        className="border border-slate-200 dark:border-slate-700 h-24 md:h-32 p-1.5 bg-slate-50 dark:bg-slate-900/50"
      >
        <span className={`${designSystem.typography.bodySmall} text-slate-400 dark:text-slate-600`}>
          {day}
        </span>
      </div>
    );
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const currentDate = new Date(year, month, day);
    currentDate.setHours(0, 0, 0, 0);
    const dayEvents = events.filter(event => {
      const eventStart = new Date(event.start);
      eventStart.setHours(0, 0, 0, 0);
      return eventStart.getTime() === currentDate.getTime();
    });

    const isToday = currentDate.getTime() === today.getTime();

    dayCells.push(
      <div
        key={day}
        className={`relative border border-slate-200 dark:border-slate-700 p-1.5 h-24 md:h-32 overflow-hidden transition-all hover:bg-slate-50 dark:hover:bg-slate-700/30 group cursor-pointer
          ${isToday ? 'bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/30 dark:to-blue-900/30 ring-2 ring-purple-500 dark:ring-purple-400' : ''}`}
        onClick={() => onDateClick(currentDate)}
      >
        <div className="flex items-center justify-between">
          <span className={`${designSystem.typography.bodySmall} font-medium ${isToday ? 'text-purple-600 dark:text-purple-400 font-bold text-base' : 'text-slate-700 dark:text-slate-300'}`}>
            {day}
          </span>
          {isToday && (
            <span className="px-2 py-0.5 bg-purple-500 text-white text-[10px] font-bold rounded-full">
              TODAY
            </span>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onAddTaskForDate(currentDate); }}
            className="p-1 rounded-full text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/30 opacity-0 group-hover:opacity-100 transition-opacity min-h-[28px] min-w-[28px]"
            title={`Add task for ${currentDate.toLocaleDateString()}`}
            aria-label={`Add task for ${currentDate.toLocaleDateString()}`}
          >
            <PlusIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-1 space-y-0.5 overflow-y-auto max-h-16 md:max-h-20">
          {dayEvents.slice(0, 2).map(event => (
            <div
              key={event.id}
              className={`p-1 rounded text-[10px] truncate text-white ${event.color || 'bg-primary'} shadow-sm`}
              title={event.title}
            >
              {event.allDay
                ? event.title
                : `${formatTime(new Date(event.start))} ${event.title}`
              }
            </div>
          ))}
          {dayEvents.length > 2 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onShowMoreEvents(currentDate, dayEvents);
              }}
              className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold hover:underline w-full text-left"
            >
              +{dayEvents.length - 2} more
            </button>
          )}
        </div>
      </div>
    );
  }

  // Next month days (grayed out)
  const totalCells = dayCells.length;
  const remainingCells = (7 - (totalCells % 7)) % 7;
  for (let i = 1; i <= remainingCells; i++) {
    dayCells.push(
      <div
        key={`next-${i}`}
        className="border border-slate-200 dark:border-slate-700 h-24 md:h-32 p-1.5 bg-slate-50 dark:bg-slate-900/50"
      >
        <span className={`${designSystem.typography.bodySmall} text-slate-400 dark:text-slate-600`}>
          {i}
        </span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-7 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
      {SHORT_DAYS_OF_WEEK_NAMES.slice(1).concat(SHORT_DAYS_OF_WEEK_NAMES[0]).map(name => (
        <div
          key={name}
          className="text-center font-semibold text-sm p-3 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
        >
          {name}
        </div>
      ))}
      {dayCells}
    </div>
  );
};

const DailyView: React.FC<{
  date: Date;
  events: CalendarEvent[];
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  allTasks: Task[];
  use12Hour: boolean;
}> = ({ date, events, onEditTask, onDeleteTask, allTasks, use12Hour }) => {
  const dayEvents = events.filter(event => {
    const eventStart = new Date(event.start);
    return eventStart.toDateString() === date.toDateString();
  }).sort((a, b) => a.start.getTime() - b.start.getTime());

  const hours = Array.from({ length: 18 }, (_, i) => i + 6); // 6 AM to 11 PM (23:00)

  const formatHour = (hour: number) => {
    if (use12Hour) {
      const displayHour = hour % 12 === 0 ? 12 : hour % 12;
      const period = hour < 12 || hour === 24 ? 'AM' : 'PM';
      return `${displayHour} ${period}`;
    }
    return `${hour.toString().padStart(2, '0')}:00`;
  };

  const formatTimeRange = (start: Date, end: Date) => {
    return `${start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: use12Hour })} - ${end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: use12Hour })}`;
  };

  return (
    <Card variant="default">
      <h3 className={`${designSystem.typography.h3} text-slate-800 dark:text-slate-100 mb-4`}>
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
              <div className="w-20 text-sm text-slate-600 dark:text-slate-400 pr-3 text-right pt-1 font-medium">
                {hour === 6 && allDayEventsForThisHour.length > 0 ? "All Day" : formatHour(hour)}
              </div>
              <div className="flex-1 pl-3 border-l-2 border-slate-200 dark:border-slate-700 space-y-2">
                {(hour === 6 ? allDayEventsForThisHour : hourEvents).map(event => {
                  const originalTask = allTasks.find(t => t.id === event.taskRef);
                  return (
                    <div
                      key={event.id}
                      className={`p-3 rounded-lg ${event.color || 'bg-primary'} text-white group relative shadow-md hover:shadow-lg transition-shadow`}
                    >
                      <p className={`${designSystem.typography.bodyBold} mb-1`}>{event.title}</p>
                      {event.description && (
                        <p className={`${designSystem.typography.bodySmall} opacity-90 mb-2`}>
                          {event.description}
                        </p>
                      )}
                      <p className={`${designSystem.typography.caption} opacity-80`}>
                        {event.allDay ? 'All day event' : formatTimeRange(event.start, event.end)}
                      </p>
                      {originalTask && (
                        <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => onEditTask(originalTask)}
                            className="p-2 bg-black/20 rounded-lg hover:bg-black/40 transition-colors min-h-[44px] min-w-[44px]"
                            aria-label="Edit event"
                          >
                            <EditIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm('Are you sure you want to delete this event?')) {
                                onDeleteTask(originalTask.id);
                              }
                            }}
                            className="p-2 bg-black/20 rounded-lg hover:bg-black/40 transition-colors min-h-[44px] min-w-[44px]"
                            aria-label="Delete event"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
                {hour !== 6 && hourEvents.length === 0 && <div className="h-full w-full"></div>}
              </div>
            </div>
          );
        })}
        {dayEvents.length === 0 && (
          <EmptyState
            icon={<span className="text-4xl">📅</span>}
            title="No events scheduled"
            description="No events scheduled for this day"
          />
        )}
      </div>
    </Card>
  );
};

interface CalendarViewProps {
  tasks: Task[];
  addTask: (task: Omit<Task, 'id' | 'subtasks' | 'completedSubtasks' | 'completed'>) => void;
  updateTask: (task: Task) => void;
  deleteTask: (taskId: string) => void;
  setCurrentView: (view: View) => void;
}

type CalendarDisplayMode = 'month' | 'day';

const CalendarViewImproved: React.FC<CalendarViewProps> = ({ tasks, addTask, updateTask, deleteTask, setCurrentView }) => {
  const [currentDisplayDate, setCurrentDisplayDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [displayMode, setDisplayMode] = useState<CalendarDisplayMode>('day');
  const [use12Hour, setUse12Hour] = useState(true); // Default to 12-hour format

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [modalInitialDate, setModalInitialDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const [isOverflowModalOpen, setIsOverflowModalOpen] = useState(false);
  const [overflowDate, setOverflowDate] = useState<Date>(new Date());
  const [overflowEvents, setOverflowEvents] = useState<CalendarEvent[]>([]);

  const calendarEvents = useMemo((): CalendarEvent[] => {
    return tasks.map(task => {
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
        } else {
          endDate.setHours(startDate.getHours() + 1, startDate.getMinutes());
        }
      }
      if (allDay) {
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
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
      setSelectedDate(newDate);
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
    setCurrentDisplayDate(date);
    setDisplayMode('day');
  };

  const handleShowMoreEvents = (date: Date, events: CalendarEvent[]) => {
    setOverflowDate(date);
    setOverflowEvents(events);
    setIsOverflowModalOpen(true);
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
    openAddTaskModal(new Date(task.date + 'T00:00:00'), task);
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrev}
            className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors min-h-[44px] min-w-[44px]"
            aria-label={displayMode === 'month' ? "Previous Month" : "Previous Day"}
          >
            <ChevronLeftIcon />
          </button>
          <h2 className={`${designSystem.typography.h2} text-slate-800 dark:text-slate-100 min-w-[200px] text-center`}>
            {headerDateString}
          </h2>
          <button
            onClick={handleNext}
            className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors min-h-[44px] min-w-[44px]"
            aria-label={displayMode === 'month' ? "Next Month" : "Next Day"}
          >
            <ChevronRightIcon />
          </button>
          <Button
            variant="primary"
            size="md"
            icon={<PlusIcon className="w-4 h-4" />}
            onClick={() => openAddTaskModal(displayMode === 'day' ? selectedDate : currentDisplayDate)}
            aria-label="Add New Task/Event"
          >
            <span className="hidden sm:inline">New Event</span>
          </Button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => { setDisplayMode('month'); setCurrentDisplayDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
              displayMode === 'month'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
            }`}
          >
            Month
          </button>
          <button
            onClick={() => { setDisplayMode('day'); setCurrentDisplayDate(selectedDate); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
              displayMode === 'day'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
            }`}
          >
            Day
          </button>
          <button
            onClick={() => setUse12Hour(!use12Hour)}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors min-h-[44px]"
            title={`Switch to ${use12Hour ? '24-hour' : '12-hour'} format`}
          >
            {use12Hour ? '12h' : '24h'}
          </button>
          <button
            onClick={() => setCurrentView(View.Planner)}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors min-h-[44px]"
          >
            Planner
          </button>
        </div>
      </div>

      {displayMode === 'month' && (
        <MonthlyCalendarGrid
          currentDisplayDate={currentDisplayDate}
          events={calendarEvents}
          onDateClick={handleDateClickForDailyView}
          onAddTaskForDate={(d) => openAddTaskModal(d)}
          onShowMoreEvents={handleShowMoreEvents}
          use12Hour={use12Hour}
        />
      )}
      {displayMode === 'day' && (
        <DailyView
          date={selectedDate}
          events={calendarEvents}
          onEditTask={handleEditTask}
          onDeleteTask={handleDeleteTask}
          allTasks={tasks}
          use12Hour={use12Hour}
        />
      )}

      <AddTaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTask}
        initialDate={modalInitialDate}
        taskToEdit={taskToEdit}
      />

      <EventOverflowModal
        isOpen={isOverflowModalOpen}
        onClose={() => setIsOverflowModalOpen(false)}
        date={overflowDate}
        events={overflowEvents}
        allTasks={tasks}
        onEditTask={handleEditTask}
        onDeleteTask={handleDeleteTask}
        use12Hour={use12Hour}
      />
    </div>
  );
};

export default CalendarViewImproved;
