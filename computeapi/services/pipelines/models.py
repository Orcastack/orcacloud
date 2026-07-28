from django.db import models
from django.contrib.auth.models import User
from ..core.base_models import TimeStampedModel, Status
import uuid


class Project(TimeStampedModel):
    """
    Represents a user project — an empty container that grows as the user
    attaches repositories, workspaces, environments, groups and containers.
    Created in a single step (no wizard).
    """
    VISIBILITY_CHOICES = [
        ('private', 'Private'),
        ('team',    'Team'),
        ('public',  'Public'),
    ]

    id          = models.CharField(max_length=50, primary_key=True)
    owner       = models.ForeignKey(User, on_delete=models.CASCADE)
    name        = models.CharField(max_length=100)
    project_key = models.CharField(
        max_length=50, blank=True, default='',
        help_text='Short URL-safe identifier, e.g. "my-app".',
    )
    namespace   = models.CharField(
        max_length=80, blank=True, default='',
        help_text='Kubernetes/org namespace auto-generated from owner+key.',
    )
    description = models.TextField(blank=True)
    visibility  = models.CharField(
        max_length=10, choices=VISIBILITY_CHOICES, default='private',
    )
    avatar_color = models.CharField(max_length=20, blank=True, default='#153d75')
    last_activity = models.DateTimeField(null=True, blank=True)

    # Ownership lineage ─────────────────────────────────────────────────────
    created_by   = models.ForeignKey(
        User, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='created_projects',
        help_text='The user who pressed "Create Project".',
    )
    # Context: where was this project created from?
    CONTEXT_CHOICES = [
        ('personal',  'Personal'),
        ('workspace', 'Workspace'),
        ('group',     'Group'),
    ]
    context      = models.CharField(
        max_length=20, choices=CONTEXT_CHOICES, default='personal',
        help_text='Creation context for provenance tracking.',
    )
    workspace_id   = models.CharField(max_length=64, blank=True, default='',
        help_text='workspace_id of the DevWorkspace this project was created in.')
    workspace_name = models.CharField(max_length=200, blank=True, default='')
    group_id       = models.CharField(max_length=64, blank=True, default='',
        help_text='Group ID this project belongs to.')
    group_name     = models.CharField(max_length=200, blank=True, default='')

    # ── Resource origin context (context-aware architecture) ─────────────────
    ROLE_CHOICES = [
        ('enterprise', 'Enterprise'),
        ('developer',  'Developer'),
    ]
    created_by_role = models.CharField(
        max_length=20, choices=ROLE_CHOICES, default='developer',
        db_index=True,
        help_text='Whether this project was created under an enterprise or developer identity.',
    )
    # parent_context_id is the enterprise org id or group id (reuses group_id for group context)
    parent_context_id = models.CharField(
        max_length=100, blank=True, default='',
        db_index=True,
        help_text='Owning entity ID: enterprise org id, group id, or empty for personal.',
    )
    return_path = models.CharField(
        max_length=500, blank=True, default='',
        help_text='Frontend URL the user navigates back to from this project.',
    )

    class Meta:
        db_table = 'projects'
        indexes = [
            models.Index(fields=['owner', 'name']),
            models.Index(fields=['owner', 'project_key']),
        ]

    def __str__(self):
        return f"{self.owner.username}/{self.name}"


