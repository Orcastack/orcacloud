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
  FormControlLabel,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import SpeedRoundedIcon from '@mui/icons-material/SpeedRounded';
import { cdnApi } from '../services/cloudApi';
import type { CDNDistribution, CDNMetrics, CreateCDNDistributionPayload, EdgeStatusItem } from '../types/cdn';

const statusColor = (status: string): 'success' | 'warning' | 'error' | 'default' => {
  if (status === 'running' || status === 'active') return 'success';
  if (status === 'provisioning' || status === 'pending') return 'warning';
  if (status === 'failed' || status === 'error') return 'error';
  return 'default';
};

const CDNPage: React.FC = () => {
  const [items, setItems] = useState<CDNDistribution[]>([]);
  const [selected, setSelected] = useState<CDNDistribution | null>(null);
  const [metrics, setMetrics] = useState<CDNMetrics | null>(null);
  const [edges, setEdges] = useState<EdgeStatusItem[]>([]);
  const [tab, setTab] = useState(0);
  const [openCreate, setOpenCreate] = useState(false);

  const [createForm, setCreateForm] = useState<CreateCDNDistributionPayload>({
    name: '',
    description: '',
    origin_domain: '',
    origin_path: '/',
    domain_names: [],
    default_root_object: 'index.html',
    enabled: true,
    require_https: true,
    ssl_protocol_minimum: 'TLSv1.2',
    default_ttl_seconds: 86400,
    max_ttl_seconds: 31536000,
    origin_shield_enabled: false,
    origin_shield_region: '',
    access_logs_enabled: false,
    access_logs_bucket: '',
    waf_enabled: true,
    waf_web_acl_id: '',
    price_class: 'all',
  });

  const [cacheForm, setCacheForm] = useState({
    static_ttl_seconds: 86400,
    dynamic_ttl_seconds: 60,
    max_ttl_seconds: 31536000,
    bypass_paths: '/api/*',
    cache_query_strings: false,
    vary_headers: 'Accept-Encoding',
  });

  const [securityForm, setSecurityForm] = useState({
    require_https: true,
    ssl_protocol_minimum: 'TLSv1.2',
    waf_enabled: true,
    waf_web_acl_id: '',
    ddos_mitigation_enabled: true,
  });

  const [performanceForm, setPerformanceForm] = useState({
    http2_enabled: true,
    http3_enabled: true,
    compression: 'brotli+gzip',
    image_optimization: true,
  });

  const [purgePaths, setPurgePaths] = useState('/*');

  const loadList = useCallback(() => {
    cdnApi.list()
      .then((response: any) => {
        const list = response.data?.results ?? response.data ?? [];
        setItems(list);
        if (!selected && list.length) setSelected(list[0]);
      })
      .catch(() => {});
  }, [selected]);

  const loadSelected = useCallback((resourceId: string) => {
    Promise.all([
      cdnApi.get(resourceId),
      cdnApi.metrics(resourceId),
      cdnApi.edgeStatus(resourceId),
    ])
      .then(([detailResponse, metricsResponse, edgeResponse]: any) => {
        const distribution = detailResponse.data;
        setSelected(distribution);
        setMetrics(metricsResponse.data);
        setEdges(edgeResponse.data?.edges ?? []);

        const existingCache = distribution.metadata?.cache_policy || {};
        setCacheForm({
          static_ttl_seconds: existingCache.static_ttl_seconds ?? distribution.default_ttl_seconds ?? 86400,
          dynamic_ttl_seconds: existingCache.dynamic_ttl_seconds ?? 60,
          max_ttl_seconds: distribution.max_ttl_seconds ?? 31536000,
          bypass_paths: (existingCache.bypass_paths || ['/api/*']).join(','),
          cache_query_strings: !!existingCache.cache_query_strings,
          vary_headers: (existingCache.vary_headers || ['Accept-Encoding']).join(','),
        });

        const existingSecurity = distribution.metadata?.security || {};
        setSecurityForm({
          require_https: distribution.require_https,
          ssl_protocol_minimum: distribution.ssl_protocol_minimum || existingSecurity.tls_minimum || 'TLSv1.2',
          waf_enabled: distribution.waf_enabled,
          waf_web_acl_id: distribution.waf_web_acl_id || '',
          ddos_mitigation_enabled: existingSecurity.ddos_mitigation_enabled ?? true,
        });

        const existingPerf = distribution.metadata?.performance || {};
        setPerformanceForm({
          http2_enabled: existingPerf.http2_enabled ?? true,
          http3_enabled: existingPerf.http3_enabled ?? true,
          compression: existingPerf.compression ?? 'brotli+gzip',
          image_optimization: existingPerf.image_optimization ?? true,
        });
      })
      .catch(() => {});
  }, []);

  useEffect(() => { loadList(); }, [loadList]);
  useEffect(() => {
    if (selected?.resource_id) {
      loadSelected(selected.resource_id);
    }
  }, [selected?.resource_id, loadSelected]);

  const totals = useMemo(() => {
    const total = items.length;
    const active = items.filter(item => item.status === 'running' || item.status === 'active').length;
    const secure = items.filter(item => item.require_https).length;
    return { total, active, secure };
  }, [items]);

  const createDistribution = async () => {
    if (!createForm.name?.trim() || !createForm.origin_domain?.trim()) return;
    await cdnApi.create({
      ...createForm,
      domain_names: createForm.domain_names || [],
      origin_path: createForm.origin_path || '/',
    });
    setOpenCreate(false);
    setCreateForm(prev => ({ ...prev, name: '', origin_domain: '', domain_names: [] }));
    loadList();
  };

  const deleteDistribution = async () => {
    if (!selected) return;
    await cdnApi.delete(selected.resource_id);
    setSelected(null);
    setMetrics(null);
    setEdges([]);
    loadList();
  };

  const applyCachePolicy = async () => {
    if (!selected) return;
    await cdnApi.setCachePolicy(selected.resource_id, {
      static_ttl_seconds: cacheForm.static_ttl_seconds,
      dynamic_ttl_seconds: cacheForm.dynamic_ttl_seconds,
      max_ttl_seconds: cacheForm.max_ttl_seconds,
      bypass_paths: cacheForm.bypass_paths.split(',').map(value => value.trim()).filter(Boolean),
      cache_query_strings: cacheForm.cache_query_strings,
      vary_headers: cacheForm.vary_headers.split(',').map(value => value.trim()).filter(Boolean),
    });
    loadSelected(selected.resource_id);
  };

  const invalidateCache = async () => {
    if (!selected) return;
    const paths = purgePaths.split(',').map(value => value.trim()).filter(Boolean);
    await cdnApi.invalidateCache(selected.resource_id, paths.length ? paths : ['/*']);
    loadSelected(selected.resource_id);
  };

  const applySecurity = async () => {
    if (!selected) return;
    await cdnApi.setSecurity(selected.resource_id, securityForm);
    loadSelected(selected.resource_id);
  };

  const applyPerformance = async () => {
    if (!selected) return;
    await cdnApi.setPerformance(selected.resource_id, performanceForm);
    loadSelected(selected.resource_id);
  };

  return (
    <Box sx={{ p: 3, bgcolor: 'background.default', minHeight: '100%' }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Box>
          <Typography variant="h5" fontWeight={700}>CDN</Typography>
          <Typography variant="body2" color="text.secondary">Global edge delivery for static assets, APIs, and secure traffic acceleration.</Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadList}>Refresh</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenCreate(true)}>Create Distribution</Button>
        </Stack>
      </Stack>

      <Stack direction="row" spacing={2} mb={2}>
        <Card sx={{ flex: 1, bgcolor: 'background.paper' }}><CardContent><Typography color="text.secondary">Total</Typography><Typography variant="h4">{totals.total}</Typography></CardContent></Card>
        <Card sx={{ flex: 1, bgcolor: 'background.paper' }}><CardContent><Typography color="text.secondary">Active</Typography><Typography variant="h4">{totals.active}</Typography></CardContent></Card>
        <Card sx={{ flex: 1, bgcolor: 'background.paper' }}><CardContent><Typography color="text.secondary">HTTPS Enforced</Typography><Typography variant="h4">{totals.secure}</Typography></CardContent></Card>
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '320px 1fr' }, gap: 2 }}>
        <Card sx={{ bgcolor: 'background.paper' }}>
          <CardContent>
            <Typography fontWeight={600} mb={1}>Distributions</Typography>
            <List sx={{ p: 0 }}>
              {items.map(item => (
                <ListItemButton
                  key={item.resource_id}
                  selected={selected?.resource_id === item.resource_id}
                  onClick={() => setSelected(item)}
                  sx={{ borderRadius: 1, mb: 0.5, '&.Mui-selected': { bgcolor: 'grey.700' } }}
                >
                  <ListItemText primary={item.name} secondary={item.origin_domain} />
                  <Chip size="small" label={item.status} color={statusColor(item.status)} />
                </ListItemButton>
              ))}
            </List>
            {!items.length && <Typography variant="body2" color="text.secondary">No distributions found.</Typography>}
          </CardContent>
        </Card>

        <Card sx={{ bgcolor: 'background.paper' }}>
          <CardContent>
            {!selected ? (
              <Typography color="text.secondary">Select a CDN distribution to view details.</Typography>
            ) : (
              <>
                <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
                  <Box>
                    <Typography variant="h6" fontWeight={700}>{selected.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Edge: {selected.metadata?.edge_domain || 'pending'}
                    </Typography>
                  </Box>
                  <Button color="error" variant="outlined" startIcon={<DeleteOutlineIcon />} onClick={deleteDistribution}>Delete</Button>
                </Stack>
                <Divider sx={{ mb: 1.5 }} />

                <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mb: 2 }}>
                  <Tab label="Overview" />
                  <Tab label="Cache" />
                  <Tab label="Security" />
                  <Tab label="Performance" />
                  <Tab label="Metrics" />
                </Tabs>

                {tab === 0 && (
                  <Stack spacing={1.5}>
                    <Card variant="outlined" sx={{ bgcolor: 'background.paper' }}><CardContent>
                      <Typography variant="subtitle2">Origin</Typography>
                      <Typography variant="body2" color="text.secondary">{selected.origin_domain}{selected.origin_path || '/'}</Typography>
                    </CardContent></Card>
                    <Card variant="outlined" sx={{ bgcolor: 'background.paper' }}><CardContent>
                      <Typography variant="subtitle2">Custom Domains</Typography>
                      <Typography variant="body2" color="text.secondary">{(selected.domain_names || []).join(', ') || 'None configured'}</Typography>
                    </CardContent></Card>
                    <Card variant="outlined" sx={{ bgcolor: 'background.paper' }}><CardContent>
                      <Typography variant="subtitle2">Provider</Typography>
                      <Typography variant="body2" color="text.secondary">{selected.metadata?.provider || 'simulated'}</Typography>
                    </CardContent></Card>
                  </Stack>
                )}

                {tab === 1 && (
                  <Stack spacing={2}>
                    <Card variant="outlined" sx={{ bgcolor: 'background.paper' }}><CardContent>
                      <Typography variant="subtitle2">Cache Policy</Typography>
                      <Stack direction="row" spacing={1} mt={1}>
                        <TextField size="small" type="number" label="Static TTL" value={cacheForm.static_ttl_seconds} onChange={event => setCacheForm(prev => ({ ...prev, static_ttl_seconds: Number(event.target.value) }))} sx={{ width: 130 }} />
                        <TextField size="small" type="number" label="Dynamic TTL" value={cacheForm.dynamic_ttl_seconds} onChange={event => setCacheForm(prev => ({ ...prev, dynamic_ttl_seconds: Number(event.target.value) }))} sx={{ width: 140 }} />
                        <TextField size="small" type="number" label="Max TTL" value={cacheForm.max_ttl_seconds} onChange={event => setCacheForm(prev => ({ ...prev, max_ttl_seconds: Number(event.target.value) }))} sx={{ width: 120 }} />
                      </Stack>
                      <TextField size="small" fullWidth label="Bypass Paths (comma separated)" sx={{ mt: 1 }} value={cacheForm.bypass_paths} onChange={event => setCacheForm(prev => ({ ...prev, bypass_paths: event.target.value }))} />
                      <TextField size="small" fullWidth label="Vary Headers (comma separated)" sx={{ mt: 1 }} value={cacheForm.vary_headers} onChange={event => setCacheForm(prev => ({ ...prev, vary_headers: event.target.value }))} />
                      <FormControlLabel sx={{ mt: 1 }} control={<Switch checked={cacheForm.cache_query_strings} onChange={event => setCacheForm(prev => ({ ...prev, cache_query_strings: event.target.checked }))} />} label="Cache Query Strings" />
                      <Button sx={{ mt: 1 }} variant="contained" onClick={applyCachePolicy}>Apply Cache Policy</Button>
                    </CardContent></Card>

                    <Card variant="outlined" sx={{ bgcolor: 'background.paper' }}><CardContent>
                      <Typography variant="subtitle2">Cache Invalidation</Typography>
                      <Stack direction="row" spacing={1} mt={1}>
                        <TextField fullWidth size="small" label="Paths (comma separated)" value={purgePaths} onChange={event => setPurgePaths(event.target.value)} />
                        <Button variant="outlined" onClick={invalidateCache}>Invalidate</Button>
                      </Stack>
                    </CardContent></Card>
                  </Stack>
                )}

                {tab === 2 && (
                  <Stack spacing={2}>
                    <Card variant="outlined" sx={{ bgcolor: 'background.paper' }}><CardContent>
                      <Typography variant="subtitle2">TLS / WAF</Typography>
                      <Stack spacing={1} mt={1}>
                        <FormControlLabel control={<Switch checked={securityForm.require_https} onChange={event => setSecurityForm(prev => ({ ...prev, require_https: event.target.checked }))} />} label="Require HTTPS" />
                        <TextField select size="small" label="Minimum TLS" value={securityForm.ssl_protocol_minimum} onChange={event => setSecurityForm(prev => ({ ...prev, ssl_protocol_minimum: event.target.value }))}>
                          <MenuItem value="TLSv1">TLSv1</MenuItem>
                          <MenuItem value="TLSv1.1">TLSv1.1</MenuItem>
                          <MenuItem value="TLSv1.2">TLSv1.2</MenuItem>
                        </TextField>
                        <FormControlLabel control={<Switch checked={securityForm.waf_enabled} onChange={event => setSecurityForm(prev => ({ ...prev, waf_enabled: event.target.checked }))} />} label="Enable WAF" />
                        <TextField size="small" label="WAF Web ACL ID" value={securityForm.waf_web_acl_id} onChange={event => setSecurityForm(prev => ({ ...prev, waf_web_acl_id: event.target.value }))} />
                        <FormControlLabel control={<Switch checked={securityForm.ddos_mitigation_enabled} onChange={event => setSecurityForm(prev => ({ ...prev, ddos_mitigation_enabled: event.target.checked }))} />} label="Enable DDoS Mitigation" />
                        <Button variant="contained" startIcon={<ShieldRoundedIcon />} onClick={applySecurity}>Apply Security</Button>
                      </Stack>
                    </CardContent></Card>
                  </Stack>
                )}

                {tab === 3 && (
                  <Card variant="outlined" sx={{ bgcolor: 'background.paper' }}><CardContent>
                    <Typography variant="subtitle2">Edge Performance</Typography>
                    <Stack spacing={1} mt={1}>
                      <FormControlLabel control={<Switch checked={performanceForm.http2_enabled} onChange={event => setPerformanceForm(prev => ({ ...prev, http2_enabled: event.target.checked }))} />} label="Enable HTTP/2" />
                      <FormControlLabel control={<Switch checked={performanceForm.http3_enabled} onChange={event => setPerformanceForm(prev => ({ ...prev, http3_enabled: event.target.checked }))} />} label="Enable HTTP/3 (QUIC)" />
                      <TextField select size="small" label="Compression" value={performanceForm.compression} onChange={event => setPerformanceForm(prev => ({ ...prev, compression: event.target.value }))}>
                        <MenuItem value="brotli+gzip">Brotli + Gzip</MenuItem>
                        <MenuItem value="gzip">Gzip only</MenuItem>
                        <MenuItem value="none">None</MenuItem>
                      </TextField>
                      <FormControlLabel control={<Switch checked={performanceForm.image_optimization} onChange={event => setPerformanceForm(prev => ({ ...prev, image_optimization: event.target.checked }))} />} label="Enable Image Optimization" />
                      <Button variant="contained" startIcon={<SpeedRoundedIcon />} onClick={applyPerformance}>Apply Performance</Button>
                    </Stack>
                  </CardContent></Card>
                )}

                {tab === 4 && (
                  <Stack spacing={2}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(5, minmax(0, 1fr))' }, gap: 1 }}>
                      <Card variant="outlined" sx={{ bgcolor: 'background.paper' }}><CardContent><Typography variant="caption" color="text.secondary">Requests</Typography><Typography variant="h6">{metrics?.requests ?? 0}</Typography></CardContent></Card>
                      <Card variant="outlined" sx={{ bgcolor: 'background.paper' }}><CardContent><Typography variant="caption" color="text.secondary">Hit Ratio</Typography><Typography variant="h6">{metrics?.cache_hit_ratio_percent ?? 0}%</Typography></CardContent></Card>
                      <Card variant="outlined" sx={{ bgcolor: 'background.paper' }}><CardContent><Typography variant="caption" color="text.secondary">Avg Latency</Typography><Typography variant="h6">{metrics?.avg_edge_latency_ms ?? 0} ms</Typography></CardContent></Card>
                      <Card variant="outlined" sx={{ bgcolor: 'background.paper' }}><CardContent><Typography variant="caption" color="text.secondary">Origin Egress</Typography><Typography variant="h6">{metrics?.origin_egress_gb ?? 0} GB</Typography></CardContent></Card>
                      <Card variant="outlined" sx={{ bgcolor: 'background.paper' }}><CardContent><Typography variant="caption" color="text.secondary">Bandwidth Saved</Typography><Typography variant="h6">{metrics?.bandwidth_saved_percent ?? 0}%</Typography></CardContent></Card>
                    </Box>

                    <Card variant="outlined" sx={{ bgcolor: 'background.paper' }}><CardContent>
                      <Typography variant="subtitle2" mb={1}>Edge Status</Typography>
                      <List sx={{ p: 0 }}>
                        {edges.map(edge => (
                          <ListItemButton key={edge.region} sx={{ borderRadius: 1, mb: 0.5 }}>
                            <ListItemText primary={edge.region} secondary={`P95 ${edge.p95_latency_ms} ms`} />
                            <Chip size="small" label={edge.status} color={edge.status === 'healthy' ? 'success' : 'warning'} />
                          </ListItemButton>
                        ))}
                      </List>
                      {!edges.length && <Typography color="text.secondary">No edge status available.</Typography>}
                    </CardContent></Card>
                  </Stack>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </Box>

      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create CDN Distribution</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, mt: 1 }}>
          <TextField label="Name" value={createForm.name || ''} onChange={event => setCreateForm(prev => ({ ...prev, name: event.target.value }))} />
          <TextField label="Description" value={createForm.description || ''} onChange={event => setCreateForm(prev => ({ ...prev, description: event.target.value }))} />
          <TextField label="Origin Domain" value={createForm.origin_domain || ''} onChange={event => setCreateForm(prev => ({ ...prev, origin_domain: event.target.value }))} />
          <TextField label="Origin Path" value={createForm.origin_path || '/'} onChange={event => setCreateForm(prev => ({ ...prev, origin_path: event.target.value }))} />
          <TextField label="Custom Domains (comma separated)" value={(createForm.domain_names || []).join(',')} onChange={event => setCreateForm(prev => ({ ...prev, domain_names: event.target.value.split(',').map(value => value.trim()).filter(Boolean) }))} />
          <TextField select label="Price Class" value={createForm.price_class || 'all'} onChange={event => setCreateForm(prev => ({ ...prev, price_class: event.target.value as any }))}>
            <MenuItem value="100">100 (Low)</MenuItem>
            <MenuItem value="200">200</MenuItem>
            <MenuItem value="all">All Regions</MenuItem>
          </TextField>
          <TextField label="Default TTL (seconds)" type="number" value={createForm.default_ttl_seconds || 86400} onChange={event => setCreateForm(prev => ({ ...prev, default_ttl_seconds: Number(event.target.value) }))} />
          <FormControlLabel control={<Switch checked={!!createForm.require_https} onChange={event => setCreateForm(prev => ({ ...prev, require_https: event.target.checked }))} />} label="Require HTTPS" />
          <FormControlLabel control={<Switch checked={!!createForm.waf_enabled} onChange={event => setCreateForm(prev => ({ ...prev, waf_enabled: event.target.checked }))} />} label="Enable WAF" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreate(false)}>Cancel</Button>
          <Button variant="contained" onClick={createDistribution}>Create</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CDNPage;
