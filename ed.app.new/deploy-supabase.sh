#!/bin/bash
# ============================================================
# EverDream — Complete Supabase Deployment Script
# Run this from WSL or any machine with network access to Coolify
# ============================================================

set -e

# ── Config ────────────────────────────────────────────────────
SUPABASE_URL="http://supabasekong-yo5et7xep1tmsim6fzpq4wjw.185.249.74.204.sslip.io"
PROJECT_REF="olwviffbwcjbcyyleorp"
DB_HOST="db.${PROJECT_REF}.supabase.co"
DB_PORT="5432"
DB_NAME="postgres"
DB_USER="postgres"
OPENROUTER_KEY="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"
REPO_DIR="/mnt/c/Users/xaeli/Documents/GitHub/EDI/EverDream/ed.app.new"

echo "============================================"
echo "EverDream Supabase Deployment"
echo "============================================"
echo ""

# ── Step 1: Database Password ───────────────────────────────
echo "Step 1: Database Migration"
echo "--------------------------------------------"
echo "We need the database password to run migrations."
echo "Get it from: Coolify → Supabase service → Environment Variables → SERVICE_PASSWORD_POSTGRES"
echo ""
read -sp "Enter database password: " DB_PASSWORD
echo ""
echo ""

# ── Step 2: Run Migration via psql ─────────────────────────
echo "Running database migration..."

# Install psql if needed
if ! command -v psql &> /dev/null; then
  echo "Installing postgresql-client..."
  sudo apt-get update -qq && sudo apt-get install -qq -y postgresql-client 2>/dev/null || {
    echo "Could not install psql. Trying alternative method..."
  }
fi

export PGPASSWORD="$DB_PASSWORD"

# Run the consolidated schema
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -f "${REPO_DIR}/supabase/migrations/001_consolidated_schema.sql" 2>&1 && \
  echo "✅ Database migration complete" || \
  echo "❌ Migration failed — check password and try again"

echo ""

# ── Step 3: Deploy Edge Functions via Management API ───────
echo "Step 2: Edge Functions"
echo "--------------------------------------------"

# We need the service role key for the Management API
# Get it from: Coolify → supabase-edge-functions → Environment → SUPABASE_SERVICE_ROLE_KEY
echo "We need the service role key to deploy edge functions."
echo "Get it from: Coolify → supabase-edge-functions → Environment → SUPABASE_SERVICE_ROLE_KEY"
echo ""
read -sp "Enter service role key: " SERVICE_KEY
echo ""
echo ""

# Deploy each function via the Supabase Management API
for fn in analyze-dream generate-image health-check transcribe-audio; do
  echo "Deploying ${fn}..."
  
  # Read the function source
  FUNCTION_SRC=$(cat "${REPO_DIR}/supabase/functions/${fn}/index.ts")
  
  # Deploy via Management API
  RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST "${SUPABASE_URL}/v1/projects/${PROJECT_REF}/functions" \
    -H "Authorization: Bearer ${SERVICE_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"name\": \"${fn}\", \"verify_jwt\": false, \"entrypoint_path\": \"index.ts\", \"source_code\": $(echo "$FUNCTION_SRC" | python3 -c 'import sys,json; print(json.dumps(sys.stdin.read()))')}")
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | sed '$d')
  
  if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
    echo "  ✅ ${fn} deployed"
  else
    echo "  ❌ ${fn} failed (HTTP $HTTP_CODE)"
    echo "  $BODY" | head -3
  fi
done

echo ""

# ── Step 4: Set Secrets ──────────────────────────────────────
echo "Step 3: Setting secrets..."
echo ""

# Set OPENROUTER_API_KEY
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST "${SUPABASE_URL}/v1/projects/${PROJECT_REF}/secrets" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"name": "OPENROUTER_API_KEY", "value": "'"$OPENROUTER_KEY"'"}')

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
  echo "  ✅ OPENROUTER_API_KEY set"
else
  echo "  ❌ OPENROUTER_API_KEY failed (HTTP $HTTP_CODE)"
fi

echo ""
echo "============================================"
echo "✅ Deployment complete!"
echo "============================================"
echo ""
echo "Next steps:"
echo "  cd ${REPO_DIR}"
echo "  npm install"
echo "  npm run dev"
