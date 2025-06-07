// Enhanced AIAssistantView.tsx with full database access and chat persistence
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Task, ChatMessage as ChatMessageType, DailyPrayerLog, DailyQuranLog, PomodoroSettings } from '../types';
import * as GeminiService from '../services/geminiService';
import * as firebaseService from '../services/firebaseService';
import ChatMessage from './ChatMessage';
import LoadingSpinner from './LoadingSpinner';
import { MOCK_AI_RESPONSES } from '../constants';
import { useAuth } from '../context/AuthContext';

interface AIAssistantViewProps {
  tasks: Task[];
  apiKey: string;
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
  };
}

const AIAssistantView: React.FC<AIAssistantViewProps> = ({ tasks, apiKey }) => {
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
          firebaseService.loadPrayerLogs(),
          firebaseService.loadQuranLogs(),
          firebaseService.loadPomodoroSettings(),
          firebaseService.loadChatHistory()
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
  }, [tasks]);

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

    return {
      totalTasks,
      completedTasks,
      completionRate,
      currentStreak,
      weeklyQuranPages,
      todayPrayers
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
        await firebaseService.saveChatHistory(messages);
      } catch (error) {
        console.error('Error saving chat history:', error);
      }
    }, 2000),
    []
  );

  const handleSend = async () => {
    if (input.trim() === '' || isLoading || !contextData) return;
    
    const userInput = input;
    await addMessage(userInput, 'user');
    setInput('');
    setIsLoading(true);

    try {
      const contextualPrompt = buildComprehensiveContext(contextData);
      const aiResponse = await GeminiService.getEnhancedAiResponse(
        userInput, 
        contextualPrompt,
        chatHistoryRef.current, 
        apiKey
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
      
      const aiResponse = await GeminiService.getEnhancedAiResponse(
        prompt,
        context,
        chatHistoryRef.current,
        apiKey
      );
      
      await addMessage(aiResponse, 'ai');
    } catch (error) {
      console.error(`AI Assistant ${action} Error:`, error);
      await addMessage(`I encountered an issue while ${action.replace('-', ' ')}. Please try again.`, 'ai');
    } finally {
      setIsLoading(false);
    }
  };

  const smartActionButtons = [
    { label: "📊 Daily Summary", action: () => handleSmartAction('daily-summary') },
    { label: "🤲 Spiritual Guidance", action: () => handleSmartAction('spiritual-guidance') },
    { label: "⚡ Productivity Analysis", action: () => handleSmartAction('productivity-analysis') },
    { label: "🎯 Weekly Planning", action: () => handleSmartAction('weekly-goals') },
    { label: "⚖️ Balance Check", action: () => handleSmartAction('balance-check') },
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
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center">
            <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L1.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Noor AI Assistant
            </h1>
            <p className="text-slate-600 dark:text-slate-400">Your intelligent guide for productivity and spiritual growth</p>
          </div>
        </div>
        
        {/* Context Overview */}
        {contextData && (
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className="font-bold text-indigo-600 dark:text-indigo-400">{contextData.stats.completedTasks}/{contextData.stats.totalTasks}</div>
                <div className="text-slate-600 dark:text-slate-400">Tasks</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-purple-600 dark:text-purple-400">{contextData.stats.todayPrayers}/5</div>
                <div className="text-slate-600 dark:text-slate-400">Prayers</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-emerald-600 dark:text-emerald-400">{contextData.stats.currentStreak}</div>
                <div className="text-slate-600 dark:text-slate-400">Day Streak</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-blue-600 dark:text-blue-400">{contextData.stats.weeklyQuranPages}</div>
                <div className="text-slate-600 dark:text-slate-400">Pages</div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Smart Action Buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        {smartActionButtons.map(btn => (
          <button
            key={btn.label}
            onClick={btn.action}
            disabled={isLoading}
            className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Chat Area */}
      <div className="flex-grow bg-white dark:bg-slate-800 rounded-xl shadow-lg p-4 overflow-y-auto mb-4 flex flex-col">
        {messages.map(msg => <ChatMessage key={msg.id} message={msg} />)}
        {isLoading && (
          <div className="flex justify-start mb-4">
            <div className="max-w-xs lg:max-w-md px-4 py-3 rounded-xl shadow bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-bl-none">
              <LoadingSpinner size="sm" text="Noor is thinking..."/>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-md">
        <div className="flex items-center space-x-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSend()}
            placeholder="Ask Noor anything about your productivity or spiritual journey..."
            className="flex-grow p-3 border-2 border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition bg-transparent dark:text-slate-100 placeholder-slate-400"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || input.trim() === ''}
            className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition-all duration-200 shadow-lg hover:shadow-xl"
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

export default AIAssistantView;