// OrcaCloud – Email Marketing Page
// Tabs: Overview | Campaigns | Contacts | Templates | Automations

import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Tab, Tabs, Button, Grid, Card, CardContent,
  Chip, IconButton, TextField, InputAdornment, Dialog, DialogTitle,
  DialogContent, DialogActions, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, MenuItem, Alert,
  Switch, FormControlLabel, Tooltip, CircularProgress, Divider,
  LinearProgress, Avatar, List, ListItem, ListItemText,
} from '@mui/material';
import { alpha, darken, useTheme } from '@mui/material/styles';

import CampaignIcon        from '@mui/icons-material/Campaign';
import AddIcon             from '@mui/icons-material/Add';
import SearchIcon          from '@mui/icons-material/Search';
import DeleteIcon          from '@mui/icons-material/Delete';
import EditIcon            from '@mui/icons-material/Edit';
import SendIcon            from '@mui/icons-material/Send';
import ContentCopyIcon     from '@mui/icons-material/ContentCopy';
import UploadFileIcon      from '@mui/icons-material/UploadFile';
import CheckCircleIcon     from '@mui/icons-material/CheckCircle';
import PauseCircleIcon     from '@mui/icons-material/PauseCircle';
import ErrorOutlineIcon    from '@mui/icons-material/ErrorOutline';
import ScheduleIcon        from '@mui/icons-material/Schedule';
import AutorenewIcon       from '@mui/icons-material/Autorenew';
import DraftsIcon          from '@mui/icons-material/Drafts';
import PeopleAltIcon       from '@mui/icons-material/PeopleAlt';
import BarChartIcon        from '@mui/icons-material/BarChart';
import AlternateEmailIcon  from '@mui/icons-material/AlternateEmail';
import StarIcon             from '@mui/icons-material/Star';
import LocalOfferIcon       from '@mui/icons-material/LocalOffer';

import { marketingApi, billingApi } from '../services/cloudApi';
import type {
  Campaign, ContactList, Contact, EmailTemplate, Automation,
  AccountStats, CampaignStatus, CreateCampaignPayload,
} from '../types/marketing';
import type { PlanTier } from '../types/billing';
import {
  dashboardTokens,
  dashboardSemanticColors,
  dashboardStatusColors,
  computeUiTokens,
} from '../styles/dashboardDesignSystem';

const EMAIL_MARKETING_COLORS = {
  accent: computeUiTokens.accentStrong,
  accentHover: darken(computeUiTokens.accentStrong, 0.2),
  textLight: computeUiTokens.neutralStrong,
  textDark: alpha(dashboardTokens.colors.white, 0.88),
  mutedLight: dashboardTokens.colors.textSecondary,
  mutedDark: alpha(dashboardTokens.colors.white, 0.55),
  subDark: alpha(dashboardTokens.colors.white, 0.62),
  borderLight: dashboardTokens.colors.border,
  borderDark: alpha(dashboardTokens.colors.white, 0.08),
  cardBgLight: dashboardTokens.colors.surface,
  cardBgDark: computeUiTokens.darkPanel,
  panelBgLight: dashboardTokens.colors.surfaceSubtle,
  panelBgDark: alpha(computeUiTokens.darkPanel, 0.82),
  hoverLight: alpha(computeUiTokens.accentStrong, 0.08),
  hoverDark: alpha(computeUiTokens.accentStrong, 0.32),
  headerRowDark: alpha(computeUiTokens.darkPanel, 0.82),
};

const EMAIL_CAMPAIGN_STATUS_STYLES: Record<CampaignStatus, { label: string; color: string; icon: React.ReactElement }> = {
  draft: {
    label: 'Draft',
    color: dashboardTokens.colors.textSecondary,
    icon: <DraftsIcon sx={{ fontSize: 13 }} />,
  },
  scheduled: {
    label: 'Scheduled',
    color: dashboardSemanticColors.warning,
    icon: <ScheduleIcon sx={{ fontSize: 13 }} />,
  },
  sending: {
    label: 'Sending',
    color: dashboardSemanticColors.info,
    icon: <AutorenewIcon sx={{ fontSize: 13 }} />,
  },
  sent: {
    label: 'Sent',
    color: computeUiTokens.successStrong,
    icon: <CheckCircleIcon sx={{ fontSize: 13 }} />,
  },
  paused: {
    label: 'Paused',
    color: dashboardSemanticColors.orange,
    icon: <PauseCircleIcon sx={{ fontSize: 13 }} />,
  },
  cancelled: {
    label: 'Cancelled',
    color: dashboardSemanticColors.danger,
    icon: <ErrorOutlineIcon sx={{ fontSize: 13 }} />,
  },
  error: {
    label: 'Error',
    color: dashboardSemanticColors.danger,
    icon: <ErrorOutlineIcon sx={{ fontSize: 13 }} />,
  },
};

const EMAIL_TEMPLATE_CATEGORY_COLORS: Record<string, string> = {
  newsletter: dashboardSemanticColors.info,
  promotional: dashboardSemanticColors.warning,
  transactional: computeUiTokens.successStrong,
  welcome: dashboardSemanticColors.purple,
  announcement: dashboardSemanticColors.danger,
  custom: dashboardTokens.colors.textSecondary,
};

const EMAIL_AUTOMATION_TRIGGER_COLORS: Record<string, string> = {
  subscribe: computeUiTokens.successStrong,
  unsubscribe: dashboardSemanticColors.danger,
  date_field: dashboardSemanticColors.warning,
  campaign_open: dashboardSemanticColors.info,
  campaign_click: dashboardSemanticColors.purple,
  manual: dashboardTokens.colors.textSecondary,
};

