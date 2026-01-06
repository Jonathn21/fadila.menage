"""
Templates d'emails additionnels pour d'autres fonctionnalités
Fichier: services/email_templates_extended.py
"""
from django.conf import settings
from django.utils import timezone

def get_user_display_name(user) -> str:
    """Fonction utilitaire pour récupérer le nom d'affichage"""
    if hasattr(user, 'get_full_name'):
        full_name = user.get_full_name()
        if full_name and full_name.strip():
            return full_name
    
    if hasattr(user, 'first_name') and hasattr(user, 'last_name'):
        if user.first_name and user.last_name:
            return f"{user.first_name} {user.last_name}".strip()
        elif user.first_name:
            return user.first_name.strip()
    
    if hasattr(user, 'username') and user.username:
        return user.username
    
    return user.email


def get_gender_based_greeting(first_name: str, gender: str = None) -> str:
    """
    Retourne la salutation appropriée selon le genre.
    
    Args:
        first_name: Le prénom de la personne
        gender: 'Masculin' ou 'Féminin' ou 'Autre'
    
    Returns:
        'Cher Prénom' ou 'Chère Prénom' ou 'Cher(e) Prénom' si genre inconnu
    """
    if not first_name:
        return "Bonjour,"
    
    if gender == 'Masculin':
        return f"Cher {first_name}"
    elif gender == 'Féminin':
        return f"Chère {first_name}"
    else:
        # Pour 'Autre' ou genre non spécifié
        return f"Cher(e) {first_name}"


def get_formal_greeting(last_name: str, gender: str = None) -> str:
    """
    Retourne une salutation formelle selon le genre.
    
    Args:
        last_name: Le nom de famille
        gender: 'Masculin' ou 'Féminin' ou 'Autre'
    
    Returns:
        'Monsieur Nom' ou 'Madame Nom' ou 'Madame, Monsieur Nom' si genre inconnu
    """
    if gender == 'Masculin':
        return f"Monsieur {last_name}"
    elif gender == 'Féminin':
        return f"Madame {last_name}"
    else:
        return f"Madame, Monsieur {last_name}"


class BenchmarkEmailTemplateService:
    """Service pour la construction des emails style Benchmark"""
    
    @staticmethod
    def build_benchmark_email(
        greeting: str, 
        content: str, 
        sender_info: str = None,
        custom_footer: str = None
    ) -> str:
        """Construit un email avec style Benchmark (boîte blanche sur fond gris)"""
        
        # Pour utiliser votre EmailTemplateService existant au lieu de dupliquer le code
        from services.email_service import EmailTemplateService
        
        return EmailTemplateService.build_email(
            greeting=greeting,
            content_html=content,
            subtitle=sender_info or "Service de Gestion des Stages"
        )


