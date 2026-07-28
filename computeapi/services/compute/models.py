# OrcaCloud Compute Service - Models

from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
from ..core.base_models import ResourceModel, Status, TimeStampedModel
import json
import uuid


# ============================================================================
# COMPUTE - VIRTUAL MACHINES
# ============================================================================

class Flavor(models.Model):
    """VM instance types/flavors."""
    flavor_id = models.CharField(max_length=64, unique=True, primary_key=True)
    name = models.CharField(max_length=255, unique=True, db_index=True)
    vcpus = models.IntegerField(validators=[MinValueValidator(1)])
    memory_mb = models.IntegerField(validators=[MinValueValidator(256)])
    disk_gb = models.IntegerField(validators=[MinValueValidator(10)])
    network_bandwidth_gbps = models.FloatField(default=1.0)
    gpu_count = models.IntegerField(default=0)
    gpu_type = models.CharField(max_length=100, blank=True)  # Tesla T4, V100, A100, etc.
    hourly_cost_usd = models.DecimalField(max_digits=8, decimal_places=4)
    is_active = models.BooleanField(default=True, db_index=True)
    is_gpu = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['vcpus', 'memory_mb']
        indexes = [
            models.Index(fields=['is_active', 'is_gpu']),
        ]

    def __str__(self):
        return f"{self.name} ({self.vcpus}vCPU, {self.memory_mb}MB)"


class Image(models.Model):
    """VM images/templates."""
    image_id = models.CharField(max_length=64, unique=True, primary_key=True)
    name = models.CharField(max_length=255, db_index=True)
    description = models.TextField(blank=True)
    os_type = models.CharField(
        max_length=50,
        choices=[
            ('linux', 'Linux'),
            ('windows', 'Windows'),
            ('custom', 'Custom'),
        ]
    )
    os_name = models.CharField(max_length=100)  # Ubuntu 22.04, CentOS 8, etc.
    os_version = models.CharField(max_length=50)
    size_gb = models.IntegerField(validators=[MinValueValidator(1)])
    is_public = models.BooleanField(default=True, db_index=True)
    owner = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['os_type', 'is_public']),
        ]

    def __str__(self):
        return f"{self.name} ({self.os_name})"


class Instance(ResourceModel):
    """Virtual Machine instance."""
    STATUS_CHOICES = Status.choices

    instance_id = models.CharField(max_length=64, unique=True, db_index=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', db_index=True)
    flavor = models.ForeignKey(Flavor, on_delete=models.PROTECT, related_name='instances')
    image = models.ForeignKey(Image, on_delete=models.PROTECT, related_name='instances')

    # Networking
    vpc_id = models.CharField(max_length=64, blank=True)
    subnet_id = models.CharField(max_length=64, blank=True)
    private_ip = models.GenericIPAddressField(null=True, blank=True, protocol='both')
    public_ip = models.GenericIPAddressField(null=True, blank=True, protocol='both')
    security_groups = models.JSONField(default=list)

    # Security
    key_pair = models.CharField(max_length=255, blank=True)
    public_key = models.TextField(blank=True)

    # Storage
    root_volume_size_gb = models.IntegerField(default=100, validators=[MinValueValidator(10)])
    attached_volumes = models.JSONField(default=list, help_text="List of attached volume IDs")

    # Configuration
    user_data = models.TextField(blank=True, help_text="Cloud-init user data")
    enable_monitoring = models.BooleanField(default=True)
    enable_termination_protection = models.BooleanField(default=False)

    # Lifecycle
    launch_time = models.DateTimeField(null=True, blank=True)
    stop_time = models.DateTimeField(null=True, blank=True)
    termination_time = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['owner', 'status']),
            models.Index(fields=['status', 'created_at']),
        ]

    def __str__(self):
        return f"{self.name} ({self.instance_id})"

    @property
    def is_running(self):
        return self.status == 'running'

    @property
    def is_stopped(self):
        return self.status == 'stopped'


