import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "ResumeProfile - Your Professional Identity, Secured",
    template: "%s | ResumeProfile",
  },
  description:
    "Create a professional resume profile with a custom subdomain, secure communication channels, AI-powered review, and built-in visitor analytics.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
