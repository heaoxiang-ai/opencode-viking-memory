import { log } from "./logger.js";

export class VikingMemory {
  private apiKey: string;
  private url: string;
  private resource_id: string;

  constructor(options: { apiKey: string; url: string; resource_id: string}) {
    this.apiKey = options.apiKey;
    this.url = options.url;
    this.resource_id = options.resource_id;
  }

  async searchMemories(
    query: string,
    containerTag: string, // user_id
    options?: { threshold?: number; limit?: number; searchMode?: string }
  ): Promise<{
    success: true;
    error?: undefined;
    results: Array<{ id: string; memory?: string; chunk?: string; similarity: number }>;
    total: number;
    timing: number;
  } | {
    success: false;
    error: string;
    results: [];
    total: 0;
    timing: 0;
  }> {
    try {
      const response = await fetch(`${this.url}/api/memory/event/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
          "X-Viking-Debug": "1",
        },
        body: JSON.stringify({
          query: query,
          filter: {user_id: containerTag, memory_type: "sys_event_vibe_coding_v1"},
          limit: options?.limit,
          resource_id: this.resource_id
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        const errorMessage = `HTTP ${response.status}: ${errorText}`;
        log("searchMemories: error", { error: errorMessage });
        return { success: false, error: errorMessage, results: [], total: 0, timing: 0 };
      }
      
      interface NewApiResponse {
        data: {
          count: number;
          result_list: Array<{
            id: string;
            score: number;
            memory_info: Record<string, any>; 
          }>;
        };
      }

      const result = await response.json() as NewApiResponse;
      log("searchMemories: response", { result: result });
      const mappedResults = (result.data?.result_list || []).map((item) => {
        const content = JSON.stringify(item.memory_info || {});
        return {
          id: item.id,
          memory: content,       // 对应 memory_info
          chunk: content,        // 对应 memory_info (通常和 memory 一样)
          similarity: item.score // 对应 score
        };
      });
      
      // return { success: true, results: (result.results as Array<{ id: string; memory?: string; chunk?: string; similarity: number }>) || [], total: (result.total as number) || 0, timing: (result.timing as number) || 0 };
      return { success: true, results: mappedResults, total: result.data.count || 0, timing: 0 };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        results: [],
        total: 0,
        timing: 0,
      };
    }
  }

  async getProfile(
    containerTag: string,
    query?: string
  ): Promise<{
    success: true;
    profile: { static: string[]; dynamic: string[] };
  } | {
    success: false;
    error: string;
    profile: null;
  }> {
    try {
      const response = await fetch(`${this.url}/api/memory/profile/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
          "X-Viking-Debug": "1",
        },
        body: JSON.stringify({
          "filter": {"user_id": containerTag, "memory_type": "sys_profile_vibe_coding_v1"},
          "query": query,
          "resource_id": this.resource_id,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        const errorMessage = `HTTP ${response.status}: ${errorText}`;
        log("getProfile: error", { error: errorMessage });
        return { success: false, error: errorMessage, profile: null };
      }

      const result = await response.json() as Record<string, unknown>;
      interface ResultItem {
        memory_info: string;
      }
      let dynamicList: string[] = [];
      const dataObj = result.data as { result_list?: ResultItem[] } | undefined;
      if (Array.isArray(dataObj?.result_list)) {
        dynamicList = dataObj.result_list.map((item) => item.memory_info);
      }
      const finalProfile = {
        static: [],
        dynamic: dynamicList // TODO 暂时先放到 dynamic 里面，不知道 static 和 dynamic 有什么区别
      };

      return { success: true, profile: finalProfile };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        profile: null,
      };
    }
  }

