'use client';

import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/layout/Header';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import Modal from '@/components/ui/Modal';
import { ToastContainer, useToast } from '@/components/ui/Toast';
import { employees } from '@/lib/data';
import { formatDate } from '@/lib/utils';
import type { VacationRequest, VacationStatus, VacationType } from '@/types';
import {
  Calendar, Plus, CheckCircle, XCircle, Clock, AlertTriangle,
  ChevronDown, Filter,
} from 'lucide-react';

const statusMap: Record<VacationStatus, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' }> = {
  pending:   { label: 'Pendiente',   variant: 'warning' },
  approved:  { label: 'Aprobada',    variant: 'success' },
  rejected:  { label: 'Rechazada',   variant: 'danger'  },
  cancelled: { label: 'Cancelada',   variant: 'info'    },
};

const typeLabels: Record<VacationType, string> = {
  vacaciones:             'Vacaciones',
  permiso_remunerado:     'Permiso remunerado',
  permiso_no_remunerado:  'Permiso no remunerado',
  licencia_luto:          'Licencia de luto',
  otro:                   'Otro',
};

function workingDays(start: string, end: string): number {
  let count = 0;
  const s = new Date(start); const e = new Date(end);
  while (s <= e) {
    const d = s.getDay();
    if (d !== 0 && d !== 6) count++;
    s.setDate(s.getDate() + 1);
  }
  return count;
}

