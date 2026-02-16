#!/data/data/com.termux/files/usr/bin/bash
# ForgeOrchestrator OAuth Sync Widget
# Syncs Claude Code tokens to ForgeOrchestrator on l36 server
# Place in ~/.shortcuts/ on phone for Termux:Widget

termux-toast "Syncing ForgeOrchestrator auth..."

# Run sync on l36 server
SERVER="${FORGE_ORCH_SERVER:-${FORGE_ORCH_SERVER:-l36}}"
RESULT=$(ssh "$SERVER" '/home/admin/forge-orchestrator/scripts/sync-claude-code-auth.sh' 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    # Extract expiry time from output
    EXPIRY=$(echo "$RESULT" | grep "Token expires:" | cut -d: -f2-)

    termux-vibrate -d 100
    termux-toast "ForgeOrchestrator synced! Expires:${EXPIRY}"

    # Optional: restart forge-orchestrator service
    ssh "$SERVER" 'systemctl --user restart forge-orchestrator' 2>/dev/null
else
    termux-vibrate -d 300
    termux-toast "Sync failed: ${RESULT}"
fi
