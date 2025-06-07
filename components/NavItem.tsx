// Enhanced NavItem with better styling and responsiveness
import React from 'react';

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, isActive, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`relative group flex flex-col md:flex-row items-center justify-center md:justify-start p-3 md:py-3 md:px-4 rounded-xl transition-all duration-300 ease-out
                  w-full overflow-hidden
                  ${isActive 
                    ? 'bg-gradient-to-r from-primary to-primary-dark text-white shadow-lg shadow-primary/25 scale-105' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-white/70 dark:hover:bg-slate-700/70 hover:text-primary dark:hover:text-primary-light hover:shadow-lg hover:scale-105'
                  }`}
      aria-label={label}
      title={label}
    >
      {/* Animated background gradient for active state */}
      {isActive && (
        <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary-light to-primary animate-gradient-x opacity-20"></div>
      )}
      
      {/* Icon container with enhanced styling */}
      <div className={`relative z-10 transform transition-all duration-300 group-hover:scale-110 ${isActive ? 'text-white' : ''}`}>
        {icon}
      </div>
      
      {/* Label with improved typography and responsive behavior */}
      <span className={`relative z-10 mt-1 text-[10px] md:mt-0 md:ml-3 md:text-sm font-medium hidden sm:inline md:block transition-all duration-300
                       ${isActive ? 'text-white font-semibold' : ''}
                       group-hover:tracking-wide`}>
        {label}
      </span>
      
      {/* Active indicator dot for mobile */}
      {isActive && (
        <div className="absolute -top-1 -right-1 md:hidden w-3 h-3 bg-white rounded-full shadow-lg animate-pulse"></div>
      )}
      
      {/* Subtle glow effect on hover */}
      <div className={`absolute inset-0 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity duration-300
                      ${isActive ? 'bg-white' : 'bg-primary'} blur-xl`}></div>
    </button>
  );
};

export default NavItem;