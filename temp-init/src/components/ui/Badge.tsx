import { cn } from '@/lib/utils';

type BadgeVariant = 'default' | 'success' | 'danger' | 'warning' | 'info' | 'accent';

/**
 * All variants follow the same rule:
 *   bg  = color at 10% opacity
 *   border = color at 30% opacity
 *   color  = the base color itself
 * Values come from CSS tokens defined in globals.css (--zx-badge-*).
 */
const variants: Record<BadgeVariant, { bg: string; color: string; border: string }> = {
  default: {
    bg:     'var(--zx-badge-default-bg)',
    color:  'var(--zx-badge-default-color)',
    border: 'var(--zx-badge-default-border)',
  },
  success: {
    bg:     'var(--zx-badge-success-bg)',
    color:  'var(--zx-success)',
    border: 'var(--zx-badge-success-border)',
  },
  danger: {
    bg:     'var(--zx-badge-danger-bg)',
    color:  'var(--zx-danger)',
    border: 'var(--zx-badge-danger-border)',
  },
  warning: {
    bg:     'var(--zx-badge-warning-bg)',
    color:  'var(--zx-warning)',
    border: 'var(--zx-badge-warning-border)',
  },
  info: {
    bg:     'var(--zx-badge-info-bg)',
    color:  'var(--zx-info)',
    border: 'var(--zx-badge-info-border)',
  },
  accent: {
    bg:     'var(--zx-badge-accent-bg)',
    color:  'var(--zx-accent-bright)',
    border: 'var(--zx-badge-accent-border)',
  },
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
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em]',
        className,
      )}
      style={{
        background: v.bg,
        color:      v.color,
        border:     `1px solid ${v.border}`,
      }}
    >
      {dot && <span className="w-1.5 h-1.5" style={{ background: v.color }} />}
      {children}
    </span>
  );
}
