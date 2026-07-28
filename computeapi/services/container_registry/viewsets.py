# OrcaCloud – Container Registry ViewSets

import random
import uuid
import hashlib
from datetime import timedelta

from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import (
    ContainerRepository, ContainerImage, RegistryToken,
    ReplicationRule, RegistryUsage, REGION_CHOICES, generate_token,
)
from .serializers import (
    ContainerRepositoryListSerializer, ContainerRepositoryDetailSerializer,
    ContainerImageSerializer, RegistryTokenSerializer,
    ReplicationRuleSerializer, RegistryUsageSerializer,
    CreateRepositorySerializer, CreateTokenSerializer,
)


def _fake_digest(tag: str, repo_name: str) -> str:
    raw = f"{repo_name}:{tag}:{uuid.uuid4()}".encode()
    return 'sha256:' + hashlib.sha256(raw).hexdigest()


def _seed_images(repo: ContainerRepository):
    """Seed a realistic set of mock image tags for demo purposes."""
    tags_data = [
        ('latest', 'amd64', 38.2, 4, 'clean'),
        ('v1.0.0', 'amd64', 37.5, 4, 'clean'),
        ('v0.9.1', 'amd64', 35.1, 3, 'clean'),
        ('v0.8.0', 'amd64', 34.0, 3, 'vulnerable'),
        ('dev',    'amd64', 40.1, 5, 'pending'),
    ]
    total_mb = 0.0
    for tag, arch, size, layers, scan in tags_data:
        vuln = {'critical': 0, 'high': 0, 'medium': 0, 'low': 0}
        if scan == 'vulnerable':
            vuln = {'critical': 1, 'high': 2, 'medium': 3, 'low': 5}
        ContainerImage.objects.get_or_create(
            repository=repo, tag=tag,
            defaults=dict(
                digest=_fake_digest(tag, repo.name),
                size_mb=size, architecture=arch, os='linux',
                pushed_by=repo.owner.username,
                scan_status=scan,
                vulnerability_count=vuln,
                layer_count=layers,
            ),
        )
        total_mb += size

    repo.image_count = ContainerImage.objects.filter(repository=repo).count()
    repo.storage_mb  = round(total_mb, 2)
    repo.push_count  = len(tags_data)
    repo.pull_count  = random.randint(20, 500)
    repo.last_pushed_at = timezone.now()
    repo.save(update_fields=['image_count', 'storage_mb', 'push_count', 'pull_count', 'last_pushed_at'])

    # Seed usage record
    RegistryUsage.objects.create(
        repository=repo,
        storage_gb=round(total_mb / 1024, 4),
        pull_count=repo.pull_count,
        push_count=repo.push_count,
        transfer_gb=round(total_mb * repo.pull_count / 1024, 4),
        hourly_cost_usd=round((total_mb / 1024) * 0.023 / 720, 6),
    )


