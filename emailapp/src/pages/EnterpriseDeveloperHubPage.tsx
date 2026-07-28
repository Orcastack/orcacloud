// OrcaCloud Enterprise Developer Hub
// Standalone developer hub page
// Route: /enterprise/:orgSlug/developer-hub

import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, IconButton, Chip,
  Grid, Card, CardContent, Paper, Tabs, Tab,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  Divider, CircularProgress,
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { listDevWorkspaces, deleteDevWorkspace, type DevWorkspace } from '../services/devWorkspaceApi';
import WorkspaceCreationWizard from '../components/Workspace/WorkspaceCreationWizard';
import DashboardTopBar from '../components/Layout/DashboardTopBar';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeveloperModeIcon from '@mui/icons-material/DeveloperMode';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import WorkspacesIcon from '@mui/icons-material/Workspaces';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import CircleIcon from '@mui/icons-material/Circle';
import LaunchIcon from '@mui/icons-material/Launch';

// ── Design tokens (mirrors BusinessWorkspacePage) ─────────────────────────
const T = {
  bg:     '#0d0f14',
  card:   '#13161d',
  border: '#1e2330',
  text:   '#e8eaf0',
  sub:    '#6b7080',
  brand:  '#5b6aff',
  green:  '#22c55e',
  yellow: '#eab308',
  red:    '#ef4444',
  blue:   '#3b82f6',
  purple: '#a855f7',
  font:   '"Inter", "Roboto", sans-serif',
};

const apiEndpoints = [
  { method: 'GET',    path: '/api/v1/organizations/:id',                              desc: 'Fetch organization details' },
  { method: 'GET',    path: '/api/v1/organizations/:id/members',                      desc: 'List organization members' },
  { method: 'POST',   path: '/api/v1/organizations/:id/orders',                       desc: 'Create a new order' },
  { method: 'GET',    path: '/api/v1/organizations/:id/orders',                       desc: 'List all orders' },
  { method: 'GET',    path: '/api/v1/organizations/:id/billing-subscription/current/',desc: 'Get active subscription' },
  { method: 'POST',   path: '/api/v1/auth/token/',                                    desc: 'Obtain auth token (JWT)' },
  { method: 'POST',   path: '/api/v1/auth/token/refresh/',                            desc: 'Refresh auth token' },
];

const sdks = [
  { name: 'Python SDK',   lang: 'Python',     status: 'stable',       version: 'v2.4.1', color: '#3776AB' },
  { name: 'Node.js SDK',  lang: 'JavaScript', status: 'stable',       version: 'v2.3.0', color: '#339933' },
  { name: 'Go SDK',       lang: 'Go',         status: 'beta',         version: 'v0.9.2', color: '#00ADD8' },
  { name: 'Ruby SDK',     lang: 'Ruby',       status: 'stable',       version: 'v1.8.0', color: '#CC342D' },
  { name: 'Java SDK',     lang: 'Java',       status: 'coming-soon',  version: '—',      color: '#007396' },
];

const webhookEvents = [
  'organization.updated', 'member.invited',      'member.removed',
  'order.created',        'order.completed',     'order.cancelled',
  'subscription.activated','subscription.cancelled',
  'billing.invoice_paid', 'billing.payment_failed',
];

const apiKeys = [
  { name: 'Production Key',  key: 'sk-prod-••••••••••••••', created: '2026-01-10', lastUsed: '2026-03-03', status: 'active' },
  { name: 'Development Key', key: 'sk-dev-••••••••••••••',  created: '2026-01-15', lastUsed: '2026-03-01', status: 'active' },
];

const wsStatusColor = (s: string) =>
  s === 'running' ? T.green : s === 'stopped' ? T.sub : T.yellow;

const methodColor = (m: string) =>
  m === 'GET' ? T.green : m === 'POST' ? T.brand : m === 'DELETE' ? T.red : T.yellow;