class InstanceMetric(TimeStampedModel):
    """Time-series metrics for instances."""
    instance = models.ForeignKey(Instance, on_delete=models.CASCADE, related_name='metrics')

    cpu_usage_percent = models.FloatField(null=True, blank=True)
    memory_usage_percent = models.FloatField(null=True, blank=True)
    disk_usage_percent = models.FloatField(null=True, blank=True)
    network_in_bytes = models.BigIntegerField(null=True, blank=True)
    network_out_bytes = models.BigIntegerField(null=True, blank=True)
    io_read_bytes = models.BigIntegerField(null=True, blank=True)
    io_write_bytes = models.BigIntegerField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['instance', 'created_at']),
        ]


# ============================================================================
# COMPUTE - KUBERNETES
# ============================================================================

class KubernetesCluster(ResourceModel):
    """Kubernetes cluster."""
    cluster_id = models.CharField(max_length=64, unique=True, db_index=True)
    status = models.CharField(max_length=20, choices=Status.choices, default='pending')

    # Cluster configuration
    kubernetes_version = models.CharField(max_length=20, default='1.29.0')
    node_count = models.IntegerField(default=3, validators=[MinValueValidator(1)])
    node_flavor = models.ForeignKey(Flavor, on_delete=models.PROTECT, null=True)

    # Network
    vpc_id = models.CharField(max_length=64, blank=True)
    cluster_ip_range = models.CharField(max_length=18, default='10.0.0.0/16')
    service_ip_range = models.CharField(max_length=18, default='10.1.0.0/16')

    # Auto-scaling
    auto_scaling_enabled = models.BooleanField(default=False)
    min_nodes = models.IntegerField(default=1, validators=[MinValueValidator(1)])
    max_nodes = models.IntegerField(default=10, validators=[MinValueValidator(2)])

    # Security
    rbac_enabled = models.BooleanField(default=True)
    network_policy_enabled = models.BooleanField(default=True)

    # Addons
    enabled_addons = models.JSONField(
        default=list,
        help_text="metrics-server, ingress-nginx, storage-class, etc."
    )

    # API access
    api_endpoint = models.URLField(blank=True)
    kubeconfig = models.TextField(blank=True, help_text="Base64 encoded kubeconfig")

    region = models.CharField(max_length=50, default='us-west-2')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.cluster_id})"


class KubernetesNode(TimeStampedModel):
    """Node in a Kubernetes cluster."""
    cluster = models.ForeignKey(KubernetesCluster, on_delete=models.CASCADE, related_name='nodes')
    node_name = models.CharField(max_length=255, db_index=True)
    instance_id = models.CharField(max_length=64)

    status = models.CharField(
        max_length=20,
        choices=[
            ('ready', 'Ready'),
            ('not_ready', 'Not Ready'),
            ('unknown', 'Unknown'),
        ],
        default='unknown'
    )

    cpu_allocatable = models.IntegerField(null=True)
    memory_allocatable_mb = models.IntegerField(null=True)
    pods_allocatable = models.IntegerField(null=True)

    kubernetes_version = models.CharField(max_length=20)

    class Meta:
        unique_together = ('cluster', 'node_name')


# ============================================================================
# COMPUTE - SERVERLESS FUNCTIONS
# ============================================================================

class ServerlessFunction(ResourceModel):
    """Serverless function for FaaS."""
    function_id = models.CharField(max_length=64, unique=True, db_index=True)

    RUNTIME_CHOICES = [
        ('python3.11', 'Python 3.11'),
        ('python3.10', 'Python 3.10'),
        ('nodejs20', 'Node.js 20'),
        ('nodejs18', 'Node.js 18'),
        ('go1.21', 'Go 1.21'),
        ('java17', 'Java 17'),
        ('custom', 'Custom Container'),
    ]

    runtime = models.CharField(max_length=50, choices=RUNTIME_CHOICES)
    handler = models.CharField(max_length=255, help_text="e.g., index.handler")
    code_sha256 = models.CharField(max_length=512, blank=True)

    # Resources
    timeout_seconds = models.IntegerField(default=300, validators=[
        MinValueValidator(1),
        MaxValueValidator(900)
    ])
    memory_mb = models.IntegerField(default=128, validators=[
        MinValueValidator(128),
        MaxValueValidator(10240)
    ])

    # Configuration
    environment_variables = models.JSONField(default=dict)
    vpc_config = models.JSONField(default=dict, blank=True)

    # Code
    code_uri = models.URLField(help_text="S3 URI or image URI")
    code_repository = models.URLField(blank=True, help_text="GitHub/GitLab repository")
    code_branch = models.CharField(max_length=100, default='main')

    # Invocation
    invocation_count = models.BigIntegerField(default=0)
    last_invoked_at = models.DateTimeField(null=True, blank=True)

    # Status
    status = models.CharField(max_length=20, choices=Status.choices, default='pending')
    last_update_status = models.CharField(max_length=50, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.runtime})"


