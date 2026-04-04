import { absenceCases as mockAbsences, pqrCases as mockPqr } from './data';
import type { AbsenceCase, PQRCase, AbsenceVerdict, PQRType, PQRPriority } from '@/types';

/**
 * n8n sometimes returns fields as enriched objects: { value, html, text }.
 * This helper safely coerces any value to a plain string.
 */
function toStr(v: unknown, fallback = ''): string {
  if (v === null || v === undefined) return fallback;
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  // n8n enriched object: prefer value > text > html
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>;
    const candidate = o.value ?? o.text ?? o.html;
    if (candidate !== undefined) return toStr(candidate, fallback);
    return fallback;
  }
  return fallback;
}

/** Safely coerce any n8n value to a number */
function toNum(v: unknown, fallback: number): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') { const n = parseFloat(v); return isNaN(n) ? fallback : n; }
  if (typeof v === 'object' && v !== null) {
    const o = v as Record<string, unknown>;
    return toNum(o.value ?? o.text, fallback);
  }
  return fallback;
}

// globalThis trick: keeps store alive across Next.js HMR reloads in dev
declare global {
  // eslint-disable-next-line no-var
  var __zx_absences: AbsenceCase[] | undefined;
  // eslint-disable-next-line no-var
  var __zx_pqr: PQRCase[] | undefined;
}

const absences: AbsenceCase[] = (globalThis.__zx_absences ??= [...mockAbsences]);
const pqrs: PQRCase[]         = (globalThis.__zx_pqr     ??= [...mockPqr]);

// ── Absence store ─────────────────────────────────────────────────────────────

export const absenceStore = {
  getAll(): AbsenceCase[] {
    return absences.map(a => ({
      ...a,
      employeeName: toStr(a.employeeName, 'Empleado'),
      employeeId:   toStr(a.employeeId,   'E_EXT'),
      date:         toStr(a.date,         ''),
      type:         toStr(a.type,         'Justificacion'),
      summary:      toStr(a.summary,      ''),
      fileName:     a.fileName ? toStr(a.fileName) : undefined,
      confidence:   toNum(a.confidence,   70),
    }));
  },

  add(data: Partial<AbsenceCase> & { employeeName: string }): AbsenceCase {
    const today   = new Date().toISOString().split('T')[0];
    const rawVerdict = toStr(data.verdict as unknown, '');
    const verdict = (['accepted', 'rejected', 'review', 'pending'] as const)
      .includes(rawVerdict as AbsenceVerdict)
      ? (rawVerdict as AbsenceVerdict)
      : 'review' as AbsenceVerdict;

    const item: AbsenceCase = {
      id:           `A${String(absences.length + 1).padStart(3, '0')}`,
      employeeId:   toStr(data.employeeId,   'E_EXT'),
      employeeName: toStr(data.employeeName, 'Empleado'),
      date:         toStr(data.date,         today),
      type:         toStr(data.type,         'Justificacion'),
      verdict,
      confidence:   toNum(data.confidence,   70),
      summary:      toStr(data.summary,      'Recibido por correo electronico.'),
      fileName:     data.fileName ? toStr(data.fileName) : undefined,
    };
    absences.unshift(item);
    return item;
  },
};

// ── PQR store ─────────────────────────────────────────────────────────────────

export const pqrStore = {
  getAll(): PQRCase[] {
    return pqrs.map(p => ({
      ...p,
      subject:      toStr(p.subject,      'Sin asunto'),
      description:  toStr(p.description,  ''),
      submittedBy:  toStr(p.submittedBy,  'Anonimo'),
      department:   toStr(p.department,   'RRHH'),
      createdAt:    toStr(p.createdAt,    ''),
      aiSuggestion: p.aiSuggestion ? toStr(p.aiSuggestion) : undefined,
    }));
  },

  add(data: Partial<PQRCase> & { subject: string; submittedBy: string }): PQRCase {
    const today    = new Date().toISOString().split('T')[0];
    const rawType  = toStr(data.type as unknown, '');
    const rawPrio  = toStr(data.priority as unknown, '');
    const pqrType  = (['pregunta', 'queja', 'reclamo'] as const)
      .includes(rawType as PQRType) ? (rawType as PQRType) : 'queja' as PQRType;
    const priority = (['low', 'medium', 'high'] as const)
      .includes(rawPrio as PQRPriority) ? (rawPrio as PQRPriority) : 'medium' as PQRPriority;

    const item: PQRCase = {
      id:           `PQR${String(pqrs.length + 1).padStart(3, '0')}`,
      type:         pqrType,
      subject:      toStr(data.subject,     'Sin asunto'),
      description:  toStr(data.description, ''),
      submittedBy:  toStr(data.submittedBy, 'Anonimo'),
      department:   toStr(data.department,  'RRHH'),
      status:       'open',
      priority,
      createdAt:    toStr(data.createdAt,   today),
      aiSuggestion: data.aiSuggestion ? toStr(data.aiSuggestion) : undefined,
    };
    pqrs.unshift(item);
    return item;
  },

  update(id: string, patch: Partial<Pick<PQRCase, 'status' | 'aiSuggestion' | 'priority'>>): void {
    const idx = pqrs.findIndex(p => p.id === id);
    if (idx !== -1) Object.assign(pqrs[idx], patch);
  },
};
