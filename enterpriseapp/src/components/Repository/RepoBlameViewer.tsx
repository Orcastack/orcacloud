/**
 * RepoBlameViewer — Per-line blame annotations: SHA, author, date, commit message.
 */
import React from 'react';
import {
  Box,
  CircularProgress,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { dashboardTokens } from '../../styles/dashboardDesignSystem';
import type { BlameHunk } from '../../services/projectsApi';

const t    = dashboardTokens.colors;
const MONO = '"JetBrains Mono","Fira Code",monospace';

function relDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

interface RepoBlameViewerProps {
  blame:    BlameHunk[];
  loading:  boolean;
  filePath: string;
  onClose?: () => void;
}

export const RepoBlameViewer: React.FC<RepoBlameViewerProps> = ({
  blame, loading, filePath, onClose,
}) => {
  if (loading) {
    return (
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress sx={{ color: t.brandPrimary }} />
      </Box>
    );
  }

  // Group consecutive lines with same SHA into blocks
  const blocks: { sha: string; short_sha: string; author: string; message: string; date: string; startLine: number; lines: BlameHunk[] }[] = [];
  let current: typeof blocks[0] | null = null;

  for (const hunk of blame) {
    if (!current || current.sha !== hunk.sha) {
      current = {
        sha: hunk.sha,
        short_sha: hunk.short_sha,
        author: hunk.author,
        message: hunk.message,
        date: hunk.date,
        startLine: hunk.line_number,
        lines: [hunk],
      };
      blocks.push(current);
    } else {
      current.lines.push(hunk);
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <Box sx={{
        px: 2.5, py: 1.25, bgcolor: t.surface,
        borderBottom: `1px solid ${t.border}`,
        display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0,
      }}>
        <Typography sx={{ fontFamily: MONO, fontSize: '.82rem', color: t.textPrimary, fontWeight: 600, flex: 1 }}>
          {filePath} — Blame
        </Typography>
        {onClose && (
          <Box onClick={onClose} sx={{ fontSize: '.72rem', color: t.textTertiary, cursor: 'pointer', px: 1, py: 0.3, borderRadius: '5px', '&:hover': { bgcolor: t.surfaceHover, color: t.textPrimary } }}>
            × close
          </Box>
        )}
      </Box>

      {/* Blame body */}
      <Box sx={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: '1fr' }}>
        <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <Box component="tbody">
            {blocks.map((block) =>
              block.lines.map((hunk, lineIdx) => {
                const isFirst = lineIdx === 0;
                return (
                  <Box
                    key={`${block.sha}-${hunk.line_number}`}
                    component="tr"
                    sx={{ '&:hover td': { bgcolor: t.surfaceHover }, transition: 'background .08s' }}
                  >
                    {/* Blame annotation (only first line of block) */}
                    <Box
                      component="td"
                      sx={{
                        width: 260,
                        flexShrink: 0,
                        px: 1.5,
                        py: '2px',
                        verticalAlign: 'top',
                        borderRight: `1px solid ${t.border}`,
                        bgcolor: t.surfaceSubtle,
                      }}
                    >
                      {isFirst && (
                        <Tooltip
                          title={
                            <Box>
                              <Typography sx={{ fontSize: '.75rem', fontWeight: 700, mb: 0.25 }}>{block.message}</Typography>
                              <Typography sx={{ fontSize: '.72rem', color: '#aaa' }}>{block.author} · {relDate(block.date)}</Typography>
                              <Typography sx={{ fontSize: '.7rem', color: '#888', fontFamily: MONO, mt: 0.25 }}>{block.sha}</Typography>
                            </Box>
                          }
                          placement="right"
                          arrow
                        >
                          <Box sx={{ cursor: 'pointer' }}>
                            <Stack direction="row" alignItems="center" spacing={0.75}>
                              <Typography sx={{ fontFamily: MONO, fontSize: '.72rem', color: t.brandPrimary, fontWeight: 600, flexShrink: 0 }}>
                                {block.short_sha}
                              </Typography>
                              <Typography noWrap sx={{ fontSize: '.72rem', color: t.textSecondary }}>
                                {block.author}
                              </Typography>
                            </Stack>
                            <Typography noWrap sx={{ fontSize: '.7rem', color: t.textTertiary }}>
                              {relDate(block.date)} — {block.message}
                            </Typography>
                          </Box>
                        </Tooltip>
                      )}
                    </Box>

                    {/* Line number */}
                    <Box component="td" sx={{ width: 44, textAlign: 'right', pr: 1.5, py: '2px', userSelect: 'none', color: t.textTertiary, fontSize: '.75rem', fontFamily: MONO, verticalAlign: 'top', bgcolor: t.surfaceSubtle }}>
                      {hunk.line_number}
                    </Box>

                    {/* Code */}
                    <Box component="td" sx={{ py: '2px', pl: 1.5, pr: 2, verticalAlign: 'top' }}>
                      <Box
                        component="pre"
                        sx={{
                          m: 0,
                          fontFamily: MONO,
                          fontSize: '.78rem',
                          lineHeight: 1.65,
                          color: t.textPrimary,
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-all',
                        }}
                      >
                        {hunk.content}
                      </Box>
                    </Box>
                  </Box>
                );
              })
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default RepoBlameViewer;
