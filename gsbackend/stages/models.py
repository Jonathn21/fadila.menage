from django.db import models
from django.db import models
from datetime import datetime,date
from django.utils import timezone
from utilisateurs.models import Utilisateur,Profil,VerificationCode
import uuid
import os
import time
  

class Etablissement(models.Model):
    nom = models.CharField(max_length=255)
    email = models.EmailField(blank=True, null=True)
    adresse = models.CharField(max_length=255, blank=True, null=True)
    telephone = models.CharField(max_length=50, blank=True, null=True)

    def __str__(self):
        return self.nom

import uuid
from django.db import models
from django.utils import timezone


class Demande(models.Model):
    # Informations sur l'étudiant
    photo_passeport = models.ImageField(upload_to='candidatures/photos_passeport/', null=True, blank=True)
    etudiant_prenom = models.CharField(max_length=255)
    etudiant_nom = models.CharField(max_length=255)
    genre = models.CharField(max_length=20, choices=[
        ('Masculin', 'Masculin'), 
        ('Féminin', 'Féminin'), 
        ('Autre', 'Autre')
    ], default="Autre")
    etudiant_email = models.EmailField()
    etudiant_telephone = models.CharField(max_length=20)
    etudiant_adresse = models.CharField(null=True, blank=True, max_length=100)
    etudiant_specialite = models.CharField(max_length=100)
    etablissement = models.ForeignKey('Etablissement', on_delete=models.SET_NULL, null=True, blank=True, related_name="demandes")
    resume_cv = models.TextField(blank=True, null=True)
    est_archivee = models.BooleanField(default=False)
    date_desarchivage = models.DateTimeField(null=True, blank=True)

    NIVEAU_CHOICES = [
        ("Licence 1", "Licence 1"),
        ("Licence 2", "Licence 2"),
        ("Licence 3", "Licence 3"),
        ("Master 1", "Master 1"),
        ("Master 2", "Master 2"),
    ]

    etudiant_niveau = models.CharField(max_length=100, choices=NIVEAU_CHOICES, default="Licence 3")
    pays_residence = models.CharField(max_length=100, blank=True, null=True)

    # Stage
    type_stage = models.CharField(max_length=50, choices=[
        ('Académique', 'Académique'),
        ('Fonctionnel', 'Fonctionnel'),
        ('Libre', 'Libre')
    ], default='Académique')

    statut_stage = models.CharField(max_length=50, default="En attente")

    # Détails
    date_soumission = models.DateTimeField(auto_now_add=True)
    date_maj = models.DateTimeField(auto_now=True)

    traiter_candidature = models.BooleanField(default=False)

    # Documents
    cv = models.FileField(upload_to='candidatures/cv/', null=True, blank=True)
    lettre_motivation = models.FileField(upload_to='candidatures/lettres/', null=True, blank=True)
    raison_refus = models.TextField(blank=True, null=True)
    tracking_id = models.CharField(max_length=20, unique=True, blank=True)

    # Score IA
    score_ia = models.IntegerField(default=0, help_text="Score IA de 0 à 100")
    score_details = models.JSONField(null=True, blank=True, help_text="Détails du scoring (breakdown par critère)")
    score_date = models.DateTimeField(null=True, blank=True, help_text="Date du dernier calcul de score")
    score_commentaire = models.TextField(blank=True, help_text="Commentaire IA sur le profil")

    # Dans models.py, classe Demande
    donnees_pre_acceptation = models.JSONField(null=True, blank=True, help_text="Données de pré-acceptation en attente de finalisation")
    
    # ✅ CORRECTION: On garde ce champ pour compatibilité, mais il utilise la relation inversée
    convention_temporaire = models.ForeignKey(
        'ConventionStage', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='demande_associee'
    )
    
    date_pre_acceptation = models.DateTimeField(null=True, blank=True)
        
    class Meta:
        ordering = ['-score_ia', '-date_soumission']

    def __str__(self):
        return f"Demande de {self.etudiant_nom} {self.etudiant_prenom} - {self.type_stage} ({self.statut_stage})"

    def generate_tracking_id(self):
        """Génère un tracking ID unique"""
        prefix = "CEB-STG-"
        while True:
            unique_part = uuid.uuid4().hex[:8].upper()
            tracking_id = prefix + unique_part
            if not Demande.objects.filter(tracking_id=tracking_id).exists():
                return tracking_id

    def save(self, *args, **kwargs):
        """
        Méthode save corrigée pour éviter les duplications d'ID
        """
        # Générer le tracking_id si nécessaire
        if not self.tracking_id:
            self.tracking_id = self.generate_tracking_id()
        
        # Déterminer si c'est une création ou une mise à jour
        est_creation = not self.pk
        
        # Tracker les modifications de documents (uniquement pour les mises à jour)
        if not est_creation:
            try:
                ancienne_demande = Demande.objects.get(pk=self.pk)
                self.track_document_changes(ancienne_demande)
            except Demande.DoesNotExist:
                pass
        
        super().save(*args, **kwargs)
        
        # ✅ CORRECTION APRÈS SAVE: Mettre à jour la convention temporaire si nécessaire
        self.mettre_a_jour_convention_temporaire()

    def mettre_a_jour_convention_temporaire(self):
        """Met à jour la convention temporaire liée si elle existe"""
        if hasattr(self, 'conventions_temporaires'):
            convention_temp = self.conventions_temporaires.filter(est_temporaire=True).first()
            if convention_temp and not self.convention_temporaire:
                self.convention_temporaire = convention_temp
                # Éviter la boucle infinie en sauvegardant sans triggers
                Demande.objects.filter(id=self.id).update(convention_temporaire=convention_temp)

    def track_document_changes(self, ancienne_demande):
        """Tracker les modifications de documents"""
        # CV modifié
        if self.cv and self.cv != ancienne_demande.cv:
            self.track_document_change('cv', self.cv, 'Curriculum Vitae (CV)')
        
        # Lettre de motivation modifiée
        if self.lettre_motivation and self.lettre_motivation != ancienne_demande.lettre_motivation:
            self.track_document_change('lettre_motivation', self.lettre_motivation, 'Lettre de motivation (LM)')

    def track_document_change(self, doc_type, nouveau_fichier, nom_affichage):
        """Track un changement de document"""
        ancien_historique = self.document_histories.filter(
            document_type=doc_type
        ).order_by('-date_upload').first()
        
        est_modifie = ancien_historique is not None
        
        DocumentHistory.objects.create(
            demande=self,
            document_type=doc_type,
            nom_fichier=nouveau_fichier.name,
            nom_affichage=nom_affichage,
            est_modifie=est_modifie
        )

    def get_documents_with_status(self, utilisateur=None):
        """Retourne les documents avec statut nouveau/modifié et état de lecture"""
        documents = []
        maintenant = timezone.now()
        delai_nouveau = timezone.timedelta(days=7)  # 7 jours = nouveau
        
        # ✅ CORRECTION: Ajouter la convention temporaire aux documents
        # Récupérer la convention temporaire liée
        convention_temp = self.get_convention_temporaire()
        if convention_temp and convention_temp.fichier:
            documents.append({
                'nom': 'Convention à signer (PDF)',
                'url': convention_temp.fichier.url,
                'statut': 'new',
                'date_upload': convention_temp.date_creation,
                'document_history_id': convention_temp.id,
                'est_modifie': False
            })
        
        # Récupérer le dernier historique de chaque type de document
        types_documents = ['cv', 'lettre_motivation', 'diplome']
        
        for doc_type in types_documents:
            if doc_type == 'diplome':
                # Gestion spéciale pour les diplômes multiples
                if hasattr(self, 'diplomes'):
                    for diplome in self.diplomes.all():
                        doc_data = self.get_document_data(
                            doc_type, 
                            diplome.fichier, 
                            f'Diplôme/Attestation (D/A) ',
                            utilisateur,
                            maintenant,
                            delai_nouveau
                        )
                        if doc_data:
                            documents.append(doc_data)
            else:
                # CV et lettre de motivation
                fichier = getattr(self, doc_type, None)
                if fichier:
                    nom_affichage = 'Curriculum Vitae (CV)' if doc_type == 'cv' else 'Lettre de motivation (LM)'
                    doc_data = self.get_document_data(
                        doc_type, 
                        fichier, 
                        nom_affichage,
                        utilisateur,
                        maintenant,
                        delai_nouveau
                    )
                    if doc_data:
                        documents.append(doc_data)
        
        return documents

    def get_convention_temporaire(self):
        """Récupère la convention temporaire liée à la demande"""
        # Priorité 1: Via le champ convention_temporaire
        if self.convention_temporaire and self.convention_temporaire.est_temporaire:
            return self.convention_temporaire
        
        # Priorité 2: Via la relation inversée
        if hasattr(self, 'conventions_temporaires'):
            return self.conventions_temporaires.filter(est_temporaire=True).first()
        
        return None

    def get_document_data(self, doc_type, fichier, nom_affichage, utilisateur, maintenant, delai_nouveau):
        """Récupère les données d'un document avec son statut"""
        if not fichier:
            return None
        
        # Trouver le dernier historique pour ce document
        dernier_historique = self.document_histories.filter(
            document_type=doc_type,
            nom_fichier=fichier.name
        ).order_by('-date_upload').first()
        
        # Si pas d'historique, créer une entrée (pour les anciens documents)
        if not dernier_historique:
            dernier_historique = DocumentHistory.objects.create(
                demande=self,
                document_type=doc_type,
                nom_fichier=fichier.name,
                nom_affichage=nom_affichage,
                est_modifie=False
            )
        
        # Déterminer le statut
        statut = self.get_document_status(dernier_historique, maintenant, delai_nouveau)
        
        # Vérifier si l'utilisateur a déjà vu ce document
        deja_vu = False
        if utilisateur:
            deja_vu = DocumentViewHistory.objects.filter(
                utilisateur=utilisateur,
                document_history=dernier_historique
            ).exists()
        
        return {
            'nom': nom_affichage,
            'url': fichier.url,
            'statut': 'viewed' if deja_vu else statut,
            'date_upload': dernier_historique.date_upload,
            'document_history_id': dernier_historique.id,
            'est_modifie': dernier_historique.est_modifie
        }

    def get_document_status(self, historique, maintenant, delai_nouveau):
        """Détermine le statut du document"""
        if historique.est_modifie:
            return 'modified'
        elif (maintenant - historique.date_upload) <= delai_nouveau:
            return 'new'
        else:
            return 'existing'

    def mark_document_as_viewed(self, document_history_id, utilisateur):
        """Marque un document comme vu par un utilisateur"""
        try:
            # Si c'est une convention temporaire
            if isinstance(document_history_id, int) and document_history_id > 0:
                try:
                    convention = ConventionStage.objects.get(id=document_history_id, est_temporaire=True)
                    # Pour les conventions, on peut marquer comme vue différemment
                    # ou simplement retourner True pour l'instant
                    return True
                except ConventionStage.DoesNotExist:
                    pass
            
            # Pour les documents normaux
            doc_history = DocumentHistory.objects.get(
                id=document_history_id,
                demande=self
            )
            DocumentViewHistory.objects.get_or_create(
                utilisateur=utilisateur,
                document_history=doc_history
            )
            return True
        except (DocumentHistory.DoesNotExist, ConventionStage.DoesNotExist):
            return False

    def get_documents(self):
        """Méthode legacy pour compatibilité - retourne la liste simple des documents"""
        documents = []
        
        # ✅ CORRECTION: Ajouter la convention temporaire
        convention_temp = self.get_convention_temporaire()
        if convention_temp and convention_temp.fichier:
            documents.append({
                'nom': 'Convention à signer',
                'url': convention_temp.fichier.url
            })
        
        if self.cv:
            documents.append({
                'nom': 'Curriculum Vitae (CV)',
                'url': self.cv.url
            })
        if self.lettre_motivation:
            documents.append({
                'nom': 'Lettre de motivation (LM)',
                'url': self.lettre_motivation.url
            })
        
        if hasattr(self, 'diplomes'):
            for diplome in self.diplomes.all():
                documents.append({
                    'nom': f'Diplôme/Attestation',
                    'url': diplome.fichier.url
                })
       
        return documents

    @property
    def convention_temporaire_url(self):
        """Propriété pour récupérer l'URL de la convention temporaire"""
        convention_temp = self.get_convention_temporaire()
        if convention_temp and convention_temp.fichier:
            return convention_temp.fichier.url
        return None

    @property
    def has_convention_temporaire(self):
        """Vérifie si une convention temporaire existe"""
        return self.get_convention_temporaire() is not None

