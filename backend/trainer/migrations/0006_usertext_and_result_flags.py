from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('trainer', '0005_remove_level_fields'),
    ]

    operations = [
        migrations.CreateModel(
            name='UserText',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=120, verbose_name='Название')),
                ('content', models.TextField(verbose_name='Текст')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='trainer_texts', to='users.user', verbose_name='Пользователь')),
            ],
            options={
                'verbose_name': 'Пользовательский текст',
                'verbose_name_plural': 'Пользовательские тексты',
                'ordering': ('-updated_at', '-id'),
            },
        ),
        migrations.AddField(
            model_name='result',
            name='is_personal_text',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='result',
            name='user_text',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='results', to='trainer.usertext'),
        ),
    ]
