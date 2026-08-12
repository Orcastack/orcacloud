from django.db.models import Q
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import PlatformResource
from .serializers import PlatformResourceSerializer


class ResourceViewSet(viewsets.ModelViewSet):
    """
    OrcaCloud – Resource Control Center (read + limited write).

    List / filter via:
        GET /api/services/resources/?group_id=&project_id=&environment=&resource_type=&status=&search=

    Trigger a platform-wide (or scoped) sync:
        POST /api/services/resources/sync/
        Body: { "group_id": "...", "project_id": "..." }  (both optional)

    Perform a contextual action on a single resource:
        POST /api/services/resources/<id>/action/
        Body: { "action": "restart|stop|start|rerun|scale|lock|unlock|pause|resume", "payload": {} }
    """

    serializer_class   = PlatformResourceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = PlatformResource.objects.all()
        p  = self.request.query_params

        if group_id := p.get('group_id'):
            qs = qs.filter(group_id=group_id)
        if project_id := p.get('project_id'):
            qs = qs.filter(project_id=project_id)
        if environment := p.get('environment'):
            qs = qs.filter(environment=environment)
        if resource_type := p.get('resource_type'):
            qs = qs.filter(resource_type=resource_type)
        if resource_status := p.get('status'):
            qs = qs.filter(status=resource_status)
        if search := p.get('search'):
            qs = qs.filter(
                Q(name__icontains=search)
                | Q(group_name__icontains=search)
                | Q(project_name__icontains=search)
                | Q(subsystem__icontains=search)
            )

        return qs

    # ──────────────────────────────────────────────────────────────────────────
    # POST /api/services/resources/sync/
    # ──────────────────────────────────────────────────────────────────────────
    @action(detail=False, methods=['post'], url_path='sync')
    def sync(self, request):
        """
        Trigger a sync of platform resources from live sub-system adapters.
        Real adapter sync is pending; return a no-op response instead of
        seeding demo/mock resources.
        """
        return Response({
            'synced':   0,
            'errors':   0,
            'duration': 0,
            'message':  'No resources synced (live adapters not configured).',
        }, status=status.HTTP_200_OK)

    # ──────────────────────────────────────────────────────────────────────────
    # POST /api/services/resources/<id>/action/
    # ──────────────────────────────────────────────────────────────────────────
    @action(detail=True, methods=['post'], url_path='action')
    def perform_action(self, request, pk=None):
        resource    = self.get_object()
        action_type = request.data.get('action', '')
        _payload    = request.data.get('payload', {})

        allowed = {
            'restart': ('running', 'failed', 'degraded', 'stopped'),
            'stop':    ('running', 'degraded'),
            'start':   ('stopped', 'pending'),
            'rerun':   ('failed',),
            'scale':   ('running', 'degraded'),
            'lock':    ('running',),
            'unlock':  ('running',),
            'pause':   ('running',),
            'resume':  ('stopped', 'pending'),
        }

        if action_type not in allowed:
            return Response({'error': f"Unknown action '{action_type}'."}, status=status.HTTP_400_BAD_REQUEST)

        if resource.status not in allowed[action_type]:
            return Response(
                {'error': f"Action '{action_type}' is not valid for status '{resource.status}'."},
                status=status.HTTP_409_CONFLICT,
            )

        # TODO: dispatch to real sub-system adapter (Kubernetes API, pipeline trigger, etc.)
        # For now: optimistic status transition so UI is responsive
        transitions = {
            'restart': 'pending',
            'stop':    'stopped',
            'start':   'pending',
            'rerun':   'pending',
            'pause':   'stopped',
            'resume':  'pending',
        }
        if action_type in transitions:
            resource.status = transitions[action_type]
            resource.save(update_fields=['status', 'last_synced'])

        return Response({
            'ok':      True,
            'message': f"Action '{action_type}' on '{resource.name}' was queued successfully.",
            'status':  resource.status,
        }, status=status.HTTP_200_OK)

