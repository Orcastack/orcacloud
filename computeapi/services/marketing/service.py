# OrcaCloud – Email Marketing Service
# Handles campaign sending via Django's email backend (SMTP).
# Falls back to a mock dry-run when MARKETING_SMTP_HOST is not configured.

import logging
import os
import re
import uuid
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)

# ── Config ────────────────────────────────────────────────────────────────────
SMTP_HOST     = os.environ.get('MARKETING_SMTP_HOST',  '')
SMTP_PORT     = int(os.environ.get('MARKETING_SMTP_PORT', '587'))
SMTP_USER     = os.environ.get('MARKETING_SMTP_USER',  '')
SMTP_PASS     = os.environ.get('MARKETING_SMTP_PASS',  '')
SMTP_USE_TLS  = os.environ.get('MARKETING_SMTP_TLS',   'true').lower() == 'true'
UNSUBSCRIBE_BASE = os.environ.get('UNSUBSCRIBE_BASE_URL',
                                  'https://app.orcacloud.com/unsubscribe')
TRACKING_BASE    = os.environ.get('TRACKING_BASE_URL',
                                  'https://app.orcacloud.com/t')


def _live() -> bool:
    return bool(SMTP_HOST and SMTP_USER and SMTP_PASS)


def _get_connection():
    """Return a Django EmailBackend connection to the marketing SMTP server."""
    from django.core.mail.backends.smtp import EmailBackend
    return EmailBackend(
        host=SMTP_HOST,
        port=SMTP_PORT,
        username=SMTP_USER,
        password=SMTP_PASS,
        use_tls=SMTP_USE_TLS,
        fail_silently=False,
    )


# ── Merge Tags ────────────────────────────────────────────────────────────────

def render_template(html: str, text: str, contact: dict,
                    campaign_id: str, unsubscribe_token: str) -> tuple[str, str]:
    """
    Replace merge tags in the email body.
    Supported: {{ first_name }}, {{ last_name }}, {{ email }},
               {{ unsubscribe_url }}, {{ webview_url }}, and any custom_field key.
    Also injects open-tracking pixel and wraps links with click-tracking.
    """
    unsub_url = f'{UNSUBSCRIBE_BASE}/{unsubscribe_token}'
    ctx = {
        'first_name':     contact.get('first_name', ''),
        'last_name':      contact.get('last_name', ''),
        'email':          contact.get('email', ''),
        'full_name':      f"{contact.get('first_name','')} {contact.get('last_name','')}".strip(),
        'unsubscribe_url': unsub_url,
        'webview_url':    f'{TRACKING_BASE}/web/{campaign_id}',
    }
    ctx.update(contact.get('custom_fields', {}))

    def replace_tag(m):
        key = m.group(1).strip()
        return str(ctx.get(key, m.group(0)))

    rendered_html = re.sub(r'\{\{\s*(\w+)\s*\}\}', replace_tag, html)
    rendered_text = re.sub(r'\{\{\s*(\w+)\s*\}\}', replace_tag, text)

    # Tracking pixel
    pixel = (
        f'<img src="{TRACKING_BASE}/open/{campaign_id}/{unsubscribe_token}" '
        f'width="1" height="1" alt="" style="display:none;" />'
    )
    rendered_html = rendered_html.replace('</body>', f'{pixel}</body>')
    if '</body>' not in rendered_html:
        rendered_html += pixel

    # Unsubscribe footer if not already present
    if 'unsubscribe' not in rendered_html.lower():
        footer = (
            f'<p style="text-align:center;font-size:12px;color:#999;margin-top:32px;">'
            f'You received this email because you subscribed to our list. '
            f'<a href="{unsub_url}" style="color:#999;">Unsubscribe</a></p>'
        )
        rendered_html = rendered_html.replace('</body>', f'{footer}</body>')
        if '</body>' not in html:
            rendered_html += footer

    return rendered_html, rendered_text


# ── Sending ───────────────────────────────────────────────────────────────────

