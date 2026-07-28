import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import {
  ArrowForward as ArrowForwardIcon,
  CheckCircle as CheckCircleIcon,
  Dashboard as DashboardIcon,
  Language as LanguageIcon,
  Security as SecurityIcon,
  ReceiptLong as ReceiptLongIcon,
  Dns as DnsIcon,
  AdminPanelSettings as AdminPanelSettingsIcon,
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';

import { domainApi } from '../services/cloudApi';
import type { AvailabilityResult, TldInfo } from '../types/domain';
import { useAuth } from '../contexts/AuthContext';
import { dashboardTokens } from '../styles/dashboardDesignSystem';

const POPULAR_TLDS = ['com', 'net', 'org', 'io', 'cloud', 'ai'];

const DomainsLandingPage: React.FC = () => {
  const { user } = useAuth() as any;

  const [query, setQuery] = useState('');
  const [checking, setChecking] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [searchResult, setSearchResult] = useState<AvailabilityResult | null>(null);

  const [catalogueLoading, setCatalogueLoading] = useState(true);
  const [catalogue, setCatalogue] = useState<TldInfo[]>([]);

  useEffect(() => {
    let alive = true;
    domainApi
      .tldCatalogue()
      .then((response) => {
        if (!alive) return;
        const list = Array.isArray(response.data) ? response.data : [];
        setCatalogue(list);
      })
      .catch(() => {
        if (!alive) return;
        setCatalogue([]);
      })
      .finally(() => {
        if (!alive) return;
        setCatalogueLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const handleSearch = async () => {
    const normalized = query.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0].split('.')[0];
    if (!normalized) return;

    setChecking(true);
    setSearchError('');
    setSearchResult(null);

    try {
      const response = await domainApi.checkAvailability(normalized, POPULAR_TLDS);
      setSearchResult(response.data);
    } catch {
      setSearchError('Unable to check availability right now. Please try again.');
    } finally {
      setChecking(false);
    }
  };

  const pricingRows = useMemo(() => {
    const sorted = [...catalogue].sort((a, b) => Number(b.popular) - Number(a.popular));
    return sorted.slice(0, 12);
  }, [catalogue]);

  return (
    <Box sx={{ bgcolor: dashboardTokens.colors.surface }}>
      <Box
        sx={{
          background: 'linear-gradient(160deg, #111827 0%, #101B34 60%, #111827 100%)',
          borderBottom: `1px solid ${dashboardTokens.colors.border}`,
          color: dashboardTokens.colors.white,
          py: { xs: 8, md: 10 },
        }}
      >
        <Container maxWidth="lg">
          <Stack spacing={3}>
            <Chip label="OrcaCloud Domains" sx={{ alignSelf: 'flex-start', bgcolor: 'rgba(21,61,117,.12)', color: '#153d75', borderRadius: '2px' }} />
            <Typography component="h1" sx={{ fontWeight: 700, fontSize: { xs: '2rem', md: '3rem' }, lineHeight: 1.05, letterSpacing: '-.03em', maxWidth: 900 }}>
              Domain platform with full lifecycle, DNS, SSL, billing, and operational dashboards.
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,.82)', maxWidth: 860, fontSize: { xs: '1rem', md: '1.08rem' } }}>
              Search, buy, and manage domains from one modern control surface. OrcaCloud Domains runs as a complete product area under your OrcaCloud platform.
            </Typography>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 1 }}>
              <TextField
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search domain name (e.g. mybrand)"
                size="small"
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleSearch();
                }}
                sx={{
                  width: { xs: '100%', sm: 360 },
                  '& .MuiOutlinedInput-root': {
                    bgcolor: '#FFFFFF',
                    borderRadius: '2px',
                    '& fieldset': { borderColor: '#D1D5DB' },
                  },
                }}
              />
              <Button
                variant="contained"
                onClick={handleSearch}
                disabled={checking}
                endIcon={checking ? <CircularProgress size={16} color="inherit" /> : <ArrowForwardIcon />}
                sx={{ bgcolor: '#153d75', color: '#FFFFFF', borderRadius: '2px', fontWeight: 700, '&:hover': { bgcolor: '#0f2d5a' } }}
              >
                Check Availability
              </Button>
              <Button
                component={RouterLink}
                to="/domains/dashboard"
                variant="outlined"
                sx={{ borderRadius: '2px', borderColor: '#153d75', color: '#153d75' }}
              >
                Open Dashboard
              </Button>
            </Stack>

            {searchError && <Alert severity="error" sx={{ borderRadius: '2px' }}>{searchError}</Alert>}

            {searchResult && (
              <Card sx={{ borderRadius: '4px', border: `1px solid ${dashboardTokens.colors.borderStrong}` }}>
                <CardContent>
                  <Typography sx={{ fontWeight: 700, color: dashboardTokens.colors.textPrimary, mb: 1 }}>
                    Availability for {searchResult.domain_name}
                  </Typography>
                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                    {(searchResult.results || []).map((item) => (
                      <Chip
                        key={`${item.domain}-${item.tld}`}
                        label={`${item.domain} • ${item.status}${item.price ? ` • $${item.price}` : ''}`}
                        color={item.status === 'available' ? 'success' : item.status === 'unavailable' ? 'default' : 'warning'}
                        variant={item.status === 'available' ? 'filled' : 'outlined'}
                        sx={{ borderRadius: '2px' }}
                      />
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            )}
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 8 } }}>
        <Stack spacing={5}>
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: { xs: '1.6rem', md: '2rem' }, color: dashboardTokens.colors.textPrimary }}>
              Product definition
            </Typography>
            <Typography sx={{ mt: 1.5, color: dashboardTokens.colors.textSecondary }}>
              OrcaCloud Domains is a full self-service domain platform: availability search, registration, renewals, DNS management, SSL lifecycle, billing, notifications, and role-based operations in a dedicated dashboard.
            </Typography>
          </Box>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            {[
              { title: 'Domain Lifecycle', text: 'Search, register, renew, transfer (phase 2), ownership status tracking.', icon: <LanguageIcon /> },
              { title: 'DNS Control', text: 'A, AAAA, CNAME, MX, TXT, SRV, NS, CAA with TTL and templates.', icon: <DnsIcon /> },
              { title: 'SSL & Security', text: 'Certificate request/renewal, status tracking, HTTPS posture controls.', icon: <SecurityIcon /> },
              { title: 'Billing & Renewals', text: 'Invoices, payment history, auto-renew settings, per-TLD pricing.', icon: <ReceiptLongIcon /> },
            ].map((item) => (
              <Card key={item.title} sx={{ flex: 1, borderRadius: '4px', border: `1px solid ${dashboardTokens.colors.border}` }}>
                <CardContent>
                  <Stack direction="row" spacing={1.25} alignItems="center">
                    <Box sx={{ color: '#153d75' }}>{item.icon}</Box>
                    <Typography sx={{ fontWeight: 700 }}>{item.title}</Typography>
                  </Stack>
                  <Typography sx={{ mt: 1.25, color: dashboardTokens.colors.textSecondary, fontSize: '.92rem' }}>{item.text}</Typography>
                </CardContent>
              </Card>
            ))}
          </Stack>

          <Divider />

          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: { xs: '1.35rem', md: '1.6rem' }, mb: 1.5 }}>
              Dashboard architecture
            </Typography>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <Card sx={{ flex: 1, borderRadius: '4px', border: `1px solid ${dashboardTokens.colors.border}` }}>
                <CardContent>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <DashboardIcon fontSize="small" sx={{ color: '#153d75' }} />
                    <Typography sx={{ fontWeight: 700 }}>User Dashboard</Typography>
                  </Stack>
                  {[
                    'Owned domains overview and status indicators',
                    'Quick actions: renew, DNS, SSL, attach service',
                    'Notifications: expiry, payment failures, DNS issues',
                    'Domain detail tabs: Overview, DNS, SSL, Billing',
                  ].map((line) => (
                    <Stack key={line} direction="row" spacing={1} alignItems="center" sx={{ mt: .75 }}>
                      <CheckCircleIcon sx={{ fontSize: 16, color: '#22C55E' }} />
                      <Typography sx={{ fontSize: '.9rem', color: dashboardTokens.colors.textSecondary }}>{line}</Typography>
                    </Stack>
                  ))}
                </CardContent>
              </Card>

              <Card sx={{ flex: 1, borderRadius: '4px', border: `1px solid ${dashboardTokens.colors.border}` }}>
                <CardContent>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <AdminPanelSettingsIcon fontSize="small" sx={{ color: '#153d75' }} />
                    <Typography sx={{ fontWeight: 700 }}>Admin Console</Typography>
                  </Stack>
                  {[
                    'Users and domains inventory with status filtering',
                    'TLD pricing controls and operational overrides',
                    'System metrics: registrations, failures, revenue',
                    'Role protected controls for internal staff only',
                  ].map((line) => (
                    <Stack key={line} direction="row" spacing={1} alignItems="center" sx={{ mt: .75 }}>
                      <CheckCircleIcon sx={{ fontSize: 16, color: '#22C55E' }} />
                      <Typography sx={{ fontSize: '.9rem', color: dashboardTokens.colors.textSecondary }}>{line}</Typography>
                    </Stack>
                  ))}
                </CardContent>
              </Card>
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 2 }}>
              <Button component={RouterLink} to="/domains/dashboard" variant="contained" sx={{ borderRadius: '2px', bgcolor: '#153d75', '&:hover': { bgcolor: '#0f2d5a' } }}>
                Launch Domain Operations
              </Button>
              {!user && (
                <Button component={RouterLink} to="/" variant="outlined" sx={{ borderRadius: '2px' }}>
                  Sign in to manage domains
                </Button>
              )}
            </Stack>
          </Box>

          <Divider />

          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: { xs: '1.35rem', md: '1.6rem' }, mb: 1.5 }}>
              Pricing (TLD catalogue)
            </Typography>
            {catalogueLoading ? (
              <CircularProgress size={22} />
            ) : (
              <Table size="small" sx={{ border: `1px solid ${dashboardTokens.colors.border}` }}>
                <TableHead>
                  <TableRow>
                    <TableCell>TLD</TableCell>
                    <TableCell>Register</TableCell>
                    <TableCell>Renew</TableCell>
                    <TableCell>Tier</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pricingRows.map((tld) => (
                    <TableRow key={tld.tld} hover>
                      <TableCell sx={{ fontWeight: 700 }}>.{tld.tld}</TableCell>
                      <TableCell>${tld.register_price}</TableCell>
                      <TableCell>${tld.renew_price}</TableCell>
                      <TableCell>{tld.popular ? <Chip label="Popular" size="small" color="info" sx={{ borderRadius: '2px' }} /> : 'Standard'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Box>

          <Divider />

          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: { xs: '1.35rem', md: '1.6rem' }, mb: 1.25 }}>
              FAQ
            </Typography>
            <Stack spacing={1.5}>
              {[
                {
                  q: 'Can I run this in MVP mode without a real registrar?',
                  a: 'Yes. OrcaCloud Domains supports internal simulation mode for demo/testing and can later switch to real registrar integration via service abstraction.',
                },
                {
                  q: 'Do users manage only their own domains?',
                  a: 'Yes. Ownership checks apply to all domain, DNS, SSL, and billing actions. Admin-only endpoints are role-protected.',
                },
                {
                  q: 'How are renewals and reminders handled?',
                  a: 'Background jobs process auto-renew attempts, invoice creation, and notifications for upcoming expiry and payment failures.',
                },
              ].map((item) => (
                <Card key={item.q} sx={{ borderRadius: '4px', border: `1px solid ${dashboardTokens.colors.border}` }}>
                  <CardContent>
                    <Typography sx={{ fontWeight: 700 }}>{item.q}</Typography>
                    <Typography sx={{ mt: .75, color: dashboardTokens.colors.textSecondary }}>{item.a}</Typography>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
};

export default DomainsLandingPage;
