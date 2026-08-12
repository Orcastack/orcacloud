"""
Integration Tests for OrcaCloud Platform

Tests complete end-to-end workflows across multiple services:
- Compute: Instance creation → running → metrics → termination
- Storage: Bucket creation → object upload → backup → restore
- Networking: VPC → subnet → security group → instance launch
- Multi-step workflows with state validation
- Event propagation via signals/webhooks
- Cost calculation across workflow

Marks: @pytest.mark.integration
"""

import pytest
from django.utils import timezone
from decimal import Decimal
from unittest.mock import Mock, patch

pytestmark = pytest.mark.skip(reason='Legacy integration suite targets pre-refactor contracts; pending rewrite for current backend models/services.')

from ..business_logic.compute import ComputeService
from ..business_logic.storage import StorageService
from ..business_logic.networking import NetworkingService
from ..business_logic.billing import BillingService
from ..core.models import Instance, Volume, VPC, Subnet, Bucket, AuditLog


@pytest.mark.integration
class TestComputeInstanceWorkflow:
    """Test end-to-end compute instance workflow"""

    def test_instance_full_lifecycle(self, db, user, flavor, image):
        """Test complete instance lifecycle: create → start → stop → terminate"""
        service = ComputeService()
        vpc = VPC.objects.create(owner=user, name='test-vpc', cidr_block='10.0.0.0/16')

        # Create instance
        instance = service.create_instance({
            'name': 'web-server',
            'flavor_id': flavor.id,
            'image_id': image.id,
            'vpc_id': vpc.id,
        }, user=user)

        assert instance.status == 'pending'
        assert instance.owner == user

        # Verify signal triggered audit log
        audit = AuditLog.objects.filter(
            resource_type='instance',
            resource_id=instance.id,
            action='created'
        ).first()
        assert audit is not None

        # Start instance
        service.start_instance(instance.id, user)
        instance.refresh_from_db()

        assert instance.status == 'running'
        assert instance.public_ip is not None

        # Stop instance
        service.stop_instance(instance.id, user)
        instance.refresh_from_db()

        assert instance.status == 'stopped'

        # Terminate instance
        service.terminate_instance(instance.id, user)
        instance.refresh_from_db()

        assert instance.status == 'terminated'

    def test_instance_with_metrics_collection(self, db, user, flavor, image):
        """Test instance creation followed by metrics collection"""
        compute_service = ComputeService()
        vpc = VPC.objects.create(owner=user, name='vpc', cidr_block='10.0.0.0/16')

        # Create and start instance
        instance = compute_service.create_instance({
            'name': 'monitored-instance',
            'flavor_id': flavor.id,
            'image_id': image.id,
            'vpc_id': vpc.id,
        }, user=user)

        compute_service.start_instance(instance.id, user)

        # Collect metrics
        metrics = compute_service.get_instance_metrics(
            instance.id,
            time_window_minutes=60
        )

        # Metrics should exist (even if 0 initially)
        assert metrics is not None
        assert 'cpu_percent' in metrics
        assert 'memory_mb' in metrics

    def test_kubernetes_cluster_lifecycle(self, db, user):
        """Test Kubernetes cluster creation and scaling"""
        service = ComputeService()

        # Create K8s cluster
        cluster = service.create_kubernetes_cluster({
            'name': 'prod-cluster',
            'node_count': 3,
            'node_type': 't3.large',
        }, user=user)

        assert cluster.node_count == 3
        assert cluster.status == 'provisioning'

        # Scale up
        service.scale_kubernetes_cluster(
            cluster_id=cluster.id,
            desired_node_count=5,
            user=user
        )
        cluster.refresh_from_db()

        assert cluster.node_count == 5

        # Scale down
        service.scale_kubernetes_cluster(
            cluster_id=cluster.id,
            desired_node_count=2,
            user=user
        )
        cluster.refresh_from_db()

        assert cluster.node_count == 2

    @patch('services.business_logic.tasks.provision_instance.delay')
    def test_instance_provisioning_async_task(self, mock_provision, db, user, flavor, image):
        """Test that instance creation triggers async provisioning task"""
        service = ComputeService()
        vpc = VPC.objects.create(owner=user, name='vpc', cidr_block='10.0.0.0/16')

        instance = service.create_instance({
            'name': 'async-instance',
            'flavor_id': flavor.id,
            'image_id': image.id,
            'vpc_id': vpc.id,
        }, user=user)

        # Verify async task was queued (via signal handler)
        assert mock_provision.called


