/**
 * RepositoryPage — Full GitHub/GitLab-style repository experience.
 *
 * Three-panel layout:
 *   Left   : RepoNav  (Files · Commits · Branches · Tags · Pipelines · PRs · Issues · Wiki · Releases · Search · Settings)
 *   Center : Content  (file browser, file viewer, diff, commit list, branch list, search, etc.)
 *   Right  : RepoRightPanel (context-aware metadata & insights)
 *
 * Route: /developer/Dashboard/projects/:id/repo
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Popover,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import DeleteOutlineIcon  from '@mui/icons-material/DeleteOutline';
import AccountTreeIcon   from '@mui/icons-material/AccountTree';
import SearchIcon        from '@mui/icons-material/Search';
import ArrowBackIcon     from '@mui/icons-material/ArrowBack';
import ContentCopyIcon   from '@mui/icons-material/ContentCopy';
import ExpandMoreIcon    from '@mui/icons-material/ExpandMore';
import BugReportIcon     from '@mui/icons-material/BugReport';
import CallSplitIcon     from '@mui/icons-material/CallSplit';
import CheckCircleIcon   from '@mui/icons-material/CheckCircle';
import LockIcon          from '@mui/icons-material/Lock';
import LocalOfferIcon    from '@mui/icons-material/LocalOffer';
import MergeIcon         from '@mui/icons-material/MergeType';
import MenuBookIcon      from '@mui/icons-material/MenuBook';
import PlayCircleIcon    from '@mui/icons-material/PlayCircle';
import RocketLaunchIcon  from '@mui/icons-material/RocketLaunch';
import StarIcon          from '@mui/icons-material/Star';
import { useNavigate, useParams } from 'react-router-dom';

import { dashboardTokens, dashboardSemanticColors } from '../styles/dashboardDesignSystem';
import {
  getProject,
  listProjectRepos,
  getRepoTree,
  getRepoCommits,
  getRepoBranches,
  getRepoTags,
  getRepoFileDetail,
  getRepoBlame,
  getRepoDiff,
  searchRepo,
  initProjectRepo,
  getRepo,
  getRepoCloneUrls,
  deleteRepo,
  type CloneUrls,
  type BackendProject,
  type BackendRepository,
  type TreeNode,
  type RepoCommit,
  type RepoBranch,
  type RepoTag,
  type FileDetail,
  type BlameHunk,
  type DiffResult,
} from '../services/projectsApi';

import RepoNav,           { type RepoSection } from '../components/Repository/RepoNav';
import RepoFileBrowser                          from '../components/Repository/RepoFileBrowser';
import RepoFileViewer                           from '../components/Repository/RepoFileViewer';
import RepoCommitList                           from '../components/Repository/RepoCommitList';
import RepoDiffViewer                           from '../components/Repository/RepoDiffViewer';
import RepoSearchPanel                          from '../components/Repository/RepoSearchPanel';
import { RepoRightPanel }                       from '../components/Repository/RepoRightPanel';

const t    = dashboardTokens.colors;
const FONT = dashboardTokens.typography.fontFamily;
const MONO = '"JetBrains Mono","Fira Code",monospace';

// ─── Pipeline status dot ───────────────────────────────────────────────────────

const PIPE_COLORS: Record<string, string> = {
  success: dashboardSemanticColors.success,
  failure: dashboardSemanticColors.danger,
  running: dashboardSemanticColors.warning,
  pending: '#71717A',
};

// ─── Placeholder panels ────────────────────────────────────────────────────────

const ComingSoon: React.FC<{ title: string; icon: React.ReactNode; description?: string }> = ({ title, icon, description }) => (
  <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT }}>
    <Box sx={{ textAlign: 'center', maxWidth: 380 }}>
      <Box sx={{ width: 56, height: 56, borderRadius: '14px', bgcolor: 'rgba(21,61,117,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2, '& .MuiSvgIcon-root': { fontSize: '1.5rem', color: t.brandPrimary } }}>
        {icon}
      </Box>
      <Typography sx={{ fontWeight: 700, fontSize: '1.05rem', color: t.textPrimary, mb: 0.75 }}>{title}</Typography>
      <Typography sx={{ fontSize: '.85rem', color: t.textSecondary, lineHeight: 1.65 }}>
        {description ?? 'This section is part of the roadmap and will be available in an upcoming release.'}
      </Typography>
    </Box>
  </Box>
);

// ─── Branch list panel ─────────────────────────────────────────────────────────

const BranchListPanel: React.FC<{
  branches:      RepoBranch[];
  loading:       boolean;
  currentBranch: string;
  onSwitch:      (b: string) => void;
  onViewDiff?:   (b: RepoBranch) => void;
}> = ({ branches, loading, currentBranch, onSwitch, onViewDiff: _onViewDiff }) => {
  if (loading) return <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CircularProgress sx={{ color: t.brandPrimary }} /></Box>;

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ px: 2.5, py: 1.25, borderBottom: `1px solid ${t.border}`, bgcolor: t.surfaceSubtle, flexShrink: 0 }}>
        <Typography sx={{ fontWeight: 700, fontSize: '.85rem', color: t.textPrimary }}>Branches</Typography>
        <Typography sx={{ fontSize: '.75rem', color: t.textSecondary }}>{branches.length} branch{branches.length !== 1 ? 'es' : ''}</Typography>
      </Box>
      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        {branches.map(b => (
          <Box key={b.name} sx={{
            px: 2.5, py: 1.25, borderBottom: `1px solid ${t.border}`,
            display: 'grid', gridTemplateColumns: '1fr auto', gap: 1.5, alignItems: 'center',
          }}>
            <Box>
              <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.3 }}>
                <CallSplitIcon sx={{ fontSize: '.8rem', color: t.textTertiary }} />
                <Typography sx={{ fontFamily: MONO, fontWeight: b.name === currentBranch ? 700 : 500, fontSize: '.85rem', color: b.name === currentBranch ? t.brandPrimary : t.textPrimary }}>
                  {b.name}
                </Typography>
                {b.name === currentBranch && <Chip label="current" size="small" sx={{ height: 16, fontSize: '.6rem', fontWeight: 700, bgcolor: 'rgba(21,61,117,.08)', color: t.brandPrimary, '& .MuiChip-label': { px: 0.6 } }} />}
                {b.protected && <LockIcon sx={{ fontSize: '.72rem', color: t.textTertiary }} />}
              </Stack>
              <Typography noWrap sx={{ fontSize: '.75rem', color: t.textSecondary }}>
                {b.last_commit_message}
                {b.last_commit_date && ` · ${new Date(b.last_commit_date).toLocaleDateString()}`}
              </Typography>
            </Box>
            <Stack direction="row" spacing={0.75} alignItems="center">
              {b.ahead  > 0 && <Chip label={`↑${b.ahead}`}  size="small" sx={{ height: 18, fontSize: '.62rem', bgcolor: 'rgba(34,197,94,.1)',  color: '#22C55E', '& .MuiChip-label': { px: 0.6 } }} />}
              {b.behind > 0 && <Chip label={`↓${b.behind}`} size="small" sx={{ height: 18, fontSize: '.62rem', bgcolor: 'rgba(239,68,68,.1)', color: '#EF4444', '& .MuiChip-label': { px: 0.6 } }} />}
              {b.name !== currentBranch && (
                <Button size="small" onClick={() => onSwitch(b.name)}
                  sx={{ textTransform: 'none', fontSize: '.72rem', color: t.brandPrimary, py: 0.2, px: 0.75, borderRadius: '6px', '&:hover': { bgcolor: 'rgba(21,61,117,.08)' } }}>
                  Switch
                </Button>
              )}
            </Stack>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

// ─── Tag list panel ────────────────────────────────────────────────────────────

const TagListPanel: React.FC<{ tags: RepoTag[]; loading: boolean }> = ({ tags, loading }) => {
  if (loading) return <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CircularProgress sx={{ color: t.brandPrimary }} /></Box>;
  if (tags.length === 0) return (
    <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Box sx={{ textAlign: 'center' }}>
        <LocalOfferIcon sx={{ fontSize: '2rem', color: t.textTertiary, mb: 1 }} />
        <Typography sx={{ fontSize: '.85rem', color: t.textSecondary }}>No tags yet</Typography>
        <Typography sx={{ fontSize: '.78rem', color: t.textTertiary, mt: 0.5 }}>Create a tag to mark a release or milestone.</Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ px: 2.5, py: 1.25, borderBottom: `1px solid ${t.border}`, bgcolor: t.surfaceSubtle }}>
        <Typography sx={{ fontWeight: 700, fontSize: '.85rem', color: t.textPrimary }}>Tags</Typography>
        <Typography sx={{ fontSize: '.75rem', color: t.textSecondary }}>{tags.length} tag{tags.length !== 1 ? 's' : ''}</Typography>
      </Box>
      {tags.map(tag => (
        <Box key={tag.name} sx={{ px: 2.5, py: 1.25, borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
          <LocalOfferIcon sx={{ fontSize: '.9rem', color: t.textTertiary, mt: '2px', flexShrink: 0 }} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontFamily: MONO, fontSize: '.85rem', fontWeight: 700, color: t.textPrimary }}>{tag.name}</Typography>
            {tag.message && <Typography sx={{ fontSize: '.78rem', color: t.textSecondary, mt: 0.2 }}>{tag.message}</Typography>}
            <Stack direction="row" spacing={1} sx={{ mt: 0.35 }}>
              <Typography sx={{ fontFamily: MONO, fontSize: '.72rem', color: t.brandPrimary }}>{tag.sha?.slice(0, 8)}</Typography>
              {tag.date && <Typography sx={{ fontSize: '.72rem', color: t.textTertiary }}>{new Date(tag.date).toLocaleDateString()}</Typography>}
            </Stack>
          </Box>
          <Chip icon={<StarIcon sx={{ fontSize: '.75rem !important' }} />} label="Tag"
            size="small"
            sx={{ height: 18, fontSize: '.62rem', fontWeight: 600, bgcolor: t.surfaceSubtle, border: `1px solid ${t.border}`, '& .MuiChip-label': { pr: 0.75 } }} />
        </Box>
      ))}
    </Box>
  );
};

// ─── Repo Settings inline panel ────────────────────────────────────────────────

const RepoSettingsPanel: React.FC<{
  repo: BackendRepository;
  project: BackendProject | null;
  onBack: () => void;
  onDeleted: () => void;
}> = ({ repo, project, onBack, onDeleted }) => {
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [confirmName, setConfirmName] = React.useState('');
  const [deleting,    setDeleting]    = React.useState(false);
  const [toast,       setToast]       = React.useState<string | null>(null);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteRepo(repo.id);
      onDeleted();
    } catch (e: any) {
      setToast(e?.response?.data?.detail ?? e?.message ?? 'Failed to delete repository.');
      setDeleting(false);
      setConfirmOpen(false);
    }
  };

  return (
    <Box sx={{ flex: 1, p: 3, overflowY: 'auto' }}>
      <Button size="small" startIcon={<ArrowBackIcon />} onClick={onBack}
        sx={{ textTransform: 'none', color: t.textSecondary, mb: 2, '&:hover': { color: t.textPrimary } }}>
        Back to Files
      </Button>
      <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: t.textPrimary, mb: 0.5 }}>Repository Settings</Typography>
      <Typography sx={{ fontSize: '.82rem', color: t.textSecondary, mb: 2.5 }}>{repo.repo_name}</Typography>
      <Box sx={{ maxWidth: 560 }}>
        {[
          { label: 'Repository ID',    value: repo.id },
          { label: 'Repository Name',  value: repo.repo_name },
          { label: 'Provider',         value: repo.provider },
          { label: 'Default Branch',   value: repo.default_branch },
          { label: 'Project',          value: project?.name ?? '—' },
          { label: 'Created',          value: repo.created_at ? new Date(repo.created_at).toLocaleString() : '—' },
        ].map(row => (
          <Box key={row.label} sx={{ mb: 1.5, pb: 1.5, borderBottom: `1px solid ${t.border}` }}>
            <Typography sx={{ fontSize: '.72rem', fontWeight: 700, color: t.textTertiary, textTransform: 'uppercase', letterSpacing: '.05em', mb: 0.25 }}>{row.label}</Typography>
            <Typography sx={{ fontFamily: MONO, fontSize: '.82rem', color: t.textPrimary }}>{row.value}</Typography>
          </Box>
        ))}

        {/* Danger zone */}
        <Box sx={{ mt: 4, p: 2.5, borderRadius: '12px', border: '1px solid rgba(239,68,68,.35)', bgcolor: 'rgba(239,68,68,.04)' }}>
          <Typography sx={{ fontWeight: 700, fontSize: '.82rem', color: '#ef4444', textTransform: 'uppercase', letterSpacing: '.06em', mb: 1 }}>Danger Zone</Typography>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Box>
              <Typography sx={{ fontWeight: 600, fontSize: '.88rem', color: t.textPrimary }}>Delete this repository</Typography>
              <Typography sx={{ fontSize: '.78rem', color: t.textSecondary }}>Permanently removes the repository and all its data.</Typography>
            </Box>
            <Button variant="outlined" size="small" startIcon={<DeleteOutlineIcon />}
              onClick={() => { setConfirmName(''); setConfirmOpen(true); }}
              sx={{ textTransform: 'none', fontWeight: 700, borderColor: '#ef4444', color: '#ef4444', borderRadius: '8px',
                '&:hover': { bgcolor: 'rgba(239,68,68,.08)' }, flexShrink: 0, ml: 2 }}>
              Delete
            </Button>
          </Stack>
        </Box>
      </Box>

      {/* Confirm delete dialog */}
      <Dialog open={confirmOpen} onClose={() => !deleting && setConfirmOpen(false)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: '16px' } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Delete repository?</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: '.88rem', color: t.textSecondary, mb: 2 }}>
            This action <strong>cannot be undone</strong>. Type <strong>{repo.repo_name}</strong> to confirm.
          </Typography>
          <TextField
            autoFocus fullWidth size="small"
            placeholder={repo.repo_name}
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmOpen(false)} disabled={deleting} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button onClick={handleDelete} variant="contained" disabled={confirmName !== repo.repo_name || deleting}
            sx={{ textTransform: 'none', fontWeight: 700, bgcolor: '#ef4444', '&:hover': { bgcolor: '#dc2626' }, borderRadius: '8px' }}>
            {deleting ? <CircularProgress size={16} color="inherit" /> : 'Delete Repository'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="error" onClose={() => setToast(null)}>{toast}</Alert>
      </Snackbar>
    </Box>
  );
};

