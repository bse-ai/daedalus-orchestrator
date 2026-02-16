FROM node:22-bookworm

# Install Bun (required for build scripts)
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

RUN corepack enable

# Install gogcli (Google Gmail/Calendar/Drive CLI)
RUN curl -fsSL https://github.com/steipete/gogcli/releases/download/v0.10.0/gogcli_0.10.0_linux_amd64.tar.gz \
    | tar -xz -C /usr/local/bin gog && chmod +x /usr/local/bin/gog

WORKDIR /app

ARG FORGE_ORCH_DOCKER_APT_PACKAGES=""
RUN if [ -n "$FORGE_ORCH_DOCKER_APT_PACKAGES" ]; then \
      apt-get update && \
      DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends $FORGE_ORCH_DOCKER_APT_PACKAGES && \
      apt-get clean && \
      rm -rf /var/lib/apt/lists/* /var/cache/apt/archives/*; \
    fi

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY ui/package.json ./ui/package.json
COPY patches ./patches
COPY scripts ./scripts

RUN pnpm install

COPY . .
RUN pnpm build
# Force pnpm for UI build (Bun may fail on ARM/Synology architectures)
ENV FORGE_ORCH_PREFER_PNPM=1
RUN pnpm ui:build

ENV NODE_ENV=production

# Allow non-root user to write temp files during runtime/tests.
RUN chown -R node:node /app

# Security hardening: Run as non-root user
# The node:22-bookworm image includes a 'node' user (uid 1000)
# This reduces the attack surface by preventing container escape via root privileges
USER node

# Start gateway server with default config.
# Binds to loopback (127.0.0.1) by default for security.
#
# For container platforms requiring external health checks:
#   1. Set FORGE_ORCH_GATEWAY_TOKEN or FORGE_ORCH_GATEWAY_PASSWORD env var
#   2. Override CMD: ["node","forge-orchestrator.mjs","gateway","--allow-unconfigured","--bind","lan"]
CMD ["node", "forge-orchestrator.mjs", "gateway", "--allow-unconfigured"]