class Repository(TimeStampedModel):
    """Represents a source repository — OrcaCloud-hosted or externally connected."""
    id = models.CharField(max_length=50, primary_key=True)
    project = models.ForeignKey(
        Project, on_delete=models.CASCADE, related_name='repositories',
        null=True, blank=True,
    )
    provider = models.CharField(max_length=20, choices=[
        ('github',    'GitHub'),
        ('gitlab',    'GitLab'),
        ('bitbucket', 'Bitbucket'),
        ('atonix',    'OrcaCloud'),
    ], default='atonix')
    repo_name        = models.CharField(max_length=100)
    repo_description = models.TextField(blank=True, default='')
    default_branch   = models.CharField(max_length=100, default='main')
    visibility       = models.CharField(max_length=10, choices=[
        ('private', 'Private'),
        ('public',  'Public'),
        ('team',    'Team'),
    ], default='private')
    # Git storage on disk (for OrcaCloud-hosted repos)
    is_bare          = models.BooleanField(default=True)
    disk_path        = models.CharField(max_length=500, blank=True, default='')
    storage_bucket   = models.CharField(max_length=200, blank=True, default='')
    # Owner (used when repo is not linked to a project)
    owner            = models.ForeignKey(
        'auth.User', on_delete=models.CASCADE, related_name='repositories',
        null=True, blank=True,
    )
    created_by       = models.ForeignKey(
        'auth.User', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='created_repositories',
        help_text='The user who created this repository.',
    )
    # Context: workspace / group this repo was created within
    workspace_id  = models.CharField(max_length=64, blank=True, default='',
        help_text='ID of the DevWorkspace this repo was created in.')
    workspace_name = models.CharField(max_length=200, blank=True, default='')
    group_id      = models.CharField(max_length=64, blank=True, default='',
        help_text='ID of the Group this repo was created in.')
    group_name    = models.CharField(max_length=200, blank=True, default='')
    tree_data = models.JSONField(default=list, blank=True)

    class Meta:
        db_table = 'repositories'
        indexes = [
            models.Index(fields=['project', 'provider']),
            models.Index(fields=['owner']),
        ]

    @property
    def clone_https_url(self):
        from django.conf import settings
        base = getattr(settings, 'GIT_BASE_URL', 'https://cloud.orcacloud.com')
        ns = self.project.project_key if self.project else (
            self.owner.username if self.owner else 'repos'
        )
        return f"{base}/{ns}/{self.repo_name}.git"

    @property
    def clone_ssh_url(self):
        from django.conf import settings
        host = getattr(settings, 'GIT_SSH_HOST', 'cloud.orcacloud.com')
        ns = self.project.project_key if self.project else (
            self.owner.username if self.owner else 'repos'
        )
        return f"git@{host}:{ns}/{self.repo_name}.git"

    def __str__(self):
        return f"{self.provider}/{self.repo_name}"


class SSHKey(TimeStampedModel):
    """User-uploaded SSH public key for Git authentication."""
    id         = models.CharField(max_length=50, primary_key=True)
    user       = models.ForeignKey('auth.User', on_delete=models.CASCADE, related_name='ssh_keys')
    title      = models.CharField(max_length=200)
    public_key = models.TextField()
    fingerprint = models.CharField(max_length=200, blank=True)
    last_used  = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'ssh_keys'
        unique_together = ['user', 'fingerprint']

    def save(self, *args, **kwargs):
        if self.public_key and not self.fingerprint:
            import hashlib, base64
            try:
                parts = self.public_key.strip().split()
                key_b64 = parts[1] if len(parts) >= 2 else parts[0]
                raw = base64.b64decode(key_b64)
                digest = hashlib.md5(raw).digest()
                self.fingerprint = ':'.join(f'{b:02x}' for b in digest)
            except Exception:
                self.fingerprint = hashlib.sha256(self.public_key.encode()).hexdigest()[:40]
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.user.username}: {self.title}"


class PipelineFile(TimeStampedModel):
    """Represents a pipeline configuration file found in a repository."""
    id = models.CharField(max_length=50, primary_key=True)
    repo = models.ForeignKey(Repository, on_delete=models.CASCADE, related_name='pipeline_files')
    path = models.CharField(max_length=500)
    file_type = models.CharField(max_length=20, default='atonix')

    class Meta:
        db_table = 'pipeline_files'
        unique_together = ['repo', 'path']
        indexes = [
            models.Index(fields=['repo', 'file_type']),
        ]

    def __str__(self):
        return f"{self.repo}:{self.path}"


