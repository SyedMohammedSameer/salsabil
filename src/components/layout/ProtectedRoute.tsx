import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { PageSkeleton } from '@/components/shared/SkeletonLoader'

export function ProtectedRoute() {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) return <PageSkeleton />

  if (!session) {
    return <Navigate to="/auth" state={{ from: location }} replace />
  }

  return <Outlet />
}
