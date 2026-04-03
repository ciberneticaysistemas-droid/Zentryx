import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { InsightMetric } from '@/types';

interface StatCardProps {
  metric: InsightMetric;
  icon?: React.ReactNode;
}

export default function StatCard({ metric, icon }: StatCardProps) {
  const { label, value, change, unit, trend } = metric;

  const trendColor =
    trend === 'up'     ? 'var(--zx-success)' :
    trend === 'down'   ? 'var(--zx-danger)'  : 'var(--zx-text-3)';

  const TrendIcon =
    trend === 'up'   ? TrendingUp  :
    trend === 'down' ? TrendingDown : Minus;

  // For metrics where "down" is good (e.g., absenteeism, open PQRs)
  const isPositiveDown = label.toLowerCase().includes('ausent') ||
                         label.toLowerCase().includes('pqr')    ||
                         label.toLowerCase().includes('vencer');

  const actualPositive = isPositiveDown ? trend === 'down' : trend === 'up';
  const changeColor = actualPositive ? 'var(--zx-success)' : trend === 'stable' ? 'var(--zx-text-3)' : 'var(--zx-danger)';

  return (
    <div className="rounded-xl p-4 transition-all duration-200"
      style={{ background: 'var(--zx-surface)', border: '1px solid var(--zx-border)' }}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--zx-text-3)' }}>
            {label}
          </p>
          <p className="text-2xl font-bold mt-1 tabular-nums" style={{ color: 'var(--zx-text-1)' }}>
            {value}{unit && <span className="text-base font-normal ml-1" style={{ color: 'var(--zx-text-3)' }}>{unit}</span>}
          </p>
        </div>
        {icon && (
          <div className="flex items-center justify-center w-9 h-9 rounded-lg"
            style={{ background: 'var(--zx-accent-muted)' }}>
            <span style={{ color: 'var(--zx-accent)' }}>{icon}</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-1 mt-3">
        <TrendIcon size={12} style={{ color: trendColor }} />
        <span className="text-[11px] font-medium" style={{ color: changeColor }}>
          {change > 0 ? '+' : ''}{change}{unit === '%' ? 'pp' : ''}
        </span>
        <span className="text-[11px]" style={{ color: 'var(--zx-text-3)' }}>vs mes anterior</span>
      </div>
    </div>
  );
}
