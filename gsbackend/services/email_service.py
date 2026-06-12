import logging
import os
import threading
from email.mime.image import MIMEImage
from typing import Dict, List, Optional
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from datetime import datetime
from django.utils import timezone
from services.email_templates_extended import BenchmarkEmailTemplateService, SecurityEmailTemplates, PreferenceEmailTemplates

logger = logging.getLogger(__name__)

# Identité de marque centralisée (alignée sur le domaine d'envoi cebnet.org)
ORG_NAME = "Communauté Électrique du Bénin"
ORG_SHORT = "CEB"
APP_NAME = "Plateforme Stages & Emploi"
SITE_URL = "https://stageemploi.cebnet.org"
CONTACT_EMAIL = "stages@cebnet.org"
CONTACT_PHONE = "+229 21 30 05 06"

# Identifiant CID du logo embarqué dans les emails (référencé via src="cid:ceb_logo")
LOGO_CID = "ceb_logo"
LOGO_PATH = os.path.join(os.path.dirname(__file__), "assets", "ceb-logo.png")


def attach_inline_logo(email: EmailMultiAlternatives) -> None:
    """Embarque le logo CEB en image inline (CID) pour qu'il s'affiche sans
    dépendre d'un hébergeur externe ni du déblocage des images distantes."""
    try:
        with open(LOGO_PATH, "rb") as f:
            logo = MIMEImage(f.read(), _subtype="png")
        logo.add_header("Content-ID", f"<{LOGO_CID}>")
        logo.add_header("Content-Disposition", "inline", filename="ceb-logo.png")
        # Le conteneur racine devient multipart/related pour lier le HTML au logo
        email.mixed_subtype = "related"
        email.attach(logo)
    except FileNotFoundError:
        logger.warning(f"⚠️ Logo email introuvable : {LOGO_PATH}")
    except Exception as e:
        logger.warning(f"⚠️ Impossible d'embarquer le logo email : {e}")


class EmailTemplateService:
    """Service de templates d'emails avec header/footer cohérents"""
    
    @staticmethod
    def get_base_styles() -> str:
        """Retourne les styles CSS de base pour tous les emails"""
        return """
        <style>
            body {
                background-color: #EBF5FE !important;
                margin: 0 !important;
                padding: 0 !important;
                width: 100% !important;
                min-width: 100% !important;
                font-family: Arial, Helvetica, sans-serif;
            }
            
            table {
                border-collapse: collapse;
                mso-table-lspace: 0pt;
                mso-table-rspace: 0pt;
            }
            
            img {
                border: 0;
                height: auto;
                line-height: 100%;
                outline: none;
                text-decoration: none;
                -ms-interpolation-mode: bicubic;
            }
            
            .container {
                width: 100%;
                max-width: 600px;
                margin: 0 auto;
            }
            
            .header-container {
                background-color: #FFFFFF;
                padding: 20px;
            }
            
            .content-container {
                background-color: #FFFFFF;
                padding: 20px 30px;
                color: #383838;
                font-size: 14px;
                line-height: 1.6;
            }
            
            .greeting {
                color: #0D652D;
                font-size: 16px;
                font-weight: bold;
                margin-bottom: 20px;
            }
            
            .content-box {
                margin: 25px 0;
                padding: 20px;
                background-color: #F8F9FA;
                border-left: 4px solid #0D652D;
                border-radius: 4px;
            }
            
            .data-table {
                width: 100%;
                border-collapse: collapse;
                margin: 20px 0;
            }
            
            .data-table td, .data-table th {
                padding: 12px 8px;
                border-bottom: 1px solid #E8EAED;
                text-align: left;
            }
            
            .data-table th {
                background-color: #F8F9FA;
                font-weight: 600;
                color: #3C4043;
            }
            
            .tracking-box {
                background: #F8F9FA;
                border: 1px solid #E8EAED;
                border-radius: 6px;
                padding: 20px;
                text-align: center;
                margin: 25px 0;
            }
            
            .tracking-label {
                font-size: 12px;
                color: #666666;
                text-transform: uppercase;
                letter-spacing: 1px;
                margin-bottom: 8px;
            }
            
            .tracking-id {
                font-size: 18px;
                font-weight: 600;
                color: #0D652D;
                font-family: 'Courier New', monospace;
            }
            
            .footer-container {
                background-color: #E3E3E3;
                padding: 30px 20px;
                color: #666666;
                font-size: 11px;
                line-height: 1.4;
            }
            
            .footer-links {
                text-align: center;
                margin: 20px 0;
            }
            
            .footer-links a {
                color: #000000;
                text-decoration: underline;
                margin: 0 10px;
            }
            
            .footer-info {
                text-align: center;
                margin-top: 20px;
                color: #666666;
                font-size: 11px;
            }
            
            @media only screen and (max-width: 480px) {
                .container {
                    width: 95% !important;
                }
                
                .content-container {
                    padding: 15px 20px !important;
                }
            }
        </style>
        """
    
    @classmethod
    def build_email(
        cls,
        greeting: str,
        content_html: str,
        subtitle: str = "Service de Gestion des Stages"
    ) -> str:
        """
        Construit un email complet avec le style Benchmark
        
        Args:
            greeting: Formule de salutation
            content_html: Contenu HTML de l'email
            subtitle: Sous-titre du header
        
        Returns:
            HTML complet de l'email
        """
        
        current_year = datetime.now().year

        email_html = f"""
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>{APP_NAME}</title>
    {cls.get_base_styles()}
</head>
<body topmargin="0" leftmargin="0" style="background-color: #EBF5FE; margin: 0; padding: 0; width: 100% !important; min-width: 100%;">

<table border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#EBF5FE">
    <tr>
        <td align="center" valign="top" style="padding: 24px 12px;">
            <table class="container" border="0" cellpadding="0" cellspacing="0" width="600" style="background-color:#FFFFFF; border-radius:10px; overflow:hidden; box-shadow:0 1px 4px rgba(0,0,0,0.06);">

                <!-- Bandeau supérieur -->
                <tr>
                    <td style="height:5px; background-color:#0D652D; line-height:5px; font-size:5px;">&nbsp;</td>
                </tr>

                <!-- En-tête : logo + identité -->
                <tr>
                    <td class="header-container" align="center" style="padding: 28px 24px 22px 24px; border-bottom:1px solid #EEF1F4;">
                        <table border="0" cellpadding="0" cellspacing="0" align="center">
                            <tr>
                                <td align="center" valign="middle" style="padding-right: 14px;">
                                    <img src="cid:{LOGO_CID}"
                                        alt="{ORG_SHORT}"
                                        width="54" height="57"
                                        style="display:block; width:54px; height:auto; border:0;">
                                </td>
                                <td align="left" valign="middle" style="border-left:1px solid #E2E8F0; padding-left: 14px;">
                                    <div style="font-family: Arial, Helvetica, sans-serif; font-size:18px; font-weight:bold; color:#0D652D; line-height:1.2;">
                                        {ORG_SHORT}
                                    </div>
                                    <div style="font-family: Arial, Helvetica, sans-serif; font-size:13px; color:#4A5568; padding-top:3px;">
                                        {subtitle}
                                    </div>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>

                <!-- Contenu -->
                <tr>
                    <td class="content-container" style="padding: 28px 32px;">
                        <div class="greeting">
                            {greeting}
                        </div>
                        {content_html}
                    </td>
                </tr>

                <!-- Pied de page -->
                <tr>
                    <td style="background-color:#F4F6F8; padding: 24px 32px; border-top:1px solid #EEF1F4;">
                        <div style="font-family: Arial, Helvetica, sans-serif; font-size:13px; font-weight:bold; color:#2D3748; margin-bottom:6px;">
                            {ORG_NAME}
                        </div>
                        <div style="font-family: Arial, Helvetica, sans-serif; font-size:12px; color:#718096; line-height:1.6;">
                            {APP_NAME}<br>
                            <a href="mailto:{CONTACT_EMAIL}" style="color:#0D652D; text-decoration:none;">{CONTACT_EMAIL}</a>
                            &nbsp;&bull;&nbsp; {CONTACT_PHONE}<br>
                            <a href="{SITE_URL}" style="color:#0D652D; text-decoration:none;">{SITE_URL}</a>
                        </div>
                        <div style="font-family: Arial, Helvetica, sans-serif; font-size:11px; color:#A0AEC0; margin-top:16px; line-height:1.5;">
                            Cet email vous est adressé dans le cadre de votre dossier auprès de la {ORG_SHORT}.
                            Merci de ne pas répondre directement à ce message automatique.<br>
                            &copy; {current_year} {ORG_NAME}. Tous droits réservés.
                        </div>
                    </td>
                </tr>

            </table>
        </td>
    </tr>
</table>

</body>
</html>
        """

        return email_html

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

