import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import GroupsIcon from '@mui/icons-material/Groups';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import PublicIcon from '@mui/icons-material/Public';
import CloudDownloadOutlinedIcon from '@mui/icons-material/CloudDownloadOutlined';
import GitHubIcon from '@mui/icons-material/GitHub';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useNavigate } from 'react-router-dom';
import {
  listGroups,
  Group as ApiGroup,
  GroupVisibility,
  GroupType,
} from '../services/groupsApi';
import { dashboardTokens, dashboardSemanticColors } from '../styles/dashboardDesignSystem';

const FONT = '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const VISIBILITY_COLOR: Record<GroupVisibility, string> = {
  private:  dashboardSemanticColors.danger,
  internal: dashboardSemanticColors.warning,
  public:   dashboardSemanticColors.success,
};
const VISIBILITY_BG: Record<GroupVisibility, string> = {
  private:  'rgba(239,68,68,.12)',
  internal: 'rgba(245,158,11,.12)',
  public:   'rgba(34,197,94,.12)',
};
const TYPE_LABEL: Record<GroupType, string> = {
  developer:  'Dev',
  enterprise: 'Enterprise',
  system:     'System',
  production: 'Prod',
  marketing:  'Mktg',
  data:       'Data',
  custom:     'Custom',
};

const VisibilityIcon: React.FC<{ v: GroupVisibility }> = ({ v }) =>
  v === 'private'
    ? <LockIcon sx={{ fontSize: '.78rem' }} />
    : v === 'internal'
    ? <LockOpenIcon sx={{ fontSize: '.78rem' }} />
    : <PublicIcon sx={{ fontSize: '.78rem' }} />;

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

// ─── Import menu options ──────────────────────────────────────────────────────

const IMPORT_SOURCES = [
  { id: 'github',    label: 'GitHub Organizations',    icon: <GitHubIcon sx={{ fontSize: '1rem' }} /> },
  { id: 'gitlab',    label: 'GitLab Groups',           icon: <GroupsIcon sx={{ fontSize: '1rem' }} /> },
  { id: 'bitbucket', label: 'Bitbucket Workspaces',    icon: <GroupsIcon sx={{ fontSize: '1rem' }} /> },
  { id: 'atonix',    label: 'OrcaCloud',        icon: <CloudDownloadOutlinedIcon sx={{ fontSize: '1rem' }} /> },
];

// ─── Component ────────────────────────────────────────────────────────────────

