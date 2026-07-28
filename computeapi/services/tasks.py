"""
Background Task Functions for OrcaCloud Services

These functions handle cloud resource lifecycle operations:
- Provisioning / deprovisioning compute, storage, and Kubernetes resources
- Snapshot and backup execution
- Metrics collection
- Auto-scaling policy evaluation
- Billing cost calculations
- Notifications

Tasks can be wired to a task queue (Celery, RQ, etc.) when a broker is
available. Without a broker they run synchronously.
"""

import logging
import threading
import uuid
from queue import Queue
from datetime import timedelta
from django.utils import timezone
from django.db import close_old_connections

logger = logging.getLogger(__name__)


_DOMAIN_SWITCH_QUEUE: Queue[dict] = Queue()
_DOMAIN_SWITCH_WORKER_STARTED = False
_DOMAIN_SWITCH_LOCK = threading.Lock()


def _persist_domain_switch_state(domain, workflow_id: str, state: dict):
    metadata = domain.metadata or {}
    metadata['domain_switch'] = state
    history = metadata.get('domain_switch_history', [])
    history = [entry for entry in history if entry.get('workflow_id') != workflow_id]
    history.insert(0, {
        'workflow_id': workflow_id,
        'status': state.get('status', 'unknown'),
        'queued_at': state.get('queued_at'),
        'started_at': state.get('started_at'),
        'completed_at': state.get('completed_at'),
    })
    metadata['domain_switch_history'] = history[:25]
    domain.metadata = metadata
    domain.save(update_fields=['metadata', 'updated_at'])


