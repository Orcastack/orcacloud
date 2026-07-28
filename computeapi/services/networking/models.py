# OrcaCloud Networking Service - Models

from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator, URLValidator
from ..core.base_models import ResourceModel, Status, TimeStampedModel
import uuid


# ============================================================================
# NETWORKING - VPC & SUBNETS
# ============================================================================

class VPC(ResourceModel):
    """Virtual Private Cloud."""
    vpc_id = models.CharField(max_length=64, unique=True, db_index=True)

    # Network configuration
    cidr_block = models.CharField(max_length=18, help_text="e.g., 10.0.0.0/16")
    ipv6_cidr_block = models.CharField(max_length=40, blank=True)

    # Features
    enable_dns_hostnames = models.BooleanField(default=True)
    enable_dns_support = models.BooleanField(default=True)
    enable_network_address_translation = models.BooleanField(default=True)

    # Region
    region = models.CharField(max_length=50, default='us-west-2')

    # Status
    status = models.CharField(max_length=20, choices=Status.choices, default='available')

    # Flow logs
    flow_logs_enabled = models.BooleanField(default=False)
    flow_logs_destination = models.CharField(max_length=255, blank=True)

    # Tags and metadata
    tags = models.JSONField(default=dict)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['owner', 'region']),
        ]

    def __str__(self):
        return f"{self.name} ({self.cidr_block})"


class Subnet(TimeStampedModel):
    """Subnet within a VPC."""
    subnet_id = models.CharField(max_length=64, unique=True, primary_key=True)
    vpc = models.ForeignKey(VPC, on_delete=models.CASCADE, related_name='subnets')

    # Network configuration
    cidr_block = models.CharField(max_length=18)
    availability_zone = models.CharField(max_length=50)
    ipv6_cidr_block = models.CharField(max_length=40, blank=True)

    # IP configuration
    available_ip_count = models.IntegerField(default=0)
    map_public_ip_on_launch = models.BooleanField(default=False)
    assign_ipv6_on_creation = models.BooleanField(default=False)

    # Status
    is_default = models.BooleanField(default=False)

    # Tags
    name = models.CharField(max_length=255, blank=True)
    tags = models.JSONField(default=dict)

    class Meta:
        unique_together = ('vpc', 'cidr_block')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.subnet_id} ({self.cidr_block})"


# ============================================================================
# NETWORKING - SECURITY GROUPS & RULES
# ============================================================================

class SecurityGroup(ResourceModel):
    """security group for controlling traffic."""
    sg_id = models.CharField(max_length=64, unique=True, db_index=True)
    vpc = models.ForeignKey(VPC, on_delete=models.CASCADE, related_name='security_groups', null=True)

    # Status
    is_default = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['vpc', 'owner']),
        ]

    def __str__(self):
        return f"{self.name} ({self.sg_id})"


