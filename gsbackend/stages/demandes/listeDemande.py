from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.core.paginator import Paginator, EmptyPage
from django.db.models import Q
from ..models import Demande
from ..serializers import DemandeSerializer
from utilisateurs.permissions import HasPermission, PERM_DEMANDES_VIEW

from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from django_ratelimit.decorators import ratelimit
import logging

logger = logging.getLogger(__name__)

@method_decorator([never_cache, ratelimit(key='user', rate='60/m', method='GET')], name='dispatch')
class DemandeBaseAPIView(APIView):
    """Classe de base pour toutes les vues de demande"""
    permission_classes = [IsAuthenticated, HasPermission(PERM_DEMANDES_VIEW)]
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

    # Champs de tri autorisés (protection contre l'injection d'ordering)
    ordering_whitelist = {
        'etudiant_nom', 'etudiant_prenom', 'etudiant_specialite',
        'etudiant_niveau', 'type_stage', 'statut_stage',
        'date_soumission', 'genre',
    }

    def apply_ordering(self, queryset, request):
        """Tri côté serveur : ?ordering=champ ou ?ordering=-champ (whitelist)."""
        ordering = request.GET.get('ordering', '').strip()
        if ordering and ordering.lstrip('-') in self.ordering_whitelist:
            return queryset.order_by(ordering)
        return queryset

    def get(self, request):
        """GET avec filtres, tri et pagination serveur optionnelle.

        Sans paramètre `page`, renvoie la liste complète (rétro-compatible).
        Avec `page` (et `page_size`, max 100), renvoie la page demandée :
        {count, num_pages, page, results}.
        """
        try:
            queryset = self.get_queryset()
            queryset = self.apply_filters(queryset, request)
            queryset = self.apply_ordering(queryset, request)

            page_param = request.GET.get('page', '').strip()
            if page_param:
                try:
                    page_size = min(max(int(request.GET.get('page_size', 10)), 1), 100)
                    paginator = Paginator(queryset, page_size)
                    page = paginator.page(min(max(int(page_param), 1), max(paginator.num_pages, 1)))
                except (ValueError, EmptyPage):
                    return Response({"error": "Paramètres de pagination invalides"}, status=400)

                serializer = self.serializer_class(page.object_list, many=True)
                return Response({
                    "count": paginator.count,
                    "num_pages": paginator.num_pages,
                    "page": page.number,
                    "results": serializer.data,
                })

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
