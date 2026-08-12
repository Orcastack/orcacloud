from __future__ import annotations

import argparse
import json
import os
import sys

from .client import OrcaCloudClient


def _client_from_env(args: argparse.Namespace) -> OrcaCloudClient:
    base_url = args.base_url or os.environ.get('ORCACLOUD_BASE_URL') or os.environ.get('ORCACLOUD_BASE_URL', 'http://localhost:8000')
    token = args.token or os.environ.get('ORCACLOUD_TOKEN') or os.environ.get('ORCACLOUD_TOKEN', '')
    if not token:
        raise SystemExit('Missing token. Set --token or ORCACLOUD_TOKEN (legacy: ORCACLOUD_TOKEN).')
    return OrcaCloudClient(base_url=base_url, token=token)


def _emit(payload):
    print(json.dumps(payload, indent=2, sort_keys=True))


def main() -> int:
    parser = argparse.ArgumentParser(prog='orcacloudctl', description='OrcaCloud CLI')
    parser.add_argument('--base-url', default=None, help='API base URL (default: ORCACLOUD_BASE_URL or legacy ORCACLOUD_BASE_URL)')
    parser.add_argument('--token', default=None, help='API token (default: ORCACLOUD_TOKEN or legacy ORCACLOUD_TOKEN)')

    subparsers = parser.add_subparsers(dest='command', required=True)

    subparsers.add_parser('instances', help='List instances')
    subparsers.add_parser('clusters', help='List Kubernetes clusters')
    subparsers.add_parser('buckets', help='List storage buckets')
    subparsers.add_parser('vpcs', help='List VPCs')

    graphql = subparsers.add_parser('graphql', help='Run GraphQL query')
    graphql.add_argument('--query', required=True, help='GraphQL query string')

    controls = subparsers.add_parser('compliance-controls', help='Get compliance control status')
    controls.add_argument('--framework', default='soc2', choices=['soc2', 'iso27001', 'gdpr'])

    evidence = subparsers.add_parser('collect-evidence', help='Collect evidence pack')
    evidence.add_argument('--framework', default='soc2', choices=['soc2', 'iso27001', 'gdpr'])

    attestation = subparsers.add_parser('attestation', help='Create compliance attestation')
    attestation.add_argument('--framework', default='soc2', choices=['soc2', 'iso27001', 'gdpr'])
    attestation.add_argument('--period-start', required=True, help='YYYY-MM-DD')
    attestation.add_argument('--period-end', required=True, help='YYYY-MM-DD')

    args = parser.parse_args()
    client = _client_from_env(args)

    if args.command == 'instances':
        _emit(client.list_instances())
    elif args.command == 'clusters':
        _emit(client.list_kubernetes_clusters())
    elif args.command == 'buckets':
        _emit(client.list_buckets())
    elif args.command == 'vpcs':
        _emit(client.list_vpcs())
    elif args.command == 'graphql':
        _emit(client.graphql(args.query))
    elif args.command == 'compliance-controls':
        _emit(client.compliance_controls(args.framework))
    elif args.command == 'collect-evidence':
        _emit(client.collect_evidence(args.framework))
    elif args.command == 'attestation':
        _emit(client.attestation(args.framework, args.period_start, args.period_end))
    else:
        parser.print_help()
        return 1

    return 0


if __name__ == '__main__':
    sys.exit(main())
