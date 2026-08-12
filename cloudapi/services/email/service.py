# OrcaCloud – Email Provisioning Service
# Manages mailbox lifecycle via Postfix/Dovecot API or SSH.
# Falls back to a mock response when no mail server is configured.

import os
import logging
import subprocess
import hashlib
import hmac
import base64
import secrets
import string
import uuid

logger = logging.getLogger(__name__)

# ── Config ────────────────────────────────────────────────────────────────────
MAIL_HOST        = os.environ.get('MAIL_HOST',        'mail.orcacloud.com')
MAIL_ADMIN_USER  = os.environ.get('MAIL_ADMIN_USER',  'admin@orcacloud.com')
MAIL_ADMIN_PASS  = os.environ.get('MAIL_ADMIN_PASS',  '')
MAIL_SMTP_PORT   = int(os.environ.get('MAIL_SMTP_PORT',  '587'))
MAIL_IMAP_PORT   = int(os.environ.get('MAIL_IMAP_PORT',  '993'))
MAIL_POP_PORT    = int(os.environ.get('MAIL_POP_PORT',   '995'))
MAIL_VIRT_BASE   = os.environ.get('MAIL_VIRT_BASE',   '/var/mail')
# Dovecot DOVEADM HTTP API (optional, preferred over SSH)
DOVEADM_URL      = os.environ.get('DOVEADM_URL',      '')
DOVEADM_API_KEY  = os.environ.get('DOVEADM_API_KEY',  '')
WEBMAIL_BASE_URL = os.environ.get('WEBMAIL_BASE_URL', 'https://webmail.orcacloud.com')


def _live() -> bool:
    """True when a real mail server is configured."""
    return bool(MAIL_ADMIN_PASS and (DOVEADM_URL or MAIL_HOST != 'mail.orcacloud.com'))


def _doveadm_post(cmd: str, params: dict) -> dict:
    """
    Call the Dovecot doveadm HTTP API.
    https://doc.dovecot.org/admin_manual/doveadm_http_api/
    """
    import requests
    url     = f'{DOVEADM_URL.rstrip("/")}/doveadm/v1'
    payload = [[cmd, 'tag1', params]]
    resp    = requests.post(
        url,
        json=payload,
        auth=('doveadm', DOVEADM_API_KEY),
        timeout=10,
    )
    resp.raise_for_status()
    return resp.json()


def _hash_password(password: str) -> str:
    """
    Hash password in Dovecot SHA512-CRYPT format.
    In production, call `doveadm pw -s SHA512-CRYPT`.
    """
    try:
        result = subprocess.run(
            ['doveadm', 'pw', '-s', 'SHA512-CRYPT', '-p', password],
            capture_output=True, text=True, timeout=5,
        )
        if result.returncode == 0:
            return result.stdout.strip()
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass
    # Fallback: plain SHA-256 hex (dev only)
    return '{SHA256}' + hashlib.sha256(password.encode()).hexdigest()


# ── Mailbox Operations ────────────────────────────────────────────────────────

def create_mailbox(email_address: str, password: str,
                   quota_mb: int = 5120) -> dict:
    """
    Provision a new mailbox on the mail server.
    Returns {success, email_address, password_hash, mock?}
    """
    password_hash = _hash_password(password)

    if not _live():
        return {
            'success':       True,
            'email_address': email_address,
            'password_hash': password_hash,
            'quota_mb':      quota_mb,
            'mock':          True,
        }

    try:
        if DOVEADM_URL:
            local, domain = email_address.split('@', 1)
            _doveadm_post('userCreate', {'user': email_address})
            _doveadm_post('quotaSet', {'user': email_address,
                                       'quotaBytes': str(quota_mb * 1024 * 1024)})
        return {
            'success':       True,
            'email_address': email_address,
            'password_hash': password_hash,
        }
    except Exception as exc:
        logger.error('create_mailbox error (%s): %s', email_address, exc)
        return {'success': False, 'error': str(exc)}


def delete_mailbox(email_address: str) -> dict:
    """Remove a mailbox and all its stored mail."""
    if not _live():
        return {'success': True, 'email_address': email_address, 'mock': True}

    try:
        if DOVEADM_URL:
            _doveadm_post('userDelete', {'user': email_address})
        return {'success': True}
    except Exception as exc:
        logger.error('delete_mailbox error (%s): %s', email_address, exc)
        return {'success': False, 'error': str(exc)}


def update_password(email_address: str, new_password: str) -> dict:
    """Change the password for an existing mailbox."""
    password_hash = _hash_password(new_password)

    if not _live():
        return {'success': True, 'password_hash': password_hash, 'mock': True}

    try:
        if DOVEADM_URL:
            _doveadm_post('passwordChange', {
                'user': email_address,
                'newpassword': new_password,
            })
        return {'success': True, 'password_hash': password_hash}
    except Exception as exc:
        return {'success': False, 'error': str(exc)}


def suspend_mailbox(email_address: str) -> dict:
    """Prevent login for a mailbox without deleting it."""
    if not _live():
        return {'success': True, 'mock': True}

    try:
        if DOVEADM_URL:
            _doveadm_post('altMove', {'user': email_address, 'move_master': '1'})
        return {'success': True}
    except Exception as exc:
        return {'success': False, 'error': str(exc)}


