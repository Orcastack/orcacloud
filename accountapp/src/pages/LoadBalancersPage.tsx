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
import RefreshIcon from '@mui/icons-material/Refresh';
import { DeployDropdown } from '../components/deploy/DeployDropdown';
import SecurityIcon from '@mui/icons-material/Security';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import { useTheme } from '@mui/material/styles';
import { loadBalancerApi, networksApi } from '../services/cloudApi';
import type {
  CreateLoadBalancerPayload,
  CreateTargetGroupPayload,
  LoadBalancer,
  LoadBalancerMetrics,
  TargetGroup,
} from '../types/loadbalancer';

const statusColor = (status: string): 'success' | 'warning' | 'error' | 'default' => {
  if (status === 'running' || status === 'active') return 'success';
  if (status === 'provisioning' || status === 'pending') return 'warning';
  if (status === 'error' || status === 'failed') return 'error';
  return 'default';
};

const LoadBalancersPage: React.FC = () => {
  const _theme = useTheme();

  const [loadBalancers, setLoadBalancers] = useState<LoadBalancer[]>([]);
  const [selected, setSelected] = useState<LoadBalancer | null>(null);
  const [targetGroups, setTargetGroups] = useState<TargetGroup[]>([]);
  const [metrics, setMetrics] = useState<LoadBalancerMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState(0);

  const [openCreate, setOpenCreate] = useState(false);
  const [openTargetGroup, setOpenTargetGroup] = useState(false);
  const [vpcs, setVpcs] = useState<any[]>([]);

  const [createForm, setCreateForm] = useState<CreateLoadBalancerPayload>({
    name: '',
    description: '',
    lb_type: 'application',
    vpc_id: '',
    subnets: [],
    security_groups: [],
    scheme: 'internet-facing',
    ip_address_type: 'ipv4',
    cross_zone_load_balancing: true,
    access_logs_enabled: false,
    access_logs_bucket: '',
  });

  const [targetGroupForm, setTargetGroupForm] = useState<CreateTargetGroupPayload>({
    name: '',
    protocol: 'http',
    port: 80,
    vpc_id: '',
    target_type: 'instance',
  });

  const [algorithm, setAlgorithm] = useState<'round_robin' | 'least_connections' | 'ip_hash' | 'weighted'>('round_robin');
  const [certificateArn, setCertificateArn] = useState('');
  const [healthPath, setHealthPath] = useState('/health');
  const [targetId, setTargetId] = useState('');
  const [targetPort, setTargetPort] = useState(80);
  const [targetWeight, setTargetWeight] = useState(100);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      loadBalancerApi.list(),
      networksApi.list(),
    ])
      .then(([lbResponse, vpcResponse]: any) => {
        const lbs = lbResponse.data?.results ?? lbResponse.data ?? [];
        const list = vpcResponse.data?.results ?? vpcResponse.data ?? [];
        setLoadBalancers(lbs);
        setVpcs(list);
        if (!selected && lbs.length > 0) setSelected(lbs[0]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selected]);

  const loadSelected = useCallback((resourceId: string) => {
    Promise.all([
      loadBalancerApi.get(resourceId),
      loadBalancerApi.listTargetGroups(resourceId),
      loadBalancerApi.metrics(resourceId),
    ])
      .then(([lbDetail, tgResponse, metricsResponse]: any) => {
        setSelected(lbDetail.data);
        setTargetGroups(tgResponse.data?.results ?? tgResponse.data ?? []);
        setMetrics(metricsResponse.data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (selected?.resource_id) {
      loadSelected(selected.resource_id);
      setTargetGroupForm(prev => ({ ...prev, vpc_id: selected.vpc_id }));
      setAlgorithm(((selected.metadata?.algorithm as any) || 'round_robin'));
    }
  }, [selected?.resource_id, selected?.vpc_id, selected?.metadata?.algorithm, loadSelected]);

  const totals = useMemo(() => {
    const total = loadBalancers.length;
    const active = loadBalancers.filter(lb => lb.status === 'running' || lb.status === 'active').length;
    const internal = loadBalancers.filter(lb => lb.scheme === 'internal').length;
    return { total, active, internal };
  }, [loadBalancers]);

  const createLoadBalancer = async () => {
    if (!createForm.name.trim() || !createForm.vpc_id) return;
    await loadBalancerApi.create(createForm);
    setOpenCreate(false);
    setCreateForm(prev => ({ ...prev, name: '', description: '' }));
    load();
  };

  const createTargetGroup = async () => {
    if (!selected || !targetGroupForm.name.trim()) return;
    await loadBalancerApi.addTargetGroup(selected.resource_id, targetGroupForm);
    setOpenTargetGroup(false);
    setTargetGroupForm(prev => ({ ...prev, name: '' }));
    loadSelected(selected.resource_id);
  };

  const applyAlgorithm = async () => {
    if (!selected) return;
    await loadBalancerApi.setAlgorithm(selected.resource_id, algorithm);
    loadSelected(selected.resource_id);
  };

  const enableTls = async () => {
    if (!selected || !certificateArn.trim()) return;
    await loadBalancerApi.enableTls(selected.resource_id, certificateArn);
    setCertificateArn('');
    loadSelected(selected.resource_id);
  };

  const applyHealthCheck = async () => {
    if (!selected) return;
    await loadBalancerApi.configureHealthCheck(selected.resource_id, {
      path: healthPath,
      interval_seconds: 30,
      timeout_seconds: 5,
      healthy_threshold: 2,
      unhealthy_threshold: 2,
    });
    loadSelected(selected.resource_id);
  };

  const registerTarget = async (tgId: string) => {
    if (!targetId.trim()) return;
    await loadBalancerApi.registerTarget(tgId, targetId, targetPort, targetWeight);
    setTargetId('');
    loadSelected(selected!.resource_id);
  };

  return (
    <Box sx={{ p: 3, bgcolor: 'background.default', minHeight: '100%' }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Load Balancers</Typography>
          <Typography variant="body2" color="text.secondary">Distribute traffic across targets with health checks, TLS, and routing algorithms.</Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={load}>Refresh</Button>
          <DeployDropdown />
        </Stack>
      </Stack>

      <Stack direction="row" spacing={2} mb={2}>
        <Card sx={{ flex: 1, bgcolor: 'background.paper' }}><CardContent><Typography color="text.secondary">Total</Typography><Typography variant="h4">{totals.total}</Typography></CardContent></Card>
        <Card sx={{ flex: 1, bgcolor: 'background.paper' }}><CardContent><Typography color="text.secondary">Active</Typography><Typography variant="h4">{totals.active}</Typography></CardContent></Card>
        <Card sx={{ flex: 1, bgcolor: 'background.paper' }}><CardContent><Typography color="text.secondary">Internal</Typography><Typography variant="h4">{totals.internal}</Typography></CardContent></Card>
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '320px 1fr' }, gap: 2 }}>
        <Card sx={{ bgcolor: 'background.paper' }}>
          <CardContent>
            <Typography fontWeight={600} mb={1}>Balancers</Typography>
            <List sx={{ p: 0 }}>
              {loadBalancers.map(lb => (
                <ListItemButton
                  key={lb.resource_id}
                  selected={selected?.resource_id === lb.resource_id}
                  onClick={() => setSelected(lb)}
                  sx={{ borderRadius: 1, mb: 0.5, '&.Mui-selected': { bgcolor: 'grey.700' } }}
                >
                  <ListItemText primary={lb.name} secondary={`${lb.lb_type} • ${lb.scheme}`} />
                  <Chip size="small" label={lb.status} color={statusColor(lb.status)} />
                </ListItemButton>
              ))}
            </List>
          </CardContent>
        </Card>

        <Card sx={{ bgcolor: 'background.paper' }}>
          <CardContent>
            {!selected ? (
              <Typography color="text.secondary">Select a load balancer to view details.</Typography>
            ) : (
              <>
                <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
                  <Box>
                    <Typography variant="h6" fontWeight={700}>{selected.name}</Typography>
                    <Typography variant="body2" color="text.secondary">DNS: {selected.dns_name || 'pending'}</Typography>
                  </Box>
                  <Button color="error" variant="outlined" onClick={async () => { await loadBalancerApi.delete(selected.resource_id); setSelected(null); load(); }}>Delete</Button>
                </Stack>
                <Divider sx={{ mb: 1.5 }} />

                <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mb: 2 }}>
                  <Tab label="Overview" />
                  <Tab label="Target Groups" />
                  <Tab label="Security" />
                  <Tab label="Metrics" />
                </Tabs>

                {tab === 0 && (
                  <Stack spacing={2}>
                    <Card variant="outlined" sx={{ bgcolor: 'background.paper' }}><CardContent>
                      <Typography variant="subtitle2">Routing Algorithm</Typography>
                      <Stack direction="row" spacing={1} mt={1}>
                        <TextField select size="small" value={algorithm} onChange={event => setAlgorithm(event.target.value as any)}>
                          <MenuItem value="round_robin">Round Robin</MenuItem>
                          <MenuItem value="least_connections">Least Connections</MenuItem>
                          <MenuItem value="ip_hash">IP Hash</MenuItem>
                          <MenuItem value="weighted">Weighted</MenuItem>
                        </TextField>
                        <Button variant="contained" onClick={applyAlgorithm}>Apply</Button>
                      </Stack>
                    </CardContent></Card>

                    <Card variant="outlined" sx={{ bgcolor: 'background.paper' }}><CardContent>
                      <Typography variant="subtitle2">Health Check</Typography>
                      <Stack direction="row" spacing={1} mt={1}>
                        <TextField size="small" label="Path" value={healthPath} onChange={event => setHealthPath(event.target.value)} />
                        <Button variant="outlined" startIcon={<MonitorHeartIcon />} onClick={applyHealthCheck}>Apply</Button>
                      </Stack>
                    </CardContent></Card>
                  </Stack>
                )}

                {tab === 1 && (
                  <Stack spacing={2}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="subtitle2">Target Groups</Typography>
                      <Button size="small" variant="contained" onClick={() => setOpenTargetGroup(true)}>Add Target Group</Button>
                    </Stack>
                    {targetGroups.map(tg => (
                      <Card key={tg.tg_id} variant="outlined" sx={{ bgcolor: 'background.paper' }}>
                        <CardContent>
                          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                            <Typography fontWeight={600}>{tg.name} ({tg.protocol}:{tg.port})</Typography>
                            <Chip size="small" label={`${tg.registered_targets?.length || 0} targets`} />
                          </Stack>
                          <Stack direction="row" spacing={1} mb={1}>
                            <TextField size="small" label="Target ID" value={targetId} onChange={event => setTargetId(event.target.value)} />
                            <TextField size="small" label="Port" type="number" value={targetPort} onChange={event => setTargetPort(Number(event.target.value))} sx={{ width: 110 }} />
                            <TextField size="small" label="Weight" type="number" value={targetWeight} onChange={event => setTargetWeight(Number(event.target.value))} sx={{ width: 110 }} />
                            <Button variant="outlined" onClick={() => registerTarget(tg.tg_id)}>Register</Button>
                          </Stack>
                          <Typography variant="caption" color="text.secondary">Health: {JSON.stringify(tg.health_status || {})}</Typography>
                        </CardContent>
                      </Card>
                    ))}
                    {!targetGroups.length && <Typography color="text.secondary">No target groups yet.</Typography>}
                  </Stack>
                )}

                {tab === 2 && (
                  <Stack spacing={2}>
                    <Card variant="outlined" sx={{ bgcolor: 'background.paper' }}><CardContent>
                      <Typography variant="subtitle2">TLS / SSL Termination</Typography>
                      <Stack direction="row" spacing={1} mt={1}>
                        <TextField fullWidth size="small" label="Certificate ARN" value={certificateArn} onChange={event => setCertificateArn(event.target.value)} />
                        <Button variant="contained" startIcon={<SecurityIcon />} onClick={enableTls}>Enable TLS</Button>
                      </Stack>
                    </CardContent></Card>

                    <Card variant="outlined" sx={{ bgcolor: 'background.paper' }}><CardContent>
                      <Typography variant="subtitle2">CDN Integration</Typography>
                      <Button variant="outlined" sx={{ mt: 1 }} onClick={async () => {
                        if (!selected) return;
                        await loadBalancerApi.configureCdnOrigin(selected.resource_id, selected.dns_name || `${selected.name}.lb`);
                        loadSelected(selected.resource_id);
                      }}>
                        Use as CDN Origin
                      </Button>
                    </CardContent></Card>
                  </Stack>
                )}

                {tab === 3 && (
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 1 }}>
                    <Card variant="outlined" sx={{ bgcolor: 'background.paper' }}><CardContent><Typography variant="caption" color="text.secondary">P50 Latency</Typography><Typography variant="h6">{metrics?.latency_ms_p50 ?? 0} ms</Typography></CardContent></Card>
                    <Card variant="outlined" sx={{ bgcolor: 'background.paper' }}><CardContent><Typography variant="caption" color="text.secondary">P95 Latency</Typography><Typography variant="h6">{metrics?.latency_ms_p95 ?? 0} ms</Typography></CardContent></Card>
                    <Card variant="outlined" sx={{ bgcolor: 'background.paper' }}><CardContent><Typography variant="caption" color="text.secondary">RPS</Typography><Typography variant="h6">{metrics?.request_rate_rps ?? 0}</Typography></CardContent></Card>
                    <Card variant="outlined" sx={{ bgcolor: 'background.paper' }}><CardContent><Typography variant="caption" color="text.secondary">Errors</Typography><Typography variant="h6">{metrics?.error_rate_percent ?? 0}%</Typography></CardContent></Card>
                  </Box>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </Box>

      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Deploy Load Balancer</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, mt: 1 }}>
          <TextField label="Name" value={createForm.name} onChange={event => setCreateForm(prev => ({ ...prev, name: event.target.value }))} />
          <TextField label="Description" value={createForm.description || ''} onChange={event => setCreateForm(prev => ({ ...prev, description: event.target.value }))} />
          <TextField select label="Type" value={createForm.lb_type} onChange={event => setCreateForm(prev => ({ ...prev, lb_type: event.target.value as any }))}>
            <MenuItem value="application">Application (L7)</MenuItem>
            <MenuItem value="network">Network (L4)</MenuItem>
            <MenuItem value="classic">Classic</MenuItem>
          </TextField>
          <TextField select label="Scheme" value={createForm.scheme} onChange={event => setCreateForm(prev => ({ ...prev, scheme: event.target.value as any }))}>
            <MenuItem value="internet-facing">Internet-facing</MenuItem>
            <MenuItem value="internal">Internal</MenuItem>
          </TextField>
          <TextField select label="VPC" value={createForm.vpc_id} onChange={event => setCreateForm(prev => ({ ...prev, vpc_id: event.target.value }))}>
            {vpcs.map(vpc => <MenuItem key={vpc.resource_id || vpc.vpc_id} value={vpc.vpc_id || vpc.resource_id}>{vpc.name} ({vpc.cidr_block})</MenuItem>)}
          </TextField>
          <TextField label="Subnets (comma separated)" value={createForm.subnets.join(',')} onChange={event => setCreateForm(prev => ({ ...prev, subnets: event.target.value.split(',').map(v => v.trim()).filter(Boolean) }))} />
          <TextField label="Security Groups (comma separated)" value={createForm.security_groups.join(',')} onChange={event => setCreateForm(prev => ({ ...prev, security_groups: event.target.value.split(',').map(v => v.trim()).filter(Boolean) }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreate(false)}>Cancel</Button>
          <Button variant="contained" onClick={createLoadBalancer}>Deploy</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openTargetGroup} onClose={() => setOpenTargetGroup(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Target Group</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, mt: 1 }}>
          <TextField label="Name" value={targetGroupForm.name} onChange={event => setTargetGroupForm(prev => ({ ...prev, name: event.target.value }))} />
          <TextField select label="Protocol" value={targetGroupForm.protocol} onChange={event => setTargetGroupForm(prev => ({ ...prev, protocol: event.target.value as any }))}>
            <MenuItem value="http">HTTP</MenuItem>
            <MenuItem value="https">HTTPS</MenuItem>
            <MenuItem value="tcp">TCP</MenuItem>
            <MenuItem value="udp">UDP</MenuItem>
          </TextField>
          <TextField label="Port" type="number" value={targetGroupForm.port} onChange={event => setTargetGroupForm(prev => ({ ...prev, port: Number(event.target.value) }))} />
          <TextField select label="Target Type" value={targetGroupForm.target_type} onChange={event => setTargetGroupForm(prev => ({ ...prev, target_type: event.target.value as any }))}>
            <MenuItem value="instance">Instance</MenuItem>
            <MenuItem value="ip">IP</MenuItem>
            <MenuItem value="lambda">Lambda</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenTargetGroup(false)}>Cancel</Button>
          <Button variant="contained" onClick={createTargetGroup}>Deploy</Button>
        </DialogActions>
      </Dialog>

      {loading && <Typography color="text.secondary" mt={2}>Loading load balancers...</Typography>}
    </Box>
  );
};

export default LoadBalancersPage;
