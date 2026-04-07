"use client";

import { useState } from "react";
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Check, Copy, Link2 } from "lucide-react";

interface CreateReviewLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

const EXPIRY_OPTIONS = [
  { value: "24h", label: "24 hours" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
] as const;

export function CreateReviewLinkDialog({ open, onOpenChange, onCreated }: CreateReviewLinkDialogProps) {
  const [options, setOptions] = useState({
    name: true,
    email: true,
    phone: true,
    location: true,
    companies: false,
  });
  const [expiresIn, setExpiresIn] = useState<"24h" | "7d" | "30d">("7d");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [createdUrl, setCreatedUrl] = useState("");
  const [copied, setCopied] = useState(false);

  function toggleOption(key: keyof typeof options) {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleCreate() {
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/reviews/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pseudonymize_options: options,
          expires_in: expiresIn,
          password: password.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create link");
        return;
      }

      setCreatedUrl(data.url);
      onCreated();
    } catch {
      setError("Failed to create link. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(createdUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleClose() {
    onOpenChange(false);
    // Reset form after animation
    setTimeout(() => {
      setCreatedUrl("");
      setError("");
      setPassword("");
      setCopied(false);
    }, 200);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <div className="p-6 space-y-6">
        <DialogHeader>
          <DialogTitle>Create Review Link</DialogTitle>
          <DialogDescription>
            Generate a shareable link for others to review your pseudonymized resume and leave feedback.
          </DialogDescription>
        </DialogHeader>

        {createdUrl ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 space-y-3">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                <Check className="h-5 w-5" />
                <span className="font-medium">Review link created!</span>
              </div>
              <div className="flex gap-2">
                <Input
                  value={createdUrl}
                  readOnly
                  className="text-sm"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <Button variant="outline" size="sm" onClick={handleCopy} className="shrink-0">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              {password && (
                <p className="text-xs text-green-600 dark:text-green-400">
                  Password: <code className="bg-green-100 dark:bg-green-900/40 px-1 py-0.5 rounded">{password}</code>
                </p>
              )}
            </div>
            <Button onClick={handleClose} className="w-full">Done</Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Pseudonymize Options */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Pseudonymize Options</Label>
              <p className="text-xs text-zinc-500">Choose which information to hide from reviewers.</p>
              <div className="space-y-3">
                {([
                  { key: "name" as const, label: "Name", desc: "Replace with a realistic pseudonym" },
                  { key: "email" as const, label: "Email", desc: "Hide email address" },
                  { key: "phone" as const, label: "Phone", desc: "Hide phone number" },
                  { key: "location" as const, label: "Location", desc: "Hide all location info" },
                  { key: "companies" as const, label: "Companies & Institutions", desc: "Replace with realistic placeholders" },
                ]).map(({ key, label, desc }) => (
                  <div key={key} className="flex items-center justify-between rounded-md border border-zinc-200 dark:border-zinc-800 px-3 py-2.5">
                    <div>
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-xs text-zinc-500">{desc}</p>
                    </div>
                    <Switch
                      checked={options[key]}
                      onCheckedChange={() => toggleOption(key)}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Expiration */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Link Expiration</Label>
              <div className="flex gap-2">
                {EXPIRY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setExpiresIn(opt.value)}
                    className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                      expiresIn === opt.value
                        ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                        : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-400"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="link-password" className="text-sm font-medium">Password (optional)</Label>
              <Input
                id="link-password"
                type="text"
                placeholder="Leave empty for no password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                maxLength={100}
              />
              <p className="text-xs text-zinc-500">
                If set, reviewers must enter this password to view the resume.
              </p>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button onClick={handleCreate} disabled={submitting} className="w-full">
              <Link2 className="h-4 w-4 mr-2" />
              {submitting ? "Creating..." : "Create Review Link"}
            </Button>
          </div>
        )}
      </div>
    </Dialog>
  );
}
