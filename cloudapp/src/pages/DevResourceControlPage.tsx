// OrcaCloud — Resource Control Center
// Full cockpit: filter, table, detail drawer, contextual actions, auto-refresh.

import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import CheckCircleIcon      from '@mui/icons-material/CheckCircle'
import ErrorIcon            from '@mui/icons-material/Error'
import WarningAmberIcon     from '@mui/icons-material/WarningAmber'
import PendingIcon          from '@mui/icons-material/Pending'
import StopCircleIcon       from '@mui/icons-material/StopCircle'
import SearchIcon           from '@mui/icons-material/Search'
import RefreshIcon          from '@mui/icons-material/Refresh'
import SyncIcon             from '@mui/icons-material/Sync'
import CloseIcon            from '@mui/icons-material/Close'
import MoreVertIcon         from '@mui/icons-material/MoreVert'
import PlayArrowIcon        from '@mui/icons-material/PlayArrow'
import StopIcon             from '@mui/icons-material/Stop'
import RestartAltIcon       from '@mui/icons-material/RestartAlt'
import ReplayIcon           from '@mui/icons-material/Replay'
import LockIcon             from '@mui/icons-material/Lock'
import LockOpenIcon         from '@mui/icons-material/LockOpen'
import PauseIcon            from '@mui/icons-material/Pause'
import { Menu } from '@mui/material'

import {
  listResources,
  triggerSync,
  performResourceAction,
  type PlatformResource,
  type ResourceFilters,
  type ResourceStatus,
  type ResourceType,
} from '../services/resourceControlApi'

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<ResourceStatus, string> = {
  running:  '#22c55e',
  failed:   '#ef4444',
  degraded: '#f59e0b',
  pending:  '#94a3b8',
  stopped:  '#64748b',
  unknown:  '#475569',
}
const STATUS_BG: Record<ResourceStatus, string> = {
  running:  '#dcfce7',
  failed:   '#fee2e2',
  degraded: '#fef3c7',
  pending:  '#f1f5f9',
  stopped:  '#e2e8f0',
  unknown:  '#e2e8f0',
}

function statusIcon(s: ResourceStatus, sz = 14) {
  const style = { fontSize: sz, color: STATUS_COLOR[s] ?? STATUS_COLOR.unknown }
  switch (s) {
    case 'running':  return <CheckCircleIcon style={style} />
    case 'failed':   return <ErrorIcon style={style} />
    case 'degraded': return <WarningAmberIcon style={style} />
    case 'pending':  return <PendingIcon style={style} />
    case 'stopped':  return <StopCircleIcon style={style} />
    default:         return <PendingIcon style={style} />
  }
}

const TYPE_COLOR: Record<string, string> = {
  pipeline:              '#153d75',
  container:             '#0ea5e9',
  kubernetes_pod:        '#8b5cf6',
  kubernetes_deployment: '#7c3aed',
  kubernetes_service:    '#a78bfa',
  api_route:             '#f97316',
  api_gateway:           '#ea580c',
  monitoring_alert:      '#f43f5e',
  group_runner:          '#10b981',
  runner:                '#059669',
  environment:           '#0284c7',
  storage_bucket:        '#0891b2',
  storage_volume:        '#0e7490',
  workspace:             '#7c3aed',
  operational_task:      '#ca8a04',
  domain:                '#4f46e5',
  secret:                '#be185d',
}

