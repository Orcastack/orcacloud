import React, { useState } from 'react';
import {
  Box, Typography, Paper, Grid, Button, Chip, Tabs, Tab, Table,
  TableHead, TableRow, TableCell, TableBody, IconButton, Tooltip,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { dashboardTokens, dashboardSemanticColors } from '../styles/dashboardDesignSystem';

const T = dashboardTokens.colors;
const S = dashboardSemanticColors;

const TERRAFORM_MODULES = [
  { name: 'orcacloud-compute-cluster', desc: 'Auto-scaled compute cluster with load balancer', version: '2.3.1', downloads: '12.4k', provider: 'Terraform', tags: ['compute', 'autoscaling'] },
  { name: 'orcacloud-k8s-cluster', desc: 'Managed Kubernetes cluster with node auto-provisioning', version: '3.1.0', downloads: '8.9k', provider: 'Terraform', tags: ['k8s', 'compute'] },
  { name: 'orcacloud-vpc-network', desc: 'VPC with public/private subnets, NAT, firewall', version: '1.8.2', downloads: '15.2k', provider: 'Terraform', tags: ['networking'] },
  { name: 'orcacloud-postgres-cluster', desc: 'Managed PostgreSQL with read replicas and backups', version: '1.5.0', downloads: '7.1k', provider: 'Terraform', tags: ['database'] },
  { name: 'orcacloud-cdn-distribution', desc: 'Global CDN with SSL and origin failover', version: '1.2.0', downloads: '4.3k', provider: 'Pulumi', tags: ['cdn', 'networking'] },
  { name: 'orcacloud-serverless-app', desc: 'Function deployment with API gateway and auth', version: '2.0.1', downloads: '6.7k', provider: 'Pulumi', tags: ['serverless', 'api'] },
];

const BLUEPRINTS = [
  { name: '3-Tier Web Application', components: ['Load Balancer', 'Auto-Scaling Web Tier', 'App Tier', 'PostgreSQL DB', 'Redis Cache', 'CDN'], complexity: 'Medium', time: '~15 min' },
  { name: 'Microservices Platform', components: ['K8s Cluster', 'Service Mesh (Istio)', 'API Gateway', 'Message Queue', 'Distributed Tracing', 'Prometheus + Grafana'], complexity: 'High', time: '~25 min' },
  { name: 'Data Pipeline', components: ['Object Storage', 'Kafka Cluster', 'Spark Processing', 'PostgreSQL DWH', 'Scheduled Jobs', 'Monitoring'], complexity: 'High', time: '~30 min' },
  { name: 'Serverless API', components: ['API Gateway', 'Serverless Functions', 'DynamoDB-style DB', 'Auth/JWT', 'CDN'], complexity: 'Low', time: '~5 min' },
];

const complexityColor = (c: string) =>
  c === 'High' ? S.danger : c === 'Medium' ? S.warning : S.success;

export default function DevIaCPage() {
  const [tab, setTab] = useState(0);

  return (
    <Box sx={{ p: 3, bgcolor: T.background, minHeight: '100vh', fontFamily: dashboardTokens.typography.fontFamily }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ color: T.textPrimary, fontWeight: 700 }}>Infrastructure as Code</Typography>
        <Typography variant="body2" sx={{ color: T.textSecondary, mt: 0.3 }}>Terraform modules, Pulumi templates, and prebuilt architecture blueprints</Typography>
      </Box>

      <Paper sx={{ borderRadius: 2, border: `1px solid ${T.border}`, bgcolor: T.surface }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2, borderBottom: `1px solid ${T.border}` }}>
          <Tab label="Modules & Templates" />
          <Tab label="Architecture Blueprints" />
          <Tab label="Deployments" />
        </Tabs>

        {tab === 0 && (
          <Box sx={{ p: 2 }}>
            <Grid container spacing={2}>
              {TERRAFORM_MODULES.map(m => (
                <Grid item xs={12} sm={6} md={4} key={m.name}>
                  <Paper sx={{ p: 2.5, bgcolor: T.surfaceSubtle, border: `1px solid ${T.border}`, borderRadius: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Chip label={m.provider} size="small"
                        sx={{ bgcolor: m.provider === 'Terraform' ? `${T.brandPrimary}22` : `${S.purple}22`,
                          color: m.provider === 'Terraform' ? T.brandPrimary : S.purple, fontSize: '.65rem' }} />
                      <Typography variant="caption" sx={{ color: T.textSecondary }}>v{m.version}</Typography>
                    </Box>
                    <Typography variant="body2" sx={{ color: T.textPrimary, fontWeight: 700, fontFamily: 'monospace', fontSize: '.85rem', mb: 0.5 }}>{m.name}</Typography>
                    <Typography variant="caption" sx={{ color: T.textSecondary, flex: 1, mb: 1.5 }}>{m.desc}</Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1.5 }}>
                      {m.tags.map(tag => (
                        <Chip key={tag} label={tag} size="small" sx={{ bgcolor: T.background, color: T.textSecondary, fontSize: '.62rem' }} />
                      ))}
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography variant="caption" sx={{ color: T.textSecondary }}>{m.downloads} downloads</Typography>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Button size="small" startIcon={<DownloadIcon sx={{ fontSize: '.8rem !important' }} />}
                          variant="outlined" sx={{ borderColor: T.border, color: T.textPrimary, fontSize: '.7rem' }}>Use</Button>
                        <Button size="small" endIcon={<OpenInNewIcon sx={{ fontSize: '.8rem !important' }} />}
                          sx={{ color: T.brandPrimary, fontSize: '.7rem' }}>Docs</Button>
                      </Box>
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {tab === 1 && (
          <Box sx={{ p: 2 }}>
            <Grid container spacing={2}>
              {BLUEPRINTS.map(bp => (
                <Grid item xs={12} sm={6} key={bp.name}>
                  <Paper sx={{ p: 2.5, bgcolor: T.surfaceSubtle, border: `1px solid ${T.border}`, borderRadius: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                      <Typography variant="body1" sx={{ color: T.textPrimary, fontWeight: 700 }}>{bp.name}</Typography>
                      <Chip label={bp.complexity} size="small"
                        sx={{ bgcolor: `${complexityColor(bp.complexity)}22`, color: complexityColor(bp.complexity), fontSize: '.7rem' }} />
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 2 }}>
                      {bp.components.map(c => (
                        <Box key={c} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <CheckCircleIcon sx={{ fontSize: '.85rem', color: S.success }} />
                          <Typography variant="caption" sx={{ color: T.textSecondary }}>{c}</Typography>
                        </Box>
                      ))}
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" sx={{ color: T.textSecondary }}>Deploy time: {bp.time}</Typography>
                      <Button variant="contained" size="small"
                        sx={{ bgcolor: T.brandPrimary, '&:hover': { bgcolor: T.brandPrimaryHover }, fontSize: '.75rem' }}>
                        Deploy
                      </Button>
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {tab === 2 && (
          <Table>
            <TableHead>
              <TableRow>
                {['Blueprint / Module', 'Deployed By', 'Environment', 'Resources', 'Status', 'Deployed At'].map(h => (
                  <TableCell key={h} sx={{ color: T.textSecondary, fontSize: '.75rem', fontWeight: 600 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {[
                { name: '3-Tier Web Application', by: 'James Liu', env: 'production', resources: 18, status: 'active', at: '2026-01-15 10:00' },
                { name: 'orcacloud-k8s-cluster', by: 'Sarah Chen', env: 'production', resources: 7, status: 'active', at: '2025-11-20 14:30' },
                { name: 'Serverless API', by: 'Dev Team', env: 'staging', resources: 5, status: 'active', at: '2026-02-10 09:00' },
                { name: 'orcacloud-vpc-network', by: 'Platform Team', env: 'production', resources: 12, status: 'active', at: '2025-09-01 08:00' },
              ].map((dep, i) => (
                <TableRow key={i} hover sx={{ '&:hover': { bgcolor: T.surfaceHover } }}>
                  <TableCell sx={{ color: T.textPrimary, fontWeight: 600 }}>{dep.name}</TableCell>
                  <TableCell sx={{ color: T.textSecondary }}>{dep.by}</TableCell>
                  <TableCell><Chip label={dep.env} size="small" sx={{ bgcolor: dep.env === 'production' ? `${S.danger}22` : `${S.warning}22`, color: dep.env === 'production' ? S.danger : S.warning, fontSize: '.7rem' }} /></TableCell>
                  <TableCell sx={{ color: T.textPrimary }}>{dep.resources}</TableCell>
                  <TableCell><Chip label={dep.status} size="small" sx={{ bgcolor: `${S.success}22`, color: S.success, fontSize: '.7rem' }} /></TableCell>
                  <TableCell sx={{ color: T.textSecondary, fontSize: '.78rem' }}>{dep.at}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>
    </Box>
  );
}
