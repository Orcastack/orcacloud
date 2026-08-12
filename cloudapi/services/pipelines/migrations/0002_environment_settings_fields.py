from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('pipelines', '0001_initial'),
        ('auth', '0012_alter_user_first_name_max_length'),
    ]

    operations = [
        migrations.AddField(
            model_name='environment',
            name='description',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='environment',
            name='auto_deploy',
            field=models.BooleanField(
                default=False,
                help_text='Automatically trigger a deploy when a pipeline succeeds on the default branch.',
            ),
        ),
        migrations.AddField(
            model_name='environment',
            name='deployment_strategy',
            field=models.CharField(
                choices=[
                    ('rolling',    'Rolling Update'),
                    ('blue_green', 'Blue/Green'),
                    ('canary',     'Canary'),
                    ('recreate',   'Recreate'),
                ],
                default='rolling',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='environment',
            name='require_approval',
            field=models.BooleanField(
                default=False,
                help_text='Block deployments until a reviewer approves.',
            ),
        ),
        migrations.AddField(
            model_name='environment',
            name='notify_email',
            field=models.EmailField(
                blank=True,
                default='',
                help_text='Send deployment notifications to this address.',
            ),
        ),
        migrations.AddField(
            model_name='environment',
            name='owner',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='owned_environments',
                to='auth.user',
            ),
        ),
    ]
