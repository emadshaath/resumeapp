import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "AI Review" };

export default function AIReviewPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI Resume Review</h1>
        <p className="text-zinc-500 mt-1">Get AI-powered recommendations to improve your resume.</p>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Sparkles className="h-12 w-12 text-zinc-300 dark:text-zinc-600 mb-4" />
          <h3 className="text-lg font-medium">Coming in Phase 3</h3>
          <p className="text-sm text-zinc-500 mt-1 max-w-md text-center">
            AI-powered resume analysis with section-by-section recommendations,
            ATS compatibility scoring, and writing improvement suggestions.
          </p>
          <Badge variant="secondary" className="mt-4">Phase 3</Badge>
        </CardContent>
      </Card>
    </div>
  );
}
