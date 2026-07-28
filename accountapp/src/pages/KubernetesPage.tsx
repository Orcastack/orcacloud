import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import { kubernetesApi } from '../services/cloudApi';
import type { CreateKubernetesClusterPayload, KubernetesCluster } from '../types/kubernetes';
import { dashboardCardSx, dashboardPrimaryButtonSx, dashboardTokens } from '../styles/dashboardDesignSystem';
import { DeployDropdown } from '../components/deploy/DeployDropdown';

const DEFAULT_YAML = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: webapp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: webapp
  template:
    metadata:
      labels:
        app: webapp
    spec:
      containers:
      - name: webapp
        image: myregistry/webapp:latest
        ports:
        - containerPort: 80
`;

const STATUS_COLOR: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  running: 'success',
  provisioning: 'warning',
  pending: 'warning',
  error: 'error',
};

const KubernetesPage: React.FC = () => {
  const [clusters, setClusters] = useState<KubernetesCluster[]>([]);
  const [selected, setSelected] = useState<KubernetesCluster | null>(null);
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [openCreate, setOpenCreate] = useState(false);
  const [yaml, setYaml] = useState(DEFAULT_YAML);
  const [kubeconfig, setKubeconfig] = useState('');
  const [metrics, setMetrics] = useState<any>(null);

  const [form, setForm] = useState<CreateKubernetesClusterPayload>({
    name: '',
    description: '',
    kubernetes_version: '1.29.0',
    node_count: 3,
    min_nodes: 1,
    max_nodes: 10,
    region: 'us-west-2',
    enabled_addons: ['metrics-server', 'ingress-nginx'],
    rbac_enabled: true,
    network_policy_enabled: true,
  });

  const load = useCallback(() => {
    setLoading(true);
    kubernetesApi.list()
      .then((r: any) => {
        const items = r.data?.results ?? r.data ?? [];
        setClusters(items);
        if (!selected && items.length) setSelected(items[0]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selected]);

  useEffect(() => { load(); }, [load]);

  const loadDetails = useCallback((clusterId: string) => {
    kubernetesApi.get(clusterId).then((r: any) => setSelected(r.data)).catch(() => {});
    kubernetesApi.kubeconfig(clusterId).then((r: any) => setKubeconfig(r.data?.kubeconfig ?? '')).catch(() => {});
    kubernetesApi.metrics(clusterId).then((r: any) => setMetrics(r.data)).catch(() => setMetrics(null));
  }, []);

  useEffect(() => {
    if (selected?.resource_id) loadDetails(selected.resource_id);
  }, [selected?.resource_id, loadDetails]);

  const overviewStats = useMemo(() => {
    const total = clusters.length;
    const running = clusters.filter(c => c.status === 'running').length;
    const provisioning = clusters.filter(c => c.status === 'provisioning' || c.status === 'pending').length;
    return { total, running, provisioning };
  }, [clusters]);

  const createCluster = async () => {
    if (!form.name.trim()) return;
    await kubernetesApi.create(form);
    setOpenCreate(false);
    setForm({ ...form, name: '' });
    load();
  };

  const deployYaml = async () => {
    if (!selected) return;
    await kubernetesApi.deployYaml(selected.resource_id, yaml);
  };

  const scaleCluster = async (delta: number) => {
    if (!selected) return;
    const target = Math.max(selected.min_nodes, Math.min(selected.max_nodes, selected.node_count + delta));
    await kubernetesApi.scale(selected.resource_id, target);
    loadDetails(selected.resource_id);
    load();
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: dashboardTokens.colors.background, minHeight: '100%' }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Kubernetes</Typography>
          <Typography variant="body2" color="text.secondary">Create clusters, deploy YAML, and monitor health.</Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={load}>Refresh</Button>
          <DeployDropdown />
        </Stack>
      </Stack>

      <Stack direction="row" spacing={2} mb={2}>
        <Card sx={{ ...dashboardCardSx, flex: 1 }}><CardContent><Typography color="text.secondary">Clusters</Typography><Typography variant="h4">{overviewStats.total}</Typography></CardContent></Card>
        <Card sx={{ ...dashboardCardSx, flex: 1 }}><CardContent><Typography color="text.secondary">Running</Typography><Typography variant="h4">{overviewStats.running}</Typography></CardContent></Card>
        <Card sx={{ ...dashboardCardSx, flex: 1 }}><CardContent><Typography color="text.secondary">Provisioning</Typography><Typography variant="h4">{overviewStats.provisioning}</Typography></CardContent></Card>
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '300px 1fr' }, gap: 2 }}>
        <Card sx={dashboardCardSx}>
          <CardContent>
            <Typography fontWeight={600} mb={1}>Clusters</Typography>
            <List sx={{ p: 0 }}>
              {clusters.map(cluster => (
                <ListItemButton
                  key={cluster.resource_id}
                  selected={selected?.resource_id === cluster.resource_id}
                  onClick={() => setSelected(cluster)}
                  sx={{ borderRadius: 1, mb: 0.5 }}
                >
                  <ListItemText
                    primary={cluster.name}
                    secondary={`${cluster.kubernetes_version} • ${cluster.region}`}
                  />
                  <Chip size="small" label={cluster.status} color={STATUS_COLOR[cluster.status] ?? 'default'} />
                </ListItemButton>
              ))}
            </List>
          </CardContent>
        </Card>

        <Card sx={dashboardCardSx}>
          <CardContent>
            {!selected ? (
              <Typography color="text.secondary">Select a cluster to view details.</Typography>
            ) : (
              <>
                <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
                  <Box>
                    <Typography variant="h6" fontWeight={700}>{selected.name}</Typography>
                    <Typography variant="body2" color="text.secondary">API endpoint: {selected.api_endpoint || 'Not ready'}</Typography>
                  </Box>
                  <Stack direction="row" spacing={1}>
                    <Button size="small" variant="outlined" onClick={() => scaleCluster(-1)}>-1 Node</Button>
                    <Button size="small" variant="outlined" onClick={() => scaleCluster(1)}>+1 Node</Button>
                  </Stack>
                </Stack>
                <Divider sx={{ my: 1 }} />

                <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mb: 2 }}>
                  <Tab label="Overview" />
                  <Tab label="Deploy YAML" />
                  <Tab label="Kubeconfig" />
                </Tabs>

                {tab === 0 && (
                  <Box>
                    <Typography variant="body2" sx={{ mb: 1 }}>Nodes: {selected.node_count} • RBAC: {selected.rbac_enabled ? 'Enabled' : 'Disabled'} • Network policy: {selected.network_policy_enabled ? 'Enabled' : 'Disabled'}</Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>Addons: {(selected.enabled_addons || []).join(', ') || 'None'}</Typography>
                    <Typography variant="subtitle2" sx={{ mt: 2 }}>Live Metrics</Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 1, mt: 1 }}>
                      <Card variant="outlined"><CardContent><Typography color="text.secondary" variant="caption">CPU</Typography><Typography variant="h6">{metrics?.cpu_percent ?? 0}%</Typography></CardContent></Card>
                      <Card variant="outlined"><CardContent><Typography color="text.secondary" variant="caption">Memory</Typography><Typography variant="h6">{metrics?.memory_percent ?? 0}%</Typography></CardContent></Card>
                      <Card variant="outlined"><CardContent><Typography color="text.secondary" variant="caption">Pod Health</Typography><Typography variant="h6">{metrics?.pod_health_percent ?? 0}%</Typography></CardContent></Card>
                    </Box>
                  </Box>
                )}

                {tab === 1 && (
                  <Box>
                    <TextField
                      multiline
                      minRows={14}
                      fullWidth
                      value={yaml}
                      onChange={(event) => setYaml(event.target.value)}
                    />
                    <Stack direction="row" justifyContent="flex-end" mt={1}>
                      <Button variant="contained" onClick={deployYaml} sx={dashboardPrimaryButtonSx}>Apply Manifest</Button>
                    </Stack>
                  </Box>
                )}

                {tab === 2 && (
                  <Box>
                    <TextField multiline minRows={14} fullWidth value={kubeconfig} InputProps={{ readOnly: true }} />
                    <Stack direction="row" justifyContent="flex-end" mt={1}>
                      <Button
                        variant="outlined"
                        startIcon={<DownloadIcon />}
                        onClick={() => navigator.clipboard.writeText(kubeconfig || '')}
                      >
                        Copy Kubeconfig
                      </Button>
                    </Stack>
                  </Box>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </Box>

      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Kubernetes Cluster</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, mt: 1 }}>
          <TextField label="Cluster Name" value={form.name} onChange={(event) => setForm(prev => ({ ...prev, name: event.target.value }))} />
          <TextField label="Description" value={form.description || ''} onChange={(event) => setForm(prev => ({ ...prev, description: event.target.value }))} />
          <TextField select label="Kubernetes Version" value={form.kubernetes_version} onChange={(event) => setForm(prev => ({ ...prev, kubernetes_version: event.target.value }))}>
            <MenuItem value="1.29.0">1.29.0</MenuItem>
            <MenuItem value="1.28.0">1.28.0</MenuItem>
          </TextField>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1 }}>
            <TextField label="Node Count" type="number" value={form.node_count} onChange={(event) => setForm(prev => ({ ...prev, node_count: Number(event.target.value) }))} />
            <TextField label="Min Nodes" type="number" value={form.min_nodes} onChange={(event) => setForm(prev => ({ ...prev, min_nodes: Number(event.target.value) }))} />
            <TextField label="Max Nodes" type="number" value={form.max_nodes} onChange={(event) => setForm(prev => ({ ...prev, max_nodes: Number(event.target.value) }))} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreate(false)}>Cancel</Button>
          <Button variant="contained" startIcon={<SaveIcon />} onClick={createCluster} sx={dashboardPrimaryButtonSx}>Create</Button>
        </DialogActions>
      </Dialog>

      {loading && <Typography color="text.secondary" mt={2}>Loading clusters...</Typography>}
    </Box>
  );
};

export default KubernetesPage;
