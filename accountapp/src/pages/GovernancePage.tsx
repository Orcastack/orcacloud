import React, { useState } from 'react';
import {
  Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody,
  Chip, Button, Grid, Tabs, Tab, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Select, MenuItem, FormControl, InputLabel,
  IconButton, LinearProgress, Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import BlockIcon from '@mui/icons-material/Block';
import { dashboardTokens, dashboardSemanticColors } from '../styles/dashboardDesignSystem';

const T = dashboardTokens.colors;
const S = dashboardSemanticColors;

const POLICIES = [
  { id: 'pol-001', name: 'Require resource tagging', scope: 'org-wide', enforcement: 'hard', resources: 'All', status: 'active', violations: 0 },
  { id: 'pol-002', name: 'No public S3 buckets', scope: 'production', enforcement: 'hard', resources: 'Cloud Storage', status: 'active', violations: 2 },
  { id: 'pol-003', name: 'MFA required for admin actions', scope: 'org-wide', enforcement: 'hard', resources: 'IAM', status: 'active', violations: 0 },
  { id: 'pol-004', name: 'Max VM size: 64 vCPU', scope: 'non-gpu', enforcement: 'soft', resources: 'Compute', status: 'active', violations: 1 },
  { id: 'pol-005', name: 'Encryption at rest required', scope: 'org-wide', enforcement: 'hard', resources: 'Storage', status: 'active', violations: 0 },
  { id: 'pol-006', name: 'Region allowlist: us/eu only', scope: 'org-wide', enforcement: 'hard', resources: 'All', status: 'active', violations: 0 },
];

const QUOTAS = [
  { resource: 'vCPUs', tenant: 'OrcaCloud HQ', used: 680, limit: 1000, unit: 'cores' },
  { resource: 'RAM', tenant: 'OrcaCloud HQ', used: 2.8, limit: 8, unit: 'TB' },
  { resource: 'Block Storage', tenant: 'OrcaCloud HQ', used: 41, limit: 100, unit: 'TB' },
  { resource: 'Object Storage', tenant: 'OrcaCloud HQ', used: 18.4, limit: 50, unit: 'TB' },
  { resource: 'Load Balancers', tenant: 'OrcaCloud HQ', used: 24, limit: 50, unit: 'units' },
  { resource: 'Public IPs', tenant: 'OrcaCloud HQ', used: 31, limit: 100, unit: 'IPs' },
  { resource: 'vCPUs', tenant: 'OrcaCloud EU', used: 88, limit: 200, unit: 'cores' },
  { resource: 'Object Storage', tenant: 'OrcaCloud EU', used: 6.2, limit: 20, unit: 'TB' },
];

const APPROVALS = [
  { id: 'appr-001', request: 'Increase vCPU quota to 1500', requester: 'Sarah Chen', tenant: 'OrcaCloud HQ', status: 'pending', submitted: '2026-02-26 14:30', urgency: 'high' },
  { id: 'appr-002', request: 'Create new Production VPC', requester: 'James Liu', tenant: 'OrcaCloud HQ', status: 'approved', submitted: '2026-02-25 10:00', urgency: 'normal' },
  { id: 'appr-003', request: 'Add APAC region (ap-northeast-1)', requester: 'Admin EU', tenant: 'OrcaCloud EU', status: 'pending', submitted: '2026-02-27 08:15', urgency: 'normal' },
  { id: 'appr-004', request: 'Deploy GPU cluster (8x H100)', requester: 'ML Team Lead', tenant: 'OrcaCloud HQ', status: 'rejected', submitted: '2026-02-24 09:00', urgency: 'high' },
];

const enforcementColor = (e: string) => e === 'hard' ? S.danger : S.warning;
const approvalColor = (s: string) => s === 'approved' ? S.success : s === 'rejected' ? S.danger : S.warning;

export default function GovernancePage() {
  const [tab, setTab] = useState(0);
  const [open, setOpen] = useState(false);

  return (
    <Box sx={{ p: 3, bgcolor: T.background, minHeight: '100vh', fontFamily: dashboardTokens.typography.fontFamily }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ color: T.textPrimary, fontWeight: 700 }}>Governance</Typography>
          <Typography variant="body2" sx={{ color: T.textSecondary, mt: 0.3 }}>Policies, quotas, approval workflows, and resource controls</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}
          sx={{ bgcolor: T.brandPrimary, '&:hover': { bgcolor: T.brandPrimaryHover } }}>
          New Policy
        </Button>
      </Box>

      {POLICIES.some(p => p.violations > 0) && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {POLICIES.filter(p => p.violations > 0).length} active policy violation(s) detected. Review required.
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Active Policies', value: POLICIES.filter(p => p.status === 'active').length },
          { label: 'Hard Enforcement', value: POLICIES.filter(p => p.enforcement === 'hard').length, color: S.danger },
          { label: 'Violations', value: POLICIES.reduce((a, p) => a + p.violations, 0), color: S.warning },
          { label: 'Pending Approvals', value: APPROVALS.filter(a => a.status === 'pending').length, color: S.warning },
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
          <Tab label="Policies" />
          <Tab label="Quotas & Limits" />
          <Tab label="Approval Workflows" />
          <Tab label="Resource Tagging" />
        </Tabs>

        {tab === 0 && (
          <Table>
            <TableHead>
              <TableRow>
                {['Policy Name', 'Scope', 'Enforcement', 'Applies To', 'Status', 'Violations', 'Actions'].map(h => (
                  <TableCell key={h} sx={{ color: T.textSecondary, fontSize: '.75rem', fontWeight: 600 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {POLICIES.map(p => (
                <TableRow key={p.id} hover sx={{ bgcolor: p.violations > 0 ? `${S.warning}08` : 'transparent', '&:hover': { bgcolor: T.surfaceHover } }}>
                  <TableCell sx={{ color: T.textPrimary, fontWeight: 600 }}>{p.name}</TableCell>
                  <TableCell>
                    <Chip label={p.scope} size="small" sx={{ bgcolor: T.surfaceSubtle, color: T.textSecondary, fontSize: '.7rem' }} />
                  </TableCell>
                  <TableCell>
                    <Chip label={p.enforcement} size="small"
                      sx={{ bgcolor: `${enforcementColor(p.enforcement)}22`, color: enforcementColor(p.enforcement), fontWeight: 700, fontSize: '.7rem' }} />
                  </TableCell>
                  <TableCell sx={{ color: T.textSecondary }}>{p.resources}</TableCell>
                  <TableCell>
                    <Chip label={p.status} size="small" sx={{ bgcolor: `${S.success}22`, color: S.success, fontSize: '.7rem' }} />
                  </TableCell>
                  <TableCell>
                    {p.violations > 0
                      ? <Chip label={`${p.violations} violation${p.violations > 1 ? 's' : ''}`} size="small" sx={{ bgcolor: `${S.danger}22`, color: S.danger, fontSize: '.7rem' }} />
                      : <Chip label="Clean" size="small" sx={{ bgcolor: `${S.success}22`, color: S.success, fontSize: '.7rem' }} />}
                  </TableCell>
                  <TableCell><IconButton size="small" sx={{ color: T.textSecondary }}><EditIcon fontSize="small" /></IconButton></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {tab === 1 && (
          <Box sx={{ p: 2 }}>
            {QUOTAS.map((q, i) => {
              const pct = Math.round((q.used / q.limit) * 100);
              return (
                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.5, borderBottom: `1px solid ${T.border}` }}>
                  <Box sx={{ minWidth: 180 }}>
                    <Typography variant="body2" sx={{ color: T.textPrimary, fontWeight: 600 }}>{q.resource}</Typography>
                    <Typography variant="caption" sx={{ color: T.textSecondary }}>{q.tenant}</Typography>
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                      <Typography variant="caption" sx={{ color: T.textSecondary }}>{q.used} {q.unit}</Typography>
                      <Typography variant="caption" sx={{ color: T.textSecondary }}>Limit: {q.limit} {q.unit} ({pct}%)</Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={pct} sx={{ height: 8, borderRadius: 4,
                      '& .MuiLinearProgress-bar': { bgcolor: pct > 85 ? S.danger : pct > 65 ? S.warning : S.success } }} />
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}

        {tab === 2 && (
          <Table>
            <TableHead>
              <TableRow>
                {['Request', 'Requester', 'Tenant', 'Urgency', 'Submitted', 'Status', 'Actions'].map(h => (
                  <TableCell key={h} sx={{ color: T.textSecondary, fontSize: '.75rem', fontWeight: 600 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {APPROVALS.map(a => (
                <TableRow key={a.id} hover sx={{ '&:hover': { bgcolor: T.surfaceHover } }}>
                  <TableCell sx={{ color: T.textPrimary, fontWeight: 600, maxWidth: 240 }}>{a.request}</TableCell>
                  <TableCell sx={{ color: T.textSecondary }}>{a.requester}</TableCell>
                  <TableCell sx={{ color: T.textSecondary }}>{a.tenant}</TableCell>
                  <TableCell>
                    <Chip label={a.urgency} size="small"
                      sx={{ bgcolor: a.urgency === 'high' ? `${S.danger}22` : T.surfaceSubtle,
                        color: a.urgency === 'high' ? S.danger : T.textSecondary, fontSize: '.7rem' }} />
                  </TableCell>
                  <TableCell sx={{ color: T.textSecondary, fontSize: '.78rem' }}>{a.submitted}</TableCell>
                  <TableCell>
                    <Chip label={a.status} size="small" icon={a.status === 'approved' ? <CheckCircleIcon sx={{ fontSize: '.85rem !important' }} /> : a.status === 'rejected' ? <BlockIcon sx={{ fontSize: '.85rem !important' }} /> : <PendingIcon sx={{ fontSize: '.85rem !important' }} />}
                      sx={{ bgcolor: `${approvalColor(a.status)}22`, color: approvalColor(a.status), fontSize: '.7rem' }} />
                  </TableCell>
                  <TableCell>
                    {a.status === 'pending' && (
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Button size="small" variant="outlined" sx={{ color: S.success, borderColor: `${S.success}44`, fontSize: '.72rem', py: 0.2 }}>Approve</Button>
                        <Button size="small" variant="outlined" sx={{ color: S.danger, borderColor: `${S.danger}44`, fontSize: '.72rem', py: 0.2 }}>Reject</Button>
                      </Box>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {tab === 3 && (
          <Box sx={{ p: 3 }}>
            <Typography variant="body2" sx={{ color: T.textSecondary, mb: 2 }}>Required tags enforced across all resources</Typography>
            <Grid container spacing={2}>
              {[
                { tag: 'project', required: true, values: 'Any string', compliant: '94%' },
                { tag: 'environment', required: true, values: 'production | staging | sandbox | dev', compliant: '98%' },
                { tag: 'team', required: true, values: 'Any string', compliant: '91%' },
                { tag: 'cost-center', required: false, values: 'CC-XXXX format', compliant: '76%' },
                { tag: 'owner', required: true, values: 'Email address', compliant: '88%' },
                { tag: 'data-classification', required: false, values: 'public | internal | confidential | restricted', compliant: '65%' },
              ].map((t, i) => (
                <Grid item xs={12} sm={6} key={i}>
                  <Paper sx={{ p: 2, bgcolor: T.surfaceSubtle, border: `1px solid ${T.border}`, borderRadius: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ color: T.textPrimary, fontWeight: 700, fontFamily: 'monospace' }}>{t.tag}</Typography>
                        {t.required && <Chip label="Required" size="small" sx={{ bgcolor: `${S.danger}22`, color: S.danger, fontSize: '.65rem' }} />}
                      </Box>
                      <Typography variant="body2" sx={{ color: parseInt(t.compliant) > 90 ? S.success : S.warning, fontWeight: 600 }}>{t.compliant}</Typography>
                    </Box>
                    <Typography variant="caption" sx={{ color: T.textSecondary }}>{t.values}</Typography>
                    <LinearProgress variant="determinate" value={parseInt(t.compliant)} sx={{ mt: 1, height: 4, borderRadius: 2,
                      '& .MuiLinearProgress-bar': { bgcolor: parseInt(t.compliant) > 90 ? S.success : S.warning } }} />
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: T.textPrimary }}>Create Policy</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '12px !important' }}>
          <TextField label="Policy Name" fullWidth size="small" />
          <TextField label="Description" fullWidth size="small" multiline rows={2} />
          <FormControl size="small" fullWidth>
            <InputLabel>Enforcement Level</InputLabel>
            <Select label="Enforcement Level" defaultValue="soft">
              <MenuItem value="hard">Hard (block non-compliant actions)</MenuItem>
              <MenuItem value="soft">Soft (warn only)</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" fullWidth>
            <InputLabel>Scope</InputLabel>
            <Select label="Scope" defaultValue="org-wide">
              <MenuItem value="org-wide">Org-wide</MenuItem>
              <MenuItem value="production">Production only</MenuItem>
              <MenuItem value="per-tenant">Per tenant</MenuItem>
            </Select>
          </FormControl>
          <TextField label="Applies To (resource types)" fullWidth size="small" placeholder="All, Compute, Storage..." />
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
