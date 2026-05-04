import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckSquare, BookOpen, HandMetal, Star, ArrowRight, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useUpdateProfile } from '@/hooks/useProfile'
import { cn } from '@/lib/cn'

interface OnboardingFlowProps {
  onComplete: () => void
}

interface Step {
  id: number
  icon: typeof CheckSquare
  iconBg: string
  iconColor: string
  title: string
  subtitle: string
  body: string
  visual: () => React.ReactElement
}

function GrowingTreeVisual() {
  return (
    <div className="flex items-end justify-center gap-4 h-28">
      {[1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: `${i * 28}px`, opacity: 1 }}
          transition={{ delay: i * 0.12, duration: 0.5, ease: 'easeOut' }}
          className="w-6 rounded-t-full bg-gradient-to-t from-noor-700 to-noor-400"
        />
      ))}
    </div>
  )
}

function PrayerVisual() {
  const prayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']
  return (
    <div className="flex gap-2 justify-center">
      {prayers.map((p, i) => (
        <motion.div
          key={p}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1, duration: 0.3 }}
          className="flex flex-col items-center gap-1.5"
        >
          <div className="h-8 w-8 rounded-full bg-noor-500/20 flex items-center justify-center">
            <HandMetal className="h-4 w-4 text-noor-500" strokeWidth={1.75} />
          </div>
          <span className="text-[10px] text-muted-foreground">{p}</span>
        </motion.div>
      ))}
    </div>
  )
}

function NoorVisual() {
  return (
    <motion.div
      className="mx-auto h-24 w-24 rounded-full bg-gradient-to-br from-noor-400 to-noor-600 shadow-lg shadow-noor-500/30 flex items-center justify-center"
      animate={{ scale: [1, 1.06, 1] }}
      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
    >
      <Star className="h-10 w-10 text-white" strokeWidth={1.5} />
    </motion.div>
  )
}

function AppVisual() {
  return (
    <div className="grid grid-cols-2 gap-2 max-w-xs mx-auto">
      {[
        { label: 'Prayers', color: 'bg-noor-500/15 text-noor-600 dark:text-noor-400' },
        { label: 'Quran', color: 'bg-gold-500/15 text-gold-600 dark:text-gold-400' },
        { label: 'Tasks', color: 'bg-accent-500/15 text-accent-600 dark:text-accent-400' },
        { label: 'Focus', color: 'bg-warn-500/15 text-warn-600 dark:text-warn-500' },
      ].map(({ label, color }, i) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.1, duration: 0.25 }}
          className={cn('rounded-xl p-3 text-center text-sm font-medium', color)}
        >
          {label}
        </motion.div>
      ))}
    </div>
  )
}

const STEPS: Step[] = [
  {
    id: 0,
    icon: CheckSquare,
    iconBg: 'bg-noor-500/15',
    iconColor: 'text-noor-500',
    title: 'Welcome to Salsabil',
    subtitle: 'Your productivity + spiritual growth companion',
    body: 'Track your prayers, Quran, tasks, workouts, and focus sessions — all in one place. Built around your deen.',
    visual: AppVisual,
  },
  {
    id: 1,
    icon: HandMetal,
    iconBg: 'bg-accent-500/15',
    iconColor: 'text-accent-500',
    title: 'Track Your Deen',
    subtitle: 'Prayers, Quran, and Adhkar',
    body: 'Log your 5 daily prayers, track Quran pages, and complete morning and evening adhkar — every streak builds a habit.',
    visual: PrayerVisual,
  },
  {
    id: 2,
    icon: BookOpen,
    iconBg: 'bg-warn-500/15',
    iconColor: 'text-warn-500',
    title: 'Grow Your Garden',
    subtitle: 'Earn trees through focus sessions',
    body: 'Every Pomodoro session plants a tree in your garden. Stay focused — abandon a session and your tree dies. Inspired by Forest app.',
    visual: GrowingTreeVisual,
  },
  {
    id: 3,
    icon: Star,
    iconBg: 'bg-noor-500/15',
    iconColor: 'text-noor-500',
    title: 'Meet Noor',
    subtitle: 'Your AI companion — always watching your back',
    body: 'Noor sees all your data and talks like a real friend, not a chatbot. Ask anything, get brutally honest insights, take action — all in one tap.',
    visual: NoorVisual,
  },
]

const variants = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 40 : -40 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -40 : 40 }),
}

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)
  const updateProfile = useUpdateProfile()

  const go = (next: number) => {
    setDir(next > step ? 1 : -1)
    setStep(next)
  }

  const finish = async () => {
    await updateProfile.mutateAsync({ onboarded: true })
    onComplete()
  }

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Skip */}
      <div className="flex justify-end p-4">
        <button
          onClick={finish}
          className="flex items-center gap-1 rounded-full px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="h-3.5 w-3.5" />
          Skip
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 overflow-hidden">
        <div className="w-full max-w-sm">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={step}
              custom={dir}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="space-y-8"
            >
              {/* Visual */}
              <div className="min-h-28 flex items-center justify-center">
                <current.visual />
              </div>

              {/* Text */}
              <div className="space-y-2 text-center">
                <h2 className="text-2xl font-bold tracking-tight text-foreground">
                  {current.title}
                </h2>
                <p className="text-sm font-medium text-noor-600 dark:text-noor-400">
                  {current.subtitle}
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">{current.body}</p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Footer */}
      <div className="p-6 space-y-4">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => go(i)}
              className={cn(
                'rounded-full transition-all duration-200',
                i === step
                  ? 'h-2 w-6 bg-primary'
                  : 'h-2 w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50',
              )}
              aria-label={`Go to step ${i + 1}`}
            />
          ))}
        </div>

        {/* CTA */}
        <div className="flex gap-3">
          {step > 0 && (
            <Button variant="outline" className="flex-1" onClick={() => go(step - 1)}>
              Back
            </Button>
          )}
          <Button
            className={cn('flex-1 gap-2', step === 0 && 'w-full')}
            onClick={isLast ? finish : () => go(step + 1)}
            disabled={updateProfile.isPending}
          >
            {isLast ? (
              "Let's go"
            ) : (
              <>
                Next <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
