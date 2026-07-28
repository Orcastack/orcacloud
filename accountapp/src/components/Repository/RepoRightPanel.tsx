/**
 * RepoRightPanel — Context-aware right sidebar showing file metadata,
 * commit info, pipeline status, branch protection, and insights.
 */
import React from 'react';
import {
  Avatar,
  Box,
  Chip,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import AccountTreeIcon    from '@mui/icons-material/AccountTree';
import CallSplitIcon      from '@mui/icons-material/CallSplit';
import CheckCircleIcon    from '@mui/icons-material/CheckCircle';
import CodeIcon           from '@mui/icons-material/Code';
import ErrorIcon          from '@mui/icons-material/Error';
import GroupIcon          from '@mui/icons-material/Group';
import InsightsIcon       from '@mui/icons-material/Insights';
import LockIcon           from '@mui/icons-material/Lock';
import PersonIcon         from '@mui/icons-material/Person';
import PlayCircleIcon     from '@mui/icons-material/PlayCircle';
import ScheduleIcon       from '@mui/icons-material/Schedule';
import ShieldIcon         from '@mui/icons-material/Shield';
import StorageIcon        from '@mui/icons-material/Storage';
import SyncIcon           from '@mui/icons-material/Sync';
import { dashboardTokens, dashboardSemanticColors } from '../../styles/dashboardDesignSystem';
import type { FileDetail, RepoCommit, RepoBranch } from '../../services/projectsApi';
import { FileBadge } from '../FileTreeExplorer';

const t    = dashboardTokens.colors;
const FONT = dashboardTokens.typography.fontFamily;
const MONO = '"JetBrains Mono","Fira Code",monospace';

// ─── Section heading ───────────────────────────────────────────────────────────

const SectionHead: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
  <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 1.25 }}>
    <Box sx={{ color: t.textSecondary, display: 'flex' }}>{icon}</Box>
    <Typography sx={{ fontWeight: 700, fontSize: '.72rem', color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.07em' }}>
      {label}
    </Typography>
  </Stack>
);

// ─── Key/value row ─────────────────────────────────────────────────────────────

const KV: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <Box sx={{ mb: 0.75 }}>
    <Typography sx={{ fontSize: '.67rem', fontWeight: 700, color: t.textTertiary, textTransform: 'uppercase', letterSpacing: '.05em', mb: 0.1 }}>
      {label}
    </Typography>
    <Box sx={{ fontSize: '.78rem', color: t.textPrimary }}>
      {value}
    </Box>
  </Box>
);

// ─── Pipeline status badge ─────────────────────────────────────────────────────

const PIPE: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
  success: { color: dashboardSemanticColors.success, bg: 'rgba(34,197,94,.1)',  icon: <CheckCircleIcon sx={{ fontSize: '.85rem' }} /> },
  failure: { color: dashboardSemanticColors.danger,  bg: 'rgba(239,68,68,.1)', icon: <ErrorIcon       sx={{ fontSize: '.85rem' }} /> },
  running: { color: dashboardSemanticColors.warning, bg: 'rgba(245,158,11,.1)', icon: <SyncIcon        sx={{ fontSize: '.85rem', animation: 'spin 1.2s linear infinite', '@keyframes spin': { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } } }} /> },
  pending: { color: '#71717A', bg: 'rgba(113,113,122,.1)', icon: <ScheduleIcon sx={{ fontSize: '.85rem' }} /> },
};

const PipelineBadge: React.FC<{ status: string }> = ({ status }) => {
  const c = PIPE[status] ?? PIPE.pending;
  return (
    <Stack direction="row" alignItems="center" spacing={0.6}
      sx={{ px: 1, py: 0.5, borderRadius: '7px', bgcolor: c.bg, border: `1px solid ${c.color}30`, display: 'inline-flex' }}>
      <Box sx={{ color: c.color }}>{c.icon}</Box>
      <Typography sx={{ fontSize: '.78rem', fontWeight: 700, color: c.color, textTransform: 'capitalize' }}>
        {status}
      </Typography>
    </Stack>
  );
};

// ─── Context panels ────────────────────────────────────────────────────────────

