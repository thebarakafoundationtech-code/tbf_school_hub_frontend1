// Centralized API Services index
export * from "./ApiClient";
export * from "./AuthApi";
export * from "./StudentApi";
export * from "./TeacherApi";
export * from "./SchoolApi";
export * from "./ClassApi";
export * from "./DiscussionApi";
export * from "./AiApi";
export * from "./VerificationApi";

import { apiClient, BASE_URL } from "./ApiClient";
import { AuthApi } from "./AuthApi";
import { StudentApi } from "./StudentApi";
import { TeacherApi } from "./TeacherApi";
import { SchoolApi } from "./SchoolApi";
import { ClassApi } from "./ClassApi";
import { DiscussionApi } from "./DiscussionApi";
import { AiApi } from "./AiApi";
import { VerificationApi } from "./VerificationApi";

// Unified tbfApi instance providing convenient access to all endpoints
export const tbfApi = {
  BASE_URL,
  apiFetch: apiClient,
  apiClient,

  // Auth & Account
  login: AuthApi.login,
  getMe: AuthApi.getMe,
  registerUser: AuthApi.registerUser,
  registerStudentAccount: AuthApi.registerStudent,
  registerTeacherAccount: AuthApi.registerTeacher,
  registerSchool: SchoolApi.registerSchool,
  logout: AuthApi.logout,

  // Students
  getStudentDetails: StudentApi.getStudentDetails,
  listStudents: StudentApi.listStudents,

  // Teachers
  getTeacherDetails: TeacherApi.getTeacherDetails,

  // Classes
  getClasses: ClassApi.getClasses,
  createClass: ClassApi.createClass,
  updateClass: ClassApi.updateClass,
  deleteClass: ClassApi.deleteClass,

  // Discussions
  fetchDiscussions: DiscussionApi.getDiscussions,
  createDiscussion: (content: string) => DiscussionApi.startDiscussion({ content }),
  replyDiscussion: (threadId: string, content: string) => DiscussionApi.replyDiscussion(threadId, { content }),

  // AI & Learning Tools
  askBaraka: AiApi.askBaraka,
  arrangeMaterial: AiApi.arrangeMaterial,

  // Verification & OTP
  sendVerificationEmail: VerificationApi.sendVerificationEmail,
  sendOtp: VerificationApi.sendOtp,
  verifyPhone: VerificationApi.verifyPhone,
  resendOtp: VerificationApi.resendOtp
};

export default tbfApi;
