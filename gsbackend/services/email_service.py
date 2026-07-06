import logging
import os
import threading
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
CONTACT_EMAIL = "cbenintogo.stage@gmail.com"
CONTACT_PHONE = "+228 22 21 61 32 / 22 21 51 95"

# Logo CEB hébergé sur le domaine API (compatible Gmail, Outlook, etc.)
LOGO_URL = "https://api.cebnet.org/static/ceb-logo.png"


class EmailTemplateService:
    """Service de templates d'emails avec header/footer cohérents"""
    
    @staticmethod
    def get_base_styles() -> str:
        """Retourne les styles CSS de base pour tous les emails"""
        return """
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

            body, table, td, p, h1, h2, h3, h5, a, div, span, li {
                font-family: 'Inter', Arial, Helvetica, sans-serif;
            }

            body {
                background-color: #F4F5F7 !important;
                margin: 0 !important;
                padding: 0 !important;
                width: 100% !important;
                min-width: 100% !important;
                -webkit-text-size-adjust: 100%;
                -ms-text-size-adjust: 100%;
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

            h1 { font-size: 30px; font-weight: 700; color: #1F2933; margin: 0 0 14px; line-height: 1.25; }
            h2 { font-size: 22px; font-weight: 700; color: #1F2933; margin: 0 0 12px; line-height: 1.3; }
            h5 { font-size: 16px; font-weight: 700; color: #2B2F33; margin: 0 0 8px; line-height: 1.45; }
            p  { font-size: 16px; font-weight: 400; color: #6B7280; margin: 0 0 18px; line-height: 1.75; }

            .container {
                width: 100%;
                max-width: 600px;
                margin: 0 auto;
            }

            .header-container {
                background-color: #FFFFFF;
                padding: 25px 35px;
            }

            .content-container {
                background-color: #FFFFFF;
                padding: 52px 44px;
                color: #6B7280;
                font-size: 16px;
                line-height: 1.75;
            }

            .greeting {
                color: #1F2933;
                font-size: 26px;
                font-weight: 700;
                line-height: 1.3;
                margin-bottom: 26px;
            }

            /* Bouton rectangulaire charcoal */
            .es-button-border {
                display: inline-block;
                background: #2B2F33;
            }
            .es-button {
                display: inline-block;
                background: #2B2F33;
                color: #FFFFFF !important;
                font-size: 18px;
                font-weight: 600;
                text-decoration: none;
                padding: 15px 40px;
                mso-padding-alt: 0;
                line-height: 1.2;
            }

            /* Carte d'étapes / encadré (sans bords arrondis) */
            .es-steps-card {
                background-color: #FFFFFF;
                border: 1px solid #ECECEE;
            }
            .es-step {
                font-size: 18px;
                font-weight: 500;
                color: #2B2F33;
                text-decoration: none;
            }
            .es-step-index {
                display: inline-block;
                width: 30px;
                height: 30px;
                line-height: 30px;
                text-align: center;
                background: #F0F1F3;
                color: #2B2F33;
                font-size: 15px;
                font-weight: 700;
                margin-right: 14px;
            }

            .content-box {
                margin: 30px 0;
                padding: 26px 28px;
                background-color: #F7F8FA;
                border: 1px solid #ECECEE;
                color: #6B7280;
            }

            .data-table {
                width: 100%;
                border-collapse: collapse;
                margin: 28px 0;
            }

            .data-table td, .data-table th {
                padding: 14px 14px;
                border-bottom: 1px solid #ECECEE;
                text-align: left;
            }

            .data-table th {
                background-color: #F7F8FA;
                font-weight: 600;
                color: #2B2F33;
            }

            .tracking-box {
                background: #F7F8FA;
                border: 1px solid #ECECEE;
                padding: 30px;
                text-align: center;
                margin: 30px 0;
            }

            .tracking-label {
                font-size: 12px;
                color: #9AA1A9;
                text-transform: uppercase;
                letter-spacing: 1px;
                margin-bottom: 8px;
            }

            .tracking-id {
                font-size: 20px;
                font-weight: 700;
                color: #1F2933;
                font-family: 'Courier New', monospace;
            }

            /* Pied de page (modèle : menu de liens séparés + mentions) */
            .es-footer-menu a {
                color: #6B7280;
                text-decoration: none;
                font-size: 15px;
            }
            .es-footer-sep {
                border-left: 1px solid #D9DCE0;
            }

            @media only screen and (max-width: 600px) {
                .container { width: 100% !important; }
                .content-container { padding: 40px 26px !important; }
                .header-container { padding: 22px 24px !important; }
                .es-px { padding-left: 24px !important; padding-right: 24px !important; }
                h1 { font-size: 24px !important; }
                .greeting { font-size: 22px !important; }
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
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html dir="ltr" lang="fr" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
    <meta charset="UTF-8">
    <meta content="width=device-width, initial-scale=1" name="viewport">
    <meta name="x-apple-disable-message-reformatting">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta content="telephone=no" name="format-detection">
    <title>{APP_NAME}</title>
    <!--[if (mso 16)]><style type="text/css">a {{text-decoration: none;}}</style><![endif]-->
    <!--[if gte mso 9]><style>sup {{ font-size: 100% !important; }}</style><![endif]-->
    <!--[if gte mso 9]>
    <noscript><xml><o:OfficeDocumentSettings>
        <o:AllowPNG></o:AllowPNG><o:PixelsPerInch>96</o:PixelsPerInch>
    </o:OfficeDocumentSettings></xml></noscript>
    <![endif]-->
    <!--[if !mso]><!-- -->
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap">
    <!--<![endif]-->
    {cls.get_base_styles()}
</head>
<body topmargin="0" leftmargin="0" style="background-color: #F4F5F7; margin: 0; padding: 0; width: 100% !important; min-width: 100%;">

<!--[if gte mso 9]>
<v:background xmlns:v="urn:schemas-microsoft-com:vml" fill="t">
    <v:fill type="tile" color="#F4F5F7"></v:fill>
</v:background>
<![endif]-->

<table border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#F4F5F7" role="presentation">
    <tr>
        <td align="center" valign="top" style="padding: 26px 12px;">

            <!-- ============ EN-TÊTE (logo + identité) ============ -->
            <table class="container" border="0" cellpadding="0" cellspacing="0" width="600" bgcolor="#FFFFFF" role="presentation" style="background-color:#FFFFFF; border-radius: 10px 10px 0 0; overflow: hidden;">
                <tr>
                    <td class="header-container es-px" align="left" style="padding: 25px 35px;">
                        <table border="0" cellpadding="0" cellspacing="0" align="left" role="presentation">
                            <tr>
                                <td valign="middle" style="padding-right: 16px;">
                                    <img src="{LOGO_URL}" alt="{ORG_SHORT}" width="60" height="64"
                                        style="display:block; width:60px; height:auto; border:0;">
                                </td>
                                <td valign="middle" align="left">
                                    <div style="font-size:17px; font-weight:700; color:#1F2933; line-height:1.25;">{ORG_NAME}</div>
                                    <div style="font-size:13px; color:#9AA1A9; padding-top:3px;">Service des Stages</div>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>

            <!-- ============ CONTENU ============ -->
            <table class="container" border="0" cellpadding="0" cellspacing="0" width="600" bgcolor="#FFFFFF" role="presentation" style="background-color:#FFFFFF;">
                <tr>
                    <td class="content-container es-px" align="center" valign="top">
                        <div class="greeting" style="text-align:center;">{greeting}</div>
                        {content_html}
                    </td>
                </tr>
            </table>

            <!-- ============ PIED DE PAGE ============ -->
            <table class="container" border="0" cellpadding="0" cellspacing="0" width="600" bgcolor="#FFFFFF" role="presentation" style="background-color:#FFFFFF; border-radius: 0 0 10px 10px; overflow: hidden;">
                <tr>
                    <td class="es-px" align="center" style="padding: 35px;">

                        <div style="font-size:15px; font-weight:700; color:#1F2933; margin-bottom:4px;">{ORG_NAME}</div>
                        <div style="font-size:13px; color:#9AA1A9; line-height:1.7; margin-bottom:18px;">{APP_NAME}</div>

                        <!-- Menu de liens (modèle) -->
                        <table cellpadding="0" cellspacing="0" align="center" role="presentation" class="es-footer-menu">
                            <tr>
                                <td align="center" style="padding: 0 16px;">
                                    <a href="{SITE_URL}" target="_blank">Plateforme</a>
                                </td>
                                <td align="center" class="es-footer-sep" style="padding: 0 16px;">
                                    <a href="mailto:{CONTACT_EMAIL}">Contact</a>
                                </td>
                                <td align="center" class="es-footer-sep" style="padding: 0 16px;">
                                    <a href="{SITE_URL}" target="_blank">Aide</a>
                                </td>
                            </tr>
                        </table>

                        <div style="margin-top:20px; padding-top:18px; border-top:1px solid #ECECEE; font-size:12px; color:#9AA1A9; line-height:1.7;">
                            <a href="mailto:{CONTACT_EMAIL}" style="color:#9AA1A9; text-decoration:underline;">{CONTACT_EMAIL}</a><br>
                            
                            
                            {CONTACT_PHONE}<br>
                            Message automatique &mdash; merci de ne pas y répondre directement.<br>
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

class EmailContentService:
    """Service pour générer le contenu spécifique de chaque type d'email"""

    @staticmethod
    def demande_attestation_confirmee(stagiaire, demande_attestation) -> Dict[str, str]:
        """Génère le contenu pour un email de confirmation de demande d'attestation"""
        from services.email_templates_extended import get_gender_based_greeting
        
        # Utilisation du genre du stagiaire pour la salutation
        greeting = get_gender_based_greeting(stagiaire.nom, stagiaire.genre)
        
        content = f"""
<div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; color: #333;">
    <!-- Message principal -->
    <div style="margin-bottom: 30px;">
        <p style="color: #6B7280; font-size: 15px; line-height: 1.75; margin-bottom: 20px;">
            Nous accusons réception de votre demande d'attestation de stage. 
            Cette dernière a été enregistrée dans notre système de traitement.
        </p>

        <p style="color: #6B7280; font-size: 15px; line-height: 1.75;">
            Votre demande sera instruite selon la procédure en vigueur. 
            Vous serez informé(e) de l'avancement du traitement dans les délais établis.
        </p>
    </div>
    
    <!-- Message de remerciement -->
    <div style="text-align: center; background-color: #F7F8FA; padding: 20px; border-radius: 8px; margin-top: 20px;">
        <p style="color: #1F2933; font-size: 15px; margin: 0; font-weight: bold;">
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
        <p style="color: #6B7280; font-size: 15px; line-height: 1.75; margin-bottom: 20px;">
            Une nouvelle demande d'attestation de stage nécessite votre attention.
            Les éléments de la demande ont été systématisés dans notre application de gestion.
        </p>
    </div>
    
    <!-- Avertissement -->
    <div style="background-color: #F7F8FA; border-left: 4px solid #9AA1A9; padding: 20px; margin: 25px 0; border-radius: 8px;">
        <p style="color: #6B7280; font-size: 15px; margin: 0;">
            ⚠️ <strong>Instruction requise :</strong> Veuillez procéder à l'examen de ce dossier.
        </p>
    </div>
    
    <!-- Référence -->
    <div style="text-align: center; background-color: #F7F8FA; padding: 25px; border-radius: 8px; margin: 30px 0;">
        <p style="color: #1F2933; font-size: 16px; margin: 0 0 10px 0; font-weight: bold;">
            Référence administrative
        </p>
        <p style="color: #333; font-size: 20px; margin: 0; font-family: monospace; font-weight: bold;">
            {getattr(demande_attestation, 'reference', None) or demande_attestation.id}
        </p>
    </div>
    
    <!-- Note -->
    <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e0e0e0; margin-top: 30px;">
        <p style="color: #999; font-size: 13px; margin: 0; line-height: 1.7;">
            Veuillez vous connecter à la plateforme administrative pour accéder au dossier complet.
        </p>
    </div>
</div>
        """
        
        subject = f"Nouvelle demande d'attestation - Réf: {getattr(demande_attestation, 'reference', None) or demande_attestation.id}"
        greeting = "Madame, Monsieur,"
        
        return {
            'subject': subject,
            'html': EmailTemplateService.build_email(greeting, content, "Service de Gestion des Attestations"),
            'text': EmailContentService._generate_text_version(subject, greeting, content)
        }
    
    @staticmethod
    def attestation_signee(stagiaire, demande_attestation, attestation_path: str) -> Dict[str, str]:
        """Génère le contenu pour un email d'attestation signée envoyée"""
        greeting = get_gender_based_greeting(stagiaire.nom, stagiaire.genre)
        
        content = f"""
<div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; color: #333;">
    <!-- Message principal -->
    <div style="margin-bottom: 30px;">
        <p style="color: #6B7280; font-size: 15px; line-height: 1.75; margin-bottom: 20px;">
            Nous avons le plaisir de vous informer que votre attestation de stage a été signée 
            et est désormais disponible en téléchargement.
        </p>
        
        <p style="color: #6B7280; font-size: 15px; line-height: 1.75; margin-bottom: 20px;">
            Votre attestation signée est jointe à cet email au format PDF. 
            Conservez précieusement ce document qui pourra vous être demandé pour vos démarches administratives.
        </p>
    </div>

    <!-- Pièce jointe -->
    <div style="background-color: #F7F8FA; border-left: 4px solid #2B2F33; padding: 15px; margin: 20px 0; border-radius: 8px;">
        <p style="color: #1F2933; font-size: 15px; margin: 0;">
            📎 <strong>Pièce jointe :</strong> Votre attestation de stage signée est jointe à cet email.
        </p>
    </div>

    <!-- Conseils importants -->
    <div style="background-color: #F7F8FA; border: 1px solid #ECECEE; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
        <h3 style="color: #1F2933; margin: 0 0 15px 0; font-size: 16px; font-weight: bold;">
            Conseils importants
        </h3>
        
        <ul style="color: #666; font-size: 15px; line-height: 1.75; padding-left: 20px; margin: 0;">
            <li style="margin-bottom: 8px;">Conservez précieusement ce document</li>
            <li style="margin-bottom: 8px;">Faites des copies pour vos dossiers personnels</li>
            <li style="margin-bottom: 8px;">L'attestation originale peut vous être demandée pour vos démarches</li>
            <li>Il est recommandé de ne pas partager ce document en ligne</li>
        </ul>
    </div>

    <!-- Message de remerciement -->
    <div style="text-align: center; background-color: #F7F8FA; padding: 20px; border-radius: 8px; margin-top: 20px;">
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
Madame, Monsieur {context['stagiaire_nom']},

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
<p>Madame, Monsieur {context['stagiaire_nom']},</p>
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
        greeting = get_gender_based_greeting(demande.etudiant_nom, demande.genre)
        
        content = f"""
