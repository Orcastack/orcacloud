# Production Deployment

## Scope

The production application deployment uses one Docker Compose file, `docker-compose.yml`, and its `prod` profile. It deploys application images from GitHub Container Registry to a Docker host. It does not require AWS, EKS, Terraform, or Kubernetes.

## Before the First Deployment

1. Install Docker Engine and the Docker Compose plugin on the production host.
2. Create the deployment directory and grant the deployment user Docker access.
3. Create a mode `600` `.env` file at the deployment path with unique credentials.
4. Point DNS for `orcacloud.org`, `www.orcacloud.org`, and `api.orcacloud.org` to the host.
5. Provision the LetsEncrypt certificate at `/etc/letsencrypt/live/orcacloud.org/`.
6. Allow only ports `80` and `443` through the host firewall.

Required `.env` values:

```dotenv
POSTGRES_DB=orcacloud
POSTGRES_USER=orcacloud_user
POSTGRES_PASSWORD=<long-random-password>
SECRET_KEY=<django-secret>
ALLOWED_HOSTS=orcacloud.org,www.orcacloud.org,api.orcacloud.org
CORS_ALLOWED_ORIGINS=https://orcacloud.org,https://www.orcacloud.org
```

## GitHub Environment

Create a GitHub environment called `production` and configure these environment secrets:

| Secret | Purpose |
| --- | --- |
| `PROD_SSH_HOST` | Docker host address |
| `PROD_SSH_USER` | Restricted deployment user |
| `PROD_SSH_PRIVATE_KEY` | SSH private key for that user |
| `PROD_SSH_KNOWN_HOSTS` | Verified host key output |
| `PROD_DEPLOY_PATH` | Deployment directory, such as `/srv/orcacloud` |

The host authenticates to GHCR using the workflow's short-lived `GITHUB_TOKEN`. Private packages must remain accessible to this repository.

## Automated Deployment

A successful push to `main` publishes `cloudapi` and `webapp` images tagged `sha-<full-commit-sha>`. The production job copies the Compose and NGINX configuration, pulls those exact tags, starts the `prod` profile, then retries the public health endpoints.

```bash
docker compose --profile prod pull cloudapi webapp
docker compose --profile prod up -d --remove-orphans
docker compose --profile prod ps
```

## Verification and Rollback

Verify the deployed stack:

```bash
cd /srv/orcacloud
docker compose --profile prod ps
docker compose --profile prod logs --tail=100 cloudapi nginx
curl --fail https://api.orcacloud.org/api/health/
curl --fail https://orcacloud.org/
```

To roll back, export `CLOUDAPI_IMAGE` and `WEBAPP_IMAGE` to a previously verified `sha-<commit>` tag, then run the same pull and `up -d` commands. Do not use mutable `latest` for a rollback.

See also [[CI and CD]] and the [detailed deployment guide](https://github.com/Orcastack/orcacloud/blob/main/docs/DOCKER_PRODUCTION_DEPLOYMENT.md).
