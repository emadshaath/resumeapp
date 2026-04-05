import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-full">
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="text-xl font-bold tracking-tight text-brand">
            ResumeProfile
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-zinc-600 dark:text-zinc-400">
            <a href="#features" className="hover:text-zinc-900 dark:hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-zinc-900 dark:hover:text-white transition-colors">Pricing</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-8">
        <div className="mx-auto max-w-6xl px-6 text-center text-sm text-zinc-500">
          &copy; {new Date().getFullYear()} ResumeProfile. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
