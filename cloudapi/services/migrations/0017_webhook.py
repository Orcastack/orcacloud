from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('services', '0016_servicemesh_policy'),
        ('auth', '0012_alter_user_first_name_max_length'),
    ]

    operations = [
        migrations.CreateModel(
            name='Webhook',
            fields=[
                ('id',         models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name',       models.CharField(max_length=255)),
                ('url',        models.URLField(max_length=2048)),
                ('events',     models.JSONField(default=list, help_text='List of event type strings')),
                ('status',     models.CharField(
                                   choices=[('active', 'Active'), ('inactive', 'Inactive')],
                                   db_index=True, default='active', max_length=20)),
                ('secret',     models.CharField(
                                   blank=True, default='', max_length=512,
                                   help_text='Optional HMAC-SHA256 signing secret.')),
                ('retries',    models.PositiveSmallIntegerField(default=3)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('owner',      models.ForeignKey(
                                   blank=True, null=True,
                                   on_delete=django.db.models.deletion.SET_NULL,
                                   related_name='webhooks',
                                   to='auth.user')),
            ],
            options={
                'verbose_name':        'Webhook',
                'verbose_name_plural': 'Webhooks',
                'db_table':            'services_webhook',
                'ordering':            ['-created_at'],
            },
        ),
    ]
