import React, { useState } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandMoreIcon   from '@mui/icons-material/ExpandMore';
import { dashboardTokens } from '../styles/dashboardDesignSystem';

const t = dashboardTokens.colors;

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface TreeNode {
  name:      string;
  type:      'file' | 'dir';
  path:      string;
  content?:  string;
  children?: TreeNode[];
}

interface FileTreeExplorerProps {
  nodes:         TreeNode[];
  selectedPath?: string;
  onFileSelect?: (node: TreeNode) => void;
}

// ─── File-extension → colour & symbol ──────────────────────────────────────────

const FILE_META: Record<string, { color: string; label: string }> = {
  py:         { color: '#3572A5', label: 'PY'  },
  ts:         { color: '#3178c6', label: 'TS'  },
  tsx:        { color: '#3178c6', label: 'TSX' },
  js:         { color: '#c2a800', label: 'JS'  },
  jsx:        { color: '#c2a800', label: 'JSX' },
  json:       { color: '#71717a', label: '{}'  },
  yaml:       { color: '#cb171e', label: 'YML' },
  yml:        { color: '#cb171e', label: 'YML' },
  toml:       { color: '#9c4221', label: 'TML' },
  md:         { color: '#083fa1', label: 'MD'  },
  txt:        { color: '#71717a', label: 'TXT' },
  sh:         { color: '#347d39', label: 'SH'  },
  bash:       { color: '#347d39', label: 'SH'  },
  go:         { color: '#00ADD8', label: 'GO'  },
  rs:         { color: '#d97706', label: 'RS'  },
  java:       { color: '#b07219', label: 'JV'  },
  rb:         { color: '#701516', label: 'RB'  },
  html:       { color: '#e34c26', label: 'HTM' },
  css:        { color: '#563d7c', label: 'CSS' },
  scss:       { color: '#c6538c', label: 'SCS' },
  env:        { color: '#ecc94b', label: 'ENV' },
  lock:       { color: '#71717a', label: 'LCK' },
  sql:        { color: '#e38c00', label: 'SQL' },
  proto:      { color: '#4285f4', label: 'PRO' },
  dockerfile: { color: '#384d54', label: 'DOC' },
  gitignore:  { color: '#f05033', label: 'GIT' },
};

export function getFileMeta(name: string): { color: string; label: string } {
  const lower = name.toLowerCase();
  if (lower === 'dockerfile')   return FILE_META.dockerfile;
  if (lower === '.gitignore')   return FILE_META.gitignore;
  if (lower.endsWith('.env') || lower === '.env') return FILE_META.env;
  const ext = lower.split('.').pop() ?? '';
  return FILE_META[ext] ?? { color: '#6b7280', label: ext.slice(0, 3).toUpperCase() || 'FIL' };
}

// ─── File badge (reusable across tree + viewer) ────────────────────────────────

