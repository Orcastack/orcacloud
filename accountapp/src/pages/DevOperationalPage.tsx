/**
 * OrcaCloud – Operational Page
 * ──────────────────────────────────────────────────────────────────────────────
 * Two-sidebar layout:
 *   LEFT  (260px fixed)  — operational navigation tree
 *   CENTER (fluid)       — health grid, incidents, service details
 *   RIGHT (340px, collapsible) — live running processes, auto-refresh stream
 *
 * Data:
 *   • getOperationalOverview()  – global banner, service health, regions, incidents
 *   • getHealthGrid()           – service × region matrix (polled every 30s)
 *   • getRunningProcesses()     – live processes (polled every 10s)
 *   • getOperationalSummary()   – counts (polled every 15s)
 *   • listIncidents()           – full incident list
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert, Box, Chip, CircularProgress,
  Collapse, Divider, IconButton, LinearProgress,
  ListItemButton, ListItemIcon, ListItemText,
  Stack, Table, TableBody, TableCell, TableHead, TableRow,
  Tooltip, Typography,
} from '@mui/material';

import AccountTreeIcon       from '@mui/icons-material/AccountTree';
import ArrowBackIcon         from '@mui/icons-material/ArrowBack';
import BoltIcon              from '@mui/icons-material/Bolt';
import CheckCircleIcon       from '@mui/icons-material/CheckCircle';
import ChevronRightIcon      from '@mui/icons-material/ChevronRight';
import ChevronLeftIcon       from '@mui/icons-material/ChevronLeft';
import CodeIcon              from '@mui/icons-material/Code';
import DashboardIcon         from '@mui/icons-material/Dashboard';
import DevicesIcon           from '@mui/icons-material/Devices';
import DnsIcon               from '@mui/icons-material/Dns';
import ErrorIcon             from '@mui/icons-material/Error';
import ExpandLessIcon        from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon        from '@mui/icons-material/ExpandMore';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import HubIcon               from '@mui/icons-material/Hub';
import LayersIcon            from '@mui/icons-material/Layers';
import MemoryIcon            from '@mui/icons-material/Memory';
import MonitorHeartIcon      from '@mui/icons-material/MonitorHeart';
import PlayCircleFilledIcon  from '@mui/icons-material/PlayCircleFilled';
import PublicIcon            from '@mui/icons-material/Public';
import RefreshIcon           from '@mui/icons-material/Refresh';
import ReportProblemIcon     from '@mui/icons-material/ReportProblem';
import RouterIcon            from '@mui/icons-material/Router';
import RocketLaunchIcon      from '@mui/icons-material/RocketLaunch';
import SecurityIcon          from '@mui/icons-material/Security';
import SmartToyIcon          from '@mui/icons-material/SmartToy';
import SpeedIcon             from '@mui/icons-material/Speed';
import StorageIcon           from '@mui/icons-material/Storage';
import SyncIcon              from '@mui/icons-material/Sync';
import WarningIcon           from '@mui/icons-material/Warning';

import {
  dashboardCardSx,
  dashboardSemanticColors, dashboardTokens,
} from '../styles/dashboardDesignSystem';
import {
  getOperationalOverview, getHealthGrid, getRunningProcesses,
  getOperationalSummary, listIncidents,
  SERVICE_LABELS,
  type BannerLevel, type CloudRegion, type ComponentStatusValue,
  type GlobalBanner, type HealthGrid, type Incident,
  type OperationalOverview, type ProcessType, type RunningProcess,
  type ServiceHealthItem, type ServiceKey,
} from '../services/operationalApi';

// ─── Constants ────────────────────────────────────────────────────────────────
const FONT = '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const t    = dashboardTokens.colors;
const sc   = dashboardSemanticColors;
const LEFT_W  = 260;
const RIGHT_W = 340;

// ── Status helpers ────────────────────────────────────────────────────────────
const STATUS_COLOR: Record<ComponentStatusValue, string> = {
  operational:    sc.success,
  degraded:       sc.warning,
  partial_outage: sc.orange,
  major_outage:   sc.danger,
  maintenance:    sc.purple,
};
const STATUS_LABEL: Record<ComponentStatusValue, string> = {
  operational:    'Operational',
  degraded:       'Degraded',
  partial_outage: 'Partial Outage',
  major_outage:   'Major Outage',
  maintenance:    'Maintenance',
};
const INC_SEVERITY_COLOR: Record<string, string> = {
  sev1: sc.danger, sev2: sc.orange, sev3: sc.warning, sev4: sc.info,
};
const INC_STATUS_COLOR: Record<string, string> = {
  open: sc.danger, investigating: sc.orange, identified: sc.warning,
  monitoring: sc.info, resolved: sc.success, postmortem: sc.purple,
};
const PROC_TYPE_ICON: Record<ProcessType, React.ReactNode> = {
  deployment:  <RocketLaunchIcon sx={{ fontSize: '1rem' }} />,
  pipeline:    <PlayCircleFilledIcon sx={{ fontSize: '1rem' }} />,
  automation:  <BoltIcon sx={{ fontSize: '1rem' }} />,
  gpu_job:     <MemoryIcon sx={{ fontSize: '1rem' }} />,
  edge_task:   <SmartToyIcon sx={{ fontSize: '1rem' }} />,
  background:  <SyncIcon sx={{ fontSize: '1rem' }} />,
  sync:        <SyncIcon sx={{ fontSize: '1rem' }} />,
};
const PROC_TYPE_COLOR: Record<ProcessType, string> = {
  deployment: sc.info, pipeline: sc.success, automation: sc.orange,
  gpu_job: sc.purple, edge_task: sc.teal, background: '#6b7280', sync: sc.cyan,
};
const PROC_STATUS_COLOR: Record<string, string> = {
  queued: sc.warning, running: sc.info, succeeded: sc.success, failed: sc.danger, cancelled: '#6b7280',
};

function fmtDuration(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60)   return `${secs}s`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ${secs % 60}s`;
  return `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`;
}
function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ─── Left Sidebar ─────────────────────────────────────────────────────────────
type LeftSection =
  | 'global'
  | 'svc:compute' | 'svc:container_runtime' | 'svc:ci_cd' | 'svc:registry'
  | 'svc:networking' | 'svc:storage' | 'svc:monitoring' | 'svc:edge_robotics'
  | 'svc:kubernetes' | 'svc:gpu_nodes'
  | 'region:all' | `region:${string}`
  | 'cluster:kubernetes' | 'cluster:gpu' | 'cluster:edge'
  | 'incident:active' | 'incident:resolved' | 'incident:maintenance';

interface NavGroupDef {
  id: string; label: string; icon: React.ReactNode;
  children: { id: LeftSection; label: string; icon?: React.ReactNode }[];
}
const NAV_GROUPS: NavGroupDef[] = [
  {
    id: 'services', label: 'Services', icon: <LayersIcon sx={{ fontSize: '1rem' }} />,
    children: [
      { id: 'svc:compute',           label: 'Compute Engine',    icon: <SpeedIcon sx={{ fontSize: '.9rem' }} /> },
      { id: 'svc:container_runtime', label: 'Container Runtime', icon: <CodeIcon sx={{ fontSize: '.9rem' }} /> },
      { id: 'svc:ci_cd',             label: 'CI/CD Pipelines',   icon: <PlayCircleFilledIcon sx={{ fontSize: '.9rem' }} /> },
      { id: 'svc:registry',          label: 'Registry',          icon: <StorageIcon sx={{ fontSize: '.9rem' }} /> },
      { id: 'svc:networking',        label: 'Networking',        icon: <RouterIcon sx={{ fontSize: '.9rem' }} /> },
      { id: 'svc:storage',           label: 'Storage',           icon: <StorageIcon sx={{ fontSize: '.9rem' }} /> },
      { id: 'svc:monitoring',        label: 'Monitoring',        icon: <MonitorHeartIcon sx={{ fontSize: '.9rem' }} /> },
      { id: 'svc:edge_robotics',     label: 'Edge & Robotics',   icon: <SmartToyIcon sx={{ fontSize: '.9rem' }} /> },
      { id: 'svc:kubernetes',        label: 'Kubernetes',        icon: <AccountTreeIcon sx={{ fontSize: '.9rem' }} /> },
      { id: 'svc:gpu_nodes',         label: 'GPU Nodes',         icon: <MemoryIcon sx={{ fontSize: '.9rem' }} /> },
    ],
  },
  {
    id: 'regions', label: 'Regions', icon: <PublicIcon sx={{ fontSize: '1rem' }} />,
    children: [
      { id: 'region:all',     label: 'All Regions',  icon: <PublicIcon sx={{ fontSize: '.9rem' }} /> },
      { id: 'region:us-east', label: 'US-East',      icon: <DnsIcon sx={{ fontSize: '.9rem' }} /> },
      { id: 'region:us-west', label: 'US-West',      icon: <DnsIcon sx={{ fontSize: '.9rem' }} /> },
      { id: 'region:eu',      label: 'EU-Central',   icon: <DnsIcon sx={{ fontSize: '.9rem' }} /> },
      { id: 'region:africa',  label: 'Africa-South', icon: <DnsIcon sx={{ fontSize: '.9rem' }} /> },
      { id: 'region:apac',    label: 'Asia-Pacific', icon: <DnsIcon sx={{ fontSize: '.9rem' }} /> },
    ],
  },
  {
    id: 'clusters', label: 'Clusters', icon: <HubIcon sx={{ fontSize: '1rem' }} />,
    children: [
      { id: 'cluster:kubernetes', label: 'Kubernetes Clusters', icon: <AccountTreeIcon sx={{ fontSize: '.9rem' }} /> },
      { id: 'cluster:gpu',        label: 'GPU Nodes',           icon: <MemoryIcon sx={{ fontSize: '.9rem' }} /> },
      { id: 'cluster:edge',       label: 'Edge Nodes',          icon: <DevicesIcon sx={{ fontSize: '.9rem' }} /> },
    ],
  },
  {
    id: 'incidents', label: 'Incidents', icon: <ReportProblemIcon sx={{ fontSize: '1rem' }} />,
    children: [
      { id: 'incident:active',      label: 'Active',      icon: <ErrorIcon sx={{ fontSize: '.9rem' }} /> },
      { id: 'incident:resolved',    label: 'Resolved',    icon: <CheckCircleIcon sx={{ fontSize: '.9rem' }} /> },
      { id: 'incident:maintenance', label: 'Maintenance', icon: <SecurityIcon sx={{ fontSize: '.9rem' }} /> },
    ],
  },
];

const LeftSidebar: React.FC<{
  active: LeftSection;
  onSelect: (s: LeftSection) => void;
  summary: { active_incidents: number; running_processes: number; sev1_incidents: number };
  open: boolean;
  onToggle: () => void;
}> = ({ active, onSelect, summary, open, onToggle }) => {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    services: true, regions: true, clusters: false, incidents: true,
  });
  const toggle = (id: string) => setExpanded(p => ({ ...p, [id]: !p[id] }));

  return (
    <Box sx={{
      width: open ? LEFT_W : 40, flexShrink: 0,
      bgcolor: t.surface, borderRight: `1px solid ${t.border}`,
      height: '100%', overflowY: open ? 'auto' : 'hidden', overflowX: 'hidden',
      display: 'flex', flexDirection: 'column',
      transition: 'width .2s ease',
      '&::-webkit-scrollbar': { width: 4 },
      '&::-webkit-scrollbar-thumb': { bgcolor: t.border, borderRadius: 2 },
    }}>
      {/* Collapse / expand toggle */}
      <Box
        onClick={onToggle}
        sx={{
          display: 'flex', alignItems: 'center',
          justifyContent: open ? 'flex-end' : 'center',
          px: open ? 1 : 0, py: 0.75,
          borderBottom: `1px solid ${t.border}`,
          cursor: 'pointer',
          '&:hover': { bgcolor: t.surfaceHover },
          flexShrink: 0,
        }}
      >
        {open
          ? <ChevronLeftIcon sx={{ fontSize: '1rem', color: t.textSecondary }} />
          : <Tooltip title="Expand sidebar" placement="right"><ChevronRightIcon sx={{ fontSize: '1rem', color: t.textSecondary }} /></Tooltip>
        }
      </Box>

      {/* Collapsed: show icon strip only */}
      {!open && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, pt: 1 }}>
          <Tooltip title="Global Overview" placement="right">
            <Box onClick={() => onSelect('global')} sx={{
              p: 0.75, borderRadius: 1, cursor: 'pointer',
              color: active === 'global' ? t.brandPrimary : t.textSecondary,
              bgcolor: active === 'global' ? `${t.brandPrimary}18` : 'transparent',
              '&:hover': { bgcolor: t.surfaceHover },
            }}>
              <DashboardIcon sx={{ fontSize: '1.1rem' }} />
            </Box>
          </Tooltip>
          <Tooltip title="Services" placement="right">
            <Box sx={{ p: 0.75, borderRadius: 1, cursor: 'pointer', color: t.textSecondary, '&:hover': { bgcolor: t.surfaceHover } }}>
              <LayersIcon sx={{ fontSize: '1.1rem' }} />
            </Box>
          </Tooltip>
          <Tooltip title="Regions" placement="right">
            <Box sx={{ p: 0.75, borderRadius: 1, cursor: 'pointer', color: t.textSecondary, '&:hover': { bgcolor: t.surfaceHover } }}>
              <PublicIcon sx={{ fontSize: '1.1rem' }} />
            </Box>
          </Tooltip>
          <Tooltip title="Clusters" placement="right">
            <Box sx={{ p: 0.75, borderRadius: 1, cursor: 'pointer', color: t.textSecondary, '&:hover': { bgcolor: t.surfaceHover } }}>
              <HubIcon sx={{ fontSize: '1.1rem' }} />
            </Box>
          </Tooltip>
          <Tooltip title="Incidents" placement="right">
            <Box sx={{ p: 0.75, borderRadius: 1, cursor: 'pointer', color: t.textSecondary, '&:hover': { bgcolor: t.surfaceHover }, position: 'relative' }}>
              <ReportProblemIcon sx={{ fontSize: '1.1rem' }} />
              {summary.active_incidents > 0 && (
                <Box sx={{ position: 'absolute', top: 4, right: 4, width: 6, height: 6, borderRadius: '50%', bgcolor: sc.danger }} />
              )}
            </Box>
          </Tooltip>
        </Box>
      )}

      {/* Expanded content */}
      {open && <>
      {/* Back to Developer Dashboard */}
      <Box
        onClick={() => navigate('/developer/Dashboard')}
        sx={{
          display: 'flex', alignItems: 'center', gap: 0.75,
          px: 2, py: 1, cursor: 'pointer',
          borderBottom: `1px solid ${t.border}`,
          color: t.textSecondary,
          '&:hover': { bgcolor: t.surfaceHover, color: t.textPrimary },
          transition: 'background .15s, color .15s',
        }}
      >
        <ArrowBackIcon sx={{ fontSize: '.85rem' }} />
        <Typography sx={{ fontFamily: FONT, fontSize: '.78rem', fontWeight: 500 }}>Developer Dashboard</Typography>
      </Box>

      {/* Global Overview */}
      <ListItemButton
        selected={active === 'global'}
        onClick={() => onSelect('global')}
        sx={{
          py: 1.25, px: 2, borderBottom: `1px solid ${t.border}`,
          '&.Mui-selected': { bgcolor: `${t.brandPrimary}18` },
          '&:hover': { bgcolor: t.surfaceHover },
        }}
      >
        <ListItemIcon sx={{ minWidth: 28, color: active === 'global' ? t.brandPrimary : t.textSecondary }}>
          <DashboardIcon sx={{ fontSize: '1rem' }} />
        </ListItemIcon>
        <ListItemText primary="Global Overview"
          primaryTypographyProps={{ fontFamily: FONT, fontSize: '.85rem', fontWeight: active === 'global' ? 700 : 500, color: active === 'global' ? t.brandPrimary : t.textPrimary }} />
        {summary.sev1_incidents > 0 && (
          <Chip label={summary.sev1_incidents} size="small"
            sx={{ height: 16, fontSize: '.65rem', bgcolor: sc.danger, color: '#fff', fontFamily: FONT }} />
        )}
      </ListItemButton>

      {NAV_GROUPS.map((group) => (
        <Box key={group.id}>
          <ListItemButton onClick={() => toggle(group.id)}
            sx={{ py: 0.75, px: 2, '&:hover': { bgcolor: t.surfaceHover } }}>
            <ListItemIcon sx={{ minWidth: 24, color: t.textSecondary }}>{group.icon}</ListItemIcon>
            <ListItemText primary={group.label}
              primaryTypographyProps={{ fontFamily: FONT, fontSize: '.75rem', fontWeight: 700, color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.06em' }} />
            {group.id === 'incidents' && summary.active_incidents > 0 && (
              <Chip label={summary.active_incidents} size="small"
                sx={{ height: 14, fontSize: '.6rem', bgcolor: `${sc.danger}22`, color: sc.danger, fontFamily: FONT }} />
            )}
            {expanded[group.id] ? <ExpandLessIcon sx={{ fontSize: '.85rem', color: t.textSecondary }} /> : <ExpandMoreIcon sx={{ fontSize: '.85rem', color: t.textSecondary }} />}
          </ListItemButton>
          <Collapse in={expanded[group.id]}>
            {group.children.map((child) => {
              const isSel = active === child.id;
              return (
                <ListItemButton key={child.id} selected={isSel} onClick={() => onSelect(child.id as LeftSection)}
                  sx={{ py: 0.6, pl: 4, pr: 2, '&.Mui-selected': { bgcolor: `${t.brandPrimary}14` }, '&:hover': { bgcolor: t.surfaceHover } }}>
                  <ListItemIcon sx={{ minWidth: 22, color: isSel ? t.brandPrimary : t.textSecondary }}>{child.icon}</ListItemIcon>
                  <ListItemText primary={child.label}
                    primaryTypographyProps={{ fontFamily: FONT, fontSize: '.82rem', fontWeight: isSel ? 700 : 400, color: isSel ? t.brandPrimary : t.textPrimary }} />
                </ListItemButton>
              );
            })}
          </Collapse>
          <Divider sx={{ borderColor: t.border, opacity: 0.5 }} />
        </Box>
      ))}
      </>}
    </Box>
  );
};

