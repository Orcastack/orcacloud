/**
 * GroupPipelineDashboardPage
 * ─────────────────────────────────────────────────────────────────────────────
 * Full-detail view for a single GroupPipeline.
 * URL: /groups/:groupId/pipelines/:pipelineId
 *
 * Tabs:
 *   Overview   – key metrics + recent run timeline
 *   Runs       – paginated run history with cancel/rollback
 *   Definition – stage graph + YAML viewer
 *   Stages     – live stage/step tree for the most-recent run
 *   Metrics    – success rate, avg duration, throughput over time
 *   Settings   – edit name, description, status, triggers
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog,
  DialogActions, DialogContent, DialogTitle, FormControl,
  IconButton, InputLabel, MenuItem, Select,
  Stack, Tab, Tabs, TextField, Tooltip, Typography,
} from '@mui/material';
import ArrowBackIcon         from '@mui/icons-material/ArrowBack';
import CheckCircleIcon       from '@mui/icons-material/CheckCircle';
import ErrorIcon             from '@mui/icons-material/Error';
import PlayArrowIcon         from '@mui/icons-material/PlayArrow';
import RefreshIcon           from '@mui/icons-material/Refresh';
import StopIcon              from '@mui/icons-material/Stop';
import TimelineIcon          from '@mui/icons-material/Timeline';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { useNavigate, useParams } from 'react-router-dom';
import {
  dashboardCardSx, dashboardPrimaryButtonSx,
  dashboardSemanticColors, dashboardTokens,
} from '../styles/dashboardDesignSystem';
import {
  getGroupPipeline,
  listGroupPipelineRuns,
  triggerGroupPipelineRun,
  cancelGroupPipelineRun,
  updateGroupPipeline,
  type GroupPipeline,
  type GroupPipelineRun,
  type PipelineStatus,
  type TriggerRunPayload,
} from '../services/groupsApi';
import PipelineStageGraph from '../components/Pipelines/PipelineStageGraph';
import { useGroupPermissions } from '../hooks/useGroupPermissions';

const FONT = '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const t    = dashboardTokens.colors;
const sc   = dashboardSemanticColors;

// ── Status helpers ─────────────────────────────────────────────────────────────

const RUN_STATUS_COLOR: Record<string, string> = {
  succeeded: sc.success,
  success:   sc.success,
  failed:    sc.danger,
  running:   t.brandPrimary,
  queued:    '#d97706',
  cancelled: '#6b7280',
  pending:   '#d97706',
  skipped:   '#9ca3af',
};
function RunStatusIcon({ status, size = 16 }: { status: string; size?: number }) {
  const color = RUN_STATUS_COLOR[status] ?? '#6b7280';
  if (status === 'succeeded' || status === 'success') return <CheckCircleIcon sx={{ fontSize: size, color }} />;
  if (status === 'failed')   return <ErrorIcon sx={{ fontSize: size, color }} />;
  if (status === 'running')  return <PlayArrowIcon sx={{ fontSize: size, color }} />;
  return <RadioButtonUncheckedIcon sx={{ fontSize: size, color }} />;
}
function fmtDuration(s: number | null): string {
  if (!s) return '—';
  if (s < 60)  return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}
function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}
function fmtDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
}

// ── Sub-components ─────────────────────────────────────────────────────────────

const RunRow: React.FC<{
  run: GroupPipelineRun;
  onCancel: (runId: string) => void;
  cancelling: boolean;
}> = ({ run, onCancel, cancelling }) => {
  const color = RUN_STATUS_COLOR[run.status] ?? '#6b7280';
  return (
    <Box sx={{ ...dashboardCardSx, p: 1.5, display: 'flex', alignItems: 'center', gap: 2 }}>
      <RunStatusIcon status={run.status} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography sx={{ fontFamily: FONT, fontWeight: 600, fontSize: '.85rem', color: t.textPrimary }}>
            {run.environment_name || run.branch || 'default'}
          </Typography>
          <Chip label={run.trigger_source?.replace(/_/g, ' ') ?? 'manual'} size="small"
            sx={{ fontFamily: FONT, fontSize: '.63rem', height: 16, bgcolor: t.surfaceSubtle, color: t.textSecondary }} />
          {run.triggered_by && (
            <Typography sx={{ fontFamily: FONT, fontSize: '.75rem', color: t.textSecondary }}>
              by {run.triggered_by.username}
            </Typography>
          )}
        </Stack>
        <Stack direction="row" spacing={1.5} sx={{ mt: 0.25 }}>
          {run.commit_sha && (
            <Typography sx={{ fontFamily: 'monospace', fontSize: '.72rem', color: t.textSecondary }}>
              {run.commit_sha.slice(0, 7)}
            </Typography>
          )}
          <Typography sx={{ fontFamily: FONT, fontSize: '.72rem', color: t.textSecondary }}>
            {fmtDate(run.started_at ?? run.created_at)}
          </Typography>
        </Stack>
      </Box>
      <Stack alignItems="flex-end" spacing={0.5}>
        <Chip label={run.status} size="small"
          sx={{ fontFamily: FONT, fontSize: '.68rem', height: 18,
            bgcolor: `${color}1a`, color, border: `1px solid ${color}44` }} />
        <Typography sx={{ fontFamily: FONT, fontSize: '.7rem', color: t.textSecondary }}>
          {fmtDuration(run.duration_s)}
        </Typography>
      </Stack>
      {run.status === 'running' && (
        <Tooltip title="Cancel run">
          <span>
            <IconButton size="small" disabled={cancelling} onClick={() => onCancel(run.id)}
              sx={{ color: sc.danger }}>
              <StopIcon sx={{ fontSize: '.95rem' }} />
            </IconButton>
          </span>
        </Tooltip>
      )}
    </Box>
  );
};

// Trigger run dialog
const TriggerDialog: React.FC<{
  open: boolean; pipelineName: string;
  onClose: () => void; onTrigger: (payload: TriggerRunPayload) => void;
  loading: boolean;
}> = ({ open, pipelineName, onClose, onTrigger, loading }) => {
  const [branch, setBranch]   = useState('main');
  const [env,    setEnv]      = useState('production');
  const [commit, setCommit]   = useState('');

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth
      PaperProps={{ sx: { bgcolor: t.surface, border: `1px solid ${t.border}`, borderRadius: 2 } }}>
      <DialogTitle sx={{ fontFamily: FONT, fontWeight: 700, color: t.textPrimary, fontSize: '1rem' }}>
        Trigger Pipeline — {pipelineName}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <TextField label="Branch" size="small" fullWidth value={branch} onChange={(e) => setBranch(e.target.value)}
            InputLabelProps={{ sx: { fontFamily: FONT } }}
            inputProps={{ sx: { fontFamily: FONT, fontSize: '.85rem', color: t.textPrimary } }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }} />
          <TextField label="Environment" size="small" fullWidth value={env} onChange={(e) => setEnv(e.target.value)}
            InputLabelProps={{ sx: { fontFamily: FONT } }}
            inputProps={{ sx: { fontFamily: FONT, fontSize: '.85rem', color: t.textPrimary } }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }} />
          <TextField label="Commit SHA (optional)" size="small" fullWidth value={commit} onChange={(e) => setCommit(e.target.value)}
            InputLabelProps={{ sx: { fontFamily: FONT } }}
            inputProps={{ sx: { fontFamily: 'monospace', fontSize: '.85rem', color: t.textPrimary } }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 2.5, pb: 2 }}>
        <Button onClick={onClose} sx={{ fontFamily: FONT, color: t.textSecondary }}>Cancel</Button>
        <Button variant="contained" disabled={loading}
          onClick={() => onTrigger({ branch, environment_name: env, commit_sha: commit || undefined, trigger_source: 'user' })}
          startIcon={loading ? <CircularProgress size={14} /> : <PlayArrowIcon />}
          sx={{ ...dashboardPrimaryButtonSx, fontFamily: FONT }}>
          Trigger
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ── Tabs content ────────────────────────────────────────────────────────────────

const OverviewTab: React.FC<{ pipeline: GroupPipeline; runs: GroupPipelineRun[] }> = ({ pipeline, runs }) => {
  const recentRuns = runs.slice(0, 8);
  const successCount = recentRuns.filter(r => ['succeeded', 'success'].includes(r.status)).length;
  const failCount    = recentRuns.filter(r => r.status === 'failed').length;
  const avgDuration  = pipeline.avg_duration_s;

  const metrics = [
    { label: 'Total Runs',  value: pipeline.run_count },
    { label: 'Success Rate', value: `${pipeline.success_rate.toFixed(1)}%` },
    { label: 'Avg Duration', value: fmtDuration(avgDuration) },
    { label: 'Last Run',     value: pipeline.last_run_at ? fmtDateShort(pipeline.last_run_at) : '—' },
  ];

  return (
    <Stack spacing={2.5}>
      {/* Metric cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1.5 }}>
        {metrics.map(m => (
          <Box key={m.label} sx={{ ...dashboardCardSx, p: 1.75 }}>
            <Typography sx={{ fontFamily: FONT, fontSize: '.7rem', color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.06em' }}>{m.label}</Typography>
            <Typography sx={{ fontFamily: FONT, fontWeight: 800, fontSize: '1.25rem', color: t.textPrimary, mt: 0.25 }}>{m.value}</Typography>
          </Box>
        ))}
      </Box>

      {/* Mini run bar chart */}
      {recentRuns.length > 0 && (
        <Box sx={{ ...dashboardCardSx, p: 2 }}>
          <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '.82rem', color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.06em', mb: 1.25 }}>
            Last {recentRuns.length} Runs
          </Typography>
          <Stack direction="row" spacing={0.5} alignItems="flex-end" sx={{ height: 52 }}>
            {recentRuns.map(r => {
              const color = RUN_STATUS_COLOR[r.status] ?? '#6b7280';
              const h = Math.max(8, Math.min(48, (r.duration_s ?? 30) / 2));
              return (
                <Tooltip key={r.id} title={`${r.status} · ${fmtDuration(r.duration_s)} · ${fmtDate(r.started_at ?? r.created_at)}`}>
                  <Box sx={{ width: 16, height: h, borderRadius: .5, bgcolor: `${color}cc`, flexShrink: 0, cursor: 'pointer',
                    '&:hover': { bgcolor: color } }} />
                </Tooltip>
              );
            })}
          </Stack>
          <Stack direction="row" spacing={1.5} sx={{ mt: 1, flexWrap: 'wrap' }}>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: sc.success }} />
              <Typography sx={{ fontFamily: FONT, fontSize: '.72rem', color: t.textSecondary }}>{successCount} passed</Typography>
            </Stack>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: sc.danger }} />
              <Typography sx={{ fontFamily: FONT, fontSize: '.72rem', color: t.textSecondary }}>{failCount} failed</Typography>
            </Stack>
          </Stack>
        </Box>
      )}

      {/* Tags */}
      {pipeline.tags && pipeline.tags.length > 0 && (
        <Stack direction="row" spacing={0.5} flexWrap="wrap">
          {pipeline.tags.map(tag => (
            <Chip key={tag} label={tag} size="small"
              sx={{ fontFamily: FONT, fontSize: '.7rem', height: 20, bgcolor: t.surfaceSubtle, color: t.textSecondary }} />
          ))}
        </Stack>
      )}

      {/* Description */}
      {pipeline.description && (
        <Box sx={{ ...dashboardCardSx, p: 1.75 }}>
          <Typography sx={{ fontFamily: FONT, fontSize: '.82rem', color: t.textSecondary, lineHeight: 1.6 }}>{pipeline.description}</Typography>
        </Box>
      )}
    </Stack>
  );
};

