'use client';

import { useState, useRef } from 'react';
import Header from '@/components/layout/Header';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import { ToastContainer, useToast } from '@/components/ui/Toast';
import { jobPostings as initialPostings } from '@/lib/data';
import { analyzeRecruitment, readFileAsText } from '@/lib/n8n';
import type { JobPosting, Candidate } from '@/types';
import { Brain, Medal, Star, FileText, Plus, Upload, X, Info, Loader2 } from 'lucide-react';

type UploadedFile = { name: string; content: string };

function ScoreBar({ score }: { score: number }) {
  const color = score >= 90 ? 'var(--zx-success)' : score >= 80 ? 'var(--zx-accent)' : score >= 70 ? 'var(--zx-warning)' : 'var(--zx-danger)';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background:'var(--zx-surface-3)' }}>
        <div className="h-full rounded-full" style={{ width:`${score}%`, background: color }} />
      </div>
      <span className="text-xs font-bold tabular-nums w-7 text-right" style={{ color }}>{score}</span>
    </div>
  );
}

const rankColors  = ['var(--zx-accent)', 'var(--zx-text-2)', 'var(--zx-bronze)'];
const rankBg      = ['var(--zx-accent-muted)', 'var(--zx-surface-3)', 'var(--zx-surface-3)'];

export default function RecruitmentPage() {
  const [postings, setPostings]       = useState<JobPosting[]>(initialPostings);
  const [activeIdx, setActiveIdx]     = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [jobTitle, setJobTitle]       = useState(initialPostings[0].title);
  const [jobDesc, setJobDesc]         = useState('Buscamos un Desarrollador Full-Stack Senior con minimo 5 anos de experiencia en React, Node.js y bases de datos relacionales. Deseable experiencia en AWS y arquitecturas de microservicios.');
  const [analyzing, setAnalyzing]     = useState(false);
  const [progress, setProgress]       = useState(0);
  const [analyzed, setAnalyzed]       = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toasts, toast, dismiss }    = useToast();

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const loaded = await Promise.all(
      Array.from(files).map(async (f) => ({ name: f.name, content: await readFileAsText(f) }))
    );
    setUploadedFiles(prev => [...prev, ...loaded]);
    setAnalyzed(false);
    toast('info', `${loaded.length} CV(s) cargado(s). Haz clic en "Analizar con IA" para procesar.`);
  };

  const analyze = async () => {
    if (!jobTitle) { toast('error', 'Ingresa el titulo del cargo.'); return; }
    if (!uploadedFiles.length && !analyzed) { toast('error', 'Carga al menos un CV antes de analizar.'); return; }

    setAnalyzing(true);
    setProgress(0);

    // Progreso simulado mientras espera respuesta del webhook
    let p = 0;
    const ticker = setInterval(() => {
      p = Math.min(p + Math.random() * 6 + 2, 88);
      setProgress(p);
    }, 400);

    try {
      const candidates = uploadedFiles.map((f) => ({
        name:    f.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
        email:   '',
        cvText:  f.content,
      }));

      const result = await analyzeRecruitment(jobTitle, jobDesc, candidates);

      clearInterval(ticker);
      setProgress(100);

      const newCandidates: Candidate[] = (result.candidates ?? []).map((c, i) => ({
        id:         `CV_N8N_${Date.now()}_${i}`,
        name:       c.name        || `Candidato ${i + 1}`,
        email:      c.email       || '',
        score:      typeof c.score === 'number' ? c.score : 70,
        rank:       typeof c.rank  === 'number' ? c.rank  : i + 1,
        skills:     Array.isArray(c.skills) ? c.skills : [],
        experience: typeof c.experience === 'number' ? c.experience : 0,
        summary:    c.summary     || '',
        fileName:   uploadedFiles[i]?.name ?? `cv_candidato_${i + 1}.pdf`,
      }));

      if (!newCandidates.length) throw new Error('Sin candidatos en la respuesta');

      const newPosting: JobPosting = {
        id:         `J${String(postings.length + 1).padStart(3, '0')}`,
        title:      jobTitle,
        department: 'Tecnologia',
        candidates: newCandidates,
        createdAt:  new Date().toISOString().split('T')[0],
      };

      setPostings(prev => [newPosting, ...prev]);
      setActiveIdx(0);
      setAnalyzed(true);
      setUploadedFiles([]);
      toast('success', `Analisis completo con IA — ${newCandidates.length} candidatos rankeados para "${jobTitle}".`);
    } catch (err) {
      clearInterval(ticker);
      console.error('n8n recruitment error:', err);
      toast('error', 'Error al conectar con el servicio de IA. Verifica que los flujos esten activos.');
    } finally {
      setProgress(0);
      setAnalyzing(false);
    }
  };

  const activePosting = postings[activeIdx];

  return (
    <>
      <Header title="Reclutamiento IA" subtitle="Screening de CVs y selección de candidatos" />

      <div className="flex-1 p-6 space-y-5 animate-fade-in-up">

        {/* Info banner */}
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl"
          style={{ background:'var(--zx-info-muted)', border:'1px solid var(--zx-info)' }}>
          <Info size={15} style={{ color:'var(--zx-info)', flexShrink:0, marginTop:1 }} />
          <div>
            <p className="text-xs font-semibold" style={{ color:'var(--zx-info)' }}>¿Cómo funciona el CV Screening IA?</p>
            <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color:'var(--zx-text-2)' }}>
              Carga uno o varios CVs en PDF/Word, describe el perfil del cargo y haz clic en{' '}
              <strong style={{ color:'var(--zx-text-1)' }}>"Analizar con IA"</strong>. El modelo extrae habilidades,
              años de experiencia y logros de cada candidato, los compara contra los requisitos del cargo y entrega
              los <strong style={{ color:'var(--zx-text-1)' }}>3 mejores perfiles rankeados</strong> con resúmenes comparativos.
              En producción se conectaría a la API de IA configurada.
            </p>
          </div>
        </div>

        {/* Input section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Upload zone */}
          <div className="rounded-xl p-4 space-y-3" style={{ background:'var(--zx-surface)', border:'1px solid var(--zx-border)' }}>
            <div className="flex items-center gap-2">
              <Brain size={14} style={{ color:'var(--zx-accent)' }} />
              <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color:'var(--zx-text-3)' }}>
                Cargar hojas de vida
              </h2>
            </div>

            <label className="flex flex-col items-center gap-2 p-6 rounded-xl cursor-pointer transition-all"
              style={{ background:'var(--zx-surface-2)', border:'2px dashed var(--zx-border-2)' }}>
              <input ref={fileRef} type="file" multiple accept=".pdf,.doc,.docx" className="sr-only"
                onChange={e => handleFiles(e.target.files)} />
              <Upload size={24} style={{ color:'var(--zx-accent)' }} />
              <p className="text-xs font-medium text-center" style={{ color:'var(--zx-text-1)' }}>
                Arrastra múltiples CVs aquí o haz clic
              </p>
              <p className="text-[10px]" style={{ color:'var(--zx-text-3)' }}>PDF, DOC, DOCX — múltiples archivos permitidos</p>
            </label>

            {/* Uploaded files list */}
            {uploadedFiles.length > 0 && (
              <div className="space-y-1.5">
                {uploadedFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
                    style={{ background:'var(--zx-surface-3)' }}>
                    <FileText size={12} style={{ color:'var(--zx-accent)' }} />
                    <span className="flex-1 text-xs truncate" style={{ color:'var(--zx-text-1)' }}>{f.name}</span>
                    <button onClick={() => setUploadedFiles(prev => prev.filter((_,j) => j !== i))}>
                      <X size={11} style={{ color:'var(--zx-text-3)' }} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Job context */}
          <div className="rounded-xl p-4 space-y-3" style={{ background:'var(--zx-surface)', border:'1px solid var(--zx-border)' }}>
            <div className="flex items-center gap-2">
              <FileText size={14} style={{ color:'var(--zx-accent)' }} />
              <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color:'var(--zx-text-3)' }}>
                Perfil del cargo
              </h2>
            </div>
            <div>
              <label className="text-[11px] font-medium block mb-1" style={{ color:'var(--zx-text-3)' }}>Título del cargo</label>
              <input value={jobTitle} onChange={e => setJobTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background:'var(--zx-surface-2)', border:'1px solid var(--zx-border-2)', color:'var(--zx-text-1)' }} />
            </div>
            <div>
              <label className="text-[11px] font-medium block mb-1" style={{ color:'var(--zx-text-3)' }}>
                Requisitos para la IA (contexto de evaluación)
              </label>
              <textarea rows={5} value={jobDesc} onChange={e => setJobDesc(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-xs outline-none resize-none"
                style={{ background:'var(--zx-surface-2)', border:'1px solid var(--zx-border-2)', color:'var(--zx-text-2)' }} />
            </div>

            {/* Progress */}
            {analyzing && (
              <div>
                <div className="flex justify-between text-[10px] mb-1" style={{ color:'var(--zx-text-3)' }}>
                  <span>Analizando CVs con IA...</span>
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

            <Button variant="primary" size="md" icon={analyzing ? undefined : <Brain size={14} />}
              loading={analyzing} onClick={analyze} className="w-full justify-center">
              {analyzing ? 'Analizando candidatos...' : 'Analizar con IA'}
            </Button>
          </div>
        </div>

        {/* Postings selector */}
        {postings.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            {postings.map((p, i) => (
              <button key={p.id} onClick={() => setActiveIdx(i)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{
                  background: i === activeIdx ? 'var(--zx-accent-muted)' : 'var(--zx-surface)',
                  color:      i === activeIdx ? 'var(--zx-accent)'        : 'var(--zx-text-2)',
                  border:     `1px solid ${i === activeIdx ? 'var(--zx-accent)' : 'var(--zx-border)'}`,
                }}>
                {p.title}
              </button>
            ))}
          </div>
        )}

        {/* Results */}
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold" style={{ color:'var(--zx-text-1)' }}>
            Top 3 candidatos — {activePosting.title}
          </h2>
          <Badge variant="accent">IA Screening</Badge>
          <Button variant="secondary" size="sm" icon={<Plus size={13} />} className="ml-auto"
            onClick={() => { setJobTitle(''); setJobDesc(''); setUploadedFiles([]); setAnalyzed(false); toast('info', 'Completa el formulario y carga los CVs para una nueva convocatoria.'); }}>
            Nueva convocatoria
          </Button>
        </div>

        <div className="space-y-4">
          {activePosting.candidates.map((c, i) => (
            <div key={c.id} className="rounded-xl p-4 transition-all"
              style={{
                background: 'var(--zx-surface)',
                border: `1px solid ${i === 0 ? 'var(--zx-accent)' : 'var(--zx-border)'}`,
                boxShadow: i === 0 ? '0 0 20px var(--zx-accent-muted)' : 'none',
              }}>
              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full"
                    style={{ background: rankBg[i] }}>
                    <Medal size={18} style={{ color: rankColors[i] }} />
                  </div>
                  <span className="text-[10px] font-bold" style={{ color: rankColors[i] }}>#{c.rank}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Avatar initials={String(c.name ?? '?').split(' ').map(n=>n[0]).join('').slice(0,2)} />
                      <div>
                        <p className="text-sm font-semibold" style={{ color:'var(--zx-text-1)' }}>{c.name}</p>
                        <p className="text-xs" style={{ color:'var(--zx-text-3)' }}>
                          {c.email} · {c.experience} años exp.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {i === 0 && <Badge variant="accent" dot>Recomendado</Badge>}
                      <div className="flex items-center gap-1">
                        <Star size={12} fill="currentColor" style={{ color:'var(--zx-accent)' }} />
                        <span className="text-xs font-bold tabular-nums" style={{ color:'var(--zx-accent)' }}>{c.score}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3">
                    <p className="text-[11px] mb-1" style={{ color:'var(--zx-text-3)' }}>Compatibilidad con el perfil</p>
                    <ScoreBar score={c.score} />
                  </div>

                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {c.skills.map(s => (
                      <span key={s} className="px-2 py-0.5 rounded text-[10px] font-medium"
                        style={{ background:'var(--zx-surface-3)', color:'var(--zx-text-2)', border:'1px solid var(--zx-border)' }}>
                        {s}
                      </span>
                    ))}
                  </div>

                  <div className="mt-3 p-3 rounded-lg" style={{ background:'var(--zx-surface-2)' }}>
                    <div className="flex items-start gap-2">
                      <Brain size={12} className="mt-0.5 shrink-0" style={{ color:'var(--zx-accent)' }} />
                      <p className="text-xs leading-relaxed" style={{ color:'var(--zx-text-2)' }}>{c.summary}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
