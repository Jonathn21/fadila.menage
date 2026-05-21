import logging
import threading
from datetime import date, datetime, timedelta
from apscheduler.schedulers.background import BackgroundScheduler
from django_apscheduler.jobstores import DjangoJobStore
from django.urls import reverse
from django.utils import timezone
from django.contrib.auth import get_user_model

from .models import Stagiaire, Notification
from utilisateurs.models import Utilisateur
from services.email_service import EmailSenderService

logger = logging.getLogger(__name__)


# ============================================================================
# TÂCHES PLANIFIÉES
# ============================================================================

def update_statuts_stage():
    """
    Met à jour les statuts des stages en fonction des dates
    Exécuté toutes les 5 minutes
    """
    try:
        today = date.today()

        # Stages qui débutent aujourd'hui : À venir → Actuel
        a_venir = Stagiaire.objects.filter(statut="À venir", date_debut__lte=today)
        nb_a_venir = a_venir.count()
        a_venir.update(statut="Actuel")

        # Stages terminés : Actuel → Terminé
        actuel = Stagiaire.objects.filter(statut="Actuel", date_fin__lt=today)
        nb_actuel = actuel.count()
        actuel.update(statut="Terminé")

        if nb_a_venir > 0 or nb_actuel > 0:
            logger.info(
                f"✅ Statuts mis à jour : {nb_a_venir} → Actuel, {nb_actuel} → Terminé"
            )

    except Exception as e:
        logger.error(f"❌ Erreur update_statuts_stage: {e}")


def notifier_stages_proches():
    """
    Notifie les admins des stages qui débutent dans 3 jours
    Exécuté tous les jours à 7h00
    """
    try:
        date_cible = datetime.now().date() + timedelta(days=3)
        stages = Stagiaire.objects.filter(date_debut=date_cible)

        if not stages.exists():
            return

        nb_stages = stages.count()
        utilisateurs = Utilisateur.objects.filter(is_staff=True, is_active=True)

        for user in utilisateurs:
            Notification.objects.create(
                user=user,
                titre="Nouvelle vague de stagiaires",
                message=f"{nb_stages} stagiaire(s) arrivent le {date_cible.strftime('%d/%m/%Y')}.",
                url=reverse('stagiaires_prochains'),
                type="info",
                icone="users",
            )

        logger.info(f"✅ {nb_stages} stages à venir notifiés à {utilisateurs.count()} admins")

    except Exception as e:
        logger.error(f"❌ Erreur notifier_stages_proches: {e}")


def envoyer_bienvenue_et_notif():
    """
    Envoie un email de bienvenue aux stagiaires qui débutent aujourd'hui
    et notifie les admins
    Exécuté tous les jours à 7h00
    """
    try:
        today = timezone.localdate()
        stagiaires = Stagiaire.objects.filter(date_debut=today)

        if not stagiaires.exists():
            return

        # 📧 Envoyer les emails de bienvenue aux stagiaires
        nb_emails = 0
        for stagiaire in stagiaires:
            if stagiaire.email:
                success = _send_welcome_email_to_stagiaire(stagiaire)
                if success:
                    nb_emails += 1

        # 🔔 Notifier les admins
        admins = get_user_model().objects.filter(is_staff=True, is_active=True)
        lien = "/stagiaires/debutent-aujourdhui/"

        for admin in admins:
            Notification.objects.create(
                user=admin,
                titre="Stagiaires débutent aujourd'hui",
                message=f"{stagiaires.count()} stagiaire(s) commencent aujourd'hui.",
                url=lien,
                type="info",
                icone="calendar"
            )

        logger.info(
            f"✅ {nb_emails} emails de bienvenue envoyés, "
            f"{admins.count()} admins notifiés"
        )

    except Exception as e:
        logger.error(f"❌ Erreur envoyer_bienvenue_et_notif: {e}")


