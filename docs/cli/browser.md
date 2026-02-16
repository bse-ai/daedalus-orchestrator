---
summary: "CLI reference for `forge-orchestrator browser` (profiles, tabs, actions, extension relay)"
read_when:
  - You use `forge-orchestrator browser` and want examples for common tasks
  - You want to control a browser running on another machine via a node host
  - You want to use the Chrome extension relay (attach/detach via toolbar button)
title: "browser"
---

# `forge-orchestrator browser`

Manage ForgeOrchestrator’s browser control server and run browser actions (tabs, snapshots, screenshots, navigation, clicks, typing).

Related:

- Browser tool + API: [Browser tool](/tools/browser)
- Chrome extension relay: [Chrome extension](/tools/chrome-extension)

## Common flags

- `--url <gatewayWsUrl>`: Gateway WebSocket URL (defaults to config).
- `--token <token>`: Gateway token (if required).
- `--timeout <ms>`: request timeout (ms).
- `--browser-profile <name>`: choose a browser profile (default from config).
- `--json`: machine-readable output (where supported).

## Quick start (local)

```bash
forge-orchestrator browser --browser-profile chrome tabs
forge-orchestrator browser --browser-profile forge-orchestrator start
forge-orchestrator browser --browser-profile forge-orchestrator open https://example.com
forge-orchestrator browser --browser-profile forge-orchestrator snapshot
```

## Profiles

Profiles are named browser routing configs. In practice:

- `forge-orchestrator`: launches/attaches to a dedicated ForgeOrchestrator-managed Chrome instance (isolated user data dir).
- `chrome`: controls your existing Chrome tab(s) via the Chrome extension relay.

```bash
forge-orchestrator browser profiles
forge-orchestrator browser create-profile --name work --color "#FF5A36"
forge-orchestrator browser delete-profile --name work
```

Use a specific profile:

```bash
forge-orchestrator browser --browser-profile work tabs
```

## Tabs

```bash
forge-orchestrator browser tabs
forge-orchestrator browser open https://docs.forge-orchestrator.ai
forge-orchestrator browser focus <targetId>
forge-orchestrator browser close <targetId>
```

## Snapshot / screenshot / actions

Snapshot:

```bash
forge-orchestrator browser snapshot
```

Screenshot:

```bash
forge-orchestrator browser screenshot
```

Navigate/click/type (ref-based UI automation):

```bash
forge-orchestrator browser navigate https://example.com
forge-orchestrator browser click <ref>
forge-orchestrator browser type <ref> "hello"
```

## Chrome extension relay (attach via toolbar button)

This mode lets the agent control an existing Chrome tab that you attach manually (it does not auto-attach).

Install the unpacked extension to a stable path:

```bash
forge-orchestrator browser extension install
forge-orchestrator browser extension path
```

Then Chrome → `chrome://extensions` → enable “Developer mode” → “Load unpacked” → select the printed folder.

Full guide: [Chrome extension](/tools/chrome-extension)

## Remote browser control (node host proxy)

If the Gateway runs on a different machine than the browser, run a **node host** on the machine that has Chrome/Brave/Edge/Chromium. The Gateway will proxy browser actions to that node (no separate browser control server required).

Use `gateway.nodes.browser.mode` to control auto-routing and `gateway.nodes.browser.node` to pin a specific node if multiple are connected.

Security + remote setup: [Browser tool](/tools/browser), [Remote access](/gateway/remote), [Tailscale](/gateway/tailscale), [Security](/gateway/security)