class ConventionStage(models.Model):
    stagiaire = models.OneToOneField('Stagiaire', on_delete=models.CASCADE, null=True, blank=True)
    demande = models.ForeignKey('Demande', on_delete=models.SET_NULL, null=True, blank=True, related_name='conventions_temporaires')
    est_temporaire = models.BooleanField(default=False)

    date_creation = models.DateField(auto_now_add=True)
    fichier = models.FileField(upload_to='conventions/', null=True, blank=True)
    numero_convention = models.CharField(max_length=50, unique=True, blank=True)

    def __str__(self):
        if self.stagiaire:
            return f"Convention {self.numero_convention} - {self.stagiaire}"
        else:
            return f"Convention temporaire {self.numero_convention} - Demande {self.demande_id}"

    def generate_numero_convention(self):
        prefix = "CEB-CONV-"
        while True:
            unique_part = uuid.uuid4().hex[:8].upper()
            numero = prefix + unique_part
            if not ConventionStage.objects.filter(numero_convention=numero).exists():
                return numero

    def generate_numero_temporaire(self, demande_id):
        """Génère un numéro pour les conventions temporaires"""
        prefix = "TEMP-CONV-"
        timestamp = int(time.time())
        return f"{prefix}{demande_id}-{timestamp}"

    def save(self, *args, **kwargs):
        if not self.numero_convention:
            if self.est_temporaire and self.demande:
                self.numero_convention = self.generate_numero_temporaire(self.demande.id)
            else:
                self.numero_convention = self.generate_numero_convention()
        super().save(*args, **kwargs)
    
    @property
    def est_valide(self):
        """Une convention est valide si elle a un stagiaire ou si c'est temporaire avec une demande"""
        if self.stagiaire:
            return True
        elif self.est_temporaire and self.demande:
            return True
        return False
    
