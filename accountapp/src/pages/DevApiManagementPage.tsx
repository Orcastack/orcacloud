// OrcaCloud – API Management Hub
// Developer dashboard sector: full control-plane UI.

import React, { useCallback, useEffect, useState } from 'react'
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, FormControl, IconButton,
  InputLabel, MenuItem, Paper, Select, Switch, Tab, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Tabs, TextField,
  Tooltip, Typography,
} from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import AddIcon from '@mui/icons-material/Add'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import LockIcon from '@mui/icons-material/Lock'
import AutorenewIcon from '@mui/icons-material/Autorenew'
import BlockIcon from '@mui/icons-material/Block'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'

import {
  ApimOverview, ApiDefinition, ApiGateway, ApiConsumer, ApiKey,
  ApiProduct, ApiPolicy, ApimAnalytics, ApimAuditEntry,
  getApimOverview, getApis, createApi, deprecateApi, activateApi,
  getGateways, getConsumers, getKeys, generateKey, revokeKey, rotateKey,
  getProducts, getPolicies, togglePolicy,
  getApimAnalytics, getApimAuditLog,
} from '../services/apiManagementApi'

// ─── Colour palettes ──────────────────────────────────────────────────────────


const STATUS_COLOR: Record<string, 'success' | 'warning' | 'error' | 'default' | 'info'> = {
  active: 'success', draft: 'default', deprecated: 'warning', retired: 'error',
  published: 'success', archived: 'default',
}

const KEY_STATUS_COLOR: Record<string, 'success' | 'error' | 'warning' | 'default'> = {
  active: 'success', revoked: 'error', expired: 'warning', rotating: 'default',
}

const TIER_COLOR: Record<string, string> = {
  free: '#78909c', starter: '#42a5f5', professional: '#7e57c2',
  enterprise: '#ffa726', custom: '#153d75',
}

const POLICY_COLOR: Record<string, string> = {
  rate_limit: '#ef5350', auth: '#5c6bc0', cors: '#153d75',
  transform: '#ff7043', cache: '#66bb6a', ip_filter: '#ffa726',
  circuit_break: '#ec407a', retry: '#29b6f6', logging: '#78909c', custom: '#ab47bc',
}