const EnterpriseDeveloperHubPage: React.FC = () => {
  const { orgSlug = '' } = useParams<{ orgSlug: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [workspaces, setWorkspaces] = useState<DevWorkspace[]>([]);
  const [wsLoading, setWsLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const refreshWorkspaces = () => {
    setWsLoading(true);
    listDevWorkspaces().then(data => setWorkspaces(data)).catch(() => {}).finally(() => setWsLoading(false));
  };

  useEffect(() => {
    if (tab === 4) refreshWorkspaces();
  }, [tab]);

  const handleDelete = async (workspaceId: string) => {
    await deleteDevWorkspace(workspaceId).catch(() => {});
    setWorkspaces(ws => ws.filter(w => w.workspace_id !== workspaceId));
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', bgcolor: T.bg, fontFamily: T.font, flexDirection: 'column' }}>

      {/* Top bar */}
      <DashboardTopBar
        routeBase={`/enterprise/${orgSlug}/overview`}
        leftContent={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DeveloperModeIcon sx={{ color: T.brand, fontSize: '1.1rem' }} />
            <Typography sx={{ color: T.text, fontWeight: 600, fontSize: '.95rem' }}>Developer Hub</Typography>
          </Box>
        }
        actions={
          <Chip
            label="Developer Hub"
            size="small"
            sx={{ bgcolor: `${T.brand}18`, color: T.brand, fontWeight: 600, fontSize: '.72rem', mr: 0.5 }}
          />
        }
      />

      {/* Body */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
        <Box sx={{ maxWidth: 1100, mx: 'auto' }}>

          {/* Back nav */}
          <Box
            onClick={() => navigate(`/enterprise/${orgSlug}/workspace/developer-hub`)}
            sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, mb: 2.5, cursor: 'pointer',
                  color: T.sub, '&:hover': { color: T.brand }, transition: 'color .15s' }}
          >
            <ArrowBackIcon sx={{ fontSize: '1rem' }} />
            <Typography sx={{ fontSize: '.83rem', fontWeight: 500 }}>Back to Workspace</Typography>
          </Box>

          {/* Hero */}
          <Box sx={{
            mb: 3, p: 3, borderRadius: 2,
            background: `linear-gradient(135deg, ${T.brand}18 0%, ${T.blue}10 50%, ${T.purple}10 100%)`,
            border: `1px solid ${T.brand}30`,
            display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap',
          }}>
            <Box sx={{ bgcolor: `${T.brand}15`, borderRadius: 2, p: 1.5, color: T.brand, display: 'flex', fontSize: '2.2rem' }}>
              <DeveloperModeIcon fontSize="inherit" />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ color: T.text, fontWeight: 800, fontSize: '1.4rem', lineHeight: 1.2 }}>
                Developer Hub
              </Typography>
              <Typography sx={{ color: T.sub, fontSize: '.88rem', mt: 0.5 }}>
                APIs, SDKs, webhooks & dev tools for your organisation
              </Typography>
            </Box>
          </Box>

          {/* Tabs */}
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            sx={{ mb: 3, '& .MuiTab-root': { fontWeight: 700, textTransform: 'none', fontSize: '.9rem', color: T.sub },
                  '& .Mui-selected': { color: `${T.brand} !important` },
                  '& .MuiTabs-indicator': { bgcolor: T.brand } }}
          >
            <Tab label="REST API" />
            <Tab label="SDKs" />
            <Tab label="Webhooks" />
            <Tab label="API Keys" />
            <Tab label="Workspaces" />
          </Tabs>

          {/* ── REST API ── */}
          {tab === 0 && (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography sx={{ color: T.text, fontWeight: 700 }}>API Reference</Typography>
                <Button size="small" variant="outlined" endIcon={<OpenInNewIcon />}
                  sx={{ borderColor: T.border, color: T.sub, textTransform: 'none',
                        '&:hover': { borderColor: T.brand, color: T.brand } }}>
                  Full Docs
                </Button>
              </Box>
              <Card sx={{ bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 2, overflow: 'hidden' }}>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: `${T.brand}08` }}>
                        <TableCell sx={{ color: T.sub, fontWeight: 700, fontSize: '.75rem', textTransform: 'uppercase' }}>Method</TableCell>
                        <TableCell sx={{ color: T.sub, fontWeight: 700, fontSize: '.75rem', textTransform: 'uppercase' }}>Endpoint</TableCell>
                        <TableCell sx={{ color: T.sub, fontWeight: 700, fontSize: '.75rem', textTransform: 'uppercase' }}>Description</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {apiEndpoints.map((e, i) => (
                        <TableRow key={i} hover sx={{ '&:hover': { bgcolor: `${T.brand}06` } }}>
                          <TableCell>
                            <Chip label={e.method} size="small"
                              sx={{ bgcolor: `${methodColor(e.method)}20`, color: methodColor(e.method),
                                   fontWeight: 700, fontSize: '.7rem', height: 20, minWidth: 48,
                                   '& .MuiChip-label': { px: 0.75 } }} />
                          </TableCell>
                          <TableCell sx={{ color: T.text, fontFamily: 'monospace', fontSize: '.82rem' }}>{e.path}</TableCell>
                          <TableCell sx={{ color: T.sub, fontSize: '.83rem' }}>{e.desc}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Card>
            </Box>
          )}

          {/* ── SDKs ── */}
          {tab === 1 && (
            <Grid container spacing={2}>
              {sdks.map(sdk => (
                <Grid key={sdk.name} item xs={12} sm={6} md={4}>
                  <Card sx={{ bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 2, p: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: sdk.color, flexShrink: 0 }} />
                      <Typography sx={{ color: T.text, fontWeight: 700, fontSize: '.95rem' }}>{sdk.name}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Chip label={sdk.status} size="small" sx={{
                        bgcolor: sdk.status === 'stable' ? `${T.green}18` : sdk.status === 'beta' ? `${T.yellow}18` : `${T.sub}18`,
                        color:   sdk.status === 'stable' ? T.green   : sdk.status === 'beta' ? T.yellow   : T.sub,
                        fontSize: '.72rem',
                      }} />
                      <Typography sx={{ color: T.sub, fontSize: '.8rem', fontFamily: 'monospace' }}>{sdk.version}</Typography>
                    </Box>
                    {sdk.status !== 'coming-soon' && (
                      <Button size="small" variant="outlined" fullWidth sx={{
                        mt: 1.5, borderColor: T.border, color: T.sub, textTransform: 'none',
                        '&:hover': { borderColor: T.brand, color: T.brand },
                      }}>
                        Install
                      </Button>
                    )}
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}

          {/* ── Webhooks ── */}
          {tab === 2 && (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography sx={{ color: T.text, fontWeight: 700 }}>Webhook Events</Typography>
                <Button size="small" variant="contained" startIcon={<AddIcon />}
                  sx={{ bgcolor: T.brand, textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: T.brand } }}>
                  Add Endpoint
                </Button>
              </Box>
              <Grid container spacing={1}>
                {webhookEvents.map(ev => (
                  <Grid key={ev} item xs={12} sm={6} md={4}>
                    <Paper sx={{ bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 1.5, px: 2, py: 1.25,
                                 display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: T.green, flexShrink: 0 }} />
                      <Typography sx={{ color: T.text, fontFamily: 'monospace', fontSize: '.82rem' }}>{ev}</Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {/* ── API Keys ── */}
          {tab === 3 && (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography sx={{ color: T.text, fontWeight: 700 }}>API Keys</Typography>
                <Button size="small" variant="contained" startIcon={<AddIcon />}
                  sx={{ bgcolor: T.brand, textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: T.brand } }}>
                  Generate Key
                </Button>
              </Box>
              {apiKeys.map((k, i) => (
                <Card key={i} sx={{ bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 2, mb: 1.5 }}>
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                      <Box>
                        <Typography sx={{ color: T.text, fontWeight: 700, fontSize: '.9rem' }}>{k.name}</Typography>
                        <Typography sx={{ color: T.sub, fontFamily: 'monospace', fontSize: '.8rem', mt: 0.25 }}>{k.key}</Typography>
                        <Typography sx={{ color: T.sub, fontSize: '.72rem', mt: 0.25 }}>
                          Created {k.created} &nbsp;·&nbsp; Last used {k.lastUsed}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Chip label={k.status} size="small" sx={{ bgcolor: `${T.green}18`, color: T.green, fontSize: '.72rem' }} />
                        <IconButton size="small" sx={{ color: T.sub }}><ContentCopyIcon sx={{ fontSize: '1rem' }} /></IconButton>
                        <IconButton size="small" sx={{ color: T.sub, '&:hover': { color: T.red } }}><DeleteIcon sx={{ fontSize: '1rem' }} /></IconButton>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}

          {/* ── Workspaces ── */}
          {tab === 4 && (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography sx={{ color: T.text, fontWeight: 700 }}>Developer Workspaces</Typography>
                <Button size="small" variant="contained" startIcon={<AddIcon />}
                  onClick={() => setCreateOpen(true)}
                  sx={{ bgcolor: T.brand, textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: T.brand } }}>
                  Create Workspace
                </Button>
              </Box>

              {wsLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                  <CircularProgress sx={{ color: T.brand }} size={32} />
                </Box>
              ) : workspaces.length === 0 ? (
                <Card sx={{ bgcolor: T.card, border: `1px dashed ${T.border}`, borderRadius: 2 }}>
                  <CardContent sx={{ textAlign: 'center', py: 5 }}>
                    <WorkspacesIcon sx={{ color: T.sub, fontSize: '2.5rem', mb: 1, opacity: 0.4 }} />
                    <Typography sx={{ color: T.sub, fontSize: '.9rem', mb: 2 }}>No workspaces yet.</Typography>
                    <Button variant="outlined" startIcon={<AddIcon />}
                      onClick={() => setCreateOpen(true)}
                      sx={{ borderColor: T.border, color: T.sub, textTransform: 'none',
                            '&:hover': { borderColor: T.brand, color: T.brand } }}>
                      Create First Workspace
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Grid container spacing={2}>
                  {workspaces.map(ws => (
                    <Grid key={ws.id} item xs={12} md={6} lg={4}>
                      <Card sx={{ bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 2, p: 2,
                                  transition: 'border-color .15s', '&:hover': { borderColor: T.brand } }}>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                            <Box sx={{ bgcolor: `${T.brand}18`, borderRadius: 1.5, p: 0.8, display: 'flex', color: T.brand }}>
                              <FolderOpenIcon sx={{ fontSize: '1.1rem' }} />
                            </Box>
                            <Box>
                              <Typography sx={{ color: T.text, fontWeight: 700, fontSize: '.9rem', fontFamily: 'monospace' }}>
                                {ws.display_name}
                              </Typography>
                              <Typography sx={{ color: T.sub, fontSize: '.72rem' }}>{ws.region}</Typography>
                            </Box>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <CircleIcon sx={{ fontSize: '.55rem', color: wsStatusColor(ws.status) }} />
                            <Typography sx={{ color: wsStatusColor(ws.status), fontSize: '.72rem', fontWeight: 600 }}>
                              {ws.status}
                            </Typography>
                          </Box>
                        </Box>

                        <Divider sx={{ borderColor: T.border, mb: 1.5 }} />

                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
                          <Chip label={ws.image} size="small" sx={{ bgcolor: `${T.blue}18`, color: T.blue, fontSize: '.7rem' }} />
                          <Chip label={ws.ide}   size="small" sx={{ bgcolor: `${T.purple}18`, color: T.purple, fontSize: '.7rem' }} />
                        </Box>

                        <Typography sx={{ color: T.sub, fontSize: '.72rem', mb: 1.5 }}>
                          Created {ws.created_at?.slice(0, 10)}
                        </Typography>

                        <Button size="small" variant="outlined" fullWidth endIcon={<LaunchIcon />}
                          onClick={() => navigate(`/developer/Dashboard/workspace/${ws.workspace_id}`)}
                          sx={{ borderColor: T.border, color: T.sub, textTransform: 'none', fontSize: '.78rem',
                                flex: 1, '&:hover': { borderColor: T.brand, color: T.brand } }}>
                          Open
                        </Button>
                        <IconButton size="small"
                          onClick={() => handleDelete(ws.workspace_id)}
                          sx={{ color: T.sub, border: `1px solid ${T.border}`, borderRadius: 1, px: 0.75,
                                '&:hover': { color: T.red, borderColor: T.red } }}>
                          <DeleteIcon sx={{ fontSize: '.9rem' }} />
                        </IconButton>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Box>
          )}

        </Box>
      </Box>

      {/* ── Create Workspace Wizard ── */}
      <WorkspaceCreationWizard
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={ws => { setWorkspaces(prev => [ws, ...prev]); setTab(4); }}
      />
    </Box>
  );
};

export default EnterpriseDeveloperHubPage;
