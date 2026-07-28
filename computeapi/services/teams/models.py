# OrcaCloud — Team System Models

from django.db import models
from django.contrib.auth.models import User
from ..core.base_models import TimeStampedModel
import uuid


# ── Choices ───────────────────────────────────────────────────────────────────

TEAM_TYPE = [
    ('developer',   'Developer Team'),
    ('production',  'Production / Operations Team'),
    ('marketing',   'Marketing Team'),
    ('data',        'Data / Science Team'),
    ('custom',      'Custom Team'),
]

TEAM_STATUS = [
    ('active',    'Active'),
    ('archived',  'Archived'),
]

TEAM_ROLE = [
    ('owner',   'Owner'),
    ('admin',   'Admin'),
    ('member',  'Member'),
    ('viewer',  'Viewer'),
]

PORTFOLIO_TYPE = [
    ('developer',  'Developer'),
    ('marketing',  'Marketing'),
    ('data',       'Data'),
    ('general',    'General'),
]

INVITE_STATUS = [
    ('pending',   'Pending'),
    ('accepted',  'Accepted'),
    ('declined',  'Declined'),
    ('expired',   'Expired'),
]


def _gen_id(prefix: str) -> str:
    return f'{prefix}-{uuid.uuid4().hex[:12]}'


# ── Permission Templates ──────────────────────────────────────────────────────

PERMISSION_TEMPLATES: dict[str, dict[str, bool]] = {
    'developer': {
        'app.create':       True,
        'app.deploy':       True,
        'app.delete':       True,
        'pipeline.run':     True,
        'pipeline.create':  True,
        'logs.view':        True,
        'monitoring.view':  True,
        'campaign.create':  False,
        'campaign.publish': False,
        'dataset.write':    False,
        'model.train':      False,
    },
    'marketing': {
        'app.create':         False,
        'app.deploy':         False,
        'campaign.create':    True,
        'campaign.publish':   True,
        'analytics.view':     True,
        'media.upload':       True,
        'audience.manage':    True,
        'dataset.write':      False,
        'model.train':        False,
        'logs.view':          False,
    },
    'data': {
        'dataset.read':    True,
        'dataset.write':   True,
        'model.train':     True,
        'experiment.run':  True,
        'notebook.create': True,
        'app.create':      False,
        'app.deploy':      False,
        'campaign.create': False,
    },
    'production': {
        'monitoring.view':  True,
        'incident.manage':  True,
        'alert.manage':     True,
        'deployment.view':  True,
        'deployment.manage':True,
        'logs.view':        True,
        'app.create':       False,
        'campaign.create':  False,
    },
    'custom': {},
}


# ── Team ──────────────────────────────────────────────────────────────────────

class Team(TimeStampedModel):
    team_id     = models.CharField(max_length=64, unique=True, db_index=True, editable=False)
    name        = models.CharField(max_length=255, db_index=True)
    team_type   = models.CharField(max_length=20, choices=TEAM_TYPE, default='developer', db_index=True)
    description = models.TextField(blank=True)
    owner       = models.ForeignKey(User, on_delete=models.CASCADE, related_name='owned_teams')
    status      = models.CharField(max_length=20, choices=TEAM_STATUS, default='active', db_index=True)
    avatar_color= models.CharField(max_length=7, default='#00E0FF')  # hex colour for UI

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.team_id:
            self.team_id = _gen_id('team')
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.name} [{self.team_type}]'

    @property
    def member_count(self):
        return self.members.count()


# ── Team Member ───────────────────────────────────────────────────────────────

class TeamMember(TimeStampedModel):
    team      = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='members')
    user      = models.ForeignKey(User, on_delete=models.CASCADE, related_name='team_memberships')
    role      = models.CharField(max_length=20, choices=TEAM_ROLE, default='member')
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [('team', 'user')]
        ordering = ['joined_at']

    def __str__(self):
        return f'{self.user.username} → {self.team.name} ({self.role})'


# ── Team Permission ───────────────────────────────────────────────────────────

class TeamPermission(TimeStampedModel):
    team           = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='permissions')
    permission_key = models.CharField(max_length=100)
    allowed        = models.BooleanField(default=False)

    class Meta:
        unique_together = [('team', 'permission_key')]
        ordering = ['permission_key']

    def __str__(self):
        sign = 'OK' if self.allowed else 'FAIL'
        return f'{self.team.name} | {self.permission_key} {sign}'


# ── Team Resource ─────────────────────────────────────────────────────────────

class TeamResource(TimeStampedModel):
    team          = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='resources')
    resource_type = models.CharField(max_length=60)  # 'app', 'domain', 'pipeline', ...
    resource_id   = models.CharField(max_length=64)
    resource_name = models.CharField(max_length=255, blank=True)
    permissions   = models.JSONField(default=dict)   # e.g. {"read": true, "write": true}

    class Meta:
        unique_together = [('team', 'resource_type', 'resource_id')]
        ordering = ['resource_type', 'resource_name']

    def __str__(self):
        return f'{self.team.name} → {self.resource_type}/{self.resource_id}'


# ── Portfolio ─────────────────────────────────────────────────────────────────

class Portfolio(TimeStampedModel):
    portfolio_id   = models.CharField(max_length=64, unique=True, db_index=True, editable=False)
    team           = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='portfolios')
    name           = models.CharField(max_length=255)
    portfolio_type = models.CharField(max_length=20, choices=PORTFOLIO_TYPE, default='general')
    description    = models.TextField(blank=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.portfolio_id:
            self.portfolio_id = _gen_id('port')
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.name} ({self.team.name})'


# ── Portfolio Resource ────────────────────────────────────────────────────────

class PortfolioResource(TimeStampedModel):
    portfolio     = models.ForeignKey(Portfolio, on_delete=models.CASCADE, related_name='items')
    resource_type = models.CharField(max_length=60)
    resource_id   = models.CharField(max_length=64)
    resource_name = models.CharField(max_length=255, blank=True)

    class Meta:
        unique_together = [('portfolio', 'resource_type', 'resource_id')]

    def __str__(self):
        return f'{self.portfolio.name} → {self.resource_type}/{self.resource_id}'


# ── Team Activity Log ─────────────────────────────────────────────────────────

class TeamActivityLog(TimeStampedModel):
    team        = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='activity_logs')
    actor       = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='team_actions')
    action      = models.CharField(max_length=80)      # 'member_added', 'role_changed', ...
    target_type = models.CharField(max_length=60, blank=True)
    target_id   = models.CharField(max_length=64, blank=True)
    target_name = models.CharField(max_length=255, blank=True)
    metadata    = models.JSONField(default=dict)
    timestamp   = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f'[{self.team.name}] {self.actor} {self.action}'


# ── Team Invitation ───────────────────────────────────────────────────────────

class TeamInvitation(TimeStampedModel):
    invite_id  = models.CharField(max_length=64, unique=True, db_index=True, editable=False)
    team       = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='invitations')
    invited_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_invitations')
    email      = models.EmailField(db_index=True)
    role       = models.CharField(max_length=20, choices=TEAM_ROLE, default='member')
    status     = models.CharField(max_length=20, choices=INVITE_STATUS, default='pending')
    token      = models.CharField(max_length=128, unique=True)
    expires_at = models.DateTimeField()

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.invite_id:
            self.invite_id = _gen_id('inv')
        if not self.token:
            self.token = uuid.uuid4().hex
        super().save(*args, **kwargs)

    def __str__(self):
        return f'Invite {self.email} → {self.team.name}'
