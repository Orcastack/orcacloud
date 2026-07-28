/**
 * PipelineBuilderPage — Pipeline Builder Dashboard
 *
 * Left-side developer experience:
 *  • List all named pipeline definitions for a project
 *  • Create / edit a definition (YAML editor + visual stage builder)
 *  • Manage stages, steps, variables, and triggers
 *  • Trigger a run from the builder
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress,
  Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, FormControl, IconButton, InputLabel, MenuItem,
  Select, Stack, Tab, Tabs, TextField, Tooltip, Typography,
} from '@mui/material';
import AddIcon        from '@mui/icons-material/Add';
import DeleteIcon     from '@mui/icons-material/Delete';
import EditIcon       from '@mui/icons-material/Edit';
import PlayArrowIcon  from '@mui/icons-material/PlayArrow';
import CodeIcon       from '@mui/icons-material/Code';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon       from '@mui/icons-material/Error';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import { useNavigate } from 'react-router-dom';
import {
  dashboardCardSx, dashboardPrimaryButtonSx,
  dashboardSemanticColors, dashboardTokens,
} from '../styles/dashboardDesignSystem';
import {
  listDefinitions, createDefinition, updateDefinition, deleteDefinition,
  updateDefinitionYaml, triggerDefinition,
  listProjects, listRepositories,
  type PipelineDefinition, type BackendProject, type BackendRepository,
} from '../services/pipelinesApi';

const FONT = '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
const t    = dashboardTokens.colors;

/* ───────────── status helpers ─────────────────────────────────────── */

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
  success:   { color: dashboardSemanticColors.success, bg: 'rgba(34,197,94,.12)',   icon: <CheckCircleIcon sx={{ fontSize: 14 }} />, label: 'Success' },
  failed:    { color: dashboardSemanticColors.danger,  bg: 'rgba(239,68,68,.12)',   icon: <ErrorIcon sx={{ fontSize: 14 }} />,        label: 'Failed' },
  running:   { color: dashboardSemanticColors.info,    bg: 'rgba(21,61,117,.12)',   icon: <CircularProgress size={10} />,              label: 'Running' },
  pending:   { color: '#6B7280',                       bg: 'rgba(107,114,128,.12)', icon: <HourglassEmptyIcon sx={{ fontSize: 14 }} />, label: 'Pending' },
  cancelled: { color: '#6B7280',                       bg: 'rgba(107,114,128,.12)', icon: <HourglassEmptyIcon sx={{ fontSize: 14 }} />, label: 'Cancelled' },
  waiting:   { color: '#F59E0B',                       bg: 'rgba(245,158,11,.12)',  icon: <HourglassEmptyIcon sx={{ fontSize: 14 }} />, label: 'Waiting' },
  skipped:   { color: '#6B7280',                       bg: 'rgba(107,114,128,.12)', icon: <HourglassEmptyIcon sx={{ fontSize: 14 }} />, label: 'Skipped' },
};

const DEFAULT_YAML = `pipeline:
  name: "My Pipeline"
  project: "<project-id>"

  variables:
    - name: ENV
      value: production

  stages:
    - name: Build
      type: build
      steps:
        - name: Install Dependencies
          type: script
          script: npm install
        - name: Build App
          type: script
          script: npm run build

    - name: Test
      type: test
      steps:
        - name: Run Unit Tests
          type: script
          script: npm test

    - name: Deploy
      type: deploy
      environment: production
      steps:
        - name: Deploy to Kubernetes
          type: kubernetes
          config:
            manifest: k8s/deployment.yaml
`;

const STAGE_COLORS: Record<string, string> = {
  build:    dashboardSemanticColors.info,
  test:     '#8B5CF6',
  security: '#F59E0B',
  deploy:   dashboardSemanticColors.success,
  verify:   '#06B6D4',
  notify:   '#6B7280',
  custom:   '#EC4899',
};

function timeAgo(iso: string) {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60)    return `${Math.round(d)}s ago`;
  if (d < 3600)  return `${Math.round(d / 60)}m ago`;
  if (d < 86400) return `${Math.round(d / 3600)}h ago`;
  return `${Math.round(d / 86400)}d ago`;
}

/* ─────────────── Visual Stage Card ──────────────────────────────────── */

interface StageCardProps {
  stage: PipelineDefinition['stages'][0];
  index: number;
  total: number;
}

