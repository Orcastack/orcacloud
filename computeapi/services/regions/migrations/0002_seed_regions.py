"""
Seed the initial CloudRegion and AvailabilityZone records.

Regions match the platform homepage listing:
  North America (US East, US West), Europe (EU West, EU Central),
  Asia Pacific (AP Southeast, AP Northeast)
"""
from django.db import migrations


INITIAL_REGIONS = [
    {
        'code': 'us-east-1',
        'name': 'US East (N. Virginia)',
        'country': 'United States',
        'city': 'Ashburn',
        'continent': 'North America',
        'latitude': 39.0438,
        'longitude': -77.4874,
        'is_default': True,
        'uptime_30d_pct': 99.99,
        'latency_ms': 12.0,
        'enabled_services': ['compute', 'storage', 'database', 'kubernetes', 'networking', 'cdn'],
        'api_endpoint': 'https://api-us-east-1.orcacloud.com',
        'zones': ['a', 'b', 'c'],
    },
    {
        'code': 'us-west-2',
        'name': 'US West (Oregon)',
        'country': 'United States',
        'city': 'Portland',
        'continent': 'North America',
        'latitude': 45.5231,
        'longitude': -122.6765,
        'uptime_30d_pct': 99.98,
        'latency_ms': 18.0,
        'enabled_services': ['compute', 'storage', 'database', 'kubernetes', 'networking', 'cdn'],
        'api_endpoint': 'https://api-us-west-2.orcacloud.com',
        'zones': ['a', 'b', 'c'],
    },
    {
        'code': 'eu-west-1',
        'name': 'EU West (Ireland)',
        'country': 'Ireland',
        'city': 'Dublin',
        'continent': 'Europe',
        'latitude': 53.3498,
        'longitude': -6.2603,
        'uptime_30d_pct': 99.97,
        'latency_ms': 21.0,
        'enabled_services': ['compute', 'storage', 'database', 'kubernetes', 'networking'],
        'api_endpoint': 'https://api-eu-west-1.orcacloud.com',
        'zones': ['a', 'b', 'c'],
    },
    {
        'code': 'eu-central-1',
        'name': 'EU Central (Frankfurt)',
        'country': 'Germany',
        'city': 'Frankfurt',
        'continent': 'Europe',
        'latitude': 50.1109,
        'longitude': 8.6821,
        'uptime_30d_pct': 99.99,
        'latency_ms': 19.0,
        'enabled_services': ['compute', 'storage', 'database', 'kubernetes', 'networking', 'cdn'],
        'api_endpoint': 'https://api-eu-central-1.orcacloud.com',
        'zones': ['a', 'b', 'c'],
    },
    {
        'code': 'ap-southeast-1',
        'name': 'AP Southeast (Singapore)',
        'country': 'Singapore',
        'city': 'Singapore',
        'continent': 'Asia Pacific',
        'latitude': 1.3521,
        'longitude': 103.8198,
        'uptime_30d_pct': 99.95,
        'latency_ms': 28.0,
        'enabled_services': ['compute', 'storage', 'database', 'kubernetes', 'networking'],
        'api_endpoint': 'https://api-ap-southeast-1.orcacloud.com',
        'zones': ['a', 'b'],
    },
    {
        'code': 'ap-northeast-1',
        'name': 'AP Northeast (Tokyo)',
        'country': 'Japan',
        'city': 'Tokyo',
        'continent': 'Asia Pacific',
        'latitude': 35.6762,
        'longitude': 139.6503,
        'uptime_30d_pct': 99.98,
        'latency_ms': 24.0,
        'enabled_services': ['compute', 'storage', 'database', 'kubernetes', 'networking', 'cdn'],
        'api_endpoint': 'https://api-ap-northeast-1.orcacloud.com',
        'zones': ['a', 'b', 'c'],
    },
]


def seed_regions(apps, schema_editor):
    CloudRegion = apps.get_model('regions', 'CloudRegion')
    AvailabilityZone = apps.get_model('regions', 'AvailabilityZone')

    for r in INITIAL_REGIONS:
        zones = r.pop('zones', [])
        region, created = CloudRegion.objects.get_or_create(
            code=r['code'],
            defaults=r,
        )
        for zone_code in zones:
            AvailabilityZone.objects.get_or_create(
                region=region,
                code=zone_code,
                defaults={'name': f"{region.code}{zone_code}", 'status': 'available'},
            )
        # Restore zones key for idempotency
        r['zones'] = zones


def unseed_regions(apps, schema_editor):
    CloudRegion = apps.get_model('regions', 'CloudRegion')
    CloudRegion.objects.filter(code__in=[r['code'] for r in INITIAL_REGIONS]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('regions', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(seed_regions, unseed_regions),
    ]
