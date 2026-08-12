from dataclasses import dataclass

from django.db.models import QuerySet
from django.shortcuts import get_object_or_404
from rest_framework.exceptions import PermissionDenied

from services.enterprise.models import Organization, OrganizationMember


@dataclass
class TenantContext:
    scope: str = 'developer'
    organization: Organization | None = None
    created_by_role: str = 'developer'
    created_from_dashboard: str = 'developer'
    parent_context_id: str = ''


def resolve_tenant_context(request) -> TenantContext:
    org_ref = (
        request.headers.get('X-Organization')
        or request.query_params.get('organization')
        or request.data.get('organization') if hasattr(request, 'data') else None
    )
    dashboard = (
        request.headers.get('X-Dashboard-Context')
        or request.query_params.get('dashboard')
        or request.data.get('dashboard') if hasattr(request, 'data') else None
        or ('enterprise' if org_ref else 'developer')
    )

    if org_ref:
        org = _get_permitted_organization(request, org_ref)
        return TenantContext(
            scope='enterprise',
            organization=org,
            created_by_role='enterprise',
            created_from_dashboard='enterprise',
            parent_context_id=org.id,
        )

    if dashboard == 'group':
        parent_context_id = (
            request.headers.get('X-Parent-Context-Id')
            or request.query_params.get('parent_context_id')
            or request.data.get('parent_context_id') if hasattr(request, 'data') else ''
        ) or ''
        return TenantContext(
            scope='group',
            created_by_role='developer',
            created_from_dashboard='group',
            parent_context_id=parent_context_id,
        )

    return TenantContext()


class TenantScopedViewSetMixin:
    owner_field = 'owner'

    def get_tenant_context(self) -> TenantContext:
        if not hasattr(self, '_tenant_context_cache'):
            self._tenant_context_cache = resolve_tenant_context(self.request)
        return self._tenant_context_cache

    def filter_queryset_by_tenant(self, queryset: QuerySet, owner_field: str | None = None) -> QuerySet:
        tenant = self.get_tenant_context()
        model = queryset.model
        field_names = {field.name for field in model._meta.get_fields()}
        effective_owner_field = owner_field or self.owner_field

        if owner_field or effective_owner_field in field_names:
            queryset = queryset.filter(**{effective_owner_field: self.request.user})

        if 'organization' in field_names and tenant.organization is not None:
            queryset = queryset.filter(organization=tenant.organization)

        if 'created_from_dashboard' in field_names:
            queryset = queryset.filter(created_from_dashboard=tenant.created_from_dashboard)

        if tenant.parent_context_id and 'parent_context_id' in field_names:
            queryset = queryset.filter(parent_context_id=tenant.parent_context_id)

        return queryset

    def build_tenant_create_kwargs(self, model) -> dict:
        tenant = self.get_tenant_context()
        field_names = {field.name for field in model._meta.get_fields()}
        kwargs = {}

        if self.owner_field in field_names:
            kwargs[self.owner_field] = self.request.user
        if 'organization' in field_names and tenant.organization is not None:
            kwargs['organization'] = tenant.organization
        if 'created_by_role' in field_names:
            kwargs['created_by_role'] = tenant.created_by_role
        if 'created_from_dashboard' in field_names:
            kwargs['created_from_dashboard'] = tenant.created_from_dashboard
        if 'parent_context_id' in field_names:
            kwargs['parent_context_id'] = tenant.parent_context_id
        return kwargs


def _get_permitted_organization(request, org_ref: str) -> Organization:
    try:
        org = Organization.objects.get(pk=org_ref)
    except Organization.DoesNotExist:
        org = get_object_or_404(Organization, slug=org_ref)

    if org.owner == request.user:
        return org

    is_active_member = org.members.filter(
        user=request.user,
        status=OrganizationMember.Status.ACTIVE,
    ).exists()
    if not is_active_member:
        raise PermissionDenied('You are not a member of this organization.')

    return org
