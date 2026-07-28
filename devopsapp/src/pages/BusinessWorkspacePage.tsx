// OrcaCloud Business Workspace
// Standalone organization control center with own layout and sidebar
// Route: /enterprise/:orgSlug/workspace

import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Avatar, Button, IconButton, Tooltip, Divider,
  Grid, Card, CardContent, CardHeader, Chip, Paper, CircularProgress,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  TextField, Dialog, DialogTitle, DialogContent, DialogActions,
  Tabs, Tab, Alert, Snackbar, FormControl, InputLabel, Select, MenuItem,
  LinearProgress, Switch, FormControlLabel,
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardTopBar from '../components/Layout/DashboardTopBar';
import WorkspaceCreationWizard from '../components/Workspace/WorkspaceCreationWizard';
import {
  listDevWorkspaces,
  startDevWorkspace,
  stopDevWorkspace,
  deleteDevWorkspace,
  type DevWorkspace as DevWs,
} from '../services/devWorkspaceApi';

// Icons
import LaptopIcon from '@mui/icons-material/Laptop';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import MemoryIcon from '@mui/icons-material/Memory';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import BusinessIcon from '@mui/icons-material/Business';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import BillingIcon from '@mui/icons-material/ReceiptLong';
import DomainIcon from '@mui/icons-material/Language';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import CampaignIcon from '@mui/icons-material/Campaign';
import GppGoodIcon from '@mui/icons-material/GppGood';
import ExtensionIcon from '@mui/icons-material/Extension';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import HistoryIcon from '@mui/icons-material/History';
import SettingsIcon from '@mui/icons-material/Settings';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import PowerIcon from '@mui/icons-material/Power';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import HistoryEduIcon from '@mui/icons-material/HistoryEdu';
import LabelIcon from '@mui/icons-material/Label';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import ArticleIcon from '@mui/icons-material/Article';
import PushPinIcon from '@mui/icons-material/PushPin';
import VisibilityIcon from '@mui/icons-material/Visibility';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import StarIcon from '@mui/icons-material/Star';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import StyleIcon from '@mui/icons-material/Style';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import SaveIcon from '@mui/icons-material/Save';
import ViewSidebarIcon from '@mui/icons-material/ViewSidebar';
import FilterListIcon from '@mui/icons-material/FilterList';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import RepeatIcon from '@mui/icons-material/Repeat';
import ReceiptIcon from '@mui/icons-material/Receipt';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import EventIcon from '@mui/icons-material/Event';
import DeveloperModeIcon from '@mui/icons-material/DeveloperMode';

// APIs and types
import {
  organizationApi, membersApi, departmentsApi, orgTeamsApi, orgGroupsApi,
  sendDomainsApi, senderIdentitiesApi, emailTemplatesApi,
  orgDomainsApi, auditLogsApi, enterpriseBillingApi, usageApi,
  integrationsApi, ordersApi, orgSubscriptionsApi, securityPoliciesApi, orgSettingsApi,
  wikiCategoriesApi, wikiPagesApi,
} from '../services/enterpriseApi';
import type {
  OrgData, OrgMember, AuditLogEntry, UsageSummary,
  OrgIntegration, IntegrationLog, IntegrationPayload, IntegrationWebhookEvent,
  OrgOrder, OrgSubscriptionItem, SecurityPolicy, OrgSettings,
  EnterpriseInvoice, Subscription,
  WikiCategory, WikiPageSummary, WikiPage, WikiPageVersion,
} from '../services/enterpriseApi';

// Design
import { dashboardTokens, dashboardSemanticColors } from '../styles/dashboardDesignSystem';
import EnterpriseDocsModule from '../components/Enterprise/EnterpriseDocsModule';

// ── Design tokens ──────────────────────────────────────────────────────────
const T = {
  bg: dashboardTokens.colors.background,
  card: dashboardTokens.colors.surface,
  card2: dashboardTokens.colors.surfaceSubtle,
  border: dashboardTokens.colors.border,
  text: dashboardTokens.colors.textPrimary,
  sub: dashboardTokens.colors.textSecondary,
  brand: dashboardTokens.colors.brandPrimary,
  green: dashboardSemanticColors.success,
  yellow: dashboardSemanticColors.warning,
  red: dashboardSemanticColors.danger,
  blue: '#3b82f6',
  purple: '#8b5cf6',
  font: '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const SIDEBAR_WIDTH = 240;
const SIDEBAR_COLLAPSED_WIDTH = 70;

// ── Module definitions ─────────────────────────────────────────────────────
type WorkspaceModule = 'overview' | 'organization' | 'departments' | 'members' | 'billing' |
  'domains' | 'email' | 'marketing' | 'compliance' | 'integrations' | 'orders' | 'audit' | 'settings' | 'wiki' | 'docs' |
  'meetings' | 'developer-hub' | 'developer';

const VALID_MODULES: WorkspaceModule[] = [
  'overview', 'organization', 'departments', 'members', 'billing',
  'domains', 'email', 'marketing', 'compliance', 'integrations', 'orders', 'audit', 'settings', 'wiki', 'docs',
  'meetings', 'developer-hub', 'developer',
];

const MODULES: Array<{
  key: WorkspaceModule;
  label: string;
  icon: React.ReactNode;
  desc: string;
  enterprisePath: (slug: string) => string;
  externalLink?: boolean;   // true = navigate OUT of workspace to dedicated page
}> = [
  { key: 'overview',     label: 'Overview',     icon: <DashboardIcon />,    desc: 'Organization health & KPIs',           enterprisePath: s => `/enterprise/${s}/overview` },
  { key: 'organization', label: 'Organization', icon: <BusinessIcon />,     desc: 'Profile, identity & branding',         enterprisePath: s => `/enterprise/${s}/organization/overview` },
  { key: 'departments',  label: 'Departments',  icon: <AccountTreeIcon />,  desc: 'Team structure & hierarchy',           enterprisePath: s => `/enterprise/${s}/organization/departments` },
  { key: 'members',      label: 'Members',      icon: <PeopleIcon />,       desc: 'Users, roles & access control',        enterprisePath: s => `/enterprise/${s}/organization/people` },
  { key: 'billing',      label: 'Billing',      icon: <BillingIcon />,      desc: 'Plans, invoices & usage',              enterprisePath: _s => `/billing`, externalLink: true },
  { key: 'domains',      label: 'Domains',      icon: <DomainIcon />,       desc: 'Business domains & DNS health',        enterprisePath: s => `/enterprise/${s}/domains` },
  { key: 'email',        label: 'Email',        icon: <MailOutlineIcon />,  desc: 'Sending domains, senders & templates', enterprisePath: s => `/enterprise/${s}/email` },
  { key: 'marketing',    label: 'Marketing',    icon: <CampaignIcon />,     desc: 'Campaigns, audience & automations',    enterprisePath: s => `/enterprise/${s}/marketing`, externalLink: true },
  { key: 'compliance',   label: 'Compliance',   icon: <GppGoodIcon />,      desc: 'Security policies & audit trail',      enterprisePath: s => `/enterprise/${s}/compliance` },
  { key: 'integrations', label: 'Integrations', icon: <ExtensionIcon />,    desc: 'Connected apps & services',            enterprisePath: s => `/enterprise/${s}/integrations` },
  { key: 'orders',       label: 'Orders',       icon: <ShoppingCartIcon />, desc: 'Order history & subscriptions',        enterprisePath: s => `/enterprise/${s}/orders` },
  { key: 'audit',        label: 'Audit Logs',   icon: <HistoryIcon />,      desc: 'Full activity log & actor trail',      enterprisePath: s => `/enterprise/${s}/compliance` },
  { key: 'settings',     label: 'Settings',     icon: <SettingsIcon />,     desc: 'General, notifications & API keys',    enterprisePath: s => `/enterprise/${s}/settings` },
  { key: 'wiki',         label: 'Wiki',         icon: <MenuBookIcon />,     desc: 'Org knowledge base & documentation',   enterprisePath: s => `/enterprise/${s}/wiki` },
  { key: 'docs',         label: 'Docs',         icon: <AutoStoriesIcon />,    desc: 'Platform docs, runbooks & guides',     enterprisePath: s => `/docs`, externalLink: true },
  { key: 'meetings',     label: 'Meetings',     icon: <EventIcon />,          desc: 'Schedule, join & manage meetings',     enterprisePath: s => `/enterprise/${s}/meetings`,      externalLink: true },
  { key: 'developer-hub', label: 'Developer Hub', icon: <DeveloperModeIcon />, desc: 'APIs, SDKs, webhooks & dev tools',    enterprisePath: s => `/enterprise/${s}/developer-hub`, externalLink: true },
  { key: 'developer',     label: 'Dev Workspaces', icon: <LaptopIcon />,         desc: 'Enterprise-scoped developer workspaces', enterprisePath: s => `/enterprise/${s}/workspace/developer/workspace` },
];

const SIDEBAR_GROUPS: Array<{ label: string; keys: WorkspaceModule[] }> = [
  { label: 'Workspace',            keys: ['overview', 'organization', 'departments', 'members'] },
  { label: 'Finance',              keys: ['billing', 'orders'] },
  { label: 'Domain',               keys: ['domains', 'email', 'marketing', 'meetings'] },
  { label: 'Security & Compliance',keys: ['compliance', 'integrations', 'audit'] },
  { label: 'Resources',            keys: ['settings', 'wiki', 'docs'] },
  { label: 'Developer',            keys: ['developer-hub', 'developer'] },
];

// ── Utility components ─────────────────────────────────────────────────────
function StatusChip({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    ACTIVE: [T.green, 'Active'],
    CONNECTED: [T.green, 'Connected'],
    PENDING: [T.yellow, 'Pending'],
    VERIFIED: [T.green, 'Verified'],
    PAID: [T.green, 'Paid'],
    DUE: [T.yellow, 'Due'],
    TRIAL: [T.yellow, 'Trial'],
    SUSPENDED: [T.red, 'Suspended'],
    FAILED: [T.red, 'Failed'],
    DISCONNECTED: [T.sub, 'Disconnected'],
  };
  const [color, label] = map[status] ?? [T.sub, status];
  return <Chip label={label} size="small" sx={{ bgcolor: `${color}22`, color, fontWeight: 700 }} />;
}

function MetricCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <Card sx={{ bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 2 }}>
      <CardContent sx={{ textAlign: 'center', p: 2 }}>
        <Typography sx={{ fontSize: '2rem', fontWeight: 800, color: color ?? T.brand }}>{value}</Typography>
        <Typography variant="caption" sx={{ color: T.sub, textTransform: 'uppercase', fontSize: '.7rem', fontWeight: 700 }}>{label}</Typography>
      </CardContent>
    </Card>
  );
}

// ── Module sections ────────────────────────────────────────────────────────

