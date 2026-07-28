import React, { useCallback, useEffect, useState } from 'react';
import {
  Box, Typography, Button, Chip, IconButton, Tooltip,
  Table, TableHead, TableRow, TableCell, TableBody,
  Tabs, Tab, CircularProgress, Alert, Switch,
  TextField,
} from '@mui/material';
import AddIcon           from '@mui/icons-material/Add';
import SwapHorizIcon     from '@mui/icons-material/SwapHoriz';
import RefreshIcon       from '@mui/icons-material/Refresh';
import DomainIcon        from '@mui/icons-material/Language';
import DeleteIcon        from '@mui/icons-material/DeleteOutline';
import VerifiedUserIcon  from '@mui/icons-material/VerifiedUser';
import HttpsIcon         from '@mui/icons-material/Https';
import AutorenewIcon     from '@mui/icons-material/Autorenew';
import RocketLaunchIcon  from '@mui/icons-material/RocketLaunch';
import { domainApi }     from '../services/cloudApi';
import type { Domain, DnsRecord, SslCertificate, DnsRecordType } from '../types/domain';
import RegisterDomainModal  from '../components/Cloud/RegisterDomainModal';
import TransferDomainModal  from '../components/Cloud/TransferDomainModal';
import {
  dashboardTokens,
  dashboardSemanticColors,
  dashboardStatusColors,
} from '../styles/dashboardDesignSystem';

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_COLOUR: Record<string, string> = {
  ...dashboardStatusColors.domain,
};

const SSL_COLOUR: Record<string, string> = {
  ...dashboardStatusColors.ssl,
};

const DNS_TYPES: DnsRecordType[] = ['A','AAAA','CNAME','MX','TXT','NS','SRV','CAA','PTR'];

// ── Component ─────────────────────────────────────────────────────────────────

interface DomainPageProps {
  onManage?: (resourceId: string) => void;
}