function typeLabel(t: ResourceType | string): string {
  return t
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

const ENV_ALL  = '' as const
const TYPE_ALL = '' as const
const STAT_ALL = '' as const

const ENVIRONMENTS = ['dev', 'stage', 'prod', 'global']
const RESOURCE_TYPES: ResourceType[] = [
  'pipeline', 'container', 'kubernetes_pod', 'kubernetes_deployment', 'kubernetes_service',
  'api_route', 'api_gateway', 'monitoring_alert', 'group_runner', 'runner',
  'environment', 'storage_bucket', 'storage_volume', 'workspace', 'operational_task',
  'domain', 'secret',
]
const STATUSES: ResourceStatus[] = ['running', 'failed', 'degraded', 'pending', 'stopped']

// ─── Health bar ───────────────────────────────────────────────────────────────

function HealthBar({ score }: { score: number }) {
  const color = score >= 80 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444'
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, minWidth: 90 }}>
      <LinearProgress
        variant="determinate"
        value={score}
        sx={{
          flex: 1,
          height: 6,
          borderRadius: 4,
          bgcolor: '#e2e8f0',
          '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 4 },
        }}
      />
      <Typography variant="caption" sx={{ color, fontWeight: 700, whiteSpace: 'nowrap' }}>
        {score}%
      </Typography>
    </Box>
  )
}

// ─── Stats card ───────────────────────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Paper
      elevation={0}
      sx={{
        flex: '1 1 120px',
        px: 2, py: 1.5,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        textAlign: 'center',
      }}
    >
      <Typography variant="h5" sx={{ fontWeight: 800, color, lineHeight: 1.2 }}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
        {label}
      </Typography>
    </Paper>
  )
}

// ─── Row actions menu ─────────────────────────────────────────────────────────

const ACTIONS_FOR: Record<ResourceStatus, string[]> = {
  running:  ['stop', 'restart', 'lock', 'pause'],
  failed:   ['restart', 'rerun'],
  degraded: ['restart', 'stop'],
  pending:  ['stop'],
  stopped:  ['start', 'resume'],
  unknown:  [],
}

