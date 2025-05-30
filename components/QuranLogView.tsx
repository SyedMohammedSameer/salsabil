// Updated src/components/QuranLogView.tsx
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

  // Load Quran logs on component mount
  useEffect(() => {
    const loadLogs = async () => {
      try {
        const logs = await firebaseService.loadQuranLogs();
        setQuranLogs(logs);
      } catch (error) {
        console.error('Error loading Quran logs:', error);
      } finally {
        setLoading(false);
      }
    };
    loadLogs();
  }, []);

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
        // If pagesRead is positive, automatically mark readQuran as true
        if (updatedLog.pagesRead && updatedLog.pagesRead > 0) {
            updatedLog.readQuran = true;
        }
        // If readQuran is unchecked, reset pagesRead
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
      
      // Save to Firebase
      firebaseService.saveQuranLogs(newLogs).then(() => {
        alert("Log saved!");
      }).catch(error => {
        console.error('Error saving Quran logs:', error);
        alert("Failed to save log. Please try again.");
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

  return (
    <div className="animate-fadeIn">
      <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-6">Quran Reading Log</h1>

      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 bg-white dark:bg-slate-800 p-4 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-200 mb-2 sm:mb-0">
          {currentDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </h2>
        <div className="flex items-center space-x-2">
          <button onClick={() => changeDate(-1)} className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" aria-label="Previous day">
            <ChevronLeftIcon />
          </button>
           <button onClick={goToToday} className="px-3 py-1.5 text-sm rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            Today
          </button>
          <button onClick={() => changeDate(1)} className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" aria-label="Next day">
            <ChevronRightIcon />
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow space-y-6">
        <div>
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              className="form-checkbox h-5 w-5 text-primary rounded focus:ring-primary-dark"
              checked={currentLog.readQuran}
              onChange={(e) => updateCurrentLog({ readQuran: e.target.checked })}
            />
            <span className="text-lg text-slate-700 dark:text-slate-300">Did you read Quran today?</span>
          </label>
        </div>

        {currentLog.readQuran && (
          <div className="animate-fadeIn">
            <label htmlFor="pagesRead" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              How many pages did you read?
            </label>
            <input
              type="number"
              id="pagesRead"
              value={currentLog.pagesRead || ''}
              onChange={(e) => updateCurrentLog({ pagesRead: parseInt(e.target.value, 10) || 0 })}
              min="0"
              className="w-full sm:w-1/2 md:w-1/3 p-2 border border-slate-300 dark:border-slate-600 rounded-md dark:bg-slate-700 focus:ring-primary focus:border-primary text-slate-700 dark:text-slate-200"
            />
          </div>
        )}

        <div>
          <label htmlFor="quranNotes" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Notes / Reflections (Optional)
          </label>
          <textarea
            id="quranNotes"
            rows={4}
            value={currentLog.notes || ''}
            onChange={(e) => updateCurrentLog({ notes: e.target.value })}
            placeholder="Any verses that stood out, lessons learned, or general feelings..."
            className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md dark:bg-slate-700 focus:ring-primary focus:border-primary text-slate-700 dark:text-slate-200"
          />
        </div>
        
        <div>
            <button
                onClick={handleSaveChanges}
                className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary-dark font-semibold transition-colors"
            >
                Save Log for {currentDate.toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
            </button>
        </div>

      </div>
    </div>
  );
};

export default QuranLogView;