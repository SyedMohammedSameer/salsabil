import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import StudyRoomsList from './StudyRoomsList';
import StudyRoomView from './StudyRoomView';
import PersonalGarden from './PersonalGarden';
import CreateRoomModal from './CreateRoomModal';
import UsernamePromptModal from './UsernamePromptModal';
import { PlusIcon } from './icons/NavIcons';
import { joinStudyRoom } from '../services/gardenService'

const GardenView: React.FC = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'personal' | 'rooms' | 'inRoom'>('personal');
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUsernamePrompt, setShowUsernamePrompt] = useState(false);
  const [pendingAction, setPendingAction] = useState<string>('');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    let pendingRoomId = sessionStorage.getItem('pendingInvite') || localStorage.getItem('pendingInvite');
    
    if (pendingRoomId && currentUser) {
      // Check if invite is not too old (24 hours)
      const timestamp = localStorage.getItem('pendingInviteTimestamp');
      const twentyFourHours = 24 * 60 * 60 * 1000;
      
      if (timestamp && (Date.now() - parseInt(timestamp)) > twentyFourHours) {
        // Invite expired
        localStorage.removeItem('pendingInvite');
        localStorage.removeItem('pendingInviteTimestamp');
        sessionStorage.removeItem('pendingInvite');
        alert('The study circle invite has expired. Please ask for a new link.');
        return;
      }
      
      // Clear all invite data
      sessionStorage.removeItem('pendingInvite');
      localStorage.removeItem('pendingInvite');
      localStorage.removeItem('pendingInviteTimestamp');
  
      const joinFromInvite = async () => {
        try {
          console.log('Attempting to join study room:', pendingRoomId);

          // Check if user has displayName, if not prompt for username
          if (!currentUser.displayName || currentUser.displayName.trim() === '') {
            setPendingAction(`join-${pendingRoomId}`);
            setShowUsernamePrompt(true);
            return;
          }

          await joinStudyRoom(pendingRoomId, currentUser.uid, currentUser.displayName);
          handleJoinRoom(pendingRoomId);
          alert('🎉 Successfully joined the study circle!');
        } catch (error) {
          console.error('Error joining study room:', error);
          alert('Could not join the study circle. It might be full, no longer exist, or you might already be in it.');
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

  const handleUsernameSet = async () => {
    if (pendingAction.startsWith('join-')) {
      const roomId = pendingAction.replace('join-', '');
      try {
        await joinStudyRoom(roomId, currentUser!.uid, currentUser!.displayName!);
        handleJoinRoom(roomId);
        alert('🎉 Successfully joined the study circle!');
      } catch (error) {
        console.error('Error joining study room:', error);
        alert('Could not join the study circle.');
      }
    } else if (pendingAction === 'create-room') {
      setShowCreateModal(true);
    }
    setPendingAction('');
  };

  const handleCreateRoomClick = () => {
    if (!currentUser?.displayName || currentUser.displayName.trim() === '') {
      setPendingAction('create-room');
      setShowUsernamePrompt(true);
      return;
    }
    setShowCreateModal(true);
  };

  const tabs = [
    { id: 'personal', label: '🌱 My Garden', icon: '🌳' },
    { id: 'rooms', label: '🏡 Study Circles', icon: '👥' },
  ];

  return (
    <div className={`animate-fadeIn h-full bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-slate-900 dark:via-emerald-900/20 dark:to-slate-800 overflow-y-auto ${isMobile ? 'p-4' : 'p-6'}`}>
      {/* Floating background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-emerald-200/20 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-48 h-48 bg-teal-200/20 rounded-full blur-xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-20 left-1/3 w-40 h-40 bg-cyan-200/20 rounded-full blur-xl animate-pulse delay-2000"></div>
      </div>

      {/* Header */}
      <div className={`relative mb-${isMobile ? '6' : '8'}`}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl flex items-center justify-center mr-5 shadow-xl transform hover:scale-105 transition-transform duration-300">
              <svg className="w-8 h-8 text-white animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </div>
            <div>
              <h1 className={`font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent ${isMobile ? 'text-3xl' : 'text-5xl'} drop-shadow-sm`}>
                Spiritual Garden
              </h1>
              <p className={`text-slate-600 dark:text-slate-400 mt-2 ${isMobile ? 'text-sm' : 'text-lg'} font-medium`}>
                🌱 Plant trees of focus, grow gardens of knowledge 🌳
              </p>
            </div>
          </div>

          {activeTab === 'rooms' && (
            <button
              onClick={handleCreateRoomClick}
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
          <div className="flex space-x-3 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl p-3 shadow-2xl border border-white/30">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex items-center justify-center space-x-3 rounded-xl transition-all duration-300 transform hover:scale-105 ${isMobile ? 'py-4 px-5 text-sm' : 'py-5 px-8'} ${
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

      {/* Username Prompt Modal */}
      <UsernamePromptModal
        isOpen={showUsernamePrompt}
        onClose={() => {
          setShowUsernamePrompt(false);
          setPendingAction('');
        }}
        onUsernameSet={handleUsernameSet}
        actionContext={pendingAction.startsWith('join-') ? "join study circles" : "create and join study circles"}
      />
    </div>
  );
};

export default GardenView;