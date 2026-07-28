# OrcaCloud – Billing Service
# Tracks every billable platform event, computes weekly snapshots,
# and provides spend analysis across all services.

import math
import random
import uuid
from datetime import date, timedelta, datetime
from decimal import Decimal
from django.utils import timezone
from django.db.models import Sum, Avg, Count, Q
from django.db import transaction


def _live() -> bool:
    import os
    return bool(os.environ.get('STRIPE_SECRET_KEY') or os.environ.get('BILLING_LIVE'))


# ── Mock helpers (fallback when no real UsageRecords exist) ───────────────────

_SERVICES = ['compute', 'storage', 'database', 'networking', 'containers', 'email', 'dns']

_MOCK_USAGE_BASE = {
    'compute_hours': (280,  50),
    'storage_gb':    (420,  30),
    'bandwidth_gb':  (195,  40),
    'api_calls':     (85000, 8000),
    'email_sent':    (12000, 2000),
    'db_hours':      (110,  20),
    'snapshots':     (18,   4),
    'ip_addresses':  (3,    1),
    'load_balancers':(2,    0),
}

def _wave(base, amp, seed=0):
    return base + amp * math.sin(seed * 0.7 + base * 0.01)


def _mock_monthly_usage(year: int, month: int) -> list:
    from .models import UNIT_PRICES
    seed = year * 12 + month
    items = []
    for metric, (base, amp) in _MOCK_USAGE_BASE.items():
        qty = max(0, _wave(base, amp, seed) + random.gauss(0, amp * 0.1))
        price = UNIT_PRICES.get(metric, 0)
        items.append({
            'metric':      metric,
            'service':     _service_for(metric),
            'quantity':    round(qty, 2),
            'unit':        _unit_for(metric),
            'unit_price':  price,
            'cost':        round(qty * price, 4),
            'description': _label_for(metric),
        })
    return items


def _mock_weekly_cost_by_service(week_start: date) -> dict:
    """Return {service: cost} mock for one ISO week (~1/4 of monthly)."""
    from .models import UNIT_PRICES
    seed = week_start.toordinal()
    result = {}
    for metric, (base, amp) in _MOCK_USAGE_BASE.items():
        qty = max(0, _wave(base / 4, amp / 4, seed))
        price = UNIT_PRICES.get(metric, 0)
        svc = _service_for(metric)
        result[svc] = round(result.get(svc, 0) + qty * price, 4)
    return result


def _service_for(metric: str) -> str:
    m = {
        'compute_hours':  'compute',    'storage_gb':    'storage',
        'bandwidth_gb':   'networking', 'api_calls':     'api',
        'email_sent':     'email',      'db_hours':      'database',
        'snapshots':      'storage',    'ip_addresses':  'networking',
        'load_balancers': 'networking',
    }
    return m.get(metric, 'compute')


def _unit_for(metric: str) -> str:
    m = {
        'compute_hours': 'hrs', 'storage_gb': 'GB', 'bandwidth_gb': 'GB',
        'api_calls': 'calls', 'email_sent': 'emails', 'db_hours': 'hrs',
        'snapshots': 'snaps', 'ip_addresses': 'IPs', 'load_balancers': 'LBs',
    }
    return m.get(metric, 'units')


def _label_for(metric: str) -> str:
    return metric.replace('_', ' ').title()


def _week_bounds(d: date):
    """Return (Monday, Sunday) of the ISO week containing d."""
    monday = d - timedelta(days=d.weekday())
    sunday = monday + timedelta(days=6)
    return monday, sunday


# ── Usage Ingestion ────────────────────────────────────────────────────────────

def record_usage(owner, service, metric, quantity, unit='',
                 resource_id='', resource_type='', event_time=None, unit_price=None):
    """
    Called by any platform service (compute, storage, containers, etc.)
    to record a billable usage event.

    Usage example (from containers or compute service):
        from services.billing.service import record_usage
        record_usage(
            owner=request.user,
            service='containers',
            metric='compute_hours',
            quantity=2.5,
            resource_id=str(container.id),
            resource_type='container',
        )
    """
    from .models import PlatformUsageEvent, UNIT_PRICES
    price = unit_price if unit_price is not None else UNIT_PRICES.get(metric, 0)
    cost  = round(float(quantity) * float(price), 4)
    if not unit:
        unit = _unit_for(metric)
    if event_time is None:
        event_time = timezone.now()
    return PlatformUsageEvent.objects.create(
        owner=owner,
        service=service,
        resource_id=resource_id or '',
        resource_type=resource_type or '',
        metric=metric,
        quantity=Decimal(str(quantity)),
        unit=unit,
        unit_price=Decimal(str(price)),
        cost=Decimal(str(cost)),
        event_time=event_time,
        processed=False,
    )


