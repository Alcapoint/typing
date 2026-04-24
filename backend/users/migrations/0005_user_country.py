from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0004_avatar_upload_count_and_path'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='country',
            field=models.CharField(
                blank=True,
                max_length=120,
                null=True,
                verbose_name='Страна проживания',
            ),
        ),
    ]
