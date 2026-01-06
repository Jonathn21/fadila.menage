from django.db.models.signals import post_save
from django.contrib.auth.signals import user_logged_in, user_logged_out
from django.dispatch import receiver
from django.utils import timezone
import user_agents
from django.contrib.auth import get_user_model
from .models import Demande,Utilisateur, Profil


@receiver(user_logged_out)
def clear_notification_flag(sender, request, user, **kwargs):
    """
    On vide la session pour s'assurer qu'aucun flag persistant ne bloque les notifications.
    """
    if request.session:
        request.session.flush()


@receiver(post_save, sender=Utilisateur)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        Profil.objects.create(user=instance)

from services.notification_service import NotificationService

@receiver(post_save, sender=Demande)
def envoyer_email_confirmation(sender, instance, created, **kwargs):
    if not created or not instance.etudiant_email:
        return

    User = get_user_model()
    utilisateurs = User.objects.filter(is_active=True)  

    for user in utilisateurs:
        # 🔔 NOTIFICATION PUSH EN TEMPS RÉEL
        NotificationService.notifier_nouvelle_demande(
            user=user,
            demande=instance
        )

def get_client_ip(request):
    """Récupère l'IP réelle du client"""
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        ip = x_forwarded_for.split(",")[0]
    else:
        ip = request.META.get("REMOTE_ADDR")
    return ip or "Inconnue"

def store_session_info(sender, user, request, **kwargs):
    """Stocke les infos utiles dans la session lors du login"""
    ua_string = request.META.get("HTTP_USER_AGENT", "")
    ua = user_agents.parse(ua_string) if ua_string else None

    request.session["ip"] = get_client_ip(request)
    request.session["user_agent"] = ua_string
    request.session["device"] = f"{ua.browser.family} sur {ua.os.family}" if ua else "Inconnu"
    request.session["connected_at"] = timezone.now().isoformat()

user_logged_in.connect(store_session_info)




