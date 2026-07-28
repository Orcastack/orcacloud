/**
 * DevSSHKeysPage — Manage SSH public keys for Git authentication.
 *
 * Allows users to:
 *  - View all registered SSH keys with fingerprint, title, last-used date
 *  - Add a new SSH public key (title + public key textarea)
 *  - Delete a key with inline confirmation
 *
 * Route: /developer/Dashboard/ssh-keys
 */
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon        from '@mui/icons-material/Add';
import DeleteIcon     from '@mui/icons-material/DeleteOutline';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import KeyIcon        from '@mui/icons-material/Key';
import VpnKeyIcon     from '@mui/icons-material/VpnKey';

import { dashboardTokens } from '../styles/dashboardDesignSystem';
import {
  listSSHKeys,
  addSSHKey,
  deleteSSHKey,
  type SSHKey,
} from '../services/projectsApi';

const t    = dashboardTokens.colors;
const FONT = dashboardTokens.typography.fontFamily;
const MONO = '"JetBrains Mono","Fira Code",monospace';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return 'Never';
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function keyTypeLabel(key: string): string {
  const trimmed = key.trim();
  if (trimmed.startsWith('ssh-rsa'))     return 'RSA';
  if (trimmed.startsWith('ssh-ed25519')) return 'Ed25519';
  if (trimmed.startsWith('ecdsa-sha2')) return 'ECDSA';
  if (trimmed.startsWith('ssh-dss'))    return 'DSA';
  return 'SSH';
}

// ─── Add Key Dialog ───────────────────────────────────────────────────────────

interface AddKeyDialogProps {
  open: boolean;
  onClose: () => void;
  onAdded: (key: SSHKey) => void;
}

