# OrcaCloud — Deploy Service Models
# Orchestrates full-stack application deployment across CI/CD, infra, and environment subsystems.

import uuid
from django.db import models
from django.contrib.auth.models import User
from ..core.base_models import TimeStampedModel


# ─── ID helpers ───────────────────────────────────────────────────────────────

def _uid_template():
    return f'dtpl-{uuid.uuid4().hex[:10]}'

def _uid_request():
    return f'dreq-{uuid.uuid4().hex[:10]}'

def _uid_plan():
    return f'dpln-{uuid.uuid4().hex[:10]}'

def _uid_execution():
    return f'dexe-{uuid.uuid4().hex[:10]}'

def _uid_audit():
    return f'daud-{uuid.uuid4().hex[:10]}'


# ─── Choices ──────────────────────────────────────────────────────────────────

FRONTEND_CHOICES = [
    ('react',        'React'),
    ('nextjs',       'Next.js'),
    ('vue',          'Vue'),
    ('angular',      'Angular'),
    ('svelte',       'Svelte'),
    ('flutter_web',  'Flutter Web'),
    ('static_html',  'Static HTML'),
    ('none',         'None'),
]

BACKEND_CHOICES = [
    ('nodejs',        'Node.js'),
    ('python_django', 'Python / Django'),
    ('python_fastapi','Python / FastAPI'),
    ('python_flask',  'Python / Flask'),
    ('php_laravel',   'PHP / Laravel'),
    ('java_spring',   'Java / Spring Boot'),
    ('go',            'Go'),
    ('ruby_rails',    'Ruby on Rails'),
    ('dotnet',        '.NET'),
    ('rust',          'Rust'),
    ('none',          'None'),
]

DATABASE_CHOICES = [
    ('postgresql', 'PostgreSQL'),
    ('mysql',      'MySQL'),
    ('mongodb',    'MongoDB'),
    ('redis',      'Redis'),
    ('nosql',      'NoSQL'),
    ('sqlite',     'SQLite'),
    ('none',       'None'),
]

DEPLOY_MODE_CHOICES = [
    ('container',  'Container'),
    ('kubernetes', 'Kubernetes'),
]

APP_TYPE_CHOICES = [
    ('financial',  'Financial App'),
    ('technology', 'Technology App'),
    ('ecommerce',  'E-Commerce'),
    ('news',       'News / Media'),
    ('research',   'Research / Science'),
    ('social',     'Social App'),
    ('ai',         'AI / ML App'),
    ('custom',     'Custom'),
]

SOURCE_CHOICES = [
    ('github',    'GitHub'),
    ('gitlab',    'GitLab'),
    ('bitbucket', 'Bitbucket'),
    ('atonix',    'OrcaCloud Project'),
    ('zip',       'ZIP Upload'),
]

ENVIRONMENT_CHOICES = [
    ('dev',   'Development'),
    ('stage', 'Staging'),
    ('prod',  'Production'),
]

REQUEST_STATUS_CHOICES = [
    ('draft',     'Draft'),
    ('planning',  'Planning'),
    ('planned',   'Planned'),
    ('confirmed', 'Confirmed'),
    ('deploying', 'Deploying'),
    ('done',      'Done'),
    ('failed',    'Failed'),
]

EXECUTION_STATUS_CHOICES = [
    ('pending',      'Pending'),
    ('running',      'Running'),
    ('succeeded',    'Succeeded'),
    ('failed',       'Failed'),
    ('rolled_back',  'Rolled Back'),
    ('cancelled',    'Cancelled'),
]


# ─── DeploymentTemplate ───────────────────────────────────────────────────────

