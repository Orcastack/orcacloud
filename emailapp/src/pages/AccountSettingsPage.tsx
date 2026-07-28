// OrcaCloud – Account Settings Page
import React, { useState } from 'react';
import axios from 'axios';
import {
  Box, Typography, Stack, Divider, Avatar, TextField, Button,
  Switch, Chip, IconButton, Tooltip,
  List, ListItemButton, ListItemIcon, ListItemText, Paper,
} from '@mui/material';
import { alpha, darken, useTheme } from '@mui/material/styles';
import { useNavigate, useParams } from 'react-router-dom';
import PersonIcon        from '@mui/icons-material/Person';
import LockIcon          from '@mui/icons-material/Lock';
import KeyIcon           from '@mui/icons-material/Key';
import ApiIcon           from '@mui/icons-material/Api';
import TuneIcon          from '@mui/icons-material/Tune';
import NotificationsIcon from '@mui/icons-material/Notifications';
import GppGoodIcon       from '@mui/icons-material/GppGood';
import GroupIcon         from '@mui/icons-material/Group';
import AddIcon           from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ContentCopyIcon   from '@mui/icons-material/ContentCopy';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import VisibilityIcon    from '@mui/icons-material/Visibility';
import { useAuth }       from '../contexts/AuthContext';
import {
  computeUiTokens,
  dashboardSemanticColors,
  dashboardStatusColors,
  dashboardTokens,
} from '../styles/dashboardDesignSystem';

const getSettingsPalette = (isDark: boolean) => {
  const accent = computeUiTokens.accentStrong;
  return {
    accent,
    accentHover: darken(accent, 0.15),
    white: dashboardTokens.colors.white,
    textPrimary: isDark ? dashboardTokens.colors.white : computeUiTokens.neutralStrong,
    textBody: isDark ? dashboardTokens.colors.white : computeUiTokens.neutralBody,
    textSecondary: isDark ? alpha(dashboardTokens.colors.white, 0.55) : dashboardTokens.colors.textSecondary,
    textMuted: isDark ? alpha(dashboardTokens.colors.white, 0.45) : computeUiTokens.neutralMuted,
    textMutedSoft: isDark ? alpha(dashboardTokens.colors.white, 0.35) : computeUiTokens.neutralMuted,
    cardBg: isDark ? computeUiTokens.darkPanel : dashboardTokens.colors.surface,
    pageBg: isDark ? darken(computeUiTokens.darkPanel, 0.22) : dashboardTokens.colors.background,
    headerBg: isDark ? darken(computeUiTokens.darkPanel, 0.16) : dashboardTokens.colors.surface,
    surfaceSubtle: isDark ? alpha(dashboardTokens.colors.white, 0.04) : dashboardTokens.colors.surfaceSubtle,
    surfaceHover: isDark ? alpha(dashboardTokens.colors.white, 0.06) : dashboardTokens.colors.surfaceHover,
    border: isDark ? alpha(dashboardTokens.colors.white, 0.08) : dashboardTokens.colors.border,
    borderSoft: isDark ? alpha(dashboardTokens.colors.white, 0.06) : dashboardTokens.colors.surfaceHover,
    borderStrong: isDark ? alpha(dashboardTokens.colors.white, 0.12) : dashboardTokens.colors.border,
    borderAccentHover: isDark ? alpha(dashboardTokens.colors.white, 0.25) : accent,
    iconMuted: isDark ? alpha(dashboardTokens.colors.white, 0.5) : dashboardTokens.colors.textSecondary,
    sidebarGroupLabel: isDark ? alpha(dashboardTokens.colors.white, 0.4) : computeUiTokens.neutralMuted,
    sidebarActiveBg: isDark ? alpha(accent, 0.5) : alpha(accent, 0.08),
    sidebarActiveHoverBg: isDark ? alpha(accent, 0.65) : alpha(accent, 0.12),
    sidebarHoverBg: isDark ? alpha(dashboardTokens.colors.white, 0.06) : alpha(accent, 0.05),
    accentSoft: isDark ? computeUiTokens.accentSoftDark : alpha(accent, 0.12),
    successSoft: computeUiTokens.successSoft,
    success: dashboardSemanticColors.success,
    warning: dashboardSemanticColors.warning,
    danger: dashboardSemanticColors.danger,
  };
};

