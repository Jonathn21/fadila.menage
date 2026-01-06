# stages/middleware.py
import logging
from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import TokenError
from urllib.parse import parse_qs

logger = logging.getLogger(__name__)
User = get_user_model()

class JWTAuthMiddleware(BaseMiddleware):
    """
    Middleware d'authentification WebSocket avec JWT
    """
    
    async def __call__(self, scope, receive, send):
        if scope["type"] == "websocket":
            try:
                query_string = scope.get('query_string', b'').decode('utf-8')
                query_params = parse_qs(query_string)
                token = query_params.get('token', [None])[0]
                
                if token:
                    logger.info(f"🔍 Token JWT trouvé: {token[:20]}...")
                    user = await self.get_user_from_jwt(token)
                    scope["user"] = user
                    
                    if user and user.is_authenticated:
                        logger.info(f"✅ WebSocket authentifié: {user.email} (ID: {user.id})")
                    else:
                        logger.warning("⚠️ Token JWT invalide")
                        scope["user"] = AnonymousUser()
                else:
                    logger.warning("🚫 Aucun token JWT")
                    scope["user"] = AnonymousUser()
                    
            except Exception as e:
                logger.error(f"❌ Erreur JWT WebSocket: {e}")
                scope["user"] = AnonymousUser()
        
        return await super().__call__(scope, receive, send)
    
    @database_sync_to_async
    def get_user_from_jwt(self, token):
        try:
            access_token = AccessToken(token)
            user_id = access_token['user_id']
            user = User.objects.get(id=user_id)
            return user
        except (TokenError, User.DoesNotExist) as e:
            logger.error(f"❌ Erreur validation: {e}")
            return AnonymousUser()

def JWTAuthMiddlewareStack(inner):
    return JWTAuthMiddleware(inner)

