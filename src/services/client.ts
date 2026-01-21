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
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false as const, error: errorMessage, results: [], total: 0, timing: 0 };
    }
  }

  async getProfile(containerTag?: string, query?: string, options?: { assistantId?: string; memoryType?: string }) {
    try {
      const result = await withTimeout(
        this.getClient().getProfile(containerTag, query, options),
        TIMEOUT_MS
      );
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false as const, error: errorMessage, profile: null };
    }
  }

  async addMemory(
    content: string,
    containerTag: string,
    metadata?: { type?: MemoryType; tool?: string; [key: string]: unknown }
  ) {
    try {
      const result = await withTimeout(
        this.getClient().addMemory(
          content,
          containerTag,
          metadata as Record<string, string | number | boolean | string[]>,
        ),
        TIMEOUT_MS
      );
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false as const, error: errorMessage };
    }
  }

  async deleteMemory(memoryId: string) {
    try {
      await withTimeout(
        this.getClient().deleteMemory(memoryId),
        TIMEOUT_MS
      );
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  }

  async listMemories(containerTag: string, limit = 20) {
    try {
      const result = await withTimeout(
        this.getClient().listMemories(
          containerTag,
          limit,
          { order: "desc", sort: "createdAt" }
        ),
        TIMEOUT_MS
      );
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false as const, error: errorMessage, memories: [], pagination: { currentPage: 1, totalItems: 0, totalPages: 0 } };
    }
  }

  async ingestConversation(
    conversationId: string,
    messages: ConversationMessage[],
    containerTags: string[],
    metadata?: Record<string, string | number | boolean>
  ) {
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
        return { success: false as const, error: `HTTP ${response.status}: ${errorText}` };
      }

      const result = await response.json() as ConversationIngestResponse;
      return { success: true as const, ...result };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false as const, error: errorMessage };
    }
  }

  async searchExperienceCards(query: string) {
    try {
      const result = await withTimeout(
        this.getClient().getProfile(
          undefined,
          query,
          {
            assistantId: "assistant",
            memoryType: "experience_card",
            limit: 3
          }
        ),
        TIMEOUT_MS
      );
      if (!result.success) {
        return { success: false as const, error: result.error, results: [], total: 0, timing: 0 };
      }
      const profile = (result as any).profile;
      const results = (profile?.dynamic || []).map((item: any, index: number) => {
        const content = typeof item === 'string' ? item : JSON.stringify(item);
        return {
          id: `experience_card_${index}`,
          memory: content,
          chunk: content,
          similarity: 1.0
        };
      });
      return { success: true as const, results, total: results.length, timing: 0 };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false as const, error: errorMessage, results: [], total: 0, timing: 0 };
    }
  }
}

export const vikingMemoryClient = new VikingMemoryClient();
