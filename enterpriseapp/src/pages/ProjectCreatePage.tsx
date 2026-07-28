/**
 * ProjectCreatePage — Single-step project creation form.
 *
 * Exactly like GitHub / GitLab / Bitbucket:
 *  • One form (no wizard)
 *  • Fields: Name, Project Key, Description, Visibility
 *  • On submit → POST /api/services/pipelines/projects/ → redirect to project dashboard
 *  • Nothing else is created at this step (no repo, no workspace, no environment)
 */

import React, { useEffect, useState } from 'react';
import {
  Alert, Box, Button, CircularProgress, Divider,
  FormControl, FormControlLabel, FormHelperText,
  InputLabel, MenuItem, Radio, RadioGroup, Select,
  Stack, TextField, Typography,
} from '@mui/material';
import LockOutlinedIcon       from '@mui/icons-material/LockOutlined';
import GroupsIcon             from '@mui/icons-material/Groups';
import PublicIcon             from '@mui/icons-material/Public';
import ArrowBackIcon          from '@mui/icons-material/ArrowBack';
import AccountTreeIcon        from '@mui/icons-material/AccountTree';
import { useNavigate }        from 'react-router-dom';
import { dashboardTokens, dashboardSemanticColors } from '../styles/dashboardDesignSystem';
import { createProject } from '../services/projectsApi';

const FONT = dashboardTokens.typography.fontFamily;
const t    = dashboardTokens.colors;

const slugify = (v: string) =>
  v.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const VISIBILITY_OPTIONS = [
  {
    value:       'private' as const,
    label:       'Private',
    description: 'Only you and invited members can see this project.',
    icon:        <LockOutlinedIcon sx={{ fontSize: '1.1rem' }} />,
  },
  {
    value:       'team' as const,
    label:       'Team',
    description: 'Visible to all members within your organization.',
    icon:        <GroupsIcon sx={{ fontSize: '1.1rem' }} />,
  },
  {
    value:       'public' as const,
    label:       'Public',
    description: 'Anyone on the internet can view this project.',
    icon:        <PublicIcon sx={{ fontSize: '1.1rem' }} />,
  },
];

const AVATAR_COLORS = [
  '#153d75', '#7c3aed', '#db2777', '#dc2626',
  '#b45309', '#047857', '#0284c7', '#475569',
];

