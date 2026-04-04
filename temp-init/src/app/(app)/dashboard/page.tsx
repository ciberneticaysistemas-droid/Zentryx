import type { Metadata } from 'next';
import Header from '@/components/layout/Header';
import StatCard from '@/components/ui/StatCard';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import AIInsightsPanel from '@/components/modules/dashboard/AIInsightsPanelWrapper';
import {
  dashboardInsights, employees, absenceCases, pqrCases, payrollRecords
} from '@/lib/data';
import {
  Users, AlertTriangle, DollarSign, TrendingUp,
  FileText, HelpCircle, Cpu,
} from 'lucide-react';
import { formatCOP } from '@/lib/utils';

export const metadata: Metadata = { title: 'Dashboard' };

const insightIcons = [
  <AlertTriangle size={18} key="0" />,
  <FileText      size={18} key="1" />,
  <HelpCircle    size={18} key="2" />,
  <TrendingUp    size={18} key="3" />,
  <Users         size={18} key="4" />,
  <DollarSign    size={18} key="5" />,
];

function statusVariant(status: string) {
  const m: Record<string, 'success'|'danger'|'warning'|'info'|'default'> = {
    active: 'success', 'on-leave': 'warning', inactive: 'danger', probation: 'info',
  };
  return m[status] ?? 'default';
}

function statusLabel(status: string) {
  const m: Record<string, string> = {
    active: 'Activo', 'on-leave': 'Licencia', inactive: 'Inactivo', probation: 'Prueba',
  };
  return m[status] ?? status;
}

function verdictVariant(v: string) {
  const m: Record<string, 'success'|'danger'|'warning'|'default'> = {
    accepted: 'success', rejected: 'danger', review: 'warning', pending: 'default',
  };
  return m[v] ?? 'default';
}

function verdictLabel(v: string) {
  const m: Record<string, string> = {
    accepted: 'Aceptado', rejected: 'Rechazado', review: 'En Revisión', pending: 'Pendiente',
  };
  return m[v] ?? v;
}

export default function DashboardPage() {
  const totalPayroll = payrollRecords.reduce((s, r) => s + r.netPay, 0);
  const pendingPQRs  = pqrCases.filter(p => p.status === 'open' || p.status === 'in-progress');

  return (
    <>
      <Header
        title="Dashboard"
        subtitle={`Bienvenida de vuelta, Valentina · ${new Date().toLocaleDateString('es-CO', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}`}
      />

      <div className="flex-1 p-6 space-y-6 animate-fade-in-up">

        {/* ── KPI Grid ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
          {dashboardInsights.map((m, i) => (
            <StatCard key={m.label} metric={m} icon={insightIcons[i]} />
          ))}
        </div>

        {/* ── Main Content ──────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* AI Insights Panel */}
          <div className="lg:col-span-2">
            <AIInsightsPanel />
          </div>

          {/* Quick Stats sidebar */}
          <div className="space-y-4">

            {/* Nómina resumen */}
            <div className="rounded-xl p-4" style={{ background:'var(--zx-surface)', border:'1px solid var(--zx-border)' }}>
              <div className="flex items-center gap-2 mb-3">
                <DollarSign size={14} style={{ color:'var(--zx-accent)' }} />
                <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color:'var(--zx-text-3)' }}>
                  Nómina · Marzo 2025
                </h3>
              </div>
              <p className="text-xl font-bold tabular-nums" style={{ color:'var(--zx-text-1)' }}>
                {formatCOP(totalPayroll)}
              </p>
              <p className="text-xs mt-1" style={{ color:'var(--zx-text-3)' }}>
                {payrollRecords.filter(r => r.status === 'paid').length} pagados ·{' '}
                {payrollRecords.filter(r => r.status === 'pending').length} pendientes
              </p>
              <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background:'var(--zx-surface-3)' }}>
                <div className="h-full rounded-full"
                  style={{
                    width: `${(payrollRecords.filter(r=>r.status==='paid').length/payrollRecords.length)*100}%`,
                    background:'linear-gradient(90deg,var(--zx-accent),var(--zx-accent-hover))',
                  }} />
              </div>
            </div>

            {/* PQRs urgentes */}
            <div className="rounded-xl p-4" style={{ background:'var(--zx-surface)', border:'1px solid var(--zx-border)' }}>
              <div className="flex items-center gap-2 mb-3">
                <HelpCircle size={14} style={{ color:'var(--zx-accent)' }} />
                <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color:'var(--zx-text-3)' }}>
                  PQRs Activos
                </h3>
                <Badge variant="warning" className="ml-auto">{pendingPQRs.length}</Badge>
              </div>
              <div className="space-y-2">
                {pendingPQRs.slice(0, 3).map(p => (
                  <div key={p.id} className="flex items-start gap-2 p-2 rounded-lg"
                    style={{ background:'var(--zx-surface-2)' }}>
                    <div className="w-1 h-1 rounded-full mt-1.5 shrink-0"
                      style={{ background: p.priority === 'high' ? 'var(--zx-danger)' : p.priority === 'medium' ? 'var(--zx-warning)' : 'var(--zx-text-3)' }} />
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color:'var(--zx-text-1)' }}>{p.subject}</p>
                      <p className="text-[10px]" style={{ color:'var(--zx-text-3)' }}>{p.submittedBy}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Bottom Row ───────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Recent Employees */}
          <div className="rounded-xl p-4" style={{ background:'var(--zx-surface)', border:'1px solid var(--zx-border)' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users size={14} style={{ color:'var(--zx-accent)' }} />
                <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color:'var(--zx-text-3)' }}>
                  Empleados Recientes
                </h3>
              </div>
            </div>
            <div className="space-y-2.5">
              {employees.slice(0, 5).map(emp => (
                <div key={emp.id} className="flex items-center gap-3">
                  <Avatar initials={emp.initials} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color:'var(--zx-text-1)' }}>{emp.name}</p>
                    <p className="text-[10px] truncate" style={{ color:'var(--zx-text-3)' }}>{emp.role} · {emp.department}</p>
                  </div>
                  <Badge variant={statusVariant(emp.status)} dot>{statusLabel(emp.status)}</Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Absences */}
          <div className="rounded-xl p-4" style={{ background:'var(--zx-surface)', border:'1px solid var(--zx-border)' }}>
            <div className="flex items-center gap-2 mb-4">
              <Cpu size={14} style={{ color:'var(--zx-accent)' }} />
              <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color:'var(--zx-text-3)' }}>
                Últimas Justificaciones IA
              </h3>
            </div>
            <div className="space-y-2.5">
              {absenceCases.map(ac => (
                <div key={ac.id} className="flex items-center gap-3 p-2 rounded-lg"
                  style={{ background:'var(--zx-surface-2)' }}>
                  <Avatar initials={String(ac.employeeName ?? '?').split(' ').map(n=>n[0]).join('').slice(0,2)} size="xs" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color:'var(--zx-text-1)' }}>{ac.employeeName}</p>
                    <p className="text-[10px]" style={{ color:'var(--zx-text-3)' }}>{ac.type}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge variant={verdictVariant(ac.verdict)} dot>{verdictLabel(ac.verdict)}</Badge>
                    <p className="text-[10px] mt-0.5" style={{ color:'var(--zx-text-3)' }}>{ac.confidence}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
