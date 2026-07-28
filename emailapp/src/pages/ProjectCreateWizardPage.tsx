import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import { useNavigate } from 'react-router-dom';
import { dashboardSemanticColors, dashboardTokens } from '../styles/dashboardDesignSystem';
import { createProject as createProjectApi } from '../services/projectsApi';

const FONT = '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const t = dashboardTokens.colors;
const STORAGE_KEY = 'orcacloud:project-create:v2';
const LEGACY_STORAGE_KEY = 'atonix:project-create:v2';

type Visibility = 'private' | 'team' | 'public';
type WorkspaceMode = 'skip' | 'existing' | 'new';
type ComputeType = 'standard' | 'high-performance' | 'gpu';
type RepoMode = 'new' | 'import' | 'attach';
type ImportProvider = 'github' | 'gitlab' | 'bitbucket';
type ProjectLang = 'TypeScript' | 'Python' | 'Go' | 'Rust' | 'Java' | 'HCL';
type PipelineTemplate = 'nodejs' | 'python' | 'go' | 'docker' | 'kubernetes' | 'custom';
type PipelineTrigger = 'push' | 'pr' | 'manual' | 'scheduled';
type DeploymentStrategy = 'rolling' | 'blue-green' | 'canary';

interface StoredProject {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'in-progress' | 'completed' | 'archived';
  language: ProjectLang;
  branch: string;
  progress: number;
  openIssues: number;
  lastBuild: 'passing' | 'failing' | 'pending';
  updatedAt: string;
  members: string[];
  tags: string[];
  provider: 'github' | 'gitlab' | 'bitbucket';
}

interface WizardState {
  projectName: string;
  projectKey: string;
  description: string;
  visibility: Visibility;

  workspaceMode: WorkspaceMode;
  existingWorkspaceId: string;
  newWorkspaceName: string;
  workspaceRegion: string;
  computeType: ComputeType;
  defaultDevEnv: string;
  defaultEditor: string;

  repoMode: RepoMode;
  newRepoName: string;
  importProvider: ImportProvider;
  importUrl: string;
  existingRepoId: string;

  pipelineEnabled: boolean;
  pipelineTemplate: PipelineTemplate;
  pipelineTriggers: PipelineTrigger[];
  pipelineVariables: Array<{ key: string; value: string }>;
  deploymentStrategy: DeploymentStrategy;
  autoDetectLanguage: boolean;
  includeTests: boolean;
  includeSecurityScan: boolean;
  requireApproval: boolean;
}

const STEPS = ['Project Definition', 'Workspace (Optional)', 'Repository Setup', 'Pipeline Setup (Optional)'];

const EXISTING_WORKSPACES = [
  { id: 'ws-101', name: 'Platform Core Workspace', region: 'us-east-1' },
  { id: 'ws-102', name: 'Payments Team Workspace', region: 'eu-west-1' },
  { id: 'ws-103', name: 'ML Research Workspace', region: 'ap-southeast-1' },
];

const EXISTING_REPOS = [
  { id: 'repo-1', name: 'api-gateway' },
  { id: 'repo-2', name: 'payments-service' },
  { id: 'repo-3', name: 'onboarding-portal' },
];

const REGIONS = ['us-east-1', 'us-west-2', 'eu-west-1', 'eu-central-1', 'ap-southeast-1', 'ap-northeast-1'];
const DEV_ENVS = ['Node.js', 'Python', 'Go', 'Java', 'Rust', 'TypeScript'];
const EDITORS = ['VS Code Web', 'Monaco', 'JetBrains Gateway'];

