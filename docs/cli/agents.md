---
summary: "CLI reference for `forge-orchestrator agents` (list/add/delete/set identity)"
read_when:
  - You want multiple isolated agents (workspaces + routing + auth)
title: "agents"
---

# `forge-orchestrator agents`

Manage isolated agents (workspaces + auth + routing).

Related:

- Multi-agent routing: [Multi-Agent Routing](/concepts/multi-agent)
- Agent workspace: [Agent workspace](/concepts/agent-workspace)

## Examples

```bash
forge-orchestrator agents list
forge-orchestrator agents add work --workspace ~/.forge-orchestrator/workspace-work
forge-orchestrator agents set-identity --workspace ~/.forge-orchestrator/workspace --from-identity
forge-orchestrator agents set-identity --agent main --avatar avatars/forge-orchestrator.png
forge-orchestrator agents delete work
```

## Identity files

Each agent workspace can include an `IDENTITY.md` at the workspace root:

- Example path: `~/.forge-orchestrator/workspace/IDENTITY.md`
- `set-identity --from-identity` reads from the workspace root (or an explicit `--identity-file`)

Avatar paths resolve relative to the workspace root.

## Set identity

`set-identity` writes fields into `agents.list[].identity`:

- `name`
- `theme`
- `emoji`
- `avatar` (workspace-relative path, http(s) URL, or data URI)

Load from `IDENTITY.md`:

```bash
forge-orchestrator agents set-identity --workspace ~/.forge-orchestrator/workspace --from-identity
```

Override fields explicitly:

```bash
forge-orchestrator agents set-identity --agent main --name "ForgeOrchestrator" --emoji "🦞" --avatar avatars/forge-orchestrator.png
```

Config sample:

```json5
{
  agents: {
    list: [
      {
        id: "main",
        identity: {
          name: "ForgeOrchestrator",
          theme: "space lobster",
          emoji: "🦞",
          avatar: "avatars/forge-orchestrator.png",
        },
      },
    ],
  },
}
```
