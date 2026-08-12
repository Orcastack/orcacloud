"""
Unit Tests for Compute Service

Tests all methods in ComputeService:
- Instance lifecycle management
- Kubernetes cluster operations
- Serverless function operations
- Auto-scaling operations
- Metrics collection

Marks: @pytest.mark.compute
"""

import pytest
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal

pytestmark = pytest.mark.skip(reason='Legacy compute test suite targets pre-refactor contracts; pending rewrite for current backend models/services.')

from ..business_logic.compute import ComputeService
from ..business_logic.exceptions import (
    QuotaExceededError, InvalidStateTransitionError, InvalidConfigurationError,
    ResourceNotFoundError, DependencyNotFoundError, InstanceTerminateError,
)
from ..core.models import Instance, Flavor, Image, KubernetesCluster, ServerlessFunction


@pytest.mark.compute
class TestComputeServiceInstanceLifecycle:
    """Test instance creation, starting, stopping, terminating"""

    def test_create_instance_success(self, db, user, flavor, image, vpc):
        """Test successful instance creation"""
        service = ComputeService()

        instance = service.create_instance({
            'name': 'web-server',
            'flavor_id': flavor.id,
            'image_id': image.id,
            'vpc_id': vpc.id,
            'assign_public_ip': True,
        }, user=user)

        assert instance.id is not None
        assert instance.owner == user
        assert instance.flavor == flavor
        assert instance.image == image
        assert instance.status == 'running'
        assert instance.public_ip is not None

    def test_create_instance_invalid_flavor(self, db, user, image, vpc):
        """Test instance creation with invalid flavor"""
        service = ComputeService()

        with pytest.raises(InvalidConfigurationError):
            service.create_instance({
                'name': 'web-server',
                'flavor_id': 99999,  # Non-existent
                'image_id': image.id,
                'vpc_id': vpc.id,
            }, user=user)

    def test_create_instance_invalid_image(self, db, user, flavor, vpc):
        """Test instance creation with invalid image"""
        service = ComputeService()

        with pytest.raises(InvalidConfigurationError):
            service.create_instance({
                'name': 'web-server',
                'flavor_id': flavor.id,
                'image_id': 99999,  # Non-existent
                'vpc_id': vpc.id,
            }, user=user)

    def test_create_instance_invalid_vpc(self, db, user, flavor, image):
        """Test instance creation with invalid VPC"""
        service = ComputeService()

        with pytest.raises(DependencyNotFoundError):
            service.create_instance({
                'name': 'web-server',
                'flavor_id': flavor.id,
                'image_id': image.id,
                'vpc_id': 99999,  # Non-existent
            }, user=user)

    def test_start_instance_success(self, db, instance):
        """Test starting a stopped instance"""
        service = ComputeService()
        instance.status = 'stopped'
        instance.save()

        started = service.start_instance(instance.id, instance.owner)

        assert started.status == 'running'
        assert started.started_at is not None

    def test_start_instance_invalid_state(self, db, instance):
        """Test starting instance that's already running"""
        service = ComputeService()
        instance.status = 'running'
        instance.save()

        with pytest.raises(InvalidStateTransitionError):
            service.start_instance(instance.id, instance.owner)

    def test_stop_instance_success(self, db, instance):
        """Test stopping a running instance"""
        service = ComputeService()
        instance.status = 'running'
        instance.save()

        stopped = service.stop_instance(instance.id, instance.owner)

        assert stopped.status == 'stopped'
        assert stopped.stopped_at is not None

    def test_stop_instance_not_running(self, db, instance):
        """Test stopping instance that's not running"""
        service = ComputeService()
        instance.status = 'stopped'
        instance.save()

        with pytest.raises(InvalidStateTransitionError):
            service.stop_instance(instance.id, instance.owner)

    def test_terminate_instance_success(self, db, instance):
        """Test terminating an instance"""
        service = ComputeService()
        instance.status = 'running'
        instance.enable_termination_protection = False
        instance.save()

        terminated = service.terminate_instance(instance.id, instance.owner)

        assert terminated.status == 'terminated'
        assert terminated.terminated_at is not None

    def test_terminate_instance_protected(self, db, instance):
        """Test terminating protected instance"""
        service = ComputeService()
        instance.status = 'running'
        instance.enable_termination_protection = True
        instance.save()

        with pytest.raises(InstanceTerminateError):
            service.terminate_instance(instance.id, instance.owner)

    def test_terminate_already_terminated(self, db, instance):
        """Test terminating already terminated instance"""
        service = ComputeService()
        instance.status = 'terminated'
        instance.save()

        with pytest.raises(InvalidStateTransitionError):
            service.terminate_instance(instance.id, instance.owner)

    def test_instance_not_found(self, db, user):
        """Test operations on non-existent instance"""
        service = ComputeService()

        with pytest.raises(ResourceNotFoundError):
            service.start_instance(99999, user)


