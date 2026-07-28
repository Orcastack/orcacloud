// OrcaCloud – API service for onboarding dashboard

import axios from 'axios';
import { config } from '../config/environment';
import type {
  ManagedDatabase, CreateDatabasePayload, ScaleDatabasePayload,
  DBEngineCatalogue, MigratePayload, DBMigrationResult,
} from '../types/database';
import type {
  ContainerRepository, CreateRepositoryPayload, CreateTokenPayload,
  ReplicatePayload, RegistryToken, ScanResult,
} from '../types/registry';
import type {
  StorageBucket, CreateBucketPayload, S3Object,
  StorageVolume, LifecycleRule,
  StorageClassInfo, StorageRegion, PresignedUrlResult, SwiftSyncResult,
} from '../types/storage';
import type {
  Domain, DnsRecord, SslCertificate, TldInfo,
  RegisterDomainPayload, TransferDomainPayload, CreateDnsRecordPayload,
  AvailabilityResult,
} from '../types/domain';
import type {
  EmailDomain, Mailbox, EmailAlias, DkimKey,
  MailClientSettings, EmailActivityLog,
  CreateMailboxPayload, UpdateMailboxPayload, CreateAliasPayload,
} from '../types/email';
import type {
  Campaign, ContactList, Contact, EmailTemplate, Automation,
  AccountStats, MarketingOverviewResponse, CreateCampaignPayload, CreateContactListPayload,
  CreateContactPayload, CreateTemplatePayload, CreateAutomationPayload,
} from '../types/marketing';
import type {
  MonitoringOverview, MetricSeries, MetricName,
  AlertRule, CreateAlertRulePayload,
  Alert, Incident, CreateIncidentPayload, LogStream,
} from '../types/monitoring';
import type {
  BillingOverview, BillingAccount, UpdateBillingAccountPayload,
  PaymentMethod, AddPaymentMethodPayload,
  Invoice, CurrentUsage, CreditNote,
} from '../types/billing';
import type {
  LoadBalancer, CreateLoadBalancerPayload, CreateTargetGroupPayload, LoadBalancerMetrics,
  TargetGroup,
} from '../types/loadbalancer';
import type {
  VPC, Subnet, SecurityGroup, RouteTable, DNSRecord,
  InternetGateway, NATGateway, TopologyResponse, FlowLogsResponse,
} from '../types/network';
import type {
  CDNDistribution, CreateCDNDistributionPayload, CDNMetrics, EdgeStatusItem,
} from '../types/cdn';
import type {
  KubernetesCluster, CreateKubernetesClusterPayload, ClusterMetrics,
  ServerlessFunction, CreateServerlessFunctionPayload,
} from '../types/kubernetes';
import type {
  OrchestrationOverview,
  TerraformPlanResult,
  TerraformApplyResult,
  DeploymentResult,
  ComplianceScanResult,
  ObservabilityResult,
} from '../types/orchestration';
import type {
  ComplianceControlStatus,
  EvidencePackResult,
  ComplianceAttestation,
} from '../types/compliance';
import {
  OnboardingProgress,
  DashboardStats,
  WizardOptions,
  CreateServerPayload,
  VMInstance,
  CreateVMPayload,
} from '../types/cloud';

// Cloud API client – routes under /api/services/*
const cloudClient = axios.create({
  baseURL: config.API_BASE_URL + '/v1/services',
  timeout: config.API_TIMEOUT,
  headers: { 'Content-Type': 'application/json' },
});

function ____formatAuthHeader(token: string): string {
  return token.split('.').length === 3 ? `Bearer ${token}` : `Token ${token}`;
}

function ____unwrapEnvelope(payload: any) {
  if (payload && typeof payload === 'object' && 'success' in payload) {
    return payload.data;
  }
  return payload;
}

// Attach auth token on every request
cloudClient.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('authToken');
  if (token) cfg.headers.Authorization = ____formatAuthHeader(token);
  return cfg;
});

// On 401 redirect to home
cloudClient.interceptors.response.use(
  (res) => {
    res.data = ____unwrapEnvelope(res.data);
    return res;
  },
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/';
    }
    return Promise.reject(err);
  }
);

// ---- Onboarding checklist ----
export const onboardingApi = {
  getChecklist: () =>
    cloudClient.get<OnboardingProgress>('/onboarding/checklist/'),

  updateChecklist: (updates: Partial<OnboardingProgress>) =>
    cloudClient.patch<OnboardingProgress>('/onboarding/checklist/update/', updates),
};

// ---- Dashboard stats ----
export const dashboardApi = {
  getStats: () =>
    cloudClient.get<DashboardStats>('/onboarding/stats/'),

  getWizardOptions: () =>
    cloudClient.get<WizardOptions>('/onboarding/wizard-options/'),
};

// ---- Server management ----
export const serversApi = {
  list: () => cloudClient.get('/instances/'),
  create: (payload: CreateServerPayload) => cloudClient.post('/instances/', payload),
  get: (id: string) => cloudClient.get(`/instances/${id}/`),
  delete: (id: string) => cloudClient.delete(`/instances/${id}/`),
};

// ---- Kubernetes ----
export const kubernetesApi = {
  list:         () => cloudClient.get<KubernetesCluster[]>('/kubernetes-clusters/'),
  get:          (id: string) => cloudClient.get<KubernetesCluster>(`/kubernetes-clusters/${id}/`),
  create:       (p: CreateKubernetesClusterPayload) => cloudClient.post<KubernetesCluster>('/kubernetes-clusters/', p),
  delete:       (id: string) => cloudClient.delete(`/kubernetes-clusters/${id}/`),
  nodes:        (id: string) => cloudClient.get(`/kubernetes-clusters/${id}/nodes/`),
  scale:        (id: string, desiredCount: number) => cloudClient.post(`/kubernetes-clusters/${id}/scale/`, { desired_count: desiredCount }),
  kubeconfig:   (id: string) => cloudClient.get(`/kubernetes-clusters/${id}/kubeconfig/`),
  deployYaml:   (id: string, manifestYaml: string) => cloudClient.post(`/kubernetes-clusters/${id}/deploy_yaml/`, { manifest_yaml: manifestYaml }),
  metrics:      (id: string) => cloudClient.get<ClusterMetrics>(`/kubernetes-clusters/${id}/metrics/`),
};

// ---- Serverless Functions ----
export const serverlessApi = {
  list:         () => cloudClient.get<ServerlessFunction[]>('/serverless-functions/'),
  get:          (id: string) => cloudClient.get<ServerlessFunction>(`/serverless-functions/${id}/`),
  create:       (p: CreateServerlessFunctionPayload) => cloudClient.post<ServerlessFunction>('/serverless-functions/', p),
  delete:       (id: string) => cloudClient.delete(`/serverless-functions/${id}/`),
  invoke:       (id: string, payload: Record<string, any>) => cloudClient.post(`/serverless-functions/${id}/invoke/`, { payload }),
  logs:         (id: string) => cloudClient.get(`/serverless-functions/${id}/logs/`),
  metrics:      (id: string) => cloudClient.get(`/serverless-functions/${id}/metrics/`),
  triggers:     (id: string) => cloudClient.get(`/serverless-functions/${id}/triggers/`),
  addTrigger:   (id: string, trigger_type: string, config: Record<string, any>) => cloudClient.post(`/serverless-functions/${id}/add_trigger/`, { trigger_type, config }),
};

