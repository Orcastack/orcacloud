/**
 * WorkspaceCreationWizard
 *
 * Full 9-step pre-provisioning wizard. Walks the user through:
 *   1. Basics       — name, description, region/zone
 *   2. Compute      — vCPU / RAM / GPU
 *   3. Database     — engine, plan, name, version, storage
 *   4. Storage      — disk type, size, backup policy
 *   5. Network      — VPC, subnet, firewall, public IP
 *   6. Project &    — attach/create project, container runtime & template
 *      Container
 *   7. Environment  — attach/create environment
 *   8. Domain       — optional domain binding
 *   9. Review &     — full summary → Provision Workspace
 *      Provision
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Slider,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import DnsIcon from '@mui/icons-material/Dns'
import CloseIcon from '@mui/icons-material/Close'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch'
import StorageIcon from '@mui/icons-material/Storage'
import NetworkCheckIcon from '@mui/icons-material/NetworkCheck'
import TerminalIcon from '@mui/icons-material/Terminal'
import LanguageIcon from '@mui/icons-material/Language'
import TuneIcon from '@mui/icons-material/Tune'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import CloudQueueIcon from '@mui/icons-material/CloudQueue'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'

import { dashboardSemanticColors, dashboardTokens } from '../../styles/dashboardDesignSystem'
import { getResourceOrigin } from '../../services/resourceContext'
import {
  createDevWorkspace,
  fetchWorkspaceCatalog,
  workspaceSetup,
  type BackupPolicy,
  type ContainerRuntime,
  type CreateDevWorkspacePayload,
  type DatabaseEngine,
  type DatabasePlan,
  type DevWorkspace,
  type FirewallProfile,
  type StorageType,
  type WorkspaceCatalog,
} from '../../services/devWorkspaceApi'
import { createEnvironment, listEnvironments, type ApiEnvironment } from '../../services/environmentsApi'
import { createProject, listProjects, type BackendProject } from '../../services/projectsApi'

// ─── Design tokens ────────────────────────────────────────────────────────────
const FONT = dashboardTokens.typography.fontFamily
const T = dashboardTokens.colors
const S = dashboardSemanticColors

// ─── Wizard steps ─────────────────────────────────────────────────────────────
const STEPS = [
  'Basics',
  'Compute',
  'Database',
  'Storage',
  'Network',
  'Project & Container',
  'Environment',
  'Domain',
  'Review & Provision',
]

// ─── Helper: card selection ────────────────────────────────────────────────────
interface SelectCardProps {
  selected: boolean
  onClick: () => void
  title: string
  subtitle?: string
  badge?: string
  icon?: React.ReactNode
  disabled?: boolean
}

function SelectCard({ selected, onClick, title, subtitle, badge, icon, disabled }: SelectCardProps) {
  return (
    <Box
      onClick={disabled ? undefined : onClick}
      sx={{
        p: 1.5,
        borderRadius: '10px',
        border: `1.5px solid ${selected ? T.brandPrimary : T.border}`,
        bgcolor: selected ? 'rgba(99,102,241,.10)' : T.surfaceSubtle,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        transition: 'all .15s',
        '&:hover': disabled ? {} : {
          borderColor: T.brandPrimary,
          bgcolor: 'rgba(99,102,241,.08)',
        },
        position: 'relative',
      }}
    >
      {badge && (
        <Chip label={badge} size="small"
          sx={{ position: 'absolute', top: 8, right: 8, fontSize: '.65rem', height: 18,
                bgcolor: 'rgba(99,102,241,.20)', color: T.brandPrimary, fontWeight: 700 }} />
      )}
      <Stack direction="row" spacing={1} alignItems="center">
        {icon && <Box sx={{ color: selected ? T.brandPrimary : T.textSecondary, display: 'flex' }}>{icon}</Box>}
        <Box>
          <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '.82rem',
            color: selected ? T.brandPrimary : T.textPrimary }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography sx={{ fontFamily: FONT, fontSize: '.72rem', color: T.textSecondary, mt: .15 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
      </Stack>
      {selected && (
        <CheckCircleIcon sx={{ fontSize: '.9rem', color: T.brandPrimary,
          position: 'absolute', bottom: 8, right: 8 }} />
      )}
    </Box>
  )
}

// ─── Section heading ─────────────────────────────────────────────────────────
function SectionHeading({ icon, title, description }: { icon: React.ReactNode; title: string; description?: string }) {
  return (
    <Stack direction="row" spacing={1.25} alignItems="flex-start" sx={{ mb: 2 }}>
      <Box sx={{ mt: .1, color: T.brandPrimary, display: 'flex' }}>{icon}</Box>
      <Box>
        <Typography sx={{ fontFamily: FONT, fontWeight: 800, fontSize: '.95rem', color: T.textPrimary }}>
          {title}
        </Typography>
        {description && (
          <Typography sx={{ fontFamily: FONT, fontSize: '.78rem', color: T.textSecondary, mt: .2 }}>
            {description}
          </Typography>
        )}
      </Box>
    </Stack>
  )
}

// ─── Review row ───────────────────────────────────────────────────────────────
function ReviewRow({ label, value, chip }: { label: string; value: string | React.ReactNode; chip?: string }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center"
      sx={{ py: .75, borderBottom: `1px solid ${T.border}`, '&:last-child': { borderBottom: 'none' } }}>
      <Typography sx={{ fontFamily: FONT, fontSize: '.8rem', color: T.textSecondary, fontWeight: 600 }}>
        {label}
      </Typography>
      <Stack direction="row" spacing={.75} alignItems="center">
        {chip && <Chip label={chip} size="small" sx={{ height: 18, fontSize: '.65rem', bgcolor: 'rgba(99,102,241,.15)', color: T.brandPrimary }} />}
        <Typography sx={{ fontFamily: FONT, fontSize: '.8rem', color: T.textPrimary, fontWeight: 700 }}>
          {value}
        </Typography>
      </Stack>
    </Stack>
  )
}

// ─── Main component props ─────────────────────────────────────────────────────
export interface WorkspaceCreationWizardProps {
  open: boolean
  onClose: () => void
  onCreated: (workspace: DevWorkspace) => void
  /**
   * When provided, the wizard creates an enterprise-scoped workspace:
   *   - created_by_role        = 'enterprise'
   *   - created_from_dashboard = 'enterprise'
   *   - parent_context_id      = enterpriseOrgSlug
   * Enterprise workspaces are hidden from the Developer Dashboard.
   */
  enterpriseOrgSlug?: string
  /**
   * When provided (without enterpriseOrgSlug), the wizard creates a
   * group-scoped workspace visible only inside that group's dashboard.
   */
  groupId?: string
}

// ─── State shape ─────────────────────────────────────────────────────────────
interface WizardState {
  // Step 1 — Basics
  displayName: string
  description: string
  region: string
  ide: string

  // Step 2 — Compute
  vcpus: number
  ramGb: number
  gpuEnabled: boolean

  // Step 3 — Database
  dbEngine: DatabaseEngine
  dbPlan: DatabasePlan
  dbName: string
  dbVersion: string
  dbStorageGb: number

  // Step 4 — Storage
  storageType: StorageType
  storageGb: number
  backupPolicy: BackupPolicy

  // Step 4 — Network
  vpcName: string
  subnetName: string
  firewallProfile: FirewallProfile
  publicIp: boolean

