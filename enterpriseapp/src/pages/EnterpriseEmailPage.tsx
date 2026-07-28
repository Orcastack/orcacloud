// OrcaCloud Enterprise – Email Services
// Standalone full-page email infrastructure management
// Route: /enterprise/:orgSlug/email

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, IconButton, Divider,
  Paper, Card, CardContent, Chip, CircularProgress, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Select, FormControl, InputLabel,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Tabs, Tab, Tooltip, Grid,
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardTopBar from '../components/Layout/DashboardTopBar';

import AddIcon              from '@mui/icons-material/Add';
import ArrowBackIcon        from '@mui/icons-material/ArrowBack';
import MailOutlineIcon      from '@mui/icons-material/MailOutline';
import CheckCircleIcon      from '@mui/icons-material/CheckCircle';
import CloseIcon            from '@mui/icons-material/Close';
import DeleteIcon           from '@mui/icons-material/Delete';
import EditIcon             from '@mui/icons-material/Edit';
import DnsIcon              from '@mui/icons-material/Dns';
import PersonIcon           from '@mui/icons-material/Person';
import ArticleIcon          from '@mui/icons-material/Article';
import HistoryIcon          from '@mui/icons-material/History';
import RefreshIcon          from '@mui/icons-material/Refresh';
import ContentCopyIcon      from '@mui/icons-material/ContentCopy';
import SendIcon             from '@mui/icons-material/Send';
import DomainIcon           from '@mui/icons-material/Domain';

import {
  sendDomainsApi, senderIdentitiesApi, emailTemplatesApi, emailLogsApi,
  organizationApi,
  type SendDomain, type SenderIdentity, type EmailTemplate, type EmailLogEntry,
} from '../services/enterpriseApi';

// ── Design tokens ──────────────────────────────────────────────────────────────
const T = {
  bg:     '#0d0f14',
  card:   '#13161d',
  card2:  '#0f1117',
  border: '#1e2330',
  text:   '#e8eaf0',
  sub:    '#6b7080',
  brand:  '#5b6aff',
  green:  '#22c55e',
  yellow: '#eab308',
  red:    '#ef4444',
  blue:   '#3b82f6',
  purple: '#a855f7',
  orange: '#f97316',
};

// ── Helpers ────────────────────────────────────────────────────────────────────
const StatusChip = ({ status }: { status: string }) => {
  const map: Record<string, [string, string]> = {
    VERIFIED:     [T.green,  'Verified'],
    ACTIVE:       [T.green,  'Active'],
    PENDING_DNS:  [T.yellow, 'Pending DNS'],
    FAILED:       [T.red,    'Failed'],
    SENT:         [T.green,  'Sent'],
    QUEUED:       [T.blue,   'Queued'],
    BOUNCED:      [T.orange, 'Bounced'],
    OPENED:       [T.purple, 'Opened'],
    CLICKED:      [T.brand,  'Clicked'],
  };
  const [color, label] = map[status] ?? [T.sub, status];
  return (
    <Chip
      label={label}
      size="small"
      sx={{ bgcolor: `${color}18`, color, fontWeight: 700, fontSize: '.73rem', height: 20 }}
    />
  );
};

const VerifyBadge = ({ ok }: { ok: boolean }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
    <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: ok ? T.green : T.yellow, flexShrink: 0 }} />
    <Typography sx={{ fontSize: '.8rem', color: ok ? T.green : T.yellow, fontWeight: 600 }}>
      {ok ? 'Pass' : 'Fail'}
    </Typography>
  </Box>
);

const copyToClipboard = (v: string) => navigator.clipboard.writeText(v).catch(() => {});

// ── Nav sections ───────────────────────────────────────────────────────────────
const NAV_SECTIONS = [
  { key: 'domains',    label: 'Sending Domains',   icon: <DnsIcon fontSize="small" /> },
  { key: 'identities', label: 'Sender Identities', icon: <PersonIcon fontSize="small" /> },
  { key: 'templates',  label: 'Email Templates',   icon: <ArticleIcon fontSize="small" /> },
  { key: 'logs',       label: 'Email Logs',        icon: <HistoryIcon fontSize="small" /> },
] as const;
type NavKey = typeof NAV_SECTIONS[number]['key'];

