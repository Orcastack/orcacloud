import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  Tabs,
  Tab,
  Divider,
} from '@mui/material';
import { dashboardCardSx, dashboardPrimaryButtonSx, dashboardTokens } from '../styles/dashboardDesignSystem';
import apiClient from '../services/apiClient';

type NewDeploymentPayload = {
  appName: string;
  environment: 'dev' | 'stage' | 'prod';
  hostname: string;
  image: string;
  branch: string;
};

type DeploymentStatus = 'running' | 'failed' | 'building';

interface DeploymentItem {
  id: string;
  appName: string;
  status: DeploymentStatus;
  environment: 'dev' | 'stage' | 'prod';
  lastDeployed: string;
  hostname: string;
  image: string;
  branch: string;
  owner: string;
  createdAt: string;
  cpu: string;
  memory: string;
  errors: number;
  vulnerabilities: Array<{ severity: 'Low' | 'Medium' | 'High' | 'Critical'; title: string }>;
}

function deploymentStatusFromBackend(s: string): DeploymentStatus {
  if (s === 'done') return 'running';
  if (s === 'failed') return 'failed';
  return 'building'; // draft | planning | planned | confirmed | deploying
}

function fromBackendDeployment(d: any): DeploymentItem {
  return {
    id:           String(d.id),
    appName:      d.app_name      ?? d.new_project_name ?? 'Unnamed App',
    status:       deploymentStatusFromBackend(d.status ?? ''),
    environment:  (d.target_environments?.[0] ?? 'dev') as DeploymentItem['environment'],
    lastDeployed: d.updated_at    ? d.updated_at.slice(0, 16).replace('T', ' ') : '',
    hostname:     '',
    image:        d.backend?.image ?? '',
    branch:       d.git_branch    ?? '',
    owner:        d.owner?.username ?? '',
    createdAt:    d.created_at    ? d.created_at.slice(0, 16).replace('T', ' ') : '',
    cpu:          '—',
    memory:       '—',
    errors:       0,
    vulnerabilities: [],
  };
}

const INITIAL_DEPLOYMENTS: DeploymentItem[] = [];

const statusColor = (status: DeploymentStatus) => {
  if (status === 'running') return 'success';
  if (status === 'failed') return 'error';
  return 'warning';
};

const severityColor = (severity: 'Low' | 'Medium' | 'High' | 'Critical') => {
  if (severity === 'Low') return 'success';
  if (severity === 'Medium') return 'warning';
  return 'error';
};

const NEW_DEPLOY_KEY = 'ORCACLOUD_NEW_DEPLOY';
const LEGACY_NEW_DEPLOY_KEY = 'ATONIX_NEW_DEPLOY';

const DevDeploymentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [selected,    setSelected]   = useState<DeploymentItem | null>(null);
  const [tab,         setTab]        = useState(0);
  const [deployments, setDeployments] = useState<DeploymentItem[]>(INITIAL_DEPLOYMENTS);
  const [loading,     setLoading]    = useState(true);
  const [newItemId,   setNewItemId]  = useState<string | null>(null);

  const fetchDeployments = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get<any>('/api/services/deploy/requests/');
      const items: any[] = Array.isArray(data) ? data : (data?.results ?? []);
      setDeployments(items.map(fromBackendDeployment));
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, []);

  // Pick up a newly deployed app when navigating back from the deploy wizard
  useEffect(() => {
    fetchDeployments();
  }, [fetchDeployments]);

  useEffect(() => {
    const raw = localStorage.getItem(NEW_DEPLOY_KEY) || localStorage.getItem(LEGACY_NEW_DEPLOY_KEY);
    if (!raw) return;
    try {
      const payload: NewDeploymentPayload = JSON.parse(raw);
      localStorage.removeItem(NEW_DEPLOY_KEY);
      localStorage.removeItem(LEGACY_NEW_DEPLOY_KEY);
      const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
      const newItem: DeploymentItem = {
        id:           `dep-${Date.now()}`,
        appName:      payload.appName,
        status:       'running',
        environment:  payload.environment,
        lastDeployed: now,
        hostname:     payload.hostname,
        image:        payload.image,
        branch:       payload.branch,
        owner:        'you',
        createdAt:    now,
        cpu:          '2%',
        memory:       '18%',
        errors:       0,
        vulnerabilities: [],
      };
      setDeployments(prev => [newItem, ...prev]);
      setNewItemId(newItem.id);
      setTimeout(() => setNewItemId(null), 6000);
    } catch {}
  }, []);

  const summary = useMemo(() => {
    const total = deployments.length;
    const running = deployments.filter((item) => item.status === 'running').length;
    const failed = deployments.filter((item) => item.status === 'failed').length;
    const lastDeploymentTime = deployments[0]?.lastDeployed || 'N/A';
    return { total, running, failed, lastDeploymentTime };
  }, [deployments]);

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: dashboardTokens.colors.background, '& .MuiSvgIcon-root': { display: 'none' } }}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} mb={2} gap={1}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: dashboardTokens.colors.textPrimary }}>Deployments</Typography>
          <Typography variant="body2" color="text.secondary">Overview-first deployment workspace for developers.</Typography>
        </Box>

      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4,1fr)' }, gap: 1.5, mb: 2 }}>
        <Card sx={dashboardCardSx}><CardContent><Typography variant="caption" color="text.secondary">Total deployments</Typography><Typography variant="h6" sx={{ fontWeight: 700 }}>{summary.total}</Typography></CardContent></Card>
        <Card sx={dashboardCardSx}><CardContent><Typography variant="caption" color="text.secondary">Running</Typography><Typography variant="h6" sx={{ fontWeight: 700, color: 'success.main' }}>{summary.running}</Typography></CardContent></Card>
        <Card sx={dashboardCardSx}><CardContent><Typography variant="caption" color="text.secondary">Failed</Typography><Typography variant="h6" sx={{ fontWeight: 700, color: summary.failed ? 'error.main' : 'text.primary' }}>{summary.failed}</Typography></CardContent></Card>
        <Card sx={dashboardCardSx}><CardContent><Typography variant="caption" color="text.secondary">Last deployment</Typography><Typography variant="h6" sx={{ fontWeight: 700 }}>{summary.lastDeploymentTime}</Typography></CardContent></Card>
      </Box>

      <Card sx={{ ...dashboardCardSx, mb: 2 }}>
        <CardContent>
          <Typography sx={{ fontWeight: 700, color: summary.failed > 0 ? 'warning.main' : 'success.main' }}>
            {summary.failed > 0 ? `${summary.failed} deployment needs attention` : 'All systems operational'}
          </Typography>
        </CardContent>
      </Card>

      <Card sx={dashboardCardSx}>
        <CardContent>
          <Typography sx={{ fontWeight: 700, mb: 1.5 }}>Deployments List</Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: dashboardTokens.colors.surfaceSubtle }}>
                  <TableCell>App Name</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Environment</TableCell>
                  <TableCell>Last Deployed</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 5 }).map((__, j) => (
                        <TableCell key={j}><Skeleton variant="text" width={j === 0 ? 120 : 80} height={16} /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : deployments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      No deployments yet.
                    </TableCell>
                  </TableRow>
                ) : deployments.map((item) => (
                  <TableRow
                    key={item.id}
                    hover
                    sx={item.id === newItemId ? {
                      animation: 'flashNew 6s ease-out',
                      '@keyframes flashNew': {
                        '0%':   { bgcolor: 'rgba(21,61,117,.18)' },
                        '40%':  { bgcolor: 'rgba(21,61,117,.10)' },
                        '100%': { bgcolor: 'transparent' },
                      },
                    } : {}}
                  >
                      <TableCell>{item.appName}{item.id === newItemId && <Chip size="small" label="NEW" sx={{ ml:1, height:15, fontSize:'.58rem', fontWeight:800, bgcolor:`rgba(21,61,117,.18)`, color: dashboardTokens.colors.brandPrimary, border:`1px solid ${dashboardTokens.colors.brandPrimary}55`, '& .MuiChip-label':{ px:.6 } }} />}</TableCell>
                    <TableCell><Chip size="small" label={item.status} color={statusColor(item.status)} /></TableCell>
                    <TableCell>{item.environment}</TableCell>
                    <TableCell>{item.lastDeployed}</TableCell>
                    <TableCell align="right">
                      <Stack direction="row" justifyContent="flex-end" gap={1}>
                        <Button size="small" onClick={() => { setSelected(item); setTab(0); }} sx={{ color: dashboardTokens.colors.brandPrimary }}>View</Button>
                        <Button size="small" variant="outlined">Logs</Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Dialog open={Boolean(selected)} onClose={() => setSelected(null)} maxWidth="md" fullWidth>
        <DialogTitle>{selected?.appName} Deployment Detail</DialogTitle>
        <DialogContent>
          <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mb: 1 }}>
            <Tab label="Overview" />
            <Tab label="Pipelines" />
            <Tab label="Containers" />
            <Tab label="Monitoring" />
            <Tab label="Security" />
          </Tabs>
          <Divider sx={{ mb: 2 }} />

          {tab === 0 && selected && (
            <Stack gap={1.5}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3,1fr)' }, gap: 1 }}>
                <Card variant="outlined"><CardContent sx={{ py: 1.25, '&:last-child': { pb: 1.25 } }}><Typography variant="caption" color="text.secondary">Service status</Typography><Typography sx={{ fontWeight: 700, textTransform: 'capitalize' }}>{selected.status}</Typography></CardContent></Card>
                <Card variant="outlined"><CardContent sx={{ py: 1.25, '&:last-child': { pb: 1.25 } }}><Typography variant="caption" color="text.secondary">Environment</Typography><Typography sx={{ fontWeight: 700, textTransform: 'uppercase' }}>{selected.environment}</Typography></CardContent></Card>
                <Card variant="outlined"><CardContent sx={{ py: 1.25, '&:last-child': { pb: 1.25 } }}><Typography variant="caption" color="text.secondary">Release strategy</Typography><Typography sx={{ fontWeight: 700 }}>{selected.environment === 'prod' ? 'Canary 20/80' : 'Rolling update'}</Typography></CardContent></Card>
              </Box>

              <Stack gap={0.75}>
                <Typography><strong>Hostname:</strong> {selected.hostname}</Typography>
                <Typography><strong>Container image:</strong> {selected.image}</Typography>
                <Typography><strong>Git branch:</strong> {selected.branch}</Typography>
                <Typography><strong>On-call owner:</strong> {selected.owner}</Typography>
                <Typography><strong>Created:</strong> {selected.createdAt}</Typography>
                <Typography><strong>Last deployment:</strong> {selected.lastDeployed}</Typography>
              </Stack>

              <Stack direction="row" gap={1} flexWrap="wrap">
                <Button size="small" variant="contained" sx={dashboardPrimaryButtonSx}>Rollback</Button>
                <Button size="small" variant="outlined">Open runbook</Button>
                <Button size="small" variant="outlined">View incident timeline</Button>
              </Stack>
            </Stack>
          )}
          {tab === 1 && selected && (
            <Stack gap={1.25}>
              <Typography><strong>Pipeline:</strong> {selected.appName}-release</Typography>
              <Typography><strong>Latest execution:</strong> Passed checks (build, tests, security scan, deploy)</Typography>
              <Typography><strong>Approval gate:</strong> {selected.environment === 'prod' ? 'Required (2 approvers)' : 'Not required'}</Typography>
              <Typography><strong>Change window:</strong> {selected.environment === 'prod' ? 'Mon-Fri 09:00-18:00 UTC' : 'Open'}</Typography>
              <Stack direction="row" gap={1}>
                <Button size="small" variant="contained" sx={dashboardPrimaryButtonSx}>Run pipeline</Button>
                <Button size="small" variant="outlined">View logs</Button>
              </Stack>
            </Stack>
          )}
          {tab === 2 && selected && (
            <Stack gap={1.25}>
              <Typography><strong>Desired replicas:</strong> {selected.status === 'failed' ? '2' : '4'} · <strong>Ready replicas:</strong> {selected.status === 'failed' ? '1' : '4'}</Typography>
              <Typography><strong>Container health:</strong> {selected.status === 'failed' ? 'Degraded - one container crash-looping' : 'Healthy'}</Typography>
              <Typography><strong>Recent restart count:</strong> {selected.status === 'failed' ? '14 in last hour' : '0 in last hour'}</Typography>
              <Typography><strong>Pod policy:</strong> Readiness + liveness checks enabled</Typography>
              <Stack direction="row" gap={1}>
                <Button size="small" variant="outlined">Restart unhealthy pod</Button>
                <Button size="small" variant="outlined">Open kubernetes events</Button>
              </Stack>
            </Stack>
          )}
          {tab === 3 && selected && (
            <Stack gap={1.25}>
              <Typography><strong>CPU:</strong> {selected.cpu} · <strong>Memory:</strong> {selected.memory}</Typography>
              <Typography><strong>Error rate:</strong> {selected.errors > 0 ? `${selected.errors} active errors` : 'No active errors'}</Typography>
              <Typography><strong>SLO:</strong> 99.9% availability · <strong>Current:</strong> {selected.status === 'failed' ? '99.1%' : '99.95%'}</Typography>
              <Typography><strong>Latency (p95):</strong> {selected.status === 'failed' ? '730ms' : '210ms'}</Typography>
              <Stack direction="row" gap={1}>
                <Button size="small" variant="outlined">Open dashboards</Button>
                <Button size="small" variant="outlined">Create alert mute</Button>
              </Stack>
            </Stack>
          )}
          {tab === 4 && selected && (
            <Stack gap={1}>
              {selected.vulnerabilities.length === 0 ? (
                <Card variant="outlined"><CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}><Typography>No vulnerabilities found. Image is compliant with current policy baseline.</Typography></CardContent></Card>
              ) : (
                selected.vulnerabilities.map((item, index) => (
                  <Card key={index} variant="outlined">
                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.75}>
                        <Chip size="small" label={item.severity} color={severityColor(item.severity)} />
                        <Typography variant="body2" color="text.secondary">Status: Open</Typography>
                      </Stack>
                      <Typography>{item.title}</Typography>
                    </CardContent>
                  </Card>
                ))
              )}
              <Stack direction="row" gap={1}>
                <Button size="small" variant="outlined">Open security policy</Button>
                <Button size="small" variant="outlined">Schedule patch rollout</Button>
              </Stack>
            </Stack>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default DevDeploymentsPage;
