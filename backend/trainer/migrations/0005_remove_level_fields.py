from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('trainer', '0004_help_sections'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='result',
            name='level',
        ),
        migrations.RemoveField(
            model_name='text',
            name='level',
        ),
    ]
