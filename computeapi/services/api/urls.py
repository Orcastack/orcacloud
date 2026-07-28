# OrcaCloud Services API URLs

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from ..onboarding.views import onboarding_checklist, onboarding_checklist_update, dashboard_stats, wizard_options
from ..openstack.views import (
    cloud_status,
    servers_list_create, server_detail_delete, server_start, server_stop, server_reboot,
    flavors_list, images_list,
    networks_list_create, network_delete, subnets_list_create,
    security_groups_list_create, security_group_add_rule,
    floating_ips,
    volumes_list_create, volume_detail_delete, volume_attach, volume_detach,
    snapshots_list_create, snapshot_delete,
)

# Import ViewSets
from ..compute.viewsets import (
    FlavorViewSet, ImageViewSet, InstanceViewSet,
    KubernetesClusterViewSet, ServerlessFunctionViewSet,
    AutoScalingGroupViewSet
)
from ..storage.viewsets import (
    StorageBucketViewSet, S3ObjectViewSet, StorageVolumeViewSet,
    StorageSnapshotViewSet, FileShareViewSet, EncryptionKeyViewSet,
    BackupPolicyViewSet, BackupViewSet
)
from ..networking.viewsets import (
    VPCViewSet, SubnetViewSet, SecurityGroupViewSet,
    LoadBalancerViewSet, TargetGroupViewSet, RouteTableViewSet,
    DNSRecordViewSet, CDNDistributionViewSet, VPNConnectionViewSet,
    VPNGatewayViewSet, InternetGatewayViewSet, NATGatewayViewSet
)
from ..database.viewsets import ManagedDatabaseViewSet
from ..container_registry.viewsets import ContainerRepositoryViewSet
from ..domain.viewsets import DomainViewSet, SslCertificateViewSet
from ..email.viewsets import EmailDomainViewSet, MailboxViewSet, EmailAliasViewSet
from ..marketing.viewsets import (
    CampaignViewSet, ContactListViewSet, ContactViewSet,
    EmailTemplateViewSet, AutomationViewSet,
)
from ..monitoring.viewsets import (
    MonitoringOverviewViewSet, MetricViewSet,
    AlertRuleViewSet, AlertViewSet,
    IncidentViewSet, LogViewSet,
    DevMonitoringViewSet,
)
from ..orchestration.viewsets import OrchestrationViewSet
from ..compliance.viewsets import ComplianceViewSet
from ..billing.viewsets import (
    BillingOverviewViewSet, BillingAccountViewSet,
    PaymentMethodViewSet, InvoiceViewSet,
    UsageViewSet, CreditViewSet,
)
from ..marketing.suite_viewsets import MarketingOverviewViewSet
from ..teams.viewsets import TeamViewSet
from ..containers.viewsets import ContainerViewSet
from ..pipelines.viewsets import (
    ProjectViewSet,
    RepositoryViewSet,
    PipelineFileViewSet,
    PipelineViewSet,
    PipelineJobViewSet,
    PipelineApprovalViewSet,
    PipelineRuleViewSet,
    EnvironmentViewSet,
    PipelineArtifactViewSet,
    PipelineDefinitionViewSet,
    PipelineRunViewSet,
    PipelineRunNodeViewSet,
)
from ..pipelines.views import SSHKeyViewSet
from ..kubernetes_integration.viewsets import KubeConfigViewSet, KubeSyncRunViewSet
from ..apim.viewsets import (
    ApimOverviewViewSet, ApiDefinitionViewSet, ApiGatewayViewSet,
    ApiConsumerViewSet, ApiKeyViewSet, ApiProductViewSet,
    ApiPolicyViewSet, ApimAnalyticsViewSet,
)
from ..groups.viewsets import GroupViewSet
from ..resources.viewsets import ResourceViewSet
from ..workspace.views import DevWorkspaceViewSet

# Create router and register viewsets
router = DefaultRouter()

# ============================================================================
# COMPUTE SERVICE ENDPOINTS
# ============================================================================
router.register(r'flavors', FlavorViewSet, basename='flavor')
router.register(r'images', ImageViewSet, basename='image')
router.register(r'instances', InstanceViewSet, basename='instance')
router.register(r'kubernetes-clusters', KubernetesClusterViewSet, basename='kubernetes-cluster')
router.register(r'serverless-functions', ServerlessFunctionViewSet, basename='serverless-function')
router.register(r'auto-scaling-groups', AutoScalingGroupViewSet, basename='auto-scaling-group')

# ============================================================================
# STORAGE SERVICE ENDPOINTS
# ============================================================================
router.register(r'buckets', StorageBucketViewSet, basename='bucket')
router.register(r's3-objects', S3ObjectViewSet, basename='s3-object')
router.register(r'volumes', StorageVolumeViewSet, basename='volume')
router.register(r'snapshots', StorageSnapshotViewSet, basename='snapshot')
router.register(r'file-shares', FileShareViewSet, basename='file-share')
router.register(r'encryption-keys', EncryptionKeyViewSet, basename='encryption-key')
router.register(r'backup-policies', BackupPolicyViewSet, basename='backup-policy')
router.register(r'backups', BackupViewSet, basename='backup')

