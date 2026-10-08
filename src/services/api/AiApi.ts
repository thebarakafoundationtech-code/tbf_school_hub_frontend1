// AI API service (Baraka AI Companion & Material Arranger)
import { apiClient } from "./ApiClient";

export interface ChatHistoryMessage {
  text: string;
  sender: string; // "1" for student/user, "2" for Baraka
}

export interface AskBarakaPayload {
  message: string;
  history?: ChatHistoryMessage[];
}

export interface AskBarakaResponse {
  success?: string | boolean;
  code?: number;
  message?: string;
  text?: string;
  source?: string;
  [key: string]: any;
}

export interface ArrangeMaterialPayload {
  title?: string;
  subject?: string;
  templateType?: string;
  rawText: string;
}

export interface ArrangeMaterialResponse {
  success?: string | boolean;
  code?: number;
  message?: string;
  arrangedContent?: any;
  quizQuestions?: any[];
  [key: string]: any;
}

export const AiApi = {
  /**
   * POST /ask-baraka
   * Ask Baraka AI study companion with conversation history.
   */
  askBaraka: async (data: AskBarakaPayload): Promise<AskBarakaResponse> => {
    return apiClient<AskBarakaResponse>("/ask-baraka", {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  /**
   * POST /arrange-material
   * Arranges raw learning materials into structured notes, summaries, and quizzes.
   */
  arrangeMaterial: async (data: ArrangeMaterialPayload): Promise<ArrangeMaterialResponse> => {
    return apiClient<ArrangeMaterialResponse>("/arrange-material", {
      method: "POST",
      body: JSON.stringify({
        title: data.title || "Untitled Material",
        subject: data.subject || "General",
        templateType: data.templateType || "notes",
        rawText: data.rawText
      })
    });
  }
};
