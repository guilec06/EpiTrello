#!/usr/bin/env bash
set -euo pipefail

# ──────────────────────────────────────────────────────────────────────────────
# Usage:
#   ./start.sh [dev|prod] [--build] [--down] [--logs]
#
#   dev   (default)  docker compose / docker-compose up (hot-reload, db on localhost:3306)
#   prod             docker compose / docker-compose -f docker-compose.prod.yml up -d
#
# Flags:
#   --build   force rebuild of images before starting
#   --down    stop and remove containers instead of starting
#   --logs    tail logs after starting (dev only by default)
# ──────────────────────────────────────────────────────────────────────────────

ENV="dev"
BUILD=""
DOWN=false
LOGS=false

# ── Detect compose command (v2 plugin vs v1 standalone) ───────────────────────
if docker compose version &>/dev/null 2>&1; then
  COMPOSE="docker compose"
elif command -v docker-compose &>/dev/null; then
  COMPOSE="docker-compose"
else
  echo "ERROR: neither 'docker compose' nor 'docker-compose' found."
  echo "Install Docker Desktop (includes Compose v2) or 'docker-compose' v1."
  exit 1
fi

for arg in "$@"; do
  case "$arg" in
    dev|prod) ENV="$arg" ;;
    --build)  BUILD="--build" ;;
    --down)   DOWN=true ;;
    --logs)   LOGS=true ;;
    *)
      echo "Unknown argument: $arg"
      echo "Usage: $0 [dev|prod] [--build] [--down] [--logs]"
      exit 1
      ;;
  esac
done

# ── Resolve compose file(s) ───────────────────────────────────────────────────
if [ "$ENV" = "prod" ]; then
  COMPOSE_FILES="-f docker-compose.prod.yml"
else
  COMPOSE_FILES=""   # uses docker-compose.yml by default
fi

# ── Env file check ────────────────────────────────────────────────────────────
if [ ! -f .env ]; then
  echo "WARNING: .env not found. Copying from .env.example …"
  cp .env.example .env
fi

# ── Down ──────────────────────────────────────────────────────────────────────
if [ "$DOWN" = true ]; then
  echo "==> Stopping [$ENV] environment …"
  # shellcheck disable=SC2086
  $COMPOSE $COMPOSE_FILES down
  exit 0
fi

# ── Up ────────────────────────────────────────────────────────────────────────
echo "==> Starting [$ENV] environment …"

if [ "$ENV" = "prod" ]; then
  # shellcheck disable=SC2086
  $COMPOSE $COMPOSE_FILES up $BUILD -d
  echo ""
  echo "Production stack is up."
  echo "  App  → http://localhost:80"
  echo ""
  echo "Tip: follow logs with  $COMPOSE -f docker-compose.prod.yml logs -f"
else
  # Dev: run in foreground so Ctrl-C stops all services
  # shellcheck disable=SC2086
  $COMPOSE $COMPOSE_FILES up $BUILD
fi

# ── Optional log tail (explicit --logs flag, meaningful in prod) ──────────────
if [ "$LOGS" = true ] && [ "$ENV" = "prod" ]; then
  # shellcheck disable=SC2086
  $COMPOSE $COMPOSE_FILES logs -f
fi