const defaultState: WizardState = {
  projectName: '',
  projectKey: '',
  description: '',
  visibility: 'private',

  workspaceMode: 'skip',
  existingWorkspaceId: '',
  newWorkspaceName: '',
  workspaceRegion: 'us-east-1',
  computeType: 'standard',
  defaultDevEnv: 'Node.js',
  defaultEditor: 'VS Code Web',

  repoMode: 'new',
  newRepoName: '',
  importProvider: 'github',
  importUrl: '',
  existingRepoId: '',

  pipelineEnabled: true,
  pipelineTemplate: 'nodejs',
  pipelineTriggers: ['push', 'pr'],
  pipelineVariables: [],
  deploymentStrategy: 'rolling',
  autoDetectLanguage: true,
  includeTests: true,
  includeSecurityScan: true,
  requireApproval: false,
};

const inputSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: t.surfaceSubtle,
    color: t.textPrimary,
    borderRadius: '8px',
    fontSize: '.875rem',
    '& fieldset': { borderColor: t.border },
    '&:hover fieldset': { borderColor: t.borderStrong },
    '&.Mui-focused fieldset': { borderColor: dashboardTokens.colors.brandPrimary, boxShadow: '0 0 0 3px rgba(21,61,117,0.14)' },
  },
  '& .MuiInputLabel-root': { color: t.textSecondary, fontSize: '.875rem' },
};

const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const detectLanguage = (repoHint: string): ProjectLang => {
  const value = repoHint.toLowerCase();
  if (value.includes('python') || value.includes('django') || value.includes('flask')) return 'Python';
  if (value.includes('java') || value.includes('spring')) return 'Java';
  if (value.includes('rust')) return 'Rust';
  if (value.includes('go') || value.includes('golang')) return 'Go';
  if (value.includes('terraform') || value.includes('hcl') || value.includes('infra')) return 'HCL';
  return 'TypeScript';
};

