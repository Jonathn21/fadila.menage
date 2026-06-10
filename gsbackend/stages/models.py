from django.db import models
from datetime import datetime,date
from django.utils import timezone
from utilisateurs.models import Utilisateur,Profil,VerificationCode
import uuid
import os
import time
from django.conf import settings



  
class Etablissement(models.Model):
    nom = models.CharField(max_length=255)
    email = models.EmailField(blank=True, null=True)
    adresse = models.CharField(max_length=255, blank=True, null=True)
    telephone = models.CharField(max_length=50, blank=True, null=True)

    def __str__(self):
        return self.nom

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

    class Statut(models.TextChoices):
        EN_ATTENTE = "En attente", "En attente"
        EN_TRAITEMENT = "En cours de traitement", "En cours de traitement"
        PRE_ACCEPTEE = "Pré-acceptée", "Pré-acceptée"
        ACCEPTEE = "Acceptée", "Acceptée"
        REFUSEE = "Refusée", "Refusée"

    statut_stage = models.CharField(max_length=50, choices=Statut.choices, default=Statut.EN_ATTENTE)

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
        try:
            # ✅ Interroger directement la DB au lieu de hasattr
            convention_temp = ConventionStage.objects.filter(
                demande=self,
                est_temporaire=True
            ).first()
            
            if convention_temp and not self.convention_temporaire_id:
                Demande.objects.filter(id=self.id).update(
                    convention_temporaire=convention_temp
                )
        except Exception as e:
            logger.error(f"Erreur mise à jour convention temporaire: {e}")

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
                'nom': 'Lettre de stage à signer (PDF)',
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
        if not fichier or not fichier.name:
            return None
        
        dernier_historique = self.document_histories.filter(
            document_type=doc_type,
            nom_fichier=fichier.name
        ).order_by('-date_upload').first()
        
        if not dernier_historique:
            dernier_historique = DocumentHistory.objects.create(
                demande=self,
                document_type=doc_type,
                nom_fichier=fichier.name,
                nom_affichage=nom_affichage,
                est_modifie=False
            )
        
        statut = self.get_document_status(dernier_historique, maintenant, delai_nouveau)
        
        deja_vu = False
        if utilisateur:
            deja_vu = DocumentViewHistory.objects.filter(
                utilisateur=utilisateur,
                document_history=dernier_historique
            ).exists()
        
        # ✅ Un doc modifié reste 'modified' même s'il a été vu
        statut_final = statut
        if deja_vu and statut == 'existing':
            statut_final = 'viewed'
        # Si 'new' ou 'modified' → on garde le vrai statut
        
        return {
            'nom': nom_affichage,
            'url': fichier.url,
            'statut': statut_final,
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
        try:
            # ✅ Essayer d'abord DocumentHistory
            try:
                doc_history = DocumentHistory.objects.get(
                    id=document_history_id,
                    demande=self
                )
                DocumentViewHistory.objects.get_or_create(
                    utilisateur=utilisateur,
                    document_history=doc_history
                )
                return True
            except DocumentHistory.DoesNotExist:
                pass

            # ✅ Ensuite essayer ConventionStage
            try:
                ConventionStage.objects.get(id=document_history_id, est_temporaire=True)
                return True  # Marqué comme vu (pas de tracking fin pour conventions)
            except ConventionStage.DoesNotExist:
                pass

            return False

        except Exception:
            return False

    def get_documents(self):
        """Méthode legacy pour compatibilité - retourne la liste simple des documents"""
        documents = []
        
        # ✅ CORRECTION: Ajouter la convention temporaire
        convention_temp = self.get_convention_temporaire()
        if convention_temp and convention_temp.fichier:
            documents.append({
                'nom': 'Lettre de stage à signer',
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

# apps/stages/models.py

import uuid
import time
from django.db import models

class ConventionStage(models.Model):
    # Relation avec le stagiaire (convention finale)
    stagiaire = models.OneToOneField(
        'Stagiaire', 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True,
        related_name='conventionstage'
    )
    
    # Relation avec la demande (pour les conventions temporaires)
    demande = models.ForeignKey(
        'Demande', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='conventions_temporaires'
    )
    
    # ✅ NOUVEAU: Stagiaire d'origine pour les conventions de renouvellement
    stagiaire_origine = models.ForeignKey(
        'Stagiaire',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='conventions_renouvellement_temp',
        help_text="Stagiaire d'origine pour les conventions temporaires de renouvellement"
    )
    
    # ✅ NOUVEAU: Indique si c'est une convention de renouvellement
    est_renouvellement = models.BooleanField(
        default=False,
        help_text="Indique si cette convention concerne un renouvellement"
    )
    
    # Statut de la convention
    est_temporaire = models.BooleanField(default=False)
    
    # Dates
    date_creation = models.DateField(auto_now_add=True)
    
    # Fichier PDF
    fichier = models.FileField(upload_to='conventions/', null=True, blank=True)
    
    # Numéro unique de convention
    numero_convention = models.CharField(max_length=50, unique=True, blank=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['est_temporaire']),
            models.Index(fields=['est_renouvellement']),
            models.Index(fields=['stagiaire_origine']),
            models.Index(fields=['stagiaire']),
            models.Index(fields=['demande']),
        ]
        ordering = ['-date_creation']

    def __str__(self):
        if self.stagiaire:
            return f"Convention {self.numero_convention} - {self.stagiaire}"
        elif self.stagiaire_origine:
            return f"Convention renouvellement {self.numero_convention} - {self.stagiaire_origine}"
        elif self.demande:
            return f"Convention temporaire {self.numero_convention} - Demande {self.demande_id}"
        else:
            return f"Convention {self.numero_convention}"

    def generate_numero_convention(self):
        """Génère un numéro unique pour les conventions définitives"""
        prefix = "CEB-CONV-"
        while True:
            unique_part = uuid.uuid4().hex[:8].upper()
            numero = prefix + unique_part
            if not ConventionStage.objects.filter(numero_convention=numero).exists():
                return numero

    def generate_numero_temporaire(self, demande_id):
        """Génère un numéro pour les conventions temporaires d'acceptation"""
        prefix = "TEMP-CONV-"
        timestamp = int(time.time())
        return f"{prefix}{demande_id}-{timestamp}"

    def generate_numero_renouvellement(self, stagiaire_id):
        """Génère un numéro pour les conventions temporaires de renouvellement"""
        prefix = "RENEW-CONV-"
        timestamp = int(time.time())
        return f"{prefix}{stagiaire_id}-{timestamp}"

    def save(self, *args, **kwargs):
        if not self.numero_convention:
            if self.est_temporaire and self.est_renouvellement and self.stagiaire_origine:
                # Convention temporaire de renouvellement
                self.numero_convention = self.generate_numero_renouvellement(self.stagiaire_origine.id)
            elif self.est_temporaire and self.demande:
                # Convention temporaire d'acceptation
                self.numero_convention = self.generate_numero_temporaire(self.demande.id)
            else:
                # Convention définitive
                self.numero_convention = self.generate_numero_convention()
        super().save(*args, **kwargs)
    
    @property
    def est_valide(self):
        """Une convention est valide si elle a un stagiaire ou si c'est temporaire avec une demande ou stagiaire_origine"""
        if self.stagiaire:
            return True
        elif self.est_temporaire and self.demande:
            return True
        elif self.est_temporaire and self.est_renouvellement and self.stagiaire_origine:
            return True
        return False

    @property
    def type_convention(self):
        """Retourne le type de convention"""
        if self.stagiaire:
            return "définitive"
        elif self.est_renouvellement:
            return "renouvellement_temporaire"
        elif self.est_temporaire:
            return "acceptation_temporaire"
        return "inconnue"
    
class Diplome(models.Model):
    demande = models.ForeignKey(Demande, on_delete=models.CASCADE, related_name='diplomes')
    fichier = models.FileField(upload_to='candidatures/diplomes/')
    date_upload = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Diplôme {self.id} - {self.demande.etudiant_nom}"

# apps/stages/models.py

import uuid
import logging
from datetime import date, timedelta
from django.db import models
from django.utils import timezone

logger = logging.getLogger(__name__)

class Stagiaire(models.Model):
    demande = models.ForeignKey('Demande', on_delete=models.SET_NULL, null=True, blank=True)

    GENRE_CHOICES = [
        ('Masculin', 'Masculin'),
        ('Féminin', 'Féminin'),
        ('Autre', 'Autre'),
    ]

    STATUT_CHOICES = [
        ("À venir", "À venir"),
        ("Actuel", "Actuel"),
        ("Terminé", "Terminé"),
        ("En renouvellement", "En renouvellement"),
    ]

    RENOUVELLEMENT_STATUT_CHOICES = [
        ("Pré-renouvelé", "Pré-renouvelé"),
        ("Renouvellement finalisé", "Renouvellement finalisé"),
        ("Renouvellement annulé", "Renouvellement annulé"),
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
    
    # Champs figés pour le suivi (ne changent pas après modification de période)
    date_debut_fige = models.DateField("Date de début (figée)", null=True, blank=True)
    date_fin_fige = models.DateField("Date de fin (figée)", null=True, blank=True)
    duree_jours_fige = models.IntegerField("Durée en jours (figée)", null=True, blank=True)
    duree_mois_fige = models.IntegerField("Durée en mois (figée)", null=True, blank=True)
    
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
    
    superviseur = models.CharField(max_length=100, blank=True, null=True)
    
    # ==================== CHAMPS POUR LE RENOUVELLEMENT ====================
    
    # ÉTAPE 1: Pré-renouvellement
    pre_renouvellement_en_cours = models.BooleanField(
        default=False,
        help_text="Indique si un pré-renouvellement est en cours (étape 1)"
    )
    
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
    
    # Convention temporaire générée à l'étape 1
    convention_renouvellement_temporaire = models.ForeignKey(
        'ConventionStage', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='stagiaire_renouvellement_temporaire',
        help_text="Convention temporaire générée lors du pré-renouvellement"
    )
    
    # ÉTAPE 2: Renouvellement finalisé
    a_ete_renouvele = models.BooleanField(
        default=False, 
        help_text="Indique si ce stage a été renouvelé (après finalisation - étape 2)"
    )
    
    statut_renouvellement = models.CharField(
        max_length=50,
        choices=RENOUVELLEMENT_STATUT_CHOICES,
        null=True,
        blank=True,
        help_text="Statut détaillé du processus de renouvellement"
    )
    
    date_finalisation_renouvellement = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Date de finalisation du renouvellement (étape 2)"
    )
    
    # Lien vers le nouveau stage créé
    nouveau_stage = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='stage_origine',
        help_text="Le nouveau stage créé lors du renouvellement"
    )
    
    # Lien vers le stage d'origine (pour les stages issus d'un renouvellement)
    stage_precedent = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='renouvellements_suivants',
        help_text="Le stage précédent qui a été renouvelé pour créer celui-ci"
    )
    
    # Indique si ce stage est lui-même un renouvellement
    est_renouvellement = models.BooleanField(
        default=False,
        help_text="Indique si ce stage est un renouvellement d'un stage précédent"
    )

    class Meta:
        ordering = ['-date_debut']
        indexes = [
            models.Index(fields=['statut']),
            models.Index(fields=['pre_renouvellement_en_cours']),
            models.Index(fields=['statut_renouvellement']),
            models.Index(fields=['identifiant_groupe']),
            models.Index(fields=['a_ete_renouvele']),
        ]

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
        if self.statut_renouvellement:
            indicators.append(self.statut_renouvellement)
        
        if indicators:
            return f"{base_str} [{', '.join(indicators)}]"
        return base_str

    def save(self, *args, **kwargs):
        """Surcharge de save avec gestion des champs figés et du statut"""
        
        # Remplir les champs figés si c'est une création
        if not self.pk:
            self.remplir_champs_figes()
        
        # Gestion du statut automatique
        if self.pk:
            try:
                original = Stagiaire.objects.get(pk=self.pk)
                if original.statut != self.statut:
                    # Laisser le statut modifié manuellement
                    pass
                else:
                    self.statut = self.statut_actuel
            except Stagiaire.DoesNotExist:
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

    # ==================== PROPRIÉTÉS DE BASE ====================

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

    def remplir_champs_figes(self):
        """Remplit les champs figés avec les valeurs au moment de la création"""
        if self.date_debut and self.date_fin:
            # Date début et fin (figées)
            self.date_debut_fige = self.date_debut
            self.date_fin_fige = self.date_fin
            
            # Durée (figée)
            delta = self.date_fin - self.date_debut
            self.duree_jours_fige = delta.days
            self.duree_mois_fige = round(delta.days / 30)

    # ==================== MÉTHODES POUR LES DOCUMENTS ====================

    def get_documents(self):
        documents = []
        try:
            if self.cv and self.cv.name:
                documents.append({
                    'nom': 'Curriculum Vitae (CV)',
                    'url': self.cv.url,
                    'type': 'cv'
                })

            if self.lettre_motivation and self.lettre_motivation.name:
                documents.append({
                    'nom': 'Lettre de motivation (LM)',
                    'url': self.lettre_motivation.url,
                    'type': 'lettre_motivation'
                })

            if self.diplome and self.diplome.name:
                documents.append({
                    'nom': 'Diplôme ou Attestation',
                    'url': self.diplome.url,
                    'type': 'diplome'
                })
            elif self.demande:
                for diplome in self.demande.diplomes.all():
                    # ✅ Vérifier que le fichier existe avant .url
                    if diplome and diplome.fichier and diplome.fichier.name:
                        documents.append({
                            'nom': 'Diplôme ou Attestation',
                            'url': diplome.fichier.url,
                            'type': 'diplome'
                        })

            try:
                if hasattr(self, 'conventionstage') and self.conventionstage \
                        and self.conventionstage.fichier \
                        and self.conventionstage.fichier.name:
                    nom_convention = "Convention de renouvellement" \
                        if self.est_renouvellement else "Convention de stage"
                    documents.append({
                        'nom': nom_convention,
                        'url': self.conventionstage.fichier.url,
                        'type': 'convention'
                    })
            except Exception as e:
                logger.warning(f"Erreur convention pour stagiaire {self.id}: {e}")

            try:
                if hasattr(self, 'attestation') and self.attestation \
                        and self.attestation.fichier \
                        and self.attestation.fichier.name:
                    documents.append({
                        'nom': 'Attestation de stage',
                        'url': self.attestation.fichier.url,
                        'type': 'attestation'
                    })
            except Exception as e:
                logger.warning(f"Erreur attestation pour stagiaire {self.id}: {e}")

            if self.convention_renouvellement_temporaire \
                    and self.convention_renouvellement_temporaire.fichier \
                    and self.convention_renouvellement_temporaire.fichier.name:
                documents.append({
                    'nom': 'Convention de renouvellement (à signer)',
                    'url': self.convention_renouvellement_temporaire.fichier.url,
                    'type': 'convention_renouvellement_temp',
                    'est_temporaire': True
                })

        except Exception as e:
            logger.error(f"Erreur générale get_documents stagiaire {self.id}: {e}")

        return documents

    # ==================== MÉTHODES POUR LE RENOUVELLEMENT ====================

    @property
    def est_en_pre_renouvellement(self):
        """
        Vérifie si le stage est en cours de pré-renouvellement (étape 1)
        """
        return self.pre_renouvellement_en_cours and self.donnees_pre_renouvellement is not None

    @property
    def peut_renouveler(self):
        """
        Vérifie si le stage peut être renouvelé (pour le bouton)
        Retourne (bool, message)
        """
        # Vérification 1 : Déjà renouvelé
        if self.a_ete_renouvele:
            return False, "Ce stage a déjà été renouvelé"
        
        # Vérification 2 : Pas déjà en pré-renouvellement
        if self.est_en_pre_renouvellement:
            # Vérifier si le pré-renouvellement a expiré
            if self.verifier_expiration_pre_renouvellement():
                return True, "Pré-renouvellement expiré, vous pouvez recommencer"
            return False, "Un pré-renouvellement est déjà en cours"
        
        # Vérification 3 : Statut doit être "Terminé"
        if self.statut_actuel != "Terminé":
            return False, f"Le stage doit être terminé pour être renouvelé. Statut actuel: {self.statut_actuel}"
        
        return True, "Le stage peut être renouvelé"

    @property
    def peut_finaliser_renouvellement(self):
        """
        Vérifie si le pré-renouvellement peut être finalisé (étape 2)
        Retourne (bool, message)
        """
        if not self.est_en_pre_renouvellement:
            return False, "Aucun pré-renouvellement en cours"
        
        if not self.convention_renouvellement_temporaire:
            return False, "Convention temporaire manquante"
        
        if self.a_ete_renouvele:
            return False, "Renouvellement déjà finalisé"
        
        return True, "Prêt pour la finalisation"

    @property
    def peut_annuler_pre_renouvellement(self):
        """
        Vérifie si le pré-renouvellement peut être annulé
        """
        if not self.est_en_pre_renouvellement:
            return False, "Aucun pré-renouvellement en cours"
        
        # Option: vérifier si c'est trop vieux pour annuler
        if self.date_pre_renouvellement:
            age = (timezone.now() - self.date_pre_renouvellement).days
            if age > 7:  # Plus de 7 jours
                return False, "Pré-renouvellement trop ancien, contacter l'administrateur"
        
        return True, "Annulation possible"

    def get_info_renouvellement(self):
        """
        Retourne les informations du renouvellement en cours si applicable
        """
        if not self.est_en_pre_renouvellement or not self.donnees_pre_renouvellement:
            return None
        
        data = self.donnees_pre_renouvellement
        
        return {
            'dates': {
                'debut': data.get('date_debut'),
                'fin': data.get('date_fin'),
                'debut_iso': data.get('date_debut_iso'),
                'fin_iso': data.get('date_fin_iso'),
            },
            'affectation': {
                'direction': data.get('direction'),
                'service': data.get('service'),
                'lieu': data.get('lieu'),
            },
            'details': {
                'type_stage': data.get('type_stage'),
                'remunere': data.get('remunere', False),
                'montant': data.get('montant'),
                'notes': data.get('notes'),
            },
            'convention_temporaire': {
                'id': self.convention_renouvellement_temporaire.id if self.convention_renouvellement_temporaire else None,
                'url': self.convention_renouvellement_temporaire.fichier.url if self.convention_renouvellement_temporaire and self.convention_renouvellement_temporaire.fichier else None,
            },
            'date_demande': self.date_pre_renouvellement.strftime('%d/%m/%Y %H:%M') if self.date_pre_renouvellement else None,
            'utilisateur': data.get('user_email'),
        }

    def get_historique_renouvellements(self):
        """
        Retourne l'historique complet des renouvellements
        """
        historique = []
        
        # Récupérer tous les renouvellements successifs (en remontant)
        stage_courant = self
        while stage_courant:
            historique.append({
                'id': stage_courant.id,
                'nom_complet': f"{stage_courant.prenom} {stage_courant.nom}",
                'date_debut': stage_courant.date_debut.strftime('%d/%m/%Y'),
                'date_fin': stage_courant.date_fin.strftime('%d/%m/%Y'),
                'statut': stage_courant.statut,
                'est_renouvellement': stage_courant.est_renouvellement,
                'a_ete_renouvele': stage_courant.a_ete_renouvele,
                'pre_renouvellement_en_cours': stage_courant.pre_renouvellement_en_cours,
            })
            stage_courant = stage_courant.stage_precedent
        
        # Inverser pour avoir l'ordre chronologique
        historique.reverse()
        
        return historique

    def verifier_expiration_pre_renouvellement(self, jours_max=7):
        """
        Vérifie si le pré-renouvellement a expiré
        À appeler avant toute action de renouvellement
        """
        if not self.est_en_pre_renouvellement:
            return False
        
        if self.date_pre_renouvellement:
            age = (timezone.now() - self.date_pre_renouvellement).days
            if age > jours_max:
                # Auto-nettoyage
                self.nettoyer_pre_renouvellement()
                return True
        return False

    def nettoyer_pre_renouvellement(self, supprimer_convention=True):
        """
        Nettoie les données de pré-renouvellement (en cas d'expiration ou d'annulation)
        """
        # Supprimer la convention temporaire si demandé
        if supprimer_convention and self.convention_renouvellement_temporaire:
            try:
                conv = self.convention_renouvellement_temporaire
                if conv.fichier and conv.fichier.name:
                    conv.fichier.delete(save=False)
                conv.delete()
            except Exception as e:
                logger.error(f"Erreur suppression convention: {e}")
        
        # Nettoyer les champs
        self.pre_renouvellement_en_cours = False
        self.donnees_pre_renouvellement = None
        self.date_pre_renouvellement = None
        self.convention_renouvellement_temporaire = None
        self.statut_renouvellement = None
        
        self.save(update_fields=[
            'pre_renouvellement_en_cours',
            'donnees_pre_renouvellement', 
            'date_pre_renouvellement', 
            'convention_renouvellement_temporaire',
            'statut_renouvellement'
        ])

    def dupliquer_pour_renouvellement(self):
        """
        Crée une copie du stagiaire pour le renouvellement
        À utiliser dans FinaliserRenouvellementAPIView
        """
        if not self.est_en_pre_renouvellement or not self.donnees_pre_renouvellement:
            raise ValueError("Pas de données de pré-renouvellement disponibles")
        
        data = self.donnees_pre_renouvellement
        
        # Parser les dates
        from datetime import datetime
        try:
            date_debut = datetime.strptime(data.get('date_debut'), '%d/%m/%Y').date()
            date_fin = datetime.strptime(data.get('date_fin'), '%d/%m/%Y').date()
        except:
            date_debut = datetime.fromisoformat(data.get('date_debut_iso')).date()
            date_fin = datetime.fromisoformat(data.get('date_fin_iso')).date()
        
        # Créer le nouveau stage
        nouveau = Stagiaire(
            # Informations personnelles (copiées)
            demande=self.demande,
            photo_passeport=self.photo_passeport,
            nom=self.nom,
            prenom=self.prenom,
            email=self.email,
            telephone=self.telephone,
            niveau_etude=self.niveau_etude,
            specialite=self.specialite,
            genre=self.genre,
            etablissement=self.etablissement,
            pays_residence=self.pays_residence,
            adresse=self.adresse,
            
            # NOUVELLES données du stage
            type_stage=data.get('type_stage'),
            lieu_stage=data.get('lieu'),
            direction=data.get('direction'),
            service=data.get('service'),
            superviseur=data.get('tuteur', ''),
            date_accord=timezone.now().date(),
            date_debut=date_debut,
            date_fin=date_fin,
            remunere=data.get('remunere', False),
            montant_remuneration=data.get('montant'),
            resume_cv=self.resume_cv,
            
            # Métadonnées de renouvellement
            est_renouvellement=True,
            stage_precedent=self,
            identifiant_groupe=self.identifiant_groupe,
        )
        
        # Copier les fichiers
        def copier_fichier(ancien_fichier, nouveau_prefixe):
            if not ancien_fichier or not ancien_fichier.name:
                return None
            try:
                from django.core.files.base import ContentFile
                import os
                
                ancien_fichier.seek(0)
                contenu = ancien_fichier.read()
                nom, ext = os.path.splitext(ancien_fichier.name)
                nouveau_nom = f"{nouveau_prefixe}_{self.nom}_{self.prenom}_{int(time.time())}{ext}"
                return ContentFile(contenu, name=nouveau_nom)
            except Exception as e:
                logger.error(f"Erreur copie fichier: {e}")
                return None
        
        nouveau.cv = copier_fichier(self.cv, "cv")
        nouveau.lettre_motivation = copier_fichier(self.lettre_motivation, "lm")
        nouveau.diplome = copier_fichier(self.diplome, "diplome")
        
        return nouveau

    @property
    def peut_demander_attestation(self):
        """Vérifie si une attestation peut être demandée"""
        if self.statut_actuel not in ("Terminé", "Actuel"):
            return False, "Le stage doit être en cours ou terminé"
        
        # Vérifier si une attestation existe déjà
        try:
            if hasattr(self, 'attestation') and self.attestation and self.attestation.fichier:
                return False, "Une attestation a déjà été générée"
        except:
            pass
        
        return True, "Demande possible"

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
    class Statut(models.TextChoices):
        EN_ATTENTE = 'en_attente', 'En attente'
        APPROUVEE = 'approuvee', 'Approuvée'
        REFUSEE = 'refusee', 'Refusée'
        TRAITEE = 'traitee', 'Traitée'

    STATUT_CHOICES = Statut.choices

    stagiaire = models.OneToOneField(
        'Stagiaire',
        on_delete=models.CASCADE,
        related_name='demande_attestation'
    )

    # 📄 DOCUMENTS
    rapport_stage = models.FileField(
        upload_to='demandes_attestation/rapports/',
        help_text="Rapport de stage signé (obligatoire pour stages académiques et libres)",
        blank=True,
        null=True
    )

    demande_manuscrite = models.FileField(
        upload_to='demandes_attestation/demandes_manuscrites/',
        help_text="Demande manuscrite scannée"
    )

    # 📄 ATTESTATIONS
    attestation_generee = models.FileField(
        upload_to='demandes_attestation/attestations_generees/',
        help_text="Attestation PDF générée automatiquement",
        blank=True,
        null=True
    )

    attestation_signee = models.FileField(
        upload_to='demandes_attestation/attestations_signees/',
        help_text="Attestation scannée après signature",
        blank=True,
        null=True
    )

    date_upload_attestation_signee = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Date à laquelle l'attestation signée a été uploadée"
    )

    statut = models.CharField(
        max_length=20,
        choices=STATUT_CHOICES,
        default='en_attente'
    )

    motif_refus = models.TextField(blank=True, null=True)

    date_demande = models.DateTimeField(auto_now_add=True)
    date_traitement = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Demande attestation - {self.stagiaire} ({self.statut})"

    @property
    def attestation_finale(self):
        """Retourne l'attestation signée si disponible, sinon la générée"""
        return self.attestation_signee if self.attestation_signee else self.attestation_generee
    
    @property
    def est_finalisee(self):
        """Vérifie si la demande est finalisée (attestation signée uploadée)"""
        return self.statut == 'traitee' and bool(self.attestation_signee)

class PlanificationRapport(models.Model):
    report_id          = models.CharField(max_length=100, unique=True)
    format             = models.CharField(max_length=10, default='pdf')
    email_destinataire = models.EmailField()
    actif              = models.BooleanField(default=True)
    cree_par           = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    date_creation      = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.report_id} → {self.email_destinataire}"