  async addMemory(
    content: string,
    containerTag: string,
    metadata?: { type?: string; tool?: string; [key: string]: unknown }
  ): Promise<{
    success: true;
    id: string;
    [key: string]: unknown;
  } | {
    success: false;
    error: string;
  }> {
    try {
      const requestBody = {
        "messages": [{"content": content, "role": "user"}],
        resource_id: this.resource_id,
        "metadata": {"default_user_id": containerTag, "default_assistant_id": "opencode", "time": Date.now()}
        // metadata,
      };
      log("addMemory: request", { url: `${this.url}/api/memory/session/add`, method: "POST", body: requestBody });

      const response = await fetch(`${this.url}/api/memory/session/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
          "X-Viking-Debug": "1",
        },
        body: JSON.stringify(requestBody),
      });
      if (!response.ok) {
        const errorText = await response.text();
        const errorMessage = `HTTP ${response.status}: ${errorText}`;
        log("addMemory: error", { error: errorMessage });
        return { success: false, error: errorMessage };
      }

      const result = await response.json() as Record<string, unknown>;
      const dataObj = result.data as { session_id: string };
      log("addMemory: response", { status: response.status, result });

      return { success: true, id: (dataObj.session_id as string) || "" };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log("addMemory: error", { error: errorMessage });
      return {
        success: false,
        error: errorMessage,
      };
    }
  }
  
  async deleteMemory(memoryId: string): Promise<{ success: true } | { success: false; error: string }> {
    try {
      const response = await fetch(`${this.url}/api/memory/event/delete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
          "X-Viking-Debug": "1",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: `HTTP ${response.status}: ${errorText}` };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async listMemories(
    containerTag: string,
    limit = 20,
    options?: { order?: string; sort?: string }
  ): Promise<{
    success: true;
    memories: Array<{ id: string; summary: string; createdAt: string; metadata?: Record<string, unknown> }>;
    pagination: { currentPage: number; totalItems: number; totalPages: number };
  } | {
    success: false;
    error: string;
    memories: [];
    pagination: { currentPage: 1; totalItems: 0; totalPages: 0 };
  }> {
    try {
      const response = await fetch(`${this.url}/api/memory/event/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
          "X-Viking-Debug": "1",
        },
        body: JSON.stringify({
          containerTags: [containerTag],
          filter: {user_id: containerTag, memory_type: "sys_event_vibe_coding_v1"},
          limit: 5000, // mock 
          resource_id: this.resource_id
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        const errorMessage = `HTTP ${response.status}: ${errorText}`;
        log("listMemories: error", { error: errorMessage });
        return { success: false, error: errorMessage, memories: [], pagination: { currentPage: 1, totalItems: 0, totalPages: 0 } };
      }
      
      interface NewApiResponse {
        data: {
          count: number;
          result_list: Array<{
            id: string;
            time: number;
            memory_info: Record<string, any>; 
          }>;
        };
      }

      const result = await response.json() as NewApiResponse;
      log("listMemories: response", { result: result });
      const mappedResults = (result.data?.result_list || []).map((item) => {
        const content = JSON.stringify(item.memory_info || {});
        const createdAt = item.time ? (typeof item.time === "number" ? new Date(item.time).toISOString() : String(item.time)) : "";
        return {
          id: item.id,
          summary: content,       // 对应 memory_info
          createdAt,       
        };
      });

      const totalItems = (result.data && typeof result.data.count === "number") ? result.data.count : mappedResults.length;
      const totalPages = Math.max(1, Math.ceil(totalItems / limit));

      return {
        success: true,
        memories: mappedResults,
        pagination: { currentPage: 1, totalItems, totalPages }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        memories: [],
        pagination: { currentPage: 1, totalItems: 0, totalPages: 0 },
      };
    }
  }

  async ingestConversation(
    conversationId: string,
    messages: Array<{ role: string; content: string | Array<{ type: string; text?: string }>; name?: string; tool_calls?: unknown; tool_call_id?: string }>,
    containerTags: string[],
    metadata?: Record<string, string | number | boolean>
  ): Promise<{
    success: true;
    id: string;
    conversationId: string;
    status: string;
  } | {
    success: false;
    error: string;
  }> {
    try {
        const requestBody = {
        "messages": messages,
        resource_id: this.resource_id,
        "metadata": {"default_user_id": containerTags, "default_assistant_id": "opencode", "time": Date.now(), "session_id": conversationId}
      };
      const response = await fetch(`${this.url}/api/memory/session/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        const errorMessage = `HTTP ${response.status}: ${errorText}`;
        log("ingestConversation: error response", { status: response.status, error: errorMessage });
        return { success: false, error: `HTTP ${response.status}: ${errorText}` };
      }

      const result = await response.json() as Record<string, unknown>;
      const dataObj = result.data as { session_id: string };
      log("ingestConversation: response", { status: response.status, result });

      return { success: true, id: (dataObj.session_id as string) || "", conversationId: (result.conversationId as string) || conversationId, status: (result.status as string) || "" };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
