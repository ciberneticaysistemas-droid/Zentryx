'use client';

import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  hover?: boolean;
}

export default function Card({ children, className, style, hover }: CardProps) {
  return (
    <div
      className={cn('rounded-xl p-4 transition-all duration-200', hover && 'cursor-pointer', className)}
      style={{
        background:   'var(--zx-surface)',
        border:       '1px solid var(--zx-border)',
        ...(hover ? { ['--hover-bg' as string]: 'var(--zx-surface-2)' } : {}),
        ...style,
      }}
      onMouseEnter={hover ? e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--zx-border-2)'; } : undefined}
      onMouseLeave={hover ? e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--zx-border)'; } : undefined}
    >
      {children}
    </div>
  );
}
