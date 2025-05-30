import React, { useState, useEffect, useCallback } from 'react';
import { DailyPrayerLog, PrayerName } from '../types';
import { PRAYER_DEFINITIONS, PRAYER_ORDER } from '../constants';
import { loadPrayerLogsFromLocalStorage, savePrayerLogsToLocalStorage } from '../services/localStorageService';
import { ChevronLeftIcon, ChevronRightIcon } from './icons/NavIcons';

const formatDateToYYYYMMDD = (date: Date): string => date.toISOString().split('T')[0];

const PrayerTrackerView: React.FC = () => {
  const [prayerLogs, setPrayerLogs] = useState<DailyPrayerLog[]>(loadPrayerLogsFromLocalStorage);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [currentLog, setCurrentLog] = useState<DailyPrayerLog | null>(null);
  const [notes, setNotes] = useState<string>('');

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
      // Initialize with PRAYER_DEFINITIONS (all false)
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
    updatedLog.prayers = { ...updatedLog.prayers }; // Ensure deep copy for prayers object
    
    if (!updatedLog.prayers[prayerName]) { // Initialize if prayer not yet in log for some reason
        updatedLog.prayers[prayerName] = {};
    }
    (updatedLog.prayers[prayerName] as any)[type] = checked;

    setCurrentLog(updatedLog);
    updateLocalStorage(updatedLog);
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value);
  };
  
  const saveNotes = () => {
     if (!currentLog) return;
     const updatedLog = { ...currentLog, notes: notes };
     setCurrentLog(updatedLog);
     updateLocalStorage(updatedLog);
     alert("Notes saved!");
  }

  const updateLocalStorage = useCallback((logToSave: DailyPrayerLog) => {
    setPrayerLogs(prevLogs => {
      const existingLogIndex = prevLogs.findIndex(log => log.date === logToSave.date);
      let newLogs;
      if (existingLogIndex > -1) {
        newLogs = [...prevLogs];
        newLogs[existingLogIndex] = logToSave;
      } else {
        newLogs = [...prevLogs, logToSave];
      }
      savePrayerLogsToLocalStorage(newLogs);
      return newLogs;
    });
  }, []);


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

  return (
    <div className="animate-fadeIn">
      <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-6">Prayer Tracker</h1>
      
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

      {currentLog && (
        <div className="space-y-6">
          {PRAYER_ORDER.map(prayerName => {
            const definition = PRAYER_DEFINITIONS[prayerName];
            const logEntry = currentLog.prayers[prayerName];
            if (!definition.isApplicable) return null;

            return (
              <div key={prayerName} className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-primary dark:text-primary-light mb-3">{definition.name}</h3>
                <div className="space-y-2">
                  {definition.fardhCount !== undefined && (
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        className="form-checkbox h-5 w-5 text-primary rounded focus:ring-primary-dark"
                        checked={logEntry?.fardh || false}
                        onChange={(e) => handlePrayerChange(prayerName, 'fardh', e.target.checked)}
                      />
                      <span className="text-slate-700 dark:text-slate-300">Fardh ({definition.fardhCount} Raka'at)</span>
                    </label>
                  )}
                  {definition.sunnahCount !== undefined && (
                     <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        className="form-checkbox h-5 w-5 text-accent rounded focus:ring-accent-dark"
                        checked={logEntry?.sunnah || false}
                        onChange={(e) => handlePrayerChange(prayerName, 'sunnah', e.target.checked)}
                      />
                      <span className="text-slate-700 dark:text-slate-300">Sunnah ({definition.sunnahCount} Raka'at)</span>
                    </label>
                  )}
                  {/* Special case for Tahajjud or prayers without standard Fardh/Sunnah counts like above */}
                  {definition.fardhCount === undefined && definition.sunnahCount === undefined && (
                     <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        className="form-checkbox h-5 w-5 text-secondary rounded focus:ring-secondary-dark"
                        checked={logEntry?.fardh || false} // Using 'fardh' as the general completion flag for Tahajjud
                        onChange={(e) => handlePrayerChange(prayerName, 'fardh', e.target.checked)}
                      />
                      <span className="text-slate-700 dark:text-slate-300">Prayed</span>
                    </label>
                  )}
                </div>
              </div>
            );
          })}
          
          <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">Notes for the Day</h3>
            <textarea
                value={notes}
                onChange={handleNotesChange}
                rows={3}
                placeholder="Any reflections or additional notes..."
                className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md dark:bg-slate-700 focus:ring-primary focus:border-primary text-sm text-slate-700 dark:text-slate-200"
            />
            <button 
                onClick={saveNotes}
                className="mt-3 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark text-sm transition-colors"
            >
                Save Notes
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrayerTrackerView;
