/**
 * Baraka School Hub API - TypeScript Definitions
 * Directly aligned with OpenAPI Spec v0.1.0 (https://schubapi.thebarakafoundation.or.tz/api/openapi.json)
 */

export interface SuccessResponse {
  success: "true";
  code: number;
  message: string;
}

export interface ValidationError {
  loc: (string | number)[];
  msg: string;
  type: string;
  input?: any;
  ctx?: Record<string, any>;
}

export interface HTTPValidationError {
  detail?: ValidationError[];
  message?: string;
}

export interface PaginationResponse {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

// ----------------- Auth & User -----------------
export interface UserResponse {
  id: string;
  email: string;
  fname: string;
  lname: string;
  role: "admin" | "teacher" | "student" | "school_admin" | string;
}

export interface StudentProfileResponse {
  phone: string | null;
  study_level: string;
  curriculum: string;
  photo_url: string | null;
}

export interface SchoolResponse {
  id: string;
  name: string;
  registration_number: string;
  region: string;
  school_type: string;
  headmaster_name: string;
  verification_status: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  success: "true";
  code: number;
  message: string;
  access_token: string;
  token_type?: string;
  expires_in: number;
  user: UserResponse;
  student_profile?: StudentProfileResponse | null;
  school?: SchoolResponse | null;
}

export interface AuthMeResponse {
  success: "true";
  code: number;
  message: string;
  user: UserResponse;
}

export interface OAuthUrlResponse {
  success: "true";
  code: number;
  message: string;
  url: string;
}

export interface VerificationEmailRequest {
  email: string;
  name?: string;
}

export interface VerificationEmailResponse {
  success: "true";
  code: number;
  message: string;
  previewUrl?: string | null;
}

export interface VerifyEmailRequest {
  email: string;
  code: string;
}

export interface VerificationPhoneRequest {
  phone: string;
  name: string;
  code: string;
}

export interface VerificationPhoneResponse {
  success: string;
  code: number;
  message: string;
  preview_url?: string | null;
  request_id?: string | number | null;
}

export interface VerifyPhoneRequest {
  email: string;
  phone: string;
  code: string;
}

export interface ResendOtpRequest {
  email: string;
  phone: string;
}

// ----------------- Registration -----------------
export interface RegisterRequest {
  fname: string;
  lname: string;
  email: string;
  phone: string;
  password: string;
}

export interface RegisterResponse {
  success?: string;
  code?: number;
  message: string;
  user_id?: string;
}

export interface StudentRegisterRequest {
  fname: string;
  lname: string;
  email: string;
  phone: string;
  password: string;
  study_level: string;
  curriculum: string;
  photo_url?: string | null;
}

export interface StudentRegisterResponse {
  message: string;
  user_id: string;
}

export interface TeacherRegisterRequest {
  fname: string;
  lname: string;
  email: string;
  phone: string;
  password: string;
  school: string;
  photo_url?: string | null;
}

export interface SchoolRegisterRequest {
  fname: string;
  lname: string;
  email: string;
  phone: string;
  password: string;
  school_name: string;
  registration_number: string;
  region: string;
  school_type: string;
  headmaster_name: string;
  verification_document_name?: string | null;
}

// ----------------- Schools -----------------
export interface SchoolItem {
  id: string;
  name: string;
  registration_number: string;
  region: string;
  school_type: string;
  verification_status: "pending" | "verified" | "rejected" | string;
  admin_user_id: string;
  created_at: string;
}

export interface SchoolListResponse {
  success: string;
  code: number;
  message: string;
  schools: SchoolItem[];
  pagination?: PaginationResponse | null;
}

export interface UpdateSchoolRequest {
  name?: string | null;
  region?: string | null;
  school_type?: string | null;
  headmaster_name?: string | null;
  verification_document_name?: string | null;
}

export interface VerifySchoolRequest {
  status: "pending" | "verified" | "rejected";
}

// ----------------- Classes -----------------
export interface ClassItemResponse {
  id: string;
  class_name: string;
}

export interface ClassListResponse {
  success: "true";
  code: number;
  message: string;
  classes: ClassItemResponse[];
}

export interface CreateClassRequest {
  form_id: string;
  class_name: string;
  class_teacher_id?: string | null;
}

export interface UpdateClassRequest {
  class_name: string;
}

export interface AssignClassTeacherRequest {
  teacher_id: string;
}

// ----------------- Enrollment -----------------
export interface EnrollStudentRequest {
  student_id?: string;
  user_id?: string;
  student_email?: string;
  student_phone?: string;
}

export interface BulkEnrollRequest {
  student_ids?: string[];
  user_ids?: string[];
  student_emails?: string[];
}

export interface BulkEnrollResult {
  success_count: number;
  skipped_count: number;
  failed_count: number;
  failures: any[];
}

export interface BulkEnrollResponse {
  success: string;
  code: number;
  message: string;
  result: BulkEnrollResult;
}

export interface EnrollmentItem {
  enrollment_id: string;
  student_id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
  class_id: string;
  class_name: string;
  enrolled_at: string;
}

export interface EnrollmentListResponse {
  success: string;
  code: number;
  message: string;
  students: EnrollmentItem[];
}

// ----------------- Students & Teachers -----------------
export interface StudentClassResponse {
  class_id?: string;
  class_name: string;
  form_id?: string;
}

export interface StudentDetailsResponse {
  success: "true";
  code: number;
  message: string;
  first_name: string;
  last_name: string;
  email: string;
  class?: StudentClassResponse;
}

export interface TeacherDetailsResponse {
  success: "true" | "false";
  code: number;
  message: string;
  first_name: string;
  last_name: string;
  email: string;
  class?: {
    study_level?: string;
    curriculum?: string;
  };
}

export interface StudentListItem {
  student_id: string;
  first_name: string;
  last_name: string;
  email: string;
  class?: StudentClassResponse | null;
}

export interface StudentListResponse {
  success: "true";
  code: number;
  message: string;
  students: StudentListItem[];
  pagination: PaginationResponse;
}

export interface ImportRowError {
  row: number;
  column?: string;
  error: string;
  details?: any;
}

export interface ImportResult {
  total_rows: number;
  created: number;
  enrolled: number;
  skipped: number;
  failed: number;
  errors: ImportRowError[];
}

// ----------------- Discussions -----------------
export interface DiscussionAuthorResponse {
  id: string;
  name: string;
  email: string;
  role?: string;
}

export interface DiscussionThreadData {
  id: string;
  content: string;
  author: DiscussionAuthorResponse;
  created_at: string;
}

export interface DiscussionThreadResponse {
  success: "true";
  code: number;
  message: string;
  thread: DiscussionThreadData;
}

export interface DiscussionReplyData {
  id: string;
  thread_id: string;
  content: string;
  author: DiscussionAuthorResponse;
  created_at: string;
}

export interface DiscussionReplyResponse {
  success: "true";
  code: number;
  message: string;
  reply: DiscussionReplyData;
}

export interface DiscussionTextRequest {
  content: string;
}

// ----------------- AI -----------------
export interface ChatTurn {
  role: "user" | "model" | "assistant";
  parts?: (string | { text: string })[];
  text?: string;
  message?: string;
  content?: string;
}

export interface AskBarakaRequest {
  message: string;
  history?: ChatTurn[];
}

export interface AskBarakaResponse {
  success: "true";
  code: number;
  message: string;
  text: string;
  source: string;
}

export interface ArrangeMaterialRequest {
  title?: string;
  subject?: string;
  templateType?: string;
  rawText: string;
}

export interface ArrangeMaterialResponse {
  success: "true";
  code: number;
  message: string;
  arrangedContent: Record<string, any>;
  quizQuestions: any[];
}

// ----------------- System -----------------
export interface RootResponse {
  success: "true";
  code: number;
  message: string;
  status: string;
  docs?: string;
}

export interface HealthResponse {
  success: "true";
  code: number;
  message: string;
  status: string;
  service: string;
  database: string;
  database_error: string | null;
}