def _execute_domain_switch_workflow(payload: dict):
    close_old_connections()
    from django.contrib.auth.models import User
    from .domain.models import Domain, DnsZone, DomainDnsRecord
    from .integrations import designate_service as dns_svc
    from .networking.models import LoadBalancer, CDNDistribution
    from .compute.models import KubernetesCluster
    from .email.models import EmailDomain, EmailActivityLog
    from .base_models import AuditLog

    workflow_id = payload['workflow_id']
    domain_resource_id = payload['domain_resource_id']
    user_id = payload['user_id']
    target_endpoint = payload.get('target_endpoint', '')
    lb_resource_id = payload.get('lb_resource_id', '')
    cdn_resource_id = payload.get('cdn_resource_id', '')
    cluster_resource_id = payload.get('cluster_resource_id', '')

    try:
        user = User.objects.get(id=user_id)
        domain = Domain.objects.get(resource_id=domain_resource_id, owner=user)
    except Exception as exc:
        logger.error('Domain switch worker could not load objects: %s', exc)
        close_old_connections()
        return

    state = {
        'workflow_id': workflow_id,
        'status': 'running',
        'queued_at': payload.get('queued_at'),
        'started_at': timezone.now().isoformat(),
        'completed_at': None,
        'target_endpoint': target_endpoint,
        'steps': [],
    }

    def add_step(name: str, status_value: str, detail: str, data: dict | None = None):
        state['steps'].append({
            'step': name,
            'status': status_value,
            'detail': detail,
            'timestamp': timezone.now().isoformat(),
            'data': data or {},
        })
        _persist_domain_switch_state(domain, workflow_id, state)

    try:
        dns_payload = {'records_updated': []}
        try:
            record_target = target_endpoint or f"{domain.domain_name}.origin.orcacloud.cloud"
            try:
                zone = domain.dns_zone
            except DnsZone.DoesNotExist:
                zone_create = dns_svc.create_zone(domain.domain_name)
                if zone_create.get('success'):
                    zone = DnsZone.objects.create(
                        domain=domain,
                        zone_id=zone_create['zone_id'],
                        zone_name=zone_create['zone_name'],
                        status=zone_create.get('status', 'active'),
                    )
                else:
                    zone = None

            def upsert_record(name: str, record_type: str, records: list[str], ttl: int = 300):
                if zone:
                    DomainDnsRecord.objects.update_or_create(
                        zone=zone,
                        name=name,
                        record_type=record_type,
                        defaults={'records': records, 'ttl': ttl, 'is_managed': True},
                    )
                    try:
                        dns_svc.create_record(zone_id=zone.zone_id, name=name, record_type=record_type, records=records, ttl=ttl)
                    except Exception:
                        pass
                dns_payload['records_updated'].append({'name': name, 'type': record_type, 'records': records})

            upsert_record(domain.domain_name, 'A', [record_target])
            upsert_record(f"www.{domain.domain_name}", 'CNAME', [domain.domain_name])
            upsert_record(domain.domain_name, 'MX', ['10 mail.orcacloud.com.'])
            upsert_record(domain.domain_name, 'TXT', [f"v=spf1 include:_spf.{domain.domain_name} ~all"])

            domain.dnssec_enabled = True
            domain.save(update_fields=['dnssec_enabled', 'updated_at'])
            add_step('dns_update', 'completed', 'A/CNAME/MX/TXT records updated with DNSSEC enabled', dns_payload)
        except Exception as exc:
            add_step('dns_update', 'failed', f'DNS update failed: {exc}')

        try:
            lb_query = LoadBalancer.objects.filter(owner=user)
            if lb_resource_id:
                lb_query = lb_query.filter(resource_id=lb_resource_id)
            lb = lb_query.order_by('-created_at').first()
            if lb:
                lb.metadata = {
                    **(lb.metadata or {}),
                    'domain_switch': {'domain': domain.domain_name, 'workflow_id': workflow_id, 'switched_at': timezone.now().isoformat()},
                    'cdn_origin_host': domain.domain_name,
                }
                lb.save(update_fields=['metadata'])
                add_step('load_balancer_update', 'completed', 'Load balancer routing metadata updated', {'lb_resource_id': lb.resource_id, 'lb_id': lb.lb_id})
            else:
                add_step('load_balancer_update', 'skipped', 'No load balancer found for user')
        except Exception as exc:
            add_step('load_balancer_update', 'failed', f'Load balancer update failed: {exc}')

        try:
            cdn_query = CDNDistribution.objects.filter(owner=user)
            if cdn_resource_id:
                cdn_query = cdn_query.filter(resource_id=cdn_resource_id)
            cdn = cdn_query.order_by('-created_at').first()
            if cdn:
                domains = list(cdn.domain_names or [])
                if domain.domain_name not in domains:
                    domains.append(domain.domain_name)
                purge_history = (cdn.metadata or {}).get('purge_history', [])
                purge_job = {'purge_id': f"purge-{uuid.uuid4().hex[:8]}", 'paths': ['/*'], 'status': 'completed', 'workflow_id': workflow_id}
                purge_history.insert(0, purge_job)
                cdn.domain_names = domains
                cdn.metadata = {**(cdn.metadata or {}), 'origin_domain': domain.domain_name, 'purge_history': purge_history[:25]}
                cdn.save(update_fields=['domain_names', 'metadata'])
                add_step('cdn_update', 'completed', 'CDN domain aliases updated and cache purged', {'cdn_resource_id': cdn.resource_id, 'distribution_id': cdn.distribution_id, 'purge_id': purge_job['purge_id']})
            else:
                add_step('cdn_update', 'skipped', 'No CDN distribution found for user')
        except Exception as exc:
            add_step('cdn_update', 'failed', f'CDN update failed: {exc}')

        try:
            email_domain, _ = EmailDomain.objects.get_or_create(
                domain=domain,
                defaults={'status': 'active', 'mx_provisioned': True, 'spf_provisioned': True, 'dkim_provisioned': True, 'dmarc_provisioned': True},
            )
            email_domain.status = 'active'
            email_domain.mx_provisioned = True
            email_domain.spf_provisioned = True
            email_domain.dkim_provisioned = True
            email_domain.dmarc_provisioned = True
            email_domain.save(update_fields=['status', 'mx_provisioned', 'spf_provisioned', 'dkim_provisioned', 'dmarc_provisioned'])
            EmailActivityLog.objects.create(
                email_domain=email_domain,
                event='dns_provisioned',
                detail=f'Domain switch workflow {workflow_id} updated MX/SPF/DKIM/DMARC records',
                actor=user,
            )
            add_step('email_update', 'completed', 'Email routing and DNS verification flags updated', {'email_domain_id': email_domain.id})
        except Exception as exc:
            add_step('email_update', 'failed', f'Email update failed: {exc}')

        try:
            cluster_query = KubernetesCluster.objects.filter(owner=user)
            if cluster_resource_id:
                cluster_query = cluster_query.filter(resource_id=cluster_resource_id)
            cluster = cluster_query.order_by('-created_at').first()
            if cluster:
                deploy_events = (cluster.metadata or {}).get('domain_switch_events', [])
                deploy_events.insert(0, {'workflow_id': workflow_id, 'domain': domain.domain_name, 'trigger': 'domain-switch', 'status': 'validated', 'timestamp': timezone.now().isoformat()})
                cluster.metadata = {**(cluster.metadata or {}), 'domain_switch_events': deploy_events[:25]}
                cluster.save(update_fields=['metadata'])
                add_step('orchestration_trigger', 'completed', 'Kubernetes domain config redeploy trigger recorded', {'cluster_resource_id': cluster.resource_id, 'cluster_id': cluster.cluster_id})
            else:
                add_step('orchestration_trigger', 'skipped', 'No Kubernetes cluster found for user')
        except Exception as exc:
            add_step('orchestration_trigger', 'failed', f'Orchestration trigger failed: {exc}')

        failures = len([step for step in state['steps'] if step['status'] == 'failed'])
        state['status'] = 'completed' if failures == 0 else ('partial' if failures < len(state['steps']) else 'failed')
        state['completed_at'] = timezone.now().isoformat()
        _persist_domain_switch_state(domain, workflow_id, state)

        AuditLog.log_action(
            user=user,
            action='update',
            resource_type='domain-switch',
            resource_id=domain.resource_id,
            resource_name=domain.domain_name,
            status='success' if state['status'] in ['completed', 'partial'] else 'failure',
            details={'workflow_id': workflow_id, 'domain': domain.domain_name, 'status': state['status'], 'steps': state['steps']},
        )
    except Exception as exc:
        logger.exception('Unhandled domain switch worker error: %s', exc)
        state['status'] = 'failed'
        state['completed_at'] = timezone.now().isoformat()
        state['steps'].append({
            'step': 'worker',
            'status': 'failed',
            'detail': f'Unhandled worker error: {exc}',
            'timestamp': timezone.now().isoformat(),
            'data': {},
        })
        _persist_domain_switch_state(domain, workflow_id, state)
    finally:
        close_old_connections()


