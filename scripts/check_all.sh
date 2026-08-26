#!/usr/bin/env bash
# Run every check in one go (services must be up — see BUILD_NOTES.md).
#   bash scripts/check_all.sh
set -uo pipefail
cd "$(dirname "$0")/.."

failures=0
step() {
  echo
  echo "== $1"
  shift
  "$@" || failures=$((failures + 1))
}

step "design tokens: WCAG contrast gate" node scripts/check_contrast.mjs
step "api: lint" bash -c "cd api && uv run ruff check app tests"
step "api: unit + live tests (incl. retrieval eval)" bash -c "cd api && uv run pytest tests -q"
step "db: two-role RLS privacy proof" bash -c "cd api && uv run python ../scripts/test_rls.py"
step "web: lint" bash -c "cd web && npx next lint"
step "web: route smoke test" node scripts/smoke_ui.mjs

echo
if [ "$failures" -gt 0 ]; then
  echo "$failures check(s) FAILED"
  exit 1
fi
echo "All checks passed."
