from __future__ import annotations

from typing import Any

import requests


class OrcaCloudClient:
    """Official Python SDK client for OrcaCloud APIs."""

    def __init__(self, base_url: str, token: str, timeout: int = 30):
        self.base_url = base_url.rstrip('/')
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Token {token}',
            'Content-Type': 'application/json',
        })

    def _request(self, method: str, path: str, **kwargs) -> Any:
        url = f"{self.base_url}{path}"
        response = self.session.request(method=method, url=url, timeout=self.timeout, **kwargs)
        response.raise_for_status()
        if response.content:
            return response.json()
        return None

    # ---- GraphQL ----
    def graphql(self, query: str, variables: dict[str, Any] | None = None) -> dict[str, Any]:
        payload: dict[str, Any] = {'query': query}
        if variables:
            payload['variables'] = variables
        return self._request('POST', '/api/graphql/', json=payload)

    # ---- Compute ----
    def list_instances(self) -> dict[str, Any]:
        return self._request('GET', '/api/services/instances/')

    def list_kubernetes_clusters(self) -> dict[str, Any]:
        return self._request('GET', '/api/services/kubernetes-clusters/')

    # ---- Storage ----
    def list_buckets(self) -> dict[str, Any]:
        return self._request('GET', '/api/services/buckets/')

    # ---- Networking ----
    def list_vpcs(self) -> dict[str, Any]:
        return self._request('GET', '/api/services/vpcs/')

    # ---- Compliance ----
    def compliance_controls(self, framework: str = 'soc2') -> dict[str, Any]:
        return self._request('GET', f'/api/services/compliance/control_status/?framework={framework}')

    def collect_evidence(self, framework: str = 'soc2') -> dict[str, Any]:
        return self._request('POST', '/api/services/compliance/collect_evidence/', json={'framework': framework})

    def attestation(self, framework: str, period_start: str, period_end: str) -> dict[str, Any]:
        return self._request(
            'POST',
            '/api/services/compliance/attestation/',
            json={'framework': framework, 'period_start': period_start, 'period_end': period_end},
        )
