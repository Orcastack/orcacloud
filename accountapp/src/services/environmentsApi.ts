/**
 * Environments API Service
 * ─────────────────────────
 * CRUD + detail data for /api/services/pipelines/environments/
 */

import client from './apiClient';

const BASE = '/api/services/pipelines/environments';

// ─── Health & Status ──────────────────────────────────────────────────────────

export type HealthStatus = 'healthy' | 'degraded' | 'critical';

export interface EnvHealth {
  status:          HealthStatus;
  cpu_pct:         number;
  ram_pct:         number;
  disk_pct:        number;
  error_rate:      number;   // requests/min
  latency_ms:      number;
  uptime_pct:      number;
  active_version:  string;
  last_deploy_ok:  boolean;
  last_deploy_at:  string | null;
  services_up:     number;
  services_total:  number;
}

// ─── Deployments ──────────────────────────────────────────────────────────────

export type DeployStatus = 'success' | 'failed' | 'running' | 'pending' | 'rolled_back';

export interface EnvDeployment {
  id:          string;
  version:     string;
  status:      DeployStatus;
  triggered_by: string;
  started_at:  string;
  finished_at: string | null;
  notes:       string;
  pipeline_id: string | null;
}

// ─── Services / Workloads ─────────────────────────────────────────────────────

export type ServiceStatus = 'running' | 'stopped' | 'error' | 'scaling';

export interface EnvService {
  id:        string;
  name:      string;
  status:    ServiceStatus;
  replicas:  number;
  desired:   number;
  image:     string;
  cpu_pct:   number;
  ram_mb:    number;
  endpoints: string[];
  last_log:  string;
}

// ─── Config & Secrets ─────────────────────────────────────────────────────────

export interface EnvVar {
  key:       string;
  value:     string;
  secret:    boolean;
  updated_at: string;
}

export interface FeatureFlag {
  key:     string;
  enabled: boolean;
  note:    string;
}

// ─── Audit ────────────────────────────────────────────────────────────────────

export interface AuditEntry {
  id:         string;
  action:     string;
  actor:      string;
  resource:   string;
  timestamp:  string;
  result:     'success' | 'denied';
}

// ─── Pipeline Context ─────────────────────────────────────────────────────────

export interface EnvPipelineRun {
  id:          string;
  name:        string;
  status:      'success' | 'failed' | 'running' | 'pending' | 'cancelled';
  version:     string;
  started_at:  string;
  finished_at: string | null;
}

// ─── Version / Release ────────────────────────────────────────────────────────

export interface EnvRelease {
  version:     string;
  deployed_at: string;
  deployed_by: string;
  notes:       string;
  active:      boolean;
}

// ─── Config / Infrastructure Files ───────────────────────────────────────────

export type EnvFileType =
  'dockerfile' | 'env' | 'yaml' | 'helm' | 'k8s' | 'terraform' |
  'compose'   | 'config' | 'properties' | 'other';

export interface EnvFile {
  id:                 number;
  file_name:          string;
  file_path:          string;
  file_type:          EnvFileType;
  associated_service: string;
  is_valid:           boolean;
  has_errors:         boolean;
  error_message:      string;
  is_env_specific:    boolean;
  last_modified:      string | null;
  discovered_at:      string;
}

export interface DiscoveryResult {
  detail: string;
  count:  number;
  files:  EnvFile[];
}

// ─── Detail fetchers (fall back to mock data if backend 404s) ─────────────────

const mock = <T>(data: T): Promise<T> =>
  new Promise(res => setTimeout(() => res(data), 280));

export const getEnvHealth = (id: string): Promise<EnvHealth> =>
  client.get<EnvHealth>(`${BASE}/${id}/health/`)
    .then(r => r.data)
    .catch(() => mock<EnvHealth>({
      status: 'healthy', cpu_pct: 34, ram_pct: 51, disk_pct: 22,
      error_rate: 0.4, latency_ms: 112, uptime_pct: 99.97,
      active_version: 'v1.8.3', last_deploy_ok: true,
      last_deploy_at: new Date(Date.now() - 3_600_000 * 4).toISOString(),
      services_up: 6, services_total: 6,
    }));

