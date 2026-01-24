// components/ui/EmptyState.tsx - Reusable Empty State Component
import React from 'react';
import { designSystem } from '../../utils/designSystem';
import Button from './Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  illustration?: 'tasks' | 'prayers' | 'quran' | 'garden' | 'workouts' | 'generic';
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  illustration = 'generic',
}) => {
  // Illustration emojis (can be replaced with SVG illustrations later)
  const illustrations = {
    tasks: '📝',
    prayers: '🤲',
    quran: '📖',
    garden: '🌱',
    workouts: '💪',
    generic: '✨',
  };

  const illustrationEmoji = icon || illustrations[illustration];

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {/* Illustration */}
      <div className="mb-4 text-6xl opacity-50">
        {illustrationEmoji}
      </div>

      {/* Title */}
      <h3 className={`${designSystem.typography.h3} ${designSystem.semanticColors.textPrimary} mb-2`}>
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className={`${designSystem.typography.bodySmall} ${designSystem.semanticColors.textSecondary} max-w-md mb-6`}>
          {description}
        </p>
      )}

      {/* Action Button */}
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="primary" size="md">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
