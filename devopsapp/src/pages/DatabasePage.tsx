// OrcaCloud – Managed Database Page

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Stack, Button, Chip, Divider,
  IconButton, Tooltip, Dialog, DialogTitle, DialogContent,
  DialogActions, Skeleton, Alert, Snackbar, Tabs, Tab,
  Table, TableBody, TableCell, TableHead, TableRow,
  CircularProgress, Paper,
} from '@mui/material';
import { alpha, darken, useTheme } from '@mui/material/styles';
import AddIcon                from '@mui/icons-material/Add';
import RefreshIcon            from '@mui/icons-material/Refresh';
import DeleteOutlineIcon      from '@mui/icons-material/DeleteOutline';
import ContentCopyIcon        from '@mui/icons-material/ContentCopy';
import BackupIcon             from '@mui/icons-material/Backup';
import RestoreIcon            from '@mui/icons-material/RestoreOutlined';
import RotateRightIcon        from '@mui/icons-material/Loop';
import VisibilityIcon         from '@mui/icons-material/Visibility';
import VisibilityOffIcon      from '@mui/icons-material/VisibilityOff';
import TerminalIcon           from '@mui/icons-material/Terminal';
import LockIcon               from '@mui/icons-material/Lock';
import SyncIcon               from '@mui/icons-material/Sync';
import { databaseApi }        from '../services/cloudApi';
import {
  ManagedDatabase, DBMetric, DBBackup, DBCredential,
  ENGINE_META, DBStatus,
} from '../types/database';
import CreateDatabaseModal from '../components/Cloud/CreateDatabaseModal';
import MigrateDatabaseModal from '../components/Cloud/MigrateDatabaseModal';
import {
  dashboardTokens,
  dashboardSemanticColors,
  dashboardStatusColors,
  computeUiTokens,
} from '../styles/dashboardDesignSystem';

const uiPalette = {
  white: dashboardTokens.colors.white,
  border: dashboardTokens.colors.border,
  borderStrong: dashboardTokens.colors.borderStrong,
  surface: dashboardTokens.colors.surface,
  surfaceSubtle: dashboardTokens.colors.surfaceSubtle,
  surfaceHover: dashboardTokens.colors.surfaceHover,
  textStrong: computeUiTokens.neutralStrong,
  textBody: computeUiTokens.neutralBody,
  textMuted: computeUiTokens.neutralMuted,
  textSecondary: computeUiTokens.neutralMuted,
  accent: computeUiTokens.accentStrong,
  accentHover: darken(computeUiTokens.accentStrong, 0.2),
  success: computeUiTokens.successStrong,
  warning: dashboardSemanticColors.warning,
  danger: dashboardSemanticColors.danger,
  info: dashboardSemanticColors.info,
  purple: dashboardStatusColors.plan.professional,
  pink: dashboardSemanticColors.pink,
  darkPanel: computeUiTokens.darkPanel,
  darkPage: alpha(computeUiTokens.darkPanel, 0.82),
  darkSidebar: alpha(computeUiTokens.darkPanel, 0.88),
  panelStrokeDark: alpha(dashboardTokens.colors.white, 0.08),
  panelMutedDark: alpha(dashboardTokens.colors.white, 0.5),
  panelMutedAltDark: alpha(dashboardTokens.colors.white, 0.45),
  panelLowDark: alpha(dashboardTokens.colors.white, 0.04),
  panelMedDark: alpha(dashboardTokens.colors.white, 0.06),
  panelFaintDark: alpha(dashboardTokens.colors.white, 0.03),
  panelGhostDark: alpha(dashboardTokens.colors.white, 0.3),
  panelGhostStrongDark: alpha(dashboardTokens.colors.white, 0.4),
  panelDisabledDark: alpha(dashboardTokens.colors.white, 0.2),
  neutralSoftLight: alpha(computeUiTokens.neutralStrong, 0.05),
  neutralFaintLight: alpha(computeUiTokens.neutralStrong, 0.04),
};

