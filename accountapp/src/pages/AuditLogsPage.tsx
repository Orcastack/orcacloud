// OrcaCloud Enterprise Audit Logs
// Enterprise-grade audit logging system with comprehensive filtering, search, and export

import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, IconButton, TextField, Chip, Avatar, Tooltip,
  Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TablePagination, InputAdornment, Stack, Select, MenuItem, FormControl,
  InputLabel, Dialog, DialogTitle, DialogContent, DialogActions, Alert,
  Collapse, Card, CardContent, Tabs, Tab, Badge, Menu, ListItemIcon,
  ListItemText, Divider, LinearProgress,
} from '@mui/material';
import { useTheme } from '../contexts/ThemeContext';

// Icons
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import PersonIcon from '@mui/icons-material/Person';
import IntegrationInstructionsIcon from '@mui/icons-material/IntegrationInstructions';
import SettingsIcon from '@mui/icons-material/Settings';
import SecurityIcon from '@mui/icons-material/Security';
import ApiIcon from '@mui/icons-material/Api';
import WebhookIcon from '@mui/icons-material/Webhook';
import SyncIcon from '@mui/icons-material/Sync';
import InfoIcon from '@mui/icons-material/Info';
import CloseIcon from '@mui/icons-material/Close';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import DevicesIcon from '@mui/icons-material/Devices';
import CodeIcon from '@mui/icons-material/Code';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import HistoryIcon from '@mui/icons-material/History';

// Types
interface AuditEvent {
  id: string;
  timestamp: string;
  tenant_id: string;
  actor_type: 'user' | 'system' | 'integration';
  actor_id: string;
  actor_display: string;
  resource_type: string;
  resource_id: string;
  action: string;
  status: 'success' | 'failure' | 'warning';
  ip_address?: string;
  user_agent?: string;
  trace_id?: string;
  metadata?: Record<string, any>;
}

interface FilterState {
  timeRange: 'last_24h' | 'last_7d' | 'last_30d' | 'custom';
  startDate: string;
  endDate: string;
  actorType: string;
  resourceType: string;
  action: string;
  status: string;
  search: string;
  integration: string;
}

// Theme colors
const getAuditTheme = (isDark: boolean) => ({
  bg: {
    primary: isDark ? '#1A1D23' : '#FFFFFF',
    secondary: isDark ? '#252930' : '#F8F9FA',
    tertiary: isDark ? '#2D3139' : '#F3F4F6',
    hover: isDark ? '#353A44' : '#F5F7FA',
  },
  text: {
    primary: isDark ? '#F3F4F6' : '#111827',
    secondary: isDark ? '#9CA3AF' : '#6B7280',
    tertiary: isDark ? '#6B7280' : '#9CA3AF',
  },
  border: {
    light: isDark ? '#374151' : '#E5E7EB',
    medium: isDark ? '#4B5563' : '#D1D5DB',
  },
  accent: {
    blue: isDark ? '#3B82F6' : '#2563EB',
    green: isDark ? '#34D399' : '#10B981',
    yellow: isDark ? '#FBBF24' : '#F59E0B',
    red: isDark ? '#F87171' : '#EF4444',
  },
});

