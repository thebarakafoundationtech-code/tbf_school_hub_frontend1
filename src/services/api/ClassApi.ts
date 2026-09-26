// Class API service
import { apiClient } from "./ApiClient";

export interface ClassDto {
  id?: string;
  class_name?: string;
  name?: string;
  teacher?: string;
  studentsCount?: number;
  avgScore?: number;
  subjects?: string;
  [key: string]: any;
}

export interface ClassesListResponse {
  success?: string | boolean;
  code?: number;
  message?: string;
  classes?: ClassDto[];
  [key: string]: any;
}

export interface CreateClassPayload {
  class_name: string;
  form_id?: string;
  class_teacher_id?: string;
  [key: string]: any;
}

export interface ClassMutationResponse {
  id?: string;
  name?: string;
  class_name?: string;
  success?: string | boolean;
  message?: string;
  [key: string]: any;
}

export interface EnrollStudentPayload {
  student_id?: string;
  user_id?: string;
  student_email?: string;
  student_phone?: string;
}

export interface BulkEnrollPayload {
  student_ids?: string[];
  user_ids?: string[];
  student_emails?: string[];
}

export const ClassApi = {
  /**
   * GET /classes
   * Retrieves all classes from the backend.
   */
  getClasses: async (): Promise<ClassesListResponse> => {
    return apiClient<ClassesListResponse>("/classes", {
      method: "GET"
    }, true);
  },

  /**
   * POST /classes
   * Creates a new class stream.
   */
  createClass: async (data: CreateClassPayload): Promise<ClassMutationResponse> => {
    return apiClient<ClassMutationResponse>("/classes", {
      method: "POST",
      body: JSON.stringify(data)
    }, true);
  },

  /**
   * PUT /classes/{class_id}
   * Updates an existing class stream.
   */
  updateClass: async (classId: string | number, data: { class_name: string }): Promise<ClassMutationResponse> => {
    return apiClient<ClassMutationResponse>(`/classes/${classId}`, {
      method: "PUT",
      body: JSON.stringify(data)
    }, true);
  },

  /**
   * DELETE /classes/{class_id}
   * Deletes a class stream.
   */
  deleteClass: async (classId: string | number): Promise<{ success?: string | boolean; code?: number; message?: string }> => {
    return apiClient<{ success?: string | boolean; code?: number; message?: string }>(`/classes/${classId}`, {
      method: "DELETE"
    }, true);
  },

  /**
   * GET /classes/{class_id}/students?page={page}&page_size={pageSize}
   * Fetches list of students enrolled in this specific class.
   */
  getClassStudents: async (
    classId: string | number,
    page: number = 1,
    pageSize: number = 50
  ): Promise<{ success?: string | boolean; code?: number; message?: string; students?: any[] }> => {
    return apiClient(`/classes/${classId}/students?page=${page}&page_size=${pageSize}`, {
      method: "GET"
    }, true);
  },

  /**
   * POST /classes/{class_id}/students
   * Enrolls an individual student into this class.
   */
  enrollStudent: async (classId: string | number, payload: EnrollStudentPayload | string): Promise<any> => {
    const body = typeof payload === "string" ? { student_id: payload } : payload;
    return apiClient(`/classes/${classId}/students`, {
      method: "POST",
      body: JSON.stringify(body)
    }, true);
  },

  /**
   * POST /classes/{class_id}/students/bulk
   * Bulk enrolls multiple students into this class.
   */
  bulkEnrollStudents: async (classId: string | number, payload: BulkEnrollPayload): Promise<any> => {
    return apiClient(`/classes/${classId}/students/bulk`, {
      method: "POST",
      body: JSON.stringify(payload)
    }, true);
  },

  /**
   * DELETE /classes/{class_id}/students/{student_id}
   * Unenrolls a student from the class.
   */
  unenrollStudent: async (classId: string | number, studentId: string | number): Promise<any> => {
    return apiClient(`/classes/${classId}/students/${studentId}`, {
      method: "DELETE"
    }, true);
  },

  /**
   * POST /classes/{class_id}/assign-teacher or PUT /classes/{class_id}/teacher
   * Assigns a teacher to manage this class.
   */
  assignTeacher: async (classId: string | number, teacherId: string): Promise<any> => {
    return apiClient(`/classes/${classId}/assign-teacher`, {
      method: "POST",
      body: JSON.stringify({ teacher_id: teacherId })
    }, true);
  }
};
