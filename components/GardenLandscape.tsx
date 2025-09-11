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
      { minY: 0.7, maxY: 0.95, minScale: 0.6, maxScale: 0.8 }, // Background
      { minY: 0.5, maxY: 0.8, minScale: 0.8, maxScale: 1.0 },  // Midground  
      { minY: 0.3, maxY: 0.6, minScale: 1.0, maxScale: 1.2 }   // Foreground
    ];

    // Helper function to check if two positions overlap
    const checkCollision = (pos1: {x: number, y: number, scale: number}, pos2: {x: number, y: number, scale: number}) => {
      const minDistance = Math.max(0.08, (pos1.scale + pos2.scale) * 0.06); // Minimum distance based on tree sizes
      const distance = Math.sqrt(Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2));
      return distance < minDistance;
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

      // Try to find a non-overlapping position (max 10 attempts)
      let attempts = 0;
      let x, y;
      let validPosition = false;

      while (attempts < 10 && !validPosition) {
        x = 0.1 + random(200 + attempts * 50) * 0.8; // 10% margin on sides, vary with attempts
        y = layerConfig.minY + random(300 + attempts * 30) * (layerConfig.maxY - layerConfig.minY);
        
        const newPos = { x, y, scale };
        validPosition = !positions.some(pos => checkCollision(newPos, pos));
        attempts++;
      }

      // If we couldn't find a non-overlapping position, use the last attempt
      if (!validPosition) {
        x = 0.1 + random(200 + attempts * 50) * 0.8;
        y = layerConfig.minY + random(300 + attempts * 30) * (layerConfig.maxY - layerConfig.minY);
      }

      positions.push({ tree, x: x!, y: y!, layer, scale });
    });

    // Sort by layer and y position for proper z-ordering
    return positions.sort((a, b) => {
      if (a.layer !== b.layer) return a.layer - b.layer;
      return a.y - b.y;
    });
  }, [trees]);

  const getTreeEmoji = (tree: Tree): string => {
    // Different emojis based on tree type and growth stage
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
      <div className="w-full h-96 bg-gradient-to-b from-sky-200 via-emerald-100 to-green-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-800 rounded-2xl flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse text-6xl mb-4">🌱</div>
          <p className="text-slate-600 dark:text-slate-400">Loading your garden...</p>
        </div>
      </div>
    );
  }

  if (trees.length === 0) {
    return (
      <div className="w-full h-96 bg-gradient-to-b from-sky-200 via-emerald-100 to-green-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-800 rounded-2xl flex items-center justify-center relative overflow-hidden">
        {/* Background elements */}
        <div className="absolute inset-0">
          <div className="absolute bottom-0 w-full h-32 bg-gradient-to-t from-green-300/50 to-transparent dark:from-green-800/30"></div>
          <div className="absolute bottom-0 left-10 w-20 h-20 bg-green-400/30 dark:bg-green-700/30 rounded-full blur-xl"></div>
          <div className="absolute bottom-0 right-16 w-16 h-16 bg-green-300/40 dark:bg-green-600/40 rounded-full blur-lg"></div>
        </div>
        
        <div className="text-center z-10">
          <div className="text-6xl mb-4 animate-bounce">🌱</div>
          <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Your garden awaits
          </h3>
          <p className="text-slate-600 dark:text-slate-400">
            Complete focus sessions to plant your first trees
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      {/* Main landscape container */}
      <div 
        ref={containerRef}
        className="relative w-full bg-gradient-to-b from-sky-200 via-sky-100 to-emerald-100 dark:from-slate-700 dark:via-slate-600 dark:to-slate-800 rounded-2xl overflow-hidden cursor-pointer"
        style={{ height: `${containerSize.height}px` }}
        onClick={() => setSelectedTree(null)}
      >
        {/* Sky and clouds */}
        <div className="absolute inset-0">
          <div className="absolute top-4 left-1/4 w-16 h-8 bg-white/40 dark:bg-white/20 rounded-full blur-sm animate-pulse"></div>
          <div className="absolute top-8 right-1/3 w-20 h-10 bg-white/30 dark:bg-white/15 rounded-full blur-sm animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

        {/* Rolling hills background */}
        <svg className="absolute bottom-0 w-full h-full" viewBox="0 0 800 400" preserveAspectRatio="none">
          <defs>
            <linearGradient id="hillGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#84cc16" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0.8" />
            </linearGradient>
          </defs>
          <path d="M0,300 Q200,250 400,280 T800,270 L800,400 L0,400 Z" fill="url(#hillGradient)" />
          <path d="M0,350 Q150,320 300,340 Q450,360 600,330 Q700,310 800,320 L800,400 L0,400 Z" fill="#22c55e" fillOpacity="0.7" />
        </svg>

        {/* Ground texture */}
        <div className="absolute bottom-0 w-full h-24 bg-gradient-to-t from-green-300/40 to-transparent dark:from-green-700/30"></div>

        {/* Trees positioned organically */}
        {treePositions.map(({ tree, x, y, layer, scale }) => (
          <div
            key={tree.id}
            className="absolute transform -translate-x-1/2 -translate-y-full transition-all duration-300 hover:scale-110 cursor-pointer"
            style={{
              left: `${x * 100}%`,
              bottom: `${(1 - y) * 100}%`,
              transform: `translateX(-50%) translateY(100%) scale(${scale})`,
              zIndex: Math.floor(y * 100) + layer * 100,
              filter: layer === 0 ? 'brightness(0.7) opacity(0.8)' : layer === 1 ? 'brightness(0.85)' : 'brightness(1)',
            }}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedTree(tree);
            }}
            onMouseEnter={() => setHoveredTree(tree)}
            onMouseLeave={() => setHoveredTree(null)}
          >
            <div className="relative group">
              {/* Tree shadow */}
              <div 
                className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-2 bg-black/20 rounded-full blur-sm"
                style={{ transform: `translateX(-50%) scale(${scale})` }}
              />
              
              {/* Tree */}
              <div 
                className="text-4xl drop-shadow-lg group-hover:animate-bounce"
                style={{ 
                  color: getTreeColor(tree),
                  fontSize: `${2 + scale}rem`,
                  textShadow: '2px 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                {getTreeEmoji(tree)}
              </div>
              
              {/* Hover tooltip */}
              {hoveredTree?.id === tree.id && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black/80 text-white text-xs rounded-lg whitespace-nowrap pointer-events-none z-50">
                  <div className="font-semibold">{tree.focusMinutes} min focus</div>
                  <div className="text-xs opacity-75">{tree.plantedAt.toLocaleDateString()}</div>
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black/80"></div>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Subtle grass/flower details */}
        <div className="absolute bottom-2 left-1/4 text-green-400 text-sm animate-pulse">🌾</div>
        <div className="absolute bottom-4 right-1/3 text-yellow-400 text-xs">🌼</div>
        <div className="absolute bottom-1 left-2/3 text-green-300 text-sm animate-pulse" style={{ animationDelay: '1s' }}>🌿</div>
      </div>

      {/* Selected tree detail modal */}
      {selectedTree && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedTree(null)}>
          <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <div className="text-center">
              <div className="text-6xl mb-4">{getTreeEmoji(selectedTree)}</div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
                Focus Tree
              </h3>
              <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <div><span className="font-medium">Focus Time:</span> {selectedTree.focusMinutes} minutes</div>
                <div><span className="font-medium">Planted:</span> {selectedTree.plantedAt.toLocaleDateString()}</div>
                <div><span className="font-medium">Growth:</span> {selectedTree.growthStage.replace(/([A-Z])/g, ' $1').trim()}</div>
                <div><span className="font-medium">Type:</span> {selectedTree.type.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</div>
              </div>
            </div>
            <button 
              onClick={() => setSelectedTree(null)}
              className="w-full mt-6 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
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