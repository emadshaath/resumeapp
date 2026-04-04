import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "ResumeProfile - Your Professional Identity, Secured",
    template: "%s | ResumeProfile",
  },
  description:
    "Create a professional resume profile with a custom subdomain, secure communication channels, AI-powered review, and built-in visitor analytics.",
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
