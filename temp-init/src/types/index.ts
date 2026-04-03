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
