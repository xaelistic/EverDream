#!/usr/bin/env bash
# Read-only host diagnostics. Safe to run anytime — does NOT restart anything.
# Usage (once SSH works):
#   ssh coolify 'bash -s' < ed.app.new/scripts/diagnose-host.sh
set -euo pipefail

echo "=== Host (read-only) ==="
hostname
date -u
uptime
free -h || true
df -h / /var/lib/docker 2>/dev/null || df -h /
echo

echo "=== Load / pressure ==="
# Prefer non-invasive snapshots only
if command -v vmstat >/dev/null 2>&1; then
  vmstat 1 3 || true
fi
if [ -r /proc/loadavg ]; then
  echo "loadavg: $(cat /proc/loadavg)"
fi
if [ -r /proc/meminfo ]; then
  grep -E 'MemTotal|MemAvailable|SwapTotal|SwapFree' /proc/meminfo || true
fi
echo

echo "=== Docker daemon ==="
if systemctl is-active docker >/dev/null 2>&1; then
  echo "docker: active"
else
  echo "docker: NOT active ($(systemctl is-active docker 2>/dev/null || echo unknown))"
fi
docker info --format 'version={{.ServerVersion}} containers={{.ContainersRunning}}/{{.Containers}} images={{.Images}}' 2>/dev/null \
  || echo "docker info failed"
echo

echo "=== Coolify / proxy ==="
docker ps -a --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' 2>/dev/null \
  | grep -iE 'coolify|traefik|proxy' || echo "(none matched)"
echo

echo "=== EverDream containers ==="
docker ps -a --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' 2>/dev/null \
  | grep -iE 'everdream|qg4o8' || echo "(none matched — check Coolify app uuid)"
echo

echo "=== Supabase stack ==="
SUPABASE_DIR="${SUPABASE_SERVICE_DIR:-/data/coolify/services/w9b3r7ces8npevhqcjwn4lzk}"
if [ -d "$SUPABASE_DIR" ]; then
  (cd "$SUPABASE_DIR" && docker compose ps) 2>/dev/null || true
  echo -n "local Kong auth health: "
  curl -fsS --max-time 5 "http://127.0.0.1:8000/auth/v1/health" && echo " OK" \
    || echo "FAILED/timeout"
else
  echo "Supabase dir missing: $SUPABASE_DIR"
fi
echo

echo "=== Listening ports (22/80/443/8000) ==="
ss -tlnp 2>/dev/null | grep -E ':22|:80|:443|:8000' \
  || netstat -tlnp 2>/dev/null | grep -E ':22|:80|:443|:8000' \
  || echo "ss/netstat unavailable"
echo

echo "=== Disk inodes (if full, containers hang) ==="
df -i / /var/lib/docker 2>/dev/null || true
echo

echo "Done (no changes made). If load is high or disk full, fix that before any restart."
echo "Gentle recovery only after diagnosis:"
echo "  1) docker start coolify coolify-proxy coolify-db coolify-redis"
echo "  2) cd \$SUPABASE_DIR && docker compose up -d"
echo "  3) restart only failing service, not whole host"
