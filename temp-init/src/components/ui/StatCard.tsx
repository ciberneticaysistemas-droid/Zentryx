import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { InsightMetric } from '@/types';

interface StatCardProps {
  metric: InsightMetric;
  icon?: React.ReactNode;
  /** Explicit top-border color. When provided, overrides the auto-derived strip color. */
  borderTopColor?: string;
}

export default function StatCard({ metric, icon, borderTopColor }: StatCardProps) {
  const { label, value, change, unit, trend } = metric;

  const trendColor =
    trend === 'up'   ? 'var(--zx-success)' :
    trend === 'down' ? 'var(--zx-danger)'  : 'var(--zx-text-3)';

  const TrendIcon =
    trend === 'up'   ? TrendingUp  :
    trend === 'down' ? TrendingDown : Minus;

  // For metrics where "down" is good (e.g., absenteeism, open PQRs)
  const isPositiveDown = label.toLowerCase().includes('ausent') ||
                         label.toLowerCase().includes('pqr')    ||
                         label.toLowerCase().includes('vencer');

  const actualPositive = isPositiveDown ? trend === 'down' : trend === 'up';
  const changeColor = actualPositive
    ? 'var(--zx-success)'
    : trend === 'stable'
    ? 'var(--zx-text-3)'
    : 'var(--zx-danger)';

  // Fallback strip color (used only when borderTopColor is not provided)
  const stripColor = actualPositive
    ? 'var(--zx-success)'
    : trend === 'stable'
    ? 'var(--zx-accent)'
    : 'var(--zx-danger)';

  const topBorderColor = borderTopColor ?? stripColor;

  return (
    <div
      className="p-4 transition-all duration-200"
      style={{
        background: 'var(--zx-gradient-card)',
        border:     '1px solid var(--zx-border)',
        borderTop:  `2px solid ${topBorderColor}`,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p
            className="text-[9px] font-bold uppercase tracking-[0.16em]"
            style={{ color: 'var(--zx-text-3)' }}
          >
            {label}
          </p>
          <p className="text-[26px] font-bold mt-1.5 tabular-nums leading-none" style={{ color: 'var(--zx-text-1)' }}>
            {value}
            {unit && (
              <span className="text-sm font-normal ml-1" style={{ color: 'var(--zx-text-3)' }}>
                {unit}
              </span>
            )}
          </p>
        </div>

        {icon && (
          <div
            className="flex items-center justify-center w-9 h-9"
            style={{
              background: 'var(--zx-accent-muted)',
              border:     '1px solid var(--zx-icon-border)',
              transform:  'rotate(-8deg)',
            }}
          >
            <span style={{ color: 'var(--zx-accent)' }}>{icon}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 mt-3">
        <TrendIcon size={11} style={{ color: trendColor }} />
        <span className="text-[11px] font-bold" style={{ color: changeColor }}>
          {change > 0 ? '+' : ''}{change}{unit === '%' ? 'pp' : ''}
        </span>
        <span className="text-[10px] uppercase tracking-[0.06em]" style={{ color: 'var(--zx-text-3)' }}>
          vs mes anterior
        </span>
      </div>
    </div>
  );
}
