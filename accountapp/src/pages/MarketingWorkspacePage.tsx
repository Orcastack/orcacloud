// MarketingWorkspacePage.tsx
// Standalone org-scoped marketing workspace — no enterprise sidebar.
// Route: /enterprise/:orgSlug/marketing/:view?

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Grid, Card, CardContent, Button, Chip, Avatar,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  TextField, MenuItem, Select, FormControl, InputLabel, Dialog,
  DialogTitle, DialogContent, DialogActions, IconButton, Tooltip,
  Alert, Snackbar, CircularProgress, LinearProgress, Divider, Paper,
  Badge,
} from '@mui/material';

// MUI Icons
import DashboardIcon           from '@mui/icons-material/DashboardOutlined';
import CampaignIcon            from '@mui/icons-material/CampaignOutlined';
import PeopleIcon              from '@mui/icons-material/PeopleOutlined';
import BrushIcon               from '@mui/icons-material/BrushOutlined';
import AutoModeIcon            from '@mui/icons-material/AutoModeOutlined';
import CellTowerIcon           from '@mui/icons-material/CellTowerOutlined';
import BarChartIcon            from '@mui/icons-material/BarChartOutlined';
import AbcIcon                 from '@mui/icons-material/AbcOutlined';
import CalendarMonthIcon       from '@mui/icons-material/CalendarMonthOutlined';
import SettingsIcon            from '@mui/icons-material/SettingsOutlined';
import PaymentsIcon            from '@mui/icons-material/PaymentsOutlined';
import ArrowBackIcon           from '@mui/icons-material/ArrowBackOutlined';
import AddIcon                 from '@mui/icons-material/Add';
import ElectricBoltIcon        from '@mui/icons-material/ElectricBolt';
import EmailIcon               from '@mui/icons-material/EmailOutlined';
import SmsIcon                 from '@mui/icons-material/SmsOutlined';
import NotificationsIcon       from '@mui/icons-material/NotificationsOutlined';
import ShareIcon               from '@mui/icons-material/ShareOutlined';
import CheckCircleIcon         from '@mui/icons-material/CheckCircle';
import WarningIcon             from '@mui/icons-material/WarningAmberOutlined';
import ErrorIcon               from '@mui/icons-material/ErrorOutlined';
import TrendingUpIcon          from '@mui/icons-material/TrendingUpOutlined';
import RefreshIcon             from '@mui/icons-material/RefreshOutlined';
import OpenInNewIcon           from '@mui/icons-material/OpenInNewOutlined';

import { organizationApi }     from '../services/enterpriseApi';
import {
  mktOverviewApi, mktCampaignsApi, mktSegmentsApi,
  mktAutomationsApi, mktChannelsApi, mktCalendarApi,
  mktABTestsApi, mktSettingsApi,
  type MktCampaign, type MktSegment, type MktAutomation,
  type MktChannel, type MktCalendarEvent, type MktOverview,
  type MktCampaignPayload,
} from '../services/marketingWorkspaceApi';
import { dashboardTokens, dashboardSemanticColors } from '../styles/dashboardDesignSystem';
import DashboardTopBar from '../components/Layout/DashboardTopBar';

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  bg:     dashboardTokens.colors.background,
  card:   dashboardTokens.colors.surface,
  card2:  dashboardTokens.colors.surfaceSubtle,
  border: dashboardTokens.colors.border,
  text:   dashboardTokens.colors.textPrimary,
  sub:    dashboardTokens.colors.textSecondary,
  brand:  dashboardTokens.colors.brandPrimary,
  green:  dashboardSemanticColors.success,
  yellow: dashboardSemanticColors.warning,
  red:    dashboardSemanticColors.danger,
  blue:   '#3b82f6',
  purple: '#8b5cf6',
  sidebar: '#0d1117',
  font:   '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

// ── Sidebar nav ───────────────────────────────────────────────────────────────
type MktView =
  | 'overview' | 'campaigns' | 'audience' | 'content'
  | 'automation' | 'channels' | 'analytics' | 'abtesting'
  | 'calendar' | 'settings' | 'billing';

const NAV: { key: MktView; label: string; icon: React.ReactNode }[] = [
  { key: 'overview',    label: 'Overview',        icon: <DashboardIcon /> },
  { key: 'campaigns',   label: 'Campaigns',       icon: <CampaignIcon /> },
  { key: 'audience',    label: 'Audience',        icon: <PeopleIcon /> },
  { key: 'content',     label: 'Content Studio',  icon: <BrushIcon /> },
  { key: 'automation',  label: 'Automation',      icon: <AutoModeIcon /> },
  { key: 'channels',    label: 'Channels',        icon: <CellTowerIcon /> },
  { key: 'analytics',   label: 'Analytics',       icon: <BarChartIcon /> },
  { key: 'abtesting',   label: 'A/B Testing',     icon: <AbcIcon /> },
  { key: 'calendar',    label: 'Calendar',        icon: <CalendarMonthIcon /> },
  { key: 'settings',    label: 'Settings',        icon: <SettingsIcon /> },
  { key: 'billing',     label: 'Billing',         icon: <PaymentsIcon /> },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtNum = (n: number) => n?.toLocaleString() ?? '0';
const fmtPct = (n: number) => `${(n ?? 0).toFixed(1)}%`;

const statusColor: Record<string, string> = {
  draft: T.sub, scheduled: T.blue, sending: T.brand,
  sent: T.green, paused: T.yellow, cancelled: T.red, error: T.red,
  running: T.green, completed: T.sub,
  active: T.green, error_ch: T.red, unconfigured: T.yellow, disconnected: T.sub,
};

function StatusChip({ status }: { status: string }) {
  const color = statusColor[status] ?? T.sub;
  return (
    <Chip label={status.toUpperCase()} size="small"
      sx={{ bgcolor: `${color}22`, color, fontWeight: 700, fontSize: '.7rem', height: 20, borderRadius: 1 }} />
  );
}

function MetricCard({ label, value, sub, color = T.brand }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <Card sx={{ bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 2, p: 2 }}>
      <Typography variant="caption" sx={{ color: T.sub, display: 'block', mb: 0.5 }}>{label}</Typography>
      <Typography variant="h5" sx={{ color, fontWeight: 800, lineHeight: 1 }}>{value}</Typography>
      {sub && <Typography variant="caption" sx={{ color: T.sub }}>{sub}</Typography>}
    </Card>
  );
}

