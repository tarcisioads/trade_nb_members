# --- Base Node Image ---
FROM node:22 AS base
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    sqlite3 \
    libsqlite3-dev \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./

# --- Dependencies ---
FROM base AS dependencies
RUN npm install

# --- Build Backend ---
FROM base AS backend-builder
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

# --- Build Frontend ---
FROM base AS frontend-builder
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run frontend:build

# --- Backend Runtime ---
FROM base AS backend-runtime
WORKDIR /app
COPY package*.json ./
# Install only production dependencies
RUN npm install --omit=dev

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
    location /api { \
        resolver 127.0.0.11 valid=30s; \
        set $upstream_api http://trade-api:3000; \
        proxy_pass $upstream_api; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
    } \
}' > /etc/nginx/conf.d/default.conf
EXPOSE 80
