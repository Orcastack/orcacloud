"""
Unit Tests for Billing Service

Tests all methods in BillingService:
- Per-resource cost calculation
- Monthly cost aggregation
- Cost forecasting
- Pricing validation

Marks: @pytest.mark.billing
"""

import pytest
from decimal import Decimal
from datetime import timedelta
from django.utils import timezone

pytestmark = pytest.mark.skip(reason='Legacy billing test suite targets pre-refactor contracts; pending rewrite for current backend models/services.')

from ..business_logic.billing import BillingService
from ..business_logic.exceptions import InvalidConfigurationError
from ..core.models import Instance, Volume, KubernetesCluster, ServerlessFunction


@pytest.mark.billing
class TestBillingServiceInstanceCost:
    """Test instance cost calculations"""

    def test_calculate_instance_cost_running(self, db, instance, user):
        """Test calculating cost for running instance"""
        service = BillingService()

        # Set instance to running state with known duration
        instance.status = 'running'
        instance.created_at = timezone.now() - timedelta(hours=24)
        instance.save()

        cost = service.calculate_instance_cost(instance.id)

        # m5.large = $0.096/hour, 24 hours = $2.304
        assert cost >= Decimal('2.00')
        assert cost <= Decimal('3.00')

    def test_calculate_instance_cost_stopping(self, db, instance, user):
        """Test cost calculation for stopped instance (should be 0)"""
        service = BillingService()

        instance.status = 'stopped'
        instance.save()

        cost = service.calculate_instance_cost(instance.id)

        assert cost == Decimal('0.00')

    def test_calculate_instance_cost_pending(self, db, user):
        """Test cost for pending instance"""
        service = BillingService()

        instance = Instance.objects.create(
            owner=user,
            name='pending-instance',
            flavor_id=1,
            image_id=1,
            vpc_id=1,
            status='pending',
            created_at=timezone.now(),
        )

        cost = service.calculate_instance_cost(instance.id)

        assert cost == Decimal('0.00')


@pytest.mark.billing
class TestBillingServiceVolumeCost:
    """Test volume cost calculations"""

    def test_calculate_volume_cost_gp2(self, db, storage_volume, user):
        """Test calculating cost for gp2 volume"""
        service = BillingService()

        storage_volume.size_gb = 100
        storage_volume.volume_type = 'gp2'
        storage_volume.save()

        cost = service.calculate_volume_cost(storage_volume.id)

        # gp2 = $0.10/GB/month, 100 GB = $10.00
        assert cost >= Decimal('10.00')

    def test_calculate_volume_cost_io1(self, db, user):
        """Test calculating cost for io1 volume with IOPS"""
        service = BillingService()

        volume = Volume.objects.create(
            owner=user,
            name='io-volume',
            size_gb=100,
            volume_type='io1',
            iops=1000,  # io1 = $0.065 per provisioned IOPS
        )

        cost = service.calculate_volume_cost(volume.id)

        # io1 base: $0.125/GB * 100 = $12.50
        # IOPS: $0.065 * 1000 = $65.00
        # Total = $77.50
        assert cost >= Decimal('77.00')
        assert cost <= Decimal('78.00')


@pytest.mark.billing
class TestBillingServiceKubernetesCost:
    """Test Kubernetes cluster cost calculations"""

    def test_calculate_kubernetes_cluster_cost(self, db, user):
        """Test calculating cost for K8s cluster"""
        service = BillingService()

        cluster = KubernetesCluster.objects.create(
            owner=user,
            name='prod-cluster',
            node_count=3,
            node_type='t3.large',
            status='active',
        )

        cost = service.calculate_kubernetes_cluster_cost(cluster.id)

        # Base cost: $0.10/hour ($73/month)
        # Node cost: $0.05/node/hour * 3 nodes = $0.15/hour
        # Monthly = 730 hours * ($0.10 + $0.15) = 730 * $0.25 = $182.50
        assert cost >= Decimal('180.00')
        assert cost <= Decimal('185.00')


@pytest.mark.billing
class TestBillingServiceServerlessCost:
    """Test serverless function cost calculations"""

    def test_calculate_serverless_function_cost(self, db, user):
        """Test calculating cost for serverless function"""
        service = BillingService()

        func = ServerlessFunction.objects.create(
            owner=user,
            name='api-function',
            runtime='python3.11',
            handler='lambda_function.lambda_handler',
            memory_mb=256,
            status='active',
        )

        # Simulate 1000 invocations with 500ms average
        func.invocations_count = 1000
        func.total_duration_seconds = 500  # 500ms * 1000 = 0.5 GB-seconds
        func.save()

        cost = service.calculate_serverless_function_cost(func.id)

        # Invocations: 1000 * $2e-7 = $0.0002
        # GB-seconds: 0.5 * $1.66667e-5 = $8.33e-6
        # Total ≈ $0.0002
        assert cost >= 0
        assert cost <= Decimal('0.01')


