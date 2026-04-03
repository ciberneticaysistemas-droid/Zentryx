const N8N_BASE = 'https://alejandromm.app.n8n.cloud/webhook';

// ── Tipos de respuesta ─────────────────────────────────────────────────────────

export interface N8NCandidateResult {
  name:       string;
  email:      string;
  score:      number;
  rank:       number;
  skills:     string[];
  experience: number;
  summary:    string;
}

export interface RecruitmentResponse {
  success:    boolean;
  candidates: N8NCandidateResult[];
}

export interface PQRResponse {
  success:          boolean;
  suggestion:       string;
  suggestedPriority: 'low' | 'medium' | 'high';
  estimatedDays:    number;
  category:         string;
}

export interface AbsenceResponse {
  success:    boolean;
  verdict:    'accepted' | 'rejected' | 'review';
  confidence: number;
  summary:    string;
}

// ── Utilidad de fetch ──────────────────────────────────────────────────────────

async function post<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${N8N_BASE}/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`n8n error ${res.status}`);
  }

  // Se usa text() + JSON.parse() para evitar problemas de codificacion
  // en algunos entornos donde el Content-Type del response omite el charset
  const raw = await res.text();
  return JSON.parse(raw) as T;
}

// ── Funciones publicas ─────────────────────────────────────────────────────────

export async function analyzeRecruitment(
  jobTitle:        string,
  jobDescription:  string,
  candidates:      { name: string; email: string; cvText: string }[],
): Promise<RecruitmentResponse> {
  return post<RecruitmentResponse>('zentryx/recruitment/analyze', {
    jobTitle,
    jobDescription,
    candidates,
  });
}

export async function analyzePQR(params: {
  subject:     string;
  description: string;
  submittedBy: string;
  department:  string;
  type:        string;
  priority:    string;
}): Promise<PQRResponse> {
  return post<PQRResponse>('zentryx/pqr/analyze', params);
}

export async function analyzeAbsence(params: {
  employeeName:        string;
  type:                string;
  startDate:           string;
  endDate:             string;
  documentDescription: string;
}): Promise<AbsenceResponse> {
  return post<AbsenceResponse>('zentryx/absences/analyze', params);
}

// ── Helper: leer archivo como texto ───────────────────────────────────────────
// Funciona bien con .txt; para PDF/DOC devuelve solo el nombre del archivo
// para que la IA al menos tenga contexto del tipo de documento cargado.

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const text = (e.target?.result as string) ?? '';
      // Ratio de caracteres imprimibles — PDFs binarios quedan en <0.6
      const printable = (text.match(/[\x20-\x7E\n\r\t\u00C0-\u024F]/g) ?? []).length;
      const ratio = text.length > 0 ? printable / text.length : 0;

      if (ratio >= 0.65) {
        resolve(text.slice(0, 4000));
      } else {
        resolve(`Archivo cargado: ${file.name}`);
      }
    };

    reader.onerror = () => resolve(`Archivo cargado: ${file.name}`);
    reader.readAsText(file, 'utf-8');
  });
}
