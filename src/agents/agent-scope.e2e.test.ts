import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ForgeOrchestratorConfig } from "../config/config.js";
import {
  resolveAgentConfig,
  resolveAgentDir,
  resolveAgentModelFallbacksOverride,
  resolveAgentModelPrimary,
  resolveAgentWorkspaceDir,
} from "./agent-scope.js";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("resolveAgentConfig", () => {
  it("should return undefined when no agents config exists", () => {
    const cfg: ForgeOrchestratorConfig = {};
    const result = resolveAgentConfig(cfg, "main");
    expect(result).toBeUndefined();
  });

  it("should return undefined when agent id does not exist", () => {
    const cfg: ForgeOrchestratorConfig = {
      agents: {
        list: [{ id: "main", workspace: "~/forge-orchestrator" }],
      },
    };
    const result = resolveAgentConfig(cfg, "nonexistent");
    expect(result).toBeUndefined();
  });

  it("should return basic agent config", () => {
    const cfg: ForgeOrchestratorConfig = {
      agents: {
        list: [
          {
            id: "main",
            name: "Main Agent",
            workspace: "~/forge-orchestrator",
            agentDir: "~/.forge-orchestrator/agents/main",
            model: "anthropic/claude-opus-4",
          },
        ],
      },
    };
    const result = resolveAgentConfig(cfg, "main");
    expect(result).toEqual({
      name: "Main Agent",
      workspace: "~/forge-orchestrator",
      agentDir: "~/.forge-orchestrator/agents/main",
      model: "anthropic/claude-opus-4",
      identity: undefined,
      groupChat: undefined,
      subagents: undefined,
      sandbox: undefined,
      tools: undefined,
    });
  });

  it("supports per-agent model primary+fallbacks", () => {
    const cfg: ForgeOrchestratorConfig = {
      agents: {
        defaults: {
          model: {
            primary: "anthropic/claude-sonnet-4",
            fallbacks: ["openai/gpt-4.1"],
          },
        },
        list: [
          {
            id: "linus",
            model: {
              primary: "anthropic/claude-opus-4",
              fallbacks: ["openai/gpt-5.2"],
            },
          },
        ],
      },
    };

    expect(resolveAgentModelPrimary(cfg, "linus")).toBe("anthropic/claude-opus-4");
    expect(resolveAgentModelFallbacksOverride(cfg, "linus")).toEqual(["openai/gpt-5.2"]);

    // If fallbacks isn't present, we don't override the global fallbacks.
    const cfgNoOverride: ForgeOrchestratorConfig = {
      agents: {
        list: [
          {
            id: "linus",
            model: {
              primary: "anthropic/claude-opus-4",
            },
          },
        ],
      },
    };
    expect(resolveAgentModelFallbacksOverride(cfgNoOverride, "linus")).toBe(undefined);

    // Explicit empty list disables global fallbacks for that agent.
    const cfgDisable: ForgeOrchestratorConfig = {
      agents: {
        list: [
          {
            id: "linus",
            model: {
              primary: "anthropic/claude-opus-4",
              fallbacks: [],
            },
          },
        ],
      },
    };
    expect(resolveAgentModelFallbacksOverride(cfgDisable, "linus")).toEqual([]);
  });

  it("should return agent-specific sandbox config", () => {
    const cfg: ForgeOrchestratorConfig = {
      agents: {
        list: [
          {
            id: "work",
            workspace: "~/forge-orchestrator-work",
            sandbox: {
              mode: "all",
              scope: "agent",
              perSession: false,
              workspaceAccess: "ro",
              workspaceRoot: "~/sandboxes",
            },
          },
        ],
      },
    };
    const result = resolveAgentConfig(cfg, "work");
    expect(result?.sandbox).toEqual({
      mode: "all",
      scope: "agent",
      perSession: false,
      workspaceAccess: "ro",
      workspaceRoot: "~/sandboxes",
    });
  });

  it("should return agent-specific tools config", () => {
    const cfg: ForgeOrchestratorConfig = {
      agents: {
        list: [
          {
            id: "restricted",
            workspace: "~/forge-orchestrator-restricted",
            tools: {
              allow: ["read"],
              deny: ["exec", "write", "edit"],
              elevated: {
                enabled: false,
                allowFrom: { whatsapp: ["+15555550123"] },
              },
            },
          },
        ],
      },
    };
    const result = resolveAgentConfig(cfg, "restricted");
    expect(result?.tools).toEqual({
      allow: ["read"],
      deny: ["exec", "write", "edit"],
      elevated: {
        enabled: false,
        allowFrom: { whatsapp: ["+15555550123"] },
      },
    });
  });

  it("should return both sandbox and tools config", () => {
    const cfg: ForgeOrchestratorConfig = {
      agents: {
        list: [
          {
            id: "family",
            workspace: "~/forge-orchestrator-family",
            sandbox: {
              mode: "all",
              scope: "agent",
            },
            tools: {
              allow: ["read"],
              deny: ["exec"],
            },
          },
        ],
      },
    };
    const result = resolveAgentConfig(cfg, "family");
    expect(result?.sandbox?.mode).toBe("all");
    expect(result?.tools?.allow).toEqual(["read"]);
  });

  it("should normalize agent id", () => {
    const cfg: ForgeOrchestratorConfig = {
      agents: {
        list: [{ id: "main", workspace: "~/forge-orchestrator" }],
      },
    };
    // Should normalize to "main" (default)
    const result = resolveAgentConfig(cfg, "");
    expect(result).toBeDefined();
    expect(result?.workspace).toBe("~/forge-orchestrator");
  });

  it("uses FORGE_ORCH_HOME for default agent workspace", () => {
    const home = path.join(path.sep, "srv", "forge-orchestrator-home");
    vi.stubEnv("FORGE_ORCH_HOME", home);

    const workspace = resolveAgentWorkspaceDir({} as ForgeOrchestratorConfig, "main");
    expect(workspace).toBe(path.join(path.resolve(home), ".forge-orchestrator", "workspace"));
  });

  it("uses FORGE_ORCH_HOME for default agentDir", () => {
    const home = path.join(path.sep, "srv", "forge-orchestrator-home");
    vi.stubEnv("FORGE_ORCH_HOME", home);
    // Clear state dir so it falls back to FORGE_ORCH_HOME
    vi.stubEnv("FORGE_ORCH_STATE_DIR", "");

    const agentDir = resolveAgentDir({} as ForgeOrchestratorConfig, "main");
    expect(agentDir).toBe(path.join(path.resolve(home), ".forge-orchestrator", "agents", "main", "agent"));
  });
});