function OverviewModule({ org, orgId }: { org: OrgData | null; orgId: string }) {
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    usageApi.summary(orgId)
      .then(setUsage)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [orgId]);

  if (!org) return <Typography color={T.sub}>Loading organization...</Typography>;

  const metrics = [
    { label: 'Members', value: org.member_count || '—', color: T.brand },
    { label: 'Storage', value: usage ? `${usage.storage_gb_used}GB / ${usage.storage_gb_limit || '∞'}GB` : '—', color: T.blue },
    { label: 'Plan', value: org.plan || '—', color: T.green },
    { label: 'Status', value: org.status || '—', color: T.purple },
  ];

  return (
    <Box>
      <Typography sx={{ color: T.text, fontWeight: 700, fontSize: '1.3rem', mb: 3, fontFamily: T.font }}>
        Organization Overview
      </Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {metrics.map(m => (
          <Grid key={m.label} item xs={6} md={3}>
            <MetricCard {...m} />
          </Grid>
        ))}
      </Grid>

      <Card sx={{ bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 2 }}>
        <CardHeader title="Organization Details" />
        <CardContent>
          <Grid container spacing={2}>
            {[
              { label: 'Name', value: org.name },
              { label: 'Industry', value: org.industry || '—' },
              { label: 'Country', value: org.country || '—' },
              { label: 'Domain', value: org.primary_domain || '—' },
            ].map(({ label, value }) => (
              <Grid key={label} item xs={12} sm={6}>
                <Typography variant="caption" sx={{ color: T.sub, display: 'block', mb: 0.5, fontWeight: 600 }}>{label}</Typography>
                <Typography sx={{ color: T.text }}>{value}</Typography>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
}

function OrganizationModule({ org }: { org: OrgData | null }) {
  const [editOpen, setEditOpen] = useState(false);
  const [snack, setSnack] = useState('');

  if (!org) return null;

  const sections = [
    { group: 'Identity', items: [
      { label: 'Organization Name', value: org.name },
      { label: 'Industry', value: org.industry || '—' },
      { label: 'Plan', value: org.plan || '—' },
    ]},
    { group: 'Contact & Location', items: [
      { label: 'Primary Domain', value: org.primary_domain || '—' },
      { label: 'Country', value: org.country || '—' },
      { label: 'Status', value: org.status || '—' },
    ]},
    { group: 'Data & Residency', items: [
      { label: 'Organization ID', value: org.id },
      { label: 'Created', value: org.created_at?.slice(0, 10) || '—' },
      { label: 'Timezone', value: (org as any).timezone || 'UTC' },
    ]},
  ];

  return (
    <Box>
      {/* Primary Value View — Identity Card */}
      <Card sx={{ bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 2, mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            {org.logo_url ? (
              <Box component="img" src={org.logo_url} sx={{ width: 72, height: 72, borderRadius: 2, objectFit: 'contain', border: `2px solid ${T.border}` }} />
            ) : (
              <Avatar sx={{ width: 72, height: 72, bgcolor: T.brand, fontSize: '1.8rem', fontWeight: 800, border: `3px solid ${T.brand}33` }}>
                {org.name?.slice(0, 2).toUpperCase()}
              </Avatar>
            )}
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                <Typography sx={{ color: T.text, fontWeight: 800, fontSize: '1.4rem', fontFamily: T.font }}>{org.name}</Typography>
                <StatusChip status={org.status} />
                {org.plan && <Chip label={org.plan} size="small" sx={{ bgcolor: `${T.brand}20`, color: T.brand, fontWeight: 800 }} />}
              </Box>
              <Typography variant="body2" sx={{ color: T.sub }}>
                {org.primary_domain} &nbsp;·&nbsp; {org.industry} &nbsp;·&nbsp; {org.country}
              </Typography>
            </Box>
            {/* Secondary Actions */}
            <Button variant="outlined" startIcon={<EditIcon />} onClick={() => setEditOpen(true)}
              sx={{ borderColor: T.brand, color: T.brand, '&:hover': { bgcolor: `${T.brand}11` } }}>
              Edit Profile
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Detail Section Grid — Context Panels */}
      <Grid container spacing={2}>
        {sections.map(section => (
          <Grid key={section.group} item xs={12} md={4}>
            <Card sx={{ bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 2, height: '100%' }}>
              <CardHeader title={<Typography sx={{ fontWeight: 700, fontSize: '.95rem', color: T.text }}>{section.group}</Typography>} />
              <CardContent sx={{ pt: 0 }}>
                {section.items.map(item => (
                  <Box key={item.label} sx={{ mb: 2 }}>
                    <Typography variant="caption" sx={{ color: T.sub, fontWeight: 700, textTransform: 'uppercase', fontSize: '.7rem', letterSpacing: '.06em', display: 'block' }}>{item.label}</Typography>
                    <Typography sx={{ color: T.text, mt: 0.25, fontFamily: item.label === 'Organization ID' ? 'monospace' : 'inherit', fontSize: item.label === 'Organization ID' ? '.8rem' : '.95rem', wordBreak: 'break-all' }}>{item.value}</Typography>
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Organization Profile</DialogTitle>
        <DialogContent sx={{ mt: 1 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField label="Organization Name" defaultValue={org.name} fullWidth size="small" />
            <TextField label="Industry" defaultValue={org.industry} fullWidth size="small" />
            <TextField label="Country" defaultValue={org.country} fullWidth size="small" />
            <TextField label="Primary Domain" defaultValue={org.primary_domain} fullWidth size="small" />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button variant="contained" sx={{ bgcolor: T.brand }} onClick={() => { setEditOpen(false); setSnack('Profile updated'); }}>Save Changes</Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack('')} message={snack} />
    </Box>
  );
}

function DepartmentsModule({ orgId }: { orgId: string }) {
  const [depts, setDepts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    departmentsApi.list(orgId)
      .then(setDepts)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [orgId]);

  const deptTeams = (d: any): any[] => d.teams || [];
  const totalTeams = depts.reduce((sum, d) => sum + deptTeams(d).length, 0);

  return (
    <Box sx={{ display: 'flex', gap: 2 }}>
      {/* Primary Value View */}
      <Box sx={{ flex: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="body2" sx={{ color: T.sub }}>
            {depts.length} departments &nbsp;·&nbsp; {totalTeams} teams
          </Typography>
          <Button startIcon={<AddIcon />} variant="contained" size="small" sx={{ bgcolor: T.brand }} onClick={() => setCreateOpen(true)}>
            New Department
          </Button>
        </Box>

        {loading ? <CircularProgress /> : depts.length === 0 ? (
          <Alert>No departments yet. Create one to organize your team.</Alert>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {depts.map(d => {
              const dt = deptTeams(d);
              const isSelected = selected?.id === d.id;
              return (
                <Paper
                  key={d.id}
                  onClick={() => setSelected(isSelected ? null : d)}
                  sx={{
                    p: 2, bgcolor: isSelected ? `${T.brand}08` : T.card2,
                    border: `1px solid ${isSelected ? T.brand : T.border}`,
                    borderRadius: 2, cursor: 'pointer',
                    transition: 'all .15s', '&:hover': { borderColor: T.brand },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ bgcolor: `${T.brand}15`, borderRadius: 1.5, p: 1, color: T.brand, display: 'flex' }}>
                      <AccountTreeIcon sx={{ fontSize: '1.2rem' }} />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ color: T.text, fontWeight: 700, fontSize: '.95rem' }}>{d.name}</Typography>
                      <Typography variant="caption" sx={{ color: T.sub }}>
                        {d.category || 'Uncategorized'} &nbsp;·&nbsp; {d.head_count || 0} members
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}>
                      <Chip label={`${dt.length} teams`} size="small" sx={{ bgcolor: `${T.blue}18`, color: T.blue, fontWeight: 700 }} />
                      {d.manager_name && <Chip label={`Mgr: ${d.manager_name}`} size="small" sx={{ bgcolor: `${T.green}18`, color: T.green }} />}
                    </Box>
                    <ChevronRightIcon sx={{ color: T.sub, fontSize: '1.2rem', transition: '.15s', transform: isSelected ? 'rotate(90deg)' : 'none' }} />
                  </Box>
                  {isSelected && dt.length > 0 && (
                    <Box sx={{ mt: 1.5, pt: 1.5, borderTop: `1px solid ${T.border}` }}>
                      <Typography variant="caption" sx={{ color: T.sub, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', mb: 1, display: 'block' }}>Teams</Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                        {dt.map(t => (
                          <Chip key={t.id} label={t.name} size="small" sx={{ bgcolor: T.card, border: `1px solid ${T.border}`, color: T.text }} />
                        ))}
                      </Box>
                    </Box>
                  )}
                </Paper>
              );
            })}
          </Box>
        )}
      </Box>

      {/* Context Panel */}
      {selected && (
        <Box sx={{ width: 280, flexShrink: 0 }}>
          <Paper sx={{ p: 2.5, bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 2, position: 'sticky', top: 8 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography sx={{ color: T.text, fontWeight: 700 }}>Department Details</Typography>
              <IconButton size="small" onClick={() => setSelected(null)} sx={{ color: T.sub }}><CloseIcon fontSize="small" /></IconButton>
            </Box>
            <Divider sx={{ mb: 2, borderColor: T.border }} />
            {[
              { label: 'Name', value: selected.name },
              { label: 'Category', value: selected.category || '—' },
              { label: 'Manager', value: selected.manager_name || '—' },
              { label: 'Members', value: selected.head_count || 0 },
              { label: 'Teams', value: deptTeams(selected).length },
              { label: 'Created', value: selected.created_at?.slice(0, 10) || '—' },
            ].map(f => (
              <Box key={f.label} sx={{ mb: 1.5 }}>
                <Typography variant="caption" sx={{ color: T.sub, fontWeight: 700, fontSize: '.72rem', textTransform: 'uppercase', letterSpacing: '.06em' }}>{f.label}</Typography>
                <Typography sx={{ color: T.text, fontSize: '.9rem' }}>{f.value}</Typography>
              </Box>
            ))}
            <Divider sx={{ my: 2, borderColor: T.border }} />
            <Button fullWidth variant="outlined" size="small" startIcon={<EditIcon />} sx={{ borderColor: T.border, color: T.brand, mb: 1 }}>Edit Department</Button>
            <Button fullWidth variant="outlined" size="small" startIcon={<AddIcon />} sx={{ borderColor: T.border, color: T.blue }}>Add Team</Button>
          </Paper>
        </Box>
      )}

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>New Department</DialogTitle>
        <DialogContent>
          <TextField autoFocus label="Department Name" fullWidth size="small" sx={{ mt: 1 }} value={newName} onChange={e => setNewName(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" sx={{ bgcolor: T.brand }} onClick={() => { setCreateOpen(false); setNewName(''); }}>Create</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function MembersModule({ orgId }: { orgId: string }) {
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<OrgMember | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    membersApi.list(orgId)
      .then(setMembers)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [orgId]);

  const filtered = members.filter(m =>
    !search || (m.name || m.email || '')?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box sx={{ display: 'flex', gap: 2 }}>
      {/* Primary Value View */}
      <Box sx={{ flex: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <TextField
            size="small" placeholder="Search members..." value={search} onChange={e => setSearch(e.target.value)}
            InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: T.sub, fontSize: '1rem' }} /> }}
            sx={{ width: 260 }}
          />
          <Button startIcon={<AddIcon />} variant="contained" size="small" sx={{ bgcolor: T.brand }} onClick={() => setInviteOpen(true)}>
            Invite Member
          </Button>
        </Box>

        {loading ? <CircularProgress /> : (
          <TableContainer component={Paper} sx={{ bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: T.card2 }}>
                  {['Member', 'Email', 'Role', 'MFA', 'Status', 'Joined'].map(h => (
                    <TableCell key={h} sx={{ color: T.sub, fontWeight: 700, fontSize: '.85rem' }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map(m => (
                  <TableRow
                    key={m.id} hover onClick={() => setSelected(selected?.id === m.id ? null : m)}
                    sx={{ cursor: 'pointer', bgcolor: selected?.id === m.id ? `${T.brand}08` : 'transparent' }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ width: 28, height: 28, bgcolor: T.brand, fontSize: '.7rem', fontWeight: 700 }}>
                          {(m.name || m.email)?.slice(0, 2).toUpperCase()}
                        </Avatar>
                        <Typography sx={{ color: T.text, fontWeight: 600, fontSize: '.9rem' }}>{m.name || '—'}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ color: T.sub, fontSize: '.85rem' }}>{m.email}</TableCell>
                    <TableCell><Chip label={m.role} size="small" sx={{ bgcolor: `${T.brand}18`, color: T.brand, fontWeight: 700 }} /></TableCell>
                    <TableCell>
                      <Chip
                        label={(m as any).mfa_enabled ? 'On' : 'Off'} size="small"
                        sx={{ bgcolor: (m as any).mfa_enabled ? `${T.green}18` : `${T.red}18`, color: (m as any).mfa_enabled ? T.green : T.red, fontWeight: 700, fontSize: '.75rem' }}
                      />
                    </TableCell>
                    <TableCell><StatusChip status={m.status} /></TableCell>
                    <TableCell sx={{ color: T.sub, fontSize: '.8rem' }}>{m.joined_at?.slice(0, 10) || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      {/* Context Panel */}
      {selected && (
        <Box sx={{ width: 280, flexShrink: 0 }}>
          <Paper sx={{ p: 2.5, bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 2, position: 'sticky', top: 8 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography sx={{ color: T.text, fontWeight: 700 }}>Member Details</Typography>
              <IconButton size="small" onClick={() => setSelected(null)} sx={{ color: T.sub }}><CloseIcon fontSize="small" /></IconButton>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 2, mb: 1.5, bgcolor: T.card2, borderRadius: 1.5 }}>
              <Avatar sx={{ width: 48, height: 48, bgcolor: T.brand, fontSize: '1.1rem', fontWeight: 800, mb: 1 }}>
                {(selected.name || selected.email)?.slice(0, 2).toUpperCase()}
              </Avatar>
              <Typography sx={{ color: T.text, fontWeight: 700, fontSize: '.95rem' }}>{selected.name || '—'}</Typography>
              <Typography variant="caption" sx={{ color: T.sub }}>{selected.email}</Typography>
            </Box>
            <Divider sx={{ mb: 1.5, borderColor: T.border }} />
            {[
              { label: 'Role', value: selected.role },
              { label: 'MFA', value: (selected as any).mfa_enabled ? 'Enabled' : 'Not enabled' },
              { label: 'Status', value: selected.status },
              { label: 'Joined', value: selected.joined_at?.slice(0, 10) || '—' },
            ].map(f => (
              <Box key={f.label} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.25, alignItems: 'center' }}>
                <Typography variant="caption" sx={{ color: T.sub, fontWeight: 700 }}>{f.label}</Typography>
                <Typography sx={{ color: T.text, fontSize: '.85rem' }}>{f.value}</Typography>
              </Box>
            ))}
            <Divider sx={{ my: 1.5, borderColor: T.border }} />
            <Button fullWidth variant="outlined" size="small" startIcon={<EditIcon />} sx={{ borderColor: T.border, color: T.brand, mb: 1 }}>Change Role</Button>
            <Button fullWidth variant="outlined" size="small" startIcon={<DeleteIcon />} sx={{ borderColor: `${T.red}44`, color: T.red }}>Remove Member</Button>
          </Paper>
        </Box>
      )}

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onClose={() => setInviteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Invite Member</DialogTitle>
        <DialogContent>
          <TextField autoFocus label="Email Address" fullWidth size="small" sx={{ mt: 1 }} value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteOpen(false)}>Cancel</Button>
          <Button variant="contained" sx={{ bgcolor: T.brand }} onClick={() => { setInviteOpen(false); setInviteEmail(''); }}>Send Invite</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function BillingModule({ orgId }: { orgId: string }) {
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [invoices, setInvoices] = useState<EnterpriseInvoice[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    Promise.all([
      usageApi.summary(orgId).then(setUsage).catch(() => {}),
      enterpriseBillingApi.invoices(orgId).then(setInvoices).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [orgId]);

  return (
    <Box>
      <Typography sx={{ color: T.text, fontWeight: 700, fontSize: '1.3rem', mb: 3, fontFamily: T.font }}>
        Billing & Usage
      </Typography>

      {loading ? (
        <CircularProgress />
      ) : (
        <>
          {usage && (
            <Card sx={{ bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 2, mb: 3 }}>
              <CardHeader title="Usage" />
              <CardContent>
                <Grid container spacing={2}>
                  {[
                    { label: 'Storage', used: usage.storage_gb_used, limit: usage.storage_gb_limit },
                    { label: 'Email (30d)', used: usage.email_sent_30d, limit: usage.email_limit_30d },
                  ].map(m => (
                    <Grid key={m.label} item xs={12} md={6}>
                      <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2" sx={{ color: T.text, fontWeight: 600 }}>{m.label}</Typography>
                          <Typography variant="caption" sx={{ color: T.sub }}>
                            {m.used} / {m.limit || '∞'}
                          </Typography>
                        </Box>
                        {m.limit && (
                          <LinearProgress variant="determinate" value={(m.used / m.limit) * 100} sx={{ height: 6, borderRadius: 3 }} />
                        )}
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          )}

          <Card sx={{ bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 2 }}>
            <CardHeader title="Recent Invoices" />
            <CardContent>
              {invoices.length === 0 ? (
                <Typography sx={{ color: T.sub }}>No invoices yet.</Typography>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        {['Date', 'Amount', 'Status'].map(h => <TableCell key={h} sx={{ color: T.sub, fontWeight: 700 }}>{h}</TableCell>)}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {invoices.slice(0, 5).map(inv => (
                        <TableRow key={inv.id}>
                          <TableCell sx={{ color: T.text }}>{inv.period_start}</TableCell>
                          <TableCell sx={{ color: T.text, fontWeight: 600 }}>{inv.currency} {inv.amount}</TableCell>
                          <TableCell><StatusChip status={inv.status} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </Box>
  );
}

function DomainsModule({ orgId }: { orgId: string }) {
  const [domains, setDomains] = useState<any[]>([]);
  const [sendDomains, setSendDomains] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [tab, setTab] = useState(0);

  useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    Promise.all([
      orgDomainsApi.list(orgId).then(setDomains),
      sendDomainsApi.list(orgId).then(setSendDomains),
    ]).catch(() => {}).finally(() => setLoading(false));
  }, [orgId]);

  const allDomains = tab === 0 ? domains : sendDomains;

  const dnsColor = (status: string) => {
    if (status === 'VERIFIED' || status === 'ACTIVE') return T.green;
    if (status === 'PENDING') return T.yellow;
    return T.red;
  };

  return (
    <Box sx={{ display: 'flex', gap: 2 }}>
      {/* Primary Value View */}
      <Box sx={{ flex: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Tabs value={tab} onChange={(_, v) => { setTab(v); setSelected(null); }}
            sx={{ '& .MuiTab-root': { fontWeight: 700, textTransform: 'none', minWidth: 120 } }}>
            <Tab label={`Business Domains (${domains.length})`} />
            <Tab label={`Email Domains (${sendDomains.length})`} />
          </Tabs>
          <Button startIcon={<AddIcon />} variant="contained" size="small" sx={{ bgcolor: T.brand }} onClick={() => setAddOpen(true)}>Add Domain</Button>
        </Box>

        {loading ? <CircularProgress /> : allDomains.length === 0 ? (
          <Alert>No domains yet. Add one to connect your business presence.</Alert>
        ) : (
          <TableContainer component={Paper} sx={{ bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: T.card2 }}>
                  {['Domain', 'Type', 'DNS Health', 'Status', 'Actions'].map(h =>
                    <TableCell key={h} sx={{ color: T.sub, fontWeight: 700, fontSize: '.85rem' }}>{h}</TableCell>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {allDomains.map(d => (
                  <TableRow key={d.id} hover onClick={() => setSelected(selected?.id === d.id ? null : d)}
                    sx={{ cursor: 'pointer', bgcolor: selected?.id === d.id ? `${T.brand}08` : 'transparent' }}>
                    <TableCell sx={{ color: T.text, fontWeight: 600 }}>{d.name || d.domain}</TableCell>
                    <TableCell><Chip label={d.type || 'Business'} size="small" sx={{ bgcolor: `${T.blue}18`, color: T.blue }} /></TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: dnsColor(d.status) }} />
                        <Typography sx={{ fontSize: '.8rem', color: dnsColor(d.status), fontWeight: 600 }}>
                          {d.status === 'VERIFIED' || d.status === 'ACTIVE' ? 'Healthy' : d.status === 'PENDING' ? 'Pending' : 'Issue'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell><StatusChip status={d.status} /></TableCell>
                    <TableCell onClick={e => e.stopPropagation()}>
                      {(d.status === 'PENDING' || d.status === 'UNVERIFIED') && (
                        <Button size="small" variant="outlined" sx={{ borderColor: T.brand, color: T.brand, fontSize: '.78rem', py: 0.25 }}>Verify</Button>
                      )}
                      {(d.status === 'VERIFIED' || d.status === 'ACTIVE') && (
                        <CheckCircleIcon sx={{ color: T.green, fontSize: '1.1rem', verticalAlign: 'middle' }} />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      {/* Context Panel */}
      {selected && (
        <Box sx={{ width: 280, flexShrink: 0 }}>
          <Paper sx={{ p: 2.5, bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 2, position: 'sticky', top: 8 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography sx={{ color: T.text, fontWeight: 700 }}>Domain Details</Typography>
              <IconButton size="small" onClick={() => setSelected(null)} sx={{ color: T.sub }}><CloseIcon fontSize="small" /></IconButton>
            </Box>
            <Typography sx={{ color: T.brand, fontWeight: 700, fontSize: '.95rem', mb: 1.5, wordBreak: 'break-all' }}>
              {selected.name || selected.domain}
            </Typography>
            <Divider sx={{ mb: 1.5, borderColor: T.border }} />
            {[
              { label: 'Status', value: selected.status },
              { label: 'Type', value: selected.type || 'Business' },
              { label: 'Added', value: selected.created_at?.slice(0, 10) || '—' },
              { label: 'DNS Health', value: (selected.status === 'VERIFIED' || selected.status === 'ACTIVE') ? 'Healthy' : 'Needs attention' },
            ].map(f => (
              <Box key={f.label} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, alignItems: 'center' }}>
                <Typography variant="caption" sx={{ color: T.sub, fontWeight: 700 }}>{f.label}</Typography>
                <Typography sx={{ color: T.text, fontSize: '.85rem' }}>{f.value}</Typography>
              </Box>
            ))}
            <Divider sx={{ my: 1.5, borderColor: T.border }} />
            <Typography variant="caption" sx={{ color: T.sub, fontWeight: 700, textTransform: 'uppercase', fontSize: '.7rem', mb: 1, letterSpacing: '.06em', display: 'block' }}>Service Connections</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 2 }}>
              {['Email', 'Web', 'Auth'].map(s => <Chip key={s} label={s} size="small" sx={{ bgcolor: T.card2, color: T.sub, border: `1px solid ${T.border}` }} />)}
            </Box>
            <Button fullWidth variant="outlined" size="small" startIcon={<DeleteIcon />} sx={{ borderColor: `${T.red}44`, color: T.red }}>Remove Domain</Button>
          </Paper>
        </Box>
      )}

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add Domain</DialogTitle>
        <DialogContent>
          <TextField autoFocus label="Domain Name" placeholder="e.g. mail.example.com" fullWidth size="small" sx={{ mt: 1 }} value={newDomain} onChange={e => setNewDomain(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button variant="contained" sx={{ bgcolor: T.brand }} onClick={() => { setAddOpen(false); setNewDomain(''); }}>Add</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function EmailModule({ orgId }: { orgId: string }) {
  const [sendDomains, setSendDomains] = useState<any[]>([]);
  const [identities, setIdentities] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState(0);
  const [selected, setSelected] = useState<any | null>(null);

  useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    Promise.all([
      sendDomainsApi.list(orgId).then(setSendDomains),
      senderIdentitiesApi.list(orgId).then(setIdentities),
      emailTemplatesApi.list(orgId).then(setTemplates),
    ]).catch(() => {}).finally(() => setLoading(false));
  }, [orgId]);

  return (
    <Box sx={{ display: 'flex', gap: 2 }}>
      <Box sx={{ flex: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Tabs value={tab} onChange={(_, v) => { setTab(v); setSelected(null); }}
            sx={{ '& .MuiTab-root': { fontWeight: 700, textTransform: 'none' } }}>
            <Tab label={`Sending Domains (${sendDomains.length})`} />
            <Tab label={`Sender Identities (${identities.length})`} />
            <Tab label={`Templates (${templates.length})`} />
          </Tabs>
          <Button startIcon={<AddIcon />} variant="contained" size="small" sx={{ bgcolor: T.brand }}>
            {tab === 0 ? 'Add Domain' : tab === 1 ? 'Add Sender' : 'New Template'}
          </Button>
        </Box>

        {loading ? <CircularProgress /> : (
          <>
            {tab === 0 && (
              sendDomains.length === 0 ? <Alert>No sending domains. Add one to start sending email.</Alert> :
              <TableContainer component={Paper} sx={{ bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: T.card2 }}>
                      {['Domain', 'DNS Status', 'DKIM', 'SPF', 'Status'].map(h =>
                        <TableCell key={h} sx={{ color: T.sub, fontWeight: 700, fontSize: '.85rem' }}>{h}</TableCell>
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sendDomains.map(d => (
                      <TableRow key={d.id} hover onClick={() => setSelected(selected?.id === d.id ? null : d)} sx={{ cursor: 'pointer', bgcolor: selected?.id === d.id ? `${T.brand}08` : 'transparent' }}>
                        <TableCell sx={{ color: T.text, fontWeight: 600 }}>{d.domain || d.name}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: d.dns_verified ? T.green : T.yellow }} />
                            <Typography sx={{ fontSize: '.8rem', color: d.dns_verified ? T.green : T.yellow, fontWeight: 600 }}>{d.dns_verified ? 'Verified' : 'Pending'}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip label={d.dkim_status === 'VERIFIED' ? 'Pass' : 'Fail'} size="small"
                            sx={{ bgcolor: d.dkim_status === 'VERIFIED' ? `${T.green}18` : `${T.red}18`, color: d.dkim_status === 'VERIFIED' ? T.green : T.red, fontWeight: 700, fontSize: '.75rem' }} />
                        </TableCell>
                        <TableCell>
                          <Chip label={d.spf_status === 'VERIFIED' ? 'Pass' : 'Fail'} size="small"
                            sx={{ bgcolor: d.spf_status === 'VERIFIED' ? `${T.green}18` : `${T.red}18`, color: d.spf_status === 'VERIFIED' ? T.green : T.red, fontWeight: 700, fontSize: '.75rem' }} />
                        </TableCell>
                        <TableCell><StatusChip status={d.status} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {tab === 1 && (
              identities.length === 0 ? <Alert>No sender identities. Create one to send from a named address.</Alert> :
              <TableContainer component={Paper} sx={{ bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: T.card2 }}>
                      {['Name', 'Email', 'Domain', 'Status'].map(h =>
                        <TableCell key={h} sx={{ color: T.sub, fontWeight: 700, fontSize: '.85rem' }}>{h}</TableCell>
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {identities.map(id => (
                      <TableRow key={id.id} hover onClick={() => setSelected(selected?.id === id.id ? null : id)} sx={{ cursor: 'pointer', bgcolor: selected?.id === id.id ? `${T.brand}08` : 'transparent' }}>
                        <TableCell sx={{ color: T.text, fontWeight: 600 }}>{id.from_name || '—'}</TableCell>
                        <TableCell sx={{ color: T.sub, fontSize: '.85rem' }}>{id.from_email}</TableCell>
                        <TableCell sx={{ color: T.sub, fontSize: '.85rem' }}>{id.domain || '—'}</TableCell>
                        <TableCell><StatusChip status={id.status || 'ACTIVE'} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {tab === 2 && (
              templates.length === 0 ? <Alert>No email templates yet. Create one to start sending branded emails.</Alert> :
              <Grid container spacing={2}>
                {templates.map(t => (
                  <Grid key={t.id} item xs={12} sm={6} md={4}>
                    <Paper
                      onClick={() => setSelected(selected?.id === t.id ? null : t)}
                      sx={{ p: 2.5, bgcolor: T.card2, border: `1px solid ${selected?.id === t.id ? T.brand : T.border}`, borderRadius: 2, cursor: 'pointer', '&:hover': { borderColor: T.brand } }}
                    >
                      <Typography sx={{ color: T.text, fontWeight: 700, mb: 0.5 }}>{t.name}</Typography>
                      <Typography variant="caption" sx={{ color: T.sub, display: 'block', mb: 1 }}>{t.subject}</Typography>
                      <Box sx={{ display: 'flex', gap: 0.75 }}>
                        <Chip label={t.type || 'Transactional'} size="small" sx={{ bgcolor: `${T.purple}18`, color: T.purple, fontSize: '.75rem' }} />
                        <Chip label={t.language || 'en'} size="small" sx={{ bgcolor: T.card, border: `1px solid ${T.border}`, color: T.sub, fontSize: '.75rem' }} />
                      </Box>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            )}
          </>
        )}
      </Box>

      {/* Context Panel */}
      {selected && (
        <Box sx={{ width: 280, flexShrink: 0 }}>
          <Paper sx={{ p: 2.5, bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 2, position: 'sticky', top: 8 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography sx={{ color: T.text, fontWeight: 700 }}>Details</Typography>
              <IconButton size="small" onClick={() => setSelected(null)} sx={{ color: T.sub }}><CloseIcon fontSize="small" /></IconButton>
            </Box>
            <Typography sx={{ color: T.brand, fontWeight: 700, mb: 1.5, fontSize: '.95rem', wordBreak: 'break-all' }}>
              {selected.domain || selected.name || selected.from_email || '—'}
            </Typography>
            <Divider sx={{ mb: 1.5, borderColor: T.border }} />
            {Object.entries(selected).filter(([k]) => !['id', 'organization'].includes(k)).slice(0, 8).map(([k, v]) => (
              <Box key={k} sx={{ mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" sx={{ color: T.sub, fontWeight: 700, textTransform: 'lowercase' }}>{k.replace(/_/g, ' ')}</Typography>
                <Typography sx={{ color: T.text, fontSize: '.8rem', maxWidth: 150, textOverflow: 'ellipsis', overflow: 'hidden' }}>{String(v)}</Typography>
              </Box>
            ))}
            <Divider sx={{ my: 1.5, borderColor: T.border }} />
            <Button fullWidth variant="outlined" size="small" startIcon={<EditIcon />} sx={{ borderColor: T.border, color: T.brand }}>Edit</Button>
          </Paper>
        </Box>
      )}
    </Box>
  );
}

function MarketingModule({ orgSlug, navigate }: { orgSlug: string; navigate: ReturnType<typeof useNavigate> }) {
  const teaser = [
    { label: 'Campaigns', value: '—', color: T.brand, icon: <CampaignIcon /> },
    { label: 'Templates', value: '—', color: T.blue, icon: <MailOutlineIcon /> },
    { label: 'Contacts', value: '—', color: T.green, icon: <PeopleIcon /> },
    { label: 'Open Rate', value: '—', color: T.purple, icon: <TrendingUpIcon /> },
  ];

  return (
    <Box>
      {/* Primary Value View — Link Card */}
      <Card sx={{
        bgcolor: T.card, border: `1px solid ${T.brand}44`, borderRadius: 2, mb: 3,
        background: `linear-gradient(135deg, ${T.brand}10 0%, ${T.blue}08 100%)`,
      }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Box sx={{ bgcolor: `${T.brand}15`, borderRadius: 2, p: 1.5, color: T.brand, display: 'flex' }}>
              <CampaignIcon sx={{ fontSize: '2rem' }} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ color: T.text, fontWeight: 800, fontSize: '1.2rem', mb: 0.5 }}>Marketing Workspace</Typography>
              <Typography variant="body2" sx={{ color: T.sub }}>
                Campaigns, automations, audience segmentation, A/B testing and analytics — all in one dedicated engine.
              </Typography>
            </Box>
            {/* Secondary Action */}
            <Button
              variant="contained"
              endIcon={<OpenInNewIcon />}
              onClick={() => navigate(`/enterprise/${orgSlug}/marketing`)}
              sx={{ bgcolor: T.brand, fontWeight: 700, px: 3, '&:hover': { bgcolor: T.brand, opacity: 0.9 } }}
            >
              Open Marketing
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Teaser KPIs */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {teaser.map(m => (
          <Grid key={m.label} item xs={6} md={3}>
            <Paper sx={{ p: 2, bgcolor: T.card2, border: `1px solid ${T.border}`, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <Box sx={{ color: m.color }}>{m.icon}</Box>
                <Typography variant="caption" sx={{ color: T.sub, fontWeight: 700, textTransform: 'uppercase', fontSize: '.72rem' }}>{m.label}</Typography>
              </Box>
              <Typography sx={{ color: m.color, fontWeight: 800, fontSize: '1.6rem' }}>{m.value}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Alert icon={<OpenInNewIcon />} sx={{ bgcolor: `${T.brand}08`, border: `1px solid ${T.brand}22`, color: T.sub }}>
        Full campaign management, audience builder, automation flows, analytics, and A/B testing are available in the dedicated&nbsp;
        <strong style={{ color: T.brand, cursor: 'pointer' }} onClick={() => navigate(`/enterprise/${orgSlug}/marketing`)}>
          Marketing Workspace
        </strong>.
      </Alert>
    </Box>
  );
}

function ComplianceModule({ orgId }: { orgId: string }) {
  const [policies, setPolicies] = useState<SecurityPolicy | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    Promise.all([
      securityPoliciesApi.get(orgId).then(setPolicies),
      auditLogsApi.list(orgId).then(setAuditLogs),
    ]).catch(() => {}).finally(() => setLoading(false));
  }, [orgId]);

  const posture = policies ? [
    { label: 'MFA Enforcement', enabled: policies.mfa_required, critical: true },
    { label: 'SSO Required', enabled: policies.sso_required, critical: false },
    { label: 'IP Allowlisting', enabled: false, critical: false },
    { label: 'Audit Logging', enabled: true, critical: true },
  ] : [];

  return (
    <Box>
      {loading ? <CircularProgress /> : (
        <>
          {/* Security Posture Bar */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {posture.map(p => (
              <Grid key={p.label} item xs={12} sm={6} md={3}>
                <Paper sx={{
                  p: 2, bgcolor: T.card2, borderRadius: 2,
                  borderLeft: `4px solid ${p.enabled ? T.green : p.critical ? T.red : T.sub}`,
                  border: `1px solid ${T.border}`,
                }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography sx={{ color: T.text, fontWeight: 600, fontSize: '.9rem' }}>{p.label}</Typography>
                    <Chip
                      label={p.enabled ? 'Enabled' : 'Off'} size="small"
                      sx={{ bgcolor: p.enabled ? `${T.green}18` : `${p.critical ? T.red : T.sub}18`, color: p.enabled ? T.green : p.critical ? T.red : T.sub, fontWeight: 700, fontSize: '.75rem' }}
                    />
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>

          {/* Policy Details */}
          {policies ? (
            <Card sx={{ bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 2, mb: 3 }}>
              <CardHeader
                title={<Typography sx={{ fontWeight: 700 }}>Security Policies</Typography>}
                action={<Button size="small" startIcon={<EditIcon />} sx={{ color: T.brand }}>Configure</Button>}
              />
              <CardContent>
                <Grid container spacing={2}>
                  {[
                    { label: 'MFA Required', value: policies.mfa_required ? 'Yes — enforced for all' : 'No — optional' },
                    { label: 'SSO Required', value: policies.sso_required ? 'Yes' : 'No' },
                    { label: 'Min Password Length', value: `${policies.password_min_length} characters` },
                    { label: 'Session Timeout', value: `${policies.session_timeout_minutes} minutes` },
                    { label: 'Audit Log Retention', value: `${policies.audit_retention_days} days` },
                    { label: 'Allowed IP Ranges', value: policies.ip_allowlist?.join(', ') || 'All IPs allowed' },
                  ].map(p => (
                    <Grid key={p.label} item xs={12} sm={6}>
                      <Typography variant="caption" sx={{ color: T.sub, fontWeight: 700, textTransform: 'uppercase', fontSize: '.7rem', letterSpacing: '.06em', display: 'block' }}>{p.label}</Typography>
                      <Typography sx={{ color: T.text, mt: 0.25, fontSize: '.9rem' }}>{p.value}</Typography>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          ) : (
            <Alert sx={{ mb: 3 }}>No security policies configured. Set them up to enforce MFA, session rules, and access policies.</Alert>
          )}

          {/* Recent Audit Activity */}
          <Card sx={{ bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 2 }}>
            <CardHeader title={<Typography sx={{ fontWeight: 700 }}>Recent Audit Activity</Typography>} />
            <CardContent sx={{ p: 0 }}>
              {auditLogs.length === 0 ? (
                <Box sx={{ p: 3 }}><Alert>No audit events yet.</Alert></Box>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: T.card2 }}>
                        {['Actor', 'Action', 'Target', 'Time'].map(h =>
                          <TableCell key={h} sx={{ color: T.sub, fontWeight: 700, fontSize: '.85rem' }}>{h}</TableCell>
                        )}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {auditLogs.slice(0, 10).map(log => (
                        <TableRow key={log.id} hover>
                          <TableCell sx={{ color: T.text, fontSize: '.85rem', fontWeight: 600 }}>{log.actor_name}</TableCell>
                          <TableCell sx={{ color: T.sub, fontSize: '.85rem' }}>{log.action}</TableCell>
                          <TableCell sx={{ color: T.sub, fontSize: '.85rem' }}>{log.target_label}</TableCell>
                          <TableCell sx={{ color: T.sub, fontSize: '.75rem', fontFamily: 'monospace' }}>
                            {new Date(log.timestamp).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </Box>
  );
}

function IntegrationsModule({ orgId }: { orgId: string }) {
  // ── Catalog definition ──────────────────────────────────────────────────────
  type CatalogField = { key: string; label: string; type: 'text' | 'password' };
  interface CatalogEntry {
    provider: string; name: string; category: string; siSlug: string; color: string;
    description: string; authType: string; fields: CatalogField[];
    actions: string[]; webhooks: string[];
  }
  const CATALOG: CatalogEntry[] = [
    { provider:'stripe', name:'Stripe', category:'payments', siSlug:'stripe', color:'#635BFF',
      description:'Payment processing, subscription billing, and revenue management. Powers Billing, Orders, and Invoices.',
      authType:'API Key',
      fields:[{key:'secret_key',label:'Secret Key',type:'password'},{key:'publishable_key',label:'Publishable Key',type:'text'},{key:'webhook_secret',label:'Webhook Secret',type:'password'}],
      actions:['createCustomer','createPaymentIntent','refundPayment','listInvoices'],
      webhooks:['payment_intent.succeeded','charge.refunded','customer.created','invoice.paid'] },
    { provider:'sendgrid', name:'SendGrid', category:'email', siSlug:'sendgrid', color:'#1A82E2',
      description:'Transactional and marketing email at scale with templates, analytics, and deliverability.',
      authType:'API Key', fields:[{key:'api_key',label:'API Key',type:'password'}],
      actions:['sendEmail','createTemplate','addContact'],
      webhooks:['email.delivered','email.bounced','email.opened','email.clicked'] },
    { provider:'route53', name:'AWS Route 53', category:'domains', siSlug:'amazonroute53', color:'#FF9900',
      description:'DNS management, health checks, and intelligent routing. Powers the Domains module.',
      authType:'IAM Keys',
      fields:[{key:'access_key_id',label:'Access Key ID',type:'text'},{key:'secret_access_key',label:'Secret Access Key',type:'password'},{key:'region',label:'AWS Region',type:'text'}],
      actions:['createRecord','updateRecord','deleteRecord'],
      webhooks:[] },
    { provider:'slack', name:'Slack', category:'communication', siSlug:'slack', color:'#4A154B',
      description:'Team messaging and notifications. Send alerts from any OrcaCloud module.',
      authType:'Bot Token',
      fields:[{key:'bot_token',label:'Bot Token',type:'password'},{key:'signing_secret',label:'Signing Secret',type:'password'}],
      actions:['sendMessage','createChannel','postNotification'],
      webhooks:['message.received','app.mention'] },
    { provider:'github', name:'GitHub', category:'development', siSlug:'github', color:'#24292e',
      description:'Source control, CI/CD pipelines, issue tracking, and pull request management.',
      authType:'Access Token', fields:[{key:'access_token',label:'Personal Access Token',type:'password'}],
      actions:['createIssue','triggerWorkflow','listPRs'],
      webhooks:['push','pull_request','issues','workflow_run'] },
    { provider:'hubspot', name:'HubSpot', category:'marketing', siSlug:'hubspot', color:'#FF5C35',
      description:'CRM, marketing automation, and sales pipeline. Syncs with Marketing module.',
      authType:'OAuth2',
      fields:[{key:'client_id',label:'Client ID',type:'text'},{key:'client_secret',label:'Client Secret',type:'password'}],
      actions:['createContact','syncContacts','createDeal'],
      webhooks:['contact.created','deal.updated','form.submitted'] },
    { provider:'salesforce', name:'Salesforce', category:'crm', siSlug:'salesforce', color:'#00A1E0',
      description:'Enterprise CRM, sales automation, and customer data platform.',
      authType:'OAuth2',
      fields:[{key:'client_id',label:'Client ID',type:'text'},{key:'client_secret',label:'Client Secret',type:'password'},{key:'instance_url',label:'Instance URL',type:'text'}],
      actions:['createLead','createOpportunity','syncAccounts'],
      webhooks:['lead.created','opportunity.updated'] },
    { provider:'twilio', name:'Twilio', category:'communication', siSlug:'twilio', color:'#F22F46',
      description:'SMS, voice calls, and WhatsApp messaging APIs.',
      authType:'API Key',
      fields:[{key:'account_sid',label:'Account SID',type:'text'},{key:'auth_token',label:'Auth Token',type:'password'}],
      actions:['sendSMS','makeCall','sendWhatsApp'],
      webhooks:['message.received','call.completed'] },
    { provider:'okta', name:'Okta', category:'identity', siSlug:'okta', color:'#007DC1',
      description:'Identity platform, SSO, and multi-factor authentication.',
      authType:'OAuth2',
      fields:[{key:'domain',label:'Okta Domain',type:'text'},{key:'client_id',label:'Client ID',type:'text'},{key:'client_secret',label:'Client Secret',type:'password'}],
      actions:['createUser','assignGroup','enforceSSO'],
      webhooks:['user.created','user.deactivated','session.started'] },
    { provider:'datadog', name:'Datadog', category:'monitoring', siSlug:'datadog', color:'#632CA6',
      description:'Infrastructure monitoring, APM, log management, and security insights.',
      authType:'API Key',
      fields:[{key:'api_key',label:'API Key',type:'password'},{key:'app_key',label:'Application Key',type:'password'}],
      actions:['sendMetrics','createMonitor','queryLogs'],
      webhooks:['alert.triggered','monitor.recovered'] },
    { provider:'pagerduty', name:'PagerDuty', category:'monitoring', siSlug:'pagerduty', color:'#06AC38',
      description:'On-call management, incident response, and escalation for platform reliability.',
      authType:'API Key',
      fields:[{key:'api_key',label:'API Key',type:'password'},{key:'routing_key',label:'Routing Key',type:'text'}],
      actions:['triggerIncident','resolveIncident','createAlert'],
      webhooks:['incident.triggered','incident.resolved'] },
    { provider:'zendesk', name:'Zendesk', category:'support', siSlug:'zendesk', color:'#1F73B7',
      description:'Customer support tickets, live chat, and self-service knowledge base.',
      authType:'API Token',
      fields:[{key:'subdomain',label:'Subdomain',type:'text'},{key:'email',label:'Account Email',type:'text'},{key:'api_token',label:'API Token',type:'password'}],
      actions:['createTicket','updateTicket','sendMessage'],
      webhooks:['ticket.created','ticket.solved','comment.added'] },
    { provider:'jira', name:'Jira', category:'development', siSlug:'jira', color:'#0052CC',
      description:'Project management, issue tracking, and agile boards for engineering.',
      authType:'API Token',
      fields:[{key:'domain',label:'Atlassian Domain',type:'text'},{key:'email',label:'Account Email',type:'text'},{key:'api_token',label:'API Token',type:'password'}],
      actions:['createIssue','updateIssue','transitionIssue'],
      webhooks:['issue.created','issue.updated','sprint.completed'] },
    { provider:'mailchimp', name:'Mailchimp', category:'marketing', siSlug:'mailchimp', color:'#241C15',
      description:'Email campaigns, audience management, and automation for marketing teams.',
      authType:'API Key', fields:[{key:'api_key',label:'API Key',type:'password'}],
      actions:['addSubscriber','createCampaign','sendCampaign'],
      webhooks:['subscribe','unsubscribe','campaign.sent'] },
    { provider:'google_workspace', name:'Google Workspace', category:'productivity', siSlug:'googleworkspace', color:'#4285F4',
      description:'Gmail, Calendar, Drive, and Meet integration for enterprise productivity.',
      authType:'OAuth2',
      fields:[{key:'client_id',label:'Client ID',type:'text'},{key:'client_secret',label:'Client Secret',type:'password'}],
      actions:['sendEmail','createCalendarEvent','uploadFile'],
      webhooks:['calendar.event','drive.change'] },
  ];

  const CATS = ['all','payments','email','communication','domains','development','marketing','crm','identity','monitoring','productivity','support'];
  const CAT_LABEL: Record<string,string> = { all:'All',payments:'Payments',email:'Email',communication:'Communication',domains:'Domains',development:'Dev',marketing:'Marketing',crm:'CRM',identity:'Identity',monitoring:'Monitoring',productivity:'Productivity',support:'Support' };

  // ── State ──────────────────────────────────────────────────────────────────
  const [connections, setConnections] = useState<OrgIntegration[]>([]);
  const [loading, setLoading]         = useState(true);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [catFilter, setCatFilter]     = useState('all');
  const [searchQ, setSearchQ]         = useState('');
  const [detailTab, setDetailTab]     = useState(0);
  const [credValues, setCredValues]   = useState<Record<string, string>>({});
  const [integLogs, setIntegLogs]     = useState<IntegrationLog[]>([]);
  const [integEvents, setIntegEvents] = useState<IntegrationWebhookEvent[]>([]);
  const [testResult, setTestResult]   = useState<{ success: boolean; message: string } | null>(null);
  const [connectLoading, setConnectLoading] = useState(false);
  const [actionLoading, setActionLoading]   = useState(false);
  const [snack, setSnack]             = useState('');

  // ── Derived ────────────────────────────────────────────────────────────────
  const catEntry  = CATALOG.find(c => c.provider === selectedProvider) ?? null;
  const conn      = connections.find(c => c.provider === selectedProvider) ?? null;
  const connected = conn?.status === 'CONNECTED';

  const filteredCatalog = CATALOG.filter(c => {
    if (catFilter !== 'all' && c.category !== catFilter) return false;
    if (searchQ && !c.name.toLowerCase().includes(searchQ.toLowerCase())) return false;
    return true;
  });

  const statusColor = (s?: string) =>
    s === 'CONNECTED' ? T.green : s === 'ERROR' ? T.red : s === 'PENDING' ? T.yellow : T.sub;

  // ── Data loading ───────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try { setConnections(await integrationsApi.list(orgId)); } catch {}
    setLoading(false);
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!conn?.id) return;
    if (detailTab === 1) integrationsApi.logs(orgId, conn.id).then(setIntegLogs).catch(() => {});
    if (detailTab === 2) integrationsApi.events(orgId, conn.id).then(setIntegEvents).catch(() => {});
  }, [orgId, conn?.id, detailTab]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const openProvider = (provider: string) => {
    setSelectedProvider(provider);
    setDetailTab(0);
    setTestResult(null);
    setCredValues({});
    setIntegLogs([]);
    setIntegEvents([]);
  };

  const handleConnect = async () => {
    if (!catEntry) return;
    setConnectLoading(true);
    setTestResult(null);
    try {
      const c = await integrationsApi.upsert(orgId, {
        provider: catEntry.provider, display_name: catEntry.name, category: catEntry.category,
      });
      const updated = await integrationsApi.connect(orgId, c.id, credValues, catEntry.name);
      setConnections(prev => {
        const i = prev.findIndex(x => x.provider === updated.provider);
        return i >= 0 ? prev.map((x, idx) => idx === i ? updated : x) : [...prev, updated];
      });
      setSnack(`${catEntry.name} connected`);
      setDetailTab(0);
    } catch (e: any) { setSnack(e?.response?.data?.detail ?? 'Connection failed'); }
    setConnectLoading(false);
  };

  const handleDisconnect = async () => {
    if (!conn) return;
    setActionLoading(true);
    try {
      const updated = await integrationsApi.disconnect(orgId, conn.id);
      setConnections(prev => prev.map(c => c.id === updated.id ? updated : c));
      setSnack(`${catEntry?.name ?? selectedProvider} disconnected`);
    } catch { setSnack('Disconnect failed'); }
    setActionLoading(false);
  };

  const handleTest = async () => {
    if (!conn) {
      // Upsert first, then test without saving real credentials
      setTestResult({ success: false, message: 'Save credentials first to test.' });
      return;
    }
    setActionLoading(true);
    setTestResult(null);
    try {
      const r = await integrationsApi.test(orgId, conn.id);
      setTestResult(r);
      setConnections(prev => prev.map(c =>
        c.id === conn.id ? { ...c, status: r.success ? 'CONNECTED' : 'ERROR' } : c
      ));
    } catch (e: any) {
      setTestResult({ success: false, message: e?.response?.data?.detail ?? 'Test failed' });
    }
    setActionLoading(false);
  };

  const handleSync = async () => {
    if (!conn) return;
    setActionLoading(true);
    try {
      await integrationsApi.sync(orgId, conn.id);
      await load();
      setSnack('Sync triggered successfully');
    } catch { setSnack('Sync failed'); }
    setActionLoading(false);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ display: 'flex', gap: 2, minHeight: 600 }}>
      {/* ── Left: catalog sidebar ── */}
      <Box sx={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {/* Search */}
        <TextField
          size="small" placeholder="Search integrations…" value={searchQ}
          onChange={e => setSearchQ(e.target.value)}
          InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: T.sub, fontSize: 18 }} /> }}
          sx={{ '& .MuiOutlinedInput-root': { bgcolor: T.card, color: T.text, borderRadius: 2,
            '& fieldset': { borderColor: T.border }, '&:hover fieldset': { borderColor: T.brand } } }}
        />
        {/* Category chips */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {CATS.map(cat => (
            <Chip key={cat} label={CAT_LABEL[cat]} size="small" clickable
              onClick={() => setCatFilter(cat)}
              sx={{ fontSize: '0.7rem', fontWeight: catFilter === cat ? 700 : 400,
                bgcolor: catFilter === cat ? T.brand : T.card2,
                color: catFilter === cat ? '#fff' : T.sub,
                border: `1px solid ${catFilter === cat ? T.brand : T.border}` }}
            />
          ))}
        </Box>
        {/* Integration list */}
        <Box sx={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          {loading && <CircularProgress size={24} sx={{ mx: 'auto', mt: 3 }} />}
          {filteredCatalog.map(item => {
            const c = connections.find(x => x.provider === item.provider);
            const isSelected = selectedProvider === item.provider;
            return (
              <Paper key={item.provider} onClick={() => openProvider(item.provider)}
                sx={{ p: 1.5, cursor: 'pointer', bgcolor: isSelected ? `${T.brand}15` : T.card,
                  border: `1px solid ${isSelected ? T.brand : T.border}`, borderRadius: 2,
                  display: 'flex', alignItems: 'center', gap: 1.5,
                  '&:hover': { borderColor: T.brand, bgcolor: `${T.brand}10` } }}>
                <Box sx={{ width: 36, height: 36, borderRadius: 1.5, bgcolor: item.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <img src={`https://cdn.simpleicons.org/${item.siSlug}/ffffff`}
                    alt={item.name} style={{ width: 18, height: 18, display: 'block' }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ color: T.text, fontWeight: 600, fontSize: '0.82rem',
                    lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.name}
                  </Typography>
                  <Typography sx={{ color: T.sub, fontSize: '0.7rem', textTransform: 'capitalize' }}>
                    {item.category}
                  </Typography>
                </Box>
                {c && (
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%',
                    bgcolor: statusColor(c.status), flexShrink: 0 }} />
                )}
              </Paper>
            );
          })}
        </Box>
      </Box>

      {/* ── Right: detail panel ── */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {!selectedProvider ? (
          /* Empty state */
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            height: '100%', gap: 2, py: 8, color: T.sub }}>
            <ExtensionIcon sx={{ fontSize: 56, opacity: 0.3 }} />
            <Typography sx={{ fontSize: '1.1rem', fontWeight: 600 }}>Select an integration</Typography>
            <Typography variant="body2" sx={{ textAlign: 'center', maxWidth: 320 }}>
              Browse the catalog on the left to connect Stripe, SendGrid, GitHub, and more.
            </Typography>
          </Box>
        ) : !connected ? (
          /* ── Connect view ── */
          <Paper sx={{ p: 3, bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 2 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <Box sx={{ width: 56, height: 56, borderRadius: 2, bgcolor: catEntry?.color ?? '#555',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <img src={`https://cdn.simpleicons.org/${catEntry?.siSlug ?? ''}/ffffff`}
                  alt={catEntry?.name} style={{ width: 28, height: 28, display: 'block' }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              </Box>
              <Box>
                <Typography sx={{ color: T.text, fontWeight: 800, fontSize: '1.4rem', fontFamily: T.font }}>
                  {catEntry?.name}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                  <Chip label={catEntry?.category} size="small"
                    sx={{ bgcolor: T.card2, color: T.sub, fontSize: '0.7rem', textTransform: 'capitalize' }} />
                  <Chip label={catEntry?.authType} size="small"
                    sx={{ bgcolor: T.card2, color: T.sub, fontSize: '0.7rem' }} />
                </Box>
              </Box>
            </Box>

            <Typography sx={{ color: T.sub, mb: 3, lineHeight: 1.6 }}>{catEntry?.description}</Typography>

            <Divider sx={{ borderColor: T.border, mb: 3 }} />

            {/* Credential form */}
            <Typography sx={{ color: T.text, fontWeight: 700, mb: 2, fontSize: '0.9rem' }}>
              Authentication Credentials
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
              {(catEntry?.fields ?? []).map(f => (
                <TextField key={f.key} label={f.label} type={f.type} size="small" fullWidth
                  value={credValues[f.key] ?? ''}
                  onChange={e => setCredValues(prev => ({ ...prev, [f.key]: e.target.value }))}
                  autoComplete="off"
                  sx={{ '& .MuiOutlinedInput-root': { bgcolor: T.card2, color: T.text, borderRadius: 1.5,
                    '& fieldset': { borderColor: T.border }, '&:hover fieldset': { borderColor: T.brand } },
                    '& label': { color: T.sub } }}
                />
              ))}
            </Box>

            {/* Supported actions / webhooks */}
            {catEntry && catEntry.actions.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography sx={{ color: T.sub, fontSize: '0.75rem', fontWeight: 600, mb: 1, textTransform: 'uppercase', letterSpacing: 1 }}>
                  Supported Actions
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {catEntry.actions.map(a => (
                    <Chip key={a} label={a} size="small"
                      sx={{ bgcolor: `${T.blue}18`, color: T.blue, fontSize: '0.7rem', fontFamily: 'monospace' }} />
                  ))}
                </Box>
              </Box>
            )}
            {catEntry && catEntry.webhooks.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography sx={{ color: T.sub, fontSize: '0.75rem', fontWeight: 600, mb: 1, textTransform: 'uppercase', letterSpacing: 1 }}>
                  Webhook Events
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {catEntry.webhooks.map(w => (
                    <Chip key={w} label={w} size="small"
                      sx={{ bgcolor: `${T.purple}18`, color: T.purple, fontSize: '0.7rem', fontFamily: 'monospace' }} />
                  ))}
                </Box>
              </Box>
            )}

            {/* Test result */}
            {testResult && (
              <Alert severity={testResult.success ? 'success' : 'error'} sx={{ mb: 2, borderRadius: 1.5 }}>
                {testResult.message}
              </Alert>
            )}

            {/* Action buttons */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button variant="outlined" size="small" disabled={actionLoading}
                onClick={handleTest}
                sx={{ borderColor: T.border, color: T.sub, '&:hover': { borderColor: T.brand, color: T.brand } }}>
                {actionLoading ? <CircularProgress size={16} /> : 'Test Connection'}
              </Button>
              <Button variant="contained" sx={{ bgcolor: T.brand, flex: 1 }}
                disabled={connectLoading}
                onClick={handleConnect}>
                {connectLoading ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : `Connect ${catEntry?.name ?? ''}`}
              </Button>
            </Box>
          </Paper>
        ) : (
          /* ── Connected detail view ── */
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Header card */}
            <Paper sx={{ p: 2.5, bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                <Box sx={{ width: 52, height: 52, borderRadius: 2, bgcolor: catEntry?.color ?? '#555',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <img src={`https://cdn.simpleicons.org/${catEntry?.siSlug ?? ''}/ffffff`}
                    alt={catEntry?.name} style={{ width: 26, height: 26, display: 'block' }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                    <Typography sx={{ color: T.text, fontWeight: 800, fontSize: '1.3rem', fontFamily: T.font }}>
                      {conn.display_name || catEntry?.name}
                    </Typography>
                    <Chip label={conn.status} size="small"
                      sx={{ bgcolor: statusColor(conn.status) + '20', color: statusColor(conn.status),
                        fontWeight: 700, fontSize: '0.72rem', border: `1px solid ${statusColor(conn.status)}40` }} />
                  </Box>
                  {conn.connected_by_name && (
                    <Typography variant="caption" sx={{ color: T.sub }}>
                      Connected by {conn.connected_by_name}
                      {conn.last_sync ? ` · Last sync ${new Date(conn.last_sync).toLocaleString()}` : ''}
                    </Typography>
                  )}
                </Box>
                <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
                  <Tooltip title="Manual sync">
                    <IconButton size="small" disabled={actionLoading} onClick={handleSync}
                      sx={{ color: T.sub, border: `1px solid ${T.border}`, borderRadius: 1,
                        '&:hover': { borderColor: T.brand, color: T.brand } }}>
                      <RefreshIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Test connection">
                    <IconButton size="small" disabled={actionLoading} onClick={handleTest}
                      sx={{ color: T.sub, border: `1px solid ${T.border}`, borderRadius: 1,
                        '&:hover': { borderColor: T.blue, color: T.blue } }}>
                      <PowerIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Button size="small" startIcon={<LinkOffIcon />} disabled={actionLoading}
                    onClick={handleDisconnect}
                    sx={{ border: `1px solid ${T.border}`, color: T.red, borderRadius: 1,
                      '&:hover': { borderColor: T.red, bgcolor: T.red + '10' } }}>
                    Disconnect
                  </Button>
                </Box>
              </Box>

              {/* Test result */}
              {testResult && (
                <Alert severity={testResult.success ? 'success' : 'error'}
                  sx={{ mt: 2, borderRadius: 1.5 }} onClose={() => setTestResult(null)}>
                  {testResult.message}
                </Alert>
              )}
            </Paper>

            {/* Stats row */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              {[
                { label: 'Total API Calls', value: conn.total_calls ?? 0 },
                { label: 'Error Count',     value: conn.error_count ?? 0 },
                { label: 'Last Sync',       value: conn.last_sync ? new Date(conn.last_sync).toLocaleDateString() : '—' },
                { label: 'Category',        value: (conn.category ?? catEntry?.category ?? '—').charAt(0).toUpperCase() + (conn.category ?? catEntry?.category ?? '').slice(1) },
              ].map(stat => (
                <Paper key={stat.label} sx={{ flex: 1, p: 1.5, bgcolor: T.card2,
                  border: `1px solid ${T.border}`, borderRadius: 2, textAlign: 'center' }}>
                  <Typography sx={{ color: T.text, fontSize: '1.1rem', fontWeight: 800 }}>{stat.value}</Typography>
                  <Typography sx={{ color: T.sub, fontSize: '0.72rem' }}>{stat.label}</Typography>
                </Paper>
              ))}
            </Box>

            {/* Tabs */}
            <Paper sx={{ bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 2, overflow: 'hidden' }}>
              <Tabs value={detailTab} onChange={(_, v) => setDetailTab(v)}
                sx={{ borderBottom: `1px solid ${T.border}`, px: 2,
                  '& .MuiTab-root': { color: T.sub, fontWeight: 600, fontSize: '0.82rem', minHeight: 44 },
                  '& .Mui-selected': { color: T.brand },
                  '& .MuiTabs-indicator': { bgcolor: T.brand } }}>
                <Tab label="Overview" />
                <Tab label="Logs" />
                <Tab label="Webhook Events" />
                <Tab label="Credentials" />
              </Tabs>

              <Box sx={{ p: 2.5 }}>
                {/* Overview tab */}
                {detailTab === 0 && (
                  <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                    <Box sx={{ flex: 1, minWidth: 200 }}>
                      <Typography sx={{ color: T.sub, fontSize: '0.75rem', fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: 1, mb: 1.5 }}>
                        Supported Actions
                      </Typography>
                      {(catEntry?.actions ?? []).map(a => (
                        <Box key={a} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                          <CheckCircleIcon sx={{ fontSize: 14, color: T.green }} />
                          <Typography sx={{ color: T.text, fontSize: '0.82rem', fontFamily: 'monospace' }}>{a}</Typography>
                        </Box>
                      ))}
                    </Box>
                    {(catEntry?.webhooks ?? []).length > 0 && (
                      <Box sx={{ flex: 1, minWidth: 200 }}>
                        <Typography sx={{ color: T.sub, fontSize: '0.75rem', fontWeight: 700,
                          textTransform: 'uppercase', letterSpacing: 1, mb: 1.5 }}>
                          Webhook Events
                        </Typography>
                        {(catEntry?.webhooks ?? []).map(w => (
                          <Box key={w} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: T.purple, flexShrink: 0 }} />
                            <Typography sx={{ color: T.text, fontSize: '0.82rem', fontFamily: 'monospace' }}>{w}</Typography>
                          </Box>
                        ))}
                      </Box>
                    )}
                    {conn.last_error && (
                      <Box sx={{ width: '100%' }}>
                        <Alert severity="error" sx={{ borderRadius: 1.5 }}>{conn.last_error}</Alert>
                      </Box>
                    )}
                  </Box>
                )}

                {/* Logs tab */}
                {detailTab === 1 && (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          {['Timestamp','Level','Event','Message','HTTP','Duration'].map(h => (
                            <TableCell key={h} sx={{ color: T.sub, fontWeight: 700, fontSize: '0.72rem', borderColor: T.border }}>{h}</TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {integLogs.length === 0 ? (
                          <TableRow><TableCell colSpan={6} sx={{ color: T.sub, textAlign: 'center', py: 3, borderColor: T.border }}>No logs yet</TableCell></TableRow>
                        ) : integLogs.map(log => (
                          <TableRow key={log.id} sx={{ '&:hover': { bgcolor: T.card2 } }}>
                            <TableCell sx={{ color: T.sub, fontSize: '0.72rem', borderColor: T.border }}>
                              {new Date(log.timestamp).toLocaleString()}
                            </TableCell>
                            <TableCell sx={{ borderColor: T.border }}>
                              <Chip label={log.level} size="small" sx={{ fontSize: '0.65rem', fontWeight: 700,
                                bgcolor: log.level === 'SUCCESS' ? T.green + '20' : log.level === 'ERROR' ? T.red + '20' : log.level === 'WARNING' ? T.yellow + '20' : T.card2,
                                color: log.level === 'SUCCESS' ? T.green : log.level === 'ERROR' ? T.red : log.level === 'WARNING' ? T.yellow : T.sub }} />
                            </TableCell>
                            <TableCell sx={{ color: T.text, fontSize: '0.75rem', fontFamily: 'monospace', borderColor: T.border }}>{log.event_type}</TableCell>
                            <TableCell sx={{ color: T.text, fontSize: '0.75rem', maxWidth: 250, borderColor: T.border,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.message}</TableCell>
                            <TableCell sx={{ color: T.sub, fontSize: '0.72rem', borderColor: T.border }}>{log.http_status ?? '—'}</TableCell>
                            <TableCell sx={{ color: T.sub, fontSize: '0.72rem', borderColor: T.border }}>{log.duration_ms != null ? `${log.duration_ms}ms` : '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}

                {/* Events tab */}
                {detailTab === 2 && (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          {['Received','Event Type','Event ID','Status'].map(h => (
                            <TableCell key={h} sx={{ color: T.sub, fontWeight: 700, fontSize: '0.72rem', borderColor: T.border }}>{h}</TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {integEvents.length === 0 ? (
                          <TableRow><TableCell colSpan={4} sx={{ color: T.sub, textAlign: 'center', py: 3, borderColor: T.border }}>No webhook events yet</TableCell></TableRow>
                        ) : integEvents.map(ev => (
                          <TableRow key={ev.id} sx={{ '&:hover': { bgcolor: T.card2 } }}>
                            <TableCell sx={{ color: T.sub, fontSize: '0.72rem', borderColor: T.border }}>
                              {new Date(ev.received_at).toLocaleString()}
                            </TableCell>
                            <TableCell sx={{ color: T.text, fontSize: '0.75rem', fontFamily: 'monospace', borderColor: T.border }}>{ev.event_type}</TableCell>
                            <TableCell sx={{ color: T.sub, fontSize: '0.72rem', fontFamily: 'monospace', borderColor: T.border }}>{ev.event_id || '—'}</TableCell>
                            <TableCell sx={{ borderColor: T.border }}>
                              <Chip label={ev.processed ? 'Processed' : 'Pending'} size="small"
                                sx={{ fontSize: '0.65rem',
                                  bgcolor: ev.processed ? T.green + '20' : T.yellow + '20',
                                  color: ev.processed ? T.green : T.yellow }} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}

                {/* Credentials tab */}
                {detailTab === 3 && (
                  <Box>
                    <Alert severity="warning" sx={{ mb: 2, borderRadius: 1.5 }}>
                      Updating credentials will immediately replace the saved values. Existing credentials are never displayed for security.
                    </Alert>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 480 }}>
                      {(catEntry?.fields ?? []).map(f => (
                        <TextField key={f.key} label={f.label} type={f.type} size="small" fullWidth
                          value={credValues[f.key] ?? ''}
                          placeholder="Leave blank to keep existing"
                          onChange={e => setCredValues(prev => ({ ...prev, [f.key]: e.target.value }))}
                          autoComplete="off"
                          sx={{ '& .MuiOutlinedInput-root': { bgcolor: T.card2, color: T.text, borderRadius: 1.5,
                            '& fieldset': { borderColor: T.border }, '&:hover fieldset': { borderColor: T.brand } },
                            '& label': { color: T.sub } }}
                        />
                      ))}
                      <Box sx={{ display: 'flex', gap: 2 }}>
                        <Button variant="outlined" size="small" onClick={handleTest} disabled={actionLoading}
                          sx={{ borderColor: T.border, color: T.sub, '&:hover': { borderColor: T.brand, color: T.brand } }}>
                          Test
                        </Button>
                        <Button variant="contained" sx={{ bgcolor: T.brand }} onClick={handleConnect} disabled={connectLoading}>
                          {connectLoading ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Update Credentials'}
                        </Button>
                      </Box>
                      {testResult && (
                        <Alert severity={testResult.success ? 'success' : 'error'} sx={{ borderRadius: 1.5 }}>
                          {testResult.message}
                        </Alert>
                      )}
                    </Box>
                  </Box>
                )}
              </Box>
            </Paper>
          </Box>
        )}
      </Box>

      <Snackbar open={!!snack} autoHideDuration={3500} onClose={() => setSnack('')} message={snack} />
    </Box>
  );
}

function OrdersModule({ orgId }: { orgId: string }) {
  const [orders,        setOrders]        = useState<OrgOrder[]>([]);
  const [subscriptions, setSubscriptions] = useState<OrgSubscriptionItem[]>([]);
  const [tab,           setTab]           = useState(0);
  const [loading,       setLoading]       = useState(false);
  const [search,        setSearch]        = useState('');
  const [statusFilter,  setStatusFilter]  = useState('ALL');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [detailOrder,   setDetailOrder]   = useState<OrgOrder | null>(null);

  const load = useCallback(() => {
    if (!orgId) return;
    setLoading(true);
    Promise.all([
      ordersApi.list(orgId).then(setOrders).catch(() => {}),
      orgSubscriptionsApi.list(orgId).then(setSubscriptions).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  // ── Derived stats ────────────────────────────────────────────────────────
  const totalRevenue = orders
    .filter(o => o.status === 'COMPLETED')
    .reduce((sum, o) => sum + parseFloat(o.total_amount || '0'), 0);
  const pendingCount   = orders.filter(o => o.status === 'PENDING').length;
  const completedCount = orders.filter(o => o.status === 'COMPLETED').length;
  const activeSubs     = subscriptions.filter(s => s.status === 'ACTIVE').length;

  // ── Filtered orders ──────────────────────────────────────────────────────
  const filteredOrders = orders.filter(o => {
    const matchSearch = !search ||
      o.order_number.toLowerCase().includes(search.toLowerCase()) ||
      o.items?.some(i => i.product.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = statusFilter === 'ALL' || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statusColor = (s: string) => {
    if (s === 'COMPLETED' || s === 'CONFIRMED') return T.green;
    if (s === 'PENDING' || s === 'TRIALING')   return T.yellow;
    if (s === 'CANCELLED' || s === 'FAILED' || s === 'EXPIRED') return T.red;
    return T.sub;
  };

  const billingCycleLabel = (cycle: string) =>
    cycle === 'MONTHLY' ? 'Monthly' : cycle === 'ANNUAL' ? 'Annual' : cycle;

  return (
    <Box>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography sx={{ color: T.text, fontWeight: 800, fontSize: '1.4rem', fontFamily: T.font }}>Orders & Subscriptions</Typography>
          <Typography sx={{ color: T.sub, fontSize: '.85rem', mt: 0.25 }}>Manage your purchase history and active plans</Typography>
        </Box>
        <Tooltip title="Refresh">
          <IconButton onClick={load} disabled={loading} sx={{ color: T.sub, '&:hover': { color: T.brand } }}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* ── KPI Cards ───────────────────────────────────────────────────── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Total Orders',      value: orders.length,                                 icon: <ShoppingCartIcon />, color: T.brand },
          { label: 'Completed',         value: completedCount,                                icon: <CheckCircleIcon />,  color: T.green },
          { label: 'Pending',           value: pendingCount,                                  icon: <AccessTimeIcon />,   color: T.yellow },
          { label: 'Revenue (Completed)', value: `${orders[0]?.currency ?? 'USD'} ${totalRevenue.toFixed(2)}`, icon: <AttachMoneyIcon />,  color: T.purple },
          { label: 'Active Subs',       value: activeSubs,                                    icon: <RepeatIcon />,       color: T.blue },
        ].map(kpi => (
          <Grid key={kpi.label} item xs={6} sm={4} md={'auto'} sx={{ flex: 1 }}>
            <Card sx={{ bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 2, height: '100%' }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Box sx={{ color: kpi.color, display: 'flex' }}>{kpi.icon}</Box>
                  <Typography variant="caption" sx={{ color: T.sub, fontWeight: 700, textTransform: 'uppercase', fontSize: '.68rem', letterSpacing: '.06em' }}>
                    {kpi.label}
                  </Typography>
                </Box>
                <Typography sx={{ color: T.text, fontWeight: 800, fontSize: '1.4rem' }}>{kpi.value}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2.5, '& .MuiTab-root': { fontWeight: 700, textTransform: 'none', fontSize: '.9rem' } }}>
        <Tab label={`Orders (${orders.length})`} icon={<ShoppingCartIcon sx={{ fontSize: '1rem' }} />} iconPosition="start" />
        <Tab label={`Subscriptions (${subscriptions.length})`} icon={<RepeatIcon sx={{ fontSize: '1rem' }} />} iconPosition="start" />
      </Tabs>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress sx={{ color: T.brand }} /></Box>
      ) : tab === 0 ? (
        /* ═══ ORDERS TAB ═══════════════════════════════════════════════════ */
        <Box>
          {/* Filters */}
          <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search order # or product…" size="small"
              InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: T.sub, fontSize: '1rem' }} /> }}
              sx={{ flex: 1, minWidth: 220, '& .MuiOutlinedInput-root': { fontSize: '.85rem', bgcolor: T.card, borderRadius: 1.5 } }}
            />
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel sx={{ fontSize: '.85rem' }}>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={e => setStatusFilter(e.target.value)}
                startAdornment={<FilterListIcon sx={{ fontSize: '1rem', mr: 0.5, color: T.sub }} />}
                sx={{ fontSize: '.85rem', bgcolor: T.card }}
              >
                {['ALL', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].map(s => (
                  <MenuItem key={s} value={s} sx={{ fontSize: '.85rem' }}>
                    {s === 'ALL' ? 'All Statuses' : s.charAt(0) + s.slice(1).toLowerCase()}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* Orders table */}
          {filteredOrders.length === 0 ? (
            <Paper sx={{ bgcolor: T.card, border: `1px solid ${T.border}`, p: 5, textAlign: 'center', borderRadius: 2 }}>
              <ShoppingCartIcon sx={{ color: T.sub, fontSize: '3rem', mb: 1.5 }} />
              <Typography sx={{ color: T.sub, fontWeight: 600 }}>No orders found</Typography>
              <Typography sx={{ color: T.sub, fontSize: '.82rem', mt: 0.5 }}>
                {search || statusFilter !== 'ALL' ? 'Try adjusting your search or filter.' : 'Orders placed for this organization will appear here.'}
              </Typography>
            </Paper>
          ) : (
            <Paper sx={{ bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 2, overflow: 'hidden' }}>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: T.card2 }}>
                      <TableCell sx={{ color: T.sub, fontWeight: 700, width: 40 }} />
                      {['Order #', 'Status', 'Items', 'Total', 'Date', 'Actions'].map(h => (
                        <TableCell key={h} sx={{ color: T.sub, fontWeight: 700, fontSize: '.78rem', textTransform: 'uppercase', letterSpacing: '.04em' }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredOrders.map(o => (
                      <React.Fragment key={o.id}>
                        <TableRow
                          hover
                          sx={{
                            bgcolor: expandedOrder === o.id ? `${T.brand}08` : 'transparent',
                            '& td': { borderBottom: expandedOrder === o.id ? 'none' : undefined },
                          }}
                        >
                          <TableCell sx={{ pr: 0 }}>
                            <IconButton
                              size="small"
                              onClick={() => setExpandedOrder(expandedOrder === o.id ? null : o.id)}
                              sx={{ color: T.sub }}
                            >
                              {expandedOrder === o.id ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                            </IconButton>
                          </TableCell>
                          <TableCell sx={{ color: T.text, fontWeight: 700, fontFamily: 'monospace', fontSize: '.88rem' }}>{o.order_number}</TableCell>
                          <TableCell>
                            <Chip
                              label={o.status.charAt(0) + o.status.slice(1).toLowerCase()}
                              size="small"
                              sx={{ bgcolor: `${statusColor(o.status)}22`, color: statusColor(o.status), fontWeight: 700, fontSize: '.74rem' }}
                            />
                          </TableCell>
                          <TableCell sx={{ color: T.sub, fontSize: '.85rem' }}>{o.items?.length ?? 0} item{(o.items?.length ?? 0) !== 1 ? 's' : ''}</TableCell>
                          <TableCell sx={{ color: T.text, fontWeight: 600 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Typography sx={{ fontSize: '.75rem', color: T.sub }}>{o.currency}</Typography>
                              <Typography sx={{ fontWeight: 700 }}>{parseFloat(o.total_amount).toFixed(2)}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell sx={{ color: T.sub, fontSize: '.82rem' }}>
                            {o.created_at ? new Date(o.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                          </TableCell>
                          <TableCell>
                            <Tooltip title="View Details">
                              <IconButton size="small" onClick={() => setDetailOrder(o)} sx={{ color: T.sub, '&:hover': { color: T.brand } }}>
                                <ReceiptIcon sx={{ fontSize: '1rem' }} />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>

                        {/* Expandable items row */}
                        {expandedOrder === o.id && (
                          <TableRow>
                            <TableCell />
                            <TableCell colSpan={6} sx={{ pb: 2, pt: 0 }}>
                              <Box sx={{ bgcolor: T.card2, borderRadius: 1.5, p: 1.5, mt: 0.5 }}>
                                <Typography sx={{ color: T.sub, fontSize: '.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', mb: 1 }}>Order Items</Typography>
                                {(o.items?.length ?? 0) === 0 ? (
                                  <Typography sx={{ color: T.sub, fontSize: '.82rem' }}>No items.</Typography>
                                ) : (
                                  <Table size="small">
                                    <TableHead>
                                      <TableRow>
                                        {['Product', 'Qty', 'Unit Price', 'Subtotal'].map(h => (
                                          <TableCell key={h} sx={{ color: T.sub, fontSize: '.72rem', fontWeight: 700, textTransform: 'uppercase', border: 'none', pb: 0.5 }}>{h}</TableCell>
                                        ))}
                                      </TableRow>
                                    </TableHead>
                                    <TableBody>
                                      {o.items.map(item => (
                                        <TableRow key={item.id} sx={{ '& td': { border: 'none', py: 0.5 } }}>
                                          <TableCell sx={{ color: T.text, fontSize: '.85rem', fontWeight: 600 }}>{item.product}</TableCell>
                                          <TableCell sx={{ color: T.sub, fontSize: '.85rem' }}>×{item.quantity}</TableCell>
                                          <TableCell sx={{ color: T.sub, fontSize: '.85rem' }}>{o.currency} {parseFloat(item.unit_price).toFixed(2)}</TableCell>
                                          <TableCell sx={{ color: T.text, fontSize: '.85rem', fontWeight: 600 }}>{o.currency} {parseFloat(item.total_price).toFixed(2)}</TableCell>
                                        </TableRow>
                                      ))}
                                      <TableRow sx={{ '& td': { border: 'none', pt: 0.75 } }}>
                                        <TableCell colSpan={3} sx={{ color: T.sub, fontWeight: 700, fontSize: '.8rem', textAlign: 'right' }}>Total</TableCell>
                                        <TableCell sx={{ color: T.brand, fontWeight: 800, fontSize: '.9rem' }}>{o.currency} {parseFloat(o.total_amount).toFixed(2)}</TableCell>
                                      </TableRow>
                                    </TableBody>
                                  </Table>
                                )}
                              </Box>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', px: 2, py: 1, borderTop: `1px solid ${T.border}` }}>
                <Typography sx={{ color: T.sub, fontSize: '.78rem' }}>
                  Showing {filteredOrders.length} of {orders.length} order{orders.length !== 1 ? 's' : ''}
                </Typography>
              </Box>
            </Paper>
          )}
        </Box>
      ) : (
        /* ═══ SUBSCRIPTIONS TAB ════════════════════════════════════════════ */
        <Box>
          {subscriptions.length === 0 ? (
            <Paper sx={{ bgcolor: T.card, border: `1px solid ${T.border}`, p: 5, textAlign: 'center', borderRadius: 2 }}>
              <RepeatIcon sx={{ color: T.sub, fontSize: '3rem', mb: 1.5 }} />
              <Typography sx={{ color: T.sub, fontWeight: 600 }}>No subscriptions yet</Typography>
              <Typography sx={{ color: T.sub, fontSize: '.82rem', mt: 0.5 }}>Active and past subscriptions will appear here.</Typography>
            </Paper>
          ) : (
            <Grid container spacing={2}>
              {subscriptions.map(s => (
                <Grid key={s.id} item xs={12} sm={6} md={4}>
                  <Card sx={{
                    bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 2, height: '100%',
                    borderTop: `3px solid ${statusColor(s.status)}`,
                  }}>
                    <CardContent sx={{ p: 2.5 }}>
                      {/* Header */}
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
                        <Box sx={{ flex: 1, pr: 1 }}>
                          <Typography sx={{ color: T.text, fontWeight: 800, fontSize: '1rem', lineHeight: 1.25 }}>{s.name}</Typography>
                          <Typography sx={{ color: T.sub, fontSize: '.78rem', mt: 0.25 }}>{s.provider}</Typography>
                        </Box>
                        <Chip
                          label={s.status.charAt(0) + s.status.slice(1).toLowerCase()}
                          size="small"
                          sx={{ bgcolor: `${statusColor(s.status)}22`, color: statusColor(s.status), fontWeight: 700, fontSize: '.72rem', flexShrink: 0 }}
                        />
                      </Box>

                      <Divider sx={{ borderColor: T.border, mb: 1.5 }} />

                      {/* Details */}
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography sx={{ color: T.sub, fontSize: '.8rem' }}>Billing</Typography>
                          <Chip
                            label={billingCycleLabel(s.billing_cycle)}
                            size="small"
                            icon={<RepeatIcon sx={{ fontSize: '.75rem !important' }} />}
                            sx={{ bgcolor: `${T.blue}18`, color: T.blue, fontWeight: 600, fontSize: '.72rem', height: 20 }}
                          />
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography sx={{ color: T.sub, fontSize: '.8rem' }}>Amount</Typography>
                          <Typography sx={{ color: T.text, fontWeight: 700, fontSize: '.95rem' }}>
                            {s.currency} {parseFloat(s.amount).toFixed(2)}
                            <Typography component="span" sx={{ color: T.sub, fontSize: '.72rem', fontWeight: 400, ml: 0.5 }}>
                              /{s.billing_cycle === 'MONTHLY' ? 'mo' : 'yr'}
                            </Typography>
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography sx={{ color: T.sub, fontSize: '.8rem' }}>Renewal</Typography>
                          <Typography sx={{ color: s.renewal_date ? T.text : T.sub, fontSize: '.82rem', fontWeight: s.renewal_date ? 600 : 400 }}>
                            {s.renewal_date ? new Date(s.renewal_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography sx={{ color: T.sub, fontSize: '.8rem' }}>Started</Typography>
                          <Typography sx={{ color: T.sub, fontSize: '.82rem' }}>
                            {s.created_at ? new Date(s.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      {/* ── Order Detail Dialog ──────────────────────────────────────────── */}
      <Dialog
        open={!!detailOrder}
        onClose={() => setDetailOrder(null)}
        maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: T.card, borderRadius: 2, border: `1px solid ${T.border}` } }}
      >
        {detailOrder && (
          <>
            <DialogTitle sx={{ pb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography sx={{ color: T.text, fontWeight: 800, fontSize: '1.1rem' }}>Order {detailOrder.order_number}</Typography>
                  <Typography sx={{ color: T.sub, fontSize: '.78rem' }}>
                    {detailOrder.created_at ? new Date(detailOrder.created_at).toLocaleString() : ''}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip
                    label={detailOrder.status.charAt(0) + detailOrder.status.slice(1).toLowerCase()}
                    size="small"
                    sx={{ bgcolor: `${statusColor(detailOrder.status)}22`, color: statusColor(detailOrder.status), fontWeight: 700 }}
                  />
                  <IconButton size="small" onClick={() => setDetailOrder(null)} sx={{ color: T.sub }}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
            </DialogTitle>
            <DialogContent sx={{ pt: 0 }}>
              <Divider sx={{ borderColor: T.border, mb: 2 }} />
              {(detailOrder.items?.length ?? 0) === 0 ? (
                <Alert severity="info" sx={{ fontSize: '.85rem' }}>No line items for this order.</Alert>
              ) : (
                <Box>
                  <Typography sx={{ color: T.sub, fontSize: '.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', mb: 1 }}>Line Items</Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {detailOrder.items.map(item => (
                      <Box key={item.id} sx={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        bgcolor: T.card2, borderRadius: 1.5, px: 2, py: 1.25,
                      }}>
                        <Box>
                          <Typography sx={{ color: T.text, fontWeight: 600, fontSize: '.9rem' }}>{item.product}</Typography>
                          <Typography sx={{ color: T.sub, fontSize: '.75rem' }}>
                            {detailOrder.currency} {parseFloat(item.unit_price).toFixed(2)} × {item.quantity}
                          </Typography>
                        </Box>
                        <Typography sx={{ color: T.text, fontWeight: 700 }}>
                          {detailOrder.currency} {parseFloat(item.total_price).toFixed(2)}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                  <Divider sx={{ borderColor: T.border, my: 2 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 1 }}>
                    <Typography sx={{ color: T.sub, fontWeight: 700 }}>Total</Typography>
                    <Typography sx={{ color: T.brand, fontWeight: 800, fontSize: '1.2rem' }}>
                      {detailOrder.currency} {parseFloat(detailOrder.total_amount).toFixed(2)}
                    </Typography>
                  </Box>
                </Box>
              )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={() => setDetailOrder(null)} sx={{ color: T.sub, textTransform: 'none' }}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}

function AuditModule({ orgId }: { orgId: string }) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    auditLogsApi.list(orgId)
      .then(data => setLogs(Array.isArray(data) ? data : []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [orgId]);

  return (
    <Box>
      <Typography sx={{ color: T.text, fontWeight: 700, fontSize: '1.3rem', mb: 3, fontFamily: T.font }}>
        Audit Logs
      </Typography>

      {loading ? (
        <CircularProgress />
      ) : logs.length === 0 ? (
        <Alert>No audit logs yet.</Alert>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: T.card2 }}>
                {['Actor', 'Action', 'Target', 'Time'].map(h => <TableCell key={h} sx={{ color: T.sub, fontWeight: 700 }}>{h}</TableCell>)}
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.slice(0, 20).map(log => (
                <TableRow key={log.id} hover>
                  <TableCell sx={{ color: T.text, fontSize: '.85rem' }}>{log.actor_name}</TableCell>
                  <TableCell sx={{ color: T.sub, fontSize: '.85rem' }}>{log.action}</TableCell>
                  <TableCell sx={{ color: T.sub, fontSize: '.85rem' }}>{log.target_label}</TableCell>
                  <TableCell sx={{ color: T.sub, fontSize: '.75rem', fontFamily: 'monospace' }}>
                    {new Date(log.timestamp).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}

function SettingsModule({ orgId }: { orgId: string }) {
  const [settings, setSettings] = useState<OrgSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState(0);
  const [apiKeys] = useState([
    { id: '1', name: 'Production API Key', key: 'sk-prod-••••••••••••••••••••••', created: '2026-01-10', lastUsed: '2026-03-03' },
    { id: '2', name: 'Development API Key', key: 'sk-dev-••••••••••••••••••••••', created: '2026-01-15', lastUsed: '2026-03-01' },
  ]);

  useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    orgSettingsApi.get(orgId)
      .then(setSettings)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [orgId]);

  return (
    <Box>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, '& .MuiTab-root': { fontWeight: 700, textTransform: 'none' } }}>
        <Tab label="General" />
        <Tab label="Notifications" />
        <Tab label="Branding" />
        <Tab label="API Keys" />
      </Tabs>

      {loading ? <CircularProgress /> : (
        <>
          {tab === 0 && (
            <Card sx={{ bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 2 }}>
              <CardHeader
                title={<Typography sx={{ fontWeight: 700 }}>General Preferences</Typography>}
                action={<Button size="small" startIcon={<EditIcon />} sx={{ color: T.brand }}>Edit</Button>}
              />
              <CardContent>
                <Grid container spacing={3}>
                  {[
                    { label: 'Language', value: settings?.language || 'English (US)' },
                    { label: 'Timezone', value: settings?.timezone || 'UTC' },
                    { label: 'Date Format', value: 'YYYY-MM-DD' },
                    { label: 'Currency', value: 'USD' },
                  ].map(f => (
                    <Grid key={f.label} item xs={12} sm={6}>
                      <Typography variant="caption" sx={{ color: T.sub, fontWeight: 700, textTransform: 'uppercase', fontSize: '.7rem', letterSpacing: '.06em', display: 'block' }}>{f.label}</Typography>
                      <Typography sx={{ color: T.text, mt: 0.5 }}>{f.value}</Typography>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          )}

          {tab === 1 && (
            <Card sx={{ bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 2 }}>
              <CardHeader title={<Typography sx={{ fontWeight: 700 }}>Notification Preferences</Typography>} />
              <CardContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {[
                    { label: 'Billing Notifications', sublabel: 'Invoices, payments, usage alerts', value: settings?.notifications_billing },
                    { label: 'Security Alerts', sublabel: 'Login activity, MFA changes, suspicious events', value: settings?.notifications_security },
                    { label: 'Usage Reports', sublabel: 'Weekly usage summaries and limit warnings', value: settings?.notifications_usage },
                    { label: 'Product Updates', sublabel: 'New features and platform announcements', value: true },
                  ].map(n => (
                    <Box key={n.label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, bgcolor: T.card2, borderRadius: 1.5, border: `1px solid ${T.border}` }}>
                      <Box>
                        <Typography sx={{ color: T.text, fontWeight: 600, fontSize: '.9rem' }}>{n.label}</Typography>
                        <Typography variant="caption" sx={{ color: T.sub }}>{n.sublabel}</Typography>
                      </Box>
                      <Switch defaultChecked={!!n.value} size="small" />
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          )}

          {tab === 2 && (
            <Card sx={{ bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 2 }}>
              <CardHeader
                title={<Typography sx={{ fontWeight: 700 }}>Branding Settings</Typography>}
                action={<Button size="small" startIcon={<EditIcon />} sx={{ color: T.brand }}>Edit</Button>}
              />
              <CardContent>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" sx={{ color: T.sub, fontWeight: 700, textTransform: 'uppercase', fontSize: '.7rem', letterSpacing: '.06em', display: 'block', mb: 1.5 }}>Organization Logo</Typography>
                    <Box sx={{ width: 90, height: 90, border: `2px dashed ${T.border}`, borderRadius: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', '&:hover': { borderColor: T.brand } }}>
                      <Typography variant="caption" sx={{ color: T.sub, textAlign: 'center', fontSize: '.75rem' }}>Upload<br />Logo</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" sx={{ color: T.sub, fontWeight: 700, textTransform: 'uppercase', fontSize: '.7rem', letterSpacing: '.06em', display: 'block', mb: 1.5 }}>Primary Brand Color</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box sx={{ width: 44, height: 44, borderRadius: 1.5, bgcolor: T.brand, border: `2px solid ${T.border}`, cursor: 'pointer', '&:hover': { opacity: 0.85 } }} />
                      <Typography sx={{ color: T.text, fontFamily: 'monospace', fontSize: '.9rem' }}>{T.brand}</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12}>
                    <Divider sx={{ borderColor: T.border }} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" sx={{ color: T.sub, fontWeight: 700, textTransform: 'uppercase', fontSize: '.7rem', letterSpacing: '.06em', display: 'block', mb: 1.5 }}>Favicon</Typography>
                    <Box sx={{ width: 48, height: 48, border: `2px dashed ${T.border}`, borderRadius: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      <Typography variant="caption" sx={{ color: T.sub, fontSize: '.7rem' }}>Upload</Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          )}

          {tab === 3 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="body2" sx={{ color: T.sub }}>Manage API keys for programmatic access to your organization.</Typography>
                <Button startIcon={<AddIcon />} variant="contained" size="small" sx={{ bgcolor: T.brand }}>Generate Key</Button>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {apiKeys.map(k => (
                  <Paper key={k.id} sx={{ p: 2.5, bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography sx={{ color: T.text, fontWeight: 700, mb: 0.5 }}>{k.name}</Typography>
                        <Typography sx={{ color: T.sub, fontFamily: 'monospace', fontSize: '.85rem', letterSpacing: '.05em' }}>{k.key}</Typography>
                        <Typography variant="caption" sx={{ color: T.sub, mt: 0.5, display: 'block' }}>
                          Created {k.created} &nbsp;·&nbsp; Last used {k.lastUsed}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="Copy key">
                          <IconButton size="small" sx={{ color: T.sub, '&:hover': { color: T.brand } }}><ContentCopyIcon fontSize="small" /></IconButton>
                        </Tooltip>
                        <Tooltip title="Revoke key">
                          <IconButton size="small" sx={{ color: T.sub, '&:hover': { color: T.red } }}><DeleteIcon fontSize="small" /></IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                  </Paper>
                ))}
              </Box>
            </Box>
          )}
        </>
      )}
    </Box>
  );
}

// ── Meetings Module ─────────────────────────────────────────────────────────
function MeetingsModule({ orgId }: { orgId: string }) {
  const upcomingMeetings = [
    { id: '1', title: 'Engineering Standup', date: '2026-03-05', time: '09:00', duration: 30, attendees: 8, type: 'recurring' },
    { id: '2', title: 'Product Review Q1', date: '2026-03-06', time: '14:00', duration: 60, attendees: 14, type: 'scheduled' },
    { id: '3', title: 'Board Sync', date: '2026-03-10', time: '11:00', duration: 90, attendees: 5, type: 'scheduled' },
  ];
  const stats = [
    { label: 'This Week',    value: '3',   color: T.brand },
    { label: 'This Month',   value: '12',  color: T.blue },
    { label: 'Avg Duration', value: '45m', color: T.green },
    { label: 'Participants', value: '24',  color: T.purple },
  ];
  return (
    <Box>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {stats.map(s => (
          <Grid key={s.label} item xs={6} sm={3}>
            <Card sx={{ bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 2, textAlign: 'center', p: 2 }}>
              <Typography sx={{ color: s.color, fontWeight: 800, fontSize: '1.8rem' }}>{s.value}</Typography>
              <Typography sx={{ color: T.sub, fontSize: '.8rem', mt: 0.25 }}>{s.label}</Typography>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography sx={{ color: T.text, fontWeight: 700, fontSize: '1.05rem' }}>Upcoming Meetings</Typography>
        <Button size="small" variant="contained" startIcon={<AddIcon />}
          sx={{ bgcolor: T.brand, textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: T.brand } }}>
          Schedule Meeting
        </Button>
      </Box>

      {upcomingMeetings.map(m => (
        <Card key={m.id} sx={{ bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 2, mb: 1.5 }}>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ bgcolor: `${T.brand}18`, borderRadius: 1.5, p: 1, display: 'flex', color: T.brand }}>
                  <EventIcon sx={{ fontSize: '1.2rem' }} />
                </Box>
                <Box>
                  <Typography sx={{ color: T.text, fontWeight: 700, fontSize: '.95rem' }}>{m.title}</Typography>
                  <Typography sx={{ color: T.sub, fontSize: '.78rem' }}>
                    {m.date} at {m.time} &nbsp;·&nbsp; {m.duration} min &nbsp;·&nbsp; {m.attendees} attendees
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Chip label={m.type} size="small"
                  sx={{ bgcolor: m.type === 'recurring' ? `${T.blue}18` : `${T.green}18`,
                        color: m.type === 'recurring' ? T.blue : T.green, fontSize: '.72rem' }} />
                <Button size="small" variant="outlined"
                  sx={{ borderColor: T.border, color: T.sub, textTransform: 'none', '&:hover': { borderColor: T.brand, color: T.brand } }}>
                  Join
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>
      ))}

      <Card sx={{ bgcolor: T.card, border: `1px dashed ${T.border}`, borderRadius: 2, mt: 2 }}>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <EventIcon sx={{ color: T.sub, fontSize: '2.5rem', mb: 1, opacity: 0.4 }} />
          <Typography sx={{ color: T.sub, fontSize: '.9rem' }}>Full calendar & meeting history coming soon.</Typography>
        </CardContent>
      </Card>
    </Box>
  );
}

// ── Enterprise Dev Workspace Module ──────────────────────────────────────────
// Workspaces created here carry created_from_dashboard='enterprise' and are
// therefore invisible on the personal Developer Dashboard.
function EnterpriseDevWorkspaceModule({ org, orgSlug }: { org: OrgData; orgSlug: string }) {
  const [workspaces, setWorkspaces] = useState<DevWs[]>([]);
  const [loading, setLoading]       = useState(true);
  const [actionBusy, setActionBusy] = useState<Record<string, boolean>>({});
  const [wizardOpen, setWizardOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DevWs | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listDevWorkspaces({ dashboard: 'enterprise', parent_context_id: orgSlug });
      setWorkspaces(Array.isArray(data) ? data : []);
    } finally { setLoading(false); }
  }, [orgSlug]);

  useEffect(() => { load(); }, [load]);

  const withBusy = async (id: string, fn: () => Promise<void>) => {
    setActionBusy(b => ({ ...b, [id]: true }));
    try { await fn(); await load(); } finally {
      setActionBusy(b => ({ ...b, [id]: false }));
    }
  };

  const statusColor = (s: string) => (
    s === 'running'  ? T.green  :
    s === 'starting' ? T.yellow :
    s === 'stopping' ? T.yellow :
    s === 'error'    ? T.red    : T.sub
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: '1.3rem', color: T.brand, fontFamily: T.font }}>
            Enterprise Dev Workspaces
          </Typography>
          <Typography sx={{ fontSize: '.82rem', color: T.sub, mt: .3, fontFamily: T.font }}>
            Workspaces here are enterprise-scoped and hidden from the personal Developer Dashboard.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />}
          onClick={() => setWizardOpen(true)}
          sx={{ bgcolor: T.brand, '&:hover': { bgcolor: '#0f2d5a' }, fontFamily: T.font, fontWeight: 700 }}>
          New Workspace
        </Button>
      </Box>

      {loading && <LinearProgress sx={{ borderRadius: 1, mb: 2 }} />}

      {!loading && workspaces.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
          <LaptopIcon sx={{ fontSize: 40, color: T.sub, mb: 1 }} />
          <Typography sx={{ fontFamily: T.font, color: T.sub, mb: 2 }}>
            No enterprise workspaces yet.
          </Typography>
          <Button variant="outlined" onClick={() => setWizardOpen(true)} startIcon={<AddIcon />}>
            Create first workspace
          </Button>
        </Paper>
      )}

      <Grid container spacing={2}>
        {workspaces.map(ws => (
          <Grid item xs={12} md={6} key={ws.workspace_id}>
            <Card variant="outlined" sx={{ borderRadius: 2 }}>
              <CardContent sx={{ pb: '12px !important' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography sx={{ fontWeight: 700, fontFamily: T.font, fontSize: '.9rem', color: T.brand }}>
                    {ws.display_name}
                  </Typography>
                  <Chip label={ws.status} size="small"
                    sx={{ bgcolor: `${statusColor(ws.status)}22`, color: statusColor(ws.status),
                          fontWeight: 700, fontSize: '.7rem' }} />
                </Box>
                <Typography sx={{ fontSize: '.75rem', color: T.sub, fontFamily: T.font, mb: 1.5 }}>
                  {ws.workspace_id}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
                  {ws.region && <Chip label={ws.region} size="small" variant="outlined" sx={{ fontSize: '.7rem' }} />}
                  <Chip icon={<MemoryIcon sx={{ fontSize: 14 }} />}
                    label={`${ws.vcpus} vCPU / ${ws.ram_gb} GB`} size="small" variant="outlined"
                    sx={{ fontSize: '.7rem' }} />
                </Box>
                <Box sx={{ display: 'flex', gap: .75 }}>
                  {ws.status === 'stopped' && (
                    <Tooltip title="Start">
                      <IconButton size="small" disabled={!!actionBusy[ws.workspace_id]}
                        onClick={() => withBusy(ws.workspace_id, () => startDevWorkspace(ws.workspace_id) as Promise<any>)}>
                        <PlayArrowIcon fontSize="small" sx={{ color: T.green }} />
                      </IconButton>
                    </Tooltip>
                  )}
                  {ws.status === 'running' && (
                    <Tooltip title="Stop">
                      <IconButton size="small" disabled={!!actionBusy[ws.workspace_id]}
                        onClick={() => withBusy(ws.workspace_id, () => stopDevWorkspace(ws.workspace_id) as Promise<any>)}>
                        <StopIcon fontSize="small" sx={{ color: T.red }} />
                      </IconButton>
                    </Tooltip>
                  )}
                  {ws.editor_url && ws.status === 'running' && (
                    <Tooltip title="Open IDE">
                      <IconButton size="small" component="a" href={ws.editor_url} target="_blank">
                        <OpenInNewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="Delete">
                    <IconButton size="small" disabled={ws.status !== 'stopped' || !!actionBusy[ws.workspace_id]}
                      onClick={() => setDeleteTarget(ws)}>
                      <DeleteIcon fontSize="small" sx={{ color: T.red }} />
                    </IconButton>
                  </Tooltip>
                  {actionBusy[ws.workspace_id] && <CircularProgress size={16} sx={{ ml: .5 }} />}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <WorkspaceCreationWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onCreated={() => { setWizardOpen(false); load(); }}
        enterpriseOrgSlug={orgSlug}
      />

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontFamily: T.font, fontWeight: 700 }}>Delete Workspace</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontFamily: T.font }}>
            Delete <strong>{deleteTarget?.display_name}</strong>? This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="contained" color="error" disabled={!!actionBusy[deleteTarget?.workspace_id ?? '']}
            onClick={() => deleteTarget && withBusy(deleteTarget.workspace_id, async () => {
              await deleteDevWorkspace(deleteTarget.workspace_id);
              setDeleteTarget(null);
            })}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ── Developer Hub Module ──────────────────────────────────────────────────────
function DeveloperHubModule({ orgId }: { orgId: string }) {
  const [tab, setTab] = useState(0);
  const apiEndpoints = [
    { method: 'GET',    path: '/api/v1/organizations/:id',           desc: 'Fetch organization details' },
    { method: 'GET',    path: '/api/v1/organizations/:id/members',   desc: 'List organization members' },
    { method: 'POST',   path: '/api/v1/organizations/:id/orders',    desc: 'Create a new order' },
    { method: 'GET',    path: '/api/v1/organizations/:id/orders',    desc: 'List all orders' },
    { method: 'GET',    path: '/api/v1/organizations/:id/billing-subscription/current/', desc: 'Get active subscription' },
    { method: 'POST',   path: '/api/v1/auth/token/',                  desc: 'Obtain auth token (JWT)' },
    { method: 'POST',   path: '/api/v1/auth/token/refresh/',          desc: 'Refresh auth token' },
  ];
  const sdks = [
    { name: 'Python SDK',     lang: 'Python',     status: 'stable',      version: 'v2.4.1', color: '#3776AB' },
    { name: 'Node.js SDK',    lang: 'JavaScript', status: 'stable',      version: 'v2.3.0', color: '#339933' },
    { name: 'Go SDK',         lang: 'Go',         status: 'beta',        version: 'v0.9.2', color: '#00ADD8' },
    { name: 'Ruby SDK',       lang: 'Ruby',       status: 'stable',      version: 'v1.8.0', color: '#CC342D' },
    { name: 'Java SDK',       lang: 'Java',       status: 'coming-soon', version: '—',      color: '#007396' },
  ];
  const webhookEvents = [
    'organization.updated', 'member.invited', 'member.removed',
    'order.created', 'order.completed', 'order.cancelled',
    'subscription.activated', 'subscription.cancelled',
    'billing.invoice_paid', 'billing.payment_failed',
  ];
  const methodColor = (m: string) =>
    m === 'GET' ? T.green : m === 'POST' ? T.brand : m === 'DELETE' ? T.red : T.yellow;

  return (
    <Box>
      <Tabs value={tab} onChange={(_, v) => setTab(v)}
        sx={{ mb: 3, '& .MuiTab-root': { fontWeight: 700, textTransform: 'none', fontSize: '.9rem' } }}>
        <Tab label="REST API" />
        <Tab label="SDKs" />
        <Tab label="Webhooks" />
        <Tab label="API Keys" />
      </Tabs>

      {/* ── REST API ── */}
      {tab === 0 && (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography sx={{ color: T.text, fontWeight: 700 }}>API Reference</Typography>
            <Button size="small" variant="outlined" endIcon={<OpenInNewIcon />}
              sx={{ borderColor: T.border, color: T.sub, textTransform: 'none', '&:hover': { borderColor: T.brand, color: T.brand } }}>
              Full Docs
            </Button>
          </Box>
          <Card sx={{ bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 2, overflow: 'hidden' }}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: `${T.brand}08` }}>
                    <TableCell sx={{ color: T.sub, fontWeight: 700, fontSize: '.75rem', textTransform: 'uppercase' }}>Method</TableCell>
                    <TableCell sx={{ color: T.sub, fontWeight: 700, fontSize: '.75rem', textTransform: 'uppercase' }}>Endpoint</TableCell>
                    <TableCell sx={{ color: T.sub, fontWeight: 700, fontSize: '.75rem', textTransform: 'uppercase' }}>Description</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {apiEndpoints.map((e, i) => (
                    <TableRow key={i} hover sx={{ '&:hover': { bgcolor: `${T.brand}06` } }}>
                      <TableCell>
                        <Chip label={e.method} size="small"
                          sx={{ bgcolor: `${methodColor(e.method)}20`, color: methodColor(e.method),
                               fontWeight: 700, fontSize: '.7rem', height: 20, minWidth: 48,
                               '& .MuiChip-label': { px: 0.75 } }} />
                      </TableCell>
                      <TableCell sx={{ color: T.text, fontFamily: 'monospace', fontSize: '.82rem' }}>{e.path}</TableCell>
                      <TableCell sx={{ color: T.sub, fontSize: '.83rem' }}>{e.desc}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Box>
      )}

      {/* ── SDKs ── */}
      {tab === 1 && (
        <Grid container spacing={2}>
          {sdks.map(sdk => (
            <Grid key={sdk.name} item xs={12} sm={6} md={4}>
              <Card sx={{ bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 2, p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: sdk.color, flexShrink: 0 }} />
                  <Typography sx={{ color: T.text, fontWeight: 700, fontSize: '.95rem' }}>{sdk.name}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Chip label={sdk.status} size="small"
                    sx={{
                      bgcolor: sdk.status === 'stable' ? `${T.green}18` : sdk.status === 'beta' ? `${T.yellow}18` : `${T.sub}18`,
                      color:   sdk.status === 'stable' ? T.green   : sdk.status === 'beta' ? T.yellow   : T.sub,
                      fontSize: '.72rem',
                    }} />
                  <Typography sx={{ color: T.sub, fontSize: '.8rem', fontFamily: 'monospace' }}>{sdk.version}</Typography>
                </Box>
                {sdk.status !== 'coming-soon' && (
                  <Button size="small" variant="outlined" fullWidth sx={{ mt: 1.5, borderColor: T.border, color: T.sub, textTransform: 'none', '&:hover': { borderColor: T.brand, color: T.brand } }}>
                    Install
                  </Button>
                )}
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* ── Webhooks ── */}
      {tab === 2 && (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography sx={{ color: T.text, fontWeight: 700 }}>Webhook Events</Typography>
            <Button size="small" variant="contained" startIcon={<AddIcon />}
              sx={{ bgcolor: T.brand, textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: T.brand } }}>
              Add Endpoint
            </Button>
          </Box>
          <Grid container spacing={1}>
            {webhookEvents.map(ev => (
              <Grid key={ev} item xs={12} sm={6} md={4}>
                <Paper sx={{ bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 1.5, px: 2, py: 1.25,
                             display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: T.green, flexShrink: 0 }} />
                  <Typography sx={{ color: T.text, fontFamily: 'monospace', fontSize: '.82rem' }}>{ev}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* ── API Keys ── */}
      {tab === 3 && (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography sx={{ color: T.text, fontWeight: 700 }}>API Keys</Typography>
            <Button size="small" variant="contained" startIcon={<AddIcon />}
              sx={{ bgcolor: T.brand, textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: T.brand } }}>
              Generate Key
            </Button>
          </Box>
          {[
            { name: 'Production Key', key: 'sk-prod-••••••••••••••', created: '2026-01-10', lastUsed: '2026-03-03', status: 'active' },
            { name: 'Development Key', key: 'sk-dev-••••••••••••••', created: '2026-01-15', lastUsed: '2026-03-01', status: 'active' },
          ].map((k, i) => (
            <Card key={i} sx={{ bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 2, mb: 1.5 }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                  <Box>
                    <Typography sx={{ color: T.text, fontWeight: 700, fontSize: '.9rem' }}>{k.name}</Typography>
                    <Typography sx={{ color: T.sub, fontFamily: 'monospace', fontSize: '.8rem', mt: 0.25 }}>{k.key}</Typography>
                    <Typography sx={{ color: T.sub, fontSize: '.72rem', mt: 0.25 }}>Created {k.created} &nbsp;·&nbsp; Last used {k.lastUsed}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Chip label={k.status} size="small" sx={{ bgcolor: `${T.green}18`, color: T.green, fontSize: '.72rem' }} />
                    <IconButton size="small" sx={{ color: T.sub }}><ContentCopyIcon sx={{ fontSize: '1rem' }} /></IconButton>
                    <IconButton size="small" sx={{ color: T.sub, '&:hover': { color: T.red } }}><DeleteIcon sx={{ fontSize: '1rem' }} /></IconButton>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
    </Box>
  );
}

// ── Docs Module ─────────────────────────────────────────────────────────────
const DocsModule: React.FC = () => {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/docs', { replace: true });
  }, [navigate]);
  return null;
};

// ── Wiki Module ─────────────────────────────────────────────────────────────
// Redirects to the standalone full-screen wiki page (like DocsModule → /docs)
const WikiModule: React.FC<{ orgId: string; orgSlug?: string }> = ({ orgSlug }) => {
  const navigate = useNavigate();
  useEffect(() => {
    navigate(`/enterprise/${orgSlug}/wiki`, { replace: true });
  }, [navigate, orgSlug]);
  return null;
};

// ── Main page ──────────────────────────────────────────────────────────────
const BusinessWorkspacePage: React.FC = () => {
  const { orgSlug = '', module: moduleParam } = useParams<{ orgSlug: string; module?: string }>();
  const navigate = useNavigate();

  // Derive active module from URL param — default to 'overview'
  const module: WorkspaceModule = (
    moduleParam && VALID_MODULES.includes(moduleParam as WorkspaceModule)
      ? moduleParam as WorkspaceModule
      : 'overview'
  );

  const [org, setOrg] = useState<OrgData | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [snack, setSnack] = useState('');

  useEffect(() => {
    if (!orgSlug) {
      navigate('/enterprise', { replace: true });
      return;
    }

    setLoading(true);
    organizationApi.getBySlug(orgSlug)
      .then(setOrg)
      .catch(() => navigate('/enterprise', { replace: true }))
      .finally(() => setLoading(false));
  }, [orgSlug, navigate]);

  // Navigate to a workspace module URL (or directly to enterprise page for external modules)
  const goToModule = (m: typeof MODULES[number]) => {
    if (m.externalLink) {
      navigate(m.enterprisePath(orgSlug));
    } else {
      navigate(`/enterprise/${orgSlug}/workspace/${m.key}`);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress sx={{ color: T.brand }} />
      </Box>
    );
  }

  if (!org) return null;

  const moduleConfig = MODULES.find(m => m.key === module)!

  return (
    <Box sx={{ display: 'flex', height: '100vh', bgcolor: T.bg, fontFamily: T.font }}>

      {/* ── Sidebar ── */}
      {sidebarOpen && (
        <Box sx={{
          width: SIDEBAR_WIDTH, flexShrink: 0,
          bgcolor: T.card2, borderRight: `1px solid ${T.border}`,
          display: 'flex', flexDirection: 'column',
          overflowY: 'auto',
        }}>
          {/* Brand strip */}
          <Box sx={{
            px: 2, py: 1.75,
            borderBottom: `1px solid ${T.border}`,
            display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0,
          }}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: T.brand, fontWeight: 800, fontSize: '.85rem', borderRadius: '6px' }}>
              {org.name?.slice(0, 2).toUpperCase()}
            </Avatar>
            <Box>
              <Typography sx={{ color: T.text, fontWeight: 700, fontSize: '.85rem', lineHeight: 1.2 }}>
                {org.name}
              </Typography>
              <Typography variant="caption" sx={{ color: T.sub, fontSize: '.68rem' }}>Business Workspace</Typography>
            </Box>
          </Box>

          {/* Module nav */}
          <Box sx={{ py: 1.5, flex: 1 }}>
            {SIDEBAR_GROUPS.map((grp, gi) => {
              const grpModules = grp.keys.map(k => MODULES.find(m => m.key === k)!).filter(Boolean);
              return (
                <Box key={grp.label} sx={{ mb: gi < SIDEBAR_GROUPS.length - 1 ? 1.5 : 0 }}>
                  <Typography sx={{ color: T.sub, fontSize: '.65rem', fontWeight: 700, textTransform: 'uppercase', px: 2, mb: 0.5, letterSpacing: '.08em' }}>
                    {grp.label}
                  </Typography>
                  {grpModules.map(m => {
                    const isActive = module === m.key;
                    return (
                      <Box
                        key={m.key}
                        onClick={() => goToModule(m)}
                        sx={{
                          display: 'flex', alignItems: 'center', gap: 1.5,
                          px: 2, py: 0.85, mx: 1, borderRadius: 1.5, cursor: 'pointer', mb: 0.25,
                          bgcolor: isActive ? `${T.brand}20` : 'transparent',
                          '&:hover': { bgcolor: isActive ? `${T.brand}20` : `${T.brand}08` },
                          transition: 'background .15s',
                        }}
                      >
                        <Box sx={{ color: isActive ? T.brand : T.sub, fontSize: '1rem', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                          {m.icon}
                        </Box>
                        <Typography sx={{ color: isActive ? T.text : T.sub, fontWeight: isActive ? 600 : 400, fontSize: '.85rem', flex: 1 }}>
                          {m.label}
                        </Typography>
                        {m.externalLink && (
                          <OpenInNewIcon sx={{ fontSize: '.75rem', color: T.sub, opacity: .5 }} />
                        )}
                        {isActive && !m.externalLink && (
                          <Box sx={{ width: 3, height: 18, bgcolor: T.brand, borderRadius: 4, flexShrink: 0 }} />
                        )}
                      </Box>
                    );
                  })}
                </Box>
              );
            })}
          </Box>

          <Divider sx={{ borderColor: T.border }} />
          <Box sx={{ p: 1.5 }}>
            <Box
              onClick={() => navigate(`/enterprise/${orgSlug}/overview`)}
              sx={{
                display: 'flex', alignItems: 'center', gap: 1.5,
                px: 1.5, py: 1, borderRadius: 1.5, cursor: 'pointer',
                '&:hover': { bgcolor: `${T.brand}08` },
              }}
            >
              <ArrowBackIcon sx={{ fontSize: '1rem', color: T.sub }} />
              <Typography sx={{ fontSize: '.83rem', color: T.sub }}>Back to Enterprise</Typography>
            </Box>
          </Box>
        </Box>
      )}

      {/* ── Main (TopBar + scrollable content) ── */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* DashboardTopBar — identical to EnterpriseDashboardPage chrome */}
        <DashboardTopBar
          routeBase={`/enterprise/${orgSlug}/overview`}
          leftContent={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton
                size="small"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                sx={{ color: T.sub, '&:hover': { color: T.text }, mr: 0.5 }}
              >
                {sidebarOpen ? <CloseIcon /> : <MenuIcon />}
              </IconButton>
              <Typography sx={{ color: T.text, fontWeight: 600, fontSize: '.95rem' }}>
                {moduleConfig.label}
              </Typography>
            </Box>
          }
          actions={
            <Chip
              label={org.name}
              size="small"
              sx={{ bgcolor: `${T.brand}18`, color: T.brand, fontWeight: 600, fontSize: '.72rem', mr: 0.5 }}
            />
          }
        />

        {/* Scrollable content */}
        <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
          <Box sx={{ maxWidth: 1400 }}>

            {/* Hero Banner */}
            <Box sx={{
              mb: 3, p: 3, borderRadius: 2,
              background: `linear-gradient(135deg, ${T.brand}18 0%, ${T.blue}10 50%, ${T.purple}10 100%)`,
              border: `1px solid ${T.brand}30`,
              display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap',
            }}>
              <Box sx={{ bgcolor: `${T.brand}15`, borderRadius: 2, p: 1.5, color: T.brand, display: 'flex', fontSize: '2.2rem' }}>
                {moduleConfig.icon}
              </Box>
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <Typography sx={{ color: T.text, fontWeight: 800, fontSize: '1.7rem', fontFamily: T.font, lineHeight: 1, mb: 0.5 }}>
                  {moduleConfig.label}
                </Typography>
                <Typography variant="body2" sx={{ color: T.sub }}>
                  {moduleConfig.desc}
                </Typography>
              </Box>
              <Button
                variant="outlined" size="small" endIcon={<OpenInNewIcon />}
                onClick={() => navigate(moduleConfig.enterprisePath(orgSlug))}
                sx={{ borderColor: T.border, color: T.sub, fontWeight: 600, '&:hover': { borderColor: T.brand, color: T.brand } }}
              >
                Open in Enterprise
              </Button>
            </Box>

            {/* Module content */}
            {module === 'overview'     && <OverviewModule org={org} orgId={org.id} />}
            {module === 'organization' && <OrganizationModule org={org} />}
            {module === 'departments'  && <DepartmentsModule orgId={org.id} />}
            {module === 'members'      && <MembersModule orgId={org.id} />}
            {module === 'billing'      && <BillingModule orgId={org.id} />}
            {module === 'domains'      && <DomainsModule orgId={org.id} />}
            {module === 'email'        && <EmailModule orgId={org.id} />}
            {module === 'marketing'    && <MarketingModule orgSlug={orgSlug} navigate={navigate} />}
            {module === 'compliance'   && <ComplianceModule orgId={org.id} />}
            {module === 'integrations' && <IntegrationsModule orgId={org.id} />}
            {module === 'orders'       && <OrdersModule orgId={org.id} />}
            {module === 'audit'        && <AuditModule orgId={org.id} />}
            {module === 'settings'     && <SettingsModule orgId={org.id} />}
            {module === 'wiki'         && <WikiModule orgId={org.id} orgSlug={orgSlug} />}
            {module === 'docs'         && <DocsModule />}
            {module === 'meetings'     && <MeetingsModule orgId={org.id} />}
            {module === 'developer-hub' && <DeveloperHubModule orgId={org.id} />}
            {module === 'developer'     && <EnterpriseDevWorkspaceModule org={org} orgSlug={orgSlug} />}
          </Box>
        </Box>
      </Box>

      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack('')} message={snack} />
    </Box>
  );
};

export default BusinessWorkspacePage;
