/**
 * GroupPipelinesPanel
 * ─────────────────────────────────────────────────────────────────────────────
 * Rendered inside GroupDashboardPage when the "pipelines" sidebar section
 * is active.  Shows all GroupPipeline definitions owned by the group with
 * quick-run, status, metrics, and a create-new flow.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog,
  DialogActions, DialogContent, DialogTitle, FormControl,
  IconButton, InputLabel, MenuItem, Select, Stack,
  TextField, Tooltip, Typography,
} from '@mui/material';
import AddIcon            from '@mui/icons-material/Add';
import PlayArrowIcon      from '@mui/icons-material/PlayArrow';
import EditIcon           from '@mui/icons-material/Edit';
import DeleteIcon         from '@mui/icons-material/Delete';
import OpenInNewIcon      from '@mui/icons-material/OpenInNew';
import CheckCircleIcon    from '@mui/icons-material/CheckCircle';
import ErrorIcon          from '@mui/icons-material/Error';
import AccessTimeIcon     from '@mui/icons-material/AccessTime';
import TrendingUpIcon     from '@mui/icons-material/TrendingUp';
import RefreshIcon        from '@mui/icons-material/Refresh';
import { useNavigate }    from 'react-router-dom';
import {
  dashboardCardSx, dashboardPrimaryButtonSx,
  dashboardSemanticColors, dashboardTokens,
} from '../../styles/dashboardDesignSystem';
import {
  listGroupPipelines, createGroupPipeline, deleteGroupPipeline,
  triggerGroupPipelineRun,
  type GroupPipeline, type PipelineType, type PipelineStatus,
} from '../../services/groupsApi';
import { useGroupPermissions } from '../../hooks/useGroupPermissions';

const FONT = '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const t    = dashboardTokens.colors;
const sc   = dashboardSemanticColors;

// ── Status helpers ────────────────────────────────────────────────────────────

const RUN_STATUS_COLOR: Record<string, string> = {
  succeeded: sc.success,
  success:   sc.success,
  failed:    sc.danger,
  running:   t.brandPrimary,
  queued:    '#6b7280',
  cancelled: '#6b7280',
  pending:   '#d97706',
  rolled_back: '#6b7280',
};

const PIPELINE_TYPE_LABELS: Record<PipelineType, string> = {
  ci:        'CI',
  cd:        'CD',
  ci_cd:     'CI/CD',
  build:     'Build',
  deploy:    'Deploy',
  release:   'Release',
  rollback:  'Rollback',
  scheduled: 'Scheduled',
  custom:    'Custom',
};

const STATUS_LABEL: Record<PipelineStatus, string> = {
  active:   'Active',
  disabled: 'Disabled',
  archived: 'Archived',
  draft:    'Draft',
};

function fmtDuration(s: number | null): string {
  if (!s) return '—';
  if (s < 60) return `${s.toFixed(0)}s`;
  return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ── Pipeline card ─────────────────────────────────────────────────────────────

interface PipelineCardProps {
  pipeline:    GroupPipeline;
  groupId:     string;
  canRun:      boolean;
  canEdit:     boolean;
  canDelete:   boolean;
  onRun:       (pipeline: GroupPipeline) => void;
  onDelete:    (pipeline: GroupPipeline) => void;
}

const PipelineCard: React.FC<PipelineCardProps> = ({
  pipeline, groupId, canRun, canEdit: _canEdit, canDelete, onRun, onDelete,
}) => {
  const navigate = useNavigate();
  const BP = t.brandPrimary;
  const lastStatus = pipeline.last_run?.status ?? pipeline.last_run_status;
  const statusColor = lastStatus ? (RUN_STATUS_COLOR[lastStatus] ?? '#6b7280') : '#6b7280';

  return (
    <Box sx={{
      ...dashboardCardSx,
      p: 2, display: 'flex', flexDirection: 'column', gap: 1.25,
      transition: 'border-color .15s',
      '&:hover': { borderColor: `${BP}66` },
    }}>
      {/* Header row */}
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
            <Typography
              sx={{
                fontFamily: FONT, fontWeight: 700, fontSize: '.95rem',
                color: t.textPrimary, cursor: 'pointer',
                '&:hover': { color: BP, textDecoration: 'underline' },
              }}
              onClick={() => navigate(`/groups/${groupId}/pipelines/${pipeline.id}`)}
            >
              {pipeline.name}
            </Typography>
            <Chip label={PIPELINE_TYPE_LABELS[pipeline.pipeline_type]} size="small"
              sx={{ fontFamily: FONT, fontSize: '.68rem', bgcolor: `${BP}18`, color: BP, border: `1px solid ${BP}33`, height: 18 }} />
            <Chip label={STATUS_LABEL[pipeline.status]} size="small"
              sx={{
                fontFamily: FONT, fontSize: '.68rem', height: 18,
                bgcolor: pipeline.status === 'active' ? `${sc.success}18` : '#6b728018',
                color: pipeline.status === 'active' ? sc.success : '#6b7280',
                border: `1px solid ${pipeline.status === 'active' ? sc.success : '#6b7280'}44`,
              }} />
          </Stack>
          <Typography sx={{ fontFamily: FONT, fontSize: '.78rem', color: t.textSecondary, mt: 0.25 }}>
            /{pipeline.slug}
            {pipeline.project_name && ` · ${pipeline.project_name}`}
          </Typography>
          {pipeline.description && (
            <Typography sx={{ fontFamily: FONT, fontSize: '.8rem', color: t.textSecondary, mt: 0.5, lineHeight: 1.4 }}>
              {pipeline.description}
            </Typography>
          )}
        </Box>

        {/* Action buttons */}
        <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
          {canRun && pipeline.status === 'active' && (
            <Tooltip title="Trigger run">
              <IconButton size="small" onClick={() => onRun(pipeline)}
                sx={{ bgcolor: `${sc.success}18`, color: sc.success, '&:hover': { bgcolor: `${sc.success}30` } }}>
                <PlayArrowIcon sx={{ fontSize: '1rem' }} />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Open pipeline page">
            <IconButton size="small" onClick={() => navigate(`/groups/${groupId}/pipelines/${pipeline.id}`)}
              sx={{ bgcolor: `${BP}18`, color: BP, '&:hover': { bgcolor: `${BP}30` } }}>
              <OpenInNewIcon sx={{ fontSize: '1rem' }} />
            </IconButton>
          </Tooltip>
          {canDelete && (
            <Tooltip title="Delete pipeline">
              <IconButton size="small" onClick={() => onDelete(pipeline)}
                sx={{ color: t.textSecondary, '&:hover': { color: sc.danger, bgcolor: `${sc.danger}18` } }}>
                <DeleteIcon sx={{ fontSize: '1rem' }} />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      </Stack>

      {/* Stats row */}
      <Stack direction="row" spacing={2} flexWrap="wrap">
        {/* Last run status */}
        <Stack direction="row" spacing={0.5} alignItems="center">
          {lastStatus === 'succeeded' || lastStatus === 'success'
            ? <CheckCircleIcon sx={{ fontSize: '0.9rem', color: sc.success }} />
            : lastStatus === 'failed'
              ? <ErrorIcon sx={{ fontSize: '0.9rem', color: sc.danger }} />
              : <AccessTimeIcon sx={{ fontSize: '0.9rem', color: '#6b7280' }} />
          }
          <Typography sx={{ fontFamily: FONT, fontSize: '.75rem', color: statusColor, fontWeight: 600, textTransform: 'capitalize' }}>
            {lastStatus || 'No runs'}
          </Typography>
        </Stack>

        {pipeline.last_run_at && (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <AccessTimeIcon sx={{ fontSize: '0.85rem', color: t.textSecondary }} />
            <Typography sx={{ fontFamily: FONT, fontSize: '.75rem', color: t.textSecondary }}>
              {fmtDate(pipeline.last_run_at)}
            </Typography>
          </Stack>
        )}

        <Stack direction="row" spacing={0.5} alignItems="center">
          <TrendingUpIcon sx={{ fontSize: '0.85rem', color: t.textSecondary }} />
          <Typography sx={{ fontFamily: FONT, fontSize: '.75rem', color: t.textSecondary }}>
            {pipeline.success_rate.toFixed(0)}% success · {pipeline.run_count} runs
          </Typography>
        </Stack>

        {pipeline.avg_duration_s > 0 && (
          <Typography sx={{ fontFamily: FONT, fontSize: '.75rem', color: t.textSecondary }}>
            avg {fmtDuration(pipeline.avg_duration_s)}
          </Typography>
        )}
      </Stack>

      {/* Environment targets */}
      {pipeline.environment_targets.length > 0 && (
        <Stack direction="row" spacing={0.5} flexWrap="wrap">
          {pipeline.environment_targets.map((env) => (
            <Chip key={env} label={env} size="small"
              sx={{ fontFamily: FONT, fontSize: '.68rem', height: 18,
                bgcolor: `${t.brandPrimary}10`, color: t.brandPrimary, border: `1px solid ${t.brandPrimary}33` }} />
          ))}
        </Stack>
      )}

      {/* Tags */}
      {pipeline.tags.length > 0 && (
        <Stack direction="row" spacing={0.5} flexWrap="wrap">
          {pipeline.tags.map((tag) => (
            <Chip key={tag} label={`#${tag}`} size="small"
              sx={{ fontFamily: FONT, fontSize: '.65rem', height: 16, bgcolor: t.border + '44', color: t.textSecondary }} />
          ))}
        </Stack>
      )}
    </Box>
  );
};

// ── Create dialog ─────────────────────────────────────────────────────────────

interface CreateDialogProps {
  open:     boolean;
  groupId:  string;
  onClose:  () => void;
  onCreated: (p: GroupPipeline) => void;
}

const CreatePipelineDialog: React.FC<CreateDialogProps> = ({ open, groupId, onClose, onCreated }) => {
  const [name, setName]               = useState('');
  const [slug, setSlug]               = useState('');
  const [description, setDescription] = useState('');
  const [type, setType]               = useState<PipelineType>('ci_cd');
  const [tags, setTags]               = useState('');
  const [busy, setBusy]               = useState(false);
  const [error, setError]             = useState('');

  const handleSlugify = (v: string) => {
    setName(v);
    setSlug(v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
  };

  const handleCreate = async () => {
    if (!name.trim() || !slug.trim()) { setError('Name and slug are required.'); return; }
    setBusy(true); setError('');
    try {
      const pipeline = await createGroupPipeline(groupId, {
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim(),
        pipeline_type: type,
        status: 'draft',
        tags: tags.split(',').map(s => s.trim()).filter(Boolean),
        definition: { stages: [], variables: {} },
      });
      onCreated(pipeline);
      setName(''); setSlug(''); setDescription(''); setType('ci_cd'); setTags('');
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to create pipeline.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { bgcolor: t.surface, border: `1px solid ${t.border}`, borderRadius: 2 } }}>
      <DialogTitle sx={{ fontFamily: FONT, fontWeight: 700, color: t.textPrimary, pb: 1 }}>
        New Pipeline
      </DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2, fontFamily: FONT }}>{error}</Alert>}
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <TextField label="Pipeline name" value={name} onChange={(e) => handleSlugify(e.target.value)}
            fullWidth size="small" required
            InputProps={{ style: { fontFamily: FONT } }}
            InputLabelProps={{ style: { fontFamily: FONT } }} />
          <TextField label="Slug (URL identifier)" value={slug} onChange={(e) => setSlug(e.target.value)}
            fullWidth size="small" required helperText="e.g. build-and-deploy"
            InputProps={{ style: { fontFamily: FONT } }}
            InputLabelProps={{ style: { fontFamily: FONT } }} />
          <TextField label="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)}
            fullWidth size="small" multiline rows={2}
            InputProps={{ style: { fontFamily: FONT } }}
            InputLabelProps={{ style: { fontFamily: FONT } }} />
          <FormControl size="small" fullWidth>
            <InputLabel sx={{ fontFamily: FONT }}>Type</InputLabel>
            <Select value={type} onChange={(e) => setType(e.target.value as PipelineType)} label="Type"
              sx={{ fontFamily: FONT }}>
              {(Object.entries(PIPELINE_TYPE_LABELS) as [PipelineType, string][]).map(([v, l]) => (
                <MenuItem key={v} value={v} sx={{ fontFamily: FONT }}>{l}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField label="Tags (comma-separated)" value={tags} onChange={(e) => setTags(e.target.value)}
            fullWidth size="small" placeholder="deploy, production, release"
            InputProps={{ style: { fontFamily: FONT } }}
            InputLabelProps={{ style: { fontFamily: FONT } }} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ fontFamily: FONT, textTransform: 'none', color: t.textSecondary }}>Cancel</Button>
        <Button variant="contained" onClick={handleCreate} disabled={busy}
          sx={{ ...dashboardPrimaryButtonSx, fontFamily: FONT, textTransform: 'none' }}>
          {busy ? <CircularProgress size={16} color="inherit" /> : 'Create Pipeline'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ── Main export ───────────────────────────────────────────────────────────────

interface GroupPipelinesPanelProps {
  groupId: string;
}

const GroupPipelinesPanel: React.FC<GroupPipelinesPanelProps> = ({ groupId }) => {
  const { can } = useGroupPermissions(groupId);

  const [pipelines, setPipelines]   = useState<GroupPipeline[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [runBusy, setRunBusy]       = useState<string | null>(null);
  const [snack, setSnack]           = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await listGroupPipelines(groupId);
      setPipelines(data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to load pipelines.');
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => { load(); }, [load]);

  const handleRun = async (pipeline: GroupPipeline) => {
    setRunBusy(pipeline.id);
    try {
      await triggerGroupPipelineRun(groupId, pipeline.id);
      setSnack(`Run triggered for "${pipeline.name}"`);
      load();
    } catch (err: any) {
      setSnack(err?.response?.data?.detail || 'Failed to trigger run.');
    } finally {
      setRunBusy(null);
    }
  };

  const handleDelete = async (pipeline: GroupPipeline) => {
    if (!window.confirm(`Delete pipeline "${pipeline.name}"? This cannot be undone.`)) return;
    try {
      await deleteGroupPipeline(groupId, pipeline.id);
      setPipelines(prev => prev.filter(p => p.id !== pipeline.id));
    } catch (err: any) {
      setSnack(err?.response?.data?.detail || 'Failed to delete pipeline.');
    }
  };

  // ── render ──────────────────────────────────────────────────────────────────

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '1rem', color: t.textPrimary }}>
          CI/CD Pipelines
          {pipelines.length > 0 && (
            <Typography component="span" sx={{ fontFamily: FONT, fontSize: '.8rem', color: t.textSecondary, ml: 1 }}>
              {pipelines.length} pipeline{pipelines.length !== 1 ? 's' : ''}
            </Typography>
          )}
        </Typography>
        <Stack direction="row" spacing={1}>
          <IconButton size="small" onClick={load} sx={{ color: t.textSecondary }}>
            <RefreshIcon sx={{ fontSize: '1rem' }} />
          </IconButton>
          {can('pipeline.create') && (
            <Button size="small" variant="contained" startIcon={<AddIcon />}
              onClick={() => setCreateOpen(true)}
              sx={{ ...dashboardPrimaryButtonSx, fontFamily: FONT, textTransform: 'none', fontSize: '.8rem' }}>
              New Pipeline
            </Button>
          )}
        </Stack>
      </Stack>

      {/* Feedback */}
      {snack && (
        <Alert severity="info" onClose={() => setSnack('')} sx={{ mb: 2, fontFamily: FONT }}>{snack}</Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2, fontFamily: FONT }}>{error}</Alert>
      )}

      {/* Loading */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={28} sx={{ color: t.brandPrimary }} />
        </Box>
      )}

      {/* Pipeline list */}
      {!loading && pipelines.length === 0 && (
        <Box sx={{ ...dashboardCardSx, p: 4, textAlign: 'center' }}>
          <PlayArrowIcon sx={{ fontSize: '3rem', color: t.textSecondary, opacity: .4, mb: 1 }} />
          <Typography sx={{ fontFamily: FONT, fontWeight: 700, color: t.textPrimary, mb: 0.5 }}>
            No pipelines yet
          </Typography>
          <Typography sx={{ fontFamily: FONT, fontSize: '.85rem', color: t.textSecondary, mb: 2 }}>
            Create your first CI/CD pipeline to get started.
          </Typography>
          {can('pipeline.create') && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}
              sx={{ ...dashboardPrimaryButtonSx, fontFamily: FONT, textTransform: 'none' }}>
              New Pipeline
            </Button>
          )}
        </Box>
      )}

      {!loading && pipelines.length > 0 && (
        <Stack spacing={1.5}>
          {pipelines.map((pipeline) => (
            <Box key={pipeline.id} sx={{ position: 'relative' }}>
              {runBusy === pipeline.id && (
                <Box sx={{ position: 'absolute', inset: 0, bgcolor: `${t.surface}cc`, zIndex: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 1.5 }}>
                  <CircularProgress size={24} sx={{ color: t.brandPrimary }} />
                </Box>
              )}
              <PipelineCard
                pipeline={pipeline}
                groupId={groupId}
                canRun={can('pipeline.run')}
                canEdit={can('pipeline.edit')}
                canDelete={can('pipeline.delete')}
                onRun={handleRun}
                onDelete={handleDelete}
              />
            </Box>
          ))}
        </Stack>
      )}

      {/* Create dialog */}
      <CreatePipelineDialog
        open={createOpen}
        groupId={groupId}
        onClose={() => setCreateOpen(false)}
        onCreated={(p) => { setPipelines(prev => [p, ...prev]); setSnack(`Pipeline "${p.name}" created.`); }}
      />
    </Box>
  );
};

export default GroupPipelinesPanel;
