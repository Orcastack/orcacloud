import React, { useCallback, useEffect, useState } from 'react';
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
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import BoltIcon from '@mui/icons-material/Bolt';
import { serverlessApi } from '../services/cloudApi';
import type { CreateServerlessFunctionPayload, ServerlessFunction } from '../types/kubernetes';
import { dashboardCardSx, dashboardPrimaryButtonSx, dashboardTokens } from '../styles/dashboardDesignSystem';

const STATUS_COLOR: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  running: 'success',
  provisioning: 'warning',
  pending: 'warning',
  error: 'error',
};

const ServerlessPage: React.FC = () => {
  const [functions, setFunctions] = useState<ServerlessFunction[]>([]);
  const [selected, setSelected] = useState<ServerlessFunction | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState(0);
  const [openCreate, setOpenCreate] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [invokePayload, setInvokePayload] = useState('{\n  "name": "World"\n}');
  const [invokeResult, setInvokeResult] = useState('');

  const [form, setForm] = useState<CreateServerlessFunctionPayload>({
    name: '',
    description: '',
    runtime: 'nodejs20',
    handler: 'index.handler',
    code_uri: 'ghcr.io/atonix/functions/hello:latest',
    memory_mb: 256,
    timeout_seconds: 30,
    environment_variables: {},
  });

  const load = useCallback(() => {
    setLoading(true);
    serverlessApi.list()
      .then((r: any) => {
        const items = r.data?.results ?? r.data ?? [];
        setFunctions(items);
        if (!selected && items.length) setSelected(items[0]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selected]);

  useEffect(() => { load(); }, [load]);

  const loadDetails = useCallback((functionId: string) => {
    serverlessApi.get(functionId).then((r: any) => setSelected(r.data)).catch(() => {});
    serverlessApi.logs(functionId).then((r: any) => setLogs(r.data?.entries ?? [])).catch(() => setLogs([]));
    serverlessApi.metrics(functionId).then((r: any) => setMetrics(r.data)).catch(() => setMetrics(null));
  }, []);

  useEffect(() => {
    if (selected?.resource_id) loadDetails(selected.resource_id);
  }, [selected?.resource_id, loadDetails]);

  const createFunction = async () => {
    if (!form.name.trim()) return;
    await serverlessApi.create(form);
    setOpenCreate(false);
    setForm(prev => ({ ...prev, name: '', description: '' }));
    load();
  };

  const invoke = async () => {
    if (!selected) return;
    let payload: Record<string, any> = {};
    try {
      payload = JSON.parse(invokePayload || '{}');
    } catch {
      return;
    }
    const response = await serverlessApi.invoke(selected.resource_id, payload);
    setInvokeResult(JSON.stringify(response.data, null, 2));
    loadDetails(selected.resource_id);
  };

  const addHttpTrigger = async () => {
    if (!selected) return;
    await serverlessApi.addTrigger(selected.resource_id, 'http', { path: `/${selected.name}` });
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: dashboardTokens.colors.background, minHeight: '100%' }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Serverless Functions</Typography>
          <Typography variant="body2" color="text.secondary">Deploy event-driven functions on Kubernetes runtime.</Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={load}>Refresh</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenCreate(true)} sx={dashboardPrimaryButtonSx}>Create Function</Button>
        </Stack>
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '320px 1fr' }, gap: 2 }}>
        <Card sx={dashboardCardSx}>
          <CardContent>
            <Typography fontWeight={600} mb={1}>Functions</Typography>
            <List sx={{ p: 0 }}>
              {functions.map(fn => (
                <ListItemButton
                  key={fn.resource_id}
                  selected={selected?.resource_id === fn.resource_id}
                  onClick={() => setSelected(fn)}
                  sx={{ borderRadius: 1, mb: 0.5 }}
                >
                  <ListItemText primary={fn.name} secondary={`${fn.runtime} • ${fn.memory_mb}MB`} />
                  <Chip size="small" label={fn.status} color={STATUS_COLOR[fn.status] ?? 'default'} />
                </ListItemButton>
              ))}
            </List>
          </CardContent>
        </Card>

        <Card sx={dashboardCardSx}>
          <CardContent>
            {!selected ? (
              <Typography color="text.secondary">Select a function to view details.</Typography>
            ) : (
              <>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="h6" fontWeight={700}>{selected.name}</Typography>
                    <Typography variant="body2" color="text.secondary">{selected.runtime} • {selected.handler}</Typography>
                  </Box>
                  <Stack direction="row" spacing={1}>
                    <Chip size="small" icon={<BoltIcon />} label={`${selected.invocation_count} invocations`} />
                    <Button size="small" variant="outlined" onClick={addHttpTrigger}>Add HTTP Trigger</Button>
                  </Stack>
                </Stack>
                <Divider sx={{ my: 1.5 }} />

                <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mb: 2 }}>
                  <Tab label="Invoke" />
                  <Tab label="Metrics" />
                  <Tab label="Logs" />
                </Tabs>

                {tab === 0 && (
                  <Box>
                    <TextField multiline minRows={8} fullWidth value={invokePayload} onChange={(event) => setInvokePayload(event.target.value)} />
                    <Stack direction="row" justifyContent="flex-end" mt={1} mb={1}>
                      <Button variant="contained" startIcon={<PlayArrowIcon />} onClick={invoke} sx={dashboardPrimaryButtonSx}>Invoke</Button>
                    </Stack>
                    <TextField multiline minRows={8} fullWidth value={invokeResult} InputProps={{ readOnly: true }} placeholder="Invocation result appears here" />
                  </Box>
                )}

                {tab === 1 && (
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 1 }}>
                    <Card variant="outlined"><CardContent><Typography variant="caption" color="text.secondary">Invocations</Typography><Typography variant="h6">{metrics?.invocations ?? 0}</Typography></CardContent></Card>
                    <Card variant="outlined"><CardContent><Typography variant="caption" color="text.secondary">Error Rate</Typography><Typography variant="h6">{metrics?.error_rate_percent ?? 0}%</Typography></CardContent></Card>
                    <Card variant="outlined"><CardContent><Typography variant="caption" color="text.secondary">Avg Duration</Typography><Typography variant="h6">{metrics?.avg_duration_ms ?? 0}ms</Typography></CardContent></Card>
                    <Card variant="outlined"><CardContent><Typography variant="caption" color="text.secondary">P95 Duration</Typography><Typography variant="h6">{metrics?.p95_duration_ms ?? 0}ms</Typography></CardContent></Card>
                  </Box>
                )}

                {tab === 2 && (
                  <List sx={{ p: 0 }}>
                    {logs.map((entry: any, index) => (
                      <ListItemButton key={`${entry.timestamp}-${index}`} sx={{ borderRadius: 1, mb: 0.5 }}>
                        <ListItemText
                          primary={`${entry.level}: ${entry.message}`}
                          secondary={entry.timestamp}
                        />
                      </ListItemButton>
                    ))}
                    {!logs.length && <Typography color="text.secondary">No logs available.</Typography>}
                  </List>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </Box>

      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Serverless Function</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, mt: 1 }}>
          <TextField label="Name" value={form.name} onChange={(event) => setForm(prev => ({ ...prev, name: event.target.value }))} />
          <TextField label="Description" value={form.description || ''} onChange={(event) => setForm(prev => ({ ...prev, description: event.target.value }))} />
          <TextField select label="Runtime" value={form.runtime} onChange={(event) => setForm(prev => ({ ...prev, runtime: event.target.value }))}>
            <MenuItem value="nodejs20">Node.js 20</MenuItem>
            <MenuItem value="python3.11">Python 3.11</MenuItem>
            <MenuItem value="go1.21">Go 1.21</MenuItem>
          </TextField>
          <TextField label="Handler" value={form.handler} onChange={(event) => setForm(prev => ({ ...prev, handler: event.target.value }))} />
          <TextField label="Code URI / Image" value={form.code_uri} onChange={(event) => setForm(prev => ({ ...prev, code_uri: event.target.value }))} />
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
            <TextField label="Memory (MB)" type="number" value={form.memory_mb} onChange={(event) => setForm(prev => ({ ...prev, memory_mb: Number(event.target.value) }))} />
            <TextField label="Timeout (sec)" type="number" value={form.timeout_seconds} onChange={(event) => setForm(prev => ({ ...prev, timeout_seconds: Number(event.target.value) }))} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreate(false)}>Cancel</Button>
          <Button variant="contained" onClick={createFunction} sx={dashboardPrimaryButtonSx}>Create</Button>
        </DialogActions>
      </Dialog>

      {loading && <Typography color="text.secondary" mt={2}>Loading functions...</Typography>}
    </Box>
  );
};

export default ServerlessPage;
