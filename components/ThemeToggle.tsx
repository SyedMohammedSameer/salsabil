
import React from 'react';
import { Theme } from '../types';
import { SunIcon, MoonIcon } from './icons/NavIcons';

interface ThemeToggleProps {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, toggleTheme }) => {
  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
      aria-label={theme === Theme.Light ? "Switch to dark mode" : "Switch to light mode"}
    >
      {theme === Theme.Light ? <MoonIcon /> : <SunIcon />}
    </button>
  );
};

export default ThemeToggle;
