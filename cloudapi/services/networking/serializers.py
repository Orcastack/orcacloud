# OrcaCloud Networking Service - Serializers

from rest_framework import serializers
from .models import (
    VPC, Subnet, SecurityGroup, SecurityGroupRule,
    LoadBalancer, TargetGroup, Listener,
    RouteTable, Route, DNSRecord, CDNDistribution,
    VPNGateway, CustomerGateway, VPNConnection,
    InternetGateway, NATGateway
)


# ============================================================================
# VPC SERIALIZERS
# ============================================================================

class VPCListSerializer(serializers.ModelSerializer):
    """Lightweight VPC serializer."""
    owner_username = serializers.CharField(source='owner.username', read_only=True)
    subnet_count = serializers.SerializerMethodField()

    class Meta:
        model = VPC
        fields = [
            'id', 'resource_id', 'vpc_id', 'name', 'cidr_block', 'region',
            'status', 'owner_username', 'subnet_count', 'created_at'
        ]
        read_only_fields = ['resource_id', 'vpc_id', 'created_at']

    def get_subnet_count(self, obj):
        return obj.subnets.count()


class VPCDetailSerializer(serializers.ModelSerializer):
    """Full VPC details."""
    owner_username = serializers.CharField(source='owner.username', read_only=True)
    subnet_count = serializers.SerializerMethodField()

    class Meta:
        model = VPC
        fields = [
            'id', 'resource_id', 'vpc_id', 'name', 'description', 'cidr_block',
            'ipv6_cidr_block', 'enable_dns_hostnames', 'enable_dns_support',
            'enable_network_address_translation', 'region', 'status',
            'flow_logs_enabled', 'flow_logs_destination', 'owner',
            'owner_username', 'tags', 'metadata', 'created_at', 'updated_at',
            'subnet_count'
        ]
        read_only_fields = ['resource_id', 'vpc_id', 'status', 'created_at', 'updated_at']

    def get_subnet_count(self, obj):
        return obj.subnets.count()


class VPCCreateSerializer(serializers.ModelSerializer):
    """Create VPC."""
    class Meta:
        model = VPC
        fields = [
            'name', 'description', 'cidr_block', 'ipv6_cidr_block',
            'enable_dns_hostnames', 'enable_dns_support',
            'enable_network_address_translation', 'region',
            'flow_logs_enabled', 'flow_logs_destination',
            'tags', 'metadata'
        ]


# ============================================================================
# SUBNET SERIALIZERS
# ============================================================================

class SubnetListSerializer(serializers.ModelSerializer):
    """Lightweight subnet serializer."""
    vpc_name = serializers.CharField(source='vpc.name', read_only=True)

    class Meta:
        model = Subnet
        fields = [
            'subnet_id', 'vpc_name', 'cidr_block', 'availability_zone',
            'available_ip_count', 'map_public_ip_on_launch', 'is_default',
            'created_at'
        ]
        read_only_fields = ['subnet_id', 'created_at']