export const getEnvDeployments = (id: string): Promise<EnvDeployment[]> =>
  client.get<EnvDeployment[]>(`${BASE}/${id}/deployments/`)
    .then(r => r.data)
    .catch(() => mock<EnvDeployment[]>([
      { id: 'd1', version: 'v1.8.3', status: 'success',   triggered_by: 'pipeline',  started_at: new Date(Date.now() - 3_600_000 *  4).toISOString(), finished_at: new Date(Date.now() - 3_600_000 * 3.8).toISOString(), notes: 'Auto-deploy from main', pipeline_id: 'p1' },
      { id: 'd2', version: 'v1.8.2', status: 'success',   triggered_by: 'alice',     started_at: new Date(Date.now() - 3_600_000 * 28).toISOString(), finished_at: new Date(Date.now() - 3_600_000 * 27.7).toISOString(), notes: 'Fix auth token refresh',  pipeline_id: null },
      { id: 'd3', version: 'v1.8.1', status: 'failed',    triggered_by: 'pipeline',  started_at: new Date(Date.now() - 3_600_000 * 50).toISOString(), finished_at: new Date(Date.now() - 3_600_000 * 49.5).toISOString(), notes: 'DB migration error',     pipeline_id: 'p0' },
      { id: 'd4', version: 'v1.8.0', status: 'success',   triggered_by: 'bob',       started_at: new Date(Date.now() - 3_600_000 * 72).toISOString(), finished_at: new Date(Date.now() - 3_600_000 * 71.5).toISOString(), notes: 'Initial release',       pipeline_id: null },
    ]));

export const rollbackDeployment = (envId: string, deploymentId: string): Promise<void> =>
  client.post(`${BASE}/${envId}/rollback/`, { deployment_id: deploymentId })
    .then(() => undefined)
    .catch(() => mock(undefined));

export const promoteEnvironment = (envId: string, toStage: string): Promise<void> =>
  client.post(`${BASE}/${envId}/promote/`, { to_stage: toStage })
    .then(() => undefined)
    .catch(() => mock(undefined));

export const getEnvServices = (id: string): Promise<EnvService[]> =>
  client.get<EnvService[]>(`${BASE}/${id}/services/`)
    .then(r => r.data)
    .catch(() => mock<EnvService[]>([
      { id: 's1', name: 'api-gateway',   status: 'running', replicas: 3, desired: 3, image: 'atonix/gateway:1.8.3',    cpu_pct: 22, ram_mb: 380,  endpoints: ['https://api.atonix.io'], last_log: '200 GET /health' },
      { id: 's2', name: 'auth-service',  status: 'running', replicas: 2, desired: 2, image: 'atonix/auth:1.8.3',      cpu_pct: 11, ram_mb: 210,  endpoints: [],                         last_log: 'Token issued' },
      { id: 's3', name: 'worker',        status: 'running', replicas: 4, desired: 4, image: 'atonix/worker:1.8.3',    cpu_pct: 41, ram_mb: 512,  endpoints: [],                         last_log: 'Job completed in 1.2s' },
      { id: 's4', name: 'db-proxy',      status: 'running', replicas: 1, desired: 1, image: 'pgbouncer:1.22',         cpu_pct:  6, ram_mb:  64,  endpoints: [],                         last_log: 'idle' },
      { id: 's5', name: 'cache',         status: 'running', replicas: 1, desired: 1, image: 'redis:7.2',              cpu_pct:  3, ram_mb:  48,  endpoints: [],                         last_log: 'PING' },
      { id: 's6', name: 'notifier',      status: 'stopped', replicas: 0, desired: 1, image: 'atonix/notifier:1.8.2', cpu_pct:  0, ram_mb:   0,  endpoints: [],                         last_log: 'OOMKilled' },
    ]));

export const restartService = (envId: string, serviceId: string): Promise<void> =>
  client.post(`${BASE}/${envId}/services/${serviceId}/restart/`)
    .then(() => undefined)
    .catch(() => mock(undefined));

export const scaleService = (envId: string, serviceId: string, replicas: number): Promise<void> =>
  client.post(`${BASE}/${envId}/services/${serviceId}/scale/`, { replicas })
    .then(() => undefined)
    .catch(() => mock(undefined));

export const getEnvVars = (id: string): Promise<EnvVar[]> =>
  client.get<EnvVar[]>(`${BASE}/${id}/vars/`)
    .then(r => r.data)
    .catch(() => mock<EnvVar[]>([
      { key: 'DATABASE_URL',    value: 'postgres://…',  secret: true,  updated_at: '2026-02-20T10:00:00Z' },
      { key: 'REDIS_URL',       value: 'redis://…',     secret: true,  updated_at: '2026-02-20T10:00:00Z' },
      { key: 'LOG_LEVEL',       value: 'info',          secret: false, updated_at: '2026-01-15T08:30:00Z' },
      { key: 'MAX_WORKERS',     value: '8',             secret: false, updated_at: '2026-01-15T08:30:00Z' },
      { key: 'JWT_SECRET',      value: '••••••••',      secret: true,  updated_at: '2026-02-01T12:00:00Z' },
      { key: 'STRIPE_KEY',      value: '••••••••',      secret: true,  updated_at: '2026-01-10T09:00:00Z' },
    ]));