// ── Section config ────────────────────────────────────────────────────────────
const SECTIONS = [
  {
    group: 'Account',
    items: [
      { key: 'profile',        label: 'Profile',        icon: <PersonIcon fontSize="small" /> },
      { key: 'preferences',    label: 'Preferences',    icon: <TuneIcon fontSize="small" /> },
      { key: 'notifications',  label: 'Notifications',  icon: <NotificationsIcon fontSize="small" /> },
    ],
  },
  {
    group: 'Security',
    items: [
      { key: 'authentication', label: 'Authentication', icon: <LockIcon fontSize="small" /> },
      { key: 'ssh-keys',       label: 'SSH Keys',       icon: <KeyIcon fontSize="small" /> },
      { key: 'compliance',     label: 'Compliance',     icon: <GppGoodIcon fontSize="small" /> },
    ],
  },
  {
    group: 'Developer',
    items: [
      { key: 'api',   label: 'API',   icon: <ApiIcon fontSize="small" /> },
      { key: 'users', label: 'Users', icon: <GroupIcon fontSize="small" /> },
    ],
  },
];

// ── Shared field styles ────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const palette = getSettingsPalette(isDark);
  return (
    <Box>
      <Typography variant="caption" fontWeight={600} sx={{ color: palette.textSecondary, textTransform: 'uppercase', letterSpacing: '.07em', mb: .5, display: 'block' }}>
        {label}
      </Typography>
      {children}
    </Box>
  );
}

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const palette = getSettingsPalette(isDark);
  return (
    <Paper elevation={0} sx={{ bgcolor: palette.cardBg, border: `1px solid ${palette.border}`, borderRadius: '12px', p: 3, mb: 3 }}>
      <Typography fontWeight={700} fontSize="1rem" color={palette.textPrimary} mb={subtitle ? .5 : 2}>{title}</Typography>
      {subtitle && <Typography variant="body2" sx={{ color: palette.textSecondary, mb: 2 }}>{subtitle}</Typography>}
      <Stack spacing={2.5}>{children}</Stack>
    </Paper>
  );
}

// ── Input component ────────────────────────────────────────────────────────────
function StyledInput({ label, defaultValue, value, onChange, type, placeholder }: { label?: string; defaultValue?: string; value?: string; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void; type?: string; placeholder?: string }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const palette = getSettingsPalette(isDark);
  return (
    <TextField
      size="small"
      label={label}
      defaultValue={value === undefined ? defaultValue : undefined}
      value={value}
      onChange={onChange}
      type={type}
      placeholder={placeholder}
      fullWidth
      sx={{
        '& .MuiOutlinedInput-root': {
          bgcolor: palette.surfaceSubtle,
          '& fieldset': { borderColor: palette.borderStrong },
          '&:hover fieldset': { borderColor: palette.borderAccentHover },
          '&.Mui-focused fieldset': { borderColor: palette.accent },
          color: palette.textPrimary,
        },
        '& .MuiInputLabel-root': { color: palette.textSecondary },
        '& .MuiInputLabel-root.Mui-focused': { color: palette.accent },
      }}
    />
  );
}

// ── Action button ──────────────────────────────────────────────────────────────
function SaveButton({ label = 'Save Changes' }: { label?: string }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const palette = getSettingsPalette(isDark);
  return (
    <Box display="flex" justifyContent="flex-end">
      <Button variant="contained" sx={{ bgcolor: palette.accent, '&:hover': { bgcolor: palette.accentHover }, borderRadius: '8px', px: 3, fontWeight: 600, textTransform: 'none' }}>
        {label}
      </Button>
    </Box>
  );
}

// ── Sections ───────────────────────────────────────────────────────────────────

