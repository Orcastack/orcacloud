/**
 * RepoFileBrowser — GitHub-style file browser with last commit message,
 * author, timestamp per row, breadcrumb navigation, and README rendering.
 */
import React, { useMemo, useState } from 'react';
import {
  Box,
  CircularProgress,
  Divider,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import HomeIcon         from '@mui/icons-material/Home';
import { dashboardTokens } from '../../styles/dashboardDesignSystem';
import { FileBadge }    from '../FileTreeExplorer';
import { RepoReadme }   from './RepoReadme';
import type { TreeNode } from '../../services/projectsApi';
import { RepoBranchSelector } from './RepoBranchSelector';
import type { RepoBranch } from '../../services/projectsApi';

const t    = dashboardTokens.colors;
const FONT = dashboardTokens.typography.fontFamily;
const MONO = '"JetBrains Mono","Fira Code",monospace';

// ─── Helpers ───────────────────────────────────────────────────────────────────

function findDir(nodes: TreeNode[], segments: string[]): TreeNode[] {
  if (segments.length === 0) return nodes;
  const head  = segments[0];
  const match = nodes.find(n => n.name === head && n.type === 'dir');
  if (!match) return nodes;
  return findDir(match.children ?? [], segments.slice(1));
}

function relative(iso?: string): string {
  if (!iso) return '';
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

// ─── Component ─────────────────────────────────────────────────────────────────

interface RepoFileBrowserProps {
  nodes:         TreeNode[];
  repoName:      string;
  branch:        string;
  branches?:     RepoBranch[];
  branchesLoading?: boolean;
  loadingTree?:  boolean;
  onFileOpen:    (node: TreeNode) => void;
  onBranchSwitch?: (branch: string) => void;
  onBranchCreate?: (name: string) => void;
}

export const RepoFileBrowser: React.FC<RepoFileBrowserProps> = ({
  nodes, repoName, branch, branches = [], branchesLoading, loadingTree,
  onFileOpen, onBranchSwitch, onBranchCreate,
}) => {
  const [pathSegments, setPathSegments] = useState<string[]>([]);

  const currentNodes = useMemo(
    () => findDir(nodes, pathSegments),
    [nodes, pathSegments],
  );

  const sorted = useMemo(
    () => [...currentNodes].sort((a, b) => {
      if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
      return a.name.localeCompare(b.name);
    }),
    [currentNodes],
  );

  // Find a README in current directory
  const readme = useMemo(
    () => sorted.find(n => n.type === 'file' && /^readme\.md$/i.test(n.name)),
    [sorted],
  );

  const handleRowClick = (node: TreeNode) => {
    if (node.type === 'dir') {
      setPathSegments([...pathSegments, node.name]);
    } else {
      onFileOpen(node);
    }
  };

  // Last commit stats helper
  const commitMsg  = (node: TreeNode) => (node as any).commit_message  as string | undefined;
  const commitDate = (node: TreeNode) => (node as any).commit_date     as string | undefined;
  const commitAuthor = (node: TreeNode) => (node as any).commit_author as string | undefined;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: t.background, fontFamily: FONT, overflow: 'hidden' }}>

      {/* ── Header bar ── */}
      <Box sx={{
        px: 2.5, py: 1.25,
        borderBottom: `1px solid ${t.border}`,
        bgcolor: t.surface,
        display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0, flexWrap: 'wrap',
      }}>
        <Typography sx={{ fontFamily: MONO, fontWeight: 700, fontSize: '.88rem', color: t.textPrimary }}>
          {repoName}
        </Typography>

        <Divider orientation="vertical" flexItem sx={{ borderColor: t.border }} />

        {/* Branch selector */}
        <RepoBranchSelector
          currentBranch={branch}
          branches={branches}
          loading={branchesLoading}
          onSwitch={onBranchSwitch ?? (() => {})}
          onCreate={onBranchCreate}
        />

        <Typography sx={{ fontSize: '.72rem', color: t.textTertiary, ml: 'auto' }}>
          {nodes.length} items at root
        </Typography>
      </Box>

      {/* ── Breadcrumb bar ── */}
      <Box sx={{
        px: 2.5, py: '7px',
        borderBottom: `1px solid ${t.border}`,
        bgcolor: t.surface,
        display: 'flex', alignItems: 'center', gap: 0.3, flexShrink: 0, flexWrap: 'wrap',
      }}>
        <Stack
          direction="row" alignItems="center" spacing={0.3}
          onClick={() => setPathSegments([])}
          sx={{ cursor: 'pointer', px: 0.75, py: 0.2, borderRadius: '5px', '&:hover': { bgcolor: t.surfaceHover } }}
        >
          <HomeIcon sx={{ fontSize: '.8rem', color: t.brandPrimary }} />
          <Typography sx={{ fontSize: '.78rem', fontWeight: 600, color: t.brandPrimary }}>{repoName}</Typography>
        </Stack>
        {pathSegments.map((seg, i) => {
          const isLast = i === pathSegments.length - 1;
          return (
            <React.Fragment key={seg + i}>
              <ChevronRightIcon sx={{ fontSize: '.75rem', color: t.textTertiary }} />
              <Typography
                onClick={() => !isLast && setPathSegments(pathSegments.slice(0, i + 1))}
                sx={{
                  fontSize: '.78rem',
                  fontWeight: isLast ? 700 : 500,
                  color: isLast ? t.textPrimary : t.brandPrimary,
                  cursor: isLast ? 'default' : 'pointer',
                  fontFamily: MONO,
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

      {/* ── Content ── */}
      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        {loadingTree
          ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 6 }}>
              <CircularProgress sx={{ color: t.brandPrimary }} />
            </Box>
          )
          : (
            <>
              {/* Table header */}
              <Box sx={{
                display: 'grid',
                gridTemplateColumns: '1fr 2fr auto',
                px: 3, py: 0.75,
                borderBottom: `1px solid ${t.border}`,
                bgcolor: t.surfaceSubtle,
              }}>
                <Typography sx={{ fontSize: '.68rem', fontWeight: 700, color: t.textTertiary, textTransform: 'uppercase', letterSpacing: '.06em' }}>Name</Typography>
                <Typography sx={{ fontSize: '.68rem', fontWeight: 700, color: t.textTertiary, textTransform: 'uppercase', letterSpacing: '.06em' }}>Last Commit</Typography>
                <Typography sx={{ fontSize: '.68rem', fontWeight: 700, color: t.textTertiary, textTransform: 'uppercase', letterSpacing: '.06em' }}>Updated</Typography>
              </Box>

              {/* ".." up row */}
              {pathSegments.length > 0 && (
                <Box
                  onClick={() => setPathSegments(p => p.slice(0, -1))}
                  sx={{
                    display: 'grid', gridTemplateColumns: '1fr 2fr auto',
                    px: 3, py: 1, borderBottom: `1px solid ${t.border}`,
                    cursor: 'pointer', '&:hover': { bgcolor: t.surfaceHover }, transition: 'background .1s',
                  }}
                >
                  <Stack direction="row" alignItems="center" gap={1.5}>
                    <Box>
                      <svg width="15" height="12" viewBox="0 0 16 13" fill="none">
                        <rect x="0" y="3" width="16" height="10" rx="2" fill="#fbbf24" />
                        <path d="M0 3.5A1.5 1.5 0 011.5 2H5l1.5 1.5H14.5A1.5 1.5 0 0116 5H0V3.5z" fill="#f59e0b" />
                      </svg>
                    </Box>
                    <Typography sx={{ fontFamily: MONO, fontSize: '.86rem', color: t.textSecondary }}>..</Typography>
                  </Stack>
                </Box>
              )}

              {/* File/folder rows */}
              {sorted.length === 0 ? (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160 }}>
                  <Typography sx={{ fontSize: '.82rem', color: t.textTertiary, fontStyle: 'italic' }}>Empty directory</Typography>
                </Box>
              ) : (
                sorted.map(node => {
                  const isDir  = node.type === 'dir';
                  const msg    = commitMsg(node);
                  const date   = commitDate(node);
                  const author = commitAuthor(node);
                  return (
                    <Box
                      key={node.path}
                      onClick={() => handleRowClick(node)}
                      sx={{
                        display: 'grid', gridTemplateColumns: '1fr 2fr auto',
                        px: 3, py: '9px',
                        borderBottom: `1px solid ${t.border}`,
                        cursor: 'pointer',
                        '&:hover': { bgcolor: t.surfaceHover },
                        '&:hover .row-name': { color: t.brandPrimary, textDecoration: 'underline', textDecorationColor: `${t.brandPrimary}60` },
                        transition: 'background .1s',
                      }}
                    >
                      {/* Name column */}
                      <Stack direction="row" alignItems="center" gap={1.5} sx={{ minWidth: 0, pr: 2 }}>
                        {isDir ? (
                          <Box sx={{ flexShrink: 0 }}>
                            <svg width="16" height="13" viewBox="0 0 16 13" fill="none">
                              <rect x="0" y="3" width="16" height="10" rx="2" fill="#fbbf24" />
                              <path d="M0 3.5A1.5 1.5 0 011.5 2H5l1.5 1.5H14.5A1.5 1.5 0 0116 5H0V3.5z" fill="#f59e0b" />
                            </svg>
                          </Box>
                        ) : (
                          <Box sx={{ flexShrink: 0 }}><FileBadge name={node.name} size={18} /></Box>
                        )}
                        <Typography
                          className="row-name"
                          noWrap
                          sx={{
                            fontSize: '.86rem',
                            fontFamily: MONO,
                            fontWeight: isDir ? 600 : 400,
                            color: t.textPrimary,
                            transition: 'color .1s',
                            flex: 1, minWidth: 0,
                          }}
                        >
                          {node.name}
                        </Typography>
                      </Stack>

                      {/* Last commit column */}
                      <Box sx={{ pr: 2, minWidth: 0 }}>
                        {msg ? (
                          <Tooltip title={`${author ? author + '  ·  ' : ''}${msg}`} placement="top">
                            <Typography noWrap sx={{ fontSize: '.78rem', color: t.textSecondary }}>
                              {msg}
                            </Typography>
                          </Tooltip>
                        ) : (
                          <Typography sx={{ fontSize: '.72rem', color: t.textTertiary, fontStyle: 'italic' }}>—</Typography>
                        )}
                      </Box>

                      {/* Updated column */}
                      <Typography sx={{ fontSize: '.75rem', color: t.textTertiary, flexShrink: 0, textAlign: 'right' }}>
                        {relative(date) || '—'}
                      </Typography>
                    </Box>
                  );
                })
              )}

              {/* README renderer */}
              {readme?.content && (
                <Box sx={{ border: `1px solid ${t.border}`, borderRadius: '10px', m: 2.5, overflow: 'hidden' }}>
                  <Box sx={{ px: 2, py: 1, borderBottom: `1px solid ${t.border}`, bgcolor: t.surfaceSubtle, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FileBadge name="README.md" size={17} />
                    <Typography sx={{ fontWeight: 700, fontSize: '.82rem', color: t.textPrimary }}>README.md</Typography>
                  </Box>
                  <RepoReadme content={readme.content} />
                </Box>
              )}
            </>
          )
        }
      </Box>
    </Box>
  );
};

export default RepoFileBrowser;
