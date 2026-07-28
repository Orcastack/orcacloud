// OrcaCloud — Team Detail Page (7 tabs)
import React, { useCallback, useEffect, useState } from 'react';
import {
  Box, Typography, Tabs, Tab, Stack, Chip, Avatar,
  Button, Card, CardContent, Divider, CircularProgress, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Select, FormControl, InputLabel, Paper,
  Switch, LinearProgress, Badge,
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import ArrowBackIcon     from '@mui/icons-material/ArrowBack';
import AddIcon           from '@mui/icons-material/Add';
import DeleteIcon        from '@mui/icons-material/Delete';
import PersonAddIcon     from '@mui/icons-material/PersonAdd';
import PersonRemoveIcon  from '@mui/icons-material/PersonRemove';
import EditIcon          from '@mui/icons-material/Edit';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import LinkIcon          from '@mui/icons-material/Link';
import LinkOffIcon       from '@mui/icons-material/LinkOff';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import AttachFileIcon    from '@mui/icons-material/AttachFile';
import AssignmentIcon    from '@mui/icons-material/Assignment';
import EmailIcon         from '@mui/icons-material/Email';
import InfoIcon          from '@mui/icons-material/Info';
import GroupAddIcon      from '@mui/icons-material/GroupAdd';
import FolderSpecialIcon from '@mui/icons-material/FolderSpecial';
import SaveIcon          from '@mui/icons-material/Save';
import SecurityIcon      from '@mui/icons-material/Security';
import { teamApi } from '../services/cloudApi';
import { dashboardTokens, dashboardSemanticColors, dashboardPrimaryButtonSx } from '../styles/dashboardDesignSystem';
import type {
  Team, TeamActivityLog, TeamInvitation, TeamRole, PortfolioType,
} from '../types/teams';
import { TEAM_TYPE_LABELS, TEAM_TYPE_COLORS, ROLE_COLORS } from '../types/teams';

// ─── Tokens ───────────────────────────────────────────────────────────────────
const t = dashboardTokens.colors;

const TABS = ['Overview', 'Members', 'Permissions', 'Resources', 'Portfolios', 'Activity', 'Settings'] as const;

function RoleChip({ role }: { role: string }) {
  const color = ROLE_COLORS[role as keyof typeof ROLE_COLORS] ?? '#6B7280';
  return (
    <Chip label={role} size="small"
      sx={{ height: 20, bgcolor: `${color}22`, color, fontWeight: 700, fontSize: '.62rem', border: `1px solid ${color}44` }}
    />
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <Card sx={{ bgcolor: t.surfaceSubtle, border: `1px solid ${t.border}`, borderRadius: '4px', boxShadow: 'none', flex: 1 }}>
      <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
        <Typography sx={{ fontSize: '.68rem', color: t.textSecondary, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', mb: 0.5 }}>{label}</Typography>
        <Typography sx={{ fontSize: '1.4rem', fontWeight: 800, color: color ?? t.textPrimary, lineHeight: 1 }}>{value}</Typography>
      </CardContent>
    </Card>
  );
}

// ─── Tab 0: Overview ─────────────────────────────────────────────────────────

function OverviewTab({ team }: { team: Team }) {
  const color = TEAM_TYPE_COLORS[team.team_type];
  const initials = team.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  return (
    <Box>
      {/* Team identity card */}
      <Card sx={{ bgcolor: t.surface, border: `1px solid ${t.border}`, borderRadius: '4px', boxShadow: 'none', mb: 2.5 }}>
        <CardContent sx={{ p: 2.5 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5} alignItems="flex-start">
            <Avatar sx={{ bgcolor: team.avatar_color, width: 56, height: 56, fontSize: '1.2rem', fontWeight: 800, borderRadius: '6px', flexShrink: 0 }}>
              {initials}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap" useFlexGap>
                <Typography sx={{ fontWeight: 800, fontSize: '1.15rem', color: t.textPrimary, letterSpacing: '-.02em' }}>{team.name}</Typography>
                <Chip label={TEAM_TYPE_LABELS[team.team_type]} size="small"
                  sx={{ bgcolor: `${color}22`, color, fontWeight: 700, fontSize: '.65rem', border: `1px solid ${color}44` }} />
                {team.my_role && <RoleChip role={team.my_role} />}
                <Chip label={team.status} size="small"
                  sx={{ bgcolor: team.status === 'active' ? `${dashboardSemanticColors.success}22` : 'rgba(107,114,128,.2)',
                    color: team.status === 'active' ? dashboardSemanticColors.success : '#6B7280',
                    fontWeight: 700, fontSize: '.62rem' }} />
              </Stack>
              {team.description && (
                <Typography sx={{ mt: 0.75, fontSize: '.82rem', color: t.textSecondary }}>{team.description}</Typography>
              )}
              <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
                <Typography sx={{ fontSize: '.72rem', color: t.textTertiary }}>
                  Owner: <strong style={{ color: t.textSecondary }}>{team.owner.full_name || team.owner.username}</strong>
                </Typography>
                <Typography sx={{ fontSize: '.72rem', color: t.border }}>·</Typography>
                <Typography sx={{ fontSize: '.72rem', color: t.textTertiary }}>
                  ID: <span style={{ fontFamily: 'monospace', color: t.textSecondary }}>{team.team_id}</span>
                </Typography>
                <Typography sx={{ fontSize: '.72rem', color: t.border }}>·</Typography>
                <Typography sx={{ fontSize: '.72rem', color: t.textTertiary }}>
                  Created {new Date(team.created_at).toLocaleDateString()}
                </Typography>
              </Stack>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Stats */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2.5 }}>
        <StatCard label="Members"     value={team.members.length} />
        <StatCard label="Resources"   value={team.resources.length} />
        <StatCard label="Portfolios"  value={team.portfolios.length} />
        <StatCard label="Permissions" value={team.permissions.filter(p => p.allowed).length} color={dashboardSemanticColors.success} />
      </Stack>

      {/* Recent members */}
      <Card sx={{ bgcolor: t.surface, border: `1px solid ${t.border}`, borderRadius: '4px', boxShadow: 'none' }}>
        <CardContent sx={{ p: 2 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '.85rem', color: t.textPrimary, mb: 1.5 }}>Team Members</Typography>
          <Stack spacing={1}>
            {team.members.slice(0, 6).map(m => (
              <Stack key={m.id} direction="row" alignItems="center" spacing={1.5}>
                <Avatar sx={{ width: 28, height: 28, bgcolor: t.brandPrimary, fontSize: '.72rem', fontWeight: 700 }}>
                  {(m.user.first_name?.[0] || m.user.username[0]).toUpperCase()}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontSize: '.8rem', fontWeight: 600, color: t.textPrimary }}>
                    {m.user.full_name || m.user.username}
                  </Typography>
                  <Typography sx={{ fontSize: '.7rem', color: t.textTertiary }}>{m.user.email}</Typography>
                </Box>
                <RoleChip role={m.role} />
              </Stack>
            ))}
            {team.members.length > 6 && (
              <Typography sx={{ fontSize: '.75rem', color: t.brandPrimary }}>+ {team.members.length - 6} more members</Typography>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}

// ─── Tab 1: Members ───────────────────────────────────────────────────────────

function MembersTab({ team, reload }: { team: Team; reload: () => void }) {
  const canEdit = team.my_role === 'owner' || team.my_role === 'admin';
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<TeamRole>('member');
  const [inviting, setInviting] = useState(false);
  const [inviteErr, setInviteErr] = useState('');
  const [pendingInvites, setPendingInvites] = useState<TeamInvitation[]>([]);
  const [removing, setRemoving] = useState<number | null>(null);

  useEffect(() => {
    teamApi.invitations(team.team_id).then(r => setPendingInvites(r.data as any)).catch(() => {});
  }, [team.team_id]);

  const handleInvite = async () => {
    setInviting(true); setInviteErr('');
    try {
      await teamApi.invite(team.team_id, inviteEmail, inviteRole);
      setInviteOpen(false); setInviteEmail(''); setInviteRole('member');
      teamApi.invitations(team.team_id).then(r => setPendingInvites(r.data as any)).catch(() => {});
    } catch (e: any) {
      setInviteErr(e?.response?.data?.detail || 'Failed to send invite.');
    } finally { setInviting(false); }
  };

  const handleChangeRole = async (userId: number, role: TeamRole) => {
    try {
      await teamApi.changeRole(team.team_id, userId, role);
      reload();
    } catch {}
  };

  const handleRemove = async (userId: number) => {
    setRemoving(userId);
    try { await teamApi.removeMember(team.team_id, userId); reload(); }
    catch {} finally { setRemoving(null); }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography sx={{ fontSize: '.85rem', color: t.textSecondary }}>
          {team.members.length} member{team.members.length !== 1 ? 's' : ''}
        </Typography>
        {canEdit && (
          <Button size="small" variant="contained" startIcon={<PersonAddIcon />}
            onClick={() => setInviteOpen(true)}
            sx={{ ...dashboardPrimaryButtonSx, textTransform: 'none', fontSize: '.78rem' }}>
            Invite Member
          </Button>
        )}
      </Stack>

      <TableContainer component={Paper} sx={{ bgcolor: t.surface, border: `1px solid ${t.border}`, borderRadius: '4px', boxShadow: 'none' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { borderColor: t.border, color: t.textSecondary, fontWeight: 700, fontSize: '.72rem', textTransform: 'uppercase', letterSpacing: '.06em' } }}>
              <TableCell>User</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Joined</TableCell>
              {canEdit && <TableCell align="right">Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {team.members.map(m => (
              <TableRow key={m.id} sx={{ '& td': { borderColor: t.border, color: t.textPrimary, fontSize: '.82rem' } }}>
                <TableCell>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Avatar sx={{ width: 24, height: 24, bgcolor: t.brandPrimary, fontSize: '.65rem', fontWeight: 700 }}>
                      {(m.user.first_name?.[0] || m.user.username[0]).toUpperCase()}
                    </Avatar>
                    <Typography sx={{ fontSize: '.82rem', fontWeight: 600, color: t.textPrimary }}>
                      {m.user.full_name || m.user.username}
                    </Typography>
                  </Stack>
                </TableCell>
                <TableCell sx={{ color: t.textSecondary, fontSize: '.78rem' }}>{m.user.email}</TableCell>
                <TableCell>
                  {canEdit && m.role !== 'owner' ? (
                    <Select value={m.role} size="small" variant="standard" disableUnderline
                      onChange={e => handleChangeRole(m.user.id, e.target.value as TeamRole)}
                      sx={{ fontSize: '.78rem', color: ROLE_COLORS[m.role as keyof typeof ROLE_COLORS] ?? '#6B7280', fontWeight: 700 }}>
                      {(['admin', 'member', 'viewer'] as TeamRole[]).map(r => (
                        <MenuItem key={r} value={r} sx={{ fontSize: '.78rem' }}>{r}</MenuItem>
                      ))}
                    </Select>
                  ) : (
                    <RoleChip role={m.role} />
                  )}
                </TableCell>
                <TableCell sx={{ color: t.textTertiary, fontSize: '.75rem' }}>{new Date(m.joined_at).toLocaleDateString()}</TableCell>
                {canEdit && (
                  <TableCell align="right">
                    {m.role !== 'owner' && (
                      <Tooltip title="Remove member">
                        <IconButton size="small" onClick={() => handleRemove(m.user.id)}
                          disabled={removing === m.user.id}
                          sx={{ color: '#EF4444', '&:hover': { bgcolor: 'rgba(239,68,68,.1)' } }}>
                          {removing === m.user.id ? <CircularProgress size={14} /> : <DeleteIcon sx={{ fontSize: '1rem' }} />}
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pending invitations */}
      {pendingInvites.length > 0 && (
        <Box sx={{ mt: 2.5 }}>
          <Typography sx={{ fontSize: '.82rem', fontWeight: 700, color: t.textPrimary, mb: 1 }}>Pending Invitations</Typography>
          <Stack spacing={0.75}>
            {pendingInvites.map(inv => (
              <Stack key={inv.invite_id} direction="row" alignItems="center" spacing={1.5}
                sx={{ p: 1.25, bgcolor: t.surfaceSubtle, borderRadius: '4px', border: `1px solid ${t.border}` }}>
                <Typography sx={{ flex: 1, fontSize: '.8rem', color: t.textPrimary }}>{inv.email}</Typography>
                <RoleChip role={inv.role} />
                <Chip label="Pending" size="small"
                  sx={{ bgcolor: 'rgba(245,158,11,.15)', color: '#F59E0B', fontWeight: 700, fontSize: '.6rem' }} />
                <Typography sx={{ fontSize: '.72rem', color: t.textTertiary }}>
                  Expires {new Date(inv.expires_at).toLocaleDateString()}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Box>
      )}

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onClose={() => setInviteOpen(false)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { bgcolor: t.surface, border: `1px solid ${t.border}`, borderRadius: '6px', boxShadow: 'none' } }}>
        <DialogTitle sx={{ color: t.textPrimary, fontWeight: 800 }}>Invite Member</DialogTitle>
        <Divider sx={{ borderColor: t.border }} />
        <DialogContent>
          {inviteErr && <Alert severity="error" sx={{ mb: 1.5, fontSize: '.78rem' }}>{inviteErr}</Alert>}
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Email Address" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
              fullWidth size="small" type="email"
              InputLabelProps={{ sx: { color: t.textSecondary } }}
              InputProps={{ sx: { color: t.textPrimary, bgcolor: t.surfaceSubtle } }} />
            <FormControl size="small" fullWidth>
              <InputLabel sx={{ color: t.textSecondary }}>Role</InputLabel>
              <Select value={inviteRole} onChange={e => setInviteRole(e.target.value as TeamRole)} label="Role"
                sx={{ color: t.textPrimary, bgcolor: t.surfaceSubtle }}>
                {(['admin', 'member', 'viewer'] as TeamRole[]).map(r => (
                  <MenuItem key={r} value={r} sx={{ fontSize: '.85rem' }}>{r.charAt(0).toUpperCase() + r.slice(1)}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <Divider sx={{ borderColor: t.border }} />
        <DialogActions sx={{ px: 2.5, py: 1.5 }}>
          <Button onClick={() => setInviteOpen(false)} sx={{ color: t.textSecondary, textTransform: 'none' }}>Cancel</Button>
          <Button onClick={handleInvite} disabled={!inviteEmail || inviting} variant="contained"
            sx={{ ...dashboardPrimaryButtonSx, textTransform: 'none' }}
            startIcon={inviting ? <CircularProgress size={14} color="inherit" /> : <PersonAddIcon />}>
            {inviting ? 'Sending…' : 'Send Invite'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ─── Tab 2: Permissions ───────────────────────────────────────────────────────

function PermissionsTab({ team, reload }: { team: Team; reload: () => void }) {
  const canEdit = team.my_role === 'owner' || team.my_role === 'admin';
  const [local, setLocal] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [applyingTpl, setApplyingTpl] = useState(false);

  useEffect(() => {
    const map: Record<string, boolean> = {};
    team.permissions.forEach(p => { map[p.permission_key] = p.allowed; });
    setLocal(map);
  }, [team.permissions]);

  const handleSave = async () => {
    setSaving(true); setSaved(false);
    try {
      await teamApi.updatePermissions(team.team_id, local);
      setSaved(true); reload();
      setTimeout(() => setSaved(false), 2500);
    } catch {} finally { setSaving(false); }
  };

  const handleApplyTemplate = async () => {
    setApplyingTpl(true);
    try { await teamApi.applyTemplate(team.team_id, team.team_type); reload(); }
    catch {} finally { setApplyingTpl(false); }
  };

  const grouped = Object.entries(local).reduce<Record<string, [string, boolean][]>>((acc, [key, val]) => {
    const ns = key.split('.')[0];
    if (!acc[ns]) acc[ns] = [];
    acc[ns].push([key, val]);
    return acc;
  }, {});

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }} flexWrap="wrap" gap={1}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <SecurityIcon sx={{ fontSize: '1rem', color: t.textSecondary }} />
          <Typography sx={{ fontSize: '.85rem', color: t.textSecondary }}>
            {team.permissions.length} permission{team.permissions.length !== 1 ? 's' : ''} ·&nbsp;
            <strong style={{ color: dashboardSemanticColors.success }}>{team.permissions.filter(p => p.allowed).length} allowed</strong>
          </Typography>
        </Stack>
        {canEdit && (
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="outlined" onClick={handleApplyTemplate} disabled={applyingTpl}
              sx={{ textTransform: 'none', fontSize: '.75rem', borderColor: t.border, color: t.textSecondary }}>
              {applyingTpl ? 'Applying…' : 'Reset to Template'}
            </Button>
            <Button size="small" variant="contained" startIcon={saving ? <CircularProgress size={13} color="inherit" /> : <SaveIcon />}
              onClick={handleSave} disabled={saving}
              sx={{ ...dashboardPrimaryButtonSx, textTransform: 'none', fontSize: '.78rem' }}>
              {saved ? 'Saved OK' : 'Save Changes'}
            </Button>
          </Stack>
        )}
      </Stack>

      {Object.keys(grouped).length === 0 && (
        <Alert severity="info" sx={{ fontSize: '.8rem' }}>
          No permissions defined. Click "Reset to Template" to apply the default template for {TEAM_TYPE_LABELS[team.team_type]}.
        </Alert>
      )}

      <Stack spacing={2}>
        {Object.entries(grouped).map(([ns, entries]) => (
          <Card key={ns} sx={{ bgcolor: t.surface, border: `1px solid ${t.border}`, borderRadius: '4px', boxShadow: 'none' }}>
            <CardContent sx={{ p: 2 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '.78rem', color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.08em', mb: 1.5 }}>
                {ns}
              </Typography>
              <Stack spacing={0.5}>
                {entries.map(([key]) => (
                  <Stack key={key} direction="row" alignItems="center" justifyContent="space-between">
                    <Typography sx={{ fontSize: '.82rem', fontFamily: 'monospace', color: t.textPrimary }}>{key}</Typography>
                    <Switch
                      size="small"
                      checked={local[key] ?? false}
                      disabled={!canEdit}
                      onChange={e => setLocal(p => ({ ...p, [key]: e.target.checked }))}
                      sx={{ '& .MuiSwitch-thumb': { bgcolor: (local[key] ?? false) ? dashboardSemanticColors.success : '#6B7280' } }}
                    />
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>
    </Box>
  );
}

// ─── Tab 3: Resources ─────────────────────────────────────────────────────────

function ResourcesTab({ team, reload }: { team: Team; reload: () => void }) {
  const canEdit = team.my_role === 'owner' || team.my_role === 'admin';
  const [attachOpen, setAttachOpen] = useState(false);
  const [form, setForm] = useState({ resource_type: '', resource_id: '', resource_name: '' });
  const [attaching, setAttaching] = useState(false);
  const [detaching, setDetaching] = useState<number | null>(null);

  const handleAttach = async () => {
    setAttaching(true);
    try {
      await teamApi.attachResource(team.team_id, { ...form, permissions: { read: true, write: true } });
      setAttachOpen(false); setForm({ resource_type: '', resource_id: '', resource_name: '' }); reload();
    } catch {} finally { setAttaching(false); }
  };

  const handleDetach = async (id: number) => {
    setDetaching(id);
    try { await teamApi.detachResource(team.team_id, id); reload(); }
    catch {} finally { setDetaching(null); }
  };

  const RESOURCE_TYPES = ['app', 'domain', 'pipeline', 'deployment', 'campaign', 'dataset', 'model', 'certificate', 'bucket', 'compute'];

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography sx={{ fontSize: '.85rem', color: t.textSecondary }}>{team.resources.length} attached resource{team.resources.length !== 1 ? 's' : ''}</Typography>
        {canEdit && (
          <Button size="small" variant="contained" startIcon={<LinkIcon />} onClick={() => setAttachOpen(true)}
            sx={{ ...dashboardPrimaryButtonSx, textTransform: 'none', fontSize: '.78rem' }}>
            Attach Resource
          </Button>
        )}
      </Stack>

      {team.resources.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 5 }}>
          <LinkIcon sx={{ fontSize: '2.5rem', color: t.textTertiary, mb: 1 }} />
          <Typography sx={{ color: t.textSecondary, fontSize: '.85rem' }}>No resources attached yet.</Typography>
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ bgcolor: t.surface, border: `1px solid ${t.border}`, borderRadius: '4px', boxShadow: 'none' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { borderColor: t.border, color: t.textSecondary, fontWeight: 700, fontSize: '.72rem', textTransform: 'uppercase', letterSpacing: '.06em' } }}>
                <TableCell>Type</TableCell>
                <TableCell>Resource ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Permissions</TableCell>
                <TableCell>Attached</TableCell>
                {canEdit && <TableCell align="right" />}
              </TableRow>
            </TableHead>
            <TableBody>
              {team.resources.map(r => (
                <TableRow key={r.id} sx={{ '& td': { borderColor: t.border, fontSize: '.82rem', color: t.textPrimary } }}>
                  <TableCell>
                    <Chip label={r.resource_type} size="small"
                      sx={{ bgcolor: `${t.brandPrimary}22`, color: t.brandPrimary, fontWeight: 700, fontSize: '.62rem' }} />
                  </TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '.76rem', color: t.textSecondary }}>{r.resource_id}</TableCell>
                  <TableCell>{r.resource_name || '—'}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                      {Object.entries(r.permissions).map(([k, v]) => v && (
                        <Chip key={k} label={k} size="small"
                          sx={{ bgcolor: `${dashboardSemanticColors.success}22`, color: dashboardSemanticColors.success, fontSize: '.6rem', fontWeight: 700, height: 18 }} />
                      ))}
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ color: t.textTertiary, fontSize: '.74rem' }}>{new Date(r.created_at).toLocaleDateString()}</TableCell>
                  {canEdit && (
                    <TableCell align="right">
                      <Tooltip title="Detach">
                        <IconButton size="small" onClick={() => handleDetach(r.id)} disabled={detaching === r.id}
                          sx={{ color: '#EF4444', '&:hover': { bgcolor: 'rgba(239,68,68,.1)' } }}>
                          {detaching === r.id ? <CircularProgress size={13} /> : <LinkOffIcon sx={{ fontSize: '1rem' }} />}
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={attachOpen} onClose={() => setAttachOpen(false)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { bgcolor: t.surface, border: `1px solid ${t.border}`, borderRadius: '6px', boxShadow: 'none' } }}>
        <DialogTitle sx={{ color: t.textPrimary, fontWeight: 800 }}>Attach Resource</DialogTitle>
        <Divider sx={{ borderColor: t.border }} />
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl size="small" fullWidth>
              <InputLabel sx={{ color: t.textSecondary }}>Resource Type</InputLabel>
              <Select value={form.resource_type} onChange={e => setForm(p => ({ ...p, resource_type: e.target.value }))} label="Resource Type"
                sx={{ color: t.textPrimary, bgcolor: t.surfaceSubtle }}>
                {RESOURCE_TYPES.map(rt => <MenuItem key={rt} value={rt} sx={{ fontSize: '.85rem' }}>{rt}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="Resource ID" value={form.resource_id} onChange={e => setForm(p => ({ ...p, resource_id: e.target.value }))}
              fullWidth size="small" placeholder="e.g. dom-abc123"
              InputLabelProps={{ sx: { color: t.textSecondary } }} InputProps={{ sx: { color: t.textPrimary, bgcolor: t.surfaceSubtle } }} />
            <TextField label="Display Name (optional)" value={form.resource_name} onChange={e => setForm(p => ({ ...p, resource_name: e.target.value }))}
              fullWidth size="small"
              InputLabelProps={{ sx: { color: t.textSecondary } }} InputProps={{ sx: { color: t.textPrimary, bgcolor: t.surfaceSubtle } }} />
          </Stack>
        </DialogContent>
        <Divider sx={{ borderColor: t.border }} />
        <DialogActions sx={{ px: 2.5, py: 1.5 }}>
          <Button onClick={() => setAttachOpen(false)} sx={{ color: t.textSecondary, textTransform: 'none' }}>Cancel</Button>
          <Button onClick={handleAttach} disabled={!form.resource_type || !form.resource_id || attaching} variant="contained"
            sx={{ ...dashboardPrimaryButtonSx, textTransform: 'none' }}>
            {attaching ? 'Attaching…' : 'Attach'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ─── Tab 4: Portfolios ────────────────────────────────────────────────────────

function PortfoliosTab({ team, reload }: { team: Team; reload: () => void }) {
  const canEdit = team.my_role === 'owner' || team.my_role === 'admin' || team.my_role === 'member';
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: '', portfolio_type: 'general' as PortfolioType, description: '' });
  const [creating, setCreating] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await teamApi.createPortfolio(team.team_id, { ...form });
      setCreateOpen(false); setForm({ name: '', portfolio_type: 'general', description: '' }); reload();
    } catch {} finally { setCreating(false); }
  };

  const handleDelete = async (portfolioId: string) => {
    try { await teamApi.deletePortfolio(team.team_id, portfolioId); reload(); } catch {}
  };

  const PORT_TYPE_COLOR: Record<PortfolioType, string> = {
    developer: '#153d75', marketing: '#A855F7', data: '#22C55E', general: '#6B7280',
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography sx={{ fontSize: '.85rem', color: t.textSecondary }}>{team.portfolios.length} portfolio{team.portfolios.length !== 1 ? 's' : ''}</Typography>
        {canEdit && (
          <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}
            sx={{ ...dashboardPrimaryButtonSx, textTransform: 'none', fontSize: '.78rem' }}>
            New Portfolio
          </Button>
        )}
      </Stack>

      {team.portfolios.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 5 }}>
          <FolderSpecialIcon sx={{ fontSize: '2.5rem', color: t.textTertiary, mb: 1 }} />
          <Typography sx={{ color: t.textSecondary, fontSize: '.85rem' }}>No portfolios yet. Create one to organise team work.</Typography>
        </Box>
      )}

      <Stack spacing={1.5}>
        {team.portfolios.map(port => {
          const col = PORT_TYPE_COLOR[port.portfolio_type] ?? '#6B7280';
          const isOpen = expanded === port.portfolio_id;
          return (
            <Card key={port.portfolio_id} sx={{ bgcolor: t.surface, border: `1px solid ${t.border}`, borderRadius: '4px', boxShadow: 'none' }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '2px', bgcolor: col, flexShrink: 0 }} />
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '.88rem', color: t.textPrimary }}>{port.name}</Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 0.25 }}>
                      <Chip label={port.portfolio_type} size="small"
                        sx={{ bgcolor: `${col}22`, color: col, fontWeight: 700, fontSize: '.6rem', height: 18 }} />
                      <Typography sx={{ fontSize: '.72rem', color: t.textTertiary }}>{port.item_count} item{port.item_count !== 1 ? 's' : ''}</Typography>
                    </Stack>
                    {port.description && <Typography sx={{ fontSize: '.75rem', color: t.textSecondary, mt: 0.5 }}>{port.description}</Typography>}
                  </Box>
                  <Stack direction="row" spacing={0.5}>
                    <Button size="small" sx={{ textTransform: 'none', fontSize: '.72rem', color: t.brandPrimary }}
                      onClick={() => setExpanded(isOpen ? null : port.portfolio_id)}>
                      {isOpen ? 'Hide' : 'Items'}
                    </Button>
                    {canEdit && (
                      <Tooltip title="Delete portfolio">
                        <IconButton size="small" onClick={() => handleDelete(port.portfolio_id)}
                          sx={{ color: '#EF4444', '&:hover': { bgcolor: 'rgba(239,68,68,.1)' } }}>
                          <DeleteIcon sx={{ fontSize: '.9rem' }} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Stack>
                </Stack>

                {/* Expanded items */}
                {isOpen && (
                  <Box sx={{ mt: 1.5, pl: 2.5 }}>
                    <Divider sx={{ borderColor: t.border, mb: 1.5 }} />
                    {port.items.length === 0 ? (
                      <Typography sx={{ fontSize: '.78rem', color: t.textTertiary }}>No items in this portfolio.</Typography>
                    ) : (
                      <Stack spacing={0.75}>
                        {port.items.map(item => (
                          <Stack key={item.id} direction="row" alignItems="center" spacing={1.5}>
                            <Chip label={item.resource_type} size="small"
                              sx={{ bgcolor: `${t.brandPrimary}22`, color: t.brandPrimary, fontWeight: 700, fontSize: '.6rem', height: 18, flexShrink: 0 }} />
                            <Typography sx={{ fontSize: '.78rem', fontFamily: 'monospace', color: t.textSecondary }}>{item.resource_id}</Typography>
                            <Typography sx={{ fontSize: '.78rem', color: t.textPrimary }}>{item.resource_name}</Typography>
                          </Stack>
                        ))}
                      </Stack>
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>
          );
        })}
      </Stack>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { bgcolor: t.surface, border: `1px solid ${t.border}`, borderRadius: '6px', boxShadow: 'none' } }}>
        <DialogTitle sx={{ color: t.textPrimary, fontWeight: 800 }}>New Portfolio</DialogTitle>
        <Divider sx={{ borderColor: t.border }} />
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              fullWidth size="small"
              InputLabelProps={{ sx: { color: t.textSecondary } }} InputProps={{ sx: { color: t.textPrimary, bgcolor: t.surfaceSubtle } }} />
            <FormControl size="small" fullWidth>
              <InputLabel sx={{ color: t.textSecondary }}>Type</InputLabel>
              <Select value={form.portfolio_type} onChange={e => setForm(p => ({ ...p, portfolio_type: e.target.value as PortfolioType }))} label="Type"
                sx={{ color: t.textPrimary, bgcolor: t.surfaceSubtle }}>
                {(['developer', 'marketing', 'data', 'general'] as PortfolioType[]).map(pt => (
                  <MenuItem key={pt} value={pt} sx={{ fontSize: '.85rem' }}>{pt.charAt(0).toUpperCase() + pt.slice(1)}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField label="Description (optional)" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              fullWidth size="small" multiline rows={2}
              InputLabelProps={{ sx: { color: t.textSecondary } }} InputProps={{ sx: { color: t.textPrimary, bgcolor: t.surfaceSubtle } }} />
          </Stack>
        </DialogContent>
        <Divider sx={{ borderColor: t.border }} />
        <DialogActions sx={{ px: 2.5, py: 1.5 }}>
          <Button onClick={() => setCreateOpen(false)} sx={{ color: t.textSecondary, textTransform: 'none' }}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!form.name || creating} variant="contained"
            sx={{ ...dashboardPrimaryButtonSx, textTransform: 'none' }}>
            {creating ? 'Creating…' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ─── Tab 5: Activity ──────────────────────────────────────────────────────────

function ActivityTab({ teamId }: { teamId: string }) {
  const [logs, setLogs] = useState<TeamActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    teamApi.activity(teamId)
      .then(r => setLogs(r.data as any))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [teamId]);

  const iconSx = { fontSize: '1rem', color: t.textSecondary };
  const ACTION_ICONS: Record<string, React.ReactNode> = {
    team_created:        <GroupAddIcon          sx={iconSx} />,
    team_updated:        <EditIcon              sx={iconSx} />,
    member_added:        <PersonAddIcon         sx={iconSx} />,
    member_removed:      <PersonRemoveIcon      sx={iconSx} />,
    role_changed:        <ManageAccountsIcon    sx={iconSx} />,
    resource_attached:   <LinkIcon              sx={iconSx} />,
    resource_detached:   <LinkOffIcon           sx={iconSx} />,
    portfolio_created:   <CreateNewFolderIcon   sx={iconSx} />,
    portfolio_deleted:   <DeleteIcon            sx={iconSx} />,
    portfolio_item_added:<AttachFileIcon        sx={iconSx} />,
    permissions_updated: <SecurityIcon          sx={iconSx} />,
    template_applied:    <AssignmentIcon        sx={iconSx} />,
    invitation_sent:     <EmailIcon             sx={iconSx} />,
  };
  const fallbackIcon = <InfoIcon sx={iconSx} />;

  if (loading) return <LinearProgress sx={{ mt: 2 }} />;

  return (
    <Box>
      {logs.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 5 }}>
          <Typography sx={{ color: t.textSecondary }}>No activity recorded yet.</Typography>
        </Box>
      ) : (
        <Stack spacing={0}>
          {logs.map((log) => (
            <Stack key={log.id} direction="row" spacing={1.5} sx={{ py: 1.25, borderBottom: `1px solid ${t.border}` }} alignItems="flex-start">
              <Box sx={{ mt: 0.15, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                {ACTION_ICONS[log.action] ?? fallbackIcon}
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: '.82rem', color: t.textPrimary }}>
                  <strong>{log.actor?.full_name || log.actor?.username || 'System'}</strong>{' '}
                  <span style={{ color: t.textSecondary }}>{log.action.replace(/_/g, ' ')}</span>
                  {log.target_name && <> · <span style={{ color: t.brandPrimary }}>{log.target_name}</span></>}
                </Typography>
                <Typography sx={{ fontSize: '.7rem', color: t.textTertiary }}>
                  {new Date(log.timestamp).toLocaleString()}
                </Typography>
              </Box>
            </Stack>
          ))}
        </Stack>
      )}
    </Box>
  );
}

// ─── Tab 6: Settings ──────────────────────────────────────────────────────────

const AVATAR_COLORS_SETTINGS = ['#153d75', '#A855F7', '#22C55E', '#F59E0B', '#EF4444', '#153d75', '#EC4899'];

function SettingsTab({ team, reload }: { team: Team; reload: () => void }) {
  const navigate = useNavigate();
  const isOwner = team.my_role === 'owner';
  const canEdit = isOwner || team.my_role === 'admin';
  const [name, setName] = useState(team.name);
  const [description, setDescription] = useState(team.description);
  const [avatarColor, setAvatarColor] = useState(team.avatar_color);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const handleSave = async () => {
    setSaving(true); setSaved(false);
    try {
      await teamApi.update(team.team_id, { name: name.trim(), description: description.trim(), avatar_color: avatarColor });
      setSaved(true); reload();
      setTimeout(() => setSaved(false), 2500);
    } catch {} finally { setSaving(false); }
  };

  const handleArchive = async () => {
    setArchiving(true);
    try {
      await teamApi.update(team.team_id, { status: 'archived' });
      reload();
    } catch {} finally { setArchiving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await teamApi.delete(team.team_id);
      navigate('/dashboard/teams');
    } catch {} finally { setDeleting(false); setDeleteConfirm(false); }
  };

  return (
    <Box>
      <Stack spacing={2.5}>
        {/* General settings */}
        <Card sx={{ bgcolor: t.surface, border: `1px solid ${t.border}`, borderRadius: '4px', boxShadow: 'none' }}>
          <CardContent sx={{ p: 2.5 }}>
            <Typography sx={{ fontWeight: 700, fontSize: '.88rem', color: t.textPrimary, mb: 2 }}>General</Typography>
            <Stack spacing={2}>
              <TextField label="Team Name" value={name} onChange={e => setName(e.target.value)} fullWidth size="small" disabled={!canEdit}
                InputLabelProps={{ sx: { color: t.textSecondary } }} InputProps={{ sx: { color: t.textPrimary, bgcolor: t.surfaceSubtle } }} />
              <TextField label="Description" value={description} onChange={e => setDescription(e.target.value)} fullWidth size="small" multiline rows={2} disabled={!canEdit}
                InputLabelProps={{ sx: { color: t.textSecondary } }} InputProps={{ sx: { color: t.textPrimary, bgcolor: t.surfaceSubtle } }} />
              <Box>
                <Typography sx={{ fontSize: '.8rem', color: t.textSecondary, mb: 1, fontWeight: 600 }}>Avatar Colour</Typography>
                <Stack direction="row" spacing={1}>
                  {AVATAR_COLORS_SETTINGS.map(c => (
                    <Box key={c} onClick={() => canEdit && setAvatarColor(c)}
                      sx={{ width: 28, height: 28, borderRadius: '4px', bgcolor: c, cursor: canEdit ? 'pointer' : 'default',
                        border: avatarColor === c ? `2px solid ${t.textPrimary}` : '2px solid transparent', transition: 'border .1s' }} />
                  ))}
                </Stack>
              </Box>
              {canEdit && (
                <Box>
                  <Button variant="contained" startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <SaveIcon />}
                    onClick={handleSave} disabled={saving || !name.trim()}
                    sx={{ ...dashboardPrimaryButtonSx, textTransform: 'none' }}>
                    {saved ? 'Saved OK' : 'Save Changes'}
                  </Button>
                </Box>
              )}
            </Stack>
          </CardContent>
        </Card>

        {/* Danger zone */}
        {isOwner && (
          <Card sx={{ bgcolor: t.surface, border: '1px solid rgba(239,68,68,.35)', borderRadius: '4px', boxShadow: 'none' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '.88rem', color: '#EF4444', mb: 2 }}>Danger Zone</Typography>
              <Stack spacing={2}>
                {team.status === 'active' && (
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography sx={{ fontSize: '.85rem', fontWeight: 600, color: t.textPrimary }}>Archive Team</Typography>
                      <Typography sx={{ fontSize: '.75rem', color: t.textSecondary }}>Team will be hidden but data is preserved.</Typography>
                    </Box>
                    <Button variant="outlined" size="small" onClick={handleArchive} disabled={archiving}
                      sx={{ textTransform: 'none', fontSize: '.78rem', borderColor: '#F59E0B', color: '#F59E0B', '&:hover': { borderColor: '#F59E0B', bgcolor: 'rgba(245,158,11,.1)' } }}>
                      {archiving ? 'Archiving…' : 'Archive'}
                    </Button>
                  </Stack>
                )}
                <Divider sx={{ borderColor: 'rgba(239,68,68,.2)' }} />
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography sx={{ fontSize: '.85rem', fontWeight: 600, color: '#EF4444' }}>Delete Team</Typography>
                    <Typography sx={{ fontSize: '.75rem', color: t.textSecondary }}>Permanently delete the team and all its data. This cannot be undone.</Typography>
                  </Box>
                  <Button variant="outlined" size="small" onClick={() => setDeleteConfirm(true)}
                    sx={{ textTransform: 'none', fontSize: '.78rem', borderColor: '#EF4444', color: '#EF4444', '&:hover': { borderColor: '#EF4444', bgcolor: 'rgba(239,68,68,.1)' } }}>
                    Delete
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        )}
      </Stack>

      <Dialog open={deleteConfirm} onClose={() => setDeleteConfirm(false)} maxWidth="xs"
        PaperProps={{ sx: { bgcolor: t.surface, border: `1px solid ${t.border}`, borderRadius: '6px', boxShadow: 'none' } }}>
        <DialogTitle sx={{ color: '#EF4444', fontWeight: 800 }}>Delete Team?</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: '.85rem', color: t.textPrimary }}>
            Are you sure you want to permanently delete <strong>{team.name}</strong>? All data, members, resources, and portfolios will be removed.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 2.5, py: 1.5 }}>
          <Button onClick={() => setDeleteConfirm(false)} sx={{ color: t.textSecondary, textTransform: 'none' }}>Cancel</Button>
          <Button onClick={handleDelete} disabled={deleting} variant="contained"
            sx={{ bgcolor: '#EF4444', '&:hover': { bgcolor: '#DC2626' }, textTransform: 'none', fontWeight: 700 }}>
            {deleting ? 'Deleting…' : 'Yes, Delete Team'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TeamDetailPage: React.FC = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState(0);

  const load = useCallback(() => {
    if (!teamId) return;
    setLoading(true);
    teamApi.get(teamId)
      .then(r => setTeam(r.data as any))
      .catch(() => setError('Team not found or you do not have access.'))
      .finally(() => setLoading(false));
  }, [teamId]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress sx={{ mb: 2 }} />
        <Typography sx={{ color: t.textSecondary }}>Loading team…</Typography>
      </Box>
    );
  }

  if (error || !team) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error || 'Team not found.'}</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/dashboard/teams')} sx={{ mt: 2, textTransform: 'none', color: t.textSecondary }}>
          Back to Teams
        </Button>
      </Box>
    );
  }

  const typeColor = TEAM_TYPE_COLORS[team.team_type];

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Back + breadcrumb */}
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <Button size="small" startIcon={<ArrowBackIcon />} onClick={() => navigate('/dashboard/teams')}
          sx={{ textTransform: 'none', color: t.textSecondary, fontSize: '.78rem', fontWeight: 600 }}>
          Teams
        </Button>
        <Typography sx={{ color: t.textTertiary, fontSize: '.75rem' }}>/</Typography>
        <Typography sx={{ fontSize: '.78rem', fontWeight: 700, color: t.textPrimary }}>{team.name}</Typography>
      </Stack>

      {/* Tabs */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{
          mb: 3,
          borderBottom: `1px solid ${t.border}`,
          '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: '.82rem', color: t.textSecondary, minHeight: 40 },
          '& .Mui-selected': { color: typeColor },
          '& .MuiTabs-indicator': { bgcolor: typeColor },
        }}
      >
        {TABS.map((label, _i) => (
          <Tab key={label} label={
            label === 'Members' ? (
              <Badge badgeContent={team.members.length} color="primary" max={99}
                sx={{ '& .MuiBadge-badge': { fontSize: '.55rem', height: 16, minWidth: 16, bgcolor: t.brandPrimary } }}>
                {label}
              </Badge>
            ) : label
          } />
        ))}
      </Tabs>

      <Box>
        {tab === 0 && <OverviewTab team={team} />}
        {tab === 1 && <MembersTab team={team} reload={load} />}
        {tab === 2 && <PermissionsTab team={team} reload={load} />}
        {tab === 3 && <ResourcesTab team={team} reload={load} />}
        {tab === 4 && <PortfoliosTab team={team} reload={load} />}
        {tab === 5 && <ActivityTab teamId={team.team_id} />}
        {tab === 6 && <SettingsTab team={team} reload={load} />}
      </Box>
    </Box>
  );
};

export default TeamDetailPage;
