/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx}"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      animation: {
        'fadeIn': 'fadeIn 0.5s ease-in-out',
        'slideInDown': 'slideInDown 0.3s ease-out',
        'slideInUp': 'slideInUp 0.3s ease-out',
        'slideInLeft': 'slideInLeft 0.3s ease-out',
        'slideInRight': 'slideInRight 0.3s ease-out',
        'scaleIn': 'scaleIn 0.3s ease-out',
        'float': 'float 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'shimmer': 'shimmer 2s linear infinite',
        // Jarvis / Noor AI animations
        'orb-breathe': 'orbBreathe 3s ease-in-out infinite',
        'orb-ring-slow': 'orbRing 8s linear infinite',
        'orb-ring-fast': 'orbRing 2s linear infinite',
        'orb-ring-reverse': 'orbRingReverse 6s linear infinite',
        'orb-particle': 'orbParticle 4s linear infinite',
        'orb-particle-fast': 'orbParticle 1.5s linear infinite',
        'orb-ripple': 'orbRipple 1.5s ease-out infinite',
        'orb-shimmer': 'orbShimmer 2s ease-in-out infinite',
        'orb-wave': 'orbWave 1s ease-in-out infinite',
        'orb-burst': 'orbBurst 0.6s ease-out',
        'orb-glow-pulse': 'orbGlowPulse 2s ease-in-out infinite',
        'color-cycle': 'colorCycle 3s ease-in-out infinite',
        'msg-slide-in': 'msgSlideIn 0.3s ease-out',
        'noor-bg-drift': 'noorBgDrift 20s ease-in-out infinite',
        'mini-orb-pulse': 'miniOrbPulse 2s ease-in-out infinite',
        'action-confirm': 'actionConfirm 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideInDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(59, 130, 246, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(59, 130, 246, 0.8)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        // Jarvis Orb keyframes
        orbBreathe: {
          '0%, 100%': { transform: 'scale(0.97)', opacity: '0.9' },
          '50%': { transform: 'scale(1.03)', opacity: '1' },
        },
        orbRing: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        orbRingReverse: {
          '0%': { transform: 'rotate(360deg)' },
          '100%': { transform: 'rotate(0deg)' },
        },
        orbParticle: {
          '0%': { transform: 'rotate(0deg) translateX(var(--orbit-radius, 40px)) rotate(0deg)', opacity: '0.8' },
          '50%': { opacity: '1' },
          '100%': { transform: 'rotate(360deg) translateX(var(--orbit-radius, 40px)) rotate(-360deg)', opacity: '0.8' },
        },
        orbRipple: {
          '0%': { transform: 'scale(1)', opacity: '0.6' },
          '100%': { transform: 'scale(2)', opacity: '0' },
        },
        orbShimmer: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        orbWave: {
          '0%, 100%': { borderRadius: '50%' },
          '25%': { borderRadius: '48% 52% 50% 50%' },
          '50%': { borderRadius: '50% 50% 48% 52%' },
          '75%': { borderRadius: '52% 48% 50% 50%' },
        },
        orbBurst: {
          '0%': { transform: 'scale(1)', boxShadow: '0 0 20px rgba(245, 158, 11, 0.8)' },
          '50%': { transform: 'scale(1.15)', boxShadow: '0 0 60px rgba(245, 158, 11, 0.6)' },
          '100%': { transform: 'scale(1)', boxShadow: '0 0 20px rgba(13, 148, 136, 0.4)' },
        },
        orbGlowPulse: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(6, 182, 212, 0.3), 0 0 40px rgba(13, 148, 136, 0.2), inset 0 0 20px rgba(6, 182, 212, 0.1)' },
          '50%': { boxShadow: '0 0 30px rgba(6, 182, 212, 0.5), 0 0 60px rgba(13, 148, 136, 0.3), inset 0 0 30px rgba(6, 182, 212, 0.2)' },
        },
        colorCycle: {
          '0%, 100%': { background: 'radial-gradient(circle, #0d9488, #06b6d4, transparent)' },
          '33%': { background: 'radial-gradient(circle, #7c3aed, #06b6d4, transparent)' },
          '66%': { background: 'radial-gradient(circle, #0d9488, #7c3aed, transparent)' },
        },
        msgSlideIn: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        noorBgDrift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '25%': { backgroundPosition: '50% 0%' },
          '50%': { backgroundPosition: '100% 50%' },
          '75%': { backgroundPosition: '50% 100%' },
        },
        miniOrbPulse: {
          '0%, 100%': { transform: 'scale(1)', boxShadow: '0 0 8px rgba(6, 182, 212, 0.4)' },
          '50%': { transform: 'scale(1.1)', boxShadow: '0 0 16px rgba(6, 182, 212, 0.6)' },
        },
        actionConfirm: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '60%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        accent: {
          50: '#ecfdf5',
          100: '#d1fae5',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
        },
        noor: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
          950: '#042f2e',
        }
      },
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif'
        ],
      },
      backdropBlur: {
        xs: '2px',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      minHeight: {
        'touch': '44px',
      },
      minWidth: {
        'touch': '44px',
      },
    },
  },
  plugins: [],
}
