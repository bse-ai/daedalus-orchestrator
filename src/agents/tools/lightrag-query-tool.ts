import { Type } from "@sinclair/typebox";

import type { ForgeOrchestratorConfig } from "../../config/config.js";
import {
  createLightRAGClient,
  DEFAULT_LIGHTRAG_ENDPOINT,
  DEFAULT_LIGHTRAG_TIMEOUT_MS,
} from "../../memory/lightrag-client.js";
import { resolveAgentConfig, resolveSessionAgentId } from "../agent-scope.js";
import { resolveMemorySearchConfig } from "../memory-search.js";
import type { AnyAgentTool } from "./common.js";
import { jsonResult, readNumberParam, readStringParam } from "./common.js";

const LightRAGQuerySchema = Type.Object({
  query: Type.String(),
  mode: Type.Optional(Type.String()),
  topK: Type.Optional(Type.Number()),
  includeSources: Type.Optional(Type.Boolean()),
});

export function createLightRAGQueryTool(options: {
  config?: ForgeOrchestratorConfig;
  agentSessionKey?: string;
}): AnyAgentTool | null {
  const cfg = options.config;
  if (!cfg) {
    return null;
  }
  const agentId = resolveSessionAgentId({
    sessionKey: options.agentSessionKey,
    config: cfg,
  });
  const memorySearchConfig = resolveMemorySearchConfig(cfg, agentId);
  if (!memorySearchConfig) {
    return null;
  }

  const defaults = cfg.agents?.defaults?.memorySearch;
  const agentConfig = resolveAgentConfig(cfg, agentId);
  const overrides = agentConfig?.memorySearch;
  const lightragConfig = overrides?.lightrag ?? defaults?.lightrag;

  if (!lightragConfig?.enabled) {
    return null;
  }

  return {
    label: "LightRAG Query",
    name: "lightrag_query",
    description:
      "Query the long-term document knowledge base for answers with sources. Uses hybrid graph-based retrieval to find relevant information from indexed documents and return synthesized answers with citations.",
    parameters: LightRAGQuerySchema,
    execute: async (_toolCallId, params) => {
      const query = readStringParam(params, "query", { required: true });
      const topK = readNumberParam(params, "topK");

      const modeRaw = params.mode as unknown;
      const mode =
        typeof modeRaw === "string" && ["naive", "local", "global", "hybrid"].includes(modeRaw)
          ? (modeRaw as "naive" | "local" | "global" | "hybrid")
          : undefined;

      const includeSourcesRaw = params.includeSources as unknown;
      const includeSources = typeof includeSourcesRaw === "boolean" ? includeSourcesRaw : undefined;

      const client = createLightRAGClient({
        endpoint: lightragConfig.endpoint ?? DEFAULT_LIGHTRAG_ENDPOINT,
        timeout: lightragConfig.timeout ?? DEFAULT_LIGHTRAG_TIMEOUT_MS,
      });

      try {
        const healthy = await client.health();
        if (!healthy) {
          return jsonResult({
            answer: "",
            sources: [],
            disabled: true,
            error: "LightRAG service unavailable",
          });
        }

        const result = await client.query({
          query,
          mode,
          topK,
          includeSources,
        });

        return jsonResult({
          answer: result.answer,
          sources: result.sources ?? [],
          entities: result.entities ?? [],
          confidence: result.confidence,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResult({
          answer: "",
          sources: [],
          disabled: true,
          error: message,
        });
      }
    },
  };
}
