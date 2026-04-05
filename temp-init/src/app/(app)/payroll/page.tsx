'use client';

import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/layout/Header';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import Modal from '@/components/ui/Modal';
import { ToastContainer, useToast } from '@/components/ui/Toast';
import { payrollRecords as initialRecords } from '@/lib/data';
import type { PayrollRecord, AbsenceCase } from '@/types';
import { formatCOP } from '@/lib/utils';
import {
  Download, Send, DollarSign, TrendingUp, CheckCircle,
  AlertTriangle, ChevronDown, ChevronUp, Calculator,
} from 'lucide-react';

// ── Colombia 2025 constants ───────────────────────────────────────────────────
const SMMLV        = 1_423_500;
const TRANSPORT_AID = 200_000; // aplica si salario <= 2 SMMLV

/** Retención en la fuente simplificada (tabla 2025, método de depuración) */
function calcRetention(monthly: number): number {
  const annual = monthly * 12;
  if (annual <= 45_400_000)  return 0;
  if (annual <= 72_400_000)  return Math.round((annual * 0.19 - 8_626_000) / 12);
  if (annual <= 122_400_000) return Math.round((annual * 0.28 - 15_130_000) / 12);
  if (annual <= 192_400_000) return Math.round((annual * 0.33 - 21_250_000) / 12);
  return Math.round((annual * 0.35 - 25_090_000) / 12);
}

interface ExtendedRec extends PayrollRecord {
  overtimeHours:     number;
  overtimePay:       number;
  sundayPay:         number;
  bonus:             number;
  transportAid:      number;
  grossPay:          number;
  sourceRetention:   number;
  libranzas:         number;
  absenceDeduction:  number;
  totalDeductions:   number;
  netPayAdjusted:    number;
  // provisiones empleador
  employerEps:       number;
  employerPension:   number;
  icbf:              number;
  sena:              number;
  cesantias:         number;
  cesantiaInterest:  number;
  prima:             number;
  vacacionesProv:    number;
  totalEmployerCost: number;
}

function buildExtended(r: PayrollRecord, rejAbsenceCount: number, extras: { overtime: number; bonus: number; libranza: number }): ExtendedRec {
  const base          = r.baseSalary;
  const transport     = base <= 2 * SMMLV ? TRANSPORT_AID : 0;
  const overtimePay   = Math.round(base / 240 * 1.25 * extras.overtime);
  const sundayPay     = 0; // no hay dominicales en los mock
  const grossPay      = base + transport + overtimePay + sundayPay + extras.bonus;
  const absDeduct     = Math.round((base / 30) * rejAbsenceCount);
  const retention     = calcRetention(base);
  const totalDed      = r.eps + r.pension + retention + extras.libranza + absDeduct;
  const netAdj        = grossPay - totalDed;
  // Costo empleador
  const emplEps       = Math.round(base * 0.085);
  const emplPension   = Math.round(base * 0.12);
  const icbf          = Math.round(base * 0.03);
  const sena          = Math.round(base * 0.02);
  const cesantias     = Math.round(grossPay * 0.0833);
  const cesInt        = Math.round(cesantias * 0.12);
  const prima         = Math.round(grossPay * 0.0833);
  const vacProv       = Math.round(base * 0.0417);
  const totalCost     = netAdj + r.arl + r.ccf + emplEps + emplPension + icbf + sena + cesantias + cesInt + prima + vacProv;

  return {
    ...r,
    overtimeHours:    extras.overtime,
    overtimePay,
    sundayPay,
    bonus:            extras.bonus,
    transportAid:     transport,
    grossPay,
    sourceRetention:  retention,
    libranzas:        extras.libranza,
    absenceDeduction: absDeduct,
    totalDeductions:  totalDed,
    netPayAdjusted:   netAdj,
    employerEps:      emplEps,
    employerPension:  emplPension,
    icbf, sena, cesantias,
    cesantiaInterest: cesInt,
    prima,
    vacacionesProv:   vacProv,
    totalEmployerCost: totalCost,
  };
}

const statusMap: Record<string, { label: string; variant: 'success' | 'warning' | 'info' }> = {
  paid:       { label: 'Pagado',     variant: 'success' },
  pending:    { label: 'Pendiente',  variant: 'warning' },
  processing: { label: 'Procesando', variant: 'info'    },
};

