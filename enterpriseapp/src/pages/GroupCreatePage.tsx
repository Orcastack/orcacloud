// OrcaCloud – Group Create Wizard (5-step)

import React, { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  InputAdornment,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import FolderOpenIcon from '@mui/icons-material/FolderOpenRounded';
import GroupsIcon from '@mui/icons-material/Groups';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import PublicIcon from '@mui/icons-material/Public';
import { useNavigate } from 'react-router-dom';
import {
  createGroup,
  Group,
  GroupCreatePayload,
  GroupResources,
  GroupRole,
  GroupType,
  GroupVisibility,
} from '../services/groupsApi';
import GroupProjectCreateModal from '../components/Groups/GroupProjectCreateModal';
import { dashboardTokens, dashboardSemanticColors } from '../styles/dashboardDesignSystem';

const FONT = '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

// ─── Design tokens shorthand ──────────────────────────────────────────────────
const useT = () => dashboardTokens.colors;

// ─── Data ─────────────────────────────────────────────────────────────────────

const GROUP_TYPES: { value: GroupType; label: string; description: string; accent: string }[] = [
  { value: 'developer',  label: 'Developer Group',  description: 'Source code, CI/CD pipelines and deployments.',       accent: dashboardSemanticColors.info },
  { value: 'production', label: 'Production Group', description: 'Production services, environments and on-call.',       accent: dashboardSemanticColors.danger },
  { value: 'marketing',  label: 'Marketing Group',  description: 'Campaigns, contacts and marketing automation.',       accent: dashboardSemanticColors.warning },
  { value: 'data',       label: 'Data / Science',   description: 'Data pipelines, ML experiments and analytics.',       accent: dashboardSemanticColors.purple },
  { value: 'custom',     label: 'Custom Group',     description: 'Fully custom configuration for any workload.',        accent: '#94a3b8' },
];

const ROLES: { value: GroupRole; label: string; description: string }[] = [
  { value: 'owner',          label: 'Owner',            description: 'Full control — delete group, manage billing & settings.' },
  { value: 'admin',          label: 'Admin',            description: 'Manage members, configure integrations and webhooks.' },
  { value: 'architect',      label: 'Architect',        description: 'Manage infrastructure, environments and deployments.' },
  { value: 'devops_engineer',label: 'DevOps Engineer',  description: 'Manage pipelines, CI/CD and Kubernetes.' },
  { value: 'developer',      label: 'Developer',        description: 'Push code, run pipelines, manage issues.' },
  { value: 'data_scientist', label: 'Data Scientist',   description: 'Access datasets, notebooks and compute resources.' },
  { value: 'finance',        label: 'Finance',          description: 'View billing, usage and cost reports.' },
  { value: 'viewer',         label: 'Viewer',           description: 'Read-only access to all group resources.' },
];

const RESOURCE_KEYS: { key: keyof GroupResources; label: string; description: string }[] = [
  { key: 'projects',        label: 'Projects',         description: 'Repositories and source code projects.' },
  { key: 'pipelines',       label: 'Pipelines',        description: 'CI/CD pipeline definitions and runs.' },
  { key: 'runners',         label: 'Runners',          description: 'Build and deployment runners.' },
  { key: 'environments',    label: 'Environments',     description: 'Staging, production and preview environments.' },
  { key: 'deployments',     label: 'Deployments',      description: 'Container and serverless deployments.' },
  { key: 'observability',   label: 'Observability',    description: 'Monitoring dashboards, metrics and alerts.' },
  { key: 'api_keys',        label: 'API Keys',         description: 'Service and consumer API key management.' },
  { key: 'secrets',         label: 'Secrets',          description: 'Encrypted environment secrets and variables.' },
  { key: 'storage_buckets', label: 'Storage Buckets',  description: 'Object storage buckets and file shares.' },
  { key: 'domains',         label: 'Domains',          description: 'Custom domains and SSL certificates.' },
  { key: 'billing',         label: 'Billing',          description: 'Usage, invoices and payment methods.' },
];

const VISIBILITY_OPTIONS: { value: GroupVisibility; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'public',   label: 'Public',   icon: <PublicIcon />,    description: 'Visible to anyone on OrcaCloud.' },
  { value: 'internal', label: 'Internal', icon: <LockOpenIcon />,  description: 'Visible to all authenticated users in your organisation.' },
  { value: 'private',  label: 'Private',  icon: <LockIcon />,      description: 'Only visible to group members.' },
];

