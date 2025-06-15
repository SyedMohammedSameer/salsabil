// Mobile-Optimized NavItem with touch-friendly design
import React, { useState, useEffect } from 'react';

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
  isCollapsed?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, isActive, onClick, isCollapsed = false }) => {
  const [isMobile, setIsMobile] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Touch event handlers for mobile
  const handleTouchStart = () => {
    if (isMobile) {
      setIsPressed(true);
    }
  };

  const handleTouchEnd = () => {
    if (isMobile) {
      setIsPressed(false);
    }
  };

  const handleClick = () => {
    // Add haptic feedback for mobile if available
    if (isMobile && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }
    onClick();
  };

  return (
          <button
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className={`relative group flex items-center w-full overflow-hidden transition-all duration-300 ease-out touch-manipulation
                  ${isMobile 
                    ? `min-h-touch p-4 rounded-xl ${isPressed ? 'scale-95' : 'scale-100'} active:scale-95 justify-start` 
                    : `p-3 md:py-3 md:px-4 rounded-xl hover:scale-105 ${isCollapsed ? 'justify-center' : 'justify-start'}`
                  }
                  ${isActive 
                    ? 'bg-gradient-to-r from-primary to-primary-dark text-white shadow-lg shadow-primary/25' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-white/70 dark:hover:bg-slate-700/70 hover:text-primary dark:hover:text-primary-light hover:shadow-lg'
                  }`}
      aria-label={label}
      title={isCollapsed ? label : undefined}
    >
      {/* Animated background gradient for active state */}
      {isActive && (
        <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary-light to-primary animate-gradient-x opacity-20"></div>
      )}
      
      {/* Icon container with enhanced styling */}
      <div className={`relative z-10 transform transition-all duration-300 group-hover:scale-110 flex-shrink-0
                      ${isActive ? 'text-white' : ''}
                      ${isMobile ? 'mr-4' : (isCollapsed ? 'mx-auto' : 'md:mr-3')}`}>
        {icon}
      </div>
      
      {/* Label with improved typography and responsive behavior */}
      {(!isMobile && !isCollapsed) && (
        <span className={`relative z-10 font-medium transition-all duration-300 group-hover:tracking-wide text-sm
                         ${isActive ? 'text-white font-semibold' : ''}`}>
          {label}
        </span>
      )}
      
      {/* Mobile label */}
      {isMobile && (
        <span className={`relative z-10 font-medium transition-all duration-300 group-hover:tracking-wide text-base
                         ${isActive ? 'text-white font-semibold' : ''}`}>
          {label}
        </span>
      )}
      
      {/* Active indicator for enhanced feedback */}
      {isActive && (
        <>
          {/* Dot indicator */}
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full shadow-lg animate-pulse"></div>
          
          {/* Side accent bar for desktop */}
          {!isMobile && (
            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-white rounded-r-full"></div>
          )}
        </>
      )}
      
      {/* Subtle glow effect on hover/press */}
      <div className={`absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 blur-xl
                      ${isMobile 
                        ? isPressed ? 'opacity-20' : 'opacity-0'
                        : 'group-hover:opacity-20'
                      }
                      ${isActive ? 'bg-white' : 'bg-primary'}`}></div>
      
      {/* Touch ripple effect for mobile */}
      {isMobile && isPressed && (
        <div className="absolute inset-0 bg-current opacity-10 rounded-xl animate-ripple"></div>
      )}
    </button>
  );
};

export default NavItem;