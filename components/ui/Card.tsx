// components/ui/Card.tsx - Unified Card Component
import React from 'react';
import { designSystem } from '../../utils/designSystem';

type CardVariant = 'default' | 'elevated' | 'gradient';

interface CardProps {
  variant?: CardVariant;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  hover?: boolean;
}

const Card: React.FC<CardProps> = ({
  variant = 'default',
  className = '',
  children,
  onClick,
  hover = false,
}) => {
  const variantStyles = designSystem.cardVariants[variant];
  const hoverStyles = hover ? 'hover:shadow-md hover:scale-[1.02] cursor-pointer ' + designSystem.transitions.base : '';
  const clickableStyles = onClick ? 'cursor-pointer' : '';

  return (
    <div
      className={`${variantStyles} ${hoverStyles} ${clickableStyles} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export default Card;
