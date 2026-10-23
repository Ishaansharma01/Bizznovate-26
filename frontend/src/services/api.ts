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

export interface HealthData {
  status: string;
  database: string;
  app_name: string;
  version: string;
  timezone: string;
  timestamp: string;
}

const API_BASE = '/api/v1';

export async function fetchHealth(): Promise<ApiResponse<HealthData>> {
  const response = await fetch(`${API_BASE}/health`);
  if (!response.ok) {
    throw new Error(`Health check failed with status: ${response.status}`);
  }
  return response.json();
}