class SecurityEmailTemplates:
    """Templates pour les emails de sécurité"""
    
    @staticmethod
    def two_factor_code(user, code: str) -> dict:
        """Email avec code de vérification 2FA"""
        
        content = f"""
<div class="content-box">
    <div style="color: #0D652D; font-weight: bold; margin-bottom: 15px; font-size: 16px;">
        Code de vérification requis
    </div>
    <p style="color: #383838; font-size: 14px; margin-bottom: 20px; line-height: 1.6;">
        Un code de vérification à deux facteurs vous a été envoyé pour sécuriser votre accès.
    </p>
</div>

<div style="text-align: center; margin: 40px 0;">
    <div style="background: #FFFFFF; border: 1px solid #0D652D; border-radius: 6px; padding: 25px; display: inline-block;">
        <div style="font-size: 14px; color: #0D652D; margin-bottom: 15px;">
            Votre code de sécurité
        </div>
        <div style="font-size: 28px; font-weight: bold; color: #0D652D; font-family: 'Courier New', monospace;">
            {code}
        </div>
        <div style="font-size: 13px; color: #666666; margin-top: 15px;">
            Valable 5 minutes
        </div>
    </div>
</div>

<div class="content-box">
    <div style="color: #0D652D; font-weight: bold; margin-bottom: 15px; font-size: 15px;">
        Informations importantes
    </div>
    <ul style="color: #383838; font-size: 14px; line-height: 1.6; padding-left: 20px;">
        <li style="margin-bottom: 8px;">Ce code expire dans 5 minutes</li>
        <li style="margin-bottom: 8px;">Ne partagez jamais ce code</li>
        <li style="margin-bottom: 8px;">5 tentatives maximum autorisées</li>
        <li>En cas de doute, contactez-nous immédiatement</li>
    </ul>
</div>

<div style="text-align: center; margin: 30px 0; padding: 25px;">
    <p style="color: #666666; font-size: 14px; margin: 0; line-height: 1.6;">
        Si vous n'avez pas demandé ce code, veuillez sécuriser votre compte.
    </p>
</div>
        """
        
        # Pour les utilisateurs généraux, on utilise Bonjour
        greeting = f"Bonjour {user.first_name}," if user.first_name else "Bonjour,"
        subject = "Code de vérification - GES STAGE"
        
        return {
            'subject': subject,
            'html': BenchmarkEmailTemplateService.build_benchmark_email(
                greeting, 
                content, 
                "Service d'Authentification Sécurisée"
            ),
            'text': f"""
{subject}

{greeting}

Votre code de vérification à deux facteurs :

    {code}

SECURITE :
• Valable 5 minutes seulement
• 5 tentatives maximum
• Ne partagez jamais ce code

Si vous n'avez pas demandé ce code, sécurisez votre compte.

---
Service de Sécurité
Communauté Électrique du Bénin
"""
        }
    
    @staticmethod
    def login_alert(user, ip_address: str, user_agent: str) -> dict:
        """Email d'alerte de connexion"""
        
        content = f"""
<div class="content-box">
    <div style="color: #0D652D; font-weight: bold; margin-bottom: 15px; font-size: 16px;">
        Nouvelle connexion détectée
    </div>
    <p style="color: #383838; font-size: 14px; margin-bottom: 20px; line-height: 1.6;">
        Une nouvelle connexion à votre compte a été détectée depuis un appareil non reconnu.
    </p>
</div>

<div class="content-box">
    <div style="color: #0D652D; font-weight: bold; margin-bottom: 15px; font-size: 15px;">
        Détails de la connexion
    </div>
    <table class="data-table">
        <tr>
            <th style="width: 140px;">Date et heure</th>
            <td>{user.last_login.strftime('%d/%m/%Y à %H:%M') if user.last_login else 'N/A'}</td>
        </tr>
        <tr>
            <th>Adresse IP</th>
            <td>{ip_address}</td>
        </tr>
        <tr>
            <th>Appareil</th>
            <td>{user_agent[:80]}</td>
        </tr>
        <tr>
            <th>Compte</th>
            <td>{user.email}</td>
        </tr>
    </table>
</div>

<div class="content-box">
    <div style="color: #0D652D; font-weight: bold; margin-bottom: 15px; font-size: 15px;">
        Si ce n'était pas vous
    </div>
    <ol style="color: #383838; font-size: 14px; line-height: 1.6; padding-left: 20px;">
        <li style="margin-bottom: 8px;">Changez immédiatement votre mot de passe</li>
        <li style="margin-bottom: 8px;">Contactez l'administrateur système</li>
        <li style="margin-bottom: 8px;">Activez l'authentification à deux facteurs</li>
    </ol>
</div>

<div style="text-align: center; margin: 30px 0; padding: 25px;">
    <p style="color: #666666; font-size: 14px; margin: 0; line-height: 1.6; font-style: italic;">
        Nous recommandons de maintenir l'authentification à deux facteurs activée.
    </p>
</div>
        """
        
        # Pour les alertes de sécurité, on utilise une salutation formelle
        greeting = f"Bonjour {user.first_name}," if user.first_name else "Bonjour,"
        subject = "Alerte de sécurité - Nouvelle connexion détectée"
        
        return {
            'subject': subject,
            'html': BenchmarkEmailTemplateService.build_benchmark_email(
                greeting, 
                content, 
                "Service de Sécurité et Authentification"
            ),
            'text': f"""
{subject}

{greeting}

Une nouvelle connexion à votre compte a été détectée.

DÉTAILS DE LA CONNEXION :
• Date : {user.last_login.strftime('%d/%m/%Y à %H:%M') if user.last_login else 'N/A'}
• Adresse IP : {ip_address}
• Appareil : {user_agent[:80]}
• Compte : {user.email}

ACTIONS RECOMMANDÉES :
Si ce n'était pas vous :
1. Changez immédiatement votre mot de passe
2. Contactez l'administrateur
3. Activez l'authentification 2FA

---
Service de Sécurité
Communauté Électrique du Bénin
"""
        }
    
    @staticmethod
    def password_changed(user) -> dict:
        """Email de confirmation de changement de mot de passe"""
        
        content = f"""
<div class="content-box">
    <div style="color: #0D652D; font-weight: bold; margin-bottom: 15px; font-size: 16px;">
        Mot de passe modifié
    </div>
    <p style="color: #383838; font-size: 14px; margin-bottom: 20px; line-height: 1.6;">
        Votre mot de passe a été changé avec succès.
    </p>
</div>

<div class="content-box">
    <div style="color: #0D652D; font-weight: bold; margin-bottom: 15px; font-size: 15px;">
        Détails de l'action
    </div>
    <table class="data-table">
        <tr>
            <th style="width: 140px;">Date et heure</th>
            <td>{user.last_login.strftime('%d/%m/%Y à %H:%M') if user.last_login else 'Maintenant'}</td>
        </tr>
        <tr>
            <th>Compte</th>
            <td>{user.email}</td>
        </tr>
    </table>
</div>

<div class="content-box">
    <div style="color: #0D652D; font-weight: bold; margin-bottom: 15px; font-size: 15px;">
        Si vous n'êtes pas à l'origine de cette action
    </div>
    <ol style="color: #383838; font-size: 14px; line-height: 1.6; padding-left: 20px;">
        <li style="margin-bottom: 8px;">Contactez immédiatement l'administrateur</li>
        <li style="margin-bottom: 8px;">Réinitialisez votre mot de passe</li>
        <li>Activez l'authentification à deux facteurs</li>
    </ol>
</div>

<div style="text-align: center; margin: 30px 0; padding: 25px;">
    <p style="color: #666666; font-size: 14px; margin: 0; line-height: 1.6; font-style: italic;">
        Bonnes pratiques : Utilisez un mot de passe unique et complexe.
    </p>
</div>
        """
        
        greeting = f"Bonjour {user.first_name}," if user.first_name else "Bonjour,"
        subject = "Alerte Sécurité - Mot de passe modifié"
        
        return {
            'subject': subject,
            'html': BenchmarkEmailTemplateService.build_benchmark_email(
                greeting, 
                content, 
                "Service de Sécurité"
            ),
            'text': f"""
{subject}

{greeting}

Votre mot de passe a été changé avec succès.

DÉTAILS :
• Date : {user.last_login.strftime('%d/%m/%Y à %H:%M') if user.last_login else 'Maintenant'}
• Compte : {user.email}

IMPORTANT :
Si ce n'était pas vous, contactez immédiatement l'administrateur.

---
Service de Sécurité
Communauté Électrique du Bénin
"""
        }
    
    @staticmethod
    def account_created(user, password: str) -> dict:
        """Email de bienvenue pour nouveau compte"""
        
        FRONTEND_URL = getattr(settings, 'FRONTEND_URL', 'http://localhost:8080')
        
        content = f"""
<div class="content-box">
    <div style="color: #0D652D; font-weight: bold; margin-bottom: 15px; font-size: 16px;">
        Bienvenue sur GES STAGE
    </div>
    <p style="color: #383838; font-size: 14px; margin-bottom: 20px; line-height: 1.6;">
        Votre compte a été créé avec succès. Vous avez maintenant accès à la plateforme de gestion des stages.
    </p>
</div>

<div class="content-box">
    <div style="color: #0D652D; font-weight: bold; margin-bottom: 15px; font-size: 15px;">
        Vos identifiants de connexion
    </div>
    <table class="data-table">
        <tr>
            <th style="width: 180px;">Adresse email</th>
            <td>{user.email}</td>
        </tr>
        <tr>
            <th>Mot de passe temporaire</th>
            <td>{password}</td>
        </tr>
        <tr>
            <th>Rôle</th>
            <td>{user.role}</td>
        </tr>
        <tr>
            <th>Date de création</th>
            <td>{user.date_joined.strftime('%d/%m/%Y')}</td>
        </tr>
    </table>
</div>

<div class="content-box">
    <div style="color: #0D652D; font-weight: bold; margin-bottom: 15px; font-size: 15px;">
        Consignes de sécurité
    </div>
    <ul style="color: #383838; font-size: 14px; line-height: 1.6; padding-left: 20px;">
        <li style="margin-bottom: 8px;">Changez votre mot de passe dès votre première connexion</li>
        <li style="margin-bottom: 8px;">Utilisez un mot de passe fort et unique</li>
        <li style="margin-bottom: 8px;">Ne partagez jamais vos identifiants</li>
        <li>Signalez toute activité suspecte</li>
    </ul>
</div>

<div style="text-align: center; margin: 40px 0;">
    <p style="color: #666666; font-size: 14px; margin-top: 12px;">
        <a href="{FRONTEND_URL}/login/" style="color: #0D652D; text-decoration: none;">
            {FRONTEND_URL}/login/
        </a>
    </p>
</div>
        """
        
        greeting = f"Bonjour {user.first_name}," if user.first_name else "Bonjour,"
        subject = "Bienvenue sur GES STAGE - Communauté Électrique du Bénin"
        
        return {
            'subject': subject,
            'html': BenchmarkEmailTemplateService.build_benchmark_email(
                greeting, 
                content, 
                "Plateforme GES STAGE"
            ),
            'text': f"""
{subject}

{greeting}

Votre compte a été créé avec succès sur la plateforme de gestion des stages.

IDENTIFIANTS :
• Email : {user.email}
• Mot de passe temporaire : {password}
• Rôle : {user.role}
• Date de création : {user.date_joined.strftime('%d/%m/%Y')}

IMPORTANT :
Changez votre mot de passe dès votre première connexion.

CONNEXION :
{FRONTEND_URL}/login/

---
Service des Stages
Communauté Électrique du Bénin
Email: stages@ceb.bj
Téléphone: +229 21 30 05 06
"""
        }

    @staticmethod
    def password_reset_request(user, reset_link: str) -> dict:
        """Email de demande de réinitialisation de mot de passe"""
        
        content = f"""
<div class="content-box">
    <div style="color: #0D652D; font-weight: bold; margin-bottom: 15px; font-size: 16px;">
        Demande de réinitialisation de mot de passe
    </div>
    <p style="color: #383838; font-size: 14px; margin-bottom: 20px; line-height: 1.6;">
        Vous avez demandé la réinitialisation de votre mot de passe GES STAGE.
    </p>
</div>

<div class="content-box">
    <div style="color: #0D652D; font-weight: bold; margin-bottom: 15px; font-size: 15px;">
        Important
    </div>
    <p style="color: #383838; margin: 0; line-height: 1.6;">
        Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email. 
        Votre mot de passe actuel reste inchangé.
    </p>
</div>

<div style="text-align: center; margin: 40px 0;">
    <p style="color: #666666; font-size: 14px; margin-top: 12px; word-break: break-all;">
        <a href="{reset_link}" style="color: #0D652D; text-decoration: none;">
            {reset_link}
        </a>
    </p>
</div>

<div class="content-box">
    <div style="color: #0D652D; font-weight: bold; margin-bottom: 15px; font-size: 15px;">
        Informations importantes
    </div>
    <ul style="color: #383838; font-size: 14px; line-height: 1.6; padding-left: 20px;">
        <li style="margin-bottom: 8px;">Ce lien est valable pendant 24 heures</li>
        <li style="margin-bottom: 8px;">Le lien ne peut être utilisé qu'une seule fois</li>
        <li>Si vous n'avez pas fait cette demande, ignorez cet email</li>
    </ul>
</div>

<div style="text-align: center; margin: 30px 0; padding: 25px;">
    <p style="color: #666666; font-size: 14px; margin: 0; line-height: 1.6; font-style: italic;">
        Si vous n'avez pas demandé cette réinitialisation, contactez le support.
    </p>
</div>
        """
        
        greeting = f"Bonjour {user.first_name}," if user.first_name else "Bonjour,"
        subject = "Réinitialisation de votre mot de passe - GES STAGE"
        
        return {
            'subject': subject,
            'html': BenchmarkEmailTemplateService.build_benchmark_email(
                greeting, 
                content, 
                "Service de Sécurité"
            ),
            'text': f"""
{subject}

{greeting}

Vous avez demandé la réinitialisation de votre mot de passe GES STAGE.

LIEN DE RÉINITIALISATION :
{reset_link}

VALIDITÉ :
• Ce lien est valable 24 heures
• Utilisable une seule fois

CONSEILS DE SÉCURITÉ :
• Choisissez un mot de passe fort et unique
• Activez l'authentification à deux facteurs

---
Service de Sécurité - GES STAGE
Email: securite@ceb.bj
Téléphone: +229 21 30 05 06
"""
        }


