# OrcaCloud – API Management ViewSets

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from . import service
from .models import (
    ApiDefinition, ApiGateway, ApiConsumer, ApiKey,
    ApiProduct, ApiPolicy, ApimMetricSnapshot, ApimAuditLog,
)
from .serializers import (
    ApiDefinitionSerializer, ApiDefinitionCreateSerializer,
    ApiGatewaySerializer, ApiGatewayCreateSerializer,
    ApiConsumerSerializer, ApiConsumerCreateSerializer,
    ApiKeySerializer, ApiKeyCreateSerializer,
    ApiProductSerializer, ApiProductCreateSerializer,
    ApiPolicySerializer, ApiPolicyCreateSerializer,
    ApimMetricSnapshotSerializer, ApimAuditLogSerializer,
)


# ─── Overview ─────────────────────────────────────────────────────────────────

class ApimOverviewViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        data = service.get_apim_overview(request.user)
        return Response(data)


# ─── API Definitions ──────────────────────────────────────────────────────────

class ApiDefinitionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ApiDefinitionSerializer

    def get_queryset(self):
        qs = ApiDefinition.objects.filter(owner=self.request.user)
        env = self.request.query_params.get('environment')
        st  = self.request.query_params.get('status')
        q   = self.request.query_params.get('search')
        if env:
            qs = qs.filter(environment=env)
        if st:
            qs = qs.filter(status=st)
        if q:
            qs = qs.filter(name__icontains=q)
        return qs.order_by('-created_at')

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return ApiDefinitionCreateSerializer
        return ApiDefinitionSerializer

    def perform_create(self, serializer):
        api = serializer.save(owner=self.request.user)
        service._audit(
            self.request.user, 'api_created', 'api', api.id, api.name,
            api.environment, actor=self.request.user.username,
        )

    @action(detail=True, methods=['post'])
    def deprecate(self, request, pk=None):
        api = service.deprecate_api(request.user, pk, actor=request.user.username)
        if api is None:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(ApiDefinitionSerializer(api).data)

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        api = get_object_or_404(ApiDefinition, id=pk, owner=request.user)
        before = {'status': api.status}
        api.status = 'active'
        api.save(update_fields=['status', 'updated_at'])
        service._audit(
            request.user, 'api_updated', 'api', api.id, api.name,
            api.environment, actor=request.user.username,
            before=before, after={'status': 'active'},
        )
        return Response(ApiDefinitionSerializer(api).data)

    @action(detail=True, methods=['post'])
    def retire(self, request, pk=None):
        api = get_object_or_404(ApiDefinition, id=pk, owner=request.user)
        before = {'status': api.status}
        api.status = 'retired'
        api.save(update_fields=['status', 'updated_at'])
        service._audit(
            request.user, 'api_deleted', 'api', api.id, api.name,
            api.environment, actor=request.user.username,
            before=before, after={'status': 'retired'},
        )
        return Response(ApiDefinitionSerializer(api).data)


# ─── Gateways ─────────────────────────────────────────────────────────────────

class ApiGatewayViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ApiGatewaySerializer

    def get_queryset(self):
        qs = ApiGateway.objects.filter(owner=self.request.user)
        env = self.request.query_params.get('environment')
        if env:
            qs = qs.filter(environment=env)
        return qs.order_by('-created_at')

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return ApiGatewayCreateSerializer
        return ApiGatewaySerializer

    def perform_create(self, serializer):
        gw = serializer.save(owner=self.request.user, health='unknown')
        service._audit(
            self.request.user, 'gateway_registered', 'gateway', gw.id, gw.name,
            gw.environment, actor=self.request.user.username,
        )

    @action(detail=False, methods=['get'])
    def live(self, request):
        """Return gateway list with mock fallback."""
        rows = service.get_gateway_list(
            request.user,
            environment=request.query_params.get('environment'),
        )
        return Response(rows)

    @action(detail=True, methods=['post'])
    def attach_api(self, request, pk=None):
        from .models import GatewayApiRoute
        gw  = get_object_or_404(ApiGateway, id=pk, owner=request.user)
        api_id = request.data.get('api_id')
        if not api_id:
            return Response({'detail': 'api_id required.'}, status=status.HTTP_400_BAD_REQUEST)
        api = get_object_or_404(ApiDefinition, id=api_id, owner=request.user)
        GatewayApiRoute.objects.get_or_create(gateway=gw, api=api)
        gw.active_apis = gw.routes.count()
        gw.save(update_fields=['active_apis', 'updated_at'])
        return Response({'status': 'attached', 'gateway_id': pk, 'api_id': api_id})

    @action(detail=True, methods=['post'])
    def detach_api(self, request, pk=None):
        from .models import GatewayApiRoute
        gw     = get_object_or_404(ApiGateway, id=pk, owner=request.user)
        api_id = request.data.get('api_id')
        if not api_id:
            return Response({'detail': 'api_id required.'}, status=status.HTTP_400_BAD_REQUEST)
        GatewayApiRoute.objects.filter(gateway=gw, api_id=api_id).delete()
        gw.active_apis = gw.routes.count()
        gw.save(update_fields=['active_apis', 'updated_at'])
        return Response({'status': 'detached', 'gateway_id': pk, 'api_id': api_id})


