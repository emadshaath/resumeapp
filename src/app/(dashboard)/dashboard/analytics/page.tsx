import { Card, CardContent } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Analytics" };

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Visitor Analytics</h1>
        <p className="text-zinc-500 mt-1">Track who views your profile.</p>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <BarChart3 className="h-12 w-12 text-zinc-300 dark:text-zinc-600 mb-4" />
          <h3 className="text-lg font-medium">Coming in Phase 6</h3>
          <p className="text-sm text-zinc-500 mt-1 max-w-md text-center">
            Privacy-friendly visitor tracking with page views, referrers,
            geographic data, and device analytics.
          </p>
          <Badge variant="secondary" className="mt-4">Phase 6</Badge>
        </CardContent>
      </Card>
    </div>
  );
}
