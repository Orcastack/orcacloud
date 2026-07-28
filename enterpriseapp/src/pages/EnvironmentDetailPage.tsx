/**
 * EnvironmentDetailPage
 * Full-screen sidebar dashboard — mirrors ProjectDashboardPage / WorkspaceDashboardPage
 *
 * Sidebar sections:
 *   Overview · Deployments · Services · Config · Secrets ·
 *   Logs · Metrics · Governance · Audit Log · Pipelines · Releases · Settings
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress,
  Dialog, DialogActions, DialogContent, DialogTitle, Divider,
  FormControl, FormControlLabel, IconButton, InputLabel, LinearProgress,
  MenuItem, Select, Snackbar, Stack, Switch, TextField, Tooltip, Typography,
} from '@mui/material';

// Icons
import ArrowBackIcon       from '@mui/icons-material/ArrowBack';
import DashboardIcon       from '@mui/icons-material/Dashboard';
import RocketLaunchIcon    from '@mui/icons-material/RocketLaunch';
import DevicesIcon         from '@mui/icons-material/Devices';
import TuneIcon            from '@mui/icons-material/Tune';
import LockIcon            from '@mui/icons-material/Lock';
import ArticleIcon         from '@mui/icons-material/Article';
import BarChartIcon        from '@mui/icons-material/BarChart';
import ShieldIcon          from '@mui/icons-material/Shield';
import ManageHistoryIcon   from '@mui/icons-material/ManageHistory';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import LayersIcon          from '@mui/icons-material/Layers';
import SettingsIcon        from '@mui/icons-material/Settings';
import LockOpenIcon        from '@mui/icons-material/LockOpen';
import RefreshIcon         from '@mui/icons-material/Refresh';
import CheckCircleIcon     from '@mui/icons-material/CheckCircle';
import ErrorIcon           from '@mui/icons-material/Error';
import WarningAmberIcon    from '@mui/icons-material/WarningAmber';
import ReplayIcon          from '@mui/icons-material/Replay';
import RestartAltIcon      from '@mui/icons-material/RestartAlt';
import AddIcon             from '@mui/icons-material/Add';
import AccessTimeIcon      from '@mui/icons-material/AccessTime';
import VisibilityIcon      from '@mui/icons-material/Visibility';
import VisibilityOffIcon   from '@mui/icons-material/VisibilityOff';
import DeleteOutlineIcon   from '@mui/icons-material/DeleteOutline';
import SaveIcon            from '@mui/icons-material/Save';
import FolderOpenIcon     from '@mui/icons-material/FolderOpen';
import SyncIcon           from '@mui/icons-material/Sync';

import { useNavigate, useParams } from 'react-router-dom';
import { dashboardTokens, dashboardSemanticColors } from '../styles/dashboardDesignSystem';
import apiClient from '../services/apiClient';
import {
  getEnvironment, updateEnvironment, deleteEnvironment,
  getEnvHealth, getEnvDeployments, rollbackDeployment, promoteEnvironment,
  getEnvServices, restartService, scaleService,
  getEnvVars, getFeatureFlags, getAuditLog,
  getEnvPipelineRuns, getEnvReleases,
  getEnvFiles, triggerDiscovery,
  createEnvVar, deleteEnvVar, createFeatureFlag, updateFeatureFlag,
  type ApiEnvironment, type DeploymentStrategy,
  type EnvHealth, type EnvDeployment, type EnvService,
  type EnvVar, type FeatureFlag, type AuditEntry,
  type EnvPipelineRun, type EnvRelease,
  type EnvFile,
} from '../services/environmentsApi';

const FONT = dashboardTokens.typography.fontFamily;
const t    = dashboardTokens.colors;
const sc   = dashboardSemanticColors;

// ─── Sidebar section type ─────────────────────────────────────────────────────

type Section =
  | 'overview' | 'deployments' | 'services' | 'files' | 'config' | 'secrets'
  | 'logs' | 'metrics' | 'governance' | 'audit' | 'pipelines'
  | 'releases' | 'settings';

interface SideItem {
  id: Section;
  label: string;
  icon: React.ReactNode;
  dividerBefore?: boolean;
}

const SIDEBAR: SideItem[] = [
  { id: 'overview',    label: 'Overview',        icon: <DashboardIcon        sx={{ fontSize: '1.05rem' }} /> },
  { id: 'deployments', label: 'Deployments',     icon: <RocketLaunchIcon     sx={{ fontSize: '1.05rem' }} /> },
  { id: 'services',    label: 'Services',         icon: <DevicesIcon          sx={{ fontSize: '1.05rem' }} /> },
  { id: 'files',       label: 'Config Files',     icon: <FolderOpenIcon       sx={{ fontSize: '1.05rem' }} /> },
  { id: 'config',      label: 'Config',           icon: <TuneIcon             sx={{ fontSize: '1.05rem' }} /> },
  { id: 'secrets',     label: 'Secrets',          icon: <LockIcon             sx={{ fontSize: '1.05rem' }} /> },
  { id: 'logs',        label: 'Logs',             icon: <ArticleIcon          sx={{ fontSize: '1.05rem' }} />, dividerBefore: true },
  { id: 'metrics',     label: 'Metrics',          icon: <BarChartIcon         sx={{ fontSize: '1.05rem' }} /> },
  { id: 'pipelines',   label: 'Pipelines',        icon: <PlayCircleOutlineIcon sx={{ fontSize: '1.05rem' }} /> },
  { id: 'releases',    label: 'Releases',         icon: <LayersIcon           sx={{ fontSize: '1.05rem' }} /> },
  { id: 'governance',  label: 'Governance',       icon: <ShieldIcon           sx={{ fontSize: '1.05rem' }} />, dividerBefore: true },
  { id: 'audit',       label: 'Audit Log',        icon: <ManageHistoryIcon    sx={{ fontSize: '1.05rem' }} /> },
  { id: 'settings',    label: 'Settings',         icon: <SettingsIcon         sx={{ fontSize: '1.05rem' }} />, dividerBefore: true },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso?: string | null) {
  if (!iso) return '—';
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60)    return `${Math.round(s)}s ago`;
  if (s < 3600)  return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}
function fmtDate(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function stageOf(name: string): 'dev' | 'stage' | 'prod' {
  const l = name.toLowerCase();
  if (l.includes('prod')) return 'prod';
  if (l.includes('stage') || l.includes('stg')) return 'stage';
  return 'dev';
}
const STAGE_CFG = {
  dev:   { label: 'Development', bg: 'rgba(21,61,117,.12)',  border: '#153d75', text: '#153d75' },
  stage: { label: 'Staging',     bg: 'rgba(245,158,11,.12)', border: '#F59E0B', text: '#F59E0B' },
  prod:  { label: 'Production',  bg: 'rgba(34,197,94,.12)',  border: sc.success, text: sc.success },
};
const HC = {
  healthy:  { color: sc.success, icon: <CheckCircleIcon  sx={{ fontSize: 15 }} />, label: 'Healthy'  },
  degraded: { color: '#F59E0B',  icon: <WarningAmberIcon sx={{ fontSize: 15 }} />, label: 'Degraded' },
  critical: { color: sc.danger,  icon: <ErrorIcon        sx={{ fontSize: 15 }} />, label: 'Critical' },
};
const DC: Record<string, string> = { success: sc.success, failed: sc.danger, running: sc.info, pending: '#F59E0B', rolled_back: '#8B5CF6' };
const SVC_C: Record<string, string> = { running: sc.success, stopped: sc.danger, error: sc.danger, scaling: '#F59E0B' };
const PC: Record<string, string> = { success: sc.success, failed: sc.danger, running: sc.info, pending: '#F59E0B', cancelled: '#6B7280' };

// ─── Shared mini-components ───────────────────────────────────────────────────

const SectionHead: React.FC<{ title: string; sub?: string; action?: React.ReactNode }> = ({ title, sub, action }) => (
  <Stack direction="row" alignItems="flex-start" justifyContent="space-between" sx={{ mb: 2.5 }}>
    <Box>
      <Typography sx={{ fontFamily: FONT, fontWeight: 800, fontSize: '1.05rem', color: t.textPrimary }}>{title}</Typography>
      {sub && <Typography sx={{ fontFamily: FONT, fontSize: '.78rem', color: t.textSecondary, mt: .3 }}>{sub}</Typography>}
    </Box>
    {action}
  </Stack>
);

const StatCard: React.FC<{ label: string; value: React.ReactNode; sub?: string; accent?: string }> = ({ label, value, sub, accent }) => (
  <Box sx={{ flex: '1 1 130px', minWidth: 120, bgcolor: t.surface, border: `1px solid ${t.border}`, borderRadius: '8px', p: '12px 14px' }}>
    <Typography sx={{ fontFamily: FONT, fontSize: '.7rem', color: t.textSecondary, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.06em', mb: .6 }}>{label}</Typography>
    <Typography sx={{ fontFamily: FONT, fontSize: '1.4rem', fontWeight: 800, color: accent ?? t.textPrimary, lineHeight: 1 }}>{value}</Typography>
    {sub && <Typography sx={{ fontFamily: FONT, fontSize: '.7rem', color: t.textTertiary, mt: .4 }}>{sub}</Typography>}
  </Box>
);

const GaugeBar: React.FC<{ label: string; pct: number }> = ({ label, pct }) => {
  const color = pct >= 90 ? sc.danger : pct >= 70 ? '#F59E0B' : sc.success;
  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" sx={{ mb: .3 }}>
        <Typography sx={{ fontFamily: FONT, fontSize: '.77rem', color: t.textSecondary }}>{label}</Typography>
        <Typography sx={{ fontFamily: FONT, fontSize: '.77rem', fontWeight: 700, color }}>{pct}%</Typography>
      </Stack>
      <LinearProgress variant="determinate" value={pct} sx={{ height: 5, borderRadius: 99, bgcolor: 'rgba(255,255,255,.06)', '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 99 } }} />
    </Box>
  );
};

const cellSx = { fontFamily: FONT, fontSize: '.79rem', color: t.textSecondary, borderColor: t.border, py: '7px', px: '10px' };
const headCellSx = { ...cellSx, fontWeight: 600, color: t.textSecondary, fontSize: '.72rem', textTransform: 'uppercase' as const, letterSpacing: '.04em' };

function TableWrap({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <Box sx={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {headers.map(h => (
              <th key={h} style={{ textAlign: 'left', padding: '8px 10px', borderBottom: `1px solid ${t.border}`, ...headCellSx as any }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </Box>
  );
}
function TR({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <tr onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.03)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; }}
    >{children}</tr>
  );
}
function TD({ children, bold, accent }: { children: React.ReactNode; bold?: boolean; accent?: string }) {
  return (
    <td style={{ padding: '7px 10px', borderBottom: `1px solid ${t.border}`, fontFamily: FONT,
      fontSize: '.79rem', color: accent ?? t.textSecondary, fontWeight: bold ? 700 : 400 }}>
      {children}
    </td>
  );
}

function StatusChip({ label, color }: { label: string; color: string }) {
  return (
    <span style={{ background: `${color}22`, color, fontFamily: FONT, fontWeight: 700,
      fontSize: '.7rem', padding: '2px 8px', borderRadius: '99px', whiteSpace: 'nowrap' }}>
      {label}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION PANELS
// ═══════════════════════════════════════════════════════════════════════════════

// ── Overview ──────────────────────────────────────────────────────────────────
const OverviewPanel: React.FC<{ envId: string; env: ApiEnvironment }> = ({ envId, env }) => {
  const [health, setHealth] = useState<EnvHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(() => { setLoading(true); getEnvHealth(envId).then(h => { setHealth(h); setLoading(false); }); }, [envId]);
  useEffect(() => { load(); }, [load]);

  const stage = stageOf(env.name);
  const sc2   = STAGE_CFG[stage];
  const NOTES: Record<string, string> = {
    dev:   'Auto-deploy enabled · Fast iteration · Flexible rules',
    stage: 'Manual approval required · Stable baseline · Integration testing',
    prod:  'Fully protected · Heavy monitoring · Admin-only changes',
  };

  return (
    <Box>
      <SectionHead title="Environment Overview" sub="Real-time health, resource usage, and status at a glance."
        action={<IconButton size="small" onClick={load} sx={{ color: t.textSecondary }}><RefreshIcon sx={{ fontSize: 16 }} /></IconButton>} />

      {loading ? <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress size={24} sx={{ color: t.brandPrimary }} /></Box> : health && (
        <Stack spacing={2.5}>
          {/* Stage banner */}
          <Box sx={{ bgcolor: sc2.bg, border: `1px solid ${sc2.border}40`, borderRadius: '8px', p: '12px 16px' }}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Chip label={sc2.label} size="small" sx={{ bgcolor: sc2.bg, color: sc2.text, border: `1px solid ${sc2.border}`, fontFamily: FONT, fontWeight: 700, fontSize: '.72rem', height: 20 }} />
              <Typography sx={{ fontFamily: FONT, fontSize: '.8rem', color: t.textSecondary }}>{NOTES[stage]}</Typography>
            </Stack>
          </Box>

          {/* Stat row */}
          <Stack direction="row" flexWrap="wrap" gap={1.5}>
            <StatCard label="Health" value={
              <Stack direction="row" alignItems="center" spacing={.5}>
                {HC[health.status]?.icon}
                <span>{HC[health.status]?.label ?? health.status}</span>
              </Stack>
            } accent={HC[health.status]?.color} />
            <StatCard label="Active Version" value={health.active_version} sub={`Deployed ${timeAgo(health.last_deploy_at)}`} />
            <StatCard label="Services" value={`${health.services_up}/${health.services_total}`} sub="running" accent={health.services_up < health.services_total ? sc.danger : sc.success} />
            <StatCard label="Uptime" value={`${health.uptime_pct}%`} sub="30-day" accent={health.uptime_pct >= 99.9 ? sc.success : '#F59E0B'} />
            <StatCard label="Last Deploy" value={health.last_deploy_ok ? 'Success' : 'Failed'} sub={timeAgo(health.last_deploy_at)} accent={health.last_deploy_ok ? sc.success : sc.danger} />
            <StatCard label="Error Rate" value={`${health.error_rate}/min`} accent={health.error_rate > 5 ? sc.danger : sc.success} />
            <StatCard label="Latency" value={`${health.latency_ms}ms`} accent={health.latency_ms > 500 ? sc.danger : sc.success} />
          </Stack>

          {/* Resource gauges */}
          <Box sx={{ bgcolor: t.surface, border: `1px solid ${t.border}`, borderRadius: '8px', p: '16px 18px' }}>
            <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '.8rem', color: t.textPrimary, mb: 1.5 }}>Resource Usage</Typography>
            <Stack spacing={1.4}>
              <GaugeBar label="CPU"    pct={health.cpu_pct} />
              <GaugeBar label="Memory" pct={health.ram_pct} />
              <GaugeBar label="Disk"   pct={health.disk_pct} />
            </Stack>
          </Box>

          {/* Env meta */}
          <Box sx={{ bgcolor: t.surface, border: `1px solid ${t.border}`, borderRadius: '8px', p: '16px 18px' }}>
            <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '.8rem', color: t.textPrimary, mb: 1.2 }}>Environment Details</Typography>
            <Stack spacing={.8}>
              {[
                ['Region',              env.region || '—'],
                ['Deployment Strategy', env.deployment_strategy],
                ['Auto-deploy',         env.auto_deploy ? 'Enabled' : 'Disabled'],
                ['Require Approval',    env.require_approval ? 'Yes' : 'No'],
                ['Protected',           env.is_protected ? 'Yes' : 'No'],
                ['Owner',               env.owner_username || '—'],
                ['Created',             fmtDate(env.created_at)],
              ].map(([k, v]) => (
                <Stack key={k} direction="row" justifyContent="space-between" sx={{ py: .5, borderBottom: `1px solid ${t.border}`, '&:last-child': { borderBottom: 0 } }}>
                  <Typography sx={{ fontFamily: FONT, fontSize: '.8rem', color: t.textSecondary }}>{k}</Typography>
                  <Typography sx={{ fontFamily: FONT, fontSize: '.8rem', fontWeight: 600, color: t.textPrimary }}>{v}</Typography>
                </Stack>
              ))}
            </Stack>
          </Box>
        </Stack>
      )}
    </Box>
  );
};