# ============================================================================
# NETWORKING SERVICE ENDPOINTS
# ============================================================================
router.register(r'vpcs', VPCViewSet, basename='vpc')
router.register(r'subnets', SubnetViewSet, basename='subnet')
router.register(r'security-groups', SecurityGroupViewSet, basename='security-group')
router.register(r'load-balancers', LoadBalancerViewSet, basename='load-balancer')
router.register(r'target-groups', TargetGroupViewSet, basename='target-group')
router.register(r'route-tables', RouteTableViewSet, basename='route-table')
router.register(r'dns-records', DNSRecordViewSet, basename='dns-record')
router.register(r'cdn-distributions', CDNDistributionViewSet, basename='cdn-distribution')
router.register(r'vpn-connections', VPNConnectionViewSet, basename='vpn-connection')
router.register(r'vpn-gateways', VPNGatewayViewSet, basename='vpn-gateway')
router.register(r'internet-gateways', InternetGatewayViewSet, basename='internet-gateway')
router.register(r'nat-gateways', NATGatewayViewSet, basename='nat-gateway')

# ============================================================================
# DATABASE SERVICE ENDPOINTS
# ============================================================================
router.register(r'databases', ManagedDatabaseViewSet, basename='database')

# ============================================================================
# CONTAINER REGISTRY ENDPOINTS
# ============================================================================
router.register(r'registries', ContainerRepositoryViewSet, basename='registry')

# ============================================================================
# DOMAIN SERVICE ENDPOINTS
# ============================================================================
router.register(r'domains', DomainViewSet, basename='domain')
router.register(r'ssl-certificates', SslCertificateViewSet, basename='ssl-certificate')

# ============================================================================
# EMAIL SERVICE ENDPOINTS
# ============================================================================
router.register(r'email-domains', EmailDomainViewSet, basename='email-domain')
router.register(r'mailboxes',     MailboxViewSet,     basename='mailbox')
router.register(r'email-aliases', EmailAliasViewSet,  basename='email-alias')

# ============================================================================
# EMAIL MARKETING ENDPOINTS
# ============================================================================
router.register(r'campaigns',       CampaignViewSet,       basename='campaign')
router.register(r'contact-lists',   ContactListViewSet,    basename='contact-list')
router.register(r'contacts',        ContactViewSet,        basename='contact')
router.register(r'email-templates', EmailTemplateViewSet,  basename='email-template')
router.register(r'automations',     AutomationViewSet,     basename='automation')

# ============================================================================
# MONITORING & INCIDENT MANAGEMENT ENDPOINTS
# ============================================================================
router.register(r'monitoring/overview', MonitoringOverviewViewSet, basename='monitoring-overview')
router.register(r'monitoring/dev',      DevMonitoringViewSet,      basename='dev-monitoring')
router.register(r'metrics',             MetricViewSet,             basename='metric')
router.register(r'alert-rules',         AlertRuleViewSet,          basename='alert-rule')
router.register(r'alerts',              AlertViewSet,              basename='alert')
router.register(r'incidents',           IncidentViewSet,           basename='incident')
router.register(r'logs',                LogViewSet,                basename='log')
router.register(r'orchestration',       OrchestrationViewSet,      basename='orchestration')
router.register(r'compliance',          ComplianceViewSet,         basename='compliance')
router.register(r'marketing/overview',  MarketingOverviewViewSet,  basename='marketing-overview')

# ============================================================================
# TEAM SYSTEM ENDPOINTS
# ============================================================================
router.register(r'teams', TeamViewSet, basename='team')

# ── Billing ─────────────────────────────────────────────────────────────────
router.register(r'billing/overview',        BillingOverviewViewSet,  basename='billing-overview')
router.register(r'billing/account',         BillingAccountViewSet,   basename='billing-account')
router.register(r'billing/payment-methods', PaymentMethodViewSet,    basename='payment-method')
router.register(r'billing/invoices',        InvoiceViewSet,          basename='invoice')
router.register(r'billing/usage',           UsageViewSet,            basename='billing-usage')
router.register(r'billing/credits',         CreditViewSet,           basename='credit')

# ============================================================================
# CONTAINER DEPLOYMENT ENDPOINTS
# ============================================================================
router.register(r'containers', ContainerViewSet, basename='container')

