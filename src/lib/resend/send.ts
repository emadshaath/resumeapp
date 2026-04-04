import { getResend, EMAIL_FROM } from "./client";
import { ConfirmEmail } from "@/emails/confirm-email";
import { PasswordResetEmail } from "@/emails/password-reset";
import { MagicLinkEmail } from "@/emails/magic-link";
import { WelcomeEmail } from "@/emails/welcome";
import { ContactNotificationEmail } from "@/emails/contact-notification";
import { EmailChangedEmail } from "@/emails/email-changed";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://resumeprofile.com";

export async function sendConfirmEmail(params: {
  to: string;
  firstName: string;
  confirmUrl: string;
}) {
  const resend = getResend();
  return resend.emails.send({
    from: EMAIL_FROM,
    to: params.to,
    subject: "Confirm your email address",
    react: ConfirmEmail({
      firstName: params.firstName,
      confirmUrl: params.confirmUrl,
    }),
  });
}

export async function sendPasswordResetEmail(params: {
  to: string;
  firstName: string;
  resetUrl: string;
}) {
  const resend = getResend();
  return resend.emails.send({
    from: EMAIL_FROM,
    to: params.to,
    subject: "Reset your password",
    react: PasswordResetEmail({
      firstName: params.firstName,
      resetUrl: params.resetUrl,
    }),
  });
}

export async function sendMagicLinkEmail(params: {
  to: string;
  magicLinkUrl: string;
}) {
  const resend = getResend();
  return resend.emails.send({
    from: EMAIL_FROM,
    to: params.to,
    subject: "Your sign-in link",
    react: MagicLinkEmail({
      email: params.to,
      magicLinkUrl: params.magicLinkUrl,
    }),
  });
}

export async function sendWelcomeEmail(params: {
  to: string;
  firstName: string;
  slug: string;
}) {
  const resend = getResend();
  return resend.emails.send({
    from: EMAIL_FROM,
    to: params.to,
    subject: `Welcome to ResumeProfile, ${params.firstName}!`,
    react: WelcomeEmail({
      firstName: params.firstName,
      slug: params.slug,
      dashboardUrl: `${APP_URL}/dashboard`,
      profileUrl: `${APP_URL}/p/${params.slug}`,
    }),
  });
}

export async function sendContactNotification(params: {
  to: string;
  profileFirstName: string;
  senderName: string;
  senderEmail: string;
  subject?: string;
  message: string;
}) {
  const resend = getResend();
  return resend.emails.send({
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
}

export async function sendEmailChangedEmail(params: {
  to: string;
  firstName: string;
  newEmail: string;
  confirmUrl: string;
}) {
  const resend = getResend();
  return resend.emails.send({
    from: EMAIL_FROM,
    to: params.to,
    subject: "Confirm your new email address",
    react: EmailChangedEmail({
      firstName: params.firstName,
      newEmail: params.newEmail,
      confirmUrl: params.confirmUrl,
    }),
  });
}

// Generic send for forwarding platform emails to personal inbox
export async function forwardEmail(params: {
  to: string;
  from: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}) {
  const resend = getResend();
  return resend.emails.send({
    from: EMAIL_FROM,
    to: params.to,
    subject: `[Forwarded] ${params.subject}`,
    html: params.html,
    text: params.text,
    replyTo: params.replyTo,
  });
}
