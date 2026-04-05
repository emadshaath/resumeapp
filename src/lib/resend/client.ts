import { Resend } from "resend";

let resendInstance: Resend | null = null;

export function getResend(): Resend {
  if (!resendInstance) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("Missing RESEND_API_KEY environment variable");
    }
    resendInstance = new Resend(apiKey);
  }
  return resendInstance;
}

// Default from address — must match a verified domain in Resend
export const EMAIL_FROM =
  process.env.EMAIL_FROM_ADDRESS || "rezm.ai <noreply@rezm.ai>";

// Domain for platform emails (user@domain)
export const EMAIL_DOMAIN =
  process.env.EMAIL_DOMAIN || "resmail.ai";
