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
# HELPERS
# ============================================================================

def _get_admin_emails():
    """Retourne la liste des emails des admins actifs"""
    return list(
        get_user_model()
        .objects.filter(is_staff=True, is_active=True)
        .exclude(email='')
        .values_list('email', flat=True)
    )


# ============================================================================
# TÂCHES PLANIFIÉES — EXISTANTES
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
    + envoie un email récapitulatif
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

        # 📧 Email récapitulatif aux admins
        admin_emails = _get_admin_emails()
        if admin_emails:
            EmailSenderService.send_alerte_stages_proches(
                admin_emails=admin_emails,
                stages=stages,
                date_cible=date_cible,
                async_send=True
            )

        logger.info(f"✅ {nb_stages} stages à venir notifiés à {utilisateurs.count()} admins (notif + email)")

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
    + envoie un email récapitulatif
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

        # Construire les infos pour les notifications et l'email
        stages_info = []
        for stage in stages:
            jours_restants = (stage.date_fin - today).days
            if jours_restants == 0:
                delai_text = "aujourd'hui"
            elif jours_restants == 1:
                delai_text = "demain"
            else:
                delai_text = f"dans {jours_restants} jours"

            stages_info.append({
                'nom': f"{stage.prenom} {stage.nom}",
                'service': stage.service or 'N/A',
                'date_fin': stage.date_fin.strftime('%d/%m/%Y'),
                'delai': delai_text,
                'jours_restants': jours_restants,
            })

        # 🔔 Notifications in-app
        for user in utilisateurs:
            stages_list = "\n".join([f"- {s['nom']} ({s['delai']})" for s in stages_info])

            Notification.objects.create(
                user=user,
                titre="Stages se terminant bientôt",
                message=f"{nb_stages} stage(s) se terminent bientôt :\n{stages_list}",
                type="warning",
                icone="clock",
            )

        # 📧 Email récapitulatif aux admins
        admin_emails = _get_admin_emails()
        if admin_emails:
            EmailSenderService.send_alerte_stages_finissants(
                admin_emails=admin_emails,
                stages_info=stages_info,
                async_send=True
            )

        logger.info(f"✅ {nb_stages} fins de stage notifiées (notif + email) à {utilisateurs.count()} admins")

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


# ============================================================================
# NOUVELLES TÂCHES — ALERTES & RAPPELS
# ============================================================================

def alerter_demandes_en_retard():
    """
    Détecte les demandes en attente ou en traitement depuis > 7 jours
    et envoie une alerte aux admins (notification + email)
    Exécuté tous les jours à 8h00
    """
    try:
        from stages.models import Demande

        seuil_jours = 7
        date_seuil = timezone.now() - timedelta(days=seuil_jours)

        demandes = Demande.objects.filter(
            statut_stage__in=[
                Demande.Statut.EN_ATTENTE,
                Demande.Statut.EN_TRAITEMENT,
            ],
            date_soumission__lt=date_seuil,
            est_archivee=False,
        )

        if not demandes.exists():
            return

        # Construire les données
        demandes_retard = []
        for d in demandes:
            jours = (timezone.now() - d.date_soumission).days
            demandes_retard.append({
                'tracking_id': d.tracking_id,
                'nom': f"{d.etudiant_prenom} {d.etudiant_nom}",
                'statut': d.statut_stage,
                'jours': jours,
            })

        nb = len(demandes_retard)
        utilisateurs = get_user_model().objects.filter(is_staff=True, is_active=True)

        # 🔔 Notifications in-app
        for user in utilisateurs:
            Notification.objects.create(
                user=user,
                titre="Demandes en retard",
                message=f"{nb} demande(s) en attente depuis plus de {seuil_jours} jours.",
                url="/demandes/?filtre=retard",
                type="warning",
                icone="ExclamationTriangleIcon",
                son="warning",
            )

        # 📧 Email aux admins
        admin_emails = _get_admin_emails()
        if admin_emails:
            EmailSenderService.send_alerte_demandes_en_retard(
                admin_emails=admin_emails,
                demandes_retard=demandes_retard,
                seuil_jours=seuil_jours,
                async_send=True
            )

        logger.info(f"✅ Alerte demandes en retard : {nb} demande(s) signalées")

    except Exception as e:
        logger.error(f"❌ Erreur alerter_demandes_en_retard: {e}")


