export interface AuditLogEntry {
  id: string;
  timestamp: string; // ISO 8601
  user?: {
    id?: string;
    username?: string;
    displayName?: string;
  } | null;
  action: string;
  resourceType?: string;
  resourceId?: string | number | null;
  details?: Record<string, unknown> | string;
}

export interface PagedAuditResponse {
  results: AuditLogEntry[];
  count?: number;
  next?: string | null;
  previous?: string | null;
}
