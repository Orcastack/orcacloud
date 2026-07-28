import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, Tabs, Tab, Chip, Stack,
  Table, TableHead, TableRow, TableCell, TableBody, CircularProgress,
  Alert, Button, Tooltip, IconButton, LinearProgress,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorIcon from '@mui/icons-material/Error';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import { useParams, useNavigate } from 'react-router-dom';
import {
  kubernetesApi,
  MonitorData,
  WorkloadRow,
  PodRow,
  ServiceRow,
  IngressRow,
  EventRow,
} from '../services/kubernetesApi';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const HealthIcon: React.FC<{ health: string }> = ({ health }) => {
  if (health === 'healthy')  return <CheckCircleIcon fontSize="small" color="success" />;
  if (health === 'degraded') return <WarningAmberIcon fontSize="small" color="warning" />;
  return <ErrorIcon fontSize="small" color="error" />;
};

const StatusChip: React.FC<{ label: string }> = ({ label }) => {
  const color =
    label === 'Running' || label === 'success' || label === 'healthy' ? 'success' :
    label === 'Pending' || label === 'partial'  ? 'warning' : 'error';
  return <Chip label={label} size="small" color={color} />;
};

// ─── Overview card ────────────────────────────────────────────────────────────

const OverviewCard: React.FC<{ data: MonitorData }> = ({ data }) => (
  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 1.5, mb: 2 }}>
    {[
      { label: 'Namespace',  value: data.namespace },
      { label: 'Sync status', value: data.last_sync_status ?? 'never' },
      { label: 'Last commit',  value: data.last_commit ? data.last_commit.slice(0, 8) : '—' },
      { label: 'Health',
        value: data.health?.status ?? '—',
        color: data.health?.status === 'healthy' ? 'success.main' : 'warning.main' },
      { label: 'Pods',  value: `${data.health?.ready_pods ?? 0}/${data.health?.total_pods ?? 0}` },
      { label: 'Warnings', value: String(data.health?.warnings ?? 0),
        color: (data.health?.warnings ?? 0) > 0 ? 'warning.main' : 'success.main' },
    ].map(({ label, value, color }) => (
      <Card key={label} variant="outlined">
        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Typography variant="caption" color="text.secondary">{label}</Typography>
          <Typography variant="body1" fontWeight={700} color={color}>{value}</Typography>
        </CardContent>
      </Card>
    ))}
  </Box>
);

// ─── Workloads tab ────────────────────────────────────────────────────────────

