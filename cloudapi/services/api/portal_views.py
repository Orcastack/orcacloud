import re
from collections import defaultdict

from django.urls.resolvers import URLPattern, URLResolver
from django.views.generic import TemplateView

from services.api import urls as services_api_urls


def _humanize_label(value: str) -> str:
    return value.replace('-', ' ').replace('_', ' ').title()


def _normalize_route(raw_route: str) -> str:
    route = raw_route.strip()
    route = route.replace('^', '').replace('$', '')
    route = route.lstrip('/')
    route = re.sub(r'\(\?P<([^>]+)>[^)]+\)', r'{\1}', route)
    route = route.replace('\\', '')
    route = route.replace('(?P<format>[a-z0-9]+)', '{format}')
    route = route.replace('.{format}', '')
    route = route.strip()
    return route


def _extract_methods(pattern: URLPattern) -> list[str]:
    callback = pattern.callback
    actions = getattr(callback, 'actions', None)
    if isinstance(actions, dict) and actions:
        return sorted({method.upper() for method in actions.keys()})

    methods = getattr(callback, 'http_method_names', None)
    if methods:
        return sorted({method.upper() for method in methods if method and method != 'options'})

    return ['GET']


def _collect_url_patterns(patterns, prefix=''):
    rows = []
    for pattern in patterns:
        if isinstance(pattern, URLResolver):
            nested_prefix = prefix + str(pattern.pattern)
            rows.extend(_collect_url_patterns(pattern.url_patterns, nested_prefix))
            continue

        if not isinstance(pattern, URLPattern):
            continue

        route = _normalize_route(prefix + str(pattern.pattern))
        if not route:
            continue
        if 'format' in route:
            continue

        full_path = '/api/services/' + route
        if not full_path.endswith('/'):
            full_path += '/'

        methods = _extract_methods(pattern)
        name = pattern.name or 'endpoint'
        rows.append(
            {
                'path': full_path,
                'methods': methods,
                'name': _humanize_label(name),
                'anchor': re.sub(r'[^a-z0-9]+', '-', full_path.lower()).strip('-'),
            }
        )

    unique = {}
    for row in rows:
        key = (row['path'], tuple(row['methods']))
        unique[key] = row

    return sorted(unique.values(), key=lambda item: item['path'])


def build_api_reference_groups():
    endpoints = _collect_url_patterns(services_api_urls.urlpatterns)
    grouped = defaultdict(list)

    for endpoint in endpoints:
        trimmed = endpoint['path'].replace('/api/services/', '', 1)
        top_segment = trimmed.split('/', 1)[0]
        category = _humanize_label(top_segment)
        grouped[category].append(endpoint)

    group_rows = []
    for category in sorted(grouped.keys()):
        group_rows.append(
            {
                'name': category,
                'slug': re.sub(r'[^a-z0-9]+', '-', category.lower()).strip('-'),
                'endpoints': grouped[category],
            }
        )

    return group_rows


class ApiPortalLandingView(TemplateView):
    template_name = 'services/api_portal.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['api_reference_groups'] = build_api_reference_groups()
        return context
