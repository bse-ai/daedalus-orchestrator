# Manual Testing Guide: RAG Memory Integration

**Subtask:** 6.4 - Manual integration testing
**Date:** 2026-02-03
**Status:** Ready for manual verification

---

## Prerequisites

1. **OpenClaw** built and ready to run
2. **RAG Services** available (Graphiti, LightRAG, Memory Service, Neo4j)
3. **Docker** and **docker-compose** installed
4. **Test data** available (optional but recommended)

---

## Step 1: Start RAG Services

### Expected Services:
- **Graphiti** → `http://localhost:8000`
- **LightRAG** → `http://localhost:8001`
- **Memory Service** → `http://localhost:8002`
- **Neo4j** → `bolt://localhost:7687` (used by Graphiti)

### Start Command:
```bash
# Navigate to the force-multiplier RAG stack directory
# (Adjust path as needed for your environment)
cd /path/to/force-multiplier

# Start all RAG services
docker-compose up -d

# Verify services are running
docker-compose ps
```

### Health Check:
```bash
# Check Graphiti
curl http://localhost:8000/health

# Check LightRAG
curl http://localhost:8001/stats

# Check Memory Service
curl http://localhost:8002/health
```

**Expected:** All services return HTTP 200 with valid JSON responses.

---

## Step 2: Configure OpenClaw

Create or update `~/.openclaw/openclaw.json` with RAG service configuration:

```json
{
  "agents": {
    "defaults": {
      "memorySearch": {
        "graphiti": {
          "enabled": true,
          "endpoint": "http://localhost:8000",
          "timeout": 5000
        },
        "lightrag": {
          "enabled": true,
          "endpoint": "http://localhost:8001",
          "timeout": 5000,
          "defaultMode": "hybrid"
        },
        "memoryService": {
          "enabled": true,
          "endpoint": "http://localhost:8002",
          "timeout": 5000
        }
      }
    }
  },
  "hooks": {
    "internal": {
      "entries": {
        "rag-context-inject": {
          "enabled": true,
          "maxEntities": 20,
          "maxRelations": 30,
          "maxMemories": 10,
          "maxDocuments": 5
        }
      }
    }
  }
}
```

---

## Step 3: Start OpenClaw Agent Session

```bash
# Start OpenClaw in CLI mode
pnpm dev

# Or if using the built version
openclaw gateway start
```

---

## Step 4: Verify RAG Context Injection

### Test: Bootstrap Context Injection

**Expected Behavior:**
- The `rag-context-inject` hook should trigger on `agent:bootstrap` event
- A synthetic bootstrap file `RAG_CONTEXT.md` should be injected
- Context should include data from all three RAG sources

