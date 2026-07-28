// Lightweight audit service with fetch wrapper and pagination support
import type { AuditLogEntry } from '../types/audit';

const ____API_BASE = process.env.REACT_APP_API_BASE || '';

export async function fetchAuditLogs(page = 1, pageSize = 50): Promise<AuditLogEntry[]> {
  const url = `${____API_BASE}/api/audit/logs?page=${page}&page_size=${pageSize}`;
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch audit logs: ${res.status} ${text}`);
  }
  const body = await res.json();
  // Support responses that return {results: [...]} or an array directly
  if (Array.isArray(body)) return body as AuditLogEntry[];
  if (Array.isArray(body.results)) return body.results as AuditLogEntry[];
  return [];
}

const __auditService = { fetchAuditLogs };

export default __auditService;
