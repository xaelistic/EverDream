#!/usr/bin/env bash
# Gentle production recovery — prefer diagnose-host.sh first.
# Run: ssh coolify 'bash -s' < ed.app.new/scripts/recover-production.sh
# Does NOT reboot the host. Only restarts the minimal Supabase edge pieces if needed.
set -euo pipefail

SUPABASE_DIR="${SUPABASE_SERVICE_DIR:-/data/coolify/services/w9b3r7ces8npevhqcjwn4lzk}"
EVERDREAM_APP="${EVERDREAM_APP_UUID:-qg4o8sw4wgcss8kc0wk88gg0}"
GENTLE="${GENTLE:-1}"

echo "=== Preflight (read-only) ==="
uptime
free -h | head -2 || true
df -h / | tail -1 || true

echo "=== Container status ==="
docker ps --format 'table {{.Names}}\t{{.Status}}' | grep -iE 'supabase|everdream|qg4o8|coolify|traefik' || true

echo -n "=== Local Kong health: "
if curl -fsS --max-time 5 "http://127.0.0.1:8000/auth/v1/health" >/dev/null 2>&1; then
  echo "OK — skipping Supabase restart"
  SKIP_SUPABASE=1
else
  echo "FAILED — will restart Kong/auth/rest only"
  SKIP_SUPABASE=0
fi

if [ "$SKIP_SUPABASE" = "0" ]; then
  if [ ! -d "$SUPABASE_DIR" ]; then
    echo "Supabase dir missing: $SUPABASE_DIR"
    exit 1
  fi
  cd "$SUPABASE_DIR"
  # Avoid `docker compose restart` of the entire stack — thrash risk on small VPS
  docker compose up -d supabase-kong supabase-auth supabase-rest
  sleep 3
  echo -n "Local Kong health after: "
  curl -fsS --max-time 8 "http://127.0.0.1:8000/auth/v1/health" && echo " OK" \
    || echo "FAILED — logs: docker compose logs supabase-kong --tail 40"
fi

echo "=== Public health (external may fail if firewall/DNS) ==="
curl -fsS --max-time 8 "https://supabase.n1g3.com/auth/v1/health" && echo " OK" \
  || echo "supabase.n1g3.com not reachable externally yet"
curl -fsS --max-time 8 -o /dev/null -w "everdream.n1g3.com HTTP %{http_code}\n" "https://everdream.n1g3.com/" \
  || echo "everdream.n1g3.com not reachable"

echo "=== EverDream app containers ==="
docker ps --format '{{.Names}}\t{{.Status}}' | grep -iE 'everdream|qg4o8' || true

echo "Done (host not rebooted). App uuid: $EVERDREAM_APP"
echo "If Coolify UI is up but app container is stopped: start it from UI (do not mass-restart)."