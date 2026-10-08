#!/bin/sh
set -eu
cd /app
# Refresh dependencies only if manifests changed, including after image rebuilds.
current_fingerprint="$(sha256sum package.json package-lock.json | sha256sum)"
if [ ! -f node_modules/.dependency-fingerprint ] || [ "$(cat node_modules/.dependency-fingerprint)" != "$current_fingerprint" ]; then
  npm ci --no-fund
  printf '%s\n' "$current_fingerprint" > node_modules/.dependency-fingerprint
fi
node scripts/db-setup.mjs
exec npm run dev
