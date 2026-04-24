from django.db import migrations, models
import users.models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0003_sessiontoken'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='avatar_upload_count',
            field=models.PositiveIntegerField(default=0, verbose_name='Количество загруженных аватаров'),
        ),
        migrations.AlterField(
            model_name='user',
            name='avatar',
            field=models.ImageField(blank=True, null=True, upload_to=users.models.user_avatar_upload_path, verbose_name='Аватар'),
        ),
    ]
