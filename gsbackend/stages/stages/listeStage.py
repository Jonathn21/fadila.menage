from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db.models import Q
from ..models import Stagiaire
from ..serializers import StagiaireSerializer
from datetime import datetime
from rest_framework.response import Response

from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from django_ratelimit.decorators import ratelimit
import logging

logger = logging.getLogger(__name__)

@method_decorator([never_cache, ratelimit(key='user', rate='60/m', method='GET')], name='dispatch')
class StageBaseAPIView(APIView):
    """Classe de base pour toutes les vues de stages"""
    permission_classes = [AllowAny]
    serializer_class = StagiaireSerializer
    # Surcharger ces attributs dans les classes filles
    statut_filter = None
    default_ordering = None
    
    # Configuration des filtres
    filters_config = {
        'q': {
            'type': 'search',
            'fields': [
                'prenom__icontains',
                'nom__icontains', 
                'email__icontains',
                'specialite__icontains',
                'niveau_etude__icontains'
            ]
        },
        'genre': {
            'type': 'exact',
            'field': 'genre',
            'ignore_value': 'Tous'
        },
        'niveau': {
            'type': 'exact', 
            'field': 'niveau_etude',
            'ignore_value': 'Tous',
            'param_name': 'etudiant_niveau'
        },
        'type_stage': {
            'type': 'exact',
            'field': 'type_stage', 
            'ignore_value': 'Tous'
        },
        'direction': {
            'type': 'icontains',
            'field': 'direction',
            'ignore_value': 'Toutes'
        },
        'service': {
            'type': 'icontains',
            'field': 'service',
            'ignore_value': 'Tous'
        },
        'date_debut': {
            'type': 'date_gte',
            'field': 'date_debut'
        },
        'date_fin': {
            'type': 'date_lte', 
            'field': 'date_fin'
        }
    }

    def parse_date(self, date_str):
        """Parse une date depuis une string"""
        try:
            return datetime.strptime(date_str, '%Y-%m-%d').date()
        except (ValueError, TypeError):
            return None

    def get_base_queryset(self):
        """Retourne le queryset de base avec le filtre de statut"""
        queryset = Stagiaire.objects.all()
        
        if self.statut_filter:
            queryset = queryset.filter(statut=self.statut_filter)
            
        if self.default_ordering:
            queryset = queryset.order_by(self.default_ordering)
            
        return queryset

    def apply_filters(self, queryset, request):
        """Applique tous les filtres configurés"""
        for param, config in self.filters_config.items():
            # Gestion du nom du paramètre dans la requête
            param_name = config.get('param_name', param)
            value = request.GET.get(param_name, "").strip()
            
            if not value:
                continue
                
            # Ignorer les valeurs spécifiques
            ignore_value = config.get('ignore_value')
            if ignore_value and value == ignore_value:
                continue
                
            # Application du filtre selon le type
            filter_type = config.get('type', 'exact')
            
            if filter_type == 'search':
                q_objects = Q()
                for field in config['fields']:
                    q_objects |= Q(**{field: value})
                queryset = queryset.filter(q_objects)
                
            elif filter_type == 'exact':
                queryset = queryset.filter(**{config['field']: value})
                
            elif filter_type == 'icontains':
                queryset = queryset.filter(**{f"{config['field']}__icontains": value})
                
            elif filter_type == 'date_gte':
                date_obj = self.parse_date(value)
                if date_obj:
                    queryset = queryset.filter(**{f"{config['field']}__gte": date_obj})
                    
            elif filter_type == 'date_lte':
                date_obj = self.parse_date(value)
                if date_obj:
                    queryset = queryset.filter(**{f"{config['field']}__lte": date_obj})
                    
        return queryset

    def get(self, request):
        """Méthode GET standardisée"""
        try:
            # Récupération et filtrage du queryset
            queryset = self.get_base_queryset()
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