import React, { useState } from 'react';
import {
  Box, Typography, Paper, Grid, Button, Chip, Tabs, Tab, Table,
  TableHead, TableRow, TableCell, TableBody, TextField, InputAdornment, Stack,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import MemoryIcon from '@mui/icons-material/Memory';
import StorageIcon from '@mui/icons-material/Storage';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import { dashboardTokens, dashboardSemanticColors } from '../styles/dashboardDesignSystem';

const T = dashboardTokens.colors;
const S = dashboardSemanticColors;
const FONT = dashboardTokens.typography.fontFamily;

const COMPUTE_FLAVORS = [
  { name: 'vcpu1.micro',   vcpu: 1,  ram: 1,   disk: 20,   price: '$3.50/mo',   category: 'Standard', badge: '' },
  { name: 'vcpu2.cpu',     vcpu: 2,  ram: 4,   disk: 40,   price: '$14/mo',     category: 'Standard', badge: '' },
  { name: 'vcpu4.cpu',     vcpu: 4,  ram: 8,   disk: 80,   price: '$28/mo',     category: 'Standard', badge: 'Popular' },
  { name: 'vcpu8.cpu',     vcpu: 8,  ram: 16,  disk: 160,  price: '$56/mo',     category: 'Standard', badge: '' },
  { name: 'vcpu16.cpu',    vcpu: 16, ram: 32,  disk: 320,  price: '$112/mo',    category: 'Standard', badge: '' },
  { name: 'vcpu32.cpu',    vcpu: 32, ram: 64,  disk: 640,  price: '$224/mo',    category: 'Standard', badge: '' },
  { name: 'm4.large',      vcpu: 4,  ram: 32,  disk: 80,   price: '$60/mo',     category: 'Memory',   badge: '' },
  { name: 'm8.xlarge',     vcpu: 8,  ram: 64,  disk: 160,  price: '$120/mo',    category: 'Memory',   badge: 'Popular' },
  { name: 'g1.gpu-small',  vcpu: 8,  ram: 32,  disk: 200,  price: '$180/mo',    category: 'GPU',      badge: 'New' },
  { name: 'g4.h100',       vcpu: 32, ram: 128, disk: 1000, price: '$2,400/mo',  category: 'GPU',      badge: '' },
];

const STORAGE_TIERS = [
  { name: 'Ultra SSD',              iops: '200k', throughput: '4 GB/s',         latency: '<0.1ms',  price: '$0.25/GB/mo',  use: 'Databases, OLTP' },
  { name: 'Premium SSD',            iops: '60k',  throughput: '1 GB/s',         latency: '<0.5ms',  price: '$0.12/GB/mo',  use: 'Web servers, VMs' },
  { name: 'Standard SSD',           iops: '10k',  throughput: '300 MB/s',       latency: '<2ms',    price: '$0.06/GB/mo',  use: 'Dev/test, general' },
  { name: 'HDD',                    iops: '500',  throughput: '100 MB/s',       latency: '<10ms',   price: '$0.02/GB/mo',  use: 'Backups, archives' },
  { name: 'Object Storage Standard',iops: 'N/A',  throughput: 'Auto-scaled',    latency: '<20ms',   price: '$0.015/GB/mo', use: 'Files, media, data lake' },
  { name: 'Object Storage Archive', iops: 'N/A',  throughput: 'Restore req.',   latency: 'Minutes', price: '$0.004/GB/mo', use: 'Long-term archival' },
];

const NETWORK_TEMPLATES = [
  { name: 'Standard VPC',    desc: '1 region, public/private subnets, NAT gateway, basic firewall',   price: 'From $15/mo' },
  { name: 'HA Multi-AZ VPC', desc: '3 availability zones, redundant NAT, distributed load balancer',  price: 'From $45/mo' },
  { name: 'Global Anycast',  desc: 'Multi-region with anycast routing and DDoS protection',            price: 'From $200/mo' },
  { name: 'Private Connect', desc: 'Dedicated private networking between tenant resources',             price: 'Custom pricing' },
];

const CATEGORY_ACCENT: Record<string, string> = {
  Standard: T.brandPrimary,
  Memory:   '#7c3aed',
  GPU:      '#ea580c',
};

function FlavorCard({ f }: { f: typeof COMPUTE_FLAVORS[number] }) {
  const accent = CATEGORY_ACCENT[f.category] ?? T.brandPrimary;
  const isPopular = f.badge === 'Popular';
  const isNew     = f.badge === 'New';

  return (
    <Paper
      elevation={0}
      sx={{
        border: `1.5px solid ${isPopular ? accent : T.border}`,
        borderRadius: 2.5,
        bgcolor: T.surface,
        p: 2.5,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        position: 'relative',
        transition: 'box-shadow .15s, border-color .15s',
        '&:hover': { boxShadow: `0 0 0 2px ${accent}44`, borderColor: accent },
      }}
    >
      {/* Badge */}
      {f.badge && (
        <Chip
          label={f.badge}
          size="small"
          sx={{
            position: 'absolute', top: 10, right: 10,
            fontFamily: FONT, fontSize: '.68rem', fontWeight: 700, height: 20,
            bgcolor: isPopular ? `${S.success}22` : isNew ? `${accent}22` : T.surfaceSubtle,
            color:   isPopular ? S.success         : isNew ? accent        : T.textSecondary,
            border:  `1px solid ${isPopular ? S.success : accent}44`,
          }}
        />
      )}

      {/* Flavor name */}
      <Box>
        <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '.92rem', color: T.textPrimary, letterSpacing: '-.01em' }}>
          {f.name}
        </Typography>
        <Chip label={f.category} size="small" sx={{
          mt: 0.5, fontFamily: FONT, fontSize: '.68rem', fontWeight: 600, height: 18,
          bgcolor: `${accent}18`, color: accent, border: `1px solid ${accent}33`,
        }} />
      </Box>

      {/* vCPU big number */}
      <Box sx={{ bgcolor: `${accent}0d`, borderRadius: 2, px: 2, py: 1.5, textAlign: 'center' }}>
        <Typography sx={{ fontFamily: FONT, fontWeight: 900, fontSize: '2rem', color: accent, lineHeight: 1 }}>
          {f.vcpu}
        </Typography>
        <Typography sx={{ fontFamily: FONT, fontWeight: 600, fontSize: '.72rem', color: accent, textTransform: 'uppercase', letterSpacing: '.06em', mt: 0.25 }}>
          vCPU{f.vcpu !== 1 ? 's' : ''}
        </Typography>
      </Box>

      {/* Specs row */}
      <Stack direction="row" spacing={0} divider={<Box sx={{ width: '1px', bgcolor: T.border }} />}>
        {[
          { icon: <MemoryIcon sx={{ fontSize: '0.85rem' }} />, val: `${f.ram} GB`, sub: 'RAM' },
          { icon: <StorageIcon sx={{ fontSize: '0.85rem' }} />, val: `${f.disk} GB`, sub: 'Disk' },
        ].map(spec => (
          <Box key={spec.sub} sx={{ flex: 1, textAlign: 'center', px: 1 }}>
            <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.4} sx={{ color: T.textSecondary }}>
              {spec.icon}
              <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '.82rem', color: T.textPrimary }}>{spec.val}</Typography>
            </Stack>
            <Typography sx={{ fontFamily: FONT, fontSize: '.65rem', color: T.textTertiary, textTransform: 'uppercase', letterSpacing: '.05em' }}>
              {spec.sub}
            </Typography>
          </Box>
        ))}
      </Stack>

      {/* Footer: price + deploy */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 'auto' }}>
        <Box>
          <Typography sx={{ fontFamily: FONT, fontWeight: 800, fontSize: '1rem', color: T.textPrimary }}>{f.price}</Typography>
        </Box>
        <Button
          size="small"
          variant="contained"
          startIcon={<ShoppingCartIcon sx={{ fontSize: '.8rem !important' }} />}
          sx={{
            fontFamily: FONT, fontWeight: 700, fontSize: '.75rem', textTransform: 'none',
            bgcolor: accent, '&:hover': { bgcolor: accent, filter: 'brightness(.88)' },
            borderRadius: 1.5, px: 2,
          }}
        >
          Deploy
        </Button>
      </Box>
    </Paper>
  );
}

