import { Heading, Link, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout, baseStyles } from "./layout";

interface PasswordResetEmailProps {
  firstName: string;
  resetUrl: string;
}

export function PasswordResetEmail({ firstName, resetUrl }: PasswordResetEmailProps) {
  return (
    <EmailLayout preview="Reset your password">
      <Heading style={baseStyles.heading}>
        Reset your password
      </Heading>
      <Text style={baseStyles.text}>
        Hi {firstName}, we received a request to reset your password.
        Click the button below to choose a new password.
      </Text>
      <Section style={{ marginBottom: "24px", marginTop: "24px", textAlign: "center" as const }}>
        <Link href={resetUrl} style={baseStyles.button}>
          Reset Password
        </Link>
      </Section>
      <Text style={baseStyles.text}>
        Or copy and paste this URL into your browser:
      </Text>
      <Text style={{ ...baseStyles.text, ...baseStyles.urlText }}>
        {resetUrl}
      </Text>
      <Text style={{ ...baseStyles.text, ...baseStyles.muted }}>
        This link expires in 1 hour. If you didn&apos;t request a password reset,
        you can safely ignore this email. Your password will remain unchanged.
      </Text>
    </EmailLayout>
  );
}

export default PasswordResetEmail;
