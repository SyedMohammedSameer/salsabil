// BEAUTIFUL, PROFESSIONAL Challenges Module
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import type { Challenge, ChallengeRule, ChallengeDay } from '../types';
import * as firebaseService from '../services/firebaseService';

// Challenge Templates
const CHALLENGE_TEMPLATES = {
  '75hard': {
    name: '75 Hard Challenge',
    durationDays: 75,
    description: 'Mental toughness program - no compromises',
    icon: '💪',
    color: 'from-red-500 to-orange-600',
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
    description: 'Build lasting habits through consistency',
    icon: '🎯',
    color: 'from-blue-500 to-purple-600',
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
    description: 'Spiritual growth through sacred month',
    icon: '🌙',
    color: 'from-green-500 to-teal-600',
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

  const calculateXP = (completedRules: number, totalRules: number, isStreakDay: boolean): number => {
    const baseXP = 10;
    const ruleXP = completedRules * 5;
    const streakBonus = isStreakDay ? 20 : 0;
    return baseXP + ruleXP + streakBonus;
  };

  const handleToggleRule = async (date: string, ruleId: string, currentStatus: boolean) => {
    if (!currentUser?.uid || !selectedChallenge) return;

    const day = challengeDays.find(d => d.date === date);
    const newRuleStatus = { ...(day?.ruleStatus || {}), [ruleId]: !currentStatus };
    const allRequired = selectedChallenge.rules.filter(r => r.required);
    const allCompleted = allRequired.every(r => newRuleStatus[r.id]);

    // Calculate XP for this day
    const completedCount = Object.values(newRuleStatus).filter(Boolean).length;
    const isNewCompletion = allCompleted && !day?.completed;

    // Check if this maintains a streak
    const yesterday = new Date(date);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = yesterday.toISOString().split('T')[0];
    const yesterdayDay = challengeDays.find(d => d.date === yesterdayString);
    const isStreakDay = yesterdayDay?.completed || false;

    const xpEarned = isNewCompletion ? calculateXP(completedCount, selectedChallenge.rules.length, isStreakDay) : (day?.xpEarned || 0);

    await firebaseService.saveChallengeDay(currentUser.uid, {
      challengeId: selectedChallenge.id,
      date,
      ruleStatus: newRuleStatus,
      completed: allCompleted,
      xpEarned
    });

    // Update challenge XP and streak
    if (isNewCompletion) {
      const currentXP = selectedChallenge.totalXP || 0;
      const newStreak = (selectedChallenge.currentStreak || 0) + 1;
      const longestStreak = Math.max(selectedChallenge.longestStreak || 0, newStreak);

      await firebaseService.updateChallenge(currentUser.uid, selectedChallenge.id, {
        totalXP: currentXP + xpEarned,
        currentStreak: newStreak,
        longestStreak
      });
    }

    const days = await firebaseService.loadChallengeDays(currentUser.uid, selectedChallenge.id);
    setChallengeDays(days);
  };

  const handleQuitChallenge = async (challengeId: string) => {
    if (!currentUser?.uid) return;

    const confirmQuit = window.confirm('Are you sure you want to quit this challenge? Your progress will be saved but the challenge will be marked as inactive.');
    if (!confirmQuit) return;

    await firebaseService.updateChallenge(currentUser.uid, challengeId, { active: false });

    // If this was the selected challenge, clear selection
    if (selectedChallenge?.id === challengeId) {
      const remaining = challenges.filter(c => c.active && c.id !== challengeId);
      setSelectedChallenge(remaining.length > 0 ? remaining[0] : null);
    }
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

  const getCompletionRate = () => {
    if (challengeDays.length === 0) return 0;
    const completed = challengeDays.filter(d => d.completed).length;
    return Math.round((completed / challengeDays.length) * 100);
  };

  const getCurrentDay = () => {
    if (!selectedChallenge) return 0;
    const start = new Date(selectedChallenge.startDate);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.min(diffDays, selectedChallenge.durationDays);
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 dark:from-slate-900 dark:via-purple-900/20 dark:to-slate-900 p-4 md:p-6">

      {/* Hero Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-3xl">🎯</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Challenge Tracker
              </h1>
              <p className="text-slate-600 dark:text-slate-400">Transform through commitment</p>
            </div>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl font-semibold hover:shadow-xl transform hover:scale-105 transition-all flex items-center space-x-2"
          >
            <span className="text-xl">+</span>
            <span>New Challenge</span>
          </button>
        </div>

        {/* Stats Cards - Gamified */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border-l-4 border-purple-500">
            <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Active Challenges</div>
            <div className="text-3xl font-bold text-purple-600">{activeChallenges.length}</div>
            <div className="text-xs text-slate-500 mt-1">In Progress</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border-l-4 border-pink-500">
            <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Completion Rate</div>
            <div className="text-3xl font-bold text-pink-600">{getCompletionRate()}%</div>
            <div className="text-xs text-slate-500 mt-1">Days Completed</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border-l-4 border-orange-500">
            <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Current Streak</div>
            <div className="text-3xl font-bold text-orange-600">{selectedChallenge?.currentStreak || 0}</div>
            <div className="text-xs text-slate-500 mt-1">🔥 Days in a Row</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border-l-4 border-teal-500">
            <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Perfect Days</div>
            <div className="text-3xl font-bold text-teal-600">{challengeDays.filter(d => d.completed).length}</div>
            <div className="text-xs text-slate-500 mt-1">All Tasks Done</div>
          </div>
          <div className="bg-gradient-to-br from-yellow-50 to-amber-100 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-2xl p-6 shadow-lg border-l-4 border-yellow-500">
            <div className="text-sm text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
              <span>⭐</span> Total XP
            </div>
            <div className="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-amber-600 bg-clip-text text-transparent">
              {selectedChallenge?.totalXP || 0}
            </div>
            <div className="text-xs text-slate-500 mt-1">Experience Points</div>
          </div>
        </div>
      </div>

      {/* Active Challenges Tabs */}
      {activeChallenges.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Your Challenges</h2>
            {selectedChallenge && (
              <button
                onClick={() => handleQuitChallenge(selectedChallenge.id)}
                className="px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-all text-sm font-medium"
              >
                Quit Challenge
              </button>
            )}
          </div>
          <div className="flex overflow-x-auto space-x-3 pb-2 scrollbar-hide">
            {activeChallenges.map(challenge => (
              <button
                key={challenge.id}
                onClick={() => setSelectedChallenge(challenge)}
                className={`flex-shrink-0 px-5 py-3 rounded-xl font-medium transition-all ${
                  selectedChallenge?.id === challenge.id
                    ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg scale-105'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-md hover:shadow-lg'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="font-semibold text-lg">{challenge.name}</div>
                  {(challenge.totalXP || 0) > 0 && (
                    <span className="text-xs px-2 py-0.5 bg-yellow-400/20 text-yellow-600 dark:text-yellow-400 rounded-full">
                      {challenge.totalXP} XP
                    </span>
                  )}
                </div>
                <div className="text-sm opacity-90 mt-1">{calculateProgress(challenge)}% complete</div>
                {(challenge.currentStreak || 0) > 0 && (
                  <div className="text-xs opacity-80 mt-1">🔥 {challenge.currentStreak} day streak</div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      {selectedChallenge ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Today's Checklist */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg">
            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center">
              <span className="mr-3 text-3xl">📋</span>
              Today's Goals
            </h3>
            <div className="space-y-3">
              {selectedChallenge.rules.map(rule => {
                const isChecked = todayStatus?.ruleStatus[rule.id] || false;
                const today = new Date().toISOString().split('T')[0];

                return (
                  <label
                    key={rule.id}
                    className="flex items-center space-x-3 p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-all group"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleRule(today, rule.id, isChecked)}
                      className="w-5 h-5 text-purple-600 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                    <span className={`flex-1 font-medium ${isChecked ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-300'}`}>
                      {rule.label}
                    </span>
                    {rule.required && (
                      <span className="text-xs px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full font-medium">
                        Required
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
            {todayStatus?.completed && (
              <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-300 dark:border-green-700 rounded-xl">
                <div className="text-center">
                  <div className="text-green-700 dark:text-green-300 font-bold text-lg mb-2">
                    ✅ All required tasks completed today! Amazing work!
                  </div>
                  {todayStatus.xpEarned && todayStatus.xpEarned > 0 && (
                    <div className="inline-flex items-center gap-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-4 py-2 rounded-full font-semibold">
                      <span className="text-xl">⭐</span>
                      <span>+{todayStatus.xpEarned} XP Earned!</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Progress & Info */}
          <div className="space-y-6">
            {/* Progress Card */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Progress</h3>
                <span className="text-lg text-slate-600 dark:text-slate-400 font-semibold">
                  {challengeDays.filter(d => d.completed).length} / {selectedChallenge.durationDays}
                </span>
              </div>
              <div className="w-full h-4 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 transition-all duration-500 shadow-lg"
                  style={{ width: `${calculateProgress(selectedChallenge)}%` }}
                />
              </div>
              <div className="mt-3 text-center">
                <span className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  {calculateProgress(selectedChallenge)}%
                </span>
              </div>
            </div>

            {/* Challenge Info Card */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4">Challenge Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl">
                  <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                    {selectedChallenge.durationDays}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">Total Days</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-pink-50 to-orange-50 dark:from-pink-900/20 dark:to-orange-900/20 rounded-xl">
                  <div className="text-3xl font-bold text-pink-600 dark:text-pink-400">
                    {selectedChallenge.rules.filter(r => r.required).length}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">Required Tasks</div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-600 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">Started:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {new Date(selectedChallenge.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">Longest Streak:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    🔥 {selectedChallenge.longestStreak || 0} days
                  </span>
                </div>
              </div>
            </div>

            {/* XP Leaderboard */}
            <div className="bg-gradient-to-br from-yellow-50 to-amber-100 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-2xl p-6 shadow-lg border-2 border-yellow-300 dark:border-yellow-700">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                <span className="text-2xl">🏆</span>
                XP Progress
              </h3>

              {/* Total XP Display */}
              <div className="bg-white/50 dark:bg-slate-800/50 rounded-xl p-4 mb-4">
                <div className="text-center">
                  <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Total Experience</div>
                  <div className="text-4xl font-bold bg-gradient-to-r from-yellow-600 to-amber-600 bg-clip-text text-transparent">
                    {selectedChallenge.totalXP || 0} XP
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Level {Math.floor((selectedChallenge.totalXP || 0) / 100) + 1}
                  </div>
                </div>

                {/* Level Progress Bar */}
                <div className="mt-3">
                  <div className="w-full h-2 bg-slate-200 dark:bg-slate-600 rounded-full">
                    <div
                      className="h-full bg-gradient-to-r from-yellow-500 to-amber-500 rounded-full transition-all"
                      style={{ width: `${((selectedChallenge.totalXP || 0) % 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>{(selectedChallenge.totalXP || 0) % 100} / 100 XP</span>
                    <span>Next Level</span>
                  </div>
                </div>
              </div>

              {/* Recent XP Log */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Recent XP Gains</h4>
                <div className="max-h-40 overflow-y-auto space-y-1.5">
                  {challengeDays
                    .filter(d => d.xpEarned && d.xpEarned > 0)
                    .slice(-5)
                    .reverse()
                    .map(day => (
                      <div
                        key={day.id}
                        className="flex items-center justify-between bg-white/60 dark:bg-slate-800/60 rounded-lg p-2 text-sm"
                      >
                        <span className="text-slate-600 dark:text-slate-400">
                          {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        <span className="font-bold text-yellow-600 dark:text-yellow-400">
                          +{day.xpEarned} XP
                        </span>
                      </div>
                    ))}
                  {challengeDays.filter(d => d.xpEarned && d.xpEarned > 0).length === 0 && (
                    <div className="text-center text-sm text-slate-500 dark:text-slate-400 py-4">
                      Complete days to earn XP!
                    </div>
                  )}
                </div>
              </div>

              {/* XP Info */}
              <div className="mt-4 pt-4 border-t border-yellow-300 dark:border-yellow-700/50">
                <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                  <div>💡 Base: 10 XP per day</div>
                  <div>✨ +5 XP per completed task</div>
                  <div>🔥 +20 XP streak bonus</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Empty State with Templates
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center shadow-lg">
            <div className="text-6xl mb-4">🎯</div>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">No Active Challenges</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">Choose a template below or create your own custom challenge</p>
          </div>

          {/* Challenge Templates */}
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4">Popular Templates</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(CHALLENGE_TEMPLATES).map(([key, template]) => (
                <div
                  key={key}
                  className="group bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all cursor-pointer border-l-4 border-purple-500 relative overflow-hidden"
                  onClick={() => {
                    handleTemplateSelect(key as keyof typeof CHALLENGE_TEMPLATES);
                    setIsModalOpen(true);
                  }}
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-200 to-pink-200 dark:from-purple-900/30 dark:to-pink-900/30 rounded-bl-full opacity-50"></div>

                  <div className="relative">
                    <div className="text-4xl mb-3">{template.icon}</div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">{template.name}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{template.description}</p>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-400">{template.durationDays} days</span>
                      <span className="text-slate-600 dark:text-slate-400">{template.rules.length} tasks</span>
                    </div>

                    <button className="mt-4 w-full px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all">
                      Start Challenge
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full p-6 my-8">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6">
              Create New Challenge
            </h2>

            {/* Templates */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                Choose Template
              </label>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(CHALLENGE_TEMPLATES).map(([key, template]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleTemplateSelect(key as keyof typeof CHALLENGE_TEMPLATES)}
                    className={`p-3 rounded-xl font-medium transition-all text-left ${
                      selectedTemplate === key
                        ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:shadow-md'
                    }`}
                  >
                    <div className="text-2xl mb-1">{template.icon}</div>
                    <div className="text-sm font-semibold">{template.name}</div>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleTemplateSelect('custom')}
                  className={`p-3 rounded-xl font-medium transition-all text-left ${
                    selectedTemplate === 'custom'
                      ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:shadow-md'
                  }`}
                >
                  <div className="text-2xl mb-1">⚡</div>
                  <div className="text-sm font-semibold">Custom</div>
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Challenge Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="My Awesome Challenge"
                  required
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Duration (days)
                </label>
                <input
                  type="number"
                  value={formData.durationDays}
                  onChange={(e) => setFormData({ ...formData, durationDays: parseInt(e.target.value) || 21 })}
                  min="1"
                  max="365"
                  required
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Rules/Tasks
                </label>
                <div className="space-y-2 max-h-60 overflow-y-auto bg-slate-50 dark:bg-slate-700/50 p-3 rounded-xl">
                  {formData.rules.map((rule, index) => (
                    <div key={rule.id} className="flex items-center space-x-2 bg-white dark:bg-slate-800 p-2 rounded-lg">
                      <input
                        type="text"
                        value={rule.label}
                        onChange={(e) => updateRule(index, 'label', e.target.value)}
                        placeholder="Task description"
                        className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm"
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
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addCustomRule}
                  className="mt-3 w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-all font-medium"
                >
                  + Add Rule
                </button>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setFormData({ name: '', durationDays: 21, rules: [] });
                  }}
                  className="flex-1 px-6 py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold hover:bg-slate-300 dark:hover:bg-slate-600 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formData.rules.length === 0}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl font-semibold hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
