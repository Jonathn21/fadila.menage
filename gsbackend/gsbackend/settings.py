"""
Django settings for gsbackend project.
"""

from pathlib import Path
import os
from datetime import timedelta
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
TEMPLATE_DIR = os.path.join(BASE_DIR, 'templates')

load_dotenv()

# ======================
# DJANGO CONFIG
# ======================
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'django-insecure-lo8@=+2uy^&!0ksxfx3*%4e4qg+gnx4kax-nxrw(ri(u9+rxbw')
DEBUG = os.environ.get('DJANGO_DEBUG', 'True').lower() == 'true'

# ✅ CORRECTION BUG 2 : pas de schéma (http/https) dans ALLOWED_HOSTS
ALLOWED_HOSTS = [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    'backend',
    '185.158.5.60',
    'gestion-stageemploi.pages.dev',
    'api.cebnet.org',
    'stageemploi.cebnet.org',   # ← sans "https://"
]

# Ajouter dynamiquement les domaines Cloudflare
if os.environ.get('DJANGO_ALLOWED_HOSTS'):
    env_hosts = os.environ.get('DJANGO_ALLOWED_HOSTS').split(',')
    for host in env_hosts:
        host = host.strip()
        if host and host not in ALLOWED_HOSTS:
            if '.trycloudflare.com' in host:
                ALLOWED_HOSTS.append(host)

CSRF_TRUSTED_ORIGINS = os.environ.get(
    "CSRF_TRUSTED_ORIGINS",
    "http://localhost:8080,http://127.0.0.1:8080,http://127.0.0.1:8000,https://gestion-stageemploi.pages.dev,https://stageemploi.cebnet.org,https://api.cebnet.org"
).split(",")

# ======================
# INSTALLED APPS
# ======================
INSTALLED_APPS = [
    'daphne',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.humanize',

    'django_otp',
    'django_otp.plugins.otp_static',
    'django_otp.plugins.otp_totp',
    'django_otp.plugins.otp_email',
    'two_factor',

    'channels',
    'django_apscheduler',

    'stages',
    'utilisateurs',

    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
]

# ======================
# ASGI / WSGI
# ======================
ASGI_APPLICATION = 'gsbackend.asgi.application'
WSGI_APPLICATION = 'gsbackend.wsgi.application'

# ======================
# CHANNELS
# ======================
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [("redis", 6379)],
        },
    },
} if os.environ.get('DOCKERIZED', False) else {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer",
    }
}

# ======================
# REST FRAMEWORK / JWT
# ======================
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# ======================
# CORS
# ✅ CORRECTION BUG 3 : supprimer CORS_ALLOW_ALL_ORIGINS=True
# car il désactive CORS_ALLOW_CREDENTIALS et CORS_ALLOWED_ORIGINS
# ======================
CORS_ALLOWED_ORIGINS = os.environ.get(
    "CORS_ALLOWED_ORIGINS",
    "http://localhost:8080,http://127.0.0.1:8080,http://127.0.0.1:8000,https://gestion-stageemploi.pages.dev,https://stageemploi.cebnet.org"
).split(",")

CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https://\w+\.cebnet\.org$",
    r"^http://\w+\.cebnet\.org$",
]

CORS_ALLOW_CREDENTIALS = True

CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]

# ======================
# MIDDLEWARE
# ======================
MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",   # ✅ Toujours en premier
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

# ======================
# ROOT / TEMPLATES
# ======================
ROOT_URLCONF = 'gsbackend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [TEMPLATE_DIR],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
                'stages.context_processors.sidebar_counts',
            ],
        },
    },
]

# ======================
# DATABASE
# ======================
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': os.environ.get('DB_NAME', 'dbgestage'),
        'USER': os.environ.get('DB_USER', 'root'),
        'PASSWORD': os.environ.get('DB_PASSWORD', ''),
        'HOST': os.environ.get('DB_HOST', 'localhost'),
        'PORT': os.environ.get('DB_PORT', '3306'),
    }
}

if os.environ.get('DB_HOST') == 'db':
    DATABASES['default']['HOST'] = 'db'
    DATABASES['default']['PORT'] = '3306'

# ======================
# AUTH
# ======================
AUTH_USER_MODEL = 'utilisateurs.Utilisateur'
LOGIN_URL = '/login/'
LOGOUT_REDIRECT_URL = 'login'

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# ======================
# INTERNATIONALIZATION
# ======================
LANGUAGE_CODE = 'fr-FR'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# ======================
# STATIC / MEDIA
# En production (Cloudflare Pages), les requêtes /media/ sur le domaine
# frontend sont interceptées par le SPA. MEDIA_URL doit pointer vers
# api.cebnet.org pour que Django génère des URLs de téléchargement valides.
# ======================
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

MEDIA_URL  = os.environ.get('MEDIA_URL', '/media/')
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ======================
# EMAIL
# ======================
EMAIL_BACKEND     = os.environ.get('EMAIL_BACKEND', 'django.core.mail.backends.smtp.EmailBackend')
EMAIL_HOST        = os.environ.get('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT        = int(os.environ.get('EMAIL_PORT', '587'))
EMAIL_USE_TLS     = os.environ.get('EMAIL_USE_TLS', 'true').lower() == 'true'
EMAIL_HOST_USER   = os.environ.get('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL  = os.environ.get('DEFAULT_FROM_EMAIL', EMAIL_HOST_USER)

# ======================
# FRONTEND
# ======================
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:8080')

# ======================
# CLOUD / REVERSE PROXY
# ======================
USE_X_FORWARDED_HOST = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# ======================
# SESSIONS / CSRF
# ======================
SESSION_COOKIE_AGE      = 3600
SESSION_COOKIE_SECURE   = not DEBUG
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'

CSRF_COOKIE_SECURE   = not DEBUG
CSRF_COOKIE_HTTPONLY = True

# ======================
# GEMINI
# ======================
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
GEMINI_AVAILABLE_MODELS = [
    "models/gemini-2.0-flash",
    "models/gemini-2.0-flash-001",
    "models/gemini-2.5-flash",
    "models/gemini-flash-latest",
    "models/gemini-pro-latest",
    "models/gemini-2.0-flash-lite",
]

# ======================
# LOGGING
# ======================
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose':   {'format': '{levelname} {asctime} {module} {message}', 'style': '{'},
        'simple':    {'format': '{levelname} {message}', 'style': '{'},
        'websocket': {'format': '{levelname} {asctime} [WebSocket] {message}', 'style': '{'},
    },
    'handlers': {
        'console':           {'class': 'logging.StreamHandler', 'formatter': 'verbose'},
        'websocket_console': {'class': 'logging.StreamHandler', 'formatter': 'websocket'},
    },
    'root': {'handlers': ['console'], 'level': 'INFO'},
    'loggers': {
        'django':           {'handlers': ['console'],           'level': 'INFO',  'propagate': False},
        'channels':         {'handlers': ['console'],           'level': 'INFO',  'propagate': False},
        'daphne':           {'handlers': ['console'],           'level': 'INFO',  'propagate': False},
        'stages':           {'handlers': ['console'],           'level': 'DEBUG', 'propagate': False},
        'stages.consumers': {'handlers': ['websocket_console'], 'level': 'DEBUG', 'propagate': False},
        'stages.middleware':{'handlers': ['websocket_console'], 'level': 'DEBUG', 'propagate': False},
    },
}

# ======================
# WEBSOCKET
# ======================
ASGI_THREADS = 4

DATA_UPLOAD_MAX_MEMORY_SIZE = 20 * 1024 * 1024   
FILE_UPLOAD_MAX_MEMORY_SIZE = 20 * 1024 * 1024