export default function PayrollPage() {
  const [records, setRecords]           = useState<PayrollRecord[]>(initialRecords);
  const [rejectedAbsences, setRejected] = useState<AbsenceCase[]>([]);
  const [extras, setExtras]             = useState<Record<string, { overtime: number; bonus: number; libranza: number }>>({});
  const [expandedId, setExpandedId]     = useState<string | null>(null);
  const [sending, setSending]           = useState(false);
  const [showSim, setShowSim]           = useState(false);
  // Simulator state
  const [simSalary, setSimSalary]       = useState(4_000_000);
  const [simOT, setSimOT]               = useState(0);
  const [simBonus, setSimBonus]         = useState(0);
  const { toasts, toast, dismiss }      = useToast();

  const fetchAbsences = useCallback(() => {
    fetch('/api/cases/absences')
      .then(r => r.json())
      .then((data: AbsenceCase[]) => setRejected(data.filter(a => a.verdict === 'rejected')))
      .catch(() => {});
  }, []);
  useEffect(() => { fetchAbsences(); }, [fetchAbsences]);

  const getExtras = (id: string) => extras[id] ?? { overtime: 0, bonus: 0, libranza: 0 };
  const setExtra  = (id: string, key: 'overtime' | 'bonus' | 'libranza', val: number) =>
    setExtras(prev => ({ ...prev, [id]: { ...getExtras(id), [key]: val } }));

  const ext = (r: PayrollRecord) => {
    const rej = rejectedAbsences.filter(a => a.employeeId === r.employeeId || a.employeeName === r.employeeName).length;
    return buildExtended(r, rej, getExtras(r.id));
  };

  const allExt       = records.map(ext);
  const totalGross   = allExt.reduce((s, r) => s + r.grossPay, 0);
  const totalNet     = allExt.reduce((s, r) => s + r.netPayAdjusted, 0);
  const totalAbsDed  = allExt.reduce((s, r) => s + r.absenceDeduction, 0);
  const totalCost    = allExt.reduce((s, r) => s + r.totalEmployerCost, 0);

  const exportCSV = () => {
    const bom = '\uFEFF';
    const hdr = ['Empleado','Dpto','Base','Transporte','HE','Bonificación','Bruto','EPS','Pensión','Ret.Fuente','Desc.Ausencias','Libranza','Neto','Costo Empresa'];
    const rows = allExt.map(r => [
      r.employeeName, r.department, r.baseSalary, r.transportAid,
      r.overtimePay, r.bonus, r.grossPay, r.eps, r.pension,
      r.sourceRetention, r.absenceDeduction, r.libranzas,
      r.netPayAdjusted, r.totalEmployerCost,
    ]);
    const csv = bom + [hdr, ...rows].map(row => row.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = 'nomina_marzo_2025.csv'; a.click(); URL.revokeObjectURL(url);
    toast('success', 'Nómina colombiana exportada como CSV.');
  };

  const sendSlips = () => {
    setSending(true); let i = 0;
    const iv = setInterval(() => {
      const r = records[i];
      if (!r) { clearInterval(iv); setSending(false); toast('success', `${records.length} desprendibles enviados.`); return; }
      setRecords(prev => prev.map(x => x.id === r.id ? { ...x, status: 'paid' as const } : x));
      i++;
    }, 300);
  };

  // Simulator calcs
  const simTransport   = simSalary <= 2 * SMMLV ? TRANSPORT_AID : 0;
  const simOTPay       = Math.round(simSalary / 240 * 1.25 * simOT);
  const simGross       = simSalary + simTransport + simOTPay + simBonus;
  const simEps         = Math.round(simSalary * 0.04);
  const simPension     = Math.round(simSalary * 0.04);
  const simRetention   = calcRetention(simSalary);
  const simNet         = simGross - simEps - simPension - simRetention;
  const simEmpEps      = Math.round(simSalary * 0.085);
  const simEmpPen      = Math.round(simSalary * 0.12);
  const simIcbf        = Math.round(simSalary * 0.03);
  const simSena        = Math.round(simSalary * 0.02);
  const simCesantias   = Math.round(simGross * 0.0833);
  const simPrima       = Math.round(simGross * 0.0833);
  const simVac         = Math.round(simSalary * 0.0417);
  const simTotalCost   = simNet + Math.round(simSalary * 0.00522) + Math.round(simSalary * 0.04)
    + simEmpEps + simEmpPen + simIcbf + simSena + simCesantias + simCesantias * 0.12 + simPrima + simVac;

  return (
    <>
      <Header title="Nómina" subtitle="Liquidación colombiana completa · Marzo 2025" />
      <div className="flex-1 p-6 space-y-5 animate-fade-in-up">

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total devengado',   value: formatCOP(totalGross), icon: <DollarSign size={16} />, color: 'var(--zx-accent)' },
            { label: 'Neto a pagar',      value: formatCOP(totalNet),   icon: <TrendingUp size={16} />, color: 'var(--zx-success)' },
            { label: 'Desc. ausencias',   value: formatCOP(totalAbsDed),icon: <AlertTriangle size={16} />, color: totalAbsDed > 0 ? 'var(--zx-danger)' : 'var(--zx-text-3)' },
            { label: 'Costo total empresa',value: formatCOP(totalCost), icon: <Calculator size={16} />, color: 'var(--zx-warning)' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-4" style={{ background: 'var(--zx-surface)', border: '1px solid var(--zx-border)' }}>
              <div className="flex items-center gap-2 mb-2">
                <span style={{ color: s.color }}>{s.icon}</span>
                <p className="text-[11px]" style={{ color: 'var(--zx-text-3)' }}>{s.label}</p>
              </div>
              <p className="text-lg font-bold tabular-nums" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--zx-text-1)' }}>
            Detalle nómina — {records.length} empleados
          </h2>
          <div className="flex gap-2 flex-wrap">
            <Button variant="secondary" size="sm" icon={<Calculator size={13} />} onClick={() => setShowSim(true)}>
              Simulador
            </Button>
            <Button variant="secondary" size="sm" icon={<Download size={13} />} onClick={exportCSV}>
              Exportar CSV
            </Button>
            <Button variant="primary" size="sm" icon={sending ? undefined : <Send size={13} />}
              loading={sending} onClick={sendSlips}>
              {sending ? 'Enviando...' : 'Enviar desprendibles'}
            </Button>
          </div>
        </div>

        {/* Employee cards */}
        <div className="space-y-2">
          {allExt.map(r => {
            const sm       = statusMap[r.status];
            const isOpen   = expandedId === r.id;
            const ex       = getExtras(r.id);

            return (
              <div key={r.id} className="rounded-xl overflow-hidden"
                style={{ background: 'var(--zx-surface)', border: `1px solid ${isOpen ? 'var(--zx-accent)' : 'var(--zx-border)'}` }}>

                {/* Summary row */}
                <button className="w-full flex items-center gap-4 px-4 py-3 text-left"
                  onClick={() => setExpandedId(isOpen ? null : r.id)}>
                  <Avatar initials={String(r.employeeName ?? '?').split(' ').map(n => n[0]).join('').slice(0, 2)} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold" style={{ color: 'var(--zx-text-1)' }}>{r.employeeName}</p>
                    <p className="text-[10px]" style={{ color: 'var(--zx-text-3)' }}>{r.department} · {r.period}</p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <p className="text-[10px]" style={{ color: 'var(--zx-text-3)' }}>Bruto</p>
                      <p className="text-xs font-semibold tabular-nums" style={{ color: 'var(--zx-text-1)' }}>{formatCOP(r.grossPay)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px]" style={{ color: 'var(--zx-text-3)' }}>Neto</p>
                      <p className="text-xs font-bold tabular-nums" style={{ color: r.absenceDeduction > 0 ? 'var(--zx-warning)' : 'var(--zx-success)' }}>
                        {formatCOP(r.netPayAdjusted)}
                      </p>
                    </div>
                    <Badge variant={sm.variant} dot>{sm.label}</Badge>
                    {isOpen ? <ChevronUp size={13} style={{ color: 'var(--zx-text-3)' }} /> : <ChevronDown size={13} style={{ color: 'var(--zx-text-3)' }} />}
                  </div>
                </button>

                {/* Detail panel */}
                {isOpen && (
                  <div className="px-4 pb-4 border-t" style={{ borderColor: 'var(--zx-border)' }}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">

                      {/* Devengos */}
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--zx-text-3)' }}>Devengos</p>
                        <div className="space-y-1.5">
                          {[
                            { label: 'Salario base',              value: r.baseSalary },
                            { label: `Auxilio de transporte${r.transportAid === 0 ? ' (N/A)' : ''}`, value: r.transportAid },
                            { label: 'Horas extras diurnas (125%)', value: r.overtimePay },
                            { label: 'Bonificaciones/Comisiones', value: r.bonus },
                          ].map(row => (
                            <div key={row.label} className="flex justify-between text-[11px]">
                              <span style={{ color: 'var(--zx-text-3)' }}>{row.label}</span>
                              <span style={{ color: row.value > 0 ? 'var(--zx-text-1)' : 'var(--zx-text-3)' }} className="tabular-nums">
                                {formatCOP(row.value)}
                              </span>
                            </div>
                          ))}
                          <div className="flex justify-between text-[11px] font-bold pt-1" style={{ borderTop: '1px solid var(--zx-border)' }}>
                            <span style={{ color: 'var(--zx-text-1)' }}>Total devengado</span>
                            <span className="tabular-nums" style={{ color: 'var(--zx-accent)' }}>{formatCOP(r.grossPay)}</span>
                          </div>
                        </div>

                        {/* Editable extras */}
                        <div className="mt-3 p-2.5 rounded-lg space-y-2" style={{ background: 'var(--zx-surface-2)', border: '1px solid var(--zx-border)' }}>
                          <p className="text-[10px] font-semibold" style={{ color: 'var(--zx-text-3)' }}>Ajustes del período</p>
                          {([
                            ['overtime', 'Horas extras diurnas', 'h'],
                            ['bonus',    'Bonificación (COP)',    '$'],
                            ['libranza', 'Libranza/Crédito (COP)', '$'],
                          ] as [keyof typeof ex, string, string][]).map(([k, lbl, unit]) => (
                            <div key={k} className="flex items-center gap-2">
                              <span className="text-[10px] flex-1" style={{ color: 'var(--zx-text-3)' }}>{lbl}</span>
                              <span className="text-[10px]" style={{ color: 'var(--zx-text-3)' }}>{unit}</span>
                              <input type="number" min={0} value={ex[k]}
                                onChange={e => setExtra(r.id, k, Number(e.target.value))}
                                className="w-20 px-2 py-1 rounded text-xs outline-none text-center tabular-nums"
                                style={{ background: 'var(--zx-surface-3)', border: '1px solid var(--zx-border-2)', color: 'var(--zx-accent)' }} />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Deducciones */}
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--zx-text-3)' }}>Deducciones empleado</p>
                        <div className="space-y-1.5">
                          {[
                            { label: 'EPS empleado (4%)',          value: r.eps,               color: 'var(--zx-danger)' },
                            { label: 'Pensión empleado (4%)',      value: r.pension,           color: 'var(--zx-danger)' },
                            { label: 'Retención en la fuente',     value: r.sourceRetention,   color: 'var(--zx-danger)' },
                            { label: 'Libranza/Crédito',           value: r.libranzas,         color: 'var(--zx-danger)' },
                            { label: 'Desc. ausencias injustif.',  value: r.absenceDeduction,  color: r.absenceDeduction > 0 ? 'var(--zx-danger)' : 'var(--zx-text-3)' },
                          ].map(row => (
                            <div key={row.label} className="flex justify-between text-[11px]">
                              <span style={{ color: 'var(--zx-text-3)' }}>{row.label}</span>
                              <span className="tabular-nums" style={{ color: row.value > 0 ? row.color : 'var(--zx-text-3)' }}>
                                {row.value > 0 ? `−${formatCOP(row.value)}` : '—'}
                              </span>
                            </div>
                          ))}
                          <div className="flex justify-between text-[11px] font-bold pt-1" style={{ borderTop: '1px solid var(--zx-border)' }}>
                            <span style={{ color: 'var(--zx-text-1)' }}>Neto a pagar</span>
                            <span className="tabular-nums" style={{ color: r.absenceDeduction > 0 ? 'var(--zx-warning)' : 'var(--zx-success)' }}>
                              {formatCOP(r.netPayAdjusted)}
                            </span>
                          </div>
                        </div>

                        {/* Costo empleador */}
                        <div className="mt-3 p-2.5 rounded-lg" style={{ background: 'var(--zx-surface-2)', border: '1px solid var(--zx-border)' }}>
                          <p className="text-[10px] font-semibold mb-1.5" style={{ color: 'var(--zx-text-3)' }}>Aportes empleador (no deducibles)</p>
                          {[
                            ['EPS empleador (8.5%)', r.employerEps],
                            ['Pensión empleador (12%)', r.employerPension],
                            ['ARL', r.arl],
                            ['CCF (4%)', r.ccf],
                            ['ICBF (3%)', r.icbf],
                            ['SENA (2%)', r.sena],
                            ['Cesantías (8.33%)', r.cesantias],
                            ['Prima (8.33%)', r.prima],
                            ['Vacaciones prov. (4.17%)', r.vacacionesProv],
                          ].map(([label, value]) => (
                            <div key={String(label)} className="flex justify-between text-[10px]">
                              <span style={{ color: 'var(--zx-text-3)' }}>{label}</span>
                              <span className="tabular-nums" style={{ color: 'var(--zx-text-2)' }}>{formatCOP(Number(value))}</span>
                            </div>
                          ))}
                          <div className="flex justify-between text-[11px] font-bold mt-1 pt-1" style={{ borderTop: '1px solid var(--zx-border)' }}>
                            <span style={{ color: 'var(--zx-warning)' }}>Costo total empresa</span>
                            <span className="tabular-nums" style={{ color: 'var(--zx-warning)' }}>{formatCOP(r.totalEmployerCost)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-3">
                      {r.status !== 'paid' && (
                        <button
                          onClick={() => { setRecords(prev => prev.map(x => x.id === r.id ? { ...x, status: 'paid' as const } : x)); toast('success', 'Marcado como pagado.'); }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-md text-[10px] font-medium"
                          style={{ background: 'var(--zx-success-muted)', color: 'var(--zx-success)' }}>
                          <CheckCircle size={11} /> Marcar pagado
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Simulator Modal */}
      <Modal open={showSim} onClose={() => setShowSim(false)} title="Simulador de Nómina — Colombia 2025" size="md">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {([
              ['Salario base (COP)', simSalary, setSimSalary],
              ['Horas extras diurnas', simOT, setSimOT],
              ['Bonificaciones (COP)', simBonus, setSimBonus],
            ] as [string, number, (v: number) => void][]).map(([label, val, setter]) => (
              <div key={label} className={label.length > 20 ? 'col-span-2' : ''}>
                <label className="text-[11px] font-medium block mb-1" style={{ color: 'var(--zx-text-3)' }}>{label}</label>
                <input type="number" min={0} value={val}
                  onChange={e => setter(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                  style={{ background: 'var(--zx-surface-2)', border: '1px solid var(--zx-border-2)', color: 'var(--zx-text-1)' }} />
              </div>
            ))}
          </div>
          <div className="rounded-xl p-3 space-y-1.5" style={{ background: 'var(--zx-surface-2)', border: '1px solid var(--zx-border)' }}>
            {[
              ['Auxilio de transporte', formatCOP(simTransport), 'var(--zx-success)'],
              ['Horas extras',          formatCOP(simOTPay),     'var(--zx-success)'],
              ['Total devengado',       formatCOP(simGross),     'var(--zx-accent)'],
              ['EPS (4%)',              `−${formatCOP(simEps)}`, 'var(--zx-danger)'],
              ['Pensión (4%)',          `−${formatCOP(simPension)}`, 'var(--zx-danger)'],
              ['Retención en la fuente',`−${formatCOP(simRetention)}`, 'var(--zx-danger)'],
              ['Neto empleado',         formatCOP(simNet),       'var(--zx-success)'],
              ['─────────────────', '', 'transparent'],
              ['Cesantías (prov.)',      formatCOP(simCesantias), 'var(--zx-text-3)'],
              ['Prima (prov.)',          formatCOP(simPrima),     'var(--zx-text-3)'],
              ['EPS + Pensión + Paraf.', formatCOP(simEmpEps + simEmpPen + simIcbf + simSena), 'var(--zx-text-3)'],
              ['Costo total empresa',    formatCOP(Math.round(simTotalCost)), 'var(--zx-warning)'],
            ].map(([label, value, color]) => (
              <div key={String(label)} className="flex justify-between text-[11px]">
                <span style={{ color: 'var(--zx-text-3)' }}>{label}</span>
                <span className="font-semibold tabular-nums" style={{ color: String(color) }}>{value}</span>
              </div>
            ))}
          </div>
          <Button variant="secondary" className="w-full justify-center" onClick={() => setShowSim(false)}>Cerrar</Button>
        </div>
      </Modal>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