// Sample data (replace with API calls)
const SAMPLE_EVENTS: AuditEvent[] = [
  {
    id: 'evt-1',
    timestamp: '2026-03-04T10:30:45Z',
    tenant_id: 'org-123',
    actor_type: 'user',
    actor_id: 'user-456',
    actor_display: 'Sarah Chen',
    resource_type: 'integration',
    resource_id: 'int-slack-001',
    action: 'integration.enabled',
    status: 'success',
    ip_address: '192.168.1.100',
    user_agent: 'Mozilla/5.0',
    trace_id: 'trace-abc123',
    metadata: { integration_name: 'Slack Marketing Workspace', provider: 'slack' },
  },
  {
    id: 'evt-2',
    timestamp: '2026-03-04T10:25:12Z',
    tenant_id: 'org-123',
    actor_type: 'integration',
    actor_id: 'int-hubspot-002',
    actor_display: 'HubSpot CRM Integration',
    resource_type: 'sync_job',
    resource_id: 'job-5678',
    action: 'sync.completed',
    status: 'success',
    metadata: { provider: 'hubspot', records_synced: 1234, duration_ms: 5420 },
  },
  {
    id: 'evt-3',
    timestamp: '2026-03-04T10:20:33Z',
    tenant_id: 'org-123',
    actor_type: 'integration',
    actor_id: 'int-stripe-003',
    actor_display: 'Stripe Payment Gateway',
    resource_type: 'webhook',
    resource_id: 'wh-9876',
    action: 'webhook.failed',
    status: 'failure',
    metadata: { attempt: 3, error_code: 'TIMEOUT', url: 'https://api.example.com/webhook' },
  },
  {
    id: 'evt-4',
    timestamp: '2026-03-04T10:15:20Z',
    tenant_id: 'org-123',
    actor_type: 'user',
    actor_id: 'user-789',
    actor_display: 'Michael Rodriguez',
    resource_type: 'integration',
    resource_id: 'int-salesforce-004',
    action: 'integration.created',
    status: 'success',
    ip_address: '10.0.0.50',
    metadata: { provider: 'salesforce', scopes: ['read_contacts', 'write_opportunities'] },
  },
  {
    id: 'evt-5',
    timestamp: '2026-03-04T10:10:05Z',
    tenant_id: 'org-123',
    actor_type: 'system',
    actor_id: 'system',
    actor_display: 'System Scheduler',
    resource_type: 'sync_job',
    resource_id: 'job-5679',
    action: 'sync.started',
    status: 'success',
    metadata: { provider: 'hubspot', scheduled: true },
  },
  {
    id: 'evt-6',
    timestamp: '2026-03-04T10:05:44Z',
    tenant_id: 'org-123',
    actor_type: 'user',
    actor_id: 'user-456',
    actor_display: 'Sarah Chen',
    resource_type: 'integration',
    resource_id: 'int-github-005',
    action: 'integration.updated',
    status: 'success',
    ip_address: '192.168.1.100',
    metadata: {
      provider: 'github',
      changes: { webhook_url: { old: 'https://old.example.com', new: 'https://new.example.com' } }
    },
  },
];

