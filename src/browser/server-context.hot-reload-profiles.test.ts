import { beforeEach, describe, expect, it, vi } from "vitest";

let cfgProfiles: Record<string, { cdpPort?: number; cdpUrl?: string; color?: string }> = {};

// Simulate module-level cache behavior
let cachedConfig: ReturnType<typeof buildConfig> | null = null;

function buildConfig() {
  return {
    browser: {
      enabled: true,
      color: "#FF4500",
      headless: true,
      defaultProfile: "forge-orchestrator",
      profiles: { ...cfgProfiles },
    },
  };
}

vi.mock("../config/config.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../config/config.js")>();
  return {
    ...actual,
    createConfigIO: () => ({
      loadConfig: () => {
        // Always return fresh config for createConfigIO to simulate fresh disk read
        return buildConfig();
      },
    }),
    loadConfig: () => {
      // simulate stale loadConfig that doesn't see updates unless cache cleared
      if (!cachedConfig) {
        cachedConfig = buildConfig();
      }
      return cachedConfig;
    },
    clearConfigCache: vi.fn(() => {
      // Clear the simulated cache
      cachedConfig = null;
    }),
    writeConfigFile: vi.fn(async () => {}),
  };
});

vi.mock("./chrome.js", () => ({
  isChromeCdpReady: vi.fn(async () => false),
  isChromeReachable: vi.fn(async () => false),
  launchForgeOrchestratorChrome: vi.fn(async () => {
    throw new Error("launch disabled");
  }),
  resolveForgeOrchestratorUserDataDir: vi.fn(() => "/tmp/forge-orchestrator"),
  stopForgeOrchestratorChrome: vi.fn(async () => {}),
}));

vi.mock("./cdp.js", () => ({
  createTargetViaCdp: vi.fn(async () => {
    throw new Error("cdp disabled");
  }),
  normalizeCdpWsUrl: vi.fn((wsUrl: string) => wsUrl),
  snapshotAria: vi.fn(async () => ({ nodes: [] })),
  getHeadersWithAuth: vi.fn(() => ({})),
  appendCdpPath: vi.fn((cdpUrl: string, path: string) => `${cdpUrl}${path}`),
}));

vi.mock("./pw-ai.js", () => ({
  closePlaywrightBrowserConnection: vi.fn(async () => {}),
}));

vi.mock("../media/store.js", () => ({
  ensureMediaDir: vi.fn(async () => {}),
  saveMediaBuffer: vi.fn(async () => ({ path: "/tmp/fake.png" })),
}));

describe("server-context hot-reload profiles", () => {
  beforeEach(() => {
    vi.resetModules();
    cfgProfiles = {
      "forge-orchestrator": { cdpPort: 18800, color: "#FF4500" },
    };
    cachedConfig = null; // Clear simulated cache
  });

  it("forProfile hot-reloads newly added profiles from config", async () => {
    // Start with only forge-orchestrator profile
    const { createBrowserRouteContext } = await import("./server-context.js");
    const { resolveBrowserConfig } = await import("./config.js");
    const { loadConfig } = await import("../config/config.js");

    // 1. Prime the cache by calling loadConfig() first
    const cfg = loadConfig();
    const resolved = resolveBrowserConfig(cfg.browser, cfg);

    // Verify cache is primed (without desktop)
    expect(cfg.browser.profiles.desktop).toBeUndefined();
    const state = {
      server: null,
      port: 18791,
      resolved,
      profiles: new Map(),
    };

    const ctx = createBrowserRouteContext({
      getState: () => state,
      refreshConfigFromDisk: true,
    });

    // Initially, "desktop" profile should not exist
    expect(() => ctx.forProfile("desktop")).toThrow(/not found/);

    // 2. Simulate adding a new profile to config (like user editing forge-orchestrator.json)
    cfgProfiles.desktop = { cdpUrl: "http://127.0.0.1:9222", color: "#0066CC" };

    // 3. Verify without clearConfigCache, loadConfig() still returns stale cached value
    const staleCfg = loadConfig();
    expect(staleCfg.browser.profiles.desktop).toBeUndefined(); // Cache is stale!

    // 4. Now forProfile should hot-reload (calls createConfigIO().loadConfig() internally)
    // It should NOT clear the global cache
    const profileCtx = ctx.forProfile("desktop");
    expect(profileCtx.profile.name).toBe("desktop");
    expect(profileCtx.profile.cdpUrl).toBe("http://127.0.0.1:9222");

    // 5. Verify the new profile was merged into the cached state
    expect(state.resolved.profiles.desktop).toBeDefined();

    // 6. Verify GLOBAL cache was NOT cleared - subsequent simple loadConfig() still sees STALE value
    // This confirms the fix: we read fresh config for the specific profile lookup without flushing the global cache
    const stillStaleCfg = loadConfig();
    expect(stillStaleCfg.browser.profiles.desktop).toBeUndefined();

    // Verify clearConfigCache was not called
    const { clearConfigCache } = await import("../config/config.js");
    expect(clearConfigCache).not.toHaveBeenCalled();
  });

  it("forProfile still throws for profiles that don't exist in fresh config", async () => {
    const { createBrowserRouteContext } = await import("./server-context.js");
    const { resolveBrowserConfig } = await import("./config.js");
    const { loadConfig } = await import("../config/config.js");

    const cfg = loadConfig();
    const resolved = resolveBrowserConfig(cfg.browser, cfg);
    const state = {
      server: null,
      port: 18791,
      resolved,
      profiles: new Map(),
    };

    const ctx = createBrowserRouteContext({
      getState: () => state,
      refreshConfigFromDisk: true,
    });

    // Profile that doesn't exist anywhere should still throw
    expect(() => ctx.forProfile("nonexistent")).toThrow(/not found/);
  });

  it("forProfile refreshes existing profile config after loadConfig cache updates", async () => {
    const { createBrowserRouteContext } = await import("./server-context.js");
    const { resolveBrowserConfig } = await import("./config.js");
    const { loadConfig } = await import("../config/config.js");

    const cfg = loadConfig();
    const resolved = resolveBrowserConfig(cfg.browser, cfg);
    const state = {
      server: null,
      port: 18791,
      resolved,
      profiles: new Map(),
    };

    const ctx = createBrowserRouteContext({
      getState: () => state,
      refreshConfigFromDisk: true,
    });

    const before = ctx.forProfile("forge-orchestrator");
    expect(before.profile.cdpPort).toBe(18800);

    cfgProfiles["forge-orchestrator"] = { cdpPort: 19999, color: "#FF4500" };
    cachedConfig = null;

    const after = ctx.forProfile("forge-orchestrator");
    expect(after.profile.cdpPort).toBe(19999);
    expect(state.resolved.profiles["forge-orchestrator"]?.cdpPort).toBe(19999);
  });

  it("listProfiles refreshes config before enumerating profiles", async () => {
    const { createBrowserRouteContext } = await import("./server-context.js");
    const { resolveBrowserConfig } = await import("./config.js");
    const { loadConfig } = await import("../config/config.js");

    const cfg = loadConfig();
    const resolved = resolveBrowserConfig(cfg.browser, cfg);
    const state = {
      server: null,
      port: 18791,
      resolved,
      profiles: new Map(),
    };

    const ctx = createBrowserRouteContext({
      getState: () => state,
      refreshConfigFromDisk: true,
    });

    cfgProfiles.desktop = { cdpPort: 19999, color: "#0066CC" };
    cachedConfig = null;

    const profiles = await ctx.listProfiles();
    expect(profiles.some((p) => p.name === "desktop")).toBe(true);
  });
});
