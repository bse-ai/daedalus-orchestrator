#!/usr/bin/env bash
set -euo pipefail

cd /repo

export FORGE_ORCH_STATE_DIR="/tmp/forge-orchestrator-test"
export FORGE_ORCH_CONFIG_PATH="${FORGE_ORCH_STATE_DIR}/forge-orchestrator.json"

echo "==> Build"
pnpm build

echo "==> Seed state"
mkdir -p "${FORGE_ORCH_STATE_DIR}/credentials"
mkdir -p "${FORGE_ORCH_STATE_DIR}/agents/main/sessions"
echo '{}' >"${FORGE_ORCH_CONFIG_PATH}"
echo 'creds' >"${FORGE_ORCH_STATE_DIR}/credentials/marker.txt"
echo 'session' >"${FORGE_ORCH_STATE_DIR}/agents/main/sessions/sessions.json"

echo "==> Reset (config+creds+sessions)"
pnpm forge-orchestrator reset --scope config+creds+sessions --yes --non-interactive

test ! -f "${FORGE_ORCH_CONFIG_PATH}"
test ! -d "${FORGE_ORCH_STATE_DIR}/credentials"
test ! -d "${FORGE_ORCH_STATE_DIR}/agents/main/sessions"

echo "==> Recreate minimal config"
mkdir -p "${FORGE_ORCH_STATE_DIR}/credentials"
echo '{}' >"${FORGE_ORCH_CONFIG_PATH}"

echo "==> Uninstall (state only)"
pnpm forge-orchestrator uninstall --state --yes --non-interactive

test ! -d "${FORGE_ORCH_STATE_DIR}"

echo "OK"