const STEP_LABELS = ['Identity', 'Group Type', 'Default Role', 'Resources', 'Review'];

// ─── State shape ──────────────────────────────────────────────────────────────

interface WizardState {
  name: string
  handle: string
  description: string
  visibility: GroupVisibility
  avatar_url: string
  group_type: GroupType
  default_role: GroupRole
  resources: GroupResources
}

const DEFAULT_STATE: WizardState = {
  name: '',
  handle: '',
  description: '',
  visibility: 'private',
  avatar_url: '',
  group_type: 'developer',
  default_role: 'developer',
  resources: {
    projects: true,
    pipelines: true,
    runners: true,
    environments: true,
    deployments: true,
    observability: true,
    api_keys: false,
    secrets: false,
    storage_buckets: false,
    domains: false,
    billing: false,
  },
};

// ─── Section helpers ──────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  const t = useT();
  return (
    <Box sx={{ mb: 3 }}>
      <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', color: t.textPrimary, fontFamily: FONT, letterSpacing: '-.015em' }}>
        {title}
      </Typography>
      <Typography sx={{ color: t.textSecondary, fontSize: '.875rem', mt: 0.4, fontFamily: FONT }}>
        {subtitle}
      </Typography>
    </Box>
  );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  const t = useT();
  return (
    <Typography component="label" sx={{ display: 'block', fontSize: '.8rem', fontWeight: 600, color: t.textSecondary, mb: 0.5, fontFamily: FONT }}>
      {children}{required && <span style={{ color: dashboardSemanticColors.danger }}> *</span>}
    </Typography>
  );
}

function StyledInput(props: React.ComponentProps<typeof TextField>) {
  const t = useT();
  return (
    <TextField
      {...props}
      sx={{
        '& .MuiOutlinedInput-root': {
          bgcolor: t.surface,
          color: t.textPrimary,
          borderRadius: '8px',
          fontSize: '.875rem',
          fontFamily: FONT,
          '& fieldset': { borderColor: t.border },
          '&:hover fieldset': { borderColor: t.borderStrong },
          '&.Mui-focused fieldset': { borderColor: dashboardTokens.colors.brandPrimary, boxShadow: '0 0 0 3px rgba(21,61,117,0.14)' },
        },
        '& .MuiInputBase-input::placeholder': { color: t.textSecondary, opacity: 1 },
        ...(props.sx as any),
      }}
    />
  );
}

// ─── Steps ────────────────────────────────────────────────────────────────────

