// OrcaCloud – Virtual Machine List Panel
// Shows all VMs with status, IP, flavor, actions (start / stop / delete)

import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '@mui/material/styles';
import {
  Box, Typography, Stack, Chip, IconButton, Tooltip,
  Skeleton, Alert, Button, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions,
  CircularProgress,
} from '@mui/material';
import PlayArrowIcon      from '@mui/icons-material/PlayArrow';
import StopIcon           from '@mui/icons-material/Stop';
import RestartAltIcon     from '@mui/icons-material/RestartAlt';
import DeleteOutlineIcon  from '@mui/icons-material/DeleteOutline';
import DnsIcon            from '@mui/icons-material/Dns';
import AddIcon            from '@mui/icons-material/Add';
import RefreshIcon        from '@mui/icons-material/Refresh';
import { VMInstance, VMStatus } from '../../types/cloud';
import { vmApi } from '../../services/cloudApi';

// ── Status colour map ─────────────────────────────────────────────────────────

const STATUS_COLOR: Record<VMStatus | string, { bg: string; text: string; label: string }> = {
  ACTIVE:       { bg: 'rgba(34,197,94,.12)',  text: '#22C55E', label: 'Running'  },
  BUILD:        { bg: 'rgba(245,158,11,.12)', text: '#F59E0B', label: 'Building' },
  REBOOT:       { bg: 'rgba(245,158,11,.12)', text: '#F59E0B', label: 'Rebooting'},
  HARD_REBOOT:  { bg: 'rgba(245,158,11,.12)', text: '#F59E0B', label: 'Rebooting'},
  SHUTOFF:      { bg: 'rgba(107,114,128,.1)', text: '#6B7280', label: 'Stopped' },
  PAUSED:       { bg: 'rgba(139,92,246,.12)', text: '#8b5cf6', label: 'Paused'  },
  SUSPENDED:    { bg: 'rgba(139,92,246,.12)', text: '#8b5cf6', label: 'Suspended'},
  ERROR:        { bg: 'rgba(239,68,68,.12)',  text: '#EF4444', label: 'Error'    },
  DELETED:      { bg: 'rgba(107,114,128,.1)', text: '#9CA3AF', label: 'Deleted' },
};

