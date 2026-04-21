from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='age',
            field=models.PositiveSmallIntegerField(
                blank=True,
                null=True,
                verbose_name='Возраст',
            ),
        ),
    ]