const ACTION_LABEL: Record<string, string> = {
  api_created: 'API Created', api_updated: 'API Updated',
  api_deprecated: 'API Deprecated', api_deleted: 'API Deleted',
  gateway_registered: 'GW Registered', gateway_updated: 'GW Updated',
  consumer_created: 'Consumer Created', key_generated: 'Key Generated',
  key_revoked: 'Key Revoked', key_rotated: 'Key Rotated',
  policy_attached: 'Policy Attached', policy_detached: 'Policy Detached',
  product_created: 'Product Created', product_updated: 'Product Updated',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function Sparkline({ values, color = '#42a5f5', height = 40 }: { values: number[]; color?: string; height?: number }) {
  if (!values?.length) return null
  const max = Math.max(...values) || 1
  const min = Math.min(...values)
  const w = 120
  const h = height
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w
    const y = h - ((v - min) / (max - min || 1)) * (h - 4) - 2
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function StatCard({
  label, value, sub, color = '#42a5f5', sparkline, sparkColor,
}: {
  label: string; value: string | number; sub?: string; color?: string; sparkline?: number[]; sparkColor?: string
}) {
  return (
    <Paper sx={{ p: 2, flex: '1 1 200px', minWidth: 180 }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="h5" fontWeight={700} color={color}>{value}</Typography>
      {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
      {sparkline && <Box mt={0.5}><Sparkline values={sparkline} color={sparkColor ?? color} /></Box>}
    </Paper>
  )
}

function HealthIcon({ health }: { health: string }) {
  if (health === 'healthy')   return <CheckCircleIcon fontSize="small" color="success" />
  if (health === 'degraded')  return <WarningAmberIcon fontSize="small" color="warning" />
  if (health === 'unhealthy') return <ErrorOutlineIcon fontSize="small" color="error" />
  return <HelpOutlineIcon fontSize="small" color="disabled" />
}

// ─── Tab 0 – Overview ─────────────────────────────────────────────────────────

function OverviewTab({ overview, audit }: { overview: ApimOverview | null; audit: ApimAuditEntry[] }) {
  if (!overview) return <Box p={3}><CircularProgress /></Box>
  const { apis, gateways, consumers, traffic, top_apis } = overview
  return (
    <Box>
      <Box display="flex" flexWrap="wrap" gap={2} mb={3}>
        <StatCard label="Total APIs"      value={apis.total}        sub={`${apis.active} active`}               color="#42a5f5" sparkline={overview.request_sparkline}  sparkColor="#42a5f5" />
        <StatCard label="Active Gateways" value={gateways.healthy}  sub={`${gateways.total} total`}             color="#66bb6a" />
        <StatCard label="Consumers"       value={consumers.total}   sub={`${consumers.active_keys} keys live`}  color="#ffa726" />
        <StatCard label="Total Requests"  value={fmtNum(traffic.total_requests)} sub={`${traffic.error_rate.toFixed(2)}% err`} color="#5c6bc0" sparkline={overview.request_sparkline} sparkColor="#5c6bc0" />
        <StatCard label="Avg Latency"     value={`${traffic.avg_latency_ms.toFixed(0)}ms`} sub="Avg across all APIs" color="#ef5350" sparkline={overview.latency_sparkline} sparkColor="#ef5350" />
      </Box>

      <Typography variant="subtitle2" fontWeight={700} mb={1}>Gateway Health</Typography>
      <Box display="flex" flexWrap="wrap" gap={1} mb={3}>
        {[
          { label: `${gateways.healthy} Healthy`,   color: 'success' as const },
          { label: `${gateways.degraded} Degraded`, color: 'warning' as const },
          { label: `${gateways.unhealthy} Down`,    color: 'error' as const },
        ].map(({ label, color }) => (
          <Chip key={label} label={label} color={color} size="small" />
        ))}
      </Box>

      <Typography variant="subtitle2" fontWeight={700} mb={1}>Top APIs by Traffic</Typography>
      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {['Name', 'Version', 'Env', 'Status', 'Requests', 'Errors', 'Avg Latency'].map(h => (
                <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {(top_apis ?? []).map((api: any) => (
              <TableRow key={api.id} hover>
                <TableCell sx={{ fontWeight: 500 }}>{api.name}</TableCell>
                <TableCell><Chip label={api.version} size="small" /></TableCell>
                <TableCell><Chip label={api.environment} size="small" variant="outlined" /></TableCell>
                <TableCell><Chip label={api.status} size="small" color={STATUS_COLOR[api.status] ?? 'default'} /></TableCell>
                <TableCell>{fmtNum(api.request_count ?? 0)}</TableCell>
                <TableCell sx={{ color: api.error_count > 100 ? '#ef5350' : 'inherit' }}>{api.error_count ?? 0}</TableCell>
                <TableCell>{api.avg_latency_ms ? `${api.avg_latency_ms}ms` : '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography variant="subtitle2" fontWeight={700} mb={1}>Recent Activity</Typography>
      <Paper sx={{ p: 0, overflow: 'hidden' }}>
        {audit.slice(0, 8).map((e, i) => (
          <Box key={e.id ?? i}>
            {i > 0 && <Divider />}
            <Box display="flex" alignItems="center" gap={2} px={2} py={1}>
              <Chip label={ACTION_LABEL[e.action] ?? e.action} size="small"
                sx={{ bgcolor: '#393939', color: '#c6c6c6', fontWeight: 600, fontSize: 10 }} />
              <Typography variant="body2" fontWeight={500}>{e.entity_name}</Typography>
              <Typography variant="caption" color="text.secondary">by {e.actor}</Typography>
              <Box flexGrow={1} />
              <Typography variant="caption" color="text.secondary">{relTime(e.created_at)}</Typography>
            </Box>
          </Box>
        ))}
      </Paper>
    </Box>
  )
}

// ─── Tab 1 – APIs ─────────────────────────────────────────────────────────────

function ApisTab({ environment, onRefresh: _onRefresh }: { environment: string; onRefresh: () => void }) {
  const [apis, setApis] = useState<ApiDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', version: 'v1', base_path: '', upstream_url: '', protocol: 'rest', auth_type: 'none', environment, description: '' })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const rows = await getApis({ environment: environment || undefined, status: statusFilter || undefined, search: search || undefined })
      setApis(rows)
    } catch { setApis([]) }
    setLoading(false)
  }, [environment, statusFilter, search])

  useEffect(() => { load() }, [load])

  async function handleDeprecate(id: string) { await deprecateApi(id); load() }
  async function handleActivate(id: string)  { await activateApi(id);  load() }
  async function handleCreate() {
    setSaving(true)
    try { await createApi(form as any); setShowCreate(false); load(); setToast('API created') }
    catch { setToast('Failed to create API') }
    setSaving(false)
  }

  return (
    <Box>
      <Box display="flex" flexWrap="wrap" gap={2} mb={2} alignItems="center">
        <TextField size="small" label="Search" value={search} onChange={e => setSearch(e.target.value)} sx={{ width: 200 }} />
        <FormControl size="small" sx={{ width: 140 }}>
          <InputLabel>Status</InputLabel>
          <Select value={statusFilter} label="Status" onChange={e => setStatusFilter(e.target.value)}>
            <MenuItem value="">All</MenuItem>
            {['draft', 'active', 'deprecated', 'retired'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </Select>
        </FormControl>
        <Button size="small" onClick={load} variant="outlined" startIcon={<RefreshIcon />}>Refresh</Button>
        <Box flexGrow={1} />
        <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setShowCreate(true)}>New API</Button>
      </Box>

      {toast && <Alert severity="info" onClose={() => setToast('')} sx={{ mb: 2 }}>{toast}</Alert>}

      {loading
        ? <Box textAlign="center" py={4}><CircularProgress /></Box>
        : (
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['Name', 'Version', 'Protocol', 'Auth', 'Status', 'Base Path', 'Requests', 'Errors', 'Latency', 'Actions'].map(h => (
                    <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {apis.map(api => (
                  <TableRow key={api.id} hover>
                    <TableCell sx={{ fontWeight: 500 }}>{api.name}</TableCell>
                    <TableCell><Chip label={api.version} size="small" /></TableCell>
                    <TableCell>
                      <Chip label={api.protocol.toUpperCase()} size="small" sx={{ bgcolor: '#1e3a5f', color: '#90caf9' }} />
                    </TableCell>
                    <TableCell>
                      <Chip label={api.auth_type} size="small"
                        sx={{ bgcolor: api.auth_type === 'none' ? '#37474f' : '#1b3a2f', color: api.auth_type === 'none' ? '#90a4ae' : '#69f0ae' }} />
                    </TableCell>
                    <TableCell><Chip label={api.status} size="small" color={STATUS_COLOR[api.status] ?? 'default'} /></TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{api.base_path}</TableCell>
                    <TableCell>{fmtNum(api.request_count)}</TableCell>
                    <TableCell sx={{ color: api.error_count > 50 ? '#ef5350' : 'inherit' }}>{api.error_count}</TableCell>
                    <TableCell>{api.avg_latency_ms ? `${api.avg_latency_ms}ms` : '—'}</TableCell>
                    <TableCell>
                      {api.status === 'active' && (
                        <Tooltip title="Deprecate">
                          <IconButton size="small" onClick={() => handleDeprecate(api.id)}><WarningAmberIcon fontSize="small" /></IconButton>
                        </Tooltip>
                      )}
                      {api.status === 'deprecated' && (
                        <Tooltip title="Activate">
                          <IconButton size="small" color="success" onClick={() => handleActivate(api.id)}><CheckCircleIcon fontSize="small" /></IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {!apis.length && (
                  <TableRow>
                    <TableCell colSpan={10} align="center" sx={{ color: 'text.secondary', py: 4 }}>
                      No APIs found. Create your first API.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )
      }

      <Dialog open={showCreate} onClose={() => setShowCreate(false)} maxWidth="sm" fullWidth>
        <DialogTitle>New API Definition</DialogTitle>
        <DialogContent sx={{ pt: '16px !important' }}>
          <Box display="flex" flexDirection="column" gap={2}>
            <TextField label="Name" size="small" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <Box display="flex" gap={2}>
              <TextField label="Version" size="small" value={form.version} onChange={e => setForm(f => ({ ...f, version: e.target.value }))} />
              <FormControl size="small" sx={{ flex: 1 }}>
                <InputLabel>Protocol</InputLabel>
                <Select value={form.protocol} label="Protocol" onChange={e => setForm(f => ({ ...f, protocol: e.target.value }))}>
                  {['rest', 'graphql', 'grpc', 'ws'].map(p => <MenuItem key={p} value={p}>{p.toUpperCase()}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ flex: 1 }}>
                <InputLabel>Auth</InputLabel>
                <Select value={form.auth_type} label="Auth" onChange={e => setForm(f => ({ ...f, auth_type: e.target.value }))}>
                  {['none', 'apikey', 'jwt', 'oauth2', 'mtls', 'basic'].map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
                </Select>
              </FormControl>
            </Box>
            <TextField label="Base Path" size="small" placeholder="/api/v1" value={form.base_path} onChange={e => setForm(f => ({ ...f, base_path: e.target.value }))} />
            <TextField label="Upstream URL" size="small" placeholder="http://backend:8000" value={form.upstream_url} onChange={e => setForm(f => ({ ...f, upstream_url: e.target.value }))} />
            <TextField label="Description" size="small" multiline rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreate(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={saving || !form.name}>
            {saving ? <CircularProgress size={18} /> : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

// ─── Tab 2 – Gateways ────────────────────────────────────────────────────────

function GatewaysTab({ environment }: { environment: string }) {
  const [gateways, setGateways] = useState<ApiGateway[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try { setGateways(await getGateways({ environment: environment || undefined })) }
    catch { setGateways([]) }
    setLoading(false)
  }, [environment])

  useEffect(() => { load() }, [load])

  return (
    <Box>
      <Box display="flex" justifyContent="flex-end" mb={2}>
        <Button size="small" variant="outlined" startIcon={<RefreshIcon />} onClick={load}>Refresh</Button>
      </Box>
      {loading
        ? <Box textAlign="center" py={4}><CircularProgress /></Box>
        : (
          <Box display="flex" flexWrap="wrap" gap={2}>
            {gateways.map(gw => (
              <Paper key={gw.id} sx={{
                flex: '1 1 280px', p: 2, border: '1px solid',
                borderColor: gw.health === 'healthy' ? '#1b5e20' : gw.health === 'degraded' ? '#7f6000' : '#7f1d1d',
              }}>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <HealthIcon health={gw.health} />
                  <Typography fontWeight={700}>{gw.name}</Typography>
                  <Box flexGrow={1} />
                  <Chip label={gw.engine.toUpperCase()} size="small" sx={{ bgcolor: '#1a237e', color: '#90caf9' }} />
                </Box>
                <Box display="flex" gap={1} mb={1.5}>
                  <Chip label={gw.environment} size="small" variant="outlined" />
                  {gw.region && <Chip label={gw.region} size="small" variant="outlined" />}
                </Box>
                <Box display="flex" flexWrap="wrap" gap={2}>
                  <Box><Typography variant="caption" color="text.secondary">Active APIs</Typography><Typography fontWeight={700}>{gw.active_apis}</Typography></Box>
                  <Box><Typography variant="caption" color="text.secondary">Req/s</Typography><Typography fontWeight={700}>{gw.request_rate?.toFixed(0) ?? '—'}</Typography></Box>
                  <Box><Typography variant="caption" color="text.secondary">Error %</Typography>
                    <Typography fontWeight={700} sx={{ color: (gw.error_rate ?? 0) > 2 ? '#ef5350' : 'inherit' }}>
                      {gw.error_rate?.toFixed(2) ?? '—'}%
                    </Typography>
                  </Box>
                  <Box><Typography variant="caption" color="text.secondary">P99</Typography><Typography fontWeight={700}>{gw.latency_p99_ms?.toFixed(0) ?? '—'}ms</Typography></Box>
                  <Box><Typography variant="caption" color="text.secondary">Uptime</Typography><Typography fontWeight={700} color="success.main">{gw.uptime_percent?.toFixed(3) ?? '—'}%</Typography></Box>
                </Box>
                {gw.last_seen && (
                  <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                    Last seen {relTime(gw.last_seen)}
                  </Typography>
                )}
              </Paper>
            ))}
          </Box>
        )
      }
    </Box>
  )
}

// ─── Tab 3 – Consumers & Keys ────────────────────────────────────────────────

function ConsumersTab({ environment }: { environment: string }) {
  const [consumers, setConsumers] = useState<ApiConsumer[]>([])
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [selected, setSelected] = useState<ApiConsumer | null>(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')
  const [newKeyName, setNewKeyName] = useState('')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const loadConsumers = useCallback(async () => {
    setLoading(true)
    try { setConsumers(await getConsumers({ environment: environment || undefined })) }
    catch { setConsumers([]) }
    setLoading(false)
  }, [environment])

  const loadKeys = useCallback(async (consumerId: string) => {
    try { setKeys(await getKeys({ consumer: consumerId })) }
    catch { setKeys([]) }
  }, [])

  useEffect(() => { loadConsumers() }, [loadConsumers])
  useEffect(() => { if (selected) loadKeys(selected.id) }, [selected, loadKeys])

  async function handleRevoke(keyId: string) {
    try { await revokeKey(keyId); if (selected) loadKeys(selected.id); setToast('Key revoked') }
    catch { setToast('Failed to revoke key') }
  }
  async function handleRotate(keyId: string) {
    try {
      const newKey = await rotateKey(keyId)
      if (selected) loadKeys(selected.id)
      setToast(`Key rotated. New prefix: ${newKey.key_prefix}`)
    }
    catch { setToast('Failed to rotate key') }
  }
  async function handleGenerate() {
    if (!selected || !newKeyName.trim()) return
    try {
      const key = await generateKey({ consumer: selected.id, name: newKeyName, environment: selected.environment })
      setCopiedKey(key.raw_key ?? null)
      if (selected) loadKeys(selected.id)
      setNewKeyName('')
    }
    catch { setToast('Failed to generate key') }
  }

  return (
    <Box display="flex" gap={2} flexWrap="wrap">
      <Box flex="1 1 280px" minWidth={260}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="subtitle2" fontWeight={700}>Consumers</Typography>
          <Button size="small" variant="outlined" startIcon={<RefreshIcon />} onClick={loadConsumers}>Refresh</Button>
        </Box>
        {loading ? <CircularProgress size={24} /> : consumers.map(c => (
          <Paper key={c.id} onClick={() => setSelected(c)} sx={{
            p: 1.5, mb: 1, cursor: 'pointer', border: '1px solid',
            borderColor: selected?.id === c.id ? '#42a5f5' : 'transparent',
          }}>
            <Box display="flex" alignItems="center" gap={1}>
              <Box>
                <Typography fontWeight={600} variant="body2">{c.name}</Typography>
                <Typography variant="caption" color="text.secondary">{c.consumer_type} · {c.environment}</Typography>
              </Box>
              <Box flexGrow={1} />
              <Chip label={fmtNum(c.total_requests)} size="small" sx={{ bgcolor: '#393939' }} />
            </Box>
          </Paper>
        ))}
      </Box>

      <Box flex="2 1 380px">
        {selected ? (
          <>
            <Typography variant="subtitle2" fontWeight={700} mb={1}>Keys — {selected.name}</Typography>
            {toast && <Alert severity="info" onClose={() => setToast('')} sx={{ mb: 1 }}>{toast}</Alert>}
            {copiedKey && (
              <Alert severity="warning" onClose={() => setCopiedKey(null)} sx={{ mb: 1, fontFamily: 'monospace', fontSize: 12 }}>
                Save this key — shown once: <strong>{copiedKey}</strong>
                <IconButton size="small" onClick={() => navigator.clipboard.writeText(copiedKey)}><ContentCopyIcon fontSize="small" /></IconButton>
              </Alert>
            )}
            <Box display="flex" gap={1} mb={2}>
              <TextField size="small" label="New key name" value={newKeyName} onChange={e => setNewKeyName(e.target.value)} sx={{ flex: 1 }} />
              <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={handleGenerate} disabled={!newKeyName.trim()}>Generate</Button>
            </Box>
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {['Name', 'Prefix', 'Status', 'Scopes', 'Rate Limit', 'Last Used', 'Actions'].map(h => (
                      <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {keys.map(k => (
                    <TableRow key={k.id} hover>
                      <TableCell sx={{ fontWeight: 500 }}>{k.name}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: 11 }}>{k.key_prefix}…</TableCell>
                      <TableCell><Chip label={k.status} size="small" color={KEY_STATUS_COLOR[k.status] ?? 'default'} /></TableCell>
                      <TableCell>{(k.scopes ?? []).join(', ')}</TableCell>
                      <TableCell>{k.rate_limit === 0 ? '∞' : `${k.rate_limit}/min`}</TableCell>
                      <TableCell>{k.last_used_at ? relTime(k.last_used_at) : '—'}</TableCell>
                      <TableCell>
                        {k.status === 'active' && (
                          <>
                            <Tooltip title="Rotate"><IconButton size="small" onClick={() => handleRotate(k.id)}><AutorenewIcon fontSize="small" /></IconButton></Tooltip>
                            <Tooltip title="Revoke"><IconButton size="small" color="error" onClick={() => handleRevoke(k.id)}><BlockIcon fontSize="small" /></IconButton></Tooltip>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!keys.length && (
                    <TableRow><TableCell colSpan={7} align="center" sx={{ color: 'text.secondary', py: 3 }}>No keys yet.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        ) : (
          <Box textAlign="center" py={8} color="text.secondary">
            <LockIcon sx={{ fontSize: 40, mb: 1 }} />
            <Typography>Select a consumer to manage keys</Typography>
          </Box>
        )}
      </Box>
    </Box>
  )
}

// ─── Tab 4 – Products ────────────────────────────────────────────────────────

function ProductsTab({ environment }: { environment: string }) {
  const [products, setProducts] = useState<ApiProduct[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try { setProducts(await getProducts({ environment: environment || undefined })) }
    catch { setProducts([]) }
    setLoading(false)
  }, [environment])

  useEffect(() => { load() }, [load])

  return (
    <Box>
      <Box display="flex" justifyContent="flex-end" mb={2}>
        <Button size="small" variant="outlined" startIcon={<RefreshIcon />} onClick={load}>Refresh</Button>
      </Box>
      {loading ? <Box textAlign="center" py={4}><CircularProgress /></Box> : (
        <Box display="flex" flexWrap="wrap" gap={2}>
          {products.map(p => (
            <Paper key={p.id} sx={{ flex: '1 1 240px', minWidth: 220, p: 2, borderTop: `3px solid ${TIER_COLOR[p.tier] ?? '#78909c'}` }}>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <Typography fontWeight={700}>{p.name}</Typography>
                <Box flexGrow={1} />
                <Chip label={p.tier} size="small" sx={{ bgcolor: TIER_COLOR[p.tier] ?? '#78909c', color: '#fff', fontWeight: 700 }} />
              </Box>
              <Chip label={p.status} size="small" color={STATUS_COLOR[p.status] ?? 'default'} sx={{ mb: 1.5 }} />
              <Divider sx={{ mb: 1.5 }} />
              <Box display="flex" flexWrap="wrap" gap={2}>
                <Box><Typography variant="caption" color="text.secondary">Rate Limit</Typography><Typography fontWeight={600}>{p.rate_limit === 0 ? 'Unlimited' : `${p.rate_limit}/min`}</Typography></Box>
                <Box><Typography variant="caption" color="text.secondary">Burst</Typography><Typography fontWeight={600}>{p.burst_limit === 0 ? '∞' : p.burst_limit}</Typography></Box>
                <Box><Typography variant="caption" color="text.secondary">Subscribers</Typography><Typography fontWeight={600}>{p.subscriber_count}</Typography></Box>
                <Box><Typography variant="caption" color="text.secondary">APIs</Typography><Typography fontWeight={600}>{p.api_count ?? '—'}</Typography></Box>
              </Box>
            </Paper>
          ))}
        </Box>
      )}
    </Box>
  )
}

// ─── Tab 5 – Policies ────────────────────────────────────────────────────────

function PoliciesTab({ environment }: { environment: string }) {
  const [policies, setPolicies] = useState<ApiPolicy[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try { setPolicies(await getPolicies({ environment: environment || undefined })) }
    catch { setPolicies([]) }
    setLoading(false)
  }, [environment])

  useEffect(() => { load() }, [load])

  async function handleToggle(id: string) {
    try {
      const updated = await togglePolicy(id)
      setPolicies(ps => ps.map(p => p.id === id ? updated : p))
    }
    catch { /* ignore */ }
  }

  return (
    <Box>
      <Box display="flex" justifyContent="flex-end" mb={2}>
        <Button size="small" variant="outlined" startIcon={<RefreshIcon />} onClick={load}>Refresh</Button>
      </Box>
      {loading ? <Box textAlign="center" py={4}><CircularProgress /></Box> : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['Name', 'Type', 'Scope', 'Priority', 'Config Preview', 'Enabled', 'Created'].map(h => (
                  <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {policies.map(p => (
                <TableRow key={p.id} hover>
                  <TableCell sx={{ fontWeight: 500 }}>{p.name}</TableCell>
                  <TableCell>
                    <Chip label={p.policy_type.replace(/_/g, ' ')} size="small"
                      sx={{ bgcolor: POLICY_COLOR[p.policy_type] ?? '#78909c', color: '#fff', fontWeight: 600, textTransform: 'capitalize' }} />
                  </TableCell>
                  <TableCell><Chip label={p.scope} size="small" variant="outlined" /></TableCell>
                  <TableCell>{p.priority}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: 11, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {JSON.stringify(p.config)}
                  </TableCell>
                  <TableCell>
                    <Switch size="small" checked={p.enabled} onChange={() => handleToggle(p.id)} color="success" />
                  </TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontSize: 11 }}>{relTime(p.created_at)}</TableCell>
                </TableRow>
              ))}
              {!policies.length && (
                <TableRow><TableCell colSpan={7} align="center" sx={{ color: 'text.secondary', py: 4 }}>No policies configured.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  )
}

// ─── Tab 6 – Analytics ───────────────────────────────────────────────────────

function AnalyticsTab() {
  const [analytics, setAnalytics] = useState<ApimAnalytics | null>(null)
  const [audit, setAudit] = useState<ApimAuditEntry[]>([])
  const [hours, setHours] = useState(24)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    await Promise.allSettled([
      getApimAnalytics({ hours }).then(setAnalytics),
      getApimAuditLog({ hours: hours * 3, limit: 50 }).then(setAudit),
    ])
    setLoading(false)
  }, [hours])

  useEffect(() => { load() }, [load])

  return (
    <Box>
      <Box display="flex" gap={2} mb={2} alignItems="center">
        <FormControl size="small" sx={{ width: 120 }}>
          <InputLabel>Time Range</InputLabel>
          <Select value={hours} label="Time Range" onChange={e => setHours(Number(e.target.value))}>
            {[1, 6, 24, 48, 168].map(h => <MenuItem key={h} value={h}>{h < 24 ? `${h}h` : h === 168 ? '7d' : `${h / 24}d`}</MenuItem>)}
          </Select>
        </FormControl>
        <Button size="small" variant="outlined" startIcon={<RefreshIcon />} onClick={load}>Refresh</Button>
      </Box>

      {loading ? <Box textAlign="center" py={4}><CircularProgress /></Box> : analytics && (
        <>
          <Box display="flex" flexWrap="wrap" gap={2} mb={3}>
            <StatCard label="Total Requests" value={fmtNum(analytics.summary.total_requests)} color="#42a5f5"
              sparkline={analytics.series.request_rate.map(p => p.v)} />
            <StatCard label="Total Errors"   value={fmtNum(analytics.summary.total_errors)}   color="#ef5350"
              sparkline={analytics.series.error_rate.map(p => p.v)} sparkColor="#ef5350" />
            <StatCard label="Avg Latency"    value={`${analytics.summary.avg_latency_ms.toFixed(0)}ms`} color="#ffa726"
              sparkline={analytics.series.latency_p99.map(p => p.v)} sparkColor="#ffa726" />
            <StatCard label="P99 Latency"    value={`${analytics.summary.p99_latency_ms.toFixed(0)}ms`} color="#ab47bc" />
          </Box>

          <Box display="flex" flexWrap="wrap" gap={3} mb={3}>
            <Paper sx={{ flex: '1 1 200px', p: 2 }}>
              <Typography variant="subtitle2" fontWeight={700} mb={1.5}>Response Status</Typography>
              {Object.entries(analytics.status_distribution).map(([code, count]) => (
                <Box key={code} display="flex" justifyContent="space-between" mb={0.5}>
                  <Chip label={code} size="small" color={code === '2xx' ? 'success' : code === '5xx' ? 'error' : 'default'} sx={{ width: 48 }} />
                  <Typography variant="body2" fontWeight={600}>{fmtNum(count)}</Typography>
                </Box>
              ))}
            </Paper>

            <Paper sx={{ flex: '2 1 320px', p: 2, overflow: 'hidden' }}>
              <Typography variant="subtitle2" fontWeight={700} mb={1}>Top Endpoints</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {['Method', 'Path', 'Calls', 'Avg Latency'].map(h => (
                      <TableCell key={h} sx={{ fontWeight: 700, py: 0.5 }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {analytics.top_endpoints.map((e, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Chip label={e.method} size="small"
                          sx={{ bgcolor: e.method === 'GET' ? '#1a237e' : e.method === 'POST' ? '#1b5e20' : '#7f0000', color: '#fff', fontWeight: 700 }} />
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{e.path}</TableCell>
                      <TableCell>{fmtNum(e.count)}</TableCell>
                      <TableCell>{e.avg_ms}ms</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          </Box>

          <Box display="flex" flexWrap="wrap" gap={3}>
            <Paper sx={{ flex: '1 1 240px', p: 2 }}>
              <Typography variant="subtitle2" fontWeight={700} mb={1.5}>Top Consumers</Typography>
              {analytics.top_consumers.map((c, i) => (
                <Box key={i} display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2" fontWeight={500}>{c.name}</Typography>
                  <Box textAlign="right">
                    <Typography variant="body2">{fmtNum(c.requests)}</Typography>
                    <Typography variant="caption" color="error.main">{c.errors} errors</Typography>
                  </Box>
                </Box>
              ))}
            </Paper>

            <Paper sx={{ flex: '2 1 380px', p: 2 }}>
              <Typography variant="subtitle2" fontWeight={700} mb={1}>Audit Log</Typography>
              {audit.slice(0, 12).map((e, i) => (
                <Box key={e.id ?? i}>
                  {i > 0 && <Divider />}
                  <Box display="flex" gap={1.5} py={0.75} alignItems="center">
                    <Chip label={ACTION_LABEL[e.action] ?? e.action} size="small"
                      sx={{ bgcolor: '#393939', color: '#c6c6c6', fontSize: 10, fontWeight: 600 }} />
                    <Typography variant="body2">{e.entity_name}</Typography>
                    <Typography variant="caption" color="text.secondary">· {e.actor}</Typography>
                    <Box flexGrow={1} />
                    <Typography variant="caption" color="text.secondary">{relTime(e.created_at)}</Typography>
                  </Box>
                </Box>
              ))}
            </Paper>
          </Box>
        </>
      )}
    </Box>
  )
}

// ─── Root page ────────────────────────────────────────────────────────────────

const TABS = ['Overview', 'APIs', 'Gateways', 'Consumers & Keys', 'Products', 'Policies', 'Analytics']

const DevApiManagementPage: React.FC = () => {
  const [tab, setTab] = useState(0)
  const [environment, setEnvironment] = useState('production')
  const [overview, setOverview] = useState<ApimOverview | null>(null)
  const [audit, setAudit] = useState<ApimAuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [, setRefreshKey] = useState(0)

  const loadOverview = useCallback(async () => {
    setLoading(true)
    setError('')
    await Promise.allSettled([
      getApimOverview().then(setOverview).catch(() => setError('Could not load overview')),
      getApimAuditLog({ hours: 72, limit: 20 }).then(setAudit).catch(() => {}),
    ])
    setLoading(false)
  }, [])

  useEffect(() => { loadOverview() }, [loadOverview])

  function handleRefresh() { loadOverview(); setRefreshKey(k => k + 1) }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
      <Box display="flex" flexWrap="wrap" alignItems="center" gap={2} mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={700}>API Management</Typography>
          <Typography variant="caption" color="text.secondary">Gateway · Lifecycle · Security · Analytics</Typography>
        </Box>
        <Box flexGrow={1} />
        <FormControl size="small" sx={{ width: 150 }}>
          <InputLabel>Environment</InputLabel>
          <Select value={environment} label="Environment" onChange={e => setEnvironment(e.target.value)}>
            <MenuItem value="production">Production</MenuItem>
            <MenuItem value="staging">Staging</MenuItem>
            <MenuItem value="development">Development</MenuItem>
          </Select>
        </FormControl>
        <Button size="small" variant="outlined" startIcon={<RefreshIcon />} onClick={handleRefresh}>Refresh</Button>
      </Box>

      {error && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}>
          {TABS.map(label => <Tab key={label} label={label} />)}
        </Tabs>
      </Paper>

      <Box>
        {tab === 0 && (loading ? <Box textAlign="center" py={6}><CircularProgress /></Box> : <OverviewTab overview={overview} audit={audit} />)}
        {tab === 1 && <ApisTab environment={environment} onRefresh={loadOverview} />}
        {tab === 2 && <GatewaysTab environment={environment} />}
        {tab === 3 && <ConsumersTab environment={environment} />}
        {tab === 4 && <ProductsTab environment={environment} />}
        {tab === 5 && <PoliciesTab environment={environment} />}
        {tab === 6 && <AnalyticsTab />}
      </Box>
    </Box>
  )
}

export default DevApiManagementPage
