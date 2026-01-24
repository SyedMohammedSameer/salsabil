import React from 'react';

interface TaskCelebrationProps {
  show: boolean;
  taskTitle?: string;
}

const TaskCelebration: React.FC<TaskCelebrationProps> = ({ show, taskTitle }) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center animate-fadeIn">
      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-8 py-4 rounded-2xl shadow-2xl animate-bounceIn">
        <div className="flex items-center space-x-3">
          <svg className="w-8 h-8 animate-spin-slow" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="font-bold text-lg">Task Completed!</p>
            {taskTitle && <p className="text-sm opacity-90">{taskTitle}</p>}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bounceIn {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .animate-bounceIn {
          animation: bounceIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }
        .animate-spin-slow {
          animation: spin-slow 2s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default TaskCelebration;