class StageEmailTemplates:
    """Templates pour les emails liés aux stages"""
    
    @staticmethod
    def renouvellement_stage(ancien_stage, nouveau_stage) -> dict:
        """Email de renouvellement de stage"""
        
        content = f"""
<div class="content-box">
    <div style="color: #0D652D; font-weight: bold; margin-bottom: 15px; font-size: 16px;">
        Renouvellement de votre stage
    </div>
    <p style="color: #383838; font-size: 14px; margin-bottom: 20px; line-height: 1.6;">
        Votre stage au sein de la CEB a été renouvelé pour une nouvelle période.
    </p>
</div>

<div class="content-box">
    <div style="color: #0D652D; font-weight: bold; margin-bottom: 15px; font-size: 15px;">
        Détails de votre nouveau stage
    </div>
    <table class="data-table">
        <tr>
            <th style="width: 140px;">Stagiaire</th>
            <td>{nouveau_stage.nom} {nouveau_stage.prenom}</td>
        </tr>
        <tr>
            <th>Type de stage</th>
            <td>{nouveau_stage.type_stage}</td>
        </tr>
        <tr>
            <th>Service</th>
            <td>{nouveau_stage.service}</td>
        </tr>
        <tr>
            <th>Période</th>
            <td>Du {nouveau_stage.date_debut.strftime('%d/%m/%Y')} au {nouveau_stage.date_fin.strftime('%d/%m/%Y')}</td>
        </tr>
        <tr>
            <th>Durée</th>
            <td>{(nouveau_stage.date_fin - nouveau_stage.date_debut).days} jours</td>
        </tr>
    </table>
</div>

<div style="text-align: center; margin: 30px 0; padding: 25px;">
    <p style="color: #666666; font-size: 14px; margin: 0; line-height: 1.6; font-style: italic;">
        Nous vous souhaitons une excellente continuation dans votre stage.
    </p>
</div>
        """
        
        # Utilisation du genre du stagiaire pour la salutation
        greeting = get_gender_based_greeting(nouveau_stage.prenom, nouveau_stage.genre)
        
        subject = "Renouvellement de votre stage - Communauté Électrique du Bénin"
        
        return {
            'subject': subject,
            'html': BenchmarkEmailTemplateService.build_benchmark_email(
                greeting, 
                content, 
                "Service des Stages"
            ),
            'text': f"""
{subject}

{greeting},

Votre stage a été renouvelé pour une nouvelle période.

NOUVEAU STAGE :
• Stagiaire : {nouveau_stage.prenom} {nouveau_stage.nom}
• Type : {nouveau_stage.type_stage}
• Service : {nouveau_stage.service}
• Période : {nouveau_stage.date_debut.strftime('%d/%m/%Y')} - {nouveau_stage.date_fin.strftime('%d/%m/%Y')}
• Durée : {(nouveau_stage.date_fin - nouveau_stage.date_debut).days} jours

PROCHAINES ÉTAPES :
• Début : {nouveau_stage.date_debut.strftime('%d/%m/%Y')}
• Présentez-vous à l'accueil avec pièce d'identité

---
Service des Stages
Communauté Électrique du Bénin
Email: stages@ceb.bj
"""
        }
    
    @staticmethod
    def fin_anticipee_stage(stagiaire) -> dict:
        """Email de fin anticipée de stage"""
        
        content = f"""
<div class="content-box">
    <div style="color: #0D652D; font-weight: bold; margin-bottom: 15px; font-size: 16px;">
        Fin de stage
    </div>
    <p style="color: #383838; font-size: 14px; margin-bottom: 20px; line-height: 1.6;">
        Votre stage a pris fin de manière anticipée. Nous vous remercions pour votre contribution.
    </p>
</div>

<div class="content-box">
    <div style="color: #0D652D; font-weight: bold; margin-bottom: 15px; font-size: 15px;">
        Détails de votre stage
    </div>
    <table class="data-table">
        <tr>
            <th style="width: 140px;">Stagiaire</th>
            <td>{stagiaire.prenom} {stagiaire.nom}</td>
        </tr>
        <tr>
            <th>Service</th>
            <td>{stagiaire.service}</td>
        </tr>
        <tr>
            <th>Date de début</th>
            <td>{stagiaire.date_debut.strftime('%d/%m/%Y') if stagiaire.date_debut else 'N/A'}</td>
        </tr>
        <tr>
            <th>Date de fin</th>
            <td>{stagiaire.date_fin.strftime('%d/%m/%Y')}</td>
        </tr>
    </table>
</div>

<div class="content-box">
    <div style="color: #0D652D; font-weight: bold; margin-bottom: 15px; font-size: 15px;">
        Prochaines étapes
    </div>
    <ol style="color: #383838; font-size: 14px; line-height: 1.6; padding-left: 20px;">
        <li style="margin-bottom: 8px;">Restituer tout équipement emprunté</li>
        <li style="margin-bottom: 8px;">Soumettre votre rapport de stage</li>
        <li style="margin-bottom: 8px;">Contacter le service des stages pour attestation</li>
        <li>Débriefing final avec tuteur</li>
    </ol>
</div>

<div style="text-align: center; margin: 30px 0; padding: 25px;">
    <p style="color: #666666; font-size: 14px; margin: 0; line-height: 1.6; font-style: italic;">
        Nous vous remercions pour votre contribution.
    </p>
</div>
        """
        
        # Utilisation du genre du stagiaire pour la salutation
        greeting = get_gender_based_greeting(stagiaire.prenom, stagiaire.genre)
        
        subject = "Fin de stage - Communauté Électrique du Bénin"
        
        return {
            'subject': subject,
            'html': BenchmarkEmailTemplateService.build_benchmark_email(
                greeting, 
                content, 
                "Service des Stages"
            ),
            'text': f"""
{subject}

{greeting},

Votre stage a pris fin de manière anticipée.

DÉTAILS :
• Stagiaire : {stagiaire.prenom} {stagiaire.nom}
• Service : {stagiaire.service}
• Date de début : {stagiaire.date_debut.strftime('%d/%m/%Y') if stagiaire.date_debut else 'N/A'}
• Date de fin : {stagiaire.date_fin.strftime('%d/%m/%Y')}

À FAIRE :
1. Restituer tout équipement emprunté
2. Soumettre votre rapport de stage
3. Contacter le service des stages
4. Débriefing final avec tuteur

---
Service des Stages
Communauté Électrique du Bénin
Email: stages@ceb.bj
"""
        }
    
    @staticmethod
    def modification_periode(stagiaire, ancienne_debut, ancienne_fin) -> dict:
        """Email de modification de période de stage"""
        
        content = f"""
<div class="content-box">
    <div style="color: #0D652D; font-weight: bold; margin-bottom: 15px; font-size: 16px;">
        Modification de votre période de stage
    </div>
    <p style="color: #383838; font-size: 14px; margin-bottom: 20px; line-height: 1.6;">
        Les dates de votre stage ont été modifiées.
    </p>
</div>

<div class="content-box">
    <div style="color: #0D652D; font-weight: bold; margin-bottom: 15px; font-size: 15px;">
        Comparaison des dates
    </div>
    <table class="data-table">
        <tr>
            <th style="width: 180px;">Ancienne date de début</th>
            <td>{ancienne_debut.strftime('%d/%m/%Y') if ancienne_debut else 'N/A'}</td>
        </tr>
        <tr>
            <th>Nouvelle date de début</th>
            <td>{stagiaire.date_debut.strftime('%d/%m/%Y')}</td>
        </tr>
        <tr>
            <th>Ancienne date de fin</th>
            <td>{ancienne_fin.strftime('%d/%m/%Y') if ancienne_fin else 'N/A'}</td>
        </tr>
        <tr>
            <th>Nouvelle date de fin</th>
            <td>{stagiaire.date_fin.strftime('%d/%m/%Y')}</td>
        </tr>
    </table>
</div>

<div style="text-align: center; margin: 30px 0; padding: 25px;">
    <p style="color: #666666; font-size: 14px; margin: 0; line-height: 1.6; font-style: italic;">
        Pour toute question, contactez votre responsable ou le service des stages.
    </p>
</div>
        """
        
        # Utilisation du genre du stagiaire pour la salutation
        greeting = get_gender_based_greeting(stagiaire.prenom, stagiaire.genre)
        
        subject = "Modification de votre période de stage - CEB"
        
        return {
            'subject': subject,
            'html': BenchmarkEmailTemplateService.build_benchmark_email(
                greeting, 
                content, 
                "Service des Stages"
            ),
            'text': f"""
{subject}

{greeting},

Les dates de votre stage ont été modifiées.

COMPARAISON :
ANCIENNES DATES :
• Début : {ancienne_debut.strftime('%d/%m/%Y') if ancienne_debut else 'N/A'}
• Fin : {ancienne_fin.strftime('%d/%m/%Y') if ancienne_fin else 'N/A'}

NOUVELLES DATES :
• Début : {stagiaire.date_debut.strftime('%d/%m/%Y')}
• Fin : {stagiaire.date_fin.strftime('%d/%m/%Y')}

---
Service des Stages
Communauté Électrique du Bénin
"""
        }
    
    @staticmethod
    def stagiaire_welcome(stagiaire) -> dict:
        """Email de bienvenue pour le premier jour de stage"""
        
        content = f"""
<div class="content-box">
    <div style="color: #0D652D; font-weight: bold; margin-bottom: 15px; font-size: 16px;">
        Bienvenue pour votre premier jour de stage
    </div>
    <p style="color: #383838; font-size: 14px; margin-bottom: 20px; line-height: 1.6;">
        Nous sommes ravis de vous accueillir au sein de la Communauté Électrique du Bénin.
    </p>
</div>

<div class="content-box">
    <div style="color: #0D652D; font-weight: bold; margin-bottom: 15px; font-size: 15px;">
        Informations de votre stage
    </div>
    <table class="data-table">
        <tr>
            <th style="width: 140px;">Stagiaire</th>
            <td>{stagiaire.prenom} {stagiaire.nom}</td>
        </tr>
        <tr>
            <th>Service</th>
            <td>{stagiaire.service}</td>
        </tr>
        <tr>
            <th>Direction</th>
            <td>{stagiaire.direction}</td>
        </tr>
        <tr>
            <th>Période</th>
            <td>Du {stagiaire.date_debut.strftime('%d/%m/%Y')} au {stagiaire.date_fin.strftime('%d/%m/%Y')}</td>
        </tr>
        <tr>
            <th>Durée</th>
            <td>{stagiaire.duree_jours} jours</td>
        </tr>
    </table>
</div>

<div class="content-box">
    <div style="color: #0D652D; font-weight: bold; margin-bottom: 15px; font-size: 15px;">
        Informations pratiques
    </div>
    <ul style="color: #383838; font-size: 14px; line-height: 1.6; padding-left: 20px;">
        <li style="margin-bottom: 8px;">Présentez-vous à l'accueil avec convention de stage</li>
        <li style="margin-bottom: 8px;">Horaires : 7h00 - 16h00</li>
        <li>Pause déjeuner : 12h00 - 13h00</li>
    </ul>
</div>

<div style="text-align: center; margin: 30px 0; padding: 25px;">
    <p style="color: #666666; font-size: 14px; margin: 0; line-height: 1.6; font-style: italic;">
        Nous vous souhaitons un excellent stage.
    </p>
</div>
        """
        
        # Utilisation du genre du stagiaire pour la salutation
        greeting = get_gender_based_greeting(stagiaire.prenom, stagiaire.genre)
        
        subject = "Bienvenue pour votre premier jour de stage - CEB"
        
        return {
            'subject': subject,
            'html': BenchmarkEmailTemplateService.build_benchmark_email(
                greeting, 
                content, 
                "Service des Stages"
            ),
            'text': f"""
{subject}

{greeting},

Bienvenue pour votre premier jour de stage à la CEB.

INFORMATIONS DE VOTRE STAGE :
• Stagiaire : {stagiaire.prenom} {stagiaire.nom}
• Service : {stagiaire.service}
• Direction : {stagiaire.direction}
• Période : {stagiaire.date_debut.strftime('%d/%m/%Y')} - {stagiaire.date_fin.strftime('%d/%m/%Y')}
• Durée : {stagiaire.duree_jours} jours

INFORMATIONS PRATIQUES :
• Présentez-vous à l'accueil avec convention de stage
• Horaires : 7h00 - 16h00
• Pause déjeuner : 12h00 - 13h00

---
Service des Stages
Communauté Électrique du Bénin
Email: stages@ceb.bj
Téléphone: +229 21 30 05 06
"""
        }
    
    @staticmethod
    def demande_attestation_confirmation(stagiaire, demande_attestation):
        """Email de confirmation de demande d'attestation au stagiaire"""
        
        # Utilisation du genre du stagiaire pour la salutation
        greeting = get_gender_based_greeting(stagiaire.prenom, stagiaire.genre)
        
        subject = f"✅ Demande d'attestation enregistrée - CEB"
        
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px; text-align: center; color: white;">
                <h1 style="margin: 0; font-size: 28px;">✅ Demande Enregistrée</h1>
            </div>
            
            <div style="padding: 30px; background-color: #f9fafb;">
                <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
                    {greeting} {stagiaire.nom},
                </p>
                
                <p style="font-size: 14px; color: #6b7280; line-height: 1.6;">
                    Votre demande d'attestation de stage a été enregistrée avec succès 
                    le <strong>{demande_attestation.date_demande.strftime('%d/%m/%Y à %H:%M')}</strong>.
                </p>
                
                <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;">
                    <h3 style="margin: 0 0 10px 0; color: #1e40af; font-size: 16px;">
                        📋 Statut actuel
                    </h3>
                    <p style="margin: 0; color: #1e3a8a; font-size: 14px;">
                        <strong>En attente de traitement</strong>
                    </p>
                </div>
                
                <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
                    <h3 style="margin: 0 0 10px 0; color: #92400e; font-size: 16px;">
                        ⏳ Prochaines étapes
                    </h3>
                    <ul style="margin: 5px 0; padding-left: 20px; color: #78350f; font-size: 14px;">
                        <li>Votre demande sera examinée par notre service administratif</li>
                        <li>Vous recevrez une notification par email dès qu'elle sera traitée</li>
                        <li>Si votre demande est approuvée, l'attestation sera générée automatiquement</li>
                        <li>Vous pourrez télécharger votre attestation depuis votre espace de suivi</li>
                    </ul>
                </div>
                
                <div style="background-color: #e0f2fe; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin: 0 0 10px 0; color: #0c4a6e; font-size: 16px;">
                        📄 Informations de votre stage
                    </h3>
                    <table style="width: 100%; font-size: 14px; color: #475569;">
                        <tr>
                            <td style="padding: 5px 0;"><strong>Type de stage:</strong></td>
                            <td style="padding: 5px 0;">{stagiaire.type_stage}</td>
                        </tr>
                        <tr>
                            <td style="padding: 5px 0;"><strong>Période:</strong></td>
                            <td style="padding: 5px 0;">
                                {stagiaire.date_debut.strftime('%d/%m/%Y')} - {stagiaire.date_fin.strftime('%d/%m/%Y')}
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 5px 0;"><strong>Direction:</strong></td>
                            <td style="padding: 5px 0;">{stagiaire.direction}</td>
                        </tr>
                        <tr>
                            <td style="padding: 5px 0;"><strong>Service:</strong></td>
                            <td style="padding: 5px 0;">{stagiaire.service}</td>
                        </tr>
                    </table>
                </div>
                
                <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                    <p style="font-size: 12px; color: #9ca3af; margin: 5px 0;">
                        Vous avez des questions ? Contactez-nous à contact@ceb-benin.org
                    </p>
                    <p style="font-size: 12px; color: #9ca3af; margin: 5px 0;">
                        © 2025 Communauté Électrique du Bénin - Tous droits réservés
                    </p>
                </div>
            </div>
        </div>
        """
        
        text = f"""
