import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-12">
      <Link
        href="/"
        className="mb-8 text-2xl font-bold tracking-tight text-brand"
      >
        ResumeProfile
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
