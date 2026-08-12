"""
Telemetry endpoint for frontend observability events
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([AllowAny])
def telemetry_endpoint(request):
    """
    Accept telemetry events from frontend for monitoring and observability.
    This is a lightweight endpoint that logs events for future processing.
    """
    try:
        event_type = request.data.get('type', 'unknown')
        event_data = request.data.get('data', {})
        session_id = request.data.get('sessionId', 'unknown')
        timestamp = request.data.get('timestamp', timezone.now().timestamp() * 1000)

        # Log telemetry event (in production, send to proper telemetry backend)
        logger.info(
            f"Telemetry event: type={event_type}, session={session_id[:16]}, "
            f"url={event_data.get('url', 'N/A')}"
        )

        # In a production system, you would:
        # 1. Send to OpenTelemetry collector
        # 2. Store in time-series database (Prometheus, InfluxDB)
        # 3. Send to APM service (Datadog, New Relic, Elastic APM)
        # 4. Store in logs aggregator (ELK, Loki)

        return Response({'status': 'ok', 'received': True}, status=202)

    except Exception as e:
        logger.warning(f"Failed to process telemetry event: {str(e)}")
        # Still return success to not disrupt frontend
        return Response({'status': 'ok', 'received': False}, status=202)
