# stages/consumers.py
import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth.models import AnonymousUser

logger = logging.getLogger(__name__)

class NotificationConsumer(AsyncWebsocketConsumer):
    """
    Consumer WebSocket avec authentification JWT via middleware
    """
    
    async def connect(self):
        """Accepter la connexion si l'utilisateur est authentifié"""
        logger.info("🔍 Tentative de connexion WebSocket reçue")
        
        try:
            # ✅ L'utilisateur est déjà authentifié par le middleware JWT
            user = self.scope.get("user")
            
            if not user or isinstance(user, AnonymousUser) or not user.is_authenticated:
                logger.warning("❌ Utilisateur non authentifié - Connexion refusée")
                await self.close(code=4003)  # Code personnalisé pour auth échouée
                return
            
            # ✅ Authentification réussie
            self.user = user
            self.room_group_name = f"user_{user.id}"
            
            # Rejoindre le groupe de l'utilisateur
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )
            
            await self.accept()
            logger.info(f"✅ WebSocket CONNECTÉ: {user.email} (ID: {user.id})")
            
            # Envoyer un message de confirmation
            await self.send(text_data=json.dumps({
                'type': 'connection_established',
                'message': f'Connecté en tant que {user.email}',
                'user_id': user.id,
                'status': 'success'
            }))
            
        except Exception as e:
            logger.error(f"❌ Erreur lors de la connexion WebSocket: {e}")
            await self.close(code=1011)

    async def disconnect(self, close_code):
        """Gérer la déconnexion"""
        if hasattr(self, 'room_group_name') and self.room_group_name:
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
        
        user_info = getattr(self, 'user', 'Anonymous')
        logger.info(f"🔌 WebSocket déconnecté: {user_info}, code: {close_code}")

    async def receive(self, text_data):
        """Recevoir un message du client"""
        try:
            text_data_json = json.loads(text_data)
            message_type = text_data_json.get('type')
            
            logger.info(f"📨 Message reçu de {getattr(self, 'user', 'Anonymous')}: {message_type}")
            
            if message_type == 'ping':
                await self.send(text_data=json.dumps({
                    'type': 'pong',
                    'message': 'pong'
                }))
                
        except Exception as e:
            logger.error(f"❌ Erreur traitement message: {e}")

    async def send_notification(self, event):
        """Envoyer une notification au client"""
        try:
            notification = event['notification']
            
            await self.send(text_data=json.dumps({
                'type': 'notification',
                'notification': notification
            }))
            
            logger.info(f"📤 Notification envoyée à {getattr(self, 'user', 'Anonymous')}")
            
        except Exception as e:
            logger.error(f"❌ Erreur envoi notification: {e}")