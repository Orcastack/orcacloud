/**
 * DevPipelinesPage — CI/CD Pipeline Hub
 *
 * /developer/Dashboard/cicd
 *
 * Two-tab layout:
 *  • Definitions — named pipeline blueprints (create, edit, trigger, delete)
 *  • Runs        — all pipeline runs across definitions (filter, cancel, view)
 *
 * Uses PipelineDefinition / PipelineRun (new engine).
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Alert, Avatar, Box, Button, Chip, CircularProgress,
  Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, FormControl, IconButton, InputAdornment, InputLabel,
  MenuItem, Paper, Select, Stack, Tab, Table, TableBody,
  TableCell, TableHead, TableRow, Tabs, TextField, Tooltip, Typography,
} from '@mui/material';
import AddIcon            from '@mui/icons-material/Add';
import ArticleIcon        from '@mui/icons-material/Article';
import CheckCircleIcon    from '@mui/icons-material/CheckCircle';
import DeleteIcon         from '@mui/icons-material/Delete';
import EditIcon           from '@mui/icons-material/Edit';
import ErrorIcon          from '@mui/icons-material/Error';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import OpenInNewIcon      from '@mui/icons-material/OpenInNew';
import PlayArrowIcon      from '@mui/icons-material/PlayArrow';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import RefreshIcon        from '@mui/icons-material/Refresh';
import SearchIcon         from '@mui/icons-material/Search';
import SkipNextIcon       from '@mui/icons-material/SkipNext';
import StopIcon           from '@mui/icons-material/Stop';
import TimelineIcon       from '@mui/icons-material/Timeline';
import { useNavigate } from 'react-router-dom';
import { dashboardSemanticColors, dashboardTokens } from '../styles/dashboardDesignSystem';
import {
  listDefinitions,
  deleteDefinition,
  triggerDefinition,
  listPipelineRuns,
  cancelPipelineRun,
  type PipelineDefinition,
  type PipelineRun,
  type NodeStatus,
} from '../services/pipelinesApi';

// ── helpers ─────────────────────────────────────────────────────────────────

const FONT = '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const t = dashboardTokens.colors;

const STATUS_CFG: Record<string, { color: string; bg: string; label: string; icon: React.ReactNode }> = {
  pending:   { color: '#6B7280', bg: 'rgba(107,114,128,.12)', label: 'Pending',   icon: <HourglassEmptyIcon sx={{ fontSize: 14 }} /> },
  queued:    { color: '#6B7280', bg: 'rgba(107,114,128,.12)', label: 'Queued',    icon: <HourglassEmptyIcon sx={{ fontSize: 14 }} /> },
  running:   { color: dashboardSemanticColors.info,    bg: 'rgba(21,61,117,.12)',    label: 'Running',   icon: <PlayCircleOutlineIcon sx={{ fontSize: 14 }} /> },
  success:   { color: dashboardSemanticColors.success, bg: 'rgba(34,197,94,.12)',    label: 'Success',   icon: <CheckCircleIcon sx={{ fontSize: 14 }} /> },
  failed:    { color: dashboardSemanticColors.danger,  bg: 'rgba(239,68,68,.12)',    label: 'Failed',    icon: <ErrorIcon sx={{ fontSize: 14 }} /> },
  cancelled: { color: '#6B7280', bg: 'rgba(107,114,128,.12)', label: 'Cancelled', icon: <SkipNextIcon sx={{ fontSize: 14 }} /> },
  skipped:   { color: '#6B7280', bg: 'rgba(107,114,128,.12)', label: 'Skipped',   icon: <SkipNextIcon sx={{ fontSize: 14 }} /> },
};

function statusCfg(s?: string) {
  return STATUS_CFG[s ?? ''] ?? { color: '#6B7280', bg: 'rgba(107,114,128,.12)', label: s ?? 'Unknown', icon: null };
}

function timeAgo(iso?: string | null) {
  if (!iso) return '—';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.round(diff)}s ago`;
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return `${Math.round(diff / 86400)}d ago`;
}

function duration(start?: string | null, end?: string | null) {
  if (!start) return '—';
  const ms = (end ? new Date(end) : new Date()).getTime() - new Date(start).getTime();
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}m ${rem}s`;
}

// ── sub-components ────────────────────────────────────────────────────────────

// ---- Trigger Dialog ----------------------------------------------------------
interface TriggerDialogProps {
  open: boolean;
  definition: PipelineDefinition | null;
  onClose: () => void;
  onTriggered: (run: PipelineRun) => void;
}
const TriggerDialog: React.FC<TriggerDialogProps> = ({ open, definition, onClose, onTriggered }) => {
  const [branch, setBranch]     = useState('main');
  const [commitSha, setCommit]  = useState('');
  const [commitMsg, setMsg]     = useState('');
  const [busy, setBusy]         = useState(false);
  const [err, setErr]           = useState<string | null>(null);

  const handle = async () => {
    if (!definition) return;
    setBusy(true); setErr(null);
    try {
      const run = await triggerDefinition(definition.id, { branch, commit_sha: commitSha || undefined, commit_msg: commitMsg || undefined });
      onTriggered(run);
      onClose();
    } catch {
      setErr('Failed to trigger pipeline. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { bgcolor: t.surface, color: t.textPrimary, fontFamily: FONT } }}>
      <DialogTitle>Trigger: {definition?.name}</DialogTitle>
      <DialogContent>
        {err && <Alert severity="error" sx={{ mb: 1.5 }}>{err}</Alert>}
        <Stack spacing={2} mt={1}>
          <TextField size="small" label="Branch" value={branch}
            onChange={e => setBranch(e.target.value)}
            InputLabelProps={{ style: { color: t.textSecondary } }}
            inputProps={{ style: { color: t.textPrimary } }} />
          <TextField size="small" label="Commit SHA (optional)" value={commitSha}
            onChange={e => setCommit(e.target.value)}
            InputLabelProps={{ style: { color: t.textSecondary } }}
            inputProps={{ style: { color: t.textPrimary } }} />
          <TextField size="small" label="Commit message (optional)" value={commitMsg}
            onChange={e => setMsg(e.target.value)}
            InputLabelProps={{ style: { color: t.textSecondary } }}
            inputProps={{ style: { color: t.textPrimary } }} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ color: t.textSecondary }}>Cancel</Button>
        <Button variant="contained" onClick={handle} disabled={busy || !branch}
          startIcon={busy ? <CircularProgress size={14} /> : <PlayArrowIcon />}>
          Trigger
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ---- Delete Dialog -----------------------------------------------------------
interface DeleteDialogProps {
  open: boolean;
  definition: PipelineDefinition | null;
  onClose: () => void;
  onDeleted: () => void;
}
const DeleteDefDialog: React.FC<DeleteDialogProps> = ({ open, definition, onClose, onDeleted }) => {
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState<string | null>(null);
  const handle = async () => {
    if (!definition) return;
    setBusy(true); setErr(null);
    try {
      await deleteDefinition(definition.id);
      onDeleted(); onClose();
    } catch {
      setErr('Failed to delete pipeline definition.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth
      PaperProps={{ sx: { bgcolor: t.surface, color: t.textPrimary } }}>
      <DialogTitle>Delete Pipeline</DialogTitle>
      <DialogContent>
        {err && <Alert severity="error" sx={{ mb: 1 }}>{err}</Alert>}
        <Typography>Delete <b>{definition?.name}</b>? This cannot be undone.</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ color: t.textSecondary }}>Cancel</Button>
        <Button color="error" variant="contained" onClick={handle} disabled={busy}>
          {busy ? <CircularProgress size={14} /> : 'Delete'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ---- Definition Card --------------------------------------------------------
interface DefCardProps {
  def: PipelineDefinition;
  onTrigger: (d: PipelineDefinition) => void;
  onEdit: (d: PipelineDefinition) => void;
  onDelete: (d: PipelineDefinition) => void;
}
const DefCard: React.FC<DefCardProps> = ({ def, onTrigger, onEdit, onDelete }) => {
  const sc = statusCfg(def.last_run_status ?? undefined);
  return (
    <Paper variant="outlined" sx={{ p: 2, bgcolor: t.surface, borderColor: t.border, borderRadius: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, color: t.textPrimary, fontSize: '.95rem',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {def.name}
          </Typography>
          {def.project_name && (
            <Typography sx={{ fontSize: '.72rem', color: t.textTertiary }}>{def.project_name}</Typography>
          )}
        </Box>
        <Chip size="small" label={def.is_active ? 'Active' : 'Inactive'}
          sx={{ bgcolor: def.is_active ? 'rgba(34,197,94,.12)' : 'rgba(107,114,128,.12)',
            color: def.is_active ? dashboardSemanticColors.success : '#6B7280',
            fontWeight: 700, fontSize: '.7rem', ml: 1 }} />
      </Stack>

      {def.description && (
        <Typography sx={{ fontSize: '.8rem', color: t.textSecondary, mb: 1,
          overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {def.description}
        </Typography>
      )}

      <Stack direction="row" spacing={1.5} mb={1.5} flexWrap="wrap" useFlexGap>
        {(def.stages?.length ?? 0) > 0 && (
          <Typography sx={{ fontSize: '.75rem', color: t.textSecondary }}>
            <b style={{ color: t.textPrimary }}>{def.stages.length}</b> stages
          </Typography>
        )}
        {def.total_runs != null && (
          <Typography sx={{ fontSize: '.75rem', color: t.textSecondary }}>
            <b style={{ color: t.textPrimary }}>{def.total_runs}</b> runs
          </Typography>
        )}
        {def.last_run_status && (
          <Chip size="small"
            icon={<span style={{ color: sc.color, display: 'flex', marginLeft: 6 }}>{sc.icon}</span>}
            label={sc.label}
            sx={{ bgcolor: sc.bg, color: sc.color, fontWeight: 700, fontSize: '.7rem' }} />
        )}
      </Stack>



      <Divider sx={{ borderColor: t.border, mb: 1 }} />
      <Stack direction="row" justifyContent="flex-end" spacing={1}>
        <Tooltip title="Trigger run">
          <IconButton size="small" onClick={() => onTrigger(def)} sx={{ color: dashboardSemanticColors.success }}>
            <PlayArrowIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Edit in builder">
          <IconButton size="small" onClick={() => onEdit(def)} sx={{ color: t.brandPrimary }}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete">
          <IconButton size="small" onClick={() => onDelete(def)} sx={{ color: dashboardSemanticColors.danger }}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
    </Paper>
  );
};

// ---- Definitions Tab --------------------------------------------------------
interface DefTabProps {
  reload: number;
  onRunCreated: (run: PipelineRun) => void;
}
const DefinitionsTab: React.FC<DefTabProps> = ({ reload, onRunCreated }) => {
  const navigate = useNavigate();
  const [defs, setDefs]     = useState<PipelineDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [triggerDef, setTriggerDef] = useState<PipelineDefinition | null>(null);
  const [deleteDef, setDeleteDef]   = useState<PipelineDefinition | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await listDefinitions();
      setDefs(Array.isArray(data) ? data : []);
    } catch {
      setError('Failed to load pipeline definitions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load, reload]);

  const filtered = useMemo(() => {
    if (!search) return defs;
    const q = search.toLowerCase();
    return defs.filter(d =>
      d.name.toLowerCase().includes(q) ||
      (d.project_name ?? '').toLowerCase().includes(q) ||
      (d.description ?? '').toLowerCase().includes(q)
    );
  }, [defs, search]);

  return (
    <Box>
      {/* toolbar */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} mb={2} alignItems={{ sm: 'center' }}>
        <TextField size="small" placeholder="Search definitions…"
          value={search} onChange={e => setSearch(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: t.textSecondary, fontSize: 18 }} /></InputAdornment>,
            style: { color: t.textPrimary },
          }}
          sx={{ flex: 1 }} />
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={load}
          sx={{ textTransform: 'none', borderColor: t.border, color: t.textSecondary }}>
          Refresh
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress sx={{ color: t.brandPrimary }} /></Box>
      ) : filtered.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderColor: t.border, bgcolor: t.surface }}>
          <ArticleIcon sx={{ fontSize: 40, color: t.textTertiary, mb: 1 }} />
          <Typography sx={{ color: t.textSecondary }}>
            {search ? 'No definitions match your search.' : 'No pipeline definitions yet. Create your first pipeline.'}
          </Typography>
        </Paper>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', lg: 'repeat(3,1fr)' }, gap: 2 }}>
          {filtered.map(d => (
            <DefCard key={d.id} def={d}
              onTrigger={setTriggerDef}
              onEdit={def => navigate(`/developer/Dashboard/cicd/builder?id=${def.id}`)}
              onDelete={setDeleteDef} />
          ))}
        </Box>
      )}

      <TriggerDialog open={!!triggerDef} definition={triggerDef}
        onClose={() => setTriggerDef(null)}
        onTriggered={run => { onRunCreated(run); }} />
      <DeleteDefDialog open={!!deleteDef} definition={deleteDef}
        onClose={() => setDeleteDef(null)}
        onDeleted={load} />
    </Box>
  );
};

