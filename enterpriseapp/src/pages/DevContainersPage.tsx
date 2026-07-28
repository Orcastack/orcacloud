import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  Skeleton,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ReplayIcon from '@mui/icons-material/Replay';
import StopIcon from '@mui/icons-material/Stop';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import FilterListIcon from '@mui/icons-material/FilterList';
import { dashboardTokens, dashboardSemanticColors } from '../styles/dashboardDesignSystem';
import CreateContainerWizard from '../components/Containers/CreateContainerWizard';
import ContainerDetailDrawer from '../components/Containers/ContainerDetailDrawer';
import type { ContainerResource } from '../components/Containers/CreateContainerWizard';
import { listContainers, deployContainer, stopContainer } from '../services/containersApi';

const FONT = '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const t = dashboardTokens.colors;

type ContainerStatus = 'running' | 'deploying' | 'failed' | 'stopped';

const STATUS_CONFIG: Record<ContainerStatus, { color: string; bg: string; label: string; icon: React.ReactNode }> = {
  running:   { color: dashboardSemanticColors.success, bg: 'rgba(34,197,94,.12)',   label: 'Running',   icon: <CheckCircleIcon sx={{ fontSize: '.85rem' }} /> },
  deploying: { color: dashboardSemanticColors.info,    bg: 'rgba(21,61,117,.12)',   label: 'Deploying', icon: <HourglassTopIcon sx={{ fontSize: '.85rem' }} /> },
  failed:    { color: dashboardSemanticColors.danger,  bg: 'rgba(239,68,68,.12)',   label: 'Failed',    icon: <ErrorIcon sx={{ fontSize: '.85rem' }} /> },
  stopped:   { color: '#6B7280',                       bg: 'rgba(107,114,128,.12)', label: 'Stopped',   icon: <PauseCircleIcon sx={{ fontSize: '.85rem' }} /> },
};

const TYPE_CONFIG: Record<string, { color: string; label: string }> = {
  runtime: { color: dashboardSemanticColors.info,    label: 'Runtime' },
  worker:  { color: dashboardSemanticColors.purple,  label: 'Worker' },
  cron:    { color: dashboardSemanticColors.warning, label: 'Cron' },
  oneoff:  { color: '#6B7280',                       label: 'One-off' },
};

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.round(diff)}s ago`;
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return `${Math.round(diff / 86400)}d ago`;
}

const DevContainersPage: React.FC = () => {
  const [containers, setContainers] = useState<ContainerResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [detailContainer, setDetailContainer] = useState<ContainerResource | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<ContainerStatus | 'all'>('all');
  const [snack, setSnack] = useState<string | null>(null);

  const fetchContainers = useCallback(async () => {
    setLoading(true);
    try {
      const items = await listContainers();
      setContainers(items);
    } catch {
      // silently fail — data stays as-is
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchContainers(); }, [fetchContainers]);

  const filtered = useMemo(() => {
    return containers.filter(c => {
      const matchSearch = !search || c.name.includes(search) || c.project.includes(search) || c.pipeline.includes(search);
      const matchStatus = filterStatus === 'all' || c.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [containers, search, filterStatus]);

  const summary = useMemo(() => ({
    total: containers.length,
    running: containers.filter(c => c.status === 'running').length,
    deploying: containers.filter(c => c.status === 'deploying').length,
    failed: containers.filter(c => c.status === 'failed').length,
  }), [containers]);

  const handleCreated = (c: ContainerResource) => {
    setContainers(prev => [c, ...prev]);
    setWizardOpen(false);
    setSnack(`Container "${c.name}" is deploying…`);
  };

  const handleView = (c: ContainerResource) => {
    setDetailContainer(c);
    setDrawerOpen(true);
  };

  const handleRedeploy = useCallback(async (id: string) => {
    setContainers(prev => prev.map(c => c.id === id ? { ...c, status: 'deploying', lastDeployed: new Date().toISOString() } : c));
    setDrawerOpen(false);
    setSnack('Redeployment triggered.');
    try {
      await deployContainer(id);
    } catch {
      setSnack('Redeployment request failed.');
    }
  }, []);

  const handleStop = useCallback(async (id: string) => {
    setContainers(prev => prev.map(c => c.id === id ? { ...c, status: 'stopped' } : c));
    setDrawerOpen(false);
    setSnack('Container stopped.');
    try {
      await stopContainer(id);
    } catch {
      setSnack('Stop request failed.');
    }
  }, []);

  const STATS = [
    { label: 'Total',     value: summary.total,     color: t.textPrimary },
    { label: 'Running',   value: summary.running,   color: dashboardSemanticColors.success },
    { label: 'Deploying', value: summary.deploying, color: dashboardSemanticColors.info },
    { label: 'Failed',    value: summary.failed,    color: dashboardSemanticColors.danger },
  ];

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, fontFamily: FONT }}>

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.2rem', md: '1.35rem' }, color: t.textPrimary, fontFamily: FONT, letterSpacing: '-.02em' }}>
            Containers
          </Typography>
          <Typography sx={{ color: t.textSecondary, fontSize: '.875rem', mt: 0.3, fontFamily: FONT }}>
            Build, deploy, and manage containerised services linked to projects and pipelines.
          </Typography>
        </Box>
        <Tooltip title="Refresh">
          <IconButton onClick={fetchContainers} size="small"
            sx={{ color: t.textSecondary, mr: 1, '&:hover': { bgcolor: t.surfaceHover } }}>
            <RefreshIcon sx={{ fontSize: '1.1rem' }} />
          </IconButton>
        </Tooltip>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setWizardOpen(true)}
          sx={{ bgcolor: t.brandPrimary, color: '#FFFFFF', fontWeight: 700, fontSize: '.8rem', borderRadius: '6px', textTransform: 'none', boxShadow: 'none', fontFamily: FONT, '&:hover': { bgcolor: t.brandPrimaryHover, boxShadow: 'none' } }}>
          Create Container
        </Button>
      </Box>

      {/* Stats */}
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} sx={{ mb: 3 }}>
        {STATS.map(stat => (
          <Card key={stat.label} sx={{ flex: 1, bgcolor: t.surface, border: `1px solid ${t.border}`, borderRadius: '6px', boxShadow: 'none' }}>
            <CardContent sx={{ p: '14px 18px !important' }}>
              <Typography sx={{ fontSize: '.68rem', color: t.textSecondary, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', fontFamily: FONT }}>{stat.label}</Typography>
              <Typography sx={{ fontSize: '1.6rem', fontWeight: 800, color: stat.color, fontFamily: FONT, lineHeight: 1.1, mt: 0.25 }}>{stat.value}</Typography>
            </CardContent>
          </Card>
        ))}
      </Stack>

      {/* Filters */}
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} sx={{ mb: 2 }} alignItems="center">
        <TextField
          size="small" placeholder="Search containers…" value={search}
          onChange={e => setSearch(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon sx={{ fontSize: '1rem', color: t.textTertiary, mr: 0.75 }} />,
            sx: { fontFamily: FONT, fontSize: '.82rem', bgcolor: t.surfaceSubtle, color: t.textPrimary },
          }}
          sx={{ flex: 1, maxWidth: { sm: 320 } }}
        />
        <Stack direction="row" gap={0.75} alignItems="center">
          <FilterListIcon sx={{ fontSize: '1rem', color: t.textTertiary }} />
          {(['all', 'running', 'deploying', 'failed', 'stopped'] as const).map(s => (
            <Box key={s} onClick={() => setFilterStatus(s)} sx={{
              px: 1.5, py: 0.4, borderRadius: '20px', cursor: 'pointer', fontSize: '.72rem', fontFamily: FONT, fontWeight: 700,
              border: `1px solid ${filterStatus === s ? t.brandPrimary : t.border}`,
              bgcolor: filterStatus === s ? `${t.brandPrimary}14` : t.surfaceSubtle,
              color: filterStatus === s ? t.brandPrimary : t.textSecondary,
              transition: 'all .12s',
            }}>
              {s === 'all' ? 'All' : STATUS_CONFIG[s as ContainerStatus].label}
            </Box>
          ))}
        </Stack>
      </Stack>

      {/* Table */}
      <Card sx={{ bgcolor: t.surface, border: `1px solid ${t.border}`, borderRadius: '6px', boxShadow: 'none' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { borderColor: t.border, color: t.textSecondary, fontWeight: 700, fontSize: '.7rem', textTransform: 'uppercase', letterSpacing: '.06em', fontFamily: FONT, py: 1.25 } }}>
                <TableCell>Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Project</TableCell>
                <TableCell>Pipeline</TableCell>
                <TableCell>Image Tag</TableCell>
                <TableCell>Replicas</TableCell>
                <TableCell>Last Deployed</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 9 }).map((__, j) => (
                      <TableCell key={j} sx={{ borderColor: t.border, py: 1.5 }}>
                        <Skeleton variant="text" width={j === 0 ? 120 : j === 8 ? 60 : 80} height={16} sx={{ bgcolor: t.surfaceSubtle }} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 5, color: t.textTertiary, fontFamily: FONT, fontSize: '.82rem' }}>
                    {containers.length === 0 ? 'No containers yet — create your first one.' : 'No containers match your filter.'}
                  </TableCell>
                </TableRow>
              ) : filtered.map(container => {
                const sc = STATUS_CONFIG[container.status as ContainerStatus];
                const tc = TYPE_CONFIG[container.type] ?? TYPE_CONFIG.runtime;
                return (
                  <TableRow key={container.id} hover sx={{
                    '& td': { borderColor: t.border, fontFamily: FONT, fontSize: '.82rem', color: t.textPrimary, py: 1.1 },
                    '&:hover': { bgcolor: t.surfaceHover },
                    cursor: 'pointer',
                  }} onClick={() => handleView(container)}>
                    <TableCell>
                      <Typography sx={{ fontWeight: 700, fontSize: '.82rem', color: t.textPrimary, fontFamily: FONT }}>{container.name}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={tc.label} size="small"
                        sx={{ bgcolor: `${tc.color}18`, color: tc.color, fontWeight: 700, fontSize: '.62rem', height: 18, border: `1px solid ${tc.color}33` }} />
                    </TableCell>
                    <TableCell>
                      <Chip label={sc.label} size="small" icon={sc.icon as any}
                        sx={{ bgcolor: sc.bg, color: sc.color, fontWeight: 700, fontSize: '.62rem', height: 20, border: `1px solid ${sc.color}44`,
                          '& .MuiChip-icon': { color: sc.color, ml: '6px' } }} />
                    </TableCell>
                    <TableCell sx={{ color: t.textSecondary }}>{container.project}</TableCell>
                    <TableCell sx={{ color: t.textSecondary }}>{container.pipeline}</TableCell>
                    <TableCell>
                      <Box component="span" sx={{ fontFamily: 'monospace', fontSize: '.72rem', color: t.brandPrimary, bgcolor: `${t.brandPrimary}10`, px: 0.75, py: 0.25, borderRadius: '4px' }}>
                        {container.tag}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', color: t.textSecondary }}>
                      {container.replicas}/{container.replicas}
                      {container.autoscaling && (
                        <Box component="span" sx={{ ml: 0.5, fontSize: '.62rem', color: t.brandPrimary, fontFamily: FONT }}>(auto)</Box>
                      )}
                    </TableCell>
                    <TableCell sx={{ color: t.textTertiary, fontSize: '.75rem' }}>{timeAgo(container.lastDeployed)}</TableCell>
                    <TableCell align="right" onClick={e => e.stopPropagation()}>
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <Tooltip title="View details">
                          <IconButton size="small" onClick={() => handleView(container)}
                            sx={{ color: t.brandPrimary, '&:hover': { bgcolor: `${t.brandPrimary}14` } }}>
                            <VisibilityIcon sx={{ fontSize: '1rem' }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Redeploy">
                          <IconButton size="small" onClick={() => handleRedeploy(container.id)}
                            sx={{ color: t.textSecondary, '&:hover': { bgcolor: t.surfaceHover } }}>
                            <ReplayIcon sx={{ fontSize: '1rem' }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Stop">
                          <IconButton size="small" disabled={container.status === 'stopped'}
                            onClick={() => handleStop(container.id)}
                            sx={{ color: dashboardSemanticColors.danger, '&:hover': { bgcolor: 'rgba(239,68,68,.1)' }, '&.Mui-disabled': { opacity: 0.3 } }}>
                            <StopIcon sx={{ fontSize: '1rem' }} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Wizard */}
      <CreateContainerWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onCreated={handleCreated}
      />

      {/* Detail Drawer */}
      <ContainerDetailDrawer
        open={drawerOpen}
        container={detailContainer}
        onClose={() => setDrawerOpen(false)}
        onRedeploy={handleRedeploy}
        onStop={handleStop}
      />

      {/* Snackbar */}
      <Snackbar
        open={!!snack}
        autoHideDuration={4500}
        onClose={() => setSnack(null)}
        message={snack}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        ContentProps={{ sx: { bgcolor: dashboardSemanticColors.success, color: '#fff', fontFamily: FONT, fontSize: '.82rem', fontWeight: 600 } }}
      />
    </Box>
  );
};

export default DevContainersPage;
