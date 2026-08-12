# OrcaCloud — Deploy Service Business Logic
# Template engine, plan generator, description analyser, permission checker, audit logger.

from __future__ import annotations

import textwrap
from datetime import datetime, timezone
from typing import Optional

from django.contrib.auth.models import User
from django.utils import timezone as dj_tz

from .models import (
    DeploymentTemplate, DeploymentRequest, DeploymentPlan,
    DeploymentExecution, DeploymentAuditLog,
)


# ─────────────────────────────────────────────────────────────────────────────
# 1.  DESCRIPTION ANALYSER
# Maps free-text descriptions to security & scaling profiles — rule-based.
# ─────────────────────────────────────────────────────────────────────────────

_FINANCIAL_KEYWORDS  = {'financial', 'payment', 'banking', 'transaction', 'invoice', 'fintech', 'pci', 'ledger'}
_MEDIA_KEYWORDS      = {'news', 'media', 'video', 'upload', 'stream', 'cdn', 'publishing', 'broadcast'}
_AI_KEYWORDS         = {'ai', 'ml', 'machine learning', 'model', 'inference', 'training', 'gpu', 'research', 'dataset'}
_SOCIAL_KEYWORDS     = {'social', 'messaging', 'chat', 'feed', 'notification', 'friend', 'follower'}
_ECOMMERCE_KEYWORDS  = {'ecommerce', 'store', 'cart', 'checkout', 'inventory', 'product', 'order', 'shop'}


class DescriptionProfile:
    """Holds the derived security + scaling hints from description analysis."""
    def __init__(
        self,
        profile_name: str,
        security_level: str,          # low / medium / high / critical
        min_replicas: int,
        max_replicas: int,
        cpu_threshold: int,
        extra_env_vars: dict,
        monitoring_rules: list,
        security_rules: list,
        suggestions: list,
    ):
        self.profile_name     = profile_name
        self.security_level   = security_level
        self.min_replicas     = min_replicas
        self.max_replicas     = max_replicas
        self.cpu_threshold    = cpu_threshold
        self.extra_env_vars   = extra_env_vars
        self.monitoring_rules = monitoring_rules
        self.security_rules   = security_rules
        self.suggestions      = suggestions