const ProjectCreateWizardPage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [state, setState] = useState<WizardState>(defaultState);
  const [creating, setCreating] = useState(false);
  const [snack, setSnack] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
      if (saved) {
        setState({ ...defaultState, ...(JSON.parse(saved) as Partial<WizardState>) });
      }
    } catch {
      // ignore malformed saved state
    }
  }, []);

  useEffect(() => {
    const serialized = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY, serialized);
    localStorage.setItem(LEGACY_STORAGE_KEY, serialized);
  }, [state]);

  const patch = (partial: Partial<WizardState>) => setState((prev) => ({ ...prev, ...partial }));

  const derived = useMemo(() => {
    const key = state.projectKey || slugify(state.projectName);
    const projectId = `proj-${key || 'new'}-${Math.abs((state.projectName || 'project').length * 37).toString(16)}`;
    const namespace = `orcacloud-${key || 'project'}`;
    return { key, projectId, namespace };
  }, [state.projectName, state.projectKey]);

  const canContinue = () => {
    if (step === 0) {
      return state.projectName.trim().length >= 2 && derived.key.length >= 2;
    }
    if (step === 1) {
      if (state.workspaceMode === 'skip') return true;
      if (state.workspaceMode === 'existing') return !!state.existingWorkspaceId;
      return !!state.newWorkspaceName.trim() && !!state.workspaceRegion && !!state.defaultDevEnv && !!state.defaultEditor;
    }
    if (step === 2) {
      if (state.repoMode === 'new') return !!(state.newRepoName || state.projectName).trim();
      if (state.repoMode === 'import') return !!state.importUrl.trim();
      return !!state.existingRepoId;
    }
    if (step === 3) {
      // Pipeline setup is optional, always allow continuation
      return true;
    }
    return true;
  };

  const handleCreate = async () => {
    if (!canContinue()) return;
    setCreating(true);

    const repoHint = [
      state.newRepoName,
      state.importUrl,
      state.existingRepoId,
      state.projectName,
    ].join(' ');

    const fallbackProject: StoredProject = {
      id: derived.projectId,
      name: state.projectName,
      description: state.description || 'New project created from unified wizard flow.',
      status: 'in-progress',
      language: detectLanguage(repoHint),
      branch: 'main',
      progress: 8,
      openIssues: 0,
      lastBuild: 'pending',
      updatedAt: 'Just now',
      members: ['Y'],
      tags: [state.visibility, 'new', ...(state.pipelineEnabled ? ['ci-cd'] : [])],
      provider: state.repoMode === 'import' ? state.importProvider : 'github',
    };

    // Store pipeline configuration for later retrieval
    if (state.pipelineEnabled) {
      const pipelineConfig = {
        projectId: derived.projectId,
        template: state.pipelineTemplate,
        triggers: state.pipelineTriggers,
        variables: state.pipelineVariables.filter((v) => v.key && v.value),
        deploymentStrategy: state.deploymentStrategy,
        autoDetectLanguage: state.autoDetectLanguage,
        includeTests: state.includeTests,
        includeSecurityScan: state.includeSecurityScan,
        requireApproval: state.requireApproval,
        createdAt: new Date().toISOString(),
      };
      try {
        const newPipelineKey = `orcacloud:pipeline-config:${derived.projectId}`;
        const legacyPipelineKey = `atonix:pipeline-config:${derived.projectId}`;
        const serialized = JSON.stringify(pipelineConfig);
        localStorage.setItem(newPipelineKey, serialized);
        localStorage.setItem(legacyPipelineKey, serialized);
      } catch {
        // non-critical
      }
    }

    try {
      const created = await createProjectApi({
        project_key: derived.key,
        name: state.projectName,
        description: state.description || '',
      });

      const createdProject: StoredProject = {
        ...fallbackProject,
        id: created.id,
        name: created.name,
        description: created.description || fallbackProject.description,
      };

      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      setSnack('Project created successfully. You can attach workspace/environments/groups/containers anytime.');
      navigate('/developer/Dashboard/projects', {
        state: { snack: `Project "${createdProject.name}" created successfully.` },
      });
    } catch (error: any) {
      const status = error?.response?.status;
      const backendDetail = error?.response?.data?.detail;

      if (status === 401) {
        setSnack('Project was not created. Please sign in again to connect to backend.');
      } else if (status === 403) {
        setSnack('Project was not created. You do not have permission to create projects.');
      } else if (status === 400 && typeof backendDetail === 'string' && backendDetail.trim()) {
        setSnack(`Project was not created. ${backendDetail}`);
      } else {
        setSnack('Project was not created in backend. Please check backend connection and try again.');
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, fontFamily: FONT }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2.5 }}>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.25rem', md: '1.45rem' }, color: t.textPrimary, fontFamily: FONT }}>
            Create Project
          </Typography>
          <Typography sx={{ color: t.textSecondary, fontSize: '.88rem', mt: 0.4, fontFamily: FONT }}>
            Unified 4-stage flow: Project Definition → Workspace (optional) → Repository Setup → Pipeline Setup (optional).
          </Typography>
        </Box>
        <Button
          variant="outlined"
          onClick={() => navigate('/developer/Dashboard/projects')}
          sx={{ borderColor: t.borderStrong, color: t.textSecondary, textTransform: 'none', fontWeight: 600 }}
        >
          Cancel
        </Button>
      </Stack>

      <Card sx={{ border: `1px solid ${t.border}`, bgcolor: t.surface, boxShadow: 'none', borderRadius: '10px' }}>
        <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
          <LinearProgress
            variant="determinate"
            value={((step + 1) / STEPS.length) * 100}
            sx={{ mb: 2.5, height: 5, borderRadius: 4, bgcolor: t.border, '& .MuiLinearProgress-bar': { bgcolor: dashboardTokens.colors.brandPrimary } }}
          />

          <Stepper activeStep={step} alternativeLabel sx={{ mb: 2.5 }}>
            {STEPS.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {step === 0 && (
            <Stack spacing={2}>
              <Typography sx={{ fontSize: '.86rem', color: t.textSecondary, fontFamily: FONT }}>
                Define core project identity. Workspace and environment are not forced in this stage.
              </Typography>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                <TextField
                  label="Project Name *"
                  value={state.projectName}
                  onChange={(e) => patch({ projectName: e.target.value, projectKey: state.projectKey || slugify(e.target.value) })}
                  size="small"
                  fullWidth
                  sx={inputSx}
                />
                <TextField
                  label="Project Key *"
                  value={state.projectKey}
                  onChange={(e) => patch({ projectKey: slugify(e.target.value) })}
                  size="small"
                  fullWidth
                  sx={inputSx}
                />
              </Stack>
              <TextField
                label="Description"
                value={state.description}
                onChange={(e) => patch({ description: e.target.value })}
                size="small"
                multiline
                rows={3}
                fullWidth
                sx={inputSx}
              />

              <Box>
                <Typography sx={{ fontSize: '.76rem', color: t.textSecondary, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', mb: 0.8 }}>Visibility</Typography>
                <Stack direction="row" spacing={1}>
                  {(['private', 'team', 'public'] as Visibility[]).map((v) => (
                    <Chip
                      key={v}
                      label={v}
                      onClick={() => patch({ visibility: v })}
                      sx={{
                        textTransform: 'capitalize',
                        fontWeight: 700,
                        bgcolor: state.visibility === v ? 'rgba(21,61,117,0.1)' : t.surfaceSubtle,
                        color: state.visibility === v ? dashboardTokens.colors.brandPrimary : t.textSecondary,
                        border: `1px solid ${state.visibility === v ? dashboardTokens.colors.brandPrimary + '55' : t.border}`,
                      }}
                    />
                  ))}
                </Stack>
              </Box>

              <Alert icon={<CheckCircleIcon fontSize="inherit" />} severity="info" sx={{ bgcolor: 'rgba(21,61,117,0.08)', color: t.textPrimary, border: `1px solid ${dashboardTokens.colors.brandPrimary}33` }}>
                <strong>System prepared:</strong> project_id = {derived.projectId}, namespace = {derived.namespace}, metadata scaffold for repository/workspace/CI-CD/environments.
              </Alert>
            </Stack>
          )}

          {step === 1 && (
            <Stack spacing={2}>
              <Typography sx={{ fontSize: '.86rem', color: t.textSecondary, fontFamily: FONT }}>
                Workspace is optional. You can skip now and attach later from project dashboard.
              </Typography>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                {([
                  { id: 'skip', label: 'Skip for now' },
                  { id: 'existing', label: 'Attach existing workspace' },
                  { id: 'new', label: 'Create new workspace' },
                ] as Array<{ id: WorkspaceMode; label: string }>).map((mode) => (
                  <Button
                    key={mode.id}
                    onClick={() => patch({ workspaceMode: mode.id })}
                    sx={{
                      textTransform: 'none',
                      fontWeight: 700,
                      border: `1px solid ${state.workspaceMode === mode.id ? dashboardTokens.colors.brandPrimary : t.border}`,
                      color: state.workspaceMode === mode.id ? dashboardTokens.colors.brandPrimary : t.textSecondary,
                      bgcolor: state.workspaceMode === mode.id ? 'rgba(21,61,117,0.08)' : t.surfaceSubtle,
                    }}
                  >
                    {mode.label}
                  </Button>
                ))}
              </Stack>

              {state.workspaceMode === 'existing' && (
                <FormControl size="small" fullWidth>
                  <InputLabel>Existing Workspace</InputLabel>
                  <Select
                    label="Existing Workspace"
                    value={state.existingWorkspaceId}
                    onChange={(e) => patch({ existingWorkspaceId: e.target.value })}
                    sx={inputSx}
                  >
                    {EXISTING_WORKSPACES.map((ws) => (
                      <MenuItem key={ws.id} value={ws.id}>{ws.name} ({ws.region})</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              {state.workspaceMode === 'new' && (
                <Stack spacing={1.25}>
                  <TextField label="Workspace Name" size="small" value={state.newWorkspaceName} onChange={(e) => patch({ newWorkspaceName: e.target.value })} sx={inputSx} />
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25}>
                    <FormControl size="small" fullWidth>
                      <InputLabel>Region</InputLabel>
                      <Select label="Region" value={state.workspaceRegion} onChange={(e) => patch({ workspaceRegion: e.target.value })} sx={inputSx}>
                        {REGIONS.map((region) => <MenuItem key={region} value={region}>{region}</MenuItem>)}
                      </Select>
                    </FormControl>
                    <FormControl size="small" fullWidth>
                      <InputLabel>Compute Type</InputLabel>
                      <Select label="Compute Type" value={state.computeType} onChange={(e) => patch({ computeType: e.target.value as ComputeType })} sx={inputSx}>
                        <MenuItem value="standard">Standard</MenuItem>
                        <MenuItem value="high-performance">High-Performance</MenuItem>
                        <MenuItem value="gpu">GPU</MenuItem>
                      </Select>
                    </FormControl>
                  </Stack>
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25}>
                    <FormControl size="small" fullWidth>
                      <InputLabel>Default Dev Environment</InputLabel>
                      <Select label="Default Dev Environment" value={state.defaultDevEnv} onChange={(e) => patch({ defaultDevEnv: e.target.value })} sx={inputSx}>
                        {DEV_ENVS.map((env) => <MenuItem key={env} value={env}>{env}</MenuItem>)}
                      </Select>
                    </FormControl>
                    <FormControl size="small" fullWidth>
                      <InputLabel>Default Editor</InputLabel>
                      <Select label="Default Editor" value={state.defaultEditor} onChange={(e) => patch({ defaultEditor: e.target.value })} sx={inputSx}>
                        {EDITORS.map((editor) => <MenuItem key={editor} value={editor}>{editor}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Stack>
                  <Alert severity="success" sx={{ bgcolor: 'rgba(34,197,94,.1)', border: '1px solid rgba(34,197,94,.3)' }}>
                    Provisioning profile includes container/VM, persistent storage, terminal websocket, editor endpoint, and resource limits.
                  </Alert>
                </Stack>
              )}
            </Stack>
          )}

          {step === 2 && (
            <Stack spacing={2}>
              <Typography sx={{ fontSize: '.86rem', color: t.textSecondary, fontFamily: FONT }}>
                Select repository mode. CI/CD pipeline is initialized in all modes. Deployment steps are skipped until environments exist.
              </Typography>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                {([
                  { id: 'new', label: 'Create new repository' },
                  { id: 'import', label: 'Import from Git provider' },
                    { id: 'attach', label: 'Attach existing OrcaCloud repo' },
                ] as Array<{ id: RepoMode; label: string }>).map((mode) => (
                  <Button
                    key={mode.id}
                    onClick={() => patch({ repoMode: mode.id })}
                    sx={{
                      textTransform: 'none',
                      fontWeight: 700,
                      border: `1px solid ${state.repoMode === mode.id ? dashboardTokens.colors.brandPrimary : t.border}`,
                      color: state.repoMode === mode.id ? dashboardTokens.colors.brandPrimary : t.textSecondary,
                      bgcolor: state.repoMode === mode.id ? 'rgba(21,61,117,0.08)' : t.surfaceSubtle,
                    }}
                  >
                    {mode.label}
                  </Button>
                ))}
              </Stack>

              {state.repoMode === 'new' && (
                <TextField
                  label="Repository Name"
                  size="small"
                  value={state.newRepoName}
                  onChange={(e) => patch({ newRepoName: slugify(e.target.value) })}
                  placeholder={slugify(state.projectName) || 'project-repo'}
                  sx={inputSx}
                />
              )}

              {state.repoMode === 'import' && (
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25}>
                  <FormControl size="small" sx={{ minWidth: 180 }}>
                    <InputLabel>Provider</InputLabel>
                    <Select label="Provider" value={state.importProvider} onChange={(e) => patch({ importProvider: e.target.value as ImportProvider })} sx={inputSx}>
                      <MenuItem value="github">GitHub</MenuItem>
                      <MenuItem value="gitlab">GitLab</MenuItem>
                      <MenuItem value="bitbucket">Bitbucket</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField
                    label="Repository URL"
                    size="small"
                    fullWidth
                    value={state.importUrl}
                    onChange={(e) => patch({ importUrl: e.target.value })}
                    placeholder="https://github.com/org/repo.git"
                    sx={inputSx}
                  />
                </Stack>
              )}

              {state.repoMode === 'attach' && (
                <FormControl size="small" fullWidth>
                  <InputLabel>Existing Repository</InputLabel>
                  <Select
                    label="Existing Repository"
                    value={state.existingRepoId}
                    onChange={(e) => patch({ existingRepoId: e.target.value })}
                    sx={inputSx}
                  >
                    {EXISTING_REPOS.map((repo) => (
                      <MenuItem key={repo.id} value={repo.id}>{repo.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              <Divider sx={{ borderColor: t.border }} />
              <Alert severity="info" sx={{ bgcolor: 'rgba(21,61,117,0.08)', border: `1px solid ${dashboardTokens.colors.brandPrimary}33` }}>
                On creation the system will initialize/clone repository, auto-detect language, generate <strong>.orcacloud/pipeline.yaml</strong> (legacy <strong>.atonix/pipeline.yaml</strong> is still recognized), initialize CI/CD, and connect repository to workspace when a workspace exists.
              </Alert>
            </Stack>
          )}

          {step === 3 && (
            <Stack spacing={2}>
              <Typography sx={{ fontSize: '.86rem', color: t.textSecondary, fontFamily: FONT }}>
                Configure CI/CD pipeline for automated builds, tests, and deployments. You can skip and configure later.
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, bgcolor: t.surfaceSubtle, borderRadius: 1, border: `1px solid ${t.border}` }}>
                <Box
                  onClick={() => patch({ pipelineEnabled: !state.pipelineEnabled })}
                  sx={{
                    width: 44,
                    height: 24,
                    borderRadius: 12,
                    bgcolor: state.pipelineEnabled ? dashboardSemanticColors.success : t.border,
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': { opacity: 0.8 },
                  }}
                >
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 2,
                      left: state.pipelineEnabled ? 22 : 2,
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      bgcolor: '#fff',
                      transition: 'all 0.2s',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    }}
                  />
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 700, color: t.textPrimary, fontSize: '.9rem' }}>
                    Enable CI/CD Pipeline
                  </Typography>
                  <Typography sx={{ fontSize: '.75rem', color: t.textSecondary }}>
                    Automatically build, test, and deploy your application
                  </Typography>
                </Box>
              </Box>

              {state.pipelineEnabled && (
                <Stack spacing={2}>
                  <Box>
                    <Typography sx={{ fontSize: '.76rem', color: t.textSecondary, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', mb: 0.8 }}>
                      Pipeline Template
                    </Typography>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} flexWrap="wrap" useFlexGap>
                      {(['nodejs', 'python', 'go', 'docker', 'kubernetes', 'custom'] as PipelineTemplate[]).map((template) => (
                        <Chip
                          key={template}
                          label={template === 'nodejs' ? 'Node.js' : template === 'kubernetes' ? 'Kubernetes' : template.charAt(0).toUpperCase() + template.slice(1)}
                          onClick={() => patch({ pipelineTemplate: template })}
                          sx={{
                            textTransform: 'capitalize',
                            fontWeight: 700,
                            bgcolor: state.pipelineTemplate === template ? 'rgba(21,61,117,0.1)' : t.surfaceSubtle,
                            color: state.pipelineTemplate === template ? dashboardTokens.colors.brandPrimary : t.textSecondary,
                            border: `1px solid ${state.pipelineTemplate === template ? dashboardTokens.colors.brandPrimary + '55' : t.border}`,
                          }}
                        />
                      ))}
                    </Stack>
                  </Box>

                  <Box>
                    <Typography sx={{ fontSize: '.76rem', color: t.textSecondary, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', mb: 0.8 }}>
                      Pipeline Triggers
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {(['push', 'pr', 'manual', 'scheduled'] as PipelineTrigger[]).map((trigger) => {
                        const isSelected = state.pipelineTriggers.includes(trigger);
                        return (
                          <Chip
                            key={trigger}
                            label={trigger === 'push' ? 'On Push' : trigger === 'pr' ? 'On Pull Request' : trigger === 'manual' ? 'Manual' : 'Scheduled'}
                            onClick={() => {
                              const next = isSelected
                                ? state.pipelineTriggers.filter((t) => t !== trigger)
                                : [...state.pipelineTriggers, trigger];
                              patch({ pipelineTriggers: next });
                            }}
                            sx={{
                              textTransform: 'capitalize',
                              fontWeight: 700,
                              bgcolor: isSelected ? 'rgba(21,61,117,0.1)' : t.surfaceSubtle,
                              color: isSelected ? dashboardTokens.colors.brandPrimary : t.textSecondary,
                              border: `1px solid ${isSelected ? dashboardTokens.colors.brandPrimary + '55' : t.border}`,
                            }}
                          />
                        );
                      })}
                    </Stack>
                  </Box>

                  <Box>
                    <Typography sx={{ fontSize: '.76rem', color: t.textSecondary, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', mb: 0.8 }}>
                      Deployment Strategy
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      {(['rolling', 'blue-green', 'canary'] as DeploymentStrategy[]).map((strategy) => (
                        <Chip
                          key={strategy}
                          label={strategy === 'blue-green' ? 'Blue-Green' : strategy.charAt(0).toUpperCase() + strategy.slice(1)}
                          onClick={() => patch({ deploymentStrategy: strategy })}
                          sx={{
                            textTransform: 'capitalize',
                            fontWeight: 700,
                            bgcolor: state.deploymentStrategy === strategy ? 'rgba(21,61,117,0.1)' : t.surfaceSubtle,
                            color: state.deploymentStrategy === strategy ? dashboardTokens.colors.brandPrimary : t.textSecondary,
                            border: `1px solid ${state.deploymentStrategy === strategy ? dashboardTokens.colors.brandPrimary + '55' : t.border}`,
                          }}
                        />
                      ))}
                    </Stack>
                  </Box>

                  <Box>
                    <Typography sx={{ fontSize: '.76rem', color: t.textSecondary, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', mb: 0.8 }}>
                      Pipeline Options
                    </Typography>
                    <Stack spacing={1}>
                      {[
                        { key: 'autoDetectLanguage', label: 'Auto-detect language and dependencies', value: state.autoDetectLanguage },
                        { key: 'includeTests', label: 'Include automated testing stage', value: state.includeTests },
                        { key: 'includeSecurityScan', label: 'Include security vulnerability scanning', value: state.includeSecurityScan },
                        { key: 'requireApproval', label: 'Require manual approval before deployment', value: state.requireApproval },
                      ].map((option) => (
                        <Box
                          key={option.key}
                          onClick={() => patch({ [option.key]: !option.value })}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            p: 1,
                            bgcolor: option.value ? 'rgba(21,61,117,0.05)' : 'transparent',
                            borderRadius: 1,
                            border: `1px solid ${option.value ? dashboardTokens.colors.brandPrimary + '33' : t.border}`,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            '&:hover': { bgcolor: 'rgba(21,61,117,0.08)' },
                          }}
                        >
                          <Box
                            sx={{
                              width: 18,
                              height: 18,
                              borderRadius: '4px',
                              border: `2px solid ${option.value ? dashboardTokens.colors.brandPrimary : t.border}`,
                              bgcolor: option.value ? dashboardTokens.colors.brandPrimary : 'transparent',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#fff',
                              fontSize: '.7rem',
                              fontWeight: 800,
                            }}
                          >
                            {option.value && 'OK'}
                          </Box>
                          <Typography sx={{ fontSize: '.85rem', color: t.textPrimary, fontWeight: 500 }}>
                            {option.label}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  </Box>

                  <Box>
                    <Typography sx={{ fontSize: '.76rem', color: t.textSecondary, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', mb: 0.8 }}>
                      Environment Variables (Optional)
                    </Typography>
                    <Stack spacing={1}>
                      {state.pipelineVariables.map((variable, index) => (
                        <Stack key={index} direction="row" spacing={1}>
                          <TextField
                            size="small"
                            placeholder="KEY"
                            value={variable.key}
                            onChange={(e) => {
                              const next = [...state.pipelineVariables];
                              next[index].key = e.target.value;
                              patch({ pipelineVariables: next });
                            }}
                            sx={{ ...inputSx, flex: 1 }}
                          />
                          <TextField
                            size="small"
                            placeholder="value"
                            value={variable.value}
                            onChange={(e) => {
                              const next = [...state.pipelineVariables];
                              next[index].value = e.target.value;
                              patch({ pipelineVariables: next });
                            }}
                            sx={{ ...inputSx, flex: 1 }}
                          />
                          <Button
                            onClick={() => {
                              const next = state.pipelineVariables.filter((_, i) => i !== index);
                              patch({ pipelineVariables: next });
                            }}
                            sx={{ minWidth: 40, color: dashboardSemanticColors.danger }}
                          >
                            ×
                          </Button>
                        </Stack>
                      ))}
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => patch({ pipelineVariables: [...state.pipelineVariables, { key: '', value: '' }] })}
                        sx={{ textTransform: 'none', borderColor: t.border, color: t.textSecondary }}
                      >
                        + Add Variable
                      </Button>
                    </Stack>
                  </Box>

                  <Divider sx={{ borderColor: t.border }} />
                  <Alert severity="success" sx={{ bgcolor: 'rgba(34,197,94,.1)', border: '1px solid rgba(34,197,94,.3)' }}>
                    <strong>Pipeline Ready:</strong> System will generate <code>.orcacloud/pipeline.yaml</code> (legacy <code>.atonix/pipeline.yaml</code> supported) with {state.pipelineTemplate} template, configure {state.pipelineTriggers.join(', ')} triggers, and set up {state.deploymentStrategy} deployment strategy.
                  </Alert>
                </Stack>
              )}

              {!state.pipelineEnabled && (
                <Alert severity="info" sx={{ bgcolor: 'rgba(21,61,117,0.08)', border: `1px solid ${dashboardTokens.colors.brandPrimary}33` }}>
                  You can enable and configure CI/CD pipeline later from the project dashboard.
                </Alert>
              )}
            </Stack>
          )}

          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 3 }}>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0 || creating}
              sx={{ textTransform: 'none', color: t.textSecondary }}
            >
              Back
            </Button>

            {step < STEPS.length - 1 ? (
              <Button
                variant="contained"
                endIcon={<ArrowForwardIcon />}
                onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
                disabled={!canContinue() || creating}
                sx={{ bgcolor: dashboardTokens.colors.brandPrimary, color: '#fff', textTransform: 'none', fontWeight: 700, boxShadow: 'none' }}
              >
                Continue
              </Button>
            ) : (
              <Button
                variant="contained"
                startIcon={<RocketLaunchIcon />}
                onClick={handleCreate}
                disabled={!canContinue() || creating}
                sx={{ bgcolor: dashboardSemanticColors.success, color: '#fff', textTransform: 'none', fontWeight: 700, boxShadow: 'none', '&:hover': { bgcolor: '#16a34a' } }}
              >
                {creating ? 'Creating Project…' : 'Create Project'}
              </Button>
            )}
          </Stack>
        </CardContent>
      </Card>

      <Snackbar
        open={!!snack}
        autoHideDuration={3500}
        onClose={() => setSnack(null)}
        message={snack}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      />
    </Box>
  );
};

export default ProjectCreateWizardPage;
