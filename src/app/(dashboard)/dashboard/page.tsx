import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Layers, Sparkles, BarChart3, ExternalLink } from "lucide-react";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { count: sectionCount } = await supabase
    .from("resume_sections")
    .select("*", { count: "exact", head: true })
    .eq("profile_id", user.id);

  if (profile && !profile.onboarding_completed) {
    redirect("/dashboard/onboarding");
  }

  if (!profile) {
    // Auto-create profile if it doesn't exist (trigger may have failed)
    const firstName = user.user_metadata?.first_name || user.email?.split("@")[0] || "User";
    const lastName = user.user_metadata?.last_name || "";
    const slug = user.user_metadata?.slug || firstName.toLowerCase().replace(/[^a-z0-9-]/g, "-");

    const { error: insertError } = await supabase.from("profiles").insert({
      id: user.id,
      slug,
      first_name: firstName,
      last_name: lastName,
      email: user.email!,
    });

    if (insertError) {
      return (
        <div className="flex flex-col items-center justify-center py-20">
          <h2 className="text-xl font-semibold">Setting up your profile...</h2>
          <p className="mt-2 text-zinc-500">There was an issue creating your profile. Please try refreshing.</p>
        </div>
      );
    }

    // Redirect to reload with the new profile
    redirect("/dashboard");
  }

  const profileUrl = `${process.env.NEXT_PUBLIC_APP_URL}/p/${profile.slug}`;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back, {profile.first_name}
          </h1>
          <p className="text-zinc-500 mt-1">
            Manage your professional profile and resume sections.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={profile.is_published ? "success" : "secondary"}>
            {profile.is_published ? "Published" : "Draft"}
          </Badge>
          {profile.is_published && (
            <Link href={profileUrl} target="_blank">
              <Button variant="outline" size="sm">
                <ExternalLink className="h-4 w-4 mr-1" />
                View profile
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/dashboard/profile">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Profile</CardTitle>
              <User className="h-4 w-4 text-brand" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {profile.headline ? "Complete" : "Incomplete"}
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                {profile.headline || "Add your headline"}
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/sections">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sections</CardTitle>
              <Layers className="h-4 w-4 text-brand" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sectionCount || 0}</div>
              <p className="text-xs text-zinc-500 mt-1">Resume sections added</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/sections?open=review">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">AI Review</CardTitle>
              <Sparkles className="h-4 w-4 text-brand" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Ready</div>
              <p className="text-xs text-zinc-500 mt-1">Get AI recommendations</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/analytics">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Visitors</CardTitle>
              <BarChart3 className="h-4 w-4 text-brand" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--</div>
              <p className="text-xs text-zinc-500 mt-1">
                {profile.is_published ? "View analytics" : "Publish to start tracking"}
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Start</CardTitle>
          <CardDescription>Complete these steps to launch your profile</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { done: !!profile.headline, label: "Add a professional headline", href: "/dashboard/profile" },
              { done: (sectionCount || 0) > 0, label: "Add at least one resume section", href: "/dashboard/sections" },
              { done: profile.is_published, label: "Publish your profile", href: "/dashboard/profile" },
            ].map((step) => (
              <Link
                key={step.label}
                href={step.href}
                className="flex items-center gap-3 rounded-md border border-zinc-200 px-4 py-3 text-sm hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 transition-colors"
              >
                <div
                  className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                    step.done
                      ? "border-green-500 bg-green-500"
                      : "border-zinc-300 dark:border-zinc-600"
                  }`}
                >
                  {step.done && (
                    <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className={step.done ? "text-zinc-400 line-through" : ""}>{step.label}</span>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