def analyse_description(description: str, app_type: str) -> DescriptionProfile:
    """
    Rule-based analysis of the free-text description + app_type.
    Returns a DescriptionProfile that the PlanGenerator uses to tune
    scaling, security posture, env vars, and monitoring rules.
    """
    tokens = set(description.lower().split())

    def matches(keywords):
        return bool(tokens & keywords)

    # Financial
    if app_type == 'financial' or matches(_FINANCIAL_KEYWORDS):
        return DescriptionProfile(
            profile_name    = 'financial',
            security_level  = 'critical',
            min_replicas    = 3,
            max_replicas    = 20,
            cpu_threshold   = 55,
            extra_env_vars  = {
                'PCI_DSS_MODE': 'true',
                'AUDIT_LOG_LEVEL': 'verbose',
                'SESSION_TIMEOUT_SEC': '900',
            },
            monitoring_rules = [
                {'name': 'HTTP p95 > 300ms',         'threshold': '300ms',  'severity': 'warning'},
                {'name': 'Error rate > 0.5%',         'threshold': '0.5%',   'severity': 'critical'},
                {'name': 'Failed auth attempts > 10/min', 'threshold': '10',  'severity': 'critical'},
            ],
            security_rules   = [
                'Enforce mTLS between all services',
                'Enable PCI-DSS compliance mode',
                'Set audit log retention to 14 days',
                'Restrict egress to allowlist only',
                'Enable WAF on API Gateway',
            ],
            suggestions = [
                'Enable PCI-DSS compliance mode',
                'Enforce mTLS between services',
                'Set up 14-day audit log retention',
            ],
        )

    # AI / ML / Research
    if app_type in ('ai', 'research') or matches(_AI_KEYWORDS):
        return DescriptionProfile(
            profile_name    = 'ai_research',
            security_level  = 'medium',
            min_replicas    = 1,
            max_replicas    = 6,
            cpu_threshold   = 75,
            extra_env_vars  = {
                'WORKER_CONCURRENCY': '4',
                'MEMORY_LIMIT': '32Gi',
            },
            monitoring_rules = [
                {'name': 'GPU utilisation > 90%', 'threshold': '90%',  'severity': 'warning'},
                {'name': 'OOM kills > 0',          'threshold': '0',    'severity': 'critical'},
                {'name': 'Task queue depth > 100', 'threshold': '100',  'severity': 'warning'},
            ],
            security_rules   = [
                'Isolate GPU worker pods in dedicated node pool',
                'Enable network policy to restrict inter-pod traffic',
            ],
            suggestions = [
                'Provision GPU-enabled worker nodes',
                'Configure large memory limits (32Gi)',
                'Enable distributed task queue (Celery + Redis)',
            ],
        )

    # News / Media
    if app_type == 'news' or matches(_MEDIA_KEYWORDS):
        return DescriptionProfile(
            profile_name    = 'media',
            security_level  = 'medium',
            min_replicas    = 2,
            max_replicas    = 30,
            cpu_threshold   = 60,
            extra_env_vars  = {
                'CDN_ENABLED': 'true',
                'MEDIA_UPLOAD_BUCKET': f'media-{datetime.now().year}',
            },
            monitoring_rules = [
                {'name': 'Throughput drop > 20%',   'threshold': '20%',    'severity': 'warning'},
                {'name': 'CDN cache hit < 70%',      'threshold': '< 70%',  'severity': 'warning'},
                {'name': 'Upload queue depth > 500', 'threshold': '500',    'severity': 'warning'},
            ],
            security_rules   = [
                'Enable CDN with signed URLs for private media',
                'Enforce content-type validation on uploads',
            ],
            suggestions = [
                'Enable CDN edge caching',
                'Auto-scale on traffic spikes > 1k req/s',
                'Add media upload queue (S3-compatible)',
            ],
        )

    # Social
    if app_type == 'social' or matches(_SOCIAL_KEYWORDS):
        return DescriptionProfile(
            profile_name    = 'social',
            security_level  = 'medium',
            min_replicas    = 2,
            max_replicas    = 20,
            cpu_threshold   = 65,
            extra_env_vars  = {'RATE_LIMIT_RPM': '500'},
            monitoring_rules = [
                {'name': 'WebSocket connections > 10k', 'threshold': '10000', 'severity': 'warning'},
                {'name': 'Message queue depth > 1k',    'threshold': '1000',  'severity': 'warning'},
            ],
            security_rules   = [
                'Enable rate limiting on all user-facing endpoints',
                'Enable CSRF protection',
            ],
            suggestions = [
                'Set up horizontal pod autoscaler (min:2 max:20)',
                'Enable Redis pub/sub for real-time messaging',
                'Configure daily database backups',
            ],
        )

    # E-Commerce
    if app_type == 'ecommerce' or matches(_ECOMMERCE_KEYWORDS):
        return DescriptionProfile(
            profile_name    = 'ecommerce',
            security_level  = 'high',
            min_replicas    = 2,
            max_replicas    = 15,
            cpu_threshold   = 60,
            extra_env_vars  = {'PAYMENT_GATEWAY': 'stripe', 'SESSION_SECURE': 'true'},
            monitoring_rules = [
                {'name': 'Checkout error rate > 0.1%', 'threshold': '0.1%', 'severity': 'critical'},
                {'name': 'Cart abandonment spike > 30%','threshold': '30%',  'severity': 'warning'},
            ],
            security_rules   = [
                'Enable TLS 1.3 on all endpoints',
                'Enforce SameSite=Strict on cookies',
                'Enable fraud detection webhook',
            ],
            suggestions = [
                'Enable TLS 1.3 + strict cookie policy',
                'Auto-scale on cart/checkout spike',
                'Configure daily database backups',
            ],
        )

    # Default / Technology
    return DescriptionProfile(
        profile_name    = 'technology',
        security_level  = 'medium',
        min_replicas    = 2,
        max_replicas    = 10,
        cpu_threshold   = 65,
        extra_env_vars  = {},
        monitoring_rules = [
            {'name': 'HTTP p95 > 800ms',  'threshold': '800ms', 'severity': 'warning'},
            {'name': 'Error rate > 2%',   'threshold': '2%',    'severity': 'critical'},
        ],
        security_rules   = [
            'Enable HTTPS redirect',
            'Enable security headers (X-Frame-Options, CSP)',
        ],
        suggestions = [
            'Set up horizontal pod autoscaler (min:2 max:10)',
            'Enable Prometheus + Grafana monitoring',
            'Configure daily database backups',
        ],
    )


