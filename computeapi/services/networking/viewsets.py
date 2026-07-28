# OrcaCloud Networking Service - ViewSets

import uuid
import ipaddress

from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from .models import (
    VPC, Subnet, SecurityGroup, SecurityGroupRule,
    LoadBalancer, TargetGroup, Listener,
    RouteTable, Route, DNSRecord, CDNDistribution,
    VPNGateway, CustomerGateway, VPNConnection,
    InternetGateway, NATGateway, ServiceMeshPolicy,
)
from infrastructure.openstack.networking import provision_load_balancer, delete_load_balancer, load_balancer_metrics
from infrastructure.openstack.networking import provision_cdn_distribution, delete_cdn_distribution, cdn_distribution_metrics
from .serializers import (
    VPCListSerializer, VPCDetailSerializer, VPCCreateSerializer,
    SubnetListSerializer, SubnetDetailSerializer, SubnetCreateSerializer,
    SecurityGroupListSerializer, SecurityGroupDetailSerializer, SecurityGroupCreateSerializer,
    SecurityGroupRuleListSerializer, SecurityGroupRuleDetailSerializer, SecurityGroupRuleCreateSerializer,
    LoadBalancerListSerializer, LoadBalancerDetailSerializer, LoadBalancerCreateSerializer,
    TargetGroupListSerializer, TargetGroupDetailSerializer,
    ListenerListSerializer,
    RouteTableListSerializer, RouteTableDetailSerializer, RouteTableCreateSerializer,
    RouteListSerializer, RouteDetailSerializer, RouteCreateSerializer,
    DNSRecordListSerializer, DNSRecordDetailSerializer, DNSRecordCreateSerializer,
    CDNDistributionListSerializer, CDNDistributionDetailSerializer, CDNDistributionCreateSerializer,
    VPNConnectionListSerializer, VPNConnectionDetailSerializer, VPNConnectionCreateSerializer,
    VPNGatewayListSerializer, CustomerGatewayListSerializer,
    InternetGatewayListSerializer, InternetGatewayCreateSerializer,
    NATGatewayListSerializer, NATGatewayDetailSerializer, NATGatewayCreateSerializer
)
from ..core.tenant import TenantScopedViewSetMixin


# ============================================================================
# VPC VIEWSET
# ============================================================================