const FileMetaPanel: React.FC<{ file: FileDetail }> = ({ file }) => (
  <Box>
    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
      <FileBadge name={file.name} size={22} />
      <Typography noWrap sx={{ fontFamily: MONO, fontSize: '.82rem', fontWeight: 700, color: t.textPrimary }}>
        {file.name}
      </Typography>
    </Stack>

    <KV label="Path"  value={<Typography sx={{ fontFamily: MONO, fontSize: '.76rem', color: t.textSecondary, wordBreak: 'break-all' }}>{file.path}</Typography>} />
    <KV label="Size"  value={`${(file.size / 1024).toFixed(1)} KB`} />
    <KV label="Lines" value={file.lines.toLocaleString()} />
    <KV label="Type"  value={file.type || 'plain text'} />

    {file.last_commit && (
      <>
        <Divider sx={{ borderColor: t.border, my: 1.25 }} />
        <SectionHead icon={<AccountTreeIcon sx={{ fontSize: '.82rem' }} />} label="Last Commit" />
        <KV label="SHA"     value={<Typography sx={{ fontFamily: MONO, fontSize: '.76rem', color: t.brandPrimary }}>{file.last_commit.short_sha}</Typography>} />
        <KV label="Message" value={<Typography sx={{ fontSize: '.78rem', color: t.textPrimary, lineHeight: 1.45 }}>{file.last_commit.message}</Typography>} />
        <KV label="Author"  value={file.last_commit.author?.name ?? 'Unknown'} />
        <KV label="Date"    value={new Date(file.last_commit.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} />
        {file.last_commit.pipeline_status && (
          <>
            <Divider sx={{ borderColor: t.border, my: 1.25 }} />
            <SectionHead icon={<PlayCircleIcon sx={{ fontSize: '.82rem' }} />} label="Pipeline" />
            <PipelineBadge status={file.last_commit.pipeline_status} />
          </>
        )}
      </>
    )}
  </Box>
);

const CommitMetaPanel: React.FC<{ commit: RepoCommit }> = ({ commit }) => (
  <Box>
    <SectionHead icon={<AccountTreeIcon sx={{ fontSize: '.82rem' }} />} label="Commit" />
    <KV label="SHA"     value={<Typography sx={{ fontFamily: MONO, fontSize: '.76rem', color: t.brandPrimary, wordBreak: 'break-all' }}>{commit.sha}</Typography>} />
    <KV label="Message" value={<Typography sx={{ fontSize: '.78rem', color: t.textPrimary, lineHeight: 1.45 }}>{commit.message}</Typography>} />
    <KV label="Branch"  value={
      <Stack direction="row" alignItems="center" spacing={0.4}>
        <CallSplitIcon sx={{ fontSize: '.75rem', color: t.textTertiary }} />
        <Typography sx={{ fontFamily: MONO, fontSize: '.76rem', color: t.textSecondary }}>{commit.branch}</Typography>
      </Stack>
    } />
    <Divider sx={{ borderColor: t.border, my: 1.25 }} />
    <SectionHead icon={<PersonIcon sx={{ fontSize: '.82rem' }} />} label="Author" />
    <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 1 }}>
      <Avatar sx={{ width: 24, height: 24, bgcolor: t.brandPrimary, fontSize: '.68rem', fontWeight: 800 }}>
        {(commit.author?.name ?? '?').slice(0, 2).toUpperCase()}
      </Avatar>
      <Box>
        <Typography sx={{ fontSize: '.78rem', fontWeight: 600, color: t.textPrimary }}>
          {commit.author?.name ?? 'Unknown'}
        </Typography>
        <Typography sx={{ fontSize: '.72rem', color: t.textSecondary }}>
          {commit.author?.email ?? ''}
        </Typography>
      </Box>
    </Stack>
    <KV label="Date" value={new Date(commit.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })} />
    <KV label="Files Changed" value={`${commit.files_changed} file${commit.files_changed !== 1 ? 's' : ''}`} />
    {commit.pipeline_status && (
      <>
        <Divider sx={{ borderColor: t.border, my: 1.25 }} />
        <SectionHead icon={<PlayCircleIcon sx={{ fontSize: '.82rem' }} />} label="Pipeline" />
        <PipelineBadge status={commit.pipeline_status} />
      </>
    )}
  </Box>
);

