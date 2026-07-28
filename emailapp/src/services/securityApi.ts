/**
 * Security API Service
 * Handles all API calls to the backend security endpoints
 */

// Get API_BASE_URL from environment or use default
const API_BASE_URL = (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8000/api'
    : `${window.location.protocol}//${window.location.hostname}:${window.location.port || 443}/api`
);

const getAuthToken = (): string => {
  return localStorage.getItem('authToken') || '';
};

const defaultHeaders = {
  'Content-Type': 'application/json',
};

const getHeaders = () => ({
  ...defaultHeaders,
  Authorization: `Bearer ${getAuthToken()}`,
});

interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || error.error || `API error: ${response.status}`);
  }
  return response.json();
}

export const securityApi = {
  // Security Overview
  async getSecurityOverview() {
    const response = await fetch(`${API_BASE_URL}/dashboard/security/overview/`, {
      method: 'GET',
      headers: getHeaders(),
    });
    const data = await handleResponse<any>(response);
    return data;
  },

  // Compliance Status
  async getComplianceStatus(enterpriseId: string) {
    const response = await fetch(
      `${API_BASE_URL}/dashboard/security/compliance/?enterprise_id=${enterpriseId}`,
      {
        method: 'GET',
        headers: getHeaders(),
      }
    );
    const data = await handleResponse<any>(response);
    return data;
  },

  // Security Incidents
  async getSecurityIncidents(enterpriseId: string) {
    const response = await fetch(
      `${API_BASE_URL}/dashboard/security/incidents/?enterprise_id=${enterpriseId}`,
      {
        method: 'GET',
        headers: getHeaders(),
      }
    );
    const data = await handleResponse<any>(response);
    return data;
  },

  // Audit Schedule
  async getAuditSchedule(enterpriseId: string, days: number = 90) {
    const response = await fetch(
      `${API_BASE_URL}/dashboard/security/audits/?enterprise_id=${enterpriseId}&days=${days}`,
      {
        method: 'GET',
        headers: getHeaders(),
      }
    );
    const data = await handleResponse<any>(response);
    return data;
  },

  // Security Policies
  async getSecurityPolicies(enterpriseId: string) {
    const response = await fetch(
      `${API_BASE_URL}/security/policies/?enterprise=${enterpriseId}`,
      {
        method: 'GET',
        headers: getHeaders(),
      }
    );
    const data = await handleResponse<any>(response);
    return data;
  },

  // Security Controls
  async getSecurityControls(enterpriseId: string, frameworkId?: string) {
    let url = `${API_BASE_URL}/security/controls/?enterprise=${enterpriseId}`;
    if (frameworkId) {
      url += `&framework=${frameworkId}`;
    }
    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders(),
    });
    const data = await handleResponse<any>(response);
    return data;
  },

  // Security Audits
  async getSecurityAudits(enterpriseId: string, status?: string) {
    let url = `${API_BASE_URL}/security/audits/?enterprise=${enterpriseId}`;
    if (status) {
      url += `&status=${status}`;
    }
    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders(),
    });
    const data = await handleResponse<any>(response);
    return data;
  },

  // Create Incident
  async createIncident(enterpriseId: string, data: any) {
    const response = await fetch(`${API_BASE_URL}/security/incidents/`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        enterprise: enterpriseId,
        ...data,
      }),
    });
    return handleResponse<any>(response);
  },

  // Update Incident Status
  async updateIncidentStatus(incidentId: string, status: string) {
    const response = await fetch(
      `${API_BASE_URL}/security/incidents/${incidentId}/update_status/`,
      {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ status }),
      }
    );
    return handleResponse<any>(response);
  },

  // Get Compliance Trackers
  async getComplianceTrackers(enterpriseId: string, frameworkId?: string) {
    let url = `${API_BASE_URL}/security/compliance/?enterprise=${enterpriseId}`;
    if (frameworkId) {
      url += `&framework=${frameworkId}`;
    }
    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders(),
    });
    const data = await handleResponse<any>(response);
    return data;
  },

  // Mark Compliance as Completed
  async markComplianceCompleted(complianceId: string) {
    const response = await fetch(
      `${API_BASE_URL}/security/compliance/${complianceId}/mark_completed/`,
      {
        method: 'POST',
        headers: getHeaders(),
      }
    );
    return handleResponse<any>(response);
  },

  // Get Hardening Checklists
  async getHardeningChecklists(enterpriseId: string) {
    const response = await fetch(
      `${API_BASE_URL}/security/checklists/?enterprise=${enterpriseId}`,
      {
        method: 'GET',
        headers: getHeaders(),
      }
    );
    const data = await handleResponse<any>(response);
    return data;
  },

  // Get Security Frameworks
  async getSecurityFrameworks() {
    const response = await fetch(`${API_BASE_URL}/security/frameworks/`, {
      method: 'GET',
      headers: getHeaders(),
    });
    const data = await handleResponse<any>(response);
    return data;
  },
};
