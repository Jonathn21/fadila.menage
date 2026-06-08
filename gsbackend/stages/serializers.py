from rest_framework import serializers
from .models import (
    Demande, Stagiaire, 
    Etablissement,  AttestationStage, ConventionStage,Notification
)


class AttestationStageSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttestationStage
        fields = '__all__'

class ConventionStageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConventionStage
        fields = '__all__'

class EtablissementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Etablissement
        fields = '__all__'

from rest_framework import serializers
from .models import Demande, Etablissement, Diplome

class EtablissementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Etablissement
        fields = ['id', 'nom', 'email', 'adresse', 'telephone']

class DiplomeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Diplome
        fields = ['id', 'fichier', 'date_upload']

class DemandeSerializer(serializers.ModelSerializer):
    etablissement = EtablissementSerializer(read_only=True)
    diplomes = DiplomeSerializer(many=True, read_only=True)
    score_badge = serializers.SerializerMethodField()
    score_color = serializers.SerializerMethodField()
    date_acceptation = serializers.DateTimeField(source='date_pre_acceptation', read_only=True)


    class Meta:
        model = Demande
        fields = [
            'id', 'tracking_id', 'etudiant_nom', 'etudiant_prenom',
            'etudiant_email','genre', 'etudiant_telephone', 'etudiant_specialite',
            'etudiant_niveau', 'type_stage', 'statut_stage', 'date_soumission',
            'etablissement', 'diplomes', 'cv', 'lettre_motivation', 'resume_cv','score_ia',
            'score_details', 'score_commentaire', 'score_date',
            'score_badge', 'score_color', 'date_acceptation'
        ]

    def get_score_badge(self, obj):
        """Retourne le label du badge selon le score"""
        if obj.score_ia >= 80:
            return "Excellent"
        elif obj.score_ia >= 60:
            return "Bon"
        elif obj.score_ia >= 40:
            return "Moyen"
        elif obj.score_ia > 0:
            return "Faible"
        else:
            return "Non évalué"
        
    def get_score_color(self, obj):
        """Retourne la couleur selon le score"""
        if obj.score_ia >= 80:
            return "success"  # Vert
        elif obj.score_ia >= 60:
            return "default"  # Bleu
        elif obj.score_ia >= 40:
            return "warning"  # Jaune
        elif obj.score_ia > 0:
            return "destructive"  # Rouge
        else:
            return "secondary"  # Gris

class StagiaireSerializer(serializers.ModelSerializer):
    attestation = AttestationStageSerializer(read_only=True)
    conventionstage = ConventionStageSerializer(read_only=True)
    documents = serializers.SerializerMethodField()

    class Meta:
        model = Stagiaire
        fields = '__all__'

    def get_documents(self, obj):
        return obj.get_documents()

from utilisateurs.models import Utilisateur, Profil, VerificationCode

class UtilisateurSerializer(serializers.ModelSerializer):
    last_login = serializers.DateTimeField(format="%Y-%m-%dT%H:%M:%S", allow_null=True)
    date_joined = serializers.DateTimeField(format="%Y-%m-%dT%H:%M:%S", allow_null=True)
    class Meta:
        model = Utilisateur
        fields = [
            'id', 'email', 'first_name', 'last_name', 'role', 
            'is_active', 'is_2fa_verified', 'last_login', 'date_joined',
        ]

class ProfilSerializer(serializers.ModelSerializer):
    user = UtilisateurSerializer(read_only=True)

    class Meta:
        model = Profil
        fields = '__all__'

class VerificationCodeSerializer(serializers.ModelSerializer):
    user = UtilisateurSerializer(read_only=True)

    class Meta:
        model = VerificationCode
        fields = '__all__'

from rest_framework import serializers
from django.contrib.auth import authenticate
from django.utils.translation import gettext_lazy as _

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        email = attrs.get("email")
        password = attrs.get("password")

        if not email or not password:
            raise serializers.ValidationError(_("Veuillez remplir tous les champs."))

        user = authenticate(email=email, password=password)
        if not user:
            raise serializers.ValidationError(_("Email ou mot de passe incorrect."))

        attrs["user"] = user
        return attrs

class ProfilSerializer(serializers.Serializer):
    first_name = serializers.CharField(source='user.first_name', required=True)
    last_name = serializers.CharField(source='user.last_name', required=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    position = serializers.CharField(source='poste', required=False, allow_blank=True)


    def update(self, instance, validated_data):
        # instance = Profil
        user_data = validated_data.get('user', {})
        instance.user.first_name = user_data.get('first_name', instance.user.first_name)
        instance.user.last_name = user_data.get('last_name', instance.user.last_name)
        instance.poste = validated_data.get('poste', instance.poste)

        instance.user.save()
        instance.save()
        return instance
    
from rest_framework import serializers
from .models import Notification

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            "id",
            "titre",
            "message",
            "url",
            "lu",
            "date_creation",
            "type",
            "icone",
            "son"
        ]

from rest_framework import serializers
from .models import UserAction

class UserActionSerializer(serializers.ModelSerializer):
    performed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = UserAction
        fields = ["id", "timestamp", "action", "performed_by_name"]

    def get_performed_by_name(self, obj):
        if obj.performed_by:
            return f"{obj.performed_by.first_name} {obj.performed_by.last_name}"
        return "Système"

from rest_framework import serializers
from .models import DemandeAttestation


class DemandeAttestationSerializer(serializers.ModelSerializer):
    class Meta:
        model = DemandeAttestation
        fields = ['stagiaire', 'rapport_stage', 'demande_manuscrite', 'statut']
        read_only_fields = ['statut']
