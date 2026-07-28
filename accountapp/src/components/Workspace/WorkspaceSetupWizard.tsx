import React, { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CloseIcon from '@mui/icons-material/Close'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import { dashboardSemanticColors, dashboardTokens } from '../../styles/dashboardDesignSystem'
import {
  type DevWorkspace,
  type WorkspaceSetupPayload,
  workspaceSetup,
} from '../../services/devWorkspaceApi'
import {
  createProject,
  listProjects,
  type BackendProject,
} from '../../services/projectsApi'
import {
  createEnvironment,
  listEnvironments,
  type ApiEnvironment,
} from '../../services/environmentsApi'
import {
  createGroup,
  listGroups,
  type Group,
} from '../../services/groupsApi'
import {
  listPipelines,
  type BackendPipeline,
} from '../../services/pipelinesApi'

const FONT = dashboardTokens.typography.fontFamily
const T = dashboardTokens.colors
const S = dashboardSemanticColors

type SetupMode = 'create' | 'connect' | 'skip'

export interface WorkspaceSetupWizardResult {
  project?: {
    id: string
    name: string
    project_key: string
    repo_count: number
    last_activity: string | null
    description: string
  }
  environment?: {
    id: string
    name: string
    health: 'healthy' | 'degraded' | 'down'
    version: string
    lastDeploy: string
    errorRate: string
  }
  pipeline?: {
    id: string
    name: string
    branch: string
    status: 'running' | 'passed' | 'failed'
    startedAt: string
  }
}

interface Props {
  open: boolean
  workspace: DevWorkspace
  onClose: () => void
  onCompleted: (updated: DevWorkspace, result: WorkspaceSetupWizardResult) => void
}

function slugify(v: string): string {
  return v
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
}

export default function WorkspaceSetupWizard({ open, workspace, onClose, onCompleted }: Props) {
  const [busy, setBusy] = useState(false)
  const [projects, setProjects] = useState<BackendProject[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [environments, setEnvironments] = useState<ApiEnvironment[]>([])
  const [pipelines, setPipelines] = useState<BackendPipeline[]>([])

  const [projectMode, setProjectMode] = useState<SetupMode>('skip')
  const [projectName, setProjectName] = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  const [projectRepoOption, setProjectRepoOption] = useState<'empty' | 'github' | 'gitlab' | 'bitbucket'>('empty')
  const [projectRepoUrl, setProjectRepoUrl] = useState('')
  const [projectAutoCicd, setProjectAutoCicd] = useState<'yes' | 'no'>('yes')
  const [projectId, setProjectId] = useState('')
  const [projectAutoSync, setProjectAutoSync] = useState<'yes' | 'no'>('yes')
  const [projectAutoPipeline, setProjectAutoPipeline] = useState<'yes' | 'no'>('yes')

  const [containerMode, setContainerMode] = useState<SetupMode>('skip')
  const [containerName, setContainerName] = useState('')
  const [containerType, setContainerType] = useState<'app' | 'worker' | 'cron' | 'api' | 'custom'>('app')
  const [containerAttachProject, setContainerAttachProject] = useState<'yes' | 'no'>('yes')
  const [containerConnectRepo, setContainerConnectRepo] = useState<'yes' | 'no'>('yes')
  const [containerConnectPipeline, setContainerConnectPipeline] = useState<'yes' | 'no'>('yes')
  const [containerRuntimeSize, setContainerRuntimeSize] = useState<'s' | 'm' | 'l' | 'xl'>('m')
  const [containerScalingMode, setContainerScalingMode] = useState<'manual' | 'auto'>('manual')
  const [containerId, setContainerId] = useState('')
  const [containerAttachEnv, setContainerAttachEnv] = useState<'yes' | 'no'>('no')

  const [environmentMode, setEnvironmentMode] = useState<SetupMode>('skip')
  const [environmentName, setEnvironmentName] = useState('')
  const [environmentType, setEnvironmentType] = useState<'dev' | 'stage' | 'prod'>('dev')
  const [environmentRegion, setEnvironmentRegion] = useState('us-east-1')
  const [environmentAutoDeploy, setEnvironmentAutoDeploy] = useState<'yes' | 'no'>('yes')
  const [environmentId, setEnvironmentId] = useState('')
  const [environmentSyncVars, setEnvironmentSyncVars] = useState<'yes' | 'no'>('yes')
  const [environmentSyncSecrets, setEnvironmentSyncSecrets] = useState<'yes' | 'no'>('yes')

  const [groupMode, setGroupMode] = useState<SetupMode>('skip')
  const [groupName, setGroupName] = useState('')
  const [groupDescription, setGroupDescription] = useState('')
  const [groupMembers, setGroupMembers] = useState('')
  const [groupId, setGroupId] = useState('')
  const [groupRole, setGroupRole] = useState<'owner' | 'maintainer' | 'developer' | 'viewer'>('developer')

  const [pipelineId, setPipelineId] = useState('')
  const [pipelineAutoTrigger, setPipelineAutoTrigger] = useState<'yes' | 'no'>('no')

  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    Promise.allSettled([listProjects(), listGroups()]).then(([pRes, gRes]) => {
      setProjects(pRes.status === 'fulfilled' ? pRes.value : [])
      setGroups(gRes.status === 'fulfilled' ? gRes.value : [])
    })
  }, [open])

  const effectiveProjectId = useMemo(() => {
    if (projectMode === 'connect') return projectId
    return ''
  }, [projectId, projectMode])

  useEffect(() => {
    if (!open || !effectiveProjectId) {
      setEnvironments([])
      setPipelines([])
      return
    }
    Promise.allSettled([
      listEnvironments(effectiveProjectId),
      listPipelines({ project: effectiveProjectId }),
    ]).then(([eRes, pRes]) => {
      setEnvironments(eRes.status === 'fulfilled' ? eRes.value : [])
      setPipelines(pRes.status === 'fulfilled' ? pRes.value : [])
    })
  }, [effectiveProjectId, open])

  const containerChoices = useMemo(
    () => workspace.connected_container_ids ?? [],
    [workspace.connected_container_ids],
  )

  const pipelineStatusText = [
    workspace.pipeline_last_run ? `Last run: ${new Date(workspace.pipeline_last_run).toLocaleString()}` : 'Last run: —',
    workspace.pipeline_last_success ? `Last success: ${new Date(workspace.pipeline_last_success).toLocaleString()}` : 'Last success: —',
    workspace.pipeline_last_failure ? `Last failure: ${new Date(workspace.pipeline_last_failure).toLocaleString()}` : 'Last failure: —',
  ].join(' · ')

  const summary = {
    workspace: true,
    project: projectMode !== 'skip',
    repository: projectMode !== 'skip',
    container: containerMode !== 'skip',
    environment: environmentMode !== 'skip',
    group: groupMode !== 'skip',
    pipeline: !!pipelineId || pipelineAutoTrigger === 'yes',
  }

  const submit = async () => {
    setBusy(true)
    setError(null)

    try {
      const payload: WorkspaceSetupPayload = {
        project_action: projectMode,
        project_name: projectName,
        project_description: projectDescription,
        project_repo_option: projectRepoOption,
        project_repo_url: projectRepoUrl,
        project_auto_cicd: projectAutoCicd === 'yes',
        project_id: projectId,
        project_auto_sync: projectAutoSync === 'yes',
        project_auto_pipeline: projectAutoPipeline === 'yes',

        container_action: containerMode,
        container_name: containerName,
        container_type: containerType,
        container_runtime_size: containerRuntimeSize,
        container_scaling_mode: containerScalingMode,
        container_attach_project: containerAttachProject === 'yes',
        container_connect_repo: containerConnectRepo === 'yes',
        container_connect_pipeline: containerConnectPipeline === 'yes',
        container_id: containerId,
        container_attach_env: containerAttachEnv === 'yes',

        environment_action: environmentMode,
        environment_name: environmentName,
        environment_type: environmentType,
        environment_region: environmentRegion,
        environment_auto_deploy: environmentAutoDeploy === 'yes',
        environment_id: environmentId,
        environment_sync_vars: environmentSyncVars === 'yes',
        environment_sync_secrets: environmentSyncSecrets === 'yes',

        group_action: groupMode,
        group_name: groupName,
        group_description: groupDescription,
        group_members: groupMembers
          .split(',')
          .map(v => v.trim())
          .filter(Boolean),
        group_id: groupId,
        group_role: groupRole,

        pipeline_id: pipelineId,
        pipeline_auto_trigger: pipelineAutoTrigger === 'yes',
      }

      let selectedProject: BackendProject | undefined = projects.find(p => String(p.id) === projectId)
      let selectedEnv: ApiEnvironment | undefined = environments.find(e => String(e.id) === environmentId)
      let selectedGroup: Group | undefined = groups.find(g => String(g.id) === groupId)

      if (projectMode === 'create' && projectName.trim()) {
        selectedProject = await createProject({
          name: projectName.trim(),
          description: projectDescription.trim(),
          visibility: 'private',
        })
        payload.project_id = String(selectedProject.id)
        payload.project_name = selectedProject.name
      }

      if (environmentMode === 'create' && environmentName.trim()) {
        const envProjectId = payload.project_id || selectedProject?.id
        if (!envProjectId) {
          throw new Error('Create or connect a project before creating an environment.')
        }
        selectedEnv = await createEnvironment({
          name: environmentName.trim(),
          region: environmentRegion.trim() || workspace.region,
          description: `${environmentType.toUpperCase()} environment`,
          project: String(envProjectId),
          auto_deploy: environmentAutoDeploy === 'yes',
          deployment_strategy: 'rolling',
          require_approval: environmentType === 'prod',
          is_protected: environmentType === 'prod',
          notify_email: '',
        })
        payload.environment_id = String(selectedEnv.id)
        payload.environment_name = selectedEnv.name
      }

      if (groupMode === 'create' && groupName.trim()) {
        const safeName = groupName.trim()
        selectedGroup = await createGroup({
          name: safeName,
          handle: slugify(safeName),
          description: groupDescription.trim(),
          visibility: 'private',
          group_type: 'developer',
        })
        payload.group_id = String(selectedGroup.id)
        payload.group_name = selectedGroup.name
      }

      if (projectMode === 'connect' && selectedProject) payload.project_name = selectedProject.name
      if (environmentMode === 'connect' && selectedEnv) payload.environment_name = selectedEnv.name
      if (groupMode === 'connect' && selectedGroup) payload.group_name = selectedGroup.name
      if (containerMode === 'create' && containerName.trim()) payload.container_id = slugify(containerName)

      const updated = await workspaceSetup(workspace.workspace_id, payload)

      const selectedPipeline = pipelines.find(p => String(p.id) === pipelineId)

      const result: WorkspaceSetupWizardResult = {
        project: selectedProject ? {
          id: String(selectedProject.id),
          name: selectedProject.name,
          project_key: selectedProject.project_key,
          repo_count: selectedProject.repo_count ?? 0,
          last_activity: selectedProject.last_activity ?? null,
          description: selectedProject.description ?? '',
        } : undefined,
        environment: selectedEnv ? {
          id: String(selectedEnv.id),
          name: selectedEnv.name,
          health: 'healthy',
          version: '—',
          lastDeploy: selectedEnv.updated_at ? new Date(selectedEnv.updated_at).toLocaleDateString() : '—',
          errorRate: '—',
        } : undefined,
        pipeline: selectedPipeline && pipelineAutoTrigger === 'yes' ? {
          id: String(selectedPipeline.id),
          name: selectedPipeline.pipeline_name || selectedPipeline.pipeline_file,
          branch: selectedPipeline.branch || 'main',
          status: 'running',
          startedAt: new Date().toISOString(),
        } : undefined,
      }

      onCompleted(updated, result)
      onClose()
    } catch (e: any) {
      setError(e?.message || e?.response?.data?.detail || 'Failed to finish workspace setup.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{ sx: { bgcolor: T.surface, border: `1px solid ${T.border}`, borderRadius: '16px' } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Stack spacing={0.4}>
          <Typography sx={{ fontFamily: FONT, fontWeight: 800, fontSize: '1.05rem', color: T.textPrimary }}>
            Workspace Dashboard Setup
          </Typography>
          <Typography sx={{ fontFamily: FONT, fontSize: '.78rem', color: T.textSecondary }}>
            Unified creation & connection form for project, repository, containers, environment, group, and pipeline.
          </Typography>
        </Stack>
        <IconButton size="small" onClick={onClose} disabled={busy}>
          <CloseIcon sx={{ fontSize: '1rem', color: T.textSecondary }} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 0 }}>
        <Stack spacing={2.25}>
          <Box sx={{ p: 2, borderRadius: '12px', border: `1px solid ${T.border}`, bgcolor: T.surfaceSubtle }}>
            <Typography sx={{ fontFamily: FONT, fontWeight: 700, color: T.textPrimary, mb: 1.2 }}>1. Workspace Overview</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.25 }}>
              <TextField label="Workspace Name" size="small" value={workspace.display_name} InputProps={{ readOnly: true }} />
              <TextField label="Workspace ID" size="small" value={workspace.workspace_id} InputProps={{ readOnly: true }} />
              <TextField label="Status" size="small" value={workspace.status} InputProps={{ readOnly: true }} />
              <TextField label="Connected Project" size="small" value={workspace.connected_project_name || 'None connected'} InputProps={{ readOnly: true }} />
              <TextField label="Connected Environment" size="small" value={workspace.connected_env_name || 'None connected'} InputProps={{ readOnly: true }} />
              <TextField label="Pipeline Status" size="small" value={pipelineStatusText} InputProps={{ readOnly: true }} />
            </Box>
          </Box>

          <Box sx={{ p: 2, borderRadius: '12px', border: `1px solid ${T.border}` }}>
            <Typography sx={{ fontFamily: FONT, fontWeight: 700, color: T.textPrimary, mb: 1.2 }}>2. Project (Create or Connect)</Typography>
            <TextField select label="Mode" size="small" fullWidth value={projectMode} onChange={(e) => setProjectMode(e.target.value as SetupMode)} sx={{ mb: 1 }}>
              <MenuItem value="skip">Skip</MenuItem>
              <MenuItem value="create">Create New Project</MenuItem>
              <MenuItem value="connect">Connect Existing Project</MenuItem>
            </TextField>
            {projectMode === 'create' && (
              <Stack spacing={1}>
                <TextField label="Project Name" size="small" value={projectName} onChange={(e) => setProjectName(e.target.value)} />
                <TextField label="Project Description" size="small" value={projectDescription} onChange={(e) => setProjectDescription(e.target.value)} multiline minRows={2} />
                <TextField select label="Repository Option" size="small" value={projectRepoOption} onChange={(e) => setProjectRepoOption(e.target.value as any)}>
                  <MenuItem value="empty">Create Empty Repo</MenuItem>
                  <MenuItem value="github">Import from GitHub</MenuItem>
                  <MenuItem value="gitlab">Import from GitLab</MenuItem>
                  <MenuItem value="bitbucket">Import from Bitbucket</MenuItem>
                </TextField>
                {projectRepoOption !== 'empty' && (
                  <TextField label="Repository URL" size="small" value={projectRepoUrl} onChange={(e) => setProjectRepoUrl(e.target.value)} />
                )}
                <TextField select label="Auto-Generate CI/CD Pipeline" size="small" value={projectAutoCicd} onChange={(e) => setProjectAutoCicd(e.target.value as 'yes' | 'no')}>
                  <MenuItem value="yes">Yes</MenuItem>
                  <MenuItem value="no">No</MenuItem>
                </TextField>
              </Stack>
            )}
            {projectMode === 'connect' && (
              <Stack spacing={1}>
                <TextField select label="Existing Project" size="small" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                  {projects.map((p) => <MenuItem key={p.id} value={String(p.id)}>{p.name}</MenuItem>)}
                </TextField>
                <TextField select label="Auto-Sync Repository" size="small" value={projectAutoSync} onChange={(e) => setProjectAutoSync(e.target.value as 'yes' | 'no')}>
                  <MenuItem value="yes">Yes</MenuItem>
                  <MenuItem value="no">No</MenuItem>
                </TextField>
                <TextField select label="Auto-Attach Pipeline" size="small" value={projectAutoPipeline} onChange={(e) => setProjectAutoPipeline(e.target.value as 'yes' | 'no')}>
                  <MenuItem value="yes">Yes</MenuItem>
                  <MenuItem value="no">No</MenuItem>
                </TextField>
              </Stack>
            )}
          </Box>

          <Box sx={{ p: 2, borderRadius: '12px', border: `1px solid ${T.border}` }}>
            <Typography sx={{ fontFamily: FONT, fontWeight: 700, color: T.textPrimary, mb: 1.2 }}>3. Container (Create or Connect)</Typography>
            <TextField select label="Mode" size="small" fullWidth value={containerMode} onChange={(e) => setContainerMode(e.target.value as SetupMode)} sx={{ mb: 1 }}>
              <MenuItem value="skip">Skip</MenuItem>
              <MenuItem value="create">Create New Container</MenuItem>
              <MenuItem value="connect">Connect Existing Container</MenuItem>
            </TextField>
            {containerMode === 'create' && (
              <Stack spacing={1}>
                <TextField label="Container Name" size="small" value={containerName} onChange={(e) => setContainerName(e.target.value)} />
                <TextField select label="Container Type" size="small" value={containerType} onChange={(e) => setContainerType(e.target.value as any)}>
                  <MenuItem value="app">App</MenuItem>
                  <MenuItem value="worker">Worker</MenuItem>
                  <MenuItem value="cron">Cron</MenuItem>
                  <MenuItem value="api">API</MenuItem>
                  <MenuItem value="custom">Custom</MenuItem>
                </TextField>
                <TextField select label="Attach to Project" size="small" value={containerAttachProject} onChange={(e) => setContainerAttachProject(e.target.value as 'yes' | 'no')}>
                  <MenuItem value="yes">Yes</MenuItem><MenuItem value="no">No</MenuItem>
                </TextField>
                <TextField select label="Connect to Repository" size="small" value={containerConnectRepo} onChange={(e) => setContainerConnectRepo(e.target.value as 'yes' | 'no')}>
                  <MenuItem value="yes">Yes</MenuItem><MenuItem value="no">No</MenuItem>
                </TextField>
                <TextField select label="Connect to Pipeline" size="small" value={containerConnectPipeline} onChange={(e) => setContainerConnectPipeline(e.target.value as 'yes' | 'no')}>
                  <MenuItem value="yes">Yes</MenuItem><MenuItem value="no">No</MenuItem>
                </TextField>
                <TextField select label="Runtime Size" size="small" value={containerRuntimeSize} onChange={(e) => setContainerRuntimeSize(e.target.value as any)}>
                  <MenuItem value="s">S</MenuItem><MenuItem value="m">M</MenuItem><MenuItem value="l">L</MenuItem><MenuItem value="xl">XL</MenuItem>
                </TextField>
                <TextField select label="Scaling Mode" size="small" value={containerScalingMode} onChange={(e) => setContainerScalingMode(e.target.value as any)}>
                  <MenuItem value="manual">Manual</MenuItem><MenuItem value="auto">Auto-Scale</MenuItem>
                </TextField>
              </Stack>
            )}
            {containerMode === 'connect' && (
              <Stack spacing={1}>
                <TextField select label="Existing Container" size="small" value={containerId} onChange={(e) => setContainerId(e.target.value)}>
                  {containerChoices.map((id) => <MenuItem key={id} value={id}>{id}</MenuItem>)}
                </TextField>
                <TextField select label="Attach to Project" size="small" value={containerAttachProject} onChange={(e) => setContainerAttachProject(e.target.value as 'yes' | 'no')}>
                  <MenuItem value="yes">Yes</MenuItem><MenuItem value="no">No</MenuItem>
                </TextField>
                <TextField select label="Attach to Environment" size="small" value={containerAttachEnv} onChange={(e) => setContainerAttachEnv(e.target.value as 'yes' | 'no')}>
                  <MenuItem value="yes">Yes</MenuItem><MenuItem value="no">No</MenuItem>
                </TextField>
              </Stack>
            )}
          </Box>

          <Box sx={{ p: 2, borderRadius: '12px', border: `1px solid ${T.border}` }}>
            <Typography sx={{ fontFamily: FONT, fontWeight: 700, color: T.textPrimary, mb: 1.2 }}>4. Environment (Create or Connect)</Typography>
            <TextField select label="Mode" size="small" fullWidth value={environmentMode} onChange={(e) => setEnvironmentMode(e.target.value as SetupMode)} sx={{ mb: 1 }}>
              <MenuItem value="skip">Skip</MenuItem>
              <MenuItem value="create">Create New Environment</MenuItem>
              <MenuItem value="connect">Connect Existing Environment</MenuItem>
            </TextField>
            {environmentMode === 'create' && (
              <Stack spacing={1}>
                <TextField label="Environment Name" size="small" value={environmentName} onChange={(e) => setEnvironmentName(e.target.value)} />
                <TextField select label="Environment Type" size="small" value={environmentType} onChange={(e) => setEnvironmentType(e.target.value as any)}>
                  <MenuItem value="dev">Dev</MenuItem><MenuItem value="stage">Stage</MenuItem><MenuItem value="prod">Prod</MenuItem>
                </TextField>
                <TextField label="Region" size="small" value={environmentRegion} onChange={(e) => setEnvironmentRegion(e.target.value)} />
                <TextField select label="Auto-Deploy from Pipeline" size="small" value={environmentAutoDeploy} onChange={(e) => setEnvironmentAutoDeploy(e.target.value as 'yes' | 'no')}>
                  <MenuItem value="yes">Yes</MenuItem><MenuItem value="no">No</MenuItem>
                </TextField>
              </Stack>
            )}
            {environmentMode === 'connect' && (
              <Stack spacing={1}>
                <TextField select label="Existing Environment" size="small" value={environmentId} onChange={(e) => setEnvironmentId(e.target.value)}>
                  {environments.map((e) => <MenuItem key={e.id} value={String(e.id)}>{e.name}</MenuItem>)}
                </TextField>
                <TextField select label="Sync Variables" size="small" value={environmentSyncVars} onChange={(e) => setEnvironmentSyncVars(e.target.value as 'yes' | 'no')}>
                  <MenuItem value="yes">Yes</MenuItem><MenuItem value="no">No</MenuItem>
                </TextField>
                <TextField select label="Sync Secrets" size="small" value={environmentSyncSecrets} onChange={(e) => setEnvironmentSyncSecrets(e.target.value as 'yes' | 'no')}>
                  <MenuItem value="yes">Yes</MenuItem><MenuItem value="no">No</MenuItem>
                </TextField>
              </Stack>
            )}
          </Box>

          <Box sx={{ p: 2, borderRadius: '12px', border: `1px solid ${T.border}` }}>
            <Typography sx={{ fontFamily: FONT, fontWeight: 700, color: T.textPrimary, mb: 1.2 }}>5. Group (Optional)</Typography>
            <TextField select label="Mode" size="small" fullWidth value={groupMode} onChange={(e) => setGroupMode(e.target.value as SetupMode)} sx={{ mb: 1 }}>
              <MenuItem value="skip">Skip</MenuItem>
              <MenuItem value="create">Create New Group</MenuItem>
              <MenuItem value="connect">Connect Existing Group</MenuItem>
            </TextField>
            {groupMode === 'create' && (
              <Stack spacing={1}>
                <TextField label="Group Name" size="small" value={groupName} onChange={(e) => setGroupName(e.target.value)} />
                <TextField label="Group Description" size="small" value={groupDescription} onChange={(e) => setGroupDescription(e.target.value)} multiline minRows={2} />
                <TextField label="Add Members (email or username, comma-separated)" size="small" value={groupMembers} onChange={(e) => setGroupMembers(e.target.value)} />
              </Stack>
            )}
            {groupMode === 'connect' && (
              <Stack spacing={1}>
                <TextField select label="Existing Group" size="small" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
                  {groups.map((g) => <MenuItem key={g.id} value={String(g.id)}>{g.name}</MenuItem>)}
                </TextField>
                <TextField select label="Role in Group" size="small" value={groupRole} onChange={(e) => setGroupRole(e.target.value as any)}>
                  <MenuItem value="owner">Owner</MenuItem>
                  <MenuItem value="maintainer">Maintainer</MenuItem>
                  <MenuItem value="developer">Developer</MenuItem>
                  <MenuItem value="viewer">Viewer</MenuItem>
                </TextField>
              </Stack>
            )}
          </Box>

          <Box sx={{ p: 2, borderRadius: '12px', border: `1px solid ${T.border}` }}>
            <Typography sx={{ fontFamily: FONT, fontWeight: 700, color: T.textPrimary, mb: 1.2 }}>6. Pipeline Control</Typography>
            <Stack spacing={1}>
              <TextField select label="Select Pipeline" size="small" value={pipelineId} onChange={(e) => setPipelineId(e.target.value)}>
                {pipelines.map((p) => <MenuItem key={p.id} value={String(p.id)}>{p.pipeline_name || p.pipeline_file}</MenuItem>)}
              </TextField>
              <TextField select label="Trigger Pipeline" size="small" value={pipelineAutoTrigger} onChange={(e) => setPipelineAutoTrigger(e.target.value as 'yes' | 'no')}>
                <MenuItem value="yes">Yes</MenuItem>
                <MenuItem value="no">No</MenuItem>
              </TextField>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Button variant="outlined" size="small" sx={{ textTransform: 'none' }}>View Pipeline Runs</Button>
                <Button variant="outlined" size="small" sx={{ textTransform: 'none' }}>View Logs</Button>
                <Button variant="outlined" size="small" sx={{ textTransform: 'none' }}>View Artifacts</Button>
                <Button variant="outlined" size="small" sx={{ textTransform: 'none' }} disabled={!environmentId && !environmentName}>Deploy to Environment</Button>
              </Stack>
            </Stack>
          </Box>

          <Box sx={{ p: 2, borderRadius: '12px', border: `1px solid ${T.border}`, bgcolor: T.surfaceSubtle }}>
            <Typography sx={{ fontFamily: FONT, fontWeight: 700, color: T.textPrimary, mb: 1.2 }}>7. Summary & Confirmation</Typography>
            <Stack spacing={0.75} sx={{ mb: 1.5 }}>
              {[
                { label: 'Workspace created', ok: summary.workspace },
                { label: 'Project: Created or Connected', ok: summary.project },
                { label: 'Repository: Created / Imported / Connected', ok: summary.repository },
                { label: 'Container: Created or Connected', ok: summary.container },
                { label: 'Environment: Created or Connected', ok: summary.environment },
                { label: 'Group: Created or Connected', ok: summary.group },
                { label: 'Pipeline: Ready to run', ok: summary.pipeline },
              ].map((item) => (
                <Stack key={item.label} direction="row" spacing={1} alignItems="center">
                  <CheckCircleIcon sx={{ fontSize: '.95rem', color: item.ok ? S.success : T.textTertiary }} />
                  <Typography sx={{ fontFamily: FONT, fontSize: '.82rem', color: item.ok ? T.textPrimary : T.textSecondary }}>{item.label}</Typography>
                  {item.ok && <Chip label="OK" size="small" sx={{ height: 16, fontSize: '.6rem', bgcolor: 'rgba(34,197,94,.12)', color: S.success }} />}
                </Stack>
              ))}
            </Stack>
            <Divider sx={{ borderColor: T.border, mb: 1.25 }} />
            <Typography sx={{ fontFamily: FONT, fontSize: '.76rem', color: T.textSecondary, mb: 1.25 }}>
              Workspace opens with Left Sidebar (Code, Repository, Pipelines, Deployments, Logs, Metrics), Right Sidebar (Containers, Processes, Live Logs, CPU/RAM), and Center Panel (Editor, Terminal, Activity).
            </Typography>
            {error && (
              <Box sx={{ p: 1, borderRadius: '8px', mb: 1, bgcolor: `${S.danger}14`, border: `1px solid ${S.danger}44` }}>
                <Typography sx={{ fontSize: '.78rem', color: S.danger }}>{error}</Typography>
              </Box>
            )}
            <Button
              fullWidth
              variant="contained"
              onClick={submit}
              disabled={busy}
              startIcon={busy ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <PlayArrowIcon />}
              sx={{
                textTransform: 'none',
                fontWeight: 700,
                borderRadius: '10px',
                bgcolor: T.brandPrimary,
                '&:hover': { bgcolor: T.brandPrimaryHover },
              }}
            >
              {busy ? 'Applying setup…' : 'Finish & Open Workspace'}
            </Button>
          </Box>
        </Stack>
      </DialogContent>
    </Dialog>
  )
}
