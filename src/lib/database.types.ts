export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

// ─── Enum types ──────────────────────────────────────────────────────────────

export type PrayerName = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha' | 'tahajjud'
export type PrayerStatus = 'prayed' | 'missed' | 'late' | 'qada'
export type AdhkarTime = 'morning' | 'evening' | 'after_prayer' | 'other'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type TaskRecurrence = 'none' | 'daily' | 'weekly' | 'monthly'
export type SessionType = 'pomodoro' | 'short_break' | 'long_break' | 'flow'
export type TreeSpecies =
  | 'olive'
  | 'date_palm'
  | 'cedar'
  | 'lote'
  | 'fig'
  | 'pomegranate'
  | 'acacia'
  | 'sakura'
  | 'oak'
  | 'pine'
  | 'banyan'
  | 'baobab'
export type TreeStage = 'seed' | 'sprout' | 'sapling' | 'young' | 'mature' | 'ancient'
export type WorkoutType = 'strength' | 'cardio' | 'flexibility' | 'sports' | 'walk' | 'other'
export type ChallengeStatus = 'active' | 'completed' | 'failed' | 'paused'
export type CoinAction =
  | 'focus_complete'
  | 'prayer_logged'
  | 'quran_page'
  | 'task_complete'
  | 'workout_logged'
  | 'challenge_complete'
  | 'adhkar_complete'
  | 'streak_bonus'
  | 'tree_purchase'
  | 'achievement_bonus'
export type ChatRole = 'user' | 'assistant' | 'system'
export type TimerState = 'idle' | 'running' | 'paused' | 'done'

