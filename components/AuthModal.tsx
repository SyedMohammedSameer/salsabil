// Mobile-Optimized AuthModal.tsx with responsive design and Display Name
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function AuthModal() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState(''); // New state for display name
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const { login, signup } = useAuth();

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!isLogin && !displayName.trim()) {
      return setError('Please enter a display name.');
    }

    if (password.length < 6) {
      return setError('Password must be at least 6 characters');
    }

    try {
      setError('');
      setLoading(true);
      
      if (isLogin) {
        await login(email, password);
      } else {
        await signup(email, password, displayName);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to authenticate');
    }
    setLoading(false);
  }

  return (
    <div className={`fixed inset-0 bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 dark:from-slate-900 dark:via-slate-800 dark:to-cyan-900 flex items-center justify-center z-50 transition-all duration-500
                    ${isMobile ? 'p-4' : 'p-8'}`}>
      <div className={`bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/50 w-full transition-all duration-300
                      ${isMobile ? 'max-w-sm min-h-[500px] flex flex-col' : 'max-w-md'}`}>
        
        {/* Header */}
        <div className={`text-center border-b border-slate-200/50 dark:border-slate-700/50 bg-gradient-to-r from-primary/5 to-accent/5
                        ${isMobile ? 'p-6 pt-8' : 'p-8'}`}>
          <div className={`mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-400 via-cyan-500 to-emerald-400 flex items-center justify-center shadow-xl
                          ${isMobile ? 'w-16 h-16' : 'w-20 h-20'}`}>
            <div className={`bg-white/30 rounded-xl flex items-center justify-center backdrop-blur-sm
                            ${isMobile ? 'w-10 h-10' : 'w-12 h-12'}`}>
              <svg className={`text-white ${isMobile ? 'w-6 h-6' : 'w-8 h-8'}`} fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z"/>
                <circle cx="12" cy="14" r="4" opacity="0.6"/>
              </svg>
            </div>
          </div>
          
          <h1 className={`font-bold bg-gradient-to-r from-blue-600 via-cyan-600 to-emerald-600 bg-clip-text text-transparent mb-2
                         ${isMobile ? 'text-2xl' : 'text-3xl'}`}>
            Salsabil
          </h1>
          <p className={`text-slate-600 dark:text-slate-400 mb-2 ${isMobile ? 'text-sm' : 'text-base'}`}>
            A Spring of Productivity & Spiritual Growth
          </p>
          <p className={`text-slate-500 dark:text-slate-500 ${isMobile ? 'text-xs' : 'text-sm'}`}>
            {isLogin ? 'Welcome back! Sign in to continue your journey' : 'Join us and start your journey of growth'}
          </p>
        </div>

        {/* Form Container */}
        <div className={`flex-1 flex flex-col ${isMobile ? 'p-6' : 'p-8'}`}>
          {error && (
            <div className={`bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 rounded-xl mb-6 animate-slideInDown
                            ${isMobile ? 'px-3 py-3 text-sm' : 'px-4 py-3'}`}>
              <div className="flex items-center">
                <svg className={`mr-2 flex-shrink-0 ${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
                {error}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className={`space-y-${isMobile ? '5' : '6'} flex-1 flex flex-col`}>
            {!isLogin && (
              <div>
                <label htmlFor="displayName" className={`block font-medium text-slate-700 dark:text-slate-300 mb-2 ${isMobile ? 'text-sm' : 'text-base'}`}>
                  Display Name
                </label>
                <input
                  type="text"
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  className={`w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-slate-900 dark:text-slate-100 transition-all duration-200
                             ${isMobile ? 'px-4 py-3 text-base' : 'px-4 py-3'}`}
                  placeholder="Enter your name"
                  autoComplete="name"
                />
              </div>
            )}
            <div>
              <label htmlFor="email" className={`block font-medium text-slate-700 dark:text-slate-300 mb-2 ${isMobile ? 'text-sm' : 'text-base'}`}>
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={`w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-slate-900 dark:text-slate-100 transition-all duration-200
                           ${isMobile ? 'px-4 py-3 text-base' : 'px-4 py-3'}`}
                placeholder="Enter your email"
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" className={`block font-medium text-slate-700 dark:text-slate-300 mb-2 ${isMobile ? 'text-sm' : 'text-base'}`}>
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={`w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-slate-900 dark:text-slate-100 transition-all duration-200
                           ${isMobile ? 'px-4 py-3 text-base' : 'px-4 py-3'}`}
                placeholder="Enter your password (min 6 characters)"
                autoComplete={isLogin ? "current-password" : "new-password"}
              />
              <p className={`mt-2 text-slate-500 dark:text-slate-400 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                Password must be at least 6 characters long
              </p>
            </div>

            {/* Spacer for mobile layout */}
            {isMobile && <div className="flex-1" />}

            <button
              type="submit"
              disabled={loading}
              className={`w-full bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]
                         ${isMobile ? 'py-4 text-base min-h-touch' : 'py-3'}`}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className={`animate-spin rounded-full border-2 border-white border-t-transparent mr-2
                                  ${isMobile ? 'w-5 h-5' : 'w-4 h-4'}`}></div>
                  {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Sign Up')}
                </div>
              ) : (
                isLogin ? 'Sign In' : 'Sign Up'
              )}
            </button>
          </form>

          {/* Switch Mode */}
          <div className={`text-center border-t border-slate-200/50 dark:border-slate-700/50 ${isMobile ? 'mt-6 pt-6' : 'mt-8 pt-6'}`}>
            <p className={`text-slate-600 dark:text-slate-400 mb-3 ${isMobile ? 'text-sm' : 'text-base'}`}>
              {isLogin ? "Don't have an account?" : "Already have an account?"}
            </p>
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setEmail('');
                setPassword('');
              }}
              className={`text-primary hover:text-primary-dark font-semibold transition-colors duration-200 hover:underline ${isMobile ? 'text-base' : 'text-base'}`}
            >
              {isLogin ? 'Create New Account' : 'Sign In Instead'}
            </button>
          </div>

          {/* Footer */}
          <div className={`text-center ${isMobile ? 'mt-4' : 'mt-6'}`}>
            <p className={`text-slate-500 dark:text-slate-400 ${isMobile ? 'text-xs' : 'text-sm'}`}>
              By continuing, you agree to our Terms of Service
            </p>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-4 left-4 w-2 h-2 bg-primary/30 rounded-full animate-pulse"></div>
        <div className="absolute top-6 right-6 w-1.5 h-1.5 bg-accent/40 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
        <div className="absolute bottom-6 left-6 w-1 h-1 bg-secondary/30 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>
    </div>
  );
}