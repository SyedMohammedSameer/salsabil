import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Moon, Sun, Monitor, Bell, Clock, Palette, ChevronRight } from 'lucide-react'
import { PageShell } from '@/components/shared/PageShell'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTheme } from '@/hooks/useTheme'
import { useProfile, useUpdateProfile } from '@/hooks/useProfile'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/cn'
import type { Theme } from '@/types'

const THEMES: { value: Theme; label: string; icon: typeof Moon }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

function SettingRow({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-border last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function SectionHeader({ icon: Icon, title }: { icon: typeof Bell; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-1">
      <Icon className="h-4 w-4 text-noor-500" />
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{title}</p>
    </div>
  )
}

export default function SettingsView() {
  const { theme, setTheme } = useTheme()
  const { data: profile } = useProfile()
  const update = useUpdateProfile()
  const { signOut } = useAuth()

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [savingName, setSavingName] = useState(false)

  const handleSaveName = async () => {
    if (!displayName.trim()) return
    setSavingName(true)
    try {
      await update.mutateAsync({ display_name: displayName.trim() })
    } finally {
      setSavingName(false)
    }
  }

  return (
    <PageShell maxWidth="lg">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="space-y-5"
      >
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground">Customize your Salsabil experience</p>
        </div>

        {/* Appearance */}
        <div>
          <SectionHeader icon={Palette} title="Appearance" />
          <Card>
            <CardContent className="p-4">
              <p className="text-sm font-medium text-foreground mb-3">Theme</p>
              <div className="grid grid-cols-3 gap-2">
                {THEMES.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setTheme(value)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 rounded-xl py-3 border text-xs font-medium transition-all',
                      theme === value
                        ? 'border-noor-500 bg-noor-500/10 text-noor-600 dark:text-noor-400'
                        : 'border-border text-muted-foreground hover:border-muted-foreground/40',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Profile */}
        <div>
          <SectionHeader icon={Clock} title="Profile" />
          <Card>
            <CardContent className="p-4 space-y-3">
              <SettingRow label="Display name" description="Shown in your profile">
                <div className="flex items-center gap-2">
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                    placeholder={profile?.username ?? 'Your name'}
                    className="h-8 w-36 text-sm"
                  />
                  <Button
                    size="sm"
                    className="h-8 px-3"
                    onClick={handleSaveName}
                    disabled={savingName || !displayName.trim()}
                  >
                    Save
                  </Button>
                </div>
              </SettingRow>
              <SettingRow label="Username" description="@handle (set during onboarding)">
                <p className="text-sm text-muted-foreground">@{profile?.username}</p>
              </SettingRow>
              <SettingRow label="Timezone" description="Used for prayer time adjustments">
                <p className="text-sm text-muted-foreground">{profile?.timezone ?? 'UTC'}</p>
              </SettingRow>
            </CardContent>
          </Card>
        </div>

        {/* Notifications */}
        <div>
          <SectionHeader icon={Bell} title="Notifications" />
          <Card>
            <CardContent className="p-4">
              <SettingRow
                label="Push notifications"
                description="Prayer reminders and streak alerts"
              >
                <button
                  onClick={() => {
                    if ('Notification' in window) {
                      Notification.requestPermission()
                    }
                  }}
                  className="flex items-center gap-1.5 text-sm text-noor-500 font-medium"
                >
                  Enable
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </SettingRow>
            </CardContent>
          </Card>
        </div>

        {/* Data */}
        <div>
          <SectionHeader icon={Clock} title="Data" />
          <Card>
            <CardContent className="p-4 space-y-1">
              <SettingRow label="Export data" description="Download all your data as JSON">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  onClick={() => {
                    const data = JSON.stringify(
                      { profile, exportedAt: new Date().toISOString() },
                      null,
                      2,
                    )
                    const blob = new Blob([data], { type: 'application/json' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `salsabil-export-${new Date().toISOString().split('T')[0]}.json`
                    a.click()
                    URL.revokeObjectURL(url)
                  }}
                >
                  Export
                </Button>
              </SettingRow>
            </CardContent>
          </Card>
        </div>

        {/* Sign out */}
        <Card className="border-destructive/20">
          <CardContent className="p-4">
            <Button
              variant="outline"
              className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() => {
                if (window.confirm('Sign out?')) signOut()
              }}
            >
              Sign out
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground/50 pb-2">
          Salsabil — v1.0 · Built with tawakkul
        </p>
      </motion.div>
    </PageShell>
  )
}