const RunsTab: React.FC<{
  runs: GroupPipelineRun[]; loading: boolean;
  onCancel: (runId: string) => void; cancelling: boolean;
}> = ({ runs, loading, onCancel, cancelling }) => {
  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', pt: 6 }}><CircularProgress sx={{ color: t.brandPrimary }} /></Box>;
  if (runs.length === 0) return (
    <Box sx={{ ...dashboardCardSx, p: 4, textAlign: 'center' }}>
      <PlayArrowIcon sx={{ fontSize: '2.5rem', color: t.textSecondary, opacity: .3 }} />
      <Typography sx={{ fontFamily: FONT, fontWeight: 700, color: t.textPrimary, mt: 1 }}>No runs yet</Typography>
    </Box>
  );
  return (
    <Stack spacing={0.75}>
      {runs.map(r => <RunRow key={r.id} run={r} onCancel={onCancel} cancelling={cancelling} />)}
    </Stack>
  );
};

const DefinitionTab: React.FC<{ pipeline: GroupPipeline }> = ({ pipeline }) => {
  const [view, setView] = useState<'graph' | 'yaml'>('graph');
  const stages = pipeline.definition?.stages ?? [];

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1}>
        <Button size="small" variant={view === 'graph' ? 'contained' : 'outlined'}
          onClick={() => setView('graph')}
          sx={{ fontFamily: FONT, fontSize: '.78rem', borderRadius: 1.5,
            ...(view === 'graph' ? dashboardPrimaryButtonSx : { color: t.textSecondary, borderColor: t.border }) }}>
          Stage Graph
        </Button>
        <Button size="small" variant={view === 'yaml' ? 'contained' : 'outlined'}
          onClick={() => setView('yaml')}
          sx={{ fontFamily: FONT, fontSize: '.78rem', borderRadius: 1.5,
            ...(view === 'yaml' ? dashboardPrimaryButtonSx : { color: t.textSecondary, borderColor: t.border }) }}>
          YAML
        </Button>
      </Stack>
      {view === 'graph' ? (
        <Box sx={{ ...dashboardCardSx, p: 2, overflowX: 'auto' }}>
          <PipelineStageGraph stages={stages} interactive />
        </Box>
      ) : (
        <Box sx={{ ...dashboardCardSx, p: 2 }}>
          {pipeline.yaml_content ? (
            <Box component="pre" sx={{
              fontFamily: 'monospace', fontSize: '.78rem', color: t.textPrimary,
              whiteSpace: 'pre-wrap', wordBreak: 'break-word', m: 0,
              maxHeight: '60vh', overflowY: 'auto',
            }}>
              {pipeline.yaml_content}
            </Box>
          ) : (
            <Typography sx={{ fontFamily: FONT, color: t.textSecondary, fontSize: '.85rem' }}>
              No YAML definition available.
            </Typography>
          )}
        </Box>
      )}
    </Stack>
  );
};

