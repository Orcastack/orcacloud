// OrcaCloud – Developer Workspace API Client

import client from './apiClient'
import type { GroupSidebarData } from './groupsApi'
import type { ContextListParams } from './resourceContext'

const BASE = '/api/services/dev-workspaces'

// ─── Types ────────────────────────────────────────────────────────────────────

export type DevWorkspaceStatus = 'stopped' | 'starting' | 'running' | 'stopping' | 'error'

// ── Provisioning plan types ──────────────────────────────────────────────────
export type StorageType       = 'standard' | 'high-iops'
export type BackupPolicy      = 'none' | 'daily' | 'weekly'
export type FirewallProfile   = 'default' | 'strict' | 'open' | 'custom'
export type ContainerRuntime  = 'docker' | 'podman' | 'kubernetes'
export type DatabaseEngine    = 'postgresql' | 'mysql' | 'sqlite' | 'mongodb' | 'redis' | 'none'
export type DatabasePlan      = 'shared' | 'dedicated' | 'managed'

export interface DevWorkspace {
  id: number
  workspace_id: string
  display_name: string
  owner: string
  status: DevWorkspaceStatus
  region: string
  image: string
  ide: string
  editor_url: string
  cpu_percent: number
  ram_percent: number
  containers: number
  volumes: number
  terminal_ws_url: string
  started_at: string | null
  created_at: string
  updated_at: string
  // Provisioning plan
  vcpus: number
  ram_gb: number
  gpu_enabled: boolean
  storage_type: StorageType
  storage_gb: number
  backup_policy: BackupPolicy
  vpc_name: string
  subnet_name: string
  firewall_profile: FirewallProfile
  public_ip: boolean
  container_runtime: ContainerRuntime
  container_template: string
  domain: string
  // Database
  db_engine: DatabaseEngine
  db_plan: DatabasePlan
  db_name: string
  db_version: string
  db_storage_gb: number
  db_host: string
  db_port: number | null
  db_username: string
  // Setup wizard connections
  connected_project_id: string
  connected_project_name: string
  connected_env_id: string
  connected_env_name: string
  connected_group_id: string
  connected_group_name: string
  connected_container_ids: string[]
  pipeline_last_run: string | null
  pipeline_last_success: string | null
  pipeline_last_failure: string | null
  pipeline_last_status: string
  setup_metadata: Record<string, unknown>
  // ── Context-aware architecture fields ────────────────────────────────────
  /** 'enterprise' | 'developer' — role of user who created this workspace */
  created_by_role: 'enterprise' | 'developer'
  /** Which dashboard this workspace was created from */
  created_from_dashboard: 'enterprise' | 'developer' | 'group'
  /** Enterprise org slug, group id, or '' for personal workspaces */
  parent_context_id: string
  /** Frontend URL to navigate back to from this workspace */
  return_path: string
}

// ── Catalog types ────────────────────────────────────────────────────────────
export interface ComputePlan {
  id: string
  label: string
  vcpus: number
  ram_gb: number
  price_hint: string
}
export interface CatalogOption { id: string; label: string; [key: string]: unknown }
export interface WorkspaceCatalog {
  compute_plans: ComputePlan[]
  storage_types: CatalogOption[]
  backup_policies: CatalogOption[]
  firewall_profiles: (CatalogOption & { description: string })[]
  container_runtimes: CatalogOption[]
  container_templates: (CatalogOption & { image: string })[]
  regions: CatalogOption[]
}

// ─── Setup Wizard types ─────────────────────────────────────────────────────

export type SetupAction = 'create' | 'connect' | 'skip'

export interface WorkspaceSetupPayload {
  // Project
  project_action?: SetupAction
  project_name?: string
  project_description?: string
  project_repo_option?: 'empty' | 'github' | 'gitlab' | 'bitbucket'
  project_repo_url?: string
  project_auto_cicd?: boolean
  project_id?: string
  project_auto_sync?: boolean
  project_auto_pipeline?: boolean
  // Container
  container_action?: SetupAction
  container_name?: string
  container_type?: 'app' | 'worker' | 'cron' | 'api' | 'custom'
  container_runtime_size?: 's' | 'm' | 'l' | 'xl'
  container_scaling_mode?: 'manual' | 'auto'
  container_attach_project?: boolean
  container_connect_repo?: boolean
  container_connect_pipeline?: boolean
  container_id?: string
  container_attach_env?: boolean
  // Environment
  environment_action?: SetupAction
  environment_name?: string
  environment_type?: 'dev' | 'stage' | 'prod'
  environment_region?: string
  environment_auto_deploy?: boolean
  environment_id?: string
  environment_sync_vars?: boolean
  environment_sync_secrets?: boolean
  // Group
  group_action?: SetupAction
  group_name?: string
  group_description?: string
  group_members?: string[]
  group_id?: string
  group_role?: 'owner' | 'maintainer' | 'developer' | 'viewer'
  // Pipeline
  pipeline_id?: string
  pipeline_auto_trigger?: boolean
}

