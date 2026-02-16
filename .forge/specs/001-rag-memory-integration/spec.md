# Specification: Full RAG Memory Integration

## Overview

This feature implements full integration between OpenClaw and the force-multiplier RAG stack (Graphiti, LightRAG, Memory Service) to provide:

1. **Query Tools** — Agent-accessible tools to search Graphiti (short-term temporal knowledge), LightRAG (long-term document graph), and Memory Service
2. **Auto-Context Injection** — Automatic retrieval of relevant context from all RAG sources and injection into the agent's system prompt/bootstrap files
3. **Write Pipeline** — Session content synced to Graphiti (already exists via graphiti-sync hook), important facts stored in LightRAG for long-term retention

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    AGENT SESSION                        │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Bootstrap Files (auto-injected context)          │   │
│  │  - MEMORY.md (local file memory)                 │   │
│  │  - RAG_CONTEXT.md (NEW: graph-derived context)   │   │
│  └─────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────┤
│                    QUERY TOOLS                          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐   │
│  │ graphiti_   │ │ lightrag_   │ │ memory_service_ │   │
│  │ search      │ │ query       │ │ query           │   │
│  └─────────────┘ └─────────────┘ └─────────────────┘   │
├─────────────────────────────────────────────────────────┤
│                 AUTO-RETRIEVAL HOOK                     │
│  ┌─────────────────────────────────────────────────┐   │
│  │ rag-context-inject hook                          │   │
│  │ - Triggers on session start / first message      │   │
│  │ - Queries all RAG sources for relevant context   │   │
│  │ - Injects RAG_CONTEXT.md into bootstrap          │   │
│  └─────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────┤
│                    RAG SERVICES                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐   │
│  │ Graphiti    │ │ LightRAG    │ │ Memory Service  │   │
│  │ :8000       │ │ :8001       │ │ :8002           │   │
│  │ (short-term)│ │ (long-term) │ │ (universal)     │   │
│  └─────────────┘ └─────────────┘ └─────────────────┘   │
│                         │                               │
│                    ┌────┴────┐                          │
│                    │ Neo4j   │                          │
│                    │ :7687   │                          │
│                    └─────────┘                          │
└─────────────────────────────────────────────────────────┘
```

## Workflow Type

**Type**: feature

**Rationale**: This adds new tools, hooks, and integration logic without modifying core agent loop behavior. Follows existing patterns for tools and hooks.

## Task Scope

### Services Involved

- **src/tools/** (primary) — New RAG query tools
- **src/hooks/bundled/** (primary) — New context injection hook
- **src/memory/** (integration) — Extend existing graphiti-client, add lightrag-client and memory-service-client

### This Task Will:

- [ ] Create `graphiti_search` tool — Search entities, relationships, get temporal context
- [ ] Create `lightrag_query` tool — Query document graph RAG (hybrid mode)
- [ ] Create `memory_service_query` tool — Query universal memory layer
- [ ] Create `rag-context-inject` hook — Auto-inject relevant context on session start
- [ ] Create `lightrag-client.ts` — HTTP client for LightRAG API (port 8001)
- [ ] Create `memory-service-client.ts` — HTTP client for Memory Service API (port 8002)
- [ ] Extend config schema to support all three RAG endpoints
- [ ] Add RAG_CONTEXT.md to bootstrap file injection

### Out of Scope:

- Modifications to the existing graphiti-sync hook (already works)
- LightRAG ingestion pipeline (separate concern)
- Neo4j direct access (use HTTP APIs only)
- Real-time streaming from RAG services

## Service Context

### OpenClaw (Primary)

**Tech Stack:**

- Language: TypeScript (Node.js)
- Framework: None (CLI/Gateway)
- Build: pnpm, tsup
- Key directories: `src/tools/`, `src/hooks/`, `src/memory/`

**Entry Point:** `src/index.ts`

**How to Run:**

```bash
pnpm dev
# or
openclaw gateway start
```

**Existing Dependencies:**

- Node.js 20+
- TypeScript
- fetch (native)

## Files to Create

| File                                              | Purpose                            |
| ------------------------------------------------- | ---------------------------------- |
| `src/memory/lightrag-client.ts`                   | HTTP client for LightRAG API       |
| `src/memory/memory-service-client.ts`             | HTTP client for Memory Service API |
| `src/tools/bundled/graphiti-search.ts`            | Graphiti search tool               |
| `src/tools/bundled/lightrag-query.ts`             | LightRAG query tool                |
| `src/tools/bundled/memory-service-query.ts`       | Memory Service query tool          |
| `src/hooks/bundled/rag-context-inject/handler.ts` | Context injection hook             |
| `src/hooks/bundled/rag-context-inject/HOOK.md`    | Hook metadata                      |

## Files to Modify

| File                                 | What to Change                                 |
| ------------------------------------ | ---------------------------------------------- |
| `src/tools/bundled/index.ts`         | Export new tools                               |
| `src/hooks/bundled/index.ts`         | Export new hook                                |
| `src/config/types.agent-defaults.ts` | Add lightrag and memory-service config options |
| `src/agents/bootstrap-files.ts`      | Inject RAG_CONTEXT.md when available           |

## Files to Reference

| File                                         | Pattern to Copy                      |
| -------------------------------------------- | ------------------------------------ |
| `src/memory/graphiti-client.ts`              | HTTP client pattern for RAG services |
| `src/hooks/bundled/graphiti-sync/handler.ts` | Hook implementation pattern          |
| `src/tools/bundled/memory-search.ts`         | Tool implementation pattern          |
| `docs/design/graphiti-memory-integration.md` | Design context and API endpoints     |

## RAG API Endpoints

### Graphiti (localhost:8000) — Already documented in graphiti-client.ts

- `GET /entities/search` — Natural language entity search
- `GET /graph` — Get graph at point in time
- `GET /entities/{id}` — Entity details with neighbors
- `GET /timeline` — Stats and temporal bounds

### LightRAG (localhost:8001) — New client needed

- `POST /query` — Query knowledge base
  - Modes: naive, local, global, hybrid
  - Returns: answer, sources, entities, confidence
- `GET /graph/entities` — List extracted entities
- `GET /stats` — Knowledge base statistics

### Memory Service (localhost:8002) — New client needed

- `POST /memories` — Add memory (future use)
- `GET /memories/search` — Search memories by query
- `GET /entities` — List entities with counts
- `GET /health` — Health check

## Configuration

```json5
{
  agents: {
    defaults: {
      memorySearch: {
        graphiti: {
          enabled: true,
          endpoint: "http://localhost:8000",
        },
        lightrag: {
          enabled: true,
          endpoint: "http://localhost:8001",
        },
        memoryService: {
          enabled: true,
          endpoint: "http://localhost:8002",
        },
      },
    },
  },
  hooks: {
    internal: {
      entries: {
        "rag-context-inject": {
          enabled: true,
          maxEntities: 20,
          maxRelations: 30,
        },
      },
    },
  },
}
```

## Tool Schemas

### graphiti_search

```typescript
{
  name: "graphiti_search",
  description: "Search the temporal knowledge graph for entities, relationships, and context from past sessions",
  parameters: {
    query: "string",           // Natural language query
    entityTypes?: "string[]",  // Filter by type (Person, Project, File, etc.)
    timeRange?: {
      start?: "string",        // ISO date
      end?: "string",
    },
    limit?: "number",          // Max results (default: 10)
  }
}
```

### lightrag_query

```typescript
{
  name: "lightrag_query",
  description: "Query the long-term document knowledge base for answers with sources",
  parameters: {
    query: "string",           // Natural language query
    mode?: "string",           // naive | local | global | hybrid (default: hybrid)
    topK?: "number",           // Max sources (default: 5)
    includeSources?: "boolean" // Include source citations (default: true)
  }
}
```

### memory_service_query

```typescript
{
  name: "memory_service_query",
  description: "Query the universal memory layer for stored memories and entities",
  parameters: {
    query: "string",           // Natural language query
    limit?: "number",          // Max results (default: 10)
  }
}
```

## Acceptance Criteria

1. **Tools Available**: All three RAG query tools appear in agent tool list when configured
2. **Tools Work**: Each tool returns valid results from its respective service
3. **Auto-Context**: On session start, relevant context is automatically injected into bootstrap
4. **Graceful Degradation**: If any RAG service is unavailable, agent continues without that context
5. **Configuration**: All endpoints are configurable via openclaw.json
6. **Health Checks**: Tools check service health before querying and fail fast with clear errors

## Testing

1. Start RAG services (docker-compose)
2. Configure OpenClaw with all three endpoints
3. Start agent session
4. Verify RAG_CONTEXT.md appears in bootstrap
5. Call each tool manually and verify results
6. Stop one service, verify graceful degradation

## Security Considerations

- All RAG services run locally (localhost only)
- No external API keys required for RAG queries
- Entity data is project-scoped via metadata
- No PII should be stored in RAG without consent