const AuditLogsPage: React.FC = () => {
  // Theme
  const { mode: themeMode } = useTheme();
  const isDark = themeMode === 'dark';
  const T = getAuditTheme(isDark);

  // State
  const [events, setEvents] = useState<AuditEvent[]>(SAMPLE_EVENTS);
  const [filteredEvents, setFilteredEvents] = useState<AuditEvent[]>(SAMPLE_EVENTS);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const [filters, setFilters] = useState<FilterState>({
    timeRange: 'last_24h',
    startDate: '',
    endDate: '',
    actorType: '',
    resourceType: '',
    action: '',
    status: '',
    search: '',
    integration: '',
  });

  // Stats
  const stats = {
    total: events.length,
    success: events.filter(e => e.status === 'success').length,
    failure: events.filter(e => e.status === 'failure').length,
    warning: events.filter(e => e.status === 'warning').length,
  };

  // Apply filters
  useEffect(() => {
    let filtered = [...events];

    // Search
    if (filters.search) {
      const query = filters.search.toLowerCase();
      filtered = filtered.filter(e =>
        e.actor_display.toLowerCase().includes(query) ||
        e.action.toLowerCase().includes(query) ||
        e.resource_type.toLowerCase().includes(query) ||
        JSON.stringify(e.metadata).toLowerCase().includes(query)
      );
    }

    // Actor type
    if (filters.actorType) {
      filtered = filtered.filter(e => e.actor_type === filters.actorType);
    }

    // Resource type
    if (filters.resourceType) {
      filtered = filtered.filter(e => e.resource_type === filters.resourceType);
    }

    // Action
    if (filters.action) {
      filtered = filtered.filter(e => e.action.includes(filters.action));
    }

    // Status
    if (filters.status) {
      filtered = filtered.filter(e => e.status === filters.status);
    }

    setFilteredEvents(filtered);
    setPage(0);
  }, [filters, events]);

  // Handlers
  const handleRefresh = () => {
    setLoading(true);
    // API call here
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  };

  const handleExport = (format: 'csv' | 'json') => {
    const data = format === 'json'
      ? JSON.stringify(filteredEvents, null, 2)
      : convertToCSV(filteredEvents);

    const blob = new Blob([data], { type: format === 'json' ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString()}.${format}`;
    a.click();
    setAnchorEl(null);
  };

  const convertToCSV = (data: AuditEvent[]) => {
    const headers = ['Timestamp', 'Actor', 'Action', 'Resource Type', 'Resource ID', 'Status', 'IP Address'];
    const rows = data.map(e => [
      e.timestamp,
      e.actor_display,
      e.action,
      e.resource_type,
      e.resource_id,
      e.status,
      e.ip_address || 'N/A',
    ]);
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircleIcon sx={{ color: T.accent.green, fontSize: 18 }} />;
      case 'failure': return <ErrorIcon sx={{ color: T.accent.red, fontSize: 18 }} />;
      case 'warning': return <WarningIcon sx={{ color: T.accent.yellow, fontSize: 18 }} />;
      default: return <InfoIcon sx={{ color: T.text.tertiary, fontSize: 18 }} />;
    }
  };

  const getActorIcon = (actorType: string) => {
    switch (actorType) {
      case 'user': return <PersonIcon />;
      case 'integration': return <IntegrationInstructionsIcon />;
      case 'system': return <SettingsIcon />;
      default: return <SecurityIcon />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString(),
      relative: getRelativeTime(date),
    };
  };

  const getRelativeTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <Box sx={{ bgcolor: T.bg.primary, minHeight: '100vh', p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Box>
            <Typography variant="h4" fontWeight={700} color={T.text.primary} mb={0.5}>
              Audit Logs
            </Typography>
            <Typography color={T.text.secondary} fontSize={14}>
              Enterprise-grade immutable audit trail for all platform activities
            </Typography>
          </Box>

          <Stack direction="row" spacing={1}>
            <Tooltip title="Refresh">
              <IconButton onClick={handleRefresh} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Button
              variant="outlined"
              startIcon={<FilterListIcon />}
              onClick={() => setShowFilters(!showFilters)}
              sx={{ borderColor: T.border.light, color: T.text.primary }}
            >
              Filters
            </Button>
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={(e) => setAnchorEl(e.currentTarget)}
              sx={{ bgcolor: T.accent.blue }}
            >
              Export
            </Button>
          </Stack>
        </Stack>

        {/* Stats Cards */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2 }}>
          <Card sx={{ bgcolor: T.bg.secondary, border: `1px solid ${T.border.light}` }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography fontSize={13} color={T.text.secondary} mb={0.5}>
                    Total Events
                  </Typography>
                  <Typography variant="h5" fontWeight={700} color={T.text.primary}>
                    {stats.total}
                  </Typography>
                </Box>
                <HistoryIcon sx={{ fontSize: 40, color: T.accent.blue, opacity: 0.6 }} />
              </Stack>
            </CardContent>
          </Card>
          <Card sx={{ bgcolor: T.bg.secondary, border: `1px solid ${T.border.light}` }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography fontSize={13} color={T.text.secondary} mb={0.5}>
                    Success
                  </Typography>
                  <Typography variant="h5" fontWeight={700} color={T.accent.green}>
                    {stats.success}
                  </Typography>
                </Box>
                <CheckCircleIcon sx={{ fontSize: 40, color: T.accent.green, opacity: 0.6 }} />
              </Stack>
            </CardContent>
          </Card>
          <Card sx={{ bgcolor: T.bg.secondary, border: `1px solid ${T.border.light}` }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography fontSize={13} color={T.text.secondary} mb={0.5}>
                    Failures
                  </Typography>
                  <Typography variant="h5" fontWeight={700} color={T.accent.red}>
                    {stats.failure}
                  </Typography>
                </Box>
                <ErrorIcon sx={{ fontSize: 40, color: T.accent.red, opacity: 0.6 }} />
              </Stack>
            </CardContent>
          </Card>
          <Card sx={{ bgcolor: T.bg.secondary, border: `1px solid ${T.border.light}` }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography fontSize={13} color={T.text.secondary} mb={0.5}>
                    Warnings
                  </Typography>
                  <Typography variant="h5" fontWeight={700} color={T.accent.yellow}>
                    {stats.warning}
                  </Typography>
                </Box>
                <WarningIcon sx={{ fontSize: 40, color: T.accent.yellow, opacity: 0.6 }} />
              </Stack>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Filters */}
      <Collapse in={showFilters}>
        <Paper sx={{ p: 2, mb: 3, bgcolor: T.bg.secondary, border: `1px solid ${T.border.light}` }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '3fr 2fr 2fr 2fr 2fr 1fr' }, gap: 2 }}>
            <TextField
                fullWidth
                size="small"
                placeholder="Search logs..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" sx={{ color: T.text.tertiary }} />
                    </InputAdornment>
                  ),
                }}
                sx={{ bgcolor: T.bg.primary }}
            />
            <FormControl fullWidth size="small">
                <InputLabel>Actor Type</InputLabel>
                <Select
                  value={filters.actorType}
                  label="Actor Type"
                  onChange={(e) => setFilters({ ...filters, actorType: e.target.value })}
                  sx={{ bgcolor: T.bg.primary }}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="user">User</MenuItem>
                  <MenuItem value="integration">Integration</MenuItem>
                  <MenuItem value="system">System</MenuItem>
                </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel>Resource Type</InputLabel>
                <Select
                  value={filters.resourceType}
                  label="Resource Type"
                  onChange={(e) => setFilters({ ...filters, resourceType: e.target.value })}
                  sx={{ bgcolor: T.bg.primary }}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="integration">Integration</MenuItem>
                  <MenuItem value="webhook">Webhook</MenuItem>
                  <MenuItem value="sync_job">Sync Job</MenuItem>
                  <MenuItem value="api_key">API Key</MenuItem>
                </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel>Action</InputLabel>
                <Select
                  value={filters.action}
                  label="Action"
                  onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                  sx={{ bgcolor: T.bg.primary }}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="created">Created</MenuItem>
                  <MenuItem value="updated">Updated</MenuItem>
                  <MenuItem value="deleted">Deleted</MenuItem>
                  <MenuItem value="enabled">Enabled</MenuItem>
                  <MenuItem value="disabled">Disabled</MenuItem>
                  <MenuItem value="sync">Sync</MenuItem>
                  <MenuItem value="webhook">Webhook</MenuItem>
                </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status}
                  label="Status"
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  sx={{ bgcolor: T.bg.primary }}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="success">Success</MenuItem>
                  <MenuItem value="failure">Failure</MenuItem>
                  <MenuItem value="warning">Warning</MenuItem>
                </Select>
            </FormControl>
            <Button
              fullWidth
              variant="text"
              onClick={() => setFilters({
                timeRange: 'last_24h',
                startDate: '',
                endDate: '',
                actorType: '',
                resourceType: '',
                action: '',
                status: '',
                search: '',
                integration: '',
              })}
              sx={{ color: T.text.secondary }}
            >
              Clear
            </Button>
          </Box>
        </Paper>
      </Collapse>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Table */}
      <TableContainer component={Paper} sx={{ bgcolor: T.bg.secondary, border: `1px solid ${T.border.light}` }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: T.bg.tertiary }}>
              <TableCell sx={{ color: T.text.primary, fontWeight: 600 }}>Timestamp</TableCell>
              <TableCell sx={{ color: T.text.primary, fontWeight: 600 }}>Actor</TableCell>
              <TableCell sx={{ color: T.text.primary, fontWeight: 600 }}>Action</TableCell>
              <TableCell sx={{ color: T.text.primary, fontWeight: 600 }}>Resource</TableCell>
              <TableCell sx={{ color: T.text.primary, fontWeight: 600 }}>Status</TableCell>
              <TableCell sx={{ color: T.text.primary, fontWeight: 600 }}>Details</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredEvents.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((event) => (
              <React.Fragment key={event.id}>
                <TableRow
                  hover
                  sx={{
                    cursor: 'pointer',
                    bgcolor: expandedRow === event.id ? T.bg.hover : 'transparent',
                    '&:hover': { bgcolor: T.bg.hover }
                  }}
                  onClick={() => setExpandedRow(expandedRow === event.id ? null : event.id)}
                >
                  <TableCell sx={{ color: T.text.primary }}>
                    <Box>
                      <Typography fontSize={13} fontWeight={500}>
                        {formatTimestamp(event.timestamp).time}
                      </Typography>
                      <Typography fontSize={12} color={T.text.secondary}>
                        {formatTimestamp(event.timestamp).relative}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Avatar sx={{ width: 32, height: 32, bgcolor: T.accent.blue }}>
                        {getActorIcon(event.actor_type)}
                      </Avatar>
                      <Box>
                        <Typography fontSize={13} fontWeight={500} color={T.text.primary}>
                          {event.actor_display}
                        </Typography>
                        <Chip
                          label={event.actor_type}
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: 11,
                            bgcolor: T.bg.tertiary,
                            color: T.text.secondary
                          }}
                        />
                      </Box>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Typography fontSize={13} fontWeight={500} color={T.text.primary}>
                      {event.action}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography fontSize={13} color={T.text.primary}>
                        {event.resource_type}
                      </Typography>
                      <Typography fontSize={11} color={T.text.secondary}>
                        {event.resource_id}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      {getStatusIcon(event.status)}
                      <Typography
                        fontSize={13}
                        fontWeight={500}
                        color={
                          event.status === 'success' ? T.accent.green :
                          event.status === 'failure' ? T.accent.red :
                          T.accent.yellow
                        }
                        sx={{ textTransform: 'capitalize' }}
                      >
                        {event.status}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEvent(event);
                        setShowDetailDialog(true);
                      }}
                    >
                      <InfoIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={6} sx={{ p: 0, border: 'none' }}>
                    <Collapse in={expandedRow === event.id} timeout="auto" unmountOnExit>
                      <Box sx={{ p: 2, bgcolor: T.bg.tertiary, borderTop: `1px solid ${T.border.light}` }}>
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2 }}>
                          {event.ip_address && (
                              <Stack direction="row" spacing={1} alignItems="center">
                                <LocationOnIcon sx={{ fontSize: 16, color: T.text.tertiary }} />
                                <Box>
                                  <Typography fontSize={11} color={T.text.secondary}>IP Address</Typography>
                                  <Typography fontSize={13} fontWeight={500} color={T.text.primary}>
                                    {event.ip_address}
                                  </Typography>
                                </Box>
                              </Stack>
                          )}
                          {event.user_agent && (
                              <Stack direction="row" spacing={1} alignItems="center">
                                <DevicesIcon sx={{ fontSize: 16, color: T.text.tertiary }} />
                                <Box>
                                  <Typography fontSize={11} color={T.text.secondary}>User Agent</Typography>
                                  <Typography fontSize={13} fontWeight={500} color={T.text.primary} noWrap>
                                    {event.user_agent}
                                  </Typography>
                                </Box>
                              </Stack>
                          )}
                          {event.trace_id && (
                              <Stack direction="row" spacing={1} alignItems="center">
                                <CodeIcon sx={{ fontSize: 16, color: T.text.tertiary }} />
                                <Box>
                                  <Typography fontSize={11} color={T.text.secondary}>Trace ID</Typography>
                                  <Typography fontSize={13} fontWeight={500} color={T.text.primary}>
                                    {event.trace_id}
                                  </Typography>
                                </Box>
                              </Stack>
                          )}
                        </Box>
                        {event.metadata && Object.keys(event.metadata).length > 0 && (
                          <Box sx={{ mt: 2 }}>
                            <Typography fontSize={11} color={T.text.secondary} mb={1}>Metadata</Typography>
                            <Paper sx={{ p: 1.5, bgcolor: isDark ? '#1E1E1E' : '#F7F7F7', borderRadius: 1 }}>
                              <pre style={{
                                margin: 0,
                                fontSize: 12,
                                color: T.text.primary,
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word'
                              }}>
                                {JSON.stringify(event.metadata, null, 2)}
                              </pre>
                            </Paper>
                          </Box>
                        )}
                      </Box>
                    </Collapse>
                  </TableCell>
                </TableRow>
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={filteredEvents.length}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 25, 50, 100]}
          sx={{ borderTop: `1px solid ${T.border.light}`, color: T.text.primary }}
        />
      </TableContainer>

      {/* Export Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        PaperProps={{ sx: { bgcolor: T.bg.primary, backgroundImage: 'none' } }}
      >
        <MenuItem onClick={() => handleExport('csv')}>
          <ListItemIcon>
            <DownloadIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Export as CSV" />
        </MenuItem>
        <MenuItem onClick={() => handleExport('json')}>
          <ListItemIcon>
            <CodeIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Export as JSON" />
        </MenuItem>
      </Menu>

      {/* Detail Dialog */}
      <Dialog
        open={showDetailDialog}
        onClose={() => setShowDetailDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { bgcolor: T.bg.primary, backgroundImage: 'none' } }}
      >
        {selectedEvent && (
          <>
            <DialogTitle>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h6" fontWeight={600} color={T.text.primary}>
                  Event Details
                </Typography>
                <IconButton size="small" onClick={() => setShowDetailDialog(false)}>
                  <CloseIcon />
                </IconButton>
              </Stack>
            </DialogTitle>
            <DialogContent>
              <Stack spacing={2}>
                <Box>
                  <Typography fontSize={12} color={T.text.secondary} mb={0.5}>Event ID</Typography>
                  <Typography fontSize={14} fontWeight={500} color={T.text.primary}>
                    {selectedEvent.id}
                  </Typography>
                </Box>
                <Divider />
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
                  <Box>
                    <Typography fontSize={12} color={T.text.secondary} mb={0.5}>Timestamp</Typography>
                    <Typography fontSize={14} fontWeight={500} color={T.text.primary}>
                      {new Date(selectedEvent.timestamp).toLocaleString()}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography fontSize={12} color={T.text.secondary} mb={0.5}>Status</Typography>
                    <Chip
                      icon={getStatusIcon(selectedEvent.status)}
                      label={selectedEvent.status}
                      size="small"
                      color={
                        selectedEvent.status === 'success' ? 'success' :
                        selectedEvent.status === 'failure' ? 'error' :
                        'warning'
                      }
                      sx={{ textTransform: 'capitalize' }}
                    />
                  </Box>
                </Box>
                <Box>
                  <Typography fontSize={12} color={T.text.secondary} mb={0.5}>Actor</Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Avatar sx={{ width: 32, height: 32, bgcolor: T.accent.blue }}>
                      {getActorIcon(selectedEvent.actor_type)}
                    </Avatar>
                    <Box>
                      <Typography fontSize={14} fontWeight={500} color={T.text.primary}>
                        {selectedEvent.actor_display}
                      </Typography>
                      <Typography fontSize={12} color={T.text.secondary}>
                        {selectedEvent.actor_type} · {selectedEvent.actor_id}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
                  <Box>
                    <Typography fontSize={12} color={T.text.secondary} mb={0.5}>Resource Type</Typography>
                    <Typography fontSize={14} fontWeight={500} color={T.text.primary}>
                      {selectedEvent.resource_type}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography fontSize={12} color={T.text.secondary} mb={0.5}>Resource ID</Typography>
                    <Typography fontSize={14} fontWeight={500} color={T.text.primary}>
                      {selectedEvent.resource_id}
                    </Typography>
                  </Box>
                </Box>
                <Box>
                  <Typography fontSize={12} color={T.text.secondary} mb={0.5}>Action</Typography>
                  <Typography fontSize={14} fontWeight={500} color={T.text.primary}>
                    {selectedEvent.action}
                  </Typography>
                </Box>
                {(selectedEvent.ip_address || selectedEvent.trace_id) && (
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
                    {selectedEvent.ip_address && (
                      <Box>
                        <Typography fontSize={12} color={T.text.secondary} mb={0.5}>IP Address</Typography>
                        <Typography fontSize={14} fontWeight={500} color={T.text.primary}>
                          {selectedEvent.ip_address}
                        </Typography>
                      </Box>
                    )}
                    {selectedEvent.trace_id && (
                      <Box>
                        <Typography fontSize={12} color={T.text.secondary} mb={0.5}>Trace ID</Typography>
                        <Typography fontSize={14} fontWeight={500} color={T.text.primary}>
                          {selectedEvent.trace_id}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                )}
                {selectedEvent.metadata && Object.keys(selectedEvent.metadata).length > 0 && (
                  <>
                    <Divider />
                    <Box>
                      <Typography fontSize={12} color={T.text.secondary} mb={1}>Metadata</Typography>
                      <Paper sx={{ p: 2, bgcolor: isDark ? '#1E1E1E' : '#F7F7F7', borderRadius: 1 }}>
                        <pre style={{
                          margin: 0,
                          fontSize: 13,
                          color: T.text.primary,
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word'
                        }}>
                          {JSON.stringify(selectedEvent.metadata, null, 2)}
                        </pre>
                      </Paper>
                    </Box>
                  </>
                )}
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setShowDetailDialog(false)} sx={{ color: T.text.secondary }}>
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default AuditLogsPage;