class DeploymentTemplate(TimeStampedModel):
    """
    Canonical recipe for deploying a specific stack combination.
    Templates are seeded by the platform and matched by the TemplateEngine.
    """
    id = models.CharField(max_length=40, primary_key=True, default=_uid_template, editable=False)

    name            = models.CharField(max_length=200)
    frontend        = models.CharField(max_length=40, choices=FRONTEND_CHOICES, default='none')
    backend         = models.CharField(max_length=40, choices=BACKEND_CHOICES, default='none')
    database        = models.CharField(max_length=40, choices=DATABASE_CHOICES, default='none')
    deploy_mode     = models.CharField(max_length=20, choices=DEPLOY_MODE_CHOICES, default='container')

    # Build & runtime
    runtime_image   = models.CharField(max_length=200, default='node:20-alpine')
    build_commands  = models.JSONField(default=list, help_text='Ordered list of shell commands for the build stage')
    install_command = models.CharField(max_length=500, default='npm ci')
    start_command   = models.CharField(max_length=500, default='node server.js')

    # Health checks
    health_check_path   = models.CharField(max_length=200, default='/health')
    health_check_port   = models.IntegerField(default=8000)
    readiness_delay_sec = models.IntegerField(default=5)

    # Autoscaling defaults
    default_replicas    = models.IntegerField(default=2)
    min_replicas        = models.IntegerField(default=1)
    max_replicas        = models.IntegerField(default=10)
    cpu_threshold_pct   = models.IntegerField(default=65)

    # Resource defaults (Kubernetes)
    cpu_request    = models.CharField(max_length=20, default='100m')
    cpu_limit      = models.CharField(max_length=20, default='500m')
    memory_request = models.CharField(max_length=20, default='128Mi')
    memory_limit   = models.CharField(max_length=20, default='512Mi')

    # Default env vars (non-secret, e.g. NODE_ENV=production)
    default_env_vars    = models.JSONField(default=dict)

    # Port exposed by the app container
    app_port        = models.IntegerField(default=8000)

    is_active       = models.BooleanField(default=True)

    class Meta:
        db_table = 'deploy_templates'
        indexes = [
            models.Index(fields=['frontend', 'backend', 'database', 'deploy_mode']),
        ]

    def __str__(self):
        return f'{self.name} [{self.frontend}+{self.backend}+{self.database}/{self.deploy_mode}]'


# ─── DeploymentRequest ────────────────────────────────────────────────────────