class SecurityGroupRule(TimeStampedModel):
    """Ingress/Egress rule in a security group."""
    DIRECTION_CHOICES = [
        ('ingress', 'Ingress (Inbound)'),
        ('egress', 'Egress (Outbound)'),
    ]

    PROTOCOL_CHOICES = [
        ('tcp', 'TCP'),
        ('udp', 'UDP'),
        ('icmp', 'ICMP'),
        ('ipv6-icmp', 'IPv6 ICMP'),
        ('esp', 'ESP'),
        ('ah', 'AH'),
        ('-1', 'All'),
    ]

    rule_id = models.CharField(max_length=64, unique=True)
    security_group = models.ForeignKey(SecurityGroup, on_delete=models.CASCADE, related_name='rules')

    # Rule direction
    direction = models.CharField(max_length=20, choices=DIRECTION_CHOICES)

    # Protocol
    protocol = models.CharField(max_length=20, choices=PROTOCOL_CHOICES, default='tcp')
    from_port = models.IntegerField(null=True, blank=True, validators=[MinValueValidator(0), MaxValueValidator(65535)])
    to_port = models.IntegerField(null=True, blank=True, validators=[MinValueValidator(0), MaxValueValidator(65535)])

    # Source/Destination
    cidr_ipv4 = models.CharField(max_length=18, blank=True)
    cidr_ipv6 = models.CharField(max_length=40, blank=True)
    referenced_sg_id = models.CharField(max_length=64, blank=True)  # For SG-to-SG rules

    # Description
    description = models.CharField(max_length=255, blank=True)

    is_enabled = models.BooleanField(default=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.rule_id:
            self.rule_id = f"rule-{uuid.uuid4().hex[:12]}"
        super().save(*args, **kwargs)

    def __str__(self):
        proto = self.get_protocol_display()
        port_info = f":{self.from_port}" if self.from_port == self.to_port else f":{self.from_port}-{self.to_port}"
        return f"{self.direction.upper()} {proto}{port_info}"


# ============================================================================
# NETWORKING - LOAD BALANCING
# ============================================================================

class LoadBalancer(ResourceModel):
    """Load balancer instance."""
    lb_id = models.CharField(max_length=64, unique=True, db_index=True)

    LB_TYPES = [
        ('application', 'Application Load Balancer (ALB)'),
        ('network', 'Network Load Balancer (NLB)'),
        ('classic', 'Classic Load Balancer'),
    ]

    lb_type = models.CharField(max_length=50, choices=LB_TYPES, default='application')

    # Network configuration
    vpc_id = models.CharField(max_length=64)
    subnets = models.JSONField(default=list, help_text="List of subnet IDs")
    security_groups = models.JSONField(default=list)

    # Network configuration
    scheme = models.CharField(
        max_length=20,
        choices=[
            ('internet-facing', 'Internet-Facing'),
            ('internal', 'Internal'),
        ],
        default='internet-facing'
    )

    # IP address type
    ip_address_type = models.CharField(
        max_length=20,
        choices=[
            ('ipv4', 'IPv4'),
            ('dualstack', 'Dual Stack (IPv4 and IPv6)'),
        ],
        default='ipv4'
    )

    dns_name = models.CharField(max_length=255, blank=True, unique=True)

    # Status
    status = models.CharField(max_length=20, choices=Status.choices, default='provisioning')

    # Access logs
    access_logs_enabled = models.BooleanField(default=False)
    access_logs_bucket = models.CharField(max_length=255, blank=True)

    # Connection settings
    idle_timeout_seconds = models.IntegerField(default=60, validators=[
        MinValueValidator(1),
        MaxValueValidator(4000)
    ])

    # Cross-zone
    cross_zone_load_balancing = models.BooleanField(default=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['owner', 'status']),
        ]

    def __str__(self):
        return f"{self.name} ({self.get_lb_type_display()})"


