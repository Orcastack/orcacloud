// OrcaCloud – Compute / Deploy Server Page

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, Stack, Button, Chip,
  TextField,
  Stepper, Step, StepLabel, StepConnector,
  stepConnectorClasses,
  Divider, Paper, Alert, CircularProgress,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { useTheme } from '@mui/material/styles';
import CheckIcon          from '@mui/icons-material/Check';
import RocketLaunchIcon   from '@mui/icons-material/RocketLaunch';
import StorageIcon        from '@mui/icons-material/Storage';
import MemoryIcon         from '@mui/icons-material/Memory';
import SpeedIcon          from '@mui/icons-material/Speed';
import NetworkCheckIcon   from '@mui/icons-material/NetworkCheck';
import PublicIcon         from '@mui/icons-material/Public';
import LockIcon           from '@mui/icons-material/Lock';
import InfoOutlinedIcon   from '@mui/icons-material/InfoOutlined';
import {
  dashboardTokens,
  dashboardPrimaryButtonSx,
  dashboardSemanticColors,
  computeUiTokens,
} from '../styles/dashboardDesignSystem';
import { dashboardApi, serversApi } from '../services/cloudApi';
import { DeployDropdown } from '../components/deploy/DeployDropdown';
import type { CloudFlavor, CloudImage, CloudNetwork, WizardOptions } from '../types/cloud';

const COMPUTE_ACCENT = '#153d75';
const ACCENT_STRONG = computeUiTokens.accentStrong;
const WHITE = dashboardTokens.colors.white;
const BORDER = dashboardTokens.colors.border;
const MUTED = computeUiTokens.neutralMuted;
const TEXT_STRONG = computeUiTokens.neutralStrong;
const TEXT_BODY = computeUiTokens.neutralBody;

// ── Types ─────────────────────────────────────────────────────────────────────
interface OSVersion {
  id: string;
  version: string;
  badge?: string;
  badgeColor?: string;
}

interface OSGroup {
  groupId: string;
  family: string;
  name: string;
  logo: string;
  logoColor: string;
  description: string;
  badge?: string;
  badgeColor?: string;
  versions: OSVersion[];
}

interface FlavorCardView {
  id: string;
  name: string;
  vcpu: number;
  ram_gb: number;
  disk_gb: number;
  bandwidth_tb: number;
  price_mo: number;
  badge?: string;
  recommended?: boolean;
}

interface ImageLookup {
  id: string;
  name: string;
  version: string;
  logoColor: string;
}

const OS_TYPE_COLOR: Record<CloudImage['os_type'], string> = {
  linux: '#153d75',
  windows: '#0078d4',
  custom: '#6b7280',
};

function buildImageGroups(images: CloudImage[]): OSGroup[] {
  const groups = new Map<string, OSGroup>();

  images.forEach((image) => {
    const family = image.os_name || image.name;
    const groupId = family.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const existing = groups.get(groupId);
    const nextVersion: OSVersion = {
      id: image.image_id,
      version: image.os_version || image.name,
    };

    if (existing) {
      existing.versions.push(nextVersion);
      return;
    }

    groups.set(groupId, {
      groupId,
      family: image.os_type === 'windows' ? 'Windows' : image.os_type === 'custom' ? 'Custom' : 'Linux',
      name: family,
      logo: family.slice(0, 3),
      logoColor: OS_TYPE_COLOR[image.os_type],
      description: `${image.os_type === 'windows' ? 'Windows' : image.os_type === 'custom' ? 'Custom' : 'Linux'} image from live backend catalog`,
      versions: [nextVersion],
    });
  });

  return Array.from(groups.values()).sort((left, right) => left.name.localeCompare(right.name));
}

function buildImageLookup(groups: OSGroup[]): ImageLookup[] {
  return groups.flatMap((group) =>
    group.versions.map((version) => ({
      id: version.id,
      name: group.name,
      version: version.version,
      logoColor: group.logoColor,
    }))
  );
}

function buildFlavorViews(flavors: CloudFlavor[]): FlavorCardView[] {
  return flavors.map((flavor) => ({
    id: flavor.flavor_id,
    name: flavor.name,
    vcpu: flavor.vcpus,
    ram_gb: flavor.memory_mb / 1024,
    disk_gb: flavor.disk_gb,
    bandwidth_tb: 0,
    price_mo: Number(flavor.hourly_cost_usd || 0) * 730,
    badge: flavor.is_gpu ? 'GPU' : undefined,
    recommended: !flavor.is_gpu && flavor.vcpus >= 2 && flavor.vcpus <= 4,
  }));
}

// ── Styled stepper connector ──────────────────────────────────────────────────
const StepConnectorStyled = styled(StepConnector)(({ theme }) => ({
  [`&.${stepConnectorClasses.alternativeLabel}`]: { top: 16 },
  [`&.${stepConnectorClasses.active} .${stepConnectorClasses.line}`]: { borderColor: COMPUTE_ACCENT },
  [`&.${stepConnectorClasses.completed} .${stepConnectorClasses.line}`]: { borderColor: COMPUTE_ACCENT },
  [`& .${stepConnectorClasses.line}`]: {
    borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,.1)' : dashboardTokens.colors.border,
    borderTopWidth: 2,
  },
}));

