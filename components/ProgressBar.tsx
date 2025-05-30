
import React from 'react';

interface ProgressBarProps {
  value: number; // 0 to 100
  label?: string;
  color?: string; // Tailwind color class e.g., 'bg-green-500'
}

const ProgressBar: React.FC<ProgressBarProps> = ({ value, label, color = 'bg-primary' }) => {
  const percentage = Math.max(0, Math.min(100, value));

  return (
    <div>
      {label && <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{label} ({percentage.toFixed(0)}%)</p>}
      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
        <div
          className={`${color} h-2.5 rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};

export default ProgressBar;
