/**
 * RAG context injection hook handler
 *
 * Automatically queries all configured RAG sources (Graphiti, LightRAG, Memory Service)
 * and injects relevant context as a synthetic bootstrap file on session start.
 */

import type { ForgeOrchestratorConfig } from "../../../config/config.js";
import type {
  GraphitiConfig,
  LightRAGConfig,
  MemoryServiceConfig,
} from "../../../config/types.rag.js";
import { resolveHookConfig } from "../../config.js";
import type { HookHandler } from "../../hooks.js";
import type { AgentBootstrapHookContext } from "../../internal-hooks.js";
import {
  GraphitiClient,
  type GraphitiEntity,
  type GraphitiRelationship,
} from "../../../memory/graphiti-client.js";
import { LightRAGClient, type LightRAGQueryResponse } from "../../../memory/lightrag-client.js";
import {
  MemoryServiceClient,
  type MemoryServiceMemory,
} from "../../../memory/memory-service-client.js";
import { combineRAGContext, type RAGContextResult } from "./format.js";

/**
 * Query Graphiti for recent entities and relationships
 */
async function queryGraphiti(
  config: GraphitiConfig | undefined,
  sessionKey: string,
  maxEntities: number,
  maxRelations: number,
): Promise<{ entities: GraphitiEntity[]; relationships: GraphitiRelationship[] } | null> {
  if (!config?.enabled) {
    return null;
  }

  try {
    const client = new GraphitiClient({
      endpoint: config.endpoint,
      timeout: config.timeout,
    });

    // Health check
    const healthy = await client.health();
    if (!healthy) {
      console.log("[rag-context-inject] Graphiti service not available");
      return null;
    }

    // Search for recent context related to this session
    const searchResult = await client.search({
      query: `session context for ${sessionKey}`,
      limit: maxEntities,
    });

    return {
      entities: searchResult.entities.slice(0, maxEntities),
      relationships: searchResult.relationships?.slice(0, maxRelations) || [],
    };
  } catch (err) {
    console.error(
      "[rag-context-inject] Graphiti query failed:",
      err instanceof Error ? err.message : String(err),
    );
    return null;
  }
}

/**
 * Query LightRAG for relevant document context
 */
async function queryLightRAG(
  config: LightRAGConfig | undefined,
  sessionKey: string,
  maxDocuments: number,
): Promise<LightRAGQueryResponse | null> {
  if (!config?.enabled) {
    return null;
  }

  try {
    const client = new LightRAGClient({
      endpoint: config.endpoint,
      timeout: config.timeout,
    });

    // Health check
    const healthy = await client.health();
    if (!healthy) {
      console.log("[rag-context-inject] LightRAG service not available");
      return null;
    }

    // Query for relevant context
    const result = await client.query({
      query: `What is the relevant context for session ${sessionKey}?`,
      mode: config.defaultMode || "hybrid",
      topK: maxDocuments,
      includeSources: true,
    });

    return result;
  } catch (err) {
    console.error(
      "[rag-context-inject] LightRAG query failed:",
      err instanceof Error ? err.message : String(err),
    );
    return null;
  }
}

/**
 * Query Memory Service for related memories
 */
async function queryMemoryService(
  config: MemoryServiceConfig | undefined,
  sessionKey: string,
  maxMemories: number,
): Promise<{ memories: MemoryServiceMemory[] } | null> {
  if (!config?.enabled) {
    return null;
  }

  try {
    const client = new MemoryServiceClient({
      endpoint: config.endpoint,
      timeout: config.timeout,
    });

    // Health check
    const healthy = await client.health();
    if (!healthy) {
      console.log("[rag-context-inject] Memory Service not available");
      return null;
    }

    // Search for related memories
    const result = await client.search({
      query: `session ${sessionKey}`,
      limit: maxMemories,
    });

    return {
      memories: result.memories,
    };
  } catch (err) {
    console.error(
      "[rag-context-inject] Memory Service query failed:",
      err instanceof Error ? err.message : String(err),
    );
    return null;
  }
}

/**
 * Inject RAG context into bootstrap files
 */
const injectRAGContext: HookHandler = async (event) => {
  // Only trigger on agent:bootstrap event
  if (event.type !== "agent" || event.action !== "bootstrap") {
    return;
  }

  const context = event.context as AgentBootstrapHookContext;
  const cfg = context.cfg;

  // Get hook configuration
  const hookConfig = resolveHookConfig(cfg, "rag-context-inject");
  if (hookConfig?.enabled === false) {
    return;
  }

  // Get RAG service configs from memorySearch
  const memorySearch = cfg?.agents?.defaults?.memorySearch;
  const graphitiConfig = memorySearch?.graphiti;
  const lightragConfig = memorySearch?.lightrag;
  const memoryServiceConfig = memorySearch?.memoryService;

  // Check if any RAG service is enabled
  const anyEnabled =
    graphitiConfig?.enabled || lightragConfig?.enabled || memoryServiceConfig?.enabled;

  if (!anyEnabled) {
    return;
  }

  try {
    console.log("[rag-context-inject] Querying RAG sources for session:", event.sessionKey);

    // Get max limits from hook config (with defaults)
    const maxEntities = (hookConfig?.maxEntities as number | undefined) ?? 20;
    const maxRelations = (hookConfig?.maxRelations as number | undefined) ?? 30;
    const maxMemories = (hookConfig?.maxMemories as number | undefined) ?? 10;
    const maxDocuments = (hookConfig?.maxDocuments as number | undefined) ?? 5;

    // Query all RAG sources in parallel
    const [graphitiResult, lightragResult, memoryServiceResult] = await Promise.all([
      queryGraphiti(graphitiConfig, event.sessionKey, maxEntities, maxRelations),
      queryLightRAG(lightragConfig, event.sessionKey, maxDocuments),
      queryMemoryService(memoryServiceConfig, event.sessionKey, maxMemories),
    ]);

    // Aggregate results
    const ragContext: RAGContextResult = {};
    if (graphitiResult) {
      ragContext.graphiti = graphitiResult;
    }
    if (lightragResult) {
      ragContext.lightrag = lightragResult;
    }
    if (memoryServiceResult) {
      ragContext.memoryService = memoryServiceResult;
    }

    // Format context as markdown
    const contextMarkdown = combineRAGContext(ragContext, event.timestamp);

    // Inject as synthetic bootstrap file
    // We'll use "RAG_CONTEXT.md" as the name, but since WorkspaceBootstrapFileName is
    // restricted, we'll cast it. The bootstrap system should handle it gracefully.
    context.bootstrapFiles.push({
      name: "RAG_CONTEXT.md" as any,
      path: "<synthetic>",
      content: contextMarkdown,
      missing: false,
    });

    console.log("[rag-context-inject] RAG context injected successfully");
  } catch (err) {
    console.error(
      "[rag-context-inject] Failed to inject RAG context:",
      err instanceof Error ? err.message : String(err),
    );
  }
};

export default injectRAGContext;