const DevGroupsPage: React.FC = () => {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<ApiGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [importAnchor, setImportAnchor] = useState<null | HTMLElement>(null);
  const [rowAnchor, setRowAnchor] = useState<null | HTMLElement>(null);
  const [activeRow, setActiveRow] = useState<string | null>(null);
  const isMounted = useRef(true);

  const t = dashboardTokens.colors;

  useEffect(() => {
    isMounted.current = true;
    setLoading(true);
    listGroups()
      .then((data) => { if (isMounted.current) setGroups(data); })
      .catch(() => { if (isMounted.current) setGroups([]); })
      .finally(() => { if (isMounted.current) setLoading(false); });
    return () => { isMounted.current = false; };
  }, []);

  const filtered = groups.filter(
    (g) =>
      g.name.toLowerCase().includes(query.toLowerCase()) ||
      g.description.toLowerCase().includes(query.toLowerCase()) ||
      g.handle.toLowerCase().includes(query.toLowerCase()),
  );

  const stats = {
    total:    groups.length,
    private:  groups.filter((g) => g.visibility === 'private').length,
    internal: groups.filter((g) => g.visibility === 'internal').length,
    public:   groups.filter((g) => g.visibility === 'public').length,
    members:  groups.reduce((s, g) => s + g.member_count, 0),
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, fontFamily: FONT }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.2rem', md: '1.35rem' }, color: t.textPrimary, fontFamily: FONT, letterSpacing: '-.02em' }}>
            Groups
          </Typography>
          <Typography sx={{ color: t.textSecondary, fontSize: '.875rem', mt: 0.3, fontFamily: FONT }}>
            Organise members, projects, pipelines and resources into logical group hierarchies.
          </Typography>
        </Box>

        <Stack direction="row" gap={1}>
          {/* Import */}
          <Button
            variant="outlined"
            size="small"
            startIcon={<CloudDownloadOutlinedIcon />}
            onClick={(e) => setImportAnchor(e.currentTarget)}
            sx={{
              color: t.textSecondary,
              borderColor: t.border,
              fontWeight: 600,
              fontSize: '.8rem',
              borderRadius: '6px',
              textTransform: 'none',
              '&:hover': { borderColor: t.borderStrong, bgcolor: t.surfaceHover },
            }}
          >
            Import Group
          </Button>
          <Menu
            anchorEl={importAnchor}
            open={Boolean(importAnchor)}
            onClose={() => setImportAnchor(null)}
            PaperProps={{ sx: { bgcolor: t.surface, border: `1px solid ${t.border}`, boxShadow: '0 8px 32px rgba(0,0,0,.4)' } }}
          >
            {IMPORT_SOURCES.map((src) => (
              <MenuItem
                key={src.id}
                onClick={() => { setImportAnchor(null); }}
                sx={{ fontSize: '.85rem', color: t.textPrimary, gap: 1, '&:hover': { bgcolor: t.surfaceHover } }}
              >
                <ListItemIcon sx={{ color: t.textSecondary, minWidth: 28 }}>{src.icon}</ListItemIcon>
                <ListItemText primary={src.label} primaryTypographyProps={{ fontSize: '.85rem', color: t.textPrimary }} />
              </MenuItem>
            ))}
          </Menu>

          {/* Create */}
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => navigate('/groups/new')}
            sx={{
              bgcolor: dashboardTokens.colors.brandPrimary,
              color: '#0a0f1a',
              fontWeight: 700,
              fontSize: '.8rem',
              borderRadius: '6px',
              textTransform: 'none',
              boxShadow: 'none',
              '&:hover': { bgcolor: dashboardTokens.colors.brandPrimaryHover, boxShadow: 'none' },
            }}
          >
            Create Group
          </Button>
        </Stack>
      </Box>

      {/* ── Stats ──────────────────────────────────────────────────────── */}
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} sx={{ mb: 3 }}>
        {[
          { label: 'Total Groups',  value: stats.total,    color: dashboardSemanticColors.info },
          { label: 'Private',       value: stats.private,  color: dashboardSemanticColors.danger },
          { label: 'Internal',      value: stats.internal, color: dashboardSemanticColors.warning },
          { label: 'Public',        value: stats.public,   color: dashboardSemanticColors.success },
          { label: 'Total Members', value: stats.members,  color: dashboardSemanticColors.purple },
        ].map((stat) => (
          <Card key={stat.label} sx={{ flex: 1, border: `1px solid ${t.border}`, bgcolor: t.surface, boxShadow: 'none', borderRadius: '8px' }}>
            <CardContent sx={{ p: '12px 16px !important' }}>
              <Typography sx={{ fontSize: '.72rem', fontWeight: 600, color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.08em', fontFamily: FONT }}>
                {stat.label}
              </Typography>
              <Typography sx={{ fontSize: '1.5rem', fontWeight: 800, color: stat.color, lineHeight: 1.2, fontFamily: FONT }}>
                {loading ? <CircularProgress size={14} sx={{ color: stat.color }} /> : stat.value}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Stack>

      {/* ── Search ─────────────────────────────────────────────────────── */}
      <TextField
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search groups by name, handle or description…"
        size="small"
        sx={{
          mb: 2,
          maxWidth: 480,
          width: '100%',
          '& .MuiOutlinedInput-root': {
            bgcolor: t.surface,
            color: t.textPrimary,
            borderRadius: '8px',
            fontSize: '.875rem',
            '& fieldset': { borderColor: t.border },
            '&:hover fieldset': { borderColor: t.borderStrong },
            '&.Mui-focused fieldset': { borderColor: dashboardTokens.colors.brandPrimary, boxShadow: '0 0 0 3px rgba(21,61,117,0.14)' },
          },
          '& .MuiInputBase-input::placeholder': { color: t.textSecondary, opacity: 1 },
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ color: t.textSecondary, fontSize: '1rem' }} />
            </InputAdornment>
          ),
        }}
      />

      {/* ── Table ──────────────────────────────────────────────────────── */}
      <Card sx={{ border: `1px solid ${t.border}`, bgcolor: t.surface, boxShadow: 'none', borderRadius: '8px' }}>
        {loading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={28} sx={{ color: dashboardTokens.colors.brandPrimary }} />
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: t.surfaceSubtle }}>
                {['Group', 'Description', 'Type', 'Members', 'Projects', 'Visibility', 'Updated', ''].map((h) => (
                  <TableCell
                    key={h}
                    sx={{ color: t.textSecondary, fontSize: '.72rem', fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', borderColor: t.border, py: 1.25, fontFamily: FONT }}
                  >
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} sx={{ textAlign: 'center', py: 5, color: t.textSecondary, borderColor: t.border }}>
                    <GroupsIcon sx={{ fontSize: '2rem', mb: 1, opacity: .35, display: 'block', mx: 'auto' }} />
                    {query ? 'No groups match your search.' : 'No groups yet — create your first group to get started.'}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((group, idx) => (
                  <TableRow
                    key={group.id}
                    sx={{
                      bgcolor: idx % 2 === 0 ? 'transparent' : t.surfaceSubtle,
                      cursor: 'pointer',
                      '&:hover': { bgcolor: t.surfaceHover },
                      '& td': { borderColor: t.border },
                    }}
                    onClick={() => navigate(`/groups/${group.id}`)}
                  >
                    {/* Group name */}
                    <TableCell sx={{ py: 1.25 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            width: 28, height: 28, borderRadius: '6px',
                            bgcolor: group.avatar_url ? 'transparent' : 'rgba(21,61,117,0.12)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: dashboardTokens.colors.brandPrimary, flexShrink: 0,
                            overflow: 'hidden',
                          }}
                        >
                          {group.avatar_url
                            ? <Box component="img" src={group.avatar_url} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <GroupsIcon sx={{ fontSize: '.9rem' }} />
                          }
                        </Box>
                        <Box>
                          <Typography sx={{ fontWeight: 700, fontSize: '.875rem', color: t.textPrimary, fontFamily: FONT, lineHeight: 1.2 }}>
                            {group.name}
                          </Typography>
                          <Typography sx={{ fontSize: '.72rem', color: t.textSecondary, fontFamily: FONT }}>
                            @{group.handle}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>

                    {/* Description */}
                    <TableCell sx={{ color: t.textSecondary, fontSize: '.82rem', maxWidth: 220, fontFamily: FONT }}>
                      <Tooltip title={group.description}>
                        <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {group.description || '—'}
                        </span>
                      </Tooltip>
                    </TableCell>

                    {/* Type */}
                    <TableCell>
                      <Chip
                        label={TYPE_LABEL[group.group_type]}
                        size="small"
                        sx={{ bgcolor: t.surfaceSubtle, color: t.textSecondary, border: `1px solid ${t.border}`, fontSize: '.68rem', height: 18, '& .MuiChip-label': { px: 0.75 } }}
                      />
                    </TableCell>

                    {/* Members */}
                    <TableCell>
                      <Chip
                        label={group.member_count}
                        size="small"
                        sx={{ bgcolor: 'rgba(139,92,246,.14)', color: dashboardSemanticColors.purple, fontWeight: 700, fontSize: '.72rem', height: 18, '& .MuiChip-label': { px: 0.75 } }}
                      />
                    </TableCell>

                    {/* Projects */}
                    <TableCell>
                      <Typography sx={{ fontSize: '.82rem', color: t.textSecondary, fontFamily: FONT }}>
                        {group.project_count}
                      </Typography>
                    </TableCell>

                    {/* Visibility */}
                    <TableCell>
                      <Chip
                        icon={<VisibilityIcon v={group.visibility} />}
                        label={group.visibility}
                        size="small"
                        sx={{
                          bgcolor: VISIBILITY_BG[group.visibility],
                          color: VISIBILITY_COLOR[group.visibility],
                          fontWeight: 700,
                          fontSize: '.72rem',
                          height: 18,
                          textTransform: 'capitalize',
                          '& .MuiChip-label': { px: 0.75 },
                          '& .MuiChip-icon': { color: VISIBILITY_COLOR[group.visibility], fontSize: '.72rem', ml: 0.5 },
                        }}
                      />
                    </TableCell>

                    {/* Updated */}
                    <TableCell sx={{ color: t.textSecondary, fontSize: '.8rem', whiteSpace: 'nowrap', fontFamily: FONT }}>
                      {relativeTime(group.updated_at)}
                    </TableCell>

                    {/* Row actions */}
                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                      <Tooltip title="Open group">
                        <IconButton size="small" sx={{ color: t.textSecondary, mr: 0.5 }} onClick={() => navigate(`/groups/${group.id}`)}>
                          <OpenInNewIcon sx={{ fontSize: '.85rem' }} />
                        </IconButton>
                      </Tooltip>
                      <IconButton
                        size="small"
                        sx={{ color: t.textSecondary }}
                        onClick={(e) => { setActiveRow(group.id); setRowAnchor(e.currentTarget); }}
                      >
                        <MoreHorizIcon sx={{ fontSize: '1rem' }} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}

        <Divider sx={{ borderColor: t.border }} />
        <Box sx={{ px: 2, py: 1.25, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography sx={{ fontSize: '.78rem', color: t.textSecondary, fontFamily: FONT }}>
            {loading ? 'Loading…' : `${filtered.length} of ${groups.length} groups`}
          </Typography>
        </Box>
      </Card>

      {/* Row context menu */}
      <Menu
        anchorEl={rowAnchor}
        open={Boolean(rowAnchor)}
        onClose={() => setRowAnchor(null)}
        PaperProps={{ sx: { bgcolor: t.surface, border: `1px solid ${t.border}`, boxShadow: '0 8px 32px rgba(0,0,0,.4)' } }}
      >
        <MenuItem onClick={() => { navigate(`/groups/${activeRow}`); setRowAnchor(null); }} sx={{ fontSize: '.85rem', color: t.textPrimary, '&:hover': { bgcolor: t.surfaceHover } }}>
          Open Group
        </MenuItem>
        <MenuItem onClick={() => { navigate(`/groups/${activeRow}/members`); setRowAnchor(null); }} sx={{ fontSize: '.85rem', color: t.textPrimary, '&:hover': { bgcolor: t.surfaceHover } }}>
          Manage Members
        </MenuItem>
        <MenuItem onClick={() => { navigate(`/groups/${activeRow}/settings`); setRowAnchor(null); }} sx={{ fontSize: '.85rem', color: t.textPrimary, '&:hover': { bgcolor: t.surfaceHover } }}>
          Settings
        </MenuItem>
        <Divider sx={{ borderColor: t.border }} />
        <MenuItem onClick={() => setRowAnchor(null)} sx={{ fontSize: '.85rem', color: dashboardSemanticColors.danger, '&:hover': { bgcolor: 'rgba(239,68,68,.08)' } }}>
          Leave Group
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default DevGroupsPage;