// ---- Orchestration ----
export const orchestrationApi = {
  overview:               () => cloudClient.get<OrchestrationOverview>('/orchestration/'),
  terraformPlan:          (environment: string, resources: string[]) =>
    cloudClient.post<TerraformPlanResult>('/orchestration/terraform_plan/', { environment, resources }),
  terraformApply:         (plan_id: string, approved = true) =>
    cloudClient.post<TerraformApplyResult>('/orchestration/terraform_apply/', { plan_id, approved }),
  deployWorkload:         (payload: {
    cluster_resource_id: string;
    release_name: string;
    chart?: string;
    namespace?: string;
    strategy?: 'rolling' | 'canary' | 'blue-green';
  }) => cloudClient.post<DeploymentResult>('/orchestration/deploy_workload/', payload),
  configureGitOps:        (payload: {
    cluster_resource_id: string;
    repository: string;
    branch?: string;
    path?: string;
    auto_sync?: boolean;
  }) => cloudClient.post('/orchestration/configure_gitops/', payload),
  configureAutoscaling:   (payload: {
    cluster_resource_id: string;
    min_nodes: number;
    max_nodes: number;
    target_cpu_percent: number;
  }) => cloudClient.post('/orchestration/configure_autoscaling/', payload),
  configureServiceMesh:   (payload: {
    cluster_resource_id: string;
    mesh: 'istio' | 'linkerd';
    mtls_enabled?: boolean;
    retries?: number;
  }) => cloudClient.post('/orchestration/configure_service_mesh/', payload),
  disasterRecoveryPlan:   (payload: {
    cluster_resource_id: string;
    recovery_region?: string;
    backup_schedule?: string;
    rpo_minutes?: number;
    rto_minutes?: number;
  }) => cloudClient.post('/orchestration/disaster_recovery_plan/', payload),
  complianceScan:         () => cloudClient.get<ComplianceScanResult>('/orchestration/compliance_scan/'),
  observability:          () => cloudClient.get<ObservabilityResult>('/orchestration/observability/'),
};

// ---- GraphQL ----
export const graphqlApi = {
  query: <T = any>(query: string, variables?: Record<string, unknown>) => {
    const token = localStorage.getItem('authToken');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers.Authorization = `Token ${token}`;
    }

    return axios.post<T>(
      `${config.API_BASE_URL}/graphql/`,
      {
        query,
        variables: variables || {},
      },
      {
        timeout: config.API_TIMEOUT,
        headers,
      }
    );
  },
};

// ---- Compliance ----
export const complianceApi = {
  listFrameworks:         () => cloudClient.get('/compliance/'),
  controlStatus:          (framework: 'soc2' | 'iso27001' | 'gdpr' = 'soc2') =>
    cloudClient.get<ComplianceControlStatus>(`/compliance/control_status/?framework=${framework}`),
  collectEvidence:        (framework: 'soc2' | 'iso27001' | 'gdpr' = 'soc2') =>
    cloudClient.post<EvidencePackResult>('/compliance/collect_evidence/', { framework }),
  createAttestation:      (payload: {
    framework: 'soc2' | 'iso27001' | 'gdpr';
    period_start: string;
    period_end: string;
  }) => cloudClient.post<ComplianceAttestation>('/compliance/attestation/', payload),
};

// ---- Block Volumes ----
export const volumesApi = {
  list:   ()           => cloudClient.get<StorageVolume[]>('/volumes/'),
  create: (p: object) => cloudClient.post<StorageVolume>('/volumes/', p),
  delete: (id: string)=> cloudClient.delete(`/volumes/${id}/`),
};

// ---- Cloud Object Storage (Swift / S3-compatible) ----
export const storageApi = {
  // Buckets
  list:     ()                              => cloudClient.get<StorageBucket[]>('/buckets/'),
  get:      (id: string)                    => cloudClient.get<StorageBucket>(`/buckets/${id}/`),
  create:   (p: CreateBucketPayload)        => cloudClient.post<StorageBucket>('/buckets/', p),
  update:   (id: string, p: Partial<CreateBucketPayload>) =>
                                               cloudClient.patch<StorageBucket>(`/buckets/${id}/`, p),
  delete:   (id: string)                    => cloudClient.delete(`/buckets/${id}/`),
  // Objects
  objects:  (id: string)                    => cloudClient.get<S3Object[]>(`/buckets/${id}/objects/`),
  statistics:(id: string)                   => cloudClient.get(`/buckets/${id}/statistics/`),
  // Versioning / logging
  enableVersioning: (id: string)            => cloudClient.post(`/buckets/${id}/enable_versioning/`),
  enableLogging: (id: string, target: string) =>
                                               cloudClient.post(`/buckets/${id}/enable_logging/`, { log_target_bucket: target }),
  // Lifecycle
  getLifecycle:  (id: string)               => cloudClient.get<{ rules: LifecycleRule[] }>(`/buckets/${id}/lifecycle/`),
  setLifecycle:  (id: string, rules: LifecycleRule[]) =>
                                               cloudClient.post(`/buckets/${id}/lifecycle/`, { rules }),
  // Swift
  swiftSync:     (id: string)               => cloudClient.post<SwiftSyncResult>(`/buckets/${id}/swift_sync/`),
  presignedUrl:  (id: string, key: string, expires = 3600, method = 'GET') =>
                                               cloudClient.post<PresignedUrlResult>(`/buckets/${id}/generate_presigned_url/`, {
                                                 object_key: key, expires_in: expires, method,
                                               }),
  replicate:     (id: string, target_region: string) =>
                                               cloudClient.post(`/buckets/${id}/replicate/`, { target_region }),
  // Object upload
  uploadObject:  (id: string, form: FormData) =>
                                               cloudClient.post(`/buckets/${id}/upload_object/`, form, {
                                                 headers: { 'Content-Type': 'multipart/form-data' },
                                               }),
  // Catalogues
  storageClasses: ()                        => cloudClient.get<StorageClassInfo[]>('/buckets/storage_classes/'),
  regions:       ()                         => cloudClient.get<StorageRegion[]>('/buckets/regions/'),
};

// ---- Networking ----
export const networksApi = {
  list: () => cloudClient.get('/vpcs/'),
};

