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
import { TrendingUp, Star, Edit3, Check, X, Plus, Target, MessageSquare, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';

// ── Sub-types ─────────────────────────────────────────────────────────────────

interface KeyResult { label: string; progress: number; }
interface OKR       { id: string; employeeId: string; objective: string; keyResults: KeyResult[]; period: string; }
interface Feedback360 { id: string; employeeId: string; author: string; role: string; body: string; rating: number; aiSummary?: string; }

// ── Mock OKRs ─────────────────────────────────────────────────────────────────

const initialOKRs: OKR[] = [
  {
    id: 'OKR001', employeeId: 'E001', period: 'Q2 2025',
    objective: 'Reducir la rotación de personal en un 20%',
    keyResults: [
      { label: 'Implementar programa de retención', progress: 80 },
      { label: 'Encuestas de clima laboral mensuales', progress: 60 },
      { label: 'Reducir tiempo de contratación a 15 días', progress: 45 },
    ],
  },
  {
    id: 'OKR002', employeeId: 'E002', period: 'Q2 2025',
    objective: 'Migrar arquitectura a microservicios',
    keyResults: [
      { label: 'Desacoplar módulo de autenticación', progress: 100 },
      { label: 'Dockerizar 5 servicios críticos', progress: 70 },
      { label: 'Documentar APIs en OpenAPI 3.0', progress: 40 },
    ],
  },
];

// ── ScoreRing ─────────────────────────────────────────────────────────────────

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

function okrAvg(okr: OKR): number {
  if (!okr.keyResults.length) return 0;
  return Math.round(okr.keyResults.reduce((s, kr) => s + kr.progress, 0) / okr.keyResults.length);
}

// ── Page ──────────────────────────────────────────────────────────────────────

type TabType = 'evaluaciones' | 'okrs' | 'feedback360';

export default function PerformancePage() {
  const [records, setRecords]       = useState<PerformanceRecord[]>(initialRecords);
  const [okrs, setOkrs]             = useState<OKR[]>(initialOKRs);
  const [feedbacks, setFeedbacks]   = useState<Feedback360[]>([]);
  const [activeTab, setActiveTab]   = useState<TabType>('evaluaciones');
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [draftKpis, setDraftKpis]   = useState<PerformanceRecord['kpis']>([]);
  const [draftNotes, setDraftNotes] = useState('');
  const [showNew, setShowNew]       = useState(false);
  const [showNewOkr, setShowNewOkr] = useState(false);
  const [showNewFb, setShowNewFb]   = useState(false);
  const [expandedOkr, setExpandedOkr] = useState<string | null>(null);
  const [generatingAi, setGeneratingAi] = useState<string | null>(null);
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

  // New OKR form
  const [okrForm, setOkrForm] = useState({
    employeeId: 'E001', objective: '', period: 'Q2 2025',
    keyResults: [{ label: '', progress: 0 }],
  });

  // New Feedback form
  const [fbForm, setFbForm] = useState({
    employeeId: 'E001', author: '', role: '', body: '', rating: 4,
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

  const submitOkr = () => {
    if (!okrForm.objective) { toast('error', 'Escribe el objetivo.'); return; }
    const newOkr: OKR = {
      id:         `OKR_${Date.now()}`,
      employeeId: okrForm.employeeId,
      objective:  okrForm.objective,
      period:     okrForm.period,
      keyResults: okrForm.keyResults.filter(kr => kr.label.trim()),
    };
    setOkrs(prev => [newOkr, ...prev]);
    setShowNewOkr(false);
    setOkrForm({ employeeId: 'E001', objective: '', period: 'Q2 2025', keyResults: [{ label: '', progress: 0 }] });
    toast('success', 'OKR creado correctamente.');
  };

  const submitFeedback = () => {
    if (!fbForm.author || !fbForm.body) { toast('error', 'Completa todos los campos.'); return; }
    const fb: Feedback360 = {
      id:         `FB_${Date.now()}`,
      employeeId: fbForm.employeeId,
      author:     fbForm.author,
      role:       fbForm.role,
      body:       fbForm.body,
      rating:     fbForm.rating,
    };
    setFeedbacks(prev => [fb, ...prev]);
    setShowNewFb(false);
    setFbForm({ employeeId: 'E001', author: '', role: '', body: '', rating: 4 });
    toast('success', 'Feedback 360° registrado.');
  };

  const generateAiSummary = (fbId: string) => {
    setGeneratingAi(fbId);
    // Simulate AI generation (2s)
    setTimeout(() => {
      setFeedbacks(prev => prev.map(f => f.id !== fbId ? f : {
        ...f,
        aiSummary: `Análisis IA: El colaborador demuestra fortalezas en colaboración y resolución de problemas. Se identifican oportunidades de mejora en comunicación asertiva y gestión del tiempo. El feedback recibido es consistente con las evaluaciones de desempeño y sugiere un perfil de alto potencial con plan de desarrollo estructurado.`,
      }));
      setGeneratingAi(null);
      toast('success', 'Resumen IA generado.');
    }, 2000);
  };

  const updateKrProgress = (okrId: string, krIdx: number, progress: number) => {
    setOkrs(prev => prev.map(o => o.id !== okrId ? o : {
      ...o,
      keyResults: o.keyResults.map((kr, i) => i === krIdx ? { ...kr, progress: Math.max(0, Math.min(100, progress)) } : kr),
    }));
  };

  const avg = Math.round(records.reduce((s,r)=>s+r.score,0)/records.length);

  const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
    { key: 'evaluaciones', label: 'Evaluaciones', icon: <TrendingUp size={13} /> },
    { key: 'okrs',         label: 'OKRs',         icon: <Target size={13} />     },
    { key: 'feedback360',  label: 'Feedback 360°', icon: <MessageSquare size={13} /> },
  ];

  return (
    <>
      <Header title="Desempeño" subtitle="Evaluaciones, OKRs y retroalimentación 360°" />

      <div className="flex-1 p-6 space-y-5 animate-fade-in-up">

        {/* Summary KPIs */}
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

        {/* Tab bar */}
        <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ background: 'var(--zx-surface)', border: '1px solid var(--zx-border)' }}>
          {tabs.map(t => (
            <button key={t.key}
              onClick={() => setActiveTab(t.key)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-medium transition-all"
              style={{
                background: activeTab === t.key ? 'var(--zx-accent-muted)' : 'transparent',
                color:      activeTab === t.key ? 'var(--zx-accent)' : 'var(--zx-text-3)',
              }}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* ── EVALUACIONES TAB ── */}
        {activeTab === 'evaluaciones' && (
          <>
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
                      <Avatar initials={String(pr.employeeName ?? '?').split(' ').map(n=>n[0]).join('').slice(0,2)} size="md" />
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
                            style={{ background:'var(--zx-success-muted)', color:'var(--zx-success)' }}>
                            <Check size={13} />
                          </button>
                          <button onClick={() => setEditingId(null)}
                            className="p-1.5 rounded-md"
                            style={{ background:'var(--zx-surface-2)', color:'var(--zx-text-3)' }}>
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
                                <input type="number" min={0} max={100}
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
          </>
        )}

        {/* ── OKRs TAB ── */}
        {activeTab === 'okrs' && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold" style={{ color:'var(--zx-text-1)' }}>Objetivos y Resultados Clave</h2>
              <Button variant="primary" size="sm" icon={<Plus size={13} />} onClick={() => setShowNewOkr(true)}>
                Nuevo OKR
              </Button>
            </div>

            <div className="space-y-4">
              {okrs.length === 0 ? (
                <div className="rounded-xl p-8 text-center" style={{ background: 'var(--zx-surface)', border: '1px solid var(--zx-border)' }}>
                  <Target size={24} className="mx-auto mb-2" style={{ color: 'var(--zx-text-3)' }} />
                  <p className="text-xs" style={{ color: 'var(--zx-text-3)' }}>No hay OKRs creados aún</p>
                </div>
              ) : okrs.map(okr => {
                const avg = okrAvg(okr);
                const isExpanded = expandedOkr === okr.id;
                const color = avg >= 75 ? 'var(--zx-success)' : avg >= 50 ? 'var(--zx-warning)' : 'var(--zx-danger)';
                const emp = records.find(r => r.employeeId === okr.employeeId);

                return (
                  <div key={okr.id} className="rounded-xl overflow-hidden"
                    style={{ background: 'var(--zx-surface)', border: '1px solid var(--zx-border)' }}>
                    <button
                      onClick={() => setExpandedOkr(isExpanded ? null : okr.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left">
                      <Avatar
                        initials={emp ? String(emp.employeeName).split(' ').map(n=>n[0]).join('').slice(0,2) : '?'}
                        size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate" style={{ color: 'var(--zx-text-1)' }}>
                          {okr.objective}
                        </p>
                        <p className="text-[10px]" style={{ color: 'var(--zx-text-3)' }}>
                          {emp?.employeeName ?? okr.employeeId} · {okr.period}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-bold tabular-nums" style={{ color }}>{avg}%</span>
                        <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--zx-surface-3)' }}>
                          <div className="h-full rounded-full" style={{ width: `${avg}%`, background: color }} />
                        </div>
                        {isExpanded ? <ChevronUp size={12} style={{ color: 'var(--zx-text-3)' }} /> : <ChevronDown size={12} style={{ color: 'var(--zx-text-3)' }} />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: 'var(--zx-border)' }}>
                        <p className="text-[10px] font-semibold uppercase tracking-widest mt-3" style={{ color: 'var(--zx-text-3)' }}>
                          Resultados clave
                        </p>
                        {okr.keyResults.map((kr, idx) => (
                          <div key={idx} className="space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span style={{ color: 'var(--zx-text-2)' }}>{kr.label}</span>
                              <div className="flex items-center gap-1">
                                <input
                                  type="number" min={0} max={100}
                                  value={kr.progress}
                                  onChange={e => updateKrProgress(okr.id, idx, Number(e.target.value))}
                                  className="w-12 px-1.5 py-0.5 rounded text-center tabular-nums outline-none text-xs"
                                  style={{ background: 'var(--zx-surface-2)', border: '1px solid var(--zx-border-2)', color: 'var(--zx-accent)' }}
                                />
                                <span style={{ color: 'var(--zx-text-3)' }}>%</span>
                              </div>
                            </div>
                            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--zx-surface-3)' }}>
                              <div className="h-full rounded-full transition-all"
                                style={{ width: `${kr.progress}%`, background: kr.progress >= 75 ? 'var(--zx-success)' : kr.progress >= 50 ? 'var(--zx-warning)' : 'var(--zx-danger)' }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ── FEEDBACK 360° TAB ── */}
        {activeTab === 'feedback360' && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold" style={{ color:'var(--zx-text-1)' }}>Retroalimentación 360°</h2>
              <Button variant="primary" size="sm" icon={<Plus size={13} />} onClick={() => setShowNewFb(true)}>
                Registrar feedback
              </Button>
            </div>

            {feedbacks.length === 0 ? (
              <div className="rounded-xl p-8 text-center" style={{ background: 'var(--zx-surface)', border: '1px solid var(--zx-border)' }}>
                <MessageSquare size={24} className="mx-auto mb-2" style={{ color: 'var(--zx-text-3)' }} />
                <p className="text-xs" style={{ color: 'var(--zx-text-3)' }}>No hay feedback registrado aún</p>
                <p className="text-[11px] mt-1" style={{ color: 'var(--zx-text-3)' }}>
                  Agrega retroalimentación de pares, líderes y colaboradores
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {feedbacks.map(fb => {
                  const emp = records.find(r => r.employeeId === fb.employeeId);
                  return (
                    <div key={fb.id} className="rounded-xl p-4 space-y-3"
                      style={{ background: 'var(--zx-surface)', border: '1px solid var(--zx-border)' }}>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div>
                          <p className="text-xs font-semibold" style={{ color: 'var(--zx-text-1)' }}>
                            Para: {emp?.employeeName ?? fb.employeeId}
                          </p>
                          <p className="text-[10px]" style={{ color: 'var(--zx-text-3)' }}>
                            De: {fb.author} · {fb.role}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {[1,2,3,4,5].map(s => (
                            <Star key={s} size={11}
                              fill={s <= fb.rating ? 'var(--zx-accent)' : 'transparent'}
                              stroke="var(--zx-accent)"
                              style={{ color: 'var(--zx-accent)' }} />
                          ))}
                        </div>
                      </div>
                      <p className="text-[11px] leading-relaxed" style={{ color: 'var(--zx-text-2)' }}>{fb.body}</p>

                      {fb.aiSummary ? (
                        <div className="p-3 rounded-lg" style={{ background: 'var(--zx-accent-muted)', border: '1px solid var(--zx-accent)' }}>
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <Sparkles size={11} style={{ color: 'var(--zx-accent)' }} />
                            <span className="text-[10px] font-semibold" style={{ color: 'var(--zx-accent)' }}>Análisis IA</span>
                          </div>
                          <p className="text-[11px] leading-relaxed" style={{ color: 'var(--zx-text-2)' }}>{fb.aiSummary}</p>
                        </div>
                      ) : (
                        <Button
                          variant="secondary" size="sm"
                          icon={<Sparkles size={11} />}
                          loading={generatingAi === fb.id}
                          onClick={() => generateAiSummary(fb.id)}>
                          {generatingAi === fb.id ? 'Analizando...' : 'Generar resumen IA'}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
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
            <Button variant="primary" className="flex-1 justify-center" onClick={submitNew}>Crear evaluación</Button>
            <Button variant="secondary" onClick={() => setShowNew(false)}>Cancelar</Button>
          </div>
        </div>
      </Modal>

      {/* New OKR modal */}
      <Modal open={showNewOkr} onClose={() => setShowNewOkr(false)} title="Nuevo OKR" size="md">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium block mb-1" style={{ color:'var(--zx-text-3)' }}>Empleado</label>
              <select value={okrForm.employeeId} onChange={e => setOkrForm(f => ({ ...f, employeeId: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                style={{ background:'var(--zx-surface-2)', border:'1px solid var(--zx-border-2)', color:'var(--zx-text-1)' }}>
                {records.map(r => <option key={r.employeeId} value={r.employeeId}>{r.employeeName}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-medium block mb-1" style={{ color:'var(--zx-text-3)' }}>Período</label>
              <input value={okrForm.period} onChange={e => setOkrForm(f => ({ ...f, period: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                style={{ background:'var(--zx-surface-2)', border:'1px solid var(--zx-border-2)', color:'var(--zx-text-1)' }} />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-medium block mb-1" style={{ color:'var(--zx-text-3)' }}>Objetivo *</label>
            <input value={okrForm.objective} onChange={e => setOkrForm(f => ({ ...f, objective: e.target.value }))}
              placeholder="¿Qué queremos lograr?"
              className="w-full px-3 py-2 rounded-lg text-xs outline-none"
              style={{ background:'var(--zx-surface-2)', border:'1px solid var(--zx-border-2)', color:'var(--zx-text-1)' }} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-medium" style={{ color:'var(--zx-text-3)' }}>Resultados clave</label>
              <button onClick={() => setOkrForm(f => ({ ...f, keyResults: [...f.keyResults, { label: '', progress: 0 }] }))}
                className="text-[10px] font-medium" style={{ color: 'var(--zx-accent)' }}>+ Agregar</button>
            </div>
            <div className="space-y-2">
              {okrForm.keyResults.map((kr, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input value={kr.label} onChange={e => setOkrForm(f => ({ ...f, keyResults: f.keyResults.map((k,j) => j===i ? {...k, label: e.target.value} : k) }))}
                    placeholder={`Resultado clave ${i+1}`}
                    className="flex-1 px-2 py-1.5 rounded-lg text-xs outline-none"
                    style={{ background:'var(--zx-surface-2)', border:'1px solid var(--zx-border-2)', color:'var(--zx-text-1)' }} />
                  <input type="number" min={0} max={100} value={kr.progress}
                    onChange={e => setOkrForm(f => ({ ...f, keyResults: f.keyResults.map((k,j) => j===i ? {...k, progress: Number(e.target.value)} : k) }))}
                    className="w-14 px-2 py-1.5 rounded-lg text-xs outline-none text-center"
                    style={{ background:'var(--zx-surface-2)', border:'1px solid var(--zx-border-2)', color:'var(--zx-accent)' }} />
                  <span className="text-[10px]" style={{ color:'var(--zx-text-3)' }}>%</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="primary" className="flex-1 justify-center" onClick={submitOkr}>Crear OKR</Button>
            <Button variant="secondary" onClick={() => setShowNewOkr(false)}>Cancelar</Button>
          </div>
        </div>
      </Modal>

      {/* New Feedback 360 modal */}
      <Modal open={showNewFb} onClose={() => setShowNewFb(false)} title="Registrar Feedback 360°" size="md">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium block mb-1" style={{ color:'var(--zx-text-3)' }}>Para (empleado)</label>
              <select value={fbForm.employeeId} onChange={e => setFbForm(f => ({ ...f, employeeId: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                style={{ background:'var(--zx-surface-2)', border:'1px solid var(--zx-border-2)', color:'var(--zx-text-1)' }}>
                {records.map(r => <option key={r.employeeId} value={r.employeeId}>{r.employeeName}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-medium block mb-1" style={{ color:'var(--zx-text-3)' }}>Evaluador *</label>
              <input value={fbForm.author} onChange={e => setFbForm(f => ({ ...f, author: e.target.value }))}
                placeholder="Nombre del evaluador"
                className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                style={{ background:'var(--zx-surface-2)', border:'1px solid var(--zx-border-2)', color:'var(--zx-text-1)' }} />
            </div>
            <div>
              <label className="text-[11px] font-medium block mb-1" style={{ color:'var(--zx-text-3)' }}>Rol del evaluador</label>
              <select value={fbForm.role} onChange={e => setFbForm(f => ({ ...f, role: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                style={{ background:'var(--zx-surface-2)', border:'1px solid var(--zx-border-2)', color:'var(--zx-text-1)' }}>
                {['Par', 'Líder', 'Colaborador', 'Cliente interno', 'Autoevaluación'].map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-medium block mb-1" style={{ color:'var(--zx-text-3)' }}>Calificación</label>
              <div className="flex items-center gap-1 mt-2">
                {[1,2,3,4,5].map(s => (
                  <button key={s} onClick={() => setFbForm(f => ({ ...f, rating: s }))}>
                    <Star size={18}
                      fill={s <= fbForm.rating ? 'var(--zx-accent)' : 'transparent'}
                      stroke="var(--zx-accent)"
                      style={{ color: 'var(--zx-accent)' }} />
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className="text-[11px] font-medium block mb-1" style={{ color:'var(--zx-text-3)' }}>Comentarios *</label>
            <textarea value={fbForm.body} onChange={e => setFbForm(f => ({ ...f, body: e.target.value }))}
              rows={3} placeholder="Describe fortalezas y áreas de mejora..."
              className="w-full px-3 py-2 rounded-lg text-xs outline-none resize-none"
              style={{ background:'var(--zx-surface-2)', border:'1px solid var(--zx-border-2)', color:'var(--zx-text-2)' }} />
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="primary" className="flex-1 justify-center" onClick={submitFeedback}>Guardar feedback</Button>
            <Button variant="secondary" onClick={() => setShowNewFb(false)}>Cancelar</Button>
          </div>
        </div>
      </Modal>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
