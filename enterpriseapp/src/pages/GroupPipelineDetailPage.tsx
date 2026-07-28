// OrcaCloud – Group Pipeline Detail Page
// Route: /groups/:groupId/pipelines/:pipelineId
// Tabs: Overview | Runs | Definition (YAML) | Stages & Steps | Metrics | Settings

import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert, Avatar, Box, Button, Chip, CircularProgress,
  Divider, IconButton, Paper, Stack, Tab, Table, TableBody,
  TableCell, TableHead, TableRow, Tabs, TextField, Tooltip,
  Typography,
} from '@mui/material';
import AddIcon              from '@mui/icons-material/Add';
import ArrowBackIcon        from '@mui/icons-material/ArrowBack';
import BlockIcon            from '@mui/icons-material/Block';
import CheckCircleIcon      from '@mui/icons-material/CheckCircle';
import ContentCopyIcon      from '@mui/icons-material/ContentCopy';
import DeleteIcon           from '@mui/icons-material/Delete';
import EditIcon             from '@mui/icons-material/Edit';
import ErrorIcon            from '@mui/icons-material/Error';
import ExpandMoreIcon       from '@mui/icons-material/ExpandMore';
import HourglassEmptyIcon   from '@mui/icons-material/HourglassEmpty';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import PlayArrowIcon        from '@mui/icons-material/PlayArrow';
import RefreshIcon          from '@mui/icons-material/Refresh';
import ReplayIcon           from '@mui/icons-material/Replay';
import SaveIcon             from '@mui/icons-material/Save';
import SettingsIcon         from '@mui/icons-material/Settings';
import StopIcon             from '@mui/icons-material/Stop';
import TimelineIcon         from '@mui/icons-material/Timeline';
import { useNavigate, useParams } from 'react-router-dom';
import {
  GroupPipeline, GroupPipelineRun, GroupPipelineStage, GroupPipelineStep,
  GroupPipelineStatus,
  getGroupPipeline, listGroupPipelineRuns,
  triggerGroupPipelineRun, cancelGroupPipelineRun, rollbackGroupPipelineRun,
  updateGroupPipeline, updateGroupPipelineDefinition,
  deleteGroupPipeline,
} from '../services/pipelinesApi';
import { dashboardTokens, dashboardSemanticColors } from '../styles/dashboardDesignSystem';

const FONT = '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const t    = dashboardTokens.colors;
const sc   = dashboardSemanticColors;
const BP   = t.brandPrimary;

/* ─────────────────────────────────────────────────────────────────────────────
   Utility helpers
   ───────────────────────────────────────────────────────────────────────────── */

function statusColor(s: string) {
  switch (s) {
    case 'succeeded': case 'active':  return sc.success;
    case 'running':                   return sc.info;
    case 'failed':                    return sc.danger;
    case 'queued': case 'pending':    return sc.warning;
    case 'cancelled': case 'disabled': case 'archived': return t.textSecondary;
    case 'rolled_back':               return sc.warning;
    default:                          return t.textSecondary;
  }
}

function StatusChip({ status }: { status: string }) {
  const col = statusColor(status);
  return (
    <Chip
      size="small"
      label={status.replace('_', ' ')}
      sx={{
        fontFamily: FONT, fontSize: '.7rem', fontWeight: 700, textTransform: 'capitalize',
        bgcolor: `${col}18`, color: col, border: `1px solid ${col}44`, height: 22,
      }}
    />
  );
}

