# urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views2

router = DefaultRouter()

urlpatterns = [
  

    # ENTRETIENS
    path('entretiens/', views2.EntretienAPI.as_view(), name='api_entretiens'),
    path('entretiens/<int:pk>/', views2.EntretienDetailAPI.as_view(), name='api_entretien_detail'),
    path('entretiens/<int:entretien_id>/annuler/', views2.AnnulerEntretienAPI.as_view(), name='annuler_entretien'),
    path('entretiens/<int:entretien_id>/terminer/', views2.TerminerEntretienAPI.as_view(), name='terminer_entretien'),
    path('demandes/<int:demande_id>/calculer-score/', views2.CalculerScoreAPIView.as_view(), name='calculer-score'),
    path('demandes/calculer-tous-scores/', views2.CalculerTousScoresAPIView.as_view(), name='calculer-tous-scores'),
    path("demandes/<int:demande_id>/archiver/", views2.ArchiverDemandeAPIView.as_view(), name="archiver_demande_api"),
    path("demandes/<int:demande_id>/desarchiver/", views2.DesarchiverDemandeAPIView.as_view(), name="desarchiver_demande_api"),



]

urlpatterns += router.urls