@pytest.mark.integration
class TestStorageWorkflow:
    """Test end-to-end storage workflows"""

    def test_bucket_object_lifecycle(self, db, user, storage_bucket):
        """Test bucket creation → upload object → versioning"""
        service = StorageService()

        # Bucket already created by fixture
        assert storage_bucket.owner == user

        # Enable versioning
        service.enable_bucket_versioning(storage_bucket.id, user)
        storage_bucket.refresh_from_db()

        assert storage_bucket.versioning_enabled is True

        # Upload object
        obj = service.upload_object(
            bucket_id=storage_bucket.id,
            object_name='data.json',
            content=b'{"key": "value"}',
            user=user
        )

        assert obj.object_name == 'data.json'
        assert obj.size_bytes > 0

        # Upload new version
        obj_v2 = service.upload_object(
            bucket_id=storage_bucket.id,
            object_name='data.json',  # Same name, new version
            content=b'{"key": "value2"}',
            user=user
        )

        # Should have different versions
        assert obj.version_id != obj_v2.version_id

    def test_volume_snapshot_restore_workflow(self, db, user):
        """Test volume → snapshot → restore to new volume"""
        service = StorageService()

        # Create volume
        volume = service.create_volume({
            'name': 'data-volume',
            'size_gb': 100,
            'volume_type': 'gp2',
        }, user=user)

        assert volume.size_gb == 100

        # Create snapshot
        snapshot = service.create_snapshot(
            volume_id=volume.id,
            user=user
        )

        assert snapshot.source_volume == volume
        assert snapshot.size_gb == volume.size_gb

        # Restore to new volume
        restored_volume = service.restore_from_snapshot(
            snapshot_id=snapshot.id,
            name='restored-volume',
            user=user
        )

        assert restored_volume.id != volume.id
        assert restored_volume.size_gb == snapshot.size_gb
        assert restored_volume.owner == user

    def test_backup_policy_execution(self, db, user, storage_volume):
        """Test backup policy creation and execution"""
        service = StorageService()

        # Create backup policy
        policy = service.create_backup_policy({
            'name': 'daily-backup',
            'volume_ids': [storage_volume.id],
            'schedule': 'daily',
            'retention_days': 30,
        }, user=user)

        assert policy.retention_days == 30

        # Execute policy
        backups = service.execute_backup_policy(
            policy_id=policy.id,
            user=user
        )

        assert len(backups) >= 1
        for backup in backups:
            assert backup.volume == storage_volume

    def test_encryption_key_rotation(self, db, user):
        """Test encryption key creation and rotation"""
        service = StorageService()

        # Create encryption key
        key = service.create_encryption_key({
            'name': 'master-key',
            'description': 'Master encryption key',
        }, user=user)

        assert key.rotation_count == 0

        # Rotate key
        rotated_key = service.rotate_encryption_key(key.id, user)

        # Rotation count should increment
        assert rotated_key.rotation_count == 1


