import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

// Brand colors from the default "Midnight Indigo" theme
const BRAND = {
  primary: "#4F46E5",    // Indigo brand
  primaryDark: "#312E81", // Dark indigo for gradients
  text: "#18181b",
  textMuted: "#52525b",
  textLight: "#71717a",
  textLighter: "#a1a1aa",
  bg: "#f4f4f5",
  white: "#ffffff",
  border: "#e4e4e7",
  codeBg: "#f4f4f5",
};

const baseStyles = {
  body: {
    backgroundColor: BRAND.bg,
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    margin: "0",
    padding: "0",
  },
  container: {
    backgroundColor: BRAND.white,
    borderRadius: "8px",
    margin: "40px auto",
    maxWidth: "480px",
    padding: "40px",
  },
  logo: {
    color: BRAND.primary,
    fontSize: "20px",
    fontWeight: "700" as const,
    letterSpacing: "-0.5px",
    marginBottom: "32px",
  },
  heading: {
    color: BRAND.text,
    fontSize: "24px",
    fontWeight: "600" as const,
    letterSpacing: "-0.5px",
    lineHeight: "1.3",
    margin: "0 0 16px",
  },
  text: {
    color: BRAND.textMuted,
    fontSize: "15px",
    lineHeight: "1.6",
    margin: "0 0 16px",
  },
  button: {
    backgroundColor: BRAND.primary,
    borderRadius: "6px",
    color: BRAND.white,
    display: "inline-block",
    fontSize: "15px",
    fontWeight: "500" as const,
    lineHeight: "1",
    padding: "12px 24px",
    textDecoration: "none",
  },
  hr: {
    borderColor: BRAND.border,
    margin: "24px 0",
  },
  footer: {
    color: BRAND.textLighter,
    fontSize: "12px",
    lineHeight: "1.5",
    marginTop: "32px",
  },
  link: {
    color: BRAND.primary,
    textDecoration: "underline",
  },
  code: {
    backgroundColor: BRAND.codeBg,
    borderRadius: "4px",
    color: BRAND.text,
    fontFamily: "monospace",
    fontSize: "32px",
    fontWeight: "700" as const,
    letterSpacing: "4px",
    padding: "8px 16px",
  },
  urlText: {
    fontSize: "13px",
    color: BRAND.textLight,
    wordBreak: "break-all" as const,
  },
  muted: {
    color: BRAND.textLighter,
    fontSize: "13px",
  },
};

export { baseStyles, BRAND };

export function EmailLayout({
  preview,
  children,
}: {
  preview: string;
  children: React.ReactNode;
}) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={baseStyles.body}>
        <Container style={baseStyles.container}>
          <Text style={baseStyles.logo}>rezm.ai</Text>
          {children}
          <Hr style={baseStyles.hr} />
          <Text style={baseStyles.footer}>
            &copy; {new Date().getFullYear()} rezm.ai. All rights reserved.
            <br />
            You&apos;re receiving this because you have an account on{" "}
            <Link href="https://rezm.ai" style={{ color: BRAND.textLighter, textDecoration: "underline" }}>
              rezm.ai
            </Link>
            .
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