const BranchMetaPanel: React.FC<{ branch: RepoBranch }> = ({ branch }) => (
  <Box>
    <SectionHead icon={<CallSplitIcon sx={{ fontSize: '.82rem' }} />} label="Branch" />
    <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 1.5 }}>
      <Typography sx={{ fontFamily: MONO, fontSize: '.85rem', fontWeight: 700, color: t.textPrimary }}>
        {branch.name}
      </Typography>
      {branch.protected && (
        <Chip icon={<LockIcon sx={{ fontSize: '.65rem !important' }} />} label="Protected"
          size="small"
          sx={{ height: 17, fontSize: '.6rem', fontWeight: 700, bgcolor: 'rgba(21,61,117,.08)', color: t.brandPrimary, border: `1px solid rgba(21,61,117,.2)`, '& .MuiChip-label': { px: 0.75 } }} />
      )}
    </Stack>
    <KV label="SHA"      value={<Typography sx={{ fontFamily: MONO, fontSize: '.76rem', color: t.brandPrimary }}>{branch.sha.slice(0, 8)}</Typography>} />
    <KV label="Last Commit" value={<Typography sx={{ fontSize: '.78rem', color: t.textPrimary, lineHeight: 1.4 }}>{branch.last_commit_message}</Typography>} />
    <KV label="Updated" value={branch.last_commit_date ? new Date(branch.last_commit_date).toLocaleDateString() : '—'} />
    {(branch.ahead > 0 || branch.behind > 0) && (
      <Stack direction="row" spacing={0.75} sx={{ mt: 0.75 }}>
        {branch.ahead  > 0 && <Chip label={`↑ ${branch.ahead} ahead`}  size="small" sx={{ height: 18, fontSize: '.65rem', fontWeight: 600, bgcolor: 'rgba(34,197,94,.1)',  color: '#22C55E', '& .MuiChip-label': { px: 0.75 } }} />}
        {branch.behind > 0 && <Chip label={`↓ ${branch.behind} behind`} size="small" sx={{ height: 18, fontSize: '.65rem', fontWeight: 600, bgcolor: 'rgba(239,68,68,.1)', color: '#EF4444', '& .MuiChip-label': { px: 0.75 } }} />}
      </Stack>
    )}
    {branch.protected && (
      <>
        <Divider sx={{ borderColor: t.border, my: 1.25 }} />
        <SectionHead icon={<ShieldIcon sx={{ fontSize: '.82rem' }} />} label="Branch Protection" />
        <Stack spacing={0.5}>
          {[
            'Require PR before merge',
            'Require pipeline success',
            'Require code review',
            'No force push',
          ].map(rule => (
            <Stack key={rule} direction="row" alignItems="center" spacing={0.6}>
              <CheckCircleIcon sx={{ fontSize: '.78rem', color: dashboardSemanticColors.success }} />
              <Typography sx={{ fontSize: '.76rem', color: t.textPrimary }}>{rule}</Typography>
            </Stack>
          ))}
        </Stack>
      </>
    )}
  </Box>
);

