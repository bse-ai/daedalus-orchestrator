import type { RuntimeEnv, WizardPrompter } from "forge-orchestrator/plugin-sdk";
import { describe, expect, it, vi } from "vitest";
import type { CoreConfig } from "./types.js";
import { ircOnboardingAdapter } from "./onboarding.js";

describe("irc onboarding", () => {
  it("configures host and nick via onboarding prompts", async () => {
    const prompter: WizardPrompter = {
      intro: vi.fn(async () => {}),
      outro: vi.fn(async () => {}),
      note: vi.fn(async () => {}),
      select: vi.fn(async () => "allowlist"),
      multiselect: vi.fn(async () => []),
      text: vi.fn(async ({ message }: { message: string }) => {
        if (message === "IRC server host") {
          return "irc.libera.chat";
        }
        if (message === "IRC server port") {
          return "6697";
        }
        if (message === "IRC nick") {
          return "forge-orchestrator-bot";
        }
        if (message === "IRC username") {
          return "forge-orchestrator";
        }
        if (message === "IRC real name") {
          return "ForgeOrchestrator Bot";
        }
        if (message.startsWith("Auto-join IRC channels")) {
          return "#forge-orchestrator, #ops";
        }
        if (message.startsWith("IRC channels allowlist")) {
          return "#forge-orchestrator, #ops";
        }
        throw new Error(`Unexpected prompt: ${message}`);
      }) as WizardPrompter["text"],
      confirm: vi.fn(async ({ message }: { message: string }) => {
        if (message === "Use TLS for IRC?") {
          return true;
        }
        if (message === "Configure IRC channels access?") {
          return true;
        }
        return false;
      }),
      progress: vi.fn(() => ({ update: vi.fn(), stop: vi.fn() })),
    };

    const runtime: RuntimeEnv = {
      log: vi.fn(),
      error: vi.fn(),
      exit: vi.fn(),
    };

    const result = await ircOnboardingAdapter.configure({
      cfg: {} as CoreConfig,
      runtime,
      prompter,
      options: {},
      accountOverrides: {},
      shouldPromptAccountIds: false,
      forceAllowFrom: false,
    });

    expect(result.accountId).toBe("default");
    expect(result.cfg.channels?.irc?.enabled).toBe(true);
    expect(result.cfg.channels?.irc?.host).toBe("irc.libera.chat");
    expect(result.cfg.channels?.irc?.nick).toBe("forge-orchestrator-bot");
    expect(result.cfg.channels?.irc?.tls).toBe(true);
    expect(result.cfg.channels?.irc?.channels).toEqual(["#forge-orchestrator", "#ops"]);
    expect(result.cfg.channels?.irc?.groupPolicy).toBe("allowlist");
    expect(Object.keys(result.cfg.channels?.irc?.groups ?? {})).toEqual(["#forge-orchestrator", "#ops"]);
  });

  it("writes DM allowFrom to top-level config for non-default account prompts", async () => {
    const prompter: WizardPrompter = {
      intro: vi.fn(async () => {}),
      outro: vi.fn(async () => {}),
      note: vi.fn(async () => {}),
      select: vi.fn(async () => "allowlist"),
      multiselect: vi.fn(async () => []),
      text: vi.fn(async ({ message }: { message: string }) => {
        if (message === "IRC allowFrom (nick or nick!user@host)") {
          return "Alice, Bob!ident@example.org";
        }
        throw new Error(`Unexpected prompt: ${message}`);
      }) as WizardPrompter["text"],
      confirm: vi.fn(async () => false),
      progress: vi.fn(() => ({ update: vi.fn(), stop: vi.fn() })),
    };

    const promptAllowFrom = ircOnboardingAdapter.dmPolicy?.promptAllowFrom;
    expect(promptAllowFrom).toBeTypeOf("function");

    const cfg: CoreConfig = {
      channels: {
        irc: {
          accounts: {
            work: {
              host: "irc.libera.chat",
              nick: "forge-orchestrator-work",
            },
          },
        },
      },
    };

    const updated = (await promptAllowFrom?.({
      cfg,
      prompter,
      accountId: "work",
    })) as CoreConfig;

    expect(updated.channels?.irc?.allowFrom).toEqual(["alice", "bob!ident@example.org"]);
    expect(updated.channels?.irc?.accounts?.work?.allowFrom).toBeUndefined();
  });
});
