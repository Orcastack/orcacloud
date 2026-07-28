/**
 * RepoFileViewer — Full-featured file viewer with syntax highlighting,
 * copy, raw view, blame toggle, and history navigation.
 */
import React, { useCallback, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import CallSplitIcon  from '@mui/icons-material/CallSplit';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon   from '@mui/icons-material/Download';
import HistoryIcon    from '@mui/icons-material/History';
import PersonPinIcon  from '@mui/icons-material/PersonPin';
import RawOnIcon      from '@mui/icons-material/RawOn';
import CheckIcon      from '@mui/icons-material/Check';
import { dashboardTokens } from '../../styles/dashboardDesignSystem';
import { FileBadge }  from '../FileTreeExplorer';
import type { FileDetail, BlameHunk, RepoCommit } from '../../services/projectsApi';
import { RepoBlameViewer } from './RepoBlameViewer';
import { RepoCommitList }  from './RepoCommitList';

const t    = dashboardTokens.colors;
const MONO = '"JetBrains Mono","Fira Code",monospace';
const FONT = dashboardTokens.typography.fontFamily;

// ─── Simple regex-based syntax highlighter ────────────────────────────────────

type Token = { kind: 'keyword' | 'string' | 'comment' | 'number' | 'operator' | 'text'; text: string };

const KEYWORDS = new Set([
  'import','export','from','default','const','let','var','function','return','if','else',
  'for','while','do','switch','case','break','continue','new','class','extends','super',
  'this','true','false','null','undefined','typeof','instanceof','in','of','try','catch',
  'finally','throw','async','await','yield','static','get','set','public','private',
  'protected','interface','type','enum','namespace','abstract','implements','package',
  'def','lambda','with','pass','raise','except','as','from','import','is','not','and',
  'or','elif','print','del','global','nonlocal','assert','in',
  'func','struct','interface','map','chan','go','defer','fallthrough','range','select',
  'fn','pub','let','mut','use','mod','impl','trait','where','match',
]);

function tokenizeLine(line: string, lang: string): Token[] {
  if (!['py','ts','tsx','js','jsx','go','rs','java','rb','sh','bash','cs','cpp','c','h'].includes(lang)) {
    return [{ kind: 'text', text: line }];
  }

  const tokens: Token[] = [];
  let i = 0;

  while (i < line.length) {
    // Line comment
    if ((line[i] === '/' && line[i+1] === '/') || (lang === 'py' && line[i] === '#')) {
      tokens.push({ kind: 'comment', text: line.slice(i) });
      break;
    }
    // String single or double
    if (line[i] === '"' || line[i] === "'" || line[i] === '`') {
      const q = line[i];
      let j = i + 1;
      while (j < line.length && line[j] !== q) {
        if (line[j] === '\\') j++;
        j++;
      }
      tokens.push({ kind: 'string', text: line.slice(i, j + 1) });
      i = j + 1;
      continue;
    }
    // Number
    if (/[0-9]/.test(line[i]) && (i === 0 || !/\w/.test(line[i-1]))) {
      let j = i;
      while (j < line.length && /[\d._xXa-fA-F]/.test(line[j])) j++;
      tokens.push({ kind: 'number', text: line.slice(i, j) });
      i = j;
      continue;
    }
    // Identifier / keyword
    if (/[a-zA-Z_$]/.test(line[i])) {
      let j = i;
      while (j < line.length && /\w/.test(line[j])) j++;
      const word = line.slice(i, j);
      tokens.push({ kind: KEYWORDS.has(word) ? 'keyword' : 'text', text: word });
      i = j;
      continue;
    }
    // Operator
    if (/[+\-*/%=<>!&|^~?:;.,()[\]{} ]/.test(line[i])) {
      const ops: string[] = [];
      while (i < line.length && /[+\-*/%=<>!&|^~?:;.,()[\]{} ]/.test(line[i])) {
        ops.push(line[i]);
        i++;
      }
      tokens.push({ kind: 'operator', text: ops.join('') });
      continue;
    }
    tokens.push({ kind: 'text', text: line[i] });
    i++;
  }
  return tokens;
}

const TOKEN_COLORS: Record<string, string> = {
  keyword:  '#c678dd',
  string:   '#98c379',
  comment:  '#5c6370',
  number:   '#d19a66',
  operator: '#abb2bf',
  text:     '#abb2bf',
};

type ViewMode = 'code' | 'raw' | 'blame' | 'history';

interface RepoFileViewerProps {
  file:          FileDetail | null;
  loading?:      boolean;
  blame?:        BlameHunk[];
  blameLoading?: boolean;
  commits?:      RepoCommit[];
  commitsLoading?: boolean;
  branch:        string;
  onClose?:      () => void;
  onLoadBlame?:  () => void;
  onLoadHistory?: () => void;
  onSelectCommit?: (c: RepoCommit) => void;
}

export const RepoFileViewer: React.FC<RepoFileViewerProps> = ({
  file, loading, blame, blameLoading, commits, commitsLoading,
  branch, onClose, onLoadBlame, onLoadHistory, onSelectCommit,
}) => {
  const [mode, setMode]     = useState<ViewMode>('code');
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    if (!file?.content) return;
    navigator.clipboard.writeText(file.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [file]);

  const handleDownload = useCallback(() => {
    if (!file) return;
    const blob = new Blob([file.content], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = file.name;
    a.click(); URL.revokeObjectURL(url);
  }, [file]);

  const handleViewMode = (v: ViewMode) => {
    if (v === 'blame'   && onLoadBlame)   onLoadBlame();
    if (v === 'history' && onLoadHistory) onLoadHistory();
    setMode(v);
  };

  if (loading) {
    return (
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress sx={{ color: t.brandPrimary }} />
      </Box>
    );
  }

  if (!file) return null;

  const lang = file.name.split('.').pop()?.toLowerCase() ?? '';
  const lines = file.content.split('\n');

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: FONT }}>
      {/* ── File path bar ── */}
      <Box sx={{
        px: 2.5, py: 1, bgcolor: t.surface,
        borderBottom: `1px solid ${t.border}`,
        display: 'flex', alignItems: 'center', gap: 1.25, flexShrink: 0, flexWrap: 'wrap',
      }}>
        <FileBadge name={file.name} size={20} />
        <Typography sx={{ fontFamily: MONO, fontSize: '.82rem', fontWeight: 600, color: t.textPrimary, flex: 1, wordBreak: 'break-all' }}>
          {file.path}
        </Typography>
        <Stack direction="row" alignItems="center" spacing={0.4}>
          <CallSplitIcon sx={{ fontSize: '.72rem', color: t.textTertiary }} />
          <Typography sx={{ fontFamily: MONO, fontSize: '.72rem', color: t.textSecondary }}>{branch}</Typography>
        </Stack>
        <Typography sx={{ fontSize: '.72rem', color: t.textTertiary }}>
          {file.lines.toLocaleString()} lines · {(file.size / 1024).toFixed(1)} KB
        </Typography>
      </Box>

      {/* ── Actions bar ── */}
      <Box sx={{
        px: 2, py: 0.75, bgcolor: t.surfaceSubtle,
        borderBottom: `1px solid ${t.border}`,
        display: 'flex', alignItems: 'center', gap: 0.75, flexShrink: 0, flexWrap: 'wrap',
      }}>
        {/* View mode buttons */}
        {(['code', 'raw', 'blame', 'history'] as ViewMode[]).map(v => (
          <Button
            key={v}
            size="small"
            variant={mode === v ? 'contained' : 'text'}
            onClick={() => handleViewMode(v)}
            startIcon={
              v === 'blame'   ? <PersonPinIcon   sx={{ fontSize: '.82rem !important' }} /> :
              v === 'history' ? <HistoryIcon      sx={{ fontSize: '.82rem !important' }} /> :
              v === 'raw'     ? <RawOnIcon        sx={{ fontSize: '.82rem !important' }} /> :
              undefined
            }
            sx={{
              textTransform: 'none',
              fontSize: '.75rem',
              fontWeight: 600,
              py: 0.3, px: 1,
              height: 28,
              bgcolor: mode === v ? t.brandPrimary : 'transparent',
              color:   mode === v ? '#fff' : t.textSecondary,
              '&:hover': { bgcolor: mode === v ? '#0f2d5a' : t.surfaceHover, color: mode === v ? '#fff' : t.textPrimary },
            }}
          >
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </Button>
        ))}

        <Divider orientation="vertical" flexItem sx={{ borderColor: t.border, mx: 0.25 }} />

        {/* Copy */}
        <Tooltip title={copied ? 'Copied!' : 'Copy content'}>
          <Button
            size="small"
            onClick={handleCopy}
            startIcon={copied ? <CheckIcon sx={{ fontSize: '.82rem !important', color: '#22C55E' }} /> : <ContentCopyIcon sx={{ fontSize: '.82rem !important' }} />}
            sx={{ textTransform: 'none', fontSize: '.75rem', py: 0.3, px: 1, height: 28, color: copied ? '#22C55E' : t.textSecondary, '&:hover': { bgcolor: t.surfaceHover, color: t.textPrimary } }}
          >
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </Tooltip>

        {/* Download */}
        <Tooltip title="Download file">
          <Button
            size="small"
            onClick={handleDownload}
            startIcon={<DownloadIcon sx={{ fontSize: '.82rem !important' }} />}
            sx={{ textTransform: 'none', fontSize: '.75rem', py: 0.3, px: 1, height: 28, color: t.textSecondary, '&:hover': { bgcolor: t.surfaceHover, color: t.textPrimary } }}
          >
            Download
          </Button>
        </Tooltip>

        {onClose && (
          <>
            <Divider orientation="vertical" flexItem sx={{ borderColor: t.border, mx: 0.25, ml: 'auto' }} />
            <Button size="small" onClick={onClose} sx={{ textTransform: 'none', fontSize: '.75rem', color: t.textTertiary, '&:hover': { color: t.textPrimary } }}>
              Close
            </Button>
          </>
        )}
      </Box>

      {/* ── Content ── */}
      <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {/* Code view */}
        {mode === 'code' && (
          <Box sx={{ flex: 1, overflowY: 'auto', display: 'flex' }}>
            {/* Line numbers */}
            <Box
              component="pre"
              sx={{
                m: 0, py: 2, pl: 1.5, pr: 1.5,
                fontFamily: MONO, fontSize: '.78rem', lineHeight: 1.7,
                color: t.textTertiary,
                borderRight: `1px solid ${t.border}`,
                bgcolor: t.surface,
                userSelect: 'none',
                textAlign: 'right',
                minWidth: 48,
                flexShrink: 0,
              }}
            >
              {lines.map((_, i) => `${i + 1}\n`).join('')}
            </Box>
            {/* Highlighted code */}
            <Box
              component="pre"
              sx={{
                m: 0, py: 2, px: 2.5,
                fontFamily: MONO, fontSize: '.78rem', lineHeight: 1.7,
                bgcolor: '#282c34',
                flex: 1, overflowX: 'auto',
              }}
            >
              {lines.map((line, li) => {
                const tokens = tokenizeLine(line, lang);
                return (
                  <Box key={li} component="span" sx={{ display: 'block' }}>
                    {tokens.map((tok, ti) => (
                      <Box key={ti} component="span"
                        sx={{ color: TOKEN_COLORS[tok.kind] ?? '#abb2bf', whiteSpace: 'pre' }}>
                        {tok.text}
                      </Box>
                    ))}
                  </Box>
                );
              })}
            </Box>
          </Box>
        )}

        {/* Raw view */}
        {mode === 'raw' && (
          <Box sx={{ flex: 1, overflowY: 'auto' }}>
            <Box
              component="pre"
              sx={{
                m: 0, p: 2.5,
                fontFamily: MONO, fontSize: '.78rem', lineHeight: 1.7,
                color: t.textPrimary, bgcolor: t.background,
                whiteSpace: 'pre-wrap', wordBreak: 'break-all',
              }}
            >
              {file.content}
            </Box>
          </Box>
        )}

        {/* Blame view */}
        {mode === 'blame' && (
          blameLoading
            ? <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CircularProgress sx={{ color: t.brandPrimary }} /></Box>
            : blame && blame.length > 0
              ? <RepoBlameViewer blame={blame} loading={false} filePath={file.path} />
              : <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography sx={{ fontSize: '.82rem', color: t.textTertiary }}>Blame data unavailable</Typography>
                </Box>
        )}

        {/* History view */}
        {mode === 'history' && (
          <RepoCommitList
            commits={commits ?? []}
            loading={commitsLoading ?? false}
            branch={branch}
            onSelect={onSelectCommit ?? (() => {})}
          />
        )}
      </Box>
    </Box>
  );
};

export default RepoFileViewer;
