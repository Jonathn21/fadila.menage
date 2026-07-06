# services/notification_service.py
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from stages.models import Notification
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)

class NotificationService:
    """Service centralisé pour gérer les notifications"""
    
    TYPE_MAPPING = {
        
        'demande_pre_acceptee': {
            'type': 'success',
            'icone': 'DocumentCheckIcon',
            'titre_template': 'Demande pré-acceptée'
        },
        'annulation_pre_acceptation': {
            'type': 'warning',
            'icone': 'XCircleIcon',
            'titre_template': 'Pré-acceptation annulée'
        },

        'validation_requise': {
            'type': 'alert',
            'icone': 'ExclamationTriangleIcon',
            'titre_template': 'Validation requise'
        },

        'message': {
            'type': 'message',
            'icone': 'ChatBubbleLeftRightIcon',
            'titre_template': 'Nouveau message'
        },

        'info': {
            'type': 'message',
            'icone': 'InformationCircleIcon',
            'titre_template': 'Information'
        },

        'success': {
            'type': 'message',
            'icone': 'CheckCircleIcon',
            'titre_template': 'Succès'
        },

        'error': {
            'type': 'alert',
            'icone': 'XCircleIcon',
            'titre_template': 'Erreur'
        },

        'stage_termine': {
            'type': 'message',
            'icone': 'AcademicCapIcon',
            'titre_template': 'Stage terminé'
        },

        'convention': {
            'type': 'message',
            'icone': 'DocumentTextIcon',
            'titre_template': 'Convention'
        },

        'demande_refusee': {
            'type': 'alert',
            'icone': 'XCircleIcon',
            'titre_template': 'Demande refusée'
        },

        'demande_acceptee': {
            'type': 'success',
            'icone': 'CheckCircleIcon',
            'titre_template': 'Demande acceptée'
        },

        'demande_en_attente': {
            'type': 'message',
            'icone': 'ClockIcon',
            'titre_template': 'Demande en attente'
        },

        'nouvelle_demande': {
            'type': 'alert',
            'icone': 'InboxIcon',
            'titre_template': 'Nouvelle demande'
        },

        'demande_modifiee': {
            'type': 'message',
            'icone': 'PencilIcon',
            'titre_template': 'Demande modifiée'
        },

        'demande_annulee': {
            'type': 'alert',
            'icone': 'XCircleIcon',
            'titre_template': 'Demande annulée'
        },

        'demande_supprimee': {
            'type': 'alert',
            'icone': 'TrashIcon',
            'titre_template': 'Demande supprimée'
        },


        'securite': {
            'type': 'alert',
            'icone': 'ShieldCheckIcon',
            'titre_template': 'Alerte Sécurité'
        },

        'parametres': {
            'type': 'info',
            'icone': 'CogIcon',
            'titre_template': 'Paramètres modifiés'
        },

        'fin_stage': {
            'type': 'warning',
            'icone': 'AcademicCapIcon',
            'titre_template': 'Stage terminé'
        },

        'modification_stagiaire': {
            'type': 'info',
            'icone': 'PencilIcon',
            'titre_template': 'Stagiaire modifié'
        },

        'rapport_stage': {
            'type': 'info',
            'icone': 'DocumentTextIcon',
            'titre_template': 'Rapport de stage'
        },

        'attestation': {
            'type': 'success',
            'icone': 'DocumentCheckIcon',
            'titre_template': 'Attestation générée'
        },

        'renouvellement_stage': {
            'type': 'success',
            'icone': 'RefreshIcon',
            'titre_template': 'Stage renouvelé'
        },

       'demande_en_traitement': {
            'type': 'info', 
            'icone': 'CogIcon',  # Mieux pour "traitement"
            'titre_template': 'Demande en traitement'
        },

        'attestation': {
            'type': 'success',
            'icone': 'DocumentCheckIcon',
            'titre_template': 'Attestation générée'
        },

        'demande_attestation': {
            'type': 'info',
            'icone': 'DocumentTextIcon',
            'titre_template': 'Demande d\'attestation'
        },
    }

    @classmethod
    def envoyer_notification(cls, user, titre, message, type_notif='info', entretien=None, demande=None, url=None, son=None):
        """Méthode générique pour envoyer une notification"""
        try:
            # 📊 Récupérer les infos du type
            notif_config = cls.TYPE_MAPPING.get(type_notif, cls.TYPE_MAPPING['info'])
            
            # 🎵 Déterminer le son en fonction du type
            son_final = son or cls._determiner_son_par_type(type_notif)
            
            # 🎯 Construire l'URL si un entretien ou une demande est fourni
            final_url = url
            if entretien and not final_url:
                final_url = f"/entretiens/{entretien.id}"
            elif demande and not final_url:
                final_url = f"/demandes/{demande.id}"
            
            # ✅ CRÉER LA NOTIFICATION EN BASE DE DONNÉES
            notification = Notification.objects.create(
                user=user,
                titre=titre or notif_config['titre_template'],
                message=message,
                url=final_url or '',
                type=notif_config['type'],
                icone=notif_config['icone'],
                son=son_final,  # 🔊 AJOUT DU SON
                lu=False,
                date_creation=timezone.now()
            )
            
            logger.info(f"✅ Notification créée: {notification.id} pour user {user.id} (son: {son_final})")
            
            # 📡 ENVOYER VIA WEBSOCKET
            cls._envoyer_via_websocket(user, notification)
            
            return notification
            
        except Exception as e:
            logger.error(f"❌ Erreur lors de l'envoi de la notification: {e}")
            return None

    @classmethod
    def _envoyer_via_websocket(cls, user, notification):
        """Envoyer la notification via WebSocket"""
        try:
            channel_layer = get_channel_layer()
            
            # 📦 FORMAT DU MESSAGE WEBSOCKET (AVEC SON)
            notification_data = {
                'id': notification.id,
                'titre': notification.titre,
                'message': notification.message,
                'url': notification.url,
                'lu': notification.lu,
                'date_creation': notification.date_creation.isoformat(),
                'type': notification.type,
                'icone': notification.icone,
                'son': notification.son or 'default',  # 🔊 AJOUT DU SON
            }
            
            # 🚀 ENVOYER AU GROUPE DE L'UTILISATEUR
            async_to_sync(channel_layer.group_send)(
                f"user_{user.id}",
                {
                    'type': 'send_notification',
                    'notification': notification_data
                }
            )
            
            logger.info(f"📡 Notification WebSocket envoyée à user_{user.id} avec son: {notification.son}")
            
        except Exception as e:
            logger.error(f"❌ Erreur envoi WebSocket: {e}")

    @staticmethod
    def _determiner_son_par_type(type_notif):
        """Détermine le son approprié en fonction du type de notification"""
        sons_par_type = {
            # Sons de succès
            'success': 'success',
            'demande_acceptee': 'success',
            'entretien_termine': 'success',
            'attestation': 'success',
            'renouvellement_stage': 'success',
            'validation_rapport': 'success',
            'stage_termine': 'success',
            
            # Sons d'erreur
            'error': 'error',
            'demande_refusee': 'error',
            'entretien_annule': 'error',
            'entretien_supprime': 'error',
            'demande_annulee': 'error',
            'demande_supprimee': 'error',
            
            # Sons d'alerte
            'warning': 'warning',
            'fin_anticipee_stage': 'warning',
            'securite': 'warning',
            'rappel_entretien': 'warning',
            
            # Sons d'information importante
            'nouvelle_demande': 'bell',
            'nouveau_entretien': 'bell',
            'validation_requise': 'bell',
            
            # Sons de modification
            'entretien_modifie': 'chime',
            'entretien_deplace': 'chime',
            'demande_modifiee': 'chime',
            'modification_stagiaire': 'chime',
            
            # Sons par défaut
            'info': 'default',
            'message': 'message',
            'demande_en_attente': 'default',
            'demande_en_traitement': 'default',
            'convention': 'default',
            'rapport_stage': 'default',
            'parametres': 'default',
        }
        
        return sons_par_type.get(type_notif, 'default')

    # =========================================================================
    # MÉTHODES SPÉCIFIQUES POUR LES ENTRETIENS
    # =========================================================================

    # =========================================================================
    # MÉTHODES SPÉCIFIQUES POUR LES DEMANDES
    # =========================================================================

    @classmethod
    def notifier_refus_demande(cls, demande, user, motif_refus):
        """Notification pour le refus d'une demande de stage"""
        message = (
            f"La demande de {demande.etudiant_prenom} {demande.etudiant_nom} "
            f"(#{demande.tracking_id}) a été refusée. "
            f"Motif : {motif_refus}"
        )
        
        return cls.envoyer_notification(
            user=user,
            titre="Demande refusée",
            message=message,
            type_notif='demande_refusee',
            demande=demande
        )

    @classmethod
    def broadcast_refus_demande(cls, demande, user_acteur, motif_refus):
        """Diffuser le refus d'une demande à tous les utilisateurs"""
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        utilisateurs = User.objects.filter(is_active=True)
        for user in utilisateurs:
            if user != user_acteur:
                cls.notifier_refus_demande(demande, user, motif_refus)
        
        logger.info(f"📢 Broadcast refus envoyé à {utilisateurs.count()} utilisateurs")

    @classmethod
    def notifier_acceptation_demande(cls, demande, user):
        """Notification pour l'acceptation d'une demande de stage"""
        message = (
            f"La demande de {demande.etudiant_prenom} {demande.etudiant_nom} "
            f"(#{demande.tracking_id}) a été acceptée. "
            f"Un entretien peut maintenant être programmé."
        )
        
        return cls.envoyer_notification(
            user=user,
            titre="Demande acceptée",
            message=message,
            type_notif='demande_acceptee',
            demande=demande
        )

    @classmethod
    def broadcast_acceptation_demande(cls, demande, user_acteur):
        """Diffuser l'acceptation d'une demande"""
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        utilisateurs = User.objects.filter(is_active=True)
        for user in utilisateurs:
            if user != user_acteur:
                cls.notifier_acceptation_demande(demande, user)
        
        logger.info(f"📢 Broadcast acceptation envoyé à {utilisateurs.count()} utilisateurs")

    @classmethod
    def notifier_nouvelle_demande(cls, user, demande):
        """Notification pour une nouvelle demande soumise"""
        message = (
            f"Nouvelle demande reçue de {demande.etudiant_prenom} {demande.etudiant_nom} "
            f"pour un stage en {demande.etudiant_specialite or 'domaine non spécifié'}. "
            f"Numéro de suivi : {demande.tracking_id}"
        )
        
        return cls.envoyer_notification(
            user=user,
            titre="Nouvelle demande de stage",
            message=message,
            type_notif='nouvelle_demande',
            demande=demande
        )

    @classmethod
    def broadcast_nouvelle_demande(cls, demande):
        """Diffuser une nouvelle demande à TOUS les utilisateurs actifs"""
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        utilisateurs_concernes = User.objects.filter(is_active=True)
        
        for user in utilisateurs_concernes:
            cls.notifier_nouvelle_demande(user, demande)
        
        logger.info(f"📢 Nouvelle demande #{demande.tracking_id} diffusée à {utilisateurs_concernes.count()} utilisateurs")

    @classmethod
    def notifier_modification_demande(cls, demande, user, modifications):
        """Notification pour la modification d'une demande"""
        modifs_str = ", ".join(modifications)
        message = (
            f"La demande #{demande.tracking_id} de {demande.etudiant_prenom} {demande.etudiant_nom} "
            f"a été modifiée ({modifs_str})."
        )
        
        return cls.envoyer_notification(
            user=user,
            titre="Demande modifiée",
            message=message,
            type_notif='demande_modifiee',
            demande=demande
        )

    @classmethod
    def broadcast_modification_demande(cls, demande, user_acteur, modifications):
        """Diffuser la modification d'une demande"""
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        utilisateurs = User.objects.filter(is_active=True)
        for user in utilisateurs:
            if user != user_acteur:
                cls.notifier_modification_demande(demande, user, modifications)
        
        logger.info(f"📢 Broadcast modification demande envoyé à {utilisateurs.count()} utilisateurs")

    @classmethod
    def notifier_annulation_demande(cls, demande, user, motif=None):
        """Notification pour l'annulation d'une demande"""
        message = (
            f"La demande #{demande.tracking_id} de {demande.etudiant_prenom} {demande.etudiant_nom} "
            f"a été annulée."
        )
        if motif:
            message += f" Motif : {motif}"
        
        return cls.envoyer_notification(
            user=user,
            titre="Demande annulée",
            message=message,
            type_notif='demande_annulee',
            demande=demande
        )

    @classmethod
    def broadcast_annulation_demande(cls, demande, user_acteur, motif=None):
        """Diffuser l'annulation d'une demande"""
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        utilisateurs = User.objects.filter(is_active=True)
        for user in utilisateurs:
            if user != user_acteur:
                cls.notifier_annulation_demande(demande, user, motif)
        
        logger.info(f"📢 Broadcast annulation demande envoyé à {utilisateurs.count()} utilisateurs")

    @classmethod
    def notifier_demande_en_attente(cls, user, demande):
        """Notification pour une demande mise en attente"""
        message = (
            f"La demande #{demande.tracking_id} de {demande.etudiant_prenom} {demande.etudiant_nom} "
            f"a été mise en attente de traitement."
        )
        
        return cls.envoyer_notification(
            user=user,
            titre="Demande en attente",
            message=message,
            type_notif='demande_en_attente',
            demande=demande
        )

    @classmethod
    def notifier_mise_en_traitement(cls, demande, user):
        """Notification pour la mise en traitement d'une demande"""
        message = (
            f"La demande #{demande.tracking_id} de {demande.etudiant_prenom} {demande.etudiant_nom} "
            f"a été mise en cours de traitement."
        )
        
        return cls.envoyer_notification(
            user=user,
            titre="Demande mise en traitement",
            message=message,
            type_notif='demande_en_traitement',
            demande=demande
        )

    @classmethod
    def broadcast_mise_en_traitement(cls, demande, user_acteur):
        """Diffuser la mise en traitement d'une demande à tous les utilisateurs"""
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        utilisateurs = User.objects.filter(is_active=True)
        for user in utilisateurs:
            if user != user_acteur:
                cls.notifier_mise_en_traitement(demande, user)
        
        logger.info(f"📢 Broadcast mise en traitement envoyé à {utilisateurs.count()} utilisateurs")

    @classmethod
    def notifier_suppression_demande(cls, etudiant_nom, tracking_id, user):
        """Notification pour la suppression d'une demande"""
        message = (
            f"La demande #{tracking_id} de {etudiant_nom} "
            f"a été supprimée définitivement du système."
        )
        
        return cls.envoyer_notification(
            user=user,
            titre="Demande supprimée définitivement",
            message=message,
            type_notif='demande_supprimee',
            url='/demandes'
        )

    @classmethod
    def broadcast_suppression_demande(cls, etudiant_nom, tracking_id, utilisateur_courant):
        """Diffuser la suppression d'une demande"""
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        utilisateurs = User.objects.filter(is_active=True)
        for user in utilisateurs:
            if user != utilisateur_courant:
                cls.notifier_suppression_demande(etudiant_nom, tracking_id, user)
        
        logger.info(f"📢 Broadcast suppression demande envoyé à {utilisateurs.count()} utilisateurs")

    # =========================================================================
    # MÉTHODES GÉNÉRIQUES
    # =========================================================================

    @classmethod
    def notifier_demande_acceptee(cls, user, stagiaire, convention):
        """Notification pour une demande acceptée avec convention"""
        message = (
            f"Demande de {stagiaire.prenom} {stagiaire.nom} acceptée. "
            f"Convention #{convention.numero_convention} générée automatiquement."
        )
        
        return cls.envoyer_notification(
            user=user,
            titre="Demande acceptée et convention créée",
            message=message,
            type_notif='success',
            url=f"/conventions/{convention.id}"
        )

    @classmethod
    def notifier_message(cls, user, titre, message, url=None):
        """Notification générique de type message"""
        return cls.envoyer_notification(
            user=user,
            titre=titre,
            message=message,
            type_notif='message',
            url=url
        )

    @classmethod
    def notifier_success(cls, user, titre, message, url=None):
        """Notification de succès"""
        return cls.envoyer_notification(
            user=user,
            titre=titre,
            message=message,
            type_notif='success',
            url=url
        )

    @classmethod
    def notifier_error(cls, user, titre, message, url=None):
        """Notification d'erreur"""
        return cls.envoyer_notification(
            user=user,
            titre=titre,
            message=message,
            type_notif='error',
            url=url
        )

    @classmethod
    def notifier_stage_termine(cls, user, stagiaire):
        """Notification pour un stage terminé"""
        message = f"Le stage de {stagiaire.prenom} {stagiaire.nom} est maintenant terminé."
        
        return cls.envoyer_notification(
            user=user,
            titre="Stage terminé",
            message=message,
            type_notif='stage_termine',
            url=f"/stagiaires/{stagiaire.id}"
        )

    @classmethod
    def broadcast_stage_termine(cls, stagiaire, utilisateur_courant):
        """Diffuser la fin d'un stage"""
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        utilisateurs = User.objects.filter(is_active=True)
        for user in utilisateurs:
            if user != utilisateur_courant:
                cls.notifier_stage_termine(user, stagiaire)
        
        logger.info(f"📢 Broadcast fin stage envoyé à {utilisateurs.count()} utilisateurs")

    @classmethod
    def notifier_nouvelle_convention(cls, user, convention):
        """Notification pour une nouvelle convention générée"""
        message = f"Convention #{convention.numero_convention} a été générée."
        
        return cls.envoyer_notification(
            user=user,
            titre="Nouvelle convention",
            message=message,
            type_notif='convention',
            url=f"/conventions/{convention.id}"
        )

    @classmethod
    def broadcast_nouvelle_convention(cls, convention, createur):
        """Diffuser la création d'une convention"""
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        utilisateurs = User.objects.filter(is_active=True)
        for user in utilisateurs:
            if user != createur:
                cls.notifier_nouvelle_convention(user, convention)
        
        logger.info(f"📢 Broadcast nouvelle convention envoyé à {utilisateurs.count()} utilisateurs")

    # =========================================================================
    # MÉTHODES DE SÉCURITÉ
    # =========================================================================

    @classmethod
    def notifier_changement_securite(cls, user, action, details):
        """Notification pour les changements de sécurité (2FA, mot de passe, etc.)"""
        message = f"{action}. {details}"
        
        return cls.envoyer_notification(
            user=user,
            titre="Alerte Sécurité",
            message=message,
            type_notif='securite',
            url="/profil/securite"
        )

    @classmethod
    def notifier_connexion_suspecte(cls, user, ip_address, user_agent):
        """Notification pour les connexions suspectes"""
        message = (
            f"Connexion détectée depuis une nouvelle adresse IP {ip_address}. "
            f"Appareil: {user_agent}"
        )
        
        return cls.envoyer_notification(
            user=user,
            titre="Connexion suspecte détectée",
            message=message,
            type_notif='securite',
            url="/profil/securite"
        )

    @classmethod
    def notifier_changement_mot_de_passe(cls, user):
        """Notification pour le changement de mot de passe"""
        message = "Votre mot de passe a été modifié avec succès."
        
        return cls.envoyer_notification(
            user=user,
            titre="Mot de passe modifié",
            message=message,
            type_notif='securite',
            url="/profil/securite"
        )
    
    @classmethod
    def notifier_changement_alertes_connexion(cls, user, enabled, message):
        """Notification pour le changement des alertes de connexion"""
        action_text = "activées" if enabled else "désactivées"
        titre = f"Alertes de connexion {action_text}"
        
        return cls.envoyer_notification(
            user=user,
            titre=titre,
            message=message,
            type_notif='securite',
            url="/profil/securite"
        )

    @classmethod
    def notifier_nouvelle_connexion(cls, user, ip_address, user_agent, location=None):
        """Notification pour une nouvelle connexion détectée"""
        navigateur = cls.analyser_user_agent(user_agent)
        message = f"Nouvelle connexion détectée depuis {ip_address} ({navigateur})"
        if location:
            message += f" - {location}"
        
        return cls.envoyer_notification(
            user=user,
            titre="Nouvelle connexion détectée",
            message=message,
            type_notif='securite',
            url="/profil/activite"
        )

    @staticmethod
    def analyser_user_agent(user_agent):
        """Analyser le user agent pour identifier le navigateur"""
        try:
            if 'Chrome' in user_agent and 'Edg' not in user_agent:
                return 'Google Chrome'
            elif 'Firefox' in user_agent:
                return 'Mozilla Firefox'
            elif 'Safari' in user_agent and 'Chrome' not in user_agent:
                return 'Apple Safari'
            elif 'Edg' in user_agent:
                return 'Microsoft Edge'
            elif 'Opera' in user_agent:
                return 'Opera'
            else:
                return 'Navigateur inconnu'
        except:
            return 'Navigateur inconnu'
        
    @classmethod
    def notifier_changement_preference(cls, user, preference, message, enabled):
        """Notification pour le changement de préférence utilisateur"""
        return cls.envoyer_notification(
            user=user,
            titre="Préférence modifiée",
            message=message,
            type_notif='info',
            url="/profil/parametres"
        )

    @classmethod
    def notifier_parametres_mis_a_jour(cls, user, modifications):
        """Notification pour la mise à jour multiple des paramètres"""
        modifs_str = ", ".join(modifications)
        message = f"Vos paramètres ont été mis à jour : {modifs_str}"
        
        return cls.envoyer_notification(
            user=user,
            titre="Paramètres mis à jour",
            message=message,
            type_notif='success',
            url="/profil/parametres"
        )
    
    @classmethod
    def notifier_creation_utilisateur(cls, nouvel_utilisateur, createur):
        """Notification pour la création d'un nouvel utilisateur"""
        message = (
            f"Vous avez créé le compte utilisateur pour {nouvel_utilisateur.first_name} {nouvel_utilisateur.last_name} "
            f"({nouvel_utilisateur.email}) avec le rôle {nouvel_utilisateur.role}."
        )
        
        return cls.envoyer_notification(
            user=createur,
            titre="Nouvel utilisateur créé",
            message=message,
            type_notif='success',
            url=f"/utilisateurs/{nouvel_utilisateur.id}"
        )

    @classmethod
    def broadcast_creation_utilisateur(cls, nouvel_utilisateur, createur):
        """Diffuser la création d'un nouvel utilisateur à tous les utilisateurs"""
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        utilisateurs = User.objects.filter(is_active=True)
        for user in utilisateurs:
            if user != createur:
                message = (
                    f"Un nouvel utilisateur a été créé par {createur.get_full_name() or createur.email}: "
                    f"{nouvel_utilisateur.first_name} {nouvel_utilisateur.last_name} ({nouvel_utilisateur.role})"
                )
                
                cls.envoyer_notification(
                    user=user,
                    titre="Nouvel utilisateur ajouté",
                    message=message,
                    type_notif='info',
                    url=f"/utilisateurs/{nouvel_utilisateur.id}"
                )
        
        logger.info(f"📢 Broadcast création utilisateur envoyé à {utilisateurs.count()} utilisateurs")

    @classmethod
    def notifier_bienvenue_utilisateur(cls, nouvel_utilisateur):
        """Notification de bienvenue pour le nouvel utilisateur"""
        message = (
            f"Bienvenue sur la plateforme GES STAGE ! Votre compte a été créé avec succès. "
            f"Vous pouvez maintenant accéder à toutes les fonctionnalités selon votre rôle ({nouvel_utilisateur.role})."
        )
        
        return cls.envoyer_notification(
            user=nouvel_utilisateur,
            titre="Bienvenue sur GES STAGE",
            message=message,
            type_notif='info',
            url="/dashboard"
        )
    
    # =========================================================================
    # MÉTHODES POUR LES STAGES
    # =========================================================================

    @classmethod
    def notifier_fin_anticipee_stage(cls, stagiaire, utilisateur):
        """Notification pour la fin anticipée d'un stage"""
        message = (
            f"Le stage de {stagiaire.prenom} {stagiaire.nom} a été clôturé de manière anticipée. "
            f"Date de fin : {stagiaire.date_fin.strftime('%d/%m/%Y')}"
        )
        
        return cls.envoyer_notification(
            user=utilisateur,
            titre="Stage terminé de manière anticipée",
            message=message,
            type_notif='warning',
            url=f"/stagiaires/{stagiaire.id}"
        )

    @classmethod
    def broadcast_fin_anticipee_stage(cls, stagiaire, utilisateur_courant):
        """Diffuser la fin anticipée d'un stage à tous les utilisateurs"""
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        utilisateurs = User.objects.filter(is_active=True)
        for user in utilisateurs:
            if user != utilisateur_courant:
                message = (
                    f"Le stage de {stagiaire.prenom} {stagiaire.nom} a été clôturé de manière anticipée "
                    f"par {utilisateur_courant.get_full_name() or utilisateur_courant.email}. "
                    f"Date de fin : {stagiaire.date_fin.strftime('%d/%m/%Y')}"
                )
                
                cls.envoyer_notification(
                    user=user,
                    titre="Fin anticipée de stage",
                    message=message,
                    type_notif='info',
                    url=f"/stagiaires/{stagiaire.id}"
                )
        
        logger.info(f"📢 Broadcast fin anticipée envoyé à {utilisateurs.count()} utilisateurs")

    @classmethod
    def notifier_fin_stage(cls, stagiaire, utilisateur):
        """Notification pour la fin normale d'un stage"""
        message = (
            f"Le stage de {stagiaire.prenom} {stagiaire.nom} est arrivé à son terme. "
            f"Date de fin : {stagiaire.date_fin.strftime('%d/%m/%Y')}"
        )
        
        return cls.envoyer_notification(
            user=utilisateur,
            titre="Stage terminé",
            message=message,
            type_notif='success',
            url=f"/stagiaires/{stagiaire.id}"
        )
    
    @classmethod
    def notifier_modification_periode_stage(cls, stagiaire, utilisateur, ancienne_date_debut, ancienne_date_fin):
        """Notification pour la modification de période d'un stage"""
        message = (
            f"Vous avez modifié la période de stage de {stagiaire.prenom} {stagiaire.nom}. "
            f"Nouvelle période : {stagiaire.date_debut.strftime('%d/%m/%Y')} - {stagiaire.date_fin.strftime('%d/%m/%Y')}"
        )
        
        return cls.envoyer_notification(
            user=utilisateur,
            titre="Période de stage modifiée",
            message=message,
            type_notif='info',
            url=f"/stagiaires/{stagiaire.id}"
        )

    @classmethod
    def broadcast_modification_periode_stage(cls, stagiaire, utilisateur_courant, ancienne_date_debut, ancienne_date_fin):
        """Diffuser la modification de période à tous les utilisateurs"""
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        utilisateurs = User.objects.filter(is_active=True)
        for user in utilisateurs:
            if user != utilisateur_courant:
                message = (
                    f"La période de stage de {stagiaire.prenom} {stagiaire.nom} a été modifiée "
                    f"par {utilisateur_courant.get_full_name() or utilisateur_courant.email}. "
                    f"Ancienne période : {ancienne_date_debut.strftime('%d/%m/%Y') if ancienne_date_debut else 'N/A'} - {ancienne_date_fin.strftime('%d/%m/%Y') if ancienne_date_fin else 'N/A'} "
                    f"→ Nouvelle période : {stagiaire.date_debut.strftime('%d/%m/%Y')} - {stagiaire.date_fin.strftime('%d/%m/%Y')}"
                )
                
                cls.envoyer_notification(
                    user=user,
                    titre="Modification période de stage",
                    message=message,
                    type_notif='info',
                    url=f"/stagiaires/{stagiaire.id}"
                )
        
        logger.info(f"📢 Broadcast modification période envoyé à {utilisateurs.count()} utilisateurs")

    @classmethod
    def notifier_modification_stagiaire(cls, stagiaire, utilisateur, modifications):
        """Notification générique pour modification d'un stagiaire"""
        modifs_str = ", ".join(modifications)
        message = (
            f"Le stagiaire {stagiaire.prenom} {stagiaire.nom} a été modifié ({modifs_str})."
        )
        
        return cls.envoyer_notification(
            user=utilisateur,
            titre="Stagiaire modifié",
            message=message,
            type_notif='info',
            url=f"/stagiaires/{stagiaire.id}"
        )

    @classmethod
    def broadcast_modification_stagiaire(cls, stagiaire, utilisateur_courant, modifications):
        """Diffuser la modification d'un stagiaire"""
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        utilisateurs = User.objects.filter(is_active=True)
        for user in utilisateurs:
            if user != utilisateur_courant:
                cls.notifier_modification_stagiaire(stagiaire, user, modifications)
        
        logger.info(f"📢 Broadcast modification stagiaire envoyé à {utilisateurs.count()} utilisateurs")
    
    @classmethod
    def notifier_ajout_rapport(cls, rapport, utilisateur, ancien_titre=None):
        """Notification pour l'ajout d'un rapport de stage"""
        if ancien_titre:
            message = (
                f"Vous avez remplacé le rapport '{ancien_titre}' par '{rapport.titre}' "
                f"pour {rapport.stagiaire.prenom} {rapport.stagiaire.nom}."
            )
        else:
            message = (
                f"Vous avez ajouté le rapport '{rapport.titre}' "
                f"pour {rapport.stagiaire.prenom} {rapport.stagiaire.nom}."
            )
        
        return cls.envoyer_notification(
            user=utilisateur,
            titre="Rapport de stage ajouté" if not ancien_titre else "Rapport de stage remplacé",
            message=message,
            type_notif='success',
            url=f"/stagiaires/{rapport.stagiaire.id}"
        )

    @classmethod
    def broadcast_ajout_rapport(cls, rapport, utilisateur_courant, ancien_titre=None):
        """Diffuser l'ajout d'un rapport à tous les utilisateurs"""
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        utilisateurs = User.objects.filter(is_active=True)
        for user in utilisateurs:
            if user != utilisateur_courant:
                if ancien_titre:
                    message = (
                        f"Le rapport de {rapport.stagiaire.prenom} {rapport.stagiaire.nom} a été remplacé "
                        f"par {utilisateur_courant.get_full_name() or utilisateur_courant.email}. "
                        f"Ancien : '{ancien_titre}' → Nouveau : '{rapport.titre}'"
                    )
                    titre = "Rapport de stage remplacé"
                else:
                    message = (
                        f"Un nouveau rapport '{rapport.titre}' a été ajouté "
                        f"pour {rapport.stagiaire.prenom} {rapport.stagiaire.nom} "
                        f"par {utilisateur_courant.get_full_name() or utilisateur_courant.email}."
                    )
                    titre = "Nouveau rapport de stage"
                
                cls.envoyer_notification(
                    user=user,
                    titre=titre,
                    message=message,
                    type_notif='info',
                    url=f"/stagiaires/{rapport.stagiaire.id}"
                )
        
        logger.info(f"📢 Broadcast ajout rapport envoyé à {utilisateurs.count()} utilisateurs")

    @classmethod
    def notifier_suppression_rapport(cls, stagiaire, utilisateur, titre_rapport):
        """Notification pour la suppression d'un rapport de stage"""
        message = (
            f"Le rapport '{titre_rapport}' a été supprimé "
            f"pour {stagiaire.prenom} {stagiaire.nom}."
        )
        
        return cls.envoyer_notification(
            user=utilisateur,
            titre="Rapport de stage supprimé",
            message=message,
            type_notif='warning',
            url=f"/stagiaires/{stagiaire.id}"
        )

    @classmethod
    def broadcast_suppression_rapport(cls, stagiaire, utilisateur_courant, titre_rapport):
        """Diffuser la suppression d'un rapport"""
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        utilisateurs = User.objects.filter(is_active=True)
        for user in utilisateurs:
            if user != utilisateur_courant:
                cls.notifier_suppression_rapport(stagiaire, user, titre_rapport)
        
        logger.info(f"📢 Broadcast suppression rapport envoyé à {utilisateurs.count()} utilisateurs")

    @classmethod
    def notifier_validation_rapport(cls, rapport, utilisateur):
        """Notification pour la validation d'un rapport de stage"""
        message = (
            f"Le rapport '{rapport.titre}' de {rapport.stagiaire.prenom} {rapport.stagiaire.nom} "
            f"a été validé avec succès."
        )
        
        return cls.envoyer_notification(
            user=utilisateur,
            titre="Rapport validé",
            message=message,
            type_notif='success',
            url=f"/stagiaires/{rapport.stagiaire.id}"
        )

    @classmethod
    def broadcast_validation_rapport(cls, rapport, validateur):
        """Diffuser la validation d'un rapport"""
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        utilisateurs = User.objects.filter(is_active=True)
        for user in utilisateurs:
            if user != validateur:
                cls.notifier_validation_rapport(rapport, user)
        
        logger.info(f"📢 Broadcast validation rapport envoyé à {utilisateurs.count()} utilisateurs")

    # =========================================================================
    # MÉTHODES POUR LES ATTESTATIONS
    # =========================================================================

    @classmethod
    def notifier_generation_attestation(cls, stagiaire, utilisateur):
        """Notification pour la génération d'une attestation de stage"""
        message = (
            f"Vous avez généré l'attestation de stage pour {stagiaire.prenom} {stagiaire.nom}. "
            f"Période : {stagiaire.date_debut.strftime('%d/%m/%Y')} - {stagiaire.date_fin.strftime('%d/%m/%Y')}"
        )
        
        return cls.envoyer_notification(
            user=utilisateur,
            titre="Attestation de stage générée",
            message=message,
            type_notif='success',
            url=f"/stagiaires/{stagiaire.id}"
        )

    @classmethod
    def broadcast_generation_attestation(cls, stagiaire, utilisateur_courant):
        """Diffuser la génération d'attestation à tous les utilisateurs"""
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        utilisateurs = User.objects.filter(is_active=True)
        for user in utilisateurs:
            if user != utilisateur_courant:
                message = (
                    f"Une attestation de stage a été générée pour {stagiaire.prenom} {stagiaire.nom} "
                    f"par {utilisateur_courant.get_full_name() or utilisateur_courant.email}. "
                    f"Période : {stagiaire.date_debut.strftime('%d/%m/%Y')} - {stagiaire.date_fin.strftime('%d/%m/%Y')}"
                )
                
                cls.envoyer_notification(
                    user=user,
                    titre="Attestation de stage générée",
                    message=message,
                    type_notif='info',
                    url=f"/stagiaires/{stagiaire.id}"
                )
        
        logger.info(f"📢 Broadcast génération attestation envoyé à {utilisateurs.count()} utilisateurs")

    @classmethod
    def notifier_telechargement_attestation(cls, stagiaire, utilisateur):
        """Notification pour le téléchargement d'une attestation"""
        message = (
            f"L'attestation de stage de {stagiaire.prenom} {stagiaire.nom} a été téléchargée."
        )
        
        return cls.envoyer_notification(
            user=utilisateur,
            titre="Attestation téléchargée",
            message=message,
            type_notif='info',
            url=f"/stagiaires/{stagiaire.id}"
        )
    
    # =========================================================================
    # MÉTHODES POUR LES RENOUVELLEMENTS
    # =========================================================================

    @classmethod
    def notifier_renouvellement_stage(cls, ancien_stage, nouveau_stage, utilisateur):
        """Notification pour le renouvellement d'un stage"""
        message = (
            f"Vous avez renouvelé le stage de {nouveau_stage.prenom} {nouveau_stage.nom}. "
            f"Nouvelle période : {nouveau_stage.date_debut.strftime('%d/%m/%Y')} - {nouveau_stage.date_fin.strftime('%d/%m/%Y')} "
            f"({(nouveau_stage.date_fin - nouveau_stage.date_debut).days} jours)"
        )
        
        return cls.envoyer_notification(
            user=utilisateur,
            titre="Stage renouvelé",
            message=message,
            type_notif='success',
            url=f"/stagiaires/{nouveau_stage.id}"
        )

    @classmethod
    def broadcast_renouvellement_stage(cls, ancien_stage, nouveau_stage, utilisateur_courant):
        """Diffuser le renouvellement de stage à tous les utilisateurs"""
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        utilisateurs = User.objects.filter(is_active=True)
        for user in utilisateurs:
            if user != utilisateur_courant:
                message = (
                    f"Le stage de {nouveau_stage.prenom} {nouveau_stage.nom} a été renouvelé "
                    f"par {utilisateur_courant.get_full_name() or utilisateur_courant.email}. "
                    f"Ancien stage : {ancien_stage.type_stage} ({ancien_stage.service}) "
                    f"→ Nouveau stage : {nouveau_stage.type_stage} ({nouveau_stage.service})"
                )
                
                cls.envoyer_notification(
                    user=user,
                    titre="Stage renouvelé",
                    message=message,
                    type_notif='info',
                    url=f"/stagiaires/{nouveau_stage.id}"
                )
        
        logger.info(f"📢 Broadcast renouvellement envoyé à {utilisateurs.count()} utilisateurs")

    @classmethod
    def notifier_creation_stage(cls, stagiaire, utilisateur):
        """Notification pour la création d'un nouveau stage"""
        message = (
            f"Un nouveau stage a été créé pour {stagiaire.prenom} {stagiaire.nom}. "
            f"Période : {stagiaire.date_debut.strftime('%d/%m/%Y')} - {stagiaire.date_fin.strftime('%d/%m/%Y')}"
        )
        
        return cls.envoyer_notification(
            user=utilisateur,
            titre="Nouveau stage créé",
            message=message,
            type_notif='success',
            url=f"/stagiaires/{stagiaire.id}"
        )

    @classmethod
    def broadcast_creation_stage(cls, stagiaire, createur):
        """Diffuser la création d'un stage"""
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        utilisateurs = User.objects.filter(is_active=True)
        for user in utilisateurs:
            if user != createur:
                cls.notifier_creation_stage(stagiaire, user)
        
        logger.info(f"📢 Broadcast création stage envoyé à {utilisateurs.count()} utilisateurs")

    @classmethod
    def notifier_demande_information(cls, demande, utilisateur, message):
        """Notification pour l'envoi d'une demande d'information complémentaire à un étudiant"""
        
        # Message pour l'utilisateur qui a envoyé la demande (confirmation)
        message_confirmation = (
            f"Vous avez envoyé une demande d'information complémentaire à {demande.etudiant_prenom} {demande.etudiant_nom}. "
            f"Numéro de suivi : {demande.tracking_id}"
        )
        
        # Notification de confirmation pour l'utilisateur actuel
        cls.envoyer_notification(
            user=utilisateur,
            titre="Demande d'information envoyée",
            message=message_confirmation,
            type_notif='success',
            demande=demande,
            son='success'
        )
        
        logger.info(f"✅ Notification demande information envoyée à {utilisateur.email}")

        # 🔔 BROADCAST : Notifier tous les autres utilisateurs actifs
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        utilisateurs_concernes = User.objects.filter(is_active=True).exclude(id=utilisateur.id)
        
        for user in utilisateurs_concernes:
            message_broadcast = (
                f"{utilisateur.get_full_name() or utilisateur.email} a envoyé une demande d'information "
                f"à {demande.etudiant_prenom} {demande.etudiant_nom} (Tracking: {demande.tracking_id}). "
                f"Message : {message[:100]}{'...' if len(message) > 100 else ''}"
            )
            
            cls.envoyer_notification(
                user=user,
                titre="Demande d'information complémentaire",
                message=message_broadcast,
                type_notif='info',
                demande=demande,
                son='chime'
            )
        
        logger.info(f"📢 Broadcast demande information envoyé à {utilisateurs_concernes.count()} utilisateurs")

    @classmethod
    def notifier_modification_documents_demande(cls, demande, modifications, documents_ajoutes, documents_supprimes, photo_modifiee, utilisateur):
        """Notification pour la modification des documents d'une demande par l'étudiant"""
        # Compter les types de modifications
        nb_diplomes_ajoutes = sum(1 for doc in documents_ajoutes if 'diplôme' in doc.lower())
        nb_diplomes_supprimes = sum(1 for doc in documents_supprimes if 'diplôme' in doc.lower())
        nb_cv_modifies = sum(1 for mod in modifications if 'cv' in mod.lower())
        nb_lettres_modifiees = sum(1 for mod in modifications if 'lettre' in mod.lower())
        
        # Construire le message simplifié
        details_modifications = []
        
        if photo_modifiee:
            details_modifications.append("photo modifiée")
        
        if nb_cv_modifies > 0:
            details_modifications.append("CV modifié")
        
        if nb_lettres_modifiees > 0:
            details_modifications.append("lettre de motivation modifiée")
        
        if nb_diplomes_ajoutes > 0:
            details_modifications.append("diplôme ajouté")
        
        if nb_diplomes_supprimes > 0:
            details_modifications.append("diplôme supprimé")
        
        message_detail = ", ".join(details_modifications)
        
        # Message principal
        message_principal = (
            f"La demande #{demande.tracking_id} a été modifiée : {message_detail}"
        )
        
        return cls.envoyer_notification(
            user=utilisateur,
            titre="Documents de demande mis à jour",
            message=message_principal,
            type_notif='demande_modifiee',
            demande=demande,
            url=f"/demandes/{demande.id}"
        )

    @classmethod
    def broadcast_modification_documents_demande(cls, demande, modifications, documents_ajoutes, documents_supprimes, photo_modifiee):
        """Diffuser la modification des documents à TOUS les utilisateurs actifs"""
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        # Compter les types de modifications
        nb_diplomes_ajoutes = sum(1 for doc in documents_ajoutes if 'diplôme' in doc.lower())
        nb_diplomes_supprimes = sum(1 for doc in documents_supprimes if 'diplôme' in doc.lower())
        nb_cv_modifies = sum(1 for mod in modifications if 'cv' in mod.lower())
        nb_lettres_modifiees = sum(1 for mod in modifications if 'lettre' in mod.lower())
        
        # Construire le message simplifié
        details_modifications = []
        
        if photo_modifiee:
            details_modifications.append("photo modifiée")
        
        if nb_cv_modifies > 0:
            details_modifications.append("CV modifié")
        
        if nb_lettres_modifiees > 0:
            details_modifications.append("lettre de motivation modifiée")
        
        if nb_diplomes_ajoutes > 0:
            details_modifications.append("diplôme ajouté")
        
        if nb_diplomes_supprimes > 0:
            details_modifications.append("diplôme supprimé")
        
        message_detail = ", ".join(details_modifications)
        
        # Message principal
        message_principal = (
            f"La demande #{demande.tracking_id} a été modifiée : {message_detail}"
        )
        
        # Récupérer TOUS les utilisateurs actifs
        tous_utilisateurs = User.objects.filter(is_active=True)
        
        for utilisateur in tous_utilisateurs:
            cls.envoyer_notification(
                user=utilisateur,
                titre="Documents de demande mis à jour",
                message=message_principal,
                type_notif='demande_modifiee',
                demande=demande,
                url=f"/demandes/{demande.id}"
            )
        
        logger.info(f"📢 Broadcast modification documents envoyé à {tous_utilisateurs.count()} utilisateurs pour demande #{demande.tracking_id}")

    @classmethod
    def notifier_pre_acceptation_demande(cls, demande, user, donnees_pre_acceptation):
        """Notification pour la pré-acceptation d'une demande de stage"""
        duree = donnees_pre_acceptation.get("duree_mois", "NC")
        service = donnees_pre_acceptation.get("service", "NC")
        message = (
            f"La demande #{demande.tracking_id} de {demande.etudiant_prenom} {demande.etudiant_nom} "
            f"a été pré-acceptée pour un stage de {duree} mois dans le service {service}. "
            f"Une convention temporaire a été générée pour signature."
        )
        
        return cls.envoyer_notification(
            user=user,
            titre="Demande pré-acceptée",
            message=message,
            type_notif='demande_pre_acceptee',
            demande=demande,
            url=f"/demandes/{demande.id}"
        )   

    @classmethod
    def broadcast_pre_acceptation_demande(cls, demande, user_acteur, donnees_pre_acceptation):
        """Diffuser la pré-acceptation d'une demande à tous les utilisateurs"""
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        utilisateurs = User.objects.filter(is_active=True)
        for user in utilisateurs:
            if user != user_acteur:
                duree = donnees_pre_acceptation.get("duree_mois", "NC")
                message = (
                    f"La demande #{demande.tracking_id} de {demande.etudiant_prenom} {demande.etudiant_nom} "
                    f"a été pré-acceptée par {user_acteur.get_full_name() or user_acteur.email}. "
                    f"Durée : {duree} mois - Service : {donnees_pre_acceptation.get('service', 'NC')}"
                )
                
                cls.envoyer_notification(
                    user=user,
                    titre="Demande pré-acceptée",
                    message=message,
                    type_notif='demande_pre_acceptee',
                    demande=demande,
                    url=f"/demandes/{demande.id}"
                )
        
        logger.info(f"📢 Broadcast pré-acceptation envoyé à {utilisateurs.count()} utilisateurs")

    @classmethod
    def notifier_annulation_pre_acceptation_simple(cls, demande, user, ancien_statut, donnees_pre_acceptation):
        """Notification pour l'annulation simple d'une pré-acceptation"""
        # Récupérer les informations de la pré-acceptation annulée
        duree = donnees_pre_acceptation.get("duree_mois", "NC") if donnees_pre_acceptation else "NC"
        service = donnees_pre_acceptation.get("service", "NC") if donnees_pre_acceptation else "NC"
        
        message = (
            f"Vous avez annulé la pré-acceptation de la demande #{demande.tracking_id} "
            f"de {demande.etudiant_prenom} {demande.etudiant_nom}. "
            
        )
        
        return cls.envoyer_notification(
            user=user,
            titre="Pré-acceptation annulée",
            message=message,
            type_notif='annulation_pre_acceptation',
            demande=demande,
            url=f"/demandes/{demande.id}"
        )

    @classmethod
    def broadcast_annulation_pre_acceptation_simple(cls, demande, user_acteur, ancien_statut, donnees_pre_acceptation):
        """Diffuser l'annulation d'une pré-acceptation à tous les utilisateurs"""
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        utilisateurs = User.objects.filter(is_active=True)
        
        # Récupérer les informations de la pré-acceptation annulée
        duree = donnees_pre_acceptation.get("duree_mois", "NC") if donnees_pre_acceptation else "NC"
        service = donnees_pre_acceptation.get("service", "NC") if donnees_pre_acceptation else "NC"
        date_debut = donnees_pre_acceptation.get("date_debut", "NC") if donnees_pre_acceptation else "NC"
        
        for user in utilisateurs:
            if user != user_acteur:
                message = (
                    f"La pré-acceptation de la demande #{demande.tracking_id} "
                    f"de {demande.etudiant_prenom} {demande.etudiant_nom} a été annulée "
                    f"par {user_acteur.get_full_name() or user_acteur.email}. "
                    f"Le stage de {duree} mois dans le service {service} (début: {date_debut}) "
                    f"a été annulé. La demande est revenue au statut 'En cours de traitement'."
                )
                
                cls.envoyer_notification(
                    user=user,
                    titre="Pré-acceptation annulée",
                    message=message,
                    type_notif='annulation_pre_acceptation',
                    demande=demande,
                    url=f"/demandes/{demande.id}"
                )
        
        logger.info(f"📢 Broadcast annulation pré-acceptation envoyé à {utilisateurs.count()} utilisateurs")

    @classmethod
    def notifier_nouvelle_demande_attestation(cls, stagiaire, demande_attestation):
        """
        Notification pour une nouvelle demande d'attestation
        Notifie TOUS les utilisateurs actifs
        """
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        # ✅ Récupérer TOUS les utilisateurs actifs
        utilisateurs_actifs = User.objects.filter(is_active=True)
        
        if not utilisateurs_actifs.exists():
            logger.error("❌ Aucun utilisateur actif dans le système")
            return None
        
        message = (
            f"Nouvelle demande d'attestation reçue de {stagiaire.prenom} {stagiaire.nom}. "
            f"Stage effectué du {stagiaire.date_debut.strftime('%d/%m/%Y')} "
            f"au {stagiaire.date_fin.strftime('%d/%m/%Y')} "
            f"({stagiaire.duree_jours} jours) dans le service {stagiaire.service}."
        )
        
        # ✅ Créer pour le premier utilisateur (pour le retour)
        notification_principale = cls.envoyer_notification(
            user=utilisateurs_actifs.first(),
            titre="Nouvelle demande d'attestation",
            message=message,
            type_notif='attestation',
            url=f"/demandes-attestations/{demande_attestation.id}",
            son='bell'
        )
        
        logger.info(
            f"✅ Notification créée : ID={notification_principale.id if notification_principale else 'None'} "
            f"pour {utilisateurs_actifs.count()} utilisateur(s)"
        )
        
        return notification_principale

    @classmethod
    def broadcast_nouvelle_demande_attestation(cls, stagiaire, demande_attestation):
        """
        Diffuser la nouvelle demande d'attestation à TOUS les utilisateurs actifs
        """
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        # ✅ TOUS les utilisateurs actifs
        utilisateurs_actifs = User.objects.filter(is_active=True)
        
        if not utilisateurs_actifs.exists():
            logger.warning("⚠️ Aucun utilisateur actif pour diffuser la notification")
            return
        
        message = (
            f"Nouvelle demande d'attestation reçue de {stagiaire.prenom} {stagiaire.nom}. "
            f"Stage : {stagiaire.type_stage} - {stagiaire.service} "
            f"({stagiaire.date_debut.strftime('%d/%m/%Y')} - {stagiaire.date_fin.strftime('%d/%m/%Y')}). "
            f"Documents soumis : Rapport de stage + Demande manuscrite."
        )
        
        compteur = 0
        for utilisateur in utilisateurs_actifs:
            notification = cls.envoyer_notification(
                user=utilisateur,
                titre="Nouvelle demande d'attestation",
                message=message,
                type_notif='attestation',
                url=f"/demandes-attestations/{demande_attestation.id}",
                son='bell'
            )
            if notification:
                compteur += 1
                logger.info(f"✅ Notification créée pour {utilisateur.email}: ID={notification.id}")
            else:
                logger.error(f"❌ Échec notification pour {utilisateur.email}")
        
        logger.info(
            f"📢 Broadcast demande attestation #{demande_attestation.id} "
            f"diffusée à {compteur}/{utilisateurs_actifs.count()} utilisateurs"
    )
    @staticmethod
    def notifier_attestation_approuvee(stagiaire, demande_attestation, user):
        """Notifie qu'une attestation a été approuvée"""
        try:
            # Notification à l'utilisateur qui a effectué l'action
            Notification.objects.create(
                user=user,
                titre="Attestation approuvée",
                message=f"La demande d'attestation de {stagiaire.prenom} {stagiaire.nom} a été approuvée.",
                type="success",
                icone="check-circle",
                son="success",
                url=f"/demandes-attestation/"
            )
            
            logger.info(f"✅ Notification attestation approuvée créée pour {stagiaire.nom}")
            return True
        except Exception as e:
            logger.error(f"❌ Erreur création notification attestation approuvée: {e}")
            return False
    
    @staticmethod
    def notifier_attestation_refusee(stagiaire, demande_attestation, user, motif):
        """Notifie qu'une attestation a été refusée"""
        try:
            # Notification à l'utilisateur qui a effectué l'action
            Notification.objects.create(
                user=user,
                titre="Attestation refusée",
                message=f"La demande d'attestation de {stagiaire.prenom} {stagiaire.nom} a été refusée. Motif: {motif}",
                type="warning",
                icone="x-circle",
                son="warning",
                url=f"/demandes-attestation/"
            )
            
            logger.info(f"Notification attestation refusée créée pour {stagiaire.nom}")
            return True
        except Exception as e:
            logger.error(f"❌ Erreur création notification attestation refusée: {e}")
            return False
        
    @staticmethod
    def notifier_attestation_signee_upload(stagiaire, demande_attestation, user):
        """
        Crée une notification pour l'upload de l'attestation signée
        """
        try:
            titre = "Attestation signée uploadée"
            message = f"L'attestation signée de {stagiaire.nom} {stagiaire.prenom} a été uploadée et envoyée au stagiaire."
            
            # Créer la notification pour l'utilisateur courant
            notification = Notification.objects.create(
                user=user,
                titre=titre,
                message=message,
                type='success',
                son='success'
            )
            
            # Diffuser aux administrateurs
            NotificationService.broadcast_attestation_signee_upload(stagiaire, demande_attestation)
            
            return notification
            
        except Exception as e:
            logger.error(f"❌ Erreur création notification attestation signée: {e}")
            return None
    
    @classmethod
    def notifier_convention_temporaire_generee(cls, demande, user, convention):
        """Notification quand une convention temporaire est générée lors de la pré-acceptation"""
        try:
            nom_complet = f"{demande.etudiant_prenom} {demande.etudiant_nom}"
            message = (
                f"Une convention temporaire a été générée pour la demande de {nom_complet} "
                f"(N° {demande.tracking_id})."
            )

            notification = cls.envoyer_notification(
                user=user,
                titre="Convention temporaire générée",
                message=message,
                type_notif='convention',
                demande=demande,
                son='success'
            )

            return notification

        except Exception as e:
            logger.error(f"❌ Erreur notification convention temporaire: {e}")
            return None

    @classmethod
    def broadcast_convention_temporaire_generee(cls, demande, user_acteur, convention):
        """Diffuse la notification de convention temporaire à tous les utilisateurs actifs"""
        from django.contrib.auth import get_user_model
        User = get_user_model()

        utilisateurs_actifs = User.objects.filter(is_active=True).exclude(id=user_acteur.id)
        nom_complet = f"{demande.etudiant_prenom} {demande.etudiant_nom}"

        for utilisateur in utilisateurs_actifs:
            cls.envoyer_notification(
                user=utilisateur,
                titre="Convention temporaire générée",
                message=f"Une convention temporaire a été générée pour {nom_complet} (N° {demande.tracking_id}).",
                type_notif='convention',
                demande=demande,
                son='chime'
            )

    @classmethod
    def broadcast_attestation_signee_upload(cls, stagiaire, demande_attestation):
        """
        Diffuse la notification d'upload d'attestation signée à tous les utilisateurs actifs
        
        Args:
            stagiaire: Instance du stagiaire
            demande_attestation: Instance de la demande d'attestation
        """
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        utilisateurs_actifs = User.objects.filter(is_active=True)
        
        if not utilisateurs_actifs.exists():
            logger.warning("⚠️ Aucun utilisateur actif pour diffuser la notification")
            return
        
        message = (
            f"L'attestation signée de {stagiaire.prenom} {stagiaire.nom} "
            f"a été uploadée et envoyée au stagiaire. "
        )
        
        compteur = 0
        for utilisateur in utilisateurs_actifs:
            notification = cls.envoyer_notification(
                user=utilisateur,
                titre="Attestation signée uploadée",
                message=message,
                type_notif='attestation',
                url=f"/demandes-attestations/{demande_attestation.id}",
                son='success'
            )
            if notification:
                compteur += 1
                logger.info(f"✅ Notification créée pour {utilisateur.email}: ID={notification.id}")
            else:
                logger.error(f"❌ Échec notification pour {utilisateur.email}")
        
        logger.info(
            f"📢 Broadcast attestation signée #{demande_attestation.id} "
            f"diffusée à {compteur}/{utilisateurs_actifs.count()} utilisateurs"
        )