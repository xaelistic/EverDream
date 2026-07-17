#!/usr/bin/env bash
# Run after SSH works: ssh coolify 'bash -s' < ed.app.new/scripts/recover-coolify-host.sh
set -euo pipefail

echo "=== Host ==="
hostname
uptime
df -h / /var/lib/docker 2>/dev/null || df -h /
free -h

echo "=== Docker daemon ==="
systemctl is-active docker || systemctl start docker
docker info --format '{{.ServerVersion}}' 2>/dev/null || { echo "Docker not responding"; exit 1; }

echo "=== Coolify core ==="
docker ps -a --format 'table {{.Names}}\t{{.Status}}' | grep -iE 'coolify|traefik|proxy' || true
docker start coolify coolify-proxy coolify-db coolify-redis 2>/dev/null || true
docker restart coolify coolify-proxy 2>/dev/null || docker ps -a | grep -i coolify

echo "=== Supabase stack ==="
SUPABASE_DIR="${SUPABASE_SERVICE_DIR:-/data/coolify/services/w9b3r7ces8npevhqcjwn4lzk}"
if [ -d "$SUPABASE_DIR" ]; then
  cd "$SUPABASE_DIR"
  docker compose ps
  docker compose up -d
  docker compose restart supabase-kong supabase-auth
  curl -fsS http://127.0.0.1:8000/auth/v1/health && echo " Supabase auth OK" || echo "Supabase auth FAILED"
fi

echo "=== EverDream app ==="
docker ps -a --format 'table {{.Names}}\t{{.Status}}' | grep -iE 'everdream|qg4o8' || true

echo "=== Listening ports ==="
ss -tlnp | grep -E ':22|:80|:443|:8000' || netstat -tlnp 2>/dev/null | grep -E ':22|:80|:443|:8000' || true

echo "Done. Check https://coolify.n1g3.com and https://everdream.n1g3.com"