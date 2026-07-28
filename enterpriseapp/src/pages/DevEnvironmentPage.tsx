// OrcaCloud — Environment Management

import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon            from '@mui/icons-material/Add';
import RefreshIcon        from '@mui/icons-material/Refresh';
import DeleteIcon         from '@mui/icons-material/Delete';
import OpenInNewIcon      from '@mui/icons-material/OpenInNew';
import LockIcon           from '@mui/icons-material/Lock';
import LayersIcon         from '@mui/icons-material/Layers';
import DashboardIcon      from '@mui/icons-material/Dashboard';
import CheckCircleIcon    from '@mui/icons-material/CheckCircle';
import WarningAmberIcon   from '@mui/icons-material/WarningAmber';
import ErrorIcon          from '@mui/icons-material/Error';
import { useNavigate }    from 'react-router-dom';

import { dashboardCardSx, dashboardSemanticColors, dashboardTokens } from '../styles/dashboardDesignSystem';
import {
  listEnvironments,
  createEnvironment,
  deleteEnvironment,
  getEnvHealth,
  type ApiEnvironment,
  type CreateEnvironmentPayload,
  type DeploymentStrategy,
  type EnvHealth,
} from '../services/environmentsApi';
import { listProjects, type BackendProject } from '../services/projectsApi';

const FONT = '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
const t    = dashboardTokens.colors;
const sc   = dashboardSemanticColors;

