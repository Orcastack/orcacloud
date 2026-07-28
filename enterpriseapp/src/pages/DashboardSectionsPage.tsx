import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Card,
  CardActionArea,

  Chip,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import QueryStatsIcon from '@mui/icons-material/QueryStats';
import ComputerIcon from '@mui/icons-material/Computer';
import StorageIcon from '@mui/icons-material/Storage';
import RouterIcon from '@mui/icons-material/RouterRounded';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import CampaignIcon from '@mui/icons-material/Campaign';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { useNavigate } from 'react-router-dom';
import { dashboardTokens, dashboardSemanticColors } from '../styles/dashboardDesignSystem';

// ── Types ─────────────────────────────────────────────────────────────────────

type DashboardMode = 'cloud' | 'sections' | 'developer' | 'marketing' | 'domains' | 'monitor';

interface SectionItem {
  label: string;
  route: string;
  description?: string;
}

interface SectionGroup {
  id: string;
  category: string;
  icon: React.ReactNode;
  color: string;
  items: SectionItem[];
}

interface DashboardSectionsPageProps {
  dashboardMode?: DashboardMode;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const FONT = '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const ACCENT = dashboardTokens.colors.brandPrimary;

const ICON_SZ = { fontSize: '1rem' };

const SECTION_GROUPS: SectionGroup[] = [
  {
    id: 'observability',
    category: 'Observability & Incidents',
    icon: <QueryStatsIcon sx={ICON_SZ} />,
    color: dashboardSemanticColors.info,
    items: [
      { label: 'Alert Rules',  route: '/monitor-dashboard/alerts',    description: 'Define thresholds and trigger conditions' },
      { label: 'Alerts',       route: '/monitor-dashboard/alerts',    description: 'Active and historical alert events' },
      { label: 'Incidents',    route: '/monitor-dashboard/incidents', description: 'Incident tracking and postmortems' },
      { label: 'Logs',         route: '/monitor-dashboard/logs',      description: 'Structured log streams and search' },
      { label: 'Metrics',      route: '/monitor-dashboard/metrics',   description: 'Time-series metrics and dashboards' },
      { label: 'Monitoring',   route: '/monitor-dashboard/overview',  description: 'Service health and uptime overview' },
    ],
  },
  {
    id: 'compute',
    category: 'Compute & Runtime',
    icon: <ComputerIcon sx={ICON_SZ} />,
    color: dashboardSemanticColors.purple,
    items: [
      { label: 'Auto Scaling Groups',  route: '/products/Dashboard/autoscaling',    description: 'Horizontal scaling policies' },
      { label: 'Flavors',              route: '/products/Dashboard/compute',    description: 'Instance size configurations' },
      { label: 'Images',               route: '/products/Dashboard/compute',    description: 'OS and machine images' },
      { label: 'Instances',            route: '/products/Dashboard/compute',    description: 'Virtual machine management' },
      { label: 'Kubernetes Clusters',  route: '/products/Dashboard/kubernetes', description: 'Managed Kubernetes orchestration' },
      { label: 'Serverless Functions', route: '/products/Dashboard/serverless', description: 'Event-driven function runtime' },
      { label: 'Snapshots',            route: '/products/Dashboard/snapshots',    description: 'Point-in-time volume snapshots' },
    ],
  },
  {
    id: 'storage',
    category: 'Storage & Data',
    icon: <StorageIcon sx={ICON_SZ} />,
    color: dashboardSemanticColors.warning,
    items: [
      { label: 'Backup Policies', route: '/products/Dashboard/storage',   description: 'Scheduled backup rules' },
      { label: 'Backups',         route: '/products/Dashboard/storage',   description: 'Restore points and archives' },
      { label: 'Buckets',         route: '/products/Dashboard/storage',   description: 'Object storage containers' },
      { label: 'Databases',       route: '/products/Dashboard/databases', description: 'Managed relational and NoSQL' },
      { label: 'File Shares',     route: '/products/Dashboard/storage',   description: 'NFS and SMB file systems' },
      { label: 'S3 Objects',      route: '/products/Dashboard/storage',   description: 'S3-compatible object store' },
      { label: 'Volumes',         route: '/products/Dashboard/storage',   description: 'Block storage volumes' },
    ],
  },
  {
    id: 'network',
    category: 'Network & Security',
    icon: <RouterIcon sx={ICON_SZ} />,
    color: dashboardSemanticColors.success,
    items: [
      { label: 'Cdn Distributions', route: '/products/Dashboard/cdn',            description: 'Global content delivery' },
      { label: 'Dns Records',       route: '/domains/Dashboard/dns',        description: 'DNS zone management' },
      { label: 'Encryption Keys',   route: '/compliance/Dashboard',       description: 'KMS and key lifecycle' },
      { label: 'Internet Gateways', route: '/products/Dashboard/network',        description: 'VPC internet access' },
      { label: 'Load Balancers',    route: '/products/Dashboard/load-balancers', description: 'Layer 4 / 7 traffic routing' },
      { label: 'Nat Gateways',      route: '/products/Dashboard/network',        description: 'Outbound NAT for private subnets' },
      { label: 'Route Tables',      route: '/products/Dashboard/network',        description: 'VPC routing rules' },
      { label: 'Security Groups',   route: '/products/Dashboard/network',        description: 'Stateful firewall rules' },
      { label: 'Ssl Certificates',  route: '/domains/Dashboard',        description: 'TLS certificate management' },
      { label: 'Subnets',           route: '/products/Dashboard/network',        description: 'IP address segmentation' },
      { label: 'Target Groups',     route: '/products/Dashboard/load-balancers', description: 'Load balancer backends' },
      { label: 'Vpcs',              route: '/products/Dashboard/network',        description: 'Virtual private cloud networks' },
      { label: 'Vpn Connections',   route: '/products/Dashboard/network',        description: 'Site-to-site encrypted tunnels' },
      { label: 'Vpn Gateways',      route: '/products/Dashboard/network',        description: 'VPN endpoint management' },
    ],
  },
  {
    id: 'platform',
    category: 'Platform & Automation',
    icon: <AccountTreeIcon sx={ICON_SZ} />,
    color: dashboardSemanticColors.orange,
    items: [
      { label: 'Automations',  route: '/products/Dashboard/orchestration', description: 'Workflow and event automation' },
      { label: 'Cloud',        route: '/cloud',               description: 'Cloud provider overview' },
      { label: 'Compliance',   route: '/compliance/Dashboard',      description: 'Policy and audit controls' },
      { label: 'Onboarding',   route: '/cloud',               description: 'Setup guides and wizards' },
      { label: 'Orchestration',route: '/products/Dashboard/orchestration', description: 'Pipeline and job orchestration' },
      { label: 'Registries',   route: '/products/Dashboard/containers',    description: 'Container image registries' },
    ],
  },
  {
    id: 'business',
    category: 'Business & Engagement',
    icon: <CampaignIcon sx={ICON_SZ} />,
    color: dashboardSemanticColors.pink,
    items: [
      { label: 'Billing',          route: '/billing/Dashboard',                           description: 'Invoices and payment methods' },
      { label: 'Campaigns',        route: '/marketing-dashboard/campaigns',               description: 'Email and ad campaign management' },
      { label: 'Contact Lists',    route: '/marketing-dashboard/audience-segmentation',   description: 'Subscriber list management' },
      { label: 'Contacts',         route: '/marketing-dashboard/audience-segmentation',   description: 'CRM contact records' },
      { label: 'Domains',          route: '/dashboard/domains',                           description: 'Domain registration and DNS' },
      { label: 'Email Aliases',    route: '/domains/dashboard',                           description: 'Custom email forwarding' },
      { label: 'Email Domains',    route: '/domains/dashboard',                           description: 'Verified sender domains' },
      { label: 'Email Templates',  route: '/marketing-dashboard/campaigns',               description: 'Reusable HTML email templates' },
      { label: 'Mailboxes',        route: '/domains/dashboard',                           description: 'Hosted mailbox management' },
      { label: 'Marketing',        route: '/marketing-dashboard/analytics',               description: 'Campaign analytics and ROI' },
    ],
  },
];

// ── Category nav sidebar ───────────────────────────────────────────────────────

interface CategoryNavProps {
  groups: SectionGroup[];
  activeId: string;
  onSelect: (id: string) => void;
}

const CategoryNav: React.FC<CategoryNavProps> = ({ groups, activeId, onSelect }) => {
  const t = dashboardTokens.colors;
  return (
    <Box
      sx={{
        width: 220,
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        alignSelf: 'flex-start',
        height: 'fit-content',
        pr: 1,
        display: { xs: 'none', md: 'block' },
      }}
    >
      <Typography
        sx={{
          fontSize: '.6rem',
          fontWeight: 700,
          letterSpacing: '.1em',
          textTransform: 'uppercase',
          color: t.textSecondary,
          mb: 1.5,
          px: 1,
          fontFamily: FONT,
        }}
      >
        Categories
      </Typography>
      <Stack spacing={0.25}>
        {groups.map((g) => {
          const isActive = activeId === g.id;
          return (
            <Box
              key={g.id}
              onClick={() => onSelect(g.id)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 1,
                py: 0.75,
                borderRadius: '6px',
                cursor: 'pointer',
                borderLeft: `3px solid ${isActive ? g.color : 'transparent'}`,
                bgcolor: isActive ? `${g.color}18` : 'transparent',
                transition: 'all .12s',
                '&:hover': {
                  bgcolor: isActive ? `${g.color}22` : `${g.color}0e`,
                  borderColor: g.color,
                },
              }}
            >
              <Box sx={{ color: isActive ? g.color : t.textSecondary, display: 'flex', flexShrink: 0 }}>
                {g.icon}
              </Box>
              <Typography
                sx={{
                  fontSize: '.82rem',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? t.textPrimary : t.textSecondary,
                  lineHeight: 1.25,
                  fontFamily: FONT,
                }}
              >
                {g.category}
              </Typography>
              <Chip
                label={g.items.length}
                size="small"
                sx={{
                  ml: 'auto',
                  height: 16,
                  fontSize: '.6rem',
                  fontWeight: 700,
                  bgcolor: isActive ? `${g.color}28` : `${t.border}`,
                  color: isActive ? g.color : t.textSecondary,
                  '& .MuiChip-label': { px: 0.75 },
                }}
              />
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
};

// ── Section item card ─────────────────────────────────────────────────────────

interface SectionCardProps {
  item: SectionItem;
  color: string;
}

const SectionCard: React.FC<SectionCardProps> = ({ item, color }) => {
  const navigate = useNavigate();
  const t = dashboardTokens.colors;

  return (
    <Tooltip title={item.description ?? ''} placement="top" arrow>
      <Card
        sx={{
          border: `1px solid ${t.border}`,
          bgcolor: t.surfaceSubtle,
          boxShadow: 'none',
          borderRadius: '8px',
          transition: 'all .14s',
          '&:hover': {
            bgcolor: t.surfaceHover,
            borderColor: color,
            boxShadow: `0 0 0 1px ${color}44`,
            transform: 'translateY(-1px)',
          },
        }}
      >
        <CardActionArea
          onClick={() => navigate(item.route)}
          sx={{ px: 1.5, py: 1.1, display: 'flex', alignItems: 'center', gap: 1 }}
        >
          <CheckCircleOutlineIcon sx={{ fontSize: '.85rem', color, flexShrink: 0, opacity: 0.7 }} />
          <Typography
            sx={{
              flex: 1,
              fontSize: '.875rem',
              fontWeight: 500,
              color: t.textPrimary,
              lineHeight: 1.3,
              fontFamily: FONT,
            }}
          >
            {item.label}
          </Typography>
          <ArrowForwardIosIcon sx={{ fontSize: '.65rem', color: t.textSecondary, flexShrink: 0, opacity: 0.5 }} />
        </CardActionArea>
      </Card>
    </Tooltip>
  );
};

// ── Group section ─────────────────────────────────────────────────────────────

interface GroupSectionProps {
  group: SectionGroup;
  groupRef: (el: HTMLElement | null) => void;
}

const GroupSection: React.FC<GroupSectionProps> = ({ group, groupRef }) => {
  const t = dashboardTokens.colors;
  return (
    <Box
      ref={groupRef}
      id={`section-${group.id}`}
      sx={{ scrollMarginTop: '8px' }}
    >
      {/* Category header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          mb: 1.5,
          pb: 1,
          borderBottom: `1px solid ${t.border}`,
        }}
      >
        <Box
          sx={{
            width: 28,
            height: 28,
            borderRadius: '6px',
            bgcolor: `${group.color}22`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: group.color,
            flexShrink: 0,
          }}
        >
          {group.icon}
        </Box>
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: { xs: '.95rem', md: '1.05rem' },
            color: t.textPrimary,
            fontFamily: FONT,
            flex: 1,
          }}
        >
          {group.category}
        </Typography>
        <Chip
          label={`${group.items.length} sections`}
          size="small"
          sx={{
            height: 18,
            fontSize: '.62rem',
            fontWeight: 700,
            bgcolor: `${group.color}18`,
            color: group.color,
            '& .MuiChip-label': { px: 0.75 },
          }}
        />
      </Box>

      {/* Items grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: '1fr 1fr',
            md: '1fr 1fr',
            lg: '1fr 1fr 1fr',
          },
          gap: 1,
          mb: 3.5,
        }}
      >
        {group.items.map((item) => (
          <SectionCard key={item.label} item={item} color={group.color} />
        ))}
      </Box>
    </Box>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────

const DashboardSectionsPage: React.FC<DashboardSectionsPageProps> = ({ dashboardMode: _dashboardMode = 'cloud' }) => {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>(SECTION_GROUPS[0].id);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const t = dashboardTokens.colors;

  // Scroll-to-section when user clicks category nav
  const handleCategorySelect = useCallback((id: string) => {
    setActiveCategory(id);
    const el = sectionRefs.current[id];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // Track active category on scroll via IntersectionObserver
  useEffect(() => {
    const ids = SECTION_GROUPS.map((g) => g.id);
    const observers: IntersectionObserver[] = [];
    ids.forEach((id) => {
      const el = sectionRefs.current[id];
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveCategory(id);
        },
        { threshold: 0.25 },
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  const filteredGroups = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return SECTION_GROUPS;
    return SECTION_GROUPS
      .map((g) => ({
        ...g,
        items: g.items.filter((item) => item.label.toLowerCase().includes(term)),
      }))
      .filter((g) => g.items.length > 0);
  }, [query]);

  const totalVisible = filteredGroups.reduce((sum, g) => sum + g.items.length, 0);
  const isSearching = query.trim().length > 0;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: t.background }}>
      {/* ── Page header ── */}
      <Box
        sx={{
          borderBottom: `1px solid ${t.border}`,
          bgcolor: t.background,
          px: { xs: 2, md: 4 },
          py: { xs: 2, md: 2.5 },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5 }}>
          <Chip
            label={`${totalVisible} section${totalVisible === 1 ? '' : 's'}`}
            sx={{
              bgcolor: 'rgba(21,61,117,0.12)',
              color: ACCENT,
              fontWeight: 700,
              fontSize: '.75rem',
              height: 26,
              borderRadius: '6px',
              border: `1px solid rgba(21,61,117,0.22)`,
              '& .MuiChip-label': { px: 1.25 },
            }}
          />
        </Box>

        {/* Search bar */}
        <Box sx={{ mt: 2 }}>
          <TextField
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search sections (e.g. Vpcs, Billing, Alerts)"
            size="small"
            fullWidth
            sx={{
              maxWidth: 520,
              '& .MuiOutlinedInput-root': {
                bgcolor: t.surface,
                color: t.textPrimary,
                borderRadius: '8px',
                fontSize: '.875rem',
                '& fieldset': { borderColor: t.border },
                '&:hover fieldset': { borderColor: t.borderStrong },
                '&.Mui-focused fieldset': { borderColor: ACCENT, boxShadow: `0 0 0 3px rgba(21,61,117,0.14)` },
              },
              '& .MuiInputBase-input::placeholder': { color: t.textSecondary, opacity: 1 },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: t.textSecondary, fontSize: '1rem' }} />
                </InputAdornment>
              ),
            }}
          />
        </Box>
      </Box>

      {/* ── Body: sidebar + content ── */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: { md: 3 },
          px: { xs: 2, md: 4 },
          pt: { xs: 2, md: 2.5 },
          pb: { xs: 3, md: 4 },
          maxWidth: 1400,
          mx: 'auto',
        }}
      >
        {/* Category sidebar — hidden during search */}
        {!isSearching && (
          <CategoryNav
            groups={SECTION_GROUPS}
            activeId={activeCategory}
            onSelect={handleCategorySelect}
          />
        )}

        {/* Section list */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {filteredGroups.length > 0 ? (
            filteredGroups.map((group) => (
              <GroupSection
                key={group.id}
                group={group}
                groupRef={(el) => { sectionRefs.current[group.id] = el; }}
              />
            ))
          ) : (
            <Box
              sx={{
                border: `1px dashed ${t.border}`,
                borderRadius: '10px',
                p: 4,
                textAlign: 'center',
              }}
            >
              <Typography sx={{ color: t.textSecondary, fontWeight: 500, fontFamily: FONT }}>
                No sections match your search.
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default DashboardSectionsPage;
