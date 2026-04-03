'use client';

import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, LineChart, Line,
} from 'recharts';
import { absenceTrendData, performanceTrendData, departmentHeadcount } from '@/lib/data';
import { Brain } from 'lucide-react';

const CustomTooltip = ({ active, payload, label, unit }: { active?: boolean; payload?: { value: number }[]; label?: string; unit?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-2.5 py-1.5 rounded-lg text-xs shadow-xl"
      style={{ background:'var(--zx-surface-3)', border:'1px solid var(--zx-border-2)', color:'var(--zx-text-1)' }}>
      <span className="font-medium">{label}: </span>
      <span style={{ color:'var(--zx-accent)' }}>{payload[0].value}{unit}</span>
    </div>
  );
};

export default function AIInsightsPanel() {
  return (
    <div className="rounded-xl p-4 h-full" style={{ background:'var(--zx-surface)', border:'1px solid var(--zx-border)' }}>
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center justify-center w-6 h-6 rounded-md"
          style={{ background:'var(--zx-accent-muted)' }}>
          <Brain size={13} style={{ color:'var(--zx-accent)' }} />
        </div>
        <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color:'var(--zx-text-3)' }}>
          Insights de IA
        </h2>
        <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded" style={{ background:'var(--zx-accent-muted)', color:'var(--zx-accent)' }}>
          Tiempo real
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        {/* Ausentismo */}
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide mb-1" style={{ color:'var(--zx-text-3)' }}>
            Ausentismo (%)
          </p>
          <p className="text-xl font-bold tabular-nums mb-2" style={{ color:'var(--zx-text-1)' }}>
            4.2<span className="text-sm font-normal" style={{ color:'var(--zx-text-3)' }}>%</span>
          </p>
          <ResponsiveContainer width="100%" height={80}>
            <AreaChart data={absenceTrendData} margin={{ top:2, right:0, left:-30, bottom:0 }}>
              <defs>
                <linearGradient id="absGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--zx-danger)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--zx-danger)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fontSize:9, fill:'var(--zx-text-3)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize:9, fill:'var(--zx-text-3)' }} axisLine={false} tickLine={false} domain={[3,7]} />
              <Tooltip content={<CustomTooltip unit="%" />} />
              <Area type="monotone" dataKey="rate" stroke="var(--zx-danger)" strokeWidth={1.5} fill="url(#absGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Desempeño */}
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide mb-1" style={{ color:'var(--zx-text-3)' }}>
            Desempeño promedio
          </p>
          <p className="text-xl font-bold tabular-nums mb-2" style={{ color:'var(--zx-text-1)' }}>
            85.2<span className="text-sm font-normal" style={{ color:'var(--zx-text-3)' }}>pts</span>
          </p>
          <ResponsiveContainer width="100%" height={80}>
            <LineChart data={performanceTrendData} margin={{ top:2, right:0, left:-30, bottom:0 }}>
              <XAxis dataKey="month" tick={{ fontSize:9, fill:'var(--zx-text-3)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize:9, fill:'var(--zx-text-3)' }} axisLine={false} tickLine={false} domain={[75,90]} />
              <Tooltip content={<CustomTooltip unit=" pts" />} />
              <Line type="monotone" dataKey="avg" stroke="var(--zx-accent)" strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Headcount */}
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide mb-1" style={{ color:'var(--zx-text-3)' }}>
            Headcount por área
          </p>
          <p className="text-xl font-bold tabular-nums mb-2" style={{ color:'var(--zx-text-1)' }}>
            10<span className="text-sm font-normal" style={{ color:'var(--zx-text-3)' }}> emp.</span>
          </p>
          <ResponsiveContainer width="100%" height={80}>
            <BarChart data={departmentHeadcount} margin={{ top:2, right:0, left:-30, bottom:0 }}>
              <XAxis dataKey="dept" tick={{ fontSize:8, fill:'var(--zx-text-3)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize:9, fill:'var(--zx-text-3)' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip unit=" emp." />} />
              <Bar dataKey="count" fill="var(--zx-accent)" radius={[3,3,0,0]} opacity={0.8} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* AI Commentary */}
      <div className="mt-4 p-3 rounded-lg" style={{ background:'var(--zx-surface-2)', border:'1px solid var(--zx-border)' }}>
        <div className="flex items-start gap-2">
          <Brain size={12} className="mt-0.5 shrink-0" style={{ color:'var(--zx-accent)' }} />
          <p className="text-[11px] leading-relaxed" style={{ color:'var(--zx-text-2)' }}>
            <span style={{ color:'var(--zx-accent)', fontWeight:600 }}>Análisis IA: </span>
            El ausentismo ha descendido 0.8pp en el último mes — tendencia positiva sostenida desde diciembre.
            El desempeño promedio supera por primera vez 85 puntos este trimestre.
            Se detectaron 2 contratos próximos a vencer que requieren acción inmediata en Legal.
          </p>
        </div>
      </div>
    </div>
  );
}
