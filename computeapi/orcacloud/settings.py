"""
OrcaCloud Django Settings
"""
import os
import importlib.util
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get('SECRET_KEY', 'MOVrc6WdlfmO+Kuev1soPXr+8peVrEPNgpkKawjk+hyI7F79I6Bh3KSmFLRngXvG')
DEBUG = os.environ.get('DEBUG', 'True') == 'True'
ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', 'localhost,127.0.0.1,0.0.0.0').split(',')

INSTALLED_APPS = [
    'daphne',                           # ASGI server — must be first
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'channels',                         # WebSocket support
    'rest_framework',
    'rest_framework.authtoken',
    'corsheaders',
    'services',
    'services.groups',
    'services.pipelines',
    'services.containers',
    'services.kubernetes_integration',
    'services.deployments',
    'services.workspace',
    'services.provisioning',
    'services.docs',
    'services.ai',
    'services.regions',
    'services.catalog',
    'services.enterprise',
]

HAS_GRAPHENE_DJANGO = importlib.util.find_spec('graphene_django') is not None
if HAS_GRAPHENE_DJANGO:
    INSTALLED_APPS.append('graphene_django')

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'orcacloud.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'orcacloud.wsgi.application'
ASGI_APPLICATION = 'orcacloud.asgi.application'

# Django Channels — Redis layer in production, in-memory for dev
_REDIS_URL = os.environ.get('REDIS_URL', '')
if _REDIS_URL:
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels_redis.core.RedisChannelLayer',
            'CONFIG': {
                'hosts': [_REDIS_URL],
            },
        }
    }
else:
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels.layers.InMemoryChannelLayer',
        }
    }

# Database — SQLite for local dev, PostgreSQL for production
DATABASE_URL = os.environ.get('DATABASE_URL', '')

if DATABASE_URL.startswith('postgresql://'):
    import urllib.parse
    parsed = urllib.parse.urlparse(DATABASE_URL)
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': parsed.path[1:],
            'USER': parsed.username,
            'PASSWORD': parsed.password,
            'HOST': parsed.hostname,
            'PORT': parsed.port or 5432,
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

# Cache — Redis if available, local memory fallback
REDIS_URL = os.environ.get('REDIS_URL', '')
if REDIS_URL:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.redis.RedisCache',
            'LOCATION': REDIS_URL,
        }
    }
else:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Django REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'services.core.jwt_auth.JWTAuthentication',
        'services.core.authentication.APIKeyAuthentication',
        'services.core.authentication.SharedCookieTokenAuthentication',
        'rest_framework.authentication.TokenAuthentication',
        # SessionAuthentication removed: it enforces CSRF on every POST,
        # which breaks token-based API clients that don't carry a CSRF cookie.
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'DEFAULT_RENDERER_CLASSES': [
        'services.core.api_envelope.VersionedEnvelopeJSONRenderer',
        'rest_framework.renderers.BrowsableAPIRenderer',
    ],
    'EXCEPTION_HANDLER': 'services.core.api_envelope.versioned_exception_handler',
    'DEFAULT_SCHEMA_CLASS': 'rest_framework.schemas.openapi.AutoSchema',
    'PAGE_SIZE': 20,
    'DEFAULT_THROTTLE_RATES': {
        'domain_search': '30/minute',
        'auth': '20/minute',
        'anon': '120/minute',
        'user': '600/minute',
    },
}

# CSRF – trust React dev server, localhost, and production domains
_CSRF_EXTRA = [o.strip() for o in os.environ.get('CORS_ALLOWED_ORIGINS', '').split(',') if o.strip()]
CSRF_TRUSTED_ORIGINS = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:8000',
    'http://127.0.0.1:8000',
    'https://orcastack.org',
    'https://www.orcastack.org',
    'https://api.orcastack.org',
] + [o for o in _CSRF_EXTRA if o not in [
    'http://localhost:3000', 'http://127.0.0.1:3000',
    'https://orcastack.org', 'https://www.orcastack.org',
]]

# CORS — driven by env in production, permissive in dev
_cors_env = os.environ.get('CORS_ALLOWED_ORIGINS', '')
CORS_ALLOWED_ORIGINS = [
    o.strip() for o in _cors_env.split(',') if o.strip()
] if _cors_env else [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:8080',
]
CORS_ALLOW_CREDENTIALS = True

# Share auth across app subdomains in production; keep local cookies host-only.
AUTH_COOKIE_DOMAIN = os.environ.get('AUTH_COOKIE_DOMAIN', '') or None
CORS_ALLOW_ALL_ORIGINS = DEBUG  # In dev allow all origins for convenience

# ── Message Broker (RabbitMQ) ────────────────────────────────────────────────
RABBITMQ_URL = os.environ.get('RABBITMQ_URL', 'amqp://admin:MOVrc6WdlfmO+Kuev1soPXr+8peVrEPNgpkKawjk+hyI7F79I6Bh3KSmFL@localhost:5672/')

# ── Kafka ────────────────────────────────────────────────────────────────────
KAFKA_BOOTSTRAP_SERVERS = os.environ.get('KAFKA_BOOTSTRAP_SERVERS', 'localhost:9092')
KAFKA_ENABLED = os.environ.get('KAFKA_ENABLED', 'false').lower() == 'true'

# ── Prometheus Pushgateway ───────────────────────────────────────────────────
PROMETHEUS_PUSHGATEWAY_URL = os.environ.get('PROMETHEUS_PUSHGATEWAY_URL', '')

# ── OpenStack Integration ────────────────────────────────────────────────────
OPENSTACK_AUTH_URL   = os.environ.get('OS_AUTH_URL', '')
OPENSTACK_USERNAME   = os.environ.get('OS_USERNAME', '')
OPENSTACK_PASSWORD   = os.environ.get('OS_PASSWORD', '')
OPENSTACK_PROJECT    = os.environ.get('OS_PROJECT_NAME', '')
OPENSTACK_CLOUD      = os.environ.get('OS_CLOUD', 'orcacloud')
OPENSTACK_REGION     = os.environ.get('OS_REGION_NAME', 'RegionOne')

if HAS_GRAPHENE_DJANGO:
    GRAPHENE = {
        'SCHEMA': 'services.core.graphql_schema.schema',
    }
