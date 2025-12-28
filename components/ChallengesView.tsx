import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import type { Challenge, ChallengeRule, ChallengeDay } from '../types';
import * as firebaseService from '../services/firebaseService';

// Challenge Templates
const CHALLENGE_TEMPLATES = {
  '75hard': {
    name: '75 Hard Challenge',
    durationDays: 75,
    rules: [
      { id: 'workout1', label: 'Complete first 45min workout', required: true },
      { id: 'workout2', label: 'Complete second 45min workout (outdoor)', required: true },
      { id: 'diet', label: 'Follow diet (no cheat meals, no alcohol)', required: true },
      { id: 'water', label: 'Drink 1 gallon of water', required: true },
      { id: 'reading', label: 'Read 10 pages of non-fiction', required: true },
      { id: 'photo', label: 'Take progress photo', required: true }
    ]
  },
  '21day': {
    name: '21-Day Consistency Challenge',
    durationDays: 21,
    rules: [
      { id: 'workout', label: 'Complete 30min workout', required: true },
      { id: 'healthy_meal', label: 'Eat healthy meals', required: true },
      { id: 'sleep', label: 'Sleep 7+ hours', required: true },
      { id: 'reflection', label: 'Evening reflection', required: true }
    ]
  },
  'ramadan': {
    name: 'Ramadan Challenge',
    durationDays: 30,
    rules: [
      { id: 'fast', label: 'Complete fast', required: true },
      { id: 'quran', label: 'Read Quran (minimum 1 page)', required: true },
      { id: 'tahajjud', label: 'Pray Tahajjud', required: false },
      { id: 'charity', label: 'Give charity', required: false },
      { id: 'dua', label: 'Make sincere dua', required: true }
    ]
  }
};