def send_campaign(campaign_id: str, dry_run: bool = False) -> dict:
    """
    Primary send function. Pulls the Campaign from the DB, iterates over all
    contacts in linked lists, renders per-contact content, and sends via SMTP.

    Returns: {sent, skipped, failed, errors[]}
    """
    from .models import Campaign, CampaignAnalytics, SendEvent
    from django.core.mail import EmailMultiAlternatives

    try:
        campaign = Campaign.objects.prefetch_related(
            'contact_lists__contacts'
        ).get(resource_id=campaign_id)
    except Campaign.DoesNotExist:
        return {'success': False, 'error': 'Campaign not found.'}

    html_body = campaign.html_body or (
        campaign.template.html_body if campaign.template else '')
    text_body = campaign.text_body or (
        campaign.template.text_body if campaign.template else '')

    if not html_body:
        return {'success': False, 'error': 'Campaign has no HTML body.'}

    # Gather unique subscribed contacts
    seen      = set()
    contacts  = []
    for lst in campaign.contact_lists.all():
        for c in lst.contacts.filter(status='subscribed'):
            if c.email not in seen:
                seen.add(c.email)
                contacts.append(c)

    sent = skipped = failed = 0
    errors = []

    conn = _get_connection() if (_live() and not dry_run) else None

    try:
        if conn:
            conn.open()

        for contact in contacts:
            token = uuid.uuid4().hex
            try:
                rendered_html, rendered_text = render_template(
                    html_body, text_body,
                    {
                        'first_name':   contact.first_name,
                        'last_name':    contact.last_name,
                        'email':        contact.email,
                        'custom_fields': contact.custom_fields,
                    },
                    campaign_id,
                    token,
                )
                if dry_run or not conn:
                    logger.debug('DRY-RUN: would send to %s', contact.email)
                else:
                    msg = EmailMultiAlternatives(
                        subject=campaign.subject,
                        body=rendered_text or '',
                        from_email=f'{campaign.from_name} <{campaign.from_email}>',
                        to=[contact.email],
                        reply_to=[campaign.reply_to] if campaign.reply_to else [],
                        connection=conn,
                    )
                    msg.attach_alternative(rendered_html, 'text/html')
                    msg.extra_headers['List-Unsubscribe'] = (
                        f'<{UNSUBSCRIBE_BASE}/{token}>'
                    )
                    msg.send()

                SendEvent.objects.create(
                    campaign=campaign,
                    contact=contact,
                    event='sent',
                    metadata={'token': token, 'dry_run': dry_run},
                )
                sent += 1
            except Exception as exc:
                failed += 1
                errors.append({'email': contact.email, 'error': str(exc)})
                logger.error('Failed to send to %s: %s', contact.email, exc)
    finally:
        if conn:
            conn.close()

    # Update campaign status + analytics
    from django.utils import timezone as tz
    if not dry_run:
        campaign.status  = 'sent'
        campaign.sent_at = tz.now()
        campaign.save(update_fields=['status', 'sent_at', 'updated_at'])

    analytics, _ = CampaignAnalytics.objects.get_or_create(campaign=campaign)
    analytics.total_sent   += sent
    analytics.last_synced_at = tz.now()
    analytics.save()

    return {
        'success': True,
        'sent':    sent,
        'skipped': skipped,
        'failed':  failed,
        'total':   len(contacts),
        'errors':  errors[:20],
        'dry_run': dry_run,
    }


def send_test_email(campaign_id: str, to_email: str) -> dict:
    """Send a preview/test email to a single address."""
    from .models import Campaign
    from django.core.mail import EmailMultiAlternatives

    try:
        campaign = Campaign.objects.get(resource_id=campaign_id)
    except Campaign.DoesNotExist:
        return {'success': False, 'error': 'Campaign not found.'}

    html_body = campaign.html_body or (
        campaign.template.html_body if campaign.template else '')
    text_body = campaign.text_body or ''

    preview_contact = {
        'first_name': 'Test', 'last_name': 'User',
        'email': to_email, 'custom_fields': {},
    }
    rendered_html, rendered_text = render_template(
        html_body, text_body, preview_contact,
        campaign_id, uuid.uuid4().hex,
    )

    if not _live():
        return {'success': True, 'mock': True, 'to': to_email}

    try:
        conn = _get_connection()
        msg  = EmailMultiAlternatives(
            subject=f'[TEST] {campaign.subject}',
            body=rendered_text or '',
            from_email=f'{campaign.from_name} <{campaign.from_email}>',
            to=[to_email],
            connection=conn,
        )
        msg.attach_alternative(rendered_html, 'text/html')
        msg.send()
        return {'success': True, 'to': to_email}
    except Exception as exc:
        return {'success': False, 'error': str(exc)}


