import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Users, Clock, Lock, Globe, Plus, ArrowRight, Search, Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { PageShell } from '@/components/shared/PageShell'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog } from '@/components/ui/dialog'
import { cn } from '@/lib/cn'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import {
  usePublicRooms,
  useCreateRoom,
  useJoinRoom,
  useDeleteRoom,
  fetchRoomByCode,
  type RoomWithCount,
} from '@/hooks/useStudyRooms'

// ─── Create room form ─────────────────────────────────────────────────────────

const createSchema = z.object({
  name: z.string().min(2, 'At least 2 characters').max(50),
  description: z.string().max(120).optional(),
  timer_duration: z.number().min(5).max(120),
  max_participants: z.number().min(2).max(50),
  is_public: z.boolean(),
})
type CreateForm = z.infer<typeof createSchema>

const DURATION_PRESETS = [
  { label: '15m', value: 15 },
  { label: '25m', value: 25 },
  { label: '50m', value: 50 },
  { label: '90m', value: 90 },
]

function CreateRoomDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth()
  const { data: profile } = useProfile()
  const navigate = useNavigate()
  const createRoom = useCreateRoom()
  const joinRoom = useJoinRoom()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: '', timer_duration: 25, max_participants: 10, is_public: true },
  })

  const duration = watch('timer_duration')
  const isPublic = watch('is_public')

  const onSubmit = async (values: CreateForm) => {
    if (!user) return
    try {
      const room = await createRoom.mutateAsync({
        name: values.name,
        description: values.description || null,
        owner_id: user.id,
        is_public: values.is_public,
        max_participants: values.max_participants,
        timer_duration: values.timer_duration,
      })
      await joinRoom.mutateAsync({
        roomId: room.id,
        userId: user.id,
        displayName: profile?.display_name ?? null,
      })
      onClose()
      navigate(`/rooms/${room.id}`)
    } catch {
      toast.error('Could not create room')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <div
        className={cn(
          'fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4',
          !open && 'pointer-events-none',
        )}
      >
        <AnimatePresence>
          {open && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
              />
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 40 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-5 space-y-4"
              >
                <div>
                  <h2 className="text-base font-bold text-foreground">Create a study room</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Set up your space, invite others
                  </p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  {/* Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Room name</label>
                    <input
                      {...register('name')}
                      placeholder="e.g. Fajr Study Circle"
                      className={cn(
                        'w-full rounded-xl border bg-muted px-3.5 py-2.5 text-sm text-foreground',
                        'placeholder:text-muted-foreground outline-none focus:border-noor-500/50',
                        errors.name ? 'border-destructive' : 'border-border',
                      )}
                    />
                    {errors.name && (
                      <p className="text-xs text-destructive">{errors.name.message}</p>
                    )}
                  </div>

                  {/* Description */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">
                      Description <span className="text-muted-foreground">(optional)</span>
                    </label>
                    <input
                      {...register('description')}
                      placeholder="What are you studying?"
                      className="w-full rounded-xl border border-border bg-muted px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-noor-500/50"
                    />
                  </div>

                  {/* Duration */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-foreground">Session duration</label>
                    <div className="flex gap-2">
                      {DURATION_PRESETS.map((p) => (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => setValue('timer_duration', p.value)}
                          className={cn(
                            'flex-1 rounded-xl py-2 text-xs font-semibold transition-colors',
                            duration === p.value
                              ? 'bg-noor-500 text-white'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80',
                          )}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Visibility + max */}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setValue('is_public', !isPublic)}
                      className={cn(
                        'flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors',
                        isPublic
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {isPublic ? (
                        <Globe className="h-3.5 w-3.5" />
                      ) : (
                        <Lock className="h-3.5 w-3.5" />
                      )}
                      {isPublic ? 'Public' : 'Private'}
                    </button>
                    <div className="flex items-center gap-2 ml-auto">
                      <span className="text-xs text-muted-foreground">Max</span>
                      <select
                        {...register('max_participants', { valueAsNumber: true })}
                        className="rounded-lg border border-border bg-muted px-2 py-1.5 text-xs text-foreground outline-none"
                      >
                        {[2, 4, 6, 8, 10, 15, 20, 30, 50].map((n) => (
                          <option key={n} value={n}>
                            {n} people
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
                      Cancel
                    </Button>
                    <Button type="submit" className="flex-1" disabled={createRoom.isPending}>
                      {createRoom.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Create room'
                      )}
                    </Button>
                  </div>
                </form>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </Dialog>
  )
}

// ─── Room card ────────────────────────────────────────────────────────────────

function RoomCard({
  room,
  onJoin,
  isOwner,
  onDelete,
}: {
  room: RoomWithCount
  onJoin: (room: RoomWithCount) => void
  isOwner: boolean
  onDelete: (id: string) => void
}) {
  const isFull = room.participant_count >= room.max_participants

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      layout
    >
      <Card className={cn(isFull && 'opacity-60')}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground truncate">{room.name}</p>
                {room.is_public ? (
                  <Globe className="h-3 w-3 text-muted-foreground shrink-0" />
                ) : (
                  <Lock className="h-3 w-3 text-muted-foreground shrink-0" />
                )}
              </div>
              {room.description && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{room.description}</p>
              )}
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" />
                  {room.participant_count}/{room.max_participants}
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {room.timer_duration}m
                </span>
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-mono">
                  {room.code}
                </Badge>
                {room.timer_state !== 'idle' && (
                  <Badge
                    variant="secondary"
                    className={cn(
                      'text-[10px] h-4 px-1.5',
                      room.timer_state === 'running' && 'bg-emerald-500/10 text-emerald-600',
                      room.timer_state === 'paused' && 'bg-amber-500/10 text-amber-600',
                      room.timer_state === 'done' && 'bg-noor-500/10 text-noor-500',
                    )}
                  >
                    {room.timer_state}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {isOwner && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => onDelete(room.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button
                size="sm"
                variant={isFull ? 'outline' : 'default'}
                disabled={isFull}
                className="h-8"
                onClick={() => onJoin(room)}
              >
                {isFull ? 'Full' : 'Join'}
                {!isFull && <ArrowRight className="h-3.5 w-3.5 ml-1" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ─── Main view ────────────────────────────────────────────────────────────────

export default function StudyRoomsView() {
  const { roomId: inviteRoomId } = useParams<{ roomId?: string }>()
  const { user } = useAuth()
  const { data: profile } = useProfile()
  const navigate = useNavigate()

  const [showCreate, setShowCreate] = useState(false)
  const [codeInput, setCodeInput] = useState(inviteRoomId ?? '')
  const [codeLoading, setCodeLoading] = useState(false)
  const [codeError, setCodeError] = useState('')

  const { data: rooms = [], isLoading, refetch } = usePublicRooms()
  const joinRoom = useJoinRoom()
  const deleteRoom = useDeleteRoom()

  const handleJoin = async (room: RoomWithCount) => {
    if (!user) return
    try {
      await joinRoom.mutateAsync({
        roomId: room.id,
        userId: user.id,
        displayName: profile?.display_name ?? null,
      })
      navigate(`/rooms/${room.id}`)
    } catch {
      toast.error('Could not join room')
    }
  }

  const handleJoinByCode = async () => {
    if (codeInput.trim().length !== 6) return
    setCodeLoading(true)
    setCodeError('')
    try {
      const room = await fetchRoomByCode(codeInput)
      if (!user) return
      await joinRoom.mutateAsync({
        roomId: room.id,
        userId: user.id,
        displayName: profile?.display_name ?? null,
      })
      navigate(`/rooms/${room.id}`)
    } catch {
      setCodeError('Room not found — check the code and try again.')
    } finally {
      setCodeLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteRoom.mutateAsync(id)
      toast.success('Room deleted')
      refetch()
    } catch {
      toast.error('Could not delete room')
    }
  }

  const myRooms = rooms.filter((r) => r.owner_id === user?.id)
  const otherRooms = rooms.filter((r) => r.owner_id !== user?.id)

  return (
    <PageShell maxWidth="5xl">
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
          <Button size="sm" className="gap-1.5" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" />
            New room
          </Button>
        </div>

        {/* Join by code */}
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Join by room code
            </p>
            <div className="flex gap-2">
              <input
                value={codeInput}
                onChange={(e) => {
                  setCodeInput(e.target.value.toUpperCase().slice(0, 6))
                  setCodeError('')
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleJoinByCode()}
                placeholder="6-digit code"
                maxLength={6}
                className={cn(
                  'flex-1 rounded-xl border bg-muted px-3.5 py-2 text-sm',
                  'text-foreground placeholder:text-muted-foreground',
                  'outline-none focus:border-noor-500/50 uppercase tracking-widest font-mono',
                  codeError ? 'border-destructive' : 'border-border',
                )}
              />
              <Button
                size="sm"
                className="h-10 px-4"
                onClick={handleJoinByCode}
                disabled={codeInput.length !== 6 || codeLoading}
              >
                {codeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Join'}
              </Button>
            </div>
            {codeError && <p className="text-xs text-destructive mt-2">{codeError}</p>}
          </CardContent>
        </Card>

        {/* My rooms */}
        {myRooms.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1 mb-3">
              My rooms
            </p>
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {myRooms.map((room) => (
                  <RoomCard
                    key={room.id}
                    room={room}
                    onJoin={handleJoin}
                    isOwner={true}
                    onDelete={handleDelete}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Public rooms */}
        <div>
          <div className="flex items-center justify-between px-1 mb-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {myRooms.length > 0 ? 'Public rooms' : 'Active rooms'}
            </p>
            {!isLoading && (
              <button onClick={() => refetch()} className="text-xs text-noor-500 hover:underline">
                Refresh
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : otherRooms.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Search className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No active public rooms right now.</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Create one and invite a friend — or study solo with a private room.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {otherRooms.map((room) => (
                  <RoomCard
                    key={room.id}
                    room={room}
                    onJoin={handleJoin}
                    isOwner={false}
                    onDelete={handleDelete}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </motion.div>

      <CreateRoomDialog open={showCreate} onClose={() => setShowCreate(false)} />
    </PageShell>
  )
}
