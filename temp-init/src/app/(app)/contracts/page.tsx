'use client';

import { useState, useRef } from 'react';
import Header from '@/components/layout/Header';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import Modal from '@/components/ui/Modal';
import { ToastContainer, useToast } from '@/components/ui/Toast';
import { contracts as initialContracts } from '@/lib/data';
import { formatCOP, formatDate, daysUntil } from '@/lib/utils';
import type { Contract, ContractType, ContractStatus } from '@/types';
import { FilePlus, AlertTriangle, FileText, CheckCircle, Upload, Eye, X, Paperclip, ChevronDown, ChevronUp } from 'lucide-react';

const statusMap: Record<string, { label:string; variant:'success'|'warning'|'danger'|'default' }> = {
  active:          { label:'Vigente',    variant:'success' },
  'expiring-soon': { label:'Por vencer', variant:'warning' },
  expired:         { label:'Vencido',    variant:'danger' },
  draft:           { label:'Borrador',   variant:'default' },
};
const typeLabels: Record<string, string> = {
  indefinite:'Término Indefinido','fixed-term':'Término Fijo',
  apprenticeship:'Aprendizaje (SENA)',service:'Prestación de Servicios',
};
const CONTRACT_TYPES: [ContractType, string][] = [
  ['indefinite','Término Indefinido'],['fixed-term','Término Fijo'],
  ['apprenticeship','Aprendizaje (SENA)'],['service','Prestación de Servicios'],
];
const CLAUSES_OPTIONS = ['Confidencialidad','No competencia','Dedicación exclusiva','Propiedad intelectual',
  'Renovación automática sujeta a evaluación','Metas de ventas','Comisiones','SENA','Plan de aprendizaje'];

const DEPARTMENTS = ['RRHH','Tecnología','Finanzas','Legal','Ventas','Operaciones'];

