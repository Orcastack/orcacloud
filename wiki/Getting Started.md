# Getting Started

## Prerequisites

For local application development, install:

- Docker Engine with the Docker Compose plugin
- Node.js 22 for the web application build
- Python 3.11 for the Django API and tests
- Git

OpenStack CLI, Terraform, Ansible, and `kubectl` are required only when working on the infrastructure control plane.

## Configure Local Environment

Copy the committed example and replace all sample credentials with local development values:

```bash
cp .env.example .env
chmod 600 .env
```

Do not reuse `.env.example` passwords or commit `.env`. It is a template, not a secret store.

## Start Development Services

```bash
docker compose --profile dev up -d --build
```

The development profile starts the Django service, React development server, PostgreSQL, Redis, RabbitMQ, ZooKeeper, and Kafka. Check service status with:

```bash
docker compose --profile dev ps
docker compose --profile dev logs --tail=100 cloudapi-dev webapp-dev
```

Stop the stack with:

```bash
docker compose --profile dev down
```

## Run Tests Locally

Backend:

```bash
cd cloudapi
python -m pip install -r requirements.txt
python manage.py migrate --noinput
pytest
```

Frontend:

```bash
cd webapp
npm ci --legacy-peer-deps
npm run test:coverage
```

## OpenStack Development

Copy the example cloud profile only to a local untracked path, set `OS_CLOUD`, and verify the token before running infrastructure operations:

```bash
cp cloudapi/clouds.yaml.example cloudapi/clouds.yaml
export OS_CLOUD=orcacloud
openstack token issue
```

Use the workspace-aware provisioning path described in [[Architecture]] when adding API operations.

## Next Steps

- [[Production Deployment]]
- [[CI and CD]]
- [Cloud enablement playbook](https://github.com/Orcastack/orcacloud/blob/main/docs/cloud-enablement/IMPLEMENTATION_PLAYBOOK.md)
