// Enhanced Quran Log View with better UI and progress tracking
import React, { useState, useEffect, useCallback } from 'react';
import { DailyQuranLog } from '../types';
import * as firebaseService from '../services/firebaseService';
import { ChevronLeftIcon, ChevronRightIcon } from './icons/NavIcons';

const formatDateToYYYYMMDD = (date: Date): string => date.toISOString().split('T')[0];

const QuranLogView: React.FC = () => {
  const [quranLogs, setQuranLogs] = useState<DailyQuranLog[]>([]);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [currentLog, setCurrentLog] = useState<DailyQuranLog>({
    date: formatDateToYYYYMMDD(new Date()),
    readQuran: false,
    pagesRead: 0,
    notes: ''
  });
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(0);

  // Load Quran logs on component mount
  useEffect(() => {
    const loadLogs = async () => {
      try {
        const logs = await firebaseService.loadQuranLogs();
        setQuranLogs(logs);
        calculateStreak(logs);
      } catch (error) {
        console.error('Error loading Quran logs:', error);
      } finally {
        setLoading(false);
      }
    };
    loadLogs();
  }, []);

  const calculateStreak = (logs: DailyQuranLog[]) => {
    let currentStreak = 0;
    const today = new Date();
    
    for (let i = 0; i < 30; i++) { // Check last 30 days
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const dateString = formatDateToYYYYMMDD(checkDate);
      const log = logs.find(l => l.date === dateString);
      
      if (log && log.readQuran) {
        currentStreak++;
      } else if (i === 0 && (!log || !log.readQuran)) {
        // If today hasn't been logged yet, don't break streak
        continue;
      } else {
        break;
      }
    }
    setStreak(currentStreak);
  };

  useEffect(() => {
    const dateString = formatDateToYYYYMMDD(currentDate);
    const existingLog = quranLogs.find(log => log.date === dateString);
    if (existingLog) {
      setCurrentLog(existingLog);
    } else {
      setCurrentLog({
        date: dateString,
        readQuran: false,
        pagesRead: 0,
        notes: ''
      });
    }
  }, [currentDate, quranLogs]);

  const updateCurrentLog = (updates: Partial<DailyQuranLog>) => {
    setCurrentLog(prevLog => {
        const updatedLog = { ...prevLog, ...updates };
        if (updatedLog.pagesRead && updatedLog.pagesRead > 0) {
            updatedLog.readQuran = true;
        }
        if (!updatedLog.readQuran) {
            updatedLog.pagesRead = 0;
        }
        return updatedLog;
    });
  };
  
  const handleSaveChanges = useCallback(async () => {
    setQuranLogs(prevLogs => {
      const existingLogIndex = prevLogs.findIndex(log => log.date === currentLog.date);
      let newLogs;
      if (existingLogIndex > -1) {
        newLogs = [...prevLogs];
        newLogs[existingLogIndex] = currentLog;
      } else {
        newLogs = [...prevLogs, currentLog];
      }
      
      firebaseService.saveQuranLogs(newLogs).then(() => {
        calculateStreak(newLogs);
      }).catch(error => {
        console.error('Error saving Quran logs:', error);
      });
      
      return newLogs;
    });
  }, [currentLog]);

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

  // Get recent reading stats
  const getRecentStats = () => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return formatDateToYYYYMMDD(date);
    }).reverse();

    const stats = last7Days.map(date => {
      const log = quranLogs.find(l => l.date === date);
      return {
        date,
        read: log?.readQuran || false,
        pages: log?.pagesRead || 0
      };
    });

    return stats;
  };

  const getTotalPagesThisWeek = () => {
    return getRecentStats().reduce((total, day) => total + day.pages, 0);
  };

  if (loading) {
    return (
      <div className="animate-fadeIn flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading Quran logs...</p>
        </div>
      </div>
    );
  }

  const recentStats = getRecentStats();
  const totalPagesThisWeek = getTotalPagesThisWeek();

  return (
    <div className="animate-fadeIn min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-slate-900 dark:via-emerald-900/20 dark:to-slate-800 p-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mr-4">
            <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18c-2.305 0-4.408.867-6 2.292m0-14.25v14.25"/>
            </svg>
          </div>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              Quran Reading Log
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">Track your daily Quran reading journey</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/20">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-red-500 rounded-xl flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z"/>
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{streak}</p>
                <p className="text-slate-600 dark:text-slate-400 text-sm">Day streak</p>
              </div>
            </div>
          </div>

          <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/20">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.25 4.533A9.707 9.707 0 006 3a9.735 9.735 0 00-3.25.555.75.75 0 00-.5.707v14.25a.75.75 0 001 .707A8.237 8.237 0 016 18.75c1.995 0 3.823.707 5.25 1.886V4.533zM12.75 20.636A8.214 8.214 0 0118 18.75c.966 0 1.89.166 2.75.47a.75.75 0 001-.708V4.262a.75.75 0 00-.5-.707A9.735 9.735 0 0018 3a9.707 9.707 0 00-5.25 1.533v16.103z"/>
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{totalPagesThisWeek}</p>
                <p className="text-slate-600 dark:text-slate-400 text-sm">Pages this week</p>
              </div>
            </div>
          </div>

          <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/20">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{currentLog.pagesRead || 0}</p>
                <p className="text-slate-600 dark:text-slate-400 text-sm">Pages today</p>
              </div>
            </div>
          </div>
        </div>

        {/* Date Navigation */}
        <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/20">
          <div className="flex flex-col sm:flex-row justify-between items-center">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4 sm:mb-0">
              {currentDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </h2>
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
                className="px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all duration-200 shadow-lg hover:shadow-xl"
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

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Reading Log Form */}
        <div className="lg:col-span-2">
          <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-md rounded-2xl p-8 shadow-xl border border-white/20">
            {/* Reading Toggle */}
            <div className="mb-8">
              <label className="flex items-center space-x-4 cursor-pointer p-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 transition-all duration-300">
                <div className="relative">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={currentLog.readQuran}
                    onChange={(e) => updateCurrentLog({ readQuran: e.target.checked })}
                  />
                  <div className={`w-8 h-8 rounded-full border-2 border-white flex items-center justify-center transition-all ${currentLog.readQuran ? 'bg-white' : 'bg-transparent'}`}>
                    {currentLog.readQuran && (
                      <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold">Did you read Quran today?</h3>
                  <p className="text-emerald-100 text-sm">Mark this if you've read any amount today</p>
                </div>
              </label>
            </div>

            {/* Pages Input */}
            {currentLog.readQuran && (
              <div className="mb-8 animate-fadeIn">
                <label htmlFor="pagesRead" className="block text-lg font-semibold text-slate-700 dark:text-slate-300 mb-4">
                  How many pages did you read?
                </label>
                <div className="relative">
                  <input
                    type="number"
                    id="pagesRead"
                    value={currentLog.pagesRead || ''}
                    onChange={(e) => updateCurrentLog({ pagesRead: parseInt(e.target.value, 10) || 0 })}
                    min="0"
                    max="604" // Total pages in Quran
                    className="w-full p-4 text-xl border-2 border-slate-200 dark:border-slate-600 rounded-xl dark:bg-slate-700/50 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors text-slate-700 dark:text-slate-200"
                    placeholder="Enter number of pages"
                  />
                  <div className="absolute right-4 top-4 text-slate-400">
                    <span className="text-sm">/ 604</span>
                  </div>
                </div>
                
                {/* Quick Page Buttons */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {[1, 2, 3, 5, 10].map(pages => (
                    <button
                      key={pages}
                      onClick={() => updateCurrentLog({ pagesRead: pages })}
                      className="px-4 py-2 bg-emerald-100 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-200 rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-700 transition-colors"
                    >
                      {pages} page{pages > 1 ? 's' : ''}
                    </button>
                  ))}
                </div>

                {/* Progress Bar */}
                {currentLog.pagesRead > 0 && (
                  <div className="mt-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-emerald-700 dark:text-emerald-300">Daily Progress</span>
                      <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                        {((currentLog.pagesRead / 604) * 100).toFixed(2)}% of Quran
                      </span>
                    </div>
                    <div className="w-full h-3 bg-emerald-200 dark:bg-emerald-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min((currentLog.pagesRead / 20) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Notes Section */}
            <div className="mb-8">
              <label htmlFor="quranNotes" className="flex items-center text-lg font-semibold text-slate-700 dark:text-slate-300 mb-4">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M21 7.5l-2.25-1.313L16.5 7.5l-2.25-1.313L12 7.5l-2.25-1.313L7.5 7.5l-2.25-1.313L3 7.5v11.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V7.5z"/>
                </svg>
                Reflections & Notes
              </label>
              <textarea
                id="quranNotes"
                rows={4}
                value={currentLog.notes || ''}
                onChange={(e) => updateCurrentLog({ notes: e.target.value })}
                placeholder="Share any verses that touched your heart, lessons learned, or general reflections..."
                className="w-full p-4 border-2 border-slate-200 dark:border-slate-600 rounded-xl dark:bg-slate-700/50 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors text-slate-700 dark:text-slate-200 placeholder-slate-400 resize-none"
              />
            </div>
            
            {/* Save Button */}
            <button
                onClick={handleSaveChanges}
                className="w-full px-6 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-bold text-lg hover:from-emerald-600 hover:to-teal-600 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
                Save Reading Log
            </button>
          </div>
        </div>

        {/* Weekly Progress Sidebar */}
        <div className="space-y-6">
          {/* Weekly Reading Chart */}
          <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/20">
            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-4">This Week's Progress</h3>
            <div className="space-y-3">
              {recentStats.map((day, index) => {
                const date = new Date(day.date);
                const dayName = date.toLocaleDateString(undefined, { weekday: 'short' });
                const isToday = day.date === formatDateToYYYYMMDD(new Date());
                
                return (
                  <div key={day.date} className={`flex items-center justify-between p-3 rounded-lg ${isToday ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-slate-50 dark:bg-slate-700/30'}`}>
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${day.read ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                      <span className={`text-sm font-medium ${isToday ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-600 dark:text-slate-400'}`}>
                        {dayName}
                      </span>
                    </div>
                    <span className={`text-sm font-bold ${day.pages > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                      {day.pages} pages
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Motivational Card */}
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-xl">
            <div className="text-center">
              <svg className="w-12 h-12 mx-auto mb-4 opacity-80" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"/>
              </svg>
              <h4 className="text-lg font-bold mb-2">Keep Going!</h4>
              <p className="text-emerald-100 text-sm">
                {streak > 0 
                  ? `You're on a ${streak}-day streak! May Allah bless your consistency.`
                  : "Start your reading journey today. Every verse counts!"
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuranLogView;