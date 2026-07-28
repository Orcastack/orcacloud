import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Drawer,
  IconButton,
  LinearProgress,
  Stack,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import ReplayIcon from '@mui/icons-material/Replay';
import StopIcon from '@mui/icons-material/Stop';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import ArticleIcon from '@mui/icons-material/Article';
import BarChartIcon from '@mui/icons-material/BarChart';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import LinkIcon from '@mui/icons-material/Link';
import { dashboardTokens, dashboardSemanticColors } from '../../styles/dashboardDesignSystem';
import type { ContainerResource } from './CreateContainerWizard';
import apiClient from '../../services/apiClient';

const FONT = '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const t = dashboardTokens.colors;

const STATUS_CONFIG = {
  running:   { color: dashboardSemanticColors.success, bg: 'rgba(34,197,94,.12)',   label: 'Running',   icon: <CheckCircleIcon sx={{ fontSize: '1rem' }} /> },
  deploying: { color: dashboardSemanticColors.info,    bg: 'rgba(21,61,117,.12)',   label: 'Deploying', icon: <HourglassTopIcon sx={{ fontSize: '1rem' }} /> },
  failed:    { color: dashboardSemanticColors.danger,  bg: 'rgba(239,68,68,.12)',   label: 'Failed',    icon: <ErrorIcon sx={{ fontSize: '1rem' }} /> },
  stopped:   { color: '#6B7280',                       bg: 'rgba(107,114,128,.12)', label: 'Stopped',   icon: <StopIcon sx={{ fontSize: '1rem' }} /> },
};

const DEPLOYMENT_TIMELINE = [
  { label: 'Build started',          time: '-4m 12s', done: true },
  { label: 'Tests passed',           time: '-3m 48s', done: true },
  { label: 'Image built',            time: '-2m 20s', done: true },
  { label: 'Image pushed to registry', time: '-1m 55s', done: true },
  { label: 'Deployment triggered',   time: '-1m 02s', done: true },
  { label: 'Pods rolled out (2/2)',   time: '0s',      done: true },
];

interface MetricRow {
  label: string;
  value: string;
  pct?: number;
  color: string;
}