export interface CreateDevWorkspacePayload {
  // Step 1 — Basics
  workspace_id: string
  display_name: string
  description?: string
  region?: string
  zone?: string
  image?: string
  ide?: string
  // Step 2 — Compute
  vcpus?: number
  ram_gb?: number
  gpu_enabled?: boolean
  gpu_model?: string
  // Step 3 — Database
  db_engine?: DatabaseEngine
  db_plan?: DatabasePlan
  db_name?: string
  db_version?: string
  db_storage_gb?: number
  // Step 4 — Storage
  storage_type?: StorageType
  storage_gb?: number
  backup_policy?: BackupPolicy
  // Step 5 — Network
  vpc_name?: string
  subnet_name?: string
  firewall_profile?: FirewallProfile
  public_ip?: boolean
  // Step 6 — Project & Container
  project_action?: 'create' | 'connect' | 'skip'
  project_name?: string
  project_id?: string
  container_runtime?: ContainerRuntime
  container_template?: string
  // Step 7 — Environment
  environment_action?: 'create' | 'connect' | 'skip'
  environment_name?: string
  environment_type?: 'dev' | 'stage' | 'prod'
  environment_id?: string
  // Step 8 — Domain
  domain?: string
  auto_subdomain?: boolean
  subdomain_prefix?: string
  // Image pull
  pull_image?: boolean
  custom_image_url?: string
  // ── Context-aware architecture fields ────────────────────────────────────
  /** Set automatically from current URL via getResourceOrigin() */
  created_by_role?: 'enterprise' | 'developer'
  /** Which dashboard this workspace is being created from */
  created_from_dashboard?: 'enterprise' | 'developer' | 'group'
  /** Enterprise org slug, group id, or '' for personal workspaces */
  parent_context_id?: string
  /** Frontend URL the user navigates back to from this workspace */
  return_path?: string
}

// ─── API Functions ─────────────────────────────────────────────────────────────

/**
 * List dev workspaces for the current user filtered by dashboard context.
 *
 * Pass no args (or `{ dashboard: 'developer' }`) to get personal workspaces
 * only — enterprise workspaces are excluded by default.
 *
 * Pass `{ dashboard: 'enterprise', parent_context_id: orgSlug }` to get
 * workspaces created from that enterprise org.
 *
 * Pass `{ dashboard: 'group', parent_context_id: groupId }` to get group
 * workspaces.
 */
export async function listDevWorkspaces(
  params: ContextListParams = { dashboard: 'developer' },
): Promise<DevWorkspace[]> {
  const { data } = await client.get<DevWorkspace[] | { results: DevWorkspace[] }>(
    BASE + '/',
    { params },
  )
  return Array.isArray(data) ? data : (data as any).results ?? []
}

/** Get a single workspace by workspace_id */
export async function getDevWorkspace(workspaceId: string): Promise<DevWorkspace> {
  const { data } = await client.get<DevWorkspace>(`${BASE}/${workspaceId}/`)
  return data
}

/** Create a new developer workspace */
export async function createDevWorkspace(payload: CreateDevWorkspacePayload): Promise<DevWorkspace> {
  const { data } = await client.post<DevWorkspace>(BASE + '/', payload)
  return data
}

/** Delete a stopped workspace */
export async function deleteDevWorkspace(workspaceId: string): Promise<void> {
  await client.delete(`${BASE}/${workspaceId}/`)
}

/** Start a workspace — returns the updated workspace with editor_url populated */
export async function startDevWorkspace(workspaceId: string): Promise<DevWorkspace> {
  const { data } = await client.post<DevWorkspace>(`${BASE}/${workspaceId}/start/`)
  return data
}

/** Stop a running workspace */
export async function stopDevWorkspace(workspaceId: string): Promise<DevWorkspace> {
  const { data } = await client.post<DevWorkspace>(`${BASE}/${workspaceId}/stop/`)
  return data
}

/** Restart a workspace (stop + start in one call) */
export async function restartDevWorkspace(workspaceId: string): Promise<DevWorkspace> {
  const { data } = await client.post<DevWorkspace>(`${BASE}/${workspaceId}/restart/`)
  return data
}

/** Partial-update workspace fields including group connection */
export async function updateDevWorkspace(
  workspaceId: string,
  payload: Partial<Pick<DevWorkspace, 'display_name' | 'image' | 'ide' | 'region' | 'connected_group_id' | 'connected_group_name'>>,
): Promise<DevWorkspace> {
  const { data } = await client.patch<DevWorkspace>(`${BASE}/${workspaceId}/`, payload)
  return data
}

/** Build the full WebSocket URL from the backend's terminal_ws_url path */
export function buildTerminalWsUrl(terminalWsPath: string): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const envHost = typeof process !== 'undefined' ? (process.env as any).REACT_APP_WS_HOST : undefined
  const host = envHost ?? window.location.host
  return `${protocol}//${host}${terminalWsPath}`
}

/** Fetch the workspace creation catalog (compute plans, images, regions, etc.) */
export async function fetchWorkspaceCatalog(): Promise<WorkspaceCatalog> {
  const { data } = await client.get<WorkspaceCatalog>(`${BASE}/catalog/`)
  return data
}

/**
 * Submit the unified workspace setup payload.
 * POST /api/services/dev-workspaces/<workspace_id>/setup/
 * Returns the updated workspace with all connections persisted.
 */
export async function workspaceSetup(
  workspaceId: string,
  payload: WorkspaceSetupPayload,
): Promise<DevWorkspace> {
  const { data } = await client.post<DevWorkspace>(
    `${BASE}/${workspaceId}/setup/`,
    payload,
  )
  return data
}

/**
 * Fetch the Group-powered sidebar for this workspace.
 * GET /api/services/dev-workspaces/<workspace_id>/group-sidebar/
 * If no group is connected, sections will be empty.
 */
export async function getWorkspaceGroupSidebar(workspaceId: string): Promise<GroupSidebarData> {
  const { data } = await client.get(`${BASE}/${workspaceId}/group-sidebar/`)
  return data as GroupSidebarData
}

