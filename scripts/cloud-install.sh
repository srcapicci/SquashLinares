#!/usr/bin/env bash
set -euo pipefail
cd /workspace/SquashLinares
export BUILDX_CONFIG="${BUILDX_CONFIG:-/workspace/.docker-buildx}"
if [ -n "${NODE_EXTRA_CA_CERTS:-}" ] && [ -f "$NODE_EXTRA_CA_CERTS" ]; then
  python - <<'PYCA'
import json, os
from pathlib import Path
config={"services":{"app":{"build":{"secrets":[{"source":"cloud_ca","target":"trusted_ca"}]},"secrets":[{"source":"cloud_ca","target":"trusted-ca.pem"}],"environment":{"NODE_EXTRA_CA_CERTS":"/run/secrets/trusted-ca.pem"}}},"secrets":{"cloud_ca":{"file":os.environ["NODE_EXTRA_CA_CERTS"]}}}
Path('/workspace/squash-cloud-compose.yaml').write_text(json.dumps(config,indent=2))
PYCA
  docker compose -f compose.yaml -f /workspace/squash-cloud-compose.yaml up --build -d --wait
else
  docker compose up --build -d --wait
fi
