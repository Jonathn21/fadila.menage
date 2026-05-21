
import logging



from django.shortcuts import get_object_or_404

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response

from ..models import (
    Notification
)



import os
from dotenv import load_dotenv

load_dotenv()



logger = logging.getLogger(__name__)

import os
from django.conf import settings
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.cache import never_cache
import time
from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from django_ratelimit.decorators import ratelimit
import logging

logger = logging.getLogger(__name__)


class NotificationsAPI(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Récupérer les notifications récentes de l'utilisateur"""
        try:
            limit = request.GET.get('limit', None)
            notifications = Notification.objects.filter(user=request.user).order_by('-date_creation')
            
            if limit and str(limit).isdigit():
                notifications = notifications[:int(limit)]
                
            unread_count = Notification.objects.filter(user=request.user, lu=False).count()

            notifications_data = [
                {
                    "id": n.id,
                    "titre": n.titre,
                    "message": n.message,
                    "url": n.url,
                    "lu": n.lu,
                    "date_creation": n.date_creation.isoformat(),
                    "type": n.type,
                    "icone": n.icone,
                }
                for n in notifications
            ]

            return Response({
                "notifications": notifications_data,
                "unread_count": unread_count,
                "total_count": notifications.count()
            })
        except Exception as e:
            logger.error(f"Erreur lors de la récupération des notifications: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class AllNotificationsAPI(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Récupérer toutes les notifications (pour la page dédiée)"""
        try:
            notifications = Notification.objects.filter(user=request.user).order_by('-date_creation')
            unread_count = Notification.objects.filter(user=request.user, lu=False).count()

            notifications_data = [
                {
                    "id": n.id,
                    "titre": n.titre,
                    "message": n.message,
                    "url": n.url,
                    "lu": n.lu,
                    "date_creation": n.date_creation.isoformat(),
                    "type": n.type,
                    "icone": n.icone,
                }
                for n in notifications
            ]

            return Response({
                "notifications": notifications_data,
                "unread_count": unread_count,
                "total_count": notifications.count()
            })
        except Exception as e:
            logger.error(f"Erreur lors de la récupération de toutes les notifications: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class MarkAllNotificationsReadAPI(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        """Marquer toutes les notifications comme lues"""
        try:
            # ✅ CORRECTION : Ne PAS créer de nouvelles notifications ici !
            updated_count = Notification.objects.filter(
                user=request.user, 
                lu=False
            ).update(lu=True)
            
            return Response({
                "success": True,
                "message": f"{updated_count} notifications marquées comme lues",
                "updated_count": updated_count
            })
        except Exception as e:
            logger.error(f"Erreur lors du marquage de toutes comme lues: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class MarkNotificationReadAPI(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        """Marquer une notification spécifique comme lue"""
        try:
            notification = Notification.objects.get(id=pk, user=request.user)
            
            # ✅ CORRECTION : Ne pas créer de notification supplémentaire
            if not notification.lu:
                notification.lu = True
                notification.save()
            
            return Response({
                "success": True,
                "message": "Notification marquée comme lue"
            })
        except Notification.DoesNotExist:
            return Response(
                {"error": "Notification non trouvée"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Erreur lors du marquage comme lu: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class DeleteNotificationAPI(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        """Supprimer une notification spécifique"""
        try:
            notification = Notification.objects.get(id=pk, user=request.user)
            notification.delete()
            
            return Response({
                "success": True,
                "message": "Notification supprimée"
            })
        except Notification.DoesNotExist:
            return Response(
                {"error": "Notification non trouvée"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Erreur lors de la suppression: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class DeleteAllNotificationsAPI(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        """Supprimer toutes les notifications"""
        try:
            deleted_count, _ = Notification.objects.filter(user=request.user).delete()
            
            return Response({
                "success": True,
                "message": f"{deleted_count} notifications supprimées",
                "deleted_count": deleted_count
            })
        except Exception as e:
            logger.error(f"Erreur lors de la suppression de toutes: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
class NotificationDetailAPI(APIView):
    """API pour récupérer les détails d'une notification spécifique"""
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            # Récupérer la notification pour l'utilisateur connecté
            notification = get_object_or_404(Notification, pk=pk, user=request.user)
            
            # Sérialiser les données
            notification_data = {
                "id": notification.id,
                "titre": notification.titre,
                "message": notification.message,
                "url": notification.url,
                "lu": notification.lu,
                "date_creation": notification.date_creation.isoformat(),
                "type": notification.type,
                "icone": notification.icone,
                "expediteur": getattr(notification, 'expediteur', None),
            }

            return Response({
                "notification": notification_data
            }, status=status.HTTP_200_OK)
            
        except Notification.DoesNotExist:
            logger.warning(f"Notification non trouvée - ID: {pk}, User: {request.user.id}")
            return Response({
                "error": "Notification non trouvée",
                "message": "La notification que vous recherchez n'existe pas ou vous n'y avez pas accès"
            }, status=status.HTTP_404_NOT_FOUND)
            
        except Exception as e:
            logger.error(f"Erreur lors de la récupération de la notification {pk}: {str(e)}")
            return Response({
                "error": str(e),
                "message": "Erreur lors de la récupération de la notification"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
