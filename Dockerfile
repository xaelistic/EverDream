# Multi-stage build for EverDream (ed.app.new Vite app)
# Builds the React PWA and serves it with nginx

# Stage 1: Build the app
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for better caching
COPY ed.app.new/package.json ed.app.new/package-lock.json ./

# Install dependencies (use legacy-peer-deps for Vite 8 + older React/Three ecosystem)
RUN npm ci --legacy-peer-deps

# Copy the rest of the app source
COPY ed.app.new/ ./

# Build the production bundle (outputs to /app/dist)
RUN npm run build

# Stage 2: Serve with nginx (lightweight static server)
FROM nginx:alpine

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80 (Coolify/Traefik will handle external routing)
EXPOSE 80

# Start nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
