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
import type { TrainingRecord, TrainingStatus, TrainingCourse } from '@/types';
import {
  BookOpen, Plus, CheckCircle, Clock, AlertTriangle,
  Award, ChevronDown, Star,
} from 'lucide-react';

const statusMap: Record<TrainingStatus, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' }> = {
  pending:     { label: 'Pendiente',   variant: 'info'    },
  in_progress: { label: 'En curso',    variant: 'warning' },
  completed:   { label: 'Completada',  variant: 'success' },
  expired:     { label: 'Vencida',     variant: 'danger'  },
};

const categoryColors: Record<TrainingCourse['category'], string> = {
  sst:        'var(--zx-danger)',
  tecnico:    'var(--zx-accent)',
  liderazgo:  'var(--zx-warning)',
  compliance: 'var(--zx-info)',
  otro:       'var(--zx-text-3)',
};

const categoryLabels: Record<TrainingCourse['category'], string> = {
  sst:        'SST',
  tecnico:    'Técnico',
  liderazgo:  'Liderazgo',
  compliance: 'Compliance',
  otro:       'Otro',
};

const CATALOG: TrainingCourse[] = [
  { id: 'C001', title: 'Inducción SST', provider: 'ARL Sura', category: 'sst', durationHours: 8, mandatory: true },
  { id: 'C002', title: 'Trabajo en alturas', provider: 'SENA', category: 'sst', durationHours: 16, mandatory: false },
  { id: 'C003', title: 'Excel avanzado', provider: 'Interno', category: 'tecnico', durationHours: 20, mandatory: false },
  { id: 'C004', title: 'Liderazgo situacional', provider: 'Externa', category: 'liderazgo', durationHours: 12, mandatory: false },
  { id: 'C005', title: 'Habeas Data y PTEE', provider: 'Legal', category: 'compliance', durationHours: 4, mandatory: true },
  { id: 'C006', title: 'Manejo de conflictos', provider: 'Interno', category: 'liderazgo', durationHours: 8, mandatory: false },
  { id: 'C007', title: 'Gestión ágil (Scrum)', provider: 'Platzi', category: 'tecnico', durationHours: 10, mandatory: false },
];

