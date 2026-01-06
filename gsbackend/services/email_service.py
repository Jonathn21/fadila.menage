import logging
import threading
from typing import Dict, List, Optional
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from datetime import datetime
from django.utils import timezone
from services.email_templates_extended import BenchmarkEmailTemplateService, SecurityEmailTemplates, PreferenceEmailTemplates

logger = logging.getLogger(__name__)


class EmailTemplateService:
    """Service de templates d'emails avec header/footer cohérents"""
    
    @staticmethod
    def get_base_styles() -> str:
        """Retourne les styles CSS de base pour tous les emails"""
        return f"""
        <style>
            body {{
                background-color: #EBF5FE !important;
                margin: 0 !important;
                padding: 0 !important;
                width: 100% !important;
                min-width: 100% !important;
                font-family: Arial, Helvetica, sans-serif;
            }}
            
            table {{
                border-collapse: collapse;
                mso-table-lspace: 0pt;
                mso-table-rspace: 0pt;
            }}
            
            img {{
                border: 0;
                height: auto;
                line-height: 100%;
                outline: none;
                text-decoration: none;
                -ms-interpolation-mode: bicubic;
            }}
            
            .container {{
                width: 100%;
                max-width: 600px;
                margin: 0 auto;
            }}
            
            .header-container {{
                background-color: #FFFFFF;
                padding: 20px;
            }}
            
            .content-container {{
                background-color: #FFFFFF;
                padding: 20px 30px;
                color: #383838;
                font-size: 14px;
                line-height: 1.6;
            }}
            
            .greeting {{
                color: #0D652D;
                font-size: 16px;
                font-weight: bold;
                margin-bottom: 20px;
            }}
            
            .content-box {{
                margin: 25px 0;
                padding: 20px;
                background-color: #F8F9FA;
                border-left: 4px solid #0D652D;
                border-radius: 4px;
            }}
            
            .data-table {{
                width: 100%;
                border-collapse: collapse;
                margin: 20px 0;
            }}
            
            .data-table td, .data-table th {{
                padding: 12px 8px;
                border-bottom: 1px solid #E8EAED;
                text-align: left;
            }}
            
            .data-table th {{
                background-color: #F8F9FA;
                font-weight: 600;
                color: #3C4043;
            }}
            
            .tracking-box {{
                background: #F8F9FA;
                border: 1px solid #E8EAED;
                border-radius: 6px;
                padding: 20px;
                text-align: center;
                margin: 25px 0;
            }}
            
            .tracking-label {{
                font-size: 12px;
                color: #666666;
                text-transform: uppercase;
                letter-spacing: 1px;
                margin-bottom: 8px;
            }}
            
            .tracking-id {{
                font-size: 18px;
                font-weight: 600;
                color: #0D652D;
                font-family: 'Courier New', monospace;
            }}
            
            .footer-container {{
                background-color: #E3E3E3;
                padding: 30px 20px;
                color: #666666;
                font-size: 11px;
                line-height: 1.4;
            }}
            
            .footer-links {{
                text-align: center;
                margin: 20px 0;
            }}
            
            .footer-links a {{
                color: #000000;
                text-decoration: underline;
                margin: 0 10px;
            }}
            
            .footer-info {{
                text-align: center;
                margin-top: 20px;
                color: #666666;
                font-size: 11px;
            }}
            
            @media only screen and (max-width: 480px) {{
                .container {{
                    width: 95% !important;
                }}
                
                .content-container {{
                    padding: 15px 20px !important;
                }}
            }}
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
        
        email_html = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CEB Stages - Email</title>
    {cls.get_base_styles()}
</head>
<body topmargin="0" leftmargin="0" style="background-color: #EBF5FE; height: 100% !important; margin: 0; padding: 0; width: 100% !important; min-width: 100%;">

<table border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#EBF5FE">
    <tr>
        <td align="center" valign="top">
            <table class="container" border="0" cellpadding="0" cellspacing="0" width="600">
                <tr>
                    <td height="20"></td>
                </tr>
                
                <tr>
                    <td class="header-container" align="center">
                        <table border="0" cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                                <td align="center" style="padding: 25px 20px;">
                                    <table border="0" cellpadding="0" cellspacing="0" align="center">
                                        <tr>
                                            <td align="center" valign="middle" style="padding-right: 5px;">
                                                <img src="https://i.postimg.cc/QCxHqh37/ceb-logo.png" 
                                                    alt="CEB" 
                                                    width="50" 
                                                    style="max-width: 80px; height: auto; display: block;">
                                            </td>
                                            <td align="left" valign="middle" style="padding-left: 5px;">
                                                <div style="font-family: Arial, sans-serif;">
                                                   
                                                    <div style="font-size: 15px; color: #4A5568; padding-top: 8px; font-weight: 500;">
                                                        {subtitle}
                                                    </div>
                                                    <div style="font-size: 12px; color: #718096; padding-top: 4px;">
                                                        Communauté Électrique du Bénin
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
                
                <tr>
                    <td class="content-container">
                        <div class="greeting">
                            {greeting}
                        </div>
                        {content_html}
                    </td>
                </tr>
                
                <tr>
                    <td class="footer-container">
                        <div class="footer-links">
                            <a href="#" style="color: #000000; text-decoration: underline;">Plateforme Stages</a> | 
                            <a href="#" style="color: #000000; text-decoration: underline;">Contact</a> | 
                            <a href="#" style="color: #000000; text-decoration: underline;">Confidentialité</a> | 
                            <a href="#" style="color: #000000; text-decoration: underline;">Aide</a>
                        </div>
                        
                        <div class="footer-info">
                            Communauté Électrique du Bénin<br>
                            01 BP 2001 Cotonou, Bénin<br>
                            Téléphone: +229 21 30 05 06 | Email: stages@ceb.bj
                        </div>
                        
                        <div class="footer-info" style="margin-top: 15px;">
                            © {timezone.now().year} Communauté Électrique du Bénin. Tous droits réservés.<br>
                            Cet email a été envoyé automatiquement. Merci de ne pas y répondre.
                        </div>
                    </td>
                </tr>
                
                <tr>
                    <td height="20"></td>
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
    def confirmation_demande(demande) -> Dict[str, str]:
        """Génère le contenu pour un email de confirmation de demande"""
        
        content = f"""
