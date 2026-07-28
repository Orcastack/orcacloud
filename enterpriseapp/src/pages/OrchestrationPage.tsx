import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import HubIcon from '@mui/icons-material/Hub';
import SecurityIcon from '@mui/icons-material/Security';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RefreshIcon from '@mui/icons-material/Refresh';
import { orchestrationApi, kubernetesApi } from '../services/cloudApi';
import type {
  ComplianceScanResult,
  DeploymentResult,
  ObservabilityResult,
  OrchestrationOverview,
  TerraformApplyResult,
  TerraformPlanResult,
} from '../types/orchestration';
import type { KubernetesCluster } from '../types/kubernetes';

const OrchestrationPage: React.FC = () => {
  const [overview, setOverview] = useState<OrchestrationOverview | null>(null);
  const [clusters, setClusters] = useState<KubernetesCluster[]>([]);
  const [tab, setTab] = useState(0);

  const [clusterId, setClusterId] = useState('');

  const [terraformEnv, setTerraformEnv] = useState('dev');
  const [terraformResources, setTerraformResources] = useState('vpc,subnet,kubernetes-cluster,ingress');
  const [lastPlan, setLastPlan] = useState<TerraformPlanResult | null>(null);
  const [lastApply, setLastApply] = useState<TerraformApplyResult | null>(null);

  const [releaseName, setReleaseName] = useState('platform-api');
  const [releaseChart, setReleaseChart] = useState('platform/chart');
  const [strategy, setStrategy] = useState<'rolling' | 'canary' | 'blue-green'>('rolling');
  const [deployment, setDeployment] = useState<DeploymentResult | null>(null);

  const [gitRepo, setGitRepo] = useState('https://github.com/orcacloud/platform-gitops');
  const [gitBranch, setGitBranch] = useState('main');
  const [gitPath, setGitPath] = useState('clusters/prod');

  const [minNodes, setMinNodes] = useState(2);
  const [maxNodes, setMaxNodes] = useState(8);
  const [targetCpu, setTargetCpu] = useState(65);

  const [mesh, setMesh] = useState<'istio' | 'linkerd'>('istio');
  const [retries, setRetries] = useState(2);

  const [recoveryRegion, setRecoveryRegion] = useState('us-east-1');
  const [rpoMinutes, setRpoMinutes] = useState(15);
  const [rtoMinutes, setRtoMinutes] = useState(30);

  const [compliance, setCompliance] = useState<ComplianceScanResult | null>(null);
  const [observability, setObservability] = useState<ObservabilityResult | null>(null);

  const load = useCallback(() => {
    Promise.all([
      orchestrationApi.overview(),
      kubernetesApi.list(),
      orchestrationApi.complianceScan(),
      orchestrationApi.observability(),
    ])
      .then(([overviewRes, clusterRes, complianceRes, obsRes]: any) => {
        setOverview(overviewRes.data || null);
        const clusterItems = clusterRes.data?.results ?? clusterRes.data ?? [];
        setClusters(clusterItems);
        setCompliance(complianceRes.data || null);
        setObservability(obsRes.data || null);
        if (!clusterId && clusterItems.length) setClusterId(clusterItems[0].resource_id);
      })
      .catch(() => {});
  }, [clusterId]);

  useEffect(() => { load(); }, [load]);

  const cards = useMemo(() => ({
    clusters: overview?.summary?.kubernetes_clusters ?? 0,
    running: overview?.summary?.running_clusters ?? 0,
    functions: overview?.summary?.serverless_functions ?? 0,
    asgs: overview?.summary?.autoscaling_groups ?? 0,
  }), [overview]);

  const runTerraformPlan = async () => {
    const resources = terraformResources.split(',').map(value => value.trim()).filter(Boolean);
    const response = await orchestrationApi.terraformPlan(terraformEnv, resources);
    setLastPlan(response.data);
  };

  const runTerraformApply = async () => {
    if (!lastPlan?.plan_id) return;
    const response = await orchestrationApi.terraformApply(lastPlan.plan_id, true);
    setLastApply(response.data);
  };

  const deployRelease = async () => {
    if (!clusterId || !releaseName.trim()) return;
    const response = await orchestrationApi.deployWorkload({
      cluster_resource_id: clusterId,
      release_name: releaseName,
      chart: releaseChart,
      namespace: 'default',
      strategy,
    });
    setDeployment(response.data);
  };

  const configureGitOps = async () => {
    if (!clusterId || !gitRepo.trim()) return;
    await orchestrationApi.configureGitOps({
      cluster_resource_id: clusterId,
      repository: gitRepo,
      branch: gitBranch,
      path: gitPath,
      auto_sync: true,
    });
    load();
  };

  const configureAutoscaling = async () => {
    if (!clusterId) return;
    await orchestrationApi.configureAutoscaling({
      cluster_resource_id: clusterId,
      min_nodes: minNodes,
      max_nodes: maxNodes,
      target_cpu_percent: targetCpu,
    });
    load();
  };

  const configureMesh = async () => {
    if (!clusterId) return;
    await orchestrationApi.configureServiceMesh({
      cluster_resource_id: clusterId,
      mesh,
      mtls_enabled: true,
      retries,
    });
    load();
  };

  const configureDr = async () => {
    if (!clusterId) return;
    await orchestrationApi.disasterRecoveryPlan({
      cluster_resource_id: clusterId,
      recovery_region: recoveryRegion,
      rpo_minutes: rpoMinutes,
      rto_minutes: rtoMinutes,
    });
    load();
  };

  return (
    <Box sx={{ p: 3, bgcolor: 'background.default', minHeight: '100%' }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Orchestration</Typography>
          <Typography variant="body2" color="text.secondary">Automate infrastructure, deployment pipelines, service mesh, autoscaling, and resilience.</Typography>
        </Box>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={load}>Refresh</Button>
      </Stack>

      <Stack direction="row" spacing={2} mb={2}>
        <Card sx={{ flex: 1, bgcolor: 'background.paper' }}><CardContent><Typography color="text.secondary">Clusters</Typography><Typography variant="h4">{cards.clusters}</Typography></CardContent></Card>
        <Card sx={{ flex: 1, bgcolor: 'background.paper' }}><CardContent><Typography color="text.secondary">Running</Typography><Typography variant="h4">{cards.running}</Typography></CardContent></Card>
        <Card sx={{ flex: 1, bgcolor: 'background.paper' }}><CardContent><Typography color="text.secondary">Functions</Typography><Typography variant="h4">{cards.functions}</Typography></CardContent></Card>
        <Card sx={{ flex: 1, bgcolor: 'background.paper' }}><CardContent><Typography color="text.secondary">ASGs</Typography><Typography variant="h4">{cards.asgs}</Typography></CardContent></Card>
      </Stack>

      <Card sx={{ mb: 2, bgcolor: 'background.paper' }}>
        <CardContent>
          <Typography variant="subtitle2" mb={1}>Target Cluster</Typography>
          <TextField
            select
            fullWidth
            size="small"
            value={clusterId}
            onChange={(event) => setClusterId(event.target.value)}
          >
            {clusters.map(cluster => (
              <MenuItem key={cluster.resource_id} value={cluster.resource_id}>{cluster.name} ({cluster.region})</MenuItem>
            ))}
          </TextField>
        </CardContent>
      </Card>

      <Card sx={{ bgcolor: 'background.paper' }}>
        <CardContent>
          <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mb: 2 }}>
            <Tab label="IaC" icon={<AutoFixHighIcon />} iconPosition="start" />
            <Tab label="Deploy" icon={<HubIcon />} iconPosition="start" />
            <Tab label="Security" icon={<SecurityIcon />} iconPosition="start" />
            <Tab label="Observability" icon={<VisibilityIcon />} iconPosition="start" />
          </Tabs>

          {tab === 0 && (
            <Stack spacing={2}>
              <Card variant="outlined" sx={{ bgcolor: 'background.paper' }}><CardContent>
                <Typography variant="subtitle2">Terraform Plan / Apply</Typography>
                <Stack direction="row" spacing={1} mt={1}>
                  <TextField size="small" label="Environment" value={terraformEnv} onChange={(event) => setTerraformEnv(event.target.value)} sx={{ width: 140 }} />
                  <TextField size="small" fullWidth label="Resources (comma separated)" value={terraformResources} onChange={(event) => setTerraformResources(event.target.value)} />
                  <Button variant="contained" onClick={runTerraformPlan}>Plan</Button>
                  <Button variant="outlined" disabled={!lastPlan?.plan_id} onClick={runTerraformApply}>Apply</Button>
                </Stack>
                {!!lastPlan && (
                  <Typography variant="body2" color="text.secondary" mt={1}>
                    Plan {lastPlan.plan_id}: +{lastPlan.summary.to_add} ~{lastPlan.summary.to_change} -{lastPlan.summary.to_destroy}
                  </Typography>
                )}
                {!!lastApply && (
                  <Typography variant="body2" color="text.secondary" mt={0.5}>Apply {lastApply.apply_id}: {lastApply.status}</Typography>
                )}
              </CardContent></Card>
            </Stack>
          )}

          {tab === 1 && (
            <Stack spacing={2}>
              <Card variant="outlined" sx={{ bgcolor: 'background.paper' }}><CardContent>
                <Typography variant="subtitle2">Helm Deployment Pipeline</Typography>
                <Stack direction="row" spacing={1} mt={1}>
                  <TextField size="small" label="Release" value={releaseName} onChange={(event) => setReleaseName(event.target.value)} />
                  <TextField size="small" label="Chart" value={releaseChart} onChange={(event) => setReleaseChart(event.target.value)} />
                  <TextField select size="small" label="Strategy" value={strategy} onChange={(event) => setStrategy(event.target.value as any)} sx={{ width: 140 }}>
                    <MenuItem value="rolling">rolling</MenuItem>
                    <MenuItem value="canary">canary</MenuItem>
                    <MenuItem value="blue-green">blue-green</MenuItem>
                  </TextField>
                  <Button variant="contained" onClick={deployRelease}>Deploy</Button>
                </Stack>
                {deployment && <Chip sx={{ mt: 1 }} size="small" color="success" label={`${deployment.release_name} • ${deployment.strategy} • ${deployment.status}`} />}
              </CardContent></Card>

              <Card variant="outlined" sx={{ bgcolor: 'background.paper' }}><CardContent>
                <Typography variant="subtitle2">GitOps Sync</Typography>
                <Stack direction="row" spacing={1} mt={1}>
                  <TextField size="small" fullWidth label="Repository" value={gitRepo} onChange={(event) => setGitRepo(event.target.value)} />
                  <TextField size="small" label="Branch" value={gitBranch} onChange={(event) => setGitBranch(event.target.value)} sx={{ width: 130 }} />
                  <TextField size="small" label="Path" value={gitPath} onChange={(event) => setGitPath(event.target.value)} sx={{ width: 170 }} />
                  <Button variant="outlined" onClick={configureGitOps}>Configure</Button>
                </Stack>
              </CardContent></Card>
            </Stack>
          )}

          {tab === 2 && (
            <Stack spacing={2}>
              <Card variant="outlined" sx={{ bgcolor: 'background.paper' }}><CardContent>
                <Typography variant="subtitle2">Autoscaling Guardrails</Typography>
                <Stack direction="row" spacing={1} mt={1}>
                  <TextField size="small" type="number" label="Min" value={minNodes} onChange={(event) => setMinNodes(Number(event.target.value))} sx={{ width: 100 }} />
                  <TextField size="small" type="number" label="Max" value={maxNodes} onChange={(event) => setMaxNodes(Number(event.target.value))} sx={{ width: 100 }} />
                  <TextField size="small" type="number" label="Target CPU %" value={targetCpu} onChange={(event) => setTargetCpu(Number(event.target.value))} sx={{ width: 130 }} />
                  <Button variant="outlined" onClick={configureAutoscaling}>Apply</Button>
                </Stack>
              </CardContent></Card>

              <Card variant="outlined" sx={{ bgcolor: 'background.paper' }}><CardContent>
                <Typography variant="subtitle2">Service Mesh & mTLS</Typography>
                <Stack direction="row" spacing={1} mt={1}>
                  <TextField select size="small" label="Mesh" value={mesh} onChange={(event) => setMesh(event.target.value as any)} sx={{ width: 130 }}>
                    <MenuItem value="istio">istio</MenuItem>
                    <MenuItem value="linkerd">linkerd</MenuItem>
                  </TextField>
                  <TextField size="small" type="number" label="Retries" value={retries} onChange={(event) => setRetries(Number(event.target.value))} sx={{ width: 120 }} />
                  <Button variant="outlined" onClick={configureMesh}>Configure Mesh</Button>
                </Stack>
              </CardContent></Card>

              <Card variant="outlined" sx={{ bgcolor: 'background.paper' }}><CardContent>
                <Typography variant="subtitle2">Disaster Recovery</Typography>
                <Stack direction="row" spacing={1} mt={1}>
                  <TextField size="small" label="Recovery Region" value={recoveryRegion} onChange={(event) => setRecoveryRegion(event.target.value)} sx={{ width: 160 }} />
                  <TextField size="small" type="number" label="RPO (min)" value={rpoMinutes} onChange={(event) => setRpoMinutes(Number(event.target.value))} sx={{ width: 120 }} />
                  <TextField size="small" type="number" label="RTO (min)" value={rtoMinutes} onChange={(event) => setRtoMinutes(Number(event.target.value))} sx={{ width: 120 }} />
                  <Button variant="outlined" onClick={configureDr}>Configure DR</Button>
                </Stack>
              </CardContent></Card>
            </Stack>
          )}

          {tab === 3 && (
            <Stack spacing={2}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(5, minmax(0, 1fr))' }, gap: 1 }}>
                <Card variant="outlined" sx={{ bgcolor: 'background.paper' }}><CardContent><Typography variant="caption" color="text.secondary">Compliance Score</Typography><Typography variant="h6">{compliance?.score ?? 0}</Typography></CardContent></Card>
                <Card variant="outlined" sx={{ bgcolor: 'background.paper' }}><CardContent><Typography variant="caption" color="text.secondary">Findings</Typography><Typography variant="h6">{compliance?.findings?.length ?? 0}</Typography></CardContent></Card>
                <Card variant="outlined" sx={{ bgcolor: 'background.paper' }}><CardContent><Typography variant="caption" color="text.secondary">Prometheus Targets</Typography><Typography variant="h6">{observability?.metrics?.prometheus_targets_up_percent ?? 0}%</Typography></CardContent></Card>
                <Card variant="outlined" sx={{ bgcolor: 'background.paper' }}><CardContent><Typography variant="caption" color="text.secondary">Events/Min</Typography><Typography variant="h6">{observability?.logs?.events_per_minute ?? 0}</Typography></CardContent></Card>
                <Card variant="outlined" sx={{ bgcolor: 'background.paper' }}><CardContent><Typography variant="caption" color="text.secondary">Trace P95</Typography><Typography variant="h6">{observability?.traces?.p95_ms ?? 0} ms</Typography></CardContent></Card>
              </Box>

              <Card variant="outlined" sx={{ bgcolor: 'background.paper' }}><CardContent>
                <Typography variant="subtitle2">Compliance Findings</Typography>
                {(compliance?.findings || []).map((item, index) => (
                  <Typography key={`${item.cluster}-${index}`} variant="body2" color="text.secondary">{item.cluster} • {item.severity} • {item.issue}</Typography>
                ))}
                {!compliance?.findings?.length && <Typography variant="body2" color="text.secondary">No findings.</Typography>}
              </CardContent></Card>
            </Stack>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default OrchestrationPage;
