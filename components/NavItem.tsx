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
      className={`flex flex-col md:flex-row items-center justify-center md:justify-start p-2 md:py-2 md:px-3 rounded-lg transition-all duration-200 ease-in-out group
                  w-auto md:w-full 
                  ${isActive 
                    ? 'bg-primary-light dark:bg-primary-dark text-white dark:text-slate-900 font-semibold scale-105 md:scale-100' 
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-primary dark:hover:text-primary-light'
                  }`}
      aria-label={label}
      title={label} 
    >
      <span className="transform transition-transform duration-200 group-hover:scale-110">{icon}</span>
      {/* Label: hidden on xs, inline on sm (mobile horizontal bar), beside icon on md+ (desktop vertical bar) */}
      <span 
        className="mt-1 text-[10px] md:mt-0 md:ml-3 md:text-xs hidden sm:inline md:whitespace-nowrap md:overflow-hidden md:text-ellipsis"
        style={{ maxWidth: 'calc(100% - 36px)' }} // Approx (icon width + margin) to allow ellipsis
      >
        {label}
      </span>
    </button>
  );
};

export default NavItem;