class SubnetDetailSerializer(serializers.ModelSerializer):
    """Full subnet details."""
    vpc_name = serializers.CharField(source='vpc.name', read_only=True)

    class Meta:
        model = Subnet
        fields = [
            'subnet_id', 'vpc', 'vpc_name', 'cidr_block', 'availability_zone',
            'ipv6_cidr_block', 'available_ip_count', 'map_public_ip_on_launch',
            'assign_ipv6_on_creation', 'is_default', 'name', 'tags',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['subnet_id', 'available_ip_count', 'created_at', 'updated_at']


class SubnetCreateSerializer(serializers.ModelSerializer):
    """Create subnet."""
    class Meta:
        model = Subnet
        fields = [
            'vpc', 'cidr_block', 'availability_zone', 'ipv6_cidr_block',
            'map_public_ip_on_launch', 'assign_ipv6_on_creation',
            'name', 'tags'
        ]


# ============================================================================
# SECURITY GROUP SERIALIZERS
# ============================================================================

class SecurityGroupRuleListSerializer(serializers.ModelSerializer):
    """Lightweight security group rule serializer."""
    class Meta:
        model = SecurityGroupRule
        fields = [
            'rule_id', 'direction', 'protocol', 'from_port', 'to_port',
            'cidr_ipv4', 'cidr_ipv6', 'referenced_sg_id', 'description',
            'is_enabled'
        ]
        read_only_fields = ['rule_id']


class SecurityGroupRuleDetailSerializer(serializers.ModelSerializer):
    """Full security group rule details."""
    class Meta:
        model = SecurityGroupRule
        fields = [
            'rule_id', 'security_group', 'direction', 'protocol', 'from_port',
            'to_port', 'cidr_ipv4', 'cidr_ipv6', 'referenced_sg_id',
            'description', 'is_enabled', 'created_at', 'updated_at'
        ]
        read_only_fields = ['rule_id', 'created_at', 'updated_at']


class SecurityGroupRuleCreateSerializer(serializers.ModelSerializer):
    """Create security group rule."""
    class Meta:
        model = SecurityGroupRule
        fields = [
            'security_group', 'direction', 'protocol', 'from_port', 'to_port',
            'cidr_ipv4', 'cidr_ipv6', 'referenced_sg_id', 'description',
            'is_enabled'
        ]


class SecurityGroupListSerializer(serializers.ModelSerializer):
    """Lightweight security group serializer."""
    owner_username = serializers.CharField(source='owner.username', read_only=True)
    vpc_id = serializers.CharField(source='vpc.vpc_id', read_only=True)
    rule_count = serializers.SerializerMethodField()

    class Meta:
        model = SecurityGroup
        fields = [
            'resource_id', 'sg_id', 'name', 'vpc_id', 'is_default',
            'owner_username', 'rule_count', 'created_at'
        ]
        read_only_fields = ['resource_id', 'sg_id', 'created_at']

    def get_rule_count(self, obj):
        return obj.rules.count()


class SecurityGroupDetailSerializer(serializers.ModelSerializer):
    """Full security group details."""
    owner_username = serializers.CharField(source='owner.username', read_only=True)
    vpc_name = serializers.CharField(source='vpc.name', read_only=True)
    rules = SecurityGroupRuleListSerializer(many=True, read_only=True)

    class Meta:
        model = SecurityGroup
        fields = [
            'resource_id', 'sg_id', 'name', 'description', 'vpc', 'vpc_name',
            'is_default', 'owner', 'owner_username', 'tags', 'metadata',
            'created_at', 'updated_at', 'rules'
        ]
        read_only_fields = ['resource_id', 'sg_id', 'created_at', 'updated_at']


class SecurityGroupCreateSerializer(serializers.ModelSerializer):
    """Create security group."""
    class Meta:
        model = SecurityGroup
        fields = [
            'name', 'description', 'vpc', 'tags', 'metadata'
        ]


# ============================================================================
# LOAD BALANCER SERIALIZERS
# ============================================================================

class TargetGroupListSerializer(serializers.ModelSerializer):
    """Lightweight target group serializer."""
    lb_name = serializers.CharField(source='load_balancer.name', read_only=True)
    target_count = serializers.SerializerMethodField()

    class Meta:
        model = TargetGroup
        fields = [
            'tg_id', 'name', 'lb_name', 'protocol', 'port',
            'target_type', 'target_count', 'created_at'
        ]
        read_only_fields = ['tg_id', 'created_at']

    def get_target_count(self, obj):
        return len(obj.registered_targets)


class TargetGroupDetailSerializer(serializers.ModelSerializer):
    """Full target group details."""
    lb_name = serializers.CharField(source='load_balancer.name', read_only=True)
    target_count = serializers.SerializerMethodField()

    class Meta:
        model = TargetGroup
        fields = [
            'tg_id', 'load_balancer', 'lb_name', 'name', 'protocol',
            'protocol_version', 'port', 'vpc_id', 'health_check_enabled',
            'health_check_path', 'health_check_interval_seconds',
            'health_check_timeout_seconds', 'healthy_threshold_count',
            'unhealthy_threshold_count', 'stickiness_enabled',
            'stickiness_type', 'stickiness_duration_seconds',
            'target_type', 'registered_targets', 'health_status',
            'target_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['tg_id', 'created_at', 'updated_at']

    def get_target_count(self, obj):
        return len(obj.registered_targets)


class ListenerListSerializer(serializers.ModelSerializer):
    """Lightweight listener serializer."""
    lb_name = serializers.CharField(source='load_balancer.name', read_only=True)

    class Meta:
        model = Listener
        fields = [
            'listener_id', 'lb_name', 'protocol', 'port',
            'default_action', 'created_at'
        ]
        read_only_fields = ['listener_id', 'created_at']


class TargetGroupListForLBSerializer(serializers.ModelSerializer):
    """Target group serializer for load balancer details."""
    target_count = serializers.SerializerMethodField()

    class Meta:
        model = TargetGroup
        fields = [
            'tg_id', 'name', 'protocol', 'port', 'target_type',
            'registered_targets', 'health_status', 'target_count'
        ]

    def get_target_count(self, obj):
        return len(obj.registered_targets)


class LoadBalancerListSerializer(serializers.ModelSerializer):
    """Lightweight load balancer serializer."""
    owner_username = serializers.CharField(source='owner.username', read_only=True)
    listener_count = serializers.SerializerMethodField()

    class Meta:
        model = LoadBalancer
        fields = [
            'resource_id', 'lb_id', 'name', 'lb_type', 'status',
            'dns_name', 'owner_username', 'listener_count', 'created_at'
        ]
        read_only_fields = ['resource_id', 'lb_id', 'created_at']

    def get_listener_count(self, obj):
        return obj.listeners.count()


class LoadBalancerDetailSerializer(serializers.ModelSerializer):
    """Full load balancer details."""
    owner_username = serializers.CharField(source='owner.username', read_only=True)
    target_groups = TargetGroupListForLBSerializer(many=True, read_only=True)
    listeners = ListenerListSerializer(many=True, read_only=True)

    class Meta:
        model = LoadBalancer
        fields = [
            'resource_id', 'lb_id', 'name', 'description', 'lb_type',
            'vpc_id', 'subnets', 'security_groups', 'scheme',
            'ip_address_type', 'dns_name', 'status', 'access_logs_enabled',
            'access_logs_bucket', 'idle_timeout_seconds',
            'cross_zone_load_balancing', 'owner', 'owner_username',
            'tags', 'metadata', 'created_at', 'updated_at',
            'target_groups', 'listeners'
        ]
        read_only_fields = [
            'resource_id', 'lb_id', 'dns_name', 'status',
            'created_at', 'updated_at'
        ]

    def get_listener_count(self, obj):
        return obj.listeners.count()


class LoadBalancerCreateSerializer(serializers.ModelSerializer):
    """Create load balancer."""
    class Meta:
        model = LoadBalancer
        fields = [
            'name', 'description', 'lb_type', 'vpc_id', 'subnets',
            'security_groups', 'scheme', 'ip_address_type',
            'access_logs_enabled', 'access_logs_bucket',
            'idle_timeout_seconds', 'cross_zone_load_balancing',
            'tags', 'metadata'
        ]


# ============================================================================
# ROUTING SERIALIZERS
# ============================================================================

class RouteListSerializer(serializers.ModelSerializer):
    """Lightweight route serializer."""
    route_table_name = serializers.CharField(source='route_table.name', read_only=True)

    class Meta:
        model = Route
        fields = [
            'route_id', 'route_table_name', 'destination_cidr',
            'destination_ipv6_cidr', 'target_type', 'target_id', 'status'
        ]
        read_only_fields = ['route_id']


class RouteDetailSerializer(serializers.ModelSerializer):
    """Full route details."""
    route_table_name = serializers.CharField(source='route_table.name', read_only=True)

    class Meta:
        model = Route
        fields = [
            'route_id', 'route_table', 'route_table_name', 'destination_cidr',
            'destination_ipv6_cidr', 'destination_prefix_list_id',
            'target_type', 'target_id', 'status',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['route_id', 'created_at', 'updated_at']


class RouteCreateSerializer(serializers.ModelSerializer):
    """Create route."""
    class Meta:
        model = Route
        fields = [
            'route_table', 'destination_cidr', 'destination_ipv6_cidr',
            'destination_prefix_list_id', 'target_type', 'target_id'
        ]


class RouteTableListSerializer(serializers.ModelSerializer):
    """Lightweight route table serializer."""
    vpc_name = serializers.CharField(source='vpc.name', read_only=True)
    route_count = serializers.SerializerMethodField()

    class Meta:
        model = RouteTable
        fields = [
            'resource_id', 'route_table_id', 'vpc_name', 'is_main',
            'route_count', 'created_at'
        ]
        read_only_fields = ['resource_id', 'route_table_id', 'created_at']

    def get_route_count(self, obj):
        return obj.routes.count()


class RouteTableDetailSerializer(serializers.ModelSerializer):
    """Full route table details."""
    vpc_name = serializers.CharField(source='vpc.name', read_only=True)
    routes = RouteListSerializer(many=True, read_only=True)

    class Meta:
        model = RouteTable
        fields = [
            'resource_id', 'route_table_id', 'name', 'vpc', 'vpc_name',
            'is_main', 'associated_subnets', 'owner', 'tags', 'metadata',
            'created_at', 'updated_at', 'routes'
        ]
        read_only_fields = [
            'resource_id', 'route_table_id', 'created_at', 'updated_at'
        ]


class RouteTableCreateSerializer(serializers.ModelSerializer):
    """Create route table."""
    class Meta:
        model = RouteTable
        fields = [
            'name', 'description', 'vpc', 'is_main',
            'associated_subnets', 'tags', 'metadata'
        ]


# ============================================================================
# DNS SERIALIZERS
# ============================================================================

class DNSRecordListSerializer(serializers.ModelSerializer):
    """Lightweight DNS record serializer."""
    class Meta:
        model = DNSRecord
        fields = [
            'record_id', 'name', 'record_type', 'ttl',
            'routing_policy', 'created_at'
        ]
        read_only_fields = ['record_id', 'created_at']


class DNSRecordDetailSerializer(serializers.ModelSerializer):
    """Full DNS record details."""
    class Meta:
        model = DNSRecord
        fields = [
            'record_id', 'zone_id', 'name', 'record_type', 'ttl', 'values',
            'routing_policy', 'owner', 'tags', 'metadata',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['record_id', 'created_at', 'updated_at']


class DNSRecordCreateSerializer(serializers.ModelSerializer):
    """Create DNS record."""
    class Meta:
        model = DNSRecord
        fields = [
            'zone_id', 'name', 'record_type', 'ttl', 'values',
            'routing_policy', 'tags'
        ]


# ============================================================================
# CDN SERIALIZERS
# ============================================================================

class CDNDistributionListSerializer(serializers.ModelSerializer):
    """Lightweight CDN distribution serializer."""
    owner_username = serializers.CharField(source='owner.username', read_only=True)

    class Meta:
        model = CDNDistribution
        fields = [
            'resource_id', 'distribution_id', 'name', 'origin_domain',
            'status', 'enabled', 'owner_username', 'created_at'
        ]
        read_only_fields = ['resource_id', 'distribution_id', 'created_at']


class CDNDistributionDetailSerializer(serializers.ModelSerializer):
    """Full CDN distribution details."""
    owner_username = serializers.CharField(source='owner.username', read_only=True)

    class Meta:
        model = CDNDistribution
        fields = [
            'resource_id', 'distribution_id', 'name', 'description',
            'origin_domain', 'origin_path', 'domain_names', 'default_root_object',
            'enabled', 'status', 'require_https', 'certificate_arn',
            'ssl_protocol_minimum', 'default_ttl_seconds', 'max_ttl_seconds',
            'origin_shield_enabled', 'origin_shield_region',
            'access_logs_enabled', 'access_logs_bucket',
            'waf_enabled', 'waf_web_acl_id', 'price_class',
            'owner', 'owner_username', 'tags', 'metadata',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'resource_id', 'distribution_id', 'status',
            'created_at', 'updated_at'
        ]


class CDNDistributionCreateSerializer(serializers.ModelSerializer):
    """Create CDN distribution."""
    class Meta:
        model = CDNDistribution
        fields = [
            'name', 'description', 'origin_domain', 'origin_path',
            'domain_names', 'default_root_object', 'enabled',
            'require_https', 'certificate_arn', 'ssl_protocol_minimum',
            'default_ttl_seconds', 'max_ttl_seconds',
            'origin_shield_enabled', 'origin_shield_region',
            'access_logs_enabled', 'access_logs_bucket',
            'waf_enabled', 'waf_web_acl_id', 'price_class',
            'tags', 'metadata'
        ]


# ============================================================================
# VPN SERIALIZERS
# ============================================================================

class VPNConnectionListSerializer(serializers.ModelSerializer):
    """Lightweight VPN connection serializer."""
    vpn_gw_name = serializers.CharField(source='vpn_gateway.name', read_only=True)
    cgw_name = serializers.CharField(source='customer_gateway.name', read_only=True)

    class Meta:
        model = VPNConnection
        fields = [
            'connection_id', 'vpn_gw_name', 'cgw_name', 'status',
            'created_at'
        ]
        read_only_fields = ['connection_id', 'created_at']


class VPNConnectionDetailSerializer(serializers.ModelSerializer):
    """Full VPN connection details."""
    vpn_gw_name = serializers.CharField(source='vpn_gateway.name', read_only=True)
    cgw_name = serializers.CharField(source='customer_gateway.name', read_only=True)

    class Meta:
        model = VPNConnection
        fields = [
            'connection_id', 'vpn_gateway', 'vpn_gw_name',
            'customer_gateway', 'cgw_name', 'status',
            'static_routes_only', 'tunnel_options', 'tags',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['connection_id', 'status', 'created_at', 'updated_at']


class VPNConnectionCreateSerializer(serializers.ModelSerializer):
    """Create VPN connection."""
    class Meta:
        model = VPNConnection
        fields = [
            'vpn_gateway', 'customer_gateway', 'static_routes_only',
            'tunnel_options', 'tags'
        ]


class VPNGatewayListSerializer(serializers.ModelSerializer):
    """Lightweight VPN gateway serializer."""
    owner_username = serializers.CharField(source='owner.username', read_only=True)
    vpc_name = serializers.CharField(source='vpc.name', read_only=True)

    class Meta:
        model = VPNGateway
        fields = [
            'resource_id', 'vpn_gw_id', 'name', 'vpc_name', 'status',
            'owner_username', 'created_at'
        ]
        read_only_fields = ['resource_id', 'vpn_gw_id', 'created_at']


class CustomerGatewayListSerializer(serializers.ModelSerializer):
    """Lightweight customer gateway serializer."""
    owner_username = serializers.CharField(source='owner.username', read_only=True)

    class Meta:
        model = CustomerGateway
        fields = [
            'resource_id', 'cgw_id', 'name', 'public_ip',
            'bgp_asn', 'owner_username', 'created_at'
        ]
        read_only_fields = ['resource_id', 'cgw_id', 'created_at']


# ============================================================================
# GATEWAY SERIALIZERS
# ============================================================================

class InternetGatewayListSerializer(serializers.ModelSerializer):
    """Lightweight internet gateway serializer."""
    owner_username = serializers.CharField(source='owner.username', read_only=True)
    vpc_name = serializers.CharField(source='vpc.name', read_only=True)

    class Meta:
        model = InternetGateway
        fields = [
            'resource_id', 'ig_id', 'name', 'vpc_name', 'status',
            'owner_username', 'created_at'
        ]
        read_only_fields = ['resource_id', 'ig_id', 'created_at']


class InternetGatewayCreateSerializer(serializers.ModelSerializer):
    """Create internet gateway."""
    class Meta:
        model = InternetGateway
        fields = [
            'name', 'description', 'vpc', 'tags', 'metadata'
        ]


class NATGatewayListSerializer(serializers.ModelSerializer):
    """Lightweight NAT gateway serializer."""
    owner_username = serializers.CharField(source='owner.username', read_only=True)
    subnet_name = serializers.CharField(source='subnet.name', read_only=True)

    class Meta:
        model = NATGateway
        fields = [
            'resource_id', 'nat_gw_id', 'name', 'subnet_name', 'public_ip',
            'status', 'owner_username', 'created_at'
        ]
        read_only_fields = ['resource_id', 'nat_gw_id', 'created_at']


class NATGatewayDetailSerializer(serializers.ModelSerializer):
    """Full NAT gateway details."""
    owner_username = serializers.CharField(source='owner.username', read_only=True)
    subnet_name = serializers.CharField(source='subnet.name', read_only=True)

    class Meta:
        model = NATGateway
        fields = [
            'resource_id', 'nat_gw_id', 'name', 'description', 'subnet',
            'subnet_name', 'eip_allocation_id', 'public_ip', 'status',
            'network_interface_id', 'network_interface_ip', 'owner',
            'owner_username', 'tags', 'metadata',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'resource_id', 'nat_gw_id', 'status', 'created_at', 'updated_at'
        ]


class NATGatewayCreateSerializer(serializers.ModelSerializer):
    """Create NAT gateway."""
    class Meta:
        model = NATGateway
        fields = [
            'name', 'description', 'subnet', 'eip_allocation_id',
            'public_ip', 'tags', 'metadata'
        ]
