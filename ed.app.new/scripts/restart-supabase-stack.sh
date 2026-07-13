#!/usr/bin/env bash
# Restart self-hosted Supabase on Coolify when auth API times out (supabase.n1g3.com).
set -euo pipefail

SERVICE_DIR="${SUPABASE_SERVICE_DIR:-/data/coolify/services/w9b3r7ces8npevhqcjwn4lzk}"

echo "Restarting Supabase stack in ${SERVICE_DIR}..."
cd "$SERVICE_DIR"
docker compose ps
docker compose restart supabase-kong supabase-auth supabase-rest realtime-dev.supabase-realtime
docker compose ps

echo "Health check (local Kong):"
curl -fsS "http://127.0.0.1:8000/auth/v1/health" || echo "Kong health check failed — inspect logs: docker compose logs supabase-kong --tail 50"