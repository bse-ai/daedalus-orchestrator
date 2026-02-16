---
summary: "CLI reference for `forge-orchestrator logs` (tail gateway logs via RPC)"
read_when:
  - You need to tail Gateway logs remotely (without SSH)
  - You want JSON log lines for tooling
title: "logs"
---

# `forge-orchestrator logs`

Tail Gateway file logs over RPC (works in remote mode).

Related:

- Logging overview: [Logging](/logging)

## Examples

```bash
forge-orchestrator logs
forge-orchestrator logs --follow
forge-orchestrator logs --json
forge-orchestrator logs --limit 500
forge-orchestrator logs --local-time
forge-orchestrator logs --follow --local-time
```

Use `--local-time` to render timestamps in your local timezone.