function ProfileSection() {
  const { user, refreshToken } = useAuth();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const palette = getSettingsPalette(isDark);
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName,  setLastName]  = useState(user?.last_name  || '');
  const [email,     setEmail]     = useState(user?.email      || '');
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [saveError, setSaveError] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setSaveError('');
    try {
      const token = localStorage.getItem('authToken');
      await axios.patch('/api/auth/profile/', { first_name: firstName, last_name: lastName, email }, {
        headers: { Authorization: `Token ${token}` },
      });
      setSaved(true);
      await refreshToken();
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setSaveError(err?.response?.data?.detail || err?.response?.data?.email?.[0] || 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SectionCard title="Personal Information" subtitle="Update your name, username, and contact information.">
        <Box display="flex" alignItems="center" gap={2}>
          <Avatar sx={{ width: 64, height: 64, bgcolor: palette.accent, fontSize: '1.5rem', fontWeight: 700 }}>
            {(firstName?.[0] || user?.username?.[0] || 'U').toUpperCase()}
          </Avatar>
          <Stack>
            <Button size="small" variant="outlined" sx={{ textTransform: 'none', borderColor: palette.accent, color: palette.accent, '&:hover': { bgcolor: palette.sidebarHoverBg } }}>
              Change Avatar
            </Button>
            <Typography variant="caption" sx={{ color: palette.textMuted, mt: .5 }}>JPG, PNG, GIF up to 2 MB</Typography>
          </Stack>
        </Box>
        <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={2}>
          <StyledInput label="First Name" value={firstName} onChange={e => setFirstName(e.target.value)} />
          <StyledInput label="Last Name"  value={lastName}  onChange={e => setLastName(e.target.value)} />
        </Box>
        <StyledInput label="Username"      defaultValue={user?.username || ''} />
        <StyledInput label="Email Address" value={email} onChange={e => setEmail(e.target.value)} type="email" />
        {saveError && <Typography variant="caption" color="error">{saveError}</Typography>}
        {saved    && <Typography variant="caption" sx={{ color: palette.success }}>Profile saved successfully.</Typography>}
        <Box display="flex" justifyContent="flex-end">
          <Button
            variant="contained"
            disabled={saving}
            onClick={handleSave}
            sx={{ bgcolor: palette.accent, '&:hover': { bgcolor: palette.accentHover }, borderRadius: '8px', px: 3, fontWeight: 600, textTransform: 'none' }}
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </Box>
      </SectionCard>
      <SectionCard title="Danger Zone" subtitle="Permanently delete your account and all associated data.">
        <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
          <Box>
            <Typography fontWeight={600} fontSize=".9rem" color={palette.textPrimary}>Delete Account</Typography>
            <Typography variant="caption" sx={{ color: palette.textMuted }}>This action is irreversible. All data will be lost.</Typography>
          </Box>
          <Button variant="outlined" color="error" size="small" sx={{ textTransform: 'none', borderRadius: '8px' }}>Delete Account</Button>
        </Box>
      </SectionCard>
    </>
  );
}

