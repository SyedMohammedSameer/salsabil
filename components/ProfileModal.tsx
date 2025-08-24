import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Modal from './Modal';
import { updateProfile } from 'firebase/auth';
import { auth } from '../lib/firebase';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { currentUser } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (currentUser) {
      setDisplayName(currentUser.displayName || '');
    }
  }, [currentUser, isOpen]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !displayName.trim()) {
      setError('Display name cannot be empty.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await updateProfile(currentUser, { displayName });
      setSuccess('Profile updated successfully!');
      setTimeout(() => {
        onClose();
        setSuccess('');
      }, 1500);
    } catch (err) {
      setError('Failed to update profile. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="My Profile">
      <form onSubmit={handleSave} className="space-y-6">
        {error && <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-sm">{error}</div>}
        {success && <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg text-sm">{success}</div>}

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
            Email Address
          </label>
          <input
            type="email"
            id="email"
            value={currentUser?.email || ''}
            disabled
            className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-500 dark:text-slate-400"
          />
        </div>

        <div>
          <label htmlFor="displayName" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Display Name *
          </label>
          <input
            type="text"
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-4 py-3 bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition"
            placeholder="How you'd like to appear"
            required
          />
        </div>

        <div className="flex justify-end items-center gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-600 hover:bg-slate-200 dark:hover:bg-slate-500 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-dark rounded-lg transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ProfileModal;