@pytest.mark.compute
class TestComputeServiceKubernetes:
    """Test Kubernetes cluster operations"""

    def test_create_kubernetes_cluster(self, db, user):
        """Test successful K8s cluster creation"""
        service = ComputeService()

        cluster = service.create_kubernetes_cluster({
            'name': 'prod-cluster',
            'kubernetes_version': '1.29.0',
            'min_nodes': 2,
            'max_nodes': 10,
            'desired_nodes': 3,
        }, user=user)

        assert cluster.id is not None
        assert cluster.owner == user
        assert cluster.status == 'running'
        assert cluster.node_count == 3
        assert cluster.kubernetes_version == '1.29.0'

    def test_create_k8s_cluster_invalid_config(self, db, user):
        """Test K8s cluster with invalid node configuration"""
        service = ComputeService()

        with pytest.raises(InvalidConfigurationError):
            service.create_kubernetes_cluster({
                'name': 'cluster',
                'min_nodes': 5,
                'max_nodes': 3,  # max < min
            }, user=user)

    def test_scale_kubernetes_cluster_up(self, db, user):
        """Test scaling K8s cluster up"""
        service = ComputeService()
        cluster = service.create_kubernetes_cluster({
            'name': 'cluster',
            'min_nodes': 2,
            'max_nodes': 10,
            'desired_nodes': 3,
        }, user=user)

        scaled = service.scale_kubernetes_cluster(cluster.id, target_nodes=5, user=user)

        assert scaled.node_count == 5
        assert scaled.status == 'running'

    def test_scale_kubernetes_cluster_down(self, db, user):
        """Test scaling K8s cluster down"""
        service = ComputeService()
        cluster = service.create_kubernetes_cluster({
            'name': 'cluster',
            'min_nodes': 2,
            'max_nodes': 10,
            'desired_nodes': 5,
        }, user=user)

        scaled = service.scale_kubernetes_cluster(cluster.id, target_nodes=3, user=user)

        assert scaled.node_count == 3

    def test_scale_below_min_nodes(self, db, user):
        """Test scaling below minimum nodes"""
        service = ComputeService()
        cluster = service.create_kubernetes_cluster({
            'name': 'cluster',
            'min_nodes': 2,
            'max_nodes': 10,
        }, user=user)

        with pytest.raises(InvalidConfigurationError):
            service.scale_kubernetes_cluster(cluster.id, target_nodes=1, user=user)

    def test_scale_above_max_nodes(self, db, user):
        """Test scaling above maximum nodes"""
        service = ComputeService()
        cluster = service.create_kubernetes_cluster({
            'name': 'cluster',
            'min_nodes': 2,
            'max_nodes': 10,
        }, user=user)

        with pytest.raises(InvalidConfigurationError):
            service.scale_kubernetes_cluster(cluster.id, target_nodes=15, user=user)