const StepIconStyled = ({ active, completed, icon, isDark }: { active?: boolean; completed?: boolean; icon: React.ReactNode; isDark: boolean }) => (
  <Box sx={{
    width: 34, height: 34, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    bgcolor: completed ? COMPUTE_ACCENT : active ? COMPUTE_ACCENT : (isDark ? 'rgba(255,255,255,.08)' : dashboardTokens.colors.border),
    border: `2px solid ${active || completed ? COMPUTE_ACCENT : 'transparent'}`,
    transition: 'all .2s',
  }}>
    {completed
      ? <CheckIcon sx={{ fontSize: '.9rem', color: WHITE }} />
      : <Typography sx={{ fontSize: '.8rem', fontWeight: 700, color: active ? WHITE : (isDark ? 'rgba(255,255,255,.4)' : MUTED) }}>{icon}</Typography>
    }
  </Box>
);

// ── Section wrapper ───────────────────────────────────────────────────────────
function SSection({ title, subtitle, children, isDark }: { title: string; subtitle?: string; children: React.ReactNode; isDark: boolean }) {
  return (
    <Box mb={4}>
      <Typography fontWeight={800} fontSize="1rem" color={isDark ? dashboardTokens.colors.white : dashboardTokens.colors.textPrimary} mb={.25}>{title}</Typography>
      {subtitle && <Typography variant="body2" sx={{ color: isDark ? 'rgba(255,255,255,.5)' : dashboardTokens.colors.textSecondary, mb: 2 }}>{subtitle}</Typography>}
      {children}
    </Box>
  );
}

