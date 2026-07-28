// OrcaCloud – Operational Status API Client

import client from './apiClient';

const BASE = '/api/services/operational';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ServiceKey =
  | 'compute' | 'container_runtime' | 'ci_cd' | 'registry' | 'networking'
  | 'storage' | 'monitoring' | 'edge_robotics' | 'database' | 'dns'
  | 'cdn' | 'email' | 'kubernetes' | 'gpu_nodes';

export const SERVICE_LABELS: Record<ServiceKey, string> = {
  compute:           'Compute Engine',
  container_runtime: 'Container Runtime',
  ci_cd:             'CI/CD Pipelines',
  registry:          'Container Registry',
  networking:        'Networking',
  storage:           'Storage',
  monitoring:        'Monitoring',
  edge_robotics:     'Edge & Robotics',
  database:          'Database',
  dns:               'DNS',
  cdn:               'CDN',
  email:             'Email',
  kubernetes:        'Kubernetes',
  gpu_nodes:         'GPU Nodes',
};

export type ComponentStatusValue =
  | 'operational' | 'degraded' | 'partial_outage' | 'major_outage' | 'maintenance';

export type IncidentSeverity = 'sev1' | 'sev2' | 'sev3' | 'sev4';
export type IncidentStatus =
  | 'open' | 'investigating' | 'identified' | 'monitoring' | 'resolved' | 'postmortem';

export type ProcessType =
  | 'deployment' | 'pipeline' | 'automation' | 'gpu_job' | 'edge_task' | 'background' | 'sync';

export type ProcessStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';

export type BannerLevel = 'operational' | 'partial_outage' | 'major_incident';

// ─── Models ───────────────────────────────────────────────────────────────────

export interface GlobalBanner {
  level:   BannerLevel;
  message: string;
}

export interface ServiceHealthItem {
  service:      string;
  status:       ComponentStatusValue;
  uptime_pct:   number;
  latency_ms:   number;
  error_rate:   number;
  note:         string;
  last_checked: string;
}

export interface CloudRegion {
  id:               string;
  code:             string;
  name:             string;
  country:          string;
  city:             string;
  continent:        string;
  status:           'active' | 'degraded' | 'maintenance' | 'unavailable';
  uptime_30d_pct:   number;
  latency_ms:       number | null;
  enabled_services: string[];
}

export interface ComponentStatus {
  service:    ServiceKey;
  region:     string;
  status:     ComponentStatusValue;
  uptime_pct: number;
  latency_ms: number;
  error_rate: number;
  note:       string;
  updated_at: string;
}

export interface HealthGrid {
  services: ServiceKey[];
  regions:  string[];
  grid:     Record<string, Record<string, ComponentStatus>>; // grid[service][region]
}

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
  service:           string;
  severity:          IncidentSeverity;
  status:            IncidentStatus;
  detected_at:       string;
  resolved_at:       string | null;
  duration_minutes:  number;
  created_at:        string;
  summary?:          string;
  affected_resources?: string[];
  impact?:           string;
  resolution?:       string;
  updates?:          IncidentUpdate[];
}

export interface RunningProcess {
  id:           number;
  process_type: ProcessType;
  name:         string;
  status:       ProcessStatus;
  region:       string;
  cluster:      string;
  environment:  string;
  resource_id:  string;
  resource_ref: string;
  progress_pct: number;
  logs_url:     string;
  metrics_url:  string;
  started_at:   string;
  finished_at:  string | null;
  meta:         Record<string, unknown>;
}

export interface OperationalOverview {
  banner:            GlobalBanner;
  service_health:    ServiceHealthItem[];
  regions:           CloudRegion[];
  active_incidents:  Incident[];
  running_count:     number;
  generated_at:      string;
}

export interface OperationalSummary {
  active_incidents: number;
  sev1_incidents:   number;
  running_processes: number;
}

export interface RunningProcessCreatePayload {
  process_type: ProcessType;
  name:         string;
  status?:      ProcessStatus;
  region?:      string;
  cluster?:     string;
  environment?: string;
  resource_id?: string;
  resource_ref?: string;
  progress_pct?: number;
  logs_url?:    string;
  metrics_url?: string;
  meta?:        Record<string, unknown>;
}

// ─── API functions ────────────────────────────────────────────────────────────

/** Global banner, service health, regions, active incidents, running count */
export async function getOperationalOverview(): Promise<OperationalOverview> {
  const res = await client.get(`${BASE}/`);
  return res.data;
}

/** Service × region grid */
export async function getHealthGrid(): Promise<HealthGrid> {
  const res = await client.get(`${BASE}/health-grid/`);
  return res.data;
}

/** Update a single grid cell */
export async function updateHealthGridCell(
  payload: Omit<ComponentStatus, 'updated_at'>,
): Promise<ComponentStatus> {
  const res = await client.post(`${BASE}/health-grid/update/`, payload);
  return res.data;
}

/** Active running processes */
export async function getRunningProcesses(opts?: {
  type?:   ProcessType;
  status?: string; // comma-separated e.g. 'running,queued'
}): Promise<RunningProcess[]> {
  const params: Record<string, string> = {};
  if (opts?.type)   params.type   = opts.type;
  if (opts?.status) params.status = opts.status;
  const res = await client.get(`${BASE}/running/`, { params });
  return Array.isArray(res.data) ? res.data : res.data?.results ?? [];
}

/** Register a new process */
export async function createRunningProcess(
  payload: RunningProcessCreatePayload,
): Promise<RunningProcess> {
  const res = await client.post(`${BASE}/running/`, payload);
  return res.data;
}

/** Update a process (progress, status) */
export async function updateRunningProcess(
  id: number,
  patch: Partial<Pick<RunningProcess, 'status' | 'progress_pct' | 'finished_at' | 'meta'>>,
): Promise<RunningProcess> {
  const res = await client.patch(`${BASE}/running/${id}/`, patch);
  return res.data;
}

/** Lightweight counts for polling */
export async function getOperationalSummary(): Promise<OperationalSummary> {
  const res = await client.get(`${BASE}/summary/`);
  return res.data;
}

/** All incidents (use query params: status=open, etc.) */
export async function listIncidents(params?: {
  status?:   IncidentStatus;
  severity?: IncidentSeverity;
  service?:  string;
}): Promise<Incident[]> {
  const res = await client.get('/api/services/incidents/', { params });
  return Array.isArray(res.data) ? res.data : res.data?.results ?? [];
}

/** Single incident detail */
export async function getIncident(id: string): Promise<Incident> {
  const res = await client.get(`/api/services/incidents/${id}/`);
  return res.data;
}

/** Create an incident */
export async function createIncident(payload: {
  title:    string;
  service:  string;
  severity: IncidentSeverity;
  summary?: string;
  impact?:  string;
}): Promise<Incident> {
  const res = await client.post('/api/services/incidents/', payload);
  return res.data;
}

/** List regions */
export async function listRegions(): Promise<CloudRegion[]> {
  const res = await client.get('/api/services/regions/');
  return Array.isArray(res.data) ? res.data : res.data?.results ?? [];
}
