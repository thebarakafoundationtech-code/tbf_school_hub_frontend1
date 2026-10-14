// Teacher API service
import { apiClient } from "./ApiClient";
import { RegisterTeacherPayload } from "./AuthApi";

export interface TeacherDetailResponse {
  success?: string | boolean;
  code?: number;
  message?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  class?: {
    study_level?: string;
    curriculum?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export const TeacherApi = {
  /**
   * GET /teacher/{teacher_id}
   * Fetches specific teacher details.
   */
  getTeacherDetails: async (teacherId: string | number): Promise<TeacherDetailResponse> => {
    return apiClient<TeacherDetailResponse>(`/teacher/${teacherId}`, {
      method: "GET"
    }, true);
  },

  /**
   * POST /register/teacher
   * Teacher account registration.
   */
  registerTeacher: async (data: RegisterTeacherPayload) => {
    return apiClient<{ message?: string; user_id?: string; phone?: string }>("/register/teacher", {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  /**
   * POST /teachers/import
   * Bulk-create teachers and assign classes via CSV or XLSX file.
   */
  importTeachers: async (file: File | Blob): Promise<any> => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient<any>("/teachers/import", {
      method: "POST",
      body: formData
    }, true);
  },

  /**
   * GET /teachers/import/template?format={csv|xlsx}
   */
  getImportTemplateUrl: (format: "csv" | "xlsx" = "csv"): string => {
    return `/api/v1/teachers/import/template?format=${format}`;
  }
};
