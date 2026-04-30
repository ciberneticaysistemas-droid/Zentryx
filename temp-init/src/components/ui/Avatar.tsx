import { cn } from '@/lib/utils';

interface AvatarProps {
  initials: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = {
  xs: 'w-6 h-6 text-[9px]',
  sm: 'w-7 h-7 text-[10px]',
  md: 'w-9 h-9 text-xs',
  lg: 'w-11 h-11 text-sm',
};

export default function Avatar({ initials, size = 'md', className }: AvatarProps) {
  return (
    <div
      className={cn('flex items-center justify-center font-bold shrink-0', sizes[size], className)}
      style={{
        background: 'var(--zx-avatar-bg)',
        border:     '1px solid var(--zx-avatar-border)',
        color:      'var(--zx-avatar-text)',
      }}
    >
      {initials}
    </div>
  );
}