class VPCViewSet(TenantScopedViewSetMixin, viewsets.ModelViewSet):
    """
    Viewset for Virtual Private Clouds.
    Full CRUD operations for managing VPCs and their configuration.
    """
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    lookup_field = 'resource_id'
    lookup_url_kwarg = 'pk'
    filterset_fields = ['owner', 'region', 'status']
    search_fields = ['vpc_id', 'name', 'cidr_block']
    ordering_fields = ['created_at', 'name', 'region']
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter VPCs by owner."""
        return self.filter_queryset_by_tenant(VPC.objects.all())

    def get_serializer_class(self):
        """Use different serializers for different actions."""
        if self.action == 'retrieve':
            return VPCDetailSerializer
        elif self.action == 'create':
            return VPCCreateSerializer
        return VPCListSerializer

    def perform_create(self, serializer):
        """Create VPC with generated ID and default networking controls."""
        vpc = serializer.save(
            **self.build_tenant_create_kwargs(VPC),
            vpc_id=f"vpc-{uuid.uuid4().hex[:12]}",
            status='available',
        )
        RouteTable.objects.create(
            route_table_id=f"rtb-{uuid.uuid4().hex[:12]}",
            name=f"{vpc.name}-main",
            description='Main route table',
            vpc=vpc,
            is_main=True,
            owner=self.request.user,
            tags={'managed': 'true', 'type': 'main'},
        )

    @action(detail=True, methods=['post'])
    def configure_flow_logs(self, request, pk=None):
        """Enable/disable VPC flow logs destination."""
        vpc = self.get_object()
        enabled = bool(request.data.get('enabled', True))
        destination = request.data.get('destination', vpc.flow_logs_destination or 'monitoring://vpc-flow-logs')
        vpc.flow_logs_enabled = enabled
        vpc.flow_logs_destination = destination if enabled else ''
        vpc.save(update_fields=['flow_logs_enabled', 'flow_logs_destination'])
        return Response({'status': 'ok', 'flow_logs_enabled': vpc.flow_logs_enabled, 'destination': vpc.flow_logs_destination})

    @action(detail=True, methods=['get'])
    def flow_logs(self, request, pk=None):
        """Return synthesized flow-log events for this VPC."""
        vpc = self.get_object()
        samples = []
        for idx, subnet in enumerate(vpc.subnets.all()[:5]):
            samples.append({
                'timestamp': f"2026-02-22T12:{10 + idx:02d}:00Z",
                'subnet_id': subnet.subnet_id,
                'src_ip': f"10.0.{idx + 1}.10",
                'dst_ip': '198.51.100.10' if subnet.map_public_ip_on_launch else '10.0.100.12',
                'dst_port': 443,
                'protocol': 'tcp',
                'action': 'allow',
            })

        return Response({
            'vpc_id': vpc.vpc_id,
            'flow_logs_enabled': vpc.flow_logs_enabled,
            'destination': vpc.flow_logs_destination,
            'events': samples,
        })

    @action(detail=True, methods=['get'])
    def topology(self, request, pk=None):
        """Return topology summary for architecture visualization."""
        vpc = self.get_object()
        return Response({
            'vpc': {'id': vpc.vpc_id, 'name': vpc.name, 'cidr': vpc.cidr_block, 'region': vpc.region},
            'subnets': [
                {
                    'id': subnet.subnet_id,
                    'cidr': subnet.cidr_block,
                    'az': subnet.availability_zone,
                    'tier': subnet.tags.get('tier', 'public' if subnet.map_public_ip_on_launch else 'private'),
                }
                for subnet in vpc.subnets.all()
            ],
            'route_tables': [
                {
                    'id': table.route_table_id,
                    'name': table.name,
                    'is_main': table.is_main,
                    'associated_subnets': table.associated_subnets,
                }
                for table in vpc.route_tables.all()
            ],
            'security_groups': [
                {'id': sg.sg_id, 'name': sg.name, 'rules': sg.rules.count()}
                for sg in vpc.security_groups.all()
            ],
            'internet_gateways': [ig.ig_id for ig in InternetGateway.objects.filter(vpc=vpc, owner=request.user)],
            'nat_gateways': [nat.nat_gw_id for nat in NATGateway.objects.filter(subnet__vpc=vpc, owner=request.user)],
        })

    @action(detail=True, methods=['get'])
    def subnets(self, request, pk=None):
        """Get all subnets in VPC."""
        vpc = self.get_object()
        subnets = vpc.subnets.all()
        serializer = SubnetListSerializer(subnets, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def security_groups(self, request, pk=None):
        """Get all security groups in VPC."""
        vpc = self.get_object()
        sgs = vpc.security_groups.all()
        serializer = SecurityGroupListSerializer(sgs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def route_tables(self, request, pk=None):
        """Get all route tables in VPC."""
        vpc = self.get_object()
        rts = vpc.route_tables.all()
        serializer = RouteTableListSerializer(rts, many=True)
        return Response(serializer.data)


# ============================================================================
# SUBNET VIEWSET
# ============================================================================

class SubnetViewSet(TenantScopedViewSetMixin, viewsets.ModelViewSet):
    """
    Viewset for VPC subnets.
    Full CRUD operations for managing subnets.
    """
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['vpc', 'availability_zone', 'is_default']
    search_fields = ['subnet_id', 'name', 'cidr_block']
    ordering_fields = ['created_at', 'availability_zone']
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter subnets by VPC owner."""
        return self.filter_queryset_by_tenant(Subnet.objects.filter(vpc__owner=self.request.user), owner_field='vpc__owner')

    def get_serializer_class(self):
        """Use different serializers for different actions."""
        if self.action == 'retrieve':
            return SubnetDetailSerializer
        elif self.action == 'create':
            return SubnetCreateSerializer
        return SubnetListSerializer

    def perform_create(self, serializer):
        """Create subnet with generated ID and available IP estimation."""
        cidr = serializer.validated_data.get('cidr_block')
        available_ips = 0
        try:
            network = ipaddress.ip_network(cidr, strict=False)
            available_ips = max(0, network.num_addresses - 5)
        except Exception:
            available_ips = 0

        serializer.save(
            subnet_id=f"subnet-{uuid.uuid4().hex[:12]}",
            available_ip_count=available_ips,
        )

    @action(detail=True, methods=['post'])
    def enable_public_ips(self, request, pk=None):
        """Enable automatic public IP assignment."""
        subnet = self.get_object()
        subnet.map_public_ip_on_launch = True
        subnet.tags = {**(subnet.tags or {}), 'tier': 'public'}
        subnet.save(update_fields=['map_public_ip_on_launch', 'tags'])
        return Response({'status': 'Public IP assignment enabled'})

    @action(detail=True, methods=['post'])
    def set_tier(self, request, pk=None):
        """Set subnet tier (public/private) and launch IP behavior."""
        subnet = self.get_object()
        tier = request.data.get('tier', 'private')
        if tier not in ['public', 'private']:
            return Response({'error': 'tier must be public or private'}, status=status.HTTP_400_BAD_REQUEST)

        subnet.map_public_ip_on_launch = tier == 'public'
        subnet.tags = {**(subnet.tags or {}), 'tier': tier}
        subnet.save(update_fields=['map_public_ip_on_launch', 'tags'])
        return Response({'status': 'ok', 'tier': tier, 'map_public_ip_on_launch': subnet.map_public_ip_on_launch})


# ============================================================================
# SECURITY GROUP VIEWSET
# ============================================================================

