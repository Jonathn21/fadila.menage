"""
API de gestion des adresses email recevant les notifications des nouvelles
demandes de stage. Réservée aux super-utilisateurs.
"""
import logging

from django.core.exceptions import ValidationError
from django.core.validators import validate_email

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from utilisateurs.permissions import IsSuperUtilisateur

from ..models import EmailNotificationDemande

logger = logging.getLogger(__name__)


def _serialize(obj):
    return {
        "id": obj.id,
        "email": obj.email,
        "actif": obj.actif,
        "date_ajout": obj.date_ajout.isoformat() if obj.date_ajout else None,
        "ajoute_par": obj.ajoute_par.email if obj.ajoute_par else None,
    }


class NotificationEmailsAPIView(APIView):
    """GET : liste des emails configurés. POST : ajoute un email."""
    permission_classes = [IsAuthenticated, IsSuperUtilisateur]

    def get(self, request):
        emails = EmailNotificationDemande.objects.all()
        return Response([_serialize(e) for e in emails], status=status.HTTP_200_OK)

    def post(self, request):
        email = (request.data.get("email") or "").strip().lower()

        if not email:
            return Response(
                {"detail": "L'adresse email est requise."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            validate_email(email)
        except ValidationError:
            return Response(
                {"detail": "Adresse email invalide."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if EmailNotificationDemande.objects.filter(email=email).exists():
            return Response(
                {"detail": "Cette adresse email est déjà configurée."},
                status=status.HTTP_409_CONFLICT,
            )

        obj = EmailNotificationDemande.objects.create(
            email=email,
            ajoute_par=request.user,
        )
        logger.info(f"✅ Email notification ajouté : {email} par {request.user.email}")
        return Response(_serialize(obj), status=status.HTTP_201_CREATED)


class NotificationEmailDetailAPIView(APIView):
    """PATCH : active/désactive un email. DELETE : supprime un email."""
    permission_classes = [IsAuthenticated, IsSuperUtilisateur]

    def patch(self, request, email_id):
        try:
            obj = EmailNotificationDemande.objects.get(pk=email_id)
        except EmailNotificationDemande.DoesNotExist:
            return Response(
                {"detail": "Email introuvable."},
                status=status.HTTP_404_NOT_FOUND,
            )

        actif = request.data.get("actif")
        if actif is not None:
            obj.actif = bool(actif)
            obj.save(update_fields=["actif"])

        return Response(_serialize(obj), status=status.HTTP_200_OK)

    def delete(self, request, email_id):
        try:
            obj = EmailNotificationDemande.objects.get(pk=email_id)
        except EmailNotificationDemande.DoesNotExist:
            return Response(
                {"detail": "Email introuvable."},
                status=status.HTTP_404_NOT_FOUND,
            )

        email = obj.email
        obj.delete()
        logger.info(f"🗑️ Email notification supprimé : {email} par {request.user.email}")
        return Response(status=status.HTTP_204_NO_CONTENT)
