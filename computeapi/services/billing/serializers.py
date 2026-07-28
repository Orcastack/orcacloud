# OrcaCloud – Billing Serializers

from rest_framework import serializers
from .models import (
    BillingAccount, PaymentMethod, Invoice, InvoiceLineItem,
    UsageRecord, CreditNote, WeeklyBillingSnapshot, PlatformUsageEvent,
)


class BillingAccountSerializer(serializers.ModelSerializer):
    plan_price    = serializers.SerializerMethodField()
    plan_features = serializers.SerializerMethodField()

    class Meta:
        model  = BillingAccount
        fields = [
            'id', 'plan', 'plan_price', 'plan_features',
            'company_name', 'billing_email', 'tax_id',
            'address_line1', 'address_line2', 'city', 'state',
            'postal_code', 'country', 'currency',
            'credit_balance', 'auto_pay', 'spend_limit',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'plan_price', 'plan_features', 'credit_balance', 'created_at', 'updated_at']

    def get_plan_price(self, obj):
        from .models import PLAN_PRICES
        return PLAN_PRICES.get(obj.plan, 0)

    def get_plan_features(self, obj):
        from .models import PLAN_FEATURES
        return PLAN_FEATURES.get(obj.plan, {})


class UpdateBillingAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model  = BillingAccount
        fields = [
            'plan', 'company_name', 'billing_email', 'tax_id',
            'address_line1', 'address_line2', 'city', 'state',
            'postal_code', 'country', 'currency', 'auto_pay', 'spend_limit',
        ]


# ── Payment Method ─────────────────────────────────────────────────────────────

class PaymentMethodSerializer(serializers.ModelSerializer):
    class Meta:
        model  = PaymentMethod
        fields = [
            'id', 'type', 'is_default', 'card_brand', 'card_last4',
            'card_exp_month', 'card_exp_year', 'display_name',
            'is_verified', 'created_at',
        ]
        read_only_fields = ['id', 'is_verified', 'created_at']


class CreatePaymentMethodSerializer(serializers.Serializer):
    type           = serializers.ChoiceField(choices=['card', 'bank_account', 'paypal'])
    is_default     = serializers.BooleanField(default=False)
    card_brand     = serializers.CharField(required=False, allow_blank=True)
    card_last4     = serializers.CharField(max_length=4, required=False, allow_blank=True)
    card_exp_month = serializers.IntegerField(required=False, allow_null=True)
    card_exp_year  = serializers.IntegerField(required=False, allow_null=True)
    display_name   = serializers.CharField(required=False, allow_blank=True)


# ── Invoice ────────────────────────────────────────────────────────────────────

class InvoiceLineItemSerializer(serializers.ModelSerializer):
    class Meta:
        model  = InvoiceLineItem
        fields = ['id', 'service', 'resource_id', 'description',
                  'quantity', 'unit', 'unit_price', 'amount']


class InvoiceListSerializer(serializers.ModelSerializer):
    line_items = InvoiceLineItemSerializer(many=True, read_only=True)

    class Meta:
        model  = Invoice
        fields = [
            'id', 'invoice_number', 'status', 'period_start', 'period_end',
            'subtotal', 'tax_amount', 'credits_applied', 'total', 'currency',
            'due_date', 'paid_at', 'line_items', 'created_at',
        ]


class InvoiceDetailSerializer(serializers.ModelSerializer):
    line_items = InvoiceLineItemSerializer(many=True, read_only=True)

    class Meta:
        model  = Invoice
        fields = [
            'id', 'invoice_number', 'status', 'period_start', 'period_end',
            'subtotal', 'tax_rate', 'tax_amount', 'credits_applied', 'total',
            'currency', 'due_date', 'paid_at', 'notes', 'pdf_url',
            'line_items', 'created_at', 'updated_at',
        ]


# ── Usage ──────────────────────────────────────────────────────────────────────

class UsageRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model  = UsageRecord
        fields = ['id', 'service', 'resource_id', 'metric', 'quantity',
                  'unit', 'unit_price', 'cost', 'period_start', 'period_end']


# ── Weekly Snapshot ────────────────────────────────────────────────────────────

class WeeklyBillingSnapshotSerializer(serializers.ModelSerializer):
    class Meta:
        model  = WeeklyBillingSnapshot
        fields = [
            'id', 'week_start', 'week_end', 'week_number', 'year',
            'service', 'total_cost', 'total_units', 'record_count', 'is_mock',
        ]


# ── Platform Usage Event (ingest) ──────────────────────────────────────────────

class PlatformUsageEventIngestSerializer(serializers.Serializer):
    """Validates POST /api/v1/billing/ingest/ payload."""
    service       = serializers.CharField(max_length=64)
    metric        = serializers.CharField(max_length=64)
    quantity      = serializers.DecimalField(max_digits=18, decimal_places=4)
    unit          = serializers.CharField(max_length=32, required=False, allow_blank=True, default='')
    resource_id   = serializers.CharField(max_length=128, required=False, allow_blank=True, default='')
    resource_type = serializers.CharField(max_length=64, required=False, allow_blank=True, default='')
    unit_price    = serializers.DecimalField(max_digits=12, decimal_places=6, required=False, allow_null=True)
    event_time    = serializers.DateTimeField(required=False, allow_null=True)


