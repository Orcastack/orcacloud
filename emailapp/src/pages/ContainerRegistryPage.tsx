// OrcaCloud – Container Registry Page

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Stack, Button, Chip,
  IconButton, Tooltip, Dialog, DialogTitle, DialogContent,
  DialogActions, Skeleton, Alert, Snackbar, Tabs, Tab,
  Table, TableBody, TableCell, TableHead, TableRow,
  CircularProgress, Paper, TextField, Select,
  MenuItem, InputLabel, FormControl,
} from '@mui/material';
import { alpha, darken, useTheme } from '@mui/material/styles';
import AddIcon            from '@mui/icons-material/Add';
import RefreshIcon        from '@mui/icons-material/Refresh';
import DeleteOutlineIcon  from '@mui/icons-material/DeleteOutline';
import ContentCopyIcon    from '@mui/icons-material/ContentCopy';
import LockIcon           from '@mui/icons-material/Lock';
import PublicIcon         from '@mui/icons-material/Public';
import VisibilityIcon     from '@mui/icons-material/Visibility';
import VisibilityOffIcon  from '@mui/icons-material/VisibilityOff';
import SecurityIcon       from '@mui/icons-material/Security';
import SyncIcon           from '@mui/icons-material/Sync';
import TerminalIcon       from '@mui/icons-material/Terminal';
import LayersIcon         from '@mui/icons-material/Layers';
import TokenIcon          from '@mui/icons-material/VpnKey';
import { DeployDropdown } from '../components/deploy/DeployDropdown';
import BugReportIcon      from '@mui/icons-material/BugReport';

import { registryApi }              from '../services/cloudApi';
import {
  ContainerRepository, ContainerImage, RegistryToken,
  ReplicationRule, TokenScope, ReplicationMode, RegistryRegion,
} from '../types/registry';
import CreateRepositoryModal from '../components/Cloud/CreateRepositoryModal';
import {
  dashboardTokens,
  dashboardSemanticColors,
  dashboardStatusColors,
  computeUiTokens,
} from '../styles/dashboardDesignSystem';

const REGISTRY_PALETTE = {
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
  darkPanel: computeUiTokens.darkPanel,
  darkPage: alpha(computeUiTokens.darkPanel, 0.82),
  darkHeader: alpha(computeUiTokens.darkPanel, 0.9),
  darkSidebar: alpha(computeUiTokens.darkPanel, 0.88),
  panelStrokeDark: alpha(dashboardTokens.colors.white, 0.08),
  panelMutedDark: alpha(dashboardTokens.colors.white, 0.5),
  panelMutedAltDark: alpha(dashboardTokens.colors.white, 0.45),
  panelLowDark: alpha(dashboardTokens.colors.white, 0.04),
  panelMedDark: alpha(dashboardTokens.colors.white, 0.06),
  panelFaintDark: alpha(dashboardTokens.colors.white, 0.03),
  panelGhostDark: alpha(dashboardTokens.colors.white, 0.15),
  panelGhostDarkAlt: alpha(dashboardTokens.colors.white, 0.25),
  successSoft: alpha(computeUiTokens.successStrong, 0.1),
  mutedSoft: alpha(computeUiTokens.neutralMuted, 0.1),
  accentSoft: alpha(computeUiTokens.accentStrong, 0.12),
  infoSoft: alpha(dashboardSemanticColors.info, 0.08),
  codeTextSuccess: darken(computeUiTokens.successStrong, 0.08),
};

// ── Status styles ─────────────────────────────────────────────────────────────
const SCAN_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  clean:      { bg: REGISTRY_PALETTE.successSoft, text: REGISTRY_PALETTE.success, label: 'Clean' },
  pending:    { bg: REGISTRY_PALETTE.mutedSoft, text: REGISTRY_PALETTE.textSecondary, label: 'Pending' },
  scanning:   { bg: alpha(REGISTRY_PALETTE.purple, 0.1), text: REGISTRY_PALETTE.purple, label: 'Scanning' },
  vulnerable: { bg: alpha(REGISTRY_PALETTE.danger, 0.1), text: REGISTRY_PALETTE.danger, label: 'Vulnerable' },
  error:      { bg: alpha(REGISTRY_PALETTE.danger, 0.1), text: REGISTRY_PALETTE.danger, label: 'Error' },
};