export default function ContractsPage() {
  const [contracts, setContracts]     = useState(initialContracts);
  const [expandedId, setExpandedId]   = useState<string | null>(null);
  const [attachments, setAttachments] = useState<Record<string, string[]>>({});
  const [showNew, setShowNew]         = useState(false);
  const { toasts, toast, dismiss }    = useToast();
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // New contract form
  const [form, setForm] = useState({
    employeeName: '', department: 'RRHH', type: 'indefinite' as ContractType,
    salary: '', startDate: '', endDate: '', clauses: [] as string[],
  });

  const toggleExpand = (id: string) =>
    setExpandedId(prev => prev === id ? null : id);

  const handleAttach = (contractId: string, files: FileList | null) => {
    if (!files) return;
    const names = Array.from(files).map(f => f.name);
    setAttachments(prev => ({
      ...prev,
      [contractId]: [...(prev[contractId] ?? []), ...names],
    }));
    toast('success', `${names.length} archivo(s) adjunto(s) al contrato.`);
  };

  const removeAttachment = (contractId: string, name: string) => {
    setAttachments(prev => ({
      ...prev,
      [contractId]: (prev[contractId] ?? []).filter(n => n !== name),
    }));
  };

  const toggleClause = (clause: string) =>
    setForm(f => ({
      ...f,
      clauses: f.clauses.includes(clause) ? f.clauses.filter(c => c !== clause) : [...f.clauses, clause],
    }));

  const submitNew = () => {
    if (!form.employeeName || !form.salary || !form.startDate) {
      toast('error', 'Completa nombre, salario y fecha de inicio.');
      return;
    }
    const id = `C${String(contracts.length + 1).padStart(3,'0')}`;
    const needsEnd = form.type !== 'indefinite';
    const newContract: Contract = {
      id,
      employeeId: `E_NEW_${id}`,
      employeeName: form.employeeName,
      type: form.type,
      status: 'active' as ContractStatus,
      startDate: form.startDate,
      endDate: needsEnd ? form.endDate : undefined,
      salary: Number(form.salary),
      clauses: form.clauses.length ? form.clauses : ['Confidencialidad'],
      department: form.department,
    };
    setContracts(prev => [newContract, ...prev]);
    setShowNew(false);
    setForm({ employeeName:'', department:'RRHH', type:'indefinite', salary:'', startDate:'', endDate:'', clauses:[] });
    toast('success', `Contrato para ${form.employeeName} creado exitosamente.`);
  };

  const expiring = contracts.filter(c => c.status === 'expiring-soon');
  const active   = contracts.filter(c => c.status === 'active');

  return (
    <>
      <Header title="Contratos" subtitle="Gestión de contratos y cláusulas legales" />

      <div className="flex-1 p-6 space-y-4 animate-fade-in-up">

        {expiring.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{ background:'var(--zx-warning-muted)', border:'1px solid var(--zx-warning)' }}>
            <AlertTriangle size={16} style={{ color:'var(--zx-warning)', flexShrink:0 }} />
            <p className="text-sm" style={{ color:'var(--zx-warning)' }}>
              <span className="font-semibold">{expiring.length} contrato{expiring.length>1?'s':''} por vencer</span>
              {' '}— Revisión requerida para evitar incumplimientos legales.
            </p>
          </div>
        )}

        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label:'Contratos vigentes',  value:active.length,   icon:<CheckCircle size={16} />,   color:'var(--zx-success)' },
            { label:'Por vencer',          value:expiring.length, icon:<AlertTriangle size={16} />, color:'var(--zx-warning)' },
            { label:'Vencidos',            value:contracts.filter(c=>c.status==='expired').length,  icon:<FileText size={16} />, color:'var(--zx-danger)' },
            { label:'Total contratos',     value:contracts.length, icon:<FileText size={16} />,     color:'var(--zx-accent)' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-4" style={{ background:'var(--zx-surface)', border:'1px solid var(--zx-border)' }}>
              <span style={{ color: s.color }}>{s.icon}</span>
              <p className="text-2xl font-bold tabular-nums mt-1" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[11px] mt-0.5" style={{ color:'var(--zx-text-3)' }}>{s.label}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold" style={{ color:'var(--zx-text-1)' }}>Todos los contratos</h2>
          <Button variant="primary" size="sm" icon={<FilePlus size={13} />} onClick={() => setShowNew(true)}>
            Nuevo contrato
          </Button>
        </div>

        {/* Contracts list */}
        <div className="space-y-2">
          {contracts.map(c => {
            const sm   = statusMap[c.status];
            const days = c.endDate ? daysUntil(c.endDate) : null;
            const isOpen = expandedId === c.id;
            const files  = attachments[c.id] ?? [];

            return (
              <div key={c.id} className="rounded-xl overflow-hidden"
                style={{ background:'var(--zx-surface)', border:`1px solid ${isOpen ? 'var(--zx-border-2)' : 'var(--zx-border)'}` }}>

                {/* Summary row */}
                <button className="w-full flex items-center gap-4 px-4 py-3 text-left transition-colors"
                  style={{ background: isOpen ? 'var(--zx-surface-2)' : 'transparent' }}
                  onClick={() => toggleExpand(c.id)}>
                  <Avatar initials={c.employeeName.split(' ').map(n=>n[0]).join('').slice(0,2)} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color:'var(--zx-text-1)' }}>{c.employeeName}</p>
                    <p className="text-xs truncate" style={{ color:'var(--zx-text-3)' }}>
                      {c.department} · {typeLabels[c.type]}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {files.length > 0 && (
                      <span className="flex items-center gap-1 text-[10px]" style={{ color:'var(--zx-accent)' }}>
                        <Paperclip size={10} /> {files.length}
                      </span>
                    )}
                    {days !== null && days <= 90 && (
                      <span className="text-xs font-medium" style={{ color: days <= 30 ? 'var(--zx-danger)' : 'var(--zx-warning)' }}>
                        {days > 0 ? `${days} días` : 'Vencido'}
                      </span>
                    )}
                    <Badge variant={sm.variant} dot>{sm.label}</Badge>
                    {isOpen ? <ChevronUp size={14} style={{ color:'var(--zx-text-3)' }} /> : <ChevronDown size={14} style={{ color:'var(--zx-text-3)' }} />}
                  </div>
                </button>

                {/* Detail panel */}
                {isOpen && (
                  <div className="px-4 pb-4 space-y-4" style={{ borderTop:'1px solid var(--zx-border)' }}>
                    {/* Info grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 text-xs">
                      <div>
                        <p style={{ color:'var(--zx-text-3)' }}>ID Contrato</p>
                        <p className="font-mono font-medium mt-0.5" style={{ color:'var(--zx-accent)' }}>{c.id}</p>
                      </div>
                      <div>
                        <p style={{ color:'var(--zx-text-3)' }}>Tipo</p>
                        <p className="font-medium mt-0.5" style={{ color:'var(--zx-text-1)' }}>{typeLabels[c.type]}</p>
                      </div>
                      <div>
                        <p style={{ color:'var(--zx-text-3)' }}>Salario</p>
                        <p className="font-medium tabular-nums mt-0.5" style={{ color:'var(--zx-text-1)' }}>{formatCOP(c.salary)}</p>
                      </div>
                      <div>
                        <p style={{ color:'var(--zx-text-3)' }}>Estado</p>
                        <Badge variant={sm.variant} dot className="mt-1">{sm.label}</Badge>
                      </div>
                      <div>
                        <p style={{ color:'var(--zx-text-3)' }}>Fecha de inicio</p>
                        <p className="font-medium mt-0.5" style={{ color:'var(--zx-text-1)' }}>{formatDate(c.startDate)}</p>
                      </div>
                      {c.endDate && (
                        <div>
                          <p style={{ color:'var(--zx-text-3)' }}>Vencimiento</p>
                          <p className="font-medium mt-0.5" style={{ color: days !== null && days <= 30 ? 'var(--zx-danger)' : 'var(--zx-text-1)' }}>
                            {formatDate(c.endDate)}
                          </p>
                        </div>
                      )}
                      <div>
                        <p style={{ color:'var(--zx-text-3)' }}>Departamento</p>
                        <p className="font-medium mt-0.5" style={{ color:'var(--zx-text-1)' }}>{c.department}</p>
                      </div>
                    </div>

                    {/* Clauses */}
                    <div>
                      <p className="text-[11px] font-semibold mb-2" style={{ color:'var(--zx-text-3)' }}>Cláusulas incluidas</p>
                      <div className="flex flex-wrap gap-1.5">
                        {c.clauses.map(cl => (
                          <span key={cl} className="px-2 py-0.5 rounded-md text-[10px] font-medium"
                            style={{ background:'var(--zx-surface-3)', color:'var(--zx-text-2)', border:'1px solid var(--zx-border)' }}>
                            {cl}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* File attachments */}
                    <div>
                      <p className="text-[11px] font-semibold mb-2" style={{ color:'var(--zx-text-3)' }}>
                        Documentos adjuntos
                      </p>
                      {files.length === 0 ? (
                        <p className="text-[11px]" style={{ color:'var(--zx-text-3)' }}>No hay documentos adjuntos aún.</p>
                      ) : (
                        <div className="space-y-1.5 mb-2">
                          {files.map(name => (
                            <div key={name} className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
                              style={{ background:'var(--zx-surface-3)' }}>
                              <FileText size={12} style={{ color:'var(--zx-accent)' }} />
                              <span className="flex-1 text-xs truncate" style={{ color:'var(--zx-text-1)' }}>{name}</span>
                              <button onClick={() => removeAttachment(c.id, name)}>
                                <X size={11} style={{ color:'var(--zx-text-3)' }} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <input ref={el => { fileRefs.current[c.id] = el; }} type="file" multiple
                        className="sr-only" onChange={e => handleAttach(c.id, e.target.files)} />
                      <Button variant="secondary" size="sm" icon={<Upload size={12} />}
                        onClick={() => fileRefs.current[c.id]?.click()}>
                        Adjuntar archivo
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* New Contract Modal */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="Nuevo Contrato" size="lg">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-[11px] font-medium block mb-1" style={{ color:'var(--zx-text-3)' }}>Nombre del empleado *</label>
              <input value={form.employeeName} onChange={e => setForm(f => ({...f, employeeName: e.target.value}))}
                placeholder="Nombre completo"
                className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                style={{ background:'var(--zx-surface-2)', border:'1px solid var(--zx-border-2)', color:'var(--zx-text-1)' }} />
            </div>
            <div>
              <label className="text-[11px] font-medium block mb-1" style={{ color:'var(--zx-text-3)' }}>Tipo de contrato</label>
              <select value={form.type} onChange={e => setForm(f => ({...f, type: e.target.value as ContractType}))}
                className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                style={{ background:'var(--zx-surface-2)', border:'1px solid var(--zx-border-2)', color:'var(--zx-text-1)' }}>
                {CONTRACT_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-medium block mb-1" style={{ color:'var(--zx-text-3)' }}>Departamento</label>
              <select value={form.department} onChange={e => setForm(f => ({...f, department: e.target.value}))}
                className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                style={{ background:'var(--zx-surface-2)', border:'1px solid var(--zx-border-2)', color:'var(--zx-text-1)' }}>
                {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-medium block mb-1" style={{ color:'var(--zx-text-3)' }}>Salario mensual (COP) *</label>
              <input type="number" value={form.salary} onChange={e => setForm(f => ({...f, salary: e.target.value}))}
                placeholder="Ej: 5000000"
                className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                style={{ background:'var(--zx-surface-2)', border:'1px solid var(--zx-border-2)', color:'var(--zx-text-1)' }} />
            </div>
            <div>
              <label className="text-[11px] font-medium block mb-1" style={{ color:'var(--zx-text-3)' }}>Fecha inicio *</label>
              <input type="date" value={form.startDate} onChange={e => setForm(f => ({...f, startDate: e.target.value}))}
                className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                style={{ background:'var(--zx-surface-2)', border:'1px solid var(--zx-border-2)', color:'var(--zx-text-1)' }} />
            </div>
            {form.type !== 'indefinite' && (
              <div>
                <label className="text-[11px] font-medium block mb-1" style={{ color:'var(--zx-text-3)' }}>Fecha fin</label>
                <input type="date" value={form.endDate} onChange={e => setForm(f => ({...f, endDate: e.target.value}))}
                  className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                  style={{ background:'var(--zx-surface-2)', border:'1px solid var(--zx-border-2)', color:'var(--zx-text-1)' }} />
              </div>
            )}
          </div>

          <div>
            <label className="text-[11px] font-medium block mb-2" style={{ color:'var(--zx-text-3)' }}>Cláusulas</label>
            <div className="flex flex-wrap gap-1.5">
              {CLAUSES_OPTIONS.map(cl => {
                const selected = form.clauses.includes(cl);
                return (
                  <button key={cl} onClick={() => toggleClause(cl)}
                    className="px-2 py-1 rounded-md text-[10px] font-medium transition-colors"
                    style={{
                      background: selected ? 'var(--zx-accent-muted)' : 'var(--zx-surface-3)',
                      color:      selected ? 'var(--zx-accent)'        : 'var(--zx-text-2)',
                      border:     `1px solid ${selected ? 'var(--zx-accent)' : 'var(--zx-border)'}`,
                    }}>
                    {cl}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="primary" className="flex-1 justify-center" onClick={submitNew}>
              Crear contrato
            </Button>
            <Button variant="secondary" onClick={() => setShowNew(false)}>Cancelar</Button>
          </div>
        </div>
      </Modal>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