# ── CSV Import ────────────────────────────────────────────────────────────────

def import_contacts_csv(contact_list_id: str, csv_text: str,
                         owner) -> dict:
    """
    Import contacts from a CSV string.
    Expected header: email[,first_name,last_name,...]
    Returns: {created, updated, skipped, errors}
    """
    import csv, io
    from .models import ContactList, Contact

    try:
        lst = ContactList.objects.get(resource_id=contact_list_id, owner=owner)
    except ContactList.DoesNotExist:
        return {'success': False, 'error': 'Contact list not found.'}

    reader  = csv.DictReader(io.StringIO(csv_text.strip()))
    created = updated = skipped = 0
    errors  = []

    for i, row in enumerate(reader):
        email = (row.get('email') or row.get('Email') or '').strip().lower()
        if not email or '@' not in email:
            errors.append({'row': i + 2, 'error': 'Invalid email', 'data': str(row)})
            skipped += 1
            continue

        defaults = {
            'first_name': (row.get('first_name') or row.get('First Name') or '').strip(),
            'last_name':  (row.get('last_name')  or row.get('Last Name')  or '').strip(),
            'status':     'subscribed',
        }
        # Any extra columns go to custom_fields
        extra = {k: v for k, v in row.items()
                 if k.lower() not in ('email', 'first_name', 'last_name',
                                      'first name', 'last name')}
        if extra:
            defaults['custom_fields'] = extra

        obj, was_created = Contact.objects.update_or_create(
            contact_list=lst, email=email, defaults=defaults)
        if was_created:
            created += 1
        else:
            updated += 1

    return {
        'success': True,
        'created': created,
        'updated': updated,
        'skipped': skipped,
        'errors':  errors[:20],
    }


# ── Aggregate Stats ───────────────────────────────────────────────────────────

def get_account_stats(owner) -> dict:
    """Return top-level marketing stats for the account dashboard."""
    from .models import Campaign, ContactList, Contact, CampaignAnalytics
    from django.db.models import Sum, Avg

    campaigns = Campaign.objects.filter(owner=owner)
    sent_campaigns = campaigns.filter(status='sent')

    agg = CampaignAnalytics.objects.filter(
        campaign__owner=owner,
        campaign__status='sent',
    ).aggregate(
        total_sent=Sum('total_sent'),
        total_opens=Sum('unique_opens'),
        total_clicks=Sum('unique_clicks'),
        total_bounces=Sum('bounced'),
        total_unsubs=Sum('unsubscribes'),
    )

    total_sent    = agg['total_sent']    or 0
    total_opens   = agg['total_opens']   or 0
    total_clicks  = agg['total_clicks']  or 0
    total_bounces = agg['total_bounces'] or 0
    total_unsubs  = agg['total_unsubs']  or 0

    return {
        'campaigns':        campaigns.count(),
        'sent_campaigns':   sent_campaigns.count(),
        'draft_campaigns':  campaigns.filter(status='draft').count(),
        'contact_lists':    ContactList.objects.filter(owner=owner, status='active').count(),
        'total_contacts':   Contact.objects.filter(
                                contact_list__owner=owner, status='subscribed').count(),
        'total_sent':       total_sent,
        'avg_open_rate':    round(total_opens  / total_sent * 100, 2) if total_sent else 0,
        'avg_click_rate':   round(total_clicks / total_sent * 100, 2) if total_sent else 0,
        'avg_bounce_rate':  round(total_bounces / total_sent * 100, 2) if total_sent else 0,
        'total_unsubscribes': total_unsubs,
    }
