import Link from "next/link";
import { RezmaiLogo } from "@/components/rezmai-logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-12">
      <Link
        href="/"
        className="mb-8 flex items-center gap-2 text-2xl font-bold tracking-tight text-brand"
      >
        <RezmaiLogo size={30} />
        rezm.ai
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