def rappel_mi_stage():
    """
    Envoie un rappel aux admins pour les stagiaires à mi-parcours
    (point d'avancement, suivi, rappel rapport)
    Exécuté tous les jours à 9h00
    """
    try:
        today = date.today()

        # Trouver les stagiaires actifs dont la mi-stage est aujourd'hui
        stagiaires_actifs = Stagiaire.objects.filter(statut="Actuel")
        stagiaires_mi_stage = []

        for s in stagiaires_actifs:
            duree_totale = (s.date_fin - s.date_debut).days
            if duree_totale <= 0:
                continue
            mi_stage_date = s.date_debut + timedelta(days=duree_totale // 2)

            if mi_stage_date == today:
                jours_restants = (s.date_fin - today).days
                stagiaires_mi_stage.append({
                    'nom': f"{s.prenom} {s.nom}",
                    'service': s.service or 'N/A',
                    'mi_stage_date': mi_stage_date.strftime('%d/%m/%Y'),
                    'jours_restants': jours_restants,
                })

        if not stagiaires_mi_stage:
            return

        nb = len(stagiaires_mi_stage)
        utilisateurs = get_user_model().objects.filter(is_staff=True, is_active=True)

        # 🔔 Notifications in-app
        noms = ", ".join([s['nom'] for s in stagiaires_mi_stage[:3]])
        suffixe = f" et {nb - 3} autre(s)" if nb > 3 else ""

        for user in utilisateurs:
            Notification.objects.create(
                user=user,
                titre="Rappel mi-stage",
                message=f"Mi-parcours atteint pour {noms}{suffixe}. Pensez à faire un point d'avancement.",
                url="/stagiaires/",
                type="info",
                icone="ClockIcon",
                son="bell",
            )

        # 📧 Email aux admins
        admin_emails = _get_admin_emails()
        if admin_emails:
            EmailSenderService.send_rappel_mi_stage(
                admin_emails=admin_emails,
                stagiaires_mi_stage=stagiaires_mi_stage,
                async_send=True
            )

        logger.info(f"✅ Rappel mi-stage : {nb} stagiaire(s) à mi-parcours")

    except Exception as e:
        logger.error(f"❌ Erreur rappel_mi_stage: {e}")


def alerter_attestations_en_attente():
    """
    Détecte les demandes d'attestation non traitées depuis > 5 jours
    et alerte les admins
    Exécuté tous les jours à 8h30
    """
    try:
        from stages.models import DemandeAttestation

        seuil_jours = 5
        date_seuil = timezone.now() - timedelta(days=seuil_jours)

        attestations_retard = DemandeAttestation.objects.filter(
            statut='en_attente',
            date_demande__lt=date_seuil,
        ).select_related('stagiaire')

        if not attestations_retard.exists():
            return

        # Construire les données
        attestations_data = []
        for a in attestations_retard:
            jours = (timezone.now() - a.date_demande).days
            attestations_data.append({
                'stagiaire': f"{a.stagiaire.prenom} {a.stagiaire.nom}",
                'date_demande': a.date_demande.strftime('%d/%m/%Y'),
                'jours': jours,
            })

        nb = len(attestations_data)
        utilisateurs = get_user_model().objects.filter(is_staff=True, is_active=True)

        # 🔔 Notifications in-app
        for user in utilisateurs:
            Notification.objects.create(
                user=user,
                titre="Attestations en attente",
                message=f"{nb} demande(s) d'attestation en attente depuis plus de {seuil_jours} jours.",
                url="/demandes-attestations/",
                type="warning",
                icone="DocumentTextIcon",
                son="warning",
            )

        # 📧 Email aux admins
        admin_emails = _get_admin_emails()
        if admin_emails:
            EmailSenderService.send_alerte_attestations_en_attente(
                admin_emails=admin_emails,
                attestations=attestations_data,
                seuil_jours=seuil_jours,
                async_send=True
            )

        logger.info(f"✅ Alerte attestations en attente : {nb} demande(s) signalées")

    except Exception as e:
        logger.error(f"❌ Erreur alerter_attestations_en_attente: {e}")


def envoyer_recapitulatif_hebdomadaire():
    """
    Envoie un récapitulatif hebdomadaire aux admins
    Exécuté tous les lundis à 8h00
    """
    try:
        from stages.models import Demande, DemandeAttestation

        today = date.today()
        debut_semaine = today - timedelta(days=7)
        fin_semaine_prochaine = today + timedelta(days=7)
        seuil_retard = timezone.now() - timedelta(days=7)

        stats = {
            # Stagiaires
            'stagiaires_actifs': Stagiaire.objects.filter(statut="Actuel").count(),
            'nouveaux_stages': Stagiaire.objects.filter(
                date_debut__gte=debut_semaine,
                date_debut__lte=today
            ).count(),
            'stages_termines': Stagiaire.objects.filter(
                date_fin__gte=debut_semaine,
                date_fin__lt=today
            ).count(),
            'fins_prevues': Stagiaire.objects.filter(
                date_fin__gte=today,
                date_fin__lte=fin_semaine_prochaine,
                statut="Actuel"
            ).count(),

            # Demandes
            'nouvelles_demandes': Demande.objects.filter(
                date_soumission__gte=timezone.now() - timedelta(days=7)
            ).count(),
            'demandes_en_attente': Demande.objects.filter(
                statut_stage__in=[
                    Demande.Statut.EN_ATTENTE,
                    Demande.Statut.EN_TRAITEMENT,
                ],
                est_archivee=False,
            ).count(),
            'demandes_en_retard': Demande.objects.filter(
                statut_stage__in=[
                    Demande.Statut.EN_ATTENTE,
                    Demande.Statut.EN_TRAITEMENT,
                ],
                date_soumission__lt=seuil_retard,
                est_archivee=False,
            ).count(),

            # Attestations
            'attestations_en_attente': DemandeAttestation.objects.filter(
                statut='en_attente'
            ).count(),
        }

        # 📧 Email aux admins
        admin_emails = _get_admin_emails()
        if admin_emails:
            EmailSenderService.send_recapitulatif_hebdomadaire(
                admin_emails=admin_emails,
                stats=stats,
                async_send=True
            )

        # 🔔 Notification in-app
        utilisateurs = get_user_model().objects.filter(is_staff=True, is_active=True)
        resume = (
            f"Actifs: {stats['stagiaires_actifs']} · "
            f"Demandes en attente: {stats['demandes_en_attente']} · "
            f"Retard: {stats['demandes_en_retard']} · "
            f"Attestations: {stats['attestations_en_attente']}"
        )

        for user in utilisateurs:
            Notification.objects.create(
                user=user,
                titre="Récapitulatif hebdomadaire",
                message=resume,
                type="info",
                icone="ChartBarIcon",
                son="default",
            )

        logger.info(f"✅ Récapitulatif hebdomadaire envoyé à {len(admin_emails)} admins")

    except Exception as e:
        logger.error(f"❌ Erreur envoyer_recapitulatif_hebdomadaire: {e}")


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

    # ============================================================
    # NOUVEAUX JOBS — ALERTES & RAPPELS
    # ============================================================

    # 🚨 Alerte demandes en retard (8h00 tous les jours)
    scheduler.add_job(
        alerter_demandes_en_retard,
        trigger="cron",
        hour=8,
        minute=0,
        id="alerter_demandes_en_retard",
        replace_existing=True,
    )

    # 📋 Rappel mi-stage (9h00 tous les jours)
    scheduler.add_job(
        rappel_mi_stage,
        trigger="cron",
        hour=9,
        minute=0,
        id="rappel_mi_stage",
        replace_existing=True,
    )

    # 📄 Alerte attestations en attente (8h30 tous les jours)
    scheduler.add_job(
        alerter_attestations_en_attente,
        trigger="cron",
        hour=8,
        minute=30,
        id="alerter_attestations_en_attente",
        replace_existing=True,
    )

    # 📊 Récapitulatif hebdomadaire (lundi 8h00)
    scheduler.add_job(
        envoyer_recapitulatif_hebdomadaire,
        trigger="cron",
        day_of_week="mon",
        hour=8,
        minute=0,
        id="envoyer_recapitulatif_hebdomadaire",
        replace_existing=True,
    )

    # Démarrer le scheduler en arrière-plan
    thread = threading.Thread(target=scheduler.start)
    thread.daemon = True
    thread.start()

    logger.info("✅ Scheduler démarré avec succès (10 tâches planifiées)")