# ─────────────────────────────────────────────────────────────────────────────
# 2.  TEMPLATE ENGINE
# Picks the closest matching DeploymentTemplate from the DB —
# falls back to a synthetic default when no exact match exists.
# ─────────────────────────────────────────────────────────────────────────────

class TemplateEngine:

    @staticmethod
    def match(request: DeploymentRequest) -> Optional[DeploymentTemplate]:
        """
        Try to find the best-matching template.
        Priority:  exact 4-way match → loose partial match → None (caller builds synthetic)
        """
        qs = DeploymentTemplate.objects.filter(is_active=True)

        # 1. Exact match
        exact = qs.filter(
            frontend=request.frontend,
            backend=request.backend,
            database=request.database,
            deploy_mode=request.deploy_mode,
        ).first()
        if exact:
            return exact

        # 2. Match on backend + deploy_mode (most significant for runtime)
        partial = qs.filter(
            backend=request.backend,
            deploy_mode=request.deploy_mode,
        ).first()
        if partial:
            return partial

        # 3. Match on deploy_mode only
        return qs.filter(deploy_mode=request.deploy_mode).first()

    @staticmethod
    def build_synthetic(request: DeploymentRequest) -> DeploymentTemplate:
        """
        Construct an in-memory (unsaved) template when no DB match exists.
        Derives runtime image, build commands, etc. from the request's stack choices.
        """
        tpl = DeploymentTemplate()
        tpl.frontend    = request.frontend
        tpl.backend     = request.backend
        tpl.database    = request.database
        tpl.deploy_mode = request.deploy_mode
        tpl.app_port    = 8000

        # Runtime image
        image_map = {
            'nodejs':         'node:20-alpine',
            'python_django':  'python:3.12-slim',
            'python_fastapi': 'python:3.12-slim',
            'python_flask':   'python:3.12-slim',
            'php_laravel':    'php:8.2-fpm-alpine',
            'java_spring':    'eclipse-temurin:21-jre-alpine',
            'go':             'golang:1.22-alpine',
            'ruby_rails':     'ruby:3.3-alpine',
            'dotnet':         'mcr.microsoft.com/dotnet/aspnet:8.0-alpine',
            'rust':           'rust:1.76-alpine',
        }
        tpl.runtime_image = image_map.get(request.backend, 'node:20-alpine')

        # Install + build commands
        if request.backend in ('nodejs',):
            tpl.install_command = 'npm ci'
            tpl.build_commands  = ['npm run build']
            tpl.start_command   = 'node server.js'
        elif request.backend in ('python_django', 'python_fastapi', 'python_flask'):
            tpl.install_command = 'pip install -r requirements.txt'
            tpl.build_commands  = ['python manage.py collectstatic --noinput']
            tpl.start_command   = 'gunicorn config.wsgi:application --bind 0.0.0.0:8000'
        elif request.backend == 'go':
            tpl.install_command = 'go mod download'
            tpl.build_commands  = ['go build -o /app/server ./cmd']
            tpl.start_command   = '/app/server'
        elif request.backend == 'java_spring':
            tpl.install_command = './mvnw dependency:resolve'
            tpl.build_commands  = ['./mvnw package -DskipTests']
            tpl.start_command   = 'java -jar target/app.jar'
        elif request.backend == 'ruby_rails':
            tpl.install_command = 'bundle install'
            tpl.build_commands  = ['bundle exec rake assets:precompile']
            tpl.start_command   = 'bundle exec puma -C config/puma.rb'
        elif request.backend == 'rust':
            tpl.install_command = ''
            tpl.build_commands  = ['cargo build --release']
            tpl.start_command   = './target/release/app'
        else:
            tpl.install_command = ''
            tpl.build_commands  = []
            tpl.start_command   = ''

        # Add frontend build if needed
        if request.frontend not in ('none', 'static_html'):
            tpl.build_commands = ['npm ci && npm run build'] + tpl.build_commands

        # Scaling defaults
        tpl.default_replicas = 2
        tpl.min_replicas     = 1
        tpl.max_replicas     = 10
        tpl.cpu_threshold_pct= 65

        tpl.default_env_vars = {}
        return tpl


