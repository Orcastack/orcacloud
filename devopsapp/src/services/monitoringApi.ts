/**
 * Monitoring Hub API Service
 * ──────────────────────────
 * Wraps all /api/services/monitoring/* and developer-facing monitoring endpoints.
 */

import client from './apiClient';

const BASE = '/api/services';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DevOverview {
  pipelines: {
    total: number;
    running: number;
    failed_24h: number;
    runs_24h: number;
    success_rate: number;
  };
  deployments: {
    total_24h: number;
    failed_24h: number;
    success_24h: number;
    success_rate: number;
  };
  services: {
    total: number;
    healthy: number;
    degraded: number;
    down: number;
  };
  alerts: {
    active: number;
    critical: number;
  };
  incidents: {
    open: number;
    total_rules: number;
  };
}

export interface PipelineHealth {
  project_id: string;
  project_name: string;
  total_runs: number;
  success: number;
  failed: number;
  running: number;
  cancelled: number;
  success_rate: number;
  recent_runs: {
    id: string;
    pipeline_name: string;
    branch: string;
    status: string;
    triggered_by: string;
    started_at: string;
    finished_at: string | null;
  }[];
}

export interface DeploymentHealth {
  container_id: string;
  container_name: string;
  image: string;
  total_deploys: number;
  success: number;
  failed: number;
  running: number;
  success_rate: number;
  recent_deploys: {
    id: string;
    image_tag: string;
    trigger: string;
    status: string;
    started_at: string;
    ended_at: string | null;
  }[];
}

export interface ProjectHealth {
  project_id: string;
  project_name: string;
  health_score: number;
  health_status: 'healthy' | 'degraded' | 'critical';
  pipelines_7d: number;
  pipeline_success: number;
  pipeline_failed: number;
  deploys_7d: number;
  deploy_success: number;
  deploy_failed: number;
}

export interface ActivityEvent {
  id: string | number;
  event_type: string;
  actor: string;
  project_id: string;
  project_name: string;
  resource_type: string;
  resource_id: string;
  resource_name: string;
  environment: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  created_at: string;
}

export interface ServiceHealth {
  resource_id: string;
  name: string;
  status: 'operational' | 'degraded' | 'partial_outage' | 'major_outage' | 'maintenance';
  uptime_percent: number;
  latency_ms: number;
  error_rate: number;
  region: string;
  last_checked: string;
}

export interface MonitoringAlert {
  id: number;
  resource_id: string;
  rule_name: string;
  resource_name: string;
  metric_type: string;
  value: number;
  threshold: number;
  severity: string;
  status: string;
  fired_at: string;
  message: string;
}

export interface Incident {
  id: number;
  resource_id: string;
  service: string;
  severity: string;
  status: string;
  title: string;
  summary: string;
  detected_at: string;
  resolved_at: string | null;
  duration_minutes: number;
  impact: string;
}

export interface AlertRule {
  id: number;
  resource_id: string;
  name: string;
  resource_name: string;
  metric_type: string;
  condition: string;
  threshold: number;
  window_minutes: number;
  severity: string;
  enabled: boolean;
  cooldown_minutes: number;
  description: string;
}

// ─── New integration types ─────────────────────────────────────────────────

export interface ContainerHealth {
  id: string | number;
  name: string;
  image: string;
  status: string;
  health: 'green' | 'yellow' | 'red';
  cpu_vcpus: number;
  memory_mib: number;
  replicas: number;
  cpu_sim: number;
  memory_sim: number;
  restarts_1h: number;
  last_deploy: string | null;
  last_deploy_status: string | null;
}

export interface KubernetesHealth {
  config_id: string | number;
  project_id: string;
  environment: string;
  cluster_endpoint: string;
  namespace: string;
  health: 'green' | 'yellow' | 'red';
  total_syncs_24h: number;
  failed_syncs_24h: number;
  last_sync_status: string | null;
  last_sync_at: string | null;
  pods_running: number;
  pods_failed: number;
  pods_pending: number;
  node_cpu_pct: number;
  node_memory_pct: number;
}

export interface ResourceHealthItem {
  type: string;
  id: string;
  name: string;
  status: string;
  health: 'green' | 'yellow' | 'red';
  detail: string;
  created_at: string | null;
}

export interface ResourceHealthSummary {
  summary: { total: number; healthy: number; degraded: number; critical: number };
  resources: ResourceHealthItem[];
}

export interface MetricPoint {
  timestamp: string;
  value: number;
  unit: string;
}

export interface LogLine {
  timestamp: string;
  service: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  message: string;
  pod: string;
  region: string;
}

export interface WebhookHealth {
  id: string | number;
  endpoint: string;
  project_name: string;
  events: string[];
  total_24h: number;
  success_24h: number;
  failed_24h: number;
  success_rate: number;
  avg_latency_ms: number;
  last_triggered: string | null;
  status: 'active' | 'failing' | 'disabled';
}

export interface WorkspaceStatus {
  id: string | number;
  name: string;
  user: string;
  project: string;
  status: 'running' | 'stopped' | 'error';
  cpu_pct: number;
  memory_pct: number;
  uptime_minutes: number;
  last_active: string;
}

export interface IaCTemplateStatus {
  id: string | number;
  name: string;
  provider: string;
  environment: string;
  resource_count: number;
  drift_detected: boolean;
  last_applied: string | null;
  status: 'applied' | 'drifted' | 'error' | 'pending' | 'planning';
}