const DomainPage: React.FC<DomainPageProps> = ({ onManage }) => {
  const t = {
    panelBg: dashboardTokens.colors.background,
    cardBg: dashboardTokens.colors.surface,
    border: dashboardTokens.colors.border,
    brand: dashboardTokens.colors.brandPrimary,
    hover: dashboardTokens.colors.surfaceHover,
    text: dashboardTokens.colors.textPrimary,
    muted: dashboardTokens.colors.textSecondary,
  };

  // ── State ─────────────────────────────────────────────────────────────────
  const [domains,      setDomains]      = useState<Domain[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [selected,     setSelected]     = useState<Domain | null>(null);
  const [detailTab,    setDetailTab]    = useState(0);
  const [dnsRecords,   setDnsRecords]   = useState<DnsRecord[]>([]);
  const [sslCerts,     setSslCerts]     = useState<SslCertificate[]>([]);
  const [dnsLoading,   setDnsLoading]   = useState(false);
  const [sslLoading,   setSslLoading]   = useState(false);

  // Modals
  const [showRegister, setShowRegister] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);

  // DNS add form
  const [newDnsName,    setNewDnsName]    = useState('');
  const [newDnsType,    setNewDnsType]    = useState<DnsRecordType>('A');
  const [newDnsValue,   setNewDnsValue]   = useState('');
  const [newDnsTtl,     setNewDnsTtl]     = useState(300);
  const [addingDns,     setAddingDns]     = useState(false);
  const [switching,     setSwitching]     = useState(false);
  const [switchInfo,    setSwitchInfo]    = useState<any>(null);
  const [pollingWorkflowId, setPollingWorkflowId] = useState<string | null>(null);

  // ── Data fetching ─────────────────────────────────────────────────────────
  const loadDomains = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const r   = await domainApi.list();
      const raw = Array.isArray(r.data) ? r.data : (r.data as any).results ?? [];
      setDomains(raw);
    } catch {
      setError('Failed to load domains.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDomains(); }, [loadDomains]);

  const loadDomainDetail = useCallback(async (resourceId: string) => {
    try {
      const r = await domainApi.get(resourceId);
      setSelected(r.data as Domain);
    } catch {
      // Keep current snapshot if detail fetch fails
    }
  }, []);

  const loadDns = useCallback(async (id: string) => {
    setDnsLoading(true);
    try {
      const r = await domainApi.dnsRecords(id);
      setDnsRecords(Array.isArray(r.data) ? r.data : []);
    } catch { setDnsRecords([]); }
    finally { setDnsLoading(false); }
  }, []);

  const loadSsl = useCallback(async (id: string) => {
    setSslLoading(true);
    try {
      const r = await domainApi.sslCerts(id);
      setSslCerts(Array.isArray(r.data) ? r.data : []);
    } catch { setSslCerts([]); }
    finally { setSslLoading(false); }
  }, []);

  const handleSelect = (d: Domain) => {
    setSelected(d);
    setDetailTab(0);
    setDnsRecords([]);
    setSslCerts([]);
    loadDomainDetail(d.resource_id);
  };

  useEffect(() => {
    if (!selected) return;
    if (detailTab === 1) loadDns(selected.resource_id);
    if (detailTab === 2) loadSsl(selected.resource_id);
  }, [detailTab, selected, loadDns, loadSsl]);

  useEffect(() => {
    if (!selected?.resource_id) return;
    domainApi.switchStatus(selected.resource_id)
      .then((r: any) => {
        const workflow = r.data?.workflow || null;
        setSwitchInfo(workflow);
      })
      .catch(() => {});
  }, [selected?.resource_id]);

  useEffect(() => {
    if (!selected?.resource_id || !pollingWorkflowId) return;
    let alive = true;

    const poll = async () => {
      try {
        const r = await domainApi.switchStatus(selected.resource_id);
        if (!alive) return;
        const workflow = r.data?.workflow || null;
        setSwitchInfo(workflow);

        if (workflow?.workflow_id !== pollingWorkflowId) return;
        if (['completed', 'partial', 'failed'].includes(workflow?.status)) {
          setPollingWorkflowId(null);
          setSwitching(false);
          loadDomainDetail(selected.resource_id);
        }
      } catch {
        // keep polling on transient failures
      }
    };

    poll();
    const timer = setInterval(poll, 2000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [pollingWorkflowId, selected?.resource_id, loadDomainDetail]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this domain?')) return;
    await domainApi.delete(id).catch(() => {});
    if (selected?.resource_id === id) setSelected(null);
    loadDomains();
  };

  const handleAddDns = async () => {
    if (!selected || !newDnsName || !newDnsValue) return;
    setAddingDns(true);
    try {
      await domainApi.addDnsRecord(selected.resource_id, {
        name:        newDnsName,
        record_type: newDnsType,
        records:     [newDnsValue],
        ttl:         newDnsTtl,
      });
      setNewDnsName(''); setNewDnsValue('');
      loadDns(selected.resource_id);
    } catch {} finally { setAddingDns(false); }
  };

  const handleDeleteDns = async (recordset_id: string) => {
    if (!selected) return;
    await domainApi.deleteDnsRecord(selected.resource_id, recordset_id).catch(() => {});
    loadDns(selected.resource_id);
  };

  const handleRequestSsl = async () => {
    if (!selected) return;
    await domainApi.requestSsl(selected.resource_id).catch(() => {});
    loadSsl(selected.resource_id);
  };

  const handleTogglePrivacy = async () => {
    if (!selected) return;
    await domainApi.setPrivacy(selected.resource_id, !selected.whois_privacy).catch(() => {});
    loadDomains();
  };

  const handleEnableDnssec = async () => {
    if (!selected) return;
    await domainApi.enableDnssec(selected.resource_id).catch(() => {});
    loadDomains();
    loadDomainDetail(selected.resource_id);
  };

  const handleSwitchDomain = async () => {
    if (!selected) return;
    setSwitching(true);
    try {
      const targetEndpoint = window.prompt('Optional target endpoint (IP or hostname). Leave empty for auto-discovery.', '') || '';
      const response = await domainApi.switchDomain(
        selected.resource_id,
        targetEndpoint ? { target_endpoint: targetEndpoint } : {}
      );
      setSwitchInfo(response.data);
      if (response.data?.workflow_id) {
        setPollingWorkflowId(response.data.workflow_id);
      } else {
        setSwitching(false);
      }
      setDetailTab(5);
    } catch {
      setSwitchInfo({ status: 'failed', message: 'Domain switch workflow failed.' });
      setSwitching(false);
    } finally {
      // keep switching=true while queued/running and polling is active
    }
  };

  // ── Render helpers ────────────────────────────────────────────────────────
  const fieldSx = {
    '& .MuiOutlinedInput-notchedOutline': { borderColor: t.border },
    '& .MuiInputBase-input': { color: t.text },
    '& .MuiInputLabel-root': { color: t.muted },
  };

  const thSx = { color: t.muted, fontSize: '0.75rem', textTransform: 'uppercase' as const, fontWeight: 600 };
  const tdSx = { color: t.text, borderColor: t.border };

  const expireLabel = (d: Domain) => {
    if (!d.days_until_expiry) return '—';
    if (d.days_until_expiry < 0) return <span style={{ color: dashboardSemanticColors.danger }}>Expired</span>;
    if (d.days_until_expiry < 30) return <span style={{ color: dashboardSemanticColors.warning }}>{d.days_until_expiry}d</span>;
    return `${d.days_until_expiry}d`;
  };

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <Box sx={{ display: 'flex', height: '100%', bgcolor: t.panelBg }}>

      {/* ── Left panel ─────────────────────────────────────────────────── */}
      <Box sx={{
        width: 320, minWidth: 260, flexShrink: 0,
        borderRight: `1px solid ${t.border}`,
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <Box sx={{ p: 2, borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', gap: 1 }}>
          <DomainIcon sx={{ color: t.muted, fontSize: 20 }} />
          <Typography sx={{ color: t.text, fontWeight: 700, flex: 1 }}>Domains</Typography>
          <Tooltip title="Refresh"><IconButton size="small" onClick={loadDomains}><RefreshIcon sx={{ color: t.muted, fontSize: 18 }} /></IconButton></Tooltip>
        </Box>

        {/* Actions */}
        <Box sx={{ p: 2, display: 'flex', gap: 1, borderBottom: `1px solid ${t.border}` }}>
          <Button
            size="small" variant="contained" startIcon={<AddIcon />}
            onClick={() => setShowRegister(true)}
            sx={{ bgcolor: t.brand, flex: 1, '&:hover': { bgcolor: dashboardTokens.colors.brandPrimaryHover } }}
          >Register</Button>
          <Button
            size="small" variant="outlined" startIcon={<SwapHorizIcon />}
            onClick={() => setShowTransfer(true)}
            sx={{ color: t.text, borderColor: t.border, flex: 1 }}
          >Transfer</Button>
        </Box>

        {/* List */}
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {loading && <Box sx={{ p: 3, textAlign: 'center' }}><CircularProgress size={24} /></Box>}
          {error   && <Alert severity="error" sx={{ m: 1 }}>{error}</Alert>}
          {!loading && domains.length === 0 && (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <DomainIcon sx={{ fontSize: 40, color: t.muted, mb: 1 }} />
              <Typography sx={{ color: t.muted }}>No domains registered</Typography>
            </Box>
          )}
          {domains.map(d => (
            <Box
              key={d.resource_id}
              onClick={() => handleSelect(d)}
              sx={{
                px: 2, py: 1.5,
                cursor: 'pointer',
                bgcolor: selected?.resource_id === d.resource_id ? t.hover : 'transparent',
                borderLeft: selected?.resource_id === d.resource_id ? `3px solid ${t.brand}` : '3px solid transparent',
                '&:hover': { bgcolor: t.hover },
                borderBottom: `1px solid ${t.border}`,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography sx={{ color: t.text, fontWeight: 600, fontSize: '0.875rem', fontFamily: 'monospace' }}>
                  {d.domain_name}
                </Typography>
                <Chip
                  size="small"
                  label={d.status}
                  sx={{ bgcolor: STATUS_COLOUR[d.status] ?? t.muted, color: dashboardTokens.colors.white, fontSize: '0.65rem' }}
                />
              </Box>
              <Box sx={{ display: 'flex', gap: 1, mt: 0.5, alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Typography sx={{ color: t.muted, fontSize: '0.75rem' }}>Expires: {expireLabel(d)}</Typography>
                  {d.auto_renew && <AutorenewIcon sx={{ fontSize: 14, color: dashboardSemanticColors.success }} />}
                </Box>
                {onManage && (
                  <Typography
                    onClick={e => { e.stopPropagation(); onManage(d.resource_id); }}
                    sx={{ fontSize: '.72rem', color: t.brand, cursor: 'pointer', fontWeight: 600, '&:hover': { textDecoration: 'underline' } }}
                  >
                    Manage →
                  </Typography>
                )}
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      {/* ── Right detail panel ──────────────────────────────────────────── */}
      {!selected ? (
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 2 }}>
          <DomainIcon sx={{ fontSize: 56, color: t.muted }} />
          <Typography sx={{ color: t.muted }}>Select a domain to view details</Typography>
        </Box>
      ) : (
        <Box sx={{ flex: 1, overflow: 'auto', p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Domain header */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="h5" sx={{ color: t.text, fontWeight: 700, fontFamily: 'monospace' }}>
                {selected.domain_name}
              </Typography>
              <Chip
                size="small"
                label={selected.status}
                sx={{ mt: 0.5, bgcolor: STATUS_COLOUR[selected.status] ?? t.muted, color: dashboardTokens.colors.white }}
              />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Button
                size="small"
                variant="contained"
                startIcon={<RocketLaunchIcon />}
                onClick={handleSwitchDomain}
                disabled={switching && ['queued', 'running'].includes((switchInfo?.status || '').toString())}
                sx={{ bgcolor: t.brand, '&:hover': { bgcolor: dashboardTokens.colors.brandPrimaryHover } }}
              >
                {(switching && ['queued', 'running'].includes((switchInfo?.status || '').toString())) ? 'Switching...' : 'Switch Domain'}
              </Button>
              <Tooltip title="Delete domain">
                <IconButton onClick={() => handleDelete(selected.resource_id)}>
                  <DeleteIcon sx={{ color: dashboardSemanticColors.danger }} />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {/* Tabs */}
          <Tabs
            value={detailTab}
            onChange={(_, v) => setDetailTab(v)}
            sx={{
              borderBottom: `1px solid ${t.border}`,
              '& .MuiTab-root': { color: t.muted, textTransform: 'none' },
              '& .Mui-selected': { color: t.text },
              '& .MuiTabs-indicator': { bgcolor: t.brand },
            }}
          >
            <Tab label="Overview" />
            <Tab label="DNS Records" />
            <Tab label="SSL Certificates" />
            <Tab label="Transfers" />
            <Tab label="Settings" />
            <Tab label="Automation" />
          </Tabs>

          {/* ── Overview ─────────────────────────────────────────────── */}
          {detailTab === 0 && (
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              {[
                ['Resource ID',    selected.resource_id],
                ['Registered',     selected.registered_at ? new Date(selected.registered_at).toLocaleDateString() : '—'],
                ['Expires',        selected.expires_at   ? new Date(selected.expires_at).toLocaleDateString()    : '—'],
                ['Days Until Expiry', selected.days_until_expiry ?? '—'],
                ['Auto-Renew',     selected.auto_renew   ? 'Yes' : 'No'],
                ['WHOIS Privacy',  selected.whois_privacy ? 'Enabled' : 'Disabled'],
                ['DNSSEC',         selected.dnssec_enabled ? 'Enabled' : 'Disabled'],
                ['Linked Compute', selected.linked_compute_id || '—'],
              ].map(([k, v]) => (
                <Box key={k as string} sx={{ bgcolor: t.cardBg, p: 2, borderRadius: 1, border: `1px solid ${t.border}` }}>
                  <Typography sx={{ color: t.muted, fontSize: '0.75rem', mb: 0.5 }}>{k}</Typography>
                  <Typography sx={{ color: t.text, fontWeight: 600, wordBreak: 'break-all' }}>{v as React.ReactNode}</Typography>
                </Box>
              ))}
              {/* Nameservers */}
              <Box sx={{ bgcolor: t.cardBg, p: 2, borderRadius: 1, border: `1px solid ${t.border}`, gridColumn: '1/-1' }}>
                <Typography sx={{ color: t.muted, fontSize: '0.75rem', mb: 1 }}>Nameservers</Typography>
                {(selected.nameservers ?? []).map(ns => (
                  <Typography key={ns} sx={{ color: t.text, fontSize: '0.85rem', fontFamily: 'monospace' }}>{ns}</Typography>
                ))}
              </Box>
            </Box>
          )}

          {/* ── DNS Records ───────────────────────────────────────────── */}
          {detailTab === 1 && (
            <Box>
              {/* Add record form */}
              <Box sx={{ bgcolor: t.cardBg, p: 2, border: `1px solid ${t.border}`, borderRadius: 1, mb: 2 }}>
                <Typography sx={{ color: t.text, fontWeight: 600, mb: 1.5 }}>Add DNS Record</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'flex-end' }}>
                  <TextField size="small" label="Name" placeholder="@ or subdomain" value={newDnsName}
                    onChange={e => setNewDnsName(e.target.value)} sx={{ ...fieldSx, width: 160 }} />
                  <TextField size="small" label="Type" select SelectProps={{ native: true }} value={newDnsType}
                    onChange={e => setNewDnsType(e.target.value as DnsRecordType)} sx={{ ...fieldSx, width: 100 }}>
                    {DNS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </TextField>
                  <TextField size="small" label="Value" value={newDnsValue}
                    onChange={e => setNewDnsValue(e.target.value)} sx={{ ...fieldSx, flex: 1, minWidth: 180 }} />
                  <TextField size="small" label="TTL" type="number" value={newDnsTtl}
                    onChange={e => setNewDnsTtl(Number(e.target.value))} sx={{ ...fieldSx, width: 80 }} />
                  <Button variant="contained" size="small" onClick={handleAddDns}
                    disabled={addingDns || !newDnsName || !newDnsValue}
                    sx={{ bgcolor: t.brand, height: 40 }}>
                    {addingDns ? <CircularProgress size={18} color="inherit" /> : 'Add'}
                  </Button>
                </Box>
              </Box>

              {dnsLoading
                ? <CircularProgress size={24} />
                : (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        {['Name','Type','Records','TTL',''].map(h => (
                          <TableCell key={h} sx={{ ...thSx, borderColor: t.border }}>{h}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {dnsRecords.map(r => (
                        <TableRow key={r.id} hover>
                          <TableCell sx={{ ...tdSx, fontFamily: 'monospace' }}>{r.name}</TableCell>
                          <TableCell sx={tdSx}><Chip size="small" label={r.record_type} /></TableCell>
                          <TableCell sx={{ ...tdSx, fontFamily: 'monospace', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {r.records.join(', ')}
                          </TableCell>
                          <TableCell sx={tdSx}>{r.ttl}</TableCell>
                          <TableCell sx={{ ...tdSx, width: 40 }}>
                            <IconButton size="small" onClick={() => handleDeleteDns(r.recordset_id)}>
                              <DeleteIcon sx={{ fontSize: 16, color: dashboardSemanticColors.danger }} />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                      {dnsRecords.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} sx={{ ...tdSx, textAlign: 'center', py: 3 }}>
                            No DNS records yet
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )
              }
            </Box>
          )}

          {/* ── SSL Certificates ──────────────────────────────────────── */}
          {detailTab === 2 && (
            <Box>
              <Button
                size="small" variant="contained" startIcon={<HttpsIcon />}
                onClick={handleRequestSsl}
                sx={{ bgcolor: t.brand, mb: 2, '&:hover': { bgcolor: dashboardTokens.colors.brandPrimaryHover } }}
              >Request SSL Certificate</Button>

              {sslLoading
                ? <CircularProgress size={24} />
                : sslCerts.length === 0
                  ? <Typography sx={{ color: t.muted }}>No certificates found.</Typography>
                  : sslCerts.map(cert => (
                    <Box key={cert.cert_id} sx={{ bgcolor: t.cardBg, p: 2, borderRadius: 1, border: `1px solid ${t.border}`, mb: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography sx={{ color: t.text, fontWeight: 600, fontFamily: 'monospace' }}>{cert.common_name}</Typography>
                        <Chip size="small" label={cert.status}
                          sx={{ bgcolor: SSL_COLOUR[cert.status] ?? t.muted, color: dashboardTokens.colors.white }} />
                      </Box>
                      <Typography sx={{ color: t.muted, fontSize: '0.8rem' }}>
                        Issuer: {cert.issuer} · Expires: {cert.expires_at ? new Date(cert.expires_at).toLocaleDateString() : '—'}
                      </Typography>
                    </Box>
                  ))
              }
            </Box>
          )}

          {/* ── Transfers ─────────────────────────────────────────────── */}
          {detailTab === 3 && (
            <Box>
              {(selected.transfers ?? []).length === 0
                ? <Typography sx={{ color: t.muted }}>No transfer history.</Typography>
                : (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        {['Status','Initiated','Completed','Notes'].map(h => (
                          <TableCell key={h} sx={{ ...thSx, borderColor: t.border }}>{h}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selected.transfers!.map(tr => (
                        <TableRow key={tr.id} hover>
                          <TableCell sx={tdSx}><Chip size="small" label={tr.status} /></TableCell>
                          <TableCell sx={tdSx}>{new Date(tr.initiated_at).toLocaleDateString()}</TableCell>
                          <TableCell sx={tdSx}>{tr.completed_at ? new Date(tr.completed_at).toLocaleDateString() : '—'}</TableCell>
                          <TableCell sx={tdSx}>{tr.error_message ?? '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )
              }
            </Box>
          )}

          {/* ── Settings ──────────────────────────────────────────────── */}
          {detailTab === 4 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Privacy */}
              <Box sx={{ bgcolor: t.cardBg, p: 2, borderRadius: 1, border: `1px solid ${t.border}` }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography sx={{ color: t.text, fontWeight: 600 }}>WHOIS Privacy</Typography>
                    <Typography sx={{ color: t.muted, fontSize: '0.8rem' }}>Hide registrant contact info</Typography>
                  </Box>
                  <Switch checked={selected.whois_privacy} onChange={handleTogglePrivacy} />
                </Box>
              </Box>

              {/* DNSSEC */}
              <Box sx={{ bgcolor: t.cardBg, p: 2, borderRadius: 1, border: `1px solid ${t.border}` }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography sx={{ color: t.text, fontWeight: 600 }}>DNSSEC</Typography>
                    <Typography sx={{ color: t.muted, fontSize: '0.8rem' }}>Enable DNS Security Extensions</Typography>
                  </Box>
                  {selected.dnssec_enabled
                    ? <VerifiedUserIcon sx={{ color: dashboardSemanticColors.success }} />
                    : <Button size="small" variant="outlined" onClick={handleEnableDnssec}
                        sx={{ color: t.text, borderColor: t.border }}>Enable</Button>
                  }
                </Box>
              </Box>

              {/* Nameservers */}
              <Box sx={{ bgcolor: t.cardBg, p: 2, borderRadius: 1, border: `1px solid ${t.border}` }}>
                <Typography sx={{ color: t.text, fontWeight: 600, mb: 1 }}>Custom Nameservers</Typography>
                {(selected.nameservers ?? []).map((ns, i) => (
                  <Typography key={i} sx={{ color: t.muted, fontSize: '0.85rem', fontFamily: 'monospace' }}>{ns}</Typography>
                ))}
              </Box>
            </Box>
          )}

          {detailTab === 5 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ bgcolor: t.cardBg, p: 2, borderRadius: 1, border: `1px solid ${t.border}` }}>
                <Typography sx={{ color: t.text, fontWeight: 700, mb: 1 }}>Domain Switch Workflow (TSTODNS)</Typography>
                <Typography sx={{ color: t.muted, fontSize: '0.85rem' }}>
                  Status: {(switchInfo?.status || (selected.metadata as any)?.domain_switch?.status || 'not started').toString()}
                </Typography>
                <Typography sx={{ color: t.muted, fontSize: '0.85rem' }}>
                  Workflow ID: {(switchInfo?.workflow_id || (selected.metadata as any)?.domain_switch?.workflow_id || '—').toString()}
                </Typography>
                <Typography sx={{ color: t.muted, fontSize: '0.85rem' }}>
                  Completed: {(switchInfo?.completed_at || (selected.metadata as any)?.domain_switch?.completed_at)
                    ? new Date((switchInfo?.completed_at || (selected.metadata as any)?.domain_switch?.completed_at) as string).toLocaleString()
                    : '—'}
                </Typography>
              </Box>

              <Box sx={{ bgcolor: t.cardBg, p: 2, borderRadius: 1, border: `1px solid ${t.border}` }}>
                <Typography sx={{ color: t.text, fontWeight: 600, mb: 1 }}>Workflow Steps</Typography>
                {(((switchInfo?.steps as any[]) || ((selected.metadata as any)?.domain_switch?.steps as any[]) || [])).map((step: any, idx: number, arr: any[]) => (
                  <Box key={`${step?.step || 'step'}-${idx}`} sx={{ py: 1, borderBottom: idx === arr.length - 1 ? 'none' : `1px solid ${t.border}` }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography sx={{ color: t.text, fontWeight: 600, fontSize: '0.88rem' }}>{step?.step || 'step'}</Typography>
                      <Chip size="small" label={step?.status || 'unknown'} />
                    </Box>
                    <Typography sx={{ color: t.muted, fontSize: '0.8rem' }}>{step?.detail || '—'}</Typography>
                  </Box>
                ))}
                {!(((switchInfo?.steps as any[]) || ((selected.metadata as any)?.domain_switch?.steps as any[]) || []).length) && (
                  <Typography sx={{ color: t.muted, fontSize: '0.85rem' }}>
                    No workflow run yet. Click Switch Domain to execute DNS/LB/CDN/Email/Orchestration cascade updates.
                  </Typography>
                )}
              </Box>
            </Box>
          )}
        </Box>
      )}

      {/* Modals */}
      <RegisterDomainModal open={showRegister} onClose={() => setShowRegister(false)} onCreated={loadDomains} />
      <TransferDomainModal open={showTransfer} onClose={() => setShowTransfer(false)} onCreated={loadDomains} />
    </Box>
  );
};

export default DomainPage;