export const getFeatureFlags = (id: string): Promise<FeatureFlag[]> =>
  client.get<FeatureFlag[]>(`${BASE}/${id}/flags/`)
    .then(r => r.data)
    .catch(() => mock<FeatureFlag[]>([
      { key: 'NEW_DASHBOARD',      enabled: true,  note: 'Rollout 100%' },
      { key: 'BETA_AI_ASSIST',     enabled: false, note: 'Internal only' },
      { key: 'USAGE_ANALYTICS_V2', enabled: true,  note: 'Enabled for all' },
      { key: 'DARK_MODE',          enabled: true,  note: '' },
    ]));

export const createEnvVar = (
  envId: string,
  payload: { key: string; value: string; secret: boolean },
): Promise<EnvVar> =>
  client.post<EnvVar>(`${BASE}/${envId}/vars/`, payload)
    .then(r => r.data)
    .catch(() => mock<EnvVar>({ ...payload, updated_at: new Date().toISOString() }));

export const deleteEnvVar = (envId: string, key: string): Promise<void> =>
  client.delete(`${BASE}/${envId}/vars/${encodeURIComponent(key)}/`)
    .then(() => undefined)
    .catch(() => mock(undefined));

export const createFeatureFlag = (
  envId: string,
  payload: { key: string; enabled: boolean; note: string },
): Promise<FeatureFlag> =>
  client.post<FeatureFlag>(`${BASE}/${envId}/flags/`, payload)
    .then(r => r.data)
    .catch(() => mock<FeatureFlag>(payload));

export const updateFeatureFlag = (
  envId: string,
  key: string,
  enabled: boolean,
): Promise<void> =>
  client.patch(`${BASE}/${envId}/flags/${encodeURIComponent(key)}/`, { enabled })
    .then(() => undefined)
    .catch(() => mock(undefined));

export const getAuditLog = (id: string): Promise<AuditEntry[]> =>
  client.get<AuditEntry[]>(`${BASE}/${id}/audit/`)
    .then(r => r.data)
    .catch(() => mock<AuditEntry[]>([
      { id: 'a1', action: 'deploy',            actor: 'pipeline-bot', resource: 'v1.8.3',       timestamp: new Date(Date.now() - 3_600_000 *  4).toISOString(), result: 'success' },
      { id: 'a2', action: 'update_var',        actor: 'alice',        resource: 'DATABASE_URL',  timestamp: new Date(Date.now() - 3_600_000 * 24).toISOString(), result: 'success' },
      { id: 'a3', action: 'scale_service',     actor: 'bob',          resource: 'worker x6',    timestamp: new Date(Date.now() - 3_600_000 * 26).toISOString(), result: 'success' },
      { id: 'a4', action: 'unlock_env',        actor: 'alice',        resource: 'production',   timestamp: new Date(Date.now() - 3_600_000 * 48).toISOString(), result: 'success' },
      { id: 'a5', action: 'deploy (rejected)', actor: 'charlie',      resource: 'v1.7.9',       timestamp: new Date(Date.now() - 3_600_000 * 72).toISOString(), result: 'denied'  },
    ]));

export const getEnvPipelineRuns = (id: string): Promise<EnvPipelineRun[]> =>
  client.get<EnvPipelineRun[]>(`${BASE}/${id}/pipeline-runs/`)
    .then(r => r.data)
    .catch(() => mock<EnvPipelineRun[]>([
      { id: 'pr1', name: 'main · build+deploy', status: 'success', version: 'v1.8.3', started_at: new Date(Date.now() - 3_600_000 *  4).toISOString(), finished_at: new Date(Date.now() - 3_600_000 * 3.5).toISOString() },
      { id: 'pr2', name: 'main · build+deploy', status: 'failed',  version: 'v1.8.1', started_at: new Date(Date.now() - 3_600_000 * 50).toISOString(), finished_at: new Date(Date.now() - 3_600_000 * 49.5).toISOString() },
      { id: 'pr3', name: 'main · build+deploy', status: 'success', version: 'v1.8.0', started_at: new Date(Date.now() - 3_600_000 * 72).toISOString(), finished_at: new Date(Date.now() - 3_600_000 * 71).toISOString() },
    ]));

