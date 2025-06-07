// Enhanced Modal Component with better animations and backdrop
import React, { useEffect, useState } from 'react';
import { CloseIcon } from './icons/NavIcons';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setIsAnimating(true);
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    } else {
      setIsAnimating(false);
      // Restore body scroll
      document.body.style.overflow = 'unset';
      // Hide modal after animation
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl'
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ease-out
                   ${isAnimating ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div 
          className={`relative w-full ${sizeClasses[size]} transform transition-all duration-300 ease-out
                     ${isAnimating 
                       ? 'opacity-100 scale-100 translate-y-0' 
                       : 'opacity-0 scale-95 translate-y-4'
                     }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Content */}
          <div className="relative bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/50 overflow-hidden">
            {/* Gradient Border Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-accent/20 to-secondary/20 p-[1px] rounded-2xl">
              <div className="bg-white dark:bg-slate-800 rounded-2xl h-full w-full" />
            </div>
            
            {/* Content */}
            <div className="relative z-10">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-200/50 dark:border-slate-700/50">
                <div>
                  <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                    {title}
                  </h2>
                  <div className="w-12 h-1 bg-gradient-to-r from-primary to-accent rounded-full mt-2" />
                </div>
                
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-all duration-200 group"
                  aria-label="Close modal"
                >
                  <CloseIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </button>
              </div>
              
              {/* Body */}
              <div className="p-6">
                {children}
              </div>
            </div>
          </div>
          
          {/* Subtle glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10 rounded-2xl blur-xl -z-10 scale-110" />
        </div>
      </div>
      
      {/* Loading dots animation in corners */}
      <div className="fixed top-4 left-4 flex space-x-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`w-2 h-2 bg-primary rounded-full transition-all duration-300
                       ${isAnimating ? 'opacity-60 animate-pulse' : 'opacity-0'}`}
            style={{ animationDelay: `${i * 0.1}s` }}
          />
        ))}
      </div>
      
      <div className="fixed top-4 right-4 flex space-x-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`w-2 h-2 bg-accent rounded-full transition-all duration-300
                       ${isAnimating ? 'opacity-60 animate-pulse' : 'opacity-0'}`}
            style={{ animationDelay: `${i * 0.1 + 0.3}s` }}
          />
        ))}
      </div>
    </div>
  );
};

export default Modal;