// ── Section placeholder for sections not yet fully built ──────────────────────
function ComingSoon({ title, icon }: { title: string; icon: React.ReactNode }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 12, color: T.sub }}>
      <Box sx={{ fontSize: '3rem', mb: 2, opacity: .3 }}>{icon}</Box>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>{title}</Typography>
      <Typography variant="body2">This section is under development.</Typography>
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// OVERVIEW
// ═══════════════════════════════════════════════════════════════════════════════
function MarketingOverview({ orgId, orgSlug, navigate }: { orgId: string; orgSlug: string; navigate: ReturnType<typeof useNavigate> }) {
  const [data, setData] = useState<MktOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    mktOverviewApi.get(orgId).then(setData).catch(() => null).finally(() => setLoading(false));
  }, [orgId]);

  if (loading) return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress sx={{ color: T.brand }} /></Box>;

  const s = data?.stats;

  const quickActions = [
    { label: 'New Campaign', view: 'campaigns', icon: <CampaignIcon sx={{ fontSize: '1rem' }} /> },
    { label: 'New Segment',  view: 'audience',  icon: <PeopleIcon sx={{ fontSize: '1rem' }} /> },
    { label: 'New Automation', view: 'automation', icon: <AutoModeIcon sx={{ fontSize: '1rem' }} /> },
  ];

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700, color: T.text, mb: 0.5 }}>
        Marketing Overview
      </Typography>
      <Typography variant="body2" sx={{ color: T.sub, mb: 3 }}>
        Your marketing command center — campaigns, audience, and performance at a glance.
      </Typography>

      {/* KPI row */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Total Campaigns',    value: fmtNum(s?.total_campaigns ?? 0),    color: T.brand },
          { label: 'Active Campaigns',   value: fmtNum(s?.active_campaigns ?? 0),   color: T.green },
          { label: 'Audience Size',      value: fmtNum(s?.audience_size ?? 0),      color: T.blue },
          { label: 'Active Automations', value: fmtNum(s?.active_automations ?? 0), color: T.purple },
          { label: 'Total Sent',         value: fmtNum(s?.total_sent ?? 0),         color: T.text },
          { label: 'Open Rate',          value: fmtPct(s?.open_rate ?? 0),          color: T.green },
          { label: 'Click Rate',         value: fmtPct(s?.click_rate ?? 0),         color: T.blue },
          { label: 'Bounce Rate',        value: fmtPct(s?.bounce_rate ?? 0),        color: (s?.bounce_rate ?? 0) > 5 ? T.red : T.sub },
        ].map(m => (
          <Grid key={m.label} item xs={6} sm={4} md={3}>
            <MetricCard label={m.label} value={m.value} color={m.color} />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {/* Recent campaigns */}
        <Grid item xs={12} lg={8}>
          <Card sx={{ bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 2, height: '100%' }}>
            <Box sx={{ px: 2.5, pt: 2.5, pb: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography sx={{ fontWeight: 700, color: T.text }}>Recent Campaigns</Typography>
              <Button size="small" endIcon={<OpenInNewIcon sx={{ fontSize: '.85rem' }} />}
                sx={{ color: T.brand, fontSize: '.78rem' }} onClick={() => navigate(`/enterprise/${orgSlug}/marketing/campaigns`)}>
                View All
              </Button>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {['Campaign', 'Channel', 'Status', 'Sent', 'Opens', 'Clicks'].map(h => (
                      <TableCell key={h} sx={{ color: T.sub, borderColor: T.border, fontSize: '.75rem', fontWeight: 700 }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(data?.recent_campaigns ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} sx={{ textAlign: 'center', color: T.sub, py: 4, border: 'none' }}>
                        No campaigns yet — <Button size="small" sx={{ color: T.brand }} onClick={() => navigate(`/enterprise/${orgSlug}/marketing/campaigns`)}>create one</Button>
                      </TableCell>
                    </TableRow>
                  ) : (data?.recent_campaigns ?? []).map(c => (
                    <TableRow key={c.resource_id} sx={{ '&:hover': { bgcolor: `${T.brand}08` }, '& td': { borderColor: T.border } }}>
                      <TableCell sx={{ color: T.text, fontWeight: 600, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</TableCell>
                      <TableCell sx={{ color: T.sub, textTransform: 'capitalize' }}>{c.channel}</TableCell>
                      <TableCell><StatusChip status={c.status} /></TableCell>
                      <TableCell sx={{ color: T.sub }}>{fmtNum(c.analytics?.total_sent ?? 0)}</TableCell>
                      <TableCell sx={{ color: T.green }}>{fmtPct(c.analytics?.open_rate ?? 0)}</TableCell>
                      <TableCell sx={{ color: T.blue }}>{fmtPct(c.analytics?.click_rate ?? 0)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Grid>

        {/* Channel health */}
        <Grid item xs={12} lg={4}>
          <Card sx={{ bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 2, p: 2.5, height: '100%' }}>
            <Typography sx={{ fontWeight: 700, color: T.text, mb: 2 }}>Channel Health</Typography>
            {(data?.channel_health ?? []).length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4, color: T.sub }}>
                <CellTowerIcon sx={{ fontSize: '2rem', opacity: .3, mb: 1 }} />
                <Typography variant="body2">No channels configured</Typography>
                <Button size="small" sx={{ color: T.brand, mt: 1 }} onClick={() => navigate(`/enterprise/${orgSlug}/marketing/channels`)}>
                  Configure Channels
                </Button>
              </Box>
            ) : (data?.channel_health ?? []).map(ch => (
              <Box key={ch.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.25, borderBottom: `1px solid ${T.border}`, '&:last-child': { borderBottom: 'none' } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {ch.channel_type === 'email' ? <EmailIcon sx={{ fontSize: '1rem', color: T.brand }} />
                    : ch.channel_type === 'sms' ? <SmsIcon sx={{ fontSize: '1rem', color: T.blue }} />
                    : ch.channel_type === 'push' ? <NotificationsIcon sx={{ fontSize: '1rem', color: T.purple }} />
                    : <ShareIcon sx={{ fontSize: '1rem', color: T.green }} />}
                  <Box>
                    <Typography variant="body2" sx={{ color: T.text, fontWeight: 600, lineHeight: 1.2 }}>{ch.name}</Typography>
                    <Typography variant="caption" sx={{ color: T.sub, textTransform: 'capitalize' }}>{ch.channel_type} · {ch.provider}</Typography>
                  </Box>
                </Box>
                {ch.status === 'active' ? <CheckCircleIcon sx={{ color: T.green, fontSize: '1.1rem' }} />
                  : ch.status === 'error' ? <ErrorIcon sx={{ color: T.red, fontSize: '1.1rem' }} />
                  : <WarningIcon sx={{ color: T.yellow, fontSize: '1.1rem' }} />}
              </Box>
            ))}
          </Card>
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Card sx={{ bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 2, p: 2.5 }}>
        <Typography sx={{ fontWeight: 700, color: T.text, mb: 2 }}>Quick Actions</Typography>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          {quickActions.map(a => (
            <Button key={a.label} variant="outlined" size="small"
              startIcon={a.icon}
              sx={{ borderColor: T.border, color: T.text, borderRadius: 2, '&:hover': { borderColor: T.brand, color: T.brand } }}
              onClick={() => navigate(`/enterprise/${orgSlug}/marketing/${a.view}`)}>
              {a.label}
            </Button>
          ))}
        </Box>
      </Card>
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CAMPAIGNS
// ═══════════════════════════════════════════════════════════════════════════════
const CAMPAIGN_TYPES = ['regular', 'ab_test', 'automated', 'rss'];
const CHANNELS = ['email', 'sms', 'social', 'push', 'multi', 'ads'];

function CampaignsView({ orgId }: { orgId: string }) {
  const [campaigns, setCampaigns]   = useState<MktCampaign[]>([]);
  const [loading, setLoading]       = useState(true);
  const [open, setOpen]             = useState(false);
  const [creating, setCreating]     = useState(false);
  const [snack, setSnack]           = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterChannel, setFilterChannel] = useState('');

  // form state
  const [form, setForm] = useState<MktCampaignPayload>({
    name: '', campaign_type: 'regular', channel: 'email',
    objective: '', from_name: '', from_email: '', subject: '',
  });

  const load = useCallback(() => {
    if (!orgId) return;
    setLoading(true);
    mktCampaignsApi.list(orgId, {
      status: filterStatus || undefined,
      channel: filterChannel || undefined,
    }).then(setCampaigns).catch(() => null).finally(() => setLoading(false));
  }, [orgId, filterStatus, filterChannel]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setCreating(true);
    try {
      const c = await mktCampaignsApi.create(orgId, form);
      setCampaigns(p => [c, ...p]);
      setSnack(`Campaign "${c.name}" created.`);
      setOpen(false);
      setForm({ name: '', campaign_type: 'regular', channel: 'email', objective: '', from_name: '', from_email: '', subject: '' });
    } catch { setSnack('Failed to create campaign.'); }
    finally { setCreating(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete campaign "${name}"?`)) return;
    await mktCampaignsApi.delete(orgId, id);
    setCampaigns(p => p.filter(c => c.resource_id !== id));
    setSnack('Campaign deleted.');
  };

  const filtered = campaigns.filter(c =>
    (!filterStatus || c.status === filterStatus) &&
    (!filterChannel || c.channel === filterChannel),
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: T.text }}>Campaigns</Typography>
          <Typography variant="body2" sx={{ color: T.sub, mt: 0.5 }}>{filtered.length} campaign{filtered.length !== 1 ? 's' : ''}</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}
          sx={{ bgcolor: T.brand, borderRadius: 2, '&:hover': { bgcolor: T.brand, opacity: .85 } }}>
          New Campaign
        </Button>
      </Box>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 2.5, flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Status</InputLabel>
          <Select value={filterStatus} label="Status" onChange={e => setFilterStatus(e.target.value)}>
            <MenuItem value="">All Statuses</MenuItem>
            {['draft','scheduled','sending','sent','paused','cancelled','error'].map(s => (
              <MenuItem key={s} value={s} sx={{ textTransform: 'capitalize' }}>{s}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Channel</InputLabel>
          <Select value={filterChannel} label="Channel" onChange={e => setFilterChannel(e.target.value)}>
            <MenuItem value="">All Channels</MenuItem>
            {CHANNELS.map(c => <MenuItem key={c} value={c} sx={{ textTransform: 'capitalize' }}>{c}</MenuItem>)}
          </Select>
        </FormControl>
        <Tooltip title="Refresh"><IconButton size="small" onClick={load} sx={{ color: T.sub }}><RefreshIcon /></IconButton></Tooltip>
      </Box>

      {loading ? (
        <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress sx={{ color: T.brand }} /></Box>
      ) : filtered.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 10, color: T.sub }}>
          <CampaignIcon sx={{ fontSize: '3rem', opacity: .3, mb: 1.5 }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>No campaigns yet</Typography>
          <Button variant="outlined" startIcon={<AddIcon />} sx={{ mt: 2, borderColor: T.brand, color: T.brand }} onClick={() => setOpen(true)}>
            Create Your First Campaign
          </Button>
        </Box>
      ) : (
        <Card sx={{ bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 2 }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['Name', 'Type', 'Channel', 'Status', 'Sent', 'Opens', 'Clicks', 'Created', ''].map(h => (
                    <TableCell key={h} sx={{ color: T.sub, borderColor: T.border, fontWeight: 700, fontSize: '.75rem' }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map(c => (
                  <TableRow key={c.resource_id} hover sx={{ '& td': { borderColor: T.border }, '&:hover': { bgcolor: `${T.brand}06` } }}>
                    <TableCell sx={{ color: T.text, fontWeight: 600 }}>{c.name}</TableCell>
                    <TableCell sx={{ color: T.sub, textTransform: 'capitalize' }}>{c.campaign_type}</TableCell>
                    <TableCell sx={{ color: T.sub, textTransform: 'capitalize' }}>{c.channel}</TableCell>
                    <TableCell><StatusChip status={c.status} /></TableCell>
                    <TableCell sx={{ color: T.sub }}>{fmtNum(c.analytics?.total_sent ?? 0)}</TableCell>
                    <TableCell sx={{ color: T.green }}>{fmtPct(c.analytics?.open_rate ?? 0)}</TableCell>
                    <TableCell sx={{ color: T.blue }}>{fmtPct(c.analytics?.click_rate ?? 0)}</TableCell>
                    <TableCell sx={{ color: T.sub, fontSize: '.75rem' }}>{new Date(c.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Button size="small" sx={{ color: T.red, fontSize: '.72rem', minWidth: 0, px: 1 }}
                        onClick={() => handleDelete(c.resource_id, c.name)}>Delete</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={open} onClose={() => !creating && setOpen(false)}
        PaperProps={{ sx: { bgcolor: T.card, border: `1px solid ${T.border}`, minWidth: 500 } }}>
        <DialogTitle sx={{ color: T.text, fontWeight: 700 }}>New Campaign</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
          <TextField label="Campaign Name *" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} size="small" fullWidth autoFocus />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl size="small" fullWidth>
              <InputLabel>Type</InputLabel>
              <Select value={form.campaign_type} label="Type" onChange={e => setForm(p => ({ ...p, campaign_type: e.target.value }))}>
                {CAMPAIGN_TYPES.map(t => <MenuItem key={t} value={t} sx={{ textTransform: 'capitalize' }}>{t.replace('_', ' ')}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel>Channel</InputLabel>
              <Select value={form.channel} label="Channel" onChange={e => setForm(p => ({ ...p, channel: e.target.value }))}>
                {CHANNELS.map(c => <MenuItem key={c} value={c} sx={{ textTransform: 'capitalize' }}>{c}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>
          <TextField label="Objective" value={form.objective} onChange={e => setForm(p => ({ ...p, objective: e.target.value }))} size="small" fullWidth />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField label="From Name" value={form.from_name} onChange={e => setForm(p => ({ ...p, from_name: e.target.value }))} size="small" fullWidth />
            <TextField label="From Email" value={form.from_email} onChange={e => setForm(p => ({ ...p, from_email: e.target.value }))} size="small" fullWidth />
          </Box>
          <TextField label="Subject Line" value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} size="small" fullWidth />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)} disabled={creating} sx={{ color: T.sub }}>Cancel</Button>
          <Button variant="contained" sx={{ bgcolor: T.brand }} disabled={creating || !form.name.trim()} onClick={handleCreate}
            startIcon={creating ? <CircularProgress size={14} sx={{ color: 'white' }} /> : <AddIcon />}>
            {creating ? 'Creating…' : 'Create Campaign'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snack} autoHideDuration={3500} onClose={() => setSnack('')} message={snack} />
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIENCE
// ═══════════════════════════════════════════════════════════════════════════════
function AudienceView({ orgId }: { orgId: string }) {
  const [segments, setSegments] = useState<MktSegment[]>([]);
  const [loading, setLoading]   = useState(true);
  const [open, setOpen]         = useState(false);
  const [name, setName]         = useState('');
  const [type, setType]         = useState<'dynamic' | 'static'>('dynamic');
  const [desc, setDesc]         = useState('');
  const [snack, setSnack]       = useState('');

  useEffect(() => {
    if (!orgId) return;
    mktSegmentsApi.list(orgId).then(setSegments).catch(() => null).finally(() => setLoading(false));
  }, [orgId]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      const seg = await mktSegmentsApi.create(orgId, { name: name.trim(), description: desc, segment_type: type });
      setSegments(p => [...p, seg]);
      setSnack(`Segment "${seg.name}" created.`);
      setOpen(false); setName(''); setDesc('');
    } catch { setSnack('Failed to create segment.'); }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: T.text }}>Audience</Typography>
          <Typography variant="body2" sx={{ color: T.sub, mt: 0.5 }}>Segments, contact lists, and audience insights</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}
          sx={{ bgcolor: T.brand, borderRadius: 2, '&:hover': { bgcolor: T.brand, opacity: .85 } }}>
          New Segment
        </Button>
      </Box>

      {loading ? <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress sx={{ color: T.brand }} /></Box>
        : segments.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 10, color: T.sub }}>
            <PeopleIcon sx={{ fontSize: '3rem', opacity: .3, mb: 1.5 }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>No segments yet</Typography>
            <Button variant="outlined" startIcon={<AddIcon />} sx={{ mt: 2, borderColor: T.brand, color: T.brand }} onClick={() => setOpen(true)}>
              Create First Segment
            </Button>
          </Box>
        ) : (
          <Grid container spacing={2}>
            {segments.map(seg => (
              <Grid key={seg.id} item xs={12} sm={6} md={4}>
                <Card sx={{ bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 2, p: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
                    <Typography sx={{ color: T.text, fontWeight: 700 }}>{seg.name}</Typography>
                    <Chip label={seg.segment_type} size="small"
                      sx={{ bgcolor: seg.segment_type === 'dynamic' ? `${T.blue}22` : `${T.purple}22`,
                        color: seg.segment_type === 'dynamic' ? T.blue : T.purple,
                        fontWeight: 600, fontSize: '.68rem', height: 20 }} />
                  </Box>
                  {seg.description && <Typography variant="body2" sx={{ color: T.sub, mb: 1.5, fontSize: '.82rem' }}>{seg.description}</Typography>}
                  <Divider sx={{ borderColor: T.border, my: 1.5 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" sx={{ color: T.sub }}>
                      <strong style={{ color: T.text }}>{fmtNum(seg.contact_count)}</strong> contacts
                    </Typography>
                    <StatusChip status={seg.is_active ? 'active' : 'paused'} />
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

      <Dialog open={open} onClose={() => setOpen(false)} PaperProps={{ sx: { bgcolor: T.card, border: `1px solid ${T.border}`, minWidth: 420 } }}>
        <DialogTitle sx={{ color: T.text, fontWeight: 700 }}>New Segment</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
          <TextField label="Segment Name *" value={name} onChange={e => setName(e.target.value)} size="small" fullWidth autoFocus />
          <FormControl size="small" fullWidth>
            <InputLabel>Type</InputLabel>
            <Select value={type} label="Type" onChange={e => setType(e.target.value as 'dynamic' | 'static')}>
              <MenuItem value="dynamic">Dynamic (auto-updates)</MenuItem>
              <MenuItem value="static">Static (fixed list)</MenuItem>
            </Select>
          </FormControl>
          <TextField label="Description" value={desc} onChange={e => setDesc(e.target.value)} size="small" fullWidth multiline rows={2} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)} sx={{ color: T.sub }}>Cancel</Button>
          <Button variant="contained" sx={{ bgcolor: T.brand }} disabled={!name.trim()} onClick={handleCreate} startIcon={<AddIcon />}>Create</Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={!!snack} autoHideDuration={3500} onClose={() => setSnack('')} message={snack} />
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUTOMATION
// ═══════════════════════════════════════════════════════════════════════════════
const TRIGGER_TYPES = [
  'welcome_series', 'abandoned_cart', 'lead_nurture', 're_engagement',
  'birthday', 'anniversary', 'custom', 'form_submit', 'tag_added', 'purchase',
];

function AutomationView({ orgId }: { orgId: string }) {
  const [automations, setAutomations] = useState<MktAutomation[]>([]);
  const [loading, setLoading]         = useState(true);
  const [open, setOpen]               = useState(false);
  const [name, setName]               = useState('');
  const [trigger, setTrigger]         = useState('welcome_series');
  const [desc, setDesc]               = useState('');
  const [creating, setCreating]       = useState(false);
  const [snack, setSnack]             = useState('');

  useEffect(() => {
    if (!orgId) return;
    mktAutomationsApi.list(orgId).then(setAutomations).catch(() => null).finally(() => setLoading(false));
  }, [orgId]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const a = await mktAutomationsApi.create(orgId, { name: name.trim(), trigger, description: desc });
      setAutomations(p => [...p, a]);
      setSnack(`Automation "${a.name}" created.`);
      setOpen(false); setName(''); setDesc('');
    } catch { setSnack('Failed to create automation.'); }
    finally { setCreating(false); }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: T.text }}>Automation</Typography>
          <Typography variant="body2" sx={{ color: T.sub, mt: 0.5 }}>Workflows, triggers, and automated journeys</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}
          sx={{ bgcolor: T.brand, borderRadius: 2, '&:hover': { bgcolor: T.brand, opacity: .85 } }}>
          New Automation
        </Button>
      </Box>

      {loading ? <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress sx={{ color: T.brand }} /></Box>
        : automations.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 10, color: T.sub }}>
            <AutoModeIcon sx={{ fontSize: '3rem', opacity: .3, mb: 1.5 }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>No automations yet</Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>Automate your marketing with triggers and workflows.</Typography>
            <Button variant="outlined" startIcon={<AddIcon />} sx={{ borderColor: T.brand, color: T.brand }} onClick={() => setOpen(true)}>
              Create First Automation
            </Button>
          </Box>
        ) : (
          <Grid container spacing={2}>
            {automations.map(a => (
              <Grid key={a.resource_id} item xs={12} md={6}>
                <Card sx={{ bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 2, p: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    <Box sx={{ width: 36, height: 36, borderRadius: '50%', bgcolor: `${T.purple}22`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ElectricBoltIcon sx={{ color: T.purple, fontSize: '1rem' }} />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ color: T.text, fontWeight: 700, lineHeight: 1.2 }}>{a.name}</Typography>
                      <Typography variant="caption" sx={{ color: T.sub, textTransform: 'capitalize' }}>
                        Trigger: {a.trigger.replace(/_/g, ' ')}
                      </Typography>
                    </Box>
                    <StatusChip status={a.is_active ? 'active' : 'paused'} />
                  </Box>
                  {a.description && <Typography variant="body2" sx={{ color: T.sub, fontSize: '.82rem' }}>{a.description}</Typography>}
                  <Divider sx={{ borderColor: T.border, my: 1.5 }} />
                  <Typography variant="caption" sx={{ color: T.sub }}>{a.steps?.length ?? 0} step{(a.steps?.length ?? 0) !== 1 ? 's' : ''}</Typography>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

      <Dialog open={open} onClose={() => !creating && setOpen(false)} PaperProps={{ sx: { bgcolor: T.card, border: `1px solid ${T.border}`, minWidth: 420 } }}>
        <DialogTitle sx={{ color: T.text, fontWeight: 700 }}>New Automation</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
          <TextField label="Automation Name *" value={name} onChange={e => setName(e.target.value)} size="small" fullWidth autoFocus />
          <FormControl size="small" fullWidth>
            <InputLabel>Trigger</InputLabel>
            <Select value={trigger} label="Trigger" onChange={e => setTrigger(e.target.value)}>
              {TRIGGER_TYPES.map(t => <MenuItem key={t} value={t} sx={{ textTransform: 'capitalize' }}>{t.replace(/_/g, ' ')}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField label="Description" value={desc} onChange={e => setDesc(e.target.value)} size="small" fullWidth multiline rows={2} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)} disabled={creating} sx={{ color: T.sub }}>Cancel</Button>
          <Button variant="contained" sx={{ bgcolor: T.brand }} disabled={creating || !name.trim()} onClick={handleCreate}
            startIcon={creating ? <CircularProgress size={14} sx={{ color: 'white' }} /> : <AddIcon />}>
            {creating ? 'Creating…' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={!!snack} autoHideDuration={3500} onClose={() => setSnack('')} message={snack} />
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHANNELS
// ═══════════════════════════════════════════════════════════════════════════════
const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  email: <EmailIcon />, sms: <SmsIcon />,
  push: <NotificationsIcon />, social: <ShareIcon />, ads: <BarChartIcon />,
};

function ChannelsView({ orgId }: { orgId: string }) {
  const [channels, setChannels] = useState<MktChannel[]>([]);
  const [loading, setLoading]   = useState(true);
  const [snack, setSnack]       = useState('');

  useEffect(() => {
    if (!orgId) return;
    mktChannelsApi.list(orgId).then(setChannels).catch(() => null).finally(() => setLoading(false));
  }, [orgId]);

  const CONFIGURED = [
    { type: 'email', label: 'Email', desc: 'SMTP, domain verification, DKIM/SPF, sender profiles' },
    { type: 'sms',   label: 'SMS',   desc: 'Provider integration, sender ID, country rules' },
    { type: 'social',label: 'Social', desc: 'Facebook, Instagram, LinkedIn, TikTok, Twitter/X' },
    { type: 'push',  label: 'Push Notifications', desc: 'App tokens, web push keys' },
    { type: 'ads',   label: 'Ads',   desc: 'Google Ads, Meta Ads (coming soon)' },
  ];

  const getChannelStatus = (type: string) => {
    const ch = channels.find(c => c.channel_type === type);
    return ch ? ch.status : 'unconfigured';
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700, color: T.text, mb: 0.5 }}>Channels</Typography>
      <Typography variant="body2" sx={{ color: T.sub, mb: 3 }}>Configure and manage your marketing channels</Typography>

      {loading ? <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress sx={{ color: T.brand }} /></Box>
        : (
          <Grid container spacing={2}>
            {CONFIGURED.map(cfg => {
              const status = getChannelStatus(cfg.type);
              const configured = channels.find(c => c.channel_type === cfg.type);
              return (
                <Grid key={cfg.type} item xs={12} sm={6} md={4}>
                  <Card sx={{ bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 2, p: 2.5,
                    transition: 'border-color .2s', '&:hover': { borderColor: T.brand } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                      <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: `${T.brand}18`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.brand }}>
                        {CHANNEL_ICONS[cfg.type] ?? <CellTowerIcon />}
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography sx={{ color: T.text, fontWeight: 700 }}>{cfg.label}</Typography>
                        <StatusChip status={status} />
                      </Box>
                    </Box>
                    <Typography variant="body2" sx={{ color: T.sub, fontSize: '.82rem', mb: 2 }}>{cfg.desc}</Typography>
                    {configured && <Typography variant="caption" sx={{ color: T.sub, display: 'block', mb: 1.5 }}>
                      Provider: {configured.provider || '—'} · Last checked: {configured.last_checked ? new Date(configured.last_checked).toLocaleDateString() : 'Never'}
                    </Typography>}
                    <Button fullWidth variant="outlined" size="small"
                      sx={{ borderColor: T.border, color: status === 'active' ? T.brand : T.text,
                        '&:hover': { borderColor: T.brand }, borderRadius: 1.5 }}
                      onClick={() => setSnack(`${cfg.label} channel configuration coming soon.`)}>
                      {status === 'active' ? 'Manage' : status === 'unconfigured' ? 'Configure' : 'Reconnect'}
                    </Button>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}

      <Snackbar open={!!snack} autoHideDuration={3500} onClose={() => setSnack('')} message={snack} />
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CALENDAR
// ═══════════════════════════════════════════════════════════════════════════════
function CalendarView({ orgId }: { orgId: string }) {
  const [events, setEvents]   = useState<MktCalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    mktCalendarApi.list(orgId).then(setEvents).catch(() => null).finally(() => setLoading(false));
  }, [orgId]);

  const typeColor: Record<string, string> = {
    campaign: T.brand, automation: T.purple, post: T.blue,
    deadline: T.red, other: T.sub,
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700, color: T.text, mb: 0.5 }}>Marketing Calendar</Typography>
      <Typography variant="body2" sx={{ color: T.sub, mb: 3 }}>Scheduled campaigns, posts, and team deadlines</Typography>

      {loading ? <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress sx={{ color: T.brand }} /></Box>
        : events.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 10, color: T.sub }}>
            <CalendarMonthIcon sx={{ fontSize: '3rem', opacity: .3, mb: 1.5 }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>No events scheduled</Typography>
            <Typography variant="body2">Campaigns and automations will appear here when scheduled.</Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {events.sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()).map(ev => (
              <Paper key={ev.id} sx={{ p: 2, bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 2,
                borderLeft: `4px solid ${typeColor[ev.event_type] ?? T.sub}` }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography sx={{ color: T.text, fontWeight: 700, fontSize: '.95rem' }}>{ev.title}</Typography>
                    {ev.description && <Typography variant="caption" sx={{ color: T.sub }}>{ev.description}</Typography>}
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="caption" sx={{ color: T.sub, display: 'block' }}>
                      {new Date(ev.start_at).toLocaleDateString()} {new Date(ev.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Typography>
                    <Chip label={ev.event_type} size="small" sx={{ bgcolor: `${typeColor[ev.event_type]}22`, color: typeColor[ev.event_type], fontWeight: 600, fontSize: '.68rem', height: 18 }} />
                  </Box>
                </Box>
              </Paper>
            ))}
          </Box>
        )}
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════════════════════════════════════
function SettingsView({ orgId }: { orgId: string }) {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [snack, setSnack]       = useState('');

  useEffect(() => {
    if (!orgId) return;
    mktSettingsApi.get(orgId).then(setSettings).catch(() => null).finally(() => setLoading(false));
  }, [orgId]);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const updated = await mktSettingsApi.update(orgId, settings);
      setSettings(updated);
      setSnack('Settings saved.');
    } catch { setSnack('Failed to save settings.'); }
    finally { setSaving(false); }
  };

  if (loading) return <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress sx={{ color: T.brand }} /></Box>;

  return (
    <Box sx={{ maxWidth: 680 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, color: T.text, mb: 0.5 }}>Workspace Settings</Typography>
      <Typography variant="body2" sx={{ color: T.sub, mb: 3 }}>Brand defaults, sender profiles, and compliance settings.</Typography>

      {!settings ? (
        <Alert severity="info">No settings found. They will be created on first save.</Alert>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Card sx={{ bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 2, p: 2.5 }}>
            <Typography sx={{ fontWeight: 700, color: T.text, mb: 2 }}>Default Sender</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField label="From Name" value={settings.default_from_name ?? ''} size="small" fullWidth
                onChange={e => setSettings((p: any) => ({ ...p, default_from_name: e.target.value }))} />
              <TextField label="From Email" value={settings.default_from_email ?? ''} size="small" fullWidth
                onChange={e => setSettings((p: any) => ({ ...p, default_from_email: e.target.value }))} />
              <TextField label="Reply-To" value={settings.default_reply_to ?? ''} size="small" fullWidth
                onChange={e => setSettings((p: any) => ({ ...p, default_reply_to: e.target.value }))} />
            </Box>
          </Card>

          <Card sx={{ bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 2, p: 2.5 }}>
            <Typography sx={{ fontWeight: 700, color: T.text, mb: 2 }}>Brand</Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField label="Brand Color" value={settings.brand_color ?? ''} size="small"
                onChange={e => setSettings((p: any) => ({ ...p, brand_color: e.target.value }))}
                InputProps={{ startAdornment: <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: settings.brand_color ?? T.brand, mr: 1, border: `1px solid ${T.border}` }} /> }} />
              <TextField label="Logo URL" value={settings.logo_url ?? ''} size="small" fullWidth
                onChange={e => setSettings((p: any) => ({ ...p, logo_url: e.target.value }))} />
            </Box>
          </Card>

          <Card sx={{ bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 2, p: 2.5 }}>
            <Typography sx={{ fontWeight: 700, color: T.text, mb: 2 }}>Compliance</Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {[['gdpr_enabled', 'GDPR'], ['popia_enabled', 'POPIA']].map(([key, label]) => (
                <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.5, border: `1px solid ${T.border}`, borderRadius: 2 }}>
                  <Box component="input" type="checkbox"
                    checked={!!settings[key]} onChange={e => setSettings((p: any) => ({ ...p, [key]: e.target.checked }))}
                    style={{ accentColor: T.brand, width: 16, height: 16, cursor: 'pointer' }} />
                  <Typography variant="body2" sx={{ color: T.text, fontWeight: 600 }}>{label} Compliance</Typography>
                </Box>
              ))}
            </Box>
          </Card>

          <Button variant="contained" onClick={handleSave} disabled={saving}
            sx={{ bgcolor: T.brand, alignSelf: 'flex-start', borderRadius: 2, px: 3, '&:hover': { bgcolor: T.brand, opacity: .85 } }}
            startIcon={saving ? <CircularProgress size={14} sx={{ color: 'white' }} /> : undefined}>
            {saving ? 'Saving…' : 'Save Settings'}
          </Button>
        </Box>
      )}

      <Snackbar open={!!snack} autoHideDuration={3500} onClose={() => setSnack('')} message={snack} />
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// BILLING
// ═══════════════════════════════════════════════════════════════════════════════
function BillingView() {
  const tiers = [
    { label: 'Email Credits',   used: 12400, limit: 50000, unit: 'emails',  color: T.brand },
    { label: 'SMS Credits',     used: 820,   limit: 5000,  unit: 'messages',color: T.blue },
    { label: 'Contacts',        used: 3200,  limit: 10000, unit: 'contacts', color: T.purple },
  ];
  return (
    <Box sx={{ maxWidth: 720 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, color: T.text, mb: 0.5 }}>Billing & Usage</Typography>
      <Typography variant="body2" sx={{ color: T.sub, mb: 3 }}>Credit usage, limits, and subscription details.</Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {tiers.map(t => (
          <Grid key={t.label} item xs={12} sm={4}>
            <Card sx={{ bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 2, p: 2.5 }}>
              <Typography variant="caption" sx={{ color: T.sub }}>{t.label}</Typography>
              <Typography variant="h6" sx={{ color: T.text, fontWeight: 700, mt: 0.5 }}>
                {fmtNum(t.used)} <Typography component="span" variant="caption" sx={{ color: T.sub }}>/ {fmtNum(t.limit)}</Typography>
              </Typography>
              <LinearProgress variant="determinate" value={(t.used / t.limit) * 100}
                sx={{ mt: 1.5, mb: 0.5, bgcolor: `${t.color}22`, '& .MuiLinearProgress-bar': { bgcolor: t.color }, borderRadius: 4 }} />
              <Typography variant="caption" sx={{ color: T.sub }}>{((t.used / t.limit) * 100).toFixed(0)}% used · {fmtNum(t.limit - t.used)} remaining</Typography>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card sx={{ bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 2, p: 2.5 }}>
        <Typography sx={{ fontWeight: 700, color: T.text, mb: 2 }}>Current Plan</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography sx={{ color: T.text, fontWeight: 700, fontSize: '1.1rem' }}>Marketing Pro</Typography>
            <Typography variant="body2" sx={{ color: T.sub }}>Billed monthly · Next renewal: Apr 4, 2026</Typography>
          </Box>
          <Chip label="Active" sx={{ bgcolor: `${T.green}22`, color: T.green, fontWeight: 700 }} />
        </Box>
        <Divider sx={{ borderColor: T.border, my: 2 }} />
        <Button variant="outlined" size="small" sx={{ borderColor: T.brand, color: T.brand }}>Upgrade Plan</Button>
      </Card>
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
const MarketingWorkspacePage: React.FC = () => {
  const { orgSlug = '', view = 'overview' } = useParams<{ orgSlug: string; view?: string }>();
  const navigate = useNavigate();

  const [orgId, setOrgId]     = useState('');
  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(true);

  const activeView = (view as MktView) || 'overview';

  // Resolve org
  useEffect(() => {
    if (!orgSlug) return;
    organizationApi.getBySlug(orgSlug)
      .then(org => { setOrgId(org.id || (org as any).resource_id || ''); setOrgName(org.name); })
      .catch(() => navigate('/enterprise'))
      .finally(() => setLoading(false));
  }, [orgSlug, navigate]);

  const goTo = (v: MktView) => navigate(`/enterprise/${orgSlug}/marketing/${v}`);

  if (loading) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: T.bg }}>
        <CircularProgress sx={{ color: T.brand }} />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', bgcolor: T.bg, fontFamily: T.font }}>
      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <Box sx={{
        width: 220, flexShrink: 0, bgcolor: T.sidebar,
        borderRight: `1px solid ${T.border}`,
        display: 'flex', flexDirection: 'column',
        overflowY: 'auto',
      }}>
        {/* Logo / Back */}
        <Box sx={{ px: 2, py: 2.5, borderBottom: `1px solid ${T.border}22` }}>
          <Button startIcon={<ArrowBackIcon sx={{ fontSize: '.85rem' }} />}
            size="small" sx={{ color: T.sub, fontSize: '.75rem', mb: 1.5, px: 0.5, minWidth: 0 }}
            onClick={() => navigate(`/enterprise/${orgSlug}/overview`)}>
            {orgName || 'Organization'}
          </Button>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CampaignIcon sx={{ color: T.brand, fontSize: '1.2rem' }} />
            <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '.95rem', lineHeight: 1.2 }}>
              Marketing
            </Typography>
          </Box>
        </Box>

        {/* Nav items */}
        <Box sx={{ py: 1.5, flex: 1 }}>
          {NAV.map(item => {
            const active = item.key === activeView;
            return (
              <Box key={item.key}
                onClick={() => goTo(item.key)}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1.5,
                  px: 2, py: 1.1, mx: 1, borderRadius: 1.5, cursor: 'pointer',
                  mb: 0.25,
                  bgcolor: active ? `${T.brand}22` : 'transparent',
                  '&:hover': { bgcolor: active ? `${T.brand}22` : 'rgba(255,255,255,.06)' },
                  transition: 'background .15s',
                }}>
                <Box sx={{ color: active ? T.brand : T.sub, fontSize: '1rem', display: 'flex', alignItems: 'center' }}>
                  {item.icon}
                </Box>
                <Typography sx={{ color: active ? '#fff' : T.sub, fontWeight: active ? 600 : 400, fontSize: '.85rem' }}>
                  {item.label}
                </Typography>
                {active && <Box sx={{ ml: 'auto', width: 3, height: 18, bgcolor: T.brand, borderRadius: 4 }} />}
              </Box>
            );
          })}
        </Box>

        {/* Footer */}
        <Box sx={{ px: 2, py: 2, borderTop: `1px solid ${T.border}22` }}>
          <Typography variant="caption" sx={{ color: T.sub + '80', fontSize: '.7rem' }}>
            Marketing Workspace
          </Typography>
        </Box>
      </Box>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* ── Unified top bar ──────────────────────────────────────────── */}
        <DashboardTopBar
          routeBase="/dashboard"
          leftContent={
            <Typography sx={{ color: T.text, fontWeight: 600, fontSize: '.95rem', ml: 0.5 }}>
              {NAV.find(n => n.key === activeView)?.label ?? 'Marketing'}
            </Typography>
          }
          actions={
            <Chip
              label={orgName}
              size="small"
              sx={{ bgcolor: `${T.brand}18`, color: T.brand, fontWeight: 600, fontSize: '.72rem', mr: 0.5 }}
            />
          }
        />

        {/* Scrollable content */}
        <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
          {activeView === 'overview'   && <MarketingOverview orgId={orgId} orgSlug={orgSlug} navigate={navigate} />}
          {activeView === 'campaigns'  && <CampaignsView orgId={orgId} />}
          {activeView === 'audience'   && <AudienceView orgId={orgId} />}
          {activeView === 'content'    && <ComingSoon title="Content Studio" icon={<BrushIcon sx={{ fontSize: 'inherit' }} />} />}
          {activeView === 'automation' && <AutomationView orgId={orgId} />}
          {activeView === 'channels'   && <ChannelsView orgId={orgId} />}
          {activeView === 'analytics'  && <ComingSoon title="Analytics" icon={<BarChartIcon sx={{ fontSize: 'inherit' }} />} />}
          {activeView === 'abtesting'  && <ComingSoon title="A/B Testing" icon={<AbcIcon sx={{ fontSize: 'inherit' }} />} />}
          {activeView === 'calendar'   && <CalendarView orgId={orgId} />}
          {activeView === 'settings'   && <SettingsView orgId={orgId} />}
          {activeView === 'billing'    && <BillingView />}
        </Box>
      </Box>
    </Box>
  );
};

export default MarketingWorkspacePage;
