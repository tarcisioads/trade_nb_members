# --- Base Node Image ---
FROM node:22-slim AS base
RUN npm install -g pnpm@8
WORKDIR /app
COPY pnpm-lock.yaml package.json ./

# --- Dependencies ---
FROM base AS dependencies
RUN pnpm install --frozen-lockfile

# --- Backend Build ---
FROM dependencies AS backend-builder
COPY . .
RUN pnpm run build

# --- Frontend Build ---
FROM dependencies AS frontend-builder
COPY . .
RUN pnpm run frontend:build

# --- Backend Runtime ---
FROM base AS backend-runtime
RUN pnpm install --prod --frozen-lockfile
COPY --from=backend-builder /app/dist ./dist
# Database and logs should be mounted as volumes
EXPOSE 3000

# --- Frontend Runtime ---
FROM nginx:stable-alpine AS frontend-runtime
COPY --from=frontend-builder /app/dist /usr/share/nginx/html
# Custom Nginx config if needed for SPA routing
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html; \
        try_files $uri $uri/ /index.html; \
    } \
    location /api/ { \
        proxy_pass http://trade-api:3000/api/; \
    } \
}' > /etc/nginx/conf.d/default.conf
EXPOSE 80