const StagesTab: React.FC<{ runs: GroupPipelineRun[] }> = ({ runs }) => {
  const latest = runs.find(r => ['running', 'succeeded', 'failed', 'success'].includes(r.status)) ?? runs[0];
  if (!latest) return (
    <Box sx={{ ...dashboardCardSx, p: 4, textAlign: 'center' }}>
      <TimelineIcon sx={{ fontSize: '2.5rem', color: t.textSecondary, opacity: .3 }} />
      <Typography sx={{ fontFamily: FONT, fontWeight: 700, color: t.textPrimary, mt: 1 }}>No run data yet</Typography>
    </Box>
  );
  const stages = latest.stages_snapshot ?? [];
  return (
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography sx={{ fontFamily: FONT, fontSize: '.78rem', color: t.textSecondary }}>
          Showing stages for run from {fmtDate(latest.started_at ?? latest.created_at)}
        </Typography>
        <Chip label={latest.status} size="small"
          sx={{ fontFamily: FONT, fontSize: '.65rem', height: 16,
            bgcolor: `${RUN_STATUS_COLOR[latest.status] ?? '#6b7280'}1a`,
            color: RUN_STATUS_COLOR[latest.status] ?? '#6b7280' }} />
      </Stack>
      <Box sx={{ ...dashboardCardSx, p: 2, overflowX: 'auto' }}>
        <PipelineStageGraph stages={stages} interactive={false} />
      </Box>
    </Stack>
  );
};

