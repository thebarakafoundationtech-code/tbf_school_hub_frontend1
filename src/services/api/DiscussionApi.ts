// Discussion API service
import { apiClient } from "./ApiClient";

export interface DiscussionThread {
  id?: string;
  content?: string;
  author?: {
    id?: string;
    first_name?: string;
    last_name?: string;
    [key: string]: any;
  };
  created_at?: string;
  replies?: DiscussionReply[];
  [key: string]: any;
}

export interface DiscussionReply {
  id?: string;
  thread_id?: string;
  content?: string;
  author?: {
    id?: string;
    first_name?: string;
    last_name?: string;
    [key: string]: any;
  };
  created_at?: string;
  [key: string]: any;
}

export interface ThreadCreatedResponse {
  success?: string | boolean;
  code?: number;
  message?: string;
  thread?: DiscussionThread;
  [key: string]: any;
}

export interface ReplyCreatedResponse {
  success?: string | boolean;
  code?: number;
  message?: string;
  reply?: DiscussionReply;
  [key: string]: any;
}

export const DiscussionApi = {
  /**
   * GET /discussions
   * Retrieves discussion threads.
   */
  getDiscussions: async (): Promise<{ success?: string | boolean; discussions?: DiscussionThread[]; threads?: DiscussionThread[] }> => {
    return apiClient("/discussions", {
      method: "GET"
    }, true);
  },

  /**
   * POST /discussions
   * Creates a new discussion thread.
   */
  startDiscussion: async (data: { content: string }): Promise<ThreadCreatedResponse> => {
    return apiClient<ThreadCreatedResponse>("/discussions", {
      method: "POST",
      body: JSON.stringify(data)
    }, true);
  },

  /**
   * POST /discussions/{thread_id}/replies
   * Adds a reply to a discussion thread.
   */
  replyDiscussion: async (threadId: string | number, data: { content: string }): Promise<ReplyCreatedResponse> => {
    return apiClient<ReplyCreatedResponse>(`/discussions/${threadId}/replies`, {
      method: "POST",
      body: JSON.stringify(data)
    }, true);
  },

  /**
   * POST /discussions/{thread_id}/upvote
   * Upvotes a discussion thread.
   */
  upvoteDiscussion: async (threadId: string | number): Promise<{ success: boolean | string; upvotes?: number }> => {
    return apiClient(`/discussions/${threadId}/upvote`, {
      method: "POST"
    }, true);
  },

  /**
   * DELETE /discussions/{thread_id}
   * Removes a discussion thread.
   */
  deleteDiscussion: async (threadId: string | number): Promise<{ success: boolean | string }> => {
    return apiClient(`/discussions/${threadId}`, {
      method: "DELETE"
    }, true);
  }
};