function statusStyle(s: string) {
  return STATUS_COLOR[s] ?? { bg: 'rgba(156,163,175,.12)', text: '#9ca3af', label: s };
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface VMListPanelProps {
  refreshKey?: number;          // bump to force a re-fetch (e.g. after wizard)
  onCreateClick?: () => void;   // opens the Deploy Wizard from parent
}

// ── Main component ────────────────────────────────────────────────────────────

const VMListPanel: React.FC<VMListPanelProps> = ({ refreshKey = 0, onCreateClick }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [vms,     setVms]     = useState<VMInstance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  // Action state per-VM
  const [actionLoading, setActionLoading] = useState<Record<string, string>>({});    // id → 'start'|'stop'|'delete'|'reboot'
  const [confirmDelete, setConfirmDelete] = useState<VMInstance | null>(null);

  const fetchVMs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await vmApi.list();
      setVms(Array.isArray(res.data) ? res.data : []);
    } catch (e: any) {
      const detail = e?.response?.data?.detail ?? '';
      if (detail.includes('not configured') || e?.response?.status === 503) {
        // OpenStack not wired up – show empty state without scary error
        setVms([]);
      } else {
        setError(detail || 'Could not load virtual machines.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchVMs(); }, [fetchVMs, refreshKey]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const setVM_action = (id: string, action: string | null) =>
    setActionLoading(prev => action ? { ...prev, [id]: action } : (() => { const n = { ...prev }; delete n[id]; return n; })());

  const handleStart = async (vm: VMInstance) => {
    setVM_action(vm.id, 'start');
    try {
      await vmApi.start(vm.id);
      await fetchVMs();
    } catch { /* ignore */ }
    finally { setVM_action(vm.id, null); }
  };

  const handleStop = async (vm: VMInstance) => {
    setVM_action(vm.id, 'stop');
    try {
      await vmApi.stop(vm.id);
      await fetchVMs();
    } catch { /* ignore */ }
    finally { setVM_action(vm.id, null); }
  };

  const handleReboot = async (vm: VMInstance) => {
    setVM_action(vm.id, 'reboot');
    try {
      await vmApi.reboot(vm.id);
      await fetchVMs();
    } catch { /* ignore */ }
    finally { setVM_action(vm.id, null); }
  };

  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return;
    const id = confirmDelete.id;
    setConfirmDelete(null);
    setVM_action(id, 'delete');
    try {
      await vmApi.delete(id);
      setVms(prev => prev.filter(v => v.id !== id));
    } catch { /* ignore */ }
    finally { setVM_action(id, null); }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Box
      sx={{
        borderRadius: 3,
        border: `1px solid ${isDark ? 'rgba(255,255,255,.1)' : '#E5E7EB'}`,
        bgcolor: isDark ? '#132336' : '#ffffff',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ px: 2.5, py: 1.75, borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.08)'}` }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <DnsIcon sx={{ color: '#111827', fontSize: '1.1rem' }} />
          <Typography fontWeight={700} color={isDark ? '#ffffff' : '#111827'} fontSize=".95rem">
            Virtual Machines
          </Typography>
          {!loading && vms.length > 0 && (
            <Chip
              label={vms.length}
              size="small"
              sx={{ bgcolor: 'rgba(21,61,117,.1)', color: '#111827', fontWeight: 700, fontSize: '.7rem', height: 18 }}
            />
          )}
        </Stack>
        <Stack direction="row" spacing={.5}>
          <Tooltip title="Refresh">
            <IconButton size="small" onClick={fetchVMs} disabled={loading} sx={{ color: '#64748b', '&:hover': { color: '#111827' } }}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {onCreateClick && (
            <Button
              size="small"
              variant="contained"
              startIcon={<AddIcon />}
              onClick={onCreateClick}
              sx={{
                bgcolor: '#153d75', color: '#fff', fontWeight: 700,
                fontSize: '.75rem', borderRadius: '6px', px: 1.5, py: .5,
                '&:hover': { bgcolor: '#0f2d5a' },
              }}
            >
              Create VM
            </Button>
          )}
        </Stack>
      </Stack>

      {/* Body */}
      <Box>
        {error && (
          <Alert severity="error" sx={{ m: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Stack spacing={0} divider={<Divider sx={{ borderColor: isDark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.06)' }} />}>
            {[1, 2, 3].map((i) => (
              <Box key={i} sx={{ px: 2.5, py: 2 }}>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Skeleton variant="circular" width={36} height={36} sx={{ bgcolor: isDark ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.07)', flexShrink: 0 }} />
                  <Box flex={1}>
                    <Skeleton width="40%" height={18} sx={{ bgcolor: isDark ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.07)' }} />
                    <Skeleton width="60%" height={14} sx={{ bgcolor: isDark ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.05)', mt: .5 }} />
                  </Box>
                  <Skeleton width={70} height={24} sx={{ bgcolor: isDark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.06)', borderRadius: 10 }} />
                </Stack>
              </Box>
            ))}
          </Stack>
        ) : vms.length === 0 ? (
          <EmptyState onCreateClick={onCreateClick} />
        ) : (
          <Stack divider={<Divider sx={{ borderColor: isDark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.06)' }} />}>
            {vms.map((vm) => (
              <VMRow
                key={vm.id}
                vm={vm}
                actionLoading={actionLoading[vm.id]}
                onStart={() => handleStart(vm)}
                onStop={() => handleStop(vm)}
                onReboot={() => handleReboot(vm)}
                onDelete={() => setConfirmDelete(vm)}
              />
            ))}
          </Stack>
        )}
      </Box>

      {/* Delete confirmation dialog */}
      <Dialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { background: isDark ? '#132336' : '#ffffff', border: '1px solid rgba(239,68,68,.35)', borderRadius: '8px' } }}
      >
        <DialogTitle sx={{ color: '#EF4444', fontWeight: 800, fontSize: '1rem' }}>
          Delete Virtual Machine?
        </DialogTitle>
        <DialogContent>
          <Typography color={isDark ? '#ffffff' : '#64748b'} fontSize=".9rem">
            <strong style={{ color: isDark ? '#ffffff' : '#111827' }}>{confirmDelete?.name}</strong> will be permanently deleted.
            This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmDelete(null)} sx={{ color: isDark ? '#ffffff' : '#64748b' }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleDeleteConfirm}
            sx={{ bgcolor: '#f43f5e', '&:hover': { bgcolor: '#e11d48' }, fontWeight: 700, borderRadius: 2 }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// ── VM Row ────────────────────────────────────────────────────────────────────

interface VMRowProps {
  vm: VMInstance;
  actionLoading?: string;
  onStart: () => void;
  onStop: () => void;
  onReboot: () => void;
  onDelete: () => void;
}

const VMRow: React.FC<VMRowProps> = ({ vm, actionLoading, onStart, onStop, onReboot, onDelete }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const st = statusStyle(vm.status);
  const busy = !!actionLoading;
  const isRunning = vm.status === 'ACTIVE';
  const isStopped = vm.status === 'SHUTOFF';
  const isBuilding = vm.status === 'BUILD' || vm.status === 'REBOOT' || vm.status === 'HARD_REBOOT';

  const ip = vm.ip_address ?? '—';
  const flavor = vm.flavor?.name ?? vm.flavor?.id ?? '—';
  const created = vm.created_at
    ? new Date(vm.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';

  return (
    <Box sx={{ px: 2.5, py: 2, '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,.04)' : 'rgba(21,61,117,.03)' }, transition: 'background .15s' }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} spacing={2}>

        {/* Icon */}
        <Box
          sx={{
            width: 38, height: 38, borderRadius: 2, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            bgcolor: st.bg, border: `1px solid ${st.text}30`,
          }}
        >
          {isBuilding
            ? <CircularProgress size={18} sx={{ color: st.text }} />
            : <DnsIcon sx={{ color: st.text, fontSize: '1.1rem' }} />}
        </Box>

        {/* Name + meta */}
        <Box flex={1} minWidth={0}>
          <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
            <Typography fontWeight={700} color={isDark ? '#ffffff' : '#111827'} fontSize=".9rem" noWrap>{vm.name}</Typography>
            <Chip
              label={st.label}
              size="small"
              sx={{ bgcolor: st.bg, color: st.text, fontWeight: 700, fontSize: '.65rem', height: 18, border: `1px solid ${st.text}30` }}
            />
          </Stack>
          <Typography variant="caption" color={isDark ? '#ffffff' : '#64748b'} mt={.25} display="block">
            {flavor} &nbsp;·&nbsp; IP: {ip} &nbsp;·&nbsp; Created {created}
          </Typography>
        </Box>

        {/* Actions */}
        <Stack direction="row" spacing={.5} flexShrink={0}>
          {isStopped && (
            <Tooltip title="Start">
              <span>
                <IconButton
                  size="small"
                  disabled={busy}
                  onClick={onStart}
                  sx={{ color: '#111827', '&:hover': { bgcolor: 'rgba(21,61,117,.1)' } }}
                >
                  {actionLoading === 'start'
                    ? <CircularProgress size={16} sx={{ color: '#111827' }} />
                    : <PlayArrowIcon fontSize="small" />}
                </IconButton>
              </span>
            </Tooltip>
          )}
          {isRunning && (
            <>
              <Tooltip title="Stop">
                <span>
                  <IconButton
                    size="small"
                    disabled={busy}
                    onClick={onStop}
                    sx={{ color: '#f59e0b', '&:hover': { bgcolor: 'rgba(245,158,11,.1)' } }}
                  >
                    {actionLoading === 'stop'
                      ? <CircularProgress size={16} sx={{ color: '#f59e0b' }} />
                      : <StopIcon fontSize="small" />}
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Reboot">
                <span>
                  <IconButton
                    size="small"
                    disabled={busy}
                    onClick={onReboot}
                    sx={{ color: '#8b5cf6', '&:hover': { bgcolor: 'rgba(139,92,246,.1)' } }}
                  >
                    {actionLoading === 'reboot'
                      ? <CircularProgress size={16} sx={{ color: '#8b5cf6' }} />
                      : <RestartAltIcon fontSize="small" />}
                  </IconButton>
                </span>
              </Tooltip>
            </>
          )}
          <Tooltip title="Delete">
            <span>
              <IconButton
                size="small"
                disabled={busy || isBuilding}
                onClick={onDelete}
                sx={{ color: '#f43f5e', '&:hover': { bgcolor: 'rgba(244,63,94,.1)' } }}
              >
                {actionLoading === 'delete'
                  ? <CircularProgress size={16} sx={{ color: '#f43f5e' }} />
                  : <DeleteOutlineIcon fontSize="small" />}
              </IconButton>
            </span>
          </Tooltip>
        </Stack>

      </Stack>
    </Box>
  );
};

// ── Empty State ───────────────────────────────────────────────────────────────

const EmptyState: React.FC<{ onCreateClick?: () => void }> = ({ onCreateClick }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  return (
  <Box sx={{ textAlign: 'center', py: 6, px: 3 }}>
    <Box
      sx={{
        width: 64, height: 64, borderRadius: '50%',
        bgcolor: isDark ? 'rgba(255,255,255,.06)' : 'rgba(21,61,117,.07)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,.12)' : 'rgba(21,61,117,.2)'}`,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', mb: 2,
      }}
    >
      <DnsIcon sx={{ color: '#111827', fontSize: '1.8rem' }} />
    </Box>
    <Typography fontWeight={700} color={isDark ? '#ffffff' : '#111827'} fontSize=".95rem" mb={.75}>
      No Virtual Machines Yet
    </Typography>
    <Typography color={isDark ? '#ffffff' : '#6B7280'} fontSize=".85rem" mb={2.5}>
      Launch your first server to start building your infrastructure.
    </Typography>
    {onCreateClick && (
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={onCreateClick}
        sx={{
          bgcolor: '#153d75', color: '#fff', fontWeight: 700,
          borderRadius: '6px', px: 3,
          '&:hover': { bgcolor: '#0f2d5a' },
        }}
      >
        Create Your First VM
      </Button>
    )}
  </Box>
  );
};

export default VMListPanel;
