import { Type } from "@sinclair/typebox";

import type { ForgeOrchestratorConfig } from "../../config/config.js";
import {
  createMemoryServiceClient,
  DEFAULT_MEMORY_SERVICE_ENDPOINT,
  DEFAULT_MEMORY_SERVICE_TIMEOUT_MS,
} from "../../memory/memory-service-client.js";
import { resolveAgentConfig, resolveSessionAgentId } from "../agent-scope.js";
import { resolveMemorySearchConfig } from "../memory-search.js";
import type { AnyAgentTool } from "./common.js";
import { jsonResult, readNumberParam, readStringParam } from "./common.js";

const MemoryServiceQuerySchema = Type.Object({
  query: Type.String(),
  limit: Type.Optional(Type.Number()),
});

export function createMemoryServiceQueryTool(options: {
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
  const memoryServiceConfig = overrides?.memoryService ?? defaults?.memoryService;

  if (!memoryServiceConfig?.enabled) {
    return null;
  }

  return {
    label: "Memory Service Query",
    name: "memory_service_query",
    description:
      "Query the universal memory layer for stored memories and entities. This service provides a unified interface for searching across all memory systems.",
    parameters: MemoryServiceQuerySchema,
    execute: async (_toolCallId, params) => {
      const query = readStringParam(params, "query", { required: true });
      const limit = readNumberParam(params, "limit");

      const client = createMemoryServiceClient({
        endpoint: memoryServiceConfig.endpoint ?? DEFAULT_MEMORY_SERVICE_ENDPOINT,
        timeout: memoryServiceConfig.timeout ?? DEFAULT_MEMORY_SERVICE_TIMEOUT_MS,
      });

      try {
        const healthy = await client.health();
        if (!healthy) {
          return jsonResult({
            memories: [],
            disabled: true,
            error: "Memory Service unavailable",
          });
        }

        const result = await client.search({
          query,
          limit,
        });

        return jsonResult({
          memories: result.memories,
          total: result.total,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResult({
          memories: [],
          disabled: true,
          error: message,
        });
      }
    },
  };
}
