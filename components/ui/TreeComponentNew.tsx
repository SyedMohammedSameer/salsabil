// components/ui/TreeComponentNew.tsx - Beautiful, Clean SVG Trees
import React, { useState } from 'react';
import { Tree, TreeGrowthStage, TreeType } from '../../types';
import { designSystem } from '../../utils/designSystem';

interface TreeComponentProps {
  tree: Tree;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onClick?: () => void;
}

const TreeComponentNew: React.FC<TreeComponentProps> = ({
  tree,
  size = 'md',
  interactive = false,
  onClick
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // Size configurations
  const sizeConfig = {
    sm: { width: 60, height: 80, scale: 0.8 },
    md: { width: 80, height: 100, scale: 1.0 },
    lg: { width: 100, height: 120, scale: 1.2 },
  };

  const config = sizeConfig[size];

  // Tree type colors (Islamic-inspired palette)
  const getTreeColors = () => {
    if (!tree.isAlive) {
      return {
        trunk: '#9ca3af',
        foliage: '#d1d5db',
        accent: '#6b7280',
      };
    }

    switch (tree.type) {
      case TreeType.QuranReading:
        return {
          trunk: '#065f46',   // Deep green (Islamic)
          foliage: '#10b981',  // Emerald
          accent: '#d4af37',   // Gold accent
        };
      case TreeType.Dhikr:
        return {
          trunk: '#92400e',    // Amber trunk
          foliage: '#f59e0b',  // Gold foliage
          accent: '#fbbf24',   // Light gold
        };
      case TreeType.Study:
        return {
          trunk: '#6b21a8',    // Purple trunk
          foliage: '#a855f7',  // Purple foliage
          accent: '#c084fc',   // Light purple
        };
      case TreeType.Work:
        return {
          trunk: '#1e40af',    // Blue trunk
          foliage: '#3b82f6',  // Blue foliage
          accent: '#60a5fa',   // Light blue
        };
      default: // GeneralFocus
        return {
          trunk: '#065f46',    // Green trunk
          foliage: '#10b981',  // Green foliage
          accent: '#34d399',   // Light green
        };
    }
  };

  const colors = getTreeColors();

  // Render tree based on growth stage
  const renderTree = () => {
    const commonProps = {
      className: `${designSystem.transitions.transform} ${isHovered && interactive ? 'scale-110' : ''}`,
    };

    switch (tree.growthStage) {
      case TreeGrowthStage.Seed:
        return (
          <svg width={config.width} height={config.height} viewBox="0 0 80 100" {...commonProps}>
            {/* Ground line */}
            <line x1="20" y1="85" x2="60" y2="85" stroke={colors.trunk} strokeWidth="2" opacity="0.3" />

            {/* Seed (simple circle half-buried) */}
            <circle cx="40" cy="82" r="8" fill={colors.trunk} opacity="0.8" />
            <ellipse cx="40" cy="78" rx="6" ry="4" fill={colors.accent} opacity="0.4" />

            {/* Subtle sparkle (growth potential) */}
            {isHovered && (
              <text x="40" y="60" fontSize="16" textAnchor="middle" opacity="0.6">✨</text>
            )}
          </svg>
        );

      case TreeGrowthStage.Sprout:
        return (
          <svg width={config.width} height={config.height} viewBox="0 0 80 100" {...commonProps}>
            {/* Ground */}
            <line x1="15" y1="85" x2="65" y2="85" stroke={colors.trunk} strokeWidth="2" opacity="0.3" />

            {/* Small stem */}
            <rect x="38" y="70" width="4" height="15" fill={colors.trunk} rx="2" />

            {/* Two small leaves */}
            <ellipse cx="32" cy="72" rx="8" ry="5" fill={colors.foliage} opacity="0.8" transform="rotate(-30 32 72)" />
            <ellipse cx="48" cy="72" rx="8" ry="5" fill={colors.foliage} opacity="0.8" transform="rotate(30 48 72)" />

            {/* Tiny sprout at top */}
            <circle cx="40" cy="68" r="3" fill={colors.accent} />
          </svg>
        );

      case TreeGrowthStage.Sapling:
        return (
          <svg width={config.width} height={config.height} viewBox="0 0 80 100" {...commonProps}>
            {/* Ground */}
            <line x1="10" y1="88" x2="70" y2="88" stroke={colors.trunk} strokeWidth="2" opacity="0.3" />

            {/* Trunk */}
            <rect x="37" y="55" width="6" height="33" fill={colors.trunk} rx="3" />

            {/* Small canopy (triangle shape) */}
            <circle cx="40" cy="48" r="18" fill={colors.foliage} opacity="0.9" />
            <circle cx="32" cy="55" r="12" fill={colors.foliage} opacity="0.7" />
            <circle cx="48" cy="55" r="12" fill={colors.foliage} opacity="0.7" />

            {/* Highlight */}
            <circle cx="35" cy="45" r="6" fill={colors.accent} opacity="0.3" />
          </svg>
        );

      case TreeGrowthStage.YoungTree:
        return (
          <svg width={config.width} height={config.height} viewBox="0 0 80 100" {...commonProps}>
            {/* Ground */}
            <line x1="5" y1="90" x2="75" y2="90" stroke={colors.trunk} strokeWidth="3" opacity="0.3" />

            {/* Trunk (wider) */}
            <rect x="35" y="50" width="10" height="40" fill={colors.trunk} rx="5" />

            {/* Canopy (layered circles for depth) */}
            <circle cx="40" cy="40" r="22" fill={colors.foliage} opacity="0.9" />
            <circle cx="28" cy="48" r="16" fill={colors.foliage} opacity="0.75" />
            <circle cx="52" cy="48" r="16" fill={colors.foliage} opacity="0.75" />
            <circle cx="40" cy="56" r="14" fill={colors.foliage} opacity="0.6" />

            {/* Highlights */}
            <circle cx="32" cy="38" r="8" fill={colors.accent} opacity="0.25" />
            <circle cx="48" cy="42" r="6" fill={colors.accent} opacity="0.25" />

            {/* Islamic accent (crescent moon for spiritual types) */}
            {(tree.type === TreeType.QuranReading || tree.type === TreeType.Dhikr) && (
              <text x="40" y="32" fontSize="12" textAnchor="middle" opacity="0.4">🌙</text>
            )}
          </svg>
        );

      case TreeGrowthStage.MatureTree:
        return (
          <svg width={config.width} height={config.height} viewBox="0 0 80 100" {...commonProps}>
            {/* Ground */}
            <line x1="0" y1="92" x2="80" y2="92" stroke={colors.trunk} strokeWidth="3" opacity="0.3" />

            {/* Trunk (thick, with texture) */}
            <rect x="32" y="45" width="16" height="47" fill={colors.trunk} rx="8" />
            <rect x="34" y="50" width="3" height="40" fill="white" opacity="0.1" />
            <rect x="43" y="52" width="3" height="38" fill="black" opacity="0.1" />

            {/* Large, full canopy */}
            <circle cx="40" cy="32" r="28" fill={colors.foliage} opacity="0.9" />
            <circle cx="22" cy="42" r="20" fill={colors.foliage} opacity="0.8" />
            <circle cx="58" cy="42" r="20" fill={colors.foliage} opacity="0.8" />
            <circle cx="40" cy="52" r="18" fill={colors.foliage} opacity="0.7" />
            <circle cx="30" cy="28" r="12" fill={colors.foliage} opacity="0.85" />
            <circle cx="50" cy="28" r="12" fill={colors.foliage} opacity="0.85" />

            {/* Highlights (depth effect) */}
            <circle cx="28" cy="30" r="10" fill={colors.accent} opacity="0.2" />
            <circle cx="52" cy="34" r="12" fill={colors.accent} opacity="0.2" />
            <circle cx="40" cy="40" r="8" fill={colors.accent} opacity="0.15" />

            {/* Islamic decoration for spiritual trees */}
            {tree.type === TreeType.QuranReading && (
              <text x="40" y="25" fontSize="14" textAnchor="middle" opacity="0.5">📖</text>
            )}
            {tree.type === TreeType.Dhikr && (
              <text x="40" y="25" fontSize="14" textAnchor="middle" opacity="0.5">🤲</text>
            )}
          </svg>
        );

      default:
        return renderTree(); // Fallback to seed
    }
  };

  // Type badge
  const getTypeInfo = () => {
    switch (tree.type) {
      case TreeType.QuranReading:
        return { icon: '📖', label: 'Quran', color: 'emerald' };
      case TreeType.Dhikr:
        return { icon: '🤲', label: 'Dhikr', color: 'amber' };
      case TreeType.Study:
        return { icon: '📚', label: 'Study', color: 'purple' };
      case TreeType.Work:
        return { icon: '💼', label: 'Work', color: 'blue' };
      default:
        return { icon: '🎯', label: 'Focus', color: 'slate' };
    }
  };

  const typeInfo = getTypeInfo();

  return (
    <div
      className={`relative group ${interactive ? 'cursor-pointer' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={`${tree.isAlive ? tree.growthStage : 'Dead'} ${tree.type} tree, ${tree.focusMinutes} minutes`}
    >
      {/* Tree SVG */}
      <div className="flex flex-col items-center">
        {renderTree()}

        {/* Info on hover */}
        {isHovered && interactive && (
          <div className={`
            absolute -top-2 left-1/2 transform -translate-x-1/2 -translate-y-full
            bg-slate-900 text-white text-xs px-3 py-2 rounded-lg
            ${designSystem.shadows.lg} ${designSystem.transitions.opacity}
            whitespace-nowrap pointer-events-none z-10
          `}>
            <div className="font-semibold">{typeInfo.label}</div>
            <div className="text-slate-300">{tree.focusMinutes} min</div>
            <div className="text-slate-400 text-xs">{tree.plantedByName}</div>
            {/* Arrow */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900"></div>
          </div>
        )}

        {/* Type badge (small, bottom) */}
        {!tree.isAlive && (
          <div className="text-lg opacity-50 mt-1">💀</div>
        )}
      </div>
    </div>
  );
};

export default TreeComponentNew;