function AuthenticationSection() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const palette = getSettingsPalette(isDark);
  const [currentPw,  setCurrentPw]  = useState('');
  const [newPw,      setNewPw]      = useState('');
  const [confirmPw,  setConfirmPw]  = useState('');
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [saveError,  setSaveError]  = useState('');

  const handleChangePassword = async () => {
    if (newPw !== confirmPw) { setSaveError('New passwords do not match.'); return; }
    if (newPw.length < 8)    { setSaveError('Password must be at least 8 characters.'); return; }
    setSaving(true); setSaved(false); setSaveError('');
    try {
      const token = localStorage.getItem('authToken');
      await axios.patch('/api/auth/profile/', { current_password: currentPw, new_password: newPw }, {
        headers: { Authorization: `Token ${token}` },
      });
      setSaved(true);
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setSaveError(err?.response?.data?.detail || 'Failed to change password. Check your current password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SectionCard title="Change Password" subtitle="Use a strong password with at least 12 characters.">
        <StyledInput label="Current Password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} type="password" />
        <StyledInput label="New Password"     value={newPw}     onChange={e => setNewPw(e.target.value)}     type="password" />
        <StyledInput label="Confirm Password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} type="password" />
        {saveError && <Typography variant="caption" color="error">{saveError}</Typography>}
        {saved    && <Typography variant="caption" sx={{ color: palette.success }}>Password changed successfully.</Typography>}
        <Box display="flex" justifyContent="flex-end">
          <Button
            variant="contained"
            disabled={saving || !currentPw || !newPw || !confirmPw}
            onClick={handleChangePassword}
            sx={{ bgcolor: palette.accent, '&:hover': { bgcolor: palette.accentHover }, borderRadius: '8px', px: 3, fontWeight: 600, textTransform: 'none' }}
          >
            {saving ? 'Updating…' : 'Update Password'}
          </Button>
        </Box>
      </SectionCard>
      <SectionCard title="Two-Factor Authentication" subtitle="Add an extra layer of protection to your account.">
        <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
          <Box>
            <Typography fontWeight={600} fontSize=".9rem" color={palette.textPrimary}>Authenticator App</Typography>
            <Typography variant="caption" sx={{ color: palette.textMuted }}>Use Google Authenticator, Authy, or any TOTP app.</Typography>
          </Box>
          <Button variant="contained" size="small" sx={{ bgcolor: palette.accent, '&:hover': { bgcolor: palette.accentHover }, textTransform: 'none', borderRadius: '8px' }}>Enable 2FA</Button>
        </Box>
        <Divider sx={{ borderColor: palette.borderSoft }} />
        <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
          <Box>
            <Typography fontWeight={600} fontSize=".9rem" color={palette.textPrimary}>SMS Verification</Typography>
            <Typography variant="caption" sx={{ color: palette.textMuted }}>Receive a code via SMS when logging in.</Typography>
          </Box>
          <Switch />
        </Box>
      </SectionCard>
      <SectionCard title="Active Sessions" subtitle="Devices currently logged in to your account.">
        {[
          { device: 'Chrome on Linux', location: 'Johannesburg, ZA', current: true },
          { device: 'Firefox on Windows', location: 'Cape Town, ZA', current: false },
        ].map((s, i) => (
          <Box key={i} display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
            <Box>
              <Typography fontWeight={600} fontSize=".88rem" color={palette.textPrimary}>{s.device}</Typography>
              <Typography variant="caption" sx={{ color: palette.textMuted }}>{s.location}</Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={1}>
              {s.current && <Chip label="Current" size="small" sx={{ bgcolor: palette.accentSoft, color: palette.accent, fontWeight: 700, fontSize: '.7rem' }} />}
              {!s.current && <Button size="small" color="error" sx={{ textTransform: 'none', fontSize: '.8rem' }}>Revoke</Button>}
            </Box>
          </Box>
        ))}
      </SectionCard>
    </>
  );
}

function SSHKeysSection() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const palette = getSettingsPalette(isDark);
  const mockKeys = [
    { name: 'MacBook Pro', fingerprint: 'SHA256:3Kz8...aF94', added: 'Jan 12, 2026' },
    { name: 'Dev Server',  fingerprint: 'SHA256:7Pm1...bR62', added: 'Feb 3, 2026' },
  ];
  return (
    <>
      <SectionCard title="SSH Keys" subtitle="Manage public SSH keys used to authenticate with your servers.">
        <Stack spacing={1.5}>
          {mockKeys.map((k, i) => (
            <Box key={i} display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}
              sx={{ p: 1.5, bgcolor: palette.surfaceSubtle, borderRadius: '8px', border: `1px solid ${palette.border}` }}>
              <Box>
                <Typography fontWeight={600} fontSize=".88rem" color={palette.textPrimary}>{k.name}</Typography>
                <Typography variant="caption" sx={{ color: palette.textMuted, fontFamily: 'monospace' }}>{k.fingerprint}</Typography>
                <Typography variant="caption" sx={{ color: palette.textMutedSoft, display: 'block' }}>Added {k.added}</Typography>
              </Box>
              <Tooltip title="Delete key">
                <IconButton size="small" sx={{ color: palette.danger }}><DeleteOutlineIcon fontSize="small" /></IconButton>
              </Tooltip>
            </Box>
          ))}
        </Stack>
        <Divider sx={{ borderColor: palette.borderSoft }} />
        <Typography fontWeight={700} fontSize=".9rem" color={palette.textPrimary}>Add New SSH Key</Typography>
        <StyledInput label="Key Name" placeholder="e.g. My Laptop" />
        <TextField
          label="Public Key" multiline rows={3} fullWidth size="small"
          placeholder="ssh-rsa AAAA..."
          sx={{
            '& .MuiOutlinedInput-root': { bgcolor: palette.surfaceSubtle, color: palette.textPrimary, fontFamily: 'monospace', fontSize: '.82rem', '& fieldset': { borderColor: palette.borderStrong } },
            '& .MuiInputLabel-root': { color: palette.textSecondary },
          }}
        />
        <Box display="flex" justifyContent="flex-end">
          <Button variant="contained" startIcon={<AddIcon />} sx={{ bgcolor: palette.accent, '&:hover': { bgcolor: palette.accentHover }, borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}>
            Add SSH Key
          </Button>
        </Box>
      </SectionCard>
    </>
  );
}