const REGIONS: { key: RegistryRegion; label: string }[] = [
  { key: 'af-south-1', label: 'Africa — Johannesburg' },
  { key: 'eu-west-1',  label: 'Europe — Frankfurt' },
  { key: 'ap-south-1', label: 'Asia — Singapore' },
  { key: 'us-east-1',  label: 'US East — New York' },
  { key: 'us-west-1',  label: 'US West — Los Angeles' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtSize(mb: number) {
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  return `${mb.toFixed(1)} MB`;
}

function CopyBtn({ value, isDark }: { value: string; isDark: boolean }) {
  const [done, setDone] = useState(false);
  return (
    <Tooltip title={done ? 'Copied!' : 'Copy'}>
      <IconButton size="small"
        onClick={() => { navigator.clipboard.writeText(value); setDone(true); setTimeout(() => setDone(false), 1500); }}
        sx={{ color: isDark ? alpha(REGISTRY_PALETTE.white, 0.4) : REGISTRY_PALETTE.textMuted }}>
        <ContentCopyIcon sx={{ fontSize: '.82rem' }} />
      </IconButton>
    </Tooltip>
  );
}

function SCard({ children, isDark }: { children: React.ReactNode; isDark: boolean }) {
  return (
    <Paper elevation={0} sx={{
      bgcolor: isDark ? REGISTRY_PALETTE.darkPanel : REGISTRY_PALETTE.surface,
      border: `1px solid ${isDark ? REGISTRY_PALETTE.panelStrokeDark : REGISTRY_PALETTE.border}`,
      borderRadius: '12px', p: 2.5, mb: 2,
    }}>
      {children}
    </Paper>
  );
}

// ── Repo list card ────────────────────────────────────────────────────────────
function RepoCard({ repo, selected, onClick, isDark }: {
  repo: ContainerRepository; selected: boolean; onClick: () => void; isDark: boolean;
}) {
  const border = isDark ? REGISTRY_PALETTE.panelStrokeDark : REGISTRY_PALETTE.border;
  const isPrivate = repo.visibility === 'private';
  return (
    <Box onClick={onClick} sx={{
      px: 2, py: 1.75, cursor: 'pointer', transition: 'background .12s',
      bgcolor: selected ? (isDark ? 'rgba(24,54,106,.3)' : 'rgba(24,54,106,.05)') : 'transparent',
      borderLeft: `3px solid ${selected ? REGISTRY_PALETTE.accent : 'transparent'}`,
      borderBottom: `1px solid ${border}`,
      '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,.04)' : 'rgba(24,54,106,.03)' },
    }}>
      <Box display="flex" alignItems="center" gap={1.25}>
        <Box sx={{ width: 34, height: 34, borderRadius: '8px', bgcolor: isDark ? REGISTRY_PALETTE.panelStrokeDark : REGISTRY_PALETTE.infoSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <LayersIcon sx={{ fontSize: '1.1rem', color: REGISTRY_PALETTE.accent }} />
        </Box>
        <Box flex={1} minWidth={0}>
          <Box display="flex" alignItems="center" gap={.75}>
            <Typography fontWeight={700} fontSize=".88rem" color={isDark ? REGISTRY_PALETTE.white : REGISTRY_PALETTE.textStrong} noWrap>{repo.name}</Typography>
            <Chip size="small" icon={isPrivate ? <LockIcon sx={{ fontSize: '.65rem !important' }} /> : <PublicIcon sx={{ fontSize: '.65rem !important' }} />}
              label={repo.visibility} sx={{ height: 16, fontSize: '.6rem', fontWeight: 700,
                bgcolor: isPrivate ? 'rgba(24,54,106,.12)' : 'rgba(16,185,129,.1)',
                color: isPrivate ? REGISTRY_PALETTE.accent : REGISTRY_PALETTE.success }} />
          </Box>
          <Typography variant="caption" sx={{ color: isDark ? REGISTRY_PALETTE.panelMutedAltDark : REGISTRY_PALETTE.textMuted }}>
            {repo.image_count} image{repo.image_count !== 1 ? 's' : ''} &nbsp;·&nbsp; {fmtSize(repo.storage_mb)}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

// ── Images tab ────────────────────────────────────────────────────────────────
function ImagesTab({ repo, isDark }: { repo: ContainerRepository; isDark: boolean }) {
  const [images,   setImages]   = useState<ContainerImage[]>(repo.images ?? []);
  const [scanning, setScanning] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const border  = isDark ? REGISTRY_PALETTE.panelStrokeDark : REGISTRY_PALETTE.border;
  const textSec = isDark ? REGISTRY_PALETTE.panelMutedDark : REGISTRY_PALETTE.textMuted;

  const scan = async (tag: string) => {
    setScanning(tag);
    try {
      const r = await registryApi.scan(repo.id, tag);
      setImages(imgs => imgs.map(i => i.tag === tag
        ? { ...i, scan_status: r.data.scan_status, vulnerability_count: r.data.vulnerabilities }
        : i
      ));
    } finally { setScanning(null); }
  };

  const del = async (tag: string) => {
    setDeleting(tag);
    try {
      await registryApi.deleteTag(repo.id, tag);
      setImages(imgs => imgs.filter(i => i.tag !== tag));
    } finally { setDeleting(null); }
  };

  const totalVuln = (img: ContainerImage) =>
    Object.values(img.vulnerability_count).reduce((a, b) => a + b, 0);

  return (
    <Box>
      {images.length === 0 ? (
        <Box textAlign="center" py={5}>
          <LayersIcon sx={{ fontSize: '2.5rem', color: isDark ? REGISTRY_PALETTE.panelGhostDark : REGISTRY_PALETTE.border, mb: 1 }} />
          <Typography variant="body2" sx={{ color: textSec }}>No images pushed yet</Typography>
          <Typography variant="caption" sx={{ color: textSec, display: 'block', mt: .5 }}>
            Use <code>docker push {repo.full_name}:&lt;tag&gt;</code> to push your first image
          </Typography>
        </Box>
      ) : (
        <Box sx={{ border: `1px solid ${border}`, borderRadius: '10px', overflow: 'hidden' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: isDark ? REGISTRY_PALETTE.panelLowDark : REGISTRY_PALETTE.surfaceSubtle }}>
                {['Tag', 'Digest', 'Size', 'Arch', 'Scan', 'Pushed', 'Actions'].map(h => (
                  <TableCell key={h} sx={{ fontSize: '.75rem', fontWeight: 700, color: textSec, borderColor: border, py: 1.25 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {images.map(img => {
                const st = SCAN_STYLE[img.scan_status] ?? SCAN_STYLE.pending;
                const tv = totalVuln(img);
                return (
                  <TableRow key={img.id} sx={{ '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,.03)' : 'rgba(0,0,0,.015)' } }}>
                    <TableCell sx={{ borderColor: border, py: 1 }}>
                      <Box display="flex" alignItems="center" gap={.75}>
                        <Chip size="small" label={img.tag} sx={{ height: 18, fontSize: '.72rem', fontWeight: 700, bgcolor: isDark ? REGISTRY_PALETTE.panelStrokeDark : REGISTRY_PALETTE.infoSoft, color: isDark ? REGISTRY_PALETTE.white : REGISTRY_PALETTE.accent }} />
                        {img.tag === 'latest' && <Chip size="small" label="latest" sx={{ height: 14, fontSize: '.6rem', bgcolor: REGISTRY_PALETTE.accentSoft, color: REGISTRY_PALETTE.accent }} />}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ borderColor: border, py: 1 }}>
                      <Box display="flex" alignItems="center" gap={.5}>
                        <Typography sx={{ fontFamily: 'monospace', fontSize: '.72rem', color: textSec, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {img.digest.slice(0, 19)}…
                        </Typography>
                        <CopyBtn value={img.digest} isDark={isDark} />
                      </Box>
                    </TableCell>
                    <TableCell sx={{ borderColor: border, py: 1, color: isDark ? REGISTRY_PALETTE.white : REGISTRY_PALETTE.textStrong, fontSize: '.82rem' }}>{fmtSize(img.size_mb)}</TableCell>
                    <TableCell sx={{ borderColor: border, py: 1, color: textSec, fontSize: '.78rem' }}>{img.architecture}</TableCell>
                    <TableCell sx={{ borderColor: border, py: 1 }}>
                      <Box display="flex" alignItems="center" gap={.75}>
                        <Chip size="small" label={st.label} sx={{ height: 16, fontSize: '.62rem', fontWeight: 700, bgcolor: st.bg, color: st.text }} />
                        {img.scan_status === 'vulnerable' && tv > 0 && (
                          <Tooltip title={`Critical:${img.vulnerability_count.critical} High:${img.vulnerability_count.high} Med:${img.vulnerability_count.medium} Low:${img.vulnerability_count.low}`}>
                            <BugReportIcon sx={{ fontSize: '.9rem', color: REGISTRY_PALETTE.danger }} />
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ borderColor: border, py: 1, color: textSec, fontSize: '.75rem' }}>
                      {new Date(img.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell sx={{ borderColor: border, py: 1 }}>
                      <Box display="flex" gap={.25}>
                        <Tooltip title="Scan for vulnerabilities">
                          <span>
                            <IconButton size="small" onClick={() => scan(img.tag)} disabled={scanning === img.tag}
                              sx={{ color: isDark ? REGISTRY_PALETTE.panelMutedDark : REGISTRY_PALETTE.textSecondary }}>
                              {scanning === img.tag ? <CircularProgress size={12} /> : <SecurityIcon sx={{ fontSize: '.9rem' }} />}
                            </IconButton>
                          </span>
                        </Tooltip>
                        <CopyBtn value={img.pull_command} isDark={isDark} />
                        <Tooltip title="Delete tag">
                          <span>
                            <IconButton size="small" onClick={() => del(img.tag)} disabled={deleting === img.tag}
                              sx={{ color: REGISTRY_PALETTE.danger }}>
                              {deleting === img.tag ? <CircularProgress size={12} /> : <DeleteOutlineIcon sx={{ fontSize: '.9rem' }} />}
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>
      )}
    </Box>
  );
}

// ── Tokens tab ────────────────────────────────────────────────────────────────
function TokensTab({ repo, isDark }: { repo: ContainerRepository; isDark: boolean }) {
  const [tokens,   setTokens]   = useState<RegistryToken[]>(repo.tokens ?? []);
  const [loading,  setLoading]  = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName,  setNewName]  = useState('');
  const [scope,    setScope]    = useState<TokenScope>('pull');
  const [days,     setDays]     = useState<number | ''>('');
  const [newToken, setNewToken] = useState('');
  const [shown,    setShown]    = useState<Record<string, boolean>>({});
  const border  = isDark ? REGISTRY_PALETTE.panelStrokeDark : REGISTRY_PALETTE.border;
  const textSec = isDark ? REGISTRY_PALETTE.panelMutedDark : REGISTRY_PALETTE.textMuted;

  const refresh = () => {
    setLoading(true);
    registryApi.tokens(repo.id).then(r => { setTokens(r.data); setLoading(false); }).catch(() => setLoading(false));
  };

  const create = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const r = await registryApi.createToken(repo.id, {
        name: newName, scope,
        ...(days !== '' ? { expires_days: Number(days) } : {}),
      });
      setNewToken((r.data as any).token_masked);
      setTokens(t => [r.data, ...t]);
      setNewName(''); setDays('');
    } finally { setCreating(false); }
  };

  const revoke = async (tokenId: string) => {
    await registryApi.revokeToken(repo.id, tokenId);
    setTokens(t => t.filter(x => x.id !== tokenId));
  };

  const SCOPE_COLOR: Record<string, string> = {
    pull: REGISTRY_PALETTE.success,
    push: REGISTRY_PALETTE.purple,
    admin: REGISTRY_PALETTE.danger,
  };

  return (
    <Box>
      {newToken && (
        <Alert severity="success" onClose={() => setNewToken('')} sx={{ mb: 2 }}>
          <strong>Token created — copy it now, it won't be shown again:</strong>
          <Box sx={{ fontFamily: 'monospace', fontSize: '.8rem', mt: .75, wordBreak: 'break-all' }}>{newToken}</Box>
        </Alert>
      )}

      {/* Create form */}
      <SCard isDark={isDark}>
        <Typography fontWeight={700} fontSize=".9rem" color={isDark ? REGISTRY_PALETTE.white : REGISTRY_PALETTE.textStrong} mb={1.5}>Create Access Token</Typography>
        <Box display="flex" gap={1.5} flexWrap="wrap" alignItems="flex-start">
          <TextField size="small" label="Token name" value={newName} onChange={e => setNewName(e.target.value)}
            sx={{ flex: '1 1 180px', '& .MuiOutlinedInput-root': { bgcolor: isDark ? REGISTRY_PALETTE.panelLowDark : REGISTRY_PALETTE.surfaceSubtle, '& fieldset': { borderColor: border } }, '& .MuiInputLabel-root': { color: textSec }, '& .MuiInputBase-input': { color: isDark ? REGISTRY_PALETTE.white : REGISTRY_PALETTE.textStrong } }} />
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel sx={{ color: textSec }}>Scope</InputLabel>
            <Select value={scope} label="Scope" onChange={e => setScope(e.target.value as TokenScope)}
              sx={{ bgcolor: isDark ? REGISTRY_PALETTE.panelLowDark : REGISTRY_PALETTE.surfaceSubtle, color: isDark ? REGISTRY_PALETTE.white : REGISTRY_PALETTE.textStrong, '& .MuiOutlinedInput-notchedOutline': { borderColor: border } }}>
              <MenuItem value="pull">Pull</MenuItem>
              <MenuItem value="push">Push</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
            </Select>
          </FormControl>
          <TextField size="small" label="Expires (days)" type="number" value={days} onChange={e => setDays(e.target.value === '' ? '' : Number(e.target.value))}
            inputProps={{ min: 1, max: 365 }} placeholder="Never"
            sx={{ width: 130, '& .MuiOutlinedInput-root': { bgcolor: isDark ? REGISTRY_PALETTE.panelLowDark : REGISTRY_PALETTE.surfaceSubtle, '& fieldset': { borderColor: border } }, '& .MuiInputLabel-root': { color: textSec }, '& .MuiInputBase-input': { color: isDark ? REGISTRY_PALETTE.white : REGISTRY_PALETTE.textStrong } }} />
          <Button variant="contained" disabled={!newName.trim() || creating}
            startIcon={creating ? <CircularProgress size={12} color="inherit" /> : <AddIcon />}
            onClick={create}
            sx={{ bgcolor: REGISTRY_PALETTE.accent, '&:hover': { bgcolor: REGISTRY_PALETTE.accentHover }, textTransform: 'none', borderRadius: '8px', fontWeight: 600, height: 40 }}>
            Create Token
          </Button>
        </Box>
      </SCard>

      {/* Token list */}
      <Box display="flex" justifyContent="flex-end" mb={1.5}>
        <Button size="small" startIcon={<RefreshIcon />} onClick={refresh} disabled={loading}
          sx={{ textTransform: 'none', color: isDark ? REGISTRY_PALETTE.white : REGISTRY_PALETTE.textBody }}>Refresh</Button>
      </Box>
      {loading ? [1,2].map(k => <Skeleton key={k} height={72} sx={{ mb: 1, bgcolor: isDark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.04)', borderRadius: 2 }} />) : (
        <Stack spacing={1.25}>
          {tokens.map(t => (
            <Box key={t.id} sx={{ p: 1.75, bgcolor: isDark ? REGISTRY_PALETTE.panelLowDark : REGISTRY_PALETTE.surfaceSubtle, borderRadius: '10px', border: `1px solid ${border}` }}>
              <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
                <Box display="flex" alignItems="center" gap={1}>
                  <TokenIcon sx={{ fontSize: '1rem', color: SCOPE_COLOR[t.scope] }} />
                  <Typography fontWeight={700} fontSize=".88rem" color={isDark ? REGISTRY_PALETTE.white : REGISTRY_PALETTE.textStrong}>{t.name}</Typography>
                  <Chip size="small" label={t.scope} sx={{ height: 16, fontSize: '.62rem', fontWeight: 700, bgcolor: `${SCOPE_COLOR[t.scope]}18`, color: SCOPE_COLOR[t.scope] }} />
                </Box>
                <Tooltip title="Revoke token">
                  <IconButton size="small" onClick={() => revoke(t.id)} sx={{ color: REGISTRY_PALETTE.danger }}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
              <Box display="flex" alignItems="center" gap={.75} mt={.75}>
                <Typography sx={{ fontFamily: 'monospace', fontSize: '.78rem', color: textSec, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {shown[t.id] ? t.token_masked : t.token_masked.slice(0, 12) + '••••••••••••••'}
                </Typography>
                <IconButton size="small" onClick={() => setShown(s => ({ ...s, [t.id]: !s[t.id] }))} sx={{ color: textSec }}>
                  {shown[t.id] ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                </IconButton>
                <CopyBtn value={t.token_masked} isDark={isDark} />
              </Box>
              <Typography variant="caption" sx={{ color: isDark ? alpha(REGISTRY_PALETTE.white, 0.3) : REGISTRY_PALETTE.textMuted, mt: .5, display: 'block' }}>
                Expires: {t.expires_at ? new Date(t.expires_at).toLocaleDateString() : 'Never'}&nbsp;·&nbsp;
                Created: {new Date(t.created_at).toLocaleDateString()}
                {t.last_used_at && <>&nbsp;·&nbsp; Last used: {new Date(t.last_used_at).toLocaleDateString()}</>}
              </Typography>
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );
}

// ── Replication tab ───────────────────────────────────────────────────────────
function ReplicationTab({ repo, isDark }: { repo: ContainerRepository; isDark: boolean }) {
  const [rules,   setRules]   = useState<ReplicationRule[]>(repo.replication_rules ?? []);
  const [loading, setLoading] = useState(false);
  const [target,  setTarget]  = useState<RegistryRegion>('eu-west-1');
  const [mode,    setMode]    = useState<ReplicationMode>('async');
  const [result,  setResult]  = useState('');
  const border = isDark ? REGISTRY_PALETTE.panelStrokeDark : REGISTRY_PALETTE.border;
  const textSec = isDark ? REGISTRY_PALETTE.panelMutedDark : REGISTRY_PALETTE.textMuted;

  const trigger = async () => {
    setLoading(true);
    try {
      const r = await registryApi.replicate(repo.id, { target_region: target, mode });
      setRules(prev => {
        const found = prev.find(x => x.target_region === target);
        return found ? prev.map(x => x.target_region === target ? r.data.rule : x) : [r.data.rule, ...prev];
      });
      setResult(r.data.message);
    } finally { setLoading(false); }
  };

  const modeColor: Record<string, string> = {
    sync: REGISTRY_PALETTE.success,
    async: REGISTRY_PALETTE.purple,
    on_demand: REGISTRY_PALETTE.warning,
  };

  return (
    <Box>
      <SCard isDark={isDark}>
        <Typography fontWeight={700} fontSize=".9rem" color={isDark ? REGISTRY_PALETTE.white : REGISTRY_PALETTE.textStrong} mb={.5}>Replicate to Region</Typography>
        <Typography variant="caption" sx={{ color: textSec, display: 'block', mb: 1.5 }}>
          Source: <strong style={{ color: isDark ? REGISTRY_PALETTE.white : REGISTRY_PALETTE.textStrong }}>{repo.region_display}</strong>
        </Typography>
        {result && <Alert severity="success" onClose={() => setResult('')} sx={{ mb: 1.5, fontSize: '.82rem' }}>{result}</Alert>}
        <Box display="flex" gap={1.5} flexWrap="wrap" alignItems="flex-start">
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel sx={{ color: textSec }}>Target Region</InputLabel>
            <Select value={target} label="Target Region" onChange={e => setTarget(e.target.value as RegistryRegion)}
              sx={{ bgcolor: isDark ? REGISTRY_PALETTE.panelLowDark : REGISTRY_PALETTE.surfaceSubtle, color: isDark ? REGISTRY_PALETTE.white : REGISTRY_PALETTE.textStrong, '& .MuiOutlinedInput-notchedOutline': { borderColor: border } }}>
              {REGIONS.filter(r => r.key !== repo.region).map(r => (
                <MenuItem key={r.key} value={r.key}>{r.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel sx={{ color: textSec }}>Mode</InputLabel>
            <Select value={mode} label="Mode" onChange={e => setMode(e.target.value as ReplicationMode)}
              sx={{ bgcolor: isDark ? REGISTRY_PALETTE.panelLowDark : REGISTRY_PALETTE.surfaceSubtle, color: isDark ? REGISTRY_PALETTE.white : REGISTRY_PALETTE.textStrong, '& .MuiOutlinedInput-notchedOutline': { borderColor: border } }}>
              <MenuItem value="async">Async</MenuItem>
              <MenuItem value="sync">Sync</MenuItem>
              <MenuItem value="on_demand">On-Demand</MenuItem>
            </Select>
          </FormControl>
          <Button variant="contained" startIcon={loading ? <CircularProgress size={12} color="inherit" /> : <SyncIcon />}
            onClick={trigger} disabled={loading}
            sx={{ bgcolor: REGISTRY_PALETTE.accent, '&:hover': { bgcolor: REGISTRY_PALETTE.accentHover }, textTransform: 'none', borderRadius: '8px', fontWeight: 600, height: 40 }}>
            {loading ? 'Replicating…' : 'Replicate'}
          </Button>
        </Box>
      </SCard>

      {rules.length > 0 && (
        <Box sx={{ border: `1px solid ${border}`, borderRadius: '10px', overflow: 'hidden' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: isDark ? REGISTRY_PALETTE.panelLowDark : REGISTRY_PALETTE.surfaceSubtle }}>
                {['Source', 'Target', 'Mode', 'Status', 'Last Run'].map(h => (
                  <TableCell key={h} sx={{ fontSize: '.75rem', fontWeight: 700, color: textSec, borderColor: border, py: 1.25 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rules.map(r => (
                <TableRow key={r.id}>
                  <TableCell sx={{ fontSize: '.82rem', color: isDark ? REGISTRY_PALETTE.white : REGISTRY_PALETTE.textStrong, borderColor: border }}>{r.source_region_display}</TableCell>
                  <TableCell sx={{ fontSize: '.82rem', color: isDark ? REGISTRY_PALETTE.white : REGISTRY_PALETTE.textStrong, borderColor: border }}>{r.target_region_display}</TableCell>
                  <TableCell sx={{ borderColor: border }}>
                    <Chip size="small" label={r.mode} sx={{ height: 16, fontSize: '.62rem', fontWeight: 700, bgcolor: `${modeColor[r.mode]}18`, color: modeColor[r.mode] }} />
                  </TableCell>
                  <TableCell sx={{ borderColor: border }}>
                    <Chip size="small" label={r.is_active ? 'Active' : 'Inactive'} sx={{ height: 16, fontSize: '.62rem', fontWeight: 700, bgcolor: r.is_active ? REGISTRY_PALETTE.successSoft : REGISTRY_PALETTE.mutedSoft, color: r.is_active ? REGISTRY_PALETTE.success : REGISTRY_PALETTE.textSecondary }} />
                  </TableCell>
                  <TableCell sx={{ fontSize: '.78rem', color: textSec, borderColor: border }}>
                    {r.last_triggered ? new Date(r.last_triggered).toLocaleString() : '—'}
                  </TableCell>
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
function RepositoryDetail({ repo, onDelete, onRefresh, isDark }: {
  repo: ContainerRepository; onDelete: () => void; onRefresh: () => void; isDark: boolean;
}) {
  const [tab,        setTab]        = useState(0);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting,   setDeleting]   = useState(false);
  const border = isDark ? REGISTRY_PALETTE.panelStrokeDark : REGISTRY_PALETTE.border;
  const textSec = isDark ? REGISTRY_PALETTE.panelMutedDark : REGISTRY_PALETTE.textMuted;

  const doDelete = async () => {
    setDeleting(true);
    await registryApi.delete(repo.id).catch(() => {});
    setDeleting(false);
    setDeleteOpen(false);
    onDelete();
  };

  const codeBlock = (text: string) => (
    <Box sx={{ p: 1.5, bgcolor: isDark ? REGISTRY_PALETTE.textStrong : REGISTRY_PALETTE.surfaceHover, borderRadius: '8px', mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
      <Typography component="pre" sx={{ fontFamily: 'monospace', fontSize: '.8rem', color: isDark ? REGISTRY_PALETTE.success : REGISTRY_PALETTE.codeTextSuccess, whiteSpace: 'pre-wrap', wordBreak: 'break-all', m: 0, lineHeight: 1.6 }}>
        {text}
      </Typography>
      <CopyBtn value={text} isDark={isDark} />
    </Box>
  );

  return (
    <>
      {/* Header */}
      <Box sx={{ p: 2.5, borderBottom: `1px solid ${border}` }}>
        <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={2} flexWrap="wrap">
          <Box display="flex" alignItems="center" gap={1.5}>
            <Box sx={{ width: 42, height: 42, borderRadius: '10px', bgcolor: isDark ? REGISTRY_PALETTE.panelStrokeDark : REGISTRY_PALETTE.infoSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <LayersIcon sx={{ fontSize: '1.4rem', color: REGISTRY_PALETTE.accent }} />
            </Box>
            <Box>
              <Typography fontWeight={800} fontSize="1.05rem" color={isDark ? REGISTRY_PALETTE.white : REGISTRY_PALETTE.textStrong}>{repo.name}</Typography>
              <Typography variant="caption" sx={{ color: textSec }}>
                {repo.full_name}
              </Typography>
            </Box>
          </Box>
          <Box display="flex" gap={.75} flexWrap="wrap">
            <Chip size="small" icon={repo.visibility === 'private' ? <LockIcon sx={{ fontSize: '.65rem !important' }} /> : <PublicIcon sx={{ fontSize: '.65rem !important' }} />}
              label={repo.visibility} sx={{ fontWeight: 700, fontSize: '.72rem', bgcolor: repo.visibility === 'private' ? REGISTRY_PALETTE.accentSoft : REGISTRY_PALETTE.successSoft, color: repo.visibility === 'private' ? REGISTRY_PALETTE.accent : REGISTRY_PALETTE.success }} />
            <Tooltip title="Refresh">
              <IconButton size="small" onClick={onRefresh} sx={{ color: isDark ? REGISTRY_PALETTE.white : REGISTRY_PALETTE.textBody }}><RefreshIcon fontSize="small" /></IconButton>
            </Tooltip>
            <Tooltip title="Delete repository">
              <IconButton size="small" onClick={() => setDeleteOpen(true)} sx={{ color: REGISTRY_PALETTE.danger }}><DeleteOutlineIcon fontSize="small" /></IconButton>
            </Tooltip>
          </Box>
        </Box>
        {/* Stats row */}
        <Box display="flex" gap={2} mt={1.5} flexWrap="wrap">
          {[
            `${repo.image_count} images`,
            fmtSize(repo.storage_mb),
            `${repo.pull_count.toLocaleString()} pulls`,
            `${repo.push_count} pushes`,
            repo.region_display,
          ].map(s => (
            <Typography key={s} variant="caption" sx={{ color: textSec, bgcolor: isDark ? REGISTRY_PALETTE.panelMedDark : REGISTRY_PALETTE.surfaceHover, px: 1, py: .25, borderRadius: '6px' }}>
              {s}
            </Typography>
          ))}
        </Box>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: `1px solid ${border}` }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{
          px: 1.5, minHeight: 40,
          '& .MuiTab-root': { textTransform: 'none', fontSize: '.82rem', minHeight: 40, color: textSec },
          '& .Mui-selected': { color: isDark ? REGISTRY_PALETTE.white : REGISTRY_PALETTE.accent, fontWeight: 700 },
          '& .MuiTabs-indicator': { bgcolor: REGISTRY_PALETTE.accent },
        }}>
          <Tab label="Overview" />
          <Tab label={`Images (${repo.image_count})`} />
          <Tab label="Access Tokens" />
          <Tab label="Replication" />
        </Tabs>
      </Box>

      <Box sx={{ p: 2.5, overflowY: 'auto', flex: 1 }}>
        {/* Overview */}
        {tab === 0 && (
          <>
            <SCard isDark={isDark}>
              <Typography fontWeight={700} fontSize=".9rem" color={isDark ? REGISTRY_PALETTE.white : REGISTRY_PALETTE.textStrong} mb={1.5}>
                <TerminalIcon sx={{ fontSize: '1rem', mr: .75, verticalAlign: 'middle', color: REGISTRY_PALETTE.accent }} />
                Quick Start
              </Typography>
              <Typography variant="caption" fontWeight={600} sx={{ color: textSec, textTransform: 'uppercase', letterSpacing: '.07em', display: 'block', mb: .5 }}>1. Authenticate</Typography>
              {codeBlock(repo.login_command ?? 'docker login registry.orcacloud.com')}
              <Typography variant="caption" fontWeight={600} sx={{ color: textSec, textTransform: 'uppercase', letterSpacing: '.07em', display: 'block', mb: .5, mt: 1 }}>2. Push an image</Typography>
              {codeBlock(repo.push_command ?? `docker tag <image> ${repo.full_name}:latest\ndocker push ${repo.full_name}:latest`)}
              <Typography variant="caption" fontWeight={600} sx={{ color: textSec, textTransform: 'uppercase', letterSpacing: '.07em', display: 'block', mb: .5, mt: 1 }}>3. Pull an image</Typography>
              {codeBlock(repo.pull_command ?? `docker pull ${repo.full_name}:latest`)}
            </SCard>

            <SCard isDark={isDark}>
              <Typography fontWeight={700} fontSize=".9rem" color={isDark ? REGISTRY_PALETTE.white : REGISTRY_PALETTE.textStrong} mb={1.25}>Repository Details</Typography>
              {[
                ['Full address',      repo.full_name],
                ['Visibility',        repo.visibility],
                ['Region',            repo.region_display],
                ['Images',            String(repo.image_count)],
                ['Total size',        fmtSize(repo.storage_mb)],
                ['Total pulls',       repo.pull_count.toLocaleString()],
                ['Total pushes',      String(repo.push_count)],
                ['Last pushed',       repo.last_pushed_at ? new Date(repo.last_pushed_at).toLocaleString() : '—'],
                ['Created',           new Date(repo.created_at).toLocaleString()],
                ['Description',       repo.description || '—'],
              ].map(([k, v]) => (
                <Box key={k} display="flex" justifyContent="space-between" py={.4} sx={{ borderBottom: `1px solid ${isDark ? REGISTRY_PALETTE.panelLowDark : REGISTRY_PALETTE.surfaceSubtle}` }}>
                  <Typography variant="caption" sx={{ color: textSec, minWidth: 130 }}>{k}</Typography>
                  <Typography variant="caption" fontWeight={600} color={isDark ? REGISTRY_PALETTE.white : REGISTRY_PALETTE.textStrong} textAlign="right" sx={{ wordBreak: 'break-all', maxWidth: 260 }}>{v}</Typography>
                </Box>
              ))}
            </SCard>

            {repo.latest_usage && (
              <SCard isDark={isDark}>
                <Typography fontWeight={700} fontSize=".9rem" color={isDark ? REGISTRY_PALETTE.white : REGISTRY_PALETTE.textStrong} mb={1.25}>Usage &amp; Billing</Typography>
                {[
                  ['Storage',         `${repo.latest_usage.storage_gb.toFixed(3)} GB`],
                  ['Data transfer',   `${repo.latest_usage.transfer_gb.toFixed(3)} GB`],
                  ['Pulls',           String(repo.latest_usage.pull_count)],
                  ['Pushes',          String(repo.latest_usage.push_count)],
                  ['Hourly cost',     `$${Number(repo.latest_usage.hourly_cost_usd).toFixed(5)}`],
                ].map(([k, v]) => (
                  <Box key={k} display="flex" justifyContent="space-between" py={.4}>
                    <Typography variant="caption" sx={{ color: textSec }}>{k}</Typography>
                    <Typography variant="caption" fontWeight={700} color={isDark ? REGISTRY_PALETTE.white : REGISTRY_PALETTE.textStrong}>{v}</Typography>
                  </Box>
                ))}
              </SCard>
            )}
          </>
        )}
        {tab === 1 && <ImagesTab    repo={repo} isDark={isDark} />}
        {tab === 2 && <TokensTab    repo={repo} isDark={isDark} />}
        {tab === 3 && <ReplicationTab repo={repo} isDark={isDark} />}
      </Box>

      {/* Delete dialog */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { bgcolor: isDark ? REGISTRY_PALETTE.darkPanel : REGISTRY_PALETTE.surface, borderRadius: '12px', border: `1px solid ${border}` } }}>
        <DialogTitle sx={{ color: isDark ? REGISTRY_PALETTE.white : REGISTRY_PALETTE.textStrong, fontWeight: 700 }}>Delete repository?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: isDark ? alpha(REGISTRY_PALETTE.white, 0.65) : REGISTRY_PALETTE.textSecondary }}>
            <strong style={{ color: isDark ? REGISTRY_PALETTE.white : REGISTRY_PALETTE.textStrong }}>{repo.name}</strong> and all {repo.image_count} image{repo.image_count !== 1 ? 's' : ''} will be permanently deleted.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ pb: 2, px: 2.5, gap: 1 }}>
          <Button onClick={() => setDeleteOpen(false)} sx={{ textTransform: 'none', color: isDark ? alpha(REGISTRY_PALETTE.white, 0.6) : REGISTRY_PALETTE.textSecondary }}>Cancel</Button>
          <Button variant="contained" color="error" onClick={doDelete} disabled={deleting}
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
      <Box sx={{ width: 64, height: 64, bgcolor: isDark ? REGISTRY_PALETTE.panelMedDark : REGISTRY_PALETTE.surfaceHover, borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
        <LayersIcon sx={{ fontSize: '2.2rem', color: isDark ? REGISTRY_PALETTE.panelGhostDarkAlt : REGISTRY_PALETTE.borderStrong }} />
      </Box>
      <Typography fontWeight={700} fontSize="1.05rem" color={isDark ? REGISTRY_PALETTE.white : REGISTRY_PALETTE.textStrong} mb={.75}>No repositories yet</Typography>
      <Typography variant="body2" sx={{ color: isDark ? REGISTRY_PALETTE.panelMutedDark : REGISTRY_PALETTE.textMuted, mb: 3, maxWidth: 360, mx: 'auto' }}>
        Push Docker, OCI and Helm images to a private, multi-region container registry. Fully managed and secured.
      </Typography>
      <Button variant="contained" onClick={onCreate}
        sx={{ bgcolor: REGISTRY_PALETTE.accent, '&:hover': { bgcolor: REGISTRY_PALETTE.accentHover }, textTransform: 'none', borderRadius: '8px', fontWeight: 600 }}>
        New Repository
      </Button>
    </Box>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
const ContainerRegistryPage: React.FC = () => {
  const theme  = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [repos,    setRepos]    = useState<ContainerRepository[]>([]);
  const [selected, setSelected] = useState<ContainerRepository | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [createOpen, setCreate] = useState(false);
  const [toast,    setToast]    = useState('');

  const border = isDark ? REGISTRY_PALETTE.panelStrokeDark : REGISTRY_PALETTE.border;
  const sideBg = isDark ? REGISTRY_PALETTE.darkSidebar : REGISTRY_PALETTE.surfaceSubtle;

  const load = useCallback(() => {
    setLoading(true);
    registryApi.list()
      .then(r => {
        const list: ContainerRepository[] = Array.isArray(r.data) ? r.data : (r.data as any).results ?? [];
        setRepos(list);
        setSelected(s => s ? list.find(x => x.id === s.id) ?? null : null);
      })
      .catch(() => setRepos([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSelect = (repo: ContainerRepository) => {
    registryApi.get(repo.id).then(r => setSelected(r.data)).catch(() => setSelected(repo));
  };

  const handleCreated = (repo: ContainerRepository) => {
    setCreate(false);
    load();
    setToast(`Repository "${repo.name}" created successfully!`);
    registryApi.get(repo.id).then(r => setSelected(r.data)).catch(() => setSelected(repo));
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: isDark ? REGISTRY_PALETTE.darkPage : REGISTRY_PALETTE.surface }}>
      {/* Header */}
      <Box sx={{ bgcolor: isDark ? REGISTRY_PALETTE.darkHeader : REGISTRY_PALETTE.surface, borderBottom: `1px solid ${border}`, px: 4, py: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography fontWeight={800} fontSize="1.25rem" color={isDark ? REGISTRY_PALETTE.white : REGISTRY_PALETTE.textStrong}>Container Registry</Typography>
          <Typography variant="body2" sx={{ color: isDark ? REGISTRY_PALETTE.panelMutedDark : REGISTRY_PALETTE.textSecondary, mt: .25 }}>
            Private OCI-compliant registry · Multi-region · Docker &amp; Helm compatible
          </Typography>
        </Box>
        <Box display="flex" gap={1} alignItems="center">
          <Button startIcon={<RefreshIcon />} onClick={load} disabled={loading} variant="outlined" size="small"
            sx={{ textTransform: 'none', color: isDark ? REGISTRY_PALETTE.white : REGISTRY_PALETTE.textBody, borderColor: border, '&:hover': { bgcolor: isDark ? REGISTRY_PALETTE.panelMedDark : 'rgba(0,0,0,.04)' } }}>
            Refresh
          </Button>
          <DeployDropdown />
        </Box>
      </Box>

      {/* Body */}
      <Box sx={{ display: 'flex', height: 'calc(100vh - 88px)' }}>
        {/* Left: repo list */}
        <Box sx={{ width: { xs: '100%', md: 300 }, flexShrink: 0, borderRight: `1px solid ${border}`, bgcolor: sideBg, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {/* Summary bar */}
          <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${border}`, display: 'flex', gap: 3 }}>
            {[
              { label: 'Repos',   value: repos.length },
              { label: 'Public',  value: repos.filter(r => r.visibility === 'public').length,  color: REGISTRY_PALETTE.success },
              { label: 'Private', value: repos.filter(r => r.visibility === 'private').length, color: REGISTRY_PALETTE.accent },
            ].map(s => (
              <Box key={s.label} textAlign="center">
                <Typography fontWeight={800} fontSize="1.1rem" color={s.color ?? (isDark ? REGISTRY_PALETTE.white : REGISTRY_PALETTE.textStrong)}>{s.value}</Typography>
                <Typography variant="caption" sx={{ color: isDark ? alpha(REGISTRY_PALETTE.white, 0.4) : REGISTRY_PALETTE.textMuted }}>{s.label}</Typography>
              </Box>
            ))}
          </Box>
          {loading ? (
            <Box p={2}>{[1,2,3].map(k => <Skeleton key={k} height={66} sx={{ mb: 1, bgcolor: isDark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.05)', borderRadius: 2 }} />)}</Box>
          ) : repos.length === 0 ? (
            <EmptyState onCreate={() => setCreate(true)} isDark={isDark} />
          ) : (
            repos.map(repo => (
              <RepoCard key={repo.id} repo={repo} selected={selected?.id === repo.id} onClick={() => handleSelect(repo)} isDark={isDark} />
            ))
          )}
        </Box>

        {/* Right: detail */}
        <Box sx={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', bgcolor: isDark ? REGISTRY_PALETTE.darkPage : REGISTRY_PALETTE.surface }}>
          {selected ? (
            <RepositoryDetail
              repo={selected}
              isDark={isDark}
              onDelete={() => { setSelected(null); load(); }}
              onRefresh={() => registryApi.get(selected.id).then(r => setSelected(r.data)).catch(() => {})}
            />
          ) : (
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Box textAlign="center">
                <LayersIcon sx={{ fontSize: '3rem', color: isDark ? alpha(REGISTRY_PALETTE.white, 0.1) : REGISTRY_PALETTE.border, mb: 1.5 }} />
                <Typography fontWeight={600} color={isDark ? alpha(REGISTRY_PALETTE.white, 0.3) : REGISTRY_PALETTE.textMuted} fontSize=".9rem">
                  {repos.length > 0 ? 'Select a repository to view details' : 'Create your first repository'}
                </Typography>
              </Box>
            </Box>
          )}
        </Box>
      </Box>

      <CreateRepositoryModal open={createOpen} onClose={() => setCreate(false)} onSuccess={handleCreated} />

      <Snackbar open={!!toast} autoHideDuration={5000} onClose={() => setToast('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity="success" onClose={() => setToast('')}>{toast}</Alert>
      </Snackbar>
    </Box>
  );
};

export default ContainerRegistryPage;
