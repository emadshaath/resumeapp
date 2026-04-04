import { Card, CardContent } from "@/components/ui/card";
import { Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Messages" };

export default function MessagesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
        <p className="text-zinc-500 mt-1">View messages from your contact form and platform email.</p>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Mail className="h-12 w-12 text-zinc-300 dark:text-zinc-600 mb-4" />
          <h3 className="text-lg font-medium">Coming in Phase 4</h3>
          <p className="text-sm text-zinc-500 mt-1 max-w-md text-center">
            Platform email addresses with forwarding and in-app inbox,
            contact form submissions, and spam filtering.
          </p>
          <Badge variant="secondary" className="mt-4">Phase 4</Badge>
        </CardContent>
      </Card>
    </div>
  );
}
