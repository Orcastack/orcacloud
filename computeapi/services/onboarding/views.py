# OrcaCloud – Onboarding & Dashboard Views

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth.models import User

from .models import OnboardingProgress
from .serializers import OnboardingProgressSerializer
from ..compute.models import Instance, Flavor, Image
from ..storage.models import StorageVolume
from ..networking.models import VPC, SecurityGroup


# ---------------------------------------------------------------------------
# ONBOARDING CHECKLIST
# ---------------------------------------------------------------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def onboarding_checklist(request):
    """
    GET  /api/onboarding/checklist/
    Returns (or auto-creates) the current user's onboarding progress.
    """
    progress, _ = OnboardingProgress.objects.get_or_create(user=request.user)

    # Auto-mark 'verify_email' if user is active
    if request.user.is_active and not progress.verify_email:
        progress.verify_email = True
        progress.save(update_fields=['verify_email', 'updated_at'])

    # Auto-mark 'create_vm' if user has any instances
    if not progress.create_vm:
        if Instance.objects.filter(owner=request.user).exists():
            progress.create_vm = True
            progress.save(update_fields=['create_vm', 'updated_at'])

    # Auto-mark 'attach_volume' if user has any attached volumes
    if not progress.attach_volume:
        if StorageVolume.objects.filter(owner=request.user, status='in-use').exists():
            progress.attach_volume = True
            progress.save(update_fields=['attach_volume', 'updated_at'])

    # Auto-mark 'configure_network' if user has a VPC
    if not progress.configure_network:
        if VPC.objects.filter(owner=request.user).exists():
            progress.configure_network = True
            progress.save(update_fields=['configure_network', 'updated_at'])

    serializer = OnboardingProgressSerializer(progress)
    return Response(serializer.data)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def onboarding_checklist_update(request):
    """
    PATCH /api/onboarding/checklist/
    Marks one or more checklist steps as complete/incomplete.
    Body: { "add_ssh_key": true, "explore_dashboard": true, ... }
    """
    progress, _ = OnboardingProgress.objects.get_or_create(user=request.user)
    serializer = OnboardingProgressSerializer(progress, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ---------------------------------------------------------------------------
# DASHBOARD OVERVIEW STATS
# ---------------------------------------------------------------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    """
    GET /api/onboarding/stats/
    Returns aggregated cloud resource counts for the current user's overview cards.
    """
    user = request.user

    # ---- Compute ----
    instances     = Instance.objects.filter(owner=user)
    total_vms     = instances.count()
    running_vms   = instances.filter(status='running').count()
    stopped_vms   = instances.filter(status='stopped').count()

    # ---- Storage ----
    volumes       = StorageVolume.objects.filter(owner=user)
    total_volumes = volumes.count()
    attached_vols = volumes.filter(status='in-use').count()
    detached_vols = total_volumes - attached_vols

    # ---- Networking ----
    vpcs          = VPC.objects.filter(owner=user).count()
    sec_groups    = SecurityGroup.objects.filter(owner=user).count()

    # ---- Account ----
    progress, _   = OnboardingProgress.objects.get_or_create(user=user)

    return Response({
        'compute': {
            'total_vms':   total_vms,
            'running':     running_vms,
            'stopped':     stopped_vms,
        },
        'storage': {
            'total_volumes': total_volumes,
            'attached':      attached_vols,
            'detached':      detached_vols,
        },
        'networking': {
            'vpcs':           vpcs,
            'security_groups': sec_groups,
        },
        'account': {
            'username':        user.username,
            'email':           user.email,
            'role':            'Owner' if user.is_staff else 'Developer',
            'billing_status':  'Active',
            'completion_pct':  progress.completion_pct,
        },
    })


# ---------------------------------------------------------------------------
# SERVER CREATE (alias for InstanceViewSet POST, simplified for wizard)
# ---------------------------------------------------------------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def wizard_options(request):
    """
    GET /api/onboarding/wizard-options/
    Returns images and flavors for the deploy wizard dropdowns.
    """
    images  = Image.objects.filter(is_active=True, is_public=True).values(
        'image_id', 'name', 'os_name', 'os_type', 'os_version'
    )
    flavors = Flavor.objects.filter(is_active=True).values(
        'flavor_id', 'name', 'vcpus', 'memory_mb', 'disk_gb', 'hourly_cost_usd', 'is_gpu'
    )
    networks = VPC.objects.filter(owner=request.user).values('id', 'name') if hasattr(VPC, 'name') else []

    return Response({
        'images':   list(images),
        'flavors':  list(flavors),
        'networks': list(networks),
    })