def flush_usage_events(owner=None) -> int:
    """
    Aggregate unprocessed PlatformUsageEvents into UsageRecord rows.
    Pass owner=None to process all users (for cron jobs).
    Returns number of events processed.
    """
    from .models import PlatformUsageEvent, UsageRecord
    qs = PlatformUsageEvent.objects.filter(processed=False)
    if owner:
        qs = qs.filter(owner=owner)
    count = 0
    with transaction.atomic():
        for evt in qs.select_related('owner').select_for_update():
            day_start = evt.event_time.replace(hour=0, minute=0, second=0, microsecond=0)
            day_end   = day_start + timedelta(days=1)
            UsageRecord.objects.create(
                owner=evt.owner,
                service=evt.service,
                resource_id=evt.resource_id,
                metric=evt.metric,
                quantity=evt.quantity,
                unit=evt.unit,
                unit_price=evt.unit_price,
                cost=evt.cost,
                period_start=day_start,
                period_end=day_end,
            )
            evt.processed = True
            evt.save(update_fields=['processed'])
            count += 1
    return count


# ── Weekly Snapshot Calculation ────────────────────────────────────────────────

def calculate_weekly_snapshots(owner=None, weeks_back=12) -> int:
    """
    Aggregate UsageRecord rows into WeeklyBillingSnapshot per user/service/week.
    Falls back to deterministic mock data when no real records exist.
    Should be called every Monday by the management command or Celery beat.
    Returns number of snapshot rows written/updated.
    """
    from .models import UsageRecord, WeeklyBillingSnapshot
    from django.contrib.auth.models import User
    from django.db.models import Sum as DSum

    flush_usage_events(owner)

    owners = [owner] if owner else list(User.objects.filter(is_active=True))
    today  = date.today()
    count  = 0

    for u in owners:
        for w in range(weeks_back, -1, -1):
            week_start, week_end = _week_bounds(today - timedelta(weeks=w))
            iso_year, iso_week, _ = week_start.isocalendar()

            records = UsageRecord.objects.filter(
                owner=u,
                period_start__date__gte=week_start,
                period_start__date__lte=week_end,
            )
            if records.exists():
                by_service = list(
                    records.values('service')
                    .annotate(total_cost=DSum('cost'), total_units=DSum('quantity'), record_count=Count('id'))
                )
                total_cost = sum(float(r['total_cost']) for r in by_service)
                is_mock = False
            else:
                service_costs = _mock_weekly_cost_by_service(week_start)
                by_service = [
                    {'service': svc, 'total_cost': Decimal(str(cost)),
                     'total_units': Decimal('0'), 'record_count': 0}
                    for svc, cost in service_costs.items()
                ]
                total_cost = sum(service_costs.values())
                is_mock = True

            with transaction.atomic():
                for row in by_service:
                    WeeklyBillingSnapshot.objects.update_or_create(
                        owner=u, week_start=week_start, service=row['service'],
                        defaults=dict(
                            week_end=week_end, week_number=iso_week, year=iso_year,
                            total_cost=Decimal(str(round(float(row['total_cost']), 4))),
                            total_units=Decimal(str(row.get('total_units', 0))),
                            record_count=row.get('record_count', 0),
                            is_mock=is_mock,
                        ),
                    )
                    count += 1
                WeeklyBillingSnapshot.objects.update_or_create(
                    owner=u, week_start=week_start, service='__total__',
                    defaults=dict(
                        week_end=week_end, week_number=iso_week, year=iso_year,
                        total_cost=Decimal(str(round(total_cost, 4))),
                        total_units=Decimal('0'), record_count=0, is_mock=is_mock,
                    ),
                )
                count += 1
    return count


