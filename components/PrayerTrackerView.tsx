// Enhanced Prayer Tracker View with better UI
import React, { useState, useEffect, useCallback } from 'react';
import { DailyPrayerLog, PrayerName } from '../types';
import { PRAYER_DEFINITIONS, PRAYER_ORDER } from '../constants';
import * as firebaseService from '../services/firebaseService';
import { ChevronLeftIcon, ChevronRightIcon } from './icons/NavIcons';
import { useAuth } from '../context/AuthContext';

const formatDateToYYYYMMDD = (date: Date): string => date.toISOString().split('T')[0];

const PrayerCard: React.FC<{
  prayerName: PrayerName;
  definition: any;
  logEntry: any;
  onPrayerChange: (prayerName: PrayerName, type: 'fardh' | 'sunnah', checked: boolean) => void;
}> = ({ prayerName, definition, logEntry, onPrayerChange }) => {
  const isCompleted = logEntry?.fardh;
  const isSunnahCompleted = logEntry?.sunnah;
  
  const getPrayerIcon = (name: PrayerName) => {
    const iconClass = "w-8 h-8 text-white";
    switch(name) {
      case PrayerName.Fajr:
        return <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.25A.75.75 0 0113.5 3v1.5a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z"/></svg>;
      case PrayerName.Dhuhr:
        return <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.25A.75.75 0 0113.5 3v1.5a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0z"/></svg>;
      case PrayerName.Asr:
        return <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.25A.75.75 0 0113.5 3v1.5a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59z"/></svg>;
      case PrayerName.Maghrib:
        return <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24"><path d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"/></svg>;
      case PrayerName.Isha:
        return <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24"><path d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"/></svg>;
      case PrayerName.Tahajjud:
        return <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24"><path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"/></svg>;
      default:
        return <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-6.364-.386l1.591-1.591M3 12h2.25m.386-6.364l1.591 1.591M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18c-2.305 0-4.408.867-6 2.292m0-14.25v14.25"/></svg>;
    }
  };

  const getTimeColor = (name: PrayerName) => {
    switch(name) {
      case PrayerName.Fajr: return 'from-orange-400 to-pink-500';
      case PrayerName.Dhuhr: return 'from-yellow-400 to-orange-500';
      case PrayerName.Asr: return 'from-amber-400 to-orange-600';
      case PrayerName.Maghrib: return 'from-purple-500 to-pink-600';
      case PrayerName.Isha: return 'from-indigo-500 to-purple-700';
      case PrayerName.Tahajjud: return 'from-slate-600 to-slate-800';
      default: return 'from-blue-500 to-indigo-600';
    }
  };

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${getTimeColor(prayerName)} p-6 text-white shadow-xl transition-all duration-300 hover:shadow-2xl hover:scale-105 ${isCompleted ? 'ring-4 ring-green-400' : ''}`}>
      <div className="absolute top-4 right-4">
        {getPrayerIcon(prayerName)}
      </div>
      
      <div className="mb-4">
        <h3 className="text-2xl font-bold mb-1">{definition.name}</h3>
        {isCompleted && (
          <div className="flex items-center text-green-200">
            <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span className="text-sm font-medium">Completed</span>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {definition.fardhCount !== undefined && (
          <label className="flex items-center space-x-3 cursor-pointer p-3 rounded-xl bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors">
            <div className="relative">
              <input
                type="checkbox"
                className="sr-only"
                checked={logEntry?.fardh || false}
                onChange={(e) => onPrayerChange(prayerName, 'fardh', e.target.checked)}
              />
              <div className={`w-6 h-6 rounded-full border-2 border-white flex items-center justify-center transition-all ${logEntry?.fardh ? 'bg-white' : 'bg-transparent'}`}>
                {logEntry?.fardh && (
                  <svg className="w-4 h-4 text-gray-800" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                )}
              </div>
            </div>
            <div>
              <span className="font-semibold">Fardh</span>
              <span className="text-white/80 ml-2">({definition.fardhCount} Raka'at)</span>
            </div>
          </label>
        )}

        {definition.sunnahCount !== undefined && (
          <label className="flex items-center space-x-3 cursor-pointer p-3 rounded-xl bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors">
            <div className="relative">
              <input
                type="checkbox"
                className="sr-only"
                checked={logEntry?.sunnah || false}
                onChange={(e) => onPrayerChange(prayerName, 'sunnah', e.target.checked)}
              />
              <div className={`w-6 h-6 rounded-full border-2 border-white flex items-center justify-center transition-all ${logEntry?.sunnah ? 'bg-white' : 'bg-transparent'}`}>
                {logEntry?.sunnah && (
                  <svg className="w-4 h-4 text-gray-800" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                )}
              </div>
            </div>
            <div>
              <span className="font-semibold">Sunnah</span>
              <span className="text-white/80 ml-2">({definition.sunnahCount} Raka'at)</span>
            </div>
          </label>
        )}

        {definition.fardhCount === undefined && definition.sunnahCount === undefined && (
          <label className="flex items-center space-x-3 cursor-pointer p-3 rounded-xl bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors">
            <div className="relative">
              <input
                type="checkbox"
                className="sr-only"
                checked={logEntry?.fardh || false}
                onChange={(e) => onPrayerChange(prayerName, 'fardh', e.target.checked)}
              />
              <div className={`w-6 h-6 rounded-full border-2 border-white flex items-center justify-center transition-all ${logEntry?.fardh ? 'bg-white' : 'bg-transparent'}`}>
                {logEntry?.fardh && (
                  <svg className="w-4 h-4 text-gray-800" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                )}
              </div>
            </div>
            <span className="font-semibold">Prayed</span>
          </label>
        )}
      </div>
    </div>
  );
};

const PrayerTrackerView: React.FC = () => {
  const { currentUser } = useAuth();
  const [prayerLogs, setPrayerLogs] = useState<DailyPrayerLog[]>([]);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [currentLog, setCurrentLog] = useState<DailyPrayerLog | null>(null);
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Load prayer logs on component mount
  useEffect(() => {
    const loadLogs = async () => {
      try {
        const logs = await firebaseService.loadPrayerLogs(currentUser?.uid || null);
        setPrayerLogs(logs);
      } catch (error) {
        console.error('Error loading prayer logs:', error);
      } finally {
        setLoading(false);
      }
    };
    loadLogs();
  }, [currentUser]);

  useEffect(() => {
    const dateString = formatDateToYYYYMMDD(currentDate);
    const existingLog = prayerLogs.find(log => log.date === dateString);
    if (existingLog) {
      setCurrentLog(existingLog);
      setNotes(existingLog.notes || '');
    } else {
      const newLog: DailyPrayerLog = {
        date: dateString,
        prayers: {},
        notes: ''
      };
      PRAYER_ORDER.forEach(prayerName => {
        newLog.prayers[prayerName] = { fardh: false, sunnah: PRAYER_DEFINITIONS[prayerName].sunnahCount !== undefined ? false : undefined };
      });
      setCurrentLog(newLog);
      setNotes('');
    }
  }, [currentDate, prayerLogs]);

  const handlePrayerChange = (prayerName: PrayerName, type: 'fardh' | 'sunnah', checked: boolean) => {
    if (!currentLog) return;
    
    const updatedLog = { ...currentLog };
    updatedLog.prayers = { ...updatedLog.prayers };
    
    if (!updatedLog.prayers[prayerName]) {
        updatedLog.prayers[prayerName] = {};
    }
    (updatedLog.prayers[prayerName] as any)[type] = checked;

    setCurrentLog(updatedLog);
    updateLocalStorage(updatedLog);
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value);
  };
  
  const saveNotes = async () => {
     if (!currentLog) return;
     const updatedLog = { ...currentLog, notes: notes };
     setCurrentLog(updatedLog);
     await updateLocalStorage(updatedLog);
  }

  const updateLocalStorage = useCallback(async (logToSave: DailyPrayerLog) => {
    setPrayerLogs(prevLogs => {
      const existingLogIndex = prevLogs.findIndex(log => log.date === logToSave.date);
      let newLogs;
      if (existingLogIndex > -1) {
        newLogs = [...prevLogs];
        newLogs[existingLogIndex] = logToSave;
      } else {
        newLogs = [...prevLogs, logToSave];
      }
      
      firebaseService.savePrayerLogs(currentUser?.uid || null, newLogs).catch(error => {
        console.error('Error saving prayer logs:', error);
      });
      
      return newLogs;
    });
  }, [currentUser]);

  const changeDate = (offset: number) => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setDate(prevDate.getDate() + offset);
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Calculate daily progress
  const getDailyProgress = () => {
    if (!currentLog) return 0;
    const completedPrayers = Object.values(currentLog.prayers).filter(p => p?.fardh).length;
    return (completedPrayers / 5) * 100; // 5 main prayers
  };

  if (loading) {
    return (
      <div className="animate-fadeIn flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading prayer logs...</p>
        </div>
      </div>
    );
  }

  const progress = getDailyProgress();

  return (
    <div className="animate-fadeIn min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-2xl flex items-center justify-center mr-4">
            <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3.75S4.5 7.875 4.5 12.375C4.5 16.875 7.875 20.25 12 20.25s7.5-3.375 7.5-7.875C19.5 7.875 12 3.75 12 3.75z"/>
            </svg>
          </div>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-transparent">
              Prayer Tracker
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">Track your daily prayers and spiritual journey</p>
          </div>
        </div>

        {/* Date Navigation */}
        <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/20">
          <div className="flex flex-col sm:flex-row justify-between items-center">
            <div className="mb-4 sm:mb-0">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                {currentDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </h2>
              <div className="mt-2">
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Daily Progress</span>
                  <div className="flex-1 h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-400 to-cyan-500 rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{Math.round(progress)}%</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => changeDate(-1)} 
                className="p-3 rounded-xl bg-white/50 dark:bg-slate-700/50 hover:bg-white dark:hover:bg-slate-600 transition-all duration-200 shadow-lg hover:shadow-xl"
                aria-label="Previous day"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
              <button 
                onClick={goToToday} 
                className="px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold hover:from-emerald-600 hover:to-cyan-600 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Today
              </button>
              <button 
                onClick={() => changeDate(1)} 
                className="p-3 rounded-xl bg-white/50 dark:bg-slate-700/50 hover:bg-white dark:hover:bg-slate-600 transition-all duration-200 shadow-lg hover:shadow-xl"
                aria-label="Next day"
              >
                <ChevronRightIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {currentLog && (
        <>
          {/* Prayer Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {PRAYER_ORDER.map(prayerName => {
              const definition = PRAYER_DEFINITIONS[prayerName];
              const logEntry = currentLog.prayers[prayerName];
              if (!definition.isApplicable) return null;

              return (
                <PrayerCard
                  key={prayerName}
                  prayerName={prayerName}
                  definition={definition}
                  logEntry={logEntry}
                  onPrayerChange={handlePrayerChange}
                />
              );
            })}
          </div>

          {/* Notes Section */}
          <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/20">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M21 7.5l-2.25-1.313L16.5 7.5l-2.25-1.313L12 7.5l-2.25-1.313L7.5 7.5l-2.25-1.313L3 7.5v11.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V7.5zM7.5 12h9v1.5h-9V12zm0 3h9v1.5h-9V15z"/>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200">Daily Reflections</h3>
            </div>
            <textarea
                value={notes}
                onChange={handleNotesChange}
                rows={4}
                placeholder="Share your thoughts, duas, or reflections from today..."
                className="w-full p-4 border-2 border-slate-200 dark:border-slate-600 rounded-xl dark:bg-slate-700/50 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors text-slate-700 dark:text-slate-200 placeholder-slate-400 resize-none"
            />
            <button 
                onClick={saveNotes}
                className="mt-4 px-6 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-xl font-semibold hover:from-emerald-600 hover:to-cyan-600 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
                Save Reflections
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default PrayerTrackerView;