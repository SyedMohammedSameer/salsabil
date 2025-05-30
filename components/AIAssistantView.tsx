
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Task, ChatMessage as ChatMessageType } from '../types';
import * as GeminiService from '../services/geminiService';
import ChatMessage from './ChatMessage';
import LoadingSpinner from './LoadingSpinner';
import { MOCK_AI_RESPONSES } from '../constants';

interface AIAssistantViewProps {
  tasks: Task[];
  apiKey: string;
}

const AIAssistantView: React.FC<AIAssistantViewProps> = ({ tasks, apiKey }) => {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatHistoryRef = useRef<{role: string, parts: {text: string}[]}[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);
  
  useEffect(() => {
    // Initial greeting or check if API key is set
    if (!apiKey && messages.length === 0) {
      const greetingMessage: ChatMessageType = {
        id: Date.now().toString(),
        text: MOCK_AI_RESPONSES.NO_KEY + "\nI can still help with predefined actions using mock data, or you can ask general questions (mocked).",
        sender: 'ai',
        timestamp: new Date(),
      };
      setMessages([greetingMessage]);
    } else if (apiKey && messages.length === 0) {
       const greetingMessage: ChatMessageType = {
        id: Date.now().toString(),
        text: "Hello! I'm your AI Assistant. How can I help you plan or summarize your progress today?",
        sender: 'ai',
        timestamp: new Date(),
      };
      setMessages([greetingMessage]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey]);


  const addMessage = (text: string, sender: 'user' | 'ai') => {
    const newMessage: ChatMessageType = {
      id: Date.now().toString(),
      text,
      sender,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
    if (sender === 'user') {
      chatHistoryRef.current.push({role: 'user', parts: [{text}]});
    } else {
      chatHistoryRef.current.push({role: 'model', parts: [{text}]});
    }
  };

  const handleSend = async () => {
    if (input.trim() === '' || isLoading) return;
    const userInput = input;
    addMessage(userInput, 'user');
    setInput('');
    setIsLoading(true);

    try {
      const aiResponse = await GeminiService.getAiChatResponse(userInput, tasks, chatHistoryRef.current, apiKey);
      addMessage(aiResponse, 'ai');
    } catch (error) {
      console.error("AI Assistant Error:", error);
      addMessage("Sorry, I encountered an error. Please try again.", 'ai');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePredefinedAction = async (action: 'summarize' | 'suggest' | 'focus') => {
    if (isLoading) return;
    setIsLoading(true);
    let actionText = '';
    let aiResponse = '';

    try {
      if (action === 'summarize') {
        actionText = "Summarize my weekly progress.";
        addMessage(actionText, 'user');
        aiResponse = await GeminiService.summarizeWeeklyProgress(tasks, apiKey);
      } else if (action === 'suggest') {
        actionText = "Suggest next steps for me.";
        addMessage(actionText, 'user');
        aiResponse = await GeminiService.suggestNextSteps(tasks, apiKey);
      } else if (action === 'focus') {
        actionText = "What should I focus on tomorrow?";
        addMessage(actionText, 'user');
        aiResponse = await GeminiService.getFocusSuggestion(tasks, apiKey);
      }
      addMessage(aiResponse, 'ai');
    } catch (error) {
      console.error(`AI Assistant ${action} Error:`, error);
      addMessage(`Sorry, I couldn't ${action}. Please try again.`, 'ai');
    } finally {
      setIsLoading(false);
    }
  };
  
  const quickActionButtons = [
    { label: "Summarize Progress", action: () => handlePredefinedAction('summarize')},
    { label: "Suggest Next Steps", action: () => handlePredefinedAction('suggest')},
    { label: "Focus for Tomorrow?", action: () => handlePredefinedAction('focus')},
  ];

  return (
    <div className="animate-fadeIn h-full flex flex-col">
      <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-6">AI Assistant</h1>
      
      <div className="flex space-x-2 mb-4 flex-wrap">
        {quickActionButtons.map(btn => (
          <button
            key={btn.label}
            onClick={btn.action}
            disabled={isLoading}
            className="px-3 py-1.5 bg-secondary-light dark:bg-secondary text-white dark:text-slate-900 rounded-lg text-sm hover:bg-secondary-dark dark:hover:bg-secondary-dark focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-opacity-50 disabled:opacity-50 mb-2"
          >
            {btn.label}
          </button>
        ))}
      </div>

      <div className="flex-grow bg-white dark:bg-slate-800 rounded-xl shadow-lg p-4 overflow-y-auto mb-4 flex flex-col">
        {messages.map(msg => <ChatMessage key={msg.id} message={msg} />)}
        {isLoading && (
          <div className="flex justify-start mb-4">
             <div className="max-w-xs lg:max-w-md px-4 py-3 rounded-xl shadow bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-bl-none">
                <LoadingSpinner size="sm" text="AI is thinking..."/>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="mt-auto bg-white dark:bg-slate-800 p-3 rounded-xl shadow-md">
        <div className="flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSend()}
            placeholder="Ask your AI assistant..."
            className="flex-grow p-3 border-2 border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition bg-transparent dark:text-slate-100"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || input.trim() === ''}
            className="ml-3 px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50 disabled:opacity-50 transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIAssistantView;
