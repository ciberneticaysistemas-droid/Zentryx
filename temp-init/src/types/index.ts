// ── Employee ──────────────────────────────────────────────────────────────────
export type EmployeeStatus = 'active' | 'inactive' | 'on-leave' | 'probation';
export type ContractType   = 'indefinite' | 'fixed-term' | 'apprenticeship' | 'service';

export interface Employee {
  id:           string;
  name:         string;
  avatar?:      string;
  initials:     string;
  role:         string;
  department:   string;
  location:     string;
  status:       EmployeeStatus;
  contractType: ContractType;
  startDate:    string;
  email:        string;
  phone:        string;
  salary:       number;
  manager?:     string;
}

// ── Contract ──────────────────────────────────────────────────────────────────
export type ContractStatus = 'active' | 'expiring-soon' | 'expired' | 'draft';

export interface Contract {
  id:          string;
  employeeId:  string;
  employeeName:string;
  type:        ContractType;
  status:      ContractStatus;
  startDate:   string;
  endDate?:    string;
  salary:      number;
  clauses:     string[];
  department:  string;
}

// ── AI Absence ────────────────────────────────────────────────────────────────
export type AbsenceVerdict = 'accepted' | 'rejected' | 'pending' | 'review';

export interface AbsenceCase {
  id:           string;
  employeeId:   string;
  employeeName: string;
  date:         string;
  type:         string;
  verdict:      AbsenceVerdict;
  confidence:   number;
  summary:      string;
  fileName?:    string;
}

// ── Recruitment ───────────────────────────────────────────────────────────────
export interface Candidate {
  id:         string;
  name:       string;
  email:      string;
  score:      number;
  skills:     string[];
  experience: number;
  summary:    string;
  fileName:   string;
  rank:       number;
}

export interface JobPosting {
  id:          string;
  title:       string;
  department:  string;
  candidates:  Candidate[];
  createdAt:   string;
}

// ── PQR ───────────────────────────────────────────────────────────────────────
export type PQRType     = 'pregunta' | 'queja' | 'reclamo';
export type PQRStatus   = 'open' | 'in-progress' | 'resolved' | 'closed';
export type PQRPriority = 'low' | 'medium' | 'high';

export interface PQRCase {
  id:              string;
  type:            PQRType;
  subject:         string;
  description:     string;
  submittedBy:     string;
  department:      string;
  status:          PQRStatus;
  priority:        PQRPriority;
  createdAt:       string;
  aiSuggestion?:   string;
}

// ── Payroll ───────────────────────────────────────────────────────────────────
export interface PayrollRecord {
  id:           string;
  employeeId:   string;
  employeeName: string;
  department:   string;
  period:       string;
  baseSalary:   number;
  eps:          number;
  pension:      number;
  arl:          number;
  ccf:          number;
  netPay:       number;
  status:       'paid' | 'pending' | 'processing';
}

// ── Schedule ──────────────────────────────────────────────────────────────────
export type ShiftType = 'morning' | 'afternoon' | 'night' | 'full' | 'remote' | 'off';

export interface Shift {
  employeeId: string;
  date:       string;
  type:       ShiftType;
  hours:      number;
}

// ── Performance ───────────────────────────────────────────────────────────────
export interface PerformanceRecord {
  employeeId:   string;
  employeeName: string;
  department:   string;
  period:       string;
  score:        number;
  kpis: {
    label: string;
    score: number;
    weight: number;
  }[];
  notes?: string;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export interface InsightMetric {
  label:   string;
  value:   number | string;
  change:  number;
  unit?:   string;
  trend:   'up' | 'down' | 'stable';
}

// ── Navigation ────────────────────────────────────────────────────────────────
export interface NavItem {
  label:    string;
  href:     string;
  icon:     string;
  badge?:   number;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

// ── Active Context ────────────────────────────────────────────────────────────
export interface ActiveContext {
  department: string;
  location:   string;
  user:       string;
  role:       string;
}

// ── Vacations ─────────────────────────────────────────────────────────────────
export type VacationStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type VacationType   = 'vacaciones' | 'permiso_remunerado' | 'permiso_no_remunerado' | 'licencia_luto' | 'otro';

export interface VacationRequest {
  id:           string;
  employeeId:   string;
  employeeName: string;
  department:   string;
  type:         VacationType;
  startDate:    string;
  endDate:      string;
  days:         number;
  reason:       string;
  status:       VacationStatus;
  createdAt:    string;
  approvedBy?:  string;
  approvedAt?:  string;
  rejectedReason?: string;
}

// ── Training ──────────────────────────────────────────────────────────────────
export type TrainingStatus = 'pending' | 'in_progress' | 'completed' | 'expired';

export interface TrainingCourse {
  id:           string;
  title:        string;
  provider:     string;
  category:     'sst' | 'tecnico' | 'liderazgo' | 'compliance' | 'otro';
  durationHours:number;
  mandatory:    boolean;
  targetRoles?: string[];
}

export interface TrainingRecord {
  id:           string;
  employeeId:   string;
  employeeName: string;
  department:   string;
  courseId:     string;
  courseTitle:  string;
  category:     TrainingCourse['category'];
  status:       TrainingStatus;
  startDate:    string;
  completedAt?: string;
  expiresAt?:   string;
  score?:       number;
  certificate?: string;
  mandatory:    boolean;
}

// ── Audit Log ─────────────────────────────────────────────────────────────────
export type AuditAction =
  | 'create' | 'update' | 'delete' | 'login' | 'logout'
  | 'approve' | 'reject' | 'export' | 'view';

export interface AuditLog {
  id:        string;
  userId:    string;
  userName:  string;
  action:    AuditAction;
  entity:    string;
  entityId:  string;
  detail:    string;
  timestamp: string;
}

// ── Payroll Extended ──────────────────────────────────────────────────────────
export interface PayrollExtended extends PayrollRecord {
  // Devengos adicionales
  transportAid:     number;   // auxilio de transporte
  overtimeHours:    number;   // horas extras diurnas
  overtimePay:      number;   // valor horas extras
  sundayPay:        number;   // dominicales/festivos
  bonus:            number;   // bonificaciones/comisiones
  // Deducciones adicionales
  sourceRetention:  number;   // retención en la fuente
  embargos:         number;   // embargos judiciales
  libranzas:        number;   // créditos libranza
  absenceDeduction: number;   // descuento ausencias rechazadas
  // Provisiones del empleador (no es deducción del empleado)
  employerEps:      number;   // EPS empleador 8.5%
  employerPension:  number;   // Pensión empleador 12%
  icbf:             number;   // ICBF 3%
  sena:             number;   // SENA 2%
  // Prestaciones sociales provisión
  cesantias:        number;   // 8.33%
  cesantiaInterest: number;   // 1% sobre cesantías
  prima:            number;   // 8.33%
  vacacionesProv:   number;   // 4.17%
  // Totales
  grossPay:         number;   // total devengado
  totalDeductions:  number;   // total deducciones empleado
  netPayAdjusted:   number;   // neto real después de todo
  totalEmployerCost:number;   // costo total para la empresa
}

// ── Contract extended with signature ─────────────────────────────────────────
export type SignatureStatus = 'unsigned' | 'sent' | 'signed' | 'rejected';

export interface ContractSignature {
  status:     SignatureStatus;
  sentAt?:    string;
  signedAt?:  string;
  signerEmail?:string;
}
