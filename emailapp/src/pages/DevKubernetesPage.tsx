import React, { useState, useEffect } from 'react';
import {
  Alert, Box, Button, Card, CardContent, Checkbox, Chip,
  CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, FormControlLabel, IconButton, InputLabel, MenuItem,
  Select, Snackbar, Stack, Switch, Tab, Table, TableBody, TableCell,
  TableHead, TableRow, Tabs, TextField, Tooltip, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloudQueueIcon from '@mui/icons-material/CloudQueue';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SettingsIcon from '@mui/icons-material/Settings';
import SyncIcon from '@mui/icons-material/Sync';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorIcon from '@mui/icons-material/Error';
import { useNavigate } from 'react-router-dom';
import { kubernetesApi, KubeConfig, KubeSyncRun } from '../services/kubernetesApi';
import {
  listClusters, createCluster, deleteCluster,
  KubernetesCluster, CreateClusterPayload,
  K8S_VERSIONS, CLUSTER_REGIONS, CLUSTER_ADDONS,
} from '../services/clustersApi';

const SyncStatusChip: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, any> = {
    success:  { color: 'success', icon: <CheckCircleIcon fontSize="small" /> },
    failed:   { color: 'error',   icon: <ErrorIcon fontSize="small" /> },
    syncing:  { color: 'info',    icon: <SyncIcon fontSize="small" /> },
    scanning: { color: 'info',    icon: <SyncIcon fontSize="small" /> },
    pending:  { color: 'warning', icon: <WarningAmberIcon fontSize="small" /> },
    partial:  { color: 'warning', icon: <WarningAmberIcon fontSize="small" /> },
    never:    { color: 'default', icon: null },
  };
  const cfg = map[status] ?? map.never;
  return <Chip size="small" label={status} color={cfg.color} icon={cfg.icon ?? undefined} />;
};

const StatCard: React.FC<{ label: string; value: string | number; color?: string }> = ({ label, value, color }) => (
  <Card variant="outlined" sx={{ bgcolor: 'background.paper' }}>
    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="h6" fontWeight={800} color={color}>{value}</Typography>
    </CardContent>
  </Card>
);

// ─── Create Cluster Dialog ────────────────────────────────────────────────────

const CLUSTER_STATUS_CFG: Record<string, { color: string; label: string }> = {
  running:      { color: 'success', label: 'Running'      },
  provisioning: { color: 'info',    label: 'Provisioning' },
  pending:      { color: 'warning', label: 'Pending'      },
  stopped:      { color: 'default', label: 'Stopped'      },
  error:        { color: 'error',   label: 'Error'        },
  deleting:     { color: 'error',   label: 'Deleting'     },
};

interface CreateClusterDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const CreateClusterDialog: React.FC<CreateClusterDialogProps> = ({ open, onClose, onCreated }) => {
  const blank = (): CreateClusterPayload => ({
    name: '',
    description: '',
    kubernetes_version: '1.29.0',
    node_count: 3,
    region: 'us-east-1',
    auto_scaling_enabled: false,
    min_nodes: 1,
    max_nodes: 10,
    rbac_enabled: true,
    network_policy_enabled: true,
    enabled_addons: ['metrics-server', 'ingress-nginx'],
  });
  const [form, setForm] = useState<CreateClusterPayload>(blank());
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState<string | null>(null);

  const set = (key: keyof CreateClusterPayload, value: unknown) =>
    setForm(f => ({ ...f, [key]: value }));

  const toggleAddon = (id: string) =>
    setForm(f => ({
      ...f,
      enabled_addons: (f.enabled_addons ?? []).includes(id)
        ? (f.enabled_addons ?? []).filter(a => a !== id)
        : [...(f.enabled_addons ?? []), id],
    }));

  const handleSubmit = async () => {
    if (!form.name.trim()) { setErr('Cluster name is required.'); return; }
    setBusy(true); setErr(null);
    try {
      await createCluster(form);
      setForm(blank());
      onCreated();
      onClose();
    } catch (e: any) {
      setErr(e?.response?.data?.detail ?? e?.response?.data?.name?.[0] ?? e?.message ?? 'Failed to create cluster.');
    } finally { setBusy(false); }
  };

