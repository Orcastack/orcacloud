"""
Permission classes for OrcaCloud services.
Re-exports existing permissions from auth.py and adds missing ones.
"""
from rest_framework.permissions import BasePermission
from .auth import IsResourceOwner, IsResourceOwnerOrReadOnly, HasAPIKeyScope


class HasAPIKey(BasePermission):
    """Allow access only to requests authenticated with a valid API key."""
    message = 'A valid API key is required.'

    def has_permission(self, request, view):
        from .base_models import UserAPIKey
        auth = getattr(request, 'auth', None)
        if auth is None:
            return False
        return isinstance(auth, UserAPIKey) and auth.is_active


class HasValidScope(HasAPIKeyScope):
    """Alias for HasAPIKeyScope — checks that an API key has the required scope."""
    pass


class IsAdmin(BasePermission):
    """Allow access only to staff / superuser accounts."""
    message = 'Administrator access required.'

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (request.user.is_staff or request.user.is_superuser)
        )


class CanManageUsers(BasePermission):
    """Allow access to admins or users in the 'user_managers' group."""
    message = 'You do not have permission to manage users.'

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_staff or request.user.is_superuser:
            return True
        return request.user.groups.filter(name='user_managers').exists()


__all__ = [
    'IsResourceOwner',
    'IsResourceOwnerOrReadOnly',
    'HasAPIKey',
    'HasValidScope',
    'IsAdmin',
    'CanManageUsers',
]
