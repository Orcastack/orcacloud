import React, { useState } from 'react';
import {
  Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody,
  Chip, Button, Grid, Tabs, Tab, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Select, MenuItem, FormControl, InputLabel,
  IconButton, Tooltip, LinearProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RestoreIcon from '@mui/icons-material/Restore';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { dashboardTokens, dashboardSemanticColors } from '../styles/dashboardDesignSystem';

const T = dashboardTokens.colors;
const S = dashboardSemanticColors;

interface Snapshot {
  id: string; name: string; sourceVolume: string; sizeTB: number;
  status: 'completed' | 'pending' | 'error'; type: 'manual' | 'automated';
  region: string; created: string; retentionDays: number; encrypted: boolean;
}

interface ReplicationJob {
  id: string; snapshotId: string; sourceRegion: string; destRegion: string;
  progress: number; status: 'running' | 'completed' | 'failed';
}

const SNAPSHOTS: Snapshot[] = [
  { id: 'snap-001', name: 'prod-db-daily-2026-02-27', sourceVolume: 'vol-db-prod-01', sizeTB: 0.8, status: 'completed', type: 'automated', region: 'us-east-1', created: '2026-02-27 02:00', retentionDays: 30, encrypted: true },
  { id: 'snap-002', name: 'app-data-weekly', sourceVolume: 'vol-app-data-02', sizeTB: 2.4, status: 'completed', type: 'automated', region: 'us-east-1', created: '2026-02-24 03:00', retentionDays: 90, encrypted: true },
  { id: 'snap-003', name: 'pre-migration-backup', sourceVolume: 'vol-main-store', sizeTB: 5.1, status: 'completed', type: 'manual', region: 'eu-west-1', created: '2026-02-26 15:42', retentionDays: 365, encrypted: true },
  { id: 'snap-004', name: 'archive-q4-2025', sourceVolume: 'vol-archive-01', sizeTB: 12.0, status: 'completed', type: 'manual', region: 'us-east-1', created: '2026-01-01 00:00', retentionDays: 730, encrypted: false },
  { id: 'snap-005', name: 'prod-db-daily-in-progress', sourceVolume: 'vol-db-prod-02', sizeTB: 1.2, status: 'pending', type: 'automated', region: 'us-west-2', created: '2026-02-27 02:01', retentionDays: 30, encrypted: true },
];

const REPLICATION: ReplicationJob[] = [
  { id: 'rep-1', snapshotId: 'snap-001', sourceRegion: 'us-east-1', destRegion: 'eu-west-1', progress: 100, status: 'completed' },
  { id: 'rep-2', snapshotId: 'snap-005', sourceRegion: 'us-west-2', destRegion: 'ap-southeast-1', progress: 67, status: 'running' },
  { id: 'rep-3', snapshotId: 'snap-003', sourceRegion: 'eu-west-1', destRegion: 'us-east-1', progress: 100, status: 'completed' },
];

const statusColor = (s: Snapshot['status']) =>
  s === 'completed' ? S.success : s === 'pending' ? S.warning : S.danger;

const SummaryCard = ({ label, value, sub }: { label: string; value: string | number; sub?: string }) => (
  <Paper sx={{ p: 2, borderRadius: 2, border: `1px solid ${T.border}`, bgcolor: T.surface }}>
    <Typography variant="caption" sx={{ color: T.textSecondary, textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</Typography>
    <Typography variant="h4" sx={{ color: T.textPrimary, fontWeight: 700, mt: 0.5 }}>{value}</Typography>
    {sub && <Typography variant="caption" sx={{ color: T.textSecondary }}>{sub}</Typography>}
  </Paper>
);

export default function SnapshotsPage() {
  const [tab, setTab] = useState(0);
  const [open, setOpen] = useState(false);

  const totalSizeTB = SNAPSHOTS.reduce((a, s) => a + s.sizeTB, 0).toFixed(1);

  return (
    <Box sx={{ p: 3, bgcolor: T.background, minHeight: '100vh', fontFamily: dashboardTokens.typography.fontFamily }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ color: T.textPrimary, fontWeight: 700 }}>Snapshots & Backups</Typography>
          <Typography variant="body2" sx={{ color: T.textSecondary, mt: 0.3 }}>Point-in-time volume snapshots and cross-region replication</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}
          sx={{ bgcolor: T.brandPrimary, '&:hover': { bgcolor: T.brandPrimaryHover } }}>
          Create Snapshot
        </Button>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Total Snapshots', value: SNAPSHOTS.length, sub: `${SNAPSHOTS.filter(s => s.status === 'completed').length} completed` },
          { label: 'Storage Used', value: `${totalSizeTB} TB`, sub: 'across all regions' },
          { label: 'Automated', value: SNAPSHOTS.filter(s => s.type === 'automated').length, sub: 'scheduled snapshots' },
          { label: 'Replications', value: REPLICATION.filter(r => r.status === 'running').length, sub: 'active jobs' },
        ].map(c => (
          <Grid item xs={6} sm={3} key={c.label}><SummaryCard {...c} /></Grid>
        ))}
      </Grid>

      <Paper sx={{ borderRadius: 2, border: `1px solid ${T.border}`, bgcolor: T.surface }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2, borderBottom: `1px solid ${T.border}` }}>
          <Tab label="Snapshots" />
          <Tab label="Backup Schedules" />
          <Tab label="Replication" />
        </Tabs>

        {tab === 0 && (
          <Table>
            <TableHead>
              <TableRow>
                {['Name', 'Source Volume', 'Size', 'Status', 'Type', 'Region', 'Created', 'Retention', 'Enc.', 'Actions'].map(h => (
                  <TableCell key={h} sx={{ color: T.textSecondary, fontSize: '.75rem', fontWeight: 600 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {SNAPSHOTS.map(s => (
                <TableRow key={s.id} hover sx={{ '&:hover': { bgcolor: T.surfaceHover } }}>
                  <TableCell sx={{ color: T.textPrimary, fontWeight: 600, fontFamily: 'monospace', fontSize: '.8rem' }}>{s.name}</TableCell>
                  <TableCell sx={{ color: T.textSecondary, fontFamily: 'monospace', fontSize: '.8rem' }}>{s.sourceVolume}</TableCell>
                  <TableCell sx={{ color: T.textPrimary }}>{s.sizeTB} TB</TableCell>
                  <TableCell>
                    <Chip label={s.status} size="small"
                      sx={{ bgcolor: `${statusColor(s.status)}22`, color: statusColor(s.status), fontSize: '.7rem' }} />
                  </TableCell>
                  <TableCell>
                    <Chip label={s.type} size="small"
                      sx={{ bgcolor: s.type === 'automated' ? `${T.brandPrimary}22` : `${S.purple}22`,
                        color: s.type === 'automated' ? T.brandPrimary : S.purple, fontSize: '.7rem' }} />
                  </TableCell>
                  <TableCell sx={{ color: T.textSecondary }}>{s.region}</TableCell>
                  <TableCell sx={{ color: T.textSecondary, fontSize: '.78rem' }}>{s.created}</TableCell>
                  <TableCell sx={{ color: T.textSecondary }}>{s.retentionDays}d</TableCell>
                  <TableCell>
                    <Chip label={s.encrypted ? 'AES-256' : 'None'} size="small"
                      sx={{ bgcolor: s.encrypted ? `${S.success}22` : `${S.warning}22`,
                        color: s.encrypted ? S.success : S.warning, fontSize: '.65rem' }} />
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Restore"><IconButton size="small" sx={{ color: T.textSecondary }}><RestoreIcon fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="Copy to Region"><IconButton size="small" sx={{ color: T.textSecondary }}><ContentCopyIcon fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="Delete"><IconButton size="small" sx={{ color: S.danger }}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {tab === 1 && (
          <Box sx={{ p: 3 }}>
            {[
              { name: 'Daily DB Backup', resource: 'vol-db-prod-*', schedule: 'Daily 02:00 UTC', retention: '30 days', enabled: true },
              { name: 'Weekly App Data', resource: 'vol-app-data-*', schedule: 'Sunday 03:00 UTC', retention: '90 days', enabled: true },
              { name: 'Monthly Archive', resource: 'vol-archive-*', schedule: '1st of Month 00:00 UTC', retention: '2 years', enabled: true },
              { name: 'CI Artifacts Backup', resource: 'vol-ci-*', schedule: 'Daily 04:00 UTC', retention: '14 days', enabled: false },
            ].map((sch, i) => (
              <Paper key={i} sx={{ p: 2, mb: 1.5, bgcolor: T.surfaceSubtle, border: `1px solid ${T.border}`, borderRadius: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="body2" sx={{ color: T.textPrimary, fontWeight: 600 }}>{sch.name}</Typography>
                    <Typography variant="caption" sx={{ color: T.textSecondary }}>{sch.resource} · {sch.schedule} · Keep {sch.retention}</Typography>
                  </Box>
                  <Chip label={sch.enabled ? 'Enabled' : 'Disabled'} size="small"
                    sx={{ bgcolor: sch.enabled ? `${S.success}22` : `${T.border}`, color: sch.enabled ? S.success : T.textSecondary }} />
                </Box>
              </Paper>
            ))}
          </Box>
        )}

        {tab === 2 && (
          <Table>
            <TableHead>
              <TableRow>
                {['Snapshot', 'Source Region', 'Dest Region', 'Progress', 'Status'].map(h => (
                  <TableCell key={h} sx={{ color: T.textSecondary, fontSize: '.75rem', fontWeight: 600 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {REPLICATION.map(r => (
                <TableRow key={r.id} hover sx={{ '&:hover': { bgcolor: T.surfaceHover } }}>
                  <TableCell sx={{ color: T.textPrimary, fontFamily: 'monospace', fontSize: '.8rem' }}>{r.snapshotId}</TableCell>
                  <TableCell sx={{ color: T.textSecondary }}>{r.sourceRegion}</TableCell>
                  <TableCell sx={{ color: T.textSecondary }}>{r.destRegion}</TableCell>
                  <TableCell sx={{ minWidth: 140 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress variant="determinate" value={r.progress} sx={{ flex: 1, height: 6, borderRadius: 3,
                        '& .MuiLinearProgress-bar': { bgcolor: r.status === 'failed' ? S.danger : S.success } }} />
                      <Typography variant="caption" sx={{ color: T.textSecondary, minWidth: 32 }}>{r.progress}%</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip label={r.status} size="small"
                      sx={{ bgcolor: `${r.status === 'completed' ? S.success : r.status === 'running' ? '#60A5FA' : S.danger}22`,
                        color: r.status === 'completed' ? S.success : r.status === 'running' ? '#60A5FA' : S.danger, fontSize: '.7rem' }} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: T.textPrimary }}>Create Snapshot</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '12px !important' }}>
          <TextField label="Snapshot Name" fullWidth size="small" />
          <FormControl size="small" fullWidth>
            <InputLabel>Source Volume</InputLabel>
            <Select label="Source Volume" defaultValue="">
              {['vol-db-prod-01','vol-app-data-02','vol-main-store'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField label="Retention (days)" type="number" fullWidth size="small" defaultValue={30} />
          <FormControl size="small" fullWidth>
            <InputLabel>Encryption</InputLabel>
            <Select label="Encryption" defaultValue="aes256">
              <MenuItem value="aes256">AES-256 (recommended)</MenuItem>
              <MenuItem value="none">No encryption</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)} sx={{ color: T.textSecondary }}>Cancel</Button>
          <Button variant="contained" onClick={() => setOpen(false)}
            sx={{ bgcolor: T.brandPrimary, '&:hover': { bgcolor: T.brandPrimaryHover } }}>Create</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