export const networkArchitectureApi = {
  // VPC
  listVpcs:              () => cloudClient.get<VPC[]>('/vpcs/'),
  getVpc:               (id: string) => cloudClient.get<VPC>(`/vpcs/${id}/`),
  createVpc:            (payload: {
    name: string;
    description?: string;
    cidr_block: string;
    region?: string;
    enable_dns_hostnames?: boolean;
    enable_dns_support?: boolean;
    enable_network_address_translation?: boolean;
  }) => cloudClient.post<VPC>('/vpcs/', payload),
  configureFlowLogs:    (id: string, enabled: boolean, destination?: string) =>
    cloudClient.post(`/vpcs/${id}/configure_flow_logs/`, { enabled, destination }),
  flowLogs:             (id: string) => cloudClient.get<FlowLogsResponse>(`/vpcs/${id}/flow_logs/`),
  topology:             (id: string) => cloudClient.get<TopologyResponse>(`/vpcs/${id}/topology/`),

  // Subnets
  listSubnets:          () => cloudClient.get<Subnet[]>('/subnets/'),
  createSubnet:         (payload: {
    vpc: string;
    cidr_block: string;
    availability_zone: string;
    map_public_ip_on_launch?: boolean;
    assign_ipv6_on_creation?: boolean;
    name?: string;
  }) => cloudClient.post<Subnet>('/subnets/', payload),
  setSubnetTier:        (subnetId: string, tier: 'public' | 'private') =>
    cloudClient.post(`/subnets/${subnetId}/set_tier/`, { tier }),

  // Security groups
  listSecurityGroups:   () => cloudClient.get<SecurityGroup[]>('/security-groups/'),
  createSecurityGroup:  (payload: { name: string; description?: string; vpc: string }) =>
    cloudClient.post<SecurityGroup>('/security-groups/', payload),
  applySecurityTemplate:(id: string, template: 'web-public' | 'private-service') =>
    cloudClient.post(`/security-groups/${id}/apply_template/`, { template }),

  // Route tables
  listRouteTables:      () => cloudClient.get<RouteTable[]>('/route-tables/'),
  createRouteTable:     (payload: { name: string; description?: string; vpc: string; is_main?: boolean }) =>
    cloudClient.post<RouteTable>('/route-tables/', payload),
  associateSubnetRoute: (id: string, subnet_id: string) =>
    cloudClient.post(`/route-tables/${id}/associate_subnet/`, { subnet_id }),
  setDefaultRoute:      (id: string, target_type: 'internet-gateway' | 'nat-gateway', target_id: string) =>
    cloudClient.post(`/route-tables/${id}/set_default_route/`, { target_type, target_id }),

  // DNS
  listDnsRecords:       () => cloudClient.get<DNSRecord[]>('/dns-records/'),
  createDnsRecord:      (payload: {
    zone_id: string;
    name: string;
    record_type: string;
    ttl: number;
    values: string[];
    routing_policy?: string;
  }) => cloudClient.post<DNSRecord>('/dns-records/', payload),

  // Gateways
  listInternetGateways: () => cloudClient.get<InternetGateway[]>('/internet-gateways/'),
  createInternetGateway:(payload: { name: string; description?: string; vpc: string }) =>
    cloudClient.post<InternetGateway>('/internet-gateways/', payload),
  listNatGateways:      () => cloudClient.get<NATGateway[]>('/nat-gateways/'),
  createNatGateway:     (payload: { name: string; description?: string; subnet: string; eip_allocation_id?: string; public_ip?: string }) =>
    cloudClient.post<NATGateway>('/nat-gateways/', payload),
};

// ---- Load Balancers ----
export const loadBalancerApi = {
  // Load balancer CRUD
  list:                  () => cloudClient.get<LoadBalancer[]>('/load-balancers/'),
  get:                   (id: string) => cloudClient.get<LoadBalancer>(`/load-balancers/${id}/`),
  create:                (payload: CreateLoadBalancerPayload) => cloudClient.post<LoadBalancer>('/load-balancers/', payload),
  delete:                (id: string) => cloudClient.delete(`/load-balancers/${id}/`),

  // LB features
  setAlgorithm:          (id: string, algorithm: 'round_robin' | 'least_connections' | 'ip_hash' | 'weighted') =>
    cloudClient.post(`/load-balancers/${id}/set_algorithm/`, { algorithm }),
  enableTls:             (id: string, certificate_arn: string, ssl_policy = 'TLS-1-2-2021') =>
    cloudClient.post(`/load-balancers/${id}/enable_tls/`, { certificate_arn, ssl_policy }),
  configureHealthCheck:  (
    id: string,
    payload: {
      path?: string;
      interval_seconds?: number;
      timeout_seconds?: number;
      healthy_threshold?: number;
      unhealthy_threshold?: number;
    }
  ) => cloudClient.post(`/load-balancers/${id}/configure_health_check/`, payload),
  configureCdnOrigin:    (id: string, origin_host: string, cache_enabled = true) =>
    cloudClient.post(`/load-balancers/${id}/configure_cdn_origin/`, { origin_host, cache_enabled }),
  metrics:               (id: string) => cloudClient.get<LoadBalancerMetrics>(`/load-balancers/${id}/metrics/`),

  // Target groups
  listTargetGroups:      (id: string) => cloudClient.get<TargetGroup[]>(`/load-balancers/${id}/target_groups/`),
  addTargetGroup:        (id: string, payload: CreateTargetGroupPayload) => cloudClient.post(`/load-balancers/${id}/add_target_group/`, payload),
  registerTarget:        (targetGroupId: string, target_id: string, port: number, weight = 100) =>
    cloudClient.post(`/target-groups/${targetGroupId}/register_target/`, { target_id, port, weight }),
  deregisterTarget:      (targetGroupId: string, target_id: string) =>
    cloudClient.post(`/target-groups/${targetGroupId}/deregister_target/`, { target_id }),
  setTargetWeight:       (targetGroupId: string, target_id: string, weight: number) =>
    cloudClient.post(`/target-groups/${targetGroupId}/set_target_weight/`, { target_id, weight }),
  targetHealth:          (targetGroupId: string) => cloudClient.get(`/target-groups/${targetGroupId}/health/`),
};

// ---- CDN ----
export const cdnApi = {
  // CRUD
  list:                  () => cloudClient.get<CDNDistribution[]>('/cdn-distributions/'),
  get:                   (id: string) => cloudClient.get<CDNDistribution>(`/cdn-distributions/${id}/`),
  create:                (payload: CreateCDNDistributionPayload) => cloudClient.post<CDNDistribution>('/cdn-distributions/', payload),
  delete:                (id: string) => cloudClient.delete(`/cdn-distributions/${id}/`),

  // Cache operations
  invalidateCache:       (id: string, paths: string[] = ['/*']) =>
    cloudClient.post(`/cdn-distributions/${id}/invalidate_cache/`, { paths }),
  setCachePolicy:        (
    id: string,
    payload: {
      static_ttl_seconds?: number;
      dynamic_ttl_seconds?: number;
      max_ttl_seconds?: number;
      bypass_paths?: string[];
      cache_query_strings?: boolean;
      vary_headers?: string[];
    }
  ) => cloudClient.post(`/cdn-distributions/${id}/set_cache_policy/`, payload),

  // Security/performance
  setSecurity:           (
    id: string,
    payload: {
      require_https?: boolean;
      ssl_protocol_minimum?: 'TLSv1' | 'TLSv1.1' | 'TLSv1.2' | 'SSLv3' | string;
      waf_enabled?: boolean;
      waf_web_acl_id?: string;
      ddos_mitigation_enabled?: boolean;
    }
  ) => cloudClient.post(`/cdn-distributions/${id}/set_security/`, payload),
  setPerformance:        (
    id: string,
    payload: {
      http2_enabled?: boolean;
      http3_enabled?: boolean;
      compression?: string;
      image_optimization?: boolean;
    }
  ) => cloudClient.post(`/cdn-distributions/${id}/set_performance/`, payload),

  // Observability
  metrics:               (id: string) => cloudClient.get<CDNMetrics>(`/cdn-distributions/${id}/metrics/`),
  edgeStatus:            (id: string) => cloudClient.get<{ distribution_id: string; edges: EdgeStatusItem[] }>(`/cdn-distributions/${id}/edge_status/`),
};

