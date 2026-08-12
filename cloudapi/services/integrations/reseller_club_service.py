# OrcaCloud – ResellerClub Domain Registrar Service
# Wraps the ResellerClub HTTP API for domain registration, transfer, and management.
# Falls back to mock responses when credentials are not configured.

import os
import logging
from typing import Optional

import requests

logger = logging.getLogger(__name__)

# ── Config ────────────────────────────────────────────────────────────────────
API_KEY      = os.environ.get('RESELLERCLUB_API_KEY',      '')
RESELLER_ID  = os.environ.get('RESELLERCLUB_RESELLER_ID',  '')
BASE_URL     = os.environ.get('RESELLERCLUB_BASE_URL',     'https://httpapi.com/api')
TIMEOUT      = int(os.environ.get('RESELLERCLUB_TIMEOUT',  '15'))

DEFAULT_NS   = os.environ.get('ORCACLOUD_NS', 'ns1.orcacloud.com,ns2.orcacloud.com').split(',')
DEFAULT_TLDS = ['com', 'net', 'org', 'io', 'co', 'app', 'dev', 'cloud', 'ai', 'tech']


def _auth() -> dict:
    return {
        'auth-userid': RESELLER_ID,
        'api-key':     API_KEY,
    }


def _live() -> bool:
    """Return True when real credentials are present."""
    return bool(API_KEY and RESELLER_ID)


def _get(endpoint: str, params: dict) -> dict:
    params.update(_auth())
    try:
        r = requests.get(f'{BASE_URL}/{endpoint}', params=params, timeout=TIMEOUT)
        r.raise_for_status()
        return r.json()
    except requests.RequestException as exc:
        logger.error('ResellerClub GET %s failed: %s', endpoint, exc)
        raise


def _post(endpoint: str, params: dict) -> dict:
    params.update(_auth())
    try:
        r = requests.post(f'{BASE_URL}/{endpoint}', params=params, timeout=TIMEOUT)
        r.raise_for_status()
        return r.json()
    except requests.RequestException as exc:
        logger.error('ResellerClub POST %s failed: %s', endpoint, exc)
        raise


# ── Domain Availability ───────────────────────────────────────────────────────

def check_availability(domain_name: str, tlds: Optional[list] = None) -> dict:
    """
    Check multi-TLD domain availability.
    Returns { 'example.com': {'status': 'available', 'price': 12.99}, … }
    """
    tlds = tlds or DEFAULT_TLDS
    base = domain_name.rsplit('.', 1)[0] if '.' in domain_name else domain_name

    if not _live():
        # Mock response for development
        import random
        results = {}
        for tld in tlds:
            fqdn = f'{base}.{tld}'
            results[fqdn] = {
                'status':      random.choice(['available', 'available', 'available', 'unavailable']),
                'price':       round(random.uniform(8.99, 49.99), 2),
                'renew_price': round(random.uniform(8.99, 49.99), 2),
                'tld':         tld,
                'mock':        True,
            }
        return results

    try:
        params = {
            'domain-name': [base] * len(tlds),
            'tlds':        tlds,
        }
        raw = _get('domains/available.json', params)
        results = {}
        for fqdn, info in raw.items():
            results[fqdn] = {
                'status':      'available' if info.get('status') == 'available' else 'unavailable',
                'price':       float(info.get('price', 0)),
                'renew_price': float(info.get('renewalprice', 0)),
                'tld':         fqdn.rsplit('.', 1)[-1],
            }
        return results
    except Exception as exc:
        logger.warning('Availability check failed, returning mock: %s', exc)
        return {f'{base}.{tld}': {'status': 'unknown', 'tld': tld, 'error': str(exc)} for tld in tlds}


def check_single(domain_name: str) -> dict:
    """Check availability of a single domain."""
    base, _, tld = domain_name.rpartition('.')
    res = check_availability(base, [tld])
    return res.get(domain_name, {'status': 'unknown'})


# ── Domain Registration ───────────────────────────────────────────────────────

def register_domain(domain_name: str, years: int = 1,
                    customer_id: str = '', contact_id: str = '') -> dict:
    """
    Register a new domain via ResellerClub.
    Returns the order details including reseller_order_id.
    """
    if not _live():
        import uuid, random
        return {
            'success':          True,
            'reseller_order_id': f'rc-{uuid.uuid4().hex[:10]}',
            'domain_name':      domain_name,
            'years':            years,
            'status':           'active',
            'mock':             True,
        }

    try:
        params = {
            'domain-name':       domain_name,
            'years':             years,
            'ns':                DEFAULT_NS,
            'customer-id':       customer_id or RESELLER_ID,
            'reg-contact-id':    contact_id or '-1',
            'admin-contact-id':  contact_id or '-1',
            'tech-contact-id':   contact_id or '-1',
            'billing-contact-id':contact_id or '-1',
            'invoice-option':    'NoInvoice',
            'protect-privacy':   'true',
        }
        result = _post('domains/register.json', params)
        return {
            'success':          True,
            'reseller_order_id': str(result.get('entityid', '')),
            'domain_name':      domain_name,
            'years':            years,
            'status':           'active',
            'raw':              result,
        }
    except Exception as exc:
        return {'success': False, 'error': str(exc)}


# ── Domain Transfer ───────────────────────────────────────────────────────────

