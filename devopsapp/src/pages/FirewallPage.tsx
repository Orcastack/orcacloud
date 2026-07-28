import React, { useState } from 'react';
import {
  Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody,
  Chip, Button, Grid, Tabs, Tab, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Select, MenuItem, FormControl, InputLabel,
  IconButton, Tooltip, Switch, FormControlLabel,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SecurityIcon from '@mui/icons-material/Security';
import { dashboardTokens, dashboardSemanticColors } from '../styles/dashboardDesignSystem';

const T = dashboardTokens.colors;
const S = dashboardSemanticColors;

interface FirewallRule {
  id: string; name: string; direction: 'inbound' | 'outbound'; priority: number;
  protocol: 'TCP' | 'UDP' | 'ICMP' | 'ALL'; portRange: string;
  source: string; action: 'allow' | 'deny'; enabled: boolean; description: string;
}

interface SecurityGroup {
  id: string; name: string; vpcId: string; description: string;
  inboundRules: number; outboundRules: number; attachedTo: string[];
}

const RULES: FirewallRule[] = [
  { id: 'rule-001', name: 'Allow HTTPS', direction: 'inbound', priority: 100, protocol: 'TCP', portRange: '443', source: '0.0.0.0/0', action: 'allow', enabled: true, description: 'Allow HTTPS from anywhere' },
  { id: 'rule-002', name: 'Allow HTTP (redirect)', direction: 'inbound', priority: 110, protocol: 'TCP', portRange: '80', source: '0.0.0.0/0', action: 'allow', enabled: true, description: 'HTTP redirect to HTTPS' },
  { id: 'rule-003', name: 'Allow SSH internal', direction: 'inbound', priority: 200, protocol: 'TCP', portRange: '22', source: '10.0.0.0/8', action: 'allow', enabled: true, description: 'SSH from internal network only' },
  { id: 'rule-004', name: 'Block Tor exit nodes', direction: 'inbound', priority: 50, protocol: 'ALL', portRange: 'All', source: 'GeoIP:TOR', action: 'deny', enabled: true, description: 'Block known Tor exit nodes' },
  { id: 'rule-005', name: 'Allow DB internal', direction: 'inbound', priority: 300, protocol: 'TCP', portRange: '5432', source: '10.10.0.0/16', action: 'allow', enabled: true, description: 'PostgreSQL from app subnet' },
  { id: 'rule-006', name: 'Allow egress HTTPS', direction: 'outbound', priority: 100, protocol: 'TCP', portRange: '443', source: '0.0.0.0/0', action: 'allow', enabled: true, description: 'Allow outbound HTTPS' },
  { id: 'rule-007', name: 'Block SMTP outbound', direction: 'outbound', priority: 50, protocol: 'TCP', portRange: '25,465,587', source: '0.0.0.0/0', action: 'deny', enabled: true, description: 'Prevent SMTP spam' },
];

const SECURITY_GROUPS: SecurityGroup[] = [
  { id: 'sg-001', name: 'web-tier-sg', vpcId: 'vpc-prod-01', description: 'Security group for web servers', inboundRules: 3, outboundRules: 2, attachedTo: ['i-web-01', 'i-web-02', 'i-web-03'] },
  { id: 'sg-002', name: 'app-tier-sg', vpcId: 'vpc-prod-01', description: 'Security group for application servers', inboundRules: 4, outboundRules: 3, attachedTo: ['i-app-01', 'i-app-02'] },
  { id: 'sg-003', name: 'db-tier-sg', vpcId: 'vpc-prod-01', description: 'Security group for database instances', inboundRules: 2, outboundRules: 1, attachedTo: ['db-prod-01'] },
  { id: 'sg-004', name: 'bastion-sg', vpcId: 'vpc-prod-01', description: 'Bastion host security group', inboundRules: 1, outboundRules: 1, attachedTo: ['i-bastion-01'] },
];

export default function FirewallPage() {
  const [tab, setTab] = useState(0);
  const [open, setOpen] = useState(false);

  return (
    <Box sx={{ p: 3, bgcolor: T.background, minHeight: '100vh', fontFamily: dashboardTokens.typography.fontFamily }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ color: T.textPrimary, fontWeight: 700 }}>Firewall & Security Groups</Typography>
          <Typography variant="body2" sx={{ color: T.textSecondary, mt: 0.3 }}>Manage network-level access controls and security group rules</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}
          sx={{ bgcolor: T.brandPrimary, '&:hover': { bgcolor: T.brandPrimaryHover } }}>
          Add Rule
        </Button>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Total Rules', value: RULES.length, color: T.textPrimary },
          { label: 'Inbound Allow', value: RULES.filter(r => r.direction === 'inbound' && r.action === 'allow').length, color: S.success },
          { label: 'Deny Rules', value: RULES.filter(r => r.action === 'deny').length, color: S.danger },
          { label: 'Security Groups', value: SECURITY_GROUPS.length, color: T.brandPrimary },
        ].map(c => (
          <Grid item xs={6} sm={3} key={c.label}>
            <Paper sx={{ p: 2, borderRadius: 2, border: `1px solid ${T.border}`, bgcolor: T.surface }}>
              <Typography variant="caption" sx={{ color: T.textSecondary, textTransform: 'uppercase', letterSpacing: '.06em' }}>{c.label}</Typography>
              <Typography variant="h4" sx={{ color: c.color, fontWeight: 700, mt: 0.5 }}>{c.value}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ borderRadius: 2, border: `1px solid ${T.border}`, bgcolor: T.surface }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2, borderBottom: `1px solid ${T.border}` }}>
          <Tab label="Firewall Rules" />
          <Tab label="Security Groups" />
          <Tab label="Traffic Logs" />
        </Tabs>

        {tab === 0 && (
          <Table>
            <TableHead>
              <TableRow>
                {['Priority', 'Name', 'Direction', 'Protocol', 'Port / Range', 'Source / Dest', 'Action', 'Enabled', 'Actions'].map(h => (
                  <TableCell key={h} sx={{ color: T.textSecondary, fontSize: '.75rem', fontWeight: 600 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {[...RULES].sort((a, b) => a.priority - b.priority).map(r => (
                <TableRow key={r.id} hover
                  sx={{ bgcolor: r.action === 'deny' ? `${S.danger}08` : 'transparent', '&:hover': { bgcolor: T.surfaceHover } }}>
                  <TableCell sx={{ color: T.textSecondary, fontWeight: 600 }}>{r.priority}</TableCell>
                  <TableCell sx={{ color: T.textPrimary, fontWeight: 600 }}>{r.name}</TableCell>
                  <TableCell>
                    <Chip label={r.direction} size="small"
                      sx={{ bgcolor: r.direction === 'inbound' ? `${T.brandPrimary}22` : `${S.purple}22`,
                        color: r.direction === 'inbound' ? T.brandPrimary : S.purple, fontSize: '.7rem' }} />
                  </TableCell>
                  <TableCell sx={{ color: T.textSecondary }}>{r.protocol}</TableCell>
                  <TableCell sx={{ color: T.textPrimary, fontFamily: 'monospace', fontSize: '.8rem' }}>{r.portRange}</TableCell>
                  <TableCell sx={{ color: T.textSecondary, fontFamily: 'monospace', fontSize: '.78rem' }}>{r.source}</TableCell>
                  <TableCell>
                    <Chip label={r.action.toUpperCase()} size="small"
                      sx={{ bgcolor: r.action === 'allow' ? `${S.success}22` : `${S.danger}22`,
                        color: r.action === 'allow' ? S.success : S.danger, fontWeight: 700, fontSize: '.7rem' }} />
                  </TableCell>
                  <TableCell>
                    <Switch size="small" checked={r.enabled} sx={{ '& .MuiSwitch-thumb': { color: r.enabled ? S.success : T.textSecondary } }} />
                  </TableCell>
                  <TableCell>
                    <IconButton size="small" sx={{ color: T.textSecondary }}><EditIcon fontSize="small" /></IconButton>
                    <IconButton size="small" sx={{ color: S.danger }}><DeleteIcon fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {tab === 1 && (
          <Table>
            <TableHead>
              <TableRow>
                {['Group ID', 'Name', 'VPC', 'Description', 'Inbound Rules', 'Outbound Rules', 'Attached To', 'Actions'].map(h => (
                  <TableCell key={h} sx={{ color: T.textSecondary, fontSize: '.75rem', fontWeight: 600 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {SECURITY_GROUPS.map(sg => (
                <TableRow key={sg.id} hover sx={{ '&:hover': { bgcolor: T.surfaceHover } }}>
                  <TableCell sx={{ color: T.textSecondary, fontFamily: 'monospace', fontSize: '.8rem' }}>{sg.id}</TableCell>
                  <TableCell sx={{ color: T.textPrimary, fontWeight: 600 }}>{sg.name}</TableCell>
                  <TableCell sx={{ color: T.textSecondary, fontFamily: 'monospace', fontSize: '.8rem' }}>{sg.vpcId}</TableCell>
                  <TableCell sx={{ color: T.textSecondary, fontSize: '.8rem' }}>{sg.description}</TableCell>
                  <TableCell sx={{ color: T.textPrimary }}>{sg.inboundRules}</TableCell>
                  <TableCell sx={{ color: T.textPrimary }}>{sg.outboundRules}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {sg.attachedTo.slice(0, 2).map(id => (
                        <Chip key={id} label={id} size="small" sx={{ bgcolor: T.surfaceSubtle, color: T.textSecondary, fontSize: '.65rem' }} />
                      ))}
                      {sg.attachedTo.length > 2 && <Chip label={`+${sg.attachedTo.length - 2}`} size="small" sx={{ bgcolor: T.surfaceSubtle, color: T.textSecondary, fontSize: '.65rem' }} />}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <IconButton size="small" sx={{ color: T.textSecondary }}><EditIcon fontSize="small" /></IconButton>
                    <IconButton size="small" sx={{ color: S.danger }}><DeleteIcon fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {tab === 2 && (
          <Box sx={{ p: 3 }}>
            {[
              { time: '14:32:01', src: '203.0.113.42', dst: '10.0.1.100:443', action: 'ALLOW', proto: 'TCP', bytes: '12.4 KB' },
              { time: '14:32:00', src: '198.51.100.7', dst: '10.0.1.100:22', action: 'DENY', proto: 'TCP', bytes: '0.6 KB' },
              { time: '14:31:58', src: '10.10.0.15', dst: '10.10.1.5:5432', action: 'ALLOW', proto: 'TCP', bytes: '8.2 KB' },
              { time: '14:31:55', src: '45.33.32.156', dst: '10.0.1.100:80', action: 'ALLOW', proto: 'TCP', bytes: '2.1 KB' },
              { time: '14:31:50', src: '104.21.44.99', dst: '10.0.1.100:443', action: 'ALLOW', proto: 'TCP', bytes: '35.7 KB' },
              { time: '14:31:48', src: '185.220.101.4', dst: '10.0.1.100:443', action: 'DENY', proto: 'TCP', bytes: '1.2 KB' },
            ].map((log, i) => (
              <Box key={i} sx={{ display: 'flex', gap: 2, py: 1, borderBottom: `1px solid ${T.border}`, alignItems: 'center' }}>
                <Typography variant="caption" sx={{ color: T.textSecondary, fontFamily: 'monospace', minWidth: 70 }}>{log.time}</Typography>
                <Chip label={log.action} size="small"
                  sx={{ bgcolor: log.action === 'ALLOW' ? `${S.success}22` : `${S.danger}22`,
                    color: log.action === 'ALLOW' ? S.success : S.danger, fontSize: '.65rem', fontWeight: 700, minWidth: 52 }} />
                <Typography variant="caption" sx={{ color: T.textPrimary, fontFamily: 'monospace' }}>{log.src}</Typography>
                <Typography variant="caption" sx={{ color: T.textSecondary }}>→</Typography>
                <Typography variant="caption" sx={{ color: T.textPrimary, fontFamily: 'monospace' }}>{log.dst}</Typography>
                <Chip label={log.proto} size="small" sx={{ bgcolor: T.surfaceSubtle, color: T.textSecondary, fontSize: '.65rem' }} />
                <Typography variant="caption" sx={{ color: T.textSecondary, ml: 'auto' }}>{log.bytes}</Typography>
              </Box>
            ))}
          </Box>
        )}
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: T.textPrimary }}>Add Firewall Rule</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '12px !important' }}>
          <TextField label="Rule Name" fullWidth size="small" />
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <FormControl size="small" fullWidth>
                <InputLabel>Direction</InputLabel>
                <Select label="Direction" defaultValue="inbound">
                  <MenuItem value="inbound">Inbound</MenuItem>
                  <MenuItem value="outbound">Outbound</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl size="small" fullWidth>
                <InputLabel>Action</InputLabel>
                <Select label="Action" defaultValue="allow">
                  <MenuItem value="allow">Allow</MenuItem>
                  <MenuItem value="deny">Deny</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          <Grid container spacing={2}>
            <Grid item xs={4}>
              <FormControl size="small" fullWidth>
                <InputLabel>Protocol</InputLabel>
                <Select label="Protocol" defaultValue="TCP">
                  {['TCP','UDP','ICMP','ALL'].map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={4}><TextField label="Port / Range" fullWidth size="small" placeholder="443" /></Grid>
            <Grid item xs={4}><TextField label="Priority" type="number" fullWidth size="small" defaultValue={100} /></Grid>
          </Grid>
          <TextField label="Source / Destination CIDR" fullWidth size="small" placeholder="0.0.0.0/0" />
          <TextField label="Description" fullWidth size="small" />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)} sx={{ color: T.textSecondary }}>Cancel</Button>
          <Button variant="contained" onClick={() => setOpen(false)}
            sx={{ bgcolor: T.brandPrimary, '&:hover': { bgcolor: T.brandPrimaryHover } }}>Add Rule</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
