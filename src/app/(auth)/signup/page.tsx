"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Crown } from "lucide-react";
import { isValidSlug, slugify } from "@/lib/utils";
import { signupAction } from "../actions";

type PendingPlan = "pro" | "premium" | null;

function readPendingPlan(value: string | null): PendingPlan {
  if (value === "pro" || value === "premium") return value;
  return null;
}

export default function SignupPage() {
  const searchParams = useSearchParams();
  const pendingPlan: PendingPlan = readPendingPlan(searchParams.get("plan"));

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  function handleNameChange(first: string, last: string) {
    setFirstName(first);
    setLastName(last);
    if (!slug || slug === slugify(`${firstName} ${lastName}`)) {
      setSlug(slugify(`${first} ${last}`));
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!isValidSlug(slug)) {
      setError(
        "Profile URL must be 3-63 characters, lowercase letters, numbers, and hyphens only. Cannot use reserved words."
      );
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      setLoading(false);
      return;
    }

    const result = await signupAction({
      email,
      password,
      firstName,
      lastName,
      slug,
      plan: pendingPlan,
    });

    if (!result.success) {
      setError(result.error || "Signup failed. Please try again.");
      setLoading(false);
    } else {
      setSuccess(true);
    }
  }

  if (success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            We&apos;ve sent a confirmation link to <strong>{email}</strong>.
            Click the link to activate your account.
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-center">
          <Button variant="outline" onClick={() => router.push("/login")}>
            Back to login
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>
          {pendingPlan
            ? `You'll be sent to checkout after confirming your email.`
            : "Get your professional profile in minutes"}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSignup}>
        <CardContent className="space-y-4">
          {pendingPlan && (
            <div className="rounded-md bg-brand-muted p-3 text-sm text-brand flex items-center gap-2">
              {pendingPlan === "premium" ? (
                <Crown className="h-4 w-4 flex-shrink-0" />
              ) : (
                <Sparkles className="h-4 w-4 flex-shrink-0" />
              )}
              <span>
                Selected plan:{" "}
                <Badge variant="secondary" className="ml-1">
                  {pendingPlan === "premium" ? "Premium" : "Pro"}
                </Badge>
              </span>
            </div>
          )}
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="firstName">First name</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => handleNameChange(e.target.value, lastName)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last name</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => handleNameChange(firstName, e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Profile URL</Label>
            <div className="flex items-center gap-1.5">
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                placeholder="john-doe"
                required
              />
            </div>
            <p className="text-xs text-zinc-500">
              Your profile will be at{" "}
              <span className="font-mono font-medium">{slug || "your-name"}.rezm.ai</span>
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
            <p className="text-xs text-zinc-500">Must be at least 8 characters</p>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating account..." : "Create account"}
          </Button>
        </CardContent>
      </form>
      <CardFooter className="justify-center">
        <p className="text-sm text-zinc-500">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-zinc-900 hover:underline dark:text-white">
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
