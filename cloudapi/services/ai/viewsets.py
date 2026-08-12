"""
AI/ML viewsets for OrcaCloud platform.

Implements:
  - Anomaly detection   (z-score against rolling InstanceMetric baseline)
  - Predictive scaling  (linear-regression extrapolation of ASG metrics)
  - AI recommendations  (cost, performance, reliability, security)
"""
import math
from datetime import timedelta

from django.utils import timezone
from django.db.models import Avg, StdDev

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import AnomalyDetectionRule, AnomalyEvent, ScalingPrediction, AIRecommendation
from .serializers import (
    AnomalyDetectionRuleSerializer,
    AnomalyEventSerializer,
    ScalingPredictionSerializer,
    AIRecommendationSerializer,
)
from ..compute.models import Instance, InstanceMetric, AutoScalingGroup


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _z_score_evaluate(rule: AnomalyDetectionRule):
    """
    Run z-score anomaly detection for a single rule.

    Returns a list of newly-created AnomalyEvent objects.
    """
    since = timezone.now() - timedelta(minutes=rule.lookback_minutes)

    # Build the base queryset
    qs = InstanceMetric.objects.filter(created_at__gte=since)
    if rule.instance_id:
        qs = qs.filter(instance__instance_id=rule.instance_id)
    else:
        qs = qs.filter(instance__owner=rule.owner)

    field = rule.metric  # e.g. 'cpu_usage_percent'
    agg = qs.aggregate(mean=Avg(field), std=StdDev(field))
    mean = agg['mean']
    std = agg['std']

    if mean is None or std is None or qs.count() < rule.min_sample_count:
        return []

    # Safe std: treat near-zero std as a small constant to avoid div/0
    std = max(std, 0.001)

    events = []
    # Check the most recent data point per instance
    latest_qs = (
        qs.values('instance__instance_id')
          .annotate(latest_value=Avg(field))
    )
    for row in latest_qs:
        observed = row['latest_value']
        if observed is None:
            continue
        z = (observed - mean) / std
        if z >= rule.z_score_threshold:
            severity = 'critical' if z >= rule.z_score_threshold * 1.5 else 'warning'
            event = AnomalyEvent.objects.create(
                rule=rule,
                instance_id=row['instance__instance_id'],
                metric=rule.metric,
                observed_value=round(observed, 4),
                baseline_mean=round(mean, 4),
                baseline_std=round(std, 4),
                z_score=round(z, 4),
                severity=severity,
            )
            events.append(event)
    return events


def _linear_regression_predict(values: list[float]) -> tuple[float, float]:
    """
    Fit a simple linear regression on a list of values.
    Returns (slope, intercept) of the best-fit line.
    """
    n = len(values)
    if n < 2:
        return 0.0, values[0] if values else 0.0
    x_mean = (n - 1) / 2
    y_mean = sum(values) / n
    numerator = sum((i - x_mean) * (v - y_mean) for i, v in enumerate(values))
    denominator = sum((i - x_mean) ** 2 for i in range(n))
    slope = numerator / denominator if denominator else 0.0
    intercept = y_mean - slope * x_mean
    return slope, intercept