const StageCard: React.FC<StageCardProps> = ({ stage, index, total }) => {
  const color = STAGE_COLORS[stage.type] ?? '#6B7280';
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0 }}>
      {/* connector line */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 1.5 }}>
        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
        {index < total - 1 && (
          <Box sx={{ width: 2, height: '100%', minHeight: 32, bgcolor: color, opacity: .35 }} />
        )}
      </Box>
      <Box sx={{
        ml: 1.5, mb: 1.5, flex: 1,
        border: `1px solid ${color}44`,
        borderRadius: 2,
        bgcolor: `${color}0a`,
        p: 1.5,
      }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" gap={1}>
            <Chip
              size="small"
              label={stage.type.toUpperCase()}
              sx={{ bgcolor: `${color}22`, color, fontWeight: 700, fontSize: '0.65rem' }}
            />
            <Typography sx={{ fontWeight: 700, fontSize: '.88rem', color: t.textPrimary }}>
              {stage.name}
            </Typography>
            {stage.parallel && (
              <Chip size="small" label="PARALLEL" sx={{ bgcolor: 'rgba(245,158,11,.2)', color: '#F59E0B', fontSize: '0.6rem' }} />
            )}
          </Stack>
          {stage.environment && (
            <Typography sx={{ fontSize: '.72rem', color: t.textTertiary }}>
              env: {stage.environment}
            </Typography>
          )}
        </Stack>
        {stage.steps.length > 0 && (
          <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            {stage.steps.map((step) => (
              <Box key={step.id} sx={{
                px: 1, py: 0.35,
                border: `1px solid ${t.border}`,
                borderRadius: 1,
                bgcolor: t.surfaceSubtle,
                display: 'flex', alignItems: 'center', gap: 0.5,
              }}>
                <CodeIcon sx={{ fontSize: 11, color: t.textTertiary }} />
                <Typography sx={{ fontSize: '.72rem', color: t.textSecondary }}>{step.name}</Typography>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
};

/* ─────────────── Main Component ──────────────────────────────────────── */

const PipelineBuilderPage: React.FC = () => {
  const navigate = useNavigate();

  const [definitions, setDefinitions] = useState<PipelineDefinition[]>([]);
  const [projects,    setProjects]    = useState<BackendProject[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);

  // filter
  const [filterProject, setFilterProject] = useState('');

  // selected definition for detail view
  const [selected,  setSelected]  = useState<PipelineDefinition | null>(null);
  const [detailTab, setDetailTab] = useState(0);

  // create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', description: '', project: '' });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError,   setCreateError]   = useState<string | null>(null);

  // yaml editing
  const [yamlText,    setYamlText]    = useState('');
  const [yamlSaving,  setYamlSaving]  = useState(false);
  const [yamlSaved,   setYamlSaved]   = useState(false);

  // trigger dialog
  const [triggerOpen,    setTriggerOpen]    = useState(false);
  const [triggerForm,    setTriggerForm]    = useState({ project: '', repo: '', branch: 'main', commit_msg: '' });
  const [triggerLoading, setTriggerLoading] = useState(false);
  const [triggerError,   setTriggerError]   = useState<string | null>(null);
  const [triggerRepos,   setTriggerRepos]   = useState<BackendRepository[]>([]);
  const [triggerReposLoading, setTriggerReposLoading] = useState(false);

  // delete confirm
  const [deleteTarget, setDeleteTarget] = useState<PipelineDefinition | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [defs, projs] = await Promise.all([
        listDefinitions(filterProject ? { project: filterProject } : {}),
        listProjects(),
      ]);
      setDefinitions(defs);
      setProjects(projs);
    } catch {
      setError('Failed to load pipeline definitions.');
    } finally {
      setLoading(false);
    }
  }, [filterProject]);

  useEffect(() => { load(); }, [load]);

  // Load repos whenever trigger dialog is open and project is selected
  useEffect(() => {
    if (!triggerOpen || !triggerForm.project) {
      setTriggerRepos([]);
      return;
    }
    let cancelled = false;
    setTriggerReposLoading(true);
    setTriggerRepos([]);
    listRepositories({ project: triggerForm.project })
      .then((repos) => { if (!cancelled) setTriggerRepos(repos); })
      .catch(() => { if (!cancelled) setTriggerRepos([]); })
      .finally(() => { if (!cancelled) setTriggerReposLoading(false); });
    return () => { cancelled = true; };
  }, [triggerOpen, triggerForm.project]);

  const handleSelect = (def: PipelineDefinition) => {
    setSelected(def);
    setYamlText(def.yaml_definition || DEFAULT_YAML);
    setDetailTab(0);
    setYamlSaved(false);
  };

  const handleCreate = async () => {
    if (!createForm.name || !createForm.project) {
      setCreateError('Name and project are required.');
      return;
    }
    setCreateLoading(true);
    setCreateError(null);
    try {
      const def = await createDefinition({
        project: createForm.project,
        name:    createForm.name,
        description: createForm.description,
        yaml_definition: DEFAULT_YAML,
      });
      setCreateOpen(false);
      setCreateForm({ name: '', description: '', project: '' });
      await load();
      handleSelect(def);
    } catch {
      setCreateError('Failed to create pipeline definition.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleSaveYaml = async () => {
    if (!selected) return;
    setYamlSaving(true);
    try {
      await updateDefinitionYaml(selected.id, yamlText);
      setYamlSaved(true);
      setTimeout(() => setYamlSaved(false), 2500);
    } catch {
      setError('Failed to save YAML.');
    } finally {
      setYamlSaving(false);
    }
  };

  const handleTrigger = async () => {
    if (!selected) return;
    setTriggerLoading(true);
    setTriggerError(null);
    try {
      const run = await triggerDefinition(selected.id, {
        branch:     triggerForm.branch,
        commit_msg: triggerForm.commit_msg,
        repo:       triggerForm.repo || null,
      });
      setTriggerOpen(false);
      navigate(`/developer/Dashboard/cicd/runs/${run.id}`);
    } catch {
      setTriggerError('Failed to trigger pipeline run.');
    } finally {
      setTriggerLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deleteDefinition(deleteTarget.id);
      setDeleteTarget(null);
      if (selected?.id === deleteTarget.id) setSelected(null);
      await load();
    } catch {
      setError('Failed to delete pipeline definition.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleToggleActive = async (def: PipelineDefinition) => {
    try {
      await updateDefinition(def.id, { is_active: !def.is_active });
      await load();
    } catch {
      setError('Failed to update definition.');
    }
  };

  /* ─── render ─── */
  return (
    <Box sx={{ display: 'flex', height: '100%', minHeight: '100vh', bgcolor: t.background, fontFamily: FONT }}>

      {/* ────── LEFT PANEL: Definition list ────── */}
      <Box sx={{
        width: { xs: '100%', md: 340 },
        borderRight: `1px solid ${t.border}`,
        display: 'flex', flexDirection: 'column',
        bgcolor: t.surface,
        flexShrink: 0,
      }}>
        {/* header */}
        <Box sx={{ p: 2, borderBottom: `1px solid ${t.border}` }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: t.textPrimary, fontSize: '1rem' }}>
                Pipeline Builder
              </Typography>
              <Typography variant="body2" sx={{ color: t.textSecondary, fontSize: '.75rem' }}>
                Design and configure CI/CD pipelines
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              size="small"
              sx={dashboardPrimaryButtonSx}
              onClick={() => setCreateOpen(true)}
            >
              New
            </Button>
          </Stack>
          <FormControl size="small" fullWidth>
            <InputLabel sx={{ color: t.textSecondary }}>Filter by project</InputLabel>
            <Select
              value={filterProject}
              label="Filter by project"
              onChange={(e) => setFilterProject(e.target.value)}
              sx={{ color: t.textPrimary, bgcolor: t.surfaceSubtle }}
            >
              <MenuItem value="">All Projects</MenuItem>
              {projects.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
            </Select>
          </FormControl>
        </Box>

        {/* list */}
        <Box sx={{ flex: 1, overflowY: 'auto' }}>
          {error && <Alert severity="error" sx={{ m: 1.5 }}>{error}</Alert>}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={28} sx={{ color: t.brandPrimary }} />
            </Box>
          ) : definitions.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <AccountTreeIcon sx={{ fontSize: 40, color: t.textTertiary, mb: 1 }} />
              <Typography sx={{ color: t.textSecondary, fontSize: '.85rem' }}>
                No pipelines yet. Create your first pipeline.
              </Typography>
            </Box>
          ) : (
            definitions.map((def) => {
              const isSelected = selected?.id === def.id;
              const lastStatus = def.last_run_status;
              const sc = lastStatus ? STATUS_CONFIG[lastStatus] : null;
              return (
                <Box
                  key={def.id}
                  onClick={() => handleSelect(def)}
                  sx={{
                    p: 1.75,
                    borderBottom: `1px solid ${t.border}`,
                    cursor: 'pointer',
                    bgcolor: isSelected ? `${t.brandPrimary}15` : 'transparent',
                    borderLeft: isSelected ? `3px solid ${t.brandPrimary}` : '3px solid transparent',
                    transition: 'all .15s',
                    '&:hover': { bgcolor: t.surfaceHover },
                  }}
                >
                  <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
                    <Box flex={1} minWidth={0}>
                      <Stack direction="row" alignItems="center" gap={0.75} mb={0.3}>
                        <Typography sx={{
                          fontWeight: 600, fontSize: '.88rem', color: t.textPrimary,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {def.name}
                        </Typography>
                        {!def.is_active && (
                          <Chip size="small" label="INACTIVE"
                            sx={{ bgcolor: 'rgba(107,114,128,.2)', color: '#6B7280', fontSize: '0.6rem', height: 16 }} />
                        )}
                      </Stack>
                      <Typography sx={{ fontSize: '.72rem', color: t.textTertiary, mb: 0.5 }}>
                        {def.project_name} • {def.stages.length} stage{def.stages.length !== 1 ? 's' : ''}
                      </Typography>
                      <Stack direction="row" alignItems="center" gap={1}>
                        {sc && (
                          <Stack direction="row" alignItems="center" gap={0.4}>
                            <Box sx={{ color: sc.color, display: 'flex' }}>{sc.icon}</Box>
                            <Typography sx={{ fontSize: '.7rem', color: sc.color }}>{sc.label}</Typography>
                          </Stack>
                        )}
                        <Typography sx={{ fontSize: '.7rem', color: t.textTertiary }}>
                          {def.total_runs} run{def.total_runs !== 1 ? 's' : ''}
                        </Typography>
                        <Typography sx={{ fontSize: '.7rem', color: t.textTertiary }}>
                          {timeAgo(def.updated_at)}
                        </Typography>
                      </Stack>
                    </Box>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(def); }}
                        sx={{ color: t.textTertiary, '&:hover': { color: dashboardSemanticColors.danger } }}
                      >
                        <DeleteIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Box>
              );
            })
          )}
        </Box>
      </Box>

      {/* ────── RIGHT PANEL: Definition detail ────── */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {!selected ? (
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 6 }}>
            <AccountTreeIcon sx={{ fontSize: 64, color: t.textTertiary, mb: 2 }} />
            <Typography variant="h6" sx={{ color: t.textSecondary, fontWeight: 600 }}>
              Select a pipeline to view and edit
            </Typography>
            <Typography sx={{ color: t.textTertiary, mt: 0.75, textAlign: 'center', maxWidth: 400, fontSize: '.88rem' }}>
              Choose a pipeline from the list, or create a new one to get started with the visual builder.
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              sx={{ ...dashboardPrimaryButtonSx, mt: 3 }}
              onClick={() => setCreateOpen(true)}
            >
              Create Pipeline
            </Button>
          </Box>
        ) : (
          <>
            {/* detail header */}
            <Box sx={{ px: 3, pt: 2.5, pb: 1.5, borderBottom: `1px solid ${t.border}`, bgcolor: t.surface }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
                <Box>
                  <Stack direction="row" alignItems="center" gap={1}>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: t.textPrimary }}>
                      {selected.name}
                    </Typography>
                    <Chip
                      size="small"
                      label={selected.is_active ? 'ACTIVE' : 'INACTIVE'}
                      onClick={() => handleToggleActive(selected)}
                      sx={{
                        bgcolor: selected.is_active ? 'rgba(34,197,94,.15)' : 'rgba(107,114,128,.15)',
                        color: selected.is_active ? dashboardSemanticColors.success : '#6B7280',
                        fontWeight: 700, fontSize: '0.65rem', cursor: 'pointer',
                      }}
                    />
                  </Stack>
                  <Typography sx={{ fontSize: '.78rem', color: t.textTertiary, mt: 0.25 }}>
                    {selected.project_name} • {selected.total_runs} total runs • updated {timeAgo(selected.updated_at)}
                  </Typography>
                </Box>
                <Stack direction="row" gap={1} flexWrap="wrap">
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<EditIcon />}
                    onClick={() => { setDetailTab(2); }}
                    sx={{ textTransform: 'none', borderColor: t.border, color: t.textSecondary, fontSize: '.8rem' }}
                  >
                    Edit YAML
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => navigate(`/developer/Dashboard/cicd/runs?definition=${selected.id}`)}
                    sx={{ textTransform: 'none', borderColor: t.border, color: t.textSecondary, fontSize: '.8rem' }}
                  >
                    View Runs
                  </Button>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<PlayArrowIcon />}
                    sx={dashboardPrimaryButtonSx}
                    onClick={() => {
                      setTriggerForm({
                        project:    selected?.project ?? '',
                        repo:       '',
                        branch:     'main',
                        commit_msg: '',
                      });
                      setTriggerError(null);
                      setTriggerOpen(true);
                    }}
                  >
                    Trigger Run
                  </Button>
                </Stack>
              </Stack>
              <Tabs
                value={detailTab}
                onChange={(_, v) => setDetailTab(v)}
                sx={{ mt: 1.5, '& .MuiTab-root': { color: t.textSecondary, fontSize: '.82rem', textTransform: 'none', minHeight: 36 }, '& .Mui-selected': { color: t.brandPrimary } }}
              >
                <Tab label="Visual Builder" />
                <Tab label="Variables" />
                <Tab label="YAML Editor" />
                <Tab label="Settings" />
              </Tabs>
            </Box>

            {/* tab content */}
            <Box sx={{ flex: 1, overflowY: 'auto', p: 2.5 }}>

              {/* ── Tab 0: Visual Builder ── */}
              {detailTab === 0 && (
                <Box>
                  {selected.stages.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 6 }}>
                      <AccountTreeIcon sx={{ fontSize: 40, color: t.textTertiary, mb: 1 }} />
                      <Typography sx={{ color: t.textSecondary }}>No stages defined yet.</Typography>
                      <Typography sx={{ color: t.textTertiary, fontSize: '.82rem', mt: 0.5 }}>
                        Switch to the YAML Editor tab to define stages and steps.
                      </Typography>
                    </Box>
                  ) : (
                    <Box sx={{ maxWidth: 640 }}>
                      <Typography sx={{ fontWeight: 700, color: t.textPrimary, mb: 2 }}>
                        Pipeline Flow — {selected.stages.length} Stage{selected.stages.length !== 1 ? 's' : ''}
                      </Typography>
                      {/* horizontal stage flow overview */}
                      <Box sx={{
                        display: 'flex', gap: 0, mb: 3, overflowX: 'auto',
                        p: 2, border: `1px solid ${t.border}`, borderRadius: 2, bgcolor: t.surfaceSubtle,
                      }}>
                        {selected.stages.map((stage, idx) => {
                          const color = STAGE_COLORS[stage.type] ?? '#6B7280';
                          return (
                            <React.Fragment key={stage.id}>
                              <Box sx={{
                                display: 'flex', flexDirection: 'column', alignItems: 'center',
                                minWidth: 90,
                              }}>
                                <Box sx={{
                                  width: 44, height: 44, borderRadius: '50%',
                                  bgcolor: `${color}22`, border: `2px solid ${color}`,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                  <AccountTreeIcon sx={{ fontSize: 18, color }} />
                                </Box>
                                <Typography sx={{
                                  fontSize: '.7rem', fontWeight: 700, color: t.textPrimary,
                                  mt: 0.75, textAlign: 'center', maxWidth: 80,
                                  overflow: 'hidden', textOverflow: 'ellipsis',
                                }}>
                                  {stage.name}
                                </Typography>
                                <Typography sx={{ fontSize: '.65rem', color: t.textTertiary }}>
                                  {stage.steps.length} step{stage.steps.length !== 1 ? 's' : ''}
                                </Typography>
                              </Box>
                              {idx < selected.stages.length - 1 && (
                                <Box sx={{ display: 'flex', alignItems: 'center', px: 0.5 }}>
                                  <Box sx={{ width: 28, height: 2, bgcolor: t.border }} />
                                  <Box sx={{
                                    width: 0, height: 0,
                                    borderTop: '5px solid transparent',
                                    borderBottom: '5px solid transparent',
                                    borderLeft: `6px solid ${t.border}`,
                                  }} />
                                </Box>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </Box>
                      {/* detailed stage cards */}
                      <Typography sx={{ fontWeight: 600, color: t.textSecondary, fontSize: '.8rem', mb: 1.5 }}>
                        STAGE DETAILS
                      </Typography>
                      {selected.stages.map((stage, idx) => (
                        <StageCard key={stage.id} stage={stage} index={idx} total={selected.stages.length} />
                      ))}
                    </Box>
                  )}
                </Box>
              )}

              {/* ── Tab 1: Variables ── */}
              {detailTab === 1 && (
                <Box sx={{ maxWidth: 600 }}>
                  <Typography sx={{ fontWeight: 700, color: t.textPrimary, mb: 2 }}>Pipeline Variables</Typography>
                  {selected.variables.length === 0 ? (
                    <Typography sx={{ color: t.textTertiary, fontSize: '.88rem' }}>
                      No variables defined. Add them in the YAML editor under{' '}
                      <code style={{ color: t.textPrimary }}>variables:</code>.
                    </Typography>
                  ) : (
                    <Box sx={{ border: `1px solid ${t.border}`, borderRadius: 2, overflow: 'hidden' }}>
                      {selected.variables.map((v, idx) => (
                        <Stack
                          key={idx}
                          direction="row"
                          alignItems="center"
                          justifyContent="space-between"
                          sx={{
                            px: 2, py: 1.25,
                            borderBottom: idx < selected.variables.length - 1 ? `1px solid ${t.border}` : 'none',
                            bgcolor: idx % 2 === 0 ? t.surface : t.surfaceSubtle,
                          }}
                        >
                          <Typography sx={{ fontFamily: 'monospace', fontSize: '.85rem', color: t.textPrimary, fontWeight: 600 }}>
                            {v.name}
                          </Typography>
                          <Typography sx={{ fontFamily: 'monospace', fontSize: '.82rem', color: v.secret ? t.textTertiary : t.textSecondary }}>
                            {v.secret ? '•••••••' : v.value}
                          </Typography>
                          {v.secret && (
                            <Chip size="small" label="SECRET"
                              sx={{ bgcolor: 'rgba(245,158,11,.15)', color: '#F59E0B', fontSize: '0.6rem' }} />
                          )}
                        </Stack>
                      ))}
                    </Box>
                  )}
                </Box>
              )}

              {/* ── Tab 2: YAML Editor ── */}
              {detailTab === 2 && (
                <Box sx={{ maxWidth: 800 }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
                    <Typography sx={{ fontWeight: 700, color: t.textPrimary }}>YAML Editor</Typography>
                    <Stack direction="row" gap={1} alignItems="center">
                      {yamlSaved && <Chip size="small" label="Saved" sx={{ bgcolor: 'rgba(34,197,94,.15)', color: dashboardSemanticColors.success }} />}
                      <Button
                        variant="contained"
                        size="small"
                        disabled={yamlSaving}
                        onClick={handleSaveYaml}
                        sx={dashboardPrimaryButtonSx}
                      >
                        {yamlSaving ? <CircularProgress size={16} /> : 'Save YAML'}
                      </Button>
                    </Stack>
                  </Stack>
                  <Box sx={{
                    border: `1px solid ${t.border}`, borderRadius: 2, overflow: 'hidden',
                    bgcolor: '#0f172a',
                  }}>
                    <Box sx={{
                      px: 2, py: 0.75, bgcolor: '#393939',
                      borderBottom: `1px solid ${t.border}`,
                      display: 'flex', alignItems: 'center', gap: 1,
                    }}>
                      <CodeIcon sx={{ fontSize: 14, color: '#64748b' }} />
                      <Typography sx={{ fontSize: '.72rem', color: '#64748b', fontFamily: 'monospace' }}>
                        pipeline.yaml
                      </Typography>
                    </Box>
                    <textarea
                      value={yamlText}
                      onChange={(e) => setYamlText(e.target.value)}
                      style={{
                        width: '100%',
                        minHeight: 440,
                        padding: '16px',
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        color: '#e2e8f0',
                        fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                        fontSize: '0.82rem',
                        lineHeight: 1.7,
                        resize: 'vertical',
                        boxSizing: 'border-box',
                        tabSize: 2,
                      }}
                      spellCheck={false}
                    />
                  </Box>
                  <Typography sx={{ mt: 1, fontSize: '.72rem', color: t.textTertiary }}>
                    Edit the pipeline YAML and click Save. The visual builder reflects the saved definition.
                  </Typography>
                </Box>
              )}

              {/* ── Tab 3: Settings ── */}
              {detailTab === 3 && (
                <Box sx={{ maxWidth: 560 }}>
                  <Typography sx={{ fontWeight: 700, color: t.textPrimary, mb: 2 }}>Pipeline Settings</Typography>
                  <Card sx={{ ...dashboardCardSx, mb: 2 }}>
                    <CardContent>
                      <Typography sx={{ fontWeight: 600, color: t.textPrimary, mb: 1.5, fontSize: '.92rem' }}>
                        General
                      </Typography>
                      <Stack spacing={1.5}>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography sx={{ color: t.textSecondary, fontSize: '.85rem' }}>Pipeline ID</Typography>
                          <Typography sx={{ fontFamily: 'monospace', fontSize: '.8rem', color: t.textPrimary }}>{selected.id}</Typography>
                        </Stack>
                        <Divider sx={{ borderColor: t.border }} />
                        <Stack direction="row" justifyContent="space-between">
                          <Typography sx={{ color: t.textSecondary, fontSize: '.85rem' }}>Project</Typography>
                          <Typography sx={{ fontSize: '.85rem', color: t.textPrimary }}>{selected.project_name}</Typography>
                        </Stack>
                        <Divider sx={{ borderColor: t.border }} />
                        <Stack direction="row" justifyContent="space-between">
                          <Typography sx={{ color: t.textSecondary, fontSize: '.85rem' }}>Created by</Typography>
                          <Typography sx={{ fontSize: '.85rem', color: t.textPrimary }}>{selected.created_by_username ?? '—'}</Typography>
                        </Stack>
                        <Divider sx={{ borderColor: t.border }} />
                        <Stack direction="row" justifyContent="space-between">
                          <Typography sx={{ color: t.textSecondary, fontSize: '.85rem' }}>Total runs</Typography>
                          <Typography sx={{ fontSize: '.85rem', color: t.textPrimary }}>{selected.total_runs}</Typography>
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                  <Card sx={{ ...dashboardCardSx, border: `1px solid ${dashboardSemanticColors.danger}44` }}>
                    <CardContent>
                      <Typography sx={{ fontWeight: 600, color: dashboardSemanticColors.danger, mb: 1.5, fontSize: '.92rem' }}>
                        Danger Zone
                      </Typography>
                      <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Box>
                          <Typography sx={{ fontSize: '.85rem', color: t.textPrimary }}>Delete pipeline</Typography>
                          <Typography sx={{ fontSize: '.75rem', color: t.textTertiary }}>
                            Permanently delete this pipeline definition and all its run history.
                          </Typography>
                        </Box>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<DeleteIcon />}
                          onClick={() => setDeleteTarget(selected)}
                          sx={{ textTransform: 'none', borderColor: dashboardSemanticColors.danger, color: dashboardSemanticColors.danger }}
                        >
                          Delete
                        </Button>
                      </Stack>
                    </CardContent>
                  </Card>
                </Box>
              )}
            </Box>
          </>
        )}
      </Box>

      {/* ── Create Pipeline Dialog ── */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: t.surface, color: t.textPrimary }}>Create Pipeline Definition</DialogTitle>
        <DialogContent sx={{ bgcolor: t.surface }}>
          {createError && <Alert severity="error" sx={{ mb: 2, mt: 1 }}>{createError}</Alert>}
          <Stack spacing={2} sx={{ mt: 1.5 }}>
            <FormControl fullWidth size="small">
              <InputLabel sx={{ color: t.textSecondary }}>Project *</InputLabel>
              <Select
                value={createForm.project}
                label="Project *"
                onChange={(e) => setCreateForm({ ...createForm, project: e.target.value })}
                sx={{ color: t.textPrimary, bgcolor: t.surfaceSubtle }}
              >
                {projects.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField
              fullWidth size="small"
              label="Pipeline Name *"
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              sx={{ '& .MuiInputBase-root': { bgcolor: t.surfaceSubtle, color: t.textPrimary } }}
            />
            <TextField
              fullWidth size="small" multiline rows={2}
              label="Description"
              value={createForm.description}
              onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              sx={{ '& .MuiInputBase-root': { bgcolor: t.surfaceSubtle, color: t.textPrimary } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ bgcolor: t.surface }}>
          <Button onClick={() => setCreateOpen(false)} sx={{ color: t.textSecondary }}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={createLoading} sx={dashboardPrimaryButtonSx}>
            {createLoading ? <CircularProgress size={18} /> : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Trigger Run Dialog ── */}
      <Dialog open={triggerOpen} onClose={() => setTriggerOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: t.surface, color: t.textPrimary }}>
          Trigger Run — {selected?.name}
        </DialogTitle>
        <DialogContent sx={{ bgcolor: t.surface }}>
          {triggerError && <Alert severity="error" sx={{ mb: 2, mt: 1 }}>{triggerError}</Alert>}
          <Stack spacing={2} sx={{ mt: 1.5 }}>
            {/* Project */}
            <FormControl fullWidth size="small">
              <InputLabel sx={{ color: t.textSecondary }}>Project</InputLabel>
              <Select
                value={triggerForm.project}
                label="Project"
                onChange={(e) => setTriggerForm({ ...triggerForm, project: e.target.value, repo: '', branch: 'main' })}
                sx={{ color: t.textPrimary, bgcolor: t.surfaceSubtle }}
              >
                {projects.map((p) => (
                  <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            {/* Repository */}
            <FormControl fullWidth size="small" disabled={!triggerForm.project}>
              <InputLabel sx={{ color: t.textSecondary }}>Repository (optional)</InputLabel>
              <Select
                value={triggerForm.repo}
                label="Repository (optional)"
                onChange={(e) => {
                  const repo = triggerRepos.find((r) => r.id === e.target.value);
                  setTriggerForm({
                    ...triggerForm,
                    repo:   e.target.value,
                    branch: repo?.default_branch ?? triggerForm.branch,
                  });
                }}
                sx={{ color: t.textPrimary, bgcolor: t.surfaceSubtle }}
                renderValue={(v) => {
                  if (!v) return <em style={{ color: t.textTertiary }}>None</em>;
                  return triggerRepos.find((r) => r.id === v)?.repo_name ?? v;
                }}
                displayEmpty
              >
                <MenuItem value=""><em>None</em></MenuItem>
                {triggerReposLoading ? (
                  <MenuItem disabled>
                    <CircularProgress size={14} sx={{ mr: 1 }} /> Loading…
                  </MenuItem>
                ) : triggerRepos.length === 0 && triggerForm.project ? (
                  <MenuItem disabled>No repositories found for this project</MenuItem>
                ) : (
                  triggerRepos.map((r) => (
                    <MenuItem key={r.id} value={r.id}>
                      <Stack direction="row" alignItems="center" gap={1}>
                        <Chip
                          label={r.provider.toUpperCase()}
                          size="small"
                          sx={{ fontSize: '0.6rem', height: 18, bgcolor: t.surfaceSubtle, color: t.textSecondary }}
                        />
                        {r.repo_name}
                        <Typography sx={{ ml: 'auto', fontSize: '.72rem', color: t.textTertiary }}>
                          {r.default_branch}
                        </Typography>
                      </Stack>
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
            {/* Branch */}
            <TextField
              fullWidth size="small"
              label="Branch"
              value={triggerForm.branch}
              onChange={(e) => setTriggerForm({ ...triggerForm, branch: e.target.value })}
              placeholder="main"
              helperText={triggerForm.repo ? 'Auto-filled from repository default branch — you can override.' : undefined}
              sx={{ '& .MuiInputBase-root': { bgcolor: t.surfaceSubtle, color: t.textPrimary } }}
            />
            {/* Commit message */}
            <TextField
              fullWidth size="small"
              label="Commit message (optional)"
              value={triggerForm.commit_msg}
              onChange={(e) => setTriggerForm({ ...triggerForm, commit_msg: e.target.value })}
              sx={{ '& .MuiInputBase-root': { bgcolor: t.surfaceSubtle, color: t.textPrimary } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ bgcolor: t.surface }}>
          <Button onClick={() => setTriggerOpen(false)} sx={{ color: t.textSecondary }}>Cancel</Button>
          <Button variant="contained" startIcon={<PlayArrowIcon />} onClick={handleTrigger}
            disabled={triggerLoading} sx={dashboardPrimaryButtonSx}>
            {triggerLoading ? <CircularProgress size={18} /> : 'Trigger'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete Confirm Dialog ── */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ bgcolor: t.surface, color: t.textPrimary }}>Delete Pipeline</DialogTitle>
        <DialogContent sx={{ bgcolor: t.surface }}>
          <Typography sx={{ color: t.textSecondary }}>
            Are you sure you want to delete <strong style={{ color: t.textPrimary }}>{deleteTarget?.name}</strong>?
            This will permanently remove the definition and all run history.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ bgcolor: t.surface }}>
          <Button onClick={() => setDeleteTarget(null)} sx={{ color: t.textSecondary }}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={deleteLoading}>
            {deleteLoading ? <CircularProgress size={18} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PipelineBuilderPage;