Demande d'Attestation Enregistrée - CEB

{greeting} {stagiaire.nom},

Votre demande d'attestation de stage a été enregistrée avec succès 
le {demande_attestation.date_demande.strftime('%d/%m/%Y à %H:%M')}.

STATUT ACTUEL
En attente de traitement

PROCHAINES ÉTAPES
- Votre demande sera examinée par notre service administratif
- Vous recevrez une notification par email dès qu'elle sera traitée
- Si votre demande est approuvée, l'attestation sera générée automatiquement
- Vous pourrez télécharger votre attestation depuis votre espace de suivi

INFORMATIONS DE VOTRE STAGE
Type de stage: {stagiaire.type_stage}
Période: {stagiaire.date_debut.strftime('%d/%m/%Y')} - {stagiaire.date_fin.strftime('%d/%m/%Y')}
Direction: {stagiaire.direction}
Service: {stagiaire.service}

Vous avez des questions ? Contactez-nous à contact@ceb-benin.org

© 2025 Communauté Électrique du Bénin - Tous droits réservés
        """
        
        return {
            'subject': subject,
            'html': html,
            'text': text
        }
    
    @staticmethod
    def nouvelle_demande_attestation_admin(stagiaire, demande_attestation):
        """Email de notification aux administrateurs pour nouvelle demande d'attestation"""
        
        # Pour les administrateurs, on utilise une salutation collective
        greeting = "Chers administrateurs,"
        
        subject = f"Nouvelle demande d'attestation - {stagiaire.prenom} {stagiaire.nom}"
        
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; text-align: center; color: white;">
                <h1 style="margin: 0; font-size: 28px;">🔔 Nouvelle Demande d'Attestation</h1>
            </div>
            
            <div style="padding: 30px; background-color: #f9fafb;">
                <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; color: #92400e; font-size: 14px;">
                        Une nouvelle demande d'attestation nécessite votre attention.
                    </p>
                </div>
                
                <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
                    <h3 style="margin: 0 0 15px 0; color: #111827; font-size: 18px;">
                        👤 Informations du stagiaire
                    </h3>
                    <table style="width: 100%; font-size: 14px; color: #475569;">
                        <tr>
                            <td style="padding: 8px 0;"><strong>Nom complet:</strong></td>
                            <td style="padding: 8px 0;">{stagiaire.prenom} {stagiaire.nom}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0;"><strong>Email:</strong></td>
                            <td style="padding: 8px 0;">{stagiaire.email}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0;"><strong>Téléphone:</strong></td>
                            <td style="padding: 8px 0;">{stagiaire.telephone}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0;"><strong>Genre:</strong></td>
                            <td style="padding: 8px 0;">{stagiaire.genre}</td>
                        </tr>
                    </table>
                </div>
                
                <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
                    <h3 style="margin: 0 0 15px 0; color: #111827; font-size: 18px;">
                        📋 Détails du stage
                    </h3>
                    <table style="width: 100%; font-size: 14px; color: #475569;">
                        <tr>
                            <td style="padding: 8px 0;"><strong>Type:</strong></td>
                            <td style="padding: 8px 0;">{stagiaire.type_stage}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0;"><strong>Période:</strong></td>
                            <td style="padding: 8px 0;">
                                {stagiaire.date_debut.strftime('%d/%m/%Y')} - {stagiaire.date_fin.strftime('%d/%m/%Y')}
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0;"><strong>Direction:</strong></td>
                            <td style="padding: 8px 0;">{stagiaire.direction}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0;"><strong>Service:</strong></td>
                            <td style="padding: 8px 0;">{stagiaire.service}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0;"><strong>Statut:</strong></td>
                            <td style="padding: 8px 0;">
                                <span style="background-color: #dbeafe; color: #1e40af; padding: 4px 8px; border-radius: 4px; font-weight: bold;">
                                    {getattr(stagiaire, 'statut_actuel', 'Actif')}
                                </span>
                            </td>
                        </tr>
                    </table>
                </div>
                
                <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
                    <h3 style="margin: 0 0 15px 0; color: #111827; font-size: 18px;">
                        📄 Détails de la demande
                    </h3>
                    <table style="width: 100%; font-size: 14px; color: #475569;">
                        <tr>
                            <td style="padding: 8px 0;"><strong>Date de demande:</strong></td>
                            <td style="padding: 8px 0;">{demande_attestation.date_demande.strftime('%d/%m/%Y à %H:%M')}</td>
                        </tr>
                    </table>
                </div>
                
                <div style="text-align: center; margin-top: 30px;">
                    <a href="https://votre-domaine.com/admin/stages" 
                       style="display: inline-block; background-color: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                        Traiter la demande
                    </a>
                </div>
                
                <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                    <p style="font-size: 12px; color: #9ca3af; margin: 5px 0;">
                        Cet email a été envoyé automatiquement par le système de gestion des stages CEB
                    </p>
                </div>
            </div>
        </div>
        """
        
        text = f"""