function fmtDuration(s: number | null): string {
  if (s === null || s === undefined) return '—';
  if (s < 60)  return `${Math.round(s)}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
}

function fmtDate(ts: string | null): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleString();
}

/* ─────────────────────────────────────────────────────────────────────────────
   Sub-components
   ───────────────────────────────────────────────────────────────────────────── */

/* ── Overview Tab ── */
function OverviewTab({ pipeline, onTrigger }: { pipeline: GroupPipeline; onTrigger: () => void }) {
  const pairs: [string, string][] = [
    ['ID',          pipeline.id],
    ['Slug',        pipeline.slug],
    ['Type',        pipeline.pipeline_type.replace('_', ' / ')],
    ['Status',      pipeline.status],
    ['Project',     pipeline.project_name || '—'],
    ['Environments', pipeline.environment_targets.join(', ') || '—'],
    ['Trigger',     pipeline.triggers.map(t2 => t2.type).join(', ') || 'manual'],
    ['Last run',    fmtDate(pipeline.last_run_at)],
    ['Avg duration', fmtDuration(pipeline.avg_duration_s)],
    ['Success rate', `${pipeline.success_rate.toFixed(1)}%`],
  ];

  return (
    <Box>
      <Button variant="contained" startIcon={<PlayArrowIcon />} onClick={onTrigger}
        size="small"
        sx={{ fontFamily: FONT, textTransform: 'none', bgcolor: BP, mb: 3, fontWeight: 700 }}>
        Trigger Run
      </Button>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} mb={3}>
        {/* Key stats */}
        {[
          { label: 'Total Runs',    value: pipeline.run_count },
          { label: 'Success Rate',  value: `${pipeline.success_rate.toFixed(1)}%` },
          { label: 'Avg Duration',  value: fmtDuration(pipeline.avg_duration_s) },
          { label: 'Last Status',   value: pipeline.last_run_status || 'never run' },
        ].map(({ label, value }) => (
          <Paper key={label} elevation={0} sx={{
            flex: 1, p: 2, border: `1px solid ${t.border}`,
            borderRadius: 2, bgcolor: t.surface, textAlign: 'center',
          }}>
            <Typography sx={{ fontFamily: FONT, fontSize: '.75rem', color: t.textSecondary }}>{label}</Typography>
            <Typography sx={{ fontFamily: FONT, fontSize: '1.4rem', fontWeight: 800, color: t.textPrimary, mt: 0.5 }}>{value}</Typography>
          </Paper>
        ))}
      </Stack>

      {pipeline.description && (
        <Typography sx={{ fontFamily: FONT, fontSize: '.9rem', color: t.textSecondary, mb: 3 }}>
          {pipeline.description}
        </Typography>
      )}

      <Paper elevation={0} sx={{ border: `1px solid ${t.border}`, borderRadius: 2, overflow: 'hidden', mb: 3 }}>
        {pairs.map(([k, v], i) => (
          <Box key={k} sx={{
            display: 'flex', alignItems: 'center', gap: 2, px: 2.5, py: 1.5,
            bgcolor: i % 2 === 0 ? t.surface : t.background,
            borderBottom: i < pairs.length - 1 ? `1px solid ${t.border}` : 'none',
          }}>
            <Typography sx={{ fontFamily: FONT, fontSize: '.82rem', color: t.textSecondary, minWidth: 140, fontWeight: 600 }}>{k}</Typography>
            <Typography sx={{ fontFamily: FONT, fontSize: '.82rem', color: t.textPrimary }}>{v}</Typography>
          </Box>
        ))}
      </Paper>

      {pipeline.tags.length > 0 && (
        <Box>
          <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '.82rem', color: t.textSecondary, mb: 1 }}>TAGS</Typography>
          <Stack direction="row" flexWrap="wrap" gap={0.75}>
            {pipeline.tags.map(tag => (
              <Chip key={tag} label={tag} size="small"
                sx={{ fontFamily: FONT, fontSize: '.72rem', bgcolor: `${BP}14`, color: BP }} />
            ))}
          </Stack>
        </Box>
      )}

      {(pipeline.upstream_pipeline_ids.length > 0 || pipeline.downstream_pipeline_ids.length > 0) && (
        <Box mt={3}>
          <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '.82rem', color: t.textSecondary, mb: 1 }}>PIPELINE CHAIN</Typography>
          {pipeline.upstream_pipeline_ids.length > 0 && (
            <Box mb={1}>
              <Typography sx={{ fontFamily: FONT, fontSize: '.78rem', color: t.textSecondary }}>Upstream</Typography>
              <Stack direction="row" flexWrap="wrap" gap={0.75} mt={0.5}>
                {pipeline.upstream_pipeline_ids.map(id => (
                  <Chip key={id} label={id} size="small" sx={{ fontFamily: FONT, fontSize: '.72rem' }} />
                ))}
              </Stack>
            </Box>
          )}
          {pipeline.downstream_pipeline_ids.length > 0 && (
            <Box>
              <Typography sx={{ fontFamily: FONT, fontSize: '.78rem', color: t.textSecondary }}>Downstream</Typography>
              <Stack direction="row" flexWrap="wrap" gap={0.75} mt={0.5}>
                {pipeline.downstream_pipeline_ids.map(id => (
                  <Chip key={id} label={id} size="small" sx={{ fontFamily: FONT, fontSize: '.72rem' }} />
                ))}
              </Stack>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}

/* ── Runs Tab ── */
function RunsTab({
  runs, loading,
  onCancel, onRollback, onRefresh,
}: {
  runs: GroupPipelineRun[];
  loading: boolean;
  onCancel: (runId: string) => void;
  onRollback: (runId: string) => void;
  onRefresh: () => void;
}) {
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '.95rem', color: t.textPrimary }}>
          Run History
        </Typography>
        <IconButton size="small" onClick={onRefresh}>
          <RefreshIcon sx={{ fontSize: '1rem' }} />
        </IconButton>
      </Box>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={28} /></Box>
      ) : runs.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6, color: t.textSecondary }}>
          <PlayCircleOutlineIcon sx={{ fontSize: '2.5rem', mb: 1, opacity: 0.4 }} />
          <Typography sx={{ fontFamily: FONT, fontSize: '.9rem' }}>No runs yet</Typography>
        </Box>
      ) : (
        <Paper elevation={0} sx={{ border: `1px solid ${t.border}`, borderRadius: 2, overflow: 'hidden' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { fontFamily: FONT, fontSize: '.74rem', fontWeight: 700, color: t.textSecondary, bgcolor: t.surface, borderColor: t.border } }}>
                <TableCell>Run ID</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Trigger</TableCell>
                <TableCell>Branch</TableCell>
                <TableCell>Commit</TableCell>
                <TableCell>Duration</TableCell>
                <TableCell>Started</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {runs.map(run => (
                <TableRow key={run.id} sx={{ '& td': { fontFamily: FONT, fontSize: '.82rem', borderColor: t.border } }}>
                  <TableCell>
                    <Tooltip title={run.id}>
                      <Typography sx={{ fontFamily: FONT, fontSize: '.78rem', color: BP, fontWeight: 600, cursor: 'pointer' }}>
                        {run.id.slice(0, 10)}…
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell><StatusChip status={run.status} /></TableCell>
                  <TableCell sx={{ textTransform: 'capitalize' }}>{run.trigger_source}</TableCell>
                  <TableCell sx={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {run.branch || '—'}
                  </TableCell>
                  <TableCell>
                    <Tooltip title={run.commit_sha || '—'}>
                      <span>{run.commit_sha ? run.commit_sha.slice(0, 8) : '—'}</span>
                    </Tooltip>
                  </TableCell>
                  <TableCell>{fmtDuration(run.duration_s)}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmtDate(run.started_at)}</TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      {run.status === 'running' && (
                        <Tooltip title="Cancel">
                          <IconButton size="small" onClick={() => onCancel(run.id)}>
                            <StopIcon sx={{ fontSize: '1rem', color: sc.danger }} />
                          </IconButton>
                        </Tooltip>
                      )}
                      {(run.status === 'failed' || run.status === 'succeeded') && (
                        <Tooltip title="Rollback">
                          <IconButton size="small" onClick={() => onRollback(run.id)}>
                            <ReplayIcon sx={{ fontSize: '1rem', color: sc.warning }} />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Box>
  );
}

/* ── Definition (YAML) Tab ── */
function DefinitionTab({ pipeline, onSaved }: { pipeline: GroupPipeline; onSaved: (yaml: string) => void }) {
  const [yaml, setYaml] = useState(pipeline.yaml_content || '');
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [err, setErr] = useState('');

  const handleSave = async () => {
    setSaving(true); setErr('');
    try {
      await updateGroupPipeline(pipeline.group, pipeline.id, { yaml_content: yaml });
      setSaveOk(true);
      onSaved(yaml);
      setTimeout(() => setSaveOk(false), 2500);
    } catch (e: any) {
      setErr(e.response?.data?.detail || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '.95rem', color: t.textPrimary }}>YAML Definition</Typography>
        <Button variant="contained" size="small" startIcon={saving ? <CircularProgress size={12} sx={{ color: '#fff' }} /> : <SaveIcon />}
          onClick={handleSave} disabled={saving}
          sx={{ fontFamily: FONT, textTransform: 'none', bgcolor: BP, fontWeight: 700 }}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </Box>
      {saveOk && <Alert severity="success" sx={{ mb: 1.5, fontFamily: FONT }}>Saved successfully.</Alert>}
      {err && <Alert severity="error" sx={{ mb: 1.5, fontFamily: FONT }}>{err}</Alert>}
      <TextField
        multiline fullWidth
        value={yaml}
        onChange={e => setYaml(e.target.value)}
        minRows={24}
        InputProps={{
          sx: {
            fontFamily: '"Fira Code", "JetBrains Mono", "Courier New", monospace',
            fontSize: '.82rem', bgcolor: '#0a0e1a', color: '#e2e8f0',
            borderRadius: 1.5,
          },
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            '& fieldset': { borderColor: t.border },
            '&:hover fieldset': { borderColor: BP },
            '&.Mui-focused fieldset': { borderColor: BP },
          },
        }}
        placeholder="# Paste or write your pipeline YAML here..."
      />
    </Box>
  );
}

/* ── Stage card in visual builder ── */
function StageCard({
  stage, index, onUpdate, onDelete, onAddStep, onDeleteStep,
}: {
  stage: GroupPipelineStage;
  index: number;
  onUpdate: (i: number, s: GroupPipelineStage) => void;
  onDelete: (i: number) => void;
  onAddStep: (i: number) => void;
  onDeleteStep: (si: number, pi: number) => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <Paper elevation={0} sx={{ border: `1px solid ${t.border}`, borderRadius: 2, mb: 1.5, overflow: 'hidden' }}>
      {/* Stage header */}
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.25,
        bgcolor: t.surface, cursor: 'pointer',
        borderBottom: open ? `1px solid ${t.border}` : 'none',
      }} onClick={() => setOpen(o => !o)}>
        <Avatar sx={{ width: 22, height: 22, fontSize: '.7rem', bgcolor: BP, color: '#fff', fontFamily: FONT, fontWeight: 700 }}>
          {index + 1}
        </Avatar>
        <TextField
          value={stage.name}
          onChange={e => onUpdate(index, { ...stage, name: e.target.value })}
          onClick={e => e.stopPropagation()}
          size="small" variant="standard"
          InputProps={{ sx: { fontFamily: FONT, fontWeight: 700, fontSize: '.9rem', color: t.textPrimary } }}
          sx={{ flex: 1, '& .MuiInput-underline:before': { borderColor: 'transparent' } }}
        />
        <Chip label={stage.type || 'custom'} size="small"
          sx={{ fontFamily: FONT, fontSize: '.68rem', bgcolor: `${BP}18`, color: BP }} />
        {stage.parallel && (
          <Chip label="parallel" size="small"
            sx={{ fontFamily: FONT, fontSize: '.68rem', bgcolor: `${sc.info}18`, color: sc.info }} />
        )}
        <IconButton size="small" onClick={e => { e.stopPropagation(); onDelete(index); }}>
          <DeleteIcon sx={{ fontSize: '.9rem', color: t.textSecondary }} />
        </IconButton>
        <ExpandMoreIcon sx={{
          fontSize: '1.1rem', color: t.textSecondary,
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s',
        }} />
      </Box>

      {/* Steps */}
      {open && (
        <Box sx={{ bgcolor: t.background, px: 2, py: 1.5 }}>
          {stage.steps.map((step, si) => (
            <Box key={si} sx={{
              display: 'flex', alignItems: 'center', gap: 1.5, py: 0.75,
              borderBottom: si < stage.steps.length - 1 ? `1px dashed ${t.border}` : 'none',
            }}>
              <KeyboardArrowRightIcon sx={{ fontSize: '.9rem', color: t.textSecondary }} />
              <TextField
                value={step.name}
                onChange={e => {
                  const steps = [...stage.steps];
                  steps[si] = { ...step, name: e.target.value };
                  onUpdate(index, { ...stage, steps });
                }}
                size="small" variant="standard" placeholder="Step name"
                InputProps={{ sx: { fontFamily: FONT, fontSize: '.85rem', color: t.textPrimary } }}
                sx={{ flex: 1, '& .MuiInput-underline:before': { borderColor: 'transparent' } }}
              />
              <Chip label={step.type || 'script'} size="small"
                sx={{ fontFamily: FONT, fontSize: '.65rem', textTransform: 'capitalize' }} />
              <IconButton size="small" onClick={() => onDeleteStep(si, index)}>
                <DeleteIcon sx={{ fontSize: '.85rem', color: t.textSecondary }} />
              </IconButton>
            </Box>
          ))}
          <Button size="small" startIcon={<AddIcon />} onClick={() => onAddStep(index)}
            sx={{ fontFamily: FONT, textTransform: 'none', color: t.textSecondary, fontSize: '.78rem', mt: 0.75 }}>
            Add step
          </Button>
        </Box>
      )}
    </Paper>
  );
}

/* ── Stages & Steps Tab ── */
function StagesTab({
  pipeline, onSaved,
}: {
  pipeline: GroupPipeline;
  onSaved: () => void;
}) {
  const [stages, setStages] = useState<GroupPipelineStage[]>(pipeline.definition?.stages ?? []);
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [err, setErr] = useState('');

  const updateStage = (i: number, s: GroupPipelineStage) =>
    setStages(prev => prev.map((x, idx) => idx === i ? s : x));

  const deleteStage = (i: number) =>
    setStages(prev => prev.filter((_, idx) => idx !== i));

  const addStage = () =>
    setStages(prev => [...prev, { name: `Stage ${prev.length + 1}`, type: 'custom', steps: [] }]);

  const addStep = (si: number) =>
    setStages(prev => prev.map((s, i) => i === si
      ? { ...s, steps: [...s.steps, { name: `Step ${s.steps.length + 1}`, type: 'script' }] }
      : s,
    ));

  const deleteStep = (stepIdx: number, stageIdx: number) =>
    setStages(prev => prev.map((s, i) => i === stageIdx
      ? { ...s, steps: s.steps.filter((_, si) => si !== stepIdx) }
      : s,
    ));

  const handleSave = async () => {
    setSaving(true); setErr('');
    try {
      await updateGroupPipelineDefinition(pipeline.group, pipeline.id, { stages });
      setSaveOk(true);
      onSaved();
      setTimeout(() => setSaveOk(false), 2500);
    } catch (e: any) {
      setErr(e.response?.data?.detail || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '.95rem', color: t.textPrimary }}>
          Visual Stage Builder
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={addStage}
            sx={{ fontFamily: FONT, textTransform: 'none', borderColor: t.border, color: t.textPrimary }}>
            Add Stage
          </Button>
          <Button size="small" variant="contained" startIcon={saving ? <CircularProgress size={12} sx={{ color: '#fff' }} /> : <SaveIcon />}
            onClick={handleSave} disabled={saving}
            sx={{ fontFamily: FONT, textTransform: 'none', bgcolor: BP, fontWeight: 700 }}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </Stack>
      </Box>
      {saveOk && <Alert severity="success" sx={{ mb: 1.5, fontFamily: FONT }}>Saved successfully.</Alert>}
      {err && <Alert severity="error" sx={{ mb: 1.5, fontFamily: FONT }}>{err}</Alert>}

      {stages.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8, color: t.textSecondary }}>
          <TimelineIcon sx={{ fontSize: '2.5rem', mb: 1, opacity: 0.4 }} />
          <Typography sx={{ fontFamily: FONT, fontSize: '.9rem', mb: 2 }}>No stages defined yet.</Typography>
          <Button variant="outlined" startIcon={<AddIcon />} onClick={addStage}
            sx={{ fontFamily: FONT, textTransform: 'none', borderColor: t.border, color: t.textPrimary }}>
            Add First Stage
          </Button>
        </Box>
      ) : (
        <>
          {/* Pipeline flow header */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 2, overflowX: 'auto', pb: 0.5 }}>
            {stages.map((s, i) => (
              <React.Fragment key={i}>
                <Chip
                  label={s.name || `Stage ${i + 1}`}
                  size="small"
                  sx={{
                    fontFamily: FONT, fontSize: '.7rem', fontWeight: 700,
                    bgcolor: `${BP}18`, color: BP, border: `1px solid ${BP}44`,
                    whiteSpace: 'nowrap',
                  }}
                />
                {i < stages.length - 1 && (
                  <KeyboardArrowRightIcon sx={{ fontSize: '1rem', color: t.textSecondary, flexShrink: 0 }} />
                )}
              </React.Fragment>
            ))}
          </Box>

          {stages.map((stage, i) => (
            <StageCard
              key={i} stage={stage} index={i}
              onUpdate={updateStage}
              onDelete={deleteStage}
              onAddStep={addStep}
              onDeleteStep={deleteStep}
            />
          ))}
        </>
      )}
    </Box>
  );
}

/* ── Metrics Tab ── */
function MetricsTab({ pipeline, runs }: { pipeline: GroupPipeline; runs: GroupPipelineRun[] }) {
  const total    = runs.length;
  const success  = runs.filter(r => r.status === 'succeeded').length;
  const failed   = runs.filter(r => r.status === 'failed').length;
  const cancelled = runs.filter(r => r.status === 'cancelled').length;
  const running  = runs.filter(r => r.status === 'running').length;
  const durations = runs.filter(r => r.duration_s !== null).map(r => r.duration_s as number);
  const avgDur   = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
  const maxDur   = durations.length ? Math.max(...durations) : 0;
  const minDur   = durations.length ? Math.min(...durations) : 0;

  const cards = [
    { label: 'Total Runs',      value: total,                        color: BP },
    { label: 'Succeeded',       value: success,                      color: sc.success },
    { label: 'Failed',          value: failed,                       color: sc.danger },
    { label: 'Cancelled',       value: cancelled,                    color: t.textSecondary },
    { label: 'Currently Running', value: running,                    color: sc.info },
    { label: 'Success Rate',    value: `${((success / (total || 1)) * 100).toFixed(1)}%`, color: sc.success },
    { label: 'Avg Duration',    value: fmtDuration(avgDur),          color: BP },
    { label: 'Min Duration',    value: fmtDuration(minDur),          color: sc.info },
    { label: 'Max Duration',    value: fmtDuration(maxDur),          color: sc.warning },
    { label: 'Lifetime Avg',    value: fmtDuration(pipeline.avg_duration_s), color: BP },
  ];

  return (
    <Box>
      <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '.95rem', color: t.textPrimary, mb: 2 }}>
        Performance Metrics
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 2, mb: 3 }}>
        {cards.map(({ label, value, color }) => (
          <Paper key={label} elevation={0} sx={{
            p: 2, border: `1px solid ${t.border}`, borderRadius: 2, bgcolor: t.surface, textAlign: 'center',
          }}>
            <Typography sx={{ fontFamily: FONT, fontSize: '.74rem', color: t.textSecondary }}>{label}</Typography>
            <Typography sx={{ fontFamily: FONT, fontSize: '1.5rem', fontWeight: 800, color, mt: 0.5 }}>{value}</Typography>
          </Paper>
        ))}
      </Box>

      {/* Recent run status distribution bar */}
      {total > 0 && (
        <Box mb={3}>
          <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '.8rem', color: t.textSecondary, mb: 1 }}>
            RUN STATUS DISTRIBUTION (LAST {total})
          </Typography>
          <Box sx={{ display: 'flex', height: 12, borderRadius: 2, overflow: 'hidden', gap: 0.25 }}>
            {success > 0    && <Box sx={{ flex: success,    bgcolor: sc.success }} />}
            {failed > 0     && <Box sx={{ flex: failed,     bgcolor: sc.danger }} />}
            {cancelled > 0  && <Box sx={{ flex: cancelled,  bgcolor: t.textSecondary }} />}
            {running > 0    && <Box sx={{ flex: running,    bgcolor: sc.info }} />}
          </Box>
          <Stack direction="row" spacing={2} mt={1.5}>
            {[
              { label: 'Succeeded', count: success,  color: sc.success },
              { label: 'Failed',    count: failed,   color: sc.danger },
              { label: 'Cancelled', count: cancelled, color: t.textSecondary },
              { label: 'Running',   count: running,  color: sc.info },
            ].filter(x => x.count > 0).map(x => (
              <Box key={x.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: x.color }} />
                <Typography sx={{ fontFamily: FONT, fontSize: '.74rem', color: t.textSecondary }}>
                  {x.label} ({x.count})
                </Typography>
              </Box>
            ))}
          </Stack>
        </Box>
      )}
    </Box>
  );
}

/* ── Settings Tab ── */
function SettingsTab({
  pipeline, onUpdated, onDeleted,
}: {
  pipeline: GroupPipeline;
  onUpdated: () => void;
  onDeleted: () => void;
}) {
  const [name, setName] = useState(pipeline.name);
  const [desc, setDesc] = useState(pipeline.description);
  const [status, setStatus_] = useState(pipeline.status);
  const [saving, setSaving] = useState(false);
  const [err, setErr]   = useState('');
  const [saveOk, setSaveOk] = useState(false);
  const [delConfirm, setDelConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async () => {
    setSaving(true); setErr('');
    try {
      await updateGroupPipeline(pipeline.group, pipeline.id, { name, description: desc, status: status as any });
      setSaveOk(true);
      onUpdated();
      setTimeout(() => setSaveOk(false), 2500);
    } catch (e: any) {
      setErr(e.response?.data?.detail || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteGroupPipeline(pipeline.group, pipeline.id);
      onDeleted();
    } catch (e: any) {
      setErr(e.response?.data?.detail || 'Delete failed');
      setDeleting(false);
    }
  };

  return (
    <Box maxWidth={560}>
      <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '.95rem', color: t.textPrimary, mb: 2 }}>
        Pipeline Settings
      </Typography>
      {saveOk && <Alert severity="success" sx={{ mb: 2, fontFamily: FONT }}>Settings saved.</Alert>}
      {err && <Alert severity="error" sx={{ mb: 2, fontFamily: FONT }}>{err}</Alert>}

      <Stack spacing={2} mb={3}>
        <TextField label="Name" value={name} onChange={e => setName(e.target.value)} fullWidth size="small"
          InputLabelProps={{ sx: { fontFamily: FONT } }} InputProps={{ sx: { fontFamily: FONT } }}
          sx={{ '& .MuiOutlinedInput-root fieldset': { borderColor: t.border } }} />
        <TextField label="Description" value={desc} onChange={e => setDesc(e.target.value)} fullWidth size="small"
          multiline minRows={3}
          InputLabelProps={{ sx: { fontFamily: FONT } }} InputProps={{ sx: { fontFamily: FONT } }}
          sx={{ '& .MuiOutlinedInput-root fieldset': { borderColor: t.border } }} />
        <TextField
          select label="Status" value={status}
          onChange={e => { const v = e.target.value as GroupPipelineStatus; setStatus_(v); }}
          fullWidth size="small"
          SelectProps={{ native: true }}
          InputLabelProps={{ sx: { fontFamily: FONT } }}
          InputProps={{ sx: { fontFamily: FONT } }}
          sx={{ '& .MuiOutlinedInput-root fieldset': { borderColor: t.border } }}
        >
          {['draft', 'active', 'disabled', 'archived'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </TextField>
      </Stack>

      <Button variant="contained" onClick={handleSave} disabled={saving} startIcon={saving ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <SaveIcon />}
        sx={{ fontFamily: FONT, textTransform: 'none', bgcolor: BP, fontWeight: 700, mb: 4 }}>
        {saving ? 'Saving…' : 'Save Settings'}
      </Button>

      <Divider sx={{ borderColor: t.border, mb: 3 }} />

      <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '.9rem', color: sc.danger, mb: 1 }}>
        Danger Zone
      </Typography>
      {!delConfirm ? (
        <Button variant="outlined" startIcon={<DeleteIcon />} onClick={() => setDelConfirm(true)}
          sx={{ fontFamily: FONT, textTransform: 'none', borderColor: sc.danger, color: sc.danger }}>
          Delete Pipeline
        </Button>
      ) : (
        <Box sx={{ border: `1px solid ${sc.danger}44`, borderRadius: 2, p: 2, bgcolor: `${sc.danger}08` }}>
          <Typography sx={{ fontFamily: FONT, fontSize: '.85rem', color: t.textPrimary, mb: 2 }}>
            Are you sure? This will permanently delete{' '}
            <strong>{pipeline.name}</strong> and all its run history.
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button variant="contained" onClick={handleDelete} disabled={deleting}
              sx={{ fontFamily: FONT, textTransform: 'none', bgcolor: sc.danger, fontWeight: 700 }}>
              {deleting ? 'Deleting…' : 'Yes, Delete'}
            </Button>
            <Button variant="outlined" onClick={() => setDelConfirm(false)}
              sx={{ fontFamily: FONT, textTransform: 'none', borderColor: t.border }}>
              Cancel
            </Button>
          </Stack>
        </Box>
      )}
    </Box>
  );
}

/* ═════════════════════════════════════════════════════════════════════════════
   Main Page
   ═════════════════════════════════════════════════════════════════════════════ */

type TabId = 'overview' | 'runs' | 'definition' | 'stages' | 'metrics' | 'settings';

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview',    label: 'Overview' },
  { id: 'runs',        label: 'Runs' },
  { id: 'definition',  label: 'Definition' },
  { id: 'stages',      label: 'Stages & Steps' },
  { id: 'metrics',     label: 'Metrics' },
  { id: 'settings',    label: 'Settings' },
];

export default function GroupPipelineDetailPage() {
  const { groupId, pipelineId } = useParams<{ groupId: string; pipelineId: string }>();
  const navigate = useNavigate();

  const [pipeline, setPipeline] = useState<GroupPipeline | null>(null);
  const [runs, setRuns] = useState<GroupPipelineRun[]>([]);
  const [loadingPipeline, setLoadingPipeline] = useState(true);
  const [loadingRuns, setLoadingRuns] = useState(false);
  const [pipelineError, setPipelineError] = useState('');
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [triggerMsg, setTriggerMsg] = useState('');

  const fetchPipeline = useCallback(async () => {
    if (!groupId || !pipelineId) return;
    setLoadingPipeline(true);
    try {
      const p = await getGroupPipeline(groupId, pipelineId);
      setPipeline(p);
    } catch {
      setPipelineError('Pipeline not found or access denied.');
    } finally {
      setLoadingPipeline(false);
    }
  }, [groupId, pipelineId]);

  const fetchRuns = useCallback(async () => {
    if (!groupId || !pipelineId) return;
    setLoadingRuns(true);
    try {
      const r = await listGroupPipelineRuns(groupId, pipelineId);
      setRuns(r);
    } catch {
      /* silent */
    } finally {
      setLoadingRuns(false);
    }
  }, [groupId, pipelineId]);

  useEffect(() => { fetchPipeline(); }, [fetchPipeline]);
  useEffect(() => {
    if (activeTab === 'runs' || activeTab === 'metrics') fetchRuns();
  }, [activeTab, fetchRuns]);

  const handleTrigger = async () => {
    if (!groupId || !pipelineId) return;
    try {
      await triggerGroupPipelineRun(groupId, pipelineId);
      setTriggerMsg('Run triggered successfully.');
      setTimeout(() => setTriggerMsg(''), 3000);
      if (activeTab === 'runs') fetchRuns();
    } catch (e: any) {
      setTriggerMsg('Trigger failed: ' + (e.response?.data?.detail || 'Unknown error'));
      setTimeout(() => setTriggerMsg(''), 4000);
    }
  };

  const handleCancelRun = async (runId: string) => {
    if (!groupId || !pipelineId) return;
    await cancelGroupPipelineRun(groupId, pipelineId, runId);
    fetchRuns();
  };

  const handleRollbackRun = async (runId: string) => {
    if (!groupId || !pipelineId) return;
    await rollbackGroupPipelineRun(groupId, pipelineId, runId);
    fetchRuns();
  };

  /* ── Loading ── */
  if (loadingPipeline) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: t.background }}>
        <CircularProgress />
      </Box>
    );
  }

  if (pipelineError || !pipeline) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: t.background, p: 3 }}>
        <Alert severity="error" sx={{ fontFamily: FONT, mb: 2 }}>{pipelineError || 'Pipeline not found.'}</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(`/groups/${groupId}/pipelines`)}
          sx={{ fontFamily: FONT, textTransform: 'none', color: BP }}>
          Back to Pipelines
        </Button>
      </Box>
    );
  }

  /* ── Pipeline type label & color ── */
  const typeMap: Record<string, string> = {
    ci: 'CI', cd: 'CD', ci_cd: 'CI / CD', build: 'Build',
    deploy: 'Deploy', release: 'Release', rollback: 'Rollback',
    scheduled: 'Scheduled', custom: 'Custom',
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: t.background }}>
      {/* ── Top navigation bar ── */}
      <Box sx={{
        position: 'sticky', top: 0, zIndex: 10,
        bgcolor: t.surface, borderBottom: `1px solid ${t.border}`,
        px: 3, py: 1.5,
        display: 'flex', alignItems: 'center', gap: 2,
      }}>
        <IconButton size="small" onClick={() => navigate(`/groups/${groupId}/pipelines`)}>
          <ArrowBackIcon sx={{ fontSize: '1.1rem', color: t.textSecondary }} />
        </IconButton>
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: `${BP}22`, color: BP }}>
            <PlayCircleOutlineIcon sx={{ fontSize: '1.1rem' }} />
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{
              fontFamily: FONT, fontWeight: 800, fontSize: '1rem', color: t.textPrimary,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {pipeline.name}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography sx={{ fontFamily: FONT, fontSize: '.75rem', color: t.textSecondary }}>
                {pipeline.slug}
              </Typography>
              <StatusChip status={pipeline.status} />
              <Chip label={typeMap[pipeline.pipeline_type] ?? pipeline.pipeline_type} size="small"
                sx={{ fontFamily: FONT, fontSize: '.68rem', bgcolor: `${BP}14`, color: BP, height: 20 }} />
            </Stack>
          </Box>
        </Box>
        <Button variant="contained" size="small" startIcon={<PlayArrowIcon />} onClick={handleTrigger}
          sx={{ fontFamily: FONT, textTransform: 'none', bgcolor: BP, fontWeight: 700, flexShrink: 0 }}>
          Trigger Run
        </Button>
      </Box>

      {/* ── Tabs ── */}
      <Box sx={{ bgcolor: t.surface, borderBottom: `1px solid ${t.border}`, px: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v as TabId)}
          TabIndicatorProps={{ style: { backgroundColor: BP } }}
          sx={{ minHeight: 40 }}
        >
          {TABS.map(tab => (
            <Tab key={tab.id} value={tab.id} label={tab.label}
              sx={{
                fontFamily: FONT, textTransform: 'none', fontSize: '.85rem',
                minHeight: 40, py: 0, fontWeight: activeTab === tab.id ? 700 : 400,
                color: activeTab === tab.id ? BP : t.textSecondary,
              }}
            />
          ))}
        </Tabs>
      </Box>

      {/* ── Tab content ── */}
      <Box sx={{ maxWidth: 1100, mx: 'auto', px: 3, py: 3 }}>
        {triggerMsg && (
          <Alert
            severity={triggerMsg.startsWith('Trigger failed') ? 'error' : 'success'}
            sx={{ mb: 2, fontFamily: FONT }}
            onClose={() => setTriggerMsg('')}
          >
            {triggerMsg}
          </Alert>
        )}

        {activeTab === 'overview' && (
          <OverviewTab pipeline={pipeline} onTrigger={handleTrigger} />
        )}
        {activeTab === 'runs' && (
          <RunsTab
            runs={runs} loading={loadingRuns}
            onCancel={handleCancelRun}
            onRollback={handleRollbackRun}
            onRefresh={fetchRuns}
          />
        )}
        {activeTab === 'definition' && (
          <DefinitionTab pipeline={pipeline} onSaved={yaml => setPipeline(p => p ? { ...p, yaml_content: yaml } : p)} />
        )}
        {activeTab === 'stages' && (
          <StagesTab pipeline={pipeline} onSaved={fetchPipeline} />
        )}
        {activeTab === 'metrics' && (
          <MetricsTab pipeline={pipeline} runs={runs} />
        )}
        {activeTab === 'settings' && (
          <SettingsTab
            pipeline={pipeline}
            onUpdated={fetchPipeline}
            onDeleted={() => navigate(`/groups/${groupId}/pipelines`)}
          />
        )}
      </Box>
    </Box>
  );
}
