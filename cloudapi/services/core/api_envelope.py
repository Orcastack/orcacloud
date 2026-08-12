from rest_framework.renderers import JSONRenderer
from rest_framework.views import exception_handler as drf_exception_handler


class VersionedEnvelopeJSONRenderer(JSONRenderer):
    def render(self, data, accepted_media_type=None, renderer_context=None):
        renderer_context = renderer_context or {}
        request = renderer_context.get('request')
        response = renderer_context.get('response')

        if not request or not request.path.startswith('/api/v1/'):
            return super().render(data, accepted_media_type, renderer_context)

        if response is not None and response.status_code == 204:
            return b''

        if isinstance(data, dict) and ('success' in data or 'error' in data):
            payload = data
        elif response is not None and response.status_code >= 400:
            payload = {
                'success': False,
                'error': {
                    'code': response.status_code,
                    'message': data.get('detail', 'Request failed.') if isinstance(data, dict) else 'Request failed.',
                    'details': data,
                },
            }
        else:
            payload = {
                'success': True,
                'data': data,
                'meta': {
                    'status_code': response.status_code if response is not None else 200,
                },
            }
        return super().render(payload, accepted_media_type, renderer_context)


def versioned_exception_handler(exc, context):
    response = drf_exception_handler(exc, context)
    request = context.get('request')

    if response is None or not request or not request.path.startswith('/api/v1/'):
        return response

    detail = response.data
    message = detail.get('detail', 'Request failed.') if isinstance(detail, dict) else str(detail)
    response.data = {
        'success': False,
        'error': {
            'code': response.status_code,
            'message': message,
            'details': detail,
        },
    }
    return response
