import { describe, expect, it } from "vitest";
import type { BrowserServerState } from "./server-context.js";
import { resolveBrowserConfig, resolveProfile } from "./config.js";
import { listKnownProfileNames } from "./server-context.js";

describe("browser server-context listKnownProfileNames", () => {
  it("includes configured and runtime-only profile names", () => {
    const resolved = resolveBrowserConfig({
      defaultProfile: "forge-orchestrator",
      profiles: {
        "forge-orchestrator": { cdpPort: 18800, color: "#FF4500" },
      },
    });
    const forgeOrch = resolveProfile(resolved, "forge-orchestrator");
    if (!forgeOrch) {
      throw new Error("expected forge-orchestrator profile");
    }

    const state: BrowserServerState = {
      server: null as unknown as BrowserServerState["server"],
      port: 18791,
      resolved,
      profiles: new Map([
        [
          "stale-removed",
          {
            profile: { ...forgeOrch, name: "stale-removed" },
            running: null,
          },
        ],
      ]),
    };

    expect(listKnownProfileNames(state).toSorted()).toEqual([
      "chrome",
      "forge-orchestrator",
      "stale-removed",
    ]);
  });
});
