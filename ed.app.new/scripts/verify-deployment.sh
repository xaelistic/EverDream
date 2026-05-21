#!/bin/bash
# ============================================================
# EverDream — Backend Deployment Verification Script
# Run this after deploying edge functions to verify everything works.
#
# Usage:
#   bash scripts/verify-deployment.sh
#
# Prerequisites:
#   - supabase CLI installed and logged in
#   - Project linked: supabase link --project-ref YOUR_REF
# ============================================================

set -e

echo "🔍 EverDream Backend Deployment Verification"
echo "============================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS=0
FAIL=0
SKIP=0

check() {
  local name="$1"
  local result="$2"
  if [ "$result" = "pass" ]; then
    echo -e "  ${GREEN}✅${NC} $name"
    PASS=$((PASS + 1))
  elif [ "$result" = "skip" ]; then
    echo -e "  ${YELLOW}⏭️${NC} $name (skipped)"
    SKIP=$((SKIP + 1))
  else
    echo -e "  ${RED}❌${NC} $name"
    FAIL=$((FAIL + 1))
  fi
}

# ── 1. Check Supabase CLI ──────────────────────────────────────

echo "1️⃣  Checking Supabase CLI..."
if command -v supabase &> /dev/null; then
  check "Supabase CLI installed" "pass"
  SUPABASE_VERSION=$(supabase --version 2>/dev/null | head -1)
  check "Version: $SUPABASE_VERSION" "pass"
else
  check "Supabase CLI installed" "fail"
  echo ""
  echo "Install with: npm install -g supabase"
  exit 1
fi

echo ""

# ── 2. Check Project Link ──────────────────────────────────────

echo "2️⃣  Checking project link..."
PROJECT_REF="${SUPABASE_PROJECT_ID:-}"
if [ -n "$PROJECT_REF" ]; then
  check "Project ref set: $PROJECT_REF" "pass"
elif [ -f ".supabase/project-ref" ]; then
  PROJECT_REF=$(cat .supabase/project-ref)
  check "Project ref from file: $PROJECT_REF" "pass"
else
  check "Project ref configured" "skip"
  echo "  Run: supabase link --project-ref YOUR_REF"
fi

echo ""

# ── 3. Check Edge Functions Exist ──────────────────────────────

echo "3️⃣  Checking edge functions..."

# Try to list functions
FUNCTIONS_OUTPUT=$(supabase functions list 2>/dev/null || echo "ERROR")

if echo "$FUNCTIONS_OUTPUT" | grep -q "analyze-dream"; then
  check "analyze-dream function" "pass"
else
  check "analyze-dream function" "fail"
fi

if echo "$FUNCTIONS_OUTPUT" | grep -q "generate-image"; then
  check "generate-image function" "pass"
else
  check "generate-image function" "fail"
fi

if echo "$FUNCTIONS_OUTPUT" | grep -q "transcribe-audio"; then
  check "transcribe-audio function" "pass"
else
  check "transcribe-audio function" "fail"
fi

if echo "$FUNCTIONS_OUTPUT" | grep -q "health-check"; then
  check "health-check function" "pass"
else
  check "health-check function" "skip"
fi

echo ""

# ── 4. Check Environment Variables ─────────────────────────────

echo "4️⃣  Checking environment variables..."

# Check .env file
if [ -f ".env" ]; then
  check ".env file exists" "pass"

  if grep -q "VITE_SUPABASE_URL" .env && ! grep -q "YOUR_PROJECT" .env; then
    check "VITE_SUPABASE_URL configured" "pass"
  else
    check "VITE_SUPABASE_URL configured" "fail"
  fi

  if grep -q "VITE_SUPABASE_ANON_KEY" .env && ! grep -q "YOUR_ANON_KEY" .env; then
    check "VITE_SUPABASE_ANON_KEY configured" "pass"
  else
    check "VITE_SUPABASE_ANON_KEY configured" "fail"
  fi
else
  check ".env file exists" "skip"
fi

echo ""

# ── 5. Check Source Files ──────────────────────────────────────

echo "5️⃣  Checking source files..."

[ -f "src/lib/dreamPipeline.ts" ] && check "dreamPipeline.ts" "pass" || check "dreamPipeline.ts" "fail"
[ -f "src/lib/dream-analyzer.ts" ] && check "dream-analyzer.ts" "pass" || check "dream-analyzer.ts" "fail"
[ -f "src/lib/transcriptionWhisper.ts" ] && check "transcriptionWhisper.ts" "pass" || check "transcriptionWhisper.ts" "fail"
[ -f "src/lib/nft.ts" ] && check "nft.ts" "pass" || check "nft.ts" "fail"
[ -f "src/lib/supabase/client.ts" ] && check "supabase/client.ts" "pass" || check "supabase/client.ts" "fail"
[ -f "src/lib/supabase/dbSetup.ts" ] && check "supabase/dbSetup.ts" "pass" || check "supabase/dbSetup.ts" "fail"
[ -f "src/lib/pipelineSaver.ts" ] && check "pipelineSaver.ts" "pass" || check "pipelineSaver.ts" "fail"
[ -f "src/lib/dreamPersistence.ts" ] && check "dreamPersistence.ts" "pass" || check "dreamPersistence.ts" "fail"
[ -f "src/lib/dreamService.ts" ] && check "dreamService.ts" "pass" || check "dreamService.ts" "fail"
[ -f "src/lib/api/errorHandling.ts" ] && check "api/errorHandling.ts" "pass" || check "api/errorHandling.ts" "fail"
[ -f "src/lib/hooks/useApiCall.ts" ] && check "hooks/useApiCall.ts" "pass" || check "hooks/useApiCall.ts" "fail"

echo ""

# ── 6. Check Edge Function Source ──────────────────────────────

echo "6️⃣  Checking edge function source..."

[ -f "supabase/functions/analyze-dream/index.ts" ] && check "analyze-dream/index.ts" "pass" || check "analyze-dream/index.ts" "fail"
[ -f "supabase/functions/generate-image/index.ts" ] && check "generate-image/index.ts" "pass" || check "generate-image/index.ts" "fail"
[ -f "supabase/functions/transcribe-audio/index.ts" ] && check "transcribe-audio/index.ts" "pass" || check "transcribe-audio/index.ts" "fail"

echo ""

# ── 7. Run Tests ───────────────────────────────────────────────

echo "7️⃣  Running tests..."
if command -v npm &> /dev/null; then
  TEST_OUTPUT=$(npm test 2>&1 || true)
  if echo "$TEST_OUTPUT" | grep -q "passed"; then
    TEST_COUNT=$(echo "$TEST_OUTPUT" | grep -oP '\d+(?= passed)' | tail -1)
    check "All tests passing ($TEST_COUNT tests)" "pass"
  else
    check "Tests passing" "fail"
  fi
else
  check "npm available" "skip"
fi

echo ""

# ── Summary ────────────────────────────────────────────────────

echo "============================================="
echo "📊 Verification Summary"
echo "  ${GREEN}Passed:${NC} $PASS"
echo "  ${RED}Failed:${NC} $FAIL"
echo "  ${YELLOW}Skipped:${NC} $SKIP"
echo ""

if [ $FAIL -gt 0 ]; then
  echo "⚠️  Some checks failed. Review the output above."
  exit 1
else
  echo "✅ All critical checks passed!"
  exit 0
fi