export default function TrainingPage() {
  const [records, setRecords]       = useState<TrainingRecord[]>([]);
  const [showNew, setShowNew]       = useState(false);
  const [filterStatus, setFilter]   = useState<'all' | TrainingStatus>('all');
  const [submitting, setSubmitting] = useState(false);
  const { toasts, toast, dismiss }  = useToast();

  const [form, setForm] = useState({
    employeeId: employees[0].id,
    courseId:   CATALOG[0].id,
    startDate:  '',
    expiresAt:  '',
  });

  const fetchRecords = useCallback(() => {
    fetch('/api/training')
      .then(r => r.json())
      .then((data: TrainingRecord[]) => setRecords(data))
      .catch(() => {});
  }, []);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const filtered = filterStatus === 'all' ? records : records.filter(r => r.status === filterStatus);

  const submitNew = async () => {
    if (!form.startDate) { toast('error', 'Ingresa la fecha de inicio.'); return; }
    const emp    = employees.find(e => e.id === form.employeeId)!;
    const course = CATALOG.find(c => c.id === form.courseId)!;
    setSubmitting(true);
    try {
      await fetch('/api/training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId:   emp.id,
          employeeName: emp.name,
          department:   emp.department,
          courseId:     course.id,
          courseTitle:  course.title,
          category:     course.category,
          status:       'pending' as TrainingStatus,
          startDate:    form.startDate,
          expiresAt:    form.expiresAt || undefined,
          mandatory:    course.mandatory,
        }),
      });
      setShowNew(false);
      setForm({ employeeId: employees[0].id, courseId: CATALOG[0].id, startDate: '', expiresAt: '' });
      fetchRecords();
      toast('success', `Capacitación "${course.title}" asignada a ${emp.name}.`);
    } finally { setSubmitting(false); }
  };

  const updateStatus = async (id: string, status: TrainingStatus, score?: number) => {
    const patch: Record<string, unknown> = { status };
    if (status === 'completed') patch.completedAt = new Date().toISOString();
    if (score !== undefined) patch.score = score;
    await fetch(`/api/training/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    fetchRecords();
    toast('success', status === 'completed' ? 'Capacitación marcada como completada.' : 'Estado actualizado.');
  };

  const pendingCount   = records.filter(r => r.status === 'pending').length;
  const completedCount = records.filter(r => r.status === 'completed').length;
  const mandatoryPend  = records.filter(r => r.mandatory && r.status !== 'completed').length;
  const totalHours     = records.filter(r => r.status === 'completed')
    .reduce((s, r) => s + (CATALOG.find(c => c.id === r.courseId)?.durationHours ?? 0), 0);

  return (
    <>
      <Header title="Capacitaciones" subtitle="Gestión de formación y certificaciones del equipo" />

      <div className="flex-1 p-6 space-y-5 animate-fade-in-up">

        {mandatoryPend > 0 && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid var(--zx-danger)' }}>
            <AlertTriangle size={15} style={{ color: 'var(--zx-danger)', flexShrink: 0 }} />
            <p className="text-xs" style={{ color: 'var(--zx-danger)' }}>
              <span className="font-semibold">{mandatoryPend} capacitación{mandatoryPend > 1 ? 'es' : ''} obligatoria{mandatoryPend > 1 ? 's' : ''} pendiente{mandatoryPend > 1 ? 's' : ''}</span>
              {' '}— Requerido por normativa SST / Compliance.
            </p>
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Pendientes',         value: pendingCount,   icon: <Clock size={15} />,      color: 'var(--zx-warning)' },
            { label: 'Completadas',        value: completedCount, icon: <CheckCircle size={15} />,color: 'var(--zx-success)' },
            { label: 'Horas formación',    value: totalHours,     icon: <BookOpen size={15} />,   color: 'var(--zx-accent)'  },
            { label: 'Obligatorias pend.', value: mandatoryPend,  icon: <AlertTriangle size={15} />, color: mandatoryPend > 0 ? 'var(--zx-danger)' : 'var(--zx-text-3)' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-4" style={{ background: 'var(--zx-surface)', border: '1px solid var(--zx-border)' }}>
              <div className="flex items-center gap-2 mb-1"><span style={{ color: s.color }}>{s.icon}</span>
                <p className="text-[11px]" style={{ color: 'var(--zx-text-3)' }}>{s.label}</p>
              </div>
              <p className="text-2xl font-bold tabular-nums" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--zx-surface)', border: '1px solid var(--zx-border)' }}>
            {(['all', 'pending', 'in_progress', 'completed', 'expired'] as const).map(s => (
              <button key={s} onClick={() => setFilter(s)}
                className="px-3 py-1.5 rounded-md text-[11px] font-medium transition-all"
                style={{
                  background: filterStatus === s ? 'var(--zx-accent-muted)' : 'transparent',
                  color: filterStatus === s ? 'var(--zx-accent)' : 'var(--zx-text-3)',
                }}>
                {s === 'all' ? 'Todas' : statusMap[s].label}
              </button>
            ))}
          </div>
          <Button variant="primary" size="sm" icon={<Plus size={13} />} onClick={() => setShowNew(true)}>
            Asignar capacitación
          </Button>
        </div>

        {/* Catalog chips */}
        <div>
          <p className="text-[11px] font-semibold mb-2" style={{ color: 'var(--zx-text-3)' }}>CATÁLOGO DISPONIBLE</p>
          <div className="flex flex-wrap gap-1.5">
            {CATALOG.map(c => (
              <span key={c.id} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium"
                style={{ background: 'var(--zx-surface)', border: '1px solid var(--zx-border)', color: categoryColors[c.category] }}>
                {c.mandatory && <AlertTriangle size={9} />}
                {c.title} · {c.durationHours}h
              </span>
            ))}
          </div>
        </div>

        {/* Records list */}
        {filtered.length === 0 ? (
          <div className="rounded-xl p-10 text-center" style={{ background: 'var(--zx-surface)', border: '1px solid var(--zx-border)' }}>
            <BookOpen size={28} className="mx-auto mb-2" style={{ color: 'var(--zx-text-3)' }} />
            <p className="text-sm" style={{ color: 'var(--zx-text-3)' }}>No hay capacitaciones asignadas aún</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(rec => {
              const sm     = statusMap[rec.status];
              const emp    = employees.find(e => e.id === rec.employeeId);
              const course = CATALOG.find(c => c.id === rec.courseId);
              const catColor = categoryColors[rec.category];

              return (
                <div key={rec.id} className="rounded-xl p-4"
                  style={{ background: 'var(--zx-surface)', border: `1px solid ${rec.mandatory && rec.status !== 'completed' ? 'var(--zx-danger)' : 'var(--zx-border)'}` }}>
                  <div className="flex items-center gap-3 flex-wrap">
                    <Avatar initials={emp?.initials ?? '?'} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-xs font-semibold" style={{ color: 'var(--zx-text-1)' }}>{rec.courseTitle}</p>
                        {rec.mandatory && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--zx-danger)' }}>
                            OBLIGATORIO
                          </span>
                        )}
                      </div>
                      <p className="text-[10px]" style={{ color: 'var(--zx-text-3)' }}>
                        {rec.employeeName} · {rec.department}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap shrink-0">
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                        style={{ background: 'var(--zx-surface-2)', color: catColor }}>
                        {categoryLabels[rec.category]}
                      </span>
                      <span className="text-[10px]" style={{ color: 'var(--zx-text-3)' }}>
                        Inicio: {formatDate(rec.startDate)}
                      </span>
                      {rec.expiresAt && (
                        <span className="text-[10px]" style={{ color: 'var(--zx-warning)' }}>
                          Vence: {formatDate(rec.expiresAt)}
                        </span>
                      )}
                      {rec.score !== undefined && (
                        <span className="flex items-center gap-0.5 text-[10px]" style={{ color: 'var(--zx-accent)' }}>
                          <Star size={9} fill="currentColor" /> {rec.score}/100
                        </span>
                      )}
                      <Badge variant={sm.variant} dot>{sm.label}</Badge>
                      {rec.status === 'pending' && (
                        <button onClick={() => updateStatus(rec.id, 'in_progress')}
                          className="text-[10px] font-medium px-2 py-1 rounded-md"
                          style={{ background: 'var(--zx-accent-muted)', color: 'var(--zx-accent)' }}>
                          Iniciar
                        </button>
                      )}
                      {rec.status === 'in_progress' && (
                        <button onClick={() => updateStatus(rec.id, 'completed', Math.round(75 + Math.random() * 25))}
                          className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-md"
                          style={{ background: 'var(--zx-success-muted)', color: 'var(--zx-success)' }}>
                          <Award size={9} /> Completar
                        </button>
                      )}
                    </div>
                  </div>
                  {rec.completedAt && (
                    <p className="mt-1.5 text-[10px]" style={{ color: 'var(--zx-success)' }}>
                      <CheckCircle size={9} className="inline mr-1" />Completada el {formatDate(rec.completedAt.split('T')[0])}
                      {course ? ` · ${course.durationHours}h de formación` : ''}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Assign Modal */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="Asignar Capacitación" size="md">
        <div className="space-y-3">
          {[
            { label: 'Empleado', key: 'employeeId', options: employees.map(e => [e.id, e.name]) },
            { label: 'Curso',    key: 'courseId',   options: CATALOG.map(c => [c.id, `${c.title} (${c.durationHours}h) ${c.mandatory ? '★' : ''}`]) },
          ].map(({ label, key, options }) => (
            <div key={key}>
              <label className="text-[11px] font-medium block mb-1" style={{ color: 'var(--zx-text-3)' }}>{label}</label>
              <div className="relative">
                <select value={form[key as 'employeeId' | 'courseId']}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full appearance-none pl-3 pr-8 py-2 rounded-lg text-xs outline-none"
                  style={{ background: 'var(--zx-surface-2)', border: '1px solid var(--zx-border-2)', color: 'var(--zx-text-1)' }}>
                  {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--zx-text-3)' }} />
              </div>
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3">
            {[['startDate', 'Fecha inicio *'], ['expiresAt', 'Fecha vencimiento (opcional)']].map(([key, label]) => (
              <div key={key}>
                <label className="text-[11px] font-medium block mb-1" style={{ color: 'var(--zx-text-3)' }}>{label}</label>
                <input type="date" value={form[key as 'startDate' | 'expiresAt']}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                  style={{ background: 'var(--zx-surface-2)', border: '1px solid var(--zx-border-2)', color: 'var(--zx-text-1)' }} />
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="primary" className="flex-1 justify-center" loading={submitting} onClick={submitNew}>
              Asignar
            </Button>
            <Button variant="secondary" onClick={() => setShowNew(false)}>Cancelar</Button>
          </div>
        </div>
      </Modal>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
