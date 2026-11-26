from django.apps import AppConfig


class DirectoryConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.directory'
    verbose_name = 'Directório Académico'

    def ready(self):
        import apps.directory.signals  # Registar os sinais de ciclo de vida
