# Generated manually to remove the old ApiKey model

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('services', '0008_userprofile_apikey'),
    ]

    operations = [
        migrations.DeleteModel(
            name='ApiKey',
        ),
    ]
