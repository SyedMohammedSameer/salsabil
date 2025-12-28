// Beautiful, Professional NavItem Component
import React, { useState, useEffect } from 'react';

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
  isCollapsed?: boolean;
  hasActiveTimer?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, isActive, onClick, isCollapsed = false, hasActiveTimer = false }) => {
  const [isMobile, setIsMobile] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleTouchStart = () => {
    if (isMobile) setIsPressed(true);
  };

  const handleTouchEnd = () => {
    if (isMobile) setIsPressed(false);
  };

  const handleClick = () => {
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
                    : `p-3 rounded-xl hover:scale-[1.02] ${isCollapsed ? 'justify-center' : 'justify-start'}`
                  }
                  ${isActive
                    ? 'bg-gradient-to-r from-blue-500 via-cyan-500 to-emerald-500 text-white shadow-lg shadow-blue-500/30 dark:shadow-blue-500/20'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700/70 hover:text-blue-600 dark:hover:text-blue-400 hover:shadow-md border border-transparent hover:border-blue-200/50 dark:hover:border-blue-800/50'
                  }`}
      aria-label={label}
      title={isCollapsed ? label : undefined}
    >
      {/* Animated background for active state */}
      {isActive && (
        <div className="absolute inset-0 bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 animate-pulse opacity-20"></div>
      )}

      {/* Active timer pulse indicator */}
      {hasActiveTimer && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full shadow-lg">
          <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-75"></div>
        </div>
      )}

      {/* Icon */}
      <div className={`relative z-10 transform transition-all duration-300 group-hover:scale-110 flex-shrink-0 flex items-center justify-center w-6 h-6
                      ${isActive ? 'text-white' : 'text-slate-600 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400'}
                      ${isMobile ? 'mr-4' : (isCollapsed ? 'mx-auto' : 'mr-3')}`}>
        {icon}
      </div>

      {/* Label */}
      {(!isCollapsed || isMobile) && (
        <span className={`relative z-10 font-semibold transition-all duration-300 ${isMobile ? 'text-base' : 'text-sm'}
                         ${isActive ? 'text-white' : 'text-slate-700 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400'}`}>
          {label}
        </span>
      )}

      {/* Active indicator bar */}
      {isActive && !isMobile && (
        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-white rounded-r-full shadow-lg"></div>
      )}

      {/* Hover glow effect */}
      <div className={`absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 blur-xl
                      ${isMobile ? (isPressed ? 'opacity-10' : 'opacity-0') : 'group-hover:opacity-10'}
                      ${isActive ? 'bg-white' : 'bg-blue-500'}`}>
      </div>
    </button>
  );
};

export default NavItem;
