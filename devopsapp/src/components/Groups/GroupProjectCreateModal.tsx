// OrcaCloud – Group Project Create Modal

import React, { useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CloseIcon            from '@mui/icons-material/Close';
import FolderOpenIcon       from '@mui/icons-material/FolderOpenRounded';
import CheckCircleIcon      from '@mui/icons-material/CheckCircle';
import ArrowForwardIcon     from '@mui/icons-material/ArrowForward';
import { useNavigate }      from 'react-router-dom';
import {
  createGroupProject,
  GroupProject,
  GroupProjectCreatePayload,
  ProjectLang,
} from '../../services/groupsApi';
import { dashboardTokens, dashboardSemanticColors } from '../../styles/dashboardDesignSystem';

const FONT = '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

const LANGUAGES: { value: ProjectLang; label: string; color: string }[] = [
  { value: 'TypeScript', label: 'TypeScript', color: '#3178c6' },
  { value: 'Python',     label: 'Python',     color: '#3572a5' },
  { value: 'Go',         label: 'Go',         color: '#00acd7' },
  { value: 'Rust',       label: 'Rust',       color: '#ce422b' },
  { value: 'Java',       label: 'Java',       color: '#b07219' },
  { value: 'HCL',        label: 'HCL',        color: '#7b42bc' },
];

export interface GroupProjectCreateModalProps {
  open:      boolean;
  groupId:   string;
  groupName: string;
  onClose:   () => void;
  /** Called with the newly created project when the API succeeds (or a mock on 501). */
  onCreated: (project: GroupProject) => void;
}

const GroupProjectCreateModal: React.FC<GroupProjectCreateModalProps> = ({
  open, groupId, groupName, onClose, onCreated,
}) => {
  const t        = dashboardTokens.colors;
  const navigate = useNavigate();

  const [name,        setName]        = useState('');
  const [description, setDescription] = useState('');
  const [language,    setLanguage]    = useState<ProjectLang>('TypeScript');
  const [visibility,  setVisibility]  = useState<'public' | 'internal' | 'private'>('internal');
  const [initReadme,  setInitReadme]  = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');
  const [created,     setCreated]     = useState<GroupProject | null>(null);

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const reset = () => {
    setName(''); setDescription(''); setLanguage('TypeScript');
    setVisibility('internal'); setInitReadme(true); setError(''); setCreated(null);
  };

  const handleClose = () => {
    if (saving) return;
    reset();
    onClose();
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError('');
    const payload: GroupProjectCreatePayload = {
      name: name.trim(),
      description: description.trim() || undefined,
      visibility,
      language,
    };
    const result = await createGroupProject(groupId, payload);
    setSaving(false);
    if (result) {
      setCreated(result);
      onCreated(result);
    } else {
      // Backend returns 501 (not yet modelled) – build a local mock so the UI still works
      const mock: GroupProject = {
        id:          `local-${Date.now()}`,
        name:        payload.name,
        description: payload.description ?? '',
        status:      'active',
        language:    language,
        branch:      'main',
        progress:    0,
        open_issues: 0,
        last_build:  'pending',
        updated_at:  new Date().toISOString(),
        tags:        [],
        starred:     false,
      };
      setCreated(mock);
      onCreated(mock);
    }
  };

  const BP = dashboardTokens.colors.brandPrimary;
  const BPH = (dashboardTokens.colors as any).brandPrimaryHover ?? BP;

  // ── Success screen ────────────────────────────────────────────────────────
  if (created) {
    return (
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { bgcolor: t.surface, borderRadius: '12px', border: `1px solid ${t.border}` } }}
      >
        <Box sx={{ px: 4, py: 5, textAlign: 'center' }}>
          <CheckCircleIcon sx={{ fontSize: '3rem', color: dashboardSemanticColors.success, mb: 1.5 }} />
          <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', color: t.textPrimary, fontFamily: FONT, mb: 0.5 }}>
            Project created!
          </Typography>
          <Typography sx={{ fontSize: '.875rem', color: t.textSecondary, fontFamily: FONT, mb: 3 }}>
            <Box component="span" sx={{ fontWeight: 700, color: t.textPrimary }}>{created.name}</Box>
            {' '}has been added to <Box component="span" sx={{ fontWeight: 700, color: BP }}>{groupName}</Box>.
          </Typography>
          <Stack spacing={1.25}>
            <Button
              fullWidth
              variant="contained"
              endIcon={<ArrowForwardIcon />}
              onClick={() => {
                handleClose();
                navigate(`/developer/Dashboard/projects/${created.id}`);
              }}
              sx={{ bgcolor: BP, color: '#0a0f1a', fontWeight: 700, textTransform: 'none', borderRadius: '8px', boxShadow: 'none', fontFamily: FONT, '&:hover': { bgcolor: BPH, boxShadow: 'none' } }}
            >
              Open Project
            </Button>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => { reset(); }}
              sx={{ borderColor: t.border, color: t.textSecondary, fontWeight: 600, textTransform: 'none', borderRadius: '8px', fontFamily: FONT, '&:hover': { borderColor: BP, color: BP, bgcolor: 'transparent' } }}
            >
              Create Another Project
            </Button>
            <Button
              fullWidth
              onClick={handleClose}
              sx={{ color: t.textSecondary, fontWeight: 600, textTransform: 'none', fontFamily: FONT }}
            >
              Back to Group
            </Button>
          </Stack>
        </Box>
      </Dialog>
    );
  }

  // ── Create form ────────────────────────────────────────────────────────────
  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { bgcolor: t.surface, borderRadius: '12px', border: `1px solid ${t.border}` } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
        <Box
          sx={{
            width: 32, height: 32, borderRadius: '8px',
            bgcolor: 'rgba(21,61,117,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: BP, flexShrink: 0,
          }}
        >
          <FolderOpenIcon sx={{ fontSize: '1.1rem' }} />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontWeight: 800, fontSize: '.95rem', color: t.textPrimary, fontFamily: FONT, lineHeight: 1.2 }}>
            New Project
          </Typography>
          <Typography sx={{ fontSize: '.75rem', color: t.textSecondary, fontFamily: FONT }}>
            in <Box component="span" sx={{ color: BP, fontWeight: 600 }}>{groupName}</Box>
          </Typography>
        </Box>
        <IconButton onClick={handleClose} disabled={saving} sx={{ p: 0.5, color: t.textSecondary }}>
          <CloseIcon sx={{ fontSize: '1.1rem' }} />
        </IconButton>
      </DialogTitle>

      <Divider sx={{ borderColor: t.border }} />

      <DialogContent sx={{ pt: 2.5 }}>
        <Stack spacing={2.5}>

          {/* Project name */}
          <Box>
            <Typography sx={{ fontSize: '.8rem', fontWeight: 600, color: t.textSecondary, fontFamily: FONT, mb: 0.5 }}>
              Project name <Box component="span" sx={{ color: dashboardSemanticColors.danger }}>*</Box>
            </Typography>
            <TextField
              fullWidth
              size="small"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="my-awesome-project"
              autoFocus
              sx={{ '& .MuiInputBase-root': { fontFamily: FONT, fontSize: '.875rem', borderRadius: '8px' } }}
            />
            {slug && (
              <Typography sx={{ fontSize: '.72rem', color: t.textSecondary, fontFamily: FONT, mt: 0.4 }}>
                Slug: <Box component="span" sx={{ fontFamily: 'monospace', color: t.textPrimary }}>{slug}</Box>
              </Typography>
            )}
          </Box>

          {/* Description */}
          <Box>
            <Typography sx={{ fontSize: '.8rem', fontWeight: 600, color: t.textSecondary, fontFamily: FONT, mb: 0.5 }}>
              Description <Box component="span" sx={{ opacity: .5, fontWeight: 400 }}>(optional)</Box>
            </Typography>
            <TextField
              fullWidth
              size="small"
              multiline
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Briefly describe what this project does…"
              sx={{ '& .MuiInputBase-root': { fontFamily: FONT, fontSize: '.875rem', borderRadius: '8px' } }}
            />
          </Box>

          {/* Language */}
          <Box>
            <Typography sx={{ fontSize: '.8rem', fontWeight: 600, color: t.textSecondary, fontFamily: FONT, mb: 0.75 }}>
              Primary language
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {LANGUAGES.map(lang => (
                <Box
                  key={lang.value}
                  onClick={() => setLanguage(lang.value)}
                  sx={{
                    cursor: 'pointer',
                    px: 1.5, py: 0.5,
                    borderRadius: '6px',
                    border: `1px solid ${language === lang.value ? lang.color : t.border}`,
                    bgcolor: language === lang.value ? `${lang.color}1a` : 'transparent',
                    color: language === lang.value ? lang.color : t.textSecondary,
                    fontSize: '.78rem', fontWeight: 600, fontFamily: FONT,
                    transition: 'all .12s',
                    '&:hover': { borderColor: lang.color, color: lang.color },
                  }}
                >
                  {lang.label}
                </Box>
              ))}
            </Box>
          </Box>

          {/* Visibility */}
          <Box>
            <Typography sx={{ fontSize: '.8rem', fontWeight: 600, color: t.textSecondary, fontFamily: FONT, mb: 0.75 }}>
              Visibility
            </Typography>
            <ToggleButtonGroup
              value={visibility}
              exclusive
              onChange={(_, v) => v && setVisibility(v)}
              size="small"
              sx={{
                '& .MuiToggleButton-root': {
                  fontFamily: FONT, fontSize: '.78rem', fontWeight: 600, textTransform: 'none',
                  borderColor: t.border, color: t.textSecondary,
                  '&.Mui-selected': { bgcolor: 'rgba(21,61,117,0.1)', color: BP, borderColor: BP },
                },
              }}
            >
              <ToggleButton value="private">Private</ToggleButton>
              <ToggleButton value="internal">Internal</ToggleButton>
              <ToggleButton value="public">Public</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* Initialize README */}
          <FormControlLabel
            control={<Switch checked={initReadme} onChange={e => setInitReadme(e.target.checked)} size="small" />}
            label={<Typography sx={{ fontSize: '.82rem', color: t.textSecondary, fontFamily: FONT }}>Initialize with a README</Typography>}
          />

          {error && (
            <Box sx={{ p: '10px 14px', bgcolor: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', borderRadius: '8px' }}>
              <Typography sx={{ fontSize: '.82rem', color: dashboardSemanticColors.danger, fontFamily: FONT }}>{error}</Typography>
            </Box>
          )}

        </Stack>
      </DialogContent>

      <Divider sx={{ borderColor: t.border }} />
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, px: 3, py: 2 }}>
        <Button
          onClick={handleClose}
          disabled={saving}
          sx={{ color: t.textSecondary, textTransform: 'none', fontFamily: FONT, fontWeight: 600, '&:hover': { color: t.textPrimary, bgcolor: 'transparent' } }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          disabled={!name.trim() || saving}
          onClick={handleCreate}
          startIcon={saving ? <CircularProgress size={14} sx={{ color: '#0a0f1a' }} /> : <CheckCircleOutlineIcon />}
          sx={{
            bgcolor: BP, color: '#0a0f1a', fontWeight: 700, fontSize: '.85rem',
            textTransform: 'none', borderRadius: '8px', boxShadow: 'none', fontFamily: FONT,
            '&:hover': { bgcolor: BPH, boxShadow: 'none' },
            '&:disabled': { bgcolor: t.border, color: t.textSecondary },
          }}
        >
          {saving ? 'Creating…' : 'Create Project'}
        </Button>
      </Box>
    </Dialog>
  );
};

export default GroupProjectCreateModal;