def _generate_recommendations_for_user(user) -> list[AIRecommendation]:
    """
    Scan the user's resources and produce AIRecommendation records.

    Heuristics applied:
      - Stopped instances older than 7 days  →  cost/terminate
      - Instances with avg CPU < 5 % (last hour)  →  right-size
      - AutoScalingGroups at min_size == max_size  →  no-op scaling group
    """
    recs = []
    now = timezone.now()
    one_hour_ago = now - timedelta(hours=1)
    seven_days_ago = now - timedelta(days=7)

    # ── Stopped instances wasting reserved-IP slots ─────────────────────────
    stopped_old = Instance.objects.filter(
        owner=user,
        status='stopped',
        stop_time__lte=seven_days_ago,
    )
    for inst in stopped_old:
        if AIRecommendation.objects.filter(
            owner=user, resource_id=str(inst.instance_id), rec_type='cost', is_dismissed=False
        ).exists():
            continue
        recs.append(AIRecommendation.objects.create(
            owner=user,
            rec_type='cost',
            title=f"Terminate idle instance '{inst.name}'",
            description=(
                f"Instance '{inst.name}' ({inst.instance_id}) has been stopped for more than 7 days. "
                "Terminating it will free reserved capacity and reduce costs."
            ),
            resource_type='Instance',
            resource_id=str(inst.instance_id),
            estimated_saving_usd=10,
            priority='medium',
            action_payload={'action': 'terminate_instance', 'instance_id': inst.instance_id},
        ))

    # ── Under-utilised running instances  ────────────────────────────────────
    running = Instance.objects.filter(owner=user, status='running')
    for inst in running:
        avg = InstanceMetric.objects.filter(
            instance=inst, created_at__gte=one_hour_ago,
        ).aggregate(avg=Avg('cpu_usage_percent'))['avg']
        if avg is not None and avg < 5.0:
            if AIRecommendation.objects.filter(
                owner=user, resource_id=str(inst.instance_id),
                rec_type='performance', is_dismissed=False,
            ).exists():
                continue
            recs.append(AIRecommendation.objects.create(
                owner=user,
                rec_type='cost',
                title=f"Right-size under-utilised instance '{inst.name}'",
                description=(
                    f"Instance '{inst.name}' has been running at an average CPU of "
                    f"{avg:.1f}% over the last hour. Consider switching to a smaller flavour."
                ),
                resource_type='Instance',
                resource_id=str(inst.instance_id),
                estimated_saving_usd=round(avg * 0.5, 2),
                priority='low',
                action_payload={'action': 'resize_instance', 'instance_id': inst.instance_id, 'avg_cpu': avg},
            ))

    # ── ASG with identical min/max (no dynamic scaling possible) ─────────────
    for asg in AutoScalingGroup.objects.filter(owner=user):
        if asg.min_size == asg.max_size:
            if AIRecommendation.objects.filter(
                owner=user, resource_id=str(asg.asg_id), rec_type='reliability', is_dismissed=False,
            ).exists():
                continue
            recs.append(AIRecommendation.objects.create(
                owner=user,
                rec_type='reliability',
                title=f"Enable dynamic scaling on ASG '{asg.name}'",
                description=(
                    f"Auto-scaling group '{asg.name}' has min_size == max_size ({asg.min_size}). "
                    "This prevents it from adapting to load changes. "
                    "Set max_size > min_size and attach a scaling policy."
                ),
                resource_type='AutoScalingGroup',
                resource_id=str(asg.asg_id),
                priority='medium',
                action_payload={'action': 'update_asg_capacity', 'asg_id': asg.asg_id},
            ))
    return recs


# ---------------------------------------------------------------------------
# ViewSets
# ---------------------------------------------------------------------------