function APISection() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const palette = getSettingsPalette(isDark);
  const [show, setShow] = useState(false);
  const mockToken = 'atx_live_4f2a9b1c8e3d07f5a6b2c4d8e9f1a3b5c7d9e0f';
  return (
    <>
      <SectionCard title="API Tokens" subtitle="Authenticate programmatic access to OrcaCloud APIs.">
        <Box sx={{ p: 2, bgcolor: palette.surfaceSubtle, borderRadius: '8px', border: `1px solid ${palette.border}` }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
            <Typography fontWeight={600} fontSize=".88rem" color={palette.textPrimary}>Personal Access Token</Typography>
            <Chip label="Active" size="small" sx={{ bgcolor: palette.successSoft, color: palette.success, fontWeight: 700, fontSize: '.7rem' }} />
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="caption" sx={{ fontFamily: 'monospace', color: palette.textSecondary, flex: 1, wordBreak: 'break-all' }}>
              {show ? mockToken : mockToken.replace(/[^_]/g, (_, i) => i < 8 ? mockToken[i] : '•')}
            </Typography>
            <Tooltip title={show ? 'Hide' : 'Show'}>
              <IconButton size="small" onClick={() => setShow(p => !p)} sx={{ color: palette.iconMuted }}>
                {show ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Copy token">
              <IconButton size="small" sx={{ color: palette.iconMuted }}
                onClick={() => navigator.clipboard.writeText(mockToken)}>
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        <Box display="flex" justifyContent="space-between" flexWrap="wrap" gap={1}>
          <Button variant="outlined" size="small" sx={{ textTransform: 'none', borderColor: isDark ? alpha(palette.white, 0.2) : palette.border, color: palette.textBody, borderRadius: '8px' }}>
            Regenerate Token
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} size="small"
            sx={{ bgcolor: palette.accent, '&:hover': { bgcolor: palette.accentHover }, textTransform: 'none', borderRadius: '8px', fontWeight: 600 }}>
            Create New Token
          </Button>
        </Box>
      </SectionCard>
      <SectionCard title="API Documentation" subtitle="Learn how to integrate with OrcaCloud APIs.">
        <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={1.5}>
          {['REST API Reference', 'Authentication Guide', 'Rate Limits', 'Webhooks'].map(doc => (
            <Box key={doc} sx={{ p: 1.5, bgcolor: palette.surfaceSubtle, borderRadius: '8px', border: `1px solid ${palette.border}`, cursor: 'pointer', '&:hover': { borderColor: palette.accent }, transition: 'border .15s' }}>
              <Typography fontWeight={600} fontSize=".85rem" color={palette.textPrimary}>{doc}</Typography>
            </Box>
          ))}
        </Box>
      </SectionCard>
    </>
  );
}

