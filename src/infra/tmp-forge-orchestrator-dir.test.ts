import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { POSIX_FORGE_ORCH_TMP_DIR, resolvePreferredForgeOrchestratorTmpDir } from "./tmp-forge-orchestrator-dir.js";

describe("resolvePreferredForgeOrchestratorTmpDir", () => {
  it("prefers /tmp/forge-orchestrator when it already exists and is writable", () => {
    const accessSync = vi.fn();
    const statSync = vi.fn(() => ({ isDirectory: () => true }));
    const tmpdir = vi.fn(() => "/var/fallback");

    const resolved = resolvePreferredForgeOrchestratorTmpDir({ accessSync, statSync, tmpdir });

    expect(statSync).toHaveBeenCalledTimes(1);
    expect(accessSync).toHaveBeenCalledTimes(1);
    expect(resolved).toBe(POSIX_FORGE_ORCH_TMP_DIR);
    expect(tmpdir).not.toHaveBeenCalled();
  });

  it("prefers /tmp/forge-orchestrator when it does not exist but /tmp is writable", () => {
    const accessSync = vi.fn();
    const statSync = vi.fn(() => {
      const err = new Error("missing") as Error & { code?: string };
      err.code = "ENOENT";
      throw err;
    });
    const tmpdir = vi.fn(() => "/var/fallback");

    const resolved = resolvePreferredForgeOrchestratorTmpDir({ accessSync, statSync, tmpdir });

    expect(resolved).toBe(POSIX_FORGE_ORCH_TMP_DIR);
    expect(accessSync).toHaveBeenCalledWith("/tmp", expect.any(Number));
    expect(tmpdir).not.toHaveBeenCalled();
  });

  it("falls back to os.tmpdir()/forge-orchestrator when /tmp/forge-orchestrator is not a directory", () => {
    const accessSync = vi.fn();
    const statSync = vi.fn(() => ({ isDirectory: () => false }));
    const tmpdir = vi.fn(() => "/var/fallback");

    const resolved = resolvePreferredForgeOrchestratorTmpDir({ accessSync, statSync, tmpdir });

    expect(resolved).toBe(path.join("/var/fallback", "forge-orchestrator"));
    expect(tmpdir).toHaveBeenCalledTimes(1);
  });

  it("falls back to os.tmpdir()/forge-orchestrator when /tmp is not writable", () => {
    const accessSync = vi.fn((target: string) => {
      if (target === "/tmp") {
        throw new Error("read-only");
      }
    });
    const statSync = vi.fn(() => {
      const err = new Error("missing") as Error & { code?: string };
      err.code = "ENOENT";
      throw err;
    });
    const tmpdir = vi.fn(() => "/var/fallback");

    const resolved = resolvePreferredForgeOrchestratorTmpDir({ accessSync, statSync, tmpdir });

    expect(resolved).toBe(path.join("/var/fallback", "forge-orchestrator"));
    expect(tmpdir).toHaveBeenCalledTimes(1);
  });
});
