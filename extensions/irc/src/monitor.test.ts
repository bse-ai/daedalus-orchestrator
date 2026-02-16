import { describe, expect, it } from "vitest";
import { resolveIrcInboundTarget } from "./monitor.js";

describe("irc monitor inbound target", () => {
  it("keeps channel target for group messages", () => {
    expect(
      resolveIrcInboundTarget({
        target: "#forge-orchestrator",
        senderNick: "alice",
      }),
    ).toEqual({
      isGroup: true,
      target: "#forge-orchestrator",
      rawTarget: "#forge-orchestrator",
    });
  });

  it("maps DM target to sender nick and preserves raw target", () => {
    expect(
      resolveIrcInboundTarget({
        target: "forge-orchestrator-bot",
        senderNick: "alice",
      }),
    ).toEqual({
      isGroup: false,
      target: "alice",
      rawTarget: "forge-orchestrator-bot",
    });
  });

  it("falls back to raw target when sender nick is empty", () => {
    expect(
      resolveIrcInboundTarget({
        target: "forge-orchestrator-bot",
        senderNick: " ",
      }),
    ).toEqual({
      isGroup: false,
      target: "forge-orchestrator-bot",
      rawTarget: "forge-orchestrator-bot",
    });
  });
});