**How to Verify:**
1. Start a new agent session
2. Check the agent's bootstrap files directory
3. Look for `RAG_CONTEXT.md` (or check if it's injected in-memory)
4. Content should have sections for:
   - **Graphiti Knowledge Graph** (entities, relationships)
   - **LightRAG Document Context** (answers, sources)
   - **Memory Service** (memories, scores)

**Manual Inspection:**
- Check agent logs for `[rag-context-inject]` messages
- Verify no errors during RAG queries
- Confirm all three services were queried

---

## Step 5: Test RAG Query Tools

### Test 5.1: `graphiti_search` Tool

**Invoke the tool:**
```
Use the graphiti_search tool to find entities related to "testing"
```

**Expected Response:**
```json
{
  "entities": [
    {
      "id": "entity-123",
      "name": "Testing Framework",
      "type": "Project",
      "description": "...",
      "created_at": "2026-02-03T12:00:00Z"
    }
  ],
  "relationships": [
    {
      "source": "entity-123",
      "target": "entity-456",
      "type": "depends_on",
      "description": "..."
    }
  ],
  "total": 1
}
```

**Verify:**
- ✅ Tool returns entities and relationships
- ✅ Results are formatted as JSON
- ✅ No errors or timeouts

---

### Test 5.2: `lightrag_query` Tool

**Invoke the tool:**
```
Use the lightrag_query tool in hybrid mode to answer: "What is the RAG integration architecture?"
```

**Expected Response:**
```json
{
  "answer": "The RAG integration architecture consists of...",
  "sources": [
    "doc-1: RAG Memory Integration Spec",
    "doc-2: Graphiti API Documentation"
  ],
  "entities": ["Graphiti", "LightRAG", "Memory Service"],
  "confidence": 0.92,
  "mode": "hybrid"
}
```

**Verify:**
- ✅ Tool returns answer with sources
- ✅ Confidence score is present
- ✅ Mode matches requested mode (hybrid)
- ✅ No errors

---

### Test 5.3: `memory_service_query` Tool

**Invoke the tool:**
```
Use the memory_service_query tool to search for "RAG integration"
```

**Expected Response:**
```json
{
  "memories": [
    {
      "content": "RAG integration enables automatic context retrieval...",
      "score": 0.87,
      "created_at": "2026-02-03T10:00:00Z",
      "metadata": {
        "source": "session",
        "type": "fact"
      }
    }
  ],
  "total": 1
}
```

**Verify:**
- ✅ Tool returns memories with scores
- ✅ Results are sorted by score (descending)
- ✅ Metadata is included
- ✅ No errors

---

## Step 6: Test Graceful Degradation

### Test 6.1: Stop Graphiti Service

```bash
# Stop only Graphiti
docker stop graphiti-service
```

**Expected Behavior:**
- ✅ `graphiti_search` tool returns graceful error message
- ✅ Agent session continues without crashing
- ✅ `rag-context-inject` hook skips Graphiti but queries LightRAG and Memory Service
- ✅ Logs show: `[rag-context-inject] Graphiti query failed: ...` or similar

**Restart Service:**
```bash
docker start graphiti-service
```

---

### Test 6.2: Stop LightRAG Service

```bash
# Stop only LightRAG
docker stop lightrag-service
```

**Expected Behavior:**
- ✅ `lightrag_query` tool returns graceful error message
- ✅ Agent session continues
- ✅ `rag-context-inject` hook skips LightRAG but queries Graphiti and Memory Service

**Restart Service:**
```bash
docker start lightrag-service
```

---

### Test 6.3: Stop Memory Service

```bash
# Stop Memory Service
docker stop memory-service
```

**Expected Behavior:**
- ✅ `memory_service_query` tool returns graceful error message
- ✅ Agent session continues
- ✅ `rag-context-inject` hook skips Memory Service but queries Graphiti and LightRAG

**Restart Service:**
```bash
docker start memory-service
```

---

### Test 6.4: All Services Down

```bash
# Stop all RAG services
docker-compose down
```

**Expected Behavior:**
- ✅ Agent session starts normally
- ✅ No RAG tools available (or they all return errors)
- ✅ `rag-context-inject` hook does not crash
- ✅ RAG_CONTEXT.md either not created or shows "No RAG services available"
- ✅ Agent continues to function with local memory only

**Restart Services:**
```bash
docker-compose up -d
```

---

## Step 7: Test Configuration Toggles

### Test 7.1: Disable RAG Context Injection Hook

Update `openclaw.json`:
```json
{
  "hooks": {
    "internal": {
      "entries": {
        "rag-context-inject": {
          "enabled": false
        }
      }
    }
  }
}
```

**Expected:**
- ✅ No RAG context injected on session start
- ✅ RAG_CONTEXT.md not created
- ✅ Tools still available and functional

---

### Test 7.2: Disable Individual RAG Services

Update `openclaw.json`:
```json
{
  "agents": {
    "defaults": {
      "memorySearch": {
        "graphiti": {
          "enabled": false
        }
      }
    }
  }
}
```

**Expected:**
- ✅ `graphiti_search` tool not available in tool list
- ✅ Hook does not query Graphiti
- ✅ Other services (LightRAG, Memory Service) still work

---

## Step 8: Verify Tool Registration

### List Available Tools

In agent session, ask:
```
What tools do you have available?
```

**Expected Tools:**
- `graphiti_search` (if Graphiti enabled)
- `lightrag_query` (if LightRAG enabled)
- `memory_service_query` (if Memory Service enabled)

**Verify:**
- ✅ All enabled RAG tools appear in the list
- ✅ Disabled tools do NOT appear
- ✅ Tool descriptions are clear and accurate

---

## Step 9: End-to-End Workflow Test

### Scenario: Multi-Turn Conversation with RAG

1. **Start new session**
   - Verify RAG_CONTEXT.md is injected

2. **Ask a question requiring RAG retrieval**
   ```
   What do you know about the RAG integration project?
   ```
   - Agent should use RAG tools to search for relevant context
   - Verify tool calls appear in logs

3. **Follow-up question**
   ```
   Show me entities related to "memory service"
   ```
   - Agent should use `graphiti_search` to find entities

4. **Document query**
   ```
   Query the long-term document knowledge base for information about LightRAG architecture
   ```
   - Agent should use `lightrag_query` with appropriate mode

**Verify:**
- ✅ Agent successfully retrieves context from all RAG sources
- ✅ Responses are coherent and accurate
- ✅ No crashes or timeouts
- ✅ Tool usage is logged correctly

---

## Acceptance Criteria Checklist

- [ ] **All RAG services start successfully**
- [ ] **OpenClaw connects to all three endpoints**
- [ ] **RAG_CONTEXT.md appears in bootstrap files on session start**
- [ ] **`graphiti_search` tool works and returns entities/relationships**
- [ ] **`lightrag_query` tool works and returns answers with sources**
- [ ] **`memory_service_query` tool works and returns memories**
- [ ] **Graceful degradation when Graphiti is down**
- [ ] **Graceful degradation when LightRAG is down**
- [ ] **Graceful degradation when Memory Service is down**
- [ ] **Graceful degradation when all services are down**
- [ ] **Configuration toggles work (enable/disable services and hook)**
- [ ] **No crashes or uncaught errors during testing**

---

## Troubleshooting

### Issue: Services not starting

**Solution:**
- Check Docker logs: `docker-compose logs`
- Verify ports 8000, 8001, 8002, 7687 are not in use
- Ensure Docker has sufficient resources

### Issue: Tools not appearing

**Solution:**
- Verify `memorySearch` config in `openclaw.json`
- Check that `enabled: true` for each service
- Restart OpenClaw after config changes

### Issue: Timeout errors

**Solution:**
- Increase timeout in config (default: 5000ms)
- Check network connectivity to localhost
- Verify services are responding to health checks

### Issue: Empty RAG_CONTEXT.md

**Solution:**
- Verify services have data ingested
- Check hook config `maxEntities`, `maxRelations`, etc.
- Review logs for query errors

---

## Notes

- This testing guide assumes you have access to the force-multiplier RAG stack
- Docker container names may vary based on your docker-compose configuration
- Adjust endpoint URLs if services run on different ports
- All testing should be performed on localhost for security

---

## Sign-Off

**Tester:** _________________
**Date:** _________________
**Result:** ☐ PASS | ☐ FAIL | ☐ PARTIAL
**Notes:**

---