class Diplome(models.Model):
    demande = models.ForeignKey(Demande, on_delete=models.CASCADE, related_name='diplomes')
    fichier = models.FileField(upload_to='candidatures/diplomes/')
    date_upload = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Diplôme {self.id} - {self.demande.etudiant_nom}"

from django.db import models
from datetime import datetime, date
from django.utils import timezone
import uuid

class Stagiaire(models.Model):
    demande = models.ForeignKey('Demande', on_delete=models.CASCADE, null=True, blank=True)

    GENRE_CHOICES = [
        ('Masculin', 'Masculin'),
        ('Féminin', 'Féminin'),
        ('Autre', 'Autre'),
    ]

    STATUT_CHOICES = [
        ("À venir", "À venir"),
        ("Actuel", "Actuel"),
        ("Terminé", "Terminé"),
    ]

    photo_passeport = models.ImageField(upload_to='stagiaires/photos_passeport/', null=True, blank=True)
    nom = models.CharField(max_length=100)
    prenom = models.CharField(max_length=100)
    email = models.EmailField(blank=True, null=True)
    telephone = models.CharField(max_length=20, blank=True, null=True)
    niveau_etude = models.CharField(max_length=100)
    specialite = models.CharField(max_length=100, blank=True, null=True)
    genre = models.CharField(max_length=20, choices=GENRE_CHOICES, default="Autre")
    pays_residence = models.CharField(max_length=100, blank=True, null=True)
    adresse = models.CharField(max_length=255, blank=True, null=True)
    type_stage = models.CharField(max_length=100)
    remunere = models.BooleanField(default=False, verbose_name="Stage rémunéré")
    montant_remuneration = models.IntegerField(
        blank=True, 
        null=True, 
        verbose_name="Montant de la rémunération (en FCFA)"
    )
    etablissement = models.ForeignKey('Etablissement', on_delete=models.SET_NULL, null=True, blank=True, related_name="stagiaires")
    direction = models.CharField(max_length=100, blank=True, null=True)
    service = models.CharField(max_length=100, blank=True, null=True)
    lieu_stage = models.CharField(max_length=100, blank=True, null=True)
    date_accord = models.DateField()
    date_debut = models.DateField()
    date_fin = models.DateField()
    resume_cv = models.TextField(blank=True, null=True)
    date_debut_fige = models.DateField("Date de début (figée)", null=True, blank=True)
    date_fin_fige = models.DateField("Date de fin (figée)", null=True, blank=True)
    duree_jours_fige = models.IntegerField("Durée en jours (figée)", null=True, blank=True)
    duree_mois_fige = models.IntegerField("Durée en mois (figée)", null=True, blank=True)
    
    # ✅ CORRECTION : Agrandi pour 50 caractères et ajouté choices
    statut = models.CharField(
        max_length=50, 
        choices=STATUT_CHOICES,
        default="À venir", 
        null=True, 
        blank=True,
    )    
    
    identifiant_groupe = models.UUIDField(default=uuid.uuid4, editable=False, db_index=True)

    cv = models.FileField(upload_to='candidatures/cv/', null=True, blank=True)
    lettre_motivation = models.FileField(upload_to='candidatures/lettres/', null=True, blank=True)
    diplome = models.FileField(upload_to='candidatures/attestations/', null=True, blank=True)
    
    # ✅ CORRECTION : Ajout du champ pour suivre le processus de renouvellement
    pre_renouvellement_en_cours = models.BooleanField(
        default=False,
        help_text="Indique si un pré-renouvellement est en cours pour ce stage"
    )
    
    a_ete_renouvele = models.BooleanField(
        default=False, 
        help_text="Indique si ce stage a été renouvelé (après finalisation)"
    )
    
    stage_renouvele_id = models.CharField(
        max_length=50, 
        null=True, 
        blank=True, 
        help_text="ID du nouveau stage créé lors du renouvellement"
    )
    
    superviseur = models.CharField(max_length=100, blank=True, null=True)
    
    # ✅ CORRECTION : Clarification du help_text
    donnees_pre_renouvellement = models.JSONField(
        null=True, 
        blank=True,
        help_text="Données du pré-renouvellement en cours (dates, direction, service, etc.)"
    )
    
    date_pre_renouvellement = models.DateTimeField(
        null=True, 
        blank=True,
        help_text="Date de début du pré-renouvellement"
    )
    
    convention_renouvellement_temporaire = models.ForeignKey(
        'ConventionStage', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='stagiaire_renouvellement_temporaire',
        help_text="Convention temporaire générée lors du pré-renouvellement"
    )
    
    est_renouvellement = models.BooleanField(
        default=False,
        help_text="Indique si ce stage est un renouvellement d'un stage précédent"
    )
    
    stage_precedent = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='renouvellements',
        help_text="Lien vers le stage précédent qui a été renouvelé"
    )

    class Meta:
        ordering = ['-date_debut']
        indexes = [
            models.Index(fields=['statut']),
            models.Index(fields=['pre_renouvellement_en_cours']),
            models.Index(fields=['identifiant_groupe']),
        ]

    def get_documents(self):
        """
        Retourne la liste des documents du stagiaire avec gestion d'erreurs
        """
        documents = []
        
        try:
            # Documents directs du stagiaire
            if self.cv:
                documents.append({
                    'nom': 'Curriculum Vitae (CV)',
                    'url': self.cv.url,
                    'type': 'cv'
                })
            
            if self.lettre_motivation:
                documents.append({
                    'nom': 'Lettre de motivation (LM)',
                    'url': self.lettre_motivation.url,
                    'type': 'lettre_motivation'
                })

            # Gestion des diplômes
            if self.diplome:
                documents.append({
                    'nom': 'Diplôme ou Attestation',
                    'url': self.diplome.url,
                    'type': 'diplome'
                })
            elif self.demande:
                if hasattr(self.demande, 'diplomes'):
                    for diplome in self.demande.diplomes.all():
                        if diplome and diplome.fichier:
                            documents.append({
                                'nom': 'Diplôme ou Attestation',
                                'url': diplome.fichier.url,
                                'type': 'diplome'
                            })

            # Convention de stage
            try:
                if hasattr(self, 'conventionstage') and self.conventionstage and self.conventionstage.fichier:
                    documents.append({
                        'nom': 'Convention de stage', 
                        'url': self.conventionstage.fichier.url,
                        'type': 'convention'
                    })
            except Exception as e:
                print(f"⚠️ Erreur convention pour stagiaire {self.id}: {e}")
            
            # Rapports de stage
            try:
                for rapport in self.rapports.all():
                    if rapport and rapport.fichier:
                        documents.append({
                            'nom': f"Rapport : {rapport.titre}",
                            'url': rapport.fichier.url,
                            'type': 'rapport'
                        })
            except Exception as e:
                print(f"⚠️ Erreur rapports pour stagiaire {self.id}: {e}")

            # Attestation de stage
            try:
                if hasattr(self, 'attestation') and self.attestation and self.attestation.fichier:
                    documents.append({
                        'nom': 'Attestation de stage',
                        'url': self.attestation.fichier.url,
                        'type': 'attestation'
                    })
            except Exception as e:
                print(f"⚠️ Erreur attestation pour stagiaire {self.id}: {e}")
                
        except Exception as e:
            print(f"❌ Erreur générale dans get_documents pour stagiaire {self.id}: {e}")
        
        return documents

    @property
    def statut_actuel(self):
        """Calcule le statut actuel basé sur les dates"""
        today = date.today()
        if self.date_debut and self.date_fin:
            debut = self.date_debut.date() if hasattr(self.date_debut, 'date') else self.date_debut
            fin = self.date_fin.date() if hasattr(self.date_fin, 'date') else self.date_fin

            if debut <= today <= fin:
                return "Actuel"
            elif today < debut:
                return "À venir"
            elif today > fin:
                return "Terminé"
        return self.statut  # fallback
    
    @property
    def duree_jours(self):
        """Calcule la durée du stage en jours"""
        if self.date_debut and self.date_fin:
            return (self.date_fin - self.date_debut).days
        return None

    @property
    def duree_mois(self):
        """Calcule la durée du stage en mois (arrondi)"""
        if self.date_debut and self.date_fin:
            return round((self.date_fin - self.date_debut).days / 30)
        return None
    
    @property
    def jours_restants(self):
        """Calcule le nombre de jours restants avant la fin"""
        if self.date_fin:
            delta = (self.date_fin - date.today()).days
            return max(delta, 0)  # Ne pas retourner de valeurs négatives
        return None

    @property
    def date_debut_suivi(self):
        """Date de début pour la page de suivi (figée)"""
        return self.date_debut_fige or self.date_debut
    
    @property
    def date_fin_suivi(self):
        """Date de fin pour la page de suivi (figée)"""
        return self.date_fin_fige or self.date_fin
    
    @property
    def duree_jours_suivi(self):
        """Durée en jours pour la page de suivi (figée)"""
        return self.duree_jours_fige or self.duree_jours
    
    @property
    def duree_mois_suivi(self):
        """Durée en mois pour la page de suivi (figée)"""
        return self.duree_mois_fige or self.duree_mois

    @property
    def est_en_pre_renouvellement(self):
        """
        Vérifie si le stage est en cours de pré-renouvellement
        Utilise maintenant le champ dédié pre_renouvellement_en_cours
        """
        return self.pre_renouvellement_en_cours

    @property
    def peut_etre_renouvele(self):
        """Vérifie si le stage peut être renouvelé"""
        # Vérification 1 : Déjà renouvelé
        if self.a_ete_renouvele:
            return False, "Ce stage a déjà été renouvelé"
        
        # Vérification 2 : Statut doit être "Terminé"
        if self.statut_actuel != "Terminé":
            return False, f"Le stage doit être terminé pour être renouvelé. Statut actuel: {self.statut_actuel}"
        
        # Vérification 3 : Pas déjà en pré-renouvellement
        if self.est_en_pre_renouvellement:
            return False, "Un pré-renouvellement est déjà en cours"
        
        return True, "Le stage peut être renouvelé"

    def get_historique_renouvellements(self):
        """Retourne l'historique complet des renouvellements"""
        historiques = []
        
        # Récupérer tous les renouvellements successifs
        stage_courant = self
        while stage_courant.stage_precedent:
            historiques.append({
                'type': 'précédent',
                'stage_id': stage_courant.stage_precedent.id,
                'nom_complet': f"{stage_courant.stage_precedent.prenom} {stage_courant.stage_precedent.nom}",
                'date_debut': stage_courant.stage_precedent.date_debut.strftime('%d/%m/%Y'),
                'date_fin': stage_courant.stage_precedent.date_fin.strftime('%d/%m/%Y'),
                'statut': stage_courant.stage_precedent.statut,
                'est_renouvellement': stage_courant.stage_precedent.est_renouvellement,
                'pre_renouvellement_en_cours': stage_courant.stage_precedent.pre_renouvellement_en_cours,
            })
            stage_courant = stage_courant.stage_precedent
        
        # Inverser pour avoir l'ordre chronologique
        historiques.reverse()
        
        # Ajouter le stage actuel
        historiques.append({
            'type': 'actuel',
            'stage_id': self.id,
            'nom_complet': f"{self.prenom} {self.nom}",
            'date_debut': self.date_debut.strftime('%d/%m/%Y'),
            'date_fin': self.date_fin.strftime('%d/%m/%Y'),
            'statut': self.statut,
            'est_renouvellement': self.est_renouvellement,
            'pre_renouvellement_en_cours': self.pre_renouvellement_en_cours,
        })
        
        return historiques

    def get_info_renouvellement(self):
        """Retourne les informations du renouvellement en cours si applicable"""
        if not self.est_en_pre_renouvellement or not self.donnees_pre_renouvellement:
            return None
        
        return {
            'dates': {
                'debut': self.donnees_pre_renouvellement.get('date_debut'),
                'fin': self.donnees_pre_renouvellement.get('date_fin'),
            },
            'affectation': {
                'direction': self.donnees_pre_renouvellement.get('direction', self.direction),
                'service': self.donnees_pre_renouvellement.get('service', self.service),
            },
            'details': {
                'type_stage': self.donnees_pre_renouvellement.get('type_stage', self.type_stage),
                'remunere': self.donnees_pre_renouvellement.get('remunere', self.remunere),
                'montant': self.donnees_pre_renouvellement.get('montant', self.montant_remuneration),
            },
            'convention_temporaire': {
                'id': self.convention_renouvellement_temporaire.id if self.convention_renouvellement_temporaire else None,
                'url': self.convention_renouvellement_temporaire.fichier.url if self.convention_renouvellement_temporaire and self.convention_renouvellement_temporaire.fichier else None,
            },
            'date_demande': self.date_pre_renouvellement.strftime('%d/%m/%Y %H:%M') if self.date_pre_renouvellement else None,
        }

    def nettoyer_pre_renouvellement(self):
        """Nettoie les données de pré-renouvellement"""
        self.pre_renouvellement_en_cours = False
        self.donnees_pre_renouvellement = None
        self.date_pre_renouvellement = None
        self.convention_renouvellement_temporaire = None
        self.save(update_fields=[
            'pre_renouvellement_en_cours',
            'donnees_pre_renouvellement', 
            'date_pre_renouvellement', 
            'convention_renouvellement_temporaire'
        ])

    def save(self, *args, **kwargs):

            # Remplir les champs figés si c'est une création
        if not self.pk:
            self.remplir_champs_figes()
        # Ne pas recalculer si statut déjà modifié manuellement
        if self.pk:
            original = Stagiaire.objects.get(pk=self.pk)
            if original.statut != self.statut:
                # Laisser le statut modifié manuellement
                pass
            else:
                self.statut = self.statut_actuel
        else:
            self.statut = self.statut_actuel
            
        # Gestion de l'identifiant_groupe
        if not self.pk:
            if self.est_renouvellement and self.stage_precedent:
                # Renouvellement : reprendre l'identifiant du stage précédent
                self.identifiant_groupe = self.stage_precedent.identifiant_groupe
            else:
                # Nouveau stage : nouveau groupe
                self.identifiant_groupe = uuid.uuid4()
            
        super().save(*args, **kwargs)

    def __str__(self):
        """Représentation texte du stagiaire"""
        base_str = f"{self.prenom} {self.nom}"
        
        # Ajout d'indicateurs si nécessaire
        indicators = []
        if self.est_renouvellement:
            indicators.append("RENOUVELLEMENT")
        if self.pre_renouvellement_en_cours:
            indicators.append("PRÉ-RENOUVELLEMENT")
        if self.a_ete_renouvele:
            indicators.append("RENOUVELÉ")
        
        if indicators:
            return f"{base_str} [{', '.join(indicators)}]"
        return base_str
    
    def remplir_champs_figes(self):
        """Remplit les champs figés avec les valeurs au moment de la création"""
        today = date.today()
        
        if self.date_debut and self.date_fin:
            # Date début et fin (figées)
            self.date_debut_fige = self.date_debut
            self.date_fin_fige = self.date_fin
            
            # Durée (figée)
            delta = self.date_fin - self.date_debut
            self.duree_jours_fige = delta.days
            self.duree_mois_fige = round(delta.days / 30)
            
            
            
            # Date d'acceptation
            self.date_acceptation = timezone.now()
