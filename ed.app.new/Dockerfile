# Multi-stage build for EverDream PWA
# Builds the Vite app in this directory and serves with nginx

FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY . .
RUN npm run build

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
    # Manifest and icons \
    location ~* \.(?:json|png|ico|svg)$ { \
        expires 1d; \
        add_header Cache-Control "public"; \
        try_files $uri =404; \
    } \
\
    # SPA fallback for client routes (do NOT catch /sw.js or /registerSW.js) \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
\
    # Security + CSP headers (override meta for strength) \
    add_header X-Content-Type-Options "nosniff" always; \
    add_header Referrer-Policy "strict-origin-when-cross-origin" always; \
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://fonts.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https: http:; media-src 'self' blob: data:; connect-src 'self' http: https: wss:; worker-src 'self' blob:; manifest-src 'self';" always; \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
