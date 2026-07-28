import React, { useCallback, useEffect, useState } from 'react';
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
  Divider,
  FormControlLabel,
  IconButton,
  MenuItem,
  Select,
  Stack,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import ArrowBackIcon   from '@mui/icons-material/ArrowBack';
import RefreshIcon     from '@mui/icons-material/Refresh';
import AddIcon         from '@mui/icons-material/Add';
import EditIcon        from '@mui/icons-material/Edit';
import DeleteIcon      from '@mui/icons-material/Delete';
import SecurityIcon    from '@mui/icons-material/Security';
import DnsIcon         from '@mui/icons-material/Dns';
import ReceiptIcon     from '@mui/icons-material/Receipt';
import SettingsIcon    from '@mui/icons-material/Settings';
import AutorenewIcon   from '@mui/icons-material/Autorenew';
import LockIcon        from '@mui/icons-material/Lock';
import { useNavigate, useParams } from 'react-router-dom';
import { domainApi } from '../services/cloudApi';
import { dashboardTokens, dashboardSemanticColors } from '../styles/dashboardDesignSystem';
import type { Domain, DnsRecord, SslCertificate, DnsRecordType } from '../types/domain';
import type { Invoice } from '../types/billing';

// ── Helpers ───────────────────────────────────────────────────────────────────

const statusColor = (s: string) => {
  switch (s) {
    case 'active':   case 'issued':   return dashboardSemanticColors.success;
    case 'pending':  case 'transferring': return dashboardSemanticColors.warning;
    case 'expired':  case 'error':    case 'failed':  case 'revoked': return dashboardSemanticColors.danger;
    default: return dashboardTokens.colors.textSecondary;
  }
};

const fmt = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

const daysLeft = (d: string | null | undefined) => {
  if (!d) return null;
  const diff = Math.floor((new Date(d).getTime() - Date.now()) / 86_400_000);
  return diff;
};

// ─────────────────────────────────────────────────────────────────────────────
// DomainDetailPage
// ─────────────────────────────────────────────────────────────────────────────

type DnsTemplate = {
  name: string;
  label: string;
  description: string;
  records: Array<{ record_type: string; name: string; records: string[]; ttl: number }>;
};

const DNS_RECORD_TYPES: DnsRecordType[] = ['A','AAAA','CNAME','MX','TXT','NS','SOA','SRV','CAA','PTR'];