// ---- Managed Databases ----
export const databaseApi = {
  // CRUD
  list:    ()                         => cloudClient.get<ManagedDatabase[]>('/databases/'),
  get:     (id: string)               => cloudClient.get<ManagedDatabase>(`/databases/${id}/`),
  create:  (p: CreateDatabasePayload) => cloudClient.post<ManagedDatabase>('/databases/', p),
  delete:  (id: string)               => cloudClient.delete(`/databases/${id}/`),
  // Lifecycle actions
  scale:   (id: string, p: ScaleDatabasePayload) => cloudClient.post<ManagedDatabase>(`/databases/${id}/scale/`, p),
  restart: (id: string)               => cloudClient.post(`/databases/${id}/restart/`),
  // Credentials
  credentials: (id: string)           => cloudClient.get(`/databases/${id}/credentials/`),
  rotate:  (id: string, username?: string) => cloudClient.post(`/databases/${id}/rotate/`, { username }),
  // Backups
  backups: (id: string)               => cloudClient.get(`/databases/${id}/backups/`),
  backup:  (id: string, type = 'manual') => cloudClient.post(`/databases/${id}/backup/`, { backup_type: type }),
  restore: (id: string, backup_id: string) => cloudClient.post(`/databases/${id}/restore/`, { backup_id }),
  // Metrics
  metrics: (id: string)               => cloudClient.get(`/databases/${id}/metrics/`),
  // Migration
  migrate: (id: string, p: MigratePayload) => cloudClient.post<DBMigrationResult>(`/databases/${id}/migrate/`, p),
  // Catalogue
  engines: ()                         => cloudClient.get<DBEngineCatalogue[]>('/databases/engines/'),
  regions: ()                         => cloudClient.get('/databases/regions/'),
};

// ---- OpenStack VM management (/cloud/*) ----
export const vmApi = {
  list:         ()              => cloudClient.get<VMInstance[]>('/cloud/servers/'),
  create:       (p: CreateVMPayload) => cloudClient.post<VMInstance>('/cloud/servers/', p),
  get:          (id: string)   => cloudClient.get<VMInstance>(`/cloud/servers/${id}/`),
  delete:       (id: string)   => cloudClient.delete(`/cloud/servers/${id}/`),
  start:        (id: string)   => cloudClient.post(`/cloud/servers/${id}/start/`),
  stop:         (id: string)   => cloudClient.post(`/cloud/servers/${id}/stop/`),
  reboot:       (id: string)   => cloudClient.post(`/cloud/servers/${id}/reboot/`),
  listFlavors:  ()             => cloudClient.get('/cloud/flavors/'),
  listImages:   ()             => cloudClient.get('/cloud/images/'),
  listNetworks: ()             => cloudClient.get('/cloud/networks/'),
  cloudStatus:  ()             => cloudClient.get('/cloud/status/'),
};

// ---- Container Registry ----
export const registryApi = {
  // Repositories
  list:         ()                              => cloudClient.get<ContainerRepository[]>('/registries/'),
  get:          (id: string)                    => cloudClient.get<ContainerRepository>(`/registries/${id}/`),
  create:       (p: CreateRepositoryPayload)    => cloudClient.post<ContainerRepository>('/registries/', p),
  delete:       (id: string)                    => cloudClient.delete(`/registries/${id}/`),
  // Images
  images:       (id: string)                    => cloudClient.get(`/registries/${id}/images/`),
  deleteTag:    (id: string, tag: string)       => cloudClient.post(`/registries/${id}/delete_tag/`, { tag }),
  // Tokens (repo-scoped)
  tokens:       (id: string)                    => cloudClient.get<RegistryToken[]>(`/registries/${id}/tokens/`),
  createToken:  (id: string, p: CreateTokenPayload) => cloudClient.post<RegistryToken>(`/registries/${id}/create_token/`, p),
  revokeToken:  (id: string, token_id: string)  => cloudClient.post(`/registries/${id}/revoke_token/`, { token_id }),
  // Global tokens
  myTokens:           ()                        => cloudClient.get<RegistryToken[]>('/registries/my_tokens/'),
  createGlobalToken:  (p: CreateTokenPayload)   => cloudClient.post<RegistryToken>('/registries/create_global_token/', p),
  revokeGlobalToken:  (token_id: string)        => cloudClient.post('/registries/revoke_global_token/', { token_id }),
  // Replication
  replication:  (id: string)                    => cloudClient.get(`/registries/${id}/replication/`),
  replicate:    (id: string, p: ReplicatePayload) => cloudClient.post(`/registries/${id}/replicate/`, p),
  // Usage & scan
  usage:        (id: string)                    => cloudClient.get(`/registries/${id}/usage/`),
  scan:         (id: string, tag: string)       => cloudClient.post<ScanResult>(`/registries/${id}/scan/`, { tag }),
  // Catalogue
  regions:      ()                              => cloudClient.get('/registries/regions/'),
};

