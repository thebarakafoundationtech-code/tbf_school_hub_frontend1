// Student API service
import { apiClient } from "./ApiClient";

export interface StudentDetailResponse {
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

export interface StudentListItem {
  student_id?: string;
  id?: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  email?: string;
  class?: {
    study_level?: string;
    curriculum?: string;
    [key: string]: any;
  } | string;
  [key: string]: any;
}

export interface StudentsListResponse {
  success?: string | boolean;
  code?: number;
  message?: string;
  students?: StudentListItem[];
  pagination?: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
  [key: string]: any;
}

export interface StudentImportResult {
  total_rows: number;
  created: number;
  enrolled: number;
  skipped: number;
  failed: number;
  errors?: string[];
}

export interface StudentImportOptions {
  send_otp?: boolean;
  default_password?: string;
}

export interface StudentExportOptions {
  format?: "csv" | "xlsx";
  class_id?: string;
  form_id?: string;
}

export const StudentApi = {
  /**
   * GET /student/{student_id} or /students/{student_id}
   * Fetches specific student record by student ID.
   */
  getStudentDetails: async (studentId: string | number): Promise<StudentDetailResponse> => {
    try {
      return await apiClient<StudentDetailResponse>(`/student/${studentId}`, {
        method: "GET"
      }, true);
    } catch {
      return apiClient<StudentDetailResponse>(`/students/${studentId}`, {
        method: "GET"
      }, true);
    }
  },

  /**
   * GET /students?page={page}&page_size={pageSize}&class_name={className}&search={search}
   * Fetches paginated list of students. Admin/Teacher authorized.
   */
  listStudents: async (
    page: number = 1,
    pageSize: number = 20,
    className?: string,
    search?: string
  ): Promise<StudentsListResponse> => {
    const validPage = Math.max(1, page);
    const validSize = Math.min(100, Math.max(1, pageSize));
    const params = new URLSearchParams();
    params.set("page", String(validPage));
    params.set("page_size", String(validSize));
    if (className) params.set("class_name", className);
    if (search) params.set("search", search);

    return apiClient<StudentsListResponse>(`/students?${params.toString()}`, {
      method: "GET"
    }, true);
  },

  /**
   * POST /students/import?send_otp={send_otp}&default_password={default_password}
   * Bulk-create students and optionally enroll them into a class.
   * Expects multipart/form-data with 'file'.
   */
  importStudents: async (
    file: File | Blob,
    optionsOrSendOtp: StudentImportOptions | boolean = true,
    defaultPassword?: string
  ): Promise<StudentImportResult> => {
    let send_otp = true;
    let password = "ChangeMe123!";
    if (typeof optionsOrSendOtp === "boolean") {
      send_otp = optionsOrSendOtp;
      if (defaultPassword) password = defaultPassword;
    } else if (typeof optionsOrSendOtp === "object") {
      send_otp = optionsOrSendOtp.send_otp !== false;
      if (optionsOrSendOtp.default_password) password = optionsOrSendOtp.default_password;
    }
    const params = new URLSearchParams();
    params.set("send_otp", String(send_otp));
    params.set("default_password", password);

    const formData = new FormData();
    formData.append("file", file);

    return apiClient<StudentImportResult>(`/students/import?${params.toString()}`, {
      method: "POST",
      body: formData
    }, true);
  },

  /**
   * GET /students/import/template?format={xlsx|csv}
   * Generates or fetches sample CSV/Excel template for bulk student import.
   */
  getImportTemplateUrl: (format: "xlsx" | "csv" = "xlsx"): string => {
    return `/api/v1/students/import/template?format=${format}`;
  },

  /**
   * GET /students/export?format={csv|xlsx}&class_id={class_id}&form_id={form_id}
   * Export students list to CSV or XLSX format.
   */
  getExportUrl: (options: StudentExportOptions | "csv" | "xlsx" = "csv"): string => {
    const opts = typeof options === "string" ? { format: options } : options;
    const params = new URLSearchParams();
    params.set("format", opts.format || "csv");
    if (opts.class_id) params.set("class_id", opts.class_id);
    if (opts.form_id) params.set("form_id", opts.form_id);
    return `/api/v1/students/export?${params.toString()}`;
  },

  /**
   * DELETE /students/{id}
   */
  deleteStudent: async (id: string | number): Promise<any> => {
    return apiClient(`/students/${id}`, { method: "DELETE" }, true);
  },

  /**
   * POST /students/batch-delete
   */
  batchDeleteStudents: async (ids: (string | number)[]): Promise<any> => {
    return apiClient("/students/batch-delete", {
      method: "POST",
      body: JSON.stringify({ ids })
    }, true);
  }
};
