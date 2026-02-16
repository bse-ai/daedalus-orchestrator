---
summary: "CLI reference for `forge-orchestrator setup` (initialize config + workspace)"
read_when:
  - You’re doing first-run setup without the full onboarding wizard
  - You want to set the default workspace path
title: "setup"
---

# `forge-orchestrator setup`

Initialize `~/.forge-orchestrator/forge-orchestrator.json` and the agent workspace.

Related:

- Getting started: [Getting started](/start/getting-started)
- Wizard: [Onboarding](/start/onboarding)

## Examples

```bash
forge-orchestrator setup
forge-orchestrator setup --workspace ~/.forge-orchestrator/workspace
```

To run the wizard via setup:

```bash
forge-orchestrator setup --wizard
```
