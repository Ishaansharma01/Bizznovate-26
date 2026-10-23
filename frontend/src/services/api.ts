/**
 * Central API Client for Shailja Yoga Frontend
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data: T | null;
  message: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'student' | 'faculty' | 'admin' | 'certificate_issuer';
  is_active: boolean;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Program {
  id: string;
  code: string;
  name: string;
  required_hours: number;
  daily_max_hours: number;
  backdating_window_hours: number;
  timezone: string;
  category_quotas: Record<string, number> | null;
  category_quotas_configured: boolean;
  pace_warning_shortfall_hours: number;
  is_active: boolean;
  created_at: string;
}

export interface Enrollment {
  id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  program_id: string;
  program_name: string;
  program_code: string;
  enrollment_date: string;
  target_graduation_date: string;
  status: string;
  is_public_name_visible: boolean;
  final_faculty_signoff: boolean;
  created_at: string;
}

export interface TrainingLog {
  id: string;
  enrollment_id: string;
  student_id: string;
  student_name: string;
  practice_date: string;
  category: 'asana_practice' | 'anatomy' | 'yoga_philosophy' | 'practical_teaching';
  duration_minutes: number;
  duration_hours: number;
  reflection_journal: string;
  session_start_time?: string;
  session_end_time?: string;
  status: 'pending' | 'approved' | 'rejected' | 'correction_requested';
  submitted_at: string;
  review_feedback?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
}

export interface JournalSummary {
  id: string;
  log_id: string;
  key_learning: string;
  practice_reflection: string;
  topics_for_review: string;
  source_journal_hash: string;
  is_stale: boolean;
  provider: string;
  generated_at: string;
  ai_label: string;
}

export interface ProgressData {
  enrollment_id: string;
  student_id: string;
  student_name: string;
  program_id: string;
  program_code: string;
  program_name: string;
  required_hours: number;
  approved_hours: number;
  pending_hours: number;
  rejected_hours: number;
  remaining_hours: number;
  completion_percentage: number;
  is_hours_requirement_met: boolean;
  final_faculty_signoff: boolean;
  category_totals: Record<string, number>;
  category_quotas_configured: boolean;
  category_eligibility_status: string;
  category_quota_details: Record<string, { required_hours: number | null; completed_hours: number; is_met: boolean }>;
}

export interface PaceAlert {
  id: string;
  enrollment_id: string;
  shortfall_hours: number;
  recommended_weekly_pace: number;
  status: string;
  is_resolved: boolean;
  notification_sent: boolean;
  created_at: string;
}

export interface PaceMetrics {
  enrollment_id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  program_id: string;
  program_name: string;
  required_hours: number;
  approved_hours: number;
  pending_hours: number;
  remaining_hours: number;
  start_date: string;
  target_graduation_date: string;
  days_elapsed: number;
  days_remaining: number;
  expected_progress_hours: number;
  shortfall_hours: number;
  shortfall_warning_threshold: number;
  required_weekly_pace: number | null;
  realistic_daily_catchup_pace: number | null;
  daily_cap_hours: number;
  is_feasible: boolean;
  pace_status: 'on_track' | 'behind' | 'critical_shortfall' | 'overdue' | 'completed';
  status_message: string;
  alert_created?: boolean;
  alert_id?: string | null;
  active_alerts?: PaceAlert[];
}

export interface DailyCapacity {
  practice_date: string;
  existing_minutes: number;
  existing_hours: number;
  daily_max_hours: number;
  remaining_minutes: number;
  remaining_hours: number;
}

export interface HealthData {
  status: string;
  database: string;
  app_name: string;
  version: string;
  timezone: string;
  timestamp: string;
}

const API_BASE = '/api/v1';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('shailja_yoga_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function fetchHealth(): Promise<ApiResponse<HealthData>> {
  const response = await fetch(`${API_BASE}/health`);
  return response.json();
}

export async function loginApi(email: string, password: string): Promise<ApiResponse<TokenResponse>> {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return response.json();
}

export async function getMeApi(): Promise<ApiResponse<User>> {
  const response = await fetch(`${API_BASE}/auth/me`, {
    headers: getAuthHeaders(),
  });
  return response.json();
}

export async function getProgramsApi(): Promise<ApiResponse<Program[]>> {
  const response = await fetch(`${API_BASE}/programs`, {
    headers: getAuthHeaders(),
  });
  return response.json();
}

export async function updateProgramQuotasApi(
  programId: string,
  quotas: Record<string, number> | null
): Promise<ApiResponse<Program>> {
  const response = await fetch(`${API_BASE}/programs/${programId}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ category_quotas: quotas }),
  });
  return response.json();
}

export async function getMyEnrollmentsApi(): Promise<ApiResponse<Enrollment[]>> {
  const response = await fetch(`${API_BASE}/enrollments/me`, {
    headers: getAuthHeaders(),
  });
  return response.json();
}

export async function getAllEnrollmentsApi(): Promise<ApiResponse<Enrollment[]>> {
  const response = await fetch(`${API_BASE}/enrollments`, {
    headers: getAuthHeaders(),
  });
  return response.json();
}

export async function createEnrollmentApi(data: {
  student_id: string;
  program_id: string;
  enrollment_date: string;
  target_graduation_date: string;
  is_public_name_visible?: boolean;
}): Promise<ApiResponse<Enrollment>> {
  const response = await fetch(`${API_BASE}/enrollments`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return response.json();
}

// Training Log APIs
export async function submitLogApi(data: {
  enrollment_id: string;
  practice_date: string;
  category: string;
  duration_minutes: number;
  reflection_journal: string;
}): Promise<ApiResponse<TrainingLog>> {
  const response = await fetch(`${API_BASE}/logs`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function getMyLogsApi(
  statusFilter?: string,
  categoryFilter?: string
): Promise<ApiResponse<TrainingLog[]>> {
  const params = new URLSearchParams();
  if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
  if (categoryFilter && categoryFilter !== 'all') params.append('category', categoryFilter);

  const queryStr = params.toString() ? `?${params.toString()}` : '';
  const response = await fetch(`${API_BASE}/logs/me${queryStr}`, {
    headers: getAuthHeaders(),
  });
  return response.json();
}

export async function getDailyCapacityApi(
  enrollmentId: string,
  practiceDate: string
): Promise<ApiResponse<DailyCapacity>> {
  const response = await fetch(
    `${API_BASE}/logs/daily-capacity?enrollment_id=${enrollmentId}&practice_date=${practiceDate}`,
    { headers: getAuthHeaders() }
  );
  return response.json();
}

// Faculty Review & Progress APIs
export async function getReviewQueueApi(
  statusFilter: string = 'pending',
  programId?: string,
  categoryFilter?: string
): Promise<ApiResponse<TrainingLog[]>> {
  const params = new URLSearchParams();
  params.append('status', statusFilter);
  if (programId) params.append('program_id', programId);
  if (categoryFilter && categoryFilter !== 'all') params.append('category', categoryFilter);

  const response = await fetch(`${API_BASE}/faculty/reviews?${params.toString()}`, {
    headers: getAuthHeaders(),
  });
  return response.json();
}

export async function reviewLogApi(
  logId: string,
  decision: 'approve' | 'reject' | 'request_correction',
  feedbackReason?: string
): Promise<ApiResponse<TrainingLog>> {
  const response = await fetch(`${API_BASE}/faculty/logs/${logId}/review`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ decision, feedback_reason: feedbackReason }),
  });
  return response.json();
}

export async function getMyProgressApi(): Promise<ApiResponse<ProgressData>> {
  const response = await fetch(`${API_BASE}/progress/me`, {
    headers: getAuthHeaders(),
  });
  return response.json();
}

export async function getEnrollmentProgressApi(enrollmentId: string): Promise<ApiResponse<ProgressData>> {
  const response = await fetch(`${API_BASE}/progress/enrollment/${enrollmentId}`, {
    headers: getAuthHeaders(),
  });
  return response.json();
}

export async function facultySignoffApi(enrollmentId: string): Promise<ApiResponse<any>> {
  const response = await fetch(`${API_BASE}/faculty/enrollments/${enrollmentId}/signoff`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  return response.json();
}

// Pace Monitor APIs
export async function getMyPaceApi(): Promise<ApiResponse<PaceMetrics>> {
  const response = await fetch(`${API_BASE}/alerts/me`, {
    headers: getAuthHeaders(),
  });
  return response.json();
}

export async function getEnrollmentPaceApi(enrollmentId: string): Promise<ApiResponse<PaceMetrics>> {
  const response = await fetch(`${API_BASE}/alerts/enrollment/${enrollmentId}`, {
    headers: getAuthHeaders(),
  });
  return response.json();
}

export async function evaluatePaceApi(enrollmentId: string): Promise<ApiResponse<PaceMetrics>> {
  const response = await fetch(`${API_BASE}/alerts/evaluate/${enrollmentId}`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  return response.json();
}

// NLP Practice Summary APIs
export async function getLogSummaryApi(logId: string): Promise<ApiResponse<JournalSummary>> {
  const response = await fetch(`${API_BASE}/summaries/logs/${logId}/summary`, {
    headers: getAuthHeaders(),
  });
  return response.json();
}

export async function generateLogSummaryApi(
  logId: string,
  forceRegenerate: boolean = false
): Promise<ApiResponse<JournalSummary>> {
  const query = forceRegenerate ? '?force_regenerate=true' : '';
  const response = await fetch(`${API_BASE}/summaries/logs/${logId}/summary${query}`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  return response.json();
}


// Certificate & Graduation Interfaces
export interface EligibilityCriteria {
  hours_completed: number;
  hours_required: number;
  hours_satisfied: boolean;
  category_quotas_satisfied: boolean;
  category_eligibility_status: string;
  category_breakdown: Record<string, any>;
  pending_logs_count: number;
  has_unresolved_logs: boolean;
  faculty_signoff_completed: boolean;
  student_is_active: boolean;
  has_active_certificate: boolean;
}

export interface CertificateEligibility {
  enrollment_id: string;
  student_id: string;
  student_name: string;
  program_id: string;
  program_name: string;
  is_eligible: boolean;
  reasons: string[];
  criteria: EligibilityCriteria;
  existing_certificate_id?: string | null;
}

export interface CertificateRecord {
  id: string;
  certificate_id: string;
  enrollment_id: string;
  student_id: string;
  student_name: string;
  program_id: string;
  program_name: string;
  completion_date: string;
  issue_date: string;
  status: 'issued' | 'revoked' | 'superseded';
  total_approved_hours: number;
  category_hours: Record<string, number>;
  signature_digest: string;
  revocation_reason?: string | null;
  revoked_at?: string | null;
  superseded_by_id?: string | null;
  verification_url: string;
  has_pdf: boolean;
}

// Certificate APIs
export async function getCertificateEligibilityApi(
  enrollmentId: string
): Promise<ApiResponse<CertificateEligibility>> {
  const response = await fetch(`${API_BASE}/certificates/eligibility/${enrollmentId}`, {
    headers: getAuthHeaders(),
  });
  return response.json();
}

export async function issueCertificateApi(
  enrollmentId: string,
  idempotencyKey?: string
): Promise<ApiResponse<CertificateRecord>> {
  const response = await fetch(`${API_BASE}/certificates/issue`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      enrollment_id: enrollmentId,
      idempotency_key: idempotencyKey,
    }),
  });
  return response.json();
}

export async function getCertificateDetailApi(
  certificateId: string
): Promise<ApiResponse<CertificateRecord>> {
  const response = await fetch(`${API_BASE}/certificates/${certificateId}`, {
    headers: getAuthHeaders(),
  });
  return response.json();
}

export async function getEnrollmentCertificatesApi(
  enrollmentId: string
): Promise<ApiResponse<CertificateRecord[]>> {
  const response = await fetch(`${API_BASE}/certificates/enrollment/${enrollmentId}`, {
    headers: getAuthHeaders(),
  });
  return response.json();
}

export async function revokeCertificateApi(
  certificateId: string,
  revocationReason: string
): Promise<ApiResponse<CertificateRecord>> {
  const response = await fetch(`${API_BASE}/certificates/${certificateId}/revoke`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ revocation_reason: revocationReason }),
  });
  return response.json();
}

export async function supersedeCertificateApi(
  certificateId: string,
  reason: string
): Promise<ApiResponse<CertificateRecord>> {
  const response = await fetch(`${API_BASE}/certificates/${certificateId}/supersede`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ reason }),
  });
  return response.json();
}

export async function downloadCertificatePdf(
  certificateId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const token = localStorage.getItem('shailja_yoga_token');
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`${API_BASE}/certificates/${certificateId}/download`, {
      headers,
    });
    if (!response.ok) {
      const errJson = await response.json().catch(() => null);
      return { success: false, error: errJson?.error?.message || errJson?.detail || 'Download failed' };
    }
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `ShailjaYoga_Certificate_${certificateId}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Download network error' };
  }
}
