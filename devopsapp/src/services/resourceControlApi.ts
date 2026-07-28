// OrcaCloud – Resource Control Center API Client

import client from './apiClient'

const BASE = '/api/services/resources'

function unwrap<T>(data: unknown): T[] {
  return Array.isArray(data) ? (data as T[]) : ((data as any)?.results ?? []) as T[]
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type ResourceStatus   = 'running' | 'failed' | 'degraded' | 'pending' | 'stopped' | 'unknown'
export type ResourceType     =
  | 'pipeline' | 'container' | 'kubernetes_pod' | 'kubernetes_deployment'
  | 'kubernetes_service' | 'api_route' | 'api_gateway' | 'monitoring_alert'
  | 'group_runner' | 'runner' | 'environment' | 'storage_bucket'
  | 'storage_volume' | 'workspace' | 'operational_task' | 'domain' | 'secret'

export type ResourceEnvironment = 'dev' | 'stage' | 'prod' | 'global' | 'unknown'

export interface PlatformResource {
  id:           string
  name:         string
  resource_type: ResourceType
  subsystem:    string
  group_id:     string | null
  group_name:   string | null
  project_id:   string | null
  project_name: string | null
  environment:  ResourceEnvironment
  status:       ResourceStatus
  health_score: number           // 0-100
  metadata:     Record<string, any>
  last_synced:  string
  created_at:   string
}

export interface ResourceFilters {
  group_id?:     string
  project_id?:   string
  environment?:  string
  resource_type?: string
  status?:       string
  search?:       string
}

export interface ResourceAction {
  action:  string          // 'restart' | 'stop' | 'start' | 'scale' | 'rerun' | 'lock' | 'unlock' | 'pause' | 'resume'
  payload?: Record<string, any>
}

export interface SyncResult {
  synced:   number
  errors:   number
  duration: number
}

// ─── Fetch resources (with filters) ──────────────────────────────────────────

export async function listResources(filters?: ResourceFilters): Promise<PlatformResource[]> {
  try {
    const { data } = await client.get(BASE + '/', { params: filters })
    return unwrap<PlatformResource>(data)
  } catch {
    return []
  }
}

export async function getResource(id: string): Promise<PlatformResource | null> {
  try {
    const { data } = await client.get(`${BASE}/${id}/`)
    return data as PlatformResource
  } catch {
    return null
  }
}

// ─── Sync ─────────────────────────────────────────────────────────────────────

export async function triggerSync(groupId?: string, projectId?: string): Promise<SyncResult> {
  try {
    const { data } = await client.post(`${BASE}/sync/`, { group_id: groupId, project_id: projectId })
    return data as SyncResult
  } catch {
    return { synced: 0, errors: 1, duration: 0 }
  }
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export async function performResourceAction(id: string, action: ResourceAction): Promise<{ ok: boolean; message: string }> {
  try {
    const { data } = await client.post(`${BASE}/${id}/action/`, action)
    return data
  } catch {
    return { ok: false, message: `${action.action} failed: resource API unavailable` }
  }
}
