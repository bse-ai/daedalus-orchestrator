---
summary: "CLI reference for `forge-orchestrator skills` (list/info/check) and skill eligibility"
read_when:
  - You want to see which skills are available and ready to run
  - You want to debug missing binaries/env/config for skills
title: "skills"
---

# `forge-orchestrator skills`

Inspect skills (bundled + workspace + managed overrides) and see what’s eligible vs missing requirements.

Related:

- Skills system: [Skills](/tools/skills)
- Skills config: [Skills config](/tools/skills-config)
- ClawHub installs: [ClawHub](/tools/clawhub)

## Commands

```bash
forge-orchestrator skills list
forge-orchestrator skills list --eligible
forge-orchestrator skills info <name>
forge-orchestrator skills check
```
