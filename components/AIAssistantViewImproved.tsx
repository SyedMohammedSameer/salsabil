// Enhanced AIAssistantView.tsx with full database access and chat persistence
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Task, ChatMessage as ChatMessageType, DailyPrayerLog, DailyQuranLog, PomodoroSettings } from '../types';
import * as GroqService from '../services/groqService';
import * as firebaseService from '../services/firebaseService';
import ChatMessageImproved from './ChatMessageImproved';
import LoadingSpinner from './LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { designSystem } from '../utils/designSystem';

interface AIAssistantViewProps {
  tasks: Task[];
}

interface ContextData {
  tasks: Task[];
  prayerLogs: DailyPrayerLog[];
  quranLogs: DailyQuranLog[];
  pomodoroSettings: PomodoroSettings;
  stats: {
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
    currentStreak: number;
    weeklyQuranPages: number;
    todayPrayers: number;
    previousDayPrayers?: number;
    previousStreak?: number;
  };
}

const AIAssistantViewImproved: React.FC<AIAssistantViewProps> = ({ tasks }) => {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [contextData, setContextData] = useState<ContextData | null>(null);
  const [loadingContext, setLoadingContext] = useState(true);
  const chatHistoryRef = useRef<{role: string, parts: {text: string}[]}[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  // Load all context data and chat history
  useEffect(() => {
    const loadAllData = async () => {
      setLoadingContext(true);
      try {
        // Load all user data in parallel
        const [prayerLogs, quranLogs, pomodoroSettings, chatHistory] = await Promise.all([
          firebaseService.loadPrayerLogs(currentUser?.uid || null),
          firebaseService.loadQuranLogs(currentUser?.uid || null),
          firebaseService.loadPomodoroSettings(currentUser?.uid || null),
          firebaseService.loadChatHistory(currentUser?.uid || null)
        ]);

        // Calculate comprehensive stats
        const stats = calculateStats(tasks, prayerLogs, quranLogs);

        setContextData({
          tasks,
          prayerLogs,
          quranLogs,
          pomodoroSettings,
          stats
        });

        // Load chat history
        if (chatHistory.length > 0) {
          setMessages(chatHistory);
          // Rebuild chat history for API
          chatHistoryRef.current = chatHistory.map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }]
          }));
        } else {
          // Initial greeting with context
          const greetingMessage: ChatMessageType = {
            id: Date.now().toString(),
            text: getContextualGreeting(stats),
            sender: 'ai',
            timestamp: new Date(),
          };
          setMessages([greetingMessage]);
        }
      } catch (error) {
        console.error('Error loading context data:', error);
        const errorMessage: ChatMessageType = {
          id: Date.now().toString(),
          text: "Hello! I'm Noor, your AI assistant. I'm having trouble accessing your data right now, but I'm here to help with whatever you need!",
          sender: 'ai',
          timestamp: new Date(),
        };
        setMessages([errorMessage]);
      } finally {
        setLoadingContext(false);
      }
    };

    loadAllData();
  }, [tasks, currentUser]);

  // Update context when tasks change
  useEffect(() => {
    if (contextData) {
      const stats = calculateStats(tasks, contextData.prayerLogs, contextData.quranLogs);
      setContextData(prev => prev ? { ...prev, tasks, stats } : null);
    }
  }, [tasks, contextData?.prayerLogs, contextData?.quranLogs]);

  const calculateStats = (tasks: Task[], prayerLogs: DailyPrayerLog[], quranLogs: DailyQuranLog[]) => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.completed).length;
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    // Calculate Quran reading streak
    let currentStreak = 0;
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const dateString = checkDate.toISOString().split('T')[0];
      const log = quranLogs.find(l => l.date === dateString);

      if (log && log.readQuran) {
        currentStreak++;
      } else if (i === 0 && (!log || !log.readQuran)) {
        continue;
      } else {
        break;
      }
    }

    // Calculate previous streak (for trend)
    let previousStreak = 0;
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(yesterday);
      checkDate.setDate(yesterday.getDate() - i);
      const dateString = checkDate.toISOString().split('T')[0];
      const log = quranLogs.find(l => l.date === dateString);

      if (log && log.readQuran) {
        previousStreak++;
      } else {
        break;
      }
    }

    // Calculate weekly Quran pages
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    });

    const weeklyQuranPages = last7Days.reduce((total, date) => {
      const log = quranLogs.find(l => l.date === date);
      return total + (log?.pagesRead || 0);
    }, 0);

    // Today's prayers
    const todayString = new Date().toISOString().split('T')[0];
    const todayPrayerLog = prayerLogs.find(l => l.date === todayString);
    const todayPrayers = todayPrayerLog
      ? Object.values(todayPrayerLog.prayers).filter(p => p?.fardh).length
      : 0;

    // Yesterday's prayers (for trend)
    const yesterdayString = new Date(yesterday).toISOString().split('T')[0];
    const yesterdayPrayerLog = prayerLogs.find(l => l.date === yesterdayString);
    const previousDayPrayers = yesterdayPrayerLog
      ? Object.values(yesterdayPrayerLog.prayers).filter(p => p?.fardh).length
      : 0;

    return {
      totalTasks,
      completedTasks,
      completionRate,
      currentStreak,
      previousStreak,
      weeklyQuranPages,
      todayPrayers,
      previousDayPrayers
    };
  };

  const getContextualGreeting = (stats: any) => {
    const greetings = [
      `Hello! I'm Noor, your AI assistant. I see you have ${stats.totalTasks} tasks and have completed ${stats.todayPrayers}/5 prayers today. How can I help you stay focused and grow spiritually?`,
      `Assalamu Alaikum! I'm Noor. You're doing great with a ${stats.currentStreak}-day Quran reading streak and ${stats.completionRate.toFixed(0)}% task completion rate. What would you like to work on?`,
      `Hi there! I'm Noor, here to help with your productivity and spiritual journey. I notice you've read ${stats.weeklyQuranPages} Quran pages this week. How can I assist you today?`
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  };

  const buildComprehensiveContext = (contextData: ContextData): string => {
    const { tasks, prayerLogs, quranLogs, pomodoroSettings, stats } = contextData;

    const context = `
COMPREHENSIVE USER DATA CONTEXT:

=== TASKS & PRODUCTIVITY ===
- Total Tasks: ${stats.totalTasks}
- Completed Tasks: ${stats.completedTasks}
- Completion Rate: ${stats.completionRate.toFixed(1)}%
- Overdue Tasks: ${tasks.filter(t => !t.completed && new Date(t.date) < new Date()).length}

Recent Tasks:
${tasks.slice(-10).map(t => `- ${t.title} (${t.priority} priority, ${t.completed ? 'Completed' : 'Pending'}, Due: ${t.date})`).join('\n')}

=== SPIRITUAL PROGRESS ===
Quran Reading:
- Current Streak: ${stats.currentStreak} days
- Pages This Week: ${stats.weeklyQuranPages}
- Total Logs: ${quranLogs.length}

Prayer Status:
- Today's Prayers: ${stats.todayPrayers}/5 completed
- Recent Prayer Logs: ${prayerLogs.slice(-7).map(log =>
  `${log.date}: ${Object.values(log.prayers).filter(p => p?.fardh).length}/5 prayers`
).join(', ')}

=== PERSONAL SETTINGS ===
Pomodoro Settings: ${pomodoroSettings.workDuration}min work, ${pomodoroSettings.shortBreakDuration}min break

=== RECENT INSIGHTS ===
${getRecentInsights(tasks, prayerLogs, quranLogs)}

Please use this comprehensive context to provide personalized, relevant assistance.
`;

    return context;
  };

  const getRecentInsights = (tasks: Task[], prayerLogs: DailyPrayerLog[], quranLogs: DailyQuranLog[]): string => {
    const insights = [];

    // Task insights
    const highPriorityPending = tasks.filter(t => t.priority === 'High' && !t.completed);
    if (highPriorityPending.length > 0) {
      insights.push(`${highPriorityPending.length} high-priority tasks pending`);
    }

    // Spiritual insights
    const recentQuranLog = quranLogs[quranLogs.length - 1];
    if (recentQuranLog && recentQuranLog.readQuran) {
      insights.push(`Last read ${recentQuranLog.pagesRead || 0} Quran pages on ${recentQuranLog.date}`);
    }

    return insights.join(', ') || 'No recent insights available';
  };

  const addMessage = async (text: string, sender: 'user' | 'ai') => {
    const newMessage: ChatMessageType = {
      id: Date.now().toString(),
      text,
      sender,
      timestamp: new Date(),
    };

    setMessages(prev => {
      const updated = [...prev, newMessage];
      // Save to Firebase (debounced)
      saveMessagesToFirebase(updated);
      return updated;
    });

    if (sender === 'user') {
      chatHistoryRef.current.push({role: 'user', parts: [{text}]});
    } else {
      chatHistoryRef.current.push({role: 'model', parts: [{text}]});
    }
  };

  const saveMessagesToFirebase = useCallback(
    debounce(async (messages: ChatMessageType[]) => {
      try {
        await firebaseService.saveChatHistory(currentUser?.uid || null, messages);
      } catch (error) {
        console.error('Error saving chat history:', error);
      }
    }, 2000),
    [currentUser]
  );

  const handleSend = async () => {
    if (input.trim() === '' || isLoading || !contextData) return;

    const userInput = input;
    await addMessage(userInput, 'user');
    setInput('');
    setIsLoading(true);

    try {
      const contextualPrompt = buildComprehensiveContext(contextData);
      const aiResponse = await GroqService.getEnhancedAiResponse(
        userInput,
        contextualPrompt,
        chatHistoryRef.current
      );
      await addMessage(aiResponse, 'ai');
    } catch (error) {
      console.error("AI Assistant Error:", error);
      await addMessage("I apologize, but I'm having trouble processing your request right now. Please try again in a moment.", 'ai');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSmartAction = async (action: string) => {
    if (isLoading || !contextData) return;
    setIsLoading(true);

    let actionText = '';
    let prompt = '';

    try {
      const context = buildComprehensiveContext(contextData);

      switch (action) {
        case 'daily-summary':
          actionText = "Give me my daily summary and insights";
          prompt = `Provide a comprehensive daily summary including tasks, spiritual progress, and actionable insights. Be encouraging and specific.`;
          break;
        case 'spiritual-guidance':
          actionText = "How can I improve my spiritual routine?";
          prompt = `Based on my prayer and Quran reading data, provide personalized spiritual guidance and practical suggestions for improvement.`;
          break;
        case 'productivity-analysis':
          actionText = "Analyze my productivity patterns";
          prompt = `Analyze my task completion patterns, identify bottlenecks, and suggest productivity improvements based on my data.`;
          break;
        case 'weekly-goals':
          actionText = "Help me plan for next week";
          prompt = `Based on my current progress and patterns, help me set realistic and meaningful goals for the upcoming week.`;
          break;
        case 'balance-check':
          actionText = "How's my work-life-spiritual balance?";
          prompt = `Evaluate my overall balance between productivity, personal life, and spiritual growth. Provide insights and suggestions.`;
          break;
        default:
          return;
      }

      await addMessage(actionText, 'user');

      const aiResponse = await GroqService.getEnhancedAiResponse(
        prompt,
        context,
        chatHistoryRef.current
      );

      await addMessage(aiResponse, 'ai');
    } catch (error) {
      console.error(`AI Assistant ${action} Error:`, error);
      await addMessage(`I encountered an issue while ${action.replace('-', ' ')}. Please try again.`, 'ai');
    } finally {
      setIsLoading(false);
    }
  };

  // Trend arrow component
  const TrendArrow = ({ current, previous }: { current: number; previous?: number }) => {
    if (previous === undefined) return null;

    if (current > previous) {
      return (
        <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      );
    } else if (current < previous) {
      return (
        <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
        </svg>
      );
    }
    return (
      <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
      </svg>
    );
  };

  const smartActionButtons = [
    {
      label: "Daily Summary",
      action: () => handleSmartAction('daily-summary'),
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    {
      label: "Spiritual Guidance",
      action: () => handleSmartAction('spiritual-guidance'),
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      )
    },
    {
      label: "Productivity Analysis",
      action: () => handleSmartAction('productivity-analysis'),
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    },
    {
      label: "Weekly Planning",
      action: () => handleSmartAction('weekly-goals'),
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      )
    },
    {
      label: "Balance Check",
      action: () => handleSmartAction('balance-check'),
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
        </svg>
      )
    },
  ];

  if (loadingContext) {
    return (
      <div className="animate-fadeIn h-full flex flex-col items-center justify-center">
        <LoadingSpinner size="lg" text="Noor is analyzing your data..." />
      </div>
    );
  }

  return (
    <div className="animate-fadeIn h-full flex flex-col">
      {/* Header with Noor branding */}
      <div className="mb-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
            <span className="text-2xl">✨</span>
          </div>
          <div>
            <h1 className={`${designSystem.typography.h1} bg-gradient-to-r from-purple-600 to-purple-500 bg-clip-text text-transparent`}>
              Noor AI Assistant
            </h1>
            <p className={`${designSystem.typography.bodySmall} text-slate-600 dark:text-slate-400`}>
              Your intelligent guide for productivity and spiritual growth
            </p>
          </div>
        </div>

        {/* Dynamic Stats Bar - Compact inline display */}
        {contextData && (
          <div className="flex flex-wrap items-center gap-2 p-2 bg-gradient-to-r from-purple-50/50 to-purple-100/50 dark:from-purple-900/10 dark:to-purple-800/10 rounded-lg">
            {/* Tasks Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/80 dark:bg-slate-800/80 rounded-full border border-blue-200 dark:border-blue-700/50 backdrop-blur-sm">
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Tasks:</span>
              </div>
              <span className="text-sm font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
                {contextData.stats.completedTasks}/{contextData.stats.totalTasks}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                ({contextData.stats.completionRate.toFixed(0)}%)
              </span>
              <TrendArrow
                current={contextData.stats.completionRate}
                previous={contextData.stats.completedTasks > 0 ? 50 : undefined}
              />
            </div>

            {/* Prayers Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/80 dark:bg-slate-800/80 rounded-full border border-purple-200 dark:border-purple-700/50 backdrop-blur-sm">
              <div className="flex items-center gap-1">
                <span className="text-sm">🤲</span>
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Prayers:</span>
              </div>
              <span className="text-sm font-bold bg-gradient-to-r from-purple-600 to-purple-500 bg-clip-text text-transparent">
                {contextData.stats.todayPrayers}/5
              </span>
              {contextData.stats.todayPrayers === 5 && (
                <span className="text-xs">✓</span>
              )}
              <TrendArrow
                current={contextData.stats.todayPrayers}
                previous={contextData.stats.previousDayPrayers}
              />
            </div>

            {/* Quran Streak Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/80 dark:bg-slate-800/80 rounded-full border border-emerald-200 dark:border-emerald-700/50 backdrop-blur-sm">
              <div className="flex items-center gap-1">
                <span className="text-sm">📖</span>
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Streak:</span>
              </div>
              <span className="text-sm font-bold bg-gradient-to-r from-emerald-600 to-emerald-500 bg-clip-text text-transparent">
                {contextData.stats.currentStreak}d
              </span>
              {contextData.stats.weeklyQuranPages > 0 && (
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  ({contextData.stats.weeklyQuranPages}p/wk)
                </span>
              )}
              <TrendArrow
                current={contextData.stats.currentStreak}
                previous={contextData.stats.previousStreak}
              />
            </div>
          </div>
        )}
      </div>

      {/* Smart Action Buttons - Improved with icons */}
      <div className="flex flex-wrap gap-2 mb-4">
        {smartActionButtons.map(btn => (
          <button
            key={btn.label}
            onClick={btn.action}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-gradient-to-r hover:from-purple-50 hover:to-purple-100 dark:hover:from-purple-900/20 dark:hover:to-purple-800/20 hover:border-purple-300 dark:hover:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md min-h-[44px]"
            aria-label={btn.label}
          >
            {btn.icon}
            <span>{btn.label}</span>
          </button>
        ))}
      </div>

      {/* Chat Area */}
      <div className="flex-grow bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-4 overflow-y-auto mb-4 flex flex-col" style={{ minHeight: '400px' }}>
        {messages.map(msg => <ChatMessageImproved key={msg.id} message={msg} />)}
        {isLoading && (
          <div className="flex justify-start mb-4">
            <div className="max-w-xs lg:max-w-md px-4 py-3 rounded-xl shadow-md bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-bl-none border border-slate-200 dark:border-slate-600">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <span className="text-sm text-slate-600 dark:text-slate-400">Noor is thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-md border border-slate-200 dark:border-slate-700">
        <div className="flex items-center space-x-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSend()}
            placeholder="Ask Noor anything about your productivity or spiritual journey..."
            className="flex-grow p-3 border-2 border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition bg-transparent dark:text-slate-100 placeholder-slate-400"
            disabled={isLoading}
            aria-label="Chat message input"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || input.trim() === ''}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl min-h-[44px]"
            aria-label="Send message"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

// Utility function for debouncing
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout | null = null;
  return ((...args: any[]) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
}

export default AIAssistantViewImproved;
