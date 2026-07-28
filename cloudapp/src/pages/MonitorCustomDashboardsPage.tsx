import React, { useState } from 'react';
import {
  Box, Typography, Paper, Grid, Button, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Select, MenuItem, FormControl,
  InputLabel, IconButton, Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DashboardIcon from '@mui/icons-material/Dashboard';
import BarChartIcon from '@mui/icons-material/BarChart';
import TimelineIcon from '@mui/icons-material/Timeline';
import BoltIcon from '@mui/icons-material/Bolt';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { dashboardTokens, dashboardSemanticColors } from '../styles/dashboardDesignSystem';

const T = dashboardTokens.colors;
const S = dashboardSemanticColors;

interface CustomDashboard {
  id: string; name: string; owner: string; team: string; widgets: number;
  lastUpdated: string; scope: 'personal' | 'team' | 'org'; tags: string[];
}

const PREBUILT = [
  { name: 'Compute Overview', desc: 'CPU, RAM, disk and instance health across all regions', icon: <BoltIcon />, color: T.brandPrimary, widgets: 8 },
  { name: 'Storage Performance', desc: 'IOPS, throughput, latency and capacity for all volumes', icon: <BarChartIcon />, color: S.success, widgets: 6 },
  { name: 'Network Traffic', desc: 'Ingress/egress, packet loss, latency heatmap', icon: <TimelineIcon />, color: S.purple, widgets: 7 },
  { name: 'Kubernetes Health', desc: 'Pod status, node pressure, deployment rollout status', icon: <DashboardIcon />, color: S.warning, widgets: 10 },
  { name: 'Database Metrics', desc: 'Query rate, slow queries, replication lag', icon: <BarChartIcon />, color: '#60A5FA', widgets: 6 },
  { name: 'SLO Overview', desc: 'Error budgets, burn rates, uptime across all services', icon: <TimelineIcon />, color: S.danger, widgets: 5 },
];

const CUSTOM: CustomDashboard[] = [
  { id: 'db-001', name: 'Platform Team: Infra Health', owner: 'Sarah Chen', team: 'Platform Engineering', widgets: 14, lastUpdated: '2026-02-26', scope: 'team', tags: ['infra', 'k8s'] },
  { id: 'db-002', name: 'ML Pipeline Monitor', owner: 'Marcus Webb', team: 'Data Engineering', widgets: 9, lastUpdated: '2026-02-27', scope: 'team', tags: ['ml', 'gpu'] },
  { id: 'db-003', name: 'Executive SLA Summary', owner: 'Admin', team: 'Leadership', widgets: 5, lastUpdated: '2026-02-25', scope: 'org', tags: ['sla', 'exec'] },
  { id: 'db-004', name: 'My API Latency', owner: 'James Liu', team: 'Product Engineering', widgets: 4, lastUpdated: '2026-02-27', scope: 'personal', tags: ['api'] },
  { id: 'db-005', name: 'EU Region Overview', owner: 'Admin EU', team: 'EU Infrastructure', widgets: 7, lastUpdated: '2026-02-24', scope: 'team', tags: ['eu', 'infra'] },
];

const scopeColor = (s: CustomDashboard['scope']) =>
  s === 'org' ? T.brandPrimary : s === 'team' ? S.success : T.textSecondary;

export default function MonitorCustomDashboardsPage() {
  const [open, setOpen] = useState(false);

  return (
    <Box sx={{ p: 3, bgcolor: T.background, minHeight: '100vh', fontFamily: dashboardTokens.typography.fontFamily }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ color: T.textPrimary, fontWeight: 700 }}>Custom Dashboards</Typography>
          <Typography variant="body2" sx={{ color: T.textSecondary, mt: 0.3 }}>Prebuilt and custom dashboards per project, team, and service</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}
          sx={{ bgcolor: T.brandPrimary, '&:hover': { bgcolor: T.brandPrimaryHover } }}>
          New Dashboard
        </Button>
      </Box>

      {/* Prebuilt Dashboards */}
      <Typography variant="subtitle1" sx={{ color: T.textPrimary, fontWeight: 700, mb: 1.5 }}>Prebuilt Dashboards</Typography>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {PREBUILT.map(d => (
          <Grid item xs={12} sm={6} md={4} key={d.name}>
            <Paper sx={{ p: 2.5, borderRadius: 2, border: `1px solid ${T.border}`, bgcolor: T.surface,
              cursor: 'pointer', transition: 'border-color 0.15s', '&:hover': { borderColor: T.brandPrimary } }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
                <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: `${d.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: d.color }}>
                  {d.icon}
                </Box>
                <Chip label="Prebuilt" size="small" sx={{ bgcolor: T.surfaceSubtle, color: T.textSecondary, fontSize: '.65rem' }} />
              </Box>
              <Typography variant="body1" sx={{ color: T.textPrimary, fontWeight: 700, mb: 0.5 }}>{d.name}</Typography>
              <Typography variant="caption" sx={{ color: T.textSecondary }}>{d.desc}</Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                <Typography variant="caption" sx={{ color: T.textSecondary }}>{d.widgets} widgets</Typography>
                <Button size="small" endIcon={<OpenInNewIcon sx={{ fontSize: '.8rem !important' }} />}
                  sx={{ color: T.brandPrimary, fontSize: '.75rem', py: 0.3 }}>Open</Button>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Custom Dashboards */}
      <Typography variant="subtitle1" sx={{ color: T.textPrimary, fontWeight: 700, mb: 1.5 }}>Custom Dashboards</Typography>
      <Grid container spacing={2}>
        {CUSTOM.map(d => (
          <Grid item xs={12} sm={6} md={4} key={d.id}>
            <Paper sx={{ p: 2.5, borderRadius: 2, border: `1px solid ${T.border}`, bgcolor: T.surface,
              cursor: 'pointer', transition: 'border-color 0.15s', '&:hover': { borderColor: T.brandPrimary } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Chip label={d.scope} size="small"
                  sx={{ bgcolor: `${scopeColor(d.scope)}22`, color: scopeColor(d.scope), fontSize: '.7rem' }} />
                <Box>
                  <Tooltip title="Edit"><IconButton size="small" sx={{ color: T.textSecondary }}><EditIcon sx={{ fontSize: '.9rem' }} /></IconButton></Tooltip>
                  <Tooltip title="Delete"><IconButton size="small" sx={{ color: S.danger }}><DeleteIcon sx={{ fontSize: '.9rem' }} /></IconButton></Tooltip>
                </Box>
              </Box>
              <Typography variant="body1" sx={{ color: T.textPrimary, fontWeight: 700, mb: 0.5 }}>{d.name}</Typography>
              <Typography variant="caption" sx={{ color: T.textSecondary, display: 'block' }}>{d.owner} · {d.team}</Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 1 }}>
                {d.tags.map(tag => (
                  <Chip key={tag} label={`#${tag}`} size="small" sx={{ bgcolor: T.surfaceSubtle, color: T.textSecondary, fontSize: '.65rem' }} />
                ))}
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1.5 }}>
                <Typography variant="caption" sx={{ color: T.textSecondary }}>{d.widgets} widgets · updated {d.lastUpdated}</Typography>
                <Button size="small" endIcon={<OpenInNewIcon sx={{ fontSize: '.8rem !important' }} />}
                  sx={{ color: T.brandPrimary, fontSize: '.75rem', py: 0.3 }}>Open</Button>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: T.textPrimary }}>Create Dashboard</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '12px !important' }}>
          <TextField label="Dashboard Name" fullWidth size="small" />
          <FormControl size="small" fullWidth>
            <InputLabel>Scope</InputLabel>
            <Select label="Scope" defaultValue="personal">
              <MenuItem value="personal">Personal</MenuItem>
              <MenuItem value="team">Team</MenuItem>
              <MenuItem value="org">Organization</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" fullWidth>
            <InputLabel>Team</InputLabel>
            <Select label="Team" defaultValue="">
              {['Platform Engineering', 'Data Engineering', 'Security & Compliance', 'Product Engineering'].map(t => (
                <MenuItem key={t} value={t}>{t}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField label="Tags (comma-separated)" fullWidth size="small" placeholder="infra, k8s, production" />
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
