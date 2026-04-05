'use client';

import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/layout/Header';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import Modal from '@/components/ui/Modal';
import { ToastContainer, useToast } from '@/components/ui/Toast';
import { employees } from '@/lib/data';
import { formatCOP } from '@/lib/utils';
import type { AbsenceCase, PQRCase } from '@/types';
import {
  User, FileText, ClipboardList, HelpCircle, DollarSign,
  Upload, Plus, ChevronDown, CheckCircle, Clock, XCircle, AlertCircle,
} from 'lucide-react';

const verdictBadge: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' }> = {
  accepted: { label: 'Aprobada',  variant: 'success' },
  rejected: { label: 'Rechazada', variant: 'danger'  },
  review:   { label: 'En revisión', variant: 'warning' },
  pending:  { label: 'Pendiente', variant: 'info'    },
};

const pqrStatusBadge: Record<string, { label: string; variant: 'success' | 'warning' | 'info' | 'accent' }> = {
  open:        { label: 'Abierto',      variant: 'info'    },
  'in-progress':{ label: 'En proceso',  variant: 'warning' },
  resolved:    { label: 'Resuelto',     variant: 'success' },
  closed:      { label: 'Cerrado',      variant: 'accent'  },
};

const tabs = ['Mis ausencias', 'Mis PQR', 'Mi nómina'] as const;
type Tab = typeof tabs[number];