// ── Deployments ───────────────────────────────────────────────────────────────
const DeploymentsPanel: React.FC<{ envId: string; env: ApiEnvironment }> = ({ envId, env }) => {
  const [deps,    setDeps]    = useState<EnvDeployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy,    setBusy]    = useState<string | null>(null);
  const [promoteOpen, setPromoteOpen] = useState(false);

  const load = useCallback(() => { setLoading(true); getEnvDeployments(envId).then(d => { setDeps(d); setLoading(false); }); }, [envId]);
  useEffect(() => { load(); }, [load]);

  const handleRollback = async (id: string) => {
    setBusy(id); await rollbackDeployment(envId, id); setBusy(null); load();
  };
  const handlePromote = async () => {
    const to = stageOf(env.name) === 'dev' ? 'stage' : 'prod';
    setBusy('promote'); await promoteEnvironment(envId, to); setBusy(null); setPromoteOpen(false);
  };

  const stage = stageOf(env.name);
  const canPromote = stage !== 'prod';
  const promoteTo  = stage === 'dev' ? 'Staging' : 'Production';

  return (
    <Box>
      <SectionHead title="Deployments" sub="Deployment history, rollback, and promotion across stages." />

      {/* Promote card */}
      {canPromote && (
        <Box sx={{ bgcolor: 'rgba(21,61,117,.08)', border: `1px solid ${t.brandPrimary}33`, borderRadius: '8px', p: '14px 18px', mb: 2.5 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" spacing={1}>
            <Box>
              <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '.86rem', color: t.textPrimary }}>Promote to {promoteTo}</Typography>
              <Typography sx={{ fontFamily: FONT, fontSize: '.78rem', color: t.textSecondary }}>
                Push current version forward.{promoteTo === 'Production' ? ' Requires admin approval.' : ''}
              </Typography>
            </Box>
            <Button variant="contained" size="small" disabled={env.is_protected || busy === 'promote'}
              startIcon={<RocketLaunchIcon sx={{ fontSize: 14 }} />}
              onClick={() => setPromoteOpen(true)}
              sx={{ textTransform: 'none', fontFamily: FONT, fontWeight: 700, bgcolor: t.brandPrimary, '&:hover': { bgcolor: t.brandPrimaryHover }, borderRadius: '6px', fontSize: '.79rem' }}
            >
              {busy === 'promote' ? 'Promoting…' : `Promote → ${promoteTo}`}
            </Button>
          </Stack>
        </Box>
      )}

      {loading
        ? <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress size={22} sx={{ color: t.brandPrimary }} /></Box>
        : (
          <Box sx={{ bgcolor: t.surface, border: `1px solid ${t.border}`, borderRadius: '8px', overflow: 'hidden' }}>
            <TableWrap headers={['Version', 'Status', 'Triggered By', 'Started', 'Duration', 'Notes', '']}>
              {deps.map(d => {
                const dur = d.finished_at ? `${Math.round((new Date(d.finished_at).getTime() - new Date(d.started_at).getTime()) / 1000)}s` : '—';
                return (
                  <TR key={d.id}>
                    <TD bold accent={t.textPrimary}>{d.version}</TD>
                    <TD><StatusChip label={d.status} color={DC[d.status] ?? '#6B7280'} /></TD>
                    <TD>{d.triggered_by}</TD>
                    <TD>{timeAgo(d.started_at)}</TD>
                    <TD>{dur}</TD>
                    <TD>{d.notes}</TD>
                    <td style={{ padding: '7px 10px', borderBottom: `1px solid ${t.border}` }}>
                      {d.status === 'success' && (
                        <Tooltip title="Rollback to this version">
                          <IconButton size="small" onClick={() => handleRollback(d.id)} disabled={busy === d.id}>
                            <ReplayIcon sx={{ fontSize: 14, color: t.textSecondary }} />
                          </IconButton>
                        </Tooltip>
                      )}
                    </td>
                  </TR>
                );
              })}
            </TableWrap>
          </Box>
        )
      }

      {/* Promote dialog */}
      <Dialog open={promoteOpen} onClose={() => setPromoteOpen(false)}
        PaperProps={{ sx: { bgcolor: t.surface, border: `1px solid ${t.border}`, borderRadius: '10px' } }}>
        <DialogTitle sx={{ fontFamily: FONT, fontWeight: 700, color: t.textPrimary }}>Promote to {promoteTo}?</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontFamily: FONT, color: t.textSecondary, fontSize: '.85rem' }}>
            This will push the current active version to <strong style={{ color: t.textPrimary }}>{promoteTo}</strong>.
            {promoteTo === 'Production' && ' Admin approval required. Compliance checks will run.'}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setPromoteOpen(false)} sx={{ textTransform: 'none', fontFamily: FONT, color: t.textSecondary }}>Cancel</Button>
          <Button variant="contained" onClick={handlePromote} disabled={busy === 'promote'}
            sx={{ textTransform: 'none', fontFamily: FONT, fontWeight: 700, bgcolor: t.brandPrimary, '&:hover': { bgcolor: t.brandPrimaryHover } }}>
            Confirm Promote
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// ── Services ──────────────────────────────────────────────────────────────────
const ServicesPanel: React.FC<{ envId: string }> = ({ envId }) => {
  const [services, setServices]  = useState<EnvService[]>([]);
  const [loading, setLoading]    = useState(true);
  const [busy, setBusy]          = useState<string | null>(null);
  const [scaleTarget, setScaleTgt] = useState<EnvService | null>(null);
  const [scaleVal, setScaleVal]  = useState(1);
  const [logTarget, setLogTgt]   = useState<EnvService | null>(null);

  const load = useCallback(() => { setLoading(true); getEnvServices(envId).then(s => { setServices(s); setLoading(false); }); }, [envId]);
  useEffect(() => { load(); }, [load]);

  const handleRestart = async (svc: EnvService) => { setBusy(svc.id); await restartService(envId, svc.id); setBusy(null); load(); };
  const handleScale   = async () => {
    if (!scaleTarget) return;
    setBusy(scaleTarget.id); await scaleService(envId, scaleTarget.id, scaleVal); setBusy(null); setScaleTgt(null); load();
  };

  return (
    <Box>
      <SectionHead title="Services & Workloads" sub="All running services, replicas, resource usage, endpoints and controls."
        action={<IconButton size="small" onClick={load} sx={{ color: t.textSecondary }}><RefreshIcon sx={{ fontSize: 16 }} /></IconButton>} />

      {loading
        ? <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress size={22} sx={{ color: t.brandPrimary }} /></Box>
        : (
          <Box sx={{ bgcolor: t.surface, border: `1px solid ${t.border}`, borderRadius: '8px', overflow: 'hidden' }}>
            <TableWrap headers={['Service', 'Status', 'Replicas', 'Image', 'CPU', 'RAM', 'Endpoint', 'Actions']}>
              {services.map(svc => (
                <TR key={svc.id}>
                  <TD bold accent={t.textPrimary}>
                    <Stack direction="row" alignItems="center" spacing={.7}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: SVC_C[svc.status] ?? '#6B7280', display: 'inline-block' }} />
                      {svc.name}
                    </Stack>
                  </TD>
                  <TD><StatusChip label={svc.status} color={SVC_C[svc.status] ?? '#6B7280'} /></TD>
                  <td style={{ padding: '7px 10px', borderBottom: `1px solid ${t.border}`, fontFamily: FONT, fontSize: '.79rem',
                    color: svc.replicas < svc.desired ? sc.danger : t.textSecondary }}>
                    {svc.replicas}/{svc.desired}
                  </td>
                  <td style={{ padding: '7px 10px', borderBottom: `1px solid ${t.border}`, fontFamily: 'monospace', fontSize: '.72rem', color: t.textSecondary, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{svc.image}</td>
                  <td style={{ padding: '7px 10px', borderBottom: `1px solid ${t.border}`, fontFamily: FONT, fontSize: '.79rem', color: svc.cpu_pct > 80 ? sc.danger : t.textSecondary }}>{svc.cpu_pct}%</td>
                  <TD>{svc.ram_mb} MB</TD>
                  <td style={{ padding: '7px 10px', borderBottom: `1px solid ${t.border}`, fontFamily: FONT, fontSize: '.74rem', color: t.brandPrimary }}>{svc.endpoints[0] ?? '—'}</td>
                  <td style={{ padding: '7px 10px', borderBottom: `1px solid ${t.border}` }}>
                    <Stack direction="row" spacing={.3}>
                      <Tooltip title="Restart"><IconButton size="small" onClick={() => handleRestart(svc)} disabled={busy === svc.id}><RestartAltIcon sx={{ fontSize: 14, color: t.textSecondary }} /></IconButton></Tooltip>
                      <Tooltip title="Scale"><IconButton size="small" onClick={() => { setScaleTgt(svc); setScaleVal(svc.replicas); }}><AddIcon sx={{ fontSize: 14, color: t.textSecondary }} /></IconButton></Tooltip>
                      <Tooltip title="View logs"><IconButton size="small" onClick={() => setLogTgt(svc)}><AccessTimeIcon sx={{ fontSize: 14, color: t.textSecondary }} /></IconButton></Tooltip>
                    </Stack>
                  </td>
                </TR>
              ))}
            </TableWrap>
          </Box>
        )
      }

      {/* Scale dialog */}
      <Dialog open={!!scaleTarget} onClose={() => setScaleTgt(null)} PaperProps={{ sx: { bgcolor: t.surface, border: `1px solid ${t.border}`, borderRadius: '10px' } }}>
        <DialogTitle sx={{ fontFamily: FONT, fontWeight: 700, color: t.textPrimary }}>Scale {scaleTarget?.name}</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontFamily: FONT, color: t.textSecondary, fontSize: '.84rem', mb: 2 }}>Current: <strong style={{ color: t.textPrimary }}>{scaleTarget?.replicas}</strong> replicas</Typography>
          <TextField label="Desired replicas" type="number" size="small" fullWidth value={scaleVal}
            onChange={e => setScaleVal(Math.max(0, Number(e.target.value)))} inputProps={{ min: 0, max: 20 }} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setScaleTgt(null)} sx={{ textTransform: 'none', fontFamily: FONT, color: t.textSecondary }}>Cancel</Button>
          <Button variant="contained" onClick={handleScale} disabled={busy === scaleTarget?.id}
            sx={{ textTransform: 'none', fontFamily: FONT, fontWeight: 700, bgcolor: t.brandPrimary, '&:hover': { bgcolor: t.brandPrimaryHover } }}>Apply</Button>
        </DialogActions>
      </Dialog>

      {/* Log dialog */}
      <Dialog open={!!logTarget} onClose={() => setLogTgt(null)} maxWidth="md" fullWidth PaperProps={{ sx: { bgcolor: t.surface, border: `1px solid ${t.border}`, borderRadius: '10px' } }}>
        <DialogTitle sx={{ fontFamily: FONT, fontWeight: 700, color: t.textPrimary }}>Logs — {logTarget?.name}</DialogTitle>
        <DialogContent>
          <Box sx={{ bgcolor: '#0d1117', borderRadius: '8px', p: 2, fontFamily: 'monospace', fontSize: '.76rem', minHeight: 180 }}>
            <div style={{ color: '#6B7280' }}>[last entry]</div>
            <div style={{ color: '#c9d1d9' }}>{logTarget?.last_log}</div>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setLogTgt(null)} sx={{ textTransform: 'none', fontFamily: FONT, color: t.textSecondary }}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// ── Config ────────────────────────────────────────────────────────────────────
