from django.apps import AppConfig


class BillingConfig(AppConfig):
    """App configuration for Kwanzas payments, subscriptions, and AGT e-invoicing."""

    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.billing'
    verbose_name = 'Faturação Kwanzas & AGT'
