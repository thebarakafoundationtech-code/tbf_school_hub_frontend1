// Verification & OTP API service
import { apiClient } from "./ApiClient";

export interface SendEmailVerificationPayload {
  email: string;
  code: string;
  name?: string;
}

export interface SendOtpPayload {
  phone: string;
  name?: string;
  code?: string;
}

export interface VerifyPhonePayload {
  phone: string;
  code: string;
}

export interface ResendOtpPayload {
  phone: string;
}

export interface OtpResponse {
  success?: string | boolean;
  code?: number;
  message?: string;
  previewUrl?: string;
  preview_url?: string;
  request_id?: any;
  [key: string]: any;
}

export const VerificationApi = {
  /**
   * POST /auth/otp/send-verification-email
   * Sends email verification code to user.
   */
  sendVerificationEmail: async (data: SendEmailVerificationPayload): Promise<OtpResponse> => {
    return apiClient<OtpResponse>("/auth/otp/send-verification-email", {
      method: "POST",
      body: JSON.stringify({
        email: data.email,
        code: data.code,
        name: data.name || "Student"
      })
    });
  },

  /**
   * POST /auth/otp/send-otp
   * Sends SMS OTP to telephone number.
   */
  sendOtp: async (data: SendOtpPayload): Promise<OtpResponse> => {
    const code = data.code || String(Math.floor(100000 + Math.random() * 900000));
    return apiClient<OtpResponse>("/auth/otp/send-otp", {
      method: "POST",
      body: JSON.stringify({
        phone: data.phone,
        name: data.name || "Student",
        code
      })
    });
  },

  /**
   * POST /verify-phone
   * Verifies SMS OTP entered by user.
   */
  verifyPhone: async (data: VerifyPhonePayload): Promise<OtpResponse> => {
    return apiClient<OtpResponse>("/verify-phone", {
      method: "POST",
      body: JSON.stringify({
        phone: data.phone.replace("+", ""),
        code: data.code
      })
    });
  },

  /**
   * POST /resend-otp
   * Resends verification OTP to phone number.
   */
  resendOtp: async (data: ResendOtpPayload): Promise<OtpResponse> => {
    return apiClient<OtpResponse>("/resend-otp", {
      method: "POST",
      body: JSON.stringify(data)
    });
  }
};
