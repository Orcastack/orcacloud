"""
Custom Exceptions for OrcaCloud Services

All business logic exceptions inherit from AtonixException for consistent
error handling throughout the services module.
"""

from rest_framework import status


class AtonixException(Exception):
    """Base exception for all OrcaCloud service errors"""
    
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    detail = "An error occurred in the service"
    
    def __init__(self, detail=None, status_code=None):
        if detail is not None:
            self.detail = detail
        if status_code is not None:
            self.status_code = status_code
        super().__init__(self.detail)


class ResourceNotFoundError(AtonixException):
    """Resource does not exist"""
    status_code = status.HTTP_404_NOT_FOUND
    detail = "Resource not found"


class ResourceAlreadyExistsError(AtonixException):
    """Resource already exists"""
    status_code = status.HTTP_409_CONFLICT
    detail = "Resource already exists"


class InvalidStateTransitionError(AtonixException):
    """Resource cannot transition to requested state"""
    status_code = status.HTTP_400_BAD_REQUEST
    detail = "Invalid state transition"


class QuotaExceededError(AtonixException):
    """User has exceeded their quota for this resource"""
    status_code = status.HTTP_429_TOO_MANY_REQUESTS
    detail = "Quota exceeded for this resource"


class InsufficientPermissionError(AtonixException):
    """User does not have permission for this operation"""
    status_code = status.HTTP_403_FORBIDDEN
    detail = "Insufficient permissions"


class OperationFailedError(AtonixException):
    """Operation failed at resource provisioning level"""
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    detail = "Operation failed during provisioning"


class InvalidConfigurationError(AtonixException):
    """Invalid configuration provided"""
    status_code = status.HTTP_400_BAD_REQUEST
    detail = "Invalid configuration"


class DependencyNotFoundError(AtonixException):
    """Required dependency (VPC, subnet, etc.) not found"""
    status_code = status.HTTP_400_BAD_REQUEST
    detail = "Required dependency not found"


class ResourceInUseError(AtonixException):
    """Cannot delete/modify resource because it's in use"""
    status_code = status.HTTP_409_CONFLICT
    detail = "Resource is currently in use"


class BillingError(AtonixException):
    """Error in billing/cost calculation"""
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    detail = "Billing calculation error"


# Compute-specific exceptions
class InstanceError(AtonixException):
    """Base exception for instance operations"""
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR


class InstanceNotFoundError(ResourceNotFoundError):
    """Instance does not exist"""
    detail = "Instance not found"


class InstanceStartError(InstanceError):
    """Error starting instance"""
    detail = "Failed to start instance"


class InstanceStopError(InstanceError):
    """Error stopping instance"""
    detail = "Failed to stop instance"


class InstanceTerminateError(InstanceError):
    """Error terminating instance"""
    detail = "Failed to terminate instance"


class KubernetesError(AtonixException):
    """Base exception for K8s operations"""
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR


class ClusterProvisioningError(KubernetesError):
    """Error provisioning K8s cluster"""
    detail = "Failed to provision Kubernetes cluster"


class ServerlessFunctionError(AtonixException):
    """Base exception for serverless function operations"""
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR


class FunctionInvocationError(ServerlessFunctionError):
    """Error invoking serverless function"""
    detail = "Failed to invoke function"


class AutoScalingError(AtonixException):
    """Base exception for auto-scaling operations"""
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR


class ScalingDecisionError(AutoScalingError):
    """Error making scaling decision"""
    detail = "Failed to make scaling decision"


# Storage-specific exceptions
class StorageError(AtonixException):
    """Base exception for storage operations"""
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR


class BucketError(StorageError):
    """Error with bucket operation"""
    detail = "Bucket operation failed"


class BucketNotFoundError(ResourceNotFoundError):
    """Bucket does not exist"""
    detail = "Bucket not found"


class VolumeError(StorageError):
    """Error with volume operation"""
    detail = "Volume operation failed"


class VolumeNotFoundError(ResourceNotFoundError):
    """Volume does not exist"""
    detail = "Volume not found"


class SnapshotError(StorageError):
    """Error with snapshot operation"""
    detail = "Snapshot operation failed"


class BackupError(StorageError):
    """Error with backup operation"""
    detail = "Backup operation failed"


class EncryptionError(StorageError):
    """Error with encryption operation"""
    detail = "Encryption operation failed"


# Networking-specific exceptions
class NetworkingError(AtonixException):
    """Base exception for networking operations"""
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR


class VPCError(NetworkingError):
    """Error with VPC operation"""
    detail = "VPC operation failed"


class VPCNotFoundError(ResourceNotFoundError):
    """VPC does not exist"""
    detail = "VPC not found"


class SubnetError(NetworkingError):
    """Error with subnet operation"""
    detail = "Subnet operation failed"


class SecurityGroupError(NetworkingError):
    """Error with security group operation"""
    detail = "Security group operation failed"


class LoadBalancerError(NetworkingError):
    """Error with load balancer operation"""
    detail = "Load balancer operation failed"


class RouteError(NetworkingError):
    """Error with routing operation"""
    detail = "Routing operation failed"


class DNSError(NetworkingError):
    """Error with DNS operation"""
    detail = "DNS operation failed"


class VPNError(NetworkingError):
    """Error with VPN operation"""
    detail = "VPN operation failed"


class IPAMError(NetworkingError):
    """Error with IP address management"""
    detail = "IP address management error"
