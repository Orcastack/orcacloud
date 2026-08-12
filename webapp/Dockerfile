FROM node:20-alpine AS builder

# Build-time arguments — CRA bakes REACT_APP_* into the JS bundle at build time
ARG REACT_APP_API_URL=http://localhost:8000/api
ARG REACT_APP_ACCOUNT_URL=http://localhost:5000
ARG REACT_APP_WS_URL=ws://localhost:8000/ws
ARG REACT_APP_ENVIRONMENT=production
ARG REACT_APP_PORTAL_PUBLIC_PORT=8081
ARG PUBLIC_URL=/
ARG REACT_APP_APP_NAME=OrcaCloud
ARG REACT_APP_ENABLE_WEBSOCKETS=true
ARG REACT_APP_ENABLE_MONITORING=true
ARG REACT_APP_ENABLE_BILLING=true

# Promote args to env so CRA can see them during npm run build
ENV REACT_APP_API_URL=$REACT_APP_API_URL \
    REACT_APP_ACCOUNT_URL=$REACT_APP_ACCOUNT_URL \
    REACT_APP_WS_URL=$REACT_APP_WS_URL \
    REACT_APP_ENVIRONMENT=$REACT_APP_ENVIRONMENT \
    REACT_APP_PORTAL_PUBLIC_PORT=$REACT_APP_PORTAL_PUBLIC_PORT \
    PUBLIC_URL=$PUBLIC_URL \
    REACT_APP_APP_NAME=$REACT_APP_APP_NAME \
    REACT_APP_ENABLE_WEBSOCKETS=$REACT_APP_ENABLE_WEBSOCKETS \
    REACT_APP_ENABLE_MONITORING=$REACT_APP_ENABLE_MONITORING \
    REACT_APP_ENABLE_BILLING=$REACT_APP_ENABLE_BILLING \
    GENERATE_SOURCEMAP=false \
    NODE_OPTIONS=--max-old-space-size=2048

# Create app directory
WORKDIR /app

# Install dependencies and build static assets
# Copy package files first to leverage Docker cache
COPY package*.json ./

# Install dependencies with fallback to npm install if npm ci fails
# This handles cases where package-lock.json might be out of sync
RUN npm ci --legacy-peer-deps 2>/dev/null || npm install --legacy-peer-deps || npm install -g npm@12.0.1

COPY . ./
RUN CI=false npm run build

FROM nginx:alpine

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*
ARG API_UPSTREAM=cloudapi:8000
RUN printf 'server { listen 80; root /usr/share/nginx/html; location /api/ { proxy_pass http://%s/api/; proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; } location / { try_files $uri $uri/ /index.html; } }\n' "$API_UPSTREAM" > /etc/nginx/conf.d/default.conf

# Copy built assets from builder
COPY --from=builder /app/build /usr/share/nginx/html

# Expose port 80 for nginx
EXPOSE 80

# Use default nginx command
CMD ["nginx", "-g", "daemon off;"]
