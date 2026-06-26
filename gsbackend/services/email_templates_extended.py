"""
Templates d'emails additionnels pour d'autres fonctionnalités
Fichier: services/email_templates_extended.py
"""
from typing import Dict
from django.conf import settings
from django.utils import timezone
# Remplacer par :
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from services.email_service import EmailTemplateService, EmailContentService

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


def get_gender_based_greeting(last_name: str, gender: str = None) -> str:
    """
    Retourne la salutation appropriée selon le genre.

    Args:
        last_name: Le nom de famille de la personne
        gender: 'Masculin' ou 'Féminin' ou 'Autre'

    Returns:
        'Monsieur Nom' ou 'Madame Nom' ou 'Madame, Monsieur Nom' si genre inconnu
    """
    if not last_name:
        return "Madame, Monsieur,"

    if gender == 'Masculin':
        return f"Monsieur {last_name}"
    elif gender == 'Féminin':
        return f"Madame {last_name}"
    else:
        return f"Madame, Monsieur {last_name}"


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
        """Génère l'email contenant le code de vérification 2FA"""
        
        content = f"""
<div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; color: #333;">

    
    <!-- Message principal -->
    <div style="margin-bottom: 30px;">
        <p style="color: #6B7280; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
            Un code de vérification à deux facteurs vous a été envoyé pour sécuriser votre accès.
        </p>
    </div>
    
    <!-- Code de sécurité -->
    <div style="text-align: center; margin: 30px 0; padding: 25px; background-color: #F7F8FA; border-radius: 0;">
        <div style="font-size: 16px; color: #1F2933; margin-bottom: 15px; font-weight: bold;">
            Votre code de sécurité
        </div>
        <div style="font-size: 32px; font-weight: bold; color: #1F2933; letter-spacing: 8px; font-family: monospace;">
            {code}
        </div>
    </div>
    
    <!-- Informations importantes -->
    <div style="background-color: #F7F8FA; border: 1px solid #F7F8FA; border-radius: 0; padding: 20px; margin-bottom: 25px;">
        <h3 style="color: #1F2933; margin: 0 0 15px 0; font-size: 16px; font-weight: bold;">
            Informations importantes
        </h3>
        
        <ul style="color: #666; font-size: 14px; line-height: 1.6; padding-left: 20px; margin: 0;">
            <li style="margin-bottom: 10px;">Ce code expire dans 5 minutes</li>
            <li style="margin-bottom: 10px;">Ne partagez jamais ce code avec qui que ce soit</li>
            <li style="margin-bottom: 10px;">5 tentatives maximum autorisées</li>
            <li>En cas de doute, contactez-nous immédiatement</li>
        </ul>
    </div>
    
    <!-- Pied de page -->
    <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e0e0e0; margin-top: 30px;">
        <p style="color: #999; font-size: 13px; margin: 0; line-height: 1.5;">
            Si vous n'avez pas demandé ce code, veuillez sécuriser votre compte.<br>
            Cet email a été envoyé automatiquement. Veuillez ne pas y répondre.
        </p>
    </div>
</div>
        """
        
        greeting = f"Madame, Monsieur {user.last_name}" if user.last_name else "Madame, Monsieur,"
        subject = "Code de vérification - GES STAGE"
        
        return {
            'subject': subject,
            'html': BenchmarkEmailTemplateService.build_benchmark_email(
                greeting, 
                content, 
                "Service d'Authentification Sécurisée"
            ),
            'text': f"""{subject}

{greeting}

Un code de vérification à deux facteurs vous a été envoyé pour sécuriser votre accès.

VOTRE CODE DE SÉCURITÉ : {code}

IMPORTANT :
• Ce code expire dans 5 minutes
• Ne partagez jamais ce code
• 5 tentatives maximum autorisées

Si vous n'avez pas demandé ce code, sécurisez immédiatement votre compte.

---
Service d'Authentification Sécurisée
Communauté Électrique du Bénin
Email: securite@cebnet.org"""
        }
    
    @staticmethod
    def login_alert(user, ip_address: str, user_agent: str) -> dict:
        """Email d'alerte de connexion"""
        
        content = f"""
<div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; color: #333;">
   
    
    <!-- Message principal -->
    <div style="margin-bottom: 30px;">
        <p style="color: #6B7280; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
            Une nouvelle connexion à votre compte a été détectée depuis un appareil non reconnu.
        </p>
    </div>
    
    <!-- Détails de connexion -->
    <div style="background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 0; padding: 20px; margin-bottom: 30px;">
        <h3 style="color: #1F2933; margin: 0 0 15px 0; font-size: 16px; font-weight: bold;">
            Détails de la connexion
        </h3>
        
        <table style="width: 100%; font-size: 14px;">
            <tr>
                <td style="padding: 10px 0; width: 180px; color: #666; font-weight: 600;">Date et heure :</td>
                <td style="padding: 10px 0; color: #333;">{user.last_login.strftime('%d/%m/%Y à %H:%M') if user.last_login else 'N/A'}</td>
            </tr>
            <tr>
                <td style="padding: 10px 0; color: #666; font-weight: 600;">Adresse IP :</td>
                <td style="padding: 10px 0; color: #333;">{ip_address}</td>
            </tr>
            <tr>
                <td style="padding: 10px 0; color: #666; font-weight: 600;">Appareil :</td>
                <td style="padding: 10px 0; color: #333;">{user_agent[:80]}</td>
            </tr>
            <tr>
                <td style="padding: 10px 0; color: #666; font-weight: 600;">Compte :</td>
                <td style="padding: 10px 0; color: #333;">{user.email}</td>
            </tr>
        </table>
    </div>
    
    <!-- Section sécurité -->
    <div style="background-color: #F7F8FA; border: 1px solid #F7F8FA; border-radius: 0; padding: 20px; margin-bottom: 25px;">
        <h3 style="color: #1F2933; margin: 0 0 15px 0; font-size: 16px; font-weight: bold;">
            Si ce n'était pas vous
        </h3>
        
        <ol style="color: #666; font-size: 14px; line-height: 1.6; padding-left: 20px; margin: 0;">
            <li style="margin-bottom: 10px;">Changez immédiatement votre mot de passe</li>
            <li style="margin-bottom: 10px;">Contactez l'administrateur système</li>
            <li>Activez l'authentification à deux facteurs pour plus de sécurité</li>
        </ol>
    </div>
    
    <!-- Recommandation -->
    <div style="text-align: center; background-color: #F7F8FA; padding: 20px; border-radius: 0; margin-top: 20px;">
        <p style="color: #1F2933; font-size: 14px; margin: 0; font-weight: bold;">
            Recommandation de sécurité
        </p>
        <p style="color: #666; font-size: 14px; margin: 10px 0 0 0; line-height: 1.5;">
            Nous recommandons de maintenir l'authentification à deux facteurs activée pour une meilleure protection.
        </p>
    </div>
</div>
        """
        
        greeting = f"Madame, Monsieur {user.last_name}" if user.last_name else "Madame, Monsieur,"
        subject = "Alerte de sécurité - Nouvelle connexion détectée"
        
        return {
            'subject': subject,
            'html': BenchmarkEmailTemplateService.build_benchmark_email(
                greeting, 
                content, 
                "Service de Sécurité et Authentification"
            ),
            'text': f"""{subject}

{greeting}

Une nouvelle connexion à votre compte a été détectée depuis un appareil non reconnu.

DÉTAILS DE LA CONNEXION :
• Date et heure : {user.last_login.strftime('%d/%m/%Y à %H:%M') if user.last_login else 'N/A'}
• Adresse IP : {ip_address}
• Appareil : {user_agent[:80]}
• Compte : {user.email}

ACTIONS RECOMMANDÉES :
Si ce n'était pas vous :
1. Changez immédiatement votre mot de passe
2. Contactez l'administrateur système
3. Activez l'authentification à deux facteurs

---
Service de Sécurité et Authentification
Communauté Électrique du Bénin
Email: securite@cebnet.org
Téléphone: +229 21 30 05 06"""
        }
    
    @staticmethod
    def password_changed(user) -> dict:
        """Email de confirmation de changement de mot de passe"""
        
        content = f"""
<div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; color: #333;">
   
    
    <!-- Message principal -->
    <div style="margin-bottom: 30px;">
        <p style="color: #6B7280; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
            Votre mot de passe a été modifié avec succès.
        </p>
        
        <div style="background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 0; padding: 15px;">
            <p style="margin: 0; color: #1F2933; font-size: 14px; font-weight: bold; margin-bottom: 10px;">
                Détails de l'opération
            </p>
            <table style="width: 100%; font-size: 14px;">
                <tr>
                    <td style="padding: 8px 0; width: 160px; color: #666; font-weight: 600;">Date et heure :</td>
                    <td style="padding: 8px 0; color: #333;">{user.last_login.strftime('%d/%m/%Y à %H:%M') if user.last_login else 'Maintenant'}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #666; font-weight: 600;">Compte :</td>
                    <td style="padding: 8px 0; color: #333;">{user.email}</td>
                </tr>
            </table>
        </div>
    </div>
    
    <!-- Section sécurité -->
    <div style="background-color: #F7F8FA; border: 1px solid #F7F8FA; border-radius: 0; padding: 20px; margin-bottom: 25px;">
        <h3 style="color: #1F2933; margin: 0 0 15px 0; font-size: 16px; font-weight: bold;">
            Important : vérification de sécurité
        </h3>
        
        <p style="color: #666; font-size: 14px; margin-bottom: 15px; line-height: 1.5;">
            Si vous n'avez pas initié ce changement de mot de passe, veuillez :
        </p>
        
        <ul style="color: #666; font-size: 14px; line-height: 1.6; padding-left: 20px; margin: 0;">
            <li style="margin-bottom: 8px;">Contacter immédiatement l'administrateur système</li>
            <li style="margin-bottom: 8px;">Réinitialiser votre mot de passe via la procédure de récupération</li>
            <li>Activer l'authentification à deux facteurs pour renforcer la sécurité</li>
        </ul>
    </div>
    
    <!-- Bonnes pratiques -->
    <div style="background-color: #F7F8FA; border-radius: 0; padding: 18px; margin-bottom: 25px;">
        <h4 style="color: #1F2933; margin: 0 0 10px 0; font-size: 15px; font-weight: bold;">
            Recommandations de sécurité
        </h4>
        <p style="color: #666; font-size: 14px; margin: 0; line-height: 1.5;">
            Pour protéger votre compte, utilisez un mot de passe unique et complexe, 
            différent de ceux utilisés sur d'autres services. L'authentification à deux 
            facteurs est fortement recommandée pour une sécurité optimale.
        </p>
    </div>
</div>
        """
        
        greeting = f"Madame, Monsieur {user.last_name}" if user.last_name else "Madame, Monsieur,"
        subject = "Confirmation de modification de votre mot de passe"
        
        return {
            'subject': subject,
            'html': BenchmarkEmailTemplateService.build_benchmark_email(
                greeting, 
                content, 
                "Service de Sécurité"
            ),
            'text': f"""{subject}
{'-' * 50}

{greeting}

Votre mot de passe a été modifié avec succès.

INFORMATIONS SUR L'OPERATION :
• Date et heure : {user.last_login.strftime('%d/%m/%Y à %H:%M') if user.last_login else 'Maintenant'}
• Compte concerné : {user.email}

IMPORTANT - VERIFICATION DE SECURITE :
Si vous n'êtes pas à l'origine de cette modification :
1. Contactez immédiatement l'administrateur système
2. Réinitialisez votre mot de passe via la procédure de récupération
3. Activez l'authentification à deux facteurs

RECOMMANDATIONS :
- Utilisez un mot de passe unique et complexe
- N'utilisez pas le même mot de passe sur plusieurs services
- Activez l'authentification à deux facteurs pour plus de sécurité

---
Service de Sécurité
Communauté Électrique du Bénin
Email: securite@cebnet.org"""
        }
    
    @staticmethod
    def account_created(user, password: str) -> dict:
        """Email de bienvenue pour nouveau compte"""
        
        FRONTEND_URL = getattr(settings, 'FRONTEND_URL', 'http://localhost:8080')
        
        content = f"""
<div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; color: #333;">
   
    
    <!-- Message principal -->
    <div style="margin-bottom: 30px;">
        <p style="color: #6B7280; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
            Votre compte a été créé avec succès. Vous avez maintenant accès à la plateforme de gestion des stages.
        </p>
    </div>
    
    <!-- Identifiants -->
    <div style="background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 0; padding: 20px; margin-bottom: 30px;">
        <h3 style="color: #1F2933; margin: 0 0 15px 0; font-size: 16px; font-weight: bold;">
            Vos identifiants de connexion
        </h3>
        
        <table style="width: 100%; font-size: 14px;">
            <tr>
                <td style="padding: 10px 0; width: 180px; color: #666; font-weight: 600;">Adresse email :</td>
                <td style="padding: 10px 0; color: #333;">{user.email}</td>
            </tr>
            <tr>
                <td style="padding: 10px 0; color: #666; font-weight: 600;">Mot de passe temporaire :</td>
                <td style="padding: 10px 0; color: #333; font-family: monospace;">{password}</td>
            </tr>
            <tr>
                <td style="padding: 10px 0; color: #666; font-weight: 600;">Rôle :</td>
                <td style="padding: 10px 0; color: #333;">{user.role}</td>
            </tr>
            <tr>
                <td style="padding: 10px 0; color: #666; font-weight: 600;">Date de création :</td>
                <td style="padding: 10px 0; color: #333;">{user.date_joined.strftime('%d/%m/%Y')}</td>
            </tr>
        </table>
    </div>
    
    <!-- Consignes de sécurité -->
    <div style="background-color: #F7F8FA; border: 1px solid #F7F8FA; border-radius: 0; padding: 20px; margin-bottom: 25px;">
        <h3 style="color: #1F2933; margin: 0 0 15px 0; font-size: 16px; font-weight: bold;">
            Consignes de sécurité importantes
        </h3>
        
        <ul style="color: #666; font-size: 14px; line-height: 1.6; padding-left: 20px; margin: 0;">
            <li style="margin-bottom: 10px;">Changez votre mot de passe dès votre première connexion</li>
            <li style="margin-bottom: 10px;">Utilisez un mot de passe fort et unique</li>
            <li style="margin-bottom: 10px;">Ne partagez jamais vos identifiants</li>
            <li>Signalez toute activité suspecte</li>
        </ul>
    </div>
    
    <!-- Lien de connexion -->
    <div style="text-align: center; margin: 30px 0; padding: 20px; background-color: #F7F8FA; border-radius: 0;">
        <p style="color: #1F2933; font-size: 15px; margin: 0 0 10px 0; font-weight: bold;">
            Accédez à la plateforme
        </p>
        <p style="color: #666; font-size: 14px; margin: 0;">
            <a href="stageemploi@cebnet.org" style="color: #1F2933; text-decoration: underline;">
                stageemploi@cebnet.org/
            </a>
        </p>
    </div>
</div>
        """
        
        greeting = f"Madame, Monsieur {user.last_name}" if user.last_name else "Madame, Monsieur,"
        subject = "Bienvenue sur GES STAGE - Communauté Électrique du Bénin"
        
        return {
            'subject': subject,
            'html': BenchmarkEmailTemplateService.build_benchmark_email(
                greeting, 
                content, 
                "Plateforme GES STAGE"
            ),
            'text': f"""{subject}

{greeting}

Votre compte a été créé avec succès sur la plateforme de gestion des stages.

VOS IDENTIFIANTS :
• Email : {user.email}
• Mot de passe temporaire : {password}
• Rôle : {user.role}
• Date de création : {user.date_joined.strftime('%d/%m/%Y')}

IMPORTANT - SÉCURITÉ :
Changez votre mot de passe dès votre première connexion et utilisez un mot de passe fort et unique.

ACCÈS À LA PLATEFORME :
stageemploi@cebnet.org/

---
Service des Stages
Communauté Électrique du Bénin
Email: stageemploi@cebnet.org
Téléphone: +229 21 30 05 06"""
        }

    @staticmethod
    def password_reset_request(user, reset_link: str) -> dict:
        """Email de demande de réinitialisation de mot de passe"""
        
        content = f"""
<div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; color: #333;">
 
    
    <!-- Message principal -->
    <div style="margin-bottom: 30px;">
        <p style="color: #6B7280; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
            Vous avez demandé la réinitialisation de votre mot de passe GES STAGE.
        </p>
    </div>
    
    <!-- Lien de réinitialisation -->
    <div style="background-color: #F7F8FA; border-radius: 0; padding: 25px; text-align: center; margin: 30px 0;">
        <p style="color: #1F2933; font-size: 15px; margin: 0 0 15px 0; font-weight: bold;">
            Lien de réinitialisation
        </p>
        <p style="color: #666; font-size: 14px; margin: 0; word-break: break-all;">
            <a href="{reset_link}" style="color: #1F2933; text-decoration: underline;">
                {reset_link}
            </a>
        </p>
    </div>
    
    <!-- Informations importantes -->
    <div style="background-color: #F7F8FA; border: 1px solid #F7F8FA; border-radius: 0; padding: 20px; margin-bottom: 25px;">
        <h3 style="color: #1F2933; margin: 0 0 15px 0; font-size: 16px; font-weight: bold;">
            Informations importantes
        </h3>
        
        <ul style="color: #666; font-size: 14px; line-height: 1.6; padding-left: 20px; margin: 0;">
            <li style="margin-bottom: 10px;">Ce lien est valable pendant 24 heures</li>
            <li style="margin-bottom: 10px;">Le lien ne peut être utilisé qu'une seule fois</li>
            <li>Si vous n'avez pas fait cette demande, ignorez cet email</li>
        </ul>
    </div>
    
    <!-- Note de sécurité -->
    <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e0e0e0; margin-top: 30px;">
        <p style="color: #999; font-size: 13px; margin: 0; line-height: 1.5;">
            Si vous n'avez pas demandé cette réinitialisation, contactez immédiatement le support.<br>
            Cet email a été envoyé automatiquement. Veuillez ne pas y répondre.
        </p>
    </div>
</div>
        """
        
        greeting = f"Madame, Monsieur {user.last_name}" if user.last_name else "Madame, Monsieur,"
        subject = "Réinitialisation de votre mot de passe - GES STAGE"
        
        return {
            'subject': subject,
            'html': BenchmarkEmailTemplateService.build_benchmark_email(
                greeting, 
                content, 
                "Service de Sécurité"
            ),
            'text': f"""{subject}

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
Email: securite@cebnet.org
Téléphone: +229 21 30 05 06"""
        }


