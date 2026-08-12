# Docker Production Deployment

The `main` branch deploys the Cloud API and web application to one Docker Compose host. This workflow intentionally does not use AWS, EKS, Terraform, or Kubernetes.

## Host preparation

On an Ubuntu or Debian production host, install Docker Engine with the Docker Compose plugin. Add the deployment user to the `docker` group, then create the deployment directory:

```bash
sudo install -d -o deploy -g deploy /srv/orcacloud/nginx
sudo install -d -o deploy -g deploy /var/log/orcacloud-nginx
sudo usermod -aG docker deploy
```

Create `/srv/orcacloud/.env` with mode `600`. Do not copy the committed sample values: generate unique values for every secret.

```dotenv
POSTGRES_DB=orcacloud
POSTGRES_USER=orcacloud_user
POSTGRES_PASSWORD=replace-with-a-long-random-password
SECRET_KEY=replace-with-python-secrets-token-urlsafe-50
ALLOWED_HOSTS=orcacloud.org,www.orcacloud.org,api.orcacloud.org
CORS_ALLOWED_ORIGINS=https://orcacloud.org,https://www.orcacloud.org
```

Point the DNS records for `orcacloud.org`, `www.orcacloud.org`, and `api.orcacloud.org` to the Docker host. Provision the LetsEncrypt certificate for `orcacloud.org` before the first HTTPS deployment because [nginx/default.conf](../nginx/default.conf) mounts `/etc/letsencrypt` and expects that certificate. Restrict inbound access with the host firewall to ports `80` and `443`; do not expose the database or cache ports.

The GitHub Actions deployment user must be able to write `/srv/orcacloud`, run Docker without `sudo`, and read the existing `.env` file.

## GitHub Configuration

Create a GitHub environment named `production` and add the following environment secrets:

| Secret | Purpose |
| --- | --- |
| `PROD_SSH_HOST` | Docker host DNS name or IP address |
| `PROD_SSH_USER` | Restricted deployment user, such as `deploy` |
| `PROD_SSH_PRIVATE_KEY` | Private key for the deployment user |
| `PROD_SSH_KNOWN_HOSTS` | Exact `ssh-keyscan -H <host>` result, captured and verified out of band |
| `PROD_DEPLOY_PATH` | Host deployment path, for example `/srv/orcacloud` |

The workflow uses GitHub's short-lived `GITHUB_TOKEN` to authenticate the Docker host to GHCR and pull images. If the packages are private, keep the package permissions inherited from this repository.

## Deployment Behavior

On every successful push to `main`, CI builds multi-architecture images and tags them with `sha-<full-commit-sha>`. The production job copies the repository's single `docker-compose.yml` and NGINX configuration to the Docker host, pulls those immutable image tags, starts the `prod` profile, and retries public health checks.

To inspect a deployment on the host:

```bash
cd /srv/orcacloud
docker compose --profile prod ps
docker compose --profile prod logs --tail=100 cloudapi nginx
```

To deploy a previously published image manually, export `CLOUDAPI_IMAGE` and `WEBAPP_IMAGE` to the desired `ghcr.io/orcastack/orcacloud/...:sha-<commit>` tags, then run:

```bash
cd /srv/orcacloud
docker compose --profile prod pull cloudapi webapp
docker compose --profile prod up -d --remove-orphans
```