# ─── Consumers ────────────────────────────────────────────────────────────────

class ApiConsumerViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ApiConsumerSerializer

    def get_queryset(self):
        qs = ApiConsumer.objects.filter(owner=self.request.user)
        env = self.request.query_params.get('environment')
        q   = self.request.query_params.get('search')
        if env:
            qs = qs.filter(environment=env)
        if q:
            qs = qs.filter(name__icontains=q)
        return qs.order_by('-total_requests', '-created_at')

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return ApiConsumerCreateSerializer
        return ApiConsumerSerializer

    def perform_create(self, serializer):
        con = serializer.save(owner=self.request.user)
        service._audit(
            self.request.user, 'consumer_created', 'consumer', con.id, con.name,
            con.environment, actor=self.request.user.username,
        )

    @action(detail=False, methods=['get'])
    def live(self, request):
        rows = service.get_consumer_list(
            request.user,
            environment=request.query_params.get('environment'),
            search=request.query_params.get('search'),
        )
        return Response(rows)


# ─── API Keys ─────────────────────────────────────────────────────────────────

class ApiKeyViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ApiKeySerializer

    def get_queryset(self):
        qs = ApiKey.objects.filter(owner=self.request.user)
        con = self.request.query_params.get('consumer')
        env = self.request.query_params.get('environment')
        st  = self.request.query_params.get('status')
        if con:
            qs = qs.filter(consumer_id=con)
        if env:
            qs = qs.filter(environment=env)
        if st:
            qs = qs.filter(status=st)
        return qs.order_by('-created_at')

    def get_serializer_class(self):
        if self.action in ('create',):
            return ApiKeyCreateSerializer
        return ApiKeySerializer

    def create(self, request, *args, **kwargs):
        """Override to generate key hash and return raw key once."""
        serializer = ApiKeyCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        consumer = get_object_or_404(ApiConsumer, id=data['consumer'].id, owner=request.user)
        key, raw = service.generate_key(
            owner=request.user,
            consumer=consumer,
            name=data['name'],
            environment=data.get('environment', 'production'),
            scopes=data.get('scopes', []),
            rate_limit=data.get('rate_limit', 1000),
            quota=data.get('quota', 0),
            expires_at=data.get('expires_at'),
            actor=request.user.username,
        )
        result = ApiKeySerializer(key).data
        result['raw_key'] = raw   # shown once only
        return Response(result, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def revoke(self, request, pk=None):
        key = service.revoke_key(request.user, pk, actor=request.user.username)
        if key is None:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(ApiKeySerializer(key).data)

    @action(detail=True, methods=['post'])
    def rotate(self, request, pk=None):
        old_key = get_object_or_404(ApiKey, id=pk, owner=request.user)
        service.revoke_key(request.user, pk, actor=request.user.username)
        new_key, raw = service.generate_key(
            owner=request.user,
            consumer=old_key.consumer,
            name=old_key.name + ' (rotated)',
            environment=old_key.environment,
            scopes=old_key.scopes,
            rate_limit=old_key.rate_limit,
            quota=old_key.quota,
            expires_at=old_key.expires_at,
            actor=request.user.username,
        )
        service._audit(
            request.user, 'key_rotated', 'key', new_key.id, new_key.name,
            new_key.environment, actor=request.user.username,
        )
        result = ApiKeySerializer(new_key).data
        result['raw_key'] = raw
        return Response(result, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'])
    def live(self, request):
        rows = service.get_key_list(
            request.user,
            consumer_id=request.query_params.get('consumer'),
            environment=request.query_params.get('environment'),
            status=request.query_params.get('status'),
        )
        return Response(rows)


# ─── Products ─────────────────────────────────────────────────────────────────

class ApiProductViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ApiProductSerializer

    def get_queryset(self):
        qs = ApiProduct.objects.filter(owner=self.request.user)
        env = self.request.query_params.get('environment')
        st  = self.request.query_params.get('status')
        if env:
            qs = qs.filter(environment=env)
        if st:
            qs = qs.filter(status=st)
        return qs.order_by('-created_at')

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return ApiProductCreateSerializer
        return ApiProductSerializer

    def perform_create(self, serializer):
        prod = serializer.save(owner=self.request.user)
        service._audit(
            self.request.user, 'product_created', 'product', prod.id, prod.name,
            prod.environment, actor=self.request.user.username,
        )

    @action(detail=True, methods=['post'])
    def attach_api(self, request, pk=None):
        from .models import ApiProductApi
        prod   = get_object_or_404(ApiProduct, id=pk, owner=request.user)
        api_id = request.data.get('api_id')
        if not api_id:
            return Response({'detail': 'api_id required.'}, status=status.HTTP_400_BAD_REQUEST)
        api = get_object_or_404(ApiDefinition, id=api_id, owner=request.user)
        ApiProductApi.objects.get_or_create(product=prod, api=api)
        return Response({'status': 'attached', 'product_id': pk, 'api_id': api_id})

    @action(detail=False, methods=['get'])
    def live(self, request):
        rows = service.get_product_list(request.user, environment=request.query_params.get('environment'))
        return Response(rows)


# ─── Policies ─────────────────────────────────────────────────────────────────

class ApiPolicyViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ApiPolicySerializer

    def get_queryset(self):
        qs = ApiPolicy.objects.filter(owner=self.request.user)
        pt  = self.request.query_params.get('policy_type')
        env = self.request.query_params.get('environment')
        if pt:
            qs = qs.filter(policy_type=pt)
        if env:
            qs = qs.filter(environment=env)
        return qs.order_by('priority', '-created_at')

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return ApiPolicyCreateSerializer
        return ApiPolicySerializer

    def perform_create(self, serializer):
        pol = serializer.save(owner=self.request.user)
        service._audit(
            self.request.user, 'policy_attached', 'policy', pol.id, pol.name,
            pol.environment, actor=self.request.user.username,
        )

    @action(detail=True, methods=['post'])
    def toggle(self, request, pk=None):
        pol = get_object_or_404(ApiPolicy, id=pk, owner=request.user)
        pol.enabled = not pol.enabled
        pol.save(update_fields=['enabled', 'updated_at'])
        return Response(ApiPolicySerializer(pol).data)

    @action(detail=True, methods=['post'])
    def attach_to_gateway(self, request, pk=None):
        from .models import ApiPolicyAttachment
        pol    = get_object_or_404(ApiPolicy, id=pk, owner=request.user)
        gw_id  = request.data.get('gateway_id')
        if not gw_id:
            return Response({'detail': 'gateway_id required.'}, status=status.HTTP_400_BAD_REQUEST)
        gw = get_object_or_404(ApiGateway, id=gw_id, owner=request.user)
        attachment, _ = ApiPolicyAttachment.objects.get_or_create(policy=pol, gateway=gw)
        return Response({'status': 'attached', 'policy_id': pk, 'gateway_id': gw_id})

    @action(detail=True, methods=['post'])
    def attach_to_api(self, request, pk=None):
        from .models import ApiPolicyAttachment
        pol    = get_object_or_404(ApiPolicy, id=pk, owner=request.user)
        api_id = request.data.get('api_id')
        if not api_id:
            return Response({'detail': 'api_id required.'}, status=status.HTTP_400_BAD_REQUEST)
        api = get_object_or_404(ApiDefinition, id=api_id, owner=request.user)
        attachment, _ = ApiPolicyAttachment.objects.get_or_create(policy=pol, api=api)
        service._audit(
            request.user, 'policy_attached', 'policy', pol.id, pol.name,
            pol.environment, actor=request.user.username,
        )
        return Response({'status': 'attached', 'policy_id': pk, 'api_id': api_id})

    @action(detail=False, methods=['get'])
    def live(self, request):
        rows = service.get_policy_list(
            request.user,
            policy_type=request.query_params.get('policy_type'),
            environment=request.query_params.get('environment'),
        )
        return Response(rows)


# ─── Analytics ────────────────────────────────────────────────────────────────

class ApimAnalyticsViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        hours = int(request.query_params.get('hours', 24))
        data  = service.get_analytics(
            request.user,
            hours=hours,
            api_id=request.query_params.get('api_id'),
            gateway_id=request.query_params.get('gateway_id'),
        )
        return Response(data)

    @action(detail=False, methods=['get'])
    def audit_log(self, request):
        hours       = int(request.query_params.get('hours', 72))
        entity_type = request.query_params.get('entity_type')
        limit       = int(request.query_params.get('limit', 100))
        rows = service.get_audit_log(request.user, entity_type=entity_type,
                                     hours=hours, limit=limit)
        return Response(rows)
