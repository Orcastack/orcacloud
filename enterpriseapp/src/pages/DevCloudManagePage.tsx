import React, { useState, useEffect, useMemo } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import PublicIcon from '@mui/icons-material/Public';
import LockIcon from '@mui/icons-material/Lock';
import CloudQueueIcon from '@mui/icons-material/CloudQueue';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import {
  dashboardCardSx,
  dashboardSemanticColors,
  dashboardTokens,
} from '../styles/dashboardDesignSystem';
import {
  getRegionsByType,
  getServiceCatalog,
  type CloudType,
  type RegionsByTypeResponse,
  type ServiceCatalog,
} from '../services/regionsApi';

const FONT = '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const t = dashboardTokens.colors;

const CLOUD_TYPE_CONFIG = {
  public: {
    label: 'Public Cloud',
    icon: <PublicIcon sx={{ fontSize: '1.1rem' }} />,
    color: dashboardSemanticColors.info,
    bg: 'rgba(21,61,117,.12)',
    description: 'Multi-tenant, self-service infrastructure with shared resources',
  },
  private: {
    label: 'Private Cloud',
    icon: <LockIcon sx={{ fontSize: '1.1rem' }} />,
    color: dashboardSemanticColors.purple,
    bg: 'rgba(139,92,246,.12)',
    description: 'Isolated, dedicated environments for enterprise clients',
  },
  hybrid: {
    label: 'Hybrid Cloud',
    icon: <CloudQueueIcon sx={{ fontSize: '1.1rem' }} />,
    color: dashboardSemanticColors.teal,
    bg: 'rgba(0,200,229,.12)',
    description: 'Seamless integration between on-premise and cloud workloads',
  },
};

const STATUS_CONFIG = {
  active: { label: 'Active', color: dashboardSemanticColors.success, icon: <CheckCircleIcon sx={{ fontSize: '.85rem' }} /> },
  degraded: { label: 'Degraded', color: dashboardSemanticColors.warning, icon: <WarningIcon sx={{ fontSize: '.85rem' }} /> },
  maintenance: { label: 'Maintenance', color: dashboardSemanticColors.info, icon: <WarningIcon sx={{ fontSize: '.85rem' }} /> },
  unavailable: { label: 'Unavailable', color: dashboardSemanticColors.danger, icon: <ErrorIcon sx={{ fontSize: '.85rem' }} /> },
};

