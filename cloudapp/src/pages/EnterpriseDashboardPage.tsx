// OrcaCloud Enterprise Dashboard
// Comprehensive business command center for organizations with all core modules

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, CardHeader, Chip, Button, Avatar,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer, LinearProgress,
  TextField, MenuItem, Select, FormControl, InputLabel, Dialog, DialogTitle,
  DialogContent, DialogActions, Tabs, Tab, Divider, IconButton, Tooltip,
  Alert, Snackbar, Paper, CircularProgress, Switch, FormControlLabel, Autocomplete,
} from '@mui/material';
import { useParams, useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import {
  organizationApi, membersApi, sendDomainsApi, senderIdentitiesApi,
  emailTemplatesApi, orgDomainsApi, brandingApi, auditLogsApi,
  departmentsApi, orgTeamsApi, orgGroupsApi,
} from '../services/enterpriseApi';
import type {
  OrgData, OrgMember, SendDomain, SenderIdentity, EmailTemplate,
  OrgDomain, BrandingProfile, BrandAsset, AuditLogEntry,
  Department as ApiDepartment,
} from '../services/enterpriseApi';

// Icons
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import GroupsIcon from '@mui/icons-material/Groups';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import CampaignIcon from '@mui/icons-material/Campaign';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import DomainIcon from '@mui/icons-material/Language';
import PaletteIcon from '@mui/icons-material/Palette';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import GppGoodIcon from '@mui/icons-material/GppGood';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import DnsIcon from '@mui/icons-material/Dns';
import VerifiedIcon from '@mui/icons-material/Verified';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteIcon from '@mui/icons-material/Delete';
import ColorLensIcon from '@mui/icons-material/ColorLens';
import BusinessIcon from '@mui/icons-material/Business';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon    from '@mui/icons-material/ArrowBack';
import PeopleIcon from '@mui/icons-material/People';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import BarChartIcon from '@mui/icons-material/BarChart';
import AssignmentIcon from '@mui/icons-material/Assignment';
import SettingsIcon from '@mui/icons-material/Settings';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import BadgeIcon from '@mui/icons-material/Badge';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import WorkspacesIcon  from '@mui/icons-material/Workspaces';
import ArticleIcon     from '@mui/icons-material/Article';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { dashboardTokens, dashboardSemanticColors } from '../styles/dashboardDesignSystem';
import { COUNTRIES } from './CreateOrganizationPage';
import CreateOrganizationDialog from '../components/CreateOrganizationDialog';
import DashboardTopBar from '../components/Layout/DashboardTopBar';
import DepartmentPage   from './DepartmentPage';

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

// ── Universal Constants ────────────────────────────────────────────────────
const INDUSTRIES = [
  'Technology & Software', 'Finance & Banking', 'Healthcare & Life Sciences',
  'Energy & Utilities', 'Oil & Gas', 'Manufacturing & Industrial',
  'Retail & E-commerce', 'Transportation & Logistics', 'Media & Entertainment',
  'Telecommunications', 'Education & Research', 'Government & Public Sector',
  'Agriculture & Food', 'Real Estate & Construction', 'Hospitality & Tourism',
  'Sports & Recreation', 'Legal & Compliance', 'Nonprofit & NGOs',
  'Automotive', 'Aerospace & Defense', 'Pharmaceuticals', 'Insurance',
  'Cybersecurity', 'Consulting & Professional Services',
];

const DEPT_PRESETS = [
  // Core
  'Executive Office', 'Human Resources', 'Finance & Accounting',
  'Legal & Compliance', 'Operations', 'Administration',
  'Procurement / Supply Chain', 'Customer Support / Customer Success',
  'Sales', 'Marketing', 'Public Relations / Communications',
  'IT & Infrastructure', 'Security',
  // Technical
  'Engineering / Software Development', 'Product Management',
  'Quality Assurance (QA)', 'DevOps / Cloud Operations', 'Data Science & AI',
  'Research & Development (R&D)', 'Design (UI/UX)',
  // Industry-specific
  'Healthcare Services', 'Manufacturing / Production',
  'Laboratory / Scientific Research', 'Media Production', 'Sports Management',
  'Energy Operations', 'Logistics & Fleet Management', 'Agriculture Operations',
  // Optional / Modern
  'Innovation / Strategy', 'Business Intelligence', 'Risk Management',
  'Sustainability / ESG', 'Investor Relations', 'Training & Development',
  'Community & Social Impact',
];

// Global standard department categories — searchable grouped dropdown
const DEPT_CATEGORIES: { group: string; label: string }[] = [
  // Business
  { group: 'Business', label: 'Administration' },
  { group: 'Business', label: 'Finance' },
  { group: 'Business', label: 'Human Resources (HR)' },
  { group: 'Business', label: 'Legal & Compliance' },
  { group: 'Business', label: 'Operations' },
  { group: 'Business', label: 'Procurement' },
  { group: 'Business', label: 'Sales' },
  { group: 'Business', label: 'Marketing' },
  { group: 'Business', label: 'Customer Support' },
  { group: 'Business', label: 'Product Management' },
  { group: 'Business', label: 'Business Development' },
  { group: 'Business', label: 'Partnerships & Alliances' },
  { group: 'Business', label: 'Public Relations / Communications' },
  { group: 'Business', label: 'Strategy & Planning' },
  { group: 'Business', label: 'Investor Relations' },
  // Technical
  { group: 'Technical', label: 'Engineering / Software Development' },
  { group: 'Technical', label: 'IT & Infrastructure' },
  { group: 'Technical', label: 'Security / Cybersecurity' },
  { group: 'Technical', label: 'Research & Development (R&D)' },
  { group: 'Technical', label: 'Data & Analytics' },
  { group: 'Technical', label: 'Quality Assurance' },
  { group: 'Technical', label: 'Computing & Technology' },
  // Creative
  { group: 'Creative', label: 'Design / Creative' },
  { group: 'Creative', label: 'Media & Content' },
  { group: 'Creative', label: 'Training & Learning' },
  { group: 'Creative', label: 'Education & Training' },
  // Operations
  { group: 'Operations', label: 'Manufacturing / Production' },
  { group: 'Operations', label: 'Logistics / Supply Chain' },
  { group: 'Operations', label: 'Facilities / Maintenance' },
  { group: 'Operations', label: 'Health & Safety' },
  { group: 'Operations', label: 'Construction & Architecture' },
  { group: 'Operations', label: 'Transportation' },
  // Industry-specific
  { group: 'Industry-specific', label: 'Science & Research' },
  { group: 'Industry-specific', label: 'Medical / Healthcare' },
  { group: 'Industry-specific', label: 'Government & Public Sector' },
  { group: 'Industry-specific', label: 'Nonprofit / NGO' },
  { group: 'Industry-specific', label: 'Hospitality & Tourism' },
  { group: 'Industry-specific', label: 'Real Estate' },
  { group: 'Industry-specific', label: 'Energy & Environment' },
  { group: 'Industry-specific', label: 'Agriculture' },
  { group: 'Industry-specific', label: 'Retail & E-commerce' },
  { group: 'Industry-specific', label: 'Sports & Entertainment' },
  { group: 'Other', label: 'Other' },
];

// ── Types ──────────────────────────────────────────────────────────────────
type OrgStatus = 'ACTIVE' | 'SUSPENDED' | 'TRIAL';
type MemberRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'MEMBER' | 'VIEWER';
type MemberStatus = 'ACTIVE' | 'INVITED' | 'SUSPENDED';
type TeamType = 'DEPARTMENT' | 'FUNCTION' | 'SQUAD';
type CampaignStatus = 'DRAFT' | 'SCHEDULED' | 'RUNNING' | 'PAUSED' | 'COMPLETED';
type DomainStatus = 'ACTIVE' | 'PENDING_DNS' | 'FAILED';
type EmailDomainStatus = 'VERIFIED' | 'PENDING_DNS' | 'FAILED';

// ── Mock Data ──────────────────────────────────────────────────────────────
// (mock data removed — all data sourced from the API)

type OrgGroup = { id: string; name: string; owner: string; members: number; projects: number; pipelines: number };
type OrgTeamFull = { id: string; name: string; type: TeamType; head: string; members: number; description: string; groups: OrgGroup[]; _deptId?: string };



// ── UI Components ──────────────────────────────────────────────────────────
function StatusChip({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    ACTIVE: [T.green, 'Active'], VERIFIED: [T.green, 'Verified'], RUNNING: [T.blue, 'Running'],
    COMPLETED: [T.sub, 'Completed'], PENDING_DNS: [T.yellow, 'Pending DNS'], SCHEDULED: [T.blue, 'Scheduled'],
    INVITED: [T.yellow, 'Invited'], DRAFT: [T.sub, 'Draft'], PAUSED: [T.yellow, 'Paused'],
    SUSPENDED: [T.red, 'Suspended'], TRIAL: [T.yellow, 'Trial'], FAILED: [T.red, 'Failed'],
    CONNECTED: [T.green, 'Connected'], PENDING: [T.yellow, 'Pending'], DISCONNECTED: [T.sub, 'Disconnected'],
    SENT: [T.green, 'Sent'], QUEUED: [T.blue, 'Queued'], DUE: [T.yellow, 'Due'], PAID: [T.green, 'Paid'],
  };
  const [color, label] = map[status] ?? [T.sub, status];
  return <Chip label={label} size="small" sx={{ bgcolor: `${color}22`, color, fontWeight: 700, fontSize: '.75rem', border: `1px solid ${color}44` }} />;
}

function SectionCard({ title, icon, children, action }: { title: string; icon: React.ReactNode; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <Card sx={{ bgcolor: T.card, border: `1px solid ${T.border}`, mb: 3, borderRadius: 2 }}>
      <CardHeader avatar={<Box sx={{ color: T.brand }}>{icon}</Box>} title={<Typography sx={{ color: T.text, fontWeight: 700, fontSize: '1.1rem', fontFamily: T.font }}>{title}</Typography>} action={action} />
      <CardContent sx={{ pt: 0 }}>{children}</CardContent>
    </Card>
  );
}

function MetricCard({ label, value, color, sub }: { label: string; value: string | number; color?: string; sub?: string }) {
  return (
    <Card sx={{ bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 2 }}>
      <CardContent sx={{ textAlign: 'center', p: 2, '&:last-child': { pb: 2 } }}>
        <Typography sx={{ fontSize: '2.2rem', fontWeight: 800, color: color ?? T.brand, fontFamily: T.font }}>{value}</Typography>
        <Typography variant="caption" sx={{ color: T.sub, textTransform: 'uppercase', fontFamily: T.font, letterSpacing: '.05em', fontSize: '.75rem' }}>{label}</Typography>
        {sub && <Typography variant="caption" sx={{ display: 'block', color: T.sub, fontSize: '.7rem', mt: 0.25 }}>{sub}</Typography>}
      </CardContent>
    </Card>
  );
}

// ── Section: Overview ──────────────────────────────────────────────────────
function OverviewSection({ org, navigate, orgSlug }: { org: OrgData | null; navigate: ReturnType<typeof useNavigate>; orgSlug: string }) {
  if (!org) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;

  const metrics = [
    { label: 'Total Members', value: org.member_count ?? 45, color: T.brand, icon: <PeopleIcon />, trend: '+3 this month', path: 'organization' },
    { label: 'Active Teams', value: 5, color: T.blue, icon: <GroupsIcon />, trend: '1 created recently', path: 'organization' },
    { label: 'Live Campaigns', value: 3, color: T.green, icon: <CampaignIcon />, trend: '2 scheduled', path: 'marketing' },
    { label: 'Emails (30d)', value: '94K', color: T.purple, icon: <MailOutlineIcon />, trend: '34.2% open rate', path: 'email' },
    { label: 'Active Domains', value: 4, color: T.yellow, icon: <DomainIcon />, trend: '1 pending DNS', path: 'domains' },
    { label: 'Audit Events', value: '2.1K', color: T.sub, icon: <AssignmentIcon />, trend: 'Last 30 days', path: 'compliance' },
  ];

  const modules = [
    { label: 'Organization', desc: 'Members, teams, groups & people', path: 'organization', color: T.brand, icon: <AccountTreeIcon /> },
    { label: 'Marketing', desc: 'Campaigns, audiences & workspaces', path: 'marketing', color: T.green, icon: <CampaignIcon /> },
    { label: 'Email Service', desc: 'Domains, senders & templates', path: 'email', color: T.purple, icon: <MailOutlineIcon /> },
    { label: 'Domains', desc: 'Manage all organization domains', path: 'domains', color: T.yellow, icon: <DomainIcon /> },
    { label: 'Branding', desc: 'Colors, logo & brand assets', path: 'branding', color: '#ec4899', icon: <PaletteIcon /> },
    { label: 'Billing', desc: 'Plan, invoices & usage limits', path: '/billing', color: '#f97316', icon: <ReceiptLongIcon /> },
    { label: 'Compliance', desc: 'Audit logs & access policies', path: 'compliance', color: T.sub, icon: <GppGoodIcon /> },
  ];

  const recentActivity = [
    { actor: 'Alice Nakamura', action: 'created campaign', target: 'Q1 Product Launch', time: '2h ago', color: T.green },
    { actor: 'Bob Reeves', action: 'invited member', target: 'new.user@orcacloud.com', time: '5h ago', color: T.blue },
    { actor: 'Clara Singh', action: 'verified domain', target: 'mail.orcacloud.com', time: '1d ago', color: T.brand },
    { actor: 'Alice Nakamura', action: 'updated billing', target: 'Enterprise Plan', time: '2d ago', color: T.yellow },
  ];

  return (
    <Box>
      {/* ── Hero Banner ── */}
      <Box sx={{
        mb: 3, p: 3, borderRadius: 2,
        background: `linear-gradient(135deg, ${T.brand}18 0%, ${T.blue}10 50%, ${T.purple}10 100%)`,
        border: `1px solid ${T.brand}30`,
        display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap',
      }}>
        <Avatar sx={{ width: 72, height: 72, bgcolor: T.brand, fontSize: '1.8rem', fontWeight: 800, border: `3px solid ${T.brand}55`, boxShadow: `0 0 0 4px ${T.brand}22` }}>
          {org.name?.slice(0, 2).toUpperCase()}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: 0.75 }}>
            <Typography sx={{ color: T.text, fontWeight: 800, fontSize: '1.7rem', fontFamily: T.font, lineHeight: 1 }}>{org.name}</Typography>
            <StatusChip status={org.status} />
            <Chip label={org.plan} size="small" sx={{ bgcolor: `${T.brand}22`, color: T.brand, fontWeight: 800, fontSize: '.8rem' }} />
          </Box>
          <Typography variant="body2" sx={{ color: T.sub, mb: 0.5 }}>
            {org.primary_domain} &nbsp;·&nbsp; {org.industry} &nbsp;·&nbsp; {org.country}
          </Typography>
          <Typography variant="caption" sx={{ color: T.sub }}>Organization since {org.created_at?.slice(0, 10)}</Typography>
        </Box>
        <Button variant="outlined" size="small" endIcon={<ArrowForwardIcon />} onClick={() => navigate(`/enterprise/${orgSlug}/organization`)}
          sx={{ borderColor: T.brand, color: T.brand, fontWeight: 700, '&:hover': { bgcolor: `${T.brand}11` } }}>
          Manage Org
        </Button>
      </Box>

      {/* ── KPI Metrics ── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {metrics.map(m => (
          <Grid key={m.label} item xs={6} sm={4} md={2}>
            <Card onClick={() => navigate(`/enterprise/${orgSlug}/${m.path}`)} sx={{
              bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 2, cursor: 'pointer',
              transition: 'all 0.2s', '&:hover': { borderColor: m.color, boxShadow: `0 0 12px ${m.color}22`, transform: 'translateY(-1px)' },
            }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                  <Box sx={{ bgcolor: `${m.color}15`, borderRadius: 1.5, p: 0.75, color: m.color, display: 'flex', fontSize: '1.2rem' }}>{m.icon}</Box>
                </Box>
                <Typography sx={{ color: m.color, fontWeight: 800, fontSize: '1.9rem', lineHeight: 1, fontFamily: T.font }}>{m.value}</Typography>
                <Typography variant="caption" sx={{ color: T.text, fontWeight: 700, display: 'block', mt: 0.5, fontSize: '.8rem' }}>{m.label}</Typography>
                <Typography variant="caption" sx={{ color: T.sub, display: 'block', fontSize: '.72rem', mt: 0.25 }}>{m.trend}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* ── Module Grid + Activity ── */}
      <Grid container spacing={3}>
        {/* Module Cards */}
        <Grid item xs={12} md={8}>
          <Typography sx={{ color: T.text, fontWeight: 700, fontSize: '1rem', mb: 2, fontFamily: T.font }}>Enterprise Modules</Typography>
          <Grid container spacing={2}>
            {modules.map(mod => (
              <Grid key={mod.label} item xs={12} sm={6}>
                <Paper onClick={() => navigate(mod.path.startsWith('/') ? mod.path : `/enterprise/${orgSlug}/${mod.path}`)} sx={{
                  p: 2, bgcolor: T.card2, border: `1px solid ${T.border}`, borderRadius: 2, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 2,
                  transition: 'all 0.2s', '&:hover': { borderColor: mod.color, bgcolor: `${mod.color}08`, boxShadow: `0 2px 12px ${mod.color}18` },
                }}>
                  <Box sx={{ bgcolor: `${mod.color}18`, borderRadius: 1.5, p: 1, color: mod.color, display: 'flex', flexShrink: 0 }}>{mod.icon}</Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ color: T.text, fontWeight: 700, fontSize: '.95rem', fontFamily: T.font }}>{mod.label}</Typography>
                    <Typography variant="caption" sx={{ color: T.sub, fontSize: '.78rem', lineHeight: 1.3 }}>{mod.desc}</Typography>
                  </Box>
                  <ArrowForwardIcon sx={{ color: T.sub, fontSize: '1rem', flexShrink: 0, opacity: 0.6 }} />
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12} md={4}>
          <Typography sx={{ color: T.text, fontWeight: 700, fontSize: '1rem', mb: 2, fontFamily: T.font }}>Recent Activity</Typography>
          <Card sx={{ bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 2 }}>
            <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
              {recentActivity.map((evt, i) => (
                <Box key={i} sx={{ px: 2, py: 1.75, borderBottom: i < recentActivity.length - 1 ? `1px solid ${T.border}` : 'none', display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                  <Avatar sx={{ width: 30, height: 30, bgcolor: `${evt.color}22`, color: evt.color, fontSize: '.7rem', fontWeight: 700, flexShrink: 0, mt: 0.25 }}>
                    {evt.actor.split(' ').map(w => w[0]).join('')}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="caption" sx={{ color: T.text, fontWeight: 600, display: 'block', lineHeight: 1.4 }}>
                      <Box component="span" sx={{ color: evt.color }}>{evt.actor}</Box>{' '}{evt.action}
                    </Typography>
                    <Typography variant="caption" sx={{ color: T.sub, fontSize: '.75rem', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{evt.target}</Typography>
                  </Box>
                  <Typography variant="caption" sx={{ color: T.sub, fontSize: '.72rem', flexShrink: 0, mt: 0.25 }}>{evt.time}</Typography>
                </Box>
              ))}
              <Box sx={{ p: 1.5, textAlign: 'center', borderTop: `1px solid ${T.border}` }}>
                <Button size="small" onClick={() => navigate(`/enterprise/${orgSlug}/compliance`)} sx={{ color: T.brand, fontSize: '.8rem', fontWeight: 600 }} endIcon={<ArrowForwardIcon sx={{ fontSize: '.9rem' }} />}>View Full Audit Log</Button>
              </Box>
            </CardContent>
          </Card>

          {/* Health Card */}
          <Card sx={{ bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 2, mt: 2 }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Typography sx={{ color: T.text, fontWeight: 700, fontSize: '.95rem', mb: 1.5 }}>Organization Health</Typography>
              {[
                { label: 'Email Deliverability', value: 98, color: T.green },
                { label: 'Domain Verification', value: 75, color: T.yellow },
                { label: 'Compliance Score', value: 94, color: T.blue },
              ].map(h => (
                <Box key={h.label} sx={{ mb: 1.5, '&:last-child': { mb: 0 } }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" sx={{ color: T.sub }}>{h.label}</Typography>
                    <Typography variant="caption" sx={{ color: h.color, fontWeight: 700 }}>{h.value}%</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={h.value} sx={{ height: 5, borderRadius: 3, bgcolor: `${h.color}20`, '& .MuiLinearProgress-bar': { bgcolor: h.color, borderRadius: 3 } }} />
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

// ── Section: Organization — Full Sub-Dashboard ────────────────────────────
type OrgView = 'overview' | 'departments' | 'teams' | 'groups' | 'people' | 'permissions' | 'settings';

function OrganizationSection({ orgId, org }: { orgId: string; org: OrgData | null }) {
  const navigate = useNavigate();
  const { orgSlug = '', '*': orgSubView = '' } = useParams<{ orgSlug: string; '*'?: string }>();

  // ── Parse sub-view ──────────────────────────────────────────────────────
  // Pattern: 'departments/:deptId[/:deptSubView]' vs 'overview' / 'teams' / etc.
  const _parts        = (orgSubView ?? '').split('/');
  const _firstSegment = _parts[0] as OrgView || 'overview';
  const isInsideDept  = _firstSegment === 'departments' && _parts.length >= 2 && !!_parts[1];
  const selectedDeptId  = isInsideDept ? _parts[1] : null;
  const deptSubView     = isInsideDept ? (_parts.slice(2).join('/') || 'overview') : null;
  const view: OrgView   = isInsideDept ? 'departments' : _firstSegment;

  const setView = useCallback((v: OrgView) => {
    navigate(`/enterprise/${orgSlug}/organization/${v}`);
  }, [navigate, orgSlug]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [teams, setTeams]                   = useState<OrgTeamFull[]>([]);
  const [depts, setDepts]                   = useState<ApiDepartment[]>([]);
  const [deptsLoading, setDeptsLoading]     = useState(false);
  const [people, setPeople]                = useState<OrgMember[]>([]);
  const [createTeamOpen, setCreateTeamOpen] = useState(false);
  const [createGroupTeamId, setCreateGroupTeamId] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen]         = useState(false);
  const [teamName, setTeamName]             = useState('');
  const [teamType, setTeamType]             = useState<TeamType>('DEPARTMENT');
  const [teamDesc, setTeamDesc]             = useState('');
  const [teamDeptId, setTeamDeptId]         = useState('');
  const [groupName, setGroupName]           = useState('');
  const [groupOwner, setGroupOwner]         = useState('');
  const [inviteEmail, setInviteEmail]       = useState('');
  const [inviteRole, setInviteRole]         = useState<MemberRole>('MEMBER');
  const [inviteTeam, setInviteTeam]         = useState('');
  const [snack, setSnack]                   = useState('');
  const [peopleSearch, setPeopleSearch]     = useState('');
  const [deleteOpen, setDeleteOpen]         = useState(false);
  const [deleteConfirm, setDeleteConfirm]   = useState('');
  const [deleting, setDeleting]             = useState(false);

  // ── Org edit state ──────────────────────────────────────────────────────
  const [editOrgName, setEditOrgName]       = useState('');
  const [editOrgDomain, setEditOrgDomain]   = useState('');
  const [editOrgIndustry, setEditOrgIndustry] = useState('');
  const [editOrgCountry, setEditOrgCountry] = useState('');
  const [editOrgEmail, setEditOrgEmail]     = useState('');
  const [savingOrg, setSavingOrg]           = useState(false);

  // ── Create dept state ───────────────────────────────────────────────────
  const [createDeptOpen, setCreateDeptOpen] = useState(false);
  const [deptName, setDeptName]             = useState('');
  const [deptCategory, setDeptCategory]     = useState<{ group: string; label: string } | null>(null);
  const [deptDescription, setDeptDescription] = useState('');
  const [deptLead, setDeptLead]             = useState('');
  const [deptParentId, setDeptParentId]     = useState('');
  const [creatingDept, setCreatingDept]     = useState(false);

  const handleDeleteOrg = async () => {
    if (!orgId || deleteConfirm !== org?.name) return;
    setDeleting(true);
    try {
      await organizationApi.delete(orgId);
      navigate('/enterprise', { replace: true });
    } catch {
      setSnack('Failed to delete organization. Please try again.');
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  // Sync edit fields when org loads
  useEffect(() => {
    if (!org) return;
    setEditOrgName(org.name ?? '');
    setEditOrgDomain(org.primary_domain ?? '');
    setEditOrgIndustry(org.industry ?? '');
    setEditOrgCountry(org.country ?? '');
    setEditOrgEmail(org.contact_email ?? '');
  }, [org]);

  const handleSaveOrg = async () => {
    if (!orgId) return;
    setSavingOrg(true);
    try {
      await organizationApi.update(orgId, {
        name:           editOrgName.trim(),
        primary_domain: editOrgDomain.trim() || undefined,
        industry:       editOrgIndustry || undefined,
        country:        editOrgCountry.trim() || undefined,
        contact_email:  editOrgEmail.trim() || undefined,
      });
      setSnack('Organization settings saved.');
    } catch {
      setSnack('Failed to save settings.');
    } finally {
      setSavingOrg(false);
    }
  };

  const handleCreateDept = async () => {
    if (!orgId || !deptName.trim()) return;
    setCreatingDept(true);
    try {
      const created = await departmentsApi.create(orgId, {
        name:            deptName.trim(),
        category:        deptCategory?.label ?? '',
        description:     deptDescription.trim(),
        department_lead: deptLead.trim(),
        parent:          deptParentId || undefined,
      });
      setDepts(prev => [...prev, created]);
      setSnack(`Department "${created.name}" created.`);
      setCreateDeptOpen(false);
      setDeptName(''); setDeptCategory(null); setDeptDescription('');
      setDeptLead(''); setDeptParentId('');
    } catch (e: any) {
      setSnack(e?.response?.data?.error ?? 'Failed to create department.');
    } finally {
      setCreatingDept(false);
    }
  };

  // ── Build OrgTeamFull from API departments ──────────────────────────────
  /** Map API Department[] → OrgTeamFull[] for the existing Team/Group UI */
  const buildTeamsFromDepts = useCallback((apiDepts: ApiDepartment[]): OrgTeamFull[] => {
    const result: OrgTeamFull[] = [];
    for (const dept of apiDepts) {
      for (const team of dept.teams) {
        result.push({
          id:          team.id,
          name:        team.name,
          type:        (team.team_type as TeamType) ?? 'SQUAD',
          head:        '—',
          members:     0,
          description: team.description,
          groups:      team.groups.map(g => ({
            id:        g.id,
            name:      g.name,
            owner:     '—',
            members:   0,
            projects:  0,
            pipelines: 0,
          })),
          _deptId: dept.id,   // track parent dept for create/delete
        } as OrgTeamFull & { _deptId: string });
      }
    }
    return result;
  }, []);

  // ── Load departments on orgId change ────────────────────────────────────
  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    setDeptsLoading(true);
    departmentsApi.list(orgId)
      .then(data => {
        if (cancelled) return;
        setDepts(data);
        setTeams(buildTeamsFromDepts(data));
        setDeptsLoading(false);
        // Default dept for new teams
        if (data.length > 0) setTeamDeptId(data[0].id);
      })
      .catch(() => {
        if (!cancelled) {
          // Fall back to empty state gracefully
          setDepts([]);
          setTeams([]);
          setDeptsLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [orgId, buildTeamsFromDepts]);

  // ── Load members ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    membersApi.list(orgId)
      .then(data => { if (!cancelled) setPeople(Array.isArray(data) ? data : (data as any).results ?? []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [orgId]);

  const selectedTeam = teams.find(t => t.id === selectedTeamId) ?? null;
  const roleColors: Record<MemberRole, string> = { OWNER: T.brand, ADMIN: T.blue, MANAGER: T.purple, MEMBER: T.green, VIEWER: T.sub };
  const typeColor: Record<TeamType, string>    = { DEPARTMENT: T.brand, FUNCTION: T.blue, SQUAD: T.purple };
  const totalGroups   = teams.reduce((s, t) => s + t.groups.length, 0);
  const totalMembers  = teams.reduce((s, t) => s + t.members, 0);
  const totalProjects = teams.reduce((s, t) => s + t.groups.reduce((gs, g) => gs + g.projects, 0), 0);

  const orgSubNav: { key: OrgView; label: string; icon: React.ReactNode }[] = [
    { key: 'overview',     label: 'Overview',     icon: <BusinessIcon />    },
    { key: 'departments',  label: 'Departments',  icon: <AccountTreeIcon /> },
    { key: 'teams',        label: 'Teams',        icon: <GroupsIcon />      },
    { key: 'groups',       label: 'Groups',       icon: <FolderOpenIcon />  },
    { key: 'people',       label: 'People',       icon: <PeopleIcon />      },
    { key: 'permissions',  label: 'Permissions',  icon: <GppGoodIcon />     },
    { key: 'settings',     label: 'Settings',     icon: <SettingsIcon />    },
  ];

  const handleCreateTeam = async () => {
    if (!teamName || !orgId) return;
    // Use first dept or selected dept
    const deptId = teamDeptId || (depts[0]?.id ?? '');
    if (!deptId) {
      setSnack('No department found — create a department first.');
      return;
    }
    try {
      const created = await orgTeamsApi.create(orgId, deptId, {
        name: teamName,
        description: teamDesc,
        team_type: teamType,
      });
      const newTeam: OrgTeamFull = {
        id: created.id, name: created.name, type: teamType,
        head: '—', members: 0, description: teamDesc, groups: [],
      };
      setTeams(prev => [...prev, newTeam]);
      setSnack(`Team "${teamName}" created`);
      setCreateTeamOpen(false); setTeamName(''); setTeamDesc('');
    } catch {
      setSnack('Failed to create team.');
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName || !createGroupTeamId || !orgId) return;
    const parentTeam = teams.find(t => t.id === createGroupTeamId) as (OrgTeamFull & { _deptId?: string }) | undefined;
    const deptId = parentTeam?._deptId ?? depts[0]?.id ?? '';
    if (!deptId) {
      setSnack('Cannot determine parent department.');
      return;
    }
    try {
      const created = await orgGroupsApi.create(orgId, deptId, createGroupTeamId, {
        name: groupName,
        description: groupOwner ? `Owner: ${groupOwner}` : '',
      });
      const g: OrgGroup = { id: created.id, name: created.name, owner: groupOwner || '—', members: 0, projects: 0, pipelines: 0 };
      setTeams(prev => prev.map(t => t.id === createGroupTeamId ? { ...t, groups: [...t.groups, g] } : t));
      setSnack(`Group "${groupName}" created`);
      setCreateGroupTeamId(null); setGroupName(''); setGroupOwner('');
    } catch {
      setSnack('Failed to create group.');
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail || !orgId) return;
    try {
      await membersApi.invite(orgId, { email: inviteEmail, role: inviteRole });
      setSnack(`Invitation sent to ${inviteEmail}`);
    } catch {
      setSnack(`Failed to invite ${inviteEmail}`);
    }
    setInviteOpen(false); setInviteEmail('');
  };

  // ── Sub-views ──
  const orgInitials = (org?.name ?? 'O').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const statusColor2: Record<string, string> = { ACTIVE: T.green, TRIAL: T.yellow, SUSPENDED: T.red };
  const leaders = people.filter(m => m.role === 'OWNER' || m.role === 'ADMIN');

  const OrgOverview = (
    <Box>
      {/* ── Hero Profile Card ─────────────────────────────────────────── */}
      <Card sx={{ bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 2.5, mb: 3, overflow: 'hidden' }}>
        {/* Top gradient bar */}
        <Box sx={{ height: 6, background: `linear-gradient(90deg, ${T.brand}, ${T.blue}, ${T.purple})` }} />
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2.5, flexWrap: 'wrap' }}>
            {/* Logo / Avatar */}
            {org?.logo_url ? (
              <Box component="img" src={org.logo_url} alt={org.name}
                sx={{ width: 72, height: 72, borderRadius: 2, objectFit: 'contain', border: `1px solid ${T.border}`, bgcolor: T.card2, flexShrink: 0 }} />
            ) : (
              <Avatar sx={{ width: 72, height: 72, borderRadius: 2, bgcolor: `${T.brand}22`, color: T.brand, fontWeight: 800, fontSize: '1.8rem', flexShrink: 0, border: `2px solid ${T.brand}33` }}>
                {orgInitials}
              </Avatar>
            )}

            {/* Name + details */}
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: 0.75 }}>
                <Typography variant="h5" sx={{ color: T.text, fontWeight: 800, lineHeight: 1 }}>
                  {org?.name ?? '—'}
                </Typography>
                {org?.status && (
                  <Chip label={org.status} size="small"
                    sx={{ bgcolor: `${statusColor2[org.status] ?? T.sub}22`, color: statusColor2[org.status] ?? T.sub, fontWeight: 700, fontSize: '.72rem', height: 22, borderRadius: 1 }} />
                )}
                {org?.plan && (
                  <Chip label={org.plan} size="small" variant="outlined"
                    sx={{ borderColor: T.brand, color: T.brand, fontWeight: 700, fontSize: '.72rem', height: 22, borderRadius: 1 }} />
                )}
              </Box>

              {/* Website */}
              {org?.primary_domain && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
                  <Box component="span" sx={{ fontSize: '.8rem', color: T.sub }}>🌐</Box>
                  <Typography component="a" href={org.primary_domain.startsWith('http') ? org.primary_domain : `https://${org.primary_domain}`}
                    target="_blank" rel="noopener noreferrer"
                    sx={{ color: T.brand, fontSize: '.9rem', fontWeight: 500, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                    {org.primary_domain.replace(/^https?:\/\//, '')}
                  </Typography>
                </Box>
              )}

              {/* Email */}
              {org?.contact_email && (
                <Typography variant="body2" sx={{ color: T.sub, fontSize: '.85rem', mb: 0.75 }}>
                  ✉️ {org.contact_email}
                </Typography>
              )}

              {/* Tags row */}
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                {org?.industry && (
                  <Chip label={org.industry} size="small" sx={{ bgcolor: `${T.purple}18`, color: T.purple, fontWeight: 600, fontSize: '.72rem' }} />
                )}
                {org?.country && (
                  <Chip label={org.country} size="small" sx={{ bgcolor: `${T.blue}18`, color: T.blue, fontWeight: 600, fontSize: '.72rem' }} />
                )}
                {org?.created_at && (
                  <Typography variant="caption" sx={{ color: T.sub, alignSelf: 'center' }}>
                    Since {new Date(org.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                  </Typography>
                )}
              </Box>
            </Box>

            {/* Action */}
            <Button variant="outlined" size="small" startIcon={<SettingsIcon sx={{ fontSize: '.9rem' }} />}
              sx={{ borderColor: T.border, color: T.sub, borderRadius: 2, flexShrink: 0, '&:hover': { borderColor: T.brand, color: T.brand } }}
              onClick={() => setView('settings')}>
              Settings
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* ── Stats row ─────────────────────────────────────────────────── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Members',  value: org?.member_count ?? totalMembers, color: T.brand,  icon: <PeopleIcon /> },
          { label: 'Teams',    value: teams.length,                       color: T.blue,   icon: <GroupsIcon /> },
          { label: 'Groups',   value: totalGroups,                        color: T.purple, icon: <FolderOpenIcon /> },
          { label: 'Projects', value: totalProjects,                      color: T.green,  icon: <AccountTreeIcon /> },
        ].map(m => (
          <Grid key={m.label} item xs={6} md={3}>
            <Card sx={{ bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 2 }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ bgcolor: `${m.color}15`, borderRadius: 1.5, p: 0.75, color: m.color, display: 'inline-flex', mb: 1.5 }}>{m.icon}</Box>
                <Typography sx={{ color: m.color, fontWeight: 800, fontSize: '2rem', lineHeight: 1, fontFamily: T.font }}>{m.value}</Typography>
                <Typography variant="caption" sx={{ color: T.sub, display: 'block', mt: 0.5 }}>{m.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* ── Leadership ────────────────────────────────────────────────── */}
      <SectionCard title="Leadership" icon={<BadgeIcon />}
        action={<Button size="small" sx={{ color: T.brand, fontSize: '.78rem' }} onClick={() => setView('people')}>View All People</Button>}>
        {leaders.length === 0 ? (
          <Typography variant="body2" sx={{ color: T.sub, py: 1 }}>No admins or owners found.</Typography>
        ) : (
          <Grid container spacing={2}>
            {leaders.map(m => {
              const isOwner = m.role === 'OWNER';
              const color   = isOwner ? T.brand : T.blue;
              const initials = (m.name ?? m.email ?? '?').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
              return (
                <Grid key={m.id} item xs={12} sm={6} md={4}>
                  <Paper sx={{ p: 2.5, bgcolor: T.card2, border: `1px solid ${T.border}`, borderRadius: 2,
                    borderLeft: `4px solid ${color}`, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ width: 48, height: 48, bgcolor: `${color}22`, color, fontWeight: 800,
                      fontSize: '1rem', border: `2px solid ${color}44`, flexShrink: 0 }}>
                      {initials}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
                        <Typography sx={{ color: T.text, fontWeight: 700, fontSize: '.95rem',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {m.name || m.email}
                        </Typography>
                        <Chip label={m.role} size="small"
                          sx={{ bgcolor: `${color}22`, color, fontWeight: 800, fontSize: '.68rem',
                            height: 18, borderRadius: 1, flexShrink: 0,
                            border: `1px solid ${color}44` }} />
                      </Box>
                      {m.name && m.email && (
                        <Typography variant="caption" sx={{ color: T.sub, fontSize: '.78rem',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                          {m.email}
                        </Typography>
                      )}
                    </Box>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        )}
      </SectionCard>

      {/* ── Teams at a Glance ─────────────────────────────────────────── */}
      {teams.length > 0 && (
        <SectionCard title="Teams at a Glance" icon={<GroupsIcon />} action={<Button startIcon={<ArrowForwardIcon />} size="small" sx={{ color: T.brand }} onClick={() => setView('teams')}>View All</Button>}>
          <Grid container spacing={2}>
            {teams.map(team => (
              <Grid key={team.id} item xs={12} sm={6} md={4}>
                <Paper onClick={() => { setView('teams'); setSelectedTeamId(team.id); }}
                  sx={{ p: 2, bgcolor: T.card2, border: `1px solid ${T.border}`, borderRadius: 2, cursor: 'pointer',
                    '&:hover': { borderColor: T.brand, bgcolor: `${T.brand}08` }, transition: 'all .2s' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography sx={{ color: T.text, fontWeight: 700 }}>{team.name}</Typography>
                    <Chip label={team.type} size="small" sx={{ bgcolor: `${typeColor[team.type]}22`, color: typeColor[team.type], fontWeight: 700, fontSize: '.7rem' }} />
                  </Box>
                  <Typography variant="caption" sx={{ color: T.sub, display: 'block', mb: 1 }}>Head: {team.head}</Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Chip label={`${team.members} members`} size="small" sx={{ bgcolor: `${T.blue}11`, color: T.blue, fontSize: '.72rem' }} />
                    <Chip label={`${team.groups.length} groups`} size="small" sx={{ bgcolor: `${T.purple}11`, color: T.purple, fontSize: '.72rem' }} />
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </SectionCard>
      )}
    </Box>
  );

  // ── Departments View ──────────────────────────────────────────────────────
  const OrgDepartments = (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h6" sx={{ color: T.text, fontWeight: 700 }}>
            Departments
          </Typography>
          <Typography variant="body2" sx={{ color: T.sub, mt: 0.5 }}>
            {depts.length} department{depts.length !== 1 ? 's' : ''} in this organization
          </Typography>
        </Box>
        <Button variant="contained" size="small"
          sx={{ bgcolor: T.brand, '&:hover': { bgcolor: T.brand, opacity: .85 }, gap: 1, borderRadius: 2 }}
          onClick={() => setCreateDeptOpen(true)}
          startIcon={<AddIcon />}>
          New Department
        </Button>
      </Box>

      {deptsLoading ? (
        <Box sx={{ textAlign: 'center', py: 8 }}><CircularProgress sx={{ color: T.brand }} /></Box>
      ) : depts.length === 0 ? (
        /* Empty state */
        <Box sx={{ textAlign: 'center', py: 10, color: T.sub }}>
          <AccountTreeIcon sx={{ fontSize: '3rem', mb: 1.5, opacity: .35 }} />
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>No departments yet</Typography>
          <Typography variant="body2" sx={{ mb: 3 }}>
            Create your first department to organize teams and people.
          </Typography>
          <Button variant="outlined" onClick={() => setCreateDeptOpen(true)}
            sx={{ borderColor: T.brand, color: T.brand }} startIcon={<AddIcon />}>
            Create Department
          </Button>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {depts.map(dept => {
            const subCount = depts.filter(d => d.parent === dept.id).length;
            return (
              <Grid key={dept.id} item xs={12} sm={6} lg={4}>
                <Card onClick={() => navigate(`/enterprise/${orgSlug}/organization/departments/${dept.id}/overview`)}
                  sx={{ bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 2, height: '100%',
                  cursor: 'pointer',
                  transition: 'border-color .2s, box-shadow .2s', '&:hover': { borderColor: T.brand, boxShadow: `0 0 12px ${T.brand}20` } }}>
                  <CardContent sx={{ p: 2.5 }}>
                    {/* Name + category */}
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AccountTreeIcon sx={{ color: T.brand, fontSize: '1.1rem', flexShrink: 0, mt: '2px' }} />
                        <Typography sx={{ fontWeight: 700, color: T.text, lineHeight: 1.3 }}>
                          {dept.name}
                        </Typography>
                      </Box>
                      {dept.category && (
                        <Chip label={dept.category} size="small"
                          sx={{ bgcolor: `${T.brand}18`, color: T.brand, fontWeight: 600, fontSize: '.68rem',
                            height: 20, flexShrink: 0 }} />
                      )}
                    </Box>

                    {/* Description */}
                    {dept.description && (
                      <Typography variant="body2" sx={{ color: T.sub, mb: 1.5, fontSize: '.82rem',
                        display: '-webkit-box', overflow: 'hidden', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2 }}>
                        {dept.description}
                      </Typography>
                    )}

                    <Divider sx={{ borderColor: T.border, my: 1.5 }} />

                    {/* Meta row */}
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                      {dept.department_lead && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: .5 }}>
                          <Avatar sx={{ width: 18, height: 18, fontSize: '.62rem', bgcolor: T.brand }}>
                            {dept.department_lead[0]?.toUpperCase()}
                          </Avatar>
                          <Typography variant="caption" sx={{ color: T.sub }}>{dept.department_lead}</Typography>
                        </Box>
                      )}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: .5 }}>
                        <GroupsIcon sx={{ fontSize: '.9rem', color: T.sub }} />
                        <Typography variant="caption" sx={{ color: T.sub }}>
                          {dept.teams?.length ?? 0} team{(dept.teams?.length ?? 0) !== 1 ? 's' : ''}
                        </Typography>
                      </Box>
                      {subCount > 0 && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: .5 }}>
                          <AccountTreeIcon sx={{ fontSize: '.9rem', color: T.sub }} />
                          <Typography variant="caption" sx={{ color: T.sub }}>
                            {subCount} sub-dept{subCount !== 1 ? 's' : ''}
                          </Typography>
                        </Box>
                      )}
                      {dept.parent && (
                        <Chip label={`↳ ${depts.find(d => d.id === dept.parent)?.name ?? 'Sub-dept'}`}
                          size="small" variant="outlined"
                          sx={{ height: 18, fontSize: '.65rem', borderColor: T.border, color: T.sub }} />
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );

  const OrgTeams = (
    <Box>
      {selectedTeam ? (
        /* ── Team Detail ── */
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
            <Button size="small" sx={{ color: T.sub, minWidth: 0 }} onClick={() => setSelectedTeamId(null)}>&larr; Teams</Button>
            <ChevronRightIcon sx={{ color: T.sub, fontSize: '1rem' }} />
            <Typography sx={{ color: T.text, fontWeight: 700 }}>{selectedTeam.name}</Typography>
          </Box>

          {/* Team hero */}
          <Box sx={{ p: 3, mb: 3, borderRadius: 2, bgcolor: `${typeColor[selectedTeam.type]}10`, border: `1px solid ${typeColor[selectedTeam.type]}30`, display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            <Avatar sx={{ width: 60, height: 60, bgcolor: `${typeColor[selectedTeam.type]}22`, color: typeColor[selectedTeam.type], fontWeight: 800, fontSize: '1.4rem' }}>{selectedTeam.name.slice(0, 2).toUpperCase()}</Avatar>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                <Typography sx={{ color: T.text, fontWeight: 800, fontSize: '1.4rem' }}>{selectedTeam.name}</Typography>
                <Chip label={selectedTeam.type} size="small" sx={{ bgcolor: `${typeColor[selectedTeam.type]}22`, color: typeColor[selectedTeam.type], fontWeight: 700 }} />
              </Box>
              <Typography variant="body2" sx={{ color: T.sub, mb: 1 }}>{selectedTeam.description}</Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Box><Typography variant="caption" sx={{ color: T.sub }}>Team Head</Typography><Typography variant="body2" sx={{ color: T.text, fontWeight: 700 }}>{selectedTeam.head}</Typography></Box>
                <Box><Typography variant="caption" sx={{ color: T.sub }}>Members</Typography><Typography variant="body2" sx={{ color: T.brand, fontWeight: 700 }}>{selectedTeam.members}</Typography></Box>
                <Box><Typography variant="caption" sx={{ color: T.sub }}>Groups</Typography><Typography variant="body2" sx={{ color: T.purple, fontWeight: 700 }}>{selectedTeam.groups.length}</Typography></Box>
              </Box>
            </Box>
          </Box>

          {/* Groups inside team */}
          <SectionCard title={`Groups in ${selectedTeam.name}`} icon={<FolderOpenIcon />}
            action={
              <Button startIcon={<AddIcon />} variant="contained" size="small" sx={{ bgcolor: T.brand }}
                onClick={() => setCreateGroupTeamId(selectedTeam.id)}>New Group</Button>
            }>
            <Grid container spacing={2}>
              {selectedTeam.groups.map(g => (
                <Grid key={g.id} item xs={12} sm={6} md={4}>
                  <Paper sx={{ p: 2.5, bgcolor: T.card2, border: `1px solid ${T.border}`, borderRadius: 2, transition: 'all .2s', '&:hover': { borderColor: T.purple, boxShadow: `0 0 10px ${T.purple}18` } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                      <Box sx={{ bgcolor: `${T.purple}18`, borderRadius: 1.5, p: 0.75, color: T.purple, display: 'inline-flex' }}><FolderOpenIcon sx={{ fontSize: '1.2rem' }} /></Box>
                      <Typography sx={{ color: T.text, fontWeight: 700 }}>{g.name}</Typography>
                    </Box>
                    <Typography variant="caption" sx={{ color: T.sub, display: 'block', mb: 1.5 }}>Owner: {g.owner}</Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip label={`${g.members} members`}  size="small" sx={{ bgcolor: `${T.blue}11`,   color: T.blue,   fontSize: '.72rem' }} />
                      <Chip label={`${g.projects} projects`} size="small" sx={{ bgcolor: `${T.green}11`,  color: T.green,  fontSize: '.72rem' }} />
                      <Chip label={`${g.pipelines} pipelines`} size="small" sx={{ bgcolor: `${T.brand}11`, color: T.brand, fontSize: '.72rem' }} />
                    </Box>
                  </Paper>
                </Grid>
              ))}
              {selectedTeam.groups.length === 0 && (
                <Grid item xs={12}>
                  <Box sx={{ textAlign: 'center', py: 4, color: T.sub }}>
                    <FolderOpenIcon sx={{ fontSize: '2.5rem', opacity: 0.3, mb: 1 }} />
                    <Typography variant="body2">No groups yet. Create the first one.</Typography>
                  </Box>
                </Grid>
              )}
            </Grid>
          </SectionCard>

          {/* Members in this team */}
          <SectionCard title="Team Members" icon={<PeopleIcon />}
            action={<Button startIcon={<PersonAddIcon />} variant="outlined" size="small" sx={{ borderColor: T.brand, color: T.brand }} onClick={() => setInviteOpen(true)}>Invite Member</Button>}>
            <TableContainer>
              <Table size="small">
                <TableHead><TableRow>{['Member', 'Email', 'Role', 'Status'].map(h => <TableCell key={h} sx={{ color: T.sub, borderColor: T.border, fontWeight: 700, fontSize: '.8rem' }}>{h}</TableCell>)}</TableRow></TableHead>
                <TableBody>
                  {people.filter(p => p.status === 'ACTIVE').map(p => (
                    <TableRow key={p.id} hover sx={{ '& td': { borderColor: T.border } }}>
                      <TableCell><Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}><Avatar sx={{ width: 30, height: 30, bgcolor: roleColors[p.role], fontSize: '.75rem' }}>{(p.name || p.email).split(' ').map((w: string) => w[0]).join('')}</Avatar><Typography variant="body2" sx={{ color: T.text, fontWeight: 600 }}>{p.name || p.email}</Typography></Box></TableCell>
                      <TableCell><Typography variant="body2" sx={{ color: T.sub }}>{p.email}</Typography></TableCell>
                      <TableCell><Chip label={p.role} size="small" sx={{ bgcolor: `${roleColors[p.role]}22`, color: roleColors[p.role], fontWeight: 700, fontSize: '.7rem' }} /></TableCell>
                      <TableCell><StatusChip status={p.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </SectionCard>
        </Box>
      ) : (
        /* ── Teams List ── */
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography sx={{ color: T.text, fontWeight: 700, fontSize: '1.1rem' }}>All Teams &amp; Departments</Typography>
            <Button startIcon={<AddIcon />} variant="contained" size="small" sx={{ bgcolor: T.brand }} onClick={() => setCreateTeamOpen(true)}>New Team</Button>
          </Box>
          <Grid container spacing={2}>
            {teams.map(team => (
              <Grid key={team.id} item xs={12} sm={6} md={4}>
                <Card onClick={() => setSelectedTeamId(team.id)} sx={{ bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 2, cursor: 'pointer', transition: 'all .2s', '&:hover': { borderColor: typeColor[team.type], boxShadow: `0 0 12px ${typeColor[team.type]}18`, transform: 'translateY(-1px)' } }}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                      <Box sx={{ bgcolor: `${typeColor[team.type]}18`, borderRadius: 1.5, p: 0.75, color: typeColor[team.type], display: 'inline-flex' }}><GroupsIcon /></Box>
                      <Chip label={team.type} size="small" sx={{ bgcolor: `${typeColor[team.type]}22`, color: typeColor[team.type], fontWeight: 700, fontSize: '.7rem' }} />
                    </Box>
                    <Typography sx={{ color: T.text, fontWeight: 800, mb: 0.5, fontFamily: T.font }}>{team.name}</Typography>
                    <Typography variant="caption" sx={{ color: T.sub, display: 'block', mb: 1.5, fontSize: '.8rem', lineHeight: 1.4 }}>{team.description}</Typography>
                    <Divider sx={{ borderColor: T.border, mb: 1.5 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ display: 'flex', gap: 1.5 }}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography sx={{ color: T.brand, fontWeight: 700, fontSize: '1.1rem', lineHeight: 1 }}>{team.members}</Typography>
                          <Typography variant="caption" sx={{ color: T.sub, fontSize: '.7rem' }}>Members</Typography>
                        </Box>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography sx={{ color: T.purple, fontWeight: 700, fontSize: '1.1rem', lineHeight: 1 }}>{team.groups.length}</Typography>
                          <Typography variant="caption" sx={{ color: T.sub, fontSize: '.7rem' }}>Groups</Typography>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="caption" sx={{ color: T.sub, fontSize: '.78rem' }}>Head: {team.head}</Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Box>
  );

  const OrgGroups = (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography sx={{ color: T.text, fontWeight: 700, fontSize: '1.1rem' }}>All Groups</Typography>
        <Typography variant="caption" sx={{ color: T.sub }}>{totalGroups} groups across {teams.length} teams</Typography>
      </Box>
      {teams.map(team => (
        <Box key={team.id} sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5, cursor: 'pointer' }} onClick={() => { setView('teams'); setSelectedTeamId(team.id); }}>
            <Box sx={{ bgcolor: `${typeColor[team.type]}18`, borderRadius: 1, p: 0.5, color: typeColor[team.type], display: 'inline-flex' }}><GroupsIcon sx={{ fontSize: '1rem' }} /></Box>
            <Typography sx={{ color: T.text, fontWeight: 700 }}>{team.name}</Typography>
            <Chip label={`${team.groups.length} groups`} size="small" sx={{ bgcolor: `${T.purple}11`, color: T.purple, fontSize: '.7rem' }} />
            <Button size="small" startIcon={<AddIcon />} sx={{ color: T.brand, ml: 'auto', fontSize: '.78rem' }} onClick={e => { e.stopPropagation(); setCreateGroupTeamId(team.id); }}>Add Group</Button>
          </Box>
          <Grid container spacing={2}>
            {team.groups.map(g => (
              <Grid key={g.id} item xs={12} sm={6} md={4}>
                <Paper sx={{ p: 2, bgcolor: T.card2, border: `1px solid ${T.border}`, borderRadius: 2, display: 'flex', gap: 1.5, alignItems: 'flex-start', '&:hover': { borderColor: T.purple }, transition: 'border .2s' }}>
                  <Box sx={{ bgcolor: `${T.purple}18`, borderRadius: 1.5, p: 0.75, color: T.purple, display: 'inline-flex', flexShrink: 0 }}><FolderOpenIcon sx={{ fontSize: '1.1rem' }} /></Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ color: T.text, fontWeight: 700, fontSize: '.95rem' }}>{g.name}</Typography>
                    <Typography variant="caption" sx={{ color: T.sub, display: 'block', mb: 0.75 }}>Owner: {g.owner}</Typography>
                    <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                      <Chip label={`${g.members}M`}    size="small" sx={{ bgcolor: `${T.blue}11`,   color: T.blue,   fontSize: '.68rem', height: 18 }} />
                      <Chip label={`${g.projects}P`}   size="small" sx={{ bgcolor: `${T.green}11`,  color: T.green,  fontSize: '.68rem', height: 18 }} />
                      <Chip label={`${g.pipelines}CI`} size="small" sx={{ bgcolor: `${T.brand}11`,  color: T.brand,  fontSize: '.68rem', height: 18 }} />
                    </Box>
                  </Box>
                  <IconButton size="small"><EditIcon sx={{ fontSize: '.9rem', color: T.sub }} /></IconButton>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      ))}
    </Box>
  );

  const OrgPeople = (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, gap: 2, flexWrap: 'wrap' }}>
        <Typography sx={{ color: T.text, fontWeight: 700, fontSize: '1.1rem' }}>People Directory</Typography>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          <TextField placeholder="Search people…" size="small" value={peopleSearch} onChange={e => setPeopleSearch(e.target.value)}
            sx={{ width: 220, '& .MuiOutlinedInput-root': { borderRadius: 1.5, fontSize: '.875rem' } }} />
          <Button startIcon={<PersonAddIcon />} variant="contained" size="small" sx={{ bgcolor: T.brand }} onClick={() => setInviteOpen(true)}>Invite</Button>
        </Box>
      </Box>
      <TableContainer>
        <Table size="small">
          <TableHead><TableRow>
            {['Person', 'Role', 'Status', 'Joined', ''].map(h => <TableCell key={h} sx={{ color: T.sub, borderColor: T.border, fontWeight: 700, fontSize: '.8rem' }}>{h}</TableCell>)}
          </TableRow></TableHead>
          <TableBody>
            {people.length === 0 ? (
              <TableRow><TableCell colSpan={5} sx={{ color: T.sub, textAlign: 'center', py: 4, borderColor: T.border }}>No members yet. Invite someone above.</TableCell></TableRow>
            ) : people
              .filter(p => !peopleSearch || (p.name + p.email).toLowerCase().includes(peopleSearch.toLowerCase()))
              .map(p => (
                <TableRow key={p.id} hover sx={{ '& td': { borderColor: T.border } }}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ width: 32, height: 32, bgcolor: `${roleColors[p.role]}22`, color: roleColors[p.role], fontWeight: 700, fontSize: '.75rem' }}>
                        {(p.name || p.email).split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" sx={{ color: T.text, fontWeight: 600 }}>{p.name || '—'}</Typography>
                        <Typography variant="caption" sx={{ color: T.sub, fontSize: '.75rem' }}>{p.email}</Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell><Chip label={p.role} size="small" sx={{ bgcolor: `${roleColors[p.role]}22`, color: roleColors[p.role], fontWeight: 700, fontSize: '.7rem' }} /></TableCell>
                  <TableCell><StatusChip status={p.status} /></TableCell>
                  <TableCell><Typography variant="caption" sx={{ color: T.sub, fontFamily: 'monospace', fontSize: '.78rem' }}>{p.joined_at?.slice(0, 10) ?? p.invited_at?.slice(0, 10) ?? '—'}</Typography></TableCell>
                  <TableCell><IconButton size="small"><EditIcon sx={{ fontSize: '.9rem', color: T.sub }} /></IconButton></TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  const OrgPermissions = (
    <Box>
      <SectionCard title="Role Permission Matrix" icon={<GppGoodIcon />}>
        <TableContainer>
          <Table size="small">
            <TableHead><TableRow>
              <TableCell sx={{ color: T.sub, borderColor: T.border, fontWeight: 700 }}>Permission</TableCell>
              {(['OWNER', 'ADMIN', 'MANAGER', 'MEMBER', 'VIEWER'] as MemberRole[]).map(r => <TableCell key={r} align="center" sx={{ color: roleColors[r], borderColor: T.border, fontWeight: 700 }}>{r}</TableCell>)}
            </TableRow></TableHead>
            <TableBody>
              {[['Manage Organization', true, true, false, false, false],
                ['Create / Delete Teams', true, true, false, false, false],
                ['Manage Team Members',   true, true, true,  false, false],
                ['Create Groups',         true, true, true,  false, false],
                ['Manage Group Members',  true, true, true,  true,  false],
                ['Manage Marketing',      true, true, true,  true,  false],
                ['Manage Email Service',  true, true, true,  true,  false],
                ['Manage Domains',        true, true, true,  false, false],
                ['Manage Billing',        true, true, false, false, false],
                ['View Compliance Logs',  true, true, true,  false, false],
              ].map(([perm, ...vals]) => (
                <TableRow key={String(perm)} sx={{ '& td': { borderColor: T.border } }}>
                  <TableCell sx={{ color: T.text, fontWeight: 600 }}>{perm}</TableCell>
                  {(vals as boolean[]).map((v, i) => (
                    <TableCell key={i} align="center">{v ? <CheckCircleIcon sx={{ fontSize: '1rem', color: T.green }} /> : <Box sx={{ width: 8, height: 2, bgcolor: T.border, mx: 'auto', borderRadius: 1 }} />}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </SectionCard>
    </Box>
  );

  const OrgSettings = (
    <Box>
      <SectionCard title="Organization Settings" icon={<SettingsIcon />}
        action={
          <Button startIcon={savingOrg ? <CircularProgress size={14} sx={{ color: 'white' }} /> : <EditIcon />}
            variant="contained" size="small" sx={{ bgcolor: T.brand }}
            disabled={savingOrg || !editOrgName.trim()}
            onClick={handleSaveOrg}>
            {savingOrg ? 'Saving…' : 'Save Changes'}
          </Button>
        }>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField label="Organization Name" value={editOrgName}
              onChange={e => setEditOrgName(e.target.value)}
              fullWidth size="small" InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Primary Domain" value={editOrgDomain}
              onChange={e => setEditOrgDomain(e.target.value)}
              fullWidth size="small" InputLabelProps={{ shrink: true }}
              placeholder="e.g. acme.com" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel shrink>Industry</InputLabel>
              <Select value={editOrgIndustry} label="Industry"
                onChange={e => setEditOrgIndustry(e.target.value)}
                notched displayEmpty>
                <MenuItem value=""><em style={{ color: T.sub }}>Select industry…</em></MenuItem>
                {INDUSTRIES.map(ind => <MenuItem key={ind} value={ind}>{ind}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel shrink>Country / Region</InputLabel>
              <Select value={editOrgCountry} label="Country / Region"
                onChange={e => setEditOrgCountry(e.target.value)}
                notched displayEmpty>
                <MenuItem value=""><em style={{ color: T.sub }}>Select country…</em></MenuItem>
                {COUNTRIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Contact Email" value={editOrgEmail}
              onChange={e => setEditOrgEmail(e.target.value)}
              fullWidth size="small" InputLabelProps={{ shrink: true }}
              type="email" placeholder="billing@acme.com" />
          </Grid>
        </Grid>
      </SectionCard>

      <SectionCard title="Departments" icon={<AccountTreeIcon />}
        action={
          <Button startIcon={<AddIcon />} variant="contained" size="small" sx={{ bgcolor: T.brand }}
            onClick={() => { setCreateDeptOpen(true); }}>
            Add Department
          </Button>
        }>
        {depts.length === 0 ? (
          <Typography variant="body2" sx={{ color: T.sub, py: 1 }}>No departments yet. Add one above.</Typography>
        ) : (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {depts.map(d => (
              <Chip key={d.id} label={d.name}
                sx={{ bgcolor: `${T.brand}15`, color: T.text, fontWeight: 600, border: `1px solid ${T.border}` }} />
            ))}
          </Box>
        )}
      </SectionCard>

      <SectionCard title="Danger Zone" icon={<GppGoodIcon />}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, border: `1px solid ${T.red}44`, borderRadius: 2, bgcolor: `${T.red}08` }}>
          <Box>
            <Typography sx={{ color: T.text, fontWeight: 700 }}>Delete Organization</Typography>
            <Typography variant="caption" sx={{ color: T.sub }}>Permanently deletes all departments, teams, groups, members, domains, and billing data. This cannot be undone.</Typography>
          </Box>
          <Button variant="outlined" size="small" sx={{ borderColor: T.red, color: T.red, ml: 2, flexShrink: 0 }}
            onClick={() => { setDeleteConfirm(''); setDeleteOpen(true); }}>
            Delete
          </Button>
        </Box>
      </SectionCard>

      {/* ── Delete Confirmation Dialog ── */}
      <Dialog open={deleteOpen} onClose={() => !deleting && setDeleteOpen(false)}
        PaperProps={{ sx: { bgcolor: T.card, border: `1px solid ${T.red}55`, maxWidth: 460 } }}>
        <DialogTitle sx={{ color: T.red, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <DeleteIcon sx={{ fontSize: '1.3rem' }} /> Delete organization
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
          <Alert severity="error" sx={{ fontSize: '.85rem' }}>
            This will <strong>permanently delete</strong> <em>{org?.name}</em> and all associated data including members, departments, teams, groups, domains, branding, and billing records.
          </Alert>
          <Typography variant="body2" sx={{ color: T.sub }}>
            Type <Box component="span" sx={{ color: T.text, fontWeight: 700, fontFamily: 'monospace' }}>{org?.name}</Box> to confirm.
          </Typography>
          <TextField
            value={deleteConfirm}
            onChange={e => setDeleteConfirm(e.target.value)}
            placeholder={org?.name}
            fullWidth size="small"
            disabled={deleting}
            autoComplete="off"
            sx={{ '& .MuiOutlinedInput-root': { borderColor: T.red } }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteOpen(false)} disabled={deleting} sx={{ color: T.sub }}>Cancel</Button>
          <Button
            variant="contained"
            disabled={deleteConfirm !== org?.name || deleting}
            onClick={handleDeleteOrg}
            startIcon={deleting ? <CircularProgress size={14} sx={{ color: 'white' }} /> : <DeleteIcon />}
            sx={{ bgcolor: T.red, '&:hover': { bgcolor: '#c0392b' }, '&.Mui-disabled': { bgcolor: `${T.red}55`, color: 'white' } }}>
            {deleting ? 'Deleting…' : 'Delete permanently'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );

  if (deptsLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, minHeight: 300 }}>
        <CircularProgress sx={{ color: T.brand }} />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden', bgcolor: T.bg }}>
      {/* ── Left Sub-Nav (hidden while inside a department) ── */}
      {!isInsideDept && (
        <Box sx={{ width: 210, bgcolor: T.card2, borderRight: `1px solid ${T.border}`, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
          {/* Org identity */}
          <Box sx={{ p: 2, borderBottom: `1px solid ${T.border}` }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar sx={{ width: 36, height: 36, bgcolor: T.brand, fontWeight: 800, fontSize: '.9rem' }}>{org?.name?.slice(0, 2).toUpperCase() || 'AC'}</Avatar>
              <Box>
                <Typography sx={{ color: T.text, fontWeight: 700, fontSize: '.9rem', lineHeight: 1.2 }}>{org?.name}</Typography>
                <Typography variant="caption" sx={{ color: T.sub, fontSize: '.72rem' }}>{org?.primary_domain}</Typography>
              </Box>
            </Box>
          </Box>
          {/* Nav */}
          {orgSubNav.map(item => (
            <Button key={item.key} fullWidth startIcon={item.icon} onClick={() => { setView(item.key); if (item.key !== 'teams') setSelectedTeamId(null); }}
              sx={{ justifyContent: 'flex-start', px: 2, py: 1.25, borderRadius: 0, fontFamily: T.font, fontWeight: view === item.key ? 700 : 500, fontSize: '.88rem',
                color: view === item.key ? T.brand : T.sub,
                bgcolor: view === item.key ? `${T.brand}10` : 'transparent',
                borderLeft: view === item.key ? `3px solid ${T.brand}` : '3px solid transparent',
                '&:hover': { bgcolor: `${T.brand}08`, color: T.text }, transition: 'all .15s' }}>
              {item.label}
            </Button>
          ))}
        </Box>
      )}

      {/* ── Main Content ── */}
      <Box sx={{ flex: 1, p: isInsideDept ? 0 : 3, overflowY: 'auto', bgcolor: T.bg, display: 'flex', flexDirection: 'column' }}>
        {/* Department detail page – full area rendering */}
        {isInsideDept && selectedDeptId ? (
          <DepartmentPage
            deptId={selectedDeptId}
            dept={depts.find(d => d.id === selectedDeptId) ?? null}
            orgId={orgId}
            orgSlug={orgSlug}
            orgName={org?.name ?? ''}
            members={people}
            subView={deptSubView ?? 'overview'}
            onSubViewChange={sv =>
              navigate(`/enterprise/${orgSlug}/organization/departments/${selectedDeptId}/${sv}`)
            }
            onBack={() => navigate(`/enterprise/${orgSlug}/organization/departments`)}
          />
        ) : (
          <>
            {view === 'overview'     && OrgOverview}
            {view === 'departments'  && OrgDepartments}
            {view === 'teams'        && OrgTeams}
            {view === 'groups'       && OrgGroups}
            {view === 'people'       && OrgPeople}
            {view === 'permissions'  && OrgPermissions}
            {view === 'settings'     && OrgSettings}
          </>
        )}
      </Box>

      {/* ── Create Department Dialog ── */}
      <Dialog open={createDeptOpen} onClose={() => !creatingDept && setCreateDeptOpen(false)}
        PaperProps={{ sx: { bgcolor: T.card, border: `1px solid ${T.border}`, minWidth: 480, maxWidth: 560 } }}>
        <DialogTitle sx={{ color: T.text, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <AccountTreeIcon sx={{ color: T.brand, fontSize: '1.3rem' }} /> Create Department
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: '8px !important' }}>

          {/* Name */}
          <TextField
            label="Department Name *"
            value={deptName}
            onChange={e => setDeptName(e.target.value)}
            fullWidth size="small" autoFocus
            helperText="The official name of this department inside your organization."
          />

          {/* Category — searchable grouped dropdown */}
          <Autocomplete
            options={DEPT_CATEGORIES}
            groupBy={opt => opt.group}
            getOptionLabel={opt => opt.label}
            value={deptCategory}
            onChange={(_, val) => setDeptCategory(val)}
            isOptionEqualToValue={(a, b) => a.label === b.label}
            renderInput={params => (
              <TextField {...params} label="Department Category *" size="small"
                helperText="Select the global standard category for this department." />
            )}
            renderGroup={params => (
              <Box key={params.key}>
                <Typography sx={{ px: 2, py: 0.5, fontSize: '.72rem', fontWeight: 700, color: T.brand, textTransform: 'uppercase', letterSpacing: '.08em', bgcolor: `${T.brand}08` }}>{params.group}</Typography>
                {params.children}
              </Box>
            )}
            sx={{ '& .MuiAutocomplete-listbox': { '& .MuiAutocomplete-groupLabel': { display: 'none' } } }}
            freeSolo={false}
            disableClearable={false}
          />

          {/* Description */}
          <TextField
            label="Description (optional)"
            value={deptDescription}
            onChange={e => setDeptDescription(e.target.value)}
            fullWidth size="small" multiline rows={2}
            helperText="Brief summary of this department’s purpose."
          />

          {/* Department Lead */}
          <TextField
            label="Department Lead (optional)"
            value={deptLead}
            onChange={e => setDeptLead(e.target.value)}
            fullWidth size="small"
            helperText="Name or email of the person leading this department."
          />

          {/* Parent Department */}
          <FormControl fullWidth size="small">
            <InputLabel>Parent Department (optional)</InputLabel>
            <Select value={deptParentId} label="Parent Department (optional)"
              onChange={e => setDeptParentId(e.target.value)}>
              <MenuItem value=""><em style={{ color: T.sub }}>None (top-level department)</em></MenuItem>
              {depts.filter(d => d.name !== deptName.trim()).map(d => (
                <MenuItem key={d.id} value={d.id}>
                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{d.name}</Typography>
                    {d.category && <Typography variant="caption" sx={{ color: T.sub }}>{d.category}</Typography>}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {depts.some(d => d.name.toLowerCase() === deptName.trim().toLowerCase()) && (
            <Alert severity="warning" sx={{ py: 0 }}>A department with this name already exists.</Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => { setCreateDeptOpen(false); setDeptName(''); setDeptCategory(null); setDeptDescription(''); setDeptLead(''); setDeptParentId(''); }}
            disabled={creatingDept} sx={{ color: T.sub }}>Cancel</Button>
          <Button variant="contained" sx={{ bgcolor: T.brand }}
            disabled={creatingDept || !deptName.trim() || !deptCategory}
            onClick={handleCreateDept}
            startIcon={creatingDept ? <CircularProgress size={14} sx={{ color: 'white' }} /> : <AddIcon />}>
            {creatingDept ? 'Creating…' : 'Create Department'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Create Team Dialog ── */}
      <Dialog open={createTeamOpen} onClose={() => setCreateTeamOpen(false)} PaperProps={{ sx: { bgcolor: T.card, border: `1px solid ${T.border}` } }}>
        <DialogTitle sx={{ color: T.text, fontWeight: 700 }}>Create Team</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important', minWidth: 380 }}>
          {depts.length > 0 && (
            <FormControl size="small" fullWidth>
              <InputLabel>Department</InputLabel>
              <Select value={teamDeptId} label="Department" onChange={e => setTeamDeptId(e.target.value)}>
                {depts.map(d => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
              </Select>
            </FormControl>
          )}
          <TextField label="Team name" value={teamName} onChange={e => setTeamName(e.target.value)} fullWidth size="small" />
          <FormControl size="small" fullWidth><InputLabel>Type</InputLabel>
            <Select value={teamType} label="Type" onChange={e => setTeamType(e.target.value as TeamType)}>
              <MenuItem value="DEPARTMENT">Department</MenuItem>
              <MenuItem value="FUNCTION">Function</MenuItem>
              <MenuItem value="SQUAD">Squad</MenuItem>
            </Select>
          </FormControl>
          <TextField label="Description" value={teamDesc} onChange={e => setTeamDesc(e.target.value)} fullWidth size="small" multiline rows={2} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateTeamOpen(false)} sx={{ color: T.sub }}>Cancel</Button>
          <Button variant="contained" sx={{ bgcolor: T.brand }} onClick={handleCreateTeam} disabled={!teamName}>Create Team</Button>
        </DialogActions>
      </Dialog>

      {/* Create Group */}
      <Dialog open={!!createGroupTeamId} onClose={() => setCreateGroupTeamId(null)} PaperProps={{ sx: { bgcolor: T.card, border: `1px solid ${T.border}` } }}>
        <DialogTitle sx={{ color: T.text, fontWeight: 700 }}>Create Group{createGroupTeamId ? ` in ${teams.find(t => t.id === createGroupTeamId)?.name}` : ''}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important', minWidth: 380 }}>
          <TextField label="Group name" value={groupName} onChange={e => setGroupName(e.target.value)} fullWidth size="small" />
          <TextField label="Owner (optional)" value={groupOwner} onChange={e => setGroupOwner(e.target.value)} fullWidth size="small" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateGroupTeamId(null)} sx={{ color: T.sub }}>Cancel</Button>
          <Button variant="contained" sx={{ bgcolor: T.brand }} onClick={handleCreateGroup} disabled={!groupName}>Create Group</Button>
        </DialogActions>
      </Dialog>

      {/* Invite Member */}
      <Dialog open={inviteOpen} onClose={() => setInviteOpen(false)} PaperProps={{ sx: { bgcolor: T.card, border: `1px solid ${T.border}` } }}>
        <DialogTitle sx={{ color: T.text, fontWeight: 700 }}>Invite Member</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important', minWidth: 380 }}>
          <TextField label="Email address" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} fullWidth size="small" />
          <FormControl size="small" fullWidth><InputLabel>Role</InputLabel>
            <Select value={inviteRole} label="Role" onChange={e => setInviteRole(e.target.value as MemberRole)}>
              {(['ADMIN','MANAGER','MEMBER','VIEWER'] as MemberRole[]).map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" fullWidth><InputLabel>Team</InputLabel>
            <Select value={inviteTeam} label="Team" onChange={e => setInviteTeam(e.target.value)}>
              <MenuItem value=""><em>None</em></MenuItem>
              {teams.map(t => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteOpen(false)} sx={{ color: T.sub }}>Cancel</Button>
          <Button variant="contained" sx={{ bgcolor: T.brand }} onClick={handleInvite} disabled={!inviteEmail}>Send Invite</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack('')} message={snack} />
    </Box>
  );
}

// ── Section: Marketing ────────────────────────────────────────────────────
function MarketingSection() {
  const [tab, setTab] = useState(0);
  type Workspace = { id: string; name: string; team_id: string; campaigns: number; audiences: number };
  type Campaign  = { id: string; name: string; status: CampaignStatus; channel: string; audience: number; sent: number; opens: number; clicks: number; start: string };
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [campaigns]                 = useState<Campaign[]>([]);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [wsName, setWsName] = useState('');
  const [snack, setSnack] = useState('');

  const totalSent   = campaigns.reduce((s, c) => s + c.sent,   0);
  const totalOpens  = campaigns.reduce((s, c) => s + c.opens,  0);
  const totalClicks = campaigns.reduce((s, c) => s + c.clicks, 0);
  const openRate = totalSent ? ((totalOpens / totalSent) * 100).toFixed(1) : '0';
  const clickRate = totalSent ? ((totalClicks / totalSent) * 100).toFixed(1) : '0';

  const statusColor: Record<CampaignStatus, string> = { RUNNING: T.green, SCHEDULED: T.blue, DRAFT: T.sub, PAUSED: T.yellow, COMPLETED: T.sub };

  const handleCreateWorkspace = () => {
    if (!wsName) return;
    const newWs = { id: `w${workspaces.length + 1}`, name: wsName, team_id: '', campaigns: 0, audiences: 0 };
    setWorkspaces([...workspaces, newWs]);
    setSnack(`Workspace "${wsName}" created`);
    setWorkspaceOpen(false);
    setWsName('');
  };

  return (
    <Box>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, '& .MuiTab-root': { color: T.sub }, '& .Mui-selected': { color: T.brand }, '& .MuiTabs-indicator': { bgcolor: T.brand } }}>
        <Tab label="Workspaces & Campaigns" />
        <Tab label="Audiences" />
      </Tabs>

      {tab === 0 && (
        <>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} md={3}><MetricCard label="Workspaces" value={workspaces.length} color={T.brand} /></Grid>
            <Grid item xs={6} md={3}><MetricCard label="Campaigns" value={campaigns.length} color={T.blue} /></Grid>
            <Grid item xs={6} md={3}><MetricCard label="Open Rate" value={`${openRate}%`} color={T.green} /></Grid>
            <Grid item xs={6} md={3}><MetricCard label="Click Rate" value={`${clickRate}%`} color={T.purple} /></Grid>
          </Grid>

          <SectionCard title="Marketing Workspaces" icon={<CampaignIcon />} action={<Button startIcon={<AddIcon />} variant="contained" size="small" sx={{ bgcolor: T.brand }} onClick={() => setWorkspaceOpen(true)}>New Workspace</Button>}>
            <Grid container spacing={2}>
              {workspaces.map(ws => (
                <Grid key={ws.id} item xs={12} md={6}>
                  <Paper sx={{ p: 2.5, bgcolor: T.card2, border: `1px solid ${T.border}`, borderRadius: 2 }}>
                    <Typography sx={{ color: T.text, fontWeight: 700, fontFamily: T.font, mb: 2 }}>{ws.name}</Typography>
                    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                      <Box><Typography variant="caption" sx={{ color: T.sub, display: 'block' }}>Campaigns</Typography><Typography sx={{ color: T.text, fontWeight: 700 }}>{ws.campaigns}</Typography></Box>
                      <Box><Typography variant="caption" sx={{ color: T.sub, display: 'block' }}>Audiences</Typography><Typography sx={{ color: T.text, fontWeight: 700 }}>{ws.audiences}</Typography></Box>
                    </Box>
                    <Button fullWidth variant="outlined" size="small" sx={{ borderColor: T.border, color: T.brand }}>Manage Workspace</Button>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </SectionCard>

          <SectionCard title="All Campaigns" icon={<TrendingUpIcon />} action={<Button startIcon={<AddIcon />} variant="contained" size="small" sx={{ bgcolor: T.brand }}>New Campaign</Button>}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {['Campaign', 'Status', 'Audience', 'Sent', 'Opens', 'Clicks', 'Start'].map(h => (
                      <TableCell key={h} sx={{ color: T.sub, borderColor: T.border, fontSize: '.8rem', fontWeight: 700 }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {campaigns.length === 0
                    ? <TableRow><TableCell colSpan={7} sx={{ color: T.sub, textAlign: 'center', py: 4, borderColor: T.border }}>No campaigns yet.</TableCell></TableRow>
                    : campaigns.map(c => (
                      <TableRow key={c.id} hover sx={{ '& td': { borderColor: T.border } }}>
                        <TableCell sx={{ color: T.text, fontWeight: 600 }}>{c.name}</TableCell>
                        <TableCell><Chip label={c.status} size="small" sx={{ bgcolor: `${statusColor[c.status]}22`, color: statusColor[c.status], fontWeight: 700, fontSize: '.7rem' }} /></TableCell>
                        <TableCell sx={{ color: T.sub }}>{c.audience.toLocaleString()}</TableCell>
                        <TableCell sx={{ color: T.text, fontWeight: 600 }}>{c.sent.toLocaleString()}</TableCell>
                        <TableCell sx={{ color: T.green }}>{c.opens.toLocaleString()}</TableCell>
                        <TableCell sx={{ color: T.blue }}>{c.clicks.toLocaleString()}</TableCell>
                        <TableCell sx={{ color: T.sub }}>{c.start}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
          </SectionCard>
        </>
      )}

      {tab === 1 && (
        <SectionCard title="Audiences" icon={<GroupsIcon />} action={<Button startIcon={<AddIcon />} variant="contained" size="small" sx={{ bgcolor: T.brand }}>New Audience</Button>}>
          {[
            { name: 'All Subscribers', count: 28500, source: 'IMPORT', active: 27100 },
            { name: 'Trial Users', count: 4200, source: 'INTEGRATION', active: 3900 },
            { name: 'Enterprise Leads', count: 620, source: 'MANUAL', active: 580 },
          ].map(a => (
            <Box key={a.name} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5, borderBottom: `1px solid ${T.border}`, '&:last-child': { borderBottom: 'none' } }}>
              <Box><Typography sx={{ color: T.text, fontWeight: 600, fontSize: '.95rem' }}>{a.name}</Typography><Typography variant="caption" sx={{ color: T.sub }}>Source: {a.source}</Typography></Box>
              <Box sx={{ textAlign: 'right' }}><Typography sx={{ color: T.text, fontWeight: 700 }}>{a.count.toLocaleString()}</Typography><Typography variant="caption" sx={{ color: T.green }}>{a.active.toLocaleString()} active</Typography></Box>
            </Box>
          ))}
        </SectionCard>
      )}

      <Dialog open={workspaceOpen} onClose={() => setWorkspaceOpen(false)} PaperProps={{ sx: { bgcolor: T.card, border: `1px solid ${T.border}` } }}>
        <DialogTitle sx={{ color: T.text, fontWeight: 700 }}>Create Marketing Workspace</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important', minWidth: 380 }}>
          <TextField label="Workspace name" value={wsName} onChange={e => setWsName(e.target.value)} fullWidth size="small" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWorkspaceOpen(false)} sx={{ color: T.sub }}>Cancel</Button>
          <Button variant="contained" sx={{ bgcolor: T.brand }} onClick={handleCreateWorkspace} disabled={!wsName}>Create</Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack('')} message={snack} />
    </Box>
  );
}

// ── Section: Email Service ────────────────────────────────────────────────
function EmailSection() {
  const [tab, setTab] = useState(0);
  const [snack, setSnack] = useState('');

  const mockDomains = [
    { id: 'ed1', domain: 'mail.orcacloud.com', status: 'VERIFIED' as EmailDomainStatus, dkim: 'v=DKIM1; k=rsa; p=MIIBIj...', spf: 'v=spf1 include:_spf.orcacloud.com ~all' },
    { id: 'ed2', domain: 'outbound.orcacloud.com', status: 'PENDING_DNS' as EmailDomainStatus, dkim: 'v=DKIM1; k=rsa; p=MIIBIj...', spf: 'v=spf1 include:_spf.orcacloud.com ~all' },
  ];

  const mockSenders = [
    { id: 's1', name: 'Product Team', email: 'product@orcacloud.com', verified: true },
    { id: 's2', name: 'Marketing', email: 'marketing@orcacloud.com', verified: false },
  ];

  const mockTemplates = [
    { id: 'tpl1', name: 'Welcome Email', subject: 'Welcome to OrcaCloud', variables: ['name', 'company'] },
    { id: 'tpl2', name: 'Password Reset', subject: 'Reset Your Password', variables: ['reset_link'] },
    { id: 'tpl3', name: 'Monthly Report', subject: 'Your Monthly Report', variables: ['month', 'stats'] },
  ];

  return (
    <Box>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, '& .MuiTab-root': { color: T.sub }, '& .Mui-selected': { color: T.brand } }}>
        <Tab label="Sending Domains" />
        <Tab label="Sender Identities" />
        <Tab label="Templates" />
        <Tab label="Logs & Analytics" />
      </Tabs>

      {tab === 0 && (
        <SectionCard title="Email Sending Domains" icon={<DnsIcon />} action={<Button startIcon={<AddIcon />} variant="contained" size="small" sx={{ bgcolor: T.brand }}>Add Domain</Button>}>
          <Grid container spacing={2}>
            {mockDomains.map(d => (
              <Grid key={d.id} item xs={12} md={6}>
                <Paper sx={{ p: 2.5, bgcolor: T.card2, border: `1px solid ${T.border}`, borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}><DomainIcon sx={{ color: T.brand }} /><Typography sx={{ color: T.text, fontWeight: 700 }}>{d.domain}</Typography></Box>
                    <StatusChip status={d.status} />
                  </Box>
                  {d.status === 'PENDING_DNS' && <Alert severity="warning" sx={{ mb: 1.5, fontSize: '.8rem', py: 0.5 }}>Add DNS records to verify this domain.</Alert>}
                  {[['DKIM', d.dkim], ['SPF', d.spf]].map(([type, val]) => (
                    <Box key={type} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                      <Typography variant="caption" sx={{ color: T.sub, width: 50, flexShrink: 0, fontWeight: 600 }}>{type}</Typography>
                      <Box sx={{ flex: 1, bgcolor: T.bg, borderRadius: 1, px: 1, py: 0.5, fontFamily: 'monospace', fontSize: '.7rem', color: T.sub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{val}</Box>
                      <Tooltip title="Copy"><IconButton size="small" onClick={() => { navigator.clipboard?.writeText(val as string); setSnack('Copied!'); }}><ContentCopyIcon sx={{ fontSize: '.9rem', color: T.sub }} /></IconButton></Tooltip>
                    </Box>
                  ))}
                </Paper>
              </Grid>
            ))}
          </Grid>
        </SectionCard>
      )}

      {tab === 1 && (
        <SectionCard title="Sender Identities" icon={<VerifiedIcon />} action={<Button startIcon={<AddIcon />} variant="contained" size="small" sx={{ bgcolor: T.brand }}>Add Sender</Button>}>
          {mockSenders.map(s => (
            <Box key={s.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5, borderBottom: `1px solid ${T.border}`, '&:last-child': { borderBottom: 'none' } }}>
              <Box><Typography sx={{ color: T.text, fontWeight: 600 }}>{s.name}</Typography><Typography variant="caption" sx={{ color: T.sub }}>{s.email}</Typography></Box>
              {s.verified ? <Chip label="Verified" size="small" icon={<CheckCircleIcon sx={{ fontSize: '.9rem' }} />} sx={{ bgcolor: `${T.green}22`, color: T.green }} /> : <Button size="small" variant="outlined" sx={{ borderColor: T.yellow, color: T.yellow, fontSize: '.75rem' }}>Verify</Button>}
            </Box>
          ))}
        </SectionCard>
      )}

      {tab === 2 && (
        <SectionCard title="Email Templates" icon={<MailOutlineIcon />} action={<Button startIcon={<AddIcon />} variant="contained" size="small" sx={{ bgcolor: T.brand }}>New Template</Button>}>
          <Grid container spacing={2}>
            {mockTemplates.map(t => (
              <Grid key={t.id} item xs={12} md={4}>
                <Paper sx={{ p: 2.5, bgcolor: T.card2, border: `1px solid ${T.border}`, borderRadius: 2, height: '100%' }}>
                  <Typography sx={{ color: T.text, fontWeight: 700, mb: 0.5 }}>{t.name}</Typography>
                  <Typography variant="caption" sx={{ color: T.sub, display: 'block', mb: 1.5, fontSize: '.8rem' }}>{t.subject}</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>{t.variables.map((v: string) => <Chip key={v} label={`{{${v}}}`} size="small" sx={{ bgcolor: `${T.brand}22`, color: T.brand, fontSize: '.65rem' }} />)}</Box>
                  <Button fullWidth variant="outlined" size="small" sx={{ borderColor: T.border, color: T.brand }}>Edit</Button>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </SectionCard>
      )}

      {tab === 3 && (
        <SectionCard title="Email Analytics (Last 30 Days)" icon={<TrendingUpIcon />}>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} md={3}><MetricCard label="Sent" value="26.8K" color={T.brand} /></Grid>
            <Grid item xs={6} md={3}><MetricCard label="Delivered" value="26.5K" color={T.green} /></Grid>
            <Grid item xs={6} md={3}><MetricCard label="Open Rate" value="34.2%" color={T.blue} /></Grid>
            <Grid item xs={6} md={3}><MetricCard label="Click Rate" value="7.1%" color={T.purple} /></Grid>
          </Grid>
          {[['Bounce Rate', '1.2%', T.yellow], ['Unsubscribe Rate', '0.4%', T.red], ['Spam Rate', '0.02%', T.sub]].map(([label, val, color]) => (
            <Box key={String(label)} sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: `1px solid ${T.border}`, '&:last-child': { borderBottom: 'none' } }}>
              <Typography variant="body2" sx={{ color: T.sub }}>{label}</Typography>
              <Typography variant="body2" sx={{ color, fontWeight: 700 }}>{val}</Typography>
            </Box>
          ))}
        </SectionCard>
      )}
      <Snackbar open={!!snack} autoHideDuration={2500} onClose={() => setSnack('')} message={snack} />
    </Box>
  );
}

// ── Section: Domains ───────────────────────────────────────────────────────
function DomainsSection() {
  const [snack, setSnack] = useState('');

  const mockDomains = [
    { id: 'd1', name: 'orcacloud.com', type: 'MIXED', status: 'ACTIVE' as DomainStatus, linked: ['App', 'Marketing', 'Email'] },
    { id: 'd2', name: 'app.orcacloud.com', type: 'APP', status: 'ACTIVE' as DomainStatus, linked: ['App'] },
    { id: 'd3', name: 'go.orcacloud.com', type: 'MARKETING', status: 'ACTIVE' as DomainStatus, linked: ['Marketing'] },
    { id: 'd4', name: 'beta.orcacloud.com', type: 'APP', status: 'PENDING_DNS' as DomainStatus, linked: [] },
  ];

  return (
    <SectionCard title="Organization Domains" icon={<DomainIcon />} action={<Button startIcon={<AddIcon />} variant="contained" size="small" sx={{ bgcolor: T.brand }}>Add Domain</Button>}>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              {['Domain', 'Type', 'Status', 'Used For', ''].map(h => (
                <TableCell key={h} sx={{ color: T.sub, borderColor: T.border, fontSize: '.8rem', fontWeight: 700 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {mockDomains.map(d => (
              <TableRow key={d.id} hover sx={{ '& td': { borderColor: T.border } }}>
                <TableCell><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><DomainIcon sx={{ color: T.brand, fontSize: '1.1rem' }} /><Typography variant="body2" sx={{ color: T.text, fontWeight: 600 }}>{d.name}</Typography></Box></TableCell>
                <TableCell><Chip label={d.type} size="small" sx={{ bgcolor: `${T.blue}22`, color: T.blue }} /></TableCell>
                <TableCell><StatusChip status={d.status} /></TableCell>
                <TableCell><Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>{d.linked.map(l => <Chip key={l} label={l} size="small" sx={{ bgcolor: `${T.green}11`, color: T.green }} />)}</Box></TableCell>
                <TableCell><IconButton size="small"><EditIcon sx={{ fontSize: '1rem', color: T.sub }} /></IconButton></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </SectionCard>
  );
}

// ── Section: Branding ──────────────────────────────────────────────────────
function BrandingSection() {
  const branding = {
    primary_color: '#153d75', secondary_color: '#1e5fa8', accent_color: '#00d4aa',
    logo_url: 'https://via.placeholder.com/200x60?text=OrcaCloud', font_family: 'IBM Plex Sans',
  };

  return (
    <Box>
      <SectionCard title="Brand Profile" icon={<PaletteIcon />} action={<Button startIcon={<EditIcon />} variant="contained" size="small" sx={{ bgcolor: T.brand }}>Edit Profile</Button>}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" sx={{ color: T.sub, mb: 2, fontWeight: 600 }}>Logo</Typography>
            <Paper sx={{ p: 3, bgcolor: T.card2, border: `1px solid ${T.border}`, borderRadius: 2, textAlign: 'center' }}>
              <img src={branding.logo_url} alt="Brand Logo" style={{ maxWidth: '100%', maxHeight: 100, borderRadius: 4 }} />
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" sx={{ color: T.sub, mb: 2, fontWeight: 600 }}>Font Family</Typography>
            <Paper sx={{ p: 2, bgcolor: T.card2, border: `1px solid ${T.border}`, borderRadius: 2 }}>
              <Typography sx={{ color: T.text, fontFamily: branding.font_family }}>{branding.font_family}</Typography>
            </Paper>
          </Grid>
        </Grid>
      </SectionCard>

      <SectionCard title="Color Palette" icon={<ColorLensIcon />}>
        <Grid container spacing={2}>
          {[['Primary', branding.primary_color], ['Secondary', branding.secondary_color], ['Accent', branding.accent_color]].map(([label, color]) => (
            <Grid key={label} item xs={12} sm={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Box sx={{ width: '100%', height: 80, bgcolor: color, borderRadius: 2, mb: 1.5, border: `2px solid ${T.border}` }} />
                <Typography variant="body2" sx={{ color: T.text, fontWeight: 600 }}>{label}</Typography>
                <Typography variant="caption" sx={{ color: T.sub, fontFamily: 'monospace' }}>{color}</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </SectionCard>
    </Box>
  );
}

// ── Section: Billing ───────────────────────────────────────────────────────
// Immediately redirects to /billing (the global billing page in the profile dropdown)
function BillingSection() {
  const _navigate = useNavigate();
  React.useEffect(() => { _navigate('/billing', { replace: true }); }, [_navigate]);
  return null;
}

// ── Section: Compliance ────────────────────────────────────────────────────
function ComplianceSection() {
  const [filterActor, setFilterActor] = useState('');
  const [filterAction, setFilterAction] = useState('');

  const auditLogs: { id: string; actor: string; action: string; target: string; timestamp: string; ip: string }[] = [];

  return (
    <Box>
      <SectionCard title="Compliance & Audit" icon={<GppGoodIcon />}>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}><MetricCard label="Compliance Score" value="98%" color={T.green} /></Grid>
          <Grid item xs={12} md={4}><MetricCard label="Active Policies" value="12" color={T.blue} /></Grid>
          <Grid item xs={12} md={4}><MetricCard label="Audit Events" value={auditLogs.length.toString()} color={T.purple} /></Grid>
        </Grid>
      </SectionCard>

      <SectionCard title="Audit Log" icon={<GppGoodIcon />}>
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <TextField label="Filter by actor" value={filterActor} onChange={e => setFilterActor(e.target.value)} size="small" sx={{ flex: 1 }} />
          <TextField label="Filter by action" value={filterAction} onChange={e => setFilterAction(e.target.value)} size="small" sx={{ flex: 1 }} />
        </Box>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['Event', 'Actor', 'Target', 'Timestamp', 'IP'].map(h => (
                  <TableCell key={h} sx={{ color: T.sub, borderColor: T.border, fontSize: '.8rem', fontWeight: 700 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {auditLogs.filter(l => (!filterActor || l.actor.includes(filterActor)) && (!filterAction || l.action.includes(filterAction))).map(entry => (
                <TableRow key={entry.id} hover sx={{ '& td': { borderColor: T.border } }}>
                  <TableCell sx={{ color: T.text, fontWeight: 600, fontSize: '.85rem' }}>{entry.action}</TableCell>
                  <TableCell sx={{ color: T.sub, fontSize: '.85rem' }}>{entry.actor}</TableCell>
                  <TableCell sx={{ color: T.sub, fontSize: '.85rem' }}>{entry.target}</TableCell>
                  <TableCell sx={{ color: T.sub, fontFamily: 'monospace', fontSize: '.8rem' }}>{entry.timestamp}</TableCell>
                  <TableCell sx={{ color: T.sub, fontFamily: 'monospace', fontSize: '.8rem' }}>{entry.ip}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </SectionCard>
    </Box>
  );
}

// ── Section: Workspace ────────────────────────────────────────────────────
function WorkspaceSection() {
  return (
    <Box>
      <SectionCard title="Workspace" icon={<WorkspacesIcon />}>
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <WorkspacesIcon sx={{ fontSize: '3rem', color: T.sub, mb: 2 }} />
          <Typography sx={{ color: T.text, fontWeight: 700, fontSize: '1.1rem', mb: 1 }}>
            Workspace coming soon
          </Typography>
          <Typography sx={{ color: T.sub, fontSize: '.92rem' }}>
            Collaborative workspace tools — shared docs, boards, and wikis — will be available here.
          </Typography>
        </Box>
      </SectionCard>
    </Box>
  );
}

// ── Section: Docs ─────────────────────────────────────────────────────────
function DocsSection() {
  return (
    <Box>
      <SectionCard title="Docs" icon={<ArticleIcon />}>
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <ArticleIcon sx={{ fontSize: '3rem', color: T.sub, mb: 2 }} />
          <Typography sx={{ color: T.text, fontWeight: 700, fontSize: '1.1rem', mb: 1 }}>
            Documentation coming soon
          </Typography>
          <Typography sx={{ color: T.sub, fontSize: '.92rem' }}>
            Internal knowledge base, runbooks, and API references for your organization will live here.
          </Typography>
        </Box>
      </SectionCard>
    </Box>
  );
}

// ── Section Navigation Metadata ──────────────────────────────────────────────
const SECTION_META: Record<string, { label: string; icon: React.ReactNode }> = {
  overview:      { label: 'Overview',     icon: <BusinessIcon />    },
  organization:  { label: 'Organization', icon: <AccountTreeIcon /> },
  marketing:     { label: 'Marketing',    icon: <CampaignIcon />    },
  email:         { label: 'Email Service', icon: <MailOutlineIcon /> },
  domains:       { label: 'Domains',      icon: <DomainIcon />      },
  branding:      { label: 'Branding',     icon: <PaletteIcon />     },
  workspace:     { label: 'Workspace',    icon: <WorkspacesIcon />  },
  docs:          { label: 'Docs',         icon: <ArticleIcon />     },
  billing:       { label: 'Billing',      icon: <ReceiptLongIcon /> },
  compliance:    { label: 'Compliance',   icon: <GppGoodIcon />     },
};

// ── Enterprise Section Sub-Nav ─────────────────────────────────────────────
function EnterpriseSectionNav({ orgSlug, section, navigate }: { orgSlug: string; section: string; navigate: ReturnType<typeof useNavigate> }) {
  return (
    <Box sx={{
      position: 'sticky', top: 0, zIndex: 90,
      bgcolor: T.card, borderBottom: `1px solid ${T.border}`,
      display: 'flex', overflowX: 'auto',
      '&::-webkit-scrollbar': { height: 3 },
      '&::-webkit-scrollbar-thumb': { bgcolor: T.border, borderRadius: 2 },
    }}>
      {Object.entries(SECTION_META).map(([key, { label, icon }]) => {
        const isActive = section === key;
        return (
          <Button
            key={key}
            startIcon={icon}
            onClick={() => navigate(
              key === 'billing' ? '/billing' :
              key === 'docs' ? '/docs' :
              `/enterprise/${orgSlug}/${key}`
            )}
            variant="text"
            size="small"
            sx={{
              px: 2, py: 1.5, borderRadius: 0,
              color: isActive ? T.brand : T.sub,
              fontWeight: isActive ? 700 : 500,
              fontSize: '.87rem',
              fontFamily: T.font,
              whiteSpace: 'nowrap',
              flexShrink: 0,
              borderBottom: isActive ? `2px solid ${T.brand}` : '2px solid transparent',
              bgcolor: isActive ? `${T.brand}08` : 'transparent',
              transition: 'color 0.15s, background-color 0.15s',
              '&:hover': { bgcolor: `${T.brand}0f`, color: T.text },
            }}
          >
            {label}
          </Button>
        );
      })}
    </Box>
  );
}

// ── Main Dashboard Page ────────────────────────────────────────────────────
const EnterpriseDashboardPage: React.FC = () => {
  const { orgSlug = '', section = 'overview', '*': orgSubView } = useParams<{ orgSlug: string; section: string; '*'?: string }>();
  const navigate = useNavigate();
  const [org, setOrg]           = useState<OrgData | null>(null);
  const [orgLoading, setOrgLoading] = useState(true);
  const [orgError, setOrgError]     = useState<string | null>(null);
  const [newOrgOpen, setNewOrgOpen] = useState(false);

  useEffect(() => {
    if (!orgSlug) {
      navigate('/enterprise', { replace: true });
      return;
    }
    let cancelled = false;
    setOrgLoading(true);
    setOrgError(null);

    organizationApi.getBySlug(orgSlug)
      .then(data => {
        if (!cancelled) { setOrg(data); setOrgLoading(false); }
      })
      .catch((err: any) => {
        if (cancelled) return;
        // Any error (404, 403, network) → back to org picker; never force create wizard
        navigate('/enterprise', { replace: true });
      });

    return () => { cancelled = true; };
  }, [orgSlug, navigate]);

  // ── Loading / error states ──────────────────────────────────────────────
  if (orgLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress sx={{ color: T.brand }} />
      </Box>
    );
  }

  if (orgError || !org) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error" action={
          <Button color="inherit" size="small" onClick={() => navigate('/enterprise')}>Enterprise Home</Button>
        }>
          {orgError ?? 'Organization not found.'}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: T.bg, minHeight: '100vh', fontFamily: T.font, display: 'flex', flexDirection: 'column' }}>
      {/* Unified top bar — shown only when this page renders standalone (org section, no DashboardLayout) */}
      {section === 'organization' && (
        <DashboardTopBar
          routeBase="/dashboard"
          leftContent={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <IconButton
                size="small"
                onClick={() => navigate(`/enterprise/${orgSlug}/overview`)}
                sx={{ color: T.sub, '&:hover': { color: T.text } }}
              >
                <ArrowBackIcon sx={{ fontSize: '1.1rem' }} />
              </IconButton>
              <Typography sx={{ color: T.text, fontWeight: 600, fontSize: '.9rem' }}>
                {org?.name}
              </Typography>
              <Typography sx={{ color: T.sub, fontSize: '.8rem' }}>/ Organization</Typography>
            </Box>
          }
          actions={
            <Box sx={{ display: 'flex', gap: 1, mr: 0.5 }}>
              <Button
                size="small"
                startIcon={<SwapHorizIcon sx={{ fontSize: '.9rem' }} />}
                onClick={() => navigate('/enterprise')}
                sx={{ color: T.sub, borderColor: T.border, border: '1px solid', borderRadius: 1, px: 1.5, textTransform: 'none', fontSize: '.8rem', '&:hover': { color: T.brand, borderColor: T.brand } }}
              >Switch Org</Button>
              <Button
                size="small"
                startIcon={<AddIcon sx={{ fontSize: '.9rem' }} />}
                onClick={() => setNewOrgOpen(true)}
                sx={{ color: T.brand, borderColor: T.brand, border: '1px solid', borderRadius: 1, px: 1.5, textTransform: 'none', fontSize: '.8rem', '&:hover': { bgcolor: `${T.brand}12` } }}
              >New Org</Button>
            </Box>
          }
        />
      )}
      {/* Page Content */}
      <Box sx={{ p: { xs: 2, md: 3 }, flex: 1 }}>
        {/* Section Title */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ color: T.brand, fontSize: '1.6rem' }}>{SECTION_META[section]?.icon}</Box>
              <Typography sx={{ color: T.text, fontWeight: 800, fontSize: '1.5rem', fontFamily: T.font }}>{SECTION_META[section]?.label}</Typography>
            </Box>
          </Box>
          <Typography variant="body2" sx={{ color: T.sub }}>Manage your {SECTION_META[section]?.label?.toLowerCase() || 'organization'} settings and operations</Typography>
        </Box>

        {/* Section Content */}
        {section === 'overview' && <OverviewSection org={org} navigate={navigate} orgSlug={orgSlug} />}
        {section === 'organization' && !orgSubView && <Navigate to={`/enterprise/${orgSlug}/organization/overview`} replace />}
        {section === 'organization' && !!orgSubView && <OrganizationSection orgId={org?.id || ''} org={org} />}
        {section === 'marketing' && <MarketingSection />}
        {section === 'email' && <EmailSection />}
        {section === 'domains' && <DomainsSection />}
        {section === 'branding' && <BrandingSection />}
        {section === 'billing' && <BillingSection />}
        {section === 'compliance' && <ComplianceSection />}
        {section === 'workspace' && <WorkspaceSection />}
        {section === 'docs' && <DocsSection />}

        {/* Fallback */}
        {!SECTION_META[section] && (
          <Alert severity="info">
            Section "{section}" not found.{' '}
            <Button size="small" onClick={() => navigate(`/enterprise/${orgSlug}/overview`)}>
              Go to Overview
            </Button>
          </Alert>
        )}
      </Box>

      {/* Create new organization from within dashboard */}
      <CreateOrganizationDialog
        open={newOrgOpen}
        onSuccess={slug => { setNewOrgOpen(false); navigate(`/enterprise/${slug}/overview`, { replace: true }); }}
        onClose={() => setNewOrgOpen(false)}
      />
    </Box>
  );
};

export default EnterpriseDashboardPage;
