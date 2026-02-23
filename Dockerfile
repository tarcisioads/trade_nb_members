# --- Base Node Image ---
FROM node:22 AS base
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*
# Ensure python is available for node-gyp
RUN ln -s /usr/bin/python3 /usr/bin/python
RUN npm install -g pnpm@10
WORKDIR /app

# --- Dependencies ---
FROM base AS dependencies
COPY pnpm-lock.yaml package.json ./
RUN pnpm config set only-built-dependencies sqlite3
RUN pnpm install --frozen-lockfile

# --- Build Backend ---
FROM base AS backend-builder
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN pnpm run build

# --- Build Frontend ---
FROM base AS frontend-builder
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN pnpm run frontend:build

# --- Backend Runtime ---
FROM base AS backend-runtime
WORKDIR /app
COPY --from=dependencies /app/package.json ./package.json
COPY --from=dependencies /app/pnpm-lock.yaml ./pnpm-lock.yaml
# Re-install dependencies and force rebuild of native modules
RUN pnpm config set only-built-dependencies sqlite3
RUN pnpm install --prod --frozen-lockfile && pnpm rebuild sqlite3

COPY --from=backend-builder /app/dist ./dist
# Database and logs folders will be mounted as volumes
EXPOSE 3000

# --- Frontend Runtime ---
FROM nginx:stable-alpine AS frontend-runtime
COPY --from=frontend-builder /app/dist /usr/share/nginx/html
# Custom Nginx config
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html; \
        try_files $uri $uri/ /index.html; \
    } \
    location /api/ { \
        resolver 127.0.0.11 valid=30s; \
        set $upstream_api http://trade-api:3000; \
        proxy_pass $upstream_api/api/; \
    } \
}' > /etc/nginx/conf.d/default.conf
EXPOSE 80