// ---- Domains ----
export const domainApi = {
  // CRUD
  list:              ()                                           => cloudClient.get<Domain[]>('/domains/'),
  get:               (id: string)                                 => cloudClient.get<Domain>(`/domains/${id}/`),
  delete:            (id: string)                                 => cloudClient.delete(`/domains/${id}/`),
  // Search & catalogue
  checkAvailability: (name: string, tlds?: string[])              => cloudClient.post<AvailabilityResult>('/domains/check_availability/', { domain_name: name, tlds }),
  tldCatalogue:      ()                                           => cloudClient.get<TldInfo[]>('/domains/tld_catalogue/'),
  // Registration & transfer
  register:          (p: RegisterDomainPayload)                   => cloudClient.post<Domain>('/domains/register/', p),
  transfer:          (p: TransferDomainPayload)                   => cloudClient.post<Domain>('/domains/transfer/', p),
  // Renewal
  renew:             (id: string, years: number)                  => cloudClient.post(`/domains/${id}/renew/`, { years }),
  // DNS
  dnsZone:           (id: string)                                 => cloudClient.get(`/domains/${id}/dns_zone/`),
  dnsRecords:        (id: string)                                 => cloudClient.get<DnsRecord[]>(`/domains/${id}/dns_records/`),
  addDnsRecord:      (id: string, p: CreateDnsRecordPayload)      => cloudClient.post<DnsRecord>(`/domains/${id}/add_dns_record/`, p),
  updateDnsRecord:   (id: string, recordset_id: string, records: string[], ttl?: number) => cloudClient.post<DnsRecord>(`/domains/${id}/update_dns_record/`, { recordset_id, records, ttl }),
  deleteDnsRecord:   (id: string, recordset_id: string)           => cloudClient.post(`/domains/${id}/delete_dns_record/`, { recordset_id }),
  dnsTemplates:      (id: string)                                 => cloudClient.get<any[]>(`/domains/${id}/dns_templates/`),
  applyDnsTemplate:  (id: string, template_name: string)         => cloudClient.post(`/domains/${id}/dns_templates/`, { template_name }),
  // SSL
  sslCerts:          (id: string)                                 => cloudClient.get<SslCertificate[]>(`/domains/${id}/ssl_certs/`),
  requestSsl:        (id: string)                                 => cloudClient.post(`/domains/${id}/request_ssl/`),
  // Settings
  toggleAutoRenew:   (id: string)                                 => cloudClient.post<{ auto_renew: boolean }>(`/domains/${id}/toggle_auto_renew/`),
  updateNameservers: (id: string, nameservers: string[])          => cloudClient.post(`/domains/${id}/update_nameservers/`, { nameservers }),
  setPrivacy:        (id: string, enable: boolean)                => cloudClient.post(`/domains/${id}/set_privacy/`, { enable }),
  enableDnssec:      (id: string)                                 => cloudClient.post(`/domains/${id}/enable_dnssec/`),
  // One-click switch workflow
  switchDomain:      (
    id: string,
    payload?: {
      target_endpoint?: string;
      lb_resource_id?: string;
      cdn_resource_id?: string;
      cluster_resource_id?: string;
    }
  ) => cloudClient.post(`/domains/${id}/switch_domain/`, payload || {}),
  switchStatus:      (id: string)                                 => cloudClient.get(`/domains/${id}/switch_status/`),
  billing:           (id: string)                                 => cloudClient.get<Invoice[]>(`/domains/${id}/billing/`),
  // Admin
  adminSummary:      ()                                           => cloudClient.get('/domains/admin/summary/'),
  adminDomains:      ()                                           => cloudClient.get('/domains/admin/domains/'),
  adminUsers:        ()                                           => cloudClient.get('/domains/admin/users/'),
  adminForceStatus:  (id: string, status: string)                => cloudClient.post(`/domains/${id}/admin/force_status/`, { status }),
  adminTldPricing:   ()                                           => cloudClient.get('/domains/admin/tld_pricing/'),
  adminMetrics:      ()                                           => cloudClient.get('/domains/admin/metrics/'),
};

// ---- Email Marketing ----
export const marketingApi = {
  // Campaigns
  listCampaigns:      ()                                          => cloudClient.get<Campaign[]>('/campaigns/'),
  getCampaign:        (id: string)                               => cloudClient.get<Campaign>(`/campaigns/${id}/`),
  createCampaign:     (p: CreateCampaignPayload)                 => cloudClient.post<Campaign>('/campaigns/', p),
  updateCampaign:     (id: string, p: Partial<CreateCampaignPayload>) => cloudClient.patch<Campaign>(`/campaigns/${id}/`, p),
  deleteCampaign:     (id: string)                               => cloudClient.delete(`/campaigns/${id}/`),
  sendCampaign:       (id: string)                               => cloudClient.post(`/campaigns/${id}/send/`),
  sendTest:           (id: string, email: string)                => cloudClient.post(`/campaigns/${id}/send_test/`, { email }),
  scheduleCampaign:   (id: string, at: string)                   => cloudClient.post(`/campaigns/${id}/schedule/`, { scheduled_at: at }),
  cancelCampaign:     (id: string)                               => cloudClient.post(`/campaigns/${id}/cancel/`),
  duplicateCampaign:  (id: string)                               => cloudClient.post<Campaign>(`/campaigns/${id}/duplicate/`),
  campaignAnalytics:  (id: string)                               => cloudClient.get(`/campaigns/${id}/analytics/`),
  accountStats:       ()                                          => cloudClient.get<AccountStats>('/campaigns/account_stats/'),

  // Contact Lists
  listContactLists:   ()                                          => cloudClient.get<ContactList[]>('/contact-lists/'),
  createContactList:  (p: CreateContactListPayload)               => cloudClient.post<ContactList>('/contact-lists/', p),
  deleteContactList:  (id: string)                               => cloudClient.delete(`/contact-lists/${id}/`),
  importContacts:     (id: string, csv: string)                  => cloudClient.post(`/contact-lists/${id}/import_csv/`, { csv }),
  exportContactsUrl:  (id: string)                               => `/contact-lists/${id}/export_csv/`,

  // Contacts
  listContacts:       (listId: string)                           => cloudClient.get<Contact[]>(`/contacts/?list=${listId}`),
  createContact:      (p: CreateContactPayload)                  => cloudClient.post<Contact>('/contacts/', p),
  deleteContact:      (id: number)                               => cloudClient.delete(`/contacts/${id}/`),
  unsubscribeContact: (id: number)                               => cloudClient.post(`/contacts/${id}/unsubscribe/`),

  // Templates
  listTemplates:      ()                                          => cloudClient.get<EmailTemplate[]>('/email-templates/'),
  createTemplate:     (p: CreateTemplatePayload)                 => cloudClient.post<EmailTemplate>('/email-templates/', p),
  updateTemplate:     (id: string, p: Partial<CreateTemplatePayload>) => cloudClient.patch<EmailTemplate>(`/email-templates/${id}/`, p),
  deleteTemplate:     (id: string)                               => cloudClient.delete(`/email-templates/${id}/`),
  duplicateTemplate:  (id: string)                               => cloudClient.post<EmailTemplate>(`/email-templates/${id}/duplicate/`),

  // Automations
  listAutomations:    ()                                          => cloudClient.get<Automation[]>('/automations/'),
  createAutomation:   (p: CreateAutomationPayload)               => cloudClient.post<Automation>('/automations/', p),
  deleteAutomation:   (id: string)                               => cloudClient.delete(`/automations/${id}/`),
  activateAutomation: (id: string)                               => cloudClient.post(`/automations/${id}/activate/`),
  deactivateAutomation: (id: string)                             => cloudClient.post(`/automations/${id}/deactivate/`),
};

export const marketingSuiteApi = {
  overview: () => cloudClient.get<MarketingOverviewResponse>('/marketing/overview/'),
};