class StageEmailTemplates:
    """Templates pour les emails liés aux stages"""
    
    @staticmethod
    def renouvellement_stage(ancien_stage, nouveau_stage) -> dict:
        """Email de renouvellement de stage"""
        
        content = f"""
<div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; color: #333;">
   
    
    <!-- Message principal -->
    <div style="margin-bottom: 30px;">
        <p style="color: #6B7280; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
            Votre stage au sein de la CEB a été renouvelé pour une nouvelle période.
        </p>
    </div>
    
    <!-- Détails du nouveau stage -->
    <div style="background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 0; padding: 20px; margin-bottom: 30px;">
        <h3 style="color: #1F2933; margin: 0 0 15px 0; font-size: 16px; font-weight: bold;">
            Détails de votre nouveau stage
        </h3>
        
        <table style="width: 100%; font-size: 14px;">
            <tr>
                <td style="padding: 10px 0; width: 140px; color: #666; font-weight: 600;">Stagiaire :</td>
                <td style="padding: 10px 0; color: #333;">{nouveau_stage.nom} {nouveau_stage.prenom}</td>
            </tr>
            <tr>
                <td style="padding: 10px 0; color: #666; font-weight: 600;">Type de stage :</td>
                <td style="padding: 10px 0; color: #333;">{nouveau_stage.type_stage}</td>
            </tr>
            <tr>
                <td style="padding: 10px 0; color: #666; font-weight: 600;">Service :</td>
                <td style="padding: 10px 0; color: #333;">{nouveau_stage.service}</td>
            </tr>
            <tr>
                <td style="padding: 10px 0; color: #666; font-weight: 600;">Période :</td>
                <td style="padding: 10px 0; color: #333;">Du {nouveau_stage.date_debut.strftime('%d/%m/%Y')} au {nouveau_stage.date_fin.strftime('%d/%m/%Y')}</td>
            </tr>
            <tr>
                <td style="padding: 10px 0; color: #666; font-weight: 600;">Durée :</td>
                <td style="padding: 10px 0; color: #333;">{(nouveau_stage.date_fin - nouveau_stage.date_debut).days} jours</td>
            </tr>
        </table>
    </div>
    
    <!-- Message de fin -->
    <div style="text-align: center; background-color: #F7F8FA; padding: 20px; border-radius: 0; margin-top: 20px;">
        <p style="color: #1F2933; font-size: 15px; margin: 0; font-weight: bold;">
            Nous vous souhaitons une excellente continuation dans votre stage
        </p>
    </div>
</div>
        """
        
        greeting = get_gender_based_greeting(nouveau_stage.nom, nouveau_stage.genre)
        subject = "Renouvellement de votre stage - Communauté Électrique du Bénin"
        
        return {
            'subject': subject,
            'html': BenchmarkEmailTemplateService.build_benchmark_email(
                greeting, 
                content, 
                "Service des Stages"
            ),
            'text': f"""{subject}

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
Email: stages@cebnet.org"""
        }
    
    @staticmethod
    def fin_anticipee_stage(stagiaire) -> dict:
        """Email de fin anticipée de stage"""
        
        content = f"""
<div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; color: #333;">
  
    
    <!-- Message principal -->
    <div style="margin-bottom: 30px;">
        <p style="color: #6B7280; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
            Votre stage a pris fin de manière anticipée. Nous vous remercions pour votre contribution.
        </p>
    </div>
    
    <!-- Détails du stage -->
    <div style="background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 0; padding: 20px; margin-bottom: 30px;">
        <h3 style="color: #1F2933; margin: 0 0 15px 0; font-size: 16px; font-weight: bold;">
            Détails de votre stage
        </h3>
        
        <table style="width: 100%; font-size: 14px;">
            <tr>
                <td style="padding: 10px 0; width: 140px; color: #666; font-weight: 600;">Stagiaire :</td>
                <td style="padding: 10px 0; color: #333;">{stagiaire.prenom} {stagiaire.nom}</td>
            </tr>
            <tr>
                <td style="padding: 10px 0; color: #666; font-weight: 600;">Service :</td>
                <td style="padding: 10px 0; color: #333;">{stagiaire.service}</td>
            </tr>
            <tr>
                <td style="padding: 10px 0; color: #666; font-weight: 600;">Date de début :</td>
                <td style="padding: 10px 0; color: #333;">{stagiaire.date_debut.strftime('%d/%m/%Y') if stagiaire.date_debut else 'N/A'}</td>
            </tr>
            <tr>
                <td style="padding: 10px 0; color: #666; font-weight: 600;">Date de fin :</td>
                <td style="padding: 10px 0; color: #333;">{stagiaire.date_fin.strftime('%d/%m/%Y')}</td>
            </tr>
        </table>
    </div>
    
    <!-- Prochaines étapes -->
    <div style="background-color: #F7F8FA; border: 1px solid #F7F8FA; border-radius: 0; padding: 20px; margin-bottom: 25px;">
        <h3 style="color: #1F2933; margin: 0 0 15px 0; font-size: 16px; font-weight: bold;">
            Prochaines étapes
        </h3>
        
        <ol style="color: #666; font-size: 14px; line-height: 1.6; padding-left: 20px; margin: 0;">
            <li style="margin-bottom: 10px;">Restituer tout équipement emprunté</li>
            <li style="margin-bottom: 10px;">Soumettre votre rapport de stage</li>
            <li style="margin-bottom: 10px;">Contacter le service des stages pour attestation</li>
            <li>Débriefing final avec tuteur</li>
        </ol>
    </div>
    
    <!-- Message de remerciement -->
    <div style="text-align: center; background-color: #F7F8FA; padding: 20px; border-radius: 0; margin-top: 20px;">
        <p style="color: #1F2933; font-size: 15px; margin: 0; font-weight: bold;">
            Nous vous remercions pour votre contribution
        </p>
    </div>
</div>
        """
        
        greeting = get_gender_based_greeting(stagiaire.nom, stagiaire.genre)
        subject = "Fin de stage - Communauté Électrique du Bénin"
        
        return {
            'subject': subject,
            'html': BenchmarkEmailTemplateService.build_benchmark_email(
                greeting, 
                content, 
                "Service des Stages"
            ),
            'text': f"""{subject}

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
Email: stages@cebnet.org"""
        }
    
    @staticmethod
    def modification_periode(stagiaire, ancienne_debut, ancienne_fin) -> dict:
        """Email de modification de période de stage"""
        
        content = f"""
<div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; color: #333;">
   
    
    <!-- Message principal -->
    <div style="margin-bottom: 30px;">
        <p style="color: #6B7280; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
            Les dates de votre stage ont été modifiées.
        </p>
    </div>
    
    <!-- Comparaison des dates -->
    <div style="background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 0; padding: 20px; margin-bottom: 30px;">
        <h3 style="color: #1F2933; margin: 0 0 15px 0; font-size: 16px; font-weight: bold;">
            Comparaison des dates
        </h3>
        
        <table style="width: 100%; font-size: 14px;">
            <tr>
                <td style="padding: 10px 0; width: 180px; color: #666; font-weight: 600;">Ancienne date de début :</td>
                <td style="padding: 10px 0; color: #333;">{ancienne_debut.strftime('%d/%m/%Y') if ancienne_debut else 'N/A'}</td>
            </tr>
            <tr>
                <td style="padding: 10px 0; color: #666; font-weight: 600;">Nouvelle date de début :</td>
                <td style="padding: 10px 0; color: #333;">{stagiaire.date_debut.strftime('%d/%m/%Y')}</td>
            </tr>
            <tr>
                <td style="padding: 10px 0; color: #666; font-weight: 600;">Ancienne date de fin :</td>
                <td style="padding: 10px 0; color: #333;">{ancienne_fin.strftime('%d/%m/%Y') if ancienne_fin else 'N/A'}</td>
            </tr>
            <tr>
                <td style="padding: 10px 0; color: #666; font-weight: 600;">Nouvelle date de fin :</td>
                <td style="padding: 10px 0; color: #333;">{stagiaire.date_fin.strftime('%d/%m/%Y')}</td>
            </tr>
        </table>
    </div>
    
    <!-- Note -->
    <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e0e0e0; margin-top: 30px;">
        <p style="color: #999; font-size: 13px; margin: 0; line-height: 1.5;">
            Pour toute question, contactez votre responsable ou le service des stages.
        </p>
    </div>
</div>
        """
        
        greeting = get_gender_based_greeting(stagiaire.nom, stagiaire.genre)
        subject = "Modification de votre période de stage - CEB"
        
        return {
            'subject': subject,
            'html': BenchmarkEmailTemplateService.build_benchmark_email(
                greeting, 
                content, 
                "Service des Stages"
            ),
            'text': f"""{subject}

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
Communauté Électrique du Bénin"""
        }
    
    @staticmethod
    def stagiaire_welcome(stagiaire) -> dict:
        """Email de bienvenue pour le premier jour de stage"""
        
        content = f"""
<div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; color: #333;">

    
    <!-- Message principal -->
    <div style="margin-bottom: 30px;">
        <p style="color: #6B7280; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
            Nous sommes ravis de vous accueillir au sein de la Communauté Électrique du Bénin.
        </p>
    </div>
    
    <!-- Informations du stage -->
    <div style="background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 0; padding: 20px; margin-bottom: 30px;">
        <h3 style="color: #1F2933; margin: 0 0 15px 0; font-size: 16px; font-weight: bold;">
            Informations de votre stage
        </h3>
        
        <table style="width: 100%; font-size: 14px;">
            <tr>
                <td style="padding: 10px 0; width: 140px; color: #666; font-weight: 600;">Stagiaire :</td>
                <td style="padding: 10px 0; color: #333;">{stagiaire.prenom} {stagiaire.nom}</td>
            </tr>
            <tr>
                <td style="padding: 10px 0; color: #666; font-weight: 600;">Service :</td>
                <td style="padding: 10px 0; color: #333;">{stagiaire.service}</td>
            </tr>
            <tr>
                <td style="padding: 10px 0; color: #666; font-weight: 600;">Direction :</td>
                <td style="padding: 10px 0; color: #333;">{stagiaire.direction}</td>
            </tr>
            <tr>
                <td style="padding: 10px 0; color: #666; font-weight: 600;">Période :</td>
                <td style="padding: 10px 0; color: #333;">Du {stagiaire.date_debut.strftime('%d/%m/%Y')} au {stagiaire.date_fin.strftime('%d/%m/%Y')}</td>
            </tr>
            <tr>
                <td style="padding: 10px 0; color: #666; font-weight: 600;">Durée :</td>
                <td style="padding: 10px 0; color: #333;">{stagiaire.duree_jours} jours</td>
            </tr>
        </table>
    </div>
    
    <!-- Informations pratiques -->
    <div style="background-color: #F7F8FA; border-radius: 0; padding: 18px; margin-bottom: 25px;">
        <h4 style="color: #1F2933; margin: 0 0 10px 0; font-size: 15px; font-weight: bold;">
            Informations pratiques
        </h4>
        
        <ul style="color: #666; font-size: 14px; line-height: 1.6; padding-left: 20px; margin: 0;">
            <li style="margin-bottom: 8px;">Présentez-vous à l'accueil avec convention de stage</li>
            <li style="margin-bottom: 8px;">Horaires : 7h00 - 16h00</li>
            <li>Pause déjeuner : 12h00 - 13h00</li>
        </ul>
    </div>
    
    <!-- Message de bienvenue -->
    <div style="text-align: center; background-color: #F7F8FA; padding: 20px; border-radius: 0; margin-top: 20px;">
        <p style="color: #1F2933; font-size: 15px; margin: 0; font-weight: bold;">
            Nous vous souhaitons un excellent stage
        </p>
    </div>
</div>
        """
        
        greeting = get_gender_based_greeting(stagiaire.nom, stagiaire.genre)
        subject = "Bienvenue pour votre premier jour de stage - CEB"
        
        return {
            'subject': subject,
            'html': BenchmarkEmailTemplateService.build_benchmark_email(
                greeting, 
                content, 
                "Service des Stages"
            ),
            'text': f"""{subject}

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
Email: stages@cebnet.org
Téléphone: +229 21 30 05 06"""
        }


