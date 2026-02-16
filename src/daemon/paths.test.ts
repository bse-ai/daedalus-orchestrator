import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolveGatewayStateDir } from "./paths.js";

describe("resolveGatewayStateDir", () => {
  it("uses the default state dir when no overrides are set", () => {
    const env = { HOME: "/Users/test" };
    expect(resolveGatewayStateDir(env)).toBe(path.join("/Users/test", ".forge-orchestrator"));
  });

  it("appends the profile suffix when set", () => {
    const env = { HOME: "/Users/test", FORGE_ORCH_PROFILE: "rescue" };
    expect(resolveGatewayStateDir(env)).toBe(path.join("/Users/test", ".forge-orchestrator-rescue"));
  });

  it("treats default profiles as the base state dir", () => {
    const env = { HOME: "/Users/test", FORGE_ORCH_PROFILE: "Default" };
    expect(resolveGatewayStateDir(env)).toBe(path.join("/Users/test", ".forge-orchestrator"));
  });

  it("uses FORGE_ORCH_STATE_DIR when provided", () => {
    const env = { HOME: "/Users/test", FORGE_ORCH_STATE_DIR: "/var/lib/forge-orchestrator" };
    expect(resolveGatewayStateDir(env)).toBe(path.resolve("/var/lib/forge-orchestrator"));
  });

  it("expands ~ in FORGE_ORCH_STATE_DIR", () => {
    const env = { HOME: "/Users/test", FORGE_ORCH_STATE_DIR: "~/forge-orchestrator-state" };
    expect(resolveGatewayStateDir(env)).toBe(path.resolve("/Users/test/forge-orchestrator-state"));
  });

  it("preserves Windows absolute paths without HOME", () => {
    const env = { FORGE_ORCH_STATE_DIR: "C:\\State\\forge-orchestrator" };
    expect(resolveGatewayStateDir(env)).toBe("C:\\State\\forge-orchestrator");
  });
});
