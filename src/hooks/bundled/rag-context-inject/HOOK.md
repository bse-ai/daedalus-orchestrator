---
name: rag-context-inject
description: "Auto-inject relevant RAG context into agent bootstrap on session start"
homepage: https://docs.forge-orchestrator.ai/hooks#rag-context-inject
metadata:
  {
    "forge-orchestrator":
      {
        "emoji": "🧠",
        "events": ["agent:bootstrap"],
        "install": [{ "id": "bundled", "kind": "bundled", "label": "Bundled with ForgeOrchestrator" }],
      },
  }
---

# RAG Context Injection Hook

Automatically retrieves relevant context from RAG services (Graphiti, LightRAG, Memory Service) and injects it into the agent's bootstrap files at session start.

## What It Does

When you start a new session or send the first message:

1. **Queries RAG Services** - Searches Graphiti (temporal knowledge), LightRAG (document graph), and Memory Service for relevant context
2. **Aggregates Results** - Combines entities, relationships, and memories from all sources
3. **Creates Bootstrap File** - Generates `RAG_CONTEXT.md` with the retrieved context
4. **Injects into Agent** - Adds the context file to the agent's bootstrap files for automatic inclusion in prompts
5. **Graceful Degradation** - If any service is unavailable, continues with available sources

## Output Format

The hook creates a `RAG_CONTEXT.md` file in your agent's bootstrap directory with this format:

```markdown
# RAG Context (Auto-Retrieved)

## Entities

- **Person**: John Doe - Software engineer working on the API redesign
- **Project**: forge-orchestrator - ForgeOrchestrator agent framework with RAG integration

## Relationships

- John Doe WORKS_ON forge-orchestrator (since 2026-01-15)
- forge-orchestrator USES Graphiti (for temporal knowledge)

## Memories

- Discussed API authentication flow on 2026-01-14
- Reviewed RAG integration design on 2026-01-15

## Sources

- Graphiti: 8 entities, 12 relationships
- LightRAG: 3 documents
- Memory Service: 5 memories
```

## Requirements

- **Config**: At least one RAG service endpoint must be configured:
  - `agents.defaults.memorySearch.graphiti.endpoint` (default: http://localhost:8000)
  - `agents.defaults.memorySearch.lightrag.endpoint` (default: http://localhost:8001)
  - `agents.defaults.memorySearch.memoryService.endpoint` (default: http://localhost:8002)

The hook will query all enabled RAG services and combine their results.

## Configuration

The hook supports optional configuration:

| Option           | Type   | Default | Description                                 |
| ---------------- | ------ | ------- | ------------------------------------------- |
| `maxEntities`    | number | 20      | Maximum number of entities to retrieve      |
| `maxRelations`   | number | 30      | Maximum number of relationships to retrieve |
| `maxMemories`    | number | 15      | Maximum number of memories to retrieve      |
| `timeWindowDays` | number | 30      | Only retrieve context from the last N days  |

Example configuration:

```json
{
  "hooks": {
    "internal": {
      "entries": {
        "rag-context-inject": {
          "enabled": true,
          "maxEntities": 30,
          "maxRelations": 50,
          "maxMemories": 20,
          "timeWindowDays": 60
        }
      }
    }
  }
}
```

## RAG Services

The hook integrates with three RAG services:

### Graphiti (Temporal Knowledge Graph)

- **Purpose**: Short-term temporal knowledge with timestamps
- **Endpoint**: `http://localhost:8000`
- **Data**: Entities, relationships, events from recent sessions

### LightRAG (Document Graph)

- **Purpose**: Long-term document knowledge base
- **Endpoint**: `http://localhost:8001`
- **Data**: Document chunks, extracted entities, graph relationships

### Memory Service (Universal Memory Layer)

- **Purpose**: Cross-project memory storage
- **Endpoint**: `http://localhost:8002`
- **Data**: Stored memories, entity counts, search results

## When Context Is Injected

The hook triggers on the `agent:bootstrap` event, which fires when the agent is initializing and loading its bootstrap files. This ensures RAG context is available from the very beginning of the agent session, before any user messages are processed.

## Disabling

To disable this hook:

```bash
forge-orchestrator hooks disable rag-context-inject
```

Or via config:

```json
{
  "hooks": {
    "internal": {
      "entries": {
        "rag-context-inject": { "enabled": false }
      }
    }
  }
}
```

## Troubleshooting

### No context appears in bootstrap

- Verify RAG services are running: `curl http://localhost:8000/health`
- Check hook is enabled: `forge-orchestrator hooks list`
- Review logs for connection errors

### Context is stale or irrelevant

- Adjust `timeWindowDays` to expand/narrow the time window
- Reduce `maxEntities`/`maxRelations` if too much irrelevant data appears
- Ensure RAG ingestion pipelines are running (graphiti-sync hook, LightRAG indexer)

### One RAG service is down

The hook continues with available services. If all services are down, the hook logs a warning but does not fail the session.
