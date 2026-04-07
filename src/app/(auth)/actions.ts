"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendConfirmEmail,
  sendPasswordResetEmail,
  sendMagicLinkEmail,
  sendEmailChangedEmail,
} from "@/lib/resend/send";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://rezm.ai";

function buildCallbackUrl(tokenHash: string, type: string, redirectTo?: string): string {
  const url = new URL("/callback", BASE_URL);
  url.searchParams.set("token_hash", tokenHash);
  url.searchParams.set("type", type);
  if (redirectTo) {
    url.searchParams.set("redirect_to", redirectTo);
  }
  return url.toString();
}

export async function signupAction(formData: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  slug: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = createAdminClient();

    // Check slug availability
    const { data: existing } = await admin
      .from("profiles")
      .select("id")
      .eq("slug", formData.slug)
      .single();

    if (existing) {
      return { success: false, error: "This profile URL is already taken. Please choose another." };
    }

    // Use admin.generateLink to create user + get token without Supabase sending email
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "signup",
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          first_name: formData.firstName,
          last_name: formData.lastName,
          slug: formData.slug,
        },
        redirectTo: `${BASE_URL}/dashboard`,
      },
    });

    if (linkError) {
      console.error("generateLink signup error:", linkError.message);
      return { success: false, error: linkError.message };
    }

    const tokenHash = linkData.properties?.hashed_token;
    if (!tokenHash) {
      console.error("generateLink returned no hashed_token", linkData);
      return { success: false, error: "Failed to generate confirmation token." };
    }

    const confirmUrl = buildCallbackUrl(tokenHash, "signup", `${BASE_URL}/dashboard`);

    // Send our own themed email via Resend
    const emailResult = await sendConfirmEmail({
      to: formData.email,
      firstName: formData.firstName,
      confirmUrl,
    });

    if (emailResult.error) {
      console.error("Resend sendConfirmEmail error:", emailResult.error);
      return { success: false, error: "Failed to send confirmation email. Please try again." };
    }

    return { success: true };
  } catch (err) {
    console.error("Signup action error:", err);
    return { success: false, error: "An unexpected error occurred. Please try again." };
  }
}

export async function forgotPasswordAction(formData: {
  email: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = createAdminClient();

    // Generate recovery link without Supabase sending an email
    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email: formData.email,
      options: {
        redirectTo: `${BASE_URL}/dashboard/settings`,
      },
    });

    if (error) {
      // Don't reveal whether the email exists - log for debugging
      console.error("generateLink recovery error:", error.message);
      return { success: true };
    }

    const tokenHash = data.properties?.hashed_token;
    if (!tokenHash) {
      console.error("generateLink recovery returned no hashed_token");
      return { success: true };
    }

    const resetUrl = buildCallbackUrl(tokenHash, "recovery", `${BASE_URL}/dashboard/settings`);

    const firstName =
      data.user?.user_metadata?.first_name ||
      data.user?.email?.split("@")[0] ||
      "there";

    const emailResult = await sendPasswordResetEmail({
      to: formData.email,
      firstName,
      resetUrl,
    });

    if (emailResult.error) {
      console.error("Resend sendPasswordResetEmail error:", emailResult.error);
    }

    return { success: true };
  } catch (err) {
    console.error("Forgot password action error:", err);
    // Don't reveal errors to prevent email enumeration
    return { success: true };
  }
}

export async function magicLinkAction(formData: {
  email: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = createAdminClient();

    const { data, error } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: formData.email,
      options: {
        redirectTo: `${BASE_URL}/dashboard`,
      },
    });

    if (error) {
      console.error("generateLink magiclink error:", error.message);
      return { success: true };
    }

    const tokenHash = data.properties?.hashed_token;
    if (!tokenHash) {
      return { success: true };
    }

    const magicLinkUrl = buildCallbackUrl(tokenHash, "magiclink", `${BASE_URL}/dashboard`);

    const emailResult = await sendMagicLinkEmail({
      to: formData.email,
      magicLinkUrl,
    });

    if (emailResult.error) {
      console.error("Resend sendMagicLinkEmail error:", emailResult.error);
    }

    return { success: true };
  } catch (err) {
    console.error("Magic link action error:", err);
    return { success: true };
  }
}

export async function emailChangeAction(formData: {
  userId: string;
  newEmail: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = createAdminClient();

    // Get current user's email for the generateLink call
    const { data: userData, error: userError } = await admin.auth.admin.getUserById(formData.userId);
    if (userError || !userData.user) {
      return { success: false, error: "User not found." };
    }

    const { data, error } = await admin.auth.admin.generateLink({
      type: "email_change_new",
      email: userData.user.email!,
      newEmail: formData.newEmail,
      options: {
        redirectTo: `${BASE_URL}/dashboard/settings`,
      },
    });

    if (error) {
      console.error("generateLink email_change error:", error.message);
      return { success: false, error: error.message };
    }

    const tokenHash = data.properties?.hashed_token;
    if (!tokenHash) {
      return { success: false, error: "Failed to generate confirmation token." };
    }

    const confirmUrl = buildCallbackUrl(tokenHash, "email_change", `${BASE_URL}/dashboard/settings`);

    const firstName =
      data.user?.user_metadata?.first_name ||
      data.user?.email?.split("@")[0] ||
      "there";

    const emailResult = await sendEmailChangedEmail({
      to: formData.newEmail,
      firstName,
      newEmail: formData.newEmail,
      confirmUrl,
    });

    if (emailResult.error) {
      console.error("Resend sendEmailChangedEmail error:", emailResult.error);
      return { success: false, error: "Failed to send confirmation email. Please try again." };
    }

    return { success: true };
  } catch (err) {
    console.error("Email change action error:", err);
    return { success: false, error: "An unexpected error occurred. Please try again." };
  }
}