// ─── Database schema ─────────────────────────────────────────────────────────

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string | null
          display_name: string | null
          avatar_url: string | null
          timezone: string
          onboarded: boolean
          coins: number
          streak: number
          longest_streak: number
          last_active: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username?: string | null
          display_name?: string | null
          avatar_url?: string | null
          timezone?: string
          onboarded?: boolean
          coins?: number
          streak?: number
          longest_streak?: number
          last_active?: string | null
        }
        Update: {
          username?: string | null
          display_name?: string | null
          avatar_url?: string | null
          timezone?: string
          onboarded?: boolean
          coins?: number
          streak?: number
          longest_streak?: number
          last_active?: string | null
        }
        Relationships: []
      }
      prayers: {
        Row: {
          id: string
          user_id: string
          date: string
          prayer: PrayerName
          status: PrayerStatus | null
          prayed_at: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          user_id: string
          date: string
          prayer: PrayerName
          status?: PrayerStatus | null
          prayed_at?: string | null
          notes?: string | null
        }
        Update: {
          status?: PrayerStatus | null
          prayed_at?: string | null
          notes?: string | null
        }
        Relationships: []
      }
      quran_logs: {
        Row: {
          id: string
          user_id: string
          date: string
          surah_from: number
          ayah_from: number
          surah_to: number
          ayah_to: number
          pages_read: number
          duration_mins: number | null
          notes: string | null
          created_at: string
        }
        Insert: {
          user_id: string
          date: string
          surah_from: number
          ayah_from: number
          surah_to: number
          ayah_to: number
          pages_read: number
          duration_mins?: number | null
          notes?: string | null
        }
        Update: {
          surah_from?: number
          ayah_from?: number
          surah_to?: number
          ayah_to?: number
          pages_read?: number
          duration_mins?: number | null
          notes?: string | null
        }
        Relationships: []
      }
      adhkar_logs: {
        Row: {
          id: string
          user_id: string
          date: string
          time: AdhkarTime
          completed: boolean
          completed_at: string | null
          created_at: string
        }
        Insert: {
          user_id: string
          date: string
          time: AdhkarTime
          completed?: boolean
          completed_at?: string | null
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          priority: TaskPriority
          due_date: string | null
          due_time: string | null
          completed: boolean
          completed_at: string | null
          recurrence: TaskRecurrence
          tags: string[]
          order_index: number
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          title: string
          description?: string | null
          priority?: TaskPriority
          due_date?: string | null
          due_time?: string | null
          completed?: boolean
          completed_at?: string | null
          recurrence?: TaskRecurrence
          tags?: string[]
          order_index?: number
        }
        Update: {
          title?: string
          description?: string | null
          priority?: TaskPriority
          due_date?: string | null
          due_time?: string | null
          completed?: boolean
          completed_at?: string | null
          recurrence?: TaskRecurrence
          tags?: string[]
          order_index?: number
        }
        Relationships: []
      }
      focus_sessions: {
        Row: {
          id: string
          user_id: string
          type: SessionType
          duration_mins: number
          completed: boolean
          task_id: string | null
          coins_earned: number
          started_at: string
          ended_at: string | null
          created_at: string
        }
        Insert: {
          user_id: string
          type: SessionType
          duration_mins: number
          completed?: boolean
          task_id?: string | null
          coins_earned?: number
          started_at?: string
          ended_at?: string | null
        }
        Update: {
          completed?: boolean
          task_id?: string | null
          coins_earned?: number
          ended_at?: string | null
        }
        Relationships: []
      }
      garden_trees: {
        Row: {
          id: string
          user_id: string
          species: TreeSpecies
          name: string | null
          stage: TreeStage
          xp: number
          planted_at: string
          last_watered_at: string | null
          position_x: number
          position_y: number
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          species: TreeSpecies
          name?: string | null
          stage?: TreeStage
          xp?: number
          planted_at?: string
          last_watered_at?: string | null
          position_x?: number
          position_y?: number
        }
        Update: {
          name?: string | null
          stage?: TreeStage
          xp?: number
          last_watered_at?: string | null
          position_x?: number
          position_y?: number
        }
        Relationships: []
      }
      workouts: {
        Row: {
          id: string
          user_id: string
          type: WorkoutType
          title: string
          duration_mins: number
          notes: string | null
          date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          type: WorkoutType
          title: string
          duration_mins: number
          notes?: string | null
          date: string
        }
        Update: {
          type?: WorkoutType
          title?: string
          duration_mins?: number
          notes?: string | null
          date?: string
        }
        Relationships: []
      }
      challenges: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          target_days: number
          current_days: number
          status: ChallengeStatus
          start_date: string
          end_date: string | null
          category: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          title: string
          description?: string | null
          target_days: number
          current_days?: number
          status?: ChallengeStatus
          start_date: string
          end_date?: string | null
          category?: string | null
        }
        Update: {
          title?: string
          description?: string | null
          target_days?: number
          current_days?: number
          status?: ChallengeStatus
          start_date?: string
          end_date?: string | null
          category?: string | null
        }
        Relationships: []
      }
      achievements: {
        Row: {
          id: string
          user_id: string
          achievement_id: string
          unlocked_at: string
        }
        Insert: {
          user_id: string
          achievement_id: string
          unlocked_at?: string
        }
        Update: never
        Relationships: []
      }
      coin_transactions: {
        Row: {
          id: string
          user_id: string
          action: CoinAction
          amount: number
          balance: number
          description: string | null
          created_at: string
        }
        Insert: {
          user_id: string
          action: CoinAction
          amount: number
          balance: number
          description?: string | null
        }
        Update: never
        Relationships: []
      }
      chat_messages: {
        Row: {
          id: string
          user_id: string
          role: ChatRole
          content: string
          model: string | null
          tokens: number | null
          created_at: string
        }
        Insert: {
          user_id: string
          role: ChatRole
          content: string
          model?: string | null
          tokens?: number | null
        }
        Update: never
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          body: string | null
          read: boolean
          action_url: string | null
          created_at: string
        }
        Insert: {
          user_id: string
          type: string
          title: string
          body?: string | null
          read?: boolean
          action_url?: string | null
        }
        Update: {
          read?: boolean
        }
        Relationships: []
      }
      study_rooms: {
        Row: {
          id: string
          code: string
          name: string
          description: string | null
          owner_id: string
          is_public: boolean
          max_participants: number
          timer_duration: number
          timer_state: TimerState
          timer_started_at: string | null
          timer_remaining: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          name: string
          description?: string | null
          owner_id: string
          is_public?: boolean
          max_participants?: number
          timer_duration?: number
        }
        Update: {
          name?: string
          description?: string | null
          is_public?: boolean
          max_participants?: number
          timer_duration?: number
          timer_state?: TimerState
          timer_started_at?: string | null
          timer_remaining?: number | null
        }
        Relationships: []
      }
      room_participants: {
        Row: {
          id: string
          room_id: string
          user_id: string
          display_name: string | null
          joined_at: string
          last_seen_at: string
        }
        Insert: {
          room_id: string
          user_id: string
          display_name?: string | null
          last_seen_at?: string
        }
        Update: {
          last_seen_at?: string
        }
        Relationships: []
      }
      room_messages: {
        Row: {
          id: string
          room_id: string
          user_id: string
          display_name: string | null
          content: string
          created_at: string
        }
        Insert: {
          room_id: string
          user_id: string
          display_name?: string | null
          content: string
        }
        Update: never
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      prayer_name: PrayerName
      prayer_status: PrayerStatus
      adhkar_time: AdhkarTime
      task_priority: TaskPriority
      task_recurrence: TaskRecurrence
      session_type: SessionType
      tree_species: TreeSpecies
      tree_stage: TreeStage
      workout_type: WorkoutType
      challenge_status: ChallengeStatus
      coin_action: CoinAction
      chat_role: ChatRole
      timer_state: TimerState
    }
    CompositeTypes: Record<string, never>
  }
}

// ─── Convenience row types ────────────────────────────────────────────────────

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Prayer = Database['public']['Tables']['prayers']['Row']
export type QuranLog = Database['public']['Tables']['quran_logs']['Row']
export type AdhkarLog = Database['public']['Tables']['adhkar_logs']['Row']
export type Task = Database['public']['Tables']['tasks']['Row']
export type FocusSession = Database['public']['Tables']['focus_sessions']['Row']
export type GardenTree = Database['public']['Tables']['garden_trees']['Row']
export type Workout = Database['public']['Tables']['workouts']['Row']
export type Challenge = Database['public']['Tables']['challenges']['Row']
export type Achievement = Database['public']['Tables']['achievements']['Row']
export type CoinTransaction = Database['public']['Tables']['coin_transactions']['Row']
export type ChatMessage = Database['public']['Tables']['chat_messages']['Row']
export type Notification = Database['public']['Tables']['notifications']['Row']
export type StudyRoom = Database['public']['Tables']['study_rooms']['Row']
export type RoomParticipant = Database['public']['Tables']['room_participants']['Row']
export type RoomMessage = Database['public']['Tables']['room_messages']['Row']
