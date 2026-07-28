/**
 * RepoNav — Left sidebar navigation for the Repository page.
 * Mirrors GitHub/GitLab repository navigation.
 */
import React from 'react';
import {
  Box,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import AccountTreeIcon    from '@mui/icons-material/AccountTree';
import BugReportIcon      from '@mui/icons-material/BugReport';
import CallSplitIcon      from '@mui/icons-material/CallSplit';
import FolderIcon         from '@mui/icons-material/Folder';
import HistoryIcon        from '@mui/icons-material/History';
import LocalOfferIcon     from '@mui/icons-material/LocalOffer';
import MergeIcon          from '@mui/icons-material/MergeType';
import PlayCircleIcon     from '@mui/icons-material/PlayCircle';
import RocketLaunchIcon   from '@mui/icons-material/RocketLaunch';
import SettingsIcon       from '@mui/icons-material/Settings';
import MenuBookIcon       from '@mui/icons-material/MenuBook';
import { dashboardTokens } from '../../styles/dashboardDesignSystem';

const t    = dashboardTokens.colors;
const FONT = dashboardTokens.typography.fontFamily;

export type RepoSection =
  | 'files'
  | 'commits'
  | 'branches'
  | 'tags'
  | 'pipelines'
  | 'prs'
  | 'issues'
  | 'wiki'
  | 'releases'
  | 'search'
  | 'settings';

interface NavItem {
  id:     RepoSection;
  label:  string;
  icon:   React.ReactNode;
  badge?: number;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'files',    label: 'Files',          icon: <FolderIcon        sx={{ fontSize: '1rem' }} /> },
  { id: 'commits',  label: 'Commits',        icon: <HistoryIcon       sx={{ fontSize: '1rem' }} /> },
  { id: 'branches', label: 'Branches',       icon: <CallSplitIcon     sx={{ fontSize: '1rem' }} /> },
  { id: 'tags',     label: 'Tags',           icon: <LocalOfferIcon    sx={{ fontSize: '1rem' }} /> },
  { id: 'pipelines',label: 'Pipelines',      icon: <PlayCircleIcon    sx={{ fontSize: '1rem' }} /> },
  { id: 'prs',      label: 'Pull Requests',  icon: <MergeIcon         sx={{ fontSize: '1rem' }} /> },
  { id: 'issues',   label: 'Issues',         icon: <BugReportIcon     sx={{ fontSize: '1rem' }} /> },
  { id: 'wiki',     label: 'Wiki / Docs',    icon: <MenuBookIcon      sx={{ fontSize: '1rem' }} /> },
  { id: 'releases', label: 'Releases',       icon: <RocketLaunchIcon  sx={{ fontSize: '1rem' }} /> },
  { id: 'settings', label: 'Settings',       icon: <SettingsIcon      sx={{ fontSize: '1rem' }} /> },
];

interface RepoNavProps {
  repoName:     string;
  branch:       string;
  active:       RepoSection;
  onSelect:     (s: RepoSection) => void;
  pipelineStatus?: 'success' | 'failure' | 'running' | 'pending' | '';
  prs?:         number;
  issues?:      number;
}

const PIPE_DOT: Record<string, string> = {
  success: '#22C55E',
  failure: '#EF4444',
  running: '#F59E0B',
  pending: '#71717A',
};

export const RepoNav: React.FC<RepoNavProps> = ({
  repoName, branch, active, onSelect, pipelineStatus, prs = 0, issues = 0,
}) => {
  const getBadge = (id: RepoSection): number | undefined => {
    if (id === 'prs')    return prs    || undefined;
    if (id === 'issues') return issues || undefined;
    return undefined;
  };

  return (
    <Box sx={{
      width: 220,
      flexShrink: 0,
      borderRight: `1px solid ${t.border}`,
      bgcolor: t.surface,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      fontFamily: FONT,
    }}>

      {/* ── Repo identity header ── */}
      <Box sx={{ px: 2, pt: 2, pb: 1.5, borderBottom: `1px solid ${t.border}` }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.75 }}>
          <AccountTreeIcon sx={{ fontSize: '.9rem', color: t.brandPrimary, flexShrink: 0 }} />
          <Typography noWrap sx={{
            fontFamily: '"JetBrains Mono","Fira Code",monospace',
            fontWeight: 700, fontSize: '.82rem', color: t.textPrimary,
          }}>
            {repoName}
          </Typography>
        </Stack>
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <CallSplitIcon sx={{ fontSize: '.72rem', color: t.textTertiary }} />
          <Typography sx={{ fontSize: '.72rem', color: t.textSecondary, fontFamily: '"JetBrains Mono",monospace' }}>
            {branch}
          </Typography>
          {pipelineStatus && (
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: PIPE_DOT[pipelineStatus] ?? '#71717A', ml: 'auto', flexShrink: 0 }} />
          )}
        </Stack>
      </Box>

      {/* ── Navigation items ── */}
      <Box sx={{ flex: 1, overflowY: 'auto', py: 1 }}>
        {NAV_ITEMS.map((item) => {
          const isActive = active === item.id;
          const badge    = getBadge(item.id);
          return (
            <Stack
              key={item.id}
              direction="row"
              alignItems="center"
              spacing={1.25}
              onClick={() => onSelect(item.id)}
              sx={{
                px: 1.75, py: 0.85,
                cursor: 'pointer',
                borderRadius: '8px',
                mx: 0.75,
                bgcolor: isActive ? 'rgba(21,61,117,.1)' : 'transparent',
                borderLeft: isActive ? `3px solid ${t.brandPrimary}` : '3px solid transparent',
                '&:hover': { bgcolor: isActive ? 'rgba(21,61,117,.12)' : t.surfaceHover },
                transition: 'background .12s',
              }}
            >
              <Box sx={{ color: isActive ? t.brandPrimary : t.textSecondary, flexShrink: 0, mt: '1px' }}>
                {item.icon}
              </Box>
              <Typography sx={{
                flex: 1,
                fontSize: '.82rem',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? t.brandPrimary : t.textPrimary,
              }}>
                {item.label}
              </Typography>
              {badge !== undefined && (
                <Chip
                  label={badge}
                  size="small"
                  sx={{ height: 17, fontSize: '.62rem', fontWeight: 700,
                    bgcolor: isActive ? t.brandPrimary : t.surfaceSubtle,
                    color: isActive ? '#fff' : t.textSecondary,
                    border: `1px solid ${t.border}`,
                    '& .MuiChip-label': { px: 0.6 } }}
                />
              )}
            </Stack>
          );
        })}
      </Box>
    </Box>
  );
};

export default RepoNav;
