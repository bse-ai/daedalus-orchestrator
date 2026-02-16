---
summary: "CLI reference for `forge-orchestrator tui` (terminal UI connected to the Gateway)"
read_when:
  - You want a terminal UI for the Gateway (remote-friendly)
  - You want to pass url/token/session from scripts
title: "tui"
---

# `forge-orchestrator tui`

Open the terminal UI connected to the Gateway.

Related:

- TUI guide: [TUI](/web/tui)

## Examples

```bash
forge-orchestrator tui
forge-orchestrator tui --url ws://127.0.0.1:18789 --token <token>
forge-orchestrator tui --session main --deliver
```
