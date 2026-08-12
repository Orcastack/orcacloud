# OrcaCloud – Onboarding & Cloud Dashboard Models

from django.db import models
from django.contrib.auth.models import User
import uuid


class OnboardingStep(models.TextChoices):
    VERIFY_EMAIL    = 'verify_email',     'Verify Account Email'
    ADD_SSH_KEY     = 'add_ssh_key',      'Add SSH Key'
    CREATE_VM       = 'create_vm',        'Create Your First VM'
    CONFIGURE_NET   = 'configure_network','Configure Networking'
    ATTACH_VOLUME   = 'attach_volume',    'Attach a Volume'
    EXPLORE_DASH    = 'explore_dashboard','Explore the Dashboard'


class OnboardingProgress(models.Model):
    """
    Tracks per-user onboarding checklist progress.
    One record per user – each step stored as an individual boolean field.
    """
    id              = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user            = models.OneToOneField(User, on_delete=models.CASCADE, related_name='onboarding')
    verify_email    = models.BooleanField(default=False)
    add_ssh_key     = models.BooleanField(default=False)
    create_vm       = models.BooleanField(default=False)
    configure_network = models.BooleanField(default=False)
    attach_volume   = models.BooleanField(default=False)
    explore_dashboard = models.BooleanField(default=False)
    created_at      = models.DateTimeField(auto_now_add=True)
    updated_at      = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Onboarding Progress'
        verbose_name_plural = 'Onboarding Progress'

    def __str__(self):
        return f"Onboarding [{self.user.username}] – {self.completion_pct}% done"

    @property
    def completion_pct(self) -> int:
        steps = [
            self.verify_email, self.add_ssh_key, self.create_vm,
            self.configure_network, self.attach_volume, self.explore_dashboard,
        ]
        done = sum(1 for s in steps if s)
        return int((done / len(steps)) * 100)

    @property
    def completed_steps(self) -> list[str]:
        mapping = {
            'verify_email':      self.verify_email,
            'add_ssh_key':       self.add_ssh_key,
            'create_vm':         self.create_vm,
            'configure_network': self.configure_network,
            'attach_volume':     self.attach_volume,
            'explore_dashboard': self.explore_dashboard,
        }
        return [k for k, v in mapping.items() if v]
