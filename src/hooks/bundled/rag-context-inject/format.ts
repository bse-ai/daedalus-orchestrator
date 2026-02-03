/**
 * Format RAG results into markdown context
 *
 * Utilities to convert RAG query results from Graphiti, LightRAG, and Memory Service
 * into human-readable markdown for injection into agent bootstrap context.
 */

import type { GraphitiEntity, GraphitiRelationship } from "../../../memory/graphiti-client.js";
import type { LightRAGQueryResponse } from "../../../memory/lightrag-client.js";
import type { MemoryServiceMemory } from "../../../memory/memory-service-client.js";

export type RAGContextResult = {
  graphiti?: {
    entities: GraphitiEntity[];
    relationships: GraphitiRelationship[];
  };
  lightrag?: LightRAGQueryResponse;
  memoryService?: {
    memories: MemoryServiceMemory[];
  };
};

/**
 * Format Graphiti entities and relationships into markdown
 */
export function formatGraphitiContext(
  entities: GraphitiEntity[],
  relationships: GraphitiRelationship[],
): string {
  const sections: string[] = [];

  if (entities.length === 0 && relationships.length === 0) {
    return "";
  }

  sections.push("## Temporal Knowledge Graph (Graphiti)");
  sections.push("");

  if (entities.length > 0) {
    sections.push("### Entities");
    sections.push("");
    for (const entity of entities) {
      sections.push(`- **${entity.name}** (${entity.type || "unknown"})`);
      if (entity.summary) {
        sections.push(`  - ${entity.summary}`);
      }
      if (entity.createdAt) {
        sections.push(`  - Created: ${entity.createdAt}`);
      }
    }
    sections.push("");
  }

  if (relationships.length > 0) {
    sections.push("### Relationships");
    sections.push("");
    for (const rel of relationships) {
      const label = rel.type ? `[${rel.type}]` : "";
      sections.push(`- ${rel.source} ${label} → ${rel.target}`);
      if (rel.summary) {
        sections.push(`  - ${rel.summary}`);
      }
    }
    sections.push("");
  }

  return sections.join("\n");
}

/**
 * Format LightRAG query response into markdown
 */
export function formatLightRAGContext(response: LightRAGQueryResponse): string {
  const sections: string[] = [];

  // Check if there's any content to display
  const hasAnswer = response.answer && response.answer.trim().length > 0;
  const hasSources = response.sources && response.sources.length > 0;
  const hasEntities = response.entities && response.entities.length > 0;

  if (!hasAnswer && !hasSources && !hasEntities) {
    return "";
  }

  sections.push("## Long-term Document Context (LightRAG)");
  sections.push("");

  if (hasAnswer) {
    sections.push("### Answer");
    sections.push("");
    sections.push(response.answer);
    sections.push("");
  }

  if (hasSources) {
    sections.push("### Sources");
    sections.push("");
    for (const source of response.sources!) {
      sections.push(`- ${source}`);
    }
    sections.push("");
  }

  if (hasEntities) {
    sections.push("### Related Entities");
    sections.push("");
    sections.push(response.entities!.join(", "));
    sections.push("");
  }

  return sections.join("\n");
}

/**
 * Format Memory Service memories into markdown
 */
export function formatMemoryServiceContext(memories: MemoryServiceMemory[]): string {
  const sections: string[] = [];

  if (memories.length === 0) {
    return "";
  }

  sections.push("## Universal Memory Layer (Memory Service)");
  sections.push("");

  for (const memory of memories) {
    sections.push(`### Memory ${memory.id}`);
    if (memory.score !== undefined) {
      sections.push(`*Relevance: ${memory.score.toFixed(3)}*`);
    }
    sections.push("");
    sections.push(memory.content);
    if (memory.createdAt) {
      sections.push("");
      sections.push(`*Created: ${memory.createdAt}*`);
    }
    sections.push("");
  }

  return sections.join("\n");
}

/**
 * Combine RAG results from all sources into a single markdown context file
 */
export function combineRAGContext(result: RAGContextResult, timestamp: Date): string {
  const sections: string[] = [];

  // Header
  sections.push("# RAG Context");
  sections.push("");
  sections.push(`Generated: ${timestamp.toISOString()}`);
  sections.push("");
  sections.push(
    "This file contains automatically retrieved context from your knowledge graph and memory systems.",
  );
  sections.push("");

  // Graphiti section
  if (result.graphiti) {
    const graphitiContent = formatGraphitiContext(
      result.graphiti.entities,
      result.graphiti.relationships,
    );
    if (graphitiContent) {
      sections.push(graphitiContent);
    }
  }

  // LightRAG section
  if (result.lightrag) {
    const lightragContent = formatLightRAGContext(result.lightrag);
    if (lightragContent) {
      sections.push(lightragContent);
    }
  }

  // Memory Service section
  if (result.memoryService) {
    const memoryServiceContent = formatMemoryServiceContext(result.memoryService.memories);
    if (memoryServiceContent) {
      sections.push(memoryServiceContent);
    }
  }

  // Check if any content was added
  const hasContent =
    (result.graphiti &&
      (result.graphiti.entities.length > 0 || result.graphiti.relationships.length > 0)) ||
    (result.lightrag &&
      ((result.lightrag.answer && result.lightrag.answer.trim().length > 0) ||
        (result.lightrag.sources && result.lightrag.sources.length > 0) ||
        (result.lightrag.entities && result.lightrag.entities.length > 0))) ||
    (result.memoryService && result.memoryService.memories.length > 0);

  if (!hasContent) {
    sections.push("*No relevant context found from RAG sources.*");
    sections.push("");
  }

  return sections.join("\n");
}
