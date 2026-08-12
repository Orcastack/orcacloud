"""Run the self-healing reconciliation loop."""

from __future__ import annotations

import threading

from django.core.management.base import BaseCommand

from services.self_healing.runtime import runtime


class Command(BaseCommand):
    help = "Run the OrcaCloud self-healing reconciliation controller."

    def add_arguments(self, parser):
        parser.add_argument("--once", action="store_true", help="Run one reconciliation cycle and exit.")

    def handle(self, *args, **options):
        if options["once"]:
            actions = runtime.controller.reconcile_once()
            self.stdout.write(self.style.SUCCESS(f"Dispatched {len(actions)} recovery action(s)."))
            return
        self.stdout.write(self.style.SUCCESS("Starting self-healing reconciliation loop."))
        try:
            runtime.controller.run(threading.Event())
        except KeyboardInterrupt:
            self.stdout.write("Self-healing reconciliation loop stopped.")
