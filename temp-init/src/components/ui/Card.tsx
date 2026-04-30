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
      className={cn('p-4', hover && 'cursor-pointer', className)}
      style={{
        background: 'var(--zx-surface)',
        border:     '1px solid var(--zx-border)',
        ...style,
      }}
      onMouseEnter={hover ? e => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--zx-accent)';
        (e.currentTarget as HTMLElement).style.boxShadow  = '0 0 0 1px var(--zx-accent-muted)';
      } : undefined}
      onMouseLeave={hover ? e => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--zx-border)';
        (e.currentTarget as HTMLElement).style.boxShadow  = 'none';
      } : undefined}
    >
      {children}
    </div>
  );
}
