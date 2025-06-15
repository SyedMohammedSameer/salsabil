// Mobile-Optimized Modal Component with full-screen mobile support
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
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setIsAnimating(true);
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
      // For iOS Safari
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    } else {
      setIsAnimating(false);
      // Restore body scroll
      document.body.style.overflow = 'unset';
      document.body.style.position = 'unset';
      document.body.style.width = 'unset';
      // Hide modal after animation
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }

    return () => {
      document.body.style.overflow = 'unset';
      document.body.style.position = 'unset';
      document.body.style.width = 'unset';
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
      <div className={`fixed inset-0 flex items-center justify-center ${isMobile ? 'p-0' : 'p-4'}`}>
        <div 
          className={`relative w-full transform transition-all duration-300 ease-out
                     ${isAnimating 
                       ? 'opacity-100 scale-100 translate-y-0' 
                       : 'opacity-0 scale-95 translate-y-4'
                     }
                     ${isMobile 
                       ? 'h-full max-h-full' 
                       : `${sizeClasses[size]} max-h-[90vh]`
                     }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Content */}
          <div className={`relative bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl shadow-2xl border border-white/20 dark:border-slate-700/50 overflow-hidden
                          ${isMobile ? 'h-full rounded-none' : 'rounded-2xl'}`}>
            
            {/* Content */}
            <div className="relative z-10 h-full flex flex-col">
              {/* Header */}
              <div className={`flex items-center justify-between border-b border-slate-200/50 dark:border-slate-700/50 bg-white/50 dark:bg-slate-800/50
                              ${isMobile ? 'p-4 pt-safe' : 'p-6'}`}>
                <div className="flex-1 min-w-0">
                  <h2 className={`font-bold text-slate-800 dark:text-slate-100 truncate
                                 ${isMobile ? 'text-lg' : 'text-xl'}`}>
                    {title}
                  </h2>
                  <div className="w-12 h-1 bg-gradient-to-r from-primary to-accent rounded-full mt-2" />
                </div>
                
                <button
                  onClick={onClose}
                  className={`flex-shrink-0 ml-4 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-all duration-200 group
                             ${isMobile ? 'p-3' : 'p-2'}`}
                  aria-label="Close modal"
                >
                  <CloseIcon className={`group-hover:scale-110 transition-transform ${isMobile ? 'w-6 h-6' : 'w-5 h-5'}`} />
                </button>
              </div>
              
              {/* Body */}
              <div className={`flex-1 overflow-y-auto ${isMobile ? 'p-4 pb-safe' : 'p-6'}`}>
                {children}
              </div>
            </div>
          </div>
          
          {/* Subtle glow effect */}
          {!isMobile && (
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10 rounded-2xl blur-xl -z-10 scale-110" />
          )}
        </div>
      </div>
      
      {/* Loading dots animation in corners (desktop only) */}
      {!isMobile && (
        <>
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
        </>
      )}
    </div>
  );
};

export default Modal;