from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q
from ..models import Demande
from ..serializers import DemandeSerializer

from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from django_ratelimit.decorators import ratelimit
import logging

logger = logging.getLogger(__name__)

@method_decorator([never_cache, ratelimit(key='user', rate='60/m', method='GET')], name='dispatch')
class DemandeBaseAPIView(APIView):
    """Classe de base pour toutes les vues de demande"""
    permission_classes = [IsAuthenticated]
    serializer_class = DemandeSerializer
    # Surcharger ces attributs dans les classes filles
    base_queryset = Demande.objects.all()
    default_ordering = "-date_soumission"
    filters_config = {
        'q': {
            'fields': [
                'etudiant_prenom__icontains',
                'etudiant_nom__icontains', 
                'etudiant_email__icontains',
                'etudiant_specialite__icontains',
                'etudiant_niveau__icontains'
            ]
        },
        'genre': {'field': 'genre'},
        'niveau': {'field': 'etudiant_niveau'},
        'specialite': {'field': 'etudiant_specialite'},
        'type_stage': {'field': 'type_stage'},
        'statut_stage': {'field': 'statut_stage'}
    }

    def get_queryset(self):
        """Retourne le queryset de base avec ordering"""
        queryset = self.base_queryset
        if hasattr(self, 'default_ordering') and self.default_ordering:
            queryset = queryset.order_by(self.default_ordering)
        return queryset

    def apply_filters(self, queryset, request):
        """Applique tous les filtres configurés"""
        filters = {}
        
        for param, config in self.filters_config.items():
            value = request.GET.get(param, '').strip()
            if value:
                if param == 'q' and 'fields' in config:
                    # Filtre de recherche globale
                    q_objects = Q()
                    for field in config['fields']:
                        q_objects |= Q(**{field: value})
                    queryset = queryset.filter(q_objects)
                elif 'field' in config:
                    # Filtre simple
                    filters[config['field']] = value
        
        if filters:
            queryset = queryset.filter(**filters)
            
        return queryset

    def get(self, request):
        """Méthode GET standardisée"""
        try:
            # Récupération et filtrage du queryset
            queryset = self.get_queryset()
            queryset = self.apply_filters(queryset, request)

            # Sérialisation
            serializer = self.serializer_class(queryset, many=True)

            return Response({
                "count": len(serializer.data),
                "results": serializer.data
            })
            
        except Exception as e:
            logger.error(f"Erreur dans {self.__class__.__name__}: {str(e)}")
            return Response(
                {"error": "Une erreur s'est produite lors du traitement de la requête"},
                status=500
            )