<div class="content-box">
    <div style="color: #0D652D; font-weight: bold; margin-bottom: 15px; font-size: 16px;">
        Nous accusons réception de votre candidature
    </div>
    <p style="color: #383838; font-size: 14px; margin-bottom: 20px; line-height: 1.6;">
        Votre candidature pour un stage au sein de la Communauté Électrique du Bénin 
        a bien été enregistrée dans notre système.
    </p>
</div>

<div class="tracking-box">
    <div class="tracking-label">Votre numéro de suivi</div>
    <div class="tracking-id">{demande.tracking_id}</div>
</div>

<div class="content-box">
    <div style="color: #0D652D; font-weight: bold; margin-bottom: 15px; font-size: 15px;">
        Récapitulatif de votre candidature
    </div>
    <table class="data-table">
        <tr>
            <th style="width: 140px;">Type de stage</th>
            <td>{demande.type_stage or 'Non spécifié'}</td>
        </tr>
        <tr>
            <th>Domaine</th>
            <td>{demande.etudiant_specialite or 'Non spécifié'}</td>
        </tr>
        <tr>
            <th>Niveau d'études</th>
            <td>{demande.etudiant_niveau or 'Non spécifié'}</td>
        </tr>
        <tr>
            <th>Date de soumission</th>
            <td>{demande.date_soumission.strftime('%d/%m/%Y à %H:%M')}</td>
        </tr>
    </table>
</div>

<div class="content-box" style="border-left: 4px solid #17a2b8;">
    <div style="color: #0D652D; font-weight: bold; margin-bottom: 10px; font-size: 15px;">
        Prochaines étapes
    </div>
    <p style="color: #383838; margin: 0; line-height: 1.6;">
        Votre dossier sera examiné dans les prochains jours. 
        Vous recevrez une notification par email dès qu'une décision sera prise.
    </p>
</div>

<div style="text-align: center; margin: 30px 0; padding: 25px;">
    <p style="color: #666666; font-size: 14px; margin: 0; line-height: 1.6; font-style: italic;">
        Nous vous remercions de votre intérêt pour la CEB et vous souhaitons 
        bonne chance dans le processus de sélection.
    </p>
