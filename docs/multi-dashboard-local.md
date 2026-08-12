# Multi-Dashboard Local Development

This stack runs the seven dashboards against one backend, database, and authentication service. Local development exposes each dashboard on its own port; production ingress maps the same services to these canonical hosts:

- `https://devop.orcacloud.com` -> `devopapp`
- `https://cloud.orcacloud.com` -> `cloudapp`
- `https://email.orcacloud.com` -> `emailapp`
- `https://enterprise.orcacloud.com` -> `enterpriseapp`

Set `AUTH_COOKIE_DOMAIN=.orcacloud.com` in production. The backend then issues one HttpOnly session cookie shared by all four subdomains. Auth tokens must not be passed in query strings.

## Start the stack

For local runs, copy the shared template first if you want to override passwords and other settings:

```bash
cp .env.example .env
```

```bash
docker compose --profile dashboards up --build
```

This command starts the dashboards and their required backend dependencies. Each dashboard builds from its own application directory.

Optional stacks are behind profiles:

```bash
docker compose --profile dashboards --profile monitoring up --build
docker compose --profile dashboards --profile logging up --build
```

## Local endpoints

- `http://localhost:3000`
- `http://localhost:3001`
- `http://localhost:3003`
- `http://localhost:3004`
- `http://localhost:3005`
- `http://localhost:3006`
- `http://localhost:3007`

Port mapping:

- `3000` web portal
- `3001` account dashboard
- `3003` cloud dashboard
- `3004` DevOps dashboard
- `3005` email dashboard
- `3006` enterprise dashboard
- `3007` domain dashboard

## Login flow

1. Open any dashboard's local port.
2. Sign in or sign up through the shared backend auth endpoints.
3. The authenticated session is available to every production subdomain through the shared cookie, while each frontend keeps its own dashboard and routes.

## Demo credentials

If the backend auth API is offline, the login page defaults to the frontend demo credentials already supported by the app:

```text
Email: demo@example.com
Password: password
```
