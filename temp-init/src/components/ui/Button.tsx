'use client';

import { cn } from '@/lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize    = 'sm' | 'md' | 'lg';

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary:   {
    background: 'var(--zx-accent-bright)',   /* cyan — pops against purple env */
    color: 'var(--zx-bg)',
    border: '1px solid var(--zx-accent-bright)',
  },
  secondary: {
    background: 'transparent',
    color: 'var(--zx-accent)',               /* purple */
    border: '1px solid var(--zx-accent)',
  },
  ghost:     {
    background: 'transparent',
    color: 'var(--zx-text-2)',
    border: '1px solid transparent',
  },
  danger:    {
    background: 'transparent',
    color: 'var(--zx-danger)',
    border: '1px solid var(--zx-danger)',
  },
};

const variantHover: Record<ButtonVariant, React.CSSProperties> = {
  primary:   { background: 'var(--zx-accent-bright-hover)', borderColor: 'var(--zx-accent-bright-hover)' },
  secondary: { background: 'var(--zx-accent-muted)' },
  ghost:     { background: 'var(--zx-surface-2)', borderColor: 'var(--zx-border)' },
  danger:    { background: 'var(--zx-danger-muted)' },
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-[10px] gap-1.5',
  md: 'px-4 py-2 text-[11px] gap-2',
  lg: 'px-5 py-2.5 text-[11px] gap-2',
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
  const vh = variantHover[variant];

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center font-bold uppercase tracking-[0.1em]',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        sizeStyles[size],
        className,
      )}
      style={{ ...vs }}
      onMouseEnter={e => {
        if (!props.disabled) {
          Object.assign((e.currentTarget as HTMLElement).style, vh);
        }
      }}
      onMouseLeave={e => {
        Object.assign((e.currentTarget as HTMLElement).style, vs);
      }}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <span
          className="w-3.5 h-3.5 border-2 border-current border-t-transparent animate-spin p3-circle"
        />
      ) : icon}
      {children}
    </button>
  );
}
