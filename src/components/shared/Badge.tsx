import React from 'react';

interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'stage';
  color?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md';
}

export function Badge({ variant = 'default', color, children, size = 'sm' }: BadgeProps) {
  const variantClasses = {
    default: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
    success: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    warning: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    error: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    info: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    stage: '',
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  };

  if (variant === 'stage' && color) {
    return (
      <span
        className={`inline-flex items-center rounded-full font-medium ${sizeClasses[size]}`}
        style={{ backgroundColor: `${color}20`, color: color }}
      >
        {children}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${sizeClasses[size]} ${variantClasses[variant]}`}>
      {children}
    </span>
  );
}
