---
summary: "CLI reference for `forge-orchestrator agent` (send one agent turn via the Gateway)"
read_when:
  - You want to run one agent turn from scripts (optionally deliver reply)
title: "agent"
---

# `forge-orchestrator agent`

Run an agent turn via the Gateway (use `--local` for embedded).
Use `--agent <id>` to target a configured agent directly.

Related:

- Agent send tool: [Agent send](/tools/agent-send)

## Examples

```bash
forge-orchestrator agent --to +15555550123 --message "status update" --deliver
forge-orchestrator agent --agent ops --message "Summarize logs"
forge-orchestrator agent --session-id 1234 --message "Summarize inbox" --thinking medium
forge-orchestrator agent --agent ops --message "Generate report" --deliver --reply-channel slack --reply-to "#reports"
```
