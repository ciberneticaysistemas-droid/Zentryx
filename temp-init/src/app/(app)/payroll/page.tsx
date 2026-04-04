'use client';

import { useState } from 'react';
import Header from '@/components/layout/Header';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import { ToastContainer, useToast } from '@/components/ui/Toast';
import { payrollRecords as initialRecords } from '@/lib/data';
import type { PayrollRecord } from '@/types';
import { formatCOP } from '@/lib/utils';
import { Download, Send, DollarSign, Users, TrendingUp, CheckCircle } from 'lucide-react';

const statusMap: Record<string, { label:string; variant:'success'|'warning'|'info' }> = {
  paid:       { label:'Pagado',     variant:'success' },
  pending:    { label:'Pendiente',  variant:'warning' },
  processing: { label:'Procesando', variant:'info' },
};

export default function PayrollPage() {
  const [records, setRecords]      = useState<PayrollRecord[]>(initialRecords);
  const [sending, setSending]      = useState(false);
  const { toasts, toast, dismiss } = useToast();

  const total     = records.reduce((s, r) => s + r.netPay, 0);
  const totalBase = records.reduce((s, r) => s + r.baseSalary, 0);
  const totalEps  = records.reduce((s, r) => s + r.eps, 0);
  const totalPens = records.reduce((s, r) => s + r.pension, 0);

  const exportCSV = () => {
    const bom = '\uFEFF';
    const header = ['Empleado','Departamento','Período','Salario Base','EPS (4%)','Pensión (4%)','ARL','CCF (4%)','Neto a Pagar','Estado'];
    const rows = records.map(r => [
      r.employeeName, r.department, r.period,
      r.baseSalary, r.eps, r.pension, r.arl, r.ccf, r.netPay, r.status,
    ]);
    const csv = bom + [header, ...rows].map(row => row.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `nomina_marzo_2025.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast('success', 'Nómina exportada como CSV correctamente.');
  };

  const sendSlips = () => {
    setSending(true);
    let i = 0;
    const interval = setInterval(() => {
      const rec = records[i];
      if (!rec) { clearInterval(interval); setSending(false); toast('success', `${records.length} desprendibles enviados a los correos registrados.`); return; }
      setRecords(prev => prev.map(r => r.id === rec.id ? { ...r, status: 'paid' as const } : r));
      i++;
    }, 300);
  };

  const markPaid = (id: string) => {
    setRecords(prev => prev.map(r => r.id === id ? { ...r, status: 'paid' as const } : r));
    toast('success', 'Registro marcado como pagado.');
  };

  return (
    <>
      <Header title="Nómina" subtitle="Liquidación y desprendibles · Marzo 2025" />

      <div className="flex-1 p-6 space-y-5 animate-fade-in-up">

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label:'Nómina bruta total', value:formatCOP(totalBase), icon:<DollarSign size={16} />, color:'var(--zx-accent)' },
            { label:'Neto a pagar',       value:formatCOP(total),     icon:<TrendingUp size={16} />, color:'var(--zx-success)' },
            { label:'Total EPS',          value:formatCOP(totalEps),  icon:<Users size={16} />,      color:'var(--zx-info)' },
            { label:'Total pensión',      value:formatCOP(totalPens), icon:<Users size={16} />,      color:'var(--zx-warning)' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-4" style={{ background:'var(--zx-surface)', border:'1px solid var(--zx-border)' }}>
              <div className="flex items-center gap-2 mb-2">
                <span style={{ color:s.color }}>{s.icon}</span>
                <p className="text-[11px]" style={{ color:'var(--zx-text-3)' }}>{s.label}</p>
              </div>
              <p className="text-lg font-bold tabular-nums" style={{ color:s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-sm font-semibold" style={{ color:'var(--zx-text-1)' }}>
              Detalle nómina — {records.length} empleados
            </h2>
            <p className="text-[11px] mt-0.5" style={{ color:'var(--zx-text-3)' }}>
              {records.filter(r=>r.status==='paid').length} pagados ·{' '}
              {records.filter(r=>r.status==='pending').length} pendientes ·{' '}
              {records.filter(r=>r.status==='processing').length} procesando
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" icon={<Download size={13} />} onClick={exportCSV}>
              Exportar CSV
            </Button>
            <Button variant="primary" size="sm" icon={sending ? undefined : <Send size={13} />}
              loading={sending} onClick={sendSlips}>
              {sending ? 'Enviando...' : 'Enviar desprendibles'}
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl overflow-hidden" style={{ background:'var(--zx-surface)', border:'1px solid var(--zx-border)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom:'1px solid var(--zx-border)', background:'var(--zx-surface-2)' }}>
                  {['Empleado','Dpto.','Salario base','EPS (4%)','Pensión (4%)','ARL','CCF (4%)','Neto a pagar','Estado',''].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-semibold uppercase tracking-wide"
                      style={{ color:'var(--zx-text-3)', fontSize:'10px', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map((r, i) => {
                  const sm = statusMap[r.status];
                  return (
                    <tr key={r.id} className="zx-row transition-colors"
                      style={{ borderBottom: i < records.length-1 ? '1px solid var(--zx-border)' : 'none' }}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar initials={String(r.employeeName ?? '?').split(' ').map(n=>n[0]).join('').slice(0,2)} size="xs" />
                          <span className="font-medium whitespace-nowrap" style={{ color:'var(--zx-text-1)' }}>{r.employeeName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3" style={{ color:'var(--zx-text-2)' }}>{r.department}</td>
                      <td className="px-4 py-3 tabular-nums" style={{ color:'var(--zx-text-1)' }}>{formatCOP(r.baseSalary)}</td>
                      <td className="px-4 py-3 tabular-nums" style={{ color:'var(--zx-text-2)' }}>{formatCOP(r.eps)}</td>
                      <td className="px-4 py-3 tabular-nums" style={{ color:'var(--zx-text-2)' }}>{formatCOP(r.pension)}</td>
                      <td className="px-4 py-3 tabular-nums" style={{ color:'var(--zx-text-2)' }}>{formatCOP(r.arl)}</td>
                      <td className="px-4 py-3 tabular-nums" style={{ color:'var(--zx-text-2)' }}>{formatCOP(r.ccf)}</td>
                      <td className="px-4 py-3 tabular-nums font-bold" style={{ color:'var(--zx-success)' }}>{formatCOP(r.netPay)}</td>
                      <td className="px-4 py-3"><Badge variant={sm.variant} dot>{sm.label}</Badge></td>
                      <td className="px-4 py-3">
                        {r.status !== 'paid' && (
                          <button onClick={() => markPaid(r.id)}
                            className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium whitespace-nowrap"
                            style={{ background:'var(--zx-success-muted)', color:'var(--zx-success)' }}>
                            <CheckCircle size={10} /> Marcar pagado
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ borderTop:'2px solid var(--zx-border-2)', background:'var(--zx-surface-2)' }}>
                  <td className="px-4 py-3 font-bold text-xs" style={{ color:'var(--zx-text-1)' }} colSpan={2}>TOTALES</td>
                  <td className="px-4 py-3 tabular-nums font-bold text-xs" style={{ color:'var(--zx-accent)' }}>{formatCOP(totalBase)}</td>
                  <td className="px-4 py-3 tabular-nums font-bold text-xs" style={{ color:'var(--zx-text-2)' }}>{formatCOP(totalEps)}</td>
                  <td className="px-4 py-3 tabular-nums font-bold text-xs" style={{ color:'var(--zx-text-2)' }}>{formatCOP(totalPens)}</td>
                  <td className="px-4 py-3 tabular-nums font-bold text-xs" style={{ color:'var(--zx-text-2)' }}>{formatCOP(records.reduce((s,r)=>s+r.arl,0))}</td>
                  <td className="px-4 py-3 tabular-nums font-bold text-xs" style={{ color:'var(--zx-text-2)' }}>{formatCOP(records.reduce((s,r)=>s+r.ccf,0))}</td>
                  <td className="px-4 py-3 tabular-nums font-bold text-xs" style={{ color:'var(--zx-success)' }}>{formatCOP(total)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
