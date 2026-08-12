# OrcaCloud IAM Service – Serializers

from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    IAMGroup, IAMRole, IAMPolicy, AccessKey, MFADevice, IAMUserProfile, IAMAuditLog
)


class IAMUserSerializer(serializers.ModelSerializer):
    mfa_enabled = serializers.SerializerMethodField()
    mfa_enforced = serializers.SerializerMethodField()
    console_access = serializers.SerializerMethodField()
    programmatic_access = serializers.SerializerMethodField()
    last_login_ip = serializers.SerializerMethodField()
    groups = serializers.SerializerMethodField()
    access_key_count = serializers.SerializerMethodField()
    password_last_changed = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'is_active', 'is_staff', 'date_joined', 'last_login',
            'mfa_enabled', 'mfa_enforced', 'console_access',
            'programmatic_access', 'last_login_ip', 'groups',
            'access_key_count', 'password_last_changed',
        ]
        read_only_fields = ['id', 'date_joined', 'last_login']

    def _profile(self, obj):
        try:
            return obj.iam_profile
        except IAMUserProfile.DoesNotExist:
            return None

    def get_mfa_enabled(self, obj):
        p = self._profile(obj)
        return p.mfa_enabled if p else False

    def get_mfa_enforced(self, obj):
        p = self._profile(obj)
        return p.mfa_enforced if p else False

    def get_console_access(self, obj):
        p = self._profile(obj)
        return p.console_access if p else True

    def get_programmatic_access(self, obj):
        p = self._profile(obj)
        return p.programmatic_access if p else True

    def get_last_login_ip(self, obj):
        p = self._profile(obj)
        return p.last_login_ip if p else None

    def get_groups(self, obj):
        return list(obj.iam_groups.values_list('name', flat=True))

    def get_access_key_count(self, obj):
        return obj.access_keys.filter(status='active').count()

    def get_password_last_changed(self, obj):
        p = self._profile(obj)
        return p.password_last_changed if p else None


class IAMGroupSerializer(serializers.ModelSerializer):
    member_count = serializers.SerializerMethodField()

    class Meta:
        model = IAMGroup
        fields = [
            'id', 'resource_id', 'name', 'description', 'policies',
            'member_count', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'resource_id', 'created_at', 'updated_at', 'member_count']

    def get_member_count(self, obj):
        return obj.members.count()


class IAMRoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = IAMRole
        fields = [
            'id', 'resource_id', 'name', 'description',
            'trust_principal_type', 'trust_policy', 'permission_policies',
            'max_session_duration_hours', 'is_service_role', 'last_used',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'resource_id', 'created_at', 'updated_at']


class IAMPolicySerializer(serializers.ModelSerializer):
    class Meta:
        model = IAMPolicy
        fields = [
            'id', 'resource_id', 'name', 'description', 'policy_type',
            'policy_document', 'version', 'is_orcacloud_managed',
            'attachment_count', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'resource_id', 'created_at', 'updated_at', 'attachment_count']


class AccessKeySerializer(serializers.ModelSerializer):
    owner_username = serializers.CharField(source='owner.username', read_only=True)

    class Meta:
        model = AccessKey
        fields = [
            'id', 'key_id', 'owner', 'owner_username', 'status',
            'last_used', 'last_used_region', 'last_used_service',
            'created_at',
        ]
        read_only_fields = ['id', 'key_id', 'created_at', 'secret_hash']

    def to_representation(self, instance):
        # Never expose secret_hash
        data = super().to_representation(instance)
        return data


class MFADeviceSerializer(serializers.ModelSerializer):
    owner_username = serializers.CharField(source='owner.username', read_only=True)

    class Meta:
        model = MFADevice
        fields = [
            'id', 'owner', 'owner_username', 'device_type', 'device_name',
            'is_active', 'last_used', 'created_at',
        ]
        read_only_fields = ['id', 'created_at', 'serial']


class IAMAuditLogSerializer(serializers.ModelSerializer):
    actor_username = serializers.CharField(source='actor.username', read_only=True)

    class Meta:
        model = IAMAuditLog
        fields = [
            'id', 'event_id', 'actor', 'actor_username', 'actor_ip', 'actor_arn',
            'source', 'event_type', 'resource_type', 'resource_id', 'region',
            'outcome', 'request_params', 'response_code', 'error_message',
            'user_agent', 'created_at',
        ]
        read_only_fields = '__all__'