Nouvelle Demande d'Attestation - CEB

Chers administrateurs,

Une nouvelle demande d'attestation nécessite votre attention.

INFORMATIONS DU STAGIAIRE
Nom complet: {stagiaire.prenom} {stagiaire.nom}
Email: {stagiaire.email}
Téléphone: {stagiaire.telephone}
Genre: {stagiaire.genre}

DÉTAILS DU STAGE
Type: {stagiaire.type_stage}
Période: {stagiaire.date_debut.strftime('%d/%m/%Y')} - {stagiaire.date_fin.strftime('%d/%m/%Y')}
Direction: {stagiaire.direction}
Service: {stagiaire.service}
Statut: {getattr(stagiaire, 'statut_actuel', 'Actif')}

DÉTAILS DE LA DEMANDE
Date de demande: {demande_attestation.date_demande.strftime('%d/%m/%Y à %H:%M')}

Connectez-vous à votre espace administrateur pour traiter cette demande.

Cet email a été envoyé automatiquement par le système de gestion des stages CEB
        """
        
        return {
            'subject': subject,
            'html': html,
            'text': text
        }


class PreferenceEmailTemplates:
    """Templates pour les emails liés aux préférences"""
    
    @staticmethod
    def newsletter_welcome(user) -> dict:
        """Email de bienvenue pour l'abonnement aux nouveautés"""
        
        user_name = get_user_display_name(user)
        
        content = f"""
<div class="content-box">
    <div style="color: #0D652D; font-weight: bold; margin-bottom: 15px; font-size: 16px;">
        Abonnement activé
    </div>
    <p style="color: #383838; font-size: 14px; margin-bottom: 20px; line-height: 1.6;">
        Vous êtes maintenant abonné(e) aux emails des nouveautés de la plateforme Stages CEB.
    </p>
</div>

<div class="content-box">
    <div style="color: #0D652D; font-weight: bold; margin-bottom: 15px; font-size: 15px;">
        Ce que vous recevrez
    </div>
    <ul style="color: #383838; font-size: 14px; line-height: 1.6; padding-left: 20px;">
        <li style="margin-bottom: 8px;">Nouvelles fonctionnalités de la plateforme</li>
        <li style="margin-bottom: 8px;">Mises à jour importantes</li>
        <li style="margin-bottom: 8px;">Conseils d'utilisation</li>
        <li>Annonces importantes de la CEB</li>
    </ul>
</div>

<div style="text-align: center; margin: 30px 0; padding: 25px;">
    <p style="color: #666666; font-size: 14px; margin: 0; line-height: 1.6; font-style: italic;">
        Vous pouvez modifier vos préférences dans la section "Paramètres" de votre profil.
    </p>
</div>
        """
        
        # Pour les newsletters, on utilise Bonjour
        greeting = f"Bonjour {user_name}," if user_name else "Bonjour,"
        subject = "Bienvenue dans les nouveautés CEB"
        
        return {
            'subject': subject,
            'html': BenchmarkEmailTemplateService.build_benchmark_email(
                greeting, 
                content, 
                "Service Communication"
            ),
            'text': f"""
{subject}

{greeting}

Vous êtes maintenant abonné(e) aux emails des nouveautés de la plateforme Stages CEB.

CE QUE VOUS RECEVREZ :
• Nouvelles fonctionnalités de la plateforme
• Mises à jour importantes
• Conseils d'utilisation
• Annonces importantes de la CEB

GESTION DE VOS PRÉFÉRENCES :
Vous pouvez modifier vos préférences dans la section "Paramètres".

---
Service Communication
Communauté Électrique du Bénin
"""
        }


