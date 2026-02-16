---
summary: "CLI reference for `forge-orchestrator voicecall` (voice-call plugin command surface)"
read_when:
  - You use the voice-call plugin and want the CLI entry points
  - You want quick examples for `voicecall call|continue|status|tail|expose`
title: "voicecall"
---

# `forge-orchestrator voicecall`

`voicecall` is a plugin-provided command. It only appears if the voice-call plugin is installed and enabled.

Primary doc:

- Voice-call plugin: [Voice Call](/plugins/voice-call)

## Common commands

```bash
forge-orchestrator voicecall status --call-id <id>
forge-orchestrator voicecall call --to "+15555550123" --message "Hello" --mode notify
forge-orchestrator voicecall continue --call-id <id> --message "Any questions?"
forge-orchestrator voicecall end --call-id <id>
```

## Exposing webhooks (Tailscale)

```bash
forge-orchestrator voicecall expose --mode serve
forge-orchestrator voicecall expose --mode funnel
forge-orchestrator voicecall unexpose
```

Security note: only expose the webhook endpoint to networks you trust. Prefer Tailscale Serve over Funnel when possible.
