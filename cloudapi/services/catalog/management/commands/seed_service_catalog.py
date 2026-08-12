"""
Management command: seed_service_catalog

Populates ServiceCatalogEntry with the canonical OrcaCloud service list
for public, private, and hybrid cloud types.

Usage:
    python manage.py seed_service_catalog
    python manage.py seed_service_catalog --reset   # wipe and re-seed
"""
from django.core.management.base import BaseCommand

from services.catalog.models import ServiceCatalogEntry


# ────────────────────────────────────────────────────────────────────────────
# Canonical service table
# Each row: (cloud_type, service_slug, display_name, category,
#            openstack_service, description, is_billable, constraints)
# ────────────────────────────────────────────────────────────────────────────
CATALOG = [
    # ── Public Cloud ─────────────────────────────────────────────────────────
    ("public", "keystone",   "Identity & Access",     "identity",      "keystone",   "Unified Keystone auth via LDAP/SAML/OIDC federation", True,  {}),
    ("public", "nova",       "Virtual Machines",      "compute",       "nova",       "On-demand VM provisioning with live migration",        True,  {"max_vcpus": 256}),
    ("public", "cinder",     "Block Storage",         "storage",       "cinder",     "Persistent block volumes backed by Ceph RBD",          True,  {"max_volume_gb": 10000}),
    ("public", "glance",     "Image Registry",        "storage",       "glance",     "VM image catalogue with Ceph backend",                 True,  {}),
    ("public", "neutron",    "Networking",            "networking",    "neutron",    "Tenant VPC, subnets, security groups via ML2/VXLAN",   True,  {}),
    ("public", "swift",      "Object Storage",        "object",        "swift",      "Multi-tenant object storage (Swift / Ceph RGW)",       True,  {"max_objects": 1000000}),
    ("public", "octavia",    "Load Balancing",        "dns",           "octavia",    "L4/L7 load balancer-as-a-service",                     True,  {}),
    ("public", "designate",  "DNS Automation",        "dns",           "designate",  "Managed DNS zones integrated with Octavia",            True,  {}),
    ("public", "gnocchi",    "Metrics & Telemetry",   "monitoring",    "gnocchi",    "Time-series resource usage metrics",                   False, {}),
    ("public", "ceilometer", "Usage Metering",        "monitoring",    "ceilometer", "Billing-grade resource usage collection",              False, {}),
    ("public", "magnum",     "Kubernetes Clusters",   "container",     "magnum",     "COE cluster lifecycle via OpenStack Magnum",           True,  {}),
    ("public", "trove",      "Database Service",      "database",      "trove",      "DBaaS: MySQL, PostgreSQL, Redis",                      True,  {}),

    # ── Private Cloud ────────────────────────────────────────────────────────
    ("private", "keystone",  "Identity & Access",     "identity",      "keystone",   "Dedicated Keystone with LDAP group mapping",           False, {}),
    ("private", "nova",      "Virtual Machines",      "compute",       "nova",       "Dedicated compute nodes, pinned CPUs, NUMA topology",  True,  {"max_vcpus": 2048, "dedicated_host": True}),
    ("private", "cinder",    "Block Storage",         "storage",       "cinder",     "Private Ceph RBD pool with AES-256 encryption",        True,  {"max_volume_gb": 50000, "encryption": True}),
    ("private", "glance",    "Image Registry",        "storage",       "glance",     "Air-gapped image registry with signed images",         False, {}),
    ("private", "neutron",   "Networking",            "networking",    "neutron",    "L3 routing, VLAN segregation, ACL-enforced subnets",    True,  {"vlan": True}),
    ("private", "gnocchi",   "Metrics & Telemetry",   "monitoring",    "gnocchi",    "Per-project metering without external egress",         False, {}),
    ("private", "ceilometer","Usage Metering",        "monitoring",    "ceilometer", "Enterprise cost allocation and show-back",             False, {}),

    # ── Hybrid Cloud ─────────────────────────────────────────────────────────
    ("hybrid", "keystone",   "Identity & Access",     "identity",      "keystone",   "Federated Keystone bridging on-prem LDAP and public IDP", False, {}),
    ("hybrid", "nova",       "Virtual Machines",      "compute",       "nova",       "Workload placement across public and private regions",    True,  {}),
    ("hybrid", "cinder",     "Block Storage",         "storage",       "cinder",     "Replicated Ceph volumes via stretch pool",                True,  {"replicated": True}),
    ("hybrid", "glance",     "Image Registry",        "storage",       "glance",     "Shared image catalogue with cross-region replication",    True,  {}),
    ("hybrid", "neutron",    "Networking",            "networking",    "neutron",    "VPNaaS / direct connect for customer datacenter",         True,  {"vpnaas": True}),
    ("hybrid", "heat",       "Orchestration",         "orchestration", "heat",       "Cross-cloud Heat templates with cross-region resource grouping", True, {}),
    ("hybrid", "mistral",    "Workflow Automation",   "orchestration", "mistral",    "Multi-cloud workflow definitions and retries",             True, {}),
    ("hybrid", "barbican",   "Secrets Management",    "security",      "barbican",   "TLS certs, encryption keys, API tokens across regions",    False, {}),
    ("hybrid", "aodh",       "Alarming",              "monitoring",    "aodh",       "Cross-cloud threshold and event alarms",                   False, {}),
    ("hybrid", "gnocchi",    "Metrics & Telemetry",   "monitoring",    "gnocchi",    "Aggregated telemetry across public and private",           False, {}),
    ("hybrid", "ceilometer", "Usage Metering",        "monitoring",    "ceilometer", "Unified billing across hybrid footprint",                  False, {}),
    ("hybrid", "magnum",     "Kubernetes Clusters",   "container",     "magnum",     "Federated Kubernetes across public and private regions",    True,  {}),
]


class Command(BaseCommand):
    help = "Seed ServiceCatalogEntry with canonical OrcaCloud service definitions."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Delete all existing entries before seeding.",
        )

    def handle(self, *args, **options):
        if options["reset"]:
            deleted, _ = ServiceCatalogEntry.objects.all().delete()
            self.stdout.write(self.style.WARNING(f"Deleted {deleted} existing catalog entries."))

        created = updated = 0
        for row in CATALOG:
            (cloud_type, slug, name, category, os_svc, description, is_billable, constraints) = row
            obj, was_created = ServiceCatalogEntry.objects.update_or_create(
                cloud_type=cloud_type,
                service_slug=slug,
                defaults={
                    "display_name":      name,
                    "category":          category,
                    "openstack_service": os_svc,
                    "description":       description,
                    "is_billable":       is_billable,
                    "constraints":       constraints,
                },
            )
            if was_created:
                created += 1
            else:
                updated += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Service catalog seeded: {created} created, {updated} updated "
                f"({len(CATALOG)} total entries)."
            )
        )
