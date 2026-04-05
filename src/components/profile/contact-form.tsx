"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Send, CheckCircle, AlertCircle } from "lucide-react";

interface ContactFormProps {
  profileId: string;
  profileName: string;
}

export function ContactForm({ profileId, profileName }: ContactFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMessage("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile_id: profileId,
          sender_name: name,
          sender_email: email,
          subject: subject || undefined,
          message,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setErrorMessage(data.error || "Failed to send message");
        return;
      }

      setStatus("success");
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
    } catch {
      setStatus("error");
      setErrorMessage("Network error. Please try again.");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center dark:border-green-900 dark:bg-green-950">
        <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-3" />
        <h4 className="font-medium text-green-800 dark:text-green-200">Message sent!</h4>
        <p className="text-sm text-green-600 dark:text-green-400 mt-1">
          Your message has been delivered to {profileName}.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => setStatus("idle")}
        >
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {status === "error" && (
        <div className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="contact-name" className="text-xs">
            Your Name
          </Label>
          <Input
            id="contact-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Smith"
            required
            maxLength={100}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="contact-email" className="text-xs">
            Your Email
          </Label>
          <Input
            id="contact-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jane@example.com"
            required
            maxLength={255}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="contact-subject" className="text-xs">
          Subject <span className="text-zinc-400">(optional)</span>
        </Label>
        <Input
          id="contact-subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Job opportunity, collaboration, etc."
          maxLength={200}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="contact-message" className="text-xs">
          Message
        </Label>
        <Textarea
          id="contact-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Your message..."
          rows={4}
          required
          maxLength={5000}
        />
      </div>

      <Button type="submit" disabled={status === "sending"} className="w-full">
        {status === "sending" ? (
          "Sending..."
        ) : (
          <>
            <Send className="h-4 w-4 mr-1.5" />
            Send Message
          </>
        )}
      </Button>

      <p className="text-xs text-zinc-400 text-center">
        Messages are screened for spam. Your email will only be shared with {profileName}.
      </p>
    </form>
  );
}