class ServerlessFunctionTrigger(TimeStampedModel):
    """Trigger for serverless functions."""
    TRIGGER_TYPES = [
        ('s3', 'S3 Event'),
        ('http', 'HTTP/REST'),
        ('schedule', 'Schedule/Cron'),
        ('sqs', 'SQS Queue'),
        ('database', 'Database Event'),
        ('custom', 'Custom Event'),
    ]

    trigger_id = models.CharField(max_length=64, unique=True)
    function = models.ForeignKey(ServerlessFunction, on_delete=models.CASCADE, related_name='triggers')
    trigger_type = models.CharField(max_length=50, choices=TRIGGER_TYPES)

    # Configuration
    config = models.JSONField(default=dict)
    is_enabled = models.BooleanField(default=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.trigger_id:
            self.trigger_id = f"trigger-{uuid.uuid4().hex[:12]}"
        super().save(*args, **kwargs)


# ============================================================================
# COMPUTE - AUTO-SCALING
# ============================================================================

class AutoScalingGroup(ResourceModel):
    """Auto-scaling group for instances."""
    asg_id = models.CharField(max_length=64, unique=True, db_index=True)

    # Capacity
    min_size = models.IntegerField(default=1, validators=[MinValueValidator(0)])
    max_size = models.IntegerField(default=10, validators=[MinValueValidator(1)])
    desired_capacity = models.IntegerField(default=2, validators=[MinValueValidator(0)])

    # Configuration
    launch_template_id = models.CharField(max_length=64)
    health_check_type = models.CharField(
        max_length=50,
        choices=[('ec2', 'EC2'), ('elb', 'ELB')],
        default='ec2'
    )
    health_check_grace_period = models.IntegerField(default=300)  # seconds

    # Instances
    current_instances = models.JSONField(default=list, help_text="List of instance IDs")

    # Scaling activity
    scaling_policies = models.JSONField(default=list)

    class Meta:
        ordering = ['-created_at']

    @property
    def instance_count(self):
        return len(self.current_instances)

    def __str__(self):
        return f"{self.name} (min:{self.min_size}, max:{self.max_size})"


class ScalingPolicy(TimeStampedModel):
    """Auto-scaling policy."""
    POLICY_TYPES = [
        ('target-tracking', 'Target Tracking'),
        ('step', 'Step Scaling'),
        ('simple', 'Simple Scaling'),
        ('predictive', 'Predictive Scaling'),
    ]

    policy_id = models.CharField(max_length=64, unique=True)
    asg = models.ForeignKey(AutoScalingGroup, on_delete=models.CASCADE, related_name='policies')
    policy_type = models.CharField(max_length=50, choices=POLICY_TYPES)

    # Target tracking
    metric_name = models.CharField(max_length=100)  # CPUUtilization, etc.
    target_value = models.FloatField(null=True, blank=True)

    # Scaling adjustment
    adjustment_type = models.CharField(
        max_length=50,
        choices=[
            ('ChangeInCapacity', 'Change In Capacity'),
            ('PercentChangeInCapacity', 'Percent Change In Capacity'),
            ('ExactCapacity', 'Exact Capacity'),
        ]
    )
    adjustment_value = models.IntegerField()

    # Cooldown
    cooldown_seconds = models.IntegerField(default=300)

    is_enabled = models.BooleanField(default=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.policy_id:
            self.policy_id = f"policy-{uuid.uuid4().hex[:12]}"
        super().save(*args, **kwargs)