// ─── Global Banner ────────────────────────────────────────────────────────────
const BANNER_STYLES: Record<BannerLevel, { bg: string; icon: React.ReactNode; textColor: string }> = {
  operational:    { bg: `${sc.success}1a`,  icon: <CheckCircleIcon sx={{ color: sc.success }} />,  textColor: sc.success },
  partial_outage: { bg: `${sc.orange}1a`,   icon: <WarningIcon sx={{ color: sc.orange }} />,        textColor: sc.orange },
  major_incident: { bg: `${sc.danger}1a`,   icon: <ErrorIcon sx={{ color: sc.danger }} />,          textColor: sc.danger },
};
const GlobalBannerBar: React.FC<{ banner: GlobalBanner; lastUpdate: string }> = ({ banner, lastUpdate }) => {
  const s = BANNER_STYLES[banner.level];
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      px: 2.5, py: 1.25, bgcolor: s.bg, borderBottom: `1px solid ${s.textColor}40` }}>
      <Stack direction="row" spacing={1.25} alignItems="center">
        {s.icon}
        <Typography sx={{ fontFamily: FONT, fontWeight: 700, color: s.textColor, fontSize: '.9rem' }}>{banner.message}</Typography>
      </Stack>
      <Typography sx={{ fontFamily: FONT, fontSize: '.75rem', color: t.textSecondary }}>Updated {fmtTime(lastUpdate)}</Typography>
    </Box>
  );
};

