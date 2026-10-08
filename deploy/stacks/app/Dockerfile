FROM node:24-bookworm-slim AS development
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
# Optional trusted CA for environments with an HTTPS proxy; TLS verification stays enabled.
RUN --mount=type=secret,id=trusted_ca \
    if [ -f /run/secrets/trusted_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/trusted_ca; fi; \
    npm ci --no-fund && sha256sum package.json package-lock.json | sha256sum > node_modules/.dependency-fingerprint
COPY . .
EXPOSE 3000
CMD ["sh", "deploy/scripts/docker-start.sh"]
