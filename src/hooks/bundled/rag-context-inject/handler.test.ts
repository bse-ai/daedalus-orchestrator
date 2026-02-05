import path from "node:path";

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import handler from "./handler.js";
import { createHookEvent } from "../../hooks.js";
import type { AgentBootstrapHookContext } from "../../internal-hooks.js";
import type { OpenClawConfig } from "../../../config/config.js";
import { makeTempWorkspace } from "../../../test-helpers/workspace.js";
import * as GraphitiClientModule from "../../../memory/graphiti-client.js";
import * as LightRAGClientModule from "../../../memory/lightrag-client.js";
import * as MemoryServiceClientModule from "../../../memory/memory-service-client.js";

describe("rag-context-inject hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("skips non-bootstrap events", async () => {
    const tempDir = await makeTempWorkspace("openclaw-rag-");

    const event = createHookEvent("command", "new", "agent:main:main", {
      workspaceDir: tempDir,
    });

    // Should not throw or modify anything
    await handler(event);

    // Event should not have bootstrapFiles (command events don't have them)
    expect(event.context.bootstrapFiles).toBeUndefined();
  });

  it("skips when all RAG services are disabled", async () => {
    const tempDir = await makeTempWorkspace("openclaw-rag-");

    const cfg: OpenClawConfig = {
      agents: {
        defaults: {
          workspace: tempDir,
          memorySearch: {
            graphiti: { enabled: false, endpoint: "http://localhost:8123" },
            lightrag: { enabled: false, endpoint: "http://localhost:8124" },
            memoryService: { enabled: false, endpoint: "http://localhost:8125" },
          },
        },
      },
    };

    const context: AgentBootstrapHookContext = {
      workspaceDir: tempDir,
      bootstrapFiles: [],
      cfg,
      sessionKey: "agent:main:main",
    };

    const event = createHookEvent("agent", "bootstrap", "agent:main:main", context);
    await handler(event);

    // No bootstrap files should be added
    expect(context.bootstrapFiles.length).toBe(0);
  });

  it("skips when hook is explicitly disabled", async () => {
    const tempDir = await makeTempWorkspace("openclaw-rag-");

    const cfg: OpenClawConfig = {
      agents: {
        defaults: {
          workspace: tempDir,
          memorySearch: {
            graphiti: { enabled: true, endpoint: "http://localhost:8123" },
          },
        },
      },
      hooks: {
        internal: {
          entries: {
            "rag-context-inject": { enabled: false },
          },
        },
      },
    };

    const context: AgentBootstrapHookContext = {
      workspaceDir: tempDir,
      bootstrapFiles: [],
      cfg,
      sessionKey: "agent:main:main",
    };

    const event = createHookEvent("agent", "bootstrap", "agent:main:main", context);
    await handler(event);

    // No bootstrap files should be added
    expect(context.bootstrapFiles.length).toBe(0);
  });

  it("queries Graphiti and injects context when enabled", async () => {
    const tempDir = await makeTempWorkspace("openclaw-rag-");

    // Mock Graphiti client
    const mockSearch = vi.fn().mockResolvedValue({
      entities: [
        {
          name: "Test Entity",
          type: "concept",
          summary: "A test entity",
          createdAt: "2024-01-01T00:00:00Z",
        },
      ],
      relationships: [
        {
          source: "Test Entity",
          target: "Another Entity",
          type: "relates_to",
          summary: "A test relationship",
        },
      ],
    });

    const mockHealth = vi.fn().mockResolvedValue(true);

    vi.spyOn(GraphitiClientModule, "GraphitiClient").mockImplementation(function () {
      return {
        health: mockHealth,
        search: mockSearch,
      };
    } as any);

    const cfg: OpenClawConfig = {
      agents: {
        defaults: {
          workspace: tempDir,
          memorySearch: {
            graphiti: { enabled: true, endpoint: "http://localhost:8123" },
          },
        },
      },
    };

    const context: AgentBootstrapHookContext = {
      workspaceDir: tempDir,
      bootstrapFiles: [],
      cfg,
      sessionKey: "agent:main:main",
    };

    const event = createHookEvent("agent", "bootstrap", "agent:main:main", context);
    await handler(event);

    // Verify health check was called
    expect(mockHealth).toHaveBeenCalled();

    // Verify search was called with session key
    expect(mockSearch).toHaveBeenCalledWith({
      query: "session context for agent:main:main",
      limit: 20, // default maxEntities
    });

    // Bootstrap file should be added
    expect(context.bootstrapFiles.length).toBe(1);
    expect(context.bootstrapFiles[0]?.name).toBe("RAG_CONTEXT.md");
    expect(context.bootstrapFiles[0]?.path).toBe("<synthetic>");
    expect(context.bootstrapFiles[0]?.content).toContain("# RAG Context");
    expect(context.bootstrapFiles[0]?.content).toContain("Test Entity");
    expect(context.bootstrapFiles[0]?.content).toContain("relates_to");
  });

  it("queries LightRAG and injects context when enabled", async () => {
    const tempDir = await makeTempWorkspace("openclaw-rag-");

    // Mock LightRAG client
    const mockQuery = vi.fn().mockResolvedValue({
      answer: "This is relevant context from LightRAG",
      sources: ["doc1.md", "doc2.md"],
      entities: ["Entity1", "Entity2"],
    });

    const mockHealth = vi.fn().mockResolvedValue(true);

    vi.spyOn(LightRAGClientModule, "LightRAGClient").mockImplementation(function () {
      return {
        health: mockHealth,
        query: mockQuery,
      };
    } as any);

    const cfg: OpenClawConfig = {
      agents: {
        defaults: {
          workspace: tempDir,
          memorySearch: {
            lightrag: {
              enabled: true,
              endpoint: "http://localhost:8124",
              defaultMode: "hybrid",
            },
          },
        },
      },
    };

    const context: AgentBootstrapHookContext = {
      workspaceDir: tempDir,
      bootstrapFiles: [],
      cfg,
      sessionKey: "agent:main:main",
    };

    const event = createHookEvent("agent", "bootstrap", "agent:main:main", context);
    await handler(event);

    // Verify health check was called
    expect(mockHealth).toHaveBeenCalled();

    // Verify query was called
    expect(mockQuery).toHaveBeenCalledWith({
      query: "What is the relevant context for session agent:main:main?",
      mode: "hybrid",
      topK: 5, // default maxDocuments
      includeSources: true,
    });

    // Bootstrap file should be added
    expect(context.bootstrapFiles.length).toBe(1);
    expect(context.bootstrapFiles[0]?.content).toContain("# RAG Context");
    expect(context.bootstrapFiles[0]?.content).toContain("This is relevant context from LightRAG");
    expect(context.bootstrapFiles[0]?.content).toContain("doc1.md");
    expect(context.bootstrapFiles[0]?.content).toContain("Entity1");
  });

  it("queries Memory Service and injects context when enabled", async () => {
    const tempDir = await makeTempWorkspace("openclaw-rag-");

    // Mock Memory Service client
    const mockSearch = vi.fn().mockResolvedValue({
      memories: [
        {
          id: "mem-1",
          content: "Previous conversation about testing",
          score: 0.95,
          createdAt: "2024-01-01T00:00:00Z",
        },
        {
          id: "mem-2",
          content: "User prefers TypeScript",
          score: 0.88,
          createdAt: "2024-01-02T00:00:00Z",
        },
      ],
    });

    const mockHealth = vi.fn().mockResolvedValue(true);

    vi.spyOn(MemoryServiceClientModule, "MemoryServiceClient").mockImplementation(function () {
      return {
        health: mockHealth,
        search: mockSearch,
      };
    } as any);

    const cfg: OpenClawConfig = {
      agents: {
        defaults: {
          workspace: tempDir,
          memorySearch: {
            memoryService: { enabled: true, endpoint: "http://localhost:8125" },
          },
        },
      },
    };

    const context: AgentBootstrapHookContext = {
      workspaceDir: tempDir,
      bootstrapFiles: [],
      cfg,
      sessionKey: "agent:main:main",
    };

    const event = createHookEvent("agent", "bootstrap", "agent:main:main", context);
    await handler(event);

    // Verify health check was called
    expect(mockHealth).toHaveBeenCalled();

    // Verify search was called
    expect(mockSearch).toHaveBeenCalledWith({
      query: "session agent:main:main",
      limit: 10, // default maxMemories
    });

    // Bootstrap file should be added
    expect(context.bootstrapFiles.length).toBe(1);
    expect(context.bootstrapFiles[0]?.content).toContain("# RAG Context");
    expect(context.bootstrapFiles[0]?.content).toContain("Previous conversation about testing");
    expect(context.bootstrapFiles[0]?.content).toContain("User prefers TypeScript");
    expect(context.bootstrapFiles[0]?.content).toContain("0.95");
  });

  it("combines results from multiple RAG sources", async () => {
    const tempDir = await makeTempWorkspace("openclaw-rag-");

    // Mock all three clients
    vi.spyOn(GraphitiClientModule, "GraphitiClient").mockImplementation(function () {
      return {
        health: vi.fn().mockResolvedValue(true),
        search: vi.fn().mockResolvedValue({
          entities: [{ name: "GraphitiEntity", type: "test" }],
          relationships: [],
        }),
      };
    } as any);

    vi.spyOn(LightRAGClientModule, "LightRAGClient").mockImplementation(function () {
      return {
        health: vi.fn().mockResolvedValue(true),
        query: vi.fn().mockResolvedValue({
          answer: "LightRAG answer",
          sources: [],
        }),
      };
    } as any);

    vi.spyOn(MemoryServiceClientModule, "MemoryServiceClient").mockImplementation(function () {
      return {
        health: vi.fn().mockResolvedValue(true),
        search: vi.fn().mockResolvedValue({
          memories: [{ id: "m1", content: "Memory content", score: 0.9 }],
        }),
      };
    } as any);

    const cfg: OpenClawConfig = {
      agents: {
        defaults: {
          workspace: tempDir,
          memorySearch: {
            graphiti: { enabled: true, endpoint: "http://localhost:8123" },
            lightrag: { enabled: true, endpoint: "http://localhost:8124" },
            memoryService: { enabled: true, endpoint: "http://localhost:8125" },
          },
        },
      },
    };

    const context: AgentBootstrapHookContext = {
      workspaceDir: tempDir,
      bootstrapFiles: [],
      cfg,
      sessionKey: "agent:main:main",
    };

    const event = createHookEvent("agent", "bootstrap", "agent:main:main", context);
    await handler(event);

    // Bootstrap file should contain results from all sources
    expect(context.bootstrapFiles.length).toBe(1);
    const content = context.bootstrapFiles[0]?.content || "";
    expect(content).toContain("GraphitiEntity");
    expect(content).toContain("LightRAG answer");
    expect(content).toContain("Memory content");
  });

  it("handles service unavailability gracefully", async () => {
    const tempDir = await makeTempWorkspace("openclaw-rag-");

    // Mock unhealthy service
    vi.spyOn(GraphitiClientModule, "GraphitiClient").mockImplementation(function () {
      return {
        health: vi.fn().mockResolvedValue(false),
        search: vi.fn(),
      };
    } as any);

    const cfg: OpenClawConfig = {
      agents: {
        defaults: {
          workspace: tempDir,
          memorySearch: {
            graphiti: { enabled: true, endpoint: "http://localhost:8123" },
          },
        },
      },
    };

    const context: AgentBootstrapHookContext = {
      workspaceDir: tempDir,
      bootstrapFiles: [],
      cfg,
      sessionKey: "agent:main:main",
    };

    const event = createHookEvent("agent", "bootstrap", "agent:main:main", context);

    // Should not throw
    await handler(event);

    // Bootstrap file should still be created but with "No relevant context"
    expect(context.bootstrapFiles.length).toBe(1);
    expect(context.bootstrapFiles[0]?.content).toContain("No relevant context found");
  });

  it("handles query errors gracefully", async () => {
    const tempDir = await makeTempWorkspace("openclaw-rag-");

    // Mock service that throws error
    vi.spyOn(GraphitiClientModule, "GraphitiClient").mockImplementation(function () {
      return {
        health: vi.fn().mockResolvedValue(true),
        search: vi.fn().mockRejectedValue(new Error("Network error")),
      };
    } as any);

    const cfg: OpenClawConfig = {
      agents: {
        defaults: {
          workspace: tempDir,
          memorySearch: {
            graphiti: { enabled: true, endpoint: "http://localhost:8123" },
          },
        },
      },
    };

    const context: AgentBootstrapHookContext = {
      workspaceDir: tempDir,
      bootstrapFiles: [],
      cfg,
      sessionKey: "agent:main:main",
    };

    const event = createHookEvent("agent", "bootstrap", "agent:main:main", context);

    // Should not throw
    await handler(event);

    // Bootstrap file should still be created
    expect(context.bootstrapFiles.length).toBe(1);
    expect(context.bootstrapFiles[0]?.content).toContain("No relevant context found");
  });

  it("respects custom max limits from hook config", async () => {
    const tempDir = await makeTempWorkspace("openclaw-rag-");

    const mockSearch = vi.fn().mockResolvedValue({
      entities: [],
      relationships: [],
    });

    vi.spyOn(GraphitiClientModule, "GraphitiClient").mockImplementation(function () {
      return {
        health: vi.fn().mockResolvedValue(true),
        search: mockSearch,
      };
    } as any);

    const cfg: OpenClawConfig = {
      agents: {
        defaults: {
          workspace: tempDir,
          memorySearch: {
            graphiti: { enabled: true, endpoint: "http://localhost:8123" },
          },
        },
      },
      hooks: {
        internal: {
          entries: {
            "rag-context-inject": {
              enabled: true,
              maxEntities: 50,
              maxRelations: 75,
              maxMemories: 25,
              maxDocuments: 15,
            },
          },
        },
      },
    };

    const context: AgentBootstrapHookContext = {
      workspaceDir: tempDir,
      bootstrapFiles: [],
      cfg,
      sessionKey: "agent:main:main",
    };

    const event = createHookEvent("agent", "bootstrap", "agent:main:main", context);
    await handler(event);

    // Verify custom limits were used
    expect(mockSearch).toHaveBeenCalledWith({
      query: "session context for agent:main:main",
      limit: 50, // custom maxEntities
    });
  });

  it("handles empty results from all sources", async () => {
    const tempDir = await makeTempWorkspace("openclaw-rag-");

    // Mock services returning empty results
    vi.spyOn(GraphitiClientModule, "GraphitiClient").mockImplementation(function () {
      return {
        health: vi.fn().mockResolvedValue(true),
        search: vi.fn().mockResolvedValue({
          entities: [],
          relationships: [],
        }),
      };
    } as any);

    vi.spyOn(LightRAGClientModule, "LightRAGClient").mockImplementation(function () {
      return {
        health: vi.fn().mockResolvedValue(true),
        query: vi.fn().mockResolvedValue({
          answer: "",
          sources: [],
        }),
      };
    } as any);

    vi.spyOn(MemoryServiceClientModule, "MemoryServiceClient").mockImplementation(function () {
      return {
        health: vi.fn().mockResolvedValue(true),
        search: vi.fn().mockResolvedValue({
          memories: [],
        }),
      };
    } as any);

    const cfg: OpenClawConfig = {
      agents: {
        defaults: {
          workspace: tempDir,
          memorySearch: {
            graphiti: { enabled: true, endpoint: "http://localhost:8123" },
            lightrag: { enabled: true, endpoint: "http://localhost:8124" },
            memoryService: { enabled: true, endpoint: "http://localhost:8125" },
          },
        },
      },
    };

    const context: AgentBootstrapHookContext = {
      workspaceDir: tempDir,
      bootstrapFiles: [],
      cfg,
      sessionKey: "agent:main:main",
    };

    const event = createHookEvent("agent", "bootstrap", "agent:main:main", context);
    await handler(event);

    // Bootstrap file should indicate no content found
    expect(context.bootstrapFiles.length).toBe(1);
    expect(context.bootstrapFiles[0]?.content).toContain("No relevant context found");
  });
});
