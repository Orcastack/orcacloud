import React, { useEffect, useState } from 'react';
import {
  Alert,
  Avatar,
  AvatarGroup,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  LinearProgress,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import FolderIcon from '@mui/icons-material/FolderOpenRounded';
import GitBranchIcon from '@mui/icons-material/AccountTree';
import BuildIcon from '@mui/icons-material/Build';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import GitHubIcon from '@mui/icons-material/GitHub';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useLocation, useNavigate } from 'react-router-dom';
import { dashboardTokens, dashboardSemanticColors } from '../styles/dashboardDesignSystem';
import { listProjects as listProjectsApi, deleteProject as deleteProjectApi, type BackendProject } from '../services/projectsApi';

const FONT = '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const t = dashboardTokens.colors;

type ProjectStatus = 'active' | 'in-progress' | 'completed' | 'archived';
type ProjectLang = 'TypeScript' | 'Python' | 'Go' | 'Rust' | 'Java' | 'HCL';

interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  language: ProjectLang;
  branch: string;
  progress: number;
  openIssues: number;
  lastBuild: 'passing' | 'failing' | 'pending';
  updatedAt: string;
  members: string[];
  tags: string[];
  provider: 'github' | 'gitlab' | 'bitbucket';
  has_repo: boolean;
  context?: 'personal' | 'workspace' | 'group';
  workspace_id?: string;
  workspace_name?: string;
  group_id?: string;
  group_name?: string;
  created_by_username?: string | null;
  owner_username?: string | null;
}

const mapBackendProject = (project: BackendProject): Project => ({
  id: project.id,
  name: project.name,
  description: project.description || 'Project created from server-backed flow.',
  status: 'in-progress',
  language: 'TypeScript',
  branch: 'main',
  progress: 8,
  openIssues: 0,
  lastBuild: 'pending',
  updatedAt: 'Just now',
  members: ['Y'],
  tags: ['server-backed'],
  provider: 'github',
  has_repo: project.has_repo ?? false,
  context: project.context,
  workspace_id: project.workspace_id,
  workspace_name: project.workspace_name,
  group_id: project.group_id,
  group_name: project.group_name,
  created_by_username: project.created_by_username,
  owner_username: project.owner_username,
});

const STATUS_CONFIG: Record<ProjectStatus, { color: string; bg: string; label: string }> = {
  active:      { color: dashboardSemanticColors.success, bg: 'rgba(34,197,94,.12)',   label: 'Active'      },
  'in-progress':{ color: dashboardSemanticColors.info,   bg: 'rgba(21,61,117,.12)',   label: 'In Progress' },
  completed:   { color: dashboardSemanticColors.purple,  bg: 'rgba(139,92,246,.12)',  label: 'Completed'   },
  archived:    { color: dashboardTokens.colors.textSecondary, bg: 'rgba(100,116,139,.12)', label: 'Archived'    },
};

const PROVIDER_ICON: Record<string, React.ReactNode> = {
  github:    <GitHubIcon sx={{ fontSize: '.85rem' }} />,
  gitlab:    <Box component="span" sx={{ fontWeight: 900, fontSize: '.72rem', color: '#fc6d26' }}>GL</Box>,
  bitbucket: <Box component="span" sx={{ fontWeight: 900, fontSize: '.72rem', color: '#0052cc' }}>BB</Box>,
};

const LANG_COLOR: Record<ProjectLang, string> = {
  TypeScript: '#3178c6',
  Python:     '#f7c948',
  Go:         '#00acd7',
  Rust:       '#ce422b',
  Java:       '#f89820',
  HCL:        '#7b42bc',
};

const BUILD_CONFIG = {
  passing: { color: dashboardSemanticColors.success, label: 'Passing', icon: <CheckCircleIcon sx={{ fontSize: '.78rem' }} /> },
  failing: { color: dashboardSemanticColors.danger,  label: 'Failing', icon: <RadioButtonUncheckedIcon sx={{ fontSize: '.78rem' }} /> },
  pending: { color: dashboardSemanticColors.warning, label: 'Pending', icon: <HourglassTopIcon sx={{ fontSize: '.78rem' }} /> },
};

