"""Domain business rules shared by the domain API and background workflows."""

from datetime import date, timedelta
from decimal import Decimal

from .models import Domain
from ..integrations import reseller_club_service as rc


def resolve_domain_unit_price(tld: str, operation: str) -> Decimal:
    try:
        catalogue = rc.get_tld_catalogue() or []
        match = next((item for item in catalogue if str(item.get('tld', '')).lower() == str(tld).lower()), None)
        if match:
            key = 'register_price' if operation == 'register' else 'renew_price'
            return Decimal(str(match.get(key) or 0))
    except Exception:
        pass
    return Decimal('12.00') if operation == 'register' else Decimal('10.00')


def create_domain_invoice(owner, domain: Domain, operation: str, years: int):
    from ..billing.models import Invoice, InvoiceLineItem

    unit_price = resolve_domain_unit_price(domain.tld, operation)
    quantity = Decimal(str(max(1, years)))
    subtotal = (unit_price * quantity).quantize(Decimal('0.0001'))
    invoice = Invoice.objects.create(
        owner=owner,
        status='open',
        period_start=date.today(),
        period_end=date.today(),
        subtotal=subtotal,
        tax_rate=Decimal('0'),
        tax_amount=Decimal('0'),
        total=subtotal,
        due_date=date.today() + timedelta(days=7),
        currency='USD',
        notes=f'Domain {operation} charge for {domain.domain_name}',
    )
    InvoiceLineItem.objects.create(
        invoice=invoice,
        service='domains',
        resource_id=domain.resource_id,
        description=f'Domain {operation}: {domain.domain_name}',
        quantity=quantity,
        unit='year',
        unit_price=unit_price,
        amount=subtotal,
    )
    return invoice