const MetricsTab: React.FC<{ pipeline: GroupPipeline; runs: GroupPipelineRun[] }> = ({ pipeline, runs }) => {
  const byDay: Record<string, { total: number; succeeded: number; durationSum: number }> = {};
  runs.forEach(r => {
    if (!r.started_at) return;
    const d = new Date(r.started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (!byDay[d]) byDay[d] = { total: 0, succeeded: 0, durationSum: 0 };
    byDay[d].total++;
    if (['succeeded', 'success'].includes(r.status)) byDay[d].succeeded++;
    byDay[d].durationSum += (r.duration_s ?? 0);
  });
  const days = Object.keys(byDay).slice(-14);

  return (
    <Stack spacing={2.5}>
      {/* Throughput */}
      <Box sx={{ ...dashboardCardSx, p: 2 }}>
        <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '.82rem', color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.06em', mb: 1.25 }}>
          Daily Throughput (last 14 days)
        </Typography>
        {days.length === 0 ? (
          <Typography sx={{ fontFamily: FONT, fontSize: '.82rem', color: t.textSecondary }}>Not enough data yet.</Typography>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 0.5, height: 64 }}>
            {days.map(d => {
              const { total, succeeded } = byDay[d];
              const maxH = 56;
              const h = Math.max(6, (total / Math.max(...days.map(k => byDay[k].total))) * maxH);
              const rate = total > 0 ? succeeded / total : 0;
              const color = rate > 0.8 ? sc.success : rate > 0.5 ? sc.warning : sc.danger;
              return (
                <Tooltip key={d} title={`${d}: ${total} runs · ${(rate * 100).toFixed(0)}% pass`}>
                  <Stack alignItems="center" spacing={0.25} sx={{ flex: 1 }}>
                    <Box sx={{ width: '80%', height: h, borderRadius: .5, bgcolor: `${color}cc`, '&:hover': { bgcolor: color } }} />
                    <Typography sx={{ fontFamily: FONT, fontSize: '.6rem', color: t.textSecondary, lineHeight: 1 }}>{d.slice(0, 3)}</Typography>
                  </Stack>
                </Tooltip>
              );
            })}
          </Box>
        )}
      </Box>

      {/* Summary stats */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5 }}>
        {[
          { label: 'Lifetime Runs',   value: pipeline.run_count },
          { label: 'Success Rate',    value: `${pipeline.success_rate.toFixed(1)}%` },
          { label: 'Avg Duration',    value: fmtDuration(pipeline.avg_duration_s) },
        ].map(m => (
          <Box key={m.label} sx={{ ...dashboardCardSx, p: 1.75 }}>
            <Typography sx={{ fontFamily: FONT, fontSize: '.7rem', color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.06em' }}>{m.label}</Typography>
            <Typography sx={{ fontFamily: FONT, fontWeight: 800, fontSize: '1.25rem', color: t.textPrimary }}>{m.value}</Typography>
          </Box>
        ))}
      </Box>
    </Stack>
  );
};

