/**
 * RepoSearchPanel — Code and file search with match highlights.
 */
import React, { useState } from 'react';
import {
  Box,
  Chip,
  CircularProgress,
  InputAdornment,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import CodeIcon        from '@mui/icons-material/Code';
import FolderOpenIcon  from '@mui/icons-material/FolderOpen';
import SearchIcon      from '@mui/icons-material/Search';
import { dashboardTokens } from '../../styles/dashboardDesignSystem';
import { FileBadge } from '../FileTreeExplorer';
import type { SearchResult } from '../../services/projectsApi';

const t    = dashboardTokens.colors;
const MONO = '"JetBrains Mono","Fira Code",monospace';
const FONT = dashboardTokens.typography.fontFamily;

interface RepoSearchPanelProps {
  onSearch:  (query: string, type: 'code' | 'file') => Promise<SearchResult[]>;
  onOpenFile?: (path: string) => void;
}

export const RepoSearchPanel: React.FC<RepoSearchPanelProps> = ({ onSearch, onOpenFile }) => {
  const [query,   setQuery]   = useState('');
  const [type,    setType]    = useState<'code' | 'file'>('code');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const run = async (q: string, t2: 'code' | 'file') => {
    if (!q.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const r = await onSearch(q.trim(), t2);
      setResults(r);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') run(query, type);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: FONT }}>
      {/* Search bar */}
      <Box sx={{ px: 2.5, py: 1.5, borderBottom: `1px solid ${t.border}`, bgcolor: t.surface, flexShrink: 0 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            fullWidth
            size="small"
            placeholder="Search in repository…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: '1rem', color: t.textTertiary }} />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiInputBase-root': { bgcolor: t.surfaceSubtle, color: t.textPrimary, fontSize: '.88rem' },
              '& .MuiOutlinedInput-notchedOutline': { borderColor: t.border },
              '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: t.brandPrimary },
            }}
          />
          <ToggleButtonGroup
            value={type}
            exclusive
            onChange={(_, v) => { if (v) { setType(v); if (query) run(query, v); } }}
            size="small"
            sx={{ flexShrink: 0 }}
          >
            <ToggleButton value="code" sx={{ textTransform: 'none', fontSize: '.75rem', px: 1.5, py: 0.5, height: 36 }}>
              <CodeIcon sx={{ fontSize: '.9rem', mr: 0.5 }} /> Code
            </ToggleButton>
            <ToggleButton value="file" sx={{ textTransform: 'none', fontSize: '.75rem', px: 1.5, py: 0.5, height: 36 }}>
              <FolderOpenIcon sx={{ fontSize: '.9rem', mr: 0.5 }} /> Files
            </ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Box>

      {/* Results */}
      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress sx={{ color: t.brandPrimary }} />
          </Box>
        )}

        {!loading && searched && results.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 5 }}>
            <SearchIcon sx={{ fontSize: '2rem', color: t.textTertiary, mb: 1 }} />
            <Typography sx={{ fontSize: '.85rem', color: t.textSecondary }}>
              No results for "{query}"
            </Typography>
          </Box>
        )}

        {!loading && !searched && (
          <Box sx={{ textAlign: 'center', py: 5 }}>
            <SearchIcon sx={{ fontSize: '2rem', color: t.textTertiary, mb: 1, opacity: .4 }} />
            <Typography sx={{ fontSize: '.82rem', color: t.textTertiary }}>
              Type a query and press Enter to search
            </Typography>
          </Box>
        )}

        {!loading && results.length > 0 && (
          <Box sx={{ p: 1.5 }}>
            <Typography sx={{ fontSize: '.72rem', fontWeight: 700, color: t.textTertiary, textTransform: 'uppercase', letterSpacing: '.06em', px: 1, mb: 1 }}>
              {results.length} result{results.length !== 1 ? 's' : ''} for "{query}"
            </Typography>

            {results.map((r, idx) => (
              <Box
                key={`${r.path}-${idx}`}
                onClick={() => onOpenFile?.(r.path)}
                sx={{
                  mb: 1.5,
                  border: `1px solid ${t.border}`,
                  borderRadius: '8px',
                  overflow: 'hidden',
                  cursor: onOpenFile ? 'pointer' : 'default',
                  '&:hover': onOpenFile ? { border: `1px solid ${t.brandPrimary}` } : {},
                  transition: 'border-color .15s',
                }}
              >
                {/* File header */}
                <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 1.5, py: 0.85, bgcolor: t.surfaceSubtle, borderBottom: `1px solid ${t.border}` }}>
                  <FileBadge name={r.name} size={17} />
                  <Typography sx={{ fontFamily: MONO, fontSize: '.78rem', fontWeight: 600, color: t.textPrimary, flex: 1 }}>
                    {r.path}
                  </Typography>
                  {r.total_matches !== undefined && (
                    <Chip
                      label={`${r.total_matches} match${r.total_matches !== 1 ? 'es' : ''}`}
                      size="small"
                      sx={{ height: 16, fontSize: '.6rem', fontWeight: 700, bgcolor: 'rgba(21,61,117,.1)', color: t.brandPrimary, '& .MuiChip-label': { px: 0.75 } }}
                    />
                  )}
                </Stack>

                {/* Match lines (code search) */}
                {r.matches && r.matches.length > 0 && (
                  <Box>
                    {r.matches.slice(0, 5).map((m, mi) => (
                      <Stack key={mi} direction="row" alignItems="flex-start" sx={{
                        borderBottom: mi < r.matches!.length - 1 ? `1px solid ${t.border}` : 'none',
                      }}>
                        <Typography sx={{
                          fontSize: '.73rem', fontFamily: MONO, color: t.textTertiary,
                          px: 1.25, py: 0.6, flexShrink: 0, userSelect: 'none', minWidth: 40, textAlign: 'right',
                          bgcolor: t.surfaceSubtle,
                          borderRight: `1px solid ${t.border}`,
                        }}>
                          {m.line}
                        </Typography>
                        <Box
                          component="pre"
                          sx={{
                            m: 0, px: 1.5, py: 0.6,
                            fontFamily: MONO, fontSize: '.78rem', lineHeight: 1.6,
                            whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                            color: t.textPrimary, flex: 1,
                          }}
                          dangerouslySetInnerHTML={{
                            __html: m.content.replace(
                              new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'),
                              '<mark style="background:rgba(245,158,11,.3);color:inherit;border-radius:2px;padding:0 2px">$1</mark>',
                            ),
                          }}
                        />
                      </Stack>
                    ))}
                    {r.matches.length > 5 && (
                      <Typography sx={{ fontSize: '.72rem', color: t.textTertiary, px: 1.5, py: 0.5, bgcolor: t.surfaceSubtle }}>
                        +{r.matches.length - 5} more matches
                      </Typography>
                    )}
                  </Box>
                )}
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default RepoSearchPanel;
