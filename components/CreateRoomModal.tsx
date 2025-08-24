// Fixed CreateRoomModal.tsx - Compact and properly scrollable
import React, { useState, useEffect } from 'react';
import { TreeType } from '../types';
import { createStudyRoom } from '../services/gardenService';
import { useAuth } from '../context/AuthContext';
import Modal from './Modal';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRoomCreated: (roomId: string) => void;
}

const CreateRoomModal: React.FC<CreateRoomModalProps> = ({ isOpen, onClose, onRoomCreated }) => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    maxParticipants: 5,
    focusDuration: 25,
    treeType: TreeType.GeneralFocus,
    tags: [] as string[]
  });

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !formData.name.trim()) return;

    setLoading(true);
    try {
      const roomId = await createStudyRoom(
        currentUser.uid,
        currentUser.email || 'Anonymous',
        formData
      );
      onRoomCreated(roomId);
      onClose();
      // Reset form
      setFormData({
        name: '',
        description: '',
        maxParticipants: 5,
        focusDuration: 25,
        treeType: TreeType.GeneralFocus,
        tags: []
      });
    } catch (error) {
      console.error('Error creating room:', error);
      alert('Failed to create study circle. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const treeTypeOptions = [
    { value: TreeType.GeneralFocus, label: '🎯 General Focus', desc: 'Any type of focused work' },
    { value: TreeType.Study, label: '📚 Study', desc: 'Academic learning and reading' },
    { value: TreeType.Work, label: '💼 Work', desc: 'Professional tasks and projects' },
    { value: TreeType.QuranReading, label: '📖 Quran Reading', desc: 'Spiritual reading and reflection' },
    { value: TreeType.Dhikr, label: '🤲 Dhikr & Prayer', desc: 'Remembrance and worship' },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Study Circle" size={isMobile ? "xl" : "lg"}>
      <div className={`${isMobile ? 'max-h-[70vh]' : 'max-h-[80vh]'} overflow-y-auto`}>
        <form onSubmit={handleSubmit} className={`space-y-${isMobile ? '4' : '5'}`}>
          {/* Circle Name */}
          <div>
            <label htmlFor="roomName" className={`block font-medium text-slate-700 dark:text-slate-300 mb-2 ${isMobile ? 'text-sm' : 'text-sm'}`}>
              Circle Name *
            </label>
            <input
              type="text"
              id="roomName"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={`w-full border border-slate-300 dark:border-slate-600 rounded-xl dark:bg-slate-700 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors
                         ${isMobile ? 'px-3 py-3 text-base' : 'px-4 py-3'}`}
              placeholder="e.g., Morning Study Session"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="roomDesc" className={`block font-medium text-slate-700 dark:text-slate-300 mb-2 ${isMobile ? 'text-sm' : 'text-sm'}`}>
              Description
            </label>
            <textarea
              id="roomDesc"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={isMobile ? 2 : 3}
              className={`w-full border border-slate-300 dark:border-slate-600 rounded-xl dark:bg-slate-700 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors resize-none
                         ${isMobile ? 'px-3 py-3 text-base' : 'px-4 py-3'}`}
              placeholder="What will you be focusing on in this circle?"
            />
          </div>

          {/* Focus Type - Compact Design */}
          <div>
            <label className={`block font-medium text-slate-700 dark:text-slate-300 mb-2 ${isMobile ? 'text-sm' : 'text-sm'}`}>
              Focus Type *
            </label>
            <div className={`grid gap-2 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {treeTypeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleInputChange('treeType', option.value)}
                  className={`flex items-center p-3 border-2 rounded-lg transition-all text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 ${
                    formData.treeType === option.value
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                      : 'border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className={`font-medium truncate ${isMobile ? 'text-sm' : 'text-sm'}`}>
                      {option.label}
                    </div>
                    <div className={`text-slate-500 dark:text-slate-400 truncate ${isMobile ? 'text-xs' : 'text-xs'}`}>
                      {option.desc}
                    </div>
                  </div>
                  {formData.treeType === option.value && (
                    <div className="text-emerald-500 ml-2 flex-shrink-0">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Settings Row - Compact */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="maxParticipants" className={`block font-medium text-slate-700 dark:text-slate-300 mb-2 ${isMobile ? 'text-sm' : 'text-sm'}`}>
                Max People
              </label>
              <select
                id="maxParticipants"
                value={formData.maxParticipants}
                onChange={(e) => handleInputChange('maxParticipants', parseInt(e.target.value))}
                className={`w-full border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 focus:ring-2 focus:ring-emerald-500
                           ${isMobile ? 'px-3 py-3 text-base' : 'px-4 py-3'}`}
              >
                <option value={3}>3 people</option>
                <option value={5}>5 people</option>
                <option value={8}>8 people</option>
                <option value={12}>12 people</option>
                <option value={20}>20 people</option>
              </select>
            </div>

            <div>
              <label htmlFor="focusDuration" className={`block font-medium text-slate-700 dark:text-slate-300 mb-2 ${isMobile ? 'text-sm' : 'text-sm'}`}>
                Duration
              </label>
              <select
                id="focusDuration"
                value={formData.focusDuration}
                onChange={(e) => handleInputChange('focusDuration', parseInt(e.target.value))}
                className={`w-full border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 focus:ring-2 focus:ring-emerald-500
                           ${isMobile ? 'px-3 py-3 text-base' : 'px-4 py-3'}`}
              >
                <option value={15}>15 min</option>
                <option value={25}>25 min</option>
                <option value={45}>45 min</option>
                <option value={60}>60 min</option>
                <option value={90}>90 min</option>
              </select>
            </div>
          </div>
        </form>
      </div>

      {/* Action Buttons - Fixed at bottom */}
      <div className={`flex border-t border-slate-200/50 dark:border-slate-700/50 ${isMobile ? 'flex-col space-y-3 pt-4 mt-4' : 'space-x-3 pt-4 mt-4'}`}>
        <button
          type="button"
          onClick={onClose}
          className={`font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors
                     ${isMobile ? 'flex-1 px-4 py-3 text-base' : 'flex-1 px-4 py-2.5 text-sm'}`}
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading || !formData.name.trim()}
          className={`font-medium bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed
                     ${isMobile ? 'flex-1 px-4 py-3 text-base' : 'flex-1 px-4 py-2.5 text-sm'}`}
        >
          {loading ? 'Creating...' : 'Create Circle'}
        </button>
      </div>
    </Modal>
  );
};

export default CreateRoomModal;