function ActionsMenu({
  resource,
  onAction,
}: {
  resource: PlatformResource
  onAction: (r: PlatformResource, action: string) => void
}) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null)
  const actions = ACTIONS_FOR[resource.status] ?? []

  if (actions.length === 0) return null

  const iconFor = (a: string) => {
    switch (a) {
      case 'start':   return <PlayArrowIcon fontSize="small" />
      case 'stop':    return <StopIcon fontSize="small" />
      case 'restart': return <RestartAltIcon fontSize="small" />
      case 'rerun':   return <ReplayIcon fontSize="small" />
      case 'lock':    return <LockIcon fontSize="small" />
      case 'unlock':  return <LockOpenIcon fontSize="small" />
      case 'pause':   return <PauseIcon fontSize="small" />
      case 'resume':  return <PlayArrowIcon fontSize="small" />
      default:        return null
    }
  }

  return (
    <>
      <IconButton
        size="small"
        onClick={e => { e.stopPropagation(); setAnchor(e.currentTarget) }}
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        onClick={e => e.stopPropagation()}
      >
        {actions.map(a => (
          <MenuItem
            key={a}
            dense
            sx={{ gap: 1 }}
            onClick={() => { setAnchor(null); onAction(resource, a) }}
          >
            {iconFor(a)}
            <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>{a}</Typography>
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}

// ─── Detail Drawer ────────────────────────────────────────────────────────────

function DetailDrawer({
  resource,
  onClose,
  onAction,
}: {
  resource: PlatformResource | null
  onClose: () => void
  onAction: (r: PlatformResource, action: string) => void
}) {
  if (!resource) return null
  const actions = ACTIONS_FOR[resource.status] ?? []

  return (
    <Drawer anchor="right" open={Boolean(resource)} onClose={onClose}>
      <Box sx={{ width: { xs: '90vw', sm: 420 }, p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
              <Box sx={{
                width: 10, height: 10, borderRadius: '50%',
                bgcolor: STATUS_COLOR[resource.status],
                flexShrink: 0,
              }} />
              <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.3, wordBreak: 'break-all' }}>
                {resource.name}
              </Typography>
            </Stack>
            <Chip
              label={typeLabel(resource.resource_type)}
              size="small"
              sx={{
                bgcolor: TYPE_COLOR[resource.resource_type] + '22',
                color: TYPE_COLOR[resource.resource_type],
                fontWeight: 700,
                fontSize: 11,
                height: 20,
              }}
            />
          </Box>
          <IconButton onClick={onClose} size="small" sx={{ mt: -0.5 }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Core fields */}
        <Stack spacing={1.5} sx={{ flex: 1, overflow: 'auto' }}>
          <DetailRow label="Status">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
              {statusIcon(resource.status, 16)}
              <Typography variant="body2" sx={{
                color: STATUS_COLOR[resource.status], fontWeight: 700, textTransform: 'capitalize',
              }}>
                {resource.status}
              </Typography>
            </Box>
          </DetailRow>
          <DetailRow label="Health">
            <HealthBar score={resource.health_score} />
          </DetailRow>
          <DetailRow label="Subsystem">
            <Typography variant="body2">{resource.subsystem || '—'}</Typography>
          </DetailRow>
          <DetailRow label="Environment">
            <Chip label={resource.environment} size="small" sx={{ height: 20, fontSize: 11, fontWeight: 700 }} />
          </DetailRow>
          {resource.group_name && (
            <DetailRow label="Group">
              <Typography variant="body2">{resource.group_name}</Typography>
            </DetailRow>
          )}
          {resource.project_name && (
            <DetailRow label="Project">
              <Typography variant="body2">{resource.project_name}</Typography>
            </DetailRow>
          )}

          <Divider sx={{ my: 0.5 }} />
          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.6 }}>
            Details
          </Typography>

          {Object.entries(resource.metadata).map(([k, v]) => (
            <DetailRow key={k} label={k.replace(/_/g, ' ')}>
              <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                {typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v)}
              </Typography>
            </DetailRow>
          ))}

          <Divider sx={{ my: 0.5 }} />
          <DetailRow label="Last synced">
            <Typography variant="body2" color="text.secondary">
              {new Date(resource.last_synced).toLocaleString()}
            </Typography>
          </DetailRow>
          <DetailRow label="Created">
            <Typography variant="body2" color="text.secondary">
              {new Date(resource.created_at).toLocaleString()}
            </Typography>
          </DetailRow>
        </Stack>

        {/* Action buttons */}
        {actions.length > 0 && (
          <>
            <Divider sx={{ mt: 2, mb: 1.5 }} />
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {actions.map(a => (
                <Button
                  key={a}
                  size="small"
                  variant="outlined"
                  onClick={() => onAction(resource, a)}
                  sx={{ textTransform: 'capitalize', fontWeight: 700 }}
                >
                  {a}
                </Button>
              ))}
            </Stack>
          </>
        )}
      </Box>
    </Drawer>
  )
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, minHeight: 28 }}>
      <Typography
        variant="caption"
        sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'capitalize', whiteSpace: 'nowrap', minWidth: 100, flexShrink: 0 }}
      >
        {label}
      </Typography>
      <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>{children}</Box>
    </Box>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

