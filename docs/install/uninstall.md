---
summary: "Uninstall ForgeOrchestrator completely (CLI, service, state, workspace)"
read_when:
  - You want to remove ForgeOrchestrator from a machine
  - The gateway service is still running after uninstall
title: "Uninstall"
---

# Uninstall

Two paths:

- **Easy path** if `forge-orchestrator` is still installed.
- **Manual service removal** if the CLI is gone but the service is still running.

## Easy path (CLI still installed)

Recommended: use the built-in uninstaller:

```bash
forge-orchestrator uninstall
```

Non-interactive (automation / npx):

```bash
forge-orchestrator uninstall --all --yes --non-interactive
npx -y forge-orchestrator uninstall --all --yes --non-interactive
```

Manual steps (same result):

1. Stop the gateway service:

```bash
forge-orchestrator gateway stop
```

2. Uninstall the gateway service (launchd/systemd/schtasks):

```bash
forge-orchestrator gateway uninstall
```

3. Delete state + config:

```bash
rm -rf "${FORGE_ORCH_STATE_DIR:-$HOME/.forge-orchestrator}"
```

If you set `FORGE_ORCH_CONFIG_PATH` to a custom location outside the state dir, delete that file too.

4. Delete your workspace (optional, removes agent files):

```bash
rm -rf ~/.forge-orchestrator/workspace
```

5. Remove the CLI install (pick the one you used):

```bash
npm rm -g forge-orchestrator
pnpm remove -g forge-orchestrator
bun remove -g forge-orchestrator
```

6. If you installed the macOS app:

```bash
rm -rf /Applications/ForgeOrchestrator.app
```

Notes:

- If you used profiles (`--profile` / `FORGE_ORCH_PROFILE`), repeat step 3 for each state dir (defaults are `~/.forge-orchestrator-<profile>`).
- In remote mode, the state dir lives on the **gateway host**, so run steps 1-4 there too.

## Manual service removal (CLI not installed)

Use this if the gateway service keeps running but `forge-orchestrator` is missing.

### macOS (launchd)

Default label is `bot.molt.gateway` (or `bot.molt.<profile>`; legacy `com.forge-orchestrator.*` may still exist):

```bash
launchctl bootout gui/$UID/bot.molt.gateway
rm -f ~/Library/LaunchAgents/bot.molt.gateway.plist
```

If you used a profile, replace the label and plist name with `bot.molt.<profile>`. Remove any legacy `com.forge-orchestrator.*` plists if present.

### Linux (systemd user unit)

Default unit name is `forge-orchestrator-gateway.service` (or `forge-orchestrator-gateway-<profile>.service`):

```bash
systemctl --user disable --now forge-orchestrator-gateway.service
rm -f ~/.config/systemd/user/forge-orchestrator-gateway.service
systemctl --user daemon-reload
```

### Windows (Scheduled Task)

Default task name is `ForgeOrchestrator Gateway` (or `ForgeOrchestrator Gateway (<profile>)`).
The task script lives under your state dir.

```powershell
schtasks /Delete /F /TN "ForgeOrchestrator Gateway"
Remove-Item -Force "$env:USERPROFILE\.forge-orchestrator\gateway.cmd"
```

If you used a profile, delete the matching task name and `~\.forge-orchestrator-<profile>\gateway.cmd`.

## Normal install vs source checkout

### Normal install (install.sh / npm / pnpm / bun)

If you used `https://forge-orchestrator.ai/install.sh` or `install.ps1`, the CLI was installed with `npm install -g forge-orchestrator@latest`.
Remove it with `npm rm -g forge-orchestrator` (or `pnpm remove -g` / `bun remove -g` if you installed that way).

### Source checkout (git clone)

If you run from a repo checkout (`git clone` + `forge-orchestrator ...` / `bun run forge-orchestrator ...`):

1. Uninstall the gateway service **before** deleting the repo (use the easy path above or manual service removal).
2. Delete the repo directory.
3. Remove state + workspace as shown above.
