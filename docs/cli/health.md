---
summary: "CLI reference for `forge-orchestrator health` (gateway health endpoint via RPC)"
read_when:
  - You want to quickly check the running Gateway’s health
title: "health"
---

# `forge-orchestrator health`

Fetch health from the running Gateway.

```bash
forge-orchestrator health
forge-orchestrator health --json
forge-orchestrator health --verbose
```

Notes:

- `--verbose` runs live probes and prints per-account timings when multiple accounts are configured.
- Output includes per-agent session stores when multiple agents are configured.
