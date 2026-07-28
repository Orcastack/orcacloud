/**
 * FileBrowserPanel — GitHub-style file browser for the center panel.
 *
 * - Shows directory contents as a table with folder / file icons + names
 * - Breadcrumb bar for navigating back up the path
 * - Click folder → drill into it
 * - Click file  → calls onFileOpen(node)
 */
import React, { useMemo, useState } from 'react';
import {
  Box,
  Chip,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import CallSplitIcon      from '@mui/icons-material/CallSplit';
import ChevronRightIcon   from '@mui/icons-material/ChevronRight';
import HomeIcon           from '@mui/icons-material/Home';
import { dashboardTokens } from '../styles/dashboardDesignSystem';
import { FileBadge, type TreeNode } from './FileTreeExplorer';

const t    = dashboardTokens.colors;
const FONT = dashboardTokens.typography.fontFamily;

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Walk the tree to find the node at the given path segments. */
function findDir(nodes: TreeNode[], segments: string[]): TreeNode[] {
  if (segments.length === 0) return nodes;
  const head = segments[0];
  const match = nodes.find((n) => n.name === head && n.type === 'dir');
  if (!match) return nodes;
  return findDir(match.children ?? [], segments.slice(1));
}

// ─── Component ─────────────────────────────────────────────────────────────────

interface FileBrowserPanelProps {
  nodes:        TreeNode[];        // root tree returned from API
  repoName:     string;
  branch:       string;
  onFileOpen:   (node: TreeNode) => void;
}

const FileBrowserPanel: React.FC<FileBrowserPanelProps> = ({
  nodes,
  repoName,
  branch,
  onFileOpen,
}) => {
  const [pathSegments, setPathSegments] = useState<string[]>([]);

  // Current directory's children
  const currentNodes = useMemo(
    () => findDir(nodes, pathSegments),
    [nodes, pathSegments],
  );

  // Sorted: directories first, then files, both alphabetically
  const sorted = useMemo(
    () => [...currentNodes].sort((a, b) => {
      if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
      return a.name.localeCompare(b.name);
    }),
    [currentNodes],
  );

  const navigateTo = (segments: string[]) => setPathSegments(segments);
  const goUp       = () => setPathSegments((p) => p.slice(0, -1));

  const handleRowClick = (node: TreeNode) => {
    if (node.type === 'dir') {
      setPathSegments([...pathSegments, node.name]);
    } else {
      onFileOpen(node);
    }
  };

  return (
    <Box sx={{
      display: 'flex', flexDirection: 'column', height: '100%',
      bgcolor: t.background, fontFamily: FONT,
    }}>

      {/* ── Repo header bar ── */}
      <Box sx={{
        px: 2.5, py: 1.25,
        borderBottom: `1px solid ${t.border}`,
        bgcolor: t.surface,
        display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0,
      }}>
        {/* repo name */}
        <Typography sx={{
          fontFamily: '"JetBrains Mono","Fira Code",monospace',
          fontWeight: 700, fontSize: '.88rem', color: t.textPrimary,
        }}>
          {repoName}
        </Typography>

        <Divider orientation="vertical" flexItem sx={{ borderColor: t.border }} />

        {/* branch */}
        <Stack direction="row" alignItems="center" spacing={0.5}
          sx={{ px: 1, py: 0.4, borderRadius: '6px', bgcolor: t.surfaceSubtle, border: `1px solid ${t.border}` }}>
          <CallSplitIcon sx={{ fontSize: '.8rem', color: t.textSecondary }} />
          <Typography sx={{ fontSize: '.78rem', fontWeight: 600, color: t.textSecondary,
            fontFamily: '"JetBrains Mono","Fira Code",monospace' }}>
            {branch}
          </Typography>
        </Stack>

        {/* file count */}
        <Chip
          label={`${nodes.length} items at root`}
          size="small"
          sx={{ fontSize: '.65rem', bgcolor: t.surfaceSubtle, color: t.textTertiary,
            border: `1px solid ${t.border}`, height: 20, ml: 'auto' }}
        />
      </Box>

      {/* ── Breadcrumb bar ── */}
      <Box sx={{
        px: 2.5, py: '7px',
        borderBottom: `1px solid ${t.border}`,
        bgcolor: t.surface,
        display: 'flex', alignItems: 'center', gap: 0.3, flexShrink: 0,
        flexWrap: 'wrap',
      }}>
        {/* Home crumb */}
        <Stack
          direction="row" alignItems="center" spacing={0.3}
          onClick={() => navigateTo([])}
          sx={{
            cursor: 'pointer', px: 0.75, py: 0.2, borderRadius: '5px',
            '&:hover': { bgcolor: t.surfaceHover },
          }}
        >
          <HomeIcon sx={{ fontSize: '.8rem', color: t.brandPrimary }} />
          <Typography sx={{ fontSize: '.78rem', fontWeight: 600, color: t.brandPrimary }}>
            {repoName}
          </Typography>
        </Stack>

        {/* Intermediate segments */}
        {pathSegments.map((seg, i) => {
          const isLast = i === pathSegments.length - 1;
          return (
            <React.Fragment key={seg + i}>
              <ChevronRightIcon sx={{ fontSize: '.75rem', color: t.textTertiary }} />
              <Typography
                onClick={() => !isLast && navigateTo(pathSegments.slice(0, i + 1))}
                sx={{
                  fontSize: '.78rem',
                  fontWeight: isLast ? 700 : 500,
                  color: isLast ? t.textPrimary : t.brandPrimary,
                  cursor: isLast ? 'default' : 'pointer',
                  fontFamily: '"JetBrains Mono","Fira Code",monospace',
                  px: 0.5, py: 0.2, borderRadius: '5px',
                  '&:hover': isLast ? {} : { bgcolor: t.surfaceHover },
                }}
              >
                {seg}
              </Typography>
            </React.Fragment>
          );
        })}
      </Box>

      {/* ── File listing table ── */}
      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        {/* Table header */}
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          px: 3, py: 0.75,
          borderBottom: `1px solid ${t.border}`,
          bgcolor: t.surfaceSubtle,
        }}>
          <Typography sx={{ fontSize: '.72rem', fontWeight: 700, color: t.textTertiary, textTransform: 'uppercase', letterSpacing: '.06em' }}>
            Name
          </Typography>
          <Typography sx={{ fontSize: '.72rem', fontWeight: 700, color: t.textTertiary, textTransform: 'uppercase', letterSpacing: '.06em' }}>
            Type
          </Typography>
        </Box>

        {/* ".." up row — only when inside a subdirectory */}
        {pathSegments.length > 0 && (
          <Box
            onClick={goUp}
            sx={{
              display: 'flex', alignItems: 'center', gap: 1.5,
              px: 3, py: 1,
              borderBottom: `1px solid ${t.border}`,
              cursor: 'pointer',
              '&:hover': { bgcolor: t.surfaceHover },
              transition: 'background .1s',
            }}
          >
            <Box sx={{ width: 15, height: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {/* ".." folder up icon */}
              <svg width="15" height="12" viewBox="0 0 16 13" fill="none">
                <rect x="0" y="3" width="16" height="10" rx="2" fill="#fbbf24" />
                <path d="M0 3.5A1.5 1.5 0 011.5 2H5l1.5 1.5H14.5A1.5 1.5 0 0116 5H0V3.5z" fill="#f59e0b" />
              </svg>
            </Box>
            <Typography sx={{
              fontSize: '.85rem', fontFamily: '"JetBrains Mono","Fira Code",monospace',
              color: t.textSecondary,
            }}>
              ..
            </Typography>
          </Box>
        )}

        {/* Rows */}
        {sorted.length === 0 ? (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160 }}>
            <Typography sx={{ fontSize: '.82rem', color: t.textTertiary, fontStyle: 'italic' }}>
              Empty directory
            </Typography>
          </Box>
        ) : (
          sorted.map((node) => {
            const isDir = node.type === 'dir';
            return (
              <Box
                key={node.path}
                onClick={() => handleRowClick(node)}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1.5,
                  px: 3, py: '9px',
                  borderBottom: `1px solid ${t.border}`,
                  cursor: 'pointer',
                  '&:hover': { bgcolor: t.surfaceHover },
                  '&:hover .row-name': { color: t.brandPrimary, textDecoration: 'underline', textDecorationColor: `${t.brandPrimary}60` },
                  transition: 'background .1s',
                }}
              >
                {/* Icon */}
                {isDir ? (
                  <Box sx={{ flexShrink: 0 }}>
                    <svg width="16" height="13" viewBox="0 0 16 13" fill="none">
                      <rect x="0" y="3" width="16" height="10" rx="2" fill="#fbbf24" />
                      <path d="M0 3.5A1.5 1.5 0 011.5 2H5l1.5 1.5H14.5A1.5 1.5 0 0116 5H0V3.5z" fill="#f59e0b" />
                    </svg>
                  </Box>
                ) : (
                  <Box sx={{ flexShrink: 0 }}>
                    <FileBadge name={node.name} size={20} />
                  </Box>
                )}

                {/* Name */}
                <Typography
                  className="row-name"
                  noWrap
                  sx={{
                    flex: 1, minWidth: 0,
                    fontSize: '.86rem',
                    fontFamily: '"JetBrains Mono","Fira Code",monospace',
                    fontWeight: isDir ? 600 : 400,
                    color: t.textPrimary,
                    transition: 'color .1s',
                  }}
                >
                  {node.name}
                </Typography>

                {/* Type badge */}
                <Typography sx={{
                  fontSize: '.7rem', color: t.textTertiary,
                  fontFamily: '"JetBrains Mono","Fira Code",monospace',
                  flexShrink: 0,
                }}>
                  {isDir
                    ? `${(node.children ?? []).length} items`
                    : node.name.includes('.') ? node.name.split('.').pop()!.toLowerCase() : 'file'}
                </Typography>
              </Box>
            );
          })
        )}
      </Box>
    </Box>
  );
};

export default FileBrowserPanel;