const ConfigPanel: React.FC<{ envId: string }> = ({ envId }) => {
  const [vars,    setVars]    = useState<EnvVar[]>([]);
  const [flags,   setFlags]   = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [varDlg,  setVarDlg]  = useState(false);
  const [flagDlg, setFlagDlg] = useState(false);
  const [newVar,  setNewVar]  = useState({ key: '', value: '' });
  const [newFlag, setNewFlag] = useState({ key: '', note: '' });
  const [busy,    setBusy]    = useState<string | null>(null);
  const [err,     setErr]     = useState<string | null>(null);

  const reload = () => {
    setLoading(true);
    Promise.all([getEnvVars(envId), getFeatureFlags(envId)]).then(([v, f]) => {
      setVars(v); setFlags(f); setLoading(false);
    });
  };
  useEffect(() => { reload(); }, [envId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddVar = async () => {
    if (!newVar.key.trim()) { setErr('Key is required'); return; }
    setBusy('addvar'); setErr(null);
    await createEnvVar(envId, { key: newVar.key.trim(), value: newVar.value, secret: false });
    setNewVar({ key: '', value: '' });
    setVarDlg(false); setBusy(null); reload();
  };

  const handleDelVar = async (key: string) => {
    setBusy(key);
    await deleteEnvVar(envId, key);
    setBusy(null); reload();
  };

  const handleAddFlag = async () => {
    if (!newFlag.key.trim()) { setErr('Key is required'); return; }
    setBusy('addflag'); setErr(null);
    await createFeatureFlag(envId, { key: newFlag.key.trim(), enabled: false, note: newFlag.note });
    setNewFlag({ key: '', note: '' });
    setFlagDlg(false); setBusy(null); reload();
  };

  const handleToggleFlag = async (flag: FeatureFlag) => {
    setBusy(flag.key);
    await updateFeatureFlag(envId, flag.key, !flag.enabled);
    setBusy(null); reload();
  };

  if (loading) return <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress size={22} sx={{ color: t.brandPrimary }} /></Box>;

  const inputSx = { '& .MuiOutlinedInput-root': { bgcolor: t.surfaceSubtle, color: t.textPrimary } };

  return (
    <Box>
      <SectionHead title="Configuration" sub="Environment variables (non-secret) and feature flags." />

      {/* ── Env vars ── */}
      <Box sx={{ bgcolor: t.surface, border: `1px solid ${t.border}`, borderRadius: '8px', overflow: 'hidden', mb: 2.5 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between"
          sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${t.border}` }}>
          <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '.83rem', color: t.textPrimary }}>
            Environment Variables
          </Typography>
          <Button size="small" variant="outlined" startIcon={<AddIcon sx={{ fontSize: 13 }} />}
            onClick={() => { setErr(null); setVarDlg(true); }}
            sx={{ textTransform: 'none', fontFamily: FONT, fontWeight: 600, fontSize: '.75rem',
              borderColor: t.border, color: t.textSecondary, borderRadius: '6px', py: .3 }}>
            Add Variable
          </Button>
        </Stack>
        <TableWrap headers={['Key', 'Value', 'Updated', '']}>
          {vars.filter(v => !v.secret).map(v => (
            <TR key={v.key}>
              <td style={{ padding: '7px 10px', borderBottom: `1px solid ${t.border}`, fontFamily: 'monospace', fontWeight: 600, fontSize: '.79rem', color: t.textPrimary }}>{v.key}</td>
              <td style={{ padding: '7px 10px', borderBottom: `1px solid ${t.border}`, fontFamily: 'monospace', fontSize: '.77rem', color: t.textSecondary }}>{v.value}</td>
              <TD>{timeAgo(v.updated_at)}</TD>
              <td style={{ padding: '4px 6px', borderBottom: `1px solid ${t.border}`, textAlign: 'right' }}>
                <Tooltip title="Delete variable">
                  <IconButton size="small" disabled={busy === v.key} onClick={() => handleDelVar(v.key)}>
                    <DeleteOutlineIcon sx={{ fontSize: 13, color: sc.danger }} />
                  </IconButton>
                </Tooltip>
              </td>
            </TR>
          ))}
          {vars.filter(v => !v.secret).length === 0 && (
            <tr><td colSpan={4} style={{ padding: '16px 10px', textAlign: 'center', fontFamily: FONT, fontSize: '.8rem', color: t.textTertiary }}>
              No config variables. Add one above.
            </td></tr>
          )}
        </TableWrap>
      </Box>

      {/* ── Feature flags ── */}
      <Box sx={{ bgcolor: t.surface, border: `1px solid ${t.border}`, borderRadius: '8px', p: '14px 18px' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
          <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '.83rem', color: t.textPrimary }}>Feature Flags</Typography>
          <Button size="small" variant="outlined" startIcon={<AddIcon sx={{ fontSize: 13 }} />}
            onClick={() => { setErr(null); setFlagDlg(true); }}
            sx={{ textTransform: 'none', fontFamily: FONT, fontWeight: 600, fontSize: '.75rem',
              borderColor: t.border, color: t.textSecondary, borderRadius: '6px', py: .3 }}>
            Add Flag
          </Button>
        </Stack>
        <Stack spacing={.5}>
          {flags.map(flag => (
            <Stack key={flag.key} direction="row" alignItems="center" justifyContent="space-between"
              sx={{ py: 1, borderBottom: `1px solid ${t.border}`, '&:last-child': { borderBottom: 0 } }}>
              <Box>
                <Typography sx={{ fontFamily: 'monospace', fontSize: '.82rem', color: t.textPrimary, fontWeight: 700 }}>{flag.key}</Typography>
                {flag.note && <Typography sx={{ fontFamily: FONT, fontSize: '.73rem', color: t.textSecondary }}>{flag.note}</Typography>}
              </Box>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Tooltip title={flag.enabled ? 'Disable' : 'Enable'}>
                  <Switch size="small" checked={flag.enabled} disabled={busy === flag.key}
                    onChange={() => handleToggleFlag(flag)} />
                </Tooltip>
                <StatusChip label={flag.enabled ? 'ON' : 'OFF'} color={flag.enabled ? sc.success : '#6B7280'} />
              </Stack>
            </Stack>
          ))}
          {flags.length === 0 && (
            <Typography sx={{ fontFamily: FONT, fontSize: '.8rem', color: t.textTertiary, py: 1, textAlign: 'center' }}>
              No feature flags. Add one above.
            </Typography>
          )}
        </Stack>
      </Box>

      {/* ── Add Variable dialog ── */}
      <Dialog open={varDlg} onClose={() => setVarDlg(false)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { bgcolor: t.surface, border: `1px solid ${t.border}`, borderRadius: '10px' } }}>
        <DialogTitle sx={{ fontFamily: FONT, fontWeight: 700, color: t.textPrimary }}>Add Variable</DialogTitle>
        <DialogContent>
          {err && <Alert severity="error" sx={{ mb: 1.5 }}>{err}</Alert>}
          <Stack spacing={2} sx={{ pt: .5 }}>
            <TextField label="Key" size="small" fullWidth value={newVar.key}
              onChange={e => setNewVar(v => ({ ...v, key: e.target.value }))}
              placeholder="e.g. MAX_WORKERS" inputProps={{ style: { fontFamily: 'monospace' } }} sx={inputSx} />
            <TextField label="Value" size="small" fullWidth value={newVar.value}
              onChange={e => setNewVar(v => ({ ...v, value: e.target.value }))}
              inputProps={{ style: { fontFamily: 'monospace' } }} sx={inputSx} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setVarDlg(false)} sx={{ textTransform: 'none', color: t.textSecondary }}>Cancel</Button>
          <Button variant="contained" disabled={busy === 'addvar'} onClick={handleAddVar}
            sx={{ textTransform: 'none', fontWeight: 700, bgcolor: t.brandPrimary }}>
            {busy === 'addvar' ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Add Flag dialog ── */}
      <Dialog open={flagDlg} onClose={() => setFlagDlg(false)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { bgcolor: t.surface, border: `1px solid ${t.border}`, borderRadius: '10px' } }}>
        <DialogTitle sx={{ fontFamily: FONT, fontWeight: 700, color: t.textPrimary }}>Add Feature Flag</DialogTitle>
        <DialogContent>
          {err && <Alert severity="error" sx={{ mb: 1.5 }}>{err}</Alert>}
          <Stack spacing={2} sx={{ pt: .5 }}>
            <TextField label="Flag key" size="small" fullWidth value={newFlag.key}
              onChange={e => setNewFlag(v => ({ ...v, key: e.target.value }))}
              placeholder="e.g. BETA_FEATURE_X" inputProps={{ style: { fontFamily: 'monospace' } }} sx={inputSx} />
            <TextField label="Note (optional)" size="small" fullWidth value={newFlag.note}
              onChange={e => setNewFlag(v => ({ ...v, note: e.target.value }))} sx={inputSx} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setFlagDlg(false)} sx={{ textTransform: 'none', color: t.textSecondary }}>Cancel</Button>
          <Button variant="contained" disabled={busy === 'addflag'} onClick={handleAddFlag}
            sx={{ textTransform: 'none', fontWeight: 700, bgcolor: t.brandPrimary }}>
            {busy === 'addflag' ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// ── Secrets ───────────────────────────────────────────────────────────────────
const SecretsPanel: React.FC<{ envId: string }> = ({ envId }) => {
  const [vars,     setVars]     = useState<EnvVar[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [dlgOpen,  setDlgOpen]  = useState(false);
  const [newSecret, setNewSecret] = useState({ key: '', value: '' });
  const [busy,     setBusy]     = useState<string | null>(null);
  const [err,      setErr]      = useState<string | null>(null);

  const reload = () => {
    setLoading(true);
    getEnvVars(envId).then(v => { setVars(v.filter(x => x.secret)); setLoading(false); });
  };
  useEffect(() => { reload(); }, [envId]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (key: string) =>
    setRevealed(prev => { const s = new Set(prev); s.has(key) ? s.delete(key) : s.add(key); return s; });

  const handleAdd = async () => {
    if (!newSecret.key.trim()) { setErr('Key is required'); return; }
    setBusy('add'); setErr(null);
    await createEnvVar(envId, { key: newSecret.key.trim(), value: newSecret.value, secret: true });
    setNewSecret({ key: '', value: '' });
    setDlgOpen(false); setBusy(null); reload();
  };

  const handleDel = async (key: string) => {
    setBusy(key);
    await deleteEnvVar(envId, key);
    setBusy(null); reload();
  };

  const inputSx = { '& .MuiOutlinedInput-root': { bgcolor: t.surfaceSubtle, color: t.textPrimary } };

  return (
    <Box>
      <SectionHead title="Secrets"
        sub="Encrypted secrets scoped to this environment. Values are masked by default."
        action={
          <Button size="small" variant="outlined" startIcon={<AddIcon sx={{ fontSize: 13 }} />}
            onClick={() => { setErr(null); setDlgOpen(true); }}
            sx={{ textTransform: 'none', fontFamily: FONT, fontWeight: 600, fontSize: '.75rem',
              borderColor: t.border, color: t.textSecondary, borderRadius: '6px' }}>
            Add Secret
          </Button>
        }
      />
      {loading
        ? <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress size={22} sx={{ color: t.brandPrimary }} /></Box>
        : (
          <Box sx={{ bgcolor: t.surface, border: `1px solid ${t.border}`, borderRadius: '8px', overflow: 'hidden' }}>
            <TableWrap headers={['Secret Key', 'Value', 'Updated', '']}>
              {vars.map(v => (
                <TR key={v.key}>
                  <td style={{ padding: '7px 10px', borderBottom: `1px solid ${t.border}`, fontFamily: 'monospace', fontWeight: 600, fontSize: '.79rem', color: t.textPrimary }}>{v.key}</td>
                  <td style={{ padding: '7px 10px', borderBottom: `1px solid ${t.border}` }}>
                    <Stack direction="row" alignItems="center" spacing={.5}>
                      <span style={{ fontFamily: 'monospace', fontSize: '.77rem', color: t.textSecondary }}>
                        {revealed.has(v.key) ? v.value : '••••••••'}
                      </span>
                      <IconButton size="small" onClick={() => toggle(v.key)}>
                        {revealed.has(v.key)
                          ? <VisibilityOffIcon sx={{ fontSize: 13, color: t.textTertiary }} />
                          : <VisibilityIcon    sx={{ fontSize: 13, color: t.textTertiary }} />}
                      </IconButton>
                    </Stack>
                  </td>
                  <TD>{timeAgo(v.updated_at)}</TD>
                  <td style={{ padding: '4px 6px', borderBottom: `1px solid ${t.border}`, textAlign: 'right' }}>
                    <Tooltip title="Delete secret">
                      <IconButton size="small" disabled={busy === v.key} onClick={() => handleDel(v.key)}>
                        <DeleteOutlineIcon sx={{ fontSize: 13, color: sc.danger }} />
                      </IconButton>
                    </Tooltip>
                  </td>
                </TR>
              ))}
              {vars.length === 0 && (
                <tr><td colSpan={4} style={{ padding: '16px 10px', textAlign: 'center', fontFamily: FONT, fontSize: '.8rem', color: t.textTertiary }}>
                  No secrets. Add one above.
                </td></tr>
              )}
            </TableWrap>
          </Box>
        )
      }

      {/* Add Secret dialog */}
      <Dialog open={dlgOpen} onClose={() => setDlgOpen(false)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { bgcolor: t.surface, border: `1px solid ${t.border}`, borderRadius: '10px' } }}>
        <DialogTitle sx={{ fontFamily: FONT, fontWeight: 700, color: t.textPrimary }}>Add Secret</DialogTitle>
        <DialogContent>
          {err && <Alert severity="error" sx={{ mb: 1.5 }}>{err}</Alert>}
          <Stack spacing={2} sx={{ pt: .5 }}>
            <TextField label="Key" size="small" fullWidth value={newSecret.key}
              onChange={e => setNewSecret(v => ({ ...v, key: e.target.value }))}
              placeholder="e.g. DATABASE_URL" inputProps={{ style: { fontFamily: 'monospace' } }} sx={inputSx} />
            <TextField label="Value" size="small" fullWidth type="password" value={newSecret.value}
              onChange={e => setNewSecret(v => ({ ...v, value: e.target.value }))}
              placeholder="Encrypted at rest" inputProps={{ style: { fontFamily: 'monospace' } }} sx={inputSx} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDlgOpen(false)} sx={{ textTransform: 'none', color: t.textSecondary }}>Cancel</Button>
          <Button variant="contained" disabled={busy === 'add'} onClick={handleAdd}
            sx={{ textTransform: 'none', fontWeight: 700, bgcolor: t.brandPrimary }}>
            {busy === 'add' ? 'Saving…' : 'Save Secret'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// ── Logs ──────────────────────────────────────────────────────────────────────
interface LogEntry { ts: string; level: string; svc: string; msg: string; }
const LEVEL_C: Record<string, string> = { INFO: '#8b949e', WARN: '#F59E0B', WARNING: '#F59E0B', ERROR: sc.danger, DEBUG: '#6B7280' };

const LogsPanel: React.FC<{ envId: string }> = ({ envId: _ }) => {
  const [query, setQuery] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const logRef = useRef<HTMLDivElement>(null);

  const loadLogs = useCallback(async (search?: string) => {
    setLogsLoading(true);
    try {
      const { data } = await apiClient.get<{ logs: any[] }>(
        '/api/services/logs/',
        { params: { search: search ?? '', limit: 50 } },
      );
      const items = data.logs ?? [];
      setLogs(items.map((l: any) => ({
        ts:    l.timestamp ? l.timestamp.slice(11, 19) : '',
        level: l.level === 'WARNING' ? 'WARN' : (l.level ?? 'INFO'),
        svc:   l.service ?? '',
        msg:   l.message ?? '',
      })));
    } catch { /* silent */ } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const filtered = query.trim()
    ? logs.filter(l => `${l.svc} ${l.msg} ${l.level}`.toLowerCase().includes(query.toLowerCase()))
    : logs;

  return (
    <Box>
      <SectionHead title="Log Stream" sub="Real-time aggregated logs across all services in this environment." />

      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1.5 }}>
        <TextField size="small" placeholder="Filter…" value={query}
          onChange={e => { setQuery(e.target.value); loadLogs(e.target.value); }}
          sx={{ width: 240, '& input': { fontFamily: 'monospace', fontSize: '.78rem' } }} />
        <Chip label="LIVE" size="small" sx={{ bgcolor: 'rgba(34,197,94,.15)', color: sc.success, fontWeight: 700, fontSize: '.7rem', height: 20 }} />
      </Stack>

      <Box ref={logRef} sx={{ bgcolor: '#0d1117', border: `1px solid ${t.border}`, borderRadius: '8px', p: 2, minHeight: 340, maxHeight: 480, overflowY: 'auto' }}>
        {logsLoading ? (
          <Box sx={{ color: '#8b949e', fontFamily: 'monospace', fontSize: '.75rem' }}>Loading logs…</Box>
        ) : filtered.length === 0 ? (
          <Box sx={{ color: '#8b949e', fontFamily: 'monospace', fontSize: '.75rem' }}>No log entries found.</Box>
        ) : filtered.map((l, i) => (
          <Box key={i} sx={{ display: 'flex', gap: 1.5, lineHeight: 1.75, fontFamily: 'monospace', fontSize: '.75rem' }}>
            <span style={{ color: '#6B7280', flexShrink: 0 }}>2026-03-02 {l.ts}</span>
            <span style={{ color: LEVEL_C[l.level], flexShrink: 0, width: 40 }}>{l.level}</span>
            <span style={{ color: '#58a6ff', flexShrink: 0, width: 120 }}>{l.svc}</span>
            <span style={{ color: '#c9d1d9' }}>{l.msg}</span>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

// ── Metrics ───────────────────────────────────────────────────────────────────
const MetricsPanel: React.FC<{ envId: string }> = ({ envId }) => {
  const [health, setHealth] = useState<EnvHealth | null>(null);
  useEffect(() => { getEnvHealth(envId).then(setHealth); }, [envId]);

  const GAUGES = health
    ? [
        { label: 'CPU Usage',    pct: health.cpu_pct },
        { label: 'Memory Usage', pct: health.ram_pct },
        { label: 'Disk Usage',   pct: health.disk_pct },
      ]
    : [];

  return (
    <Box>
      <SectionHead title="Metrics & Observability" sub="Performance metrics, traffic analytics, and error tracking." />

      <Stack direction="row" flexWrap="wrap" gap={1.5} sx={{ mb: 2.5 }}>
        {[
          { label: 'Requests/min', value: '4,821', sub: '+5% vs baseline' },
          { label: 'P50 Latency',  value: health ? `${Math.round(health.latency_ms * .6)}ms` : '—', sub: '' },
          { label: 'P99 Latency',  value: health ? `${health.latency_ms}ms` : '—',  sub: 'Target <500ms' },
          { label: 'Error Rate',   value: health ? `${health.error_rate}/min` : '—', sub: 'Target <1/min' },
          { label: 'Cache Hit',    value: '92%',   sub: 'Redis' },
          { label: 'Uptime',       value: health ? `${health.uptime_pct}%` : '—', sub: '30-day rolling' },
        ].map(m => (
          <Box key={m.label} sx={{ flex: '1 1 130px', minWidth: 120, bgcolor: t.surface, border: `1px solid ${t.border}`, borderRadius: '8px', p: '12px 14px' }}>
            <Typography sx={{ fontFamily: FONT, fontSize: '.7rem', color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.06em', mb: .5 }}>{m.label}</Typography>
            <Typography sx={{ fontFamily: FONT, fontSize: '1.3rem', fontWeight: 800, color: t.textPrimary, lineHeight: 1 }}>{m.value}</Typography>
            {m.sub && <Typography sx={{ fontFamily: FONT, fontSize: '.7rem', color: t.textTertiary, mt: .3 }}>{m.sub}</Typography>}
          </Box>
        ))}
      </Stack>

      <Box sx={{ bgcolor: t.surface, border: `1px solid ${t.border}`, borderRadius: '8px', p: '16px 18px' }}>
        <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '.83rem', color: t.textPrimary, mb: 1.5 }}>Resource Usage</Typography>
        <Stack spacing={1.5}>
          {GAUGES.map(g => <GaugeBar key={g.label} label={g.label} pct={g.pct} />)}
        </Stack>
      </Box>
    </Box>
  );
};

// ── Governance ────────────────────────────────────────────────────────────────
const GovernancePanel: React.FC<{ envId: string; env: ApiEnvironment; onToggleLock: () => void }> = ({ envId: _, env, onToggleLock }) => (
  <Box>
    <SectionHead title="Governance & Access Control" sub="Lock/unlock, deployment rules, compliance, and access restrictions." />

    {/* Lock card */}
    <Box sx={{ bgcolor: env.is_protected ? 'rgba(239,68,68,.07)' : 'rgba(34,197,94,.07)',
      border: `1px solid ${env.is_protected ? sc.danger : sc.success}33`, borderRadius: '8px', p: '16px 18px', mb: 2.5 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" spacing={1}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          {env.is_protected ? <LockIcon sx={{ color: sc.danger, fontSize: 20 }} /> : <LockOpenIcon sx={{ color: sc.success, fontSize: 20 }} />}
          <Box>
            <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '.88rem', color: t.textPrimary }}>
              {env.is_protected ? 'Environment Locked' : 'Environment Unlocked'}
            </Typography>
            <Typography sx={{ fontFamily: FONT, fontSize: '.78rem', color: t.textSecondary }}>
              {env.is_protected
                ? 'All deploys & config changes require admin approval.'
                : 'Changes are allowed and logged in the audit trail.'}
            </Typography>
          </Box>
        </Stack>
        <Button variant="outlined" size="small" onClick={onToggleLock}
          startIcon={env.is_protected ? <LockOpenIcon sx={{ fontSize: 14 }} /> : <LockIcon sx={{ fontSize: 14 }} />}
          sx={{ textTransform: 'none', fontFamily: FONT, fontWeight: 700, borderRadius: '6px', fontSize: '.79rem',
            borderColor: env.is_protected ? sc.danger : sc.success, color: env.is_protected ? sc.danger : sc.success }}>
          {env.is_protected ? 'Unlock' : 'Lock'}
        </Button>
      </Stack>
    </Box>

    {/* Rules table */}
    <Box sx={{ bgcolor: t.surface, border: `1px solid ${t.border}`, borderRadius: '8px', p: '14px 18px' }}>
      <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '.83rem', color: t.textPrimary, mb: 1.2 }}>Deployment Rules</Typography>
      <Stack spacing={.5}>
        {[
          { label: 'Auto-deploy on push', value: env.auto_deploy ? 'Enabled' : 'Disabled', ok: env.auto_deploy },
          { label: 'Require approval',    value: env.require_approval ? 'Yes' : 'No', ok: false },
          { label: 'Strategy',            value: env.deployment_strategy, ok: true },
          { label: 'Protected',           value: env.is_protected ? 'Yes' : 'No', ok: !env.is_protected },
          { label: 'Stage',               value: STAGE_CFG[stageOf(env.name)].label, ok: true },
        ].map(row => (
          <Stack key={row.label} direction="row" justifyContent="space-between"
            sx={{ py: .8, borderBottom: `1px solid ${t.border}`, '&:last-child': { borderBottom: 0 } }}>
            <Typography sx={{ fontFamily: FONT, fontSize: '.8rem', color: t.textSecondary }}>{row.label}</Typography>
            <Typography sx={{ fontFamily: FONT, fontSize: '.8rem', fontWeight: 700, color: t.textPrimary }}>{row.value}</Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  </Box>
);

// ── Audit Log ─────────────────────────────────────────────────────────────────
const AuditPanel: React.FC<{ envId: string }> = ({ envId }) => {
  const [audit, setAudit]     = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { setLoading(true); getAuditLog(envId).then(a => { setAudit(a); setLoading(false); }); }, [envId]);

  return (
    <Box>
      <SectionHead title="Audit Log" sub="Complete record of every action taken on this environment." />
      {loading
        ? <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress size={22} sx={{ color: t.brandPrimary }} /></Box>
        : (
          <Box sx={{ bgcolor: t.surface, border: `1px solid ${t.border}`, borderRadius: '8px', overflow: 'hidden' }}>
            <TableWrap headers={['Action', 'Actor', 'Resource', 'Time', 'Result']}>
              {audit.map(a => (
                <TR key={a.id}>
                  <TD bold accent={t.textPrimary}>{a.action}</TD>
                  <TD>{a.actor}</TD>
                  <TD>{a.resource}</TD>
                  <TD>{timeAgo(a.timestamp)}</TD>
                  <td style={{ padding: '7px 10px', borderBottom: `1px solid ${t.border}` }}>
                    <StatusChip label={a.result} color={a.result === 'success' ? sc.success : sc.danger} />
                  </td>
                </TR>
              ))}
            </TableWrap>
          </Box>
        )
      }
    </Box>
  );
};

// ── Pipelines ─────────────────────────────────────────────────────────────────
const PipelinesPanel: React.FC<{ envId: string }> = ({ envId }) => {
  const [runs, setRuns]       = useState<EnvPipelineRun[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { setLoading(true); getEnvPipelineRuns(envId).then(r => { setRuns(r); setLoading(false); }); }, [envId]);

  return (
    <Box>
      <SectionHead title="Pipeline Runs" sub="All CI/CD pipeline executions targeting this environment." />
      {loading
        ? <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress size={22} sx={{ color: t.brandPrimary }} /></Box>
        : (
          <Box sx={{ bgcolor: t.surface, border: `1px solid ${t.border}`, borderRadius: '8px', overflow: 'hidden' }}>
            <TableWrap headers={['Pipeline', 'Status', 'Version', 'Started', 'Duration']}>
              {runs.map(r => {
                const dur = r.finished_at ? `${Math.round((new Date(r.finished_at).getTime() - new Date(r.started_at).getTime()) / 1000)}s` : 'running…';
                return (
                  <TR key={r.id}>
                    <TD bold accent={t.textPrimary}>{r.name}</TD>
                    <td style={{ padding: '7px 10px', borderBottom: `1px solid ${t.border}` }}><StatusChip label={r.status} color={PC[r.status] ?? '#6B7280'} /></td>
                    <TD>{r.version}</TD>
                    <TD>{timeAgo(r.started_at)}</TD>
                    <TD>{dur}</TD>
                  </TR>
                );
              })}
            </TableWrap>
          </Box>
        )
      }
    </Box>
  );
};

// ── Releases ──────────────────────────────────────────────────────────────────
const ReleasesPanel: React.FC<{ envId: string }> = ({ envId }) => {
  const [releases, setReleases] = useState<EnvRelease[]>([]);
  const [loading, setLoading]   = useState(true);
  const [busy, setBusy]         = useState<string | null>(null);

  const load = useCallback(() => { setLoading(true); getEnvReleases(envId).then(r => { setReleases(r); setLoading(false); }); }, [envId]);
  useEffect(() => { load(); }, [load]);

  const handleRollback = async (version: string) => {
    setBusy(version); await rollbackDeployment(envId, version); setBusy(null); load();
  };

  return (
    <Box>
      <SectionHead title="Releases & Versioning" sub="Track what version is active, release notes, and rollback history." />
      {loading
        ? <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress size={22} sx={{ color: t.brandPrimary }} /></Box>
        : (
          <Stack spacing={1.5}>
            {releases.map(r => (
              <Box key={r.version} sx={{ bgcolor: t.surface, border: `1.5px solid ${r.active ? t.brandPrimary : t.border}`, borderRadius: '8px', p: '14px 18px' }}>
                <Stack direction="row" alignItems="flex-start" justifyContent="space-between" flexWrap="wrap" spacing={1}>
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography sx={{ fontFamily: FONT, fontWeight: 800, fontSize: '.9rem', color: t.textPrimary }}>{r.version}</Typography>
                      {r.active && <StatusChip label="Active" color={t.brandPrimary} />}
                    </Stack>
                    <Typography sx={{ fontFamily: FONT, fontSize: '.78rem', color: t.textSecondary, mt: .3 }}>{r.notes || 'No release notes'}</Typography>
                    <Typography sx={{ fontFamily: FONT, fontSize: '.73rem', color: t.textTertiary, mt: .4 }}>
                      By <strong style={{ color: t.textSecondary }}>{r.deployed_by}</strong> · {fmtDate(r.deployed_at)}
                    </Typography>
                  </Box>
                  {!r.active && (
                    <Button size="small" variant="outlined" startIcon={<ReplayIcon sx={{ fontSize: 13 }} />}
                      disabled={busy === r.version} onClick={() => handleRollback(r.version)}
                      sx={{ textTransform: 'none', fontFamily: FONT, fontWeight: 700, fontSize: '.77rem', borderRadius: '6px', borderColor: t.border, color: t.textSecondary }}>
                      {busy === r.version ? 'Rolling back…' : 'Rollback'}
                    </Button>
                  )}
                </Stack>
              </Box>
            ))}
          </Stack>
        )
      }
    </Box>
  );
};

// ── Config Files (Discovery) ──────────────────────────────────────────────────

const FILE_TYPE_META: Record<string, { label: string; color: string }> = {
  dockerfile:  { label: 'Dockerfile',     color: '#2563eb' },
  env:         { label: '.env',           color: '#d97706' },
  yaml:        { label: 'YAML',           color: '#6b7280' },
  helm:        { label: 'Helm',           color: '#7c3aed' },
  k8s:         { label: 'Kubernetes',     color: '#16a34a' },
  terraform:   { label: 'Terraform',      color: '#4f46e5' },
  compose:     { label: 'Compose',        color: '#0891b2' },
  config:      { label: 'Config',         color: '#6b7280' },
  properties:  { label: 'Properties',     color: '#ea580c' },
  other:       { label: 'Other',          color: '#6b7280' },
};

const ConfigFilesPanel: React.FC<{ envId: string }> = ({ envId }) => {
  const [files,    setFiles]    = useState<EnvFile[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [scanning, setScanning] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [msg, setMsg] = useState<{ text: string; severity: 'success' | 'error' } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getEnvFiles(envId, filterType || undefined);
    setFiles(data);
    setLoading(false);
  }, [envId, filterType]);

  useEffect(() => { load(); }, [load]);

  const handleScan = async () => {
    setScanning(true);
    try {
      const res = await triggerDiscovery(envId);
      setFiles(res.files);
      setMsg({ text: res.detail, severity: 'success' });
    } catch {
      setMsg({ text: 'Discovery failed.', severity: 'error' });
    } finally {
      setScanning(false);
    }
  };

  const uniqueTypes = Array.from(new Set(files.map(f => f.file_type)));

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '1rem', color: t.textPrimary }}>
          Configuration & Infrastructure Files
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel sx={{ fontFamily: FONT, fontSize: '.8rem' }}>File Type</InputLabel>
            <Select
              value={filterType} label="File Type"
              onChange={e => setFilterType(e.target.value)}
              sx={{ fontFamily: FONT, fontSize: '.82rem' }}
            >
              <MenuItem value="">All Types</MenuItem>
              {Object.entries(FILE_TYPE_META).map(([k, v]) => (
                <MenuItem key={k} value={k} sx={{ fontFamily: FONT, fontSize: '.82rem' }}>{v.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="outlined" size="small"
            startIcon={scanning ? <CircularProgress size={13} /> : <SyncIcon sx={{ fontSize: 14 }} />}
            disabled={scanning}
            onClick={handleScan}
            sx={{ fontFamily: FONT, fontSize: '.78rem', textTransform: 'none', borderColor: t.brandPrimary, color: t.brandPrimary }}
          >
            {scanning ? 'Scanning…' : 'Scan Now'}
          </Button>
        </Stack>
      </Stack>

      {msg && (
        <Alert severity={msg.severity} onClose={() => setMsg(null)} sx={{ mb: 2, fontFamily: FONT, fontSize: '.82rem' }}>
          {msg.text}
        </Alert>
      )}

      {loading ? (
        <LinearProgress sx={{ borderRadius: 1 }} />
      ) : files.length === 0 ? (
        <Card variant="outlined" sx={{ bgcolor: t.surface, borderColor: t.border }}>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <FolderOpenIcon sx={{ fontSize: '2.5rem', color: t.textTertiary, mb: 1 }} />
            <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '.9rem', color: t.textPrimary, mb: .5 }}>
              No files discovered yet
            </Typography>
            <Typography sx={{ fontFamily: FONT, fontSize: '.82rem', color: t.textSecondary }}>
              Click <strong>Scan Now</strong> to discover Dockerfile, .env, YAML, Helm, K8s, Terraform, and other config files.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Card variant="outlined" sx={{ bgcolor: t.surface, borderColor: t.border }}>
          <Box sx={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['File', 'Type', 'Path', 'Valid', 'Env-Specific', 'Service', 'Last Modified'].map(h => (
                    <th key={h} style={{
                      fontFamily: FONT, fontSize: '.72rem', fontWeight: 700,
                      color: t.textSecondary, textAlign: 'left',
                      padding: '8px 12px', borderBottom: `1px solid ${t.border}`,
                      whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {files.map(f => {
                  const meta = FILE_TYPE_META[f.file_type] ?? FILE_TYPE_META.other;
                  return (
                    <tr key={f.id} style={{ borderBottom: `1px solid ${t.border}` }}>
                      <td style={{ padding: '7px 12px', fontFamily: FONT, fontSize: '.82rem', color: t.textPrimary, fontWeight: 600 }}>
                        {f.file_name}
                      </td>
                      <td style={{ padding: '7px 12px' }}>
                        <Chip
                          label={meta.label} size="small"
                          sx={{
                            fontFamily: FONT, fontSize: '.7rem', height: 20,
                            bgcolor: `${meta.color}22`, color: meta.color,
                            border: `1px solid ${meta.color}44`,
                          }}
                        />
                      </td>
                      <td style={{ padding: '7px 12px', fontFamily: FONT, fontSize: '.75rem', color: t.textSecondary, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <Tooltip title={f.file_path}><span>{f.file_path}</span></Tooltip>
                      </td>
                      <td style={{ padding: '7px 12px' }}>
                        {f.is_valid
                          ? <CheckCircleIcon sx={{ fontSize: 16, color: sc.success }} />
                          : <Tooltip title={f.error_message || 'File has errors'}><ErrorIcon sx={{ fontSize: 16, color: sc.danger }} /></Tooltip>
                        }
                      </td>
                      <td style={{ padding: '7px 12px', fontFamily: FONT, fontSize: '.82rem', color: f.is_env_specific ? t.brandPrimary : t.textTertiary }}>
                        {f.is_env_specific ? 'Yes' : '—'}
                      </td>
                      <td style={{ padding: '7px 12px', fontFamily: FONT, fontSize: '.78rem', color: t.textSecondary }}>
                        {f.associated_service || '—'}
                      </td>
                      <td style={{ padding: '7px 12px', fontFamily: FONT, fontSize: '.75rem', color: t.textTertiary, whiteSpace: 'nowrap' }}>
                        {f.last_modified ? new Date(f.last_modified).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Box>
          <Box sx={{ px: 2, py: 1, borderTop: `1px solid ${t.border}` }}>
            <Typography sx={{ fontFamily: FONT, fontSize: '.72rem', color: t.textTertiary }}>
              {files.length} file{files.length !== 1 ? 's' : ''} · {uniqueTypes.length} type{uniqueTypes.length !== 1 ? 's' : ''}
            </Typography>
          </Box>
        </Card>
      )}
    </Box>
  );
};

// ── Settings ──────────────────────────────────────────────────────────────────
const STRATEGIES: DeploymentStrategy[] = ['rolling', 'blue_green', 'canary', 'recreate'];

const SettingsPanel: React.FC<{ env: ApiEnvironment; onUpdated: (e: ApiEnvironment) => void; onDeleted: () => void }> = ({ env, onUpdated, onDeleted }) => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: env.name, description: env.description, region: env.region,
    deployment_strategy: env.deployment_strategy as DeploymentStrategy,
    auto_deploy: env.auto_deploy, require_approval: env.require_approval,
    is_protected: env.is_protected, notify_email: env.notify_email,
  });
  const [saving, setSaving]       = useState(false);
  const [deleting, setDeleting]   = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [toast, setToast]         = useState<string | null>(null);
  const [err, setErr]             = useState<string | null>(null);

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) { setErr('Name is required.'); return; }
    setSaving(true); setErr(null);
    try {
      const updated = await updateEnvironment(env.id, {
        name: form.name.trim(), description: form.description, region: form.region,
        deployment_strategy: form.deployment_strategy, auto_deploy: form.auto_deploy,
        require_approval: form.require_approval, is_protected: form.is_protected,
        notify_email: form.notify_email,
      });
      if (updated) { onUpdated(updated); setToast('Settings saved.'); }
    } catch { setErr('Failed to save settings.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirmDel) { setConfirmDel(true); return; }
    setDeleting(true);
    const msg = await deleteEnvironment(env.id);
    if (msg) { setErr(msg); setDeleting(false); setConfirmDel(false); return; }
    onDeleted();
    navigate('/developer/Dashboard/environment');
  };

  const inputSx = { '& .MuiInputBase-root': { bgcolor: t.surfaceSubtle ?? t.surface, color: t.textPrimary }, '& .MuiOutlinedInput-notchedOutline': { borderColor: t.border }, '& label': { fontFamily: FONT }, '& input': { fontFamily: FONT } };

  return (
    <Box sx={{ maxWidth: 640 }}>
      <SectionHead title="Environment Settings" sub="Edit configuration, policies, and danger-zone actions." />
      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

      <Stack spacing={2.5} sx={{ mb: 4 }}>
        <TextField label="Name" size="small" fullWidth value={form.name} onChange={e => set('name', e.target.value)} sx={inputSx} />
        <TextField label="Description" size="small" fullWidth multiline rows={2} value={form.description} onChange={e => set('description', e.target.value)} sx={inputSx} />
        <TextField label="Region" size="small" fullWidth value={form.region} onChange={e => set('region', e.target.value)} sx={inputSx} />
        <FormControl size="small" fullWidth sx={inputSx}>
          <InputLabel sx={{ fontFamily: FONT }}>Deployment Strategy</InputLabel>
          <Select label="Deployment Strategy" value={form.deployment_strategy} onChange={e => set('deployment_strategy', e.target.value)}>
            {STRATEGIES.map(s => <MenuItem key={s} value={s} sx={{ fontFamily: FONT }}>{s.replace('_', ' ')}</MenuItem>)}
          </Select>
        </FormControl>
        <TextField label="Notification email" size="small" fullWidth value={form.notify_email} onChange={e => set('notify_email', e.target.value)} sx={inputSx} />
        <Divider sx={{ borderColor: t.border }} />
        <Stack spacing={.3}>
          <FormControlLabel label={<Typography sx={{ fontFamily: FONT, fontSize: '.83rem', color: t.textPrimary }}>Auto-deploy on push</Typography>}
            control={<Switch checked={form.auto_deploy} onChange={e => set('auto_deploy', e.target.checked)} size="small" />} />
          <FormControlLabel label={<Typography sx={{ fontFamily: FONT, fontSize: '.83rem', color: t.textPrimary }}>Require approval</Typography>}
            control={<Switch checked={form.require_approval} onChange={e => set('require_approval', e.target.checked)} size="small" />} />
          <FormControlLabel label={<Typography sx={{ fontFamily: FONT, fontSize: '.83rem', color: t.textPrimary }}>Protected (lock deployments)</Typography>}
            control={<Switch checked={form.is_protected} onChange={e => set('is_protected', e.target.checked)} size="small" />} />
        </Stack>
      </Stack>

      <Button variant="contained" startIcon={saving ? <CircularProgress size={13} sx={{ color: '#fff' }} /> : <SaveIcon sx={{ fontSize: '1rem' }} />}
        onClick={handleSave} disabled={saving}
        sx={{ bgcolor: t.brandPrimary, '&:hover': { bgcolor: t.brandPrimaryHover }, textTransform: 'none', fontWeight: 700, borderRadius: '8px', mb: 4 }}>
        Save Changes
      </Button>

      {/* Danger zone */}
      <Box sx={{ p: 2, border: `1px solid ${sc.danger}30`, borderRadius: '10px', bgcolor: `${sc.danger}06` }}>
        <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '.85rem', color: sc.danger, mb: .5 }}>Danger Zone</Typography>
        <Typography sx={{ fontFamily: FONT, fontSize: '.78rem', color: t.textSecondary, mb: 1.5 }}>
          Permanently delete this environment and all associated data. This cannot be undone.
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <Button variant="outlined" size="small" startIcon={deleting ? <CircularProgress size={13} /> : <DeleteOutlineIcon sx={{ fontSize: '.9rem' }} />}
            onClick={handleDelete} disabled={deleting}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px', borderColor: sc.danger, color: sc.danger, '&:hover': { bgcolor: `${sc.danger}12` } }}>
            {confirmDel ? 'Confirm Delete?' : 'Delete Environment'}
          </Button>
          {confirmDel && (
            <Button size="small" onClick={() => setConfirmDel(false)} sx={{ textTransform: 'none', color: t.textSecondary }}>Cancel</Button>
          )}
        </Stack>
      </Box>

      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast(null)} message={toast} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} />
    </Box>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════

const EnvironmentDetailPage: React.FC = () => {
  const { envId }  = useParams<{ envId: string }>();
  const navigate   = useNavigate();
  const [env,      setEnv]     = useState<ApiEnvironment | null>(null);
  const [loading,  setLoading] = useState(true);
  const [error,    setError]   = useState<string | null>(null);
  const [section,  setSection] = useState<Section>('overview');

  const load = useCallback(async () => {
    if (!envId || envId === 'undefined') { setError('Invalid environment ID.'); setLoading(false); return; }
    setLoading(true); setError(null);
    const r = await getEnvironment(envId);
    if (!r) setError('Environment not found.');
    else setEnv(r);
    setLoading(false);
  }, [envId]);

  useEffect(() => { load(); }, [load]);

  const handleToggleLock = () => {
    if (env) setEnv({ ...env, is_protected: !env.is_protected });
  };

  // ── Loading / error states ──────────────────────────────────────────────────
  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', bgcolor: t.background }}>
        <CircularProgress size={28} sx={{ color: t.brandPrimary }} />
        <Typography sx={{ ml: 2, fontFamily: FONT, color: t.textSecondary }}>Loading environment…</Typography>
      </Box>
    );
  }
  if (error || !env) {
    return (
      <Box sx={{ p: 3, bgcolor: t.background, minHeight: '100vh' }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/developer/Dashboard/environment')}
          sx={{ textTransform: 'none', fontFamily: FONT, color: t.textSecondary, mb: 2 }}>
          Back to Environments
        </Button>
        <Alert severity="error">{error ?? 'Environment not found.'}</Alert>
      </Box>
    );
  }

  const stage  = stageOf(env.name);
  const stageSt = STAGE_CFG[stage];

  // ── Full-screen layout ──────────────────────────────────────────────────────
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: t.background, fontFamily: FONT, overflow: 'hidden' }}>

      {/* ── Top header bar ── */}
      <Box sx={{ bgcolor: t.surface, borderBottom: `1px solid ${t.border}`, px: 2, py: 1.2, flexShrink: 0 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <IconButton size="small" onClick={() => navigate('/developer/Dashboard/environment')} sx={{ color: t.textSecondary }}>
            <ArrowBackIcon sx={{ fontSize: 17 }} />
          </IconButton>
          <Divider orientation="vertical" flexItem sx={{ borderColor: t.border, mx: .5 }} />
          <Stack direction="row" alignItems="center" spacing={1}>
            <DevicesIcon sx={{ fontSize: '1rem', color: t.brandPrimary }} />
            <Typography sx={{ fontFamily: FONT, fontWeight: 800, fontSize: '.95rem', color: t.textPrimary }}>{env.name}</Typography>
          </Stack>
          <Chip label={stageSt.label} size="small"
            sx={{ bgcolor: stageSt.bg, color: stageSt.text, border: `1px solid ${stageSt.border}`, fontFamily: FONT, fontWeight: 700, fontSize: '.7rem', height: 18 }} />
          {env.is_protected && (
            <Chip icon={<LockIcon sx={{ fontSize: 10, ml: '5px !important' }} />} label="Protected" size="small"
              sx={{ bgcolor: 'rgba(239,68,68,.1)', color: sc.danger, fontFamily: FONT, fontWeight: 700, fontSize: '.7rem', height: 18 }} />
          )}
          <Box sx={{ flex: 1 }} />
          <Typography sx={{ fontFamily: FONT, fontSize: '.75rem', color: t.textTertiary }}>
            {env.region && ` ${env.region}`}
          </Typography>
          <Tooltip title="Refresh">
            <IconButton size="small" onClick={load} sx={{ color: t.textSecondary }}>
              <RefreshIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {/* ── Body: sidebar + content ── */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── Sidebar ── */}
        <Box sx={{
          width: 210, flexShrink: 0, bgcolor: t.surface, borderRight: `1px solid ${t.border}`,
          overflowY: 'auto', display: 'flex', flexDirection: 'column', py: 1,
        }}>
          {SIDEBAR.map(item => (
            <React.Fragment key={item.id}>
              {item.dividerBefore && <Divider sx={{ borderColor: t.border, my: .5 }} />}
              <Box
                onClick={() => setSection(item.id)}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1.2,
                  px: 2, py: '7px', mx: 1, borderRadius: '6px', cursor: 'pointer',
                  bgcolor: section === item.id ? `${t.brandPrimary}18` : 'transparent',
                  color:   section === item.id ? t.brandPrimary : t.textSecondary,
                  fontFamily: FONT, fontSize: '.82rem', fontWeight: section === item.id ? 700 : 500,
                  transition: 'all .12s',
                  '&:hover': { bgcolor: section === item.id ? `${t.brandPrimary}18` : 'rgba(255,255,255,.04)', color: t.textPrimary },
                }}
              >
                {item.icon}
                {item.label}
              </Box>
            </React.Fragment>
          ))}
        </Box>

        {/* ── Main content ── */}
        <Box sx={{ flex: 1, overflowY: 'auto', p: { xs: 2, md: 3 } }}>
          {section === 'overview'    && <OverviewPanel    envId={env.id} env={env} />}
          {section === 'deployments' && <DeploymentsPanel envId={env.id} env={env} />}
          {section === 'services'    && <ServicesPanel    envId={env.id} />}
          {section === 'files'       && <ConfigFilesPanel envId={env.id} />}
          {section === 'config'      && <ConfigPanel      envId={env.id} />}
          {section === 'secrets'     && <SecretsPanel     envId={env.id} />}
          {section === 'logs'        && <LogsPanel        envId={env.id} />}
          {section === 'metrics'     && <MetricsPanel     envId={env.id} />}
          {section === 'governance'  && <GovernancePanel  envId={env.id} env={env} onToggleLock={handleToggleLock} />}
          {section === 'audit'       && <AuditPanel       envId={env.id} />}
          {section === 'pipelines'   && <PipelinesPanel   envId={env.id} />}
          {section === 'releases'    && <ReleasesPanel    envId={env.id} />}
          {section === 'settings'    && <SettingsPanel    env={env} onUpdated={setEnv} onDeleted={() => navigate('/developer/Dashboard/environment')} />}
        </Box>
      </Box>
    </Box>
  );
};

export default EnvironmentDetailPage;