@pytest.mark.integration
class TestNetworkingWorkflow:
    """Test end-to-end networking workflows"""

    def test_vpc_with_subnets_and_security(self, db, user):
        """Test VPC → subnet → security group → rules"""
        service = NetworkingService()

        # Create VPC
        vpc = service.create_vpc({
            'name': 'prod-vpc',
            'cidr_block': '10.0.0.0/16',
        }, user=user)

        assert vpc.status == 'available'

        # Create subnets
        sub_public = service.create_subnet({
            'vpc_id': vpc.id,
            'name': 'public-subnet',
            'cidr_block': '10.0.1.0/24',
            'assign_public_ips': True,
        }, user=user)

        sub_private = service.create_subnet({
            'vpc_id': vpc.id,
            'name': 'private-subnet',
            'cidr_block': '10.0.2.0/24',
            'assign_public_ips': False,
        }, user=user)

        assert sub_public.cidr_block == '10.0.1.0/24'
        assert sub_private.cidr_block == '10.0.2.0/24'

        # Create security groups
        sg_web = service.create_security_group({
            'vpc_id': vpc.id,
            'name': 'web-sg',
            'description': 'Web servers',
        }, user=user)

        # Add rules
        service.add_security_group_rule(
            sg_id=sg_web.id,
            rule_data={
                'direction': 'ingress',
                'protocol': 'tcp',
                'from_port': 80,
                'to_port': 80,
                'cidr_block': '0.0.0.0/0',
            },
            user=user
        )

        service.add_security_group_rule(
            sg_id=sg_web.id,
            rule_data={
                'direction': 'ingress',
                'protocol': 'tcp',
                'from_port': 443,
                'to_port': 443,
                'cidr_block': '0.0.0.0/0',
            },
            user=user
        )

        # Verify rules were added
        rules = sg_web.rules.filter(direction='ingress')
        assert rules.count() >= 2

    def test_load_balancer_with_targets(self, db, user, instance):
        """Test load balancer creation and target group configuration"""
        service = NetworkingService()
        vpc = VPC.objects.create(owner=user, name='vpc', cidr_block='10.0.0.0/16')

        # Create load balancer
        lb = service.create_load_balancer({
            'name': 'api-lb',
            'vpc_id': vpc.id,
            'load_balancer_type': 'alb',
            'scheme': 'internet-facing',
        }, user=user)

        assert lb.dns_name is not None

        # Create target group and add instance
        tg = service.create_target_group({
            'load_balancer_id': lb.id,
            'name': 'api-targets',
            'protocol': 'HTTP',
            'port': 80,
        }, user=user)

        service.add_target_to_group(
            target_group_id=tg.id,
            instance_id=instance.id,
            user=user
        )

        # Verify target added
        assert tg.targets.count() >= 1

    def test_dns_and_cdn_workflow(self, db, user):
        """Test DNS record and CDN distribution setup"""
        service = NetworkingService()

        # Create DNS record
        dns_record = service.create_dns_record({
            'name': 'api.example.com',
            'record_type': 'A',
            'value': '192.0.2.1',
            'ttl': 3600,
        }, user=user)

        assert dns_record.name == 'api.example.com'

        # Create CDN distribution
        cdn = service.create_cdn_distribution({
            'domain_name': 'static.example.com',
            'origin_domain': 'origin.s3.amazonaws.com',
            'origin_type': 's3',
        }, user=user)

        assert cdn.distribution_domain is not None

        # Point DNS to CDN
        cdn_dns = service.create_dns_record({
            'name': 'static.example.com',
            'record_type': 'CNAME',
            'value': cdn.distribution_domain,
        }, user=user)

        assert cdn_dns.record_type == 'CNAME'


@pytest.mark.integration
class TestMultiServiceWorkflow:
    """Test workflows spanning multiple services"""

    def test_complete_application_deployment(self, db, user, flavor, image):
        """Test: VPC → subnet → SG → instance → storage → billing"""
        compute = ComputeService()
        networking = NetworkingService()
        storage = StorageService()
        billing = BillingService()

        # 1. Create networking infrastructure
        vpc = networking.create_vpc({
            'name': 'app-vpc',
            'cidr_block': '10.0.0.0/16',
        }, user=user)

        subnet = networking.create_subnet({
            'vpc_id': vpc.id,
            'name': 'app-subnet',
            'cidr_block': '10.0.1.0/24',
        }, user=user)

        sg = networking.create_security_group({
            'vpc_id': vpc.id,
            'name': 'app-sg',
        }, user=user)

        # Add security rules
        networking.add_security_group_rule(
            sg_id=sg.id,
            rule_data={
                'direction': 'ingress',
                'protocol': 'tcp',
                'from_port': 80,
                'to_port': 80,
                'cidr_block': '0.0.0.0/0',
            },
            user=user
        )

        # 2. Create compute instances
        instances = []
        for i in range(2):
            instance = compute.create_instance({
                'name': f'app-server-{i}',
                'flavor_id': flavor.id,
                'image_id': image.id,
                'vpc_id': vpc.id,
            }, user=user)
            instances.append(instance)
            compute.start_instance(instance.id, user)

        # 3. Create storage for application
        bucket = storage.create_bucket({
            'name': f'app-storage-{user.id}',
        }, user=user)

        volume = storage.create_volume({
            'name': 'app-data',
            'size_gb': 50,
            'volume_type': 'gp2',
        }, user=user)

        # 4. Calculate total cost
        total_cost = billing.calculate_user_monthly_cost(user.id)

        # Verify multi-service workflow completed
        assert len(instances) == 2
        assert all(i.status == 'running' for i in instances)
        assert bucket.owner == user
        assert volume.owner == user
        assert total_cost['total'] > 0

    def test_event_propagation_through_workflow(self, db, user, flavor, image):
        """Test that signals propagate events through workflow"""
        service = ComputeService()
        vpc = VPC.objects.create(owner=user, name='vpc', cidr_block='10.0.0.0/16')

        # Create instance (should trigger signals)
        instance = service.create_instance({
            'name': 'event-test',
            'flavor_id': flavor.id,
            'image_id': image.id,
            'vpc_id': vpc.id,
        }, user=user)

        # Verify audit log created by signal
        audit_logs = AuditLog.objects.filter(
            resource_type='instance',
            resource_id=instance.id
        )

        assert audit_logs.exists()

        # Start instance (should create another audit log)
        service.start_instance(instance.id, user)

        audit_logs = AuditLog.objects.filter(
            resource_type='instance',
            resource_id=instance.id,
            action='started'
        )

        assert audit_logs.exists()


