
import React, { useMemo, useEffect, useState } from 'react';
import { Task, Priority } from '../types';
import StatCard from './StatCard';
import ProgressBar from './ProgressBar';
import { DashboardIcon, CheckCircleIcon, ListIcon } from './icons/NavIcons';
import LoadingSpinner from './LoadingSpinner'; // Import LoadingSpinner

// Check for Recharts after component mounts, as CDN loading might be delayed.
// const Recharts = typeof window !== 'undefined' ? (window as any).Recharts : undefined;

const ChartLoadingMessage: React.FC = () => (
    <div className="flex flex-col items-center justify-center h-48">
        <LoadingSpinner text="Loading charts..." />
    </div>
);

const ChartErrorMessage: React.FC = () => (
    <p className="text-sm text-center py-10 text-red-500 dark:text-red-400">
        Charts library could not be loaded. Please check your internet connection and refresh.
    </p>
);

const NoDataMessage: React.FC<{ chartName: string }> = ({ chartName }) => (
     <p className="text-sm text-center py-10 text-slate-500 dark:text-slate-400">
        No task data available for {chartName}.
    </p>
);

interface ChartComponentProps {
  tasks: Task[];
  rechartsLoaded: boolean;
}

const TaskPriorityChart: React.FC<ChartComponentProps> = ({ tasks, rechartsLoaded }) => {
  if (!rechartsLoaded) return null; // Parent will handle loading/error message
  const Recharts = (window as any).Recharts; // Should be available here
  const { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } = Recharts;

  const priorityData = useMemo(() => {
    const counts = tasks.reduce((acc, task) => {
      acc[task.priority] = (acc[task.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return [
      { name: 'Low', count: counts[Priority.Low] || 0, fill: 'var(--color-priority-low, #34d399)' },
      { name: 'Medium', count: counts[Priority.Medium] || 0, fill: 'var(--color-priority-medium, #f59e0b)' },
      { name: 'High', count: counts[Priority.High] || 0, fill: 'var(--color-priority-high, #ef4444)' },
    ];
  }, [tasks]);

  if (tasks.length === 0) return <NoDataMessage chartName="priority distribution" />;

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={priorityData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--recharts-cartesian-grid-stroke)" />
        <XAxis dataKey="name" tick={{ fill: 'var(--recharts-tooltip-text-secondary)' }} />
        <YAxis tick={{ fill: 'var(--recharts-tooltip-text-secondary)' }} allowDecimals={false} />
        <Tooltip
          contentStyle={{ backgroundColor: 'var(--recharts-tooltip-bg)', border: 'none', borderRadius: '0.5rem', boxShadow: 'var(--recharts-tooltip-shadow)'}}
          itemStyle={{ color: 'var(--recharts-tooltip-text-primary)' }}
          cursor={{fill: 'rgba(128,128,128,0.1)'}}
        />
        <Legend wrapperStyle={{ color: 'var(--recharts-tooltip-text-secondary)', paddingTop: '10px' }} />
        <Bar dataKey="count" name="Tasks">
           {priorityData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

const TaskStatusPieChart: React.FC<ChartComponentProps> = ({ tasks, rechartsLoaded }) => {
    if (!rechartsLoaded) return null;
    const Recharts = (window as any).Recharts;
    const { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } = Recharts;

    const completedTasks = tasks.filter(task => task.completed).length;
    const pendingTasks = tasks.length - completedTasks;

    const data = [
        { name: 'Completed', value: completedTasks, fill: 'var(--color-accent, #10b981)' },
        { name: 'Pending', value: pendingTasks, fill: 'var(--color-priority-medium, #f59e0b)' },
    ];

    if (tasks.length === 0) return <NoDataMessage chartName="task status" />;
    if (completedTasks === 0 && pendingTasks === 0 && tasks.length > 0) { 
      // This case means tasks exist but none are completed or pending (e.g. all new tasks, or an error in logic)
      // For simplicity, treat as no data for pie chart display.
      return <NoDataMessage chartName="task status breakdown" />;
    }


    return (
        <ResponsiveContainer width="100%" height={250}>
            <PieChart>
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--recharts-tooltip-bg)', border: 'none', borderRadius: '0.5rem', boxShadow: 'var(--recharts-tooltip-shadow)'}}
                  itemStyle={{ color: 'var(--recharts-tooltip-text-primary)' }}
                />
                <Legend wrapperStyle={{ color: 'var(--recharts-tooltip-text-secondary)', paddingTop: '10px' }} />
                <Pie
                    data={data.filter(d => d.value > 0)} // Only show slices with value > 0
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                    {data.filter(d => d.value > 0).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                </Pie>
            </PieChart>
        </ResponsiveContainer>
    );
};


const DashboardView: React.FC<{ tasks: Task[] }> = ({ tasks }) => {
  const [rechartsLoaded, setRechartsLoaded] = useState(false);
  const [rechartsError, setRechartsError] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).Recharts) {
      setRechartsLoaded(true);
      return;
    }

    let attempts = 0;
    const maxAttempts = 10; // Poll for 5 seconds
    const interval = setInterval(() => {
      attempts++;
      if (typeof window !== 'undefined' && (window as any).Recharts) {
        setRechartsLoaded(true);
        clearInterval(interval);
      } else if (attempts >= maxAttempts) {
        setRechartsError(true);
        clearInterval(interval);
      }
    }, 500);

    return () => clearInterval(interval);
  }, []);


  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(task => task.completed).length;
  const completionPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const highPriorityTasks = tasks.filter(task => task.priority === Priority.High && !task.completed).length;

  const streaks = 7; 
  const burnoutRisk = highPriorityTasks > 5 ? 'High' : highPriorityTasks > 2 ? 'Medium' : 'Low';
  const motivationScore = 75; 

  const renderCharts = () => {
    if (rechartsError) return <ChartErrorMessage />;
    if (!rechartsLoaded) return <ChartLoadingMessage />;
    return (
        <>
            <div className="mt-6">
                <h4 className="text-md font-medium text-slate-600 dark:text-slate-300 mb-2">Task Status</h4>
                <TaskStatusPieChart tasks={tasks} rechartsLoaded={rechartsLoaded} />
            </div>
            <div className="mt-6">
                <h4 className="text-md font-medium text-slate-600 dark:text-slate-300 mb-2">Task Priorities Distribution</h4>
                <TaskPriorityChart tasks={tasks} rechartsLoaded={rechartsLoaded} />
            </div>
        </>
    );
  }

  return (
    <div className="animate-fadeIn">
      <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatCard title="Total Tasks" value={totalTasks} icon={<ListIcon className="w-5 h-5 text-slate-500 dark:text-slate-400" />} />
        <StatCard title="Completed Tasks" value={completedTasks} icon={<CheckCircleIcon className="w-5 h-5 text-emerald-500" />} trend="up" trendText={`${completionPercentage.toFixed(0)}% overall`} />
        <StatCard title="Focus Streaks" value={`${streaks} days`} icon={<DashboardIcon />} />
        <StatCard title="Burnout Risk" value={burnoutRisk} 
          icon={
            <div className={`w-4 h-4 rounded-full ${
              burnoutRisk === 'High' ? 'bg-red-500' : burnoutRisk === 'Medium' ? 'bg-amber-500' : 'bg-emerald-500'
            }`}></div>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-lg">
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-1">Task Completion</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Your progress across all tasks.</p>
          <ProgressBar value={completionPercentage} label="Overall Completion" />
          {renderCharts()}
        </div>
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-lg">
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-1">Well-being & Motivation (Mock)</h3>
           <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Track your motivation and workload.</p>
          <div className="mt-4">
            <ProgressBar value={motivationScore} label="Motivation Score" color="bg-accent" />
          </div>
          <div className="mt-6">
            <h4 className="text-md font-medium text-slate-600 dark:text-slate-300 mb-2">Pending High Priority Tasks</h4>
             <p className="text-2xl font-bold text-slate-700 dark:text-slate-200">{highPriorityTasks}</p>
             <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Remember to take breaks and manage your workload to avoid burnout.
             </p>
          </div>
           {/* Placeholder for future detailed burnout risk chart or suggestions */}
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