function AddKeyDialog({ open, onClose, onAdded }: AddKeyDialogProps) {
  const [title,     setTitle]     = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const reset = () => { setTitle(''); setPublicKey(''); setError(null); setSaving(false); };

  const handleClose = () => { reset(); onClose(); };

  const handleSave = async () => {
    setError(null);
    if (!title.trim()) { setError('Title is required'); return; }
    if (!publicKey.trim()) { setError('Public key is required'); return; }
    if (!publicKey.trim().startsWith('ssh-')) {
      setError('Key must begin with ssh-rsa, ssh-ed25519, ecdsa-sha2-*, etc.');
      return;
    }
    setSaving(true);
    try {
      const k = await addSSHKey(title.trim(), publicKey.trim());
      onAdded(k);
      reset();
      onClose();
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ??
        err?.response?.data?.public_key?.[0] ??
        err?.message ??
        'Failed to add key',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '14px',
          bgcolor: t.surface,
          border: `1px solid ${t.border}`,
          fontFamily: FONT,
        },
      }}
    >
      <DialogTitle sx={{
        fontFamily: FONT, fontWeight: 700, fontSize: '.95rem',
        color: t.textPrimary, pb: 0.5,
      }}>
        Add SSH Public Key
      </DialogTitle>

      <DialogContent sx={{ pt: '12px !important' }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: '10px', fontSize: '.8rem' }}>
            {error}
          </Alert>
        )}

        <Stack spacing={2}>
          <TextField
            label="Title"
            placeholder="e.g. My MacBook Pro"
            size="small"
            fullWidth
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            inputProps={{ style: { fontFamily: FONT } }}
          />

          <TextField
            label="Public Key"
            placeholder="Paste your public key here (ssh-ed25519 AAAA...)"
            size="small"
            fullWidth
            multiline
            rows={5}
            value={publicKey}
            onChange={(e) => setPublicKey(e.target.value)}
            inputProps={{ style: { fontFamily: MONO, fontSize: '.78rem' } }}
            helperText={
              <span>
                Run{' '}
                <code style={{ fontFamily: MONO, fontSize: '.75rem', background: 'rgba(0,0,0,.06)', padding: '0 4px', borderRadius: 4 }}>
                  cat ~/.ssh/id_ed25519.pub
                </code>{' '}
                and paste the output
              </span>
            }
          />
        </Stack>

        <Divider sx={{ my: 2, borderColor: t.border }} />

        <Typography sx={{ fontSize: '.75rem', color: t.textTertiary, lineHeight: 1.6 }}>
          <strong>Generate a key:</strong><br />
          <code style={{ fontFamily: MONO, fontSize: '.72rem', display: 'block', background: 'rgba(0,0,0,.04)', borderRadius: 8, padding: '8px 12px', marginTop: 6 }}>
            ssh-keygen -t ed25519 -C "your@email.com"
          </code>
        </Typography>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button
          onClick={handleClose}
          size="small"
          sx={{
            textTransform: 'none', color: t.textSecondary,
            borderRadius: '8px', fontFamily: FONT,
          }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          size="small"
          onClick={handleSave}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <AddIcon sx={{ fontSize: '.9rem' }} />}
          sx={{
            textTransform: 'none', fontFamily: FONT, fontWeight: 700,
            bgcolor: t.brandPrimary, borderRadius: '8px',
            '&:hover': { bgcolor: '#0f2d5a' },
          }}
        >
          {saving ? 'Saving…' : 'Add Key'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Key Row ──────────────────────────────────────────────────────────────────

interface KeyRowProps {
  sshKey: SSHKey;
  onDelete: (id: string) => void;
}

function KeyRow({ sshKey, onDelete }: KeyRowProps) {
  const [confirming, setConfirming] = useState(false);
  const [deleting,   setDeleting]   = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteSSHKey(sshKey.id);
      onDelete(sshKey.id);
    } catch {
      setDeleting(false);
      setConfirming(false);
    }
  };

  const keyType = keyTypeLabel(sshKey.public_key);

  return (
    <Box sx={{
      border: `1px solid ${t.border}`,
      borderRadius: '12px',
      px: 2.5, py: 2,
      display: 'flex', alignItems: 'flex-start', gap: 2,
      bgcolor: t.surface,
      transition: 'border-color .15s',
      '&:hover': { borderColor: t.brandPrimary },
    }}>
      {/* Icon */}
      <Box sx={{
        width: 38, height: 38, borderRadius: '10px',
        bgcolor: `${t.brandPrimary}14`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, mt: 0.25,
      }}>
        <VpnKeyIcon sx={{ fontSize: '1.15rem', color: t.brandPrimary }} />
      </Box>

      {/* Info */}
      <Stack flex={1} spacing={0.4}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography sx={{ fontWeight: 700, fontSize: '.87rem', color: t.textPrimary, fontFamily: FONT }}>
            {sshKey.title}
          </Typography>
          <Chip
            label={keyType}
            size="small"
            sx={{
              height: 18, fontSize: '.6rem', fontWeight: 700,
              bgcolor: 'rgba(21,61,117,.08)', color: t.brandPrimary,
              '& .MuiChip-label': { px: 0.75 },
            }}
          />
        </Stack>
        <Stack direction="row" alignItems="center" spacing={0.75}>
          <FingerprintIcon sx={{ fontSize: '.78rem', color: t.textTertiary }} />
          <Typography sx={{ fontFamily: MONO, fontSize: '.72rem', color: t.textTertiary }}>
            {sshKey.fingerprint || '—'}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={2} sx={{ mt: 0.3 }}>
          <Typography sx={{ fontSize: '.72rem', color: t.textTertiary, fontFamily: FONT }}>
            Added {fmtDate(sshKey.created_at)}
          </Typography>
          <Typography sx={{ fontSize: '.72rem', color: t.textTertiary, fontFamily: FONT }}>
            Last used: {fmtDate(sshKey.last_used)}
          </Typography>
        </Stack>
      </Stack>

      {/* Delete */}
      <Box sx={{ flexShrink: 0 }}>
        {confirming ? (
          <Stack direction="row" spacing={0.75} alignItems="center">
            <Typography sx={{ fontSize: '.72rem', color: '#EF4444', fontFamily: FONT }}>
              Remove?
            </Typography>
            <Button
              size="small"
              onClick={handleDelete}
              disabled={deleting}
              sx={{
                textTransform: 'none', fontSize: '.72rem', color: '#fff',
                bgcolor: '#EF4444', borderRadius: '6px', py: 0.3, px: 1,
                fontFamily: FONT, fontWeight: 700, minWidth: 0,
                '&:hover': { bgcolor: '#dc2626' },
              }}
            >
              {deleting ? <CircularProgress size={12} color="inherit" /> : 'Yes'}
            </Button>
            <Button
              size="small"
              onClick={() => setConfirming(false)}
              sx={{
                textTransform: 'none', fontSize: '.72rem', color: t.textSecondary,
                borderRadius: '6px', py: 0.3, fontFamily: FONT, minWidth: 0,
              }}
            >
              No
            </Button>
          </Stack>
        ) : (
          <Tooltip title="Remove key">
            <IconButton
              size="small"
              onClick={() => setConfirming(true)}
              sx={{ color: t.textTertiary, '&:hover': { color: '#EF4444' } }}
            >
              <DeleteIcon sx={{ fontSize: '1rem' }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Box>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DevSSHKeysPage() {
  const [keys,    setKeys]    = useState<SSHKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    listSSHKeys()
      .then(setKeys)
      .catch((err) => setError(err?.message ?? 'Failed to load SSH keys'))
      .finally(() => setLoading(false));
  }, []);

  const handleAdded = (key: SSHKey) => setKeys((prev) => [key, ...prev]);
  const handleDeleted = (id: string) => setKeys((prev) => prev.filter((k) => k.id !== id));

  return (
    <Box sx={{ p: 3, maxWidth: 760, mx: 'auto', fontFamily: FONT }}>

      {/* Header */}
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" sx={{ mb: 3 }}>
        <Stack spacing={0.5}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{
              width: 38, height: 38, borderRadius: '10px',
              bgcolor: `${t.brandPrimary}14`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <KeyIcon sx={{ fontSize: '1.2rem', color: t.brandPrimary }} />
            </Box>
            <Typography sx={{ fontWeight: 800, fontSize: '1.2rem', color: t.textPrimary, fontFamily: FONT }}>
              SSH Keys
            </Typography>
          </Stack>
          <Typography sx={{ fontSize: '.82rem', color: t.textSecondary, fontFamily: FONT, ml: 0.5 }}>
            SSH keys let you clone repositories without entering a password.
          </Typography>
        </Stack>

        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon sx={{ fontSize: '.9rem' }} />}
          onClick={() => setAddOpen(true)}
          sx={{
            textTransform: 'none', fontFamily: FONT, fontWeight: 700,
            fontSize: '.82rem', bgcolor: t.brandPrimary, borderRadius: '9px',
            px: 2, py: 0.75,
            '&:hover': { bgcolor: '#0f2d5a' },
          }}
        >
          Add SSH Key
        </Button>
      </Stack>

      {/* Body */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
          <CircularProgress size={28} sx={{ color: t.brandPrimary }} />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ borderRadius: '12px' }}>{error}</Alert>
      ) : keys.length === 0 ? (
        /* Empty state */
        <Box sx={{
          border: `1.5px dashed ${t.border}`,
          borderRadius: '16px',
          py: 7, textAlign: 'center',
          bgcolor: 'rgba(21,61,117,.015)',
        }}>
          <VpnKeyIcon sx={{ fontSize: '2.5rem', color: t.textTertiary, mb: 1.5 }} />
          <Typography sx={{ fontWeight: 700, fontSize: '.9rem', color: t.textPrimary, mb: 0.75, fontFamily: FONT }}>
            No SSH keys yet
          </Typography>
          <Typography sx={{ fontSize: '.8rem', color: t.textSecondary, mb: 3, fontFamily: FONT, maxWidth: 340, mx: 'auto' }}>
            Add your public key to clone repositories using SSH instead of HTTPS.
          </Typography>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon sx={{ fontSize: '.9rem' }} />}
            onClick={() => setAddOpen(true)}
            sx={{
              textTransform: 'none', fontFamily: FONT, fontWeight: 700,
              fontSize: '.82rem', bgcolor: t.brandPrimary, borderRadius: '9px',
              px: 2.5, py: 0.85,
              '&:hover': { bgcolor: '#0f2d5a' },
            }}
          >
            Add SSH Key
          </Button>

          {/* How-to box */}
          <Box sx={{
            mt: 4, mx: 'auto', maxWidth: 440, textAlign: 'left',
            bgcolor: 'rgba(0,0,0,.03)', borderRadius: '12px',
            px: 2.5, py: 2,
            border: `1px solid ${t.border}`,
          }}>
            <Typography sx={{ fontWeight: 700, fontSize: '.78rem', color: t.textSecondary, mb: 1.5, fontFamily: FONT }}>
              Generate a new SSH key pair
            </Typography>
            {[
              'ssh-keygen -t ed25519 -C "you@example.com"',
              'eval "$(ssh-agent -s)"',
              'ssh-add ~/.ssh/id_ed25519',
              'cat ~/.ssh/id_ed25519.pub   # copy & paste above',
            ].map((cmd, i) => (
              <Box key={i} sx={{
                fontFamily: MONO, fontSize: '.72rem', color: t.textSecondary,
                bgcolor: 'rgba(0,0,0,.04)', borderRadius: '8px',
                px: 1.5, py: 0.7, mb: i < 3 ? 0.75 : 0,
              }}>
                {cmd}
              </Box>
            ))}
          </Box>
        </Box>
      ) : (
        <Stack spacing={1.25}>
          {keys.map((k) => (
            <KeyRow key={k.id} sshKey={k} onDelete={handleDeleted} />
          ))}
        </Stack>
      )}

      <AddKeyDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={handleAdded}
      />
    </Box>
  );
}
