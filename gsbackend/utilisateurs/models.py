
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.utils.timezone import now

class UtilisateurManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("L'utilisateur doit avoir un email.")
        email = self.normalize_email(email)
        extra_fields.setdefault("role", "Utilisateur")
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password, **extra_fields):
        extra_fields.setdefault("role", "Superutilisateur")
        return self.create_user(email, password, **extra_fields)

class Utilisateur(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = [
        ("Utilisateur", "Utilisateur"),
        ("Admin", "Admin"),
        ("Superutilisateur", "Superutilisateur"),
        
    ]

    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=30, blank=True)
    last_name = models.CharField(max_length=30, blank=True)
    is_active = models.BooleanField(default=True)

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="Utilisateur")
    date_joined = models.DateTimeField(auto_now_add=True)   # création du compte
    last_login = models.DateTimeField(blank=True, null=True)

    # Champs 2FA
    is_2fa_verified = models.BooleanField(default=False)
    two_fa_code = models.CharField(max_length=6, blank=True, null=True)
    two_fa_expiration = models.DateTimeField(blank=True, null=True)
    two_fa_attempts = models.IntegerField(default=0)
    last_2fa_sent = models.DateTimeField(null=True, blank=True)  # Protection anti-spam


    objects = UtilisateurManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []  # pas de username

    def __str__(self):
        return self.email

    @property
    def is_staff(self):
        return self.role in ["Admin", "Superutilisateur"]

    @property
    def is_superuser(self):
        return self.role == "Superutilisateur"
    
  

    def has_perm(self, perm, obj=None):
        return True

    def has_module_perms(self, app_label):
        return True




    
import random
from django.db import models
from django.utils import timezone
from datetime import timedelta

class VerificationCode(models.Model):
    user = models.ForeignKey(Utilisateur, on_delete=models.CASCADE)
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)

    def is_expired(self):
        return timezone.now() > self.created_at + timedelta(minutes=10)

    def __str__(self):
        return f"{self.user.email} - {self.code}"


class Profil(models.Model):
    user = models.OneToOneField(Utilisateur, on_delete=models.CASCADE)
    poste = models.CharField(max_length=100, blank=True)
    login_alerts = models.BooleanField(default=True)
    email_securite = models.BooleanField(default=True)
    email_maj = models.BooleanField(default=False)
    push_connexion = models.BooleanField(default=True)
    push_securite = models.BooleanField(default=True)
    push_maj = models.BooleanField(default=False)
    two_factor_enabled = models.BooleanField(default=False)
    totp_secret = models.CharField(max_length=32, blank=True, null=True)  # base32 secret key



    def __str__(self):
        return f"Profil de {self.user.first_name} {self.user.last_name}"