class TargetGroup(TimeStampedModel):
    """Target group for load balancer."""
    tg_id = models.CharField(max_length=64, unique=True)
    load_balancer = models.ForeignKey(LoadBalancer, on_delete=models.CASCADE, related_name='target_groups')

    name = models.CharField(max_length=255)

    # Protocol
    protocol = models.CharField(
        max_length=20,
        choices=[
            ('http', 'HTTP'),
            ('https', 'HTTPS'),
            ('tcp', 'TCP'),
            ('tls', 'TLS'),
            ('udp', 'UDP'),
            ('tcp_udp', 'TCP_UDP'),
        ],
        default='http'
    )
    protocol_version = models.CharField(max_length=10, default='HTTP/1.1')
    port = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(65535)])

    vpc_id = models.CharField(max_length=64)

    # Health check
    health_check_enabled = models.BooleanField(default=True)
    health_check_path = models.CharField(max_length=255, default='/')
    health_check_interval_seconds = models.IntegerField(default=30)
    health_check_timeout_seconds = models.IntegerField(default=5)
    healthy_threshold_count = models.IntegerField(default=2)
    unhealthy_threshold_count = models.IntegerField(default=2)

    # Stickiness
    stickiness_enabled = models.BooleanField(default=False)
    stickiness_type = models.CharField(
        max_length=50,
        choices=[
            ('lb_cookie', 'Load Balancer Cookie'),
            ('app_cookie', 'Application Cookie'),
        ],
        default='lb_cookie'
    )
    stickiness_duration_seconds = models.IntegerField(default=86400)

    # Target type
    target_type = models.CharField(
        max_length=50,
        choices=[
            ('instance', 'Instance'),
            ('ip', 'IP Address'),
            ('lambda', 'Lambda Function'),
        ],
        default='instance'
    )

    # Registered targets
    registered_targets = models.JSONField(default=list)
    health_status = models.JSONField(default=dict)  # {target_id: status}

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.tg_id:
            self.tg_id = f"tg-{uuid.uuid4().hex[:12]}"
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Listener(TimeStampedModel):
    """Listener for load balancer."""
    listener_id = models.CharField(max_length=64, unique=True)
    load_balancer = models.ForeignKey(LoadBalancer, on_delete=models.CASCADE, related_name='listeners')

    # Protocol
    protocol = models.CharField(
        max_length=20,
        choices=[
            ('http', 'HTTP'),
            ('https', 'HTTPS'),
            ('tcp', 'TCP'),
            ('tls', 'TLS'),
            ('udp', 'UDP'),
            ('tcp_udp', 'TCP_UDP'),
        ],
        default='http'
    )
    port = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(65535)])

    # Default action
    default_action = models.CharField(
        max_length=50,
        choices=[
            ('forward', 'Forward'),
            ('redirect', 'Redirect'),
            ('fixed-response', 'Fixed Response'),
            ('authenticate', 'Authenticate'),
        ],
        default='forward'
    )
    default_target_group = models.ForeignKey(TargetGroup, on_delete=models.SET_NULL, null=True, blank=True)

    # SSL/TLS
    certificate_arn = models.CharField(max_length=255, blank=True)
    ssl_policy = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.listener_id:
            self.listener_id = f"listener-{uuid.uuid4().hex[:12]}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.get_protocol_display()} port {self.port}"


# ============================================================================
# NETWORKING - ROUTING & DNS
# ============================================================================

class RouteTable(ResourceModel):
    """Route table for VPC."""
    route_table_id = models.CharField(max_length=64, unique=True, db_index=True)
    vpc = models.ForeignKey(VPC, on_delete=models.CASCADE, related_name='route_tables')

    is_main = models.BooleanField(default=False)
    associated_subnets = models.JSONField(default=list)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.route_table_id} (VPC: {self.vpc.vpc_id})"


class Route(TimeStampedModel):
    """Individual route in a route table."""
    route_id = models.CharField(max_length=64, unique=True)
    route_table = models.ForeignKey(RouteTable, on_delete=models.CASCADE, related_name='routes')

    # Destination
    destination_cidr = models.CharField(max_length=18, blank=True)
    destination_ipv6_cidr = models.CharField(max_length=40, blank=True)
    destination_prefix_list_id = models.CharField(max_length=64, blank=True)

    # Target
    target_type = models.CharField(
        max_length=50,
        choices=[
            ('instance', 'Instance'),
            ('nat-gateway', 'NAT Gateway'),
            ('internet-gateway', 'Internet Gateway'),
            ('vpn-gateway', 'VPN Gateway'),
            ('vpc-peering', 'VPC Peering'),
            ('network-interface', 'Network Interface'),
            ('local', 'Local'),
        ]
    )
    target_id = models.CharField(max_length=64, blank=True)

    # Status
    status = models.CharField(
        max_length=50,
        choices=[
            ('active', 'Active'),
            ('blackhole', 'Blackhole'),
        ],
        default='active'
    )

    class Meta:
        unique_together = ('route_table', 'destination_cidr')
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.route_id:
            self.route_id = f"route-{uuid.uuid4().hex[:12]}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.destination_cidr or self.destination_ipv6_cidr} -> {self.target_id}"


