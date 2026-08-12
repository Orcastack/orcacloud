"""
Networking Service Business Logic

Handles all networking-related operations:
- VPC creation and management with IPAM
- Subnet allocation within VPCs
- Security group rule enforcement
- Load balancer provisioning and configuration
- Route table and routing management
- DNS record management with routing policies
- CDN distribution setup with WAF
- VPN tunnel establishment and management

VPC Network Models:
- Public subnets: Have routes to Internet Gateway
- Private subnets: Routes only to NAT Gateway orlocal
- Database subnets: Private, isolated from load balancers
"""

import ipaddress
from datetime import datetime, timedelta
from django.utils import timezone
from django.db import transaction
from django.db.models import Q, Count

from ..core.models import (
    VPC, Subnet, SecurityGroup, SecurityGroupRule,
    LoadBalancer, TargetGroup, Listener,
    RouteTable, Route,
    DNSRecord, CDNDistribution,
    VPNGateway, CustomerGateway, VPNConnection,
    InternetGateway, NATGateway,
)
from .exceptions import (
    NetworkingError, VPCError, VPCNotFoundError,
    SubnetError, SecurityGroupError,
    LoadBalancerError, RouteError, DNSError,
    VPNError, IPAMError,
    InvalidConfigurationError, InvalidStateTransitionError,
    DependencyNotFoundError, ResourceInUseError, ResourceNotFoundError,
    QuotaExceededError,
)


