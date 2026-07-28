import React, { useState } from 'react';
import {
  Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody,
  Chip, Button, LinearProgress, Grid, Tabs, Tab, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Select, MenuItem, FormControl,
  InputLabel, IconButton, Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import { dashboardTokens, dashboardSemanticColors } from '../styles/dashboardDesignSystem';

const T = dashboardTokens.colors;
const S = dashboardSemanticColors;

interface ASG {
  id: string; name: string; minSize: number; maxSize: number; desired: number;
  current: number; status: 'active' | 'suspended' | 'updating';
  launchTemplate: string; region: string; healthyInstances: number;
  cooldown: number; scalingPolicy: string;
}

interface ScalingPolicy {
  id: string; asgName: string; type: 'target-tracking' | 'step' | 'simple';
  metric: string; target: number; status: 'enabled' | 'disabled';
}

const ASGS: ASG[] = [
  { id: 'asg-1', name: 'web-frontend-asg', minSize: 2, maxSize: 20, desired: 6, current: 6, status: 'active', launchTemplate: 'lt-web-v3', region: 'us-east-1', healthyInstances: 6, cooldown: 300, scalingPolicy: 'target-tracking' },
  { id: 'asg-2', name: 'api-backend-asg', minSize: 3, maxSize: 30, desired: 8, current: 7, status: 'active', launchTemplate: 'lt-api-v2', region: 'us-east-1', healthyInstances: 7, cooldown: 300, scalingPolicy: 'step' },
  { id: 'asg-3', name: 'worker-pool-asg', minSize: 1, maxSize: 50, desired: 12, current: 12, status: 'active', launchTemplate: 'lt-worker-v1', region: 'eu-west-1', healthyInstances: 11, cooldown: 180, scalingPolicy: 'simple' },
  { id: 'asg-4', name: 'ml-inference-asg', minSize: 0, maxSize: 10, desired: 3, current: 3, status: 'suspended', launchTemplate: 'lt-gpu-v1', region: 'us-west-2', healthyInstances: 3, cooldown: 600, scalingPolicy: 'target-tracking' },
];

const POLICIES: ScalingPolicy[] = [
  { id: 'sp-1', asgName: 'web-frontend-asg', type: 'target-tracking', metric: 'CPU Utilization', target: 65, status: 'enabled' },
  { id: 'sp-2', asgName: 'api-backend-asg', type: 'step', metric: 'Request Count', target: 1000, status: 'enabled' },
  { id: 'sp-3', asgName: 'worker-pool-asg', type: 'simple', metric: 'Queue Depth', target: 100, status: 'enabled' },
  { id: 'sp-4', asgName: 'ml-inference-asg', type: 'target-tracking', metric: 'GPU Utilization', target: 75, status: 'disabled' },
];

const statusColor = (s: ASG['status']) =>
  s === 'active' ? S.success : s === 'suspended' ? S.warning : '#60A5FA';

const CapacityBar = ({ desired, current, max }: { desired: number; current: number; max: number }) => {
  const pct = Math.round((current / max) * 100);
  return (
    <Box sx={{ minWidth: 120 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
        <Typography variant="caption" sx={{ color: T.textPrimary }}>{current}/{desired}</Typography>
        <Typography variant="caption" sx={{ color: T.textSecondary }}>max {max}</Typography>
      </Box>
      <LinearProgress variant="determinate" value={pct}
        sx={{ height: 6, borderRadius: 3,
          '& .MuiLinearProgress-bar': { bgcolor: pct > 80 ? S.warning : S.success } }} />
    </Box>
  );
};

const SummaryCard = ({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) => (
  <Paper sx={{ p: 2, borderRadius: 2, border: `1px solid ${T.border}`, bgcolor: T.surface }}>
    <Typography variant="caption" sx={{ color: T.textSecondary, textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</Typography>
    <Typography variant="h4" sx={{ color: color || T.textPrimary, fontWeight: 700, mt: 0.5 }}>{value}</Typography>
    {sub && <Typography variant="caption" sx={{ color: T.textSecondary }}>{sub}</Typography>}
  </Paper>
);

export default function AutoScalingPage() {
  const [tab, setTab] = useState(0);
  const [open, setOpen] = useState(false);

  const totalInstances = ASGS.reduce((a, g) => a + g.current, 0);
  const activeGroups = ASGS.filter(g => g.status === 'active').length;

  return (
    <Box sx={{ p: 3, bgcolor: T.background, minHeight: '100vh', fontFamily: dashboardTokens.typography.fontFamily }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ color: T.textPrimary, fontWeight: 700 }}>Auto Scaling</Typography>
          <Typography variant="body2" sx={{ color: T.textSecondary, mt: 0.3 }}>Manage auto-scaling groups and policies</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}
          sx={{ bgcolor: T.brandPrimary, '&:hover': { bgcolor: T.brandPrimaryHover } }}>
          Create Group
        </Button>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Total Groups', value: ASGS.length, sub: `${activeGroups} active` },
          { label: 'Running Instances', value: totalInstances, sub: 'across all groups', color: S.success },
          { label: 'Desired Total', value: ASGS.reduce((a, g) => a + g.desired, 0), sub: 'target capacity' },
          { label: 'Scaling Policies', value: POLICIES.filter(p => p.status === 'enabled').length, sub: `${POLICIES.length} total` },
        ].map(c => (
          <Grid item xs={6} sm={3} key={c.label}>
            <SummaryCard {...c} />
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ borderRadius: 2, border: `1px solid ${T.border}`, bgcolor: T.surface }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2, borderBottom: `1px solid ${T.border}` }}>
          <Tab label="Auto Scaling Groups" />
          <Tab label="Scaling Policies" />
          <Tab label="Activity History" />
        </Tabs>

        {tab === 0 && (
          <Table>
            <TableHead>
              <TableRow>
                {['Name', 'Status', 'Capacity (cur/desired/max)', 'Launch Template', 'Region', 'Health', 'Cooldown', 'Actions'].map(h => (
                  <TableCell key={h} sx={{ color: T.textSecondary, fontSize: '.75rem', fontWeight: 600 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {ASGS.map(g => (
                <TableRow key={g.id} hover sx={{ '&:hover': { bgcolor: T.surfaceHover } }}>
                  <TableCell sx={{ color: T.textPrimary, fontWeight: 600 }}>{g.name}</TableCell>
                  <TableCell>
                    <Chip label={g.status} size="small"
                      sx={{ bgcolor: `${statusColor(g.status)}22`, color: statusColor(g.status), fontWeight: 600, fontSize: '.7rem' }} />
                  </TableCell>
                  <TableCell><CapacityBar desired={g.desired} current={g.current} max={g.maxSize} /></TableCell>
                  <TableCell sx={{ color: T.textSecondary, fontFamily: 'monospace', fontSize: '.8rem' }}>{g.launchTemplate}</TableCell>
                  <TableCell sx={{ color: T.textSecondary }}>{g.region}</TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ color: g.healthyInstances === g.current ? S.success : S.warning }}>
                      {g.healthyInstances}/{g.current} healthy
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ color: T.textSecondary }}>{g.cooldown}s</TableCell>
                  <TableCell>
                    <Tooltip title={g.status === 'active' ? 'Suspend' : 'Resume'}>
                      <IconButton size="small" sx={{ color: T.textSecondary }}>
                        {g.status === 'active' ? <PauseIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit"><IconButton size="small" sx={{ color: T.textSecondary }}><EditIcon fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="Delete"><IconButton size="small" sx={{ color: S.danger }}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
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
                {['Group', 'Policy Type', 'Metric', 'Target', 'Status', 'Actions'].map(h => (
                  <TableCell key={h} sx={{ color: T.textSecondary, fontSize: '.75rem', fontWeight: 600 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {POLICIES.map(p => (
                <TableRow key={p.id} hover sx={{ '&:hover': { bgcolor: T.surfaceHover } }}>
                  <TableCell sx={{ color: T.textPrimary, fontWeight: 600 }}>{p.asgName}</TableCell>
                  <TableCell>
                    <Chip label={p.type} size="small"
                      sx={{ bgcolor: `${T.brandPrimary}22`, color: T.brandPrimary, fontSize: '.7rem' }} />
                  </TableCell>
                  <TableCell sx={{ color: T.textSecondary }}>{p.metric}</TableCell>
                  <TableCell sx={{ color: T.textPrimary, fontWeight: 600 }}>{p.target}</TableCell>
                  <TableCell>
                    <Chip label={p.status} size="small"
                      sx={{ bgcolor: p.status === 'enabled' ? `${S.success}22` : `${S.warning}22`,
                        color: p.status === 'enabled' ? S.success : S.warning, fontSize: '.7rem' }} />
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
              { time: '2 min ago', msg: 'web-frontend-asg scaled out +2 instances (cpu: 78%)', color: S.success },
              { time: '18 min ago', msg: 'api-backend-asg scale-in cooldown complete', color: T.textSecondary },
              { time: '1 hr ago', msg: 'worker-pool-asg desired capacity changed: 10 → 12', color: '#60A5FA' },
              { time: '3 hrs ago', msg: 'ml-inference-asg suspended by user admin@orcacloud.com', color: S.warning },
              { time: '6 hrs ago', msg: 'web-frontend-asg scaled in -1 instance (cpu: 22%)', color: T.textSecondary },
            ].map((e, i) => (
              <Box key={i} sx={{ display: 'flex', gap: 2, py: 1.5, borderBottom: `1px solid ${T.border}` }}>
                <Typography variant="caption" sx={{ color: T.textSecondary, minWidth: 90 }}>{e.time}</Typography>
                <Typography variant="body2" sx={{ color: e.color }}>{e.msg}</Typography>
              </Box>
            ))}
          </Box>
        )}
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: T.textPrimary }}>Create Auto Scaling Group</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '12px !important' }}>
          <TextField label="Group Name" fullWidth size="small" />
          <TextField label="Launch Template" fullWidth size="small" />
          <Grid container spacing={2}>
            <Grid item xs={4}><TextField label="Min Size" type="number" fullWidth size="small" defaultValue={1} /></Grid>
            <Grid item xs={4}><TextField label="Desired" type="number" fullWidth size="small" defaultValue={2} /></Grid>
            <Grid item xs={4}><TextField label="Max Size" type="number" fullWidth size="small" defaultValue={10} /></Grid>
          </Grid>
          <FormControl size="small" fullWidth>
            <InputLabel>Scaling Policy Type</InputLabel>
            <Select label="Scaling Policy Type" defaultValue="target-tracking">
              <MenuItem value="target-tracking">Target Tracking</MenuItem>
              <MenuItem value="step">Step Scaling</MenuItem>
              <MenuItem value="simple">Simple Scaling</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" fullWidth>
            <InputLabel>Region</InputLabel>
            <Select label="Region" defaultValue="us-east-1">
              {['us-east-1','us-west-2','eu-west-1','ap-southeast-1'].map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
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
