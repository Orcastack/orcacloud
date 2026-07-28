/**
 * Kubernetes Integration API Service
 * ─────────────────────────────────────
 * Wraps all /api/kubernetes/* endpoints.
 */

import client from './apiClient';

const BASE = '/api/services/kubernetes';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface KubeConfigPayload {
  project_id: string;
  project_name?: string;
  environment: 'development' | 'staging' | 'production';
  cluster_id?: string;
  cluster_name?: string;
  git_provider: 'github' | 'gitlab' | 'bitbucket' | 'other';
  git_repo: string;
  git_branch: string;
  git_path: string;
  auto_apply?: boolean;
}

export interface KubeConfig extends KubeConfigPayload {
  id: string;
  owner_username: string;
  namespace: string;
  derived_namespace: string;
  last_commit: string;
  last_sync_status: string;
  last_synced_at: string | null;
  governance_warnings: string[];
  sync_runs: KubeSyncRun[];
  created_at: string;
  updated_at: string;
}

export interface KubeSyncRun {
  id: string;
  run_type: string;
  triggered_by: string;
  commit_sha: string;
  branch: string;
  files_selected: string[];
  files_applied: string[];
  resources_created: Array<{ kind: string; name: string; namespace: string }>;
  governance_issues: string[];
  status: string;
  logs: string;
  error: string;
  started_at: string;
  finished_at: string | null;
  duration_seconds: number | null;
}

export interface ManifestResource {
  kind: string;
  name: string;
  namespace: string;
}

export interface ManifestFile {
  path: string;
  resources: ManifestResource[];
  warnings: string[];
}

export interface ScanResult {
  commit_sha: string;
  branch: string;
  files: ManifestFile[];
  total_files: number;
  summary: Record<string, number>;
  all_warnings: string[];
}

export interface MonitorData {
  namespace: string;
  last_commit: string;
  last_sync_status: string;
  last_synced_at: string | null;
  auto_apply: boolean;
  workloads: {
    deployments: WorkloadRow[];
    statefulsets: WorkloadRow[];
    daemonsets: WorkloadRow[];
    jobs: WorkloadRow[];
    cronjobs: CronJobRow[];
  };
  pods: PodRow[];
  networking: {
    services: ServiceRow[];
    ingresses: IngressRow[];
  };
  events: EventRow[];
  health: {
    status: string;
    ready_pods: number;
    total_pods: number;
    warnings: number;
  };
}

export interface WorkloadRow {
  name: string;
  namespace: string;
  replicas: number;
  ready: number;
  available: number;
  health: string;
  age: string;
}

export interface CronJobRow {
  name: string;
  namespace: string;
  schedule: string;
  last_run: string;
  last_status: string;
  age: string;
}

export interface PodRow {
  name: string;
  namespace: string;
  status: string;
  restarts: number;
  node: string;
  age: string;
  ready: boolean;
}

export interface ServiceRow {
  name: string;
  namespace: string;
  type: string;
  cluster_ip: string;
  ports: string[];
  age: string;
}

export interface IngressRow {
  name: string;
  namespace: string;
  hosts: string[];
  tls: boolean;
  address: string;
  age: string;
}

export interface EventRow {
  name: string;
  namespace: string;
  reason: string;
  message: string;
  type: string;
  count: number;
  age: string;
  object: string;
}

// ─── API calls ────────────────────────────────────────────────────────────────

export const kubernetesApi = {
  // Config CRUD
  listConfigs: (params?: { project_id?: string; environment?: string }) =>
    client.get<KubeConfig[]>(`${BASE}/config/`, { params }),

  getConfig: (id: string) =>
    client.get<KubeConfig>(`${BASE}/config/${id}/`),

  createOrUpdateConfig: (payload: KubeConfigPayload) =>
    client.post<KubeConfig>(`${BASE}/config/`, payload),

  updateConfig: (id: string, payload: Partial<KubeConfigPayload>) =>
    client.patch<KubeConfig>(`${BASE}/config/${id}/`, payload),

  deleteConfig: (id: string) =>
    client.delete(`${BASE}/config/${id}/`),

  // Scan
  scanRepo: (id: string, opts?: { branch?: string; path?: string; git_token?: string }) =>
    client.post<ScanResult>(`${BASE}/config/${id}/scan/`, opts ?? {}),

  // Apply
  applyManifests: (id: string, payload: {
    commit_sha: string;
    selected_files: string[];
    dry_run?: boolean;
    git_token?: string;
  }) =>
    client.post<KubeSyncRun>(`${BASE}/config/${id}/apply/`, payload),

  // Monitor
  getMonitor: (id: string) =>
    client.get<MonitorData>(`${BASE}/config/${id}/monitor/`),

  // History
  getSyncHistory: (id: string) =>
    client.get<KubeSyncRun[]>(`${BASE}/config/${id}/history/`),

  // All sync runs
  allSyncRuns: () =>
    client.get<KubeSyncRun[]>(`${BASE}/sync-runs/`),
};