function UsersSection() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const palette = getSettingsPalette(isDark);
  const members = [
    { name: 'Admin User', email: 'admin@orcacloud.com', role: 'Owner', initials: 'A' },
    { name: 'Dev Team',   email: 'dev@orcacloud.com',   role: 'Editor', initials: 'D' },
  ];
  return (
    <>
      <SectionCard title="Team Members" subtitle="Manage who has access to your organisation.">
        <Stack spacing={1.5}>
          {members.map((m, i) => (
            <Box key={i} display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}
              sx={{ p: 1.5, bgcolor: palette.surfaceSubtle, borderRadius: '8px', border: `1px solid ${palette.border}` }}>
              <Box display="flex" alignItems="center" gap={1.5}>
                <Avatar sx={{ width: 36, height: 36, bgcolor: palette.accent, fontSize: '.85rem', fontWeight: 700 }}>{m.initials}</Avatar>
                <Box>
                  <Typography fontWeight={600} fontSize=".88rem" color={palette.textPrimary}>{m.name}</Typography>
                  <Typography variant="caption" sx={{ color: palette.textMuted }}>{m.email}</Typography>
                </Box>
              </Box>
              <Box display="flex" alignItems="center" gap={1}>
                <Chip label={m.role} size="small" sx={{ bgcolor: m.role === 'Owner' ? palette.accentSoft : palette.surfaceHover, color: m.role === 'Owner' ? palette.accent : palette.textBody, fontWeight: 700, fontSize: '.7rem' }} />
                {m.role !== 'Owner' && <Button size="small" color="error" sx={{ textTransform: 'none', fontSize: '.8rem', minWidth: 0 }}>Remove</Button>}
              </Box>
            </Box>
          ))}
        </Stack>
        <Box display="flex" justifyContent="flex-end">
          <Button variant="contained" startIcon={<AddIcon />}
            sx={{ bgcolor: palette.accent, '&:hover': { bgcolor: palette.accentHover }, borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}>
            Invite Member
          </Button>
        </Box>
      </SectionCard>
    </>
  );
}

function NotificationsSection() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const palette = getSettingsPalette(isDark);
  const rows = [
    { label: 'Server alerts',           desc: 'Downtime, high CPU/RAM, failures' },
    { label: 'Billing notifications',   desc: 'Invoices, payment failures, usage limits' },
    { label: 'Security alerts',         desc: 'Login attempts, 2FA events' },
    { label: 'Product updates',         desc: 'New features and platform announcements' },
    { label: 'Team activity',           desc: 'Member invitations, role changes' },
  ];
  return (
    <SectionCard title="Notification Preferences" subtitle="Choose how and when you receive notifications.">
      <Box display="grid" gridTemplateColumns="1fr auto auto" alignItems="center" gap={1} sx={{ '& > *:nth-of-type(3n+2), & > *:nth-of-type(3n+3)': { textAlign: 'center' } }}>
        <Typography variant="caption" fontWeight={700} sx={{ color: palette.textMuted, textTransform: 'uppercase', letterSpacing: '.07em' }}>Notification</Typography>
        <Typography variant="caption" fontWeight={700} sx={{ color: palette.textMuted, textTransform: 'uppercase', letterSpacing: '.07em', px: 1 }}>Email</Typography>
        <Typography variant="caption" fontWeight={700} sx={{ color: palette.textMuted, textTransform: 'uppercase', letterSpacing: '.07em', px: 1 }}>In-App</Typography>
      </Box>
      <Divider sx={{ borderColor: palette.borderSoft }} />
      {rows.map((r, i) => (
        <Box key={i} display="grid" gridTemplateColumns="1fr auto auto" alignItems="center" gap={1}>
          <Box>
            <Typography fontWeight={600} fontSize=".88rem" color={palette.textPrimary}>{r.label}</Typography>
            <Typography variant="caption" sx={{ color: palette.textMuted }}>{r.desc}</Typography>
          </Box>
          <Switch defaultChecked size="small" sx={{ mx: 'auto' }} />
          <Switch defaultChecked={i < 3} size="small" sx={{ mx: 'auto' }} />
        </Box>
      ))}
      <SaveButton label="Save Preferences" />
    </SectionCard>
  );
}

