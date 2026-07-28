import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  LinearProgress,
  Slider,
  Stack,
  Switch,
  TextField,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import WorkspacesIcon from '@mui/icons-material/Workspaces';
import ScheduleIcon from '@mui/icons-material/Schedule';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LinkIcon from '@mui/icons-material/Link';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import AddIcon from '@mui/icons-material/Add';
import { dashboardTokens, dashboardSemanticColors } from '../../styles/dashboardDesignSystem';
import { listProjects as fetchProjectsApi } from '../../services/projectsApi';
import { listDefinitions } from '../../services/pipelinesApi';
import { createContainer } from '../../services/containersApi';

const FONT = '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const t = dashboardTokens.colors;

type ContainerType = 'runtime' | 'worker' | 'cron' | 'oneoff';
type ExposeType = 'public' | 'private' | 'internal';
type PipelineMode = 'new' | 'existing';

const CONTAINER_TYPES: { type: ContainerType; label: string; desc: string; icon: React.ReactNode }[] = [
  { type: 'runtime', label: 'Runtime Service', desc: 'Long-running HTTP service exposed via a port', icon: <RocketLaunchIcon sx={{ fontSize: '1.5rem' }} /> },
  { type: 'worker', label: 'Background Worker', desc: 'Processes queued jobs, no incoming traffic', icon: <WorkspacesIcon sx={{ fontSize: '1.5rem' }} /> },
  { type: 'cron', label: 'Cron Job', desc: 'Runs on a schedule (hourly, daily, etc.)', icon: <ScheduleIcon sx={{ fontSize: '1.5rem' }} /> },
  { type: 'oneoff', label: 'One-off Task', desc: 'Single execution for migrations or scripts', icon: <FlashOnIcon sx={{ fontSize: '1.5rem' }} /> },
];

interface WizardProject { id: string; name: string; env: string; owner: string; }
interface WizardPipeline { id: string; name: string; project: string; status: string; lastRun: string; }

const PIPELINE_TEMPLATES = [
  { id: 'node', label: 'Node.js', image: 'node:20-alpine' },
  { id: 'python', label: 'Python', image: 'python:3.12-slim' },
  { id: 'go', label: 'Go', image: 'golang:1.22-alpine' },
  { id: 'docker', label: 'Custom Docker', image: 'your-image:tag' },
];

const STEP_LABELS = ['Type', 'Project', 'Pipeline', 'Runtime'];

const CPU_MARKS = [
  { value: 0.25, label: '0.25' },
  { value: 0.5, label: '0.5' },
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 4, label: '4' },
];

const MEM_MARKS = [
  { value: 256, label: '256Mi' },
  { value: 512, label: '512Mi' },
  { value: 1024, label: '1Gi' },
  { value: 2048, label: '2Gi' },
  { value: 4096, label: '4Gi' },
];

function formatMem(v: number) {
  return v >= 1024 ? `${v / 1024}Gi` : `${v}Mi`;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (c: ContainerResource) => void;
}

export interface ContainerResource {
  id: string;
  name: string;
  type: ContainerType;
  project: string;
  projectId: string;
  pipeline: string;
  image: string;
  tag: string;
  cpu: number;
  memory: number;
  replicas: number;
  autoscaling: boolean;
  autoscaleMin: number;
  autoscaleMax: number;
  autoscaleCpu: number;
  expose: ExposeType;
  port: number;
  domain: string;
  status: 'running' | 'deploying' | 'failed' | 'stopped';
  lastDeployed: string;
  commitSha: string;
}

