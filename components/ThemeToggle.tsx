// Enhanced Theme Toggle with smooth animations and better UX
import React from 'react';
import { Theme } from '../types';
import { SunIcon, MoonIcon } from './icons/NavIcons';

interface ThemeToggleProps {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, toggleTheme }) => {
  const isDark = theme === Theme.Dark;

  return (
    <button
      onClick={toggleTheme}
      className={`relative p-3 rounded-xl transition-all duration-300 ease-in-out transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary group
                  ${isDark 
                    ? 'bg-gradient-to-br from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 text-yellow-400 focus:ring-yellow-400' 
                    : 'bg-gradient-to-br from-yellow-400 to-orange-500 hover:from-yellow-300 hover:to-orange-400 text-white focus:ring-orange-400'
                  } shadow-lg hover:shadow-xl`}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {/* Background glow effect */}
      <div className={`absolute inset-0 rounded-xl blur-lg opacity-30 transition-opacity duration-300 group-hover:opacity-50
                      ${isDark ? 'bg-yellow-400' : 'bg-orange-400'}`}></div>
      
      {/* Icon container with rotation animation */}
      <div className="relative z-10 w-5 h-5 transition-transform duration-500 ease-in-out">
        <div className={`absolute inset-0 transition-all duration-500 ${isDark ? 'rotate-0 opacity-100' : 'rotate-180 opacity-0'}`}>
          <MoonIcon />
        </div>
        <div className={`absolute inset-0 transition-all duration-500 ${isDark ? '-rotate-180 opacity-0' : 'rotate-0 opacity-100'}`}>
          <SunIcon />
        </div>
      </div>
      
      {/* Subtle particles effect */}
      <div className="absolute inset-0 overflow-hidden rounded-xl">
        <div className={`absolute w-1 h-1 rounded-full transition-all duration-1000 ${isDark ? 'bg-yellow-300' : 'bg-orange-200'}`}
             style={{ 
               top: '20%', 
               left: '30%', 
               animationDelay: '0s',
               animation: isDark ? 'twinkle 2s infinite' : 'none'
             }}></div>
        <div className={`absolute w-1 h-1 rounded-full transition-all duration-1000 ${isDark ? 'bg-yellow-400' : 'bg-orange-200'}`}
             style={{ 
               top: '60%', 
               right: '25%', 
               animationDelay: '0.5s',
               animation: isDark ? 'twinkle 2s infinite' : 'none'
             }}></div>
        <div className={`absolute w-1 h-1 rounded-full transition-all duration-1000 ${isDark ? 'bg-yellow-200' : 'bg-orange-200'}`}
             style={{ 
               top: '40%', 
               right: '40%', 
               animationDelay: '1s',
               animation: isDark ? 'twinkle 2s infinite' : 'none'
             }}></div>
      </div>
      

    </button>
  );
};

export default ThemeToggle;