class RapportStage(models.Model):
    stagiaire = models.ForeignKey('Stagiaire', on_delete=models.CASCADE, related_name='rapports')
    titre = models.CharField(max_length=255)
    fichier = models.FileField(upload_to='rapports_stages/')
    date_ajout = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.titre} ({self.stagiaire})"
    
class AttestationStage(models.Model):
    stagiaire = models.OneToOneField('Stagiaire', on_delete=models.CASCADE, related_name='attestation')
    fichier = models.FileField(upload_to='attestations_stages/')
    date_generation = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Attestation de {self.stagiaire}"

class HistoriqueDemande(models.Model):
    demande = models.ForeignKey('Demande', on_delete=models.CASCADE, related_name='historiques')
    action = models.CharField(max_length=255)  # Exemple : "Demande acceptée", "Refusée", etc.
    timestamp = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.timestamp.strftime('%d/%m/%Y %H:%M')} - {self.action}"
    
class ActiviteStagiaire(models.Model):
    stagiaire = models.ForeignKey("Stagiaire", on_delete=models.CASCADE, related_name="activites")
    action = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.stagiaire} - {self.action} - {self.timestamp.strftime('%d/%m/%Y %H:%M')}"
    
class Entretien(models.Model):
    titre = models.CharField(max_length=255,default="Entretien de stage")
    demandeur = models.ForeignKey('Demande', on_delete=models.CASCADE, related_name='entretiens')
    date = models.DateField()
    heure_debut = models.TimeField()
    STATUT_CHOICES = [
        ('planifié', 'Planifié'),
        ('annulé', 'Annulé'),
        ('terminé', 'Terminé'),
    ]
   
    status = models.CharField(max_length=20, choices=STATUT_CHOICES, default='planifié')
    motif_annulation = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.demandeur} ({self.date})"
    