</div>
        """
        
        subject = f"Confirmation de réception de votre candidature - {demande.tracking_id}"
        greeting = f"Cher(e){demande.etudiant_nom.upper()},"
        
        return {
            'subject': subject,
            'html': EmailTemplateService.build_email(greeting, content),
            'text': EmailContentService._generate_text_version(subject, greeting, content)
        }
    
    @staticmethod
    def demande_acceptee(stagiaire, demande, convention_pdf_path=None) -> Dict[str, str]:
        """Génère le contenu pour un email d'acceptation"""
        greeting = get_gender_based_greeting(demande.etudiant_prenom, demande.genre)

        # ✅ CORRECTION: Ajouter une mention sur la convention jointe
        mention_convention = ""
        if convention_pdf_path:
            mention_convention = f"""
            <div class="content-box" style="background-color: #f0f8ff; border-left: 4px solid #0D652D; margin: 20px 0;">
                <p style="color: #0D652D; font-weight: bold; margin-bottom: 10px;">
                    📎 Convention de stage jointe
                </p>
                <p style="color: #383838; font-size: 14px; margin: 0;">
                    Vous trouverez en pièce jointe votre convention de stage signée. Veuillez la conserver précieusement.
                </p>
            </div>
            """
        
        content = f"""
            <div class="content-box">
                <div style="color: #0D652D; font-weight: bold; margin-bottom: 15px; font-size: 18px;">
                    Félicitations !
                </div>
                <p style="color: #383838; font-size: 14px; margin-bottom: 20px; line-height: 1.6;">
                    Votre candidature pour un stage à la CEB a été acceptée.
                </p>
            </div>

            {mention_convention}

            <div class="content-box">
                <div style="color: #0D652D; font-weight: bold; margin-bottom: 15px; font-size: 15px;">
                    Détails de votre stage
                </div>
                <table class="data-table">
                    <tr>
                        <th style="width: 140px;">Stagiaire</th>
                        <td>{stagiaire.nom} {stagiaire.prenom}</td>
                    </tr>
                    <tr>
                        <th>Type de stage</th>
                        <td>{stagiaire.type_stage}</td>
                    </tr>
                    <tr>
                        <th>Direction</th>
                        <td>{stagiaire.direction}</td>
                    </tr>
                    <tr>
                        <th>Service</th>
                        <td>{stagiaire.service}</td>
                    </tr>
                    <tr>
                        <th>Période</th>
                        <td>Du {stagiaire.date_debut.strftime('%d/%m/%Y')} au {stagiaire.date_fin.strftime('%d/%m/%Y')}</td>
                    </tr>
                    <tr>
                        <th>Durée</th>
                        <td><strong>{stagiaire.duree_jours} jours</strong></td>
                    </tr>
                </table>
            </div>

            <div style="text-align: center; margin: 40px 0;">
                <div style="background: #F8F9FA; border: 1px solid #E8EAED; border-radius: 6px; padding: 25px; display: inline-block;">
                    <div style="font-size: 14px; color: #0D652D; margin-bottom: 10px;">
                        Prochaine étape importante
                    </div>
                    <div style="font-size: 16px; font-weight: 600; color: #0D652D;">
                        Début de stage : {stagiaire.date_debut.strftime('%d/%m/%Y')}
                    </div>
                </div>
            </div>

            <div style="text-align: center; margin: 30px 0; padding: 25px;">
                <p style="color: #666666; font-size: 14px; margin: 0; line-height: 1.6; font-style: italic;">
                    Nous sommes ravis de vous accueillir au sein de notre institution.
                </p>
            </div>
        """
        
        subject = f"Félicitations ! Votre candidature a été acceptée - CEB- {demande.tracking_id}"
        
        return {
            'subject': subject,
            'html': EmailTemplateService.build_email(greeting, content),
            'text': EmailContentService._generate_text_version(subject, greeting, content)
        }
    
    @staticmethod
    def demande_refusee(demande) -> Dict[str, str]:
        """Génère le contenu pour un email de refus"""
        
        content = f"""
            <div class="content-box">
                <div style="color: #0D652D; font-weight: bold; margin-bottom: 15px; font-size: 16px;">
                    Décision concernant votre candidature
                </div>
                <p style="color: #383838; font-size: 14px; margin-bottom: 20px; line-height: 1.6;">
                    Nous vous remercions de l'intérêt que vous avez porté à la Communauté 
                    Électrique du Bénin et du temps que vous avez consacré à votre candidature.
                </p>
                <p style="color: #383838; font-size: 14px; margin: 15px 0; line-height: 1.6;">
                    Après un examen attentif de votre dossier, nous regrettons de vous informer 
                    que votre candidature n'a pas été retenue.Le motif principal de cette décision est ci-dessous :
                </p>
            </div>



            {f'''
            <div class="content-box">
                <div style="color: #0D652D; font-weight: bold; margin-bottom: 15px; font-size: 15px;">
                    Motif de la décision
                </div>
                <div style="background: white; padding: 15px; border-radius: 4px; border: 1px solid #dee2e6;">
                    {demande.raison_refus}
                </div>
            </div>
            ''' if demande.raison_refus else ''}

            <div class="tracking-box">
                <div class="tracking-label">Votre numéro de suivi</div>
                <div class="tracking-id">{demande.tracking_id}</div>
            </div>

            <div style="text-align: center; margin: 30px 0; padding: 25px;">
                <p style="color: #666666; font-size: 14px; margin: 0; line-height: 1.6; font-style: italic;">
                    Nous vous encourageons à postuler à nouveau pour de futures opportunités.
                </p>
            </div>
        """
        
        subject = f"Décision concernant votre candidature - {demande.tracking_id}"
        greeting = f"Cher(e) {demande.etudiant_nom} {demande.etudiant_prenom},"
        
        return {
            'subject': subject,
            'html': EmailTemplateService.build_email(greeting, content),
            'text': EmailContentService._generate_text_version(subject, greeting, content)
        }
    
    @staticmethod
    def mise_en_traitement(demande) -> Dict[str, str]:
        """Génère le contenu pour un email de mise en traitement"""
        
        content = f"""
            <div class="content-box">
                <div style="color: #0D652D; font-weight: bold; margin-bottom: 15px; font-size: 16px;">
                    Votre demande est en cours de traitement
                </div>
                <p style="color: #383838; font-size: 14px; margin-bottom: 20px; line-height: 1.6;">
                    Votre demande de stage a été prise en compte et est actuellement en cours 
                    d'examen par notre équipe.
                </p>
            </div>

            <div class="content-box">
                <div style="color: #0D652D; font-weight: bold; margin-bottom: 15px; font-size: 15px;">
                    Détails de votre demande
                </div>
                <table class="data-table">
                    <tr>
                        <th style="width: 140px;">Référence</th>
                        <td><strong>{demande.tracking_id}</strong></td>
                    </tr>
                    <tr>
                        <th>Date de soumission</th>
                        <td>{demande.date_soumission.strftime('%d/%m/%Y')}</td>
                    </tr>
                    <tr>
                        <th>Type de stage</th>
                        <td>{demande.type_stage}</td>
                    </tr>
                    <tr>
                        <th>Spécialité</th>
                        <td>{demande.etudiant_specialite}</td>
                    </tr>
                    <tr>
                        <th>Niveau d'étude</th>
                        <td>{demande.etudiant_niveau}</td>
                    </tr>
                </table>
            </div>

            <div class="content-box">
                <div style="color: #0D652D; font-weight: bold; margin-bottom: 15px; font-size: 15px;">
                    Prochaines étapes
                </div>
                <ul style="color: #383838; font-size: 14px; line-height: 1.6; padding-left: 20px;">
                    <li style="margin-bottom: 8px;">Notre équipe étudie actuellement votre profil</li>
                    <li style="margin-bottom: 8px;">Vous serez informé(e) par email de l'avancement</li>
                    <li style="margin-bottom: 8px;">La réponse définitive vous parviendra sous peu</li>
                </ul>
            </div>

            <div style="text-align: center; margin: 30px 0; padding: 25px;">
                <p style="color: #666666; font-size: 14px; margin: 0; line-height: 1.6; font-style: italic;">
                    Pensez à vérifier régulièrement votre boîte email.
                </p>
            </div>
        """
        
        subject = f"Votre demande de stage est en cours de traitement - {demande.tracking_id}"
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
        <div class="content-box">
            <div style="color: #0D652D; font-weight: bold; margin-bottom: 15px; font-size: 16px;">
                Information complémentaire nécessaire
            </div>
            <p style="color: #383838; font-size: 14px; margin-bottom: 20px; line-height: 1.6;">
                Dans le cadre de l'étude de votre candidature, nous avons besoin 
                d'informations complémentaires.
            </p>
        </div>

        <div class="content-box">
            <div style="color: #0D652D; font-weight: bold; margin-bottom: 15px; font-size: 15px;">
                Information demandée
            </div>
            <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #E8EAED;">
                {message}
            </div>
        </div>

        <div class="tracking-box">
            <div class="tracking-label">Numéro de suivi</div>
            <div class="tracking-id">{demande.tracking_id}</div>
        </div>

        <div class="content-box" style="border-left: 4px solid #17a2b8;">
            <div style="color: #0D652D; font-weight: bold; margin-bottom: 10px; font-size: 15px;">
                Délai de réponse
            </div>
            <p style="color: #383838; margin: 0; line-height: 1.6;">
                Merci de nous répondre dans les meilleurs délais afin de ne pas 
                retarder le traitement de votre candidature.
            </p>
        </div>

        <div style="text-align: center; margin: 30px 0; padding: 25px;">
            <p style="color: #666666; font-size: 14px; margin: 0; line-height: 1.6;">
                Vous pouvez accéder à votre espace de suivi à l'adresse suivante :<br>
                <a href="{suivi_url}" style="color: #0D652D; text-decoration: none;">
                    {suivi_url}
                </a>
            </p>
        </div>
        """
        
        subject = f"Demande d'information complémentaire - {demande.tracking_id}"
        greeting = f"Bonjour {demande.etudiant_prenom},"
        
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
        
        return f"""
        {subject}

        {greeting}

        {text}

        ---
        Service des Stages - CEB
        Email: stages@ceb.bj
        Téléphone: +229 21 30 05 06

        © {datetime.now().year} Communauté Électrique du Bénin
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
        cc: Optional[List[str]] = None 
    ) -> bool:
        """
        Envoie un email avec gestion asynchrone optionnelle
        
        Args:
            to_email: Email du destinataire
            subject: Sujet de l'email
            html_content: Contenu HTML
            text_content: Contenu texte
            async_send: Si True, envoi en arrière-plan
            reply_to: Adresses de réponse
            cc: Adresses en copie
        
        Returns:
            True si l'envoi a été initié avec succès
        """
        
        if reply_to is None:
            reply_to = ['stages@ceb.bj']
        
        def send_task():
            try:
                email = EmailMultiAlternatives(
                    subject=subject,
                    body=text_content,
                    from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@ceb.bj'),
                    to=[to_email],
                    reply_to=reply_to,
                    cc=cc
                )
                
                email.attach_alternative(html_content, "text/html")
                result = email.send(fail_silently=False)
                
                logger.info(f"✅ Email envoyé à {to_email} - Sujet: {subject[:50]}...")
                return True
                
            except Exception as e:
                logger.error(f"❌ Erreur envoi email à {to_email}: {e}")
                
                # Tentative de fallback en texte simple
                try:
                    from django.core.mail import send_mail
                    send_mail(
                        subject,
                        text_content,
                        getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@ceb.bj'),
                        [to_email],
                        fail_silently=False,
                    )
                    logger.info(f"✅ Email texte envoyé en fallback à {to_email}")
                    return True
                except Exception as fallback_error:
                    logger.error(f"❌ Erreur fallback: {fallback_error}")
                    return False
        
        if async_send:
            thread = threading.Thread(target=send_task, name=f"email-{to_email[:20]}")
            thread.daemon = True
            thread.start()
            return True
        else:
            return send_task()
    
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
    def send_acceptation(cls, stagiaire, demande, async_send: bool = True) -> bool:
        """Envoie l'email d'acceptation

        Args:
            stagiaire: Instance du stagiaire
            demande: Instance de la demande liée à l'acceptation
            async_send: Envoi asynchrone ou non
        """
        email_data = EmailContentService.demande_acceptee(stagiaire, demande)
        return cls.send_email(
            to_email=stagiaire.email,
            subject=email_data['subject'],
            html_content=email_data['html'],
            text_content=email_data['text'],
            async_send=async_send
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
            reply_to=['stages@ceb.bj']
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
            reply_to=['support@ceb.bj']
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
            reply_to=['securite@ceb.bj']
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
            reply_to=['stages@ceb.bj']
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