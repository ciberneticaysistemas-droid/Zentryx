'use client';

import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/layout/Header';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import { ToastContainer, useToast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/utils';
import { analyzeAbsence, readFileAsText } from '@/lib/n8n';
import type { AbsenceCase } from '@/types';
import {
  CheckCircle2, XCircle, AlertCircle, Clock,
  Brain, Upload, FileText, Info,
} from 'lucide-react';

const verdictMap: Record<string, { label:string; variant:'success'|'danger'|'warning'|'default'; icon:React.ReactNode }> = {
  accepted: { label:'Aceptado',    variant:'success', icon:<CheckCircle2 size={14} /> },
  rejected: { label:'Rechazado',   variant:'danger',  icon:<XCircle size={14} /> },
  review:   { label:'En revision', variant:'warning', icon:<AlertCircle size={14} /> },
  pending:  { label:'Pendiente',   variant:'default', icon:<Clock size={14} /> },
};

const ABSENCE_TYPES = [
  'Incapacidad medica',
  'Cita medica',
  'Calamidad domestica',
  'Licencia de maternidad',
  'Licencia de paternidad',
  'Otro',
];

function ConfidenceBar({ value }: { value: number }) {
  const color = value >= 90 ? 'var(--zx-success)' : value >= 70 ? 'var(--zx-warning)' : 'var(--zx-danger)';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background:'var(--zx-surface-3)' }}>
        <div className="h-full rounded-full" style={{ width:`${value}%`, background: color }} />
      </div>
      <span className="text-[11px] tabular-nums font-medium w-8 text-right" style={{ color }}>{value}%</span>
    </div>
  );
}

async function fetchCases(): Promise<AbsenceCase[]> {
  const res = await fetch('/api/cases/absences');
  if (!res.ok) throw new Error('fetch error');
  return res.json();
}

async function persistCase(c: AbsenceCase): Promise<void> {
  await fetch('/api/cases/absences', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(c),
  });
}