  const handleClose = () => { if (!busy) { setErr(null); onClose(); } };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>New Kubernetes Cluster</DialogTitle>
      <DialogContent dividers>
        {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
        <Stack spacing={2.5}>
          <TextField
            label="Cluster name *" size="small" fullWidth
            value={form.name} onChange={e => set('name', e.target.value)}
            placeholder="e.g. prod-cluster-1"
          />
          <TextField
            label="Description" size="small" fullWidth multiline rows={2}
            value={form.description} onChange={e => set('description', e.target.value)}
          />
          <Stack direction="row" spacing={2}>
            <FormControl size="small" fullWidth>
              <InputLabel>Region</InputLabel>
              <Select label="Region" value={form.region ?? 'us-east-1'}
                onChange={e => set('region', e.target.value)}>
                {CLUSTER_REGIONS.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel>Kubernetes Version</InputLabel>
              <Select label="Kubernetes Version" value={form.kubernetes_version ?? '1.29.0'}
                onChange={e => set('kubernetes_version', e.target.value)}>
                {K8S_VERSIONS.map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
              </Select>
            </FormControl>
          </Stack>
          <TextField
            label="Node Count" size="small" type="number" fullWidth
            value={form.node_count ?? 3}
            onChange={e => set('node_count', Math.max(1, parseInt(e.target.value, 10) || 1))}
            inputProps={{ min: 1, max: 100 }}
          />

          <FormControlLabel
            control={
              <Switch
                checked={form.auto_scaling_enabled ?? false}
                onChange={e => set('auto_scaling_enabled', e.target.checked)}
                size="small"
              />
            }
            label={<Typography variant="body2">Auto-Scaling</Typography>}
          />

          {form.auto_scaling_enabled && (
            <Stack direction="row" spacing={2}>
              <TextField
                label="Min Nodes" size="small" type="number" fullWidth
                value={form.min_nodes ?? 1}
                onChange={e => set('min_nodes', Math.max(1, parseInt(e.target.value, 10) || 1))}
                inputProps={{ min: 1 }}
              />
              <TextField
                label="Max Nodes" size="small" type="number" fullWidth
                value={form.max_nodes ?? 10}
                onChange={e => set('max_nodes', Math.max(2, parseInt(e.target.value, 10) || 2))}
                inputProps={{ min: 2 }}
              />
            </Stack>
          )}

          <Stack direction="row" spacing={3}>
            <FormControlLabel
              control={
                <Switch
                  checked={form.rbac_enabled ?? true}
                  onChange={e => set('rbac_enabled', e.target.checked)}
                  size="small"
                />
              }
              label={<Typography variant="body2">RBAC</Typography>}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={form.network_policy_enabled ?? true}
                  onChange={e => set('network_policy_enabled', e.target.checked)}
                  size="small"
                />
              }
              label={<Typography variant="body2">Network Policy</Typography>}
            />
          </Stack>

          <Box>
            <Typography variant="caption" color="text.secondary" display="block" mb={0.75}>
              Enabled Addons
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={1}>
              {CLUSTER_ADDONS.map(a => (
                <FormControlLabel
                  key={a.id}
                  control={
                    <Checkbox
                      size="small"
                      checked={(form.enabled_addons ?? []).includes(a.id)}
                      onChange={() => toggleAddon(a.id)}
                    />
                  }
                  label={<Typography variant="body2">{a.label}</Typography>}
                  sx={{ mr: 0, minWidth: 180 }}
                />
              ))}
            </Stack>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={busy}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={busy}
          startIcon={busy ? <CircularProgress size={14} sx={{ color: 'inherit' }} /> : <CloudQueueIcon />}>
          {busy ? 'Creating…' : 'Create Cluster'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

const DevKubernetesPage: React.FC = () => {
  const navigate = useNavigate();
  const [tab, setTab]           = useState(0);
  const [configs, setConfigs]   = useState<KubeConfig[]>([]);
  const [syncRuns, setSyncRuns] = useState<KubeSyncRun[]>([]);
  const [clusters, setClusters] = useState<KubernetesCluster[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [createClusterOpen, setCreateClusterOpen] = useState(false);
  const [toast, setToast]       = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [cfgRes, runRes, clusterList] = await Promise.all([
        kubernetesApi.listConfigs(),
        kubernetesApi.allSyncRuns(),
        listClusters(),
      ]);
      const cfgData = cfgRes.data as any;
      const runData = runRes.data as any;
      setConfigs(Array.isArray(cfgData) ? cfgData : (cfgData?.results ?? []));
      setSyncRuns(Array.isArray(runData) ? runData : (runData?.results ?? []));
      setClusters(clusterList);
    } catch (err: any) {
      setError(err?.response?.data?.error ?? err?.message ?? 'Failed to load Kubernetes data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const totalConfigs   = configs.length;
  const healthyConfigs = configs.filter(c => c.last_sync_status === 'success').length;
  const failedConfigs  = configs.filter(c => c.last_sync_status === 'failed').length;
  const totalWarnings  = configs.reduce((s, c) => s + (c.governance_warnings?.length ?? 0), 0);
  const runningClusters = clusters.filter(c => c.status === 'running').length;

  const handleDeleteCluster = async (resourceId: string) => {
    setDeletingId(resourceId);
    try {
      await deleteCluster(resourceId);
      setClusters(prev => prev.filter(c => c.resource_id !== resourceId));
      setToast('Cluster deleted.');
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? e?.message ?? 'Failed to delete cluster.');
    } finally { setDeletingId(null); }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>Kubernetes</Typography>
          <Typography variant="body2" color="text.secondary">
            Provision clusters and manage GitOps projects — configure, scan, apply, and monitor.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchAll}><RefreshIcon /></IconButton>
          </Tooltip>
          <Button variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => navigate('/developer/Dashboard/kubernetes/setup/new')}>
            Connect Project
          </Button>
          <Button variant="contained"
            startIcon={<CloudQueueIcon />}
            onClick={() => setCreateClusterOpen(true)}>
            Create Cluster
          </Button>
        </Stack>
      </Stack>

      {/* Stat cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px,1fr))', gap: 1.5, mb: 2 }}>
        <StatCard label="Clusters"            value={clusters.length} />
        <StatCard label="Running Clusters"    value={runningClusters} color={runningClusters > 0 ? 'success.main' : undefined} />
        <StatCard label="GitOps Projects"     value={totalConfigs} />
        <StatCard label="Healthy"             value={healthyConfigs} color="success.main" />
        <StatCard label="Failed"              value={failedConfigs}  color={failedConfigs > 0 ? 'error.main' : undefined} />
        <StatCard label="Gov. Warnings"       value={totalWarnings}  color={totalWarnings > 0 ? 'warning.main' : undefined} />
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 4 }}>
          <CircularProgress size={24} /><Typography>Loading…</Typography>
        </Box>
      ) : (
        <Card sx={{ bgcolor: 'background.paper' }}>
          <CardContent>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
              <Tab label={`Clusters (${clusters.length})`} />
              <Tab label="GitOps Projects" />
              <Tab label={`Sync History (${syncRuns.length})`} />
            </Tabs>

            {/* ── Tab 0: Clusters ── */}
            {tab === 0 && (
              clusters.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <CloudQueueIcon sx={{ fontSize: '2.5rem', color: 'text.disabled', mb: 1 }} />
                  <Typography variant="h6" mb={1}>No Kubernetes clusters yet</Typography>
                  <Typography variant="body2" color="text.secondary" mb={3}>
                    Create a managed Kubernetes cluster to deploy your workloads.
                  </Typography>
                  <Button variant="contained" startIcon={<CloudQueueIcon />}
                    onClick={() => setCreateClusterOpen(true)}>
                    Create Your First Cluster
                  </Button>
                </Box>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Cluster ID</TableCell>
                      <TableCell>Version</TableCell>
                      <TableCell>Region</TableCell>
                      <TableCell>Nodes</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Created</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {clusters.map(cl => {
                      const cfg = CLUSTER_STATUS_CFG[cl.status] ?? CLUSTER_STATUS_CFG['stopped'];
                      return (
                        <TableRow key={cl.resource_id} hover>
                          <TableCell sx={{ fontWeight: 700 }}>{cl.name}</TableCell>
                          <TableCell sx={{ fontFamily: 'monospace', fontSize: '.78rem' }}>{cl.cluster_id}</TableCell>
                          <TableCell>{cl.kubernetes_version}</TableCell>
                          <TableCell>{cl.region}</TableCell>
                          <TableCell>
                            {cl.node_count_actual ?? cl.node_count} / {cl.node_count}
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={cfg.label}
                              color={cfg.color as any}
                            />
                          </TableCell>
                          <TableCell sx={{ fontSize: '.78rem' }}>
                            {new Date(cl.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell align="right">
                            <Tooltip title="Delete cluster">
                              <span>
                                <IconButton
                                  size="small"
                                  color="error"
                                  disabled={deletingId === cl.resource_id}
                                  onClick={() => handleDeleteCluster(cl.resource_id)}>
                                  {deletingId === cl.resource_id
                                    ? <CircularProgress size={14} />
                                    : <DeleteIcon fontSize="small" />}
                                </IconButton>
                              </span>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )
            )}

            {/* ── Tab 1: GitOps Projects ── */}
            {tab === 1 && (
              configs.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <Typography variant="h6" mb={1}>No Kubernetes projects yet</Typography>
                  <Typography variant="body2" color="text.secondary" mb={3}>
                    Connect a project to a cluster and Git repository to get started.
                  </Typography>
                  <Button variant="contained" startIcon={<AddIcon />}
                    onClick={() => navigate('/developer/Dashboard/kubernetes/setup/new')}>
                    Connect Your First Project
                  </Button>
                </Box>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Project</TableCell>
                      <TableCell>Environment</TableCell>
                      <TableCell>Namespace</TableCell>
                      <TableCell>Repository</TableCell>
                      <TableCell>Sync Status</TableCell>
                      <TableCell>Last Synced</TableCell>
                      <TableCell>Warnings</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {configs.map(cfg => (
                      <TableRow key={cfg.id} hover>
                        <TableCell sx={{ fontWeight: 600 }}>{cfg.project_name || cfg.project_id}</TableCell>
                        <TableCell>
                          <Chip size="small" label={cfg.environment}
                            color={cfg.environment === 'production' ? 'error' : cfg.environment === 'staging' ? 'warning' : 'default'} />
                        </TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '.8rem' }}>{cfg.derived_namespace}</TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '.8rem' }}>{cfg.git_repo || '—'}</TableCell>
                        <TableCell><SyncStatusChip status={cfg.last_sync_status} /></TableCell>
                        <TableCell sx={{ fontSize: '.8rem' }}>
                          {cfg.last_synced_at ? new Date(cfg.last_synced_at).toLocaleDateString() : '—'}
                        </TableCell>
                        <TableCell>
                          {(cfg.governance_warnings?.length ?? 0) > 0
                            ? <Chip size="small" label={cfg.governance_warnings.length} color="warning" icon={<WarningAmberIcon fontSize="small" />} />
                            : <CheckCircleIcon fontSize="small" color="success" />}
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                            <Tooltip title="Monitor">
                              <IconButton size="small" onClick={() => navigate(`/developer/Dashboard/kubernetes/monitor/${cfg.id}`)}>
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Setup / Sync">
                              <IconButton size="small" onClick={() => navigate(`/developer/Dashboard/kubernetes/setup/${cfg.project_id}`)}>
                                <SettingsIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )
            )}

            {/* ── Tab 2: Sync History ── */}
            {tab === 2 && (
              syncRuns.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No sync runs yet.</Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Run ID</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Triggered By</TableCell>
                      <TableCell>Commit</TableCell>
                      <TableCell>Files Applied</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Duration</TableCell>
                      <TableCell>Started</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {syncRuns.map(run => (
                      <TableRow key={run.id} hover>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '.8rem' }}>{run.id.slice(0, 12)}</TableCell>
                        <TableCell><Chip size="small" label={run.run_type} variant="outlined" /></TableCell>
                        <TableCell>{run.triggered_by}</TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '.8rem' }}>
                          {run.commit_sha ? run.commit_sha.slice(0, 8) : '—'}
                        </TableCell>
                        <TableCell>{run.files_applied.length}/{run.files_selected.length}</TableCell>
                        <TableCell><SyncStatusChip status={run.status} /></TableCell>
                        <TableCell>{run.duration_seconds != null ? `${run.duration_seconds}s` : '—'}</TableCell>
                        <TableCell sx={{ fontSize: '.8rem' }}>{new Date(run.started_at).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Create Cluster Dialog ── */}
      <CreateClusterDialog
        open={createClusterOpen}
        onClose={() => setCreateClusterOpen(false)}
        onCreated={() => { fetchAll(); setToast('Cluster created successfully!'); }}
      />

      {/* ── Toast ── */}
      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
};

export default DevKubernetesPage;