def get_weekly_snapshots(owner, weeks=12) -> list:
    """
    Return weekly billing data grouped by week for the last `weeks` ISO weeks.
    Auto-calculates missing snapshots.
    """
    from .models import WeeklyBillingSnapshot
    today = date.today()
    week_start_limit = _week_bounds(today - timedelta(weeks=weeks - 1))[0]

    qs = WeeklyBillingSnapshot.objects.filter(
        owner=owner, week_start__gte=week_start_limit,
    ).order_by('week_start', 'service')

    if not qs.exists():
        calculate_weekly_snapshots(owner, weeks_back=weeks)
        qs = WeeklyBillingSnapshot.objects.filter(
            owner=owner, week_start__gte=week_start_limit,
        ).order_by('week_start', 'service')

    weeks_map = {}
    for snap in qs:
        wk = str(snap.week_start)
        if wk not in weeks_map:
            weeks_map[wk] = {
                'week_start':  wk,
                'week_end':    str(snap.week_end),
                'week_number': snap.week_number,
                'year':        snap.year,
                'total':       0.0,
                'by_service':  {},
                'is_mock':     snap.is_mock,
            }
        if snap.service == '__total__':
            weeks_map[wk]['total'] = float(snap.total_cost)
        else:
            weeks_map[wk]['by_service'][snap.service] = float(snap.total_cost)

    return sorted(weeks_map.values(), key=lambda x: x['week_start'])


# ── Spending Analysis ──────────────────────────────────────────────────────────

def get_spending_analysis(owner) -> dict:
    """
    Comprehensive spend analysis for the billing dashboard:
    - Week-over-week delta and % change
    - Month-to-date vs prior month
    - Top services by spend (current week)
    - 12-week cost trend (total + per service)
    - Weekly average and projected month-end
    - Peak week identification
    """
    weekly = get_weekly_snapshots(owner, weeks=12)
    if not weekly:
        return {}

    current_week = weekly[-1]
    prior_week   = weekly[-2] if len(weekly) >= 2 else None
    wow_delta, wow_pct = 0.0, 0.0
    if prior_week and prior_week['total']:
        wow_delta = round(current_week['total'] - prior_week['total'], 2)
        wow_pct   = round((wow_delta / prior_week['total']) * 100, 1)

    top_services = sorted(
        [{'service': s, 'cost': c} for s, c in current_week['by_service'].items()],
        key=lambda x: -x['cost'],
    )[:5]

    last_4 = weekly[-4:] if len(weekly) >= 4 else weekly
    weekly_avg     = round(sum(w['total'] for w in last_4) / len(last_4), 2) if last_4 else 0.0
    projected_month = round(weekly_avg * 4.33, 2)

    today = date.today()
    cur_month_str  = today.strftime('%Y-%m')
    if today.month == 1:
        prior_month_str = f'{today.year - 1}-12'
    else:
        prior_month_str = f'{today.year}-{today.month - 1:02d}'

    mtd       = round(sum(w['total'] for w in weekly if w['week_start'][:7] == cur_month_str), 2)
    prior_mtd = round(sum(w['total'] for w in weekly if w['week_start'][:7] == prior_month_str), 2)
    mtd_delta = round(mtd - prior_mtd, 2)
    mtd_pct   = round((mtd_delta / prior_mtd * 100), 1) if prior_mtd else 0.0

    all_services: set = set()
    for w in weekly:
        all_services.update(w['by_service'].keys())

    service_trends = {
        svc: [{'week': w['week_start'], 'cost': w['by_service'].get(svc, 0.0)} for w in weekly]
        for svc in sorted(all_services)
    }

    peak_week = max(weekly, key=lambda x: x['total'])

    return {
        'current_week':    current_week,
        'prior_week':      prior_week,
        'wow_delta':       wow_delta,
        'wow_pct':         wow_pct,
        'top_services':    top_services,
        'weekly_avg':      weekly_avg,
        'projected_month': projected_month,
        'mtd':             mtd,
        'prior_mtd':       prior_mtd,
        'mtd_delta':       mtd_delta,
        'mtd_pct':         mtd_pct,
        'peak_week':       peak_week,
        'weekly_trend':    weekly,
        'service_trends':  service_trends,
    }


# ── Billing Account ────────────────────────────────────────────────────────────

def get_or_create_account(owner):
    from .models import BillingAccount
    acct, _ = BillingAccount.objects.get_or_create(
        owner=owner, defaults={'plan': 'free', 'billing_email': owner.email},
    )
    return acct


def update_account(owner, data: dict):
    acct = get_or_create_account(owner)
    for field, val in data.items():
        if hasattr(acct, field):
            setattr(acct, field, val)
    acct.save()
    return acct


# ── Payment Methods ────────────────────────────────────────────────────────────

def add_payment_method(owner, data: dict):
    from .models import PaymentMethod
    if data.get('is_default'):
        PaymentMethod.objects.filter(owner=owner).update(is_default=False)
    return PaymentMethod.objects.create(
        owner=owner,
        type=data.get('type', 'card'),
        is_default=data.get('is_default', False),
        card_brand=data.get('card_brand', ''),
        card_last4=data.get('card_last4', '0000'),
        card_exp_month=data.get('card_exp_month'),
        card_exp_year=data.get('card_exp_year'),
        display_name=data.get('display_name', ''),
        is_verified=True,
    )


