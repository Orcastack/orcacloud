FROM node:20-alpine AS builder
WORKDIR /app
ARG REACT_APP_API_URL=http://localhost:8000/api/v1
ARG REACT_APP_ENVIRONMENT=production
ARG REACT_APP_PORTAL_PUBLIC_PORT=4000
ENV REACT_APP_API_URL=$REACT_APP_API_URL REACT_APP_ENVIRONMENT=$REACT_APP_ENVIRONMENT REACT_APP_PORTAL_PUBLIC_PORT=$REACT_APP_PORTAL_PUBLIC_PORT REACT_APP_PORTAL_VARIANT=enterprise GENERATE_SOURCEMAP=false NODE_OPTIONS=--max-old-space-size=2048
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . ./
RUN CI=false npm run build
FROM nginx:alpine
RUN rm -rf /usr/share/nginx/html/*
ARG API_UPSTREAM=computeapi:8000
RUN printf 'server { listen 80; root /usr/share/nginx/html; location /api/ { proxy_pass http://%s/api/; proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; } location / { try_files $uri $uri/ /index.html; } }\n' "$API_UPSTREAM" > /etc/nginx/conf.d/default.conf
COPY --from=builder /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