class VerificationChamp(models.Model):
    demande = models.ForeignKey('Demande', on_delete=models.CASCADE, related_name='verifications_champs')
    champ = models.CharField(max_length=50)

    class Meta:
        unique_together = ('demande', 'champ')
        
class Notification(models.Model):
    user = models.ForeignKey(Utilisateur, on_delete=models.CASCADE, related_name='notifications')
    titre = models.CharField(max_length=255)
    message = models.TextField()
    url = models.URLField(blank=True, null=True)
    lu = models.BooleanField(default=False)
    date_creation = models.DateTimeField(auto_now_add=True)
    type = models.CharField(max_length=50, blank=True, null=True)
    icone = models.CharField(max_length=50, blank=True, null=True)
    
    # 🔊 NOUVEAU CHAMP SON
    son = models.CharField(
        max_length=50, 
        blank=True, 
        null=True,
        default='default',
        choices=[
            ('default', 'Son par défaut'),
            ('success', 'Succès'),
            ('warning', 'Alerte'),
            ('error', 'Erreur'),
            ('message', 'Message'),
            ('bell', 'Cloche'),
            ('chime', 'Carillon'),
            ('none', 'Aucun son'),
        ]
    )

    class Meta:
        ordering = ['-date_creation']

    def __str__(self):
        return f"Notification pour {self.user.first_name} : {self.titre}"
    

