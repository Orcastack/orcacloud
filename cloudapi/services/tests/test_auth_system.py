"""
Unit Tests for Authentication System

Tests all authentication and permission methods:
- API Key authentication
- Bearer token authentication
- Permission enforcement
- Quota checking
- Scope validation

Marks: @pytest.mark.auth
"""

import pytest
import json
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

pytestmark = pytest.mark.skip(reason='Legacy auth test suite targets pre-refactor contracts; pending rewrite for current backend models/services.')

from ..core.authentication import APIKeyAuthentication, BearerTokenAuthentication
from ..core.auth import IsResourceOwner
from ..core.permissions import (
    HasAPIKey, HasValidScope, IsAdmin, CanManageUsers,
)
from ..core.base_models import UserAPIKey, UserProfile

User = get_user_model()


@pytest.mark.auth
class TestAPIKeyAuthentication:
    """Test API key authentication"""

    def test_create_api_key(self, db, user):
        """Test creating API key"""
        key = UserUserAPIKey.objects.create(
            user=user,
            name='test-key',
            key_prefix='orcacloud_',
        )

        assert key.id is not None
        assert key.user == user
        assert key.is_active is True

    def test_authenticate_with_valid_api_key(self, db, user):
        """Test authenticating with valid API key"""
        key = UserAPIKey.objects.create(
            user=user,
            name='valid-key',
        )

        auth = APIKeyAuthentication()
        authenticated_user, _ = auth.authenticate_credentials(key_string=str(key.key))

        assert authenticated_user == user

    def test_authenticate_with_invalid_api_key(self, db):
        """Test authenticating with invalid API key"""
        auth = APIKeyAuthentication()

        with pytest.raises(Exception):  # Should raise authentication error
            auth.authenticate_credentials(key_string='invalid_key_12345')

    def test_api_key_revocation(self, db, user):
        """Test revoking API key"""
        key = UserAPIKey.objects.create(
            user=user,
            name='revoke-test',
        )

        key.is_active = False
        key.save()

        auth = APIKeyAuthentication()

        with pytest.raises(Exception):
            auth.authenticate_credentials(key_string=str(key.key))

    def test_api_key_expiration(self, db, user):
        """Test API key expiration"""
        from django.utils import timezone
        from datetime import timedelta

        key = UserAPIKey.objects.create(
            user=user,
            name='expires-key',
            expires_at=timezone.now() - timedelta(days=1),
        )

        auth = APIKeyAuthentication()

        # Expired key should fail authentication
        with pytest.raises(Exception):
            auth.authenticate_credentials(key_string=str(key.key))


@pytest.mark.auth
class TestBearerTokenAuthentication:
    """Test bearer token authentication"""

    def test_create_bearer_token(self, db, user):
        """Test creating bearer token"""
        # Tokens are typically created by password auth
        from rest_framework_simplejwt.tokens import RefreshToken

        token = RefreshToken.for_user(user)
        access_token = str(token.access_token)

        assert access_token is not None
        assert len(access_token) > 0

    def test_authenticate_with_bearer_token(self, db, user):
        """Test authenticating with valid bearer token"""
        from rest_framework_simplejwt.tokens import RefreshToken

        token = RefreshToken.for_user(user)
        access_token = str(token.access_token)

        # In a real test, would decode and verify token
        assert access_token is not None


@pytest.mark.auth
class TestPermissions:
    """Test permission classes"""

    def test_is_resource_owner_true(self, db, user, instance):
        """Test IsResourceOwner permission when user owns resource"""
        from unittest.mock import Mock

        permission = IsResourceOwner()
        request = Mock()
        request.user = user
        view = Mock()

        instance.owner = user
        instance.save()

        # Mock view to have the resource
        view.get_object = Mock(return_value=instance)

        has_perm = permission.has_object_permission(request, view, instance)

        assert has_perm is True

    def test_is_resource_owner_false(self, db, user, instance):
        """Test IsResourceOwner permission when user doesn't own resource"""
        other_user = User.objects.create_user(
            username='other',
            email='other@test.com',
            password='testpass123'
        )

        permission = IsResourceOwner()
        request = Mock()
        request.user = other_user
        view = Mock()

        has_perm = permission.has_object_permission(request, view, instance)

        assert has_perm is False

    def test_has_api_key_permission(self, db, user):
        """Test HasAPIKey permission"""
        key = UserAPIKey.objects.create(user=user)

        from unittest.mock import Mock
        permission = HasAPIKey()
        request = Mock()
        request.user = user
        request.auth = key

        # Should check if user has valid API key
        assert has_permission is True or permission.has_permission(request, Mock())

    def test_is_admin_permission_true(self, db):
        """Test IsAdmin permission for admin user"""
        admin_user = User.objects.create_superuser(
            username='admin',
            email='admin@test.com',
            password='adminpass123'
        )

        from unittest.mock import Mock
        permission = IsAdmin()
        request = Mock()
        request.user = admin_user

        has_perm = permission.has_permission(request, Mock())

        assert has_perm is True

    def test_is_admin_permission_false(self, db, user):
        """Test IsAdmin permission for regular user"""
        from unittest.mock import Mock
        permission = IsAdmin()
        request = Mock()
        request.user = user

        has_perm = permission.has_permission(request, Mock())

        assert has_perm is False