class DNSRecord(ResourceModel):
    """DNS record."""
    record_id = models.CharField(max_length=64, unique=True, db_index=True)

    # DNS server (if applicable)
    zone_id = models.CharField(max_length=64, blank=True)

    # Record details
    name = models.CharField(max_length=255, db_index=True)
    record_type = models.CharField(
        max_length=50,
        choices=[
            ('A', 'A'),
            ('AAAA', 'AAAA'),
            ('CNAME', 'CNAME'),
            ('MX', 'MX'),
            ('NS', 'NS'),
            ('PTR', 'PTR'),
            ('SOA', 'SOA'),
            ('SRV', 'SRV'),
            ('TXT', 'TXT'),
        ]
    )
    ttl = models.IntegerField(default=300)

    # Values
    values = models.JSONField(default=list)

    # Routing policy
    routing_policy = models.CharField(
        max_length=50,
        choices=[
            ('simple', 'Simple'),
            ('weighted', 'Weighted'),
            ('latency', 'Latency-based'),
            ('failover', 'Failover'),
            ('geolocation', 'Geolocation'),
            ('multivalue', 'Multivalue Answer'),
        ],
        default='simple'
    )

    class Meta:
        unique_together = ('zone_id', 'name', 'record_type')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.record_type})"


# ============================================================================
# NETWORKING - CDN
# ============================================================================

class CDNDistribution(ResourceModel):
    """CDN distribution."""
    distribution_id = models.CharField(max_length=64, unique=True, db_index=True)

    # Origin
    origin_domain = models.CharField(max_length=255)
    origin_path = models.CharField(max_length=255, blank=True, default='/')

    # Domain configuration
    domain_names = models.JSONField(default=list)
    default_root_object = models.CharField(max_length=255, blank=True)

    # Distribution configuration
    enabled = models.BooleanField(default=True)
    status = models.CharField(max_length=20, choices=Status.choices, default='deploying')

    # HTTPS
    require_https = models.BooleanField(default=True)
    certificate_arn = models.CharField(max_length=255, blank=True)
    ssl_protocol_minimum = models.CharField(
        max_length=50,
        choices=[
            ('TLSv1', 'TLSv1'),
            ('TLSv1.1', 'TLSv1.1'),
            ('TLSv1.2', 'TLSv1.2'),
            ('SSLv3', 'SSLv3'),
        ],
        default='TLSv1.2'
    )

    # Caching
    default_ttl_seconds = models.IntegerField(default=86400)
    max_ttl_seconds = models.IntegerField(default=31536000)

    # Origin shield
    origin_shield_enabled = models.BooleanField(default=False)
    origin_shield_region = models.CharField(max_length=50, blank=True)

    # Logging
    access_logs_enabled = models.BooleanField(default=False)
    access_logs_bucket = models.CharField(max_length=255, blank=True)

    # WAF
    waf_enabled = models.BooleanField(default=False)
    waf_web_acl_id = models.CharField(max_length=255, blank=True)

    # Price class
    price_class = models.CharField(
        max_length=50,
        choices=[
            ('100', 'Price Class 100 (Lowest)'),
            ('200', 'Price Class 200'),
            ('all', 'Price Class All'),
        ],
        default='all'
    )

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.distribution_id})"


# ============================================================================
# NETWORKING - VPN
# ============================================================================

class VPNGateway(ResourceModel):
    """VPN Gateway."""
    vpn_gw_id = models.CharField(max_length=64, unique=True, db_index=True)
    vpc = models.ForeignKey(VPC, on_delete=models.CASCADE, related_name='vpn_gateways')

    gateway_type = models.CharField(
        max_length=50,
        choices=[
            ('ipsec.1', 'IPsec.1'),
        ],
        default='ipsec.1'
    )

    status = models.CharField(max_length=20, choices=Status.choices, default='pending')

    asn = models.IntegerField(default=64512)  # Autonomous System Number

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.vpn_gw_id})"


class CustomerGateway(ResourceModel):
    """Customer Gateway (on-premise side)."""
    cgw_id = models.CharField(max_length=64, unique=True, db_index=True)

    gateway_type = models.CharField(
        max_length=50,
        choices=[
            ('ipsec.1', 'IPsec.1'),
        ],
        default='ipsec.1'
    )

    # Customer side
    public_ip = models.GenericIPAddressField(protocol='both')
    bgp_asn = models.IntegerField(default=65000)

    # Certificate (for certificate-based VPN)
    certificate_arn = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.public_ip})"


