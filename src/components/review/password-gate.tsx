"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock } from "lucide-react";

interface PasswordGateProps {
  onSubmit: (password: string) => void;
  error?: string;
  loading?: boolean;
}

export function PasswordGate({ onSubmit, error, loading }: PasswordGateProps) {
  const [password, setPassword] = useState("");

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
          <Lock className="h-7 w-7 text-zinc-500" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Password Required</h1>
          <p className="mt-1 text-sm text-zinc-500">
            This resume review is password protected. Enter the password to continue.
          </p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (password.trim()) onSubmit(password);
          }}
          className="space-y-4"
        >
          <div className="text-left">
            <Label htmlFor="review-password">Password</Label>
            <Input
              id="review-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              autoFocus
            />
            {error && (
              <p className="mt-1 text-sm text-red-500">{error}</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={loading || !password.trim()}>
            {loading ? "Verifying..." : "Continue"}
          </Button>
        </form>
      </div>
    </div>
  );
}