class PreferenceEmailTemplates:
    """Templates pour les emails liés aux préférences"""
    
    @staticmethod
    def newsletter_welcome(user) -> dict:
        """Email de bienvenue pour l'abonnement aux nouveautés"""
        
        user_name = get_user_display_name(user)
        
        content = f"""
<div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; color: #333;">
   
    
    <!-- Message principal -->
    <div style="margin-bottom: 30px;">
        <p style="color: #6B7280; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
            Vous êtes maintenant abonné(e) aux emails des nouveautés de la plateforme Stages CEB.
        </p>
    </div>
    
    <!-- Contenu des newsletters -->
    <div style="background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 0; padding: 20px; margin-bottom: 30px;">
        <h3 style="color: #1F2933; margin: 0 0 15px 0; font-size: 16px; font-weight: bold;">
            Ce que vous recevrez
        </h3>
        
        <ul style="color: #666; font-size: 14px; line-height: 1.6; padding-left: 20px; margin: 0;">
            <li style="margin-bottom: 10px;">Nouvelles fonctionnalités de la plateforme</li>
            <li style="margin-bottom: 10px;">Mises à jour importantes</li>
            <li style="margin-bottom: 10px;">Conseils d'utilisation</li>
            <li>Annonces importantes de la CEB</li>
        </ul>
    </div>
    
    <!-- Gestion des préférences -->
    <div style="text-align: center; background-color: #F7F8FA; padding: 20px; border-radius: 0; margin-top: 20px;">
        <p style="color: #1F2933; font-size: 15px; margin: 0; font-weight: bold;">
            Gestion de vos préférences
        </p>
        <p style="color: #666; font-size: 14px; margin: 10px 0 0 0; line-height: 1.5;">
            Vous pouvez modifier vos préférences dans la section "Paramètres" de votre profil.
        </p>
    </div>
</div>
        """
        
        greeting = f"Madame, Monsieur {user.last_name}" if hasattr(user, 'last_name') and user.last_name else "Madame, Monsieur,"
        subject = "Bienvenue dans les nouveautés CEB"
        
        return {
            'subject': subject,
            'html': BenchmarkEmailTemplateService.build_benchmark_email(
                greeting, 
                content, 
                "Service Communication"
            ),
            'text': f"""{subject}

{greeting}

Vous êtes maintenant abonné(e) aux emails des nouveautés de la plateforme Stages CEB.

CE QUE VOUS RECEVREZ :
• Nouvelles fonctionnalités de la plateforme
• Mises à jour importantes
• Conseils d'utilisation
• Annonces importantes de la CEB

GESTION DE VOS PRÉFÉRENCES :
Vous pouvez modifier vos préférences dans la section "Paramètres" de votre profil.

---
Service Communication
Communauté Électrique du Bénin"""
        }