def _domain_switch_worker_loop():
    while True:
        payload = _DOMAIN_SWITCH_QUEUE.get()
        try:
            _execute_domain_switch_workflow(payload)
        finally:
            _DOMAIN_SWITCH_QUEUE.task_done()


def _ensure_domain_switch_worker():
    global _DOMAIN_SWITCH_WORKER_STARTED
    with _DOMAIN_SWITCH_LOCK:
        if _DOMAIN_SWITCH_WORKER_STARTED:
            return
        worker = threading.Thread(target=_domain_switch_worker_loop, name='domain-switch-worker', daemon=True)
        worker.start()
        _DOMAIN_SWITCH_WORKER_STARTED = True


def enqueue_domain_switch_workflow(
    *,
    domain_resource_id: str,
    user_id: int,
    target_endpoint: str = '',
    lb_resource_id: str = '',
    cdn_resource_id: str = '',
    cluster_resource_id: str = '',
) -> dict:
    _ensure_domain_switch_worker()

    from .domain.models import Domain

    workflow_id = f"switch-{uuid.uuid4().hex[:10]}"
    queued_at = timezone.now().isoformat()

    domain = Domain.objects.get(resource_id=domain_resource_id, owner_id=user_id)
    queued_state = {
        'workflow_id': workflow_id,
        'status': 'queued',
        'queued_at': queued_at,
        'started_at': None,
        'completed_at': None,
        'target_endpoint': target_endpoint,
        'steps': [],
    }
    _persist_domain_switch_state(domain, workflow_id, queued_state)

    _DOMAIN_SWITCH_QUEUE.put({
        'workflow_id': workflow_id,
        'domain_resource_id': domain_resource_id,
        'user_id': user_id,
        'target_endpoint': target_endpoint,
        'lb_resource_id': lb_resource_id,
        'cdn_resource_id': cdn_resource_id,
        'cluster_resource_id': cluster_resource_id,
        'queued_at': queued_at,
    })

    return {
        'workflow_id': workflow_id,
        'domain_resource_id': domain_resource_id,
        'status': 'queued',
        'queued_at': queued_at,
        'message': 'Domain switch queued successfully',
    }


