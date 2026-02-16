import { Type } from "@sinclair/typebox";

import type { ForgeOrchestratorConfig } from "../../config/config.js";
import {
  createGraphitiClient,
  DEFAULT_GRAPHITI_ENDPOINT,
  DEFAULT_GRAPHITI_TIMEOUT_MS,
} from "../../memory/graphiti-client.js";
import { resolveAgentConfig, resolveSessionAgentId } from "../agent-scope.js";
import { resolveMemorySearchConfig } from "../memory-search.js";
import type { AnyAgentTool } from "./common.js";
import { jsonResult, readNumberParam, readStringParam } from "./common.js";

const GraphitiSearchSchema = Type.Object({
  query: Type.String(),
  entityTypes: Type.Optional(Type.Array(Type.String())),
  timeRange: Type.Optional(
    Type.Object({
      start: Type.Optional(Type.String()),
      end: Type.Optional(Type.String()),
    }),
  ),
  limit: Type.Optional(Type.Number()),
});

export function createGraphitiSearchTool(options: {
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
  const graphitiConfig = overrides?.graphiti ?? defaults?.graphiti;

  if (!graphitiConfig?.enabled) {
    return null;
  }

  return {
    label: "Graphiti Search",
    name: "graphiti_search",
    description:
      "Search the temporal knowledge graph for entities, relationships, and context from past sessions. Use this to recall specific people, projects, files, or events mentioned previously.",
    parameters: GraphitiSearchSchema,
    execute: async (_toolCallId, params) => {
      const query = readStringParam(params, "query", { required: true });
      const limit = readNumberParam(params, "limit");

      const entityTypesRaw = params.entityTypes as unknown;
      const entityTypes: string[] | undefined = Array.isArray(entityTypesRaw)
        ? entityTypesRaw.filter((x): x is string => typeof x === "string")
        : undefined;

      const timeRangeRaw = params.timeRange as unknown;
      const timeRange =
        timeRangeRaw &&
        typeof timeRangeRaw === "object" &&
        timeRangeRaw !== null &&
        (typeof (timeRangeRaw as { start?: unknown }).start === "string" ||
          typeof (timeRangeRaw as { end?: unknown }).end === "string")
          ? {
              start:
                typeof (timeRangeRaw as { start?: unknown }).start === "string"
                  ? (timeRangeRaw as { start: string }).start
                  : undefined,
              end:
                typeof (timeRangeRaw as { end?: unknown }).end === "string"
                  ? (timeRangeRaw as { end: string }).end
                  : undefined,
            }
          : undefined;

      const client = createGraphitiClient({
        endpoint: graphitiConfig.endpoint ?? DEFAULT_GRAPHITI_ENDPOINT,
        timeout: graphitiConfig.timeout ?? DEFAULT_GRAPHITI_TIMEOUT_MS,
      });

      try {
        const healthy = await client.health();
        if (!healthy) {
          return jsonResult({
            entities: [],
            relationships: [],
            disabled: true,
            error: "Graphiti service unavailable",
          });
        }

        const result = await client.search({
          query,
          entityTypes,
          timeRange,
          limit,
        });

        return jsonResult({
          entities: result.entities,
          relationships: result.relationships,
          total: result.total,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResult({
          entities: [],
          relationships: [],
          disabled: true,
          error: message,
        });
      }
    },
  };
}
