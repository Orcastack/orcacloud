import graphene
from graphene_django import DjangoObjectType
from graphql import GraphQLError

from .compute.models import Instance, KubernetesCluster
from .storage.models import StorageBucket
from .networking.models import VPC, LoadBalancer, CDNDistribution
from .domain.models import Domain


class InstanceType(DjangoObjectType):
    class Meta:
        model = Instance
        fields = (
            'resource_id',
            'instance_id',
            'name',
            'status',
            'private_ip',
            'public_ip',
            'created_at',
        )


class KubernetesClusterType(DjangoObjectType):
    class Meta:
        model = KubernetesCluster
        fields = (
            'resource_id',
            'cluster_id',
            'name',
            'status',
            'region',
            'node_count',
            'created_at',
        )


class StorageBucketType(DjangoObjectType):
    class Meta:
        model = StorageBucket
        fields = (
            'resource_id',
            'bucket_id',
            'bucket_name',
            'region',
            'status',
            'total_objects',
            'total_size_bytes',
            'created_at',
        )


class VPCType(DjangoObjectType):
    class Meta:
        model = VPC
        fields = (
            'resource_id',
            'vpc_id',
            'name',
            'cidr_block',
            'region',
            'status',
            'created_at',
        )


class LoadBalancerType(DjangoObjectType):
    class Meta:
        model = LoadBalancer
        fields = (
            'resource_id',
            'lb_id',
            'name',
            'status',
            'dns_name',
            'created_at',
        )


class CDNDistributionType(DjangoObjectType):
    class Meta:
        model = CDNDistribution
        fields = (
            'resource_id',
            'distribution_id',
            'name',
            'status',
            'origin_domain',
            'domain_names',
            'created_at',
        )


class DomainType(DjangoObjectType):
    class Meta:
        model = Domain
        fields = (
            'resource_id',
            'domain_name',
            'status',
            'dnssec_enabled',
            'created_at',
        )


class Query(graphene.ObjectType):
    instances = graphene.List(InstanceType)
    kubernetes_clusters = graphene.List(KubernetesClusterType)
    buckets = graphene.List(StorageBucketType)
    vpcs = graphene.List(VPCType)
    load_balancers = graphene.List(LoadBalancerType)
    cdn_distributions = graphene.List(CDNDistributionType)
    domains = graphene.List(DomainType)

    def _user_or_error(self, info):
        user = info.context.user
        if not user or not user.is_authenticated:
            raise GraphQLError('Authentication required')
        return user

    def resolve_instances(self, info):
        user = self._user_or_error(info)
        return Instance.objects.filter(owner=user).order_by('-created_at')[:200]

    def resolve_kubernetes_clusters(self, info):
        user = self._user_or_error(info)
        return KubernetesCluster.objects.filter(owner=user).order_by('-created_at')[:100]

    def resolve_buckets(self, info):
        user = self._user_or_error(info)
        return StorageBucket.objects.filter(owner=user).order_by('-created_at')[:200]

    def resolve_vpcs(self, info):
        user = self._user_or_error(info)
        return VPC.objects.filter(owner=user).order_by('-created_at')[:100]

    def resolve_load_balancers(self, info):
        user = self._user_or_error(info)
        return LoadBalancer.objects.filter(owner=user).order_by('-created_at')[:100]

    def resolve_cdn_distributions(self, info):
        user = self._user_or_error(info)
        return CDNDistribution.objects.filter(owner=user).order_by('-created_at')[:100]

    def resolve_domains(self, info):
        user = self._user_or_error(info)
        return Domain.objects.filter(owner=user).order_by('-created_at')[:200]


schema = graphene.Schema(query=Query)
