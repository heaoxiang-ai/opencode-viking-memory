import { VikingMemory } from "./viking_memory.js";
import { CONFIG, VIKING_MEMORY_API_KEY, isConfigured, VIKING_MEMORY_RESOURCE_ID} from "../config.js";
import { log } from "./logger.js";
import type {
  MemoryType,
  ConversationMessage,
  ConversationIngestResponse,
} from "../types/index.js";

const Viking_Memory_API_URL = "https://api-knowledgebase.mlp.cn-beijing.volces.com";

const TIMEOUT_MS = 30000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
    ),
  ]);
}

export class VikingMemoryClient {
  private client: VikingMemory | null = null;

  private getClient(): VikingMemory {
    if (!this.client) {
      if (!isConfigured()) {
        throw new Error("VIKING_MEMORY_API_KEY not set");
      }
      this.client = new VikingMemory({
        apiKey: VIKING_MEMORY_API_KEY!,
        url: Viking_Memory_API_URL,
        resource_id: VIKING_MEMORY_RESOURCE_ID!,
      });
    }
    return this.client;
  }

  async searchMemories(query: string, containerTag?: string) {
    log("searchMemories: start", { containerTag });
    try {
      const result = await withTimeout(
        this.getClient().searchMemories(
          query,
          containerTag,
          {
            threshold: CONFIG.similarityThreshold,
            limit: CONFIG.maxMemories,
            searchMode: "hybrid"
          }
        ),
        TIMEOUT_MS
      );
      log("searchMemories: result", { result });
      log("searchMemories: success", { count: (result as any).results?.length || 0 });
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log("searchMemories: error", { error: errorMessage });
      return { success: false as const, error: errorMessage, results: [], total: 0, timing: 0 };
    }
  }

  async getProfile(containerTag: string, query?: string) {
    log("getProfile: start", { containerTag });
    try {
      const result = await withTimeout(
        this.getClient().getProfile(containerTag, query),
        TIMEOUT_MS
      );
      log("getProfile: result", { result });
      log("getProfile: success", { hasProfile: !!(result as any).profile });
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log("getProfile: error", { error: errorMessage });
      return { success: false as const, error: errorMessage, profile: null };
    }
  }

  async addMemory(
    content: string,
    containerTag: string,
    metadata?: { type?: MemoryType; tool?: string; [key: string]: unknown }
  ) {
    log("addMemory: start", { containerTag, contentLength: content.length });
    try {
      const result = await withTimeout(
        this.getClient().addMemory(
          content,
          containerTag,
          metadata as Record<string, string | number | boolean | string[]>,
        ),
        TIMEOUT_MS
      );
      log("addMemory: result", { result });
      if (!result.success) {
        log("addMemory: error", { error: result.error });
        return result;
      }
      log("addMemory: success", { id: (result as any).id });
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log("addMemory: error", { error: errorMessage });
      return { success: false as const, error: errorMessage };
    }
  }

  async deleteMemory(memoryId: string) {
    log("deleteMemory: start", { memoryId });
    try {
      await withTimeout(
        this.getClient().deleteMemory(memoryId),
        TIMEOUT_MS
      );
      log("deleteMemory: success", { memoryId });
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log("deleteMemory: error", { memoryId, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }

  async listMemories(containerTag: string, limit = 20) {
    log("listMemories: start", { containerTag, limit });
    try {
      const result = await withTimeout(
        this.getClient().listMemories(
          containerTag,
          limit,
          { order: "desc", sort: "createdAt" }
        ),
        TIMEOUT_MS
      );
      log("listMemories: success", { count: (result as any).memories?.length || 0 });
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log("listMemories: error", { error: errorMessage });
      return { success: false as const, error: errorMessage, memories: [], pagination: { currentPage: 1, totalItems: 0, totalPages: 0 } };
    }
  }

  async ingestConversation(
    conversationId: string,
    messages: ConversationMessage[],
    containerTags: string[],
    metadata?: Record<string, string | number | boolean>
  ) {
    log("ingestConversation: start", { conversationId, messageCount: messages.length });
    try {
      const response = await withTimeout(
        fetch(`${Viking_Memory_API_URL}/conversations`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${VIKING_MEMORY_API_KEY}`,
          },
          body: JSON.stringify({
            conversationId,
            messages,
            containerTags,
            metadata,
          }),
        }),
        TIMEOUT_MS
      );

      if (!response.ok) {
        const errorText = await response.text();
        log("ingestConversation: error response", { status: response.status, error: errorText });
        return { success: false as const, error: `HTTP ${response.status}: ${errorText}` };
      }

      const result = await response.json() as ConversationIngestResponse;
      log("ingestConversation: success", { conversationId, status: result.status });
      return { success: true as const, ...result };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log("ingestConversation: error", { error: errorMessage });
      return { success: false as const, error: errorMessage };
    }
  }

  async searchExperienceCards(query: string) {
    log("searchExperienceCards: start", { queryLength: query.length });
    try {
      const result = await withTimeout(
        this.getClient().searchMemories(
          query,
          undefined,
          {
            threshold: CONFIG.similarityThreshold,
            limit: CONFIG.maxMemories,
            memoryType: "experience-card"
          }
        ),
        TIMEOUT_MS
      );
      log("searchExperienceCards: result", { count: (result as any).results?.length || 0 });
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log("searchExperienceCards: error", { error: errorMessage });
      return { success: false as const, error: errorMessage, results: [], total: 0, timing: 0 };
    }
  }
}

export const vikingMemoryClient = new VikingMemoryClient();