class EmailContentService:
    """Service pour générer le contenu spécifique de chaque type d'email"""

    @staticmethod
    def demande_attestation_confirmee(stagiaire, demande_attestation) -> Dict[str, str]:
        """Génère le contenu pour un email de confirmation de demande d'attestation"""
        from services.email_templates_extended import get_gender_based_greeting
        
        # Utilisation du genre du stagiaire pour la salutation
        greeting = get_gender_based_greeting(stagiaire.prenom, stagiaire.genre)
        
        content = f"""
<div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; color: #333;">
    <!-- Message principal -->
    <div style="margin-bottom: 30px;">
        <p style="color: #383838; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
            Nous accusons réception de votre demande d'attestation de stage. 
            Cette dernière a été enregistrée dans notre système de traitement.
        </p>

        <p style="color: #383838; font-size: 14px; line-height: 1.6;">
            Votre demande sera instruite selon la procédure en vigueur. 
            Vous serez informé(e) de l'avancement du traitement dans les délais établis.
        </p>
    </div>
    
    <!-- Message de remerciement -->
    <div style="text-align: center; background-color: #f0f7f0; padding: 20px; border-radius: 6px; margin-top: 20px;">
        <p style="color: #0D652D; font-size: 15px; margin: 0; font-weight: bold;">
            Nous vous remercions de votre collaboration avec la Communauté Électrique du Bénin
        </p>
    </div>
</div>
        """
        
        subject = f"Accusé de réception - Demande d'attestation"
        
        return {
            'subject': subject,
            'html': EmailTemplateService.build_email(greeting, content, "Service des Stages"),
            'text': EmailContentService._generate_text_version(subject, greeting, content)
        }
    
    @staticmethod
    def nouvelle_demande_attestation_admin(stagiaire, demande_attestation) -> Dict[str, str]:
        """Génère le contenu pour notifier les admins d'une nouvelle demande d'attestation"""
        
        content = f"""
<div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; color: #333;">
    <!-- Message principal -->
    <div style="margin-bottom: 30px;">
        <p style="color: #383838; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
            Une nouvelle demande d'attestation de stage nécessite votre attention.
            Les éléments de la demande ont été systématisés dans notre application de gestion.
        </p>
    </div>
    
    <!-- Avertissement -->
    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 25px 0; border-radius: 4px;">
        <p style="color: #92400e; font-size: 14px; margin: 0;">
            ⚠️ <strong>Instruction requise :</strong> Veuillez procéder à l'examen de ce dossier.
        </p>
    </div>
    
    <!-- Référence -->
    <div style="text-align: center; background-color: #f0f7f0; padding: 25px; border-radius: 6px; margin: 30px 0;">
        <p style="color: #0D652D; font-size: 16px; margin: 0 0 10px 0; font-weight: bold;">
            Référence administrative
        </p>
        <p style="color: #333; font-size: 20px; margin: 0; font-family: monospace; font-weight: bold;">
            {getattr(demande_attestation, 'reference', None) or demande_attestation.id}
        </p>
    </div>
    
    <!-- Note -->
    <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e0e0e0; margin-top: 30px;">
        <p style="color: #999; font-size: 13px; margin: 0; line-height: 1.5;">
            Veuillez vous connecter à la plateforme administrative pour accéder au dossier complet.
        </p>
    </div>
</div>
        """
        
        subject = f"Nouvelle demande d'attestation - Réf: {getattr(demande_attestation, 'reference', None) or demande_attestation.id}"
        greeting = "Mesdames, Messieurs les administrateurs,"
        
        return {
            'subject': subject,
            'html': EmailTemplateService.build_email(greeting, content, "Service de Gestion des Attestations"),
            'text': EmailContentService._generate_text_version(subject, greeting, content)
        }
    
    @staticmethod
    def attestation_signee(stagiaire, demande_attestation, attestation_path: str) -> Dict[str, str]:
        """Génère le contenu pour un email d'attestation signée envoyée"""
        greeting = get_gender_based_greeting(stagiaire.prenom, stagiaire.genre)
        
        content = f"""
<div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; color: #333;">
    <!-- Message principal -->
    <div style="margin-bottom: 30px;">
        <p style="color: #383838; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
            Nous avons le plaisir de vous informer que votre attestation de stage a été signée 
            et est désormais disponible en téléchargement.
        </p>
        
        <p style="color: #383838; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
            Votre attestation signée est jointe à cet email au format PDF. 
            Conservez précieusement ce document qui pourra vous être demandé pour vos démarches administratives.
        </p>
    </div>

    <!-- Pièce jointe -->
    <div style="background-color: #e8f5e9; border-left: 4px solid #4caf50; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="color: #2e7d32; font-size: 14px; margin: 0;">
            📎 <strong>Pièce jointe :</strong> Votre attestation de stage signée est jointe à cet email.
        </p>
    </div>

    <!-- Conseils importants -->
    <div style="background-color: #fff3e0; border: 1px solid #ffe0b2; border-radius: 6px; padding: 20px; margin-bottom: 25px;">
        <h3 style="color: #f57c00; margin: 0 0 15px 0; font-size: 16px; font-weight: bold;">
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
    <div style="text-align: center; background-color: #f0f7f0; padding: 20px; border-radius: 6px; margin-top: 20px;">
        <p style="color: #0D652D; font-size: 15px; margin: 0; font-weight: bold;">
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

    @staticmethod
    def send_attestation_signee(stagiaire_email, context, attestation_path, async_send=True):
        """
        Envoie l'attestation signée au stagiaire
        
        Args:
            stagiaire_email: Email du stagiaire
            context: Contexte avec informations
            attestation_path: Chemin du fichier PDF
            async_send: Envoi asynchrone
            
        Note: Cette méthode est conservée pour compatibilité, mais utilisez plutôt 
              EmailSenderService.send_attestation_signee() qui appelle attestation_signee()
        """
        try:
            # Préparer le sujet et le contenu
            subject = f"Votre attestation de stage signée est disponible"
            
            # Contenu texte simple
            text_content = f"""