function MetricCard({ label, value, pct, color }: MetricRow) {
  return (
    <Card sx={{ bgcolor: t.surfaceSubtle, border: `1px solid ${t.border}`, borderRadius: '6px', boxShadow: 'none', flex: 1 }}>
      <CardContent sx={{ p: '12px 14px !important' }}>
        <Typography sx={{ fontSize: '.68rem', color: t.textSecondary, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', mb: 0.5, fontFamily: FONT }}>
          {label}
        </Typography>
        <Typography sx={{ fontSize: '1.25rem', fontWeight: 800, color, fontFamily: FONT, lineHeight: 1 }}>{value}</Typography>
        {pct !== undefined && (
          <LinearProgress variant="determinate" value={pct}
            sx={{ mt: 0.75, height: 3, borderRadius: 2, bgcolor: `${color}22`, '& .MuiLinearProgress-bar': { bgcolor: color } }} />
        )}
      </CardContent>
    </Card>
  );
}

interface Props {
  open: boolean;
  container: ContainerResource | null;
  onClose: () => void;
  onRedeploy: (id: string) => void;
  onStop: (id: string) => void;
}

const ContainerDetailDrawer: React.FC<Props> = ({ open, container, onClose, onRedeploy, onStop }) => {
  const [tab, setTab] = useState(0);
  const [logLines, setLogLines] = useState<string[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [deployProgress, setDeployProgress] = useState(0);

  useEffect(() => {
    if (open && container) {
      setTab(0);
      setDeployProgress(0);
      setLogLines([]);
    }
  }, [open, container]);

  // Animate deploying progress
  useEffect(() => {
    if (!open || container?.status !== 'deploying') return;
    const interval = setInterval(() => {
      setDeployProgress(p => {
        if (p >= 95) { clearInterval(interval); return 95; }
        return p + 4;
      });
    }, 120);
    return () => clearInterval(interval);
  }, [open, container?.status]);

  // Fetch logs when tab 1 is selected
  const fetchLogs = useCallback(async (containerId: string) => {
    setLogsLoading(true);
    setLogLines([]);
    try {
      const { data } = await apiClient.get<{ lines: string[] }>(
        `/api/services/containers/${containerId}/logs/`,
      );
      setLogLines(data.lines ?? []);
    } catch {
      setLogLines(['[error] Failed to fetch logs from server.']);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 1 && open && container) {
      fetchLogs(container.id);
    }
  }, [tab, open, container, fetchLogs]);

  if (!container) return null;

  const cfg = STATUS_CONFIG[container.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.stopped;

  const metrics: MetricRow[] = [
    { label: 'CPU',      value: `${Math.round(container.cpu * 34)}%`,   pct: container.cpu * 34,  color: dashboardSemanticColors.info },
    { label: 'Memory',   value: `${Math.round(container.memory * 0.56)}Mi`, pct: 56, color: dashboardSemanticColors.purple },
    { label: 'Restarts', value: '0',            color: dashboardSemanticColors.success },
    { label: 'Error Rate', value: '0.02%',      color: dashboardSemanticColors.warning },
    { label: 'P50 Latency', value: '12ms',      color: dashboardSemanticColors.success },
    { label: 'Replicas', value: `${container.replicas}/${container.replicas}`, color: dashboardSemanticColors.success },
  ];

  return (
    <Drawer anchor="right" open={open} onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 620 }, bgcolor: t.surface, border: `none`, borderLeft: `1px solid ${t.border}` } }}>
      <Box sx={{ fontFamily: FONT, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <Box sx={{ px: 3, pt: 2.5, pb: 2, borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
            <Box>
              <Stack direction="row" alignItems="center" spacing={1} mb={0.4}>
                <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', color: t.textPrimary, fontFamily: FONT, letterSpacing: '-.02em' }}>
                  {container.name}
                </Typography>
                <Chip label={cfg.label} size="small" icon={cfg.icon as any}
                  sx={{ bgcolor: cfg.bg, color: cfg.color, fontWeight: 700, fontSize: '.65rem', height: 20, border: `1px solid ${cfg.color}44`,
                    '& .MuiChip-icon': { color: cfg.color, ml: '6px' } }} />
              </Stack>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Chip label={container.type} size="small"
                  sx={{ bgcolor: `${t.brandPrimary}14`, color: t.brandPrimary, fontWeight: 700, fontSize: '.62rem', height: 18 }} />
                <Typography sx={{ fontSize: '.72rem', color: t.textTertiary, fontFamily: FONT }}>
                  project:&nbsp;<Box component="span" sx={{ color: t.textSecondary, fontWeight: 600 }}>{container.project}</Box>
                </Typography>
                <Typography sx={{ fontSize: '.72rem', color: t.textTertiary, fontFamily: FONT }}>
                  pipeline:&nbsp;<Box component="span" sx={{ color: t.textSecondary, fontWeight: 600 }}>{container.pipeline}</Box>
                </Typography>
              </Stack>
            </Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <Tooltip title="Redeploy">
                <Button size="small" startIcon={<ReplayIcon />} variant="outlined"
                  onClick={() => onRedeploy(container.id)}
                  sx={{ textTransform: 'none', fontSize: '.75rem', borderColor: t.border, color: t.textSecondary, fontFamily: FONT, boxShadow: 'none' }}>
                  Redeploy
                </Button>
              </Tooltip>
              <Tooltip title="Stop container">
                <Button size="small" startIcon={<StopIcon />} variant="outlined"
                  onClick={() => onStop(container.id)}
                  disabled={container.status === 'stopped'}
                  sx={{ textTransform: 'none', fontSize: '.75rem', borderColor: `${dashboardSemanticColors.danger}44`, color: dashboardSemanticColors.danger, fontFamily: FONT, boxShadow: 'none' }}>
                  Stop
                </Button>
              </Tooltip>
              <IconButton onClick={onClose} size="small" sx={{ color: t.textSecondary }}>
                <CloseIcon />
              </IconButton>
            </Stack>
          </Stack>
        </Box>

        {/* Deploying progress */}
        {container.status === 'deploying' && (
          <Box sx={{ px: 3, py: 1.5, bgcolor: `${t.brandPrimary}08`, borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
            <Stack direction="row" justifyContent="space-between" mb={0.5}>
              <Typography sx={{ fontSize: '.75rem', color: t.brandPrimary, fontWeight: 700, fontFamily: FONT }}>Deploying…</Typography>
              <Typography sx={{ fontSize: '.75rem', color: t.textTertiary, fontFamily: FONT }}>{deployProgress}%</Typography>
            </Stack>
            <LinearProgress variant="determinate" value={deployProgress}
              sx={{ height: 4, borderRadius: 2, bgcolor: `${t.brandPrimary}22`, '& .MuiLinearProgress-bar': { bgcolor: t.brandPrimary } }} />
          </Box>
        )}

        {/* Tabs */}
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{
          px: 2, borderBottom: `1px solid ${t.border}`, flexShrink: 0, minHeight: 40,
          '& .MuiTab-root': { textTransform: 'none', fontFamily: FONT, fontSize: '.78rem', fontWeight: 600, color: t.textSecondary, minHeight: 40, py: 0,
            '&.Mui-selected': { color: t.brandPrimary } },
          '& .MuiTabs-indicator': { bgcolor: t.brandPrimary, height: 2 },
        }}>
          <Tab icon={<RocketLaunchIcon sx={{ fontSize: '.9rem' }} />} iconPosition="start" label="Overview" />
          <Tab icon={<ArticleIcon sx={{ fontSize: '.9rem' }} />} iconPosition="start" label="Logs" />
          <Tab icon={<BarChartIcon sx={{ fontSize: '.9rem' }} />} iconPosition="start" label="Metrics" />
          <Tab icon={<AccountTreeIcon sx={{ fontSize: '.9rem' }} />} iconPosition="start" label="Config" />
        </Tabs>

        {/* Content */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 2.5 }}>

          {/* ── Tab 0: Overview ──────────────────────────────────── */}
          {tab === 0 && (
            <Box>
              {/* Image info */}
              <Card sx={{ bgcolor: t.surfaceSubtle, border: `1px solid ${t.border}`, borderRadius: '6px', boxShadow: 'none', mb: 2 }}>
                <CardContent sx={{ p: '14px 16px !important' }}>
                  <Typography sx={{ fontSize: '.7rem', fontWeight: 700, color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.07em', mb: 1, fontFamily: FONT }}>
                    Image
                  </Typography>
                  <Stack spacing={0.5}>
                    <Row label="Registry" value={container.image.split('/')[0]} mono />
                    <Row label="Repository" value={container.image.split('/').slice(1).join('/')} mono />
                    <Row label="Tag" value={container.tag} mono accent />
                    <Row label="Commit" value={container.commitSha} mono />
                    <Row label="Last deployed" value={new Date(container.lastDeployed).toLocaleString()} />
                  </Stack>
                </CardContent>
              </Card>

              {/* Runtime snapshot */}
              <Card sx={{ bgcolor: t.surfaceSubtle, border: `1px solid ${t.border}`, borderRadius: '6px', boxShadow: 'none', mb: 2 }}>
                <CardContent sx={{ p: '14px 16px !important' }}>
                  <Typography sx={{ fontSize: '.7rem', fontWeight: 700, color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.07em', mb: 1, fontFamily: FONT }}>
                    Runtime
                  </Typography>
                  <Stack spacing={0.5}>
                    <Row label="CPU" value={`${container.cpu} vCPU`} />
                    <Row label="Memory" value={container.memory >= 1024 ? `${container.memory / 1024}Gi` : `${container.memory}Mi`} />
                    <Row label="Replicas" value={String(container.replicas)} />
                    <Row label="Autoscaling" value={container.autoscaling ? `OK enabled (${container.autoscaleMin}–${container.autoscaleMax}, CPU ${container.autoscaleCpu}%)` : 'Disabled'} />
                    <Row label="Expose" value={container.expose} />
                    {container.port && container.type === 'runtime' && <Row label="Port" value={String(container.port)} mono />}
                    {container.domain && <Row label="Domain" value={container.domain} mono accent />}
                  </Stack>
                </CardContent>
              </Card>

              {/* Deployment timeline */}
              <Typography sx={{ fontSize: '.8rem', fontWeight: 700, color: t.textPrimary, mb: 1.25, fontFamily: FONT }}>
                Deployment Timeline
              </Typography>
              <Stack spacing={0}>
                {DEPLOYMENT_TIMELINE.map((ev, i) => (
                  <Stack key={i} direction="row" spacing={1.5} alignItems="flex-start" sx={{ pb: i < DEPLOYMENT_TIMELINE.length - 1 ? 1.25 : 0, position: 'relative' }}>
                    {/* Line */}
                    {i < DEPLOYMENT_TIMELINE.length - 1 && (
                      <Box sx={{ position: 'absolute', left: 9, top: 20, bottom: 0, width: 1, bgcolor: ev.done ? dashboardSemanticColors.success : t.border, opacity: 0.5 }} />
                    )}
                    <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: ev.done ? dashboardSemanticColors.success : t.border, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 1 }}>
                      {ev.done
                        ? <CheckCircleIcon sx={{ fontSize: '.7rem', color: '#fff' }} />
                        : <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#fff', opacity: 0.5 }} />
                      }
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: '.8rem', fontWeight: 600, color: ev.done ? t.textPrimary : t.textTertiary, fontFamily: FONT }}>{ev.label}</Typography>
                      <Typography sx={{ fontSize: '.7rem', color: t.textTertiary, fontFamily: 'monospace' }}>{ev.time}</Typography>
                    </Box>
                  </Stack>
                ))}
              </Stack>
            </Box>
          )}

          {/* ── Tab 1: Logs ──────────────────────────────────────── */}
          {tab === 1 && (
            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                <Typography sx={{ fontSize: '.82rem', fontWeight: 700, color: t.textPrimary, fontFamily: FONT }}>Live Logs</Typography>
                {logsLoading && <CircularProgress size={14} sx={{ color: t.brandPrimary }} />}
              </Stack>
              <Box sx={{
                bgcolor: '#0d1117', borderRadius: '8px', border: `1px solid ${t.border}`,
                p: 2, fontFamily: 'monospace', fontSize: '.72rem', lineHeight: 1.7,
                minHeight: 300, overflowY: 'auto',
              }}>
                {logLines.map((line, i) => {
                  const isError = line.includes('ERROR') || line.includes('FATAL');
                  const isWarn = line.includes('WARN');
                  const isInfo = line.includes('INFO');
                  const color = isError ? dashboardSemanticColors.danger : isWarn ? dashboardSemanticColors.warning : isInfo ? '#e6edf3' : '#8b949e';
                  return (
                    <Box key={i} component="div" sx={{ color, mb: 0.1 }}>
                      <Box component="span" sx={{ color: '#8b949e', mr: 0.75 }}>{line.split(']')[0]}]</Box>
                      <Box component="span">{line.split(']').slice(1).join(']')}</Box>
                    </Box>
                  );
                })}
                {logsLoading && (
                  <Box component="span" sx={{ display: 'inline-block', width: 8, height: 14, bgcolor: t.brandPrimary, animation: 'blink 1s step-end infinite',
                    '@keyframes blink': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0 } } }} />
                )}
              </Box>
            </Box>
          )}

          {/* ── Tab 2: Metrics ───────────────────────────────────── */}
          {tab === 2 && (
            <Box>
              <Typography sx={{ fontSize: '.82rem', fontWeight: 700, color: t.textPrimary, mb: 1.5, fontFamily: FONT }}>Live Metrics</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1.25, mb: 2.5 }}>
                {metrics.map(m => <MetricCard key={m.label} {...m} />)}
              </Box>

              {/* CPU sparkline placeholder */}
              <Card sx={{ bgcolor: t.surfaceSubtle, border: `1px solid ${t.border}`, borderRadius: '6px', boxShadow: 'none', mb: 1.5 }}>
                <CardContent sx={{ p: '14px 16px !important' }}>
                  <Typography sx={{ fontSize: '.7rem', fontWeight: 700, color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.07em', mb: 1.25, fontFamily: FONT }}>
                    CPU Usage (last 10 min)
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 0.4, height: 48 }}>
                    {[32, 28, 35, 40, 38, 45, 42, 50, 47, 34, 31, 29, 38, 42, 45, 48, 41, 36, 34, 32].map((v, i) => (
                      <Box key={i} sx={{ flex: 1, height: `${v}%`, borderRadius: '2px 2px 0 0', bgcolor: `${t.brandPrimary}88` }} />
                    ))}
                  </Box>
                </CardContent>
              </Card>

              <Card sx={{ bgcolor: t.surfaceSubtle, border: `1px solid ${t.border}`, borderRadius: '6px', boxShadow: 'none' }}>
                <CardContent sx={{ p: '14px 16px !important' }}>
                  <Typography sx={{ fontSize: '.7rem', fontWeight: 700, color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.07em', mb: 1.25, fontFamily: FONT }}>
                    Memory Usage (last 10 min)
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 0.4, height: 48 }}>
                    {[54, 56, 55, 57, 58, 56, 60, 59, 57, 55, 54, 56, 58, 61, 59, 57, 56, 58, 60, 58].map((v, i) => (
                      <Box key={i} sx={{ flex: 1, height: `${v}%`, borderRadius: '2px 2px 0 0', bgcolor: `${dashboardSemanticColors.purple}88` }} />
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Box>
          )}

          {/* ── Tab 3: Config ────────────────────────────────────── */}
          {tab === 3 && (
            <Box>
              <Card sx={{ bgcolor: t.surfaceSubtle, border: `1px solid ${t.border}`, borderRadius: '6px', boxShadow: 'none', mb: 2 }}>
                <CardContent sx={{ p: '14px 16px !important' }}>
                  <Typography sx={{ fontSize: '.7rem', fontWeight: 700, color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.07em', mb: 1, fontFamily: FONT }}>
                    Environment Variables
                  </Typography>
                  <Stack spacing={0.75}>
                    {[['NODE_ENV', 'production'], ['PORT', String(container.port)], ['LOG_LEVEL', 'info'], ['DATABASE_URL', '••••••••']].map(([k, v]) => (
                      <Stack key={k} direction="row" justifyContent="space-between" alignItems="center"
                        sx={{ py: 0.4, borderBottom: `1px solid ${t.border}` }}>
                        <Typography sx={{ fontSize: '.78rem', fontFamily: 'monospace', color: t.brandPrimary, fontWeight: 700 }}>{k}</Typography>
                        <Typography sx={{ fontSize: '.78rem', fontFamily: 'monospace', color: t.textSecondary }}>{v}</Typography>
                      </Stack>
                    ))}
                  </Stack>
                </CardContent>
              </Card>

              <Card sx={{ bgcolor: t.surfaceSubtle, border: `1px solid ${t.border}`, borderRadius: '6px', boxShadow: 'none', mb: 2 }}>
                <CardContent sx={{ p: '14px 16px !important' }}>
                  <Typography sx={{ fontSize: '.7rem', fontWeight: 700, color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.07em', mb: 1, fontFamily: FONT }}>
                    Linked Resources
                  </Typography>
                  <Stack spacing={0.75}>
                    <Stack direction="row" spacing={1.25} alignItems="center">
                      <LinkIcon sx={{ fontSize: '1rem', color: t.textTertiary }} />
                      <Typography sx={{ fontSize: '.8rem', color: t.textSecondary, fontFamily: FONT }}>
                        Project: <Box component="span" sx={{ color: t.brandPrimary, fontWeight: 700 }}>{container.project}</Box>
                      </Typography>
                    </Stack>
                    <Stack direction="row" spacing={1.25} alignItems="center">
                      <LinkIcon sx={{ fontSize: '1rem', color: t.textTertiary }} />
                      <Typography sx={{ fontSize: '.8rem', color: t.textSecondary, fontFamily: FONT }}>
                        Pipeline: <Box component="span" sx={{ color: t.brandPrimary, fontWeight: 700 }}>{container.pipeline}</Box>
                      </Typography>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>

              {/* Security */}
              <Card sx={{ bgcolor: t.surfaceSubtle, border: `1px solid ${t.border}`, borderRadius: '6px', boxShadow: 'none' }}>
                <CardContent sx={{ p: '14px 16px !important' }}>
                  <Typography sx={{ fontSize: '.7rem', fontWeight: 700, color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.07em', mb: 1, fontFamily: FONT }}>
                    Security
                  </Typography>
                  <Stack spacing={0.5}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <CheckCircleIcon sx={{ fontSize: '.85rem', color: dashboardSemanticColors.success }} />
                      <Typography sx={{ fontSize: '.78rem', color: t.textSecondary, fontFamily: FONT }}>Non-root user</Typography>
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <CheckCircleIcon sx={{ fontSize: '.85rem', color: dashboardSemanticColors.success }} />
                      <Typography sx={{ fontSize: '.78rem', color: t.textSecondary, fontFamily: FONT }}>Minimal base image</Typography>
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <CheckCircleIcon sx={{ fontSize: '.85rem', color: dashboardSemanticColors.success }} />
                      <Typography sx={{ fontSize: '.78rem', color: t.textSecondary, fontFamily: FONT }}>Secrets injected at runtime</Typography>
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <CheckCircleIcon sx={{ fontSize: '.85rem', color: dashboardSemanticColors.success }} />
                      <Typography sx={{ fontSize: '.78rem', color: t.textSecondary, fontFamily: FONT }}>No SSH exposed</Typography>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Box>
          )}
        </Box>
      </Box>
    </Drawer>
  );
};

// Row helper
function Row({ label, value, mono, accent }: { label: string; value: string; mono?: boolean; accent?: boolean }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ py: 0.35, borderBottom: `1px solid ${t.border}` }}>
      <Typography sx={{ fontSize: '.75rem', color: t.textTertiary, fontFamily: FONT }}>{label}</Typography>
      <Typography sx={{
        fontSize: '.75rem', fontFamily: mono ? 'monospace' : FONT,
        color: accent ? dashboardTokens.colors.brandPrimary : t.textSecondary, fontWeight: accent ? 700 : 400,
      }}>{value}</Typography>
    </Stack>
  );
}

export default ContainerDetailDrawer;
