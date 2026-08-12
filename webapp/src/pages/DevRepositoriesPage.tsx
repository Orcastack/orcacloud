/**
 * DevRepositoriesPage
 *
 * Repositories are first-class citizens — they exist independently of projects.
 * Create or import a repo directly without needing a project first.
 *
 * Route: /developer/Dashboard/repositories
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Button, Card, Chip, CircularProgress, Dialog, DialogContent,
  DialogTitle, Divider, FormControlLabel, IconButton, InputAdornment,
  Radio, RadioGroup, Stack, TextField, Tooltip, Typography,
} from '@mui/material';
import SearchIcon             from '@mui/icons-material/Search';
import AccountTreeIcon        from '@mui/icons-material/AccountTree';
import AddIcon                from '@mui/icons-material/Add';
import CallSplitIcon          from '@mui/icons-material/CallSplit';
import CheckCircleIcon        from '@mui/icons-material/CheckCircle';
import CloseIcon              from '@mui/icons-material/Close';
import ErrorIcon              from '@mui/icons-material/Error';
import FolderOpenIcon         from '@mui/icons-material/FolderOpenRounded';
import GitHubIcon             from '@mui/icons-material/GitHub';
import HourglassTopIcon       from '@mui/icons-material/HourglassTop';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import LockIcon               from '@mui/icons-material/Lock';
import PublicIcon             from '@mui/icons-material/Public';
import ScheduleIcon           from '@mui/icons-material/Schedule';
import SyncIcon               from '@mui/icons-material/Sync';
import UploadIcon             from '@mui/icons-material/Upload';
import { useNavigate }        from 'react-router-dom';
import {
  listAllRepos, createStandaloneRepo,
  type BackendRepository, type CreateStandaloneRepoPayload,
} from '../services/projectsApi';
import { dashboardTokens, dashboardSemanticColors } from '../styles/dashboardDesignSystem';

const FONT = dashboardTokens.typography.fontFamily;
const MONO = '"JetBrains Mono","Fira Code",monospace';
const t    = dashboardTokens.colors;

function relative(dateStr?: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

const PROVIDER_ICON: Record<string, React.ReactNode> = {
  github:    <GitHubIcon sx={{ fontSize: '1rem', color: t.textPrimary }} />,
  gitlab:    <Box component="span" sx={{ fontWeight: 900, fontSize: '.72rem', color: '#fc6d26', fontFamily: FONT }}>GL</Box>,
  bitbucket: <Box component="span" sx={{ fontWeight: 900, fontSize: '.72rem', color: '#0052cc', fontFamily: FONT }}>BB</Box>,
  orcacloud:    <AccountTreeIcon sx={{ fontSize: '1rem', color: t.brandPrimary }} />,
};

function repoUrl(repo: BackendRepository): string {
  if (repo.project) return `/developer/Dashboard/projects/${repo.project}/repo`;
  return `/developer/Dashboard/repo/${repo.id}`;
}

// ── Stat card ─────────────────────────────────────────────────────────────────
const StatCard: React.FC<{ label: string; value: number | string; color: string }> = ({ label, value, color }) => (
  <Card sx={{ flex: 1, border: `1px solid ${t.border}`, bgcolor: t.surface, boxShadow: 'none', borderRadius: '10px', p: '12px 16px' }}>
    <Typography sx={{ fontSize: '.7rem', fontWeight: 700, color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.08em', fontFamily: FONT }}>{label}</Typography>
    <Typography sx={{ fontSize: '1.5rem', fontWeight: 800, color, lineHeight: 1.2, fontFamily: FONT, mt: 0.25 }}>{value}</Typography>
  </Card>
);

// ── Pipeline badge ─────────────────────────────────────────────────────────────
const PipelineBadge: React.FC<{ status: string }> = ({ status }) => {
  const cfg: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
    success: { color: dashboardSemanticColors.success, icon: <CheckCircleIcon sx={{ fontSize: '.75rem' }} />, label: 'Passing' },
    failure: { color: dashboardSemanticColors.danger,  icon: <ErrorIcon       sx={{ fontSize: '.75rem' }} />, label: 'Failing' },
    running: { color: dashboardSemanticColors.info,    icon: <SyncIcon sx={{ fontSize: '.75rem', animation: 'spin 1.2s linear infinite', '@keyframes spin': { '0%': {transform:'rotate(0deg)'}, '100%': {transform:'rotate(360deg)'} } }} />, label: 'Running' },
    pending: { color: dashboardSemanticColors.warning, icon: <HourglassTopIcon sx={{ fontSize: '.75rem' }} />, label: 'Pending' },
  };
  const c = cfg[status];
  if (!c) return <Typography sx={{ fontSize: '.72rem', color: t.textTertiary, fontFamily: FONT }}>—</Typography>;
  return (
    <Stack direction="row" alignItems="center" spacing={0.35} sx={{ px: 0.75, py: 0.25, borderRadius: '5px', bgcolor: `${c.color}18` }}>
      {c.icon}
      <Typography sx={{ fontSize: '.68rem', fontWeight: 700, color: c.color, fontFamily: FONT }}>{c.label}</Typography>
    </Stack>
  );
};

// ── Repository row ─────────────────────────────────────────────────────────────
const RepoRow: React.FC<{ repo: BackendRepository }> = ({ repo }) => {
  const navigate = useNavigate();
  const isStandalone = !repo.project;
  return (
    <Box
      onClick={() => navigate(repoUrl(repo))}
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '2fr 110px 1fr 1fr 120px 96px' },
        alignItems: 'center', gap: 1.5, px: 2, py: 1.5,
        cursor: 'pointer', transition: 'background .12s',
        '&:hover': { bgcolor: `${t.brandPrimary}08` },
        '&:not(:last-child)': { borderBottom: `1px solid ${t.border}` },
      }}
    >
      {/* Name */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
        <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: '8px', bgcolor: `${t.brandPrimary}14` }}>
          {PROVIDER_ICON[repo.provider] ?? <AccountTreeIcon sx={{ fontSize: '1rem', color: t.brandPrimary }} />}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" alignItems="center" spacing={0.75}>
            <Typography sx={{ fontFamily: MONO, fontWeight: 700, fontSize: '.875rem', color: t.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {repo.repo_name}
            </Typography>
            {repo.visibility === 'private'
              ? <Tooltip title="Private"><LockIcon   sx={{ fontSize: '.75rem', color: t.textTertiary }} /></Tooltip>
              : <Tooltip title="Public"><PublicIcon sx={{ fontSize: '.75rem', color: dashboardSemanticColors.success }} /></Tooltip>
            }
          </Stack>
          {repo.repo_description && (
            <Typography sx={{ fontSize: '.72rem', color: t.textTertiary, fontFamily: FONT, mt: 0.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {repo.repo_description}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Scope */}
      <Box sx={{ display: { xs: 'none', md: 'flex' }, flexDirection: 'column', gap: 0.3 }}>
        {isStandalone ? (
          <Chip label="Standalone" size="small" sx={{ height: 18, bgcolor: `${t.brandPrimary}14`, color: t.brandPrimary, border: `1px solid ${t.brandPrimary}30`, fontSize: '.6rem', fontWeight: 700, '& .MuiChip-label': { px: 0.75 }, alignSelf: 'flex-start' }} />
        ) : (
          <Stack direction="row" alignItems="center" spacing={0.4}>
            <FolderOpenIcon sx={{ fontSize: '.7rem', color: t.textTertiary }} />
            <Typography sx={{ fontSize: '.72rem', color: t.textTertiary, fontFamily: FONT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 80 }}>
              {repo.project_name ?? 'Project'}
            </Typography>
          </Stack>
        )}
        {repo.created_by_username && (
          <Tooltip title={`Created by ${repo.created_by_username}`}>
            <Typography sx={{ fontSize: '.6rem', color: t.textTertiary, fontFamily: FONT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 100 }}>
              by {repo.created_by_username}
            </Typography>
          </Tooltip>
        )}
      </Box>

      {/* Branch */}
      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ display: { xs: 'none', md: 'flex' } }}>
        <CallSplitIcon sx={{ fontSize: '.8rem', color: t.textTertiary }} />
        <Typography sx={{ fontFamily: MONO, fontSize: '.78rem', color: t.textSecondary }}>{repo.default_branch}</Typography>
      </Stack>

      {/* Pipeline */}
      <Box sx={{ display: { xs: 'none', md: 'block' } }}><PipelineBadge status="" /></Box>

      {/* Updated */}
      <Stack direction="row" alignItems="center" spacing={0.4} sx={{ display: { xs: 'none', md: 'flex' } }}>
        <ScheduleIcon sx={{ fontSize: '.75rem', color: t.textTertiary }} />
        <Typography sx={{ fontSize: '.75rem', color: t.textTertiary, fontFamily: FONT, whiteSpace: 'nowrap' }}>
          {relative(repo.updated_at ?? repo.created_at)}
        </Typography>
      </Stack>

      {/* Action */}
      <Button
        size="small" variant="outlined"
        endIcon={<KeyboardArrowRightIcon sx={{ fontSize: '.8rem' }} />}
        onClick={(e) => { e.stopPropagation(); navigate(repoUrl(repo)); }}
        sx={{ textTransform: 'none', fontWeight: 700, fontSize: '.73rem', color: t.brandPrimary, borderColor: `${t.brandPrimary}50`, borderRadius: '7px', py: 0.35, px: 1.25, '&:hover': { borderColor: t.brandPrimary, bgcolor: `${t.brandPrimary}0a` }, whiteSpace: 'nowrap' }}
      >
        Open
      </Button>
    </Box>
  );
};

// ── Field shared sx ───────────────────────────────────────────────────────────
const fieldSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: t.surfaceSubtle, color: t.textPrimary, borderRadius: '8px', fontSize: '.875rem',
    '& fieldset': { borderColor: t.border },
    '&:hover fieldset': { borderColor: t.borderStrong },
    '&.Mui-focused fieldset': { borderColor: t.brandPrimary, boxShadow: `0 0 0 3px ${t.brandPrimary}22` },
  },
  '& .MuiInputBase-input::placeholder': { color: t.textSecondary, opacity: 1 },
};