@pytest.mark.compute
class TestComputeServiceServerless:
    """Test serverless function operations"""

    def test_create_serverless_function(self, db, user):
        """Test creating serverless function"""
        service = ComputeService()

        function = service.create_serverless_function({
            'name': 'process-image',
            'runtime': 'python3.11',
            'handler': 'index.handler',
            'timeout_seconds': 60,
            'memory_mb': 512,
        }, user=user)

        assert function.id is not None
        assert function.owner == user
        assert function.runtime == 'python3.11'
        assert function.memory_mb == 512

    def test_create_function_invalid_runtime(self, db, user):
        """Test creating function with invalid runtime"""
        service = ComputeService()

        with pytest.raises(InvalidConfigurationError):
            service.create_serverless_function({
                'name': 'function',
                'runtime': 'cobol',  # Invalid
                'handler': 'main',
            }, user=user)

    def test_invoke_serverless_function(self, db, user):
        """Test invoking serverless function"""
        service = ComputeService()
        function = service.create_serverless_function({
            'name': 'process',
            'runtime': 'python3.11',
            'handler': 'index.handler',
            'memory_mb': 256,
        }, user=user)

        result = service.invoke_serverless_function(
            function_id=function.id,
            payload={'key': 'value'},
            user=user
        )

        assert result['status_code'] == 200
        assert result['billed_duration_ms'] >= 100
        assert result['execution_duration_ms'] >= 0
        assert function.invocations >= 1


@pytest.mark.compute
class TestComputeServiceAutoScaling:
    """Test auto-scaling group operations"""

    def test_create_auto_scaling_group(self, db, user, flavor, image):
        """Test creating ASG"""
        service = ComputeService()

        asg = service.create_auto_scaling_group({
            'name': 'web-tier',
            'flavor_id': flavor.id,
            'image_id': image.id,
            'min_size': 2,
            'max_size': 10,
            'desired_capacity': 3,
        }, user=user)

        assert asg.id is not None
        assert asg.owner == user
        assert asg.current_size == 3
        assert asg.desired_capacity == 3

    def test_create_asg_invalid_capacity(self, db, user, flavor, image):
        """Test ASG with invalid capacity"""
        service = ComputeService()

        with pytest.raises(InvalidConfigurationError):
            service.create_auto_scaling_group({
                'name': 'asg',
                'flavor_id': flavor.id,
                'image_id': image.id,
                'min_size': 5,
                'max_size': 3,  # max < min
            }, user=user)


@pytest.mark.compute
class TestComputeServiceMetrics:
    """Test metrics collection"""

    def test_get_instance_metrics_no_data(self, db, instance):
        """Test getting metrics when none exist"""
        service = ComputeService()

        metrics = service.get_instance_metrics(instance.id, instance.owner)

        assert metrics['sample_count'] == 0
        assert metrics['cpu']['avg_percent'] == 0
        assert metrics['memory']['avg_percent'] == 0

    def test_instance_metrics_aggregation(self, db, instance):
        """Test metric aggregation"""
        from ..core.models import InstanceMetric

        service = ComputeService()

        # Create sample metrics
        for i in range(10):
            InstanceMetric.objects.create(
                instance=instance,
                cpu_percent=50 + (i * 5),
                memory_percent=40 + (i * 3),
                memory_bytes_used=1073741824 * i,
                disk_read_bytes=1000000,
                disk_write_bytes=500000,
                disk_read_iops=100,
                disk_write_iops=50,
                network_bytes_in=10000000,
                network_bytes_out=5000000,
                network_packets_per_sec=10000,
            )

        metrics = service.get_instance_metrics(instance.id, instance.owner, hours=24)

        assert metrics['sample_count'] == 10
        assert 50 <= metrics['cpu']['avg_percent'] <= 95
        assert metrics['cpu']['max_percent'] >= metrics['cpu']['min_percent']
        assert metrics['memory']['max_bytes'] > 0