class DeploymentRequest(TimeStampedModel):
    """
    Represents a developer's filled-in wizard form.
    First step: created when they click 'Deploy Now' on step 11.
    """
    id = models.CharField(max_length=40, primary_key=True, default=_uid_request, editable=False)

    owner       = models.ForeignKey(User, on_delete=models.CASCADE, related_name='deploy_requests')

    # Wizard selections
    source      = models.CharField(max_length=20, choices=SOURCE_CHOICES)
    app_type    = models.CharField(max_length=20, choices=APP_TYPE_CHOICES, default='technology')
    frontend    = models.CharField(max_length=40, choices=FRONTEND_CHOICES, default='none')
    backend     = models.CharField(max_length=40, choices=BACKEND_CHOICES, default='none')
    database    = models.CharField(max_length=40, choices=DATABASE_CHOICES, default='none')
    deploy_mode = models.CharField(max_length=20, choices=DEPLOY_MODE_CHOICES, default='container')
    description = models.TextField(blank=True, default='')

    # Project / group references (optional FK-style via string ID)
    project_id      = models.CharField(max_length=50, blank=True, default='')
    new_project_name= models.CharField(max_length=200, blank=True, default='',
                                       help_text='Populated when user creates a new project from the wizard')
    group_id        = models.CharField(max_length=50, blank=True, default='')

    # Git info
    git_repo   = models.CharField(max_length=500)
    git_branch = models.CharField(max_length=200, default='main')

    # Target environments selected by the user
    target_environments = models.JSONField(
        default=list,
        help_text='e.g. ["dev","stage","prod"]'
    )

    # Lifecycle
    status = models.CharField(max_length=20, choices=REQUEST_STATUS_CHOICES, default='draft')

    # Matched template (set after planning)
    template = models.ForeignKey(
        DeploymentTemplate,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='requests',
    )

    class Meta:
        db_table = 'deploy_requests'
        indexes = [
            models.Index(fields=['owner', 'status']),
            models.Index(fields=['project_id']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        proj_label = self.project_id or self.new_project_name or 'unnamed'
        return f'DeployRequest({self.id}) [{proj_label}] {self.status}'

    @property
    def app_name(self):
        """Derived app name for logs and resource naming."""
        return (self.project_id or self.new_project_name or 'app').lower().replace(' ', '-')


# ─── DeploymentPlan ───────────────────────────────────────────────────────────

class DeploymentPlan(TimeStampedModel):
    """
    Auto-generated deployment architecture for a DeploymentRequest.
    Shown to the user for review before they click Deploy.
    """
    id = models.CharField(max_length=40, primary_key=True, default=_uid_plan, editable=False)

    request     = models.OneToOneField(
        DeploymentRequest,
        on_delete=models.CASCADE,
        related_name='plan',
    )

    # Generated artefacts
    build_steps         = models.JSONField(default=list)
    deploy_steps        = models.JSONField(default=list)
    env_vars            = models.JSONField(default=dict)
    secrets             = models.JSONField(default=dict,  help_text='Secret names only — values never stored in plan')
    infra_resources     = models.JSONField(default=list,  help_text='List of infra resources to provision')
    monitoring_rules    = models.JSONField(default=list)
    scaling_rules       = models.JSONField(default=dict)
    rollback_strategy   = models.JSONField(default=dict)
    ci_pipeline_def     = models.JSONField(default=dict,  help_text='Pipeline stages/jobs definition')

    # Security posture adjustments derived from app_type + description
    security_posture    = models.JSONField(default=dict)

    # Text artefacts
    dockerfile          = models.TextField(blank=True, default='')
    k8s_manifests       = models.JSONField(default=dict, help_text='{ deployment, service, ingress } YAML strings')

    # App URL that will be live after deploy
    app_url = models.CharField(max_length=500, blank=True, default='')

    generated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'deploy_plans'

    def __str__(self):
        return f'DeployPlan({self.id}) → {self.request_id}'


# ─── DeploymentExecution ──────────────────────────────────────────────────────

class DeploymentExecution(TimeStampedModel):
    """
    A concrete run of a DeploymentPlan against a specific environment.
    Created when the user confirms the plan and clicks Deploy.
    """
    id = models.CharField(max_length=40, primary_key=True, default=_uid_execution, editable=False)

    plan        = models.ForeignKey(DeploymentPlan, on_delete=models.CASCADE, related_name='executions')
    environment = models.CharField(max_length=10, choices=ENVIRONMENT_CHOICES, default='dev')
    status      = models.CharField(max_length=20, choices=EXECUTION_STATUS_CHOICES, default='pending')

    # CI/CD linkage
    pipeline_id     = models.CharField(max_length=100, blank=True, default='',
                                       help_text='ID in the CI/CD subsystem')
    pipeline_run_id = models.CharField(max_length=100, blank=True, default='')

    # Infra resources created during this execution
    created_resources = models.JSONField(
        default=list,
        help_text='[{type, id, name, status}] — fed into Resource Control'
    )

    # Live log lines (persisted for status polling)
    log_lines = models.JSONField(default=list)

    # Timestamps
    started_at  = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    rolled_back_at = models.DateTimeField(null=True, blank=True)

    # Final app hostname / URL when succeeded
    app_hostname = models.CharField(max_length=500, blank=True, default='')
    app_url      = models.CharField(max_length=500, blank=True, default='')

    # Health check at time of completion
    health_status = models.CharField(max_length=20, blank=True, default='unknown')

    class Meta:
        db_table = 'deploy_executions'
        indexes = [
            models.Index(fields=['plan', 'environment']),
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['pipeline_id']),
        ]

    def __str__(self):
        return f'DeployExecution({self.id}) [{self.environment}] {self.status}'

    @property
    def request(self):
        return self.plan.request

    @property
    def app_name(self):
        return self.plan.request.app_name


# ─── DeploymentAuditLog ───────────────────────────────────────────────────────

class DeploymentAuditLog(TimeStampedModel):
    """
    Immutable record of every deployment action — who did what, where, when.
    Feeds the platform-wide Audit Logs (Operational tab).
    """
    id = models.CharField(max_length=40, primary_key=True, default=_uid_audit, editable=False)

    user        = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='deploy_audit_logs')
    execution   = models.ForeignKey(
        DeploymentExecution,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='audit_logs',
    )
    request     = models.ForeignKey(
        DeploymentRequest,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='audit_logs',
    )

    action      = models.CharField(max_length=100, db_index=True,
                                   help_text='e.g. deploy.request.created, deploy.confirmed, deploy.rollback.triggered')
    detail      = models.JSONField(default=dict)
    ip_address  = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        db_table = 'deploy_audit_logs'
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['action', 'created_at']),
        ]
        ordering = ['-created_at']

    def __str__(self):
        username = self.user.username if self.user else 'system'
        return f'[{username}] {self.action} @ {self.created_at}'