function Step1Identity({ state, setState }: { state: WizardState; setState: React.Dispatch<React.SetStateAction<WizardState>> }) {
  const t = useT();

  const handleName = (v: string) => {
    const handle = v.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    setState((s) => ({ ...s, name: v, handle }));
  };

  return (
    <Box>
      <SectionHeader title="Group Identity" subtitle="Define the name, handle and visibility of your group." />

      <Stack gap={2.5}>
        {/* Name */}
        <Box>
          <FieldLabel required>Group Name</FieldLabel>
          <StyledInput
            fullWidth
            placeholder="e.g. Platform Core"
            value={state.name}
            onChange={(e) => handleName(e.target.value)}
            inputProps={{ maxLength: 200 }}
          />
        </Box>

        {/* Handle */}
        <Box>
          <FieldLabel required>URL Handle</FieldLabel>
          <StyledInput
            fullWidth
            placeholder="platform-core"
            value={state.handle}
            onChange={(e) => setState((s) => ({ ...s, handle: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))}
            InputProps={{
              startAdornment: <InputAdornment position="start"><Typography sx={{ color: t.textSecondary, fontSize: '.85rem', fontFamily: FONT }}>@</Typography></InputAdornment>,
            }}
            helperText="Lowercase letters, numbers and hyphens only."
            FormHelperTextProps={{ sx: { color: t.textSecondary, fontSize: '.75rem' } }}
          />
        </Box>

        {/* Description */}
        <Box>
          <FieldLabel>Description</FieldLabel>
          <StyledInput
            fullWidth
            multiline
            rows={3}
            placeholder="Briefly describe what this group owns and manages…"
            value={state.description}
            onChange={(e) => setState((s) => ({ ...s, description: e.target.value }))}
            inputProps={{ maxLength: 500 }}
          />
        </Box>

        {/* Visibility */}
        <Box>
          <FieldLabel required>Visibility</FieldLabel>
          <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} sx={{ mt: 0.5 }}>
            {VISIBILITY_OPTIONS.map((opt) => (
              <Box
                key={opt.value}
                onClick={() => setState((s) => ({ ...s, visibility: opt.value }))}
                sx={{
                  flex: 1,
                  border: `1.5px solid ${state.visibility === opt.value ? dashboardTokens.colors.brandPrimary : t.border}`,
                  bgcolor: state.visibility === opt.value ? 'rgba(21,61,117,0.06)' : t.surface,
                  borderRadius: '8px',
                  p: '12px 14px',
                  cursor: 'pointer',
                  transition: 'border-color .15s, background .15s',
                  '&:hover': { borderColor: t.borderStrong },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Box sx={{ color: state.visibility === opt.value ? dashboardTokens.colors.brandPrimary : t.textSecondary, fontSize: '1.1rem', display: 'flex' }}>
                    {opt.icon}
                  </Box>
                  <Typography sx={{ fontWeight: 700, fontSize: '.875rem', color: state.visibility === opt.value ? dashboardTokens.colors.brandPrimary : t.textPrimary, fontFamily: FONT }}>
                    {opt.label}
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: '.78rem', color: t.textSecondary, fontFamily: FONT, lineHeight: 1.4 }}>
                  {opt.description}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Box>

        {/* Avatar URL */}
        <Box>
          <FieldLabel>Avatar URL</FieldLabel>
          <StyledInput
            fullWidth
            placeholder="https://…"
            value={state.avatar_url}
            onChange={(e) => setState((s) => ({ ...s, avatar_url: e.target.value }))}
          />
        </Box>
      </Stack>
    </Box>
  );
}

function Step2Type({ state, setState }: { state: WizardState; setState: React.Dispatch<React.SetStateAction<WizardState>> }) {
  const t = useT();
  return (
    <Box>
      <SectionHeader title="Group Type" subtitle="Choose the primary purpose of this group — this configures default capabilities and tooling." />
      <Stack gap={1.5}>
        {GROUP_TYPES.map((gt) => {
              const accent = gt.accent;
          const selected = state.group_type === gt.value;
          return (
            <Box
              key={gt.value}
              onClick={() => setState((s) => ({ ...s, group_type: gt.value }))}
              sx={{
                border: `1.5px solid ${selected ? accent : t.border}`,
                bgcolor: selected ? `${accent}12` : t.surface,
                borderRadius: '8px',
                p: '14px 16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                transition: 'border-color .15s, background .15s',
                '&:hover': { borderColor: t.borderStrong },
              }}
            >
              <Box
                sx={{
                  width: 36, height: 36, borderRadius: '8px',
                  bgcolor: selected ? `${accent}22` : t.surfaceSubtle,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: selected ? accent : t.textSecondary,
                }}
              >
                <GroupsIcon sx={{ fontSize: '1.1rem' }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontWeight: 700, fontSize: '.875rem', color: selected ? accent : t.textPrimary, fontFamily: FONT }}>
                  {gt.label}
                </Typography>
                <Typography sx={{ fontSize: '.78rem', color: t.textSecondary, fontFamily: FONT, mt: 0.2 }}>
                  {gt.description}
                </Typography>
              </Box>
              {selected && <CheckCircleOutlineIcon sx={{ color: accent, fontSize: '1.1rem' }} />}
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}

function Step3Role({ state, setState }: { state: WizardState; setState: React.Dispatch<React.SetStateAction<WizardState>> }) {
  const t = useT();
  return (
    <Box>
      <SectionHeader title="Default Member Role" subtitle="New members who join via an invitation link will be assigned this role by default." />
      <Stack gap={1}>
        {ROLES.map((role) => {
          const selected = state.default_role === role.value;
          return (
            <Box
              key={role.value}
              onClick={() => setState((s) => ({ ...s, default_role: role.value }))}
              sx={{
                border: `1.5px solid ${selected ? dashboardTokens.colors.brandPrimary : t.border}`,
                bgcolor: selected ? 'rgba(21,61,117,0.06)' : t.surface,
                borderRadius: '8px',
                p: '12px 16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                transition: 'border-color .15s, background .15s',
                '&:hover': { borderColor: t.borderStrong },
              }}
            >
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontWeight: 700, fontSize: '.875rem', color: selected ? dashboardTokens.colors.brandPrimary : t.textPrimary, fontFamily: FONT }}>
                  {role.label}
                </Typography>
                <Typography sx={{ fontSize: '.78rem', color: t.textSecondary, fontFamily: FONT, mt: 0.15 }}>
                  {role.description}
                </Typography>
              </Box>
              {selected && <CheckCircleOutlineIcon sx={{ color: dashboardTokens.colors.brandPrimary, fontSize: '1.1rem' }} />}
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}

function Step4Resources({ state, setState }: { state: WizardState; setState: React.Dispatch<React.SetStateAction<WizardState>> }) {
  const t = useT();
  const toggle = (key: keyof GroupResources) =>
    setState((s) => ({ ...s, resources: { ...s.resources, [key]: !s.resources[key] } }));

  return (
    <Box>
      <SectionHeader title="Resource Ownership" subtitle="Choose which resource categories this group will own and manage." />
      <Stack gap={1}>
        {RESOURCE_KEYS.map(({ key, label, description }) => {
          const on = Boolean(state.resources[key]);
          return (
            <Box
              key={key}
              sx={{
                border: `1px solid ${on ? 'rgba(21,61,117,0.35)' : t.border}`,
                bgcolor: on ? 'rgba(21,61,117,0.04)' : 'transparent',
                borderRadius: '8px',
                p: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2,
                transition: 'border-color .15s, background .15s',
              }}
            >
              <Box>
                <Typography sx={{ fontWeight: 600, fontSize: '.875rem', color: t.textPrimary, fontFamily: FONT }}>
                  {label}
                </Typography>
                <Typography sx={{ fontSize: '.78rem', color: t.textSecondary, fontFamily: FONT }}>
                  {description}
                </Typography>
              </Box>
              <Switch
                checked={on}
                onChange={() => toggle(key)}
                size="small"
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': { color: dashboardTokens.colors.brandPrimary },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: 'rgba(21,61,117,0.5)' },
                }}
              />
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}

function Step5Review({ state }: { state: WizardState }) {
  const t = useT();

  const enabledResources = RESOURCE_KEYS.filter((r) => state.resources[r.key]).map((r) => r.label);

  const rows: { label: string; value: React.ReactNode }[] = [
    { label: 'Name',         value: state.name || '—' },
    { label: 'Handle',       value: `@${state.handle}` },
    { label: 'Description',  value: state.description || '—' },
    { label: 'Visibility',   value: <Chip label={state.visibility} size="small" sx={{ textTransform: 'capitalize', bgcolor: t.surfaceSubtle, color: t.textSecondary, fontSize: '.75rem', height: 18 }} /> },
    { label: 'Group Type',   value: <Chip label={state.group_type} size="small" sx={{ textTransform: 'capitalize', bgcolor: t.surfaceSubtle, color: t.textSecondary, fontSize: '.75rem', height: 18 }} /> },
    { label: 'Default Role', value: <Chip label={state.default_role} size="small" sx={{ textTransform: 'capitalize', bgcolor: 'rgba(21,61,117,0.10)', color: dashboardTokens.colors.brandPrimary, fontSize: '.75rem', height: 18 }} /> },
    {
      label: 'Resources',
      value: (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {enabledResources.length
            ? enabledResources.map((r) => (
                <Chip key={r} label={r} size="small" sx={{ bgcolor: t.surfaceSubtle, color: t.textSecondary, fontSize: '.72rem', height: 18 }} />
              ))
            : <Typography sx={{ color: t.textSecondary, fontSize: '.82rem', fontFamily: FONT }}>None selected</Typography>
          }
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <SectionHeader title="Review & Create" subtitle="Confirm the details below before creating your group." />
      <Stack gap={0} sx={{ border: `1px solid ${t.border}`, borderRadius: '8px', overflow: 'hidden' }}>
        {rows.map((row, i) => (
          <Box
            key={row.label}
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 2,
              px: 2,
              py: 1.25,
              bgcolor: i % 2 === 0 ? 'transparent' : t.surfaceSubtle,
              borderBottom: i < rows.length - 1 ? `1px solid ${t.border}` : 'none',
            }}
          >
            <Typography sx={{ fontWeight: 600, fontSize: '.8rem', color: t.textSecondary, fontFamily: FONT, minWidth: 110, pt: 0.1 }}>
              {row.label}
            </Typography>
            <Box sx={{ flex: 1 }}>
              {typeof row.value === 'string'
                ? <Typography sx={{ fontSize: '.875rem', color: t.textPrimary, fontFamily: FONT }}>{row.value}</Typography>
                : row.value
              }
            </Box>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const GroupCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const t = useT();
  const [step, setStep] = useState(0);
  const [state, setState] = useState<WizardState>(DEFAULT_STATE);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [createdGroup, setCreatedGroup] = useState<Group | null>(null);
  const [projectModalOpen, setProjectModalOpen] = useState(false);

  const canNext = () => {
    if (step === 0) return state.name.trim().length > 0 && state.handle.trim().length > 0;
    return true;
  };

  const handleNext = () => {
    if (step < STEP_LABELS.length - 1) setStep((s) => s + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep((s) => s - 1);
    else navigate(-1);
  };

  const handleCreate = async () => {
    setSaving(true);
    setError('');
    const payload: GroupCreatePayload = {
      name: state.name,
      handle: state.handle,
      description: state.description,
      visibility: state.visibility,
      group_type: state.group_type,
      avatar_url: state.avatar_url,
      resources: state.resources,
    };
    try {
      const group = await createGroup(payload);
      setCreatedGroup(group);
    } catch (err: any) {
      const detail = err?.response?.data;
      if (typeof detail === 'object') {
        setError(Object.entries(detail).map(([k, v]) => `${k}: ${(v as any[]).join(' ')}`).join('; '));
      } else {
        setError('Failed to create group. Please try again.');
      }
      setSaving(false);
    }
  };

  const isLast = step === STEP_LABELS.length - 1;
  const BP  = dashboardTokens.colors.brandPrimary;

  // ── Post-creation success screen ───────────────────────────────────────────
  if (createdGroup) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: dashboardTokens.colors.background, display: 'flex', alignItems: 'center', justifyContent: 'center', p: { xs: 2, md: 4 }, fontFamily: FONT }}>
        <Box sx={{ width: '100%', maxWidth: 480, textAlign: 'center' }}>

          {/* Success icon */}
          <Box sx={{ width: 72, height: 72, borderRadius: '50%', bgcolor: 'rgba(34,197,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2.5 }}>
            <CheckCircleIcon sx={{ fontSize: '2.5rem', color: dashboardSemanticColors.success }} />
          </Box>

          <Typography sx={{ fontWeight: 800, fontSize: '1.4rem', color: t.textPrimary, fontFamily: FONT, letterSpacing: '-.02em', mb: 0.75 }}>
            Group created!
          </Typography>
          <Typography sx={{ color: t.textSecondary, fontSize: '.9rem', fontFamily: FONT, mb: 4 }}>
            <Box component="span" sx={{ fontWeight: 700, color: t.textPrimary }}>{createdGroup.name}</Box>
            {' '}is ready. What would you like to do next?
          </Typography>

          {/* CTAs */}
          <Stack spacing={1.5}>
            {/* Primary CTA — create a project */}
            <Box
              onClick={() => setProjectModalOpen(true)}
              sx={{
                border: `1px solid ${t.border}`, borderRadius: '12px', p: '16px 20px',
                bgcolor: t.surface, cursor: 'pointer', textAlign: 'left',
                display: 'flex', alignItems: 'center', gap: 2,
                transition: 'border-color .15s, background .15s',
                '&:hover': { borderColor: BP, bgcolor: 'rgba(21,61,117,0.04)' },
              }}
            >
              <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: 'rgba(21,61,117,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: BP, flexShrink: 0 }}>
                <FolderOpenIcon />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontWeight: 700, fontSize: '.95rem', color: t.textPrimary, fontFamily: FONT }}>
                  Create your first project
                </Typography>
                <Typography sx={{ fontSize: '.8rem', color: t.textSecondary, fontFamily: FONT }}>
                  Add a repository, choose a language and configure visibility.
                </Typography>
              </Box>
              <ArrowForwardIcon sx={{ color: t.textSecondary, fontSize: '1.1rem', flexShrink: 0 }} />
            </Box>

            {/* Secondary CTA — go to group */}
            <Box
              onClick={() => navigate(`/groups/${createdGroup.id}`)}
              sx={{
                border: `1px solid ${t.border}`, borderRadius: '12px', p: '16px 20px',
                bgcolor: t.surface, cursor: 'pointer', textAlign: 'left',
                display: 'flex', alignItems: 'center', gap: 2,
                transition: 'border-color .15s, background .15s',
                '&:hover': { borderColor: t.borderStrong, bgcolor: t.surfaceSubtle ?? t.surface },
              }}
            >
              <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: 'rgba(139,92,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: dashboardSemanticColors.purple, flexShrink: 0 }}>
                <GroupsIcon />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontWeight: 700, fontSize: '.95rem', color: t.textPrimary, fontFamily: FONT }}>
                  Go to group dashboard
                </Typography>
                <Typography sx={{ fontSize: '.8rem', color: t.textSecondary, fontFamily: FONT }}>
                  Manage members, settings, and resources for this group.
                </Typography>
              </Box>
              <ArrowForwardIcon sx={{ color: t.textSecondary, fontSize: '1.1rem', flexShrink: 0 }} />
            </Box>
          </Stack>

          <Typography
            onClick={() => navigate('/developer/Dashboard/groups')}
            sx={{ mt: 3, fontSize: '.8rem', color: t.textSecondary, fontFamily: FONT, cursor: 'pointer', '&:hover': { color: t.textPrimary } }}
          >
            ← Back to all groups
          </Typography>
        </Box>

        {/* Project creation modal */}
        <GroupProjectCreateModal
          open={projectModalOpen}
          groupId={createdGroup.id}
          groupName={createdGroup.name}
          onClose={() => setProjectModalOpen(false)}
          onCreated={() => {
            setProjectModalOpen(false);
            navigate(`/groups/${createdGroup.id}/projects`);
          }}
        />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: dashboardTokens.colors.background,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        p: { xs: 2, md: 4 },
        fontFamily: FONT,
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 680 }}>

        {/* Top nav */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={handleBack}
            sx={{ color: t.textSecondary, textTransform: 'none', fontFamily: FONT, fontSize: '.85rem', fontWeight: 600, '&:hover': { color: t.textPrimary, bgcolor: 'transparent' } }}
          >
            {step === 0 ? 'Cancel' : 'Back'}
          </Button>
          <Box sx={{ flex: 1 }} />
          <Typography sx={{ color: t.textSecondary, fontSize: '.8rem', fontFamily: FONT }}>
            Step {step + 1} of {STEP_LABELS.length}
          </Typography>
        </Box>

        {/* Page title */}
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 40, height: 40, borderRadius: '10px',
              bgcolor: 'rgba(21,61,117,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: dashboardTokens.colors.brandPrimary,
            }}
          >
            <GroupsIcon />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: '1.25rem', color: t.textPrimary, fontFamily: FONT, letterSpacing: '-.02em' }}>
              Create a Group
            </Typography>
            <Typography sx={{ color: t.textSecondary, fontSize: '.875rem', fontFamily: FONT }}>
              Groups organise your projects, members and resources.
            </Typography>
          </Box>
        </Box>

        {/* Stepper */}
        <Stepper
          activeStep={step}
          sx={{
            mb: 3,
            '& .MuiStepLabel-label': { fontFamily: FONT, fontSize: '.8rem', color: t.textSecondary },
            '& .MuiStepLabel-label.Mui-active': { color: dashboardTokens.colors.brandPrimary, fontWeight: 700 },
            '& .MuiStepLabel-label.Mui-completed': { color: dashboardSemanticColors.success },
            '& .MuiStepIcon-root': { color: t.border },
            '& .MuiStepIcon-root.Mui-active': { color: dashboardTokens.colors.brandPrimary },
            '& .MuiStepIcon-root.Mui-completed': { color: dashboardSemanticColors.success },
            '& .MuiStepConnector-line': { borderColor: t.border },
          }}
        >
          {STEP_LABELS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* Card */}
        <Box
          sx={{
            bgcolor: t.surface,
            border: `1px solid ${t.border}`,
            borderRadius: '12px',
            p: { xs: 2.5, md: 3.5 },
          }}
        >
          {step === 0 && <Step1Identity state={state} setState={setState} />}
          {step === 1 && <Step2Type state={state} setState={setState} />}
          {step === 2 && <Step3Role state={state} setState={setState} />}
          {step === 3 && <Step4Resources state={state} setState={setState} />}
          {step === 4 && <Step5Review state={state} />}

          {error && (
            <Box sx={{ mt: 2, p: '10px 14px', bgcolor: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', borderRadius: '8px' }}>
              <Typography sx={{ fontSize: '.82rem', color: dashboardSemanticColors.danger, fontFamily: FONT }}>{error}</Typography>
            </Box>
          )}

          <Divider sx={{ borderColor: t.border, my: 2.5 }} />

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
            {step > 0 && (
              <Button
                onClick={() => setStep((s) => s - 1)}
                startIcon={<ArrowBackIcon />}
                sx={{ color: t.textSecondary, textTransform: 'none', fontFamily: FONT, fontWeight: 600, '&:hover': { color: t.textPrimary, bgcolor: 'transparent' } }}
              >
                Previous
              </Button>
            )}
            {!isLast ? (
              <Button
                variant="contained"
                endIcon={<ArrowForwardIcon />}
                disabled={!canNext()}
                onClick={handleNext}
                sx={{
                  bgcolor: dashboardTokens.colors.brandPrimary,
                  color: '#0a0f1a',
                  fontWeight: 700,
                  fontSize: '.85rem',
                  textTransform: 'none',
                  borderRadius: '8px',
                  boxShadow: 'none',
                  '&:hover': { bgcolor: dashboardTokens.colors.brandPrimaryHover, boxShadow: 'none' },
                  '&:disabled': { bgcolor: t.border, color: t.textSecondary },
                }}
              >
                Continue
              </Button>
            ) : (
              <Button
                variant="contained"
                startIcon={saving ? <CircularProgress size={14} sx={{ color: '#FFFFFF' }} /> : <CheckCircleOutlineIcon />}
                disabled={saving}
                onClick={handleCreate}
                sx={{
                  bgcolor: dashboardTokens.colors.brandPrimary,
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '.85rem',
                  textTransform: 'none',
                  borderRadius: '8px',
                  boxShadow: 'none',
                  '&:hover': { bgcolor: dashboardTokens.colors.brandPrimaryHover, boxShadow: 'none' },
                  '&:disabled': { bgcolor: t.border, color: t.textSecondary },
                }}
              >
                {saving ? 'Creating…' : 'Create Group'}
              </Button>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default GroupCreatePage;
