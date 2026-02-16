import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  resolveDefaultConfigCandidates,
  resolveConfigPathCandidate,
  resolveConfigPath,
  resolveOAuthDir,
  resolveOAuthPath,
  resolveStateDir,
} from "./paths.js";

describe("oauth paths", () => {
  it("prefers FORGE_ORCH_OAUTH_DIR over FORGE_ORCH_STATE_DIR", () => {
    const env = {
      FORGE_ORCH_OAUTH_DIR: "/custom/oauth",
      FORGE_ORCH_STATE_DIR: "/custom/state",
    } as NodeJS.ProcessEnv;

    expect(resolveOAuthDir(env, "/custom/state")).toBe(path.resolve("/custom/oauth"));
    expect(resolveOAuthPath(env, "/custom/state")).toBe(
      path.join(path.resolve("/custom/oauth"), "oauth.json"),
    );
  });

  it("derives oauth path from FORGE_ORCH_STATE_DIR when unset", () => {
    const env = {
      FORGE_ORCH_STATE_DIR: "/custom/state",
    } as NodeJS.ProcessEnv;

    expect(resolveOAuthDir(env, "/custom/state")).toBe(path.join("/custom/state", "credentials"));
    expect(resolveOAuthPath(env, "/custom/state")).toBe(
      path.join("/custom/state", "credentials", "oauth.json"),
    );
  });
});

describe("state + config path candidates", () => {
  it("uses FORGE_ORCH_STATE_DIR when set", () => {
    const env = {
      FORGE_ORCH_STATE_DIR: "/new/state",
    } as NodeJS.ProcessEnv;

    expect(resolveStateDir(env, () => "/home/test")).toBe(path.resolve("/new/state"));
  });

  it("uses FORGE_ORCH_HOME for default state/config locations", () => {
    const env = {
      FORGE_ORCH_HOME: "/srv/forge-orchestrator-home",
    } as NodeJS.ProcessEnv;

    const resolvedHome = path.resolve("/srv/forge-orchestrator-home");
    expect(resolveStateDir(env)).toBe(path.join(resolvedHome, ".forge-orchestrator"));

    const candidates = resolveDefaultConfigCandidates(env);
    expect(candidates[0]).toBe(path.join(resolvedHome, ".forge-orchestrator", "forge-orchestrator.json"));
  });

  it("prefers FORGE_ORCH_HOME over HOME for default state/config locations", () => {
    const env = {
      FORGE_ORCH_HOME: "/srv/forge-orchestrator-home",
      HOME: "/home/other",
    } as NodeJS.ProcessEnv;

    const resolvedHome = path.resolve("/srv/forge-orchestrator-home");
    expect(resolveStateDir(env)).toBe(path.join(resolvedHome, ".forge-orchestrator"));

    const candidates = resolveDefaultConfigCandidates(env);
    expect(candidates[0]).toBe(path.join(resolvedHome, ".forge-orchestrator", "forge-orchestrator.json"));
  });

  it("orders default config candidates in a stable order", () => {
    const home = "/home/test";
    const resolvedHome = path.resolve(home);
    const candidates = resolveDefaultConfigCandidates({} as NodeJS.ProcessEnv, () => home);
    const expected = [
      path.join(resolvedHome, ".forge-orchestrator", "forge-orchestrator.json"),
      path.join(resolvedHome, ".forge-orchestrator", "openclaw.json"),
      path.join(resolvedHome, ".openclaw", "forge-orchestrator.json"),
      path.join(resolvedHome, ".openclaw", "openclaw.json"),
    ];
    expect(candidates).toEqual(expected);
  });

  it("prefers ~/.forge-orchestrator when it exists and legacy dir is missing", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "forge-orchestrator-state-"));
    try {
      const newDir = path.join(root, ".forge-orchestrator");
      await fs.mkdir(newDir, { recursive: true });
      const resolved = resolveStateDir({} as NodeJS.ProcessEnv, () => root);
      expect(resolved).toBe(newDir);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("CONFIG_PATH prefers existing config when present", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "forge-orchestrator-config-"));
    try {
      const legacyDir = path.join(root, ".forge-orchestrator");
      await fs.mkdir(legacyDir, { recursive: true });
      const legacyPath = path.join(legacyDir, "forge-orchestrator.json");
      await fs.writeFile(legacyPath, "{}", "utf-8");

      const resolved = resolveConfigPathCandidate({} as NodeJS.ProcessEnv, () => root);
      expect(resolved).toBe(legacyPath);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("respects state dir overrides when config is missing", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "forge-orchestrator-config-override-"));
    try {
      const legacyDir = path.join(root, ".forge-orchestrator");
      await fs.mkdir(legacyDir, { recursive: true });
      const legacyConfig = path.join(legacyDir, "forge-orchestrator.json");
      await fs.writeFile(legacyConfig, "{}", "utf-8");

      const overrideDir = path.join(root, "override");
      const env = { FORGE_ORCH_STATE_DIR: overrideDir } as NodeJS.ProcessEnv;
      const resolved = resolveConfigPath(env, overrideDir, () => root);
      expect(resolved).toBe(path.join(overrideDir, "forge-orchestrator.json"));
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});