// ─── Health Grid ──────────────────────────────────────────────────────────────
const StatusCell: React.FC<{ status?: ComponentStatusValue; onClick?: () => void }> = ({ status, onClick }) => {
  const color = status ? STATUS_COLOR[status] : '#374151';
  const label = status ? STATUS_LABEL[status] : '—';
  return (
    <Tooltip title={label}>
      <Box onClick={onClick} sx={{
        width: '100%', height: 26, borderRadius: .5,
        bgcolor: `${color}26`, border: `1px solid ${color}55`,
        cursor: onClick ? 'pointer' : 'default',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        '&:hover': onClick ? { bgcolor: `${color}40` } : {},
      }}>
        <FiberManualRecordIcon sx={{ fontSize: '.6rem', color }} />
      </Box>
    </Tooltip>
  );
};
const HealthMatrix: React.FC<{ grid: HealthGrid; onCellClick: (svc: string, region: string) => void }> = ({ grid, onCellClick }) => {
  const services = (Object.keys(SERVICE_LABELS) as ServiceKey[]).filter(s => grid.services.includes(s));
  const regions  = grid.regions.slice(0, 8);
  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Table size="small" sx={{ minWidth: 600, borderCollapse: 'separate', borderSpacing: '2px 3px' }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontFamily: FONT, fontSize: '.72rem', fontWeight: 700, color: t.textSecondary, border: 'none', width: 160, py: 0.5 }}>SERVICE</TableCell>
            {regions.map(r => (
              <TableCell key={r} align="center" sx={{ fontFamily: FONT, fontSize: '.7rem', color: t.textSecondary, border: 'none', py: 0.5, px: 0.5, minWidth: 56 }}>{r}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {services.map(svc => (
            <TableRow key={svc}>
              <TableCell sx={{ fontFamily: FONT, fontSize: '.8rem', color: t.textPrimary, border: 'none', py: 0.25 }}>{SERVICE_LABELS[svc]}</TableCell>
              {regions.map(r => (
                <TableCell key={r} sx={{ border: 'none', px: 0.5, py: 0.25 }}>
                  <StatusCell status={grid.grid[svc]?.[r]?.status} onClick={() => onCellClick(svc, r)} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
};

// ─── Service Health Card ──────────────────────────────────────────────────────
const ServiceHealthCard: React.FC<{ item: ServiceHealthItem; onClick: () => void }> = ({ item, onClick }) => {
  const color = STATUS_COLOR[item.status as ComponentStatusValue] ?? sc.success;
  return (
    <Box onClick={onClick} sx={{ ...dashboardCardSx, p: 1.5, cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      '&:hover': { borderColor: `${color}66` } }}>
      <Stack direction="row" spacing={1} alignItems="center">
        <FiberManualRecordIcon sx={{ fontSize: '.65rem', color }} />
        <Typography sx={{ fontFamily: FONT, fontSize: '.85rem', fontWeight: 600, color: t.textPrimary }}>
          {SERVICE_LABELS[item.service as ServiceKey] ?? item.service}
        </Typography>
      </Stack>
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Typography sx={{ fontFamily: FONT, fontSize: '.75rem', color: t.textSecondary }}>{item.uptime_pct.toFixed(2)}% uptime</Typography>
        <Typography sx={{ fontFamily: FONT, fontSize: '.75rem', color: t.textSecondary }}>{item.latency_ms.toFixed(0)}ms</Typography>
        <Chip label={STATUS_LABEL[item.status as ComponentStatusValue] ?? item.status} size="small"
          sx={{ fontFamily: FONT, fontSize: '.68rem', height: 18, bgcolor: `${color}1a`, color, border: `1px solid ${color}44` }} />
      </Stack>
    </Box>
  );
};

// ─── Incident Card ────────────────────────────────────────────────────────────
const IncidentCard: React.FC<{ inc: Incident; expanded: boolean; onToggle: () => void }> = ({ inc, expanded, onToggle }) => {
  const sevColor = INC_SEVERITY_COLOR[inc.severity] ?? sc.warning;
  const statusColor = INC_STATUS_COLOR[inc.status] ?? '#6b7280';
  return (
    <Box sx={{ ...dashboardCardSx, overflow: 'hidden' }}>
      <Box onClick={onToggle} sx={{ p: 1.75, cursor: 'pointer', display: 'flex', alignItems: 'flex-start',
        justifyContent: 'space-between', gap: 1.5, '&:hover': { bgcolor: t.surfaceHover } }}>
        <Stack direction="row" spacing={1.25} alignItems="flex-start" sx={{ flex: 1, minWidth: 0 }}>
          <Chip label={inc.severity.toUpperCase()} size="small"
            sx={{ fontFamily: FONT, fontSize: '.65rem', height: 18, fontWeight: 700,
              bgcolor: `${sevColor}22`, color: sevColor, border: `1px solid ${sevColor}55`, flexShrink: 0 }} />
          <Box>
            <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '.88rem', color: t.textPrimary, lineHeight: 1.3 }}>{inc.title}</Typography>
            <Typography sx={{ fontFamily: FONT, fontSize: '.75rem', color: t.textSecondary, mt: 0.25 }}>
              {inc.service} · {fmtDate(inc.detected_at)}
            </Typography>
          </Box>
        </Stack>
        <Stack alignItems="flex-end" spacing={0.5} sx={{ flexShrink: 0 }}>
          <Chip label={inc.status.replace(/_/g, ' ')} size="small"
            sx={{ fontFamily: FONT, fontSize: '.68rem', height: 18, textTransform: 'capitalize',
              bgcolor: `${statusColor}1a`, color: statusColor, border: `1px solid ${statusColor}44` }} />
          {expanded ? <ExpandLessIcon sx={{ fontSize: '.9rem', color: t.textSecondary }} /> : <ExpandMoreIcon sx={{ fontSize: '.9rem', color: t.textSecondary }} />}
        </Stack>
      </Box>
      <Collapse in={expanded}>
        <Box sx={{ px: 2, pb: 1.75, borderTop: `1px solid ${t.border}` }}>
          {inc.summary && (
            <Typography sx={{ fontFamily: FONT, fontSize: '.82rem', color: t.textSecondary, mt: 1.25, lineHeight: 1.5 }}>{inc.summary}</Typography>
          )}
          {inc.impact && (
            <Box sx={{ mt: 1, p: 1, bgcolor: `${sc.danger}0d`, borderRadius: 1, border: `1px solid ${sc.danger}22` }}>
              <Typography sx={{ fontFamily: FONT, fontSize: '.78rem', color: sc.danger, fontWeight: 600 }}>Impact</Typography>
              <Typography sx={{ fontFamily: FONT, fontSize: '.78rem', color: t.textSecondary, mt: 0.25 }}>{inc.impact}</Typography>
            </Box>
          )}
          {inc.affected_resources && inc.affected_resources.length > 0 && (
            <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 1 }}>
              {inc.affected_resources.map(r => (
                <Chip key={r} label={r} size="small"
                  sx={{ fontFamily: FONT, fontSize: '.65rem', height: 16, bgcolor: t.surfaceSubtle, color: t.textSecondary }} />
              ))}
            </Stack>
          )}
          {inc.updates && inc.updates.length > 0 && (
            <Box sx={{ mt: 1.5 }}>
              <Typography sx={{ fontFamily: FONT, fontSize: '.72rem', fontWeight: 700, color: t.textSecondary,
                textTransform: 'uppercase', letterSpacing: '.06em', mb: 0.75 }}>Timeline</Typography>
              {inc.updates.map((u, i) => (
                <Box key={i} sx={{ display: 'flex', gap: 1.25, mb: 0.75 }}>
                  <FiberManualRecordIcon sx={{ fontSize: '.55rem', color: INC_STATUS_COLOR[u.status] ?? '#6b7280', mt: 0.6, flexShrink: 0 }} />
                  <Box>
                    <Typography sx={{ fontFamily: FONT, fontSize: '.75rem', color: t.textPrimary }}>{u.message}</Typography>
                    <Typography sx={{ fontFamily: FONT, fontSize: '.7rem', color: t.textSecondary }}>{u.author_name} · {fmtDate(u.created_at)}</Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
          <Typography sx={{ fontFamily: FONT, fontSize: '.7rem', color: t.textSecondary, mt: 1 }}>
            Duration: {inc.duration_minutes}m
            {inc.resolved_at && ` · Resolved ${fmtDate(inc.resolved_at)}`}
          </Typography>
        </Box>
      </Collapse>
    </Box>
  );
};

// ─── Right Sidebar ────────────────────────────────────────────────────────────
const ProcessRow: React.FC<{ proc: RunningProcess }> = ({ proc }) => {
  const typeColor = PROC_TYPE_COLOR[proc.process_type] ?? '#6b7280';
  const statColor = PROC_STATUS_COLOR[proc.status] ?? '#6b7280';
  return (
    <Box sx={{ ...dashboardCardSx, p: 1.25, mb: 0.75 }}>
      <Stack direction="row" spacing={0.75} alignItems="flex-start">
        <Box sx={{ color: typeColor, mt: 0.15, flexShrink: 0 }}>
          {PROC_TYPE_ICON[proc.process_type] ?? <BoltIcon sx={{ fontSize: '1rem' }} />}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontFamily: FONT, fontSize: '.8rem', fontWeight: 600, color: t.textPrimary, lineHeight: 1.3 }} noWrap>
            {proc.name}
          </Typography>
          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.2 }}>
            <Chip label={proc.status} size="small"
              sx={{ fontFamily: FONT, fontSize: '.62rem', height: 15,
                bgcolor: `${statColor}1a`, color: statColor, border: `1px solid ${statColor}44` }} />
            {proc.environment && (
              <Typography sx={{ fontFamily: FONT, fontSize: '.7rem', color: t.textSecondary }}>{proc.environment}</Typography>
            )}
          </Stack>
          {proc.status === 'running' && proc.progress_pct > 0 && (
            <Box sx={{ mt: 0.5 }}>
              <LinearProgress variant="determinate" value={proc.progress_pct}
                sx={{ height: 3, borderRadius: 2, bgcolor: `${typeColor}22`, '& .MuiLinearProgress-bar': { bgcolor: typeColor } }} />
              <Typography sx={{ fontFamily: FONT, fontSize: '.65rem', color: t.textSecondary, mt: 0.2 }}>{proc.progress_pct}%</Typography>
            </Box>
          )}
          <Stack direction="row" spacing={1} sx={{ mt: 0.25 }}>
            {proc.region && <Typography sx={{ fontFamily: FONT, fontSize: '.68rem', color: t.textSecondary }}>{proc.region}</Typography>}
            <Typography sx={{ fontFamily: FONT, fontSize: '.68rem', color: t.textSecondary }}>{fmtDuration(proc.started_at)} ago</Typography>
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
};

const RightSidebar: React.FC<{
  open: boolean; onToggle: () => void;
  processes: RunningProcess[]; loading: boolean; count: number;
}> = ({ open, onToggle, processes, loading, count }) => (
  <Box sx={{
    width: open ? RIGHT_W : 40, flexShrink: 0,
    bgcolor: t.surface, borderLeft: `1px solid ${t.border}`,
    height: '100%', overflow: 'hidden',
    transition: 'width .2s ease', display: 'flex', flexDirection: 'column',
  }}>
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: open ? 'space-between' : 'center',
      px: open ? 1.5 : 0.5, py: 1, borderBottom: `1px solid ${t.border}`, cursor: 'pointer' }}
      onClick={onToggle}>
      {open && (
        <Stack direction="row" spacing={0.75} alignItems="center">
          <PlayCircleFilledIcon sx={{ fontSize: '1rem', color: count > 0 ? sc.success : t.textSecondary }} />
          <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '.82rem', color: t.textPrimary }}>Live Processes</Typography>
          {count > 0 && (
            <Chip label={count} size="small"
              sx={{ height: 16, fontSize: '.65rem', bgcolor: `${sc.success}22`, color: sc.success, fontFamily: FONT }} />
          )}
        </Stack>
      )}
      {open
        ? <ChevronRightIcon sx={{ fontSize: '1rem', color: t.textSecondary }} />
        : (
          <Tooltip title="Live Processes" placement="left">
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
              <PlayCircleFilledIcon sx={{ fontSize: '1.1rem', color: count > 0 ? sc.success : t.textSecondary }} />
              {count > 0 && (
                <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: sc.success, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography sx={{ fontFamily: FONT, fontSize: '.55rem', color: '#fff', fontWeight: 700 }}>{count}</Typography>
                </Box>
              )}
            </Box>
          </Tooltip>
        )}
    </Box>
    {open && (
      <Box sx={{ flex: 1, overflowY: 'auto', p: 1.25,
        '&::-webkit-scrollbar': { width: 3 },
        '&::-webkit-scrollbar-thumb': { bgcolor: t.border, borderRadius: 2 } }}>
        {loading && <Box sx={{ display: 'flex', justifyContent: 'center', pt: 3 }}><CircularProgress size={20} sx={{ color: t.brandPrimary }} /></Box>}
        {!loading && processes.length === 0 && (
          <Box sx={{ textAlign: 'center', pt: 4 }}>
            <PlayCircleFilledIcon sx={{ fontSize: '2rem', color: t.textSecondary, opacity: .3 }} />
            <Typography sx={{ fontFamily: FONT, fontSize: '.78rem', color: t.textSecondary, mt: 0.5 }}>No active processes</Typography>
          </Box>
        )}
        {processes.map(p => <ProcessRow key={p.id} proc={p} />)}
      </Box>
    )}
  </Box>
);

// ─── Center Panels ────────────────────────────────────────────────────────────

const GlobalOverviewPanel: React.FC<{
  overview: OperationalOverview | null; grid: HealthGrid | null;
  processes: RunningProcess[]; incidents: Incident[];
  onSvcClick: (svc: string) => void; onGridCell: (svc: string, reg: string) => void; loading: boolean;
}> = ({ overview, grid, processes, incidents, onSvcClick, onGridCell, loading }) => {
  const [expandedInc, setExpandedInc] = useState<string | null>(null);
  if (loading && !overview) return <Box sx={{ display: 'flex', justifyContent: 'center', pt: 6 }}><CircularProgress sx={{ color: t.brandPrimary }} /></Box>;
  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '.82rem', color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.06em', mb: 1 }}>Service Health</Typography>
        <Stack spacing={0.75}>
          {(overview?.service_health ?? []).map(item => (
            <ServiceHealthCard key={item.service} item={item} onClick={() => onSvcClick(item.service)} />
          ))}
        </Stack>
      </Box>
      {grid && (
        <Box>
          <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '.82rem', color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.06em', mb: 1 }}>Service × Region Grid</Typography>
          <Box sx={{ ...dashboardCardSx, p: 1.5 }}>
            <Box sx={{ mb: 1, display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              {(Object.entries(STATUS_COLOR) as [ComponentStatusValue, string][]).map(([k, c]) => (
                <Stack key={k} direction="row" spacing={0.5} alignItems="center">
                  <FiberManualRecordIcon sx={{ fontSize: '.6rem', color: c }} />
                  <Typography sx={{ fontFamily: FONT, fontSize: '.72rem', color: t.textSecondary }}>{STATUS_LABEL[k]}</Typography>
                </Stack>
              ))}
            </Box>
            <HealthMatrix grid={grid} onCellClick={onGridCell} />
          </Box>
        </Box>
      )}
      {incidents.filter(i => !['resolved', 'postmortem'].includes(i.status)).length > 0 && (
        <Box>
          <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '.82rem', color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.06em', mb: 1 }}>Active Incidents</Typography>
          <Stack spacing={0.75}>
            {incidents.filter(i => !['resolved', 'postmortem'].includes(i.status)).map(inc => (
              <IncidentCard key={inc.resource_id} inc={inc}
                expanded={expandedInc === inc.resource_id}
                onToggle={() => setExpandedInc(p => p === inc.resource_id ? null : inc.resource_id)} />
            ))}
          </Stack>
        </Box>
      )}
      {processes.filter(p => p.status === 'running').length > 0 && (
        <Box>
          <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '.82rem', color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.06em', mb: 1 }}>
            Running Now ({processes.filter(p => p.status === 'running').length})
          </Typography>
          <Stack spacing={0.75}>
            {processes.filter(p => p.status === 'running').slice(0, 6).map(p => (
              <Box key={p.id} sx={{ ...dashboardCardSx, p: 1.25, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ color: PROC_TYPE_COLOR[p.process_type] ?? '#6b7280' }}>
                  {PROC_TYPE_ICON[p.process_type] ?? <BoltIcon sx={{ fontSize: '1rem' }} />}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontFamily: FONT, fontSize: '.82rem', fontWeight: 600, color: t.textPrimary }} noWrap>{p.name}</Typography>
                  <Typography sx={{ fontFamily: FONT, fontSize: '.72rem', color: t.textSecondary }}>{p.process_type} · {p.environment || p.region || '—'}</Typography>
                </Box>
                {p.progress_pct > 0 && (
                  <Box sx={{ width: 80, flexShrink: 0 }}>
                    <LinearProgress variant="determinate" value={p.progress_pct}
                      sx={{ height: 4, borderRadius: 2, bgcolor: `${PROC_TYPE_COLOR[p.process_type]}22`,
                        '& .MuiLinearProgress-bar': { bgcolor: PROC_TYPE_COLOR[p.process_type] } }} />
                    <Typography sx={{ fontFamily: FONT, fontSize: '.65rem', color: t.textSecondary, textAlign: 'right' }}>{p.progress_pct}%</Typography>
                  </Box>
                )}
                <Typography sx={{ fontFamily: FONT, fontSize: '.7rem', color: t.textSecondary, flexShrink: 0 }}>{fmtDuration(p.started_at)}</Typography>
              </Box>
            ))}
          </Stack>
        </Box>
      )}
    </Stack>
  );
};

const IncidentsPanel: React.FC<{ incidents: Incident[]; filter: 'active' | 'resolved' | 'maintenance'; loading: boolean }> = ({ incidents, filter, loading }) => {
  const [expandedInc, setExpandedInc] = useState<string | null>(null);
  const filtered = incidents.filter(inc => {
    if (filter === 'active')      return ['open', 'investigating', 'identified', 'monitoring'].includes(inc.status);
    if (filter === 'resolved')    return ['resolved', 'postmortem'].includes(inc.status);
    if (filter === 'maintenance') return inc.status === 'monitoring';
    return true;
  });
  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', pt: 6 }}><CircularProgress sx={{ color: t.brandPrimary }} /></Box>;
  if (filtered.length === 0) return (
    <Box sx={{ ...dashboardCardSx, p: 4, textAlign: 'center' }}>
      <CheckCircleIcon sx={{ fontSize: '2.5rem', color: sc.success, mb: 1 }} />
      <Typography sx={{ fontFamily: FONT, fontWeight: 700, color: t.textPrimary }}>
        {filter === 'active' ? 'No active incidents' : 'No incidents found'}
      </Typography>
    </Box>
  );
  return (
    <Stack spacing={0.75}>
      {filtered.map(inc => (
        <IncidentCard key={inc.resource_id} inc={inc}
          expanded={expandedInc === inc.resource_id}
          onToggle={() => setExpandedInc(p => p === inc.resource_id ? null : inc.resource_id)} />
      ))}
    </Stack>
  );
};

const ServiceDetailPanel: React.FC<{
  service: string; health: ServiceHealthItem | undefined;
  grid: HealthGrid | null; incidents: Incident[];
}> = ({ service, health, grid, incidents }) => {
  const related = incidents.filter(i => i.service === service || i.affected_resources?.includes(service));
  const color = health ? (STATUS_COLOR[health.status as ComponentStatusValue] ?? sc.success) : '#6b7280';
  const label = health ? (STATUS_LABEL[health.status as ComponentStatusValue] ?? health.status) : 'Unknown';
  const regionStatuses = grid?.grid[service as ServiceKey] ?? {};

  return (
    <Stack spacing={2}>
      <Box sx={{ ...dashboardCardSx, p: 2 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
          <FiberManualRecordIcon sx={{ color }} />
          <Typography sx={{ fontFamily: FONT, fontWeight: 800, fontSize: '1.1rem', color: t.textPrimary }}>
            {SERVICE_LABELS[service as ServiceKey] ?? service}
          </Typography>
          <Chip label={label} size="small"
            sx={{ fontFamily: FONT, fontSize: '.72rem', height: 20, bgcolor: `${color}22`, color, border: `1px solid ${color}55` }} />
        </Stack>
        {health && (
          <Stack direction="row" spacing={3}>
            {[
              { label: 'Uptime',     value: `${health.uptime_pct.toFixed(3)}%` },
              { label: 'Latency',    value: `${health.latency_ms.toFixed(1)} ms` },
              { label: 'Error Rate', value: `${health.error_rate.toFixed(2)}%` },
            ].map(m => (
              <Box key={m.label}>
                <Typography sx={{ fontFamily: FONT, fontSize: '.7rem', color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.04em' }}>{m.label}</Typography>
                <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '1rem', color: t.textPrimary }}>{m.value}</Typography>
              </Box>
            ))}
          </Stack>
        )}
        {health?.note && <Alert severity="info" sx={{ mt: 1.5, fontFamily: FONT, fontSize: '.8rem' }}>{health.note}</Alert>}
      </Box>
      {Object.keys(regionStatuses).length > 0 && (
        <Box>
          <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '.82rem', color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.06em', mb: 0.75 }}>By Region</Typography>
          <Stack spacing={0.5}>
            {Object.entries(regionStatuses).map(([region, cs]) => {
              const c = STATUS_COLOR[cs.status];
              return (
                <Box key={region} sx={{ ...dashboardCardSx, p: 1.25, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    <FiberManualRecordIcon sx={{ fontSize: '.55rem', color: c }} />
                    <Typography sx={{ fontFamily: FONT, fontSize: '.82rem', color: t.textPrimary }}>{region}</Typography>
                  </Stack>
                  <Stack direction="row" spacing={1.5}>
                    <Typography sx={{ fontFamily: FONT, fontSize: '.75rem', color: t.textSecondary }}>{cs.latency_ms.toFixed(0)} ms</Typography>
                    <Chip label={STATUS_LABEL[cs.status]} size="small"
                      sx={{ fontFamily: FONT, fontSize: '.65rem', height: 16, bgcolor: `${c}1a`, color: c, border: `1px solid ${c}44` }} />
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        </Box>
      )}
      {related.length > 0 && (
        <Box>
          <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '.82rem', color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.06em', mb: 0.75 }}>Related Incidents</Typography>
          <Stack spacing={0.5}>
            {related.map(inc => {
              const sc2 = INC_STATUS_COLOR[inc.status] ?? '#6b7280';
              return (
                <Box key={inc.resource_id} sx={{ ...dashboardCardSx, p: 1.25, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Chip label={inc.severity.toUpperCase()} size="small"
                    sx={{ fontFamily: FONT, fontSize: '.62rem', height: 16,
                      bgcolor: `${INC_SEVERITY_COLOR[inc.severity]}22`, color: INC_SEVERITY_COLOR[inc.severity],
                      border: `1px solid ${INC_SEVERITY_COLOR[inc.severity]}55` }} />
                  <Typography sx={{ fontFamily: FONT, fontSize: '.82rem', color: t.textPrimary, flex: 1 }} noWrap>{inc.title}</Typography>
                  <Chip label={inc.status} size="small"
                    sx={{ fontFamily: FONT, fontSize: '.62rem', height: 16, bgcolor: `${sc2}1a`, color: sc2, border: `1px solid ${sc2}44` }} />
                </Box>
              );
            })}
          </Stack>
        </Box>
      )}
    </Stack>
  );
};

const RegionsPanel: React.FC<{ regions: CloudRegion[]; loading: boolean }> = ({ regions, loading }) => {
  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', pt: 6 }}><CircularProgress sx={{ color: t.brandPrimary }} /></Box>;
  return (
    <Stack spacing={0.75}>
      {regions.map(r => {
        const color = r.status === 'active' ? sc.success : r.status === 'degraded' ? sc.warning : r.status === 'maintenance' ? sc.purple : '#6b7280';
        return (
          <Box key={r.id} sx={{ ...dashboardCardSx, p: 1.75, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
            <Stack direction="row" spacing={1.25} alignItems="center">
              <FiberManualRecordIcon sx={{ fontSize: '.65rem', color }} />
              <Box>
                <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '.88rem', color: t.textPrimary }}>{r.name}</Typography>
                <Typography sx={{ fontFamily: FONT, fontSize: '.75rem', color: t.textSecondary }}>{r.code} · {r.city}, {r.country}</Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={2} alignItems="center">
              <Typography sx={{ fontFamily: FONT, fontSize: '.75rem', color: t.textSecondary }}>{r.uptime_30d_pct.toFixed(2)}% uptime</Typography>
              {r.latency_ms && <Typography sx={{ fontFamily: FONT, fontSize: '.75rem', color: t.textSecondary }}>{r.latency_ms.toFixed(0)}ms</Typography>}
              <Chip label={r.status} size="small"
                sx={{ fontFamily: FONT, fontSize: '.68rem', height: 18, textTransform: 'capitalize',
                  bgcolor: `${color}1a`, color, border: `1px solid ${color}44` }} />
            </Stack>
          </Box>
        );
      })}
    </Stack>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const DevOperationalPage: React.FC = () => {
  const [section,       setSection]      = useState<LeftSection>('global');
  const [leftOpen,      setLeftOpen]     = useState(true);
  const [rightOpen,     setRightOpen]    = useState(true);
  const [overview,      setOverview]     = useState<OperationalOverview | null>(null);
  const [grid,          setGrid]         = useState<HealthGrid | null>(null);
  const [processes,     setProcesses]    = useState<RunningProcess[]>([]);
  const [allIncidents,  setAllIncidents] = useState<Incident[]>([]);
  const [ovLoading,     setOvLoading]    = useState(true);
  const [_gridLoading,  setGridLoading]  = useState(true);
  const [procLoading,   setProcLoading]  = useState(true);
  const [incLoading,    setIncLoading]   = useState(true);
  const [summary, setSummary] = useState({ active_incidents: 0, running_processes: 0, sev1_incidents: 0 });
  const [detailSvc, setDetailSvc] = useState<string | null>(null);

  const ovTimerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const gridTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const procTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sumTimerRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchOverview = useCallback(async () => {
    try {
      const data = await getOperationalOverview();
      setOverview(data);
      setSummary(s => ({ ...s, active_incidents: data.active_incidents.length, running_processes: data.running_count }));
    } catch { /* silent */ } finally { setOvLoading(false); }
  }, []);
  const fetchGrid = useCallback(async () => {
    try { setGrid(await getHealthGrid()); } catch { /* silent */ } finally { setGridLoading(false); }
  }, []);
  const fetchProcesses = useCallback(async () => {
    try { setProcesses(await getRunningProcesses()); } catch { /* silent */ } finally { setProcLoading(false); }
  }, []);
  const fetchIncidents = useCallback(async () => {
    try { setAllIncidents(await listIncidents()); } catch { /* silent */ } finally { setIncLoading(false); }
  }, []);
  const fetchSummary = useCallback(async () => {
    try {
      const s = await getOperationalSummary();
      setSummary(s);
      if (s.running_processes > 0) setRightOpen(true);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchOverview(); fetchGrid(); fetchProcesses(); fetchIncidents();
  }, [fetchOverview, fetchGrid, fetchProcesses, fetchIncidents]);

  useEffect(() => {
    ovTimerRef.current   = setInterval(fetchOverview,  60_000);
    gridTimerRef.current = setInterval(fetchGrid,      30_000);
    procTimerRef.current = setInterval(fetchProcesses, 10_000);
    sumTimerRef.current  = setInterval(fetchSummary,   15_000);
    return () => {
      clearInterval(ovTimerRef.current!);
      clearInterval(gridTimerRef.current!);
      clearInterval(procTimerRef.current!);
      clearInterval(sumTimerRef.current!);
    };
  }, [fetchOverview, fetchGrid, fetchProcesses, fetchSummary]);

  const handleLeftSelect = (s: LeftSection) => {
    setSection(s);
    if (!s.startsWith('svc:')) setDetailSvc(null);
    else setDetailSvc(s.replace('svc:', ''));
  };
  const handleSvcClick = (svc: string) => {
    setSection(`svc:${svc}` as LeftSection);
    setDetailSvc(svc);
  };

  const getCenterTitle = () => {
    if (section === 'global') return 'Global Overview';
    if (section.startsWith('svc:'))      return SERVICE_LABELS[section.replace('svc:', '') as ServiceKey] ?? section;
    if (section.startsWith('region:'))   return section.replace('region:', '').replace(/-/g, ' ').toUpperCase() + ' Region';
    if (section.startsWith('cluster:'))  return section.replace('cluster:', '') + ' Clusters';
    if (section.startsWith('incident:')) return section.replace('incident:', '') + ' Incidents';
    return section;
  };

  const renderCenter = () => {
    if (section === 'global') {
      return (
        <GlobalOverviewPanel overview={overview} grid={grid} processes={processes} incidents={allIncidents}
          onSvcClick={handleSvcClick} onGridCell={(svc) => handleSvcClick(svc)} loading={ovLoading} />
      );
    }
    if (section.startsWith('svc:') && detailSvc) {
      return (
        <ServiceDetailPanel service={detailSvc}
          health={overview?.service_health.find(h => h.service === detailSvc)}
          grid={grid} incidents={allIncidents} />
      );
    }
    if (section.startsWith('region:')) {
      return <RegionsPanel regions={overview?.regions ?? []} loading={ovLoading} />;
    }
    if (section.startsWith('incident:')) {
      const filter = section.replace('incident:', '') as 'active' | 'resolved' | 'maintenance';
      return <IncidentsPanel incidents={allIncidents} filter={filter} loading={incLoading} />;
    }
    if (section.startsWith('cluster:')) {
      return (
        <Box sx={{ ...dashboardCardSx, p: 4, textAlign: 'center' }}>
          <AccountTreeIcon sx={{ fontSize: '2.5rem', color: t.textSecondary, opacity: .4, mb: 1 }} />
          <Typography sx={{ fontFamily: FONT, fontWeight: 700, color: t.textPrimary, mb: 0.5 }}>Cluster Telemetry</Typography>
          <Typography sx={{ fontFamily: FONT, fontSize: '.85rem', color: t.textSecondary }}>
            Connect a Kubernetes agent to stream live cluster data.
          </Typography>
        </Box>
      );
    }
    return null;
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', bgcolor: t.background, fontFamily: FONT }}>
      {overview && <GlobalBannerBar banner={overview.banner} lastUpdate={overview.generated_at} />}

      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left sidebar – collapsible */}
        <LeftSidebar active={section} onSelect={handleLeftSelect} summary={summary}
          open={leftOpen} onToggle={() => setLeftOpen(p => !p)} />

        {/* Center panel – fluid, scrollable */}
        <Box sx={{ flex: 1, overflowY: 'auto', p: 2.5,
          '&::-webkit-scrollbar': { width: 5 },
          '&::-webkit-scrollbar-thumb': { bgcolor: t.border, borderRadius: 2 } }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Typography sx={{ fontFamily: FONT, fontWeight: 800, fontSize: '1.05rem', color: t.textPrimary }}>
              {getCenterTitle()}
            </Typography>
            <IconButton size="small"
              onClick={() => { fetchOverview(); fetchGrid(); fetchProcesses(); fetchIncidents(); }}
              sx={{ color: t.textSecondary, '&:hover': { color: t.brandPrimary } }}>
              <RefreshIcon sx={{ fontSize: '1rem' }} />
            </IconButton>
          </Stack>
          {renderCenter()}
        </Box>

        {/* Right sidebar – collapsible, auto-opens when processes are active */}
        <RightSidebar open={rightOpen} onToggle={() => setRightOpen(p => !p)}
          processes={processes} loading={procLoading} count={summary.running_processes} />
      </Box>
    </Box>
  );
};

export default DevOperationalPage;
