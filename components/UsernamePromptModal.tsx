import React, { useState } from 'react';
import { updateProfile } from 'firebase/auth';
import { useAuth } from '../context/AuthContext';

interface UsernamePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUsernameSet: () => void;
  actionContext?: string; // Context about why username is needed
}

const UsernamePromptModal: React.FC<UsernamePromptModalProps> = ({
  isOpen,
  onClose,
  onUsernameSet,
  actionContext = "participate in study circles"
}) => {
  const { currentUser } = useAuth();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !username.trim()) {
      setError('Please enter a username.');
      return;
    }

    if (username.trim().length < 2) {
      setError('Username must be at least 2 characters long.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await updateProfile(currentUser, { displayName: username.trim() });
      onUsernameSet();
      onClose();
    } catch (error: any) {
      console.error('Error updating username:', error);
      setError('Failed to update username. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 w-full max-w-md">
        <div className="p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">👤</span>
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
              Set Your Username
            </h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              To {actionContext}, please set a username to protect your privacy.
              Your username will be shown to others instead of your email.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Choose Username
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="w-full px-4 py-3 bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition text-slate-900 dark:text-slate-100"
                autoFocus
                required
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !username.trim()}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Setting...' : 'Set Username'}
              </button>
            </div>
          </form>

          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-blue-700 dark:text-blue-300 text-xs">
              💡 You can change your username anytime in your profile settings.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsernamePromptModal;