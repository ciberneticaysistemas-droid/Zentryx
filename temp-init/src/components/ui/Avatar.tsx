import { cn } from '@/lib/utils';

const colors = [
  ['#C5A059', '#09090B'], ['#3D9B6E', '#09090B'], ['#4A90D9', '#F0EDE6'],
  ['#D4953A', '#09090B'], ['#9B6ED9', '#F0EDE6'], ['#D95B45', '#F0EDE6'],
];

function colorForInitials(initials: string): [string, string] {
  const idx = (initials.charCodeAt(0) + (initials.charCodeAt(1) || 0)) % colors.length;
  return colors[idx] as [string, string];
}

interface AvatarProps {
  initials: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = { xs: 'w-6 h-6 text-[9px]', sm: 'w-7 h-7 text-[10px]', md: 'w-9 h-9 text-xs', lg: 'w-11 h-11 text-sm' };

export default function Avatar({ initials, size = 'md', className }: AvatarProps) {
  const [bg, fg] = colorForInitials(initials);
  return (
    <div className={cn('rounded-full flex items-center justify-center font-semibold shrink-0', sizes[size], className)}
      style={{ background: bg, color: fg }}>
      {initials}
    </div>
  );
}
