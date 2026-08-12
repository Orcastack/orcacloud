"""
OrcaCloud Services - Business Logic Layer

This module contains the service-specific implementations for all cloud capabilities.
Each service module (compute, storage, networking) contains the business logic that
powers the REST API endpoints.

Classes:
    ComputeService - Handles instance lifecycle, K8s, serverless, auto-scaling
    StorageService - Handles buckets, volumes, backups, encryption
    NetworkingService - Handles VPCs, networking, load balancing
    BillingService - Handles cost calculation and usage aggregation

Usage:
    from services.business_logic.compute import ComputeService
    
    service = ComputeService()
    instance = service.create_instance(instance_data, user)
    service.start_instance(instance.id)
"""

from .compute import ComputeService
from .storage import StorageService
from .networking import NetworkingService
from .billing import BillingService

__all__ = [
    'ComputeService',
    'StorageService',
    'NetworkingService',
    'BillingService',
]
