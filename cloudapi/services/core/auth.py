# OrcaCloud Authentication & Authorization Module

from rest_framework.permissions import IsAuthenticated, BasePermission
from django.contrib.auth.models import User, Group
from .base_models import UserAPIKey, Status
from django.utils import timezone


# ============================================================================
# CUSTOM PERMISSION CLASSES
# ============================================================================

class IsResourceOwner(BasePermission):
    """
    Permission class to check if user is the owner of the resource.
    Assumes resource has an 'owner' field.
    """
    message = 'You do not have permission to access this resource.'

    def has_object_permission(self, request, view, obj):
        """Check if user owns the resource."""
        return obj.owner == request.user


class IsResourceOwnerOrReadOnly(BasePermission):
    """
    Permission class allowing full access to resource owner,
    read-only access to others.
    """
    message = 'You do not have permission to modify this resource.'

    def has_object_permission(self, request, view, obj):
        """Check if user is owner or request is read-only."""
        # Read permissions for any request
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return True

        # Write permissions only for owner
        return obj.owner == request.user


class HasAPIKeyScope(BasePermission):
    """
    Permission class to check if API key has required scopes.
    Used for fine-grained API key permissions.
    """
    message = 'Your API key lacks required scopes for this operation.'

    def has_permission(self, request, view):
        """Check if authenticated user/key has required scopes."""
        # If not authenticated with API key, allow
        if not hasattr(request, 'auth') or not isinstance(request.auth, UserAPIKey):
            return True

        api_key = request.auth
        required_scope = getattr(view, 'required_scope', None)

        if required_scope is None:
            return True

        return required_scope in api_key.scopes

    def has_object_permission(self, request, view, obj):
        """Check scope for specific object."""
        if not hasattr(request, 'auth') or not isinstance(request.auth, UserAPIKey):
            return True

        api_key = request.auth
        required_scope = getattr(view, 'required_scope', None)

        if required_scope is None:
            return True

        return required_scope in api_key.scopes


class CanCreateResource(BasePermission):
    """
    Permission class to check if user can create resources.
    Checks quota and limits.
    """
    message = 'You have reached your resource creation limit.'

    def has_permission(self, request, view):
        """Check if user can create resources."""
        if request.method != 'POST':
            return True

        # Check user quota for resource type
        resource_type = view.queryset.model.__name__
        from .base_models import ResourceQuota

        try:
            quota = ResourceQuota.objects.get(
                owner=request.user,
                resource_type=resource_type
            )
            return quota.available > 0
        except ResourceQuota.DoesNotExist:
            # No quota set, allow
            return True


class CanModifyResource(BasePermission):
    """
    Permission class to check if user can modify resource.
    Checks resource state and user permissions.
    """
    message = 'Cannot modify resource in current state.'

    def has_object_permission(self, request, view, obj):
        """Check if resource state allows modification."""
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return True

        # Check ownership
        if obj.owner != request.user:
            return False

        # Check if resource allows modification in current state
        # (e.g., can't delete running instance)
        if hasattr(obj, 'status'):
            read_only_states = ['terminated', 'deleted', 'failed']
            if obj.status in read_only_states:
                self.message = f'Cannot modify {obj.__class__.__name__} in {obj.status} state.'
                return False

        return True


class IsAdminOrReadOnly(BasePermission):
    """
    Permission class for admin-only write access.
    """
    message = 'Admin access required for this operation.'

    def has_permission(self, request, view):
        """Check if user is admin or request is read-only."""
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return True

        return request.user and request.user.is_staff

    def has_object_permission(self, request, view, obj):
        """Check object-level permissions."""
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return True

        return request.user.is_staff


class HasGroupPermission(BasePermission):
    """
    Permission class based on user groups.
    Allows customizable group-based access control.
    """
    message = 'Your group does not have permission for this action.'

    # Define group permissions per action
    # Override in view with: group_permissions = {'create': ['admin'], 'delete': ['admin']}
    group_permissions = {}

    def has_permission(self, request, view):
        """Check if user's group has permission."""
        if not request.user or not request.user.is_authenticated:
            return False

        group_perms = getattr(view, 'group_permissions', self.group_permissions)
        action = view.action if hasattr(view, 'action') else 'list'
        required_groups = group_perms.get(action, [])

        if not required_groups:
            return True

        user_groups = request.user.groups.values_list('name', flat=True)
        return any(g in user_groups for g in required_groups)


# ============================================================================
# ROLE-BASED ACCESS CONTROL (RBAC)
# ============================================================================

class RBACPermission(BasePermission):
    """
    Role-Based Access Control permission class.
    Works with Django Groups to provide fine-grained access control.

    Define roles and permissions in settings:
    RBAC_ROLES = {
        'admin': ['create_instance', 'delete_instance', 'create_bucket'],
        'developer': ['create_instance', 'create_bucket'],
        'viewer': ['list_instances', 'list_buckets'],
    }
    """
    message = 'Insufficient permissions for this action.'

    # Operation to required role mapping
    operation_roles = {
        'list': ['viewer', 'developer', 'admin'],
        'retrieve': ['viewer', 'developer', 'admin'],
        'create': ['developer', 'admin'],
        'update': ['developer', 'admin'],
        'partial_update': ['developer', 'admin'],
        'destroy': ['admin'],
    }

    def has_permission(self, request, view):
        """Check if user has role for action."""
        if not request.user or not request.user.is_authenticated:
            return False

        # Get operation from view action
        action = getattr(view, 'action', 'list')
        required_roles = self.operation_roles.get(action, ['admin'])

        # Get user roles from groups
        user_roles = set(request.user.groups.values_list('name', flat=True))

        # Check if user has any required role
        return bool(user_roles & set(required_roles))

    def has_object_permission(self, request, view, obj):
        """Check object-level RBAC."""
        # For now, rely on has_permission
        # Can be extended for resource-specific RBAC
        return True


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def hash_api_key(key):
    """Hash API key for secure storage."""
    return hashlib.sha256(key.encode()).hexdigest()


def generate_api_key():
    """Generate a random API key."""
    import secrets
    return secrets.token_urlsafe(32)


def check_quota(user, resource_type, quantity=1):
    """Check if user has remaining quota for resource type."""
    from .base_models import ResourceQuota

    try:
        quota = ResourceQuota.objects.get(
            owner=user,
            resource_type=resource_type
        )
        return quota.available >= quantity
    except ResourceQuota.DoesNotExist:
        # No quota limit
        return True


def consume_quota(user, resource_type, quantity=1):
    """Consume quota for user."""
    from .base_models import ResourceQuota

    try:
        quota = ResourceQuota.objects.get(
            owner=user,
            resource_type=resource_type
        )
        quota.used += quantity
        quota.save()
        return True
    except ResourceQuota.DoesNotExist:
        return False


def release_quota(user, resource_type, quantity=1):
    """Release quota (e.g., when resource is deleted)."""
    from .base_models import ResourceQuota

    try:
        quota = ResourceQuota.objects.get(
            owner=user,
            resource_type=resource_type
        )
        quota.used = max(0, quota.used - quantity)
        quota.save()
        return True
    except ResourceQuota.DoesNotExist:
        return False