class Pipeline(TimeStampedModel):
    """Represents a single pipeline run."""
    id = models.CharField(max_length=50, primary_key=True)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='pipelines')
    repo = models.ForeignKey(Repository, on_delete=models.CASCADE, related_name='pipelines')
    pipeline_name = models.CharField(max_length=100)
    pipeline_file = models.CharField(max_length=500)
    branch = models.CharField(max_length=100)
    status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('running', 'Running'),
        ('success', 'Success'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ], default='pending')
    triggered_by = models.CharField(max_length=100)
    started_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'pipelines'
        indexes = [
            models.Index(fields=['project', 'status']),
            models.Index(fields=['repo', 'branch']),
            models.Index(fields=['status', 'started_at']),
        ]

    def __str__(self):
        return f"{self.pipeline_name} ({self.status})"


class PipelineJob(TimeStampedModel):
    """Represents a job within a pipeline (e.g., install, build, test)."""
    id = models.CharField(max_length=50, primary_key=True)
    pipeline = models.ForeignKey(Pipeline, on_delete=models.CASCADE, related_name='jobs')
    name = models.CharField(max_length=100)
    stage = models.CharField(max_length=100)
    status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('running', 'Running'),
        ('success', 'Success'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ], default='pending')
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'pipeline_jobs'
        indexes = [
            models.Index(fields=['pipeline', 'status']),
            models.Index(fields=['status', 'started_at']),
        ]

    def __str__(self):
        return f"{self.pipeline.pipeline_name}:{self.name} ({self.status})"


class JobLog(models.Model):
    """Stores streaming logs for each job."""
    id = models.AutoField(primary_key=True)
    job = models.ForeignKey(PipelineJob, on_delete=models.CASCADE, related_name='logs')
    log = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'job_logs'
        indexes = [
            models.Index(fields=['job', 'timestamp']),
        ]

    def __str__(self):
        return f"Log for {self.job} at {self.timestamp}"


class PipelineApproval(models.Model):
    """Tracks approvals for protected pipelines."""
    id = models.AutoField(primary_key=True)
    pipeline = models.ForeignKey(Pipeline, on_delete=models.CASCADE, related_name='approvals')
    approved_by = models.CharField(max_length=100)
    approved_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'pipeline_approvals'
        indexes = [
            models.Index(fields=['pipeline', 'approved_at']),
        ]

    def __str__(self):
        return f"Approval by {self.approved_by} for {self.pipeline}"


class PipelineRule(TimeStampedModel):
    """Platform-level rules for pipelines (e.g., protected branches)."""
    id = models.AutoField(primary_key=True)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='pipeline_rules')
    rule_type = models.CharField(max_length=50)  # e.g., 'protected_branch', 'required_approval'
    rule_value = models.CharField(max_length=200)  # e.g., 'main', 'production'

    class Meta:
        db_table = 'pipeline_rules'
        indexes = [
            models.Index(fields=['project', 'rule_type']),
        ]

    def __str__(self):
        return f"{self.project}:{self.rule_type}={self.rule_value}"


class Environment(TimeStampedModel):
    """Represents deployment environments."""
    DEPLOY_STRATEGY_CHOICES = [
        ('rolling',   'Rolling Update'),
        ('blue_green','Blue/Green'),
        ('canary',    'Canary'),
        ('recreate',  'Recreate'),
    ]

    id           = models.CharField(max_length=50, primary_key=True)
    project      = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='environments')
    name         = models.CharField(max_length=100)
    region       = models.CharField(max_length=100)
    description  = models.TextField(blank=True, default='')
    is_protected = models.BooleanField(default=False)
    auto_deploy  = models.BooleanField(default=False,
                    help_text='Automatically trigger a deploy when a pipeline succeeds on the default branch.')
    deployment_strategy = models.CharField(
        max_length=20, choices=DEPLOY_STRATEGY_CHOICES, default='rolling')
    require_approval    = models.BooleanField(default=False,
                    help_text='Block deployments until a reviewer approves.')
    notify_email        = models.EmailField(blank=True, default='',
                    help_text='Send deployment notifications to this address.')
    owner        = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL,
                    related_name='owned_environments')

    class Meta:
        db_table      = 'environments'
        unique_together = ['project', 'name']
        indexes = [
            models.Index(fields=['project', 'is_protected']),
        ]

    def __str__(self):
        return f"{self.project.name}:{self.name}"