const DevCloudManagePage: React.FC = () => {
  const [tab, setTab] = useState<0 | 1 | 2 | 3>(0); // 0=Overview, 1=Public, 2=Private, 3=Hybrid
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [regions, setRegions] = useState<RegionsByTypeResponse | null>(null);
  const [catalog, setCatalog] = useState<ServiceCatalog>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [regionsData, catalogData] = await Promise.all([
        getRegionsByType(),
        getServiceCatalog(),
      ]);
      setRegions(regionsData);
      setCatalog(catalogData);
    } catch (err) {
      setError('Failed to load cloud data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const summary = useMemo(() => {
    if (!regions) return { totalRegions: 0, activeRegions: 0, degradedRegions: 0, totalServices: 0 };
    const totalRegions = regions.public.total + regions.private.total + regions.hybrid.total;
    const activeRegions = regions.public.active + regions.private.active + regions.hybrid.active;
    const degradedRegions = regions.public.degraded + regions.private.degraded + regions.hybrid.degraded;
    const totalServices = (catalog.public?.length || 0) + (catalog.private?.length || 0) + (catalog.hybrid?.length || 0);
    return { totalRegions, activeRegions, degradedRegions, totalServices };
  }, [regions, catalog]);

  const renderCloudTypeSection = (cloudType: CloudType) => {
    if (!regions) return null;
    const data = regions[cloudType];
    const config = CLOUD_TYPE_CONFIG[cloudType];
    const serviceCatalog = catalog[cloudType] || [];

    return (
      <Stack spacing={2.5}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ color: config.color }}>{config.icon}</Box>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontWeight: 800, fontSize: '1.15rem', color: t.textPrimary, fontFamily: FONT }}>
              {config.label}
            </Typography>
            <Typography sx={{ fontSize: '.85rem', color: t.textSecondary, fontFamily: FONT }}>
              {config.description}
            </Typography>
          </Box>
          <Chip
            label={`${data.active} / ${data.total} Active`}
            sx={{
              bgcolor: data.active > 0 ? config.bg : 'rgba(107,114,128,.12)',
              color: data.active > 0 ? config.color : '#6B7280',
              fontWeight: 700,
            }}
          />
        </Box>

        {/* Stats Grid */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4,1fr)' }, gap: 1.5 }}>
          <Card sx={{ ...dashboardCardSx, bgcolor: 'background.paper' }}>
            <CardContent sx={{ p: 1.5 }}>
              <Typography sx={{ fontSize: '.75rem', color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                Total Regions
              </Typography>
              <Typography sx={{ fontWeight: 700, fontSize: '1.5rem', color: t.textPrimary }}>{data.total}</Typography>
            </CardContent>
          </Card>
          <Card sx={{ ...dashboardCardSx, bgcolor: 'background.paper' }}>
            <CardContent sx={{ p: 1.5 }}>
              <Typography sx={{ fontSize: '.75rem', color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                Active
              </Typography>
              <Typography sx={{ fontWeight: 700, fontSize: '1.5rem', color: dashboardSemanticColors.success }}>
                {data.active}
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ ...dashboardCardSx, bgcolor: 'background.paper' }}>
            <CardContent sx={{ p: 1.5 }}>
              <Typography sx={{ fontSize: '.75rem', color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                Degraded
              </Typography>
              <Typography sx={{ fontWeight: 700, fontSize: '1.5rem', color: data.degraded > 0 ? dashboardSemanticColors.warning : t.textSecondary }}>
                {data.degraded}
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ ...dashboardCardSx, bgcolor: 'background.paper' }}>
            <CardContent sx={{ p: 1.5 }}>
              <Typography sx={{ fontSize: '.75rem', color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                Services
              </Typography>
              <Typography sx={{ fontWeight: 700, fontSize: '1.5rem', color: t.textPrimary }}>{serviceCatalog.length}</Typography>
            </CardContent>
          </Card>
        </Box>

        {/* Regions Table */}
        <Card sx={{ ...dashboardCardSx, bgcolor: 'background.paper' }}>
          <CardContent>
            <Typography sx={{ fontWeight: 700, mb: 1.5, color: t.textPrimary }}>Regions</Typography>
            {data.regions.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography sx={{ color: t.textSecondary }}>No {cloudType} regions configured.</Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: t.surfaceSubtle }}>
                      <TableCell sx={{ color: t.textPrimary, fontWeight: 700 }}>Code</TableCell>
                      <TableCell sx={{ color: t.textPrimary, fontWeight: 700 }}>Name</TableCell>
                      <TableCell sx={{ color: t.textPrimary, fontWeight: 700 }}>Status</TableCell>
                      <TableCell sx={{ color: t.textPrimary, fontWeight: 700 }}>Uptime (30d)</TableCell>
                      <TableCell sx={{ color: t.textPrimary, fontWeight: 700 }}>Latency</TableCell>
                      <TableCell sx={{ color: t.textPrimary, fontWeight: 700 }}>Connectivity</TableCell>
                      <TableCell sx={{ color: t.textPrimary, fontWeight: 700 }}>Services</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.regions.map((region) => {
                      const statusCfg = STATUS_CONFIG[region.status];
                      return (
                        <TableRow key={region.code} hover sx={{ '&:hover': { bgcolor: t.surfaceHover } }}>
                          <TableCell sx={{ color: t.textPrimary, fontWeight: 600, fontFamily: 'monospace' }}>
                            {region.code}
                          </TableCell>
                          <TableCell sx={{ color: t.textPrimary, fontSize: '.9rem' }}>{region.name}</TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={statusCfg.label}
                              sx={{
                                bgcolor: `${statusCfg.color}20`,
                                color: statusCfg.color,
                                fontWeight: 700,
                                fontSize: '.75rem',
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ color: t.textSecondary, fontSize: '.85rem' }}>
                            {region.uptime_30d_pct.toFixed(2)}%
                          </TableCell>
                          <TableCell sx={{ color: t.textSecondary, fontSize: '.85rem' }}>
                            {region.latency_ms ? `${region.latency_ms}ms` : '—'}
                          </TableCell>
                          <TableCell sx={{ color: t.textSecondary, fontSize: '.85rem', textTransform: 'capitalize' }}>
                            {region.connectivity_type.replace('_', ' ')}
                            {region.tenant_isolation && (
                              <Chip size="small" label="Isolated" sx={{ ml: 0.5, height: 16, fontSize: '.6rem', bgcolor: config.bg, color: config.color }} />
                            )}
                          </TableCell>
                          <TableCell sx={{ color: t.textSecondary, fontSize: '.85rem' }}>
                            {region.enabled_services.length} enabled
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>

        {/* Service Catalog */}
        <Card sx={{ ...dashboardCardSx, bgcolor: 'background.paper' }}>
          <CardContent>
            <Typography sx={{ fontWeight: 700, mb: 1.5, color: t.textPrimary }}>Service Catalog</Typography>
            <Stack spacing={1}>
              {serviceCatalog.map((service) => (
                <Box
                  key={service.slug}
                  sx={{
                    p: 1.5,
                    bgcolor: t.surfaceSubtle,
                    borderRadius: 1,
                    border: `1px solid ${t.border}`,
                  }}
                >
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography sx={{ fontWeight: 700, fontSize: '.9rem', color: t.textPrimary, fontFamily: FONT }}>
                        {service.name}
                      </Typography>
                      <Typography sx={{ fontSize: '.8rem', color: t.textSecondary, fontFamily: FONT }}>
                        {service.description}
                      </Typography>
                    </Box>
                    <Chip
                      size="small"
                      label={service.slug}
                      sx={{
                        bgcolor: config.bg,
                        color: config.color,
                        fontWeight: 700,
                        fontSize: '.7rem',
                        textTransform: 'uppercase',
                        fontFamily: 'monospace',
                      }}
                    />
                  </Stack>
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    );
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: 'background.default', fontFamily: FONT, minHeight: '100vh' }}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} mb={2} gap={1}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: t.textPrimary }}>
            Cloud Management
          </Typography>
          <Typography variant="body2" sx={{ color: t.textSecondary }}>
            Multi-region OpenStack deployment: Public, Private, and Hybrid cloud enablement
          </Typography>
        </Box>
        <Button
          variant="outlined"
          onClick={() => loadData()}
          disabled={loading}
          sx={{ borderColor: t.border, color: t.textSecondary, textTransform: 'none' }}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </Stack>

      {/* Summary Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4,1fr)' }, gap: 1.5, mb: 2 }}>
        <Card sx={{ ...dashboardCardSx, bgcolor: 'background.paper' }}>
          <CardContent>
            <Typography variant="caption" sx={{ color: t.textSecondary }}>Total Regions</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: t.textPrimary }}>{summary.totalRegions}</Typography>
          </CardContent>
        </Card>
        <Card sx={{ ...dashboardCardSx, bgcolor: 'background.paper' }}>
          <CardContent>
            <Typography variant="caption" sx={{ color: t.textSecondary }}>Active</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: dashboardSemanticColors.success }}>{summary.activeRegions}</Typography>
          </CardContent>
        </Card>
        <Card sx={{ ...dashboardCardSx, bgcolor: 'background.paper' }}>
          <CardContent>
            <Typography variant="caption" sx={{ color: t.textSecondary }}>Degraded</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: summary.degradedRegions > 0 ? dashboardSemanticColors.warning : t.textSecondary }}>
              {summary.degradedRegions}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ ...dashboardCardSx, bgcolor: 'background.paper' }}>
          <CardContent>
            <Typography variant="caption" sx={{ color: t.textSecondary }}>Total Services</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: t.textPrimary }}>{summary.totalServices}</Typography>
          </CardContent>
        </Card>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Card sx={{ ...dashboardCardSx, bgcolor: 'background.paper' }}>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <CircularProgress size={32} sx={{ color: t.brandPrimary }} />
            <Typography sx={{ color: t.textSecondary, mt: 2 }}>Loading cloud infrastructure...</Typography>
          </CardContent>
        </Card>
      ) : (
        <Card sx={{ ...dashboardCardSx, bgcolor: 'background.paper' }}>
          <Tabs
            value={tab}
            onChange={(_, newValue) => setTab(newValue)}
            sx={{
              borderBottom: `1px solid ${t.border}`,
              '& .MuiTab-root': { color: t.textSecondary, textTransform: 'none', fontWeight: 600 },
              '& .Mui-selected': { color: t.brandPrimary },
            }}
          >
            <Tab label="Overview" />
            <Tab label="Public Cloud" />
            <Tab label="Private Cloud" />
            <Tab label="Hybrid Cloud" />
          </Tabs>

          <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
            {tab === 0 && (
              <Stack spacing={3}>
                <Box>
                  <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: t.textPrimary, mb: 1.5 }}>
                    OrcaCloud Architecture
                  </Typography>
                  <Typography sx={{ color: t.textSecondary, fontSize: '.9rem', mb: 2 }}>
                    Unified cloud platform supporting public multi-tenant, private dedicated, and hybrid integrated deployments across
                    {' '}{summary.totalRegions} regions with {summary.activeRegions} active.
                  </Typography>
                </Box>

                <Divider sx={{ borderColor: t.border }} />

                {/* Cloud Type Cards */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3,1fr)' }, gap: 2 }}>
                  {(['public', 'private', 'hybrid'] as CloudType[]).map((cloudType) => {
                    const config = CLOUD_TYPE_CONFIG[cloudType];
                    const data = regions?.[cloudType];
                    return (
                      <Card
                        key={cloudType}
                        sx={{
                          ...dashboardCardSx,
                          bgcolor: 'background.paper',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          '&:hover': { borderColor: config.color, transform: 'translateY(-2px)' },
                        }}
                        onClick={() => setTab(cloudType === 'public' ? 1 : cloudType === 'private' ? 2 : 3)}
                      >
                        <CardContent>
                          <Stack direction="row" alignItems="center" gap={1} mb={1}>
                            <Box sx={{ color: config.color }}>{config.icon}</Box>
                            <Typography sx={{ fontWeight: 700, fontSize: '.95rem', color: t.textPrimary }}>
                              {config.label}
                            </Typography>
                          </Stack>
                          <Typography sx={{ fontSize: '.8rem', color: t.textSecondary, mb: 1.5, minHeight: 40 }}>
                            {config.description}
                          </Typography>
                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            <Chip size="small" label={`${data?.total || 0} regions`} sx={{ bgcolor: config.bg, color: config.color, fontWeight: 700, fontSize: '.7rem' }} />
                            <Chip size="small" label={`${data?.active || 0} active`} sx={{ bgcolor: 'rgba(34,197,94,.12)', color: dashboardSemanticColors.success, fontWeight: 700, fontSize: '.7rem' }} />
                            <Chip size="small" label={`${catalog[cloudType]?.length || 0} services`} sx={{ bgcolor: t.surfaceSubtle, color: t.textSecondary, fontWeight: 700, fontSize: '.7rem' }} />
                          </Stack>
                        </CardContent>
                      </Card>
                    );
                  })}
                </Box>

                <Alert severity="info" sx={{ bgcolor: 'rgba(21,61,117,0.08)', border: `1px solid ${t.brandPrimary}33` }}>
                  <Typography sx={{ fontWeight: 700, color: t.textPrimary, mb: 0.5 }}>
                    Unified Identity & Orchestration
                  </Typography>
                  <Typography sx={{ fontSize: '.85rem', color: t.textSecondary }}>
                    All regions share Keystone for identity and RBAC with project mapping. Ceph multi-pool architecture provides
                    storage isolation, and Neutron ML2/VXLAN ensures tenant network segmentation. VPNaaS and Direct Connect enable
                    hybrid connectivity to customer datacenters.
                  </Typography>
                </Alert>
              </Stack>
            )}

            {tab === 1 && renderCloudTypeSection('public')}
            {tab === 2 && renderCloudTypeSection('private')}
            {tab === 3 && renderCloudTypeSection('hybrid')}
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default DevCloudManagePage;
