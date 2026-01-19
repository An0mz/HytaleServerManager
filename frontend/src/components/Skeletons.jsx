import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

// Skeleton for server cards in Dashboard
export function ServerCardSkeleton() {
  const { theme } = useTheme();
  
  return (
    <div className={`${theme.card} p-6 animate-pulse`}>
      {/* Header skeleton */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3 flex-1">
          <div className="w-12 h-12 bg-gray-700 rounded-xl" />
          <div className="flex-1">
            <div className="h-5 bg-gray-700 rounded w-32 mb-2" />
            <div className="h-4 bg-gray-700 rounded w-48" />
          </div>
        </div>
        <div className="w-20 h-6 bg-gray-700 rounded-full" />
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {[1, 2, 3].map(i => (
          <div key={i}>
            <div className="h-3 bg-gray-700 rounded w-16 mb-2" />
            <div className="h-6 bg-gray-700 rounded w-20" />
          </div>
        ))}
      </div>

      {/* Buttons skeleton */}
      <div className="flex gap-2">
        <div className="flex-1 h-10 bg-gray-700 rounded-xl" />
        <div className="w-10 h-10 bg-gray-700 rounded-xl" />
        <div className="w-10 h-10 bg-gray-700 rounded-xl" />
      </div>
    </div>
  );
}

// Skeleton for server detail stats
export function StatsRowSkeleton() {
  const { theme } = useTheme();
  
  return (
    <div className={`${theme.card} p-6 animate-pulse`}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i}>
            <div className="h-4 bg-gray-700 rounded w-20 mb-2" />
            <div className="h-8 bg-gray-700 rounded w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Skeleton for user list
export function UserRowSkeleton() {
  const { theme } = useTheme();
  
  return (
    <div className={`${theme.card} p-4 animate-pulse`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 flex-1">
          <div className="w-10 h-10 bg-gray-700 rounded-full" />
          <div className="flex-1">
            <div className="h-5 bg-gray-700 rounded w-32 mb-2" />
            <div className="h-4 bg-gray-700 rounded w-24" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="w-24 h-8 bg-gray-700 rounded-lg" />
          <div className="w-8 h-8 bg-gray-700 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

// Skeleton for file list
export function FileRowSkeleton() {
  const { theme } = useTheme();
  
  return (
    <div className={`${theme.bgSecondary} border ${theme.border} p-4 rounded-xl animate-pulse`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 flex-1">
          <div className="w-6 h-6 bg-gray-700 rounded" />
          <div className="flex-1">
            <div className="h-4 bg-gray-700 rounded w-48 mb-1" />
            <div className="h-3 bg-gray-700 rounded w-20" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="w-8 h-8 bg-gray-700 rounded-lg" />
          <div className="w-8 h-8 bg-gray-700 rounded-lg" />
          <div className="w-8 h-8 bg-gray-700 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

// Skeleton for backup list
export function BackupRowSkeleton() {
  const { theme } = useTheme();
  
  return (
    <div className={`${theme.bgSecondary} border ${theme.border} p-4 rounded-xl animate-pulse`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="h-5 bg-gray-700 rounded w-56 mb-2" />
          <div className="h-4 bg-gray-700 rounded w-32" />
        </div>
        <div className="flex gap-2">
          <div className="w-8 h-8 bg-gray-700 rounded-lg" />
          <div className="w-8 h-8 bg-gray-700 rounded-lg" />
          <div className="w-8 h-8 bg-gray-700 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

// Generic list skeleton
export function ListSkeleton({ count = 3, ItemSkeleton }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <ItemSkeleton key={i} />
      ))}
    </div>
  );
}
