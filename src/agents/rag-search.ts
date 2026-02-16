/**
 * RAG search configuration resolution utilities.
 * Provides helpers to resolve Graphiti, LightRAG, and Memory Service
 * configurations from ForgeOrchestratorConfig.
 */

import type { ForgeOrchestratorConfig } from "../config/config.js";
import type { GraphitiConfig, LightRAGConfig, MemoryServiceConfig } from "../config/types.rag.js";
import {
  DEFAULT_GRAPHITI_ENDPOINT,
  DEFAULT_GRAPHITI_TIMEOUT_MS,
} from "../memory/graphiti-client.js";
import {
  DEFAULT_LIGHTRAG_ENDPOINT,
  DEFAULT_LIGHTRAG_MODE,
  DEFAULT_LIGHTRAG_TIMEOUT_MS,
} from "../memory/lightrag-client.js";
import {
  DEFAULT_MEMORY_SERVICE_ENDPOINT,
  DEFAULT_MEMORY_SERVICE_TIMEOUT_MS,
} from "../memory/memory-service-client.js";
import { resolveAgentConfig } from "./agent-scope.js";

/**
 * Resolved Graphiti configuration with all defaults applied.
 */
export type ResolvedGraphitiConfig = {
  enabled: boolean;
  endpoint: string;
  timeout: number;
};

/**
 * Resolved LightRAG configuration with all defaults applied.
 */
export type ResolvedLightRAGConfig = {
  enabled: boolean;
  endpoint: string;
  timeout: number;
  defaultMode: "naive" | "local" | "global" | "hybrid";
};

/**
 * Resolved Memory Service configuration with all defaults applied.
 */
export type ResolvedMemoryServiceConfig = {
  enabled: boolean;
  endpoint: string;
  timeout: number;
};

/**
 * Combined resolved RAG service configurations.
 */
export type ResolvedRAGSearchConfig = {
  graphiti: ResolvedGraphitiConfig | null;
  lightrag: ResolvedLightRAGConfig | null;
  memoryService: ResolvedMemoryServiceConfig | null;
};

/**
 * Merge default and override config for Graphiti.
 */
function mergeGraphitiConfig(
  defaults: GraphitiConfig | undefined,
  overrides: GraphitiConfig | undefined,
): ResolvedGraphitiConfig {
  const enabled = overrides?.enabled ?? defaults?.enabled ?? true;
  const endpoint = overrides?.endpoint ?? defaults?.endpoint ?? DEFAULT_GRAPHITI_ENDPOINT;
  const timeout = overrides?.timeout ?? defaults?.timeout ?? DEFAULT_GRAPHITI_TIMEOUT_MS;

  return {
    enabled,
    endpoint,
    timeout: Math.max(1000, timeout),
  };
}

/**
 * Merge default and override config for LightRAG.
 */
function mergeLightRAGConfig(
  defaults: LightRAGConfig | undefined,
  overrides: LightRAGConfig | undefined,
): ResolvedLightRAGConfig {
  const enabled = overrides?.enabled ?? defaults?.enabled ?? true;
  const endpoint = overrides?.endpoint ?? defaults?.endpoint ?? DEFAULT_LIGHTRAG_ENDPOINT;
  const timeout = overrides?.timeout ?? defaults?.timeout ?? DEFAULT_LIGHTRAG_TIMEOUT_MS;
  const defaultMode = overrides?.defaultMode ?? defaults?.defaultMode ?? DEFAULT_LIGHTRAG_MODE;

  return {
    enabled,
    endpoint,
    timeout: Math.max(1000, timeout),
    defaultMode,
  };
}

/**
 * Merge default and override config for Memory Service.
 */
function mergeMemoryServiceConfig(
  defaults: MemoryServiceConfig | undefined,
  overrides: MemoryServiceConfig | undefined,
): ResolvedMemoryServiceConfig {
  const enabled = overrides?.enabled ?? defaults?.enabled ?? true;
  const endpoint = overrides?.endpoint ?? defaults?.endpoint ?? DEFAULT_MEMORY_SERVICE_ENDPOINT;
  const timeout = overrides?.timeout ?? defaults?.timeout ?? DEFAULT_MEMORY_SERVICE_TIMEOUT_MS;

  return {
    enabled,
    endpoint,
    timeout: Math.max(1000, timeout),
  };
}

/**
 * Resolve RAG search configuration for a specific agent.
 * Returns null for each service that is disabled.
 */
export function resolveRAGSearchConfig(
  cfg: ForgeOrchestratorConfig,
  agentId: string,
): ResolvedRAGSearchConfig {
  const defaults = cfg.agents?.defaults?.memorySearch;
  const overrides = resolveAgentConfig(cfg, agentId)?.memorySearch;

  const graphitiResolved = mergeGraphitiConfig(defaults?.graphiti, overrides?.graphiti);
  const lightragResolved = mergeLightRAGConfig(defaults?.lightrag, overrides?.lightrag);
  const memoryServiceResolved = mergeMemoryServiceConfig(
    defaults?.memoryService,
    overrides?.memoryService,
  );

  return {
    graphiti: graphitiResolved.enabled ? graphitiResolved : null,
    lightrag: lightragResolved.enabled ? lightragResolved : null,
    memoryService: memoryServiceResolved.enabled ? memoryServiceResolved : null,
  };
}

/**
 * Check if Graphiti is enabled for the given agent.
 */
export function isGraphitiEnabled(cfg: ForgeOrchestratorConfig, agentId: string): boolean {
  const resolved = resolveRAGSearchConfig(cfg, agentId);
  return resolved.graphiti !== null;
}

/**
 * Check if LightRAG is enabled for the given agent.
 */
export function isLightRAGEnabled(cfg: ForgeOrchestratorConfig, agentId: string): boolean {
  const resolved = resolveRAGSearchConfig(cfg, agentId);
  return resolved.lightrag !== null;
}

/**
 * Check if Memory Service is enabled for the given agent.
 */
export function isMemoryServiceEnabled(cfg: ForgeOrchestratorConfig, agentId: string): boolean {
  const resolved = resolveRAGSearchConfig(cfg, agentId);
  return resolved.memoryService !== null;
}

/**
 * Get the Graphiti endpoint URL for the given agent.
 * Returns null if Graphiti is disabled.
 */
export function getGraphitiEndpoint(cfg: ForgeOrchestratorConfig, agentId: string): string | null {
  const resolved = resolveRAGSearchConfig(cfg, agentId);
  return resolved.graphiti?.endpoint ?? null;
}

/**
 * Get the LightRAG endpoint URL for the given agent.
 * Returns null if LightRAG is disabled.
 */
export function getLightRAGEndpoint(cfg: ForgeOrchestratorConfig, agentId: string): string | null {
  const resolved = resolveRAGSearchConfig(cfg, agentId);
  return resolved.lightrag?.endpoint ?? null;
}

/**
 * Get the Memory Service endpoint URL for the given agent.
 * Returns null if Memory Service is disabled.
 */
export function getMemoryServiceEndpoint(cfg: ForgeOrchestratorConfig, agentId: string): string | null {
  const resolved = resolveRAGSearchConfig(cfg, agentId);
  return resolved.memoryService?.endpoint ?? null;
}
