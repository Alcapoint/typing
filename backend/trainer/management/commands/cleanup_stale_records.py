from django.core.management.base import BaseCommand

from trainer.services.data_cleanup import cleanup_stale_records


class Command(BaseCommand):
    help = 'Удаляет истекшие тренировочные сессии и сессионные токены.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--noinput',
            action='store_true',
            help='Совместимость с неинтерактивным запуском.',
        )

    def handle(self, *args, **options):
        cleanup_result = cleanup_stale_records()
        self.stdout.write(
            self.style.SUCCESS(
                'Cleanup complete: '
                f"training_sessions={cleanup_result['training_sessions']}, "
                f"session_tokens={cleanup_result['session_tokens']}"
            )
        )
