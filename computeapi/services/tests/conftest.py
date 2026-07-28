"""
Test Configuration and Fixtures for OrcaCloud Services

Provides:
- Pytest configuration
- Django test setup
- Reusable fixtures for tests
- Factory functions for test data

Usage:
    def test_something(db, user, django_db_setup):
        instance = create_test_instance(user, name='test-vm')
        assert instance.owner == user
"""

import pytest
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import datetime, timedelta


# ========== USER FIXTURES ==========

@pytest.fixture
def user(db):
    """Create a test user"""
    return User.objects.create_user(
        username='testuser',
        email='test@example.com',
        password='testpass123'
    )


@pytest.fixture
def admin_user(db):
    """Create a test admin user"""
    return User.objects.create_superuser(
        username='admin',
        email='admin@example.com',
        password='adminpass123'
    )


@pytest.fixture
def user_with_quota(db):
    """Create user with custom quota profile"""
    from ..core.models import UserProfile
    user = User.objects.create_user(
        username='quota_user',
        email='quota@example.com',
        password='pass'
    )
    profile = UserProfile.objects.create(
        user=user,
        max_instances=100,
        max_storage_gb=10000,
        max_networks=20,
    )
    return user


# ========== COMPUTE FIXTURES ==========

@pytest.fixture
def flavor(db):
    """Create a test VM flavor"""
    from ..core.models import Flavor
    return Flavor.objects.create(
        flavor_id='1',
        name='m5.large',
        vcpus=2,
        memory_mb=8192,
        disk_gb=100,
        network_bandwidth_gbps=1.0,
        hourly_cost_usd=0.096,
    )


@pytest.fixture
def image(db):
    """Create a test OS image"""
    from ..core.models import Image
    return Image.objects.create(
        image_id='1',
        name='ubuntu-22.04-lts',
        os_type='linux',
        os_name='ubuntu',
        os_version='22.04',
        size_gb=30,
        is_public=True,
    )


@pytest.fixture(autouse=True)
def seed_default_compute_catalog(db):
    """Ensure legacy tests using flavor_id=1/image_id=1 always have catalog data."""
    from ..core.models import Flavor, Image

    Flavor.objects.get_or_create(
        flavor_id='1',
        defaults={
            'name': 'm5.large',
            'vcpus': 2,
            'memory_mb': 8192,
            'disk_gb': 100,
            'network_bandwidth_gbps': 1.0,
            'hourly_cost_usd': 0.096,
        },
    )

    Image.objects.get_or_create(
        image_id='1',
        defaults={
            'name': 'ubuntu-22.04-lts',
            'os_type': 'linux',
            'os_name': 'ubuntu',
            'os_version': '22.04',
            'size_gb': 30,
            'is_public': True,
        },
    )


@pytest.fixture
def instance(db, user, flavor, image):
    """Create a test instance"""
    from ..core.models import Instance, VPC
    vpc = VPC.objects.create(
        name='test-vpc',
        owner=user,
        cidr_block='10.0.0.0/16',
    )
    return Instance.objects.create(
        name='test-instance',
        instance_id='i-test-instance-001',
        owner=user,
        flavor=flavor,
        image=image,
        status='running',
        vpc_id=str(vpc.id),
        private_ip='10.0.0.10',
        public_ip='203.0.113.10',
    )


# ========== STORAGE FIXTURES ==========

@pytest.fixture
def storage_bucket(db, user):
    """Create a test storage bucket"""
    from ..core.models import StorageBucket
    return StorageBucket.objects.create(
        bucket_name='test-bucket',
        owner=user,
        region='us-west-2',
        status='active',
        encryption_enabled=True,
        public_read_access=False,
    )


@pytest.fixture
def storage_volume(db, user):
    """Create a test storage volume"""
    from ..core.models import StorageVolume
    return StorageVolume.objects.create(
        name='test-volume',
        owner=user,
        size_gb=100,
        volume_type='gp2',
        status='available',
        availability_zone='us-west-2a',
        iops=100,
        throughput_mbps=125,
        encrypted=True,
    )


@pytest.fixture
def backup_policy(db, user, storage_volume):
    """Create a test backup policy"""
    from ..core.models import BackupPolicy
    return BackupPolicy.objects.create(
        name='daily-backup',
        owner=user,
        schedule='daily',
        retention_days=30,
        enabled=True,
        volume_ids=[storage_volume.id],
    )


