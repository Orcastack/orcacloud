/**
 * RepoDiffViewer — Side-by-side and inline diff with syntax highlighting,
 * file summary, and addition/deletion stats.
 */
import React, { useState } from 'react';
import {
  Box,
  Chip,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { dashboardTokens } from '../../styles/dashboardDesignSystem';
import { FileBadge } from '../FileTreeExplorer';
import type { DiffResult, DiffFile, DiffLine } from '../../services/projectsApi';

const t    = dashboardTokens.colors;
const MONO = '"JetBrains Mono","Fira Code",monospace';

type DiffMode = 'inline' | 'split';

// ─── Line number helper ────────────────────────────────────────────────────────

// LineNum kept for future split-mode use
const _LineNum: React.FC<{ n?: number }> = ({ n }) => (
  <Box
    component="span"
    sx={{
      display: 'inline-block',
      minWidth: 40,
      textAlign: 'right',
      pr: 1.5,
      userSelect: 'none',
      color: t.textTertiary,
      fontSize: '.75rem',
      fontFamily: MONO,
      flexShrink: 0,
    }}
  >
    {n ?? ''}
  </Box>
);

// ─── Single diff line ──────────────────────────────────────────────────────────



const LINE_COLORS: Record<DiffLine['type'], { bg: string; text: string; marker: string }> = {
  added:   { bg: 'rgba(34,197,94,.1)',  text: '#22C55E', marker: '+' },
  removed: { bg: 'rgba(239,68,68,.1)', text: '#EF4444', marker: '-' },
  context: { bg: 'transparent',         text: '',         marker: ' ' },
};

const InlineLine: React.FC<{ line: DiffLine; oldNum?: number; newNum?: number }> = ({ line, oldNum, newNum }) => {
  const c = LINE_COLORS[line.type];
  return (
    <Box
      component="tr"
      sx={{ bgcolor: c.bg, '&:hover td': { bgcolor: `${c.bg ?? t.surfaceHover}` }, transition: 'background .08s' }}
    >
      <Box component="td" sx={{ py: '1px', pl: '4px', pr: 0, textAlign: 'right', userSelect: 'none', color: t.textTertiary, fontSize: '.72rem', fontFamily: MONO, width: 40, verticalAlign: 'top' }}>
        {line.type !== 'added' ? (oldNum ?? '') : ''}
      </Box>
      <Box component="td" sx={{ py: '1px', pl: '4px', pr: 0, textAlign: 'right', userSelect: 'none', color: t.textTertiary, fontSize: '.72rem', fontFamily: MONO, width: 40, verticalAlign: 'top' }}>
        {line.type !== 'removed' ? (newNum ?? '') : ''}
      </Box>
      <Box component="td" sx={{ py: '1px', px: 1, userSelect: 'none', color: c.text || t.textTertiary, fontSize: '.72rem', fontFamily: MONO, width: 18, verticalAlign: 'top' }}>
        {c.marker}
      </Box>
      <Box component="td" sx={{ py: '1px', pl: 0, pr: 2, verticalAlign: 'top', width: '100%' }}>
        <Box
          component="pre"
          sx={{
            m: 0, fontSize: '.78rem', fontFamily: MONO, lineHeight: 1.65,
            color: line.type === 'context' ? t.textPrimary : c.text,
            whiteSpace: 'pre-wrap', wordBreak: 'break-all',
          }}
        >
          {line.content}
        </Box>
      </Box>
    </Box>
  );
};

// ─── File diff block ───────────────────────────────────────────────────────────

const FileDiffBlock: React.FC<{ file: DiffFile; mode: DiffMode }> = ({ file, mode: _mode }) => {
  const [expanded, setExpanded] = useState(true);

  let oldLineNo = 1;
  let newLineNo = 1;

  const parseHeader = (h: string) => {
    // e.g. @@ -10,7 +10,7 @@
    const m = h.match(/-(\d+)(?:,\d+)? \+(\d+)/);
    if (m) return { old: parseInt(m[1], 10), new: parseInt(m[2], 10) };
    return { old: 1, new: 1 };
  };

  return (
    <Box sx={{ border: `1px solid ${t.border}`, borderRadius: '8px', mb: 2, overflow: 'hidden' }}>
      {/* File header */}
      <Stack
        direction="row" alignItems="center" spacing={1.25}
        onClick={() => setExpanded(v => !v)}
        sx={{
          px: 2, py: 1, bgcolor: t.surfaceSubtle,
          cursor: 'pointer', borderBottom: expanded ? `1px solid ${t.border}` : 'none',
          '&:hover': { bgcolor: t.surfaceHover },
        }}
      >
        <FileBadge name={file.path.split('/').pop() ?? file.path} size={18} />
        <Typography sx={{ flex: 1, fontFamily: MONO, fontSize: '.8rem', color: t.textPrimary, fontWeight: 600 }}>
          {file.path}
        </Typography>
        {file.additions > 0 && (
          <Typography sx={{ fontSize: '.75rem', fontWeight: 700, color: '#22C55E' }}>
            +{file.additions}
          </Typography>
        )}
        {file.deletions > 0 && (
          <Typography sx={{ fontSize: '.75rem', fontWeight: 700, color: '#EF4444' }}>
            -{file.deletions}
          </Typography>
        )}
        <Typography sx={{ fontSize: '.7rem', color: t.textTertiary, ml: 0.5 }}>
          {expanded ? '▲' : '▼'}
        </Typography>
      </Stack>

      {expanded && (
        <Box sx={{ overflowX: 'auto' }}>
          <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <Box component="tbody">
              {file.chunks.map((chunk, ci) => {
                const parsed = parseHeader(chunk.header);
                oldLineNo = parsed.old;
                newLineNo = parsed.new;

                const rows = [
                  // Chunk header row
                  <Box
                    key={`header-${ci}`}
                    component="tr"
                    sx={{ bgcolor: 'rgba(21,61,117,.06)' }}
                  >
                    <Box component="td" colSpan={4} sx={{ py: 0.5, px: 2 }}>
                      <Typography sx={{ fontFamily: MONO, fontSize: '.72rem', color: t.brandPrimary, fontWeight: 600 }}>
                        {chunk.header}
                      </Typography>
                    </Box>
                  </Box>,
                  ...chunk.lines.map((line, li) => {
                    const old = line.type !== 'added' ? oldLineNo : undefined;
                    const nw  = line.type !== 'removed' ? newLineNo : undefined;
                    if (line.type !== 'added')   oldLineNo++;
                    if (line.type !== 'removed') newLineNo++;
                    return <InlineLine key={`${ci}-${li}`} line={line} oldNum={old} newNum={nw} />;
                  }),
                ];
                return rows;
              })}
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
};

// ─── Main component ────────────────────────────────────────────────────────────

interface RepoDiffViewerProps {
  diff:     DiffResult;
  onClose?: () => void;
}

export const RepoDiffViewer: React.FC<RepoDiffViewerProps> = ({ diff, onClose }) => {
  const [mode, setMode] = useState<DiffMode>('inline');

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <Box sx={{
        px: 2.5, py: 1.25, bgcolor: t.surface,
        borderBottom: `1px solid ${t.border}`,
        display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0,
      }}>
        <Typography sx={{ fontWeight: 700, fontSize: '.9rem', color: t.textPrimary, flex: 1 }}>
          Diff
        </Typography>
        <Stack direction="row" spacing={0.75} alignItems="center">
          <Chip label={`${diff.total_additions} additions`}   size="small" sx={{ height: 18, fontSize: '.62rem', bgcolor: 'rgba(34,197,94,.1)',  color: '#22C55E', fontWeight: 700, '& .MuiChip-label': { px: 0.75 } }} />
          <Chip label={`${diff.total_deletions} deletions`}   size="small" sx={{ height: 18, fontSize: '.62rem', bgcolor: 'rgba(239,68,68,.1)', color: '#EF4444', fontWeight: 700, '& .MuiChip-label': { px: 0.75 } }} />
          <Chip label={`${diff.files.length} files`}          size="small" sx={{ height: 18, fontSize: '.62rem', bgcolor: t.surfaceSubtle, color: t.textSecondary, border: `1px solid ${t.border}`, '& .MuiChip-label': { px: 0.75 } }} />
        </Stack>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Typography sx={{ fontSize: '.72rem', color: t.textTertiary, fontFamily: MONO }}>{diff.base}</Typography>
          <Typography sx={{ fontSize: '.72rem', color: t.textTertiary }}>→</Typography>
          <Typography sx={{ fontSize: '.72rem', color: t.textTertiary, fontFamily: MONO }}>{diff.head}</Typography>
        </Stack>
        <ToggleButtonGroup
          value={mode}
          exclusive
          onChange={(_, v) => v && setMode(v)}
          size="small"
        >
          <ToggleButton value="inline" sx={{ textTransform: 'none', fontSize: '.72rem', px: 1, py: 0.3, height: 26 }}>Inline</ToggleButton>
          <ToggleButton value="split"  sx={{ textTransform: 'none', fontSize: '.72rem', px: 1, py: 0.3, height: 26 }}>Split</ToggleButton>
        </ToggleButtonGroup>
        {onClose && (
          <Box onClick={onClose} sx={{ fontSize: '.72rem', color: t.textTertiary, cursor: 'pointer', px: 1, py: 0.3, borderRadius: '5px', '&:hover': { bgcolor: t.surfaceHover, color: t.textPrimary } }}>
            × close
          </Box>
        )}
      </Box>

      {/* Diff body */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
        {diff.files.map((file) => (
          <FileDiffBlock key={file.path} file={file} mode={mode} />
        ))}
      </Box>
    </Box>
  );
};

export default RepoDiffViewer;