// ---- Email Service ----
export const emailApi = {
  // Email domains
  emailDomains:     ()                                           => cloudClient.get<EmailDomain[]>('/email-domains/'),
  getEmailDomain:   (id: number)                                 => cloudClient.get<EmailDomain>(`/email-domains/${id}/`),
  enableEmail:      (domain_resource_id: string)                 => cloudClient.post<EmailDomain>('/email-domains/', { domain_resource_id }),
  provisionDns:     (id: number)                                 => cloudClient.post<EmailDomain>(`/email-domains/${id}/provision_dns/`),
  generateDkim:     (id: number, selector?: string)              => cloudClient.post<DkimKey>(`/email-domains/${id}/generate_dkim/`, { selector }),
  clientSettings:   (id: number)                                 => cloudClient.get<MailClientSettings>(`/email-domains/${id}/client_settings/`),
  emailActivity:    (id: number)                                 => cloudClient.get<EmailActivityLog[]>(`/email-domains/${id}/activity/`),
  // Mailboxes
  listMailboxes:    ()                                           => cloudClient.get<Mailbox[]>('/mailboxes/'),
  getMailbox:       (id: string)                                 => cloudClient.get<Mailbox>(`/mailboxes/${id}/`),
  createMailbox:    (p: CreateMailboxPayload)                    => cloudClient.post<Mailbox>('/mailboxes/', p),
  updateMailbox:    (id: string, p: UpdateMailboxPayload)        => cloudClient.patch<Mailbox>(`/mailboxes/${id}/`, p),
  deleteMailbox:    (id: string)                                 => cloudClient.delete(`/mailboxes/${id}/`),
  changePassword:   (id: string, new_password: string)          => cloudClient.post(`/mailboxes/${id}/change_password/`, { new_password }),
  suspendMailbox:   (id: string)                                 => cloudClient.post(`/mailboxes/${id}/suspend/`),
  activateMailbox:  (id: string)                                 => cloudClient.post(`/mailboxes/${id}/activate/`),
  mailboxUsage:     (id: string)                                 => cloudClient.get(`/mailboxes/${id}/usage/`),
  generatePassword: (length?: number)                            => cloudClient.post<{ password: string }>('/mailboxes/generate_password/', { length }),
  // Aliases
  listAliases:      ()                                           => cloudClient.get<EmailAlias[]>('/email-aliases/'),
  createAlias:      (p: CreateAliasPayload)                      => cloudClient.post<EmailAlias>('/email-aliases/', p),
  deleteAlias:      (id: number)                                 => cloudClient.delete(`/email-aliases/${id}/`),
};

// ---- Monitoring & Incidents ----
export const monitoringApi = {
  // Overview
  overview:          ()                                          => cloudClient.get<MonitoringOverview>('/monitoring/overview/'),

  // Metrics
  metricSeries:      (resource: string, metric: MetricName, hours?: number) =>
    cloudClient.get<MetricSeries>(`/metrics/?resource=${resource}&metric=${metric}&hours=${hours ?? 24}`),
  availableMetrics:  ()                                          => cloudClient.get('/metrics/available/'),
  ingestMetric:      (p: { resource_id: string; service: string; metric: string; value: number; unit?: string }) =>
    cloudClient.post('/metrics/ingest/', p),

  // Alert Rules
  listAlertRules:    ()                                          => cloudClient.get<AlertRule[]>('/alert-rules/'),
  createAlertRule:   (p: CreateAlertRulePayload)                 => cloudClient.post<AlertRule>('/alert-rules/', p),
  updateAlertRule:   (id: string, p: Partial<CreateAlertRulePayload>) => cloudClient.patch<AlertRule>(`/alert-rules/${id}/`, p),
  deleteAlertRule:   (id: string)                               => cloudClient.delete(`/alert-rules/${id}/`),
  enableAlertRule:   (id: string)                               => cloudClient.post(`/alert-rules/${id}/enable/`),
  disableAlertRule:  (id: string)                               => cloudClient.post(`/alert-rules/${id}/disable/`),

  // Fired Alerts
  listAlerts:        (state?: string)                           => cloudClient.get<Alert[]>(`/alerts/${state ? `?state=${state}` : ''}`),
  resolveAlert:      (id: number)                               => cloudClient.post(`/alerts/${id}/resolve/`),
  silenceAlert:      (id: number)                               => cloudClient.post(`/alerts/${id}/silence/`),

  // Incidents
  listIncidents:     (filters?: { service?: string; status?: string }) =>
    cloudClient.get<Incident[]>(`/incidents/${filters?.service ? `?service=${filters.service}` : filters?.status ? `?status=${filters.status}` : ''}`),
  getIncident:       (id: string)                               => cloudClient.get<Incident>(`/incidents/${id}/`),
  createIncident:    (p: CreateIncidentPayload)                  => cloudClient.post<Incident>('/incidents/', p),
  updateIncidentStatus: (id: string, status: string, message: string) =>
    cloudClient.post(`/incidents/${id}/update_status/`, { status, message }),
  assignIncident:    (id: string, user_id: number)              => cloudClient.post(`/incidents/${id}/assign/`, { user_id }),

  // Logs
  logs:              (filters?: { service?: string; search?: string; hours?: number; limit?: number }) => {
    const p = new URLSearchParams();
    if (filters?.service) p.set('service', filters.service);
    if (filters?.search)  p.set('search',  filters.search);
    if (filters?.hours)   p.set('hours',   String(filters.hours));
    if (filters?.limit)   p.set('limit',   String(filters.limit));
    return cloudClient.get<LogStream>(`/logs/?${p.toString()}`);
  },
};

// ---- Billing ----
export const billingApi = {
  // Overview
  overview:             ()                              => cloudClient.get<BillingOverview>('/billing/overview/'),

  // Account
  getAccount:           ()                              => cloudClient.get<BillingAccount>('/billing/account/'),
  updateAccount:        (p: UpdateBillingAccountPayload) => cloudClient.patch<BillingAccount>('/billing/account/', p),
  changePlan:           (plan: string)                  => cloudClient.post<{ old_plan: string; new_plan: string; new_price: number; message: string }>('/billing/account/change-plan/', { plan }),

  // Payment Methods
  listPaymentMethods:   ()                              => cloudClient.get<PaymentMethod[]>('/billing/payment-methods/'),
  addPaymentMethod:     (p: AddPaymentMethodPayload)    => cloudClient.post<PaymentMethod>('/billing/payment-methods/', p),
  deletePaymentMethod:  (id: number)                   => cloudClient.delete(`/billing/payment-methods/${id}/`),
  setDefaultPaymentMethod: (id: number)                => cloudClient.post(`/billing/payment-methods/${id}/set-default/`),

  // Invoices
  listInvoices:         ()                              => cloudClient.get<Invoice[]>('/billing/invoices/'),
  getInvoice:           (id: number)                   => cloudClient.get<Invoice>(`/billing/invoices/${id}/`),
  payInvoice:           (id: number)                   => cloudClient.post<Invoice>(`/billing/invoices/${id}/pay/`),

  // Usage (current month)
  currentUsage:         ()                              => cloudClient.get<CurrentUsage>('/billing/usage/'),

  // Credits
  listCredits:          ()                              => cloudClient.get<CreditNote[]>('/billing/credits/'),

  // Weekly snapshots — per-service weekly rollups (last N ISO weeks)
  weeklySnapshots:      (weeks = 12)                   => cloudClient.get('/billing/weekly/', { params: { weeks } }),
  recalculateWeekly:    (weeks_back = 12)              => cloudClient.post('/billing/weekly/recalculate/', { weeks_back }),

  // Spending analysis — WoW, MTD, trends, projections
  spendingAnalysis:     ()                              => cloudClient.get('/billing/analysis/'),

  // Usage ingestion — called by any service to record a billable event
  ingestUsage:          (p: {
    service:        string;
    metric:         string;
    quantity:       number;
    unit?:          string;
    resource_id?:   string;
    resource_type?: string;
    unit_price?:    number;
    event_time?:    string;
  })                                                     => cloudClient.post('/billing/ingest/', p),
  flushUsageEvents:     ()                              => cloudClient.post('/billing/ingest/flush/'),
};

