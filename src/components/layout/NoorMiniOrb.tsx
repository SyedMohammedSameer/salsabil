import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { cn } from '@/lib/cn'

interface NoorMiniOrbProps {
  isBottomBar?: boolean
}

export function NoorMiniOrb({ isBottomBar = false }: NoorMiniOrbProps) {
  const navigate = useNavigate()

  if (isBottomBar) {
    return (
      <button
        onClick={() => navigate('/ai')}
        className="relative flex flex-col items-center justify-center gap-0.5 min-w-11 min-h-11 rounded-xl px-2 text-xs font-medium text-muted-foreground"
        aria-label="Open Noor AI"
      >
        <motion.div
          className="w-7 h-7 rounded-full bg-gradient-to-br from-noor-400 to-noor-600 shadow-lg shadow-noor-500/40"
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />
        <span>Noor</span>
      </button>
    )
  }

  return (
    <motion.button
      onClick={() => navigate('/ai')}
      className={cn(
        'fixed bottom-8 right-6 z-50',
        'w-14 h-14 rounded-full',
        'bg-gradient-to-br from-noor-400 to-noor-600',
        'shadow-xl shadow-noor-500/40',
        'flex items-center justify-center',
        'focus-visible:ring-2 focus-visible:ring-noor-500 focus-visible:ring-offset-2',
      )}
      animate={{ scale: [1, 1.04, 1] }}
      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      aria-label="Open Noor AI assistant"
    >
      {/* Inner glow */}
      <div className="absolute inset-1 rounded-full bg-white/10" />
      <span className="relative text-white text-lg font-bold font-mono">N</span>
    </motion.button>
  )
}
