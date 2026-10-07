#!/usr/bin/env bash
set -euo pipefail
cd /workspace/SquashLinares
export npm_config_cache=/workspace/.npm-cache
npm ci --no-fund
if [ ! -f .env.local ]; then
  cp .env.example .env.local
fi
docker compose up -d --wait db
npm run db:setup