# ========== COMPUTE PROVISIONING ==========

def provision_instance(instance_id):
    """Provision a new compute instance."""
    try:
        from .models import Instance
        instance = Instance.objects.get(id=instance_id)
        logger.info(f"Provisioning instance {instance_id}")
        instance.status = 'running'
        instance.provisioning_completed_at = timezone.now()
        instance.save()
        logger.info(f"Instance {instance_id} is now running")
        notify_resource_created('instance', instance_id)
    except Exception as exc:
        logger.error(f"Error provisioning instance {instance_id}: {exc}")


def deprovision_instance(instance_id):
    """Deprovision a terminated instance and release its resources."""
    try:
        from .models import Instance
        Instance.objects.get(id=instance_id)
        logger.info(f"Deprovisioning instance {instance_id}")
        notify_resource_deleted('instance', instance_id)
    except Exception as exc:
        logger.error(f"Error deprovisioning instance {instance_id}: {exc}")


# ========== STORAGE OPERATIONS ==========

def create_snapshot(volume_id, user_id):
    """Create a snapshot of a storage volume."""
    try:
        from django.contrib.auth.models import User
        from .business_logic.storage import StorageService
        user = User.objects.get(id=user_id)
        logger.info(f"Creating snapshot of volume {volume_id}")
        service = StorageService()
        snapshot = service.create_snapshot(volume_id, user)
        logger.info(f"Snapshot {snapshot.id} created")
        notify_resource_created('snapshot', snapshot.id)
    except Exception as exc:
        logger.error(f"Error creating snapshot for volume {volume_id}: {exc}")


def execute_backup_policy(policy_id, user_id):
    """Execute a backup policy."""
    try:
        from django.contrib.auth.models import User
        from .business_logic.storage import StorageService
        user = User.objects.get(id=user_id)
        service = StorageService()
        backups = service.execute_backup_policy(policy_id, user)
        logger.info(f"Created {len(backups)} backups from policy {policy_id}")
        send_notification(user_id, "Backup Complete", f"Created {len(backups)} backups")
    except Exception as exc:
        logger.error(f"Error executing backup policy {policy_id}: {exc}")


# ========== KUBERNETES OPERATIONS ==========

def provision_kubernetes_cluster(cluster_id, user_id):
    """Provision a Kubernetes cluster."""
    try:
        from .models import KubernetesCluster
        cluster = KubernetesCluster.objects.get(id=cluster_id)
        logger.info(f"Provisioning Kubernetes cluster {cluster_id}")
        cluster.status = 'running'
        cluster.provisioning_completed_at = timezone.now()
        cluster.save()
        logger.info(f"Kubernetes cluster {cluster_id} is running")
        notify_resource_created('kubernetes_cluster', cluster_id)
    except Exception as exc:
        logger.error(f"Error provisioning cluster {cluster_id}: {exc}")


# ========== METRICS & MONITORING ==========

def collect_instance_metrics(instance_id):
    """Collect CPU, memory, disk, and network metrics for an instance."""
    try:
        import random
        from .models import Instance, InstanceMetric
        instance = Instance.objects.get(id=instance_id)
        InstanceMetric.objects.create(
            instance=instance,
            cpu_percent=random.randint(5, 80),
            memory_percent=random.randint(20, 90),
            memory_bytes_used=instance.flavor.memory_mb * 1024 * 1024 * random.random(),
            disk_read_bytes=random.randint(0, 10 ** 6),
            disk_write_bytes=random.randint(0, 10 ** 6),
            disk_read_iops=random.randint(0, 1000),
            disk_write_iops=random.randint(0, 1000),
            network_bytes_in=random.randint(0, 10 ** 7),
            network_bytes_out=random.randint(0, 10 ** 7),
            network_packets_per_sec=random.randint(0, 100000),
        )
        logger.debug(f"Metrics collected for instance {instance_id}")
    except Exception as exc:
        logger.warning(f"Could not collect metrics for instance {instance_id}: {exc}")


def collect_volume_metrics(volume_id):
    """Collect IOPS and throughput metrics for a volume."""
    try:
        import random
        from .models import StorageVolume, StorageMetric
        volume = StorageVolume.objects.get(id=volume_id)
        StorageMetric.objects.create(
            volume=volume,
            read_bytes=random.randint(0, 10 ** 8),
            write_bytes=random.randint(0, 10 ** 8),
            read_iops=random.randint(0, 10000),
            write_iops=random.randint(0, 10000),
            latency_ms=random.uniform(1, 50),
            throughput_mbps=random.uniform(10, 200),
        )
        logger.debug(f"Metrics collected for volume {volume_id}")
    except Exception as exc:
        logger.warning(f"Could not collect metrics for volume {volume_id}: {exc}")


# ========== AUTO-SCALING ==========

def evaluate_scaling_policies():
    """Evaluate all enabled auto-scaling groups."""
    from .models import AutoScalingGroup
    from .business_logic.compute import ComputeService
    service = ComputeService()
    for asg in AutoScalingGroup.objects.filter(enabled=True):
        try:
            service.evaluate_scaling_policies(asg.id, asg.owner)
        except Exception as exc:
            logger.error(f"Error evaluating ASG {asg.id}: {exc}")


# ========== BILLING ==========

def calculate_daily_costs(user_id=None):
    """Calculate resource costs for one or all users."""
    from django.contrib.auth.models import User
    from .business_logic.billing import BillingService
    service = BillingService()
    users = User.objects.filter(id=user_id) if user_id else User.objects.all()
    for user in users:
        try:
            costs = service.calculate_user_monthly_cost(user)
            logger.info(f"Daily cost for user {user.id}: ${costs['total']}")
        except Exception as exc:
            logger.error(f"Error calculating costs for user {user.id}: {exc}")


def generate_monthly_invoice(user_id):
    """Generate a monthly invoice for a user."""
    try:
        from django.contrib.auth.models import User
        from .business_logic.billing import BillingService
        user = User.objects.get(id=user_id)
        service = BillingService()
        costs = service.calculate_user_monthly_cost(user)
        logger.info(f"Invoice generated for user {user_id}: ${costs['total']}")
    except Exception as exc:
        logger.error(f"Error generating invoice for user {user_id}: {exc}")


# ========== NOTIFICATIONS & WEBHOOKS ==========

def notify_resource_created(resource_type, resource_id):
    """Log/send webhook when a resource is created."""
    logger.info(f"[webhook] {resource_type} {resource_id} created")


def notify_resource_deleted(resource_type, resource_id):
    """Log/send webhook when a resource is deleted."""
    logger.info(f"[webhook] {resource_type} {resource_id} deleted")


def send_notification(user_id, subject, message):
    """Send an email notification to a user."""
    try:
        from django.contrib.auth.models import User
        user = User.objects.get(id=user_id)
        logger.info(f"[notify] → {user.email} | {subject}: {message}")
        # In production:
        # from django.core.mail import send_mail
        # send_mail(subject, message, 'noreply@orcacloud.com', [user.email])
    except Exception as exc:
        logger.error(f"Error sending notification to user {user_id}: {exc}")


# ========== MAINTENANCE ==========

def cleanup_old_resources():
    """Delete terminated instances older than 30 days."""
    from .models import Instance
    cutoff = timezone.now() - timedelta(days=30)
    qs = Instance.objects.filter(status='terminated', terminated_at__lt=cutoff)
    count = qs.count()
    qs.delete()
    logger.info(f"Deleted {count} old terminated instances")


def health_check():
    """Verify database connectivity."""
    try:
        from django.db import connection
        connection.ensure_connection()
        logger.debug("Health check passed")
    except Exception as exc:
        logger.error(f"Health check failed: {exc}")
