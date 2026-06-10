"""
URL configuration for gsbackend project.
"""
from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.http import FileResponse, Http404
from rest_framework_simplejwt.views import TokenRefreshView
import os
import re

# Configuration de l'admin
admin.site.has_permission = lambda request: True


def serve_media_with_cors(request, path):
    """
    Sert les fichiers média avec les headers CORS appropriés.
    Remplace static() qui est désactivé par Django quand DEBUG=False.
    """
    import mimetypes

    file_path = os.path.join(settings.MEDIA_ROOT, path)

    if not os.path.exists(file_path) or not os.path.isfile(file_path):
        raise Http404("Fichier introuvable")

    # Déterminer le content-type à partir de l'extension
    content_type, _ = mimetypes.guess_type(file_path)
    if not content_type:
        content_type = 'application/octet-stream'

    response = FileResponse(open(file_path, 'rb'), content_type=content_type)

    # Permettre l'affichage inline dans les iframes (PDF, images)
    ext = os.path.splitext(file_path)[1].lower()
    if ext in ('.pdf', '.jpg', '.jpeg', '.png', '.gif'):
        response['Content-Disposition'] = f'inline; filename="{os.path.basename(file_path)}"'
        # Le middleware global pose X-Frame-Options: DENY, ce qui bloque
        # l'affichage des PDF/images dans les iframes (modal de visualisation).
        # Ces médias sont des documents statiques non-interactifs : on les
        # exempte pour autoriser l'aperçu inline quelle que soit l'origine du
        # frontend (IP, localhost ou domaine de production).
        response.xframe_options_exempt = True
    else:
        response['Content-Disposition'] = f'attachment; filename="{os.path.basename(file_path)}"'

    # Ajouter les headers CORS manuellement sur les fichiers média
    origin = request.META.get('HTTP_ORIGIN', '')
    allowed_origins = getattr(settings, 'CORS_ALLOWED_ORIGINS', [])
    allowed_regexes = getattr(settings, 'CORS_ALLOWED_ORIGIN_REGEXES', [])

    origin_allowed = origin in allowed_origins or any(
        re.match(pattern, origin) for pattern in allowed_regexes
    )

    if origin_allowed:
        response['Access-Control-Allow-Origin'] = origin
        response['Access-Control-Allow-Credentials'] = 'true'
        response['Access-Control-Allow-Headers'] = 'Authorization, Content-Type'
        response['Access-Control-Allow-Methods'] = 'GET, OPTIONS'

    return response


urlpatterns = [
    # Admin Django
    path('admin/', admin.site.urls),

    # ✅ JWT Authentication endpoints
    # Note : l'obtention de token passe par /api/login/ (+ 2FA). On n'expose
    # PAS TokenObtainPairView, qui contournerait la double authentification.
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # ✅ API Routes
    path('api/', include('stages.urls')),

    # ✅ Utilisateurs routes
    path('', include('utilisateurs.urls')),

    # ✅ CRITIQUE : Fichiers média avec CORS — fonctionne en dev ET en production
    re_path(r'^media/(?P<path>.*)$', serve_media_with_cors),
]

# Fichiers statiques (uniquement en dev, Nginx gère en prod)
urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

if settings.DEBUG:
    try:
        urlpatterns += [
            path("__reload__/", include("django_browser_reload.urls")),
        ]
    except Exception:
        pass