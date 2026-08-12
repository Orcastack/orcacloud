# OrcaCloud IAM Service – ViewSets

import uuid
import hashlib
import secrets
from django.contrib.auth.models import User
from django.utils import timezone
from django.db.models import Q
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import IAMGroup, IAMRole, IAMPolicy, AccessKey, MFADevice, IAMUserProfile, IAMAuditLog
from .serializers import (
    IAMUserSerializer, IAMGroupSerializer, IAMRoleSerializer, IAMPolicySerializer,
    AccessKeySerializer, MFADeviceSerializer, IAMAuditLogSerializer,
)


class IAMUserViewSet(viewsets.ModelViewSet):
    """CRUD + lifecycle actions for IAM users."""
    permission_classes = [IsAuthenticated]
    serializer_class = IAMUserSerializer

    def get_queryset(self):
        return User.objects.filter(is_active=True).select_related('iam_profile').prefetch_related('iam_groups')

    @action(detail=True, methods=['post'])
    def enable_mfa(self, request, pk=None):
        user = self.get_object()
        profile, _ = IAMUserProfile.objects.get_or_create(user=user)
        profile.mfa_enabled = True
        profile.save()
        self._audit(request, 'iam.EnableMFA', 'User', str(user.id))
        return Response({'status': 'mfa_enabled'})

    @action(detail=True, methods=['post'])
    def disable_mfa(self, request, pk=None):
        user = self.get_object()
        profile, _ = IAMUserProfile.objects.get_or_create(user=user)
        profile.mfa_enabled = False
        profile.save()
        self._audit(request, 'iam.DisableMFA', 'User', str(user.id))
        return Response({'status': 'mfa_disabled'})

    @action(detail=True, methods=['post'])
    def create_access_key(self, request, pk=None):
        user = self.get_object()
        raw_secret = secrets.token_hex(32)
        key = AccessKey.objects.create(
            owner=user,
            secret_hash=hashlib.sha256(raw_secret.encode()).hexdigest(),
        )
        self._audit(request, 'iam.CreateAccessKey', 'AccessKey', key.key_id)
        return Response({
            'key_id': key.key_id,
            'secret': raw_secret,
            'message': 'Store this secret securely — it will not be shown again.',
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'])
    def access_keys(self, request, pk=None):
        user = self.get_object()
        qs = AccessKey.objects.filter(owner=user).exclude(status='deleted')
        return Response(AccessKeySerializer(qs, many=True).data)

    @action(detail=True, methods=['get'])
    def mfa_devices(self, request, pk=None):
        user = self.get_object()
        qs = MFADevice.objects.filter(owner=user)
        return Response(MFADeviceSerializer(qs, many=True).data)

    def _audit(self, request, event_type, resource_type, resource_id, outcome='success'):
        IAMAuditLog.objects.create(
            actor=request.user,
            actor_ip=request.META.get('REMOTE_ADDR'),
            source='api',
            event_type=event_type,
            resource_type=resource_type,
            resource_id=str(resource_id),
            outcome=outcome,
        )


class IAMGroupViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = IAMGroupSerializer

    def get_queryset(self):
        return IAMGroup.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=['post'])
    def add_member(self, request, pk=None):
        group = self.get_object()
        user_id = request.data.get('user_id')
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        group.members.add(user)
        return Response({'status': 'member_added'})

    @action(detail=True, methods=['post'])
    def remove_member(self, request, pk=None):
        group = self.get_object()
        user_id = request.data.get('user_id')
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        group.members.remove(user)
        return Response({'status': 'member_removed'})


class IAMRoleViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = IAMRoleSerializer

    def get_queryset(self):
        return IAMRole.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=['post'])
    def assume_role(self, request, pk=None):
        role = self.get_object()
        session_token = secrets.token_hex(32)
        role.last_used = timezone.now()
        role.save(update_fields=['last_used'])
        return Response({
            'role_id': str(role.id),
            'role_name': role.name,
            'session_token': session_token,
            'expires_in': role.max_session_duration_hours * 3600,
        })


class IAMPolicyViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = IAMPolicySerializer

    def get_queryset(self):
        qs = IAMPolicy.objects.filter(
            Q(owner=self.request.user) | Q(is_orcacloud_managed=True)
        )
        return qs

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=['post'])
    def simulate(self, request, pk=None):
        """Simulate whether a policy would allow or deny a given action."""
        policy = self.get_object()
        action_to_test = request.data.get('action', '')
        resource = request.data.get('resource', '*')
        # Simple simulation – production would use a full policy engine
        doc = policy.policy_document
        statements = doc.get('Statement', [])
        result = 'implicit_deny'
        for stmt in statements:
            if stmt.get('Effect') == 'Allow':
                if action_to_test in stmt.get('Action', []) or '*' in stmt.get('Action', []):
                    result = 'allow'
                    break
            elif stmt.get('Effect') == 'Deny':
                if action_to_test in stmt.get('Action', []) or '*' in stmt.get('Action', []):
                    result = 'explicit_deny'
                    break
        return Response({'action': action_to_test, 'resource': resource, 'result': result, 'policy_id': str(policy.id)})


class AccessKeyViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = AccessKeySerializer

    def get_queryset(self):
        return AccessKey.objects.filter(owner=self.request.user).exclude(status='deleted')

    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        key = self.get_object()
        key.status = 'inactive'
        key.save(update_fields=['status'])
        return Response({'status': 'inactive'})

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        key = self.get_object()
        key.status = 'active'
        key.save(update_fields=['status'])
        return Response({'status': 'active'})

    def destroy(self, request, *args, **kwargs):
        key = self.get_object()
        key.status = 'deleted'
        key.save(update_fields=['status'])
        return Response(status=status.HTTP_204_NO_CONTENT)


class IAMAuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only audit log view."""
    permission_classes = [IsAuthenticated]
    serializer_class = IAMAuditLogSerializer

    def get_queryset(self):
        qs = IAMAuditLog.objects.filter(actor=self.request.user)
        event_type = self.request.query_params.get('event_type')
        outcome    = self.request.query_params.get('outcome')
        since      = self.request.query_params.get('since')
        if event_type:
            qs = qs.filter(event_type__icontains=event_type)
        if outcome:
            qs = qs.filter(outcome=outcome)
        if since:
            qs = qs.filter(created_at__gte=since)
        return qs[:500]  # cap at 500 for performance
