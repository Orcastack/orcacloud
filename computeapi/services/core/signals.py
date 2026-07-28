"""
Django Signal Handlers for OrcaCloud Services

Signals are fired when Django models are created, updated, or deleted.
These handlers trigger actions like:
- Webhook notifications
- Audit logging
- Cascading updates
- Event broadcasting

Signals:
- post_save: Fires after model instance is saved
- post_delete: Fires after model instance is deleted
- pre_save: Fires before model instance is saved (for validation)
- pre_delete: Fires before model instance is deleted (for cleanup)
"""

import logging
import json
from django.db.models.signals import post_save, post_delete, pre_delete
from django.dispatch import receiver
from django.utils import timezone

from .models import (
    Instance, StorageVolume, StorageBucket, ServerlessFunction,
    KubernetesCluster, LoadBalancer, SecurityGroup,
    InstanceMetric, AuditLog,
)
from .tasks import (
    provision_instance, deprovision_instance,
    notify_resource_created, notify_resource_deleted,
)

logger = logging.getLogger(__name__)


# ========== INSTANCE LIFECYCLE ==========

@receiver(post_save, sender=Instance)
def on_instance_created_or_updated(sender, instance, created, **kwargs):
    """
    Handle instance creation or update.
    
    - On create: Trigger provisioning task
    - On update: Log changes, trigger webhooks
    """
    if created:
        logger.info(f"Instance {instance.id} created")
        
        # Log audit event
        log_audit_event(
            user=instance.owner,
            action='instance_created',
            resource_type='instance',
            resource_id=instance.id,
            details={
                'flavor': instance.flavor.name,
                'image': instance.image.name,
                'status': instance.status,
            }
        )
        
        # Trigger provisioning
        if instance.status == 'pending':
            provision_instance(instance.id)
        
        # Send webhook
        send_webhook_event(
            event_type='instance.created',
            resource_type='instance',
            resource_id=instance.id,
            user=instance.owner,
            details={
                'instance_id': instance.id,
                'flavor': instance.flavor.name,
                'image': instance.image.name,
            }
        )
    else:
        # Instance updated
        logger.debug(f"Instance {instance.id} updated")
        
        # If status changed, send notification
        if hasattr(instance, '_previous_status') and instance._previous_status != instance.status:
            send_webhook_event(
                event_type=f'instance.{instance.status}',
                resource_type='instance',
                resource_id=instance.id,
                user=instance.owner,
                details={
                    'instance_id': instance.id,
                    'new_status': instance.status,
                    'previous_status': instance._previous_status,
                }
            )


@receiver(pre_delete, sender=Instance)
def on_instance_deleted(sender, instance, **kwargs):
    """
    Handle instance deletion (cleanup).
    
    - Release resources
    - Log deletion
    - Send webhooks
    """
    logger.info(f"Instance {instance.id} being deleted")
    
    # Log deletion
    log_audit_event(
        user=instance.owner,
        action='instance_deleted',
        resource_type='instance',
        resource_id=instance.id,
        details={'status': instance.status}
    )
    
    # Trigger deprovision if still running
    if instance.status in ['running', 'stopped']:
        instance.status = 'terminated'
        instance.save()
        deprovision_instance(instance.id)


# ========== STORAGE LIFECYCLE ==========

@receiver(post_save, sender=StorageBucket)
def on_bucket_created_or_updated(sender, instance, created, **kwargs):
    """
    Handle storage bucket creation or update.
    """
    if created:
        logger.info(f"Bucket {instance.id} created: {instance.bucket_name}")
        
        log_audit_event(
            user=instance.owner,
            action='bucket_created',
            resource_type='bucket',
            resource_id=instance.id,
            details={
                'bucket_name': instance.bucket_name,
                'region': instance.region,
                'encryption_enabled': instance.encryption_enabled,
            }
        )
        
        send_webhook_event(
            event_type='bucket.created',
            resource_type='bucket',
            resource_id=instance.id,
            user=instance.owner,
            details={
                'bucket_name': instance.bucket_name,
                'region': instance.region,
            }
        )


@receiver(post_save, sender=StorageVolume)
def on_volume_created_or_updated(sender, instance, created, **kwargs):
    """
    Handle storage volume creation or update.
    """
    if created:
        logger.info(f"Volume {instance.id} created: {instance.name}")
        
        log_audit_event(
            user=instance.owner,
            action='volume_created',
            resource_type='volume',
            resource_id=instance.id,
            details={
                'name': instance.name,
                'size_gb': instance.size_gb,
                'type': instance.volume_type,
            }
        )
        
        send_webhook_event(
            event_type='volume.created',
            resource_type='volume',
            resource_id=instance.id,
            user=instance.owner,
            details={
                'name': instance.name,
                'size_gb': instance.size_gb,
                'type': instance.volume_type,
            }
        )


# ========== KUBERNETES LIFECYCLE ==========

@receiver(post_save, sender=KubernetesCluster)
def on_k8s_cluster_created_or_updated(sender, instance, created, **kwargs):
    """
    Handle Kubernetes cluster creation or update.
    """
    if created:
        logger.info(f"K8s cluster {instance.id} created: {instance.name}")
        
        log_audit_event(
            user=instance.owner,
            action='k8s_cluster_created',
            resource_type='kubernetes_cluster',
            resource_id=instance.id,
            details={
                'name': instance.name,
                'version': instance.kubernetes_version,
                'nodes': instance.node_count,
            }
        )
        
        send_webhook_event(
            event_type='kubernetes.cluster.created',
            resource_type='kubernetes_cluster',
            resource_id=instance.id,
            user=instance.owner,
            details={
                'name': instance.name,
                'version': instance.kubernetes_version,
                'nodes': instance.node_count,
            }
        )


# ========== SECURITY GROUP LIFECYCLE ==========

@receiver(post_save, sender=SecurityGroup)
def on_security_group_created_or_updated(sender, instance, created, **kwargs):
    """
    Handle security group creation or update.
    """
    if created:
        logger.info(f"Security group {instance.id} created: {instance.name}")
        
        log_audit_event(
            user=instance.owner,
            action='security_group_created',
            resource_type='security_group',
            resource_id=instance.id,
            details={
                'name': instance.name,
                'vpc_id': instance.vpc.id,
            }
        )


# ========== METRIC COLLECTION ==========

@receiver(post_save, sender=InstanceMetric)
def on_instance_metric_collected(sender, instance, created, **kwargs):
    """
    Handle instance metric collection.
    
    - Check for threshold violations
    - Trigger alerts if needed
    """
    if not created:
        return
    
    # Example: Alert if CPU > 80%
    if instance.cpu_percent > 80:
        logger.warning(
            f"High CPU alert for instance {instance.instance.id}: "
            f"{instance.cpu_percent}%"
        )
        
        send_webhook_event(
            event_type='instance.alert.high_cpu',
            resource_type='instance',
            resource_id=instance.instance.id,
            user=instance.instance.owner,
            details={
                'cpu_percent': instance.cpu_percent,
                'threshold': 80,
            }
        )


# ========== HELPER FUNCTIONS ==========

def log_audit_event(user, action, resource_type, resource_id, details):
    """
    Log an audit event for compliance and debugging.
    
    Args:
        user: User who performed the action
        action: Action performed (e.g., 'instance_created')
        resource_type: Type of resource affected
        resource_id: ID of resource
        details: Dict with additional details
    """
    try:
        AuditLog.objects.create(
            user=user,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details,
            timestamp=timezone.now(),
            ip_address='',  # Could get from request
        )
        logger.debug(f"Audit log: {user.username} {action} {resource_type} {resource_id}")
    except Exception as exc:
        logger.error(f"Error logging audit event: {exc}")


def send_webhook_event(event_type, resource_type, resource_id, user, details):
    """
    Log a webhook event. In production, POST to registered webhook URLs.

    Args:
        event_type:   Type of event (e.g., 'instance.created')
        resource_type: Type of resource
        resource_id:  ID of resource
        user:         User who triggered event
        details:      Dict with event details
    """
    logger.info(
        f"[webhook] event={event_type} resource={resource_type}:{resource_id} "
        f"user={getattr(user, 'username', user)} details={details}"
    )
    # In production:
    # - Query Webhook model for active subscriptions matching event_type
    # - POST payload to each webhook URL with HMAC signature
    # - Store WebhookEvent for audit / retry


# ========== SIGNAL REGISTRATION ==========

def register_signals():
    """
    Register all signal handlers.
    
    Called from apps.py ready() method.
    """
    logger.debug("Registering signal handlers")
    # Signals are registered via @receiver decorators above
