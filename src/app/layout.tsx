import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://rezm.ai";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "rezm.ai - Your Professional Identity, Secured",
    template: "%s | rezm.ai",
  },
  description:
    "Create a professional resume profile with a custom subdomain, secure communication channels, AI-powered review, and built-in visitor analytics.",
  keywords: [
    "resume builder",
    "professional profile",
    "online resume",
    "AI resume review",
    "resume website",
    "professional identity",
    "resume portfolio",
    "career profile",
    "rezm.ai",
    "resume subdomain",
    "secure resume",
    "resume analytics",
  ],
  applicationName: "rezm.ai",
  category: "business",
  creator: "rezm.ai",
  publisher: "rezm.ai",
  openGraph: {
    siteName: "rezm.ai",
    type: "website",
    locale: "en_US",
    title: "rezm.ai - Your Professional Identity, Secured",
    description:
      "Create a professional resume profile with a custom subdomain, secure communication channels, AI-powered review, and built-in visitor analytics.",
    url: APP_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "rezm.ai - Your Professional Identity, Secured",
    description:
      "Create a professional resume profile with a custom subdomain, secure email, AI-powered review, and visitor analytics.",
  },
  manifest: "/manifest.webmanifest",
  alternates: {
    canonical: APP_URL,
  },
  other: {
    "google-site-verification": process.env.GOOGLE_SITE_VERIFICATION || "",
    "msvalidate.01": process.env.BING_SITE_VERIFICATION || "",
  },
};

// Inline script to set data-theme before first paint (prevents flash)
const themeInitScript = `
(function(){
  try {
    var t = localStorage.getItem('rp-theme');
    if (t) document.documentElement.setAttribute('data-theme', t);
  } catch(e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
