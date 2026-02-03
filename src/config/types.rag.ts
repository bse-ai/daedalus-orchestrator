/**
 * RAG (Retrieval-Augmented Generation) service configuration types.
 * Supports Graphiti, LightRAG, and Memory Service integrations.
 */

/**
 * Graphiti temporal knowledge graph service configuration
 */
export type GraphitiConfig = {
  /** Enable Graphiti integration (default: true when endpoint is configured). */
  enabled?: boolean;
  /** Graphiti API endpoint (default: http://localhost:8000). */
  endpoint?: string;
  /** Request timeout in milliseconds (default: 30000). */
  timeout?: number;
};

/**
 * LightRAG long-term document knowledge base configuration
 */
export type LightRAGConfig = {
  /** Enable LightRAG integration (default: true when endpoint is configured). */
  enabled?: boolean;
  /** LightRAG API endpoint (default: http://localhost:8001). */
  endpoint?: string;
  /** Request timeout in milliseconds (default: 30000). */
  timeout?: number;
  /** Default query mode (naive | local | global | hybrid). */
  defaultMode?: "naive" | "local" | "global" | "hybrid";
};

/**
 * Memory Service universal memory layer configuration
 */
export type MemoryServiceConfig = {
  /** Enable Memory Service integration (default: true when endpoint is configured). */
  enabled?: boolean;
  /** Memory Service API endpoint (default: http://localhost:8002). */
  endpoint?: string;
  /** Request timeout in milliseconds (default: 30000). */
  timeout?: number;
};

/**
 * Combined RAG service configuration (nested under memorySearch in agent defaults)
 */
export type RAGServiceConfig = {
  /** Graphiti temporal knowledge graph. */
  graphiti?: GraphitiConfig;
  /** LightRAG long-term document graph. */
  lightrag?: LightRAGConfig;
  /** Memory Service universal memory layer. */
  memoryService?: MemoryServiceConfig;
};

/**
 * rag-context-inject hook configuration
 */
export type RAGContextInjectHookConfig = {
  /** Enable automatic RAG context injection on session start (default: true). */
  enabled?: boolean;
  /** Maximum entities to include in injected context (default: 20). */
  maxEntities?: number;
  /** Maximum relationships to include in injected context (default: 30). */
  maxRelations?: number;
  /** Maximum memories to include from Memory Service (default: 10). */
  maxMemories?: number;
  /** Maximum document excerpts from LightRAG (default: 5). */
  maxDocuments?: number;
};