  // Step 5 — Project & Container
  projectMode: 'create' | 'attach' | 'skip'
  projectId: string
  projectName: string
  projectDescription: string
  containerRuntime: ContainerRuntime
  containerTemplate: string

  // Step 6 — Environment
  environmentMode: 'create' | 'attach' | 'skip'
  environmentId: string
  environmentName: string
  environmentType: 'dev' | 'stage' | 'prod'

  // Step 7 — Domain
  domainEnabled: boolean
  domain: string
  autoSubdomain: boolean

  // Custom image (when containerTemplate === 'custom')
  customImageUrl: string
}

function defaultState(): WizardState {
  return {
    displayName: '',
    description: '',
    region: 'us-east-1',
    ide: 'VS Code',

    vcpus: 2,
    ramGb: 4,
    gpuEnabled: false,

    dbEngine: 'postgresql',
    dbPlan: 'shared',
    dbName: '',
    dbVersion: '16',
    dbStorageGb: 10,

    storageType: 'standard',
    storageGb: 20,
    backupPolicy: 'none',

    vpcName: 'vpc-default',
    subnetName: 'subnet-public-01',
    firewallProfile: 'default',
    publicIp: false,

    projectMode: 'skip',
    projectId: '',
    projectName: '',
    projectDescription: '',
    containerRuntime: 'docker',
    containerTemplate: 'node',

    environmentMode: 'skip',
    environmentId: '',
    environmentName: '',
    environmentType: 'dev',

    domainEnabled: false,
    domain: '',
    autoSubdomain: true,

    customImageUrl: '',
  }
}

// ─── Input styling helper ─────────────────────────────────────────────────────
const inputSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: T.surfaceSubtle,
    color: T.textPrimary,
    borderRadius: '8px',
    fontSize: '.85rem',
    '& fieldset': { borderColor: T.border },
    '&:hover fieldset': { borderColor: T.brandPrimary },
    '&.Mui-focused fieldset': { borderColor: T.brandPrimary },
  },
  '& .MuiInputLabel-root': { color: T.textSecondary, fontSize: '.85rem' },
  '& .MuiInputLabel-root.Mui-focused': { color: T.brandPrimary },
}

