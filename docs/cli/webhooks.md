---
summary: "CLI reference for `forge-orchestrator webhooks` (webhook helpers + Gmail Pub/Sub)"
read_when:
  - You want to wire Gmail Pub/Sub events into ForgeOrchestrator
  - You want webhook helper commands
title: "webhooks"
---

# `forge-orchestrator webhooks`

Webhook helpers and integrations (Gmail Pub/Sub, webhook helpers).

Related:

- Webhooks: [Webhook](/automation/webhook)
- Gmail Pub/Sub: [Gmail Pub/Sub](/automation/gmail-pubsub)

## Gmail

```bash
forge-orchestrator webhooks gmail setup --account you@example.com
forge-orchestrator webhooks gmail run
```

See [Gmail Pub/Sub documentation](/automation/gmail-pubsub) for details.