class SecurityGroupViewSet(viewsets.ModelViewSet):
    """
    Viewset for security groups.
    Full CRUD operations for managing security groups and rules.
    """
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    lookup_field = 'resource_id'
    lookup_url_kwarg = 'pk'
    filterset_fields = ['owner', 'vpc', 'is_default']
    search_fields = ['sg_id', 'name']
    ordering_fields = ['created_at', 'name']
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter security groups by owner."""
        return SecurityGroup.objects.filter(owner=self.request.user)

    def get_serializer_class(self):
        """Use different serializers for different actions."""
        if self.action == 'retrieve':
            return SecurityGroupDetailSerializer
        elif self.action == 'create':
            return SecurityGroupCreateSerializer
        return SecurityGroupListSerializer

    def perform_create(self, serializer):
        """Set owner to current user."""
        serializer.save(owner=self.request.user, sg_id=f"sg-{uuid.uuid4().hex[:12]}")

    @action(detail=True, methods=['post'])
    def add_rule(self, request, pk=None):
        """Add ingress/egress rule."""
        sg = self.get_object()
        serializer = SecurityGroupRuleCreateSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(security_group=sg)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def rules(self, request, pk=None):
        """Get all rules in security group."""
        sg = self.get_object()
        rules = sg.rules.all()
        serializer = SecurityGroupRuleListSerializer(rules, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def authorize_ingress(self, request, pk=None):
        """Add ingress rule (HTTP/HTTPS shortcut)."""
        sg = self.get_object()
        protocol = request.data.get('protocol', 'tcp')
        from_port = request.data.get('from_port')
        to_port = request.data.get('to_port', from_port)
        cidr = request.data.get('cidr', '0.0.0.0/0')

        rule = SecurityGroupRule.objects.create(
            security_group=sg,
            direction='ingress',
            protocol=protocol,
            from_port=from_port,
            to_port=to_port,
            cidr_ipv4=cidr
        )
        serializer = SecurityGroupRuleDetailSerializer(rule)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def apply_template(self, request, pk=None):
        """Apply common zero-trust security templates."""
        sg = self.get_object()
        template = request.data.get('template', 'private-service')
        rules_to_add = []

        if template == 'web-public':
            rules_to_add = [
                {'direction': 'ingress', 'protocol': 'tcp', 'from_port': 80, 'to_port': 80, 'cidr_ipv4': '0.0.0.0/0'},
                {'direction': 'ingress', 'protocol': 'tcp', 'from_port': 443, 'to_port': 443, 'cidr_ipv4': '0.0.0.0/0'},
            ]
        elif template == 'private-service':
            rules_to_add = [
                {'direction': 'ingress', 'protocol': 'tcp', 'from_port': 8080, 'to_port': 8080, 'cidr_ipv4': '10.0.0.0/8'},
            ]
        else:
            return Response({'error': 'Unsupported template'}, status=status.HTTP_400_BAD_REQUEST)

        created = 0
        for rule_data in rules_to_add:
            exists = sg.rules.filter(
                direction=rule_data['direction'],
                protocol=rule_data['protocol'],
                from_port=rule_data['from_port'],
                to_port=rule_data['to_port'],
                cidr_ipv4=rule_data['cidr_ipv4'],
            ).exists()
            if not exists:
                SecurityGroupRule.objects.create(security_group=sg, **rule_data)
                created += 1

        return Response({'status': 'ok', 'template': template, 'rules_created': created})


# ============================================================================
# LOAD BALANCER VIEWSET
# ============================================================================

class LoadBalancerViewSet(viewsets.ModelViewSet):
    """
    Viewset for load balancers.
    Full CRUD operations for managing load balancers.
    """
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    lookup_field = 'resource_id'
    lookup_url_kwarg = 'pk'
    filterset_fields = ['owner', 'status', 'lb_type', 'scheme']
    search_fields = ['lb_id', 'name', 'dns_name']
    ordering_fields = ['created_at', 'name', 'status']
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter load balancers by owner."""
        return LoadBalancer.objects.filter(owner=self.request.user)

    def get_serializer_class(self):
        """Use different serializers for different actions."""
        if self.action == 'retrieve':
            return LoadBalancerDetailSerializer
        elif self.action == 'create':
            return LoadBalancerCreateSerializer
        return LoadBalancerListSerializer

    def perform_create(self, serializer):
        """Set owner and provision LB endpoint via OpenStack adapter."""
        lb = serializer.save(
            owner=self.request.user,
            lb_id=f"lb-{uuid.uuid4().hex[:12]}",
            status='provisioning',
        )
        provisioned = provision_load_balancer(
            name=lb.name,
            scheme=lb.scheme,
            subnets=lb.subnets,
        )
        lb.dns_name = provisioned.get('dns_name', '')
        lb.status = provisioned.get('status', 'running')
        lb.metadata = {
            **(lb.metadata or {}),
            'provider': provisioned.get('provider', 'simulated'),
            'vip_address': provisioned.get('vip_address', ''),
            'openstack_id': provisioned.get('openstack_id', ''),
        }
        lb.save()

    def perform_destroy(self, instance):
        """Attempt provider-side deletion before DB delete."""
        openstack_id = (instance.metadata or {}).get('openstack_id')
        delete_load_balancer(openstack_id=openstack_id)
        super().perform_destroy(instance)

    @action(detail=True, methods=['get'])
    def listeners(self, request, pk=None):
        """Get all listeners."""
        lb = self.get_object()
        listeners = lb.listeners.all()
        serializer = ListenerListSerializer(listeners, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def target_groups(self, request, pk=None):
        """Get all target groups."""
        lb = self.get_object()
        tgs = lb.target_groups.all()
        serializer = TargetGroupListSerializer(tgs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def add_target_group(self, request, pk=None):
        """Create target group."""
        from .serializers import TargetGroupCreateSerializer, TargetGroupDetailSerializer
        lb = self.get_object()
        data = request.data.copy()
        data['load_balancer'] = lb.pk
        serializer = TargetGroupCreateSerializer(data=data)
        if serializer.is_valid():
            tg = serializer.save()
            return Response(TargetGroupDetailSerializer(tg).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def set_algorithm(self, request, pk=None):
        """Configure traffic distribution algorithm for LB."""
        lb = self.get_object()
        algorithm = request.data.get('algorithm', 'round_robin')
        if algorithm not in ['round_robin', 'least_connections', 'ip_hash', 'weighted']:
            return Response({'error': 'Unsupported algorithm'}, status=status.HTTP_400_BAD_REQUEST)
        lb.metadata = {**(lb.metadata or {}), 'algorithm': algorithm}
        lb.save(update_fields=['metadata'])
        return Response({'status': 'ok', 'algorithm': algorithm})

    @action(detail=True, methods=['post'])
    def enable_tls(self, request, pk=None):
        """Attach TLS configuration for SSL termination."""
        lb = self.get_object()
        certificate_arn = request.data.get('certificate_arn', '')
        ssl_policy = request.data.get('ssl_policy', 'TLS-1-2-2021')
        if not certificate_arn:
            return Response({'error': 'certificate_arn is required'}, status=status.HTTP_400_BAD_REQUEST)

        listener, _ = Listener.objects.get_or_create(
            load_balancer=lb,
            port=443,
            defaults={
                'protocol': 'https',
                'default_action': 'forward',
            },
        )
        listener.protocol = 'https'
        listener.certificate_arn = certificate_arn
        listener.ssl_policy = ssl_policy
        listener.save()
        return Response({'status': 'ok', 'listener_id': listener.listener_id})

    @action(detail=True, methods=['post'])
    def configure_cdn_origin(self, request, pk=None):
        """Store CDN origin integration metadata for this LB."""
        lb = self.get_object()
        origin_host = request.data.get('origin_host', lb.dns_name)
        cache_enabled = bool(request.data.get('cache_enabled', True))
        lb.metadata = {
            **(lb.metadata or {}),
            'cdn_origin_host': origin_host,
            'cdn_cache_enabled': cache_enabled,
        }
        lb.save(update_fields=['metadata'])
        return Response({'status': 'ok', 'origin_host': origin_host, 'cache_enabled': cache_enabled})

    @action(detail=True, methods=['post'])
    def configure_health_check(self, request, pk=None):
        """Apply health-check settings to all target groups on the LB."""
        lb = self.get_object()
        path = request.data.get('path', '/')
        interval = int(request.data.get('interval_seconds', 30))
        timeout = int(request.data.get('timeout_seconds', 5))
        healthy = int(request.data.get('healthy_threshold', 2))
        unhealthy = int(request.data.get('unhealthy_threshold', 2))

        updated = 0
        for tg in lb.target_groups.all():
            tg.health_check_enabled = True
            tg.health_check_path = path
            tg.health_check_interval_seconds = interval
            tg.health_check_timeout_seconds = timeout
            tg.healthy_threshold_count = healthy
            tg.unhealthy_threshold_count = unhealthy
            tg.save()
            updated += 1

        return Response({'status': 'ok', 'updated_target_groups': updated})

    @action(detail=True, methods=['get'])
    def metrics(self, request, pk=None):
        """Return load balancer performance/health metrics."""
        lb = self.get_object()
        return Response(load_balancer_metrics(lb_name=lb.name))


# ============================================================================
# TARGET GROUP VIEWSET
# ============================================================================

class TargetGroupViewSet(viewsets.ModelViewSet):
    """
    Viewset for target groups.
    Full CRUD operations for managing target groups and targets.
    """
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['load_balancer', 'protocol', 'target_type']
    search_fields = ['tg_id', 'name']
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter target groups by LB owner."""
        return TargetGroup.objects.filter(load_balancer__owner=self.request.user)

    def get_serializer_class(self):
        """Use different serializers for different actions."""
        if self.action == 'retrieve':
            return TargetGroupDetailSerializer
        return TargetGroupListSerializer

    @action(detail=True, methods=['post'])
    def register_target(self, request, pk=None):
        """Register target with group."""
        tg = self.get_object()
        target_id = request.data.get('target_id')
        port = request.data.get('port', tg.port)
        if not target_id:
            return Response({'error': 'target_id required'}, status=status.HTTP_400_BAD_REQUEST)

        weight = int(request.data.get('weight', 100))
        targets = tg.registered_targets
        targets.append({'id': target_id, 'port': port})
        targets[-1]['weight'] = weight
        tg.registered_targets = targets
        tg.health_status[target_id] = 'healthy'
        tg.save()
        return Response({'status': f'Target {target_id} registered'})

    @action(detail=True, methods=['post'])
    def set_target_weight(self, request, pk=None):
        """Set weighted distribution for a target in this group."""
        tg = self.get_object()
        target_id = request.data.get('target_id')
        weight = int(request.data.get('weight', 100))
        if not target_id:
            return Response({'error': 'target_id required'}, status=status.HTTP_400_BAD_REQUEST)

        updated = False
        targets = tg.registered_targets
        for target in targets:
            if target.get('id') == target_id:
                target['weight'] = weight
                updated = True
                break

        if not updated:
            return Response({'error': 'target not found'}, status=status.HTTP_404_NOT_FOUND)

        tg.registered_targets = targets
        tg.save(update_fields=['registered_targets'])
        return Response({'status': 'ok', 'target_id': target_id, 'weight': weight})

    @action(detail=True, methods=['get'])
    def health(self, request, pk=None):
        """Get current health status for registered targets."""
        tg = self.get_object()
        return Response({'target_group': tg.tg_id, 'health_status': tg.health_status})

    @action(detail=True, methods=['post'])
    def deregister_target(self, request, pk=None):
        """Deregister target from group."""
        tg = self.get_object()
        target_id = request.data.get('target_id')
        if not target_id:
            return Response({'error': 'target_id required'}, status=status.HTTP_400_BAD_REQUEST)

        tg.registered_targets = [t for t in tg.registered_targets if t['id'] != target_id]
        if target_id in tg.health_status:
            del tg.health_status[target_id]
        tg.save()
        return Response({'status': f'Target {target_id} deregistered'})


# ============================================================================
# ROUTE TABLE VIEWSET
# ============================================================================

class RouteTableViewSet(viewsets.ModelViewSet):
    """
    Viewset for route tables.
    Full CRUD operations for managing routes.
    """
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    lookup_field = 'resource_id'
    lookup_url_kwarg = 'pk'
    filterset_fields = ['vpc', 'is_main']
    search_fields = ['route_table_id', 'name']
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter route tables by VPC owner."""
        return RouteTable.objects.filter(vpc__owner=self.request.user)

    def get_serializer_class(self):
        """Use different serializers for different actions."""
        if self.action == 'retrieve':
            return RouteTableDetailSerializer
        if self.action == 'create':
            return RouteTableCreateSerializer
        return RouteTableListSerializer

    def perform_create(self, serializer):
        """Create route table with generated id and owner."""
        serializer.save(
            owner=self.request.user,
            route_table_id=f"rtb-{uuid.uuid4().hex[:12]}",
        )

    @action(detail=True, methods=['get'])
    def routes(self, request, pk=None):
        """Get all routes in table."""
        rt = self.get_object()
        routes = rt.routes.all()
        serializer = RouteListSerializer(routes, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def add_route(self, request, pk=None):
        """Add route to table."""
        rt = self.get_object()
        serializer = RouteCreateSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(route_table=rt)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def associate_subnet(self, request, pk=None):
        """Associate subnet IDs to route table."""
        rt = self.get_object()
        subnet_id = request.data.get('subnet_id')
        if not subnet_id:
            return Response({'error': 'subnet_id required'}, status=status.HTTP_400_BAD_REQUEST)

        associated = list(rt.associated_subnets or [])
        if subnet_id not in associated:
            associated.append(subnet_id)
            rt.associated_subnets = associated
            rt.save(update_fields=['associated_subnets'])
        return Response({'status': 'ok', 'associated_subnets': rt.associated_subnets})

    @action(detail=True, methods=['post'])
    def set_default_route(self, request, pk=None):
        """Ensure a 0.0.0.0/0 route exists for IGW or NAT target."""
        rt = self.get_object()
        target_type = request.data.get('target_type', 'internet-gateway')
        target_id = request.data.get('target_id', '')
        if target_type not in ['internet-gateway', 'nat-gateway']:
            return Response({'error': 'target_type must be internet-gateway or nat-gateway'}, status=status.HTTP_400_BAD_REQUEST)

        route, created = Route.objects.get_or_create(
            route_table=rt,
            destination_cidr='0.0.0.0/0',
            defaults={'target_type': target_type, 'target_id': target_id, 'status': 'active'},
        )
        if not created:
            route.target_type = target_type
            route.target_id = target_id
            route.status = 'active'
            route.save(update_fields=['target_type', 'target_id', 'status'])

        return Response({'status': 'ok', 'route_id': route.route_id, 'target_type': route.target_type, 'target_id': route.target_id})


# ============================================================================
# DNS RECORD VIEWSET
# ============================================================================

class DNSRecordViewSet(viewsets.ModelViewSet):
    """
    Viewset for DNS records.
    Full CRUD operations for managing DNS records.
    """
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['zone_id', 'record_type', 'owner']
    search_fields = ['name', 'record_id']
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter DNS records by owner."""
        return DNSRecord.objects.filter(owner=self.request.user)

    def get_serializer_class(self):
        """Use different serializers for different actions."""
        if self.action == 'retrieve':
            return DNSRecordDetailSerializer
        elif self.action == 'create':
            return DNSRecordCreateSerializer
        return DNSRecordListSerializer

    def perform_create(self, serializer):
        """Set owner to current user."""
        serializer.save(owner=self.request.user, record_id=f"dns-{uuid.uuid4().hex[:12]}")

    @action(detail=True, methods=['get'])
    def resolve(self, request, pk=None):
        """Return simplified DNS resolution response."""
        record = self.get_object()
        return Response({
            'name': record.name,
            'record_type': record.record_type,
            'values': record.values,
            'ttl': record.ttl,
            'routing_policy': record.routing_policy,
        })


# ============================================================================
# CDN DISTRIBUTION VIEWSET
# ============================================================================

class CDNDistributionViewSet(viewsets.ModelViewSet):
    """
    Viewset for CDN distributions.
    Full CRUD operations for managing CDN distributions.
    """
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    lookup_field = 'resource_id'
    lookup_url_kwarg = 'pk'
    filterset_fields = ['owner', 'status', 'enabled']
    search_fields = ['distribution_id', 'name', 'origin_domain']
    ordering_fields = ['created_at', 'name', 'status']
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter CDN distributions by owner."""
        return CDNDistribution.objects.filter(owner=self.request.user)

    def get_serializer_class(self):
        """Use different serializers for different actions."""
        if self.action == 'retrieve':
            return CDNDistributionDetailSerializer
        elif self.action == 'create':
            return CDNDistributionCreateSerializer
        return CDNDistributionListSerializer

    def perform_create(self, serializer):
        """Set owner and provision CDN distribution metadata."""
        dist = serializer.save(
            owner=self.request.user,
            distribution_id=f"cdn-{uuid.uuid4().hex[:12]}",
            status='provisioning',
        )

        if dist.origin_path and not dist.origin_path.startswith('/'):
            dist.origin_path = f"/{dist.origin_path}"

        provider_hint = (dist.metadata or {}).get('provider')
        provisioned = provision_cdn_distribution(
            name=dist.name,
            origin_domain=dist.origin_domain,
            domain_names=dist.domain_names,
            provider_hint=provider_hint,
        )

        dist.distribution_id = provisioned.get('distribution_id', dist.distribution_id)
        dist.status = provisioned.get('status', 'running')
        dist.metadata = {
            **(dist.metadata or {}),
            'provider': provisioned.get('provider', 'simulated'),
            'edge_domain': provisioned.get('edge_domain', ''),
            'active_custom_domains': provisioned.get('active_custom_domains', dist.domain_names),
            'cache_policy': {
                'static_ttl_seconds': dist.default_ttl_seconds,
                'dynamic_ttl_seconds': 60,
                'bypass_paths': ['/api/*'],
                'cache_query_strings': False,
            },
            'performance': {
                'http2_enabled': True,
                'http3_enabled': True,
                'compression': 'brotli+gzip',
                'image_optimization': True,
            },
            'security': {
                'tls_minimum': dist.ssl_protocol_minimum,
                'waf_enabled': dist.waf_enabled,
                'ddos_mitigation_enabled': True,
            },
            'purge_history': [],
        }
        dist.save()

    def perform_destroy(self, instance):
        """Attempt provider-side distribution deletion before DB removal."""
        provider = (instance.metadata or {}).get('provider')
        delete_cdn_distribution(distribution_id=instance.distribution_id, provider=provider)
        super().perform_destroy(instance)

    @action(detail=True, methods=['post'])
    def invalidate_cache(self, request, pk=None):
        """Invalidate CDN cache for paths."""
        dist = self.get_object()
        paths = request.data.get('paths', ['/*'])
        history = (dist.metadata or {}).get('purge_history', [])
        purge_job = {
            'purge_id': f"purge-{uuid.uuid4().hex[:10]}",
            'paths': paths,
            'status': 'completed',
        }
        history.insert(0, purge_job)
        dist.metadata = {
            **(dist.metadata or {}),
            'purge_history': history[:20],
        }
        dist.save(update_fields=['metadata'])
        return Response({'status': 'Cache invalidation completed', 'paths': paths, 'purge_id': purge_job['purge_id']})

    @action(detail=True, methods=['post'])
    def set_cache_policy(self, request, pk=None):
        """Configure CDN cache policy for static and dynamic routes."""
        dist = self.get_object()
        static_ttl = int(request.data.get('static_ttl_seconds', dist.default_ttl_seconds))
        dynamic_ttl = int(request.data.get('dynamic_ttl_seconds', 60))
        bypass_paths = request.data.get('bypass_paths', ['/api/*'])
        cache_query_strings = bool(request.data.get('cache_query_strings', False))
        vary_headers = request.data.get('vary_headers', ['Accept-Encoding'])

        dist.default_ttl_seconds = static_ttl
        dist.max_ttl_seconds = max(int(request.data.get('max_ttl_seconds', dist.max_ttl_seconds)), static_ttl)
        dist.metadata = {
            **(dist.metadata or {}),
            'cache_policy': {
                'static_ttl_seconds': static_ttl,
                'dynamic_ttl_seconds': dynamic_ttl,
                'bypass_paths': bypass_paths,
                'cache_query_strings': cache_query_strings,
                'vary_headers': vary_headers,
            },
        }
        dist.save(update_fields=['default_ttl_seconds', 'max_ttl_seconds', 'metadata'])
        return Response({'status': 'ok', 'cache_policy': dist.metadata.get('cache_policy', {})})

    @action(detail=True, methods=['post'])
    def set_security(self, request, pk=None):
        """Configure TLS, WAF and edge security controls."""
        dist = self.get_object()
        require_https = bool(request.data.get('require_https', True))
        ssl_minimum = request.data.get('ssl_protocol_minimum', dist.ssl_protocol_minimum)
        waf_enabled = bool(request.data.get('waf_enabled', dist.waf_enabled))
        waf_web_acl_id = request.data.get('waf_web_acl_id', dist.waf_web_acl_id)
        ddos_enabled = bool(request.data.get('ddos_mitigation_enabled', True))

        dist.require_https = require_https
        dist.ssl_protocol_minimum = ssl_minimum
        dist.waf_enabled = waf_enabled
        dist.waf_web_acl_id = waf_web_acl_id
        dist.metadata = {
            **(dist.metadata or {}),
            'security': {
                'tls_minimum': ssl_minimum,
                'waf_enabled': waf_enabled,
                'waf_web_acl_id': waf_web_acl_id,
                'ddos_mitigation_enabled': ddos_enabled,
            },
        }
        dist.save(update_fields=['require_https', 'ssl_protocol_minimum', 'waf_enabled', 'waf_web_acl_id', 'metadata'])
        return Response({'status': 'ok', 'security': dist.metadata.get('security', {})})

    @action(detail=True, methods=['post'])
    def set_performance(self, request, pk=None):
        """Configure edge protocol and optimization settings."""
        dist = self.get_object()
        http2_enabled = bool(request.data.get('http2_enabled', True))
        http3_enabled = bool(request.data.get('http3_enabled', True))
        compression = request.data.get('compression', 'brotli+gzip')
        image_optimization = bool(request.data.get('image_optimization', True))

        dist.metadata = {
            **(dist.metadata or {}),
            'performance': {
                'http2_enabled': http2_enabled,
                'http3_enabled': http3_enabled,
                'compression': compression,
                'image_optimization': image_optimization,
            },
        }
        dist.save(update_fields=['metadata'])
        return Response({'status': 'ok', 'performance': dist.metadata.get('performance', {})})

    @action(detail=True, methods=['get'])
    def metrics(self, request, pk=None):
        """Return distribution performance and cache metrics."""
        dist = self.get_object()
        payload = cdn_distribution_metrics(name=dist.name)
        payload['distribution_id'] = dist.distribution_id
        payload['edge_domain'] = (dist.metadata or {}).get('edge_domain', '')
        return Response(payload)

    @action(detail=True, methods=['get'])
    def edge_status(self, request, pk=None):
        """Return simplified edge rollout status summary."""
        dist = self.get_object()
        regions = ['us-east', 'us-west', 'eu-central', 'ap-southeast']
        seed = sum(ord(ch) for ch in dist.name) % 7
        status_items = []
        for idx, region in enumerate(regions):
            status_items.append(
                {
                    'region': region,
                    'status': 'healthy' if (seed + idx) % 5 else 'degraded',
                    'p95_latency_ms': 40 + ((seed + idx * 9) % 35),
                }
            )

        return Response({'distribution_id': dist.distribution_id, 'edges': status_items})


# ============================================================================
# VPN CONNECTION VIEWSET
# ============================================================================

class VPNConnectionViewSet(viewsets.ModelViewSet):
    """
    Viewset for VPN connections.
    Full CRUD operations for managing VPN connections.
    """
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['vpn_gateway', 'customer_gateway', 'status']
    search_fields = ['connection_id']
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter VPN connections by gateway owner."""
        return VPNConnection.objects.filter(vpn_gateway__owner=self.request.user)

    def get_serializer_class(self):
        """Use different serializers for different actions."""
        if self.action == 'retrieve':
            return VPNConnectionDetailSerializer
        elif self.action == 'create':
            return VPNConnectionCreateSerializer
        return VPNConnectionListSerializer


# ============================================================================
# VPN GATEWAY VIEWSET
# ============================================================================

class VPNGatewayViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Viewset for VPN gateways.
    Read-only access to VPN gateway information.
    """
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['owner', 'vpc', 'status']
    search_fields = ['vpn_gw_id', 'name']
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter VPN gateways by owner."""
        return VPNGateway.objects.filter(owner=self.request.user)

    serializer_class = VPNGatewayListSerializer


# ============================================================================
# INTERNET GATEWAY VIEWSET
# ============================================================================

class InternetGatewayViewSet(viewsets.ModelViewSet):
    """
    Viewset for internet gateways.
    Full CRUD operations for managing internet gateways.
    """
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    lookup_field = 'resource_id'
    lookup_url_kwarg = 'pk'
    filterset_fields = ['owner', 'vpc', 'status']
    search_fields = ['ig_id', 'name']
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter internet gateways by owner."""
        return InternetGateway.objects.filter(owner=self.request.user)

    def get_serializer_class(self):
        if self.action == 'create':
            return InternetGatewayCreateSerializer
        return InternetGatewayListSerializer

    def perform_create(self, serializer):
        """Set owner to current user."""
        serializer.save(owner=self.request.user, ig_id=f"igw-{uuid.uuid4().hex[:12]}", status='available')

    @action(detail=True, methods=['post'])
    def attach_vpc(self, request, pk=None):
        """Attach IGW to another VPC owned by user."""
        igw = self.get_object()
        vpc_resource_id = request.data.get('vpc_resource_id')
        if not vpc_resource_id:
            return Response({'error': 'vpc_resource_id required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            vpc = VPC.objects.get(resource_id=vpc_resource_id, owner=request.user)
        except VPC.DoesNotExist:
            return Response({'error': 'VPC not found'}, status=status.HTTP_404_NOT_FOUND)

        igw.vpc = vpc
        igw.save(update_fields=['vpc'])
        return Response({'status': 'ok', 'igw_id': igw.ig_id, 'vpc_id': vpc.vpc_id})


# ============================================================================
# NAT GATEWAY VIEWSET
# ============================================================================

class NATGatewayViewSet(viewsets.ModelViewSet):
    """
    Viewset for NAT gateways.
    Full CRUD operations for managing NAT gateways.
    """
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    lookup_field = 'resource_id'
    lookup_url_kwarg = 'pk'
    filterset_fields = ['owner', 'subnet', 'status']
    search_fields = ['nat_gw_id', 'name']
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter NAT gateways by owner."""
        return NATGateway.objects.filter(owner=self.request.user)

    def get_serializer_class(self):
        """Use different serializers for different actions."""
        if self.action == 'retrieve':
            return NATGatewayDetailSerializer
        if self.action == 'create':
            return NATGatewayCreateSerializer
        return NATGatewayListSerializer

    def perform_create(self, serializer):
        """Set owner to current user."""
        generated_public_ip = serializer.validated_data.get('public_ip') or f"198.51.100.{(uuid.uuid4().int % 200) + 10}"
        generated_eip = serializer.validated_data.get('eip_allocation_id') or f"eipalloc-{uuid.uuid4().hex[:10]}"
        serializer.save(
            owner=self.request.user,
            nat_gw_id=f"nat-{uuid.uuid4().hex[:12]}",
            status='available',
            public_ip=generated_public_ip,
            eip_allocation_id=generated_eip,
        )

    @action(detail=True, methods=['post'])
    def failover(self, request, pk=None):
        """Simulate NAT gateway failover event."""
        nat = self.get_object()
        standby_ip = f"198.51.100.{(uuid.uuid4().int % 200) + 10}"
        nat.metadata = {
            **(nat.metadata or {}),
            'last_failover': {
                'event_id': f"failover-{uuid.uuid4().hex[:8]}",
                'old_public_ip': nat.public_ip,
                'new_public_ip': standby_ip,
            },
        }
        nat.public_ip = standby_ip
        nat.save(update_fields=['public_ip', 'metadata'])
        return Response({'status': 'ok', 'public_ip': nat.public_ip, 'event': nat.metadata.get('last_failover')})


# ── Service Mesh ──────────────────────────────────────────────────────────────

from rest_framework import serializers as drf_serializers


class ServiceMeshPolicySerializer(drf_serializers.ModelSerializer):
    class Meta:
        model = ServiceMeshPolicy
        fields = '__all__'
        read_only_fields = ['id', 'policy_id', 'owner', 'created_at', 'updated_at']


class ServiceMeshPolicyViewSet(viewsets.ModelViewSet):
    """
    CRUD for service mesh policies + mTLS enforcement actions.

    Each policy scopes mTLS mode and ingress/egress controls to a
    VPC, Kubernetes namespace, or label-selected workload group.
    """
    serializer_class = ServiceMeshPolicySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = ServiceMeshPolicy.objects.filter(owner=self.request.user)
        vpc_id = self.request.query_params.get('vpc_id')
        cluster_id = self.request.query_params.get('cluster_id')
        if vpc_id:
            qs = qs.filter(vpc__resource_id=vpc_id)
        if cluster_id:
            qs = qs.filter(cluster_id=cluster_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=['post'])
    def enforce_strict(self, request, pk=None):
        """Upgrade this policy to strict mTLS mode."""
        policy = self.get_object()
        policy.mtls_mode = 'strict'
        policy.save(update_fields=['mtls_mode', 'updated_at'])
        return Response({
            'policy_id': policy.policy_id,
            'mtls_mode': policy.mtls_mode,
            'detail': 'mTLS mode set to strict. All workload traffic now requires mutual TLS.',
        })

    @action(detail=True, methods=['post'])
    def disable_mtls(self, request, pk=None):
        """Downgrade to disabled mTLS (use with caution)."""
        policy = self.get_object()
        policy.mtls_mode = 'disabled'
        policy.save(update_fields=['mtls_mode', 'updated_at'])
        return Response({
            'policy_id': policy.policy_id,
            'mtls_mode': policy.mtls_mode,
            'detail': 'mTLS enforcement disabled for this policy scope.',
        })

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Return mTLS coverage summary across all user policies."""
        from django.db.models import Count
        qs = ServiceMeshPolicy.objects.filter(owner=request.user, is_active=True)
        by_mode = dict(qs.values_list('mtls_mode').annotate(count=Count('id')))
        total = qs.count()
        strict_count = by_mode.get('strict', 0)
        return Response({
            'total_active_policies': total,
            'by_mode': by_mode,
            'strict_coverage_pct': round((strict_count / total * 100), 1) if total else 0,
        })
