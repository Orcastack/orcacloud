"""
billing_weekly_calculation – Management command
================================================
Calculates weekly billing snapshots for all active users.

Usage:
    python manage.py billing_weekly_calculation
    python manage.py billing_weekly_calculation --weeks-back 24
    python manage.py billing_weekly_calculation --user john@example.com
    python manage.py billing_weekly_calculation --flush-only

Schedule (cron):
    0 2 * * 1    # Every Monday at 02:00 UTC
    # or via Celery beat:
    # CELERY_BEAT_SCHEDULE = {
    #     'weekly-billing': {
    #         'task': 'services.billing.tasks.run_weekly_billing',
    #         'schedule': crontab(day_of_week='monday', hour=2),
    #     },
    # }
"""

from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth.models import User


class Command(BaseCommand):
    help = 'Calculate weekly billing snapshots across all (or a single) user account(s).'

    def add_arguments(self, parser):
        parser.add_argument(
            '--weeks-back', type=int, default=12,
            help='How many weeks back to (re)calculate (default: 12).',
        )
        parser.add_argument(
            '--user', type=str, default=None,
            help='Limit calculation to a single user (email or username).',
        )
        parser.add_argument(
            '--flush-only', action='store_true', default=False,
            help='Only flush pending PlatformUsageEvents into UsageRecords; skip snapshot calculation.',
        )

    def handle(self, *args, **options):
        from services.billing import service as svc

        weeks_back  = options['weeks_back']
        user_filter = options['user']
        flush_only  = options['flush_only']

        # Resolve user if provided
        owner = None
        if user_filter:
            try:
                owner = User.objects.get(email=user_filter)
            except User.DoesNotExist:
                try:
                    owner = User.objects.get(username=user_filter)
                except User.DoesNotExist:
                    raise CommandError(f'User "{user_filter}" not found.')
            self.stdout.write(f'Targeting user: {owner.username} ({owner.email})')

        # Step 1 – flush pending events
        self.stdout.write('Flushing pending usage events → UsageRecord rows…')
        flushed = svc.flush_usage_events(owner)
        self.stdout.write(self.style.SUCCESS(f'  Flushed {flushed} events.'))

        if flush_only:
            self.stdout.write('--flush-only flag set. Done.')
            return

        # Step 2 – calculate snapshots
        self.stdout.write(f'Calculating weekly snapshots ({weeks_back} weeks back)…')
        count = svc.calculate_weekly_snapshots(owner=owner, weeks_back=weeks_back)
        self.stdout.write(self.style.SUCCESS(
            f'  Written/updated {count} snapshot rows across '
            f'{"all users" if owner is None else owner.username}.'
        ))

        # Step 3 – summary for the requesting user (if single user)
        if owner:
            analysis = svc.get_spending_analysis(owner)
            if analysis:
                cw = analysis.get('current_week', {})
                self.stdout.write('\n── Current Week Summary ─────────────────────────')
                self.stdout.write(f"  Week:          {cw.get('week_start')} → {cw.get('week_end')}")
                self.stdout.write(f"  Total cost:    ${cw.get('total', 0):.4f}")
                self.stdout.write(f"  WoW delta:     ${analysis.get('wow_delta', 0):+.2f} ({analysis.get('wow_pct', 0):+.1f}%)")
                self.stdout.write(f"  MTD:           ${analysis.get('mtd', 0):.2f} (prior: ${analysis.get('prior_mtd', 0):.2f})")
                self.stdout.write(f"  Weekly avg:    ${analysis.get('weekly_avg', 0):.2f}")
                self.stdout.write(f"  Projected/mo:  ${analysis.get('projected_month', 0):.2f}")
                self.stdout.write('─────────────────────────────────────────────────')

        self.stdout.write(self.style.SUCCESS('Weekly billing calculation complete.'))
