---
summary: "CLI reference for `forge-orchestrator approvals` (exec approvals for gateway or node hosts)"
read_when:
  - You want to edit exec approvals from the CLI
  - You need to manage allowlists on gateway or node hosts
title: "approvals"
---

# `forge-orchestrator approvals`

Manage exec approvals for the **local host**, **gateway host**, or a **node host**.
By default, commands target the local approvals file on disk. Use `--gateway` to target the gateway, or `--node` to target a specific node.

Related:

- Exec approvals: [Exec approvals](/tools/exec-approvals)
- Nodes: [Nodes](/nodes)

## Common commands

```bash
forge-orchestrator approvals get
forge-orchestrator approvals get --node <id|name|ip>
forge-orchestrator approvals get --gateway
```

## Replace approvals from a file

```bash
forge-orchestrator approvals set --file ./exec-approvals.json
forge-orchestrator approvals set --node <id|name|ip> --file ./exec-approvals.json
forge-orchestrator approvals set --gateway --file ./exec-approvals.json
```

## Allowlist helpers

```bash
forge-orchestrator approvals allowlist add "~/Projects/**/bin/rg"
forge-orchestrator approvals allowlist add --agent main --node <id|name|ip> "/usr/bin/uptime"
forge-orchestrator approvals allowlist add --agent "*" "/usr/bin/uname"

forge-orchestrator approvals allowlist remove "~/Projects/**/bin/rg"
```

## Notes

- `--node` uses the same resolver as `forge-orchestrator nodes` (id, name, ip, or id prefix).
- `--agent` defaults to `"*"`, which applies to all agents.
- The node host must advertise `system.execApprovals.get/set` (macOS app or headless node host).
- Approvals files are stored per host at `~/.forge-orchestrator/exec-approvals.json`.
