from django.db import migrations, models


def seed_help_sections(apps, schema_editor):
    HelpSection = apps.get_model('trainer', 'HelpSection')
    HelpItem = apps.get_model('trainer', 'HelpItem')

    sections = [
        (
            'Горячие клавиши',
            [
                'Tab — загрузить новый текст',
                'Enter — завершить тренировку досрочно',
                'Esc — закрыть открытые меню',
            ],
        ),
        (
            'Метрики',
            [
                'WPM — скорость в словах в минуту',
                'CPM — скорость в символах в минуту',
                'Accuracy — процент правильно набранных символов',
                'Time — общее время прохождения текста',
            ],
        ),
        (
            'Подсказки',
            [
                'Шестерёнка открывает настройки языка и сложности',
                'График в результатах показывает скорость и точность по словам',
                'Клик по странице возвращает фокус в поле ввода',
            ],
        ),
    ]

    for section_order, (title, items) in enumerate(sections):
        section = HelpSection.objects.create(
            title=title,
            sort_order=section_order,
        )
        for item_order, text in enumerate(items):
            HelpItem.objects.create(
                section=section,
                text=text,
                sort_order=item_order,
            )


class Migration(migrations.Migration):

    dependencies = [
        ('trainer', '0003_result_language'),
    ]

    operations = [
        migrations.CreateModel(
            name='HelpSection',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=120, verbose_name='Название')),
                ('sort_order', models.PositiveSmallIntegerField(default=0, verbose_name='Порядок')),
            ],
            options={
                'verbose_name': 'Раздел подсказок',
                'verbose_name_plural': 'Разделы подсказок',
                'ordering': ('sort_order', 'id'),
            },
        ),
        migrations.CreateModel(
            name='HelpItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('text', models.CharField(max_length=255, verbose_name='Текст')),
                ('sort_order', models.PositiveSmallIntegerField(default=0, verbose_name='Порядок')),
                ('section', models.ForeignKey(on_delete=models.deletion.CASCADE, related_name='items', to='trainer.helpsection', verbose_name='Раздел')),
            ],
            options={
                'verbose_name': 'Подсказка',
                'verbose_name_plural': 'Подсказки',
                'ordering': ('sort_order', 'id'),
            },
        ),
        migrations.RunPython(seed_help_sections, migrations.RunPython.noop),
    ]
