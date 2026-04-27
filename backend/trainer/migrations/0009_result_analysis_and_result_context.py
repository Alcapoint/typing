from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('trainer', '0008_trainingsession'),
    ]

    operations = [
        migrations.AddField(
            model_name='result',
            name='mode',
            field=models.CharField(default='standard', max_length=16),
        ),
        migrations.AddField(
            model_name='result',
            name='requested_size',
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name='result',
            name='text_type',
            field=models.CharField(default='quote', max_length=16),
        ),
        migrations.CreateModel(
            name='TrainingAnalysis',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('analysis_version', models.CharField(default='v1', max_length=16)),
                ('headline', models.CharField(blank=True, default='', max_length=160)),
                ('focus_area', models.CharField(blank=True, default='', max_length=64)),
                ('overall_score', models.PositiveSmallIntegerField(default=0)),
                ('speed_score', models.PositiveSmallIntegerField(default=0)),
                ('accuracy_score', models.PositiveSmallIntegerField(default=0)),
                ('stability_score', models.PositiveSmallIntegerField(default=0)),
                ('completion_score', models.PositiveSmallIntegerField(default=0)),
                ('metrics', models.JSONField(blank=True, default=dict)),
                ('strengths', models.JSONField(blank=True, default=list)),
                ('pain_points', models.JSONField(blank=True, default=list)),
                ('recommendations', models.JSONField(blank=True, default=list)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('result', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='analysis', to='trainer.result')),
            ],
        ),
    ]