class EnvironmentDeployment(TimeStampedModel):
    """A single deployment event recorded against an Environment."""
    DEPLOY_STATUS = [
        ('pending',     'Pending'),
        ('running',     'Running'),
        ('success',     'Success'),
        ('failed',      'Failed'),
        ('rolled_back', 'Rolled Back'),
    ]
    id           = models.CharField(max_length=50, primary_key=True, default='')
    environment  = models.ForeignKey(Environment, on_delete=models.CASCADE, related_name='deployments')
    version      = models.CharField(max_length=100)
    status       = models.CharField(max_length=20, choices=DEPLOY_STATUS, default='pending')
    triggered_by = models.CharField(max_length=100, default='manual')
    started_at   = models.DateTimeField(auto_now_add=True)
    finished_at  = models.DateTimeField(null=True, blank=True)
    notes        = models.TextField(blank=True, default='')
    pipeline_run = models.ForeignKey(
        'PipelineRun', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='env_deployments',
    )

    class Meta:
        db_table = 'environment_deployments'
        ordering = ['-started_at']

    def __str__(self):
        return f"{self.environment}@{self.version} ({self.status})"

    def save(self, *args, **kwargs):
        if not self.id:
            import uuid as _uuid
            self.id = f"dep-{_uuid.uuid4().hex[:16]}"
        super().save(*args, **kwargs)


class EnvironmentService(TimeStampedModel):
    """A workload / service running inside an Environment."""
    SVC_STATUS = [
        ('running',  'Running'),
        ('stopped',  'Stopped'),
        ('error',    'Error'),
        ('scaling',  'Scaling'),
    ]
    id          = models.CharField(max_length=50, primary_key=True, default='')
    environment = models.ForeignKey(Environment, on_delete=models.CASCADE, related_name='services')
    name        = models.CharField(max_length=100)
    status      = models.CharField(max_length=20, choices=SVC_STATUS, default='running')
    replicas    = models.IntegerField(default=1)
    desired     = models.IntegerField(default=1)
    image       = models.CharField(max_length=300, blank=True, default='')
    cpu_pct     = models.FloatField(default=0.0)
    ram_mb      = models.IntegerField(default=0)
    endpoints   = models.JSONField(default=list, blank=True)
    last_log    = models.TextField(blank=True, default='')

    class Meta:
        db_table = 'environment_services'
        unique_together = ['environment', 'name']
        ordering = ['name']

    def __str__(self):
        return f"{self.environment}:{self.name}"

    def save(self, *args, **kwargs):
        if not self.id:
            import uuid as _uuid
            self.id = f"svc-{_uuid.uuid4().hex[:16]}"
        super().save(*args, **kwargs)


class EnvironmentVariable(TimeStampedModel):
    """A config key-value pair (or secret) attached to an Environment."""
    environment = models.ForeignKey(Environment, on_delete=models.CASCADE, related_name='variables')
    key         = models.CharField(max_length=200)
    value       = models.TextField(blank=True, default='')
    secret      = models.BooleanField(default=False)

    class Meta:
        db_table = 'environment_variables'
        unique_together = ['environment', 'key']
        ordering = ['key']

    def __str__(self):
        return f"{self.environment}:{self.key}"


class EnvironmentFeatureFlag(TimeStampedModel):
    """A boolean feature flag scoped to an Environment."""
    environment = models.ForeignKey(Environment, on_delete=models.CASCADE, related_name='feature_flags')
    key         = models.CharField(max_length=200)
    enabled     = models.BooleanField(default=False)
    note        = models.TextField(blank=True, default='')

    class Meta:
        db_table = 'environment_feature_flags'
        unique_together = ['environment', 'key']
        ordering = ['key']

    def __str__(self):
        return f"{self.environment}:{self.key}={'on' if self.enabled else 'off'}"


