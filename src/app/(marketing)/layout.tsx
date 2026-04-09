import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RezmaiLogo } from "@/components/rezmai-logo";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-full">
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight text-brand">
            <RezmaiLogo size={26} />
            rezm.ai
          </Link>
          <nav aria-label="Main navigation" className="hidden md:flex items-center gap-6 text-sm text-zinc-600 dark:text-zinc-400">
            <a href="#features" className="hover:text-zinc-900 dark:hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-zinc-900 dark:hover:text-white transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-zinc-900 dark:hover:text-white transition-colors">FAQ</a>
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
      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-12">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">Product</h3>
              <nav aria-label="Product links" className="space-y-2 text-sm text-zinc-500">
                <a href="#features" className="block hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">Features</a>
                <a href="#pricing" className="block hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">Pricing</a>
                <a href="#faq" className="block hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">FAQ</a>
              </nav>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">Platform</h3>
              <nav aria-label="Platform links" className="space-y-2 text-sm text-zinc-500">
                <Link href="/signup" className="block hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">Get Started</Link>
                <Link href="/login" className="block hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">Sign In</Link>
              </nav>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">Community</h3>
              <nav aria-label="Community links" className="space-y-2 text-sm text-zinc-500">
                <a href="#community" className="block hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">Job Seekers Program</a>
                <a href="mailto:community@rezm.ai" className="block hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">Contact Us</a>
              </nav>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">About</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">
                rezm.ai is a professional resume profile platform with secure communication, AI-powered review, and visitor analytics.
              </p>
            </div>
          </div>
          <div className="border-t border-zinc-200 dark:border-zinc-800 pt-6 text-center text-sm text-zinc-500">
            &copy; {new Date().getFullYear()} rezm.ai. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
