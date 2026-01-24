// utils/designSystem.ts - Unified Design System for Salsabil
// All spacing, colors, typography, and UI tokens in one place

/**
 * DESIGN SYSTEM PRINCIPLES:
 * 1. Consistency - Same spacing, colors, typography across all components
 * 2. Accessibility - WCAG AA contrast ratios, proper focus states
 * 3. Responsiveness - Mobile-first, tablet-optimized
 * 4. Islamic Aesthetics - Calming colors, spiritual themes
 */

// ============================================================================
// SPACING SCALE (Tailwind units: 1 = 4px)
// ============================================================================
export const spacing = {
  xs: '0.5rem',    // 8px  - Tight spacing between related elements
  sm: '0.75rem',   // 12px - Small gaps
  md: '1rem',      // 16px - Base spacing (default)
  lg: '1.5rem',    // 24px - Comfortable spacing
  xl: '2rem',      // 32px - Large spacing
  '2xl': '3rem',   // 48px - Extra large spacing
  '3xl': '4rem',   // 64px - Huge spacing
} as const;

// Component-specific spacing
export const componentSpacing = {
  cardPadding: 'p-5',           // 20px - All cards use this
  buttonPadding: 'px-4 py-2',   // 16px horizontal, 8px vertical
  inputPadding: 'px-3 py-2',    // 12px horizontal, 8px vertical
  sectionGap: 'gap-6',          // 24px - Between major sections
  itemGap: 'gap-4',             // 16px - Between related items
  tightGap: 'gap-2',            // 8px - Very tight spacing
} as const;

// ============================================================================
// TYPOGRAPHY SCALE
// ============================================================================
export const fontSize = {
  xs: '0.75rem',      // 12px - Small labels, captions
  sm: '0.875rem',     // 14px - Secondary text
  base: '1rem',       // 16px - Body text (default)
  lg: '1.125rem',     // 18px - Subheadings
  xl: '1.25rem',      // 20px - Card titles
  '2xl': '1.5rem',    // 24px - Page titles
  '3xl': '1.875rem',  // 30px - Hero text
  '4xl': '2.25rem',   // 36px - Large numbers/stats
} as const;

export const fontWeight = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

export const typography = {
  // Headings
  h1: 'text-3xl font-bold',
  h2: 'text-2xl font-bold',
  h3: 'text-xl font-semibold',
  h4: 'text-lg font-semibold',

  // Body text
  body: 'text-base font-normal',
  bodyLarge: 'text-lg font-normal',
  bodySmall: 'text-sm font-normal',

  // Labels
  label: 'text-sm font-medium',
  labelSmall: 'text-xs font-medium uppercase tracking-wider',

  // Numbers/Stats
  statNumber: 'text-4xl font-bold',
  statLabel: 'text-base font-medium',
} as const;

// ============================================================================
// COLOR PALETTE (Reduced to core colors + grays)
// ============================================================================
export const colors = {
  // Primary (Blue - Islamic serenity, knowledge)
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',   // Main primary
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },

  // Success (Emerald - Growth, spiritual progress)
  success: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#34d399',
    500: '#10b981',   // Main success
    600: '#059669',
    700: '#047857',
    800: '#065f46',
    900: '#064e3b',
  },

  // Warning (Amber - Attention, reminders)
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',   // Main warning
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },

  // Danger (Red - Errors, urgent)
  danger: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',   // Main danger
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },

  // Spiritual (Purple - Islamic spirituality, prayer)
  spiritual: {
    50: '#faf5ff',
    100: '#f3e8ff',
    200: '#e9d5ff',
    300: '#d8b4fe',
    400: '#c084fc',
    500: '#a855f7',   // Main spiritual
    600: '#9333ea',
    700: '#7e22ce',
    800: '#6b21a8',
    900: '#581c87',
  },

  // Grays (Neutral backgrounds and text)
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
} as const;

// Semantic color mapping
export const semanticColors = {
  // Background
  bgPrimary: 'bg-white dark:bg-slate-900',
  bgSecondary: 'bg-slate-50 dark:bg-slate-800',
  bgTertiary: 'bg-slate-100 dark:bg-slate-700',

  // Text
  textPrimary: 'text-slate-900 dark:text-slate-100',
  textSecondary: 'text-slate-600 dark:text-slate-400',
  textMuted: 'text-slate-500 dark:text-slate-500',

  // Borders
  borderLight: 'border-slate-200 dark:border-slate-700',
  borderMedium: 'border-slate-300 dark:border-slate-600',

  // States
  hover: 'hover:bg-slate-100 dark:hover:bg-slate-800',
  active: 'bg-blue-50 dark:bg-blue-900/20',
  focus: 'focus:ring-2 focus:ring-blue-500 focus:outline-none',
} as const;

// ============================================================================
// SHADOWS (Reduced to 4 levels)
// ============================================================================
export const shadows = {
  sm: 'shadow-sm',      // Subtle shadow for cards
  md: 'shadow-md',      // Medium shadow for elevated elements
  lg: 'shadow-lg',      // Large shadow for modals
  xl: 'shadow-xl',      // Extra large shadow for popovers
  none: 'shadow-none',
} as const;

// ============================================================================
// BORDER RADIUS
// ============================================================================
export const borderRadius = {
  sm: 'rounded-md',     // 6px - Small elements
  md: 'rounded-lg',     // 8px - Default cards
  lg: 'rounded-xl',     // 12px - Large cards
  xl: 'rounded-2xl',    // 16px - Hero elements
  full: 'rounded-full', // Pills, avatars
} as const;

