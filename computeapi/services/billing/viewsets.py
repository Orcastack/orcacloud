# OrcaCloud – Billing Viewsets

from rest_framework import viewsets, serializers, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import BillingAccount, PaymentMethod, Invoice, CreditNote
from .serializers import (
    BillingAccountSerializer, UpdateBillingAccountSerializer,
    PaymentMethodSerializer, CreatePaymentMethodSerializer,
    InvoiceListSerializer, InvoiceDetailSerializer,
    CreditNoteSerializer, PlatformUsageEventIngestSerializer,
)
from . import service as svc


class BillingOverviewViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        data = svc.get_billing_overview(request.user)
        return Response(data)


class BillingAccountViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        acct = svc.get_or_create_account(request.user)
        return Response(BillingAccountSerializer(acct).data)

    def partial_update(self, request, pk=None):
        ser = UpdateBillingAccountSerializer(data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        acct = svc.update_account(request.user, ser.validated_data)
        return Response(BillingAccountSerializer(acct).data)

    @action(detail=False, methods=['post'], url_path='change-plan')
    def change_plan(self, request):
        new_plan = request.data.get('plan')
        if not new_plan:
            return Response({'detail': 'plan is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            result = svc.change_plan(request.user, new_plan)
        except ValueError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(result)


class PaymentMethodViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        qs = PaymentMethod.objects.filter(owner=request.user)
        return Response(PaymentMethodSerializer(qs, many=True).data)

    def create(self, request):
        ser = CreatePaymentMethodSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        pm = svc.add_payment_method(request.user, ser.validated_data)
        return Response(PaymentMethodSerializer(pm).data, status=status.HTTP_201_CREATED)

    def destroy(self, request, pk=None):
        svc.delete_payment_method(request.user, pk)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'], url_path='set-default')
    def set_default(self, request, pk=None):
        svc.set_default_payment_method(request.user, pk)
        return Response({'detail': 'Default payment method updated'})


class InvoiceViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        svc.ensure_recent_invoices(request.user, months=6)
        qs = Invoice.objects.filter(owner=request.user).order_by('-period_start')
        return Response(InvoiceListSerializer(qs, many=True).data)

    def retrieve(self, request, pk=None):
        try:
            inv = Invoice.objects.get(id=pk, owner=request.user)
        except Invoice.DoesNotExist:
            return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response(InvoiceDetailSerializer(inv).data)

    @action(detail=False, methods=['get'], url_path='month/(?P<year>[0-9]{4})/(?P<month>[0-9]{1,2})')
    def by_month(self, request, year=None, month=None):
        inv = svc.get_or_generate_invoice(request.user, int(year), int(month))
        return Response(InvoiceDetailSerializer(inv).data)

    @action(detail=True, methods=['post'], url_path='pay')
    def pay(self, request, pk=None):
        try:
            inv = Invoice.objects.get(id=pk, owner=request.user, status='open')
        except Invoice.DoesNotExist:
            return Response({'detail': 'Invoice not found or not open'}, status=status.HTTP_404_NOT_FOUND)
        from django.utils import timezone
        inv.status  = 'paid'
        inv.paid_at = timezone.now()
        inv.save()
        return Response(InvoiceDetailSerializer(inv).data)


class UsageViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        data = svc.get_current_usage(request.user)
        return Response(data)


class CreditViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        data = svc.get_credits(request.user)
        return Response(data)


# ── Weekly Billing Snapshots ───────────────────────────────────────────────────

class WeeklyBillingViewSet(viewsets.ViewSet):
    """
    GET /api/v1/billing/weekly/
        Returns 12 weeks of billing snapshots (per-service + total) for the
        authenticated user.  Auto-generates missing snapshots on first access.

    POST /api/v1/billing/weekly/recalculate/
        Force-recalculates all snapshots (admin / debug use).
    """
    permission_classes = [IsAuthenticated]

    def list(self, request):
        weeks = int(request.query_params.get('weeks', 12))
        weeks = max(1, min(weeks, 52))
        data  = svc.get_weekly_snapshots(request.user, weeks=weeks)
        return Response({'weeks': data, 'count': len(data)})

    @action(detail=False, methods=['post'], url_path='recalculate')
    def recalculate(self, request):
        weeks_back = int(request.data.get('weeks_back', 12))
        count = svc.calculate_weekly_snapshots(request.user, weeks_back=weeks_back)
        return Response({'snapshots_written': count, 'weeks_back': weeks_back})


# ── Spending Analysis ─────────────────────────────────────────────────────────

class SpendingAnalysisViewSet(viewsets.ViewSet):
    """
    GET /api/v1/billing/analysis/
        Returns comprehensive spending analysis:
        - week-over-week delta & %
        - MTD vs prior month
        - top services
        - 12-week trend (total + per service)
        - projected month-end cost
        - peak week
    """
    permission_classes = [IsAuthenticated]

    def list(self, request):
        data = svc.get_spending_analysis(request.user)
        return Response(data)


# ── Platform Usage Ingestion ──────────────────────────────────────────────────

class UsageIngestViewSet(viewsets.ViewSet):
    """
    POST /api/v1/billing/ingest/
        Called by any platform service to record a billable usage event.
        Internal services should authenticate with a service token.

    Body:
        {
          "service":       "containers",
          "metric":        "compute_hours",
          "quantity":      2.5,
          "resource_id":   "ctR-abc123",     (optional)
          "resource_type": "container",      (optional)
          "unit_price":    0.045,            (optional – uses table default)
          "event_time":    "2026-03-03T14:00:00Z"  (optional – defaults to now)
        }
    """
    permission_classes = [IsAuthenticated]

    def create(self, request):
        ser = PlatformUsageEventIngestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d   = ser.validated_data
        evt = svc.record_usage(
            owner=request.user,
            service=d['service'],
            metric=d['metric'],
            quantity=float(d['quantity']),
            unit=d.get('unit', ''),
            resource_id=d.get('resource_id', ''),
            resource_type=d.get('resource_type', ''),
            event_time=d.get('event_time'),
            unit_price=float(d['unit_price']) if d.get('unit_price') is not None else None,
        )
        return Response({
            'id':         evt.id,
            'service':    evt.service,
            'metric':     evt.metric,
            'quantity':   float(evt.quantity),
            'cost':       float(evt.cost),
            'event_time': evt.event_time.isoformat(),
        }, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], url_path='flush')
    def flush(self, request):
        """Flush pending usage events → UsageRecord rows."""
        count = svc.flush_usage_events(request.user)
        return Response({'flushed': count})



class BillingOverviewViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        data = svc.get_billing_overview(request.user)
        return Response(data)


class BillingAccountViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        acct = svc.get_or_create_account(request.user)
        return Response(BillingAccountSerializer(acct).data)

    def partial_update(self, request, pk=None):
        ser = UpdateBillingAccountSerializer(data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        acct = svc.update_account(request.user, ser.validated_data)
        return Response(BillingAccountSerializer(acct).data)

    @action(detail=False, methods=['post'], url_path='change-plan')
    def change_plan(self, request):
        new_plan = request.data.get('plan')
        if not new_plan:
            return Response({'detail': 'plan is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            result = svc.change_plan(request.user, new_plan)
        except ValueError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(result)


class PaymentMethodViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        qs = PaymentMethod.objects.filter(owner=request.user)
        return Response(PaymentMethodSerializer(qs, many=True).data)

    def create(self, request):
        ser = CreatePaymentMethodSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        pm = svc.add_payment_method(request.user, ser.validated_data)
        return Response(PaymentMethodSerializer(pm).data, status=status.HTTP_201_CREATED)

    def destroy(self, request, pk=None):
        svc.delete_payment_method(request.user, pk)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'], url_path='set-default')
    def set_default(self, request, pk=None):
        svc.set_default_payment_method(request.user, pk)
        return Response({'detail': 'Default payment method updated'})


class InvoiceViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        # Lazily generate last 6 months
        svc.ensure_recent_invoices(request.user, months=6)
        qs = Invoice.objects.filter(owner=request.user).order_by('-period_start')
        return Response(InvoiceListSerializer(qs, many=True).data)

    def retrieve(self, request, pk=None):
        try:
            inv = Invoice.objects.get(id=pk, owner=request.user)
        except Invoice.DoesNotExist:
            return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response(InvoiceDetailSerializer(inv).data)

    @action(detail=False, methods=['get'], url_path='month/(?P<year>[0-9]{4})/(?P<month>[0-9]{1,2})')
    def by_month(self, request, year=None, month=None):
        inv = svc.get_or_generate_invoice(request.user, int(year), int(month))
        return Response(InvoiceDetailSerializer(inv).data)

    @action(detail=True, methods=['post'], url_path='pay')
    def pay(self, request, pk=None):
        try:
            inv = Invoice.objects.get(id=pk, owner=request.user, status='open')
        except Invoice.DoesNotExist:
            return Response({'detail': 'Invoice not found or not open'}, status=status.HTTP_404_NOT_FOUND)
        from django.utils import timezone
        inv.status  = 'paid'
        inv.paid_at = timezone.now()
        inv.save()
        return Response(InvoiceDetailSerializer(inv).data)


class UsageViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        data = svc.get_current_usage(request.user)
        return Response(data)


class CreditViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        data = svc.get_credits(request.user)
        return Response(data)
