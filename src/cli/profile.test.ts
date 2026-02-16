import path from "node:path";
import { describe, expect, it } from "vitest";
import { formatCliCommand } from "./command-format.js";
import { applyCliProfileEnv, parseCliProfileArgs } from "./profile.js";

describe("parseCliProfileArgs", () => {
  it("leaves gateway --dev for subcommands", () => {
    const res = parseCliProfileArgs([
      "node",
      "forge-orchestrator",
      "gateway",
      "--dev",
      "--allow-unconfigured",
    ]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBeNull();
    expect(res.argv).toEqual(["node", "forge-orchestrator", "gateway", "--dev", "--allow-unconfigured"]);
  });

  it("still accepts global --dev before subcommand", () => {
    const res = parseCliProfileArgs(["node", "forge-orchestrator", "--dev", "gateway"]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBe("dev");
    expect(res.argv).toEqual(["node", "forge-orchestrator", "gateway"]);
  });

  it("parses --profile value and strips it", () => {
    const res = parseCliProfileArgs(["node", "forge-orchestrator", "--profile", "work", "status"]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBe("work");
    expect(res.argv).toEqual(["node", "forge-orchestrator", "status"]);
  });

  it("rejects missing profile value", () => {
    const res = parseCliProfileArgs(["node", "forge-orchestrator", "--profile"]);
    expect(res.ok).toBe(false);
  });

  it("rejects combining --dev with --profile (dev first)", () => {
    const res = parseCliProfileArgs(["node", "forge-orchestrator", "--dev", "--profile", "work", "status"]);
    expect(res.ok).toBe(false);
  });

  it("rejects combining --dev with --profile (profile first)", () => {
    const res = parseCliProfileArgs(["node", "forge-orchestrator", "--profile", "work", "--dev", "status"]);
    expect(res.ok).toBe(false);
  });
});

describe("applyCliProfileEnv", () => {
  it("fills env defaults for dev profile", () => {
    const env: Record<string, string | undefined> = {};
    applyCliProfileEnv({
      profile: "dev",
      env,
      homedir: () => "/home/peter",
    });
    const expectedStateDir = path.join(path.resolve("/home/peter"), ".forge-orchestrator-dev");
    expect(env.FORGE_ORCH_PROFILE).toBe("dev");
    expect(env.FORGE_ORCH_STATE_DIR).toBe(expectedStateDir);
    expect(env.FORGE_ORCH_CONFIG_PATH).toBe(path.join(expectedStateDir, "forge-orchestrator.json"));
    expect(env.FORGE_ORCH_GATEWAY_PORT).toBe("19001");
  });

  it("does not override explicit env values", () => {
    const env: Record<string, string | undefined> = {
      FORGE_ORCH_STATE_DIR: "/custom",
      FORGE_ORCH_GATEWAY_PORT: "19099",
    };
    applyCliProfileEnv({
      profile: "dev",
      env,
      homedir: () => "/home/peter",
    });
    expect(env.FORGE_ORCH_STATE_DIR).toBe("/custom");
    expect(env.FORGE_ORCH_GATEWAY_PORT).toBe("19099");
    expect(env.FORGE_ORCH_CONFIG_PATH).toBe(path.join("/custom", "forge-orchestrator.json"));
  });

  it("uses FORGE_ORCH_HOME when deriving profile state dir", () => {
    const env: Record<string, string | undefined> = {
      FORGE_ORCH_HOME: "/srv/forge-orchestrator-home",
      HOME: "/home/other",
    };
    applyCliProfileEnv({
      profile: "work",
      env,
      homedir: () => "/home/fallback",
    });

    const resolvedHome = path.resolve("/srv/forge-orchestrator-home");
    expect(env.FORGE_ORCH_STATE_DIR).toBe(path.join(resolvedHome, ".forge-orchestrator-work"));
    expect(env.FORGE_ORCH_CONFIG_PATH).toBe(
      path.join(resolvedHome, ".forge-orchestrator-work", "forge-orchestrator.json"),
    );
  });
});

describe("formatCliCommand", () => {
  it("returns command unchanged when no profile is set", () => {
    expect(formatCliCommand("forge-orchestrator doctor --fix", {})).toBe("forge-orchestrator doctor --fix");
  });

  it("returns command unchanged when profile is default", () => {
    expect(formatCliCommand("forge-orchestrator doctor --fix", { FORGE_ORCH_PROFILE: "default" })).toBe(
      "forge-orchestrator doctor --fix",
    );
  });

  it("returns command unchanged when profile is Default (case-insensitive)", () => {
    expect(formatCliCommand("forge-orchestrator doctor --fix", { FORGE_ORCH_PROFILE: "Default" })).toBe(
      "forge-orchestrator doctor --fix",
    );
  });

  it("returns command unchanged when profile is invalid", () => {
    expect(formatCliCommand("forge-orchestrator doctor --fix", { FORGE_ORCH_PROFILE: "bad profile" })).toBe(
      "forge-orchestrator doctor --fix",
    );
  });

  it("returns command unchanged when --profile is already present", () => {
    expect(
      formatCliCommand("forge-orchestrator --profile work doctor --fix", { FORGE_ORCH_PROFILE: "work" }),
    ).toBe("forge-orchestrator --profile work doctor --fix");
  });

  it("returns command unchanged when --dev is already present", () => {
    expect(formatCliCommand("forge-orchestrator --dev doctor", { FORGE_ORCH_PROFILE: "dev" })).toBe(
      "forge-orchestrator --dev doctor",
    );
  });

  it("inserts --profile flag when profile is set", () => {
    expect(formatCliCommand("forge-orchestrator doctor --fix", { FORGE_ORCH_PROFILE: "work" })).toBe(
      "forge-orchestrator --profile work doctor --fix",
    );
  });

  it("trims whitespace from profile", () => {
    expect(formatCliCommand("forge-orchestrator doctor --fix", { FORGE_ORCH_PROFILE: "  jbforge-orchestrator  " })).toBe(
      "forge-orchestrator --profile jbforge-orchestrator doctor --fix",
    );
  });

  it("handles command with no args after forge-orchestrator", () => {
    expect(formatCliCommand("forge-orchestrator", { FORGE_ORCH_PROFILE: "test" })).toBe(
      "forge-orchestrator --profile test",
    );
  });

  it("handles pnpm wrapper", () => {
    expect(formatCliCommand("pnpm forge-orchestrator doctor", { FORGE_ORCH_PROFILE: "work" })).toBe(
      "pnpm forge-orchestrator --profile work doctor",
    );
  });
});