const ProjectCreatePage: React.FC = () => {
  const navigate = useNavigate();

  const [name,        setName]        = useState('');
  const [projectKey,  setProjectKey]  = useState('');
  const [keyEdited,   setKeyEdited]   = useState(false);
  const [description, setDescription] = useState('');
  const [visibility,  setVisibility]  = useState<'private' | 'team' | 'public'>('private');
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0]);

  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  // Auto-derive project key from name (unless manually edited)
  useEffect(() => {
    if (!keyEdited) {
      setProjectKey(slugify(name));
    }
  }, [name, keyEdited]);

  const handleKeyChange = (v: string) => {
    setProjectKey(slugify(v));
    setKeyEdited(v !== '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Project name is required.'); return; }
    if (!projectKey.trim()) { setError('Project key is required.'); return; }

    setSaving(true);
    setError(null);
    try {
      const project = await createProject({
        name:        name.trim(),
        project_key: projectKey.trim(),
        description: description.trim(),
        visibility,
        avatar_color: avatarColor,
      });
      navigate(`/developer/Dashboard/projects/${project.id}`, { replace: true });
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.response?.data?.name?.[0];
      setError(detail ?? 'Failed to create project. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  /* ── render ── */
  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: t.background,
        display:  'flex',
        flexDirection: 'column',
        fontFamily: FONT,
      }}
    >
      {/* ── top nav ── */}
      <Box
        sx={{
          px: 3, py: 1.5,
          borderBottom: `1px solid ${t.border}`,
          bgcolor: t.surface,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        <Button
          size="small"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/developer/Dashboard/projects')}
          sx={{ textTransform: 'none', color: t.textSecondary, '&:hover': { color: t.textPrimary } }}
        >
          Projects
        </Button>
        <Typography sx={{ color: t.textTertiary }}>/</Typography>
        <Typography sx={{ fontWeight: 600, color: t.textPrimary, fontSize: '.9rem' }}>
          Create new project
        </Typography>
      </Box>

      {/* ── body ── */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          py: { xs: 3, md: 6 },
          px: 2,
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 660 }}>

          {/* heading */}
          <Stack direction="row" alignItems="center" gap={1.5} mb={3}>
            <Box
              sx={{
                width: 40, height: 40, borderRadius: '10px',
                bgcolor: 'rgba(21,61,117,.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <AccountTreeIcon sx={{ color: t.brandPrimary, fontSize: '1.3rem' }} />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: '1.35rem', color: t.textPrimary, lineHeight: 1.2 }}>
                Create a new project
              </Typography>
              <Typography sx={{ color: t.textSecondary, fontSize: '.85rem', mt: 0.25 }}>
                A project is an empty container. Add a repository, workspace, and environments after creation.
              </Typography>
            </Box>
          </Stack>

          {error && (
            <Alert severity="error" sx={{ mb: 2.5 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{
              bgcolor: t.surface,
              border: `1px solid ${t.border}`,
              borderRadius: '12px',
              p: { xs: 2.5, md: 3.5 },
            }}
          >
            {/* ── Name + Key row ── */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={2.5}>
              <Box flex={1}>
                <Typography sx={{ fontSize: '.82rem', fontWeight: 600, color: t.textSecondary, mb: 0.75 }}>
                  Project name <Box component="span" sx={{ color: dashboardSemanticColors.danger }}>*</Box>
                </Typography>
                <TextField
                  fullWidth size="small"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Awesome Project"
                  autoFocus
                  sx={{ '& .MuiInputBase-root': { bgcolor: t.surfaceSubtle, color: t.textPrimary } }}
                />
              </Box>

              <Box flex={1}>
                <Typography sx={{ fontSize: '.82rem', fontWeight: 600, color: t.textSecondary, mb: 0.75 }}>
                  Project key <Box component="span" sx={{ color: dashboardSemanticColors.danger }}>*</Box>
                </Typography>
                <TextField
                  fullWidth size="small"
                  value={projectKey}
                  onChange={(e) => handleKeyChange(e.target.value)}
                  placeholder="my-awesome-project"
                  helperText="URL-safe identifier, auto-generated from your project name"
                  sx={{
                    '& .MuiInputBase-root': { bgcolor: t.surfaceSubtle, color: t.textPrimary, fontFamily: 'monospace' },
                    '& .MuiFormHelperText-root': { color: t.textTertiary, fontSize: '.72rem' },
                  }}
                />
              </Box>
            </Stack>

            {/* ── Description ── */}
            <Box mb={2.5}>
              <Typography sx={{ fontSize: '.82rem', fontWeight: 600, color: t.textSecondary, mb: 0.75 }}>
                Description
              </Typography>
              <TextField
                fullWidth size="small"
                multiline rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this project for? (optional)"
                sx={{ '& .MuiInputBase-root': { bgcolor: t.surfaceSubtle, color: t.textPrimary } }}
              />
            </Box>

            <Divider sx={{ borderColor: t.border, my: 2.5 }} />

            {/* ── Visibility ── */}
            <Box mb={2.5}>
              <Typography sx={{ fontSize: '.82rem', fontWeight: 600, color: t.textSecondary, mb: 1 }}>
                Visibility
              </Typography>
              <Stack spacing={1}>
                {VISIBILITY_OPTIONS.map((opt) => (
                  <Box
                    key={opt.value}
                    onClick={() => setVisibility(opt.value)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      p: 1.5,
                      border: `1.5px solid ${visibility === opt.value ? t.brandPrimary : t.border}`,
                      borderRadius: '8px',
                      bgcolor: visibility === opt.value ? `${t.brandPrimary}0d` : t.surfaceSubtle,
                      cursor: 'pointer',
                      transition: 'all .15s',
                      '&:hover': { borderColor: t.brandPrimary },
                    }}
                  >
                    <Box
                      sx={{
                        width: 20, height: 20,
                        borderRadius: '50%',
                        border: `2px solid ${visibility === opt.value ? t.brandPrimary : t.border}`,
                        bgcolor: visibility === opt.value ? t.brandPrimary : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                        transition: 'all .15s',
                      }}
                    >
                      {visibility === opt.value && (
                        <Box sx={{ width: 7, height: 7, bgcolor: '#fff', borderRadius: '50%' }} />
                      )}
                    </Box>
                    <Box
                      sx={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: visibility === opt.value ? t.brandPrimary : t.textSecondary,
                        flexShrink: 0,
                      }}
                    >
                      {opt.icon}
                    </Box>
                    <Box flex={1}>
                      <Typography sx={{ fontSize: '.88rem', fontWeight: 700, color: t.textPrimary }}>
                        {opt.label}
                      </Typography>
                      <Typography sx={{ fontSize: '.75rem', color: t.textSecondary }}>
                        {opt.description}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Stack>
            </Box>

            <Divider sx={{ borderColor: t.border, my: 2.5 }} />

            {/* ── Avatar colour ── */}
            <Box mb={3}>
              <Typography sx={{ fontSize: '.82rem', fontWeight: 600, color: t.textSecondary, mb: 1 }}>
                Project colour
              </Typography>
              <Stack direction="row" spacing={1}>
                {AVATAR_COLORS.map((c) => (
                  <Box
                    key={c}
                    onClick={() => setAvatarColor(c)}
                    sx={{
                      width: 28, height: 28, borderRadius: '6px', bgcolor: c, cursor: 'pointer',
                      border: avatarColor === c ? `2.5px solid ${t.textPrimary}` : '2.5px solid transparent',
                      transition: 'border .1s',
                      '&:hover': { opacity: .85 },
                    }}
                  />
                ))}
              </Stack>
            </Box>

            {/* ── Preview ── */}
            <Box
              sx={{
                p: 2, mb: 3,
                bgcolor: t.surfaceSubtle,
                border: `1px dashed ${t.border}`,
                borderRadius: '8px',
              }}
            >
              <Typography sx={{ fontSize: '.72rem', color: t.textTertiary, mb: 1, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                Preview
              </Typography>
              <Stack direction="row" alignItems="center" gap={1.5}>
                <Box
                  sx={{
                    width: 36, height: 36, borderRadius: '8px', bgcolor: avatarColor,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '.95rem' }}>
                    {(name || 'P')[0].toUpperCase()}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 700, color: t.textPrimary, fontSize: '.9rem' }}>
                    {name || 'Project name'}
                  </Typography>
                  <Typography sx={{ color: t.textTertiary, fontSize: '.75rem', fontFamily: 'monospace' }}>
                    {projectKey || 'project-key'}
                  </Typography>
                </Box>
              </Stack>
            </Box>

            {/* ── Submit ── */}
            <Stack direction="row" justifyContent="flex-end" gap={1.5}>
              <Button
                variant="outlined"
                onClick={() => navigate('/developer/Dashboard/projects')}
                sx={{ textTransform: 'none', borderColor: t.border, color: t.textSecondary }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={saving || !name.trim() || !projectKey.trim()}
                sx={{
                  bgcolor: t.brandPrimary,
                  '&:hover': { bgcolor: t.brandPrimaryHover },
                  textTransform: 'none',
                  fontWeight: 700,
                  boxShadow: 'none',
                  minWidth: 140,
                }}
              >
                {saving ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : 'Create project'}
              </Button>
            </Stack>
          </Box>

          {/* What happens next */}
          <Box
            sx={{
              mt: 2.5, p: 2,
              bgcolor: 'rgba(21,61,117,.05)',
              border: `1px solid rgba(21,61,117,.15)`,
              borderRadius: '10px',
            }}
          >
            <Typography sx={{ fontWeight: 700, color: t.textPrimary, fontSize: '.85rem', mb: 1 }}>
              What happens after you create this project?
            </Typography>
            <Stack spacing={0.75}>
              {[
                'You\'ll land on the project dashboard (empty state)',
                'Add a repository — new, import from GitHub/GitLab/Bitbucket, or attach existing',
                'Optionally add a workspace (cloud dev environment)',
                'Optionally configure environments (dev / stage / prod)',
                'Optionally attach groups, containers, and Kubernetes workloads',
                'CI/CD activates automatically when a repository is connected',
              ].map((step, i) => (
                <Stack key={i} direction="row" alignItems="flex-start" gap={1}>
                  <Box
                    sx={{
                      width: 18, height: 18, borderRadius: '50%',
                      bgcolor: 'rgba(21,61,117,.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, mt: '1px',
                    }}
                  >
                    <Typography sx={{ fontSize: '.65rem', fontWeight: 800, color: t.brandPrimary }}>
                      {i + 1}
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: '.8rem', color: t.textSecondary }}>{step}</Typography>
                </Stack>
              ))}
            </Stack>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default ProjectCreatePage;
