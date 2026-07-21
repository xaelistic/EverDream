# Multi-stage build for EverDream PWA
# Builds the Vite app in this directory and serves with nginx

FROM node:20-alpine AS builder
WORKDIR /app

# Vite bakes VITE_* at build time — must be passed as build args in Coolify
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_REQUIRE_AUTH=true
ARG VITE_APP_BASE_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
    VITE_REQUIRE_AUTH=$VITE_REQUIRE_AUTH \
    VITE_APP_BASE_URL=$VITE_APP_BASE_URL

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY . .
# Fail the image build early if auth gate is on but Supabase is missing
RUN if [ -z "$VITE_SUPABASE_URL" ] || [ -z "$VITE_SUPABASE_ANON_KEY" ]; then \
      echo "ERROR: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set as Docker build args"; \
      exit 1; \
    fi \
 && npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html

# PWA-friendly nginx config:
# - Explicit locations for service worker files (must be served from root, no cache)
# - SPA fallback only for app routes
# - CSP via HTTP header (stronger than meta)
# - Proper caching + security headers
RUN echo 'server { \
    listen 80; \
    root /usr/share/nginx/html; \
    index index.html; \
\
    # Service worker and PWA files - must be at root, no fallback, no cache \
    location = /sw.js { \
        add_header Cache-Control "no-cache, no-store, must-revalidate"; \
        add_header Content-Type "application/javascript"; \
        try_files $uri =404; \
    } \
    location = /registerSW.js { \
        add_header Cache-Control "no-cache, no-store, must-revalidate"; \
        add_header Content-Type "application/javascript"; \
        try_files $uri =404; \
    } \
\
    # Vite hashed assets (/assets/*.js, *.css etc) + other static files — MUST come before the SPA catch-all \
    location /assets { \
        expires 1y; \
        add_header Cache-Control "public, immutable"; \
        try_files $uri =404; \
    } \
    location ~* \.(?:js|css|json|png|ico|svg|webmanifest|woff2?)$ { \
        expires 1d; \
        add_header Cache-Control "public"; \
        try_files $uri =404; \
    } \
\
    # SPA fallback for client routes (after all explicit static locations) \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
\
    # Security + CSP headers (media-src blob: data: is REQUIRED for local recorded video/audio + thumbnails to play) \
    add_header X-Content-Type-Options "nosniff" always; \
    add_header Referrer-Policy "strict-origin-when-cross-origin" always; \
    add_header Content-Security-Policy "default-src '\''self'\''; script-src '\''self'\'' '\''unsafe-inline'\'' '\''unsafe-eval'\'' https://*.supabase.co https://supabase.n1g3.com; style-src '\''self'\'' '\''unsafe-inline'\''; img-src '\''self'\'' data: blob: https:; media-src '\''self'\'' blob: data: https:; connect-src '\''self'\'' https://*.supabase.co wss://*.supabase.co https://supabase.n1g3.com wss://supabase.n1g3.com https://image.pollinations.ai http: https: wss:; worker-src '\''self'\'' blob:; manifest-src '\''self'\''; frame-ancestors '\''none'\'';" always; \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
