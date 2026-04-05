'use client';

import { useState } from 'react';
import Header from '@/components/layout/Header';
import Button from '@/components/ui/Button';
import { ToastContainer, useToast } from '@/components/ui/Toast';
import {
  employees, payrollRecords, absenceCases, pqrCases,
  performanceRecords, absenceTrendData, performanceTrendData, departmentHeadcount,
} from '@/lib/data';
import { formatCOP } from '@/lib/utils';
import { Download, BarChart2, Users, DollarSign, TrendingUp, FileText, AlertTriangle } from 'lucide-react';

// ── Minimal inline SVG chart components (no Recharts dependency needed) ─────

function BarChart({ data, labelKey, valueKey, color = 'var(--zx-accent)', maxH = 80 }:
  { data: Record<string, unknown>[]; labelKey: string; valueKey: string; color?: string; maxH?: number }) {
  const max = Math.max(...data.map(d => Number(d[valueKey])), 1);
  return (
    <div className="flex items-end gap-1.5 h-20">
      {data.map((d, i) => {
        const h = Math.round((Number(d[valueKey]) / max) * maxH);
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-[9px] font-medium tabular-nums" style={{ color }}>{d[valueKey] as number}</span>
            <div className="w-full rounded-sm" style={{ height: h, background: color, opacity: 0.85, minHeight: 2 }} />
            <span className="text-[9px]" style={{ color: 'var(--zx-text-3)' }}>{String(d[labelKey])}</span>
          </div>
        );
      })}
    </div>
  );
}

function LineChart({ data, labelKey, valueKey, color = 'var(--zx-accent)' }:
  { data: Record<string, unknown>[]; labelKey: string; valueKey: string; color?: string }) {
  const vals = data.map(d => Number(d[valueKey]));
  const max = Math.max(...vals, 1); const min = Math.min(...vals, 0);
  const H = 64; const W = 100;
  const pts = vals.map((v, i) => {
    const x = (i / (vals.length - 1)) * W;
    const y = H - ((v - min) / (max - min || 1)) * H;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 64 }}>
        <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={pts} />
        {vals.map((v, i) => {
          const x = (i / (vals.length - 1)) * W;
          const y = H - ((v - min) / (max - min || 1)) * H;
          return <circle key={i} cx={x} cy={y} r="2.5" fill={color} />;
        })}
      </svg>
      <div className="flex justify-between mt-1">
        {data.map((d, i) => (
          <span key={i} className="text-[9px]" style={{ color: 'var(--zx-text-3)' }}>{String(d[labelKey])}</span>
        ))}
      </div>
    </div>
  );
}