// ============================================================================
// TRANSITIONS & ANIMATIONS
// ============================================================================
export const transitions = {
  fast: 'transition-all duration-150 ease-in-out',
  base: 'transition-all duration-200 ease-in-out',
  slow: 'transition-all duration-300 ease-in-out',

  // Specific properties
  colors: 'transition-colors duration-200',
  transform: 'transition-transform duration-200',
  opacity: 'transition-opacity duration-200',
} as const;

export const animations = {
  fadeIn: 'animate-fadeIn',
  slideUp: 'animate-slideUp',
  slideDown: 'animate-slideDown',
  pulse: 'animate-pulse',
  bounce: 'animate-bounce',
  spin: 'animate-spin',
} as const;

// ============================================================================
// Z-INDEX LAYERS (Prevent z-index chaos)
// ============================================================================
export const zIndex = {
  base: 'z-0',
  dropdown: 'z-10',
  sticky: 'z-20',
  fixed: 'z-30',
  modalBackdrop: 'z-40',
  modal: 'z-50',
  popover: 'z-60',
  tooltip: 'z-70',
} as const;

// ============================================================================
// COMPONENT VARIANTS
// ============================================================================

// Button variants
export const buttonVariants = {
  primary: 'bg-blue-600 hover:bg-blue-700 text-white ' + shadows.sm + ' ' + transitions.base,
  secondary: 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-900 dark:text-slate-100 ' + transitions.base,
  ghost: 'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 ' + transitions.base,
  danger: 'bg-red-600 hover:bg-red-700 text-white ' + shadows.sm + ' ' + transitions.base,
  success: 'bg-emerald-600 hover:bg-emerald-700 text-white ' + shadows.sm + ' ' + transitions.base,
} as const;

export const buttonSizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
} as const;

// Card variants
export const cardVariants = {
  default: 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 ' + borderRadius.md + ' ' + componentSpacing.cardPadding + ' ' + shadows.sm,
  elevated: 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 ' + borderRadius.lg + ' ' + componentSpacing.cardPadding + ' ' + shadows.md,
  gradient: 'bg-gradient-to-br from-white via-blue-50/50 to-cyan-50/50 dark:from-slate-800 dark:via-blue-900/10 dark:to-cyan-900/10 border border-slate-200/60 dark:border-slate-700/60 ' + borderRadius.lg + ' ' + componentSpacing.cardPadding + ' ' + shadows.sm,
} as const;

// Input variants
export const inputVariants = {
  default: 'bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 ' + borderRadius.md + ' ' + componentSpacing.inputPadding + ' ' + semanticColors.focus + ' ' + transitions.colors,
  error: 'bg-red-50 dark:bg-red-900/20 border-2 border-red-500 text-slate-900 dark:text-slate-100 ' + borderRadius.md + ' ' + componentSpacing.inputPadding + ' focus:ring-2 focus:ring-red-500 ' + transitions.colors,
  success: 'bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-500 text-slate-900 dark:text-slate-100 ' + borderRadius.md + ' ' + componentSpacing.inputPadding + ' focus:ring-2 focus:ring-emerald-500 ' + transitions.colors,
} as const;

// Badge variants
export const badgeVariants = {
  primary: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2.5 py-0.5 text-xs font-medium ' + borderRadius.sm,
  success: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2.5 py-0.5 text-xs font-medium ' + borderRadius.sm,
  warning: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2.5 py-0.5 text-xs font-medium ' + borderRadius.sm,
  danger: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2.5 py-0.5 text-xs font-medium ' + borderRadius.sm,
  spiritual: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2.5 py-0.5 text-xs font-medium ' + borderRadius.sm,
} as const;

// ============================================================================
// BREAKPOINTS (for reference, use Tailwind's responsive utilities)
// ============================================================================
export const breakpoints = {
  sm: '640px',   // Mobile landscape
  md: '768px',   // Tablet
  lg: '1024px',  // Desktop
  xl: '1280px',  // Large desktop
  '2xl': '1536px', // Extra large
} as const;

// ============================================================================
// ISLAMIC THEME ADDITIONS
// ============================================================================
export const islamicColors = {
  // Gold accents (Islamic architecture, calligraphy)
  gold: {
    light: '#fbbf24',
    DEFAULT: '#f59e0b',
    dark: '#d97706',
  },

  // Teal (Masjid domes, Islamic art)
  teal: {
    light: '#5eead4',
    DEFAULT: '#14b8a6',
    dark: '#0f766e',
  },

  // Prayer time colors
  prayer: {
    fajr: '#4c1d95',      // Deep purple (dawn)
    dhuhr: '#f59e0b',     // Golden (midday sun)
    asr: '#fb923c',       // Orange (afternoon)
    maghrib: '#ec4899',   // Pink (sunset)
    isha: '#312e81',      // Dark blue (night)
  },
} as const;

// ============================================================================
// ACCESSIBILITY
// ============================================================================
export const a11y = {
  // Focus visible (keyboard navigation)
  focusVisible: 'focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:outline-none',

  // Screen reader only
  srOnly: 'sr-only',

  // Minimum touch target (44x44px - WCAG)
  minTouchTarget: 'min-h-[44px] min-w-[44px]',

  // Skip to content
  skipLink: 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-white px-4 py-2 ' + borderRadius.md + ' ' + shadows.lg + ' z-50',
} as const;

// ============================================================================
// EXPORT ALL
// ============================================================================
export const designSystem = {
  spacing,
  componentSpacing,
  fontSize,
  fontWeight,
  typography,
  colors,
  semanticColors,
  shadows,
  borderRadius,
  transitions,
  animations,
  zIndex,
  buttonVariants,
  buttonSizes,
  cardVariants,
  inputVariants,
  badgeVariants,
  breakpoints,
  islamicColors,
  a11y,
} as const;

export default designSystem;
