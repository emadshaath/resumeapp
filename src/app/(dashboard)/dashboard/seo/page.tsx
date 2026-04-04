import { Card, CardContent } from "@/components/ui/card";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "SEO Settings" };

export default function SeoPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">SEO Settings</h1>
        <p className="text-zinc-500 mt-1">Optimize your profile for search engines.</p>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Search className="h-12 w-12 text-zinc-300 dark:text-zinc-600 mb-4" />
          <h3 className="text-lg font-medium">Coming in Phase 2</h3>
          <p className="text-sm text-zinc-500 mt-1 max-w-md text-center">
            Custom meta tags, Open Graph images, JSON-LD structured data,
            and automatic sitemap generation.
          </p>
          <Badge variant="secondary" className="mt-4">Phase 2</Badge>
        </CardContent>
      </Card>
    </div>
  );
}
