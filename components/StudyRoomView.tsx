// Enhanced StudyRoomView.tsx with Forest-app inspired design
import React, { useState, useEffect } from 'react';
import { StudyRoom, RoomParticipant, TreeType } from '../types';
import { 
  setupRoomListener, 
  setupParticipantsListener, 
  leaveStudyRoom, 
  plantTreeInRoom 
} from '../services/gardenService';
import { useAuth } from '../context/AuthContext';
import TreeComponent from './TreeComponent';
import { PlayIcon, PauseIcon, ChevronLeftIcon, ShareIcon, UsersIcon } from './icons/NavIcons';

interface StudyRoomViewProps {
  roomId: string;
  onLeaveRoom: () => void;
}

const StudyRoomView: React.FC<StudyRoomViewProps> = ({ roomId, onLeaveRoom }) => {
  const { currentUser } = useAuth();
  const [room, setRoom] = useState<StudyRoom | null>(null);
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [isFocusing, setIsFocusing] = useState(false);
  const [focusStartTime, setFocusStartTime] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [showTreePlantingModal, setShowTreePlantingModal] = useState(false);
  const [lastSessionMinutes, setLastSessionMinutes] = useState(0);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const roomUnsub = setupRoomListener(roomId, (updatedRoom) => {
      if (!updatedRoom) {
        // Room was deleted, navigate back
        alert('This study circle has been closed.');
        onLeaveRoom();
        return;
      }
      setRoom(updatedRoom);
    });
    
    const participantsUnsub = setupParticipantsListener(roomId, setParticipants);

    return () => {
      roomUnsub();
      participantsUnsub();
    };
  }, [roomId, onLeaveRoom]);

  useEffect(() => {
    if (room) {
      setTimeLeft(room.focusDuration * 60);
    }
  }, [room]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isFocusing && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsFocusing(false);
            const focusMinutes = room?.focusDuration || 25;
            setLastSessionMinutes(focusMinutes);
            setShowTreePlantingModal(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isFocusing, timeLeft, room]);

  const handleShareRoom = async () => {
    const inviteLink = `${window.location.origin}/join/${roomId}`;
    
    if (navigator.share && isMobile) {
      try {
        await navigator.share({
          title: `Join ${room?.name} Study Circle`,
          text: `Join our focused study session on Salsabil!`,
          url: inviteLink
        });
      } catch (error) {
        // Fall back to clipboard
        copyToClipboard(inviteLink);
      }
    } else {
      copyToClipboard(inviteLink);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 2000);
      } catch (fallbackErr) {
        console.error('Failed to copy link');
      }
      document.body.removeChild(textArea);
    }
  };

  const handleStartFocus = () => {
    if (!room) return;
    setIsFocusing(true);
    setFocusStartTime(new Date());
    setTimeLeft(room.focusDuration * 60);
  };

  const handleStopFocus = () => {
    if (!focusStartTime) return;
    const focusMinutes = Math.round((Date.now() - focusStartTime.getTime()) / (1000 * 60));
    setIsFocusing(false);
    setFocusStartTime(null);
    
    if (focusMinutes > 0) {
      setLastSessionMinutes(focusMinutes);
      setShowTreePlantingModal(true);
    }
  };

  const handleLeaveRoom = async () => {
    if (!currentUser) return;
    
    const confirmLeave = window.confirm('Are you sure you want to leave this study circle?');
    if (!confirmLeave) return;
    
    try {
      await leaveStudyRoom(roomId, currentUser.uid);
      onLeaveRoom();
    } catch (error) {
      console.error('Error leaving room:', error);
      alert('Failed to leave the circle. Please try again.');
    }
  };

  const handlePlantTree = async () => {
    if (!currentUser || !room) return;
    
    try {
      await plantTreeInRoom(
        roomId, 
        currentUser.uid, 
        currentUser.displayName || 'Anonymous', 
        room.treeType, 
        lastSessionMinutes
      );
      setShowTreePlantingModal(false);
    } catch (error) {
      console.error('Error planting tree:', error);
      alert('Failed to plant tree. Please try again.');
    }
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getTreeTypeIcon = (type: TreeType) => {
    switch (type) {
      case TreeType.Work: return '💼';
      case TreeType.Study: return '📚';
      case TreeType.QuranReading: return '📖';
      case TreeType.Dhikr: return '🤲';
      case TreeType.GeneralFocus: return '🎯';
      default: return '🌳';
    }
  };

  const getTreeTypeColor = (type: TreeType) => {
    switch (type) {
      case TreeType.Work: return 'from-blue-500 to-indigo-500';
      case TreeType.Study: return 'from-purple-500 to-violet-500';
      case TreeType.QuranReading: return 'from-emerald-500 to-teal-500';
      case TreeType.Dhikr: return 'from-amber-500 to-orange-500';
      case TreeType.GeneralFocus: return 'from-slate-500 to-gray-500';
      default: return 'from-green-500 to-emerald-500';
    }
  };

  if (!room) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading study circle...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${isMobile ? 'pb-20' : ''}`}>
      {/* Enhanced Header */}
      <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 overflow-hidden">
        <div className={`bg-gradient-to-r ${getTreeTypeColor(room.treeType)} p-6 text-white relative`}>
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={onLeaveRoom}
                className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                title="Back to circles"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleShareRoom}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-full bg-white/20 hover:bg-white/30 transition-all duration-200 ${
                    shareSuccess ? 'bg-green-500/80' : ''
                  }`}
                  title="Share circle"
                >
                  <ShareIcon className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {shareSuccess ? 'Copied!' : 'Share'}
                  </span>
                </button>
                
                <button
                  onClick={handleLeaveRoom}
                  className="px-4 py-2 bg-red-500/20 hover:bg-red-500/40 rounded-full transition-colors flex items-center space-x-2"
                >
                  <span className="text-sm font-medium">Leave</span>
                </button>
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-4xl mb-2">{getTreeTypeIcon(room.treeType)}</div>
              <h1 className="text-2xl font-bold mb-2">{room.name}</h1>
              <p className="text-white/90 text-sm mb-4">{room.description}</p>
              
              <div className="flex items-center justify-center space-x-6 text-sm">
                <div className="flex items-center space-x-1">
                  <UsersIcon className="w-4 h-4" />
                  <span>{participants.length}/{room.maxParticipants}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <span>{room.focusDuration}m sessions</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span>🌳</span>
                  <span>{room.trees.length} trees</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Focus Timer */}
      <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 p-8 text-center">
        <div className="relative mb-8">
          {/* Circular Progress Ring */}
          <div className="relative w-48 h-48 mx-auto">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                className="text-slate-200 dark:text-slate-700"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="url(#gradient)"
                strokeWidth="8"
                fill="transparent"
                strokeDasharray={`${2 * Math.PI * 40}`}
                strokeDashoffset={`${2 * Math.PI * 40 * (1 - (room.focusDuration * 60 - timeLeft) / (room.focusDuration * 60))}`}
                strokeLinecap="round"
                className="transition-all duration-300 drop-shadow-lg"
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
              </defs>
            </svg>
            
            {/* Timer Display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-4xl font-mono font-bold text-slate-800 dark:text-slate-100 mb-2">
                {formatTime(timeLeft)}
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                {isFocusing ? 'Focusing...' : 'Ready to focus'}
              </div>
              
              {/* Tree preview in center */}
              <div className="mt-3 text-3xl opacity-60">
                {getTreeTypeIcon(room.treeType)}
              </div>
            </div>
          </div>
        </div>
        
        {/* Enhanced Controls */}
        <div className="flex justify-center space-x-4 mb-6">
          <button
            onClick={isFocusing ? handleStopFocus : handleStartFocus}
            className={`px-8 py-4 rounded-2xl text-white font-semibold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 ${
              isFocusing 
                ? 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600' 
                : `bg-gradient-to-r ${getTreeTypeColor(room.treeType)} hover:opacity-90`
            }`}
          >
            <div className="flex items-center space-x-3">
              {isFocusing ? (
                <>
                  <PauseIcon className="w-6 h-6" />
                  <span>Stop Focus</span>
                </>
              ) : (
                <>
                  <PlayIcon className="w-6 h-6" />
                  <span>Start Focus</span>
                </>
              )}
            </div>
          </button>
        </div>

        {/* Focus Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {participants.reduce((total, p) => total + p.totalFocusMinutes, 0)}m
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">Total Group Focus</div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {participants.filter(p => p.isActive).length}
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">Active Members</div>
          </div>
        </div>
      </div>

      {/* Enhanced Participants */}
      <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center">
            <UsersIcon className="w-5 h-5 mr-2" />
            Circle Members ({participants.length}/{room.maxParticipants})
          </h3>
          
          <div className="flex items-center space-x-2 text-sm text-slate-500 dark:text-slate-400">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>{participants.filter(p => p.isActive).length} active</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {participants.map((participant) => (
            <div
              key={participant.userId}
              className={`relative p-4 rounded-xl border transition-all duration-300 ${
                participant.isActive 
                  ? 'bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-emerald-200 dark:border-emerald-700'
                  : 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600'
              }`}
            >
              {/* Online indicator */}
              <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${
                participant.isActive ? 'bg-green-500 shadow-lg shadow-green-500/50' : 'bg-slate-400'
              }`}>
                {participant.isActive && (
                  <div className="absolute inset-0 bg-green-500 rounded-full animate-ping"></div>
                )}
              </div>
              
              <div className="flex items-center space-x-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold text-white shadow-lg ${
                  participant.userId === currentUser?.uid 
                    ? 'bg-gradient-to-br from-indigo-500 to-purple-600' 
                    : 'bg-gradient-to-br from-blue-400 to-indigo-500'
                }`}>
                  {participant.displayName.charAt(0).toUpperCase()}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <p className="font-medium text-slate-800 dark:text-slate-100">
                      {participant.displayName}
                    </p>
                    {participant.userId === currentUser?.uid && (
                      <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 text-xs rounded-full">
                        You
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm text-slate-500 dark:text-slate-400">
                    <span>🌳 {participant.treesPlanted}</span>
                    <span>⏰ {participant.totalFocusMinutes}m</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Enhanced Garden with Forest-like UI */}
      <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center">
            <span className="mr-2">🌲</span>
            Sacred Grove ({room.trees.length} trees planted)
          </h3>
          
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Growing together in focus
          </div>
        </div>
        
        {room.trees.length === 0 ? (
          <div className="text-center py-16 bg-gradient-to-b from-emerald-50 to-teal-50 dark:from-emerald-900/10 dark:to-teal-900/10 rounded-xl">
            <div className="w-24 h-24 bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-800/20 dark:to-teal-800/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">🌱</span>
            </div>
            <h4 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Plant the First Tree
            </h4>
            <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Complete a focus session to plant the first tree in this sacred grove. 
              Watch as your collective forest grows with each moment of dedicated focus.
            </p>
          </div>
        ) : (
          <div className="relative">
            {/* Forest Floor */}
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-emerald-200/50 to-transparent dark:from-emerald-800/30 rounded-b-xl"></div>
            
            {/* Trees arranged in a forest-like pattern */}
            <div className="relative z-10 min-h-[200px] flex flex-wrap items-end justify-center gap-2 p-4 overflow-hidden">
              {room.trees.map((tree, index) => (
                <div 
                  key={tree.id} 
                  className="transform transition-all duration-300 hover:scale-110"
                  style={{ 
                    zIndex: room.trees.length - index,
                    transform: `translateY(${Math.sin(index * 0.5) * 10}px)`
                  }}
                >
                  <TreeComponent tree={tree} size="md" showDetails={false} />
                  
                  {/* Tree tooltip on hover */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                    <div className="bg-black/75 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                      By {tree.plantedByName} • {tree.focusMinutes}m
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Floating particles effect */}
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1 h-1 bg-emerald-400/40 rounded-full animate-pulse"
                  style={{
                    left: `${20 + (i * 15)}%`,
                    top: `${30 + (i % 3) * 20}%`,
                    animationDelay: `${i * 0.5}s`,
                    animationDuration: `${2 + (i % 3)}s`
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tree Planting Modal */}
      {showTreePlantingModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 w-full max-w-md">
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                  <span className="text-3xl">🌳</span>
                </div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
                  🎉 Focus Session Complete!
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  You focused for <strong>{lastSessionMinutes} minutes</strong> on {room.treeType.toLowerCase()}. 
                  Plant a tree to celebrate your achievement!
                </p>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowTreePlantingModal(false)}
                  className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  Skip
                </button>
                <button
                  onClick={handlePlantTree}
                  className={`flex-1 px-4 py-3 text-white rounded-xl transition-all shadow-lg hover:shadow-xl bg-gradient-to-r ${getTreeTypeColor(room.treeType)}`}
                >
                  Plant Tree 🌱
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudyRoomView;