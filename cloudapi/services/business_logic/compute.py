"""
Compute Service Business Logic

Handles all compute-related operations:
- Instance lifecycle management (create, start, stop, terminate)
- Kubernetes cluster provisioning and scaling
- Serverless function execution
- Auto-scaling based on metrics
- Instance metrics collection and aggregation

State Machines:
- Instance: pending → running → stopping → stopped → terminating → terminated
- K8s Cluster: provisioning → running → updating → deleting
- Serverless: initialized → invoked → completed/failed
"""

import hashlib
import json
from datetime import datetime, timedelta
from decimal import Decimal
from django.utils import timezone
from django.db import transaction
from django.db.models import Q, Sum, Avg

from ..core.models import (
    Instance, Flavor, Image, InstanceMetric,
    KubernetesCluster, KubernetesNode,
    ServerlessFunction, ServerlessFunctionTrigger,
    AutoScalingGroup, ScalingPolicy,
)
from ..core.base_models import AuditLog
from .exceptions import (
    InstanceError, InstanceStartError, InstanceStopError, InstanceTerminateError,
    QuotaExceededError, InvalidStateTransitionError, InvalidConfigurationError,
    KubernetesError, ClusterProvisioningError,
    ServerlessFunctionError, FunctionInvocationError,
    AutoScalingError, ScalingDecisionError,
    ResourceNotFoundError, DependencyNotFoundError,
)


class ComputeService:
    """Service for managing compute resources (instances, K8s, serverless)"""

    # Instance state transition rules (from_state -> [valid_to_states])
    INSTANCE_STATE_TRANSITIONS = {
        'pending': ['running', 'cancelled'],
        'running': ['stopping', 'terminating'],
        'stopped': ['running', 'terminating'],
        'stopping': ['stopped'],
        'terminating': ['terminated'],
        'terminated': [],  # Terminal state
        'cancelled': [],  # Terminal state
    }

    # K8s cluster state transitions
    CLUSTER_STATE_TRANSITIONS = {
        'provisioning': ['running', 'failed'],
        'running': ['updating', 'scaling', 'deleting'],
        'updating': ['running'],
        'scaling': ['running'],
        'deleting': ['deleted'],
        'failed': [],
        'deleted': [],
    }

    def __init__(self):
        """Initialize compute service"""
        self.current_time = timezone.now()

    # ========== INSTANCE MANAGEMENT ==========

    @transaction.atomic
    def create_instance(self, instance_data, user):
        """
        Create and initialize a new compute instance.

        Args:
            instance_data: Dict with instance configuration
            user: User who owns the instance

        Returns:
            Instance: Created instance object

        Raises:
            QuotaExceededError: User exceeded instance quota
            InvalidConfigurationError: Invalid flavor/image/network
            DependencyNotFoundError: Required VPC/subnet not found
        """
        # Check quota
        instance_count = Instance.objects.filter(owner=user).exclude(status='terminated').count()
        user_quota = getattr(user, 'profile', None)
        if instance_count >= (user_quota.max_instances if user_quota else 100):
            raise QuotaExceededError("Instance quota exceeded")

        # Validate flavor exists
        try:
            flavor = Flavor.objects.get(id=instance_data['flavor_id'])
        except Flavor.DoesNotExist:
            raise InvalidConfigurationError("Flavor does not exist")

        # Validate image exists
        try:
            image = Image.objects.get(id=instance_data['image_id'])
        except Image.DoesNotExist:
            raise InvalidConfigurationError("Image does not exist")

        # Validate network if specified
        if instance_data.get('vpc_id'):
            from ..core.models import VPC
            try:
                vpc = VPC.objects.get(id=instance_data['vpc_id'], owner=user)
            except VPC.DoesNotExist:
                raise DependencyNotFoundError("VPC not found or not owned by user")

        # Create instance with pending status
        instance = Instance.objects.create(
            name=instance_data.get('name', f'instance-{hashlib.md5(str(timezone.now()).encode()).hexdigest()[:8]}'),
            owner=user,
            flavor=flavor,
            image=image,
            status='pending',
            vpc_id=instance_data.get('vpc_id'),
            availability_zone=instance_data.get('availability_zone', 'us-west-2a'),
            enable_termination_protection=instance_data.get('enable_termination_protection', False),
            public_ip=self._allocate_public_ip() if instance_data.get('assign_public_ip') else None,
            private_ip=self._allocate_private_ip(instance_data.get('vpc_id')),
            metadata=instance_data.get('metadata', {}),
        )

        # TODO: In production, this would provision actual infrastructure
        # For now, transition to running after creation
        instance.status = 'running'
        instance.provisioning_started_at = timezone.now()
        instance.save()

        # Log audit event
        self._audit_log(user, 'instance_created', instance.id, {'flavor': flavor.name, 'image': image.name})

        return instance

    @transaction.atomic
    def start_instance(self, instance_id, user):
        """
        Start a stopped instance.

        Args:
            instance_id: ID of instance to start
            user: User performing operation

        Raises:
            InstanceStartError: Cannot start instance
            InvalidStateTransitionError: Invalid state transition
        """
        try:
            instance = Instance.objects.get(id=instance_id, owner=user)
        except Instance.DoesNotExist:
            raise ResourceNotFoundError("Instance not found")

        if instance.status not in ['stopped', 'pending']:
            raise InvalidStateTransitionError(
                f"Cannot start instance in {instance.status} state"
            )

        instance.status = 'running'
        instance.started_at = timezone.now()
        instance.save()

        self._audit_log(user, 'instance_started', instance.id, {})
        return instance

    @transaction.atomic
    def stop_instance(self, instance_id, user):
        """
        Stop a running instance.

        Args:
            instance_id: ID of instance to stop
            user: User performing operation

        Raises:
            InstanceStopError: Cannot stop instance
            InvalidStateTransitionError: Invalid state transition
        """
        try:
            instance = Instance.objects.get(id=instance_id, owner=user)
        except Instance.DoesNotExist:
            raise ResourceNotFoundError("Instance not found")

        if instance.status != 'running':
            raise InvalidStateTransitionError(
                f"Cannot stop instance in {instance.status} state"
            )

        instance.status = 'stopping'
        instance.save()

        # Transition to stopped (in production, would check provisioning status)
        instance.status = 'stopped'
        instance.stopped_at = timezone.now()
        instance.save()

        self._audit_log(user, 'instance_stopped', instance.id, {})
        return instance

    @transaction.atomic
    def terminate_instance(self, instance_id, user):
        """
        Terminate an instance (permanent deletion).

        Args:
            instance_id: ID of instance to terminate
            user: User performing operation

        Raises:
            InstanceTerminateError: Cannot terminate instance
        """
        try:
            instance = Instance.objects.get(id=instance_id, owner=user)
        except Instance.DoesNotExist:
            raise ResourceNotFoundError("Instance not found")

        if instance.enable_termination_protection:
            raise InstanceTerminateError(
                "Instance is protected from termination. Disable protection first."
            )

        if instance.status == 'terminated':
            raise InvalidStateTransitionError("Instance already terminated")

        instance.status = 'terminating'
        instance.save()

        # TODO: In production, deprovision actual infrastructure here

        instance.status = 'terminated'
        instance.terminated_at = timezone.now()
        instance.save()

        # Release public IP if allocated
        if instance.public_ip:
            self._release_public_ip(instance.public_ip)

        self._audit_log(user, 'instance_terminated', instance.id, {})
        return instance

    def get_instance_metrics(self, instance_id, user, hours=24):
        """
        Get metrics for an instance over a time period.

        Args:
            instance_id: ID of instance
            user: User requesting metrics
            hours: Number of hours of history to retrieve (default 24)

        Returns:
            Dict with aggregated metrics (CPU, memory, disk I/O, network)
        """
        try:
            instance = Instance.objects.get(id=instance_id, owner=user)
        except Instance.DoesNotExist:
            raise ResourceNotFoundError("Instance not found")

        time_start = self.current_time - timedelta(hours=hours)

        metrics = InstanceMetric.objects.filter(
            instance=instance,
            timestamp__gte=time_start,
        )

        if not metrics.exists():
            return self._empty_metrics()

        # Aggregate metrics
        return {
            'instance_id': instance.id,
            'period_hours': hours,
            'timestamp_start': time_start,
            'timestamp_end': self.current_time,
            'cpu': {
                'avg_percent': float(metrics.aggregate(Avg('cpu_percent'))['cpu_percent__avg'] or 0),
                'max_percent': float(metrics.aggregate(Max='cpu_percent')['cpu_percent__max'] or 0),
                'min_percent': float(metrics.aggregate(Min='cpu_percent')['cpu_percent__min'] or 0),
            },
            'memory': {
                'avg_percent': float(metrics.aggregate(Avg('memory_percent'))['memory_percent__avg'] or 0),
                'max_percent': float(metrics.aggregate(Max='memory_percent')['memory_percent__max'] or 0),
                'max_bytes': int(metrics.aggregate(Max='memory_bytes_used')['memory_bytes_used__max'] or 0),
            },
            'disk_io': {
                'total_read_bytes': int(metrics.aggregate(Sum('disk_read_bytes'))['disk_read_bytes__sum'] or 0),
                'total_write_bytes': int(metrics.aggregate(Sum('disk_write_bytes'))['disk_write_bytes__sum'] or 0),
                'avg_read_iops': float(metrics.aggregate(Avg('disk_read_iops'))['disk_read_iops__avg'] or 0),
                'avg_write_iops': float(metrics.aggregate(Avg('disk_write_iops'))['disk_write_iops__avg'] or 0),
            },
            'network': {
                'total_bytes_in': int(metrics.aggregate(Sum('network_bytes_in'))['network_bytes_in__sum'] or 0),
                'total_bytes_out': int(metrics.aggregate(Sum('network_bytes_out'))['network_bytes_out__sum'] or 0),
                'avg_packets_per_sec': float(metrics.aggregate(Avg('network_packets_per_sec'))['network_packets_per_sec__avg'] or 0),
            },
            'sample_count': metrics.count(),
        }

    # ========== KUBERNETES MANAGEMENT ==========

    @transaction.atomic
    def create_kubernetes_cluster(self, cluster_data, user):
        """
        Create and provision a Kubernetes cluster.

        Args:
            cluster_data: Dict with cluster configuration
            user: User who owns the cluster

        Returns:
            KubernetesCluster: Created cluster object

        Raises:
            InvalidConfigurationError: Invalid cluster configuration
            QuotaExceededError: Cluster quota exceeded
        """
        # Check quota
        cluster_count = KubernetesCluster.objects.filter(owner=user).exclude(status='deleted').count()
        if cluster_count >= 10:  # Default quota
            raise QuotaExceededError("Kubernetes cluster quota exceeded")

        # Validate configuration
        min_nodes = cluster_data.get('min_nodes', 1)
        max_nodes = cluster_data.get('max_nodes', 10)
        if min_nodes < 1 or max_nodes < min_nodes:
            raise InvalidConfigurationError("Invalid node count configuration")

        # Create cluster
        cluster = KubernetesCluster.objects.create(
            name=cluster_data.get('name', f'k8s-cluster-{timezone.now().timestamp()}'),
            owner=user,
            kubernetes_version=cluster_data.get('kubernetes_version', '1.29.0'),
            node_count=cluster_data.get('node_count', min_nodes),
            min_nodes=min_nodes,
            max_nodes=max_nodes,
            status='provisioning',
            availability_zones=cluster_data.get('availability_zones', ['us-west-2a', 'us-west-2b']),
            metadata=cluster_data.get('metadata', {}),
        )

        # Create initial nodes
        self._create_cluster_nodes(cluster, cluster_data.get('node_count', min_nodes))

        # Simulate provisioning
        cluster.status = 'running'
        cluster.provisioning_started_at = timezone.now()
        cluster.provisioning_completed_at = timezone.now()
        cluster.save()

        self._audit_log(user, 'k8s_cluster_created', cluster.id, {'nodes': min_nodes})
        return cluster

    def scale_kubernetes_cluster(self, cluster_id, target_nodes, user):
        """
        Scale a Kubernetes cluster to a target number of nodes.

        Args:
            cluster_id: ID of cluster to scale
            target_nodes: Desired number of nodes
            user: User performing operation

        Returns:
            KubernetesCluster: Updated cluster
        """
        try:
            cluster = KubernetesCluster.objects.get(id=cluster_id, owner=user)
        except KubernetesCluster.DoesNotExist:
            raise ResourceNotFoundError("Cluster not found")

        if target_nodes < cluster.min_nodes or target_nodes > cluster.max_nodes:
            raise InvalidConfigurationError(
                f"Target nodes must be between {cluster.min_nodes} and {cluster.max_nodes}"
            )

        if target_nodes > cluster.node_count:
            # Scale up
            new_nodes_count = target_nodes - cluster.node_count
            self._create_cluster_nodes(cluster, new_nodes_count)
        elif target_nodes < cluster.node_count:
            # Scale down
            nodes_to_delete = cluster.node_count - target_nodes
            nodes = KubernetesNode.objects.filter(cluster=cluster, status='ready').order_by('-created_at')[:nodes_to_delete]
            nodes.update(status='terminating')

        cluster.node_count = target_nodes
        cluster.status = 'scaling'
        cluster.save()

        # Simulate scaling completion
        cluster.status = 'running'
        cluster.save()

        self._audit_log(user, 'k8s_cluster_scaled', cluster.id, {'target_nodes': target_nodes})
        return cluster

    # ========== SERVERLESS MANAGEMENT ==========

    @transaction.atomic
    def create_serverless_function(self, function_data, user):
        """
        Create a serverless function.

        Args:
            function_data: Dict with function configuration
            user: User who owns the function

        Returns:
            ServerlessFunction: Created function object
        """
        # Validate runtime
        valid_runtimes = ['python3.11', 'nodejs18', 'go1.22', 'java21']
        if function_data.get('runtime') not in valid_runtimes:
            raise InvalidConfigurationError(f"Unsupported runtime. Valid: {valid_runtimes}")

        # Create function
        function = ServerlessFunction.objects.create(
            name=function_data.get('name'),
            owner=user,
            runtime=function_data.get('runtime'),
            handler=function_data.get('handler'),
            code_sha256=self._hash_code(function_data.get('code', '')),
            timeout_seconds=function_data.get('timeout_seconds', 60),
            memory_mb=function_data.get('memory_mb', 128),
            metadata=function_data.get('metadata', {}),
        )

        self._audit_log(user, 'function_created', function.id, {'runtime': function.runtime})
        return function

    def invoke_serverless_function(self, function_id, payload, user):
        """
        Invoke a serverless function with provided payload.

        Args:
            function_id: ID of function to invoke
            payload: JSON payload to pass to function
            user: User invoking function

        Returns:
            Dict: Function response, execution time, billed duration
        """
        try:
            function = ServerlessFunction.objects.get(id=function_id, owner=user)
        except ServerlessFunction.DoesNotExist:
            raise ResourceNotFoundError("Function not found")

        start_time = timezone.now()

        try:
            # Simulate function execution
            # In production, this would invoke actual Lambda/function runtime
            execution_result = {
                'status_code': 200,
                'body': json.dumps({'message': f'Function {function.name} executed successfully', 'payload': payload}),
                'logs': [f'Function {function.name} invoked with payload: {payload}'],
            }
            execution_duration = (timezone.now() - start_time).total_seconds()
            billed_duration = max(100, int(execution_duration * 1000))  # Minimum 100ms billing

        except Exception as e:
            raise FunctionInvocationError(f"Function invocation failed: {str(e)}")

        # Update function invocation metrics
        function.invocations += 1
        function.last_invoked_at = start_time
        function.save()

        return {
            'function_id': function.id,
            'status_code': execution_result['status_code'],
            'body': execution_result['body'],
            'execution_duration_ms': float(f"{execution_duration * 1000:.2f}"),
            'billed_duration_ms': billed_duration,
            'memory_used_mb': function.memory_mb,
        }

    # ========== AUTO-SCALING MANAGEMENT ==========

    @transaction.atomic
    def create_auto_scaling_group(self, asg_data, user):
        """
        Create an auto-scaling group.

        Args:
            asg_data: Dict with ASG configuration
            user: User who owns the ASG

        Returns:
            AutoScalingGroup: Created ASG object
        """
        min_size = asg_data.get('min_size', 1)
        max_size = asg_data.get('max_size', 10)
        desired_capacity = asg_data.get('desired_capacity', min_size)

        if min_size < 1 or max_size < min_size or desired_capacity < min_size or desired_capacity > max_size:
            raise InvalidConfigurationError("Invalid capacity configuration")

        asg = AutoScalingGroup.objects.create(
            name=asg_data.get('name'),
            owner=user,
            flavor_id=asg_data.get('flavor_id'),
            image_id=asg_data.get('image_id'),
            min_size=min_size,
            max_size=max_size,
            desired_capacity=desired_capacity,
            current_size=desired_capacity,
            health_check_type=asg_data.get('health_check_type', 'ELB'),
            metadata=asg_data.get('metadata', {}),
        )

        # Create initial instances
        self._launch_asg_instances(asg, desired_capacity)

        self._audit_log(user, 'asg_created', asg.id, {'min_size': min_size, 'max_size': max_size})
        return asg

    def evaluate_scaling_policies(self, asg_id, user):
        """
        Evaluate all scaling policies for an ASG and make scaling decisions.

        Args:
            asg_id: ID of ASG to evaluate
            user: User owning the ASG

        Returns:
            Dict: Scaling decision details
        """
        try:
            asg = AutoScalingGroup.objects.get(id=asg_id, owner=user)
        except AutoScalingGroup.DoesNotExist:
            raise ResourceNotFoundError("ASG not found")

        policies = ScalingPolicy.objects.filter(asg=asg)
        scaling_decision = {'scale_up': 0, 'scale_down': 0, 'policies_evaluated': 0}

        for policy in policies:
            if policy.policy_type == 'target_tracking':
                decision = self._evaluate_target_tracking_policy(asg, policy)
                scaling_decision['policies_evaluated'] += 1

                if decision == 'scale_up' and asg.current_size < asg.max_size:
                    scaling_decision['scale_up'] += 1
                    asg.current_size += 1
                    asg.desired_capacity = asg.current_size
                    self._launch_asg_instances(asg, 1)

                elif decision == 'scale_down' and asg.current_size > asg.min_size:
                    scaling_decision['scale_down'] += 1
                    asg.current_size -= 1
                    asg.desired_capacity = asg.current_size

        asg.save()
        return scaling_decision

    # ========== HELPER METHODS ==========

    def _allocate_public_ip(self):
        """Allocate a public IP address"""
        return f"203.0.113.{hashlib.md5(str(timezone.now()).encode()).hexdigest()[:2]}"

    def _allocate_private_ip(self, vpc_id=None):
        """Allocate a private IP address"""
        return f"10.0.{hashlib.md5(str(timezone.now()).encode()).hexdigest()[:2]}.{hash(vpc_id or 'default') % 256}"

    def _release_public_ip(self, ip_address):
        """Release a public IP address"""
        pass  # In production, would deallocate IP

    def _create_cluster_nodes(self, cluster, count):
        """Create nodes for a Kubernetes cluster"""
        for i in range(count):
            KubernetesNode.objects.create(
                cluster=cluster,
                name=f"{cluster.name}-node-{i}",
                status='provisioning',
                kubelet_version=cluster.kubernetes_version,
            )

    def _hash_code(self, code):
        """Hash function code for integrity check"""
        return hashlib.sha256(code.encode()).hexdigest()

    def _launch_asg_instances(self, asg, count):
        """Launch instances for ASG scaling events."""
        # Resolve flavor and image from the launch_template_id or use
        # the owner's first available resources as a safe fallback.
        flavor = (
            Flavor.objects.filter(id=asg.launch_template_id).first()
            if str(getattr(asg, 'launch_template_id', '')).isdigit()
            else Flavor.objects.first()
        )
        image = (
            Image.objects.filter(id=asg.launch_template_id).first()
            if str(getattr(asg, 'launch_template_id', '')).isdigit()
            else Image.objects.filter(owner=asg.owner).first() or Image.objects.first()
        )
        if not flavor or not image:
            raise AutoScalingError(
                f"Cannot launch ASG instances: no flavor or image available for ASG '{asg.name}'"
            )
        launched = []
        for i in range(count):
            instance_data = {
                'flavor_id': flavor.id,
                'image_id': image.id,
                'name': f"{asg.name}-asg-{i}",
                'assign_public_ip': True,
                'metadata': {'auto_scaling_group': str(asg.asg_id)},
            }
            try:
                instance = self.create_instance(instance_data, asg.owner)
                launched.append(instance.instance_id)
            except Exception as exc:
                # Log and continue so partial launches don't block the whole scale-up
                self._audit_log(
                    asg.owner, 'scale',
                    str(asg.id),
                    {'error': str(exc), 'asg': asg.name, 'index': i},
                )
        # Persist new instance IDs on the ASG
        asg.current_instances = list(set(asg.current_instances or []) | set(launched))
        asg.save(update_fields=['current_instances'])

    def _evaluate_target_tracking_policy(self, asg, policy):
        """
        Evaluate a target tracking scaling policy against real instance metrics.

        Queries the last 5 minutes of InstanceMetric rows for all instances
        currently in this ASG and averages the relevant metric.

        Returns: 'scale_up', 'scale_down', or 'maintain'
        """
        metric_name = (policy.metric_name or 'CPUUtilization').lower()
        since = timezone.now() - timedelta(minutes=5)

        instance_ids = asg.current_instances or []
        metrics_qs = InstanceMetric.objects.filter(
            instance__instance_id__in=instance_ids,
            created_at__gte=since,
        )

        if metric_name in ('cpuutilization', 'cpu_usage_percent', 'cpu'):
            agg = metrics_qs.aggregate(avg=Avg('cpu_usage_percent'))
            current_value = agg['avg']
        elif metric_name in ('memoryutilization', 'memory_usage_percent', 'memory'):
            agg = metrics_qs.aggregate(avg=Avg('memory_usage_percent'))
            current_value = agg['avg']
        else:
            # Unknown metric — no data, maintain
            return 'maintain'

        if current_value is None:
            # No metrics collected yet — maintain current size
            return 'maintain'

        target = policy.target_value
        if current_value > target:
            return 'scale_up'
        elif current_value < (target * 0.8):
            return 'scale_down'
        else:
            return 'maintain'

    def _audit_log(self, user, action, resource_id, details):
        """Persist an audit event via the AuditLog model."""
        try:
            # Map free-form action strings to the constrained ACTION_CHOICES
            _action_map = {
                'instance_created': 'create',
                'instance_started': 'start',
                'instance_stopped': 'stop',
                'instance_terminated': 'delete',
                'instance_restarted': 'restart',
                'cluster_created': 'create',
                'cluster_scaled': 'scale',
                'function_created': 'create',
                'asg_created': 'create',
                'asg_scaled': 'scale',
            }
            mapped_action = _action_map.get(action, action)
            # Determine resource_type from details or fall back to 'compute'
            resource_type = details.get('resource_type', 'compute') if isinstance(details, dict) else 'compute'
            AuditLog.log_action(
                user=user,
                action=mapped_action,
                resource_type=resource_type,
                resource_id=str(resource_id),
                resource_name=details.get('name', '') if isinstance(details, dict) else '',
                status='success',
                details=details if isinstance(details, dict) else {'info': str(details)},
            )
        except Exception:
            # Audit failures must never interrupt business operations
            pass

    def _empty_metrics(self):
        """Return empty metrics response"""
        return {
            'cpu': {'avg_percent': 0, 'max_percent': 0, 'min_percent': 0},
            'memory': {'avg_percent': 0, 'max_percent': 0, 'max_bytes': 0},
            'disk_io': {'total_read_bytes': 0, 'total_write_bytes': 0, 'avg_read_iops': 0, 'avg_write_iops': 0},
            'network': {'total_bytes_in': 0, 'total_bytes_out': 0, 'avg_packets_per_sec': 0},
            'sample_count': 0,
        }
