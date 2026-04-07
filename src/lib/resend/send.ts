import { getResend, EMAIL_FROM } from "./client";
import { ConfirmEmail } from "@/emails/confirm-email";
import { PasswordResetEmail } from "@/emails/password-reset";
import { MagicLinkEmail } from "@/emails/magic-link";
import { WelcomeEmail } from "@/emails/welcome";
import { ContactNotificationEmail } from "@/emails/contact-notification";
import { EmailChangedEmail } from "@/emails/email-changed";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://rezm.ai";

type SendResult = { data: { id: string } | null; error: { message: string; name: string } | null };

export async function sendConfirmEmail(params: {
  to: string;
  firstName: string;
  confirmUrl: string;
}): Promise<SendResult> {
  const resend = getResend();
  const result = await resend.emails.send({
    from: EMAIL_FROM,
    to: params.to,
    subject: "Confirm your email address",
    react: ConfirmEmail({
      firstName: params.firstName,
      confirmUrl: params.confirmUrl,
    }),
  });
  return result as SendResult;
}

export async function sendPasswordResetEmail(params: {
  to: string;
  firstName: string;
  resetUrl: string;
}): Promise<SendResult> {
  const resend = getResend();
  const result = await resend.emails.send({
    from: EMAIL_FROM,
    to: params.to,
    subject: "Reset your password",
    react: PasswordResetEmail({
      firstName: params.firstName,
      resetUrl: params.resetUrl,
    }),
  });
  return result as SendResult;
}

export async function sendMagicLinkEmail(params: {
  to: string;
  magicLinkUrl: string;
}): Promise<SendResult> {
  const resend = getResend();
  const result = await resend.emails.send({
    from: EMAIL_FROM,
    to: params.to,
    subject: "Your sign-in link",
    react: MagicLinkEmail({
      email: params.to,
      magicLinkUrl: params.magicLinkUrl,
    }),
  });
  return result as SendResult;
}

export async function sendWelcomeEmail(params: {
  to: string;
  firstName: string;
  slug: string;
}): Promise<SendResult> {
  const resend = getResend();
  const result = await resend.emails.send({
    from: EMAIL_FROM,
    to: params.to,
    subject: `Welcome to rezm.ai, ${params.firstName}!`,
    react: WelcomeEmail({
      firstName: params.firstName,
      slug: params.slug,
      dashboardUrl: `${APP_URL}/dashboard`,
      profileUrl: `${APP_URL}/p/${params.slug}`,
    }),
  });
  return result as SendResult;
}

export async function sendContactNotification(params: {
  to: string;
  profileFirstName: string;
  senderName: string;
  senderEmail: string;
  subject?: string;
  message: string;
}): Promise<SendResult> {
  const resend = getResend();
  const result = await resend.emails.send({
    from: EMAIL_FROM,
    to: params.to,
    subject: `New message from ${params.senderName}`,
    react: ContactNotificationEmail({
      profileFirstName: params.profileFirstName,
      senderName: params.senderName,
      senderEmail: params.senderEmail,
      subject: params.subject,
      message: params.message,
      dashboardUrl: `${APP_URL}/dashboard/messages`,
    }),
    replyTo: params.senderEmail,
  });
  return result as SendResult;
}

export async function sendEmailChangedEmail(params: {
  to: string;
  firstName: string;
  newEmail: string;
  confirmUrl: string;
}): Promise<SendResult> {
  const resend = getResend();
  const result = await resend.emails.send({
    from: EMAIL_FROM,
    to: params.to,
    subject: "Confirm your new email address",
    react: EmailChangedEmail({
      firstName: params.firstName,
      newEmail: params.newEmail,
      confirmUrl: params.confirmUrl,
    }),
  });
  return result as SendResult;
}

// Generic send for forwarding platform emails to personal inbox
export async function forwardEmail(params: {
  to: string;
  from: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}): Promise<SendResult> {
  const resend = getResend();
  const result = await resend.emails.send({
    from: EMAIL_FROM,
    to: params.to,
    subject: `[Forwarded] ${params.subject}`,
    html: params.html,
    text: params.text,
    replyTo: params.replyTo,
  });
  return result as SendResult;
}
