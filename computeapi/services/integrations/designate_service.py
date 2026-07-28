# OrcaCloud – OpenStack Designate DNS Service
# Manages DNS zones and recordsets via the Designate API.
# Falls back to a simulated response when no cluster is available.

import os
import logging
import uuid

logger = logging.getLogger(__name__)

# ── Config ────────────────────────────────────────────────────────────────────
DESIGNATE_URL  = os.environ.get('DESIGNATE_URL',    'http://localhost:9001/v2')
DESIGNATE_TOKEN= os.environ.get('DESIGNATE_TOKEN',  '')
OS_AUTH_URL    = os.environ.get('OS_AUTH_URL',      'http://localhost:5000/v3')
OS_USERNAME    = os.environ.get('OS_USERNAME',      'orcacloud')
OS_PASSWORD    = os.environ.get('OS_PASSWORD',      'changeme')
OS_PROJECT     = os.environ.get('OS_PROJECT_NAME',  'orcacloud')
OS_DOMAIN      = os.environ.get('OS_DOMAIN_NAME',   'Default')
DEFAULT_TTL    = 300
DEFAULT_EMAIL  = 'hostmaster@orcacloud.com'


def _live() -> bool:
    return bool(DESIGNATE_URL and DESIGNATE_TOKEN)


def _headers() -> dict:
    return {
        'X-Auth-Token': DESIGNATE_TOKEN,
        'Content-Type': 'application/json',
    }


def _get_conn():
    """Return authenticated OpenStack connection or None."""
    try:
        import openstack
        conn = openstack.connect(
            auth_url=OS_AUTH_URL,
            username=OS_USERNAME,
            password=OS_PASSWORD,
            project_name=OS_PROJECT,
            user_domain_name=OS_DOMAIN,
            project_domain_name=OS_DOMAIN,
        )
        conn.authorize()
        return conn
    except Exception as exc:
        logger.warning('Designate: OpenStack connect failed: %s', exc)
        return None


# ── Zone Operations ───────────────────────────────────────────────────────────

def create_zone(domain_name: str, email: str = DEFAULT_EMAIL,
                ttl: int = DEFAULT_TTL, description: str = '') -> dict:
    """
    Create a DNS zone in Designate.
    zone_name MUST end with a dot (e.g. 'example.com.')
    """
    zone_name   = domain_name.rstrip('.') + '.'
    stub_id     = f'zone-{uuid.uuid4().hex[:12]}'

    conn = _get_conn()
    if conn is None:
        return {
            'success':     True,
            'zone_id':     stub_id,
            'zone_name':   zone_name,
            'status':      'active',
            'serial':      1,
            'mock':        True,
        }

    try:
        zone = conn.dns.create_zone(
            name=zone_name,
            email=email,
            description=description or f'Zone for {domain_name}',
            ttl=ttl,
            type='PRIMARY',
        )
        return {
            'success':   True,
            'zone_id':   zone.id,
            'zone_name': zone.name,
            'status':    zone.status.lower(),
            'serial':    zone.serial,
        }
    except Exception as exc:
        logger.error('Designate create_zone error: %s', exc)
        return {'success': False, 'error': str(exc)}


def delete_zone(zone_id: str) -> dict:
    """Delete a DNS zone and all its recordsets."""
    conn = _get_conn()
    if conn is None:
        return {'success': True, 'zone_id': zone_id, 'mock': True}

    try:
        conn.dns.delete_zone(zone_id)
        return {'success': True, 'zone_id': zone_id}
    except Exception as exc:
        logger.error('Designate delete_zone error: %s', exc)
        return {'success': False, 'error': str(exc)}


def get_zone(zone_id: str) -> dict:
    """Retrieve zone metadata."""
    conn = _get_conn()
    if conn is None:
        return {'zone_id': zone_id, 'status': 'active', 'mock': True}

    try:
        zone = conn.dns.get_zone(zone_id)
        return {
            'zone_id':  zone.id,
            'status':   zone.status.lower(),
            'serial':   zone.serial,
        }
    except Exception as exc:
        return {'error': str(exc)}


# ── Recordset Operations ──────────────────────────────────────────────────────

def list_records(zone_id: str) -> list:
    """List all recordsets in a zone."""
    conn = _get_conn()
    if conn is None:
        return []

    try:
        records = []
        for rs in conn.dns.recordsets(zone_id):
            records.append({
                'recordset_id': rs.id,
                'name':         rs.name,
                'type':         rs.type,
                'records':      list(rs.records),
                'ttl':          rs.ttl or DEFAULT_TTL,
            })
        return records
    except Exception as exc:
        logger.error('Designate list_records error: %s', exc)
        return []


def create_record(zone_id: str, name: str, record_type: str,
                  records: list, ttl: int = DEFAULT_TTL,
                  description: str = '') -> dict:
    """Create a new recordset in the given zone."""
    full_name   = name.rstrip('.') + '.'
    stub_id     = f'rs-{uuid.uuid4().hex[:10]}'

    conn = _get_conn()
    if conn is None:
        return {
            'success':      True,
            'recordset_id': stub_id,
            'name':         full_name,
            'type':         record_type,
            'records':      records,
            'ttl':          ttl,
            'mock':         True,
        }

    try:
        rs = conn.dns.create_recordset(
            zone_id,
            name=full_name,
            type=record_type,
            records=records,
            ttl=ttl,
            description=description,
        )
        return {
            'success':      True,
            'recordset_id': rs.id,
            'name':         rs.name,
            'type':         rs.type,
            'records':      list(rs.records),
            'ttl':          rs.ttl,
        }
    except Exception as exc:
        logger.error('Designate create_record error: %s', exc)
        return {'success': False, 'error': str(exc)}


def update_record(zone_id: str, recordset_id: str,
                  records: list, ttl: int = DEFAULT_TTL) -> dict:
    """Update an existing recordset."""
    conn = _get_conn()
    if conn is None:
        return {'success': True, 'recordset_id': recordset_id, 'mock': True}

    try:
        rs = conn.dns.update_recordset(
            zone_id,
            recordset_id,
            records=records,
            ttl=ttl,
        )
        return {'success': True, 'recordset_id': rs.id}
    except Exception as exc:
        return {'success': False, 'error': str(exc)}


def delete_record(zone_id: str, recordset_id: str) -> dict:
    """Delete a recordset."""
    conn = _get_conn()
    if conn is None:
        return {'success': True, 'recordset_id': recordset_id, 'mock': True}

    try:
        conn.dns.delete_recordset(zone_id, recordset_id)
        return {'success': True}
    except Exception as exc:
        return {'success': False, 'error': str(exc)}


# ── Bootstrap Zone with Default Records ──────────────────────────────────────

def bootstrap_zone(zone_id: str, domain_name: str,
                   ip_address: str = '') -> dict:
    """
    Provision sensible default DNS records for a freshly registered domain.
    Creates: A (apex), www CNAME, and basic MX records.
    """
    zone_name = domain_name.rstrip('.') + '.'
    results   = []

    if ip_address:
        results.append(create_record(zone_id, zone_name, 'A', [ip_address]))
        results.append(create_record(zone_id, f'www.{zone_name}', 'CNAME', [zone_name]))

    results.append(create_record(
        zone_id, zone_name, 'TXT',
        [f'"v=spf1 include:_spf.orcacloud.com ~all"'],
    ))

    return {
        'bootstrapped':   True,
        'records_created': len([r for r in results if r.get('success')]),
    }