const ChallengesView: React.FC = () => {
  const { currentUser } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [challengeDays, setChallengeDays] = useState<ChallengeDay[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<keyof typeof CHALLENGE_TEMPLATES | 'custom'>('custom');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    durationDays: 21,
    rules: [] as ChallengeRule[]
  });

  useEffect(() => {
    if (!currentUser?.uid) return;

    const unsubscribe = firebaseService.setupChallengesListener(currentUser.uid, (data) => {
      setChallenges(data);
      if (data.length > 0 && !selectedChallenge) {
        setSelectedChallenge(data[0]);
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser?.uid || !selectedChallenge) return;

    const loadDays = async () => {
      const days = await firebaseService.loadChallengeDays(currentUser.uid!, selectedChallenge.id);
      setChallengeDays(days);
    };

    loadDays();
  }, [currentUser, selectedChallenge]);

  const handleTemplateSelect = (template: keyof typeof CHALLENGE_TEMPLATES | 'custom') => {
    setSelectedTemplate(template);
    if (template !== 'custom') {
      const tmpl = CHALLENGE_TEMPLATES[template];
      setFormData({
        name: tmpl.name,
        durationDays: tmpl.durationDays,
        rules: tmpl.rules
      });
    } else {
      setFormData({
        name: '',
        durationDays: 21,
        rules: []
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.uid) return;

    const startDate = new Date().toISOString().split('T')[0];

    await firebaseService.saveChallenge(currentUser.uid, {
      name: formData.name,
      startDate,
      durationDays: formData.durationDays,
      rules: formData.rules,
      active: true
    });

    setIsModalOpen(false);
    setFormData({ name: '', durationDays: 21, rules: [] });
  };

  const handleToggleRule = async (date: string, ruleId: string, currentStatus: boolean) => {
    if (!currentUser?.uid || !selectedChallenge) return;

    const day = challengeDays.find(d => d.date === date);
    const newRuleStatus = { ...(day?.ruleStatus || {}), [ruleId]: !currentStatus };
    const allRequired = selectedChallenge.rules.filter(r => r.required);
    const allCompleted = allRequired.every(r => newRuleStatus[r.id]);

    await firebaseService.saveChallengeDay(currentUser.uid, {
      challengeId: selectedChallenge.id,
      date,
      ruleStatus: newRuleStatus,
      completed: allCompleted
    });

    // Reload days
    const days = await firebaseService.loadChallengeDays(currentUser.uid, selectedChallenge.id);
    setChallengeDays(days);
  };

  const getTodayStatus = () => {
    const today = new Date().toISOString().split('T')[0];
    return challengeDays.find(d => d.date === today);
  };

  const getActiveChallenges = () => challenges.filter(c => c.active);
  const activeChallenges = getActiveChallenges();

  const calculateProgress = (challenge: Challenge) => {
    const totalDays = challenge.durationDays;
    const completedDays = challengeDays.filter(d => d.challengeId === challenge.id && d.completed).length;
    return Math.round((completedDays / totalDays) * 100);
  };

  const addCustomRule = () => {
    setFormData({
      ...formData,
      rules: [...formData.rules, { id: `rule-${Date.now()}`, label: '', required: true }]
    });
  };

  const updateRule = (index: number, field: 'label' | 'required', value: string | boolean) => {
    const newRules = [...formData.rules];
    newRules[index] = { ...newRules[index], [field]: value };
    setFormData({ ...formData, rules: newRules });
  };

  const removeRule = (index: number) => {
    setFormData({
      ...formData,
      rules: formData.rules.filter((_, i) => i !== index)
    });
  };

  const todayStatus = getTodayStatus();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50 dark:from-slate-900 dark:via-purple-900/20 dark:to-pink-900/20 p-2 lg:p-4">
      {/* Header */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center mr-2">
              <span className="text-white text-lg">🎯</span>
            </div>
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-slate-800 dark:text-slate-200">Challenges</h1>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {activeChallenges.length} active challenge{activeChallenges.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg font-medium text-sm hover:shadow-lg transition-all"
          >
            + New Challenge
          </button>
        </div>

        {/* Active Challenges Tabs */}
        {activeChallenges.length > 0 && (
          <div className="flex overflow-x-auto space-x-2 pb-2 scrollbar-hide">
            {activeChallenges.map(challenge => (
              <button
                key={challenge.id}
                onClick={() => setSelectedChallenge(challenge)}
                className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedChallenge?.id === challenge.id
                    ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-md'
                    : 'bg-white/60 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="font-medium">{challenge.name}</div>
                <div className="text-xs opacity-80">{calculateProgress(challenge)}% complete</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Content */}
      {selectedChallenge ? (
        <div className="space-y-3">
          {/* Today's Checklist */}
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-lg p-3 border border-white/20">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center">
              <span className="mr-2">📋</span>
              Today's Goals
            </h3>
            <div className="space-y-2">
              {selectedChallenge.rules.map(rule => {
                const isChecked = todayStatus?.ruleStatus[rule.id] || false;
                const today = new Date().toISOString().split('T')[0];

                return (
                  <label
                    key={rule.id}
                    className="flex items-center space-x-2 p-2 rounded hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleRule(today, rule.id, isChecked)}
                      className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                    />
                    <span className={`flex-1 text-sm ${isChecked ? 'line-through text-slate-500 dark:text-slate-400' : 'text-slate-700 dark:text-slate-300'}`}>
                      {rule.label}
                    </span>
                    {rule.required && (
                      <span className="text-xs px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded">
                        Required
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
            {todayStatus?.completed && (
              <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded text-center">
                <span className="text-green-700 dark:text-green-300 text-sm font-medium">
                  ✅ All required tasks completed today!
                </span>
              </div>
            )}
          </div>

          {/* Progress */}
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-lg p-3 border border-white/20">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-slate-800 dark:text-slate-200">Progress</h3>
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {challengeDays.filter(d => d.completed).length} / {selectedChallenge.durationDays} days
              </span>
            </div>
            <div className="w-full h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-600 transition-all"
                style={{ width: `${calculateProgress(selectedChallenge)}%` }}
              />
            </div>
          </div>

          {/* Challenge Info */}
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-lg p-3 border border-white/20">
            <div className="grid grid-cols-2 gap-3 text-center">
              <div>
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {selectedChallenge.durationDays}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Total Days</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-pink-600 dark:text-pink-400">
                  {selectedChallenge.rules.filter(r => r.required).length}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Required Tasks</div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-600">
              <div className="text-xs text-slate-600 dark:text-slate-400">Started: {selectedChallenge.startDate}</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-8 text-center">
          <div className="text-4xl mb-2">🎯</div>
          <p className="text-slate-600 dark:text-slate-400">No active challenges</p>
          <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">Create your first challenge to get started!</p>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 max-w-2xl w-full shadow-2xl my-4">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-3">Create Challenge</h2>

            {/* Templates */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                Choose Template
              </label>
              <div className="grid grid-cols-2 gap-2">
                {Object.keys(CHALLENGE_TEMPLATES).map(key => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleTemplateSelect(key as keyof typeof CHALLENGE_TEMPLATES)}
                    className={`p-2 rounded text-sm font-medium transition-all ${
                      selectedTemplate === key
                        ? 'bg-purple-500 text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {CHALLENGE_TEMPLATES[key as keyof typeof CHALLENGE_TEMPLATES].name}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleTemplateSelect('custom')}
                  className={`p-2 rounded text-sm font-medium transition-all ${
                    selectedTemplate === 'custom'
                      ? 'bg-purple-500 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  Custom
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Challenge Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Duration (days) *
                </label>
                <input
                  type="number"
                  value={formData.durationDays}
                  onChange={(e) => setFormData({ ...formData, durationDays: parseInt(e.target.value) || 21 })}
                  min="1"
                  max="365"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Rules/Tasks
                </label>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {formData.rules.map((rule, index) => (
                    <div key={rule.id} className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={rule.label}
                        onChange={(e) => updateRule(index, 'label', e.target.value)}
                        placeholder="Task description"
                        className="flex-1 px-2 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded text-sm"
                      />
                      <label className="flex items-center space-x-1 text-xs">
                        <input
                          type="checkbox"
                          checked={rule.required}
                          onChange={(e) => updateRule(index, 'required', e.target.checked)}
                          className="rounded"
                        />
                        <span className="text-slate-600 dark:text-slate-400">Required</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => removeRule(index)}
                        className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addCustomRule}
                  className="mt-2 w-full px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-sm hover:bg-slate-200 dark:hover:bg-slate-600"
                >
                  + Add Rule
                </button>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setFormData({ name: '', durationDays: 21, rules: [] });
                  }}
                  className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formData.rules.length === 0}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded font-medium text-sm hover:shadow-lg disabled:opacity-50"
                >
                  Create Challenge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChallengesView;
