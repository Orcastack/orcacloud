// OrcaCloud – Group Platform API Client

import client from './apiClient'

const BASE = '/api/services/groups'

function unwrap<T>(data: unknown): T[] {
  return Array.isArray(data) ? (data as T[]) : ((data as any)?.results ?? []) as T[]
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type GroupVisibility = 'public' | 'internal' | 'private'
export type GroupType = 'developer' | 'enterprise' | 'system' | 'production' | 'marketing' | 'data' | 'custom'
export type GroupRole =
  | 'owner'
  | 'admin'
  | 'architect'
  | 'devops_engineer'
  | 'developer'
  | 'data_scientist'
  | 'finance'
  | 'viewer'
export type InviteStatus = 'pending' | 'accepted' | 'declined' | 'expired'
export type ImportSource = 'github' | 'gitlab' | 'bitbucket' | 'orcacloud'

// Permission keys mirror the backend PERMISSION_MATRIX
export type GroupPermissionKey =
  | 'group.manage_members' | 'group.manage_settings' | 'group.delete' | 'group.transfer'
  | 'group.view_billing'  | 'group.manage_billing'
  | 'project.create' | 'project.edit' | 'project.delete' | 'project.view'
  | 'pipeline.run' | 'pipeline.cancel' | 'pipeline.create' | 'pipeline.edit'
  | 'pipeline.delete' | 'pipeline.view' | 'pipeline.approve'
  | 'environment.create' | 'environment.edit' | 'environment.promote'
  | 'environment.deploy' | 'environment.delete' | 'environment.view'
  | 'container.build' | 'container.push' | 'container.pull' | 'container.delete' | 'container.view'
  | 'kubernetes.deploy' | 'kubernetes.scale' | 'kubernetes.restart' | 'kubernetes.delete' | 'kubernetes.view'
  | 'secret.create' | 'secret.edit' | 'secret.view' | 'secret.delete'
  | 'env_var.create' | 'env_var.edit' | 'env_var.view' | 'env_var.delete'
  | 'deployment.trigger' | 'deployment.rollback' | 'deployment.approve' | 'deployment.view'
  | 'metrics.view' | 'logs.view'

export type GroupPermissionSet = Record<GroupPermissionKey, boolean>

export interface GroupPermissionsResponse {
  group_id:       string
  my_role:        GroupRole | null
  my_permissions: GroupPermissionSet
  /** Present only for owner / admin */
  role_matrix?:   Record<GroupRole, GroupPermissionSet>
}

export type ResourceType =
  | 'project' | 'pipeline' | 'environment' | 'container'
  | 'k8s_cluster' | 'secret' | 'env_var' | 'deployment'
  | 'metric_stream' | 'log_stream' | 'api_key' | 'storage' | 'domain'

export type ConfigFileType =
  | 'dockerfile' | 'pipeline_yaml' | 'k8s_manifest' | 'helm_chart'
  | 'terraform' | 'env_template' | 'buildpack' | 'ansible'
  | 'compose' | 'config_generic'

export interface GroupResources {
  projects?: boolean
  pipelines?: boolean
  runners?: boolean
  environments?: boolean
  deployments?: boolean
  observability?: boolean
  api_keys?: boolean
  secrets?: boolean
  storage_buckets?: boolean
  domains?: boolean
  billing?: boolean
}

export interface UserSummary {
  id: number
  username: string
  email: string
  display_name: string
}

export interface Group {
  id: string
  name: string
  handle: string
  description: string
  visibility: GroupVisibility
  group_type: GroupType
  avatar_url: string
  resources: GroupResources
  member_count: number
  project_count: number
  pipeline_count: number
  import_source: ImportSource | ''
  import_external_id: string
  owner: UserSummary
  my_role: GroupRole | null
  created_at: string
  updated_at: string
}

export interface GroupCreatePayload {
  name: string
  handle: string
  description?: string
  visibility: GroupVisibility
  group_type: GroupType
  avatar_url?: string
  resources?: GroupResources
}

export interface GroupUpdatePayload {
  name?: string
  description?: string
  visibility?: GroupVisibility
  group_type?: GroupType
  avatar_url?: string
  resources?: GroupResources
}

export interface GroupMember {
  id: string
  group: string
  user: UserSummary
  role: GroupRole
  invited_by: UserSummary | null
  created_at: string
}

export interface GroupInvitation {
  id: string
  group: string
  email: string
  role: GroupRole
  status: InviteStatus
  invited_by: UserSummary | null
  expires_at: string | null
  accepted_at: string | null
  created_at: string
}

export interface GroupAccessToken {
  id: string
  name: string
  scopes: string[]
  token_prefix: string
  expires_at: string | null
  last_used_at: string | null
  revoked: boolean
  created_by: UserSummary | null
  created_at: string
}

export interface GroupAuditLog {
  id: string
  actor: string
  action: string
  target: string
  detail: Record<string, unknown>
  created_at: string
}

// ── Resource Registry ─────────────────────────────────────────────────────────

export interface GroupRegisteredResource {
  id: string
  resource_type: ResourceType
  resource_id: string
  resource_name: string
  resource_slug: string
  status: 'active' | 'inactive' | 'error' | 'pending'
  region: string
  environment: string
  tags: string[]
  metadata: Record<string, unknown>
  discovered_at: string | null
  created_at: string
}

export interface GroupRegisteredResourceCreatePayload {
  resource_type: ResourceType
  resource_id: string
  resource_name: string
  resource_slug?: string
  status?: 'active' | 'inactive' | 'pending'
  region?: string
  environment?: string
  tags?: string[]
  metadata?: Record<string, unknown>
}

// ── Config Registry ───────────────────────────────────────────────────────────

export interface GroupConfigFile {
  id: string
  project_id: string
  file_type: ConfigFileType
  file_name: string
  file_path: string
  repo_url: string
  branch: string
  content_preview: string
  sha: string
  last_indexed_at: string | null
  tags: string[]
  created_at: string
}

export interface GroupConfigFileCreatePayload {
  project_id?: string
  file_type: ConfigFileType
  file_name: string
  file_path: string
  repo_url?: string
  branch?: string
  content_preview?: string
  sha?: string
  tags?: string[]
}

// ── Resource Bundle ───────────────────────────────────────────────────────────

export interface GroupResourceItem {
  id: string
  name: string
  slug: string
  status: string
  region: string
  environment: string
  tags: string[]
  metadata: Record<string, unknown>
  created_at: string | null
}

export interface GroupResourceBundle {
  projects:       GroupResourceItem[]
  pipelines:      GroupResourceItem[]
  environments:   GroupResourceItem[]
  containers:     GroupResourceItem[]
  k8s_clusters:   GroupResourceItem[]
  secrets:        GroupResourceItem[]
  env_vars:       GroupResourceItem[]
  deployments:    GroupResourceItem[]
  metric_streams: GroupResourceItem[]
  log_streams:    GroupResourceItem[]
  api_keys:       GroupResourceItem[]
  config_files:   GroupConfigFile[]
  resource_counts: Record<string, number>
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

export interface GroupSidebarSection {
  id: string
  label: string
  count: number
  badge: string
  status: string
}

export interface GroupSidebarData {
  group_id: string
  group_name: string
  group_handle: string
  group_type: GroupType | ''
  sections: GroupSidebarSection[]
  workspace_connected?: boolean
}

// ── Workspace connection ──────────────────────────────────────────────────────

export interface GroupWorkspaceSummary {
  workspace_id: string
  display_name: string
  status: string
  region: string
  owner: string
  created_at: string
  started_at: string | null
}

// ── Discovery ────────────────────────────────────────────────────────────────

export interface GroupDiscoveryResult {
  status: string
  group: string
  newly_registered: number
  resources: GroupRegisteredResource[]
}

// ─── Group CRUD ───────────────────────────────────────────────────────────────

export async function listGroups(): Promise<Group[]> {
  const { data } = await client.get(`${BASE}/`)
  return unwrap<Group>(data)
}

export async function getGroup(id: string): Promise<Group> {
  const { data } = await client.get(`${BASE}/${id}/`)
  return data
}

export async function createGroup(payload: GroupCreatePayload): Promise<Group> {
  const { data } = await client.post(`${BASE}/`, payload)
  return data
}

export async function updateGroup(id: string, payload: GroupUpdatePayload): Promise<Group> {
  const { data } = await client.patch(`${BASE}/${id}/`, payload)
  return data
}

export async function deleteGroup(id: string): Promise<void> {
  await client.delete(`${BASE}/${id}/`)
}

// ─── Members ──────────────────────────────────────────────────────────────────

export async function listMembers(groupId: string): Promise<GroupMember[]> {
  const { data } = await client.get(`${BASE}/${groupId}/members/`)
  return unwrap<GroupMember>(data)
}

export async function addMember(groupId: string, userId: number, role: GroupRole): Promise<GroupMember> {
  const { data } = await client.post(`${BASE}/${groupId}/members/add/`, { user_id: userId, role })
  return data
}

export async function removeMember(groupId: string, memberId: string): Promise<void> {
  await client.delete(`${BASE}/${groupId}/members/${memberId}/`)
}

export async function updateMemberRole(groupId: string, memberId: string, role: GroupRole): Promise<GroupMember> {
  const { data } = await client.patch(`${BASE}/${groupId}/members/${memberId}/role/`, { role })
  return data
}

export async function leaveGroup(groupId: string): Promise<void> {
  await client.post(`${BASE}/${groupId}/leave/`)
}

export async function transferOwnership(groupId: string, userId: number): Promise<void> {
  await client.post(`${BASE}/${groupId}/transfer/`, { user_id: userId })
}

// ─── Invitations ─────────────────────────────────────────────────────────────

export async function listInvitations(groupId: string): Promise<GroupInvitation[]> {
  const { data } = await client.get(`${BASE}/${groupId}/invite/`)
  return unwrap<GroupInvitation>(data)
}

export async function inviteToGroup(groupId: string, email: string, role: GroupRole): Promise<GroupInvitation> {
  const { data } = await client.post(`${BASE}/${groupId}/invite/`, { email, role })
  return data
}

export async function acceptInvitation(groupId: string, inviteId: string): Promise<GroupMember> {
  const { data } = await client.post(`${BASE}/${groupId}/invitations/${inviteId}/accept/`)
  return data
}

export async function declineInvitation(groupId: string, inviteId: string): Promise<void> {
  await client.post(`${BASE}/${groupId}/invitations/${inviteId}/decline/`)
}

export async function cancelInvitation(groupId: string, inviteId: string): Promise<void> {
  await client.delete(`${BASE}/${groupId}/invitations/${inviteId}/cancel/`)
}

// ─── Permissions ─────────────────────────────────────────────────────────────

export async function getGroupPermissions(groupId: string): Promise<GroupPermissionsResponse> {
  const { data } = await client.get(`${BASE}/${groupId}/permissions/`)
  return data as GroupPermissionsResponse
}

// ─── Access Tokens ────────────────────────────────────────────────────────────

export async function listTokens(groupId: string): Promise<GroupAccessToken[]> {
  const { data } = await client.get(`${BASE}/${groupId}/tokens/`)
  return unwrap<GroupAccessToken>(data)
}

export async function createToken(
  groupId: string,
  payload: Pick<GroupAccessToken, 'name' | 'scopes' | 'expires_at'>,
): Promise<GroupAccessToken> {
  const { data } = await client.post(`${BASE}/${groupId}/tokens/`, payload)
  return data
}

export async function revokeToken(groupId: string, tokenId: string): Promise<void> {
  await client.delete(`${BASE}/${groupId}/tokens/${tokenId}/`)
}

// ─── Audit Logs ───────────────────────────────────────────────────────────────

export async function listAuditLogs(groupId: string): Promise<GroupAuditLog[]> {
  const { data } = await client.get(`${BASE}/${groupId}/audit/`)
  return unwrap<GroupAuditLog>(data)
}

// ─── Group Projects ───────────────────────────────────────────────────────────

export type ProjectStatus = 'active' | 'in-progress' | 'completed' | 'archived'
export type BuildStatus   = 'passing' | 'failing'   | 'pending'
export type ProjectLang   = 'TypeScript' | 'Python' | 'Go' | 'Rust' | 'Java' | 'HCL'

export interface GroupProject {
  id:          string
  name:        string
  description: string
  status:      ProjectStatus
  language:    ProjectLang
  branch:      string
  progress:    number
  open_issues: number
  last_build:  BuildStatus
  updated_at:  string
  tags:        string[]
  starred:     boolean
}

export interface GroupProjectCreatePayload {
  name:         string
  description?: string
  visibility?:  'public' | 'internal' | 'private'
  language?:    ProjectLang
}

export async function listGroupProjects(groupId: string): Promise<GroupProject[]> {
  try {
    const { data } = await client.get(`${BASE}/${groupId}/projects/`)
    return unwrap<GroupProject>(data)
  } catch {
    return []
  }
}

export async function createGroupProject(
  groupId: string,
  payload: GroupProjectCreatePayload,
): Promise<GroupProject | null> {
  try {
    const { data } = await client.post(`${BASE}/${groupId}/projects/`, payload)
    return data as GroupProject
  } catch {
    return null
  }
}

// ─── Resource Registry ────────────────────────────────────────────────────────

export async function getGroupResources(groupId: string): Promise<GroupResourceBundle> {
  const { data } = await client.get(`${BASE}/${groupId}/resources/`)
  return data as GroupResourceBundle
}

export async function registerGroupResource(
  groupId: string,
  payload: GroupRegisteredResourceCreatePayload,
): Promise<GroupRegisteredResource> {
  const { data } = await client.post(`${BASE}/${groupId}/resources/`, payload)
  return data as GroupRegisteredResource
}

export async function removeGroupResource(groupId: string, registryId: string): Promise<void> {
  await client.delete(`${BASE}/${groupId}/resources/${registryId}/`)
}

// ─── Config Files ─────────────────────────────────────────────────────────────

export async function listGroupConfigFiles(groupId: string): Promise<GroupConfigFile[]> {
  const { data } = await client.get(`${BASE}/${groupId}/config-files/`)
  return unwrap<GroupConfigFile>(data)
}

export async function registerGroupConfigFile(
  groupId: string,
  payload: GroupConfigFileCreatePayload,
): Promise<GroupConfigFile> {
  const { data } = await client.post(`${BASE}/${groupId}/config-files/`, payload)
  return data as GroupConfigFile
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export async function getGroupSidebar(groupId: string): Promise<GroupSidebarData> {
  const { data } = await client.get(`${BASE}/${groupId}/sidebar/`)
  return data as GroupSidebarData
}

// ─── Workspaces ───────────────────────────────────────────────────────────────

export async function listGroupWorkspaces(groupId: string): Promise<GroupWorkspaceSummary[]> {
  const { data } = await client.get(`${BASE}/${groupId}/workspaces/`)
  return unwrap<GroupWorkspaceSummary>(data)
}

// ─── Discovery ────────────────────────────────────────────────────────────────

export async function triggerGroupDiscovery(groupId: string): Promise<GroupDiscoveryResult> {
  const { data } = await client.post(`${BASE}/${groupId}/discover/`)
  return data as GroupDiscoveryResult
}

// ─── Legacy compat export (kept for any existing imports) ─────────────────────
export const groupsApi = { listGroups, getGroup, createGroup, updateGroup, deleteGroup }
export default groupsApi

// ════════════════════════════════════════════════════════════════════════════
// Group Pipelines  (first-class pipeline definitions owned by a group)
// ════════════════════════════════════════════════════════════════════════════

export type PipelineType =
  | 'ci' | 'cd' | 'ci_cd' | 'build' | 'deploy'
  | 'release' | 'rollback' | 'scheduled' | 'custom'

export type PipelineStatus = 'active' | 'disabled' | 'archived' | 'draft'

export type PipelineRunStatus =
  | 'queued' | 'running' | 'succeeded' | 'failed'
  | 'cancelled' | 'pending' | 'rolled_back'

export type PipelineTriggerSource = 'user' | 'webhook' | 'schedule' | 'api' | 'upstream'

// ── Stage / Step definition ──────────────────────────────────────────────────

export interface PipelineStep {
  name:        string
  type:        'script' | 'docker' | 'kubernetes' | 'approval' | 'notification' | 'artifact' | 'test' | 'scan'
  command?:    string
  image?:      string
  env?:        Record<string, string>
  condition?:  string
  timeout_s?:  number
  status?:     'pending' | 'running' | 'succeeded' | 'failed' | 'skipped'
  log?:        string
}

export interface PipelineStage {
  name:        string
  type?:       'build' | 'test' | 'security' | 'deploy' | 'verify' | 'notify' | 'rollback' | 'custom'
  steps:       PipelineStep[]
  depends_on?: string[]
  condition?:  string
  status?:     'pending' | 'running' | 'succeeded' | 'failed' | 'skipped'
}

export interface PipelineDefinition {
  stages:     PipelineStage[]
  variables?: Record<string, string>
  timeout_s?: number
}

export interface PipelineTriggerConfig {
  type:             PipelineTriggerSource
  branch_pattern?:  string
  tag_pattern?:     string
  schedule?:        string   // cron expression
  pipeline_id?:     string   // upstream trigger
}

// ── GroupPipeline entity ─────────────────────────────────────────────────────

export interface GroupPipelineRunSummary {
  id:               string
  status:           PipelineRunStatus
  trigger_source:   PipelineTriggerSource
  branch:           string
  commit_sha:       string
  commit_message:   string
  environment_id:   string
  environment_name: string
  workspace_id:     string
  started_at:       string | null
  finished_at:      string | null
  duration_s:       number | null
  triggered_by:     UserSummary | null
  created_at:       string
}

export interface GroupPipeline {
  id:                       string
  name:                     string
  slug:                     string
  description:              string
  pipeline_type:            PipelineType
  status:                   PipelineStatus
  project_id:               string
  project_name:             string
  environment_targets:      string[]
  definition:               PipelineDefinition
  yaml_content:             string
  triggers:                 PipelineTriggerConfig[]
  upstream_pipeline_ids:    string[]
  downstream_pipeline_ids:  string[]
  notifications:            Record<string, unknown>
  tags:                     string[]
  run_count:                number
  last_run_status:          string
  last_run_at:              string | null
  avg_duration_s:           number
  success_rate:             number
  created_by:               UserSummary | null
  updated_by:               UserSummary | null
  created_at:               string
  updated_at:               string
  last_run:                 GroupPipelineRunSummary | null
}

export interface GroupPipelineCreatePayload {
  name:                     string
  slug:                     string
  description?:             string
  pipeline_type?:           PipelineType
  status?:                  PipelineStatus
  project_id?:              string
  project_name?:            string
  environment_targets?:     string[]
  definition?:              PipelineDefinition
  yaml_content?:            string
  triggers?:                PipelineTriggerConfig[]
  upstream_pipeline_ids?:   string[]
  downstream_pipeline_ids?: string[]
  notifications?:           Record<string, unknown>
  tags?:                    string[]
}

export interface GroupPipelineUpdatePayload extends Partial<Omit<GroupPipelineCreatePayload, 'slug'>> {}

export interface GroupPipelineRun {
  id:               string
  pipeline:         string
  pipeline_name:    string
  pipeline_slug:    string
  status:           PipelineRunStatus
  trigger_source:   PipelineTriggerSource
  triggered_by:     UserSummary | null
  branch:           string
  commit_sha:       string
  commit_message:   string
  environment_id:   string
  environment_name: string
  workspace_id:     string
  parameters:       Record<string, unknown>
  started_at:       string | null
  finished_at:      string | null
  duration_s:       number | null
  stages_snapshot:  PipelineStage[]
  artifacts:        unknown[]
  log_url:          string
  metrics:          Record<string, unknown>
  rolled_back_from: string | null
  created_at:       string
}

export interface TriggerRunPayload {
  branch?:           string
  commit_sha?:       string
  commit_message?:   string
  environment_id?:   string
  environment_name?: string
  workspace_id?:     string
  parameters?:       Record<string, unknown>
  trigger_source?:   PipelineTriggerSource
}

// ── API functions ─────────────────────────────────────────────────────────────

export async function listGroupPipelines(
  groupId: string,
  statusFilter?: PipelineStatus,
): Promise<GroupPipeline[]> {
  const params = statusFilter ? { status: statusFilter } : {}
  const { data } = await client.get(`${BASE}/${groupId}/group-pipelines/`, { params })
  return unwrap<GroupPipeline>(data)
}

export async function createGroupPipeline(
  groupId: string,
  payload: GroupPipelineCreatePayload,
): Promise<GroupPipeline> {
  const { data } = await client.post(`${BASE}/${groupId}/group-pipelines/`, payload)
  return data as GroupPipeline
}

export async function getGroupPipeline(
  groupId: string,
  pipelineId: string,
): Promise<GroupPipeline> {
  const { data } = await client.get(`${BASE}/${groupId}/group-pipelines/${pipelineId}/`)
  return data as GroupPipeline
}

export async function updateGroupPipeline(
  groupId: string,
  pipelineId: string,
  payload: GroupPipelineUpdatePayload,
): Promise<GroupPipeline> {
  const { data } = await client.patch(`${BASE}/${groupId}/group-pipelines/${pipelineId}/`, payload)
  return data as GroupPipeline
}

export async function deleteGroupPipeline(groupId: string, pipelineId: string): Promise<void> {
  await client.delete(`${BASE}/${groupId}/group-pipelines/${pipelineId}/`)
}

// ── Definition ────────────────────────────────────────────────────────────────

export async function getGroupPipelineDefinition(
  groupId: string,
  pipelineId: string,
): Promise<{ id: string; name: string; slug: string; definition: PipelineDefinition; yaml_content: string; triggers: PipelineTriggerConfig[] }> {
  const { data } = await client.get(`${BASE}/${groupId}/group-pipelines/${pipelineId}/definition/`)
  return data
}

export async function updateGroupPipelineDefinition(
  groupId: string,
  pipelineId: string,
  payload: { definition?: PipelineDefinition; yaml_content?: string; triggers?: PipelineTriggerConfig[] },
): Promise<{ definition: PipelineDefinition; yaml_content: string }> {
  const { data } = await client.patch(`${BASE}/${groupId}/group-pipelines/${pipelineId}/definition/`, payload)
  return data
}

// ── Runs ───────────────────────────────────────────────────────────────────────

export async function listGroupPipelineRuns(
  groupId: string,
  pipelineId: string,
): Promise<GroupPipelineRun[]> {
  const { data } = await client.get(`${BASE}/${groupId}/group-pipelines/${pipelineId}/runs/`)
  return unwrap<GroupPipelineRun>(data)
}

export async function triggerGroupPipelineRun(
  groupId: string,
  pipelineId: string,
  payload?: TriggerRunPayload,
): Promise<GroupPipelineRun> {
  const { data } = await client.post(
    `${BASE}/${groupId}/group-pipelines/${pipelineId}/runs/`,
    payload ?? {},
  )
  return data as GroupPipelineRun
}

export async function getGroupPipelineRun(
  groupId: string,
  pipelineId: string,
  runId: string,
): Promise<GroupPipelineRun> {
  const { data } = await client.get(
    `${BASE}/${groupId}/group-pipelines/${pipelineId}/runs/${runId}/`,
  )
  return data as GroupPipelineRun
}

export async function cancelGroupPipelineRun(
  groupId: string,
  pipelineId: string,
  runId: string,
): Promise<GroupPipelineRun> {
  const { data } = await client.post(
    `${BASE}/${groupId}/group-pipelines/${pipelineId}/runs/${runId}/cancel/`,
  )
  return data as GroupPipelineRun
}

export async function rollbackGroupPipelineRun(
  groupId: string,
  pipelineId: string,
  runId: string,
): Promise<GroupPipelineRun> {
  const { data } = await client.post(
    `${BASE}/${groupId}/group-pipelines/${pipelineId}/runs/${runId}/rollback/`,
  )
  return data as GroupPipelineRun
}

