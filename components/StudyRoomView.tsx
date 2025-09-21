// Enhanced StudyRoomView.tsx with Forest-app inspired design
import React, { useState, useEffect, useRef } from 'react';
import { StudyRoom, RoomParticipant, TreeType } from '../types';
import {
  setupRoomListener,
  setupParticipantsListener,
  leaveStudyRoom,
  plantTreeInRoom,
  startRoomFocusSession,
  stopRoomFocusSession,
  toggleParticipantReady
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
  const [selectedTreeVariety, setSelectedTreeVariety] = useState({ emoji: '🌳', name: 'Oak Tree', color: 'from-green-500 to-emerald-500' });
  const [treePlanted, setTreePlanted] = useState(false);
  const [plantedInCurrentSession, setPlantedInCurrentSession] = useState<string | null>(null);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isPlantingTree, setIsPlantingTree] = useState(false);
  const [isLeavingRoom, setIsLeavingRoom] = useState(false);
  const [isStartingFocus, setIsStartingFocus] = useState(false);
  const [isStoppingFocus, setIsStoppingFocus] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [sessionJustEnded, setSessionJustEnded] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isTogglingReady, setIsTogglingReady] = useState(false);
  const hasAutoStoppedRef = useRef(false);
  const previousSessionRef = useRef<Date | null>(null);

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
        previousSessionRef.current = sessionStart;

        // Calculate time left based on room session
        const elapsed = Date.now() - sessionStart.getTime();
        const remaining = Math.max(0, (updatedRoom.focusDuration * 60 * 1000) - elapsed);
        const remainingSeconds = Math.ceil(remaining / 1000);
        setTimeLeft(remainingSeconds);

        // Update global timer state
        updateStudyCircleTimer(roomId, true, remainingSeconds, sessionStart);
      } else {
        // Session ended - check if we just completed a session
        if (previousSessionRef.current && isRoomFocusing) {
          const sessionDuration = updatedRoom.focusDuration;
          const sessionId = previousSessionRef.current.toISOString();
          setLastSessionMinutes(sessionDuration);
          setSessionJustEnded(true);
          setSessionCompleted(true);

          // Show tree planting modal for all participants who haven't planted for this session
          if (currentUser && sessionDuration > 0 && plantedInCurrentSession !== sessionId) {
            setShowTreePlantingModal(true);
          }
        }

        setRoomFocusStartTime(null);
        setIsRoomFocusing(false);
        setTimeLeft(updatedRoom.focusDuration * 60);
        previousSessionRef.current = null;

        // Update global timer state
        updateStudyCircleTimer(roomId, false, updatedRoom.focusDuration * 60, null);
      }
    });

    const participantsUnsub = setupParticipantsListener(roomId, (updatedParticipants) => {
      setParticipants(updatedParticipants);

      // Update current user's ready state
      if (currentUser) {
        const currentUserParticipant = updatedParticipants.find(p => p.userId === currentUser.uid);
        if (currentUserParticipant) {
          setIsReady(currentUserParticipant.isReady || false);
        }
      }
    });

    return () => {
      roomUnsub();
      participantsUnsub();
    };
  }, [roomId]); // Remove onLeaveRoom dependency to prevent unnecessary re-renders

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

  // Create stable references for functions to avoid useEffect recreation
  const updateTimerRef = useRef(updateStudyCircleTimer);
  const resetTimerRef = useRef(resetStudyCircleTimer);
  const currentUserRef = useRef(currentUser);
  
  updateTimerRef.current = updateStudyCircleTimer;
  resetTimerRef.current = resetStudyCircleTimer;
  currentUserRef.current = currentUser;

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    let isMounted = true; // Prevent state updates after unmount

    if (isRoomFocusing && roomFocusStartTime && room) {
      interval = setInterval(() => {
        if (!isMounted) return; // Skip if component unmounted

        const elapsed = Date.now() - roomFocusStartTime.getTime();
        const remaining = Math.max(0, (room.focusDuration * 60 * 1000) - elapsed);
        const remainingSeconds = Math.ceil(remaining / 1000);

        setTimeLeft(remainingSeconds);

        // Update global timer state
        updateTimerRef.current(roomId, true, remainingSeconds, roomFocusStartTime);

        if (remainingSeconds <= 0) {
          // Clear the interval first to prevent multiple calls
          if (interval) {
            clearInterval(interval);
            interval = null;
          }

          // Session completed - handle auto-stop async
          const handleSessionComplete = async () => {
            if (!isMounted) return;

            const focusMinutes = room.focusDuration;

            try {
              // Auto-stop the session first
              await stopRoomFocusSession(roomId);
            } catch (error) {
              console.error('Failed to stop room session:', error);
            }

            if (!isMounted) return; // Check again before state updates

            // Then update UI state
            setIsRoomFocusing(false);
            setRoomFocusStartTime(null);
            setSessionCompleted(true);
            resetTimerRef.current();

            // Show confirmation to plant tree - allow all participants
            if (currentUserRef.current && focusMinutes > 0) {
              setLastSessionMinutes(focusMinutes);
              setShowTreePlantingModal(true);
            }
          };

          handleSessionComplete();
        }
      }, 1000);
    }

    return () => {
      isMounted = false; // Mark as unmounted
      if (interval) clearInterval(interval);
    };
  }, [isRoomFocusing, roomFocusStartTime, room?.focusDuration, roomId]); // More specific dependencies

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
    if (!room || isRoomFocusing || isStartingFocus) return;

    // Check if current user is the room owner
    if (!currentUser || currentUser.uid !== room.createdBy) {
      alert('⚠️ Only the circle owner can start the focus session. The current owner is ' + room.createdByName + '.');
      return;
    }

    setIsStartingFocus(true);
    try {
      setTreePlanted(false); // Reset tree planting for new session
      setPlantedInCurrentSession(null); // Reset session tracking
      setSessionCompleted(false); // Reset session completion state
      setIsReady(false); // Reset ready status for new session
      hasAutoStoppedRef.current = false; // allow auto-stop for the new session

      // Reset ready status for current user
      if (currentUser) {
        await toggleParticipantReady(roomId, currentUser.uid, false);
      }

      await startRoomFocusSession(roomId);
      // The room listener will update the local state
    } catch (error) {
      console.error('Failed to start focus session:', error);
      alert('Failed to start focus session. Please try again.');
    } finally {
      setIsStartingFocus(false);
    }
  };

  const handleStopFocus = async () => {
    if (!room || !isRoomFocusing || !roomFocusStartTime || isStoppingFocus) return;

    // Check if current user is the room owner
    if (!currentUser || currentUser.uid !== room.createdBy) {
      alert('⚠️ Only the circle owner can stop the focus session. The current owner is ' + room.createdByName + '.');
      return;
    }

    setIsStoppingFocus(true);
    try {
      // Calculate elapsed time
      const focusMinutes = Math.round((Date.now() - roomFocusStartTime.getTime()) / (1000 * 60));
      const plannedMinutes = room.focusDuration;
      const isEarlyStop = focusMinutes < plannedMinutes;

      // Ask user if they want to kill trees for early stop
      let killTrees = false;
      if (isEarlyStop) {
        const userChoice = window.confirm(
          `⚠️ You're stopping the session early (${focusMinutes}/${plannedMinutes} minutes completed).\n\n` +
          `Do you want to kill all trees in the garden as a consequence?\n\n` +
          `• Click "OK" to kill trees (represents failed commitment)\n` +
          `• Click "Cancel" to keep trees alive (lenient mode)`
        );
        killTrees = userChoice;
      }

      await stopRoomFocusSession(roomId, killTrees);

      // Show confirmation to plant tree after manual stop (only if trees weren't killed)
      if (focusMinutes > 0 && currentUser && !killTrees) {
        setLastSessionMinutes(focusMinutes);
        setShowTreePlantingModal(true);
      } else if (killTrees) {
        alert('⚰️ Session stopped early. All trees in the garden have died as a consequence of the broken commitment.');
      } else {
        alert('⏸️ Session stopped.');
      }

      // Reset global timer state
      resetStudyCircleTimer();
    } catch (error) {
      console.error('Failed to stop focus session:', error);
      alert('Failed to stop focus session. Please try again.');
    } finally {
      setIsStoppingFocus(false);
    }
  };

  // Failsafe: auto-stop and prompt when timeLeft hits 0 even if interval is throttled
  useEffect(() => {
    const performAutoStop = async () => {
      if (!room || !isRoomFocusing || hasAutoStoppedRef.current) return;
      hasAutoStoppedRef.current = true;

      const focusMinutes = room.focusDuration;
      try {
        await stopRoomFocusSession(roomId);
      } catch (error) {
        console.error('Failed to stop room session (failsafe):', error);
      }

      setIsRoomFocusing(false);
      setRoomFocusStartTime(null);
      setSessionCompleted(true);
      resetStudyCircleTimer();

      if (currentUserRef.current && focusMinutes > 0) {
        setLastSessionMinutes(focusMinutes);
        setShowTreePlantingModal(true);
      }
    };

    if (isRoomFocusing && timeLeft <= 0) {
      performAutoStop();
    }
  }, [timeLeft, isRoomFocusing, room, roomId, resetStudyCircleTimer]);

  const handleLeaveRoom = async () => {
    if (!currentUser || isLeavingRoom) return;

    const confirmLeave = window.confirm('Are you sure you want to leave this study circle?');
    if (!confirmLeave) return;

    setIsLeavingRoom(true);

    try {
      // Immediate UI feedback - navigate away first for instant response
      resetStudyCircleTimer();
      onLeaveRoom(); // Navigate immediately for better UX

      // Then perform the database operation in background
      await leaveStudyRoom(roomId, currentUser.uid);
      console.log('✅ Successfully left study circle');
    } catch (error) {
      console.error('❌ Error leaving room:', error);
      // Show error but don't navigate back since user already left the view
      // This is intentional - better to complete the UI action and handle errors in background
    }
    // Note: Don't reset isLeavingRoom since component will unmount
  };

  const handleToggleReady = async () => {
    if (!currentUser || !room || isTogglingReady) return;

    setIsTogglingReady(true);
    try {
      const newReadyState = !isReady;
      await toggleParticipantReady(roomId, currentUser.uid, newReadyState);
      // Note: setIsReady will be updated via the participants listener
    } catch (error) {
      console.error('Error toggling ready state:', error);
      alert('Failed to update ready status. Please try again.');
    } finally {
      setIsTogglingReady(false);
    }
  };

  const handlePlantTree = async () => {
    if (!currentUser || !room || treePlanted || isPlantingTree) return;

    setIsPlantingTree(true);
    try {
      await plantTreeInRoom(
        roomId,
        currentUser.uid,
        currentUser.displayName || 'Anonymous',
        room.treeType, // Use the room's tree type instead of hardcoded GeneralFocus
        lastSessionMinutes,
        selectedTreeVariety // Pass the selected tree variety
      );

      // Mark tree as planted for this session
      setTreePlanted(true);
      if (previousSessionRef.current) {
        setPlantedInCurrentSession(previousSessionRef.current.toISOString());
      }

      setShowTreePlantingModal(false);
      setSelectedTreeVariety({ emoji: '🌳', name: 'Oak Tree', color: 'from-green-500 to-emerald-500' }); // Reset to default
      alert('🌳 Tree planted successfully! Your focus garden is growing!');
    } catch (error) {
      console.error('Error planting tree:', error);
      alert('Failed to plant tree. Please try again.');
    } finally {
      setIsPlantingTree(false);
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

  const getAvailableTreeVarieties = () => {
    return [
      { emoji: '🌳', name: 'Oak Tree', color: 'from-green-500 to-emerald-500' },
      { emoji: '🌲', name: 'Pine Tree', color: 'from-emerald-600 to-teal-600' },
      { emoji: '🌴', name: 'Palm Tree', color: 'from-teal-500 to-cyan-500' },
      { emoji: '🌸', name: 'Cherry Blossom', color: 'from-pink-500 to-rose-500' },
      { emoji: '🌺', name: 'Hibiscus', color: 'from-red-500 to-pink-500' },
      { emoji: '🌻', name: 'Sunflower', color: 'from-yellow-500 to-orange-500' },
      { emoji: '🌷', name: 'Tulip Tree', color: 'from-purple-500 to-pink-500' },
      { emoji: '🌹', name: 'Rose Bush', color: 'from-rose-500 to-pink-600' },
      { emoji: '🌿', name: 'Herb Garden', color: 'from-green-400 to-emerald-400' },
      { emoji: '🍀', name: 'Clover Patch', color: 'from-emerald-400 to-green-500' },
      { emoji: '🌾', name: 'Wheat Grass', color: 'from-yellow-400 to-amber-400' },
      { emoji: '🎋', name: 'Bamboo', color: 'from-green-600 to-emerald-600' }
    ];
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
                  disabled={isLeavingRoom}
                  className="px-4 py-2 bg-red-500/20 hover:bg-red-500/40 rounded-full transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="text-sm font-medium">
                    {isLeavingRoom ? 'Leaving...' : 'Leave'}
                  </span>
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
                {isRoomFocusing ?
                  <span className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>Session in progress...</span>
                  </span>
                  :
                  <span className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                    <span>Ready to focus</span>
                  </span>
                }
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
                      {/* Tree grows from seed to full tree based on selected type */}
                      {(() => {
                        const progress = (room.focusDuration * 60 - timeLeft) / (room.focusDuration * 60);
                        if (progress < 0.2) return '🌱'; // Seed/sprout
                        if (progress < 0.4) return '🌿'; // Young plant
                        
                        // Show selected tree variety as it grows
                        if (progress < 0.6) return selectedTreeVariety.emoji; // Small tree of selected variety
                        if (progress < 0.8) return selectedTreeVariety.emoji; // Growing tree of selected variety
                        return selectedTreeVariety.emoji; // Mature tree of selected variety
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
        
        {/* Tree Type Selection (only show when not focusing) */}
        {!isRoomFocusing && (
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 text-center">
              Choose your tree to grow:
            </h4>
            <div className="flex flex-wrap justify-center gap-2 max-h-32 overflow-y-auto">
              {getAvailableTreeVarieties().map((variety) => (
                <button
                  key={variety.name}
                  onClick={() => setSelectedTreeVariety(variety)}
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 border flex items-center space-x-2 ${
                    selectedTreeVariety.name === variety.name
                      ? `bg-gradient-to-r ${variety.color} text-white border-transparent shadow-lg transform scale-105`
                      : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'
                  }`}
                >
                  <span className="text-lg">{variety.emoji}</span>
                  <span>{variety.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Enhanced Controls */}
        <div className="flex flex-col items-center space-y-4 mb-6">
          {/* Owner information */}
          <div className="text-center">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Circle Owner: <span className="font-medium text-slate-800 dark:text-slate-200">{room.createdByName}</span>
              {currentUser?.uid === room.createdBy && (
                <span className="ml-2 px-2 py-1 bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400 text-xs rounded-full">
                  You
                </span>
              )}
            </p>
            {currentUser?.uid !== room.createdBy && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                ⚠️ Only the owner can start/stop the timer
              </p>
            )}
            {currentUser?.uid === room.createdBy && !isRoomFocusing && participants.length > 1 && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                📊 Ready: {participants.filter(p => p.isReady && p.userId !== currentUser.uid).length}/{participants.length - 1} participants
              </p>
            )}
          </div>

          <div className="flex flex-col space-y-3 w-full">
            <button
              onClick={isRoomFocusing ? handleStopFocus : handleStartFocus}
              disabled={!room || isStartingFocus || isStoppingFocus || (currentUser?.uid !== room.createdBy)}
              className={`px-8 py-4 rounded-2xl text-white font-semibold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                isRoomFocusing
                  ? 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600'
                  : `bg-gradient-to-r ${selectedTreeVariety.color} hover:opacity-90`
              }`}
            >
              <div className="flex items-center justify-center space-x-3">
                {isRoomFocusing ? (
                  <>
                    <PauseIcon className="w-6 h-6" />
                    <span>{isStoppingFocus ? 'Stopping...' : 'Stop Circle Focus'}</span>
                  </>
                ) : sessionCompleted ? (
                  <>
                    <span className="text-2xl mr-1">🔄</span>
                    <PlayIcon className="w-6 h-6" />
                    <span>{isStartingFocus ? 'Starting New Session...' : 'Start New Session'}</span>
                  </>
                ) : (
                  <>
                    <span className="text-2xl mr-1">{selectedTreeVariety.emoji}</span>
                    <PlayIcon className="w-6 h-6" />
                    <span>{isStartingFocus ? 'Starting...' : 'Start Circle Focus'}</span>
                  </>
                )}
              </div>
            </button>

            {/* Ready Button for non-owners */}
            {currentUser?.uid !== room.createdBy && !isRoomFocusing && (
              <button
                onClick={handleToggleReady}
                disabled={isTogglingReady}
                className={`px-6 py-3 rounded-xl text-white font-medium shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                  isReady
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600'
                    : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <span className="text-lg">
                    {isReady ? '✓' : '⏳'}
                  </span>
                  <span>
                    {isTogglingReady ? 'Updating...' : isReady ? 'Ready!' : 'Mark as Ready'}
                  </span>
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Enhanced Focus Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl p-4 border border-emerald-200/50 dark:border-emerald-700/50">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {participants.reduce((total, p) => total + p.totalFocusMinutes, 0)}m
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400">Total Group Focus</div>
              </div>
              <div className="text-2xl">🌱</div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 border border-blue-200/50 dark:border-blue-700/50">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {participants.filter(p => p.isActive).length}
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400">Active Members</div>
              </div>
              <div className="text-2xl">👥</div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl p-4 border border-amber-200/50 dark:border-amber-700/50">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {room.trees.filter(t => t.isAlive).length}
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400">Living Trees</div>
              </div>
              <div className="text-2xl">🌳</div>
            </div>
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
                    {participant.isReady && !isRoomFocusing && (
                      <span className="flex items-center space-x-1 text-green-600 dark:text-green-400">
                        <span>✓</span>
                        <span>Ready</span>
                      </span>
                    )}
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
            
            {/* Enhanced floating particles effect */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Magic sparkles */}
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="absolute animate-float opacity-60"
                  style={{
                    left: `${15 + (i * 12)}%`,
                    top: `${25 + (i % 4) * 15}%`,
                    animationDelay: `${i * 0.7}s`,
                    animationDuration: `${3 + (i % 3)}s`
                  }}
                >
                  <span className="text-emerald-400/50 text-xs">✨</span>
                </div>
              ))}

              {/* Gentle flowing leaves */}
              {room.trees.length > 0 && [...Array(4)].map((_, i) => (
                <div
                  key={`leaf-${i}`}
                  className="absolute animate-bounce opacity-30"
                  style={{
                    left: `${30 + (i * 20)}%`,
                    top: `${20 + (i % 2) * 30}%`,
                    animationDelay: `${i * 1.2}s`,
                    animationDuration: `${4 + (i % 2)}s`
                  }}
                >
                  <span className="text-green-400 text-sm">🍃</span>
                </div>
              ))}

              {/* Energy streams when focusing */}
              {isRoomFocusing && [...Array(3)].map((_, i) => (
                <div
                  key={`energy-${i}`}
                  className="absolute w-0.5 bg-gradient-to-t from-emerald-400/20 to-transparent animate-pulse"
                  style={{
                    left: `${40 + (i * 10)}%`,
                    top: '0%',
                    height: '100%',
                    animationDelay: `${i * 0.8}s`,
                    animationDuration: '2s'
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
                <div className={`w-20 h-20 bg-gradient-to-br ${selectedTreeVariety.color} rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce`}>
                  <span className="text-3xl">{selectedTreeVariety.emoji}</span>
                </div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
                  🎉 Focus Session Complete!
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  You focused for <strong>{lastSessionMinutes} minutes</strong>! 
                  <br />Would you like to plant your <strong>{selectedTreeVariety.name}</strong> in the garden?
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
                  disabled={treePlanted || isPlantingTree}
                  className={`flex-1 px-4 py-3 text-white rounded-xl transition-all shadow-lg hover:shadow-xl ${
                    treePlanted || isPlantingTree
                      ? 'bg-gray-400 cursor-not-allowed opacity-50'
                      : `bg-gradient-to-r ${selectedTreeVariety.color} hover:opacity-90`
                  }`}
                >
                  {treePlanted ? '✅ Tree Planted!' :
                   isPlantingTree ? '🌱 Planting...' :
                   `Plant ${selectedTreeVariety.emoji} Tree`}
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