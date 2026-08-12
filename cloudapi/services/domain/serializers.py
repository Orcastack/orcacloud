from rest_framework import serializers
from .models import Domain, DnsZone, DomainDnsRecord, DomainTransfer, SslCertificate


# ── DNS ───────────────────────────────────────────────────────────────────────

class DnsRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model  = DomainDnsRecord
        fields = [
            'id', 'recordset_id', 'name', 'record_type',
            'records', 'ttl', 'is_managed', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'recordset_id', 'is_managed', 'created_at', 'updated_at']


class DnsRecordCreateSerializer(serializers.Serializer):
    name        = serializers.CharField(max_length=255)
    record_type = serializers.ChoiceField(choices=DomainDnsRecord.RECORD_TYPES)
    records     = serializers.ListField(child=serializers.CharField(), min_length=1)
    ttl         = serializers.IntegerField(min_value=60, max_value=86400, default=300)


class DnsRecordUpdateSerializer(serializers.Serializer):
    recordset_id = serializers.CharField(max_length=64)
    records      = serializers.ListField(child=serializers.CharField(), min_length=1)
    ttl          = serializers.IntegerField(min_value=60, max_value=86400, required=False)


class DnsZoneSerializer(serializers.ModelSerializer):
    records = DnsRecordSerializer(many=True, read_only=True)

    class Meta:
        model  = DnsZone
        fields = [
            'id', 'zone_id', 'zone_name', 'status',
            'email', 'ttl', 'serial', 'records',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'zone_id', 'serial', 'created_at', 'updated_at']


# ── SSL ───────────────────────────────────────────────────────────────────────

class SslCertificateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = SslCertificate
        fields = [
            'cert_id', 'common_name', 'sans', 'issuer',
            'status', 'issued_at', 'expires_at', 'auto_renew',
        ]
        read_only_fields = fields


# ── Domain Transfers ─────────────────────────────────────────────────────────

class DomainTransferSerializer(serializers.ModelSerializer):
    class Meta:
        model  = DomainTransfer
        fields = [
            'id', 'status', 'reseller_order_id',
            'initiated_at', 'completed_at', 'error_message',
        ]
        read_only_fields = fields


# ── Domain ────────────────────────────────────────────────────────────────────

class DomainListSerializer(serializers.ModelSerializer):
    owner_username    = serializers.CharField(source='owner.username', read_only=True)
    days_until_expiry = serializers.IntegerField(read_only=True)

    class Meta:
        model  = Domain
        fields = [
            'resource_id', 'domain_name', 'tld', 'status',
            'expires_at', 'days_until_expiry', 'auto_renew',
            'whois_privacy', 'dnssec_enabled', 'nameservers',
            'owner_username', 'created_at',
        ]
        read_only_fields = fields


class DomainDetailSerializer(serializers.ModelSerializer):
    owner_username    = serializers.CharField(source='owner.username', read_only=True)
    days_until_expiry = serializers.IntegerField(read_only=True)
    dns_zone          = DnsZoneSerializer(read_only=True)
    ssl_certs         = SslCertificateSerializer(many=True, read_only=True)
    transfers         = DomainTransferSerializer(many=True, read_only=True)

    class Meta:
        model  = Domain
        fields = [
            'resource_id', 'domain_name', 'tld', 'status',
            'reseller_order_id', 'reseller_customer_id',
            'registered_at', 'expires_at', 'days_until_expiry',
            'auto_renew', 'registration_years', 'whois_privacy', 'dnssec_enabled',
            'nameservers', 'registrant_contact', 'admin_contact', 'tech_contact',
            'linked_compute_id', 'linked_storage_bucket',
            'dns_zone', 'ssl_certs', 'transfers',
            'owner_username', 'tags', 'metadata',
            'created_at', 'updated_at',
        ]
        read_only_fields = fields


class DomainCreateSerializer(serializers.Serializer):
    domain_name        = serializers.CharField(max_length=253)
    registration_years = serializers.IntegerField(min_value=1, max_value=10, default=1)
    whois_privacy      = serializers.BooleanField(default=True)
    auto_renew         = serializers.BooleanField(default=True)

    def validate_domain_name(self, value: str) -> str:
        value = value.lower().strip()
        if Domain.objects.filter(domain_name=value).exists():
            raise serializers.ValidationError('Domain already registered on this platform.')
        return value


class DomainTransferCreateSerializer(serializers.Serializer):
    domain_name = serializers.CharField(max_length=253)
    epp_code    = serializers.CharField(max_length=128)

    def validate_domain_name(self, value: str) -> str:
        return value.lower().strip()


class UpdateNameserversSerializer(serializers.Serializer):
    nameservers = serializers.ListField(
        child=serializers.CharField(max_length=253),
        min_length=2,
        max_length=6,
    )


class CheckAvailabilitySerializer(serializers.Serializer):
    domain_name = serializers.CharField(max_length=253)
    tlds        = serializers.ListField(
        child=serializers.CharField(max_length=32),
        required=False,
        default=list,
    )

    def validate_domain_name(self, value: str) -> str:
        return value.lower().strip().split('.')[0]  # strip any TLD the user typed
