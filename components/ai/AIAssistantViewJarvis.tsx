// AIAssistantViewJarvis.tsx — Noor 2.0 Jarvis-style AI Interface
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Task, ChatMessage as ChatMessageType, NoorState, AIAction, AIActionResult } from '../../types';
import * as GroqService from '../../services/groqService';
import * as firebaseService from '../../services/firebaseService';
import { useAuth } from '../../context/AuthContext';
import JarvisOrb from './JarvisOrb';
import NoorAmbientBackground from './NoorAmbientBackground';
import ActionConfirmation from './ActionConfirmation';

interface AIAssistantViewJarvisProps {
  tasks: Task[];
}

// Voice recognition hook
const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = false;
    recognitionRef.current.lang = 'en-US';

    recognitionRef.current.onresult = (event: any) => {
      setTranscript(event.results[0][0].transcript);
      setIsListening(false);
    };

    recognitionRef.current.onerror = () => setIsListening(false);
    recognitionRef.current.onend = () => setIsListening(false);

    return () => { if (recognitionRef.current) recognitionRef.current.stop(); };
  }, []);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setTranscript('');
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  return { isListening, transcript, startListening, stopListening };
};

// Text-to-speech
const speakText = (text: string, onComplete?: () => void) => {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.95;
  utterance.pitch = 1.0;
  utterance.lang = 'en-US';
  utterance.onend = () => onComplete?.();
  window.speechSynthesis.speak(utterance);
};

// Parse actions from AI response
const parseActionsFromResponse = (response: string): { text: string; actions: AIAction[] } => {
  const actionRegex = /\[ACTION:(\w+)\|(\{[^}]+\})\]/g;
  const actions: AIAction[] = [];
  let match;

  while ((match = actionRegex.exec(response)) !== null) {
    try {
      const type = match[1] as AIAction['type'];
      const params = JSON.parse(match[2]);
      const description = generateActionDescription(type, params);
      actions.push({ type, params, confidence: 0.9, description });
    } catch (e) {
      // Skip malformed actions
    }
  }

  const text = response.replace(actionRegex, '').trim();
  return { text, actions };
};

const generateActionDescription = (type: string, params: Record<string, any>): string => {
  switch (type) {
    case 'createTask': return `Create task: "${params.title}" (${params.priority || 'Medium'} priority${params.date ? `, due ${params.date}` : ''})`;
    case 'completeTask': return `Mark "${params.taskId}" as complete`;
    case 'rescheduleTask': return `Reschedule "${params.taskId}" to ${params.newDate}`;
    case 'logPrayer': return `Log ${params.prayer} prayer (${params.type || 'fardh'})`;
    case 'logQuranPages': return `Log ${params.pages} Quran pages read`;
    case 'startPomodoro': return `Start ${params.duration || 25}-minute focus session`;
    case 'createStudyRoom': return `Create a study room`;
    default: return `Execute: ${type}`;
  }
};

// Debounce utility
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout | null = null;
  return ((...args: any[]) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
}