class AnomalyDetectionRuleViewSet(viewsets.ModelViewSet):
    """CRUD for anomaly detection rules + on-demand evaluation."""
    serializer_class = AnomalyDetectionRuleSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return AnomalyDetectionRule.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=['post'])
    def evaluate(self, request, pk=None):
        """Run z-score anomaly detection immediately for this rule."""
        rule = self.get_object()
        events = _z_score_evaluate(rule)
        return Response({
            'rule': rule.name,
            'events_detected': len(events),
            'events': AnomalyEventSerializer(events, many=True).data,
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'])
    def evaluate_all(self, request):
        """Run all active rules for the current user."""
        rules = AnomalyDetectionRule.objects.filter(owner=request.user, is_active=True)
        total_events = []
        for rule in rules:
            total_events.extend(_z_score_evaluate(rule))
        return Response({
            'rules_evaluated': rules.count(),
            'total_events': len(total_events),
        }, status=status.HTTP_200_OK)


class AnomalyEventViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only list of anomaly events + resolve action."""
    serializer_class = AnomalyEventSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return AnomalyEvent.objects.filter(rule__owner=self.request.user)

    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        event = self.get_object()
        if event.resolved_at:
            return Response({'detail': 'Already resolved.'}, status=status.HTTP_400_BAD_REQUEST)
        event.resolved_at = timezone.now()
        event.notes = request.data.get('notes', '')
        event.save(update_fields=['resolved_at', 'notes'])
        return Response(AnomalyEventSerializer(event).data)


class ScalingPredictionViewSet(viewsets.ReadOnlyModelViewSet):
    """Read saved predictions + on-demand forecast generation."""
    serializer_class = ScalingPredictionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ScalingPrediction.objects.filter(owner=self.request.user)

    @action(detail=False, methods=['post'])
    def generate(self, request):
        """
        Generate a predictive scaling forecast for an ASG.

        Body params:
          - asg_id       (str)   — AutoScalingGroup.asg_id
          - metric       (str)   — default 'cpu_usage_percent'
          - horizon_min  (int)   — lookahead minutes, default 30
        """
        asg_id = request.data.get('asg_id')
        metric = request.data.get('metric', 'cpu_usage_percent')
        horizon = int(request.data.get('horizon_min', 30))

        try:
            asg = AutoScalingGroup.objects.get(asg_id=asg_id, owner=request.user)
        except AutoScalingGroup.DoesNotExist:
            return Response({'error': 'ASG not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Gather last 60 minutes of metric data for this ASG's instances
        since = timezone.now() - timedelta(minutes=60)
        qs = InstanceMetric.objects.filter(
            instance__instance_id__in=(asg.current_instances or []),
            created_at__gte=since,
        ).order_by('created_at')

        values = [getattr(m, metric) for m in qs if getattr(m, metric) is not None]

        if len(values) < 3:
            return Response({
                'asg_id': asg_id,
                'detail': 'Insufficient metric data for prediction (need ≥ 3 samples).',
                'sample_count': len(values),
            }, status=status.HTTP_200_OK)

        slope, intercept = _linear_regression_predict(values)
        # Extrapolate `horizon` steps ahead
        extrapolated = intercept + slope * (len(values) - 1 + horizon)
        extrapolated = max(0.0, min(100.0, extrapolated))

        # Derive scaling direction from trend vs a 70% threshold
        target = 70.0
        if extrapolated > target:
            direction = 'scale_up'
            recommended_capacity = min(asg.max_size, asg.desired_capacity + math.ceil((extrapolated - target) / 10))
        elif extrapolated < target * 0.5:
            direction = 'scale_down'
            recommended_capacity = max(asg.min_size, asg.desired_capacity - 1)
        else:
            direction = 'maintain'
            recommended_capacity = asg.desired_capacity

        # Confidence: inversely proportional to variance in slope
        variance = sum((v - sum(values) / len(values)) ** 2 for v in values) / len(values)
        confidence = max(0.0, min(100.0, 100.0 - math.sqrt(variance)))

        prediction = ScalingPrediction.objects.create(
            owner=request.user,
            asg_id=asg_id,
            direction=direction,
            predicted_metric=metric,
            predicted_value=round(extrapolated, 4),
            current_capacity=asg.desired_capacity,
            recommended_capacity=recommended_capacity,
            confidence_pct=round(confidence, 2),
            horizon_minutes=horizon,
            target_time=timezone.now() + timedelta(minutes=horizon),
        )
        return Response(ScalingPredictionSerializer(prediction).data, status=status.HTTP_201_CREATED)


class AIRecommendationViewSet(viewsets.ReadOnlyModelViewSet):
    """List AI recommendations + generate and dismiss actions."""
    serializer_class = AIRecommendationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = AIRecommendation.objects.filter(owner=self.request.user)
        if self.request.query_params.get('include_dismissed') != 'true':
            qs = qs.filter(is_dismissed=False)
        return qs

    @action(detail=False, methods=['post'])
    def generate(self, request):
        """Analyse the user's resources and produce actionable recommendations."""
        new_recs = _generate_recommendations_for_user(request.user)
        return Response({
            'generated': len(new_recs),
            'recommendations': AIRecommendationSerializer(new_recs, many=True).data,
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def dismiss(self, request, pk=None):
        """Mark a recommendation as dismissed."""
        rec = self.get_object()
        if rec.is_dismissed:
            return Response({'detail': 'Already dismissed.'}, status=status.HTTP_400_BAD_REQUEST)
        rec.is_dismissed = True
        rec.dismissed_at = timezone.now()
        rec.save(update_fields=['is_dismissed', 'dismissed_at'])
        return Response(AIRecommendationSerializer(rec).data)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """High-level summary: counts by type and priority."""
        qs = AIRecommendation.objects.filter(owner=request.user, is_dismissed=False)
        from django.db.models import Count, Sum
        by_type = list(qs.values('rec_type').annotate(count=Count('id')))
        by_priority = list(qs.values('priority').annotate(count=Count('id')))
        total_saving = qs.aggregate(total=Sum('estimated_saving_usd'))['total'] or 0
        return Response({
            'total_active': qs.count(),
            'by_type': by_type,
            'by_priority': by_priority,
            'estimated_monthly_saving_usd': float(total_saving),
        })
