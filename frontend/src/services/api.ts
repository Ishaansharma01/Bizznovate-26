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
