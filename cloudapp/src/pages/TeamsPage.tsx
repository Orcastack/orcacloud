// OrcaCloud — Teams Page (list + Create wizard)
import React, { useCallback, useEffect, useState } from 'react';
import {
  Box, Typography, Button, Card, CardContent, Chip, Stack, Grid,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField,
  Stepper, Step, StepLabel, CircularProgress, Alert,
  Divider, Avatar, Tooltip, IconButton, ToggleButtonGroup, ToggleButton,
  FormControlLabel, Switch, LinearProgress,
} from '@mui/material';
import AddIcon          from '@mui/icons-material/Add';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon    from '@mui/icons-material/ArrowBack';
import GroupsIcon       from '@mui/icons-material/Groups';
import CheckCircleIcon  from '@mui/icons-material/CheckCircle';
import RefreshIcon      from '@mui/icons-material/Refresh';
import OpenInNewIcon    from '@mui/icons-material/OpenInNew';
import { useNavigate } from 'react-router-dom';
import { teamApi }                from '../services/cloudApi';
import { dashboardTokens, dashboardSemanticColors, dashboardPrimaryButtonSx } from '../styles/dashboardDesignSystem';
import type { TeamSummary, TeamType } from '../types/teams';
import { TEAM_TYPE_LABELS, TEAM_TYPE_COLORS, ROLE_COLORS } from '../types/teams';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const t = dashboardTokens.colors;

function TeamTypeChip({ type }: { type: TeamType }) {
  const color = TEAM_TYPE_COLORS[type];
  return (
    <Chip
      label={TEAM_TYPE_LABELS[type]}
      size="small"
      sx={{
        bgcolor: `${color}22`, color, fontWeight: 700,
        fontSize: '.65rem', letterSpacing: '.04em',
        border: `1px solid ${color}44`,
      }}
    />
  );
}

function RoleChip({ role }: { role: string }) {
  const color = ROLE_COLORS[role as keyof typeof ROLE_COLORS] ?? '#6B7280';
  return (
    <Chip label={role} size="small"
      sx={{ bgcolor: `${color}22`, color, fontWeight: 700, fontSize: '.6rem', border: `1px solid ${color}44` }}
    />
  );
}

// ─── Team Card ────────────────────────────────────────────────────────────────

