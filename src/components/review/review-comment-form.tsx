"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquarePlus } from "lucide-react";

interface ReviewCommentFormProps {
  token: string;
  sectionId?: string;
  sectionType?: string;
  password?: string;
  onSubmitted: (comment: {
    id: string;
    section_id: string | null;
    section_type: string | null;
    reviewer_name: string | null;
    comment_text: string;
    created_at: string;
  }) => void;
}

export function ReviewCommentForm({
  token,
  sectionId,
  sectionType,
  password,
  onSubmitted,
}: ReviewCommentFormProps) {
  const [expanded, setExpanded] = useState(false);
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;

    setSubmitting(true);
    setError("");

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (password) headers["x-review-password"] = password;

      const res = await fetch(`/api/reviews/${token}/comments`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          section_id: sectionId,
          section_type: sectionType,
          reviewer_name: name.trim() || undefined,
          comment_text: text.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to submit comment");
        return;
      }

      onSubmitted(data.comment);
      setText("");
      setExpanded(false);
    } catch {
      setError("Failed to submit comment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
      >
        <MessageSquarePlus className="h-4 w-4" />
        Add feedback
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-3 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 bg-zinc-50 dark:bg-zinc-900">
      <Input
        placeholder="Your name (optional)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={100}
      />
      <Textarea
        placeholder="Leave your feedback..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={5000}
        rows={3}
        required
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={submitting || !text.trim()}>
          {submitting ? "Submitting..." : "Submit"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => { setExpanded(false); setError(""); }}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