// ─────────────────────────────────────────────────────────────────────────────
export default function WorkspaceCreationWizard({ open, onClose, onCreated, enterpriseOrgSlug, groupId }: WorkspaceCreationWizardProps) {
  const location = useLocation()
  const [step, setStep] = useState(0)
  const [state, setState] = useState<WizardState>(defaultState)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<DevWorkspace | null>(null)

  // Catalog data
  const [catalog, setCatalog] = useState<WorkspaceCatalog | null>(null)
  const [catalogLoading, setCatalogLoading] = useState(false)

  // Step 5 data
  const [projects, setProjects] = useState<BackendProject[]>([])
  const [environments, setEnvironments] = useState<ApiEnvironment[]>([])

  const set = useCallback(<K extends keyof WizardState>(key: K, value: WizardState[K]) => {
    setState(prev => ({ ...prev, [key]: value }))
  }, [])

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep(0)
      setState(defaultState())
      setError(null)
      setDone(null)
      setCatalogLoading(true)
      fetchWorkspaceCatalog()
        .then(setCatalog)
        .catch(() => null)
        .finally(() => setCatalogLoading(false))
      Promise.allSettled([listProjects(), listEnvironments()]).then(([pRes, eRes]) => {
        if (pRes.status === 'fulfilled') setProjects(pRes.value)
        if (eRes.status === 'fulfilled') setEnvironments(eRes.value)
      })
    }
  }, [open])

  // Derived slug
  const slugify = (v: string) => v.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '')
  const workspaceId = useMemo(() => slugify(state.displayName), [state.displayName])

  // Computed auto-subdomain
  const resolvedDomain = useMemo(() => {
    if (!state.domainEnabled) return ''
    if (state.autoSubdomain) return workspaceId ? `${workspaceId}.dev.orcacloud.com` : ''
    return state.domain
  }, [state.domainEnabled, state.autoSubdomain, state.domain, workspaceId])

  // Validate current step
  const stepError = useMemo((): string | null => {
    if (step === 0) {
      if (!state.displayName.trim()) return 'Workspace name is required.'
      if (!workspaceId) return 'Could not generate a valid workspace ID from the name.'
    }
    return null
  }, [step, state.displayName, workspaceId])

  // ── Navigation ──────────────────────────────────────────────────────────────
  const handleNext = () => {
    if (stepError) { setError(stepError); return }
    setError(null)
    setStep(s => s + 1)
  }

  const handleBack = () => {
    setError(null)
    setStep(s => s - 1)
  }

  // ── Provision ───────────────────────────────────────────────────────────────
  const handleProvision = async () => {
    if (!state.displayName.trim()) { setError('Workspace name is required.'); return }
    setBusy(true)
    setError(null)
    try {
      const payload: CreateDevWorkspacePayload = {
        workspace_id: workspaceId,
        display_name: state.displayName.trim(),
        region: state.region,
        ide: state.ide,
        // Compute
        vcpus: state.vcpus,
        ram_gb: state.ramGb,
        gpu_enabled: state.gpuEnabled,
        // Database
        db_engine: state.dbEngine,
        db_plan: state.dbEngine !== 'none' ? state.dbPlan : undefined,
        db_name: state.dbEngine !== 'none' ? (state.dbName.trim() || undefined) : undefined,
        db_version: state.dbEngine !== 'none' ? state.dbVersion : undefined,
        db_storage_gb: state.dbEngine !== 'none' && state.dbEngine !== 'sqlite' ? state.dbStorageGb : undefined,
        // Storage
        storage_type: state.storageType,
        storage_gb: state.storageGb,
        backup_policy: state.backupPolicy,
        // Network
        vpc_name: state.vpcName,
        subnet_name: state.subnetName,
        firewall_profile: state.firewallProfile,
        public_ip: state.publicIp,
        // Container
        container_runtime: state.containerRuntime,
        container_template: state.containerTemplate,
        // Domain
        domain: resolvedDomain,
      }

      // Map container template → base image
      const tplToImage: Record<string, string> = {
        node:    'atonix/devbox:node20',
        python:  'atonix/devbox:python312',
        go:      'atonix/devbox:golang123',
        php:     'atonix/devbox:php83',
        java:    'atonix/devbox:java21',
        rust:    'atonix/devbox:rust',
        ubuntu:  'atonix/devbox:22.04-lts',
        debian:  'debian:bookworm',
        lxc:     'atonix/devbox:lxc-ubuntu22',
        nerdctl: 'atonix/devbox:nerdctl-latest',
      }
      payload.image = state.containerTemplate === 'custom'
        ? (state.customImageUrl.trim() || 'atonix/devbox:22.04-lts')
        : (tplToImage[state.containerTemplate] ?? 'atonix/devbox:22.04-lts')
      payload.pull_image = true
      if (state.containerTemplate === 'custom' && state.customImageUrl.trim()) {
        payload.custom_image_url = state.customImageUrl.trim()
      }

      // ── Inject resource origin context ──────────────────────────────────
      // Props take priority; fall back to deriving from the current URL.
      if (enterpriseOrgSlug) {
        payload.created_by_role         = 'enterprise'
        payload.created_from_dashboard  = 'enterprise'
        payload.parent_context_id       = enterpriseOrgSlug
        payload.return_path             = `/enterprise/${enterpriseOrgSlug}/workspace/developer/workspace`
      } else if (groupId) {
        payload.created_by_role         = 'developer'
        payload.created_from_dashboard  = 'group'
        payload.parent_context_id       = groupId
        payload.return_path             = `/developer/groups/${groupId}`
      } else {
        const origin = getResourceOrigin(location.pathname)
        payload.created_by_role         = origin.created_by_role
        payload.created_from_dashboard  = origin.created_from_dashboard
        payload.parent_context_id       = origin.parent_context_id
        payload.return_path             = origin.return_path
      }

      const ws = await createDevWorkspace(payload)

      // Attach project / environment if user selected them
      if (state.projectMode !== 'skip' || state.environmentMode !== 'skip') {
        const setupPayload: Record<string, unknown> = {}
        if (state.projectMode === 'attach' && state.projectId) {
          setupPayload.project_action = 'connect'
          setupPayload.project_id = state.projectId
          const proj = projects.find(p => String(p.id) === state.projectId)
          if (proj) setupPayload.project_name = proj.name
        } else if (state.projectMode === 'create' && state.projectName.trim()) {
          const created = await createProject({ name: state.projectName.trim(), description: state.projectDescription, visibility: 'private' })
          setupPayload.project_action = 'connect'
          setupPayload.project_id = String(created.id)
          setupPayload.project_name = created.name
        }
        if (state.environmentMode === 'attach' && state.environmentId) {
          setupPayload.environment_action = 'connect'
          setupPayload.environment_id = state.environmentId
          const env = environments.find(e => String(e.id) === state.environmentId)
          if (env) setupPayload.environment_name = env.name
        } else if (state.environmentMode === 'create' && state.environmentName.trim()) {
          const projectIdForEnv = (setupPayload.project_id as string | undefined) || ''
          if (projectIdForEnv) {
            const env = await createEnvironment({
              name: state.environmentName.trim(),
              project: projectIdForEnv,
              region: state.region,
              description: `${state.environmentType.toUpperCase()} environment`,
              auto_deploy: false,
              deployment_strategy: 'rolling',
              require_approval: state.environmentType === 'prod',
              is_protected: state.environmentType === 'prod',
              notify_email: '',
            })
            setupPayload.environment_action = 'connect'
            setupPayload.environment_id = String(env?.id ?? '')
            setupPayload.environment_name = env?.name ?? ''
          }
        }
        if (Object.keys(setupPayload).length > 0) {
          await workspaceSetup(ws.workspace_id, setupPayload as any)
        }
      }

      setDone(ws)
    } catch (e: any) {
      setError(
        e?.response?.data?.workspace_id?.[0] ||
        e?.response?.data?.detail ||
        e?.message ||
        'Provisioning failed. Please try again.',
      )
    } finally {
      setBusy(false)
    }
  }

  // ── Success screen ──────────────────────────────────────────────────────────
  const handleOpenDashboard = () => {
    if (done) {
      onCreated(done)
      onClose()
    }
  }

  // ── Step content ────────────────────────────────────────────────────────────
  const computePlans = catalog?.compute_plans ?? [
    { id: 'nano',   label: 'Nano',   vcpus: 1,  ram_gb: 2,  price_hint: 'Free tier' },
    { id: 'micro',  label: 'Micro',  vcpus: 2,  ram_gb: 4,  price_hint: 'Starter' },
    { id: 'small',  label: 'Small',  vcpus: 4,  ram_gb: 8,  price_hint: 'Standard' },
    { id: 'medium', label: 'Medium', vcpus: 8,  ram_gb: 16, price_hint: 'Professional' },
    { id: 'large',  label: 'Large',  vcpus: 16, ram_gb: 32, price_hint: 'Enterprise' },
  ]
  const regions = catalog?.regions ?? [
    { id: 'us-east-1',      label: 'US East (N. Virginia)' },
    { id: 'us-west-2',      label: 'US West (Oregon)' },
    { id: 'eu-west-1',      label: 'EU West (Ireland)' },
    { id: 'ap-southeast-1', label: 'AP Southeast (Singapore)' },
  ]
  const firewallProfiles = catalog?.firewall_profiles ?? [
    { id: 'default', label: 'Default', description: 'Ports 80, 443, 22' },
    { id: 'strict',  label: 'Strict',  description: 'Outbound only' },
    { id: 'open',    label: 'Open',    description: 'All ports – dev only' },
    { id: 'custom',  label: 'Custom',  description: 'Custom rules' },
  ]
  const containerRuntimes = catalog?.container_runtimes ?? [
    { id: 'docker',     label: 'Docker' },
    { id: 'podman',     label: 'Podman' },
    { id: 'kubernetes', label: 'Kubernetes Pod' },
  ]
  const containerTemplates = catalog?.container_templates ?? [
    { id: 'node',    label: 'Node.js',    image: 'atonix/devbox:node20' },
    { id: 'python',  label: 'Python',     image: 'atonix/devbox:python312' },
    { id: 'go',      label: 'Go',         image: 'atonix/devbox:golang123' },
    { id: 'php',     label: 'PHP',        image: 'atonix/devbox:php83' },
    { id: 'java',    label: 'Java',       image: 'atonix/devbox:java21' },
    { id: 'rust',    label: 'Rust',       image: 'atonix/devbox:rust' },
    { id: 'ubuntu',  label: 'Ubuntu LTS', image: 'atonix/devbox:22.04-lts' },
    { id: 'debian',  label: 'Debian',     image: 'debian:bookworm' },
    { id: 'lxc',     label: 'LXC',        image: 'atonix/devbox:lxc-ubuntu22' },
    { id: 'nerdctl', label: 'Nerdctl',    image: 'atonix/devbox:nerdctl-latest' },
    { id: 'custom',  label: 'Custom',     image: '' },
  ]

  function renderStep() {
    // ── Step 1: Basics ────────────────────────────────────────────────────────
    if (step === 0) return (
      <Box>
        <SectionHeading icon={<TuneIcon />} title="Workspace Basics"
          description="Give your workspace a name and choose the region where it will be provisioned." />
        <Stack spacing={2.5}>
          <TextField label="Workspace Name *" placeholder="e.g. My API Service"
            value={state.displayName}
            onChange={e => set('displayName', e.target.value)}
            fullWidth size="small" sx={inputSx} />

          <Box sx={{ p: 1.5, borderRadius: '8px', bgcolor: T.surfaceSubtle, border: `1px dashed ${T.border}` }}>
            <Typography sx={{ fontFamily: FONT, fontSize: '.72rem', color: T.textSecondary, mb: .25 }}>
              Auto-generated Workspace ID
            </Typography>
            <Typography sx={{ fontFamily: 'monospace', fontSize: '.85rem', color: workspaceId ? T.textPrimary : T.textSecondary }}>
              {workspaceId || 'workspace-id-will-appear-here'}
            </Typography>
          </Box>

          <TextField label="Description" placeholder="What is this workspace for?"
            value={state.description}
            onChange={e => set('description', e.target.value)}
            multiline rows={2} fullWidth size="small" sx={inputSx} />

          <FormControl size="small" fullWidth sx={inputSx}>
            <InputLabel>Region / Zone</InputLabel>
            <Select label="Region / Zone" value={state.region}
              onChange={e => set('region', e.target.value)}>
              {regions.map(r => <MenuItem key={r.id} value={r.id}>{r.label}</MenuItem>)}
            </Select>
          </FormControl>

          <FormControl size="small" fullWidth sx={inputSx}>
            <InputLabel>Default IDE</InputLabel>
            <Select label="Default IDE" value={state.ide}
              onChange={e => set('ide', e.target.value)}>
              <MenuItem value="VS Code">VS Code (browser)</MenuItem>
              <MenuItem value="JupyterLab">JupyterLab</MenuItem>
              <MenuItem value="Terminal">Terminal only</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Box>
    )

    // ── Step 2: Compute ───────────────────────────────────────────────────────
    if (step === 1) return (
      <Box>
        <SectionHeading icon={<CloudQueueIcon />} title="Compute Plan"
          description="Choose the CPU and memory resources for your workspace container." />
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 1.25 }}>
          {computePlans.map(plan => (
            <SelectCard
              key={plan.id}
              selected={state.vcpus === plan.vcpus && state.ramGb === plan.ram_gb}
              onClick={() => { set('vcpus', plan.vcpus); set('ramGb', plan.ram_gb) }}
              title={plan.label}
              subtitle={`${plan.vcpus} vCPU · ${plan.ram_gb} GB RAM`}
              badge={plan.price_hint}
              icon={<CloudQueueIcon sx={{ fontSize: '1.1rem' }} />}
            />
          ))}
        </Box>
        {/* Custom sliders */}
        <Box sx={{ mt: 2.5, p: 2, borderRadius: '12px', bgcolor: T.surfaceSubtle, border: `1px solid ${T.border}` }}>
          <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '.8rem', color: T.textSecondary, mb: 1.5 }}>
            Custom Sizing
          </Typography>
          <Stack spacing={2.5}>
            <Box>
              <Stack direction="row" justifyContent="space-between" sx={{ mb: .5 }}>
                <Typography sx={{ fontFamily: FONT, fontSize: '.78rem', color: T.textSecondary }}>vCPU cores</Typography>
                <Typography sx={{ fontFamily: FONT, fontSize: '.78rem', fontWeight: 700, color: T.brandPrimary }}>{state.vcpus}</Typography>
              </Stack>
              <Slider value={state.vcpus} min={1} max={16} step={1} marks
                onChange={(_, v) => set('vcpus', v as number)}
                sx={{ color: T.brandPrimary }} />
            </Box>
            <Box>
              <Stack direction="row" justifyContent="space-between" sx={{ mb: .5 }}>
                <Typography sx={{ fontFamily: FONT, fontSize: '.78rem', color: T.textSecondary }}>RAM (GB)</Typography>
                <Typography sx={{ fontFamily: FONT, fontSize: '.78rem', fontWeight: 700, color: T.brandPrimary }}>{state.ramGb} GB</Typography>
              </Stack>
              <Slider value={state.ramGb} min={2} max={32} step={2} marks
                onChange={(_, v) => set('ramGb', v as number)}
                sx={{ color: T.brandPrimary }} />
            </Box>
          </Stack>
        </Box>
        <FormControlLabel
          sx={{ mt: 2 }}
          control={<Switch checked={state.gpuEnabled} onChange={e => set('gpuEnabled', e.target.checked)}
            sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: T.brandPrimary },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: T.brandPrimary } }} />}
          label={<Typography sx={{ fontFamily: FONT, fontSize: '.82rem', color: T.textPrimary }}>Enable GPU accelerator</Typography>}
        />
      </Box>
    )

    // ── Step 3: Database ─────────────────────────────────────────────────────
    if (step === 2) {
      const dbEngineOptions: { id: DatabaseEngine; label: string; subtitle: string }[] = [
        { id: 'postgresql', label: 'PostgreSQL', subtitle: 'Advanced open-source RDBMS' },
        { id: 'mysql',      label: 'MySQL',      subtitle: 'Popular relational database' },
        { id: 'sqlite',     label: 'SQLite',     subtitle: 'Embedded file-based DB' },
        { id: 'mongodb',    label: 'MongoDB',    subtitle: 'Flexible document store' },
        { id: 'redis',      label: 'Redis',      subtitle: 'In-memory key-value store' },
        { id: 'none',       label: 'No Database', subtitle: 'Skip database provisioning' },
      ]
      const dbPlanOptions: { id: DatabasePlan; label: string; subtitle: string }[] = [
        { id: 'shared',    label: 'Shared',    subtitle: 'Low cost · shared instance' },
        { id: 'dedicated', label: 'Dedicated', subtitle: 'Isolated instance resources' },
        { id: 'managed',   label: 'Managed',   subtitle: 'Cloud-managed with auto-backups' },
      ]
      const dbVersionsByEngine: Record<DatabaseEngine, string[]> = {
        postgresql: ['16', '15', '14', '13'],
        mysql:      ['8.0', '5.7'],
        sqlite:     ['3'],
        mongodb:    ['7.0', '6.0', '5.0'],
        redis:      ['7.2', '7.0', '6.2'],
        none:       ['—'],
      }
      const versions = dbVersionsByEngine[state.dbEngine] ?? []
      const showStorage = state.dbEngine !== 'none' && state.dbEngine !== 'sqlite'

      return (
        <Box>
          <SectionHeading icon={<DnsIcon />} title="Database"
            description="Select the database engine and plan for your workspace. All workspace data is recorded in the workspace database." />
          <Stack spacing={2.5}>

            {/* Engine */}
            <Box>
              <Typography sx={{ fontFamily: FONT, fontSize: '.78rem', fontWeight: 700, color: T.textSecondary, mb: 1 }}>
                Database Engine
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))', gap: 1.25 }}>
                {dbEngineOptions.map(eng => (
                  <SelectCard key={eng.id}
                    selected={state.dbEngine === eng.id}
                    onClick={() => {
                      set('dbEngine', eng.id)
                      const versions = dbVersionsByEngine[eng.id]
                      if (versions.length > 0) set('dbVersion', versions[0])
                    }}
                    title={eng.label}
                    subtitle={eng.subtitle}
                    icon={<DnsIcon sx={{ fontSize: '1rem' }} />}
                  />
                ))}
              </Box>
            </Box>

            {/* Plan */}
            {state.dbEngine !== 'none' && (
              <Box>
                <Typography sx={{ fontFamily: FONT, fontSize: '.78rem', fontWeight: 700, color: T.textSecondary, mb: 1 }}>
                  Database Plan
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.25 }}>
                  {dbPlanOptions.map(plan => (
                    <SelectCard key={plan.id}
                      selected={state.dbPlan === plan.id}
                      onClick={() => set('dbPlan', plan.id)}
                      title={plan.label}
                      subtitle={plan.subtitle}
                    />
                  ))}
                </Box>
              </Box>
            )}

            {/* Details */}
            {state.dbEngine !== 'none' && (
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                <TextField label="Database Name" placeholder="workspace_db"
                  value={state.dbName}
                  onChange={e => set('dbName', e.target.value)}
                  size="small" fullWidth sx={inputSx} />

                <FormControl size="small" fullWidth sx={inputSx}>
                  <InputLabel>Version</InputLabel>
                  <Select label="Version" value={state.dbVersion}
                    onChange={e => set('dbVersion', e.target.value)}>
                    {versions.map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
                  </Select>
                </FormControl>
              </Box>
            )}

            {/* Storage for DB */}
            {showStorage && (
              <Box sx={{ p: 2, borderRadius: '10px', bgcolor: T.surfaceSubtle, border: `1px solid ${T.border}` }}>
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                  <Typography sx={{ fontFamily: FONT, fontSize: '.78rem', color: T.textSecondary }}>Database Storage</Typography>
                  <Typography sx={{ fontFamily: FONT, fontSize: '.78rem', fontWeight: 700, color: T.brandPrimary }}>{state.dbStorageGb} GB</Typography>
                </Stack>
                <Slider value={state.dbStorageGb} min={5} max={200} step={5}
                  marks={[{ value: 5, label: '5' }, { value: 50, label: '50' }, { value: 100, label: '100' }, { value: 200, label: '200' }]}
                  onChange={(_, v) => set('dbStorageGb', v as number)}
                  sx={{ color: T.brandPrimary,
                    '& .MuiSlider-markLabel': { fontSize: '.65rem', color: T.textSecondary } }} />
              </Box>
            )}

            {/* Info banner */}
            {state.dbEngine !== 'none' && (
              <Box sx={{ p: 1.75, borderRadius: '10px', bgcolor: 'rgba(99,102,241,.08)', border: `1px solid rgba(99,102,241,.25)` }}>
                <Typography sx={{ fontFamily: FONT, fontSize: '.78rem', color: T.brandPrimary, fontWeight: 600 }}>
                  Workspace Database
                </Typography>
                <Typography sx={{ fontFamily: FONT, fontSize: '.73rem', color: T.textSecondary, mt: .25 }}>
                  All workspace activity — builds, deployments, logs, and metrics — will be recorded in this database. You can access it directly via the workspace terminal.
                </Typography>
              </Box>
            )}
          </Stack>
        </Box>
      )
    }

    // ── Step 4: Storage ───────────────────────────────────────────────────────
    if (step === 3) return (
      <Box>
        <SectionHeading icon={<StorageIcon />} title="Storage Plan"
          description="Choose storage type, size, and backup policy for your workspace." />
        <Stack spacing={2.5}>
          <Box>
            <Typography sx={{ fontFamily: FONT, fontSize: '.78rem', fontWeight: 700, color: T.textSecondary, mb: 1 }}>
              Storage Type
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.25 }}>
              <SelectCard selected={state.storageType === 'standard'} onClick={() => set('storageType', 'standard')}
                title="Standard SSD" subtitle="Up to 3,000 IOPS · Cost-effective" />
              <SelectCard selected={state.storageType === 'high-iops'} onClick={() => set('storageType', 'high-iops')}
                title="High-IOPS SSD" subtitle="Up to 16,000 IOPS · For intensive workloads" />
            </Box>
          </Box>

          <Box sx={{ p: 2, borderRadius: '10px', bgcolor: T.surfaceSubtle, border: `1px solid ${T.border}` }}>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography sx={{ fontFamily: FONT, fontSize: '.78rem', color: T.textSecondary }}>Storage Size</Typography>
              <Typography sx={{ fontFamily: FONT, fontSize: '.78rem', fontWeight: 700, color: T.brandPrimary }}>{state.storageGb} GB</Typography>
            </Stack>
            <Slider value={state.storageGb} min={10} max={500} step={10}
              marks={[{ value: 10, label: '10' }, { value: 100, label: '100' }, { value: 250, label: '250' }, { value: 500, label: '500' }]}
              onChange={(_, v) => set('storageGb', v as number)}
              sx={{ color: T.brandPrimary,
                '& .MuiSlider-markLabel': { fontSize: '.65rem', color: T.textSecondary } }} />
          </Box>

          <Box>
            <Typography sx={{ fontFamily: FONT, fontSize: '.78rem', fontWeight: 700, color: T.textSecondary, mb: 1 }}>
              Backup Policy
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.25 }}>
              {(['none', 'daily', 'weekly'] as BackupPolicy[]).map(p => (
                <SelectCard key={p} selected={state.backupPolicy === p}
                  onClick={() => set('backupPolicy', p)}
                  title={p === 'none' ? 'No Backup' : `${p.charAt(0).toUpperCase() + p.slice(1)} Backup`}
                  subtitle={p === 'none' ? 'No automatic snapshots' : p === 'daily' ? 'Daily at midnight UTC' : 'Every Sunday midnight UTC'} />
              ))}
            </Box>
          </Box>
        </Stack>
      </Box>
    )

    // ── Step 4: Network ───────────────────────────────────────────────────────
    if (step === 4) return (
      <Box>
        <SectionHeading icon={<NetworkCheckIcon />} title="Network Plan"
          description="Configure VPC, subnet, and firewall settings for your workspace." />
        <Stack spacing={2.5}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
            <TextField label="VPC" placeholder="vpc-default"
              value={state.vpcName}
              onChange={e => set('vpcName', e.target.value)}
              size="small" fullWidth sx={inputSx} />
            <TextField label="Subnet" placeholder="subnet-public-01"
              value={state.subnetName}
              onChange={e => set('subnetName', e.target.value)}
              size="small" fullWidth sx={inputSx} />
          </Box>

          <Box>
            <Typography sx={{ fontFamily: FONT, fontSize: '.78rem', fontWeight: 700, color: T.textSecondary, mb: 1 }}>
              Firewall Profile
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.25 }}>
              {firewallProfiles.map(fp => (
                <SelectCard key={fp.id} selected={state.firewallProfile === fp.id as FirewallProfile}
                  onClick={() => set('firewallProfile', fp.id as FirewallProfile)}
                  title={fp.label} subtitle={fp.description}
                  icon={<NetworkCheckIcon sx={{ fontSize: '1rem' }} />} />
              ))}
            </Box>
          </Box>

          <FormControlLabel
            control={<Switch checked={state.publicIp} onChange={e => set('publicIp', e.target.checked)}
              sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: T.brandPrimary },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: T.brandPrimary } }} />}
            label={
              <Box>
                <Typography sx={{ fontFamily: FONT, fontSize: '.82rem', color: T.textPrimary }}>
                  Assign Public IP
                </Typography>
                <Typography sx={{ fontFamily: FONT, fontSize: '.72rem', color: T.textSecondary }}>
                  A floating IP will be allocated and attached to your workspace.
                </Typography>
              </Box>
            }
          />
        </Stack>
      </Box>
    )

    // ── Step 5: Project & Container ───────────────────────────────────────────
    if (step === 5) return (
      <Box>
        <SectionHeading icon={<FolderOpenIcon />} title="Project & Container"
          description="Attach or create a project, then choose your container runtime and template." />
        <Stack spacing={2.5}>
          {/* Project */}
          <Box sx={{ p: 2, borderRadius: '10px', bgcolor: T.surfaceSubtle, border: `1px solid ${T.border}` }}>
            <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '.82rem', color: T.textPrimary, mb: 1.5 }}>
              Project
            </Typography>
            <RadioGroup row value={state.projectMode} onChange={e => set('projectMode', e.target.value as any)}>
              {[['skip', 'No project'], ['attach', 'Attach existing'], ['create', 'Create new']].map(([v, l]) => (
                <FormControlLabel key={v} value={v}
                  control={<Radio size="small" sx={{ color: T.textSecondary, '&.Mui-checked': { color: T.brandPrimary } }} />}
                  label={<Typography sx={{ fontFamily: FONT, fontSize: '.82rem', color: T.textPrimary }}>{l}</Typography>} />
              ))}
            </RadioGroup>
            {state.projectMode === 'attach' && (
              <FormControl size="small" fullWidth sx={{ mt: 1.5, ...inputSx }}>
                <InputLabel>Select Project</InputLabel>
                <Select label="Select Project" value={state.projectId}
                  onChange={e => set('projectId', e.target.value)}>
                  {projects.map(p => <MenuItem key={p.id} value={String(p.id)}>{p.name}</MenuItem>)}
                  {projects.length === 0 && <MenuItem disabled>No projects found</MenuItem>}
                </Select>
              </FormControl>
            )}
            {state.projectMode === 'create' && (
              <Stack spacing={1.25} sx={{ mt: 1.5 }}>
                <TextField label="Project Name" size="small" fullWidth sx={inputSx}
                  value={state.projectName} onChange={e => set('projectName', e.target.value)} />
                <TextField label="Description (optional)" size="small" fullWidth sx={inputSx}
                  value={state.projectDescription} onChange={e => set('projectDescription', e.target.value)} />
              </Stack>
            )}
          </Box>

          {/* Container runtime */}
          <Box>
            <Typography sx={{ fontFamily: FONT, fontSize: '.78rem', fontWeight: 700, color: T.textSecondary, mb: 1 }}>
              Container Runtime
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.25 }}>
              {containerRuntimes.map(rt => (
                <SelectCard key={rt.id} selected={state.containerRuntime === rt.id as ContainerRuntime}
                  onClick={() => set('containerRuntime', rt.id as ContainerRuntime)}
                  title={rt.label}
                  icon={<TerminalIcon sx={{ fontSize: '1rem' }} />} />
              ))}
            </Box>
          </Box>

          {/* Container template */}
          <Box>
            <Typography sx={{ fontFamily: FONT, fontSize: '.78rem', fontWeight: 700, color: T.textSecondary, mb: 1 }}>
              Container Template
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 1 }}>
              {containerTemplates.map(tpl => {
                const _resolvedImage = tpl.id === 'custom'
                  ? (state.customImageUrl.trim() || 'enter image below')
                  : tpl.image
                return (
                  <SelectCard key={tpl.id} selected={state.containerTemplate === tpl.id}
                    onClick={() => set('containerTemplate', tpl.id)}
                    title={tpl.label}
                    subtitle={tpl.image ? tpl.image : 'custom registry'}
                    badge={tpl.image ? 'Pull' : undefined}
                  />
                )
              })}
            </Box>

            {/* Custom image URL input */}
            {state.containerTemplate === 'custom' && (
              <TextField
                label="Image URL" placeholder="registry.example.com/image:tag"
                value={state.customImageUrl}
                onChange={e => set('customImageUrl', e.target.value)}
                size="small" fullWidth sx={{ mt: 1.5, ...inputSx }}
                helperText="Full image reference — will be pulled from the registry on provision."
                FormHelperTextProps={{ sx: { color: T.textSecondary, fontSize: '.72rem' } }}
              />
            )}

            {/* Image pull info box */}
            {state.containerTemplate && (() => {
              const selected = containerTemplates.find(t => t.id === state.containerTemplate)
              const imageToPull = state.containerTemplate === 'custom'
                ? state.customImageUrl.trim()
                : selected?.image
              if (!imageToPull) return null
              return (
                <Box sx={{ mt: 1.5, p: 1.5, borderRadius: '10px',
                  bgcolor: 'rgba(34,197,94,.07)', border: '1px solid rgba(34,197,94,.25)',
                  display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                  <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#22c55e', mt: .45, flexShrink: 0 }} />
                  <Box>
                    <Typography sx={{ fontFamily: FONT, fontSize: '.75rem', fontWeight: 700, color: '#22c55e' }}>
                      Image will be pulled on provision
                    </Typography>
                    <Typography sx={{ fontFamily: 'monospace', fontSize: '.72rem', color: T.textPrimary, mt: .2 }}>
                      {imageToPull}
                    </Typography>
                  </Box>
                </Box>
              )
            })()}
          </Box>
        </Stack>
      </Box>
    )

    // ── Step 6: Environment ───────────────────────────────────────────────────
    if (step === 6) return (
      <Box>
        <SectionHeading icon={<RocketLaunchIcon />} title="Environment"
          description="Attach an environment to your workspace, or create a new one." />
        <Stack spacing={2.5}>
          <Box sx={{ p: 2, borderRadius: '10px', bgcolor: T.surfaceSubtle, border: `1px solid ${T.border}` }}>
            <RadioGroup row value={state.environmentMode} onChange={e => set('environmentMode', e.target.value as any)}>
              {[['skip', 'No environment'], ['attach', 'Attach existing'], ['create', 'Create new']].map(([v, l]) => (
                <FormControlLabel key={v} value={v}
                  control={<Radio size="small" sx={{ color: T.textSecondary, '&.Mui-checked': { color: T.brandPrimary } }} />}
                  label={<Typography sx={{ fontFamily: FONT, fontSize: '.82rem', color: T.textPrimary }}>{l}</Typography>} />
              ))}
            </RadioGroup>

            {state.environmentMode === 'attach' && (
              <FormControl size="small" fullWidth sx={{ mt: 1.5, ...inputSx }}>
                <InputLabel>Select Environment</InputLabel>
                <Select label="Select Environment" value={state.environmentId}
                  onChange={e => set('environmentId', e.target.value)}>
                  {environments.map(e => <MenuItem key={e.id} value={String(e.id)}>{e.name}</MenuItem>)}
                  {environments.length === 0 && <MenuItem disabled>No environments found</MenuItem>}
                </Select>
              </FormControl>
            )}

            {state.environmentMode === 'create' && (
              <Stack spacing={1.25} sx={{ mt: 1.5 }}>
                <TextField label="Environment Name" size="small" fullWidth sx={inputSx}
                  value={state.environmentName} onChange={e => set('environmentName', e.target.value)} />
                <FormControl size="small" fullWidth sx={inputSx}>
                  <InputLabel>Type</InputLabel>
                  <Select label="Type" value={state.environmentType}
                    onChange={e => set('environmentType', e.target.value as any)}>
                    <MenuItem value="dev">Development</MenuItem>
                    <MenuItem value="stage">Staging</MenuItem>
                    <MenuItem value="prod">Production</MenuItem>
                  </Select>
                </FormControl>
                {state.projectMode === 'skip' && (
                  <Alert severity="warning" sx={{ fontSize: '.78rem' }}>
                    A project is required to create an environment. Go back to Step 5 and select or create a project.
                  </Alert>
                )}
              </Stack>
            )}
          </Box>
        </Stack>
      </Box>
    )

    // ── Step 7: Domain ────────────────────────────────────────────────────────
    if (step === 7) return (
      <Box>
        <SectionHeading icon={<LanguageIcon />} title="Domain Binding"
          description="Optionally bind a custom domain or auto-generate a subdomain for this workspace." />
        <Stack spacing={2.5}>
          <FormControlLabel
            control={<Switch checked={state.domainEnabled} onChange={e => set('domainEnabled', e.target.checked)}
              sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: T.brandPrimary },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: T.brandPrimary } }} />}
            label={<Typography sx={{ fontFamily: FONT, fontSize: '.85rem', color: T.textPrimary, fontWeight: 700 }}>
              Enable Domain Binding
            </Typography>}
          />

          {state.domainEnabled && (
            <Box sx={{ p: 2, borderRadius: '10px', bgcolor: T.surfaceSubtle, border: `1px solid ${T.border}` }}>
              <FormControlLabel sx={{ mb: 1.5 }}
                control={<Checkbox checked={state.autoSubdomain} onChange={e => set('autoSubdomain', e.target.checked)}
                  size="small" sx={{ color: T.textSecondary, '&.Mui-checked': { color: T.brandPrimary } }} />}
                label={<Typography sx={{ fontFamily: FONT, fontSize: '.82rem', color: T.textPrimary }}>
                  Auto-generate subdomain
                </Typography>}
              />

              {state.autoSubdomain ? (
                <Box sx={{ p: 1.5, borderRadius: '8px', bgcolor: T.surface, border: `1px dashed ${T.border}` }}>
                  <Typography sx={{ fontFamily: FONT, fontSize: '.72rem', color: T.textSecondary, mb: .25 }}>Generated domain</Typography>
                  <Typography sx={{ fontFamily: 'monospace', fontSize: '.88rem', color: T.brandPrimary }}>
                    {resolvedDomain || '(enter workspace name first)'}
                  </Typography>
                </Box>
              ) : (
                <TextField label="Custom Domain" placeholder="dev.example.com"
                  value={state.domain}
                  onChange={e => set('domain', e.target.value)}
                  size="small" fullWidth sx={inputSx}
                  helperText="Enter a domain you control — you'll need to add a DNS record after provisioning."
                  FormHelperTextProps={{ sx: { color: T.textSecondary, fontSize: '.72rem' } }} />
              )}
            </Box>
          )}

          {!state.domainEnabled && (
            <Box sx={{ p: 2, borderRadius: '10px', bgcolor: T.surfaceSubtle, border: `1px dashed ${T.border}` }}>
              <Typography sx={{ fontFamily: FONT, fontSize: '.8rem', color: T.textSecondary }}>
                Domain binding is optional. You can add a domain later from the workspace settings.
              </Typography>
            </Box>
          )}
        </Stack>
      </Box>
    )

    // ── Step 8: Review & Provision ────────────────────────────────────────────
    if (step === 8) {
      const selectedPlan = computePlans.find(p => p.vcpus === state.vcpus && p.ram_gb === state.ramGb)
      const selectedProject = state.projectMode === 'attach'
        ? projects.find(p => String(p.id) === state.projectId)
        : undefined
      const selectedEnv = state.environmentMode === 'attach'
        ? environments.find(e => String(e.id) === state.environmentId)
        : undefined

      return (
        <Box>
          <SectionHeading icon={<RocketLaunchIcon />} title="Review & Provision"
            description="Review your configuration. Click 'Provision Workspace' to launch." />

          <Stack spacing={1.5}>
            {/* Basics */}
            <Box sx={{ p: 2, borderRadius: '10px', bgcolor: T.surfaceSubtle, border: `1px solid ${T.border}` }}>
              <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '.75rem', color: T.textSecondary, textTransform: 'uppercase', letterSpacing: '.06em', mb: 1.25 }}>
                Workspace
              </Typography>
              <ReviewRow label="Name" value={state.displayName} />
              <ReviewRow label="ID" value={<Typography sx={{ fontFamily: 'monospace', fontSize: '.8rem', color: T.brandPrimary }}>{workspaceId}</Typography>} />
              <ReviewRow label="Region" value={regions.find(r => r.id === state.region)?.label ?? state.region} />
              <ReviewRow label="IDE" value={state.ide} />
            </Box>

            {/* Compute */}
            <Box sx={{ p: 2, borderRadius: '10px', bgcolor: T.surfaceSubtle, border: `1px solid ${T.border}` }}>
              <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '.75rem', color: T.textSecondary, textTransform: 'uppercase', letterSpacing: '.06em', mb: 1.25 }}>
                Compute
              </Typography>
              <ReviewRow label="Plan" value={selectedPlan?.label ?? 'Custom'} chip={selectedPlan?.price_hint} />
              <ReviewRow label="vCPU" value={`${state.vcpus} cores`} />
              <ReviewRow label="RAM" value={`${state.ramGb} GB`} />
              <ReviewRow label="GPU" value={state.gpuEnabled ? 'Enabled' : 'Disabled'} />
            </Box>

            {/* Database */}
            <Box sx={{ p: 2, borderRadius: '10px', bgcolor: T.surfaceSubtle, border: `1px solid ${T.border}` }}>
              <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '.75rem', color: T.textSecondary, textTransform: 'uppercase', letterSpacing: '.06em', mb: 1.25 }}>
                Database
              </Typography>
              {state.dbEngine === 'none' ? (
                <ReviewRow label="Database" value="None — skipped" />
              ) : (
                <>
                  <ReviewRow label="Engine" value={`${state.dbEngine.charAt(0).toUpperCase() + state.dbEngine.slice(1)} ${state.dbVersion}`} />
                  <ReviewRow label="Plan" value={`${state.dbPlan.charAt(0).toUpperCase() + state.dbPlan.slice(1)}`} />
                  {state.dbName && <ReviewRow label="Name" value={state.dbName} />}
                  {state.dbEngine !== 'sqlite' && <ReviewRow label="Storage" value={`${state.dbStorageGb} GB`} />}
                </>
              )}
            </Box>

            {/* Storage */}
            <Box sx={{ p: 2, borderRadius: '10px', bgcolor: T.surfaceSubtle, border: `1px solid ${T.border}` }}>
              <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '.75rem', color: T.textSecondary, textTransform: 'uppercase', letterSpacing: '.06em', mb: 1.25 }}>
                Storage
              </Typography>
              <ReviewRow label="Type" value={state.storageType === 'high-iops' ? 'High-IOPS SSD' : 'Standard SSD'} />
              <ReviewRow label="Size" value={`${state.storageGb} GB`} />
              <ReviewRow label="Backup" value={state.backupPolicy === 'none' ? 'None' : `${state.backupPolicy.charAt(0).toUpperCase() + state.backupPolicy.slice(1)}`} />
            </Box>

            {/* Network */}
            <Box sx={{ p: 2, borderRadius: '10px', bgcolor: T.surfaceSubtle, border: `1px solid ${T.border}` }}>
              <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '.75rem', color: T.textSecondary, textTransform: 'uppercase', letterSpacing: '.06em', mb: 1.25 }}>
                Network
              </Typography>
              <ReviewRow label="VPC" value={state.vpcName || '—'} />
              <ReviewRow label="Subnet" value={state.subnetName || '—'} />
              <ReviewRow label="Firewall" value={firewallProfiles.find(f => f.id === state.firewallProfile)?.label ?? state.firewallProfile} />
              <ReviewRow label="Public IP" value={state.publicIp ? 'Yes' : 'No'} />
            </Box>

            {/* Container */}
            <Box sx={{ p: 2, borderRadius: '10px', bgcolor: T.surfaceSubtle, border: `1px solid ${T.border}` }}>
              <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '.75rem', color: T.textSecondary, textTransform: 'uppercase', letterSpacing: '.06em', mb: 1.25 }}>
                Project & Container
              </Typography>
              <ReviewRow label="Project"
                value={state.projectMode === 'attach' ? (selectedProject?.name ?? state.projectId)
                     : state.projectMode === 'create' ? `New: ${state.projectName}` : 'None'} />
              <ReviewRow label="Runtime" value={containerRuntimes.find(r => r.id === state.containerRuntime)?.label ?? state.containerRuntime} />
              <ReviewRow label="Template" value={containerTemplates.find(t => t.id === state.containerTemplate)?.label ?? state.containerTemplate} />
              <ReviewRow label="Image" value={
                <Typography sx={{ fontFamily: 'monospace', fontSize: '.78rem', color: T.brandPrimary }}>
                  {state.containerTemplate === 'custom'
                    ? (state.customImageUrl.trim() || '—')
                    : (containerTemplates.find(t => t.id === state.containerTemplate)?.image || '—')}
                </Typography>
              } />
              <ReviewRow label="Pull on Provision" value="Yes — image will be fetched from registry" />
            </Box>

            {/* Environment */}
            <Box sx={{ p: 2, borderRadius: '10px', bgcolor: T.surfaceSubtle, border: `1px solid ${T.border}` }}>
              <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '.75rem', color: T.textSecondary, textTransform: 'uppercase', letterSpacing: '.06em', mb: 1.25 }}>
                Environment
              </Typography>
              <ReviewRow label="Environment"
                value={state.environmentMode === 'attach' ? (selectedEnv?.name ?? state.environmentId)
                     : state.environmentMode === 'create' ? `New: ${state.environmentName} (${state.environmentType})` : 'None'} />
            </Box>

            {/* Domain */}
            {state.domainEnabled && (
              <Box sx={{ p: 2, borderRadius: '10px', bgcolor: T.surfaceSubtle, border: `1px solid ${T.border}` }}>
                <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '.75rem', color: T.textSecondary, textTransform: 'uppercase', letterSpacing: '.06em', mb: 1.25 }}>
                  Domain
                </Typography>
                <ReviewRow label="Domain" value={resolvedDomain || '—'} />
              </Box>
            )}
          </Stack>
        </Box>
      )
    }

    return null
  }

  // ── Success screen ──────────────────────────────────────────────────────────
  if (done) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: T.surface, border: `1px solid ${T.border}`, borderRadius: '16px' } }}>
        <DialogContent sx={{ p: 4, textAlign: 'center' }}>
          <Box sx={{ mb: 2.5, display: 'flex', justifyContent: 'center' }}>
            <Box sx={{ width: 72, height: 72, borderRadius: '50%', bgcolor: 'rgba(34,197,94,.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircleIcon sx={{ fontSize: '2.5rem', color: S.success }} />
            </Box>
          </Box>
          <Typography sx={{ fontFamily: FONT, fontWeight: 800, fontSize: '1.15rem', color: T.textPrimary, mb: 1 }}>
            Workspace Provisioning Started
          </Typography>
          <Typography sx={{ fontFamily: FONT, fontSize: '.85rem', color: T.textSecondary, mb: 3 }}>
            <strong style={{ color: T.textPrimary }}>{done.display_name}</strong> is being provisioned.
            You'll be redirected to your workspace dashboard.
          </Typography>
          <Stack direction="row" spacing={1.5} justifyContent="center">
            <Button variant="outlined" onClick={onClose}
              sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px',
                    borderColor: T.border, color: T.textSecondary }}>
              Close
            </Button>
            <Button variant="contained" startIcon={<OpenInNewIcon sx={{ fontSize: '.95rem' }} />}
              onClick={handleOpenDashboard}
              sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px',
                    bgcolor: T.brandPrimary, '&:hover': { bgcolor: '#4f46e5' } }}>
              Open Dashboard
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>
    )
  }

  // ── Main wizard dialog ──────────────────────────────────────────────────────
  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: T.surface,
          border: `1px solid ${T.border}`,
          borderRadius: '16px',
          maxHeight: '92vh',
        },
      }}
    >
      <DialogTitle sx={{
        pb: 0,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      }}>
        <Box>
          <Typography sx={{ fontFamily: FONT, fontWeight: 800, fontSize: '1.05rem', color: T.textPrimary }}>
            Create New Workspace
          </Typography>
          <Typography sx={{ fontFamily: FONT, fontSize: '.78rem', color: T.textSecondary }}>
            Configure your development environment before provisioning.
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose} disabled={busy} sx={{ mt: .25 }}>
          <CloseIcon sx={{ fontSize: '1rem', color: T.textSecondary }} />
        </IconButton>
      </DialogTitle>

      {/* Stepper */}
      <Box sx={{ px: 3, pt: 2.5, pb: 1.5 }}>
        {catalogLoading && <LinearProgress sx={{ mb: 1.5, borderRadius: '4px', bgcolor: T.surfaceSubtle,
          '& .MuiLinearProgress-bar': { bgcolor: T.brandPrimary } }} />}
        <Stepper activeStep={step} alternativeLabel
          sx={{
            '& .MuiStepLabel-label': { fontFamily: FONT, fontSize: '.68rem', color: T.textSecondary },
            '& .MuiStepLabel-label.Mui-active': { color: T.brandPrimary, fontWeight: 700 },
            '& .MuiStepLabel-label.Mui-completed': { color: S.success },
            '& .MuiStepConnector-line': { borderColor: T.border },
            '& .MuiStepIcon-root': { color: T.surfaceSubtle, fontSize: '1.1rem' },
            '& .MuiStepIcon-root.Mui-active': { color: T.brandPrimary },
            '& .MuiStepIcon-root.Mui-completed': { color: S.success },
            '& .MuiStepIcon-text': { fontFamily: FONT, fontSize: '.55rem' },
          }}>
          {STEPS.map(label => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      <Divider sx={{ borderColor: T.border }} />

      {/* Content */}
      <DialogContent sx={{ px: 3, py: 2.5, overflowY: 'auto' }}>
        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2, fontSize: '.8rem' }}>
            {error}
          </Alert>
        )}
        {renderStep()}
      </DialogContent>

      <Divider sx={{ borderColor: T.border }} />

      {/* Navigation */}
      <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
        {/* Left: back + step counter */}
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Button onClick={handleBack} disabled={step === 0 || busy} variant="outlined"
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px',
                  borderColor: T.border, color: T.textSecondary,
                  '&:hover': { borderColor: T.brandPrimary, color: T.brandPrimary } }}>
            Back
          </Button>
          <Typography sx={{ fontFamily: FONT, fontSize: '.75rem', color: T.textSecondary }}>
            Step {step + 1} of {STEPS.length}
          </Typography>
        </Stack>

        {/* Right: next / provision */}
        {step < STEPS.length - 1 ? (
          <Button onClick={handleNext} variant="contained" disabled={busy}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px', px: 3,
                  bgcolor: T.brandPrimary, '&:hover': { bgcolor: '#4f46e5' } }}>
            Next
          </Button>
        ) : (
          <Button onClick={handleProvision} variant="contained" disabled={busy}
            startIcon={busy ? <CircularProgress size={14} sx={{ color: '#fff' }} />
              : <RocketLaunchIcon sx={{ fontSize: '1rem' }} />}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px', px: 3,
                  bgcolor: T.brandPrimary, '&:hover': { bgcolor: '#4f46e5' } }}>
            {busy ? 'Provisioning…' : 'Provision Workspace'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