<div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; color: #333;">
    <!-- Message principal -->
    <div style="margin-bottom: 30px;">
        <p style="color: #6B7280; font-size: 15px; line-height: 1.75; margin-bottom: 20px;">
            Nous vous confirmons la prise en compte de votre candidature 
            auprès de la Communauté Électrique du Bénin.
        </p>
    </div>
    
    <!-- Référence -->
    <div style="text-align: center; background-color: #F7F8FA; padding: 25px; border-radius: 8px; margin: 30px 0;">
        <p style="color: #1F2933; font-size: 16px; margin: 0 0 10px 0; font-weight: bold;">
            Votre référence de dossier
        </p>
        <p style="color: #333; font-size: 20px; margin: 0; font-family: monospace; font-weight: bold;">
            {demande.tracking_id}
        </p>
    </div>
    
    <!-- Instruction administrative -->
    <div style="background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
        <h3 style="color: #1F2933; margin: 0 0 15px 0; font-size: 16px; font-weight: bold;">
            Instruction administrative
        </h3>
        
        <p style="color: #666; font-size: 15px; line-height: 1.75;">
            Votre dossier sera examiné conformément à notre procédure de sélection. 
            Vous serez informé(e) de l'avancement du traitement dans les délais réglementaires.
        </p>
    </div>
    
    <!-- Message de remerciement -->
    <div style="text-align: center; background-color: #F7F8FA; padding: 20px; border-radius: 8px; margin-top: 20px;">
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
        greeting = get_gender_based_greeting(demande.etudiant_nom, demande.genre)
        
        # ✅ AJOUT : Mention de la convention en pièce jointe
        piece_jointe_mention = ""
        if convention_pdf_path:
            piece_jointe_mention = """
    <div style="background-color: #F7F8FA; border-left: 4px solid #2B2F33; padding: 15px; margin: 20px 0; border-radius: 8px;">
        <p style="color: #1F2933; font-size: 15px; margin: 0;">
            📎 <strong>Pièce jointe :</strong> Votre convention de stage signée est jointe à cet email.
        </p>
    </div>
            """
        
        content = f"""
<div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; color: #333;">
    <!-- Message principal -->
    <div style="margin-bottom: 30px;">
        <p style="color: #6B7280; font-size: 15px; line-height: 1.75; margin-bottom: 20px;">
            Nous avons le plaisir de vous informer que votre candidature pour un stage 
            au sein de la Communauté Électrique du Bénin a été retenue.
        </p>
    </div>

    {piece_jointe_mention}

    <!-- Référence -->
    <div style="text-align: center; background-color: #F7F8FA; padding: 25px; border-radius: 8px; margin: 30px 0;">
        <p style="color: #1F2933; font-size: 16px; margin: 0 0 10px 0; font-weight: bold;">
            Référence administrative
        </p>
        <p style="color: #333; font-size: 20px; margin: 0; font-family: monospace; font-weight: bold;">
            {demande.tracking_id}
        </p>
    </div>

    <!-- Information relative -->
    <div style="background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
        <h3 style="color: #1F2933; margin: 0 0 15px 0; font-size: 16px; font-weight: bold;">
            Information relative au stage
        </h3>
        
        <p style="color: #666; font-size: 15px; line-height: 1.75;">
            Vous trouverez ci-joint votre convention de stage signée. 
            Veuillez la conserver précieusement pour vos démarches administratives.
        </p>
    </div>

    <!-- Message de bienvenue -->
    <div style="text-align: center; background-color: #F7F8FA; padding: 20px; border-radius: 8px; margin-top: 20px;">
        <p style="color: #1F2933; font-size: 15px; margin: 0; font-weight: bold;">
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
        <p style="color: #6B7280; font-size: 15px; line-height: 1.75; margin-bottom: 20px;">
            Nous vous informons que votre demande de stage a été prise en compte 
            et est désormais en cours d'examen par nos services compétents.
        </p>
    </div>

    <!-- Référence -->
    <div style="text-align: center; background-color: #F7F8FA; padding: 25px; border-radius: 8px; margin: 30px 0;">
        <p style="color: #1F2933; font-size: 16px; margin: 0 0 10px 0; font-weight: bold;">
            Référence administrative
        </p>
        <p style="color: #333; font-size: 20px; margin: 0; font-family: monospace; font-weight: bold;">
            {demande.tracking_id}
        </p>
    </div>

    <!-- Information sur le traitement -->
    <div style="background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
        <h3 style="color: #1F2933; margin: 0 0 15px 0; font-size: 16px; font-weight: bold;">
            Information sur le traitement
        </h3>
        
        <p style="color: #666; font-size: 15px; line-height: 1.75;">
            Votre dossier suivra la procédure d'instruction établie. 
            Vous serez informé(e) des évolutions dans les délais impartis.
        </p>
    </div>

    <!-- Message patiente -->
    <div style="text-align: center; background-color: #F7F8FA; padding: 20px; border-radius: 8px; margin-top: 20px;">
        <p style="color: #1F2933; font-size: 15px; margin: 0; font-weight: bold;">
            Merci de bien vouloir patienter pendant la durée du traitement administratif
        </p>
    </div>
</div>
        """
        
        subject = f"Mise en traitement - Demande n°{demande.tracking_id}"
        greeting = get_gender_based_greeting(demande.etudiant_nom, demande.genre)

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
        <p style="color: #6B7280; font-size: 15px; line-height: 1.75; margin-bottom: 20px;">
            Dans le cadre de l'instruction de votre dossier, il nous est nécessaire 
            de solliciter des informations ou documents supplémentaires.
        </p>
    </div>

    <!-- Élément(s) sollicité(s) -->
    <div style="background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
        <h3 style="color: #1F2933; margin: 0 0 15px 0; font-size: 16px; font-weight: bold;">
            Élément(s) sollicité(s)
        </h3>
        
        <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #E8EAED;">
            {message}
        </div>
    </div>

    <!-- Référence -->
    <div style="text-align: center; background-color: #F7F8FA; padding: 25px; border-radius: 8px; margin: 30px 0;">
        <p style="color: #1F2933; font-size: 16px; margin: 0 0 10px 0; font-weight: bold;">
            Référence de dossier
        </p>
        <p style="color: #333; font-size: 20px; margin: 0; font-family: monospace; font-weight: bold;">
            {demande.tracking_id}
        </p>
    </div>

    <!-- Délai de réponse -->
    <div style="background-color: #F7F8FA; border: 1px solid #ECECEE; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
        <h3 style="color: #1F2933; margin: 0 0 15px 0; font-size: 16px; font-weight: bold;">
            Délai de réponse
        </h3>
        
        <p style="color: #666; font-size: 15px; margin: 0; line-height: 1.75;">
            Nous vous prions de bien vouloir nous transmettre ces éléments dans les meilleurs délais 
            afin de ne pas interrompre le traitement de votre dossier.
        </p>
    </div>

    <!-- Lien de suivi -->
    <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e0e0e0; margin-top: 30px;">
        <p style="color: #666; font-size: 15px; margin: 0; line-height: 1.75;">
            Vous pouvez accéder à votre espace de suivi à l'adresse suivante :<br>
            <a href="{suivi_url}" style="color: #1F2933; text-decoration: none;">
                {suivi_url}
            </a>
        </p>
    </div>
