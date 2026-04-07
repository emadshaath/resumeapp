"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  Briefcase,
  AlertCircle,
} from "lucide-react";

function ShareTargetContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"processing" | "done" | "error">("processing");
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobTitle, setJobTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    processSharedUrl();
  }, []);

  async function processSharedUrl() {
    // Extract URL from share target params
    const sharedUrl = searchParams.get("url");
    const sharedTitle = searchParams.get("title") || "";
    const sharedText = searchParams.get("text") || "";

    // Try to find a URL in the text if no direct URL
    const url = sharedUrl || extractUrl(sharedText) || extractUrl(sharedTitle);

    if (!url) {
      setStatus("error");
      setError("No job URL found. Please paste the URL manually.");
      return;
    }

    try {
      // Step 1: Parse the job URL with AI
      let parsedData: Record<string, unknown> = {};
      try {
        const parseRes = await fetch("/api/jobs/parse-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        if (parseRes.ok) {
          const { parsed } = await parseRes.json();
          parsedData = parsed;
        }
      } catch {
        // Parse failed, continue with basic data
      }

      // Step 2: Create job application
      const title = (parsedData.job_title as string) || sharedTitle || "Unknown Role";
      const company =
        (parsedData.company_name as string) ||
        new URL(url).hostname.replace("www.", "").split(".")[0];

      setJobTitle(title);
      setCompanyName(company);

      const createRes = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: company,
          job_title: title,
          job_url: url,
          location: parsedData.location || null,
          remote_type: parsedData.remote_type || null,
          salary_min: parsedData.salary_min || null,
          salary_max: parsedData.salary_max || null,
          status: "saved",
          source: "share_target",
          notes: parsedData.description_summary || null,
          parsed_data: parsedData,
        }),
      });

      if (!createRes.ok) {
        const data = await createRes.json();
        throw new Error(data.error || "Failed to save job");
      }

      const { job } = await createRes.json();
      setJobId(job.id);

      // Step 3: Auto-trigger AI tailor (best-effort, don't block)
      fetch("/api/variants/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_application_id: job.id }),
      }).catch(() => {});

      setStatus("done");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  function extractUrl(text: string): string | null {
    const match = text.match(/https?:\/\/[^\s<>"{}|\\^`\[\]]+/);
    return match ? match[0] : null;
  }

  if (status === "processing") {
    return (
      <div className="max-w-sm mx-auto mt-20 text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-brand mx-auto" />
        <h2 className="text-lg font-semibold">Processing Job...</h2>
        <p className="text-sm text-zinc-500">
          AI is analyzing the job posting and preparing your tailored profile
        </p>
        <div className="flex flex-col gap-2 text-xs text-zinc-400">
          <span>Parsing job details...</span>
          <span>Creating application record...</span>
          <span>Generating tailored variant...</span>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="max-w-sm mx-auto mt-20">
        <Card>
          <CardContent className="p-6 text-center space-y-3">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
            <h2 className="text-lg font-semibold">Couldn't Process Job</h2>
            <p className="text-sm text-zinc-500">{error}</p>
            <div className="flex flex-col gap-2 pt-2">
              <Button onClick={() => router.push("/dashboard/jobs")}>
                <Briefcase className="h-4 w-4 mr-1" />
                Go to Job Tracker
              </Button>
              <Button variant="outline" onClick={() => router.back()}>
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto mt-12 space-y-4">
      <Card>
        <CardContent className="p-6 text-center space-y-4">
          <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto" />
          <div>
            <h2 className="text-lg font-semibold">Job Saved!</h2>
            <p className="text-sm text-zinc-500 mt-1">
              {jobTitle} at {companyName}
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-zinc-400">
            <Sparkles className="h-3.5 w-3.5" />
            AI is tailoring your resume in the background
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2">
        {jobId && (
          <Button
            className="w-full"
            onClick={() => router.push(`/dashboard/jobs/${jobId}/apply`)}
          >
            <ExternalLink className="h-4 w-4 mr-1" />
            Open Quick Apply
          </Button>
        )}
        <Button
          variant="outline"
          className="w-full"
          onClick={() => router.push("/dashboard/jobs")}
        >
          <Briefcase className="h-4 w-4 mr-1" />
          View All Jobs
        </Button>
      </div>
    </div>
  );
}

export default function ShareTargetPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-brand" />
        </div>
      }
    >
      <ShareTargetContent />
    </Suspense>
  );
}
