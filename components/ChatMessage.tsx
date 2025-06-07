// Updated components/ChatMessage.tsx with Noor branding
import React from 'react';
import { ChatMessage as ChatMessageType } from '../types';

const ChatMessage: React.FC<{ message: ChatMessageType }> = ({ message }) => {
  const isUser = message.sender === 'user';
  
  return (
    <div className={`flex mb-6 animate-fadeIn ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-xs lg:max-w-md px-5 py-4 rounded-2xl shadow-lg transition-all duration-200 hover:shadow-xl ${
        isUser 
          ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-br-md' 
          : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-md border border-slate-200 dark:border-slate-700'
      }`}>
        {/* Avatar and Name */}
        <div className="flex items-center mb-3">
          {!isUser && (
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mr-3 shadow-lg">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L1.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
              </svg>
            </div>
          )}
          {isUser && (
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center mr-3">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/>
              </svg>
            </div>
          )}
          <div className="flex-1">
            <span className={`font-semibold text-sm ${
              isUser 
                ? 'text-white' 
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent'
            }`}>
              {isUser ? 'You' : 'Noor'}
            </span>
            <p className={`text-xs ${
              isUser 
                ? 'text-indigo-100' 
                : 'text-slate-500 dark:text-slate-400'
            }`}>
              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
        
        {/* Message Content */}
        <div className={`prose prose-sm max-w-none ${
          isUser 
            ? 'prose-invert' 
            : 'prose-slate dark:prose-invert'
        }`}>
          <div className="whitespace-pre-wrap leading-relaxed">
            {message.text}
          </div>
        </div>
        
        {/* Message Status Indicators */}
        {!isUser && (
          <div className="flex items-center mt-3 pt-2 border-t border-slate-200 dark:border-slate-600">
            <div className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              AI Assistant
            </span>
          </div>
        )}
        
        {/* Copy Message Button */}
        {!isUser && (
          <button
            onClick={() => {
              navigator.clipboard.writeText(message.text);
              // You could add a toast notification here
            }}
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
            title="Copy message"
          >
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;