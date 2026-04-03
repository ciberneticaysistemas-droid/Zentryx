'use client';

import { useState } from 'react';
import Header from '@/components/layout/Header';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import Modal from '@/components/ui/Modal';
import { ToastContainer, useToast } from '@/components/ui/Toast';
import { performanceRecords as initialRecords } from '@/lib/data';
import type { PerformanceRecord } from '@/types';
import { TrendingUp, Star, Edit3, Check, X, Plus } from 'lucide-react';

function ScoreRing({ score }: { score: number }) {
  const color =
    score >= 90 ? 'var(--zx-success)' :
    score >= 80 ? 'var(--zx-accent)'  :
    score >= 70 ? 'var(--zx-warning)' : 'var(--zx-danger)';
  const r = 20, c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  return (
    <div className="relative flex items-center justify-center w-14 h-14 shrink-0">
      <svg className="absolute" width="56" height="56" viewBox="0 0 56 56" style={{ transform:'rotate(-90deg)' }}>
        <circle cx="28" cy="28" r={r} fill="none" stroke="var(--zx-surface-3)" strokeWidth="3" />
        <circle cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <span className="text-sm font-bold tabular-nums" style={{ color }}>{score}</span>
    </div>
  );
}

function calcScore(kpis: PerformanceRecord['kpis']): number {
  const total = kpis.reduce((s, k) => s + k.weight, 0);
  return Math.round(kpis.reduce((s, k) => s + (k.score * k.weight) / total, 0));
}