function ComplianceSection() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const palette = getSettingsPalette(isDark);
  const items = [
    { label: 'GDPR Compliance',   status: 'Compliant',     color: dashboardStatusColors.domain.active },
    { label: 'SOC 2 Type II',     status: 'In Progress',   color: dashboardStatusColors.domain.pending },
    { label: 'ISO 27001',         status: 'Compliant',     color: dashboardStatusColors.domain.active },
    { label: 'PCI DSS',           status: 'Not Applicable', color: dashboardStatusColors.domain.deleting },
  ];
  return (
    <>
      <SectionCard title="Compliance Status" subtitle="Overview of your organisation's regulatory compliance.">
        <Stack spacing={1.5}>
          {items.map((item, i) => (
            <Box key={i} display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}
              sx={{ p: 1.5, bgcolor: palette.surfaceSubtle, borderRadius: '8px', border: `1px solid ${palette.border}` }}>
              <Typography fontWeight={600} fontSize=".88rem" color={palette.textPrimary}>{item.label}</Typography>
              <Chip label={item.status} size="small" sx={{ bgcolor: alpha(item.color, 0.12), color: item.color, fontWeight: 700, fontSize: '.72rem' }} />
            </Box>
          ))}
        </Stack>
      </SectionCard>
      <SectionCard title="Data Residency" subtitle="Choose where your data is stored.">
        <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
          <Box>
            <Typography fontWeight={600} fontSize=".88rem" color={palette.textPrimary}>Primary Region</Typography>
            <Typography variant="caption" sx={{ color: palette.textMuted }}>Africa South (Johannesburg)</Typography>
          </Box>
          <Button size="small" variant="outlined" sx={{ textTransform: 'none', borderColor: palette.accent, color: palette.accent, borderRadius: '8px' }}>Change Region</Button>
        </Box>
      </SectionCard>
    </>
  );
}

function PreferencesSection() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const palette = getSettingsPalette(isDark);
  return (
    <SectionCard title="Interface Preferences" subtitle="Customise your dashboard experience.">
      {[
        { label: 'Compact mode',         desc: 'Reduce spacing for denser layouts' },
        { label: 'Show resource IDs',    desc: 'Display internal UUIDs on resource cards' },
        { label: 'Auto-refresh data',    desc: 'Refresh dashboard metrics every 60 seconds' },
        { label: 'Developer mode',       desc: 'Show additional technical details and raw API output' },
      ].map((pref, i) => (
        <Box key={i} display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
          <Box>
            <Typography fontWeight={600} fontSize=".88rem" color={palette.textPrimary}>{pref.label}</Typography>
            <Typography variant="caption" sx={{ color: palette.textMuted }}>{pref.desc}</Typography>
          </Box>
          <Switch />
        </Box>
      ))}
      <Divider sx={{ borderColor: palette.borderSoft }} />
      <Field label="Default Landing Page">
        <Box display="flex" gap={1} flexWrap="wrap">
          {['Dashboard', 'Servers', 'Kubernetes', 'Billing'].map(p => (
            <Chip key={p} label={p} size="small" clickable
              sx={{ bgcolor: p === 'Dashboard' ? palette.accent : palette.surfaceHover, color: p === 'Dashboard' ? palette.white : palette.textBody, fontWeight: 600 }} />
          ))}
        </Box>
      </Field>
      <SaveButton label="Save Preferences" />
    </SectionCard>
  );
}

