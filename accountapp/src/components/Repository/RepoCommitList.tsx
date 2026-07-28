/**
 * RepoCommitList — Commit history with author, message, timestamp, pipeline status.
 */
import React from 'react';
import {
  Avatar,
  Box,
  Chip,
  CircularProgress,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import AccountTreeIcon  from '@mui/icons-material/AccountTree';
import CallSplitIcon    from '@mui/icons-material/CallSplit';
import { dashboardTokens } from '../../styles/dashboardDesignSystem';
import type { RepoCommit } from '../../services/projectsApi';

const t    = dashboardTokens.colors;
const FONT = dashboardTokens.typography.fontFamily;

// ─── Pipeline status chip ──────────────────────────────────────────────────────

const PIPE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  success: { bg: 'rgba(34,197,94,.1)',   text: '#22C55E', dot: '#22C55E' },
  failure: { bg: 'rgba(239,68,68,.1)',   text: '#EF4444', dot: '#EF4444' },
  running: { bg: 'rgba(245,158,11,.1)',  text: '#F59E0B', dot: '#F59E0B' },
  pending: { bg: 'rgba(113,113,122,.1)', text: '#71717A', dot: '#71717A' },
  skipped: { bg: 'rgba(113,113,122,.1)', text: '#71717A', dot: '#71717A' },
};

const PipelineChip: React.FC<{ status: string }> = ({ status }) => {
  if (!status) return null;
  const c = PIPE_COLORS[status] ?? PIPE_COLORS.pending;
  return (
    <Chip
      label={status}
      size="small"
      sx={{
        height: 18,
        fontSize: '.62rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '.04em',
        bgcolor: c.bg,
        color: c.text,
        border: `1px solid ${c.dot}40`,
        '& .MuiChip-label': { px: 0.75 },
      }}
    />
  );
};

// ─── Relative time helper ──────────────────────────────────────────────────────

function relative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s    = Math.floor(diff / 1000);
  if (s < 60)     return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60)     return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)     return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30)     return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Single commit row ─────────────────────────────────────────────────────────

interface CommitRowProps {
  commit:    RepoCommit;
  onSelect:  (c: RepoCommit) => void;
  selected:  boolean;
}

const CommitRow: React.FC<CommitRowProps> = ({ commit, onSelect, selected }) => {
  const initials = (commit.author?.name ?? '?').slice(0, 2).toUpperCase();

  return (
    <Box
      onClick={() => onSelect(commit)}
      sx={{
        display: 'grid',
        gridTemplateColumns: '32px 1fr auto',
        gap: 1.5,
        px: 2.5, py: 1.25,
        borderBottom: `1px solid ${t.border}`,
        cursor: 'pointer',
        bgcolor: selected ? 'rgba(21,61,117,.06)' : 'transparent',
        '&:hover': { bgcolor: selected ? 'rgba(21,61,117,.09)' : t.surfaceHover },
        transition: 'background .1s',
      }}
    >
      {/* Avatar */}
      <Avatar sx={{ width: 28, height: 28, bgcolor: t.brandPrimary, fontSize: '.68rem', fontWeight: 800, mt: '2px' }}>
        {initials}
      </Avatar>

      {/* Message + meta */}
      <Box sx={{ minWidth: 0 }}>
        <Typography noWrap sx={{
          fontSize: '.85rem', fontWeight: 600,
          color: selected ? t.brandPrimary : t.textPrimary, mb: 0.25,
        }}>
          {commit.message}
        </Typography>
        <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
          <Typography sx={{ fontSize: '.72rem', color: t.textSecondary }}>
            {commit.author?.name ?? 'Unknown'}
          </Typography>
          <Typography sx={{ fontSize: '.72rem', color: t.textTertiary }}>
            {relative(commit.timestamp)}
          </Typography>
          <Stack direction="row" alignItems="center" spacing={0.35}>
            <CallSplitIcon sx={{ fontSize: '.65rem', color: t.textTertiary }} />
            <Typography sx={{ fontSize: '.7rem', color: t.textTertiary, fontFamily: '"JetBrains Mono",monospace' }}>
              {commit.branch}
            </Typography>
          </Stack>
          {commit.files_changed > 0 && (
            <Typography sx={{ fontSize: '.7rem', color: t.textTertiary }}>
              {commit.files_changed} file{commit.files_changed !== 1 ? 's' : ''} changed
            </Typography>
          )}
        </Stack>
      </Box>

      {/* Right: SHA + pipeline */}
      <Stack alignItems="flex-end" spacing={0.4} sx={{ flexShrink: 0 }}>
        <Tooltip title={commit.sha} placement="left">
          <Typography sx={{
            fontFamily: '"JetBrains Mono","Fira Code",monospace',
            fontSize: '.75rem', fontWeight: 600,
            color: t.brandPrimary,
            cursor: 'pointer',
            px: 0.75, py: 0.2, borderRadius: '5px',
            bgcolor: 'rgba(21,61,117,.07)',
            '&:hover': { bgcolor: 'rgba(21,61,117,.14)' },
          }}>
            {commit.short_sha}
          </Typography>
        </Tooltip>
        <PipelineChip status={commit.pipeline_status} />
      </Stack>
    </Box>
  );
};

// ─── Main component ────────────────────────────────────────────────────────────

interface RepoCommitListProps {
  commits:     RepoCommit[];
  loading:     boolean;
  branch:      string;
  onSelect:    (c: RepoCommit) => void;
  selectedSha?: string;
}

export const RepoCommitList: React.FC<RepoCommitListProps> = ({
  commits, loading, branch, onSelect, selectedSha,
}) => {
  if (loading) {
    return (
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT }}>
        <CircularProgress sx={{ color: t.brandPrimary }} />
      </Box>
    );
  }

  if (commits.length === 0) {
    return (
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT }}>
        <Box sx={{ textAlign: 'center' }}>
          <AccountTreeIcon sx={{ fontSize: '2rem', color: t.textTertiary, mb: 1 }} />
          <Typography sx={{ fontSize: '.85rem', color: t.textSecondary }}>No commits found on {branch}</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: FONT }}>
      {/* Header */}
      <Box sx={{
        px: 2.5, py: 1.25,
        borderBottom: `1px solid ${t.border}`,
        bgcolor: t.surfaceSubtle,
        display: 'flex', alignItems: 'center', gap: 1,
        flexShrink: 0,
      }}>
        <AccountTreeIcon sx={{ fontSize: '.85rem', color: t.textSecondary }} />
        <Typography sx={{ fontWeight: 700, fontSize: '.82rem', color: t.textPrimary }}>
          Commits
        </Typography>
        <Chip
          label={commits.length}
          size="small"
          sx={{ height: 18, fontSize: '.65rem', fontWeight: 700, bgcolor: t.surfaceSubtle, color: t.textSecondary, border: `1px solid ${t.border}`, ml: 0.5, '& .MuiChip-label': { px: 0.75 } }}
        />
        <Stack direction="row" alignItems="center" spacing={0.4} sx={{ ml: 'auto' }}>
          <CallSplitIcon sx={{ fontSize: '.72rem', color: t.textTertiary }} />
          <Typography sx={{ fontSize: '.72rem', color: t.textSecondary, fontFamily: '"JetBrains Mono",monospace' }}>
            {branch}
          </Typography>
        </Stack>
      </Box>

      {/* Commit list */}
      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        {commits.map((c) => (
          <CommitRow
            key={c.sha}
            commit={c}
            onSelect={onSelect}
            selected={selectedSha === c.sha}
          />
        ))}
      </Box>
    </Box>
  );
};

export default RepoCommitList;