export const FileBadge: React.FC<{ name: string; size?: number }> = ({ name, size = 20 }) => {
  const meta = getFileMeta(name);
  return (
    <Box sx={{
      width: size, height: Math.round(size * 0.8),
      borderRadius: '3px', flexShrink: 0,
      bgcolor: meta.color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Typography sx={{ color: '#fff', fontSize: `${size * 0.024}rem`, fontWeight: 800, letterSpacing: '.01em', lineHeight: 1 }}>
        {meta.label}
      </Typography>
    </Box>
  );
};

// ─── Single node row ───────────────────────────────────────────────────────────

interface NodeRowProps {
  node:         TreeNode;
  depth:        number;
  expanded:     Set<string>;
  selectedPath: string | undefined;
  onToggle:     (path: string) => void;
  onSelect:     (node: TreeNode) => void;
}

const INDENT = 14; // px per level

const NodeRow: React.FC<NodeRowProps> = ({
  node, depth, expanded, selectedPath, onToggle, onSelect,
}) => {
  const isDir      = node.type === 'dir';
  const isOpen     = expanded.has(node.path);
  const isSelected = selectedPath === node.path;

  return (
    <>
      <Stack
        direction="row"
        alignItems="center"
        onClick={() => isDir ? onToggle(node.path) : onSelect(node)}
        sx={{
          pl: `${depth * INDENT + 6}px`,
          pr: 1,
          py: '3.5px',
          gap: '4px',
          cursor: 'pointer',
          borderRadius: '5px',
          mx: '4px',
          bgcolor: isSelected ? 'rgba(21,61,117,.12)' : 'transparent',
          '&:hover': { bgcolor: isSelected ? 'rgba(21,61,117,.15)' : t.surfaceHover },
          userSelect: 'none',
          transition: 'background .1s',
        }}
      >
        {/* Chevron */}
        <Box sx={{ width: 13, flexShrink: 0, color: t.textTertiary, display: 'flex', alignItems: 'center' }}>
          {isDir && (isOpen
            ? <ExpandMoreIcon  sx={{ fontSize: '.78rem' }} />
            : <ChevronRightIcon sx={{ fontSize: '.78rem' }} />
          )}
        </Box>

        {/* Folder SVG or file badge */}
        {isDir ? (
          <Box sx={{ width: 15, height: 13, flexShrink: 0, mt: '1px' }}>
            <svg width="15" height="12" viewBox="0 0 16 13" fill="none">
              <rect x="0" y="3" width="16" height="10" rx="2" fill={isOpen ? '#f59e0b' : '#fbbf24'} />
              <path d="M0 3.5A1.5 1.5 0 011.5 2H5l1.5 1.5H14.5A1.5 1.5 0 0116 5H0V3.5z" fill={isOpen ? '#d97706' : '#f59e0b'} />
            </svg>
          </Box>
        ) : (
          <FileBadge name={node.name} size={19} />
        )}

        {/* Name */}
        <Typography
          noWrap
          sx={{
            flex: 1, minWidth: 0,
            fontSize: '.79rem',
            fontFamily: '"JetBrains Mono", "Fira Code", monospace',
            color: isSelected ? t.brandPrimary : t.textPrimary,
            fontWeight: isDir ? 600 : 400,
          }}
        >
          {node.name}
        </Typography>
      </Stack>

      {isDir && isOpen && node.children?.map((child) => (
        <NodeRow
          key={child.path}
          node={child}
          depth={depth + 1}
          expanded={expanded}
          selectedPath={selectedPath}
          onToggle={onToggle}
          onSelect={onSelect}
        />
      ))}
    </>
  );
};

// ─── File content viewer (exported — used in the center panel) ────────────────

export interface FileViewerProps {
  node:    TreeNode;
  onClose: () => void;
}

export const FileViewer: React.FC<FileViewerProps> = ({ node, onClose }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
    {/* Header bar */}
    <Stack direction="row" alignItems="center" spacing={1} sx={{
      px: 2.5, py: 1.25, bgcolor: t.surface,
      borderBottom: `1px solid ${t.border}`, flexShrink: 0,
    }}>
      <FileBadge name={node.name} size={22} />
      <Typography sx={{
        fontFamily: '"JetBrains Mono", "Fira Code", monospace',
        fontSize: '.83rem', color: t.textPrimary, fontWeight: 600, flex: 1,
      }}>
        {node.path}
      </Typography>
      <Box
        onClick={onClose}
        sx={{
          fontSize: '.72rem', color: t.textTertiary, cursor: 'pointer',
          px: 1, py: 0.3, borderRadius: '5px',
          '&:hover': { bgcolor: t.surfaceHover, color: t.textPrimary },
        }}
      >
        x close
      </Box>
    </Stack>

    {/* Code body */}
    <Box sx={{ flex: 1, overflowY: 'auto', bgcolor: t.background }}>
      {(node.content !== undefined && node.content.length > 0) ? (
        <Box sx={{ display: 'flex' }}>
          {/* Line numbers */}
          <Box
            component="pre"
            sx={{
              m: 0, py: 2, pl: 1.5, pr: 1.5,
              fontFamily: '"JetBrains Mono", "Fira Code", monospace',
              fontSize: '.78rem', lineHeight: 1.7,
              color: t.textTertiary,
              borderRight: `1px solid ${t.border}`,
              bgcolor: t.surface,
              userSelect: 'none',
              textAlign: 'right',
              minWidth: 36,
              flexShrink: 0,
            }}
          >
            {node.content.split('\n').map((_, i) => `${i + 1}\n`).join('')}
          </Box>
          {/* Code */}
          <Box
            component="pre"
            sx={{
              m: 0, py: 2, px: 2.5,
              fontFamily: '"JetBrains Mono", "Fira Code", monospace',
              fontSize: '.78rem', lineHeight: 1.7,
              color: t.textPrimary,
              whiteSpace: 'pre',
              overflowX: 'auto',
              flex: 1,
            }}
          >
            {node.content}
          </Box>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 180 }}>
          <Typography sx={{ fontSize: '.8rem', color: t.textTertiary, fontStyle: 'italic' }}>
            Empty file
          </Typography>
        </Box>
      )}
    </Box>
  </Box>
);

// ─── FileTreeExplorer (tree only — FileViewer is handled by parent) ──────────

const FileTreeExplorer: React.FC<FileTreeExplorerProps> = ({
  nodes,
  selectedPath,
  onFileSelect,
}) => {
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    // Auto-expand first-level dirs
    const s = new Set<string>();
    nodes.forEach((n) => { if (n.type === 'dir') s.add(n.path); });
    return s;
  });

  const toggle = (path: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(path) ? next.delete(path) : next.add(path);
      return next;
    });

  if (nodes.length === 0) {
    return (
      <Box sx={{ px: 2, py: 3, textAlign: 'center' }}>
        <Typography sx={{ fontSize: '.75rem', color: t.textTertiary }}>
          No files yet
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ py: 0.5 }}>
      {nodes.map((node) => (
        <NodeRow
          key={node.path}
          node={node}
          depth={0}
          expanded={expanded}
          selectedPath={selectedPath}
          onToggle={toggle}
          onSelect={(n) => onFileSelect?.(n)}
        />
      ))}
    </Box>
  );
};

export default FileTreeExplorer;