</div>
        """
        
        subject = f"Demande d'élément complémentaire - Réf: {demande.tracking_id}"
        greeting = get_gender_based_greeting(demande.etudiant_nom, demande.genre)

        return {
            'subject': subject,
            'html': EmailTemplateService.build_email(greeting, content),
            'text': EmailContentService._generate_text_version(subject, greeting, content)
        }
    
    @staticmethod
    def demande_refusee(demande) -> Dict[str, str]:
        """Génère le contenu pour un email de refus"""
        greeting = get_gender_based_greeting(demande.etudiant_nom, demande.genre)
        
        content = f"""
<div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; color: #333;">
    <!-- Message principal -->
    <div style="margin-bottom: 30px;">
        <p style="color: #6B7280; font-size: 15px; line-height: 1.75; margin-bottom: 20px;">
            Nous vous remercions de l'intérêt que vous avez porté à la Communauté Électrique du Bénin.
        </p>
    </div>
    
    <!-- Décision -->
    <div style="margin-bottom: 30px;">
        <h3 style="color: #1F2933; margin: 0 0 15px 0; font-size: 16px; font-weight: bold;">
            Décision
        </h3>
        
        <p style="color: #6B7280; font-size: 15px; margin-bottom: 15px; line-height: 1.75;">
            Après un examen attentif de votre dossier, nous regrettons de vous informer que votre candidature n'a pas été retenue pour cette session.
        </p>
        
        <div style="background-color: #F7F8FA; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <p style="color: #1F2933; font-size: 15px; margin: 0; line-height: 1.75;">
                <strong>Motif :</strong> {demande.raison_refus or "Le nombre de places disponibles est limité."}
            </p>
        </div>
    </div>
    
    <!-- Référence -->
    <div style="text-align: center; background-color: #F7F8FA; padding: 25px; border-radius: 8px; margin: 30px 0;">
        <p style="color: #1F2933; font-size: 16px; margin: 0 0 10px 0; font-weight: bold;">
            Référence administrative
        </p>
        <p style="color: #333; font-size: 20px; margin: 0; font-family: monospace; font-weight: bold;">
            {demande.tracking_id}
        </p>
    </div>
    
    <!-- Message de fin -->
    <div style="text-align: center; background-color: #F7F8FA; padding: 20px; border-radius: 8px; margin-top: 20px;">
        <p style="color: #1F2933; font-size: 15px; margin: 0; font-weight: bold;">
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

    # =========================================================================
    # EMAILS DE FIN DE STAGE & ALERTES AUTOMATIQUES
    # =========================================================================

    @classmethod
    def send_stagiaire_farewell(cls, stagiaire, async_send: bool = True) -> bool:
        """Envoie l'email de fin de stage au stagiaire"""
        from services.email_templates_extended import StageEmailTemplates

        email_data = StageEmailTemplates.stagiaire_farewell(stagiaire)
        return cls.send_email(
            to_email=stagiaire.email,
            subject=email_data['subject'],
            html_content=email_data['html'],
            text_content=email_data['text'],
            async_send=async_send,
        )

    @classmethod
    def send_alerte_demandes_en_retard(cls, admin_emails: list, demandes_retard: list, seuil_jours: int = 7, async_send: bool = True) -> bool:
        """Envoie l'email d'alerte pour les demandes en retard aux admins"""
        from services.email_templates_extended import AlerteEmailTemplates

        email_data = AlerteEmailTemplates.alerte_demandes_en_retard(demandes_retard, seuil_jours)
        success = True
        for email in admin_emails:
            result = cls.send_email(
                to_email=email,
                subject=email_data['subject'],
                html_content=email_data['html'],
                text_content=email_data['text'],
                async_send=async_send,
            )
            if not result:
                success = False
        return success

    @classmethod
    def send_alerte_attestations_en_attente(cls, admin_emails: list, attestations: list, seuil_jours: int = 5, async_send: bool = True) -> bool:
        """Envoie l'email d'alerte pour les attestations en attente"""
        from services.email_templates_extended import AlerteEmailTemplates

        email_data = AlerteEmailTemplates.alerte_attestations_en_attente(attestations, seuil_jours)
        success = True
        for email in admin_emails:
            result = cls.send_email(
                to_email=email,
                subject=email_data['subject'],
                html_content=email_data['html'],
                text_content=email_data['text'],
                async_send=async_send,
            )
            if not result:
                success = False
        return success

    @classmethod
    def send_rappel_mi_stage(cls, admin_emails: list, stagiaires_mi_stage: list, async_send: bool = True) -> bool:
        """Envoie l'email de rappel mi-stage aux admins"""
        from services.email_templates_extended import AlerteEmailTemplates

        email_data = AlerteEmailTemplates.rappel_mi_stage(stagiaires_mi_stage)
        success = True
        for email in admin_emails:
            result = cls.send_email(
                to_email=email,
                subject=email_data['subject'],
                html_content=email_data['html'],
                text_content=email_data['text'],
                async_send=async_send,
            )
            if not result:
                success = False
        return success

    @classmethod
    def send_alerte_stages_proches(cls, admin_emails: list, stages, date_cible, async_send: bool = True) -> bool:
        """Envoie l'email d'alerte stages débutant bientôt aux admins"""
        from services.email_templates_extended import AlerteEmailTemplates

        email_data = AlerteEmailTemplates.alerte_stages_proches_email(stages, date_cible)
        success = True
        for email in admin_emails:
            result = cls.send_email(
                to_email=email,
                subject=email_data['subject'],
                html_content=email_data['html'],
                text_content=email_data['text'],
                async_send=async_send,
            )
            if not result:
                success = False
        return success

    @classmethod
    def send_alerte_stages_finissants(cls, admin_emails: list, stages_info: list, async_send: bool = True) -> bool:
        """Envoie l'email d'alerte stages finissant bientôt aux admins"""
        from services.email_templates_extended import AlerteEmailTemplates

        email_data = AlerteEmailTemplates.alerte_stages_finissants_email(stages_info)
        success = True
        for email in admin_emails:
            result = cls.send_email(
                to_email=email,
                subject=email_data['subject'],
                html_content=email_data['html'],
                text_content=email_data['text'],
                async_send=async_send,
            )
            if not result:
                success = False
        return success

    @classmethod
    def send_recapitulatif_hebdomadaire(cls, admin_emails: list, stats: dict, async_send: bool = True) -> bool:
        """Envoie le récapitulatif hebdomadaire aux admins"""
        from services.email_templates_extended import AlerteEmailTemplates

        email_data = AlerteEmailTemplates.recapitulatif_hebdomadaire(stats)
        success = True
        for email in admin_emails:
            result = cls.send_email(
                to_email=email,
                subject=email_data['subject'],
                html_content=email_data['html'],
                text_content=email_data['text'],
                async_send=async_send,
            )
            if not result:
                success = False
        return success