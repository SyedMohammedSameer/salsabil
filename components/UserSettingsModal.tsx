import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import type { UserSettings } from '../types';
import * as firebaseService from '../services/firebaseService';
import * as notificationService from '../services/notificationService';

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const UserSettingsModal: React.FC<UserSettingsModalProps> = ({ isOpen, onClose }) => {
  const { currentUser } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (!currentUser?.uid || !isOpen) return;

    const loadSettings = async () => {
      const data = await firebaseService.loadUserSettings(currentUser.uid!);
      setSettings(data);
    };

    loadSettings();
  }, [currentUser, isOpen]);

  const handleSave = async () => {
    if (!currentUser?.uid || !settings) return;

    await firebaseService.saveUserSettings(currentUser.uid, settings);
    setHasChanges(false);
    onClose();
  };

  const handleRequestPushPermission = async () => {
    if (!currentUser?.uid) return;

    const token = await notificationService.requestNotificationPermission(currentUser.uid);
    if (token && settings) {
      setSettings({ ...settings, pushEnabled: true });
      setHasChanges(true);
    }
  };

  const updateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
    setHasChanges(true);
  };

  if (!isOpen || !settings) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl p-5 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Settings</h2>
          <button
            onClick={onClose}
            className="p-1 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
          >
            ✕
          </button>
        </div>

        <div className="space-y-5">
          {/* Notifications */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3">Notifications</h3>
            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <div>
                  <div className="font-medium text-sm text-slate-800 dark:text-slate-200">Enable Notifications</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">Receive in-app notifications</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notificationEnabled}
                  onChange={(e) => updateSetting('notificationEnabled', e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                />
              </label>

              <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="font-medium text-sm text-slate-800 dark:text-slate-200">Push Notifications</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">Browser push notifications</div>
                  </div>
                  {settings.pushEnabled ? (
                    <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">
                      ✓ Enabled
                    </span>
                  ) : (
                    <button
                      onClick={handleRequestPushPermission}
                      className="text-xs px-3 py-1 bg-indigo-500 text-white rounded hover:bg-indigo-600"
                    >
                      Enable
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* AI Assistant */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3">AI Assistant</h3>
            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <div>
                  <div className="font-medium text-sm text-slate-800 dark:text-slate-200">Proactive Check-ins</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">AI sends periodic reminders</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.aiCheckInEnabled}
                  onChange={(e) => updateSetting('aiCheckInEnabled', e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                />
              </label>

              {settings.aiCheckInEnabled && (
                <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Check-in Frequency
                  </label>
                  <select
                    value={settings.aiCheckInIntervalMinutes}
                    onChange={(e) => updateSetting('aiCheckInIntervalMinutes', parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-sm"
                  >
                    <option value={60}>Every hour</option>
                    <option value={120}>Every 2 hours</option>
                    <option value={180}>Every 3 hours</option>
                    <option value={240}>Every 4 hours</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Quiet Hours */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3">Quiet Hours</h3>
            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <div>
                  <div className="font-medium text-sm text-slate-800 dark:text-slate-200">Enable Quiet Hours</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">Pause notifications during sleep</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.quietHours.enabled}
                  onChange={(e) => updateSetting('quietHours', { ...settings.quietHours, enabled: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                />
              </label>

              {settings.quietHours.enabled && (
                <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Start Time
                      </label>
                      <input
                        type="time"
                        value={settings.quietHours.start}
                        onChange={(e) => updateSetting('quietHours', { ...settings.quietHours, start: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        End Time
                      </label>
                      <input
                        type="time"
                        value={settings.quietHours.end}
                        onChange={(e) => updateSetting('quietHours', { ...settings.quietHours, end: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* UI Preferences */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3">Interface</h3>
            <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                UI Density
              </label>
              <select
                value={settings.uiDensity}
                onChange={(e) => updateSetting('uiDensity', e.target.value as 'compact' | 'standard')}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-sm"
              >
                <option value="compact">Compact (More info, less padding)</option>
                <option value="standard">Standard (Balanced)</option>
              </select>
            </div>
          </div>

          {/* Focus Mode Status */}
          {settings.focusMode.enabled && (
            <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-orange-600 dark:text-orange-400">🔕</span>
                  <div>
                    <div className="font-medium text-sm text-orange-800 dark:text-orange-200">Focus Mode Active</div>
                    <div className="text-xs text-orange-700 dark:text-orange-300">
                      All notifications are currently paused
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => updateSetting('focusMode', { enabled: false })}
                  className="px-3 py-1.5 text-xs bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors"
                >
                  Disable
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex space-x-3 mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-300 dark:hover:bg-slate-600"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg disabled:opacity-50"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserSettingsModal;