# ─────────────────────────────────────────────────────────────────────────────
# 3.  PLAN GENERATOR
# Combines template + description profile to produce a DeploymentPlan.
# ─────────────────────────────────────────────────────────────────────────────

class PlanGenerator:

    @staticmethod
    def generate(request: DeploymentRequest) -> DeploymentPlan:
        """
        Main entry point:
        1. Analyse description → DescriptionProfile
        2. Match/build template → DeploymentTemplate
        3. Assemble plan artefacts
        4. Save & return DeploymentPlan
        """
        # Delete any stale plan
        DeploymentPlan.objects.filter(request=request).delete()

        profile  = analyse_description(request.description, request.app_type)
        template = TemplateEngine.match(request) or TemplateEngine.build_synthetic(request)

        # Save the chosen template reference
        if template.pk:
            request.template = template
            request.status   = 'planned'
            request.save(update_fields=['template', 'status'])

        app  = request.app_name
        repo = request.git_repo or f'github.com/org/{app}'
        port = template.app_port

        # ── Build steps ──────────────────────────────────────────────────────
        build_steps = [
            f'git clone {repo} && git checkout {request.git_branch}',
            template.install_command,
            *template.build_commands,
            f'docker build -t registry.orcacloud.io/{app}:latest .',
            f'docker push registry.orcacloud.io/{app}:latest',
        ]
        build_steps = [s for s in build_steps if s]  # remove empty

        # ── Deploy steps ─────────────────────────────────────────────────────
        if request.deploy_mode == 'kubernetes':
            deploy_steps = [
                f'kubectl apply -f k8s/namespace.yaml',
                f'kubectl apply -f k8s/secrets.yaml',
                f'kubectl apply -f k8s/deployment.yaml',
                f'kubectl apply -f k8s/service.yaml',
                f'kubectl apply -f k8s/ingress.yaml',
                f'kubectl rollout status deployment/{app}',
            ]
        else:
            deploy_steps = [
                f'docker pull registry.orcacloud.io/{app}:latest',
                f'docker stop {app} || true',
                f'docker run -d --name {app} --env-file .env -p {port}:{port}'
                f' registry.orcacloud.io/{app}:latest',
            ]

        # ── Environment variables ─────────────────────────────────────────────
        env_vars = {
            **template.default_env_vars,
            **profile.extra_env_vars,
            'NODE_ENV':   'production',
            'API_PORT':   str(port),
        }
        if request.database == 'postgresql':
            env_vars['DATABASE_URL'] = f'postgres://orcacloud:***@orcacloud-pg.internal:5432/{app}'
        elif request.database == 'mysql':
            env_vars['DATABASE_URL'] = f'mysql://orcacloud:***@orcacloud-mysql.internal:3306/{app}'
        elif request.database == 'mongodb':
            env_vars['MONGODB_URI']  = f'mongodb://orcacloud:***@orcacloud-mongo.internal:27017/{app}'
        elif request.database == 'redis':
            env_vars['REDIS_URL']    = 'redis://orcacloud-redis.internal:6379'

        if request.frontend == 'nextjs':
            env_vars['NEXT_PUBLIC_API_URL'] = 'https://api.orcacloud.app'

        secrets = {'SECRET_KEY': '<auto-generated>', 'DB_PASSWORD': '<auto-generated>'}

        # ── Infra resources ───────────────────────────────────────────────────
        infra_resources = []
        if request.database not in ('none', 'sqlite'):
            infra_resources.append({
                'type': 'database',
                'engine': request.database,
                'name': f'{app}-db',
                'tier': 'standard',
            })
        if request.deploy_mode == 'kubernetes':
            infra_resources += [
                {'type': 'k8s_namespace',  'name': app},
                {'type': 'k8s_deployment', 'name': app, 'replicas': profile.min_replicas},
                {'type': 'k8s_service',    'name': f'{app}-svc'},
                {'type': 'k8s_ingress',    'name': f'{app}-ingress', 'hostname': f'{app}.orcacloud.app'},
                {'type': 'k8s_hpa',        'name': f'{app}-hpa',
                 'min_replicas': profile.min_replicas, 'max_replicas': profile.max_replicas,
                 'cpu_threshold': profile.cpu_threshold},
            ]
        else:
            infra_resources.append({'type': 'container', 'name': app, 'image': f'registry.orcacloud.io/{app}:latest'})

        # ── Monitoring rules ──────────────────────────────────────────────────
        monitoring_rules = [
            {'name': f'Health check: GET {template.health_check_path} → 200', 'interval_sec': 10, 'severity': 'critical'},
            *profile.monitoring_rules,
            {'name': 'Deployment failed alert',    'event': 'deploy.failed',  'severity': 'critical'},
            {'name': 'Rollback triggered alert',   'event': 'deploy.rollback','severity': 'warning'},
        ]

        # ── Scaling rules ─────────────────────────────────────────────────────
        scaling_rules = {
            'min_replicas':     profile.min_replicas,
            'max_replicas':     profile.max_replicas,
            'cpu_threshold':    profile.cpu_threshold,
            'scale_up_cooldown_sec': 60,
            'scale_down_cooldown_sec': 180,
        }

        # ── Rollback strategy ─────────────────────────────────────────────────
        rollback_strategy = {
            'mode': 'automatic',
            'trigger': 'health_check_fail',
            'window_sec': 90,
            'previous_image_retention_days': 7,
            'k8s_command': f'kubectl rollout undo deployment/{app}' if request.deploy_mode == 'kubernetes'
                           else f'docker stop {app} && docker start {app}-prev',
        }

        # ── CI/CD pipeline definition ─────────────────────────────────────────
        ci_pipeline_def = {
            'name':    f'{app}-ci',
            'trigger': {'push_branches': [request.git_branch], 'tags': True},
            'stages':  ['install', 'test', 'build', 'container', 'deploy_dev', 'deploy_stage', 'deploy_prod'],
            'jobs': [
                {'stage': 'install',       'script': template.install_command},
                {'stage': 'test',          'script': 'npm test || true'},
                {'stage': 'build',         'script': ' && '.join(template.build_commands) or 'echo "no build step"'},
                {'stage': 'container',     'script': f'docker build -t registry.orcacloud.io/{app}:$CI_COMMIT_SHA .'},
                {'stage': 'deploy_dev',    'script': f'kubectl set image deployment/{app} {app}=registry.orcacloud.io/{app}:$CI_COMMIT_SHA -n {app}-dev', 'environment': 'dev'},
                {'stage': 'deploy_stage',  'script': f'kubectl set image deployment/{app} {app}=registry.orcacloud.io/{app}:$CI_COMMIT_SHA -n {app}-stage', 'environment': 'stage', 'when': 'manual'},
                {'stage': 'deploy_prod',   'script': f'kubectl set image deployment/{app} {app}=registry.orcacloud.io/{app}:$CI_COMMIT_SHA -n {app}-prod',  'environment': 'prod',  'when': 'manual'},
            ],
        }

        # ── Dockerfile ────────────────────────────────────────────────────────
        dockerfile = _build_dockerfile(template, app)

        # ── Kubernetes manifests ──────────────────────────────────────────────
        k8s_manifests: dict = {}
        if request.deploy_mode == 'kubernetes':
            k8s_manifests = _build_k8s_manifests(app, template, profile)

        # ── Security posture ──────────────────────────────────────────────────
        security_posture = {
            'level':  profile.security_level,
            'rules':  profile.security_rules,
            'profile': profile.profile_name,
        }

        app_url = f'https://{app}.orcacloud.app'

        plan = DeploymentPlan.objects.create(
            request            = request,
            build_steps        = build_steps,
            deploy_steps       = deploy_steps,
            env_vars           = env_vars,
            secrets            = secrets,
            infra_resources    = infra_resources,
            monitoring_rules   = monitoring_rules,
            scaling_rules      = scaling_rules,
            rollback_strategy  = rollback_strategy,
            ci_pipeline_def    = ci_pipeline_def,
            security_posture   = security_posture,
            dockerfile         = dockerfile,
            k8s_manifests      = k8s_manifests,
            app_url            = app_url,
        )
        return plan