// ---- Runs Tab ----------------------------------------------------------------
interface RunsTabProps {
  highlight: PipelineRun | null;
}
const RunsTab: React.FC<RunsTabProps> = ({ highlight }) => {
  const navigate = useNavigate();
  const [runs, setRuns]         = useState<PipelineRun[]>([]);
  const [defs, setDefs]         = useState<PipelineDefinition[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [filterDef, setFDef]    = useState<string>('');
  const [filterStatus, setFSt]  = useState<string>('');
  const [search, setSearch]     = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [runsData, defsData] = await Promise.all([
        listPipelineRuns({ definition: filterDef || undefined, status: filterStatus || undefined }),
        listDefinitions(),
      ]);
      setRuns(Array.isArray(runsData) ? runsData : []);
      setDefs(Array.isArray(defsData) ? defsData : []);
    } catch {
      setError('Failed to load pipeline runs.');
    } finally {
      setLoading(false);
    }
  }, [filterDef, filterStatus]);

  useEffect(() => { load(); }, [load]);

  // surface newly-triggered run at top
  const merged = useMemo(() => {
    if (!highlight) return runs;
    const already = runs.some(r => r.id === highlight.id);
    return already ? runs : [highlight, ...runs];
  }, [runs, highlight]);

  const filtered = useMemo(() => {
    if (!search) return merged;
    const q = search.toLowerCase();
    return merged.filter(r =>
      (r.definition_name ?? '').toLowerCase().includes(q) ||
      (r.branch ?? '').toLowerCase().includes(q) ||
      (r.triggered_by ?? '').toLowerCase().includes(q) ||
      (r.commit_sha ?? '').toLowerCase().includes(q)
    );
  }, [merged, search]);

  const handleCancel = async (runId: string | number) => {
    try {
      await cancelPipelineRun(String(runId));
      load();
    } catch {
      setError('Failed to cancel run.');
    }
  };

  return (
    <Box>
      {/* toolbar */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} mb={2} alignItems={{ sm: 'center' }} flexWrap="wrap" useFlexGap>
        <TextField size="small" placeholder="Search runs…"
          value={search} onChange={e => setSearch(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: t.textSecondary, fontSize: 18 }} /></InputAdornment>,
            style: { color: t.textPrimary },
          }}
          sx={{ flex: 1, minWidth: 180 }} />

        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel sx={{ color: t.textSecondary }}>Pipeline</InputLabel>
          <Select value={filterDef} label="Pipeline"
            onChange={e => setFDef(e.target.value)}
            sx={{ color: t.textPrimary }}>
            <MenuItem value="">All Pipelines</MenuItem>
            {defs.map(d => <MenuItem key={d.id} value={String(d.id)}>{d.name}</MenuItem>)}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel sx={{ color: t.textSecondary }}>Status</InputLabel>
          <Select value={filterStatus} label="Status"
            onChange={e => setFSt(e.target.value)}
            sx={{ color: t.textPrimary }}>
            <MenuItem value="">All</MenuItem>
            {['pending','queued','running','success','failed','cancelled'].map(s => (
              <MenuItem key={s} value={s}>{statusCfg(s).label}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={load}
          sx={{ textTransform: 'none', borderColor: t.border, color: t.textSecondary }}>
          Refresh
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress sx={{ color: t.brandPrimary }} /></Box>
      ) : filtered.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderColor: t.border, bgcolor: t.surface }}>
          <TimelineIcon sx={{ fontSize: 40, color: t.textTertiary, mb: 1 }} />
          <Typography sx={{ color: t.textSecondary }}>No runs found. Trigger a pipeline definition to get started.</Typography>
        </Paper>
      ) : (
        <Paper variant="outlined" sx={{ borderColor: t.border, bgcolor: t.surface }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: t.surfaceSubtle }}>
                <TableCell sx={{ color: t.textPrimary, fontWeight: 700 }}>Pipeline</TableCell>
                <TableCell sx={{ color: t.textPrimary, fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ color: t.textPrimary, fontWeight: 700 }}>Branch / Commit</TableCell>
                <TableCell sx={{ color: t.textPrimary, fontWeight: 700 }}>Triggered By</TableCell>
                <TableCell sx={{ color: t.textPrimary, fontWeight: 700 }}>Duration</TableCell>
                <TableCell sx={{ color: t.textPrimary, fontWeight: 700 }}>Started</TableCell>
                <TableCell align="right" sx={{ color: t.textPrimary, fontWeight: 700 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map(run => {
                const sc = statusCfg(run.status);
                const isActiveRun = run.status === 'running' || run.status === 'pending';
                return (
                  <TableRow key={run.id} hover sx={{ '&:hover': { bgcolor: t.surfaceHover } }}>
                    <TableCell>
                      <Typography sx={{ fontWeight: 600, color: t.textPrimary, fontSize: '.87rem' }}>
                        {run.definition_name ?? `Run #${run.id}`}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip size="small"
                        icon={<span style={{ color: sc.color, display: 'flex', marginLeft: 6 }}>{sc.icon}</span>}
                        label={sc.label}
                        sx={{ bgcolor: sc.bg, color: sc.color, fontWeight: 700, fontSize: '.72rem' }} />
                    </TableCell>
                    <TableCell sx={{ color: t.textSecondary, fontSize: '.82rem' }}>
                      {run.branch ?? '—'}
                      {run.commit_sha && (
                        <Typography sx={{ fontSize: '.7rem', color: t.textTertiary, fontFamily: 'monospace' }}>
                          {run.commit_sha.slice(0, 8)}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ color: t.textSecondary, fontSize: '.82rem' }}>
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <Avatar sx={{ width: 20, height: 20, fontSize: '.65rem', bgcolor: t.brandPrimary }}>
                          {(run.triggered_by ?? '?')[0].toUpperCase()}
                        </Avatar>
                        <span>{run.triggered_by ?? '—'}</span>
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ color: t.textSecondary, fontSize: '.82rem' }}>
                      {duration(run.started_at, run.finished_at)}
                    </TableCell>
                    <TableCell sx={{ color: t.textSecondary, fontSize: '.82rem' }}>
                      {timeAgo(run.started_at)}
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" justifyContent="flex-end" spacing={0.5}>
                        <Tooltip title="View execution">
                          <IconButton size="small"
                            onClick={() => navigate(`/developer/Dashboard/cicd/runs/${run.id}`)}
                            sx={{ color: t.brandPrimary }}>
                            <OpenInNewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {isActiveRun && (
                          <Tooltip title="Cancel run">
                            <IconButton size="small"
                              onClick={() => handleCancel(run.id)}
                              sx={{ color: dashboardSemanticColors.danger }}>
                              <StopIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Box>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────

const DevPipelinesPage: React.FC = () => {

  const navigate = useNavigate();
  const [tab, setTab]               = useState(0);
  const [defReload, setDefReload]   = useState(0);
  const [lastRun, setLastRun]       = useState<PipelineRun | null>(null);

  const handleRunCreated = (run: PipelineRun) => {
    setLastRun(run);
    setTab(1);   // switch to Runs tab
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: t.background, fontFamily: FONT, minHeight: '100vh' }}>
      {/* Header */}
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between"
        alignItems={{ sm: 'center' }} mb={2.5} gap={1}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: t.textPrimary }}>CI/CD Pipelines</Typography>
          <Typography variant="body2" sx={{ color: t.textSecondary }}>
            Manage and monitor pipeline runs across projects.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<ArticleIcon />}
            onClick={() => navigate('/developer/Dashboard/cicd/builder')}
            sx={{ textTransform: 'none', borderColor: t.border, color: t.textSecondary }}>
            Builder
          </Button>
          <Button variant="contained" startIcon={<AddIcon />}
            onClick={() => navigate('/developer/Dashboard/cicd/builder')}
            sx={{ textTransform: 'none', bgcolor: t.brandPrimary }}>
            New Pipeline
          </Button>
        </Stack>
      </Stack>

      {/* Tabs */}
      <Paper variant="outlined" sx={{ borderColor: t.border, bgcolor: t.surface, mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}
          TabIndicatorProps={{ style: { backgroundColor: t.brandPrimary } }}
          sx={{ px: 2, '& .MuiTab-root': { textTransform: 'none', color: t.textSecondary },
               '& .Mui-selected': { color: t.brandPrimary + ' !important' } }}>
          <Tab label="Definitions" icon={<ArticleIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
          <Tab label="Runs" icon={<TimelineIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
        </Tabs>
        <Divider sx={{ borderColor: t.border }} />
        <Box sx={{ p: 2 }}>
          {tab === 0 && (
            <DefinitionsTab
              reload={defReload}
              onRunCreated={run => { setDefReload(r => r + 1); handleRunCreated(run); }} />
          )}
          {tab === 1 && <RunsTab highlight={lastRun} />}
        </Box>
      </Paper>
    </Box>
  );
};

export default DevPipelinesPage;
