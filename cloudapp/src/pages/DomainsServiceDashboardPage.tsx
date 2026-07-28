import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { billingApi, domainApi } from '../services/cloudApi';
import DomainPage from './DomainPage';
import { dashboardTokens, dashboardSemanticColors } from '../styles/dashboardDesignSystem';
import type { Domain } from '../types/domain';
import type { Invoice } from '../types/billing';

type AdminSummary = {
  total_domains: number;
  total_users: number;
  status_counts: Record<string, number>;
  top_tlds: Array<{ tld: string; count: number }>;
};

type AdminDomain = {
  resource_id: string;
  domain_name: string;
  status: string;
  tld: string;
  owner_username: string | null;
  expires_at: string | null;
  auto_renew: boolean;
};

type AdminUser = {
  id: number;
  username: string;
  email: string;
  is_staff: boolean;
  is_active: boolean;
  domains_count: number;
};

const statusColor = (status: string) => {
  switch (status) {
    case 'active': return dashboardSemanticColors.success;
    case 'pending':
    case 'transferring': return dashboardSemanticColors.warning;
    case 'expired':
    case 'failed':
    case 'error': return dashboardSemanticColors.danger;
    default: return dashboardTokens.colors.textSecondary;
  }
};

const DomainsServiceDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);

  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState('');
  const [userDomains, setUserDomains] = useState<Domain[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [renewingDomainId, setRenewingDomainId] = useState<string | null>(null);
  const [payingInvoiceId, setPayingInvoiceId] = useState<number | null>(null);
  const [domainFilter, setDomainFilter] = useState('all');
  const [domainFilterLoading, setDomainFilterLoading] = useState(false);
  const [domainScopedInvoices, setDomainScopedInvoices] = useState<Invoice[] | null>(null);
  const [renewPriceByTld, setRenewPriceByTld] = useState<Record<string, number>>({});

  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [adminDomains, setAdminDomains] = useState<AdminDomain[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);

  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideDomain, setOverrideDomain] = useState<AdminDomain | null>(null);
  const [overrideStatus, setOverrideStatus] = useState('active');
  const [overrideSaving, setOverrideSaving] = useState(false);

  const loadAdmin = async () => {
    setAdminLoading(true);
    setAdminError('');
    try {
      const [summaryRes, domainsRes, usersRes] = await Promise.all([
        domainApi.adminSummary(),
        domainApi.adminDomains(),
        domainApi.adminUsers(),
      ]);
      setSummary(summaryRes.data as AdminSummary);
      setAdminDomains(Array.isArray(domainsRes.data) ? domainsRes.data as AdminDomain[] : []);
      setAdminUsers(Array.isArray(usersRes.data) ? usersRes.data as AdminUser[] : []);
    } catch {
      setAdminError('Admin console unavailable for this account. Requires admin privileges.');
      setSummary(null);
      setAdminDomains([]);
      setAdminUsers([]);
    } finally {
      setAdminLoading(false);
    }
  };

  const loadBilling = async () => {
    setBillingLoading(true);
    setBillingError('');
    try {
      const [domainsRes, invoicesRes, tldRes] = await Promise.all([
        domainApi.list(),
        billingApi.listInvoices(),
        domainApi.tldCatalogue(),
      ]);

      const domains = Array.isArray(domainsRes.data)
        ? (domainsRes.data as Domain[])
        : (((domainsRes.data as any)?.results || []) as Domain[]);

      const invoiceRows = Array.isArray(invoicesRes.data)
        ? (invoicesRes.data as Invoice[])
        : (((invoicesRes.data as any)?.results || []) as Invoice[]);

      const prices = (Array.isArray(tldRes.data) ? tldRes.data : []).reduce<Record<string, number>>((acc, row: any) => {
        const key = String(row.tld || '').toLowerCase();
        if (!key) return acc;
        acc[key] = Number(row.renew_price || 0);
        return acc;
      }, {});

      setUserDomains(domains);
      setInvoices(invoiceRows);
      setDomainScopedInvoices(null);
      setRenewPriceByTld(prices);
    } catch {
      setBillingError('Unable to load domain billing center right now.');
      setUserDomains([]);
      setInvoices([]);
    } finally {
      setBillingLoading(false);
    }
  };

  useEffect(() => {
    if (tab !== 2) return;
    loadAdmin();
  }, [tab]);

  useEffect(() => {
    if (tab !== 1) return;
    loadBilling();
  }, [tab]);

  useEffect(() => {
    if (tab !== 1) return;
    if (domainFilter === 'all') {
      setDomainScopedInvoices(null);
      return;
    }

    let alive = true;
    setDomainFilterLoading(true);
    domainApi.billing(domainFilter)
      .then((response) => {
        if (!alive) return;
        const rows = Array.isArray(response.data)
          ? (response.data as Invoice[])
          : (((response.data as any)?.results || []) as Invoice[]);
        setDomainScopedInvoices(rows);
      })
      .catch(() => {
        if (!alive) return;
        setDomainScopedInvoices([]);
      })
      .finally(() => {
        if (!alive) return;
        setDomainFilterLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [tab, domainFilter]);

  const statusRows = useMemo(() => {
    if (!summary?.status_counts) return [];
    return Object.entries(summary.status_counts).sort((a, b) => b[1] - a[1]);
  }, [summary]);

  const submitOverride = async () => {
    if (!overrideDomain) return;
    setOverrideSaving(true);
    try {
      await domainApi.adminForceStatus(overrideDomain.resource_id, overrideStatus);
      setOverrideOpen(false);
      setOverrideDomain(null);
      await loadAdmin();
    } catch {
      setAdminError('Unable to apply status override.');
    } finally {
      setOverrideSaving(false);
    }
  };

  const renewDomain = async (domain: Domain) => {
    setRenewingDomainId(domain.resource_id);
    try {
      await domainApi.renew(domain.resource_id, 1);
      await loadBilling();
    } catch {
      setBillingError(`Renewal failed for ${domain.domain_name}.`);
    } finally {
      setRenewingDomainId(null);
    }
  };

  const openInvoice = async (invoice: Invoice) => {
    try {
      const response = await billingApi.getInvoice(invoice.id);
      setSelectedInvoice(response.data as Invoice);
    } catch {
      setSelectedInvoice(invoice);
    }
  };

  const payInvoice = async (invoiceId: number) => {
    setPayingInvoiceId(invoiceId);
    try {
      await billingApi.payInvoice(invoiceId);
      await loadBilling();
      if (selectedInvoice?.id === invoiceId) {
        const response = await billingApi.getInvoice(invoiceId);
        setSelectedInvoice(response.data as Invoice);
      }
    } catch {
      setBillingError('Payment attempt failed.');
    } finally {
      setPayingInvoiceId(null);
    }
  };

  const expiringDomains = useMemo(() => {
    return [...userDomains]
      .filter((d) => d.days_until_expiry !== null && d.days_until_expiry !== undefined)
      .filter((d) => (d.days_until_expiry as number) <= 60)
      .sort((a, b) => (a.days_until_expiry ?? 9999) - (b.days_until_expiry ?? 9999));
  }, [userDomains]);

  const openInvoices = useMemo(() => invoices.filter((inv) => inv.status === 'open'), [invoices]);

  const openBalance = useMemo(
    () => openInvoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0),
    [openInvoices],
  );

  const filteredInvoices = useMemo(() => {
    if (domainFilter === 'all') return invoices;
    if (domainScopedInvoices) return domainScopedInvoices;
    const selected = userDomains.find((d) => d.resource_id === domainFilter);
    if (!selected) return invoices;
    const domainName = selected.domain_name.toLowerCase();
    const domainResourceId = selected.resource_id.toLowerCase();
    return invoices.filter((inv) => {
      if (!inv.line_items?.length) return false;
      return inv.line_items.some((item) => {
        const resource = String(item.resource_id || '').toLowerCase();
        const description = String(item.description || '').toLowerCase();
        return (
          resource === domainResourceId ||
          resource.includes(domainName) ||
          description.includes(domainName)
        );
      });
    });
  }, [domainFilter, domainScopedInvoices, invoices, userDomains]);

  return (
    <Box sx={{ bgcolor: dashboardTokens.colors.background, minHeight: '100%', p: { xs: 1.5, md: 2.5 } }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: dashboardTokens.colors.textPrimary }}>
          OrcaCloud Domains Service Dashboard
        </Typography>
        <Typography sx={{ color: dashboardTokens.colors.textSecondary, mt: 0.5 }}>
          Full domain operations inside your cloud: lifecycle, DNS, SSL, billing posture, and admin controls.
        </Typography>
      </Box>

      <Tabs
        value={tab}
        onChange={(_, value) => setTab(value)}
        sx={{
          mb: 2,
          borderBottom: `1px solid ${dashboardTokens.colors.border}`,
          '& .MuiTab-root': { textTransform: 'none', fontWeight: 600 },
        }}
      >
        <Tab label="Domain Operations" />
        <Tab label="Domain Billing Center" />
        <Tab label="Domain Admin Console" />
      </Tabs>

      {tab === 0 && (
        <Box>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
            <Typography sx={{ color: dashboardTokens.colors.textSecondary, fontSize: '.88rem' }}>
              Manage all your domains. Click <strong>Manage →</strong> on any domain for full DNS, SSL, and billing controls.
            </Typography>
          </Stack>
          <Box sx={{ border: `1px solid ${dashboardTokens.colors.border}`, borderRadius: 1, overflow: 'hidden', minHeight: 680 }}>
            <DomainPage onManage={(id) => navigate(`/domains/dashboard/${id}`)} />
          </Box>
        </Box>
      )}

      {tab === 1 && (
        <Stack spacing={2}>
          {billingError && <Alert severity="warning">{billingError}</Alert>}

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <Card sx={{ flex: 1 }}>
              <CardContent>
                <Typography sx={{ fontSize: '.78rem', color: dashboardTokens.colors.textSecondary, textTransform: 'uppercase', letterSpacing: '.06em' }}>Owned Domains</Typography>
                <Typography sx={{ fontSize: '1.8rem', fontWeight: 800, mt: .5 }}>{userDomains.length}</Typography>
              </CardContent>
            </Card>
            <Card sx={{ flex: 1 }}>
              <CardContent>
                <Typography sx={{ fontSize: '.78rem', color: dashboardTokens.colors.textSecondary, textTransform: 'uppercase', letterSpacing: '.06em' }}>Expiring ≤ 60 Days</Typography>
                <Typography sx={{ fontSize: '1.8rem', fontWeight: 800, mt: .5 }}>{expiringDomains.length}</Typography>
              </CardContent>
            </Card>
            <Card sx={{ flex: 1 }}>
              <CardContent>
                <Typography sx={{ fontSize: '.78rem', color: dashboardTokens.colors.textSecondary, textTransform: 'uppercase', letterSpacing: '.06em' }}>Open Invoices</Typography>
                <Typography sx={{ fontSize: '1.8rem', fontWeight: 800, mt: .5 }}>{openInvoices.length}</Typography>
              </CardContent>
            </Card>
            <Card sx={{ flex: 1 }}>
              <CardContent>
                <Typography sx={{ fontSize: '.78rem', color: dashboardTokens.colors.textSecondary, textTransform: 'uppercase', letterSpacing: '.06em' }}>Open Balance</Typography>
                <Typography sx={{ fontSize: '1.8rem', fontWeight: 800, mt: .5 }}>${openBalance.toFixed(2)}</Typography>
              </CardContent>
            </Card>
          </Stack>

          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.25 }}>
                <Typography sx={{ fontWeight: 700 }}>Renewal Queue</Typography>
                <Button size="small" variant="outlined" onClick={loadBilling} disabled={billingLoading}>Refresh</Button>
              </Stack>
              {billingLoading ? (
                <CircularProgress size={22} />
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Domain</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Days Left</TableCell>
                      <TableCell>Auto Renew</TableCell>
                      <TableCell>Estimated Renewal</TableCell>
                      <TableCell align="right">Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {expiringDomains.map((domain) => (
                      <TableRow key={domain.resource_id} hover>
                        <TableCell sx={{ fontFamily: 'monospace' }}>{domain.domain_name}</TableCell>
                        <TableCell>
                          <Chip size="small" label={domain.status} sx={{ bgcolor: `${statusColor(domain.status)}22`, color: statusColor(domain.status), borderRadius: '2px' }} />
                        </TableCell>
                        <TableCell>{domain.days_until_expiry ?? '—'}</TableCell>
                        <TableCell>{domain.auto_renew ? 'Enabled' : 'Disabled'}</TableCell>
                        <TableCell>
                          {renewPriceByTld[domain.tld?.toLowerCase()] !== undefined
                            ? `$${Number(renewPriceByTld[domain.tld.toLowerCase()]).toFixed(2)}`
                            : '—'}
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={0.75} justifyContent="flex-end">
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => navigate(`/domains/dashboard/${domain.resource_id}`)}
                              sx={{ borderColor: dashboardTokens.colors.border, color: dashboardTokens.colors.textPrimary, fontSize: '.75rem' }}
                            >
                              Manage →
                            </Button>
                            <Button
                              size="small"
                              variant="contained"
                              disabled={renewingDomainId === domain.resource_id}
                              onClick={() => renewDomain(domain)}
                            >
                              {renewingDomainId === domain.resource_id ? 'Renewing...' : 'Renew 1yr'}
                            </Button>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                    {expiringDomains.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} sx={{ color: dashboardTokens.colors.textSecondary, textAlign: 'center' }}>
                          No domains currently close to expiry.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} sx={{ mb: 1.25 }}>
                <Typography sx={{ fontWeight: 700 }}>Invoice History</Typography>
                <TextField
                  size="small"
                  select
                  label="Filter by Domain"
                  value={domainFilter}
                  onChange={(event) => setDomainFilter(event.target.value)}
                  sx={{ minWidth: 260 }}
                >
                  <MenuItem value="all">All Domains</MenuItem>
                  {userDomains.map((domain) => (
                    <MenuItem key={domain.resource_id} value={domain.resource_id}>{domain.domain_name}</MenuItem>
                  ))}
                </TextField>
              </Stack>

              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Invoice</TableCell>
                    <TableCell>Period</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Total</TableCell>
                    <TableCell>Due</TableCell>
                    <TableCell align="right">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {domainFilterLoading && (
                    <TableRow>
                      <TableCell colSpan={6} sx={{ color: dashboardTokens.colors.textSecondary, textAlign: 'center' }}>
                        Loading invoices for selected domain...
                      </TableCell>
                    </TableRow>
                  )}
                  {filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id} hover onClick={() => openInvoice(invoice)} sx={{ cursor: 'pointer' }}>
                      <TableCell sx={{ fontFamily: 'monospace' }}>{invoice.invoice_number}</TableCell>
                      <TableCell>{new Date(invoice.period_start).toLocaleDateString()} - {new Date(invoice.period_end).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Chip size="small" label={invoice.status} sx={{ borderRadius: '2px', bgcolor: `${statusColor(invoice.status)}22`, color: statusColor(invoice.status) }} />
                      </TableCell>
                      <TableCell>${Number(invoice.total || 0).toFixed(2)}</TableCell>
                      <TableCell>{invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '—'}</TableCell>
                      <TableCell align="right">
                        {invoice.status === 'open' ? (
                          <Button
                            size="small"
                            variant="outlined"
                            disabled={payingInvoiceId === invoice.id}
                            onClick={(event) => {
                              event.stopPropagation();
                              payInvoice(invoice.id);
                            }}
                          >
                            {payingInvoiceId === invoice.id ? 'Paying...' : 'Pay'}
                          </Button>
                        ) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredInvoices.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} sx={{ color: dashboardTokens.colors.textSecondary, textAlign: 'center' }}>
                        No invoices found for the selected filter.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {selectedInvoice && (
            <Card>
              <CardContent>
                <Typography sx={{ fontWeight: 700, mb: 1.25 }}>Invoice Detail: {selectedInvoice.invoice_number}</Typography>
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 1.25 }}>
                  <Chip size="small" label={`Status: ${selectedInvoice.status}`} sx={{ borderRadius: '2px' }} />
                  <Chip size="small" label={`Subtotal: $${Number(selectedInvoice.subtotal || 0).toFixed(2)}`} sx={{ borderRadius: '2px' }} />
                  <Chip size="small" label={`Tax: $${Number(selectedInvoice.tax_amount || 0).toFixed(2)}`} sx={{ borderRadius: '2px' }} />
                  <Chip size="small" label={`Total: $${Number(selectedInvoice.total || 0).toFixed(2)}`} sx={{ borderRadius: '2px' }} />
                </Stack>

                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Service</TableCell>
                      <TableCell>Resource</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell>Qty</TableCell>
                      <TableCell>Unit</TableCell>
                      <TableCell>Unit Price</TableCell>
                      <TableCell>Amount</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(selectedInvoice.line_items || []).map((item) => (
                      <TableRow key={item.id} hover>
                        <TableCell>{item.service}</TableCell>
                        <TableCell sx={{ fontFamily: 'monospace' }}>{item.resource_id || '—'}</TableCell>
                        <TableCell>{item.description}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{item.unit}</TableCell>
                        <TableCell>${Number(item.unit_price || 0).toFixed(4)}</TableCell>
                        <TableCell>${Number(item.amount || 0).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                    {(selectedInvoice.line_items || []).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} sx={{ color: dashboardTokens.colors.textSecondary, textAlign: 'center' }}>
                          No line items available for this invoice.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </Stack>
      )}

      {tab === 2 && (
        <Stack spacing={2}>
          {adminError && <Alert severity="warning">{adminError}</Alert>}

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <Card sx={{ flex: 1 }}>
              <CardContent>
                <Typography sx={{ fontSize: '.78rem', color: dashboardTokens.colors.textSecondary, textTransform: 'uppercase', letterSpacing: '.06em' }}>Total Domains</Typography>
                <Typography sx={{ fontSize: '1.8rem', fontWeight: 800, mt: .5 }}>{summary?.total_domains ?? '—'}</Typography>
              </CardContent>
            </Card>
            <Card sx={{ flex: 1 }}>
              <CardContent>
                <Typography sx={{ fontSize: '.78rem', color: dashboardTokens.colors.textSecondary, textTransform: 'uppercase', letterSpacing: '.06em' }}>Total Users</Typography>
                <Typography sx={{ fontSize: '1.8rem', fontWeight: 800, mt: .5 }}>{summary?.total_users ?? '—'}</Typography>
              </CardContent>
            </Card>
            <Card sx={{ flex: 2 }}>
              <CardContent>
                <Typography sx={{ fontSize: '.78rem', color: dashboardTokens.colors.textSecondary, textTransform: 'uppercase', letterSpacing: '.06em', mb: 1 }}>Status Mix</Typography>
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  {statusRows.map(([status, count]) => (
                    <Chip
                      key={status}
                      label={`${status}: ${count}`}
                      sx={{ bgcolor: `${statusColor(status)}22`, color: statusColor(status), borderRadius: '2px' }}
                    />
                  ))}
                  {statusRows.length === 0 && <Typography sx={{ color: dashboardTokens.colors.textSecondary }}>No data</Typography>}
                </Stack>
              </CardContent>
            </Card>
          </Stack>

          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.25 }}>
                <Typography sx={{ fontWeight: 700 }}>Domain Inventory</Typography>
                <Button size="small" variant="outlined" onClick={loadAdmin} disabled={adminLoading}>Refresh</Button>
              </Stack>
              {adminLoading ? (
                <CircularProgress size={22} />
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Domain</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Owner</TableCell>
                      <TableCell>Expires</TableCell>
                      <TableCell>Auto Renew</TableCell>
                      <TableCell align="right">Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {adminDomains.map((domain) => (
                      <TableRow key={domain.resource_id} hover>
                        <TableCell sx={{ fontFamily: 'monospace' }}>{domain.domain_name}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={domain.status}
                            sx={{ bgcolor: `${statusColor(domain.status)}22`, color: statusColor(domain.status), borderRadius: '2px' }}
                          />
                        </TableCell>
                        <TableCell>{domain.owner_username || '—'}</TableCell>
                        <TableCell>{domain.expires_at ? new Date(domain.expires_at).toLocaleDateString() : '—'}</TableCell>
                        <TableCell>{domain.auto_renew ? 'Yes' : 'No'}</TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => {
                              setOverrideDomain(domain);
                              setOverrideStatus(domain.status);
                              setOverrideOpen(true);
                            }}
                          >
                            Override
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {adminDomains.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} sx={{ color: dashboardTokens.colors.textSecondary, textAlign: 'center' }}>
                          No domains found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography sx={{ fontWeight: 700, mb: 1.25 }}>User Ownership View</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>User</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Domains</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {adminUsers.map((user) => (
                    <TableRow key={user.id} hover>
                      <TableCell>{user.username}</TableCell>
                      <TableCell>{user.email || '—'}</TableCell>
                      <TableCell>{user.domains_count}</TableCell>
                      <TableCell>{user.is_staff ? 'Admin' : 'User'}</TableCell>
                      <TableCell>{user.is_active ? 'Active' : 'Disabled'}</TableCell>
                    </TableRow>
                  ))}
                  {adminUsers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} sx={{ color: dashboardTokens.colors.textSecondary, textAlign: 'center' }}>
                        No users found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Stack>
      )}

      <Dialog open={overrideOpen} onClose={() => setOverrideOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Force Domain Status</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 1, color: dashboardTokens.colors.textSecondary }}>
            Domain: {overrideDomain?.domain_name}
          </Typography>
          <TextField
            fullWidth
            size="small"
            label="Status"
            value={overrideStatus}
            onChange={(event) => setOverrideStatus(event.target.value)}
            helperText="Use: pending, active, expired, suspended, transferring, deleting, error"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOverrideOpen(false)}>Cancel</Button>
          <Button onClick={submitOverride} variant="contained" disabled={overrideSaving}>
            {overrideSaving ? 'Saving...' : 'Apply'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DomainsServiceDashboardPage;