const MEMBER_COLORS = ['#153d75', '#8B5CF6', '#F97316', '#22C55E', '#EC4899'];

const DevProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [projects, setProjects] = useState<Project[]>([]);
  const [query, setQuery]       = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | ProjectStatus>('all');
  const [snack, setSnack]               = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [deleteInput, setDeleteInput]   = useState('');
  const [deletingProject, setDeletingProject] = useState(false);

  useEffect(() => {
    const message = (location.state as { snack?: string } | null)?.snack;
    if (message) {
      setSnack(message);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const backendProjects = await listProjectsApi();
        if (!mounted) return;
        setProjects(backendProjects.map(mapBackendProject));
      } catch (error: any) {
        if (!mounted) return;
        const status = error?.response?.status;
        if (status === 401) {
          setSnack('Unable to load projects from backend. Please sign in again.');
        } else {
          setSnack('Unable to load projects from backend.');
        }
        setProjects([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleDeleteProject = async () => {
    if (!deleteTarget) return;
    setDeletingProject(true);
    try {
      await deleteProjectApi(deleteTarget.id);
      setProjects(prev => prev.filter(p => p.id !== deleteTarget.id));
      setSnack(`Project "${deleteTarget.name}" deleted.`);
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 401) {
        setSnack('Project was not deleted. Please sign in again.');
      } else {
        setSnack('Project was not deleted in backend.');
      }
    } finally {
      setDeletingProject(false);
      setDeleteTarget(null);
      setDeleteInput('');
    }
  };

  const filtered = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.description.toLowerCase().includes(query.toLowerCase()) ||
      p.tags.some((tag) => tag.toLowerCase().includes(query.toLowerCase()));
    const matchesFilter = activeFilter === 'all' || p.status === activeFilter;
    return matchesSearch && matchesFilter;
  });

  const counts = {
    all:           projects.length,
    active:        projects.filter(p => p.status === 'active').length,
    'in-progress': projects.filter(p => p.status === 'in-progress').length,
    completed:     projects.filter(p => p.status === 'completed').length,
    archived:      projects.filter(p => p.status === 'archived').length,
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, fontFamily: FONT }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.2rem', md: '1.35rem' }, color: t.textPrimary, fontFamily: FONT, letterSpacing: '-.02em' }}>
            Projects
          </Typography>
          <Typography sx={{ color: t.textSecondary, fontSize: '.875rem', mt: 0.3, fontFamily: FONT }}>
            All developer projects — track progress, builds, branches, and team ownership.
          </Typography>
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => navigate('/developer/Dashboard/projects/new')}
            sx={{
              bgcolor: dashboardTokens.colors.brandPrimary,
              color: '#0a0f1a',
              fontWeight: 700,
              fontSize: '.8rem',
              borderRadius: '6px',
              textTransform: 'none',
              boxShadow: 'none',
              '&:hover': { bgcolor: dashboardTokens.colors.brandPrimaryHover, boxShadow: 'none' },
            }}
          >
            New Project
          </Button>
        </Stack>
      </Box>

      {/* Stats bar */}
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} sx={{ mb: 3 }}>
        {[
          { label: 'Total',       value: projects.length,                                             color: dashboardSemanticColors.info    },
          { label: 'Active',      value: counts.active,                                               color: dashboardSemanticColors.success  },
          { label: 'In Progress', value: counts['in-progress'],                                       color: dashboardSemanticColors.info    },
          { label: 'Completed',   value: counts.completed,                                            color: dashboardSemanticColors.purple  },
          { label: 'Archived',    value: counts.archived,                                             color: t.textSecondary                 },
          { label: 'Failing',     value: projects.filter(p => p.lastBuild === 'failing').length,      color: dashboardSemanticColors.danger  },
        ].map((s) => (
          <Card key={s.label} sx={{ flex: 1, border: `1px solid ${t.border}`, bgcolor: t.surface, boxShadow: 'none', borderRadius: '8px' }}>
            <CardContent sx={{ p: '12px 16px !important' }}>
              <Typography sx={{ fontSize: '.72rem', fontWeight: 600, color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.08em', fontFamily: FONT }}>
                {s.label}
              </Typography>
              <Typography sx={{ fontSize: '1.5rem', fontWeight: 800, color: s.color, lineHeight: 1.2, fontFamily: FONT }}>
                {s.value}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Stack>

      {/* Filter + search row */}
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={1} alignItems={{ sm: 'center' }} sx={{ mb: 2.5 }}>
        <Stack direction="row" gap={0.5} flexWrap="wrap">
          {(['all', 'active', 'in-progress', 'completed', 'archived'] as const).map((f) => {
            const cfg = f === 'all' ? null : STATUS_CONFIG[f];
            const isActive = activeFilter === f;
            return (
              <Button
                key={f}
                size="small"
                onClick={() => setActiveFilter(f)}
                sx={{
                  textTransform: 'capitalize',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '.78rem',
                  borderRadius: '6px',
                  px: 1.25,
                  color: isActive ? (cfg?.color ?? dashboardTokens.colors.brandPrimary) : t.textSecondary,
                  bgcolor: isActive ? (cfg?.bg ?? 'rgba(21,61,117,.10)') : 'transparent',
                  border: `1px solid ${isActive ? (cfg?.color ?? dashboardTokens.colors.brandPrimary) + '44' : 'transparent'}`,
                  '&:hover': { bgcolor: cfg?.bg ?? 'rgba(21,61,117,.07)' },
                }}
              >
                {f === 'all' ? `All (${counts.all})` : `${f.replace('-', ' ')} (${counts[f]})`}
              </Button>
            );
          })}
        </Stack>
        <TextField
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search projects, tags…"
          size="small"
          sx={{
            ml: { sm: 'auto' },
            minWidth: 220,
            '& .MuiOutlinedInput-root': {
              bgcolor: t.surface, color: t.textPrimary, borderRadius: '8px', fontSize: '.875rem',
              '& fieldset': { borderColor: t.border },
              '&:hover fieldset': { borderColor: t.borderStrong },
              '&.Mui-focused fieldset': { borderColor: dashboardTokens.colors.brandPrimary, boxShadow: '0 0 0 3px rgba(21,61,117,0.14)' },
            },
            '& .MuiInputBase-input::placeholder': { color: t.textSecondary, opacity: 1 },
          }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: t.textSecondary, fontSize: '1rem' }} /></InputAdornment>,
          }}
        />
      </Stack>

      {/* Project cards grid */}
      {filtered.length === 0 ? (
        <Box sx={{ border: `1px dashed ${t.border}`, borderRadius: '10px', p: 4, textAlign: 'center' }}>
          <Typography sx={{ color: t.textSecondary, fontFamily: FONT }}>No projects match your search.</Typography>
        </Box>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' },
            gap: 1.5,
          }}
        >
          {filtered.map((project) => {
            const status = STATUS_CONFIG[project.status];
            const build  = BUILD_CONFIG[project.lastBuild];
            return (
              <Card
                key={project.id}
                sx={{
                  position: 'relative',
                  border: `1px solid ${t.border}`,
                  bgcolor: t.surface,
                  boxShadow: 'none',
                  borderRadius: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all .14s',
                  '& .proj-del': { opacity: 0, transition: 'opacity .15s' },
                  '&:hover': { borderColor: dashboardTokens.colors.brandPrimary + '66', boxShadow: `0 0 0 1px ${dashboardTokens.colors.brandPrimary}22`, transform: 'translateY(-1px)', '& .proj-del': { opacity: 1 } },
                }}
              >
                <CardActionArea
                  onClick={() => { if (project.id) navigate(`/developer/Dashboard/projects/${project.id}`); }}
                  sx={{ flex: 1, p: 0, borderRadius: '10px', '&:hover': { bgcolor: 'transparent' } }}
                >
                  <CardContent sx={{ p: '16px !important', display: 'flex', flexDirection: 'column', height: '100%', gap: 1.25 }}>

                    {/* Top row */}
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                      <Box sx={{ width: 34, height: 34, borderRadius: '8px', bgcolor: 'rgba(21,61,117,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: dashboardTokens.colors.brandPrimary, flexShrink: 0 }}>
                        <FolderIcon sx={{ fontSize: '1rem' }} />
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: '.925rem', color: t.textPrimary, fontFamily: FONT, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {project.name}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                          <GitBranchIcon sx={{ fontSize: '.7rem', color: t.textSecondary }} />
                          <Typography sx={{ fontSize: '.72rem', color: t.textSecondary, fontFamily: FONT }}>{project.branch}</Typography>
                        </Box>
                      </Box>
                      <Tooltip title={project.provider}>
                        <Box sx={{ color: t.textSecondary, display: 'flex', alignItems: 'center' }}>
                          {PROVIDER_ICON[project.provider]}
                        </Box>
                      </Tooltip>
                      <ArrowForwardIosIcon sx={{ fontSize: '.65rem', color: t.textSecondary, opacity: 0.4, flexShrink: 0 }} />
                    </Box>

                    {/* Description */}
                    <Typography sx={{ fontSize: '.82rem', color: t.textSecondary, fontFamily: FONT, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {project.description}
                    </Typography>

                    {/* Tags */}
                    <Stack direction="row" gap={0.5} flexWrap="wrap">
                      {project.tags.map((tag) => (
                        <Chip key={tag} label={tag} size="small" sx={{ bgcolor: t.surfaceSubtle, color: t.textSecondary, border: `1px solid ${t.border}`, fontSize: '.68rem', height: 18, '& .MuiChip-label': { px: 0.7 } }} />
                      ))}
                    </Stack>

                    <Divider sx={{ borderColor: t.border }} />

                    {/* Progress */}
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography sx={{ fontSize: '.72rem', color: t.textSecondary, fontFamily: FONT }}>Progress</Typography>
                        <Typography sx={{ fontSize: '.72rem', fontWeight: 700, color: status.color, fontFamily: FONT }}>{project.progress}%</Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={project.progress}
                        sx={{
                          height: 4, borderRadius: 2,
                          bgcolor: `${status.color}22`,
                          '& .MuiLinearProgress-bar': { bgcolor: status.color, borderRadius: 2 },
                        }}
                      />
                    </Box>

                    {/* Footer meta row */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      {/* Status */}
                      <Chip label={status.label} size="small" sx={{ bgcolor: status.bg, color: status.color, fontWeight: 700, fontSize: '.68rem', height: 18, '& .MuiChip-label': { px: 0.7 } }} />

                      {/* Context badge */}
                      {project.context === 'workspace' && project.workspace_id ? (
                        <Tooltip title={`Workspace ID: ${project.workspace_id}`}>
                          <Chip
                            label={project.workspace_name ? `WS: ${project.workspace_name}` : 'Workspace'}
                            size="small"
                            sx={{ bgcolor: 'rgba(21,61,117,.1)', color: '#153d75', border: '1px solid rgba(21,61,117,.25)', fontWeight: 700, fontSize: '.6rem', height: 18, '& .MuiChip-label': { px: 0.7 } }}
                          />
                        </Tooltip>
                      ) : project.context === 'group' && project.group_id ? (
                        <Tooltip title={`Group ID: ${project.group_id}`}>
                          <Chip
                            label={project.group_name ? `Group: ${project.group_name}` : 'Group'}
                            size="small"
                            sx={{ bgcolor: 'rgba(34,197,94,.1)', color: '#16A34A', border: '1px solid rgba(34,197,94,.25)', fontWeight: 700, fontSize: '.6rem', height: 18, '& .MuiChip-label': { px: 0.7 } }}
                          />
                        </Tooltip>
                      ) : (
                        <Chip
                          label="Personal"
                          size="small"
                          sx={{ bgcolor: `${t.brandPrimary}10`, color: t.brandPrimary, border: `1px solid ${t.brandPrimary}28`, fontWeight: 700, fontSize: '.6rem', height: 18, '& .MuiChip-label': { px: 0.7 } }}
                        />
                      )}

                      {/* Created by (if different from owner) */}
                      {project.created_by_username && project.created_by_username !== project.owner_username && (
                        <Tooltip title={`Created by ${project.created_by_username}`}>
                          <Typography sx={{ fontSize: '.63rem', color: t.textTertiary, fontFamily: FONT, ml: 0.25 }}>
                            by {project.created_by_username}
                          </Typography>
                        </Tooltip>
                      )}

                      {/* Language dot */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                        <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: LANG_COLOR[project.language] }} />
                        <Typography sx={{ fontSize: '.72rem', color: t.textSecondary, fontFamily: FONT }}>{project.language}</Typography>
                      </Box>

                      {/* Build */}
                      <Tooltip title={`Build ${build.label}`}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, color: build.color }}>
                          <BuildIcon sx={{ fontSize: '.72rem' }} />
                          <Typography sx={{ fontSize: '.72rem', fontWeight: 600, fontFamily: FONT, color: build.color }}>{build.label}</Typography>
                        </Box>
                      </Tooltip>

                      {/* Issues */}
                      {project.openIssues > 0 && (
                        <Typography sx={{ fontSize: '.72rem', color: project.openIssues > 8 ? dashboardSemanticColors.danger : t.textSecondary, fontFamily: FONT, ml: 'auto' }}>
                          {project.openIssues} issues
                        </Typography>
                      )}

                      {/* Members */}
                      <AvatarGroup max={3} sx={{ ml: project.openIssues > 0 ? 0 : 'auto', '& .MuiAvatar-root': { width: 20, height: 20, fontSize: '.6rem', fontWeight: 700 } }}>
                        {project.members.map((m, i) => (
                          <Avatar key={m + i} sx={{ bgcolor: MEMBER_COLORS[i % MEMBER_COLORS.length], color: '#0a0f1a' }}>{m}</Avatar>
                        ))}
                      </AvatarGroup>

                      <Typography sx={{ fontSize: '.72rem', color: t.textTertiary, fontFamily: FONT, whiteSpace: 'nowrap' }}>{project.updatedAt}</Typography>
                    </Box>

                  </CardContent>
                </CardActionArea>
                <Box
                  sx={{
                    px: 2, pb: 1.25, pt: 0,
                    borderTop: `1px solid ${t.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}
                >
                  <Button
                    size="small"
                    variant="text"
                    startIcon={<GitBranchIcon sx={{ fontSize: '.75rem' }} />}
                    onClick={(e) => { e.stopPropagation(); if (project.id) navigate(`/developer/Dashboard/projects/${project.id}/repo`); }}
                    sx={{
                      textTransform: 'none', fontWeight: 700, fontSize: '.75rem',
                      color: project.has_repo ? dashboardTokens.colors.brandPrimary : t.textSecondary,
                      fontFamily: FONT,
                      px: 0.75, py: 0.5, mt: 0.75,
                      borderRadius: '6px',
                      '&:hover': { bgcolor: 'rgba(21,61,117,.08)', color: dashboardTokens.colors.brandPrimary },
                    }}
                  >
                    {project.has_repo ? 'Open Repository' : 'Set up Repository'}
                  </Button>
                  <Chip
                    label={project.has_repo ? 'Repo' : 'No Repo'}
                    size="small"
                    sx={{
                      mt: 0.75,
                      bgcolor: project.has_repo ? 'rgba(21,61,117,.10)' : t.surfaceSubtle,
                      color: project.has_repo ? dashboardTokens.colors.brandPrimary : t.textTertiary,
                      fontWeight: 700, fontSize: '.65rem', height: 18,
                      border: `1px solid ${project.has_repo ? dashboardTokens.colors.brandPrimary + '44' : t.border}`,
                      '& .MuiChip-label': { px: 0.7 },
                    }}
                  />
                </Box>
                <Tooltip title="Delete project">
                  <IconButton
                    className="proj-del"
                    size="small"
                    onClick={() => setDeleteTarget(project)}
                    sx={{
                      position: 'absolute', top: 10, right: 10,
                      color: dashboardSemanticColors.danger,
                      bgcolor: 'rgba(239,68,68,.08)',
                      width: 26, height: 26,
                      '&:hover': { bgcolor: 'rgba(239,68,68,.2)' },
                    }}
                  >
                    <DeleteOutlineIcon sx={{ fontSize: '.8rem' }} />
                  </IconButton>
                </Tooltip>
              </Card>
            );
          })}
        </Box>
      )}
      {/* ── Delete project confirmation ──────────────────────────── */}
      <Dialog
        open={!!deleteTarget}
        onClose={() => { if (!deletingProject) { setDeleteTarget(null); setDeleteInput('') } }}
        PaperProps={{ sx: { bgcolor: dashboardTokens.colors.surface, border: `1px solid rgba(239,68,68,.4)`, borderRadius: '12px', minWidth: 420 } }}
      >
        <DialogTitle sx={{ color: dashboardSemanticColors.danger, fontFamily: FONT, fontSize: '1rem', fontWeight: 800, pb: 1 }}>
          Delete Project
        </DialogTitle>
        <DialogContent sx={{ pt: '0 !important' }}>
          <Alert severity="error" sx={{ mb: 2, fontSize: '.82rem', fontFamily: FONT }}>
            This action is <strong>permanent and irreversible.</strong> All pipelines, deployments,
            and data for <strong>{deleteTarget?.name}</strong> will be deleted.
          </Alert>
          <Typography sx={{ fontSize: '.82rem', color: dashboardTokens.colors.textSecondary, fontFamily: FONT, mb: 1.25 }}>
            Type{' '}
            <Box component="strong" sx={{ color: dashboardTokens.colors.textPrimary, fontFamily: 'monospace' }}>
              {deleteTarget?.name}
            </Box>{' '}
            to confirm.
          </Typography>
          <TextField
            size="small"
            fullWidth
            autoComplete="off"
            value={deleteInput}
            onChange={e => setDeleteInput(e.target.value)}
            placeholder={deleteTarget?.name ?? ''}
            sx={{
              '& .MuiOutlinedInput-root': { bgcolor: 'rgba(239,68,68,.05)', color: dashboardTokens.colors.textPrimary, fontSize: '.82rem', fontFamily: 'monospace' },
              '& fieldset': { borderColor: dashboardTokens.colors.border },
              '& .MuiOutlinedInput-root:hover fieldset': { borderColor: dashboardSemanticColors.danger },
              '& .MuiOutlinedInput-root.Mui-focused fieldset': { borderColor: dashboardSemanticColors.danger },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button
            onClick={() => { setDeleteTarget(null); setDeleteInput('') }}
            disabled={deletingProject}
            sx={{ color: dashboardTokens.colors.textSecondary, textTransform: 'none', fontFamily: FONT, fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteProject}
            disabled={deleteInput !== deleteTarget?.name || deletingProject}
            sx={{ fontWeight: 700, textTransform: 'none', fontFamily: FONT, boxShadow: 'none', minWidth: 140 }}
          >
            {deletingProject
              ? <Stack direction="row" alignItems="center" spacing={0.8}><CircularProgress size={13} sx={{ color: '#fff' }} /><span>Deleting…</span></Stack>
              : 'Delete Project'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!snack}
        autoHideDuration={5000}
        onClose={() => setSnack(null)}
        message={snack}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        ContentProps={{ sx: { bgcolor: dashboardSemanticColors.success, color: '#fff', fontFamily: FONT, fontSize: '.82rem', fontWeight: 600 } }}
      />
    </Box>
  );
};

export default DevProjectsPage;