# ============================================================================
# CI/CD PIPELINES ENDPOINTS
# ============================================================================
router.register(r'pipelines/projects',         ProjectViewSet,         basename='pipeline-project')
router.register(r'pipelines/repositories',     RepositoryViewSet,      basename='pipeline-repository')
router.register(r'pipelines/files',            PipelineFileViewSet,    basename='pipeline-file')
router.register(r'pipelines/runs',             PipelineViewSet,        basename='pipeline-run')
router.register(r'pipelines/jobs',             PipelineJobViewSet,     basename='pipeline-job')
router.register(r'pipelines/approvals',        PipelineApprovalViewSet, basename='pipeline-approval')
router.register(r'pipelines/rules',            PipelineRuleViewSet,    basename='pipeline-rule')
router.register(r'pipelines/environments',     EnvironmentViewSet,     basename='pipeline-environment')
router.register(r'pipelines/artifacts',        PipelineArtifactViewSet, basename='pipeline-artifact')
router.register(r'pipelines/definitions',      PipelineDefinitionViewSet, basename='pipeline-definition')
router.register(r'pipelines/pipeline-runs',    PipelineRunViewSet,        basename='pipeline-run-v2')
router.register(r'pipelines/run-nodes',        PipelineRunNodeViewSet,    basename='pipeline-run-node')
router.register(r'pipelines/ssh-keys',         SSHKeyViewSet,             basename='pipeline-ssh-key')

# ============================================================================
# KUBERNETES INTEGRATION ENDPOINTS
# ============================================================================
router.register(r'kubernetes/config',    KubeConfigViewSet,  basename='kube-config')
router.register(r'kubernetes/sync-runs', KubeSyncRunViewSet, basename='kube-sync-run')

# ============================================================================
# API MANAGEMENT ENDPOINTS
# ============================================================================
router.register(r'apim/overview',   ApimOverviewViewSet,   basename='apim-overview')
router.register(r'apim/apis',       ApiDefinitionViewSet,  basename='apim-api')
router.register(r'apim/gateways',   ApiGatewayViewSet,     basename='apim-gateway')
router.register(r'apim/consumers',  ApiConsumerViewSet,    basename='apim-consumer')
router.register(r'apim/keys',       ApiKeyViewSet,         basename='apim-key')
router.register(r'apim/products',   ApiProductViewSet,     basename='apim-product')
router.register(r'apim/policies',   ApiPolicyViewSet,      basename='apim-policy')
router.register(r'apim/analytics',  ApimAnalyticsViewSet,  basename='apim-analytics')

# ============================================================================
# GROUP PLATFORM ENDPOINTS
# ============================================================================
router.register(r'groups', GroupViewSet, basename='group')

# ============================================================================
# RESOURCE CONTROL CENTER
# ============================================================================
router.register(r'resources', ResourceViewSet, basename='resource')

# ============================================================================
# DEVELOPER WORKSPACE ENDPOINTS
# ============================================================================
router.register(r'dev-workspaces', DevWorkspaceViewSet, basename='dev-workspace')

# URL Patterns
urlpatterns = [
    path('', include(router.urls)),
    # Onboarding & Dashboard
    path('onboarding/checklist/',        onboarding_checklist,        name='onboarding-checklist-get'),
    path('onboarding/checklist/update/', onboarding_checklist_update, name='onboarding-checklist-update'),
    path('onboarding/stats/',            dashboard_stats,             name='dashboard-stats'),
    path('onboarding/wizard-options/',   wizard_options,              name='wizard-options'),

    # ── OpenStack Cloud API ─────────────────────────────────────────────────
    path('cloud/status/',                                cloud_status,              name='cloud-status'),

    # Servers
    path('cloud/servers/',                               servers_list_create,       name='cloud-servers'),
    path('cloud/servers/<str:server_id>/',               server_detail_delete,      name='cloud-server-detail'),
    path('cloud/servers/<str:server_id>/start/',         server_start,              name='cloud-server-start'),
    path('cloud/servers/<str:server_id>/stop/',          server_stop,               name='cloud-server-stop'),
    path('cloud/servers/<str:server_id>/reboot/',        server_reboot,             name='cloud-server-reboot'),

    # Flavors & Images
    path('cloud/flavors/',                               flavors_list,              name='cloud-flavors'),
    path('cloud/images/',                                images_list,               name='cloud-images'),

    # Networks
    path('cloud/networks/',                              networks_list_create,      name='cloud-networks'),
    path('cloud/networks/<str:network_id>/',             network_delete,            name='cloud-network-delete'),
    path('cloud/networks/<str:network_id>/subnets/',     subnets_list_create,       name='cloud-subnets'),

    # Security groups
    path('cloud/security-groups/',                       security_groups_list_create, name='cloud-security-groups'),
    path('cloud/security-groups/<str:sg_id>/rules/',     security_group_add_rule,   name='cloud-sg-rules'),

    # Floating IPs
    path('cloud/floating-ips/',                          floating_ips,              name='cloud-floating-ips'),

    # Volumes
    path('cloud/volumes/',                               volumes_list_create,       name='cloud-volumes'),
    path('cloud/volumes/<str:volume_id>/',               volume_detail_delete,      name='cloud-volume-detail'),
    path('cloud/volumes/<str:volume_id>/attach/',        volume_attach,             name='cloud-volume-attach'),
    path('cloud/volumes/<str:volume_id>/detach/',        volume_detach,             name='cloud-volume-detach'),

    # Snapshots
    path('cloud/snapshots/',                             snapshots_list_create,     name='cloud-snapshots'),
    path('cloud/snapshots/<str:snapshot_id>/',           snapshot_delete,           name='cloud-snapshot-delete'),
]