// ── Add Domain Dialog ─────────────────────────────────────────────────────────
function AddDomainDialog({
  open, orgId, onClose, onAdded,
}: { open: boolean; orgId: string; onClose: () => void; onAdded: (d: SendDomain) => void }) {
  const [domain, setDomain] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    if (!domain.trim()) { setErr('Domain is required'); return; }
    setSaving(true); setErr('');
    try {
      const d = await sendDomainsApi.add(orgId, { domain: domain.trim() });
      onAdded(d); onClose(); setDomain('');
    } catch (e: any) {
      setErr(e?.response?.data?.detail || 'Failed to add domain');
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 2 } }}>
      <DialogTitle sx={{ color: T.text, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <DnsIcon sx={{ color: T.brand }} /> Add Sending Domain
        <IconButton onClick={onClose} sx={{ ml: 'auto', color: T.sub }}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ borderColor: T.border }}>
        {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
        <Typography sx={{ color: T.sub, fontSize: '.85rem', mb: 2 }}>
          Enter your domain to generate DNS records for DKIM and SPF configuration.
        </Typography>
        <TextField
          fullWidth label="Domain" placeholder="mail.example.com" value={domain}
          onChange={e => setDomain(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submit(); }}
          sx={{ '& .MuiOutlinedInput-root': { color: T.text, '& fieldset': { borderColor: T.border } },
                '& .MuiInputLabel-root': { color: T.sub } }}
        />
      </DialogContent>
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={onClose} sx={{ color: T.sub }}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={saving}
          sx={{ bgcolor: T.brand, fontWeight: 700 }}>
          {saving ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : 'Add Domain'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Add Sender Identity Dialog ────────────────────────────────────────────────
function AddSenderDialog({
  open, orgId, onClose, onAdded,
}: { open: boolean; orgId: string; onClose: () => void; onAdded: (s: SenderIdentity) => void }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    if (!email.trim()) { setErr('Email is required'); return; }
    setSaving(true); setErr('');
    try {
      const s = await senderIdentitiesApi.add(orgId, { email: email.trim(), name: name.trim() });
      onAdded(s); onClose(); setEmail(''); setName('');
    } catch (e: any) {
      setErr(e?.response?.data?.detail || 'Failed to add sender');
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 2 } }}>
      <DialogTitle sx={{ color: T.text, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <PersonIcon sx={{ color: T.brand }} /> Add Sender Identity
        <IconButton onClick={onClose} sx={{ ml: 'auto', color: T.sub }}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ borderColor: T.border }}>
        {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField fullWidth label="From Email" placeholder="no-reply@example.com"
            value={email} onChange={e => setEmail(e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { color: T.text, '& fieldset': { borderColor: T.border } },
                  '& .MuiInputLabel-root': { color: T.sub } }} />
          <TextField fullWidth label="Display Name" placeholder="OrcaCloud"
            value={name} onChange={e => setName(e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { color: T.text, '& fieldset': { borderColor: T.border } },
                  '& .MuiInputLabel-root': { color: T.sub } }} />
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={onClose} sx={{ color: T.sub }}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={saving}
          sx={{ bgcolor: T.brand, fontWeight: 700 }}>
          {saving ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : 'Add Sender'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Create Template Dialog ─────────────────────────────────────────────────────
function CreateTemplateDialog({
  open, orgId, onClose, onCreated,
}: { open: boolean; orgId: string; onClose: () => void; onCreated: (t: EmailTemplate) => void }) {
  const [form, setForm] = useState({ name: '', subject: '', html_body: '', text_body: '' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    if (!form.name.trim() || !form.subject.trim()) { setErr('Name and subject are required'); return; }
    setSaving(true); setErr('');
    try {
      const t = await emailTemplatesApi.create(orgId, form);
      onCreated(t); onClose(); setForm({ name: '', subject: '', html_body: '', text_body: '' });
    } catch (e: any) {
      setErr(e?.response?.data?.detail || 'Failed to create template');
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth
      PaperProps={{ sx: { bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 2 } }}>
      <DialogTitle sx={{ color: T.text, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <ArticleIcon sx={{ color: T.brand }} /> New Email Template
        <IconButton onClick={onClose} sx={{ ml: 'auto', color: T.sub }}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ borderColor: T.border }}>
        {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField fullWidth label="Template Name" value={form.name} onChange={set('name')}
              sx={{ '& .MuiOutlinedInput-root': { color: T.text, '& fieldset': { borderColor: T.border } },
                    '& .MuiInputLabel-root': { color: T.sub } }} />
            <TextField fullWidth label="Subject Line" value={form.subject} onChange={set('subject')}
              sx={{ '& .MuiOutlinedInput-root': { color: T.text, '& fieldset': { borderColor: T.border } },
                    '& .MuiInputLabel-root': { color: T.sub } }} />
          </Box>
          <TextField fullWidth multiline rows={8} label="HTML Body" value={form.html_body} onChange={set('html_body')}
            placeholder="<html><body>Hello {{name}}, ...</body></html>"
            sx={{ '& .MuiOutlinedInput-root': { color: T.text, fontFamily: 'monospace', fontSize: '.82rem',
                    '& fieldset': { borderColor: T.border } },
                  '& .MuiInputLabel-root': { color: T.sub } }} />
          <TextField fullWidth multiline rows={4} label="Plain-text Body" value={form.text_body} onChange={set('text_body')}
            sx={{ '& .MuiOutlinedInput-root': { color: T.text, '& fieldset': { borderColor: T.border } },
                  '& .MuiInputLabel-root': { color: T.sub } }} />
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={onClose} sx={{ color: T.sub }}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={saving}
          sx={{ bgcolor: T.brand, fontWeight: 700 }}>
          {saving ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : 'Create Template'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
const EnterpriseEmailPage: React.FC = () => {
  const { orgSlug = '' } = useParams<{ orgSlug: string }>();
  const navigate = useNavigate();

  const [orgId,       setOrgId]       = useState('');
  const [section,     setSection]     = useState<NavKey>('domains');
  const [sendDomains, setSendDomains] = useState<SendDomain[]>([]);
  const [identities,  setIdentities]  = useState<SenderIdentity[]>([]);
  const [templates,   setTemplates]   = useState<EmailTemplate[]>([]);
  const [logs,        setLogs]        = useState<EmailLogEntry[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [selected,    setSelected]    = useState<any | null>(null);

  const [addDomainOpen, setAddDomainOpen]   = useState(false);
  const [addSenderOpen, setAddSenderOpen]   = useState(false);
  const [newTplOpen,    setNewTplOpen]      = useState(false);

  // Resolve org
  useEffect(() => {
    if (!orgSlug) return;
    organizationApi.getBySlug(orgSlug)
      .then(org => setOrgId(org.id))
      .catch(() => {});
  }, [orgSlug]);

  const load = useCallback(() => {
    if (!orgId) return;
    setLoading(true);
    Promise.all([
      sendDomainsApi.list(orgId).then(setSendDomains),
      senderIdentitiesApi.list(orgId).then(setIdentities),
      emailTemplatesApi.list(orgId).then(setTemplates),
      emailLogsApi.list(orgId).then(setLogs),
    ]).catch(() => {}).finally(() => setLoading(false));
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  const handleCheckDns = async (domainId: string) => {
    if (!orgId) return;
    try {
      const updated = await sendDomainsApi.checkDns(orgId, domainId);
      setSendDomains(prev => prev.map(d => d.id === domainId ? updated : d));
    } catch {}
  };

  const handleVerifySender = async (senderId: string) => {
    if (!orgId) return;
    try {
      const updated = await senderIdentitiesApi.verify(orgId, senderId);
      setIdentities(prev => prev.map(s => s.id === senderId ? updated : s));
    } catch {}
  };

  const handleRemoveDomain = async (domainId: string) => {
    if (!orgId) return;
    try {
      await sendDomainsApi.remove(orgId, domainId);
      setSendDomains(prev => prev.filter(d => d.id !== domainId));
      if (selected?.id === domainId) setSelected(null);
    } catch {}
  };

  const handleRemoveSender = async (senderId: string) => {
    if (!orgId) return;
    try {
      await senderIdentitiesApi.remove(orgId, senderId);
      setIdentities(prev => prev.filter(s => s.id !== senderId));
      if (selected?.id === senderId) setSelected(null);
    } catch {}
  };

  const handleRemoveTemplate = async (tplId: string) => {
    if (!orgId) return;
    try {
      await emailTemplatesApi.remove(orgId, tplId);
      setTemplates(prev => prev.filter(t => t.id !== tplId));
      if (selected?.id === tplId) setSelected(null);
    } catch {}
  };

  const addBtn = {
    domains:    () => setAddDomainOpen(true),
    identities: () => setAddSenderOpen(true),
    templates:  () => setNewTplOpen(true),
    logs:       () => load(),
  }[section];

  const addBtnLabel = {
    domains:    'Add Domain',
    identities: 'Add Sender',
    templates:  'New Template',
    logs:       'Refresh',
  }[section];

  // ── Stats for sidebar ───────────────────────────────────────────────────────
  const stats = [
    { label: 'Domains',    value: sendDomains.length, sub: `${sendDomains.filter(d => d.status === 'VERIFIED').length} verified`, color: T.brand },
    { label: 'Senders',    value: identities.length,  sub: `${identities.filter(s => s.verified).length} verified`,              color: T.green },
    { label: 'Templates',  value: templates.length,   sub: 'email templates',                                                      color: T.purple },
    { label: 'Log Entries',value: logs.length,         sub: `${logs.filter(l => l.status === 'SENT').length} sent`,               color: T.blue },
  ];

  // ── Render sections ─────────────────────────────────────────────────────────
  const renderDomains = () => (
    sendDomains.length === 0
      ? <Alert sx={{ bgcolor: `${T.brand}0a`, border: `1px solid ${T.border}` }}>No sending domains. Add one to configure DKIM/SPF.</Alert>
      : <TableContainer component={Paper} sx={{ bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: T.card2 }}>
                {['Domain', 'DKIM', 'SPF', 'Status', 'Last Checked', ''].map(h =>
                  <TableCell key={h} sx={{ color: T.sub, fontWeight: 700, fontSize: '.8rem', borderColor: T.border }}>{h}</TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {sendDomains.map(d => (
                <TableRow key={d.id} hover
                  onClick={() => setSelected(selected?.id === d.id ? null : d)}
                  sx={{ cursor: 'pointer', bgcolor: selected?.id === d.id ? `${T.brand}09` : 'transparent',
                        '& td': { borderColor: T.border } }}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <DomainIcon sx={{ fontSize: '1rem', color: T.brand }} />
                      <Typography sx={{ color: T.text, fontWeight: 600, fontSize: '.88rem' }}>{d.domain}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell><VerifyBadge ok={d.status === 'VERIFIED'} /></TableCell>
                  <TableCell><VerifyBadge ok={d.status === 'VERIFIED'} /></TableCell>
                  <TableCell><StatusChip status={d.status} /></TableCell>
                  <TableCell sx={{ color: T.sub, fontSize: '.8rem' }}>
                    {d.last_checked_at ? new Date(d.last_checked_at).toLocaleDateString() : '—'}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }} onClick={e => e.stopPropagation()}>
                      <Tooltip title="Check DNS">
                        <IconButton size="small" sx={{ color: T.blue }} onClick={() => handleCheckDns(d.id)}>
                          <RefreshIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Remove">
                        <IconButton size="small" sx={{ color: T.red }} onClick={() => handleRemoveDomain(d.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
  );

  const renderIdentities = () => (
    identities.length === 0
      ? <Alert sx={{ bgcolor: `${T.brand}0a`, border: `1px solid ${T.border}` }}>No sender identities. Create one to send from a named address.</Alert>
      : <TableContainer component={Paper} sx={{ bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: T.card2 }}>
                {['Name', 'Email', 'Verified', 'Verified At', ''].map(h =>
                  <TableCell key={h} sx={{ color: T.sub, fontWeight: 700, fontSize: '.8rem', borderColor: T.border }}>{h}</TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {identities.map(s => (
                <TableRow key={s.id} hover
                  onClick={() => setSelected(selected?.id === s.id ? null : s)}
                  sx={{ cursor: 'pointer', bgcolor: selected?.id === s.id ? `${T.brand}09` : 'transparent',
                        '& td': { borderColor: T.border } }}>
                  <TableCell sx={{ color: T.text, fontWeight: 600, fontSize: '.88rem' }}>{s.name || '—'}</TableCell>
                  <TableCell sx={{ color: T.sub, fontSize: '.83rem' }}>{s.email}</TableCell>
                  <TableCell>
                    {s.verified
                      ? <Chip label="Verified" size="small" sx={{ bgcolor: `${T.green}18`, color: T.green, fontWeight: 700, fontSize: '.73rem', height: 20 }} />
                      : <Chip label="Unverified" size="small" sx={{ bgcolor: `${T.yellow}18`, color: T.yellow, fontWeight: 700, fontSize: '.73rem', height: 20 }} />}
                  </TableCell>
                  <TableCell sx={{ color: T.sub, fontSize: '.8rem' }}>
                    {s.verified_at ? new Date(s.verified_at).toLocaleDateString() : '—'}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }} onClick={e => e.stopPropagation()}>
                      {!s.verified && (
                        <Tooltip title="Send verification email">
                          <IconButton size="small" sx={{ color: T.blue }} onClick={() => handleVerifySender(s.id)}>
                            <SendIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Remove">
                        <IconButton size="small" sx={{ color: T.red }} onClick={() => handleRemoveSender(s.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
  );

  const renderTemplates = () => (
    templates.length === 0
      ? <Alert sx={{ bgcolor: `${T.brand}0a`, border: `1px solid ${T.border}` }}>No email templates yet. Create one to send branded emails.</Alert>
      : <Grid container spacing={2}>
          {templates.map(t => (
            <Grid key={t.id} item xs={12} sm={6} md={4}>
              <Paper
                onClick={() => setSelected(selected?.id === t.id ? null : t)}
                sx={{ p: 2.5, bgcolor: T.card2, border: `1px solid ${selected?.id === t.id ? T.brand : T.border}`,
                      borderRadius: 2, cursor: 'pointer', '&:hover': { borderColor: T.brand },
                      position: 'relative' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Box sx={{ bgcolor: `${T.purple}15`, borderRadius: 1.5, p: 0.75, color: T.purple, display: 'flex' }}>
                    <ArticleIcon sx={{ fontSize: '1.2rem' }} />
                  </Box>
                  <IconButton size="small" sx={{ color: T.red }} onClick={e => { e.stopPropagation(); handleRemoveTemplate(t.id); }}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
                <Typography sx={{ color: T.text, fontWeight: 700, mb: 0.4, fontSize: '.92rem' }}>{t.name}</Typography>
                <Typography variant="caption" sx={{ color: T.sub, display: 'block', mb: 1.5,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.subject}</Typography>
                <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                  {(t.variables || []).slice(0, 3).map(v => (
                    <Chip key={v} label={`{{${v}}}`} size="small"
                      sx={{ bgcolor: `${T.brand}15`, color: T.brand, fontSize: '.72rem', height: 18 }} />
                  ))}
                </Box>
                <Typography variant="caption" sx={{ color: T.sub, display: 'block', mt: 1 }}>
                  {t.created_at ? new Date(t.created_at).toLocaleDateString() : ''}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
  );

  const logStatusColor = (s: string) =>
    ({ SENT: T.green, QUEUED: T.blue, FAILED: T.red, BOUNCED: T.orange, OPENED: T.purple, CLICKED: T.brand }[s] ?? T.sub);

  const renderLogs = () => (
    logs.length === 0
      ? <Alert sx={{ bgcolor: `${T.brand}0a`, border: `1px solid ${T.border}` }}>No email log entries found.</Alert>
      : <TableContainer component={Paper} sx={{ bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: T.card2 }}>
                {['To', 'From', 'Subject', 'Status', 'Sent At'].map(h =>
                  <TableCell key={h} sx={{ color: T.sub, fontWeight: 700, fontSize: '.8rem', borderColor: T.border }}>{h}</TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.slice(0, 100).map(l => (
                <TableRow key={l.id} hover sx={{ '& td': { borderColor: T.border } }}>
                  <TableCell sx={{ color: T.text, fontSize: '.83rem' }}>{l.to_email}</TableCell>
                  <TableCell sx={{ color: T.sub, fontSize: '.83rem' }}>{l.from_email}</TableCell>
                  <TableCell sx={{ color: T.sub, fontSize: '.83rem', maxWidth: 200,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.subject}</TableCell>
                  <TableCell><StatusChip status={l.status} /></TableCell>
                  <TableCell sx={{ color: T.sub, fontSize: '.8rem' }}>
                    {l.created_at ? new Date(l.created_at).toLocaleString() : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
  );

  const renderDetail = () => {
    if (!selected) return null;
    const entries = Object.entries(selected).filter(([k]) => !['id', 'organization', 'html_body', 'text_body'].includes(k));
    return (
      <Box sx={{ width: 300, flexShrink: 0 }}>
        <Paper sx={{ p: 2.5, bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 2,
          position: 'sticky', top: 16, overflowY: 'auto', maxHeight: 'calc(100vh - 200px)' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Typography sx={{ color: T.text, fontWeight: 700 }}>Details</Typography>
            <IconButton size="small" onClick={() => setSelected(null)} sx={{ color: T.sub }}><CloseIcon fontSize="small" /></IconButton>
          </Box>
          <Typography sx={{ color: T.brand, fontWeight: 700, mb: 1.5, fontSize: '.9rem', wordBreak: 'break-all' }}>
            {selected.domain || selected.email || selected.name || selected.to_email || '—'}
          </Typography>
          <Divider sx={{ mb: 1.5, borderColor: T.border }} />
          {entries.slice(0, 12).map(([k, v]) => (
            <Box key={k} sx={{ mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
              <Typography variant="caption" sx={{ color: T.sub, fontWeight: 700, textTransform: 'uppercase',
                fontSize: '.68rem', minWidth: 80, mt: 0.2 }}>{k.replace(/_/g, ' ')}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1, justifyContent: 'flex-end' }}>
                <Typography sx={{ color: T.text, fontSize: '.8rem', textAlign: 'right',
                  wordBreak: 'break-all', maxWidth: 160 }}>{String(v)}</Typography>
                {typeof v === 'string' && v.length > 10 && (
                  <Tooltip title="Copy">
                    <IconButton size="small" sx={{ color: T.sub, p: 0.25 }} onClick={() => copyToClipboard(String(v))}>
                      <ContentCopyIcon sx={{ fontSize: '.75rem' }} />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            </Box>
          ))}
          {section === 'domains' && selected.dkim_record && (
            <>
              <Divider sx={{ my: 1.5, borderColor: T.border }} />
              <Typography sx={{ color: T.text, fontWeight: 700, fontSize: '.8rem', mb: 0.75 }}>DNS Records</Typography>
              {[['DKIM TXT', selected.dkim_record], ['SPF TXT', selected.spf_record]].map(([label, val]) => val && (
                <Box key={label} sx={{ mb: 1 }}>
                  <Typography variant="caption" sx={{ color: T.sub, fontWeight: 700, display: 'block', mb: 0.25 }}>{label}</Typography>
                  <Box sx={{ bgcolor: T.card2, border: `1px solid ${T.border}`, borderRadius: 1, p: 1,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 0.5 }}>
                    <Typography sx={{ color: T.text, fontSize: '.75rem', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                      {String(val).slice(0, 60)}{String(val).length > 60 ? '…' : ''}
                    </Typography>
                    <IconButton size="small" sx={{ color: T.brand, p: 0.25, flexShrink: 0 }} onClick={() => copyToClipboard(String(val))}>
                      <ContentCopyIcon sx={{ fontSize: '.8rem' }} />
                    </IconButton>
                  </Box>
                </Box>
              ))}
            </>
          )}
          <Divider sx={{ my: 1.5, borderColor: T.border }} />
          <Button fullWidth variant="outlined" size="small" startIcon={<EditIcon />}
            sx={{ borderColor: T.border, color: T.brand }}>Edit</Button>
        </Paper>
      </Box>
    );
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: T.bg, display: 'flex', flexDirection: 'column' }}>
      <DashboardTopBar />

      {/* Page header */}
      <Box sx={{ px: 3, pt: 2.5, pb: 1.5, borderBottom: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton onClick={() => navigate(`/enterprise/${orgSlug}/workspace`)} sx={{ color: T.sub }}>
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ bgcolor: `${T.brand}15`, borderRadius: 2, p: 1, color: T.brand, display: 'flex' }}>
          <MailOutlineIcon sx={{ fontSize: '1.4rem' }} />
        </Box>
        <Box>
          <Typography sx={{ color: T.text, fontWeight: 800, fontSize: '1.2rem', lineHeight: 1.2 }}>
            Email Services
          </Typography>
          <Typography variant="caption" sx={{ color: T.sub }}>
            Sending domains, sender identities & templates
          </Typography>
        </Box>
        <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
          <Button startIcon={section === 'logs' ? <RefreshIcon /> : <AddIcon />}
            variant="contained" size="small"
            onClick={addBtn}
            sx={{ bgcolor: T.brand, fontWeight: 700, textTransform: 'none' }}>
            {addBtnLabel}
          </Button>
        </Box>
      </Box>

      {/* Body */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Left sidebar */}
        <Box sx={{ width: 220, flexShrink: 0, borderRight: `1px solid ${T.border}`,
          overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>

          {/* Nav */}
          <Box>
            <Typography variant="caption" sx={{ color: T.sub, fontWeight: 700,
              textTransform: 'uppercase', fontSize: '.68rem', px: 0.5, mb: 0.75, display: 'block' }}>
              Sections
            </Typography>
            {NAV_SECTIONS.map(s => (
              <Box key={s.key}
                onClick={() => { setSection(s.key); setSelected(null); }}
                sx={{ display: 'flex', alignItems: 'center', gap: 1.25, px: 1.5, py: 1,
                  borderRadius: 1.5, cursor: 'pointer', mb: 0.25,
                  bgcolor: section === s.key ? `${T.brand}18` : 'transparent',
                  color:   section === s.key ? T.brand : T.sub,
                  '&:hover': { bgcolor: section === s.key ? `${T.brand}18` : `${T.text}06`, color: section === s.key ? T.brand : T.text },
                }}>
                {s.icon}
                <Typography sx={{ fontSize: '.85rem', fontWeight: section === s.key ? 700 : 500 }}>
                  {s.label}
                </Typography>
              </Box>
            ))}
          </Box>

          <Divider sx={{ borderColor: T.border }} />

          {/* Stats */}
          <Box>
            <Typography variant="caption" sx={{ color: T.sub, fontWeight: 700,
              textTransform: 'uppercase', fontSize: '.68rem', px: 0.5, mb: 0.75, display: 'block' }}>
              Overview
            </Typography>
            {stats.map(s => (
              <Box key={s.label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                px: 1, py: 0.75, borderRadius: 1.5, mb: 0.5, bgcolor: T.card2,
                border: `1px solid ${T.border}` }}>
                <Box>
                  <Typography sx={{ color: T.sub, fontSize: '.72rem', fontWeight: 600 }}>{s.label}</Typography>
                  <Typography variant="caption" sx={{ color: T.sub, fontSize: '.65rem' }}>{s.sub}</Typography>
                </Box>
                <Typography sx={{ color: s.color, fontWeight: 800, fontSize: '1.1rem' }}>{s.value}</Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Main content */}
        <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
          {loading
            ? <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
                <CircularProgress sx={{ color: T.brand }} />
              </Box>
            : (
              <Box sx={{ display: 'flex', gap: 2.5, alignItems: 'flex-start' }}>
                <Box sx={{ flex: 1 }}>
                  {/* Section title */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
                    <Typography sx={{ color: T.text, fontWeight: 800, fontSize: '1rem' }}>
                      {NAV_SECTIONS.find(s => s.key === section)?.label}
                    </Typography>
                    <Chip
                      label={{ domains: sendDomains.length, identities: identities.length,
                               templates: templates.length, logs: logs.length }[section]}
                      size="small"
                      sx={{ bgcolor: `${T.brand}15`, color: T.brand, fontWeight: 700, fontSize: '.72rem' }}
                    />
                    <IconButton size="small" onClick={load} sx={{ color: T.sub, ml: 'auto' }}>
                      <RefreshIcon fontSize="small" />
                    </IconButton>
                  </Box>

                  {section === 'domains'    && renderDomains()}
                  {section === 'identities' && renderIdentities()}
                  {section === 'templates'  && renderTemplates()}
                  {section === 'logs'       && renderLogs()}
                </Box>

                {/* Detail panel */}
                {renderDetail()}
              </Box>
            )
          }
        </Box>
      </Box>

      {/* Dialogs */}
      {orgId && (
        <>
          <AddDomainDialog
            open={addDomainOpen} orgId={orgId}
            onClose={() => setAddDomainOpen(false)}
            onAdded={d => setSendDomains(prev => [...prev, d])}
          />
          <AddSenderDialog
            open={addSenderOpen} orgId={orgId}
            onClose={() => setAddSenderOpen(false)}
            onAdded={s => setIdentities(prev => [...prev, s])}
          />
          <CreateTemplateDialog
            open={newTplOpen} orgId={orgId}
            onClose={() => setNewTplOpen(false)}
            onCreated={t => setTemplates(prev => [...prev, t])}
          />
        </>
      )}
    </Box>
  );
};

export default EnterpriseEmailPage;
