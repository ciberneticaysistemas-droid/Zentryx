'use client';

import { cn } from '@/lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize    = 'sm' | 'md' | 'lg';

const variantStyles: Record<ButtonVariant, React.CSSProperties & { hoverBg?: string }> = {
  primary:   { background: 'var(--zx-accent)', color: '#09090B' },
  secondary: { background: 'var(--zx-surface-2)', color: 'var(--zx-text-1)', border: '1px solid var(--zx-border-2)' },
  ghost:     { background: 'transparent', color: 'var(--zx-text-2)' },
  danger:    { background: 'var(--zx-danger-muted)', color: 'var(--zx-danger)', border: '1px solid var(--zx-danger-muted)' },
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-5 py-2.5 text-sm gap-2',
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
  icon?: React.ReactNode;
  loading?: boolean;
}

export default function Button({
  variant = 'primary', size = 'md', children, icon, loading, className, ...props
}: ButtonProps) {
  const vs = variantStyles[variant];

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        sizeStyles[size],
        className,
      )}
      style={{ ...vs }}
      onMouseEnter={e => {
        if (!props.disabled) {
          if (variant === 'primary') (e.currentTarget as HTMLElement).style.background = 'var(--zx-accent-hover)';
          if (variant === 'secondary') (e.currentTarget as HTMLElement).style.background = 'var(--zx-surface-3)';
          if (variant === 'ghost') (e.currentTarget as HTMLElement).style.background = 'var(--zx-surface-2)';
        }
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement;
        if (variant === 'primary') el.style.background = 'var(--zx-accent)';
        if (variant === 'secondary') el.style.background = 'var(--zx-surface-2)';
        if (variant === 'ghost') el.style.background = 'transparent';
      }}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : icon}
      {children}
    </button>
  );
}
