/**
 * DevMonitoringPage — Developer Monitor
 * ───────────────────────────────────────
 * Unified observability dashboard for the full Developer Dashboard.
 * Views: Overview | Pipelines | Deployments | Projects | Services | Activity |
 *        Alerts | Resources | Containers | Kubernetes | Logs & Metrics |
 *        Webhooks | Workspace | IaC | Environments | Operational
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Stack, Typography, Chip, Card, CardContent, CardHeader,
  CircularProgress, LinearProgress, Tooltip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, IconButton, Select, MenuItem, FormControl, InputLabel,
  Alert, Divider,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import FolderSpecialIcon from '@mui/icons-material/FolderSpecial';
import CloudIcon from '@mui/icons-material/Cloud';
import HistoryIcon from '@mui/icons-material/History';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import StorageIcon from '@mui/icons-material/Storage';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import HubIcon from '@mui/icons-material/Hub';
import InsightsIcon from '@mui/icons-material/Insights';
import WebhookIcon from '@mui/icons-material/Webhook';
import DesktopWindowsIcon from '@mui/icons-material/DesktopWindows';
import LayersIcon from '@mui/icons-material/Layers';
import TuneIcon from '@mui/icons-material/Tune';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import { dashboardTokens } from '../styles/dashboardDesignSystem';
import {
  monitoringApi,
  DevOverview, PipelineHealth, DeploymentHealth,
  ProjectHealth, ActivityEvent, ServiceHealth,
  MonitoringAlert, Incident, AlertRule,
  ContainerHealth, KubernetesHealth, ResourceHealthSummary,
  MetricPoint, LogLine,
  WebhookHealth, WorkspaceStatus, IaCTemplateStatus,
  EnvironmentStatus, OperationalComponent,
} from '../services/monitoringApi';

// Design system tokens — these CSS vars flip automatically between light and dark
const t = dashboardTokens.colors;

// ─── Helpers ─────────────────────────────────────────────────────────────────

type TimeRange = '1h' | '6h' | '24h' | '7d' | '30d';
const HOURS_MAP: Record<TimeRange, number> = { '1h': 1, '6h': 6, '24h': 24, '7d': 168, '30d': 720 };

function statusColor(status: string): 'success' | 'warning' | 'error' | 'default' {
  if (['operational', 'success', 'healthy', 'resolved'].includes(status)) return 'success';
  if (['degraded', 'partial_outage', 'investigating', 'identified', 'monitoring'].includes(status)) return 'warning';
  if (['major_outage', 'failed', 'critical', 'open'].includes(status)) return 'error';
  return 'default';
}

function severityColor(sev: string): 'error' | 'warning' | 'info' | 'default' {
  if (['critical', 'sev1', 'sev2'].includes(sev)) return 'error';
  if (['warning', 'sev3'].includes(sev)) return 'warning';
  if (['info', 'sev4'].includes(sev)) return 'info';
  return 'default';
}

function StatusIcon({ status }: { status: string }) {
  const c = statusColor(status);
  if (c === 'success') return <CheckCircleIcon fontSize="small" color="success" />;
  if (c === 'warning') return <WarningIcon fontSize="small" color="warning" />;
  if (c === 'error') return <ErrorIcon fontSize="small" color="error" />;
  return <RadioButtonCheckedIcon fontSize="small" color="disabled" />;
}

function timeAgo(ts: string | null | undefined) {
  if (!ts) return '—';
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 2) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function unwrap<T>(data: any): T[] {
  return Array.isArray(data) ? data : (data?.results ?? []);
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  title, value, sub, color, icon,
}: {
  title: string;
  value: string | number;
  sub?: string;
  color?: 'success' | 'warning' | 'error' | 'info';
  icon?: React.ReactNode;
}) {
  const colorMap = {
    success: '#2e7d32',
    warning: '#ed6c02',
    error: '#d32f2f',
    info: '#0288d1',
  };
  const bg = color ? `${colorMap[color]}18` : 'transparent';
  const borderColor = color ? colorMap[color] : t.border;
  return (
    <Card sx={{ flex: 1, minWidth: 160, border: `1px solid ${borderColor}`, background: bg }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
          {icon}
          <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing={0.8}>
            {title}
          </Typography>
        </Stack>
        <Typography variant="h4" fontWeight={700} color={color ? colorMap[color] : 'text.primary'}>
          {value}
        </Typography>
        {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
      </CardContent>
    </Card>
  );
}

// ─── Pipeline Row ─────────────────────────────────────────────────────────────

function PipelineHealthRow({ item }: { item: PipelineHealth }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TableRow hover sx={{ cursor: 'pointer' }} onClick={() => setOpen(o => !o)}>
        <TableCell><Typography fontWeight={600}>{item.project_name || item.project_id}</Typography></TableCell>
        <TableCell align="center">{item.total_runs}</TableCell>
        <TableCell align="center"><Chip label={item.success} color="success" size="small" /></TableCell>
        <TableCell align="center"><Chip label={item.failed} color={item.failed > 0 ? 'error' : 'default'} size="small" /></TableCell>
        <TableCell align="center">
          {item.running > 0
            ? <Chip label={`${item.running} running`} color="info" size="small" />
            : <Typography variant="body2" color="text.secondary">—</Typography>}
        </TableCell>
        <TableCell align="right">
          <Stack direction="row" alignItems="center" spacing={1} justifyContent="flex-end">
            <LinearProgress
              variant="determinate"
              value={item.success_rate}
              color={item.success_rate >= 80 ? 'success' : item.success_rate >= 50 ? 'warning' : 'error'}
              sx={{ width: 80, height: 6, borderRadius: 3 }}
            />
            <Typography variant="body2" fontWeight={600}>{item.success_rate.toFixed(1)}%</Typography>
          </Stack>
        </TableCell>
      </TableRow>
      {open && item.recent_runs.length > 0 && (
        <TableRow>
          <TableCell colSpan={6} sx={{ p: 0 }}>
            <Box sx={{ bgcolor: t.surfaceSubtle, p: 2 }}>
              <Typography variant="caption" color="text.secondary" mb={1} display="block">Recent runs</Typography>
              {item.recent_runs.map(r => (
                <Stack key={r.id} direction="row" spacing={2} alignItems="center" py={0.5}>
                  <StatusIcon status={r.status} />
                  <Typography variant="body2" sx={{ minWidth: 180 }}>{r.pipeline_name}</Typography>
                  <Chip label={r.branch} size="small" variant="outlined" />
                  <Chip label={r.status} color={statusColor(r.status)} size="small" />
                  <Typography variant="caption" color="text.secondary">by {r.triggered_by}</Typography>
                  <Typography variant="caption" color="text.secondary">{timeAgo(r.started_at)}</Typography>
                </Stack>
              ))}
            </Box>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

// ─── Deployment Row ───────────────────────────────────────────────────────────

function DeploymentHealthRow({ item }: { item: DeploymentHealth }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TableRow hover sx={{ cursor: 'pointer' }} onClick={() => setOpen(o => !o)}>
        <TableCell>
          <Typography fontWeight={600}>{item.container_name}</Typography>
          <Typography variant="caption" color="text.secondary">{item.image}</Typography>
        </TableCell>
        <TableCell align="center">{item.total_deploys}</TableCell>
        <TableCell align="center"><Chip label={item.success} color="success" size="small" /></TableCell>
        <TableCell align="center"><Chip label={item.failed} color={item.failed > 0 ? 'error' : 'default'} size="small" /></TableCell>
        <TableCell align="right">
          <Stack direction="row" alignItems="center" spacing={1} justifyContent="flex-end">
            <LinearProgress
              variant="determinate"
              value={item.success_rate}
              color={item.success_rate >= 80 ? 'success' : item.success_rate >= 50 ? 'warning' : 'error'}
              sx={{ width: 80, height: 6, borderRadius: 3 }}
            />
            <Typography variant="body2" fontWeight={600}>{item.success_rate.toFixed(1)}%</Typography>
          </Stack>
        </TableCell>
      </TableRow>
      {open && item.recent_deploys.length > 0 && (
        <TableRow>
          <TableCell colSpan={5} sx={{ p: 0 }}>
            <Box sx={{ bgcolor: t.surfaceSubtle, p: 2 }}>
              <Typography variant="caption" color="text.secondary" mb={1} display="block">Recent deployments</Typography>
              {item.recent_deploys.map(d => (
                <Stack key={d.id} direction="row" spacing={2} alignItems="center" py={0.5}>
                  <StatusIcon status={d.status} />
                  <Chip label={d.image_tag} size="small" variant="outlined" />
                  <Chip label={d.status} color={statusColor(d.status)} size="small" />
                  <Typography variant="caption" color="text.secondary">via {d.trigger}</Typography>
                  <Typography variant="caption" color="text.secondary">{timeAgo(d.started_at)}</Typography>
                </Stack>
              ))}
            </Box>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

// ─── Activity Event Row ───────────────────────────────────────────────────────

function ActivityRow({ ev }: { ev: ActivityEvent }) {
  const icon = ev.severity === 'critical'
    ? <ErrorIcon fontSize="small" color="error" />
    : ev.severity === 'warning'
    ? <WarningIcon fontSize="small" color="warning" />
    : <InfoIcon fontSize="small" color="info" />;

  return (
    <Stack
      direction="row" spacing={2} alignItems="flex-start" py={1.5}
      sx={{ borderBottom: `1px solid ${t.border}`, '&:last-child': { borderBottom: 0 } }}
    >
      <Box sx={{ pt: 0.3 }}>{icon}</Box>
      <Box flex={1}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Chip
            label={ev.event_type.replace(/_/g, ' ')}
            size="small"
            color={severityColor(ev.severity)}
            variant="outlined"
          />
          {ev.project_name && <Chip label={ev.project_name} size="small" variant="outlined" />}
          {ev.resource_name && (
            <Typography variant="body2" color="text.secondary">
              {ev.resource_type}: <strong>{ev.resource_name}</strong>
            </Typography>
          )}
          {ev.environment && <Chip label={ev.environment} size="small" />}
        </Stack>
        <Typography variant="body2" mt={0.5}>{ev.description}</Typography>
        <Stack direction="row" spacing={2} mt={0.25}>
          {ev.actor && <Typography variant="caption" color="text.secondary">by {ev.actor}</Typography>}
          <Typography variant="caption" color="text.secondary">{timeAgo(ev.created_at)}</Typography>
        </Stack>
      </Box>
    </Stack>
  );
}

// ─── Tab config ───────────────────────────────────────────────────────────────

const TAB_LABELS = [
  { label: 'Overview',       icon: <CheckCircleIcon fontSize="small" /> },
  { label: 'Pipelines',      icon: <AccountTreeIcon fontSize="small" /> },
  { label: 'Deployments',    icon: <RocketLaunchIcon fontSize="small" /> },
  { label: 'Projects',       icon: <FolderSpecialIcon fontSize="small" /> },
  { label: 'Services',       icon: <CloudIcon fontSize="small" /> },
  { label: 'Activity',       icon: <HistoryIcon fontSize="small" /> },
  { label: 'Alerts',         icon: <NotificationsActiveIcon fontSize="small" /> },
  { label: 'Resources',      icon: <StorageIcon fontSize="small" /> },
  { label: 'Containers',     icon: <ViewInArIcon fontSize="small" /> },
  { label: 'Kubernetes',     icon: <HubIcon fontSize="small" /> },
  { label: 'Logs & Metrics', icon: <InsightsIcon fontSize="small" /> },
  { label: 'Webhooks',       icon: <WebhookIcon fontSize="small" /> },
  { label: 'Workspace',      icon: <DesktopWindowsIcon fontSize="small" /> },
  { label: 'IaC',            icon: <LayersIcon fontSize="small" /> },
  { label: 'Environments',   icon: <TuneIcon fontSize="small" /> },
  { label: 'Operational',    icon: <MonitorHeartIcon fontSize="small" /> },
];

// ─── Main Component ───────────────────────────────────────────────────────────

const DevMonitoringPage: React.FC = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const [overview, setOverview] = useState<DevOverview | null>(null);
  const [pipelines, setPipelines] = useState<PipelineHealth[]>([]);
  const [deployments, setDeployments] = useState<DeploymentHealth[]>([]);
  const [projects, setProjects] = useState<ProjectHealth[]>([]);
  const [services, setServices] = useState<ServiceHealth[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [alerts, setAlerts] = useState<MonitoringAlert[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [alertFilter, setAlertFilter] = useState<'all' | 'active' | 'resolved'>('active');
  const [incidentFilter, setIncidentFilter] = useState<'all' | 'open' | 'resolved'>('open');
  const [actFilter, setActFilter] = useState<string>('all');
  const [containers, setContainers] = useState<ContainerHealth[]>([]);
  const [kubernetesHealth, setKubernetesHealth] = useState<KubernetesHealth[]>([]);
  const [resourceHealth, setResourceHealth] = useState<ResourceHealthSummary | null>(null);
  const [metricPoints, setMetricPoints] = useState<MetricPoint[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<string>('cpu_percent');
  const [logLines, setLogLines] = useState<LogLine[]>([]);
  const [logSearch, setLogSearch] = useState<string>('');
  const [logService, setLogService] = useState<string>('');
  const [resourceTypeFilter, setResourceTypeFilter] = useState<string>('all');
  const [webhooks, setWebhooks] = useState<WebhookHealth[]>([]);
  const [workspaces, setWorkspaces] = useState<WorkspaceStatus[]>([]);
  const [iacTemplates, setIaCTemplates] = useState<IaCTemplateStatus[]>([]);
  const [environments, setEnvironments] = useState<EnvironmentStatus[]>([]);
  const [operationalComponents, setOperationalComponents] = useState<OperationalComponent[]>([]);

  const hours = HOURS_MAP[timeRange];
  const abortRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    try {
      const [
        ovRes, plRes, depRes, prjRes, svcRes, actRes,
        alRes, incRes, arRes, ctRes, k8sRes, rhRes, logRes,
        whRes, wsRes, iacRes, envRes, opRes,
      ] = await Promise.allSettled([
        monitoringApi.getDevOverview(),
        monitoringApi.getPipelineHealth({ hours }),
        monitoringApi.getDeploymentHealth({ hours }),
        monitoringApi.getProjectHealth(),
        monitoringApi.getServiceHealth(),
        monitoringApi.getActivity({ hours, limit: 100 }),
        monitoringApi.getAlerts(),
        monitoringApi.getIncidents(),
        monitoringApi.getAlertRules(),
        monitoringApi.getContainerHealth(),
        monitoringApi.getKubernetesHealth(),
        monitoringApi.getResourceHealth(),
        monitoringApi.getLogs({ hours: 1, limit: 200 }),
        monitoringApi.getWebhookHealth(),
        monitoringApi.getWorkspaceStatus(),
        monitoringApi.getIaCStatus(),
        monitoringApi.getEnvironmentStatus(),
        monitoringApi.getOperationalStatus(),
      ]);

      if (ovRes.status === 'fulfilled') setOverview(ovRes.value.data as DevOverview);
      if (plRes.status === 'fulfilled') setPipelines(unwrap<PipelineHealth>(plRes.value.data));
      if (depRes.status === 'fulfilled') setDeployments(unwrap<DeploymentHealth>(depRes.value.data));
      if (prjRes.status === 'fulfilled') setProjects(unwrap<ProjectHealth>(prjRes.value.data));
      if (svcRes.status === 'fulfilled') setServices(unwrap<ServiceHealth>(svcRes.value.data));
      if (actRes.status === 'fulfilled') setActivity(unwrap<ActivityEvent>(actRes.value.data));
      if (alRes.status === 'fulfilled') setAlerts(unwrap<MonitoringAlert>(alRes.value.data));
      if (incRes.status === 'fulfilled') setIncidents(unwrap<Incident>(incRes.value.data));
      if (arRes.status === 'fulfilled') setAlertRules(unwrap<AlertRule>(arRes.value.data));
      if (ctRes.status === 'fulfilled') setContainers(unwrap<ContainerHealth>(ctRes.value.data));
      if (k8sRes.status === 'fulfilled') setKubernetesHealth(unwrap<KubernetesHealth>(k8sRes.value.data));
      if (rhRes.status === 'fulfilled') setResourceHealth(rhRes.value.data as ResourceHealthSummary);
      if (logRes.status === 'fulfilled') setLogLines((logRes.value.data as any)?.logs ?? []);
      if (whRes.status === 'fulfilled') setWebhooks(unwrap<WebhookHealth>(whRes.value.data));
      if (wsRes.status === 'fulfilled') setWorkspaces(unwrap<WorkspaceStatus>(wsRes.value.data));
      if (iacRes.status === 'fulfilled') setIaCTemplates(unwrap<IaCTemplateStatus>(iacRes.value.data));
      if (envRes.status === 'fulfilled') setEnvironments(unwrap<EnvironmentStatus>(envRes.value.data));
      if (opRes.status === 'fulfilled') setOperationalComponents(unwrap<OperationalComponent>(opRes.value.data));

      setLastRefresh(new Date());
    } finally {
      setLoading(false);
    }
  }, [hours]);

  useEffect(() => { refresh(); }, [refresh]);

  const filteredAlerts = alerts.filter(a => {
    if (alertFilter === 'active') return a.status !== 'resolved';
    if (alertFilter === 'resolved') return a.status === 'resolved';
    return true;
  });
  const filteredIncidents = incidents.filter(i => {
    if (incidentFilter === 'open') return !['resolved', 'postmortem'].includes(i.status);
    if (incidentFilter === 'resolved') return ['resolved', 'postmortem'].includes(i.status);
    return true;
  });
  const filteredActivity = actFilter === 'all'
    ? activity
    : activity.filter(a => a.event_type.includes(actFilter) || a.severity === actFilter);

  const openIncidents = incidents.filter(i => !['resolved', 'postmortem'].includes(i.status)).length;
  const criticalAlerts = alerts.filter(a => a.severity === 'critical' && a.status !== 'resolved').length;

  // ── Tab: Overview ──────────────────────────────────────────────────────────
  const renderOverview = () => (
    <Stack spacing={3}>
      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
        <StatCard
          title="Pipeline Success"
          value={overview ? `${overview.pipelines.success_rate}%` : '—'}
          sub={`${overview?.pipelines.runs_24h ?? 0} runs in ${timeRange}`}
          color={
            overview && overview.pipelines.success_rate >= 80 ? 'success'
            : overview && overview.pipelines.success_rate >= 60 ? 'warning'
            : 'error'
          }
          icon={<AccountTreeIcon fontSize="small" />}
        />
        <StatCard
          title="Deploy Success"
          value={overview ? `${overview.deployments.success_rate}%` : '—'}
          sub={`${overview?.deployments.total_24h ?? 0} deploys in ${timeRange}`}
          color={overview && overview.deployments.success_rate >= 80 ? 'success' : 'warning'}
          icon={<RocketLaunchIcon fontSize="small" />}
        />
        <StatCard
          title="Active Alerts"
          value={overview?.alerts.active ?? '—'}
          sub={`${overview?.alerts.critical ?? 0} critical`}
          color={(overview?.alerts.critical ?? 0) > 0 ? 'error' : (overview?.alerts.active ?? 0) > 0 ? 'warning' : 'success'}
          icon={<NotificationsActiveIcon fontSize="small" />}
        />
        <StatCard
          title="Open Incidents"
          value={overview?.incidents.open ?? '—'}
          sub={`${overview?.incidents.total_rules ?? 0} alert rules`}
          color={(overview?.incidents.open ?? 0) > 0 ? 'error' : 'success'}
        />
        <StatCard
          title="Services Healthy"
          value={overview ? `${overview.services.healthy}/${overview.services.total}` : '—'}
          sub={`${overview?.services.degraded ?? 0} degraded, ${overview?.services.down ?? 0} down`}
          color={
            (overview?.services.down ?? 0) > 0 ? 'error'
            : (overview?.services.degraded ?? 0) > 0 ? 'warning'
            : 'success'
          }
          icon={<CloudIcon fontSize="small" />}
        />
      </Stack>

      <Card>
        <CardHeader
          title="Service Health"
          titleTypographyProps={{ variant: 'h6', fontWeight: 700 }}
          subheader="Real-time status of platform services"
        />
        <CardContent sx={{ pt: 0 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {services.length === 0 && (
              <Typography color="text.secondary" variant="body2">No service health data available.</Typography>
            )}
            {services.map(svc => (
              <Box key={svc.resource_id} sx={{ flex: '1 1 280px', maxWidth: 380 }}>
                <Card
                  variant="outlined"
                  sx={{
                    borderColor: statusColor(svc.status) === 'success' ? '#2e7d32'
                      : statusColor(svc.status) === 'warning' ? '#ed6c02'
                      : '#d32f2f',
                  }}
                >
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Stack direction="row" spacing={1} alignItems="center">
                        <StatusIcon status={svc.status} />
                        <Typography fontWeight={600} variant="body2">{svc.name}</Typography>
                      </Stack>
                      <Chip label={svc.status.replace('_', ' ')} color={statusColor(svc.status)} size="small" />
                    </Stack>
                    <Stack direction="row" spacing={3} mt={1}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Uptime</Typography>
                        <Typography variant="body2" fontWeight={600}>{svc.uptime_percent?.toFixed(2)}%</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Latency</Typography>
                        <Typography variant="body2" fontWeight={600}>{svc.latency_ms}ms</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Errors</Typography>
                        <Typography variant="body2" fontWeight={600}>{svc.error_rate?.toFixed(2)}%</Typography>
                      </Box>
                    </Stack>
                    <Typography variant="caption" color="text.secondary" mt={0.5} display="block">
                      {svc.region} · {timeAgo(svc.last_checked)}
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>

      {activity.length > 0 && (
        <Card>
          <CardHeader
            title="Recent Activity"
            titleTypographyProps={{ variant: 'h6', fontWeight: 700 }}
            action={<Button size="small" onClick={() => setTab(5)}>View all</Button>}
          />
          <CardContent sx={{ pt: 0 }}>
            {activity.slice(0, 5).map((ev, i) => (
              <ActivityRow key={`${ev.id}-${i}`} ev={ev} />
            ))}
          </CardContent>
        </Card>
      )}
    </Stack>
  );

  // ── Tab: Pipelines ─────────────────────────────────────────────────────────
  const renderPipelines = () => (
    <Card>
      <CardHeader
        title="Pipeline Health"
        titleTypographyProps={{ variant: 'h6', fontWeight: 700 }}
        subheader={`Last ${timeRange} — click a row to see recent runs`}
      />
      <CardContent sx={{ p: 0 }}>
        {pipelines.length === 0 ? (
          <Box p={4} textAlign="center">
            <Typography color="text.secondary">No pipeline data for this time range.</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Project</TableCell>
                  <TableCell align="center">Total</TableCell>
                  <TableCell align="center">Success</TableCell>
                  <TableCell align="center">Failed</TableCell>
                  <TableCell align="center">Running</TableCell>
                  <TableCell align="right">Success Rate</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pipelines.map(pl => <PipelineHealthRow key={pl.project_id} item={pl} />)}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );

  // ── Tab: Deployments ───────────────────────────────────────────────────────
  const renderDeployments = () => (
    <Card>
      <CardHeader
        title="Deployment Health"
        titleTypographyProps={{ variant: 'h6', fontWeight: 700 }}
        subheader={`Last ${timeRange} — click a row for recent deployments`}
      />
      <CardContent sx={{ p: 0 }}>
        {deployments.length === 0 ? (
          <Box p={4} textAlign="center">
            <Typography color="text.secondary">No deployment data for this time range.</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Container</TableCell>
                  <TableCell align="center">Total</TableCell>
                  <TableCell align="center">Success</TableCell>
                  <TableCell align="center">Failed</TableCell>
                  <TableCell align="right">Success Rate</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {deployments.map(dep => <DeploymentHealthRow key={dep.container_id} item={dep} />)}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );

  // ── Tab: Projects ──────────────────────────────────────────────────────────
  const renderProjects = () => (
    <Stack spacing={2}>
      {projects.length === 0 && (
        <Alert severity="info">No project health data. Create a project to get started.</Alert>
      )}
      {projects.map(p => (
        <Card key={p.project_id}>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2}>
              <Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="h6" fontWeight={700}>{p.project_name}</Typography>
                  <Chip
                    label={p.health_status}
                    color={p.health_status === 'healthy' ? 'success' : p.health_status === 'degraded' ? 'warning' : 'error'}
                    size="small"
                  />
                </Stack>
                <Typography variant="body2" color="text.secondary" mt={0.5}>ID: {p.project_id}</Typography>
              </Box>
              <Box textAlign="right">
                <Typography
                  variant="h4" fontWeight={800}
                  color={p.health_score >= 90 ? '#2e7d32' : p.health_score >= 70 ? '#ed6c02' : '#d32f2f'}
                >
                  {p.health_score}%
                </Typography>
                <Typography variant="caption" color="text.secondary">Health Score (7d)</Typography>
              </Box>
            </Stack>
            <Divider sx={{ my: 1.5 }} />
            <Stack direction="row" spacing={4} flexWrap="wrap">
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">Pipelines (7d)</Typography>
                <Typography variant="body2">
                  <span style={{ color: '#4caf50' }}>OK {p.pipeline_success}</span>
                  {' / '}
                  <span style={{ color: '#f44336' }}>FAIL {p.pipeline_failed}</span>
                  {' · '}{p.pipelines_7d} total
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">Deployments (7d)</Typography>
                <Typography variant="body2">
                  <span style={{ color: '#4caf50' }}>OK {p.deploy_success}</span>
                  {' / '}
                  <span style={{ color: '#f44336' }}>FAIL {p.deploy_failed}</span>
                  {' · '}{p.deploys_7d} total
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );

  // ── Tab: Services ──────────────────────────────────────────────────────────
  const renderServices = () => (
    <Stack spacing={2}>
      {services.length === 0 && (
        <Alert severity="info">No service health data available.</Alert>
      )}
      <TableContainer component={Card}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Service</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Uptime</TableCell>
              <TableCell align="right">Latency</TableCell>
              <TableCell align="right">Error Rate</TableCell>
              <TableCell>Region</TableCell>
              <TableCell>Last Checked</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {services.map(svc => (
              <TableRow key={svc.resource_id} hover>
                <TableCell>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <StatusIcon status={svc.status} />
                    <Typography fontWeight={600}>{svc.name}</Typography>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Chip label={svc.status.replace('_', ' ')} color={statusColor(svc.status)} size="small" />
                </TableCell>
                <TableCell align="right">
                  <Typography
                    variant="body2" fontWeight={700}
                    color={svc.uptime_percent >= 99.9 ? '#4caf50' : svc.uptime_percent >= 99 ? '#ff9800' : '#f44336'}
                  >
                    {svc.uptime_percent?.toFixed(3)}%
                  </Typography>
                </TableCell>
                <TableCell align="right"><Typography variant="body2">{svc.latency_ms} ms</Typography></TableCell>
                <TableCell align="right">
                  <Typography variant="body2" color={svc.error_rate > 1 ? '#f44336' : 'text.secondary'}>
                    {svc.error_rate?.toFixed(3)}%
                  </Typography>
                </TableCell>
                <TableCell><Chip label={svc.region} size="small" variant="outlined" /></TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary">{timeAgo(svc.last_checked)}</Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );

  // ── Tab: Activity ──────────────────────────────────────────────────────────
  const renderActivity = () => (
    <Stack spacing={2}>
      <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Filter</InputLabel>
          <Select value={actFilter} label="Filter" onChange={e => setActFilter(e.target.value)}>
            <MenuItem value="all">All Events</MenuItem>
            <MenuItem value="pipeline">Pipelines</MenuItem>
            <MenuItem value="deployment">Deployments</MenuItem>
            <MenuItem value="alert">Alerts</MenuItem>
            <MenuItem value="incident">Incidents</MenuItem>
            <MenuItem value="critical">Critical Only</MenuItem>
            <MenuItem value="warning">Warnings+</MenuItem>
          </Select>
        </FormControl>
        <Typography variant="body2" color="text.secondary">{filteredActivity.length} events</Typography>
      </Stack>
      <Card>
        <CardContent>
          {filteredActivity.length === 0 && (
            <Typography color="text.secondary" textAlign="center" py={4}>No activity in this time range.</Typography>
          )}
          {filteredActivity.map((ev, i) => <ActivityRow key={`${ev.id}-${i}`} ev={ev} />)}
        </CardContent>
      </Card>
    </Stack>
  );

  // ── Tab: Alerts & Incidents ────────────────────────────────────────────────
  const renderAlerts = () => (
    <Stack spacing={3}>
      {/* Incidents */}
      <Card>
        <CardHeader
          title={
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="h6" fontWeight={700}>Incidents</Typography>
              {openIncidents > 0 && <Chip label={`${openIncidents} open`} color="error" size="small" />}
            </Stack>
          }
          action={
            <Stack direction="row" spacing={1}>
              {(['all', 'open', 'resolved'] as const).map(f => (
                <Button
                  key={f} size="small"
                  variant={incidentFilter === f ? 'contained' : 'outlined'}
                  onClick={() => setIncidentFilter(f)}
                >
                  {f}
                </Button>
              ))}
            </Stack>
          }
        />
        <CardContent sx={{ p: 0 }}>
          {filteredIncidents.length === 0 ? (
            <Box p={3} textAlign="center">
              <CheckCircleIcon color="success" sx={{ fontSize: 40 }} />
              <Typography color="text.secondary" mt={1}>
                {incidentFilter === 'open' ? 'No open incidents — all clear!' : 'No incidents found.'}
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Title</TableCell>
                    <TableCell>Service</TableCell>
                    <TableCell>Severity</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Duration</TableCell>
                    <TableCell>Detected</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredIncidents.map(inc => (
                    <TableRow key={inc.id} hover>
                      <TableCell>
                        <Typography variant="caption" fontFamily="monospace">{inc.resource_id}</Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip title={inc.summary || ''}>
                          <Typography variant="body2" fontWeight={600}>{inc.title}</Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell><Chip label={inc.service} size="small" variant="outlined" /></TableCell>
                      <TableCell><Chip label={inc.severity.toUpperCase()} color={severityColor(inc.severity)} size="small" /></TableCell>
                      <TableCell><Chip label={inc.status} color={statusColor(inc.status)} size="small" /></TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {inc.duration_minutes < 60
                            ? `${inc.duration_minutes}m`
                            : `${Math.floor(inc.duration_minutes / 60)}h ${inc.duration_minutes % 60}m`}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">{timeAgo(inc.detected_at)}</Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Active Alerts */}
      <Card>
        <CardHeader
          title={
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="h6" fontWeight={700}>Alerts</Typography>
              {criticalAlerts > 0 && <Chip label={`${criticalAlerts} critical`} color="error" size="small" />}
            </Stack>
          }
          action={
            <Stack direction="row" spacing={1}>
              {(['all', 'active', 'resolved'] as const).map(f => (
                <Button
                  key={f} size="small"
                  variant={alertFilter === f ? 'contained' : 'outlined'}
                  onClick={() => setAlertFilter(f)}
                >
                  {f}
                </Button>
              ))}
            </Stack>
          }
        />
        <CardContent sx={{ p: 0 }}>
          {filteredAlerts.length === 0 ? (
            <Box p={3} textAlign="center">
              <CheckCircleIcon color="success" sx={{ fontSize: 40 }} />
              <Typography color="text.secondary" mt={1}>
                {alertFilter === 'active' ? 'No active alerts!' : 'No alerts found.'}
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Rule</TableCell>
                    <TableCell>Resource</TableCell>
                    <TableCell>Metric</TableCell>
                    <TableCell align="right">Value / Threshold</TableCell>
                    <TableCell>Severity</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Fired</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredAlerts.map(al => (
                    <TableRow key={al.id} hover>
                      <TableCell><Typography variant="body2" fontWeight={600}>{al.rule_name}</Typography></TableCell>
                      <TableCell><Typography variant="body2">{al.resource_name}</Typography></TableCell>
                      <TableCell><Chip label={al.metric_type?.replace('_', ' ')} size="small" variant="outlined" /></TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={700}>{al.value?.toFixed(2)}</Typography>
                        <Typography variant="caption" color="text.secondary">/{al.threshold}</Typography>
                      </TableCell>
                      <TableCell><Chip label={al.severity} color={severityColor(al.severity)} size="small" /></TableCell>
                      <TableCell><Chip label={al.status} color={statusColor(al.status)} size="small" /></TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">{timeAgo(al.fired_at)}</Typography>
                      </TableCell>
                      <TableCell>
                        {al.status !== 'resolved' && (
                          <Tooltip title="Resolve">
                            <IconButton size="small" color="success"
                              onClick={() => monitoringApi.resolveAlert(al.id).then(refresh)}>
                              <CheckCircleIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Alert Rules */}
      <Card>
        <CardHeader
          title="Alert Rules"
          titleTypographyProps={{ variant: 'h6', fontWeight: 700 }}
          subheader={`${alertRules.length} rules configured`}
        />
        <CardContent sx={{ p: 0 }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Resource</TableCell>
                  <TableCell>Condition</TableCell>
                  <TableCell>Severity</TableCell>
                  <TableCell>Window</TableCell>
                  <TableCell>Enabled</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {alertRules.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <Typography color="text.secondary" py={2} textAlign="center">No alert rules configured.</Typography>
                    </TableCell>
                  </TableRow>
                )}
                {alertRules.map(rule => (
                  <TableRow key={rule.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{rule.name}</Typography>
                      {rule.description && (
                        <Typography variant="caption" color="text.secondary">{rule.description}</Typography>
                      )}
                    </TableCell>
                    <TableCell><Typography variant="body2">{rule.resource_name}</Typography></TableCell>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace" fontSize="0.75rem">
                        {rule.metric_type} {rule.condition} {rule.threshold}
                      </Typography>
                    </TableCell>
                    <TableCell><Chip label={rule.severity} color={severityColor(rule.severity)} size="small" /></TableCell>
                    <TableCell><Typography variant="body2">{rule.window_minutes}m</Typography></TableCell>
                    <TableCell>
                      <Chip
                        label={rule.enabled ? 'enabled' : 'disabled'}
                        color={rule.enabled ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Stack>
  );

  // ── Tab: Resources ─────────────────────────────────────────────────────────
  const renderResources = () => {
    const all = resourceHealth?.resources ?? [];
    const filtered = resourceTypeFilter === 'all' ? all : all.filter(r => r.type === resourceTypeFilter);
    const types = Array.from(new Set(all.map(r => r.type)));
    const s = resourceHealth?.summary;
    const healthColor = (h: string) => h === 'green' ? '#2e7d32' : h === 'yellow' ? '#ed6c02' : '#d32f2f';
    const healthLabel = (h: string) => h === 'green' ? 'healthy' : h === 'yellow' ? 'degraded' : 'critical';
    return (
      <Stack spacing={3}>
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
          <StatCard title="Total Resources" value={s?.total ?? '—'} color="info" icon={<StorageIcon fontSize="small" />} />
          <StatCard title="Healthy" value={s?.healthy ?? '—'} color="success" icon={<CheckCircleIcon fontSize="small" />} />
          <StatCard title="Degraded" value={s?.degraded ?? '—'} color={s && s.degraded > 0 ? 'warning' : 'success'} icon={<WarningIcon fontSize="small" />} />
          <StatCard title="Critical" value={s?.critical ?? '—'} color={s && s.critical > 0 ? 'error' : 'success'} icon={<ErrorIcon fontSize="small" />} />
        </Stack>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Resource Type</InputLabel>
            <Select value={resourceTypeFilter} label="Resource Type" onChange={e => setResourceTypeFilter(e.target.value)}>
              <MenuItem value="all">All Types</MenuItem>
              {types.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </Select>
          </FormControl>
          <Typography variant="body2" color="text.secondary">{filtered.length} resources</Typography>
        </Stack>
        {filtered.length === 0 ? (
          <Alert severity="info">No resources found. Create compute, database, storage, or networking resources to see them here.</Alert>
        ) : (
          <TableContainer component={Card}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Type</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Health</TableCell>
                  <TableCell>Details</TableCell>
                  <TableCell>Created</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map(r => (
                  <TableRow key={`${r.type}-${r.id}`} hover>
                    <TableCell><Chip label={r.type} size="small" variant="outlined" /></TableCell>
                    <TableCell><Typography fontWeight={600} variant="body2">{r.name}</Typography></TableCell>
                    <TableCell><Chip label={r.status} size="small" /></TableCell>
                    <TableCell>
                      <Chip
                        label={healthLabel(r.health)}
                        size="small"
                        sx={{ bgcolor: `${healthColor(r.health)}22`, color: healthColor(r.health), fontWeight: 700, border: `1px solid ${healthColor(r.health)}` }}
                      />
                    </TableCell>
                    <TableCell><Typography variant="caption" color="text.secondary">{r.detail}</Typography></TableCell>
                    <TableCell><Typography variant="caption" color="text.secondary">{timeAgo(r.created_at)}</Typography></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Stack>
    );
  };

  // ── Tab: Containers ────────────────────────────────────────────────────────
  const renderContainers = () => (
    <Stack spacing={2}>
      {containers.length === 0 ? (
        <Alert severity="info">No containers found. Deploy an application to see container health here.</Alert>
      ) : (
        <TableContainer component={Card}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Container</TableCell>
                <TableCell>Image</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Health</TableCell>
                <TableCell align="right">CPU (sim)</TableCell>
                <TableCell align="right">Memory (sim)</TableCell>
                <TableCell align="right">Replicas</TableCell>
                <TableCell align="right">Restarts/h</TableCell>
                <TableCell>Last Deploy</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {containers.map(c => {
                const hc = c.health === 'green' ? '#2e7d32' : c.health === 'yellow' ? '#ed6c02' : '#d32f2f';
                return (
                  <TableRow key={c.id} hover sx={c.health === 'red' ? { bgcolor: `#d32f2f0a` } : {}}>
                    <TableCell><Typography fontWeight={600} variant="body2">{c.name}</Typography></TableCell>
                    <TableCell><Typography variant="caption" fontFamily="monospace">{c.image}</Typography></TableCell>
                    <TableCell><Chip label={c.status} size="small" color={c.status === 'running' ? 'success' : c.status === 'stopped' ? 'default' : 'error'} /></TableCell>
                    <TableCell>
                      <Chip
                        icon={c.health === 'green' ? <CheckCircleIcon /> : c.health === 'yellow' ? <WarningIcon /> : <ErrorIcon />}
                        label={c.health === 'green' ? 'Healthy' : c.health === 'yellow' ? 'Degraded' : 'Critical'}
                        size="small"
                        sx={{ bgcolor: `${hc}22`, color: hc, border: `1px solid ${hc}`, fontWeight: 700 }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Stack alignItems="flex-end">
                        <Typography variant="body2" fontWeight={600} color={c.cpu_sim > 80 ? 'error' : c.cpu_sim > 60 ? 'warning.main' : 'text.primary'}>{c.cpu_sim}%</Typography>
                        <LinearProgress variant="determinate" value={c.cpu_sim} color={c.cpu_sim > 80 ? 'error' : c.cpu_sim > 60 ? 'warning' : 'success'} sx={{ width: 60, height: 4, borderRadius: 2 }} />
                      </Stack>
                    </TableCell>
                    <TableCell align="right">
                      <Stack alignItems="flex-end">
                        <Typography variant="body2" fontWeight={600} color={c.memory_sim > 85 ? 'error' : c.memory_sim > 70 ? 'warning.main' : 'text.primary'}>{c.memory_sim}%</Typography>
                        <LinearProgress variant="determinate" value={c.memory_sim} color={c.memory_sim > 85 ? 'error' : c.memory_sim > 70 ? 'warning' : 'success'} sx={{ width: 60, height: 4, borderRadius: 2 }} />
                      </Stack>
                    </TableCell>
                    <TableCell align="right">{c.replicas}</TableCell>
                    <TableCell align="right">
                      <Chip
                        label={c.restarts_1h}
                        size="small"
                        color={c.restarts_1h >= 3 ? 'error' : c.restarts_1h > 0 ? 'warning' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">{timeAgo(c.last_deploy)}</Typography>
                      {c.last_deploy_status && (
                        <Chip label={c.last_deploy_status} size="small" color={statusColor(c.last_deploy_status)} sx={{ ml: 0.5 }} />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Stack>
  );

  // ── Tab: Kubernetes ────────────────────────────────────────────────────────
  const renderKubernetes = () => (
    <Stack spacing={2}>
      {kubernetesHealth.length === 0 ? (
        <Alert severity="info">No Kubernetes clusters configured. Add a cluster configuration in the Kubernetes integration settings.</Alert>
      ) : kubernetesHealth.map(k => {
        const hc = k.health === 'green' ? '#2e7d32' : k.health === 'yellow' ? '#ed6c02' : '#d32f2f';
        return (
          <Card key={k.config_id} sx={{ border: `1px solid ${hc}44` }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2}>
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                    <HubIcon fontSize="small" sx={{ color: hc }} />
                    <Typography fontWeight={700}>{k.namespace}</Typography>
                    <Chip label={k.environment} size="small" variant="outlined" />
                    <Chip
                      label={k.health === 'green' ? 'Healthy' : k.health === 'yellow' ? 'Degraded' : 'Critical'}
                      size="small"
                      sx={{ bgcolor: `${hc}22`, color: hc, border: `1px solid ${hc}`, fontWeight: 700 }}
                    />
                  </Stack>
                  <Typography variant="caption" color="text.secondary" fontFamily="monospace">{k.cluster_endpoint}</Typography>
                </Box>
                <Stack direction="row" spacing={3}>
                  <Box textAlign="center">
                    <Typography variant="h5" fontWeight={800} color="#4caf50">{k.pods_running}</Typography>
                    <Typography variant="caption" color="text.secondary">Running</Typography>
                  </Box>
                  <Box textAlign="center">
                    <Typography variant="h5" fontWeight={800} color={k.pods_pending > 0 ? '#ff9800' : 'text.secondary'}>{k.pods_pending}</Typography>
                    <Typography variant="caption" color="text.secondary">Pending</Typography>
                  </Box>
                  <Box textAlign="center">
                    <Typography variant="h5" fontWeight={800} color={k.pods_failed > 0 ? '#f44336' : 'text.secondary'}>{k.pods_failed}</Typography>
                    <Typography variant="caption" color="text.secondary">Failed</Typography>
                  </Box>
                </Stack>
              </Stack>
              <Divider sx={{ my: 1.5 }} />
              <Stack direction="row" spacing={4} flexWrap="wrap">
                <Box sx={{ flex: 1, minWidth: 200 }}>
                  <Typography variant="caption" color="text.secondary">Node CPU</Typography>
                  <Stack direction="row" spacing={1} alignItems="center" mt={0.25}>
                    <LinearProgress
                      variant="determinate" value={k.node_cpu_pct}
                      color={k.node_cpu_pct > 80 ? 'error' : k.node_cpu_pct > 60 ? 'warning' : 'success'}
                      sx={{ flex: 1, height: 8, borderRadius: 4 }}
                    />
                    <Typography variant="body2" fontWeight={700}>{k.node_cpu_pct}%</Typography>
                  </Stack>
                </Box>
                <Box sx={{ flex: 1, minWidth: 200 }}>
                  <Typography variant="caption" color="text.secondary">Node Memory</Typography>
                  <Stack direction="row" spacing={1} alignItems="center" mt={0.25}>
                    <LinearProgress
                      variant="determinate" value={k.node_memory_pct}
                      color={k.node_memory_pct > 85 ? 'error' : k.node_memory_pct > 70 ? 'warning' : 'success'}
                      sx={{ flex: 1, height: 8, borderRadius: 4 }}
                    />
                    <Typography variant="body2" fontWeight={700}>{k.node_memory_pct}%</Typography>
                  </Stack>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Syncs (24h)</Typography>
                  <Typography variant="body2">
                    <span style={{ color: '#4caf50' }}>OK {k.total_syncs_24h - k.failed_syncs_24h}</span>
                    {' / '}
                    <span style={{ color: '#f44336' }}>FAIL {k.failed_syncs_24h}</span>
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Last Sync</Typography>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    {k.last_sync_status && <StatusIcon status={k.last_sync_status} />}
                    <Typography variant="body2">{timeAgo(k.last_sync_at)}</Typography>
                  </Stack>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        );
      })}
    </Stack>
  );

  // ── Tab: Logs & Metrics ────────────────────────────────────────────────────
  const METRIC_CHOICES = [
    'cpu_percent', 'memory_percent', 'latency_ms', 'error_rate',
    'request_rate', 'queue_length', 'disk_io_read', 'disk_io_write',
    'network_in', 'network_out',
  ];
  const LOG_SERVICES = ['compute', 'database', 'storage', 'containers', 'networking', 'pipelines', 'dns', 'email'];
  const LOG_LEVEL_COLOR: Record<string, string> = {
    ERROR: '#f44336', WARN: '#ff9800', INFO: '#4caf50', DEBUG: '#9e9e9e',
  };
  const filteredLogs = logLines.filter(l =>
    (!logService || l.service === logService) &&
    (!logSearch || l.message.toLowerCase().includes(logSearch.toLowerCase()))
  );

  const refreshLogs = async () => {
    const res = await monitoringApi.getLogs({ service: logService || undefined, search: logSearch || undefined, hours: 1, limit: 200 });
    setLogLines((res.data as any)?.logs ?? []);
  };

  const refreshMetrics = async () => {
    const res = await monitoringApi.getMetrics({ metric: selectedMetric, hours: hours });
    setMetricPoints((res.data as any)?.points ?? []);
  };

  const renderLogsAndMetrics = () => (
    <Stack spacing={3}>
      {/* Metrics */}
      <Card>
        <CardHeader
          title="Metric Explorer"
          titleTypographyProps={{ variant: 'h6', fontWeight: 700 }}
          action={
            <Stack direction="row" spacing={1} alignItems="center">
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel>Metric</InputLabel>
                <Select value={selectedMetric} label="Metric" onChange={e => { setSelectedMetric(e.target.value); }}>
                  {METRIC_CHOICES.map(m => <MenuItem key={m} value={m}>{m.replace(/_/g, ' ')}</MenuItem>)}
                </Select>
              </FormControl>
              <Button size="small" variant="outlined" startIcon={<RefreshIcon />} onClick={refreshMetrics}>Load</Button>
            </Stack>
          }
        />
        <CardContent>
          {metricPoints.length === 0 ? (
            <Box textAlign="center" py={4}>
              <InsightsIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
              <Typography color="text.secondary">Select a metric and click Load to view time-series data.</Typography>
            </Box>
          ) : (
            <Box>
              <Typography variant="caption" color="text.secondary" mb={1} display="block">
                {metricPoints.length} data points · {selectedMetric.replace(/_/g, ' ')} · last {timeRange}
              </Typography>
              <Box sx={{ overflowX: 'auto' }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: 120, minWidth: 600, p: 1 }}>
                  {metricPoints.map((pt, i) => {
                    const maxVal = Math.max(...metricPoints.map(p => p.value));
                    const pct = maxVal > 0 ? (pt.value / maxVal) * 100 : 0;
                    const color = pct > 80 ? '#f44336' : pct > 60 ? '#ff9800' : '#153d75';
                    return (
                      <Tooltip key={i} title={`${pt.value}${pt.unit} @ ${new Date(pt.timestamp).toLocaleTimeString()}`}>
                        <Box sx={{
                          flex: 1, minWidth: 4, maxWidth: 12,
                          height: `${Math.max(4, pct)}%`,
                          bgcolor: color, borderRadius: '2px 2px 0 0',
                          transition: 'height 0.2s', cursor: 'crosshair',
                        }} />
                      </Tooltip>
                    );
                  })}
                </Box>
              </Box>
              <Stack direction="row" justifyContent="space-between" mt={1}>
                <Typography variant="caption" color="text.secondary">Min: {Math.min(...metricPoints.map(p => p.value)).toFixed(1)}{metricPoints[0]?.unit}</Typography>
                <Typography variant="caption" color="text.secondary">Avg: {(metricPoints.reduce((a, p) => a + p.value, 0) / metricPoints.length).toFixed(1)}{metricPoints[0]?.unit}</Typography>
                <Typography variant="caption" color="text.secondary">Max: {Math.max(...metricPoints.map(p => p.value)).toFixed(1)}{metricPoints[0]?.unit}</Typography>
              </Stack>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Logs */}
      <Card>
        <CardHeader
          title="Log Stream"
          titleTypographyProps={{ variant: 'h6', fontWeight: 700 }}
          subheader="Platform-wide structured log tail — last hour"
          action={
            <Stack direction="row" spacing={1} alignItems="center">
              <FormControl size="small" sx={{ minWidth: 130 }}>
                <InputLabel>Service</InputLabel>
                <Select value={logService} label="Service" onChange={e => setLogService(e.target.value)}>
                  <MenuItem value="">All Services</MenuItem>
                  {LOG_SERVICES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </Select>
              </FormControl>
              <Button size="small" variant="outlined" startIcon={<RefreshIcon />} onClick={refreshLogs}>Refresh</Button>
            </Stack>
          }
        />
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ p: 2, borderBottom: `1px solid ${t.border}` }}>
            <input
              type="text" placeholder="Search logs…"
              value={logSearch}
              onChange={e => setLogSearch(e.target.value)}
              style={{
                width: '100%', background: 'var(--dashboard-surface-subtle)', border: `1px solid var(--dashboard-border)`,
                color: 'var(--dashboard-text-primary)', padding: '6px 12px', borderRadius: 4,
                fontSize: 13, fontFamily: 'monospace', outline: 'none',
              }}
            />
          </Box>
          <Box sx={{ maxHeight: 480, overflowY: 'auto' }}>
            {filteredLogs.length === 0 ? (
              <Box p={4} textAlign="center">
                <Typography color="text.secondary">No logs matching your filters. Click Refresh to reload.</Typography>
              </Box>
            ) : filteredLogs.map((ln, i) => (
              <Stack key={i} direction="row" spacing={2} alignItems="flex-start" sx={{ p: 1, borderBottom: `1px solid ${t.border}`, '&:hover': { bgcolor: t.surfaceHover } }}>
                <Typography variant="caption" color="text.secondary" sx={{ minWidth: 80, fontFamily: 'monospace', pt: 0.15 }}>
                  {new Date(ln.timestamp).toLocaleTimeString()}
                </Typography>
                <Chip
                  label={ln.level}
                  size="small"
                  sx={{ minWidth: 52, fontFamily: 'monospace', fontWeight: 700, fontSize: '0.65rem',
                         bgcolor: `${LOG_LEVEL_COLOR[ln.level] ?? '#9e9e9e'}22`,
                         color: LOG_LEVEL_COLOR[ln.level] ?? '#9e9e9e' }}
                />
                <Typography variant="caption" sx={{ minWidth: 90, color: 'primary.main', fontFamily: 'monospace' }}>{ln.service}</Typography>
                <Typography variant="caption" sx={{ flex: 1, fontFamily: 'monospace', color: ln.level === 'ERROR' ? '#ff6b6b' : ln.level === 'WARN' ? '#ffa726' : t.textPrimary }}>
                  {ln.message}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ minWidth: 80, fontFamily: 'monospace' }}>{ln.pod}</Typography>
              </Stack>
            ))}
          </Box>
          <Box sx={{ p: 1, borderTop: `1px solid ${t.border}`, bgcolor: t.surfaceSubtle }}>
            <Typography variant="caption" color="text.secondary">
              {filteredLogs.length} lines · {logService || 'all services'} · last 1h
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Stack>
  );

  // ── Tab: Webhooks ──────────────────────────────────────────────────────────
  const renderWebhooks = () => (
    <Stack spacing={3}>
      <Card>
        <CardHeader
          title="Webhook Delivery Health"
          titleTypographyProps={{ variant: 'h6', fontWeight: 700 }}
          subheader={`${webhooks.length} endpoints · last ${timeRange}`}
        />
        <CardContent sx={{ p: 0 }}>
          {webhooks.length === 0 ? (
            <Box p={4} textAlign="center">
              <Typography color="text.secondary">No webhook data. Click Refresh to load.</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Endpoint</TableCell>
                    <TableCell>Project</TableCell>
                    <TableCell>Events</TableCell>
                    <TableCell align="right">Deliveries (24h)</TableCell>
                    <TableCell align="right">Success Rate</TableCell>
                    <TableCell align="right">Avg Latency</TableCell>
                    <TableCell>Last Triggered</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {webhooks.map(wh => (
                    <TableRow key={wh.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace" fontSize=".78rem"
                          sx={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {wh.endpoint}
                        </Typography>
                      </TableCell>
                      <TableCell><Typography variant="body2">{wh.project_name}</Typography></TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                          {wh.events.slice(0, 3).map(ev => (
                            <Chip key={ev} label={ev} size="small" variant="outlined" sx={{ fontSize: '.68rem' }} />
                          ))}
                          {wh.events.length > 3 && <Chip label={`+${wh.events.length - 3}`} size="small" />}
                        </Stack>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">{wh.total_24h}</Typography>
                        <Typography variant="caption" color="error.main">{wh.failed_24h} failed</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={700}
                          color={wh.success_rate >= 95 ? 'success.main' : wh.success_rate >= 80 ? 'warning.main' : 'error.main'}>
                          {wh.success_rate.toFixed(1)}%
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">{wh.avg_latency_ms}ms</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {wh.last_triggered ? timeAgo(wh.last_triggered) : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={wh.status} size="small"
                          color={wh.status === 'active' ? 'success' : wh.status === 'failing' ? 'error' : 'default'} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Stack>
  );

  // ── Tab: Workspace ────────────────────────────────────────────────────────
  const renderWorkspace = () => (
    <Stack spacing={3}>
      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
        <StatCard title="Workspaces" value={workspaces.length} />
        <StatCard title="Running" value={workspaces.filter(w => w.status === 'running').length} color="success" />
        <StatCard title="Stopped" value={workspaces.filter(w => w.status === 'stopped').length} />
        <StatCard title="Error" value={workspaces.filter(w => w.status === 'error').length} color="error" />
      </Stack>
      <Card>
        <CardHeader
          title="Dev Workspace Status"
          titleTypographyProps={{ variant: 'h6', fontWeight: 700 }}
          subheader={`${workspaces.filter(w => w.status === 'running').length} active of ${workspaces.length} total`}
        />
        <CardContent sx={{ p: 0 }}>
          {workspaces.length === 0 ? (
            <Box p={4} textAlign="center">
              <Typography color="text.secondary">No workspace data. Click Refresh to load.</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>User</TableCell>
                    <TableCell>Project</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">CPU</TableCell>
                    <TableCell align="right">Memory</TableCell>
                    <TableCell>Uptime</TableCell>
                    <TableCell>Last Active</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {workspaces.map(ws => (
                    <TableRow key={ws.id} hover>
                      <TableCell><Typography variant="body2" fontWeight={600}>{ws.name}</Typography></TableCell>
                      <TableCell><Typography variant="body2">{ws.user}</Typography></TableCell>
                      <TableCell><Chip label={ws.project} size="small" variant="outlined" /></TableCell>
                      <TableCell>
                        <Chip label={ws.status} size="small"
                          color={ws.status === 'running' ? 'success' : ws.status === 'error' ? 'error' : 'default'} />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={700}
                          color={ws.cpu_pct > 80 ? 'error.main' : ws.cpu_pct > 60 ? 'warning.main' : 'text.primary'}>
                          {ws.cpu_pct.toFixed(1)}%
                        </Typography>
                        <LinearProgress variant="determinate" value={Math.min(ws.cpu_pct, 100)}
                          color={ws.cpu_pct > 80 ? 'error' : ws.cpu_pct > 60 ? 'warning' : 'success'}
                          sx={{ height: 4, mt: 0.5, borderRadius: 2 }} />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={700}
                          color={ws.memory_pct > 80 ? 'error.main' : ws.memory_pct > 60 ? 'warning.main' : 'text.primary'}>
                          {ws.memory_pct.toFixed(1)}%
                        </Typography>
                        <LinearProgress variant="determinate" value={Math.min(ws.memory_pct, 100)}
                          color={ws.memory_pct > 80 ? 'error' : ws.memory_pct > 60 ? 'warning' : 'success'}
                          sx={{ height: 4, mt: 0.5, borderRadius: 2 }} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {ws.uptime_minutes < 60
                            ? `${ws.uptime_minutes}m`
                            : `${Math.floor(ws.uptime_minutes / 60)}h ${ws.uptime_minutes % 60}m`}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">{timeAgo(ws.last_active)}</Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Stack>
  );

  // ── Tab: IaC ──────────────────────────────────────────────────────────────
  const renderIaC = () => (
    <Stack spacing={3}>
      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
        <StatCard title="Templates" value={iacTemplates.length} />
        <StatCard title="Applied" value={iacTemplates.filter(i => i.status === 'applied').length} color="success" />
        <StatCard title="Drifted" value={iacTemplates.filter(i => i.drift_detected).length} color="warning" />
        <StatCard title="Errors" value={iacTemplates.filter(i => i.status === 'error').length} color="error" />
      </Stack>
      <Card>
        <CardHeader
          title="Infra as Code Templates"
          titleTypographyProps={{ variant: 'h6', fontWeight: 700 }}
          subheader={`${iacTemplates.length} templates tracked`}
        />
        <CardContent sx={{ p: 0 }}>
          {iacTemplates.length === 0 ? (
            <Box p={4} textAlign="center">
              <Typography color="text.secondary">No IaC data. Click Refresh to load.</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Provider</TableCell>
                    <TableCell>Environment</TableCell>
                    <TableCell align="right">Resources</TableCell>
                    <TableCell>Drift</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Last Applied</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {iacTemplates.map(tmpl => (
                    <TableRow key={tmpl.id} hover>
                      <TableCell><Typography variant="body2" fontWeight={600}>{tmpl.name}</Typography></TableCell>
                      <TableCell><Chip label={tmpl.provider} size="small" variant="outlined" /></TableCell>
                      <TableCell><Chip label={tmpl.environment} size="small" variant="outlined" /></TableCell>
                      <TableCell align="right"><Typography variant="body2">{tmpl.resource_count}</Typography></TableCell>
                      <TableCell>
                        {tmpl.drift_detected
                          ? <Chip label="DRIFT" color="warning" size="small" icon={<WarningIcon />} />
                          : <Chip label="clean" color="success" size="small" icon={<CheckCircleIcon />} />}
                      </TableCell>
                      <TableCell>
                        <Chip label={tmpl.status} size="small"
                          color={tmpl.status === 'applied' ? 'success' : tmpl.status === 'error' ? 'error' : tmpl.status === 'drifted' ? 'warning' : 'default'} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {tmpl.last_applied ? timeAgo(tmpl.last_applied) : '—'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Stack>
  );

  // ── Tab: Environments ────────────────────────────────────────────────────
  const renderEnvironments = () => (
    <Stack spacing={3}>
      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
        <StatCard title="Environments" value={environments.length} />
        <StatCard title="Healthy" value={environments.filter(e => e.status === 'healthy').length} color="success" />
        <StatCard title="Drifted" value={environments.filter(e => e.status === 'drift').length} color="warning" />
        <StatCard title="Offline" value={environments.filter(e => e.status === 'offline').length} color="error" />
      </Stack>
      <Card>
        <CardHeader
          title="Environment Status"
          titleTypographyProps={{ variant: 'h6', fontWeight: 700 }}
          subheader={`${environments.length} environments configured`}
        />
        <CardContent sx={{ p: 0 }}>
          {environments.length === 0 ? (
            <Box p={4} textAlign="center">
              <Typography color="text.secondary">No environment data. Click Refresh to load.</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Services</TableCell>
                    <TableCell align="right">Config Vars</TableCell>
                    <TableCell align="right">Secrets</TableCell>
                    <TableCell>Sync</TableCell>
                    <TableCell>Last Sync</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {environments.map(env => (
                    <TableRow key={env.id} hover>
                      <TableCell><Typography variant="body2" fontWeight={600}>{env.name}</Typography></TableCell>
                      <TableCell>
                        <Chip label={env.type} size="small" variant="outlined"
                          color={env.type === 'production' ? 'error' : env.type === 'staging' ? 'warning' : 'default'} />
                      </TableCell>
                      <TableCell>
                        <Chip label={env.status} size="small"
                          color={env.status === 'healthy' ? 'success' : env.status === 'drift' ? 'warning' : env.status === 'offline' ? 'error' : 'default'} />
                      </TableCell>
                      <TableCell align="right"><Typography variant="body2">{env.service_count}</Typography></TableCell>
                      <TableCell align="right"><Typography variant="body2">{env.config_vars}</Typography></TableCell>
                      <TableCell align="right"><Typography variant="body2">{env.secrets}</Typography></TableCell>
                      <TableCell>
                        <Chip label={env.sync_status} size="small"
                          color={env.sync_status === 'success' ? 'success' : env.sync_status === 'failed' ? 'error' : 'default'} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {env.last_sync ? timeAgo(env.last_sync) : '—'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Stack>
  );

  // ── Tab: Operational ─────────────────────────────────────────────────────
  const renderOperational = () => {
    const categories = Array.from(new Set(operationalComponents.map(c => c.category)));
    return (
      <Stack spacing={3}>
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
          <StatCard title="Components" value={operationalComponents.length} />
          <StatCard title="Operational" value={operationalComponents.filter(c => c.status === 'operational').length} color="success" />
          <StatCard title="Degraded" value={operationalComponents.filter(c => c.status === 'degraded').length} color="warning" />
          <StatCard title="Outage" value={operationalComponents.filter(c => c.status === 'major_outage').length} color="error" />
        </Stack>
        {operationalComponents.length === 0 ? (
          <Card>
            <CardContent>
              <Box textAlign="center" py={3}>
                <Typography color="text.secondary">No operational data. Click Refresh to load.</Typography>
              </Box>
            </CardContent>
          </Card>
        ) : categories.map(cat => (
          <Card key={cat}>
            <CardHeader title={cat} titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700 }} />
            <CardContent sx={{ p: 0 }}>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Component</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">30d Uptime</TableCell>
                      <TableCell align="right">Response Time</TableCell>
                      <TableCell>Last Incident</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {operationalComponents.filter(c => c.category === cat).map(comp => (
                      <TableRow key={comp.id} hover>
                        <TableCell><Typography variant="body2" fontWeight={600}>{comp.component}</Typography></TableCell>
                        <TableCell>
                          <Chip label={comp.status.replace('_', ' ')} size="small"
                            color={comp.status === 'operational' ? 'success' : comp.status === 'degraded' ? 'warning' : comp.status === 'major_outage' ? 'error' : 'default'} />
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight={700}
                            color={comp.uptime_30d >= 99.9 ? 'success.main' : comp.uptime_30d >= 99 ? 'warning.main' : 'error.main'}>
                            {comp.uptime_30d.toFixed(2)}%
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">{comp.response_time_ms}ms</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {comp.last_incident ? timeAgo(comp.last_incident) : 'None'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        ))}
      </Stack>
    );
  };

  const tabContent = [
    renderOverview,
    renderPipelines,
    renderDeployments,
    renderProjects,
    renderServices,
    renderActivity,
    renderAlerts,
    renderResources,
    renderContainers,
    renderKubernetes,
    renderLogsAndMetrics,
    renderWebhooks,
    renderWorkspace,
    renderIaC,
    renderEnvironments,
    renderOperational,
  ];

  // ── Sidebar nav item ──────────────────────────────────────────────────────────
  const SideNavItem = ({
    index, label, icon, badge,
  }: { index: number; label: string; icon: React.ReactNode; badge?: number }) => {
    const active = tab === index;
    return (
      <Box
        onClick={() => setTab(index)}
        sx={{
          display: 'flex', alignItems: 'center', gap: 1.25,
          px: 2, py: 1.1, mx: 1, borderRadius: '8px', cursor: 'pointer',
          bgcolor: active ? 'rgba(33,150,243,.15)' : 'transparent',
          color: active ? 'primary.main' : t.textSecondary,
          fontWeight: active ? 700 : 500,
          fontSize: '0.82rem',
          transition: 'all .15s',
          userSelect: 'none',
          '&:hover': {
            bgcolor: active ? 'rgba(33,150,243,.15)' : t.surfaceHover,
            color: active ? 'primary.main' : t.textPrimary,
          },
          borderLeft: active ? '3px solid #2196f3' : '3px solid transparent',
          position: 'relative',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', color: active ? '#2196f3' : 'inherit', fontSize: 'inherit' }}>
          {icon}
        </Box>
        <Typography sx={{ fontSize: '0.82rem', fontWeight: 'inherit', color: 'inherit', flex: 1 }}>
          {label}
        </Typography>
        {badge != null && badge > 0 && (
          <Box sx={{
            bgcolor: active ? '#2196f3' : '#d32f2f', color: '#fff',
            borderRadius: '10px', minWidth: 18, height: 18, px: 0.5,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.65rem', fontWeight: 800,
          }}>
            {badge}
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden', bgcolor: t.background }}>

      {/* ── Left sidebar ──────────────────────────────────────────────────── */}
      <Box sx={{
        width: 220, flexShrink: 0,
        display: 'flex', flexDirection: 'column',
        bgcolor: t.surface,
        borderRight: `1px solid ${t.border}`,
        overflow: 'hidden',
      }}>
        {/* Branding */}
        <Box sx={{ px: 2.5, pt: 2.5, pb: 2, borderBottom: `1px solid ${t.border}` }}>
          <Stack direction="row" alignItems="center" spacing={1} mb={0.25}>
            <Box sx={{
              width: 28, height: 28, borderRadius: '7px',
              bgcolor: 'rgba(33,150,243,.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <HubIcon sx={{ fontSize: '0.95rem', color: '#2196f3' }} />
            </Box>
            <Typography sx={{ fontWeight: 800, fontSize: '0.9rem', color: t.textPrimary, letterSpacing: '-.01em' }}>
              Developer Monitor
            </Typography>
          </Stack>
          <Typography sx={{ fontSize: '0.7rem', color: t.textSecondary, mt: 0.4 }}>
            Updated {lastRefresh.toLocaleTimeString()}
          </Typography>
        </Box>

        {/* Back to Monitoring */}
        <Box
          onClick={() => navigate('/monitor-dashboard/dashboards')}
          sx={{
            display: 'flex', alignItems: 'center', gap: 0.75,
            px: 2, py: 1.25, cursor: 'pointer',
            borderBottom: `1px solid ${t.border}`,
            color: t.textSecondary,
            '&:hover': { bgcolor: t.surfaceHover, color: t.textPrimary },
            transition: 'all .15s',
          }}
        >
          <ArrowBackIcon sx={{ fontSize: '0.85rem' }} />
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 600 }}>Back to Monitoring</Typography>
        </Box>

        {/* Status badges */}
        {(criticalAlerts > 0 || openIncidents > 0) && (
          <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${t.border}` }}>
            <Stack spacing={0.75}>
              {criticalAlerts > 0 && (
                <Box
                  onClick={() => setTab(6)}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 0.75,
                    px: 1.25, py: 0.6, borderRadius: '6px',
                    bgcolor: 'rgba(211,47,47,.15)', cursor: 'pointer',
                    border: '1px solid rgba(211,47,47,.3)',
                    '&:hover': { bgcolor: 'rgba(211,47,47,.22)' },
                  }}
                >
                  <ErrorIcon sx={{ fontSize: '0.8rem', color: '#f44336' }} />
                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#f44336' }}>
                    {criticalAlerts} critical alert{criticalAlerts > 1 ? 's' : ''}
                  </Typography>
                </Box>
              )}
              {openIncidents > 0 && (
                <Box
                  onClick={() => setTab(6)}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 0.75,
                    px: 1.25, py: 0.6, borderRadius: '6px',
                    bgcolor: 'rgba(237,108,2,.15)', cursor: 'pointer',
                    border: '1px solid rgba(237,108,2,.3)',
                    '&:hover': { bgcolor: 'rgba(237,108,2,.22)' },
                  }}
                >
                  <WarningIcon sx={{ fontSize: '0.8rem', color: '#ff9800' }} />
                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#ff9800' }}>
                    {openIncidents} open incident{openIncidents > 1 ? 's' : ''}
                  </Typography>
                </Box>
              )}
            </Stack>
          </Box>
        )}

        {/* Nav items — scrollable */}
        <Box sx={{ flex: 1, overflowY: 'auto', py: 1.25,
          '&::-webkit-scrollbar': { width: 4 },
          '&::-webkit-scrollbar-thumb': { bgcolor: t.border, borderRadius: 2 },
        }}>
          <Typography sx={{ px: 2.5, pb: 0.75, fontSize: '0.65rem', fontWeight: 700, color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.1em' }}>
            Views
          </Typography>
          {TAB_LABELS.map((t, i) => (
            <SideNavItem
              key={t.label}
              index={i}
              label={t.label}
              icon={t.icon}
              badge={i === 6 ? criticalAlerts : undefined}
            />
          ))}
        </Box>

        {/* Bottom controls */}
        <Box sx={{ px: 2, py: 1.5, borderTop: `1px solid ${t.border}` }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <FormControl size="small" sx={{ flex: 1,
              '& .MuiOutlinedInput-root': { bgcolor: t.surfaceSubtle, color: t.textPrimary, fontSize: '0.78rem' },
              '& fieldset': { borderColor: t.border },
            }}>
              <Select value={timeRange} onChange={e => setTimeRange(e.target.value as TimeRange)}>
                {(['1h', '6h', '24h', '7d', '30d'] as TimeRange[]).map(tr => (
                  <MenuItem key={tr} value={tr} sx={{ fontSize: '0.8rem' }}>{tr}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Tooltip title="Refresh">
              <IconButton onClick={refresh} disabled={loading} size="small" sx={{ color: t.textSecondary, '&:hover': { color: t.textPrimary } }}>
                {loading ? <CircularProgress size={16} sx={{ color: '#2196f3' }} /> : <RefreshIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>
      </Box>

      {/* ── Main content area ─────────────────────────────────────────────── */}
      <Box sx={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column',
        '&::-webkit-scrollbar': { width: 6 },
        '&::-webkit-scrollbar-thumb': { bgcolor: t.border, borderRadius: 3 },
      }}>
        {/* Content header bar */}
        <Box sx={{
          px: 3, py: 1.75,
          borderBottom: `1px solid ${t.border}`,
          bgcolor: t.surface,
          position: 'sticky', top: 0, zIndex: 10,
          backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ color: '#2196f3', display: 'flex', alignItems: 'center' }}>
              {TAB_LABELS[tab].icon}
            </Box>
            <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: t.textPrimary }}>
              {TAB_LABELS[tab].label}
            </Typography>
          </Stack>
          {loading && <LinearProgress sx={{ width: 80, borderRadius: 1 }} />}
        </Box>

        {/* Tab content */}
        <Box sx={{ p: 3, flex: 1 }}>
          {tabContent[tab]()}
        </Box>
      </Box>
    </Box>
  );
};

export default DevMonitoringPage;
