from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import EmailDomain, Mailbox, EmailAlias, DkimKey, EmailActivityLog


# ── DKIM ──────────────────────────────────────────────────────────────────────

class DkimKeySerializer(serializers.ModelSerializer):
    class Meta:
        model  = DkimKey
        fields = ['id', 'selector', 'dns_record', 'is_active', 'created_at']
        read_only_fields = fields


# ── Email Domain ──────────────────────────────────────────────────────────────

class EmailDomainSerializer(serializers.ModelSerializer):
    domain_name       = serializers.CharField(source='domain.domain_name', read_only=True)
    dns_ready         = serializers.BooleanField(read_only=True)
    mailbox_count     = serializers.SerializerMethodField()
    alias_count       = serializers.SerializerMethodField()
    dkim_keys         = DkimKeySerializer(many=True, read_only=True)

    class Meta:
        model  = EmailDomain
        fields = [
            'id', 'domain_name', 'status',
            'mail_host', 'smtp_port', 'imap_port', 'pop_port',
            'mx_provisioned', 'spf_provisioned',
            'dkim_provisioned', 'dmarc_provisioned', 'dns_ready',
            'webmail_url', 'default_quota_mb',
            'mailbox_count', 'alias_count', 'dkim_keys',
            'created_at', 'updated_at',
        ]
        read_only_fields = fields

    def get_mailbox_count(self, obj):
        return obj.mailboxes.exclude(status='deleted').count()

    def get_alias_count(self, obj):
        return obj.aliases.filter(is_active=True).count()


# ── Mailbox ───────────────────────────────────────────────────────────────────

class MailboxListSerializer(serializers.ModelSerializer):
    email_address   = serializers.CharField(read_only=True)
    quota_used_pct  = serializers.FloatField(read_only=True)
    domain_name     = serializers.CharField(
        source='email_domain.domain.domain_name', read_only=True)

    class Meta:
        model  = Mailbox
        fields = [
            'resource_id', 'email_address', 'domain_name',
            'status', 'quota_mb', 'used_mb', 'quota_used_pct',
            'first_name', 'last_name', 'is_admin', 'forward_to',
            'last_login', 'created_at',
        ]
        read_only_fields = fields


class MailboxDetailSerializer(MailboxListSerializer):
    class Meta(MailboxListSerializer.Meta):
        fields = MailboxListSerializer.Meta.fields + [
            'keep_local_copy', 'tags', 'metadata', 'updated_at',
        ]
        read_only_fields = fields


class CreateMailboxSerializer(serializers.Serializer):
    domain_resource_id = serializers.CharField(help_text='resource_id of the domain')
    local_part         = serializers.SlugField(max_length=64,
                                               help_text='Username before @')
    password           = serializers.CharField(
        write_only=True, min_length=8, max_length=128,
        style={'input_type': 'password'},
    )
    first_name = serializers.CharField(max_length=100, required=False, default='')
    last_name  = serializers.CharField(max_length=100, required=False, default='')
    quota_mb   = serializers.IntegerField(min_value=100, max_value=51200,
                                          default=5120)
    is_admin   = serializers.BooleanField(default=False)

    def validate_local_part(self, value: str) -> str:
        return value.lower().strip()


class UpdateMailboxSerializer(serializers.Serializer):
    first_name      = serializers.CharField(max_length=100, required=False)
    last_name       = serializers.CharField(max_length=100, required=False)
    quota_mb        = serializers.IntegerField(min_value=100, max_value=51200,
                                               required=False)
    forward_to      = serializers.EmailField(required=False, allow_blank=True)
    keep_local_copy = serializers.BooleanField(required=False)
    is_admin        = serializers.BooleanField(required=False)


class ChangePasswordSerializer(serializers.Serializer):
    new_password = serializers.CharField(min_length=8, max_length=128,
                                         style={'input_type': 'password'})


# ── Alias ─────────────────────────────────────────────────────────────────────

class EmailAliasSerializer(serializers.ModelSerializer):
    alias_address = serializers.CharField(read_only=True)

    class Meta:
        model  = EmailAlias
        fields = ['id', 'alias_address', 'local_part', 'destinations',
                  'is_active', 'created_at']
        read_only_fields = ['id', 'alias_address', 'created_at']


class CreateAliasSerializer(serializers.Serializer):
    domain_resource_id = serializers.CharField()
    local_part         = serializers.SlugField(max_length=64)
    destinations       = serializers.ListField(
        child=serializers.EmailField(), min_length=1, max_length=20,
    )

    def validate_local_part(self, value: str) -> str:
        return value.lower().strip()


# ── Activity Log ──────────────────────────────────────────────────────────────

class EmailActivityLogSerializer(serializers.ModelSerializer):
    actor_username = serializers.CharField(source='actor.username',
                                           read_only=True, allow_null=True)

    class Meta:
        model  = EmailActivityLog
        fields = ['id', 'event', 'detail', 'actor_username', 'created_at']
        read_only_fields = fields
