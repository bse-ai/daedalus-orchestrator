import { describe, expect, it, vi } from "vitest";

import {
  GraphitiClient,
  type GraphitiSearchResponse,
  type GraphitiGraphResponse,
  type GraphitiEntityDetailsResponse,
  type GraphitiTimelineResponse,
} from "./graphiti-client.js";

function createFetchFixture(payload: unknown, status = 200): typeof fetch {
  return async () =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { "content-type": "application/json" },
    });
}

function createFailingFetch(status: number, body: string): typeof fetch {
  return async () =>
    new Response(body, {
      status,
      headers: { "content-type": "text/plain" },
    });
}

function createTimeoutFetch(): typeof fetch {
  return async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
    throw new Error("Timeout");
  };
}

describe("GraphitiClient", () => {
  it("health check returns true for successful response", async () => {
    const client = new GraphitiClient({ endpoint: "http://localhost:8000" });
    const fetchImpl = vi.fn(createFetchFixture({ status: "ok" }));
    globalThis.fetch = fetchImpl;

    const result = await client.health();

    expect(result).toBe(true);
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://localhost:8000/health",
      expect.objectContaining({
        method: "GET",
      }),
    );
  });

  it("health check returns false on error", async () => {
    const client = new GraphitiClient({ endpoint: "http://localhost:8000" });
    globalThis.fetch = vi.fn(createFailingFetch(500, "Internal Server Error"));

    const result = await client.health();

    expect(result).toBe(false);
  });

  it("search returns entities and relationships", async () => {
    const client = new GraphitiClient({ endpoint: "http://localhost:8000" });
    const mockResponse: GraphitiSearchResponse = {
      entities: [
        {
          id: "e1",
          name: "John Doe",
          type: "Person",
          summary: "Software engineer",
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-02T00:00:00Z",
        },
      ],
      relationships: [
        {
          id: "r1",
          source: "e1",
          target: "e2",
          type: "WORKS_ON",
          summary: "John works on project",
          createdAt: "2026-01-01T00:00:00Z",
        },
      ],
      total: 1,
    };

    globalThis.fetch = vi.fn(
      createFetchFixture({
        entities: [
          {
            id: "e1",
            name: "John Doe",
            type: "Person",
            summary: "Software engineer",
            created_at: "2026-01-01T00:00:00Z",
            updated_at: "2026-01-02T00:00:00Z",
          },
        ],
        relationships: [
          {
            id: "r1",
            source: "e1",
            target: "e2",
            type: "WORKS_ON",
            summary: "John works on project",
            created_at: "2026-01-01T00:00:00Z",
          },
        ],
        total: 1,
      }),
    );

    const result = await client.search({ query: "test query" });

    expect(result).toEqual(mockResponse);
  });

  it("search includes query parameters", async () => {
    const client = new GraphitiClient({ endpoint: "http://localhost:8000" });
    const fetchImpl = vi.fn(createFetchFixture({ entities: [], relationships: [] }));
    globalThis.fetch = fetchImpl;

    await client.search({
      query: "test",
      entityTypes: ["Person", "Project"],
      timeRange: { start: "2026-01-01", end: "2026-01-31" },
      limit: 10,
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining("query=test"),
      expect.anything(),
    );
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining("entity_types=Person%2CProject"),
      expect.anything(),
    );
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining("start=2026-01-01"),
      expect.anything(),
    );
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining("end=2026-01-31"),
      expect.anything(),
    );
    expect(fetchImpl).toHaveBeenCalledWith(expect.stringContaining("limit=10"), expect.anything());
  });

  it("search throws on non-ok response", async () => {
    const client = new GraphitiClient({ endpoint: "http://localhost:8000" });
    globalThis.fetch = vi.fn(createFailingFetch(500, "Internal Server Error"));

    await expect(client.search({ query: "test" })).rejects.toThrow(/graphiti search failed: 500/);
  });

  it("getGraph returns nodes and edges", async () => {
    const client = new GraphitiClient({ endpoint: "http://localhost:8000" });
    const mockResponse: GraphitiGraphResponse = {
      nodes: [
        {
          id: "n1",
          name: "Node 1",
          type: "Entity",
        },
      ],
      edges: [
        {
          id: "e1",
          source: "n1",
          target: "n2",
          type: "CONNECTS_TO",
        },
      ],
    };

    globalThis.fetch = vi.fn(
      createFetchFixture({
        nodes: [
          {
            id: "n1",
            name: "Node 1",
            type: "Entity",
          },
        ],
        edges: [
          {
            id: "e1",
            source: "n1",
            target: "n2",
            type: "CONNECTS_TO",
          },
        ],
      }),
    );

    const result = await client.getGraph();

    expect(result).toEqual(mockResponse);
  });

  it("getEntity returns entity with neighbors and relationships", async () => {
    const client = new GraphitiClient({ endpoint: "http://localhost:8000" });
    const mockResponse: GraphitiEntityDetailsResponse = {
      entity: {
        id: "e1",
        name: "Entity 1",
        type: "Person",
      },
      neighbors: [
        {
          id: "e2",
          name: "Entity 2",
          type: "Project",
        },
      ],
      relationships: [
        {
          id: "r1",
          source: "e1",
          target: "e2",
          type: "WORKS_ON",
        },
      ],
    };

    globalThis.fetch = vi.fn(
      createFetchFixture({
        entity: {
          id: "e1",
          name: "Entity 1",
          type: "Person",
        },
        neighbors: [
          {
            id: "e2",
            name: "Entity 2",
            type: "Project",
          },
        ],
        relationships: [
          {
            id: "r1",
            source: "e1",
            target: "e2",
            type: "WORKS_ON",
          },
        ],
      }),
    );

    const result = await client.getEntity("e1");

    expect(result).toEqual(mockResponse);
  });

  it("getTimeline returns statistics", async () => {
    const client = new GraphitiClient({ endpoint: "http://localhost:8000" });
    const mockResponse: GraphitiTimelineResponse = {
      totalEntities: 100,
      totalRelationships: 250,
      earliestTimestamp: "2026-01-01T00:00:00Z",
      latestTimestamp: "2026-01-31T23:59:59Z",
      stats: { avgDegree: 2.5 },
    };

    globalThis.fetch = vi.fn(
      createFetchFixture({
        total_entities: 100,
        total_relationships: 250,
        earliest_timestamp: "2026-01-01T00:00:00Z",
        latest_timestamp: "2026-01-31T23:59:59Z",
        stats: { avgDegree: 2.5 },
      }),
    );

    const result = await client.getTimeline();

    expect(result).toEqual(mockResponse);
  });

  it("trims trailing slash from endpoint", () => {
    const client = new GraphitiClient({ endpoint: "http://localhost:8000/" });
    expect((client as any).endpoint).toBe("http://localhost:8000");
  });

  it("uses default endpoint if not provided", () => {
    const client = new GraphitiClient();
    expect((client as any).endpoint).toBe("http://localhost:8000");
  });
});