const CreateContainerWizard: React.FC<Props> = ({ open, onClose, onCreated }) => {
  const [step, setStep] = useState(0);
  const [creating, setCreating] = useState(false);

  // Step 1
  const [containerType, setContainerType] = useState<ContainerType>('runtime');

  // Live data
  const [projects, setProjects] = useState<WizardProject[]>([]);
  const [pipelines, setPipelines] = useState<WizardPipeline[]>([]);

  const loadWizardData = useCallback(async () => {
    try {
      const [projs, defs] = await Promise.allSettled([
        fetchProjectsApi(),
        listDefinitions(),
      ]);
      if (projs.status === 'fulfilled') {
        setProjects(projs.value.map(p => ({
          id:    p.id,
          name:  p.name,
          env:   p.namespace || 'production',
          owner: p.owner_username ?? p.created_by_username ?? '',
        })));
      }
      if (defs.status === 'fulfilled') {
        setPipelines(defs.value.map(d => ({
          id:      d.id,
          name:    d.name,
          project: d.project ?? '',
          status:  d.is_active ? 'success' : 'stopped',
          lastRun: d.created_at ?? '',
        })));
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => { if (open) loadWizardData(); }, [open, loadWizardData]);

  // Step 2
  const [selectedProject, setSelectedProject] = useState<WizardProject | null>(null);

  // Step 3
  const [pipelineMode, setPipelineMode] = useState<PipelineMode>('existing');
  const [selectedPipeline, setSelectedPipeline] = useState<WizardPipeline | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<typeof PIPELINE_TEMPLATES[0] | null>(PIPELINE_TEMPLATES[0]);

  // Step 4
  const [cpu, setCpu] = useState(0.5);
  const [memory, setMemory] = useState(1024);
  const [replicas, setReplicas] = useState(2);
  const [autoscaling, setAutoscaling] = useState(false);
  const [autoscaleMin, setAutoscaleMin] = useState(2);
  const [autoscaleMax, setAutoscaleMax] = useState(10);
  const [autoscaleCpu, setAutoscaleCpu] = useState(70);
  const [expose, setExpose] = useState<ExposeType>('public');
  const [port, setPort] = useState(3000);
  const [domain, setDomain] = useState('');

  const reset = () => {
    setStep(0);
    setContainerType('runtime');
    setSelectedProject(null);
    setPipelineMode('existing');
    setSelectedPipeline(null);
    setSelectedTemplate(PIPELINE_TEMPLATES[0]);
    setCpu(0.5);
    setMemory(1024);
    setReplicas(2);
    setAutoscaling(false);
    setAutoscaleMin(2);
    setAutoscaleMax(10);
    setAutoscaleCpu(70);
    setExpose('public');
    setPort(3000);
    setDomain('');
  };

  const handleClose = () => { reset(); onClose(); };

  const generatedName = selectedProject
    ? `${selectedProject.name}-${selectedProject.env}-${containerType}`
    : `my-service-${containerType}`;

  const filteredPipelines = pipelines.filter(p =>
    !selectedProject || p.project === selectedProject.id || p.project === ''
  );

  const yamlPreview = `container:
  name: ${generatedName}
  type: ${containerType}
  image:
    registry: registry.atonix.io
    repository: ${selectedProject?.name ?? 'org'}/${generatedName}
    tag: latest
  runtime:
    cpu: ${cpu}
    memory: ${formatMem(memory)}
    replicas: ${replicas}${autoscaling ? `
    autoscaling:
      enabled: true
      min: ${autoscaleMin}
      max: ${autoscaleMax}
      target_cpu: ${autoscaleCpu}%` : ''}
  network:
    expose: ${expose}
    port: ${containerType === 'worker' || containerType === 'cron' || containerType === 'oneoff' ? 'N/A' : port}${domain && containerType === 'runtime' && expose === 'public' ? `
    domain: ${domain}` : ''}`;

  const canNext = [
    true, // step 0 always valid
    !!selectedProject, // step 1
    pipelineMode === 'existing' ? !!selectedPipeline : !!selectedTemplate, // step 2
    true, // step 3
  ];

  const handleCreate = async () => {
    setCreating(true);
    try {
      const payload = {
        name:          generatedName,
        container_type: containerType,
        project_id:    selectedProject?.id   ?? '',
        project_name:  selectedProject?.name ?? '',
        pipeline:      pipelineMode === 'existing'
          ? (selectedPipeline?.name ?? '')
          : `${selectedTemplate?.label ?? 'custom'}-pipeline`,
        image: `registry.atonix.io/${selectedProject?.name ?? 'org'}/${generatedName}`,
        image_tag:     'latest',
        commit_sha:    '',
        cpu,
        memory,
        replicas,
        autoscaling,
        autoscale_min: autoscaleMin,
        autoscale_max: autoscaleMax,
        autoscale_cpu: autoscaleCpu,
        expose,
        port,
        domain,
      };
      const container = await createContainer(payload);
      reset();
      onCreated(container);
    } catch (err: any) {
      // surface error without crashing the wizard
      console.error('Container creation failed:', err?.response?.data ?? err);
    } finally {
      setCreating(false);
    }
  };

  const statusPill = (s: string) => {
    const map: Record<string, string> = { success: dashboardSemanticColors.success, running: dashboardSemanticColors.info, failed: dashboardSemanticColors.danger };
    const color = map[s] ?? '#6B7280';
    return (
      <Chip label={s} size="small"
        sx={{ bgcolor: `${color}22`, color, fontWeight: 700, fontSize: '.65rem', height: 18, border: `1px solid ${color}44` }} />
    );
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth
      PaperProps={{ sx: { bgcolor: t.surface, border: `1px solid ${t.border}`, borderRadius: '8px', boxShadow: 'none', fontFamily: FONT, minHeight: 560 } }}>
      {/* Header */}
      <DialogTitle sx={{ p: 0 }}>
        <Box sx={{ px: 3, pt: 2.5, pb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', color: t.textPrimary, fontFamily: FONT }}>
              Create Container
            </Typography>
            <Typography sx={{ fontSize: '.78rem', color: t.textSecondary, mt: 0.2, fontFamily: FONT }}>
              Step {step + 1} of {STEP_LABELS.length} — {STEP_LABELS[step]}
            </Typography>
          </Box>
          <IconButton onClick={handleClose} size="small" sx={{ color: t.textSecondary }}>
            <CloseIcon />
          </IconButton>
        </Box>
        {/* Progress bar */}
        <LinearProgress
          variant="determinate"
          value={((step + 1) / STEP_LABELS.length) * 100}
          sx={{ height: 2, bgcolor: t.border, '& .MuiLinearProgress-bar': { bgcolor: t.brandPrimary } }}
        />
        {/* Step breadcrumbs */}
        <Stack direction="row" sx={{ px: 3, py: 1.25, borderBottom: `1px solid ${t.border}` }} spacing={0} alignItems="center">
          {STEP_LABELS.map((label, i) => (
            <React.Fragment key={label}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                <Box sx={{
                  width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.65rem', fontWeight: 800,
                  bgcolor: i < step ? dashboardSemanticColors.success : i === step ? t.brandPrimary : t.surfaceSubtle,
                  color: i <= step ? '#0a0f1a' : t.textTertiary,
                  transition: 'all .2s',
                }}>
                  {i < step ? <CheckCircleIcon sx={{ fontSize: '.75rem' }} /> : i + 1}
                </Box>
                <Typography sx={{ fontSize: '.72rem', fontWeight: i === step ? 700 : 500, color: i === step ? t.textPrimary : t.textTertiary, fontFamily: FONT }}>
                  {label}
                </Typography>
              </Box>
              {i < STEP_LABELS.length - 1 && (
                <Box sx={{ flex: 1, height: 1, bgcolor: i < step ? dashboardSemanticColors.success : t.border, mx: 1, opacity: 0.6 }} />
              )}
            </React.Fragment>
          ))}
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ p: 3 }}>

          {/* ── STEP 0: Container Type ─────────────────────────────── */}
          {step === 0 && (
            <Box>
              <Typography sx={{ fontSize: '.9rem', fontWeight: 700, color: t.textPrimary, mb: 0.5, fontFamily: FONT }}>
                What type of container are you deploying?
              </Typography>
              <Typography sx={{ fontSize: '.78rem', color: t.textSecondary, mb: 2, fontFamily: FONT }}>
                Choose a type — this determines networking, scaling, and configuration options.
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                {CONTAINER_TYPES.map(({ type, label, desc, icon }) => {
                  const selected = containerType === type;
                  return (
                    <Card key={type} onClick={() => setContainerType(type)} sx={{
                      cursor: 'pointer', border: `1.5px solid ${selected ? t.brandPrimary : t.border}`,
                      bgcolor: selected ? `${t.brandPrimary}0d` : t.surfaceSubtle, borderRadius: '8px', boxShadow: 'none',
                      transition: 'all .15s', '&:hover': { border: `1.5px solid ${t.brandPrimary}88` },
                    }}>
                      <CardContent sx={{ p: '14px !important', display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                        <Box sx={{ color: selected ? t.brandPrimary : t.textSecondary, mt: 0.25, flexShrink: 0 }}>{icon}</Box>
                        <Box>
                          <Typography sx={{ fontWeight: 700, fontSize: '.88rem', color: t.textPrimary, fontFamily: FONT }}>{label}</Typography>
                          <Typography sx={{ fontSize: '.75rem', color: t.textSecondary, mt: 0.25, fontFamily: FONT }}>{desc}</Typography>
                        </Box>
                        {selected && <CheckCircleIcon sx={{ ml: 'auto', color: t.brandPrimary, fontSize: '1.1rem', flexShrink: 0 }} />}
                      </CardContent>
                    </Card>
                  );
                })}
              </Box>
            </Box>
          )}

          {/* ── STEP 1: Link to Project ────────────────────────────── */}
          {step === 1 && (
            <Box>
              <Typography sx={{ fontSize: '.9rem', fontWeight: 700, color: t.textPrimary, mb: 0.5, fontFamily: FONT }}>
                Link to a project
              </Typography>
              <Typography sx={{ fontSize: '.78rem', color: t.textSecondary, mb: 2, fontFamily: FONT }}>
                The container inherits the project's environment, region, and secrets.
              </Typography>
              <Stack spacing={1.25}>
                {projects.map(proj => {
                  const selected = selectedProject?.id === proj.id;
                  return (
                    <Card key={proj.id} onClick={() => setSelectedProject(proj)} sx={{
                      cursor: 'pointer', border: `1.5px solid ${selected ? t.brandPrimary : t.border}`,
                      bgcolor: selected ? `${t.brandPrimary}0d` : t.surfaceSubtle, borderRadius: '8px', boxShadow: 'none',
                      transition: 'all .15s', '&:hover': { border: `1.5px solid ${t.brandPrimary}88` },
                    }}>
                      <CardContent sx={{ p: '12px 16px !important', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ width: 36, height: 36, borderRadius: '6px', bgcolor: `${t.brandPrimary}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Typography sx={{ fontSize: '.72rem', fontWeight: 800, color: t.brandPrimary, fontFamily: 'monospace' }}>
                            {proj.name.slice(0, 2).toUpperCase()}
                          </Typography>
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography sx={{ fontWeight: 700, fontSize: '.88rem', color: t.textPrimary, fontFamily: FONT }}>{proj.name}</Typography>
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.25 }}>
                            <Chip label={proj.env} size="small" sx={{ height: 16, fontSize: '.62rem', fontWeight: 700, bgcolor: `${dashboardSemanticColors.success}18`, color: dashboardSemanticColors.success }} />
                            <Typography sx={{ fontSize: '.7rem', color: t.textTertiary, fontFamily: FONT }}>owner: {proj.owner}</Typography>
                          </Stack>
                        </Box>
                        {selected && <CheckCircleIcon sx={{ color: t.brandPrimary, fontSize: '1.1rem' }} />}
                      </CardContent>
                    </Card>
                  );
                })}
              </Stack>
              {selectedProject && (
                <Box sx={{ mt: 2, p: 1.5, bgcolor: t.surfaceSubtle, borderRadius: '6px', border: `1px solid ${t.border}` }}>
                  <Typography sx={{ fontSize: '.75rem', color: t.textSecondary, fontFamily: FONT }}>
                    Auto-generated name:&nbsp;
                    <Box component="span" sx={{ fontFamily: 'monospace', color: t.brandPrimary, fontWeight: 700 }}>{generatedName}</Box>
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {/* ── STEP 2: Connect to Pipeline ───────────────────────── */}
          {step === 2 && (
            <Box>
              <Typography sx={{ fontSize: '.9rem', fontWeight: 700, color: t.textPrimary, mb: 0.5, fontFamily: FONT }}>
                Connect to a CI/CD pipeline
              </Typography>
              <Typography sx={{ fontSize: '.78rem', color: t.textSecondary, mb: 2, fontFamily: FONT }}>
                The pipeline builds, pushes, and deploys new image versions automatically.
              </Typography>
              <ToggleButtonGroup value={pipelineMode} exclusive onChange={(_, v) => v && setPipelineMode(v)}
                sx={{ mb: 2, '& .MuiToggleButton-root': { textTransform: 'none', fontSize: '.78rem', fontFamily: FONT, px: 2, py: 0.75, border: `1px solid ${t.border}`, color: t.textSecondary, '&.Mui-selected': { bgcolor: `${t.brandPrimary}18`, color: t.brandPrimary, borderColor: t.brandPrimary, fontWeight: 700 } } }}>
                <ToggleButton value="existing"><LinkIcon sx={{ fontSize: '1rem', mr: 0.75 }} />Attach Existing</ToggleButton>
                <ToggleButton value="new"><AddIcon sx={{ fontSize: '1rem', mr: 0.75 }} />Create New</ToggleButton>
              </ToggleButtonGroup>

              {pipelineMode === 'existing' && (
                <Stack spacing={1}>
                  {filteredPipelines.length === 0 && (
                    <Typography sx={{ fontSize: '.78rem', color: t.textSecondary, fontStyle: 'italic' }}>
                      No pipelines found for this project.
                    </Typography>
                  )}
                  {filteredPipelines.map(p => {
                    const sel = selectedPipeline?.id === p.id;
                    return (
                      <Card key={p.id} onClick={() => setSelectedPipeline(p)} sx={{
                        cursor: 'pointer', border: `1.5px solid ${sel ? t.brandPrimary : t.border}`,
                        bgcolor: sel ? `${t.brandPrimary}0d` : t.surfaceSubtle, borderRadius: '8px', boxShadow: 'none',
                        transition: 'all .15s', '&:hover': { border: `1.5px solid ${t.brandPrimary}88` },
                      }}>
                        <CardContent sx={{ p: '12px 16px !important', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <AutorenewIcon sx={{ color: t.textSecondary, fontSize: '1.2rem' }} />
                          <Box sx={{ flex: 1 }}>
                            <Typography sx={{ fontWeight: 700, fontSize: '.88rem', color: t.textPrimary, fontFamily: FONT }}>{p.name}</Typography>
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.25 }}>
                              {statusPill(p.status)}
                              <Typography sx={{ fontSize: '.7rem', color: t.textTertiary, fontFamily: FONT }}>Last run: {p.lastRun}</Typography>
                            </Stack>
                          </Box>
                          {sel && <CheckCircleIcon sx={{ color: t.brandPrimary, fontSize: '1.1rem' }} />}
                        </CardContent>
                      </Card>
                    );
                  })}
                </Stack>
              )}

              {pipelineMode === 'new' && (
                <Box>
                  <Typography sx={{ fontSize: '.8rem', fontWeight: 600, color: t.textSecondary, mb: 1, fontFamily: FONT }}>Choose a pipeline template:</Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 1 }}>
                    {PIPELINE_TEMPLATES.map(tpl => {
                      const sel = selectedTemplate?.id === tpl.id;
                      return (
                        <Card key={tpl.id} onClick={() => setSelectedTemplate(tpl)} sx={{
                          cursor: 'pointer', border: `1.5px solid ${sel ? t.brandPrimary : t.border}`,
                          bgcolor: sel ? `${t.brandPrimary}0d` : t.surfaceSubtle, borderRadius: '8px', boxShadow: 'none',
                        }}>
                          <CardContent sx={{ p: '10px 14px !important', display: 'flex', alignItems: 'center', gap: 1.25 }}>
                            <Box>
                              <Typography sx={{ fontWeight: 700, fontSize: '.82rem', color: t.textPrimary, fontFamily: FONT }}>{tpl.label}</Typography>
                              <Typography sx={{ fontSize: '.7rem', color: t.textTertiary, fontFamily: 'monospace' }}>{tpl.image}</Typography>
                            </Box>
                            {sel && <CheckCircleIcon sx={{ ml: 'auto', color: t.brandPrimary, fontSize: '1rem' }} />}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </Box>
                  <Box sx={{ mt: 2, p: 1.5, bgcolor: t.surfaceSubtle, border: `1px solid ${t.border}`, borderRadius: '6px' }}>
                    <Typography sx={{ fontSize: '.72rem', color: t.textTertiary, fontFamily: FONT }}>
                      A new pipeline will be created and auto-linked to this container. It will build on every push to <Box component="span" sx={{ fontFamily: 'monospace', color: t.brandPrimary }}>main</Box>.
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>
          )}

          {/* ── STEP 3: Runtime & Networking ──────────────────────── */}
          {step === 3 && (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
              {/* Left: Controls */}
              <Box>
                <Typography sx={{ fontSize: '.9rem', fontWeight: 700, color: t.textPrimary, mb: 2, fontFamily: FONT }}>Runtime</Typography>

                {/* CPU */}
                <Box sx={{ mb: 2.5 }}>
                  <Stack direction="row" justifyContent="space-between" mb={0.5}>
                    <Typography sx={{ fontSize: '.78rem', fontWeight: 600, color: t.textSecondary, fontFamily: FONT }}>CPU</Typography>
                    <Typography sx={{ fontSize: '.78rem', fontFamily: 'monospace', color: t.brandPrimary, fontWeight: 700 }}>{cpu} vCPU</Typography>
                  </Stack>
                  <Slider value={cpu} onChange={(_, v) => setCpu(v as number)}
                    min={0.25} max={4} step={null} marks={CPU_MARKS}
                    sx={{ color: t.brandPrimary, '& .MuiSlider-markLabel': { fontSize: '.65rem', color: t.textTertiary } }} />
                </Box>

                {/* Memory */}
                <Box sx={{ mb: 2.5 }}>
                  <Stack direction="row" justifyContent="space-between" mb={0.5}>
                    <Typography sx={{ fontSize: '.78rem', fontWeight: 600, color: t.textSecondary, fontFamily: FONT }}>Memory</Typography>
                    <Typography sx={{ fontSize: '.78rem', fontFamily: 'monospace', color: t.brandPrimary, fontWeight: 700 }}>{formatMem(memory)}</Typography>
                  </Stack>
                  <Slider value={memory} onChange={(_, v) => setMemory(v as number)}
                    min={256} max={4096} step={null} marks={MEM_MARKS}
                    sx={{ color: t.brandPrimary, '& .MuiSlider-markLabel': { fontSize: '.65rem', color: t.textTertiary } }} />
                </Box>

                {/* Replicas */}
                <Box sx={{ mb: 2.5 }}>
                  <Stack direction="row" justifyContent="space-between" mb={0.5}>
                    <Typography sx={{ fontSize: '.78rem', fontWeight: 600, color: t.textSecondary, fontFamily: FONT }}>Replicas</Typography>
                    <Typography sx={{ fontSize: '.78rem', fontFamily: 'monospace', color: t.brandPrimary, fontWeight: 700 }}>{replicas}</Typography>
                  </Stack>
                  <Slider value={replicas} onChange={(_, v) => setReplicas(v as number)}
                    min={1} max={10} step={1} marks
                    sx={{ color: t.brandPrimary }} />
                </Box>

                {/* Autoscaling */}
                <Box sx={{ p: 1.5, border: `1px solid ${t.border}`, borderRadius: '8px', mb: 2, bgcolor: autoscaling ? `${t.brandPrimary}06` : 'transparent' }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: autoscaling ? 1.5 : 0 }}>
                    <Box>
                      <Typography sx={{ fontSize: '.82rem', fontWeight: 700, color: t.textPrimary, fontFamily: FONT }}>Autoscaling</Typography>
                      <Typography sx={{ fontSize: '.7rem', color: t.textSecondary, fontFamily: FONT }}>Scale replicas by CPU usage</Typography>
                    </Box>
                    <Switch checked={autoscaling} onChange={e => setAutoscaling(e.target.checked)}
                      size="small" sx={{ '& .MuiSwitch-thumb': { bgcolor: autoscaling ? t.brandPrimary : '#6B7280' } }} />
                  </Stack>
                  {autoscaling && (
                    <Stack spacing={1}>
                      <Stack direction="row" spacing={1}>
                        <TextField label="Min" type="number" size="small" value={autoscaleMin}
                          onChange={e => setAutoscaleMin(+e.target.value)}
                          InputProps={{ sx: { fontFamily: 'monospace', fontSize: '.82rem', bgcolor: t.surfaceSubtle } }}
                          InputLabelProps={{ sx: { color: t.textSecondary, fontSize: '.78rem' } }} sx={{ flex: 1 }} />
                        <TextField label="Max" type="number" size="small" value={autoscaleMax}
                          onChange={e => setAutoscaleMax(+e.target.value)}
                          InputProps={{ sx: { fontFamily: 'monospace', fontSize: '.82rem', bgcolor: t.surfaceSubtle } }}
                          InputLabelProps={{ sx: { color: t.textSecondary, fontSize: '.78rem' } }} sx={{ flex: 1 }} />
                        <TextField label="Target CPU %" type="number" size="small" value={autoscaleCpu}
                          onChange={e => setAutoscaleCpu(+e.target.value)}
                          InputProps={{ sx: { fontFamily: 'monospace', fontSize: '.82rem', bgcolor: t.surfaceSubtle } }}
                          InputLabelProps={{ sx: { color: t.textSecondary, fontSize: '.78rem' } }} sx={{ flex: 1 }} />
                      </Stack>
                    </Stack>
                  )}
                </Box>

                {/* Networking */}
                <Typography sx={{ fontSize: '.9rem', fontWeight: 700, color: t.textPrimary, mb: 1.5, mt: 0.5, fontFamily: FONT }}>Networking</Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
                  {(['public', 'private', 'internal'] as ExposeType[]).map(opt => (
                    <Box key={opt} onClick={() => setExpose(opt)} sx={{
                      flex: 1, textAlign: 'center', py: 1, borderRadius: '6px', cursor: 'pointer', fontFamily: FONT, fontSize: '.78rem', fontWeight: 700,
                      border: `1.5px solid ${expose === opt ? t.brandPrimary : t.border}`,
                      bgcolor: expose === opt ? `${t.brandPrimary}12` : t.surfaceSubtle,
                      color: expose === opt ? t.brandPrimary : t.textSecondary,
                      transition: 'all .15s',
                    }}>
                      {opt.charAt(0).toUpperCase() + opt.slice(1)}
                    </Box>
                  ))}
                </Box>
                {(containerType === 'runtime') && (
                  <Stack spacing={1}>
                    <TextField label="Port" type="number" size="small" value={port}
                      onChange={e => setPort(+e.target.value)} fullWidth
                      InputProps={{ sx: { fontFamily: 'monospace', fontSize: '.82rem', bgcolor: t.surfaceSubtle } }}
                      InputLabelProps={{ sx: { color: t.textSecondary, fontSize: '.78rem' } }} />
                    {expose === 'public' && (
                      <TextField label="Custom Domain (optional)" size="small" value={domain}
                        onChange={e => setDomain(e.target.value)} fullWidth
                        placeholder="api.yourdomain.com"
                        InputProps={{ sx: { fontFamily: 'monospace', fontSize: '.82rem', bgcolor: t.surfaceSubtle } }}
                        InputLabelProps={{ sx: { color: t.textSecondary, fontSize: '.78rem' } }} />
                    )}
                  </Stack>
                )}
              </Box>

              {/* Right: Live YAML Preview */}
              <Box>
                <Typography sx={{ fontSize: '.9rem', fontWeight: 700, color: t.textPrimary, mb: 1.5, fontFamily: FONT }}>Live Preview</Typography>
                <Box sx={{
                  bgcolor: '#0d1117', borderRadius: '8px', border: `1px solid ${t.border}`,
                  p: 2, fontFamily: 'monospace', fontSize: '.72rem', lineHeight: 1.65,
                  color: '#e6edf3', overflowX: 'auto', minHeight: 240, whiteSpace: 'pre',
                }}>
                  {yamlPreview.split('\n').map((line, i) => {
                    const isKey = /^\s*\w[\w-]*:/.test(line) && !line.trim().startsWith('#');
                    const indent = line.match(/^(\s*)/)?.[1].length ?? 0;
                    const parts = isKey ? line.split(/:(.+)/) : [line];
                    return (
                      <Box key={i} component="div">
                        {isKey ? (
                          <>
                            <Box component="span" sx={{ color: '#79c0ff' }}>{' '.repeat(indent)}{parts[0].trim()}:</Box>
                            {parts[1] && <Box component="span" sx={{ color: '#a5d6ff' }}>{parts[1]}</Box>}
                          </>
                        ) : (
                          <Box component="span">{line}</Box>
                        )}
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            </Box>
          )}
        </Box>
      </DialogContent>

      {/* Footer actions */}
      <Divider sx={{ borderColor: t.border }} />
      <Box sx={{ px: 3, py: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button onClick={step === 0 ? handleClose : () => setStep(s => s - 1)} startIcon={step > 0 ? <ArrowBackIcon /> : undefined}
          sx={{ textTransform: 'none', color: t.textSecondary, fontSize: '.82rem', fontFamily: FONT }}>
          {step === 0 ? 'Cancel' : 'Back'}
        </Button>
        {step < STEP_LABELS.length - 1 ? (
          <Button variant="contained" endIcon={<ArrowForwardIcon />} disabled={!canNext[step]}
            onClick={() => setStep(s => s + 1)}
            sx={{ textTransform: 'none', bgcolor: t.brandPrimary, color: '#0a0f1a', fontWeight: 700, fontSize: '.82rem', fontFamily: FONT, boxShadow: 'none', borderRadius: '6px', '&:hover': { bgcolor: t.brandPrimaryHover, boxShadow: 'none' } }}>
            Continue
          </Button>
        ) : (
          <Button variant="contained" endIcon={creating ? <CircularProgress size={14} color="inherit" /> : <RocketLaunchIcon />}
            onClick={handleCreate} disabled={creating}
            sx={{ textTransform: 'none', bgcolor: t.brandPrimary, color: '#0a0f1a', fontWeight: 700, fontSize: '.82rem', fontFamily: FONT, boxShadow: 'none', borderRadius: '6px', '&:hover': { bgcolor: t.brandPrimaryHover, boxShadow: 'none' } }}>
            {creating ? 'Deploying…' : 'Create Container'}
          </Button>
        )}
      </Box>
    </Dialog>
  );
};

// Helper inside wizard for status pills
function _statusPill(s: string) {
  const map: Record<string, string> = {
    success: dashboardSemanticColors.success,
    running: dashboardSemanticColors.info,
    failed: dashboardSemanticColors.danger,
  };
  return (
    <Chip label={s} size="small"
      sx={{ bgcolor: `${map[s] ?? '#6B7280'}22`, color: map[s] ?? '#6B7280', fontWeight: 700, fontSize: '.65rem', height: 18, border: `1px solid ${map[s] ?? '#6B7280'}44` }} />
  );
}

export default CreateContainerWizard;