class EnvironmentAuditEntry(TimeStampedModel):
    """Immutable audit-log row for actions taken against an Environment."""
    RESULT_CHOICES = [('success', 'Success'), ('denied', 'Denied')]
    id          = models.CharField(max_length=50, primary_key=True, default='')
    environment = models.ForeignKey(Environment, on_delete=models.CASCADE, related_name='audit_entries')
    action      = models.CharField(max_length=100)
    actor       = models.CharField(max_length=100)
    resource    = models.CharField(max_length=300, blank=True, default='')
    result      = models.CharField(max_length=20, choices=RESULT_CHOICES, default='success')

    class Meta:
        db_table = 'environment_audit_entries'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.environment}:{self.action} by {self.actor}"

    def save(self, *args, **kwargs):
        if not self.id:
            import uuid as _uuid
            self.id = f"aud-{_uuid.uuid4().hex[:16]}"
        super().save(*args, **kwargs)


class EnvironmentRelease(TimeStampedModel):
    """A versioned release snapshot for an Environment."""
    environment = models.ForeignKey(Environment, on_delete=models.CASCADE, related_name='releases')
    version     = models.CharField(max_length=100)
    deployed_at = models.DateTimeField(auto_now_add=True)
    deployed_by = models.CharField(max_length=100, default='system')
    notes       = models.TextField(blank=True, default='')
    active      = models.BooleanField(default=False)

    class Meta:
        db_table = 'environment_releases'
        ordering = ['-deployed_at']

    def __str__(self):
        return f"{self.environment}@{self.version} ({'active' if self.active else 'inactive'})"


class EnvironmentFile(TimeStampedModel):
    """A configuration / infrastructure file discovered in an environment's linked repos."""
    FILE_TYPE_CHOICES = [
        ('dockerfile',  'Dockerfile'),
        ('env',         '.env / dotenv'),
        ('yaml',        'YAML / YML'),
        ('helm',        'Helm Chart'),
        ('k8s',         'Kubernetes Manifest'),
        ('terraform',   'Terraform'),
        ('compose',     'Docker Compose'),
        ('config',      'Config File'),
        ('properties',  'Properties File'),
        ('other',       'Other'),
    ]

    environment       = models.ForeignKey(Environment, on_delete=models.CASCADE,
                          related_name='files')
    file_name         = models.CharField(max_length=255)
    file_path         = models.CharField(max_length=1000)
    file_type         = models.CharField(max_length=20, choices=FILE_TYPE_CHOICES, default='other')
    associated_service = models.CharField(max_length=200, blank=True, default='')
    is_valid          = models.BooleanField(default=True)
    has_errors        = models.BooleanField(default=False)
    error_message     = models.TextField(blank=True, default='')
    is_env_specific   = models.BooleanField(default=False,
                          help_text='True if this file contains env-specific overrides.')
    last_modified     = models.DateTimeField(null=True, blank=True)
    discovered_at     = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table  = 'environment_files'
        ordering  = ['file_type', 'file_name']
        indexes   = [
            models.Index(fields=['environment', 'file_type']),
            models.Index(fields=['environment', 'is_valid']),
        ]

    def __str__(self):
        return f"{self.environment}:{self.file_path}"


class PipelineArtifact(TimeStampedModel):
    """Stores information about build artifacts."""
    id = models.CharField(max_length=50, primary_key=True)
    job = models.ForeignKey(PipelineJob, on_delete=models.CASCADE, related_name='artifacts')
    artifact_path = models.CharField(max_length=500)
    storage_url = models.URLField()

    class Meta:
        db_table = 'pipeline_artifacts'
        indexes = [
            models.Index(fields=['job']),
        ]

    def __str__(self):
        return f"Artifact {self.artifact_path} for {self.job}"


# ─────────────────────────────────────────────────────────────────────────────
#  Pipeline Definition System  (named YAML templates + execution graph models)
# ─────────────────────────────────────────────────────────────────────────────

STAGE_TYPE_CHOICES = [
    ('build',    'Build'),
    ('test',     'Test'),
    ('security', 'Security Scan'),
    ('deploy',   'Deploy'),
    ('verify',   'Verify'),
    ('notify',   'Notify'),
    ('custom',   'Custom'),
]

