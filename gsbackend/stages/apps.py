from django.apps import AppConfig


class StagesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'stages'

    def ready(self):
        import stages.signals  # active les signaux
        from .jobs import start  # démarre les jobs si tu veux
        start()