const EMAIL_PLAN_COLOR: Record<PlanTier, string> = {
  free: dashboardStatusColors.plan.free,
  starter: dashboardStatusColors.plan.starter,
  professional: dashboardStatusColors.plan.professional,
  enterprise: dashboardStatusColors.plan.enterprise,
};

const getEmailUiPalette = (isDark: boolean) => ({
  panelBg: isDark ? EMAIL_MARKETING_COLORS.panelBgDark : EMAIL_MARKETING_COLORS.panelBgLight,
  cardBg: isDark ? EMAIL_MARKETING_COLORS.cardBgDark : EMAIL_MARKETING_COLORS.cardBgLight,
  border: isDark ? EMAIL_MARKETING_COLORS.borderDark : EMAIL_MARKETING_COLORS.borderLight,
  text: isDark ? EMAIL_MARKETING_COLORS.textDark : EMAIL_MARKETING_COLORS.textLight,
  muted: isDark ? EMAIL_MARKETING_COLORS.mutedDark : EMAIL_MARKETING_COLORS.mutedLight,
  sub: isDark ? EMAIL_MARKETING_COLORS.subDark : EMAIL_MARKETING_COLORS.mutedLight,
  hover: isDark ? EMAIL_MARKETING_COLORS.hoverDark : EMAIL_MARKETING_COLORS.hoverLight,
  headerRowBg: isDark ? EMAIL_MARKETING_COLORS.headerRowDark : dashboardTokens.colors.surfaceHover,
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatusChip({ status }: { status: CampaignStatus }) {
  const m = EMAIL_CAMPAIGN_STATUS_STYLES[status] || EMAIL_CAMPAIGN_STATUS_STYLES.draft;
  return (
    <Chip
      label={m.label}
      size="small"
      icon={m.icon}
      sx={{ bgcolor: alpha(m.color, 0.13), color: m.color,
            '& .MuiChip-icon': { color: m.color }, fontSize: 11 }}
    />
  );
}

function StatCard({ label, value, sub, color }:
  { label: string; value: string | number; sub?: string; color?: string }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const t = getEmailUiPalette(isDark);
  return (
    <Card sx={{ bgcolor: t.cardBg,
                border: `1px solid ${t.border}`,
                borderRadius: 2, height: '100%' }}>
      <CardContent>
        <Typography variant="caption" sx={{ color: t.muted, textTransform: 'uppercase', letterSpacing: 1 }}>
          {label}
        </Typography>
        <Typography variant="h4" fontWeight={700} sx={{ color: color || t.text, mt: 0.5 }}>
          {value}
        </Typography>
        {sub && (
          <Typography variant="caption" sx={{ color: t.muted }}>
            {sub}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

// ── Overview Tab ──────────────────────────────────────────────────────────────

const EMPTY_STATS: AccountStats = {
  campaigns: 0, sent_campaigns: 0, draft_campaigns: 0,
  contact_lists: 0, total_contacts: 0, total_sent: 0,
  avg_open_rate: 0, avg_click_rate: 0, avg_bounce_rate: 0,
  total_unsubscribes: 0,
};

function OverviewTab({ stats, loading }: { stats: AccountStats | null; loading: boolean }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const t = getEmailUiPalette(isDark);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>;
  }

  const st = stats ?? EMPTY_STATS;

  return (
    <Box>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Total Sent',       value: st.total_sent.toLocaleString(),    color: dashboardSemanticColors.info },
          { label: 'Avg Open Rate',    value: `${st.avg_open_rate}%`,             color: computeUiTokens.successStrong },
          { label: 'Avg Click Rate',   value: `${st.avg_click_rate}%`,            color: dashboardSemanticColors.warning },
          { label: 'Subscribers',      value: st.total_contacts.toLocaleString(), color: dashboardSemanticColors.purple },
        ].map(s => (
          <Grid item key={s.label}>
            <StatCard {...s} />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2}>
        {[
          { label: 'Campaigns',      value: st.campaigns },
          { label: 'Sent',           value: st.sent_campaigns },
          { label: 'Drafts',         value: st.draft_campaigns },
          { label: 'Contact Lists',  value: st.contact_lists },
          { label: 'Unsubscribes',   value: st.total_unsubscribes },
          { label: 'Avg Bounce',     value: `${st.avg_bounce_rate}%` },
        ].map(s => (
          <Grid item key={s.label}>
            <Card sx={{ bgcolor: t.cardBg, border: `1px solid ${t.border}`, borderRadius: 2 }}>
              <CardContent sx={{ py: 2 }}>
                <Typography sx={{ color: t.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>
                  {s.label}
                </Typography>
                <Typography variant="h5" fontWeight={700} sx={{ color: t.text }}>
                  {s.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

// ── Campaigns Tab ─────────────────────────────────────────────────────────────

function CampaignsTab() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const t = getEmailUiPalette(isDark);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [selected, setSelected]   = useState<Campaign | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [sending, setSending]     = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [testOpen, setTestOpen]   = useState(false);
  const [testTarget, setTestTarget] = useState<string | null>(null);
  const [err, setErr]             = useState('');
  const [ok, setOk]               = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await marketingApi.listCampaigns();
      setCampaigns((res as any).data?.results ?? (res as any).data ?? []);
    } catch { /* no-op */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = campaigns.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.subject.toLowerCase().includes(search.toLowerCase()));

  const handleSend = async (id: string) => {
    setSending(id);
    setErr(''); setOk('');
    try {
      const res: any = await marketingApi.sendCampaign(id);
      setOk(`Sent to ${res.data?.sent ?? 0} contacts.`);
      await load();
    } catch (e: any) {
      setErr(e.response?.data?.error || 'Send failed.');
    }
    setSending(null);
  };

  const handleDuplicate = async (id: string) => {
    try {
      await marketingApi.duplicateCampaign(id);
      await load();
    } catch { /* no-op */ }
  };

  const handleDelete = async (id: string) => {
    try {
      await marketingApi.deleteCampaign(id);
      setCampaigns(p => p.filter(c => c.resource_id !== id));
      if (selected?.resource_id === id) setSelected(null);
    } catch { /* no-op */ }
  };

  return (
    <Box sx={{ display: 'flex', gap: 2, height: '100%' }}>
      {/* List panel */}
      <Box sx={{ width: 340, flexShrink: 0 }}>
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <TextField
            size="small" placeholder="Search campaigns…" value={search}
            onChange={e => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: t.muted, fontSize: 18 }} /></InputAdornment> }}
            sx={{ flex: 1 }}
          />
          <Button variant="contained" size="small"
            sx={{ bgcolor: EMAIL_MARKETING_COLORS.accent, '&:hover': { bgcolor: EMAIL_MARKETING_COLORS.accentHover }, whiteSpace: 'nowrap' }}
            startIcon={<AddIcon />}
            onClick={() => setCreateOpen(true)}>New</Button>
        </Box>

        {err && <Alert severity="error" sx={{ mb: 1 }} onClose={() => setErr('')}>{err}</Alert>}
        {ok  && <Alert severity="success" sx={{ mb: 1 }} onClose={() => setOk('')}>{ok}</Alert>}

        {loading ? <LinearProgress /> : (
          filtered.map(c => (
            <Card key={c.resource_id}
              onClick={() => setSelected(c)}
              sx={{
                bgcolor: selected?.resource_id === c.resource_id ? t.hover : t.cardBg,
                border: `1px solid ${selected?.resource_id === c.resource_id ? EMAIL_MARKETING_COLORS.accent : t.border}`,
                borderRadius: 2, mb: 1, cursor: 'pointer',
                '&:hover': { borderColor: EMAIL_MARKETING_COLORS.accent },
              }}>
              <CardContent sx={{ py: '10px !important', px: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Typography fontWeight={600} sx={{ color: t.text, fontSize: 14, flex: 1, mr: 1 }}
                    noWrap>{c.name}</Typography>
                  <StatusChip status={c.status} />
                </Box>
                <Typography variant="caption" sx={{ color: t.muted }}>{c.subject}</Typography>
                {c.analytics && (
                  <Box sx={{ display: 'flex', gap: 1.5, mt: 0.5 }}>
                    <Typography variant="caption" sx={{ color: computeUiTokens.successStrong }}>{c.analytics.open_rate}% opens</Typography>
                    <Typography variant="caption" sx={{ color: dashboardSemanticColors.info }}>{c.analytics.click_rate}% clicks</Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </Box>

      {/* Detail / editor panel */}
      <Box sx={{ flex: 1, bgcolor: t.cardBg, border: `1px solid ${t.border}`,
                 borderRadius: 2, p: 3, minHeight: 400 }}>
        {selected ? (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" fontWeight={700} sx={{ color: t.text }}>{selected.name}</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Tooltip title="Send test email">
                  <IconButton size="small" sx={{ color: dashboardSemanticColors.warning }}
                    onClick={() => { setTestTarget(selected.resource_id); setTestOpen(true); }}>
                    <AlternateEmailIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Duplicate">
                  <IconButton size="small" sx={{ color: t.muted }}
                    onClick={() => handleDuplicate(selected.resource_id)}>
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete">
                  <IconButton size="small" sx={{ color: dashboardSemanticColors.danger }}
                    onClick={() => handleDelete(selected.resource_id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                {['draft', 'scheduled'].includes(selected.status) && (
                  <Button variant="contained" size="small"
                    disabled={sending === selected.resource_id}
                    startIcon={sending === selected.resource_id
                      ? <CircularProgress size={14} /> : <SendIcon />}
                    sx={{ bgcolor: EMAIL_MARKETING_COLORS.accent, '&:hover': { bgcolor: EMAIL_MARKETING_COLORS.accentHover } }}
                    onClick={() => handleSend(selected.resource_id)}>
                    Send Now
                  </Button>
                )}
              </Box>
            </Box>

            <Grid container spacing={2} sx={{ mb: 2 }}>
              {[
                { label: 'From',    value: `${selected.from_name} <${selected.from_email}>` },
                { label: 'Subject', value: selected.subject },
                { label: 'Lists',   value: selected.contact_lists?.map(l => l.name).join(', ') || '—' },
                { label: 'Sent',    value: selected.sent_at ? new Date(selected.sent_at).toLocaleString() : '—' },
              ].map(r => (
                <Grid item key={r.label}>
                  <Typography variant="caption" sx={{ color: t.muted }}>{r.label}</Typography>
                  <Typography sx={{ color: t.text, fontSize: 14 }}>{r.value}</Typography>
                </Grid>
              ))}
            </Grid>

            {selected.analytics && (
              <>
                <Divider sx={{ my: 2, borderColor: t.border }} />
                <Typography variant="subtitle2" sx={{ color: t.muted, mb: 1 }}>Analytics</Typography>
                <Grid container spacing={1}>
                  {[
                    { k: 'Sent',     v: selected.analytics.total_sent,   c: dashboardSemanticColors.info },
                    { k: 'Opens',    v: `${selected.analytics.open_rate}%`, c: computeUiTokens.successStrong },
                    { k: 'Clicks',   v: `${selected.analytics.click_rate}%`, c: dashboardSemanticColors.warning },
                    { k: 'Bounced',  v: `${selected.analytics.bounce_rate}%`, c: dashboardSemanticColors.danger },
                  ].map(s => (
                    <Grid item key={s.k}>
                      <Box sx={{ textAlign: 'center', p: 1.5, bgcolor: t.panelBg, borderRadius: 1 }}>
                        <Typography variant="h6" fontWeight={700} sx={{ color: s.c }}>{s.v}</Typography>
                        <Typography variant="caption" sx={{ color: t.muted }}>{s.k}</Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </>
            )}

            <Divider sx={{ my: 2, borderColor: t.border }} />
            <Typography variant="caption" sx={{ color: t.muted }}>Preview (HTML body)</Typography>
            <Box sx={{ mt: 1, p: 2, bgcolor: dashboardTokens.colors.white, borderRadius: 1, maxHeight: 340, overflow: 'auto',
                       border: `1px solid ${t.border}` }}>
              <div dangerouslySetInnerHTML={{ __html: selected.html_body || '<em>No HTML body.</em>' }} />
            </Box>
          </>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
                     justifyContent: 'center', height: '100%', py: 8 }}>
            <CampaignIcon sx={{ fontSize: 60, color: t.muted, mb: 2 }} />
            <Typography sx={{ color: t.muted }}>Select a campaign to view details</Typography>
          </Box>
        )}
      </Box>

      {/* Send test dialog */}
      <Dialog open={testOpen} onClose={() => setTestOpen(false)}>
        <DialogTitle>Send Test Email</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Recipient email" value={testEmail}
            onChange={e => setTestEmail(e.target.value)} sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestOpen(false)}>Cancel</Button>
          <Button variant="contained"
            onClick={async () => {
              if (testTarget) await marketingApi.sendTest(testTarget, testEmail);
              setTestOpen(false); setTestEmail('');
            }}>Send</Button>
        </DialogActions>
      </Dialog>

      {/* Create campaign dialog */}
      <CreateCampaignDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={load} />
    </Box>
  );
}

// ── Create Campaign Dialog ────────────────────────────────────────────────────

function CreateCampaignDialog({ open, onClose, onCreated }:
  { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState<Partial<CreateCampaignPayload>>({
    campaign_type: 'regular', track_opens: true, track_clicks: true,
    from_name: 'OrcaCloud', utm_medium: 'email',
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [lists, setLists] = useState<ContactList[]>([]);
  const [selectedLists, setSelectedLists] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      marketingApi.listContactLists().then((r: any) => setLists(r.data?.results ?? r.data ?? [])).catch(() => {});
    }
  }, [open]);

  const set = (k: keyof CreateCampaignPayload) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(p => ({ ...p, [k]: e.target.value }));

  const handleCreate = async () => {
    if (!form.name || !form.subject || !form.from_email) {
      setErr('Name, Subject and From Email are required.'); return;
    }
    setLoading(true); setErr('');
    try {
      await marketingApi.createCampaign({
        ...form,
        contact_list_ids: selectedLists,
      } as CreateCampaignPayload);
      onCreated(); onClose();
    } catch (e: any) {
      setErr(e.response?.data?.detail || 'Failed to create campaign.');
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>New Campaign</DialogTitle>
      <DialogContent>
        {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12}><TextField fullWidth label="Campaign Name *" value={form.name || ''} onChange={set('name')} /></Grid>
          <Grid item xs={6}><TextField fullWidth label="From Name *" value={form.from_name || ''} onChange={set('from_name')} /></Grid>
          <Grid item xs={6}><TextField fullWidth label="From Email *" value={form.from_email || ''} onChange={set('from_email')} /></Grid>
          <Grid item xs={12}><TextField fullWidth label="Subject *" value={form.subject || ''} onChange={set('subject')} /></Grid>
          <Grid item xs={12}><TextField fullWidth label="Preview Text" value={form.preview_text || ''} onChange={set('preview_text')} /></Grid>
          <Grid item xs={12}>
            <TextField fullWidth select label="Contact Lists" value={selectedLists} SelectProps={{ multiple: true }}
              onChange={e => setSelectedLists(typeof e.target.value === 'string' ? [e.target.value] : e.target.value as string[])}>
              {lists.map(l => <MenuItem key={l.resource_id} value={l.resource_id}>{l.name} ({l.subscriber_count})</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth multiline minRows={5} label="HTML Body"
              value={form.html_body || ''} onChange={set('html_body')}
              placeholder="<p>Hello {{ first_name }},</p>" />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={loading} onClick={handleCreate}
          sx={{ bgcolor: EMAIL_MARKETING_COLORS.accent, '&:hover': { bgcolor: EMAIL_MARKETING_COLORS.accentHover } }}>
          {loading ? <CircularProgress size={20} /> : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Contacts Tab ──────────────────────────────────────────────────────────────

function ContactsTab() {
  const theme  = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const t = getEmailUiPalette(isDark);

  const [lists, setLists]       = useState<ContactList[]>([]);
  const [selected, setSelected] = useState<ContactList | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch]     = useState('');
  const [csv, setCsv]           = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [addOpen, setAddOpen]   = useState(false);
  const [newList, setNewList]   = useState('');
  const [newContact, setNewContact] = useState({ email: '', first_name: '', last_name: '' });
  const [listDialogOpen, setListDialogOpen] = useState(false);

  useEffect(() => {
    marketingApi.listContactLists().then((r: any) => setLists(r.data?.results ?? r.data ?? [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (selected) {
      marketingApi.listContacts(selected.resource_id).then((r: any) => setContacts(r.data?.results ?? r.data ?? [])).catch(() => {});
    }
  }, [selected]);

  const filtered = contacts.filter(c =>
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    `${c.first_name} ${c.last_name}`.toLowerCase().includes(search.toLowerCase()));

  const handleImport = async () => {
    if (!selected || !csv) return;
    await marketingApi.importContacts(selected.resource_id, csv);
    setImportOpen(false); setCsv('');
    const r: any = await marketingApi.listContacts(selected.resource_id);
    setContacts(r.data?.results ?? r.data ?? []);
  };

  const handleAddContact = async () => {
    if (!selected || !newContact.email) return;
    await marketingApi.createContact({ ...newContact, contact_list_id: selected.resource_id });
    const r: any = await marketingApi.listContacts(selected.resource_id);
    setContacts(r.data?.results ?? r.data ?? []);
    setAddOpen(false); setNewContact({ email: '', first_name: '', last_name: '' });
  };

  return (
    <Box sx={{ display: 'flex', gap: 2 }}>
      {/* Lists sidebar */}
      <Box sx={{ width: 260, flexShrink: 0 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography fontWeight={600} sx={{ color: t.text }}>Lists</Typography>
          <IconButton size="small" sx={{ color: EMAIL_MARKETING_COLORS.accent }} onClick={() => setListDialogOpen(true)}>
            <AddIcon fontSize="small" />
          </IconButton>
        </Box>
        {lists.map(l => (
          <Card key={l.resource_id} onClick={() => { setSelected(l); setSearch(''); }}
            sx={{ bgcolor: selected?.resource_id === l.resource_id ? t.hover : t.cardBg,
                  border: `1px solid ${selected?.resource_id === l.resource_id ? EMAIL_MARKETING_COLORS.accent : t.border}`,
                  borderRadius: 2, mb: 1, cursor: 'pointer', '&:hover': { borderColor: EMAIL_MARKETING_COLORS.accent } }}>
            <CardContent sx={{ py: '10px !important', px: 2 }}>
              <Typography fontWeight={600} sx={{ color: t.text, fontSize: 14 }}>{l.name}</Typography>
              <Typography variant="caption" sx={{ color: t.muted }}>
                {l.subscriber_count} subscribers
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Contacts panel */}
      <Box sx={{ flex: 1 }}>
        {selected ? (
          <>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <TextField size="small" placeholder="Search contacts…" value={search}
                onChange={e => setSearch(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: t.muted, fontSize: 18 }} /></InputAdornment> }}
                sx={{ flex: 1 }} />
              <Button variant="outlined" size="small" startIcon={<UploadFileIcon />}
                onClick={() => setImportOpen(true)}>Import CSV</Button>
              <Button variant="contained" size="small" startIcon={<AddIcon />}
                sx={{ bgcolor: EMAIL_MARKETING_COLORS.accent, '&:hover': { bgcolor: EMAIL_MARKETING_COLORS.accentHover } }}
                onClick={() => setAddOpen(true)}>Add</Button>
            </Box>

            <TableContainer component={Paper} sx={{ bgcolor: t.cardBg, border: `1px solid ${t.border}` }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: t.headerRowBg }}>
                    {['Email', 'Name', 'Status', 'Subscribed', ''].map(h => (
                      <TableCell key={h} sx={{ color: t.muted, fontWeight: 600, fontSize: 12 }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map(c => (
                    <TableRow key={c.id} sx={{ '&:hover': { bgcolor: t.hover } }}>
                      <TableCell sx={{ color: t.text, fontSize: 13 }}>{c.email}</TableCell>
                      <TableCell sx={{ color: t.text, fontSize: 13 }}>{c.first_name} {c.last_name}</TableCell>
                      <TableCell>
                        <Chip label={c.status} size="small"
                          sx={{
                            bgcolor: c.status === 'subscribed'
                              ? alpha(computeUiTokens.successStrong, 0.13)
                              : alpha(dashboardSemanticColors.danger, 0.13),
                            color: c.status === 'subscribed'
                              ? computeUiTokens.successStrong
                              : dashboardSemanticColors.danger,
                            fontSize: 11,
                          }} />
                      </TableCell>
                      <TableCell sx={{ color: t.muted, fontSize: 12 }}>
                        {c.subscribed_at ? new Date(c.subscribed_at).toLocaleDateString() : '—'}
                      </TableCell>
                      <TableCell>
                        <IconButton size="small" sx={{ color: dashboardSemanticColors.danger }}
                          onClick={() => marketingApi.deleteContact(c.id).then(() =>
                            setContacts(p => p.filter(x => x.id !== c.id))).catch(() => {})}>
                          <DeleteIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
            <Typography sx={{ color: t.muted }}>Select a contact list</Typography>
          </Box>
        )}
      </Box>

      {/* Import CSV dialog */}
      <Dialog open={importOpen} onClose={() => setImportOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Import Contacts (CSV)</DialogTitle>
        <DialogContent>
          <Typography variant="caption" sx={{ color: t.muted }}>
            Header row: email, first_name, last_name (extra columns → custom fields)
          </Typography>
          <TextField fullWidth multiline minRows={6} sx={{ mt: 1 }}
            placeholder="email,first_name,last_name&#10;alice@example.com,Alice,Smith"
            value={csv} onChange={e => setCsv(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleImport}
            sx={{ bgcolor: EMAIL_MARKETING_COLORS.accent, '&:hover': { bgcolor: EMAIL_MARKETING_COLORS.accentHover } }}>Import</Button>
        </DialogActions>
      </Dialog>

      {/* Add contact dialog */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)}>
        <DialogTitle>Add Contact</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}><TextField fullWidth label="Email *" value={newContact.email}
              onChange={e => setNewContact(p => ({ ...p, email: e.target.value }))} /></Grid>
            <Grid item xs={6}><TextField fullWidth label="First Name" value={newContact.first_name}
              onChange={e => setNewContact(p => ({ ...p, first_name: e.target.value }))} /></Grid>
            <Grid item xs={6}><TextField fullWidth label="Last Name" value={newContact.last_name}
              onChange={e => setNewContact(p => ({ ...p, last_name: e.target.value }))} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddContact}
            sx={{ bgcolor: EMAIL_MARKETING_COLORS.accent, '&:hover': { bgcolor: EMAIL_MARKETING_COLORS.accentHover } }}>Add</Button>
        </DialogActions>
      </Dialog>

      {/* New list dialog */}
      <Dialog open={listDialogOpen} onClose={() => setListDialogOpen(false)}>
        <DialogTitle>New Contact List</DialogTitle>
        <DialogContent>
          <TextField autoFocus fullWidth label="List Name" sx={{ mt: 1 }}
            value={newList} onChange={e => setNewList(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setListDialogOpen(false)}>Cancel</Button>
          <Button variant="contained"
            onClick={async () => {
              await marketingApi.createContactList({ name: newList });
              const r: any = await marketingApi.listContactLists();
              setLists(r.data?.results ?? r.data ?? []);
              setListDialogOpen(false); setNewList('');
            }}
            sx={{ bgcolor: EMAIL_MARKETING_COLORS.accent, '&:hover': { bgcolor: EMAIL_MARKETING_COLORS.accentHover } }}>Create</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ── Templates Tab ─────────────────────────────────────────────────────────────

function TemplatesTab() {
  const theme  = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const t = getEmailUiPalette(isDark);

  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [editOpen, setEditOpen]   = useState(false);
  const [editing, setEditing]     = useState<Partial<EmailTemplate> | null>(null);
  const [search, setSearch]       = useState('');

  useEffect(() => {
    marketingApi.listTemplates().then((r: any) => setTemplates(r.data?.results ?? r.data ?? [])).catch(() => {});
  }, []);

  const load = () => marketingApi.listTemplates().then((r: any) => setTemplates(r.data?.results ?? r.data ?? [])).catch(() => {});

  const filtered = templates.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()));

  const handleSave = async () => {
    if (!editing) return;
    if (editing.resource_id) {
      await marketingApi.updateTemplate(editing.resource_id, editing as any);
    } else {
      await marketingApi.createTemplate(editing as any);
    }
    setEditOpen(false); setEditing(null); load();
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <TextField size="small" placeholder="Search templates…" value={search}
          onChange={e => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: t.muted, fontSize: 18 }} /></InputAdornment> }}
          sx={{ width: 280 }} />
        <Button variant="contained" size="small" startIcon={<AddIcon />}
          sx={{ bgcolor: EMAIL_MARKETING_COLORS.accent, '&:hover': { bgcolor: EMAIL_MARKETING_COLORS.accentHover } }}
          onClick={() => { setEditing({ category: 'newsletter' }); setEditOpen(true); }}>
          New Template
        </Button>
      </Box>

      <Grid container spacing={2}>
        {filtered.map(tpl => (
          <Grid item key={tpl.resource_id}>
            <Card sx={{ bgcolor: t.cardBg, border: `1px solid ${t.border}`, borderRadius: 2 }}>
              <Box sx={{ height: 120, bgcolor: t.headerRowBg,
                         display: 'flex', alignItems: 'center', justifyContent: 'center',
                         borderRadius: '8px 8px 0 0', overflow: 'hidden' }}>
                {tpl.thumbnail_url
                  ? <img src={tpl.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <Typography sx={{ color: t.muted, fontSize: 12 }}>No preview</Typography>}
              </Box>
              <CardContent sx={{ pt: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Typography fontWeight={600} sx={{ color: t.text, fontSize: 14 }} noWrap>{tpl.name}</Typography>
                  {(() => {
                    const categoryColor = EMAIL_TEMPLATE_CATEGORY_COLORS[tpl.category] || dashboardTokens.colors.textSecondary;
                    return (
                  <Chip label={tpl.category} size="small"
                    sx={{ bgcolor: alpha(categoryColor, 0.13),
                          color: categoryColor, fontSize: 10 }} />
                    );
                  })()}
                </Box>
                <Typography variant="caption" sx={{ color: t.muted }}>{tpl.subject}</Typography>
                <Box sx={{ display: 'flex', gap: 0.5, mt: 1 }}>
                  <Tooltip title="Edit"><IconButton size="small" sx={{ color: dashboardSemanticColors.info }}
                    onClick={() => { setEditing({ ...tpl }); setEditOpen(true); }}>
                    <EditIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                  <Tooltip title="Duplicate"><IconButton size="small" sx={{ color: t.muted }}
                    onClick={() => marketingApi.duplicateTemplate(tpl.resource_id).then(load).catch(() => {})}>
                    <ContentCopyIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                  <Tooltip title="Delete"><IconButton size="small" sx={{ color: dashboardSemanticColors.danger }}
                    onClick={() => marketingApi.deleteTemplate(tpl.resource_id).then(load).catch(() => {})}>
                    <DeleteIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Edit dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editing?.resource_id ? 'Edit Template' : 'New Template'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={8}><TextField fullWidth label="Name" value={editing?.name || ''}
              onChange={e => setEditing(p => ({ ...p, name: e.target.value }))} /></Grid>
            <Grid item xs={4}><TextField fullWidth select label="Category" value={editing?.category || 'newsletter'}
              onChange={e => setEditing(p => ({ ...p, category: e.target.value as any }))}>
              {['newsletter','promotional','transactional','welcome','announcement','custom']
                .map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField></Grid>
            <Grid item xs={12}><TextField fullWidth label="Subject" value={editing?.subject || ''}
              onChange={e => setEditing(p => ({ ...p, subject: e.target.value }))} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Preview Text" value={editing?.preview_text || ''}
              onChange={e => setEditing(p => ({ ...p, preview_text: e.target.value }))} /></Grid>
            <Grid item xs={12}><TextField fullWidth multiline minRows={8} label="HTML Body"
              value={editing?.html_body || ''}
              onChange={e => setEditing(p => ({ ...p, html_body: e.target.value }))} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}
            sx={{ bgcolor: EMAIL_MARKETING_COLORS.accent, '&:hover': { bgcolor: EMAIL_MARKETING_COLORS.accentHover } }}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ── Automations Tab ───────────────────────────────────────────────────────────

function AutomationsTab() {
  const theme  = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const t = getEmailUiPalette(isDark);

  const [automations, setAutomations] = useState<Automation[]>([]);

  useEffect(() => {
    marketingApi.listAutomations().then((r: any) => setAutomations(r.data?.results ?? r.data ?? [])).catch(() => {});
  }, []);

  const load = () => marketingApi.listAutomations().then((r: any) => setAutomations(r.data?.results ?? r.data ?? [])).catch(() => {});

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button variant="contained" size="small" startIcon={<AddIcon />}
          sx={{ bgcolor: EMAIL_MARKETING_COLORS.accent, '&:hover': { bgcolor: EMAIL_MARKETING_COLORS.accentHover } }}>
          New Automation
        </Button>
      </Box>

      {automations.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <AutorenewIcon sx={{ fontSize: 60, color: t.muted, mb: 2 }} />
          <Typography sx={{ color: t.muted }}>No automations yet. Create one to get started.</Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {automations.map(a => (
            <Grid item key={a.resource_id}>
              <Card sx={{ bgcolor: t.cardBg, border: `1px solid ${t.border}`, borderRadius: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography fontWeight={600} sx={{ color: t.text }}>{a.name}</Typography>
                      {(() => {
                        const triggerColor = EMAIL_AUTOMATION_TRIGGER_COLORS[a.trigger] || dashboardTokens.colors.textSecondary;
                        return (
                      <Chip label={a.trigger.replace('_', ' ')} size="small"
                        sx={{ mt: 0.5,
                              bgcolor: alpha(triggerColor, 0.13),
                              color: triggerColor, fontSize: 11 }} />
                        );
                      })()}
                    </Box>
                    <FormControlLabel
                      control={
                        <Switch checked={a.is_active} size="small" color="primary"
                          onChange={() => (a.is_active
                            ? marketingApi.deactivateAutomation(a.resource_id)
                            : marketingApi.activateAutomation(a.resource_id)
                          ).then(load).catch(() => {})}
                        />
                      }
                      label={<Typography variant="caption" sx={{ color: t.muted }}>
                        {a.is_active ? 'Active' : 'Inactive'}
                      </Typography>}
                    />
                  </Box>

                  <Typography variant="caption" sx={{ color: t.muted, display: 'block', mt: 1 }}>
                    {a.steps.length} step{a.steps.length !== 1 ? 's' : ''}
                  </Typography>

                  {/* Steps timeline */}
                  <Box sx={{ mt: 1.5 }}>
                    {a.steps.map((step, i) => (
                      <Box key={i} sx={{ display: 'flex', gap: 1.5, mb: 1 }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <Avatar sx={{ width: 24, height: 24, bgcolor: EMAIL_MARKETING_COLORS.accent, fontSize: 11 }}>{i + 1}</Avatar>
                          {i < a.steps.length - 1 && (
                            <Box sx={{ width: 2, flex: 1, bgcolor: t.border, minHeight: 16 }} />
                          )}
                        </Box>
                        <Box sx={{ pb: i < a.steps.length - 1 ? 1 : 0 }}>
                          <Typography sx={{ color: t.text, fontSize: 13 }}>{step.subject}</Typography>
                          <Typography variant="caption" sx={{ color: t.muted }}>
                            {step.delay_days === 0 ? 'Immediately' : `After ${step.delay_days} day${step.delay_days !== 1 ? 's' : ''}`}
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                    <IconButton size="small" sx={{ color: dashboardSemanticColors.danger }}
                      onClick={() => marketingApi.deleteAutomation(a.resource_id).then(load).catch(() => {})}>
                      <DeleteIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

// ── Email Plan Tab ──────────────────────────────────────────────────────────────────

const EMAIL_PLAN_PRICES: Record<PlanTier, number> = {
  free: 0, starter: 15, professional: 49, enterprise: 99,
};

const EMAIL_PLAN_FEATURES: Record<PlanTier, string[]> = {
  free:         ['500 contacts', '1,000 emails/mo', '1 sending domain', 'Basic templates'],
  starter:      ['5,000 contacts', '50,000 emails/mo', '3 sending domains', 'A/B testing', 'Analytics'],
  professional: ['25,000 contacts', '250,000 emails/mo', '10 sending domains', 'Automations', 'Priority support'],
  enterprise:   ['Unlimited contacts', 'Unlimited emails', 'Custom domains', 'Dedicated IP', '24/7 support', 'Custom contracts'],
};

function EmailPlanTab() {
  const theme  = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const t = getEmailUiPalette(isDark);
  const fmtPrice = (n: number) => n === 0 ? 'Free' : `$${n}`;

  const [currentPlan, setCurrentPlan] = useState<PlanTier>('free');
  const [changing, setChanging]       = useState<PlanTier | null>(null);
  const [planLoading, setPlanLoading] = useState(true);

  useEffect(() => {
    billingApi.getAccount()
      .then((r: any) => setCurrentPlan(r.data.plan ?? 'free'))
      .catch(() => {})
      .finally(() => setPlanLoading(false));
  }, []);

  const changePlan = (plan: PlanTier) => {
    setChanging(plan);
    billingApi.changePlan(plan)
      .then(() => setCurrentPlan(plan))
      .catch(() => {})
      .finally(() => setChanging(null));
  };

  if (planLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Typography variant="h6" sx={{ color: t.text, mb: 1 }}>Email Marketing Plans</Typography>
      <Typography variant="body2" sx={{ color: t.sub, mb: 3 }}>
        Current plan:{' '}
        <span style={{ color: EMAIL_PLAN_COLOR[currentPlan], fontWeight: 700, textTransform: 'uppercase' }}>{currentPlan}</span>
        {' '}at{' '}
        <span style={{ color: t.text, fontWeight: 700 }}>{fmtPrice(EMAIL_PLAN_PRICES[currentPlan])}/month</span>
      </Typography>

      <Grid container spacing={3}>
        {(Object.keys(EMAIL_PLAN_PRICES) as PlanTier[]).map((tier) => {
          const isCurrentPlan = tier === currentPlan;
          const color = EMAIL_PLAN_COLOR[tier];
          return (
            <Grid key={tier} item xs={12} sm={6} md={3}>
              <Card sx={{
                bgcolor: t.cardBg,
                border: `2px solid ${isCurrentPlan ? color : t.border}`,
                position: 'relative',
                height: '100%',
                display: 'flex', flexDirection: 'column',
              }}>
                {isCurrentPlan && (
                  <Box sx={{ position: 'absolute', top: -1, left: '50%', transform: 'translateX(-50%)' }}>
                    <Chip label="CURRENT PLAN" size="small"
                      sx={{ bgcolor: color, color: dashboardTokens.colors.white, fontWeight: 700, fontSize: '0.6rem', borderRadius: '0 0 6px 6px' }} />
                  </Box>
                )}
                <CardContent sx={{ p: 2.5, flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    {tier === 'enterprise' && <StarIcon sx={{ color, fontSize: 20 }} />}
                    <Typography sx={{ color, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{tier}</Typography>
                  </Box>
                  <Typography sx={{ color: t.text, fontWeight: 800, fontSize: '1.8rem', mb: 0.5 }}>
                    {fmtPrice(EMAIL_PLAN_PRICES[tier])}
                    {tier !== 'free' && <Typography component="span" variant="caption" sx={{ color: t.sub }}>/mo</Typography>}
                  </Typography>
                  <Divider sx={{ borderColor: t.border, my: 1.5 }} />
                  <List dense sx={{ flex: 1, p: 0 }}>
                    {EMAIL_PLAN_FEATURES[tier].map(f => (
                      <ListItem key={f} sx={{ px: 0, py: 0.25 }}>
                        <CheckCircleIcon sx={{ fontSize: 14, color, mr: 1, flexShrink: 0 }} />
                        <ListItemText primary={<Typography variant="caption" sx={{ color: t.text }}>{f}</Typography>} />
                      </ListItem>
                    ))}
                  </List>
                  <Button
                    fullWidth variant={isCurrentPlan ? 'outlined' : 'contained'}
                    disabled={isCurrentPlan || changing !== null}
                    onClick={() => changePlan(tier)}
                    sx={{
                      mt: 2,
                      bgcolor: isCurrentPlan ? 'transparent' : color,
                      borderColor: color,
                      color: isCurrentPlan ? color : dashboardTokens.colors.white,
                      '&:hover': { bgcolor: isCurrentPlan ? alpha(color, 0.07) : darken(color, 0.12) },
                    }}
                  >
                    {changing === tier ? <CircularProgress size={16} /> :
                     isCurrentPlan ? 'Current Plan' :
                     EMAIL_PLAN_PRICES[tier] > EMAIL_PLAN_PRICES[currentPlan] ? 'Upgrade' : 'Downgrade'}
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}

// ── Main EmailMarketingPage ──────────────────────────────────────────────────────────────────

export default function EmailMarketingPage() {
  const theme  = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const t = getEmailUiPalette(isDark);

  const [tab, setTab]          = useState(0);
  const [stats, setStats]       = useState<AccountStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    marketingApi.accountStats()
      .then((r: any) => setStats(r.data))
      .catch(() => {})
      .finally(() => setStatsLoading(false));
  }, []);

  return (
    <Box sx={{ p: 3, bgcolor: t.panelBg, minHeight: '100%' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <CampaignIcon sx={{ color: EMAIL_MARKETING_COLORS.accent, fontSize: 32 }} />
        <Box>
          <Typography variant="h5" fontWeight={700} sx={{ color: t.text }}>
            Email Marketing
          </Typography>
          <Typography variant="body2" sx={{ color: t.muted }}>
            Campaigns · Contact Lists · Templates · Automations
          </Typography>
        </Box>
      </Box>

      {/* Tabs */}
      <Tabs
        value={tab} onChange={(_, v) => setTab(v)}
        sx={{
          mb: 3,
          borderBottom: `1px solid ${t.border}`,
          '& .MuiTab-root': { color: t.muted, textTransform: 'none', fontWeight: 500 },
          '& .Mui-selected': { color: `${EMAIL_MARKETING_COLORS.accent} !important` },
          '& .MuiTabs-indicator': { bgcolor: EMAIL_MARKETING_COLORS.accent },
        }}>
        <Tab label="Overview" icon={<BarChartIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
        <Tab label="Campaigns" icon={<CampaignIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
        <Tab label="Contacts" icon={<PeopleAltIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
        <Tab label="Templates" icon={<EditIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
        <Tab label="Automations" icon={<AutorenewIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
        <Tab label="Plan" icon={<LocalOfferIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
      </Tabs>

      {/* Tab content */}
      {tab === 0 && <OverviewTab stats={stats} loading={statsLoading} />}
      {tab === 1 && <CampaignsTab />}
      {tab === 2 && <ContactsTab />}
      {tab === 3 && <TemplatesTab />}
      {tab === 4 && <AutomationsTab />}
      {tab === 5 && <EmailPlanTab />}
    </Box>
  );
}