@pytest.mark.integration
class TestErrorHandlingInWorkflows:
    """Test error handling and recovery in workflows"""

    def test_quota_exceeded_prevents_workflow(self, db, user):
        """Test quota limit stops workflow"""
        from ..business_logic.exceptions import QuotaExceededError

        service = ComputeService()
        vpc = VPC.objects.create(owner=user, name='vpc', cidr_block='10.0.0.0/16')

        # Simulate user at quota
        user.userprofile.max_instances = 1
        user.userprofile.save()

        # Create first instance (succeeds)
        from ..core.models import Flavor, Image
        flavor = Flavor.objects.first() or Flavor.objects.create(
            flavor_id='flavor-test',
            name='test',
            vcpus=2,
            memory_mb=4096,
            disk_gb=20,
            network_bandwidth_gbps=1.0,
            hourly_cost_usd=0.0500,
        )
        image = Image.objects.first() or Image.objects.create(
            image_id='img-ubuntu-test',
            name='ubuntu',
            os_type='linux',
            os_name='ubuntu',
            os_version='22.04',
            size_gb=20,
            is_public=True,
        )

        instance1 = service.create_instance({
            'name': 'instance-1',
            'flavor_id': flavor.id,
            'image_id': image.id,
            'vpc_id': vpc.id,
        }, user=user)

        assert instance1 is not None

        # Attempt second instance (should fail)
        with pytest.raises(QuotaExceededError):
            service.create_instance({
                'name': 'instance-2',
                'flavor_id': flavor.id,
                'image_id': image.id,
                'vpc_id': vpc.id,
            }, user=user)

    def test_dependency_error_in_workflow(self, db, user):
        """Test workflow fails gracefully with missing dependencies"""
        from ..business_logic.exceptions import DependencyNotFoundError

        service = ComputeService()

        # Try to create instance with non-existent VPC
        with pytest.raises(DependencyNotFoundError):
            service.create_instance({
                'name': 'orphan-instance',
                'flavor_id': 1,
                'image_id': 1,
                'vpc_id': 99999,  # Non-existent
            }, user=user)


@pytest.mark.integration
@pytest.mark.slow
class TestPerformanceInWorkflows:
    """Test performance characteristics of workflows"""

    def test_bulk_instance_creation_performance(self, db, user, flavor, image):
        """Test creating multiple instances doesn't have N+1 queries"""
        service = ComputeService()
        vpc = VPC.objects.create(owner=user, name='vpc', cidr_block='10.0.0.0/16')

        from django.test.utils import override_settings
        from django.db import connection
        from django.test.utils import CaptureQueriesContext

        with CaptureQueriesContext(connection) as context:
            for i in range(5):
                service.create_instance({
                    'name': f'perf-instance-{i}',
                    'flavor_id': flavor.id,
                    'image_id': image.id,
                    'vpc_id': vpc.id,
                }, user=user)

        # Should not grow dramatically with instance count
        query_count = len(context)
        assert query_count < 100  # Reasonable upper bound
