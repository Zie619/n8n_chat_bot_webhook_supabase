import React from 'react';

interface LoadingSkeletonProps {
  className?: string;
  count?: number;
  height?: string | number;
  width?: string | number;
  circle?: boolean;
}

export function LoadingSkeleton({ 
  className = '', 
  count = 1,
  height = '1rem',
  width = '100%',
  circle = false
}: LoadingSkeletonProps) {
  const skeletons = Array.from({ length: count }, (_, i) => (
    <div
      key={i}
      className={`animate-pulse bg-gray-200 dark:bg-gray-700 ${circle ? 'rounded-full' : 'rounded'} ${className}`}
      style={{
        height,
        width,
        marginBottom: count > 1 && i < count - 1 ? '0.5rem' : undefined
      }}
    />
  ));

  return <>{skeletons}</>;
}

// Article Card Skeleton
export function ArticleCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-start justify-between mb-3">
        <LoadingSkeleton width="60%" height="1.5rem" />
        <LoadingSkeleton width="5rem" height="1.5rem" />
      </div>
      <LoadingSkeleton count={2} height="1rem" className="mb-2" />
      <div className="flex items-center justify-between mt-4">
        <LoadingSkeleton width="8rem" height="0.875rem" />
        <div className="flex space-x-2">
          <LoadingSkeleton width="3rem" height="2rem" />
          <LoadingSkeleton width="3rem" height="2rem" />
        </div>
      </div>
    </div>
  );
}

// Article List Skeleton
export function ArticleListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }, (_, i) => (
        <ArticleCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Chat Message Skeleton
export function ChatMessageSkeleton() {
  return (
    <div className="mb-4">
      <div className="flex items-start space-x-2">
        <LoadingSkeleton circle width="2rem" height="2rem" />
        <div className="flex-1">
          <LoadingSkeleton width="30%" height="1rem" className="mb-2" />
          <LoadingSkeleton count={3} height="1rem" />
        </div>
      </div>
    </div>
  );
}