// ---- Team System ----
export const teamApi = {
  // Teams CRUD
  list:                  ()                                          => cloudClient.get('/teams/'),
  get:                   (teamId: string)                           => cloudClient.get(`/teams/${teamId}/`),
  create:                (p: Record<string, unknown>)               => cloudClient.post('/teams/', p),
  update:                (teamId: string, p: Record<string, unknown>) => cloudClient.patch(`/teams/${teamId}/`, p),
  delete:                (teamId: string)                           => cloudClient.delete(`/teams/${teamId}/`),

  // Members
  members:               (teamId: string)                           => cloudClient.get(`/teams/${teamId}/members/`),
  addMember:             (teamId: string, userId: number, role: string) => cloudClient.post(`/teams/${teamId}/members/add/`, { user_id: userId, role }),
  removeMember:          (teamId: string, userId: number)           => cloudClient.delete(`/teams/${teamId}/members/${userId}/`),
  changeRole:            (teamId: string, userId: number, role: string) => cloudClient.patch(`/teams/${teamId}/members/${userId}/role/`, { role }),

  // Permissions
  permissions:           (teamId: string)                           => cloudClient.get(`/teams/${teamId}/permissions/`),
  updatePermissions:     (teamId: string, perms: Record<string, boolean>) => cloudClient.post(`/teams/${teamId}/permissions/update/`, { permissions: perms }),
  applyTemplate:         (teamId: string, template: string)         => cloudClient.post(`/teams/${teamId}/permissions/apply-template/`, { template }),
  permissionTemplates:   ()                                          => cloudClient.get('/teams/permission-templates/'),

  // Resources
  resources:             (teamId: string)                           => cloudClient.get(`/teams/${teamId}/resources/`),
  attachResource:        (teamId: string, p: Record<string, unknown>) => cloudClient.post(`/teams/${teamId}/resources/attach/`, p),
  detachResource:        (teamId: string, resourcePk: number)       => cloudClient.delete(`/teams/${teamId}/resources/${resourcePk}/`),

  // Portfolios
  portfolios:            (teamId: string)                           => cloudClient.get(`/teams/${teamId}/portfolios/`),
  createPortfolio:       (teamId: string, p: Record<string, unknown>) => cloudClient.post(`/teams/${teamId}/portfolios/`, p),
  deletePortfolio:       (teamId: string, portfolioId: string)      => cloudClient.delete(`/teams/${teamId}/portfolios/${portfolioId}/`),
  addPortfolioItem:      (teamId: string, portfolioId: string, p: Record<string, unknown>) => cloudClient.post(`/teams/${teamId}/portfolios/${portfolioId}/items/`, p),

  // Activity
  activity:              (teamId: string)                           => cloudClient.get(`/teams/${teamId}/activity/`),

  // Invitations
  invitations:           (teamId: string)                           => cloudClient.get(`/teams/${teamId}/invitations/`),
  invite:                (teamId: string, email: string, role: string) => cloudClient.post(`/teams/${teamId}/invitations/`, { email, role }),
  revokeInvite:          (teamId: string, inviteId: string)         => cloudClient.post(`/teams/${teamId}/invitations/${inviteId}/revoke/`),
};

// ── IAM ───────────────────────────────────────────────────────────────────────
export const iamApi = {
  users: {
    list:            ()                           => cloudClient.get('/iam/users/'),
    get:             (id: number)                 => cloudClient.get(`/iam/users/${id}/`),
    create:          (p: Record<string, unknown>) => cloudClient.post('/iam/users/', p),
    update:          (id: number, p: Record<string, unknown>) => cloudClient.patch(`/iam/users/${id}/`, p),
    delete:          (id: number)                 => cloudClient.delete(`/iam/users/${id}/`),
    enableMFA:       (id: number)                 => cloudClient.post(`/iam/users/${id}/enable_mfa/`),
    disableMFA:      (id: number)                 => cloudClient.post(`/iam/users/${id}/disable_mfa/`),
    createAccessKey: (id: number)                 => cloudClient.post(`/iam/users/${id}/create_access_key/`),
    accessKeys:      (id: number)                 => cloudClient.get(`/iam/users/${id}/access_keys/`),
    mfaDevices:      (id: number)                 => cloudClient.get(`/iam/users/${id}/mfa_devices/`),
  },
  groups: {
    list:        ()                            => cloudClient.get('/iam/groups/'),
    get:         (id: number)                  => cloudClient.get(`/iam/groups/${id}/`),
    create:      (p: Record<string, unknown>)  => cloudClient.post('/iam/groups/', p),
    update:      (id: number, p: Record<string, unknown>) => cloudClient.patch(`/iam/groups/${id}/`, p),
    delete:      (id: number)                  => cloudClient.delete(`/iam/groups/${id}/`),
    addMember:   (id: number, userId: number)  => cloudClient.post(`/iam/groups/${id}/add_member/`, { user_id: userId }),
    removeMember:(id: number, userId: number)  => cloudClient.post(`/iam/groups/${id}/remove_member/`, { user_id: userId }),
  },
  roles: {
    list:       ()                            => cloudClient.get('/iam/roles/'),
    get:        (id: number)                  => cloudClient.get(`/iam/roles/${id}/`),
    create:     (p: Record<string, unknown>)  => cloudClient.post('/iam/roles/', p),
    update:     (id: number, p: Record<string, unknown>) => cloudClient.patch(`/iam/roles/${id}/`, p),
    delete:     (id: number)                  => cloudClient.delete(`/iam/roles/${id}/`),
    assumeRole: (id: number)                  => cloudClient.post(`/iam/roles/${id}/assume_role/`),
  },
  policies: {
    list:     ()                            => cloudClient.get('/iam/policies/'),
    get:      (id: number)                  => cloudClient.get(`/iam/policies/${id}/`),
    create:   (p: Record<string, unknown>)  => cloudClient.post('/iam/policies/', p),
    update:   (id: number, p: Record<string, unknown>) => cloudClient.patch(`/iam/policies/${id}/`, p),
    delete:   (id: number)                  => cloudClient.delete(`/iam/policies/${id}/`),
    simulate: (id: number, action: string, resource: string) => cloudClient.post(`/iam/policies/${id}/simulate/`, { action, resource }),
  },
  accessKeys: {
    list:       ()          => cloudClient.get('/iam/access-keys/'),
    activate:   (id: number)=> cloudClient.post(`/iam/access-keys/${id}/activate/`),
    deactivate: (id: number)=> cloudClient.post(`/iam/access-keys/${id}/deactivate/`),
    delete:     (id: number)=> cloudClient.delete(`/iam/access-keys/${id}/`),
  },
  auditLogs: {
    list: (params?: Record<string, unknown>) => cloudClient.get('/iam/audit-logs/', { params }),
  },
};