# ─── Dockerfile builder ─────────────────────────────────────────────────────

def _build_dockerfile(tpl: DeploymentTemplate, app_name: str) -> str:
    """Generate a multi-stage Dockerfile string from a template."""
    build_cmd = ' && '.join(tpl.build_commands) if tpl.build_commands else 'echo "no build"'
    return textwrap.dedent(f"""\
        FROM {tpl.runtime_image} AS build
        WORKDIR /app
        COPY . .
        RUN {tpl.install_command or 'echo skip'} && {build_cmd}

        FROM {tpl.runtime_image}
        WORKDIR /app
        COPY --from=build /app /app
        EXPOSE {tpl.app_port}
        CMD ["{tpl.start_command.split()[0]}", {', '.join(f'"{w}"' for w in tpl.start_command.split()[1:])}]
    """)


# ─── Kubernetes manifest builder ─────────────────────────────────────────────

def _build_k8s_manifests(app: str, tpl: DeploymentTemplate, profile: DescriptionProfile) -> dict:
    deployment_yaml = textwrap.dedent(f"""\
        apiVersion: apps/v1
        kind: Deployment
        metadata:
          name: {app}
          namespace: {app}
        spec:
          replicas: {profile.min_replicas}
          selector:
            matchLabels:
              app: {app}
          template:
            metadata:
              labels:
                app: {app}
            spec:
              containers:
              - name: {app}
                image: registry.orcacloud.io/{app}:latest
                ports:
                - containerPort: {tpl.app_port}
                envFrom:
                - secretRef:
                    name: {app}-secrets
                readinessProbe:
                  httpGet:
                    path: {tpl.health_check_path}
                    port: {tpl.health_check_port}
                  initialDelaySeconds: {tpl.readiness_delay_sec}
                  periodSeconds: 10
                resources:
                  requests:
                    cpu: "{tpl.cpu_request}"
                    memory: "{tpl.memory_request}"
                  limits:
                    cpu: "{tpl.cpu_limit}"
                    memory: "{tpl.memory_limit}"
    """)

    service_yaml = textwrap.dedent(f"""\
        apiVersion: v1
        kind: Service
        metadata:
          name: {app}-svc
          namespace: {app}
        spec:
          selector:
            app: {app}
          ports:
          - port: 80
            targetPort: {tpl.app_port}
          type: ClusterIP
    """)

    ingress_yaml = textwrap.dedent(f"""\
        apiVersion: networking.k8s.io/v1
        kind: Ingress
        metadata:
          name: {app}-ingress
          namespace: {app}
          annotations:
            nginx.ingress.kubernetes.io/ssl-redirect: "true"
        spec:
          rules:
          - host: {app}.orcacloud.app
            http:
              paths:
              - path: /
                pathType: Prefix
                backend:
                  service:
                    name: {app}-svc
                    port:
                      number: 80
          tls:
          - hosts:
            - {app}.orcacloud.app
            secretName: {app}-tls
    """)

    hpa_yaml = textwrap.dedent(f"""\
        apiVersion: autoscaling/v2
        kind: HorizontalPodAutoscaler
        metadata:
          name: {app}-hpa
          namespace: {app}
        spec:
          scaleTargetRef:
            apiVersion: apps/v1
            kind: Deployment
            name: {app}
          minReplicas: {profile.min_replicas}
          maxReplicas: {profile.max_replicas}
          metrics:
          - type: Resource
            resource:
              name: cpu
              target:
                type: Utilization
                averageUtilization: {profile.cpu_threshold}
    """)

    return {
        'deployment': deployment_yaml,
        'service':    service_yaml,
        'ingress':    ingress_yaml,
        'hpa':        hpa_yaml,
    }


