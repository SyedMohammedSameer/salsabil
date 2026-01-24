// ChatMessageImproved.tsx - Redesigned with Design System
import React, { useState } from 'react';
import { ChatMessage as ChatMessageType } from '../types';
import { designSystem } from '../utils/designSystem';

interface ChatMessageProps {
  message: ChatMessageType;
}

const ChatMessageImproved: React.FC<ChatMessageProps> = ({ message }) => {
  const [copied, setCopied] = useState(false);
  const isUser = message.sender === 'user';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <div className={`flex mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`
        group relative max-w-xs lg:max-w-md
        ${designSystem.componentSpacing.cardPadding}
        ${designSystem.borderRadius.lg}
        ${designSystem.shadows.sm}
        ${designSystem.transitions.base}
        hover:shadow-md
        ${isUser
          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-md'
          : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border ' + designSystem.semanticColors.borderLight + ' rounded-bl-md'
        }
      `}>

        {/* Avatar and Header */}
        <div className="flex items-center mb-3">
          {/* Avatar */}
          <div className={`
            w-8 h-8 ${designSystem.borderRadius.full}
            flex items-center justify-center mr-3
            ${designSystem.shadows.sm}
            ${isUser
              ? 'bg-white/20'
              : 'bg-gradient-to-br from-purple-500 to-purple-600'
            }
          `}>
            {isUser ? (
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/>
              </svg>
            ) : (
              <span className="text-lg">✨</span>
            )}
          </div>

          {/* Name and Timestamp */}
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <span className={`
                ${designSystem.typography.label}
                ${isUser
                  ? 'text-white'
                  : 'bg-gradient-to-r from-purple-600 to-purple-500 bg-clip-text text-transparent'
                }
              `}>
                {isUser ? 'You' : 'Noor'}
              </span>
              <span className={`
                ${designSystem.typography.bodySmall}
                ${isUser
                  ? 'text-blue-100'
                  : 'text-slate-500 dark:text-slate-400'
                }
              `}>
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>

          {/* Copy Button (Noor messages only) */}
          {!isUser && (
            <button
              onClick={handleCopy}
              className={`
                opacity-0 group-hover:opacity-100
                ${designSystem.transitions.opacity}
                p-1.5 ${designSystem.borderRadius.sm}
                hover:bg-slate-100 dark:hover:bg-slate-700
                ${designSystem.a11y.focusVisible}
              `}
              aria-label="Copy message"
              title={copied ? "Copied!" : "Copy message"}
            >
              {copied ? (
                <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          )}
        </div>

        {/* Message Content */}
        <div className={`
          ${designSystem.typography.body}
          ${isUser ? 'text-white' : ''}
        `}>
          <div className="whitespace-pre-wrap leading-relaxed">
            {message.text}
          </div>
        </div>

        {/* AI Indicator (Noor only) */}
        {!isUser && (
          <div className={`
            flex items-center mt-3 pt-3
            border-t ${designSystem.semanticColors.borderLight}
          `}>
            <div className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse"></div>
            <span className={`${designSystem.typography.bodySmall} ${designSystem.semanticColors.textMuted}`}>
              AI Assistant
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessageImproved;