from django.db import models
import uuid

class StageEffectue(models.Model):
    stagiaire = models.ForeignKey('Stagiaire', on_delete=models.CASCADE, related_name='anciens_stages')
    nom = models.CharField(max_length=100, blank=True, null=True)
    prenom = models.CharField(max_length=100, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    telephone = models.CharField(max_length=20, blank=True, null=True)
    niveau_etude = models.CharField(max_length=100, null=True, blank=True)
    specialite = models.CharField(max_length=100, blank=True, null=True)
    genre = models.CharField(max_length=20, blank=True, null=True)
    type_stage = models.CharField(max_length=100, blank=True, null=True)
    remunere = models.BooleanField(null=True, blank=True)
    montant_remuneration = models.IntegerField(blank=True, null=True)
    direction = models.CharField(max_length=100, blank=True, null=True)
    service = models.CharField(max_length=100, blank=True, null=True)
    lieu_stage = models.CharField(max_length=100, blank=True, null=True)
    date_debut = models.DateField(null=True, blank=True)
    date_fin = models.DateField(null=True, blank=True)
    duree_jours = models.IntegerField(null=True, blank=True)
    duree_mois = models.IntegerField(null=True, blank=True)
    identifiant_groupe = models.UUIDField(db_index=True, null=True, blank=True, default=uuid.uuid4)

    def __str__(self):
        return f"{self.nom} {self.prenom} - {self.type_stage} ({self.date_debut} à {self.date_fin})"

from django.conf import settings

class UserSession(models.Model):
    user = models.ForeignKey(Utilisateur, on_delete=models.CASCADE, related_name='sessions')
    session_key = models.CharField(max_length=255, unique=True)  # Votre clé générée
    django_session_key = models.CharField(max_length=40, null=True, blank=True)  # Clé Django réelle
    user_agent = models.TextField(blank=True, null=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    device_info = models.CharField(max_length=255, blank=True, null=True)
    location = models.CharField(max_length=255, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_activity = models.DateTimeField(auto_now=True)
    disconnected_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-last_activity']
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['last_activity']),
        ]
    
    def __str__(self):
        return f"{self.user.email} - {self.device_info or 'Unknown'} - {self.created_at}"

class UserAction(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="actions")
    action = models.CharField(max_length=255)
    performed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="performed_actions")
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-timestamp"]

    def __str__(self):
        return f"{self.user} - {self.action} - {self.timestamp}"