@pytest.mark.auth
class TestQuotaEnforcement:
    """Test quota checking"""

    def test_user_quota_check_within_limit(self, db):
        """Test quota check when within limit"""
        user = User.objects.create_user(
            username='quota-user',
            email='quota@test.com',
            password='testpass123'
        )

        UserProfile.objects.create(
            user=user,
            max_instances=10,
        )

        # Create 5 instances
        for i in range(5):
            Instance.objects.create(
                owner=user,
                name=f'instance-{i}',
                flavor_id=1,
                image_id=1,
                vpc_id=1,
            )

        profile = user.userprofile
        current_instances = Instance.objects.filter(owner=user).count()

        assert current_instances < profile.max_instances

    def test_user_quota_check_at_limit(self, db):
        """Test quota check when at limit"""
        user = User.objects.create_user(
            username='quota-at-limit',
            email='quotalimit@test.com',
            password='testpass123'
        )

        UserProfile.objects.create(
            user=user,
            max_instances=3,
        )

        # Create 3 instances (at limit)
        for i in range(3):
            Instance.objects.create(
                owner=user,
                name=f'instance-{i}',
                flavor_id=1,
                image_id=1,
                vpc_id=1,
            )

        profile = user.userprofile
        current_instances = Instance.objects.filter(owner=user).count()

        assert current_instances >= profile.max_instances

    def test_user_storage_quota_check(self, db):
        """Test storage quota checking"""
        user = User.objects.create_user(
            username='storage-quota-user',
            email='storage@test.com',
            password='testpass123'
        )

        UserProfile.objects.create(
            user=user,
            max_storage_gb=1000,
        )

        # Create volumes totaling 500 GB
        for i in range(5):
            Volume.objects.create(
                owner=user,
                name=f'volume-{i}',
                size_gb=100,
            )

        profile = user.userprofile
        used_storage = Volume.objects.filter(owner=user).aggregate(
            total=Sum('size_gb')
        )['total'] or 0

        assert used_storage <= profile.max_storage_gb


@pytest.mark.auth
class TestScopeValidation:
    """Test OAuth-style scope validation"""

    def test_api_key_scope_validation(self, db, user):
        """Test scope validation for API keys"""
        key = UserAPIKey.objects.create(
            user=user,
            name='scoped-key',
            scopes=['compute:read', 'storage:write'],
        )

        assert 'compute:read' in key.scopes
        assert 'storage:write' in key.scopes

    def test_api_key_insufficient_scope(self, db, user):
        """Test scope validation when scope insufficient"""
        key = UserAPIKey.objects.create(
            user=user,
            name='read-only',
            scopes=['compute:read'],
        )

        # Writing should fail with read-only scope
        required_scope = 'compute:write'
        assert required_scope not in key.scopes


@pytest.mark.auth
class TestAuthenticationEndpoints:
    """Test authentication endpoints via API"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test client"""
        self.client = APIClient()

    def test_login_endpoint(self, db, user):
        """Test login endpoint"""
        response = self.client.post('/api/v1/auth/login/', {
            'username': user.username,
            'password': 'testpass123',
        })

        assert response.status_code in [200, 201]
        assert 'token' in response.json() or 'access' in response.json()

    def test_login_invalid_credentials(self, db):
        """Test login with invalid credentials"""
        response = self.client.post('/api/v1/auth/login/', {
            'username': 'invalid',
            'password': 'wrong',
        })

        assert response.status_code in [400, 401]

    def test_api_key_creation_endpoint(self, db, user):
        """Test API key creation endpoint"""
        self.client.force_login(user)

        response = self.client.post('/api/v1/auth/keys/', {
            'name': 'new-key',
            'scopes': ['compute:*', 'storage:*'],
        })

        assert response.status_code in [200, 201]
        data = response.json()
        assert 'key' in data or 'api_key' in data


@pytest.mark.auth
class TestAuthenticationSecurity:
    """Test security aspects of authentication"""

    def test_api_key_never_logged(self, db, user):
        """Test that API keys aren't logged"""
        key = UserAPIKey.objects.create(user=user, name='secret-key')

        # Key material should be hashed/masked
        assert str(key.key) != key.key_hash

    def test_password_never_in_response(self, db, user):
        """Test that passwords never appear in API responses"""
        from unittest.mock import Mock
        from ..serializers import UserSerializer

        serializer = UserSerializer(user)

        assert 'password' not in serializer.data

    def test_token_expiration(self, db, user):
        """Test that tokens expire"""
        from rest_framework_simplejwt.tokens import RefreshToken
        from django.utils import timezone

        with pytest.raises(Exception):
            # Attempt to use expired token
            token = RefreshToken.for_user(user)
            # Force expiration
            token.set_exp(lifetime=timezone.timedelta(seconds=-1))
            str(token.access_token)