STEP_TYPE_CHOICES = [
    ('script',       'Shell Script'),
    ('docker',       'Docker Build/Push'),
    ('kubernetes',   'Kubernetes Manifest'),
    ('approval',     'Manual Approval'),
    ('notification', 'Notification'),
    ('artifact',     'Artifact Upload'),
    ('test',         'Test Runner'),
    ('scan',         'Security Scan'),
]

NODE_STATUS_CHOICES = [
    ('pending',  'Pending'),
    ('running',  'Running'),
    ('success',  'Success'),
    ('failed',   'Failed'),
    ('skipped',  'Skipped'),
    ('waiting',  'Waiting Approval'),
    ('cancelled','Cancelled'),
]


class PipelineDefinition(TimeStampedModel):
    """
    A named, reusable pipeline template backed by a YAML definition.
    Analogous to a Harness pipeline or a GitLab CI config.
    """
    id              = models.CharField(max_length=60, primary_key=True)
    project         = models.ForeignKey(Project, on_delete=models.CASCADE,
                                        related_name='pipeline_definitions')
    name            = models.CharField(max_length=120)
    description     = models.TextField(blank=True, default='')
    yaml_definition = models.TextField(blank=True, default='',
                        help_text='Full YAML definition of the pipeline.')
    variables       = models.JSONField(default=list,
                        help_text='List of {name, value, secret} variable dicts.')
    triggers        = models.JSONField(default=list,
                        help_text='List of trigger configs (push, schedule, manual).')
    created_by      = models.ForeignKey(User, null=True, blank=True,
                                        on_delete=models.SET_NULL,
                                        related_name='created_definitions')
    is_active       = models.BooleanField(default=True)

    class Meta:
        db_table        = 'pipeline_definitions'
        unique_together = [('project', 'name')]
        indexes         = [models.Index(fields=['project', 'is_active'])]

    def __str__(self):
        return f"{self.project.name}/{self.name}"


class PipelineDefinitionStage(models.Model):
    """
    An ordered stage within a PipelineDefinition (Build → Test → Deploy).
    """
    definition  = models.ForeignKey(PipelineDefinition, on_delete=models.CASCADE,
                                     related_name='stages')
    name        = models.CharField(max_length=100)
    type        = models.CharField(max_length=20, choices=STAGE_TYPE_CHOICES,
                                   default='custom')
    order       = models.PositiveIntegerField(default=0)
    environment = models.CharField(max_length=100, blank=True, default='',
                    help_text='Target environment for deploy stages.')
    parallel    = models.BooleanField(default=False,
                    help_text='Run this stage\'s steps in parallel.')
    condition   = models.CharField(max_length=200, blank=True, default='',
                    help_text='Expression determining whether this stage runs.')

    class Meta:
        db_table  = 'pipeline_definition_stages'
        ordering  = ['order']
        unique_together = [('definition', 'name')]

    def __str__(self):
        return f"{self.definition.name} › {self.name}"


class PipelineDefinitionStep(models.Model):
    """
    An ordered step within a PipelineDefinitionStage.
    """
    stage           = models.ForeignKey(PipelineDefinitionStage,
                                        on_delete=models.CASCADE,
                                        related_name='steps')
    name            = models.CharField(max_length=100)
    type            = models.CharField(max_length=20, choices=STEP_TYPE_CHOICES,
                                       default='script')
    script          = models.TextField(blank=True, default='',
                        help_text='Shell script body for script-type steps.')
    config_json     = models.JSONField(default=dict,
                        help_text='Type-specific config (image, manifest, etc.).')
    order           = models.PositiveIntegerField(default=0)
    condition       = models.CharField(max_length=20,
                        choices=[('always','Always'),('on_success','On Success'),
                                 ('on_failure','On Failure')],
                        default='on_success')
    timeout_seconds = models.PositiveIntegerField(default=3600)
    retry_count     = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'pipeline_definition_steps'
        ordering = ['order']

    def __str__(self):
        return f"{self.stage.definition.name} › {self.stage.name} › {self.name}"