class DocumentHistory(models.Model):
    """Historique des modifications de documents avec suivi de lecture"""
    demande = models.ForeignKey('Demande', on_delete=models.CASCADE, related_name='document_histories')
    document_type = models.CharField(max_length=50)  # 'cv', 'lettre_motivation', 'diplome'
    nom_fichier = models.CharField(max_length=255)
    nom_affichage = models.CharField(max_length=255)  # Nom pour l'affichage
    date_upload = models.DateTimeField(auto_now_add=True)
    est_modifie = models.BooleanField(default=False)
    hash_fichier = models.CharField(max_length=64, blank=True)  # Pour détecter les vraies modifications
    
    class Meta:
        ordering = ['-date_upload']
        indexes = [
            models.Index(fields=['demande', 'document_type']),
        ]
    
    def __str__(self):
        return f"{self.document_type} - {self.nom_affichage} ({self.date_upload})"

class DocumentViewHistory(models.Model):
    """Suivi des documents vus par les utilisateurs"""
    utilisateur = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    document_history = models.ForeignKey(DocumentHistory, on_delete=models.CASCADE)
    date_vue = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['utilisateur', 'document_history']
        ordering = ['-date_vue']
    
    def __str__(self):
        return f"{self.utilisateur} - {self.document_history}"

class DemandeAttestation(models.Model):
    """Suivi des demandes d'attestation de stage"""
    stagiaire = models.ForeignKey('Stagiaire', on_delete=models.CASCADE, related_name='demandes_attestation')
    date_demande = models.DateTimeField(auto_now_add=True)
    
    # Nouveau champ : fichier de demande
    fichier_demande = models.FileField(
        upload_to='demandes_attestation/',
        null=True,
        blank=True,
        verbose_name="Document de demande d'attestation"
    )
    
    statut = models.CharField(
        max_length=20,
        choices=[
            ('en_attente', 'En attente'),
            ('en_traitement', 'En traitement'),
            ('generee', 'Générée'),
            ('refusee', 'Refusée'),
        ],
        default='en_attente'
    )
    motif_refus = models.TextField(blank=True, null=True)
    traite_par = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    date_traitement = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-date_demande']
        verbose_name = "Demande d'attestation"
        verbose_name_plural = "Demandes d'attestation"
    
    def __str__(self):
        return f"Demande attestation - {self.stagiaire} - {self.get_statut_display()}"
    
    def get_document_url(self, request=None):
        """Retourne l'URL du document de demande"""
        if self.fichier_demande:
            if request:
                return request.build_absolute_uri(self.fichier_demande.url)
            return self.fichier_demande.url
        return None

