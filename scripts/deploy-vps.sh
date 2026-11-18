#!/usr/bin/env bash
# Deploys the latest `main` to the production VPS.
#
# Runs ON the server. GitHub Actions pipes it over SSH (.github/workflows/deploy.yml); it can also be
# run by hand on the server:  bash /var/www/app/scripts/deploy-vps.sh
#
# Steps: fetch main -> install dependencies if they changed -> backend tests -> frontend build ->
# restart pm2 apps -> health checks. If any step fails after the code has changed, it rolls back to
# the commit that was running before and restarts that.
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/var/www/app}"
BRANCH="${BRANCH:-main}"
BACKEND_HEALTH="http://127.0.0.1:5000/api/health"
FRONTEND_HEALTH="http://127.0.0.1:3000/"

log() { printf '\n==> %s\n' "$*"; }

# One deploy at a time
exec 9>/tmp/dwp-deploy.lock
flock -n 9 || { echo "Another deployment is already running."; exit 1; }

cd "$APP_DIR"
PREV="$(git rev-parse HEAD)"

log "Fetching origin/$BRANCH"
git fetch --prune origin "$BRANCH"
TARGET="$(git rev-parse FETCH_HEAD)"
if [ -n "${EXPECTED_SHA:-}" ] && [ "$EXPECTED_SHA" != "$TARGET" ]; then
  echo "Note: $BRANCH has moved on since this run started; deploying the newest commit $TARGET."
fi
echo "Running: $PREV"
echo "Deploying: $TARGET"

changed_between() { ! git diff --quiet "$1" "$2" -- "${@:3}"; }

install_deps_if_needed() {
  local from="$1" to="$2"
  if changed_between "$from" "$to" backend/package.json backend/package-lock.json; then
    log "Backend dependencies changed: npm ci"
    (cd backend && npm ci --omit=dev --no-audit --no-fund)
  fi
  if changed_between "$from" "$to" frontend/package.json frontend/package-lock.json; then
    log "Frontend dependencies changed: npm ci"
    (cd frontend && npm ci --legacy-peer-deps --no-audit --no-fund)
  fi
}

build_and_restart() {
  log "Building frontend"
  (cd frontend && npm run build)
  log "Restarting apps"
  pm2 restart backend frontend --update-env
  pm2 save >/dev/null 2>&1 || true
}

wait_for() {
  local url="$1" name="$2"
  for _ in $(seq 1 30); do
    if curl -fsS -o /dev/null --max-time 5 "$url"; then echo "$name is up"; return 0; fi
    sleep 2
  done
  echo "$name did not respond at $url"
  return 1
}

ROLLING_BACK=0
rollback() {
  local status=$?
  if [ "$ROLLING_BACK" = 1 ] || [ "$(git rev-parse HEAD)" = "$PREV" ]; then exit "$status"; fi
  ROLLING_BACK=1
  log "Deployment failed (exit $status). Rolling back to $PREV"
  git checkout -f -B "$BRANCH" "$PREV"
  install_deps_if_needed "$TARGET" "$PREV"
  build_and_restart
  wait_for "$BACKEND_HEALTH" "Backend" || true
  wait_for "$FRONTEND_HEALTH" "Frontend" || true
  echo "Rolled back to $PREV. The failed commit was $TARGET."
  exit 1
}
trap rollback ERR

if [ "$PREV" = "$TARGET" ] && [ "$(git branch --show-current)" = "$BRANCH" ] && [ -z "${FORCE:-}" ]; then
  echo "Already on $TARGET; nothing to deploy. (Set FORCE=1 to rebuild anyway.)"
  exit 0
fi

log "Checking out $TARGET"
# -f: the server copy must match the commit exactly (secrets in .env and uploads are git-ignored).
git checkout -f -B "$BRANCH" "$TARGET"

install_deps_if_needed "$PREV" "$TARGET"

log "Backend tests"
(cd backend && npm test)

build_and_restart

log "Health checks"
wait_for "$BACKEND_HEALTH" "Backend"
wait_for "$FRONTEND_HEALTH" "Frontend"

trap - ERR
log "Deployed $(git log -1 --format='%h %s')"
