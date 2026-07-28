import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import AddIcon       from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import GitHubIcon    from '@mui/icons-material/GitHub';
import GroupIcon     from '@mui/icons-material/Group';
import LockIcon      from '@mui/icons-material/Lock';
import PublicIcon    from '@mui/icons-material/Public';
import StorageIcon   from '@mui/icons-material/Storage';
import UploadIcon    from '@mui/icons-material/Upload';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { dashboardTokens } from '../styles/dashboardDesignSystem';

const FONT = dashboardTokens.typography.fontFamily;
const t    = dashboardTokens.colors;

type Mode       = 'create' | 'import';
type Visibility = 'private' | 'internal' | 'public';
type Provider   = 'github' | 'gitlab' | 'bitbucket';

const PROVIDERS: { id: Provider; label: string; icon: React.ReactNode }[] = [
  { id: 'github',    label: 'GitHub',    icon: <GitHubIcon sx={{ fontSize: '1.2rem' }} /> },
  { id: 'gitlab',    label: 'GitLab',    icon: <StorageIcon sx={{ fontSize: '1.2rem' }} /> },
  { id: 'bitbucket', label: 'Bitbucket', icon: <UploadIcon sx={{ fontSize: '1.2rem' }} /> },
];

const VISIBILITY_OPTIONS: { value: Visibility; label: string; desc: string; icon: React.ReactNode }[] = [
  { value: 'private',  label: 'Private',  desc: 'Only you and invited members',   icon: <LockIcon   sx={{ fontSize: '1rem' }} /> },
  { value: 'internal', label: 'Internal', desc: 'All authenticated team members', icon: <GroupIcon  sx={{ fontSize: '1rem' }} /> },
  { value: 'public',   label: 'Public',   desc: 'Anyone on the internet',          icon: <PublicIcon sx={{ fontSize: '1rem' }} /> },
];

const getToken = (): string => {
  try {
    return localStorage.getItem('authToken') ?? '';
  } catch { return ''; }
};

const API_BASE = '/api/services/pipelines/repositories/';

const RepoSetupPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectId   = searchParams.get('project') ?? '';
  const initialMode = (searchParams.get('mode') as Mode) ?? 'create';

  const backPath = projectId
    ? `/developer/Dashboard/projects/${projectId}`
    : '/developer/Dashboard/projects';

  const [mode, setMode]               = useState<Mode>(initialMode);
  const [repoName, setRepoName]       = useState('');
  const [repoDesc, setRepoDesc]       = useState('');
  const [visibility, setVisibility]   = useState<Visibility>('private');
  const [initReadme, setInitReadme]   = useState(true);
  const [provider, setProvider]       = useState<Provider>('github');
  const [repoUrl, setRepoUrl]         = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const slugify = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const postRepo = async (body: Record<string, string>) => {
    const token = getToken();
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Token ${token}` } : {}),
      },
      credentials: 'include',
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(
        Object.values(data).flat().join(' ') || `Error ${res.status}`,
      );
    }
    return res.json();
  };

  const handleCreate = async () => {
    if (!repoName.trim() || !projectId) return;
    setError(null);
    setSubmitting(true);
    try {
      await postRepo({
        project:        projectId,
        provider:       'atonix',
        repo_name:      slugify(repoName),
        default_branch: 'main',
        init_readme:    String(initReadme),
      });
      navigate(backPath);
    } catch (e: any) {
      setError(e.message ?? 'Failed to create repository.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleImport = async () => {
    if (!repoUrl.trim() || !projectId) return;
    setError(null);
    setSubmitting(true);
    try {
      // Extract repo name from URL: last path segment without .git
      const parts = repoUrl.replace(/\.git$/, '').split('/').filter(Boolean);
      const name  = parts[parts.length - 1] || 'imported-repo';
      await postRepo({
        project:        projectId,
        provider:       provider,
        repo_name:      slugify(name),
        default_branch: 'main',
      });
      navigate(backPath);
    } catch (e: any) {
      setError(e.message ?? 'Failed to import repository.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: t.background, fontFamily: FONT, display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <Box sx={{ px: 3, py: 1.5, borderBottom: `1px solid ${t.border}`, bgcolor: t.surface, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button size="small" startIcon={<ArrowBackIcon />} onClick={() => navigate(backPath)}
          sx={{ textTransform: 'none', color: t.textSecondary, '&:hover': { color: t.textPrimary }, minWidth: 0 }}>
          Back to project
        </Button>
        <Divider orientation="vertical" flexItem sx={{ borderColor: t.border }} />
        <Typography sx={{ fontWeight: 700, fontSize: '.95rem', color: t.textPrimary }}>
          Repository Setup
        </Typography>
        {projectId && (
          <Chip label={`project: ${projectId}`} size="small"
            sx={{ fontSize: '.68rem', bgcolor: t.surfaceSubtle, color: t.textTertiary, border: `1px solid ${t.border}` }} />
        )}
      </Box>

      {/* Body */}
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', py: 6, px: 2 }}>
        <Box sx={{ width: '100%', maxWidth: 600 }}>

          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: '10px' }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Mode toggle */}
          <ToggleButtonGroup value={mode} exclusive size="small" fullWidth
            onChange={(_, v) => { if (v) setMode(v); }}
            sx={{ mb: 4, bgcolor: t.surface, border: `1px solid ${t.border}`, borderRadius: '12px', overflow: 'hidden',
              '& .MuiToggleButton-root': { flex: 1, border: 'none', borderRadius: 0, textTransform: 'none', fontWeight: 600, fontSize: '.85rem', color: t.textSecondary, py: 1.25,
                '&.Mui-selected': { bgcolor: t.brandPrimary, color: '#fff', '&:hover': { bgcolor: t.brandPrimaryHover } },
                '&:hover': { bgcolor: t.surfaceHover } } }}>
            <ToggleButton value="create">
              <AddIcon sx={{ fontSize: '1rem', mr: 0.75 }} />Create new repository
            </ToggleButton>
            <ToggleButton value="import">
              <UploadIcon sx={{ fontSize: '1rem', mr: 0.75 }} />Import existing repository
            </ToggleButton>
          </ToggleButtonGroup>

          {mode === 'create' ? (
            <Box sx={{ bgcolor: t.surface, border: `1px solid ${t.border}`, borderRadius: '16px', p: 3.5 }}>
              <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', color: t.textPrimary, mb: 0.5 }}>
                Create a new repository
              </Typography>
              <Typography sx={{ fontSize: '.82rem', color: t.textSecondary, mb: 3 }}>
                A repository contains all project files, revision history, and branches.
              </Typography>

              <Stack spacing={2.5}>
                {/* Name */}
                <Box>
                  <Typography sx={labelSx}>Repository name *</Typography>
                  <TextField fullWidth size="small" placeholder="my-awesome-project" value={repoName}
                    onChange={(e) => setRepoName(e.target.value)}
                    inputProps={{ style: { fontFamily: 'monospace' } }} sx={inputSx} />
                  {repoName && (
                    <Typography sx={{ fontSize: '.72rem', color: t.textTertiary, mt: 0.5, fontFamily: 'monospace' }}>
                      slug: {slugify(repoName)}
                    </Typography>
                  )}
                </Box>

                {/* Description */}
                <Box>
                  <Typography sx={labelSx}>Description <span style={{ color: t.textTertiary }}>(optional)</span></Typography>
                  <TextField fullWidth size="small" multiline rows={2} placeholder="What is this repository for?" value={repoDesc}
                    onChange={(e) => setRepoDesc(e.target.value)} sx={inputSx} />
                </Box>

                {/* Visibility */}
                <Box>
                  <Typography sx={labelSx}>Visibility</Typography>
                  <Stack spacing={1}>
                    {VISIBILITY_OPTIONS.map((opt) => (
                      <Box key={opt.value} onClick={() => setVisibility(opt.value)}
                        sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderRadius: '10px', border: `1.5px solid ${visibility === opt.value ? t.brandPrimary : t.border}`, bgcolor: visibility === opt.value ? 'rgba(21,61,117,.05)' : 'transparent', cursor: 'pointer', transition: 'all .15s', '&:hover': { borderColor: t.brandPrimary } }}>
                        <Box sx={{ width: 34, height: 34, borderRadius: '8px', bgcolor: visibility === opt.value ? 'rgba(21,61,117,.12)' : t.surfaceSubtle, display: 'flex', alignItems: 'center', justifyContent: 'center', color: visibility === opt.value ? t.brandPrimary : t.textSecondary, flexShrink: 0 }}>
                          {opt.icon}
                        </Box>
                        <Box>
                          <Typography sx={{ fontWeight: 700, fontSize: '.82rem', color: t.textPrimary }}>{opt.label}</Typography>
                          <Typography sx={{ fontSize: '.73rem', color: t.textSecondary }}>{opt.desc}</Typography>
                        </Box>
                      </Box>
                    ))}
                  </Stack>
                </Box>

                {/* Init README */}
                <Box onClick={() => setInitReadme(!initReadme)}
                  sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderRadius: '10px', border: `1.5px solid ${initReadme ? t.brandPrimary : t.border}`, bgcolor: initReadme ? 'rgba(21,61,117,.05)' : 'transparent', cursor: 'pointer', transition: 'all .15s' }}>
                  <Box sx={{ width: 20, height: 20, borderRadius: '4px', border: `2px solid ${initReadme ? t.brandPrimary : t.border}`, bgcolor: initReadme ? t.brandPrimary : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {initReadme && <Box component="span" sx={{ width: 10, height: 6, borderLeft: '2px solid #fff', borderBottom: '2px solid #fff', transform: 'rotate(-45deg)', mt: '-3px' }} />}
                  </Box>
                  <Box>
                    <Typography sx={{ fontWeight: 600, fontSize: '.82rem', color: t.textPrimary }}>Initialize with a README</Typography>
                    <Typography sx={{ fontSize: '.73rem', color: t.textSecondary }}>Creates a default README.md to describe this repository.</Typography>
                  </Box>
                </Box>

                <Button fullWidth variant="contained" size="large"
                  disabled={!repoName.trim() || !projectId || submitting}
                  onClick={handleCreate}
                  sx={{ bgcolor: t.brandPrimary, '&:hover': { bgcolor: t.brandPrimaryHover }, textTransform: 'none', fontWeight: 700, borderRadius: '10px', fontSize: '.9rem', mt: 0.5 }}>
                  {submitting ? 'Creating…' : 'Create repository'}
                </Button>

                {!projectId && (
                  <Alert severity="warning" sx={{ borderRadius: '8px' }}>
                    No project selected. Go back and open this page from a project dashboard.
                  </Alert>
                )}
              </Stack>
            </Box>
          ) : (
            <Box sx={{ bgcolor: t.surface, border: `1px solid ${t.border}`, borderRadius: '16px', p: 3.5 }}>
              <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', color: t.textPrimary, mb: 0.5 }}>
                Import an existing repository
              </Typography>
              <Typography sx={{ fontSize: '.82rem', color: t.textSecondary, mb: 3 }}>
                Bring in a repository from GitHub, GitLab, Bitbucket, or any Git URL.
              </Typography>

              <Stack spacing={2.5}>
                {/* Provider selector */}
                <Box>
                  <Typography sx={labelSx}>Source provider</Typography>
                  <Stack direction="row" spacing={1}>
                    {PROVIDERS.map((p) => (
                      <Box key={p.id} onClick={() => setProvider(p.id)}
                        sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.75, py: 1.5, borderRadius: '10px', border: `1.5px solid ${provider === p.id ? t.brandPrimary : t.border}`, bgcolor: provider === p.id ? 'rgba(21,61,117,.05)' : 'transparent', cursor: 'pointer', color: provider === p.id ? t.brandPrimary : t.textSecondary, transition: 'all .15s' }}>
                        {p.icon}
                        <Typography sx={{ fontSize: '.75rem', fontWeight: 600, color: 'inherit' }}>{p.label}</Typography>
                      </Box>
                    ))}
                  </Stack>
                </Box>

                <Box>
                  <Typography sx={labelSx}>Repository URL *</Typography>
                  <TextField fullWidth size="small" placeholder="https://github.com/org/repo.git" value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    inputProps={{ style: { fontFamily: 'monospace', fontSize: '.82rem' } }} sx={inputSx} />
                </Box>

                <Button fullWidth variant="contained" size="large"
                  disabled={!repoUrl.trim() || !projectId || submitting}
                  onClick={handleImport}
                  sx={{ bgcolor: t.brandPrimary, '&:hover': { bgcolor: t.brandPrimaryHover }, textTransform: 'none', fontWeight: 700, borderRadius: '10px', fontSize: '.9rem', mt: 0.5 }}>
                  {submitting ? 'Importing…' : 'Import repository'}
                </Button>

                {!projectId && (
                  <Alert severity="warning" sx={{ borderRadius: '8px' }}>
                    No project selected. Go back and open this page from a project dashboard.
                  </Alert>
                )}
              </Stack>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

const labelSx = {
  fontWeight: 600,
  fontSize: '.8rem',
  color: dashboardTokens.colors.textPrimary,
  mb: 0.75,
};

const inputSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '8px',
    bgcolor: dashboardTokens.colors.surfaceSubtle,
    '& fieldset': { borderColor: dashboardTokens.colors.border },
    '&:hover fieldset': { borderColor: dashboardTokens.colors.brandPrimary },
    '&.Mui-focused fieldset': { borderColor: dashboardTokens.colors.brandPrimary },
  },
};

export default RepoSetupPage;