export default function AbsencesPage() {
  const [cases, setCases]             = useState<AbsenceCase[]>([]);
  const [progress, setProgress]       = useState(0);
  const [stage, setStage]             = useState<'idle'|'uploading'|'analyzing'|'done'>('idle');
  const [pendingFile, setPendingFile]  = useState('');
  const [empName, setEmpName]         = useState('');
  const [absenceType, setAbsenceType] = useState(ABSENCE_TYPES[0]);
  const { toasts, toast, dismiss }    = useToast();

  const refresh = useCallback(() => {
    fetchCases().then(setCases).catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 60_000);
    return () => clearInterval(id);
  }, [refresh]);

  const handleFile = async (file: File) => {
    setPendingFile(file.name);
    setStage('uploading');
    setProgress(0);

    // Fase 1: lectura del archivo (progreso 0 → 35)
    const ticker = setInterval(() => {
      setProgress(p => (p < 35 ? p + 7 : p));
    }, 100);

    const docText = await readFileAsText(file);
    clearInterval(ticker);
    setProgress(35);

    // Fase 2: llamada al webhook (progreso 35 → 90 simulado)
    setStage('analyzing');
    const analysisTicker = setInterval(() => {
      setProgress(p => Math.min(p + Math.random() * 5 + 2, 90));
    }, 350);

    const today = new Date().toISOString().split('T')[0];

    try {
      const result = await analyzeAbsence({
        employeeName:        empName.trim() || 'Empleado nuevo',
        type:                absenceType,
        startDate:           today,
        endDate:             today,
        documentDescription: docText,
      });

      clearInterval(analysisTicker);
      setProgress(100);
      setStage('done');

      // Coerce all n8n fields to plain primitives (n8n sometimes returns enriched objects)
      const safeStr = (v: unknown, fb = '') =>
        typeof v === 'string' ? v
        : typeof v === 'object' && v !== null
          ? String((v as Record<string,unknown>).value ?? (v as Record<string,unknown>).text ?? fb)
          : fb;
      const safeNum = (v: unknown, fb: number): number =>
        typeof v === 'number' ? v
        : typeof v === 'string' ? (parseFloat(v) || fb)
        : typeof v === 'object' && v !== null
          ? safeNum((v as Record<string,unknown>).value, fb)
          : fb;

      const rawVerdict = safeStr(result.verdict);
      const verdict = (['accepted', 'rejected', 'review'] as const).includes(rawVerdict as 'accepted' | 'rejected' | 'review')
        ? rawVerdict as 'accepted' | 'rejected' | 'review'
        : 'review' as const;

      const newCase: AbsenceCase = {
        id:           `A${String(cases.length + 1).padStart(3, '0')}`,
        employeeId:   'E_NUEVO',
        employeeName: empName.trim() || 'Empleado nuevo',
        date:         today,
        type:         absenceType,
        verdict,
        confidence:   safeNum(result.confidence, 70),
        summary:      safeStr(result.summary, 'Analisis completado.'),
        fileName:     file.name,
      };

      await persistCase(newCase);
      refresh();
      toast('success', `Analisis completo — Veredicto: ${verdictMap[verdict].label}`);
      setTimeout(() => { setStage('idle'); setProgress(0); }, 2000);
    } catch (err) {
      clearInterval(analysisTicker);
      console.error('n8n absences error:', err);
      setStage('idle');
      setProgress(0);
      toast('error', 'Error al conectar con el servicio de IA. Verifica que el flujo n8n este activo.');
    }
  };

  const accepted = cases.filter(a => a.verdict === 'accepted').length;
  const rejected = cases.filter(a => a.verdict === 'rejected').length;
  const pending  = cases.filter(a => a.verdict === 'pending' || a.verdict === 'review').length;

  return (
    <>
      <Header title="Justificaciones de Ausencia" subtitle="Módulo de análisis IA · PDF / JPG" />

      <div className="flex-1 p-6 space-y-5 animate-fade-in-up">

        {/* Info banner — how IA works */}
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl"
          style={{ background:'var(--zx-info-muted)', border:'1px solid var(--zx-info)' }}>
          <Info size={15} style={{ color:'var(--zx-info)', flexShrink:0, marginTop:1 }} />
          <div>
            <p className="text-xs font-semibold" style={{ color:'var(--zx-info)' }}>¿Cómo funciona el análisis IA?</p>
            <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color:'var(--zx-text-2)' }}>
              Al cargar un documento (incapacidad médica, cita, calamidad), el modelo analiza:{' '}
              <strong style={{ color:'var(--zx-text-1)' }}>validez del emisor, coherencia de fechas, autenticidad del documento e integridad del sello médico.</strong>{' '}
              Emite un veredicto (<em>Aceptado / Rechazado / En revisión</em>) con un porcentaje de confianza
              y un resumen del razonamiento. En producción se conectaría a la API de IA configurada.
            </p>
          </div>
        </div>

        {/* Upload + summary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Upload zone */}
          <div className="rounded-xl p-4" style={{ background:'var(--zx-surface)', border:'1px solid var(--zx-border)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Brain size={14} style={{ color:'var(--zx-accent)' }} />
              <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color:'var(--zx-text-3)' }}>
                Analizar nuevo documento
              </h2>
            </div>

            {/* Datos del empleado — requeridos para el analisis IA */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <label className="text-[11px] font-medium block mb-1" style={{ color:'var(--zx-text-3)' }}>
                  Nombre del empleado
                </label>
                <input
                  value={empName}
                  onChange={e => setEmpName(e.target.value)}
                  placeholder="Ej: Maria Garcia"
                  disabled={stage !== 'idle'}
                  className="w-full px-2 py-1.5 rounded-lg text-xs outline-none"
                  style={{ background:'var(--zx-surface-2)', border:'1px solid var(--zx-border-2)', color:'var(--zx-text-1)' }}
                />
              </div>
              <div>
                <label className="text-[11px] font-medium block mb-1" style={{ color:'var(--zx-text-3)' }}>
                  Tipo de ausencia
                </label>
                <select
                  value={absenceType}
                  onChange={e => setAbsenceType(e.target.value)}
                  disabled={stage !== 'idle'}
                  className="w-full px-2 py-1.5 rounded-lg text-xs outline-none"
                  style={{ background:'var(--zx-surface-2)', border:'1px solid var(--zx-border-2)', color:'var(--zx-text-1)' }}>
                  {ABSENCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <label
              className="relative flex flex-col items-center justify-center gap-3 rounded-xl p-8 text-center transition-all duration-300 cursor-pointer"
              style={{
                background: stage === 'done' ? 'var(--zx-success-muted)' : 'var(--zx-surface-2)',
                border: `2px dashed ${stage === 'done' ? 'var(--zx-success)' : stage !== 'idle' ? 'var(--zx-accent)' : 'var(--zx-border-2)'}`,
              }}>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="sr-only"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
                disabled={stage !== 'idle'} />

              {stage === 'done' ? (
                <CheckCircle2 size={32} style={{ color:'var(--zx-success)' }} />
              ) : stage !== 'idle' ? (
                <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: `var(--zx-accent) transparent transparent transparent` }} />
              ) : (
                <div className="flex items-center justify-center w-12 h-12 rounded-full"
                  style={{ background:'var(--zx-surface-3)' }}>
                  <Upload size={20} style={{ color:'var(--zx-accent)' }} />
                </div>
              )}

              <div>
                <p className="text-sm font-medium" style={{ color:'var(--zx-text-1)' }}>
                  {stage === 'done'      ? 'Análisis completado' :
                   stage === 'analyzing' ? 'IA analizando el documento...' :
                   stage === 'uploading' ? 'Subiendo archivo...' :
                   'Arrastra o haz clic para cargar'}
                </p>
                {stage === 'idle' && (
                  <p className="text-xs mt-1" style={{ color:'var(--zx-text-3)' }}>
                    Incapacidades · Citas médicas · Calamidades — PDF, JPG, PNG
                  </p>
                )}
                {pendingFile && stage !== 'idle' && (
                  <div className="flex items-center gap-1.5 mt-2 justify-center">
                    <FileText size={12} style={{ color:'var(--zx-accent)' }} />
                    <span className="text-xs" style={{ color:'var(--zx-accent)' }}>{pendingFile}</span>
                  </div>
                )}
              </div>

              {(stage === 'uploading' || stage === 'analyzing') && (
                <div className="w-full max-w-xs">
                  <div className="flex justify-between text-[10px] mb-1" style={{ color:'var(--zx-text-3)' }}>
                    <span>{stage === 'uploading' ? 'Subiendo...' : 'Procesando con IA...'}</span>
                    <span className="animate-pulse-gold" style={{ color:'var(--zx-accent)' }}>{Math.round(progress)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background:'var(--zx-surface-3)' }}>
                    <div className="h-full rounded-full transition-all duration-300"
                      style={{
                        width:`${progress}%`,
                        background:'linear-gradient(90deg,var(--zx-accent),var(--zx-accent-hover))',
                        boxShadow:'0 0 8px var(--zx-accent-muted)',
                      }} />
                  </div>
                </div>
              )}
            </label>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 content-start">
            {[
              { label:'Aceptados', value:accepted, color:'var(--zx-success)', bg:'var(--zx-success-muted)' },
              { label:'Rechazados', value:rejected, color:'var(--zx-danger)',  bg:'var(--zx-danger-muted)' },
              { label:'En revisión', value:pending, color:'var(--zx-warning)', bg:'var(--zx-warning-muted)' },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-4 flex flex-col items-center text-center"
                style={{ background: s.bg, border:`1px solid ${s.color}30` }}>
                <p className="text-3xl font-bold tabular-nums" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[11px] mt-1" style={{ color: s.color, opacity:0.7 }}>{s.label}</p>
              </div>
            ))}
            <div className="col-span-3 rounded-xl p-4"
              style={{ background:'var(--zx-surface)', border:'1px solid var(--zx-border)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium" style={{ color:'var(--zx-text-3)' }}>Confianza promedio del modelo</p>
                  <p className="text-2xl font-bold mt-1 tabular-nums" style={{ color:'var(--zx-accent)' }}>
                    {Math.round(cases.reduce((s,a)=>s+a.confidence,0)/cases.length)}%
                  </p>
                </div>
                <div className="flex items-center justify-center w-10 h-10 rounded-full"
                  style={{ background:'var(--zx-accent-muted)' }}>
                  <Brain size={18} style={{ color:'var(--zx-accent)' }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cases */}
        <h2 className="text-sm font-semibold" style={{ color:'var(--zx-text-1)' }}>
          Casos analizados ({cases.length})
        </h2>

        <div className="space-y-3">
          {cases.map(ac => {
            const vm = verdictMap[ac.verdict];
            return (
              <div key={ac.id} className="rounded-xl p-4" style={{ background:'var(--zx-surface)', border:'1px solid var(--zx-border)' }}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <Avatar initials={String(ac.employeeName ?? '?').split(' ').map(n=>n[0]).join('').slice(0,2)} />
                    <div>
                      <p className="text-sm font-semibold" style={{ color:'var(--zx-text-1)' }}>{ac.employeeName}</p>
                      <p className="text-xs" style={{ color:'var(--zx-text-3)' }}>{ac.type} · {formatDate(ac.date)}</p>
                      {ac.fileName && (
                        <p className="text-[10px] mt-0.5 flex items-center gap-1" style={{ color:'var(--zx-text-3)' }}>
                          <FileText size={10} /> {ac.fileName}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge variant={vm.variant} dot>{vm.label}</Badge>
                </div>

                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span style={{ color:'var(--zx-text-3)' }}>Confianza del análisis</span>
                  </div>
                  <ConfidenceBar value={ac.confidence} />
                  <div className="mt-2 p-3 rounded-lg"
                    style={{ background:'var(--zx-surface-2)', border:'1px solid var(--zx-border)' }}>
                    <div className="flex items-start gap-2">
                      <span style={{ color:'var(--zx-accent)', flexShrink:0 }}>{vm.icon}</span>
                      <p className="text-xs leading-relaxed" style={{ color:'var(--zx-text-2)' }}>{ac.summary}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