Bonjour {context['stagiaire_prenom']} {context['stagiaire_nom']},

Votre attestation de stage signée est disponible.

Détails :
- Référence : ATT-{context['demande_id']:06d}
- Date de signature : {context['date_upload']}
- Période de stage : {context['date_debut']} au {context['date_fin']}
- Direction/Service : {context['direction']} / {context['service']}

Votre attestation signée est jointe à cet email.

Important :
- Conservez précieusement ce document
- Il peut vous être demandé pour vos démarches administratives
- Faites-en des copies

Cordialement,
Le Service des Stages
"""
            
            # Créer l'email
            email = EmailMultiAlternatives(
                subject=subject,
                body=text_content,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[stagiaire_email],
                cc=[settings.EMAIL_ADMIN] if hasattr(settings, 'EMAIL_ADMIN') else None,
            )
            
            # Ajouter la version HTML (simplifiée pour compatibilité)
            email.attach_alternative(f"""
<!DOCTYPE html>
<html>
<body>
<p>Bonjour {context['stagiaire_prenom']} {context['stagiaire_nom']},</p>
<p>Votre attestation de stage signée est jointe à cet email.</p>
</body>
</html>
            """, "text/html")
            
            # Joindre l'attestation signée
            with open(attestation_path, 'rb') as f:
                email.attach(
                    f'attestation_stage_{context["stagiaire_nom"]}_{context["stagiaire_prenom"]}.pdf',
                    f.read(),
                    'application/pdf'
                )
            
            # Envoyer l'email
            if async_send:
                email.send(fail_silently=False)
            else:
                email.send()
            
            logger.info(f"✅ Email attestation signée envoyé à {stagiaire_email}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Erreur envoi email attestation signée: {e}", exc_info=True)
            return False

    @staticmethod
    def confirmation_demande(demande) -> dict:
        """Email de confirmation de réception au candidat"""
        
        # Utilisation du genre du candidat pour la salutation
        greeting = get_gender_based_greeting(demande.etudiant_prenom, demande.genre)
        
        content = f"""
