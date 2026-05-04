import { motion } from 'framer-motion'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function StudyRoomDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col h-full"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-border">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 rounded-lg"
          onClick={() => navigate('/rooms')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-base font-bold text-foreground">Room #{id}</h1>
          <p className="text-xs text-muted-foreground">Study session</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-noor-500/10">
          <Users className="h-8 w-8 text-noor-500" strokeWidth={1.5} />
        </div>
        <div className="text-center">
          <p className="text-base font-semibold text-foreground">Real-time rooms coming soon</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">
            Live shared timers, presence, and chat are in development for V2.
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/rooms')}>
          Back to rooms
        </Button>
      </div>
    </motion.div>
  )
}