// ── Create Repository Dialog ──────────────────────────────────────────────────
const CreateRepoDialog: React.FC<{ open: boolean; onClose: () => void; onCreated: (r: BackendRepository) => void }> = ({ open, onClose, onCreated }) => {
  const [name,       setName]       = useState('');
  const [desc,       setDesc]       = useState('');
  const [vis,        setVis]        = useState<'private'|'public'>('private');
  const [branch,     setBranch]     = useState('main');
  const [creating,   setCreating]   = useState(false);
  const [error,      setError]      = useState<string|null>(null);

  const reset = () => { setName(''); setDesc(''); setVis('private'); setBranch('main'); setError(null); };
  const handleClose = () => { reset(); onClose(); };

  const handleCreate = async () => {
    if (!name.trim()) { setError('Repository name is required.'); return; }
    setCreating(true); setError(null);
    try {
      const payload: CreateStandaloneRepoPayload = {
        repo_name: name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9._-]/g, ''),
        repo_description: desc.trim() || undefined,
        visibility: vis,
        default_branch: branch.trim() || 'main',
      };
      const repo = await createStandaloneRepo(payload);
      reset();
      onCreated(repo);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? e?.message ?? 'Failed to create repository.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { bgcolor: t.surface, border: `1px solid ${t.border}`, borderRadius: '12px', backgroundImage: 'none' } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1.5 }}>
        <Stack direction="row" alignItems="center" spacing={1.25}>
          <Box sx={{ width: 32, height: 32, borderRadius: '8px', bgcolor: `${t.brandPrimary}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AccountTreeIcon sx={{ fontSize: '1.1rem', color: t.brandPrimary }} />
          </Box>
          <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: t.textPrimary, fontFamily: FONT }}>
            Create a new repository
          </Typography>
        </Stack>
        <IconButton size="small" onClick={handleClose} sx={{ color: t.textTertiary }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <Divider sx={{ borderColor: t.border }} />
      <DialogContent sx={{ pt: 2.5, pb: 3 }}>
        <Stack spacing={2.5}>

          <Box>
            <Typography sx={{ fontSize: '.8rem', fontWeight: 700, color: t.textSecondary, mb: 0.75, fontFamily: FONT }}>
              Repository name <Box component="span" sx={{ color: dashboardSemanticColors.danger }}>*</Box>
            </Typography>
            <TextField
              value={name} onChange={e => { setName(e.target.value); setError(null); }}
              placeholder="my-awesome-repo" fullWidth size="small" autoFocus
              inputProps={{ style: { fontFamily: MONO, fontSize: '.875rem' } }} sx={fieldSx}
            />
            <Typography sx={{ fontSize: '.7rem', color: t.textTertiary, mt: 0.5, fontFamily: FONT }}>
              Lowercase letters, numbers, hyphens and dots only.
            </Typography>
          </Box>

          <Box>
            <Typography sx={{ fontSize: '.8rem', fontWeight: 700, color: t.textSecondary, mb: 0.75, fontFamily: FONT }}>
              Description <Box component="span" sx={{ color: t.textTertiary, fontWeight: 400 }}>(optional)</Box>
            </Typography>
            <TextField
              value={desc} onChange={e => setDesc(e.target.value)}
              placeholder="A short description of what this repository does…"
              fullWidth size="small" multiline minRows={2}
              sx={fieldSx} inputProps={{ style: { fontSize: '.875rem' } }}
            />
          </Box>

          <Box>
            <Typography sx={{ fontSize: '.8rem', fontWeight: 700, color: t.textSecondary, mb: 0.75, fontFamily: FONT }}>Visibility</Typography>
            <RadioGroup value={vis} onChange={(_, v) => setVis(v as 'private'|'public')}>
              <Stack spacing={1}>
                {([
                  { value: 'private' as const, icon: <LockIcon sx={{ fontSize: '.9rem' }} />,   label: 'Private', sub: 'Only you and people you grant access can see this.' },
                  { value: 'public'  as const, icon: <PublicIcon sx={{ fontSize: '.9rem' }} />, label: 'Public',  sub: 'Anyone on the internet can see this repository.' },
                ]).map(opt => (
                  <Box key={opt.value} onClick={() => setVis(opt.value)}
                    sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25, p: 1.25, borderRadius: '8px', cursor: 'pointer', border: `1.5px solid ${vis === opt.value ? t.brandPrimary : t.border}`, bgcolor: vis === opt.value ? `${t.brandPrimary}08` : t.surfaceSubtle, transition: 'border-color .12s, background .12s' }}>
                    <FormControlLabel value={opt.value} control={<Radio size="small" sx={{ p: 0, color: t.textTertiary, '&.Mui-checked': { color: t.brandPrimary } }} />} label="" sx={{ m: 0 }} />
                    <Box sx={{ color: vis === opt.value ? t.brandPrimary : t.textSecondary, mt: '1px' }}>{opt.icon}</Box>
                    <Box>
                      <Typography sx={{ fontSize: '.85rem', fontWeight: 700, color: t.textPrimary, fontFamily: FONT, lineHeight: 1.2 }}>{opt.label}</Typography>
                      <Typography sx={{ fontSize: '.75rem', color: t.textTertiary, fontFamily: FONT, mt: 0.3 }}>{opt.sub}</Typography>
                    </Box>
                  </Box>
                ))}
              </Stack>
            </RadioGroup>
          </Box>

          <Box>
            <Typography sx={{ fontSize: '.8rem', fontWeight: 700, color: t.textSecondary, mb: 0.75, fontFamily: FONT }}>Default branch</Typography>
            <TextField value={branch} onChange={e => setBranch(e.target.value)} placeholder="main" size="small"
              sx={{ ...fieldSx, width: 200 }} inputProps={{ style: { fontFamily: MONO, fontSize: '.875rem' } }} />
          </Box>

          {error && (
            <Box sx={{ bgcolor: `${dashboardSemanticColors.danger}12`, border: `1px solid ${dashboardSemanticColors.danger}40`, borderRadius: '8px', px: 1.5, py: 1 }}>
              <Typography sx={{ fontSize: '.8rem', color: dashboardSemanticColors.danger, fontFamily: FONT }}>{error}</Typography>
            </Box>
          )}

          <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ pt: 0.5 }}>
            <Button variant="outlined" size="small" onClick={handleClose} disabled={creating}
              sx={{ textTransform: 'none', fontWeight: 600, fontSize: '.82rem', borderRadius: '7px', color: t.textSecondary, borderColor: t.border }}>
              Cancel
            </Button>
            <Button variant="contained" size="small" onClick={handleCreate} disabled={creating || !name.trim()}
              startIcon={creating ? <CircularProgress size={13} sx={{ color: '#fff' }} /> : <AccountTreeIcon sx={{ fontSize: '.9rem' }} />}
              sx={{ textTransform: 'none', fontWeight: 700, fontSize: '.82rem', borderRadius: '7px', bgcolor: t.brandPrimary, '&:hover': { bgcolor: dashboardTokens.colors.brandPrimaryHover }, boxShadow: 'none' }}>
              {creating ? 'Creating…' : 'Create repository'}
            </Button>
          </Stack>
        </Stack>
      </DialogContent>
    </Dialog>
  );
};

// ── Empty / landing state ─────────────────────────────────────────────────────
const EmptyLanding: React.FC<{ onNew: () => void; onImport: () => void }> = ({ onNew, onImport }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 10, px: 3, textAlign: 'center' }}>
    <Box sx={{ width: 64, height: 64, borderRadius: '16px', bgcolor: `${t.brandPrimary}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2.5 }}>
      <AccountTreeIcon sx={{ fontSize: '2rem', color: t.brandPrimary }} />
    </Box>
    <Typography sx={{ fontWeight: 800, fontSize: '1.15rem', color: t.textPrimary, fontFamily: FONT, letterSpacing: '-.02em', mb: 0.75 }}>
      No repositories yet
    </Typography>
    <Typography sx={{ color: t.textSecondary, fontSize: '.875rem', fontFamily: FONT, maxWidth: 420, lineHeight: 1.6 }}>
      Repositories store your source code, track every change, and power your CI/CD pipelines.
      Create one now or import from GitHub, GitLab, or Bitbucket.
    </Typography>
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ mt: 3 }}>
      <Button variant="contained" startIcon={<AddIcon />} onClick={onNew}
        sx={{ bgcolor: t.brandPrimary, '&:hover': { bgcolor: dashboardTokens.colors.brandPrimaryHover }, textTransform: 'none', fontWeight: 700, fontSize: '.875rem', borderRadius: '8px', boxShadow: 'none', py: 1, px: 2.5 }}>
        Create repository
      </Button>
      <Button variant="outlined" startIcon={<UploadIcon />} onClick={onImport}
        sx={{ borderColor: t.border, color: t.textSecondary, textTransform: 'none', fontWeight: 600, fontSize: '.875rem', borderRadius: '8px', py: 1, px: 2.5, '&:hover': { borderColor: t.brandPrimary, color: t.brandPrimary } }}>
        Import from GitHub / GitLab / Bitbucket
      </Button>
    </Stack>
    <Stack direction="row" alignItems="center" spacing={2.5} sx={{ mt: 4, opacity: 0.35 }}>
      <GitHubIcon sx={{ fontSize: '1.5rem', color: t.textPrimary }} />
      <Box component="span" sx={{ fontWeight: 900, fontSize: '1rem', color: '#fc6d26', fontFamily: FONT }}>GitLab</Box>
      <Box component="span" sx={{ fontWeight: 900, fontSize: '1rem', color: '#0052cc', fontFamily: FONT }}>Bitbucket</Box>
    </Stack>
  </Box>
);

