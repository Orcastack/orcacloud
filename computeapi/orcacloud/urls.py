from django.contrib import admin
from django.urls import path, include, re_path
from django.contrib.staticfiles.views import serve as static_serve
from rest_framework.authtoken.views import obtain_auth_token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from django.views.decorators.csrf import csrf_exempt
import os
import json
from django.conf import settings
from rest_framework.schemas import get_schema_view
from services.api.portal_views import ApiPortalLandingView
from services.api.docs_views import swagger_ui_view, redoc_view
from services.api.telemetry_views import telemetry_endpoint
from services.core.jwt_auth import issue_tokens_for_user
from services.core.jwt_views import TokenRefreshView

try:
    from graphene_django.views import GraphQLView
except Exception:
    GraphQLView = None


schema_view = get_schema_view(
    title='OrcaCloud Unified API',
    description='Versioned API surface for compute, storage, networking, identity, billing, monitoring, and automation.',
    version='v1',
    public=True,
)


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    return Response({'status': 'ok', 'service': 'orcacloud-backend'})


@api_view(['GET'])
@permission_classes([AllowAny])
def api_index(request):
    version = 'v1'
    base = f'/api/{version}'
    return Response(
        {
            'name': 'OrcaCloud Unified API',
            'version': version,
            'status': 'ok',
            'domains': {
                'identity': f'{base}/auth/',
                'services': f'{base}/services/',
                'enterprise': f'{base}/enterprise/',
                'graphql': f'{base}/graphql/',
                'telemetry': f'{base}/telemetry/',
                'health': f'{base}/health/',
            },
        }
    )


def _serialize_user(user):
    return {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'user_type': getattr(user, 'profile', None) and 'individual' or 'individual',
    }


def _build_auth_response(user, token):
    return {
        'message': 'Authentication successful.',
        'token': token.key,
        'user': _serialize_user(user),
        **issue_tokens_for_user(user),
    }


def _set_shared_auth_cookie(response, token):
    response.set_cookie(
        'orca_auth_token',
        token.key,
        domain=getattr(settings, 'AUTH_COOKIE_DOMAIN', None),
        secure=not settings.DEBUG,
        httponly=True,
        samesite='Lax',
        max_age=60 * 60 * 24 * 30,
        path='/',
    )
    return response


@csrf_exempt
@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def login_view(request):
    if request.method == 'GET':
        return Response(
            {
                'detail': 'Use POST to log in.',
                'required_fields': ['email', 'password'],
                'example': {
                    'email': 'developer@orcacloud.com',
                    'password': 'your-password',
                },
            }
        )

    email = request.data.get('email', '')
    password = request.data.get('password', '')

    # Try username=email first, then try to find user by email
    user = authenticate(username=email, password=password)
    if user is None:
        try:
            u = User.objects.get(email=email)
            user = authenticate(username=u.username, password=password)
        except User.DoesNotExist:
            pass

    if user is None or not user.is_active:
        return Response({'detail': 'Invalid credentials.'}, status=400)

    token, _ = Token.objects.get_or_create(user=user)
    return _set_shared_auth_cookie(Response(_build_auth_response(user, token)), token)


@csrf_exempt
@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def signup_view(request):
    if request.method == 'GET':
        return Response(
            {
                'detail': 'Use POST to create an account.',
                'required_fields': ['email', 'password'],
                'optional_fields': ['username', 'first_name', 'last_name'],
                'example': {
                    'email': 'developer@orcacloud.com',
                    'password': 'strong-password',
                    'username': 'developer',
                },
            }
        )

    username = request.data.get('username', '')
    email = request.data.get('email', '')
    password = request.data.get('password', '')
    first_name = request.data.get('first_name', '')
    last_name = request.data.get('last_name', '')

    if not email or not password:
        return Response({'detail': 'Email and password are required.'}, status=400)

    if User.objects.filter(email=email).exists():
        return Response({'detail': 'A user with this email already exists.'}, status=400)

    user = User.objects.create_user(
        username=username or email,
        email=email,
        password=password,
        first_name=first_name,
        last_name=last_name,
    )
    token, _ = Token.objects.get_or_create(user=user)
    return _set_shared_auth_cookie(Response(_build_auth_response(user, token), status=201), token)


@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def logout_view(request):
    response = Response({'message': 'Logged out.'})
    response.delete_cookie(
        'orca_auth_token',
        domain=getattr(settings, 'AUTH_COOKIE_DOMAIN', None),
        path='/',
    )
    return response


