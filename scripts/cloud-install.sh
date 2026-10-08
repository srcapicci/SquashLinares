#!/usr/bin/env bash
set -euo pipefail
cd /workspace/SquashLinares
export npm_config_cache=/workspace/.npm-cache
npm ci --no-fund
if [ ! -f .env.local ]; then
  cp .env.example .env.local
fi
# Add the local development origin only if it has not been configured.
if ! rg -q '^APP_URL=' .env.local; then
  printf '\nAPP_URL=http://localhost:3000\n' >> .env.local
fi
docker compose up -d --wait db mail
npm run db:setup
