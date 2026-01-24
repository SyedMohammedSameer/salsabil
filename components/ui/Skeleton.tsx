import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  count?: number;
}

const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'text',
  width,
  height,
  count = 1,
}) => {
  const variantStyles = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  const defaultHeight = {
    text: '1rem',
    circular: '3rem',
    rectangular: '10rem',
  };

  const skeletonStyle = {
    width: width || (variant === 'circular' ? '3rem' : '100%'),
    height: height || defaultHeight[variant],
  };

  const skeletons = Array.from({ length: count }, (_, i) => (
    <div
      key={i}
      className={`
        ${variantStyles[variant]}
        bg-slate-200 dark:bg-slate-700
        animate-pulse
        ${className}
      `}
      style={skeletonStyle}
    />
  ));

  if (count === 1) {
    return skeletons[0];
  }

  return <div className="space-y-2">{skeletons}</div>;
};

// Common skeleton patterns
export const SkeletonCard: React.FC = () => (
  <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
    <div className="flex items-center space-x-4 mb-4">
      <Skeleton variant="circular" width="3rem" height="3rem" />
      <div className="flex-1">
        <Skeleton width="60%" height="1.5rem" className="mb-2" />
        <Skeleton width="40%" height="1rem" />
      </div>
    </div>
    <Skeleton variant="rectangular" height="8rem" />
  </div>
);

export const SkeletonList: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <div className="space-y-3">
    {Array.from({ length: count }, (_, i) => (
      <div key={i} className="flex items-center space-x-4 p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
        <Skeleton variant="circular" width="2.5rem" height="2.5rem" />
        <div className="flex-1">
          <Skeleton width="70%" height="1.25rem" className="mb-2" />
          <Skeleton width="50%" height="1rem" />
        </div>
      </div>
    ))}
  </div>
);

export const SkeletonText: React.FC<{ lines?: number }> = ({ lines = 3 }) => (
  <div className="space-y-2">
    {Array.from({ length: lines }, (_, i) => (
      <Skeleton
        key={i}
        width={i === lines - 1 ? '60%' : '100%'}
        height="1rem"
      />
    ))}
  </div>
);

export default Skeleton;
