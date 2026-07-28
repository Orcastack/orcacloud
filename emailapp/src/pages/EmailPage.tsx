import React, { useCallback, useEffect, useState } from 'react';
import {
  Box, Typography, Button, Chip, IconButton, Tooltip,
  Table, TableHead, TableRow, TableCell, TableBody,
  Tabs, Tab, CircularProgress, Alert, LinearProgress,
  TextField, InputAdornment,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import EmailIcon          from '@mui/icons-material/Email';
import AddIcon            from '@mui/icons-material/Add';
import RefreshIcon        from '@mui/icons-material/Refresh';
import DeleteIcon         from '@mui/icons-material/DeleteOutline';
import CheckCircleIcon    from '@mui/icons-material/CheckCircle';
import CancelIcon         from '@mui/icons-material/Cancel';
import CloudSyncIcon      from '@mui/icons-material/CloudSync';
import KeyIcon            from '@mui/icons-material/VpnKey';
import OpenInNewIcon      from '@mui/icons-material/OpenInNew';
import ContentCopyIcon    from '@mui/icons-material/ContentCopy';
import PauseCircleIcon    from '@mui/icons-material/PauseCircle';
import PlayCircleIcon     from '@mui/icons-material/PlayCircle';
import { emailApi }       from '../services/cloudApi';
import type {
  EmailDomain, Mailbox, EmailAlias,
  EmailActivityLog, MailClientSettings,
} from '../types/email';
import CreateMailboxModal from '../components/Cloud/CreateMailboxModal';
import {
  dashboardTokens,
  dashboardSemanticColors,
  dashboardStatusColors,
} from '../styles/dashboardDesignSystem';

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_COLOUR: Record<string, string> = {
  active: dashboardStatusColors.domain.active,
  pending: dashboardStatusColors.domain.pending,
  disabled: dashboardTokens.colors.textSecondary,
  error: dashboardStatusColors.domain.error,
  suspended: dashboardStatusColors.domain.pending,
  creating: dashboardSemanticColors.info,
  deleted: dashboardTokens.colors.textSecondary,
};

const WHITE = dashboardTokens.colors.white;
const SUCCESS = dashboardSemanticColors.success;
const WARNING = dashboardSemanticColors.warning;
const DANGER = dashboardSemanticColors.danger;

const DnsRow: React.FC<{
  label: string; done: boolean; record?: string; t: any;
}> = ({ label, done, record, t }) => (
  <Box sx={{
    display: 'flex', alignItems: 'center', gap: 1.5,
    p: 1.5, bgcolor: t.cardBg, borderRadius: 1, border: `1px solid ${t.border}`,
  }}>
    {done
      ? <CheckCircleIcon sx={{ color: SUCCESS, flexShrink: 0 }} />
      : <CancelIcon sx={{ color: DANGER, flexShrink: 0 }} />}
    <Box sx={{ flex: 1, overflow: 'hidden' }}>
      <Typography sx={{ color: t.text, fontWeight: 600, fontSize: '0.875rem' }}>{label}</Typography>
      {record && (
        <Typography sx={{
          color: t.muted, fontSize: '0.75rem',
          fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{record}</Typography>
      )}
    </Box>
    {done && (
      <Chip size="small" label="Provisioned" sx={{ bgcolor: `${SUCCESS}22`, color: SUCCESS }} />
    )}
  </Box>
);

// ── Component ─────────────────────────────────────────────────────────────────

const EmailPage: React.FC = () => {
  const theme  = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const t = {
    panelBg: isDark ? 'rgba(13,24,38,1)' : dashboardTokens.colors.surfaceSubtle,
    cardBg: isDark ? 'rgba(19,35,54,1)' : dashboardTokens.colors.surface,
    border: isDark ? 'rgba(30,58,95,1)' : dashboardTokens.colors.border,
    brand: '#153d75',
    brandHover: '#0f2d5a',
    hover: isDark ? 'rgba(16,37,72,1)' : dashboardTokens.colors.surfaceHover,
    text: isDark ? 'rgba(224,233,244,1)' : dashboardTokens.colors.textPrimary,
    muted: isDark ? 'rgba(107,138,171,1)' : dashboardTokens.colors.textSecondary,
  };

  // ── State ─────────────────────────────────────────────────────────────────
  const [emailDomains,  setEmailDomains]  = useState<EmailDomain[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const [selected,      setSelected]      = useState<EmailDomain | null>(null);
  const [tab,           setTab]           = useState(0);

  const [mailboxes,     setMailboxes]     = useState<Mailbox[]>([]);
  const [aliases,       setAliases]       = useState<EmailAlias[]>([]);
  const [activity,      setActivity]      = useState<EmailActivityLog[]>([]);
  const [settings,      setSettings]      = useState<MailClientSettings | null>(null);
  const [subLoading,    setSubLoading]    = useState(false);

  // Alias add form
  const [aliasLocal,    setAliasLocal]    = useState('');
  const [aliasDest,     setAliasDest]     = useState('');
  const [addingAlias,   setAddingAlias]   = useState(false);

  // Modals
  const [showMailbox,   setShowMailbox]   = useState(false);
  const [dnsLoading,    setDnsLoading]    = useState(false);
  const [dkimLoading,   setDkimLoading]   = useState(false);
  const [copied,        setCopied]        = useState('');

  // ── Loaders ───────────────────────────────────────────────────────────────
  const loadEmailDomains = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const r = await emailApi.emailDomains();
      const raw = Array.isArray(r.data) ? r.data : (r.data as any).results ?? [];
      setEmailDomains(raw);
    } catch { setError('Failed to load email domains.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadEmailDomains(); }, [loadEmailDomains]);

  const loadTab = useCallback(async (ed: EmailDomain, tabIndex: number) => {
    setSubLoading(true);
    try {
      if (tabIndex === 0) {
        const r = await emailApi.listMailboxes();
        const allBoxes = Array.isArray(r.data) ? r.data : (r.data as any).results ?? [];
        setMailboxes(allBoxes.filter((m: Mailbox) => m.domain_name === ed.domain_name));
      } else if (tabIndex === 1) {
        const r = await emailApi.listAliases();
        const all = Array.isArray(r.data) ? r.data : (r.data as any).results ?? [];
        setAliases(all.filter((a: EmailAlias) => a.alias_address.endsWith(`@${ed.domain_name}`)));
      } else if (tabIndex === 2) {
        // DNS tab has no async load – state comes from emailDomain object
      } else if (tabIndex === 3) {
        const r = await emailApi.clientSettings(ed.id);
        setSettings(r.data as MailClientSettings);
      } else if (tabIndex === 4) {
        const r = await emailApi.emailActivity(ed.id);
        setActivity(Array.isArray(r.data) ? r.data : []);
      }
    } catch {} finally { setSubLoading(false); }
  }, []);

  const handleSelect = (ed: EmailDomain) => {
    setSelected(ed);
    setTab(0);
    setMailboxes([]); setAliases([]); setActivity([]); setSettings(null);
  };

  useEffect(() => {
    if (selected) loadTab(selected, tab);
  }, [tab, selected, loadTab]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleProvisionDns = async () => {
    if (!selected) return;
    setDnsLoading(true);
    try {
      const r = await emailApi.provisionDns(selected.id);
      setSelected(r.data as EmailDomain);
      setEmailDomains(prev => prev.map(d => d.id === selected.id ? r.data as EmailDomain : d));
    } catch {} finally { setDnsLoading(false); }
  };

  const handleGenerateDkim = async () => {
    if (!selected) return;
    setDkimLoading(true);
    try {
      await emailApi.generateDkim(selected.id, 'default');
      const r = await emailApi.getEmailDomain(selected.id);
      setSelected(r.data as EmailDomain);
    } catch {} finally { setDkimLoading(false); }
  };

  const handleDeleteMailbox = async (rid: string) => {
    if (!window.confirm('Delete this mailbox?')) return;
    await emailApi.deleteMailbox(rid).catch(() => {});
    if (selected) loadTab(selected, 0);
  };

  const handleSuspend = async (rid: string, isSuspended: boolean) => {
    if (isSuspended) await emailApi.activateMailbox(rid).catch(() => {});
    else             await emailApi.suspendMailbox(rid).catch(() => {});
    if (selected) loadTab(selected, 0);
  };

  const handleDeleteAlias = async (id: number) => {
    await emailApi.deleteAlias(id).catch(() => {});
    if (selected) loadTab(selected, 1);
  };

  const handleAddAlias = async () => {
    if (!selected || !aliasLocal || !aliasDest) return;
    setAddingAlias(true);
    try {
      await emailApi.createAlias({
        domain_resource_id: selected.domain_name, // conceptually — we'd pass the domain rid
        local_part: aliasLocal,
        destinations: aliasDest.split(',').map(s => s.trim()).filter(Boolean),
      });
      setAliasLocal(''); setAliasDest('');
      loadTab(selected, 1);
    } catch {} finally { setAddingAlias(false); }
  };

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  // ── Render helpers ────────────────────────────────────────────────────────
  const thSx = { color: t.muted, fontSize: '0.75rem', textTransform: 'uppercase' as const, fontWeight: 600 };
  const tdSx = { color: t.text, borderColor: t.border };
  const fieldSx = {
    '& .MuiOutlinedInput-notchedOutline': { borderColor: t.border },
    '& .MuiInputBase-input': { color: t.text },
    '& .MuiInputLabel-root': { color: t.muted },
  };

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <Box sx={{ display: 'flex', height: '100%', bgcolor: t.panelBg }}>

      {/* ── Left panel ─────────────────────────────────────────────────── */}
      <Box sx={{
        width: 300, minWidth: 240, flexShrink: 0,
        borderRight: `1px solid ${t.border}`,
        display: 'flex', flexDirection: 'column',
      }}>
        <Box sx={{ p: 2, borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', gap: 1 }}>
          <EmailIcon sx={{ color: t.muted, fontSize: 20 }} />
          <Typography sx={{ color: t.text, fontWeight: 700, flex: 1 }}>Email Hosting</Typography>
          <Tooltip title="Refresh">
            <IconButton size="small" onClick={loadEmailDomains}>
              <RefreshIcon sx={{ color: t.muted, fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Box>

        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {loading && <Box sx={{ p: 3, textAlign: 'center' }}><CircularProgress size={24} /></Box>}
          {error   && <Alert severity="error" sx={{ m: 1 }}>{error}</Alert>}
          {!loading && emailDomains.length === 0 && (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <EmailIcon sx={{ fontSize: 40, color: t.muted, mb: 1 }} />
              <Typography sx={{ color: t.muted, mb: 1 }}>No email domains</Typography>
              <Typography sx={{ color: t.muted, fontSize: '0.8rem' }}>
                Enable email hosting from a Domain's settings
              </Typography>
            </Box>
          )}
          {emailDomains.map(ed => (
            <Box
              key={ed.id}
              onClick={() => handleSelect(ed)}
              sx={{
                px: 2, py: 1.5, cursor: 'pointer',
                bgcolor: selected?.id === ed.id ? t.hover : 'transparent',
                borderLeft: selected?.id === ed.id ? `3px solid ${t.brand}` : '3px solid transparent',
                borderBottom: `1px solid ${t.border}`,
                '&:hover': { bgcolor: t.hover },
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography sx={{ color: t.text, fontWeight: 600, fontSize: '0.85rem', fontFamily: 'monospace' }}>
                  @{ed.domain_name}
                </Typography>
                <Chip size="small" label={ed.status}
                  sx={{ bgcolor: STATUS_COLOUR[ed.status] ?? dashboardTokens.colors.textSecondary, color: WHITE, fontSize: '0.65rem' }} />
              </Box>
              <Typography sx={{ color: t.muted, fontSize: '0.75rem', mt: 0.25 }}>
                {ed.mailbox_count} mailbox{ed.mailbox_count !== 1 ? 'es' : ''}
                {' · '}
                {ed.alias_count} alias{ed.alias_count !== 1 ? 'es' : ''}
              </Typography>
              {/* DNS health bar */}
              <Box sx={{ mt: 0.75 }}>
                <LinearProgress
                  variant="determinate"
                  value={[ed.mx_provisioned, ed.spf_provisioned,
                          ed.dkim_provisioned, ed.dmarc_provisioned
                         ].filter(Boolean).length * 25}
                  sx={{ height: 3, borderRadius: 2,
                       bgcolor: t.border,
                        '& .MuiLinearProgress-bar': { bgcolor: ed.dns_ready ? SUCCESS : WARNING } }}
                />
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      {/* ── Right panel ─────────────────────────────────────────────────── */}
      {!selected ? (
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 2 }}>
          <EmailIcon sx={{ fontSize: 56, color: t.muted }} />
          <Typography sx={{ color: t.muted }}>Select a domain to manage email</Typography>
        </Box>
      ) : (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Header */}
          <Box sx={{
            px: 3, py: 2, display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', borderBottom: `1px solid ${t.border}`,
          }}>
            <Box>
              <Typography variant="h6" sx={{ color: t.text, fontWeight: 700, fontFamily: 'monospace' }}>
                @{selected.domain_name}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                <Chip size="small" label={selected.status}
                  sx={{ bgcolor: STATUS_COLOUR[selected.status] ?? dashboardTokens.colors.textSecondary, color: WHITE }} />
                {selected.dns_ready
                  ? <Chip size="small" label="DNS Ready" sx={{ bgcolor: `${SUCCESS}22`, color: SUCCESS }} />
                  : <Chip size="small" label="DNS Pending" sx={{ bgcolor: `${WARNING}22`, color: WARNING }} />}
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {selected.webmail_url && (
                <Tooltip title="Open Webmail">
                  <IconButton component="a" href={selected.webmail_url} target="_blank">
                    <OpenInNewIcon sx={{ color: t.muted }} />
                  </IconButton>
                </Tooltip>
              )}
              <Button size="small" variant="contained" startIcon={<AddIcon />}
                onClick={() => setShowMailbox(true)}
                sx={{ bgcolor: t.brand, '&:hover': { bgcolor: t.brandHover } }}>
                Add Mailbox
              </Button>
            </Box>
          </Box>

          {/* Tabs */}
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            sx={{
              px: 2, borderBottom: `1px solid ${t.border}`,
              '& .MuiTab-root': { color: t.muted, textTransform: 'none', minHeight: 44 },
              '& .Mui-selected': { color: t.text },
              '& .MuiTabs-indicator': { bgcolor: t.brand },
            }}
          >
            <Tab label="Mailboxes" />
            <Tab label="Aliases" />
            <Tab label="DNS Records" />
            <Tab label="Client Settings" />
            <Tab label="Activity" />
          </Tabs>

          <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
            {subLoading && <CircularProgress size={24} sx={{ mb: 2 }} />}

            {/* ── Mailboxes ────────────────────────────────────────── */}
            {tab === 0 && (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {['Email Address','Name','Status','Quota','Admin','Actions'].map(h => (
                      <TableCell key={h} sx={{ ...thSx, borderColor: t.border }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {mailboxes.map(m => (
                    <TableRow key={m.resource_id} hover>
                      <TableCell sx={{ ...tdSx, fontFamily: 'monospace' }}>{m.email_address}</TableCell>
                      <TableCell sx={tdSx}>{[m.first_name, m.last_name].filter(Boolean).join(' ') || '—'}</TableCell>
                      <TableCell sx={tdSx}>
                        <Chip size="small" label={m.status}
                          sx={{ bgcolor: STATUS_COLOUR[m.status] ?? dashboardTokens.colors.textSecondary, color: WHITE, fontSize: '0.65rem' }} />
                      </TableCell>
                      <TableCell sx={tdSx}>
                        <Box>
                          <Typography sx={{ fontSize: '0.75rem', color: t.muted }}>
                            {m.used_mb} / {m.quota_mb} MB
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={Math.min(m.quota_used_pct, 100)}
                            sx={{
                              height: 4, borderRadius: 2, mt: 0.25,
                              bgcolor: t.border,
                              '& .MuiLinearProgress-bar': {
                                bgcolor: m.quota_used_pct > 90 ? DANGER
                                         : m.quota_used_pct > 70 ? WARNING
                                         : SUCCESS,
                              },
                            }}
                          />
                        </Box>
                      </TableCell>
                      <TableCell sx={tdSx}>{m.is_admin ? 'OK' : '—'}</TableCell>
                      <TableCell sx={tdSx}>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title={m.status === 'suspended' ? 'Activate' : 'Suspend'}>
                            <IconButton size="small"
                              onClick={() => handleSuspend(m.resource_id, m.status === 'suspended')}>
                              {m.status === 'suspended'
                                ? <PlayCircleIcon sx={{ fontSize: 16, color: SUCCESS }} />
                                : <PauseCircleIcon sx={{ fontSize: 16, color: WARNING }} />}
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" onClick={() => handleDeleteMailbox(m.resource_id)}>
                              <DeleteIcon sx={{ fontSize: 16, color: DANGER }} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                  {mailboxes.length === 0 && !subLoading && (
                    <TableRow>
                      <TableCell colSpan={6} sx={{ ...tdSx, textAlign: 'center', py: 4 }}>
                        No mailboxes yet — click <strong>Add Mailbox</strong> to create one.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}

            {/* ── Aliases ──────────────────────────────────────────── */}
            {tab === 1 && (
              <Box>
                {/* Add alias form */}
                <Box sx={{ bgcolor: t.cardBg, p: 2, border: `1px solid ${t.border}`, borderRadius: 1, mb: 2 }}>
                  <Typography sx={{ color: t.text, fontWeight: 600, mb: 1.5 }}>Add Alias</Typography>
                  <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <TextField size="small" label="From" placeholder="info"
                      value={aliasLocal} onChange={e => setAliasLocal(e.target.value.toLowerCase())}
                      sx={{ ...fieldSx, width: 160 }}
                      InputProps={{ endAdornment: (
                        <InputAdornment position="end">
                          <Typography sx={{ color: t.muted, fontSize: '0.8rem' }}>@{selected.domain_name}</Typography>
                        </InputAdornment>
                      )}}
                    />
                    <TextField size="small" label="Destinations (comma-separated)"
                      value={aliasDest} onChange={e => setAliasDest(e.target.value)}
                      sx={{ ...fieldSx, flex: 1, minWidth: 240 }} />
                    <Button variant="contained" size="small" onClick={handleAddAlias}
                      disabled={addingAlias || !aliasLocal || !aliasDest}
                      sx={{ bgcolor: t.brand, height: 40 }}>
                      {addingAlias ? <CircularProgress size={18} color="inherit" /> : 'Add'}
                    </Button>
                  </Box>
                </Box>

                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {['Alias','Destinations','Active',''].map(h => (
                        <TableCell key={h} sx={{ ...thSx, borderColor: t.border }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {aliases.map(a => (
                      <TableRow key={a.id} hover>
                        <TableCell sx={{ ...tdSx, fontFamily: 'monospace' }}>{a.alias_address}</TableCell>
                        <TableCell sx={{ ...tdSx, fontFamily: 'monospace' }}>
                          {a.destinations.join(', ')}
                        </TableCell>
                        <TableCell sx={tdSx}>
                          {a.is_active
                            ? <CheckCircleIcon sx={{ fontSize: 16, color: SUCCESS }} />
                            : <CancelIcon sx={{ fontSize: 16, color: DANGER }} />}
                        </TableCell>
                        <TableCell sx={tdSx}>
                          <IconButton size="small" onClick={() => handleDeleteAlias(a.id)}>
                            <DeleteIcon sx={{ fontSize: 16, color: DANGER }} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                    {aliases.length === 0 && !subLoading && (
                      <TableRow>
                        <TableCell colSpan={4} sx={{ ...tdSx, textAlign: 'center', py: 3 }}>
                          No aliases configured
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Box>
            )}

            {/* ── DNS Records ───────────────────────────────────────── */}
            {tab === 2 && (
              <Box>
                <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
                  <Button
                    variant="contained" size="small" startIcon={<CloudSyncIcon />}
                    onClick={handleProvisionDns} disabled={dnsLoading}
                    sx={{ bgcolor: t.brand, '&:hover': { bgcolor: t.brandHover } }}
                  >
                    {dnsLoading ? <CircularProgress size={18} color="inherit" /> : 'Provision All DNS'}
                  </Button>
                  <Button
                    variant="outlined" size="small" startIcon={<KeyIcon />}
                    onClick={handleGenerateDkim} disabled={dkimLoading}
                    sx={{ color: t.text, borderColor: t.border }}
                  >
                    {dkimLoading ? <CircularProgress size={18} color="inherit" /> : 'Rotate DKIM Key'}
                  </Button>
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <DnsRow t={t} label="MX Record"   done={selected.mx_provisioned}
                    record={`10 ${selected.mail_host}.`} />
                  <DnsRow t={t} label="SPF Record"  done={selected.spf_provisioned}
                    record={`v=spf1 mx include:${selected.mail_host} ~all`} />
                  <DnsRow t={t} label="DKIM Record" done={selected.dkim_provisioned}
                    record={selected.dkim_keys[0]?.dns_record || 'Not generated yet'} />
                  <DnsRow t={t} label="DMARC Record" done={selected.dmarc_provisioned}
                    record="v=DMARC1; p=quarantine; rua=mailto:dmarc@orcacloud.com" />
                </Box>

                {/* DKIM keys detail */}
                {selected.dkim_keys.length > 0 && (
                  <Box sx={{ mt: 3 }}>
                    <Typography sx={{ color: t.text, fontWeight: 600, mb: 1.5 }}>DKIM Keys</Typography>
                    {selected.dkim_keys.map(dk => (
                      <Box key={dk.id} sx={{
                        bgcolor: t.cardBg, p: 2, borderRadius: 1, border: `1px solid ${t.border}`, mb: 1,
                      }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                          <Typography sx={{ color: t.text, fontWeight: 600, fontFamily: 'monospace' }}>
                            {dk.selector}._domainkey.{selected.domain_name}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                            {dk.is_active && <Chip size="small" label="Active" sx={{ bgcolor: `${SUCCESS}22`, color: SUCCESS }} />}
                            <Tooltip title={copied === `dkim-${dk.id}` ? 'Copied!' : 'Copy DNS record'}>
                              <IconButton size="small" onClick={() => copy(dk.dns_record, `dkim-${dk.id}`)}>
                                <ContentCopyIcon sx={{ fontSize: 15, color: t.muted }} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </Box>
                        <Typography sx={{
                          color: t.muted, fontSize: '0.72rem', fontFamily: 'monospace',
                          wordBreak: 'break-all', lineHeight: 1.5,
                        }}>
                          {dk.dns_record.slice(0, 200)}{dk.dns_record.length > 200 ? '…' : ''}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            )}

            {/* ── Client Settings ───────────────────────────────────── */}
            {tab === 3 && settings && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Webmail */}
                <Box sx={{ bgcolor: t.cardBg, p: 2, borderRadius: 1, border: `1px solid ${t.border}` }}>
                  <Typography sx={{ color: t.text, fontWeight: 600, mb: 1 }}>Webmail</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography sx={{ color: t.muted, fontFamily: 'monospace' }}>{settings.webmail}</Typography>
                    <Tooltip title="Open">
                      <IconButton size="small" component="a" href={settings.webmail} target="_blank">
                        <OpenInNewIcon sx={{ fontSize: 16, color: t.muted }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>

                {/* Incoming */}
                <Box sx={{ bgcolor: t.cardBg, p: 2, borderRadius: 1, border: `1px solid ${t.border}` }}>
                  <Typography sx={{ color: t.text, fontWeight: 600, mb: 1.5 }}>Incoming Mail</Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                    {[
                      ['IMAP', settings.incoming.imap],
                      ['POP3', settings.incoming.pop3],
                    ].map(([proto, cfg]: any) => (
                      <Box key={proto} sx={{ p: 1.5, bgcolor: t.panelBg, borderRadius: 1 }}>
                        <Typography sx={{ color: t.muted, fontSize: '0.75rem', mb: 0.5 }}>{proto}</Typography>
                        <Typography sx={{ color: t.text, fontFamily: 'monospace', fontSize: '0.85rem' }}>{cfg.host}</Typography>
                        <Typography sx={{ color: t.muted, fontSize: '0.75rem' }}>Port {cfg.port} · {cfg.security}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>

                {/* Outgoing */}
                <Box sx={{ bgcolor: t.cardBg, p: 2, borderRadius: 1, border: `1px solid ${t.border}` }}>
                  <Typography sx={{ color: t.text, fontWeight: 600, mb: 1.5 }}>Outgoing Mail (SMTP)</Typography>
                  <Box sx={{ p: 1.5, bgcolor: t.panelBg, borderRadius: 1 }}>
                    <Typography sx={{ color: t.text, fontFamily: 'monospace', fontSize: '0.85rem' }}>
                      {settings.outgoing.smtp.host}
                    </Typography>
                    <Typography sx={{ color: t.muted, fontSize: '0.75rem' }}>
                      Port {settings.outgoing.smtp.port} · {settings.outgoing.smtp.security}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            )}
            {tab === 3 && !settings && !subLoading && (
              <Typography sx={{ color: t.muted }}>Loading client settings…</Typography>
            )}

            {/* ── Activity ──────────────────────────────────────────── */}
            {tab === 4 && (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {['Event','Detail','Actor','Date'].map(h => (
                      <TableCell key={h} sx={{ ...thSx, borderColor: t.border }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {activity.map(a => (
                    <TableRow key={a.id} hover>
                      <TableCell sx={tdSx}><Chip size="small" label={a.event} /></TableCell>
                      <TableCell sx={{ ...tdSx, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {a.detail || '—'}
                      </TableCell>
                      <TableCell sx={tdSx}>{a.actor_username ?? '—'}</TableCell>
                      <TableCell sx={{ ...tdSx, whiteSpace: 'nowrap' }}>
                        {new Date(a.created_at).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {activity.length === 0 && !subLoading && (
                    <TableRow>
                      <TableCell colSpan={4} sx={{ ...tdSx, textAlign: 'center', py: 3 }}>
                        No activity recorded
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </Box>
        </Box>
      )}

      {/* Modal */}
      {selected && (
        <CreateMailboxModal
          open={showMailbox}
          onClose={() => setShowMailbox(false)}
          onCreated={() => { setShowMailbox(false); if (selected) loadTab(selected, 0); }}
          domainResourceId={selected.domain_name}
          domainName={selected.domain_name}
        />
      )}
    </Box>
  );
};

export default EmailPage;