class DemandeEmailTemplates:
    """Templates pour les emails liés aux demandes de stage"""
    
    @staticmethod
    def new_demande_admin_notification(demande) -> dict:
        """Email de notification aux admins pour une nouvelle demande"""
        
        content = f"""
<div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; color: #333;">
    
    
    <!-- Message principal -->
    <div style="margin-bottom: 30px;">
        <p style="color: #6B7280; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
            Une nouvelle candidature a été soumise et nécessite votre attention.
        </p>
    </div>
    
    <!-- Informations du candidat -->
    <div style="background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 0; padding: 20px; margin-bottom: 30px;">
        <h3 style="color: #1F2933; margin: 0 0 15px 0; font-size: 16px; font-weight: bold;">
            Informations du candidat
        </h3>
        
        <table style="width: 100%; font-size: 14px;">
            <tr>
                <td style="padding: 10px 0; width: 140px; color: #666; font-weight: 600;">Nom complet :</td>
                <td style="padding: 10px 0; color: #333;">{demande.etudiant_nom} {demande.etudiant_prenom}</td>
            </tr>
            <tr>
                <td style="padding: 10px 0; color: #666; font-weight: 600;">Email :</td>
                <td style="padding: 10px 0; color: #333;">{demande.etudiant_email}</td>
            </tr>
            <tr>
                <td style="padding: 10px 0; color: #666; font-weight: 600;">Téléphone :</td>
                <td style="padding: 10px 0; color: #333;">{demande.etudiant_telephone}</td>
            </tr>
            <tr>
                <td style="padding: 10px 0; color: #666; font-weight: 600;">Domaine d'étude :</td>
                <td style="padding: 10px 0; color: #333;">{demande.etudiant_specialite}</td>
            </tr>
            <tr>
                <td style="padding: 10px 0; color: #666; font-weight: 600;">Type de stage :</td>
                <td style="padding: 10px 0; color: #333;">{demande.type_stage or 'Non spécifié'}</td>
            </tr>
            {f'''
            <tr>
                <td style="padding: 10px 0; color: #666; font-weight: 600;">Établissement :</td>
                <td style="padding: 10px 0; color: #333;">{demande.etablissement.nom}</td>
            </tr>
            ''' if demande.etablissement else ''}
            <tr>
                <td style="padding: 10px 0; color: #666; font-weight: 600;">Genre :</td>
                <td style="padding: 10px 0; color: #333;">{demande.genre}</td>
            </tr>
        </table>
    </div>
    
    <!-- Numéro de suivi -->
    <div style="text-align: center; background-color: #F7F8FA; padding: 25px; border-radius: 0; margin: 30px 0;">
        <p style="color: #1F2933; font-size: 16px; margin: 0 0 10px 0; font-weight: bold;">
            Numéro de suivi
        </p>
        <p style="color: #333; font-size: 20px; margin: 0; font-family: monospace; font-weight: bold;">
            {demande.tracking_id}
        </p>
        <p style="color: #666; font-size: 13px; margin: 10px 0 0 0;">
            Soumis le {demande.date_soumission.strftime('%d/%m/%Y à %H:%M')}
        </p>
    </div>
    
    <!-- Note -->
    <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e0e0e0; margin-top: 30px;">
        <p style="color: #999; font-size: 13px; margin: 0; line-height: 1.5;">
            Cette demande est en attente de traitement.
        </p>
    </div>
</div>
        """
        
        greeting = "Madame, Monsieur,"
        subject = f"Nouvelle demande de stage - {demande.etudiant_nom} {demande.etudiant_prenom}"
        
        return {
            'subject': subject,
            'html': BenchmarkEmailTemplateService.build_benchmark_email(
                greeting, 
                content, 
                "Service de Gestion des Candidatures"
            ),
            'text': f"""{subject}

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
Communauté Électrique du Bénin"""
        }
    
    @staticmethod
    def confirmation_reception_candidat(demande) -> dict:
        """Email de confirmation de réception au candidat"""
        
        greeting = get_gender_based_greeting(demande.etudiant_nom, demande.genre)
        
        content = f"""
<div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; color: #333;">
 
    
    <!-- Message principal -->
    <div style="margin-bottom: 30px;">
        <p style="color: #6B7280; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
            Nous vous confirmons la prise en compte de votre candidature 
            auprès de la Communauté Électrique du Bénin.
        </p>
    </div>
    
    <!-- Numéro de suivi -->
    <div style="text-align: center; background-color: #F7F8FA; padding: 25px; border-radius: 0; margin: 30px 0;">
        <p style="color: #1F2933; font-size: 16px; margin: 0 0 10px 0; font-weight: bold;">
            Votre référence de dossier
        </p>
        <p style="color: #333; font-size: 20px; margin: 0; font-family: monospace; font-weight: bold;">
            {demande.tracking_id}
        </p>
    </div>
    
    <!-- Instruction administrative -->
    <div style="background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 0; padding: 20px; margin-bottom: 30px;">
        <h3 style="color: #1F2933; margin: 0 0 15px 0; font-size: 16px; font-weight: bold;">
            Instruction administrative
        </h3>
        
        <p style="color: #666; font-size: 14px; line-height: 1.6;">
            Votre dossier sera examiné conformément à notre procédure de sélection. 
            Vous serez informé(e) de l'avancement du traitement dans les délais réglementaires.
        </p>
    </div>
    
    <!-- Message de remerciement -->
    <div style="text-align: center; background-color: #F7F8FA; padding: 20px; border-radius: 0; margin-top: 20px;">
        <p style="color: #1F2933; font-size: 15px; margin: 0; font-weight: bold;">
            Nous vous remercions de l'intérêt manifesté pour la Communauté Électrique du Bénin
        </p>
    </div>
</div>
        """
        
        subject = f"Accusé de réception - Candidature n°{demande.tracking_id}"
        
        return {
            'subject': subject,
            'html': BenchmarkEmailTemplateService.build_benchmark_email(
                greeting, 
                content, 
                "Direction des Ressources Humaines - CEB"
            ),
            'text': f"""{subject}

{greeting},

Nous vous confirmons la prise en compte de votre candidature auprès de la Communauté Électrique du Bénin.

RÉFÉRENCE DE DOSSIER : {demande.tracking_id}

Votre dossier sera examiné conformément à notre procédure de sélection. 
Vous serez informé(e) de l'avancement du traitement dans les délais réglementaires.

Nous vous remercions de l'intérêt manifesté pour la Communauté Électrique du Bénin.

---
Direction des Ressources Humaines
Communauté Électrique du Bénin
Email: drh@cebnet.org
Téléphone: +229 21 30 05 06"""
        }
    
    @staticmethod
    def rejection_notification(demande, raison_refus=None) -> dict:
        """Email de notification de refus au candidat"""
        
        greeting = get_gender_based_greeting(demande.etudiant_nom, demande.genre)
        raison = raison_refus or demande.raison_refus or "Le nombre de places disponibles est limité."
        
        content = f"""
<div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; color: #333;">
 
    
    <!-- Message principal -->
    <div style="margin-bottom: 30px;">
        <p style="color: #6B7280; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
            Nous vous remercions de l'intérêt que vous avez porté à la Communauté Électrique du Bénin.
        </p>
    </div>
    
    <!-- Décision -->
    <div style="margin-bottom: 30px;">
        <h3 style="color: #1F2933; margin: 0 0 15px 0; font-size: 16px; font-weight: bold;">
            Décision
        </h3>
        
        <p style="color: #6B7280; font-size: 14px; margin-bottom: 15px; line-height: 1.6;">
            Après un examen attentif de votre dossier, nous regrettons de vous informer que votre candidature n'a pas été retenue pour cette session.
        </p>
        
        <div style="background-color: #F7F8FA; padding: 15px; border-radius: 0; margin: 15px 0;">
            <p style="color: #1F2933; font-size: 14px; margin: 0; line-height: 1.6;">
                <strong>Motif :</strong> {raison}
            </p>
        </div>
    </div>
    
    <!-- Informations de la candidature -->
    <div style="background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 0; padding: 20px; margin-bottom: 30px;">
        <h3 style="color: #1F2933; margin: 0 0 15px 0; font-size: 16px; font-weight: bold;">
            Informations de votre candidature
        </h3>
        
        <table style="width: 100%; font-size: 14px;">
            <tr>
                <td style="padding: 10px 0; width: 140px; color: #666; font-weight: 600;">Nom complet :</td>
                <td style="padding: 10px 0; color: #333;">{demande.etudiant_nom} {demande.etudiant_prenom}</td>
            </tr>
            <tr>
                <td style="padding: 10px 0; color: #666; font-weight: 600;">Numéro de suivi :</td>
                <td style="padding: 10px 0; color: #333; font-weight: bold;">{demande.tracking_id}</td>
            </tr>
            <tr>
                <td style="padding: 10px 0; color: #666; font-weight: 600;">Date de soumission :</td>
                <td style="padding: 10px 0; color: #333;">{demande.date_soumission.strftime('%d/%m/%Y à %H:%M')}</td>
            </tr>
            <tr>
                <td style="padding: 10px 0; color: #666; font-weight: 600;">Type de stage :</td>
                <td style="padding: 10px 0; color: #333;">{demande.type_stage}</td>
            </tr>
        </table>
    </div>
    
    <!-- Message de fin -->
    <div style="text-align: center; background-color: #F7F8FA; padding: 20px; border-radius: 0; margin-top: 20px;">
        <p style="color: #1F2933; font-size: 15px; margin: 0; font-weight: bold;">
            Nous vous remercions encore pour votre candidature et vous souhaitons plein succès dans vos recherches futures
        </p>
    </div>
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
            'text': f"""{subject}

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
Email: stages@cebnet.org
Téléphone: +229 21 30 05 06"""
        }


class AttestationEmailTemplates:
    """Templates d'emails pour les attestations"""
    
    @staticmethod
    def attestation_approuvee(stagiaire, demande_attestation) -> Dict[str, str]:
        """Email pour attestation approuvée"""
        from services.email_service import EmailTemplateService, EmailContentService
        
        greeting = get_gender_based_greeting(stagiaire.nom, stagiaire.genre)
        
        content = f"""
<div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; color: #333;">
 
    
    <!-- Message principal -->
    <div style="margin-bottom: 30px;">
        <p style="color: #6B7280; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
            Nous avons le plaisir de vous informer que votre demande d'attestation de stage 
            a été approuvée par nos services.
        </p>
    </div>
    
    <!-- Détails du stage -->
    <div style="background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 0; padding: 20px; margin-bottom: 30px;">
        <h3 style="color: #1F2933; margin: 0 0 15px 0; font-size: 16px; font-weight: bold;">
            Détails de votre stage
        </h3>
        
        <table style="width: 100%; font-size: 14px;">
            <tr>
                <td style="padding: 10px 0; width: 140px; color: #666; font-weight: 600;">Stagiaire :</td>
                <td style="padding: 10px 0; color: #333;">{stagiaire.nom} {stagiaire.prenom}</td>
            </tr>
            <tr>
                <td style="padding: 10px 0; color: #666; font-weight: 600;">Date de début :</td>
                <td style="padding: 10px 0; color: #333;">{stagiaire.date_debut.strftime('%d/%m/%Y')}</td>
            </tr>
            <tr>
                <td style="padding: 10px 0; color: #666; font-weight: 600;">Date de fin :</td>
                <td style="padding: 10px 0; color: #333;">{stagiaire.date_fin.strftime('%d/%m/%Y')}</td>
            </tr>
            <tr>
                <td style="padding: 10px 0; color: #666; font-weight: 600;">Direction/Service :</td>
                <td style="padding: 10px 0; color: #333;">{stagiaire.direction} / {stagiaire.service}</td>
            </tr>
            <tr>
                <td style="padding: 10px 0; color: #666; font-weight: 600;">Date d'approbation :</td>
                <td style="padding: 10px 0; color: #333;">{demande_attestation.date_traitement.strftime('%d/%m/%Y') if demande_attestation.date_traitement else "Aujourd'hui"}</td>
            </tr>
        </table>
    </div>
    
    <!-- Prochaines étapes -->
    <div style="background-color: #F7F8FA; border: 1px solid #ECECEE; border-radius: 0; padding: 20px; margin-bottom: 25px;">
        <h3 style="color: #1F2933; margin: 0 0 15px 0; font-size: 16px; font-weight: bold;">
            Prochaines étapes
        </h3>
        
        <p style="color: #666; font-size: 14px; margin: 0; line-height: 1.6;">
            Votre attestation est en cours de préparation par le service des stages. 
            Vous recevrez une nouvelle notification dès qu'elle sera disponible pour retrait.
        </p>
    </div>
    
    <!-- Délai de traitement -->
    <div style="margin-bottom: 25px;">
        <h4 style="color: #1F2933; margin: 0 0 10px 0; font-size: 15px; font-weight: bold;">
            Délai de traitement
        </h4>
        
        <ul style="color: #666; font-size: 14px; line-height: 1.6; padding-left: 20px; margin: 0;">
            <li style="margin-bottom: 8px;">La préparation de votre attestation prendra quelques jours ouvrables</li>
            <li style="margin-bottom: 8px;">Vous serez informé(e) par email dès qu'elle sera prête</li>
            <li>Aucune action n'est requise de votre part pour le moment</li>
        </ul>
    </div>
    
    <!-- Message de fin -->
    <div style="text-align: center; background-color: #F7F8FA; padding: 20px; border-radius: 0; margin-top: 20px;">
        <p style="color: #1F2933; font-size: 15px; margin: 0; font-weight: bold;">
            Nous vous remercions pour votre contribution à la CEB
        </p>
    </div>
</div>
        """
        
        subject = f"Attestation de stage approuvée - {stagiaire.nom} {stagiaire.prenom}"
        
        return {
            'subject': subject,
            'html': EmailTemplateService.build_email(greeting, content, "Service des Attestations"),
            'text': EmailContentService._generate_text_version(subject, greeting, content)
        }
    
    @staticmethod
    def attestation_refusee(stagiaire, demande_attestation) -> Dict[str, str]:
        """Email pour attestation refusée"""
        from services.email_service import EmailTemplateService, EmailContentService
        
        greeting = get_gender_based_greeting(stagiaire.nom, stagiaire.genre)
        
        content = f"""
<div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; color: #333;">

    
    <!-- Message principal -->
    <div style="margin-bottom: 30px;">
        <p style="color: #6B7280; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
            Nous avons examiné votre demande d'attestation de stage et regrettons de vous informer 
            qu'elle n'a pas été approuvée.
        </p>
    </div>
    
    <!-- Motif du refus -->
    <div style="background-color: #F7F8FA; border: 1px solid #ECECEE; border-radius: 0; padding: 20px; margin-bottom: 30px;">
        <h3 style="color: #1F2933; margin: 0 0 15px 0; font-size: 16px; font-weight: bold;">
            Motif du refus
        </h3>
        
        <p style="color: #1F2933; font-size: 14px; margin: 0; line-height: 1.6;">
            {demande_attestation.motif_refus or "Raison non spécifiée"}
        </p>
    </div>
    
    <!-- Détails de la demande -->
    <div style="background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 0; padding: 20px; margin-bottom: 30px;">
        <h3 style="color: #1F2933; margin: 0 0 15px 0; font-size: 16px; font-weight: bold;">
            Détails de la demande
        </h3>
        
        <table style="width: 100%; font-size: 14px;">
            <tr>
                <td style="padding: 10px 0; width: 140px; color: #666; font-weight: 600;">Stagiaire :</td>
                <td style="padding: 10px 0; color: #333;">{stagiaire.nom} {stagiaire.prenom}</td>
            </tr>
            <tr>
                <td style="padding: 10px 0; color: #666; font-weight: 600;">Date de demande :</td>
                <td style="padding: 10px 0; color: #333;">{demande_attestation.date_demande.strftime('%d/%m/%Y')}</td>
            </tr>
            <tr>
                <td style="padding: 10px 0; color: #666; font-weight: 600;">Date de traitement :</td>
                <td style="padding: 10px 0; color: #333;">{demande_attestation.date_traitement.strftime('%d/%m/%Y') if demande_attestation.date_traitement else "Aujourd'hui"}</td>
            </tr>
            <tr>
                <td style="padding: 10px 0; color: #666; font-weight: 600;">Statut :</td>
                <td style="padding: 10px 0; color: #1F2933; font-weight: bold;">Refusée</td>
            </tr>
        </table>
    </div>
    
    <!-- Prochaines étapes -->
    <div style="background-color: #F7F8FA; border: 1px solid #ECECEE; border-radius: 0; padding: 20px; margin-bottom: 25px;">
        <h3 style="color: #1F2933; margin: 0 0 15px 0; font-size: 16px; font-weight: bold;">
            Prochaines étapes
        </h3>
        
        <p style="color: #666; font-size: 14px; margin: 0; line-height: 1.6;">
            Vous pouvez soumettre une nouvelle demande d'attestation après avoir pris en compte 
            les remarques mentionnées ci-dessus.
        </p>
    </div>
    
    <!-- Note -->
    <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e0e0e0; margin-top: 30px;">
        <p style="color: #999; font-size: 13px; margin: 0; line-height: 1.5;">
            Nous restons à votre disposition pour toute information complémentaire.
        </p>
    </div>
</div>
        """
        
        subject = f"Décision concernant votre attestation de stage - {stagiaire.nom} {stagiaire.prenom}"
        
        return {
            'subject': subject,
            'html': EmailTemplateService.build_email(greeting, content, "Service des Attestations"),
            'text': EmailContentService._generate_text_version(subject, greeting, content)
        }

    @staticmethod
    def attestation_disponible(stagiaire, demande_attestation, lien_telechargement=None) -> Dict[str, str]:
        """Email pour attestation disponible au retrait ou téléchargement"""
        from services.email_service import EmailTemplateService, EmailContentService
        
        greeting = get_gender_based_greeting(stagiaire.nom, stagiaire.genre)
        
        # Section téléchargement si lien fourni
        section_telechargement = ""
        if lien_telechargement:
            section_telechargement = f"""
    <div style="text-align: center; margin: 30px 0; padding: 25px; background-color: #F7F8FA; border-radius: 0;">
        <p style="color: #1F2933; font-size: 16px; margin: 0 0 15px 0; font-weight: bold;">
            Télécharger votre attestation
        </p>
        <a href="{lien_telechargement}" 
        style="display: inline-block; background-color: #1F2933; color: white; padding: 12px 30px; 
                text-decoration: none; border-radius: 0; font-weight: bold; font-size: 15px;">
            Télécharger mon attestation
        </a>
    </div>
            """
        
        content = f"""
<div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; color: #333;">
    
    <!-- Message principal -->
    <div style="margin-bottom: 30px;">
        <p style="color: #6B7280; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
            Bonne nouvelle ! Votre attestation de stage a été générée et est désormais 
            disponible pour retrait.
        </p>
    </div>
    
    <!-- Informations de l'attestation -->
    <div style="background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 0; padding: 20px; margin-bottom: 30px;">
        <h3 style="color: #1F2933; margin: 0 0 15px 0; font-size: 16px; font-weight: bold;">
            Informations de votre attestation
        </h3>
        
        <table style="width: 100%; font-size: 14px;">
            <tr>
                <td style="padding: 10px 0; width: 140px; color: #666; font-weight: 600;">Stagiaire :</td>
                <td style="padding: 10px 0; color: #333;">{stagiaire.nom} {stagiaire.prenom}</td>
            </tr>
            <tr>
                <td style="padding: 10px 0; color: #666; font-weight: 600;">Période de stage :</td>
                <td style="padding: 10px 0; color: #333;">Du {stagiaire.date_debut.strftime('%d/%m/%Y')} au {stagiaire.date_fin.strftime('%d/%m/%Y')}</td>
            </tr>
            <tr>
                <td style="padding: 10px 0; color: #666; font-weight: 600;">Direction/Service :</td>
                <td style="padding: 10px 0; color: #333;">{stagiaire.direction} / {stagiaire.service}</td>
            </tr>
            <tr>
                <td style="padding: 10px 0; color: #666; font-weight: 600;">Date de génération :</td>
                <td style="padding: 10px 0; color: #333;">{demande_attestation.date_traitement.strftime('%d/%m/%Y') if demande_attestation.date_traitement else "Aujourd'hui"}</td>
            </tr>
        </table>
    </div>
    
    {section_telechargement}
    
    <!-- Modalités de retrait -->
    <div style="background-color: #F7F8FA; border: 1px solid #ECECEE; border-radius: 0; padding: 20px; margin-bottom: 25px;">
        <h3 style="color: #1F2933; margin: 0 0 15px 0; font-size: 16px; font-weight: bold;">
            Modalités de retrait
        </h3>
        
        <ul style="color: #666; font-size: 14px; line-height: 1.6; padding-left: 20px; margin: 0;">
            <li style="margin-bottom: 10px;">Présentez-vous au service des stages de la CEB</li>
            <li style="margin-bottom: 10px;">Munissez-vous d'une pièce d'identité valide</li>
            <li style="margin-bottom: 10px;">Horaires : Lundi à Vendredi, 7h00 - 16h00</li>
            <li>Contact : cbenintogo.stage@gmail.com / +229 21 30 05 06</li>
        </ul>
    </div>
    
    <!-- Message de fin -->
    <div style="text-align: center; background-color: #F7F8FA; padding: 20px; border-radius: 0; margin-top: 20px;">
        <p style="color: #1F2933; font-size: 15px; margin: 0; font-weight: bold;">
            Nous vous remercions pour votre contribution à la CEB et vous souhaitons plein succès
        </p>
    </div>
</div>
        """
        
        subject = f"Votre attestation de stage est disponible - {stagiaire.nom} {stagiaire.prenom}"
        
        return {
            'subject': subject,
            'html': EmailTemplateService.build_email(greeting, content, "Service des Attestations"),
            'text': EmailContentService._generate_text_version(subject, greeting, content)
        }
    
    @staticmethod
    def attestation_signee(stagiaire, demande_attestation, attestation_path: str = None) -> Dict[str, str]:
        """Email pour attestation signée envoyée"""
        from services.email_service import EmailTemplateService, EmailContentService
        
        greeting = get_gender_based_greeting(stagiaire.nom, stagiaire.genre)
        
        content = f"""
<div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; color: #333;">
    <!-- Message principal -->
    <div style="margin-bottom: 30px;">
        <p style="color: #6B7280; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
            Nous avons le plaisir de vous informer que votre attestation de stage a été signée 
            et est désormais disponible en téléchargement.
        </p>
        
        <p style="color: #6B7280; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
            Votre attestation signée est jointe à cet email au format PDF. 
            Conservez précieusement ce document qui pourra vous être demandé pour vos démarches administratives.
        </p>
    </div>

    <!-- Pièce jointe -->
    <div style="background-color: #F7F8FA; border-left: 4px solid #2B2F33; padding: 15px; margin: 20px 0; border-radius: 0;">
        <p style="color: #1F2933; font-size: 14px; margin: 0;">
            📎 <strong>Pièce jointe :</strong> Votre attestation de stage signée est jointe à cet email.
        </p>
    </div>

    <!-- Détails de l'attestation -->
    <div style="background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 0; padding: 20px; margin-bottom: 30px;">
        <h3 style="color: #1F2933; margin: 0 0 15px 0; font-size: 16px; font-weight: bold;">
            Détails de votre attestation
        </h3>
        
        <table style="width: 100%; font-size: 14px;">
            <tr>
                <td style="padding: 10px 0; width: 140px; color: #666; font-weight: 600;">Stagiaire :</td>
                <td style="padding: 10px 0; color: #333;">{stagiaire.nom} {stagiaire.prenom}</td>
            </tr>
            <tr>
                <td style="padding: 10px 0; color: #666; font-weight: 600;">Référence :</td>
                <td style="padding: 10px 0; color: #333;">ATT-{demande_attestation.id:06d}</td>
            </tr>
            <tr>
                <td style="padding: 10px 0; color: #666; font-weight: 600;">Date de signature :</td>
                <td style="padding: 10px 0; color: #333;">{timezone.now().strftime("%d/%m/%Y")}</td>
            </tr>
            <tr>
                <td style="padding: 10px 0; color: #666; font-weight: 600;">Période de stage :</td>
                <td style="padding: 10px 0; color: #333;">{stagiaire.date_debut.strftime('%d/%m/%Y') if stagiaire.date_debut else 'N/A'} au {stagiaire.date_fin.strftime('%d/%m/%Y') if stagiaire.date_fin else 'N/A'}</td>
            </tr>
            <tr>
                <td style="padding: 10px 0; color: #666; font-weight: 600;">Direction/Service :</td>
                <td style="padding: 10px 0; color: #333;">{stagiaire.direction or 'N/A'} / {stagiaire.service or 'N/A'}</td>
            </tr>
        </table>
    </div>

    <!-- Conseils importants -->
    <div style="background-color: #F7F8FA; border: 1px solid #ECECEE; border-radius: 0; padding: 20px; margin-bottom: 25px;">
        <h3 style="color: #1F2933; margin: 0 0 15px 0; font-size: 16px; font-weight: bold;">
            Conseils importants
        </h3>
        
        <ul style="color: #666; font-size: 14px; line-height: 1.6; padding-left: 20px; margin: 0;">
            <li style="margin-bottom: 8px;">Conservez précieusement ce document</li>
            <li style="margin-bottom: 8px;">Faites des copies pour vos dossiers personnels</li>
            <li style="margin-bottom: 8px;">L'attestation originale peut vous être demandée pour vos démarches</li>
            <li>Il est recommandé de ne pas partager ce document en ligne</li>
        </ul>
    </div>

    <!-- Message de remerciement -->
    <div style="text-align: center; background-color: #F7F8FA; padding: 20px; border-radius: 0; margin-top: 20px;">
        <p style="color: #1F2933; font-size: 15px; margin: 0; font-weight: bold;">
            Nous vous remercions pour votre stage au sein de notre organisation et vous souhaitons plein succès dans vos futures entreprises
        </p>
    </div>
</div>
        """
        
        subject = f"Votre attestation de stage signée - {stagiaire.nom} {stagiaire.prenom}"
        
        return {
            'subject': subject,
            'html': EmailTemplateService.build_email(greeting, content, "Service des Attestations"),
            'text': EmailContentService._generate_text_version(subject, greeting, content)
        }
    
    