// ── KMS ───────────────────────────────────────────────────────────────────────
export const kmsApi = {
  list:              ()                            => cloudClient.get('/kms/keys/'),
  get:               (id: number)                  => cloudClient.get(`/kms/keys/${id}/`),
  create:            (p: Record<string, unknown>)  => cloudClient.post('/kms/keys/', p),
  rotate:            (id: number)                  => cloudClient.post(`/kms/keys/${id}/rotate/`),
  disable:           (id: number)                  => cloudClient.post(`/kms/keys/${id}/disable/`),
  enable:            (id: number)                  => cloudClient.post(`/kms/keys/${id}/enable/`),
  scheduleDeletion:  (id: number, days: number)    => cloudClient.post(`/kms/keys/${id}/schedule_deletion/`, { days }),
  cancelDeletion:    (id: number)                  => cloudClient.post(`/kms/keys/${id}/cancel_deletion/`),
  usageLogs:         (id: number)                  => cloudClient.get(`/kms/keys/${id}/usage_logs/`),
  rotationHistory:   (id: number)                  => cloudClient.get(`/kms/keys/${id}/rotation_history/`),
  summary:           ()                            => cloudClient.get('/kms/keys/summary/'),
};

// ── Secrets Vault ─────────────────────────────────────────────────────────────
export const secretsApi = {
  list:             ()                            => cloudClient.get('/secrets/vault/'),
  get:              (id: number)                  => cloudClient.get(`/secrets/vault/${id}/`),
  create:           (p: Record<string, unknown>)  => cloudClient.post('/secrets/vault/', p),
  getValue:         (id: number)                  => cloudClient.post(`/secrets/vault/${id}/value/`),
  putValue:         (id: number, value: string, encKey?: string) => cloudClient.post(`/secrets/vault/${id}/put_value/`, { value, encryption_key_id: encKey }),
  rotate:           (id: number, newValue: string) => cloudClient.post(`/secrets/vault/${id}/rotate/`, { new_value: newValue }),
  scheduleDeletion: (id: number, days: number)    => cloudClient.post(`/secrets/vault/${id}/schedule_deletion/`, { days }),
  restore:          (id: number)                  => cloudClient.post(`/secrets/vault/${id}/restore/`),
  versions:         (id: number)                  => cloudClient.get(`/secrets/vault/${id}/versions/`),
  accessLogs:       (id: number)                  => cloudClient.get(`/secrets/vault/${id}/access_logs/`),
  expiringSoon:     ()                            => cloudClient.get('/secrets/vault/expiring_soon/'),
  summary:          ()                            => cloudClient.get('/secrets/vault/summary/'),
};

// ── Zero-Trust ────────────────────────────────────────────────────────────────
export const zeroTrustApi = {
  policies: {
    list:    ()         => cloudClient.get('/zero-trust/policies/'),
    get:     (id: number) => cloudClient.get(`/zero-trust/policies/${id}/`),
    create:  (p: Record<string, unknown>) => cloudClient.post('/zero-trust/policies/', p),
    update:  (id: number, p: Record<string, unknown>) => cloudClient.patch(`/zero-trust/policies/${id}/`, p),
    enable:  (id: number) => cloudClient.post(`/zero-trust/policies/${id}/enable/`),
    disable: (id: number) => cloudClient.post(`/zero-trust/policies/${id}/disable/`),
    summary: () => cloudClient.get('/zero-trust/policies/summary/'),
  },
  devices: {
    list:    () => cloudClient.get('/zero-trust/devices/'),
    get:     (id: number) => cloudClient.get(`/zero-trust/devices/${id}/`),
    assess:  (id: number) => cloudClient.post(`/zero-trust/devices/${id}/assess/`),
    summary: () => cloudClient.get('/zero-trust/devices/summary/'),
  },
  accessLogs: {
    list:    (params?: Record<string, unknown>) => cloudClient.get('/zero-trust/access-logs/', { params }),
    summary: () => cloudClient.get('/zero-trust/access-logs/summary/'),
  },
};

// ── SLO Monitoring ────────────────────────────────────────────────────────────
export const sloApi = {
  list:        ()         => cloudClient.get('/monitoring/slos/'),
  get:         (id: number) => cloudClient.get(`/monitoring/slos/${id}/`),
  create:      (p: Record<string, unknown>) => cloudClient.post('/monitoring/slos/', p),
  update:      (id: number, p: Record<string, unknown>) => cloudClient.patch(`/monitoring/slos/${id}/`, p),
  delete:      (id: number) => cloudClient.delete(`/monitoring/slos/${id}/`),
  recalculate: (id: number) => cloudClient.post(`/monitoring/slos/${id}/recalculate/`),
  summary:     () => cloudClient.get('/monitoring/slos/summary/'),
};

// ── Distributed Tracing ───────────────────────────────────────────────────────
export const tracingApi = {
  list:     (params?: Record<string, unknown>) => cloudClient.get('/monitoring/traces/', { params }),
  get:      (id: number)  => cloudClient.get(`/monitoring/traces/${id}/`),
  services: () => cloudClient.get('/monitoring/traces/services/'),
  summary:  () => cloudClient.get('/monitoring/traces/summary/'),
};

// ── DDoS Protection ───────────────────────────────────────────────────────────
export const ddosApi = {
  rules: {
    list:    ()          => cloudClient.get('/monitoring/ddos-rules/'),
    get:     (id: number) => cloudClient.get(`/monitoring/ddos-rules/${id}/`),
    create:  (p: Record<string, unknown>) => cloudClient.post('/monitoring/ddos-rules/', p),
    update:  (id: number, p: Record<string, unknown>) => cloudClient.patch(`/monitoring/ddos-rules/${id}/`, p),
    delete:  (id: number) => cloudClient.delete(`/monitoring/ddos-rules/${id}/`),
    enable:  (id: number) => cloudClient.post(`/monitoring/ddos-rules/${id}/enable/`),
    disable: (id: number) => cloudClient.post(`/monitoring/ddos-rules/${id}/disable/`),
    summary: () => cloudClient.get('/monitoring/ddos-rules/summary/'),
  },
  attacks: {
    list:    (params?: Record<string, unknown>) => cloudClient.get('/monitoring/ddos-attacks/', { params }),
    get:     (id: number) => cloudClient.get(`/monitoring/ddos-attacks/${id}/`),
  },
};