export interface EnvironmentStatus {
  id: string | number;
  name: string;
  type: 'production' | 'staging' | 'development' | 'sandbox';
  status: 'healthy' | 'degraded' | 'drift' | 'offline';
  service_count: number;
  last_sync: string | null;
  sync_status: 'success' | 'failed' | 'pending' | 'none';
  config_vars: number;
  secrets: number;
}

export interface OperationalComponent {
  id: string | number;
  component: string;
  category: string;
  status: 'operational' | 'degraded' | 'major_outage' | 'maintenance';
  uptime_30d: number;
  response_time_ms: number;
  last_incident: string | null;
}

// ─── API calls ────────────────────────────────────────────────────────────────

export const monitoringApi = {
  // ── Developer Overview ───────────────────────────────────────────────────
  getDevOverview: () =>
    client.get<DevOverview>(`${BASE}/monitoring/dev/`),

  getPipelineHealth: (params?: { hours?: number; project_id?: string }) =>
    client.get<{ count: number; results: PipelineHealth[] }>(
      `${BASE}/monitoring/dev/pipeline-health/`, { params }
    ),

  getDeploymentHealth: (params?: { hours?: number; project_id?: string }) =>
    client.get<{ count: number; results: DeploymentHealth[] }>(
      `${BASE}/monitoring/dev/deployment-health/`, { params }
    ),

  getProjectHealth: () =>
    client.get<{ count: number; results: ProjectHealth[] }>(
      `${BASE}/monitoring/dev/project-health/`
    ),

  getActivity: (params?: {
    event_type?: string;
    project_id?: string;
    hours?: number;
    limit?: number;
  }) =>
    client.get<{ count: number; results: ActivityEvent[] }>(
      `${BASE}/monitoring/dev/activity/`, { params }
    ),

  getServiceHealth: () =>
    client.get<{ count: number; results: ServiceHealth[] }>(
      `${BASE}/monitoring/dev/service-health/`
    ),

  // ── Alerts & Incidents ───────────────────────────────────────────────────
  getAlerts: (params?: { status?: string; severity?: string }) =>
    client.get<{ count: number; results: MonitoringAlert[] }>(
      `${BASE}/alerts/`, { params }
    ),

  resolveAlert: (id: number) =>
    client.post(`${BASE}/alerts/${id}/resolve/`),

  silenceAlert: (id: number) =>
    client.post(`${BASE}/alerts/${id}/silence/`),

  getAlertRules: () =>
    client.get<{ count: number; results: AlertRule[] }>(`${BASE}/alert-rules/`),

  createAlertRule: (payload: Partial<AlertRule>) =>
    client.post<AlertRule>(`${BASE}/alert-rules/`, payload),

  deleteAlertRule: (id: number) =>
    client.delete(`${BASE}/alert-rules/${id}/`),

  getIncidents: (params?: { status?: string; severity?: string }) =>
    client.get<{ count: number; results: Incident[] }>(
      `${BASE}/incidents/`, { params }
    ),

  createIncident: (payload: { service: string; title: string; severity: string; summary?: string }) =>
    client.post<Incident>(`${BASE}/incidents/`, payload),

  updateIncidentStatus: (id: number, status: string, message?: string) =>
    client.post(`${BASE}/incidents/${id}/update_status/`, { status, message }),

  // ── Metrics ─────────────────────────────────────────────────────────────
  getMetrics: (params: { resource?: string; metric?: string; hours?: number }) =>
    client.get<{ points: MetricPoint[] }>(`${BASE}/metrics/`, { params }),

  // ── Logs ────────────────────────────────────────────────────────────────
  getLogs: (params?: { service?: string; search?: string; hours?: number; limit?: number }) =>
    client.get<{ count: number; logs: LogLine[] }>(`${BASE}/logs/`, { params }),

  // ── Container Health ──────────────────────────────────────────────────
  getContainerHealth: () =>
    client.get<{ count: number; results: ContainerHealth[] }>(
      `${BASE}/monitoring/dev/container-health/`
    ),

  // ── Kubernetes Health ────────────────────────────────────────────────
  getKubernetesHealth: () =>
    client.get<{ count: number; results: KubernetesHealth[] }>(
      `${BASE}/monitoring/dev/kubernetes-health/`
    ),

  // ── Resource Health (all platform resources) ─────────────────────────
  getResourceHealth: () =>
    client.get<ResourceHealthSummary>(
      `${BASE}/monitoring/dev/resource-health/`
    ),

  // ── Webhook Health ───────────────────────────────────────────────────
  getWebhookHealth: () =>
    client.get<{ count: number; results: WebhookHealth[] }>(
      `${BASE}/monitoring/dev/webhook-health/`
    ),

  // ── Workspace Status ─────────────────────────────────────────────────
  getWorkspaceStatus: () =>
    client.get<{ count: number; results: WorkspaceStatus[] }>(
      `${BASE}/monitoring/dev/workspace-status/`
    ),

  // ── IaC Template Status ──────────────────────────────────────────────
  getIaCStatus: () =>
    client.get<{ count: number; results: IaCTemplateStatus[] }>(
      `${BASE}/monitoring/dev/iac-status/`
    ),

  // ── Environment Status ───────────────────────────────────────────────
  getEnvironmentStatus: () =>
    client.get<{ count: number; results: EnvironmentStatus[] }>(
      `${BASE}/monitoring/dev/environment-status/`
    ),

  // ── Operational Status ───────────────────────────────────────────────
  getOperationalStatus: () =>
    client.get<{ count: number; results: OperationalComponent[] }>(
      `${BASE}/monitoring/dev/operational-status/`
    ),
};
