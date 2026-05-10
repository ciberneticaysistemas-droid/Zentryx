'use client';

import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/layout/Header';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { ToastContainer, useToast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/utils';
import type { PQRCase, PQRType, PQRPriority } from '@/types';
import { analyzePQR } from '@/lib/n8n';
import { MessageSquarePlus, Brain, CheckCircle, Edit3, Send, X, Loader2 } from 'lucide-react';

const typeMap: Record<string, { label:string; variant:'info'|'warning'|'danger' }> = {
  pregunta: { label:'Pregunta', variant:'info' },
  queja:    { label:'Queja',    variant:'warning' },
  reclamo:  { label:'Reclamo',  variant:'danger' },
};
const statusMap: Record<string, { label:string; variant:'default'|'info'|'success'|'accent' }> = {
  open:          { label:'Abierto',    variant:'default' },
  'in-progress': { label:'En Proceso', variant:'info' },
  resolved:      { label:'Resuelto',   variant:'success' },
  closed:        { label:'Cerrado',    variant:'accent' },
};
const priorityMap: Record<string, { label:string; color:string }> = {
  low:    { label:'Baja',  color:'var(--zx-text-3)' },
  medium: { label:'Media', color:'var(--zx-warning)' },
  high:   { label:'Alta',  color:'var(--zx-danger)' },
};

const DEPARTMENTS = ['RRHH','Tecnología','Finanzas','Legal','Ventas','Operaciones'];

async function fetchCases(): Promise<PQRCase[]> {
  const res = await fetch('/api/cases/pqr');
  if (!res.ok) throw new Error('fetch error');
  return res.json();
}

async function persistCase(c: Partial<PQRCase> & { subject: string; submittedBy: string }): Promise<PQRCase> {
  const res = await fetch('/api/cases/pqr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(c),
  });
  const data = await res.json();
  return data.case as PQRCase;
}

