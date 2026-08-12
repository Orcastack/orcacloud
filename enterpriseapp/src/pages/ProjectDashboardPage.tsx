import React, { useEffect, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AccountTreeIcon    from '@mui/icons-material/AccountTree';
import AddIcon            from '@mui/icons-material/Add';
import ArrowBackIcon      from '@mui/icons-material/ArrowBack';
import CalendarTodayIcon  from '@mui/icons-material/CalendarToday';
import CallSplitIcon      from '@mui/icons-material/CallSplit';
import CheckCircleIcon    from '@mui/icons-material/CheckCircle';
import DataObjectIcon     from '@mui/icons-material/DataObject';
import DeleteOutlineIcon  from '@mui/icons-material/DeleteOutline';
import DevicesIcon        from '@mui/icons-material/Devices';
import GitHubIcon         from '@mui/icons-material/GitHub';
import GroupIcon          from '@mui/icons-material/Group';
import HubIcon            from '@mui/icons-material/Hub';
import LayersIcon         from '@mui/icons-material/Layers';
import LinkIcon           from '@mui/icons-material/Link';
import LockIcon           from '@mui/icons-material/Lock';
import OpenInNewIcon      from '@mui/icons-material/OpenInNew';
import PersonIcon         from '@mui/icons-material/Person';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import PublicIcon         from '@mui/icons-material/Public';
import SaveIcon           from '@mui/icons-material/Save';
import SettingsIcon       from '@mui/icons-material/Settings';
import StorageIcon        from '@mui/icons-material/Storage';
import TerminalIcon       from '@mui/icons-material/Terminal';
import UploadIcon         from '@mui/icons-material/Upload';
import WebhookIcon        from '@mui/icons-material/Webhook';
import { useNavigate, useParams } from 'react-router-dom';
import { dashboardTokens, dashboardSemanticColors } from '../styles/dashboardDesignSystem';
import { getProject, updateProject, listProjectRepos, getRepoTree, updateRepo, deleteProject, deleteRepo, type BackendProject, type BackendRepository, type TreeNode } from '../services/projectsApi';
import { FileViewer } from '../components/FileTreeExplorer';
import FileTreeExplorer from '../components/FileTreeExplorer';
import FileBrowserPanel from '../components/FileBrowserPanel';

const FONT = dashboardTokens.typography.fontFamily;
const t = dashboardTokens.colors;
const PROJECT_LIST_KEY = 'orcacloud:projects:list:v1';
const LEGACY_PROJECT_LIST_KEY = 'orcacloud:projects:list:v1';

function readProjectListCache<T = any>(): T[] {
  const raw = localStorage.getItem(PROJECT_LIST_KEY) || localStorage.getItem(LEGACY_PROJECT_LIST_KEY) || '[]';
  return JSON.parse(raw) as T[];
}

function writeProjectListCache<T = any>(records: T[]): void {
  const serialized = JSON.stringify(records);
  localStorage.setItem(PROJECT_LIST_KEY, serialized);
  localStorage.setItem(LEGACY_PROJECT_LIST_KEY, serialized);
}

// ─── Service sidebar links

interface ServiceLink {
  label: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  badge?: string;
  badgeColor?: string;
}

const SERVICE_LINKS: ServiceLink[] = [
  { label: 'CI/CD Pipelines',      description: 'Build, test & deploy',        icon: <PlayCircleOutlineIcon />, path: '/developer/Dashboard/cicd' },
  { label: 'Containers',           description: 'Container registry & images',  icon: <LayersIcon />,            path: '/developer/Dashboard/containers' },
  { label: 'Kubernetes',           description: 'Clusters & deployments',       icon: <HubIcon />,               path: '/developer/Dashboard/kubernetes' },
  { label: 'Service Catalog',      description: 'Reusable service templates',   icon: <StorageIcon />,           path: '/developer/Dashboard/catalog' },
  { label: 'Webhooks',             description: 'Event integrations',           icon: <WebhookIcon />,           path: '/developer/Dashboard/webhooks' },
  { label: 'Groups',               description: 'Teams & access control',       icon: <PersonIcon />,            path: '/developer/Dashboard/groups' },
  { label: 'Developer Workspaces', description: 'Cloud dev environments',       icon: <TerminalIcon />,          path: '/developer/Dashboard/workspace' },
  { label: 'Environments',         description: 'Prod, staging & dev configs',  icon: <DevicesIcon />,           path: '/developer/Dashboard/environment' },
];

const QUICK_ACTIONS = [
  { label: 'Open Workspace', icon: <TerminalIcon sx={{ fontSize: '.9rem' }} />,          path: '/developer/Dashboard/workspace' },
];

// ─── Visibility icon helper ────────────────────────────────────────────────────

const VisibilityIcon: React.FC<{ visibility: string }> = ({ visibility }) => {
  if (visibility === 'public') return <PublicIcon sx={{ fontSize: '.85rem', color: dashboardSemanticColors.success }} />;
  if (visibility === 'team')   return <GroupIcon  sx={{ fontSize: '.85rem', color: '#f59e0b' }} />;
  return <LockIcon sx={{ fontSize: '.85rem', color: t.textTertiary }} />;
};

// ─── Empty repo panel ──────────────────────────────────────────────────────────

const NoRepoPanel: React.FC<{ projectId: string; navigate: (path: string) => void }> = ({ projectId, navigate }) => (
  <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', px: 2, py: 3, textAlign: 'center' }}>
    <Box sx={{ width: 48, height: 48, borderRadius: '12px', bgcolor: 'rgba(21,61,117,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1.5 }}>
      <AccountTreeIcon sx={{ fontSize: '1.5rem', color: t.brandPrimary }} />
    </Box>
    <Typography sx={{ fontWeight: 700, fontSize: '.85rem', color: t.textPrimary, mb: 0.5 }}>
      No repository yet
    </Typography>
    <Typography sx={{ fontSize: '.75rem', color: t.textSecondary, mb: 2, lineHeight: 1.5 }}>
      Connect a repository to see source code, branches, and commits here.
    </Typography>
    <Stack spacing={1} sx={{ width: '100%' }}>
      <Button
        fullWidth variant="contained" size="small"
        startIcon={<AddIcon sx={{ fontSize: '.9rem' }} />}
        onClick={() => navigate(`/developer/Dashboard/projects/repo/setup?project=${projectId}&mode=create`)}
        sx={{ bgcolor: t.brandPrimary, '&:hover': { bgcolor: t.brandPrimaryHover }, textTransform: 'none', fontWeight: 700, borderRadius: '8px', fontSize: '.78rem' }}
      >
        Create repository
      </Button>
      <Button
        fullWidth variant="outlined" size="small"
        startIcon={<UploadIcon sx={{ fontSize: '.9rem' }} />}
        onClick={() => navigate(`/developer/Dashboard/projects/repo/setup?project=${projectId}&mode=import`)}
        sx={{ textTransform: 'none', color: t.textSecondary, borderColor: t.border, borderRadius: '8px', fontWeight: 600, fontSize: '.78rem', '&:hover': { borderColor: t.brandPrimary, color: t.brandPrimary } }}
      >
        Import repository
      </Button>
    </Stack>
  </Box>
);

// ─── Project Settings Panel ────────────────────────────────────────────────────

interface ProjectSettingsPanelProps {
  project: BackendProject;
  onSaved: (updated: BackendProject) => void;
  onClose: () => void;
  onDeleted: () => void;
}
const ProjectSettingsPanel: React.FC<ProjectSettingsPanelProps> = ({ project, onSaved, onClose, onDeleted }) => {
  const [name, setName]             = useState(project.name);
  const [description, setDesc]      = useState(project.description ?? '');
  const [visibility, setVisibility] = useState(project.visibility ?? 'private');
  const [saving, setSaving]         = useState(false);
  const [deleting, setDeleting]     = useState(false);
  const [toast, setToast]           = useState<string | null>(null);
  const [error, setError]           = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { setError('Project name is required.'); return; }
    setSaving(true); setError(null);
    try {
      const updated = await updateProject(project.id, { name: name.trim(), description, visibility });
      onSaved(updated);
      setToast('Project settings saved.');
    } catch { setError('Failed to save. Please try again.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    try { await deleteProject(project.id); onDeleted(); }
    catch { setError('Failed to delete project.'); setDeleting(false); setConfirmDelete(false); }
  };

  const inputSx = { '& .MuiInputBase-root': { bgcolor: t.surfaceSubtle, color: t.textPrimary }, '& .MuiOutlinedInput-notchedOutline': { borderColor: t.border }, '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: t.brandPrimary } };
  const labelSx = { fontSize: '.8rem', fontWeight: 600, color: t.textSecondary, mb: 0.5 };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', px: 3, py: 2, borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
        <SettingsIcon sx={{ fontSize: '1.1rem', color: t.brandPrimary, mr: 1.25 }} />
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: t.textPrimary }}>Project Settings</Typography>
          <Typography sx={{ fontSize: '.78rem', color: t.textSecondary }}>{project.name}</Typography>
        </Box>
        <Button size="small" onClick={onClose} sx={{ textTransform: 'none', color: t.textSecondary, '&:hover': { color: t.textPrimary } }}>Close</Button>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
        <Box sx={{ maxWidth: 620, mx: 'auto' }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* General */}
        <Typography sx={{ fontWeight: 700, fontSize: '.8rem', color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.06em', mb: 1.5 }}>General</Typography>
        <Stack spacing={2} sx={{ mb: 3 }}>
          <Box>
            <Typography sx={labelSx}>Project Name</Typography>
            <TextField fullWidth value={name} onChange={e => setName(e.target.value)} size="small" sx={inputSx} />
          </Box>
          <Box>
            <Typography sx={labelSx}>Description</Typography>
            <TextField fullWidth value={description} onChange={e => setDesc(e.target.value)} size="small" multiline rows={3} sx={inputSx} />
          </Box>
          <Box>
            <Typography sx={labelSx}>Visibility</Typography>
            <Select fullWidth value={visibility} onChange={e => setVisibility(e.target.value as unknown as 'private' | 'team' | 'public')} size="small"
              sx={{ bgcolor: t.surfaceSubtle, color: t.textPrimary, '& .MuiOutlinedInput-notchedOutline': { borderColor: t.border }, '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: t.brandPrimary } }}>
              <MenuItem value="private">Private</MenuItem>
              <MenuItem value="team">Team</MenuItem>
              <MenuItem value="public">Public</MenuItem>
            </Select>
          </Box>
        </Stack>

        {/* Read-only meta */}
        <Typography sx={{ fontWeight: 700, fontSize: '.8rem', color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.06em', mb: 1.5 }}>Metadata</Typography>
        <Stack spacing={1.5} sx={{ mb: 3 }}>
          <Box>
            <Typography sx={labelSx}>Project ID</Typography>
            <TextField fullWidth value={project.id} size="small" InputProps={{ readOnly: true }} sx={inputSx} />
          </Box>
          <Box>
            <Typography sx={labelSx}>Project Key</Typography>
            <TextField fullWidth value={project.project_key || '—'} size="small" InputProps={{ readOnly: true }} sx={inputSx} />
          </Box>
          <Box>
            <Typography sx={labelSx}>Namespace</Typography>
            <TextField fullWidth value={project.namespace || '—'} size="small" InputProps={{ readOnly: true }} sx={inputSx} />
          </Box>
        </Stack>

        {/* Save */}
        <Button variant="contained" startIcon={saving ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <SaveIcon sx={{ fontSize: '1rem' }} />}
          onClick={handleSave} disabled={saving}
          sx={{ bgcolor: t.brandPrimary, '&:hover': { bgcolor: t.brandPrimaryHover }, textTransform: 'none', fontWeight: 700, borderRadius: '8px', mb: 4 }}>
          Save Changes
        </Button>

        {/* Danger zone */}
        <Box sx={{ p: 2, border: `1px solid ${dashboardSemanticColors.danger}30`, borderRadius: '10px', bgcolor: `${dashboardSemanticColors.danger}08` }}>
          <Typography sx={{ fontWeight: 700, fontSize: '.85rem', color: dashboardSemanticColors.danger, mb: 0.5 }}>Danger Zone</Typography>
          <Typography sx={{ fontSize: '.78rem', color: t.textSecondary, mb: 1.5, lineHeight: 1.55 }}>
            Permanently delete this project and all its data. This action cannot be undone.
          </Typography>
          <Button variant="outlined" size="small" startIcon={deleting ? <CircularProgress size={13} /> : <DeleteOutlineIcon sx={{ fontSize: '.9rem' }} />}
            onClick={handleDelete} disabled={deleting}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px', borderColor: dashboardSemanticColors.danger, color: dashboardSemanticColors.danger, '&:hover': { bgcolor: `${dashboardSemanticColors.danger}12` } }}>
            {confirmDelete ? 'Confirm Delete?' : 'Delete Project'}
          </Button>
          {confirmDelete && (
            <Button size="small" onClick={() => setConfirmDelete(false)}
              sx={{ ml: 1, textTransform: 'none', color: t.textSecondary }}>Cancel</Button>
          )}
        </Box>
        </Box>
      </Box>

      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast(null)}
        message={toast} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} />
    </Box>
  );
};

// ─── Repo Settings Panel ───────────────────────────────────────────────────────

interface RepoSettingsPanelProps {
  repo: BackendRepository;
  onSaved: (updated: BackendRepository) => void;
  onClose: () => void;
  onDeleted: () => void;
}
const RepoSettingsPanel: React.FC<RepoSettingsPanelProps> = ({ repo, onSaved, onClose, onDeleted }) => {
  const [repoName, setRepoName]   = useState(repo.repo_name);
  const [branch, setBranch]       = useState(repo.default_branch);
  const [saving, setSaving]       = useState(false);
  const [deleting, setDeleting]   = useState(false);
  const [toast, setToast]         = useState<string | null>(null);
  const [error, setError]         = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSave = async () => {
    if (!repoName.trim()) { setError('Repository name is required.'); return; }
    if (!branch.trim())   { setError('Default branch is required.'); return; }
    setSaving(true); setError(null);
    try {
      const updated = await updateRepo(repo.id, { repo_name: repoName.trim(), default_branch: branch.trim() });
      onSaved(updated);
      setToast('Repository settings saved.');
    } catch { setError('Failed to save. Please try again.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    try { await deleteRepo(repo.id); onDeleted(); }
    catch { setError('Failed to remove repository.'); setDeleting(false); setConfirmDelete(false); }
  };

  const inputSx = { '& .MuiInputBase-root': { bgcolor: t.surfaceSubtle, color: t.textPrimary }, '& .MuiOutlinedInput-notchedOutline': { borderColor: t.border }, '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: t.brandPrimary } };
  const labelSx = { fontSize: '.8rem', fontWeight: 600, color: t.textSecondary, mb: 0.5 };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', px: 3, py: 2, borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
        <AccountTreeIcon sx={{ fontSize: '1.1rem', color: t.brandPrimary, mr: 1.25 }} />
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: t.textPrimary }}>Repository Settings</Typography>
          <Typography sx={{ fontSize: '.78rem', color: t.textSecondary, fontFamily: 'monospace' }}>{repo.repo_name}</Typography>
        </Box>
        <Button size="small" onClick={onClose} sx={{ textTransform: 'none', color: t.textSecondary, '&:hover': { color: t.textPrimary } }}>Close</Button>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
        <Box sx={{ maxWidth: 620, mx: 'auto' }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* Editable fields */}
        <Typography sx={{ fontWeight: 700, fontSize: '.8rem', color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.06em', mb: 1.5 }}>Repository Info</Typography>
        <Stack spacing={2} sx={{ mb: 3 }}>
          <Box>
            <Typography sx={labelSx}>Repository Name</Typography>
            <TextField fullWidth value={repoName} onChange={e => setRepoName(e.target.value)} size="small" sx={inputSx} />
          </Box>
          <Box>
            <Typography sx={labelSx}>Default Branch</Typography>
            <TextField fullWidth value={branch} onChange={e => setBranch(e.target.value)} size="small" placeholder="main" sx={inputSx} />
          </Box>
        </Stack>

        {/* Read-only meta */}
        <Typography sx={{ fontWeight: 700, fontSize: '.8rem', color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.06em', mb: 1.5 }}>Metadata</Typography>
        <Stack spacing={1.5} sx={{ mb: 3 }}>
          <Box>
            <Typography sx={labelSx}>Repository ID</Typography>
            <TextField fullWidth value={repo.id} size="small" InputProps={{ readOnly: true }} sx={inputSx} />
          </Box>
          <Box>
            <Typography sx={labelSx}>Provider</Typography>
            <TextField fullWidth value={repo.provider} size="small" InputProps={{ readOnly: true }} sx={inputSx} />
          </Box>
          {repo.created_at && (
            <Box>
              <Typography sx={labelSx}>Created</Typography>
              <TextField fullWidth value={new Date(repo.created_at).toLocaleString()} size="small" InputProps={{ readOnly: true }} sx={inputSx} />
            </Box>
          )}
        </Stack>

        {/* Save */}
        <Button variant="contained" startIcon={saving ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <SaveIcon sx={{ fontSize: '1rem' }} />}
          onClick={handleSave} disabled={saving}
          sx={{ bgcolor: t.brandPrimary, '&:hover': { bgcolor: t.brandPrimaryHover }, textTransform: 'none', fontWeight: 700, borderRadius: '8px', mb: 4 }}>
          Save Changes
        </Button>

        {/* Danger zone */}
        <Box sx={{ p: 2, border: `1px solid ${dashboardSemanticColors.danger}30`, borderRadius: '10px', bgcolor: `${dashboardSemanticColors.danger}08` }}>
          <Typography sx={{ fontWeight: 700, fontSize: '.85rem', color: dashboardSemanticColors.danger, mb: 0.5 }}>Danger Zone</Typography>
          <Typography sx={{ fontSize: '.78rem', color: t.textSecondary, mb: 1.5, lineHeight: 1.55 }}>
            Remove this repository connection from the project. The source files will no longer be accessible here.
          </Typography>
          <Button variant="outlined" size="small" startIcon={deleting ? <CircularProgress size={13} /> : <DeleteOutlineIcon sx={{ fontSize: '.9rem' }} />}
            onClick={handleDelete} disabled={deleting}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px', borderColor: dashboardSemanticColors.danger, color: dashboardSemanticColors.danger, '&:hover': { bgcolor: `${dashboardSemanticColors.danger}12` } }}>
            {confirmDelete ? 'Confirm Remove?' : 'Remove Repository'}
          </Button>
          {confirmDelete && (
            <Button size="small" onClick={() => setConfirmDelete(false)}
              sx={{ ml: 1, textTransform: 'none', color: t.textSecondary }}>Cancel</Button>
          )}
        </Box>
        </Box>
      </Box>

      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast(null)}
        message={toast} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} />
    </Box>
  );
};

// ─── Main component ────────────────────────────────────────────────────────────
const ProjectDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [project, setProject] = useState<BackendProject | null>(null);
  const [repo, setRepo]               = useState<BackendRepository | null>(null);
  const [treeNodes, setTreeNodes]     = useState<TreeNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<TreeNode | null>(null);
  const [activePanel, setActivePanel] = useState<'files' | 'project-settings' | 'repo-settings'>('files');
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    if (!id || id === 'undefined') { setError('No project ID.'); setLoading(false); return; }
    if (id === 'new' || id === 'create') {
      navigate('/developer/Dashboard/projects/create', { replace: true });
      return;
    }

    const cached = readProjectListCache();
    const local = cached.find((p: { id: string }) => p.id === id);

    const fallback = (src: { id: string; name: string; description?: string }): BackendProject => ({
      id: src.id, name: src.name, description: src.description || '',
      project_key: '', namespace: '', visibility: 'private',
      avatar_color: '#153d75', last_activity: null,
      repo_count: 0, pipeline_count: 0, has_repo: false,
    });

    const loadFromApi = async () => {
      try {
        const proj = await getProject(id);
        setProject(proj);
        // If the project has a repo, fetch the first one to display its name
        if (proj.has_repo) {
          const repos = await listProjectRepos(id);
          if (repos.length > 0) {
            setRepo(repos[0]);
            // Fetch file tree for the repo
            try {
              const tree = await getRepoTree(repos[0].id);
              setTreeNodes(tree);
            } catch { /* tree unavailable — leave empty */ }
          }
        }
      } catch {
        if (local) setProject(fallback(local));
        else setError('Could not load project.');
      } finally {
        setLoading(false);
      }
    };

    // Always hit the API so has_repo is never stale (show cache first for speed)
    if (local) { setProject(fallback(local)); }
    loadFromApi();
  }, [id, navigate]);

  const projectKey = project?.project_key
    || (project?.name ? project.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/(^-|-$)/g, '') : 'project');

  const initials  = (project?.name ?? 'P')[0].toUpperCase();
  const avatarBg  = project?.avatar_color ?? t.brandPrimary;
  const createdAt = project?.created_at
    ? new Date(project.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : null;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <CircularProgress sx={{ color: t.brandPrimary }} />
      </Box>
    );
  }
  if (error && !project) {
    return <Box sx={{ p: 3 }}><Alert severity="error">{error}</Alert></Box>;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: t.background, fontFamily: FONT }}>

      {/* ── TOP BAR ── */}
      <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1.25, borderBottom: `1px solid ${t.border}`, bgcolor: t.surface, gap: 1.5, flexShrink: 0, flexWrap: 'wrap' }}>
        <Button
          size="small" startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/developer/Dashboard/projects')}
          sx={{ textTransform: 'none', color: t.textSecondary, '&:hover': { color: t.textPrimary }, minWidth: 0 }}
        >
          Projects
        </Button>
        <Typography sx={{ color: t.textTertiary, fontSize: '.8rem' }}>/</Typography>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Box sx={{ width: 28, height: 28, borderRadius: '8px', bgcolor: avatarBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Typography sx={{ color: '#fff', fontSize: '.72rem', fontWeight: 800 }}>{initials}</Typography>
          </Box>
          <Typography sx={{ fontWeight: 700, fontSize: '.95rem', color: t.textPrimary }}>{project?.name}</Typography>
          <Chip
            label="Active" size="small"
            icon={<CheckCircleIcon sx={{ fontSize: '.75rem !important', color: `${dashboardSemanticColors.success} !important` }} />}
            sx={{ bgcolor: 'rgba(34,197,94,.1)', color: dashboardSemanticColors.success, fontWeight: 700, fontSize: '.65rem', height: 20 }}
          />
        </Stack>
        <Stack direction="row" spacing={1} sx={{ ml: 'auto' }}>
          <Button
            size="small"
            variant={project?.has_repo ? 'contained' : 'outlined'}
            startIcon={<AccountTreeIcon sx={{ fontSize: '.85rem' }} />}
            onClick={() => navigate(`/developer/Dashboard/projects/${id ?? ''}/repo`)}
            sx={{
              textTransform: 'none',
              ...(project?.has_repo
                ? { bgcolor: t.brandPrimary, '&:hover': { bgcolor: t.brandPrimaryHover } }
                : { color: t.textSecondary, borderColor: t.border, '&:hover': { borderColor: t.brandPrimary, color: t.brandPrimary } }
              ),
              borderRadius: '8px', fontWeight: 700, fontSize: '.75rem', py: 0.4,
            }}
          >
            {project?.has_repo ? 'Repository' : 'Set up Repo'}
          </Button>
          {QUICK_ACTIONS.map((a) => (
            <Button key={a.label} size="small" variant="outlined" startIcon={a.icon} onClick={() => navigate(a.path)}
              sx={{ textTransform: 'none', color: t.textSecondary, borderColor: t.border, borderRadius: '8px', fontWeight: 600, fontSize: '.75rem', py: 0.4, '&:hover': { borderColor: t.brandPrimary, color: t.brandPrimary } }}>
              {a.label}
            </Button>
          ))}
        </Stack>
      </Box>

      {/* ── THREE-PANEL BODY ── */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>

        {/* LEFT SIDEBAR — project info + repository */}
        <Box sx={{ width: 260, flexShrink: 0, borderRight: `1px solid ${t.border}`, bgcolor: t.surface, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Project identity */}
          <Box sx={{ px: 2, pt: 2, pb: 1.5 }}>
            <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 1.5 }}>
              <Box sx={{ width: 40, height: 40, borderRadius: '12px', bgcolor: avatarBg, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography sx={{ color: '#fff', fontSize: '.9rem', fontWeight: 800 }}>{initials}</Typography>
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography noWrap sx={{ fontWeight: 700, fontSize: '.875rem', color: t.textPrimary }}>{project?.name}</Typography>
                <Typography noWrap sx={{ fontSize: '.72rem', color: t.textTertiary, fontFamily: 'monospace' }}>{projectKey}</Typography>
              </Box>
            </Stack>

            {project?.description && (
              <Typography sx={{ color: t.textSecondary, fontSize: '.775rem', lineHeight: 1.55, mb: 1.25, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {project.description}
              </Typography>
            )}

            <Stack direction="row" alignItems="center" flexWrap="wrap" sx={{ gap: '6px' }}>
              <Stack direction="row" alignItems="center" spacing={0.4}>
                <VisibilityIcon visibility={project?.visibility ?? 'private'} />
                <Typography sx={{ fontSize: '.72rem', color: t.textSecondary, textTransform: 'capitalize' }}>
                  {project?.visibility ?? 'private'}
                </Typography>
              </Stack>
              {createdAt && (
                <Stack direction="row" alignItems="center" spacing={0.4}>
                  <CalendarTodayIcon sx={{ fontSize: '.75rem', color: t.textTertiary }} />
                  <Typography sx={{ fontSize: '.72rem', color: t.textTertiary }}>{createdAt}</Typography>
                </Stack>
              )}
            </Stack>
          </Box>

          <Divider sx={{ borderColor: t.border, mx: 1.5 }} />

          {/* Repository section header */}
          <Box sx={{ px: 1.5, pt: 1.25, pb: 0.5 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Stack direction="row" alignItems="center" spacing={0.75}>
                <AccountTreeIcon sx={{ fontSize: '.85rem', color: t.textSecondary }} />
                <Typography sx={{ fontWeight: 700, fontSize: '.72rem', color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                  Repository
                </Typography>
              </Stack>
              {project?.has_repo && (
                <Chip label="Connected" size="small"
                  sx={{ height: 17, fontSize: '.6rem', fontWeight: 700, bgcolor: 'rgba(34,197,94,.1)', color: dashboardSemanticColors.success, '& .MuiChip-label': { px: 0.75 } }}
                />
              )}
            </Stack>
          </Box>

          {/* Repo body */}
          {project?.has_repo ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
              {/* Compact repo + branch header */}
              <Box sx={{ px: 1.5, py: 1, flexShrink: 0 }}>
                <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.6 }}>
                  <AccountTreeIcon sx={{ fontSize: '.85rem', color: t.brandPrimary }} />
                  <Typography sx={{ fontSize: '.8rem', fontWeight: 700, color: t.textPrimary, fontFamily: 'monospace', wordBreak: 'break-all' }}>
                    {repo?.repo_name ?? '…'}
                  </Typography>
                </Stack>
                <Stack direction="row" alignItems="center" spacing={0.4}>
                  {repo?.provider && repo.provider !== 'orcacloud' && (
                    <Chip label={repo.provider} size="small"
                      sx={{ height: 16, fontSize: '.58rem', fontWeight: 700, bgcolor: t.surfaceSubtle, color: t.textSecondary, border: `1px solid ${t.border}`, '& .MuiChip-label': { px: 0.6 } }}
                    />
                  )}
                  <CallSplitIcon sx={{ fontSize: '.72rem', color: t.textTertiary }} />
                  <Typography sx={{ fontSize: '.72rem', color: t.textSecondary, fontWeight: 500 }}>
                    {repo?.default_branch ?? 'main'}
                  </Typography>
                  <Typography sx={{ fontSize: '.68rem', color: t.textTertiary, ml: 'auto' }}>
                    {treeNodes.length} items at root
                  </Typography>
                </Stack>
              </Box>
              <Divider sx={{ borderColor: t.border }} />
              {/* File tree — scrollable */}
              <Box sx={{ flex: 1, overflowY: 'auto', py: 0.5 }}>
                <FileTreeExplorer
                  nodes={treeNodes}
                  selectedPath={selectedFile?.path}
                  onFileSelect={(node) => setSelectedFile((prev) => prev?.path === node.path ? null : node)}
                />
              </Box>
            </Box>
          ) : (
            <NoRepoPanel projectId={id ?? ''} navigate={navigate} />
          )}
        </Box>

        {/* CENTER — file browser / viewer / settings / identity */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          {activePanel === 'project-settings' && project ? (
            <ProjectSettingsPanel
              project={project}
              onSaved={(updated) => {
                setProject(updated);
                // Keep the project list cache in sync
                try {
                  const cached: BackendProject[] = readProjectListCache<BackendProject>();
                  const idx = cached.findIndex(p => p.id === updated.id);
                  if (idx !== -1) cached[idx] = updated; else cached.unshift(updated);
                  writeProjectListCache(cached);
                } catch { /* ignore */ }
              }}
              onClose={() => setActivePanel('files')}
              onDeleted={() => {
                try {
                  const cached: BackendProject[] = readProjectListCache<BackendProject>();
                  writeProjectListCache(cached.filter(p => p.id !== id));
                } catch { /* ignore */ }
                navigate('/developer/Dashboard/projects');
              }}
            />
          ) : activePanel === 'repo-settings' && repo ? (
            <RepoSettingsPanel
              repo={repo}
              onSaved={(updated) => {
                setRepo(updated);
                // Reflect updated repo name/branch in the left sidebar immediately
                setProject(p => p ? { ...p, last_activity: new Date().toISOString() } : p);
              }}
              onClose={() => setActivePanel('files')}
              onDeleted={() => {
                setRepo(null);
                setTreeNodes([]);
                setSelectedFile(null);
                setProject(p => p ? { ...p, has_repo: false, last_activity: new Date().toISOString() } : p);
                setActivePanel('files');
                // Evict stale has_repo from LS so project list refreshes on next visit
                try {
                  const cached: BackendProject[] = readProjectListCache<BackendProject>();
                  const idx = cached.findIndex(p => p.id === id);
                  if (idx !== -1) {
                    cached[idx] = { ...cached[idx], has_repo: false };
                    writeProjectListCache(cached);
                  }
                } catch { /* ignore */ }
              }}
            />
          ) : selectedFile ? (
            <FileViewer node={selectedFile} onClose={() => setSelectedFile(null)} />
          ) : project?.has_repo ? (
            <FileBrowserPanel
              nodes={treeNodes}
              repoName={repo?.repo_name ?? 'repository'}
              branch={repo?.default_branch ?? 'main'}
              onFileOpen={(node) => setSelectedFile(node)}
            />
          ) : (
            <Box sx={{ flex: 1, overflowY: 'auto', p: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Box sx={{ textAlign: 'center', maxWidth: 420 }}>
              <Box sx={{ width: 64, height: 64, borderRadius: '18px', bgcolor: project?.avatar_color ?? t.brandPrimary, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2.5 }}>
                <Typography sx={{ color: '#fff', fontSize: '1.6rem', fontWeight: 800 }}>
                  {(project?.name ?? 'P')[0].toUpperCase()}
                </Typography>
              </Box>
              <Typography sx={{ fontWeight: 800, fontSize: '1.25rem', color: t.textPrimary, mb: 0.75 }}>
                {project?.name}
              </Typography>
              {project?.description && (
                <Typography sx={{ fontSize: '.875rem', color: t.textSecondary, lineHeight: 1.65, mb: 2.5 }}>
                  {project.description}
                </Typography>
              )}
              <Stack direction="row" justifyContent="center" flexWrap="wrap" sx={{ gap: 1, mb: 3 }}>
                <Chip label={project?.visibility ?? 'private'} size="small"
                  sx={{ bgcolor: t.surfaceSubtle, border: `1px solid ${t.border}`, color: t.textSecondary, fontWeight: 600, fontSize: '.72rem', textTransform: 'capitalize' }} />
                {project?.project_key && (
                  <Chip label={project.project_key} size="small"
                    sx={{ bgcolor: t.surfaceSubtle, border: `1px solid ${t.border}`, color: t.textTertiary, fontWeight: 500, fontSize: '.72rem', fontFamily: 'monospace' }} />
                )}
              </Stack>
              <Button variant="contained" startIcon={<AccountTreeIcon sx={{ fontSize: '1rem' }} />}
                onClick={() => navigate(`/developer/Dashboard/projects/repo/setup?project=${id ?? ''}&mode=create`)}
                sx={{ bgcolor: t.brandPrimary, '&:hover': { bgcolor: t.brandPrimaryHover }, textTransform: 'none', fontWeight: 700, borderRadius: '10px' }}>
                Connect a repository to get started
              </Button>
            </Box>
            </Box>
          )}
        </Box>

        {/* RIGHT SIDEBAR — service navigation */}
        <Box sx={{ width: 250, flexShrink: 0, borderLeft: `1px solid ${t.border}`, bgcolor: t.surface, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Box sx={{ px: 2, pt: 2, pb: 1.5 }}>
            <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 1 }}>
              <LinkIcon sx={{ fontSize: '.85rem', color: t.textSecondary }} />
              <Typography sx={{ fontWeight: 700, fontSize: '.72rem', color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                Project Links
              </Typography>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Avatar sx={{ width: 20, height: 20, bgcolor: avatarBg, fontSize: '.65rem', fontWeight: 800 }}>{initials}</Avatar>
              <Typography sx={{ fontSize: '.75rem', color: t.textTertiary }}>{project?.name}</Typography>
            </Stack>
          </Box>

          <Divider sx={{ borderColor: t.border, mx: 1.5 }} />

          <Box sx={{ flex: 1, overflowY: 'auto', py: 1 }}>
            {SERVICE_LINKS.map((link) => (
              <Stack key={link.label} direction="row" alignItems="center" spacing={1.25} onClick={() => navigate(link.path)}
                sx={{ px: 1.75, py: 1, cursor: 'pointer', borderRadius: '8px', mx: 0.75, transition: 'background .15s', '&:hover': { bgcolor: t.surfaceHover }, '&:hover .arrow-icon': { opacity: 1, transform: 'translateX(2px)' } }}>
                <Box sx={{ width: 32, height: 32, borderRadius: '8px', bgcolor: 'rgba(21,61,117,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, '& .MuiSvgIcon-root': { fontSize: '1rem', color: t.brandPrimary } }}>
                  {link.icon}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 600, fontSize: '.82rem', color: t.textPrimary, lineHeight: 1.2 }}>{link.label}</Typography>
                  <Typography noWrap sx={{ fontSize: '.72rem', color: t.textSecondary, lineHeight: 1.2 }}>{link.description}</Typography>
                  {link.badge && (
                    <Chip label={link.badge} size="small"
                      sx={{ height: 15, fontSize: '.58rem', bgcolor: `${link.badgeColor}20`, color: link.badgeColor, fontWeight: 700, mt: 0.25, '& .MuiChip-label': { px: 0.75 } }}
                    />
                  )}
                </Box>
                <OpenInNewIcon className="arrow-icon" sx={{ fontSize: '.75rem', color: t.textTertiary, opacity: 0, transition: 'opacity .15s, transform .15s', flexShrink: 0 }} />
              </Stack>
            ))}
          </Box>

          <Divider sx={{ borderColor: t.border, mx: 1.5 }} />

          <Box sx={{ p: 1.5 }}>
            <Button fullWidth variant="outlined" startIcon={<GitHubIcon sx={{ fontSize: '1rem' }} />}
              onClick={() => {
                if (project?.has_repo) {
                  navigate(`/developer/Dashboard/projects/${id ?? ''}/repo`);
                } else {
                  navigate(`/developer/Dashboard/projects/repo/setup?project=${id ?? ''}&mode=create`);
                }
              }}
              sx={{ textTransform: 'none', color: project?.has_repo ? t.brandPrimary : t.textPrimary, borderColor: project?.has_repo ? t.brandPrimary : t.border, borderRadius: '10px', fontWeight: 600, fontSize: '.8rem', bgcolor: project?.has_repo ? 'rgba(21,61,117,.06)' : t.surfaceSubtle, justifyContent: 'flex-start', py: 1, '&:hover': { borderColor: t.brandPrimary, bgcolor: 'rgba(21,61,117,.09)' } }}>
              {project?.has_repo ? 'Open Repository' : 'Connect Repository'}
            </Button>
            {project?.has_repo && repo && (
              <Button fullWidth variant="text" startIcon={<AccountTreeIcon sx={{ fontSize: '.9rem' }} />}
                onClick={() => { setSelectedFile(null); setActivePanel(p => p === 'repo-settings' ? 'files' : 'repo-settings'); }}
                sx={{ mt: 0.75, textTransform: 'none', borderRadius: '10px', fontWeight: 600, fontSize: '.78rem', justifyContent: 'flex-start', py: 0.75,
                  color: activePanel === 'repo-settings' ? t.brandPrimary : t.textSecondary,
                  bgcolor: activePanel === 'repo-settings' ? 'rgba(21,61,117,.07)' : 'transparent',
                  '&:hover': { color: t.brandPrimary, bgcolor: 'rgba(21,61,117,.07)' } }}>
                Repository Settings
              </Button>
            )}
            <Button fullWidth variant="text" startIcon={<DataObjectIcon sx={{ fontSize: '.9rem' }} />}
              onClick={() => { setSelectedFile(null); setActivePanel(p => p === 'project-settings' ? 'files' : 'project-settings'); }}
              sx={{ mt: 0.75, textTransform: 'none', borderRadius: '10px', fontWeight: 500, fontSize: '.78rem', justifyContent: 'flex-start', py: 0.75,
                color: activePanel === 'project-settings' ? t.brandPrimary : t.textSecondary,
                bgcolor: activePanel === 'project-settings' ? 'rgba(21,61,117,.07)' : 'transparent',
                '&:hover': { color: t.textPrimary, bgcolor: t.surfaceHover } }}>
              Project Settings
            </Button>
          </Box>
        </Box>

      </Box>
    </Box>
  );
};

export default ProjectDashboardPage;
