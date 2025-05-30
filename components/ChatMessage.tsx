
import React from 'react';
import { ChatMessage as ChatMessageType } from '../types';
import { AssistantIcon } from './icons/NavIcons'; // Reusing for AI avatar

const ChatMessage: React.FC<{ message: ChatMessageType }> = ({ message }) => {
  const isUser = message.sender === 'user';
  return (
    <div className={`flex mb-4 animate-fadeIn ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-xl shadow ${
        isUser 
          ? 'bg-primary text-white rounded-br-none' 
          : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-bl-none'
      }`}>
        <div className="flex items-center mb-1">
          {!isUser && <AssistantIcon />}
          <span className={`text-xs font-medium ml-2 ${isUser ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'}`}>
            {isUser ? 'You' : 'AI Assistant'}
          </span>
        </div>
        <p className="text-sm whitespace-pre-wrap">{message.text}</p>
        <p className={`text-xs mt-1 text-right ${isUser ? 'text-blue-200' : 'text-slate-400 dark:text-slate-500'}`}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
};

export default ChatMessage;
