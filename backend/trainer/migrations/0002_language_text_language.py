from django.db import migrations, models
import django.db.models.deletion


def seed_languages(apps, schema_editor):
    Language = apps.get_model('trainer', 'Language')

    Language.objects.update_or_create(
        code='ru',
        defaults={
            'name': 'Russian',
            'native_name': 'Русский',
            'flag_emoji': '🇷🇺',
            'sort_order': 2,
        }
    )
    Language.objects.update_or_create(
        code='en',
        defaults={
            'name': 'English',
            'native_name': 'English',
            'flag_emoji': '🇬🇧',
            'sort_order': 1,
        }
    )


class Migration(migrations.Migration):

    dependencies = [
        ('trainer', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Language',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('code', models.CharField(max_length=10, unique=True, verbose_name='Код')),
                ('name', models.CharField(max_length=100, verbose_name='Название')),
                ('native_name', models.CharField(max_length=100, verbose_name='Название на языке')),
                ('flag_emoji', models.CharField(max_length=8, verbose_name='Флаг')),
                ('sort_order', models.PositiveSmallIntegerField(default=0, verbose_name='Порядок')),
            ],
            options={
                'verbose_name': 'Язык',
                'verbose_name_plural': 'Языки',
                'ordering': ('sort_order', 'native_name'),
            },
        ),
        migrations.RunPython(seed_languages, migrations.RunPython.noop),
        migrations.AddField(
            model_name='text',
            name='language',
            field=models.ForeignKey(
                default=1,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='texts',
                to='trainer.language',
                verbose_name='Язык',
            ),
            preserve_default=False,
        ),
        migrations.AlterModelOptions(
            name='text',
            options={
                'ordering': ('language__sort_order', 'level', 'id'),
                'verbose_name': 'Текст',
                'verbose_name_plural': 'Тексты',
            },
        ),
    ]
