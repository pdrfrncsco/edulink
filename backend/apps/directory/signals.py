from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from .models import Enrollment


@receiver(pre_save, sender=Enrollment)
def track_enrollment_status_change(sender, instance, **kwargs):
    """Guarda o estado anterior da matrícula antes da persistência."""
    if instance.pk:
        try:
            previous = Enrollment.objects.get(pk=instance.pk)
            instance._previous_status = previous.status
        except Enrollment.DoesNotExist:
            instance._previous_status = None
    else:
        instance._previous_status = None


@receiver(post_save, sender=Enrollment)
def handle_enrollment_lifecycle(sender, instance, created, **kwargs):
    """
    Sincroniza o ciclo de vida da matrícula com a nuvem:
    - Transição para SUSPENDED -> revoga acessos Google/Microsoft e desativa QR Code.
    - Transição de SUSPENDED para ACTIVE -> reativa conta local e re-sincroniza na nuvem.
    """
    previous_status = getattr(instance, '_previous_status', None)
    if previous_status == instance.status:
        return

    from apps.provisioning.tasks import revoke_user_cloud_access_task, sync_user_to_cloud_task

    if instance.status == Enrollment.Status.SUSPENDED:
        revoke_user_cloud_access_task.delay(
            user_id=str(instance.user_id),
            school_id=str(instance.school_id),
            reason='Matrícula suspensa administrativamente ou por inadimplência.',
        )
    elif previous_status == Enrollment.Status.SUSPENDED and instance.status == Enrollment.Status.ACTIVE:
        if not instance.user.is_active:
            instance.user.is_active = True
            instance.user.save(update_fields=['is_active'])
        sync_user_to_cloud_task.delay(
            user_id=str(instance.user_id),
            school_id=str(instance.school_id),
        )
