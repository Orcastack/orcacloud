# OrcaCloud – Monitoring Serializers

from rest_framework import serializers
from .models import (
    ServiceHealth, MetricSnapshot, AlertRule, MonitoringAlert, Incident, IncidentUpdate,
    ServiceLevelObjective, TraceSpan, DDoSProtectionRule, DDoSAttackEvent,
    ComponentStatus, RunningProcess,
)


class ServiceHealthSerializer(serializers.ModelSerializer):
    class Meta:
        model  = ServiceHealth
        fields = ['service', 'status', 'uptime_pct', 'latency_ms',
                  'error_rate', 'note', 'last_checked']


class MetricSnapshotSerializer(serializers.ModelSerializer):
    class Meta:
        model  = MetricSnapshot
        fields = ['id', 'resource_id', 'service', 'metric', 'value',
                  'unit', 'region', 'timestamp', 'created_at']
        read_only_fields = ['id', 'created_at']


class AlertRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model  = AlertRule
        fields = [
            'resource_id', 'name', 'description', 'service',
            'resource_id_filter', 'metric', 'condition', 'threshold',
            'duration_mins', 'severity', 'notify_via', 'notify_target',
            'is_enabled', 'last_fired_at', 'created_at', 'updated_at',
        ]
        read_only_fields = ['resource_id', 'last_fired_at', 'created_at', 'updated_at']


class CreateAlertRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model  = AlertRule
        fields = ['name', 'description', 'service', 'resource_id_filter',
                  'metric', 'condition', 'threshold', 'duration_mins',
                  'severity', 'notify_via', 'notify_target']


class AlertSerializer(serializers.ModelSerializer):
    rule_name = serializers.CharField(source='rule.name', read_only=True)
    service   = serializers.CharField(source='rule.service', read_only=True)
    metric    = serializers.CharField(source='rule.metric', read_only=True)
    severity  = serializers.CharField(source='rule.severity', read_only=True)
    threshold = serializers.FloatField(source='rule.threshold', read_only=True)

    class Meta:
        model  = MonitoringAlert
        fields = ['id', 'rule_name', 'service', 'metric', 'severity',
                  'threshold', 'state', 'value', 'fired_at',
                  'resolved_at', 'message']
        read_only_fields = fields


class IncidentUpdateSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()

    class Meta:
        model  = IncidentUpdate
        fields = ['id', 'status', 'message', 'author_name', 'created_at']
        read_only_fields = fields

    def get_author_name(self, obj):
        if obj.author:
            return obj.author.get_full_name() or obj.author.username
        return 'System'


class IncidentListSerializer(serializers.ModelSerializer):
    duration_minutes = serializers.ReadOnlyField()

    class Meta:
        model  = Incident
        fields = ['resource_id', 'title', 'service', 'severity', 'status',
                  'detected_at', 'resolved_at', 'duration_minutes', 'created_at']
        read_only_fields = fields


class IncidentDetailSerializer(serializers.ModelSerializer):
    updates          = IncidentUpdateSerializer(many=True, read_only=True)
    duration_minutes = serializers.ReadOnlyField()
    assigned_to_name = serializers.SerializerMethodField()

    class Meta:
        model  = Incident
        fields = [
            'resource_id', 'title', 'name', 'description', 'service',
            'severity', 'status', 'summary', 'impact', 'resolution',
            'affected_resources', 'assigned_to_name',
            'detected_at', 'resolved_at', 'duration_minutes',
            'created_at', 'updated_at', 'updates',
        ]
        read_only_fields = ['resource_id', 'detected_at', 'resolved_at',
                            'created_at', 'updated_at', 'duration_minutes']

    def get_assigned_to_name(self, obj):
        if obj.assigned_to:
            return obj.assigned_to.get_full_name() or obj.assigned_to.username
        return None


class CreateIncidentSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Incident
        fields = ['name', 'title', 'service', 'severity', 'summary',
                  'impact', 'affected_resources']


# ── SLO ──────────────────────────────────────────────────────────────────────

class SLOSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceLevelObjective
        fields = [
            'id', 'resource_id', 'name', 'description', 'service', 'slo_type',
            'target_pct', 'window_days', 'current_value', 'error_budget_pct',
            'burn_rate', 'breached', 'last_calculated', 'alert_on_breach',
            'alert_at_budget_pct', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'resource_id', 'current_value', 'error_budget_pct', 'burn_rate', 'breached', 'last_calculated', 'created_at', 'updated_at']


# ── Distributed Tracing ───────────────────────────────────────────────────────

class TraceSpanSerializer(serializers.ModelSerializer):
    class Meta:
        model = TraceSpan
        fields = [
            'id', 'trace_id', 'span_id', 'parent_span_id', 'operation_name',
            'service_name', 'start_time', 'duration_ms', 'status', 'tags', 'logs',
            'error_message', 'http_method', 'http_url', 'http_status_code',
            'db_type', 'db_statement', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


# ── DDoS Protection ───────────────────────────────────────────────────────────

class DDoSRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = DDoSProtectionRule
        fields = [
            'id', 'resource_id', 'name', 'description', 'rule_type', 'status', 'priority',
            'conditions', 'rate_limit_rps', 'block_countries', 'block_ips',
            'mitigations_count', 'last_triggered', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'resource_id', 'mitigations_count', 'last_triggered', 'created_at', 'updated_at']


class DDoSAttackEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = DDoSAttackEvent
        fields = [
            'id', 'attack_type', 'status', 'source_ips', 'target_resource', 'target_region',
            'peak_rps', 'peak_bps', 'packets_dropped', 'duration_secs',
            'started_at', 'ended_at', 'rule_matched', 'created_at',
        ]
        read_only_fields = '__all__'


# ── Component Status ──────────────────────────────────────────────────────────

class ComponentStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model  = ComponentStatus
        fields = ['service', 'region', 'status', 'uptime_pct',
                  'latency_ms', 'error_rate', 'note', 'updated_at']


class ComponentStatusWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model  = ComponentStatus
        fields = ['service', 'region', 'status', 'uptime_pct',
                  'latency_ms', 'error_rate', 'note']


# ── Running Process ───────────────────────────────────────────────────────────

class RunningProcessSerializer(serializers.ModelSerializer):
    class Meta:
        model  = RunningProcess
        fields = [
            'id', 'process_type', 'name', 'status', 'region', 'cluster',
            'environment', 'resource_id', 'resource_ref', 'progress_pct',
            'logs_url', 'metrics_url', 'started_at', 'finished_at', 'meta',
        ]
        read_only_fields = ['id', 'started_at']


class RunningProcessCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = RunningProcess
        fields = [
            'process_type', 'name', 'status', 'region', 'cluster',
            'environment', 'resource_id', 'resource_ref', 'progress_pct',
            'logs_url', 'metrics_url', 'meta',
        ]
