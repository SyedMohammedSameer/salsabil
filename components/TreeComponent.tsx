// ===================================
// TREE COMPONENT (components/TreeComponent.tsx)
// ===================================

import React from 'react';
import { Tree, TreeGrowthStage, TreeType } from '../types';

interface TreeComponentProps {
  tree: Tree;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
}

const TreeComponent: React.FC<TreeComponentProps> = ({ tree, size = 'md', showDetails = true }) => {
  const getTreeEmoji = () => {
    if (!tree.isAlive) return '💀';
    
    switch (tree.growthStage) {
      case TreeGrowthStage.Seed: return '🌰';
      case TreeGrowthStage.Sprout: return '🌱';
      case TreeGrowthStage.Sapling: return '🌿';
      case TreeGrowthStage.YoungTree: return '🌳';
      case TreeGrowthStage.MatureTree: return '🌲';
      default: return '🌳';
    }
  };

  const getTypeIcon = () => {
    switch (tree.type) {
      case TreeType.Work: return '💼';
      case TreeType.Study: return '📚';
      case TreeType.QuranReading: return '📖';
      case TreeType.Dhikr: return '🤲';
      case TreeType.GeneralFocus: return '🎯';
      default: return '🌳';
    }
  };

  const getBackgroundColor = () => {
    if (!tree.isAlive) return 'from-slate-400 to-slate-500';
    
    switch (tree.type) {
      case TreeType.Work: return 'from-blue-400 to-indigo-500';
      case TreeType.Study: return 'from-purple-400 to-violet-500';
      case TreeType.QuranReading: return 'from-emerald-400 to-teal-500';
      case TreeType.Dhikr: return 'from-amber-400 to-orange-500';
      case TreeType.GeneralFocus: return 'from-slate-400 to-gray-500';
      default: return 'from-green-400 to-emerald-500';
    }
  };

  const sizeClasses = {
    sm: 'w-16 h-20',
    md: 'w-20 h-24',
    lg: 'w-24 h-28'
  };

  const textSizes = {
    sm: { emoji: 'text-2xl', text: 'text-xs' },
    md: { emoji: 'text-3xl', text: 'text-sm' },
    lg: { emoji: 'text-4xl', text: 'text-base' }
  };

  return (
    <div className="flex flex-col items-center">
      <div className={`${sizeClasses[size]} bg-gradient-to-b ${getBackgroundColor()} rounded-2xl flex flex-col items-center justify-center shadow-lg relative overflow-hidden transition-transform hover:scale-105`}>
        {/* Tree */}
        <div className={`${textSizes[size].emoji} mb-1 animate-pulse`}>
          {getTreeEmoji()}
        </div>
        
        {/* Type Icon */}
        <div className="absolute top-1 right-1 text-xs opacity-80">
          {getTypeIcon()}
        </div>
        
        {/* Focus Time Badge */}
        <div className="absolute bottom-1 left-1 right-1 text-center">
          <div className="bg-black/20 rounded-full px-2 py-0.5">
            <span className="text-white text-xs font-medium">
              {tree.focusMinutes}m
            </span>
          </div>
        </div>
      </div>
      
      {showDetails && (
        <div className="mt-2 text-center">
          <p className={`${textSizes[size].text} font-medium text-slate-700 dark:text-slate-300`}>
            {tree.growthStage}
          </p>
          {size !== 'sm' && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              by {tree.plantedByName}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default TreeComponent;