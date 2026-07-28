# Multi-Dashboard Local Development

This stack runs the four dashboards against one backend, database, and authentication service. Local development exposes each dashboard on its own port; production ingress maps the same services to these canonical hosts:

- `https://devop.orcacloud.com` -> `devopapp`
- `https://cloud.orcacloud.com` -> `cloudapp`
- `https://email.orcacloud.com` -> `emailapp`
- `https://enterprise.orcacloud.com` -> `enterpriseapp`

Set `AUTH_COOKIE_DOMAIN=.orcacloud.com` in production. The backend then issues one HttpOnly session cookie shared by all four subdomains. Auth tokens must not be passed in query strings.

## Start the stack

For local runs, you can either rely on the development defaults baked into the multi-dashboard compose file, or copy the shared template first if you want to override passwords and other settings:

```bash
cp .env.example .env
```

```bash
docker compose -f docker-compose.multi-dashboard.yml up --build
```

That default command now starts only the core multi-dashboard login flow and its required backend dependencies. The five dashboard hosts now use a prebuilt static webapp image, so local startup no longer depends on `npm install` completing inside each frontend container.

Optional stacks are behind profiles:

```bash
docker compose -f docker-compose.multi-dashboard.yml --profile observability up --build
docker compose -f docker-compose.multi-dashboard.yml --profile logging up --build
docker compose -f docker-compose.multi-dashboard.yml --profile tools up --build
docker compose -f docker-compose.multi-dashboard.yml --profile devtools up --build
```

## Local endpoints

- `http://localhost:3000`
- `http://localhost:3001`
- `http://localhost:3002`
- `http://localhost:3003`
- `http://localhost:3004`

Port mapping:

- `3000` home portal
- `3001` login service
- `3002` cloud dashboard
- `3003` developer dashboard
- `3004` matrix dashboard

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