export default function VacationsPage() {
  const [requests, setRequests]     = useState<VacationRequest[]>([]);
  const [showNew, setShowNew]       = useState(false);
  const [filterStatus, setFilter]   = useState<'all' | VacationStatus>('all');
  const [rejectId, setRejectId]     = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toasts, toast, dismiss }  = useToast();

  const [form, setForm] = useState({
    employeeId: employees[0].id,
    type: 'vacaciones' as VacationType,
    startDate: '', endDate: '', reason: '',
  });

  const fetchRequests = useCallback(() => {
    fetch('/api/cases/vacations')
      .then(r => r.json())
      .then((data: VacationRequest[]) => setRequests(data))
      .catch(() => {});
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const filtered = filterStatus === 'all' ? requests : requests.filter(r => r.status === filterStatus);

  const submitNew = async () => {
    if (!form.startDate || !form.endDate) { toast('error', 'Completa las fechas.'); return; }
    const emp = employees.find(e => e.id === form.employeeId)!;
    const days = workingDays(form.startDate, form.endDate);
    if (days <= 0) { toast('error', 'Las fechas no contienen días hábiles.'); return; }
    setSubmitting(true);
    try {
      await fetch('/api/cases/vacations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: emp.id, employeeName: emp.name, department: emp.department,
          type: form.type, startDate: form.startDate, endDate: form.endDate,
          days, reason: form.reason,
        }),
      });
      setShowNew(false);
      setForm({ employeeId: employees[0].id, type: 'vacaciones', startDate: '', endDate: '', reason: '' });
      fetchRequests();
      toast('success', `Solicitud de ${typeLabels[form.type]} registrada (${days} días hábiles).`);
    } finally { setSubmitting(false); }
  };

  const approve = async (id: string) => {
    await fetch(`/api/cases/vacations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'approved', approvedBy: 'Valentina Ríos', approvedAt: new Date().toISOString() }),
    });
    fetchRequests();
    toast('success', 'Solicitud aprobada.');
  };

  const reject = async () => {
    if (!rejectId) return;
    await fetch(`/api/cases/vacations/${rejectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'rejected', rejectedReason: rejectReason || 'Sin justificación' }),
    });
    setRejectId(null); setRejectReason('');
    fetchRequests();
    toast('error', 'Solicitud rechazada.');
  };

  const pendingCount  = requests.filter(r => r.status === 'pending').length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;
  const totalDays     = requests.filter(r => r.status === 'approved').reduce((s, r) => s + r.days, 0);

  return (
    <>
      <Header title="Vacaciones y Permisos" subtitle="Solicitudes y aprobaciones de ausencias planificadas" />

      <div className="flex-1 p-6 space-y-5 animate-fade-in-up">

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Pendientes de aprobación', value: pendingCount,  icon: <Clock size={15} />,         color: 'var(--zx-warning)' },
            { label: 'Aprobadas este período',   value: approvedCount, icon: <CheckCircle size={15} />,   color: 'var(--zx-success)' },
            { label: 'Días hábiles aprobados',   value: totalDays,     icon: <Calendar size={15} />,      color: 'var(--zx-accent)'  },
            { label: 'Total solicitudes',        value: requests.length,icon: <Filter size={15} />,       color: 'var(--zx-info)'    },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-4" style={{ background: 'var(--zx-surface)', border: '1px solid var(--zx-border)' }}>
              <div className="flex items-center gap-2 mb-1">
                <span style={{ color: s.color }}>{s.icon}</span>
                <p className="text-[11px]" style={{ color: 'var(--zx-text-3)' }}>{s.label}</p>
              </div>
              <p className="text-2xl font-bold tabular-nums" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--zx-surface)', border: '1px solid var(--zx-border)' }}>
            {(['all', 'pending', 'approved', 'rejected'] as const).map(s => (
              <button key={s}
                onClick={() => setFilter(s)}
                className="px-3 py-1.5 rounded-md text-[11px] font-medium transition-all"
                style={{
                  background: filterStatus === s ? 'var(--zx-accent-muted)' : 'transparent',
                  color:      filterStatus === s ? 'var(--zx-accent)' : 'var(--zx-text-3)',
                }}>
                {s === 'all' ? 'Todas' : statusMap[s].label}
              </button>
            ))}
          </div>
          <Button variant="primary" size="sm" icon={<Plus size={13} />} onClick={() => setShowNew(true)}>
            Nueva solicitud
          </Button>
        </div>

        {/* Requests list */}
        {filtered.length === 0 ? (
          <div className="rounded-xl p-10 text-center" style={{ background: 'var(--zx-surface)', border: '1px solid var(--zx-border)' }}>
            <Calendar size={28} className="mx-auto mb-2" style={{ color: 'var(--zx-text-3)' }} />
            <p className="text-sm" style={{ color: 'var(--zx-text-3)' }}>No hay solicitudes en esta categoría</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(req => {
              const sm  = statusMap[req.status];
              const emp = employees.find(e => e.id === req.employeeId);

              return (
                <div key={req.id} className="rounded-xl p-4"
                  style={{ background: 'var(--zx-surface)', border: '1px solid var(--zx-border)' }}>
                  <div className="flex items-center gap-3 flex-wrap">
                    <Avatar initials={emp?.initials ?? req.employeeName.split(' ').map(n => n[0]).join('').slice(0, 2)} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold" style={{ color: 'var(--zx-text-1)' }}>{req.employeeName}</p>
                      <p className="text-[10px]" style={{ color: 'var(--zx-text-3)' }}>{req.department} · {typeLabels[req.type]}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap shrink-0">
                      <div className="text-right">
                        <p className="text-[10px]" style={{ color: 'var(--zx-text-3)' }}>Período</p>
                        <p className="text-[11px] font-medium" style={{ color: 'var(--zx-text-1)' }}>
                          {formatDate(req.startDate)} → {formatDate(req.endDate)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px]" style={{ color: 'var(--zx-text-3)' }}>Días háb.</p>
                        <p className="text-sm font-bold" style={{ color: 'var(--zx-accent)' }}>{req.days}</p>
                      </div>
                      <Badge variant={sm.variant} dot>{sm.label}</Badge>
                      {req.status === 'pending' && (
                        <div className="flex gap-1">
                          <button onClick={() => approve(req.id)}
                            className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium"
                            style={{ background: 'var(--zx-success-muted)', color: 'var(--zx-success)' }}>
                            <CheckCircle size={10} /> Aprobar
                          </button>
                          <button onClick={() => { setRejectId(req.id); setRejectReason(''); }}
                            className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium"
                            style={{ background: 'var(--zx-danger-muted)', color: 'var(--zx-danger)' }}>
                            <XCircle size={10} /> Rechazar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {req.reason && (
                    <p className="mt-2 text-[11px] leading-relaxed" style={{ color: 'var(--zx-text-3)' }}>
                      <span className="font-medium">Motivo: </span>{req.reason}
                    </p>
                  )}

                  {req.status === 'approved' && req.approvedBy && (
                    <p className="mt-1.5 text-[10px]" style={{ color: 'var(--zx-success)' }}>
                      <CheckCircle size={9} className="inline mr-1" />Aprobado por {req.approvedBy}
                      {req.approvedAt ? ` · ${formatDate(req.approvedAt.split('T')[0])}` : ''}
                    </p>
                  )}
                  {req.status === 'rejected' && req.rejectedReason && (
                    <p className="mt-1.5 text-[10px]" style={{ color: 'var(--zx-danger)' }}>
                      <AlertTriangle size={9} className="inline mr-1" />Motivo: {req.rejectedReason}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New Request Modal */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="Nueva Solicitud" size="md">
        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-medium block mb-1" style={{ color: 'var(--zx-text-3)' }}>Empleado</label>
            <div className="relative">
              <select value={form.employeeId} onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))}
                className="w-full appearance-none pl-3 pr-8 py-2 rounded-lg text-xs outline-none"
                style={{ background: 'var(--zx-surface-2)', border: '1px solid var(--zx-border-2)', color: 'var(--zx-text-1)' }}>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--zx-text-3)' }} />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-medium block mb-1" style={{ color: 'var(--zx-text-3)' }}>Tipo de ausencia</label>
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as VacationType }))}
              className="w-full px-3 py-2 rounded-lg text-xs outline-none"
              style={{ background: 'var(--zx-surface-2)', border: '1px solid var(--zx-border-2)', color: 'var(--zx-text-1)' }}>
              {Object.entries(typeLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[['startDate', 'Fecha inicio *'], ['endDate', 'Fecha fin *']].map(([key, label]) => (
              <div key={key}>
                <label className="text-[11px] font-medium block mb-1" style={{ color: 'var(--zx-text-3)' }}>{label}</label>
                <input type="date" value={form[key as 'startDate' | 'endDate']}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                  style={{ background: 'var(--zx-surface-2)', border: '1px solid var(--zx-border-2)', color: 'var(--zx-text-1)' }} />
              </div>
            ))}
          </div>
          {form.startDate && form.endDate && (
            <p className="text-[11px] font-medium" style={{ color: 'var(--zx-accent)' }}>
              Días hábiles: {workingDays(form.startDate, form.endDate)}
            </p>
          )}
          <div>
            <label className="text-[11px] font-medium block mb-1" style={{ color: 'var(--zx-text-3)' }}>Motivo (opcional)</label>
            <textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
              rows={2} className="w-full px-3 py-2 rounded-lg text-xs outline-none resize-none"
              style={{ background: 'var(--zx-surface-2)', border: '1px solid var(--zx-border-2)', color: 'var(--zx-text-2)' }} />
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="primary" className="flex-1 justify-center" loading={submitting} onClick={submitNew}>
              Enviar solicitud
            </Button>
            <Button variant="secondary" onClick={() => setShowNew(false)}>Cancelar</Button>
          </div>
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal open={!!rejectId} onClose={() => setRejectId(null)} title="Rechazar solicitud" size="sm">
        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-medium block mb-1" style={{ color: 'var(--zx-text-3)' }}>Motivo del rechazo</label>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
              rows={3} placeholder="Describe por qué se rechaza la solicitud..."
              className="w-full px-3 py-2 rounded-lg text-xs outline-none resize-none"
              style={{ background: 'var(--zx-surface-2)', border: '1px solid var(--zx-border-2)', color: 'var(--zx-text-2)' }} />
          </div>
          <div className="flex gap-2">
            <Button variant="primary" className="flex-1 justify-center" onClick={reject}>Confirmar rechazo</Button>
            <Button variant="secondary" onClick={() => setRejectId(null)}>Cancelar</Button>
          </div>
        </div>
      </Modal>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
