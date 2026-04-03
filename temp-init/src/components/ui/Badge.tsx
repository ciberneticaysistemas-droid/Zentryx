import { cn } from '@/lib/utils';

type BadgeVariant = 'default' | 'success' | 'danger' | 'warning' | 'info' | 'accent';

const variants: Record<BadgeVariant, { bg: string; color: string }> = {
  default: { bg: 'var(--zx-surface-3)',       color: 'var(--zx-text-2)' },
  success: { bg: 'var(--zx-success-muted)',    color: 'var(--zx-success)' },
  danger:  { bg: 'var(--zx-danger-muted)',     color: 'var(--zx-danger)' },
  warning: { bg: 'var(--zx-warning-muted)',    color: 'var(--zx-warning)' },
  info:    { bg: 'var(--zx-info-muted)',       color: 'var(--zx-info)' },
  accent:  { bg: 'var(--zx-accent-muted)',     color: 'var(--zx-accent)' },
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  dot?: boolean;
}

export default function Badge({ children, variant = 'default', className, dot }: BadgeProps) {
  const v = variants[variant];
  return (
    <span
      className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium', className)}
      style={{ background: v.bg, color: v.color }}>
      {dot && <span className="w-1.5 h-1.5 rounded-full" style={{ background: v.color }} />}
      {children}
    </span>
  );
}
