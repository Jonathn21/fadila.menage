"""
URL configuration for gsbackend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

# Configuration de l'admin
admin.site.has_permission = lambda request: True

urlpatterns = [
    # Admin Django
    path('admin/', admin.site.urls),
    
    # ✅ JWT Authentication endpoints
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # ✅ API Routes
    path('api/', include('stages.urls')),
    
    # ✅ Utilisateurs routes (si nécessaires)
    path('', include('utilisateurs.urls')),
]

# ✅ CRITIQUE : Servir les fichiers média et static en mode DEBUG
if settings.DEBUG:
    # Servir les fichiers média (uploads, documents, photos)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    
    # Servir les fichiers statiques (CSS, JS, images)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    
    # Django browser reload (si installé)
    try:
        urlpatterns += [
            path("__reload__/", include("django_browser_reload.urls")),
        ]
    except:
        pass  # Ignore si django_browser_reload n'est pas installé