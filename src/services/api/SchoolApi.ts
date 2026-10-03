// School API service
import { apiClient } from "./ApiClient";
import { RegisterSchoolPayload, LoginResponse } from "./AuthApi";

export interface SchoolDto {
  id: string;
  name: string;
  registration_number?: string;
  region?: string;
  school_type?: string;
  verification_status?: string;
  admin_user_id?: string;
  headmaster_name?: string;
  created_at?: string;
  [key: string]: any;
}

export interface SchoolsListResponse {
  success?: string | boolean;
  code?: number;
  message?: string;
  schools: SchoolDto[];
  pagination?: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}

export interface ListSchoolsParams {
  page?: number;
  page_size?: number;
  region?: string;
  verification_status?: string;
  q?: string;
}

export const SchoolApi = {
  /**
   * POST /auth/register/school
   * Registers school institution, returns auth credentials.
   */
  registerSchool: async (data: RegisterSchoolPayload): Promise<LoginResponse> => {
    return apiClient<LoginResponse>("/auth/register/school", {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  /**
   * GET /schools?page={page}&page_size={pageSize}&region={region}&verification_status={status}&q={query}
   * Lists schools directory with pagination and filters.
   */
  listSchools: async (params: ListSchoolsParams = {}): Promise<SchoolsListResponse> => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set("page", String(params.page));
    if (params.page_size) searchParams.set("page_size", String(params.page_size));
    if (params.region) searchParams.set("region", params.region);
    if (params.verification_status) searchParams.set("verification_status", params.verification_status);
    if (params.q) searchParams.set("q", params.q);

    const qs = searchParams.toString();
    return apiClient<SchoolsListResponse>(`/schools${qs ? `?${qs}` : ""}`, {
      method: "GET"
    }, true);
  },

  /**
   * GET /schools/{school_id}
   * Fetches specific school profile by UUID.
   */
  getSchool: async (schoolId: string): Promise<SchoolDto> => {
    return apiClient<SchoolDto>(`/schools/${schoolId}`, {
      method: "GET"
    }, true);
  },

  /**
   * PUT /schools/{school_id}
   * Updates school metadata.
   */
  updateSchool: async (schoolId: string, data: Partial<SchoolDto>): Promise<SchoolDto> => {
    return apiClient<SchoolDto>(`/schools/${schoolId}`, {
      method: "PUT",
      body: JSON.stringify(data)
    }, true);
  },

  /**
   * DELETE /schools/{school_id}
   * Removes school record.
   */
  deleteSchool: async (schoolId: string): Promise<void> => {
    return apiClient(`/schools/${schoolId}`, {
      method: "DELETE"
    }, true);
  },

  /**
   * POST /schools/{school_id}/verify
   * Updates school verification status (verified, rejected, pending).
   */
  verifySchool: async (schoolId: string, status: "verified" | "rejected" | "pending"): Promise<SchoolDto> => {
    return apiClient<SchoolDto>(`/schools/${schoolId}/verify`, {
      method: "POST",
      body: JSON.stringify({ status })
    }, true);
  }
};
