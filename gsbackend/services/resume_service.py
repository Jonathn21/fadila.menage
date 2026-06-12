"""
Service de génération de résumé CV
Fichier: resume_service.py
"""

import os
import time
import threading
import logging
import re
from django.conf import settings
from django.db import transaction
from django.utils.html import strip_tags

logger = logging.getLogger(__name__)


class ResumeGeneratorService:
    """Service pour générer des résumés de CV avec Gemini ou fallback local"""
    
    @staticmethod
    def format_sections_to_html(resume_text):
        """Convertit le markdown des sections en HTML (gras)"""
        if not resume_text:
            return ""
        
        # Remplacer **Section** : par <strong>Section</strong> :
        html_text = re.sub(
            r'\*\*(Profil|Formation|Compétences clés|Expérience|Atouts)\*\*\s*:',
            r'<strong>\1</strong> :',
            resume_text
        )
        
        # Pour les cas où il n'y a pas d'espace avant les deux points
        html_text = re.sub(
            r'\*\*(Profil|Formation|Compétences clés|Expérience|Atouts)\*\*:',
            r'<strong>\1</strong> :',
            html_text
        )
        
        # Pour les cas avec différents espaces
        html_text = re.sub(
            r'\*\*(Profil|Formation|Compétences clés|Expérience|Atouts)\*\*\s?:',
            r'<strong>\1</strong> :',
            html_text
        )
        
        # Convertir les sauts de ligne en <br> pour l'affichage HTML
        html_text = html_text.replace('\n\n', '<br><br>').replace('\n', '<br>')
        
        return html_text

    @staticmethod
    def format_sections_to_markdown(resume_text):
        """Convertit le HTML en markdown pour le stockage"""
        if not resume_text:
            return ""
        
        # Remplacer <strong>Section</strong> : par **Section** :
        markdown_text = re.sub(
            r'<strong>(Profil|Formation|Compétences clés|Expérience|Atouts)</strong>\s*:',
            r'**\1** :',
            resume_text
        )
        
        # Remplacer les <br> par des sauts de ligne
        markdown_text = markdown_text.replace('<br><br>', '\n\n').replace('<br>', '\n')
        
        # Nettoyer les autres balises HTML
        markdown_text = strip_tags(markdown_text)
        
        return markdown_text

    @staticmethod
    def validate_resume_structure(resume_text):
        """Valide que le résumé contient toutes les sections requises"""
        if not resume_text:
            return False, []
            
        # Vérifier les deux formats possibles : markdown (**Section**) ou HTML (<strong>Section</strong>)
        required_sections_markdown = [
            "**Profil** :",
            "**Formation** :", 
            "**Compétences clés** :",
            "**Expérience** :",
            "**Atouts** :"
        ]
        
        required_sections_html = [
            "<strong>Profil</strong> :",
            "<strong>Formation</strong> :",
            "<strong>Compétences clés</strong> :",
            "<strong>Expérience</strong> :",
            "<strong>Atouts</strong> :"
        ]
        
        missing_sections = []
        
        # Vérifier d'abord en markdown
        for section in required_sections_markdown:
            section_name = section.replace(" :", "").replace("**", "")
            if section not in resume_text:
                # Vérifier en HTML
                html_section = f"<strong>{section_name}</strong> :"
                if html_section not in resume_text:
                    missing_sections.append(section_name)
        
        return len(missing_sections) == 0, missing_sections

    @staticmethod
    def generate_resume_async(demande_id):
        """Lance la génération de résumé en arrière-plan"""
        
        def generate_task():
            # Petit délai pour s'assurer que le fichier est sauvegardé
            time.sleep(2)
            
            try:
                # Importer au début de la fonction pour éviter les problèmes circulaires
                from django.db import transaction
                from stages.models import Demande
                
                logger.info(f"🔄 Début génération résumé asynchrone pour demande {demande_id}")
                
                # Utiliser une transaction pour garantir la sauvegarde
                with transaction.atomic():
                    demande = Demande.objects.select_for_update().get(id=demande_id)
                    
                    if demande.cv and (not demande.resume_cv or 
                                      "temporairement indisponible" in demande.resume_cv.lower() or 
                                      "fallback" in demande.resume_cv.lower()):
                        logger.info(f"📂 Chemin CV : {demande.cv.path}")
                        
                        cv_path = demande.cv.path
                        resume_text = ResumeGeneratorService.extract_text(cv_path)
                        
                        if resume_text and len(resume_text.strip()) > 50:
                            logger.info(f"📝 Texte extrait : {len(resume_text)} caractères")
                            
                            resume = ResumeGeneratorService.generate_resume_with_gemini(resume_text)
                            
                            # Validation du résumé généré
                            is_valid, missing = ResumeGeneratorService.validate_resume_structure(resume)
                            if not is_valid:
                                logger.warning(f"⚠️ Résumé incomplet. Sections manquantes: {missing}")
                                fallback_resume = ResumeGeneratorService.generate_fallback_resume(resume_text)
                                # Convertir en HTML pour l'affichage
                                demande.resume_cv = ResumeGeneratorService.format_sections_to_html(fallback_resume)
                                logger.info(f"✅ Fallback appliqué pour sections manquantes")
                            else:
                                # Convertir en HTML pour l'affichage
                                demande.resume_cv = ResumeGeneratorService.format_sections_to_html(resume)
                                logger.info(f"✅ Résumé généré avec succès pour demande {demande_id}")
                        else:
                            logger.warning(f"⚠️ Texte CV insuffisant pour demande {demande_id}")
                            fallback_resume = ResumeGeneratorService.generate_fallback_resume(
                                resume_text if resume_text else "CV non analysable"
                            )
                            # Convertir en HTML pour l'affichage
                            demande.resume_cv = ResumeGeneratorService.format_sections_to_html(fallback_resume)
                            logger.info(f"✅ Fallback généré pour demande {demande_id}")
                        
                        # Sauvegarde explicite dans la transaction
                        demande.save(update_fields=["resume_cv"])
                        logger.info(f"💾 Résumé SAUVEGARDÉ en base de données")
                        
                        # Vérification
                        demande_refresh = Demande.objects.get(id=demande_id)
                        logger.info(f"🔍 VÉRIFICATION: resume_cv présent = {bool(demande_refresh.resume_cv)}")
                            
            except Exception as e:
                logger.error(f"❌ Erreur génération résumé asynchrone: {e}")
                import traceback
                traceback.print_exc()
                
                # Fallback garanti
                try:
                    from stages.models import Demande
                    demande = Demande.objects.get(id=demande_id)
                    fallback_resume = ResumeGeneratorService.generate_fallback_resume(
                        "Erreur lors de l'analyse"
                    )
                    # Convertir en HTML pour l'affichage
                    demande.resume_cv = ResumeGeneratorService.format_sections_to_html(fallback_resume)
                    demande.save(update_fields=["resume_cv"])
                    logger.info("🆘 Fallback d'urgence appliqué")
                except Exception as fallback_error:
                    logger.error(f"💥 Même le fallback a échoué: {fallback_error}")
        
        # Lancer dans un thread séparé
        thread = threading.Thread(target=generate_task)
        thread.daemon = True
        thread.start()

    @staticmethod
    def regenerate_resume_sync(demande):
        """Régénère le résumé CV de façon SYNCHRONE et FORCÉE.

        Contrairement à generate_resume_async, on régénère toujours (même si un
        résumé existe déjà), ce qui permet de réparer un résumé cassé suite à un
        souci avec la clé API Gemini. Retourne (resume_html, source) où source
        vaut "gemini" ou "fallback". Lève une exception si le CV est absent ou
        illisible.
        """
        if not demande.cv:
            raise ValueError("Aucun CV n'est associé à cette demande.")

        cv_path = demande.cv.path
        resume_text = ResumeGeneratorService.extract_text(cv_path)

        if not resume_text or len(resume_text.strip()) <= 50:
            raise ValueError("Le contenu du CV est insuffisant ou illisible.")

        source = "gemini"
        resume = ResumeGeneratorService.generate_resume_with_gemini(resume_text)
        is_valid, missing = ResumeGeneratorService.validate_resume_structure(resume)
        if not is_valid:
            logger.warning(f"⚠️ Résumé régénéré incomplet (sections: {missing}), fallback appliqué")
            resume = ResumeGeneratorService.generate_fallback_resume(resume_text)
            source = "fallback"

        resume_html = ResumeGeneratorService.format_sections_to_html(resume)
        demande.resume_cv = resume_html
        demande.save(update_fields=["resume_cv"])
        logger.info(f"💾 Résumé régénéré ({source}) et sauvegardé pour demande {demande.id}")
        return resume_html, source

    @staticmethod
    def extract_text(file_path):
        """Extrait le texte d'un PDF ou image"""
        logger.info(f"📄 Extraction de texte depuis : {file_path}")
        
        if not os.path.exists(file_path):
            logger.error("❌ Fichier introuvable")
            return ""
            
        ext = os.path.splitext(file_path)[1].lower()
        text = ""
        
        try:
            if ext == ".pdf":
                logger.info("🔍 Type : PDF détecté")
                
                # Méthode 1 : pdfplumber (meilleure qualité)
                try:
                    import pdfplumber
                    logger.debug("Tentative avec pdfplumber...")
                    with pdfplumber.open(file_path) as pdf:
                        for page_num, page in enumerate(pdf.pages, 1):
                            page_text = page.extract_text()
                            if page_text:
                                text += page_text + "\n"
                                logger.debug(f"Page {page_num}/{len(pdf.pages)} : {len(page_text)} car.")
                    
                    if text.strip():
                        logger.info(f"✅ pdfplumber réussi : {len(text)} caractères")
                        return text.strip()
                    else:
                        raise ValueError("PDF sans texte extractible")
                        
                except Exception as e:
                    logger.warning(f"pdfplumber échoué : {e}")
                    
                    # Méthode 2 : PyPDF2 (fallback)
                    try:
                        import PyPDF2
                        logger.debug("Tentative avec PyPDF2...")
                        with open(file_path, 'rb') as file:
                            pdf_reader = PyPDF2.PdfReader(file)
                            for page_num, page in enumerate(pdf_reader.pages, 1):
                                page_text = page.extract_text()
                                text += page_text + "\n"
                                logger.debug(f"Page {page_num}/{len(pdf_reader.pages)}")
                        
                        if text.strip():
                            logger.info(f"✅ PyPDF2 réussi : {len(text)} caractères")
                            return text.strip()
                        else:
                            raise ValueError("PDF scanné, besoin d'OCR")
                            
                    except Exception as e2:
                        logger.warning(f"PyPDF2 échoué : {e2}")
                        
                        # Méthode 3 : OCR (dernier recours)
                        try:
                            from pdf2image import convert_from_path
                            import pytesseract
                            
                            logger.debug("🔄 Conversion PDF → Images pour OCR...")
                            
                            # Vérifier si POPPLER_PATH existe
                            POPPLER_PATH = os.getenv('POPPLER_PATH', r'C:\poppler\Library\bin')
                            
                            if os.path.exists(POPPLER_PATH):
                                images = convert_from_path(file_path, dpi=200, poppler_path=POPPLER_PATH)
                            else:
                                logger.warning("Poppler non trouvé au chemin configuré, tentative sans chemin...")
                                images = convert_from_path(file_path, dpi=200)
                            
                            for i, img in enumerate(images, 1):
                                logger.debug(f"🖼️ OCR Page {i}/{len(images)}...")
                                page_text = pytesseract.image_to_string(img, lang='fra+eng')
                                text += page_text + "\n"
                            
                            if text.strip():
                                logger.info(f"✅ OCR réussi : {len(text)} caractères")
                                return text.strip()
                            else:
                                raise ValueError("OCR n'a rien extrait")
                                
                        except Exception as e3:
                            logger.error(f"OCR échoué : {e3}")
                            return ""
                        
            elif ext in [".jpg", ".jpeg", ".png", ".bmp", ".tiff"]:
                logger.info("🖼️ Type : Image détectée")
                try:
                    from PIL import Image
                    import pytesseract
                    
                    image = Image.open(file_path)
                    text = pytesseract.image_to_string(image, lang='fra+eng')
                    if text.strip():
                        logger.info(f"✅ OCR réussi : {len(text)} caractères")
                        return text.strip()
                    else:
                        logger.warning("OCR n'a rien extrait")
                        return ""
                except Exception as e:
                    logger.error(f"Erreur OCR image: {e}")
                    return ""
                
        except Exception as e:
            logger.error(f"❌ Erreur globale extraction: {type(e).__name__} - {str(e)}")
            return ""
        
        return text.strip()

    @staticmethod
    def generate_resume_with_gemini(cv_text):
        """Génère un résumé CV via Gemini avec prompt optimisé"""
        
        logger.info("🤖 Génération avec Gemini")
        
        # Validation de l'entrée
        if not cv_text or len(cv_text.strip()) < 50:
            logger.warning("⚠️ Texte CV trop court ou vide")
            return "**Profil** : Résumé non disponible : contenu du CV insuffisant."
        
        # Tronquer si trop long
        original_length = len(cv_text)
        if len(cv_text) > 15000:
            cv_text = cv_text[:15000]
            logger.info(f"✂️ Texte CV tronqué de {original_length} à 15000 caractères")
        
        prompt = f"""Tu es un expert en recrutement et analyse de CV. Analyse ce CV et génère DIRECTEMENT un résumé professionnel structuré.

CV À ANALYSER :
{cv_text}

INSTRUCTIONS CRITIQUES :
- Commence DIRECTEMENT par "**Profil** :" sans aucun préambule
- N'écris JAMAIS "Voici le résumé", "Voici l'analyse", "Résumé professionnel", etc.
- Réponds UNIQUEMENT avec le contenu structuré ci-dessous
- AUCUN texte avant ou après la structure
- **INCLUS TOUTES LES 5 SECTIONS** (Profil, Formation, Compétences clés, Expérience, Atouts)
- Utilise EXACTEMENT cette syntaxe avec ** en gras pour les titres de section

STRUCTURE OBLIGATOIRE COMPLÈTE (commence immédiatement par cette structure et inclus les 5 sections) :

**Profil** : [1-2 phrases décrivant le niveau d'études, la spécialisation et l'objectif professionnel]

**Formation** : [Diplôme le plus récent/pertinent + établissement si prestigieux, année si récente]

**Compétences clés** : [5-8 compétences techniques et transversales les plus pertinentes, séparées par des virgules]

**Expérience** : [Résumé en 2-3 phrases des expériences professionnelles/stages les plus significatifs avec leurs apports]

**Atouts** : [2-3 points distinctifs : langues, certifications, projets remarquables, soft skills]

RÈGLE ABSOLUE : Tu dois générer EXACTEMENT ces 5 sections dans cet ordre. Ne saute aucune section.

STYLE :
- Langage professionnel mais accessible
- Phrases courtes et dynamiques
- Vocabulaire adapté au secteur d'activité détecté
- Réalisations concrètes et quantifiables
- Ton valorisant sans exagération

CONTENU À PRIVILÉGIER :
- Formations certifiantes et diplômes reconnus
- Compétences techniques demandées sur le marché
- Expériences avec résultats mesurables
- Langues étrangères (niveau précis si indiqué)
- Outils maîtrisés et certifications
- Projets personnels ou académiques pertinents

À ÉVITER :
- Informations personnelles sensibles
- Répétitions et redondances
- Jargon trop technique sans contexte
- Descriptions vagues type "motivé" sans preuve
- Plus de 250 mots au total

LONGUEUR : 200-250 mots maximum

ADAPTATION SECTORIELLE : Identifie le domaine (IT, ingénierie, commerce, santé, finance, etc.) et adapte le vocabulaire et les compétences.

RAPPEL FINAL IMPORTANT : 
1. Commence IMMÉDIATEMENT par "**Profil** :" 
2. Inclus les 5 sections exactement comme dans la structure avec ** pour le gras
3. Pas de texte avant ou après
4. Sections obligatoires : Profil, Formation, Compétences clés, Expérience, Atouts"""

        try:
            import google.generativeai as genai
            
            # Récupérer les modèles disponibles depuis les settings
            GEMINI_AVAILABLE_MODELS = getattr(settings, 'GEMINI_AVAILABLE_MODELS', [])
            
            priority_models = [
                "models/gemini-2.0-flash",
                "models/gemini-2.0-flash-001",
                "models/gemini-2.5-flash",
                "models/gemini-flash-latest",
                "models/gemini-pro-latest",
                "models/gemini-2.0-flash-lite",
            ]
            
            # Filtrer pour n'utiliser que les modèles disponibles
            available_models = [model for model in priority_models if model in GEMINI_AVAILABLE_MODELS]
            
            if not available_models:
                logger.warning("⚠️ Aucun modèle prioritaire disponible")
                available_models = GEMINI_AVAILABLE_MODELS[:5] if GEMINI_AVAILABLE_MODELS else []
            
            if not available_models:
                logger.error("❌ Aucun modèle Gemini disponible")
                return ResumeGeneratorService.generate_fallback_resume(cv_text)
            
            logger.info(f"📋 Modèles à essayer: {available_models}")
            
            for model_name in available_models:
                try:
                    logger.debug(f"🔄 Tentative avec {model_name}...")
                    model = genai.GenerativeModel(model_name)
                    
                    response = model.generate_content(
                        prompt,
                        generation_config=genai.types.GenerationConfig(
                            temperature=0.5,  # Équilibré pour être créatif mais structuré
                            max_output_tokens=1500,  # Assez d'espace pour 5 sections
                            top_p=0.85,
                            top_k=40,
                        )
                    )
                    
                    if response.text:
                        resume = response.text.strip()
                        
                        # Valider la structure immédiatement
                        is_valid, missing = ResumeGeneratorService.validate_resume_structure(resume)
                        
                        if not is_valid:
                            logger.warning(f"⚠️ {model_name} : résumé incomplet. Sections manquantes: {missing}")
                            
                            # Tentative de régénération avec prompt plus strict
                            retry_prompt = f"""Le résumé précédent était incomplet. 
                            RÈGLE STRICTEMENT OBLIGATOIRE : 
                            - Tu DOIS inclure TOUTES ces 5 sections exactement comme ceci avec ** pour le gras :
                            1. **Profil** : [contenu]
                            2. **Formation** : [contenu]
                            3. **Compétences clés** : [contenu]
                            4. **Expérience** : [contenu]
                            5. **Atouts** : [contenu]
                            
                            CV original : {cv_text[:3000]}
                            
                            Génère le résumé complet maintenant en incluant les 5 sections avec **Profil** : au début :"""
                            
                            try:
                                retry_response = model.generate_content(
                                    retry_prompt,
                                    generation_config=genai.types.GenerationConfig(
                                        temperature=0.3,  # Plus strict
                                        max_output_tokens=1500,
                                        top_p=0.8,
                                        top_k=30,
                                    )
                                )
                                
                                if retry_response.text:
                                    resume = retry_response.text.strip()
                                    is_valid, missing = ResumeGeneratorService.validate_resume_structure(resume)
                                    
                                    if not is_valid:
                                        logger.error(f"⚠️ {model_name} : Échec après retry. Pass au modèle suivant")
                                        continue  # Essaye le modèle suivant
                            except Exception as retry_error:
                                logger.warning(f"⚠️ Retry échoué pour {model_name}: {retry_error}")
                                continue  # Essaye le modèle suivant
                        
                        logger.info(f"✅ Résumé généré avec {model_name} ({len(resume)} caractères)")
                        return resume
                    else:
                        logger.warning(f"⚠️ {model_name} : réponse vide")
                        continue
                        
                except Exception as model_error:
                    logger.warning(f"❌ {model_name} échoué: {str(model_error)[:100]}...")
                    continue
            
            # Si tous les modèles échouent
            logger.error("❌ Tous les modèles Gemini ont échoué ou produit des résumés incomplets")
            return ResumeGeneratorService.generate_fallback_resume(cv_text)
            
        except Exception as e:
            logger.error(f"❌ Erreur Gemini: {e}")
            import traceback
            traceback.print_exc()
            return ResumeGeneratorService.generate_fallback_resume(cv_text)

    @staticmethod
    def generate_fallback_resume(cv_text):
        """Génère un résumé basique sans Gemini - Compatible tous domaines"""
        logger.info("🔄 Génération de fallback local multi-domaines")
        
        if not cv_text or len(cv_text.strip()) < 50:
            # Retourner directement en HTML pour l'affichage
            return """<strong>Profil</strong> : Candidat dont le CV nécessite une analyse manuelle<br><br>
<strong>Formation</strong> : Information à extraire du CV<br><br>
<strong>Compétences clés</strong> : Compétences techniques et professionnelles variées<br><br>
<strong>Expérience</strong> : Parcours professionnel détaillé dans le CV<br><br>
<strong>Atouts</strong> : Profil motivé avec compétences adaptables<br><br>
<em>Note : Résumé généré automatiquement. Consultez le CV complet pour plus de détails.</em>"""
        
        # Extraire les informations basiques du texte
        lines = [line.strip() for line in cv_text.split('\n') if line.strip()]
        competences = []
        formation = []
        experiences = []
        langues = []
        
        # === MOTS-CLÉS GÉNÉRIQUES (TOUS DOMAINES) ===
        
        # Compétences techniques (IT, Engineering, Design, etc.)
        tech_keywords = ['python', 'django', 'javascript', 'html', 'css', 'java', 'c++', 'react', 'node', 'sql', 
                         'mongodb', 'mysql', 'postgresql', 'git', 'linux', 'windows', 'api', 'rest', 'docker',
                         'odoo', 'tailwind', 'bootstrap', 'vue', 'angular', 'typescript', 'php', 'symfony',
                         'autocad', 'solidworks', 'catia', 'matlab', 'excel', 'powerpoint', 'word', 'photoshop',
                         'illustrator', 'indesign', 'figma', 'canva', 'premiere', 'after effects']
        
        # Compétences professionnelles (Business, Management, Soft Skills)
        soft_keywords = ['gestion', 'management', 'leadership', 'communication', 'organisation', 'planification',
                         'négociation', 'analyse', 'comptabilité', 'finance', 'marketing', 'vente', 'commercial',
                         'rédaction', 'reporting', 'budgétaire', 'stratégie', 'ressources humaines', 'rh',
                         'juridique', 'audit', 'contrôle', 'qualité', 'logistique', 'approvisionnement']
        
        # Compétences scientifiques/médicales
        science_keywords = ['biologie', 'chimie', 'physique', 'mathématiques', 'laboratoire', 'recherche',
                           'expérimentation', 'diagnostic', 'soins', 'médical', 'pharmaceutique', 'clinique',
                           'anatomie', 'physiologie', 'microbiologie', 'génétique', 'environnement']
        
        # Formation et diplômes
        formation_keywords = ['bac', 'baccalauréat', 'licence', 'master', 'bts', 'dut', 'ingénieur', 'université', 
                             'école', 'diplôme', 'formation', 'étudiant', 'étudiante', 'bachelor', 'doctorat', 
                             'mastère', 'certification', 'titre', 'dea', 'dess', 'mba', 'ens', 'iut', 'fac',
                             'faculté', 'institut', 'académie', 'collège', 'campus']
        
        # Expériences professionnelles
        experience_keywords = ['stage', 'expérience', 'projet', 'emploi', 'travail', 'professionnel', 'professionnelle',
                              'entreprise', 'mission', 'responsabilité', 'poste', 'contrat', 'cdd', 'cdi',
                              'alternance', 'apprentissage', 'intérim', 'consultant', 'freelance', 'bénévolat',
                              'association', 'ong', 'volontariat', 'service civique']
        
        # Langues
        langue_keywords = ['français', 'anglais', 'espagnol', 'allemand', 'arabe', 'chinois', 'italien', 
                          'portugais', 'russe', 'japonais', 'langue', 'bilingue', 'trilingue', 'natif',
                          'courant', 'intermédiaire', 'débutant', 'toefl', 'toeic', 'delf', 'dalf']
        
        # Profils professionnels (détection automatique du domaine)
        profil_keywords = {
            'informatique': ['développeur', 'programmeur', 'informaticien', 'data', 'web', 'software', 'devops', 'it', 'informatique', 'développement'],
            'ingénierie': ['ingénieur', 'ingénieure', 'technicien', 'technique', 'génie', 'mécanique', 'électrique', 'civil', 'ingénierie'],
            'business': ['commercial', 'manager', 'gestionnaire', 'consultant', 'chef de projet', 'responsable', 'directeur', 'business', 'commerce'],
            'santé': ['médecin', 'infirmier', 'pharmacien', 'sage-femme', 'kinésithérapeute', 'dentiste', 'vétérinaire', 'santé', 'médical'],
            'finance': ['comptable', 'financier', 'auditeur', 'contrôleur', 'analyste financier', 'trésorier', 'finance', 'comptabilité'],
            'design': ['designer', 'graphiste', 'architecte', 'créatif', 'ux', 'ui', 'artistique', 'design'],
            'communication': ['communicant', 'journaliste', 'rédacteur', 'chargé de communication', 'relations publiques', 'communication'],
            'éducation': ['enseignant', 'professeur', 'formateur', 'éducateur', 'pédagogue', 'instituteur', 'éducation', 'enseignement'],
            'juridique': ['avocat', 'juriste', 'notaire', 'magistrat', 'légal', 'droit', 'juridique'],
            'sciences': ['chercheur', 'scientifique', 'biologiste', 'chimiste', 'physicien', 'laborantin', 'science', 'recherche']
        }
        
        # === ANALYSE DU TEXTE ===
        domaine_detecte = 'général'
        
        for line in lines:
            line_lower = line.lower()
            line_clean = line.strip()
            
            # Détection du domaine professionnel
            if domaine_detecte == 'général':
                for domaine, keywords in profil_keywords.items():
                    if any(keyword in line_lower for keyword in keywords):
                        domaine_detecte = domaine
                        logger.debug(f"Domaine détecté: {domaine_detecte}")
                        break
            
            # Détection des compétences (tous types)
            all_competence_keywords = tech_keywords + soft_keywords + science_keywords
            if any(keyword in line_lower for keyword in all_competence_keywords):
                if line_clean not in competences and 5 < len(line_clean) < 100:
                    competences.append(line_clean)
            
            # Détection de formation
            if any(keyword in line_lower for keyword in formation_keywords):
                if line_clean not in formation and 10 < len(line_clean) < 150:
                    formation.append(line_clean)
            
            # Détection d'expérience
            if any(keyword in line_lower for keyword in experience_keywords):
                if line_clean not in experiences and 15 < len(line_clean) < 200:
                    experiences.append(line_clean)
            
            # Détection des langues
            if any(keyword in line_lower for keyword in langue_keywords):
                if line_clean not in langues and 5 < len(line_clean) < 80:
                    langues.append(line_clean)
        
        # === CONSTRUCTION DU RÉSUMÉ EN HTML ===
        resume_parts = []
        
        # 1. PROFIL
        profile_found = False
        for line in lines[:10]:
            line_lower = line.lower()
            if any(keyword in line_lower for keyword in ['ingénieur', 'développeur', 'manager', 'consultant', 
                                                           'technicien', 'étudiant', 'master', 'licence', 'chef',
                                                           'responsable', 'assistant', 'analyste', 'spécialiste',
                                                           'informaticien', 'professeur', 'enseignant', 'commercial']):
                resume_parts.append(f"<strong>Profil</strong> : {line.strip()}")
                profile_found = True
                break
        
        if not profile_found and formation:
            first_formation = formation[0].replace('•', '').replace('-', '').strip()[:80]
            resume_parts.append(f"<strong>Profil</strong> : Candidat avec formation en {first_formation}")
        elif not profile_found:
            domaine_label = {
                'informatique': 'Profil en développement informatique et technologies digitales',
                'ingénierie': 'Profil ingénierie avec expertise technique',
                'business': 'Profil management et gestion d\'entreprise',
                'santé': 'Profil spécialisé dans le secteur de la santé',
                'finance': 'Profil finance, comptabilité et gestion budgétaire',
                'design': 'Profil créatif spécialisé en design et création',
                'communication': 'Profil communication et relations publiques',
                'éducation': 'Profil enseignement et formation',
                'juridique': 'Profil juridique et droit',
                'sciences': 'Profil scientifique et recherche',
                'général': 'Profil professionnel polyvalent'
            }
            resume_parts.append(f"<strong>Profil</strong> : {domaine_label.get(domaine_detecte, 'Profil professionnel polyvalent')}")
        
        # 2. FORMATION
        if formation:
            formation_clean = []
            for f in formation[:2]:
                clean_f = f.replace('•', '').replace('-', '').strip()
                if clean_f and 10 < len(clean_f) < 120:
                    formation_clean.append(clean_f)
            
            if formation_clean:
                resume_parts.append(f"<strong>Formation</strong> : {' | '.join(formation_clean)}")
            else:
                resume_parts.append("<strong>Formation</strong> : Parcours académique détaillé dans le CV")
        else:
            # Chercher dans les premières lignes
            for line in lines[:20]:
                if any(word in line.lower() for word in ['licence', 'master', 'bts', 'dut', 'diplôme', 'école', 'université']):
                    if len(line) > 20 and len(line) < 120:
                        resume_parts.append(f"<strong>Formation</strong> : {line.strip()}")
                        break
            else:
                resume_parts.append("<strong>Formation</strong> : Formation académique spécifiée dans le CV")
        
        # 3. COMPÉTENCES
        if competences:
            clean_competences = []
            for comp in competences[:10]:  # Prendre plus au début
                clean_comp = comp.replace('+', '').replace('•', '').replace('-', '').replace(':', '').strip()
                # Nettoyer davantage
                clean_comp = ' '.join(clean_comp.split())  # Enlever espaces multiples
                if clean_comp and 3 < len(clean_comp) < 60 and clean_comp.lower() not in ['compétences', 'skills', 'aptitudes']:
                    clean_competences.append(clean_comp)
            
            # Si toujours pas de compétences, chercher des mots-clés techniques
            if not clean_competences:
                for line in lines:
                    line_lower = line.lower()
                    for keyword in tech_keywords + soft_keywords:
                        if keyword in line_lower:
                            # Extraire le contexte autour du mot-clé
                            clean_competences.append(keyword.capitalize())
                            if len(clean_competences) >= 5:
                                break
                    if len(clean_competences) >= 5:
                        break
            
            if clean_competences:
                # Prendre 5-8 compétences uniques
                unique_competences = []
                for comp in clean_competences:
                    if comp not in unique_competences:
                        unique_competences.append(comp)
                    if len(unique_competences) >= 8:
                        break
                
                resume_parts.append(f"<strong>Compétences clés</strong> : {', '.join(unique_competences[:8])}")
            else:
                resume_parts.append("<strong>Compétences clés</strong> : Compétences techniques et professionnelles variées")
        else:
            resume_parts.append("<strong>Compétences clés</strong> : Ensemble de compétences détaillées dans le CV")
        
        # 4. EXPÉRIENCE
        if experiences:
            # Prendre la première expérience significative
            exp_main = None
            for exp in experiences:
                clean_exp = exp.replace('•', '').replace('-', '').strip()
                if len(clean_exp) > 20 and len(clean_exp) < 150:
                    exp_main = clean_exp
                    break
            
            if exp_main:
                resume_parts.append(f"<strong>Expérience</strong> : {exp_main}")
                if len(experiences) > 1:
                    resume_parts[-1] += f" | {len(experiences)-1} autre(s) expérience(s)"
            else:
                resume_parts.append("<strong>Expérience</strong> : Expériences professionnelles détaillées dans le CV")
        else:
            # Chercher des indices d'expérience dans les premières lignes
            for line in lines[:15]:
                if any(word in line.lower() for word in ['expérience', 'stage', 'emploi', 'travail', 'entreprise', 'mission']):
                    if 20 < len(line) < 120:
                        resume_parts.append(f"<strong>Expérience</strong> : {line.strip()}")
                        break
            else:
                resume_parts.append("<strong>Expérience</strong> : Expériences professionnelles et projets détaillés dans le CV")
        
        # 5. ATOUTS
        atouts = []
        if langues:
            langues_clean = []
            for l in langues[:3]:
                clean_l = l.replace('•', '').replace('-', '').replace('langues', '').replace('langue', '').strip()
                if clean_l and len(clean_l) < 50:
                    langues_clean.append(clean_l)
            
            if langues_clean:
                atouts.append(f"Langues : {', '.join(langues_clean)}")
        
        if len(competences) > 5:
            atouts.append("Large palette de compétences techniques")
        
        if len(experiences) > 2:
            atouts.append("Expérience professionnelle diversifiée")
        
        if domaine_detecte != 'général':
            atouts.append(f"Spécialisation {domaine_detecte}")
        
        if not atouts:
            # Atouts par défaut selon le domaine
            default_atouts = {
                'informatique': "Capacité d'adaptation aux nouvelles technologies",
                'ingénierie': "Résolution de problèmes techniques complexes",
                'business': "Sens de la stratégie et du développement commercial",
                'santé': "Rigueur scientifique et sens du service",
                'finance': "Précision analytique et gestion rigoureuse",
                'design': "Créativité et sens de l'esthétique",
                'communication': "Aisance relationnelle et rédactionnelle",
                'éducation': "Pédagogie et transmission du savoir",
                'juridique': "Rigueur juridique et analyse critique",
                'sciences': "Curiosité scientifique et méthode rigoureuse",
                'général': "Adaptabilité et polyvalence professionnelle"
            }
            atouts.append(default_atouts.get(domaine_detecte, "Profil motivé avec compétences adaptées au marché"))
        
        resume_parts.append(f"<strong>Atouts</strong> : {' • '.join(atouts[:3])}")
        
        resume = "<br><br>".join(resume_parts)
        
        # Ajouter une note sur le fallback
        resume += "<br><br><em>Note : Résumé généré automatiquement. Consultez le CV complet pour plus de détails.</em>"
        
        logger.info(f"✅ Fallback HTML généré ({len(resume)} caractères) - Domaine: {domaine_detecte}")
        return resume

    @staticmethod
    def debug_resume_generation(cv_text):
        """Méthode de débogage pour tester la génération"""
        logger.info("🐛 Mode debug activé")
        
        # Test Gemini
        gemini_result = ResumeGeneratorService.generate_resume_with_gemini(cv_text)
        gemini_valid, gemini_missing = ResumeGeneratorService.validate_resume_structure(gemini_result)
        
        # Test Fallback
        fallback_result = ResumeGeneratorService.generate_fallback_resume(cv_text)
        fallback_valid, fallback_missing = ResumeGeneratorService.validate_resume_structure(fallback_result)
        
        debug_info = f"""
=== DÉBOGAGE GÉNÉRATION RÉSUMÉ ===
Longueur CV texte : {len(cv_text)} caractères
Premiers 500 caractères : {cv_text[:500]}...

--- RÉSULTAT GEMINI ---
Valide : {gemini_valid}
Sections manquantes : {gemini_missing}
Longueur : {len(gemini_result)} caractères
Contenu :
{gemini_result}

--- RÉSULTAT FALLBACK ---
Valide : {fallback_valid}
Sections manquantes : {fallback_missing}
Longueur : {len(fallback_result)} caractères
Contenu :
{fallback_result}
=== FIN DÉBOGAGE ===
"""
        logger.info(debug_info)
        
        # Retourner le meilleur résultat (converti en HTML)
        if gemini_valid and len(gemini_result) > 100:
            return ResumeGeneratorService.format_sections_to_html(gemini_result)
        else:
            return fallback_result  # Déjà en HTML