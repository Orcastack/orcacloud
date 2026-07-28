import React, { useState } from 'react';
import {
  Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody,
  Chip, Button, Grid, Tabs, Tab, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Select, MenuItem, FormControl, InputLabel,
  IconButton, LinearProgress, Avatar,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import BusinessIcon from '@mui/icons-material/Business';
import GroupsIcon from '@mui/icons-material/Groups';
import FolderIcon from '@mui/icons-material/FolderOpen';
import { dashboardTokens, dashboardSemanticColors } from '../styles/dashboardDesignSystem';

const T = dashboardTokens.colors;
const S = dashboardSemanticColors;

const TENANTS = [
  { id: 'tenant-001', name: 'OrcaCloud HQ', plan: 'Enterprise', teams: 12, projects: 34, users: 287, status: 'active', region: 'us-east-1', created: '2024-01-15', quota: { compute: 68, storage: 41, network: 22 } },
  { id: 'tenant-002', name: 'OrcaCloud EU', plan: 'Business', teams: 5, projects: 14, users: 89, status: 'active', region: 'eu-west-1', created: '2024-06-01', quota: { compute: 33, storage: 18, network: 9 } },
  { id: 'tenant-003', name: 'OrcaCloud APAC', plan: 'Business', teams: 4, projects: 9, users: 54, status: 'active', region: 'ap-southeast-1', created: '2025-02-10', quota: { compute: 15, storage: 8, network: 4 } },
  { id: 'tenant-004', name: 'Dev Sandbox Org', plan: 'Developer', teams: 2, projects: 5, users: 12, status: 'suspended', region: 'us-west-2', created: '2025-08-01', quota: { compute: 2, storage: 1, network: 1 } },
];

const PROJECTS = [
  { id: 'proj-001', name: 'Cloud Platform Core', tenant: 'OrcaCloud HQ', team: 'Platform Engineering', resources: 142, status: 'active', env: 'production' },
  { id: 'proj-002', name: 'Customer Portal', tenant: 'OrcaCloud HQ', team: 'Product Engineering', resources: 56, status: 'active', env: 'production' },
  { id: 'proj-003', name: 'Data Analytics Pipeline', tenant: 'OrcaCloud HQ', team: 'Data Engineering', resources: 78, status: 'active', env: 'production' },
  { id: 'proj-004', name: 'EU Compliance Stack', tenant: 'OrcaCloud EU', team: 'EU Infrastructure', resources: 31, status: 'active', env: 'production' },
  { id: 'proj-005', name: 'Mobile API Gateway', tenant: 'OrcaCloud HQ', team: 'Mobile Engineering', resources: 22, status: 'active', env: 'staging' },
  { id: 'proj-006', name: 'Alpha Product Feature', tenant: 'Dev Sandbox Org', team: 'Product Research', resources: 8, status: 'suspended', env: 'sandbox' },
];

const TEAMS = [
  { id: 'team-001', name: 'Platform Engineering', tenant: 'OrcaCloud HQ', members: 24, lead: 'Sarah Chen', projects: 4, role: 'Engineering' },
  { id: 'team-002', name: 'Data Engineering', tenant: 'OrcaCloud HQ', members: 18, lead: 'Marcus Webb', projects: 3, role: 'Engineering' },
  { id: 'team-003', name: 'Security & Compliance', tenant: 'OrcaCloud HQ', members: 9, lead: 'Priya Nair', projects: 2, role: 'Security' },
  { id: 'team-004', name: 'Product Engineering', tenant: 'OrcaCloud HQ', members: 31, lead: 'James Liu', projects: 5, role: 'Engineering' },
];

const statusColor = (s: string) => s === 'active' ? S.success : s === 'suspended' ? S.warning : S.danger;
const envColor = (e: string) => e === 'production' ? S.danger : e === 'staging' ? S.warning : T.textSecondary;

const QuotaCell = ({ pct }: { pct: number }) => (
  <Box sx={{ minWidth: 80 }}>
    <LinearProgress variant="determinate" value={pct} sx={{ height: 4, borderRadius: 2,
      '& .MuiLinearProgress-bar': { bgcolor: pct > 80 ? S.danger : pct > 60 ? S.warning : S.success } }} />
    <Typography variant="caption" sx={{ color: T.textSecondary }}>{pct}%</Typography>
  </Box>
);

export default function OrganizationPage() {
  const [tab, setTab] = useState(0);
  const [open, setOpen] = useState(false);

  return (
    <Box sx={{ p: 3, bgcolor: T.background, minHeight: '100vh', fontFamily: dashboardTokens.typography.fontFamily }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ color: T.textPrimary, fontWeight: 700 }}>Organization Management</Typography>
          <Typography variant="body2" sx={{ color: T.textSecondary, mt: 0.3 }}>Tenants, projects, teams, and resource isolation</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}
          sx={{ bgcolor: T.brandPrimary, '&:hover': { bgcolor: T.brandPrimaryHover } }}>
          New Tenant
        </Button>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Tenants', value: TENANTS.length, icon: <BusinessIcon sx={{ color: T.brandPrimary, fontSize: 28 }} /> },
          { label: 'Projects', value: PROJECTS.length, icon: <FolderIcon sx={{ color: S.success, fontSize: 28 }} /> },
          { label: 'Teams', value: TEAMS.length, icon: <GroupsIcon sx={{ color: S.purple, fontSize: 28 }} /> },
          { label: 'Total Users', value: TENANTS.reduce((a, t) => a + t.users, 0), icon: <GroupsIcon sx={{ color: S.warning, fontSize: 28 }} /> },
        ].map(c => (
          <Grid item xs={6} sm={3} key={c.label}>
            <Paper sx={{ p: 2, borderRadius: 2, border: `1px solid ${T.border}`, bgcolor: T.surface, display: 'flex', alignItems: 'center', gap: 2 }}>
              {c.icon}
              <Box>
                <Typography variant="caption" sx={{ color: T.textSecondary, textTransform: 'uppercase', letterSpacing: '.06em' }}>{c.label}</Typography>
                <Typography variant="h4" sx={{ color: T.textPrimary, fontWeight: 700 }}>{c.value}</Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ borderRadius: 2, border: `1px solid ${T.border}`, bgcolor: T.surface }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2, borderBottom: `1px solid ${T.border}` }}>
          <Tab label="Tenants" />
          <Tab label="Projects" />
          <Tab label="Teams" />
        </Tabs>

        {tab === 0 && (
          <Table>
            <TableHead>
              <TableRow>
                {['Tenant', 'Plan', 'Status', 'Region', 'Teams', 'Users', 'Projects', 'Compute Quota', 'Storage Quota', 'Actions'].map(h => (
                  <TableCell key={h} sx={{ color: T.textSecondary, fontSize: '.75rem', fontWeight: 600 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {TENANTS.map(t => (
                <TableRow key={t.id} hover sx={{ '&:hover': { bgcolor: T.surfaceHover } }}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ width: 28, height: 28, bgcolor: T.brandPrimary, fontSize: '.7rem' }}>{t.name[0]}</Avatar>
                      <Typography variant="body2" sx={{ color: T.textPrimary, fontWeight: 600 }}>{t.name}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell><Chip label={t.plan} size="small" sx={{ bgcolor: `${T.brandPrimary}22`, color: T.brandPrimary, fontSize: '.7rem' }} /></TableCell>
                  <TableCell><Chip label={t.status} size="small" sx={{ bgcolor: `${statusColor(t.status)}22`, color: statusColor(t.status), fontSize: '.7rem' }} /></TableCell>
                  <TableCell sx={{ color: T.textSecondary }}>{t.region}</TableCell>
                  <TableCell sx={{ color: T.textPrimary }}>{t.teams}</TableCell>
                  <TableCell sx={{ color: T.textPrimary }}>{t.users}</TableCell>
                  <TableCell sx={{ color: T.textPrimary }}>{t.projects}</TableCell>
                  <TableCell><QuotaCell pct={t.quota.compute} /></TableCell>
                  <TableCell><QuotaCell pct={t.quota.storage} /></TableCell>
                  <TableCell><IconButton size="small" sx={{ color: T.textSecondary }}><EditIcon fontSize="small" /></IconButton></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {tab === 1 && (
          <Table>
            <TableHead>
              <TableRow>
                {['Project', 'Tenant', 'Team', 'Resources', 'Environment', 'Status', 'Actions'].map(h => (
                  <TableCell key={h} sx={{ color: T.textSecondary, fontSize: '.75rem', fontWeight: 600 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {PROJECTS.map(p => (
                <TableRow key={p.id} hover sx={{ '&:hover': { bgcolor: T.surfaceHover } }}>
                  <TableCell sx={{ color: T.textPrimary, fontWeight: 600 }}>{p.name}</TableCell>
                  <TableCell sx={{ color: T.textSecondary }}>{p.tenant}</TableCell>
                  <TableCell sx={{ color: T.textSecondary }}>{p.team}</TableCell>
                  <TableCell sx={{ color: T.textPrimary }}>{p.resources}</TableCell>
                  <TableCell><Chip label={p.env} size="small" sx={{ bgcolor: `${envColor(p.env)}22`, color: envColor(p.env), fontSize: '.7rem' }} /></TableCell>
                  <TableCell><Chip label={p.status} size="small" sx={{ bgcolor: `${statusColor(p.status)}22`, color: statusColor(p.status), fontSize: '.7rem' }} /></TableCell>
                  <TableCell><IconButton size="small" sx={{ color: T.textSecondary }}><EditIcon fontSize="small" /></IconButton></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {tab === 2 && (
          <Table>
            <TableHead>
              <TableRow>
                {['Team', 'Tenant', 'Lead', 'Members', 'Projects', 'Role', 'Actions'].map(h => (
                  <TableCell key={h} sx={{ color: T.textSecondary, fontSize: '.75rem', fontWeight: 600 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {TEAMS.map(tm => (
                <TableRow key={tm.id} hover sx={{ '&:hover': { bgcolor: T.surfaceHover } }}>
                  <TableCell sx={{ color: T.textPrimary, fontWeight: 600 }}>{tm.name}</TableCell>
                  <TableCell sx={{ color: T.textSecondary }}>{tm.tenant}</TableCell>
                  <TableCell sx={{ color: T.textSecondary }}>{tm.lead}</TableCell>
                  <TableCell sx={{ color: T.textPrimary }}>{tm.members}</TableCell>
                  <TableCell sx={{ color: T.textPrimary }}>{tm.projects}</TableCell>
                  <TableCell><Chip label={tm.role} size="small" sx={{ bgcolor: `${S.purple}22`, color: S.purple, fontSize: '.7rem' }} /></TableCell>
                  <TableCell><IconButton size="small" sx={{ color: T.textSecondary }}><EditIcon fontSize="small" /></IconButton></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: T.textPrimary }}>Create Tenant</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '12px !important' }}>
          <TextField label="Organization Name" fullWidth size="small" />
          <FormControl size="small" fullWidth>
            <InputLabel>Plan</InputLabel>
            <Select label="Plan" defaultValue="business">
              <MenuItem value="developer">Developer</MenuItem>
              <MenuItem value="business">Business</MenuItem>
              <MenuItem value="enterprise">Enterprise</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" fullWidth>
            <InputLabel>Primary Region</InputLabel>
            <Select label="Primary Region" defaultValue="us-east-1">
              {['us-east-1','us-west-2','eu-west-1','ap-southeast-1'].map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField label="Admin Email" fullWidth size="small" />
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
