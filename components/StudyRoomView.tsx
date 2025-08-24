// ===================================
// STUDY ROOM VIEW COMPONENT (components/StudyRoomView.tsx)
// ===================================

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
import { PlayIcon, PauseIcon, ChevronLeftIcon } from './icons/NavIcons';


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

  useEffect(() => {
    const roomUnsub = setupRoomListener(roomId, setRoom);
    const participantsUnsub = setupParticipantsListener(roomId, setParticipants);

    return () => {
      roomUnsub();
      participantsUnsub();
    };
  }, [roomId]);

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

  const handleShareRoom = () => {
    const inviteLink = `${window.location.origin}/join/${roomId}`;
    navigator.clipboard.writeText(inviteLink)
      .then(() => alert("Invite link copied!"))
      .catch(err => console.error('Failed to copy link: ', err));
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
    
    try {
      await leaveStudyRoom(roomId, currentUser.uid);
      onLeaveRoom();
    } catch (error) {
      console.error('Error leaving room:', error);
    }
  };

  const handlePlantTree = async () => {
    if (!currentUser || !room) return;
    
    try {
      await plantTreeInRoom(
        roomId, 
        currentUser.uid, 
        currentUser.email || 'Anonymous', 
        room.treeType, 
        lastSessionMinutes
      );
      setShowTreePlantingModal(false);
    } catch (error) {
      console.error('Error planting tree:', error);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{room.name}</h1>
          <p className="text-slate-600 dark:text-slate-400">{room.description}</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleShareRoom}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center space-x-2"
          >
            <span>Share</span>
          </button>
          <button
            onClick={handleLeaveRoom}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
          >
            Leave Circle
          </button>
        </div>
      </div>

      {/* Focus Timer */}
      <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-md rounded-2xl p-8 shadow-lg border border-white/20 text-center">
        <div className="mb-6">
          <div className="text-6xl font-mono font-bold text-slate-800 dark:text-slate-100 mb-2">
            {formatTime(timeLeft)}
          </div>
          <p className="text-slate-600 dark:text-slate-400">
            {isFocusing ? 'Focus Time' : 'Ready to Focus'}
          </p>
        </div>
        
        <button
          onClick={isFocusing ? handleStopFocus : handleStartFocus}
          className={`px-8 py-4 rounded-full text-white font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 ${
            isFocusing 
              ? 'bg-red-500 hover:bg-red-600' 
              : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600'
          }`}
        >
          {isFocusing ? (
            <>
              <PauseIcon className="w-6 h-6 inline mr-2" />
              Stop Focus
            </>
          ) : (
            <>
              <PlayIcon className="w-6 h-6 inline mr-2" />
              Start Focus ({room.focusDuration}m)
            </>
          )}
        </button>
      </div>

      {/* Participants */}
      <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-md rounded-2xl p-6 shadow-lg border border-white/20">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center">
          <span className="mr-2">👥</span>
          Participants ({participants.length}/{room.maxParticipants})
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {participants.map((participant) => (
            <div
              key={participant.userId}
              className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg"
            >
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center mr-3">
                  <span className="text-white font-semibold text-sm">
                    {participant.displayName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-100">
                    {participant.displayName}
                    {participant.userId === currentUser?.uid && (
                      <span className="ml-2 text-xs bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded-full">
                        You
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {participant.treesPlanted} trees • {participant.totalFocusMinutes}m focus
                  </p>
                </div>
              </div>
              
              <div className={`w-3 h-3 rounded-full ${participant.isActive ? 'bg-green-500' : 'bg-slate-400'}`} />
            </div>
          ))}
        </div>
      </div>

      {/* Garden (Trees) */}
      <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-md rounded-2xl p-6 shadow-lg border border-white/20">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center">
          <span className="mr-2">🌳</span>
          Circle Garden ({room.trees.length} trees)
        </h3>
        
        {room.trees.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🌱</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400">
              Complete focus sessions to plant trees in this garden
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-4">
            {room.trees.map((tree) => (
              <TreeComponent key={tree.id} tree={tree} size="sm" />
            ))}
          </div>
        )}
      </div>

      {/* Tree Planting Modal */}
      {showTreePlantingModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 w-full max-w-md">
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">🌳</span>
                </div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
                  Congratulations!
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  You completed {lastSessionMinutes} minutes of focused {room.treeType.toLowerCase()}. 
                  Plant a tree in the circle garden!
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
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg hover:shadow-xl"
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

