import React, { useEffect, useRef, useState } from 'react';
import {
  Box, CircularProgress, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody,
  Chip, Button, Tabs, Tab, Grid, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Select, MenuItem, FormControl, InputLabel,
  IconButton, Tooltip, Switch,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { dashboardTokens, dashboardSemanticColors } from '../styles/dashboardDesignSystem';
import {
  ApiWebhook, listWebhooks, createWebhook, deleteWebhook,
} from '../services/webhooksApi';

const T = dashboardTokens.colors;
const S = dashboardSemanticColors;

const EMPTY_FORM = { name: '', url: '', secret: '', retries: 3, events: [] as string[] };

const ALL_EVENTS = [
  'deployment.created', 'deployment.completed', 'deployment.failed',
  'alert.triggered', 'alert.resolved', 'alert.critical',
  'incident.created', 'incident.resolved',
  'iam.*', 'iam.CreateUser', 'iam.DeleteUser',
  'billing.threshold', 'billing.invoice',
  'slo.breached', 'slo.recovered',
  'container.pushed', 'container.deleted',
];


export default function DevWebhooksPage() {
  const [tab, setTab] = useState(0);
  const [open, setOpen] = useState(false);
  const [webhooks, setWebhooks] = useState<ApiWebhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    listWebhooks().then(data => {
      if (mounted.current) { setWebhooks(data); setLoading(false); }
    });
    return () => { mounted.current = false; };
  }, []);

  const webhookToDelete = webhooks.find(w => w.id === deleteId);

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const ok = await deleteWebhook(deleteId);
    if (ok) setWebhooks(prev => prev.filter(w => w.id !== deleteId));
    setDeleting(false);
    setDeleteId(null);
  };

  const handleCreate = async () => {
    if (!form.name.trim() || !form.url.trim()) return;
    setSaving(true);
    const created = await createWebhook({
      name:    form.name,
      url:     form.url,
      events:  form.events,
      secret:  form.secret,
      retries: form.retries,
      status:  'active',
    });
    if (created && mounted.current) setWebhooks(prev => [created, ...prev]);
    setSaving(false);
    setForm(EMPTY_FORM);
    setOpen(false);
  };

  return (
    <Box sx={{ p: 3, bgcolor: T.background, minHeight: '100vh', fontFamily: dashboardTokens.typography.fontFamily }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ color: T.textPrimary, fontWeight: 700 }}>Webhooks</Typography>
          <Typography variant="body2" sx={{ color: T.textSecondary, mt: 0.3 }}>Configure outbound webhooks for CI/CD, alerts, and automation integrations</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}
          sx={{ bgcolor: T.brandPrimary, '&:hover': { bgcolor: T.brandPrimaryHover } }}>
          Add Webhook
        </Button>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Active Webhooks', value: webhooks.filter(w => w.status === 'active').length, color: S.success },
          { label: 'Total Webhooks', value: webhooks.length },
          { label: 'Deliveries Today', value: 0, color: T.brandPrimary },
          { label: 'Failed Deliveries', value: 0, color: S.danger },
        ].map(c => (
          <Grid item xs={6} sm={3} key={c.label}>
            <Paper sx={{ p: 2, borderRadius: 2, border: `1px solid ${T.border}`, bgcolor: T.surface }}>
              <Typography variant="caption" sx={{ color: T.textSecondary, textTransform: 'uppercase', letterSpacing: '.06em' }}>{c.label}</Typography>
              <Typography variant="h4" sx={{ color: (c as any).color || T.textPrimary, fontWeight: 700, mt: 0.5 }}>{c.value}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ borderRadius: 2, border: `1px solid ${T.border}`, bgcolor: T.surface }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2, borderBottom: `1px solid ${T.border}` }}>
          <Tab label="Webhooks" />
          <Tab label="Delivery Log" />
          <Tab label="Event Catalog" />
        </Tabs>

        {tab === 0 && (
          loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress size={28} sx={{ color: T.brandPrimary }} />
            </Box>
          ) : (
          <Table>
            <TableHead>
              <TableRow>
                {['Name', 'Endpoint URL', 'Events', 'Signed', 'Retries', 'Active', 'Actions'].map(h => (
                  <TableCell key={h} sx={{ color: T.textSecondary, fontSize: '.75rem', fontWeight: 600 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {webhooks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ textAlign: 'center', color: T.textSecondary, py: 4 }}>
                    No webhooks configured. Click <strong>Add Webhook</strong> to create one.
                  </TableCell>
                </TableRow>
              ) : webhooks.map(wh => (
                <TableRow key={wh.id} hover sx={{ '&:hover': { bgcolor: T.surfaceHover } }}>
                  <TableCell sx={{ color: T.textPrimary, fontWeight: 600 }}>{wh.name}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, maxWidth: 220 }}>
                      <Typography variant="caption" sx={{ color: T.textSecondary, fontFamily: 'monospace', fontSize: '.72rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {wh.url.length > 40 ? wh.url.slice(0, 40) + '…' : wh.url}
                      </Typography>
                      <ContentCopyIcon sx={{ fontSize: '.8rem', color: T.textSecondary, cursor: 'pointer', flexShrink: 0 }} onClick={() => navigator.clipboard?.writeText(wh.url)} />
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.4, flexWrap: 'wrap', maxWidth: 200 }}>
                      {wh.events.slice(0, 2).map(e => (
                        <Chip key={e} label={e} size="small" sx={{ bgcolor: T.surfaceSubtle, color: T.textSecondary, fontFamily: 'monospace', fontSize: '.62rem' }} />
                      ))}
                      {wh.events.length > 2 && <Chip label={`+${wh.events.length - 2}`} size="small" sx={{ bgcolor: T.surfaceSubtle, color: T.textSecondary, fontSize: '.62rem' }} />}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip label={wh.signed ? 'HMAC-SHA256' : 'None'} size="small"
                      sx={{ bgcolor: wh.signed ? `${S.success}22` : T.surfaceSubtle, color: wh.signed ? S.success : T.textSecondary, fontSize: '.65rem' }} />
                  </TableCell>
                  <TableCell sx={{ color: T.textPrimary }}>{wh.retries}×</TableCell>
                  <TableCell>
                    <Switch size="small" checked={wh.status === 'active'} readOnly />
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Test Webhook"><IconButton size="small" sx={{ color: S.success }}><PlayArrowIcon fontSize="small" /></IconButton></Tooltip>
                    <IconButton size="small" sx={{ color: T.textSecondary }}><EditIcon fontSize="small" /></IconButton>
                    <Tooltip title="Delete Webhook">
                      <IconButton size="small" sx={{ color: S.danger }} onClick={() => setDeleteId(wh.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          )
        )}

        {tab === 1 && (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography sx={{ color: T.textPrimary, fontWeight: 700, mb: 1 }}>No delivery log data</Typography>
            <Typography sx={{ color: T.textSecondary, fontSize: '.9rem' }}>
              Delivery history will appear here once webhooks start firing against a live backend.
            </Typography>
          </Box>
        )}

        {tab === 2 && (
          <Box sx={{ p: 3 }}>
            <Typography variant="body2" sx={{ color: T.textSecondary, mb: 2 }}>All subscribable events. Use wildcards like <Box component="span" sx={{ fontFamily: 'monospace', color: T.brandPrimary }}>iam.*</Box> to catch all events in a namespace.</Typography>
            <Grid container spacing={1}>
              {ALL_EVENTS.map(ev => (
                <Grid item xs={12} sm={6} md={4} key={ev}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, borderRadius: 1, '&:hover': { bgcolor: T.surfaceHover } }}>
                    <ContentCopyIcon sx={{ fontSize: '.8rem', color: T.textSecondary, cursor: 'pointer' }} onClick={() => navigator.clipboard?.writeText(ev)} />
                    <Typography variant="caption" sx={{ color: T.textPrimary, fontFamily: 'monospace', fontSize: '.82rem' }}>{ev}</Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}
      </Paper>

      {/* ── Delete Confirmation Dialog ───────────────────────────────── */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: T.textPrimary }}>Delete Webhook</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: T.textSecondary }}>
            Are you sure you want to delete{' '}
            <Box component="span" sx={{ color: T.textPrimary, fontWeight: 700 }}>
              {webhookToDelete?.name}
            </Box>
            ? This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteId(null)} sx={{ color: T.textSecondary }} disabled={deleting}>Cancel</Button>
          <Button variant="contained" onClick={handleDeleteConfirm} disabled={deleting}
            sx={{ bgcolor: S.danger, '&:hover': { bgcolor: S.danger, filter: 'brightness(0.85)' } }}>
            {deleting ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Add Webhook Dialog ───────────────────────────────────────────── */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: T.textPrimary }}>Add Webhook</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '12px !important' }}>
          <TextField
            label="Webhook Name" fullWidth size="small"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          />
          <TextField
            label="Endpoint URL" fullWidth size="small" placeholder="https://your-server.com/webhook"
            value={form.url}
            onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
          />
          <FormControl size="small" fullWidth>
            <InputLabel>Events</InputLabel>
            <Select
              label="Events" multiple
              value={form.events}
              onChange={e => setForm(f => ({ ...f, events: e.target.value as string[] }))}
              renderValue={(sel: any) => (sel as string[]).join(', ')}
            >
              {ALL_EVENTS.map(ev => <MenuItem key={ev} value={ev} sx={{ fontFamily: 'monospace', fontSize: '.85rem' }}>{ev}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField
            label="Secret (for HMAC signature)" fullWidth size="small" type="password"
            placeholder="Leave empty for no signing"
            value={form.secret}
            onChange={e => setForm(f => ({ ...f, secret: e.target.value }))}
          />
          <FormControl size="small" fullWidth>
            <InputLabel>Max Retries</InputLabel>
            <Select
              label="Max Retries"
              value={form.retries}
              onChange={e => setForm(f => ({ ...f, retries: Number(e.target.value) }))}
            >
              {[0,1,2,3,5].map(n => <MenuItem key={n} value={n}>{n}</MenuItem>)}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => { setOpen(false); setForm(EMPTY_FORM); }} sx={{ color: T.textSecondary }} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={saving || !form.name.trim() || !form.url.trim()}
            sx={{ bgcolor: T.brandPrimary, '&:hover': { bgcolor: T.brandPrimaryHover } }}>
            {saving ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
