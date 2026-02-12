#!/bin/bash
# Switch between local and production Supabase environments
# Usage: ./scripts/switch-env.sh local|prod

set -e

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

case "$1" in
  local|dev)
    cp "$PROJECT_DIR/.env.local.dev" "$PROJECT_DIR/.env.local"
    echo "✓ Switched to LOCAL Supabase (http://127.0.0.1:54321)"
    echo "  Studio: http://127.0.0.1:54323"
    echo "  Make sure 'supabase start' is running"
    ;;
  prod|production)
    cp "$PROJECT_DIR/.env.production" "$PROJECT_DIR/.env.local"
    echo "✓ Switched to PRODUCTION Supabase"
    echo "  ⚠ You are now connected to the LIVE database"
    ;;
  status)
    if grep -q "127.0.0.1" "$PROJECT_DIR/.env.local" 2>/dev/null; then
      echo "Currently using: LOCAL Supabase"
    else
      echo "Currently using: PRODUCTION Supabase"
    fi
    ;;
  *)
    echo "Usage: ./scripts/switch-env.sh [local|prod|status]"
    echo ""
    echo "  local  - Switch to local Supabase (safe for testing)"
    echo "  prod   - Switch to production Supabase (live data)"
    echo "  status - Show which environment is active"
    exit 1
    ;;
esac

echo ""
echo "Restart your dev server for changes to take effect."
