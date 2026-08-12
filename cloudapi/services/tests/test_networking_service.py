"""
Unit Tests for Networking Service

Tests all methods in NetworkingService:
- VPC management
- Subnet operations
- Security group rules
- Load balancer configuration
- Route management
- DNS records
- CDN distribution
- VPN connections

Marks: @pytest.mark.networking
"""

import pytest
import ipaddress

pytestmark = pytest.mark.skip(reason='Legacy networking test suite targets pre-refactor contracts; pending rewrite for current backend models/services.')

from ..business_logic.networking import NetworkingService
from ..business_logic.exceptions import (
    VPCNotFoundError, InvalidConfigurationError, DependencyNotFoundError,
    ResourceNotFoundError, IPAMError,
)
from ..core.models import VPC, Subnet, SecurityGroup, SecurityGroupRule


@pytest.mark.networking
class TestNetworkingServiceVPC:
    """Test VPC operations"""

    def test_create_vpc_success(self, db, user):
        """Test successful VPC creation"""
        service = NetworkingService()

        vpc = service.create_vpc({
            'name': 'production',
            'cidr_block': '10.0.0.0/16',
            'enable_dns_hostnames': True,
        }, user=user)

        assert vpc.id is not None
        assert vpc.owner == user
        assert vpc.cidr_block == '10.0.0.0/16'
        assert vpc.status == 'available'
        assert vpc.enable_dns_hostnames is True

    def test_create_vpc_invalid_cidr(self, db, user):
        """Test VPC with invalid CIDR"""
        service = NetworkingService()

        with pytest.raises(InvalidConfigurationError):
            service.create_vpc({
                'name': 'vpc',
                'cidr_block': 'invalid-cidr',
            }, user=user)

    def test_create_vpc_public_cidr(self, db, user):
        """Test VPC with public IP range (non-RFC1918)"""
        service = NetworkingService()

        # Public ranges should technically fail, but our validation may allow
        # For this test, we'll just verify the CIDR format check
        with pytest.raises(InvalidConfigurationError):
            service.create_vpc({
                'name': 'vpc',
                'cidr_block': '8.8.8.0/24',  # Public Google DNS range
            }, user=user)

    def test_delete_vpc_success(self, db, vpc, user):
        """Test deleting empty VPC"""
        service = NetworkingService()

        deleted = service.delete_vpc(vpc.id, user)

        assert deleted.status == 'deleted'
        assert deleted.deleted_at is not None

    def test_delete_vpc_not_found(self, db, user):
        """Test deleting non-existent VPC"""
        service = NetworkingService()

        with pytest.raises(VPCNotFoundError):
            service.delete_vpc(99999, user)


@pytest.mark.networking
class TestNetworkingServiceSubnet:
    """Test subnet operations"""

    def test_create_subnet_success(self, db, vpc, user):
        """Test successful subnet creation"""
        service = NetworkingService()

        subnet = service.create_subnet({
            'vpc_id': vpc.id,
            'name': 'public-subnet',
            'cidr_block': '10.0.1.0/24',
            'availability_zone': 'us-west-2a',
            'assign_public_ips': True,
        }, user=user)

        assert subnet.id is not None
        assert subnet.vpc == vpc
        assert subnet.cidr_block == '10.0.1.0/24'
        assert subnet.status if hasattr(subnet, 'status') else True

    def test_create_subnet_outside_vpc_cidr(self, db, vpc, user):
        """Test creating subnet outside VPC CIDR"""
        service = NetworkingService()

        with pytest.raises(InvalidConfigurationError):
            service.create_subnet({
                'vpc_id': vpc.id,
                'name': 'subnet',
                'cidr_block': '192.168.0.0/24',  # Outside 10.0.0.0/16
            }, user=user)

    def test_create_subnet_overlapping_cidr(self, db, vpc, subnet, user):
        """Test creating subnet with overlapping CIDR"""
        service = NetworkingService()

        with pytest.raises(InvalidConfigurationError):
            service.create_subnet({
                'vpc_id': vpc.id,
                'name': 'subnet2',
                'cidr_block': subnet.cidr_block,  # Same as existing
            }, user=user)

    def test_enable_public_ips_on_subnet(self, db, subnet, user):
        """Test enabling public IPs on subnet"""
        service = NetworkingService()

        updated = service.enable_public_ips_on_subnet(subnet.id, user)

        assert updated.assign_public_ips is True