class DemandeEmailTemplates:
    """Templates pour les emails liés aux demandes de stage"""
    
    @staticmethod
    def new_demande_admin_notification(demande) -> dict:
        """Email de notification aux admins pour une nouvelle demande"""
        
        content = f"""
<div class="content-box">
    <div style="color: #0D652D; font-weight: bold; margin-bottom: 15px; font-size: 16px;">
        Nouvelle demande de stage
    </div>
    <p style="color: #383838; font-size: 14px; margin-bottom: 20px; line-height: 1.6;">
        Une nouvelle candidature a été soumise et nécessite votre attention.
    </p>
</div>

<div class="content-box">
    <div style="color: #0D652D; font-weight: bold; margin-bottom: 15px; font-size: 15px;">
        Informations du candidat
    </div>
    <table class="data-table">
        <tr>
            <th style="width: 140px;">Nom complet</th>
            <td>{demande.etudiant_nom} {demande.etudiant_prenom}</td>
        </tr>
        <tr>
            <th>Email</th>
            <td>{demande.etudiant_email}</td>
        </tr>
        <tr>
            <th>Téléphone</th>
            <td>{demande.etudiant_telephone}</td>
        </tr>
        <tr>
            <th>Domaine d'étude</th>
            <td>{demande.etudiant_specialite}</td>
        </tr>
        <tr>
            <th>Type de stage</th>
            <td>{demande.type_stage or 'Non spécifié'}</td>
        </tr>
        {f'''
        <tr>
            <th>Établissement</th>
            <td>{demande.etablissement.nom}</td>
        </tr>
        ''' if demande.etablissement else ''}
        <tr>
            <th>Genre</th>
            <td>{demande.genre}</td>
        </tr>
    </table>
</div>

<div style="text-align: center; margin: 30px 0; padding: 25px;">
    <div style="font-size: 14px; color: #0D652D; margin-bottom: 10px;">
        Numéro de suivi
    </div>
    <div style="font-size: 16px; font-weight: 600; color: #0D652D; font-family: 'Courier New', monospace;">
        {demande.tracking_id}
    </div>
    <div style="font-size: 13px; color: #666666; margin-top: 8px;">
        Soumis le {demande.date_soumission.strftime('%d/%m/%Y à %H:%M')}
    </div>
</div>

<div style="text-align: center; margin: 30px 0; padding: 25px;">
    <p style="color: #666666; font-size: 14px; margin: 0; line-height: 1.6; font-style: italic;">
        Cette demande est en attente de traitement.
    </p>
</div>
        """
        
        greeting = "Chers administrateurs,"
        subject = f"Nouvelle demande de stage - {demande.etudiant_nom} {demande.etudiant_prenom}"
        
        return {
            'subject': subject,
            'html': BenchmarkEmailTemplateService.build_benchmark_email(
                greeting, 
                content, 
                "Service de Gestion des Candidatures"
            ),
            'text': f"""
{subject}

{greeting}

Une nouvelle candidature a été soumise sur la plateforme GES STAGE.

CANDIDAT :
• Nom : {demande.etudiant_nom} {demande.etudiant_prenom}
• Email : {demande.etudiant_email}
• Téléphone : {demande.etudiant_telephone}
• Genre : {demande.genre}

FORMATION :
• Domaine : {demande.etudiant_specialite}
• Type de stage : {demande.type_stage or 'Non spécifié'}
• Établissement : {demande.etablissement.nom if demande.etablissement else 'Non spécifié'}

INFORMATIONS :
• Tracking ID : {demande.tracking_id}
• Date : {demande.date_soumission.strftime('%d/%m/%Y à %H:%M')}

ACTION REQUISE :
Cette demande est en attente de traitement.

---
Service de Gestion des Stages
Communauté Électrique du Bénin
"""
        }
    
    @staticmethod
    def confirmation_reception_candidat(demande) -> dict:
        """Email de confirmation de réception au candidat"""
        
        # Utilisation du genre du candidat pour la salutation
        greeting = get_gender_based_greeting(demande.etudiant_prenom, demande.genre)
        
        content = f"""
<div class="content-box">
    <div style="color: #0D652D; font-weight: bold; margin-bottom: 15px; font-size: 16px;">
        Votre demande de stage est enregistrée
    </div>
    <p style="color: #383838; font-size: 14px; margin-bottom: 20px; line-height: 1.6;">
        Nous accusons réception de votre candidature pour un stage au sein de la Communauté Électrique du Bénin.
    </p>
</div>

<div class="content-box">
    <div style="color: #0D652D; font-weight: bold; margin-bottom: 15px; font-size: 15px;">
        Informations de votre candidature
    </div>
    <table class="data-table">
        <tr>
            <th style="width: 140px;">Nom complet</th>
            <td>{demande.etudiant_nom} {demande.etudiant_prenom}</td>
        </tr>
        <tr>
            <th>Numéro de suivi</th>
            <td><strong>{demande.tracking_id}</strong></td>
        </tr>
        <tr>
            <th>Date de soumission</th>
            <td>{demande.date_soumission.strftime('%d/%m/%Y à %H:%M')}</td>
        </tr>
        <tr>
            <th>Domaine d'étude</th>
            <td>{demande.etudiant_specialite}</td>
        </tr>
    </table>
</div>

<div class="content-box">
    <div style="color: #0D652D; font-weight: bold; margin-bottom: 15px; font-size: 15px;">
        Prochaines étapes
    </div>
    <ol style="color: #383838; font-size: 14px; line-height: 1.6; padding-left: 20px;">
        <li style="margin-bottom: 8px;">Notre équipe examinera votre candidature</li>
        <li style="margin-bottom: 8px;">Vous recevrez une réponse sous 15 jours ouvrés</li>
        <li style="margin-bottom: 8px;">Si retenu, vous serez contacté pour un entretien</li>
        <li>Vous pouvez suivre l'état de votre demande sur la plateforme</li>
    </ol>
</div>

<div style="text-align: center; margin: 30px 0; padding: 25px;">
    <p style="color: #666666; font-size: 14px; margin: 0; line-height: 1.6; font-style: italic;">
        Nous vous remercions de l'intérêt que vous portez à la CEB.
    </p>
</div>
        """
        
        subject = f"Accusé de réception - Demande de stage n°{demande.tracking_id}"
        
        return {
            'subject': subject,
            'html': BenchmarkEmailTemplateService.build_benchmark_email(
                greeting, 
                content, 
                "Service des Stages - CEB"
            ),
            'text': f"""
{subject}

{greeting},

Nous accusons réception de votre candidature pour un stage au sein de la Communauté Électrique du Bénin.

INFORMATIONS DE VOTRE CANDIDATURE :
• Nom : {demande.etudiant_nom} {demande.etudiant_prenom}
• Numéro de suivi : {demande.tracking_id}
• Date : {demande.date_soumission.strftime('%d/%m/%Y à %H:%M')}
• Domaine : {demande.etudiant_specialite}

PROCHAINES ÉTAPES :
1. Notre équipe examinera votre candidature
2. Vous recevrez une réponse sous 15 jours ouvrés
3. Si retenu, vous serez contacté pour un entretien
4. Vous pouvez suivre l'état de votre demande sur la plateforme

Nous vous remercions de l'intérêt que vous portez à la CEB.

---
Service des Stages
Communauté Électrique du Bénin
Email: stages@ceb.bj
Téléphone: +229 21 30 05 06
"""
        }
    
    
    
    @staticmethod
    def rejection_notification(demande, raison_refus=None) -> dict:
        """Email de notification de refus au candidat"""
        
        # Utilisation du genre du candidat pour la salutation
        greeting = get_gender_based_greeting(demande.etudiant_prenom, demande.genre)
        
        raison = raison_refus or demande.raison_refus or "Le nombre de places disponibles est limité."
        
        content = f"""
<div class="content-box">
    <div style="color: #dc2626; font-weight: bold; margin-bottom: 15px; font-size: 16px;">
        Réponse à votre candidature de stage
    </div>
    <p style="color: #383838; font-size: 14px; margin-bottom: 20px; line-height: 1.6;">
        Nous vous remercions de l'intérêt que vous avez porté à la Communauté Électrique du Bénin.
    </p>
</div>

<div class="content-box">
    <div style="color: #dc2626; font-weight: bold; margin-bottom: 15px; font-size: 15px;">
        Décision
    </div>
    <p style="color: #383838; font-size: 14px; margin-bottom: 15px; line-height: 1.6;">
        Après un examen attentif de votre dossier, nous regrettons de vous informer que votre candidature n'a pas été retenue pour cette session.
    </p>
    
    <div style="background-color: #fef2f2; padding: 15px; border-radius: 6px; margin: 15px 0;">
        <p style="color: #7f1d1d; font-size: 14px; margin: 0; line-height: 1.6;">
            <strong>Motif :</strong> {raison}
        </p>
    </div>
</div>

<div class="content-box">
    <div style="color: #0D652D; font-weight: bold; margin-bottom: 15px; font-size: 15px;">
        Informations de votre candidature
    </div>
    <table class="data-table">
        <tr>
            <th style="width: 140px;">Nom complet</th>
            <td>{demande.etudiant_nom} {demande.etudiant_prenom}</td>
        </tr>
        <tr>
            <th>Numéro de suivi</th>
            <td><strong>{demande.tracking_id}</strong></td>
        </tr>
        <tr>
            <th>Date de soumission</th>
            <td>{demande.date_soumission.strftime('%d/%m/%Y à %H:%M')}</td>
        </tr>
        <tr>
            <th>Type de stage</th>
            <td>{demande.type_stage}</td>
        </tr>
    </table>
</div>

<div style="text-align: center; margin: 30px 0; padding: 25px; background-color: #f8fafc; border-radius: 8px;">
    <p style="color: #475569; font-size: 14px; margin: 0; line-height: 1.6; font-style: italic;">
        Nous vous remercions encore pour votre candidature et vous souhaitons plein succès dans vos recherches futures.
    </p>
</div>
        """
        
        subject = f"Réponse à votre candidature de stage - {demande.tracking_id}"
        
        return {
            'subject': subject,
            'html': BenchmarkEmailTemplateService.build_benchmark_email(
                greeting, 
                content, 
                "Service des Stages - CEB"
            ),
            'text': f"""
{subject}

{greeting},

Nous vous remercions de l'intérêt que vous avez porté à la Communauté Électrique du Bénin.

DÉCISION :
Après un examen attentif de votre dossier, nous regrettons de vous informer que votre candidature n'a pas été retenue pour cette session.

MOTIF :
{raison}

INFORMATIONS DE VOTRE CANDIDATURE :
• Nom : {demande.etudiant_nom} {demande.etudiant_prenom}
• Numéro de suivi : {demande.tracking_id}
• Date de soumission : {demande.date_soumission.strftime('%d/%m/%Y à %H:%M')}
• Type de stage : {demande.type_stage}

Nous vous remercions encore pour votre candidature et vous souhaitons plein succès dans vos recherches futures.

---
Service des Stages
Communauté Électrique du Bénin
Email: stages@ceb.bj
Téléphone: +229 21 30 05 06
"""
        }