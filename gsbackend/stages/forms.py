from django import forms
from .models import Stagiaire, Profil, Demande


class DemandeForm(forms.ModelForm):
    class Meta:
        model = Demande
        exclude = ['date_soumission', 'statut_stage', 'historique_candidature', 'traiter_candidature', 'raison_refus']
        widgets = {
            'description_stage': forms.Textarea(attrs={'rows': 3}),
            'competences_requises': forms.Textarea(attrs={'rows': 2}),
        }

class AlertPreferenceForm(forms.ModelForm):
    class Meta:
        model = Profil
        fields = ['login_alerts']


 
from django.contrib.auth.forms import PasswordChangeForm

class CustomPasswordChangeForm(PasswordChangeForm):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        self.fields['old_password'].error_messages = {
            'required': "Tu dois saisir ton mot de passe actuel.",
            'invalid': "Le mot de passe actuel est incorrect.",
        }
        self.fields['new_password1'].error_messages = {
            'required': "Tu dois choisir un nouveau mot de passe.",
            'password_too_short': "Ton mot de passe est trop court.",
            'password_too_common': "Ce mot de passe est trop courant.",
            'password_entirely_numeric': "Ton mot de passe ne peut pas être uniquement composé de chiffres.",
        }
        self.fields['new_password2'].error_messages = {
            'required': "Tu dois confirmer le nouveau mot de passe.",
        }

    def clean(self):
        cleaned_data = super().clean()
        if self.errors.get('__all__'):
            self.add_error('new_password2', "Les deux mots de passe ne correspondent pas.")
        return cleaned_data

