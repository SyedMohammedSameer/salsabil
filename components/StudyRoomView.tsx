// Enhanced StudyRoomView.tsx with Forest-app inspired design
import React, { useState, useEffect } from 'react';
import { StudyRoom, RoomParticipant, TreeType } from '../types';
import { 
  setupRoomListener, 
  setupParticipantsListener, 
  leaveStudyRoom, 
  plantTreeInRoom,
  startRoomFocusSession,
  stopRoomFocusSession
} from '../services/gardenService';
import { useAuth } from '../context/AuthContext';
import { useTimer } from '../context/TimerContext';
import TreeComponent from './TreeComponent';
import { PlayIcon, PauseIcon, ChevronLeftIcon, ShareIcon, UsersIcon } from './icons/NavIcons';

interface StudyRoomViewProps {
  roomId: string;
  onLeaveRoom: () => void;
}

const StudyRoomView: React.FC<StudyRoomViewProps> = ({ roomId, onLeaveRoom }) => {
  const { currentUser } = useAuth();
  const { timerState, updateStudyCircleTimer, resetStudyCircleTimer } = useTimer();
  const [room, setRoom] = useState<StudyRoom | null>(null);
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [roomFocusStartTime, setRoomFocusStartTime] = useState<Date | null>(null);
  const [isRoomFocusing, setIsRoomFocusing] = useState(false);
  const [showTreePlantingModal, setShowTreePlantingModal] = useState(false);
  const [lastSessionMinutes, setLastSessionMinutes] = useState(0);
  const [selectedTreeType, setSelectedTreeType] = useState<TreeType>(TreeType.GeneralFocus);
  const [treePlanted, setTreePlanted] = useState(false);
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
      
      // Sync room focus session state
      if (updatedRoom.currentSessionStart) {
        let sessionStart: Date;
        if (updatedRoom.currentSessionStart instanceof Date) {
          sessionStart = updatedRoom.currentSessionStart;
        } else {
          sessionStart = new Date(updatedRoom.currentSessionStart);
        }
        
        setRoomFocusStartTime(sessionStart);
        setIsRoomFocusing(true);
        
        // Calculate time left based on room session
        const elapsed = Date.now() - sessionStart.getTime();
        const remaining = Math.max(0, (updatedRoom.focusDuration * 60 * 1000) - elapsed);
        const remainingSeconds = Math.ceil(remaining / 1000);
        setTimeLeft(remainingSeconds);
        
        // Update global timer state
        updateStudyCircleTimer(roomId, true, remainingSeconds, sessionStart);
      } else {
        setRoomFocusStartTime(null);
        setIsRoomFocusing(false);
        setTimeLeft(updatedRoom.focusDuration * 60);
        
        // Update global timer state
        updateStudyCircleTimer(roomId, false, updatedRoom.focusDuration * 60, null);
      }
    });
    
    const participantsUnsub = setupParticipantsListener(roomId, setParticipants);

    return () => {
      roomUnsub();
      participantsUnsub();
    };
  }, [roomId, onLeaveRoom]);

  // Load persisted timer state on component mount
  useEffect(() => {
    if (timerState.studyCircleRoomId === roomId && timerState.studyCircleIsRunning) {
      setTimeLeft(timerState.studyCircleTimeLeft);
      setIsRoomFocusing(true);
      if (timerState.studyCircleStartTime) {
        setRoomFocusStartTime(timerState.studyCircleStartTime);
      }
    }
  }, [roomId, timerState]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isRoomFocusing && roomFocusStartTime && room) {
      interval = setInterval(() => {
        const elapsed = Date.now() - roomFocusStartTime.getTime();
        const remaining = Math.max(0, (room.focusDuration * 60 * 1000) - elapsed);
        const remainingSeconds = Math.ceil(remaining / 1000);
        
        setTimeLeft(remainingSeconds);
        
        // Update global timer state
        updateStudyCircleTimer(roomId, true, remainingSeconds, roomFocusStartTime);
        
        if (remainingSeconds <= 0) {
          // Session completed
          const focusMinutes = room.focusDuration;
          setLastSessionMinutes(focusMinutes);
          setShowTreePlantingModal(true);
          setIsRoomFocusing(false);
          setRoomFocusStartTime(null);
          
          // Reset global timer state
          resetStudyCircleTimer();
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRoomFocusing, roomFocusStartTime, room, updateStudyCircleTimer, resetStudyCircleTimer, roomId]);

  const handleShareRoom = async () => {
    if (!room) {
      alert('Room information not available. Please try again.');
      return;
    }
    
    const inviteLink = `${window.location.origin}/join/${roomId}`;
    console.log('🔗 Generated invite link:', inviteLink);
    console.log('🌐 Current origin:', window.location.origin);
    console.log('🆔 Room ID:', roomId);
    
    const shareText = `🌳 Join "${room.name}" Study Circle!\n\nFocus together and grow your virtual garden. Duration: ${room.focusDuration} minutes\n\nJoin here: ${inviteLink}`;
    
    if (navigator.share && isMobile) {
      try {
        await navigator.share({
          title: `Join ${room.name} Study Circle`,
          text: `🌳 Focus together and grow your virtual garden! Duration: ${room.focusDuration} minutes`,
          url: inviteLink
        });
        return;
      } catch (error) {
        console.log('Native sharing failed, falling back to clipboard');
      }
    }
    
    // Fall back to clipboard with full text
    copyToClipboard(shareText);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setShareSuccess(true);
      alert('📋 Invite link copied to clipboard! Share it with your friends to join the study circle.');
      setTimeout(() => setShareSuccess(false), 3000);
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
        alert('📋 Invite link copied to clipboard! Share it with your friends to join the study circle.');
        setTimeout(() => setShareSuccess(false), 3000);
      } catch (fallbackErr) {
        console.error('Failed to copy link');
        alert('❌ Failed to copy the link. Please try again or copy the URL manually.');
      }
      document.body.removeChild(textArea);
    }
  };

  const handleStartFocus = async () => {
    if (!room || isRoomFocusing) return;
    
    try {
      setTreePlanted(false); // Reset tree planting for new session
      await startRoomFocusSession(roomId);
      // The room listener will update the local state
    } catch (error) {
      console.error('Failed to start focus session:', error);
      alert('Failed to start focus session. Please try again.');
    }
  };

  const handleStopFocus = async () => {
    if (!room || !isRoomFocusing || !roomFocusStartTime) return;
    
    try {
      await stopRoomFocusSession(roomId);
      
      // Calculate focus time for tree planting
      const focusMinutes = Math.round((Date.now() - roomFocusStartTime.getTime()) / (1000 * 60));
      if (focusMinutes > 0) {
        setLastSessionMinutes(focusMinutes);
        setShowTreePlantingModal(true);
      }
      
      // Reset global timer state
      resetStudyCircleTimer();
    } catch (error) {
      console.error('Failed to stop focus session:', error);
      alert('Failed to stop focus session. Please try again.');
    }
  };

  const handleLeaveRoom = async () => {
    if (!currentUser) return;
    
    const confirmLeave = window.confirm('Are you sure you want to leave this study circle?');
    if (!confirmLeave) return;
    
    try {
      await leaveStudyRoom(roomId, currentUser.uid);
      // Reset global timer state when leaving
      resetStudyCircleTimer();
      onLeaveRoom();
    } catch (error) {
      console.error('Error leaving room:', error);
      alert('Failed to leave the circle. Please try again.');
    }
  };

  const handlePlantTree = async () => {
    if (!currentUser || !room || treePlanted) return;
    
    try {
      await plantTreeInRoom(
        roomId, 
        currentUser.uid, 
        currentUser.displayName || 'Anonymous', 
        selectedTreeType, 
        lastSessionMinutes
      );
      setTreePlanted(true); // Mark tree as planted for this session
      setShowTreePlantingModal(false);
      setSelectedTreeType(TreeType.GeneralFocus); // Reset for next time
      alert('🌳 Tree planted successfully! Your focus garden is growing!');
    } catch (error) {
      console.error('Error planting tree:', error);
      alert('Failed to plant tree. Please try again.');
    }
  };

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || seconds < 0) {
      return '00:00';
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getTreeVarietiesForDuration = (minutes: number) => {
    if (minutes >= 50) {
      // Long session - beautiful mature trees
      return [
        { emoji: '🌸', name: 'Cherry Blossom', type: TreeType.GeneralFocus, color: 'from-pink-500 to-rose-500' },
        { emoji: '🌺', name: 'Hibiscus', type: TreeType.Study, color: 'from-red-500 to-pink-500' },
        { emoji: '🏵️', name: 'Rosette', type: TreeType.Work, color: 'from-orange-500 to-red-500' },
      ];
    } else if (minutes >= 30) {
      // Medium session - flowering trees
      return [
        { emoji: '🌻', name: 'Sunflower', type: TreeType.GeneralFocus, color: 'from-yellow-500 to-orange-500' },
        { emoji: '🌷', name: 'Tulip Tree', type: TreeType.Study, color: 'from-purple-500 to-pink-500' },
        { emoji: '🌹', name: 'Rose Bush', type: TreeType.Work, color: 'from-red-500 to-pink-600' },
      ];
    } else if (minutes >= 15) {
      // Standard session - green trees
      return [
        { emoji: '🌳', name: 'Oak Tree', type: TreeType.GeneralFocus, color: 'from-green-500 to-emerald-500' },
        { emoji: '🌲', name: 'Pine Tree', type: TreeType.Study, color: 'from-emerald-500 to-teal-500' },
        { emoji: '🌴', name: 'Palm Tree', type: TreeType.Work, color: 'from-teal-500 to-cyan-500' },
      ];
    } else {
      // Short session - small plants
      return [
        { emoji: '🌿', name: 'Herb', type: TreeType.GeneralFocus, color: 'from-green-400 to-emerald-400' },
        { emoji: '🌱', name: 'Sprout', type: TreeType.Study, color: 'from-lime-400 to-green-400' },
        { emoji: '🍀', name: 'Clover', type: TreeType.Work, color: 'from-emerald-400 to-green-500' },
      ];
    }
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
          <div className="relative w-64 h-64 mx-auto">
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
                {isRoomFocusing ? '' : ''}
              </div>
              
              {/* Animated growing tree in center */}
              <div className="mt-3">
                {isRoomFocusing ? (
                  <div className="relative">
                    {/* Growing tree animation */}
                    <div 
                      className="text-6xl transition-all duration-1000 transform"
                      style={{
                        transform: `scale(${0.4 + (room.focusDuration * 60 - timeLeft) / (room.focusDuration * 60) * 1.0})`,
                        opacity: 0.6 + (room.focusDuration * 60 - timeLeft) / (room.focusDuration * 60) * 0.4
                      }}
                    >
                      {/* Tree grows from seed to full tree */}
                      {(() => {
                        const progress = (room.focusDuration * 60 - timeLeft) / (room.focusDuration * 60);
                        if (progress < 0.2) return '🌱'; // Seed/sprout
                        if (progress < 0.4) return '🌿'; // Young plant
                        if (progress < 0.6) return '🌳'; // Small tree
                        if (progress < 0.8) return '🌲'; // Growing tree
                        return '🌴'; // Mature tree
                      })()}
                    </div>
                    {/* Floating particles around growing tree */}
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute top-0 left-1/2 w-1 h-1 bg-green-400 rounded-full animate-ping" style={{animationDelay: '0s'}}></div>
                      <div className="absolute top-2 right-1/3 w-1 h-1 bg-emerald-400 rounded-full animate-ping" style={{animationDelay: '1s'}}></div>
                      <div className="absolute bottom-1 left-1/3 w-1 h-1 bg-teal-400 rounded-full animate-ping" style={{animationDelay: '2s'}}></div>
                    </div>
                  </div>
                ) : (
                  <div className="text-5xl opacity-60">
                    🌱
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Enhanced Controls */}
        <div className="flex justify-center space-x-4 mb-6">
          <button
            onClick={isRoomFocusing ? handleStopFocus : handleStartFocus}
            disabled={!room}
            className={`px-8 py-4 rounded-2xl text-white font-semibold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
              isRoomFocusing 
                ? 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600' 
                : `bg-gradient-to-r ${getTreeTypeColor(room?.treeType || TreeType.GeneralFocus)} hover:opacity-90`
            }`}
          >
            <div className="flex items-center space-x-3">
              {isRoomFocusing ? (
                <>
                  <PauseIcon className="w-6 h-6" />
                  <span>Stop Circle Focus</span>
                </>
              ) : (
                <>
                  <PlayIcon className="w-6 h-6" />
                  <span>Start Circle Focus</span>
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
                  You focused for <strong>{lastSessionMinutes} minutes</strong>! 
                  Choose what type of tree to plant to celebrate your achievement!
                </p>
              </div>

              {/* Beautiful Tree Selection */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Choose Your Tree:</h4>
                <div className="grid grid-cols-3 gap-2">
                  {getTreeVarietiesForDuration(lastSessionMinutes).map((tree, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedTreeType(tree.type)}
                      className={`p-3 rounded-xl text-sm font-medium transition-all duration-200 border ${
                        selectedTreeType === tree.type
                          ? `bg-gradient-to-r ${tree.color} text-white border-transparent shadow-lg transform scale-105`
                          : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'
                      }`}
                    >
                      <div className="flex flex-col items-center space-y-1">
                        <span className="text-2xl">{tree.emoji}</span>
                        <span className="text-xs">{tree.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
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
                  disabled={treePlanted}
                  className={`flex-1 px-4 py-3 text-white rounded-xl transition-all shadow-lg hover:shadow-xl ${
                    treePlanted 
                      ? 'bg-gray-400 cursor-not-allowed opacity-50' 
                      : `bg-gradient-to-r ${getTreeVarietiesForDuration(lastSessionMinutes).find(t => t.type === selectedTreeType)?.color || 'from-green-500 to-emerald-500'}`
                  }`}
                >
                  {treePlanted ? '✅ Tree Planted!' : `Plant ${getTreeVarietiesForDuration(lastSessionMinutes).find(t => t.type === selectedTreeType)?.emoji || '🌱'} Tree`}
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