def set_default_payment_method(owner, pm_id: int):
    from .models import PaymentMethod
    PaymentMethod.objects.filter(owner=owner).update(is_default=False)
    PaymentMethod.objects.filter(owner=owner, id=pm_id).update(is_default=True)


def delete_payment_method(owner, pm_id: int):
    from .models import PaymentMethod
    PaymentMethod.objects.filter(owner=owner, id=pm_id).delete()


# ── Overview ──────────────────────────────────────────────────────────────────

def get_billing_overview(owner) -> dict:
    from .models import Invoice, UsageRecord
    from django.db.models import Sum as DSum

    acct  = get_or_create_account(owner)
    today = date.today()
    month_start = today.replace(day=1)

    real_records = UsageRecord.objects.filter(owner=owner, period_start__date__gte=month_start)
    if real_records.exists():
        current_spend = float(real_records.aggregate(t=DSum('cost'))['t'] or 0)
        usage_items   = []
        is_mock_usage = False
    else:
        usage_items   = _mock_monthly_usage(today.year, today.month)
        current_spend = round(sum(i['cost'] for i in usage_items), 4)
        is_mock_usage = True

    # Projected to month-end
    import calendar
    days_in_month = calendar.monthrange(today.year, today.month)[1]
    projected = round(current_spend * (days_in_month / max(today.day, 1)), 4)

    open_balance = float(Invoice.objects.filter(
        owner=owner, status='open',
    ).aggregate(t=DSum('total'))['t'] or 0)

    # 12-week trend (used by frontend WeeklyTrend chart)
    weekly = get_weekly_snapshots(owner, weeks=12)
    weekly_trend = [{'week': w['week_start'], 'amount': w['total']} for w in weekly]

    # 6-month trend (backwards compat)
    month_trend = []
    for i in range(6, 0, -1):
        m = (today.month - i - 1) % 12 + 1
        y = today.year - ((today.month - i - 1) // 12 + (1 if today.month - i - 1 < 0 else 0))
        items = _mock_monthly_usage(y, m)
        month_trend.append({'month': f'{y}-{m:02d}', 'amount': round(sum(it['cost'] for it in items), 4)})

    return {
        'account':         _account_dict(acct),
        'current_spend':   current_spend,
        'projected':       projected,
        'open_balance':    open_balance,
        'credit_balance':  float(acct.credit_balance),
        'trend':           month_trend,
        'weekly_trend':    weekly_trend,
        'usage_breakdown': usage_items if is_mock_usage else [],
        'is_mock':         is_mock_usage,
    }


def _account_dict(acct) -> dict:
    from .models import PLAN_PRICES, PLAN_FEATURES
    return {
        'id':            acct.id,
        'plan':          acct.plan,
        'plan_price':    PLAN_PRICES.get(acct.plan, 0),
        'plan_features': PLAN_FEATURES.get(acct.plan, {}),
        'company_name':  acct.company_name,
        'billing_email': acct.billing_email,
        'tax_id':        acct.tax_id,
        'address_line1': acct.address_line1,
        'address_line2': acct.address_line2,
        'city':          acct.city,
        'state':         acct.state,
        'postal_code':   acct.postal_code,
        'country':       acct.country,
        'currency':      acct.currency,
        'auto_pay':      acct.auto_pay,
        'credit_balance': float(acct.credit_balance),
        'spend_limit':   float(acct.spend_limit) if acct.spend_limit else None,
        'created_at':    acct.created_at.isoformat(),
        'updated_at':    acct.updated_at.isoformat(),
    }


# ── Usage (current month) ─────────────────────────────────────────────────────

def get_current_usage(owner) -> dict:
    from .models import UsageRecord
    from django.db.models import Sum as DSum

    today = date.today()
    month_start = today.replace(day=1)
    real_records = UsageRecord.objects.filter(owner=owner, period_start__date__gte=month_start)

    if real_records.exists():
        by_service_qs = (
            real_records.values('service')
            .annotate(cost=DSum('cost'), quantity=DSum('quantity'))
            .order_by('-cost')
        )
        items = list(
            real_records.values('service', 'metric', 'unit', 'unit_price')
            .annotate(cost=DSum('cost'), quantity=DSum('quantity'))
        )
        for it in items:
            it['description'] = _label_for(it['metric'])
        by_service = [{'service': r['service'], 'cost': float(r['cost'])} for r in by_service_qs]
        total      = float(real_records.aggregate(t=DSum('cost'))['t'] or 0)
        is_mock    = False
    else:
        items = _mock_monthly_usage(today.year, today.month)
        by_svc: dict = {}
        for it in items:
            by_svc[it['service']] = round(by_svc.get(it['service'], 0) + it['cost'], 4)
        by_service = [{'service': s, 'cost': c} for s, c in sorted(by_svc.items(), key=lambda x: -x[1])]
        total      = round(sum(i['cost'] for i in items), 4)
        is_mock    = True

    return {
        'period':     f'{today.year}-{today.month:02d}',
        'line_items': items,
        'by_service': by_service,
        'total':      round(total, 4),
        'is_mock':    is_mock,
    }


# ── Invoices ──────────────────────────────────────────────────────────────────

def get_or_generate_invoice(owner, year: int, month: int):
    from .models import Invoice, InvoiceLineItem, UsageRecord
    from django.db.models import Sum as DSum
    import calendar

    period_start = date(year, month, 1)
    period_end   = date(year, month, calendar.monthrange(year, month)[1])

    existing = Invoice.objects.filter(owner=owner, period_start=period_start).first()
    if existing:
        return existing

    real_records = UsageRecord.objects.filter(
        owner=owner, period_start__year=year, period_start__month=month,
    )
    if real_records.exists():
        aggregated = (
            real_records.values('service', 'metric', 'unit', 'unit_price')
            .annotate(quantity=DSum('quantity'), amount=DSum('cost'))
        )
        items = [{
            'service':     r['service'],
            'description': _label_for(r['metric']),
            'quantity':    float(r['quantity']),
            'unit':        r['unit'],
            'unit_price':  float(r['unit_price']),
            'cost':        float(r['amount']),
        } for r in aggregated]
    else:
        items = _mock_monthly_usage(year, month)

    subtotal = round(sum(i['cost'] for i in items), 4)
    tax_rate = Decimal('0.08')
    tax_amt  = round(subtotal * float(tax_rate), 4)
    total    = round(subtotal + tax_amt, 4)

    inv = Invoice.objects.create(
        owner=owner, period_start=period_start, period_end=period_end,
        subtotal=Decimal(str(subtotal)), tax_rate=tax_rate,
        tax_amount=Decimal(str(tax_amt)), total=Decimal(str(total)),
        status='paid' if month < date.today().month or year < date.today().year else 'open',
        due_date=period_end + timedelta(days=14), currency='USD',
    )
    for it in items:
        InvoiceLineItem.objects.create(
            invoice=inv, service=it['service'], description=it['description'],
            quantity=Decimal(str(it['quantity'])), unit=it['unit'],
            unit_price=Decimal(str(it['unit_price'])), amount=Decimal(str(it['cost'])),
        )
    return inv


def ensure_recent_invoices(owner, months: int = 6):
    today = date.today()
    for i in range(1, months + 1):
        m = (today.month - i - 1) % 12 + 1
        y = today.year - ((today.month - i - 1) // 12 + (1 if today.month - i - 1 < 0 else 0))
        try:
            get_or_generate_invoice(owner, y, m)
        except Exception:
            pass


# ── Subscription / Plan ────────────────────────────────────────────────────────

def change_plan(owner, new_plan: str) -> dict:
    from .models import BillingAccount, PLAN_PRICES, PlanTier
    valid = [t.value for t in PlanTier]
    if new_plan not in valid:
        raise ValueError(f'Invalid plan: {new_plan}')
    acct     = get_or_create_account(owner)
    old_plan = acct.plan
    acct.plan = new_plan
    acct.save()
    return {'old_plan': old_plan, 'new_plan': new_plan,
            'new_price': PLAN_PRICES[new_plan],
            'message': f'Plan changed from {old_plan} to {new_plan}'}


# ── Credits ───────────────────────────────────────────────────────────────────

def get_credits(owner) -> list:
    from .models import CreditNote
    return list(CreditNote.objects.filter(owner=owner).values(
        'id', 'amount', 'currency', 'reason', 'description', 'expires_at', 'created_at',
    ))


def apply_credit(owner, invoice_id: int, amount: Decimal) -> dict:
    from .models import Invoice
    inv  = Invoice.objects.get(id=invoice_id, owner=owner)
    acct = get_or_create_account(owner)
    applied = min(amount, acct.credit_balance, inv.total)
    inv.credits_applied += applied
    inv.total           -= applied
    inv.save()
    acct.credit_balance -= applied
    acct.save()
    return {'applied': float(applied), 'remaining_credit': float(acct.credit_balance)}