// ── Section router ─────────────────────────────────────────────────────────────
function renderSection(section: string) {
  switch (section) {
    case 'profile':        return <ProfileSection />;
    case 'authentication': return <AuthenticationSection />;
    case 'ssh-keys':       return <SSHKeysSection />;
    case 'api':            return <APISection />;
    case 'users':          return <UsersSection />;
    case 'notifications':  return <NotificationsSection />;
    case 'compliance':     return <ComplianceSection />;
    case 'preferences':    return <PreferencesSection />;
    default:               return <ProfileSection />;
  }
}

function sectionLabel(key: string): string {
  return SECTIONS.flatMap(g => g.items).find(i => i.key === key)?.label ?? 'Profile';
}

// ── Main page ──────────────────────────────────────────────────────────────────
const AccountSettingsPage: React.FC = () => {
  const theme    = useTheme();
  const isDark   = theme.palette.mode === 'dark';
  const palette  = getSettingsPalette(isDark);
  const navigate = useNavigate();
  const { section = 'profile' } = useParams<{ section?: string }>();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: palette.pageBg, pb: 6 }}>
      {/* Header */}
      <Box sx={{ bgcolor: palette.headerBg, borderBottom: `1px solid ${palette.border}`, px: 4, py: 2.5 }}>
        <Typography fontWeight={800} fontSize="1.25rem" color={palette.textPrimary}>Account Settings</Typography>
        <Typography variant="body2" sx={{ color: palette.textSecondary, mt: .25 }}>
          Manage your profile, security, and platform preferences
        </Typography>
      </Box>

      <Box sx={{ maxWidth: 1100, mx: 'auto', px: { xs: 2, md: 4 }, pt: 4, display: 'flex', gap: 3, alignItems: 'flex-start' }}>
        {/* Sidebar nav */}
        <Box sx={{ width: 220, flexShrink: 0, display: { xs: 'none', md: 'block' } }}>
          <Paper elevation={0} sx={{ bgcolor: palette.cardBg, border: `1px solid ${palette.border}`, borderRadius: '12px', overflow: 'hidden', position: 'sticky', top: 24 }}>
            {SECTIONS.map((group, gi) => (
              <Box key={group.group}>
                {gi > 0 && <Divider sx={{ borderColor: palette.borderSoft }} />}
                <Typography variant="caption" fontWeight={700} sx={{ px: 2, pt: 2, pb: .5, display: 'block', color: palette.sidebarGroupLabel, textTransform: 'uppercase', letterSpacing: '.07em' }}>
                  {group.group}
                </Typography>
                <List dense disablePadding sx={{ pb: 1 }}>
                  {group.items.map(item => {
                    const active = section === item.key;
                    return (
                      <ListItemButton
                        key={item.key}
                        selected={active}
                        onClick={() => navigate(`/dashboard/settings/${item.key}`)}
                        sx={{
                          mx: 1, borderRadius: '8px', mb: .25, minHeight: 36,
                          bgcolor: active ? palette.sidebarActiveBg : 'transparent',
                          '&:hover': { bgcolor: palette.sidebarHoverBg },
                          '&.Mui-selected': { bgcolor: palette.sidebarActiveBg },
                          '&.Mui-selected:hover': { bgcolor: palette.sidebarActiveHoverBg },
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 30, color: active ? palette.accent : palette.textSecondary }}>
                          {item.icon}
                        </ListItemIcon>
                        <ListItemText
                          primary={item.label}
                          primaryTypographyProps={{ fontSize: '.85rem', fontWeight: active ? 700 : 500, color: active ? (isDark ? palette.textPrimary : palette.accent) : palette.textBody }}
                        />
                      </ListItemButton>
                    );
                  })}
                </List>
              </Box>
            ))}
          </Paper>
        </Box>

        {/* Content */}
        <Box flex={1} minWidth={0}>
          <Typography fontWeight={700} fontSize="1.1rem" color={palette.textPrimary} mb={2.5}>
            {sectionLabel(section)}
          </Typography>
          {renderSection(section)}
        </Box>
      </Box>
    </Box>
  );
};

export default AccountSettingsPage;
