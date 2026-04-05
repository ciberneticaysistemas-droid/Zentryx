import { absenceCases as mockAbsences, pqrCases as mockPqr } from './data';
import type {
  AbsenceCase, PQRCase, AbsenceVerdict, PQRType, PQRPriority,
  VacationRequest, VacationStatus, VacationType,
  TrainingRecord, TrainingCourse, TrainingStatus,
  AuditLog, AuditAction,
} from '@/types';

// ── Notification types ────────────────────────────────────────────────────────
export type NotifType = 'info' | 'success' | 'warning' | 'danger';

export interface Notification {
  id:        string;
  type:      NotifType;
  title:     string;
  body:      string;
  createdAt: string;
  read:      boolean;
}

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
  var __zx_absences:  AbsenceCase[]     | undefined;
  // eslint-disable-next-line no-var
  var __zx_pqr:       PQRCase[]         | undefined;
  // eslint-disable-next-line no-var
  var __zx_notifs:    Notification[]    | undefined;
  // eslint-disable-next-line no-var
  var __zx_vacations: VacationRequest[] | undefined;
  // eslint-disable-next-line no-var
  var __zx_training:  TrainingRecord[]  | undefined;
  // eslint-disable-next-line no-var
  var __zx_audit:     AuditLog[]        | undefined;
}

const absences:  AbsenceCase[]     = (globalThis.__zx_absences  ??= [...mockAbsences]);
const pqrs:      PQRCase[]         = (globalThis.__zx_pqr       ??= [...mockPqr]);
const notifs:    Notification[]    = (globalThis.__zx_notifs    ??= []);
const vacations: VacationRequest[] = (globalThis.__zx_vacations ??= []);
const trainings: TrainingRecord[]  = (globalThis.__zx_training  ??= []);
const auditLogs: AuditLog[]        = (globalThis.__zx_audit     ??= []);

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

// ── Notification store ────────────────────────────────────────────────────────

export const notificationStore = {
  getAll(): Notification[] {
    return [...notifs];
  },

  add(data: Omit<Notification, 'id' | 'createdAt' | 'read'>): Notification {
    const item: Notification = {
      id:        `N${Date.now()}`,
      type:      data.type,
      title:     toStr(data.title, 'Notificación'),
      body:      toStr(data.body,  ''),
      createdAt: new Date().toISOString(),
      read:      false,
    };
    notifs.unshift(item);
    // Keep only last 50 notifications
    if (notifs.length > 50) notifs.splice(50);
    return item;
  },

  markRead(id: string): void {
    const n = notifs.find(n => n.id === id);
    if (n) n.read = true;
  },

  markAllRead(): void {
    notifs.forEach(n => { n.read = true; });
  },

  unreadCount(): number {
    return notifs.filter(n => !n.read).length;
  },
};

// ── Vacation store ────────────────────────────────────────────────────────────

export const vacationStore = {
  getAll(): VacationRequest[] { return [...vacations]; },

  getByEmployee(employeeId: string): VacationRequest[] {
    return vacations.filter(v => v.employeeId === employeeId);
  },

  add(data: Omit<VacationRequest, 'id' | 'createdAt' | 'status'>): VacationRequest {
    const item: VacationRequest = {
      ...data,
      id:        `VAC${Date.now()}`,
      status:    'pending',
      createdAt: new Date().toISOString(),
    };
    vacations.unshift(item);
    return item;
  },

  update(id: string, patch: Partial<Pick<VacationRequest, 'status' | 'approvedBy' | 'approvedAt' | 'rejectedReason'>>): void {
    const idx = vacations.findIndex(v => v.id === id);
    if (idx !== -1) Object.assign(vacations[idx], patch);
  },
};

// ── Training store ────────────────────────────────────────────────────────────

export const trainingStore = {
  getAll(): TrainingRecord[] { return [...trainings]; },

  getByEmployee(employeeId: string): TrainingRecord[] {
    return trainings.filter(t => t.employeeId === employeeId);
  },

  add(data: Omit<TrainingRecord, 'id'>): TrainingRecord {
    const item: TrainingRecord = { ...data, id: `TRN${Date.now()}` };
    trainings.unshift(item);
    return item;
  },

  update(id: string, patch: Partial<Pick<TrainingRecord, 'status' | 'completedAt' | 'score' | 'certificate' | 'expiresAt'>>): void {
    const idx = trainings.findIndex(t => t.id === id);
    if (idx !== -1) Object.assign(trainings[idx], patch);
  },

  expiringSoon(): TrainingRecord[] {
    const threshold = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
    return trainings.filter(t => {
      if (!t.expiresAt) return false;
      const exp = new Date(t.expiresAt).getTime();
      return exp > Date.now() && exp <= threshold;
    });
  },
};

// ── Audit store ───────────────────────────────────────────────────────────────

export const auditStore = {
  getAll(): AuditLog[] { return [...auditLogs]; },

  log(data: Omit<AuditLog, 'id' | 'timestamp'>): void {
    const entry: AuditLog = {
      ...data,
      id:        `AUD${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
    };
    auditLogs.unshift(entry);
    if (auditLogs.length > 500) auditLogs.splice(500);
  },
};