const DevResourceControlPage: React.FC = () => {
  // Filter state
  const [filters, setFilters] = useState<ResourceFilters>({})
  const [search, setSearch]   = useState('')

  // Data state
  const [resources, setResources] = useState<PlatformResource[]>([])
  const [loading, setLoading]     = useState(true)
  const [syncing, setSyncing]     = useState(false)

  // UI state
  const [selected, setSelected]  = useState<PlatformResource | null>(null)
  const [toast, setToast]        = useState<{ msg: string; severity: 'success' | 'error' } | null>(null)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const load = useCallback(async (f: ResourceFilters) => {
    setLoading(true)
    try {
      const data = await listResources(f)
      setResources(data)
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load + search debounce
  useEffect(() => {
    const active: ResourceFilters = { ...filters }
    if (search.trim()) active.search = search.trim()
    const t = setTimeout(() => load(active), search ? 300 : 0)
    return () => clearTimeout(t)
  }, [filters, search, load])

  // Auto-refresh every 30s
  useEffect(() => {
    timerRef.current = setInterval(() => {
      const active: ResourceFilters = { ...filters }
      if (search.trim()) active.search = search.trim()
      load(active)
    }, 30_000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [filters, search, load])

  const handleSync = async () => {
    setSyncing(true)
    try {
      const result = await triggerSync()
      setToast({ msg: `Synced ${result.synced} resources in ${result.duration}ms.`, severity: 'success' })
      await load(filters)
    } catch {
      setToast({ msg: 'Sync failed — check connectivity.', severity: 'error' })
    } finally {
      setSyncing(false)
    }
  }

  const handleAction = async (resource: PlatformResource, action: string) => {
    try {
      const result = await performResourceAction(resource.id, { action })
      setToast({ msg: result.message, severity: result.ok ? 'success' : 'error' })
      // Optimistic update
      if (result.ok) {
        setResources(prev => prev.map(r =>
          r.id === resource.id
            ? { ...r, status: (result as any).status ?? r.status }
            : r
        ))
        if (selected?.id === resource.id) {
          setSelected(prev => prev ? { ...prev, status: (result as any).status ?? prev.status } : prev)
        }
      }
    } catch {
      setToast({ msg: `Action '${action}' failed.`, severity: 'error' })
    }
  }

  const setFilter = (key: keyof ResourceFilters, val: string) =>
    setFilters(prev => val ? { ...prev, [key]: val } : (() => { const { [key]: _, ...rest } = prev; return rest })())

  // Stats
  const total    = resources.length
  const running  = resources.filter(r => r.status === 'running').length
  const failed   = resources.filter(r => r.status === 'failed').length
  const degraded = resources.filter(r => r.status === 'degraded' || r.status === 'stopped').length

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, minHeight: '100%' }}>

      {/* ── Header ── */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2.5, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>Resource Control Center</Typography>
          <Typography variant="body2" color="text.secondary">
            Real-time cockpit for all platform resources — pipelines, containers, K8s, APIs, storage, runners &amp; more.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Refresh list">
            <IconButton onClick={() => load(filters)} size="small" disabled={loading}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Button
            size="small"
            variant="outlined"
            startIcon={syncing ? <CircularProgress size={14} /> : <SyncIcon fontSize="small" />}
            onClick={handleSync}
            disabled={syncing}
            sx={{ fontWeight: 700 }}
          >
            {syncing ? 'Syncing…' : 'Sync All'}
          </Button>
        </Stack>
      </Box>

      {/* ── Stats row ── */}
      <Stack direction="row" spacing={1.5} sx={{ mb: 2.5, flexWrap: 'wrap' }}>
        <StatCard label="Total"    value={total}    color="#334155" />
        <StatCard label="Running"  value={running}  color="#16a34a" />
        <StatCard label="Failed"   value={failed}   color="#dc2626" />
        <StatCard label="Degraded" value={degraded} color="#d97706" />
      </Stack>

      {/* ── Filters ── */}
      <Paper
        elevation={0}
        sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.5, mb: 2 }}
      >
        <Stack direction="row" spacing={1.5} flexWrap="wrap" alignItems="center">
          {/* Search */}
          <TextField
            size="small"
            placeholder="Search resources…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            sx={{ minWidth: 180, flex: '1 1 180px' }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                </InputAdornment>
              ),
            }}
          />
          {/* Environment */}
          <Select
            size="small"
            displayEmpty
            value={filters.environment ?? ENV_ALL}
            onChange={e => setFilter('environment', e.target.value)}
            sx={{ minWidth: 130 }}
          >
            <MenuItem value={ENV_ALL}><em>All Environments</em></MenuItem>
            {ENVIRONMENTS.map(e => <MenuItem key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</MenuItem>)}
          </Select>
          {/* Type */}
          <Select
            size="small"
            displayEmpty
            value={filters.resource_type ?? TYPE_ALL}
            onChange={e => setFilter('resource_type', e.target.value)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value={TYPE_ALL}><em>All Types</em></MenuItem>
            {RESOURCE_TYPES.map(t => <MenuItem key={t} value={t}>{typeLabel(t)}</MenuItem>)}
          </Select>
          {/* Status */}
          <Select
            size="small"
            displayEmpty
            value={filters.status ?? STAT_ALL}
            onChange={e => setFilter('status', e.target.value)}
            sx={{ minWidth: 130 }}
          >
            <MenuItem value={STAT_ALL}><em>All Statuses</em></MenuItem>
            {STATUSES.map(s => (
              <MenuItem key={s} value={s}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                  {statusIcon(s, 14)}
                  <span style={{ textTransform: 'capitalize' }}>{s}</span>
                </Box>
              </MenuItem>
            ))}
          </Select>
          {/* Clear */}
          {(Object.keys(filters).length > 0 || search) && (
            <Button
              size="small"
              onClick={() => { setFilters({}); setSearch('') }}
              sx={{ fontWeight: 700, color: 'text.secondary' }}
            >
              Clear
            </Button>
          )}
        </Stack>
      </Paper>

      {/* ── Table ── */}
      {loading
        ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
        : resources.length === 0
          ? (
            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, py: 8, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">No resources match your filters.</Typography>
              <Button variant="outlined" size="small" sx={{ mt: 2, fontWeight: 700 }} onClick={handleSync}>
                Sync resources now
              </Button>
            </Paper>
          )
          : (
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow sx={{ '& th': { fontWeight: 800, fontSize: 12, bgcolor: '#FFFFFF', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 } }}>
                    <TableCell sx={{ pl: 2 }}>Name</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Group</TableCell>
                    <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>Project</TableCell>
                    <TableCell>Env</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Health</TableCell>
                    <TableCell align="right" sx={{ pr: 1.5 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {resources.map(r => (
                    <TableRow
                      key={r.id}
                      hover
                      onClick={() => setSelected(r)}
                      sx={{ cursor: 'pointer', '&:last-child td': { borderBottom: 0 } }}
                    >
                      {/* Name */}
                      <TableCell sx={{ pl: 2, maxWidth: 220 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">{r.subsystem}</Typography>
                      </TableCell>

                      {/* Type badge */}
                      <TableCell>
                        <Chip
                          label={typeLabel(r.resource_type)}
                          size="small"
                          sx={{
                            bgcolor: (TYPE_COLOR[r.resource_type] ?? '#153d75') + '1a',
                            color:   TYPE_COLOR[r.resource_type] ?? '#153d75',
                            fontWeight: 700,
                            fontSize: 11,
                            height: 20,
                            maxWidth: 150,
                          }}
                        />
                      </TableCell>

                      {/* Group */}
                      <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
                          {r.group_name ?? '—'}
                        </Typography>
                      </TableCell>

                      {/* Project */}
                      <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
                          {r.project_name ?? '—'}
                        </Typography>
                      </TableCell>

                      {/* Env */}
                      <TableCell>
                        <Chip
                          label={r.environment}
                          size="small"
                          sx={{ height: 18, fontSize: 10, fontWeight: 700 }}
                        />
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Box sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 0.6,
                          px: 1, py: 0.25,
                          borderRadius: 1,
                          bgcolor: STATUS_BG[r.status],
                        }}>
                          {statusIcon(r.status, 13)}
                          <Typography variant="caption" sx={{ color: STATUS_COLOR[r.status], fontWeight: 700, textTransform: 'capitalize' }}>
                            {r.status}
                          </Typography>
                        </Box>
                      </TableCell>

                      {/* Health */}
                      <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' }, minWidth: 110 }}>
                        <HealthBar score={r.health_score} />
                      </TableCell>

                      {/* Actions */}
                      <TableCell align="right" sx={{ pr: 1, whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
                        <ActionsMenu resource={r} onAction={handleAction} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )
      }

      {/* ── Detail Drawer ── */}
      <DetailDrawer resource={selected} onClose={() => setSelected(null)} onAction={handleAction} />

      {/* ── Toast ── */}
      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={toast?.severity ?? 'success'}
          onClose={() => setToast(null)}
          sx={{ width: '100%' }}
        >
          {toast?.msg}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default DevResourceControlPage