export default function DevCatalogPage() {
  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  const categories = ['All', ...Array.from(new Set(COMPUTE_FLAVORS.map(f => f.category)))];
  const filtered = COMPUTE_FLAVORS.filter(f =>
    (categoryFilter === 'All' || f.category === categoryFilter) &&
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box sx={{ p: 3, bgcolor: T.background, minHeight: '100vh', fontFamily: FONT }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ color: T.textPrimary, fontWeight: 800, fontFamily: FONT }}>Service Catalog</Typography>
        <Typography variant="body2" sx={{ color: T.textSecondary, mt: 0.3, fontFamily: FONT }}>
          Browse VM flavors, storage tiers, networking templates, and prebuilt architectures
        </Typography>
      </Box>

      <Paper sx={{ borderRadius: 2, border: `1px solid ${T.border}`, bgcolor: T.surface }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{
          px: 2, borderBottom: `1px solid ${T.border}`,
          '& .MuiTab-root': { fontFamily: FONT, textTransform: 'none', fontWeight: 600, fontSize: '.85rem' },
          '& .Mui-selected': { color: T.brandPrimary },
          '& .MuiTabs-indicator': { bgcolor: T.brandPrimary },
        }}>
          <Tab label="VM Flavors" />
          <Tab label="Storage Tiers" />
          <Tab label="Networking" />
        </Tabs>

        {/* ── VM Flavors ── */}
        {tab === 0 && (
          <Box sx={{ p: 2.5 }}>
            {/* Toolbar */}
            <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" sx={{ mb: 2.5 }}>
              <TextField
                size="small"
                placeholder="Search flavors..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: '.9rem', color: T.textSecondary }} /></InputAdornment> }}
                sx={{ width: 220 }}
              />
              <Stack direction="row" spacing={0.5}>
                {categories.map(cat => (
                  <Chip
                    key={cat}
                    label={cat}
                    clickable
                    size="small"
                    onClick={() => setCategoryFilter(cat)}
                    sx={{
                      fontFamily: FONT, fontWeight: 600, fontSize: '.75rem',
                      bgcolor: categoryFilter === cat ? T.brandPrimary : T.surfaceSubtle,
                      color:   categoryFilter === cat ? '#fff' : T.textSecondary,
                      border:  categoryFilter === cat ? 'none' : `1px solid ${T.border}`,
                    }}
                  />
                ))}
              </Stack>
            </Stack>

            {/* Cards grid */}
            <Grid container spacing={2}>
              {filtered.map(f => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={f.name}>
                  <FlavorCard f={f} />
                </Grid>
              ))}
              {filtered.length === 0 && (
                <Grid item xs={12}>
                  <Box sx={{ py: 6, textAlign: 'center' }}>
                    <Typography sx={{ fontFamily: FONT, color: T.textSecondary }}>No flavors match your search.</Typography>
                  </Box>
                </Grid>
              )}
            </Grid>
          </Box>
        )}

        {/* ── Storage Tiers ── */}
        {tab === 1 && (
          <Table>
            <TableHead>
              <TableRow>
                {['Tier', 'IOPS', 'Throughput', 'Latency', 'Price', 'Best For', 'Action'].map(h => (
                  <TableCell key={h} sx={{ color: T.textSecondary, fontSize: '.75rem', fontWeight: 600, fontFamily: FONT }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {STORAGE_TIERS.map(s => (
                <TableRow key={s.name} hover sx={{ '&:hover': { bgcolor: T.surfaceHover } }}>
                  <TableCell sx={{ color: T.textPrimary, fontWeight: 600, fontFamily: FONT }}>{s.name}</TableCell>
                  <TableCell sx={{ color: T.textPrimary, fontFamily: FONT }}>{s.iops}</TableCell>
                  <TableCell sx={{ color: T.textPrimary, fontFamily: FONT }}>{s.throughput}</TableCell>
                  <TableCell sx={{ color: T.textPrimary, fontFamily: FONT }}>{s.latency}</TableCell>
                  <TableCell sx={{ color: S.success, fontWeight: 600, fontFamily: FONT }}>{s.price}</TableCell>
                  <TableCell sx={{ color: T.textSecondary, fontSize: '.8rem', fontFamily: FONT }}>{s.use}</TableCell>
                  <TableCell>
                    <Button size="small" variant="outlined" sx={{ borderColor: T.border, color: T.textPrimary, fontSize: '.72rem', fontFamily: FONT, textTransform: 'none' }}>Create</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* ── Networking ── */}
        {tab === 2 && (
          <Box sx={{ p: 2.5 }}>
            <Grid container spacing={2}>
              {NETWORK_TEMPLATES.map(n => (
                <Grid item xs={12} sm={6} key={n.name}>
                  <Paper sx={{ p: 2.5, bgcolor: T.surfaceSubtle, border: `1px solid ${T.border}`, borderRadius: 2 }}>
                    <Typography variant="body1" sx={{ color: T.textPrimary, fontWeight: 700, mb: 0.75, fontFamily: FONT }}>{n.name}</Typography>
                    <Typography variant="caption" sx={{ color: T.textSecondary, display: 'block', mb: 1.5, fontFamily: FONT }}>{n.desc}</Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" sx={{ color: S.success, fontWeight: 600, fontFamily: FONT }}>{n.price}</Typography>
                      <Button variant="contained" size="small"
                        sx={{ bgcolor: T.brandPrimary, '&:hover': { bgcolor: T.brandPrimaryHover }, fontSize: '.75rem', fontFamily: FONT, textTransform: 'none' }}>
                        Deploy
                      </Button>
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