class PipelineRun(TimeStampedModel):
    """
    A single execution of a PipelineDefinition.
    Distinct from the legacy Pipeline model (which stays).
    """
    id          = models.CharField(max_length=60, primary_key=True)
    definition  = models.ForeignKey(PipelineDefinition, on_delete=models.CASCADE,
                                    related_name='runs')
    status      = models.CharField(max_length=20,
                    choices=[s for s in [
                        ('pending','Pending'), ('running','Running'),
                        ('success','Success'), ('failed','Failed'),
                        ('cancelled','Cancelled'), ('waiting','Waiting Approval'),
                    ]],
                    default='pending')
    repo         = models.ForeignKey('Repository', on_delete=models.SET_NULL,
                     null=True, blank=True, related_name='pipeline_runs')
    triggered_by = models.CharField(max_length=120)
    branch       = models.CharField(max_length=200, blank=True, default='main')
    commit_sha   = models.CharField(max_length=64, blank=True, default='')
    commit_msg   = models.CharField(max_length=300, blank=True, default='')
    variables    = models.JSONField(default=dict,
                    help_text='Run-time variable overrides.')
    started_at   = models.DateTimeField(null=True, blank=True)
    finished_at  = models.DateTimeField(null=True, blank=True)
    duration_s   = models.FloatField(null=True, blank=True)

    class Meta:
        db_table = 'pipeline_runs'
        indexes  = [
            models.Index(fields=['definition', 'status']),
            models.Index(fields=['status', 'started_at']),
        ]

    def __str__(self):
        return f"Run {self.id} of {self.definition.name} ({self.status})"


class PipelineRunNode(models.Model):
    """
    One node in the execution graph for a PipelineRun.
    Represents either an entire stage or a single step.
    """
    run         = models.ForeignKey(PipelineRun, on_delete=models.CASCADE,
                                    related_name='nodes')
    node_type   = models.CharField(max_length=10,
                    choices=[('stage','Stage'),('step','Step')],
                    default='step')
    stage_name  = models.CharField(max_length=100)
    step_name   = models.CharField(max_length=100, blank=True, default='')
    status      = models.CharField(max_length=20, choices=NODE_STATUS_CHOICES,
                                   default='pending')
    order       = models.PositiveIntegerField(default=0)
    started_at  = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    duration_s  = models.FloatField(null=True, blank=True)
    log_output  = models.TextField(blank=True, default='')
    error_msg   = models.TextField(blank=True, default='')
    artifacts   = models.JSONField(default=list,
                    help_text='List of {name, url} artifact references.')

    class Meta:
        db_table = 'pipeline_run_nodes'
        ordering = ['order']
        indexes  = [
            models.Index(fields=['run', 'status']),
            models.Index(fields=['run', 'stage_name']),
        ]

    def __str__(self):
        label = f"{self.stage_name}:{self.step_name}" if self.step_name else self.stage_name
        return f"Node {label} ({self.status})"


class PipelineRunArtifact(TimeStampedModel):
    """Artifact produced during a PipelineRun (linked to a node)."""
    run         = models.ForeignKey(PipelineRun, on_delete=models.CASCADE,
                                    related_name='run_artifacts')
    node        = models.ForeignKey(PipelineRunNode, null=True, blank=True,
                                    on_delete=models.SET_NULL,
                                    related_name='run_artifacts')
    name        = models.CharField(max_length=200)
    artifact_type = models.CharField(max_length=50, blank=True, default='',
                    help_text='docker_image, test_report, manifest, binary, etc.')
    storage_url = models.URLField(blank=True, default='')
    size_bytes  = models.BigIntegerField(default=0)
    metadata    = models.JSONField(default=dict)

    class Meta:
        db_table = 'pipeline_run_artifacts'
        indexes  = [models.Index(fields=['run', 'artifact_type'])]

    def __str__(self):
        return f"{self.name} for run {self.run_id}"