function DonutChart({ slices }: { slices: { label: string; value: number; color: string }[] }) {
  const total = slices.reduce((s, d) => s + d.value, 0) || 1;
  let offset = 0;
  const R = 30; const C = 2 * Math.PI * R;
  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 80 80" style={{ width: 80, height: 80 }}>
        {slices.map((s, i) => {
          const dash = (s.value / total) * C;
          const circle = (
            <circle key={i} cx="40" cy="40" r={R} fill="none"
              stroke={s.color} strokeWidth="10"
              strokeDasharray={`${dash} ${C}`}
              strokeDashoffset={-offset}
              style={{ transform: 'rotate(-90deg)', transformOrigin: '40px 40px' }} />
          );
          offset += dash;
          return circle;
        })}
      </svg>
      <div className="space-y-1">
        {slices.map(s => (
          <div key={s.label} className="flex items-center gap-1.5 text-[10px]">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
            <span style={{ color: 'var(--zx-text-3)' }}>{s.label}</span>
            <span className="font-bold" style={{ color: s.color }}>{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Report tabs ───────────────────────────────────────────────────────────────

type ReportTab = 'resumen' | 'nomina' | 'ausencias' | 'desempeno' | 'pqr';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>('resumen');
  const { toasts, toast, dismiss } = useToast();

  const exportReport = (name: string) => {
    toast('success', `Reporte "${name}" exportado exitosamente.`);
  };

  // Computed stats
  const totalPayroll  = payrollRecords.reduce((s, r) => s + r.netPay, 0);
  const avgSalary     = Math.round(employees.reduce((s, e) => s + e.salary, 0) / employees.length);
  const acceptedAbs   = absenceCases.filter(a => a.verdict === 'accepted').length;
  const rejectedAbs   = absenceCases.filter(a => a.verdict === 'rejected').length;
  const avgPerf       = Math.round(performanceRecords.reduce((s, r) => s + r.score, 0) / performanceRecords.length);

  const deptPayroll = employees.reduce<Record<string, number>>((acc, e) => {
    acc[e.department] = (acc[e.department] ?? 0) + e.salary;
    return acc;
  }, {});

  const tabs: { key: ReportTab; label: string; icon: React.ReactNode }[] = [
    { key: 'resumen',   label: 'Resumen',    icon: <BarChart2 size={13} />  },
    { key: 'nomina',    label: 'Nómina',     icon: <DollarSign size={13} /> },
    { key: 'ausencias', label: 'Ausencias',  icon: <AlertTriangle size={13} /> },
    { key: 'desempeno', label: 'Desempeño',  icon: <TrendingUp size={13} />  },
    { key: 'pqr',       label: 'PQR',        icon: <FileText size={13} />    },
  ];

  return (
    <>
      <Header title="Reportes" subtitle="Analítica en tiempo real — datos del período activo" />

      <div className="flex-1 p-6 space-y-5 animate-fade-in-up">

        {/* Tab bar */}
        <div className="flex gap-1 p-1 rounded-lg w-fit flex-wrap" style={{ background: 'var(--zx-surface)', border: '1px solid var(--zx-border)' }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-medium transition-all"
              style={{
                background: activeTab === t.key ? 'var(--zx-accent-muted)' : 'transparent',
                color:      activeTab === t.key ? 'var(--zx-accent)' : 'var(--zx-text-3)',
              }}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* ── RESUMEN ── */}
        {activeTab === 'resumen' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Empleados activos',  value: employees.filter(e => e.status === 'active').length, color: 'var(--zx-success)', icon: <Users size={16} /> },
                { label: 'Nómina mensual',     value: formatCOP(totalPayroll), color: 'var(--zx-accent)', icon: <DollarSign size={16} /> },
                { label: 'Desempeño prom.',    value: `${avgPerf} pts`,        color: 'var(--zx-warning)', icon: <TrendingUp size={16} /> },
                { label: 'PQR abiertas',       value: pqrCases.filter(p => p.status === 'open').length, color: 'var(--zx-danger)', icon: <FileText size={16} /> },
              ].map(s => (
                <div key={s.label} className="rounded-xl p-4" style={{ background: 'var(--zx-surface)', border: '1px solid var(--zx-border)' }}>
                  <div className="flex items-center gap-2 mb-2"><span style={{ color: s.color }}>{s.icon}</span>
                    <p className="text-[11px]" style={{ color: 'var(--zx-text-3)' }}>{s.label}</p>
                  </div>
                  <p className="text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl p-4" style={{ background: 'var(--zx-surface)', border: '1px solid var(--zx-border)' }}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold" style={{ color: 'var(--zx-text-1)' }}>Headcount por departamento</p>
                </div>
                <BarChart data={departmentHeadcount} labelKey="dept" valueKey="count" color="var(--zx-accent)" />
              </div>
              <div className="rounded-xl p-4" style={{ background: 'var(--zx-surface)', border: '1px solid var(--zx-border)' }}>
                <p className="text-xs font-semibold mb-3" style={{ color: 'var(--zx-text-1)' }}>Estado de empleados</p>
                <DonutChart slices={[
                  { label: 'Activos',   value: employees.filter(e => e.status === 'active').length,    color: 'var(--zx-success)' },
                  { label: 'Licencia',  value: employees.filter(e => e.status === 'on-leave').length,  color: 'var(--zx-warning)' },
                  { label: 'Prueba',    value: employees.filter(e => e.status === 'probation').length, color: 'var(--zx-info)'    },
                  { label: 'Inactivos', value: employees.filter(e => e.status === 'inactive').length,  color: 'var(--zx-danger)'  },
                ]} />
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="secondary" size="sm" icon={<Download size={13} />} onClick={() => exportReport('Resumen ejecutivo')}>
                Exportar PDF
              </Button>
            </div>
          </div>
        )}

        {/* ── NÓMINA ── */}
        {activeTab === 'nomina' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl p-4" style={{ background: 'var(--zx-surface)', border: '1px solid var(--zx-border)' }}>
                <p className="text-xs font-semibold mb-3" style={{ color: 'var(--zx-text-1)' }}>Costo nómina por departamento</p>
                <BarChart
                  data={Object.entries(deptPayroll).map(([dept, total]) => ({ dept, total }))}
                  labelKey="dept" valueKey="total" color="var(--zx-success)" />
              </div>
              <div className="rounded-xl p-4 space-y-2" style={{ background: 'var(--zx-surface)', border: '1px solid var(--zx-border)' }}>
                <p className="text-xs font-semibold mb-2" style={{ color: 'var(--zx-text-1)' }}>Distribución salarial</p>
                {payrollRecords.map(r => (
                  <div key={r.id}>
                    <div className="flex justify-between text-[11px] mb-0.5">
                      <span style={{ color: 'var(--zx-text-2)' }}>{r.employeeName}</span>
                      <span className="tabular-nums font-medium" style={{ color: 'var(--zx-text-1)' }}>{formatCOP(r.baseSalary)}</span>
                    </div>
                    <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--zx-surface-3)' }}>
                      <div className="h-full rounded-full" style={{ width: `${(r.baseSalary / 10_000_000) * 100}%`, background: 'var(--zx-accent)' }} />
                    </div>
                  </div>
                ))}
                <div className="flex justify-between text-[11px] pt-2 border-t" style={{ borderColor: 'var(--zx-border)' }}>
                  <span style={{ color: 'var(--zx-text-3)' }}>Salario promedio</span>
                  <span className="font-bold" style={{ color: 'var(--zx-accent)' }}>{formatCOP(avgSalary)}</span>
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button variant="secondary" size="sm" icon={<Download size={13} />} onClick={() => exportReport('Reporte de nómina')}>
                Exportar CSV
              </Button>
            </div>
          </div>
        )}

        {/* ── AUSENCIAS ── */}
        {activeTab === 'ausencias' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl p-4" style={{ background: 'var(--zx-surface)', border: '1px solid var(--zx-border)' }}>
                <p className="text-xs font-semibold mb-3" style={{ color: 'var(--zx-text-1)' }}>Tasa de ausentismo — últimos 6 meses</p>
                <LineChart data={absenceTrendData.map(d => ({ ...d, rate: d.rate }))} labelKey="month" valueKey="rate" color="var(--zx-warning)" />
              </div>
              <div className="rounded-xl p-4" style={{ background: 'var(--zx-surface)', border: '1px solid var(--zx-border)' }}>
                <p className="text-xs font-semibold mb-3" style={{ color: 'var(--zx-text-1)' }}>Veredictos IA</p>
                <DonutChart slices={[
                  { label: 'Aceptadas',   value: acceptedAbs,      color: 'var(--zx-success)' },
                  { label: 'Rechazadas',  value: rejectedAbs,       color: 'var(--zx-danger)'  },
                  { label: 'En revisión', value: absenceCases.filter(a => a.verdict === 'review').length,   color: 'var(--zx-warning)' },
                  { label: 'Pendientes',  value: absenceCases.filter(a => a.verdict === 'pending').length,  color: 'var(--zx-info)'    },
                ]} />
              </div>
            </div>
            <div className="rounded-xl p-4" style={{ background: 'var(--zx-surface)', border: '1px solid var(--zx-border)' }}>
              <p className="text-xs font-semibold mb-3" style={{ color: 'var(--zx-text-1)' }}>Tipos de ausencia</p>
              <BarChart
                data={[...new Set(absenceCases.map(a => a.type))].map(t => ({
                  type: t.slice(0, 10), count: absenceCases.filter(a => a.type === t).length,
                }))}
                labelKey="type" valueKey="count" color="var(--zx-info)" />
            </div>
            <div className="flex justify-end">
              <Button variant="secondary" size="sm" icon={<Download size={13} />} onClick={() => exportReport('Reporte de ausencias')}>
                Exportar PDF
              </Button>
            </div>
          </div>
        )}

        {/* ── DESEMPEÑO ── */}
        {activeTab === 'desempeno' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl p-4" style={{ background: 'var(--zx-surface)', border: '1px solid var(--zx-border)' }}>
                <p className="text-xs font-semibold mb-3" style={{ color: 'var(--zx-text-1)' }}>Tendencia desempeño promedio</p>
                <LineChart data={performanceTrendData} labelKey="month" valueKey="avg" color="var(--zx-accent)" />
              </div>
              <div className="rounded-xl p-4" style={{ background: 'var(--zx-surface)', border: '1px solid var(--zx-border)' }}>
                <p className="text-xs font-semibold mb-3" style={{ color: 'var(--zx-text-1)' }}>Distribución de calificaciones</p>
                <BarChart
                  data={performanceRecords.map(r => ({ name: r.employeeName.split(' ')[0], score: r.score }))}
                  labelKey="name" valueKey="score" color="var(--zx-warning)" />
              </div>
            </div>
            <div className="flex justify-end">
              <Button variant="secondary" size="sm" icon={<Download size={13} />} onClick={() => exportReport('Reporte de desempeño')}>
                Exportar CSV
              </Button>
            </div>
          </div>
        )}

        {/* ── PQR ── */}
        {activeTab === 'pqr' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl p-4" style={{ background: 'var(--zx-surface)', border: '1px solid var(--zx-border)' }}>
                <p className="text-xs font-semibold mb-3" style={{ color: 'var(--zx-text-1)' }}>PQR por estado</p>
                <DonutChart slices={[
                  { label: 'Abiertas',    value: pqrCases.filter(p => p.status === 'open').length,        color: 'var(--zx-danger)'  },
                  { label: 'En proceso',  value: pqrCases.filter(p => p.status === 'in-progress').length, color: 'var(--zx-warning)' },
                  { label: 'Resueltas',   value: pqrCases.filter(p => p.status === 'resolved').length,    color: 'var(--zx-success)' },
                  { label: 'Cerradas',    value: pqrCases.filter(p => p.status === 'closed').length,      color: 'var(--zx-text-3)'  },
                ]} />
              </div>
              <div className="rounded-xl p-4" style={{ background: 'var(--zx-surface)', border: '1px solid var(--zx-border)' }}>
                <p className="text-xs font-semibold mb-3" style={{ color: 'var(--zx-text-1)' }}>PQR por tipo</p>
                <BarChart
                  data={['pregunta', 'queja', 'reclamo'].map(t => ({
                    tipo: t, count: pqrCases.filter(p => p.type === t).length,
                  }))}
                  labelKey="tipo" valueKey="count" color="var(--zx-info)" />
              </div>
            </div>
            <div className="flex justify-end">
              <Button variant="secondary" size="sm" icon={<Download size={13} />} onClick={() => exportReport('Reporte PQR')}>
                Exportar CSV
              </Button>
            </div>
          </div>
        )}
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