const HC = {
  healthy:  { color: sc.success, icon: CheckCircleIcon,  label: 'Healthy'  },
  degraded: { color: '#F59E0B',  icon: WarningAmberIcon, label: 'Degraded' },
  critical: { color: sc.danger,  icon: ErrorIcon,        label: 'Critical' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

type Stage = 'dev' | 'stage' | 'prod';

function stageOf(name: string): Stage {
  const l = name.toLowerCase();
  if (l.includes('prod')) return 'prod';
  if (l.includes('stage') || l.includes('stg')) return 'stage';
  return 'dev';
}

const STAGE_CFG: Record<Stage, { label: string; color: string; bg: string }> = {
  dev:   { label: 'Development', color: '#153d75', bg: 'rgba(21,61,117,.12)'  },
  stage: { label: 'Staging',     color: '#F59E0B', bg: 'rgba(245,158,11,.12)'  },
  prod:  { label: 'Production',  color: sc.success, bg: 'rgba(34,197,94,.12)'  },
};

function timeAgo(iso?: string | null): string {
  if (!iso) return '—';
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60)    return `${Math.round(s)}s ago`;
  if (s < 3600)  return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

// ── Options ───────────────────────────────────────────────────────────────────

const STRATEGIES: DeploymentStrategy[] = ['rolling', 'blue_green', 'canary', 'recreate'];
const REGIONS = [
  'us-east-1', 'us-west-2', 'eu-west-1', 'eu-central-1',
  'ap-southeast-1', 'ap-northeast-1',
];

// ── Create dialog ─────────────────────────────────────────────────────────────

interface CreateDialogProps {
  open:     boolean;
  projects: BackendProject[];
  onClose:  () => void;
  onCreated: () => void;
}

function CreateDialog({ open, projects, onClose, onCreated }: CreateDialogProps) {
  const blank = () => ({
    name: '', region: 'us-east-1', description: '',
    project: projects[0]?.id ?? '',
    deployment_strategy: 'rolling' as DeploymentStrategy,
    auto_deploy: true, is_protected: false, require_approval: false, notify_email: '',
  });

  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState<string | null>(null);

  useEffect(() => {
    if (projects.length && !form.project)
      setForm(f => ({ ...f, project: projects[0].id }));
  }, [projects]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (key: string, value: unknown) => setForm(f => ({ ...f, [key]: value }));

  const handleSubmit = async () => {
    if (!form.name.trim()) { setErr('Name is required.'); return; }
    if (!form.project)     { setErr('Select a project.'); return; }
    setBusy(true); setErr(null);
    try {
      await createEnvironment({
        name: form.name.trim(),
        region: form.region,
        description: form.description,
        project: form.project,
        deployment_strategy: form.deployment_strategy,
        auto_deploy: form.auto_deploy,
        is_protected: form.is_protected,
        require_approval: form.require_approval,
        notify_email: form.notify_email,
      } as CreateEnvironmentPayload);
      setForm(blank());
      onCreated();
      onClose();
    } catch (e: any) {
      setErr(e?.response?.data?.detail ?? e?.message ?? 'Failed to create environment.');
    } finally { setBusy(false); }
  };

  const handleClose = () => { if (!busy) { setErr(null); onClose(); } };

  const inputSx = { '& .MuiOutlinedInput-root': { bgcolor: t.surfaceSubtle } };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { bgcolor: t.surface, border: `1px solid ${t.border}`, borderRadius: 2 } }}>
      <DialogTitle sx={{ fontFamily: FONT, fontWeight: 800, color: t.textPrimary, pb: 0 }}>
        New Environment
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
        <Stack spacing={2.5}>
          <TextField label="Environment name *" placeholder="e.g. production, staging, dev-alice"
            value={form.name} onChange={e => set('name', e.target.value)}
            fullWidth size="small"
            InputLabelProps={{ sx: { color: t.textSecondary } }}
            inputProps={{ sx: { color: t.textPrimary } }}
            sx={inputSx} />

          <Stack direction="row" spacing={1.5}>
            <FormControl size="small" fullWidth>
              <InputLabel sx={{ color: t.textSecondary }}>Project *</InputLabel>
              <Select label="Project *" value={form.project}
                onChange={e => set('project', e.target.value)}
                sx={{ bgcolor: t.surfaceSubtle, color: t.textPrimary }}>
                {projects.length === 0 && <MenuItem value="" disabled>No projects found</MenuItem>}
                {projects.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel sx={{ color: t.textSecondary }}>Region</InputLabel>
              <Select label="Region" value={form.region}
                onChange={e => set('region', e.target.value)}
                sx={{ bgcolor: t.surfaceSubtle, color: t.textPrimary }}>
                {REGIONS.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
              </Select>
            </FormControl>
          </Stack>

          <TextField label="Description" value={form.description}
            onChange={e => set('description', e.target.value)}
            fullWidth size="small" multiline rows={2}
            InputLabelProps={{ sx: { color: t.textSecondary } }}
            inputProps={{ sx: { color: t.textPrimary } }}
            sx={inputSx} />

          <FormControl size="small" fullWidth>
            <InputLabel sx={{ color: t.textSecondary }}>Deployment Strategy</InputLabel>
            <Select label="Deployment Strategy" value={form.deployment_strategy}
              onChange={e => set('deployment_strategy', e.target.value as DeploymentStrategy)}
              sx={{ bgcolor: t.surfaceSubtle, color: t.textPrimary }}>
              {STRATEGIES.map(s => <MenuItem key={s} value={s}>{s.replace('_', ' ')}</MenuItem>)}
            </Select>
          </FormControl>

          <TextField label="Notification email" placeholder="devops@company.com"
            value={form.notify_email} onChange={e => set('notify_email', e.target.value)}
            fullWidth size="small"
            InputLabelProps={{ sx: { color: t.textSecondary } }}
            inputProps={{ sx: { color: t.textPrimary } }}
            sx={inputSx} />

          <Divider sx={{ borderColor: t.border }} />

          <Stack spacing={0.5}>
            {([
              ['auto_deploy',     'Auto-deploy on push'],
              ['require_approval','Require approval before deploy'],
              ['is_protected',    'Protected environment (locks deployments)'],
            ] as const).map(([key, label]) => (
              <FormControlLabel key={key}
                label={<Typography sx={{ fontSize: '.83rem', color: t.textPrimary }}>{label}</Typography>}
                control={<Switch checked={!!(form as any)[key]} size="small"
                  onChange={e => set(key, e.target.checked)} />} />
            ))}
          </Stack>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={busy}
          sx={{ textTransform: 'none', color: t.textSecondary }}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={busy} variant="contained"
          startIcon={busy ? <CircularProgress size={14} /> : <AddIcon />}
          sx={{ textTransform: 'none', bgcolor: t.brandPrimary, fontWeight: 700 }}>
          {busy ? 'Creating…' : 'Create Environment'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const DevEnvironmentPage: React.FC = () => {
  const navigate = useNavigate();
  const [envs,         setEnvs]         = useState<ApiEnvironment[]>([]);
  const [projects,     setProjects]     = useState<BackendProject[]>([]);
  const [healthMap,    setHealthMap]    = useState<Record<string, EnvHealth>>({});
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [createOpen,   setCreateOpen]   = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ApiEnvironment | null>(null);
  const [deleting,     setDeleting]     = useState(false);
  const [toast,        setToast]        = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [e, p] = await Promise.all([
        listEnvironments().catch(() => [] as ApiEnvironment[]),
        listProjects().catch(() => [] as BackendProject[]),
      ]);
      const envList = Array.isArray(e) ? e : [];
      setEnvs(envList);
      setProjects(Array.isArray(p) ? p : []);
      // Load health for all envs in parallel (best-effort)
      const healthResults = await Promise.allSettled(envList.map(env => getEnvHealth(env.id).then(h => [env.id, h] as [string, EnvHealth])));
      const map: Record<string, EnvHealth> = {};
      healthResults.forEach(r => { if (r.status === 'fulfilled') map[r.value[0]] = r.value[1]; });
      setHealthMap(map);
    } catch {
      setError('Unable to fetch environments. Check your connection and try again.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const errMsg = await deleteEnvironment(deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
    if (errMsg) { setToast(`Delete failed: ${errMsg}`); return; }
    setEnvs(prev => prev.filter(e => e.id !== deleteTarget.id));
    setToast('Environment deleted.');
  };

  const prodCount    = envs.filter(e => stageOf(e.name) === 'prod').length;
  const stageCount   = envs.filter(e => stageOf(e.name) === 'stage').length;
  const devCount     = envs.filter(e => stageOf(e.name) === 'dev').length;

  const healthValues = Object.values(healthMap);
  const healthyCount  = healthValues.filter(h => h.status === 'healthy').length;
  const degradedCount = healthValues.filter(h => h.status === 'degraded').length;
  const criticalCount = healthValues.filter(h => h.status === 'critical').length;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, fontFamily: FONT, bgcolor: t.background, minHeight: '100vh' }}>

      {/* ── Header ── */}
      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between" gap={1.5} sx={{ mb: 2.5 }}>
        <Box>
          <Typography sx={{ fontWeight: 800, color: t.textPrimary, fontSize: '1.2rem' }}>
            Environments
          </Typography>
          <Typography sx={{ color: t.textSecondary, fontSize: '.85rem' }}>
            Dev → Stage → Prod — manage deployments, config and secrets across your pipeline
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title="Refresh">
            <IconButton size="small" onClick={load}
              sx={{ borderRadius: 1, border: `1px solid ${t.border}`, color: t.textSecondary }}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Button variant="contained" size="small" startIcon={<AddIcon />}
            onClick={() => setCreateOpen(true)}
            sx={{ textTransform: 'none', fontWeight: 700, bgcolor: t.brandPrimary }}>
            New Environment
          </Button>
        </Stack>
      </Stack>

      {/* ── Summary cards ── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4,1fr)' }, gap: 1.5, mb: 2.5 }}>
        {[
          { label: 'Total',       value: envs.length, color: t.textPrimary },
          { label: 'Production',  value: prodCount,   color: sc.success },
          { label: 'Staging',     value: stageCount,  color: '#F59E0B' },
          { label: 'Development', value: devCount,    color: '#153d75' },
        ].map(s => (
          <Card key={s.label} sx={dashboardCardSx}>
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography sx={{ fontSize: '.72rem', color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                {s.label}
              </Typography>
              <Typography sx={{ fontWeight: 700, fontSize: '1.5rem', color: s.color }}>{s.value}</Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* ── Health summary bar ── */}
      {healthValues.length > 0 && (
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 2 }}>
          {healthyCount > 0 && (
            <Stack direction="row" alignItems="center" spacing={.6} sx={{ bgcolor: 'rgba(34,197,94,.08)', border: '1px solid rgba(34,197,94,.25)', borderRadius: '20px', px: 1.5, py: .5 }}>
              <CheckCircleIcon sx={{ fontSize: '0.85rem', color: sc.success }} />
              <Typography sx={{ fontSize: '.78rem', fontWeight: 700, color: sc.success }}>{healthyCount} Healthy</Typography>
            </Stack>
          )}
          {degradedCount > 0 && (
            <Stack direction="row" alignItems="center" spacing={.6} sx={{ bgcolor: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.25)', borderRadius: '20px', px: 1.5, py: .5 }}>
              <WarningAmberIcon sx={{ fontSize: '0.85rem', color: '#F59E0B' }} />
              <Typography sx={{ fontSize: '.78rem', fontWeight: 700, color: '#F59E0B' }}>{degradedCount} Degraded</Typography>
            </Stack>
          )}
          {criticalCount > 0 && (
            <Stack direction="row" alignItems="center" spacing={.6} sx={{ bgcolor: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.25)', borderRadius: '20px', px: 1.5, py: .5 }}>
              <ErrorIcon sx={{ fontSize: '0.85rem', color: sc.danger }} />
              <Typography sx={{ fontSize: '.78rem', fontWeight: 700, color: sc.danger }}>{criticalCount} Critical</Typography>
            </Stack>
          )}
        </Box>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* ── Table ── */}
      <Card sx={dashboardCardSx}>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          {loading ? (
            <Stack alignItems="center" sx={{ py: 6 }}>
              <CircularProgress size={28} sx={{ color: t.brandPrimary, mb: 1.5 }} />
              <Typography sx={{ color: t.textSecondary }}>Loading environments…</Typography>
            </Stack>
          ) : envs.length === 0 ? (
            <Stack alignItems="center" spacing={1.5} sx={{ py: 8 }}>
              <LayersIcon sx={{ fontSize: '2.5rem', color: t.textSecondary }} />
              <Typography sx={{ fontWeight: 700, color: t.textPrimary }}>No environments yet</Typography>
              <Typography sx={{ color: t.textSecondary, fontSize: '.9rem', textAlign: 'center', maxWidth: 380 }}>
                Create your first environment to start managing deployments, config, and secrets.
              </Typography>
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}
                sx={{ mt: 1, textTransform: 'none', fontWeight: 700, bgcolor: t.brandPrimary }}>
                New Environment
              </Button>
            </Stack>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: t.surfaceSubtle }}>
                  {['Environment', 'Stage', 'Strategy', 'Region', 'Flags', 'Updated', 'Actions'].map(h => (
                    <TableCell key={h} sx={{ color: t.textSecondary, fontWeight: 700, fontSize: '.8rem', py: 1.2 }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {envs.map(env => {
                  const envStage = stageOf(env.name);
                  const scfg     = STAGE_CFG[envStage];
                  const health   = healthMap[env.id];
                  const hcfg     = health ? HC[health.status] : null;
                  const HIcon    = hcfg?.icon;
                  return (
                    <TableRow key={env.id} hover sx={{ cursor: 'pointer', '&:hover': { bgcolor: t.surfaceHover } }}
                      onClick={() => navigate(`/developer/Dashboard/environment/${env.id}`)}>

                      {/* Name + description */}
                      <TableCell sx={{ py: 1.5 }}>
                        <Typography sx={{ fontWeight: 700, color: t.textPrimary, fontSize: '.9rem' }}>
                          {env.name}
                        </Typography>
                        {env.description && (
                          <Typography sx={{ color: t.textSecondary, fontSize: '.75rem',
                            maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {env.description}
                          </Typography>
                        )}
                      </TableCell>

                      {/* Health status */}
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        {hcfg && HIcon ? (
                          <Stack direction="row" alignItems="center" spacing={.6}>
                            <HIcon sx={{ fontSize: '0.85rem', color: hcfg.color }} />
                            <Typography sx={{ fontSize: '.78rem', fontWeight: 700, color: hcfg.color }}>{hcfg.label}</Typography>
                          </Stack>
                        ) : (
                          <Typography sx={{ fontSize: '.75rem', color: t.textTertiary }}>—</Typography>
                        )}
                        {health && (
                          <Typography sx={{ fontSize: '.68rem', color: t.textTertiary, mt: .2 }}>
                            CPU {health.cpu_pct}% · RAM {health.ram_pct}%
                          </Typography>
                        )}
                      </TableCell>

                      {/* Active version */}
                      <TableCell>
                        <Typography sx={{ fontFamily: 'monospace', fontSize: '.78rem', color: t.textPrimary, fontWeight: 600 }}>
                          {health?.active_version ?? '—'}
                        </Typography>
                        {health?.last_deploy_at && (
                          <Typography sx={{ fontSize: '.68rem', color: t.textTertiary, mt: .2 }}>
                            {timeAgo(health.last_deploy_at)}
                          </Typography>
                        )}
                      </TableCell>

                      {/* Stage chip */}
                      <TableCell>
                        <Chip size="small" label={scfg.label}
                          sx={{ bgcolor: scfg.bg, color: scfg.color, fontWeight: 700, fontSize: '.72rem', border: `1px solid ${scfg.color}33` }} />
                      </TableCell>

                      {/* Strategy */}
                      <TableCell>
                        <Typography sx={{ fontSize: '.82rem', color: t.textPrimary, fontFamily: 'monospace' }}>
                          {env.deployment_strategy ?? '—'}
                        </Typography>
                      </TableCell>

                      {/* Region */}
                      <TableCell sx={{ color: t.textSecondary, fontSize: '.85rem' }}>
                        {env.region || '—'}
                      </TableCell>

                      {/* Flags */}
                      <TableCell>
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                          {env.is_protected && (
                            <Chip icon={<LockIcon sx={{ fontSize: '0.7rem !important' }} />}
                              label="Protected" size="small"
                              sx={{ bgcolor: 'rgba(239,68,68,.1)', color: sc.danger, fontWeight: 700, fontSize: '.7rem', height: 20 }} />
                          )}
                          {env.auto_deploy && (
                            <Chip label="Auto" size="small"
                              sx={{ bgcolor: 'rgba(34,197,94,.1)', color: sc.success, fontWeight: 700, fontSize: '.7rem', height: 20 }} />
                          )}
                          {env.require_approval && (
                            <Chip label="Approval" size="small"
                              sx={{ bgcolor: 'rgba(245,158,11,.1)', color: '#F59E0B', fontWeight: 700, fontSize: '.7rem', height: 20 }} />
                          )}
                        </Stack>
                      </TableCell>

                      {/* Updated */}
                      <TableCell sx={{ color: t.textSecondary, fontSize: '.82rem', whiteSpace: 'nowrap' }}>
                        {timeAgo(env.updated_at)}
                      </TableCell>

                      {/* Actions */}
                      <TableCell onClick={e => e.stopPropagation()}>
                        <Stack direction="row" spacing={0.5}>
                          <Tooltip title="Open dashboard">
                            <IconButton size="small"
                              onClick={() => navigate(`/developer/Dashboard/environment/${env.id}`)}
                              sx={{ color: t.brandPrimary }}>
                              <DashboardIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Open detail">
                            <IconButton size="small"
                              onClick={() => navigate(`/developer/Dashboard/environment/${env.id}`)}
                              sx={{ color: t.textSecondary }}>
                              <OpenInNewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={env.is_protected ? 'Protected — cannot delete' : 'Delete'}>
                            <span>
                              <IconButton size="small" disabled={env.is_protected}
                                onClick={() => setDeleteTarget(env)}
                                sx={{ color: sc.danger, '&.Mui-disabled': { opacity: 0.3 } }}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Create dialog ── */}
      <CreateDialog
        open={createOpen}
        projects={projects}
        onClose={() => setCreateOpen(false)}
        onCreated={load}
      />

      {/* ── Delete confirm ── */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { bgcolor: t.surface, border: `1px solid ${t.border}`, borderRadius: 2 } }}>
        <DialogTitle sx={{ fontFamily: FONT, fontWeight: 700, color: t.textPrimary }}>
          Delete Environment
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ color: t.textSecondary }}>
            Permanently delete{' '}
            <Box component="span" sx={{ fontWeight: 700, color: t.textPrimary }}>
              {deleteTarget?.name}
            </Box>
            ? This cannot be undone.
          </Typography>
        </DialogContent>
        <Divider sx={{ borderColor: t.border }} />
        <DialogActions sx={{ px: 2.5, pb: 2 }}>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting}
            sx={{ textTransform: 'none', color: t.textSecondary }}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleDeleteConfirm} disabled={deleting}
            sx={{ textTransform: 'none', fontWeight: 700, bgcolor: sc.danger }}>
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Toast ── */}
      <Snackbar open={!!toast} autoHideDuration={3500} onClose={() => setToast(null)}
        message={toast} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} />
    </Box>
  );
};

export default DevEnvironmentPage;