// ── OS card (with inline version dropdown) ──────────────────────────────────
function OSCard({ group, selectedVersionId, onSelect, isDark }: {
  group: OSGroup;
  selectedVersionId: string;
  onSelect: (id: string) => void;
  isDark: boolean;
}) {
  const border = isDark ? 'rgba(255,255,255,.08)' : BORDER;
  const textSec = isDark ? 'rgba(255,255,255,.45)' : MUTED;
  // The group is 'active' if any of its versions is the selected one
  const activeVer = group.versions.find(v => v.id === selectedVersionId);
  const isGroupActive = !!activeVer;
  // Local state: which version tab is highlighted (defaults to first version)
  const [hoveredVer, setHoveredVer] = useState<string>(group.versions[0].id);

  return (
    <Box sx={{
      borderRadius: '12px', overflow: 'hidden',
      border: `2px solid ${isGroupActive ? ACCENT_STRONG : border}`,
      bgcolor: isGroupActive
        ? isDark ? computeUiTokens.accentSoftDark : computeUiTokens.accentSoftLight
        : isDark ? 'rgba(255,255,255,.03)' : computeUiTokens.surfaceSubtle,
      transition: 'border-color .12s',
      '&:hover': { borderColor: isGroupActive ? ACCENT_STRONG : isDark ? 'rgba(255,255,255,.22)' : computeUiTokens.borderHover },
    }}>
      {/* ── Header row ── */}
      <Box sx={{ p: '14px 14px 10px', display: 'flex', alignItems: 'flex-start', gap: 1.25 }}>
        <Box sx={{ width: 40, height: 40, borderRadius: '9px', bgcolor: `${group.logoColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Typography sx={{ fontFamily: 'monospace', fontSize: '.72rem', fontWeight: 800, color: group.logoColor }}>{group.logo}</Typography>
        </Box>
        <Box flex={1} minWidth={0}>
          <Box display="flex" alignItems="center" gap={.6} flexWrap="wrap">
            <Typography fontWeight={700} fontSize=".9rem" color={isDark ? WHITE : TEXT_STRONG}>{group.name}</Typography>
            {group.badge && (
              <Chip size="small" label={group.badge} sx={{ height: 14, fontSize: '.58rem', fontWeight: 700, bgcolor: `${group.badgeColor}18`, color: group.badgeColor }} />
            )}
            {isGroupActive && (
              <Box sx={{ ml: 'auto', width: 18, height: 18, bgcolor: ACCENT_STRONG, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <CheckIcon sx={{ fontSize: '.7rem', color: WHITE }} />
              </Box>
            )}
          </Box>
          <Typography variant="caption" sx={{ color: textSec, lineHeight: 1.4, display: 'block', mt: .25 }}>
            {group.description}
          </Typography>
        </Box>
      </Box>

      {/* ── Version pills ── */}
      <Box sx={{ px: 1.5, pb: 1.5, display: 'flex', gap: .6, flexWrap: 'wrap' }}>
        {group.versions.map(v => {
          const isSelected = v.id === selectedVersionId;
          const isHovered  = v.id === hoveredVer;
          return (
            <Box
              key={v.id}
              onClick={e => { e.stopPropagation(); onSelect(v.id); }}
              onMouseEnter={() => !activeVer && setHoveredVer(v.id)}
              sx={{
                display: 'flex', alignItems: 'center', gap: .5,
                px: 1.25, py: .45, borderRadius: '20px', cursor: 'pointer',
                border: `1.5px solid ${
                  isSelected
                    ? ACCENT_STRONG
                    : isHovered && !activeVer
                      ? isDark ? 'rgba(255,255,255,.25)' : computeUiTokens.borderHover
                      : border
                }`,
                bgcolor: isSelected
                  ? ACCENT_STRONG
                  : isHovered && !activeVer
                    ? isDark ? 'rgba(255,255,255,.06)' : computeUiTokens.accentSoftLight
                    : 'transparent',
                transition: 'all .1s',
              }}
            >
              <Typography sx={{
                fontSize: '.72rem', fontWeight: isSelected ? 700 : 500, lineHeight: 1,
                color: isSelected ? WHITE : isDark ? 'rgba(255,255,255,.8)' : TEXT_BODY,
              }}>
                {v.version}
              </Typography>
              {v.badge && (
                <Chip size="small" label={v.badge}
                  sx={{ height: 13, fontSize: '.55rem', fontWeight: 700, pointerEvents: 'none',
                    bgcolor: isSelected ? 'rgba(255,255,255,.2)' : `${v.badgeColor}18`,
                    color: isSelected ? WHITE : v.badgeColor,
                  }} />
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

// ── Flavor card ───────────────────────────────────────────────────────────────
function FlavorCard({ fl, selected, onClick, isDark }: { fl: FlavorCardView; selected: boolean; onClick: () => void; isDark: boolean }) {
  const border = isDark ? 'rgba(255,255,255,.08)' : BORDER;
  return (
    <Box onClick={onClick} sx={{
      p: 2, cursor: 'pointer', borderRadius: '10px', position: 'relative',
      border: `2px solid ${selected ? ACCENT_STRONG : border}`,
      bgcolor: selected ? (isDark ? computeUiTokens.accentSoftDark : computeUiTokens.accentSoftLight) : (isDark ? 'rgba(255,255,255,.03)' : computeUiTokens.surfaceSubtle),
      transition: 'all .12s',
      '&:hover': { border: `2px solid ${selected ? ACCENT_STRONG : (isDark ? 'rgba(255,255,255,.2)' : computeUiTokens.borderHover)}` },
    }}>
      {fl.recommended && (
        <Chip size="small" label="Recommended" sx={{ position: 'absolute', top: 8, right: 8, height: 16, fontSize: '.6rem', fontWeight: 700, bgcolor: computeUiTokens.successSoft, color: computeUiTokens.successStrong }} />
      )}
      {fl.badge && !fl.recommended && (
        <Chip size="small" label={fl.badge} sx={{ position: 'absolute', top: 8, right: 8, height: 16, fontSize: '.6rem', fontWeight: 700, bgcolor: computeUiTokens.violetSoft, color: ACCENT_STRONG }} />
      )}
      {selected && (
        <Box sx={{ position: 'absolute', top: 8, left: 8, width: 18, height: 18, bgcolor: ACCENT_STRONG, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CheckIcon sx={{ fontSize: '.72rem', color: WHITE }} />
        </Box>
      )}
      <Box textAlign="center" mb={1.25} mt={selected ? .5 : 0}>
        <Typography fontWeight={800} fontSize="1rem" color={isDark ? WHITE : TEXT_STRONG}>{fl.name}</Typography>
        <Typography fontWeight={800} fontSize="1.4rem" color={ACCENT_STRONG}>${fl.price_mo}<Typography component="span" variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,.4)' : MUTED }}>/mo</Typography></Typography>
      </Box>
      <Divider sx={{ borderColor: isDark ? 'rgba(255,255,255,.07)' : dashboardTokens.colors.surfaceHover, mb: 1.25 }} />
      <Stack spacing={.6}>
        {[
          { icon: <SpeedIcon sx={{ fontSize: '.88rem' }} />,       label: `${fl.vcpu} vCPU${fl.vcpu > 1 ? 's' : ''}` },
          { icon: <MemoryIcon sx={{ fontSize: '.88rem' }} />,      label: `${fl.ram_gb < 1 ? `${fl.ram_gb * 1024} MB` : `${fl.ram_gb} GB`} RAM` },
          { icon: <StorageIcon sx={{ fontSize: '.88rem' }} />,     label: `${fl.disk_gb} GB NVMe SSD` },
          { icon: <NetworkCheckIcon sx={{ fontSize: '.88rem' }} />,label: fl.bandwidth_tb > 0 ? `${fl.bandwidth_tb} TB transfer` : 'Bandwidth depends on backend policy' },
        ].map(row => (
          <Box key={row.label} display="flex" alignItems="center" gap={.75}>
            <Box sx={{ color: isDark ? 'rgba(255,255,255,.4)' : MUTED }}>{row.icon}</Box>
            <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,.7)' : TEXT_BODY, fontWeight: 500 }}>{row.label}</Typography>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}

// ── Step 1 — Choose Image ─────────────────────────────────────────────────────
function StepImage({ selectedOS, onSelect, groups, isDark }: { selectedOS: string; onSelect: (id: string) => void; groups: OSGroup[]; isDark: boolean }) {
  const [tab,    setTab]    = useState<'debian' | 'other' | 'windows'>('debian');
  const [search, setSearch] = useState('');
  const border = isDark ? 'rgba(255,255,255,.08)' : BORDER;

  const matchSearch = (g: OSGroup) =>
    !search ||
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    g.versions.some(v => v.version.toLowerCase().includes(search.toLowerCase()));

  const linuxGroups = groups.filter(g => g.family === 'Linux' && matchSearch(g));
  const otherGroups = groups.filter(g => g.family === 'Custom' && matchSearch(g));
  const winGroups   = groups.filter(g => g.family === 'Windows' && matchSearch(g));

  const visibleGroups = tab === 'debian' ? linuxGroups : tab === 'windows' ? winGroups : otherGroups;

  const TABS: { key: typeof tab; label: string; count: number }[] = [
    { key: 'debian',  label: 'Linux Images',  count: linuxGroups.length   },
    { key: 'other',   label: 'Custom Images', count: otherGroups.length },
    { key: 'windows', label: 'Windows',       count: winGroups.length   },
  ];

  return (
    <SSection title="Select an Operating System" subtitle="Choose the base image for your server. All images are pre-hardened and include cloud-init." isDark={isDark}>
      {/* Search */}
      <TextField size="small" placeholder="Search distros or versions…" value={search} onChange={e => setSearch(e.target.value)}
        sx={{ mb: 2.5, width: 260, '& .MuiOutlinedInput-root': { bgcolor: isDark ? 'rgba(255,255,255,.05)' : dashboardTokens.colors.surfaceSubtle, borderRadius: '8px', '& fieldset': { borderColor: border } }, '& .MuiInputBase-input': { color: isDark ? WHITE : TEXT_STRONG, fontSize: '.85rem' } }} />

      {/* Tabs */}
      <Box display="flex" gap={.75} mb={2.5} flexWrap="wrap">
        {TABS.map(t => (
          <Box key={t.key} onClick={() => setTab(t.key)} sx={{
            display: 'flex', alignItems: 'center', gap: .6, px: 1.5, py: .6, borderRadius: '8px', cursor: 'pointer',
            bgcolor: tab === t.key ? ACCENT_STRONG : isDark ? 'rgba(255,255,255,.07)' : dashboardTokens.colors.surfaceHover,
            border: `1.5px solid ${tab === t.key ? ACCENT_STRONG : border}`,
            transition: 'all .12s',
          }}>
            <Typography sx={{ fontSize: '.78rem', fontWeight: tab === t.key ? 700 : 500, color: tab === t.key ? WHITE : isDark ? 'rgba(255,255,255,.7)' : TEXT_BODY }}>{t.label}</Typography>
            <Box sx={{ px: .6, py: .1, borderRadius: '10px', bgcolor: tab === t.key ? 'rgba(255,255,255,.2)' : isDark ? 'rgba(255,255,255,.1)' : dashboardTokens.colors.border, minWidth: 20, textAlign: 'center' }}>
              <Typography sx={{ fontSize: '.62rem', fontWeight: 700, color: tab === t.key ? WHITE : isDark ? 'rgba(255,255,255,.55)' : dashboardTokens.colors.textSecondary }}>{t.count}</Typography>
            </Box>
          </Box>
        ))}
      </Box>

      {/* Grid */}
      {visibleGroups.length > 0 ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 1.5 }}>
          {visibleGroups.map(g => (
            <OSCard key={g.groupId} group={g} selectedVersionId={selectedOS} onSelect={onSelect} isDark={isDark} />
          ))}
        </Box>
      ) : (
        <Box textAlign="center" py={5}>
          <Typography sx={{ color: isDark ? 'rgba(255,255,255,.3)' : MUTED }}>No images match your search</Typography>
        </Box>
      )}
    </SSection>
  );
}

// ── Step 2 — Choose Flavor ────────────────────────────────────────────────────
function StepFlavor({ selectedFlavor, onSelect, flavors, isDark }: { selectedFlavor: string; onSelect: (id: string) => void; flavors: FlavorCardView[]; isDark: boolean }) {
  return (
    <SSection title="Choose a Plan" subtitle="Pick the CPU, memory and storage configuration for your server." isDark={isDark}>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 1.5 }}>
        {flavors.map(fl => <FlavorCard key={fl.id} fl={fl} selected={selectedFlavor === fl.id} onClick={() => onSelect(fl.id)} isDark={isDark} />)}
      </Box>
    </SSection>
  );
}

// ── Step 3 — Network & Name ───────────────────────────────────────────────────
function StepNetwork({ config, networks, onChange, isDark }: {
  config: { hostname: string; networkId: string; network: 'public' | 'private' | 'both'; sshKey: string; password: string; backups: boolean; ipv6: boolean };
  networks: CloudNetwork[];
  onChange: (k: string, v: string | boolean) => void;
  isDark: boolean;
}) {
  const border = isDark ? 'rgba(255,255,255,.08)' : BORDER;
  const textSec = isDark ? 'rgba(255,255,255,.5)' : MUTED;

  const inp = {
    '& .MuiOutlinedInput-root': { bgcolor: isDark ? 'rgba(255,255,255,.05)' : dashboardTokens.colors.surfaceSubtle, borderRadius: '8px', '& fieldset': { borderColor: border }, '&:hover fieldset': { borderColor: ACCENT_STRONG } },
    '& .MuiInputLabel-root': { color: textSec },
    '& .MuiInputBase-input': { color: isDark ? WHITE : TEXT_STRONG, fontSize: '.88rem' },
  };

  return (
    <>
      <SSection title="Server Name" subtitle="Give your server a hostname. Only lowercase letters, numbers and hyphens." isDark={isDark}>
        <TextField fullWidth size="small" label="Hostname" value={config.hostname} onChange={e => onChange('hostname', e.target.value)}
          placeholder="my-web-server" sx={inp} />
      </SSection>

      <SSection title="Choose Network" subtitle="Select one of your live VPC networks from the backend." isDark={isDark}>
        {networks.length > 0 ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 1 }}>
          {networks.map(network => (
            <Box key={network.id} onClick={() => onChange('networkId', network.id)} sx={{
              display: 'flex', alignItems: 'center', gap: 1.25, p: 1.5, borderRadius: '10px', cursor: 'pointer',
              border: `2px solid ${config.networkId === network.id ? ACCENT_STRONG : border}`,
              bgcolor: config.networkId === network.id ? (isDark ? computeUiTokens.accentSoftDark : computeUiTokens.accentSoftLight) : (isDark ? 'rgba(255,255,255,.03)' : computeUiTokens.surfaceSubtle),
              transition: 'all .12s',
            }}>
              <Box>
                <Typography fontWeight={600} fontSize=".82rem" color={isDark ? WHITE : TEXT_STRONG}>{network.name || network.id}</Typography>
                <Typography variant="caption" sx={{ color: textSec }}>{network.id}</Typography>
              </Box>
              {config.networkId === network.id && <CheckIcon sx={{ ml: 'auto', fontSize: '.9rem', color: ACCENT_STRONG }} />}
            </Box>
          ))}
        </Box>
        ) : (
          <Alert severity="info" sx={{ borderRadius: '8px' }}>
            No live networks are available for this account yet. Create a VPC first, then return to deploy a server.
          </Alert>
        )}
      </SSection>

      <SSection title="Network Type" isDark={isDark}>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
          {([
            { id: 'public',  icon: <PublicIcon />, label: 'Public',  desc: 'Assign a public IPv4 address' },
            { id: 'private', icon: <LockIcon />,   label: 'Private', desc: 'VPC-only, no public IP' },
            { id: 'both',    icon: <NetworkCheckIcon />, label: 'Public + Private', desc: 'Dual-homed server' },
          ] as const).map(opt => (
            <Box key={opt.id} onClick={() => onChange('network', opt.id)} sx={{
              p: 1.5, borderRadius: '10px', cursor: 'pointer', textAlign: 'center',
              border: `2px solid ${config.network === opt.id ? ACCENT_STRONG : border}`,
              bgcolor: config.network === opt.id ? (isDark ? computeUiTokens.accentSoftDark : computeUiTokens.accentSoftLight) : (isDark ? 'rgba(255,255,255,.03)' : computeUiTokens.surfaceSubtle),
            }}>
              <Box sx={{ color: config.network === opt.id ? ACCENT_STRONG : textSec, mb: .5 }}>{opt.icon}</Box>
              <Typography fontWeight={700} fontSize=".82rem" color={isDark ? WHITE : TEXT_STRONG}>{opt.label}</Typography>
              <Typography variant="caption" sx={{ color: textSec }}>{opt.desc}</Typography>
            </Box>
          ))}
        </Box>
      </SSection>

      <SSection title="Authentication" isDark={isDark}>
        <TextField fullWidth size="small" label="SSH Public Key" multiline rows={3} value={config.sshKey} onChange={e => onChange('sshKey', e.target.value)}
          placeholder="ssh-rsa AAAA…" sx={{ ...inp, mb: 1.5 }} />
        <TextField fullWidth size="small" label="Root password (optional)" type="password" value={config.password} onChange={e => onChange('password', e.target.value)}
          sx={inp} />
      </SSection>

      <SSection title="Add-ons" isDark={isDark}>
        <Stack spacing={1}>
          {([
            { key: 'backups', label: 'Automated Backups', desc: 'Daily snapshots (+20% of server cost)' },
            { key: 'ipv6',    label: 'IPv6',               desc: 'Free IPv6 address assignment' },
          ] as const).map(opt => (
            <Box key={opt.key} onClick={() => onChange(opt.key, !config[opt.key])} sx={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.75, borderRadius: '10px', cursor: 'pointer',
              border: `2px solid ${config[opt.key] ? ACCENT_STRONG : border}`,
              bgcolor: config[opt.key] ? (isDark ? computeUiTokens.accentSoftDark : computeUiTokens.accentSoftLight) : 'transparent',
            }}>
              <Box>
                <Typography fontWeight={600} fontSize=".88rem" color={isDark ? WHITE : TEXT_STRONG}>{opt.label}</Typography>
                <Typography variant="caption" sx={{ color: textSec }}>{opt.desc}</Typography>
              </Box>
              <Box sx={{ width: 22, height: 22, borderRadius: '50%', bgcolor: config[opt.key] ? ACCENT_STRONG : (isDark ? 'rgba(255,255,255,.1)' : BORDER), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {config[opt.key] && <CheckIcon sx={{ fontSize: '.75rem', color: WHITE }} />}
              </Box>
            </Box>
          ))}
        </Stack>
      </SSection>
    </>
  );
}

// ── Step 4 — Review ───────────────────────────────────────────────────────────
function StepReview({ osId, flavorId, netConfig, osFlat, flavors, networks, isDark }: {
  osId: string; flavorId: string;
  netConfig: { hostname: string; networkId: string; network: string; sshKey: string; password: string; backups: boolean; ipv6: boolean };
  osFlat: ImageLookup[];
  flavors: FlavorCardView[];
  networks: CloudNetwork[];
  isDark: boolean;
}) {
  const os     = osFlat.find(o => o.id === osId);
  const fl     = flavors.find(f => f.id === flavorId);
  const network = networks.find(item => item.id === netConfig.networkId);
  const border = isDark ? 'rgba(255,255,255,.08)' : BORDER;
  const textSec = isDark ? 'rgba(255,255,255,.5)' : MUTED;

  const rows: [string, string][] = [
    ['Hostname',     netConfig.hostname    || '(not set)'],
    ['OS Image',     os ? `${os.name} ${os.version}` : '—'],
    ['Network',      network ? network.name || network.id : '—'],
    ['Plan',         fl ? `${fl.name} · ${fl.vcpu} vCPU · ${fl.ram_gb < 1 ? fl.ram_gb * 1024 + ' MB' : fl.ram_gb + ' GB'} RAM · ${fl.disk_gb} GB SSD` : '—'],
    ['Exposure',     netConfig.network],
    ['Backups',      netConfig.backups ? 'Enabled' : 'Disabled'],
    ['IPv6',         netConfig.ipv6    ? 'Enabled' : 'Disabled'],
    ['SSH Key',      netConfig.sshKey  ? 'OK Provided'  : 'None'],
    ['Root password',netConfig.password? 'OK Set'        : 'None'],
  ];

  const monthlyCost = (fl?.price_mo ?? 0) * (netConfig.backups ? 1.2 : 1);
  const hourlyCost  = monthlyCost / 730;

  return (
    <SSection title="Review Configuration" subtitle="Confirm everything looks correct before deploying." isDark={isDark}>
      <Paper elevation={0} sx={{ border: `1px solid ${border}`, borderRadius: '12px', overflow: 'hidden', bgcolor: isDark ? computeUiTokens.darkPanel : dashboardTokens.colors.surface, mb: 2.5 }}>
        {rows.map(([k, v], i) => (
          <Box key={k} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2.5, py: 1.25, borderBottom: i < rows.length - 1 ? `1px solid ${isDark ? 'rgba(255,255,255,.05)' : dashboardTokens.colors.surfaceSubtle}` : 'none' }}>
            <Typography variant="body2" sx={{ color: textSec, fontWeight: 500 }}>{k}</Typography>
            <Typography variant="body2" fontWeight={700} color={isDark ? WHITE : TEXT_STRONG} textAlign="right" sx={{ maxWidth: '60%' }}>{v}</Typography>
          </Box>
        ))}
      </Paper>
      <Box sx={{ p: 2.5, bgcolor: isDark ? 'rgba(24,54,106,.15)' : 'rgba(24,54,106,.04)', borderRadius: '12px', border: `1px solid ${isDark ? 'rgba(24,54,106,.3)' : 'rgba(24,54,106,.12)'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography fontWeight={700} fontSize="1.3rem" color={isDark ? WHITE : TEXT_STRONG}>
            ${monthlyCost.toFixed(2)}<Typography component="span" variant="caption" sx={{ color: textSec }}>/month</Typography>
          </Typography>
          <Typography variant="caption" sx={{ color: textSec }}>~${hourlyCost.toFixed(4)}/hour · billed hourly</Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={1}>
          <InfoOutlinedIcon sx={{ fontSize: '.9rem', color: textSec }} />
          <Typography variant="caption" sx={{ color: textSec }}>Server will be online within ~45 seconds of deployment.</Typography>
        </Box>
      </Box>
    </SSection>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
const STEPS = ['Choose Image', 'Choose Plan', 'Network & Name', 'Review & Deploy'];

const ComputePage: React.FC = () => {
  const theme  = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [wizardOptions, setWizardOptions] = useState<WizardOptions | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  const [activeStep, setActiveStep] = useState(0);
  const [selectedOS,      setOS]      = useState('');
  const [selectedFlavor,  setFlavor]  = useState('');
  const [deploying,       setDeploy]  = useState(false);
  const [deployed,        setDeployed]= useState(false);
  const [deployError,     setDeployError] = useState('');
  const [netConfig, setNet] = useState({
    hostname: '', networkId: '',
    network: 'public' as 'public' | 'private' | 'both',
    sshKey: '', password: '', backups: false, ipv6: true,
  });

  const osGroups = useMemo(() => buildImageGroups(wizardOptions?.images ?? []), [wizardOptions]);
  const osFlat = useMemo(() => buildImageLookup(osGroups), [osGroups]);
  const flavorViews = useMemo(() => buildFlavorViews(wizardOptions?.flavors ?? []), [wizardOptions]);

  const loadWizardOptions = useCallback(async () => {
    setCatalogLoading(true);
    setCatalogError('');
    try {
      const response = await dashboardApi.getWizardOptions();
      const nextOptions = response.data;
      setWizardOptions(nextOptions);
      setOS((current) => current || nextOptions.images[0]?.image_id || '');
      setFlavor((current) => current || nextOptions.flavors[0]?.flavor_id || '');
      setNet((current) => ({
        ...current,
        networkId: current.networkId || nextOptions.networks[0]?.id || '',
      }));
    } catch {
      setCatalogError('Live compute catalog is unavailable. Connect images, flavors, and networks in the backend before using this deploy flow.');
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWizardOptions();
  }, [loadWizardOptions]);

  const border = isDark ? 'rgba(255,255,255,.08)' : BORDER;

  const canNext = () => {
    if (activeStep === 0) return !!selectedOS;
    if (activeStep === 1) return !!selectedFlavor;
    if (activeStep === 2) return netConfig.hostname.trim().length > 0 && !!netConfig.networkId;
    return true;
  };

  const handleDeploy = async () => {
    setDeploy(true);
    setDeployError('');
    try {
      await serversApi.create({
        name:    netConfig.hostname,
        image:   selectedOS,
        flavor:  selectedFlavor,
        network: netConfig.networkId || undefined,
        key_name: netConfig.sshKey || undefined,
      });
      setDeployed(true);
    } catch (err: any) {
      setDeployError(err?.response?.data?.detail || err?.response?.data?.name?.[0] || 'Deployment failed. Please try again.');
    } finally {
      setDeploy(false);
    }
  };

  const handleNet = (k: string, v: string | boolean) =>
    setNet(n => ({ ...n, [k]: v }));

  // selected items for price bar
  const fl     = flavorViews.find(f => f.id === selectedFlavor);
  const os     = osFlat.find(o => o.id === selectedOS);
  const monthlyCost = (fl?.price_mo ?? 0) * (netConfig.backups ? 1.2 : 1);

  if (deployed) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: dashboardTokens.colors.background, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box textAlign="center" maxWidth={480} px={3}>
          <Box sx={{ width: 72, height: 72, bgcolor: 'rgba(16,185,129,.12)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2.5 }}>
            <RocketLaunchIcon sx={{ fontSize: '2rem', color: dashboardSemanticColors.success }} />
          </Box>
          <Typography fontWeight={800} fontSize="1.5rem" color={isDark ? dashboardTokens.colors.white : dashboardTokens.colors.textPrimary} mb={.75}>Server Deployed!</Typography>
          <Typography variant="body2" sx={{ color: isDark ? 'rgba(255,255,255,.5)' : dashboardTokens.colors.textSecondary, mb: 3 }}>
            <strong style={{ color: isDark ? dashboardTokens.colors.white : dashboardTokens.colors.textPrimary }}>{netConfig.hostname || 'your-server'}</strong> is provisioning and will be ready in ~45 seconds.
          </Typography>
          <Button variant="contained" onClick={() => { setDeployed(false); setActiveStep(0); setOS(wizardOptions?.images[0]?.image_id || ''); setFlavor(wizardOptions?.flavors[0]?.flavor_id || ''); setNet({ hostname: '', networkId: wizardOptions?.networks[0]?.id || '', network: 'public', sshKey: '', password: '', backups: false, ipv6: true }); }}
            sx={dashboardPrimaryButtonSx}>
            Deploy Another Server
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: dashboardTokens.colors.background }}>
      {/* Header */}
      <Box sx={{ bgcolor: dashboardTokens.colors.surface, borderBottom: `1px solid ${dashboardTokens.colors.border}`, px: { xs: 2, md: 4 }, py: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
        <Box>
          <Typography fontWeight={700} fontSize="1.25rem" color={dashboardTokens.colors.textPrimary}>Cloud Compute</Typography>
          <Typography variant="body2" sx={{ color: dashboardTokens.colors.textSecondary, mt: .25 }}>
            Cloud compute instances sourced from the live backend catalog
          </Typography>
        </Box>
        <DeployDropdown />
      </Box>

      {/* Stepper */}
      <Box sx={{ bgcolor: dashboardTokens.colors.surface, borderBottom: `1px solid ${dashboardTokens.colors.border}`, px: { xs: 2, md: 4 }, py: 2.5 }}>
        <Stepper activeStep={activeStep} alternativeLabel connector={<StepConnectorStyled />}>
          {STEPS.map((label, i) => (
            <Step key={label} completed={i < activeStep}>
              <StepLabel StepIconComponent={({ active, completed }) =>
                <StepIconStyled active={active} completed={completed} icon={i + 1} isDark={isDark} />
              }>
                <Typography sx={{ fontSize: '.8rem', fontWeight: activeStep === i ? 700 : 400, color: activeStep === i ? '#153d75' : dashboardTokens.colors.textTertiary }}>
                  {label}
                </Typography>
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      {/* Main layout: form + summary sidebar */}
      <Box sx={{ display: 'flex', gap: 0, alignItems: 'flex-start' }}>
        {/* Form area */}
        <Box sx={{ flex: 1, overflowY: 'auto', px: { xs: 2, md: 4 }, py: 3.5 }}>
          {catalogLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress size={32} sx={{ color: COMPUTE_ACCENT }} /></Box>
          ) : catalogError ? (
            <Alert severity="warning" sx={{ borderRadius: '8px' }}>{catalogError}</Alert>
          ) : (
            <>
              {activeStep === 0 && <StepImage selectedOS={selectedOS} onSelect={setOS} groups={osGroups} isDark={isDark} />}
              {activeStep === 1 && <StepFlavor selectedFlavor={selectedFlavor} onSelect={setFlavor} flavors={flavorViews} isDark={isDark} />}
              {activeStep === 2 && <StepNetwork config={netConfig} onChange={handleNet} networks={wizardOptions?.networks ?? []} isDark={isDark} />}
              {activeStep === 3 && <StepReview osId={selectedOS} flavorId={selectedFlavor} netConfig={netConfig} osFlat={osFlat} flavors={flavorViews} networks={wizardOptions?.networks ?? []} isDark={isDark} />}
            </>
          )}
        </Box>

        {/* Sticky summary sidebar */}
        <Box sx={{ width: 290, flexShrink: 0, borderLeft: `1px solid ${dashboardTokens.colors.border}`, p: 2.5, position: 'sticky', top: 0, alignSelf: 'flex-start', bgcolor: dashboardTokens.colors.surface, minHeight: 'calc(100vh - 88px - 80px)' }}>
          <Typography fontWeight={800} fontSize=".9rem" color={dashboardTokens.colors.textPrimary} mb={1.75}>Summary</Typography>
          <Stack spacing={1.25}>
            {[
              { label: 'Image',  value: os ? `${os.name} ${os.version}` : '—', color: os?.logoColor },
              { label: 'Plan',   value: fl ? `${fl.name} · $${fl.price_mo}/mo` : '—' },
              { label: 'Network', value: wizardOptions?.networks.find(network => network.id === netConfig.networkId)?.name ?? '—' },
              { label: 'Host',   value: netConfig.hostname || '—' },
            ].map(row => (
              <Box key={row.label} sx={{ p: 1.25, bgcolor: isDark ? 'rgba(255,255,255,.04)' : dashboardTokens.colors.surfaceSubtle, borderRadius: '8px', border: `1px solid ${border}` }}>
                <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,.4)' : dashboardTokens.colors.textTertiary, fontWeight: 600, display: 'block', mb: .25 }}>{row.label}</Typography>
                <Typography variant="body2" fontWeight={700} color={isDark ? dashboardTokens.colors.white : dashboardTokens.colors.textPrimary} noWrap>{row.value}</Typography>
              </Box>
            ))}
          </Stack>

          <Divider sx={{ my: 2, borderColor: isDark ? 'rgba(255,255,255,.07)' : dashboardTokens.colors.surfaceHover }} />

          <Box sx={{ p: 1.5, bgcolor: isDark ? 'rgba(24,54,106,.15)' : 'rgba(24,54,106,.05)', borderRadius: '10px', mb: 2 }}>
            <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,.4)' : dashboardTokens.colors.textTertiary }}>Estimated cost</Typography>
            <Typography fontWeight={800} fontSize="1.2rem" color={COMPUTE_ACCENT}>${monthlyCost.toFixed(2)}<Typography component="span" variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,.4)' : dashboardTokens.colors.textTertiary }}>/mo</Typography></Typography>
            <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,.3)' : dashboardTokens.colors.textTertiary }}>${(monthlyCost / 730).toFixed(4)}/hour</Typography>
          </Box>

          {/* Nav buttons */}
          <Stack spacing={1}>
            {activeStep < STEPS.length - 1 ? (
              <Button fullWidth variant="contained" disabled={!canNext()} onClick={() => setActiveStep(s => s + 1)}
                sx={{ ...dashboardPrimaryButtonSx, py: 1.25 }}>
                Continue →
              </Button>
            ) : (
              <>
                <Button fullWidth variant="contained" disabled={!canNext() || deploying || !!catalogError}
                  onClick={handleDeploy}
                  sx={{ bgcolor: computeUiTokens.successStrong, '&:hover': { bgcolor: computeUiTokens.successHover }, textTransform: 'none', borderRadius: '8px', fontWeight: 700, py: 1.25 }}>
                  {deploying ? 'Creating...' : 'Create Server'}
                </Button>
                {deployError && (
                  <Typography variant="caption" color="error" sx={{ textAlign: 'center', display: 'block', mt: .5 }}>
                    {deployError}
                  </Typography>
                )}
              </>
            )}
            {activeStep > 0 && (
              <Button fullWidth variant="outlined" onClick={() => setActiveStep(s => s - 1)}
                sx={{ textTransform: 'none', borderRadius: '8px', fontWeight: 600, borderColor: border, color: isDark ? WHITE : TEXT_BODY }}>
                ← Back
              </Button>
            )}
          </Stack>

          {/* Step dots */}
          <Box display="flex" justifyContent="center" gap={.75} mt={2}>
            {STEPS.map((_, i) => (
              <Box key={i} sx={{ width: i === activeStep ? 16 : 6, height: 6, borderRadius: 3, bgcolor: i <= activeStep ? COMPUTE_ACCENT : dashboardTokens.colors.border, transition: 'all .2s' }} />
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default ComputePage;