async function patchCase(id: string, patch: Partial<Pick<PQRCase, 'status' | 'aiSuggestion' | 'priority'>>): Promise<void> {
  await fetch(`/api/cases/pqr/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
}

export default function PQRPage() {
  const [cases, setCases]               = useState<PQRCase[]>([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [editingId, setEditingId]       = useState<string | null>(null);
  const [editText, setEditText]         = useState('');
  const [appliedIds, setAppliedIds]     = useState<Set<string>>(new Set());
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
  const [showNew, setShowNew]           = useState(false);
  const { toasts, toast, dismiss }      = useToast();

  const [form, setForm] = useState({
    subject: '', description: '', submittedBy: '', department: 'RRHH',
    type: 'pregunta' as PQRType, priority: 'medium' as PQRPriority,
  });

  const refresh = useCallback(() => {
    fetchCases()
      .then(setCases)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 60_000);
    return () => clearInterval(id);
  }, [refresh]);

  const applyAI = (id: string, suggestion: string) => {
    setCases(prev => prev.map((p): PQRCase =>
      p.id === id ? { ...p, status: 'in-progress', aiSuggestion: suggestion } : p
    ));
    setAppliedIds(prev => new Set([...prev, id]));
    patchCase(id, { status: 'in-progress', aiSuggestion: suggestion }).catch(() => {});
    toast('success', 'Sugerencia IA aplicada. Estado actualizado a "En Proceso".');
  };

  const startEdit = (id: string, current: string) => {
    setEditingId(id);
    setEditText(current ?? '');
  };

  const saveEdit = (id: string) => {
    setCases(prev => prev.map((p): PQRCase =>
      p.id === id ? { ...p, aiSuggestion: editText } : p
    ));
    patchCase(id, { aiSuggestion: editText }).catch(() => {});
    setEditingId(null);
    toast('success', 'Respuesta actualizada correctamente.');
  };

  const markResolved = (id: string) => {
    setCases(prev => prev.map((p): PQRCase =>
      p.id === id ? { ...p, status: 'resolved' } : p
    ));
    patchCase(id, { status: 'resolved' }).catch(() => {});
    toast('success', 'PQR marcada como resuelta.');
  };

  const submitNew = async () => {
    if (!form.subject || !form.description || !form.submittedBy) {
      toast('error', 'Por favor completa todos los campos requeridos.');
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    const draft: Partial<PQRCase> & { subject: string; submittedBy: string } = {
      type: form.type,
      subject: form.subject,
      description: form.description,
      submittedBy: form.submittedBy,
      department: form.department,
      status: 'open',
      priority: form.priority,
      createdAt: today,
    };

    const saved = await persistCase(draft);
    setCases(prev => [saved, ...prev]);
    setShowNew(false);
    setForm({ subject:'', description:'', submittedBy:'', department:'RRHH', type:'pregunta', priority:'medium' });
    toast('success', `PQR "${saved.subject}" creada. Generando sugerencia IA...`);

    setAnalyzingIds(prev => new Set([...prev, saved.id]));
    analyzePQR({
      subject:     saved.subject,
      description: saved.description,
      submittedBy: saved.submittedBy,
      department:  saved.department,
      type:        saved.type,
      priority:    saved.priority,
    })
      .then(result => {
        const suggestion = typeof result.suggestion === 'string'
          ? result.suggestion
          : (result.suggestion as Record<string,unknown>)?.value as string
            ?? (result.suggestion as Record<string,unknown>)?.text as string
            ?? String(result.suggestion ?? '');
        const sugPriority: PQRPriority = (['low','medium','high'] as const).includes(
          result.suggestedPriority as PQRPriority
        ) ? (result.suggestedPriority as PQRPriority) : 'medium';
        setCases(prev => prev.map((p): PQRCase =>
          p.id === saved.id
            ? { ...p, aiSuggestion: suggestion, priority: sugPriority }
            : p
        ));
        patchCase(saved.id, { aiSuggestion: suggestion, priority: sugPriority }).catch(() => {});
        toast('success', 'Sugerencia IA lista para la PQR.');
      })
      .catch(() => {
        toast('error', 'No se pudo obtener la sugerencia IA. Verifica que los flujos esten activos.');
      })
      .finally(() => {
        setAnalyzingIds(prev => { const s = new Set(prev); s.delete(saved.id); return s; });
      });
  };

  const open   = cases.filter(p => p.status === 'open' || p.status === 'in-progress').length;
  const solved = cases.filter(p => p.status === 'resolved' || p.status === 'closed').length;

  return (
    <>
      <Header title="PQR Inteligente" subtitle="Preguntas, Quejas y Reclamos con asistencia IA" />

      <div className="flex-1 p-6 space-y-5 animate-fade-in-up">

        {/* KPI row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label:'Total casos',    value:cases.length,                                       color:'var(--zx-accent)' },
            { label:'Activos',        value:open,                                               color:'var(--zx-warning)' },
            { label:'Resueltos',      value:solved,                                             color:'var(--zx-success)' },
            { label:'Alta prioridad', value:cases.filter(p => p.priority === 'high').length,    color:'var(--zx-danger)' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-4" style={{ background:'var(--zx-surface)', border:'1px solid var(--zx-border)' }}>
              <p className="text-2xl font-bold tabular-nums" style={{ color:s.color }}>{s.value}</p>
              <p className="text-[11px] mt-0.5" style={{ color:'var(--zx-text-3)' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold" style={{ color:'var(--zx-text-1)' }}>Casos registrados</h2>
          <Button variant="primary" size="sm" icon={<MessageSquarePlus size={13} />} onClick={() => setShowNew(true)}>
            Nueva PQR
          </Button>
        </div>

        {/* Cases */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="rounded-xl p-8 text-center text-xs" style={{ color: 'var(--zx-text-3)', border: '1px dashed var(--zx-border)' }}>
              Cargando historial de PQRs...
            </div>
          ) : cases.length === 0 ? (
            <div className="rounded-xl p-8 text-center text-xs" style={{ color: 'var(--zx-text-3)', border: '1px solid var(--zx-border)' }}>
              No hay PQRs registradas.
            </div>
          ) : cases.map(p => {
            const tm = typeMap[p.type] ?? typeMap['queja'];
            const sm = statusMap[p.status] ?? statusMap['open'];
            const pm = priorityMap[p.priority] ?? priorityMap['medium'];
            const isEditing  = editingId === p.id;
            const wasApplied = appliedIds.has(p.id);

            return (
              <div key={p.id} className="rounded-xl p-4" style={{ background:'var(--zx-surface)', border:'1px solid var(--zx-border)' }}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Badge variant={tm.variant}>{tm.label}</Badge>
                    <span className="text-xs font-semibold" style={{ color:'var(--zx-text-1)' }}>{p.subject}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-medium" style={{ color: pm.color }}>● {pm.label}</span>
                    <Badge variant={sm.variant} dot>{sm.label}</Badge>
                    {p.status !== 'resolved' && p.status !== 'closed' && (
                      <button onClick={() => markResolved(p.id)}
                        className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-colors"
                        style={{ background:'var(--zx-success-muted)', color:'var(--zx-success)' }}>
                        <CheckCircle size={10} /> Resolver
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-xs mt-2 leading-relaxed" style={{ color:'var(--zx-text-2)' }}>{p.description}</p>

                <div className="flex items-center gap-4 mt-3 text-[11px]" style={{ color:'var(--zx-text-3)' }}>
                  <span>Por: <span style={{ color:'var(--zx-text-2)' }}>{p.submittedBy}</span></span>
                  <span>{p.department}</span>
                  <span className="ml-auto">{formatDate(p.createdAt)}</span>
                </div>

                {analyzingIds.has(p.id) && (
                  <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg"
                    style={{ background:'var(--zx-accent-muted)', border:'1px solid var(--zx-accent)' }}>
                    <Loader2 size={12} className="animate-spin shrink-0" style={{ color:'var(--zx-accent)' }} />
                    <span className="text-xs" style={{ color:'var(--zx-accent)' }}>Generando sugerencia IA...</span>
                  </div>
                )}

                {!analyzingIds.has(p.id) && p.aiSuggestion && (
                  <div className="mt-3 p-3 rounded-lg" style={{ background:'var(--zx-surface-2)', border:'1px solid var(--zx-border)' }}>
                    <div className="flex items-start gap-2">
                      <Brain size={12} className="mt-0.5 shrink-0" style={{ color:'var(--zx-accent)' }} />
                      <div className="flex-1">
                        <span className="text-[10px] font-semibold uppercase" style={{ color:'var(--zx-accent)' }}>
                          Sugerencia IA
                        </span>
                        {isEditing ? (
                          <textarea
                            value={editText}
                            onChange={e => setEditText(e.target.value)}
                            rows={3}
                            className="w-full mt-1 px-2 py-1.5 rounded-lg text-xs outline-none resize-none"
                            style={{ background:'var(--zx-surface-3)', border:'1px solid var(--zx-border-2)', color:'var(--zx-text-1)' }}
                          />
                        ) : (
                          <p className="text-xs mt-0.5 leading-relaxed" style={{ color:'var(--zx-text-2)' }}>{p.aiSuggestion}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 mt-2">
                      {isEditing ? (
                        <>
                          <Button variant="primary" size="sm" className="text-[10px] py-1" icon={<CheckCircle size={11} />}
                            onClick={() => saveEdit(p.id)}>
                            Guardar
                          </Button>
                          <Button variant="ghost" size="sm" className="text-[10px] py-1" icon={<X size={11} />}
                            onClick={() => setEditingId(null)}>
                            Cancelar
                          </Button>
                        </>
                      ) : (
                        <>
                          {!wasApplied && p.status !== 'resolved' && (
                            <Button variant="primary" size="sm" className="text-[10px] py-1" icon={<Send size={11} />}
                              onClick={() => applyAI(p.id, p.aiSuggestion!)}>
                              Aplicar sugerencia
                            </Button>
                          )}
                          {wasApplied && <span className="text-[10px] flex items-center gap-1" style={{ color:'var(--zx-success)' }}><CheckCircle size={10} /> Aplicado</span>}
                          <Button variant="ghost" size="sm" className="text-[10px] py-1" icon={<Edit3 size={11} />}
                            onClick={() => startEdit(p.id, p.aiSuggestion!)}>
                            Editar respuesta
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* New PQR Modal */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="Nueva PQR" size="md">
        <div className="space-y-3">
          {[
            { label:'Asunto *', field:'subject', placeholder:'Ej: Solicitud de certificado laboral' },
            { label:'Nombre del solicitante *', field:'submittedBy', placeholder:'Nombre completo' },
          ].map(({ label, field, placeholder }) => (
            <div key={field}>
              <label className="text-[11px] font-medium block mb-1" style={{ color:'var(--zx-text-3)' }}>{label}</label>
              <input value={(form as Record<string, string>)[field]}
                onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                placeholder={placeholder}
                className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                style={{ background:'var(--zx-surface-2)', border:'1px solid var(--zx-border-2)', color:'var(--zx-text-1)' }} />
            </div>
          ))}

          <div className="grid grid-cols-3 gap-2">
            {([
              { label:'Tipo',      field:'type',       options:[['pregunta','Pregunta'],['queja','Queja'],['reclamo','Reclamo']] as [string,string][] },
              { label:'Prioridad', field:'priority',   options:[['low','Baja'],['medium','Media'],['high','Alta']] as [string,string][] },
              { label:'Área',      field:'department', options: DEPARTMENTS.map((d): [string,string] => [d,d]) },
            ]).map(({ label, field, options }) => (
              <div key={field}>
                <label className="text-[11px] font-medium block mb-1" style={{ color:'var(--zx-text-3)' }}>{label}</label>
                <select value={(form as Record<string, string>)[field]}
                  onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                  className="w-full px-2 py-2 rounded-lg text-xs outline-none"
                  style={{ background:'var(--zx-surface-2)', border:'1px solid var(--zx-border-2)', color:'var(--zx-text-1)' }}>
                  {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            ))}
          </div>

          <div>
            <label className="text-[11px] font-medium block mb-1" style={{ color:'var(--zx-text-3)' }}>Descripción *</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3} placeholder="Describe detalladamente la pregunta, queja o reclamo..."
              className="w-full px-3 py-2 rounded-lg text-xs outline-none resize-none"
              style={{ background:'var(--zx-surface-2)', border:'1px solid var(--zx-border-2)', color:'var(--zx-text-2)' }} />
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="primary" className="flex-1 justify-center" onClick={submitNew}>
              Crear PQR
            </Button>
            <Button variant="secondary" onClick={() => setShowNew(false)}>Cancelar</Button>
          </div>
        </div>
      </Modal>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
