import type { ChannelPlugin, ForgeOrchestratorPluginApi } from "forge-orchestrator/plugin-sdk";
import { emptyPluginConfigSchema } from "forge-orchestrator/plugin-sdk";
import { telegramPlugin } from "./src/channel.js";
import { setTelegramRuntime } from "./src/runtime.js";

const plugin = {
  id: "telegram",
  name: "Telegram",
  description: "Telegram channel plugin",
  configSchema: emptyPluginConfigSchema(),
  register(api: ForgeOrchestratorPluginApi) {
    setTelegramRuntime(api.runtime);
    api.registerChannel({ plugin: telegramPlugin as ChannelPlugin });
  },
};

export default plugin;
