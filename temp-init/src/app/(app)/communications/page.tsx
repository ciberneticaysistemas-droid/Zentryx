'use client';

import { useState } from 'react';
import Header from '@/components/layout/Header';
import Button from '@/components/ui/Button';
import { ToastContainer, useToast } from '@/components/ui/Toast';
import { employees } from '@/lib/data';
import { Loader2, FileText, AlertTriangle, Brain, Download, Send, RefreshCw, CheckCircle, Mail } from 'lucide-react';
import { sendDocument } from '@/lib/n8n';

const DOC_TYPES = [
  { id:'resignation', label:'Aviso de Renuncia',       color:'var(--zx-info)',    bg:'var(--zx-info-muted)',    icon:<FileText size={20} /> },
  { id:'warning',     label:'Acta de Amonestación',    color:'var(--zx-warning)', bg:'var(--zx-warning-muted)', icon:<AlertTriangle size={20} /> },
  { id:'certificate', label:'Certificado Laboral',      color:'var(--zx-success)', bg:'var(--zx-success-muted)', icon:<FileText size={20} /> },
  { id:'memo',        label:'Memorando Interno',        color:'var(--zx-accent)',  bg:'var(--zx-accent-muted)',  icon:<Send size={20} /> },
];

function generateDoc(docType: string, empName: string, empRole: string, endDate: string, docDate: string, reason: string): string {
  const city = 'Bogotá D.C.';
  const dateStr = new Date(docDate).toLocaleDateString('es-CO', { day:'numeric', month:'long', year:'numeric' });

  if (docType === 'resignation') {
    return `AVISO DE RENUNCIA

${city}, ${dateStr}

Señores
ZENTRYX S.A.S.
Ciudad

Respetados señores:

Por medio de la presente, yo ${empName.toUpperCase()}, en mi calidad de ${empRole.toUpperCase()}, me permito comunicarles formalmente mi decisión de dar por terminado el contrato de trabajo de manera voluntaria, de conformidad con lo establecido en el Artículo 64 del Código Sustantivo del Trabajo.

Mi último día de labores será el ${new Date(endDate).toLocaleDateString('es-CO', { day:'numeric', month:'long', year:'numeric' })}, dando así cumplimiento al preaviso de treinta (30) días calendario.

${reason ? `Motivo: ${reason}\n\n` : ''}Expreso mi gratitud por la oportunidad brindada y me comprometo a realizar una transición ordenada de mis responsabilidades.

Atentamente,

_______________________________
${empName.toUpperCase()}
${empRole}`;
  }

  if (docType === 'warning') {
    return `ACTA DE AMONESTACIÓN ESCRITA

${city}, ${dateStr}

DATOS DEL COLABORADOR
Nombre:          ${empName}
Cargo:           ${empRole}
Fecha de la falta: ${dateStr}

DESCRIPCIÓN DE LA FALTA
${reason || 'Incumplimiento de las normas internas de la empresa conforme al Reglamento Interno de Trabajo.'}

FUNDAMENTO LEGAL
La presente amonestación se emite con fundamento en el Artículo 111 del Código Sustantivo del Trabajo y el Reglamento Interno de Trabajo de ZENTRYX S.A.S.

DISPOSICIÓN
Se hace un llamado formal al colaborador para que corrija el comportamiento descrito. Una reincidencia podrá dar lugar a una suspensión o terminación del contrato con justa causa.

Firma del trabajador: _______________________________
${empName}

Firma del representante RRHH: _______________________________
Dpto. Talento Humano — ZENTRYX S.A.S.`;
  }

  if (docType === 'certificate') {
    return `CERTIFICACIÓN LABORAL

${city}, ${dateStr}

A QUIEN CORRESPONDA:

ZENTRYX S.A.S., empresa legalmente constituida, CERTIFICA que:

El/La señor(a) ${empName.toUpperCase()} identificado(a) con cédula de ciudadanía, labora en esta empresa desde el 01 de enero de 2021 en el cargo de ${empRole.toUpperCase()}, en jornada laboral completa (lunes a viernes).

Su contrato es de naturaleza a término INDEFINIDO y devenga un salario básico mensual más todas las prestaciones sociales de ley establecidas en el Código Sustantivo del Trabajo.

${reason ? `Expedido para: ${reason}\n\n` : 'Expedido para los fines legales que el interesado considere pertinentes.\n\n'}La presente certificación tiene una vigencia de 30 días a partir de la fecha de expedición.

_______________________________
Valentina Ríos
Gerente de Talento Humano
ZENTRYX S.A.S.`;
  }

  // memo
  return `MEMORANDO INTERNO

${city}, ${dateStr}

PARA:    ${empName} — ${empRole}
DE:      Gerencia de Talento Humano
ASUNTO:  ${reason || 'Comunicado de carácter interno'}
FECHA:   ${dateStr}

Estimado(a) ${empName.split(' ')[0]},

Por medio del presente memorando, nos dirigimos a usted con el fin de informarle y/o recordarle los lineamientos institucionales pertinentes a su rol dentro de la organización.

${reason || 'Se le solicita atender lo indicado y confirmar recibido del presente comunicado a la brevedad posible.'}

Este memorando queda registrado en su expediente laboral como comunicación formal de la empresa.

Atentamente,

_______________________________
Valentina Ríos
Gerente de Talento Humano
ZENTRYX S.A.S.`;
}