# ========== NETWORKING FIXTURES ==========

@pytest.fixture
def vpc(db, user):
    """Create a test VPC"""
    from ..core.models import VPC
    return VPC.objects.create(
        name='test-vpc',
        owner=user,
        cidr_block='10.0.0.0/16',
        region='us-west-2',
        enable_dns_hostnames=True,
        enable_dns_support=True,
        status='available',
    )


@pytest.fixture
def subnet(db, vpc):
    """Create a test subnet"""
    from ..core.models import Subnet
    return Subnet.objects.create(
        vpc=vpc,
        name='test-subnet',
        cidr_block='10.0.1.0/24',
        availability_zone='us-west-2a',
        assign_public_ips=False,
        available_ips=251,
    )


@pytest.fixture
def security_group(db, vpc, user):
    """Create a test security group"""
    from ..core.models import SecurityGroup
    return SecurityGroup.objects.create(
        name='test-sg',
        owner=user,
        vpc=vpc,
        description='Test security group',
    )


@pytest.fixture
def load_balancer(db, vpc, user):
    """Create a test load balancer"""
    from ..core.models import LoadBalancer
    return LoadBalancer.objects.create(
        name='test-lb',
        owner=user,
        vpc=vpc,
        load_balancer_type='alb',
        scheme='internet-facing',
        enable_deletion_protection=False,
        dns_name='test-lb.elb.amazonaws.com',
    )


# ========== HELPER FUNCTIONS ==========

def create_test_instance(user, flavor=None, image=None, name='test-instance', **kwargs):
    """Helper function to create test instance with defaults"""
    from ..core.models import Instance, Flavor, Image, VPC

    if not flavor:
        flavor, _ = Flavor.objects.get_or_create(
            flavor_id='flavor-t3-micro',
            defaults={
                'name': 't3.micro',
                'vcpus': 1,
                'memory_mb': 1024,
                'disk_gb': 20,
                'network_bandwidth_gbps': 0.5,
                'hourly_cost_usd': 0.0200,
            }
        )

    if not image:
        image, _ = Image.objects.get_or_create(
            image_id='img-ubuntu-2204-default',
            defaults={
                'name': 'ubuntu-22.04-lts',
                'os_type': 'linux',
                'os_name': 'ubuntu',
                'os_version': '22.04',
                'size_gb': 30,
                'is_public': True,
            }
        )

    vpc = VPC.objects.create(
        name=f'vpc-{name}',
        owner=user,
        cidr_block='10.0.0.0/16',
    )

    vpc_ref = kwargs.pop('vpc', None)
    return Instance.objects.create(
        name=name,
        instance_id=kwargs.pop('instance_id', f'i-{name}'),
        owner=user,
        flavor=flavor,
        image=image,
        status='running',
        vpc_id=str((vpc_ref.id if vpc_ref is not None else vpc.id)),
        private_ip='10.0.0.10',
        **kwargs
    )


def create_test_volume(user, name='test-volume', size_gb=100, **kwargs):
    """Helper function to create test volume with defaults"""
    from ..core.models import StorageVolume

    return StorageVolume.objects.create(
        name=name,
        owner=user,
        size_gb=size_gb,
        volume_type='gp2',
        status='available',
        iops=100,
        throughput_mbps=125,
        **kwargs
    )


def create_test_vpc(user, name='test-vpc', cidr_block='10.0.0.0/16', **kwargs):
    """Helper function to create test VPC with defaults"""
    from ..core.models import VPC

    return VPC.objects.create(
        name=name,
        owner=user,
        cidr_block=cidr_block,
        region='us-west-2',
        status='available',
        **kwargs
    )


# ========== MARKERS ==========

def pytest_configure(config):
    """Register custom markers"""
    config.addinivalue_line(
        "markers", "compute: mark test as related to compute service"
    )
    config.addinivalue_line(
        "markers", "storage: mark test as related to storage service"
    )
    config.addinivalue_line(
        "markers", "networking: mark test as related to networking service"
    )
    config.addinivalue_line(
        "markers", "billing: mark test as related to billing service"
    )
    config.addinivalue_line(
        "markers", "slow: mark test as slow running"
    )
    config.addinivalue_line(
        "markers", "integration: mark test as integration test"
    )
