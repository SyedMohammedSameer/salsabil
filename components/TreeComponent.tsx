// Enhanced TreeComponent.tsx with Forest app-inspired design
import React from 'react';
import { Tree, TreeGrowthStage, TreeType } from '../types';

interface TreeComponentProps {
  tree: Tree;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
  showTooltip?: boolean;
  interactive?: boolean;
}

const TreeComponent: React.FC<TreeComponentProps> = ({ 
  tree, 
  size = 'md', 
  showDetails = true,
  showTooltip = false,
  interactive = false 
}) => {
  const getTreeVisual = () => {
    if (!tree.isAlive) {
      return {
        emoji: '🪦',
        stem: '▄',
        base: '━━━',
        color: 'from-gray-400 to-gray-500'
      };
    }
    
    switch (tree.growthStage) {
      case TreeGrowthStage.Seed:
        return {
          emoji: '●',
          stem: '',
          base: '▬',
          color: 'from-yellow-400 to-amber-500',
          animation: 'animate-pulse'
        };
      case TreeGrowthStage.Sprout:
        return {
          emoji: '🌱',
          stem: '│',
          base: '╱─╲',
          color: 'from-green-300 to-green-400',
          animation: 'animate-bounce'
        };
      case TreeGrowthStage.Sapling:
        return {
          emoji: '🌿',
          stem: '┃',
          base: '╱──╲',
          color: 'from-green-400 to-emerald-500',
          leaves: ['🍃', '🌿']
        };
      case TreeGrowthStage.YoungTree:
        return {
          emoji: '🌳',
          stem: '▆',
          base: '╱───╲',
          color: 'from-emerald-500 to-green-600',
          leaves: ['🍃', '🌿', '🍂'],
          fruits: ['🍎', '🍊', '🥝']
        };
      case TreeGrowthStage.MatureTree:
        return {
          emoji: '🌲',
          stem: '█',
          base: '╱════╲',
          color: 'from-green-600 to-emerald-700',
          leaves: ['🍃', '🌿', '🍂', '🌸'],
          fruits: ['🍎', '🍊', '🥝', '🥥'],
          animation: 'animate-float'
        };
      default:
        return {
          emoji: '🌳',
          stem: '│',
          base: '╱──╲',
          color: 'from-green-400 to-emerald-500'
        };
    }
  };

  const getTypeDecoration = () => {
    switch (tree.type) {
      case TreeType.Work:
        return { 
          icon: '💼', 
          bgColor: 'from-blue-400 to-indigo-500',
          particle: '⚡'
        };
      case TreeType.Study:
        return { 
          icon: '📚', 
          bgColor: 'from-purple-400 to-violet-500',
          particle: '✨'
        };
      case TreeType.QuranReading:
        return { 
          icon: '📖', 
          bgColor: 'from-emerald-400 to-teal-500',
          particle: '🌙'
        };
      case TreeType.Dhikr:
        return { 
          icon: '🤲', 
          bgColor: 'from-amber-400 to-orange-500',
          particle: '💫'
        };
      case TreeType.GeneralFocus:
        return { 
          icon: '🎯', 
          bgColor: 'from-slate-400 to-gray-500',
          particle: '⭐'
        };
      default:
        return { 
          icon: '🌳', 
          bgColor: 'from-green-400 to-emerald-500',
          particle: '✨'
        };
    }
  };

  const sizeConfig = {
    sm: {
      container: 'w-16 h-20',
      emoji: 'text-lg',
      text: 'text-xs',
      badge: 'text-xs px-1 py-0.5',
      typeIcon: 'text-xs',
      particle: 'w-1 h-1'
    },
    md: {
      container: 'w-20 h-24',
      emoji: 'text-2xl',
      text: 'text-sm',
      badge: 'text-xs px-2 py-1',
      typeIcon: 'text-sm',
      particle: 'w-1.5 h-1.5'
    },
    lg: {
      container: 'w-24 h-28',
      emoji: 'text-3xl',
      text: 'text-base',
      badge: 'text-sm px-2 py-1',
      typeIcon: 'text-base',
      particle: 'w-2 h-2'
    }
  };

  const visual = getTreeVisual();
  const decoration = getTypeDecoration();
  const config = sizeConfig[size];

  return (
    <div className={`relative group ${interactive ? 'cursor-pointer' : ''}`}>
      {/* Main Tree Container */}
      <div className={`${config.container} relative flex flex-col items-center justify-end transition-all duration-300 ${
        interactive ? 'hover:scale-110' : ''
      }`}>
        
        {/* Floating Particles */}
        {tree.focusMinutes > 10 && (
          <>
            <div className={`absolute top-0 left-1/4 ${config.particle} opacity-60 animate-bounce`} 
                 style={{ animationDelay: '0s', animationDuration: '2s' }}>
              {decoration.particle}
            </div>
            <div className={`absolute top-2 right-1/4 ${config.particle} opacity-40 animate-bounce`} 
                 style={{ animationDelay: '0.5s', animationDuration: '2.5s' }}>
              {decoration.particle}
            </div>
            {tree.focusMinutes > 25 && (
              <div className={`absolute top-1 left-1/2 ${config.particle} opacity-50 animate-bounce`} 
                   style={{ animationDelay: '1s', animationDuration: '3s' }}>
                {decoration.particle}
              </div>
            )}
          </>
        )}
        
        {/* Tree Crown */}
        <div className={`relative mb-1 ${config.emoji} ${visual.animation || ''}`}>
          {visual.emoji}
          
          {/* Scattered leaves for mature trees */}
          {visual.leaves && tree.focusMinutes > 20 && (
            <div className="absolute inset-0">
              {visual.leaves.slice(0, Math.min(3, Math.floor(tree.focusMinutes / 15))).map((leaf, i) => (
                <div
                  key={i}
                  className="absolute text-xs opacity-70 animate-pulse"
                  style={{
                    left: `${20 + (i * 25)}%`,
                    top: `${10 + (i * 15)}%`,
                    animationDelay: `${i * 0.3}s`
                  }}
                >
                  {leaf}
                </div>
              ))}
            </div>
          )}
          
          {/* Fruits for very productive trees */}
          {visual.fruits && tree.focusMinutes > 50 && (
            <div className="absolute inset-0">
              {visual.fruits.slice(0, Math.min(2, Math.floor(tree.focusMinutes / 25))).map((fruit, i) => (
                <div
                  key={i}
                  className="absolute text-xs opacity-80"
                  style={{
                    left: `${30 + (i * 40)}%`,
                    top: `${60 + (i * 10)}%`
                  }}
                >
                  {fruit}
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Tree Stem */}
        {visual.stem && (
          <div className={`${config.text} text-amber-700 dark:text-amber-600 font-mono leading-none`}>
            {visual.stem}
          </div>
        )}
        
        {/* Tree Base */}
        <div className={`${config.text} text-amber-800 dark:text-amber-700 font-mono leading-none`}>
          {visual.base}
        </div>
        
        {/* Type Badge */}
        <div className={`absolute -top-1 -right-1 ${config.typeIcon} bg-white/90 dark:bg-slate-800/90 rounded-full p-1 shadow-lg border border-white/50`}>
          {decoration.icon}
        </div>
        
        {/* Focus Time Badge */}
        <div className={`absolute -bottom-1 left-1/2 transform -translate-x-1/2 bg-gradient-to-r ${decoration.bgColor} text-white ${config.badge} rounded-full font-bold shadow-lg`}>
          {tree.focusMinutes}m
        </div>
        
        {/* Growth Stage Indicator */}
        {tree.growthStage === TreeGrowthStage.MatureTree && (
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
            <div className="w-4 h-4 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full animate-pulse shadow-lg">
              <div className="absolute inset-0 bg-yellow-300 rounded-full animate-ping opacity-75"></div>
            </div>
          </div>
        )}
        
        {/* Planting Animation for New Trees */}
        {tree.focusMinutes < 5 && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-6 h-1 bg-gradient-to-r from-amber-300 to-amber-400 rounded-full animate-pulse opacity-60"></div>
          </div>
        )}
        
        {/* Health Indicator */}
        {!tree.isAlive && (
          <div className="absolute inset-0 bg-black/30 rounded-lg flex items-center justify-center">
            <div className="text-red-500 text-lg">💀</div>
          </div>
        )}
      </div>

      {/* Tree Details */}
      {showDetails && (
        <div className="mt-2 text-center space-y-1">
          <p className={`${config.text} font-medium text-slate-700 dark:text-slate-300 capitalize`}>
            {tree.growthStage.replace(/([A-Z])/g, ' $1').trim()}
          </p>
          {size !== 'sm' && (
            <>
              <p className={`${config.text} text-slate-500 dark:text-slate-400 truncate`}>
                by {tree.plantedByName}
              </p>
              <p className={`${config.text} text-slate-400 dark:text-slate-500`}>
                {tree.plantedAt.toLocaleDateString()}
              </p>
            </>
          )}
        </div>
      )}
      
      {/* Enhanced Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
          <div className="bg-black/90 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap shadow-xl">
            <div className="font-semibold">{tree.type} Tree</div>
            <div>Focus: {tree.focusMinutes} minutes</div>
            <div>By {tree.plantedByName}</div>
            <div>Stage: {tree.growthStage}</div>
            <div className="text-center mt-1">
              {tree.isAlive ? '🌿 Healthy' : '💀 Withered'}
            </div>
            {/* Tooltip arrow */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black/90"></div>
          </div>
        </div>
      )}
      
      {/* Seasonal Effects */}
      {tree.isAlive && tree.focusMinutes > 30 && (
        <div className="absolute inset-0 pointer-events-none">
          {/* Gentle wind effect */}
          <div className="absolute inset-0 animate-pulse opacity-30">
            <div className="w-full h-full bg-gradient-to-r from-transparent via-green-200/20 to-transparent"></div>
          </div>
          
          {/* Seasonal sparkles */}
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className={`absolute ${config.particle} bg-yellow-300 rounded-full opacity-60 animate-ping`}
              style={{
                left: `${10 + (i * 30)}%`,
                top: `${20 + (i * 15)}%`,
                animationDelay: `${i * 1.2}s`,
                animationDuration: '3s'
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default TreeComponent;