export default function EmployeePortalPage() {
  const [selectedEmp, setSelectedEmp] = useState(employees[0]);
  const [activeTab, setActiveTab]     = useState<Tab>('Mis ausencias');
  const [absences, setAbsences]       = useState<AbsenceCase[]>([]);
  const [pqrs, setPqrs]               = useState<PQRCase[]>([]);
  const [showNewPqr, setShowNewPqr]   = useState(false);
  const [showAbsDoc, setShowAbsDoc]   = useState(false);
  const { toasts, toast, dismiss }    = useToast();

  // New PQR form state
  const [pqrForm, setPqrForm] = useState({
    type: 'pregunta' as 'pregunta' | 'queja' | 'reclamo',
    subject: '',
    description: '',
  });

  // Absence document upload
  const [absFile, setAbsFile]   = useState<File | null>(null);
  const [absType, setAbsType]   = useState('Incapacidad médica');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [aRes, pRes] = await Promise.all([
        fetch('/api/cases/absences'),
        fetch('/api/cases/pqr'),
      ]);
      const allAbsences: AbsenceCase[] = await aRes.json();
      const allPqrs: PQRCase[]         = await pRes.json();

      setAbsences(allAbsences.filter(a => a.employeeName === selectedEmp.name || a.employeeId === selectedEmp.id));
      setPqrs(allPqrs.filter(p => p.submittedBy === selectedEmp.name));
    } catch {
      // ignore
    }
  }, [selectedEmp]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const submitPqr = async () => {
    if (!pqrForm.subject || !pqrForm.description) {
      toast('error', 'Completa todos los campos.');
      return;
    }
    setSubmitting(true);
    try {
      await fetch('/api/cases/pqr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...pqrForm,
          submittedBy: selectedEmp.name,
          department: selectedEmp.department,
          priority: 'medium',
        }),
      });
      toast('success', 'PQR enviada correctamente.');
      setShowNewPqr(false);
      setPqrForm({ type: 'pregunta', subject: '', description: '' });
      fetchData();
    } catch {
      toast('error', 'No se pudo enviar la PQR.');
    } finally {
      setSubmitting(false);
    }
  };

  const submitAbsenceDoc = async () => {
    if (!absFile) { toast('error', 'Selecciona un archivo.'); return; }
    setSubmitting(true);
    try {
      await fetch('/api/cases/absences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId:   selectedEmp.id,
          employeeName: selectedEmp.name,
          type:         absType,
          date:         new Date().toISOString().split('T')[0],
          verdict:      'pending',
          confidence:   0,
          summary:      `Documento subido por el empleado: ${absFile.name}`,
          fileName:     absFile.name,
        }),
      });
      toast('success', 'Documento enviado para revisión.');
      setShowAbsDoc(false);
      setAbsFile(null);
      fetchData();
    } catch {
      toast('error', 'No se pudo enviar el documento.');
    } finally {
      setSubmitting(false);
    }
  };

  // Mock payroll for selected employee
  const salary    = selectedEmp.salary;
  const eps       = Math.round(salary * 0.04);
  const pension   = Math.round(salary * 0.04);
  const arl       = Math.round(salary * 0.00522);
  const ccf       = Math.round(salary * 0.04);
  const netPay    = salary - eps - pension - arl - ccf;

  return (
    <>
      <Header title="Portal del Empleado" subtitle="Autoservicio — consulta y gestión personal" />

      <div className="flex-1 p-6 space-y-5 animate-fade-in-up">

        {/* Employee selector */}
        <div className="rounded-xl p-4 flex flex-wrap items-center gap-4"
          style={{ background: 'var(--zx-surface)', border: '1px solid var(--zx-border)' }}>
          <div className="flex items-center gap-3 flex-1 min-w-[200px]">
            <Avatar initials={selectedEmp.initials} size="lg" />
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--zx-text-1)' }}>{selectedEmp.name}</p>
              <p className="text-xs" style={{ color: 'var(--zx-text-3)' }}>{selectedEmp.role} · {selectedEmp.department}</p>
            </div>
          </div>
          <div className="relative">
            <select
              value={selectedEmp.id}
              onChange={e => {
                const emp = employees.find(em => em.id === e.target.value);
                if (emp) setSelectedEmp(emp);
              }}
              className="appearance-none pl-3 pr-8 py-2 rounded-lg text-xs outline-none"
              style={{ background: 'var(--zx-surface-2)', border: '1px solid var(--zx-border-2)', color: 'var(--zx-text-1)' }}>
              {employees.map(em => <option key={em.id} value={em.id}>{em.name}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--zx-text-3)' }} />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ background: 'var(--zx-surface)', border: '1px solid var(--zx-border)' }}>
          {tabs.map(tab => (
            <button key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-4 py-1.5 rounded-md text-xs font-medium transition-all"
              style={{
                background: activeTab === tab ? 'var(--zx-accent-muted)' : 'transparent',
                color:      activeTab === tab ? 'var(--zx-accent)' : 'var(--zx-text-3)',
              }}>
              {tab}
            </button>
          ))}
        </div>

        {/* ── Mis Ausencias ── */}
        {activeTab === 'Mis ausencias' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold" style={{ color: 'var(--zx-text-1)' }}>
                Mis ausencias ({absences.length})
              </p>
              <Button variant="primary" size="sm" icon={<Upload size={13} />} onClick={() => setShowAbsDoc(true)}>
                Subir documento
              </Button>
            </div>
            {absences.length === 0 ? (
              <div className="rounded-xl p-8 text-center" style={{ background: 'var(--zx-surface)', border: '1px solid var(--zx-border)' }}>
                <ClipboardList size={24} className="mx-auto mb-2" style={{ color: 'var(--zx-text-3)' }} />
                <p className="text-xs" style={{ color: 'var(--zx-text-3)' }}>No hay ausencias registradas</p>
              </div>
            ) : (
              absences.map(a => {
                const bd = verdictBadge[a.verdict] ?? { label: a.verdict, variant: 'info' as const };
                return (
                  <div key={a.id} className="rounded-xl p-4 space-y-2"
                    style={{ background: 'var(--zx-surface)', border: '1px solid var(--zx-border)' }}>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <FileText size={14} style={{ color: 'var(--zx-text-3)' }} />
                        <span className="text-xs font-semibold" style={{ color: 'var(--zx-text-1)' }}>{a.type}</span>
                      </div>
                      <Badge variant={bd.variant} dot>{bd.label}</Badge>
                    </div>
                    <p className="text-[11px] leading-relaxed" style={{ color: 'var(--zx-text-3)' }}>{a.summary}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px]" style={{ color: 'var(--zx-text-3)' }}>{a.date}</span>
                      {a.confidence > 0 && (
                        <span className="text-[10px]" style={{ color: 'var(--zx-text-3)' }}>Confianza IA: {a.confidence}%</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── Mis PQR ── */}
        {activeTab === 'Mis PQR' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold" style={{ color: 'var(--zx-text-1)' }}>
                Mis PQR ({pqrs.length})
              </p>
              <Button variant="primary" size="sm" icon={<Plus size={13} />} onClick={() => setShowNewPqr(true)}>
                Nueva PQR
              </Button>
            </div>
            {pqrs.length === 0 ? (
              <div className="rounded-xl p-8 text-center" style={{ background: 'var(--zx-surface)', border: '1px solid var(--zx-border)' }}>
                <HelpCircle size={24} className="mx-auto mb-2" style={{ color: 'var(--zx-text-3)' }} />
                <p className="text-xs" style={{ color: 'var(--zx-text-3)' }}>No has enviado PQR aún</p>
              </div>
            ) : (
              pqrs.map(p => {
                const sb = pqrStatusBadge[p.status] ?? { label: p.status, variant: 'info' as const };
                return (
                  <div key={p.id} className="rounded-xl p-4 space-y-2"
                    style={{ background: 'var(--zx-surface)', border: '1px solid var(--zx-border)' }}>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-xs font-semibold" style={{ color: 'var(--zx-text-1)' }}>{p.subject}</span>
                      <Badge variant={sb.variant} dot>{sb.label}</Badge>
                    </div>
                    <p className="text-[11px]" style={{ color: 'var(--zx-text-3)' }}>{p.description}</p>
                    {p.aiSuggestion && (
                      <div className="p-2.5 rounded-lg" style={{ background: 'var(--zx-accent-muted)' }}>
                        <p className="text-[11px] leading-relaxed" style={{ color: 'var(--zx-accent)' }}>
                          <span className="font-semibold">IA: </span>{p.aiSuggestion}
                        </p>
                      </div>
                    )}
                    <span className="text-[10px]" style={{ color: 'var(--zx-text-3)' }}>{p.createdAt}</span>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── Mi Nómina ── */}
        {activeTab === 'Mi nómina' && (
          <div className="space-y-3">
            <p className="text-sm font-semibold" style={{ color: 'var(--zx-text-1)' }}>
              Desprendible de nómina — Marzo 2025
            </p>
            <div className="rounded-xl overflow-hidden"
              style={{ background: 'var(--zx-surface)', border: '1px solid var(--zx-border)' }}>
              {[
                { icon: <DollarSign size={14} />, label: 'Salario base',       value: formatCOP(salary),  color: 'var(--zx-text-1)', sign: '' },
                { icon: <User        size={14} />, label: 'EPS (4%)',           value: formatCOP(eps),     color: 'var(--zx-danger)',  sign: '−' },
                { icon: <User        size={14} />, label: 'Pensión (4%)',       value: formatCOP(pension), color: 'var(--zx-danger)',  sign: '−' },
                { icon: <User        size={14} />, label: 'ARL (0.522%)',       value: formatCOP(arl),     color: 'var(--zx-danger)',  sign: '−' },
                { icon: <User        size={14} />, label: 'CCF (4%)',           value: formatCOP(ccf),     color: 'var(--zx-danger)',  sign: '−' },
              ].map((row, i) => (
                <div key={row.label} className="flex items-center justify-between px-5 py-3"
                  style={{ borderBottom: i < 4 ? '1px solid var(--zx-border)' : 'none' }}>
                  <div className="flex items-center gap-2" style={{ color: 'var(--zx-text-3)' }}>
                    {row.icon}
                    <span className="text-xs">{row.label}</span>
                  </div>
                  <span className="text-xs font-medium tabular-nums" style={{ color: row.color }}>
                    {row.sign}{row.value}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between px-5 py-4"
                style={{ background: 'var(--zx-surface-2)', borderTop: '2px solid var(--zx-border-2)' }}>
                <div className="flex items-center gap-2">
                  <CheckCircle size={14} style={{ color: 'var(--zx-success)' }} />
                  <span className="text-sm font-bold" style={{ color: 'var(--zx-text-1)' }}>Neto a pagar</span>
                </div>
                <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--zx-success)' }}>
                  {formatCOP(netPay)}
                </span>
              </div>
            </div>

            {/* Status indicators */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: <CheckCircle size={13} />, label: 'Estado pago',  value: 'Pendiente', color: 'var(--zx-warning)' },
                { icon: <Clock       size={13} />, label: 'Período',      value: 'Mar 2025',  color: 'var(--zx-accent)'  },
                { icon: <AlertCircle size={13} />, label: 'Tipo contrato',value: selectedEmp.contractType === 'indefinite' ? 'Indefinido' : 'Fijo', color: 'var(--zx-info)' },
              ].map(s => (
                <div key={s.label} className="rounded-xl p-3 text-center"
                  style={{ background: 'var(--zx-surface)', border: '1px solid var(--zx-border)' }}>
                  <span style={{ color: s.color }} className="flex justify-center mb-1">{s.icon}</span>
                  <p className="text-xs font-semibold" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-[10px]" style={{ color: 'var(--zx-text-3)' }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* New PQR modal */}
      <Modal open={showNewPqr} onClose={() => setShowNewPqr(false)} title="Nueva PQR" size="md">
        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-medium block mb-1" style={{ color: 'var(--zx-text-3)' }}>Tipo</label>
            <select value={pqrForm.type}
              onChange={e => setPqrForm(f => ({ ...f, type: e.target.value as typeof pqrForm.type }))}
              className="w-full px-3 py-2 rounded-lg text-xs outline-none"
              style={{ background: 'var(--zx-surface-2)', border: '1px solid var(--zx-border-2)', color: 'var(--zx-text-1)' }}>
              <option value="pregunta">Pregunta</option>
              <option value="queja">Queja</option>
              <option value="reclamo">Reclamo</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] font-medium block mb-1" style={{ color: 'var(--zx-text-3)' }}>Asunto *</label>
            <input value={pqrForm.subject}
              onChange={e => setPqrForm(f => ({ ...f, subject: e.target.value }))}
              placeholder="Describe brevemente tu solicitud"
              className="w-full px-3 py-2 rounded-lg text-xs outline-none"
              style={{ background: 'var(--zx-surface-2)', border: '1px solid var(--zx-border-2)', color: 'var(--zx-text-1)' }} />
          </div>
          <div>
            <label className="text-[11px] font-medium block mb-1" style={{ color: 'var(--zx-text-3)' }}>Descripción *</label>
            <textarea value={pqrForm.description}
              onChange={e => setPqrForm(f => ({ ...f, description: e.target.value }))}
              rows={3} placeholder="Detalla tu solicitud..."
              className="w-full px-3 py-2 rounded-lg text-xs outline-none resize-none"
              style={{ background: 'var(--zx-surface-2)', border: '1px solid var(--zx-border-2)', color: 'var(--zx-text-2)' }} />
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="primary" className="flex-1 justify-center" loading={submitting} onClick={submitPqr}>
              Enviar PQR
            </Button>
            <Button variant="secondary" onClick={() => setShowNewPqr(false)}>Cancelar</Button>
          </div>
        </div>
      </Modal>

      {/* Upload absence doc modal */}
      <Modal open={showAbsDoc} onClose={() => setShowAbsDoc(false)} title="Subir documento de ausencia" size="sm">
        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-medium block mb-1" style={{ color: 'var(--zx-text-3)' }}>Tipo de ausencia</label>
            <select value={absType} onChange={e => setAbsType(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-xs outline-none"
              style={{ background: 'var(--zx-surface-2)', border: '1px solid var(--zx-border-2)', color: 'var(--zx-text-1)' }}>
              {['Incapacidad médica', 'Cita médica', 'Calamidad doméstica', 'Licencia de paternidad', 'Licencia de maternidad', 'Otro'].map(t => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-medium block mb-1" style={{ color: 'var(--zx-text-3)' }}>Documento soporte</label>
            <label className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg cursor-pointer border-2 border-dashed transition-colors"
              style={{ borderColor: absFile ? 'var(--zx-accent)' : 'var(--zx-border-2)', background: 'var(--zx-surface-2)' }}>
              <Upload size={18} style={{ color: absFile ? 'var(--zx-accent)' : 'var(--zx-text-3)' }} />
              <span className="text-[11px]" style={{ color: absFile ? 'var(--zx-accent)' : 'var(--zx-text-3)' }}>
                {absFile ? absFile.name : 'Clic para seleccionar archivo'}
              </span>
              <input type="file" className="sr-only" onChange={e => setAbsFile(e.target.files?.[0] ?? null)} />
            </label>
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="primary" className="flex-1 justify-center" loading={submitting} onClick={submitAbsenceDoc}>
              Enviar para revisión
            </Button>
            <Button variant="secondary" onClick={() => setShowAbsDoc(false)}>Cancelar</Button>
          </div>
        </div>
      </Modal>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