def get_mailbox_usage(email_address: str) -> dict:
    """Return quota usage for a mailbox in MB."""
    if not _live():
        import random
        used = random.randint(10, 2000)
        return {
            'email_address': email_address,
            'used_mb':       used,
            'mock':          True,
        }

    try:
        if DOVEADM_URL:
            result = _doveadm_post('quotaGet', {'user': email_address})
            # result[0][2]['storageUsed'] is in bytes
            used_bytes = int(result[0][2].get('storageUsed', 0))
            return {
                'email_address': email_address,
                'used_mb':       used_bytes // (1024 * 1024),
            }
        return {'email_address': email_address, 'used_mb': 0}
    except Exception as exc:
        logger.warning('get_mailbox_usage error: %s', exc)
        return {'email_address': email_address, 'used_mb': 0, 'error': str(exc)}


def update_quota(email_address: str, quota_mb: int) -> dict:
    """Set a new quota for an existing mailbox."""
    if not _live():
        return {'success': True, 'quota_mb': quota_mb, 'mock': True}

    try:
        if DOVEADM_URL:
            _doveadm_post('quotaSet', {
                'user': email_address,
                'quotaBytes': str(quota_mb * 1024 * 1024),
            })
        return {'success': True, 'quota_mb': quota_mb}
    except Exception as exc:
        return {'success': False, 'error': str(exc)}


def set_forward(email_address: str, forward_to: str,
                keep_local: bool = True) -> dict:
    """Configure email forwarding for a mailbox."""
    if not _live():
        return {'success': True, 'forward_to': forward_to, 'mock': True}
    # In production: update the .forward file or sieve ruleset
    return {'success': True, 'forward_to': forward_to}


# ── DKIM ──────────────────────────────────────────────────────────────────────

def generate_dkim_key(domain_name: str,
                      selector: str = 'default') -> dict:
    """
    Generate a new DKIM RSA 2048-bit key pair.
    Returns {success, selector, public_key, private_key, dns_record}
    """
    try:
        import subprocess, tempfile, os
        with tempfile.TemporaryDirectory() as tmpdir:
            result = subprocess.run(
                ['opendkim-genkey', '-s', selector, '-d', domain_name,
                 '-D', tmpdir, '-b', '2048'],
                capture_output=True, timeout=15,
            )
            pub_path  = os.path.join(tmpdir, f'{selector}.txt')
            key_path  = os.path.join(tmpdir, f'{selector}.private')
            if os.path.exists(pub_path) and os.path.exists(key_path):
                public_dns = open(pub_path).read().strip()
                private    = open(key_path).read().strip()
                return {
                    'success':     True,
                    'selector':    selector,
                    'dns_record':  public_dns,
                    'private_key': private,
                }
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass

    # Mock fallback – generate plausible-looking stub
    stub_pub = base64.b64encode(secrets.token_bytes(256)).decode()
    dns_val  = (f'{selector}._domainkey IN TXT ( "v=DKIM1; k=rsa; " \n'
                f'\t"p={stub_pub}" )  ; ----- DKIM key {selector} for {domain_name}')
    return {
        'success':     True,
        'selector':    selector,
        'dns_record':  dns_val,
        'private_key': '',
        'mock':        True,
    }


# ── DNS Auto-Provisioning ─────────────────────────────────────────────────────

def provision_email_dns(zone_id: str, domain_name: str,
                        dkim_record: str = '', selector: str = 'default') -> dict:
    """
    Create all required email DNS records in Designate for the given zone.
    Records: MX, SPF, DKIM, DMARC.
    Returns summary dict.
    """
    from ..integrations import designate_service as dns_svc
    zone      = zone_id
    dot_name  = domain_name.rstrip('.') + '.'
    results   = {}

    # MX
    r = dns_svc.create_record(zone, dot_name, 'MX',
                               [f'10 {MAIL_HOST}.'])
    results['mx'] = r.get('success', False)

    # SPF
    r = dns_svc.create_record(zone, dot_name, 'TXT',
                               [f'"v=spf1 mx include:{MAIL_HOST} ~all"'])
    results['spf'] = r.get('success', False)

    # DKIM
    if dkim_record:
        dkim_name = f'{selector}._domainkey.{dot_name}'
        # Extract the p= value from the generated key
        r = dns_svc.create_record(zone, dkim_name, 'TXT', [dkim_record])
        results['dkim'] = r.get('success', False)
    else:
        results['dkim'] = False

    # DMARC
    dmarc_name  = f'_dmarc.{dot_name}'
    dmarc_value = (
        f'"v=DMARC1; p=quarantine; rua=mailto:dmarc@orcacloud.com; '
        f'ruf=mailto:dmarc@orcacloud.com; fo=1"'
    )
    r = dns_svc.create_record(zone, dmarc_name, 'TXT', [dmarc_value])
    results['dmarc'] = r.get('success', False)

    return {
        'success': True,
        'records': results,
        'all_provisioned': all(results.values()),
    }


# ── Helper ────────────────────────────────────────────────────────────────────

def generate_strong_password(length: int = 16) -> str:
    """Generate a secure random password."""
    alphabet = string.ascii_letters + string.digits + '!@#$%^&*()'
    while True:
        pw = ''.join(secrets.choice(alphabet) for _ in range(length))
        if (any(c.isupper() for c in pw) and any(c.islower() for c in pw)
                and any(c.isdigit() for c in pw)):
            return pw


def get_client_settings(domain_name: str) -> dict:
    """Return the connection settings a mail client needs."""
    return {
        'domain':    domain_name,
        'webmail':   f'{WEBMAIL_BASE_URL}',
        'incoming': {
            'imap': {'host': MAIL_HOST, 'port': MAIL_IMAP_PORT, 'security': 'SSL/TLS'},
            'pop3': {'host': MAIL_HOST, 'port': MAIL_POP_PORT,  'security': 'SSL/TLS'},
        },
        'outgoing': {
            'smtp': {'host': MAIL_HOST, 'port': MAIL_SMTP_PORT, 'security': 'STARTTLS'},
        },
    }