<div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; color: #333;">
    <!-- Message principal -->
    <div style="margin-bottom: 30px;">
        <p style="color: #383838; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
            Nous vous confirmons la prise en compte de votre candidature 
            auprès de la Communauté Électrique du Bénin.
        </p>
    </div>
    
    <!-- Référence -->
    <div style="text-align: center; background-color: #f0f7f0; padding: 25px; border-radius: 6px; margin: 30px 0;">
        <p style="color: #0D652D; font-size: 16px; margin: 0 0 10px 0; font-weight: bold;">
            Votre référence de dossier
        </p>
        <p style="color: #333; font-size: 20px; margin: 0; font-family: monospace; font-weight: bold;">
            {demande.tracking_id}
        </p>
    </div>
    
    <!-- Instruction administrative -->
    <div style="background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 6px; padding: 20px; margin-bottom: 30px;">
        <h3 style="color: #0D652D; margin: 0 0 15px 0; font-size: 16px; font-weight: bold;">
            Instruction administrative
        </h3>
        
        <p style="color: #666; font-size: 14px; line-height: 1.6;">
            Votre dossier sera examiné conformément à notre procédure de sélection. 
            Vous serez informé(e) de l'avancement du traitement dans les délais réglementaires.
        </p>
    </div>
    
    <!-- Message de remerciement -->
    <div style="text-align: center; background-color: #fff8f8; padding: 20px; border-radius: 6px; margin-top: 20px;">
        <p style="color: #0D652D; font-size: 15px; margin: 0; font-weight: bold;">
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
            'text': f"""
{subject}

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
Téléphone: +229 21 30 05 06
Site web: www.cebnet.org
"""
        }
    
    @staticmethod
    def demande_acceptee(stagiaire, demande, convention_pdf_path=None) -> Dict[str, str]:
        """Génère le contenu pour un email d'acceptation"""
        greeting = get_gender_based_greeting(demande.etudiant_prenom, demande.genre)
        
        # ✅ AJOUT : Mention de la convention en pièce jointe
        piece_jointe_mention = ""
        if convention_pdf_path:
            piece_jointe_mention = """
    <div style="background-color: #e8f5e9; border-left: 4px solid #4caf50; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="color: #2e7d32; font-size: 14px; margin: 0;">
            📎 <strong>Pièce jointe :</strong> Votre convention de stage signée est jointe à cet email.
        </p>
    </div>
            """
        
        content = f"""
<div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; color: #333;">
    <!-- Message principal -->
    <div style="margin-bottom: 30px;">
        <p style="color: #383838; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
            Nous avons le plaisir de vous informer que votre candidature pour un stage 
            au sein de la Communauté Électrique du Bénin a été retenue.
        </p>
    </div>

    {piece_jointe_mention}

    <!-- Référence -->
    <div style="text-align: center; background-color: #f0f7f0; padding: 25px; border-radius: 6px; margin: 30px 0;">
        <p style="color: #0D652D; font-size: 16px; margin: 0 0 10px 0; font-weight: bold;">
            Référence administrative
        </p>
        <p style="color: #333; font-size: 20px; margin: 0; font-family: monospace; font-weight: bold;">
            {demande.tracking_id}
        </p>
    </div>

    <!-- Information relative -->
    <div style="background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 6px; padding: 20px; margin-bottom: 30px;">
        <h3 style="color: #0D652D; margin: 0 0 15px 0; font-size: 16px; font-weight: bold;">
            Information relative au stage
        </h3>
        
        <p style="color: #666; font-size: 14px; line-height: 1.6;">
            Vous trouverez ci-joint votre convention de stage signée. 
            Veuillez la conserver précieusement pour vos démarches administratives.
        </p>
    </div>

    <!-- Message de bienvenue -->
    <div style="text-align: center; background-color: #fff8f8; padding: 20px; border-radius: 6px; margin-top: 20px;">
        <p style="color: #0D652D; font-size: 15px; margin: 0; font-weight: bold;">
            Nous nous réjouissons de vous accueillir au sein de notre institution
        </p>
    </div>
</div>
        """
        
        subject = f"Acceptation - Candidature n°{demande.tracking_id}"
        
        return {
            'subject': subject,
            'html': EmailTemplateService.build_email(greeting, content),
            'text': EmailContentService._generate_text_version(subject, greeting, content)
        }
    
    @staticmethod
    def mise_en_traitement(demande) -> Dict[str, str]:
        """Génère le contenu pour un email de mise en traitement"""
        
        content = f"""
<div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; color: #333;">
    <!-- Message principal -->
    <div style="margin-bottom: 30px;">
        <p style="color: #383838; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
            Nous vous informons que votre demande de stage a été prise en compte 
            et est désormais en cours d'examen par nos services compétents.
        </p>
    </div>

    <!-- Référence -->
    <div style="text-align: center; background-color: #f0f7f0; padding: 25px; border-radius: 6px; margin: 30px 0;">
        <p style="color: #0D652D; font-size: 16px; margin: 0 0 10px 0; font-weight: bold;">
            Référence administrative
        </p>
        <p style="color: #333; font-size: 20px; margin: 0; font-family: monospace; font-weight: bold;">
            {demande.tracking_id}
        </p>
    </div>

    <!-- Information sur le traitement -->
    <div style="background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 6px; padding: 20px; margin-bottom: 30px;">
        <h3 style="color: #0D652D; margin: 0 0 15px 0; font-size: 16px; font-weight: bold;">
            Information sur le traitement
        </h3>
        
        <p style="color: #666; font-size: 14px; line-height: 1.6;">
            Votre dossier suivra la procédure d'instruction établie. 
            Vous serez informé(e) des évolutions dans les délais impartis.
        </p>
    </div>

    <!-- Message patiente -->
    <div style="text-align: center; background-color: #fff8f8; padding: 20px; border-radius: 6px; margin-top: 20px;">
        <p style="color: #0D652D; font-size: 15px; margin: 0; font-weight: bold;">
            Merci de bien vouloir patienter pendant la durée du traitement administratif
        </p>
    </div>
</div>
        """
        
        subject = f"Mise en traitement - Demande n°{demande.tracking_id}"
        greeting = f"Cher(e) {demande.etudiant_prenom},"
        
        return {
            'subject': subject,
            'html': EmailTemplateService.build_email(greeting, content),
            'text': EmailContentService._generate_text_version(subject, greeting, content)
        }
    
    @staticmethod
    def demande_information(demande, message: str, suivi_url: str) -> Dict[str, str]:
        """Génère le contenu pour une demande d'information complémentaire"""
        
        content = f"""
<div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; color: #333;">
    <!-- Message principal -->
    <div style="margin-bottom: 30px;">
        <p style="color: #383838; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
            Dans le cadre de l'instruction de votre dossier, il nous est nécessaire 
            de solliciter des informations ou documents supplémentaires.
        </p>
    </div>

    <!-- Élément(s) sollicité(s) -->
    <div style="background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 6px; padding: 20px; margin-bottom: 30px;">
        <h3 style="color: #0D652D; margin: 0 0 15px 0; font-size: 16px; font-weight: bold;">
            Élément(s) sollicité(s)
        </h3>
        
        <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #E8EAED;">
            {message}
        </div>
    </div>

    <!-- Référence -->
    <div style="text-align: center; background-color: #f0f7f0; padding: 25px; border-radius: 6px; margin: 30px 0;">
        <p style="color: #0D652D; font-size: 16px; margin: 0 0 10px 0; font-weight: bold;">
            Référence de dossier
        </p>
        <p style="color: #333; font-size: 20px; margin: 0; font-family: monospace; font-weight: bold;">
            {demande.tracking_id}
        </p>
    </div>

    <!-- Délai de réponse -->
    <div style="background-color: #e3f2fd; border: 1px solid #bbdefb; border-radius: 6px; padding: 20px; margin-bottom: 25px;">
        <h3 style="color: #1565c0; margin: 0 0 15px 0; font-size: 16px; font-weight: bold;">
            Délai de réponse
        </h3>
        
        <p style="color: #666; font-size: 14px; margin: 0; line-height: 1.6;">
            Nous vous prions de bien vouloir nous transmettre ces éléments dans les meilleurs délais 
            afin de ne pas interrompre le traitement de votre dossier.
        </p>
    </div>

    <!-- Lien de suivi -->
    <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e0e0e0; margin-top: 30px;">
        <p style="color: #666; font-size: 14px; margin: 0; line-height: 1.6;">
            Vous pouvez accéder à votre espace de suivi à l'adresse suivante :<br>
            <a href="{suivi_url}" style="color: #0D652D; text-decoration: none;">
                {suivi_url}
            </a>
        </p>
    </div>
</div>
        """
        
        subject = f"Demande d'élément complémentaire - Réf: {demande.tracking_id}"
        greeting = f"Cher(e) {demande.etudiant_prenom},"
        
        return {
            'subject': subject,
            'html': EmailTemplateService.build_email(greeting, content),
            'text': EmailContentService._generate_text_version(subject, greeting, content)
        }
    
    @staticmethod
    def demande_refusee(demande) -> Dict[str, str]:
        """Génère le contenu pour un email de refus"""
        greeting = get_gender_based_greeting(demande.etudiant_prenom, demande.genre)
        
        content = f"""
<div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; color: #333;">
    <!-- Message principal -->
    <div style="margin-bottom: 30px;">
        <p style="color: #383838; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
            Nous vous remercions de l'intérêt que vous avez porté à la Communauté Électrique du Bénin.
        </p>
    </div>
    
    <!-- Décision -->
    <div style="margin-bottom: 30px;">
        <h3 style="color: #d32f2f; margin: 0 0 15px 0; font-size: 16px; font-weight: bold;">
            Décision
        </h3>
        
        <p style="color: #383838; font-size: 14px; margin-bottom: 15px; line-height: 1.6;">
            Après un examen attentif de votre dossier, nous regrettons de vous informer que votre candidature n'a pas été retenue pour cette session.
        </p>
        
        <div style="background-color: #ffebee; padding: 15px; border-radius: 6px; margin: 15px 0;">
            <p style="color: #c62828; font-size: 14px; margin: 0; line-height: 1.6;">
                <strong>Motif :</strong> {demande.raison_refus or "Le nombre de places disponibles est limité."}
            </p>
        </div>
    </div>
    
    <!-- Référence -->
    <div style="text-align: center; background-color: #f0f7f0; padding: 25px; border-radius: 6px; margin: 30px 0;">
        <p style="color: #0D652D; font-size: 16px; margin: 0 0 10px 0; font-weight: bold;">
            Référence administrative
        </p>
        <p style="color: #333; font-size: 20px; margin: 0; font-family: monospace; font-weight: bold;">
            {demande.tracking_id}
        </p>
    </div>
    
    <!-- Message de fin -->
    <div style="text-align: center; background-color: #fff8f8; padding: 20px; border-radius: 6px; margin-top: 20px;">
        <p style="color: #0D652D; font-size: 15px; margin: 0; font-weight: bold;">
            Nous vous remercions encore pour votre candidature et vous souhaitons plein succès dans vos recherches futures
        </p>
    </div>
</div>
        """
        
        subject = f"Réponse à votre candidature de stage - {demande.tracking_id}"
        
        return {
            'subject': subject,
            'html': EmailTemplateService.build_email(greeting, content),
            'text': EmailContentService._generate_text_version(subject, greeting, content)
        }
    
    
    
    @staticmethod
    def _generate_text_version(subject: str, greeting: str, html_content: str) -> str:
        """Génère une version texte simplifiée de l'email"""
        import re
        
        # Supprimer les balises HTML
        text = re.sub('<[^<]+?>', '', html_content)
        # Supprimer les espaces multiples
        text = re.sub(r'\s+', ' ', text)
        # Nettoyer
        text = text.strip()
        
        current_year = datetime.now().year
        
        return f"""
{subject}

{greeting}

{text}

---
Service des Stages - CEB
Email: stages@cebnet.org
Téléphone: +229 21 30 05 06

© {current_year} Communauté Électrique du Bénin
        """


