from .models import Utilisateur, Profil, VerificationCode
from rest_framework import serializers

class UtilisateurSerializer(serializers.ModelSerializer):
    class Meta:
        model = Utilisateur
        fields = [
            'id', 'email', 'first_name', 'last_name', 'role', 
            'is_active', 'is_2fa_verified'
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