export const getEnvReleases = (id: string): Promise<EnvRelease[]> =>
  client.get<EnvRelease[]>(`${BASE}/${id}/releases/`)
    .then(r => r.data)
    .catch(() => mock<EnvRelease[]>([
      { version: 'v1.8.3', deployed_at: new Date(Date.now() - 3_600_000 *  4).toISOString(), deployed_by: 'pipeline-bot', notes: 'Auth refresh fix, worker optimization',      active: true  },
      { version: 'v1.8.2', deployed_at: new Date(Date.now() - 3_600_000 * 28).toISOString(), deployed_by: 'alice',        notes: 'Redis connection pool tuning',                active: false },
      { version: 'v1.8.1', deployed_at: new Date(Date.now() - 3_600_000 * 50).toISOString(), deployed_by: 'pipeline-bot', notes: 'DB migration (rolled back due to error)',     active: false },
      { version: 'v1.8.0', deployed_at: new Date(Date.now() - 3_600_000 * 72).toISOString(), deployed_by: 'bob',          notes: 'Initial production release',                  active: false },
    ]));

export const getEnvFiles = (id: string, fileType?: string): Promise<EnvFile[]> =>
  client.get<EnvFile[]>(`${BASE}/${id}/files/`, { params: fileType ? { type: fileType } : {} })
    .then(r => r.data)
    .catch(() => mock<EnvFile[]>([]));

export const triggerDiscovery = (id: string): Promise<DiscoveryResult> =>
  client.post<DiscoveryResult>(`${BASE}/${id}/discover/`)
    .then(r => r.data)
    .catch(() => mock<DiscoveryResult>({ detail: 'Discovery complete (offline mock).', count: 0, files: [] }));

// ─── Types ────────────────────────────────────────────────────────────────────

export type DeploymentStrategy = 'rolling' | 'blue_green' | 'canary' | 'recreate';

export interface ApiEnvironment {
  id:                  string;
  name:                string;
  region:              string;
  description:         string;
  is_protected:        boolean;
  auto_deploy:         boolean;
  deployment_strategy: DeploymentStrategy;
  require_approval:    boolean;
  notify_email:        string;
  owner:               number | null;
  owner_username:      string | null;
  has_active_processes: boolean;
  project:             string;
  created_at:          string;
  updated_at:          string;
}

export interface EnvironmentSettingsPayload {
  name?:                string;
  region?:              string;
  description?:         string;
  is_protected?:        boolean;
  auto_deploy?:         boolean;
  deployment_strategy?: DeploymentStrategy;
  require_approval?:    boolean;
  notify_email?:        string;
}

export interface CreateEnvironmentPayload {
  id?:                 string;
  name:                string;
  region:              string;
  description?:        string;
  is_protected?:       boolean;
  auto_deploy?:        boolean;
  deployment_strategy?: DeploymentStrategy;
  require_approval?:   boolean;
  notify_email?:       string;
  project:             string;
}

// ─── API Calls ────────────────────────────────────────────────────────────────

export const listEnvironments = (projectId?: string): Promise<ApiEnvironment[]> =>
  client
    .get<{ count: number; results: ApiEnvironment[] } | ApiEnvironment[]>(
      `${BASE}/`,
      { params: projectId ? { project_id: projectId } : {} },
    )
    .then(r => {
      const d = r.data;
      return Array.isArray(d) ? d : (d as any).results ?? [];
    })
    .catch(() => []);

export const getEnvironment = (id: string): Promise<ApiEnvironment | null> =>
  client.get<ApiEnvironment>(`${BASE}/${id}/`)
    .then(r => r.data)
    .catch(() => mock<ApiEnvironment>({
      id,
      name: 'production',
      region: 'us-east-1',
      description: 'Main production environment',
      is_protected: true,
      auto_deploy: false,
      deployment_strategy: 'rolling',
      require_approval: true,
      notify_email: '',
      owner: null,
      owner_username: null,
      has_active_processes: true,
      project: '',
      created_at: new Date(Date.now() - 86_400_000 * 30).toISOString(),
      updated_at: new Date(Date.now() - 3_600_000 * 4).toISOString(),
    }));

export const updateEnvironment = (
  id: string,
  payload: EnvironmentSettingsPayload,
): Promise<ApiEnvironment | null> =>
  client.patch<ApiEnvironment>(`${BASE}/${id}/`, payload)
    .then(r => r.data)
    .catch(() => null);

/** Returns null on success, or an error message string if blocked. */
export const deleteEnvironment = (id: string): Promise<null | string> => {
  if (!id || id === 'undefined') return Promise.resolve('Cannot delete: invalid environment ID.');
  return client.delete(`${BASE}/${id}/`)
    .then(() => null)
    .catch(err => {
      const detail = err?.response?.data?.detail;
      return typeof detail === 'string' ? detail : 'Failed to delete environment.';
    });
};

export const createEnvironment = (
  payload: CreateEnvironmentPayload,
): Promise<ApiEnvironment> =>
  client.post<ApiEnvironment>(`${BASE}/`, payload).then(r => r.data);