export default function PerformancePage() {
  const [records, setRecords]       = useState<PerformanceRecord[]>(initialRecords);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [draftKpis, setDraftKpis]   = useState<PerformanceRecord['kpis']>([]);
  const [draftNotes, setDraftNotes] = useState('');
  const [showNew, setShowNew]       = useState(false);
  const { toasts, toast, dismiss }  = useToast();

  // New evaluation form
  const [newForm, setNewForm] = useState({
    employeeName: '', department: 'RRHH', period: 'Q2 2025',
    kpis: [
      { label:'Calidad', score:80, weight:34 },
      { label:'Cumplimiento', score:80, weight:33 },
      { label:'Actitud', score:80, weight:33 },
    ],
    notes: '',
  });

  const startEdit = (rec: PerformanceRecord) => {
    setEditingId(rec.employeeId);
    setDraftKpis(rec.kpis.map(k => ({ ...k })));
    setDraftNotes(rec.notes ?? '');
  };

  const saveEdit = (employeeId: string) => {
    setRecords(prev => prev.map(r => {
      if (r.employeeId !== employeeId) return r;
      const newScore = calcScore(draftKpis);
      return { ...r, kpis: draftKpis, score: newScore, notes: draftNotes };
    }));
    setEditingId(null);
    toast('success', 'Evaluación actualizada correctamente.');
  };

  const setKpiScore = (idx: number, score: number) => {
    setDraftKpis(prev => prev.map((k, i) => i === idx ? { ...k, score: Math.max(0, Math.min(100, score)) } : k));
  };

  const submitNew = () => {
    if (!newForm.employeeName) { toast('error', 'Ingresa el nombre del empleado.'); return; }
    const rec: PerformanceRecord = {
      employeeId:   `E_NEW_${Date.now()}`,
      employeeName: newForm.employeeName,
      department:   newForm.department,
      period:       newForm.period,
      score:        calcScore(newForm.kpis),
      kpis:         newForm.kpis,
      notes:        newForm.notes || undefined,
    };
    setRecords(prev => [rec, ...prev]);
    setShowNew(false);
    toast('success', `Evaluación de ${rec.employeeName} creada — Puntaje: ${rec.score} pts`);
  };

  const avg = Math.round(records.reduce((s,r)=>s+r.score,0)/records.length);

  return (
    <>
      <Header title="Desempeño" subtitle="Calificaciones editables por administrador" />

      <div className="flex-1 p-6 space-y-5 animate-fade-in-up">

        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label:'Promedio general', value:`${avg} pts`, color:'var(--zx-accent)' },
            { label:'Excelente (90+)',  value:records.filter(r=>r.score>=90).length,              color:'var(--zx-success)' },
            { label:'Satisfactorio',   value:records.filter(r=>r.score>=70&&r.score<90).length,  color:'var(--zx-warning)' },
            { label:'Necesita mejora', value:records.filter(r=>r.score<70).length,                color:'var(--zx-danger)' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-4" style={{ background:'var(--zx-surface)', border:'1px solid var(--zx-border)' }}>
              <p className="text-2xl font-bold tabular-nums" style={{ color:s.color }}>{s.value}</p>
              <p className="text-[11px] mt-0.5" style={{ color:'var(--zx-text-3)' }}>{s.label}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold" style={{ color:'var(--zx-text-1)' }}>Evaluaciones individuales</h2>
          <Button variant="primary" size="sm" icon={<Plus size={13} />} onClick={() => setShowNew(true)}>
            Nueva evaluación
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {records.map(pr => {
            const isEditing = editingId === pr.employeeId;
            const displayScore = isEditing ? calcScore(draftKpis) : pr.score;
            const color =
              displayScore >= 90 ? 'var(--zx-success)' :
              displayScore >= 80 ? 'var(--zx-accent)'  :
              displayScore >= 70 ? 'var(--zx-warning)' : 'var(--zx-danger)';

            return (
              <div key={pr.employeeId} className="rounded-xl p-4"
                style={{ background:'var(--zx-surface)', border:`1px solid ${isEditing ? 'var(--zx-accent)' : 'var(--zx-border)'}` }}>
                <div className="flex items-center gap-3">
                  <Avatar initials={pr.employeeName.split(' ').map(n=>n[0]).join('').slice(0,2)} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color:'var(--zx-text-1)' }}>{pr.employeeName}</p>
                    <p className="text-xs" style={{ color:'var(--zx-text-3)' }}>{pr.department} · {pr.period}</p>
                  </div>
                  <ScoreRing score={displayScore} />
                  {!isEditing ? (
                    <button onClick={() => startEdit(pr)}
                      className="p-1.5 rounded-md transition-colors"
                      style={{ color:'var(--zx-text-3)' }}
                      title="Editar evaluación"
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--zx-surface-2)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                      <Edit3 size={13} />
                    </button>
                  ) : (
                    <div className="flex gap-1">
                      <button onClick={() => saveEdit(pr.employeeId)}
                        className="p-1.5 rounded-md"
                        style={{ background:'var(--zx-success-muted)', color:'var(--zx-success)' }}
                        title="Guardar">
                        <Check size={13} />
                      </button>
                      <button onClick={() => setEditingId(null)}
                        className="p-1.5 rounded-md"
                        style={{ background:'var(--zx-surface-2)', color:'var(--zx-text-3)' }}
                        title="Cancelar">
                        <X size={13} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-4 space-y-3">
                  {(isEditing ? draftKpis : pr.kpis).map((kpi, idx) => (
                    <div key={kpi.label}>
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span style={{ color:'var(--zx-text-2)' }}>{kpi.label}</span>
                        <div className="flex items-center gap-2">
                          {isEditing ? (
                            <input
                              type="number" min={0} max={100}
                              value={draftKpis[idx].score}
                              onChange={e => setKpiScore(idx, Number(e.target.value))}
                              className="w-14 px-1.5 py-0.5 rounded text-center tabular-nums outline-none text-xs"
                              style={{ background:'var(--zx-surface-2)', border:'1px solid var(--zx-accent)', color:'var(--zx-accent)' }}
                            />
                          ) : (
                            <span className="font-medium tabular-nums" style={{ color }}>{kpi.score}</span>
                          )}
                          <span style={{ color:'var(--zx-text-3)' }}>· {kpi.weight}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background:'var(--zx-surface-3)' }}>
                        <div className="h-full rounded-full transition-all"
                          style={{ width:`${isEditing ? draftKpis[idx].score : kpi.score}%`, background: color }} />
                      </div>
                    </div>
                  ))}
                </div>

                {isEditing && (
                  <div className="mt-3">
                    <label className="text-[11px] font-medium block mb-1" style={{ color:'var(--zx-text-3)' }}>Notas</label>
                    <textarea value={draftNotes} onChange={e => setDraftNotes(e.target.value)}
                      rows={2} placeholder="Observaciones opcionales..."
                      className="w-full px-2 py-1.5 rounded-lg text-xs outline-none resize-none"
                      style={{ background:'var(--zx-surface-2)', border:'1px solid var(--zx-border-2)', color:'var(--zx-text-2)' }} />
                  </div>
                )}

                {!isEditing && pr.notes && (
                  <div className="mt-3 p-2.5 rounded-lg" style={{ background:'var(--zx-surface-2)' }}>
                    <p className="text-[11px] leading-relaxed" style={{ color:'var(--zx-text-3)' }}>
                      <span className="font-semibold" style={{ color:'var(--zx-warning)' }}>Nota: </span>
                      {pr.notes}
                    </p>
                  </div>
                )}

                {!isEditing && (
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-1">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} size={12}
                          fill={s <= Math.round(pr.score/20) ? color : 'transparent'}
                          stroke={color} style={{ color }} />
                      ))}
                    </div>
                    <Badge variant={pr.score>=90?'success':pr.score>=80?'accent':pr.score>=70?'warning':'danger'}>
                      {pr.score>=90?'Excelente':pr.score>=80?'Muy bueno':pr.score>=70?'Satisfactorio':'Necesita mejora'}
                    </Badge>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* New evaluation modal */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="Nueva Evaluación" size="md">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-[11px] font-medium block mb-1" style={{ color:'var(--zx-text-3)' }}>Empleado *</label>
              <input value={newForm.employeeName} onChange={e => setNewForm(f => ({...f, employeeName: e.target.value}))}
                placeholder="Nombre completo"
                className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                style={{ background:'var(--zx-surface-2)', border:'1px solid var(--zx-border-2)', color:'var(--zx-text-1)' }} />
            </div>
            <div>
              <label className="text-[11px] font-medium block mb-1" style={{ color:'var(--zx-text-3)' }}>Departamento</label>
              <select value={newForm.department} onChange={e => setNewForm(f => ({...f, department: e.target.value}))}
                className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                style={{ background:'var(--zx-surface-2)', border:'1px solid var(--zx-border-2)', color:'var(--zx-text-1)' }}>
                {['RRHH','Tecnología','Finanzas','Legal','Ventas'].map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-medium block mb-1" style={{ color:'var(--zx-text-3)' }}>Período</label>
              <input value={newForm.period} onChange={e => setNewForm(f => ({...f, period: e.target.value}))}
                placeholder="Ej: Q2 2025"
                className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                style={{ background:'var(--zx-surface-2)', border:'1px solid var(--zx-border-2)', color:'var(--zx-text-1)' }} />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-medium block mb-2" style={{ color:'var(--zx-text-3)' }}>KPIs</label>
            <div className="space-y-2">
              {newForm.kpis.map((kpi, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input value={kpi.label} onChange={e => setNewForm(f => ({ ...f, kpis: f.kpis.map((k,j) => j===i ? {...k, label: e.target.value} : k) }))}
                    className="flex-1 px-2 py-1.5 rounded-lg text-xs outline-none"
                    style={{ background:'var(--zx-surface-2)', border:'1px solid var(--zx-border-2)', color:'var(--zx-text-1)' }} />
                  <input type="number" min={0} max={100} value={kpi.score}
                    onChange={e => setNewForm(f => ({ ...f, kpis: f.kpis.map((k,j) => j===i ? {...k, score: Number(e.target.value)} : k) }))}
                    className="w-16 px-2 py-1.5 rounded-lg text-xs outline-none text-center"
                    style={{ background:'var(--zx-surface-2)', border:'1px solid var(--zx-border-2)', color:'var(--zx-accent)' }} />
                  <span className="text-[10px]" style={{ color:'var(--zx-text-3)' }}>pts</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] font-medium block mb-1" style={{ color:'var(--zx-text-3)' }}>Notas (opcional)</label>
            <textarea value={newForm.notes} onChange={e => setNewForm(f => ({...f, notes: e.target.value}))}
              rows={2} className="w-full px-3 py-2 rounded-lg text-xs outline-none resize-none"
              style={{ background:'var(--zx-surface-2)', border:'1px solid var(--zx-border-2)', color:'var(--zx-text-2)' }} />
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="primary" className="flex-1 justify-center" onClick={submitNew}>
              Crear evaluación
            </Button>
            <Button variant="secondary" onClick={() => setShowNew(false)}>Cancelar</Button>
          </div>
        </div>
      </Modal>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
