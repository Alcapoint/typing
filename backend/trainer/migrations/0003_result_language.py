from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('trainer', '0002_language_text_language'),
    ]

    operations = [
        migrations.AddField(
            model_name='result',
            name='language',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='results',
                to='trainer.language',
            ),
        ),
    ]
