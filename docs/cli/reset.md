---
summary: "CLI reference for `forge-orchestrator reset` (reset local state/config)"
read_when:
  - You want to wipe local state while keeping the CLI installed
  - You want a dry-run of what would be removed
title: "reset"
---

# `forge-orchestrator reset`

Reset local config/state (keeps the CLI installed).

```bash
forge-orchestrator reset
forge-orchestrator reset --dry-run
forge-orchestrator reset --scope config+creds+sessions --yes --non-interactive
```