const AIAssistantViewJarvis: React.FC<AIAssistantViewJarvisProps> = ({ tasks }) => {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [noorState, setNoorState] = useState<NoorState>('idle');
  const [contextString, setContextString] = useState('');
  const [memoriesString, setMemoriesString] = useState('');
  const [loadingContext, setLoadingContext] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [pendingActions, setPendingActions] = useState<AIAction[]>([]);
  const [actionResults, setActionResults] = useState<AIActionResult[]>([]);

  const chatHistoryRef = useRef<{role: string, parts: {text: string}[]}[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { isListening, transcript, startListening, stopListening } = useSpeechRecognition();

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(scrollToBottom, [messages]);

  // Load context and memories on mount
  useEffect(() => {
    const loadData = async () => {
      if (!currentUser) return;
      setLoadingContext(true);

      try {
        const [prayerLogs, quranLogs, pomodoroSettings, chatHistory] = await Promise.all([
          firebaseService.loadPrayerLogs(currentUser.uid),
          firebaseService.loadQuranLogs(currentUser.uid),
          firebaseService.loadPomodoroSettings(currentUser.uid),
          firebaseService.loadChatHistory(currentUser.uid)
        ]);

        // Build context string
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(t => t.completed).length;
        const completionRate = totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : '0';
        const overdueTasks = tasks.filter(t => !t.completed && new Date(t.date) < new Date()).length;

        // Today's prayers
        const todayStr = new Date().toISOString().split('T')[0];
        const todayPrayerLog = prayerLogs.find((l: any) => l.date === todayStr);
        const todayPrayers = todayPrayerLog
          ? Object.values(todayPrayerLog.prayers).filter((p: any) => p?.fardh).length
          : 0;

        // Quran streak
        let quranStreak = 0;
        for (let i = 0; i < 30; i++) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const ds = d.toISOString().split('T')[0];
          const log = quranLogs.find((l: any) => l.date === ds);
          if (log?.readQuran) quranStreak++;
          else if (i === 0) continue;
          else break;
        }

        const weeklyPages = quranLogs
          .filter((l: any) => {
            const d = new Date(l.date);
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return d >= weekAgo;
          })
          .reduce((sum: number, l: any) => sum + (l.pagesRead || 0), 0);

        const ctx = `=== TASKS & PRODUCTIVITY ===
Total Tasks: ${totalTasks} | Completed: ${completedTasks} | Rate: ${completionRate}% | Overdue: ${overdueTasks}
Recent Tasks:
${tasks.slice(-8).map(t => `  ${t.completed ? '[Done]' : '[Pending]'} ${t.title} (${t.priority}, ${t.date})`).join('\n')}

=== SPIRITUAL PROGRESS ===
Today's Prayers: ${todayPrayers}/5 completed
Quran Streak: ${quranStreak} days | Weekly Pages: ${weeklyPages}
Recent Prayer Logs: ${prayerLogs.slice(-5).map((log: any) =>
  `${log.date}: ${Object.values(log.prayers).filter((p: any) => p?.fardh).length}/5`
).join(', ')}

=== FOCUS SETTINGS ===
Pomodoro: ${pomodoroSettings.workDuration}min work, ${pomodoroSettings.shortBreakDuration}min break

=== CURRENT TIME ===
${new Date().toLocaleString()} (${new Date().toLocaleDateString('en-US', { weekday: 'long' })})`;

        setContextString(ctx);

        // TODO: Load memories when aiMemoryService is wired up
        // For now, set empty
        setMemoriesString('');

        // Load chat history
        if (chatHistory.length > 0) {
          setMessages(chatHistory);
          chatHistoryRef.current = chatHistory.map((msg: ChatMessageType) => ({
            role: msg.sender === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }]
          }));
        } else {
          const greeting: ChatMessageType = {
            id: Date.now().toString(),
            text: getSmartGreeting(totalTasks, completedTasks, todayPrayers, quranStreak),
            sender: 'ai',
            timestamp: new Date(),
          };
          setMessages([greeting]);
        }
      } catch (error) {
        console.error('Error loading AI context:', error);
        setMessages([{
          id: Date.now().toString(),
          text: "Assalamu Alaikum! I'm Noor, your AI companion. I'm having trouble loading your data right now, but I'm here to help with whatever you need.",
          sender: 'ai',
          timestamp: new Date(),
        }]);
      } finally {
        setLoadingContext(false);
      }
    };

    loadData();
  }, [currentUser, tasks]);

  // Auto-submit voice transcript
  useEffect(() => {
    if (transcript && !isListening) {
      setInput(transcript);
      setTimeout(() => {
        if (transcript) handleSend(transcript);
      }, 300);
    }
  }, [transcript, isListening]);

  // Update noor state based on listening
  useEffect(() => {
    if (isListening) setNoorState('listening');
    else if (noorState === 'listening') setNoorState('idle');
  }, [isListening]);

  const getSmartGreeting = (totalTasks: number, completed: number, prayers: number, streak: number): string => {
    const hour = new Date().getHours();
    const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : hour < 21 ? 'Good evening' : 'Assalamu Alaikum';

    const insights: string[] = [];
    if (totalTasks > 0) {
      const rate = Math.round((completed / totalTasks) * 100);
      insights.push(`You've completed ${completed} of ${totalTasks} tasks (${rate}%)`);
    }
    if (prayers > 0) insights.push(`${prayers}/5 prayers logged today`);
    if (streak > 1) insights.push(`${streak}-day Quran reading streak going strong`);

    const insightText = insights.length > 0 ? insights.join('. ') + '.' : "Let's make today count.";

    return `${timeGreeting}! I'm Noor, your AI companion.\n\n${insightText}\n\nHow can I help you today?`;
  };

  const saveMessagesToFirebase = useCallback(
    debounce(async (msgs: ChatMessageType[]) => {
      try {
        await firebaseService.saveChatHistory(currentUser?.uid || null, msgs);
      } catch (error) {
        console.error('Error saving chat history:', error);
      }
    }, 2000),
    [currentUser]
  );

  const addMessage = (text: string, sender: 'user' | 'ai') => {
    const msg: ChatMessageType = {
      id: Date.now().toString() + Math.random(),
      text,
      sender,
      timestamp: new Date(),
    };

    setMessages(prev => {
      const updated = [...prev, msg];
      saveMessagesToFirebase(updated);
      return updated;
    });

    chatHistoryRef.current.push({
      role: sender === 'user' ? 'user' : 'model',
      parts: [{ text }]
    });
  };

  const handleActionConfirm = async (action: AIAction) => {
    setPendingActions(prev => prev.filter(a => a !== action));

    try {
      // Dynamic import to avoid circular dependency
      const actionService = await import('../../services/aiActionService');
      const result = await actionService.executeAction(currentUser?.uid || '', action);
      setActionResults(prev => [...prev, result]);

      // Clear results after 5 seconds
      setTimeout(() => {
        setActionResults(prev => prev.filter(r => r !== result));
      }, 5000);
    } catch (error) {
      setActionResults(prev => [...prev, {
        success: false,
        message: 'Failed to execute action',
        action,
      }]);
    }
  };

  const handleActionDismiss = (action: AIAction) => {
    setPendingActions(prev => prev.filter(a => a !== action));
  };

  const handleSend = async (overrideInput?: string) => {
    const text = overrideInput || input;
    if (text.trim() === '' || isLoading) return;

    addMessage(text, 'user');
    setInput('');
    setIsLoading(true);
    setNoorState('thinking');

    try {
      const aiResponse = await GroqService.getEnhancedAiResponse(
        text,
        contextString,
        chatHistoryRef.current,
        memoriesString || undefined,
      );

      // Parse actions from response
      const { text: cleanText, actions } = parseActionsFromResponse(aiResponse);

      setNoorState('speaking');
      addMessage(cleanText, 'ai');

      if (actions.length > 0) {
        setPendingActions(prev => [...prev, ...actions]);
        setNoorState('acting');
      }

      // Voice output
      if (voiceEnabled) {
        speakText(cleanText, () => setNoorState('idle'));
      } else {
        setTimeout(() => setNoorState('idle'), 1500);
      }

    } catch (error) {
      console.error("AI Error:", error);
      addMessage("I'm having trouble right now. Please try again in a moment.", 'ai');
      setNoorState('idle');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSmartAction = async (actionType: string) => {
    if (isLoading) return;

    const prompts: Record<string, { display: string; prompt: string }> = {
      'morning-briefing': {
        display: "Give me my morning briefing",
        prompt: "Provide a comprehensive morning briefing. Cover my tasks for today, spiritual progress (prayers, Quran), any active challenges, and give me an actionable plan for the day. Be specific with my data."
      },
      'evening-reflection': {
        display: "Evening reflection time",
        prompt: "Guide me through an evening reflection. Summarize what I accomplished today, spiritual progress, what went well, what I can improve tomorrow. End with an encouraging dua or reminder."
      },
      'plan-my-week': {
        display: "Help me plan my week",
        prompt: "Based on my current tasks, goals, and patterns, help me plan for this week. Suggest task priorities, spiritual goals, and focus time allocation. Create tasks for me if needed."
      },
      'spiritual-check': {
        display: "How's my spiritual journey?",
        prompt: "Analyze my spiritual progress — prayer consistency, Quran reading streak, patterns over time. Give honest, caring feedback and specific suggestions for improvement."
      },
      'productivity-boost': {
        display: "I need a productivity boost",
        prompt: "I need help being more productive right now. Look at my pending tasks, suggest what to tackle first, and offer to start a Pomodoro session for me. Be direct and actionable."
      },
    };

    const action = prompts[actionType];
    if (!action) return;

    setInput('');
    await handleSend(action.display);
  };

  const smartActions = [
    { key: 'morning-briefing', label: 'Briefing', icon: '🌅' },
    { key: 'evening-reflection', label: 'Reflect', icon: '🌙' },
    { key: 'plan-my-week', label: 'Plan Week', icon: '📋' },
    { key: 'spiritual-check', label: 'Spiritual', icon: '🤲' },
    { key: 'productivity-boost', label: 'Focus', icon: '⚡' },
  ];

  if (loadingContext) {
    return (
      <NoorAmbientBackground state="idle">
        <div className="flex flex-col items-center justify-center h-full gap-6">
          <JarvisOrb state="thinking" size="lg" />
          <p className="text-noor-300 text-sm animate-pulse">Noor is loading your data...</p>
        </div>
      </NoorAmbientBackground>
    );
  }

  return (
    <NoorAmbientBackground state={noorState}>
      <div className="flex flex-col h-full max-h-full">
        {/* Header with Orb */}
        <div className="flex flex-col items-center pt-4 pb-2 flex-shrink-0">
          <JarvisOrb
            state={noorState}
            size="md"
            onClick={() => {
              if (isListening) stopListening();
              else startListening();
            }}
          />
          <motion.p
            key={noorState}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs text-noor-400 mt-2 capitalize"
          >
            {noorState === 'idle' ? 'Tap the orb to speak' : noorState === 'listening' ? 'Listening...' : noorState === 'thinking' ? 'Thinking...' : noorState === 'speaking' ? 'Speaking...' : 'Executing...'}
          </motion.p>
        </div>

        {/* Smart Action Bar */}
        <div className="flex gap-2 px-4 py-2 overflow-x-auto flex-shrink-0 scrollbar-none">
          {smartActions.map(a => (
            <button
              key={a.key}
              onClick={() => handleSmartAction(a.key)}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/60 border border-noor-700/20 text-noor-300 text-xs font-medium whitespace-nowrap hover:bg-noor-900/60 hover:border-noor-600/40 hover:text-noor-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>{a.icon}</span>
              <span>{a.label}</span>
            </button>
          ))}
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent" style={{ minHeight: 0 }}>
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i === messages.length - 1 ? 0.1 : 0 }}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] lg:max-w-[70%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.sender === 'user'
                      ? 'bg-noor-600/80 text-white rounded-br-md'
                      : 'bg-slate-800/70 text-slate-200 border border-noor-700/20 rounded-bl-md shadow-lg shadow-noor-900/20'
                  }`}
                >
                  {msg.sender === 'ai' && (
                    <span className="text-noor-400 text-xs font-medium block mb-1">Noor</span>
                  )}
                  {msg.text}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Thinking indicator */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-slate-800/70 border border-noor-700/20">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-noor-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-noor-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-noor-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-xs text-noor-500">Noor is thinking...</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Action confirmations */}
          <ActionConfirmation
            actions={pendingActions}
            results={actionResults}
            onConfirm={handleActionConfirm}
            onDismiss={handleActionDismiss}
            isExecuting={false}
          />

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="flex-shrink-0 p-4 bg-slate-900/80 backdrop-blur-xl border-t border-noor-800/30">
          {/* Voice indicator */}
          <AnimatePresence>
            {isListening && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center justify-center gap-2 pb-3 text-xs text-red-400"
              >
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                Listening... tap orb or press Stop to finish
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center gap-2">
            {/* Mic button */}
            <button
              onClick={isListening ? stopListening : startListening}
              className={`p-3 rounded-xl transition-all flex-shrink-0 ${
                isListening
                  ? 'bg-red-500/80 text-white animate-pulse'
                  : 'bg-slate-800 text-noor-400 hover:bg-slate-700 hover:text-noor-300'
              }`}
              aria-label={isListening ? 'Stop listening' : 'Voice input'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isListening ? (
                  <rect x="6" y="6" width="12" height="12" rx="2" strokeWidth={2} />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                )}
              </svg>
            </button>

            {/* Text input */}
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleSend()}
              placeholder={isListening ? "Listening..." : "Ask Noor anything..."}
              className="flex-1 p-3 bg-slate-800/80 border border-noor-800/30 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-noor-600/50 focus:ring-1 focus:ring-noor-600/30 transition-all text-sm"
              disabled={isLoading || isListening}
            />

            {/* Voice toggle */}
            <button
              onClick={() => {
                setVoiceEnabled(!voiceEnabled);
                if (voiceEnabled) window.speechSynthesis.cancel();
              }}
              className={`p-3 rounded-xl transition-all flex-shrink-0 ${
                voiceEnabled
                  ? 'bg-noor-600/80 text-white'
                  : 'bg-slate-800 text-slate-500 hover:bg-slate-700 hover:text-slate-400'
              }`}
              aria-label={voiceEnabled ? 'Disable voice' : 'Enable voice'}
              title={voiceEnabled ? 'Voice ON' : 'Voice OFF'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {voiceEnabled ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zM17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                )}
              </svg>
            </button>

            {/* Send button */}
            <button
              onClick={() => handleSend()}
              disabled={isLoading || input.trim() === ''}
              className="p-3 bg-gradient-to-r from-noor-600 to-noor-500 text-white rounded-xl font-medium hover:from-noor-500 hover:to-noor-400 focus:outline-none focus:ring-2 focus:ring-noor-500/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-noor-900/30 flex-shrink-0"
              aria-label="Send message"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </NoorAmbientBackground>
  );
};

export default AIAssistantViewJarvis;