class EmailSenderService:
    """Service d'envoi d'emails avec gestion asynchrone"""
    
    @staticmethod
    def send_email(
        to_email: str,
        subject: str,
        html_content: str,
        text_content: str,
        async_send: bool = True,
        reply_to: Optional[List[str]] = None,
        cc: Optional[List[str]] = None,
        attachments: Optional[List[Dict]] = None  # ✅ AJOUT
    ) -> bool:
        """
        Envoie un email avec gestion asynchrone optionnelle
        
        Args:
            attachments: Liste de dict avec 'filename', 'content', 'mimetype'
                        Ex: [{'filename': 'convention.pdf', 'content': file_content, 'mimetype': 'application/pdf'}]
        """
        
        if reply_to is None:
            reply_to = [CONTACT_EMAIL]

        def send_task():
            try:
                email = EmailMultiAlternatives(
                    subject=subject,
                    body=text_content,
                    from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'no-reply@cebnet.org'),
                    to=[to_email],
                    reply_to=reply_to,
                    cc=cc
                )

                email.attach_alternative(html_content, "text/html")

                # Logo embarqué en inline (CID) — affichage fiable, sans hébergeur externe
                attach_inline_logo(email)

                # ✅ AJOUT : Gestion des pièces jointes
                if attachments:
                    for attachment in attachments:
                        email.attach(
                            attachment['filename'],
                            attachment['content'],
                            attachment['mimetype']
                        )
                        logger.info(f"📎 Pièce jointe ajoutée : {attachment['filename']}")
                
                result = email.send(fail_silently=False)
                
                logger.info(f"✅ Email envoyé à {to_email} - Sujet: {subject[:50]}...")
                return True
                
            except Exception as e:
                logger.error(f"❌ Erreur envoi email à {to_email}: {e}")
                return False
        
        if async_send:
            thread = threading.Thread(target=send_task, name=f"email-{to_email[:20]}")
            thread.daemon = True
            thread.start()
            return True
        else:
            return send_task()
    
    @classmethod
    def send_demande_attestation_stagiaire(cls, stagiaire, demande_attestation, async_send: bool = True) -> bool:
        """
        Envoie l'email de confirmation de demande d'attestation au stagiaire
        
        Args:
            stagiaire: Instance du stagiaire
            demande_attestation: Instance de la demande d'attestation
            async_send: Envoi asynchrone ou non
            
        Returns:
            True si l'envoi a été initié avec succès
        """
        email_data = EmailContentService.demande_attestation_confirmee(stagiaire, demande_attestation)
        return cls.send_email(
            to_email=stagiaire.email,
            subject=email_data['subject'],
            html_content=email_data['html'],
            text_content=email_data['text'],
            async_send=async_send,
            reply_to=['stages@cebnet.org']
        )

    @classmethod
    def send_nouvelle_demande_attestation_admins(
        cls,
        stagiaire,
        demande_attestation,
        admin_emails: list,
        async_send: bool = True
    ) -> bool:
        """
        Envoie une notification aux administrateurs pour une nouvelle demande d'attestation
        
        Args:
            stagiaire: Instance du stagiaire
            demande_attestation: Instance de la demande d'attestation
            admin_emails: Liste des emails des administrateurs
            async_send: Envoi asynchrone ou non
            
        Returns:
            True si l'envoi a été initié avec succès
        """
        if not admin_emails:
            logger.warning("⚠️ Aucun email d'administrateur fourni pour notification attestation")
            return False
        
        email_data = EmailContentService.nouvelle_demande_attestation_admin(stagiaire, demande_attestation)
        
        # Envoi groupé à tous les admins
        return cls.send_email(
            to_email=admin_emails[0],  # Premier admin en destinataire principal
            subject=email_data['subject'],
            html_content=email_data['html'],
            text_content=email_data['text'],
            async_send=async_send,
            reply_to=[stagiaire.email],  # Répondre directement au stagiaire
            cc=admin_emails[1:] if len(admin_emails) > 1 else None  # Autres admins en copie
        )
    
    @classmethod
    def send_confirmation_demande(cls, demande, async_send: bool = True) -> bool:
        """Envoie l'email de confirmation de demande"""
        email_data = EmailContentService.confirmation_demande(demande)
        return cls.send_email(
            to_email=demande.etudiant_email,
            subject=email_data['subject'],
            html_content=email_data['html'],
            text_content=email_data['text'],
            async_send=async_send
        )
    
    @classmethod
    def send_acceptation(
        cls, 
        stagiaire, 
        demande, 
        async_send: bool = True,
        convention_pdf_path: Optional[str] = None,  # ✅ AJOUT
        convention_pdf_object = None  # ✅ AJOUT
    ) -> bool:
        """
        Envoie l'email d'acceptation avec la convention signée en pièce jointe
        
        Args:
            stagiaire: Instance du stagiaire
            demande: Instance de la demande
            async_send: Envoi asynchrone ou non
            convention_pdf_path: Chemin fichier système de la convention PDF
            convention_pdf_object: Objet FieldFile Django de la convention
        """
        email_data = EmailContentService.demande_acceptee(stagiaire, demande, convention_pdf_path)
        
        # ✅ AJOUT : Préparation de la pièce jointe
        attachments = []
        if convention_pdf_path or convention_pdf_object:
            try:
                # Récupérer le contenu du fichier
                if convention_pdf_object and hasattr(convention_pdf_object, 'read'):
                    convention_pdf_object.open('rb')
                    file_content = convention_pdf_object.read()
                    convention_pdf_object.close()
                    filename = convention_pdf_object.name.split('/')[-1]
                elif convention_pdf_path:
                    with open(convention_pdf_path, 'rb') as f:
                        file_content = f.read()
                    filename = convention_pdf_path.split('/')[-1]
                else:
                    file_content = None
                    
                if file_content:
                    attachments.append({
                        'filename': filename,
                        'content': file_content,
                        'mimetype': 'application/pdf'
                    })
                    logger.info(f"📎 Convention PDF préparée pour envoi : {filename}")
            except Exception as e:
                logger.error(f"❌ Erreur lecture convention PDF : {e}")
        
        return cls.send_email(
            to_email=stagiaire.email,
            subject=email_data['subject'],
            html_content=email_data['html'],
            text_content=email_data['text'],
            async_send=async_send,
            attachments=attachments  # ✅ AJOUT
        )
    
    @classmethod
    def send_refus(cls, demande, async_send: bool = True) -> bool:
        """Envoie l'email de refus"""
        email_data = EmailContentService.demande_refusee(demande)
        return cls.send_email(
            to_email=demande.etudiant_email,
            subject=email_data['subject'],
            html_content=email_data['html'],
            text_content=email_data['text'],
            async_send=async_send
        )
    
    @classmethod
    def send_mise_en_traitement(cls, demande, async_send: bool = True) -> bool:
        """Envoie l'email de mise en traitement"""
        email_data = EmailContentService.mise_en_traitement(demande)
        return cls.send_email(
            to_email=demande.etudiant_email,
            subject=email_data['subject'],
            html_content=email_data['html'],
            text_content=email_data['text'],
            async_send=async_send
        )
    
    @classmethod
    def send_demande_information(
        cls, 
        demande, 
        message: str,
        suivi_url: str,
        async_send: bool = True
    ) -> bool:
        """Envoie l'email de demande d'information"""
        email_data = EmailContentService.demande_information(demande, message, suivi_url)
        return cls.send_email(
            to_email=demande.etudiant_email,
            subject=email_data['subject'],
            html_content=email_data['html'],
            text_content=email_data['text'],
            async_send=async_send
        )
    
    @classmethod
    def send_reactivation(cls, demande, ancien_statut: str, async_send: bool = True) -> bool:
        """Envoie l'email de réactivation de demande"""
        email_data = EmailContentService.demande_reactivee(demande, ancien_statut)
        return cls.send_email(
            to_email=demande.etudiant_email,
            subject=email_data['subject'],
            html_content=email_data['html'],
            text_content=email_data['text'],
            async_send=async_send
        )
    
    @classmethod
    def send_password_reset_request(cls, user, reset_link: str, async_send: bool = True) -> bool:
        """Envoie l'email de demande de réinitialisation de mot de passe"""
        email_data = SecurityEmailTemplates.password_reset_request(user, reset_link)
        return cls.send_email(
            to_email=user.email,
            subject=email_data['subject'],
            html_content=email_data['html'],
            text_content=email_data['text'],
            async_send=async_send
        )

    @classmethod
    def send_password_changed_notification(cls, user, async_send: bool = True) -> bool:
        """Envoie l'email de confirmation de changement de mot de passe"""
        email_data = SecurityEmailTemplates.password_changed(user)
        return cls.send_email(
            to_email=user.email,
            subject=email_data['subject'],
            html_content=email_data['html'],
            text_content=email_data['text'],
            async_send=async_send
        )
    
    @classmethod
    def send_account_created(cls, user, password: str, async_send: bool = True) -> bool:
        """Envoie l'email de bienvenue pour un nouveau compte"""
        from services.email_templates_extended import SecurityEmailTemplates
        
        email_data = SecurityEmailTemplates.account_created(user, password)
        return cls.send_email(
            to_email=user.email,
            subject=email_data['subject'],
            html_content=email_data['html'],
            text_content=email_data['text'],
            async_send=async_send,
            reply_to=['stages@cebnet.org']
        )
    
    @classmethod
    def send_newsletter_welcome(cls, user, async_send: bool = True) -> bool:
        """Envoie l'email de bienvenue pour abonnement aux nouveautés"""
        from services.email_templates_extended import PreferenceEmailTemplates
        
        email_data = PreferenceEmailTemplates.newsletter_welcome(user)
        return cls.send_email(
            to_email=user.email,
            subject=email_data['subject'],
            html_content=email_data['html'],
            text_content=email_data['text'],
            async_send=async_send,
            reply_to=['support@cebnet.org']
        )
    
    @classmethod
    def send_2fa_code(cls, user, code: str, async_send: bool = True) -> bool:
        """
        Envoie l'email avec le code de vérification 2FA
        
        Args:
            user: Utilisateur concerné
            code: Code 2FA à 6 chiffres
            async_send: Envoi asynchrone ou non
            
        Returns:
            True si l'envoi a été initié avec succès
        """
        from services.email_templates_extended import SecurityEmailTemplates
        
        email_data = SecurityEmailTemplates.two_factor_code(user, code)
        return cls.send_email(
            to_email=user.email,
            subject=email_data['subject'],
            html_content=email_data['html'],
            text_content=email_data['text'],
            async_send=async_send,
            reply_to=['securite@cebnet.org']
        )
    
    @classmethod
    def send_stagiaire_welcome(cls, stagiaire, async_send: bool = True) -> bool:
        """
        Envoie l'email de bienvenue au stagiaire pour son premier jour
        
        Args:
            stagiaire: Instance du modèle Stagiaire
            async_send: Envoi asynchrone ou non
            
        Returns:
            True si l'envoi a été initié avec succès
        """
        from services.email_templates_extended import StageEmailTemplates
        
        email_data = StageEmailTemplates.stagiaire_welcome(stagiaire)
        return cls.send_email(
            to_email=stagiaire.email,
            subject=email_data['subject'],
            html_content=email_data['html'],
            text_content=email_data['text'],
            async_send=async_send,
        )

    @classmethod
    def send_new_demande_notification_to_admins(
        cls, 
        demande, 
        admin_emails: list,
        async_send: bool = True
    ) -> bool:
        """
        Envoie une notification aux administrateurs pour une nouvelle demande
        
        Args:
            demande: Instance de la demande
            admin_emails: Liste des emails des administrateurs
            async_send: Envoi asynchrone ou non
            
        Returns:
            True si l'envoi a été initié avec succès
        """
        from services.email_templates_extended import DemandeEmailTemplates
        
        if not admin_emails:
            logger.warning("⚠️ Aucun email d'administrateur fourni")
            return False
        
        email_data = DemandeEmailTemplates.new_demande_admin_notification(demande)
        
        # Envoi groupé à tous les admins
        return cls.send_email(
            to_email=admin_emails[0],  # Premier admin en destinataire principal
            subject=email_data['subject'],
            html_content=email_data['html'],
            text_content=email_data['text'],
            async_send=async_send,
            reply_to=[demande.etudiant_email],  # Répondre directement au candidat
            cc=admin_emails[1:] if len(admin_emails) > 1 else None  # Autres admins en copie
        )
    
    @classmethod
    def send_demande_attestation_approuvee(
        cls,
        stagiaire,
        demande_attestation,
        async_send: bool = True
    ) -> bool:
        """
        Envoie l'email de confirmation d'approbation d'attestation au stagiaire
        """
        from services.email_templates_extended import AttestationEmailTemplates
        
        email_data = AttestationEmailTemplates.attestation_approuvee(stagiaire, demande_attestation)
        return cls.send_email(
            to_email=stagiaire.email,
            subject=email_data['subject'],
            html_content=email_data['html'],
            text_content=email_data['text'],
            async_send=async_send
        )
    
    @classmethod
    def send_demande_attestation_refusee(
        cls,
        stagiaire,
        demande_attestation,
        async_send: bool = True
    ) -> bool:
        """
        Envoie l'email de notification de refus d'attestation au stagiaire
        """
        from services.email_templates_extended import AttestationEmailTemplates
        
        email_data = AttestationEmailTemplates.attestation_refusee(stagiaire, demande_attestation)
        return cls.send_email(
            to_email=stagiaire.email,
            subject=email_data['subject'],
            html_content=email_data['html'],
            text_content=email_data['text'],
            async_send=async_send
        )
    
    
    @classmethod
    def send_attestation_signee(
        cls,
        stagiaire,
        demande_attestation,
        attestation_path: str,
        async_send: bool = True
    ) -> bool:
        """
        Envoie l'attestation signée au stagiaire
        
        Args:
            stagiaire: Instance du stagiaire
            demande_attestation: Instance de la demande d'attestation
            attestation_path: Chemin vers le fichier PDF de l'attestation signée
            async_send: Envoi asynchrone ou non
            
        Returns:
            True si l'envoi a été initié avec succès
        """
        try:
            # Générer le contenu de l'email
            email_data = EmailContentService.attestation_signee(
                stagiaire, 
                demande_attestation, 
                attestation_path
            )
            
            # Préparer la pièce jointe
            attachments = []
            try:
                with open(attestation_path, 'rb') as f:
                    file_content = f.read()
                
                attachments.append({
                    'filename': f'attestation_stage_{stagiaire.nom}_{stagiaire.prenom}.pdf',
                    'content': file_content,
                    'mimetype': 'application/pdf'
                })
                logger.info(f"📎 Attestation PDF préparée pour envoi : {attestation_path}")
            except Exception as e:
                logger.error(f"❌ Erreur lecture fichier attestation: {e}")
                # On continue sans pièce jointe mais on log l'erreur
            
            # Envoyer l'email
            return cls.send_email(
                to_email=stagiaire.email,
                subject=email_data['subject'],
                html_content=email_data['html'],
                text_content=email_data['text'],
                async_send=async_send,
                attachments=attachments,
                reply_to=['attestations@cebnet.org']
            )
            
        except Exception as e:
            logger.error(f"❌ Erreur envoi email attestation signée: {e}", exc_info=True)
            return False