function TeamCard({ team, onOpen }: { team: TeamSummary; onOpen: (id: string) => void }) {
  const initials = team.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  return (
    <Card
      onClick={() => onOpen(team.team_id)}
      sx={{
        bgcolor: t.surface, border: `1px solid ${t.border}`,
        borderRadius: '4px', boxShadow: 'none', cursor: 'pointer',
        transition: 'border-color .15s, box-shadow .15s',
        '&:hover': { borderColor: t.brandPrimary, boxShadow: `0 0 0 1px ${t.brandPrimary}` },
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <Avatar sx={{ bgcolor: team.avatar_color, width: 40, height: 40, fontSize: '.9rem', fontWeight: 800, flexShrink: 0, borderRadius: '4px' }}>
            {initials}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
              <Typography sx={{ fontWeight: 700, fontSize: '.92rem', color: t.textPrimary }} noWrap>
                {team.name}
              </Typography>
              {team.my_role && <RoleChip role={team.my_role} />}
            </Stack>
            <Box sx={{ mt: 0.5 }}>
              <TeamTypeChip type={team.team_type} />
            </Box>
            {team.description && (
              <Typography sx={{ mt: 0.75, fontSize: '.78rem', color: t.textSecondary, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {team.description}
              </Typography>
            )}
            <Stack direction="row" spacing={2} sx={{ mt: 1.25 }}>
              <Typography sx={{ fontSize: '.72rem', color: t.textTertiary }}>
                <strong style={{ color: t.textSecondary }}>{team.member_count}</strong> member{team.member_count !== 1 ? 's' : ''}
              </Typography>
              <Typography sx={{ fontSize: '.72rem', color: t.textTertiary }}>
                Owner: <strong style={{ color: t.textSecondary }}>{team.owner.full_name || team.owner.username}</strong>
              </Typography>
            </Stack>
          </Box>
          <Tooltip title="Open team">
            <IconButton size="small" sx={{ color: t.textTertiary, '&:hover': { color: t.brandPrimary }, flexShrink: 0, mt: -0.5 }}>
              <OpenInNewIcon sx={{ fontSize: '1rem' }} />
            </IconButton>
          </Tooltip>
        </Stack>
      </CardContent>
    </Card>
  );
}

// ─── Create Team Wizard ───────────────────────────────────────────────────────

const WIZARD_STEPS = ['Identity', 'Team Type', 'Permissions', 'Review'];

const TEAM_TYPE_OPTIONS: { value: TeamType; label: string; desc: string; color: string }[] = [
  { value: 'developer',  label: 'Developer Team',       desc: 'Build, deploy, and manage cloud applications, pipelines, and APIs.',           color: TEAM_TYPE_COLORS.developer },
  { value: 'production', label: 'Production / Ops',     desc: 'Maintain uptime, monitor systems, handle incidents, and manage SLOs.',        color: TEAM_TYPE_COLORS.production },
  { value: 'marketing',  label: 'Marketing Team',       desc: 'Manage campaigns, landing pages, analytics, and media assets.',               color: TEAM_TYPE_COLORS.marketing },
  { value: 'data',       label: 'Data / Science Team',  desc: 'Manage datasets, models, experiments, notebooks, and insights.',              color: TEAM_TYPE_COLORS.data },
  { value: 'custom',     label: 'Custom Team',          desc: 'Define your own purpose, resources, and permission scope.',                   color: TEAM_TYPE_COLORS.custom },
];

const AVATAR_COLORS = ['#153d75', '#A855F7', '#22C55E', '#F59E0B', '#EF4444', '#153d75', '#EC4899'];

interface WizardState {
  name: string;
  description: string;
  avatar_color: string;
  team_type: TeamType;
  apply_template: boolean;
}

const INITIAL_WIZARD: WizardState = {
  name: '', description: '', avatar_color: '#153d75',
  team_type: 'developer', apply_template: true,
};

/** Extract a human-readable message from any DRF error response */
function extractApiError(e: any): string {
  const data = e?.response?.data;
  if (!data) {
    if (e?.message) return `Network error: ${e.message}`;
    return 'Failed to create team. Please try again.';
  }
  if (typeof data === 'string') return data;
  if (data.detail) return data.detail;
  if (data.non_field_errors) return data.non_field_errors.join(' ');
  // Field-level errors: pick the first one
  const firstKey = Object.keys(data)[0];
  if (firstKey) {
    const msg = Array.isArray(data[firstKey]) ? data[firstKey][0] : data[firstKey];
    return `${firstKey}: ${msg}`;
  }
  return 'Failed to create team. Please try again.';
}

function CreateTeamWizard({ open, onClose, onCreated }: {
  open: boolean;
  onClose: () => void;
  onCreated: (team: TeamSummary) => void;
}) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [templates, setTemplates] = useState<Record<string, Record<string, boolean>>>({});
  const [form, setForm] = useState<WizardState>(INITIAL_WIZARD);

  useEffect(() => {
    if (open) {
      // Fetch permission templates if not yet loaded
      teamApi.permissionTemplates().then(r => setTemplates(r.data as any)).catch(() => {});
    } else {
      // Reset wizard fully on close
      setStep(0); setError(''); setSaving(false); setForm(INITIAL_WIZARD);
    }
  }, [open]);

  const set = (k: keyof WizardState) => (v: any) => setForm(p => ({ ...p, [k]: v }));

  const canNext = () => {
    if (step === 0) return form.name.trim().length >= 2;
    if (step === 1) return !!form.team_type;
    return true;
  };

  const handleCreate = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await teamApi.create({
        name: form.name.trim(),
        description: form.description.trim(),
        avatar_color: form.avatar_color,
        team_type: form.team_type,
        apply_template: form.apply_template,
      });
      onCreated(res.data as any);
      onClose();
    } catch (e: any) {
      console.error('[TeamCreate] error:', e?.response?.status, e?.response?.data, e?.message);
      setError(extractApiError(e));
      setSaving(false);
    }
  };

  const currentTemplate = templates[form.team_type] || {};

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { bgcolor: t.surface, border: `1px solid ${t.border}`, borderRadius: '6px', boxShadow: 'none' } }}>
      <DialogTitle sx={{ pb: 1, color: t.textPrimary, fontWeight: 800 }}>
        Create Team
      </DialogTitle>
      <Divider sx={{ borderColor: t.border }} />

      <Box sx={{ px: 3, pt: 2 }}>
        <Stepper activeStep={step} alternativeLabel sx={{ mb: 2 }}>
          {WIZARD_STEPS.map(label => (
            <Step key={label}>
              <StepLabel sx={{
                '& .MuiStepLabel-label': { fontSize: '.72rem', color: t.textSecondary, fontWeight: 600 },
                '& .Mui-active .MuiStepLabel-label': { color: t.brandPrimary },
                '& .Mui-completed .MuiStepLabel-label': { color: dashboardSemanticColors.success },
              }}>
                {label}
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      <DialogContent sx={{ pt: 1, pb: 2 }}>
        {error && <Alert severity="error" sx={{ mb: 2, fontSize: '.8rem' }}>{error}</Alert>}

        {/* Step 0: Identity */}
        {step === 0 && (
          <Stack spacing={2}>
            <TextField
              label="Team Name" value={form.name} onChange={e => set('name')(e.target.value)}
              fullWidth size="small" required
              helperText="Minimum 2 characters"
              InputLabelProps={{ sx: { color: t.textSecondary } }}
              InputProps={{ sx: { color: t.textPrimary, bgcolor: t.surfaceSubtle } }}
            />
            <TextField
              label="Description (optional)" value={form.description}
              onChange={e => set('description')(e.target.value)}
              fullWidth size="small" multiline rows={2}
              InputLabelProps={{ sx: { color: t.textSecondary } }}
              InputProps={{ sx: { color: t.textPrimary, bgcolor: t.surfaceSubtle } }}
            />
            <Box>
              <Typography sx={{ fontSize: '.8rem', color: t.textSecondary, mb: 1, fontWeight: 600 }}>Avatar Colour</Typography>
              <Stack direction="row" spacing={1}>
                {AVATAR_COLORS.map(c => (
                  <Box key={c} onClick={() => set('avatar_color')(c)}
                    sx={{
                      width: 28, height: 28, borderRadius: '4px', bgcolor: c, cursor: 'pointer',
                      border: form.avatar_color === c ? `2px solid ${t.textPrimary}` : '2px solid transparent',
                      transition: 'border .1s',
                    }}
                  />
                ))}
              </Stack>
            </Box>
          </Stack>
        )}

        {/* Step 1: Team Type */}
        {step === 1 && (
          <Stack spacing={1.25}>
            {TEAM_TYPE_OPTIONS.map(opt => (
              <Box key={opt.value}
                onClick={() => set('team_type')(opt.value)}
                sx={{
                  p: 1.5, borderRadius: '4px', border: `1px solid`,
                  borderColor: form.team_type === opt.value ? opt.color : t.border,
                  bgcolor: form.team_type === opt.value ? `${opt.color}11` : t.surfaceSubtle,
                  cursor: 'pointer', transition: 'all .12s',
                  '&:hover': { borderColor: opt.color },
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: opt.color, flexShrink: 0 }} />
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '.85rem', color: t.textPrimary }}>{opt.label}</Typography>
                    <Typography sx={{ fontSize: '.75rem', color: t.textSecondary, mt: 0.25 }}>{opt.desc}</Typography>
                  </Box>
                  {form.team_type === opt.value && <CheckCircleIcon sx={{ color: opt.color, fontSize: '1.1rem' }} />}
                </Stack>
              </Box>
            ))}
          </Stack>
        )}

        {/* Step 2: Permissions */}
        {step === 2 && (
          <Box>
            <FormControlLabel
              control={<Switch checked={form.apply_template} onChange={e => set('apply_template')(e.target.checked)} size="small" />}
              label={<Typography sx={{ fontSize: '.85rem', color: t.textPrimary, fontWeight: 600 }}>Apply default permission template for {TEAM_TYPE_LABELS[form.team_type]}</Typography>}
              sx={{ mb: 2 }}
            />
            {form.apply_template && Object.keys(currentTemplate).length > 0 && (
              <Box>
                <Typography sx={{ fontSize: '.75rem', color: t.textSecondary, mb: 1 }}>Template preview (can be customised after creation):</Typography>
                <Box sx={{ maxHeight: 240, overflowY: 'auto', p: 1.5, bgcolor: t.surfaceSubtle, borderRadius: '4px', border: `1px solid ${t.border}` }}>
                  {Object.entries(currentTemplate).map(([key, allowed]) => (
                    <Stack key={key} direction="row" alignItems="center" justifyContent="space-between" sx={{ py: 0.4 }}>
                      <Typography sx={{ fontSize: '.78rem', color: t.textSecondary, fontFamily: 'monospace' }}>{key}</Typography>
                      <Chip label={allowed ? 'Allow' : 'Deny'} size="small"
                        sx={{
                          height: 18, fontSize: '.6rem', fontWeight: 700,
                          bgcolor: allowed ? `${dashboardSemanticColors.success}22` : 'rgba(239,68,68,.15)',
                          color: allowed ? dashboardSemanticColors.success : '#EF4444',
                        }}
                      />
                    </Stack>
                  ))}
                </Box>
              </Box>
            )}
            {!form.apply_template && (
              <Alert severity="info" sx={{ fontSize: '.78rem' }}>
                No permissions will be applied. You can configure them fully from the team detail page.
              </Alert>
            )}
          </Box>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <Stack spacing={1.5}>
            <Typography sx={{ fontSize: '.82rem', color: t.textSecondary, mb: 0.5 }}>Review your team setup before creating.</Typography>
            {[
              { label: 'Team Name',    value: form.name },
              { label: 'Type',         value: TEAM_TYPE_LABELS[form.team_type] },
              { label: 'Description',  value: form.description || '—' },
              { label: 'Permissions',  value: form.apply_template ? `Default ${form.team_type} template` : 'None (configure later)' },
            ].map(({ label, value }) => (
              <Stack key={label} direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ py: 0.75, borderBottom: `1px solid ${t.border}` }}>
                <Typography sx={{ fontSize: '.8rem', color: t.textSecondary, fontWeight: 600, minWidth: 120 }}>{label}</Typography>
                <Typography sx={{ fontSize: '.8rem', color: t.textPrimary, textAlign: 'right' }}>{value}</Typography>
              </Stack>
            ))}
          </Stack>
        )}
      </DialogContent>

      <Divider sx={{ borderColor: t.border }} />
      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={() => { if (step === 0) onClose(); else setStep(s => s - 1); }}
          startIcon={step > 0 ? <ArrowBackIcon /> : undefined}
          sx={{ color: t.textSecondary, textTransform: 'none', fontWeight: 600 }}>
          {step === 0 ? 'Cancel' : 'Back'}
        </Button>
        {step < WIZARD_STEPS.length - 1 ? (
          <Button onClick={() => setStep(s => s + 1)} disabled={!canNext()}
            endIcon={<ArrowForwardIcon />}
            variant="contained" sx={{ ...dashboardPrimaryButtonSx, textTransform: 'none' }}>
            Next
          </Button>
        ) : (
          <Button onClick={handleCreate} disabled={saving}
            variant="contained"
            sx={{ ...dashboardPrimaryButtonSx, textTransform: 'none', minWidth: 120 }}
            startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <CheckCircleIcon />}>
            {saving ? 'Creating…' : 'Create Team'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

// ─── Teams Page ───────────────────────────────────────────────────────────────

interface TeamsPageProps {
  dashboardContext?: 'cloud' | 'developer' | 'marketing' | 'data' | 'all';
}

const TeamsPage: React.FC<TeamsPageProps> = ({ dashboardContext = 'all' }) => {
  const navigate = useNavigate();
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<TeamType | 'all'>('all');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    teamApi.list()
      .then(r => setTeams((r.data as any) ?? []))
      .catch(() => setError('Failed to load teams.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = typeFilter === 'all' ? teams : teams.filter(t => t.team_type === typeFilter);

  const handleCreated = (team: any) => {
    // The create endpoint returns TeamDetail (full team) — adapt to TeamSummary shape
    const summary: TeamSummary = {
      ...team,
      member_count: team.members?.length ?? 1,
    };
    setTeams(p => [summary, ...p]);
  };

  // Context-aware filter: developer dashboard shows developer + production; marketing shows marketing; etc.
  const contextTypes: TeamType[] = dashboardContext === 'developer'
    ? ['developer', 'production']
    : dashboardContext === 'marketing'
      ? ['marketing']
      : dashboardContext === 'data'
        ? ['data']
        : [];

  const contextFiltered = contextTypes.length > 0
    ? filtered.filter(t => contextTypes.includes(t.team_type))
    : filtered;

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2.5 }} flexWrap="wrap" gap={1}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: t.textPrimary, letterSpacing: '-.02em' }}>
            Teams
          </Typography>
          <Typography sx={{ fontSize: '.82rem', color: t.textSecondary, mt: 0.25 }}>
            {teams.length} team{teams.length !== 1 ? 's' : ''} · Manage access, roles, and resource ownership
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Refresh">
            <IconButton onClick={load} size="small" sx={{ color: t.textSecondary, '&:hover': { color: t.brandPrimary } }}>
              <RefreshIcon sx={{ fontSize: '1.1rem' }} />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setWizardOpen(true)}
            sx={{ ...dashboardPrimaryButtonSx, textTransform: 'none', fontWeight: 700, fontSize: '.82rem' }}
          >
            Create Team
          </Button>
        </Stack>
      </Stack>

      {/* Type filter */}
      {contextTypes.length === 0 && (
        <Box sx={{ mb: 2, pb: 1.5, borderBottom: `1px solid ${t.border}` }}>
          <ToggleButtonGroup
            value={typeFilter}
            exclusive
            onChange={(_, v) => { if (v) setTypeFilter(v); }}
            size="small"
            sx={{ flexWrap: 'wrap', gap: 0.5 }}
          >
            <ToggleButton value="all"
              sx={{ textTransform: 'none', fontSize: '.75rem', fontWeight: 600, px: 1.5, borderRadius: '4px !important', border: `1px solid ${t.border} !important` }}>
              All Types
            </ToggleButton>
            {Object.entries(TEAM_TYPE_LABELS).map(([v, label]) => (
              <ToggleButton key={v} value={v}
                sx={{ textTransform: 'none', fontSize: '.75rem', fontWeight: 600, px: 1.5, borderRadius: '4px !important', border: `1px solid ${t.border} !important`,
                  color: typeFilter === v ? TEAM_TYPE_COLORS[v as TeamType] : t.textSecondary }}>
                {label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>
      )}

      {/* Content */}
      {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}
      {error && <Alert severity="error" sx={{ mb: 2, fontSize: '.8rem' }}>{error}</Alert>}

      {!loading && contextFiltered.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <GroupsIcon sx={{ fontSize: '3rem', color: t.textTertiary, mb: 1.5 }} />
          <Typography sx={{ color: t.textSecondary, fontWeight: 600, mb: 0.5 }}>No teams yet</Typography>
          <Typography sx={{ fontSize: '.82rem', color: t.textTertiary, mb: 2 }}>
            Create your first team to start collaborating on cloud resources.
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setWizardOpen(true)}
            sx={{ ...dashboardPrimaryButtonSx, textTransform: 'none', fontWeight: 700 }}>
            Create Your First Team
          </Button>
        </Box>
      )}

      <Grid container spacing={2}>
        {contextFiltered.map(team => (
          <Grid item xs={12} sm={6} lg={4} key={team.team_id}>
            <TeamCard team={team} onOpen={id => navigate(`/dashboard/teams/${id}`)} />
          </Grid>
        ))}
      </Grid>

      <CreateTeamWizard open={wizardOpen} onClose={() => setWizardOpen(false)} onCreated={handleCreated} />
    </Box>
  );
};

export default TeamsPage;