class ContainerRepositoryViewSet(viewsets.ModelViewSet):
    """
    CRUD + lifecycle actions for container repositories.

    list        GET  /registries/
    create      POST /registries/
    retrieve    GET  /registries/{id}/
    destroy     DEL  /registries/{id}/
    images      GET  /registries/{id}/images/
    delete_tag  DEL  /registries/{id}/delete_tag/
    tokens      GET  /registries/{id}/tokens/
    create_token POST /registries/{id}/create_token/
    revoke_token POST /registries/{id}/revoke_token/
    replication GET  /registries/{id}/replication/
    replicate   POST /registries/{id}/replicate/
    usage       GET  /registries/{id}/usage/
    scan        POST /registries/{id}/scan/
    regions     GET  /registries/regions/
    """

    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ContainerRepository.objects.filter(
            owner=self.request.user
        ).prefetch_related('images', 'tokens', 'replication_rules', 'usage_records')

    def get_serializer_class(self):
        if self.action == 'list':
            return ContainerRepositoryListSerializer
        if self.action == 'create':
            return CreateRepositorySerializer
        return ContainerRepositoryDetailSerializer

    # ── Create ────────────────────────────────────────────────────────────────
    def create(self, request, *args, **kwargs):
        ser = CreateRepositorySerializer(data=request.data, context={'request': request})
        ser.is_valid(raise_exception=True)

        repo = ContainerRepository.objects.create(
            owner=request.user,
            name=ser.validated_data['name'],
            description=ser.validated_data.get('description', ''),
            visibility=ser.validated_data.get('visibility', 'private'),
            region=ser.validated_data.get('region', 'us-east-1'),
            status='active',
        )

        # Seed demo images
        _seed_images(repo)

        # Create a default pull token
        RegistryToken.objects.create(
            owner=request.user,
            name='default-pull',
            scope='pull',
            repository=repo,
        )

        data = ContainerRepositoryDetailSerializer(repo, context={'request': request}).data
        return Response(data, status=status.HTTP_201_CREATED)

    # ── Destroy ───────────────────────────────────────────────────────────────
    def destroy(self, request, *args, **kwargs):
        repo = self.get_object()
        repo.status = 'deleting'
        repo.save()
        repo.delete()
        return Response({'message': f'Repository "{repo.name}" deleted.'}, status=status.HTTP_204_NO_CONTENT)

    # ── Images ────────────────────────────────────────────────────────────────
    @action(detail=True, methods=['get'])
    def images(self, request, pk=None):
        repo = self.get_object()
        images = repo.images.all()
        return Response(ContainerImageSerializer(images, many=True).data)

    @action(detail=True, methods=['post'], url_path='delete_tag')
    def delete_tag(self, request, pk=None):
        repo = self.get_object()
        tag  = request.data.get('tag')
        if not tag:
            return Response({'error': 'tag is required.'}, status=400)
        deleted, _ = repo.images.filter(tag=tag).delete()
        if not deleted:
            return Response({'error': f'Tag "{tag}" not found.'}, status=404)
        repo.image_count = repo.images.count()
        repo.storage_mb  = repo.images.aggregate(total=__import__('django.db.models', fromlist=['Sum']).Sum('size_mb'))['total'] or 0
        repo.save(update_fields=['image_count', 'storage_mb'])
        return Response({'message': f'Tag "{tag}" deleted from {repo.name}.'})

    # ── Tokens ────────────────────────────────────────────────────────────────
    @action(detail=True, methods=['get'])
    def tokens(self, request, pk=None):
        repo   = self.get_object()
        tokens = repo.tokens.filter(is_active=True)
        return Response(RegistryTokenSerializer(tokens, many=True, context={'request': request}).data)

    @action(detail=True, methods=['post'], url_path='create_token')
    def create_token(self, request, pk=None):
        repo = self.get_object()
        ser  = CreateTokenSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        expires_at = None
        if 'expires_days' in ser.validated_data:
            expires_at = timezone.now() + timedelta(days=ser.validated_data['expires_days'])

        token = RegistryToken.objects.create(
            owner=request.user,
            name=ser.validated_data['name'],
            scope=ser.validated_data.get('scope', 'pull'),
            repository=repo,
            expires_at=expires_at,
        )
        data = RegistryTokenSerializer(token, context={'show_token': True}).data
        return Response(data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='revoke_token')
    def revoke_token(self, request, pk=None):
        repo     = self.get_object()
        token_id = request.data.get('token_id')
        if not token_id:
            return Response({'error': 'token_id is required.'}, status=400)
        try:
            token = repo.tokens.get(id=token_id, owner=request.user)
        except RegistryToken.DoesNotExist:
            return Response({'error': 'Token not found.'}, status=404)
        token.is_active = False
        token.save()
        return Response({'message': f'Token "{token.name}" revoked.'})

    # ── All user tokens (not scoped to repo) ─────────────────────────────────
    @action(detail=False, methods=['get'], url_path='my_tokens')
    def my_tokens(self, request):
        tokens = RegistryToken.objects.filter(owner=request.user, is_active=True)
        return Response(RegistryTokenSerializer(tokens, many=True, context={'request': request}).data)

    @action(detail=False, methods=['post'], url_path='create_global_token')
    def create_global_token(self, request):
        ser = CreateTokenSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        expires_at = None
        if 'expires_days' in ser.validated_data:
            expires_at = timezone.now() + timedelta(days=ser.validated_data['expires_days'])

        repo = None
        if ser.validated_data.get('repository_id'):
            try:
                repo = ContainerRepository.objects.get(
                    pk=ser.validated_data['repository_id'], owner=request.user,
                )
            except ContainerRepository.DoesNotExist:
                return Response({'error': 'Repository not found.'}, status=404)

        token = RegistryToken.objects.create(
            owner=request.user,
            name=ser.validated_data['name'],
            scope=ser.validated_data.get('scope', 'pull'),
            repository=repo,
            expires_at=expires_at,
        )
        data = RegistryTokenSerializer(token, context={'show_token': True}).data
        return Response(data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], url_path='revoke_global_token')
    def revoke_global_token(self, request):
        token_id = request.data.get('token_id')
        if not token_id:
            return Response({'error': 'token_id is required.'}, status=400)
        try:
            token = RegistryToken.objects.get(id=token_id, owner=request.user)
        except RegistryToken.DoesNotExist:
            return Response({'error': 'Token not found.'}, status=404)
        token.is_active = False
        token.save()
        return Response({'message': f'Token "{token.name}" revoked.'})

    # ── Replication ───────────────────────────────────────────────────────────
    @action(detail=True, methods=['get'])
    def replication(self, request, pk=None):
        repo  = self.get_object()
        rules = repo.replication_rules.all()
        return Response(ReplicationRuleSerializer(rules, many=True).data)

    @action(detail=True, methods=['post'])
    def replicate(self, request, pk=None):
        repo          = self.get_object()
        target_region = request.data.get('target_region')
        mode          = request.data.get('mode', 'async')

        if not target_region:
            return Response({'error': 'target_region is required.'}, status=400)
        if target_region == repo.region:
            return Response({'error': 'Target region must differ from source region.'}, status=400)

        valid_regions = [r[0] for r in REGION_CHOICES]
        if target_region not in valid_regions:
            return Response({'error': f'Invalid region. Choose from: {", ".join(valid_regions)}'}, status=400)

        rule, created = ReplicationRule.objects.get_or_create(
            repository=repo,
            source_region=repo.region,
            target_region=target_region,
            defaults={'mode': mode},
        )
        rule.is_active      = True
        rule.last_triggered = timezone.now()
        rule.save()

        return Response({
            'message':       f'Replication from {repo.region} → {target_region} {"created" if created else "triggered"}.',
            'rule':          ReplicationRuleSerializer(rule).data,
            'images_synced': repo.image_count,
            'duration_s':    round(random.uniform(0.8, 8.0), 2),
        }, status=status.HTTP_200_OK)

    # ── Usage ─────────────────────────────────────────────────────────────────
    @action(detail=True, methods=['get'])
    def usage(self, request, pk=None):
        repo    = self.get_object()
        records = repo.usage_records.all()[:30]
        return Response(RegistryUsageSerializer(records, many=True).data)

    # ── Vulnerability scan ────────────────────────────────────────────────────
    @action(detail=True, methods=['post'])
    def scan(self, request, pk=None):
        """
        Analyse a container image tag for vulnerabilities.

        Scoring is heuristic-based (deterministic), using metadata already
        stored on the ContainerImage record:
          - OS type     (alpine is most secure; ubuntu/debian have a larger surface)
          - Layer count (more layers → more packages → higher baseline risk)
          - Image size  (larger images carry more installed software)
          - Tag naming  ('latest' / 'edge' are riskier than pinned semver tags)
          - Image age   (images older than 180 days accumulate un-patched CVEs)
        """
        repo = self.get_object()
        tag  = request.data.get('tag', 'latest')
        try:
            img = repo.images.get(tag=tag)
        except ContainerImage.DoesNotExist:
            return Response({'error': f'Tag "{tag}" not found.'}, status=404)

        # Mark in-progress
        img.scan_status = 'scanning'
        img.save(update_fields=['scan_status'])

        # ── Compute deterministic risk score 0–100 ────────────────────────────
        score = 0

        os_lower = (img.os or '').lower()
        if 'alpine' in os_lower:
            score += 5
        elif os_lower in ('scratch', ''):
            score += 0
        elif 'ubuntu' in os_lower or 'debian' in os_lower:
            score += 25
        else:
            score += 15

        score += min(20, max(0, (img.layer_count or 0) - 3))

        size_mb = img.size_mb or 0
        if size_mb > 500:
            score += 20
        elif size_mb > 200:
            score += 15
        elif size_mb > 100:
            score += 10
        elif size_mb > 50:
            score += 5

        tag_lower = tag.lower()
        if tag_lower in ('latest', 'edge', 'dev', 'master', 'main', 'nightly', 'unstable'):
            score += 15
        elif tag_lower in ('stable', 'lts', 'release'):
            score += 5

        age_days = max(0, (timezone.now() - img.created_at).days)
        if age_days > 365:
            score += 15
        elif age_days > 180:
            score += 10
        elif age_days > 90:
            score += 5

        digest_seed = int(hashlib.md5(img.digest.encode()).hexdigest()[:4], 16)
        jitter = (digest_seed % 11) - 5
        final_score = max(0, min(100, score + jitter))

        if final_score <= 25:
            img.scan_status = 'clean'
            vulnerability_count = {'critical': 0, 'high': 0, 'medium': 0, 'low': 0}
        elif final_score <= 50:
            img.scan_status = 'clean'
            vulnerability_count = {'critical': 0, 'high': 0, 'medium': 0, 'low': max(0, final_score // 10)}
        elif final_score <= 70:
            img.scan_status = 'vulnerable'
            vulnerability_count = {
                'critical': 0,
                'high':     0,
                'medium':   max(1, (final_score - 50) // 5),
                'low':      max(2, (final_score - 40) // 5),
            }
        else:
            img.scan_status = 'vulnerable'
            vulnerability_count = {
                'critical': max(0, (final_score - 70) // 10),
                'high':     max(1, (final_score - 60) // 8),
                'medium':   max(2, (final_score - 40) // 5),
                'low':      max(5, (final_score - 30) // 4),
            }

        img.vulnerability_count = vulnerability_count
        img.save(update_fields=['scan_status', 'vulnerability_count'])

        return Response({
            'tag':             tag,
            'digest':          img.digest,
            'scan_status':     img.scan_status,
            'risk_score':      final_score,
            'vulnerabilities': vulnerability_count,
            'os':              img.os,
            'size_mb':         img.size_mb,
            'layer_count':     img.layer_count,
            'age_days':        age_days,
            'message':         f'Scan of {repo.name}:{tag} completed.',
        })

    # ── Regions catalogue ─────────────────────────────────────────────────────
    @action(detail=False, methods=['get'])
    def regions(self, request):
        return Response([{'region': k, 'label': v} for k, v in REGION_CHOICES])