// ── Main page ─────────────────────────────────────────────────────────────────
const DevRepositoriesPage: React.FC = () => {
  const navigate = useNavigate();
  const [repos,      setRepos]      = useState<BackendRepository[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [query,      setQuery]      = useState('');
  const [filter,     setFilter]     = useState<'all'|'standalone'|'project'>('all');
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const all = await listAllRepos();
      setRepos(all);
    } catch {
      // show empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const standaloneCount = repos.filter(r => !r.project).length;
  const projectCount    = repos.filter(r =>  r.project).length;

  const filtered = repos.filter(r => {
    if (filter === 'standalone' && r.project)  return false;
    if (filter === 'project'    && !r.project) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      r.repo_name.toLowerCase().includes(q) ||
      (r.repo_description ?? '').toLowerCase().includes(q) ||
      (r.project_name ?? '').toLowerCase().includes(q) ||
      r.provider.toLowerCase().includes(q)
    );
  });

  const handleImport = () => navigate('/developer/Dashboard/projects/import');
  const handleCreated = (repo: BackendRepository) => { setCreateOpen(false); setRepos(prev => [repo, ...prev]); };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, fontFamily: FONT }}>

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.2rem', md: '1.35rem' }, color: t.textPrimary, fontFamily: FONT, letterSpacing: '-.02em' }}>
            Repositories
          </Typography>
          <Typography sx={{ color: t.textSecondary, fontSize: '.875rem', mt: 0.3, fontFamily: FONT }}>
            Source repositories across OrcaCloud — standalone or linked to a project.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button size="small" variant="outlined" startIcon={<SyncIcon sx={{ fontSize: '.85rem' }} />} onClick={load}
            sx={{ textTransform: 'none', fontSize: '.8rem', color: t.textSecondary, borderColor: t.border, borderRadius: '7px', fontWeight: 600, '&:hover': { borderColor: t.brandPrimary, color: t.brandPrimary } }}>
            Refresh
          </Button>
          <Button size="small" variant="outlined" startIcon={<UploadIcon sx={{ fontSize: '.85rem' }} />} onClick={handleImport}
            sx={{ textTransform: 'none', fontSize: '.8rem', color: t.textSecondary, borderColor: t.border, borderRadius: '7px', fontWeight: 600, '&:hover': { borderColor: t.brandPrimary, color: t.brandPrimary } }}>
            Import
          </Button>
          <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}
            sx={{ bgcolor: t.brandPrimary, '&:hover': { bgcolor: dashboardTokens.colors.brandPrimaryHover }, fontWeight: 700, fontSize: '.8rem', borderRadius: '7px', textTransform: 'none', boxShadow: 'none' }}>
            New Repository
          </Button>
        </Stack>
      </Box>

      {/* Stats */}
      {!loading && repos.length > 0 && (
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} sx={{ mb: 3 }}>
          <StatCard label="Total Repositories" value={repos.length}    color={t.brandPrimary} />
          <StatCard label="Standalone"          value={standaloneCount} color={dashboardSemanticColors.success} />
          <StatCard label="Linked to Projects"  value={projectCount}    color={t.textPrimary} />
        </Stack>
      )}

      {/* Filter + search */}
      {!loading && repos.length > 0 && (
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={1} alignItems={{ sm: 'center' }} sx={{ mb: 2.5 }}>
          <Stack direction="row" gap={0.5}>
            {([
              { id: 'all'        as const, label: `All (${repos.length})` },
              { id: 'standalone' as const, label: `Standalone (${standaloneCount})` },
              { id: 'project'    as const, label: `In Projects (${projectCount})` },
            ]).map(f => (
              <Button key={f.id} size="small" onClick={() => setFilter(f.id)}
                sx={{ textTransform: 'none', fontWeight: filter === f.id ? 700 : 500, fontSize: '.78rem', borderRadius: '6px', px: 1.25, color: filter === f.id ? t.brandPrimary : t.textSecondary, bgcolor: filter === f.id ? `${t.brandPrimary}12` : 'transparent', border: `1px solid ${filter === f.id ? t.brandPrimary + '44' : 'transparent'}`, '&:hover': { bgcolor: `${t.brandPrimary}08` } }}>
                {f.label}
              </Button>
            ))}
          </Stack>
          <TextField
            value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search repositories…" size="small"
            sx={{ ml: { sm: 'auto' }, minWidth: 240, '& .MuiOutlinedInput-root': { bgcolor: t.surface, color: t.textPrimary, borderRadius: '8px', fontSize: '.875rem', '& fieldset': { borderColor: t.border }, '&:hover fieldset': { borderColor: t.borderStrong }, '&.Mui-focused fieldset': { borderColor: t.brandPrimary, boxShadow: `0 0 0 3px ${t.brandPrimary}22` } }, '& .MuiInputBase-input::placeholder': { color: t.textSecondary, opacity: 1 } }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: t.textSecondary, fontSize: '1rem' }} /></InputAdornment> }}
          />
        </Stack>
      )}

      {/* Content */}
      {loading ? (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 10 }}>
          <CircularProgress sx={{ color: t.brandPrimary }} size={30} />
        </Box>
      ) : repos.length === 0 ? (
        <Card sx={{ border: `1px solid ${t.border}`, bgcolor: t.surface, boxShadow: 'none', borderRadius: '10px', overflow: 'hidden' }}>
          <EmptyLanding onNew={() => setCreateOpen(true)} onImport={handleImport} />
        </Card>
      ) : (
        <Card sx={{ border: `1px solid ${t.border}`, bgcolor: t.surface, boxShadow: 'none', borderRadius: '10px', overflow: 'hidden' }}>
          {/* Column headers */}
          <Box sx={{ display: { xs: 'none', md: 'grid' }, gridTemplateColumns: '2fr 110px 1fr 1fr 120px 96px', gap: 1.5, px: 2, py: 1, borderBottom: `1px solid ${t.border}`, bgcolor: t.surfaceSubtle }}>
            {['Repository', 'Scope', 'Branch', 'Pipeline', 'Updated', ''].map(col => (
              <Typography key={col} sx={{ fontSize: '.7rem', fontWeight: 700, color: t.textTertiary, textTransform: 'uppercase', letterSpacing: '.07em', fontFamily: FONT }}>{col}</Typography>
            ))}
          </Box>
          {filtered.length === 0 ? (
            <Box sx={{ py: 5, textAlign: 'center' }}>
              <Typography sx={{ color: t.textSecondary, fontFamily: FONT, fontWeight: 600 }}>No repositories match your filter</Typography>
            </Box>
          ) : (
            filtered.map(repo => <RepoRow key={repo.id} repo={repo} />)
          )}
        </Card>
      )}

      {/* Footer count */}
      {!loading && filtered.length > 0 && (
        <Typography sx={{ mt: 1.5, fontSize: '.75rem', color: t.textTertiary, fontFamily: FONT, textAlign: 'right' }}>
          Showing {filtered.length} {filtered.length === 1 ? 'repository' : 'repositories'}{query ? ` matching "${query}"` : ''}
        </Typography>
      )}

      <CreateRepoDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={handleCreated} />
    </Box>
  );
};

export default DevRepositoriesPage;
