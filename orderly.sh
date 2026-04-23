#!/usr/bin/env bash
# ============================================================
#   Orderly — Master CLI Script
#   Usage:  ./orderly.sh <command>
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

# ── Colours ─────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

log()    { echo -e "${GREEN}[✔]${NC} $*"; }
info()   { echo -e "${BLUE}[ℹ]${NC} $*"; }
warn()   { echo -e "${YELLOW}[⚠]${NC} $*"; }
error()  { echo -e "${RED}[✖]${NC} $*" >&2; exit 1; }
header() { echo -e "\n${BOLD}${CYAN}━━━  $*  ━━━${NC}\n"; }

# ── Check node/npm ───────────────────────────────────────────
check_deps() {
  command -v node &>/dev/null || error "Node.js is not installed."
  command -v npm  &>/dev/null || error "npm is not installed."
}

# ── Commands ─────────────────────────────────────────────────

cmd_install() {
  header "Installing Dependencies"
  info "Installing root packages..."
  npm install --prefix "$SCRIPT_DIR"
  info "Installing backend packages..."
  npm install --prefix "$BACKEND_DIR"
  info "Installing frontend packages..."
  npm install --prefix "$FRONTEND_DIR"
  log "All dependencies installed!"
}

cmd_dev() {
  header "Starting Development Servers"
  info "Backend  → http://localhost:5000"
  info "Frontend → http://localhost:3000"
  exec npm run start --prefix "$SCRIPT_DIR"
}

cmd_build() {
  header "Building for Production"
  info "Building frontend..."
  npm run build --prefix "$FRONTEND_DIR"
  log "Frontend build complete → frontend/dist/"
}

cmd_start_prod() {
  header "Starting Production Server"
  cmd_build
  info "Starting backend in production mode..."
  NODE_ENV=production node "$BACKEND_DIR/server.js"
}

cmd_migrate() {
  header "Running Database Migration"
  SCHEMA="$BACKEND_DIR/config/schema.sql"

  [ -f "$SCHEMA" ] || error "Schema file not found: $SCHEMA"

  # Load env
  if [ -f "$BACKEND_DIR/.env" ]; then
    export $(grep -v '^#' "$BACKEND_DIR/.env" | xargs)
  else
    error ".env file not found in backend/"
  fi

  # Extract host/db/user from SUPABASE_URL
  # For Supabase the easiest migration is via the REST API using the service role key
  info "Applying schema via Supabase REST (service role key)..."

  # Run migration using Node + Supabase client (no psql needed)
  (cd "$BACKEND_DIR" && node - <<'JSEOF'
    const { createClient } = require('@supabase/supabase-js');
    const fs   = require('fs');
    const path = require('path');
    require('dotenv').config();

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

    async function migrate() {
      const schemaPath = path.join(__dirname, 'config/schema.sql');
      if (!fs.existsSync(schemaPath)) {
          console.error('❌ Schema file not found at:', schemaPath);
          return;
      }
      const sql = fs.readFileSync(schemaPath, 'utf8');

      // Split by statement terminator and run each block
      // Improve regex to handle complex blocks like DO $$ ... END $$;
      const statements = sql
        .split(/;\s*(\n|$)/)
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      let ok = 0, fail = 0;
      for (const stmt of statements) {
        const { error } = await supabase.rpc('exec_sql', { sql: stmt + ';' }).maybeSingle();
        if (error) {
          // exec_sql RPC may not exist — fall through to manual advice
          break;
        }
        ok++;
      }

      if (ok === statements.length) {
        console.log(`✅  Migration complete — ${ok} statements applied.`);
      } else {
        // Supabase free-tier doesn't expose exec_sql by default.
        // Guide the user to run the SQL directly.
        console.log('\n⚠️  Automatic SQL execution via RPC is not available or failed.');
        console.log('👉  To migrate, follow these steps:\n');
        console.log('   1. Open your Supabase dashboard → https://supabase.com/dashboard');
        console.log('   2. Select your project: fgfbwmcebwswnuvqvpwh');
        console.log('   3. Go to  SQL Editor  (left sidebar)');
        console.log('   4. Paste the contents of  backend/config/schema.sql  and click  Run\n');
        console.log('   Alternatively, if you have the Supabase CLI installed:');
        console.log('     supabase db push --db-url <your-direct-connection-string>\n');
      }
    }

    migrate().catch(err => {
      console.error('Migration error:', err.message);
    });
JSEOF
)
}

cmd_seed() {
  header "Seeding Database"
  (cd "$BACKEND_DIR" && node config/seed.js)
  log "Seed complete."
}

cmd_logs() {
  header "Backend Logs (live)"
  warn "Press Ctrl+C to stop."
  cd "$BACKEND_DIR" && NODE_ENV=development node server.js
}

cmd_env() {
  header "Current Environment"
  if [ -f "$BACKEND_DIR/.env" ]; then
    # Print without secrets
    info "backend/.env:"
    grep -v 'KEY\|SECRET\|PASSWORD\|JWT' "$BACKEND_DIR/.env" || true
    warn "(Sensitive keys hidden)"
  else
    warn "No .env found in backend/"
  fi
}

cmd_help() {
  echo -e "
${BOLD}${CYAN}Orderly — CLI Shortcuts${NC}

${BOLD}USAGE${NC}
  ./orderly.sh <command>

${BOLD}COMMANDS${NC}
  ${GREEN}install${NC}       Install all npm dependencies (root + backend + frontend)
  ${GREEN}dev${NC}           Start backend + frontend in development mode (concurrent)
  ${GREEN}build${NC}         Build the frontend for production  →  frontend/dist/
  ${GREEN}start${NC}         Build frontend then start backend in production mode
  ${GREEN}migrate${NC}       Apply schema.sql to Supabase (or prints manual steps)
  ${GREEN}seed${NC}          Run the database seeder  (creates super-admin etc.)
  ${GREEN}logs${NC}          Start backend and stream logs to terminal
  ${GREEN}env${NC}           Show current .env values (secrets hidden)
  ${GREEN}help${NC}          Show this help message

${BOLD}EXAMPLES${NC}
  ./orderly.sh install      # first-time setup
  ./orderly.sh migrate      # push schema to Supabase
  ./orderly.sh seed         # create default super-admin
  ./orderly.sh dev          # start coding 🚀
  ./orderly.sh build        # production build
"
}

# ── Router ───────────────────────────────────────────────────
check_deps

COMMAND="${1:-help}"
shift || true   # consume $1 so remaining args are available to sub-commands

case "$COMMAND" in
  install)    cmd_install  ;;
  dev)        cmd_dev      ;;
  build)      cmd_build    ;;
  start)      cmd_start_prod ;;
  migrate)    cmd_migrate  ;;
  seed)       cmd_seed     ;;
  logs)       cmd_logs     ;;
  env)        cmd_env      ;;
  help|--help|-h) cmd_help ;;
  *)
    error "Unknown command: '$COMMAND'. Run './orderly.sh help' to see all commands."
    ;;
esac
