import React, { useEffect, useState, useCallback } from 'react';
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
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import DeleteIcon from '@mui/icons-material/Delete';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import TerminalIcon from '@mui/icons-material/Terminal';
import CloudQueueIcon from '@mui/icons-material/CloudQueue';
import DashboardIcon from '@mui/icons-material/Dashboard';
import { useNavigate, useLocation } from 'react-router-dom';
import { dashboardCardSx, dashboardSemanticColors, dashboardTokens } from '../styles/dashboardDesignSystem';
import { getResourceOrigin } from '../services/resourceContext';
import {
  listDevWorkspaces,
  createDevWorkspace,
  startDevWorkspace,
  stopDevWorkspace,
  deleteDevWorkspace,
  type DevWorkspace,
  type CreateDevWorkspacePayload,
} from '../services/devWorkspaceApi';
import WorkspaceCreationWizard from '../components/Workspace/WorkspaceCreationWizard';

const FONT = '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
const t = dashboardTokens.colors;

// ── Options ───────────────────────────────────────────────────────────────────

const IMAGES = [
  { value: 'atonix/devbox:22.04-lts',   label: 'Ubuntu 22.04 LTS (default)' },
  { value: 'atonix/devbox:24.04-lts',   label: 'Ubuntu 24.04 LTS' },
  { value: 'atonix/devbox:node20',       label: 'Node.js 20' },
  { value: 'atonix/devbox:python312',    label: 'Python 3.12' },
  { value: 'atonix/devbox:golang123',    label: 'Go 1.23' },
  { value: 'atonix/devbox:rust',         label: 'Rust (stable)' },
];

const IDES = [
  { value: 'VS Code',    label: 'VS Code (browser)' },
  { value: 'JupyterLab', label: 'JupyterLab' },
  { value: 'Terminal',   label: 'Terminal only' },
];

const REGIONS = [
  { value: 'us-east-1',      label: 'US East (N. Virginia)' },
  { value: 'us-west-2',      label: 'US West (Oregon)' },
  { value: 'eu-west-1',      label: 'EU West (Ireland)' },
  { value: 'ap-southeast-1', label: 'AP Southeast (Singapore)' },
];

// ── Status helpers ─────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  running:  { label: 'Running',  color: dashboardSemanticColors.success, bg: 'rgba(34,197,94,.12)'  },
  starting: { label: 'Starting', color: dashboardSemanticColors.warning, bg: 'rgba(251,191,36,.12)' },
  stopping: { label: 'Stopping', color: dashboardSemanticColors.warning, bg: 'rgba(251,191,36,.12)' },
  stopped:  { label: 'Stopped',  color: t.textSecondary,                 bg: 'rgba(107,114,128,.10)'},
  error:    { label: 'Error',    color: dashboardSemanticColors.danger,  bg: 'rgba(239,68,68,.12)'  },
};

