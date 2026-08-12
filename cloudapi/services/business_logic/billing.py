"""
Billing Service Business Logic

Handles cost calculation and billing operations:
- Resource pricing and cost calculation
- Usage aggregation and reporting
- Billing cycle management
- Invoice generation
- Cost forecasting
"""

from datetime import datetime, timedelta
from decimal import Decimal
from django.utils import timezone
from django.db.models import Sum, Count, Q

from ..core.models import (
    Instance, StorageBucket, StorageVolume, FileShare,
    LoadBalancer, KubernetesCluster, ServerlessFunction,
)


class BillingService:
    """Service for calculating and managing billing"""

    # Hourly pricing rates for resources (in USD)
    PRICING = {
        'compute': {
            'instance': {
                't3.micro': 0.0104,
                't3.small': 0.0208,
                't3.medium': 0.0416,
                'm5.large': 0.096,
                'm5.xlarge': 0.192,
                'c5.large': 0.085,
                'c5.xlarge': 0.17,
                'r5.large': 0.126,
                'r5.xlarge': 0.252,
                'g4dn.xlarge': 0.526,  # With GPU
            },
            'kubernetes': {
                'base': 0.10,  # Per cluster per hour
                'node': 0.05,  # Per node per hour
            },
            'serverless': {
                'invocation': 0.0000002,  # Per invocation
                'compute': 0.0000166667,  # Per GB-second
            },
        },
        'storage': {
            'bucket': {
                'standard': 0.023,  # Per GB per month
                'glacier': 0.004,
                'deep_archive': 0.00099,
            },
            'volume': {
                'gp2': 0.1,  # Per GB per month
                'gp3': 0.08,
                'io1': 0.125,
                'io2': 0.125,
            },
            'snapshot': 0.023,  # Per GB per month
            'data_transfer': 0.02,  # Per GB out
        },
        'networking': {
            'load_balancer': 0.0225,  # Per hour
            'load_balancer_capacity_unit': 0.006,  # Per LCU per hour
            'nat_gateway': 0.045,  # Per hour
            'vpn': 0.05,  # Per hour
            'data_transfer': 0.02,  # Per GB inter-region
        },
    }

    def __init__(self):
        """Initialize billing service"""
        self.current_time = timezone.now()

    def calculate_instance_cost(self, instance, hours=None):
        """
        Calculate cost for an instance.

        Args:
            instance: Instance object
            hours: Number of hours to calculate (default uses running time)

        Returns:
            Decimal: Cost in USD
        """
        if not hours:
            if instance.started_at and instance.stopped_at:
                hours = (instance.stopped_at - instance.started_at).total_seconds() / 3600
            elif instance.started_at:
                hours = (self.current_time - instance.started_at).total_seconds() / 3600
            else:
                hours = 0

        hourly_rate = Decimal(
            self.PRICING['compute']['instance'].get(instance.flavor.instance_type, 0.1)
        )
        cost = hourly_rate * Decimal(str(hours))

        return cost

    def calculate_storage_bucket_cost(self, bucket, days=30):
        """
        Calculate cost for a storage bucket.

        Args:
            bucket: StorageBucket object
            days: Number of days to calculate (default 30)

        Returns:
            Decimal: Cost in USD
        """
        # Estimate monthly size in GB
        if bucket.total_size_bytes:
            size_gb = bucket.total_size_bytes / (1024**3)
        else:
            size_gb = 0

        # Get pricing based on storage class
        monthly_rate = Decimal(
            self.PRICING['storage']['bucket'].get(bucket.default_storage_class, 0.023)
        )

        # Prorate for number of days
        daily_cost = (monthly_rate * Decimal(str(size_gb))) / 30
        total_cost = daily_cost * Decimal(str(days))

        return total_cost

    def calculate_volume_cost(self, volume, days=30):
        """
        Calculate cost for a storage volume.

        Args:
            volume: StorageVolume object
            days: Number of days to calculate

        Returns:
            Decimal: Cost in USD
        """
        monthly_rate = Decimal(
            self.PRICING['storage']['volume'].get(volume.volume_type, 0.1)
        )

        daily_cost = (monthly_rate * Decimal(str(volume.size_gb))) / 30
        total_cost = daily_cost * Decimal(str(days))

        # Add IOPS cost if applicable
        if volume.volume_type in ['io1', 'io2'] and volume.iops:
            iops_rate = Decimal('0.065')  # Per provisioned IOPS
            iops_cost = iops_rate * Decimal(str(volume.iops)) * Decimal(str(days))
            total_cost += iops_cost

        return total_cost

    def calculate_load_balancer_cost(self, load_balancer, days=30):
        """
        Calculate cost for a load balancer.

        Args:
            load_balancer: LoadBalancer object
            days: Number of days to calculate

        Returns:
            Decimal: Cost in USD
        """
        # Base hourly cost
        hourly_cost = Decimal(self.PRICING['networking']['load_balancer'])

        # Convert to daily and then to provided period
        daily_cost = hourly_cost * 24
        total_cost = daily_cost * Decimal(str(days))

        return total_cost

    def calculate_kubernetes_cluster_cost(self, cluster, days=30):
        """
        Calculate cost for a Kubernetes cluster.

        Args:
            cluster: KubernetesCluster object
            days: Number of days to calculate

        Returns:
            Decimal: Cost in USD (cluster base + nodes)
        """
        # Base cluster cost
        cluster_rate = Decimal(self.PRICING['compute']['kubernetes']['base'])
        daily_cluster_cost = cluster_rate * 24 * Decimal(str(days))

        # Node costs (use node instance costs)
        node_rate = Decimal(self.PRICING['compute']['kubernetes']['node'])
        daily_node_cost = node_rate * cluster.node_count * 24 * Decimal(str(days))

        total_cost = daily_cluster_cost + daily_node_cost

        return total_cost

    def calculate_serverless_function_cost(self, function, days=30):
        """
        Calculate cost for a serverless function.

        Args:
            function: ServerlessFunction object
            days: Number of days to calculate

        Returns:
            Decimal: Cost in USD (based on invocation count and compute time)
        """
        # Estimate average invocations per day
        daily_invocations = max(1, function.invocations / max(1, days))

        # Invocation cost
        invocation_rate = Decimal(self.PRICING['compute']['serverless']['invocation'])
        invocation_cost = invocation_rate * Decimal(str(daily_invocations * days))

        # Compute cost (estimate 100ms average execution)
        compute_rate = Decimal(self.PRICING['compute']['serverless']['compute'])
        # GB-seconds = (memory_mb / 1024) * (avg_execution_time_ms / 1000)
        gb_seconds_per_invocation = (Decimal(str(function.memory_mb)) / 1024) * Decimal('0.1')  # 100ms
        compute_cost = compute_rate * gb_seconds_per_invocation * Decimal(str(daily_invocations * days))

        total_cost = invocation_cost + compute_cost

        return total_cost

    def calculate_user_monthly_cost(self, user, year=None, month=None):
        """
        Calculate total monthly cost for a user.

        Args:
            user: User object
            year: Year (default current)
            month: Month (default current)

        Returns:
            Dict with cost breakdown by service
        """
        if not year:
            year = self.current_time.year
        if not month:
            month = self.current_time.month

        # Calculate number of days in month
        if month == 12:
            next_month = datetime(year + 1, 1, 1)
        else:
            next_month = datetime(year, month + 1, 1)
        current_month = datetime(year, month, 1)
        days_in_month = (next_month - current_month).days

        costs = {
            'compute': {
                'instances': Decimal('0'),
                'kubernetes': Decimal('0'),
                'serverless': Decimal('0'),
                'subtotal': Decimal('0'),
            },
            'storage': {
                'buckets': Decimal('0'),
                'volumes': Decimal('0'),
                'snapshots': Decimal('0'),
                'subtotal': Decimal('0'),
            },
            'networking': {
                'load_balancers': Decimal('0'),
                'nat_gateways': Decimal('0'),
                'vpn': Decimal('0'),
                'subtotal': Decimal('0'),
            },
            'total': Decimal('0'),
        }

        # Calculate instance costs
        instances = Instance.objects.filter(owner=user).exclude(status='terminated')
        for instance in instances:
            cost = self.calculate_instance_cost(instance, days_in_month * 24)
            costs['compute']['instances'] += cost

        # Calculate storage bucket costs
        buckets = StorageBucket.objects.filter(owner=user).exclude(status='deleted')
        for bucket in buckets:
            cost = self.calculate_storage_bucket_cost(bucket, days_in_month)
            costs['storage']['buckets'] += cost

        # Calculate volume costs
        volumes = StorageVolume.objects.filter(owner=user).exclude(status='deleted')
        for volume in volumes:
            cost = self.calculate_volume_cost(volume, days_in_month)
            costs['storage']['volumes'] += cost

        # Calculate load balancer costs
        load_balancers = LoadBalancer.objects.filter(owner=user)
        for lb in load_balancers:
            cost = self.calculate_load_balancer_cost(lb, days_in_month)
            costs['networking']['load_balancers'] += cost

        # Calculate Kubernetes costs
        clusters = KubernetesCluster.objects.filter(owner=user).exclude(status='deleted')
        for cluster in clusters:
            cost = self.calculate_kubernetes_cluster_cost(cluster, days_in_month)
            costs['compute']['kubernetes'] += cost

        # Calculate serverless costs
        functions = ServerlessFunction.objects.filter(owner=user)
        for function in functions:
            cost = self.calculate_serverless_function_cost(function, days_in_month)
            costs['compute']['serverless'] += cost

        # Calculate subtotals
        costs['compute']['subtotal'] = (
            costs['compute']['instances'] +
            costs['compute']['kubernetes'] +
            costs['compute']['serverless']
        )

        costs['storage']['subtotal'] = (
            costs['storage']['buckets'] +
            costs['storage']['volumes'] +
            costs['storage']['snapshots']
        )

        costs['networking']['subtotal'] = (
            costs['networking']['load_balancers'] +
            costs['networking']['nat_gateways'] +
            costs['networking']['vpn']
        )

        costs['total'] = (
            costs['compute']['subtotal'] +
            costs['storage']['subtotal'] +
            costs['networking']['subtotal']
        )

        return costs

    def estimate_monthly_cost(self, user):
        """
        Estimate monthly cost based on current usage.

        Args:
            user: User object

        Returns:
            Dict with estimated monthly cost breakdown
        """
        return self.calculate_user_monthly_cost(user)

    def calculate_cost_forecast(self, user, months=3):
        """
        Forecast costs for the next N months.

        Args:
            user: User object
            months: Number of months to forecast

        Returns:
            List of Dict with monthly forecast
        """
        forecasts = []
        current_date = self.current_time

        for i in range(months):
            if current_date.month + i > 12:
                year = current_date.year + 1
                month = (current_date.month + i) % 12
            else:
                year = current_date.year
                month = current_date.month + i

            costs = self.calculate_user_monthly_cost(user, year, month)
            forecasts.append({
                'year': year,
                'month': month,
                'month_name': datetime(year, month, 1).strftime('%B'),
                'costs': costs,
            })

        return forecasts
