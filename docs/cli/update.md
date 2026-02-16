---
summary: "CLI reference for `forge-orchestrator update` (safe-ish source update + gateway auto-restart)"
read_when:
  - You want to update a source checkout safely
  - You need to understand `--update` shorthand behavior
title: "update"
---

# `forge-orchestrator update`

Safely update ForgeOrchestrator and switch between stable/beta/dev channels.

If you installed via **npm/pnpm** (global install, no git metadata), updates happen via the package manager flow in [Updating](/install/updating).

## Usage

```bash
forge-orchestrator update
forge-orchestrator update status
forge-orchestrator update wizard
forge-orchestrator update --channel beta
forge-orchestrator update --channel dev
forge-orchestrator update --tag beta
forge-orchestrator update --no-restart
forge-orchestrator update --json
forge-orchestrator --update
```

## Options

- `--no-restart`: skip restarting the Gateway service after a successful update.
- `--channel <stable|beta|dev>`: set the update channel (git + npm; persisted in config).
- `--tag <dist-tag|version>`: override the npm dist-tag or version for this update only.
- `--json`: print machine-readable `UpdateRunResult` JSON.
- `--timeout <seconds>`: per-step timeout (default is 1200s).

Note: downgrades require confirmation because older versions can break configuration.

## `update status`

Show the active update channel + git tag/branch/SHA (for source checkouts), plus update availability.

```bash
forge-orchestrator update status
forge-orchestrator update status --json
forge-orchestrator update status --timeout 10
```

Options:

- `--json`: print machine-readable status JSON.
- `--timeout <seconds>`: timeout for checks (default is 3s).

## `update wizard`

Interactive flow to pick an update channel and confirm whether to restart the Gateway
after updating (default is to restart). If you select `dev` without a git checkout, it
offers to create one.

## What it does

When you switch channels explicitly (`--channel ...`), ForgeOrchestrator also keeps the
install method aligned:

- `dev` → ensures a git checkout (default: `~/forge-orchestrator`, override with `FORGE_ORCH_GIT_DIR`),
  updates it, and installs the global CLI from that checkout.
- `stable`/`beta` → installs from npm using the matching dist-tag.

## Git checkout flow

Channels:

- `stable`: checkout the latest non-beta tag, then build + doctor.
- `beta`: checkout the latest `-beta` tag, then build + doctor.
- `dev`: checkout `main`, then fetch + rebase.

High-level:

1. Requires a clean worktree (no uncommitted changes).
2. Switches to the selected channel (tag or branch).
3. Fetches upstream (dev only).
4. Dev only: preflight lint + TypeScript build in a temp worktree; if the tip fails, walks back up to 10 commits to find the newest clean build.
5. Rebases onto the selected commit (dev only).
6. Installs deps (pnpm preferred; npm fallback).
7. Builds + builds the Control UI.
8. Runs `forge-orchestrator doctor` as the final “safe update” check.
9. Syncs plugins to the active channel (dev uses bundled extensions; stable/beta uses npm) and updates npm-installed plugins.

## `--update` shorthand

`forge-orchestrator --update` rewrites to `forge-orchestrator update` (useful for shells and launcher scripts).

## See also

- `forge-orchestrator doctor` (offers to run update first on git checkouts)
- [Development channels](/install/development-channels)
- [Updating](/install/updating)
- [CLI reference](/cli)