def notifier_stages_finissants():
    """
    Notifie les admins des stages qui se terminent dans 0 à 3 jours
    Exécuté tous les jours à 7h00
    """
    try:
        today = datetime.now().date()
        date_limite = today + timedelta(days=3)
        
        # Stages qui se terminent dans les 3 prochains jours (inclus)
        stages = Stagiaire.objects.filter(
            date_fin__gte=today,
            date_fin__lte=date_limite
        )

        if not stages.exists():
            return

        nb_stages = stages.count()
        utilisateurs = Utilisateur.objects.filter(is_staff=True, is_active=True)

        for user in utilisateurs:
            # Calcul du nombre de jours restants pour chaque stage
            stages_info = []
            for stage in stages:
                jours_restants = (stage.date_fin - today).days
                if jours_restants == 0:
                    delai_text = "aujourd'hui"
                elif jours_restants == 1:
                    delai_text = "demain"
                else:
                    delai_text = f"dans {jours_restants} jours"
                
                stages_info.append(f"- {stage.prenom} {stage.nom} ({delai_text})")

            stages_list = "\n".join(stages_info)
            
            Notification.objects.create(
                user=user,
                titre="Stages se terminant bientôt",
                message=f"{nb_stages} stage(s) se terminent bientôt :\n{stages_list}",
                type="warning",
                icone="clock",
            )

        logger.info(f"✅ {nb_stages} fins de stage notifiées quotidiennement à {utilisateurs.count()} admins")

    except Exception as e:
        logger.error(f"❌ Erreur notifier_stages_finissants: {e}")


def envoyer_email_fin_stage():
    """
    Envoie un email de fin de stage aux stagiaires
    """
    try:
        today = timezone.now().date()
        stagiaires_finissant = Stagiaire.objects.filter(
            date_fin=today,
            email__isnull=False
        )
        
        for stagiaire in stagiaires_finissant:
            EmailSenderService.send_stagiaire_farewell(
                stagiaire=stagiaire,
                async_send=True
            )
            
    except Exception as e:
        logger.error(f"❌ Erreur envoyer_email_fin_stage: {e}")


def nettoyer_anciennes_notifications():
    """
    Supprime les notifications de plus de 30 jours
    """
    try:
        date_limite = timezone.now() - timedelta(days=30)
        supprimes = Notification.objects.filter(
            date_creation__lt=date_limite
        ).delete()
        
        logger.info(f"🗑️ {supprimes[0]} anciennes notifications supprimées")
        
    except Exception as e:
        logger.error(f"❌ Erreur nettoyer_anciennes_notifications: {e}")


def _send_welcome_email_to_stagiaire(stagiaire) -> bool:
    """
    ✅ Envoie un email de bienvenue professionnel au stagiaire
    Utilise le service centralisé
    """
    try:
        success = EmailSenderService.send_stagiaire_welcome(
            stagiaire=stagiaire,
            async_send=True
        )

        if success:
            logger.info(f"✅ Email bienvenue envoyé à {stagiaire.email}")
        else:
            logger.warning(f"⚠️ Email bienvenue non envoyé à {stagiaire.email}")

        return success

    except Exception as e:
        logger.error(f"❌ Erreur envoi email bienvenue stagiaire: {e}")
        return False


# ============================================================================
# DÉMARRAGE DU SCHEDULER
# ============================================================================

def start():
    """Démarre le scheduler avec toutes les tâches planifiées"""
    scheduler = BackgroundScheduler()
    scheduler.add_jobstore(DjangoJobStore(), "default")

    # ⏰ Mise à jour des statuts (toutes les 5 minutes)
    scheduler.add_job(
        update_statuts_stage,
        trigger="interval",
        minutes=5,
        id="update_statuts_stage",
        replace_existing=True,
    )

    # 🌅 Notifications stages à venir (7h00 tous les jours)
    scheduler.add_job(
        notifier_stages_proches,
        trigger="cron",
        hour=7,
        minute=0,
        id="notifier_stages_proches",
        replace_existing=True,
    )

    # 📧 Emails de bienvenue (7h00 tous les jours)
    scheduler.add_job(
        envoyer_bienvenue_et_notif,
        trigger="cron",
        hour=7,
        minute=0,
        id="envoyer_bienvenue_et_notif",
        replace_existing=True,
    )

    # 🔔 Notifications fins de stage (7h00 tous les jours)
    scheduler.add_job(
        notifier_stages_finissants,
        trigger="cron",
        hour=7,
        minute=0,
        id="notifier_stages_finissants",
        replace_existing=True,
    )

    # 📧 Email fin de stage (8h00 tous les jours)
    scheduler.add_job(
        envoyer_email_fin_stage,
        trigger="cron",
        hour=8,
        minute=0,
        id="envoyer_email_fin_stage",
        replace_existing=True,
    )

    # 🗑️ Nettoyage notifications (lundi 2h00)
    scheduler.add_job(
        nettoyer_anciennes_notifications,
        trigger="cron",
        day_of_week="mon",
        hour=2,
        minute=0,
        id="nettoyer_anciennes_notifications",
        replace_existing=True,
    )

    # Démarrer le scheduler en arrière-plan
    thread = threading.Thread(target=scheduler.start)
    thread.daemon = True
    thread.start()

    logger.info("✅ Scheduler démarré avec succès")