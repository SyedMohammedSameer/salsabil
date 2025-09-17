// ===================================
// STUDY ROOMS LIST COMPONENT (components/StudyRoomsList.tsx)
// ===================================

import React, { useState, useEffect } from 'react';
import { StudyRoom, TreeType } from '../types';
import { setupStudyRoomsListener, joinStudyRoom } from '../services/gardenService'
import { useAuth } from '../context/AuthContext';
import UsernamePromptModal from './UsernamePromptModal';

interface StudyRoomsListProps {
  onJoinRoom: (roomId: string) => void;
}

const StudyRoomsList: React.FC<StudyRoomsListProps> = ({ onJoinRoom }) => {
  const { currentUser } = useAuth();
  const [rooms, setRooms] = useState<StudyRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);
  const [filter, setFilter] = useState<TreeType | 'All'>('All');
  const [showUsernamePrompt, setShowUsernamePrompt] = useState(false);
  const [pendingRoomId, setPendingRoomId] = useState<string>('');

  useEffect(() => {
    setLoading(true);
    // The listener returns an 'unsubscribe' function to clean up
    const unsubscribe = setupStudyRoomsListener((studyRooms) => {
      setRooms(studyRooms);
      setLoading(false);
    });

    // This function will be called when the component is unmounted
    return () => unsubscribe();
  }, []);


  const handleJoinRoom = async (roomId: string) => {
    if (!currentUser || joining) return; // Prevent double-clicking

    // Check if user has displayName, if not prompt for username
    if (!currentUser.displayName || currentUser.displayName.trim() === '') {
      setPendingRoomId(roomId);
      setShowUsernamePrompt(true);
      return;
    }

    setJoining(roomId);
    try {
      await joinStudyRoom(roomId, currentUser.uid, currentUser.displayName);
      onJoinRoom(roomId);
    } catch (error) {
      console.error('Error joining room:', error);
      alert('Failed to join room. It might be full.');
    } finally {
      setJoining(null);
    }
  };

  const handleUsernameSet = async () => {
    if (!currentUser || !pendingRoomId) return;

    setJoining(pendingRoomId);
    try {
      await joinStudyRoom(pendingRoomId, currentUser.uid, currentUser.displayName!);
      onJoinRoom(pendingRoomId);
    } catch (error) {
      console.error('Error joining room:', error);
      alert('Failed to join room. It might be full.');
    } finally {
      setJoining(null);
      setPendingRoomId('');
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

  const filteredRooms = rooms.filter(room => 
    filter === 'All' || room.treeType === filter
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading study circles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter('All')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
            filter === 'All'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'
              : 'bg-white/70 dark:bg-slate-700/70 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-600'
          }`}
        >
          All Circles
        </button>
        {Object.values(TreeType).map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              filter === type
                ? `bg-gradient-to-r ${getTreeTypeColor(type)} text-white`
                : 'bg-white/70 dark:bg-slate-700/70 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-600'
            }`}
          >
            {getTreeTypeIcon(type)} {type}
          </button>
        ))}
      </div>

      {/* Rooms Grid */}
      {filteredRooms.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">🏡</span>
          </div>
          <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">
            No study circles available
          </h3>
          <p className="text-slate-500 dark:text-slate-400">
            Create the first study circle for others to join
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRooms.map((room) => (
            <div
              key={room.id}
              className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-md rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl hover:scale-105 transition-all duration-300 group relative overflow-hidden"
            >
              {/* Subtle background gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${getTreeTypeColor(room.treeType)} opacity-5 group-hover:opacity-10 transition-opacity duration-300`}></div>
              <div className="relative z-10">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className={`w-12 h-12 bg-gradient-to-r ${getTreeTypeColor(room.treeType)} rounded-xl flex items-center justify-center mr-3`}>
                    <span className="text-xl text-white">{getTreeTypeIcon(room.treeType)}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100">{room.name}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">by {room.createdByName}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-1 text-sm text-slate-500">
                  <span>👥</span>
                  <span>{room.participantCount}/{room.maxParticipants}</span>
                </div>
              </div>

              <p className="text-slate-600 dark:text-slate-400 text-sm mb-4 line-clamp-2">
                {room.description}
              </p>

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4 text-sm text-slate-500">
                  <span>⏰ {room.focusDuration}min</span>
                  <span>🌳 {room.trees.length} trees</span>
                </div>
              </div>

              <button
                onClick={() => handleJoinRoom(room.id)}
                disabled={joining === room.id || room.participantCount >= room.maxParticipants}
                className={`w-full py-3 rounded-xl font-semibold transition-all duration-200 ${
                  room.participantCount >= room.maxParticipants
                    ? 'bg-slate-300 dark:bg-slate-600 text-slate-500 cursor-not-allowed'
                    : joining === room.id
                    ? 'bg-slate-400 text-white cursor-wait'
                    : `bg-gradient-to-r ${getTreeTypeColor(room.treeType)} text-white hover:opacity-90 shadow-lg hover:shadow-xl`
                }`}
              >
                {room.participantCount >= room.maxParticipants
                  ? 'Room Full'
                  : joining === room.id
                  ? 'Joining...'
                  : 'Join Circle'
                }
              </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Username Prompt Modal */}
      <UsernamePromptModal
        isOpen={showUsernamePrompt}
        onClose={() => {
          setShowUsernamePrompt(false);
          setPendingRoomId('');
        }}
        onUsernameSet={handleUsernameSet}
        actionContext="join study circles"
      />
    </div>
  );
};

export default StudyRoomsList;

