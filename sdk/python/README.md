# OrcaCloud Official Python SDK + CLI

Install locally:

```bash
cd sdk/python
pip install -e .
```

Set auth:

```bash
export ORCACLOUD_BASE_URL=http://localhost:8000
export ORCACLOUD_TOKEN=<your-token>
```

Legacy env vars are still supported:

```bash
export ORCACLOUD_BASE_URL=http://localhost:8000
export ORCACLOUD_TOKEN=<your-token>
```

Examples:

```bash
orcacloudctl instances
orcacloudctl compliance-controls --framework soc2
orcacloudctl collect-evidence --framework iso27001
orcacloudctl graphql --query '{ instances { name status } }'
```
