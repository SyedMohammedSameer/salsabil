// Beautiful landscape-style garden visualization inspired by Forest app
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Tree, TreeType, TreeGrowthStage } from '../types';

interface GardenLandscapeProps {
  trees: Tree[];
  loading?: boolean;
}

const GardenLandscape: React.FC<GardenLandscapeProps> = ({ trees, loading = false }) => {
  const [selectedTree, setSelectedTree] = useState<Tree | null>(null);
  const [hoveredTree, setHoveredTree] = useState<Tree | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });

  // Update container size on mount and resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({ width: rect.width, height: Math.max(400, rect.width * 0.6) });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Generate organic tree positions using pseudo-random placement with collision detection
  const treePositions = useMemo(() => {
    const positions: Array<{
      tree: Tree;
      x: number;
      y: number;
      layer: number;
      scale: number;
    }> = [];

    const layers = [
      { minY: 0.75, maxY: 0.88, minScale: 0.6, maxScale: 0.8 }, // Background (farther, slightly higher)
      { minY: 0.82, maxY: 0.93, minScale: 0.8, maxScale: 1.0 },  // Midground
      { minY: 0.88, maxY: 0.97, minScale: 1.0, maxScale: 1.2 }   // Foreground (closest to ground)
    ];

    // Helper function to check if two positions overlap using pixel-based distance
    const checkCollision = (
      pos1: { x: number; y: number; scale: number },
      pos2: { x: number; y: number; scale: number }
    ) => {
      const dx = (pos1.x - pos2.x) * containerSize.width;
      const dy = (pos1.y - pos2.y) * containerSize.height;
      const distancePx = Math.sqrt(dx * dx + dy * dy);
      const avgScale = (pos1.scale + pos2.scale) / 2;
      // Minimum separation in pixels scales with size; clamp to sensible range
      const minDistancePx = Math.min(140, Math.max(50, 80 * avgScale));
      return distancePx < minDistancePx;
    };

    trees.forEach((tree) => {
      // Use tree ID for consistent positioning
      const seed = tree.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
      const random = (offset: number) => ((seed + offset) % 1000) / 1000;

      const layer = Math.floor(random(100) * layers.length);
      const layerConfig = layers[layer];
      
      // Scale based on growth stage and layer
      const growthScale = tree.growthStage === TreeGrowthStage.Seed ? 0.3 :
                         tree.growthStage === TreeGrowthStage.Sprout ? 0.5 :
                         tree.growthStage === TreeGrowthStage.Sapling ? 0.7 :
                         tree.growthStage === TreeGrowthStage.YoungTree ? 0.9 : 1.0;
      
      const scale = (layerConfig.minScale + random(400) * (layerConfig.maxScale - layerConfig.minScale)) * growthScale;

      // Try to find a non-overlapping position (more attempts for better distribution)
      let attempts = 0;
      let x, y;
      let validPosition = false;

      while (attempts < 30 && !validPosition) {
        // Use slightly wider margins to reduce edge clustering
        x = 0.08 + random(200 + attempts * 53) * 0.84;
        y = layerConfig.minY + random(300 + attempts * 31) * (layerConfig.maxY - layerConfig.minY);
        
        const newPos = { x, y, scale };
        validPosition = !positions.some(pos => checkCollision(newPos, pos));
        attempts++;
      }

      // If we couldn't find a non-overlapping position, use the last attempt
      if (!validPosition) {
        x = 0.08 + random(200 + attempts * 53) * 0.84;
        y = layerConfig.minY + random(300 + attempts * 31) * (layerConfig.maxY - layerConfig.minY);
      }

      positions.push({ tree, x: x!, y: y!, layer, scale });
    });

    // Sort by layer and y position for proper z-ordering
    return positions.sort((a, b) => {
      if (a.layer !== b.layer) return a.layer - b.layer;
      return a.y - b.y;
    });
  }, [trees, containerSize]);

  const getTreeEmoji = (tree: Tree): string => {
    // Use selected tree variety emoji if available, otherwise fall back to type-based emojis
    if (tree.varietyEmoji) {
      // For early growth stages, still show generic growth stages
      if (tree.growthStage === TreeGrowthStage.Seed) return '🌱';
      if (tree.growthStage === TreeGrowthStage.Sprout) return '🌿';
      // For sapling and above, show the selected variety
      return tree.varietyEmoji;
    }

    // Fallback to old logic for trees without variety information
    const typeEmojis = {
      [TreeType.GeneralFocus]: tree.growthStage === TreeGrowthStage.MatureTree ? '🌳' : '🌲',
      [TreeType.Study]: tree.growthStage === TreeGrowthStage.MatureTree ? '📚🌳' : '🌲',
      [TreeType.Work]: tree.growthStage === TreeGrowthStage.MatureTree ? '💼🌳' : '🌲', 
      [TreeType.QuranReading]: tree.growthStage === TreeGrowthStage.MatureTree ? '🌸' : '🌺',
      [TreeType.Dhikr]: tree.growthStage === TreeGrowthStage.MatureTree ? '🌻' : '🌼'
    };

    if (tree.growthStage === TreeGrowthStage.Seed) return '🌱';
    if (tree.growthStage === TreeGrowthStage.Sprout) return '🌿';
    
    return typeEmojis[tree.type] || '🌳';
  };

  const getTreeColor = (tree: Tree): string => {
    // Use selected tree variety color if available
    if (tree.varietyColor) {
      // Convert Tailwind gradient to single color for text-shadow
      if (tree.varietyColor.includes('green')) return '#22c55e';
      if (tree.varietyColor.includes('pink')) return '#ec4899';
      if (tree.varietyColor.includes('yellow')) return '#eab308';
      if (tree.varietyColor.includes('purple')) return '#8b5cf6';
      if (tree.varietyColor.includes('red')) return '#ef4444';
      if (tree.varietyColor.includes('blue')) return '#3b82f6';
      if (tree.varietyColor.includes('teal')) return '#14b8a6';
      if (tree.varietyColor.includes('emerald')) return '#10b981';
      if (tree.varietyColor.includes('rose')) return '#f43f5e';
      if (tree.varietyColor.includes('amber')) return '#f59e0b';
    }

    // Fallback to old logic
    const colors = {
      [TreeType.GeneralFocus]: '#22c55e',
      [TreeType.Study]: '#3b82f6', 
      [TreeType.Work]: '#f59e0b',
      [TreeType.QuranReading]: '#ec4899',
      [TreeType.Dhikr]: '#8b5cf6'
    };
    return colors[tree.type] || '#22c55e';
  };

  if (loading) {
    return (
      <div className="w-full h-48 bg-gradient-to-b from-sky-100 to-emerald-50 dark:from-slate-700 dark:to-slate-800 rounded-xl flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse text-4xl mb-2">🌱</div>
          <p className="text-sm text-slate-600 dark:text-slate-400">Loading garden...</p>
        </div>
      </div>
    );
  }

  if (trees.length === 0) {
    return (
      <div className="w-full h-48 bg-gradient-to-b from-sky-100 to-emerald-50 dark:from-slate-700 dark:to-slate-800 rounded-xl flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-2">🌱</div>
          <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Your garden awaits
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Complete focus sessions to plant trees
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      {/* Main landscape container - Simplified */}
      <div
        ref={containerRef}
        className="relative w-full bg-gradient-to-b from-sky-100 to-emerald-50 dark:from-slate-700 dark:to-slate-800 rounded-xl overflow-hidden"
        style={{ height: `${Math.min(containerSize.height, 300)}px` }}
        onClick={() => setSelectedTree(null)}
      >
        {/* Simple ground */}
        <div className="absolute bottom-0 w-full h-20 bg-gradient-to-t from-green-200/60 to-transparent dark:from-green-800/30"></div>

        {/* Trees positioned organically */}
        {treePositions.map(({ tree, x, y, layer, scale }) => (
          <div
            key={tree.id}
            className="absolute transform -translate-x-1/2 transition-transform duration-200 hover:scale-110 cursor-pointer"
            style={{
              left: `${x * 100}%`,
              bottom: `${(1 - y) * 100}%`,
              transform: `translateX(-50%) scale(${scale * 0.8})`,
              zIndex: Math.floor(y * 100) + layer * 100,
              filter: layer === 0 ? 'brightness(0.85) opacity(0.9)' : 'brightness(1)',
            }}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedTree(tree);
            }}
            onMouseEnter={() => setHoveredTree(tree)}
            onMouseLeave={() => setHoveredTree(null)}
          >
            <div className="relative">
              {/* Tree */}
              <div
                className="text-3xl"
                style={{
                  fontSize: `${1.5 + scale * 0.7}rem`,
                  filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.2))'
                }}
              >
                {getTreeEmoji(tree)}
              </div>

              {/* Compact Hover tooltip */}
              {hoveredTree?.id === tree.id && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-black/90 text-white text-xs rounded whitespace-nowrap pointer-events-none z-50">
                  {tree.varietyName ? tree.varietyName : `${tree.focusMinutes} min`}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Selected tree detail modal - Compact */}
      {selectedTree && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedTree(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-xs p-4" onClick={e => e.stopPropagation()}>
            <div className="text-center">
              <div className="text-5xl mb-2">{getTreeEmoji(selectedTree)}</div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">
                {selectedTree.varietyName || 'Focus Tree'}
              </h3>
              <div className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                <div>{selectedTree.focusMinutes} minutes</div>
                <div>{selectedTree.plantedAt.toLocaleDateString()}</div>
              </div>
            </div>
            <button
              onClick={() => setSelectedTree(null)}
              className="w-full mt-4 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GardenLandscape;