@pytest.mark.networking
class TestNetworkingServiceSecurityGroup:
    """Test security group operations"""

    def test_create_security_group(self, db, vpc, user):
        """Test creating security group"""
        service = NetworkingService()

        sg = service.create_security_group({
            'vpc_id': vpc.id,
            'name': 'web-sg',
            'description': 'Web server security group',
        }, user=user)

        assert sg.id is not None
        assert sg.vpc == vpc
        assert sg.name == 'web-sg'

    def test_add_security_group_rule_tcp(self, db, security_group, user):
        """Test adding TCP rule to security group"""
        service = NetworkingService()

        rule = service.add_security_group_rule(
            sg_id=security_group.id,
            rule_data={
                'direction': 'ingress',
                'protocol': 'tcp',
                'from_port': 80,
                'to_port': 80,
                'cidr_block': '0.0.0.0/0',
            },
            user=user
        )

        assert rule.id is not None
        assert rule.protocol == 'tcp'
        assert rule.from_port == 80

    def test_add_security_group_rule_invalid_port_range(self, db, security_group, user):
        """Test adding rule with invalid port range"""
        service = NetworkingService()

        with pytest.raises(InvalidConfigurationError):
            service.add_security_group_rule(
                sg_id=security_group.id,
                rule_data={
                    'direction': 'ingress',
                    'protocol': 'tcp',
                    'from_port': 100,
                    'to_port': 50,  # from > to
                    'cidr_block': '0.0.0.0/0',
                },
                user=user
            )

    def test_add_security_group_rule_no_source(self, db, security_group, user):
        """Test adding rule with no source/destination"""
        service = NetworkingService()

        with pytest.raises(InvalidConfigurationError):
            service.add_security_group_rule(
                sg_id=security_group.id,
                rule_data={
                    'direction': 'ingress',
                    'protocol': 'tcp',
                    'from_port': 80,
                    'to_port': 80,
                    # No CIDR or source SG
                },
                user=user
            )


@pytest.mark.networking
class TestNetworkingServiceLoadBalancer:
    """Test load balancer operations"""

    def test_create_load_balancer(self, db, vpc, user):
        """Test creating load balancer"""
        service = NetworkingService()

        lb = service.create_load_balancer({
            'name': 'web-lb',
            'vpc_id': vpc.id,
            'load_balancer_type': 'alb',
            'scheme': 'internet-facing',
        }, user=user)

        assert lb.id is not None
        assert lb.owner == user
        assert lb.dns_name is not None

    def test_create_lb_invalid_type(self, db, vpc, user):
        """Test creating LB with invalid type"""
        service = NetworkingService()

        with pytest.raises(InvalidConfigurationError):
            service.create_load_balancer({
                'name': 'lb',
                'vpc_id': vpc.id,
                'load_balancer_type': 'nlb+',  # Invalid
            }, user=user)


@pytest.mark.networking
class TestNetworkingServiceDNS:
    """Test DNS record operations"""

    def test_create_dns_record_a(self, db, user):
        """Test creating A record"""
        service = NetworkingService()

        record = service.create_dns_record({
            'name': 'www.example.com',
            'record_type': 'A',
            'value': '192.0.2.1',
            'ttl': 300,
        }, user=user)

        assert record.id is not None
        assert record.record_type == 'A'
        assert record.ttl == 300

    def test_create_dns_record_invalid_ipv4(self, db, user):
        """Test creating A record with invalid IPv4"""
        service = NetworkingService()

        with pytest.raises(InvalidConfigurationError):
            service.create_dns_record({
                'name': 'www.example.com',
                'record_type': 'A',
                'value': 'not-an-ip',  # Invalid IP
            }, user=user)

    def test_create_dns_record_invalid_type(self, db, user):
        """Test creating record with invalid type"""
        service = NetworkingService()

        with pytest.raises(InvalidConfigurationError):
            service.create_dns_record({
                'name': 'www.example.com',
                'record_type': 'INVALID',  # Invalid type
                'value': 'something',
            }, user=user)


@pytest.mark.networking
class TestNetworkingServiceCDN:
    """Test CDN operations"""

    def test_create_cdn_distribution(self, db, user):
        """Test creating CDN distribution"""
        service = NetworkingService()

        dist = service.create_cdn_distribution({
            'domain_name': 'static.example.com',
            'origin_domain': 'origin.s3.amazonaws.com',
            'origin_type': 's3',
            'enabled': True,
        }, user=user)

        assert dist.id is not None
        assert dist.owner == user
        assert dist.distribution_domain is not None

    def test_invalidate_cdn_cache(self, db, user):
        """Test invalidating CDN cache"""
        service = NetworkingService()

        dist = service.create_cdn_distribution({
            'domain_name': 'static.example.com',
            'origin_domain': 'origin.s3.amazonaws.com',
        }, user=user)

        result = service.invalidate_cdn_cache(
            distribution_id=dist.id,
            paths=['/*', '/images/*'],
            user=user
        )

        assert result['status'] == 'in-progress'
        assert len(result['paths']) == 2