const DomainDetailPage: React.FC = () => {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);

  // ── Domain ──────────────────────────────────────────────────────────────────
  const [domain,    setDomain]    = useState<Domain | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [saving,    setSaving]    = useState(false);

  // ── DNS ─────────────────────────────────────────────────────────────────────
  const [dnsRecords,  setDnsRecords]   = useState<DnsRecord[]>([]);
  const [dnsLoading,  setDnsLoading]   = useState(false);
  const [dnsError,    setDnsError]     = useState('');
  const [templates,   setTemplates]    = useState<DnsTemplate[]>([]);
  const [templateApplying, setTemplateApplying] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  // Add record dialog
  const [addOpen,  setAddOpen]  = useState(false);
  const [newType,  setNewType]  = useState<DnsRecordType>('A');
  const [newName,  setNewName]  = useState('');
  const [newValue, setNewValue] = useState('');
  const [newTtl,   setNewTtl]   = useState(300);
  const [addSaving, setAddSaving] = useState(false);
  // Edit record dialog
  const [editRecord,  setEditRecord]  = useState<DnsRecord | null>(null);
  const [editValue,   setEditValue]   = useState('');
  const [editTtl,     setEditTtl]     = useState(300);
  const [editSaving,  setEditSaving]  = useState(false);
  // Nameservers
  const [nsEditing,   setNsEditing]  = useState(false);
  const [nsValues,    setNsValues]   = useState<string[]>([]);
  const [nsSaving,    setNsSaving]   = useState(false);

  // ── SSL ─────────────────────────────────────────────────────────────────────
  const [sslCerts,    setSslCerts]    = useState<SslCertificate[]>([]);
  const [sslLoading,  setSslLoading]  = useState(false);
  const [sslError,    setSslError]    = useState('');
  const [sslRequesting, setSslRequesting] = useState(false);

  // ── Billing ─────────────────────────────────────────────────────────────────
  const [invoices,      setInvoices]      = useState<Invoice[]>([]);
  const [billingLoading,setBillingLoading] = useState(false);
  const [billingError,  setBillingError]  = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // ── Renew dialog ────────────────────────────────────────────────────────────
  const [renewOpen,  setRenewOpen]  = useState(false);
  const [renewYears, setRenewYears] = useState(1);
  const [renewing,   setRenewing]   = useState(false);

  // ============================================================= loaders ======

  const loadDomain = useCallback(async () => {
    if (!id) return;
    setLoading(true); setError('');
    try {
      const res = await domainApi.get(id);
      setDomain(res.data);
      setNsValues(res.data.nameservers || []);
    } catch {
      setError('Failed to load domain.');
    } finally { setLoading(false); }
  }, [id]);

  const loadDns = useCallback(async () => {
    if (!id) return;
    setDnsLoading(true); setDnsError('');
    try {
      const [recRes, tmplRes] = await Promise.all([
        domainApi.dnsRecords(id),
        domainApi.dnsTemplates(id),
      ]);
      setDnsRecords(recRes.data);
      setTemplates(tmplRes.data || []);
    } catch {
      setDnsError('Failed to load DNS records.');
    } finally { setDnsLoading(false); }
  }, [id]);

  const loadSsl = useCallback(async () => {
    if (!id) return;
    setSslLoading(true); setSslError('');
    try {
      const res = await domainApi.sslCerts(id);
      setSslCerts(res.data);
    } catch { setSslError('Failed to load SSL certificates.'); }
    finally { setSslLoading(false); }
  }, [id]);

  const loadBilling = useCallback(async () => {
    if (!id) return;
    setBillingLoading(true); setBillingError('');
    try {
      const res = await domainApi.billing(id);
      setInvoices(res.data);
    } catch { setBillingError('Failed to load billing history.'); }
    finally { setBillingLoading(false); }
  }, [id]);

  useEffect(() => { loadDomain(); }, [loadDomain]);
  useEffect(() => { if (tab === 1) loadDns(); }, [tab, loadDns]);
  useEffect(() => { if (tab === 2) loadSsl(); }, [tab, loadSsl]);
  useEffect(() => { if (tab === 3) loadBilling(); }, [tab, loadBilling]);

  // ============================================================= actions ======

  const toggleAutoRenew = async () => {
    if (!id || !domain) return;
    setSaving(true);
    try {
      const res = await domainApi.toggleAutoRenew(id);
      setDomain(d => d ? { ...d, auto_renew: res.data.auto_renew } : d);
    } finally { setSaving(false); }
  };

  const togglePrivacy = async () => {
    if (!id || !domain) return;
    setSaving(true);
    try {
      await domainApi.setPrivacy(id, !domain.whois_privacy);
      setDomain(d => d ? { ...d, whois_privacy: !d.whois_privacy } : d);
    } finally { setSaving(false); }
  };

  const toggleDnssec = async () => {
    if (!id || !domain || domain.dnssec_enabled) return;
    setSaving(true);
    try {
      await domainApi.enableDnssec(id);
      setDomain(d => d ? { ...d, dnssec_enabled: true } : d);
    } finally { setSaving(false); }
  };

  const handleRenew = async () => {
    if (!id) return;
    setRenewing(true);
    try {
      await domainApi.renew(id, renewYears);
      setRenewOpen(false);
      await loadDomain();
    } finally { setRenewing(false); }
  };

  const handleSaveNameservers = async () => {
    if (!id) return;
    setNsSaving(true);
    try {
      await domainApi.updateNameservers(id, nsValues.filter(Boolean));
      setDomain(d => d ? { ...d, nameservers: nsValues.filter(Boolean) } : d);
      setNsEditing(false);
    } finally { setNsSaving(false); }
  };

  // DNS ---

  const handleAddRecord = async () => {
    if (!id) return;
    setAddSaving(true);
    try {
      const res = await domainApi.addDnsRecord(id, {
        name: newName,
        record_type: newType,
        records: [newValue],
        ttl: newTtl,
      });
      setDnsRecords(prev => [...prev, res.data]);
      setAddOpen(false);
      setNewName(''); setNewValue(''); setNewTtl(300);
    } finally { setAddSaving(false); }
  };

  const handleEditRecord = async () => {
    if (!id || !editRecord) return;
    setEditSaving(true);
    try {
      const res = await domainApi.updateDnsRecord(id, editRecord.recordset_id, [editValue], editTtl);
      setDnsRecords(prev => prev.map(r => r.id === editRecord.id ? res.data : r));
      setEditRecord(null);
    } finally { setEditSaving(false); }
  };

  const handleDeleteRecord = async (recordset_id: string) => {
    if (!id) return;
    await domainApi.deleteDnsRecord(id, recordset_id);
    setDnsRecords(prev => prev.filter(r => r.recordset_id !== recordset_id));
  };

  const handleApplyTemplate = async () => {
    if (!id || !selectedTemplate) return;
    setTemplateApplying(true);
    try {
      await domainApi.applyDnsTemplate(id, selectedTemplate);
      await loadDns();
      setSelectedTemplate('');
    } finally { setTemplateApplying(false); }
  };

  // SSL ---

  const handleRequestSsl = async () => {
    if (!id) return;
    setSslRequesting(true);
    try {
      const res = await domainApi.requestSsl(id);
      setSslCerts(prev => [...prev, res.data as SslCertificate]);
    } finally { setSslRequesting(false); }
  };

  // ============================================================= render =======

  const statusChip = (s: string) => (
    <Chip
      size="small"
      label={s}
      sx={{ bgcolor: `${statusColor(s)}22`, color: statusColor(s), borderRadius: '4px', fontWeight: 700, textTransform: 'capitalize' }}
    />
  );

  const expiry  = domain ? daysLeft(domain.expires_at) : null;
  const expiryLabel = expiry === null ? '—'
    : expiry < 0  ? <span style={{ color: dashboardSemanticColors.danger }}>Expired {Math.abs(expiry)}d ago</span>
    : expiry < 30 ? <span style={{ color: dashboardSemanticColors.warning }}>{expiry}d remaining</span>
    : <span style={{ color: dashboardSemanticColors.success }}>{expiry}d remaining</span>;

  const cellSx = { color: dashboardTokens.colors.textPrimary, borderColor: dashboardTokens.colors.border, py: 1 };
  const headSx = { color: dashboardTokens.colors.textSecondary, borderColor: dashboardTokens.colors.border, fontSize: '.72rem', textTransform: 'uppercase', fontWeight: 700, py: 1 };

  // ── Loading / Error guard ─────────────────────────────────────────────────────
  if (loading) return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 260, bgcolor: dashboardTokens.colors.background }}>
      <CircularProgress size={28} sx={{ color: dashboardTokens.colors.brandPrimary }} />
    </Box>
  );

  if (error || !domain) return (
    <Box sx={{ p: 3, bgcolor: dashboardTokens.colors.background, minHeight: '100%' }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/domains/dashboard')} sx={{ color: dashboardTokens.colors.textSecondary, mb: 2 }}>
        Back to Domains
      </Button>
      <Alert severity="error">{error || 'Domain not found.'}</Alert>
    </Box>
  );

  return (
    <Box sx={{ bgcolor: dashboardTokens.colors.background, minHeight: '100%', p: { xs: 1.5, md: 2.5 } }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <Stack direction="row" alignItems="center" spacing={1.5} mb={2}>
        <IconButton size="small" onClick={() => navigate('/domains/dashboard')}
          sx={{ color: dashboardTokens.colors.textSecondary, border: `1px solid ${dashboardTokens.colors.border}`, borderRadius: '6px' }}>
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="h6" sx={{ fontWeight: 800, color: dashboardTokens.colors.textPrimary, lineHeight: 1.2 }}>
              {domain.domain_name}
            </Typography>
            {statusChip(domain.status)}
          </Stack>
          <Typography variant="caption" sx={{ color: dashboardTokens.colors.textSecondary }}>
            {domain.resource_id} · registered {fmt(domain.registered_at || domain.created_at)}
          </Typography>
        </Box>
        <Button
          size="small"
          variant="outlined"
          startIcon={<AutorenewIcon />}
          onClick={() => setRenewOpen(true)}
          sx={{ borderColor: dashboardTokens.colors.border, color: dashboardTokens.colors.textPrimary }}
        >
          Renew
        </Button>
        <Tooltip title="Refresh">
          <IconButton size="small" onClick={loadDomain}
            sx={{ color: dashboardTokens.colors.textSecondary, border: `1px solid ${dashboardTokens.colors.border}`, borderRadius: '6px' }}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{
          mb: 2,
          borderBottom: `1px solid ${dashboardTokens.colors.border}`,
          '& .MuiTab-root':       { color: dashboardTokens.colors.textSecondary, fontWeight: 600, minHeight: 40, textTransform: 'none' },
          '& .Mui-selected':      { color: dashboardTokens.colors.brandPrimary },
          '& .MuiTabs-indicator': { bgcolor: dashboardTokens.colors.brandPrimary },
        }}
      >
        <Tab icon={<SettingsIcon fontSize="small" />} iconPosition="start" label="Overview" />
        <Tab icon={<DnsIcon     fontSize="small" />} iconPosition="start" label="DNS"      />
        <Tab icon={<LockIcon    fontSize="small" />} iconPosition="start" label="SSL"      />
        <Tab icon={<ReceiptIcon fontSize="small" />} iconPosition="start" label="Billing"  />
      </Tabs>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 0 – OVERVIEW
        ══════════════════════════════════════════════════════════════════════ */}
      {tab === 0 && (
        <Stack spacing={2.5}>

          {/* Status & Expiry card */}
          <Card sx={{ bgcolor: dashboardTokens.colors.surface, border: `1px solid ${dashboardTokens.colors.border}`, boxShadow: 'none', borderRadius: 1 }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ color: dashboardTokens.colors.textSecondary, mb: 1.5, textTransform: 'uppercase', letterSpacing: '.08em', fontSize: '.72rem', fontWeight: 700 }}>
                Domain Status
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 2 }}>
                {[
                  { label: 'Status',       value: statusChip(domain.status) },
                  { label: 'Expiry date',  value: <Typography sx={{ color: dashboardTokens.colors.textPrimary, fontWeight: 600 }}>{fmt(domain.expires_at)}</Typography> },
                  { label: 'Time left',    value: <Typography sx={{ fontWeight: 600 }}>{expiryLabel}</Typography> },
                  { label: 'TLD',          value: <Typography sx={{ color: dashboardTokens.colors.textPrimary, fontWeight: 600 }}>.{domain.tld}</Typography> },
                  { label: 'Reg. years',   value: <Typography sx={{ color: dashboardTokens.colors.textPrimary, fontWeight: 600 }}>{domain.registration_years || 1}yr</Typography> },
                  { label: 'Owner',        value: <Typography sx={{ color: dashboardTokens.colors.textPrimary, fontWeight: 600 }}>{domain.owner_username || '—'}</Typography> },
                  { label: 'Resource ID',  value: <Typography sx={{ color: dashboardTokens.colors.textSecondary, fontFamily: 'monospace', fontSize: '.82rem' }}>{domain.resource_id}</Typography> },
                  { label: 'Created',      value: <Typography sx={{ color: dashboardTokens.colors.textPrimary }}>{fmt(domain.created_at)}</Typography> },
                ].map(({ label, value }) => (
                  <Box key={label}>
                    <Typography sx={{ fontSize: '.72rem', color: dashboardTokens.colors.textSecondary, mb: 0.3 }}>{label}</Typography>
                    {value}
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>

          {/* Settings toggles */}
          <Card sx={{ bgcolor: dashboardTokens.colors.surface, border: `1px solid ${dashboardTokens.colors.border}`, boxShadow: 'none', borderRadius: 1 }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ color: dashboardTokens.colors.textSecondary, mb: 1.5, textTransform: 'uppercase', letterSpacing: '.08em', fontSize: '.72rem', fontWeight: 700 }}>
                Settings
              </Typography>
              <Stack spacing={1.5}>
                <Stack direction="row" alignItems="center" justifyContent="space-between"
                  sx={{ p: 1.25, borderRadius: 1, border: `1px solid ${dashboardTokens.colors.border}` }}>
                  <Box>
                    <Typography sx={{ color: dashboardTokens.colors.textPrimary, fontWeight: 600, fontSize: '.9rem' }}>Auto-renew</Typography>
                    <Typography sx={{ color: dashboardTokens.colors.textSecondary, fontSize: '.8rem' }}>Automatically renew before expiry</Typography>
                  </Box>
                  <Switch checked={domain.auto_renew} onChange={toggleAutoRenew} disabled={saving}
                    sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: dashboardTokens.colors.brandPrimary }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: dashboardTokens.colors.brandPrimary } }} />
                </Stack>
                <Stack direction="row" alignItems="center" justifyContent="space-between"
                  sx={{ p: 1.25, borderRadius: 1, border: `1px solid ${dashboardTokens.colors.border}` }}>
                  <Box>
                    <Typography sx={{ color: dashboardTokens.colors.textPrimary, fontWeight: 600, fontSize: '.9rem' }}>WHOIS Privacy</Typography>
                    <Typography sx={{ color: dashboardTokens.colors.textSecondary, fontSize: '.8rem' }}>Hide registrant contact details from WHOIS</Typography>
                  </Box>
                  <Switch checked={domain.whois_privacy} onChange={togglePrivacy} disabled={saving}
                    sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: dashboardTokens.colors.brandPrimary }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: dashboardTokens.colors.brandPrimary } }} />
                </Stack>
                <Stack direction="row" alignItems="center" justifyContent="space-between"
                  sx={{ p: 1.25, borderRadius: 1, border: `1px solid ${dashboardTokens.colors.border}` }}>
                  <Box>
                    <Typography sx={{ color: dashboardTokens.colors.textPrimary, fontWeight: 600, fontSize: '.9rem' }}>DNSSEC</Typography>
                    <Typography sx={{ color: dashboardTokens.colors.textSecondary, fontSize: '.8rem' }}>
                      {domain.dnssec_enabled ? 'DNSSEC is enabled for this zone.' : 'Enable cryptographic signing of DNS responses.'}
                    </Typography>
                  </Box>
                  <Switch checked={domain.dnssec_enabled} onChange={toggleDnssec} disabled={saving || domain.dnssec_enabled}
                    sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: dashboardTokens.colors.brandPrimary }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: dashboardTokens.colors.brandPrimary } }} />
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          {/* Nameservers */}
          <Card sx={{ bgcolor: dashboardTokens.colors.surface, border: `1px solid ${dashboardTokens.colors.border}`, boxShadow: 'none', borderRadius: 1 }}>
            <CardContent>
              <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
                <Typography variant="subtitle2" sx={{ color: dashboardTokens.colors.textSecondary, textTransform: 'uppercase', letterSpacing: '.08em', fontSize: '.72rem', fontWeight: 700 }}>
                  Nameservers
                </Typography>
                {!nsEditing && (
                  <Button size="small" startIcon={<EditIcon />} onClick={() => { setNsEditing(true); setNsValues([...(domain.nameservers || []),'','']); }}
                    sx={{ color: dashboardTokens.colors.textSecondary, fontSize: '.78rem' }}>
                    Edit
                  </Button>
                )}
              </Stack>
              {!nsEditing ? (
                <Stack spacing={0.5}>
                  {(domain.nameservers || []).length === 0
                    ? <Typography sx={{ color: dashboardTokens.colors.textSecondary, fontSize: '.88rem' }}>No custom nameservers configured (using OrcaCloud defaults).</Typography>
                    : domain.nameservers.map((ns, i) => (
                        <Typography key={i} sx={{ fontFamily: 'monospace', fontSize: '.88rem', color: dashboardTokens.colors.textPrimary, px: 1.5, py: 0.5, bgcolor: dashboardTokens.colors.surfaceSubtle, borderRadius: 1 }}>
                          {ns}
                        </Typography>
                      ))}
                </Stack>
              ) : (
                <Stack spacing={1}>
                  {nsValues.map((ns, i) => (
                    <TextField key={i} size="small" value={ns}
                      onChange={e => setNsValues(prev => { const n = [...prev]; n[i] = e.target.value; return n; })}
                      placeholder={`ns${i + 1}.example.com`}
                      sx={{ '& .MuiOutlinedInput-root': { color: dashboardTokens.colors.textPrimary, '& fieldset': { borderColor: dashboardTokens.colors.border } } }} />
                  ))}
                  <Stack direction="row" spacing={1}>
                    <Button size="small" variant="contained" onClick={handleSaveNameservers} disabled={nsSaving}
                      sx={{ bgcolor: dashboardTokens.colors.brandPrimary }}>
                      {nsSaving ? 'Saving…' : 'Save'}
                    </Button>
                    <Button size="small" onClick={() => setNsEditing(false)} sx={{ color: dashboardTokens.colors.textSecondary }}>Cancel</Button>
                  </Stack>
                </Stack>
              )}
            </CardContent>
          </Card>

          {/* Quick actions */}
          <Card sx={{ bgcolor: dashboardTokens.colors.surface, border: `1px solid ${dashboardTokens.colors.border}`, boxShadow: 'none', borderRadius: 1 }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ color: dashboardTokens.colors.textSecondary, mb: 1.5, textTransform: 'uppercase', letterSpacing: '.08em', fontSize: '.72rem', fontWeight: 700 }}>
                Quick Actions
              </Typography>
              <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                <Button size="small" variant="outlined" startIcon={<AutorenewIcon />} onClick={() => setRenewOpen(true)}
                  sx={{ borderColor: dashboardTokens.colors.border, color: dashboardTokens.colors.textPrimary }}>
                  Renew Domain
                </Button>
                <Button size="small" variant="outlined" startIcon={<DnsIcon />} onClick={() => setTab(1)}
                  sx={{ borderColor: dashboardTokens.colors.border, color: dashboardTokens.colors.textPrimary }}>
                  Manage DNS
                </Button>
                <Button size="small" variant="outlined" startIcon={<LockIcon />} onClick={() => setTab(2)}
                  sx={{ borderColor: dashboardTokens.colors.border, color: dashboardTokens.colors.textPrimary }}>
                  Manage SSL
                </Button>
                <Button size="small" variant="outlined" startIcon={<ReceiptIcon />} onClick={() => setTab(3)}
                  sx={{ borderColor: dashboardTokens.colors.border, color: dashboardTokens.colors.textPrimary }}>
                  View Billing
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 1 – DNS
        ══════════════════════════════════════════════════════════════════════ */}
      {tab === 1 && (
        <Stack spacing={2.5}>
          {dnsLoading && <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={24} /></Box>}
          {dnsError && <Alert severity="error">{dnsError}</Alert>}
          {!dnsLoading && (
            <>
              {/* Templates */}
              <Card sx={{ bgcolor: dashboardTokens.colors.surface, border: `1px solid ${dashboardTokens.colors.border}`, boxShadow: 'none', borderRadius: 1 }}>
                <CardContent>
                  <Typography variant="subtitle2" sx={{ color: dashboardTokens.colors.textSecondary, mb: 1.5, textTransform: 'uppercase', letterSpacing: '.08em', fontSize: '.72rem', fontWeight: 700 }}>
                    Apply DNS Template
                  </Typography>
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'flex-end' }}>
                    <Box sx={{ flex: 1 }}>
                      <Select
                        size="small"
                        fullWidth
                        displayEmpty
                        value={selectedTemplate}
                        onChange={e => setSelectedTemplate(e.target.value)}
                        sx={{ color: dashboardTokens.colors.textPrimary, '& .MuiOutlinedInput-notchedOutline': { borderColor: dashboardTokens.colors.border } }}
                      >
                        <MenuItem value=""><em>Select a template…</em></MenuItem>
                        {templates.map(t => (
                          <MenuItem key={t.name} value={t.name}>
                            <Stack>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>{t.label}</Typography>
                              <Typography variant="caption" sx={{ color: dashboardTokens.colors.textSecondary }}>{t.description}</Typography>
                            </Stack>
                          </MenuItem>
                        ))}
                      </Select>
                    </Box>
                    <Button
                      variant="contained"
                      disabled={!selectedTemplate || templateApplying}
                      onClick={handleApplyTemplate}
                      sx={{ bgcolor: dashboardTokens.colors.brandPrimary, whiteSpace: 'nowrap', flexShrink: 0 }}
                    >
                      {templateApplying ? 'Applying…' : 'Apply Template'}
                    </Button>
                  </Stack>
                </CardContent>
              </Card>

              {/* Records table */}
              <Card sx={{ bgcolor: dashboardTokens.colors.surface, border: `1px solid ${dashboardTokens.colors.border}`, boxShadow: 'none', borderRadius: 1 }}>
                <CardContent sx={{ pb: '12px !important' }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
                    <Typography variant="subtitle2" sx={{ color: dashboardTokens.colors.textSecondary, textTransform: 'uppercase', letterSpacing: '.08em', fontSize: '.72rem', fontWeight: 700 }}>
                      DNS Records ({dnsRecords.length})
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      <Tooltip title="Refresh records">
                        <IconButton size="small" onClick={loadDns} sx={{ color: dashboardTokens.colors.textSecondary }}>
                          <RefreshIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Button size="small" variant="outlined" startIcon={<AddIcon />}
                        onClick={() => setAddOpen(true)}
                        sx={{ borderColor: dashboardTokens.colors.border, color: dashboardTokens.colors.textPrimary }}>
                        Add Record
                      </Button>
                    </Stack>
                  </Stack>
                  <Box sx={{ overflowX: 'auto' }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          {['Type','Name','Value(s)','TTL','Managed',''].map(h => (
                            <TableCell key={h} sx={headSx}>{h}</TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {dnsRecords.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} sx={{ ...cellSx, textAlign: 'center', color: dashboardTokens.colors.textSecondary }}>
                              No DNS records yet. Add a record or apply a template.
                            </TableCell>
                          </TableRow>
                        )}
                        {dnsRecords.map(rec => (
                          <TableRow key={rec.id} hover sx={{ '&:hover': { bgcolor: dashboardTokens.colors.surfaceHover } }}>
                            <TableCell sx={cellSx}>
                              <Chip size="small" label={rec.record_type} sx={{ bgcolor: `${dashboardTokens.colors.brandPrimary}22`, color: dashboardTokens.colors.brandPrimary, borderRadius: '3px', fontWeight: 700, fontSize: '.72rem' }} />
                            </TableCell>
                            <TableCell sx={{ ...cellSx, fontFamily: 'monospace', fontSize: '.82rem' }}>{rec.name}</TableCell>
                            <TableCell sx={{ ...cellSx, maxWidth: 260, fontFamily: 'monospace', fontSize: '.82rem', wordBreak: 'break-all' }}>
                              {rec.records.join(', ')}
                            </TableCell>
                            <TableCell sx={cellSx}>{rec.ttl}s</TableCell>
                            <TableCell sx={cellSx}>
                              {rec.is_managed
                                ? <Chip size="small" label="Auto" sx={{ bgcolor: `${dashboardSemanticColors.warning}22`, color: dashboardSemanticColors.warning, borderRadius: '3px', fontSize: '.7rem' }} />
                                : <span style={{ color: dashboardTokens.colors.textSecondary }}>—</span>}
                            </TableCell>
                            <TableCell sx={{ ...cellSx, width: 80 }}>
                              <Stack direction="row" spacing={0.5}>
                                {!rec.is_managed && (
                                  <>
                                    <Tooltip title="Edit">
                                      <IconButton size="small"
                                        onClick={() => { setEditRecord(rec); setEditValue(rec.records[0] || ''); setEditTtl(rec.ttl); }}
                                        sx={{ color: dashboardTokens.colors.textSecondary }}>
                                        <EditIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Delete">
                                      <IconButton size="small"
                                        onClick={() => handleDeleteRecord(rec.recordset_id)}
                                        sx={{ color: dashboardSemanticColors.danger }}>
                                        <DeleteIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  </>
                                )}
                              </Stack>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                </CardContent>
              </Card>
            </>
          )}
        </Stack>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 2 – SSL
        ══════════════════════════════════════════════════════════════════════ */}
      {tab === 2 && (
        <Stack spacing={2.5}>
          {sslLoading && <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={24} /></Box>}
          {sslError && <Alert severity="error">{sslError}</Alert>}
          {!sslLoading && (
            <>
              <Stack direction="row" justifyContent="flex-end">
                <Button
                  variant="contained"
                  startIcon={<SecurityIcon />}
                  onClick={handleRequestSsl}
                  disabled={sslRequesting}
                  sx={{ bgcolor: dashboardTokens.colors.brandPrimary }}
                >
                  {sslRequesting ? 'Requesting…' : 'Request New Certificate'}
                </Button>
              </Stack>

              {sslCerts.length === 0 && (
                <Card sx={{ bgcolor: dashboardTokens.colors.surface, border: `1px solid ${dashboardTokens.colors.border}`, boxShadow: 'none', borderRadius: 1 }}>
                  <CardContent sx={{ textAlign: 'center', py: 5 }}>
                    <LockIcon sx={{ fontSize: 40, color: dashboardTokens.colors.textSecondary, mb: 1 }} />
                    <Typography sx={{ color: dashboardTokens.colors.textSecondary }}>
                      No SSL certificates found for this domain.
                    </Typography>
                    <Typography variant="caption" sx={{ color: dashboardTokens.colors.textSecondary }}>
                      Click "Request New Certificate" to provision a Let's Encrypt certificate.
                    </Typography>
                  </CardContent>
                </Card>
              )}

              {sslCerts.map(cert => (
                <Card key={cert.cert_id} sx={{ bgcolor: dashboardTokens.colors.surface, border: `1px solid ${dashboardTokens.colors.border}`, boxShadow: 'none', borderRadius: 1 }}>
                  <CardContent>
                    <Stack direction="row" alignItems="flex-start" justifyContent="space-between" mb={1.5}>
                      <Box>
                        <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
                          <LockIcon sx={{ color: statusColor(cert.status), fontSize: '1.1rem' }} />
                          <Typography sx={{ fontWeight: 700, color: dashboardTokens.colors.textPrimary, fontFamily: 'monospace' }}>{cert.common_name}</Typography>
                          {statusChip(cert.status)}
                        </Stack>
                        <Typography variant="caption" sx={{ color: dashboardTokens.colors.textSecondary }}>ID: {cert.cert_id}</Typography>
                      </Box>
                      <FormControlLabel
                        label={<Typography variant="caption" sx={{ color: dashboardTokens.colors.textSecondary }}>Auto-renew</Typography>}
                        control={<Switch size="small" checked={cert.auto_renew} disabled
                          sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: dashboardTokens.colors.brandPrimary } }} />}
                        labelPlacement="start"
                      />
                    </Stack>
                    <Divider sx={{ borderColor: dashboardTokens.colors.border, mb: 1.5 }} />
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 2 }}>
                      {[
                        { label: 'Issuer',      value: cert.issuer },
                        { label: 'Issued',      value: fmt(cert.issued_at) },
                        { label: 'Expires',     value: fmt(cert.expires_at) },
                        { label: 'Time left',   value: cert.expires_at ? (daysLeft(cert.expires_at) ?? 0) + 'd' : '—' },
                      ].map(({ label, value }) => (
                        <Box key={label}>
                          <Typography sx={{ fontSize: '.72rem', color: dashboardTokens.colors.textSecondary, mb: 0.2 }}>{label}</Typography>
                          <Typography sx={{ fontSize: '.88rem', color: dashboardTokens.colors.textPrimary, fontWeight: 500 }}>{value}</Typography>
                        </Box>
                      ))}
                    </Box>
                    {cert.sans.length > 0 && (
                      <Box mt={1.5}>
                        <Typography sx={{ fontSize: '.72rem', color: dashboardTokens.colors.textSecondary, mb: 0.5 }}>Subject Alternative Names</Typography>
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                          {cert.sans.map((san, i) => (
                            <Chip key={i} size="small" label={san}
                              sx={{ bgcolor: dashboardTokens.colors.surfaceSubtle, color: dashboardTokens.colors.textPrimary, borderRadius: '4px', fontFamily: 'monospace', fontSize: '.72rem' }} />
                          ))}
                        </Stack>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </Stack>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 3 – BILLING
        ══════════════════════════════════════════════════════════════════════ */}
      {tab === 3 && (
        <Stack spacing={2.5}>
          {billingLoading && <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={24} /></Box>}
          {billingError && <Alert severity="error">{billingError}</Alert>}
          {!billingLoading && (
            <Card sx={{ bgcolor: dashboardTokens.colors.surface, border: `1px solid ${dashboardTokens.colors.border}`, boxShadow: 'none', borderRadius: 1 }}>
              <CardContent>
                <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
                  <Typography variant="subtitle2" sx={{ color: dashboardTokens.colors.textSecondary, textTransform: 'uppercase', letterSpacing: '.08em', fontSize: '.72rem', fontWeight: 700 }}>
                    Billing History — {domain.domain_name}
                  </Typography>
                  <Tooltip title="Refresh">
                    <IconButton size="small" onClick={loadBilling} sx={{ color: dashboardTokens.colors.textSecondary }}>
                      <RefreshIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
                <Box sx={{ overflowX: 'auto' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        {['Invoice','Date','Description','Amount','Status',''].map(h => (
                          <TableCell key={h} sx={headSx}>{h}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {invoices.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} sx={{ ...cellSx, textAlign: 'center', color: dashboardTokens.colors.textSecondary }}>
                            No billing history for this domain.
                          </TableCell>
                        </TableRow>
                      )}
                      {invoices.map(inv => (
                        <React.Fragment key={inv.id}>
                          <TableRow
                            hover
                            onClick={() => setSelectedInvoice(selectedInvoice?.id === inv.id ? null : inv)}
                            sx={{ cursor: 'pointer', '&:hover': { bgcolor: dashboardTokens.colors.surfaceHover } }}>
                            <TableCell sx={{ ...cellSx, fontFamily: 'monospace', fontSize: '.82rem' }}>#{inv.id}</TableCell>
                            <TableCell sx={cellSx}>{fmt(inv.period_start)}</TableCell>
                            <TableCell sx={{ ...cellSx, maxWidth: 240 }}>{inv.notes || '—'}</TableCell>
                            <TableCell sx={{ ...cellSx, fontWeight: 700 }}>${Number(inv.total).toFixed(2)}</TableCell>
                            <TableCell sx={cellSx}>{statusChip(inv.status)}</TableCell>
                            <TableCell sx={cellSx}>{inv.status === 'open' && (
                              <Button size="small" variant="outlined"
                                sx={{ borderColor: dashboardSemanticColors.success, color: dashboardSemanticColors.success, fontSize: '.72rem' }}>
                                Pay
                              </Button>
                            )}</TableCell>
                          </TableRow>
                          {selectedInvoice?.id === inv.id && (inv as any).line_items?.length > 0 && (
                            <TableRow>
                              <TableCell colSpan={6} sx={{ bgcolor: dashboardTokens.colors.surfaceSubtle, p: 0 }}>
                                <Box sx={{ p: 1.5 }}>
                                  <Typography sx={{ fontSize: '.72rem', color: dashboardTokens.colors.textSecondary, mb: 0.75, fontWeight: 700, textTransform: 'uppercase' }}>Line Items</Typography>
                                  <Table size="small">
                                    <TableHead>
                                      <TableRow>
                                        {['Description','Qty','Unit','Unit Price','Amount'].map(h => (
                                          <TableCell key={h} sx={{ ...headSx, py: 0.5 }}>{h}</TableCell>
                                        ))}
                                      </TableRow>
                                    </TableHead>
                                    <TableBody>
                                      {((inv as any).line_items || []).map((li: any, i: number) => (
                                        <TableRow key={i}>
                                          <TableCell sx={{ ...cellSx, py: 0.5 }}>{li.description}</TableCell>
                                          <TableCell sx={{ ...cellSx, py: 0.5 }}>{li.quantity}</TableCell>
                                          <TableCell sx={{ ...cellSx, py: 0.5 }}>{li.unit}</TableCell>
                                          <TableCell sx={{ ...cellSx, py: 0.5 }}>${Number(li.unit_price).toFixed(2)}</TableCell>
                                          <TableCell sx={{ ...cellSx, py: 0.5, fontWeight: 700 }}>${Number(li.amount).toFixed(2)}</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </Box>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              </CardContent>
            </Card>
          )}
        </Stack>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          DIALOGS
        ══════════════════════════════════════════════════════════════════════ */}

      {/* Renew domain */}
      <Dialog open={renewOpen} onClose={() => setRenewOpen(false)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { bgcolor: dashboardTokens.colors.surface, color: dashboardTokens.colors.textPrimary } }}>
        <DialogTitle sx={{ borderBottom: `1px solid ${dashboardTokens.colors.border}` }}>Renew {domain.domain_name}</DialogTitle>
        <DialogContent sx={{ pt: '16px !important' }}>
          <Typography sx={{ color: dashboardTokens.colors.textSecondary, mb: 2, fontSize: '.9rem' }}>
            Current expiry: {fmt(domain.expires_at)}
          </Typography>
          <TextField
            label="Years to renew"
            type="number"
            size="small"
            fullWidth
            value={renewYears}
            onChange={e => setRenewYears(Math.max(1, Math.min(10, Number(e.target.value))))}
            inputProps={{ min: 1, max: 10 }}
            sx={{ '& .MuiOutlinedInput-root': { color: dashboardTokens.colors.textPrimary, '& fieldset': { borderColor: dashboardTokens.colors.border } }, '& .MuiInputLabel-root': { color: dashboardTokens.colors.textSecondary } }}
          />
        </DialogContent>
        <DialogActions sx={{ borderTop: `1px solid ${dashboardTokens.colors.border}`, px: 2 }}>
          <Button onClick={() => setRenewOpen(false)} sx={{ color: dashboardTokens.colors.textSecondary }}>Cancel</Button>
          <Button variant="contained" onClick={handleRenew} disabled={renewing}
            sx={{ bgcolor: dashboardTokens.colors.brandPrimary }}>
            {renewing ? 'Renewing…' : `Renew ${renewYears}yr`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add DNS record */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: dashboardTokens.colors.surface, color: dashboardTokens.colors.textPrimary } }}>
        <DialogTitle sx={{ borderBottom: `1px solid ${dashboardTokens.colors.border}` }}>Add DNS Record</DialogTitle>
        <DialogContent sx={{ pt: '16px !important' }}>
          <Stack spacing={2}>
            <Select size="small" fullWidth value={newType} onChange={e => setNewType(e.target.value as DnsRecordType)}
              sx={{ color: dashboardTokens.colors.textPrimary, '& .MuiOutlinedInput-notchedOutline': { borderColor: dashboardTokens.colors.border } }}>
              {DNS_RECORD_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </Select>
            <TextField size="small" fullWidth label="Name (e.g. @ or www)" value={newName} onChange={e => setNewName(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { color: dashboardTokens.colors.textPrimary, '& fieldset': { borderColor: dashboardTokens.colors.border } }, '& .MuiInputLabel-root': { color: dashboardTokens.colors.textSecondary } }} />
            <TextField size="small" fullWidth label="Value" value={newValue} onChange={e => setNewValue(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { color: dashboardTokens.colors.textPrimary, '& fieldset': { borderColor: dashboardTokens.colors.border } }, '& .MuiInputLabel-root': { color: dashboardTokens.colors.textSecondary } }} />
            <TextField size="small" fullWidth label="TTL (seconds)" type="number" value={newTtl} onChange={e => setNewTtl(Number(e.target.value))}
              sx={{ '& .MuiOutlinedInput-root': { color: dashboardTokens.colors.textPrimary, '& fieldset': { borderColor: dashboardTokens.colors.border } }, '& .MuiInputLabel-root': { color: dashboardTokens.colors.textSecondary } }} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ borderTop: `1px solid ${dashboardTokens.colors.border}`, px: 2 }}>
          <Button onClick={() => setAddOpen(false)} sx={{ color: dashboardTokens.colors.textSecondary }}>Cancel</Button>
          <Button variant="contained" onClick={handleAddRecord} disabled={addSaving || !newName || !newValue}
            sx={{ bgcolor: dashboardTokens.colors.brandPrimary }}>
            {addSaving ? 'Adding…' : 'Add Record'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit DNS record */}
      <Dialog open={!!editRecord} onClose={() => setEditRecord(null)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: dashboardTokens.colors.surface, color: dashboardTokens.colors.textPrimary } }}>
        <DialogTitle sx={{ borderBottom: `1px solid ${dashboardTokens.colors.border}` }}>
          Edit {editRecord?.record_type} — {editRecord?.name}
        </DialogTitle>
        <DialogContent sx={{ pt: '16px !important' }}>
          <Stack spacing={2}>
            <TextField size="small" fullWidth label="Value" value={editValue} onChange={e => setEditValue(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { color: dashboardTokens.colors.textPrimary, '& fieldset': { borderColor: dashboardTokens.colors.border } }, '& .MuiInputLabel-root': { color: dashboardTokens.colors.textSecondary } }} />
            <TextField size="small" fullWidth label="TTL (seconds)" type="number" value={editTtl} onChange={e => setEditTtl(Number(e.target.value))}
              sx={{ '& .MuiOutlinedInput-root': { color: dashboardTokens.colors.textPrimary, '& fieldset': { borderColor: dashboardTokens.colors.border } }, '& .MuiInputLabel-root': { color: dashboardTokens.colors.textSecondary } }} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ borderTop: `1px solid ${dashboardTokens.colors.border}`, px: 2 }}>
          <Button onClick={() => setEditRecord(null)} sx={{ color: dashboardTokens.colors.textSecondary }}>Cancel</Button>
          <Button variant="contained" onClick={handleEditRecord} disabled={editSaving || !editValue}
            sx={{ bgcolor: dashboardTokens.colors.brandPrimary }}>
            {editSaving ? 'Saving…' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default DomainDetailPage;
