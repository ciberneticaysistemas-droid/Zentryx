// All n8n calls go through internal API proxy routes (/api/n8n/...)
// to avoid CORS issues when calling n8n.cloud from the browser.
// The proxy routes forward requests server-side (Node.js has no CORS restrictions).

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
  success:           boolean;
  suggestion:        string;
  suggestedPriority: 'low' | 'medium' | 'high';
  estimatedDays:     number;
  category:          string;
}

export interface AbsenceResponse {
  success:    boolean;
  verdict:    'accepted' | 'rejected' | 'review';
  confidence: number;
  summary:    string;
}

export interface SendDocumentResponse {
  success: boolean;
  message: string;
}

// ── Utilidad de fetch (a través del proxy interno) ─────────────────────────────

async function post<T>(proxyPath: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(proxyPath, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((errData as { error?: string })?.error ?? `Error ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// ── Funciones publicas ─────────────────────────────────────────────────────────

export async function analyzeRecruitment(
  jobTitle:       string,
  jobDescription: string,
  candidates:     { name: string; email: string; cvText: string }[],
): Promise<RecruitmentResponse> {
  return post<RecruitmentResponse>('/api/n8n/recruitment', {
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
  return post<PQRResponse>('/api/n8n/pqr', params);
}

export async function analyzeAbsence(params: {
  employeeName:        string;
  type:                string;
  startDate:           string;
  endDate:             string;
  documentDescription: string;
}): Promise<AbsenceResponse> {
  return post<AbsenceResponse>('/api/n8n/absences', params);
}

export async function sendDocument(params: {
  recipientEmail: string;
  subject:        string;
  docContent:     string;
}): Promise<SendDocumentResponse> {
  return post<SendDocumentResponse>('/api/n8n/communications', params);
}

// ── Helper: leer archivo como texto ───────────────────────────────────────────
// Works well with .txt; for PDF/DOC returns just the filename as context.

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const text = (e.target?.result as string) ?? '';
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
