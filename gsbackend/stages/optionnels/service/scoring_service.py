# services/scoring_service.py
import google.generativeai as genai
import json
from typing import Dict, Tuple

class ScoringService:
    """Service pour scorer les candidatures avec Gemini"""
    
    @staticmethod
    def calculer_score_candidature(demande) -> Tuple[int, Dict, str]:
        """
        Calcule le score IA d'une candidature
        Returns: (score_total, details, commentaire)
        """
        
        # 1. Construire le contexte de la candidature
        contexte = ScoringService._construire_contexte(demande)
        
        # 2. Prompt pour Gemini
        prompt = f"""
Tu es un expert RH de la Communauté Électrique du Bénin (CEB).
Analyse cette candidature de stage et donne un score détaillé de 0 à 100.

CONTEXTE DE LA CANDIDATURE:
{contexte}

CRITÈRES D'ÉVALUATION (total 100 points):
1. Adéquation profil (30 pts) : Compétences techniques vs besoins CEB
2. Qualité du CV (25 pts) : Structure, clarté, professionnalisme
3. Expérience pertinente (20 pts) : Stages/projets dans le domaine
4. Motivation apparente (15 pts) : Cohérence du parcours
5. Potentiel d'évolution (10 pts) : Trajectoire académique

BESOINS PRIORITAIRES CEB 2025:
- Informatique : Python, Django, JavaScript, React, bases de données
- Électricité : Maintenance réseau, SCADA, protection électrique
- Comptabilité : SAP, Excel avancé, normes OHADA
- RH : Gestion administrative, paie, recrutement

INSTRUCTIONS:
1. Analyse objective et professionnelle
2. Sois critique mais constructif
3. Valorise les points forts concrets
4. Identifie les axes d'amélioration

RÉPONSE ATTENDUE (FORMAT JSON STRICT):
{{
  "score_total": 75,
  "criteres": {{
    "adequation_profil": {{"score": 25, "justification": "Compétences Python et Django solides"}},
    "qualite_cv": {{"score": 20, "justification": "CV bien structuré, clair et professionnel"}},
    "experience": {{"score": 15, "justification": "2 stages précédents pertinents"}},
    "motivation": {{"score": 10, "justification": "Parcours cohérent en informatique"}},
    "potentiel": {{"score": 5, "justification": "Licence en cours, bonne progression"}}
  }},
  "commentaire_global": "Candidat solide avec compétences techniques adaptées. Points forts: Python/Django. À améliorer: expérience gestion de projet.",
  "points_forts": ["Compétences techniques", "CV professionnel"],
  "points_amelioration": ["Expérience limitée", "Manque projets d'envergure"],
  "recommandation": "ACCEPTER",
  "niveau_priorite": "MOYEN"
}}

Analyse maintenant la candidature ci-dessus.
"""
        
        try:
            # 3. Appeler Gemini
            model = genai.GenerativeModel('gemini-2.0-flash')
            response = model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.3,  # Plus déterministe pour le scoring
                    max_output_tokens=1000,
                )
            )
            
            # 4. Parser la réponse JSON
            result_text = response.text.strip()
            
            # Nettoyer les balises markdown si présentes
            if result_text.startswith("```json"):
                result_text = result_text.replace("```json", "").replace("```", "").strip()
            elif result_text.startswith("```"):
                result_text = result_text.replace("```", "").strip()
            
            result = json.loads(result_text)
            
            score_total = result.get('score_total', 0)
            details = result.get('criteres', {})
            commentaire = result.get('commentaire_global', '')
            
            # Ajouter métadonnées
            details['meta'] = {
                'points_forts': result.get('points_forts', []),
                'points_amelioration': result.get('points_amelioration', []),
                'recommandation': result.get('recommandation', 'À ÉVALUER'),
                'niveau_priorite': result.get('niveau_priorite', 'MOYEN')
            }
            
            return score_total, details, commentaire
            
        except json.JSONDecodeError as e:
            print(f"❌ Erreur parsing JSON: {e}")
            print(f"Réponse brute: {response.text}")
            return ScoringService._fallback_scoring(demande)
            
        except Exception as e:
            print(f"❌ Erreur scoring IA: {e}")
            return ScoringService._fallback_scoring(demande)
    
    @staticmethod
    def _construire_contexte(demande) -> str:
        """Construit le contexte de la candidature pour Gemini"""
        
        contexte_parts = []
        
        # Informations de base
        contexte_parts.append(f"CANDIDAT: {demande.etudiant_prenom} {demande.etudiant_nom}")
        contexte_parts.append(f"Genre: {demande.genre}")
        contexte_parts.append(f"Niveau d'étude: {demande.etudiant_niveau}")
        contexte_parts.append(f"Spécialité: {demande.etudiant_specialite}")
        contexte_parts.append(f"Type de stage: {demande.type_stage}")
        
        if demande.etablissement:
            contexte_parts.append(f"Établissement: {demande.etablissement.nom}")
        
        # Résumé CV (si disponible)
        if demande.resume_cv:
            contexte_parts.append(f"\nRÉSUMÉ DU CV:\n{demande.resume_cv}")
        else:
            contexte_parts.append("\nRÉSUMÉ DU CV: Non disponible (CV non analysé)")
        
        # Documents fournis
        docs = []
        if demande.cv:
            docs.append("CV")
        if demande.lettre_motivation:
            docs.append("Lettre de motivation")
        if demande.diplomes.exists():
            docs.append(f"{demande.diplomes.count()} diplôme(s)")
        
        if docs:
            contexte_parts.append(f"\nDOCUMENTS FOURNIS: {', '.join(docs)}")
        
        return "\n".join(contexte_parts)
    
    @staticmethod
    def _fallback_scoring(demande) -> Tuple[int, Dict, str]:
        """Scoring de secours si Gemini échoue"""
        
        score = 50  # Score neutre
        
        # Bonus selon documents fournis
        if demande.cv:
            score += 10
        if demande.lettre_motivation:
            score += 10
        if demande.diplomes.exists():
            score += 5
        if demande.resume_cv and len(demande.resume_cv) > 100:
            score += 10
        
        # Bonus selon niveau d'étude
        niveau_scores = {
            'Licence 1': 5,
            'Licence 2': 7,
            'Licence 3': 10,
            'Master 1': 12,
            'Master 2': 15,
        }
        score += niveau_scores.get(demande.etudiant_niveau, 5)
        
        score = min(score, 100)  # Cap à 100
        
        details = {
            'adequation_profil': {'score': score * 0.3, 'justification': 'Évaluation automatique'},
            'qualite_cv': {'score': score * 0.25, 'justification': 'Évaluation automatique'},
            'experience': {'score': score * 0.20, 'justification': 'Évaluation automatique'},
            'motivation': {'score': score * 0.15, 'justification': 'Évaluation automatique'},
            'potentiel': {'score': score * 0.10, 'justification': 'Évaluation automatique'}
        }
        
        commentaire = "Score calculé automatiquement (analyse IA temporairement indisponible)."
        
        return score, details, commentaire