# ─────────────────────────────────────────────────────────────────────────────
# 4.  PERMISSION CHECKER
# ─────────────────────────────────────────────────────────────────────────────

class PermissionError(Exception):
    pass


class PermissionChecker:

    @staticmethod
    def check_can_create_request(user: User, group_id: str = '', project_id: str = '') -> None:
        """Any authenticated user can create a deploy request for their own projects."""
        if not user.is_authenticated:
            raise PermissionError('Authentication required.')

    @staticmethod
    def check_can_confirm(user: User, request: DeploymentRequest) -> None:
        """Only the owner (or staff) can confirm & start deployment."""
        if request.owner_id != user.id and not user.is_staff:
            raise PermissionError('Only the request owner can confirm deployment.')

    @staticmethod
    def check_can_deploy_to_prod(user: User) -> None:
        """
        Enforce: only Maintainer / Admin / Staff can trigger prod deployments.
        Extend this to Group role checks once Group FK is wired.
        """
        if not user.is_staff:
            raise PermissionError(
                'Deploying to production requires Maintainer or Admin privileges.'
            )

    @staticmethod
    def check_can_rollback(user: User, execution: DeploymentExecution) -> None:
        """Owner or staff can trigger a rollback."""
        if execution.request.owner_id != user.id and not user.is_staff:
            raise PermissionError('Only the deployment owner can trigger a rollback.')