export default function CommunicationsPage() {
  const [docType, setDocType]     = useState('resignation');
  const [empIdx, setEmpIdx]       = useState(0);
  const [docDate, setDocDate]     = useState('2025-04-01');
  const [endDate, setEndDate]     = useState('2025-04-30');
  const [reason, setReason]       = useState('');
  const [preview, setPreview]     = useState('');
  const [generated, setGenerated] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [sending, setSending]     = useState(false);
  const [emailTo, setEmailTo]     = useState(() => employees.filter(e => e.status !== 'inactive')[0]?.email ?? '');
  const { toasts, toast, dismiss } = useToast();

  const activeEmps = employees.filter(e => e.status !== 'inactive');
  const emp = activeEmps[empIdx];

  const generate = () => {
    setLoading(true);
    setTimeout(() => {
      const doc = generateDoc(docType, emp.name, emp.role, endDate, docDate, reason);
      setPreview(doc);
      setGenerated(true);
      setLoading(false);
      toast('success', 'Documento generado exitosamente.');
    }, 900);
  };

  const regenerate = () => {
    setLoading(true);
    setTimeout(() => {
      setPreview(generateDoc(docType, emp.name, emp.role, endDate, docDate, reason));
      setLoading(false);
      toast('info', 'Documento regenerado.');
    }, 600);
  };

  const downloadPDF = () => {
    if (!preview) { toast('error', 'Primero genera el documento.'); return; }
    const blob = new Blob([preview], { type: 'text/plain;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `${docType}_${emp.name.replace(/\s+/g,'_')}.txt`;
    a.click(); URL.revokeObjectURL(url);
    toast('success', 'Documento descargado.');
  };

  const sendByEmail = async () => {
    if (!preview) { toast('error', 'Primero genera el documento.'); return; }
    if (!emailTo.trim()) { toast('error', 'Ingresa un correo destinatario.'); return; }
    setSending(true);
    try {
      const docLabels: Record<string, string> = {
        resignation: 'Aviso de Renuncia',
        warning:     'Acta de Amonestacion',
        certificate: 'Certificado Laboral',
        memo:        'Memorando Interno',
      };
      await sendDocument({
        recipientEmail: emailTo.trim(),
        subject:        `${docLabels[docType] ?? 'Documento'} - ${emp.name}`,
        docContent:     preview,
      });
      toast('success', `Documento enviado a ${emailTo.trim()}`);
    } catch {
      toast('error', 'Error al enviar. Verifica que el flujo n8n este activo y Gmail configurado.');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Header title="Comunicaciones Internas" subtitle="Generación automatizada de documentos legales con IA" />

      <div className="flex-1 p-6 space-y-5 animate-fade-in-up">

        {/* Doc type selector */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {DOC_TYPES.map(dt => (
            <button key={dt.id} onClick={() => { setDocType(dt.id); setGenerated(false); }}
              className="rounded-xl p-4 text-left transition-all"
              style={{
                background: docType === dt.id ? dt.bg : 'var(--zx-surface)',
                border: `1px solid ${docType === dt.id ? dt.color : 'var(--zx-border)'}`,
              }}>
              <div className="flex items-center justify-center w-9 h-9 rounded-lg mb-3"
                style={{ background: dt.bg }}>
                <span style={{ color: dt.color }}>{dt.icon}</span>
              </div>
              <p className="text-xs font-semibold" style={{ color: docType === dt.id ? dt.color : 'var(--zx-text-1)' }}>
                {dt.label}
              </p>
              {docType === dt.id && (
                <span className="inline-flex items-center gap-1 mt-1 text-[10px]" style={{ color: dt.color }}>
                  <CheckCircle size={10} /> Seleccionado
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Form */}
          <div className="rounded-xl p-4 space-y-3" style={{ background:'var(--zx-surface)', border:'1px solid var(--zx-border)' }}>
            <div className="flex items-center gap-2">
              <Brain size={14} style={{ color:'var(--zx-accent)' }} />
              <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color:'var(--zx-text-3)' }}>
                Parámetros del documento
              </h2>
            </div>

            <div>
              <label className="text-[11px] font-medium block mb-1" style={{ color:'var(--zx-text-3)' }}>Tipo de documento</label>
              <select value={docType} onChange={e => { setDocType(e.target.value); setGenerated(false); }}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background:'var(--zx-surface-2)', border:'1px solid var(--zx-border-2)', color:'var(--zx-text-1)' }}>
                {DOC_TYPES.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-medium block mb-1" style={{ color:'var(--zx-text-3)' }}>Empleado</label>
              <select value={empIdx} onChange={e => { const i = Number(e.target.value); setEmpIdx(i); setEmailTo(activeEmps[i]?.email ?? ''); setGenerated(false); }}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background:'var(--zx-surface-2)', border:'1px solid var(--zx-border-2)', color:'var(--zx-text-1)' }}>
                {employees.filter(e => e.status !== 'inactive').map((e, i) => (
                  <option key={e.id} value={i}>{e.name} — {e.role}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-medium block mb-1" style={{ color:'var(--zx-text-3)' }}>
                Motivo / Contexto adicional
              </label>
              <textarea rows={3} value={reason} onChange={e => setReason(e.target.value)}
                placeholder={
                  docType === 'resignation' ? 'Motivo de la renuncia (opcional)...' :
                  docType === 'warning'     ? 'Describa la falta disciplinaria...' :
                  docType === 'certificate' ? 'Para qué entidad se expide (banco, visa, etc.)...' :
                  'Asunto o instrucción del memorando...'
                }
                className="w-full px-3 py-2 rounded-lg text-xs outline-none resize-none"
                style={{ background:'var(--zx-surface-2)', border:'1px solid var(--zx-border-2)', color:'var(--zx-text-2)' }} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-medium block mb-1" style={{ color:'var(--zx-text-3)' }}>Fecha del documento</label>
                <input type="date" value={docDate} onChange={e => setDocDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background:'var(--zx-surface-2)', border:'1px solid var(--zx-border-2)', color:'var(--zx-text-1)' }} />
              </div>
              {(docType === 'resignation') && (
                <div>
                  <label className="text-[11px] font-medium block mb-1" style={{ color:'var(--zx-text-3)' }}>Último día</label>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ background:'var(--zx-surface-2)', border:'1px solid var(--zx-border-2)', color:'var(--zx-text-1)' }} />
                </div>
              )}
            </div>

            <Button variant="primary" size="md" icon={loading ? undefined : <Brain size={14} />}
              loading={loading} onClick={generate} className="w-full justify-center">
              {generated ? 'Regenerar documento' : 'Generar con IA'}
            </Button>
          </div>

          {/* Preview */}
          <div className="rounded-xl p-4 flex flex-col" style={{ background:'var(--zx-surface)', border:'1px solid var(--zx-border)' }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color:'var(--zx-text-3)' }}>
                Vista previa
              </h2>
              {generated && (
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" icon={<RefreshCw size={12} />} onClick={regenerate}>
                    Regenerar
                  </Button>
                  <Button variant="secondary" size="sm" icon={<Download size={12} />} onClick={downloadPDF}>
                    Descargar
                  </Button>
                </div>
              )}
            </div>
            {generated && (
              <div className="flex items-center gap-2 mb-3">
                <Mail size={12} style={{ color:'var(--zx-accent)', flexShrink:0 }} />
                <input
                  value={emailTo}
                  onChange={e => setEmailTo(e.target.value)}
                  placeholder="Correo del destinatario"
                  className="flex-1 px-2 py-1.5 rounded-lg text-xs outline-none"
                  style={{ background:'var(--zx-surface-2)', border:'1px solid var(--zx-border-2)', color:'var(--zx-text-1)' }}
                />
                <Button variant="primary" size="sm" icon={sending ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                  loading={sending} onClick={sendByEmail}>
                  Enviar
                </Button>
              </div>
            )}
            <div className="flex-1 overflow-auto rounded-lg p-4 font-mono text-[11px] leading-relaxed whitespace-pre-line"
              style={{ background:'var(--zx-surface-2)', color: preview ? 'var(--zx-text-2)' : 'var(--zx-text-3)', minHeight:'320px' }}>
              {preview || (
                <div className="flex flex-col items-center justify-center h-full gap-3 py-12">
                  <Brain size={32} style={{ color:'var(--zx-text-3)', opacity:0.3 }} />
                  <p className="text-center text-[11px]" style={{ color:'var(--zx-text-3)' }}>
                    Completa los parámetros y haz clic en{' '}
                    <span style={{ color:'var(--zx-accent)' }}>"Generar con IA"</span>
                    {' '}para previsualizar el documento.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
