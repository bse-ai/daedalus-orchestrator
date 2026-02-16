---
summary: "CLI reference for `forge-orchestrator plugins` (list, install, uninstall, enable/disable, doctor)"
read_when:
  - You want to install or manage in-process Gateway plugins
  - You want to debug plugin load failures
title: "plugins"
---

# `forge-orchestrator plugins`

Manage Gateway plugins/extensions (loaded in-process).

Related:

- Plugin system: [Plugins](/tools/plugin)
- Plugin manifest + schema: [Plugin manifest](/plugins/manifest)
- Security hardening: [Security](/gateway/security)

## Commands

```bash
forge-orchestrator plugins list
forge-orchestrator plugins info <id>
forge-orchestrator plugins enable <id>
forge-orchestrator plugins disable <id>
forge-orchestrator plugins uninstall <id>
forge-orchestrator plugins doctor
forge-orchestrator plugins update <id>
forge-orchestrator plugins update --all
```

Bundled plugins ship with ForgeOrchestrator but start disabled. Use `plugins enable` to
activate them.

All plugins must ship a `forge-orchestrator.plugin.json` file with an inline JSON Schema
(`configSchema`, even if empty). Missing/invalid manifests or schemas prevent
the plugin from loading and fail config validation.

### Install

```bash
forge-orchestrator plugins install <path-or-spec>
```

Security note: treat plugin installs like running code. Prefer pinned versions.

Supported archives: `.zip`, `.tgz`, `.tar.gz`, `.tar`.

Use `--link` to avoid copying a local directory (adds to `plugins.load.paths`):

```bash
forge-orchestrator plugins install -l ./my-plugin
```

### Uninstall

```bash
forge-orchestrator plugins uninstall <id>
forge-orchestrator plugins uninstall <id> --dry-run
forge-orchestrator plugins uninstall <id> --keep-files
```

`uninstall` removes plugin records from `plugins.entries`, `plugins.installs`,
the plugin allowlist, and linked `plugins.load.paths` entries when applicable.
For active memory plugins, the memory slot resets to `memory-core`.

By default, uninstall also removes the plugin install directory under the active
state dir extensions root (`$FORGE_ORCH_STATE_DIR/extensions/<id>`). Use
`--keep-files` to keep files on disk.

`--keep-config` is supported as a deprecated alias for `--keep-files`.

### Update

```bash
forge-orchestrator plugins update <id>
forge-orchestrator plugins update --all
forge-orchestrator plugins update <id> --dry-run
```

Updates only apply to plugins installed from npm (tracked in `plugins.installs`).
