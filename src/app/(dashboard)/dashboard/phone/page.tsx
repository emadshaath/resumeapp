import { Card, CardContent } from "@/components/ui/card";
import { Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Phone" };

export default function PhonePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Phone</h1>
        <p className="text-zinc-500 mt-1">Manage your platform phone number and voicemail.</p>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Phone className="h-12 w-12 text-zinc-300 dark:text-zinc-600 mb-4" />
          <h3 className="text-lg font-medium">Coming in Phase 5</h3>
          <p className="text-sm text-zinc-500 mt-1 max-w-md text-center">
            Dedicated phone numbers with call screening, forwarding,
            voicemail with transcription, and spam protection.
          </p>
          <Badge variant="secondary" className="mt-4">Phase 5</Badge>
        </CardContent>
      </Card>
    </div>
  );
}