const DefaultPanel: React.FC<{
  latestPipeline?: string;
  branchCount?: number;
  commitCount?: number;
  repoName: string;
  defaultBranch: string;
}> = ({ latestPipeline, branchCount, commitCount, repoName, defaultBranch }) => (
  <Box>
    <SectionHead icon={<InsightsIcon sx={{ fontSize: '.82rem' }} />} label="Repository Insights" />
    <KV label="Repository" value={<Typography sx={{ fontFamily: MONO, fontSize: '.78rem', fontWeight: 700, color: t.textPrimary }}>{repoName}</Typography>} />
    <KV label="Default Branch" value={
      <Stack direction="row" alignItems="center" spacing={0.4}>
        <CallSplitIcon sx={{ fontSize: '.75rem', color: t.textTertiary }} />
        <Typography sx={{ fontFamily: MONO, fontSize: '.78rem', color: t.textSecondary }}>{defaultBranch}</Typography>
      </Stack>
    } />
    {branchCount !== undefined && <KV label="Branches" value={branchCount.toString()} />}
    {commitCount  !== undefined && <KV label="Total Commits" value={commitCount.toString()} />}

    {latestPipeline && (
      <>
        <Divider sx={{ borderColor: t.border, my: 1.25 }} />
        <SectionHead icon={<PlayCircleIcon sx={{ fontSize: '.82rem' }} />} label="Latest Pipeline" />
        <PipelineBadge status={latestPipeline} />
      </>
    )}

    <Divider sx={{ borderColor: t.border, my: 1.25 }} />
    <SectionHead icon={<ShieldIcon sx={{ fontSize: '.82rem' }} />} label="Security" />
    <Stack direction="row" alignItems="center" spacing={0.6} sx={{ mb: 0.5 }}>
      <CheckCircleIcon sx={{ fontSize: '.78rem', color: dashboardSemanticColors.success }} />
      <Typography sx={{ fontSize: '.76rem', color: t.textPrimary }}>No vulnerabilities detected</Typography>
    </Stack>
    <Stack direction="row" alignItems="center" spacing={0.6}>
      <CheckCircleIcon sx={{ fontSize: '.78rem', color: dashboardSemanticColors.success }} />
      <Typography sx={{ fontSize: '.76rem', color: t.textPrimary }}>Dependencies up to date</Typography>
    </Stack>

    <Divider sx={{ borderColor: t.border, my: 1.25 }} />
    <SectionHead icon={<CodeIcon sx={{ fontSize: '.82rem' }} />} label="Code Quality" />
    <Stack spacing={0.5}>
      <KV label="Linting" value={
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <CheckCircleIcon sx={{ fontSize: '.75rem', color: dashboardSemanticColors.success }} />
          <Typography sx={{ fontSize: '.76rem', color: t.textPrimary }}>Passed</Typography>
        </Stack>
      } />
    </Stack>

    <Divider sx={{ borderColor: t.border, my: 1.25 }} />
    <SectionHead icon={<GroupIcon sx={{ fontSize: '.82rem' }} />} label="Code Owners" />
    <Typography sx={{ fontSize: '.76rem', color: t.textTertiary, lineHeight: 1.55 }}>
      Define code owners in a <Box component="code" sx={{ fontFamily: MONO, color: t.brandPrimary }}>CODEOWNERS</Box> file to auto-assign reviews.
    </Typography>

    <Divider sx={{ borderColor: t.border, my: 1.25 }} />
    <SectionHead icon={<StorageIcon sx={{ fontSize: '.82rem' }} />} label="Storage" />
    <Box sx={{ height: 6, borderRadius: '3px', bgcolor: t.border, mb: 0.5, overflow: 'hidden' }}>
      <Box sx={{ height: '100%', width: '34%', bgcolor: t.brandPrimary, borderRadius: '3px' }} />
    </Box>
    <Typography sx={{ fontSize: '.72rem', color: t.textTertiary }}>3.4 GB of 10 GB used</Typography>
  </Box>
);

// ─── Main exported component ───────────────────────────────────────────────────

type RightPanelContext =
  | { type: 'file';   file:   FileDetail }
  | { type: 'commit'; commit: RepoCommit }
  | { type: 'branch'; branch: RepoBranch }
  | { type: 'default' };

interface RepoRightPanelProps {
  ctx:           RightPanelContext;
  repoName:      string;
  defaultBranch: string;
  latestPipeline?: string;
  branchCount?:  number;
  commitCount?:  number;
}

export const RepoRightPanel: React.FC<RepoRightPanelProps> = ({
  ctx, repoName, defaultBranch, latestPipeline, branchCount, commitCount,
}) => {
  return (
    <Box sx={{
      width: 240,
      flexShrink: 0,
      borderLeft: `1px solid ${t.border}`,
      bgcolor: t.surface,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      fontFamily: FONT,
    }}>
      <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${t.border}`, bgcolor: t.surfaceSubtle, flexShrink: 0 }}>
        <Typography sx={{ fontWeight: 700, fontSize: '.75rem', color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.07em' }}>
          {ctx.type === 'file'   ? 'File Info'
          : ctx.type === 'commit' ? 'Commit Info'
          : ctx.type === 'branch' ? 'Branch Info'
          : 'Repository Info'}
        </Typography>
      </Box>
      <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
        {ctx.type === 'file'   && <FileMetaPanel   file={ctx.file} />}
        {ctx.type === 'commit' && <CommitMetaPanel commit={ctx.commit} />}
        {ctx.type === 'branch' && <BranchMetaPanel branch={ctx.branch} />}
        {ctx.type === 'default' && (
          <DefaultPanel
            latestPipeline={latestPipeline}
            branchCount={branchCount}
            commitCount={commitCount}
            repoName={repoName}
            defaultBranch={defaultBranch}
          />
        )}
      </Box>
    </Box>
  );
};

export default RepoRightPanel;
