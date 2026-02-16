import { describe, expect, it } from "vitest";
import {
  buildParseArgv,
  getFlagValue,
  getCommandPath,
  getPrimaryCommand,
  getPositiveIntFlagValue,
  getVerboseFlag,
  hasHelpOrVersion,
  hasFlag,
  shouldMigrateState,
  shouldMigrateStateFromPath,
} from "./argv.js";

describe("argv helpers", () => {
  it("detects help/version flags", () => {
    expect(hasHelpOrVersion(["node", "forge-orchestrator", "--help"])).toBe(true);
    expect(hasHelpOrVersion(["node", "forge-orchestrator", "-V"])).toBe(true);
    expect(hasHelpOrVersion(["node", "forge-orchestrator", "status"])).toBe(false);
  });

  it("extracts command path ignoring flags and terminator", () => {
    expect(getCommandPath(["node", "forge-orchestrator", "status", "--json"], 2)).toEqual(["status"]);
    expect(getCommandPath(["node", "forge-orchestrator", "agents", "list"], 2)).toEqual(["agents", "list"]);
    expect(getCommandPath(["node", "forge-orchestrator", "status", "--", "ignored"], 2)).toEqual(["status"]);
  });

  it("returns primary command", () => {
    expect(getPrimaryCommand(["node", "forge-orchestrator", "agents", "list"])).toBe("agents");
    expect(getPrimaryCommand(["node", "forge-orchestrator"])).toBeNull();
  });

  it("parses boolean flags and ignores terminator", () => {
    expect(hasFlag(["node", "forge-orchestrator", "status", "--json"], "--json")).toBe(true);
    expect(hasFlag(["node", "forge-orchestrator", "--", "--json"], "--json")).toBe(false);
  });

  it("extracts flag values with equals and missing values", () => {
    expect(getFlagValue(["node", "forge-orchestrator", "status", "--timeout", "5000"], "--timeout")).toBe(
      "5000",
    );
    expect(getFlagValue(["node", "forge-orchestrator", "status", "--timeout=2500"], "--timeout")).toBe(
      "2500",
    );
    expect(getFlagValue(["node", "forge-orchestrator", "status", "--timeout"], "--timeout")).toBeNull();
    expect(getFlagValue(["node", "forge-orchestrator", "status", "--timeout", "--json"], "--timeout")).toBe(
      null,
    );
    expect(getFlagValue(["node", "forge-orchestrator", "--", "--timeout=99"], "--timeout")).toBeUndefined();
  });

  it("parses verbose flags", () => {
    expect(getVerboseFlag(["node", "forge-orchestrator", "status", "--verbose"])).toBe(true);
    expect(getVerboseFlag(["node", "forge-orchestrator", "status", "--debug"])).toBe(false);
    expect(getVerboseFlag(["node", "forge-orchestrator", "status", "--debug"], { includeDebug: true })).toBe(
      true,
    );
  });

  it("parses positive integer flag values", () => {
    expect(getPositiveIntFlagValue(["node", "forge-orchestrator", "status"], "--timeout")).toBeUndefined();
    expect(
      getPositiveIntFlagValue(["node", "forge-orchestrator", "status", "--timeout"], "--timeout"),
    ).toBeNull();
    expect(
      getPositiveIntFlagValue(["node", "forge-orchestrator", "status", "--timeout", "5000"], "--timeout"),
    ).toBe(5000);
    expect(
      getPositiveIntFlagValue(["node", "forge-orchestrator", "status", "--timeout", "nope"], "--timeout"),
    ).toBeUndefined();
  });

  it("builds parse argv from raw args", () => {
    const nodeArgv = buildParseArgv({
      programName: "forge-orchestrator",
      rawArgs: ["node", "forge-orchestrator", "status"],
    });
    expect(nodeArgv).toEqual(["node", "forge-orchestrator", "status"]);

    const versionedNodeArgv = buildParseArgv({
      programName: "forge-orchestrator",
      rawArgs: ["node-22", "forge-orchestrator", "status"],
    });
    expect(versionedNodeArgv).toEqual(["node-22", "forge-orchestrator", "status"]);

    const versionedNodeWindowsArgv = buildParseArgv({
      programName: "forge-orchestrator",
      rawArgs: ["node-22.2.0.exe", "forge-orchestrator", "status"],
    });
    expect(versionedNodeWindowsArgv).toEqual(["node-22.2.0.exe", "forge-orchestrator", "status"]);

    const versionedNodePatchlessArgv = buildParseArgv({
      programName: "forge-orchestrator",
      rawArgs: ["node-22.2", "forge-orchestrator", "status"],
    });
    expect(versionedNodePatchlessArgv).toEqual(["node-22.2", "forge-orchestrator", "status"]);

    const versionedNodeWindowsPatchlessArgv = buildParseArgv({
      programName: "forge-orchestrator",
      rawArgs: ["node-22.2.exe", "forge-orchestrator", "status"],
    });
    expect(versionedNodeWindowsPatchlessArgv).toEqual(["node-22.2.exe", "forge-orchestrator", "status"]);

    const versionedNodeWithPathArgv = buildParseArgv({
      programName: "forge-orchestrator",
      rawArgs: ["/usr/bin/node-22.2.0", "forge-orchestrator", "status"],
    });
    expect(versionedNodeWithPathArgv).toEqual(["/usr/bin/node-22.2.0", "forge-orchestrator", "status"]);

    const nodejsArgv = buildParseArgv({
      programName: "forge-orchestrator",
      rawArgs: ["nodejs", "forge-orchestrator", "status"],
    });
    expect(nodejsArgv).toEqual(["nodejs", "forge-orchestrator", "status"]);

    const nonVersionedNodeArgv = buildParseArgv({
      programName: "forge-orchestrator",
      rawArgs: ["node-dev", "forge-orchestrator", "status"],
    });
    expect(nonVersionedNodeArgv).toEqual(["node", "forge-orchestrator", "node-dev", "forge-orchestrator", "status"]);

    const directArgv = buildParseArgv({
      programName: "forge-orchestrator",
      rawArgs: ["forge-orchestrator", "status"],
    });
    expect(directArgv).toEqual(["node", "forge-orchestrator", "status"]);

    const bunArgv = buildParseArgv({
      programName: "forge-orchestrator",
      rawArgs: ["bun", "src/entry.ts", "status"],
    });
    expect(bunArgv).toEqual(["bun", "src/entry.ts", "status"]);
  });

  it("builds parse argv from fallback args", () => {
    const fallbackArgv = buildParseArgv({
      programName: "forge-orchestrator",
      fallbackArgv: ["status"],
    });
    expect(fallbackArgv).toEqual(["node", "forge-orchestrator", "status"]);
  });

  it("decides when to migrate state", () => {
    expect(shouldMigrateState(["node", "forge-orchestrator", "status"])).toBe(false);
    expect(shouldMigrateState(["node", "forge-orchestrator", "health"])).toBe(false);
    expect(shouldMigrateState(["node", "forge-orchestrator", "sessions"])).toBe(false);
    expect(shouldMigrateState(["node", "forge-orchestrator", "memory", "status"])).toBe(false);
    expect(shouldMigrateState(["node", "forge-orchestrator", "agent", "--message", "hi"])).toBe(false);
    expect(shouldMigrateState(["node", "forge-orchestrator", "agents", "list"])).toBe(true);
    expect(shouldMigrateState(["node", "forge-orchestrator", "message", "send"])).toBe(true);
  });

  it("reuses command path for migrate state decisions", () => {
    expect(shouldMigrateStateFromPath(["status"])).toBe(false);
    expect(shouldMigrateStateFromPath(["agents", "list"])).toBe(true);
  });
});
