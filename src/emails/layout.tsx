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

const baseStyles = {
  body: {
    backgroundColor: "#f4f4f5",
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    margin: "0",
    padding: "0",
  },
  container: {
    backgroundColor: "#ffffff",
    borderRadius: "8px",
    margin: "40px auto",
    maxWidth: "480px",
    padding: "40px",
  },
  logo: {
    color: "#18181b",
    fontSize: "20px",
    fontWeight: "700" as const,
    letterSpacing: "-0.5px",
    marginBottom: "32px",
  },
  heading: {
    color: "#18181b",
    fontSize: "24px",
    fontWeight: "600" as const,
    letterSpacing: "-0.5px",
    lineHeight: "1.3",
    margin: "0 0 16px",
  },
  text: {
    color: "#52525b",
    fontSize: "15px",
    lineHeight: "1.6",
    margin: "0 0 16px",
  },
  button: {
    backgroundColor: "#18181b",
    borderRadius: "6px",
    color: "#ffffff",
    display: "inline-block",
    fontSize: "15px",
    fontWeight: "500" as const,
    lineHeight: "1",
    padding: "12px 24px",
    textDecoration: "none",
  },
  hr: {
    borderColor: "#e4e4e7",
    margin: "24px 0",
  },
  footer: {
    color: "#a1a1aa",
    fontSize: "12px",
    lineHeight: "1.5",
    marginTop: "32px",
  },
  link: {
    color: "#18181b",
    textDecoration: "underline",
  },
  code: {
    backgroundColor: "#f4f4f5",
    borderRadius: "4px",
    color: "#18181b",
    fontFamily: "monospace",
    fontSize: "32px",
    fontWeight: "700" as const,
    letterSpacing: "4px",
    padding: "8px 16px",
  },
};

export { baseStyles };

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
          <Text style={baseStyles.logo}>ResumeProfile</Text>
          {children}
          <Hr style={baseStyles.hr} />
          <Text style={baseStyles.footer}>
            &copy; {new Date().getFullYear()} ResumeProfile. All rights reserved.
            <br />
            You&apos;re receiving this because you have an account on ResumeProfile.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
