# stages/routing.py
"""
Configuration des routes WebSocket pour l'application stages
"""

from django.urls import path
from . import consumers

websocket_urlpatterns = [
    path('ws/notifications/', consumers.NotificationConsumer.as_asgi()),
]