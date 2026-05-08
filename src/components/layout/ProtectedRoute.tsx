import { useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { PageSkeleton } from '@/components/shared/SkeletonLoader'
import { UsernamePromptModal } from '@/views/auth/UsernamePromptModal'
import OnboardingFlow from '@/views/onboarding/OnboardingFlow'
import { useQueryClient } from '@tanstack/react-query'
import { profileKeys } from '@/hooks/useProfile'

export function ProtectedRoute() {
  const { session, loading } = useAuth()
  const location = useLocation()
  const { data: profile, isLoading: profileLoading } = useProfile()
  const qc = useQueryClient()
  const [onboardingDone, setOnboardingDone] = useState(false)

  if (loading || (session && profileLoading)) return <PageSkeleton />

  if (!session) {
    return <Navigate to="/auth" state={{ from: location }} replace />
  }

  // Block until username is set
  if (profile && !profile.username) {
    return (
      <>
        <Outlet />
        <UsernamePromptModal
          onComplete={() => qc.invalidateQueries({ queryKey: profileKeys.all })}
        />
      </>
    )
  }

  // Show onboarding if not yet completed (and not dismissed this session)
  if (profile && !profile.onboarded && !onboardingDone) {
    return (
      <OnboardingFlow
        onComplete={() => {
          setOnboardingDone(true)
          qc.invalidateQueries({ queryKey: profileKeys.all })
        }}
      />
    )
  }

  return <Outlet />
}
