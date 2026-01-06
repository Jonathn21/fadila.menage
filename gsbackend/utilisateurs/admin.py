from django.contrib import admin
from .models import Utilisateur,Profil
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _
from django import forms

# Register your models here.
# Formulaire personnalisé pour créer un utilisateur sans champ "username"
class UtilisateurCreationForm(forms.ModelForm):
    password1 = forms.CharField(label='Mot de passe', widget=forms.PasswordInput)
    password2 = forms.CharField(label='Confirmer mot de passe', widget=forms.PasswordInput)

    class Meta:
        model = Utilisateur
        fields = ("email", "role")

    def clean_password2(self):
        p1 = self.cleaned_data.get("password1")
        p2 = self.cleaned_data.get("password2")
        if p1 and p2 and p1 != p2:
            raise forms.ValidationError("Les mots de passe ne correspondent pas")
        return p2

    def save(self, commit=True):
        user = super().save(commit=False)
        user.set_password(self.cleaned_data["password1"])
        if commit:
            user.save()
        return user

class UtilisateurChangeForm(forms.ModelForm):
    class Meta:
        model = Utilisateur
        fields = ("email", "role", "first_name", "last_name", "is_active")

class CustomUserAdmin(BaseUserAdmin):
    add_form = UtilisateurCreationForm
    form = UtilisateurChangeForm
    model = Utilisateur
    list_display = ("email", "first_name", "last_name", "role", "is_active")
    list_filter = ("role", "is_active")
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Infos personnelles", {"fields": ("first_name", "last_name")}),
        ("Permissions", {"fields": ("role", "is_active")}),
    )
    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("email", "role", "password1", "password2", "is_active"),
        }),
    )
    search_fields = ("email", "first_name", "last_name")
    ordering = ("email",)
    def has_module_permission(self, request):
        # Autorise seulement les superutilisateurs
        return request.user.is_authenticated and request.user.role == "SUPERUTILISATEUR"

    def has_view_permission(self, request, obj=None):
        return request.user.is_authenticated and request.user.role == "SUPERUTILISATEUR"

    def has_add_permission(self, request):
        return request.user.is_authenticated and request.user.role == "SUPERUTILISATEUR"

    def has_change_permission(self, request, obj=None):
        return request.user.is_authenticated and request.user.role == "SUPERUTILISATEUR"

    def has_delete_permission(self, request, obj=None):
        return request.user.is_authenticated and request.user.role == "SUPERUTILISATEUR"

admin.site.register(Utilisateur, CustomUserAdmin)
admin.site.register(Profil)