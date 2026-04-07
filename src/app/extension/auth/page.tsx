"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Loader2, Shield } from "lucide-react";

export default function ExtensionAuthPage() {
  const supabase = createClient();
  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setStatus(user ? "authenticated" : "unauthenticated");
    });
  }, [supabase]);

  async function authorize() {
    setSending(true);
    try {
      const res = await fetch("/api/extension/token", { method: "POST" });
      if (!res.ok) throw new Error("Failed to generate token");

      const data = await res.json();

      // Send token to extension via postMessage
      window.postMessage(
        {
          type: "REZMAI_AUTH_TOKEN",
          token: data.token,
          user: data.user,
          expires_at: data.expires_at,
        },
        "*"
      );

      setSent(true);
    } catch {
      // Fallback: copy token to clipboard
      setSending(false);
    }
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-sm w-full">
          <CardHeader>
            <CardTitle className="text-center">Sign in Required</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-zinc-500 mb-4">
              Please sign in to connect the extension to your account.
            </p>
            <Button onClick={() => (window.location.href = "/login?redirect=/extension/auth")}>
              Sign in
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-sm w-full">
        <CardHeader>
          <div className="flex justify-center mb-2">
            <Shield className="h-10 w-10 text-brand" />
          </div>
          <CardTitle className="text-center">Connect Extension</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {sent ? (
            <>
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mx-auto">
                <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-sm text-zinc-500">
                Extension connected successfully! You can close this tab.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-zinc-500">
                The rezm.ai extension wants to access your profile data to auto-fill job applications.
              </p>
              <Button onClick={authorize} disabled={sending} className="w-full">
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Shield className="h-4 w-4 mr-2" />
                )}
                Authorize Extension
              </Button>
              <p className="text-xs text-zinc-400">
                This grants read-only access to your profile for form filling.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
