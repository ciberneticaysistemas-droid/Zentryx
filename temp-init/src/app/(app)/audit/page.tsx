'use client';

import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/layout/Header';
import Button from '@/components/ui/Button';
import { ToastContainer, useToast } from '@/components/ui/Toast';
import type { AuditLog, AuditAction } from '@/types';
import { Shield, Download, RefreshCw, Filter } from 'lucide-react';

const actionColors: Record<AuditAction, string> = {
  create:  'var(--zx-success)',
  update:  'var(--zx-accent)',
  delete:  'var(--zx-danger)',
  login:   'var(--zx-info)',
  logout:  'var(--zx-text-3)',
  approve: 'var(--zx-success)',
  reject:  'var(--zx-danger)',
  export:  'var(--zx-warning)',
  view:    'var(--zx-text-3)',
};

const actionLabels: Record<AuditAction, string> = {
  create:  'CREAR',
  update:  'ACTUALIZAR',
  delete:  'ELIMINAR',
  login:   'LOGIN',
  logout:  'LOGOUT',
  approve: 'APROBAR',
  reject:  'RECHAZAR',
  export:  'EXPORTAR',
  view:    'VER',
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'ahora mismo';
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  return new Date(iso).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function AuditPage() {
  const [logs, setLogs]               = useState<AuditLog[]>([]);
  const [filterEntity, setFilterEnt]  = useState('all');
  const [filterAction, setFilterAct]  = useState<'all' | AuditAction>('all');
  const [loading, setLoading]         = useState(false);
  const { toasts, toast, dismiss }    = useToast();

  const fetchLogs = useCallback(() => {
    setLoading(true);
    fetch('/api/audit')
      .then(r => r.json())
      .then((data: AuditLog[]) => setLogs(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const entities = ['all', ...Array.from(new Set(logs.map(l => l.entity)))];

  const filtered = logs.filter(l => {
    if (filterEntity !== 'all' && l.entity !== filterEntity) return false;
    if (filterAction !== 'all' && l.action !== filterAction) return false;
    return true;
  });

  const exportCSV = () => {
    const bom = '\uFEFF';
    const header = ['ID', 'Timestamp', 'Usuario', 'Acción', 'Entidad', 'ID Entidad', 'Detalle'];
    const rows = logs.map(l => [l.id, l.timestamp, l.userName, l.action, l.entity, l.entityId, l.detail]);
    const csv = bom + [header, ...rows].map(r => r.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = 'audit_log.csv'; a.click(); URL.revokeObjectURL(url);
    toast('success', `${logs.length} registros de auditoría exportados.`);
  };

  return (
    <>
      <Header title="Auditoría" subtitle="Registro inmutable de todas las acciones del sistema" />

      <div className="flex-1 p-6 space-y-5 animate-fade-in-up">

        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total registros',  value: logs.length,                                          color: 'var(--zx-accent)'  },
            { label: 'Creaciones',       value: logs.filter(l => l.action === 'create').length,       color: 'var(--zx-success)' },
            { label: 'Eliminaciones',    value: logs.filter(l => l.action === 'delete').length,       color: 'var(--zx-danger)'  },
            { label: 'Aprobaciones',     value: logs.filter(l => l.action === 'approve' || l.action === 'reject').length, color: 'var(--zx-warning)' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-4" style={{ background: 'var(--zx-surface)', border: '1px solid var(--zx-border)' }}>
              <p className="text-2xl font-bold tabular-nums" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--zx-text-3)' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap justify-between">
          <div className="flex gap-2 flex-wrap">
            <div className="relative">
              <Filter size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--zx-text-3)' }} />
              <select value={filterEntity} onChange={e => setFilterEnt(e.target.value)}
                className="pl-7 pr-3 py-1.5 rounded-lg text-xs outline-none appearance-none"
                style={{ background: 'var(--zx-surface)', border: '1px solid var(--zx-border)', color: 'var(--zx-text-1)' }}>
                {entities.map(e => <option key={e} value={e}>{e === 'all' ? 'Todas las entidades' : e}</option>)}
              </select>
            </div>
            <select value={filterAction} onChange={e => setFilterAct(e.target.value as 'all' | AuditAction)}
              className="px-3 py-1.5 rounded-lg text-xs outline-none appearance-none"
              style={{ background: 'var(--zx-surface)', border: '1px solid var(--zx-border)', color: 'var(--zx-text-1)' }}>
              <option value="all">Todas las acciones</option>
              {(Object.keys(actionLabels) as AuditAction[]).map(a => (
                <option key={a} value={a}>{actionLabels[a]}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" icon={<RefreshCw size={12} className={loading ? 'animate-spin' : ''} />} onClick={fetchLogs}>
              Actualizar
            </Button>
            <Button variant="secondary" size="sm" icon={<Download size={13} />} onClick={exportCSV}>
              Exportar
            </Button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-xl p-10 text-center" style={{ background: 'var(--zx-surface)', border: '1px solid var(--zx-border)' }}>
            <Shield size={28} className="mx-auto mb-2" style={{ color: 'var(--zx-text-3)' }} />
            <p className="text-sm" style={{ color: 'var(--zx-text-3)' }}>No hay registros de auditoría aún</p>
            <p className="text-[11px] mt-1" style={{ color: 'var(--zx-text-3)' }}>
              Cada acción en el sistema quedará registrada aquí automáticamente.
            </p>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ background: 'var(--zx-surface)', border: '1px solid var(--zx-border)' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--zx-border)', background: 'var(--zx-surface-2)' }}>
                    {['Tiempo', 'Usuario', 'Acción', 'Entidad', 'Detalle'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-semibold uppercase tracking-wide"
                        style={{ color: 'var(--zx-text-3)', fontSize: '10px', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((log, i) => (
                    <tr key={log.id} className="zx-row"
                      style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--zx-border)' : 'none' }}>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="text-[11px]" style={{ color: 'var(--zx-text-3)' }}>{timeAgo(log.timestamp)}</p>
                        <p className="text-[9px]" style={{ color: 'var(--zx-text-3)', opacity: 0.6 }}>
                          {new Date(log.timestamp).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium" style={{ color: 'var(--zx-text-1)' }}>{log.userName}</p>
                        <p className="text-[10px]" style={{ color: 'var(--zx-text-3)' }}>{log.userId}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold"
                          style={{ background: `${actionColors[log.action]}20`, color: actionColors[log.action] }}>
                          {actionLabels[log.action]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium" style={{ color: 'var(--zx-text-2)' }}>{log.entity}</p>
                        <p className="text-[10px] font-mono" style={{ color: 'var(--zx-text-3)' }}>{log.entityId}</p>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <p className="text-[11px] truncate" style={{ color: 'var(--zx-text-2)' }} title={log.detail}>{log.detail}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
