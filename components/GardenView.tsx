import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import StudyRoomsList from './StudyRoomsList';
import StudyRoomView from './StudyRoomView';
import PersonalGarden from './PersonalGarden';
import CreateRoomModal from './CreateRoomModal';
import { PlusIcon } from './icons/NavIcons';
import { joinStudyRoom } from '../services/gardenService'

const GardenView: React.FC = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'personal' | 'rooms' | 'inRoom'>('personal');
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const pendingRoomId = sessionStorage.getItem('pendingInvite');
    if (pendingRoomId && currentUser) {
      sessionStorage.removeItem('pendingInvite'); // Clear the item
  
      const joinFromInvite = async () => {
        try {
          await joinStudyRoom(pendingRoomId, currentUser.uid, currentUser.email || 'Anonymous');
          handleJoinRoom(pendingRoomId); // Your existing function to enter the room view
        } catch (error) {
          alert('Could not join the study circle. It might be full.');
        }
      };
      joinFromInvite();
    }
  }, [currentUser]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleJoinRoom = (roomId: string) => {
    setCurrentRoomId(roomId);
    setActiveTab('inRoom');
  };

  const handleLeaveRoom = () => {
    setCurrentRoomId(null);
    setActiveTab('rooms');
  };

  const tabs = [
    { id: 'personal', label: '🌱 My Garden', icon: '🌳' },
    { id: 'rooms', label: '🏡 Study Circles', icon: '👥' },
  ];

  return (
    <div className={`animate-fadeIn h-full bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-slate-900 dark:via-emerald-900/20 dark:to-slate-800 overflow-y-auto ${isMobile ? 'p-4' : 'p-6'}`}>
      {/* Header */}
      <div className={`mb-${isMobile ? '6' : '8'}`}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mr-4">
              <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </div>
            <div>
              <h1 className={`font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent ${isMobile ? 'text-2xl' : 'text-4xl'}`}>
                Spiritual Garden
              </h1>
              <p className={`text-slate-600 dark:text-slate-400 mt-1 ${isMobile ? 'text-sm' : 'text-base'}`}>
                Plant trees of focus, grow gardens of knowledge
              </p>
            </div>
          </div>

          {activeTab === 'rooms' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className={`rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 active:scale-95 flex items-center space-x-2
                         ${isMobile ? 'px-4 py-3 text-sm' : 'px-6 py-3'}`}
            >
              <PlusIcon className="w-5 h-5" />
              <span>{isMobile ? 'Create' : 'Create Circle'}</span>
            </button>
          )}
        </div>

        {/* Navigation Tabs */}
        {activeTab !== 'inRoom' && (
          <div className="flex space-x-2 bg-white/70 dark:bg-slate-800/70 backdrop-blur-md rounded-xl p-2 shadow-lg border border-white/20">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex items-center justify-center space-x-2 rounded-lg transition-all duration-200 ${isMobile ? 'py-3 px-4 text-sm' : 'py-4 px-6'} ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                }`}
              >
                <span className={isMobile ? 'text-base' : 'text-lg'}>{tab.icon}</span>
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1">
        {activeTab === 'personal' && <PersonalGarden />}
        {activeTab === 'rooms' && (
          <StudyRoomsList onJoinRoom={handleJoinRoom} />
        )}
        {activeTab === 'inRoom' && currentRoomId && (
          <StudyRoomView roomId={currentRoomId} onLeaveRoom={handleLeaveRoom} />
        )}
      </div>

      {/* Create Room Modal */}
      <CreateRoomModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onRoomCreated={handleJoinRoom}
      />
    </div>
  );
};

export default GardenView;