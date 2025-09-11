// ===================================
// PERSONAL GARDEN COMPONENT (components/PersonalGarden.tsx)
// ===================================

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Tree, TreeType, TreeGrowthStage } from '../types';
import TreeComponent from './TreeComponent';
import GardenLandscape from './GardenLandscape';
import * as firebaseService from '../services/firebaseService';

const PersonalGarden: React.FC = () => {
  const { currentUser } = useAuth();
  const [personalTrees, setPersonalTrees] = useState<Tree[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<TreeType | 'All'>('All');
  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'month' | 'all'>('today');
  const [viewMode, setViewMode] = useState<'landscape' | 'grid'>('landscape');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (currentUser) {
      const unsubscribe = firebaseService.setupPersonalGardenListener(currentUser.uid, (trees) => {
        setPersonalTrees(trees);
        setLoading(false);
      });
      return () => unsubscribe();
    }
  }, [currentUser]);

  const getFilteredTrees = () => {
    let filtered = personalTrees;

    // Filter by type
    if (selectedFilter !== 'All') {
      filtered = filtered.filter(tree => tree.type === selectedFilter);
    }

    // Filter by time
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    switch (timeFilter) {
      case 'today':
        filtered = filtered.filter(tree => tree.plantedAt >= today);
        break;
      case 'week':
        filtered = filtered.filter(tree => tree.plantedAt >= weekAgo);
        break;
      case 'month':
        filtered = filtered.filter(tree => tree.plantedAt >= monthAgo);
        break;
      case 'all':
        // No time filtering
        break;
    }

    return filtered;
  };

  const filteredTrees = getFilteredTrees();

  const stats = {
    totalTrees: personalTrees.length,
    aliveTreesTree: personalTrees.filter(t => t.isAlive).length,
    totalFocusHours: Math.round(personalTrees.reduce((sum, t) => sum + t.focusMinutes, 0) / 60),
    matureTreesTree: personalTrees.filter(t => t.growthStage === TreeGrowthStage.MatureTree).length
  };

  const treeTypeFilters = [
    { value: 'All' as const, label: '🌳 All Trees', color: 'from-green-500 to-emerald-500' },
    { value: TreeType.Work, label: '💼 Work', color: 'from-blue-500 to-indigo-500' },
    { value: TreeType.Study, label: '📚 Study', color: 'from-purple-500 to-violet-500' },
    { value: TreeType.QuranReading, label: '📖 Quran', color: 'from-emerald-500 to-teal-500' },
    { value: TreeType.Dhikr, label: '🤲 Dhikr', color: 'from-amber-500 to-orange-500' },
    { value: TreeType.GeneralFocus, label: '🎯 Focus', color: 'from-slate-500 to-gray-500' },
  ];

  const timeFilters = [
    { value: 'today' as const, label: '📅 Today', icon: '🌅' },
    { value: 'week' as const, label: '📆 This Week', icon: '🗓️' },
    { value: 'month' as const, label: '🗓️ This Month', icon: '📋' },
    { value: 'all' as const, label: '🌍 All Time', icon: '♾️' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading your garden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
        <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-md rounded-xl p-4 shadow-lg border border-white/20">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-lg flex items-center justify-center mr-3">
              <span className="text-lg">🌳</span>
            </div>
            <div>
              <p className={`font-bold text-slate-800 dark:text-slate-100 ${isMobile ? 'text-lg' : 'text-xl'}`}>
                {stats.totalTrees}
              </p>
              <p className={`text-slate-600 dark:text-slate-400 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                Trees Planted
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-md rounded-xl p-4 shadow-lg border border-white/20">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-green-500 rounded-lg flex items-center justify-center mr-3">
              <span className="text-lg">💚</span>
            </div>
            <div>
              <p className={`font-bold text-slate-800 dark:text-slate-100 ${isMobile ? 'text-lg' : 'text-xl'}`}>
                {stats.aliveTreesTree}
              </p>
              <p className={`text-slate-600 dark:text-slate-400 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                Alive Trees
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-md rounded-xl p-4 shadow-lg border border-white/20">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-lg flex items-center justify-center mr-3">
              <span className="text-lg">⏰</span>
            </div>
            <div>
              <p className={`font-bold text-slate-800 dark:text-slate-100 ${isMobile ? 'text-lg' : 'text-xl'}`}>
                {stats.totalFocusHours}h
              </p>
              <p className={`text-slate-600 dark:text-slate-400 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                Focus Time
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-md rounded-xl p-4 shadow-lg border border-white/20">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-lg flex items-center justify-center mr-3">
              <span className="text-lg">🌟</span>
            </div>
            <div>
              <p className={`font-bold text-slate-800 dark:text-slate-100 ${isMobile ? 'text-lg' : 'text-xl'}`}>
                {stats.matureTreesTree}
              </p>
              <p className={`text-slate-600 dark:text-slate-400 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                Mature Trees
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Time Filter */}
      <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-md rounded-xl p-4 shadow-lg border border-white/20">
        <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-3">📅 Time Period</h3>
        <div className="flex flex-wrap gap-2">
          {timeFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setTimeFilter(filter.value)}
              className={`px-4 py-2 rounded-xl transition-all duration-200 text-sm font-medium border flex items-center space-x-2 ${
                timeFilter === filter.value
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-transparent shadow-lg transform scale-105'
                  : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'
              }`}
            >
              <span>{filter.icon}</span>
              <span>{filter.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tree Type Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {treeTypeFilters.map((filter) => (
          <button
            key={filter.value}
            onClick={() => setSelectedFilter(filter.value)}
            className={`px-4 py-2 rounded-full transition-all duration-200 text-sm font-medium border ${
              selectedFilter === filter.value
                ? `bg-gradient-to-r ${filter.color} text-white border-transparent shadow-lg`
                : 'bg-white/70 dark:bg-slate-700/70 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:bg-white dark:hover:bg-slate-600'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center justify-between bg-white/70 dark:bg-slate-800/70 backdrop-blur-md rounded-xl p-4 shadow-lg border border-white/20">
        <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">🌳 Garden View</h3>
        <div className="flex rounded-lg p-1 bg-slate-100 dark:bg-slate-700">
          <button
            onClick={() => setViewMode('landscape')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center space-x-2 ${
              viewMode === 'landscape'
                ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span>🏞️</span>
            <span>Landscape</span>
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center space-x-2 ${
              viewMode === 'grid'
                ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span>⚏</span>
            <span>Grid</span>
          </button>
        </div>
      </div>

      {/* Trees Display */}
      {viewMode === 'landscape' ? (
        <GardenLandscape trees={filteredTrees} loading={loading} />
      ) : filteredTrees.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">🌱</span>
          </div>
          <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Your garden awaits
          </h3>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            Complete focus sessions to plant your first tree
          </p>
        </div>
      ) : (
        <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-3 md:grid-cols-4 lg:grid-cols-6'}`}>
          {filteredTrees.map((tree) => (
            <TreeComponent key={tree.id} tree={tree} size={isMobile ? 'sm' : 'md'} />
          ))}
        </div>
      )}
    </div>
  );
};

export default PersonalGarden;