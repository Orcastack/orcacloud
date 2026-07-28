# OrcaCloud Services - Model Registry
#
# Re-exports all models from domain-specific files so that
# `from .models import X` works across business_logic, signals, and tasks.

from .core.base_models import (
    TimeStampedModel,
    ResourceModel,
    Status,
    AuditLog,
    ResourceTag,
    ResourceQuota,
    Alert,
    UserProfile,
    UserAPIKey,
)

from .compute.models import (
    Flavor,
    Image,
    Instance,
    InstanceMetric,
    KubernetesCluster,
    KubernetesNode,
    ServerlessFunction,
    ServerlessFunctionTrigger,
    AutoScalingGroup,
    ScalingPolicy,
)

from .storage.models import (
    StorageBucket,
    S3Object,
    StorageVolume,
    StorageSnapshot,
    FileShare,
    FileShareMount,
    EncryptionKey,
    BackupPolicy,
    Backup,
    StorageMetric,
)

# Convenience aliases used in tests and business logic
Volume = StorageVolume
Bucket = StorageBucket

from .networking.models import (
    VPC,
    Subnet,
    SecurityGroup,
    SecurityGroupRule,
    LoadBalancer,
    TargetGroup,
    Listener,
    RouteTable,
    Route,
    DNSRecord,
    CDNDistribution,
    VPNGateway,
    CustomerGateway,
    VPNConnection,
    InternetGateway,
    NATGateway,
)

from .onboarding.models import OnboardingProgress

from .monitoring.models import (
    ServiceHealth,
    MetricSnapshot,
    AlertRule,
    MonitoringAlert,
    Incident,
    IncidentUpdate,
    PlatformActivityEvent,
    ServiceLevelObjective,
    TraceSpan,
    DDoSProtectionRule,
    DDoSAttackEvent,
)

from .iam.models import (
    IAMGroup,
    IAMRole,
    IAMPolicy,
    AccessKey,
    MFADevice,
    IAMUserProfile,
    IAMAuditLog,
)

from .kms.models import (
    KMSEncryptionKey,
    KeyRotationRecord,
    KeyUsageLog,
)

from .secrets.models import (
    Secret,
    SecretVersion,
    SecretAccessLog,
)

from .zero_trust.models import (
    ZeroTrustPolicy,
    DevicePosture,
    ZeroTrustAccessLog,
)

from .billing.models import (
    BillingAccount,
    PaymentMethod,
    Invoice,
    InvoiceLineItem,
    UsageRecord,
    CreditNote,
)

from .domain.models import (
    Domain,
    DnsZone,
    DomainDnsRecord,
    DomainTransfer,
    SslCertificate,
)

from .teams.models import (
    Team,
    TeamMember,
    TeamPermission,
    TeamResource,
    Portfolio,
    PortfolioResource,
    TeamActivityLog,
    TeamInvitation,
)

from .pipelines.models import (
    Project,
    Repository,
    PipelineFile,
    Pipeline,
    PipelineJob,
    JobLog,
    PipelineApproval,
    PipelineRule,
    Environment,
    PipelineArtifact,
)

__all__ = [
    # Base
    'TimeStampedModel', 'ResourceModel', 'Status',
    'AuditLog', 'ResourceTag', 'ResourceQuota', 'Alert',
    'UserProfile', 'UserAPIKey',
    # Compute
    'Flavor', 'Image', 'Instance', 'InstanceMetric',
    'KubernetesCluster', 'KubernetesNode',
    'ServerlessFunction', 'ServerlessFunctionTrigger',
    'AutoScalingGroup', 'ScalingPolicy',
    # Storage
    'StorageBucket', 'S3Object', 'StorageVolume', 'StorageSnapshot',
    'FileShare', 'FileShareMount', 'EncryptionKey',
    'BackupPolicy', 'Backup', 'StorageMetric',
    'Volume', 'Bucket',
    # Networking
    'VPC', 'Subnet', 'SecurityGroup', 'SecurityGroupRule',
    'LoadBalancer', 'TargetGroup', 'Listener',
    'RouteTable', 'Route',
    'DNSRecord', 'CDNDistribution',
    'VPNGateway', 'CustomerGateway', 'VPNConnection',
    'InternetGateway', 'NATGateway',
    # Onboarding
    'OnboardingProgress',
    # Monitoring (extended)
    'ServiceHealth', 'MetricSnapshot', 'AlertRule',
    'MonitoringAlert', 'Incident', 'IncidentUpdate', 'PlatformActivityEvent',
    'ServiceLevelObjective', 'TraceSpan',
    'DDoSProtectionRule', 'DDoSAttackEvent',
    # Domain
    'Domain', 'DnsZone', 'DomainDnsRecord', 'DomainTransfer', 'SslCertificate',
    # Teams
    'Team', 'TeamMember', 'TeamPermission', 'TeamResource',
    'Portfolio', 'PortfolioResource', 'TeamActivityLog', 'TeamInvitation',
    # IAM
    'IAMGroup', 'IAMRole', 'IAMPolicy', 'AccessKey', 'MFADevice', 'IAMUserProfile', 'IAMAuditLog',
    # KMS
    'KMSEncryptionKey', 'KeyRotationRecord', 'KeyUsageLog',
    # Secrets Vault
    'Secret', 'SecretVersion', 'SecretAccessLog',
    # Zero-Trust
    'ZeroTrustPolicy', 'DevicePosture', 'ZeroTrustAccessLog',
]