// ── Status colours ────────────────────────────────────────────────────────────
const STATUS_STYLE: Record<DBStatus, { bg: string; text: string; label: string }> = {
  running:      { bg: alpha(uiPalette.success, 0.12), text: uiPalette.success, label: 'Running' },
  provisioning: { bg: alpha(uiPalette.warning, 0.12), text: uiPalette.warning, label: 'Provisioning' },
  stopped:      { bg: alpha(uiPalette.textSecondary, 0.12), text: uiPalette.textSecondary, label: 'Stopped' },
  restarting:   { bg: alpha(uiPalette.purple, 0.12), text: uiPalette.purple, label: 'Restarting' },
  scaling:      { bg: alpha(uiPalette.purple, 0.12), text: uiPalette.purple, label: 'Scaling' },
  deleting:     { bg: alpha(uiPalette.danger, 0.12), text: uiPalette.danger, label: 'Deleting' },
  error:        { bg: alpha(uiPalette.danger, 0.12), text: uiPalette.danger, label: 'Error' },
  backup:       { bg: alpha(uiPalette.warning, 0.12), text: uiPalette.warning, label: 'Backup' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n: number | null | undefined, unit = '', digits = 1) {
  if (n == null) return '—';
  return `${n.toFixed(digits)}${unit}`;
}
function fmtMem(mb: number) { return mb >= 1024 ? `${(mb / 1024).toFixed(0)} GB` : `${mb} MB`; }

// ── DB list card ──────────────────────────────────────────────────────────────
function DBCard({ db, selected, onClick, isDark }: {
  db: ManagedDatabase; selected: boolean; onClick: () => void; isDark: boolean;
}) {
  const meta = ENGINE_META[db.engine];
  const st   = STATUS_STYLE[db.status] ?? STATUS_STYLE.stopped;
  const border = isDark ? uiPalette.panelStrokeDark : uiPalette.border;
  return (
    <Box onClick={onClick} sx={{
      px: 2, py: 1.75, cursor: 'pointer', transition: 'background .12s',
      bgcolor: selected ? (isDark ? alpha(uiPalette.accent, 0.35) : alpha(uiPalette.accent, 0.06)) : 'transparent',
      borderLeft: `3px solid ${selected ? uiPalette.accent : 'transparent'}`,
      borderBottom: `1px solid ${border}`,
      '&:hover': { bgcolor: isDark ? uiPalette.panelLowDark : alpha(uiPalette.accent, 0.03) },
    }}>
      <Box display="flex" alignItems="center" gap={1.5}>
        <Box sx={{ width: 34, height: 34, borderRadius: '8px', bgcolor: meta.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Typography fontWeight={800} fontSize=".65rem" color={uiPalette.white}>{meta.icon}</Typography>
        </Box>
        <Box flex={1} minWidth={0}>
          <Box display="flex" alignItems="center" gap={1}>
            <Typography fontWeight={700} fontSize=".88rem" color={isDark ? uiPalette.white : uiPalette.textStrong} noWrap>{db.name}</Typography>
            <Chip size="small" label={st.label} sx={{ height: 16, fontSize: '.6rem', fontWeight: 700, bgcolor: st.bg, color: st.text }} />
          </Box>
          <Typography variant="caption" sx={{ color: isDark ? uiPalette.panelMutedDark : uiPalette.textMuted }}>
            {db.engine_display} v{db.version} &nbsp;·&nbsp; {db.region_display?.split(' — ')[0] ?? db.region}
          </Typography>
        </Box>
      </Box>
      <Box display="flex" gap={2} mt={.75} pl={5.5}>
        {[
          `${db.vcpus} vCPU`,
          fmtMem(db.memory_mb),
          `${db.storage_gb} GB`,
        ].map(s => (
          <Typography key={s} variant="caption" sx={{ color: isDark ? uiPalette.panelGhostStrongDark : uiPalette.textMuted }}>{s}</Typography>
        ))}
      </Box>
    </Box>
  );
}

// ── Metric bar ────────────────────────────────────────────────────────────────
function MetricBar({ label, value, max = 100, unit = '%', color = uiPalette.accent, isDark }: {
  label: string; value: number | null; max?: number; unit?: string; color?: string; isDark: boolean;
}) {
  const pct = value != null ? Math.min((value / max) * 100, 100) : 0;
  return (
    <Box>
      <Box display="flex" justifyContent="space-between" mb={.4}>
        <Typography variant="caption" sx={{ color: isDark ? alpha(uiPalette.white, 0.55) : uiPalette.textSecondary }}>{label}</Typography>
        <Typography variant="caption" fontWeight={700} color={isDark ? uiPalette.white : uiPalette.textStrong}>
          {value != null ? `${value.toFixed(1)}${unit}` : '—'}
        </Typography>
      </Box>
      <Box sx={{ height: 5, bgcolor: isDark ? uiPalette.panelStrokeDark : uiPalette.surfaceHover, borderRadius: 3 }}>
        <Box sx={{ width: `${pct}%`, height: '100%', bgcolor: pct > 80 ? uiPalette.danger : pct > 60 ? uiPalette.warning : color, borderRadius: 3, transition: 'width .3s' }} />
      </Box>
    </Box>
  );
}

// ── Section card wrapper ──────────────────────────────────────────────────────
function SCard({ children, isDark }: { children: React.ReactNode; isDark: boolean }) {
  return (
    <Paper elevation={0} sx={{
      bgcolor: isDark ? uiPalette.darkPanel : uiPalette.white,
      border: `1px solid ${isDark ? uiPalette.panelStrokeDark : uiPalette.border}`,
      borderRadius: '12px', p: 2.5, mb: 2,
    }}>
      {children}
    </Paper>
  );
}

// ── Connection string row ─────────────────────────────────────────────────────
function ConnRow({ label, value, mono = false, isDark }: {
  label: string; value: string; mono?: boolean; isDark: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  const textSec = isDark ? uiPalette.panelMutedDark : uiPalette.textMuted;
  return (
    <Box display="flex" alignItems="center" gap={1} py={.4}>
      <Typography variant="caption" sx={{ color: textSec, minWidth: 120 }}>{label}</Typography>
      <Typography variant="caption" sx={{ flex: 1, fontFamily: mono ? 'monospace' : 'inherit', color: isDark ? uiPalette.white : uiPalette.textStrong, wordBreak: 'break-all', fontSize: mono ? '.78rem' : '.82rem' }}>
        {value || '—'}
      </Typography>
      <Tooltip title={copied ? 'Copied!' : 'Copy'}><IconButton size="small" onClick={copy} sx={{ color: textSec }}><ContentCopyIcon sx={{ fontSize: '.85rem' }} /></IconButton></Tooltip>
    </Box>
  );
}

// ── Credentials tab ───────────────────────────────────────────────────────────
function CredentialsTab({ db, isDark }: { db: ManagedDatabase; isDark: boolean }) {
  const [creds, setCreds]     = useState<DBCredential[]>(db.credentials ?? []);
  const [loading, setLoading] = useState(false);
  const [shown, setShown]     = useState<Record<number, boolean>>({});
  const [rotating, setRotating] = useState<number | null>(null);
  const [newCred, setNewCred] = useState<{ username: string; password: string } | null>(null);
  const bg     = isDark ? uiPalette.panelLowDark : uiPalette.surfaceSubtle;
  const border = isDark ? uiPalette.panelStrokeDark : uiPalette.border;

  const refresh = useCallback(() => {
    setLoading(true);
    databaseApi.credentials(db.id).then(r => { setCreds(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, [db.id]);

  const rotate = async (username: string, id: number) => {
    setRotating(id);
    try {
      const r = await databaseApi.rotate(db.id, username);
      setNewCred({ username: r.data.username, password: r.data.password });
      refresh();
    } finally { setRotating(null); }
  };

  return (
    <Box>
      {newCred && (
        <Alert severity="success" onClose={() => setNewCred(null)} sx={{ mb: 2 }}>
          <strong>New password for {newCred.username}:</strong>&nbsp;
          <code style={{ fontFamily: 'monospace' }}>{newCred.password}</code>&nbsp;— copy it now, it won't be shown again.
        </Alert>
      )}
      <Box display="flex" justifyContent="flex-end" mb={1.5}>
        <Button size="small" startIcon={<RefreshIcon />} onClick={refresh} disabled={loading} sx={{ textTransform: 'none', color: isDark ? uiPalette.white : uiPalette.textBody }}>Refresh</Button>
      </Box>
      <Stack spacing={1.5}>
        {loading ? [1,2].map(k => <Skeleton key={k} height={70} sx={{ bgcolor: isDark ? uiPalette.panelMedDark : uiPalette.neutralSoftLight, borderRadius: 2 }} />) :
        creds.map(c => (
          <Box key={c.id} sx={{ p: 1.75, bgcolor: bg, borderRadius: '10px', border: `1px solid ${border}` }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={.75} flexWrap="wrap" gap={1}>
              <Box display="flex" alignItems="center" gap={1}>
                <LockIcon sx={{ fontSize: '.9rem', color: isDark ? uiPalette.panelGhostStrongDark : uiPalette.textMuted }} />
                <Typography fontWeight={700} fontSize=".88rem" color={isDark ? uiPalette.white : uiPalette.textStrong}>{c.username}</Typography>
                <Chip size="small" label={c.role} sx={{ height: 16, fontSize: '.6rem', fontWeight: 700,
                  bgcolor: c.role === 'admin' ? alpha(uiPalette.danger, 0.1) : alpha(uiPalette.accent, 0.1),
                  color: c.role === 'admin' ? uiPalette.danger : uiPalette.accent }} />
              </Box>
              <Button size="small" startIcon={rotating === c.id ? <CircularProgress size={12} /> : <RotateRightIcon />}
                onClick={() => rotate(c.username, c.id)} disabled={rotating === c.id}
                sx={{ textTransform: 'none', fontSize: '.78rem', color: isDark ? uiPalette.white : uiPalette.textBody }}>
                Rotate
              </Button>
            </Box>
            <Box display="flex" alignItems="center" gap={1}>
              <Typography sx={{ fontFamily: 'monospace', fontSize: '.82rem', color: isDark ? alpha(uiPalette.white, 0.6) : uiPalette.textSecondary, flex: 1 }}>
                {shown[c.id] ? c.password : '••••••••••••••••••••'}
              </Typography>
              <IconButton size="small" onClick={() => setShown(s => ({ ...s, [c.id]: !s[c.id] }))} sx={{ color: isDark ? uiPalette.panelGhostStrongDark : uiPalette.textMuted }}>
                {shown[c.id] ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
              </IconButton>
              <IconButton size="small" onClick={() => navigator.clipboard.writeText(c.password)} sx={{ color: isDark ? uiPalette.panelGhostStrongDark : uiPalette.textMuted }}>
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Box>
            {c.last_rotated_at && (
              <Typography variant="caption" sx={{ color: isDark ? uiPalette.panelGhostDark : uiPalette.textMuted, mt: .5, display: 'block' }}>
                Last rotated: {new Date(c.last_rotated_at).toLocaleString()}
              </Typography>
            )}
          </Box>
        ))}
      </Stack>
    </Box>
  );
}

// ── Backups tab ───────────────────────────────────────────────────────────────
function BackupsTab({ db, isDark }: { db: ManagedDatabase; isDark: boolean }) {
  const [backups, setBackups]   = useState<DBBackup[]>(db.backups ?? []);
  const [loading, setLoading]   = useState(false);
  const [creating, setCreating] = useState(false);
  const bg     = isDark ? uiPalette.panelLowDark : uiPalette.surfaceSubtle;
  const border = isDark ? uiPalette.panelStrokeDark : uiPalette.border;

  const refresh = () => {
    setLoading(true);
    databaseApi.backups(db.id).then(r => { setBackups(r.data); setLoading(false); }).catch(() => setLoading(false));
  };

  const createBackup = async () => {
    setCreating(true);
    await databaseApi.backup(db.id, 'manual').catch(() => {});
    setCreating(false);
    refresh();
  };

  const statusColor = (s: string) => ({ completed: uiPalette.success, running: uiPalette.warning, failed: uiPalette.danger }[s] ?? uiPalette.textSecondary);

  return (
    <Box>
      <Box display="flex" justifyContent="flex-end" gap={1} mb={1.5}>
        <Button size="small" startIcon={<RefreshIcon />} onClick={refresh} sx={{ textTransform: 'none', color: isDark ? uiPalette.white : uiPalette.textBody }}>Refresh</Button>
        <Button size="small" variant="contained" startIcon={creating ? <CircularProgress size={12} color="inherit" /> : <BackupIcon />}
          onClick={createBackup} disabled={creating || db.status !== 'running'}
          sx={{ bgcolor: uiPalette.accent, '&:hover': { bgcolor: uiPalette.accentHover }, textTransform: 'none', borderRadius: '8px', fontWeight: 600 }}>
          Create Backup
        </Button>
      </Box>
      {loading ? [1,2,3].map(k => <Skeleton key={k} height={50} sx={{ mb: 1, bgcolor: isDark ? uiPalette.panelMedDark : uiPalette.neutralSoftLight, borderRadius: 1 }} />) : (
        backups.length === 0 ? (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <BackupIcon sx={{ fontSize: '2rem', color: isDark ? uiPalette.panelDisabledDark : uiPalette.border, mb: 1 }} />
            <Typography variant="body2" sx={{ color: isDark ? uiPalette.panelGhostStrongDark : uiPalette.textMuted }}>No backups yet</Typography>
          </Box>
        ) : (
          <Stack spacing={1}>
            {backups.map(b => (
              <Box key={b.backup_id} display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}
                sx={{ p: 1.5, bgcolor: bg, borderRadius: '8px', border: `1px solid ${border}` }}>
                <Box>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Chip size="small" label={b.status} sx={{ height: 16, fontSize: '.6rem', fontWeight: 700, bgcolor: `${statusColor(b.status)}18`, color: statusColor(b.status) }} />
                    <Chip size="small" label={b.backup_type} sx={{ height: 16, fontSize: '.6rem', fontWeight: 700, bgcolor: isDark ? uiPalette.panelStrokeDark : uiPalette.surfaceHover, color: isDark ? uiPalette.white : uiPalette.textBody }} />
                    <Typography variant="caption" sx={{ color: isDark ? uiPalette.panelMutedAltDark : uiPalette.textMuted }}>{b.size_gb.toFixed(2)} GB</Typography>
                  </Box>
                  <Typography variant="caption" sx={{ color: isDark ? uiPalette.panelFaintDark : uiPalette.textMuted, display: 'block', mt: .25 }}>
                    {new Date(b.created_at).toLocaleString()} &nbsp;·&nbsp; {b.duration_s}s
                  </Typography>
                </Box>
                <Tooltip title="Restore from backup">
                  <span>
                    <IconButton size="small" disabled={b.status !== 'completed'}
                      onClick={() => databaseApi.restore(db.id, b.backup_id)}
                      sx={{ color: b.status === 'completed' ? (isDark ? uiPalette.white : uiPalette.accent) : isDark ? uiPalette.panelDisabledDark : uiPalette.borderStrong }}>
                      <RestoreIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>
            ))}
          </Stack>
        )
      )}
    </Box>
  );
}

// ── Metrics tab ───────────────────────────────────────────────────────────────
function MetricsTab({ db, isDark }: { db: ManagedDatabase; isDark: boolean }) {
  const [metrics, setMetrics] = useState<DBMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const latest = metrics[0];

  useEffect(() => {
    databaseApi.metrics(db.id).then(r => { setMetrics(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, [db.id]);

  const border  = isDark ? uiPalette.panelStrokeDark : uiPalette.border;
  const textSec = isDark ? uiPalette.panelMutedDark : uiPalette.textMuted;

  const statBoxes = latest ? [
    { label: 'CPU', value: `${fmt(latest.cpu_percent)}%`, color: uiPalette.accent },
    { label: 'Memory', value: `${fmt(latest.memory_percent)}%`, color: uiPalette.purple },
    { label: 'Storage', value: `${fmt(latest.storage_used_gb, ' GB')}`, color: uiPalette.warning },
    { label: 'Connections', value: String(latest.active_connections ?? '—'), color: uiPalette.success },
    { label: 'QPS', value: fmt(latest.queries_per_second), color: uiPalette.pink },
    { label: 'Latency', value: `${fmt(latest.avg_query_latency_ms, 'ms')}`, color: uiPalette.purple },
  ] : [];

  if (loading) return (
    <Box display="grid" gridTemplateColumns="repeat(3,1fr)" gap={1.5}>
      {[1,2,3,4,5,6].map(k => <Skeleton key={k} height={72} sx={{ bgcolor: isDark ? uiPalette.panelMedDark : uiPalette.neutralSoftLight, borderRadius: 2 }} />)}
    </Box>
  );

  return (
    <Box>
      {/* Stat boxes */}
      <Box display="grid" gridTemplateColumns={{ xs: 'repeat(2,1fr)', sm: 'repeat(3,1fr)' }} gap={1.5} mb={2.5}>
        {statBoxes.map(s => (
          <Box key={s.label} sx={{ p: 1.5, bgcolor: isDark ? uiPalette.panelLowDark : uiPalette.surfaceSubtle, borderRadius: '10px', border: `1px solid ${border}` }}>
            <Typography variant="caption" sx={{ color: textSec, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '.07em', fontSize: '.65rem' }}>{s.label}</Typography>
            <Typography fontWeight={800} fontSize="1.3rem" color={s.color} mt={.25}>{s.value}</Typography>
          </Box>
        ))}
      </Box>
      {/* Progress bars */}
      {latest && (
        <Box sx={{ p: 2, bgcolor: isDark ? uiPalette.panelLowDark : uiPalette.surfaceSubtle, borderRadius: '10px', border: `1px solid ${border}` }}>
          <Typography fontWeight={700} fontSize=".88rem" color={isDark ? uiPalette.white : uiPalette.textStrong} mb={1.5}>Resource Utilisation</Typography>
          <Stack spacing={1.5}>
            <MetricBar label="CPU"     value={latest.cpu_percent}     color={uiPalette.accent} isDark={isDark} />
            <MetricBar label="Memory"  value={latest.memory_percent}  color={uiPalette.purple} isDark={isDark} />
            <MetricBar label="Storage" value={latest.storage_used_gb} max={db.storage_gb} unit=" GB" color={uiPalette.warning} isDark={isDark} />
          </Stack>
        </Box>
      )}
      {/* Recent history table */}
      {metrics.length > 1 && (
        <Box sx={{ mt: 2, border: `1px solid ${border}`, borderRadius: '10px', overflow: 'hidden' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: isDark ? uiPalette.panelLowDark : uiPalette.surfaceSubtle }}>
                {['Time', 'CPU %', 'Mem %', 'Connections', 'QPS', 'Latency (ms)'].map(h => (
                  <TableCell key={h} sx={{ fontSize: '.75rem', fontWeight: 700, color: textSec, borderColor: border }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {metrics.slice(0, 12).map(m => (
                <TableRow key={m.id} sx={{ '&:hover': { bgcolor: isDark ? uiPalette.panelFaintDark : alpha(uiPalette.textStrong, 0.02) } }}>
                  <TableCell sx={{ fontSize: '.78rem', color: textSec, borderColor: border }}>{new Date(m.created_at).toLocaleTimeString()}</TableCell>
                  <TableCell sx={{ fontSize: '.78rem', color: isDark ? uiPalette.white : uiPalette.textStrong, borderColor: border }}>{fmt(m.cpu_percent, '%')}</TableCell>
                  <TableCell sx={{ fontSize: '.78rem', color: isDark ? uiPalette.white : uiPalette.textStrong, borderColor: border }}>{fmt(m.memory_percent, '%')}</TableCell>
                  <TableCell sx={{ fontSize: '.78rem', color: isDark ? uiPalette.white : uiPalette.textStrong, borderColor: border }}>{m.active_connections ?? '—'}</TableCell>
                  <TableCell sx={{ fontSize: '.78rem', color: isDark ? uiPalette.white : uiPalette.textStrong, borderColor: border }}>{fmt(m.queries_per_second)}</TableCell>
                  <TableCell sx={{ fontSize: '.78rem', color: isDark ? uiPalette.white : uiPalette.textStrong, borderColor: border }}>{fmt(m.avg_query_latency_ms)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}
    </Box>
  );
}

// ── Detail panel ──────────────────────────────────────────────────────────────
function DatabaseDetail({ db, onDelete, onRefresh, isDark }: {
  db: ManagedDatabase; onDelete: () => void; onRefresh: () => void; isDark: boolean;
}) {
  const [tab, setTab]               = useState(0);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting]     = useState(false);
  const [migrateOpen, setMigrate]   = useState(false);
  const meta   = ENGINE_META[db.engine];
  const st     = STATUS_STYLE[db.status] ?? STATUS_STYLE.stopped;
  const border = isDark ? uiPalette.panelStrokeDark : uiPalette.border;

  const doDelete = async () => {
    setDeleting(true);
    await databaseApi.delete(db.id).catch(() => {});
    setDeleting(false);
    setDeleteOpen(false);
    onDelete();
  };

  const restart = async () => {
    await databaseApi.restart(db.id).catch(() => {});
    onRefresh();
  };

  return (
    <>
      {/* Header */}
      <Box sx={{ p: 2.5, borderBottom: `1px solid ${border}` }}>
        <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={2}>
          <Box display="flex" alignItems="center" gap={1.5}>
            <Box sx={{ width: 42, height: 42, borderRadius: '10px', bgcolor: meta.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Typography fontWeight={800} fontSize=".75rem" color={uiPalette.white}>{meta.icon}</Typography>
            </Box>
            <Box>
              <Typography fontWeight={800} fontSize="1.05rem" color={isDark ? uiPalette.white : uiPalette.textStrong}>{db.name}</Typography>
              <Typography variant="caption" sx={{ color: isDark ? uiPalette.panelMutedDark : uiPalette.textMuted }}>
                {db.engine_display} v{db.version} &nbsp;·&nbsp; {db.region_display}
              </Typography>
            </Box>
          </Box>
          <Box display="flex" gap={.75} flexWrap="wrap" justifyContent="flex-end">
            <Chip size="small" label={st.label} sx={{ bgcolor: st.bg, color: st.text, fontWeight: 700, fontSize: '.72rem' }} />
            <Tooltip title="Migrate to another database">
              <span>
                <IconButton size="small" onClick={() => setMigrate(true)} disabled={db.status !== 'running'}
                  sx={{ color: db.status === 'running' ? (isDark ? uiPalette.white : uiPalette.textBody) : (isDark ? uiPalette.panelDisabledDark : uiPalette.borderStrong) }}>
                  <SyncIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Restart">
              <IconButton size="small" onClick={restart} sx={{ color: isDark ? uiPalette.white : uiPalette.textBody }}><RefreshIcon fontSize="small" /></IconButton>
            </Tooltip>
            <Tooltip title="Delete database">
              <IconButton size="small" onClick={() => setDeleteOpen(true)} sx={{ color: uiPalette.danger }}><DeleteOutlineIcon fontSize="small" /></IconButton>
            </Tooltip>
          </Box>
        </Box>
        {/* Quick stats */}
        <Box display="flex" gap={2} mt={1.5} flexWrap="wrap">
          {[
            [`${db.vcpus} vCPU`, ''], [`${fmtMem(db.memory_mb)} RAM`, ''],
            [`${db.storage_gb} GB SSD`, ''], [`$${db.hourly_cost_usd}/hr`, ''],
            [db.read_replicas > 0 ? `${db.read_replicas} replica${db.read_replicas > 1 ? 's' : ''}` : 'No replicas', ''],
          ].map(([v]) => (
            <Typography key={v} variant="caption" sx={{ color: isDark ? alpha(uiPalette.white, 0.55) : uiPalette.textSecondary, bgcolor: isDark ? uiPalette.panelMedDark : uiPalette.surfaceHover, px: 1, py: .25, borderRadius: '6px' }}>
              {v}
            </Typography>
          ))}
        </Box>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: `1px solid ${border}` }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{
          px: 1.5, minHeight: 40,
          '& .MuiTab-root': { textTransform: 'none', fontSize: '.82rem', minHeight: 40, color: isDark ? uiPalette.panelMutedDark : uiPalette.textSecondary },
          '& .Mui-selected': { color: isDark ? uiPalette.white : uiPalette.accent, fontWeight: 700 },
          '& .MuiTabs-indicator': { bgcolor: uiPalette.accent },
        }}>
          <Tab label="Overview" />
          <Tab label="Credentials" />
          <Tab label="Backups" />
          <Tab label="Metrics" />
        </Tabs>
      </Box>

      {/* Tab content */}
      <Box sx={{ p: 2.5, overflowY: 'auto', flex: 1 }}>
        {/* Overview */}
        {tab === 0 && (
          <>
            <SCard isDark={isDark}>
              <Typography fontWeight={700} fontSize=".9rem" color={isDark ? uiPalette.white : uiPalette.textStrong} mb={1.5}>Connection Details</Typography>
              <ConnRow label="Host"     value={db.host || '—'}                isDark={isDark} mono />
              <Divider sx={{ my: .5, borderColor: isDark ? uiPalette.panelMedDark : uiPalette.surfaceHover }} />
              <ConnRow label="Port"     value={String(db.port || db.default_port)} isDark={isDark} />
              <Divider sx={{ my: .5, borderColor: isDark ? uiPalette.panelMedDark : uiPalette.surfaceHover }} />
              <ConnRow label="Database" value={db.database_name}              isDark={isDark} />
              <Divider sx={{ my: .5, borderColor: isDark ? uiPalette.panelMedDark : uiPalette.surfaceHover }} />
              <ConnRow label="SSL"      value={db.ssl_enabled ? 'Enabled (TLS 1.3)' : 'Disabled'} isDark={isDark} />
              <Divider sx={{ my: .5, borderColor: isDark ? uiPalette.panelMedDark : uiPalette.surfaceHover }} />
              <ConnRow label="URI"      value={db.connection_uri || '—'}      isDark={isDark} mono />
            </SCard>
            <SCard isDark={isDark}>
              <Typography fontWeight={700} fontSize=".9rem" color={isDark ? uiPalette.white : uiPalette.textStrong} mb={1.5}>Configuration</Typography>
              {[
                ['Engine',        `${db.engine_display} v${db.version}`],
                ['Tenancy',       db.tenancy_model],
                ['Region',        db.region_display ?? db.region],
                ['vCPU / RAM',    `${db.vcpus} vCPU / ${fmtMem(db.memory_mb)}`],
                ['Storage',       `${db.storage_gb} GB (${db.current_storage_gb.toFixed(1)} GB used)`],
                ['Replicas',      String(db.read_replicas)],
                ['Public Access', db.publicly_accessible ? 'Yes' : 'No'],
                ['Backups',       db.backup_enabled ? `Enabled (${db.backup_retention_days} day retention)` : 'Disabled'],
                ['Created',       db.created_at ? new Date(db.created_at).toLocaleString() : '—'],
              ].map(([k, v]) => (
                <Box key={k} display="flex" justifyContent="space-between" py={.4} sx={{ borderBottom: `1px solid ${isDark ? uiPalette.panelLowDark : uiPalette.surfaceSubtle}` }}>
                  <Typography variant="caption" sx={{ color: isDark ? uiPalette.panelMutedDark : uiPalette.textMuted, minWidth: 130 }}>{k}</Typography>
                  <Typography variant="caption" fontWeight={600} color={isDark ? uiPalette.white : uiPalette.textStrong} textAlign="right">{v}</Typography>
                </Box>
              ))}
            </SCard>
            {/* Allowed IPs */}
            {db.allowed_ips !== undefined && (
              <SCard isDark={isDark}>
                <Typography fontWeight={700} fontSize=".9rem" color={isDark ? uiPalette.white : uiPalette.textStrong} mb={1}>Allowed IP Addresses</Typography>
                {(db.allowed_ips ?? []).length === 0 ? (
                  <Typography variant="caption" sx={{ color: isDark ? uiPalette.panelGhostStrongDark : uiPalette.textMuted }}>All IPs allowed (not restricted)</Typography>
                ) : (
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {(db.allowed_ips ?? []).map(ip => <Chip key={ip} label={ip} size="small" sx={{ bgcolor: isDark ? uiPalette.panelStrokeDark : uiPalette.surfaceHover, color: isDark ? uiPalette.white : uiPalette.textBody }} />)}
                  </Stack>
                )}
              </SCard>
            )}
          </>
        )}
        {tab === 1 && <CredentialsTab db={db} isDark={isDark} />}
        {tab === 2 && <BackupsTab db={db} isDark={isDark} />}
        {tab === 3 && <MetricsTab db={db} isDark={isDark} />}
      </Box>

      {/* Migrate modal */}
      <MigrateDatabaseModal open={migrateOpen} source={db} onClose={() => setMigrate(false)} />

      {/* Delete confirm */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { bgcolor: isDark ? uiPalette.darkPanel : uiPalette.white, borderRadius: '12px', border: `1px solid ${border}` } }}>
        <DialogTitle sx={{ color: isDark ? uiPalette.white : uiPalette.textStrong, fontWeight: 700 }}>Delete database?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: isDark ? alpha(uiPalette.white, 0.65) : uiPalette.textSecondary }}>
            <strong style={{ color: isDark ? uiPalette.white : uiPalette.textStrong }}>{db.name}</strong> and all its data will be permanently deleted. This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ pb: 2, px: 2.5, gap: 1 }}>
          <Button onClick={() => setDeleteOpen(false)} sx={{ textTransform: 'none', color: isDark ? alpha(uiPalette.white, 0.6) : uiPalette.textSecondary }}>Cancel</Button>
          <Button onClick={doDelete} variant="contained" color="error" disabled={deleting}
            startIcon={deleting ? <CircularProgress size={14} color="inherit" /> : undefined}
            sx={{ textTransform: 'none', borderRadius: '8px', fontWeight: 600 }}>
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ onCreate, isDark }: { onCreate: () => void; isDark: boolean }) {
  return (
    <Box sx={{ textAlign: 'center', py: 10, px: 3 }}>
      <Box sx={{ width: 64, height: 64, bgcolor: isDark ? uiPalette.panelMedDark : uiPalette.surfaceHover, borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
        <TerminalIcon sx={{ fontSize: '2rem', color: isDark ? uiPalette.panelGhostDark : uiPalette.borderStrong }} />
      </Box>
      <Typography fontWeight={700} fontSize="1.05rem" color={isDark ? uiPalette.white : uiPalette.textStrong} mb={.75}>No databases yet</Typography>
      <Typography variant="body2" sx={{ color: isDark ? uiPalette.panelMutedDark : uiPalette.textMuted, mb: 3, maxWidth: 340, mx: 'auto' }}>
        Deploy PostgreSQL, MySQL, MongoDB, Redis and more in seconds. Fully managed, auto-backed-up, and SSL-secured.
      </Typography>
      <Button variant="contained" startIcon={<AddIcon />} onClick={onCreate}
        sx={{ bgcolor: uiPalette.accent, '&:hover': { bgcolor: uiPalette.accentHover }, textTransform: 'none', borderRadius: '8px', fontWeight: 600 }}>
        Deploy First Database
      </Button>
    </Box>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
const DatabasePage: React.FC = () => {
  const theme  = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [databases, setDatabases] = useState<ManagedDatabase[]>([]);
  const [selected, setSelected]   = useState<ManagedDatabase | null>(null);
  const [loading, setLoading]     = useState(true);
  const [createOpen, setCreate]   = useState(false);
  const [toast, setToast]         = useState('');

  const border  = isDark ? uiPalette.panelStrokeDark : uiPalette.border;
  const sideBg  = isDark ? uiPalette.darkSidebar : uiPalette.surfaceSubtle;
  const mainBg  = isDark ? uiPalette.darkPage : uiPalette.white;

  const load = useCallback(() => {
    setLoading(true);
    databaseApi.list()
      .then(r => {
        // DRF may return a paginated object { results: [...] } or a plain array
        const list: ManagedDatabase[] = Array.isArray(r.data)
          ? r.data
          : (r.data as any).results ?? [];
        setDatabases(list);
        setSelected(s => s ? list.find(d => d.id === s.id) ?? null : null);
      })
      .catch(() => setDatabases([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreated = (db: ManagedDatabase, password: string) => {
    setCreate(false);
    load();
    setToast(`Database "${db.name}" created! Admin password: ${password}`);
    // Fetch full detail after creation
    databaseApi.get(db.id).then(r => setSelected(r.data)).catch(() => setSelected(db));
  };

  const handleSelect = (db: ManagedDatabase) => {
    databaseApi.get(db.id).then(r => setSelected(r.data)).catch(() => setSelected(db));
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: mainBg }}>
      {/* Page header */}
      <Box sx={{ bgcolor: isDark ? uiPalette.darkSidebar : uiPalette.white, borderBottom: `1px solid ${border}`, px: 4, py: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography fontWeight={800} fontSize="1.25rem" color={isDark ? uiPalette.white : uiPalette.textStrong}>Managed Databases</Typography>
          <Typography variant="body2" sx={{ color: isDark ? uiPalette.panelMutedDark : uiPalette.textSecondary, mt: .25 }}>
            PostgreSQL · MySQL · MariaDB · MongoDB · Redis · ClickHouse · Cassandra
          </Typography>
        </Box>
        <Box display="flex" gap={1} alignItems="center">
          <Button startIcon={<RefreshIcon />} onClick={load} disabled={loading}
            sx={{ textTransform: 'none', color: isDark ? uiPalette.white : uiPalette.textBody, borderColor: border, '&:hover': { bgcolor: isDark ? uiPalette.panelMedDark : uiPalette.neutralFaintLight } }}
            variant="outlined" size="small">
            Refresh
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreate(true)}
            sx={{ bgcolor: uiPalette.accent, '&:hover': { bgcolor: uiPalette.accentHover }, textTransform: 'none', borderRadius: '8px', fontWeight: 600 }}>
            Deploy Database
          </Button>
        </Box>
      </Box>

      {/* Body */}
      <Box sx={{ display: 'flex', height: 'calc(100vh - 88px)' }}>
        {/* Left: DB list */}
        <Box sx={{ width: { xs: '100%', md: 320 }, flexShrink: 0, borderRight: `1px solid ${border}`, bgcolor: sideBg, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {/* Stats bar */}
          <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${border}`, display: 'flex', gap: 2 }}>
            {[
              { label: 'Total', value: databases.length },
              { label: 'Running', value: databases.filter(d => d.status === 'running').length, color: uiPalette.success },
              { label: 'Error', value: databases.filter(d => d.status === 'error').length, color: uiPalette.danger },
            ].map(s => (
              <Box key={s.label} textAlign="center">
                <Typography fontWeight={800} fontSize="1.1rem" color={s.color ?? (isDark ? uiPalette.white : uiPalette.textStrong)}>{s.value}</Typography>
                <Typography variant="caption" sx={{ color: isDark ? uiPalette.panelGhostStrongDark : uiPalette.textMuted }}>{s.label}</Typography>
              </Box>
            ))}
          </Box>
          {loading ? (
            <Box p={2}>{[1,2,3].map(k => <Skeleton key={k} height={70} sx={{ mb: 1, bgcolor: isDark ? uiPalette.panelMedDark : uiPalette.neutralSoftLight, borderRadius: 2 }} />)}</Box>
          ) : databases.length === 0 ? (
            <EmptyState onCreate={() => setCreate(true)} isDark={isDark} />
          ) : (
            databases.map(db => (
              <DBCard key={db.id} db={db} selected={selected?.id === db.id} onClick={() => handleSelect(db)} isDark={isDark} />
            ))
          )}
        </Box>

        {/* Right: Detail */}
        <Box sx={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', bgcolor: isDark ? uiPalette.darkPage : uiPalette.white }}>
          {selected ? (
            <DatabaseDetail
              db={selected}
              isDark={isDark}
              onDelete={() => { setSelected(null); load(); }}
              onRefresh={() => { databaseApi.get(selected.id).then(r => setSelected(r.data)).catch(() => {}); }}
            />
          ) : (
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Box textAlign="center">
                <TerminalIcon sx={{ fontSize: '3rem', color: isDark ? alpha(uiPalette.white, 0.12) : uiPalette.border, mb: 1.5 }} />
                <Typography fontWeight={600} color={isDark ? uiPalette.panelGhostDark : uiPalette.textMuted} fontSize=".9rem">
                  {databases.length > 0 ? 'Select a database to view details' : 'Deploy your first database'}
                </Typography>
              </Box>
            </Box>
          )}
        </Box>
      </Box>

      {/* Create modal */}
      <CreateDatabaseModal open={createOpen} onClose={() => setCreate(false)} onSuccess={handleCreated} />

      {/* Toast */}
      <Snackbar open={!!toast} autoHideDuration={30000} onClose={() => setToast('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity="success" onClose={() => setToast('')} sx={{ maxWidth: 500, wordBreak: 'break-all' }}>{toast}</Alert>
      </Snackbar>
    </Box>
  );
};

export default DatabasePage;