const STATUS_OPTIONS: PipelineStatus[] = ['active', 'draft', 'archived', 'disabled'];

const SettingsTab: React.FC<{
  pipeline: GroupPipeline; groupId: string;
  onSaved: (p: GroupPipeline) => void; canEdit: boolean;
}> = ({ pipeline, groupId, onSaved, canEdit }) => {
  const [name,   setName]   = useState(pipeline.name);
  const [desc,   setDesc]   = useState(pipeline.description ?? '');
  const [status, setStatus] = useState<PipelineStatus>(pipeline.status);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true); setError(null);
    try {
      const updated = await updateGroupPipeline(groupId, pipeline.id, { name, description: desc, status });
      onSaved(updated);
    } catch (e: unknown) {
      setError((e as Error).message ?? 'Failed to save settings');
    } finally { setSaving(false); }
  };

  return (
    <Stack spacing={2} sx={{ maxWidth: 560 }}>
      {error && <Alert severity="error" sx={{ fontFamily: FONT, fontSize: '.82rem' }}>{error}</Alert>}
      <TextField label="Pipeline Name" fullWidth value={name} disabled={!canEdit} onChange={(e) => setName(e.target.value)}
        InputLabelProps={{ sx: { fontFamily: FONT } }}
        inputProps={{ sx: { fontFamily: FONT, color: t.textPrimary } }}
        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }} />
      <TextField label="Description" fullWidth multiline minRows={2} value={desc} disabled={!canEdit} onChange={(e) => setDesc(e.target.value)}
        InputLabelProps={{ sx: { fontFamily: FONT } }}
        inputProps={{ sx: { fontFamily: FONT, color: t.textPrimary } }}
        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }} />
      <FormControl fullWidth size="small" disabled={!canEdit}>
        <InputLabel sx={{ fontFamily: FONT }}>Status</InputLabel>
        <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value as PipelineStatus)}
          sx={{ fontFamily: FONT, borderRadius: 1.5 }}>
          {STATUS_OPTIONS.map(s => (
            <MenuItem key={s} value={s} sx={{ fontFamily: FONT }}>{s}</MenuItem>
          ))}
        </Select>
      </FormControl>
      {canEdit && (
        <Button variant="contained" disabled={saving} onClick={handleSave}
          sx={{ ...dashboardPrimaryButtonSx, alignSelf: 'flex-start', fontFamily: FONT }}>
          {saving ? 'Saving…' : 'Save Changes'}
        </Button>
      )}
      {!canEdit && (
        <Typography sx={{ fontFamily: FONT, fontSize: '.82rem', color: t.textSecondary }}>
          Read-only. You need pipeline.edit permission to change settings.
        </Typography>
      )}
    </Stack>
  );
};

