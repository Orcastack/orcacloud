// OrcaCloud – Monitoring & Incident Management Types

export type ServiceName =
  | 'api' | 'compute' | 'database' | 'storage' | 'networking'
  | 'containers' | 'email' | 'dns' | 'cdn' | 'monitoring';

export type ServiceStatus =
  | 'operational' | 'degraded' | 'partial_outage' | 'major_outage' | 'maintenance';

export type IncidentSeverity = 'sev1' | 'sev2' | 'sev3' | 'sev4';
export type IncidentStatus =
  | 'open' | 'investigating' | 'identified' | 'monitoring' | 'resolved' | 'postmortem';

export type AlertState   = 'firing' | 'resolved' | 'silenced';
export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertCondition = 'gt' | 'gte' | 'lt' | 'lte' | 'eq';

export type MetricName =
  | 'cpu_percent' | 'memory_percent'
  | 'disk_io_read' | 'disk_io_write'
  | 'network_in' | 'network_out'
  | 'latency_ms' | 'error_rate' | 'request_rate'
  | 'queue_length' | 'replication_lag' | 'pod_restarts'
  | 'storage_used_pct' | 'email_queue' | 'dns_query_rate';

// ── Service Health ────────────────────────────────────────────────────────────

export interface ServiceHealth {
  service:      ServiceName;
  status:       ServiceStatus;
  uptime_pct:   number;
  latency_ms:   number;
  error_rate:   number;
  note:         string;
  last_checked: string;
}

// ── Overview Stats ────────────────────────────────────────────────────────────

export interface MonitoringStats {
  services_total:       number;
  services_operational: number;
  services_degraded:    number;
  open_incidents:       number;
  firing_alerts:        number;
  active_alert_rules:   number;
  overall_uptime:       number;
}

export interface MonitoringOverview {
  stats:          MonitoringStats;
  service_health: ServiceHealth[];
}

// ── Metrics ───────────────────────────────────────────────────────────────────

export interface MetricPoint {
  timestamp: string;
  value:     number;
  unit:      string;
}

export interface MetricSeries {
  resource_id: string;
  metric:      MetricName;
  hours:       number;
  points:      MetricPoint[];
}

// ── Alert Rule ────────────────────────────────────────────────────────────────

export interface AlertRule {
  resource_id:        string;
  name:               string;
  description:        string;
  service:            ServiceName;
  resource_id_filter: string;
  metric:             MetricName;
  condition:          AlertCondition;
  threshold:          number;
  duration_mins:      number;
  severity:           AlertSeverity;
  notify_via:         string[];
  notify_target:      string;
  is_enabled:         boolean;
  last_fired_at:      string | null;
  created_at:         string;
  updated_at:         string;
}

export interface CreateAlertRulePayload {
  name:               string;
  description?:       string;
  service:            ServiceName;
  resource_id_filter?: string;
  metric:             MetricName;
  condition:          AlertCondition;
  threshold:          number;
  duration_mins?:     number;
  severity?:          AlertSeverity;
  notify_via?:        string[];
  notify_target?:     string;
}

// ── Alert (fired event) ───────────────────────────────────────────────────────

export interface Alert {
  id:          number;
  rule_name:   string;
  service:     ServiceName;
  metric:      MetricName;
  severity:    AlertSeverity;
  threshold:   number;
  state:       AlertState;
  value:       number;
  fired_at:    string;
  resolved_at: string | null;
  message:     string;
}

// ── Incident ──────────────────────────────────────────────────────────────────

export interface IncidentUpdate {
  id:          number;
  status:      IncidentStatus;
  message:     string;
  author_name: string;
  created_at:  string;
}

export interface Incident {
  resource_id:       string;
  title:             string;
  service:           ServiceName;
  severity:          IncidentSeverity;
  status:            IncidentStatus;
  summary:           string;
  impact:            string;
  resolution:        string;
  affected_resources: string[];
  assigned_to_name:  string | null;
  detected_at:       string;
  resolved_at:       string | null;
  duration_minutes:  number;
  created_at:        string;
  updated_at:        string;
  updates:           IncidentUpdate[];
}

export interface CreateIncidentPayload {
  name?:              string;
  title:              string;
  service:            ServiceName;
  severity:           IncidentSeverity;
  summary?:           string;
  impact?:            string;
  affected_resources?: string[];
}

// ── Logs ──────────────────────────────────────────────────────────────────────

export type LogLevel = 'INFO' | 'WARNING' | 'ERROR' | 'DEBUG' | 'CRITICAL';

export interface LogEntry {
  timestamp: string;
  service:   string;
  level:     LogLevel;
  message:   string;
  pod:       string;
  region:    string;
}

export interface LogStream {
  count: number;
  logs:  LogEntry[];
}
