import { useState } from 'react'
import { motion } from 'framer-motion'
import { User, Flame, Coins, Star, Calendar, Edit2, Check, X } from 'lucide-react'
import { PageShell } from '@/components/shared/PageShell'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/shared/SkeletonLoader'
import { useProfile, useUpdateProfile } from '@/hooks/useProfile'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/cn'

function StatBlock({
  value,
  label,
  icon: Icon,
  color,
}: {
  value: string | number
  label: string
  icon: typeof Flame
  color: string
}) {
  return (
    <div className="flex flex-col items-center gap-1 py-4 flex-1">
      <Icon className={cn('h-5 w-5', color)} strokeWidth={1.75} />
      <p className="text-xl font-bold text-foreground tabular-nums">{value}</p>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide text-center">
        {label}
      </p>
    </div>
  )
}

function Avatar({ initials, size = 'lg' }: { initials: string; size?: 'sm' | 'lg' }) {
  const dim = size === 'lg' ? 'h-20 w-20 text-2xl' : 'h-10 w-10 text-sm'
  return (
    <div
      className={cn(
        'rounded-full bg-gradient-to-br from-noor-400 to-noor-600 flex items-center justify-center font-bold text-white shrink-0',
        dim,
      )}
    >
      {initials}
    </div>
  )
}

export default function ProfileView() {
  const { user, signOut } = useAuth()
  const { data: profile, isLoading } = useProfile()
  const update = useUpdateProfile()

  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')

  const initials = profile?.display_name
    ? profile.display_name
        .split(' ')
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : profile?.username
      ? profile.username.slice(0, 2).toUpperCase()
      : '?'

  const joinDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '—'

  const handleSaveName = async () => {
    if (!nameInput.trim()) return
    await update.mutateAsync({ display_name: nameInput.trim() })
    setEditingName(false)
  }

  const handleStartEdit = () => {
    setNameInput(profile?.display_name ?? profile?.username ?? '')
    setEditingName(true)
  }

  if (isLoading) {
    return (
      <PageShell maxWidth="3xl">
        <div className="space-y-4">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell maxWidth="3xl">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="space-y-4"
      >
        {/* Identity card */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <Avatar initials={initials} />
              <div className="flex-1 min-w-0">
                {editingName ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                      autoFocus
                      className="h-8 text-sm"
                      placeholder="Display name"
                    />
                    <button
                      onClick={handleSaveName}
                      className="rounded-lg p-1.5 text-accent-500 hover:bg-accent-500/10 transition-colors"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setEditingName(false)}
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="text-base font-bold text-foreground truncate">
                      {profile?.display_name ?? profile?.username ?? 'Anonymous'}
                    </p>
                    <button
                      onClick={handleStartEdit}
                      className="rounded-lg p-1 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
                <p className="text-sm text-muted-foreground mt-0.5">@{profile?.username}</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Calendar className="h-3 w-3 text-muted-foreground/50" />
                  <p className="text-xs text-muted-foreground">Joined {joinDate}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats strip */}
        <Card>
          <CardContent className="p-0">
            <div className="flex divide-x divide-border">
              <StatBlock
                icon={Flame}
                value={profile?.streak ?? 0}
                label="Day streak"
                color="text-noor-500"
              />
              <StatBlock
                icon={Star}
                value={profile?.longest_streak ?? 0}
                label="Best streak"
                color="text-gold-500"
              />
              <StatBlock
                icon={Coins}
                value={profile?.coins ?? 0}
                label="Coins"
                color="text-gold-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* Account info */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Account
            </p>
            <div className="flex items-center gap-3 py-1">
              <User className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm text-foreground truncate">{user?.email}</p>
              </div>
            </div>
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">
                Timezone: {profile?.timezone ?? 'UTC'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Danger zone */}
        <Card className="border-destructive/20">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Danger zone
            </p>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive border-destructive/30 hover:bg-destructive/10 w-full"
              onClick={() => {
                if (window.confirm('Sign out of your account?')) signOut()
              }}
            >
              Sign out
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </PageShell>
  )
}
