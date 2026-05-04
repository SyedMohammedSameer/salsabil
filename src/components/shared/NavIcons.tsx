import {
  Home,
  Timer,
  HandMetal,
  CheckSquare,
  Calendar,
  BookOpen,
  MessageCircle,
  Dumbbell,
  Trophy,
  Users,
  User,
  Settings,
  BarChart3,
  ChevronRight,
  MoreHorizontal,
} from 'lucide-react'

const sz = { size: 20, strokeWidth: 1.75 } as const

export const IconHome = () => <Home {...sz} />
export const IconFocus = () => <Timer {...sz} />
export const IconPrayer = () => <HandMetal {...sz} />
export const IconTasks = () => <CheckSquare {...sz} />
export const IconCalendar = () => <Calendar {...sz} />
export const IconQuran = () => <BookOpen {...sz} />
export const IconAdhkar = () => <MessageCircle {...sz} />
export const IconWorkouts = () => <Dumbbell {...sz} />
export const IconChallenges = () => <Trophy {...sz} />
export const IconRooms = () => <Users {...sz} />
export const IconProfile = () => <User {...sz} />
export const IconSettings = () => <Settings {...sz} />
export const IconAnalytics = () => <BarChart3 {...sz} />
export const IconChevronRight = () => <ChevronRight {...sz} />
export const IconMore = () => <MoreHorizontal {...sz} />
