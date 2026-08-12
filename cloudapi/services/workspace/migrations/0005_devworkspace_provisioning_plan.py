"""
Migration: add compute / storage / network / container / domain provisioning
             plan fields to DevWorkspace.

These fields are collected during the Workspace Creation Wizard and
stored alongside the workspace record so the orchestrator can act on them.
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('workspace', '0004_devworkspace_setup_connections'),
    ]

    operations = [
        # ── Compute ────────────────────────────────────────────────────────────
        migrations.AddField(
            model_name='devworkspace',
            name='vcpus',
            field=models.PositiveSmallIntegerField(
                default=2, help_text='Number of virtual CPUs to reserve.'),
        ),
        migrations.AddField(
            model_name='devworkspace',
            name='ram_gb',
            field=models.PositiveSmallIntegerField(
                default=4, help_text='RAM in GB to reserve.'),
        ),
        migrations.AddField(
            model_name='devworkspace',
            name='gpu_enabled',
            field=models.BooleanField(
                default=False, help_text='Whether a GPU accelerator is requested.'),
        ),

        # ── Storage ────────────────────────────────────────────────────────────
        migrations.AddField(
            model_name='devworkspace',
            name='storage_type',
            field=models.CharField(
                max_length=16,
                choices=[('standard', 'Standard SSD'), ('high-iops', 'High-IOPS SSD')],
                default='standard'),
        ),
        migrations.AddField(
            model_name='devworkspace',
            name='storage_gb',
            field=models.PositiveIntegerField(
                default=20, help_text='Block storage size in GB.'),
        ),
        migrations.AddField(
            model_name='devworkspace',
            name='backup_policy',
            field=models.CharField(
                max_length=16,
                choices=[('none', 'No Backup'), ('daily', 'Daily Backup'), ('weekly', 'Weekly Backup')],
                default='none'),
        ),

        # ── Network ────────────────────────────────────────────────────────────
        migrations.AddField(
            model_name='devworkspace',
            name='vpc_name',
            field=models.CharField(
                max_length=128, blank=True, default='',
                help_text='VPC to attach the workspace to.'),
        ),
        migrations.AddField(
            model_name='devworkspace',
            name='subnet_name',
            field=models.CharField(
                max_length=128, blank=True, default='',
                help_text='Subnet inside the VPC.'),
        ),
        migrations.AddField(
            model_name='devworkspace',
            name='firewall_profile',
            field=models.CharField(
                max_length=16,
                choices=[
                    ('default', 'Default (web-server)'),
                    ('strict', 'Strict (no inbound)'),
                    ('open', 'Open (all)'),
                    ('custom', 'Custom'),
                ],
                default='default'),
        ),
        migrations.AddField(
            model_name='devworkspace',
            name='public_ip',
            field=models.BooleanField(
                default=False,
                help_text='Whether a floating / public IP should be assigned.'),
        ),

        # ── Container runtime ──────────────────────────────────────────────────
        migrations.AddField(
            model_name='devworkspace',
            name='container_runtime',
            field=models.CharField(
                max_length=32,
                choices=[
                    ('docker', 'Docker'),
                    ('podman', 'Podman'),
                    ('kubernetes', 'Kubernetes Pod'),
                ],
                default='docker'),
        ),
        migrations.AddField(
            model_name='devworkspace',
            name='container_template',
            field=models.CharField(
                max_length=64, blank=True, default='',
                help_text='Template image family (node, python, go, php, java, etc.)'),
        ),

        # ── Domain ────────────────────────────────────────────────────────────
        migrations.AddField(
            model_name='devworkspace',
            name='domain',
            field=models.CharField(
                max_length=253, blank=True, default='',
                help_text='Optional custom domain or auto-generated subdomain for this workspace.'),
        ),
    ]
