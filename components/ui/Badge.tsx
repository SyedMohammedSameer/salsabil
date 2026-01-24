// components/ui/Badge.tsx - Unified Badge Component
import React from 'react';
import { designSystem } from '../../utils/designSystem';

type BadgeVariant = 'primary' | 'success' | 'warning' | 'danger' | 'spiritual';

interface BadgeProps {
  variant?: BadgeVariant;
  className?: string;
  children: React.ReactNode;
}

const Badge: React.FC<BadgeProps> = ({
  variant = 'primary',
  className = '',
  children,
}) => {
  const variantStyles = designSystem.badgeVariants[variant];

  return (
    <span className={`inline-flex items-center ${variantStyles} ${className}`}>
      {children}
    </span>
  );
};

export default Badge;
