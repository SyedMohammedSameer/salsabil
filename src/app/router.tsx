import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { RootLayout } from '@/components/layout/RootLayout'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { PageSkeleton } from '@/components/shared/SkeletonLoader'

// Lazy-load every view — each becomes its own JS chunk
const AuthPage = lazy(() => import('@/views/auth/AuthPage'))
const ResetPasswordView = lazy(() => import('@/views/auth/ResetPasswordView'))
const Dashboard = lazy(() => import('@/views/dashboard/DashboardView'))
const PrayerView = lazy(() => import('@/views/prayer/PrayerView'))
const QuranView = lazy(() => import('@/views/quran/QuranView'))
const AdhkarView = lazy(() => import('@/views/adhkar/AdhkarView'))
const FocusView = lazy(() => import('@/views/focus/FocusView'))
const TasksView = lazy(() => import('@/views/tasks/TasksView'))

const WorkoutsView = lazy(() => import('@/views/workouts/WorkoutsView'))
const ChallengesView = lazy(() => import('@/views/challenges/ChallengesView'))
const StudyRoomsView = lazy(() => import('@/views/study-rooms/StudyRoomsView'))
const GardenView = lazy(() => import('@/views/garden/GardenView'))
const StudyRoomDetail = lazy(() => import('@/views/study-rooms/StudyRoomDetail'))
const NoorView = lazy(() => import('@/views/ai/NoorView'))
const ProfileView = lazy(() => import('@/views/profile/ProfileView'))
const SettingsView = lazy(() => import('@/views/settings/SettingsView'))
const AnalyticsView = lazy(() => import('@/views/analytics/AnalyticsView'))

const Fallback = () => <PageSkeleton />

export const router = createBrowserRouter([
  {
    path: '/auth',
    element: (
      <Suspense fallback={<Fallback />}>
        <AuthPage />
      </Suspense>
    ),
  },
  {
    path: '/auth/reset',
    element: (
      <Suspense fallback={<Fallback />}>
        <ResetPasswordView />
      </Suspense>
    ),
  },
  {
    element: <RootLayout />,
    children: [
      {
        element: <ProtectedRoute />,
        children: [
          {
            index: true,
            element: (
              <Suspense fallback={<Fallback />}>
                <Dashboard />
              </Suspense>
            ),
          },
          {
            path: 'prayers',
            element: (
              <Suspense fallback={<Fallback />}>
                <PrayerView />
              </Suspense>
            ),
          },
          {
            path: 'quran',
            element: (
              <Suspense fallback={<Fallback />}>
                <QuranView />
              </Suspense>
            ),
          },
          {
            path: 'adhkar',
            element: (
              <Suspense fallback={<Fallback />}>
                <AdhkarView />
              </Suspense>
            ),
          },
          {
            path: 'focus',
            element: (
              <Suspense fallback={<Fallback />}>
                <FocusView />
              </Suspense>
            ),
          },
          {
            path: 'tasks',
            element: (
              <Suspense fallback={<Fallback />}>
                <TasksView />
              </Suspense>
            ),
          },
          { path: 'calendar', element: <Navigate to="/tasks" replace /> },
          {
            path: 'workouts',
            element: (
              <Suspense fallback={<Fallback />}>
                <WorkoutsView />
              </Suspense>
            ),
          },
          {
            path: 'challenges',
            element: (
              <Suspense fallback={<Fallback />}>
                <ChallengesView />
              </Suspense>
            ),
          },
          {
            path: 'garden',
            element: (
              <Suspense fallback={<Fallback />}>
                <GardenView />
              </Suspense>
            ),
          },
          {
            path: 'rooms',
            element: (
              <Suspense fallback={<Fallback />}>
                <StudyRoomsView />
              </Suspense>
            ),
          },
          {
            path: 'rooms/:id',
            element: (
              <Suspense fallback={<Fallback />}>
                <StudyRoomDetail />
              </Suspense>
            ),
          },
          {
            path: 'ai',
            element: (
              <Suspense fallback={<Fallback />}>
                <NoorView />
              </Suspense>
            ),
          },
          {
            path: 'profile',
            element: (
              <Suspense fallback={<Fallback />}>
                <ProfileView />
              </Suspense>
            ),
          },
          {
            path: 'settings',
            element: (
              <Suspense fallback={<Fallback />}>
                <SettingsView />
              </Suspense>
            ),
          },
          {
            path: 'analytics',
            element: (
              <Suspense fallback={<Fallback />}>
                <AnalyticsView />
              </Suspense>
            ),
          },
          // Deep link: study room invite
          {
            path: 'join/:roomId',
            element: (
              <Suspense fallback={<Fallback />}>
                <StudyRoomsView />
              </Suspense>
            ),
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
