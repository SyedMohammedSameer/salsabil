
import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendText?: string;
  children?: React.ReactNode; // For more complex content like small charts
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, trend, trendText, children }) => {
  const trendColor = trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-red-500' : 'text-slate-500';
  const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '';

  return (
    <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-lg transition-all hover:shadow-xl">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{title}</h3>
        {icon && <span className="text-primary dark:text-primary-light">{icon}</span>}
      </div>
      <p className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">{value}</p>
      {children}
      {trend && trendText && (
        <p className={`text-xs ${trendColor} flex items-center`}>
          <span className="mr-1">{trendIcon}</span>
          {trendText}
        </p>
      )}
    </div>
  );
};

export default StatCard;
