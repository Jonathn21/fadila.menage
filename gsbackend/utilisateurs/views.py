from django.shortcuts import render
from django.contrib import messages
from django.core.mail import send_mail
from django.shortcuts import render, redirect 
from django.contrib.auth import authenticate, login, logout,update_session_auth_hash
from django.http import JsonResponse
from django.conf import settings
from django.urls import reverse
from django.contrib.auth.forms import PasswordChangeForm
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_POST
from stages.models import Notification
from django.views.decorators.csrf import csrf_exempt
import random, re ,json
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode,urlsafe_base64_decode
from django.utils.encoding import force_bytes,force_str
from .models import Utilisateur,Profil


@require_POST
@login_required
def toggle_2fa(request):
    if request.headers.get("x-requested-with") != "XMLHttpRequest":
        return JsonResponse({'status': 'error', 'message': 'Requête invalide'}, status=400)

    try:
        data = json.loads(request.body)
        enable = bool(data.get('enabled'))

        profil = request.user.profil
        profil.two_factor_enabled = enable
        profil.save()

        # Répondre immédiatement
        response = JsonResponse({'status': 'ok'})

        # Puis lancer les tâches asynchrones (exemple simplifié)
        from threading import Thread
        def post_actions():
            if profil.email_securite:
                send_mail(
                    subject="Changement de l'authentification à deux facteurs",
                    message=(
                        f"Bonjour {request.user.first_name},\n\n"
                        f"L’authentification à deux facteurs a été {'activée' if enable else 'désactivée'} pour votre compte.\n"
                        "Si vous n’êtes pas à l’origine de ce changement, contactez immédiatement le support."
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[request.user.email],
                    fail_silently=True,
                )
            if profil.push_securite:
                Notification.objects.create(
                    user=request.user,
                    titre="2FA modifié",
                    message=f"L'authentification à deux facteurs a été {'activée' if enable else 'désactivée'} pour votre compte.",
                    type="securite",
                    icone="shield",
                )
        Thread(target=post_actions).start()

        return response

    except Exception as e:
        return JsonResponse({'status': 'error', 'message': f"Erreur : {str(e)}"}, status=500)