# ─────────────────────────────────────────────────────────────────────────────
# 5.  AUDIT LOGGER
# ─────────────────────────────────────────────────────────────────────────────

class AuditLogger:

    @staticmethod
    def log(
        user: Optional[User],
        action: str,
        detail: dict,
        request_obj: Optional[DeploymentRequest] = None,
        execution: Optional[DeploymentExecution] = None,
        ip_address: Optional[str] = None,
    ) -> DeploymentAuditLog:
        return DeploymentAuditLog.objects.create(
            user       = user,
            action     = action,
            detail     = detail,
            request    = request_obj,
            execution  = execution,
            ip_address = ip_address,
        )

    @staticmethod
    def get_ip(http_request) -> Optional[str]:
        """Extract real IP from Django HttpRequest."""
        xff = http_request.META.get('HTTP_X_FORWARDED_FOR')
        if xff:
            return xff.split(',')[0].strip()
        return http_request.META.get('REMOTE_ADDR')


# ─────────────────────────────────────────────────────────────────────────────
# 6.  EXECUTION RUNNER  (simulation — real impl calls external subsystems)
# ─────────────────────────────────────────────────────────────────────────────

import threading


def simulate_execution(execution_id: str) -> None:
    """
    Background thread that simulates deployment progression.
    In production replace each stage with real calls to:
      - CI/CD subsystem (create pipeline + trigger run)
      - DB provisioning service
      - Container registry
      - Kubernetes API / manifest apply
      - Resource Control register()
    """
    import time

    try:
        exe = DeploymentExecution.objects.get(pk=execution_id)
    except DeploymentExecution.DoesNotExist:
        return

    def append_log(text: str, log_type: str = 'info'):
        exe.refresh_from_db()
        exe.log_lines = exe.log_lines + [{'text': text, 'type': log_type, 'at': dj_tz.now().isoformat()}]
        exe.save(update_fields=['log_lines'])

    plan    = exe.plan
    request = plan.request
    app     = request.app_name

    stages = [
        (0.5,  'info',    f'[CI/CD]    Pipeline created — {app}-ci'),
        (1.0,  'info',    f'[GIT]      Cloning {request.git_repo} ({request.git_branch})'),
        (1.5,  'success', f'[GIT]      Clone complete'),
        (0.8,  'info',    f'[ENV]      Injecting {len(plan.env_vars)} environment variables'),
        (0.5,  'success', f'[ENV]      Variables injected'),
        (0.8,  'info',    f'[BUILD]    Detecting stack: {request.frontend} + {request.backend}'),
        (1.2,  'info',    f'[BUILD]    Installing dependencies…'),
        (1.5,  'info',    f'[BUILD]    Building application…'),
        (0.5,  'success', f'[BUILD]    Build complete'),
        (0.8,  'info',    f'[DOCKER]   Building container image…'),
        (1.0,  'success', f'[DOCKER]   Image: registry.orcacloud.io/{app}:latest'),
        (0.8,  'info',    f'[REGISTRY] Pushing image…'),
        (0.8,  'success', f'[REGISTRY] Push complete'),
    ]

    if request.database not in ('none', 'sqlite'):
        stages += [
            (0.8,  'info',    f'[DB]       Provisioning {request.database} instance…'),
            (1.0,  'success', f'[DB]       Instance ready — {app}-db.internal'),
        ]

    if request.deploy_mode == 'kubernetes':
        stages += [
            (0.5,  'info',    f'[K8S]      Applying manifests (deployment, service, ingress)…'),
            (1.5,  'success', f'[K8S]      Pods running — health checks passing'),
        ]
    else:
        stages += [
            (0.5,  'info',    f'[CONTAINER] Deploying container…'),
            (1.0,  'success', f'[CONTAINER] Container running — health check OK'),
        ]

    stages += [
        (0.5,  'info',    f'[MONITOR]  Monitoring rules activated'),
        (0.5,  'info',    f'[AUDIT]    Deployment event recorded in Audit Logs'),
        (0.3,  'success', f'[DONE]     {app} is live → https://{app}.orcacloud.app'),
    ]

    exe.status = 'running'
    exe.started_at = dj_tz.now()
    exe.save(update_fields=['status', 'started_at'])

    for delay, log_type, text in stages:
        time.sleep(delay)
        append_log(text, log_type)

    exe.refresh_from_db()
    exe.status       = 'succeeded'
    exe.finished_at  = dj_tz.now()
    exe.health_status= 'healthy'
    exe.app_hostname = f'{app}.orcacloud.app'
    exe.app_url      = f'https://{app}.orcacloud.app'
    exe.created_resources = plan.infra_resources
    exe.save(update_fields=[
        'status', 'finished_at', 'health_status',
        'app_hostname', 'app_url', 'created_resources',
    ])

    # Update request status
    request.status = 'done'
    request.save(update_fields=['status'])


def start_execution(execution: DeploymentExecution) -> None:
    """Kick off the deployment in a background thread."""
    t = threading.Thread(target=simulate_execution, args=(execution.pk,), daemon=True)
    t.start()
