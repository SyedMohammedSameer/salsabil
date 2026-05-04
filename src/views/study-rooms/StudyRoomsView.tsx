import { motion } from 'framer-motion'
import { Users, Clock, Lock, Globe, Plus, ArrowRight } from 'lucide-react'
import { PageShell } from '@/components/shared/PageShell'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/cn'

// Study Rooms — UI shell (real-time backend in Phase V2)

const EXAMPLE_ROOMS = [
  {
    id: '1',
    name: 'Fajr Study Circle',
    participants: 3,
    max: 8,
    duration: 45,
    isPublic: true,
    topic: 'Islamic Studies',
  },
  {
    id: '2',
    name: 'Exam Grind 📚',
    participants: 7,
    max: 10,
    duration: 60,
    isPublic: true,
    topic: 'General',
  },
  {
    id: '3',
    name: 'Deep Work — No Distractions',
    participants: 1,
    max: 4,
    duration: 90,
    isPublic: false,
    topic: 'Work',
  },
]

function RoomCard({ room }: { room: (typeof EXAMPLE_ROOMS)[0] }) {
  const isFull = room.participants >= room.max
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className={cn(isFull && 'opacity-60')}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground truncate">{room.name}</p>
                {!room.isPublic && <Lock className="h-3 w-3 text-muted-foreground shrink-0" />}
                {room.isPublic && <Globe className="h-3 w-3 text-muted-foreground shrink-0" />}
              </div>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" />
                  {room.participants}/{room.max}
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {room.duration}m sessions
                </span>
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                  {room.topic}
                </Badge>
              </div>
            </div>
            <Button
              size="sm"
              variant={isFull ? 'outline' : 'default'}
              disabled={isFull}
              className="h-8 shrink-0"
            >
              {isFull ? 'Full' : 'Join'}
              {!isFull && <ArrowRight className="h-3.5 w-3.5 ml-1" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default function StudyRoomsView() {
  return (
    <PageShell maxWidth="lg">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="space-y-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Study Rooms</h1>
            <p className="text-sm text-muted-foreground">Focus together, grow together</p>
          </div>
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            Create room
          </Button>
        </div>

        {/* Coming soon banner */}
        <Card className="border-noor-500/30 bg-gradient-to-br from-noor-500/5 to-noor-500/0">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-noor-500/10 flex items-center justify-center shrink-0">
                <Users className="h-4 w-4 text-noor-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Real-time sync coming soon</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Live collaborative study rooms with shared timers, presence, and text chat are in
                  active development. Stay tuned.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Join by code */}
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Join by room code
            </p>
            <div className="flex gap-2">
              <input
                placeholder="6-digit code"
                maxLength={6}
                className={cn(
                  'flex-1 rounded-xl border border-border bg-muted px-3.5 py-2 text-sm',
                  'text-foreground placeholder:text-muted-foreground',
                  'outline-none focus:border-noor-500/50 uppercase tracking-widest font-mono',
                )}
              />
              <Button size="sm" className="h-10 px-4">
                Join
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Public rooms preview */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1 mb-3">
            Active rooms (preview)
          </p>
          <div className="space-y-3">
            {EXAMPLE_ROOMS.map((room) => (
              <RoomCard key={room.id} room={room} />
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground/50 pb-2">
          Live room joining requires the V2 backend — coming soon InshaAllah.
        </p>
      </motion.div>
    </PageShell>
  )
}