// ── Main Page ──────────────────────────────────────────────────────────────────

type TabId = 'overview' | 'runs' | 'definition' | 'stages' | 'metrics' | 'settings';
const TABS: { id: TabId; label: string }[] = [
  { id: 'overview',    label: 'Overview' },
  { id: 'runs',        label: 'Runs' },
  { id: 'definition',  label: 'Definition' },
  { id: 'stages',      label: 'Stages' },
  { id: 'metrics',     label: 'Metrics' },
  { id: 'settings',    label: 'Settings' },
];

const GroupPipelineDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { groupId, pipelineId } = useParams<{ groupId: string; pipelineId: string }>();

  const [pipeline,    setPipeline]    = useState<GroupPipeline | null>(null);
  const [runs,        setRuns]        = useState<GroupPipelineRun[]>([]);
  const [activeTab,   setActiveTab]   = useState<TabId>('overview');
  const [loading,     setLoading]     = useState(true);
  const [runsLoading, setRunsLoading] = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [triggerOpen, setTriggerOpen] = useState(false);
  const [triggering,  setTriggering]  = useState(false);
  const [cancelling,  setCancelling]  = useState(false);
  const [feedback,    setFeedback]    = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const { can } = useGroupPermissions(groupId ?? '');

  const fetchPipeline = useCallback(async () => {
    if (!groupId || !pipelineId) return;
    try {
      setPipeline(await getGroupPipeline(groupId, pipelineId));
    } catch (e: unknown) {
      setError((e as Error).message ?? 'Failed to load pipeline');
    } finally { setLoading(false); }
  }, [groupId, pipelineId]);

  const fetchRuns = useCallback(async () => {
    if (!groupId || !pipelineId) return;
    setRunsLoading(true);
    try {
      setRuns(await listGroupPipelineRuns(groupId, pipelineId));
    } catch { /* silent */ } finally { setRunsLoading(false); }
  }, [groupId, pipelineId]);

  useEffect(() => { fetchPipeline(); fetchRuns(); }, [fetchPipeline, fetchRuns]);

  const handleTrigger = async (payload: TriggerRunPayload) => {
    if (!groupId || !pipelineId) return;
    setTriggering(true);
    try {
      await triggerGroupPipelineRun(groupId, pipelineId, payload);
      setTriggerOpen(false);
      setFeedback({ type: 'success', message: 'Pipeline run triggered successfully.' });
      setTimeout(fetchRuns, 1500);
    } catch (e: unknown) {
      setFeedback({ type: 'error', message: (e as Error).message ?? 'Failed to trigger pipeline.' });
    } finally { setTriggering(false); }
  };

  const handleCancelRun = async (runId: string) => {
    if (!groupId || !pipelineId) return;
    setCancelling(true);
    try {
      await cancelGroupPipelineRun(groupId, pipelineId, runId);
      setFeedback({ type: 'success', message: 'Run cancelled.' });
      await fetchRuns();
    } catch {
      setFeedback({ type: 'error', message: 'Failed to cancel run.' });
    } finally { setCancelling(false); }
  };

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', bgcolor: t.background }}>
      <CircularProgress sx={{ color: t.brandPrimary }} />
    </Box>
  );
  if (error || !pipeline) return (
    <Box sx={{ p: 4, bgcolor: t.background, minHeight: '100vh' }}>
      <Alert severity="error" sx={{ fontFamily: FONT }}>{error ?? 'Pipeline not found.'}</Alert>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(`/groups/${groupId}/pipelines`)}
        sx={{ fontFamily: FONT, mt: 2, color: t.textSecondary }}>
        Back to Pipelines
      </Button>
    </Box>
  );

  const pipelineStatusColor = pipeline.status === 'active' ? sc.success : pipeline.status === 'disabled' ? sc.warning : pipeline.status === 'archived' ? '#6b7280' : '#d97706';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: t.background, fontFamily: FONT }}>
      {/* Header */}
      <Box sx={{ bgcolor: t.surface, borderBottom: `1px solid ${t.border}`, px: 3, py: 2, flexShrink: 0 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <IconButton size="small" onClick={() => navigate(`/groups/${groupId}/pipelines`)}
              sx={{ color: t.textSecondary }}>
              <ArrowBackIcon sx={{ fontSize: '1rem' }} />
            </IconButton>
            <Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography sx={{ fontFamily: FONT, fontWeight: 800, fontSize: '1.1rem', color: t.textPrimary }}>
                  {pipeline.name}
                </Typography>
                <Chip label={pipeline.status} size="small"
                  sx={{ fontFamily: FONT, fontSize: '.68rem', height: 18,
                    bgcolor: `${pipelineStatusColor}1a`, color: pipelineStatusColor,
                    border: `1px solid ${pipelineStatusColor}44` }} />
                <Chip label={pipeline.pipeline_type?.replace(/_/g, ' ') ?? 'pipeline'} size="small"
                  sx={{ fontFamily: FONT, fontSize: '.65rem', height: 16, bgcolor: t.surfaceSubtle, color: t.textSecondary }} />
              </Stack>
              {pipeline.project_name && (
                <Typography sx={{ fontFamily: FONT, fontSize: '.75rem', color: t.textSecondary, mt: 0.2 }}>
                  {pipeline.project_name} · {pipeline.slug}
                </Typography>
              )}
            </Box>
          </Stack>
          <Stack direction="row" spacing={1}>
            <IconButton size="small" onClick={() => { fetchPipeline(); fetchRuns(); }}
              sx={{ color: t.textSecondary, '&:hover': { color: t.brandPrimary } }}>
              <RefreshIcon sx={{ fontSize: '1rem' }} />
            </IconButton>
            {can('pipeline.run') && (
              <Button variant="contained" startIcon={<PlayArrowIcon sx={{ fontSize: '1rem' }} />}
                onClick={() => setTriggerOpen(true)}
                sx={{ ...dashboardPrimaryButtonSx, fontFamily: FONT, fontSize: '.82rem', height: 34 }}>
                Run
              </Button>
            )}
          </Stack>
        </Stack>

        {feedback && (
          <Alert severity={feedback.type} onClose={() => setFeedback(null)}
            sx={{ mt: 1.5, fontFamily: FONT, fontSize: '.82rem', py: 0.5 }}>
            {feedback.message}
          </Alert>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v as TabId)}
          variant="scrollable" scrollButtons="auto"
          sx={{ mt: 1.5, borderBottom: 0,
            '& .MuiTab-root': { fontFamily: FONT, fontSize: '.82rem', textTransform: 'none', minHeight: 36, py: 0, px: 1.5 },
            '& .Mui-selected': { color: `${t.brandPrimary} !important`, fontWeight: 700 },
            '& .MuiTabs-indicator': { bgcolor: t.brandPrimary, height: 2, bottom: -1 },
          }}>
          {TABS.map(tab => (
            <Tab key={tab.id} label={tab.label} value={tab.id} />
          ))}
        </Tabs>
      </Box>

      {/* Body */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 2.5,
        '&::-webkit-scrollbar': { width: 5 },
        '&::-webkit-scrollbar-thumb': { bgcolor: t.border, borderRadius: 2 } }}>
        {activeTab === 'overview'   && <OverviewTab pipeline={pipeline} runs={runs} />}
        {activeTab === 'runs'       && <RunsTab runs={runs} loading={runsLoading} onCancel={handleCancelRun} cancelling={cancelling} />}
        {activeTab === 'definition' && <DefinitionTab pipeline={pipeline} />}
        {activeTab === 'stages'     && <StagesTab runs={runs} />}
        {activeTab === 'metrics'    && <MetricsTab pipeline={pipeline} runs={runs} />}
        {activeTab === 'settings'   && (
          <SettingsTab pipeline={pipeline} groupId={groupId ?? ''}
            onSaved={(p) => { setPipeline(p); setFeedback({ type: 'success', message: 'Settings saved.' }); }}
            canEdit={can('pipeline.edit')} />
        )}
      </Box>

      {/* Trigger dialog */}
      <TriggerDialog open={triggerOpen} pipelineName={pipeline.name}
        onClose={() => setTriggerOpen(false)} onTrigger={handleTrigger} loading={triggering} />
    </Box>
  );
};

export default GroupPipelineDashboardPage;
