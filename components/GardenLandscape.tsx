// 🌟 Modern 3D Isometric Garden Landscape with CSS 3D Transforms
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

  const getTreeEmoji = (tree: Tree): string => {
    if (tree.varietyEmoji) {
      if (tree.growthStage === TreeGrowthStage.Seed) return '🌱';
      if (tree.growthStage === TreeGrowthStage.Sprout) return '🌿';
      return tree.varietyEmoji;
    }

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

  // Generate 3D isometric grid positions
  const treePositions = useMemo(() => {
    const gridSize = 8; // 8x8 grid
    const positions: Array<{
      tree: Tree;
      gridX: number;
      gridY: number;
      scale: number;
    }> = [];

    trees.forEach((tree, index) => {
      const seed = tree.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
      const random = (offset: number) => ((seed + offset) % 1000) / 1000;

      // Distribute trees across grid
      const gridX = Math.floor((random(100) + index * 0.1) * gridSize) % gridSize;
      const gridY = Math.floor((random(200) + index * 0.2) * gridSize) % gridSize;

      const growthScale = tree.growthStage === TreeGrowthStage.Seed ? 0.5 :
                         tree.growthStage === TreeGrowthStage.Sprout ? 0.7 :
                         tree.growthStage === TreeGrowthStage.Sapling ? 0.85 :
                         tree.growthStage === TreeGrowthStage.YoungTree ? 1.0 : 1.2;

      positions.push({ tree, gridX, gridY, scale: growthScale });
    });

    return positions;
  }, [trees]);

  if (loading) {
    return (
      <div className="w-full h-96 bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 rounded-2xl flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse text-6xl mb-4">🌱</div>
          <p className="text-slate-600 dark:text-slate-400">Growing your garden...</p>
        </div>
      </div>
    );
  }

  if (trees.length === 0) {
    return (
      <div className="w-full h-96 bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 rounded-2xl flex items-center justify-center relative overflow-hidden">
        {/* Animated background particles */}
        <div className="absolute inset-0">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-emerald-400/30 rounded-full"
              style={{
                left: `${20 + i * 15}%`,
                top: `${30 + i * 10}%`,
                animation: `float ${3 + i * 0.5}s ease-in-out infinite`,
                animationDelay: `${i * 0.3}s`
              }}
            />
          ))}
        </div>

        <div className="text-center z-10">
          <div className="text-7xl mb-4">🌱</div>
          <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">
            Your 3D Garden Awaits
          </h3>
          <p className="text-slate-600 dark:text-slate-400">
            Complete focus sessions to watch your isometric garden grow
          </p>
        </div>

        <style jsx>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px) scale(1); }
            50% { transform: translateY(-20px) scale(1.1); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      {/* 3D Isometric Container */}
      <div
        ref={containerRef}
        className="relative w-full h-96 bg-gradient-to-br from-sky-100 via-emerald-50 to-teal-50 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 rounded-2xl overflow-hidden shadow-2xl"
        style={{
          perspective: '1200px',
          perspectiveOrigin: '50% 50%'
        }}
      >
        {/* Ground plane with 3D transform */}
        <div
          className="absolute inset-0 bg-gradient-to-b from-transparent via-green-100/40 to-green-200/60 dark:from-transparent dark:via-green-900/20 dark:to-green-800/40"
          style={{
            transform: 'rotateX(60deg) translateZ(-100px)',
            transformStyle: 'preserve-3d'
          }}
        >
          {/* Grid lines for isometric effect */}
          <svg className="w-full h-full opacity-20" viewBox="0 0 800 800">
            {[...Array(9)].map((_, i) => (
              <g key={i}>
                <line
                  x1={i * 100}
                  y1="0"
                  x2={i * 100}
                  y2="800"
                  stroke="currentColor"
                  strokeWidth="1"
                  className="text-emerald-600 dark:text-emerald-400"
                />
                <line
                  x1="0"
                  y1={i * 100}
                  x2="800"
                  y2={i * 100}
                  stroke="currentColor"
                  strokeWidth="1"
                  className="text-emerald-600 dark:text-emerald-400"
                />
              </g>
            ))}
          </svg>
        </div>

        {/* 3D Trees in isometric grid */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            transformStyle: 'preserve-3d',
            transform: 'rotateX(45deg) rotateZ(45deg)'
          }}
        >
          <div className="relative" style={{ width: '600px', height: '600px' }}>
            {treePositions.map(({ tree, gridX, gridY, scale }) => {
              const x = (gridX - 4) * 70;
              const y = (gridY - 4) * 70;
              const z = scale * 50;

              return (
                <div
                  key={tree.id}
                  className="absolute cursor-pointer transition-all duration-300 hover:scale-125 hover:z-50"
                  style={{
                    left: '50%',
                    top: '50%',
                    transform: `translate3d(${x}px, ${y}px, ${z}px)`,
                    transformStyle: 'preserve-3d',
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTree(tree);
                  }}
                  onMouseEnter={() => setHoveredTree(tree)}
                  onMouseLeave={() => setHoveredTree(null)}
                >
                  {/* Tree with 3D shadow */}
                  <div className="relative">
                    {/* Shadow */}
                    <div
                      className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-2 bg-black/20 rounded-full blur-md"
                      style={{ transform: 'translateX(-50%) translateZ(-10px)' }}
                    />

                    {/* Tree emoji */}
                    <div
                      className="text-5xl drop-shadow-2xl"
                      style={{
                        fontSize: `${2 + scale * 0.8}rem`,
                        filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
                        transform: 'rotateX(-45deg) rotateZ(-45deg)',
                        transformStyle: 'preserve-3d'
                      }}
                    >
                      {getTreeEmoji(tree)}
                    </div>

                    {/* Floating label */}
                    {hoveredTree?.id === tree.id && (
                      <div
                        className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 bg-black/90 text-white text-xs rounded-lg whitespace-nowrap pointer-events-none animate-fadeIn"
                        style={{
                          transform: 'translate(-50%, -10px) rotateX(-45deg) rotateZ(-45deg)',
                          transformStyle: 'preserve-3d'
                        }}
                      >
                        <div className="font-bold">
                          {tree.varietyName || 'Focus Tree'}
                        </div>
                        <div className="text-xs opacity-80">
                          {tree.focusMinutes} min
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Floating decorative elements */}
        <div className="absolute top-4 left-4 text-yellow-400 animate-pulse">☀️</div>
        <div className="absolute top-4 right-4 text-blue-300 animate-pulse" style={{ animationDelay: '1s' }}>☁️</div>
        <div className="absolute bottom-4 left-4 text-pink-400 animate-bounce" style={{ animationDelay: '0.5s' }}>🌸</div>
        <div className="absolute bottom-4 right-4 text-yellow-300 animate-bounce" style={{ animationDelay: '1.5s' }}>🦋</div>
      </div>

      {/* Tree Detail Modal - Modern */}
      {selectedTree && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn"
          onClick={() => setSelectedTree(null)}
        >
          <div
            className="bg-gradient-to-br from-white to-emerald-50 dark:from-slate-800 dark:to-slate-900 rounded-3xl shadow-2xl w-full max-w-sm p-6 transform scale-100 animate-scaleIn border-2 border-emerald-200 dark:border-emerald-700"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-center">
              {/* Tree Display */}
              <div className="relative inline-block mb-4">
                <div className="text-8xl filter drop-shadow-2xl animate-bounce-slow">
                  {getTreeEmoji(selectedTree)}
                </div>
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-16 h-3 bg-black/20 rounded-full blur-md"></div>
              </div>

              <h3 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-3">
                {selectedTree.varietyName || 'Focus Tree'}
              </h3>

              <div className="space-y-2 text-slate-600 dark:text-slate-300 mb-6">
                <div className="flex items-center justify-between px-4 py-2 bg-white/50 dark:bg-slate-700/50 rounded-lg">
                  <span className="text-sm font-medium">Focus Time</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{selectedTree.focusMinutes} min</span>
                </div>
                <div className="flex items-center justify-between px-4 py-2 bg-white/50 dark:bg-slate-700/50 rounded-lg">
                  <span className="text-sm font-medium">Planted</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {selectedTree.plantedAt.toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-2 bg-white/50 dark:bg-slate-700/50 rounded-lg">
                  <span className="text-sm font-medium">Growth</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {selectedTree.growthStage.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedTree(null)}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }

        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out;
        }

        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default GardenLandscape;