const WorkloadTable: React.FC<{ rows: WorkloadRow[]; title: string }> = ({ rows, title }) => (
  <Box mb={3}>
    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>{title}</Typography>
    {rows.length === 0 ? (
      <Typography variant="body2" color="text.secondary">None found in namespace.</Typography>
    ) : (
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Replicas</TableCell>
            <TableCell>Ready</TableCell>
            <TableCell>Health</TableCell>
            <TableCell>Age</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map(r => (
            <TableRow key={r.name} hover>
              <TableCell sx={{ fontFamily: 'monospace', fontSize: '.82rem' }}>{r.name}</TableCell>
              <TableCell>{r.replicas}</TableCell>
              <TableCell>{r.ready}/{r.replicas}</TableCell>
              <TableCell>
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <HealthIcon health={r.health} />
                  <span>{r.health}</span>
                </Stack>
              </TableCell>
              <TableCell>{r.age}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )}
  </Box>
);

// ─── Pods tab ────────────────────────────────────────────────────────────────

const PodsTable: React.FC<{ pods: PodRow[] }> = ({ pods }) => (
  <Table size="small">
    <TableHead>
      <TableRow>
        <TableCell>Pod</TableCell>
        <TableCell>Status</TableCell>
        <TableCell>Restarts</TableCell>
        <TableCell>Node</TableCell>
        <TableCell>Age</TableCell>
        <TableCell>Ready</TableCell>
      </TableRow>
    </TableHead>
    <TableBody>
      {pods.map(p => (
        <TableRow key={p.name} hover>
          <TableCell sx={{ fontFamily: 'monospace', fontSize: '.82rem' }}>{p.name}</TableCell>
          <TableCell><StatusChip label={p.status} /></TableCell>
          <TableCell>
            <Chip
              label={p.restarts}
              size="small"
              color={p.restarts > 5 ? 'error' : p.restarts > 0 ? 'warning' : 'default'}
            />
          </TableCell>
          <TableCell>{p.node}</TableCell>
          <TableCell>{p.age}</TableCell>
          <TableCell>
            {p.ready
              ? <CheckCircleIcon fontSize="small" color="success" />
              : <ErrorIcon fontSize="small" color="error" />}
          </TableCell>
        </TableRow>
      ))}
      {pods.length === 0 && (
        <TableRow>
          <TableCell colSpan={6}>
            <Typography variant="body2" color="text.secondary">No pods found.</Typography>
          </TableCell>
        </TableRow>
      )}
    </TableBody>
  </Table>
);

// ─── Networking tab ──────────────────────────────────────────────────────────

const NetworkingTab: React.FC<{ services: ServiceRow[]; ingresses: IngressRow[] }> = ({
  services, ingresses,
}) => (
  <Box>
    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Services</Typography>
    <Table size="small" sx={{ mb: 3 }}>
      <TableHead>
        <TableRow>
          <TableCell>Name</TableCell>
          <TableCell>Type</TableCell>
          <TableCell>Cluster IP</TableCell>
          <TableCell>Ports</TableCell>
          <TableCell>Age</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {services.map(s => (
          <TableRow key={s.name} hover>
            <TableCell sx={{ fontFamily: 'monospace', fontSize: '.82rem' }}>{s.name}</TableCell>
            <TableCell><Chip label={s.type} size="small" /></TableCell>
            <TableCell sx={{ fontFamily: 'monospace' }}>{s.cluster_ip}</TableCell>
            <TableCell>{s.ports.join(', ')}</TableCell>
            <TableCell>{s.age}</TableCell>
          </TableRow>
        ))}
        {services.length === 0 && (
          <TableRow><TableCell colSpan={5}>No services.</TableCell></TableRow>
        )}
      </TableBody>
    </Table>

    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Ingresses</Typography>
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Name</TableCell>
          <TableCell>Hosts</TableCell>
          <TableCell>TLS</TableCell>
          <TableCell>Address</TableCell>
          <TableCell>Age</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {ingresses.map(i => (
          <TableRow key={i.name} hover>
            <TableCell sx={{ fontFamily: 'monospace', fontSize: '.82rem' }}>{i.name}</TableCell>
            <TableCell>{i.hosts.join(', ')}</TableCell>
            <TableCell>
              {i.tls
                ? <Tooltip title="TLS enabled"><LockIcon fontSize="small" color="success" /></Tooltip>
                : <Tooltip title="No TLS"><LockOpenIcon fontSize="small" color="disabled" /></Tooltip>}
            </TableCell>
            <TableCell sx={{ fontFamily: 'monospace' }}>{i.address || '—'}</TableCell>
            <TableCell>{i.age}</TableCell>
          </TableRow>
        ))}
        {ingresses.length === 0 && (
          <TableRow><TableCell colSpan={5}>No ingresses.</TableCell></TableRow>
        )}
      </TableBody>
    </Table>
  </Box>
);

// ─── Events tab ────────────────────────────────────────────────────────────

const EventsTable: React.FC<{ events: EventRow[] }> = ({ events }) => (
  <Table size="small">
    <TableHead>
      <TableRow>
        <TableCell>Type</TableCell>
        <TableCell>Reason</TableCell>
        <TableCell>Object</TableCell>
        <TableCell>Message</TableCell>
        <TableCell>Count</TableCell>
        <TableCell>Age</TableCell>
      </TableRow>
    </TableHead>
    <TableBody>
      {events.map((e, i) => (
        <TableRow key={e.name ?? i} hover
          sx={{ bgcolor: e.type === 'Warning' ? 'warning.50' : undefined }}>
          <TableCell>
            <Chip
              label={e.type}
              size="small"
              color={e.type === 'Warning' ? 'warning' : 'default'}
            />
          </TableCell>
          <TableCell>{e.reason}</TableCell>
          <TableCell sx={{ fontFamily: 'monospace', fontSize: '.82rem' }}>{e.object}</TableCell>
          <TableCell sx={{ maxWidth: 350, whiteSpace: 'normal', wordBreak: 'break-word' }}>
            {e.message}
          </TableCell>
          <TableCell>{e.count}</TableCell>
          <TableCell>{e.age}</TableCell>
        </TableRow>
      ))}
      {events.length === 0 && (
        <TableRow>
          <TableCell colSpan={6}>
            <Typography variant="body2" color="text.secondary">No recent events.</Typography>
          </TableCell>
        </TableRow>
      )}
    </TableBody>
  </Table>
);

// ─── Main component ───────────────────────────────────────────────────────────

const KubernetesMonitorPage: React.FC = () => {
  const { configId } = useParams<{ configId: string }>();
  const navigate = useNavigate();

  const [tab, setTab]           = useState(0);
  const [data, setData]         = useState<MonitorData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (silent = false) => {
    if (!configId) return;
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError('');
    try {
      const res = await kubernetesApi.getMonitor(configId);
      setData(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.error ?? err?.message ?? 'Failed to load monitor data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [configId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-refresh every 30 s
  useEffect(() => {
    const interval = setInterval(() => fetchData(true), 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <Box sx={{ p: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
        <CircularProgress size={24} />
        <Typography>Loading monitor data…</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>Kubernetes Monitor</Typography>
          <Typography variant="body2" color="text.secondary">
            Live workloads, pods, networking, and events for this project's namespace.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Refresh">
            <IconButton onClick={() => fetchData(true)} disabled={refreshing}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button variant="outlined" size="small"
            onClick={() => navigate(`/developer/Dashboard/kubernetes/setup/${data?.namespace?.split('-')[1] ?? ''}`)}>
            Setup
          </Button>
          <Button variant="outlined" size="small" onClick={() => navigate(-1)}>
            Back
          </Button>
        </Stack>
      </Stack>

      {refreshing && <LinearProgress sx={{ mb: 1 }} />}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>
      )}

      {data && (
        <>
          <OverviewCard data={data} />

          <Card>
            <CardContent>
              <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
                <Tab label="Workloads" />
                <Tab label="Pods" />
                <Tab label="Networking" />
                <Tab label={`Events ${data.events.filter(e => e.type === 'Warning').length > 0
                  ? `(${data.events.filter(e => e.type === 'Warning').length} [WARN])` : ''}`} />
              </Tabs>

              {tab === 0 && (
                <>
                  <WorkloadTable title="Deployments"  rows={data.workloads.deployments} />
                  <WorkloadTable title="StatefulSets" rows={data.workloads.statefulsets} />
                  <WorkloadTable title="DaemonSets"   rows={data.workloads.daemonsets} />
                  <WorkloadTable title="Jobs"         rows={data.workloads.jobs} />
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>CronJobs</Typography>
                    {data.workloads.cronjobs.length === 0
                      ? <Typography variant="body2" color="text.secondary">None.</Typography>
                      : (
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Name</TableCell>
                              <TableCell>Schedule</TableCell>
                              <TableCell>Last Run</TableCell>
                              <TableCell>Last Status</TableCell>
                              <TableCell>Age</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {data.workloads.cronjobs.map(cj => (
                              <TableRow key={cj.name} hover>
                                <TableCell sx={{ fontFamily: 'monospace', fontSize: '.82rem' }}>{cj.name}</TableCell>
                                <TableCell sx={{ fontFamily: 'monospace' }}>{cj.schedule}</TableCell>
                                <TableCell>{cj.last_run}</TableCell>
                                <TableCell><StatusChip label={cj.last_status} /></TableCell>
                                <TableCell>{cj.age}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                  </Box>
                </>
              )}

              {tab === 1 && <PodsTable pods={data.pods} />}

              {tab === 2 && (
                <NetworkingTab
                  services={data.networking.services}
                  ingresses={data.networking.ingresses}
                />
              )}

              {tab === 3 && <EventsTable events={data.events} />}
            </CardContent>
          </Card>
        </>
      )}
    </Box>
  );
};

export default KubernetesMonitorPage;
