import apiClient from './apiClient';

/* ───────── shared types ───────── */

export interface BackendPipeline {
  id: string;
  project: string;
  repo: string;
  pipeline_name: string;
  pipeline_file: string;
  branch: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'cancelled';
  triggered_by: string;
  started_at: string;
  finished_at: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface BackendPipelineJob {
  id: string;
  pipeline: string;
  name: string;
  stage: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'cancelled';
  started_at: string | null;
  finished_at: string | null;
}

export interface BackendJobLog {
  id: number;
  job: string;
  log: string;
  timestamp: string;
}

export interface BackendRepository {
  id: string;
  project: string;
  provider: 'github' | 'gitlab' | 'bitbucket';
  repo_name: string;
  default_branch: string;
  created_at?: string;
  updated_at?: string;
}

export interface BackendPipelineFile {
  id: string;
  repo: string;
  path: string;
  file_type: string;
}

export interface BackendPipelineArtifact {
  id: string;
  pipeline: string;
  name: string;
  path: string;
  size: number;
  created_at?: string;
}

/* ───────── Pipeline Definition types ───────── */

export type NodeStatus = 'pending' | 'running' | 'success' | 'failed' | 'skipped' | 'waiting' | 'cancelled';
export type StageType  = 'build' | 'test' | 'security' | 'deploy' | 'verify' | 'notify' | 'custom';
export type StepType   = 'script' | 'docker' | 'kubernetes' | 'approval' | 'notification' | 'artifact' | 'test' | 'scan';

export interface PipelineDefinitionStep {
  id:              number;
  name:            string;
  type:            StepType;
  script:          string;
  config_json:     Record<string, unknown>;
  order:           number;
  condition:       'always' | 'on_success' | 'on_failure';
  timeout_seconds: number;
  retry_count:     number;
}

export interface PipelineDefinitionStage {
  id:          number;
  definition:  string;
  name:        string;
  type:        StageType;
  order:       number;
  environment: string;
  parallel:    boolean;
  condition:   string;
  steps:       PipelineDefinitionStep[];
}

export interface PipelineDefinition {
  id:                  string;
  project:             string;
  project_name:        string;
  name:                string;
  description:         string;
  yaml_definition:     string;
  variables:           Array<{ name: string; value: string; secret?: boolean }>;
  triggers:            Array<Record<string, unknown>>;
  is_active:           boolean;
  created_by:          number | null;
  created_by_username: string | null;
  created_at:          string;
  updated_at:          string;
  stages:              PipelineDefinitionStage[];
  last_run_status:     NodeStatus | null;
  total_runs:          number;
}

export interface PipelineRunNode {
  id:          number;
  node_type:   'stage' | 'step';
  stage_name:  string;
  step_name:   string;
  status:      NodeStatus;
  order:       number;
  started_at:  string | null;
  finished_at: string | null;
  duration_s:  number | null;
  log_output:  string;
  error_msg:   string;
  artifacts:   Array<{ name: string; url: string }>;
}

export interface PipelineRunArtifact {
  id:            number;
  run:           string;
  node:          number | null;
  name:          string;
  artifact_type: string;
  storage_url:   string;
  size_bytes:    number;
  metadata:      Record<string, unknown>;
  created_at:    string;
}

export interface PipelineRun {
  id:              string;
  definition:      string;
  definition_name: string;
  project_name:    string;
  repo:            string | null;
  repo_name:       string | null;
  status:          NodeStatus;
  triggered_by:    string;
  branch:          string;
  commit_sha:      string;
  commit_msg:      string;
  variables:       Record<string, string>;
  started_at:      string | null;
  finished_at:     string | null;
  duration_s:      number | null;
  created_at:      string;
  updated_at:      string;
  nodes?:          PipelineRunNode[];
  run_artifacts?:  PipelineRunArtifact[];
}

/* ───────── Pipeline runs (legacy) ───────── */

export async function listPipelines(params?: {
  project?: string;
  repo?: string;
  status?: string;
  branch?: string;
}): Promise<BackendPipeline[]> {
  const response = await apiClient.get<BackendPipeline[]>('/api/services/pipelines/runs/', { params });
  return response.data;
}

export async function getPipeline(pipelineId: string): Promise<BackendPipeline> {
  const response = await apiClient.get<BackendPipeline>(`/api/services/pipelines/runs/${pipelineId}/`);
  return response.data;
}

export async function triggerPipeline(data: {
  pipeline_file: string;
  branch: string;
  environment?: string;
}): Promise<BackendPipeline> {
  const response = await apiClient.post<BackendPipeline>('/api/services/pipelines/runs/run/', data);
  return response.data;
}

export async function cancelPipeline(pipelineId: string): Promise<void> {
  await apiClient.post(`/api/services/pipelines/runs/${pipelineId}/cancel/`);
}

export async function approvePipeline(pipelineId: string, type = 'manual'): Promise<void> {
  await apiClient.post(`/api/services/pipelines/runs/${pipelineId}/approve/`, { type });
}

/* ───────── Jobs ───────── */

export async function listPipelineJobs(pipelineId: string): Promise<BackendPipelineJob[]> {
  const response = await apiClient.get<BackendPipelineJob[]>(`/api/services/pipelines/runs/${pipelineId}/jobs/`);
  return response.data;
}

export async function getJobLogs(jobId: string): Promise<BackendJobLog[]> {
  const response = await apiClient.get<BackendJobLog[]>(`/api/services/pipelines/jobs/${jobId}/logs/`);
  return response.data;
}

/* ───────── Repositories ───────── */

export async function listRepositories(params?: { project?: string }): Promise<BackendRepository[]> {
  const response = await apiClient.get<BackendRepository[]>('/api/services/pipelines/repositories/', { params });
  return Array.isArray(response.data) ? response.data : (response.data as any).results ?? [];
}

export async function getRepositoryBranches(repoId: string): Promise<{ name: string; commit: string }[]> {
  const response = await apiClient.get<{ name: string; commit: string }[]>(
    `/api/services/pipelines/repositories/${repoId}/branches/`,
  );
  return response.data;
}

/* ───────── Pipeline files ───────── */

export async function listPipelineFiles(): Promise<BackendPipelineFile[]> {
  const response = await apiClient.get<BackendPipelineFile[]>('/api/services/pipelines/files/');
  return response.data;
}

/* ───────── Artifacts ───────── */

export async function listArtifacts(params?: { pipeline?: string }): Promise<BackendPipelineArtifact[]> {
  const response = await apiClient.get<BackendPipelineArtifact[]>('/api/services/pipelines/artifacts/', { params });
  return response.data;
}

/* ───────── Projects ───────── */

export interface BackendProject {
  id: string;
  owner: number;
  name: string;
  description: string;
  created_at?: string;
  updated_at?: string;
}

export async function listProjects(): Promise<BackendProject[]> {
  const response = await apiClient.get<BackendProject[] | { results: BackendProject[] }>(
    '/api/services/pipelines/projects/',
  );
  const d = response.data;
  return Array.isArray(d) ? d : (d as any).results ?? [];
}

export async function createProject(data: { name: string; description?: string }): Promise<BackendProject> {
  const response = await apiClient.post<BackendProject>('/api/services/pipelines/projects/', data);
  return response.data;
}

/* ───────── Pipeline Definitions (new engine) ───────── */

export async function listDefinitions(params?: { project?: string; active?: boolean }): Promise<PipelineDefinition[]> {
  const response = await apiClient.get<PipelineDefinition[]>('/api/services/pipelines/definitions/', { params });
  return Array.isArray(response.data) ? response.data : (response.data as any).results ?? [];
}

export async function getDefinition(id: string): Promise<PipelineDefinition> {
  const response = await apiClient.get<PipelineDefinition>(`/api/services/pipelines/definitions/${id}/`);
  return response.data;
}

export async function createDefinition(data: {
  project: string;
  name: string;
  description?: string;
  yaml_definition?: string;
  variables?: Array<{ name: string; value: string; secret?: boolean }>;
  triggers?: Array<Record<string, unknown>>;
}): Promise<PipelineDefinition> {
  const response = await apiClient.post<PipelineDefinition>('/api/services/pipelines/definitions/', data);
  return response.data;
}

export async function updateDefinition(id: string, data: Partial<PipelineDefinition>): Promise<PipelineDefinition> {
  const response = await apiClient.patch<PipelineDefinition>(`/api/services/pipelines/definitions/${id}/`, data);
  return response.data;
}

export async function deleteDefinition(id: string): Promise<void> {
  await apiClient.delete(`/api/services/pipelines/definitions/${id}/`);
}

export async function getDefinitionYaml(id: string): Promise<string> {
  const response = await apiClient.get<{ yaml_definition: string }>(`/api/services/pipelines/definitions/${id}/yaml/`);
  return response.data.yaml_definition;
}

export async function updateDefinitionYaml(id: string, yamlText: string): Promise<string> {
  const response = await apiClient.put<{ yaml_definition: string }>(
    `/api/services/pipelines/definitions/${id}/yaml/`,
    { yaml_definition: yamlText },
  );
  return response.data.yaml_definition;
}

export async function triggerDefinition(id: string, data: {
  branch?: string;
  commit_sha?: string;
  commit_msg?: string;
  variables?: Record<string, string>;
  repo?: string | null;
}): Promise<PipelineRun> {
  const response = await apiClient.post<PipelineRun>(
    `/api/services/pipelines/definitions/${id}/trigger/`, data);
  return response.data;
}

export async function listDefinitionRuns(id: string): Promise<PipelineRun[]> {
  const response = await apiClient.get<PipelineRun[]>(`/api/services/pipelines/definitions/${id}/runs/`);
  return Array.isArray(response.data) ? response.data : [];
}

/* ───────── Pipeline Runs (new engine) ───────── */

export async function listPipelineRuns(params?: {
  definition?: string;
  status?: string;
}): Promise<PipelineRun[]> {
  const response = await apiClient.get<PipelineRun[]>('/api/services/pipelines/pipeline-runs/', { params });
  return Array.isArray(response.data) ? response.data : (response.data as any).results ?? [];
}

export async function getPipelineRun(id: string): Promise<PipelineRun> {
  const response = await apiClient.get<PipelineRun>(`/api/services/pipelines/pipeline-runs/${id}/`);
  return response.data;
}

export async function getRunGraph(id: string): Promise<PipelineRunNode[]> {
  const response = await apiClient.get<PipelineRunNode[]>(`/api/services/pipelines/pipeline-runs/${id}/graph/`);
  return response.data;
}

export async function getRunNodeLogs(runId: string, nodeId: number): Promise<{
  node_id: number; stage_name: string; step_name: string;
  status: NodeStatus; log_output: string; error_msg: string;
}> {
  const response = await apiClient.get(`/api/services/pipelines/pipeline-runs/${runId}/logs/${nodeId}/`);
  return response.data;
}

export async function cancelPipelineRun(id: string): Promise<PipelineRun> {
  const response = await apiClient.post<PipelineRun>(`/api/services/pipelines/pipeline-runs/${id}/cancel/`);
  return response.data;
}

export async function getRunArtifacts(id: string): Promise<PipelineRunArtifact[]> {
  const response = await apiClient.get<PipelineRunArtifact[]>(`/api/services/pipelines/pipeline-runs/${id}/artifacts/`);
  return Array.isArray(response.data) ? response.data : [];
}

/* ═══════════════════════════════════════════════════════════════════════════
   Group Pipeline (first-class pipelines owned by a Group)
   All endpoints live under /api/services/groups/{groupId}/group-pipelines/
   ═══════════════════════════════════════════════════════════════════════════ */

export type GroupPipelineType =
  | 'ci' | 'cd' | 'ci_cd' | 'build' | 'deploy'
  | 'release' | 'rollback' | 'scheduled' | 'custom';

export type GroupPipelineStatus = 'active' | 'disabled' | 'archived' | 'draft';

export type GroupPipelineTriggerSource = 'user' | 'webhook' | 'schedule' | 'api' | 'upstream';

export type GroupPipelineRunStatus =
  | 'queued' | 'running' | 'succeeded' | 'failed'
  | 'cancelled' | 'pending' | 'rolled_back';

/* ── Stage / Step shape stored in GroupPipeline.definition ── */
export interface GroupPipelineStep {
  id?:              string;
  name:             string;
  type:             string;          // script | docker | kubernetes | approval | …
  script?:          string;
  config?:          Record<string, unknown>;
  condition?:       'always' | 'on_success' | 'on_failure';
  timeout_seconds?: number;
  retry_count?:     number;
}

export interface GroupPipelineStage {
  id?:         string;
  name:        string;
  type?:       string;               // build | test | security | deploy | verify | …
  order?:      number;
  parallel?:   boolean;
  condition?:  string;
  environment?: string;
  steps:       GroupPipelineStep[];
}

export interface GroupPipelineDefinition {
  stages: GroupPipelineStage[];
}

/* ── Trigger config ── */
export interface GroupPipelineTrigger {
  type:            GroupPipelineTriggerSource;
  branch_pattern?: string;
  schedule?:       string;           // cron expression
  enabled?:        boolean;
}

/* ── Run summary (used in lists) ── */
export interface GroupPipelineRunSummary {
  id:           string;
  status:       GroupPipelineRunStatus;
  trigger_source: GroupPipelineTriggerSource;
  branch:       string;
  commit_sha:   string;
  started_at:   string | null;
  finished_at:  string | null;
  duration_s:   number | null;
  created_at:   string;
}

/* ── Full pipeline object ── */
export interface GroupPipeline {
  id:                    string;
  group:                 string;
  created_by:            number | null;
  created_by_username?:  string | null;
  updated_by:            number | null;
  name:                  string;
  slug:                  string;
  description:           string;
  pipeline_type:         GroupPipelineType;
  status:                GroupPipelineStatus;
  project_id:            string;
  project_name:          string;
  environment_targets:   string[];
  definition:            GroupPipelineDefinition;
  yaml_content:          string;
  triggers:              GroupPipelineTrigger[];
  upstream_pipeline_ids: string[];
  downstream_pipeline_ids: string[];
  notifications:         Record<string, unknown>;
  run_count:             number;
  last_run_status:       string;
  last_run_at:           string | null;
  avg_duration_s:        number;
  success_rate:          number;
  tags:                  string[];
  created_at:            string;
  updated_at:            string;
  last_run?:             GroupPipelineRunSummary | null;
}

/* ── Full run object ── */
export interface GroupPipelineRun {
  id:               string;
  pipeline:         string;
  triggered_by:     number | null;
  triggered_by_username?: string | null;
  trigger_source:   GroupPipelineTriggerSource;
  status:           GroupPipelineRunStatus;
  branch:           string;
  commit_sha:       string;
  commit_message:   string;
  environment_id:   string;
  environment_name: string;
  workspace_id:     string;
  parameters:       Record<string, unknown>;
  started_at:       string | null;
  finished_at:      string | null;
  duration_s:       number | null;
  stages_snapshot:  GroupPipelineStage[];
  artifacts:        Array<{ name: string; url?: string; type?: string }>;
  log_url:          string;
  metrics:          Record<string, unknown>;
  rolled_back_from: string | null;
  created_at:       string;
  updated_at:       string;
}

/* ── Create / update payloads ── */
export interface GroupPipelineCreatePayload {
  name:               string;
  description?:       string;
  pipeline_type?:     GroupPipelineType;
  status?:            GroupPipelineStatus;
  project_id?:        string;
  project_name?:      string;
  environment_targets?: string[];
  definition?:        GroupPipelineDefinition;
  yaml_content?:      string;
  triggers?:          GroupPipelineTrigger[];
  tags?:              string[];
  notifications?:     Record<string, unknown>;
}

export interface GroupPipelineRunPayload {
  branch?:         string;
  commit_sha?:     string;
  commit_message?: string;
  environment_id?: string;
  workspace_id?:   string;
  parameters?:     Record<string, unknown>;
  trigger_source?: GroupPipelineTriggerSource;
}

/* ═══════════════════════════════════════════════════════════════════════════
   API Functions
   ═══════════════════════════════════════════════════════════════════════════ */

const gpBase = (groupId: string) =>
  `/api/services/groups/${groupId}/group-pipelines`;

/** List all pipelines for a group. */
export async function listGroupPipelines(groupId: string): Promise<GroupPipeline[]> {
  const r = await apiClient.get<GroupPipeline[]>(`${gpBase(groupId)}/`);
  return Array.isArray(r.data) ? r.data : (r.data as any).results ?? [];
}

/** Retrieve a single pipeline by its ID. */
export async function getGroupPipeline(groupId: string, pipelineId: string): Promise<GroupPipeline> {
  const r = await apiClient.get<GroupPipeline>(`${gpBase(groupId)}/${pipelineId}/`);
  return r.data;
}

/** Create a new pipeline inside a group. */
export async function createGroupPipeline(
  groupId: string,
  payload: GroupPipelineCreatePayload,
): Promise<GroupPipeline> {
  const r = await apiClient.post<GroupPipeline>(`${gpBase(groupId)}/`, payload);
  return r.data;
}

/** Partial-update a pipeline (name, description, status, tags, …). */
export async function updateGroupPipeline(
  groupId: string,
  pipelineId: string,
  payload: Partial<GroupPipelineCreatePayload>,
): Promise<GroupPipeline> {
  const r = await apiClient.patch<GroupPipeline>(`${gpBase(groupId)}/${pipelineId}/`, payload);
  return r.data;
}

/** Delete a pipeline. */
export async function deleteGroupPipeline(groupId: string, pipelineId: string): Promise<void> {
  await apiClient.delete(`${gpBase(groupId)}/${pipelineId}/`);
}

/** GET or PUT the structured definition (stages/steps JSON). */
export async function getGroupPipelineDefinition(
  groupId: string,
  pipelineId: string,
): Promise<GroupPipelineDefinition> {
  const r = await apiClient.get<{ definition: GroupPipelineDefinition }>(
    `${gpBase(groupId)}/${pipelineId}/definition/`,
  );
  return r.data.definition;
}

export async function updateGroupPipelineDefinition(
  groupId: string,
  pipelineId: string,
  definition: GroupPipelineDefinition,
): Promise<GroupPipelineDefinition> {
  const r = await apiClient.put<{ definition: GroupPipelineDefinition }>(
    `${gpBase(groupId)}/${pipelineId}/definition/`,
    { definition },
  );
  return r.data.definition;
}

/** List runs for a pipeline. */
export async function listGroupPipelineRuns(
  groupId: string,
  pipelineId: string,
): Promise<GroupPipelineRun[]> {
  const r = await apiClient.get<GroupPipelineRun[]>(
    `${gpBase(groupId)}/${pipelineId}/runs/`,
  );
  return Array.isArray(r.data) ? r.data : (r.data as any).results ?? [];
}

/** Trigger a new run. */
export async function triggerGroupPipelineRun(
  groupId: string,
  pipelineId: string,
  payload?: GroupPipelineRunPayload,
): Promise<GroupPipelineRun> {
  const r = await apiClient.post<GroupPipelineRun>(
    `${gpBase(groupId)}/${pipelineId}/runs/`,
    payload ?? {},
  );
  return r.data;
}

/** Get a single run. */
export async function getGroupPipelineRun(
  groupId: string,
  pipelineId: string,
  runId: string,
): Promise<GroupPipelineRun> {
  const r = await apiClient.get<GroupPipelineRun>(
    `${gpBase(groupId)}/${pipelineId}/runs/${runId}/`,
  );
  return r.data;
}

/** Cancel a run. */
export async function cancelGroupPipelineRun(
  groupId: string,
  pipelineId: string,
  runId: string,
): Promise<GroupPipelineRun> {
  const r = await apiClient.post<GroupPipelineRun>(
    `${gpBase(groupId)}/${pipelineId}/runs/${runId}/cancel/`,
  );
  return r.data;
}

/** Rollback a run. */
export async function rollbackGroupPipelineRun(
  groupId: string,
  pipelineId: string,
  runId: string,
): Promise<GroupPipelineRun> {
  const r = await apiClient.post<GroupPipelineRun>(
    `${gpBase(groupId)}/${pipelineId}/runs/${runId}/rollback/`,
  );
  return r.data;
}