function StatusChip({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.stopped;
  return (
    <Chip size="small" label={cfg.label}
      sx={{ bgcolor: cfg.bg, color: cfg.color, fontWeight: 700, fontSize: '.75rem' }} />
  );
}

function MetricBar({ label, value }: { label: string; value: number }) {
  const color = value > 80 ? dashboardSemanticColors.danger
              : value > 60 ? dashboardSemanticColors.warning
              : dashboardSemanticColors.success;
  return (
    <Box sx={{ minWidth: 90 }}>
      <Stack direction="row" justifyContent="space-between">
        <Typography sx={{ fontSize: '.7rem', color: t.textSecondary }}>{label}</Typography>
        <Typography sx={{ fontSize: '.7rem', color, fontWeight: 700 }}>{value}%</Typography>
      </Stack>
      <LinearProgress variant="determinate" value={value}
        sx={{ height: 4, borderRadius: 2, bgcolor: 'rgba(255,255,255,.08)',
              '& .MuiLinearProgress-bar': { bgcolor: color } }} />
    </Box>
  );
}

// ── Create dialog ──────────────────────────────────────────────────────────────

interface CreateDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function CreateDialog({ open, onClose, onCreated }: CreateDialogProps) {
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState<string | null>(null);
  const [form, setForm] = useState<CreateDevWorkspacePayload>({
    workspace_id: '', display_name: '',
    region: 'us-east-1', image: 'atonix/devbox:22.04-lts', ide: 'VS Code',
  });

  const slugify = (v: string) => v.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setForm((f) => ({ ...f, display_name: name, workspace_id: f.workspace_id || slugify(name) }));
  };

  const handleSubmit = async () => {
    setErr(null);
    if (!form.workspace_id.trim()) { setErr('Workspace ID is required.'); return; }
    if (!form.display_name.trim()) { setErr('Display name is required.'); return; }
    if (!/^[a-z0-9-]+$/.test(form.workspace_id)) {
      setErr('Workspace ID must be lowercase letters, numbers and hyphens only.'); return;
    }
    setBusy(true);
    try {
      // Attach developer context so this workspace is only visible on the
      // Developer Dashboard and never leaks into Enterprise or Group dashboards.
      const origin = getResourceOrigin(window.location.pathname);
      await createDevWorkspace({ ...form, ...origin });
      onCreated();
      onClose();
    } catch (ex: any) {
      setErr(
        ex?.response?.data?.workspace_id?.[0] ||
        ex?.response?.data?.detail ||
        ex?.message ||
        'Failed to create workspace.',
      );
    } finally { setBusy(false); }
  };

  const handleClose = () => { if (!busy) { setErr(null); onClose(); } };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { bgcolor: t.surface, border: `1px solid ${t.border}`, borderRadius: 2 } }}>
      <DialogTitle sx={{ fontFamily: FONT, fontWeight: 800, color: t.textPrimary, pb: 0 }}>
        New Developer Workspace
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
        <Stack spacing={2.5}>
          <TextField label="Display Name" placeholder="e.g. My API Service"
            value={form.display_name} onChange={handleNameChange}
            fullWidth size="small"
            InputLabelProps={{ sx: { color: t.textSecondary } }}
            inputProps={{ sx: { color: t.textPrimary } }}
            sx={{ '& .MuiOutlinedInput-root': { bgcolor: t.surfaceSubtle } }} />

          <TextField label="Workspace ID" placeholder="e.g. my-api-service"
            value={form.workspace_id}
            onChange={(e) => setForm((f) => ({ ...f, workspace_id: slugify(e.target.value) }))}
            fullWidth size="small" helperText="Lowercase letters, numbers, hyphens — used in URLs"
            InputLabelProps={{ sx: { color: t.textSecondary } }}
            inputProps={{ sx: { color: t.textPrimary, fontFamily: 'monospace' } }}
            sx={{ '& .MuiOutlinedInput-root': { bgcolor: t.surfaceSubtle } }} />

          <FormControl size="small" fullWidth>
            <InputLabel sx={{ color: t.textSecondary }}>Base Image</InputLabel>
            <Select value={form.image} label="Base Image"
              onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))}
              sx={{ bgcolor: t.surfaceSubtle, color: t.textPrimary }}>
              {IMAGES.map((img) => <MenuItem key={img.value} value={img.value}>{img.label}</MenuItem>)}
            </Select>
          </FormControl>

          <FormControl size="small" fullWidth>
            <InputLabel sx={{ color: t.textSecondary }}>IDE</InputLabel>
            <Select value={form.ide} label="IDE"
              onChange={(e) => setForm((f) => ({ ...f, ide: e.target.value }))}
              sx={{ bgcolor: t.surfaceSubtle, color: t.textPrimary }}>
              {IDES.map((ide) => <MenuItem key={ide.value} value={ide.value}>{ide.label}</MenuItem>)}
            </Select>
          </FormControl>

          <FormControl size="small" fullWidth>
            <InputLabel sx={{ color: t.textSecondary }}>Region</InputLabel>
            <Select value={form.region} label="Region"
              onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
              sx={{ bgcolor: t.surfaceSubtle, color: t.textPrimary }}>
              {REGIONS.map((r) => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
            </Select>
          </FormControl>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={busy}
          sx={{ textTransform: 'none', color: t.textSecondary }}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={busy} variant="contained"
          startIcon={busy ? <CircularProgress size={14} /> : <AddIcon />}
          sx={{ textTransform: 'none', bgcolor: t.brandPrimary, fontWeight: 700 }}>
          {busy ? 'Creating…' : 'Create Workspace'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

const DevWorkspacePage: React.FC = () => {
  const navigate = useNavigate();
  const [workspaces, setWorkspaces]   = useState<DevWorkspace[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [actionBusy, setActionBusy]   = useState<Record<number, boolean>>({});
  const [createOpen, setCreateOpen]   = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DevWorkspace | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      // Developer Dashboard: only show workspaces created from developer context
      const data = await listDevWorkspaces({ dashboard: 'developer' });
      setWorkspaces(Array.isArray(data) ? data : []);
    } catch {
      setError('Unable to fetch workspaces from backend. Check your connection and try again.');
      setWorkspaces([]);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const withBusy = async (id: number, fn: () => Promise<void>) => {
    setActionBusy((b) => ({ ...b, [id]: true }));
    try { await fn(); await load(); }
    catch { /* errors shown via reload */ }
    finally { setActionBusy((b) => ({ ...b, [id]: false })); }
  };

  const handleStart  = (ws: DevWorkspace) => withBusy(ws.id, () => startDevWorkspace(ws.workspace_id) as Promise<any>);
  const handleStop   = (ws: DevWorkspace) => withBusy(ws.id, () => stopDevWorkspace(ws.workspace_id)  as Promise<any>);
  const handleDelete = (ws: DevWorkspace) => withBusy(ws.id, async () => {
    await deleteDevWorkspace(ws.workspace_id); setDeleteTarget(null);
  });

  const running = workspaces.filter((w) => w.status === 'running').length;
  const stopped = workspaces.filter((w) => w.status === 'stopped').length;
  const errored = workspaces.filter((w) => w.status === 'error').length;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, fontFamily: FONT, bgcolor: t.background, minHeight: '100vh' }}>

      {/* Header */}
      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between" gap={1.5} sx={{ mb: 2.5 }}>
        <Box>
          <Typography sx={{ fontWeight: 800, color: t.textPrimary, fontSize: '1.2rem' }}>
            Developer Workspaces
          </Typography>
          <Typography sx={{ color: t.textSecondary, fontSize: '.85rem' }}>
            Personal container-based environments with browser terminal and web IDE
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
            New Workspace
          </Button>
        </Stack>
      </Stack>

      {/* Summary cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(4,1fr)' }, gap: 1.5, mb: 2.5 }}>
        {[
          { label: 'Total',   value: workspaces.length,  color: t.textPrimary },
          { label: 'Running', value: running,             color: dashboardSemanticColors.success },
          { label: 'Stopped', value: stopped,             color: t.textSecondary },
          { label: 'Error',   value: errored,             color: errored > 0 ? dashboardSemanticColors.danger : t.textSecondary },
        ].map((s) => (
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

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Table */}
      <Card sx={dashboardCardSx}>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          {loading ? (
            <Stack alignItems="center" sx={{ py: 6 }}>
              <CircularProgress size={28} sx={{ color: t.brandPrimary, mb: 1.5 }} />
              <Typography sx={{ color: t.textSecondary }}>Loading workspaces…</Typography>
            </Stack>
          ) : workspaces.length === 0 ? (
            <Stack alignItems="center" spacing={1.5} sx={{ py: 8 }}>
              <CloudQueueIcon sx={{ fontSize: '2.5rem', color: t.textSecondary }} />
              <Typography sx={{ fontWeight: 700, color: t.textPrimary }}>No workspaces yet</Typography>
              <Typography sx={{ color: t.textSecondary, fontSize: '.9rem' }}>
                Create your first workspace to get a browser terminal and web IDE.
              </Typography>
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}
                sx={{ mt: 1, textTransform: 'none', fontWeight: 700, bgcolor: t.brandPrimary }}>
                New Workspace
              </Button>
            </Stack>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: t.surfaceSubtle }}>
                  {['Workspace', 'Status', 'Image / IDE', 'Region', 'Resources', 'Actions'].map((h) => (
                    <TableCell key={h} sx={{ color: t.textSecondary, fontWeight: 700, fontSize: '.8rem', py: 1.2 }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {workspaces.map((ws) => {
                  const busy      = !!actionBusy[ws.id];
                  const isRunning = ws.status === 'running';
                  const canStart  = ws.status === 'stopped' || ws.status === 'error';
                  const canStop   = ws.status === 'running';
                  const canDelete = ws.status !== 'running' && ws.status !== 'starting';

                  return (
                    <TableRow key={ws.id} hover sx={{ '&:hover': { bgcolor: t.surfaceHover } }}>
                      {/* Workspace */}
                      <TableCell sx={{ py: 1.5 }}>
                        <Typography sx={{ fontWeight: 700, color: t.textPrimary, fontSize: '.9rem' }}>
                          {ws.display_name}
                        </Typography>
                        <Typography sx={{ color: t.textSecondary, fontSize: '.75rem', fontFamily: 'monospace' }}>
                          {ws.workspace_id}
                        </Typography>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Stack spacing={0.5} alignItems="flex-start">
                          <StatusChip status={ws.status} />
                          {ws.started_at && isRunning && (
                            <Typography sx={{ fontSize: '.7rem', color: t.textSecondary }}>
                              since {new Date(ws.started_at).toLocaleTimeString()}
                            </Typography>
                          )}
                        </Stack>
                      </TableCell>

                      {/* Image / IDE */}
                      <TableCell>
                        <Typography sx={{ fontSize: '.82rem', color: t.textPrimary, fontFamily: 'monospace' }}>
                          {ws.image}
                        </Typography>
                        <Typography sx={{ fontSize: '.75rem', color: t.textSecondary }}>{ws.ide}</Typography>
                      </TableCell>

                      {/* Region */}
                      <TableCell sx={{ color: t.textSecondary, fontSize: '.85rem' }}>{ws.region}</TableCell>

                      {/* Metrics */}
                      <TableCell sx={{ minWidth: 120 }}>
                        {isRunning ? (
                          <Stack spacing={0.5}>
                            <MetricBar label="CPU" value={ws.cpu_percent} />
                            <MetricBar label="RAM" value={ws.ram_percent} />
                          </Stack>
                        ) : (
                          <Typography sx={{ fontSize: '.8rem', color: t.textSecondary }}>—</Typography>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell>
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                          {canStart && (
                            <Tooltip title="Start">
                              <span>
                                <IconButton size="small" disabled={busy} onClick={() => handleStart(ws)}
                                  sx={{ color: dashboardSemanticColors.success }}>
                                  {busy ? <CircularProgress size={14} /> : <PlayArrowIcon fontSize="small" />}
                                </IconButton>
                              </span>
                            </Tooltip>
                          )}
                          {canStop && (
                            <Tooltip title="Stop">
                              <span>
                                <IconButton size="small" disabled={busy} onClick={() => handleStop(ws)}
                                  sx={{ color: dashboardSemanticColors.warning }}>
                                  {busy ? <CircularProgress size={14} /> : <StopIcon fontSize="small" />}
                                </IconButton>
                              </span>
                            </Tooltip>
                          )}
                          <Tooltip title="Open Workspace Dashboard">
                            <IconButton size="small"
                              onClick={() => navigate(`/developer/Dashboard/workspace/${ws.workspace_id}`)}
                              sx={{ color: t.brandPrimary }}>
                              <DashboardIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {isRunning && ws.editor_url && (
                            <Tooltip title="Open IDE in new tab">
                              <IconButton size="small" component="a" href={ws.editor_url} target="_blank"
                                sx={{ color: t.textSecondary }}>
                                <OpenInNewIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          {isRunning && (
                            <Tooltip title="Terminal">
                              <IconButton size="small"
                                onClick={() => navigate(`/developer/Dashboard/workspace/${ws.workspace_id}?section=terminal`)}
                                sx={{ color: t.textSecondary }}>
                                <TerminalIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          {canDelete && (
                            <Tooltip title={ws.status === 'running' ? 'Stop before deleting' : 'Delete'}>
                              <span>
                                <IconButton size="small" disabled={busy} onClick={() => setDeleteTarget(ws)}
                                  sx={{ color: dashboardSemanticColors.danger }}>
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          )}
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

      {/* Workspace Creation Wizard */}
      <WorkspaceCreationWizard
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(ws) => {
          load();
          navigate(`/developer/Dashboard/workspace/${ws.workspace_id}`);
        }}
      />

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { bgcolor: t.surface, border: `1px solid ${t.border}`, borderRadius: 2 } }}>
        <DialogTitle sx={{ fontFamily: FONT, fontWeight: 700, color: t.textPrimary }}>Delete Workspace</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: t.textSecondary }}>
            Permanently delete{' '}
            <Box component="span" sx={{ fontWeight: 700, color: t.textPrimary }}>{deleteTarget?.display_name}</Box>
            ? This cannot be undone.
          </Typography>
        </DialogContent>
        <Divider sx={{ borderColor: t.border }} />
        <DialogActions sx={{ px: 2.5, pb: 2 }}>
          <Button onClick={() => setDeleteTarget(null)} sx={{ textTransform: 'none', color: t.textSecondary }}>
            Cancel
          </Button>
          <Button variant="contained" onClick={() => deleteTarget && handleDelete(deleteTarget)}
            sx={{ textTransform: 'none', fontWeight: 700, bgcolor: dashboardSemanticColors.danger }}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DevWorkspacePage;