@api_view(['GET'])
def current_user_view(request):
    user = request.user
    return Response(_serialize_user(user))


@api_view(['GET', 'PATCH'])
def profile_view(request):
    """GET or PATCH the authenticated user's profile."""
    user = request.user
    if request.method == 'GET':
        return Response(_serialize_user(user))

    # PATCH — update only provided fields
    first_name = request.data.get('first_name', user.first_name)
    last_name  = request.data.get('last_name',  user.last_name)
    email      = request.data.get('email',      user.email)
    new_password = request.data.get('new_password', '')

    # Validate email uniqueness if changing
    if email != user.email and User.objects.filter(email=email).exclude(pk=user.pk).exists():
        return Response({'detail': 'A user with this email already exists.'}, status=400)

    user.first_name = first_name
    user.last_name  = last_name
    user.email      = email
    if new_password:
        current_password = request.data.get('current_password', '')
        if not user.check_password(current_password):
            return Response({'detail': 'Current password is incorrect.'}, status=400)
        user.set_password(new_password)
    user.save()

    return Response(_serialize_user(user))


@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def graphql_unavailable(request):
    return Response(
        {
            'detail': 'GraphQL endpoint is unavailable because graphene_django is not installed in the active environment.',
            'hint': 'Install dependencies from backend/requirements.txt in this environment.',
        },
        status=503,
    )


urlpatterns = [
    path('', ApiPortalLandingView.as_view(), name='api-portal-home'),
    path('admin/', admin.site.urls),
    path('api/', api_index, name='api-index'),
    path('api/health/', health_check),
    path('api/telemetry/', telemetry_endpoint),
    path('api/auth/login/', login_view),
    path('api/auth/signup/', signup_view),
    path('api/auth/register/', signup_view),  # alias
    path('api/auth/me/', current_user_view),
    path('api/auth/user/', current_user_view),  # alias
    path('api/auth/profile/', profile_view),
    path('api/auth/logout/', logout_view),
    path('api/v1/', api_index, name='api-v1-index'),
    path('api/v1/health/', health_check),
    path('api/v1/telemetry/', telemetry_endpoint),
    path('api/v1/auth/login/', login_view),
    path('api/v1/auth/signup/', signup_view),
    path('api/v1/auth/register/', signup_view),
    path('api/v1/auth/me/', current_user_view),
    path('api/v1/auth/user/', current_user_view),
    path('api/v1/auth/profile/', profile_view),
    path('api/v1/auth/logout/', logout_view),
    path('api/v1/auth/token/refresh/', TokenRefreshView.as_view(), name='api-v1-token-refresh'),
    path(
        'api/graphql/',
        GraphQLView.as_view(graphiql=settings.DEBUG) if GraphQLView else graphql_unavailable,
    ),
    path(
        'api/v1/graphql/',
        GraphQLView.as_view(graphiql=settings.DEBUG) if GraphQLView else graphql_unavailable,
    ),
    path('api/v1/schema/', schema_view, name='api-v1-schema'),
    path('api/v1/docs/swagger/', swagger_ui_view, name='api-v1-swagger'),
    path('api/v1/docs/redoc/', redoc_view, name='api-v1-redoc'),
    # Git smart-HTTP endpoint — handles clone / fetch / push
    re_path(r'^repos/(?P<repo_path>.+)$',
            __import__('services.pipelines.git_http', fromlist=['git_http_backend_view']).git_http_backend_view),
    path('api/services/', include('services.api.urls')),
    path('api/v1/services/', include('services.api.urls')),
    path('api/enterprise/', include('services.enterprise.urls')),
    path('api/v1/enterprise/', include('services.enterprise.urls')),
]

# Gunicorn does not serve static files. For local demos/dev we serve /static/
# through Django's staticfiles finders so the API portal landing page works.
if settings.DEBUG or os.environ.get('SERVE_STATIC', 'True') == 'True':
    urlpatterns += [
        re_path(r'^static/(?P<path>.*)$', static_serve, kwargs={'insecure': True}),
    ]

if settings.DEBUG:
    # Silently swallow webpack HMR polling requests that leak into Django when
    # the browser has a stale bundle (e.g. after a dev-server restart).
    # Returns 204 No Content so the browser stops spamming the log.
    from django.http import HttpResponse

    def _hmr_sink(request, **kwargs):
        return HttpResponse(status=204)

    urlpatterns += [
        re_path(r'^.*\.hot-update\.(js|json|js\.map)$', _hmr_sink),
    ]