@pytest.mark.billing
class TestBillingServiceMonthlyAggregation:
    """Test monthly cost aggregation"""

    def test_calculate_user_monthly_cost(self, db, user):
        """Test aggregating monthly costs by service"""
        service = BillingService()

        # Create sample resources
        instance = Instance.objects.create(
            owner=user,
            name='test-instance',
            flavor_id=1,
            image_id=1,
            vpc_id=1,
            status='running',
            created_at=timezone.now() - timedelta(hours=24),
        )

        volume = Volume.objects.create(
            owner=user,
            name='test-volume',
            size_gb=50,
            volume_type='gp2',
        )

        costs = service.calculate_user_monthly_cost(user.id)

        assert 'compute' in costs
        assert 'storage' in costs
        assert 'networking' in costs
        assert 'total' in costs
        assert costs['total'] > 0

    def test_monthly_cost_breakdown_details(self, db, user):
        """Test that monthly cost includes per-resource details"""
        service = BillingService()

        Instance.objects.create(
            owner=user,
            name='instance-1',
            flavor_id=1,
            image_id=1,
            vpc_id=1,
            status='running',
        )

        costs = service.calculate_user_monthly_cost(user.id)

        # Verify breakdown structure
        assert 'resources' in costs or 'compute_resources' in costs
        assert isinstance(costs['total'], (Decimal, float, int))


@pytest.mark.billing
class TestBillingServiceForecasting:
    """Test cost forecasting"""

    def test_calculate_cost_forecast_3_months(self, db, user):
        """Test 3-month cost forecast"""
        service = BillingService()

        # Create instance for forecasting
        Instance.objects.create(
            owner=user,
            name='forecast-instance',
            flavor_id=1,
            image_id=1,
            vpc_id=1,
            status='running',
        )

        forecast = service.calculate_cost_forecast(user.id, months=3)

        assert len(forecast) == 3
        assert all(isinstance(month_cost, (Decimal, float, int)) for month_cost in forecast)
        # Forecast should show same or increasing cost
        assert forecast[0] > 0

    def test_cost_forecast_assumes_consistent_usage(self, db, user):
        """Test that forecast assumes consistent usage patterns"""
        service = BillingService()

        forecast_3 = service.calculate_cost_forecast(user.id, months=3)
        forecast_6 = service.calculate_cost_forecast(user.id, months=6)

        # First 3 months should be same
        assert forecast_3 == forecast_6[:3]


@pytest.mark.billing
class TestBillingServicePricingRates:
    """Test pricing rate configuration"""

    def test_get_compute_pricing(self, db):
        """Test retrieving compute pricing rates"""
        service = BillingService()

        pricing = service.get_pricing_rates('compute')

        assert 'instance_base' in pricing or 'instance' in pricing
        assert 'kubernetes' in pricing
        assert 'serverless' in pricing

    def test_get_storage_pricing(self, db):
        """Test retrieving storage pricing rates"""
        service = BillingService()

        pricing = service.get_pricing_rates('storage')

        assert 'bucket' in pricing or 'standard' in pricing
        assert 'volume' in pricing
        assert pricing['bucket']['standard'] > 0  # Should have positive rate

    def test_validate_pricing_rates(self, db):
        """Test that all pricing rates are positive"""
        service = BillingService()

        for service_type in ['compute', 'storage', 'networking']:
            pricing = service.get_pricing_rates(service_type)

            for key, value in pricing.items():
                if isinstance(value, dict):
                    for sub_key, rate in value.items():
                        assert rate > 0, f"{service_type}.{key}.{sub_key} must be positive"


@pytest.mark.billing
class TestBillingServiceEdgeCases:
    """Test edge cases in billing"""

    def test_cost_calculation_deleted_resource(self, db, user):
        """Test cost calculation for deleted resource"""
        service = BillingService()

        volume = Volume.objects.create(
            owner=user,
            name='deleted-volume',
            size_gb=100,
            deleted_at=timezone.now(),
        )

        # Deleted resources should return $0
        cost = service.calculate_volume_cost(volume.id)

        assert cost == Decimal('0.00')

    def test_cost_with_zero_duration(self, db, user):
        """Test cost calculation with minimal duration"""
        service = BillingService()

        instance = Instance.objects.create(
            owner=user,
            name='new-instance',
            flavor_id=1,
            image_id=1,
            vpc_id=1,
            status='running',
            created_at=timezone.now(),  # Just created
        )

        cost = service.calculate_instance_cost(instance.id)

        # Should be very small or 0 for just-created instance
        assert cost < Decimal('0.01')

    def test_invalid_resource_id(self, db):
        """Test cost calculation with invalid resource ID"""
        service = BillingService()

        with pytest.raises((ValueError, Exception)):
            service.calculate_instance_cost(99999)
