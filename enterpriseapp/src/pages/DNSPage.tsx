import React, { useState } from 'react';
import {
  Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody,
  Chip, Button, Grid, Tabs, Tab, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Select, MenuItem, FormControl, InputLabel,
  IconButton, Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DnsIcon from '@mui/icons-material/Dns';
import { dashboardTokens, dashboardSemanticColors } from '../styles/dashboardDesignSystem';

const T = dashboardTokens.colors;
const S = dashboardSemanticColors;

interface DNSZone {
  id: string; name: string; type: 'public' | 'private'; records: number;
  status: 'active' | 'pending'; nameservers: string[]; ttl: number;
}

interface DNSRecord {
  id: string; zone: string; name: string; type: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS' | 'SRV';
  value: string; ttl: number; proxied: boolean;
}

const ZONES: DNSZone[] = [
  { id: 'z-001', name: 'orcacloud.com', type: 'public', records: 24, status: 'active', nameservers: ['ns1.orcacloud.cloud', 'ns2.orcacloud.cloud'], ttl: 300 },
  { id: 'z-002', name: 'api.orcacloud.com', type: 'public', records: 8, status: 'active', nameservers: ['ns1.orcacloud.cloud', 'ns2.orcacloud.cloud'], ttl: 60 },
  { id: 'z-003', name: 'internal.corp', type: 'private', records: 42, status: 'active', nameservers: ['ns-int-1.orcacloud.internal'], ttl: 30 },
  { id: 'z-004', name: 'staging.orcacloud.com', type: 'public', records: 12, status: 'active', nameservers: ['ns1.orcacloud.cloud', 'ns2.orcacloud.cloud'], ttl: 60 },
];

const RECORDS: DNSRecord[] = [
  { id: 'rec-01', zone: 'orcacloud.com', name: '@', type: 'A', value: '104.21.45.100', ttl: 300, proxied: true },
  { id: 'rec-02', zone: 'orcacloud.com', name: 'www', type: 'CNAME', value: 'orcacloud.com', ttl: 300, proxied: true },
  { id: 'rec-03', zone: 'orcacloud.com', name: 'api', type: 'A', value: '185.199.110.50', ttl: 60, proxied: false },
  { id: 'rec-04', zone: 'orcacloud.com', name: 'mail', type: 'MX', value: '10 mx.orcacloudmail.com', ttl: 3600, proxied: false },
  { id: 'rec-05', zone: 'orcacloud.com', name: '@', type: 'TXT', value: 'v=spf1 include:spf.orcacloudmail.com ~all', ttl: 3600, proxied: false },
  { id: 'rec-06', zone: 'orcacloud.com', name: 'cdn', type: 'CNAME', value: 'd1234abcd.cloudfront.net', ttl: 300, proxied: true },
  { id: 'rec-07', zone: 'orcacloud.com', name: 'grafana', type: 'A', value: '10.0.1.50', ttl: 60, proxied: false },
];

const typeColor: Record<string, string> = {
  A: '#60A5FA', AAAA: '#818CF8', CNAME: S.success, MX: S.warning, TXT: S.purple, NS: T.brandPrimary, SRV: '#F472B6',
};

export default function DNSPage() {
  const [tab, setTab] = useState(0);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [recordDialog, setRecordDialog] = useState(false);

  const filteredRecords = selectedZone ? RECORDS.filter(r => r.zone === selectedZone) : RECORDS;

  return (
    <Box sx={{ p: 3, bgcolor: T.background, minHeight: '100vh', fontFamily: dashboardTokens.typography.fontFamily }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ color: T.textPrimary, fontWeight: 700 }}>DNS Zones</Typography>
          <Typography variant="body2" sx={{ color: T.textSecondary, mt: 0.3 }}>Manage DNS zones, records, and name server configuration</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}
          sx={{ bgcolor: T.brandPrimary, '&:hover': { bgcolor: T.brandPrimaryHover } }}>
          New Zone
        </Button>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'DNS Zones', value: ZONES.length },
          { label: 'Public Zones', value: ZONES.filter(z => z.type === 'public').length },
          { label: 'Private Zones', value: ZONES.filter(z => z.type === 'private').length },
          { label: 'Total Records', value: ZONES.reduce((a, z) => a + z.records, 0) },
        ].map(c => (
          <Grid item xs={6} sm={3} key={c.label}>
            <Paper sx={{ p: 2, borderRadius: 2, border: `1px solid ${T.border}`, bgcolor: T.surface }}>
              <Typography variant="caption" sx={{ color: T.textSecondary, textTransform: 'uppercase', letterSpacing: '.06em' }}>{c.label}</Typography>
              <Typography variant="h4" sx={{ color: T.textPrimary, fontWeight: 700, mt: 0.5 }}>{c.value}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ borderRadius: 2, border: `1px solid ${T.border}`, bgcolor: T.surface }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2, borderBottom: `1px solid ${T.border}` }}>
          <Tab label="Zones" />
          <Tab label="Records" />
          <Tab label="Query Logs" />
        </Tabs>

        {tab === 0 && (
          <Table>
            <TableHead>
              <TableRow>
                {['Zone Name', 'Type', 'Status', 'Records', 'TTL (default)', 'Name Servers', 'Actions'].map(h => (
                  <TableCell key={h} sx={{ color: T.textSecondary, fontSize: '.75rem', fontWeight: 600 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {ZONES.map(z => (
                <TableRow key={z.id} hover sx={{ cursor: 'pointer', '&:hover': { bgcolor: T.surfaceHover } }}
                  onClick={() => { setSelectedZone(z.name); setTab(1); }}>
                  <TableCell sx={{ color: T.textPrimary, fontWeight: 600 }}>{z.name}</TableCell>
                  <TableCell>
                    <Chip label={z.type} size="small"
                      sx={{ bgcolor: z.type === 'public' ? `${T.brandPrimary}22` : `${S.purple}22`,
                        color: z.type === 'public' ? T.brandPrimary : S.purple, fontSize: '.7rem' }} />
                  </TableCell>
                  <TableCell>
                    <Chip label={z.status} size="small"
                      sx={{ bgcolor: `${S.success}22`, color: S.success, fontSize: '.7rem' }} />
                  </TableCell>
                  <TableCell sx={{ color: T.textPrimary }}>{z.records}</TableCell>
                  <TableCell sx={{ color: T.textSecondary }}>{z.ttl}s</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3 }}>
                      {z.nameservers.map(ns => (
                        <Typography key={ns} variant="caption" sx={{ color: T.textSecondary, fontFamily: 'monospace', fontSize: '.75rem' }}>{ns}</Typography>
                      ))}
                    </Box>
                  </TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <IconButton size="small" sx={{ color: T.textSecondary }}><EditIcon fontSize="small" /></IconButton>
                    <IconButton size="small" sx={{ color: S.danger }}><DeleteIcon fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {tab === 1 && (
          <>
            <Box sx={{ px: 2, pt: 2, pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" sx={{ color: T.textSecondary }}>Zone:</Typography>
                {ZONES.map(z => (
                  <Chip key={z.id} label={z.name} size="small" clickable
                    onClick={() => setSelectedZone(selectedZone === z.name ? null : z.name)}
                    sx={{ bgcolor: selectedZone === z.name ? T.brandPrimary : T.surfaceSubtle,
                      color: selectedZone === z.name ? '#fff' : T.textSecondary, fontSize: '.7rem' }} />
                ))}
              </Box>
              <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => setRecordDialog(true)}
                sx={{ borderColor: T.border, color: T.textPrimary }}>Add Record</Button>
            </Box>
            <Table>
              <TableHead>
                <TableRow>
                  {['Zone', 'Name', 'Type', 'Value', 'TTL', 'Proxied', 'Actions'].map(h => (
                    <TableCell key={h} sx={{ color: T.textSecondary, fontSize: '.75rem', fontWeight: 600 }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRecords.map(r => (
                  <TableRow key={r.id} hover sx={{ '&:hover': { bgcolor: T.surfaceHover } }}>
                    <TableCell sx={{ color: T.textSecondary, fontSize: '.78rem' }}>{r.zone}</TableCell>
                    <TableCell sx={{ color: T.textPrimary, fontWeight: 600, fontFamily: 'monospace' }}>{r.name}</TableCell>
                    <TableCell>
                      <Chip label={r.type} size="small"
                        sx={{ bgcolor: `${typeColor[r.type] || T.textSecondary}22`, color: typeColor[r.type] || T.textSecondary, fontWeight: 700, fontSize: '.7rem' }} />
                    </TableCell>
                    <TableCell sx={{ color: T.textSecondary, fontFamily: 'monospace', fontSize: '.78rem', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.value}</TableCell>
                    <TableCell sx={{ color: T.textSecondary }}>{r.ttl}s</TableCell>
                    <TableCell>
                      <Chip label={r.proxied ? 'Proxied' : 'DNS only'} size="small"
                        sx={{ bgcolor: r.proxied ? `${S.warning}22` : T.surfaceSubtle,
                          color: r.proxied ? S.warning : T.textSecondary, fontSize: '.65rem' }} />
                    </TableCell>
                    <TableCell>
                      <IconButton size="small" sx={{ color: T.textSecondary }}><EditIcon fontSize="small" /></IconButton>
                      <IconButton size="small" sx={{ color: S.danger }}><DeleteIcon fontSize="small" /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}

        {tab === 2 && (
          <Box sx={{ p: 3 }}>
            {[
              { time: '14:33:01', query: 'orcacloud.com', type: 'A', resolver: '8.8.8.8', latency: '4ms', result: 'NOERROR' },
              { time: '14:33:00', query: 'api.orcacloud.com', type: 'A', resolver: '1.1.1.1', latency: '2ms', result: 'NOERROR' },
              { time: '14:32:58', query: 'mail.orcacloud.com', type: 'MX', resolver: '8.8.8.8', latency: '6ms', result: 'NOERROR' },
              { time: '14:32:55', query: 'unknown.orcacloud.com', type: 'A', resolver: '1.1.1.1', latency: '3ms', result: 'NXDOMAIN' },
              { time: '14:32:50', query: 'cdn.orcacloud.com', type: 'CNAME', resolver: '9.9.9.9', latency: '5ms', result: 'NOERROR' },
            ].map((log, i) => (
              <Box key={i} sx={{ display: 'flex', gap: 2, py: 1.2, borderBottom: `1px solid ${T.border}`, alignItems: 'center' }}>
                <Typography variant="caption" sx={{ color: T.textSecondary, fontFamily: 'monospace', minWidth: 70 }}>{log.time}</Typography>
                <Chip label={log.type} size="small" sx={{ bgcolor: `${typeColor[log.type] || T.textSecondary}22`, color: typeColor[log.type] || T.textSecondary, fontSize: '.65rem', minWidth: 50 }} />
                <Typography variant="caption" sx={{ color: T.textPrimary, fontFamily: 'monospace', flex: 1 }}>{log.query}</Typography>
                <Typography variant="caption" sx={{ color: T.textSecondary }}>via {log.resolver}</Typography>
                <Typography variant="caption" sx={{ color: T.textSecondary }}>{log.latency}</Typography>
                <Chip label={log.result} size="small"
                  sx={{ bgcolor: log.result === 'NOERROR' ? `${S.success}22` : `${S.danger}22`,
                    color: log.result === 'NOERROR' ? S.success : S.danger, fontSize: '.65rem' }} />
              </Box>
            ))}
          </Box>
        )}
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: T.textPrimary }}>Create DNS Zone</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '12px !important' }}>
          <TextField label="Zone Name (e.g. example.com)" fullWidth size="small" />
          <FormControl size="small" fullWidth>
            <InputLabel>Zone Type</InputLabel>
            <Select label="Zone Type" defaultValue="public">
              <MenuItem value="public">Public</MenuItem>
              <MenuItem value="private">Private (VPC-only)</MenuItem>
            </Select>
          </FormControl>
          <TextField label="Default TTL (seconds)" type="number" fullWidth size="small" defaultValue={300} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)} sx={{ color: T.textSecondary }}>Cancel</Button>
          <Button variant="contained" onClick={() => setOpen(false)}
            sx={{ bgcolor: T.brandPrimary, '&:hover': { bgcolor: T.brandPrimaryHover } }}>Create</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={recordDialog} onClose={() => setRecordDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: T.textPrimary }}>Add DNS Record</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '12px !important' }}>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <FormControl size="small" fullWidth>
                <InputLabel>Type</InputLabel>
                <Select label="Type" defaultValue="A">
                  {['A','AAAA','CNAME','MX','TXT','NS','SRV'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField label="Name" fullWidth size="small" placeholder="@ or subdomain" />
            </Grid>
          </Grid>
          <TextField label="Value" fullWidth size="small" placeholder="IP address or hostname" />
          <TextField label="TTL (seconds)" type="number" fullWidth size="small" defaultValue={300} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRecordDialog(false)} sx={{ color: T.textSecondary }}>Cancel</Button>
          <Button variant="contained" onClick={() => setRecordDialog(false)}
            sx={{ bgcolor: T.brandPrimary, '&:hover': { bgcolor: T.brandPrimaryHover } }}>Add Record</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