class VPNConnection(TimeStampedModel):
    """VPN Connection between Customer Gateway and VPN Gateway."""
    connection_id = models.CharField(max_length=64, unique=True)

    vpn_gateway = models.ForeignKey(VPNGateway, on_delete=models.CASCADE, related_name='connections')
    customer_gateway = models.ForeignKey(CustomerGateway, on_delete=models.CASCADE, related_name='connections')

    status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('available', 'Available'),
            ('deleting', 'Deleting'),
            ('deleted', 'Deleted'),
        ],
        default='pending'
    )

    # Connection options
    static_routes_only = models.BooleanField(default=False)

    # VPN tunnel configuration
    tunnel_options = models.JSONField(default=dict)  # DPD timeout, phase1/2 settings

    # Tags
    tags = models.JSONField(default=dict)

    class Meta:
        unique_together = ('vpn_gateway', 'customer_gateway')
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.connection_id:
            self.connection_id = f"vpn-{uuid.uuid4().hex[:12]}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"VPN {self.connection_id}"


# ============================================================================
# NETWORKING - NAT & INTERNET GATEWAYS
# ============================================================================

class InternetGateway(ResourceModel):
    """Internet Gateway for VPC."""
    ig_id = models.CharField(max_length=64, unique=True, db_index=True)
    vpc = models.ForeignKey(VPC, on_delete=models.CASCADE, related_name='internet_gateways')

    status = models.CharField(max_length=20, choices=Status.choices, default='available')

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.ig_id})"


class NATGateway(ResourceModel):
    """NAT Gateway for private subnet internet access."""
    nat_gw_id = models.CharField(max_length=64, unique=True, db_index=True)
    subnet = models.ForeignKey(Subnet, on_delete=models.CASCADE, related_name='nat_gateways')

    # Public IP
    eip_allocation_id = models.CharField(max_length=64)
    public_ip = models.GenericIPAddressField(protocol='both')

    status = models.CharField(max_length=20, choices=Status.choices, default='creating')

    # Network interface
    network_interface_id = models.CharField(max_length=64, blank=True)
    network_interface_ip = models.GenericIPAddressField(protocol='both', blank=True, null=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.nat_gw_id})"


# ── Service Mesh ──────────────────────────────────────────────────────────────

MTLS_MODE_CHOICES = [
    ('strict',      'Strict — all traffic must use mTLS'),
    ('permissive',  'Permissive — accept both plain-text and mTLS'),
    ('disabled',    'Disabled — no mTLS enforcement'),
]

PROXY_TYPE_CHOICES = [
    ('envoy',   'Envoy'),
    ('linkerd', 'Linkerd'),
    ('none',    'No sidecar'),
]


class ServiceMeshPolicy(ResourceModel):
    """
    Service mesh policy for a workload or namespace.

    Enforces mTLS, traffic encryption, and east-west traffic access rules
    for services running inside a VPC or Kubernetes cluster.
    """
    policy_id           = models.CharField(max_length=64, unique=True, db_index=True)
    vpc                 = models.ForeignKey(VPC, on_delete=models.CASCADE, related_name='mesh_policies',
                                            null=True, blank=True)
    cluster_id          = models.CharField(max_length=64, blank=True,
                                           help_text='KubernetesCluster.cluster_id (blank = VPC-wide)')
    namespace           = models.CharField(max_length=128, blank=True,
                                           help_text='K8s namespace selector (empty = all namespaces)')
    workload_selector   = models.JSONField(default=dict,
                                           help_text='Label selector dict, e.g. {"app": "api"}')
    mtls_mode           = models.CharField(max_length=12, choices=MTLS_MODE_CHOICES, default='permissive')
    proxy_type          = models.CharField(max_length=10, choices=PROXY_TYPE_CHOICES, default='envoy')
    allowed_sources     = models.JSONField(default=list,
                                           help_text='Allowed source identifiers (CIDR, selectors, or "*")')
    egress_allowed      = models.BooleanField(default=True)
    egress_allowlist    = models.JSONField(default=list)
    is_active           = models.BooleanField(default=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Service Mesh Policy'

    def save(self, *args, **kwargs):
        if not self.policy_id:
            self.policy_id = f"mesh-{uuid.uuid4().hex[:12]}"
        super().save(*args, **kwargs)

    def __str__(self):
        scope = self.namespace or 'all-namespaces'
        return f"{self.name} [{self.mtls_mode}] ({scope})"