// ─── Main component ────────────────────────────────────────────────────────────

const RepositoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { id, repoId } = useParams<{ id?: string; repoId?: string }>();

  // ─ Core data
  const [project, setProject]   = useState<BackendProject | null>(null);
  const [repo,    setRepo]       = useState<BackendRepository | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error,   setError]     = useState<string | null>(null);

  // ─ Tree
  const [treeNodes,    setTreeNodes]    = useState<TreeNode[]>([]);
  const [treeLoading,  setTreeLoading]  = useState(false);

  // ─ Branches / tags
  const [branches,      setBranches]      = useState<RepoBranch[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [tags,          setTags]          = useState<RepoTag[]>([]);
  const [tagsLoading,   setTagsLoading]   = useState(false);
  const [currentBranch, setCurrentBranch] = useState('main');

  // ─ Commits
  const [commits,        setCommits]        = useState<RepoCommit[]>([]);
  const [commitsLoading, setCommitsLoading] = useState(false);

  // ─ File detail
  const [fileDetail,        setFileDetail]        = useState<FileDetail | null>(null);
  const [fileDetailLoading, setFileDetailLoading] = useState(false);

  // ─ Blame
  const [blame,        setBlame]        = useState<BlameHunk[]>([]);
  const [blameLoading, setBlameLoading] = useState(false);

  // ─ File history (commits for file)
  const [fileCommits,   setFileCommits]   = useState<RepoCommit[]>([]);
  const [fileCommitsLoading, setFileCommitsLoading] = useState(false);

  // ─ Diff
  const [diff,        setDiff]        = useState<DiffResult | null>(null);
  const [selectedCommit, setSelectedCommit] = useState<RepoCommit | null>(null);

  // ─ Navigation
  const [section, setSection]   = useState<RepoSection>('files');
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);

  // ─ Repo init
  const [initializing,   setInitializing]   = useState(false);
  const [repoNameInput,  setRepoNameInput]  = useState('');
  const [initError,      setInitError]      = useState<string | null>(null);

  // Clone URLs state
  const [cloneUrls,   setCloneUrls]   = useState<CloneUrls | null>(null);
  const [cloneTab,    setCloneTab]    = useState<'https' | 'ssh'>('https');
  const [cloneAnchor, setCloneAnchor] = useState<HTMLElement | null>(null);
  const [copyDone,    setCopyDone]    = useState(false);

  // Track last loaded branch/repo to avoid redundant fetches
  const _loadedBranchRef = useRef<string>('');
  const loadedRepoRef   = useRef<string>('');

  // ─── Initial load ──────────────────────────────────────────────────────────

  useEffect(() => {
    const init = async () => {
      try {
        // ── Standalone repo path: /developer/Dashboard/repo/:repoId ──────────
        if (repoId) {
          const r = await getRepo(repoId);
          setRepo(r);
          setCurrentBranch(r.default_branch || 'main');
          loadedRepoRef.current = r.id;
          setTreeLoading(true);
          setBranchesLoading(true);
          const [tree, branchList] = await Promise.allSettled([
            getRepoTree(r.id),
            getRepoBranches(r.id),
          ]);
          if (tree.status === 'fulfilled')       setTreeNodes(tree.value);
          if (branchList.status === 'fulfilled') setBranches(branchList.value);
          setTreeLoading(false);
          setBranchesLoading(false);
          setLoading(false);
          getRepoCloneUrls(r.id).then(setCloneUrls).catch(() => {});
          return;
        }

        // ── Project-linked repo path: /developer/Dashboard/projects/:id/repo ─
        if (!id || id === 'undefined') { setError('No project ID'); setLoading(false); return; }

        const proj  = await getProject(id);
        setProject(proj);

        if (!proj.has_repo) {
          setLoading(false);
          return;
        }

        const repos = await listProjectRepos(id);
        if (repos.length === 0) { setLoading(false); return; }

        const r = repos[0];
        setRepo(r);
        setCurrentBranch(r.default_branch || 'main');
        loadedRepoRef.current = r.id;

        setTreeLoading(true);
        setBranchesLoading(true);

        const [tree, branchList] = await Promise.allSettled([
          getRepoTree(r.id),
          getRepoBranches(r.id),
        ]);

        if (tree.status === 'fulfilled')       setTreeNodes(tree.value);
        if (branchList.status === 'fulfilled') setBranches(branchList.value);

        setTreeLoading(false);
        setBranchesLoading(false);
      } catch (e: any) {
        setError(e?.message ?? 'Failed to load repository.');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [id, repoId]);

  // ─── Branch switch ─────────────────────────────────────────────────────────

  const handleBranchSwitch = useCallback(async (branch: string) => {
    if (!repo || branch === currentBranch) return;
    setCurrentBranch(branch);
    setSelectedNode(null);
    setFileDetail(null);
    setBlame([]);

    try {
      setTreeLoading(true);
      const tree = await getRepoTree(repo.id);   // TODO: pass ?branch= when backend supports it
      setTreeNodes(tree);
    } finally {
      setTreeLoading(false);
    }
  }, [repo, currentBranch]);

  // ─── Section change ────────────────────────────────────────────────────────

  const handleSectionChange = useCallback(async (s: RepoSection) => {
    setSection(s);
    setSelectedNode(null);
    setFileDetail(null);
    setDiff(null);
    setSelectedCommit(null);

    if (!repo) return;

    if (s === 'commits' && commits.length === 0) {
      setCommitsLoading(true);
      try {
        const c = await getRepoCommits(repo.id, currentBranch);
        setCommits(c);
      } finally {
        setCommitsLoading(false);
      }
    }

    if (s === 'branches' && branches.length === 0) {
      setBranchesLoading(true);
      try {
        const b = await getRepoBranches(repo.id);
        setBranches(b);
      } finally {
        setBranchesLoading(false);
      }
    }

    if (s === 'tags' && tags.length === 0) {
      setTagsLoading(true);
      try {
        const tg = await getRepoTags(repo.id);
        setTags(tg);
      } finally {
        setTagsLoading(false);
      }
    }
  }, [repo, commits, branches, tags, currentBranch]);

  // ─── File open ────────────────────────────────────────────────────────────

  const handleFileOpen = useCallback(async (node: TreeNode) => {
    if (!repo) return;
    setSelectedNode(node);
    setFileDetail(null);
    setBlame([]);
    setFileCommits([]);
    setDiff(null);
    setSelectedCommit(null);
    setFileDetailLoading(true);

    try {
      const detail = await getRepoFileDetail(repo.id, node.path);
      setFileDetail(detail);
    } catch {
      // Fallback: use content from tree node
      if (node.content !== undefined) {
        setFileDetail({
          path:    node.path,
          name:    node.name,
          content: node.content,
          size:    node.content.length,
          lines:   node.content.split('\n').length,
          type:    node.name.split('.').pop() ?? 'text',
          last_commit: null as any,
        });
      }
    } finally {
      setFileDetailLoading(false);
    }
  }, [repo]);

  // ─── Load blame ────────────────────────────────────────────────────────────

  const handleLoadBlame = useCallback(async () => {
    if (!repo || !selectedNode) return;
    setBlameLoading(true);
    try {
      const b = await getRepoBlame(repo.id, selectedNode.path);
      setBlame(b);
    } finally {
      setBlameLoading(false);
    }
  }, [repo, selectedNode]);

  // ─── Load file history ─────────────────────────────────────────────────────

  const handleLoadFileHistory = useCallback(async () => {
    if (!repo || !selectedNode) return;
    setFileCommitsLoading(true);
    try {
      const c = await getRepoCommits(repo.id, currentBranch, selectedNode.path);
      setFileCommits(c);
    } finally {
      setFileCommitsLoading(false);
    }
  }, [repo, selectedNode, currentBranch]);

  // ─── Commit select → diff ─────────────────────────────────────────────────

  const handleCommitSelect = useCallback(async (commit: RepoCommit) => {
    if (!repo) return;
    setSelectedCommit(commit);
    setDiff(null);

    // Compute parent SHA by finding commit's index in list and using next one
    const idx    = commits.findIndex(c => c.sha === commit.sha);
    const parent = idx >= 0 && idx + 1 < commits.length ? commits[idx + 1].sha : `${commit.sha}^`;

    try {
      const d = await getRepoDiff(repo.id, parent, commit.sha);
      setDiff(d);
    } catch { /* diff unavailable */ }
  }, [repo, commits]);

  // ─── Search ───────────────────────────────────────────────────────────────

  const handleSearch = useCallback(async (query: string, type: 'code' | 'file') => {
    if (!repo) return [];
    return searchRepo(repo.id, query, type);
  }, [repo]);

  // ─── Open file from search ────────────────────────────────────────────────

  const handleOpenFromSearch = useCallback((path: string) => {
    const node = treeNodes.find(n => n.path === path) ?? { name: path.split('/').pop() ?? path, type: 'file' as const, path };
    handleFileOpen(node);
    setSection('files');
  }, [treeNodes, handleFileOpen]);

  // ─── Derived values ───────────────────────────────────────────────────────

  const latestPipeline = commits[0]?.pipeline_status || '';
  const initials = (project?.name ?? 'P')[0].toUpperCase();
  const avatarBg = project?.avatar_color ?? t.brandPrimary;

  // Ctrl+K → open search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        handleSectionChange('search');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSectionChange]);

  // ─── Right panel context ──────────────────────────────────────────────────

  const rightCtx = (() => {
    if (fileDetail && selectedNode)    return { type: 'file'   as const, file:   fileDetail };
    if (selectedCommit)                return { type: 'commit' as const, commit: selectedCommit };
    const activeBranch = branches.find(b => b.name === currentBranch);
    if (activeBranch && section === 'branches') return { type: 'branch' as const, branch: activeBranch };
    return { type: 'default' as const };
  })();

  // ─── Loading / Error ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', bgcolor: t.background }}>
        <CircularProgress sx={{ color: t.brandPrimary }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
        <Button sx={{ mt: 2 }} onClick={() => repoId
          ? navigate('/developer/Dashboard/repositories')
          : navigate(`/developer/Dashboard/projects/${id}`)}>
          {repoId ? '← Back to Repositories' : '← Back to Project'}
        </Button>
      </Box>
    );
  }

  if (repoId ? !repo : (!project?.has_repo || !repo)) {
    const defaultName = project?.project_key || project?.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || '';
    const repoName = repoNameInput || defaultName;

    const handleInit = async () => {
      if (!id) return;
      setInitializing(true);
      setInitError(null);
      try {
        await initProjectRepo(id, repoName);
        // Reload the full page state
        window.location.reload();
      } catch (e: any) {
        setInitError(e?.response?.data?.detail ?? 'Failed to initialize repository. Please try again.');
        setInitializing(false);
      }
    };

    const FILES_TO_INIT = [
      { name: 'README.md',        desc: 'Project overview and documentation' },
      { name: '.gitignore',       desc: 'Ignore patterns for common runtimes' },
      { name: 'orcacloud.yaml',  desc: 'Platform configuration' },
      { name: 'pipeline.yaml',    desc: 'Default CI/CD pipeline definition' },
      { name: 'src/main.py',      desc: 'Application entry point' },
      { name: 'tests/test_main.py', desc: 'Placeholder test suite' },
      { name: 'requirements.txt', desc: 'Python dependency manifest' },
    ];

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: t.background, fontFamily: FONT }}>
        {/* minimal top bar */}
        <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1.25, borderBottom: `1px solid ${t.border}`, bgcolor: t.surface, gap: 1 }}>
          <Button size="small" startIcon={<ArrowBackIcon />}
            onClick={() => repoId
              ? navigate('/developer/Dashboard/repositories')
              : navigate(`/developer/Dashboard/projects/${id}`)}
            sx={{ textTransform: 'none', color: t.textSecondary, '&:hover': { color: t.textPrimary }, minWidth: 0 }}>
            {repoId ? 'Repositories' : 'Project'}
          </Button>
          <Typography sx={{ color: t.textTertiary, fontSize: '.8rem' }}>/</Typography>
          <Typography sx={{ fontSize: '.88rem', color: t.textSecondary, fontFamily: MONO }}>Repository</Typography>
        </Box>

        {/* main init content */}
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: { xs: 2, md: 4 } }}>
          <Box sx={{ width: '100%', maxWidth: 600 }}>

            {/* hero */}
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Box sx={{ width: 64, height: 64, borderRadius: '16px', bgcolor: `${t.brandPrimary}14`, border: `1px solid ${t.brandPrimary}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2.5 }}>
                <AccountTreeIcon sx={{ fontSize: '1.75rem', color: t.brandPrimary }} />
              </Box>
              <Typography sx={{ fontWeight: 800, fontSize: '1.35rem', color: t.textPrimary, letterSpacing: '-.02em' }}>
                Initialize Repository
              </Typography>
              <Typography sx={{ color: t.textSecondary, fontSize: '.9rem', mt: 0.75, lineHeight: 1.6 }}>
                Create an OrcaCloud repository for <strong style={{ color: t.textPrimary }}>{project?.name}</strong>.<br />
                It will be pre-loaded with a CI/CD pipeline, source scaffold, and README.
              </Typography>
            </Box>

            {/* repo name input */}
            <Box sx={{ bgcolor: t.surface, border: `1px solid ${t.border}`, borderRadius: '12px', p: 3, mb: 2.5 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '.82rem', color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.07em', mb: 1.5 }}>Repository Name</Typography>
              <TextField
                fullWidth size="small" value={repoNameInput || defaultName}
                onChange={e => setRepoNameInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                placeholder={defaultName}
                InputProps={{ sx: { fontFamily: MONO, fontSize: '.9rem', color: t.textPrimary } }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: t.background, borderRadius: '8px',
                    '& fieldset': { borderColor: t.border },
                    '&:hover fieldset': { borderColor: t.borderStrong },
                    '&.Mui-focused fieldset': { borderColor: t.brandPrimary, boxShadow: `0 0 0 3px ${t.brandPrimary}22` },
                  },
                }}
              />
              <Typography sx={{ fontSize: '.75rem', color: t.textTertiary, mt: 0.75 }}>
                Lowercase letters, numbers, and hyphens only.
              </Typography>
            </Box>

            {/* files that will be created */}
            <Box sx={{ bgcolor: t.surface, border: `1px solid ${t.border}`, borderRadius: '12px', p: 3, mb: 3 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '.82rem', color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.07em', mb: 1.5 }}>
                Files to be created
              </Typography>
              <Stack spacing={0.75}>
                {FILES_TO_INIT.map(f => (
                  <Box key={f.name} sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                    <CheckCircleIcon sx={{ fontSize: '.85rem', color: dashboardSemanticColors.success, flexShrink: 0 }} />
                    <Typography sx={{ fontFamily: MONO, fontSize: '.8rem', color: t.textPrimary, minWidth: 180 }}>{f.name}</Typography>
                    <Typography sx={{ fontSize: '.78rem', color: t.textTertiary }}>{f.desc}</Typography>
                  </Box>
                ))}
              </Stack>
            </Box>

            {/* branches */}
            <Box sx={{ bgcolor: t.surface, border: `1px solid ${t.border}`, borderRadius: '12px', p: 3, mb: 3 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '.82rem', color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.07em', mb: 1.5 }}>
                Default Branches
              </Typography>
              <Stack direction="row" spacing={1}>
                {['main', 'develop'].map(b => (
                  <Chip key={b} label={b} size="small"
                    icon={<CallSplitIcon sx={{ fontSize: '.8rem !important' }} />}
                    sx={{ fontFamily: MONO, fontWeight: 700, bgcolor: `${t.brandPrimary}12`, color: t.brandPrimary, border: `1px solid ${t.brandPrimary}30`, '& .MuiChip-icon': { color: t.brandPrimary } }}
                  />
                ))}
              </Stack>
            </Box>

            {initError && <Alert severity="error" sx={{ mb: 2, borderRadius: '10px' }}>{initError}</Alert>}

            <Stack spacing={1.5}>
              <Button
                variant="contained" fullWidth size="large"
                onClick={handleInit}
                disabled={initializing}
                startIcon={initializing ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <AccountTreeIcon />}
                sx={{
                  bgcolor: t.brandPrimary, '&:hover': { bgcolor: dashboardTokens.colors.brandPrimaryHover },
                  fontWeight: 800, fontSize: '.95rem', borderRadius: '10px',
                  textTransform: 'none', boxShadow: 'none', py: 1.25,
                }}
              >
                {initializing ? 'Initializing Repository…' : 'Initialize Repository'}
              </Button>
              <Button
                fullWidth variant="outlined" size="medium"
                onClick={() => navigate(`/developer/Dashboard/projects/repo/setup?project=${id}&mode=import`)}
                sx={{ textTransform: 'none', fontWeight: 600, color: t.textSecondary, borderColor: t.border, borderRadius: '10px', '&:hover': { borderColor: t.brandPrimary, color: t.brandPrimary } }}
              >
                Import from GitHub / GitLab / Bitbucket instead
              </Button>
            </Stack>
          </Box>
        </Box>
      </Box>
    );
  }

  // TypeScript narrowing: repo is guaranteed non-null past the gate above
  if (!repo) return null;

  // Context-aware back navigation: workspace > group > project > repositories
  const backPath  = repo.workspace_id
    ? `/developer/Dashboard/workspaces/${repo.workspace_id}`
    : repo.group_id
      ? `/groups/${repo.group_id}`
      : id
        ? `/developer/Dashboard/projects/${id}`
        : '/developer/Dashboard/repositories';
  const backLabel = repo.workspace_id
    ? 'Workspace'
    : repo.group_id
      ? 'Group'
      : id
        ? 'Project'
        : 'Repositories';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: t.background, fontFamily: FONT }}>

      {/* ══ TOP BAR ══════════════════════════════════════════════════════════ */}
      <Box sx={{
        display: 'flex', alignItems: 'center', px: 2, py: 1.25,
        borderBottom: `1px solid ${t.border}`, bgcolor: t.surface,
        gap: 1.5, flexShrink: 0, flexWrap: 'wrap',
      }}>
        <Button size="small" startIcon={<ArrowBackIcon />}
          onClick={() => navigate(backPath)}
          sx={{ textTransform: 'none', color: t.textSecondary, '&:hover': { color: t.textPrimary }, minWidth: 0 }}>
          {backLabel}
        </Button>
        <Typography sx={{ color: t.textTertiary, fontSize: '.8rem' }}>/</Typography>

        <Stack direction="row" alignItems="center" spacing={1}>
          <Box sx={{ width: 26, height: 26, borderRadius: '7px', bgcolor: avatarBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Typography sx={{ color: '#fff', fontSize: '.68rem', fontWeight: 800 }}>{initials}</Typography>
          </Box>
          <Typography sx={{ fontSize: '.88rem', color: t.textSecondary }}>{project?.name}</Typography>
          <Typography sx={{ color: t.textTertiary, fontSize: '.8rem' }}>/</Typography>
          <Typography sx={{ fontFamily: MONO, fontWeight: 700, fontSize: '.88rem', color: t.textPrimary }}>
            {repo.repo_name}
          </Typography>
        </Stack>

        {/* Pipeline status */}
        {latestPipeline && (
          <Stack direction="row" alignItems="center" spacing={0.5}
            sx={{ px: 0.9, py: 0.3, borderRadius: '6px', bgcolor: `${PIPE_COLORS[latestPipeline] ?? '#71717A'}18` }}>
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: PIPE_COLORS[latestPipeline] ?? '#71717A', flexShrink: 0 }} />
            <Typography sx={{ fontSize: '.72rem', fontWeight: 700, color: PIPE_COLORS[latestPipeline] ?? '#71717A', textTransform: 'capitalize' }}>
              {latestPipeline}
            </Typography>
          </Stack>
        )}

        {project?.visibility && (
          <Chip
            label={project.visibility}
            size="small"
            sx={{ height: 18, fontSize: '.62rem', fontWeight: 700, bgcolor: t.surfaceSubtle, color: t.textTertiary, border: `1px solid ${t.border}`, textTransform: 'capitalize', '& .MuiChip-label': { px: 0.75 } }}
          />
        )}

        {/* Search box */}
        <Box
          onClick={() => handleSectionChange('search')}
          sx={{
            display: 'flex', alignItems: 'center', gap: 0.75,
            px: 1.25, py: 0.55,
            border: `1px solid ${section === 'search' ? t.brandPrimary : t.border}`,
            borderRadius: '8px',
            bgcolor: section === 'search' ? `${t.brandPrimary}08` : t.background,
            cursor: 'pointer', transition: 'all .14s',
            minWidth: 200,
            '&:hover': { borderColor: t.brandPrimary, bgcolor: `${t.brandPrimary}08` },
          }}
        >
          <SearchIcon sx={{ fontSize: '.9rem', color: section === 'search' ? t.brandPrimary : t.textTertiary, flexShrink: 0 }} />
          <Typography sx={{ fontSize: '.8rem', color: section === 'search' ? t.brandPrimary : t.textTertiary, fontFamily: FONT, flex: 1 }}>
            Search resources…
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
            <Typography sx={{ fontSize: '.65rem', color: t.textTertiary, bgcolor: t.surfaceSubtle, border: `1px solid ${t.border}`, borderRadius: '4px', px: 0.5, lineHeight: '16px', fontFamily: 'monospace' }}>Ctrl</Typography>
            <Typography sx={{ fontSize: '.65rem', color: t.textTertiary, bgcolor: t.surfaceSubtle, border: `1px solid ${t.border}`, borderRadius: '4px', px: 0.5, lineHeight: '16px', fontFamily: 'monospace' }}>K</Typography>
          </Box>
        </Box>

        <Stack direction="row" spacing={0.75} sx={{ ml: 'auto' }}>
          <Button size="small" variant="outlined"
            onClick={() => navigate(`/developer/Dashboard/cicd`)}
            startIcon={<PlayCircleIcon sx={{ fontSize: '.85rem' }} />}
            sx={{ textTransform: 'none', fontSize: '.75rem', color: t.textSecondary, borderColor: t.border, borderRadius: '8px', fontWeight: 600, py: 0.4, '&:hover': { borderColor: t.brandPrimary, color: t.brandPrimary } }}>
            Pipelines
          </Button>
          <Button size="small" variant="outlined"
            onClick={() => navigate(`/developer/Dashboard/workspace`)}
            sx={{ textTransform: 'none', fontSize: '.75rem', color: t.textSecondary, borderColor: t.border, borderRadius: '8px', fontWeight: 600, py: 0.4, '&:hover': { borderColor: t.brandPrimary, color: t.brandPrimary } }}>
            Open in Workspace
          </Button>
        </Stack>
      </Box>

      {/* ══ THREE‑PANEL BODY ════════════════════════════════════════════════ */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>

        {/* ── LEFT NAV ── */}
        <RepoNav
          repoName={repo.repo_name}
          branch={currentBranch}
          active={section}
          onSelect={handleSectionChange}
          pipelineStatus={latestPipeline as any}
          prs={0}
          issues={0}
        />

        {/* ── CENTER PANEL ── */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

          {/* Files section */}
          {section === 'files' && !selectedNode && (
            <RepoFileBrowser
              nodes={treeNodes}
              repoName={repo.repo_name}
              branch={currentBranch}
              branches={branches}
              branchesLoading={branchesLoading}
              loadingTree={treeLoading}
              onFileOpen={handleFileOpen}
              onBranchSwitch={handleBranchSwitch}
            />
          )}
          {section === 'files' && selectedNode && (
            <RepoFileViewer
              file={fileDetail}
              loading={fileDetailLoading}
              blame={blame}
              blameLoading={blameLoading}
              commits={fileCommits}
              commitsLoading={fileCommitsLoading}
              branch={currentBranch}
              onClose={() => { setSelectedNode(null); setFileDetail(null); setBlame([]); setFileCommits([]); }}
              onLoadBlame={handleLoadBlame}
              onLoadHistory={handleLoadFileHistory}
              onSelectCommit={handleCommitSelect}
            />
          )}

          {/* Commits section — show diff if commit selected, else list */}
          {section === 'commits' && !selectedCommit && (
            <RepoCommitList
              commits={commits}
              loading={commitsLoading}
              branch={currentBranch}
              onSelect={handleCommitSelect}
            />
          )}
          {section === 'commits' && selectedCommit && diff && (
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Box sx={{ px: 2.5, py: 1, borderBottom: `1px solid ${t.border}`, bgcolor: t.surface, flexShrink: 0 }}>
                <Button size="small" startIcon={<ArrowBackIcon sx={{ fontSize: '.85rem' }} />}
                  onClick={() => { setSelectedCommit(null); setDiff(null); }}
                  sx={{ textTransform: 'none', color: t.textSecondary, '&:hover': { color: t.textPrimary } }}>
                  Back to commits
                </Button>
              </Box>
              <Box sx={{ flex: 1, overflow: 'hidden' }}>
                <RepoDiffViewer diff={diff} />
              </Box>
            </Box>
          )}
          {section === 'commits' && selectedCommit && !diff && (
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CircularProgress sx={{ color: t.brandPrimary }} />
            </Box>
          )}

          {/* Branches */}
          {section === 'branches' && (
            <BranchListPanel
              branches={branches}
              loading={branchesLoading}
              currentBranch={currentBranch}
              onSwitch={handleBranchSwitch}
            />
          )}

          {/* Tags */}
          {section === 'tags' && (
            <Box sx={{ flex: 1, overflowY: 'auto' }}>
              <TagListPanel tags={tags} loading={tagsLoading} />
            </Box>
          )}

          {/* Pipelines */}
          {section === 'pipelines' && (
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ px: 2.5, py: 1.25, borderBottom: `1px solid ${t.border}`, bgcolor: t.surfaceSubtle, flexShrink: 0 }}>
                <Typography sx={{ fontWeight: 700, fontSize: '.85rem', color: t.textPrimary }}>Pipelines</Typography>
                <Typography sx={{ fontSize: '.75rem', color: t.textSecondary }}>CI/CD run history for this repository</Typography>
              </Box>
              <Box sx={{ flex: 1, overflowY: 'auto' }}>
                {commits.length === 0
                  ? <ComingSoon title="No pipeline runs yet" icon={<PlayCircleIcon />} description="Pipelines will appear here when commits trigger CI/CD jobs." />
                  : commits.filter(c => c.pipeline_status).map(c => (
                    <Box key={c.sha} sx={{ px: 2.5, py: 1.25, borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: PIPE_COLORS[c.pipeline_status] ?? '#71717A', flexShrink: 0 }} />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography noWrap sx={{ fontSize: '.82rem', fontWeight: 600, color: t.textPrimary }}>{c.message}</Typography>
                        <Typography sx={{ fontSize: '.72rem', color: t.textSecondary }}>{c.author?.name} · {c.short_sha} · {c.branch}</Typography>
                      </Box>
                      <Chip
                        label={c.pipeline_status}
                        size="small"
                        sx={{ height: 18, fontSize: '.62rem', fontWeight: 700, textTransform: 'capitalize',
                          bgcolor: `${PIPE_COLORS[c.pipeline_status] ?? '#71717A'}18`,
                          color: PIPE_COLORS[c.pipeline_status] ?? '#71717A',
                          '& .MuiChip-label': { px: 0.75 } }}
                      />
                    </Box>
                  ))
                }
              </Box>
            </Box>
          )}

          {/* Pull Requests */}
          {section === 'prs' && (
            <ComingSoon title="Pull Requests" icon={<MergeIcon />} description="Open and merged pull requests will appear here. Create a PR by comparing two branches." />
          )}

          {/* Issues */}
          {section === 'issues' && (
            <ComingSoon title="Issues" icon={<BugReportIcon />} description="Track bugs, feature requests, and tasks here. Issues are linked to commits and PRs." />
          )}

          {/* Wiki */}
          {section === 'wiki' && (
            <ComingSoon title="Wiki / Docs" icon={<MenuBookIcon />} description="Write and organize documentation for this repository using markdown pages." />
          )}

          {/* Releases */}
          {section === 'releases' && (
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ px: 2.5, py: 1.25, borderBottom: `1px solid ${t.border}`, bgcolor: t.surfaceSubtle, flexShrink: 0 }}>
                <Typography sx={{ fontWeight: 700, fontSize: '.85rem', color: t.textPrimary }}>Releases</Typography>
              </Box>
              <Box sx={{ flex: 1, overflowY: 'auto' }}>
                {tags.length === 0
                  ? <ComingSoon title="No releases yet" icon={<RocketLaunchIcon />} description="Create a tag on a commit to produce a release. Releases appear here automatically." />
                  : tags.map(tg => (
                    <Box key={tg.name} sx={{ px: 2.5, py: 1.5, borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                      <RocketLaunchIcon sx={{ fontSize: '.95rem', color: t.brandPrimary, mt: '2px' }} />
                      <Box sx={{ flex: 1 }}>
                        <Typography sx={{ fontFamily: MONO, fontWeight: 700, fontSize: '.88rem', color: t.textPrimary }}>{tg.name}</Typography>
                        {tg.message && <Typography sx={{ fontSize: '.8rem', color: t.textSecondary, mt: 0.3 }}>{tg.message}</Typography>}
                        {tg.date && <Typography sx={{ fontSize: '.72rem', color: t.textTertiary, mt: 0.2 }}>{new Date(tg.date).toLocaleDateString()}</Typography>}
                      </Box>
                    </Box>
                  ))
                }
              </Box>
            </Box>
          )}

          {/* Search */}
          {section === 'search' && (
            <RepoSearchPanel
              onSearch={handleSearch}
              onOpenFile={handleOpenFromSearch}
            />
          )}

          {/* Settings */}
          {section === 'settings' && (
            <RepoSettingsPanel
              repo={repo}
              project={project}
              onBack={() => setSection('files')}
              onDeleted={() => navigate(backPath)}
            />
          )}
        </Box>

        {/* ── RIGHT SIDEBAR ── */}
        <RepoRightPanel
          ctx={rightCtx}
          repoName={repo.repo_name}
          defaultBranch={currentBranch}
          latestPipeline={latestPipeline}
          branchCount={branches.length}
          commitCount={commits.length}
        />
      </Box>
    </Box>
  );
};

export default RepositoryPage;