class PlatformUsageEventSerializer(serializers.ModelSerializer):
    class Meta:
        model  = PlatformUsageEvent
        fields = [
            'id', 'service', 'resource_id', 'resource_type', 'metric',
            'quantity', 'unit', 'unit_price', 'cost', 'event_time', 'processed',
        ]


# ── Credit Note ────────────────────────────────────────────────────────────────

class CreditNoteSerializer(serializers.ModelSerializer):
    class Meta:
        model  = CreditNote
        fields = ['id', 'amount', 'currency', 'reason', 'description',
                  'expires_at', 'created_at']



class BillingAccountSerializer(serializers.ModelSerializer):
    plan_price    = serializers.SerializerMethodField()
    plan_features = serializers.SerializerMethodField()

    class Meta:
        model  = BillingAccount
        fields = [
            'id', 'plan', 'plan_price', 'plan_features',
            'company_name', 'billing_email', 'tax_id',
            'address_line1', 'address_line2', 'city', 'state',
            'postal_code', 'country', 'currency',
            'credit_balance', 'auto_pay', 'spend_limit',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'plan_price', 'plan_features', 'credit_balance', 'created_at', 'updated_at']

    def get_plan_price(self, obj):
        from .models import PLAN_PRICES
        return PLAN_PRICES.get(obj.plan, 0)

    def get_plan_features(self, obj):
        from .models import PLAN_FEATURES
        return PLAN_FEATURES.get(obj.plan, {})


class UpdateBillingAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model  = BillingAccount
        fields = [
            'plan', 'company_name', 'billing_email', 'tax_id',
            'address_line1', 'address_line2', 'city', 'state',
            'postal_code', 'country', 'currency', 'auto_pay', 'spend_limit',
        ]


# ── Payment Method ─────────────────────────────────────────────────────────────

class PaymentMethodSerializer(serializers.ModelSerializer):
    class Meta:
        model  = PaymentMethod
        fields = [
            'id', 'type', 'is_default', 'card_brand', 'card_last4',
            'card_exp_month', 'card_exp_year', 'display_name',
            'is_verified', 'created_at',
        ]
        read_only_fields = ['id', 'is_verified', 'created_at']


class CreatePaymentMethodSerializer(serializers.Serializer):
    type           = serializers.ChoiceField(choices=['card', 'bank_account', 'paypal'])
    is_default     = serializers.BooleanField(default=False)
    card_brand     = serializers.CharField(required=False, allow_blank=True)
    card_last4     = serializers.CharField(max_length=4, required=False, allow_blank=True)
    card_exp_month = serializers.IntegerField(required=False, allow_null=True)
    card_exp_year  = serializers.IntegerField(required=False, allow_null=True)
    display_name   = serializers.CharField(required=False, allow_blank=True)


# ── Invoice ────────────────────────────────────────────────────────────────────

class InvoiceLineItemSerializer(serializers.ModelSerializer):
    class Meta:
        model  = InvoiceLineItem
        fields = ['id', 'service', 'resource_id', 'description',
                  'quantity', 'unit', 'unit_price', 'amount']


class InvoiceListSerializer(serializers.ModelSerializer):
    line_items = InvoiceLineItemSerializer(many=True, read_only=True)

    class Meta:
        model  = Invoice
        fields = [
            'id', 'invoice_number', 'status', 'period_start', 'period_end',
            'subtotal', 'tax_amount', 'credits_applied', 'total', 'currency',
            'due_date', 'paid_at', 'line_items', 'created_at',
        ]


class InvoiceDetailSerializer(serializers.ModelSerializer):
    line_items = InvoiceLineItemSerializer(many=True, read_only=True)

    class Meta:
        model  = Invoice
        fields = [
            'id', 'invoice_number', 'status', 'period_start', 'period_end',
            'subtotal', 'tax_rate', 'tax_amount', 'credits_applied', 'total',
            'currency', 'due_date', 'paid_at', 'notes', 'pdf_url',
            'line_items', 'created_at', 'updated_at',
        ]


# ── Usage ──────────────────────────────────────────────────────────────────────

class UsageRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model  = UsageRecord
        fields = ['id', 'service', 'resource_id', 'metric', 'quantity',
                  'unit', 'unit_price', 'cost', 'period_start', 'period_end']


# ── Credit Note ────────────────────────────────────────────────────────────────

class CreditNoteSerializer(serializers.ModelSerializer):
    class Meta:
        model  = CreditNote
        fields = ['id', 'amount', 'currency', 'reason', 'description',
                  'expires_at', 'created_at']
