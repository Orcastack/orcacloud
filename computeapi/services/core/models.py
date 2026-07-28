# OrcaCloud Services - Model Registry
#
# Re-exports all models from domain-specific files so that
# `from .models import X` works across business_logic, signals, and tasks.

from .base_models import (
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

from ..compute.models import (
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

from ..storage.models import (
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

from ..networking.models import (
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

from ..onboarding.models import OnboardingProgress

from ..monitoring.models import (
    ServiceHealth,
    MetricSnapshot,
    AlertRule,
    MonitoringAlert,
    Incident,
    IncidentUpdate,
)

from ..billing.models import (
    BillingAccount,
    PaymentMethod,
    Invoice,
    InvoiceLineItem,
    UsageRecord,
    CreditNote,
)

from ..domain.models import (
    Domain,
    DnsZone,
    DomainDnsRecord,
    DomainTransfer,
    SslCertificate,
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
    # Monitoring
    'ServiceHealth', 'MetricSnapshot', 'AlertRule',
    'MonitoringAlert', 'Incident', 'IncidentUpdate',
    # Domain
    'Domain', 'DnsZone', 'DomainDnsRecord', 'DomainTransfer', 'SslCertificate',
]
