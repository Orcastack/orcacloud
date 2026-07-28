/**
 * RepoBranchSelector — GitHub-style branch dropdown with search and create.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon        from '@mui/icons-material/Add';
import CallSplitIcon  from '@mui/icons-material/CallSplit';
import CheckIcon      from '@mui/icons-material/Check';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LockIcon       from '@mui/icons-material/Lock';
import SearchIcon     from '@mui/icons-material/Search';
import { dashboardTokens } from '../../styles/dashboardDesignSystem';
import type { RepoBranch } from '../../services/projectsApi';

const t    = dashboardTokens.colors;

interface RepoBranchSelectorProps {
  currentBranch:  string;
  branches:       RepoBranch[];
  loading?:       boolean;
  onSwitch:       (branch: string) => void;
  onCreate?:      (name: string) => void;
}

export const RepoBranchSelector: React.FC<RepoBranchSelectorProps> = ({
  currentBranch, branches, loading, onSwitch, onCreate,
}) => {
  const [open, setOpen]     = useState(false);
  const [query, setQuery]   = useState('');
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
        setCreating(false);
        setNewName('');
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const filtered = branches.filter(b =>
    b.name.toLowerCase().includes(query.toLowerCase())
  );

  const handleCreate = () => {
    if (!newName.trim() || !onCreate) return;
    onCreate(newName.trim());
    setNewName('');
    setCreating(false);
    setOpen(false);
  };

  return (
    <Box ref={wrapRef} sx={{ position: 'relative', zIndex: 20 }}>
      {/* Trigger button */}
      <Stack
        direction="row" alignItems="center" spacing={0.6}
        onClick={() => setOpen(v => !v)}
        sx={{
          px: 1.25, py: 0.55,
          border: `1px solid ${t.border}`,
          borderRadius: '8px',
          bgcolor: t.surfaceSubtle,
          cursor: 'pointer',
          userSelect: 'none',
          minWidth: 120,
          '&:hover': { borderColor: t.brandPrimary },
          transition: 'border-color .15s',
        }}
      >
        <CallSplitIcon sx={{ fontSize: '.82rem', color: t.textSecondary }} />
        <Typography sx={{
          fontFamily: '"JetBrains Mono","Fira Code",monospace',
          fontSize: '.8rem', fontWeight: 600, color: t.textPrimary, flex: 1,
        }}>
          {currentBranch}
        </Typography>
        {loading
          ? <CircularProgress size={10} sx={{ color: t.textTertiary }} />
          : <ExpandMoreIcon sx={{ fontSize: '.85rem', color: t.textTertiary, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
        }
      </Stack>

      {/* Dropdown */}
      {open && (
        <Box sx={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          left: 0,
          width: 280,
          bgcolor: t.surface,
          border: `1px solid ${t.border}`,
          borderRadius: '10px',
          boxShadow: '0 8px 24px rgba(0,0,0,.18)',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <Box sx={{ px: 1.5, py: 1, borderBottom: `1px solid ${t.border}` }}>
            <Typography sx={{ fontSize: '.72rem', fontWeight: 700, color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.06em' }}>
              Switch branch
            </Typography>
          </Box>

          {/* Search */}
          <Box sx={{ p: 1 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Find a branch…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: '.85rem', color: t.textTertiary }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiInputBase-root': { bgcolor: t.surfaceSubtle, color: t.textPrimary, fontSize: '.8rem' },
                '& .MuiOutlinedInput-notchedOutline': { borderColor: t.border },
              }}
            />
          </Box>

          {/* Branch list */}
          <Box sx={{ maxHeight: 240, overflowY: 'auto' }}>
            {filtered.length === 0
              ? (
                <Typography sx={{ p: 2, fontSize: '.8rem', color: t.textTertiary, textAlign: 'center' }}>
                  No branches match "{query}"
                </Typography>
              )
              : filtered.map(b => {
                const isCurrent = b.name === currentBranch;
                return (
                  <Stack
                    key={b.name}
                    direction="row" alignItems="center" spacing={1}
                    onClick={() => { onSwitch(b.name); setOpen(false); setQuery(''); }}
                    sx={{
                      px: 1.5, py: 0.85,
                      cursor: 'pointer',
                      bgcolor: isCurrent ? 'rgba(21,61,117,.08)' : 'transparent',
                      '&:hover': { bgcolor: isCurrent ? 'rgba(21,61,117,.12)' : t.surfaceHover },
                      transition: 'background .1s',
                    }}
                  >
                    <Box sx={{ width: 16, flexShrink: 0 }}>
                      {isCurrent && <CheckIcon sx={{ fontSize: '.85rem', color: t.brandPrimary }} />}
                    </Box>
                    <CallSplitIcon sx={{ fontSize: '.75rem', color: t.textTertiary, flexShrink: 0 }} />
                    <Typography sx={{
                      flex: 1,
                      fontSize: '.82rem',
                      fontFamily: '"JetBrains Mono","Fira Code",monospace',
                      fontWeight: isCurrent ? 700 : 400,
                      color: isCurrent ? t.brandPrimary : t.textPrimary,
                    }}>
                      {b.name}
                    </Typography>
                    {b.protected && <LockIcon sx={{ fontSize: '.72rem', color: t.textTertiary, flexShrink: 0 }} />}
                    {(b.ahead > 0 || b.behind > 0) && (
                      <Stack direction="row" spacing={0.3}>
                        {b.ahead  > 0 && <Chip label={`↑${b.ahead}`}  size="small" sx={{ height: 15, fontSize: '.58rem', bgcolor: 'rgba(34,197,94,.1)',  color: '#22C55E', '& .MuiChip-label': { px: 0.5 } }} />}
                        {b.behind > 0 && <Chip label={`↓${b.behind}`} size="small" sx={{ height: 15, fontSize: '.58rem', bgcolor: 'rgba(239,68,68,.1)',  color: '#EF4444', '& .MuiChip-label': { px: 0.5 } }} />}
                      </Stack>
                    )}
                  </Stack>
                );
              })
            }
          </Box>

          {/* Create new branch */}
          {onCreate && (
            <>
              <Divider sx={{ borderColor: t.border }} />
              {!creating
                ? (
                  <Stack
                    direction="row" alignItems="center" spacing={0.75}
                    onClick={() => setCreating(true)}
                    sx={{ px: 1.5, py: 1, cursor: 'pointer', '&:hover': { bgcolor: t.surfaceHover } }}
                  >
                    <AddIcon sx={{ fontSize: '.9rem', color: t.brandPrimary }} />
                    <Typography sx={{ fontSize: '.8rem', color: t.brandPrimary, fontWeight: 600 }}>
                      Create new branch
                    </Typography>
                  </Stack>
                )
                : (
                  <Stack spacing={0.75} sx={{ p: 1 }}>
                    <TextField
                      fullWidth size="small"
                      placeholder={`From: ${currentBranch}`}
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') { setCreating(false); setNewName(''); } }}
                      autoFocus
                      sx={{
                        '& .MuiInputBase-root': { bgcolor: t.surfaceSubtle, color: t.textPrimary, fontSize: '.8rem', fontFamily: '"JetBrains Mono",monospace' },
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: t.border },
                      }}
                    />
                    <Stack direction="row" spacing={0.75}>
                      <Button size="small" variant="contained" onClick={handleCreate} disabled={!newName.trim()}
                        sx={{ textTransform: 'none', fontSize: '.75rem', fontWeight: 700, flex: 1, bgcolor: t.brandPrimary, '&:hover': { bgcolor: '#0f2d5a' } }}>
                        Create
                      </Button>
                      <Button size="small" onClick={() => { setCreating(false); setNewName(''); }}
                        sx={{ textTransform: 'none', fontSize: '.75rem', color: t.textSecondary }}>
                        Cancel
                      </Button>
                    </Stack>
                  </Stack>
                )
              }
            </>
          )}
        </Box>
      )}
    </Box>
  );
};

export default RepoBranchSelector;