def initiate_transfer(domain_name: str, epp_code: str,
                      customer_id: str = '', contact_id: str = '') -> dict:
    """
    Initiate a domain transfer from another registrar.
    """
    if not _live():
        import uuid
        return {
            'success':           True,
            'reseller_order_id': f'rc-xfr-{uuid.uuid4().hex[:8]}',
            'domain_name':       domain_name,
            'status':            'pending',
            'mock':              True,
        }

    try:
        params = {
            'domain-name':       domain_name,
            'auth-code':         epp_code,
            'customer-id':       customer_id or RESELLER_ID,
            'reg-contact-id':    contact_id or '-1',
            'admin-contact-id':  contact_id or '-1',
            'tech-contact-id':   contact_id or '-1',
            'billing-contact-id':contact_id or '-1',
            'invoice-option':    'NoInvoice',
            'protect-privacy':   'true',
        }
        result = _post('domains/transfer.json', params)
        return {
            'success':           True,
            'reseller_order_id': str(result.get('entityid', '')),
            'domain_name':       domain_name,
            'status':            'pending',
            'raw':               result,
        }
    except Exception as exc:
        return {'success': False, 'error': str(exc)}


# ── Domain Renewal ────────────────────────────────────────────────────────────

def renew_domain(reseller_order_id: str, years: int = 1,
                 exp_date: str = '') -> dict:
    """Renew a domain for `years` additional years."""
    if not _live():
        return {'success': True, 'renewed_years': years, 'mock': True}

    try:
        params = {
            'order-id':      reseller_order_id,
            'years':         years,
            'exp-date':      exp_date,
            'invoice-option':'NoInvoice',
        }
        result = _post('domains/renew.json', params)
        return {'success': True, 'raw': result}
    except Exception as exc:
        return {'success': False, 'error': str(exc)}


# ── Domain Details ────────────────────────────────────────────────────────────

def get_domain_details(reseller_order_id: str) -> dict:
    """Retrieve domain details from ResellerClub."""
    if not _live():
        return {'status': 'active', 'mock': True}

    try:
        params = {'order-id': reseller_order_id}
        return _get('domains/details-by-keys.json', params)
    except Exception as exc:
        return {'error': str(exc)}


# ── Nameserver Management ─────────────────────────────────────────────────────

def update_nameservers(reseller_order_id: str, nameservers: list) -> dict:
    """Update the nameservers for a domain."""
    if not _live():
        return {'success': True, 'nameservers': nameservers, 'mock': True}

    try:
        params = {
            'order-id': reseller_order_id,
            'ns':       nameservers,
        }
        result = _post('domains/modify-ns.json', params)
        return {'success': True, 'raw': result}
    except Exception as exc:
        return {'success': False, 'error': str(exc)}


# ── WHOIS Privacy ─────────────────────────────────────────────────────────────

def set_whois_privacy(reseller_order_id: str, enable: bool) -> dict:
    """Enable or disable WHOIS privacy protection."""
    if not _live():
        return {'success': True, 'privacy': enable, 'mock': True}

    try:
        endpoint = 'domains/privacy-protect/enable.json' if enable else 'domains/privacy-protect/disable.json'
        params   = {'order-id': reseller_order_id}
        result   = _post(endpoint, params)
        return {'success': True, 'raw': result}
    except Exception as exc:
        return {'success': False, 'error': str(exc)}


# ── TLD Pricing Catalogue ─────────────────────────────────────────────────────

def get_tld_catalogue() -> list:
    """Return a catalogue of popular TLDs with pricing."""
    return [
        {'tld': 'com',   'register_price': 10.99,  'renew_price': 12.99,  'popular': True},
        {'tld': 'net',   'register_price': 11.99,  'renew_price': 13.99,  'popular': True},
        {'tld': 'org',   'register_price': 11.99,  'renew_price': 13.99,  'popular': True},
        {'tld': 'io',    'register_price': 34.99,  'renew_price': 39.99,  'popular': True},
        {'tld': 'co',    'register_price': 24.99,  'renew_price': 27.99,  'popular': True},
        {'tld': 'app',   'register_price': 14.99,  'renew_price': 16.99,  'popular': True},
        {'tld': 'dev',   'register_price': 12.99,  'renew_price': 14.99,  'popular': True},
        {'tld': 'cloud', 'register_price': 14.99,  'renew_price': 16.99,  'popular': False},
        {'tld': 'ai',    'register_price': 79.99,  'renew_price': 89.99,  'popular': False},
        {'tld': 'tech',  'register_price': 19.99,  'renew_price': 22.99,  'popular': False},
        {'tld': 'info',  'register_price': 5.99,   'renew_price': 14.99,  'popular': False},
        {'tld': 'biz',   'register_price': 13.99,  'renew_price': 15.99,  'popular': False},
        {'tld': 'store', 'register_price': 5.99,   'renew_price': 59.99,  'popular': False},
        {'tld': 'online','register_price': 4.99,   'renew_price': 39.99,  'popular': False},
        {'tld': 'site',  'register_price': 4.99,   'renew_price': 39.99,  'popular': False},
        {'tld': 'shop',  'register_price': 5.99,   'renew_price': 49.99,  'popular': False},
        {'tld': 'me',    'register_price': 14.99,  'renew_price': 19.99,  'popular': False},
        {'tld': 'us',    'register_price': 7.99,   'renew_price': 9.99,   'popular': False},
        {'tld': 'uk',    'register_price': 8.99,   'renew_price': 9.99,   'popular': False},
        {'tld': 'de',    'register_price': 8.99,   'renew_price': 9.99,   'popular': False},
        {'tld': 'ca',    'register_price': 9.99,   'renew_price': 11.99,  'popular': False},
        {'tld': 'au',    'register_price': 12.99,  'renew_price': 14.99,  'popular': False},
    ]