class NetworkingService:
    """Service for managing networking resources (VPC, subnets, load balancers, etc.)"""

    def __init__(self):
        """Initialize networking service"""
        self.current_time = timezone.now()

    # ========== VPC MANAGEMENT ==========

    @transaction.atomic
    def create_vpc(self, vpc_data, user):
        """
        Create a new Virtual Private Cloud.

        Args:
            vpc_data: Dict with VPC configuration
            user: User who owns the VPC

        Returns:
            VPC: Created VPC object

        Raises:
            QuotaExceededError: VPC quota exceeded
            InvalidConfigurationError: Invalid CIDR block
            VPCError: Duplicate VPC
        """
        # Check quota
        vpc_count = VPC.objects.filter(owner=user).exclude(status='deleted').count()
        if vpc_count >= 10:
            raise QuotaExceededError("VPC quota exceeded")

        # Validate CIDR block
        cidr_block = vpc_data.get('cidr_block', '10.0.0.0/16')
        if not self._validate_cidr_block(cidr_block):
            raise InvalidConfigurationError("Invalid CIDR block format")

        # Check for existing VPC with same CIDR in same region
        if VPC.objects.filter(
            cidr_block=cidr_block,
            region=vpc_data.get('region', 'us-west-2'),
        ).exclude(status='deleted').exists():
            raise VPCError("VPC with this CIDR already exists in region")

        # Create VPC
        vpc = VPC.objects.create(
            name=vpc_data.get('name', f'vpc-{cidr_block.split("/")[0]}'),
            owner=user,
            cidr_block=cidr_block,
            enable_dns_hostnames=vpc_data.get('enable_dns_hostnames', True),
            enable_dns_support=vpc_data.get('enable_dns_support', True),
            region=vpc_data.get('region', 'us-west-2'),
            status='available',
            metadata=vpc_data.get('metadata', {}),
        )

        # Create default security group
        self._create_default_security_group(vpc)

        # Create default route table
        self._create_default_route_table(vpc)

        self._audit_log(user, 'vpc_created', vpc.id, {'cidr_block': cidr_block, 'region': vpc.region})
        return vpc

    def delete_vpc(self, vpc_id, user, force=False):
        """
        Delete a VPC.

        Args:
            vpc_id: ID of VPC to delete
            user: User performing operation
            force: Force delete even if VPC has resources

        Raises:
            VPCNotFoundError: VPC doesn't exist
            ResourceInUseError: VPC not empty and force=False
        """
        try:
            vpc = VPC.objects.get(id=vpc_id, owner=user)
        except VPC.DoesNotExist:
            raise VPCNotFoundError("VPC not found")

        if vpc.status == 'deleted':
            raise InvalidStateTransitionError("VPC already deleted")

        # Check for resources
        subnet_count = Subnet.objects.filter(vpc=vpc).count()
        lb_count = LoadBalancer.objects.filter(vpc=vpc).count()

        if (subnet_count > 0 or lb_count > 0) and not force:
            raise ResourceInUseError(f"VPC contains {subnet_count} subnets, {lb_count} load balancers")

        if force:
            # Delete all dependent resources
            Subnet.objects.filter(vpc=vpc).delete()
            LoadBalancer.objects.filter(vpc=vpc).delete()
            RouteTable.objects.filter(vpc=vpc).delete()
            SecurityGroup.objects.filter(vpc=vpc).delete()

        vpc.status = 'deleted'
        vpc.deleted_at = timezone.now()
        vpc.save()

        self._audit_log(user, 'vpc_deleted', vpc.id, {})
        return vpc

    # ========== SUBNET MANAGEMENT ==========

    @transaction.atomic
    def create_subnet(self, subnet_data, user):
        """
        Create a subnet within a VPC.

        Args:
            subnet_data: Dict with subnet configuration
            user: User performing operation

        Returns:
            Subnet: Created subnet object

        Raises:
            DependencyNotFoundError: VPC not found
            InvalidConfigurationError: Invalid CIDR or configuration
            IPAMError: CIDR allocation error
        """
        try:
            vpc = VPC.objects.get(id=subnet_data.get('vpc_id'), owner=user)
        except VPC.DoesNotExist:
            raise DependencyNotFoundError("VPC not found")

        # Validate subnet CIDR
        subnet_cidr = subnet_data.get('cidr_block')
        if not self._validate_subnet_cidr(vpc.cidr_block, subnet_cidr):
            raise InvalidConfigurationError("Subnet CIDR must be within VPC CIDR")

        # Check for overlapping subnets
        if Subnet.objects.filter(vpc=vpc, cidr_block=subnet_cidr).exists():
            raise InvalidConfigurationError("Subnet CIDR already exists in VPC")

        # Create subnet
        subnet = Subnet.objects.create(
            vpc=vpc,
            name=subnet_data.get('name', f'subnet-{subnet_cidr.split("/")[1]}'),
            cidr_block=subnet_cidr,
            availability_zone=subnet_data.get('availability_zone', 'us-west-2a'),
            assign_public_ips=subnet_data.get('assign_public_ips', False),
            enable_ipv6=subnet_data.get('enable_ipv6', False),
            available_ips=self._calculate_available_ips(subnet_cidr),
            metadata=subnet_data.get('metadata', {}),
        )

        self._audit_log(user, 'subnet_created', subnet.id, {'vpc_id': vpc.id, 'cidr_block': subnet_cidr})
        return subnet

    def enable_public_ips_on_subnet(self, subnet_id, user):
        """
        Enable public IP assignment on a subnet.

        Args:
            subnet_id: ID of subnet
            user: User performing operation

        Returns:
            Subnet: Updated subnet
        """
        try:
            subnet = Subnet.objects.get(id=subnet_id, vpc__owner=user)
        except Subnet.DoesNotExist:
            raise ResourceNotFoundError("Subnet not found")

        subnet.assign_public_ips = True
        subnet.save()

        self._audit_log(user, 'subnet_public_ips_enabled', subnet.id, {})
        return subnet

    # ========== SECURITY GROUP MANAGEMENT ==========

    @transaction.atomic
    def create_security_group(self, sg_data, user):
        """
        Create a security group.

        Args:
            sg_data: Dict with security group configuration
            user: User performing operation

        Returns:
            SecurityGroup: Created security group
        """
        try:
            vpc = VPC.objects.get(id=sg_data.get('vpc_id'), owner=user)
        except VPC.DoesNotExist:
            raise DependencyNotFoundError("VPC not found")

        sg = SecurityGroup.objects.create(
            name=sg_data.get('name'),
            owner=user,
            vpc=vpc,
            description=sg_data.get('description', ''),
            metadata=sg_data.get('metadata', {}),
        )

        self._audit_log(user, 'security_group_created', sg.id, {'vpc_id': vpc.id})
        return sg

    @transaction.atomic
    def add_security_group_rule(self, sg_id, rule_data, user):
        """
        Add a rule to a security group.

        Args:
            sg_id: ID of security group
            rule_data: Dict with rule configuration
            user: User performing operation

        Returns:
            SecurityGroupRule: Created rule
        """
        try:
            sg = SecurityGroup.objects.get(id=sg_id, owner=user)
        except SecurityGroup.DoesNotExist:
            raise ResourceNotFoundError("Security group not found")

        # Validate rule
        if not self._validate_security_group_rule(rule_data):
            raise InvalidConfigurationError("Invalid security group rule")

        rule = SecurityGroupRule.objects.create(
            security_group=sg,
            direction=rule_data.get('direction', 'ingress'),  # ingress or egress
            protocol=rule_data.get('protocol'),  # tcp, udp, icmp, all
            from_port=rule_data.get('from_port'),
            to_port=rule_data.get('to_port'),
            cidr_block=rule_data.get('cidr_block'),
            source_security_group_id=rule_data.get('source_security_group_id'),
            description=rule_data.get('description', ''),
        )

        self._audit_log(user, 'security_group_rule_added', sg.id, {'protocol': rule.protocol})
        return rule

    # ========== LOAD BALANCER MANAGEMENT ==========

    @transaction.atomic
    def create_load_balancer(self, lb_data, user):
        """
        Create a load balancer.

        Args:
            lb_data: Dict with load balancer configuration
            user: User who owns the load balancer

        Returns:
            LoadBalancer: Created load balancer
        """
        # Check quota
        lb_count = LoadBalancer.objects.filter(owner=user).count()
        if lb_count >= 20:
            raise QuotaExceededError("Load balancer quota exceeded")

        # Validate VPC if specified
        if lb_data.get('vpc_id'):
            try:
                vpc = VPC.objects.get(id=lb_data.get('vpc_id'), owner=user)
            except VPC.DoesNotExist:
                raise DependencyNotFoundError("VPC not found")

        lb_type = lb_data.get('load_balancer_type', 'alb')  # alb, nlb, classic
        if lb_type not in ['alb', 'nlb', 'classic']:
            raise InvalidConfigurationError("Invalid load balancer type")

        lb = LoadBalancer.objects.create(
            name=lb_data.get('name'),
            owner=user,
            vpc_id=lb_data.get('vpc_id'),
            load_balancer_type=lb_type,
            scheme=lb_data.get('scheme', 'internet-facing'),  # internet-facing or internal
            enable_deletion_protection=lb_data.get('enable_deletion_protection', False),
            enable_cross_zone_load_balancing=lb_data.get('enable_cross_zone_load_balancing', True),
            enable_http2=lb_data.get('enable_http2', True),
            metadata=lb_data.get('metadata', {}),
        )

        # Allocate DNS name
        lb.dns_name = f"{lb.name}.{lb.id}.elb.amazonaws.com"
        lb.save()

        self._audit_log(user, 'load_balancer_created', lb.id, {'type': lb_type})
        return lb

    def add_target_group_to_lb(self, lb_id, target_group_data, user):
        """
        Add a target group to a load balancer.

        Args:
            lb_id: ID of load balancer
            target_group_data: Dict with target group configuration
            user: User performing operation

        Returns:
            TargetGroup: Created target group
        """
        try:
            lb = LoadBalancer.objects.get(id=lb_id, owner=user)
        except LoadBalancer.DoesNotExist:
            raise ResourceNotFoundError("Load balancer not found")

        tg = TargetGroup.objects.create(
            load_balancer=lb,
            name=target_group_data.get('name'),
            protocol=target_group_data.get('protocol', 'HTTP'),
            port=target_group_data.get('port', 80),
            vpc_id=lb.vpc_id,
            target_type=target_group_data.get('target_type', 'instance'),
            health_check_protocol=target_group_data.get('health_check_protocol', 'HTTP'),
            health_check_path=target_group_data.get('health_check_path', '/'),
            health_check_interval=target_group_data.get('health_check_interval', 30),
            health_check_timeout=target_group_data.get('health_check_timeout', 5),
            healthy_threshold=target_group_data.get('healthy_threshold', 2),
            unhealthy_threshold=target_group_data.get('unhealthy_threshold', 2),
            metadata=target_group_data.get('metadata', {}),
        )

        self._audit_log(user, 'target_group_created', tg.id, {'lb_id': lb_id})
        return tg

    # ========== ROUTE MANAGEMENT ==========

    def add_route_to_table(self, route_table_id, route_data, user):
        """
        Add a route to a route table.

        Args:
            route_table_id: ID of route table
            route_data: Dict with route configuration
            user: User performing operation

        Returns:
            Route: Created route
        """
        try:
            route_table = RouteTable.objects.get(id=route_table_id, vpc__owner=user)
        except RouteTable.DoesNotExist:
            raise ResourceNotFoundError("Route table not found")

        destination = route_data.get('destination_cidr_block')
        if not self._validate_cidr_block(destination):
            raise InvalidConfigurationError("Invalid destination CIDR block")

        # Check for duplicate route
        if Route.objects.filter(route_table=route_table, destination_cidr_block=destination).exists():
            raise InvalidConfigurationError("Route already exists for this destination")

        route = Route.objects.create(
            route_table=route_table,
            destination_cidr_block=destination,
            target_type=route_data.get('target_type'),  # igw, nat_gateway, vpc_peering, instance
            target_id=route_data.get('target_id'),
            state='active',
        )

        self._audit_log(user, 'route_created', route_table.id, {'destination': destination})
        return route

    # ========== DNS MANAGEMENT ==========

    @transaction.atomic
    def create_dns_record(self, dns_data, user):
        """
        Create a DNS record.

        Args:
            dns_data: Dict with DNS record configuration
            user: User who owns the record

        Returns:
            DNSRecord: Created DNS record
        """
        record_type = dns_data.get('record_type')
        if record_type not in ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'SRV', 'NS']:
            raise InvalidConfigurationError(f"Invalid record type: {record_type}")

        # Validate values for record type
        if record_type == 'A' and not self._validate_ipv4(dns_data.get('value')):
            raise InvalidConfigurationError("Invalid IPv4 address for A record")
        elif record_type == 'AAAA' and not self._validate_ipv6(dns_data.get('value')):
            raise InvalidConfigurationError("Invalid IPv6 address for AAAA record")

        record = DNSRecord.objects.create(
            name=dns_data.get('name'),
            owner=user,
            record_type=record_type,
            value=dns_data.get('value'),
            ttl=dns_data.get('ttl', 300),
            routing_policy=dns_data.get('routing_policy', 'simple'),  # simple, weighted, latency, geolocation, failover
            metadata=dns_data.get('metadata', {}),
        )

        self._audit_log(user, 'dns_record_created', record.id, {'record_type': record_type})
        return record

    # ========== CDN MANAGEMENT ==========

    @transaction.atomic
    def create_cdn_distribution(self, cdn_data, user):
        """
        Create a CDN distribution.

        Args:
            cdn_data: Dict with CDN configuration
            user: User who owns the distribution

        Returns:
            CDNDistribution: Created distribution
        """
        distribution = CDNDistribution.objects.create(
            domain_name=cdn_data.get('domain_name'),
            owner=user,
            origin_domain=cdn_data.get('origin_domain'),
            origin_type=cdn_data.get('origin_type', 's3'),  # s3, http, lb
            enabled=cdn_data.get('enabled', True),
            enable_http2=cdn_data.get('enable_http2', True),
            enable_ipv6=cdn_data.get('enable_ipv6', True),
            default_ttl=cdn_data.get('default_ttl', 86400),
            max_ttl=cdn_data.get('max_ttl', 31536000),
            compress_objects=cdn_data.get('compress_objects', True),
            enable_origin_shield=cdn_data.get('enable_origin_shield', False),
            waf_enabled=cdn_data.get('waf_enabled', False),
            metadata=cdn_data.get('metadata', {}),
        )

        # Allocate distribution domain
        distribution.distribution_domain = f"d{distribution.id[:8]}.cloudfront.net"
        distribution.save()

        self._audit_log(user, 'cdn_distribution_created', distribution.id, {})
        return distribution

    def invalidate_cdn_cache(self, distribution_id, paths, user):
        """
        Invalidate cache for specific paths in a CDN distribution.

        Args:
            distribution_id: ID of distribution
            paths: List of paths to invalidate (e.g., ['/*', '/api/*'])
            user: User performing operation

        Returns:
            Dict: Invalidation status
        """
        try:
            distribution = CDNDistribution.objects.get(id=distribution_id, owner=user)
        except CDNDistribution.DoesNotExist:
            raise ResourceNotFoundError("Distribution not found")

        return {
            'distribution_id': distribution.id,
            'invalidation_id': f"inv-{distribution.id}-{timezone.now().timestamp()}",
            'paths': paths,
            'status': 'in-progress',
            'created_at': timezone.now(),
        }

    # ========== VPN MANAGEMENT ==========

    def create_vpn_connection(self, vpn_data, user):
        """
        Create a VPN connection.

        Args:
            vpn_data: Dict with VPN configuration
            user: User who owns the VPN

        Returns:
            VPNConnection: Created VPN connection
        """
        try:
            vpc = VPC.objects.get(id=vpn_data.get('vpc_id'), owner=user)
        except VPC.DoesNotExist:
            raise DependencyNotFoundError("VPC not found")

        vpn_conn = VPNConnection.objects.create(
            name=vpn_data.get('name'),
            owner=user,
            vpn_gateway_id=vpn_data.get('vpn_gateway_id'),
            customer_gateway_id=vpn_data.get('customer_gateway_id'),
            type=vpn_data.get('type', 'ipsec.1'),  # ipsec.1 or tls
            static_routes_only=vpn_data.get('static_routes_only', True),
            options=vpn_data.get('options', {}),
        )

        self._audit_log(user, 'vpn_connection_created', vpn_conn.id, {'vpc_id': vpc.id})
        return vpn_conn

    # ========== HELPER METHODS ==========

    def _validate_cidr_block(self, cidr):
        """Validate CIDR block format"""
        try:
            ipaddress.IPv4Network(cidr, strict=False)
            return True
        except (ValueError, ipaddress.AddressValueError, ipaddress.NetmaskValueError):
            return False

    def _validate_subnet_cidr(self, vpc_cidr, subnet_cidr):
        """Validate subnet CIDR is within VPC CIDR"""
        try:
            vpc_net = ipaddress.IPv4Network(vpc_cidr, strict=False)
            subnet_net = ipaddress.IPv4Network(subnet_cidr, strict=False)
            return subnet_net.subnet_of(vpc_net)
        except ValueError:
            return False

    def _calculate_available_ips(self, subnet_cidr):
        """Calculate available IPs in subnet (excluding network and broadcast)"""
        try:
            net = ipaddress.IPv4Network(subnet_cidr)
            return int(net.num_addresses) - 5  # Reserve 5 IPs (AWS standard)
        except ValueError:
            return 0

    def _validate_security_group_rule(self, rule):
        """Validate security group rule"""
        protocol = rule.get('protocol')
        if protocol not in ['tcp', 'udp', 'icmp', 'all', '-1']:
            return False

        if protocol in ['tcp', 'udp']:
            from_port = rule.get('from_port')
            to_port = rule.get('to_port')
            if not isinstance(from_port, int) or not isinstance(to_port, int):
                return False
            if from_port < 0 or to_port > 65535 or from_port > to_port:
                return False

        # Must have either CIDR or source SG
        if not rule.get('cidr_block') and not rule.get('source_security_group_id'):
            return False

        return True

    def _validate_ipv4(self, ip):
        """Validate IPv4 address"""
        try:
            ipaddress.IPv4Address(ip)
            return True
        except ValueError:
            return False

    def _validate_ipv6(self, ip):
        """Validate IPv6 address"""
        try:
            ipaddress.IPv6Address(ip)
            return True
        except ValueError:
            return False

    def _create_default_security_group(self, vpc):
        """Create default security group for VPC"""
        sg = SecurityGroup.objects.create(
            name='default',
            description='Default security group for VPC',
            vpc=vpc,
            owner=vpc.owner,
        )
        # Allow traffic within SG
        SecurityGroupRule.objects.create(
            security_group=sg,
            direction='ingress',
            protocol='all',
            cidr_block=vpc.cidr_block,
        )

    def _create_default_route_table(self, vpc):
        """Create default route table for VPC"""
        RouteTable.objects.create(
            vpc=vpc,
            name='default',
            is_default=True,
            owner=vpc.owner,
        )

    def _audit_log(self, user, action, resource_id, details):
        """Log an audit event"""
        # TODO: Implement actual audit logging
        pass
